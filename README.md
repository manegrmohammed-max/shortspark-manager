# Shorts Automation Hub

قم بإنشاء تطبيق لوحة تحكم سحابية متكاملة بأسلوب Full-Stack System Dashboard باللغة العربية مع دعم كامل للاتجاه من اليمين إلى اليسار (RTL) بتصميم فاتح أنيق وعصري (Light Theme) باستخدام Tailwind CSS وShadcn UI للتحكم في أتمتة وتفاعل مشاهدات روابط YouTube Shorts بشكل حقيقي وناجح.



المشروع يجب أن يحتوي على جميع المكونات البرمجية والواجهات، بالإضافة إلى إنشاء المجلد والملفات الخاصة بخادم الأتمتة السحابية (automation-server) بالكامل ودون اقتطاع.



### 1. تصميم الواجهة الأمامية (Arabic Light Theme Frontend):

- نظام الألوان: خلفية فاتحة هادئة (#F8FAFC)، بطاقات بيضاء ناصعة (#FFFFFF)، حدود ناعمة (#E2E8F0)، وأزرار تفاعلية بالأزرق الناصع والأخضر للأفعال الإيجابية.

- شريط جانبي (Sidebar) يضم Navigation رئيساً:

  1. لوحة التحكم (Dashboard): بطاقات إحصائيات حية (إجمالي المشاهدات المكتملة الحقيقية، الروابط النشطة، إجمالي التفاعلات المكتملة "إعجابات وتعليقات"، وحالة السيرفر المباشرة متصل/منفصل).

  2. إدارة الروابط (Bulk Link Manager):

     - نموذج مخصص لـ "إضافة عدة روابط دفعة واحدة" (Multi-URL Entry) مع خيارات عامة أو تخصيص فردي لكل رابط.

     - شريط تمرير (Slider) لوقت المشاهدة الفعلية لكل رابط (15 - 60 ثانية).

     - شريط تمرير للفارق الزمني بين الدورات (1 - 30 دقيقة).

     - مفاتيح مفصلة (Toggles) لتفعيل: التفاعل الحقيقي بالإعجاب (Heart/Like)، وتفعيل إضافة تعليق عشوائي.

     - جدول تفاعلي يحتوي على زر "حفظ وتفعيل الكل" (Save All & Start)، ويعرض: الرابط، المشاهدات المكتملة، الوقت المتبقي للدورة التالية (CountDown Timer)، والحالة المباشرة.

  3. بنك التعليقات (Comment Pool Manager): واجهة إضافة وتعديل قائمة التعليقات المجهزة باللغتين العربية والإنجليزية لتطبيق التفاعل العشوائي الحقيقي منها.

  4. شاشة تحليل ومركز السجلات الحية (Realtime Logs & Analytics):

     - رسم بياني لتوزيع المشاهدات والتفاعلات التي تمت بنجاح والتي قيد الانتظار والتي ستتم في الدورات القادمة.

     - شاشة بث تفصيلي حي للسجلات القادمة من Supabase Realtime مع طابع زمني دقيق لكل عملية.

  5. إعدادات السيرفر والبروكسي (/settings):

     - حقل إدخال بروكسي تدوير الـ IP (Proxy Rotation / IP Changer URL) لمنع الكشف أو الحظر نهائياً.

     - زر التحكم المباشر في تشغيل/إيقاف محرك السيرفر السحابي.



### 2. إعداد قاعدة البيانات وتوفير مخطط SQL (Supabase Schema):

قم بإنشاء وتزويد المخطط الهيكلي التالي في ملف `automation-server/schema.sql` مع ربطه بـ Lovable Cloud:

- جدول `urls`: (id, url, watch_time_sec, interval_min, enable_like, enable_comment, is_active, total_views_count, created_at)

- جدول `comments`: (id, comment_text, lang, is_active, created_at)

- جدول `logs`: (id, url_id, message, log_type, created_at)

- جدول `settings`: (id, proxy_url, server_status, updated_at)

- تفعيل Realtime البث الفوري لجدول `logs` وجدول `urls`.



### 3. إنشاء مجلد وخادم الأتمتة المكتمل (Automation Server Files):

قم بإنشاء المجلد `automation-server` متضمناً الملفات البرمجية التنفيذية الحقيقية التالية 100%:



أ. ملف `automation-server/worker.py`:

   - كود Python متكامل يعمل عبر بيئة Playwright في وضع Headless للعمل المستمر 24/7 دون توقف.

   - دعم التخفي المتقدم (Stealth Mode) عبر إلغاء `navigator.webdriver` وتدوير عشوائي لـ User-Agents ودعم IP Proxy Rotation لمنع التعرف على البوت تماماً.

   - فتح الفيديو وتشغيله فعلياً على السيرفر ومحاكاة التنقل وحركة الماوس البشرية لمنع إلغاء المشاهدة.

   - تنفيذ التفاعلات الحقيقية: الضغط التفاعلي على زر الإعجاب، واختيار تعليق عشوائي (عربي/إنجليزي) من جدول `comments` ونشره.

   - حساب وتحديث عدد المشاهدات المكتملة والوقت المتبقي لكل رابط فورياً في قاعدة البيانات ليظهر على اللوحة مباشرة.



ب. ملف `automation-server/Dockerfile`:

   - إعداد بيئة Python 3.10 مع كافة حزم المتصفح (Chromium) الجاهزة للتشغيل والنشر المباشر.



ج. ملف `automation-server/requirements.txt`:

   - يحتوي على كافة التبعيات: `playwright==1.42.0`, `supabase==2.3.4`.



Build all frontend UI routes, data layer, Supabase connections, and full backend automation files inside the `automation-server` directory completely without any placeholders or missing code.

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://shortspark-manager.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/4720df71-5600-4f99-bfda-83d93d6a452d).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
