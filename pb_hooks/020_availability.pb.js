/// <reference path="../pb_data/types.d.ts" />

// ============================================================================
// Base Availability Route
//
// POST /api/be-nobat/availability/base
//
// در این نسخه فقط موارد زیر بررسی می‌شوند:
//
// - برنامه هفتگی Resource
// - مدت سرویس‌های انتخاب‌شده
//
// هنوز این موارد محاسبه نمی‌شوند:
//
// - resource_exceptions
// - appointmentهای موجود
// - امتیازدهی و بهینه‌سازی Gapها
//
// open_time و close_time از نوع Text و با فرمت HH:mm هستند.
// ============================================================================

routerAdd(
    "POST",

    "/api/be-nobat/availability/base",

    (e) => {

        // ====================================================================
        // Helper Functions
        // ====================================================================

        function timeToMinute(value) {

            const parts =
                value.split(":");


            if (
                parts.length !== 2
            ) {
                throw new BadRequestError(
                    "فرمت زمان نامعتبر است. زمان باید به صورت HH:mm باشد."
                );
            }


            const hour =
                parseInt(parts[0], 10);

            const minute =
                parseInt(parts[1], 10);


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


            return (
                hour * 60 +
                minute
            );
        }


        function minuteToTime(value) {

            const hour =
                Math.floor(
                    value / 60
                );

            const minute =
                value % 60;


            return (
                (hour < 10 ? "0" : "") +
                hour +
                ":" +
                (minute < 10 ? "0" : "") +
                minute
            );
        }


        function parseLocalDate(value) {

            if (
                !/^\d{4}-\d{2}-\d{2}$/.test(
                    value
                )
            ) {
                throw new BadRequestError(
                    "فرمت تاریخ باید به صورت YYYY-MM-DD باشد."
                );
            }


            const parts =
                value.split("-");


            const year =
                parseInt(
                    parts[0],
                    10
                );

            const month =
                parseInt(
                    parts[1],
                    10
                );

            const day =
                parseInt(
                    parts[2],
                    10
                );


            const date =
                new Date(
                    Date.UTC(
                        year,
                        month - 1,
                        day
                    )
                );


            // جلوگیری از تاریخ‌هایی مثل:
            // 2026-02-31
            if (
                date.getUTCFullYear() !== year ||
                date.getUTCMonth() !== month - 1 ||
                date.getUTCDate() !== day
            ) {
                throw new BadRequestError(
                    "تاریخ واردشده معتبر نیست."
                );
            }


            return date;
        }


        function findRequiredRecord(
            app,
            collectionName,
            id,
            label
        ) {

            if (!id) {
                throw new BadRequestError(
                    label +
                    " الزامی است."
                );
            }


            try {

                return app.findRecordById(
                    collectionName,
                    id
                );

            } catch (err) {

                throw new BadRequestError(
                    label +
                    " پیدا نشد."
                );
            }
        }


        function ensureActiveNotDeleted(
            record,
            label
        ) {

            if (
                record.getString("status") !==
                "active"
            ) {
                throw new BadRequestError(
                    label +
                    " فعال نیست."
                );
            }


            if (
                !record
                    .getDateTime("deleted_at")
                    .isZero()
            ) {
                throw new BadRequestError(
                    label +
                    " حذف شده است."
                );
            }
        }


        // ====================================================================
        // Request Body
        // ====================================================================

        const body =
            e.requestInfo().body;


        const resourceAssignmentId =
            body.resource_assignment_id ||
            "";


        const requestedDate =
            body.date ||
            "";


        const serviceAssignmentIds =
            body.service_assignment_ids ||
            [];


        if (
            resourceAssignmentId === ""
        ) {
            throw new BadRequestError(
                "resource_assignment_id الزامی است."
            );
        }


        if (
            requestedDate === ""
        ) {
            throw new BadRequestError(
                "تاریخ الزامی است."
            );
        }


        if (
            !Array.isArray(
                serviceAssignmentIds
            ) ||
            serviceAssignmentIds.length === 0
        ) {
            throw new BadRequestError(
                "حداقل یک service_assignment_id باید انتخاب شود."
            );
        }


        // ====================================================================
        // جلوگیری از Service Assignment تکراری
        // ====================================================================

        const uniqueServiceAssignmentIds =
            [];


        for (
            let i = 0;
            i < serviceAssignmentIds.length;
            i++
        ) {

            const id =
                serviceAssignmentIds[i];


            if (
                typeof id !== "string" ||
                id === ""
            ) {
                throw new BadRequestError(
                    "شناسه یکی از سرویس‌های انتخاب‌شده معتبر نیست."
                );
            }


            if (
                uniqueServiceAssignmentIds
                    .indexOf(id) !== -1
            ) {
                throw new BadRequestError(
                    "یک سرویس نمی‌تواند بیش از یک‌بار در درخواست تکرار شود."
                );
            }


            uniqueServiceAssignmentIds
                .push(id);
        }


        // ====================================================================
        // Date
        //
        // Convention:
        //
        // 0 = Sunday
        // 1 = Monday
        // ...
        // 6 = Saturday
        //
        // ====================================================================

        const date =
            parseLocalDate(
                requestedDate
            );


        const dayOfWeek =
            date.getUTCDay();


        // ====================================================================
        // Resource Assignment
        // ====================================================================

        const resourceAssignment =
            findRequiredRecord(
                e.app,

                "resource_assignments",

                resourceAssignmentId,

                "تخصیص منبع"
            );


        ensureActiveNotDeleted(
            resourceAssignment,
            "تخصیص منبع"
        );


        const branchId =
            resourceAssignment
                .getString(
                    "branch_id"
                );


        const resourceId =
            resourceAssignment
                .getString(
                    "resource_id"
                );


        // ====================================================================
        // Branch
        // ====================================================================

        const branch =
            findRequiredRecord(
                e.app,

                "branches",

                branchId,

                "شعبه"
            );


        ensureActiveNotDeleted(
            branch,
            "شعبه"
        );


        // ====================================================================
        // Resource
        // ====================================================================

        const resource =
            findRequiredRecord(
                e.app,

                "resources",

                resourceId,

                "منبع"
            );


        ensureActiveNotDeleted(
            resource,
            "منبع"
        );


        // ====================================================================
        // Service Assignments
        // ====================================================================

        const serviceAssignments =
            e.app.findRecordsByIds(
                "service_assignments",
                uniqueServiceAssignmentIds
            );


        if (
            serviceAssignments.length !==
            uniqueServiceAssignmentIds.length
        ) {
            throw new BadRequestError(
                "یک یا چند سرویس انتخاب‌شده وجود ندارند."
            );
        }


        let totalDuration =
            0;


        for (
            let i = 0;
            i < serviceAssignments.length;
            i++
        ) {

            const serviceAssignment =
                serviceAssignments[i];


            // ------------------------------------------------------------
            // همه سرویس‌ها فعلاً باید متعلق به یک ResourceAssignment باشند.
            // ------------------------------------------------------------

            if (
                serviceAssignment
                    .getString(
                        "resource_assignment_id"
                    ) !==
                resourceAssignmentId
            ) {
                throw new BadRequestError(
                    "تمام سرویس‌های انتخاب‌شده باید توسط همان منبع در همان شعبه ارائه شوند."
                );
            }


            ensureActiveNotDeleted(
                serviceAssignment,
                "تخصیص سرویس"
            );


            const branchServiceId =
                serviceAssignment
                    .getString(
                        "branch_service_id"
                    );


            const branchService =
                findRequiredRecord(
                    e.app,

                    "branch_services",

                    branchServiceId,

                    "سرویس شعبه"
                );


            ensureActiveNotDeleted(
                branchService,
                "سرویس شعبه"
            );


            if (
                branchService
                    .getString("branch_id") !==
                branchId
            ) {
                throw new BadRequestError(
                    "یکی از سرویس‌های انتخاب‌شده متعلق به شعبه موردنظر نیست."
                );
            }


            // =================================================================
            // اولویت مدت زمان:
            //
            // service_assignments.duration_override
            //                ↓
            // branch_services.duration
            // =================================================================

            let duration =
                serviceAssignment
                    .getInt(
                        "duration_override"
                    );


            if (
                duration <= 0
            ) {
                duration =
                    branchService
                        .getInt(
                            "duration"
                        );
            }


            if (
                duration <= 0
            ) {
                throw new BadRequestError(
                    "مدت زمان یکی از سرویس‌های انتخاب‌شده معتبر نیست."
                );
            }


            totalDuration +=
                duration;
        }


        // ====================================================================
        // Resource Weekly Availability
        //
        // open_time و close_time از نوع Text هستند.
        // فرمت:
        //
        // HH:mm
        //
        // ====================================================================

        const intervals =
            e.app.findRecordsByFilter(

                "resource_availability",

                `
                    resource_assignment_id = {:assignment}
                    &&
                    day_of_week = {:day}
                    &&
                    status = "active"
                `,

                "open_time",

                100,

                0,

                {
                    assignment:
                        resourceAssignmentId,

                    day:
                        dayOfWeek
                }
            );


        // ====================================================================
        // Resource در این روز برنامه کاری ندارد.
        // ====================================================================

        if (
            intervals.length === 0
        ) {

            return e.json(
                200,
                {
                    date:
                        requestedDate,

                    day_of_week:
                        dayOfWeek,

                    branch_id:
                        branchId,

                    resource_assignment_id:
                        resourceAssignmentId,

                    total_duration:
                        totalDuration,

                    slot_step:
                        5,

                    slots:
                        []
                }
            );
        }


        // ====================================================================
        // Slot Generation
        //
        // STEP_MINUTE فقط دقت زمان شروع Slot است.
        //
        // این مقدار به معنی Duration سرویس نیست.
        // ====================================================================

        const STEP_MINUTE =
            5;


        const slots =
            [];


        for (
            let i = 0;
            i < intervals.length;
            i++
        ) {

            const interval =
                intervals[i];


            const openMinute =
                timeToMinute(
                    interval
                        .getString(
                            "open_time"
                        )
                );


            const closeMinute =
                timeToMinute(
                    interval
                        .getString(
                            "close_time"
                        )
                );


            if (
                openMinute >=
                closeMinute
            ) {
                throw new BadRequestError(
                    "یکی از بازه‌های زمانی منبع معتبر نیست."
                );
            }


            for (
                let start =
                    openMinute;

                start + totalDuration <=
                    closeMinute;

                start +=
                    STEP_MINUTE
            ) {

                const end =
                    start +
                    totalDuration;


                slots.push({
                    start_minute:
                        start,

                    end_minute:
                        end,

                    start_time:
                        minuteToTime(
                            start
                        ),

                    end_time:
                        minuteToTime(
                            end
                        )
                });
            }
        }


        // ====================================================================
        // Response
        // ====================================================================

        return e.json(
            200,
            {
                date:
                    requestedDate,

                day_of_week:
                    dayOfWeek,

                branch_id:
                    branchId,

                resource_assignment_id:
                    resourceAssignmentId,

                total_duration:
                    totalDuration,

                slot_step:
                    STEP_MINUTE,

                slots:
                    slots
            }
        );
    },

    $apis.requireAuth(
        "users"
    )
);