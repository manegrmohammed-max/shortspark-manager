import { useMemo, useState } from "react";
import {
  Rocket,
  Copy,
  Check,
  ExternalLink,
  Terminal,
  Activity,
  ShieldCheck,
  AlertTriangle,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { isServerOnline, type SettingsRow } from "@/lib/api";
import { cn } from "@/lib/utils";

const SUPABASE_URL = import.meta.env["VITE_SUPABASE_URL"] as string;
const SUPABASE_KEY = import.meta.env["VITE_SUPABASE_PUBLISHABLE_KEY"] as string;

const RAILWAY_URL = "https://railway.com/new";
const RENDER_URL = "https://dashboard.render.com/create?type=worker";

function CopyRow({ label, value }: { label: string; value: string }) {
  const [done, setDone] = useState(false);
  return (
    <div className="flex items-center gap-2 rounded-lg border border-border bg-secondary/50 p-2">
      <span className="shrink-0 text-xs font-bold text-muted-foreground">{label}</span>
      <code dir="ltr" className="num flex-1 truncate text-[11px]">
        {value}
      </code>
      <Button
        type="button"
        size="sm"
        variant="ghost"
        className="size-7 shrink-0 p-0"
        onClick={async () => {
          await navigator.clipboard.writeText(value);
          setDone(true);
          toast.success(`تم نسخ ${label}`);
          setTimeout(() => setDone(false), 1500);
        }}
      >
        {done ? <Check className="size-4 text-success" /> : <Copy className="size-4" />}
      </Button>
    </div>
  );
}

export function DeployPanel({ settings }: { settings: SettingsRow | null }) {
  const online = isServerOnline(settings);
  const running = settings?.server_status === "running";
  const proxyOk = useMemo(() => {
    const p = settings?.proxy_url?.trim();
    if (!p) return null;
    return /^(https?|socks5):\/\/[^\s]+:\d+/i.test(p);
  }, [settings?.proxy_url]);

  const statusReport = [
    `الأمر المخزّن   : ${running ? "تشغيل (running)" : "إيقاف (stopped)"}`,
    `اتصال المحرك    : ${online ? "متصل ✅" : "غير متصل ❌"}`,
    `آخر نبضة حياة   : ${settings?.heartbeat_at ? new Date(settings.heartbeat_at).toLocaleString("ar") : "لا توجد"}`,
    `البروكسي        : ${settings?.proxy_url ? (proxyOk ? "مضبوط وصيغته صحيحة ✅" : "الصيغة غير صحيحة ⚠️") : "غير مضبوط (اتصال مباشر)"}`,
    `قاعدة البيانات  : متصلة ✅`,
  ].join("\n");

  return (
    <div className="surface-card p-6 lg:col-span-2">
      <div className="mb-4 flex items-center gap-3">
        <span className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <Rocket className="size-5" />
        </span>
        <div>
          <h2 className="text-base font-bold">إنشاء ونشر خادم الأتمتة (خطوة واحدة متبقية عليك)</h2>
          <p className="text-xs text-muted-foreground">
            كل شيء جاهز داخل مجلد <span className="num">automation-server</span>. يتبقى فقط رفعه على
            استضافة مجانية تشغّل Playwright، لأن المتصفح لا يستطيع تشغيل محرك المشاهدات بنفسه.
          </p>
        </div>
      </div>

      <div className="mb-5 grid gap-3 sm:grid-cols-2">
        <a href={RAILWAY_URL} target="_blank" rel="noopener noreferrer">
          <Button className="w-full gap-2 bg-primary text-primary-foreground hover:bg-primary/90">
            <ExternalLink className="size-4" /> النشر على Railway (موصى به)
          </Button>
        </a>
        <a href={RENDER_URL} target="_blank" rel="noopener noreferrer">
          <Button variant="outline" className="w-full gap-2">
            <ExternalLink className="size-4" /> النشر على Render
          </Button>
        </a>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-xl border border-border p-4">
          <h3 className="mb-3 flex items-center gap-2 text-sm font-bold">
            <Terminal className="size-4 text-primary" /> ما المطلوب منك بالضبط
          </h3>
          <ol className="list-decimal space-y-2 pe-4 text-xs leading-6 text-muted-foreground">
            <li>
              نزّل مشروعك (زر <b>GitHub</b> أعلى Lovable) لكي يصبح مجلد{" "}
              <span className="num">automation-server</span> داخل مستودع GitHub خاص بك.
            </li>
            <li>
              اضغط زر <b>النشر على Railway</b> بالأعلى ← <span className="num">Deploy from GitHub repo</span>{" "}
              ← اختر المستودع.
            </li>
            <li>
              في إعدادات الخدمة اجعل <span className="num">Root Directory = automation-server</span> (سيلتقط
              Railway ملف <span className="num">Dockerfile</span> تلقائياً).
            </li>
            <li>
              أضف متغيرات البيئة التالية (انسخها من الصندوق المجاور):{" "}
              <span className="num">SUPABASE_URL</span> و <span className="num">SUPABASE_KEY</span>، واختيارياً{" "}
              <span className="num">HEADLESS=true</span> و <span className="num">POLL_INTERVAL_SEC=5</span>.
            </li>
            <li>
              اضغط <b>Deploy</b> وانتظر انتهاء البناء (٣–٥ دقائق لتحميل Chromium).
            </li>
            <li>
              ارجع هنا واضغط <b>تشغيل المحرك</b>؛ خلال ثوانٍ تتحول الشارة إلى{" "}
              <b className="text-success">متصل</b> وتبدأ السجلات الحية بالظهور.
            </li>
            <li>
              (اختياري) ضع رابط البروكسي الدوّار في الحقل بالأعلى لتغيير الـ IP في كل دورة.
            </li>
          </ol>
        </div>

        <div className="space-y-3">
          <div className="rounded-xl border border-border p-4">
            <h3 className="mb-3 flex items-center gap-2 text-sm font-bold">
              <ShieldCheck className="size-4 text-success" /> متغيرات البيئة الجاهزة
            </h3>
            <div className="space-y-2">
              <CopyRow label="SUPABASE_URL" value={SUPABASE_URL} />
              <CopyRow label="SUPABASE_KEY" value={SUPABASE_KEY} />
              <CopyRow label="HEADLESS" value="true" />
              <CopyRow label="POLL_INTERVAL_SEC" value="5" />
            </div>
          </div>

          <div className="rounded-xl border border-border p-4">
            <h3 className="mb-3 flex items-center gap-2 text-sm font-bold">
              <Activity className="size-4 text-primary" /> طباعة حالة السيرفر
            </h3>
            <pre
              dir="rtl"
              className={cn(
                "num whitespace-pre-wrap rounded-lg bg-secondary/60 p-3 text-[11px] leading-6",
                online ? "text-foreground" : "text-muted-foreground",
              )}
            >
              {statusReport}
            </pre>
            {!online && (
              <p className="mt-2 flex items-start gap-2 text-[11px] leading-5 text-warning">
                <AlertTriangle className="mt-0.5 size-3.5 shrink-0" />
                المحرك غير متصل حالياً: لن تُنفَّذ أي مشاهدات حتى يتم نشر{" "}
                <span className="num">automation-server</span> وتشغيله بالخطوات المجاورة.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
