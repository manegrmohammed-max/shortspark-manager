# خادم الأتمتة (automation-server)

محرك Python + Playwright يعمل 24/7 ويتصل بقاعدة بيانات المشروع لتنفيذ دورات
المشاهدة والتفاعل، وتحديث العدادات وبث السجلات الحية إلى اللوحة.

## المتغيرات البيئية

| المتغير | الوصف |
| --- | --- |
| `SUPABASE_URL` | عنوان قاعدة البيانات (نفس `VITE_SUPABASE_URL` في ملف `.env` بالمشروع) |
| `SUPABASE_KEY` | مفتاح الوصول (`VITE_SUPABASE_PUBLISHABLE_KEY` يكفي مع السياسات الحالية) |
| `POLL_INTERVAL_SEC` | فترة فحص المهام بالثواني (افتراضي 10) |
| `HEADLESS` | `true` افتراضياً |

## التشغيل محلياً

```bash
cd automation-server
pip install -r requirements.txt
python -m playwright install --with-deps chromium
export SUPABASE_URL="..." SUPABASE_KEY="..."
python worker.py
```

## التشغيل عبر Docker

```bash
cd automation-server
docker build -t shorts-automation .
docker run -d --restart always \
  -e SUPABASE_URL="..." \
  -e SUPABASE_KEY="..." \
  --name shorts-automation shorts-automation
```

## ملاحظات

- المحرك لا يبدأ التنفيذ إلا إذا كانت حالة السيرفر `running` من صفحة الإعدادات.
- يرسل نبضة حياة كل دورة فحص، وتظهر كشارة «السيرفر متصل» في أعلى اللوحة.
- رابط البروكسي المُدخل في صفحة الإعدادات يُمرَّر مباشرة إلى Chromium لتدوير الـ IP.
- الإعجاب والتعليق يتطلبان جلسة يوتيوب مسجّلة الدخول داخل المتصفح؛ بدونها يسجل
  المحرك تحذيراً ويكمل المشاهدة.
- `schema.sql` يوثّق المخطط المطبَّق فعلياً على قاعدة البيانات.
