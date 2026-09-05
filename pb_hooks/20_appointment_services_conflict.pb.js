/// <reference path="../pb_data/types.d.ts" />

// جلوگیری از تداخل زمانی (double-booking): یک service_assignment (یعنی یک resource مشخص روی یک سرویس مشخص)
// نباید دو appointment_service با بازه‌ی زمانی هم‌پوشان و status غیر از cancelled داشته باشه.
// این فایل بعد از 10_appointment_services_pricing.pb.js اجرا می‌شه (به لطف پیشوند عددی نام فایل)،
// پس در لحظه‌ی اجرا duration واقعی (نه مقدار کلاینت) از قبل روی رکورد ست شده.
function checkOverlap(e) {
    let serviceAssignmentId = e.record.get("service_assignment_id");
    let startAtStr = e.record.get("start_at");
    let duration = Number(e.record.get("duration")) || 0;

    if (!serviceAssignmentId || !startAtStr || duration <= 0) {
        // اعتبارسنجی پایه (required بودن فیلدها) رو خود PocketBase انجام می‌ده
        return;
    }

    let newStart = new Date(startAtStr);
    let newEnd = new Date(newStart.getTime() + duration * 60000);

    // برای اینکه query سنگین نشه، فقط رکوردهای یک بازه‌ی معقول (۱۲ ساعت قبل تا پایان نوبت جدید) رو می‌گیریم
    // و overlap دقیق رو توی جاوااسکریپت چک می‌کنیم (چون فیلتر PocketBase نمی‌تونه start_at + duration رو محاسبه کنه)
    let windowStart = new Date(newStart.getTime() - 12 * 60 * 60000).toISOString();

    let candidates = e.app.findRecordsByFilter(
        "appointment_services",
        "service_assignment_id = {:sa} && status != 'cancelled' && start_at >= {:from} && start_at <= {:to}",
        "",
        0,
        0,
        {
            "sa": serviceAssignmentId,
            "from": windowStart,
            "to": newEnd.toISOString(),
        }
    );

    for (let i = 0; i < candidates.length; i++) {
        let c = candidates[i];
        if (c.id === e.record.id) {
            continue; // در حالت update، خود رکورد رو نادیده بگیر
        }
        let cStart = new Date(c.get("start_at"));
        let cDuration = Number(c.get("duration")) || 0;
        let cEnd = new Date(cStart.getTime() + cDuration * 60000);

        // دو بازه تداخل دارن اگر: newStart < cEnd && cStart < newEnd
        if (newStart < cEnd && cStart < newEnd) {
            throw new BadRequestError("این بازه‌ی زمانی برای این پرسنل/منبع قبلاً رزرو شده است.");
        }
    }
}

onRecordCreateRequest((e) => {
    checkOverlap(e);
    e.next();
}, "appointment_services");

onRecordUpdateRequest((e) => {
    let original = e.record.original();
    let scheduleChanged =
        original.get("start_at") !== e.record.get("start_at") ||
        original.get("duration") !== e.record.get("duration") ||
        original.get("service_assignment_id") !== e.record.get("service_assignment_id");

    if (scheduleChanged) {
        checkOverlap(e);
    }
    e.next();
}, "appointment_services");
