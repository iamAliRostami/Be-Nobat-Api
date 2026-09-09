# Be Nobat

بازنویسی سامانه‌ی Be Nobat با ASP.NET Core، Blazor و PostgreSQL. این شاخه شروع
جایگزینی تدریجی PocketBase است؛ فایل‌های PocketBase فعلاً برای مرجع مهاجرت داده
حفظ شده‌اند و منبع اجرای برنامه‌ی جدید نیستند.

## اجرای محلی

پیش‌نیازها: Docker 24+ و Docker Compose v2.

```bash
docker compose up --build
```

سپس پنل در `http://localhost:8080` و health check در
`http://localhost:8080/health` در دسترس است.

### Windows: فرمان `docker` پیدا نمی‌شود

اگر Docker Desktop باز است اما PowerShell فرمان `docker` را پیدا نمی‌کند، ابتدا
نصب مجدد انجام ندهید. همه‌ی پنجره‌های PowerShell را ببندید، Docker Desktop را
یک بار Restart کنید و در یک PowerShell جدید اجرا کنید:

```powershell
Get-Command docker -ErrorAction SilentlyContinue
where.exe docker
```

خروجی `INFO: Could not find files for the given pattern(s).` از `where.exe` و
نداشتن خروجی از `Get-Command` یعنی Windows هیچ Docker CLI قابل اجرایی در `PATH`
پیدا نکرده است. در این حالت از مسیر **Settings > Apps > Installed apps >
Docker Desktop** گزینه‌ی **Repair** را اجرا و Windows را Restart کنید. فقط اگر
Repair در دسترس نبود یا پس از Restart همچنان `docker.exe` پیدا نشد، Docker
Desktop را از منبع رسمی Uninstall و دوباره نصب کنید. سپس این سه دستور باید موفق
شوند:

> اگر گزینه‌ی **Modify** خاکستری است و فقط **Uninstall** فعال است، امکان Repair
> از Windows Settings وجود ندارد؛ Docker Desktop را Uninstall، ویندوز را Restart
> و سپس نصب‌کننده‌ی رسمی را با **Run as administrator** اجرا کنید. حذف Docker
> Desktop ممکن است containerها، imageها و volumeهای محلی را نیز پاک کند؛ پیش از
> حذف، از داده‌های محلی مهم نسخه‌ی پشتیبان بگیرید.

```powershell
docker --version
docker compose version
docker info
```

## ساختار

- `src/BeNobat.Web`: میزبان ASP.NET Core، Blazor، Identity و REST API
- `src/BeNobat.Web/Domain`: مدل دامنه‌ی مستقل از رابط کاربری
- `src/BeNobat.Web/Infrastructure`: EF Core و PostgreSQL
- `tests/BeNobat.Web.Tests`: تست‌های معماری و دامنه
- `docs/05_DotNetMigrationPlan.md`: مرز فاز اول و نقشه‌ی مهاجرت

## وضعیت فاز اول

فاز اول یک foundation قابل اجرا شامل پنل مدیریتی RTL، داشبورد، PostgreSQL،
Identity API، OpenAPI، health check و مدل اولیه‌ی کسب‌وکار/شعبه/سرویس/منبع/نوبت
است. قابلیت‌های عملیاتی در فازهای بعدی به‌صورت vertical slice اضافه می‌شوند.
