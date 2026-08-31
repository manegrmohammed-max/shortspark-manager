"""
محرك أتمتة مشاهدات وتفاعلات YouTube Shorts
==========================================
يعمل 24/7 داخل حاوية Docker باستخدام Playwright (Chromium Headless)
ويتصل بقاعدة بيانات Lovable Cloud (Supabase) لقراءة الروابط والإعدادات
وتحديث عدادات المشاهدات والتفاعلات وكتابة السجلات الحية.

المتغيرات البيئية المطلوبة:
    SUPABASE_URL           عنوان مشروع قاعدة البيانات
    SUPABASE_KEY           مفتاح الوصول (service_role أو publishable)
    POLL_INTERVAL_SEC      (اختياري) فترة فحص المهام، الافتراضي 10 ثوانٍ
    HEADLESS               (اختياري) true/false، الافتراضي true
"""

from __future__ import annotations

import os
import random
import sys
import time
import traceback
from datetime import datetime, timedelta, timezone

from dotenv import load_dotenv
from supabase import Client, create_client
from playwright.sync_api import Page, sync_playwright, TimeoutError as PWTimeout

load_dotenv()

SUPABASE_URL = os.environ.get("SUPABASE_URL", "").strip()
SUPABASE_KEY = os.environ.get("SUPABASE_KEY", "").strip()
POLL_INTERVAL_SEC = int(os.environ.get("POLL_INTERVAL_SEC", "10"))
HEADLESS = os.environ.get("HEADLESS", "true").lower() != "false"

if not SUPABASE_URL or not SUPABASE_KEY:
    print("[FATAL] يجب ضبط SUPABASE_URL و SUPABASE_KEY", file=sys.stderr)
    sys.exit(1)

db: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

# بصمات أجهزة كاملة (محمول + سطح مكتب) لتدوير الهوية في كل دورة
DEVICE_PROFILES = [
    {
        "user_agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 17_3 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.3 Mobile/15E148 Safari/604.1",
        "viewport": {"width": 390, "height": 844},
        "device_scale_factor": 3,
        "is_mobile": True,
        "has_touch": True,
    },
    {
        "user_agent": "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Mobile Safari/537.36",
        "viewport": {"width": 412, "height": 915},
        "device_scale_factor": 2.625,
        "is_mobile": True,
        "has_touch": True,
    },
    {
        "user_agent": "Mozilla/5.0 (Linux; Android 13; SM-S918B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Mobile Safari/537.36",
        "viewport": {"width": 360, "height": 800},
        "device_scale_factor": 3,
        "is_mobile": True,
        "has_touch": True,
    },
    {
        "user_agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
        "viewport": {"width": 1366, "height": 768},
        "device_scale_factor": 1,
        "is_mobile": False,
        "has_touch": False,
    },
    {
        "user_agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36",
        "viewport": {"width": 1440, "height": 900},
        "device_scale_factor": 2,
        "is_mobile": False,
        "has_touch": False,
    },
]

LOCALES = ["ar-SA", "ar-EG", "en-US", "en-GB"]

STEALTH_JS = """
Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
Object.defineProperty(navigator, 'plugins', { get: () => [1, 2, 3, 4, 5] });
Object.defineProperty(navigator, 'languages', { get: () => ['ar-SA', 'ar', 'en-US', 'en'] });
Object.defineProperty(navigator, 'hardwareConcurrency', { get: () => 8 });
Object.defineProperty(navigator, 'deviceMemory', { get: () => 8 });
window.chrome = { runtime: {}, loadTimes: function () {}, csi: function () {} };
const originalQuery = window.navigator.permissions.query;
window.navigator.permissions.query = (parameters) =>
  parameters.name === 'notifications'
    ? Promise.resolve({ state: Notification.permission })
    : originalQuery(parameters);
const getParameter = WebGLRenderingContext.prototype.getParameter;
WebGLRenderingContext.prototype.getParameter = function (parameter) {
  if (parameter === 37445) return 'Intel Inc.';
  if (parameter === 37446) return 'Intel Iris OpenGL Engine';
  return getParameter.apply(this, [parameter]);
};
Object.defineProperty(document, 'hidden', { get: () => false });
Object.defineProperty(document, 'visibilityState', { get: () => 'visible' });
"""


# ---------------------------------------------------------------- أدوات عامة
def now_utc() -> datetime:
    return datetime.now(timezone.utc)


def log(message: str, log_type: str = "info", url_id: str | None = None) -> None:
    """يكتب السجل في قاعدة البيانات ليظهر مباشرة في اللوحة عبر Realtime."""
    stamp = now_utc().strftime("%Y-%m-%d %H:%M:%S")
    print(f"[{stamp}] [{log_type.upper()}] {message}", flush=True)
    try:
        db.table("logs").insert(
            {"message": message, "log_type": log_type, "url_id": url_id}
        ).execute()
    except Exception as exc:  # لا نوقف المحرك بسبب فشل تسجيل
        print(f"[WARN] تعذر كتابة السجل: {exc}", flush=True)


def get_settings() -> dict:
    res = db.table("settings").select("*").order("updated_at", desc=True).limit(1).execute()
    return (res.data or [{}])[0]


def send_heartbeat(settings_id: str | None) -> None:
    if not settings_id:
        return
    try:
        db.table("settings").update({"heartbeat_at": now_utc().isoformat()}).eq(
            "id", settings_id
        ).execute()
    except Exception as exc:
        print(f"[WARN] تعذر إرسال نبضة الحياة: {exc}", flush=True)


def due_urls() -> list[dict]:
    res = (
        db.table("urls")
        .select("*")
        .eq("is_active", True)
        .lte("next_run_at", now_utc().isoformat())
        .order("next_run_at")
        .execute()
    )
    return res.data or []


def random_comment() -> str | None:
    res = db.table("comments").select("comment_text").eq("is_active", True).execute()
    rows = res.data or []
    if not rows:
        return None
    return random.choice(rows)["comment_text"]


def set_status(url_id: str, status: str) -> None:
    db.table("urls").update({"status": status}).eq("id", url_id).execute()


# ------------------------------------------------------------------ البروكسي
_PROXY_CACHE: dict[str, tuple[bool, float]] = {}
PROXY_CHECK_TTL = 600  # ثانية


def parse_proxies(raw: str | None) -> list[str]:
    """يقبل بروكسي واحداً أو قائمة مفصولة بفواصل/أسطر ويصحح الصيغة."""
    if not raw:
        return []
    out: list[str] = []
    for part in raw.replace(",", "\n").replace(";", "\n").split("\n"):
        p = part.strip()
        if not p:
            continue
        if "://" not in p:
            p = "http://" + p  # المستخدم أدخل host:port فقط
        out.append(p)
    return out


def proxy_works(playwright, proxy: str) -> bool:
    """اختبار حقيقي للبروكسي بفتح صفحة خفيفة عبره (مع ذاكرة مؤقتة)."""
    cached = _PROXY_CACHE.get(proxy)
    if cached and (time.time() - cached[1]) < PROXY_CHECK_TTL:
        return cached[0]
    ok = False
    browser = None
    try:
        browser = playwright.chromium.launch(
            headless=True,
            args=["--no-sandbox", "--disable-dev-shm-usage"],
            proxy={"server": proxy},
        )
        page = browser.new_page()
        page.goto("https://www.youtube.com/robots.txt", timeout=25000)
        ok = True
    except Exception as exc:
        print(f"[WARN] فشل اختبار البروكسي: {exc}", flush=True)
    finally:
        try:
            if browser:
                browser.close()
        except Exception:
            pass
    _PROXY_CACHE[proxy] = (ok, time.time())
    return ok


def pick_proxy(playwright, proxies: list[str]) -> str | None:
    """يختار أول بروكسي يعمل فعلاً، ويرجع None للاتصال المباشر."""
    if not proxies:
        return None
    shuffled = random.sample(proxies, len(proxies))
    for proxy in shuffled:
        if proxy_works(playwright, proxy):
            return proxy
    log("جميع البروكسيات المُدخلة لا تستجيب — التبديل إلى الاتصال المباشر", "warning")
    return None



# ------------------------------------------------------- محاكاة سلوك بشري
def human_mouse(page: Page, moves: int = 6) -> None:
    width = page.viewport_size["width"] if page.viewport_size else 1280
    height = page.viewport_size["height"] if page.viewport_size else 720
    x, y = width / 2, height / 2
    for _ in range(moves):
        x = max(5, min(width - 5, x + random.randint(-220, 220)))
        y = max(5, min(height - 5, y + random.randint(-160, 160)))
        page.mouse.move(x, y, steps=random.randint(8, 25))
        page.wait_for_timeout(random.randint(120, 600))


def human_watch(page: Page, seconds: int, url_id: str) -> None:
    """يبقي الفيديو مشغلاً للمدة المطلوبة مع تفاعلات بشرية متقطعة."""
    end = time.time() + seconds
    tick = 0
    while time.time() < end:
        remaining = int(end - time.time())
        tick += 1
        try:
            if tick % 3 == 0:
                human_mouse(page, moves=2)
            if tick % 5 == 0:
                page.mouse.wheel(0, random.randint(-40, 40))
            # التأكد من استمرار التشغيل وعدم الإيقاف التلقائي
            page.evaluate(
                """() => {
                    const v = document.querySelector('video');
                    if (v) {
                        v.muted = true;
                        if (v.paused) { v.play().catch(() => {}); }
                    }
                }"""
            )
        except Exception:
            pass
        if tick % 10 == 0:
            log(f"استمرار المشاهدة… تبقى {remaining} ثانية", "info", url_id)
        page.wait_for_timeout(1000)


def dismiss_consent(page: Page) -> None:
    """إغلاق نوافذ الموافقة على ملفات تعريف الارتباط إن ظهرت."""
    selectors = [
        'button[aria-label*="Accept"]',
        'button[aria-label*="قبول"]',
        'button:has-text("Accept all")',
        'button:has-text("قبول الكل")',
        'button:has-text("I agree")',
    ]
    for sel in selectors:
        try:
            btn = page.locator(sel).first
            if btn.is_visible(timeout=1200):
                btn.click(timeout=2000)
                page.wait_for_timeout(800)
                return
        except Exception:
            continue


def click_like(page: Page, url_id: str) -> bool:
    """الضغط الحقيقي على زر الإعجاب في واجهة Shorts."""
    selectors = [
        '#like-button button',
        'ytd-reel-video-renderer[is-active] #like-button button',
        'button[aria-label*="Like"]',
        'button[aria-label*="أعجبني"]',
        'yt-button-shape button[title*="Like"]',
    ]
    for sel in selectors:
        try:
            btn = page.locator(sel).first
            if btn.count() == 0:
                continue
            btn.scroll_into_view_if_needed(timeout=2500)
            page.wait_for_timeout(random.randint(400, 1200))
            btn.click(timeout=3000)
            page.wait_for_timeout(random.randint(800, 1600))
            log("تم الضغط على زر الإعجاب بنجاح ❤️", "success", url_id)
            return True
        except Exception:
            continue
    log("تعذر العثور على زر الإعجاب (قد يتطلب تسجيل دخول)", "warning", url_id)
    return False


def post_comment(page: Page, text: str, url_id: str) -> bool:
    """فتح لوحة التعليقات ونشر تعليق عشوائي."""
    open_selectors = [
        '#comments-button button',
        'button[aria-label*="Comment"]',
        'button[aria-label*="تعليق"]',
    ]
    for sel in open_selectors:
        try:
            btn = page.locator(sel).first
            if btn.count() == 0:
                continue
            btn.click(timeout=3000)
            page.wait_for_timeout(random.randint(1500, 2500))
            break
        except Exception:
            continue

    box_selectors = [
        '#placeholder-area',
        'ytd-comment-simplebox-renderer #placeholder-area',
        'div#contenteditable-root',
    ]
    for sel in box_selectors:
        try:
            box = page.locator(sel).first
            if box.count() == 0:
                continue
            box.click(timeout=3000)
            page.wait_for_timeout(random.randint(500, 1200))
            editor = page.locator('div#contenteditable-root').first
            editor.click(timeout=3000)
            for ch in text:
                page.keyboard.type(ch, delay=random.randint(35, 130))
            page.wait_for_timeout(random.randint(600, 1400))
            submit = page.locator('#submit-button button, button[aria-label*="Comment"]').last
            submit.click(timeout=3000)
            page.wait_for_timeout(random.randint(1200, 2200))
            log(f"تم نشر تعليق: «{text}»", "success", url_id)
            return True
        except Exception:
            continue
    log("تعذر نشر التعليق (تتطلب واجهة يوتيوب حساباً مسجلاً)", "warning", url_id)
    return False


# ------------------------------------------------------------ دورة الرابط
def run_cycle(playwright, row: dict, proxy_url: str | None) -> None:
    url_id = row["id"]
    target = row["url"]
    watch_seconds = int(row.get("watch_time_sec") or 30)
    interval_min = int(row.get("interval_min") or 5)

    set_status(url_id, "running")
    log(f"بدء دورة مشاهدة جديدة لمدة {watch_seconds} ثانية", "info", url_id)

    launch_args = {
        "headless": HEADLESS,
        "args": [
            "--no-sandbox",
            "--disable-dev-shm-usage",
            "--disable-blink-features=AutomationControlled",
            "--disable-infobars",
            "--autoplay-policy=no-user-gesture-required",
            "--mute-audio",
            "--disable-gpu",
        ],
    }
    if proxy_url:
        launch_args["proxy"] = {"server": proxy_url}

    browser = playwright.chromium.launch(**launch_args)
    liked = False
    commented = False
    try:
        profile = random.choice(DEVICE_PROFILES)
        context = browser.new_context(
            user_agent=profile["user_agent"],
            viewport=profile["viewport"],
            device_scale_factor=profile["device_scale_factor"],
            is_mobile=profile["is_mobile"],
            has_touch=profile["has_touch"],
            locale=random.choice(LOCALES),
            timezone_id=random.choice(["Asia/Riyadh", "Asia/Dubai", "Africa/Cairo", "Europe/London"]),
            java_script_enabled=True,
            ignore_https_errors=True,
        )
        context.add_init_script(STEALTH_JS)
        page = context.new_page()
        page.set_default_timeout(45000)

        page.goto(target, wait_until="domcontentloaded", timeout=60000)
        dismiss_consent(page)

        try:
            page.wait_for_selector("video", timeout=20000)
        except PWTimeout:
            log("لم يتم العثور على عنصر الفيديو، سيتم إعادة المحاولة لاحقاً", "error", url_id)
            raise

        # بدء التشغيل الفعلي
        page.evaluate(
            """() => {
                const v = document.querySelector('video');
                if (v) { v.muted = true; v.play().catch(() => {}); }
            }"""
        )
        human_mouse(page, moves=3)
        log("بدأ تشغيل الفيديو فعلياً على السيرفر", "success", url_id)

        human_watch(page, watch_seconds, url_id)

        if row.get("enable_like"):
            liked = click_like(page, url_id)

        if row.get("enable_comment"):
            text = random_comment()
            if text:
                commented = post_comment(page, text, url_id)
            else:
                log("بنك التعليقات فارغ — تم تخطي التعليق", "warning", url_id)

        # محاكاة التنقل لتأكيد المشاهدة
        try:
            page.keyboard.press("ArrowDown")
            page.wait_for_timeout(random.randint(1500, 3000))
        except Exception:
            pass

        context.close()

        next_run = now_utc() + timedelta(minutes=interval_min)
        db.table("urls").update(
            {
                "total_views_count": int(row.get("total_views_count") or 0) + 1,
                "total_likes_count": int(row.get("total_likes_count") or 0) + (1 if liked else 0),
                "total_comments_count": int(row.get("total_comments_count") or 0)
                + (1 if commented else 0),
                "last_run_at": now_utc().isoformat(),
                "next_run_at": next_run.isoformat(),
                "status": "idle",
            }
        ).eq("id", url_id).execute()

        log(
            f"اكتملت المشاهدة بنجاح ✅ الدورة القادمة بعد {interval_min} دقيقة",
            "success",
            url_id,
        )
    except Exception as exc:
        retry_at = now_utc() + timedelta(minutes=max(1, interval_min))
        db.table("urls").update(
            {"status": "error", "next_run_at": retry_at.isoformat()}
        ).eq("id", url_id).execute()
        log(f"فشلت الدورة: {exc}", "error", url_id)
        traceback.print_exc()
    finally:
        try:
            browser.close()
        except Exception:
            pass


# ----------------------------------------------------------- الحلقة الرئيسة
def main() -> None:
    log("تم إقلاع خادم الأتمتة وجاهز للعمل 24/7", "success")
    last_state: str | None = None

    with sync_playwright() as playwright:
        while True:
            try:
                settings = get_settings()
                settings_id = settings.get("id")
                send_heartbeat(settings_id)

                status = settings.get("server_status", "stopped")
                if status != last_state:
                    log(
                        "المحرك في وضع التشغيل" if status == "running" else "المحرك متوقف بأمر اللوحة",
                        "success" if status == "running" else "warning",
                    )
                    last_state = status

                if status != "running":
                    time.sleep(POLL_INTERVAL_SEC)
                    continue

                proxy_url = (settings.get("proxy_url") or "").strip() or None
                tasks = due_urls()
                if not tasks:
                    time.sleep(POLL_INTERVAL_SEC)
                    continue

                for row in tasks:
                    fresh = get_settings()
                    if fresh.get("server_status") != "running":
                        log("تم إيقاف المحرك أثناء التنفيذ — إنهاء الدورة الحالية", "warning")
                        break
                    send_heartbeat(fresh.get("id"))
                    run_cycle(playwright, row, proxy_url)
                    time.sleep(random.randint(3, 9))

            except KeyboardInterrupt:
                log("تم إيقاف الخادم يدوياً", "warning")
                break
            except Exception as exc:
                log(f"خطأ عام في الحلقة الرئيسة: {exc}", "error")
                traceback.print_exc()
                time.sleep(POLL_INTERVAL_SEC)


if __name__ == "__main__":
    main()
