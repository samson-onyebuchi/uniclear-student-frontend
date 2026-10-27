/* =========================================================
   UNICLEAR STUDENT CLEARANCE PORTAL
   STUDENT CLEARANCE JAVASCRIPT
   File: js/student-clearance.js

   FEATURES:
   1. Restore the logged-in student session.
   2. Display student information.
   3. Load the student's clearance record.
   4. Display all seven official clearance stages.
   5. Calculate clearance progress and summary statistics.
   6. Display stage approval, review, and rejection statuses.
   7. Display rejection reasons where provided by the API.
   8. Refresh clearance information.
   9. Create a clearance record when one does not exist.
  10. Support sidebar navigation on mobile devices.
  11. Handle API errors and empty responses gracefully.

   BACKEND:
   https://uniclear-student-platform.vercel.app

   IMPORTANT:
   This script does not use token authentication.
   Verify the exact response fields against your backend.
========================================================= */

"use strict";


/* =========================================================
   1. CONFIGURATION
========================================================= */

const CLEARANCE_API_BASE_URL =
    "https://uniclear-student-platform.vercel.app";

const CLEARANCE_VIEW_ENDPOINT =
    "/api/v1/clearance/view";

const CLEARANCE_CREATE_ENDPOINT =
    "/api/v1/clearance/create";


/* =========================================================
   2. OFFICIAL CLEARANCE STAGES
========================================================= */

const CLEARANCE_STAGES = [
    {
        key: "finance",
        title: "Finance Clearance",
        description:
            "Confirm that all required university financial obligations have been settled.",
        icon: "fa-money-bill-wave"
    },
    {
        key: "department",
        title: "Department Clearance",
        description:
            "Obtain clearance from your academic department.",
        icon: "fa-building"
    },
    {
        key: "faculty",
        title: "Faculty Clearance",
        description:
            "Complete the clearance requirements of your faculty.",
        icon: "fa-university"
    },
    {
        key: "library",
        title: "Library Clearance",
        description:
            "Confirm that library materials and outstanding obligations have been resolved.",
        icon: "fa-book"
    },
    {
        key: "health",
        title: "Health Clearance",
        description:
            "Complete the required university health clearance process.",
        icon: "fa-heartbeat"
    },
    {
        key: "student_affairs",
        title: "Student Affairs Clearance",
        description:
            "Complete the clearance requirements handled by Student Affairs.",
        icon: "fa-users"
    },
    {
        key: "final",
        title: "Final Clearance",
        description:
            "Complete the final review and confirmation of your university clearance.",
        icon: "fa-graduation-cap"
    }
];


/* =========================================================
   3. DOM HELPERS
========================================================= */

function clearanceGetElement(id) {
    return document.getElementById(id);
}


function clearanceSetText(id, value) {
    const element = clearanceGetElement(id);

    if (!element) {
        return;
    }

    element.textContent =
        value === undefined || value === null || value === ""
            ? ""
            : String(value);
}


function clearanceShowElement(id, show = true) {
    const element = clearanceGetElement(id);

    if (element) {
        element.hidden = !show;
    }
}


function clearanceSetHTML(id, html) {
    const element = clearanceGetElement(id);

    if (element) {
        element.innerHTML = html;
    }
}


function clearanceEscapeHTML(value) {
    return String(value ?? "").replace(/[&<>"']/g, character => {
        const entities = {
            "&": "&amp;",
            "<": "&lt;",
            ">": "&gt;",
            '"': "&quot;",
            "'": "&#39;"
        };

        return entities[character];
    });
}


function clearanceGetInitials(name) {
    const cleanedName = String(name || "").trim();

    if (!cleanedName) {
        return "S";
    }

    const parts = cleanedName.split(/\s+/);

    if (parts.length === 1) {
        return parts[0].charAt(0).toUpperCase();
    }

    return (
        parts[0].charAt(0) +
        parts[parts.length - 1].charAt(0)
    ).toUpperCase();
}


/* =========================================================
   4. STUDENT SESSION
========================================================= */

function clearanceReadStoredJSON(key) {
    const stores = [sessionStorage, localStorage];

    for (const store of stores) {
        try {
            const value = store.getItem(key);

            if (value) {
                const parsed = JSON.parse(value);

                if (parsed && typeof parsed === "object") {
                    return parsed;
                }
            }
        } catch (error) {
            console.warn(
                `Unable to read stored session key: ${key}`,
                error
            );
        }
    }

    return null;
}


function clearanceReadStoredString(key) {
    const stores = [sessionStorage, localStorage];

    for (const store of stores) {
        try {
            const value = store.getItem(key);

            if (value && value !== "undefined" && value !== "null") {
                return value;
            }
        } catch (error) {
            console.warn(
                `Unable to read stored value: ${key}`,
                error
            );
        }
    }

    return "";
}


function clearanceGetStudentSession() {
    let student = null;

    const possibleStudentKeys = [
        "uniclear_student",
        "uniclear_student_data",
        "student_data",
        "student"
    ];

    for (const key of possibleStudentKeys) {
        student = clearanceReadStoredJSON(key);

        if (student) {
            break;
        }
    }

    const storedRole = clearanceReadStoredString(
        "uniclear_user_role"
    );

    const studentRole = String(
        student?.role || storedRole || ""
    ).toLowerCase();

    if (
        studentRole &&
        !studentRole.includes("student")
    ) {
        return {
            student: null,
            regNo: ""
        };
    }

    const regNo =
        student?.reg_no ||
        student?.registration_number ||
        student?.registrationNumber ||
        student?.student?.reg_no ||
        clearanceReadStoredString("uniclear_reg_no");

    return {
        student,
        regNo: String(regNo || "").trim()
    };
}


function clearanceGetStudentName(student) {
    if (!student) {
        return "Student";
    }

    if (student.full_name || student.name) {
        return String(student.full_name || student.name);
    }

    const parts = [
        student.surname,
        student.first_name,
        student.other_names
    ].filter(Boolean);

    return parts.join(" ").trim() || "Student";
}


function clearanceDisplayStudent(student, regNo) {
    const fullName = clearanceGetStudentName(student);
    const initials = clearanceGetInitials(fullName);

    clearanceSetText("sidebarStudentName", fullName);
    clearanceSetText("sidebarStudentRegNo", regNo || "Student");

    clearanceSetText("topbarStudentName", fullName);

    clearanceSetText("sidebarStudentAvatar", initials);
    clearanceSetText("topbarAvatar", initials);

    clearanceSetText(
        "currentDate",
        new Intl.DateTimeFormat("en-NG", {
            day: "numeric",
            month: "short",
            year: "numeric"
        }).format(new Date())
    );

    clearanceSetText(
        "footerYear",
        new Date().getFullYear()
    );
}


/* =========================================================
   5. API RESPONSE HELPERS
========================================================= */

async function clearanceParseResponse(response) {
    const rawText = await response.text();

    let result = {};

    if (rawText) {
        try {
            result = JSON.parse(rawText);
        } catch (error) {
            result = {
                message: rawText
            };
        }
    }

    if (!response.ok) {
        const message =
            result.message ||
            result.error ||
            `Request failed with HTTP ${response.status}.`;

        throw new Error(message);
    }

    if (
        result &&
        typeof result === "object" &&
        result.success === false
    ) {
        throw new Error(
            result.message ||
            result.error ||
            "The request could not be completed."
        );
    }

    return result;
}


async function clearanceAPIRequest(endpoint, options = {}) {
    const response = await fetch(
        `${CLEARANCE_API_BASE_URL}${endpoint}`,
        {
            ...options,
            headers: {
                Accept: "application/json",
                ...(options.headers || {})
            }
        }
    );

    return clearanceParseResponse(response);
}


function clearanceExtractPayload(result) {
    let current = result;

    /*
       Unwrap common API response structures.
       Avoid endlessly unwrapping nested objects.
    */

    for (let i = 0; i < 5; i++) {
        if (!current || typeof current !== "object") {
            break;
        }

        if (Array.isArray(current)) {
            break;
        }

        if (
            current.clearance &&
            typeof current.clearance === "object"
        ) {
            current = current.clearance;
            continue;
        }

        if (
            current.data &&
            typeof current.data === "object"
        ) {
            current = current.data;
            continue;
        }

        if (
            current.result &&
            typeof current.result === "object"
        ) {
            current = current.result;
            continue;
        }

        break;
    }

    return current;
}


function clearanceIsRecordObject(value) {
    return Boolean(
        value &&
        typeof value === "object" &&
        !Array.isArray(value)
    );
}


function clearanceHasRecord(payload) {
    if (!clearanceIsRecordObject(payload)) {
        return false;
    }

    const recordIndicators = [
        "current_stage",
        "currentStage",
        "clearance_status",
        "clearanceStatus",
        "overall_status",
        "overallStatus",
        "stages",
        "finance",
        "department",
        "faculty",
        "library",
        "health",
        "student_affairs",
        "final"
    ];

    return recordIndicators.some(key =>
        Object.prototype.hasOwnProperty.call(payload, key)
    );
}


/* =========================================================
   6. LOAD CLEARANCE RECORD
========================================================= */

let clearanceStudent = null;
let clearanceRegNo = "";
let clearanceRecord = null;

let clearanceIsLoading = false;
let clearanceIsCreating = false;


async function clearanceFetchRecord() {
    if (!clearanceRegNo) {
        throw new Error(
            "Your registration number could not be found. Please log in again."
        );
    }

    const result = await clearanceAPIRequest(
        CLEARANCE_VIEW_ENDPOINT,
        {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                reg_no: clearanceRegNo
            })
        }
    );

    return result;
}


/* =========================================================
   7. NORMALIZE STATUS VALUES
========================================================= */

function clearanceNormalizeStatus(value) {
    if (value === undefined || value === null || value === "") {
        return "pending";
    }

    const normalized = String(value)
        .trim()
        .toLowerCase()
        .replace(/[\s-]+/g, "_");

    const aliases = {
        approved: "approved",
        complete: "approved",
        completed: "approved",
        cleared: "approved",
        accepted: "approved",

        rejected: "rejected",
        declined: "rejected",
        denied: "rejected",

        under_review: "under_review",
        in_review: "under_review",
        reviewing: "under_review",
        review: "under_review",

        awaiting_submission: "awaiting_submission",
        awaiting_document: "awaiting_submission",
        awaiting_documents: "awaiting_submission",
        not_submitted: "awaiting_submission",

        pending: "pending",
        in_progress: "in_progress",
        processing: "in_progress",
        submitted: "under_review"
    };

    return aliases[normalized] || normalized;
}


function clearanceStatusLabel(status) {
    const labels = {
        approved: "Approved",
        rejected: "Rejected",
        under_review: "Under Review",
        awaiting_submission: "Awaiting Submission",
        pending: "Pending",
        in_progress: "In Progress",
        unknown: "Unknown"
    };

    return labels[status] ||
        String(status || "Pending")
            .replace(/[_-]+/g, " ")
            .replace(/\b\w/g, character => character.toUpperCase());
}


function clearanceStatusIcon(status) {
    const icons = {
        approved: "fa-check-circle",
        rejected: "fa-times-circle",
        under_review: "fa-eye",
        awaiting_submission: "fa-file-upload",
        pending: "fa-clock",
        in_progress: "fa-spinner"
    };

    return icons[status] || "fa-circle";
}


function clearanceStatusClass(status) {
    const classes = {
        approved: "approved",
        rejected: "rejected",
        under_review: "under-review",
        awaiting_submission: "awaiting-submission",
        pending: "pending",
        in_progress: "in-progress"
    };

    return classes[status] || "pending";
}


/* =========================================================
   8. EXTRACT INDIVIDUAL STAGE INFORMATION
========================================================= */

function clearanceGetStageSource(record, stageKey) {
    if (!clearanceIsRecordObject(record)) {
        return null;
    }

    const stageContainers = [
        record.stages,
        record.clearance_stages,
        record.clearanceStages,
        record.departments,
        record.stage_statuses,
        record.stageStatuses
    ];

    for (const container of stageContainers) {
        if (!clearanceIsRecordObject(container)) {
            continue;
        }

        if (
            Object.prototype.hasOwnProperty.call(
                container,
                stageKey
            )
        ) {
            return container[stageKey];
        }
    }

    if (
        Object.prototype.hasOwnProperty.call(record, stageKey)
    ) {
        return record[stageKey];
    }

    return null;
}


function clearanceGetStageStatus(stageData) {
    if (typeof stageData === "string") {
        return clearanceNormalizeStatus(stageData);
    }

    if (typeof stageData === "boolean") {
        return stageData ? "approved" : "pending";
    }

    if (!clearanceIsRecordObject(stageData)) {
        return "pending";
    }

    const statusValue =
        stageData.status ??
        stageData.clearance_status ??
        stageData.clearanceStatus ??
        stageData.stage_status ??
        stageData.stageStatus ??
        stageData.state;

    if (statusValue !== undefined && statusValue !== null) {
        return clearanceNormalizeStatus(statusValue);
    }

    if (stageData.approved === true || stageData.is_approved === true) {
        return "approved";
    }

    if (stageData.rejected === true || stageData.is_rejected === true) {
        return "rejected";
    }

    return "pending";
}


function clearanceGetStageRejectionReason(stageData) {
    if (!clearanceIsRecordObject(stageData)) {
        return "";
    }

    return String(
        stageData.rejection_reason ||
        stageData.rejectionReason ||
        stageData.reason_for_rejection ||
        stageData.reasonForRejection ||
        stageData.review_comment ||
        stageData.reviewComment ||
        stageData.comment ||
        stageData.remarks ||
        ""
    ).trim();
}


function clearanceGetStageDate(stageData) {
    if (!clearanceIsRecordObject(stageData)) {
        return "";
    }

    return (
        stageData.reviewed_at ||
        stageData.reviewedAt ||
        stageData.approved_at ||
        stageData.approvedAt ||
        stageData.updated_at ||
        stageData.updatedAt ||
        stageData.submitted_at ||
        stageData.submittedAt ||
        ""
    );
}


function clearanceFormatDate(value) {
    if (!value) {
        return "";
    }

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
        return "";
    }

    return new Intl.DateTimeFormat("en-NG", {
        day: "numeric",
        month: "short",
        year: "numeric"
    }).format(date);
}


function clearanceGetStageReviewer(stageData) {
    if (!clearanceIsRecordObject(stageData)) {
        return "";
    }

    return String(
        stageData.reviewed_by ||
        stageData.reviewedBy ||
        stageData.reviewer ||
        stageData.staff_name ||
        stageData.staffName ||
        stageData.reviewer_id ||
        stageData.reviewerId ||
        ""
    ).trim();
}


function clearanceBuildStageData(record) {
    return CLEARANCE_STAGES.map((stage, index) => {
        const source = clearanceGetStageSource(
            record,
            stage.key
        );

        const status = clearanceGetStageStatus(source);

        return {
            ...stage,
            index: index + 1,
            source,
            status,
            statusLabel: clearanceStatusLabel(status),
            rejectionReason:
                clearanceGetStageRejectionReason(source),
            date: clearanceGetStageDate(source),
            reviewer: clearanceGetStageReviewer(source)
        };
    });
}


/* =========================================================
   9. OVERALL STATUS AND PROGRESS
========================================================= */

function clearanceGetOverallStatus(record, stages) {
    if (clearanceIsRecordObject(record)) {
        const overall =
            record.clearance_status ||
            record.clearanceStatus ||
            record.overall_status ||
            record.overallStatus ||
            record.status;

        if (overall) {
            return clearanceNormalizeStatus(overall);
        }
    }

    if (
        stages.length > 0 &&
        stages.every(stage => stage.status === "approved")
    ) {
        return "completed";
    }

    if (stages.some(stage => stage.status === "rejected")) {
        return "rejected";
    }

    if (stages.some(stage => stage.status === "under_review")) {
        return "under_review";
    }

    if (stages.some(stage => stage.status === "approved")) {
        return "in_progress";
    }

    return "in_progress";
}


function clearanceOverallStatusLabel(status) {
    const labels = {
        completed: "Completed",
        approved: "Completed",
        in_progress: "In Progress",
        pending: "Pending",
        under_review: "Under Review",
        rejected: "Needs Attention",
        awaiting_submission: "Awaiting Submission"
    };

    return labels[status] || clearanceStatusLabel(status);
}


function clearanceCalculateStatistics(stages) {
    const approved = stages.filter(
        stage => stage.status === "approved"
    ).length;

    const rejected = stages.filter(
        stage => stage.status === "rejected"
    ).length;

    const awaiting = stages.filter(
        stage =>
            stage.status === "awaiting_submission" ||
            stage.status === "pending"
    ).length;

    const underReview = stages.filter(
        stage =>
            stage.status === "under_review" ||
            stage.status === "in_progress"
    ).length;

    const percentage = stages.length
        ? Math.round((approved / stages.length) * 100)
        : 0;

    return {
        total: stages.length,
        approved,
        rejected,
        awaiting,
        underReview,
        percentage
    };
}


function clearanceRenderSummary(record, stages) {
    const stats = clearanceCalculateStatistics(stages);

    const overallStatus = clearanceGetOverallStatus(
        record,
        stages
    );

    clearanceSetText("totalStages", stats.total);
    clearanceSetText("approvedStages", stats.approved);

    clearanceSetText(
        "pendingStages",
        stats.awaiting + stats.underReview
    );

    clearanceSetText("rejectedStages", stats.rejected);

    clearanceSetText(
        "clearanceProgressPercentage",
        `${stats.percentage}%`
    );

    clearanceSetText(
        "progressStageCount",
        `${stats.approved} of ${stats.total} stages`
    );

    clearanceSetText(
        "stageCountBadge",
        `${stats.total} stages`
    );

    const progressFill = clearanceGetElement(
        "clearanceProgressFill"
    );

    if (progressFill) {
        progressFill.style.width = `${stats.percentage}%`;
    }

    const progressTrack = clearanceGetElement(
        "clearanceProgressTrack"
    );

    if (progressTrack) {
        progressTrack.setAttribute(
            "aria-valuenow",
            String(stats.percentage)
        );
    }

    const overallElement = clearanceGetElement(
        "overallClearanceStatus"
    );

    if (overallElement) {
        overallElement.className =
            "status-badge " +
            (
                overallStatus === "completed" ||
                overallStatus === "approved"
                    ? "status-approved"
                    : overallStatus === "rejected"
                        ? "status-rejected"
                        : "status-in-progress"
            );

        const icon = document.createElement("i");

        icon.className =
            "fas " +
            (
                overallStatus === "completed" ||
                overallStatus === "approved"
                    ? "fa-check-circle"
                    : overallStatus === "rejected"
                        ? "fa-exclamation-circle"
                        : "fa-spinner"
            );

        overallElement.replaceChildren(
            icon,
            document.createTextNode(
                " " + clearanceOverallStatusLabel(overallStatus)
            )
        );
    }

    let progressText = "Your clearance progress is being tracked.";

    if (overallStatus === "completed" || stats.percentage === 100) {
        progressText =
            "All seven clearance stages have been approved.";
    } else if (stats.rejected > 0) {
        progressText =
            "One or more stages require attention. Review the rejection details below.";
    } else if (stats.approved > 0) {
        progressText =
            "Your clearance is progressing. Continue checking for updates from each office.";
    } else {
        progressText =
            "Your clearance progress will update as the stages are processed.";
    }

    clearanceSetText("progressHelpText", progressText);
}


/* =========================================================
   10. RENDER INDIVIDUAL STAGES
========================================================= */

function clearanceRenderStage(stage) {
    const statusClass = clearanceStatusClass(stage.status);
    const iconClass = clearanceStatusIcon(stage.status);

    const stageNumberOrIcon =
        stage.status === "approved"
            ? `<i class="fas fa-check"></i>`
            : `<i class="fas ${stage.icon}"></i>`;

    const reasonHTML = stage.rejectionReason
        ? `
            <div class="stage-rejection-reason">
                <strong>
                    <i class="fas fa-exclamation-circle"></i>
                    Reason for rejection
                </strong>
                ${clearanceEscapeHTML(stage.rejectionReason)}
            </div>
        `
        : "";

    const dateLabel = clearanceFormatDate(stage.date)
        ? `
            <span>
                <i class="far fa-calendar-alt"></i>
                ${clearanceEscapeHTML(clearanceFormatDate(stage.date))}
            </span>
        `
        : "";

    const reviewerLabel = stage.reviewer
        ? `
            <span>
                <i class="fas fa-user-check"></i>
                ${clearanceEscapeHTML(stage.reviewer)}
            </span>
        `
        : "";

    let actionHTML = "";

    if (stage.status === "rejected") {
        actionHTML = `
            <div class="stage-actions">
                <a
                    href="student-documents.html"
                    class="stage-action-link"
                >
                    <i class="fas fa-folder-open"></i>
                    Review My Documents
                </a>
            </div>
        `;
    }

    return `
        <article class="clearance-stage-card">

            <div class="stage-icon ${statusClass}">
                ${stageNumberOrIcon}
            </div>

            <div class="stage-main">

                <div class="stage-heading">
                    <h3>
                        ${stage.index}. ${clearanceEscapeHTML(stage.title)}
                    </h3>

                    <span class="stage-status ${statusClass}">
                        <i class="fas ${iconClass}"></i>
                        ${clearanceEscapeHTML(stage.statusLabel)}
                    </span>
                </div>

                <p class="stage-description">
                    ${clearanceEscapeHTML(stage.description)}
                </p>

                ${
                    dateLabel || reviewerLabel
                        ? `
                            <div class="stage-meta">
                                ${dateLabel}
                                ${reviewerLabel}
                            </div>
                        `
                        : ""
                }

                ${reasonHTML}
                ${actionHTML}

            </div>

        </article>
    `;
}


function clearanceRenderStages(stages) {
    const container = clearanceGetElement(
        "clearanceStagesList"
    );

    if (!container) {
        return;
    }

    container.innerHTML = stages
        .map(clearanceRenderStage)
        .join("");

    clearanceShowElement("clearanceStagesList", true);
    clearanceShowElement("clearanceLoadingState", false);
    clearanceShowElement("clearanceEmptyState", false);
}


/* =========================================================
   11. REJECTION / ATTENTION PANEL
========================================================= */

function clearanceRenderAttention(stages) {
    const rejectedStages = stages.filter(
        stage => stage.status === "rejected"
    );

    const container = clearanceGetElement(
        "clearanceAttentionList"
    );

    if (!container) {
        return;
    }

    if (rejectedStages.length === 0) {
        container.replaceChildren();
        clearanceShowElement("clearanceAttentionPanel", false);
        return;
    }

    container.innerHTML = rejectedStages.map(stage => {
        const reason = stage.rejectionReason ||
            "Please contact the relevant clearance office for the reason and instructions.";

        return `
            <article class="attention-item">

                <h3>
                    ${clearanceEscapeHTML(stage.title)}
                </h3>

                <p>
                    ${clearanceEscapeHTML(reason)}
                </p>

                <a href="student-documents.html">
                    <i class="fas fa-folder-open"></i>
                    Check your documents
                    <i class="fas fa-arrow-right"></i>
                </a>

            </article>
        `;
    }).join("");

    clearanceShowElement("clearanceAttentionPanel", true);
}


/* =========================================================
   12. DISPLAY CLEARANCE RECORD
========================================================= */

function clearanceDisplayRecord(result) {
    const payload = clearanceExtractPayload(result);

    if (!clearanceHasRecord(payload)) {
        clearanceRecord = null;

        clearanceShowElement("clearanceLoadingState", false);
        clearanceShowElement("clearanceStagesList", false);
        clearanceShowElement("clearanceAttentionPanel", false);

        clearanceSetText(
            "clearanceEmptyTitle",
            "No clearance record found"
        );

        clearanceSetText(
            "clearanceEmptyDescription",
            "You do not appear to have a clearance record yet. You can try creating one below."
        );

        clearanceShowElement("clearanceEmptyState", true);

        clearanceRenderSummary({}, CLEARANCE_STAGES.map(stage => ({
            ...stage,
            status: "pending"
        })));

        return;
    }

    clearanceRecord = payload;

    const stages = clearanceBuildStageData(payload);

    clearanceRenderSummary(payload, stages);
    clearanceRenderStages(stages);
    clearanceRenderAttention(stages);

    clearanceShowElement("clearanceLoadingState", false);
    clearanceShowElement("clearanceEmptyState", false);
    clearanceShowElement("clearanceStagesList", true);
}


/* =========================================================
   13. LOAD AND REFRESH CLEARANCE
========================================================= */

async function clearanceLoadRecord(options = {}) {
    if (clearanceIsLoading) {
        return;
    }

    clearanceIsLoading = true;

    const refreshButton = clearanceGetElement(
        "refreshClearanceButton"
    );

    if (refreshButton) {
        refreshButton.disabled = true;
    }

    if (options.showLoading !== false) {
        clearanceShowElement("clearanceLoadingState", true);
        clearanceShowElement("clearanceEmptyState", false);
    }

    clearanceShowMessage("", "");

    try {
        const result = await clearanceFetchRecord();

        clearanceDisplayRecord(result);
    } catch (error) {
        console.error(
            "Unable to load student clearance:",
            error
        );

        clearanceShowElement("clearanceLoadingState", false);
        clearanceShowElement("clearanceStagesList", false);
        clearanceShowElement("clearanceEmptyState", true);

        clearanceSetText(
            "clearanceEmptyTitle",
            "Unable to load clearance"
        );

        clearanceSetText(
            "clearanceEmptyDescription",
            error.message ||
                "The clearance information could not be retrieved. Please try again."
        );

        clearanceShowMessage(
            error.message ||
                "Unable to load clearance information. Please try again.",
            "error"
        );
    } finally {
        clearanceIsLoading = false;

        if (refreshButton) {
            refreshButton.disabled = false;
        }
    }
}


/* =========================================================
   14. CREATE CLEARANCE RECORD
========================================================= */

async function clearanceCreateRecord() {
    if (clearanceIsCreating) {
        return;
    }

    if (!clearanceRegNo) {
        clearanceShowMessage(
            "Your registration number is missing. Please log in again.",
            "error"
        );
        return;
    }

    const createButton = clearanceGetElement(
        "createClearanceButton"
    );

    clearanceIsCreating = true;

    if (createButton) {
        createButton.disabled = true;
        createButton.innerHTML =
            '<i class="fas fa-spinner fa-spin"></i> Creating...';
    }

    clearanceShowMessage("", "");

    try {
        const result = await clearanceAPIRequest(
            CLEARANCE_CREATE_ENDPOINT,
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    reg_no: clearanceRegNo
                })
            }
        );

        clearanceShowMessage(
            result.message ||
                "The clearance creation request was processed.",
            "success"
        );

        await clearanceLoadRecord({
            showLoading: true
        });
    } catch (error) {
        console.error(
            "Unable to create clearance:",
            error
        );

        clearanceShowMessage(
            error.message ||
                "Unable to create your clearance record.",
            "error"
        );
    } finally {
        clearanceIsCreating = false;

        if (createButton) {
            createButton.disabled = false;
            createButton.innerHTML =
                '<i class="fas fa-plus-circle"></i> Create Clearance';
        }
    }
}


/* =========================================================
   15. MESSAGE DISPLAY
========================================================= */

function clearanceShowMessage(message, type = "") {
    const element = clearanceGetElement(
        "clearanceMessage"
    );

    if (!element) {
        return;
    }

    if (!message) {
        element.textContent = "";
        element.className = "clearance-message";
        element.hidden = true;
        return;
    }

    element.textContent = message;
    element.className = `clearance-message ${type}`.trim();
    element.hidden = false;
}


/* =========================================================
   16. SIDEBAR NAVIGATION
========================================================= */

function clearanceInitializeSidebar() {
    const sidebar = clearanceGetElement(
        "dashboardSidebar"
    );

    const overlay = clearanceGetElement(
        "sidebarOverlay"
    );

    const openButton = clearanceGetElement(
        "mobileMenuButton"
    );

    const closeButton = clearanceGetElement(
        "sidebarCloseButton"
    );

    function openSidebar() {
        if (sidebar) {
            sidebar.classList.add("sidebar-open");
        }

        if (overlay) {
            overlay.style.opacity = "1";
            overlay.style.visibility = "visible";
        }
    }

    function closeSidebar() {
        if (sidebar) {
            sidebar.classList.remove("sidebar-open");
        }

        if (overlay) {
            overlay.style.opacity = "";
            overlay.style.visibility = "";
        }
    }

    if (openButton) {
        openButton.addEventListener("click", openSidebar);
    }

    if (closeButton) {
        closeButton.addEventListener("click", closeSidebar);
    }

    if (overlay) {
        overlay.addEventListener("click", closeSidebar);
    }

    document.addEventListener("keydown", event => {
        if (event.key === "Escape") {
            closeSidebar();
        }
    });
}


/* =========================================================
   17. NAVIGATION AND LOGOUT
========================================================= */

function clearanceInitializeNavigation() {
    const profileButton = clearanceGetElement(
        "topbarProfileButton"
    );

    if (profileButton) {
        profileButton.addEventListener("click", () => {
            window.location.href = "student-profile.html";
        });
    }

    const logoutButton = clearanceGetElement(
        "logoutButton"
    );

    if (logoutButton) {
        logoutButton.addEventListener("click", () => {
            const confirmed = window.confirm(
                "Are you sure you want to log out?"
            );

            if (!confirmed) {
                return;
            }

            const sessionKeys = [
                "uniclear_student",
                "uniclear_reg_no",
                "uniclear_user_role",
                "uniclear_student_data",
                "student_data",
                "student"
            ];

            for (const key of sessionKeys) {
                sessionStorage.removeItem(key);
                localStorage.removeItem(key);
            }

            window.location.href = "login.html";
        });
    }
}


/* =========================================================
   18. INITIALIZE PAGE
========================================================= */

async function clearanceInitializePage() {
    const session = clearanceGetStudentSession();

    clearanceStudent = session.student;
    clearanceRegNo = session.regNo;

    clearanceDisplayStudent(
        clearanceStudent,
        clearanceRegNo
    );

    clearanceInitializeSidebar();
    clearanceInitializeNavigation();

    const refreshButton = clearanceGetElement(
        "refreshClearanceButton"
    );

    if (refreshButton) {
        refreshButton.addEventListener("click", () => {
            clearanceLoadRecord({
                showLoading: true
            });
        });
    }

    const createButton = clearanceGetElement(
        "createClearanceButton"
    );

    if (createButton) {
        createButton.addEventListener(
            "click",
            clearanceCreateRecord
        );
    }

    if (!clearanceRegNo) {
        clearanceShowElement("clearanceLoadingState", false);
        clearanceShowElement("clearanceStagesList", false);
        clearanceShowElement("clearanceEmptyState", true);

        clearanceSetText(
            "clearanceEmptyTitle",
            "Student session not found"
        );

        clearanceSetText(
            "clearanceEmptyDescription",
            "Please log in with your student account before viewing your clearance."
        );

        clearanceShowMessage(
            "Your student session could not be restored. Please log in again.",
            "error"
        );

        return;
    }

    await clearanceLoadRecord({
        showLoading: true
    });
}


/* =========================================================
   19. START APPLICATION
========================================================= */

if (document.readyState === "loading") {
    document.addEventListener(
        "DOMContentLoaded",
        clearanceInitializePage
    );
} else {
    clearanceInitializePage();
}