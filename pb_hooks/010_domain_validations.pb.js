/// <reference path="../pb_data/types.d.ts" />

// ============================================================================
// توابع کمکی
// ============================================================================

function timeToMinute(value) {
    const parts = value.split(":");

    if (parts.length !== 2) {
        throw new BadRequestError(
            "فرمت زمان نامعتبر است. زمان باید به صورت HH:mm باشد."
        );
    }

    const hour = parseInt(parts[0], 10);
    const minute = parseInt(parts[1], 10);

    if (
        isNaN(hour) ||
        isNaN(minute) ||
        hour < 0 ||
        hour > 23 ||
        minute < 0 ||
        minute > 59
    ) {
        throw new BadRequestError(
            "مقدار زمان نامعتبر است."
        );
    }

    return hour * 60 + minute;
}


// ============================================================================
// SERVICES
//
// سرویس و دسته‌بندی آن باید متعلق به یک کسب‌وکار باشند.
// ============================================================================

onRecordValidate((e) => {
    const businessId = e.record.getString("business_id");
    const categoryId = e.record.getString("category_id");

    if (categoryId !== "") {
        const category = e.app.findRecordById(
            "service_category",
            categoryId
        );

        if (
            category.getString("business_id") !==
            businessId
        ) {
            throw new BadRequestError(
                "سرویس و دسته‌بندی انتخاب‌شده باید متعلق به یک کسب‌وکار باشند."
            );
        }
    }

    e.next();
}, "services");


// ============================================================================
// SERVICE CATEGORY
//
// دسته‌بندی والد باید متعلق به همان کسب‌وکار باشد.
// ============================================================================

onRecordValidate((e) => {
    const businessId = e.record.getString("business_id");
    const parentId = e.record.getString("parent_id");

    if (parentId !== "") {

        if (parentId === e.record.id) {
            throw new BadRequestError(
                "یک دسته‌بندی نمی‌تواند والد خودش باشد."
            );
        }

        const parent = e.app.findRecordById(
            "service_category",
            parentId
        );

        if (
            parent.getString("business_id") !==
            businessId
        ) {
            throw new BadRequestError(
                "دسته‌بندی والد باید متعلق به همان کسب‌وکار باشد."
            );
        }
    }

    e.next();
}, "service_category");


// ============================================================================
// BRANCH SERVICES
//
// شعبه و سرویس باید متعلق به یک کسب‌وکار باشند.
// ============================================================================

onRecordValidate((e) => {
    const branchId = e.record.getString("branch_id");
    const serviceId = e.record.getString("service_id");

    const branch = e.app.findRecordById(
        "branches",
        branchId
    );

    const service = e.app.findRecordById(
        "services",
        serviceId
    );

    if (
        branch.getString("business_id") !==
        service.getString("business_id")
    ) {
        throw new BadRequestError(
            "شعبه و سرویس انتخاب‌شده باید متعلق به یک کسب‌وکار باشند."
        );
    }

    e.next();
}, "branch_services");


// ============================================================================
// RESOURCE ASSIGNMENTS
//
// تاریخ پایان نباید قبل از تاریخ شروع باشد.
// ============================================================================

onRecordValidate((e) => {
    const start = e.record.getDateTime("start_date");
    const end = e.record.getDateTime("end_date");

    if (
        !start.isZero() &&
        !end.isZero() &&
        end.before(start)
    ) {
        throw new BadRequestError(
            "تاریخ پایان تخصیص منبع نمی‌تواند قبل از تاریخ شروع باشد."
        );
    }

    e.next();
}, "resource_assignments");


// ============================================================================
// SERVICE ASSIGNMENTS
//
// سرویس شعبه و تخصیص منبع باید متعلق به یک شعبه باشند.
// ============================================================================

onRecordValidate((e) => {
    const branchServiceId =
        e.record.getString("branch_service_id");

    const resourceAssignmentId =
        e.record.getString("resource_assignment_id");

    const branchService = e.app.findRecordById(
        "branch_services",
        branchServiceId
    );

    const resourceAssignment = e.app.findRecordById(
        "resource_assignments",
        resourceAssignmentId
    );

    if (
        branchService.getString("branch_id") !==
        resourceAssignment.getString("branch_id")
    ) {
        throw new BadRequestError(
            "سرویس و منبع انتخاب‌شده باید متعلق به یک شعبه باشند."
        );
    }

    e.next();
}, "service_assignments");


// ============================================================================
// RESOURCE AVAILABILITY
//
// ساختار:
// resource_assignment_id
// day_of_week
// open_time
// close_time
// status
//
// قوانین:
// 1. روز هفته باید بین 0 و 6 باشد.
// 2. ساعت پایان باید بعد از ساعت شروع باشد.
// 3. بازه‌های فعال یک منبع در یک روز نباید هم‌پوشانی داشته باشند.
// ============================================================================

onRecordValidate((e) => {
    const assignmentId =
        e.record.getString("resource_assignment_id");

    const dayOfWeek =
        e.record.getInt("day_of_week");

    const openTime =
        e.record.getString("open_time");

    const closeTime =
        e.record.getString("close_time");

    const status =
        e.record.getString("status");

    if (
        dayOfWeek < 0 ||
        dayOfWeek > 6
    ) {
        throw new BadRequestError(
            "مقدار روز هفته باید بین 0 و 6 باشد."
        );
    }

    const openMinute =
        timeToMinute(openTime);

    const closeMinute =
        timeToMinute(closeTime);

    if (openMinute >= closeMinute) {
        throw new BadRequestError(
            "ساعت پایان باید بعد از ساعت شروع باشد."
        );
    }

    // بازه غیرفعال نباید باعث ایجاد تداخل شود.
    if (status === "active") {

        const existingIntervals =
            e.app.findRecordsByFilter(
                "resource_availability",

                `
                    resource_assignment_id = {:assignment}
                    &&
                    day_of_week = {:day}
                    &&
                    status = "active"
                    &&
                    id != {:currentId}
                `,

                "open_time",

                100,

                0,

                {
                    assignment: assignmentId,
                    day: dayOfWeek,
                    currentId: e.record.id || ""
                }
            );

        for (
            let i = 0;
            i < existingIntervals.length;
            i++
        ) {

            const existingOpen =
                timeToMinute(
                    existingIntervals[i]
                        .getString("open_time")
                );

            const existingClose =
                timeToMinute(
                    existingIntervals[i]
                        .getString("close_time")
                );

            const hasOverlap =
                openMinute < existingClose &&
                closeMinute > existingOpen;

            if (hasOverlap) {
                throw new BadRequestError(
                    "این بازه زمانی با یکی از بازه‌های موجود منبع تداخل دارد."
                );
            }
        }
    }

    e.next();

}, "resource_availability");


// ============================================================================
// RESOURCE EXCEPTIONS
//
// 1. زمان پایان باید بعد از زمان شروع باشد.
// 2. اگر resource_assignment_id مشخص شده باشد، باید متعلق به همان شعبه باشد.
// ============================================================================

onRecordValidate((e) => {

    const branchId =
        e.record.getString("branch_id");

    const assignmentId =
        e.record.getString(
            "resource_assignment_id"
        );

    const start =
        e.record.getDateTime(
            "start_datetime"
        );

    const end =
        e.record.getDateTime(
            "end_datetime"
        );


    if (
        !start.isZero() &&
        !end.isZero() &&
        !start.before(end)
    ) {
        throw new BadRequestError(
            "زمان پایان استثناء باید بعد از زمان شروع باشد."
        );
    }


    if (assignmentId !== "") {

        const assignment =
            e.app.findRecordById(
                "resource_assignments",
                assignmentId
            );

        if (
            assignment.getString("branch_id") !==
            branchId
        ) {
            throw new BadRequestError(
                "منبع انتخاب‌شده متعلق به شعبه انتخاب‌شده نیست."
            );
        }
    }

    e.next();

}, "resource_exceptions");


// ============================================================================
// ROLE PERMISSIONS
//
// Scope نقش و Permission باید یکسان باشد.
// ============================================================================

onRecordValidate((e) => {

    const role =
        e.app.findRecordById(
            "roles",
            e.record.getString("role_id")
        );

    const permission =
        e.app.findRecordById(
            "permissions",
            e.record.getString("permission_id")
        );


    if (
        role.getString("scope") !==
        permission.getString("scope")
    ) {
        throw new BadRequestError(
            "محدوده نقش و دسترسی باید یکسان باشد."
        );
    }

    e.next();

}, "role_permissions");


// ============================================================================
// USER SYSTEM ROLES
//
// فقط Roleهایی با scope=system مجاز هستند.
// ============================================================================

onRecordValidate((e) => {

    const role =
        e.app.findRecordById(
            "roles",
            e.record.getString("role_id")
        );


    if (
        role.getString("scope") !== "system"
    ) {
        throw new BadRequestError(
            "فقط نقش‌های سیستمی را می‌توان به عنوان نقش سیستمی کاربر ثبت کرد."
        );
    }

    e.next();

}, "user_system_roles");


// ============================================================================
// BRANCH MEMBERSHIP
//
// تمام Roleهای موجود در Membership باید scope=branch داشته باشند.
// ============================================================================

onRecordValidate((e) => {

    const roleIds =
        e.record.getStringSlice("roles");


    if (roleIds.length > 0) {

        const roles =
            e.app.findRecordsByIds(
                "roles",
                roleIds
            );


        if (
            roles.length !==
            roleIds.length
        ) {
            throw new BadRequestError(
                "یک یا چند نقش انتخاب‌شده وجود ندارند."
            );
        }


        for (
            let i = 0;
            i < roles.length;
            i++
        ) {

            if (
                roles[i].getString("scope") !==
                "branch"
            ) {
                throw new BadRequestError(
                    "در عضویت شعبه فقط می‌توان از نقش‌های سطح شعبه استفاده کرد."
                );
            }
        }
    }

    e.next();

}, "branch_membership");


// ============================================================================
// FAVORITES
//
// هر Favorite باید فقط به یکی از این موارد اشاره کند:
// Business
// Resource
// ============================================================================

onRecordValidate((e) => {

    const businessId =
        e.record.getString("business_id");

    const resourceId =
        e.record.getString("resource_id");


    const hasBusiness =
        businessId !== "";

    const hasResource =
        resourceId !== "";


    if (
        hasBusiness === hasResource
    ) {
        throw new BadRequestError(
            "هر مورد علاقه باید فقط به یک کسب‌وکار یا یک منبع اشاره کند."
        );
    }

    e.next();

}, "favorites");


// ============================================================================
// REVIEWS
//
// 1. فقط مشتری همان Appointment اجازه ثبت Review دارد.
// 2. Appointment باید completed باشد.
// ============================================================================

onRecordValidate((e) => {

    const appointmentService =
        e.app.findRecordById(
            "appointment_services",
            e.record.getString(
                "appointment_service_id"
            )
        );


    const appointment =
        e.app.findRecordById(
            "appointment",
            appointmentService.getString(
                "appointment_id"
            )
        );


    const reviewUserId =
        e.record.getString("user_id");


    if (
        appointment.getString(
            "client_user_id"
        ) !== reviewUserId
    ) {
        throw new BadRequestError(
            "فقط مشتری دریافت‌کننده این خدمت می‌تواند برای آن نظر ثبت کند."
        );
    }


    if (
        appointment.getString("status") !==
        "completed"
    ) {
        throw new BadRequestError(
            "فقط برای خدمات نوبت‌های تکمیل‌شده می‌توان نظر ثبت کرد."
        );
    }


    e.next();

}, "reviews");