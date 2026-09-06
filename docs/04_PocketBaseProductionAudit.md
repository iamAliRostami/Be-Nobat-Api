# ممیزی آمادگی Production برای PocketBase

## دامنه‌ی بررسی

این ممیزی schema، API rules، hookهای رزرو، مدل چندمستاجری، یکپارچگی داده و
ریسک‌های عملیاتی snapshot موجود را پوشش می‌دهد. هدف این مرحله بستن نقص‌های
قطعی و پرخطر بدون حدس زدن تصمیم‌های محصولی است.

## اصلاحات اعمال‌شده

1. **Mass assignment در رزرو:** وضعیت و مبلغ‌های محاسباتی نوبت اکنون برای
   درخواست غیر-superuser در سرور overwrite می‌شوند. وضعیت خط خدمت نیز فقط
   `pending` ساخته می‌شود.
2. **دستکاری نوبت نهایی:** افزودن خط خدمت جدید به نوبت completed، cancelled یا
   no-show ممنوع شد.
3. **لغو توسط مشتری:** rule قبلی عملاً تغییر status توسط مشتری را کاملاً
   ممنوع می‌کرد. اکنون مشتری فقط نوبت خودش را به cancelled می‌برد و state
   machine گذار نامعتبر را رد می‌کند.
4. **اعتبار مشتری:** لغو توسط کسب‌وکار قبلاً به اشتباه مشتری را جریمه می‌کرد.
   اکنون actor ثبت می‌شود و فقط لغو توسط خود مشتری مشمول جریمه‌ی دیرهنگام است.
5. **یکپارچگی هم‌زمان:** قیود unique برای review هر appointment service، عضویت
   شعبه، role-permission و شیفت دقیقاً تکراری اضافه شد. indexهای تقویم
   استثناها نیز برای مسیر availability اضافه شدند.
6. **نشت داده‌ی runtime:** دیتابیس، WAL/SHM و uploadهای `pb_data` از Git خارج
   شدند. این مسیر باید volume خصوصی باشد؛ migrations منبع حقیقت schema هستند.
7. **ممیزی خودکار:** اسکریپت audit، سلامت SQLite، کالکشن‌های هسته، نوع مبلغ‌ها،
   نام تکراری field و mutation rule عمومی ناخواسته را بررسی می‌کند.

## یافته‌های باز که به تصمیم محصول یا زیرساخت نیاز دارند

### P0 — قبل از انتشار عمومی

- **نسخه و artifact:** نسخه‌ی PocketBase باید pin و checksum آن در pipeline
  کنترل شود. binary نباید به شکل «latest» در production دانلود شود.
- **اسرار و داده‌ی قبلی Git:** حذف فایل در commit جدید، تاریخچه‌ی Git را پاک
  نمی‌کند. اگر snapshot قبلی شامل اطلاعات واقعی یا token بوده است، تاریخچه
  باید با ابزار مناسب پاک و تمام credentialها rotate شوند.
- **Backup/restore:** از `pb_data` هنگام اجرای سرویس کپی فایل عادی نگیرید.
  backup سازگار PocketBase تعریف، رمزنگاری، خارج از ماشین اصلی نگهداری و
  بازیابی آن به‌صورت دوره‌ای تمرین شود.
- **TLS و پنل مدیریت:** TLS روی reverse proxy، محدودسازی دسترسی dashboard،
  rate limit لبه، محدودیت اندازه‌ی request و trusted proxy صریح لازم است.

### P1 — قبل از پذیرش ترافیک واقعی

- **Timezone شعبه:** محاسبه‌ی availability فعلی روز را بر مبنای UTC می‌سازد،
  درحالی‌که schema شعبه timezone ندارد. باید timezone معتبر IANA به شعبه
  افزوده و قرارداد تبدیل local-time/UTC یکپارچه شود؛ در غیر این صورت شعب
  خارج UTC اسلات اشتباه خواهند دید.
- **رزرو اتمیک:** ساخت appointment و appointment_services چند request است و
  می‌تواند نوبت orphan باقی بگذارد. endpoint واحد transactional برای quote و
  booking، همراه idempotency key، توصیه می‌شود.
- **اعمال availability در write:** endpoint اسلات آزاد را درست محاسبه می‌کند،
  اما write رزرو هنوز الزام «داخل ساعات کاری/خارج استثنا» را مستقلاً enforce
  نمی‌کند. write-side validation باید منبع نهایی حقیقت باشد.
- **RBAC واقعی:** کالکشن‌های role/permission وجود دارند، ولی بسیاری از API
  ruleها صرفاً active membership را مجوز مدیریت می‌دانند. permissionهای
  `appointment.manage`، `schedule.manage` و مشابه باید روی همه‌ی mutationها
  enforce شوند.
- **تخفیف:** رزرو تخفیف، سقف مصرف و افزایش `used_count` هنوز transactional
  نیست. این flow باید هم‌زمان با محاسبه‌ی مبلغ و ثبت redemption اتمیک شود.
- **اعلان:** collection اعلان outbox ارسال‌شده نیست. worker دارای retry،
  backoff، dead-letter و idempotency برای FCM/SMS لازم است.

### P2 — پایداری و مشاهده‌پذیری

- audit log تغییرناپذیر برای تغییر نقش، schedule، قیمت، تخفیف و وضعیت نوبت؛
- health/readiness probe، metric برای latency/error/DB busy و alert؛
- load test مخصوص رقابت رزرو یک resource و تست restore؛
- retention و privacy policy برای PII، لاگ و upload؛
- برنامه‌ی scale-up و سپس migration در صورت عبور workload از محدودیت یک
  process/SQLite writer در PocketBase.

## Runbook پیشنهادی انتشار

1. روی کپی backup، binary دقیقاً pin‌شده را با migrations جدید اجرا کنید.
2. قبل از unique indexها، duplicateها را بررسی و تعیین تکلیف کنید.
3. audit و smoke test رزرو هم‌زمان، لغو مشتری و لغو ارائه‌دهنده را اجرا کنید.
4. backup جدید بگیرید، health check را تأیید و سپس traffic را باز کنید.
5. rollback را فقط همراه backup سازگار همان نسخه انجام دهید؛ rollback schema
   جایگزین بازیابی داده‌ی حذف/تبدیل‌شده نیست.
