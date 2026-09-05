# نصب

این ۶ فایل رو مستقیم توی پوشه‌ی `pb_hooks` پروژه‌ی PocketBase‌تون کپی کنید (کنار `pb_data`)، سپس سرور رو ری‌استارت کنید. PocketBase همه‌ی فایل‌های `*.pb.js` رو خودکار لود می‌کنه.

پیشوند عددی اسم فایل‌ها (`10_`, `20_`, ...) عمداً هست: چون چند hook می‌تونن روی یک event/کالکشن ثبت بشن و به‌صورت زنجیره‌ای (هر کدوم با `e.next()`) اجرا می‌شن، ترتیب لود شدن فایل‌ها مهمه. مثلاً `10_appointment_services_pricing.pb.js` باید قبل از `20_appointment_services_conflict.pb.js` اجرا بشه چون فایل دوم به `duration` ای نیاز داره که فایل اول محاسبه و ست می‌کنه.

## فایل‌ها

| فایل | کاره چیه |
|---|---|
| `10_appointment_services_pricing.pb.js` | قیمت/مدت واقعی هر appointment_service رو از روی service_assignment/branch_service محاسبه می‌کنه (نه از ورودی کلاینت) و match بودن resource با شعبه رو چک می‌کنه |
| `20_appointment_services_conflict.pb.js` | جلوگیری از رزرو دوباره (double-booking) یک resource در یک بازه‌ی زمانی هم‌پوشان |
| `30_appointment_services_aggregate.pb.js` | بعد از هر تغییر در appointment_services، appointment والد (start/end/total_price/final_price) رو بازمحاسبه می‌کنه |
| `40_appointment_status.pb.js` | state machine برای appointment.status (نمی‌ذاره وضعیت از هر جایی به هر جایی بپره) |
| `41_appointment_services_status.pb.js` | همون state machine برای appointment_services.status |
| `50_reputation_events.pb.js` | بعد از completed/no_show/cancelled شدن نوبت، رکورد reputation_events خودکار می‌سازه |

## ⚠️ مواردی که باید خودتون تست/تنظیم کنید

1. **ترتیب اجرای hook های هم‌رویداد**: رفتار مستندشده‌ی PocketBase اینه که چند handler روی یک event به ترتیب لود فایل زنجیره می‌شن، ولی حتماً با لاگ (`app.logger()`) تأیید کنید که `10_` واقعاً قبل از `20_` اجرا می‌شه.
2. **`price_override`/`duration_override` صفر**: چون این فیلدها عدد optional هستن (نه nullable واقعی)، مقدار `0` به‌معنی «تنظیم نشده» در نظر گرفته شده. اگه لازم شد یه سرویس واقعاً با override صفر (رایگان) ثبت بشه، باید یه فیلد بولی جدا (`has_price_override`) به schema اضافه بشه.
3. **`discounts`**: اعمال کد تخفیف (validation کد، محدودیت max_uses، افزایش used_count) توی این ست از hook ها پیاده نشده — چون به یه تصمیم UX نیاز داره (کد تخفیف کجای فلوی رزرو وارد میشه؟). اگه بخواید، جداگانه براش hook می‌نویسم.
4. **ارسال واقعی push notification**: `notifications` collection فقط رکورد رو نگه می‌داره؛ ارسال واقعی به FCM/APNs (با استفاده از `device_tokens` که قبلاً اضافه کردیم) نیاز به یه hook دیگه (`onRecordAfterCreateSuccess` روی `notifications` + `$http.send` به FCM) داره که هنوز ننوشتم.
5. تمام پیام‌های خطا فارسی نوشته شدن؛ اگه اپ چندزبانه می‌شه، بهتره این پیام‌ها رو به یه لایه‌ی i18n جدا منتقل کنید.
