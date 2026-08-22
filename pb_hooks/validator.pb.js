/// <reference path="../pb_data/types.d.ts" />

/**
 * Be Nobat - PocketBase Domain Validations
 * File: pb_hooks/validators.pb.js
 *
 * این فایل Validationهای Domain و Cross-Collection پروژه «به نوبت»
 * را در یک نقطه نگهداری می‌کند.
 *
 * نکته:
 * Unique Indexها، API Rules و Soft Delete Hookها موضوعات جداگانه هستند
 * و این فایل جایگزین آن‌ها نیست.
 */


/* ========================================================================
 * 01) SERVICE CATEGORY
 *
 * - Parent Category باید متعلق به همان Business باشد.
 * - Category نمی‌تواند Parent خودش باشد.
 * - درخت Category نباید Cycle داشته باشد.
 * ====================================================================== */

onRecordValidate((e) => {
    const businessId = e.record.getString("business_id");
    const parentId = e.record.getString("parent_id");

    // Root category
    if (!parentId) {
        return e.next();
    }

    // Cannot be its own parent
    if (parentId === e.record.id) {
        throw new BadRequestError(
            "A service category cannot be its own parent."
        );
    }

    const parent = $app.findRecordById(
        "service_category",
        parentId
    );

    // Parent must belong to same business
    if (
        parent.getString("business_id") !==
        businessId
    ) {
        throw new BadRequestError(
            "Parent category must belong to the same business."
        );
    }

    // ----------------------------------
    // Cycle Detection
    // ----------------------------------

    let current = parent;
    let depth = 0;

    while (
        current &&
        current.getString("parent_id")
    ) {
        depth++;

        // Safety guard
        if (depth > 100) {
            throw new BadRequestError(
                "Service category hierarchy is too deep or contains a cycle."
            );
        }

        const nextParentId =
            current.getString("parent_id");

        if (
            nextParentId === e.record.id
        ) {
            throw new BadRequestError(
                "Service category hierarchy cannot contain a cycle."
            );
        }

        current = $app.findRecordById(
            "service_category",
            nextParentId
        );
    }

    e.next();

}, "service_category");


/* ========================================================================
 * 02) SERVICES
 *
 * Service و Category باید متعلق به یک Business باشند.
 * ====================================================================== */

onRecordValidate((e) => {

    const businessId =
        e.record.getString("business_id");

    const categoryId =
        e.record.getString("category_id");

    if (!categoryId) {
        return e.next();
    }

    const category =
        $app.findRecordById(
            "service_category",
            categoryId
        );

    if (
        category.getString("business_id") !==
        businessId
    ) {
        throw new BadRequestError(
            "Service and category must belong to the same business."
        );
    }

    e.next();

}, "services");


/* ========================================================================
 * 03) BRANCH SERVICES
 *
 * - Branch و Service باید متعلق به یک Business باشند.
 * - Price نباید منفی باشد.
 * - Duration باید بزرگ‌تر از صفر باشد.
 * ====================================================================== */

onRecordValidate((e) => {

    const branchId =
        e.record.getString("branch_id");

    const serviceId =
        e.record.getString("service_id");

    const branch =
        $app.findRecordById(
            "branches",
            branchId
        );

    const service =
        $app.findRecordById(
            "services",
            serviceId
        );

    if (
        branch.getString("business_id") !==
        service.getString("business_id")
    ) {
        throw new BadRequestError(
            "Branch and service must belong to the same business."
        );
    }

    const price =
        e.record.getFloat("price");

    const duration =
        e.record.getInt("duration");

    if (price < 0) {
        throw new BadRequestError(
            "Branch service price cannot be negative."
        );
    }

    if (duration <= 0) {
        throw new BadRequestError(
            "Branch service duration must be greater than zero."
        );
    }

    e.next();

}, "branch_services");


/* ========================================================================
 * 04) RESOURCE ASSIGNMENTS
 *
 * start_date نباید بعد از end_date باشد.
 * ====================================================================== */

onRecordValidate((e) => {

    const startDate =
        e.record.getDateTime("start_date");

    const endDate =
        e.record.getDateTime("end_date");

    if (
        !startDate.isZero() &&
        !endDate.isZero() &&
        startDate.unix() > endDate.unix()
    ) {
        throw new BadRequestError(
            "Resource assignment start_date cannot be after end_date."
        );
    }

    e.next();

}, "resource_assignments");


/* ========================================================================
 * 05) SERVICE ASSIGNMENTS
 *
 * BranchService و ResourceAssignment باید متعلق به یک Branch باشند.
 *
 * مثال نامعتبر:
 *
 * Haircut @ Branch A
 *          ↓
 * Ali @ Branch B
 *
 * همچنین Overrideها نباید مقدار نامعتبر داشته باشند.
 * ====================================================================== */

onRecordValidate((e) => {

    const branchServiceId =
        e.record.getString(
            "branch_service_id"
        );

    const resourceAssignmentId =
        e.record.getString(
            "resource_assignment_id"
        );

    const branchService =
        $app.findRecordById(
            "branch_services",
            branchServiceId
        );

    const resourceAssignment =
        $app.findRecordById(
            "resource_assignments",
            resourceAssignmentId
        );

    const serviceBranchId =
        branchService.getString(
            "branch_id"
        );

    const resourceBranchId =
        resourceAssignment.getString(
            "branch_id"
        );

    if (
        serviceBranchId !==
        resourceBranchId
    ) {
        throw new BadRequestError(
            "Service and resource assignment must belong to the same branch."
        );
    }

    const durationOverride =
        e.record.getInt(
            "duration_override"
        );

    if (durationOverride < 0) {
        throw new BadRequestError(
            "duration_override cannot be negative."
        );
    }

    const priceOverride =
        e.record.getFloat(
            "price_override"
        );

    if (priceOverride < 0) {
        throw new BadRequestError(
            "price_override cannot be negative."
        );
    }

    e.next();

}, "service_assignments");


/* ========================================================================
 * 06) RESOURCE AVAILABILITY
 *
 * - day_of_week باید بین 0 تا 6 باشد.
 * - open_time باید قبل از close_time باشد.
 * - یک Resource نمی‌تواند در یک زمان در دو شعبه مختلف Available باشد.
 *
 * مثال:
 *
 * Ali @ Branch A
 * Saturday 10:00 - 14:00
 *
 * Ali @ Branch B
 * Saturday 13:00 - 18:00
 *
 * INVALID
 * ====================================================================== */

onRecordValidate((e) => {

    const assignmentId =
        e.record.getString(
            "resource_assignment_id"
        );

    const day =
        e.record.getInt(
            "day_of_week"
        );

    if (
        day < 0 ||
        day > 6
    ) {
        throw new BadRequestError(
            "day_of_week must be between 0 and 6."
        );
    }

    const openTime =
        e.record.getDateTime(
            "open_time"
        );

    const closeTime =
        e.record.getDateTime(
            "close_time"
        );

   

    /* if (
        openTime.unix() >=
        closeTime.unix()
    ) {
        throw new BadRequestError(
            "open_time must be before close_time."
        );
    } */

    // ----------------------------------
    // Current Assignment
    // ----------------------------------

    const currentAssignment =
        $app.findRecordById(
            "resource_assignments",
            assignmentId
        );

    const resourceId =
        currentAssignment.getString(
            "resource_id"
        );

    // ----------------------------------
    // Find all assignments belonging
    // to the same Resource
    // ----------------------------------

    const assignments =
        $app.findRecordsByFilter(
            "resource_assignments",
            "resource_id = {:resource}",
            "",
            0,
            0,
            {
                resource: resourceId
            }
        );

    for (
        let i = 0;
        i < assignments.length;
        i++
    ) {

        const assignment =
            assignments[i];

        // Find availability rows of
        // this assignment on same weekday

        const existingRows =
            $app.findRecordsByFilter(
                "resource_availability",
                "resource_assignment_id = {:assignment} && day_of_week = {:day}",
                "",
                0,
                0,
                {
                    assignment: assignment.id,
                    day: day
                }
            );

        for (
            let j = 0;
            j < existingRows.length;
            j++
        ) {

            const existing =
                existingRows[j];

            // Ignore itself during update
            if (
                existing.id ===
                e.record.id
            ) {
                continue;
            }

            const existingOpen =
                existing.getDateTime(
                    "open_time"
                );

            const existingClose =
                existing.getDateTime(
                    "close_time"
                );

            // ----------------------------------
            // Overlap Formula
            //
            // newStart < existingEnd
            // &&
            // newEnd > existingStart
            // ----------------------------------

            const overlaps =
                openTime.unix() <
                    existingClose.unix()
                &&
                closeTime.unix() >
                    existingOpen.unix();

            if (overlaps) {
                throw new BadRequestError(
                    "Resource availability overlaps with another availability interval for this resource."
                );
            }
        }
    }

    e.next();

}, "resource_availability");


/* ========================================================================
 * 07) RESOURCE EXCEPTIONS
 *
 * - start_datetime باید قبل از end_datetime باشد.
 *
 * - اگر resource_assignment_id مقدار داشته باشد:
 *
 *      ResourceAssignment.branch_id
 *      ==
 *      resource_exception.branch_id
 *
 * - اگر ResourceAssignment تاریخ شروع/پایان دارد،
 *   Exception باید داخل همان محدوده باشد.
 *
 * اگر resource_assignment_id خالی باشد،
 * Exception مربوط به کل Branch در نظر گرفته می‌شود.
 * ====================================================================== */

onRecordValidate((e) => {

    const branchId =
        e.record.getString(
            "branch_id"
        );

    const assignmentId =
        e.record.getString(
            "resource_assignment_id"
        );

    const startDateTime =
        e.record.getDateTime(
            "start_datetime"
        );

    const endDateTime =
        e.record.getDateTime(
            "end_datetime"
        );

    if (
        startDateTime.isZero() ||
        endDateTime.isZero()
    ) {
        throw new BadRequestError(
            "start_datetime and end_datetime are required."
        );
    }

    if (
        startDateTime.unix() >=
        endDateTime.unix()
    ) {
        throw new BadRequestError(
            "start_datetime must be before end_datetime."
        );
    }

    // Branch-wide exception
    if (!assignmentId) {
        return e.next();
    }

    const assignment =
        $app.findRecordById(
            "resource_assignments",
            assignmentId
        );

    // ----------------------------------
    // Branch validation
    // ----------------------------------

    if (
        assignment.getString(
            "branch_id"
        ) !== branchId
    ) {
        throw new BadRequestError(
            "Resource assignment must belong to the selected branch."
        );
    }

    // ----------------------------------
    // Assignment date range
    // ----------------------------------

    const assignmentStart =
        assignment.getDateTime(
            "start_date"
        );

    const assignmentEnd =
        assignment.getDateTime(
            "end_date"
        );

    if (
        !assignmentStart.isZero() &&
        startDateTime.unix() <
            assignmentStart.unix()
    ) {
        throw new BadRequestError(
            "Resource exception cannot start before the resource assignment."
        );
    }

    if (
        !assignmentEnd.isZero() &&
        endDateTime.unix() >
            assignmentEnd.unix()
    ) {
        throw new BadRequestError(
            "Resource exception cannot end after the resource assignment."
        );
    }

    e.next();

}, "resource_exceptions");


/* ========================================================================
 * 08) ROLE PERMISSIONS
 *
 * Role و Permission باید Scope یکسان داشته باشند.
 *
 * system → system
 * branch → branch
 * ====================================================================== */

onRecordValidate((e) => {

    const role =
        $app.findRecordById(
            "roles",
            e.record.getString(
                "role_id"
            )
        );

    const permission =
        $app.findRecordById(
            "permissions",
            e.record.getString(
                "permission_id"
            )
        );

    if (
        role.getString("scope") !==
        permission.getString("scope")
    ) {
        throw new BadRequestError(
            "Role and permission scopes must match."
        );
    }

    e.next();

}, "role_permissions");


/* ========================================================================
 * 09) USER SYSTEM ROLES
 *
 * فقط Role با scope = system
 * می‌تواند داخل user_system_roles قرار بگیرد.
 * ====================================================================== */

onRecordValidate((e) => {

    const role =
        $app.findRecordById(
            "roles",
            e.record.getString(
                "role_id"
            )
        );

    if (
        role.getString("scope") !==
        "system"
    ) {
        throw new BadRequestError(
            "Only system-scoped roles can be assigned in user_system_roles."
        );
    }

    const assignedAt =
        e.record.getDateTime(
            "assigned_at"
        );

    const expiresAt =
        e.record.getDateTime(
            "expires_at"
        );

    if (
        !assignedAt.isZero() &&
        !expiresAt.isZero() &&
        assignedAt.unix() >=
            expiresAt.unix()
    ) {
        throw new BadRequestError(
            "expires_at must be after assigned_at."
        );
    }

    e.next();

}, "user_system_roles");


/* ========================================================================
 * 10) BRANCH MEMBERSHIP
 *
 * تمام Roleهایی که از طریق BranchMembership
 * اختصاص داده می‌شوند باید scope=branch باشند.
 * ====================================================================== */

onRecordValidate((e) => {

    const roleIds =
        e.record.getStringSlice(
            "roles"
        );

    for (
        let i = 0;
        i < roleIds.length;
        i++
    ) {

        const role =
            $app.findRecordById(
                "roles",
                roleIds[i]
            );

        if (
            role.getString("scope") !==
            "branch"
        ) {
            throw new BadRequestError(
                "Only branch-scoped roles can be assigned through branch_membership."
            );
        }
    }

    e.next();

}, "branch_membership");


/* ========================================================================
 * 11) APPOINTMENT
 *
 * - start باید قبل از end باشد.
 * - قیمت‌ها نباید منفی باشند.
 * - discount_amount نمی‌تواند از total_price بیشتر باشد.
 * ====================================================================== */

onRecordValidate((e) => {

    const start =
        e.record.getDateTime(
            "start"
        );

    const end =
        e.record.getDateTime(
            "end"
        );

    if (
        start.isZero() ||
        end.isZero()
    ) {
        throw new BadRequestError(
            "Appointment start and end are required."
        );
    }

    if (
        start.unix() >=
        end.unix()
    ) {
        throw new BadRequestError(
            "Appointment start must be before end."
        );
    }

    const totalPrice =
        e.record.getFloat(
            "total_price"
        );

    const discountAmount =
        e.record.getFloat(
            "discount_amount"
        );

    const finalPrice =
        e.record.getFloat(
            "final_price"
        );

    if (
        totalPrice < 0 ||
        discountAmount < 0 ||
        finalPrice < 0
    ) {
        throw new BadRequestError(
            "Appointment prices cannot be negative."
        );
    }

    if (
        discountAmount >
        totalPrice
    ) {
        throw new BadRequestError(
            "discount_amount cannot exceed total_price."
        );
    }

    e.next();

}, "appointment");


/* ========================================================================
 * 12) APPOINTMENT SERVICES
 *
 * سه Branch باید یکی باشند:
 *
 * Appointment.branch
 *
 * BranchService.branch
 *
 * ResourceAssignment.branch
 *
 * همچنین:
 *
 * - start_at داخل محدوده Appointment باشد.
 * - duration > 0
 * - price >= 0
 * ====================================================================== */

onRecordValidate((e) => {

    const appointment =
        $app.findRecordById(
            "appointment",
            e.record.getString(
                "appointment_id"
            )
        );

    const serviceAssignment =
        $app.findRecordById(
            "service_assignments",
            e.record.getString(
                "service_assignment_id"
            )
        );

    const branchService =
        $app.findRecordById(
            "branch_services",
            serviceAssignment.getString(
                "branch_service_id"
            )
        );

    const resourceAssignment =
        $app.findRecordById(
            "resource_assignments",
            serviceAssignment.getString(
                "resource_assignment_id"
            )
        );

    const appointmentBranch =
        appointment.getString(
            "branch_id"
        );

    const branchServiceBranch =
        branchService.getString(
            "branch_id"
        );

    const resourceBranch =
        resourceAssignment.getString(
            "branch_id"
        );

    if (
        appointmentBranch !==
            branchServiceBranch
        ||
        appointmentBranch !==
            resourceBranch
    ) {
        throw new BadRequestError(
            "Appointment, service and resource must all belong to the same branch."
        );
    }

    const startAt =
        e.record.getDateTime(
            "start_at"
        );

    const appointmentStart =
        appointment.getDateTime(
            "start"
        );

    const appointmentEnd =
        appointment.getDateTime(
            "end"
        );

    if (
        startAt.isZero()
    ) {
        throw new BadRequestError(
            "Appointment service start_at is required."
        );
    }

    if (
        startAt.unix() <
            appointmentStart.unix()
        ||
        startAt.unix() >=
            appointmentEnd.unix()
    ) {
        throw new BadRequestError(
            "Appointment service start_at must be inside the appointment time range."
        );
    }

    const duration =
        e.record.getInt(
            "duration"
        );

    if (
        duration <= 0
    ) {
        throw new BadRequestError(
            "Appointment service duration must be greater than zero."
        );
    }

    const price =
        e.record.getFloat(
            "price"
        );

    if (
        price < 0
    ) {
        throw new BadRequestError(
            "Appointment service price cannot be negative."
        );
    }

    e.next();

}, "appointment_services");


/* ========================================================================
 * 13) REVIEWS - DOMAIN VALIDATION
 *
 * User فقط می‌تواند به AppointmentServiceای امتیاز بدهد
 * که واقعاً متعلق به Appointment خودش بوده باشد.
 *
 * Appointment باید Completed باشد.
 *
 * Rating بین 1 تا 5.
 *
 * همچنین پیشنهاد می‌شود Unique Index داشته باشیم:
 *
 * UNIQUE(user_id, appointment_service_id)
 * ====================================================================== */

onRecordValidate((e) => {

    const appointmentService =
        $app.findRecordById(
            "appointment_services",
            e.record.getString(
                "appointment_service_id"
            )
        );

    const appointment =
        $app.findRecordById(
            "appointment",
            appointmentService.getString(
                "appointment_id"
            )
        );

    if (
        appointment.getString(
            "client_user_id"
        ) !==
        e.record.getString(
            "user_id"
        )
    ) {
        throw new BadRequestError(
            "The user did not receive this appointment service."
        );
    }

    if (
        appointment.getString(
            "status"
        ) !==
        "completed"
    ) {
        throw new BadRequestError(
            "Only completed appointment services can be reviewed."
        );
    }

    const rating =
        e.record.getInt(
            "rating"
        );

    if (
        rating < 1 ||
        rating > 5
    ) {
        throw new BadRequestError(
            "Review rating must be between 1 and 5."
        );
    }

    e.next();

}, "reviews");


/* ========================================================================
 * 14) REVIEWS - CREATE REQUEST
 *
 * User معمولی فقط می‌تواند Review با user_id خودش بسازد.
 * ====================================================================== */

onRecordCreateRequest((e) => {

    if (
        e.hasSuperuserAuth()
    ) {
        return e.next();
    }

    if (!e.auth) {
        throw new BadRequestError(
            "Authentication is required to create a review."
        );
    }

    if (
        e.record.getString(
            "user_id"
        ) !==
        e.auth.id
    ) {
        throw new BadRequestError(
            "You can only create reviews for your own user account."
        );
    }

    e.next();

}, "reviews");


/* ========================================================================
 * 15) REVIEWS - UPDATE REQUEST
 *
 * User فقط Review خودش را ویرایش می‌کند.
 *
 * user_id و appointment_service_id
 * بعد از ایجاد قابل تغییر نیستند.
 * ====================================================================== */

onRecordUpdateRequest((e) => {

    if (
        e.hasSuperuserAuth()
    ) {
        return e.next();
    }

    if (!e.auth) {
        throw new BadRequestError(
            "Authentication is required to update a review."
        );
    }

    if (
        e.record.getString(
            "user_id"
        ) !==
        e.auth.id
    ) {
        throw new BadRequestError(
            "You can only update your own review."
        );
    }

    const original =
        e.record.original();

    if (
        original.getString(
            "user_id"
        ) !==
        e.record.getString(
            "user_id"
        )
    ) {
        throw new BadRequestError(
            "Review user_id cannot be changed."
        );
    }

    if (
        original.getString(
            "appointment_service_id"
        ) !==
        e.record.getString(
            "appointment_service_id"
        )
    ) {
        throw new BadRequestError(
            "Review appointment_service_id cannot be changed."
        );
    }

    e.next();

}, "reviews");


/* ========================================================================
 * 16) FAVORITES
 *
 * Favorite باید دقیقاً یکی از این دو Target را داشته باشد:
 *
 * business_id
 *
 * XOR
 *
 * resource_id
 *
 * یعنی:
 *
 * Business فقط
 * یا
 * Resource فقط
 *
 * نه هر دو
 * و نه هیچ‌کدام.
 * ====================================================================== */

onRecordValidate((e) => {

    const businessId =
        e.record.getString(
            "business_id"
        );

    const resourceId =
        e.record.getString(
            "resource_id"
        );

    const hasBusiness =
        businessId !== "";

    const hasResource =
        resourceId !== "";

    // XOR check
    if (
        hasBusiness ===
        hasResource
    ) {
        throw new BadRequestError(
            "Favorite must target exactly one of business_id or resource_id."
        );
    }

    e.next();

}, "favorites");


/* ========================================================================
 * 17) FAVORITES - CREATE REQUEST
 *
 * User فقط برای خودش Favorite ایجاد می‌کند.
 * ====================================================================== */

onRecordCreateRequest((e) => {

    if (
        e.hasSuperuserAuth()
    ) {
        return e.next();
    }

    if (!e.auth) {
        throw new BadRequestError(
            "Authentication is required to create a favorite."
        );
    }

    if (
        e.record.getString(
            "user_id"
        ) !==
        e.auth.id
    ) {
        throw new BadRequestError(
            "You can only create favorites for your own user account."
        );
    }

    e.next();

}, "favorites");


/* ========================================================================
 * 18) FAVORITES - UPDATE REQUEST
 * ====================================================================== */

onRecordUpdateRequest((e) => {

    if (
        e.hasSuperuserAuth()
    ) {
        return e.next();
    }

    if (!e.auth) {
        throw new BadRequestError(
            "Authentication is required to update a favorite."
        );
    }

    if (
        e.record.getString(
            "user_id"
        ) !==
        e.auth.id
    ) {
        throw new BadRequestError(
            "You can only update your own favorites."
        );
    }

    const original =
        e.record.original();

    if (
        original.getString(
            "user_id"
        ) !==
        e.record.getString(
            "user_id"
        )
    ) {
        throw new BadRequestError(
            "Favorite user_id cannot be changed."
        );
    }

    e.next();

}, "favorites");


/* ========================================================================
 * 19) DISCOUNTS
 *
 * - valid_from <= valid_until
 * - value >= 0
 * - min_order_amount >= 0
 * - max_uses >= 0
 *
 * تمام Serviceهای applicable_services
 * باید متعلق به همان Business باشند.
 * ====================================================================== */

onRecordValidate((e) => {

    const businessId =
        e.record.getString(
            "business_id"
        );

    const validFrom =
        e.record.getDateTime(
            "valid_from"
        );

    const validUntil =
        e.record.getDateTime(
            "valid_until"
        );

    if (
        !validFrom.isZero() &&
        !validUntil.isZero() &&
        validFrom.unix() >
            validUntil.unix()
    ) {
        throw new BadRequestError(
            "Discount valid_from cannot be after valid_until."
        );
    }

    const value =
        e.record.getFloat(
            "value"
        );

    if (
        value < 0
    ) {
        throw new BadRequestError(
            "Discount value cannot be negative."
        );
    }

    const minOrderAmount =
        e.record.getFloat(
            "min_order_amount"
        );

    if (
        minOrderAmount < 0
    ) {
        throw new BadRequestError(
            "Discount min_order_amount cannot be negative."
        );
    }

    const maxUses =
        e.record.getInt(
            "max_uses"
        );

    if (
        maxUses < 0
    ) {
        throw new BadRequestError(
            "Discount max_uses cannot be negative."
        );
    }

    const serviceIds =
        e.record.getStringSlice(
            "applicable_services"
        );

    for (
        let i = 0;
        i < serviceIds.length;
        i++
    ) {

        const service =
            $app.findRecordById(
                "services",
                serviceIds[i]
            );

        if (
            service.getString(
                "business_id"
            ) !==
            businessId
        ) {
            throw new BadRequestError(
                "All applicable discount services must belong to the same business."
            );
        }
    }

    e.next();

}, "discounts");


/* ========================================================================
 * 20) REPUTATION EVENTS
 *
 * اگر appointment_id مقدار داشته باشد،
 * business_id باید همان Business نوبت باشد.
 *
 * subject_user_id:
 * کاربری که Reputation او تغییر کرده.
 *
 * source_user_id:
 * کسی که باعث/ثبت‌کننده رویداد بوده.
 *
 * source_user_id می‌تواند خالی باشد؛
 * در این حالت Event توسط سیستم تولید شده.
 * ====================================================================== */

onRecordValidate((e) => {

    const appointmentId =
        e.record.getString(
            "appointment_id"
        );

    const businessId =
        e.record.getString(
            "business_id"
        );

    // Reputation event not linked
    // to an appointment
    if (!appointmentId) {
        return e.next();
    }

    if (!businessId) {
        throw new BadRequestError(
            "business_id is required for appointment-based reputation events."
        );
    }

    const appointment =
        $app.findRecordById(
            "appointment",
            appointmentId
        );

    const branch =
        $app.findRecordById(
            "branches",
            appointment.getString(
                "branch_id"
            )
        );

    if (
        branch.getString(
            "business_id"
        ) !==
        businessId
    ) {
        throw new BadRequestError(
            "Reputation event business must match the appointment business."
        );
    }

    e.next();

}, "reputation_events");


/* ========================================================================
 * END OF VALIDATORS
 * ====================================================================== */