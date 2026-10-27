/* ============================================================
   UNICLEAR STUDENT CLEARANCE SYSTEM
   FILE: Frontend/js/student-details.js

   STUDENT DETAILS PAGE

   FEATURES:
   1. Restore the logged-in staff profile.
   2. Load student details from the staff details endpoint.
   3. Display student personal and academic information.
   4. Display all seven clearance stages.
   5. Display submitted documents with view/download links.
   6. Display stage review and workflow history.
   7. Display the rejection reason when available.
   8. Enable approval/rejection only when permitted.
   9. Require a rejection reason before submitting rejection.
  10. Refresh student details after a review decision.
  11. Support mobile navigation and staff logout.

   API BASE:
   https://uniclear-student-platform.vercel.app
============================================================ */

"use strict";

/* ============================================================
   1. API CONFIGURATION
============================================================ */

const API_BASE_URL = "https://uniclear-student-platform.vercel.app";

const ENDPOINTS = {
    studentDetails: "/api/v1/clearance/staff/student-details",
    reviewStage: "/api/v1/clearance/staff/review-stage"
};

const LOGIN_PAGE = "login.html";
const DASHBOARD_PAGE = "staff-dashboard.html";

const CLEARANCE_STAGES = [
    "finance",
    "department",
    "faculty",
    "library",
    "health",
    "student_affairs",
    "final"
];

const STAGE_LABELS = {
    finance: "Finance",
    department: "Department",
    faculty: "Faculty",
    library: "Library",
    health: "Health",
    student_affairs: "Student Affairs",
    final: "Final Clearance"
};

/* ============================================================
   2. PAGE STATE
============================================================ */

let staffProfile = null;
let studentPayload = null;
let studentRecord = null;
let clearanceRecord = null;
let assignedStageRecord = null;

let canReviewCurrentStage = false;
let isLoadingDetails = false;
let isSubmittingReview = false;

let currentRegNo = "";
let assignedStage = "";
let currentStage = "";

const queryParams = new URLSearchParams(window.location.search);

/* ============================================================
   3. DOM HELPERS
============================================================ */

function $(id) {
    return document.getElementById(id);
}

function setText(id, value, fallback = "—") {
    const element = $(id);

    if (!element) return;

    if (value === null || value === undefined || value === "") {
        element.textContent = fallback;
    } else {
        element.textContent = String(value);
    }
}

function show(id) {
    const element = $(id);

    if (element) {
        element.hidden = false;
    }
}

function hide(id) {
    const element = $(id);

    if (element) {
        element.hidden = true;
    }
}

function titleCase(value) {
    return String(value || "")
        .replace(/[_-]+/g, " ")
        .replace(/\b\w/g, character => character.toUpperCase());
}

function normalizeStage(stage) {
    const normalized = String(stage || "")
        .trim()
        .toLowerCase()
        .replace(/[\s-]+/g, "_");

    return STAGE_LABELS[normalized] || titleCase(normalized) || "Not assigned";
}

function normalizeStatus(value) {
    return String(value || "unknown")
        .trim()
        .toLowerCase()
        .replace(/[\s-]+/g, "_");
}

function getInitials(name) {
    const parts = String(name || "S")
        .trim()
        .split(/\s+/)
        .filter(Boolean);

    return parts
        .slice(0, 2)
        .map(part => part.charAt(0).toUpperCase())
        .join("") || "S";
}

function formatDate(value) {
    if (!value) return "—";

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
        return String(value);
    }

    return date.toLocaleString("en-NG", {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit"
    });
}

function isTrue(value) {
    return value === true || String(value).toLowerCase() === "true";
}

/* ============================================================
   4. STAFF SESSION MANAGEMENT

   Compatible with the staff-dashboard storage conventions:
   - uniclear_staff
   - uniclear_staff_id
   - uniclear_staff_role
   - uniclear_assigned_stage
   - staffProfile
============================================================ */

function getStaffId() {
    return String(
        staffProfile?.staff_id ||
        sessionStorage.getItem("uniclear_staff_id") ||
        localStorage.getItem("staff_id") ||
        sessionStorage.getItem("staff_id") ||
        ""
    ).trim();
}

function getStaffName(profile = staffProfile) {
    if (!profile) return "Staff Member";

    const parts = [
        profile.first_name,
        profile.other_names,
        profile.surname
    ]
        .filter(value => typeof value === "string" && value.trim())
        .map(value => value.trim());

    return parts.join(" ") ||
        profile.full_name ||
        profile.name ||
        "Staff Member";
}

function staffMustChangePassword() {
    return isTrue(staffProfile?.must_change_password);
}

function accountIsActive(profile = staffProfile) {
    const status = String(
        profile?.account_status ||
        profile?.status ||
        "active"
    ).trim().toLowerCase();

    return ["active", "enabled"].includes(status);
}

function readStoredStaffProfile() {
    const keys = [
        "uniclear_staff",
        "staffProfile",
        "staff",
        "loggedInStaff",
        "currentStaff",
        "user"
    ];

    for (const key of keys) {
        try {
            const raw =
                sessionStorage.getItem(key) ||
                localStorage.getItem(key);

            if (!raw) continue;

            const parsed = JSON.parse(raw);

            const candidate =
                parsed?.data?.staff_id ? parsed.data :
                parsed?.data?.staff?.staff_id ? parsed.data.staff :
                parsed?.staff?.staff_id ? parsed.staff :
                parsed?.user?.staff_id ? parsed.user :
                parsed;

            const staffId =
                candidate?.staff_id ||
                sessionStorage.getItem("uniclear_staff_id") ||
                localStorage.getItem("staff_id") ||
                sessionStorage.getItem("staff_id");

            if (!staffId) continue;

            return {
                ...candidate,

                staff_id: String(staffId),

                role:
                    candidate.role ||
                    sessionStorage.getItem("uniclear_staff_role") ||
                    localStorage.getItem("staff_role") ||
                    "",

                assigned_stage:
                    candidate.assigned_stage ||
                    candidate.dashboard_stage ||
                    sessionStorage.getItem("uniclear_assigned_stage") ||
                    localStorage.getItem("assigned_stage") ||
                    "",

                account_status:
                    candidate.account_status ||
                    candidate.status ||
                    localStorage.getItem("account_status") ||
                    "active",

                must_change_password: isTrue(
                    candidate.must_change_password ??
                    localStorage.getItem("must_change_password")
                )
            };
        } catch (error) {
            console.warn(
                `Unable to read staff profile from ${key}.`,
                error
            );
        }
    }

    const staffId =
        sessionStorage.getItem("uniclear_staff_id") ||
        localStorage.getItem("staff_id") ||
        sessionStorage.getItem("staff_id");

    if (!staffId) return null;

    return {
        staff_id: staffId,

        first_name:
            localStorage.getItem("staff_first_name") || "",

        other_names:
            localStorage.getItem("staff_other_names") || "",

        surname:
            localStorage.getItem("staff_surname") || "",

        email:
            localStorage.getItem("staff_email") || "",

        role:
            sessionStorage.getItem("uniclear_staff_role") ||
            localStorage.getItem("staff_role") ||
            "",

        assigned_stage:
            sessionStorage.getItem("uniclear_assigned_stage") ||
            localStorage.getItem("assigned_stage") ||
            "",

        department:
            localStorage.getItem("staff_department") || "",

        faculty:
            localStorage.getItem("staff_faculty") || "",

        account_status:
            localStorage.getItem("account_status") || "active",

        must_change_password: isTrue(
            localStorage.getItem("must_change_password")
        )
    };
}

function saveStaffProfile(profile) {
    if (!profile?.staff_id) return;

    try {
        sessionStorage.setItem(
            "uniclear_staff",
            JSON.stringify(profile)
        );

        sessionStorage.setItem(
            "uniclear_staff_id",
            profile.staff_id
        );

        sessionStorage.setItem(
            "uniclear_staff_role",
            profile.role || ""
        );

        sessionStorage.setItem(
            "uniclear_assigned_stage",
            profile.assigned_stage || ""
        );

        sessionStorage.setItem("uniclear_user_role", "staff");

        localStorage.setItem(
            "staffProfile",
            JSON.stringify(profile)
        );

        localStorage.setItem("staff_id", profile.staff_id);
        localStorage.setItem("staff_first_name", profile.first_name || "");
        localStorage.setItem("staff_other_names", profile.other_names || "");
        localStorage.setItem("staff_surname", profile.surname || "");
        localStorage.setItem("staff_email", profile.email || "");
        localStorage.setItem("staff_role", profile.role || "");
        localStorage.setItem("assigned_stage", profile.assigned_stage || "");
        localStorage.setItem("staff_department", profile.department || "");
        localStorage.setItem("staff_faculty", profile.faculty || "");
        localStorage.setItem(
            "account_status",
            profile.account_status || "active"
        );

        localStorage.setItem(
            "must_change_password",
            String(!!profile.must_change_password)
        );
    } catch (error) {
        console.warn("Unable to save the staff profile.", error);
    }
}

function ensureStaffSession() {
    staffProfile = readStoredStaffProfile();

    if (!staffProfile?.staff_id) {
        showPageError(
            "Your staff session could not be found. Please sign in again."
        );

        return false;
    }

    const accountType = sessionStorage.getItem("uniclear_user_role");

    if (accountType && accountType.toLowerCase() !== "staff") {
        showPageError("This page is available to staff accounts only.");
        return false;
    }

    return true;
}

/* ============================================================
   5. API REQUEST HELPER
============================================================ */

async function apiRequest(endpoint, options = {}) {
    const headers = {
        Accept: "application/json",
        ...(options.headers || {})
    };

    if (
        options.body &&
        !(options.body instanceof FormData) &&
        !headers["Content-Type"]
    ) {
        headers["Content-Type"] = "application/json";
    }

    let response;

    try {
        response = await fetch(`${API_BASE_URL}${endpoint}`, {
            ...options,
            headers
        });
    } catch (error) {
        throw new Error(
            "Unable to connect to the UniClear server. Check your internet connection and API URL."
        );
    }

    const contentType = response.headers.get("content-type") || "";
    let data = {};

    if (contentType.includes("application/json")) {
        try {
            data = await response.json();
        } catch {
            data = {};
        }
    } else {
        const responseText = await response.text();

        data = {
            message: responseText ||
                "The server returned an unexpected response."
        };
    }

    if (!response.ok || data.success === false) {
        const error = new Error(
            data.message ||
            data.error ||
            `The request failed (${response.status}).`
        );

        error.status = response.status;
        error.data = data;

        throw error;
    }

    return data;
}

/* ============================================================
   6. PAGE NOTICES AND TOAST NOTIFICATIONS
============================================================ */

function showPageError(message) {
    const errorBox = $("pageErrorNotice");

    if (errorBox) {
        errorBox.textContent = message;
        errorBox.className = "notice notice-error";
        errorBox.hidden = false;
    }

    hide("pageLoadingNotice");
}

function showPageMessage(message, type = "info") {
    const box = $("pageMessageNotice");

    if (!box) return;

    box.textContent = message;
    box.className = `notice notice-${type}`;
    box.hidden = false;
}

function showToast(message, type = "info") {
    let container = $("toastContainer");

    if (!container) {
        container = document.createElement("div");
        container.id = "toastContainer";
        container.className = "toast-container";
        container.setAttribute("aria-live", "polite");

        document.body.appendChild(container);
    }

    const toast = document.createElement("div");

    toast.className = `toast toast-${type}`;
    toast.setAttribute(
        "role",
        type === "error" ? "alert" : "status"
    );

    const text = document.createElement("span");

    text.textContent = String(message || "Please try again.");

    toast.appendChild(text);
    container.appendChild(toast);

    window.setTimeout(() => {
        toast.style.opacity = "0";
        toast.style.transform = "translateX(10px)";

        window.setTimeout(() => toast.remove(), 250);
    }, 4500);
}

/* ============================================================
   7. STAFF HEADER AND NAVIGATION
============================================================ */

function renderStaffHeader() {
    if (!staffProfile) return;

    const name = getStaffName();
    const role = staffProfile.role || "Clearance Officer";
    const initials = getInitials(name);

    setText("sidebarStaffName", name);
    setText("sidebarStaffRole", role);
    setText("topbarStaffName", name);
    setText("topbarStaffRole", role);

    ["sidebarAvatar", "topbarAvatar"].forEach(id => {
        const avatar = $(id);

        if (avatar) {
            avatar.textContent = initials;
        }
    });

    setText(
        "currentDate",
        new Intl.DateTimeFormat("en-NG", {
            weekday: "short",
            day: "numeric",
            month: "short",
            year: "numeric"
        }).format(new Date())
    );

    setText("footerYear", new Date().getFullYear());
}

function initializeSidebar() {
    $("menuToggleBtn")?.addEventListener("click", () => {
        $("sidebar")?.classList.add("is-open");

        if ($("sidebarOverlay")) {
            $("sidebarOverlay").hidden = false;
        }
    });

    function closeSidebar() {
        $("sidebar")?.classList.remove("is-open");

        if ($("sidebarOverlay")) {
            $("sidebarOverlay").hidden = true;
        }
    }

    $("closeSidebarBtn")?.addEventListener("click", closeSidebar);

    $("sidebarOverlay")?.addEventListener("click", closeSidebar);

    document.addEventListener("keydown", event => {
        if (event.key === "Escape") {
            closeSidebar();
        }
    });

    $("topbarProfileBtn")?.addEventListener("click", () => {
        window.location.href = `${DASHBOARD_PAGE}#staff-profile`;
    });
}

function logoutStaff() {
    if (!window.confirm("Are you sure you want to sign out?")) {
        return;
    }

    const keys = [
        "uniclear_staff",
        "uniclear_staff_id",
        "uniclear_staff_role",
        "uniclear_assigned_stage",
        "uniclear_user_role",
        "staffProfile",
        "staff",
        "loggedInStaff",
        "currentStaff",
        "user",
        "staff_id",
        "staff_first_name",
        "staff_other_names",
        "staff_surname",
        "staff_email",
        "staff_role",
        "assigned_stage",
        "staff_department",
        "staff_faculty",
        "account_status",
        "must_change_password",
        "uniclear_stage_otp_notice"
    ];

    keys.forEach(key => {
        sessionStorage.removeItem(key);
        localStorage.removeItem(key);
    });

    window.location.href = LOGIN_PAGE;
}

function initializeLogout() {
    $("logoutBtn")?.addEventListener("click", logoutStaff);
}

function initializeBackLink() {
    const back = $("backToDashboardBtn");

    if (!back) return;

    const requestedReturn = queryParams.get("return_to") || DASHBOARD_PAGE;

    const safePage =
        /^[a-z0-9-]+\.html$/i.test(requestedReturn) &&
        !requestedReturn.includes("..")
            ? requestedReturn
            : DASHBOARD_PAGE;

    back.href = `${safePage}#clearance-work`;
}

/* ============================================================
   8. LOAD STUDENT DETAILS FROM THE BACKEND

   POST /api/v1/clearance/staff/student-details

   Request:
   {
       "staff_id": "FIN001",
       "reg_no": "REG/2022/TEST001"
   }

   Expected response data:
   student, clearance, stage_record, assigned_stage, can_review
============================================================ */

async function loadStudentDetails({ silent = false } = {}) {
    if (!currentRegNo || !getStaffId()) {
        showPageError(
            !currentRegNo
                ? "No student registration number was provided. Return to Clearance Work and select a student."
                : "Your staff ID is missing. Please sign in again."
        );

        return;
    }

    if (isLoadingDetails) return;

    isLoadingDetails = true;

    if (!silent) {
        show("pageLoadingNotice");
        hide("pageErrorNotice");
        hide("pageMessageNotice");

        setText(
            "pageLoadingNotice",
            "Loading student clearance details…"
        );
    }

    const refreshButton = $("refreshStudentDetailsBtn");

    if (refreshButton) {
        refreshButton.disabled = true;
        refreshButton.dataset.originalText = refreshButton.textContent;
        refreshButton.textContent = "Refreshing…";
    }

    try {
        const response = await apiRequest(ENDPOINTS.studentDetails, {
            method: "POST",

            body: JSON.stringify({
                staff_id: getStaffId(),
                reg_no: currentRegNo
            })
        });

        studentPayload = response;
        studentRecord = response.student || {};
        clearanceRecord = response.clearance || {};

        assignedStage = String(
            response.assigned_stage ||
            staffProfile?.assigned_stage ||
            ""
        ).trim().toLowerCase();

        currentStage = String(
            clearanceRecord.current_stage || ""
        ).trim().toLowerCase();

        assignedStageRecord =
            response.stage_record ||
            clearanceRecord.stages?.[assignedStage] ||
            {};

        /*
         * Refresh cached staff information using the profile
         * returned by the server, without discarding existing fields
         * that might not be present in the public profile response.
         */
        if (response.staff?.staff_id) {
            staffProfile = {
                ...staffProfile,
                ...response.staff,

                staff_id: response.staff.staff_id,

                assigned_stage:
                    response.assigned_stage ||
                    response.staff.assigned_stage ||
                    staffProfile.assigned_stage
            };

            saveStaffProfile(staffProfile);
        }

        renderStaffHeader();
        renderStudentInformation();
        renderClearanceProgress();
        renderCurrentStageSummary();
        renderDocuments();
        renderReviewHistory();
        renderRejectionInformation();

        updateReviewEligibility(response.can_review);

        hide("pageLoadingNotice");
        hide("pageErrorNotice");

        if (queryParams.get("otp_verified") === "1") {
            show("otpVerifiedNotice");

            const storedMessage = sessionStorage.getItem(
                "uniclear_stage_otp_notice"
            );

            if (storedMessage) {
                setText("otpVerifiedNotice", storedMessage);
                sessionStorage.removeItem("uniclear_stage_otp_notice");
            }
        }

    } catch (error) {
        console.error("Unable to load student details:", error);

        showPageError(
            error.message || "Unable to load the student's details."
        );

        showToast(
            error.message || "Unable to load student details.",
            "error"
        );

        updateReviewEligibility(false);

    } finally {
        isLoadingDetails = false;
        hide("pageLoadingNotice");

        if (refreshButton) {
            refreshButton.disabled = false;

            refreshButton.textContent =
                refreshButton.dataset.originalText ||
                "Refresh Details";
        }
    }
}

/* ============================================================
   9. RENDER STUDENT INFORMATION
============================================================ */

function renderStudentInformation() {
    const student = studentRecord || {};
    const clearance = clearanceRecord || {};

    const fullName =
        student.full_name ||
        [
            student.first_name,
            student.other_names,
            student.surname
        ].filter(Boolean).join(" ") ||
        "Student";

    setText("studentFullName", fullName);

    setText(
        "studentRegNo",
        student.reg_no || clearance.reg_no || currentRegNo
    );

    setText("studentFirstName", student.first_name);
    setText("studentSurname", student.surname);

    setText(
        "studentOtherNames",
        student.other_names,
        "None provided"
    );

    setText("studentEmail", student.email);
    setText("studentPhone", student.phone_number);

    setText(
        "studentGender",
        student.gender ? titleCase(student.gender) : "—"
    );

    setText("studentFaculty", student.faculty);
    setText("studentDepartment", student.department);
    setText("studentAdmissionYear", student.admission_year);

    setText(
        "studentStudyCategory",
        student.student_status ||
        student.study_category ||
        student.category
    );

    setText(
        "studentAccountStatus",
        student.account_status || student.status
    );

    setText(
        "clearanceCreatedAt",
        formatDate(clearance.created_at)
    );

    setText(
        "studentCurrentStage",
        normalizeStage(currentStage)
    );

    setText(
        "studentAssignedStage",
        normalizeStage(assignedStage)
    );

    const avatar = $("studentAvatar");

    if (avatar) {
        avatar.textContent = getInitials(fullName);
    }

    const overallStatus = normalizeStatus(
        clearance.status || "in_progress"
    );

    const statusElement = $("overallClearanceStatus");

    if (statusElement) {
        statusElement.textContent = titleCase(overallStatus);
        statusElement.className =
            `status-pill ${statusClass(overallStatus)}`;
    }
}

/* ============================================================
   10. CLEARANCE STAGE PROGRESS
============================================================ */

function getStageRecord(stage) {
    const stages = clearanceRecord?.stages || {};

    if (Array.isArray(stages)) {
        return stages.find(record =>
            String(record?.stage || "").toLowerCase() === stage
        ) || {};
    }

    return stages[stage] || {};
}

function stageStatusText(status) {
    const values = {
        pending: "Not started",
        awaiting_submission: "Awaiting document",
        under_review: "Under review",
        approved: "Approved",
        rejected: "Rejected",
        unknown: "Not reviewed"
    };

    return values[status] || titleCase(status);
}

function renderClearanceProgress() {
    const completed =
        normalizeStatus(clearanceRecord?.status) === "completed";

    let approvedCount = 0;

    CLEARANCE_STAGES.forEach((stage, index) => {
        const node = document.querySelector(
            `.stage-timeline-item[data-stage="${stage}"]`
        );

        if (!node) return;

        const record = getStageRecord(stage);
        const status = normalizeStatus(record.status || "pending");

        const marker = node.querySelector(".stage-marker");
        const statusText = node.querySelector(".stage-timeline-status");

        node.classList.remove(
            "approved",
            "current",
            "rejected",
            "completed",
            "in-progress",
            "under-review",
            "status-approved",
            "status-rejected",
            "status-under-review"
        );

        if (status === "approved") {
            approvedCount += 1;
            node.classList.add("approved");

            if (marker) {
                marker.textContent = "✓";
            }
        } else if (marker) {
            marker.textContent = String(index + 1);
        }

        if (status === "rejected") {
            node.classList.add("rejected");
        } else if (status === "under_review") {
            node.classList.add("under-review");
        } else if (status === "awaiting_submission") {
            node.classList.add("in-progress");
        }

        if (currentStage === stage && !completed) {
            node.classList.add("current");
        }

        if (
            completed &&
            stage === "final" &&
            status === "approved"
        ) {
            node.classList.add("completed");
        }

        if (statusText) {
            statusText.textContent = stageStatusText(status);
        }
    });

    if (completed) {
        approvedCount = CLEARANCE_STAGES.filter(stage =>
            normalizeStatus(getStageRecord(stage).status) === "approved"
        ).length;
    }

    const progress = Math.round(
        (approvedCount / CLEARANCE_STAGES.length) * 100
    );

    setText(
        "clearanceProgressCount",
        `${approvedCount} of ${CLEARANCE_STAGES.length} stages approved`
    );

    const progressBar = $("clearanceProgressBar");

    if (progressBar) {
        progressBar.setAttribute("aria-valuenow", String(progress));
    }

    const fill = $("clearanceProgressFill");

    if (fill) {
        fill.style.width = `${progress}%`;
    }
}

/* ============================================================
   11. STATUS STYLES
============================================================ */

function statusClass(status) {
    const classes = {
        active: "status-active",
        approved: "status-approved",
        completed: "status-completed",
        under_review: "status-under-review",
        pending: "status-pending",
        awaiting_submission: "status-pending",
        rejected: "status-rejected",
        in_progress: "status-in-progress",
        inactive: "status-inactive"
    };

    return classes[status] || "status-default";
}

/* ============================================================
   12. CURRENT STAGE SUMMARY
============================================================ */

function renderCurrentStageSummary() {
    const record = assignedStageRecord || {};
    const status = normalizeStatus(record.status || "pending");

    setText("currentStageName", normalizeStage(assignedStage));
    setText("currentStageStatus", titleCase(status));
    setText("stageSubmittedAt", getLatestDocumentDate(record));

    setText(
        "stageReviewedBy",
        record.reviewed_by || "Not reviewed yet"
    );

    setText(
        "stageReviewedAt",
        formatDate(record.reviewed_at)
    );

    const statusElement = $("currentStageStatus");

    if (statusElement) {
        statusElement.className =
            `status-pill ${statusClass(status)}`;
    }

    let description;

    if (normalizeStatus(clearanceRecord?.status) === "completed") {
        description =
            "The student's overall clearance has been completed.";

    } else if (currentStage !== assignedStage) {
        description =
            `The student's current stage is ${normalizeStage(currentStage)}. Your assigned stage is ${normalizeStage(assignedStage)}.`;

    } else if (status === "awaiting_submission") {
        description =
            "The stage is verified and awaiting the student's required document.";

    } else if (status === "under_review") {
        description =
            "The student has submitted a document. It can be reviewed if your staff assignment is authorized for this stage.";

    } else if (status === "rejected") {
        description =
            "The previous submission was rejected. Review the recorded reason and wait for the student's corrected submission.";

    } else if (status === "approved") {
        description =
            "This stage has been approved. The next stage requires its assigned officer to verify the stage OTP.";

    } else {
        description =
            "No document is currently under review at this stage.";
    }

    setText("currentStageDescription", description);
}

function getLatestDocumentDate(stageRecord) {
    const documents = Array.isArray(stageRecord?.documents)
        ? stageRecord.documents
        : [];

    if (!documents.length) {
        return "No document submitted";
    }

    const latest = documents.reduce((best, current) => {
        if (!best) return current;

        return String(current.uploaded_at || "") >
            String(best.uploaded_at || "")
            ? current
            : best;
    }, null);

    return formatDate(latest?.uploaded_at);
}

/* ============================================================
   13. REVIEW ELIGIBILITY

   The backend's can_review value is authoritative.
   The frontend also checks stage, status and staff account state.
============================================================ */

function updateReviewEligibility(serverCanReview) {
    const clearanceStatus = normalizeStatus(clearanceRecord?.status);
    const stageStatus = normalizeStatus(assignedStageRecord?.status);

    const sameStage =
        Boolean(assignedStage) &&
        assignedStage === currentStage;

    canReviewCurrentStage = Boolean(
        serverCanReview === true &&
        sameStage &&
        stageStatus === "under_review" &&
        clearanceStatus !== "completed" &&
        accountIsActive() &&
        !staffMustChangePassword()
    );

    const approveButton = $("approveStudentBtn");
    const rejectButton = $("rejectStudentBtn");

    if (approveButton) {
        approveButton.hidden = !canReviewCurrentStage;
    }

    if (rejectButton) {
        rejectButton.hidden = !canReviewCurrentStage;
    }

    const eligibility = $("stageReviewEligibility");
    const title = $("reviewActionTitle");
    const description = $("reviewActionDescription");

    if (canReviewCurrentStage) {
        if (eligibility) {
            eligibility.textContent = "Eligible for review";
        }

        if (title) {
            title.textContent = "Submission ready for review";
        }

        if (description) {
            description.textContent =
                `The document is under review at your assigned ${normalizeStage(assignedStage)} stage. You may approve it or reject it with a reason.`;
        }

        return;
    }

    let message;

    if (!accountIsActive()) {
        message =
            "Your staff account is inactive. Review actions are disabled.";

    } else if (staffMustChangePassword()) {
        message =
            "Change your staff password before carrying out clearance actions.";

    } else if (clearanceStatus === "completed") {
        message =
            "This student's clearance is completed. No further review action is available.";

    } else if (!sameStage) {
        message =
            `This student is at ${normalizeStage(currentStage)}. Your assigned stage is ${normalizeStage(assignedStage)}; review actions are unavailable for this stage.`;

    } else if (stageStatus === "awaiting_submission") {
        message =
            "The stage OTP has been verified, but the student must submit the required document before you can approve or reject it.";

    } else if (stageStatus === "approved") {
        message =
            "This stage has already been approved. The next stage officer must verify the OTP before the clearance can progress.";

    } else if (stageStatus === "rejected") {
        message =
            "This stage's submission was rejected. Review the rejection reason and wait for the student to upload a corrected document.";

    } else {
        message =
            "The current submission is not under review, so approval and rejection are disabled.";
    }

    setEligibilityMessage(message);
}

function setEligibilityMessage(message) {
    setText("stageReviewEligibility", message);
    setText("reviewActionTitle", "Review action unavailable");
    setText("reviewActionDescription", message);
}

/* ============================================================
   14. DOCUMENTS

   Document metadata comes from:
   clearance.stages[stage].documents

   View and download paths:
   GET /api/v1/clearance/document/view/<document_id>?reg_no=...
   GET /api/v1/clearance/document/download/<document_id>?reg_no=...
============================================================ */

function collectDocuments() {
    const result = [];

    CLEARANCE_STAGES.forEach(stage => {
        const record = getStageRecord(stage);

        const documents = Array.isArray(record.documents)
            ? record.documents
            : [];

        documents.forEach(documentRecord => {
            result.push({
                ...documentRecord,
                stage: documentRecord.stage || stage
            });
        });
    });

    return result.sort((a, b) =>
        String(b.uploaded_at || "").localeCompare(
            String(a.uploaded_at || "")
        )
    );
}

function getDocumentType(documentRecord) {
    if (documentRecord.content_type) {
        return documentRecord.content_type;
    }

    const fileName =
        documentRecord.original_filename ||
        documentRecord.file_name ||
        documentRecord.document_name ||
        "";

    const dot = fileName.lastIndexOf(".");

    return dot >= 0
        ? `${fileName.slice(dot + 1).toUpperCase()} file`
        : "File";
}

function buildDocumentUrl(documentRecord, mode) {
    const documentId =
        documentRecord.document_id ||
        documentRecord.id;

    let candidate =
        mode === "view"
            ? documentRecord.view_url
            : documentRecord.download_url;

    if (!candidate && documentId) {
        candidate =
            `/api/v1/clearance/document/${mode}/${encodeURIComponent(documentId)}`;
    }

    if (!candidate) return "";

    try {
        const url = new URL(candidate, API_BASE_URL);

        const permittedPath =
            mode === "view"
                ? url.pathname.startsWith(
                    "/api/v1/clearance/document/view/"
                )
                : url.pathname.startsWith(
                    "/api/v1/clearance/document/download/"
                );

        if (
            !permittedPath ||
            url.origin !== new URL(API_BASE_URL).origin
        ) {
            return "";
        }

        url.searchParams.set("reg_no", currentRegNo);

        return url.href;

    } catch (error) {
        console.warn("Could not build document URL.", error);
        return "";
    }
}

function makeActionLink(label, href, openInNewTab = false) {
    if (!href) return null;

    const link = document.createElement("a");

    link.href = href;
    link.className = "document-action-link";
    link.textContent = label;

    if (openInNewTab) {
        link.target = "_blank";
        link.rel = "noopener noreferrer";
    }

    return link;
}

function appendCell(row, value) {
    const cell = document.createElement("td");

    cell.textContent = String(value ?? "—");
    row.appendChild(cell);

    return cell;
}

function renderEmptyRow(tbody, message, columns) {
    if (!tbody) return;

    tbody.replaceChildren();

    const row = document.createElement("tr");
    const cell = document.createElement("td");

    cell.colSpan = columns;
    cell.className = "table-empty";
    cell.textContent = message;

    row.appendChild(cell);
    tbody.appendChild(row);
}

function renderDocuments() {
    const tbody = $("studentDocumentsTableBody");
    const documents = collectDocuments();

    setText(
        "studentDocumentCount",
        `${documents.length} document${documents.length === 1 ? "" : "s"}`
    );

    if (!tbody) return;

    tbody.replaceChildren();

    if (!documents.length) {
        renderEmptyRow(
            tbody,
            "No documents have been submitted for this clearance record.",
            6
        );

        return;
    }

    documents.forEach(documentRecord => {
        const row = document.createElement("tr");

        // Document name
        const nameCell = document.createElement("td");
        const name = document.createElement("strong");

        name.className = "document-name";

        name.textContent =
            documentRecord.document_name ||
            documentRecord.original_filename ||
            documentRecord.file_name ||
            "Unnamed document";

        nameCell.appendChild(name);
        row.appendChild(nameCell);

        // Stage, type and date
        appendCell(row, normalizeStage(documentRecord.stage));
        appendCell(row, getDocumentType(documentRecord));
        appendCell(row, formatDate(documentRecord.uploaded_at));

        // Document status
        const status = normalizeStatus(
            documentRecord.status || "under_review"
        );

        const statusCell = document.createElement("td");
        const badge = document.createElement("span");

        badge.className = `status-pill ${statusClass(status)}`;
        badge.textContent = titleCase(status);

        statusCell.appendChild(badge);
        row.appendChild(statusCell);

        // Document actions
        const actionCell = document.createElement("td");
        const actions = document.createElement("div");

        actions.className = "document-actions";

        const viewLink = makeActionLink(
            "View",
            buildDocumentUrl(documentRecord, "view"),
            true
        );

        const downloadLink = makeActionLink(
            "Download",
            buildDocumentUrl(documentRecord, "download"),
            false
        );

        if (viewLink) actions.appendChild(viewLink);
        if (downloadLink) actions.appendChild(downloadLink);

        if (!viewLink && !downloadLink) {
            actions.textContent = "Document link unavailable";
        }

        actionCell.appendChild(actions);
        row.appendChild(actionCell);

        tbody.appendChild(row);
    });
}

/* ============================================================
   15. REVIEW HISTORY AND WORKFLOW HISTORY
============================================================ */

function collectHistory() {
    const events = [];

    CLEARANCE_STAGES.forEach(stage => {
        const record = getStageRecord(stage);

        const reviewHistory = Array.isArray(record.review_history)
            ? record.review_history
            : [];

        reviewHistory.forEach(entry => {
            events.push({
                date:
                    entry.reviewed_at ||
                    entry.occurred_at ||
                    entry.created_at ||
                    "",

                stage,

                action:
                    entry.action ||
                    record.status ||
                    "review",

                officer:
                    entry.staff_name ||
                    entry.staff_id ||
                    record.reviewed_by ||
                    "—",

                comment:
                    entry.reason ||
                    entry.comment ||
                    entry.rejection_comment ||
                    "—"
            });
        });

        // Handle older records that have no review_history array.
        if (
            !reviewHistory.length &&
            ["approved", "rejected"].includes(
                normalizeStatus(record.status)
            )
        ) {
            events.push({
                date: record.reviewed_at || "",
                stage,
                action: record.status,
                officer: record.reviewed_by || "—",
                comment: record.rejection_comment || "—"
            });
        }

        // Include successful stage OTP verification when recorded.
        const verifiedAt =
            record.otp_verified_at ||
            record.verified_at;

        const verifiedBy =
            record.otp_verified_by ||
            record.verified_by;

        if (verifiedAt || verifiedBy) {
            events.push({
                date: verifiedAt || "",
                stage,
                action: "stage_otp_verified",
                officer: verifiedBy || "—",
                comment: "Stage transfer OTP verified"
            });
        }
    });

    const workflowHistory = Array.isArray(
        clearanceRecord?.workflow_history
    )
        ? clearanceRecord.workflow_history
        : [];

    workflowHistory.forEach(entry => {
        events.push({
            date:
                entry.occurred_at ||
                entry.created_at ||
                entry.reviewed_at ||
                "",

            stage:
                entry.stage ||
                entry.current_stage ||
                entry.next_stage ||
                "",

            action:
                entry.action ||
                "workflow_update",

            officer:
                entry.staff_name ||
                entry.staff_id ||
                "—",

            comment:
                entry.reason ||
                entry.comment ||
                workflowDescription(entry)
        });
    });

    // Remove identical entries if legacy and current fields overlap.
    const unique = new Map();

    events.forEach(event => {
        const key = [
            event.date,
            event.stage,
            event.action,
            event.officer,
            event.comment
        ].join("|");

        if (!unique.has(key)) {
            unique.set(key, event);
        }
    });

    return Array.from(unique.values()).sort((a, b) => {
        const aTime = new Date(a.date || 0).getTime() || 0;
        const bTime = new Date(b.date || 0).getTime() || 0;

        return bTime - aTime;
    });
}

function workflowDescription(entry) {
    const action = normalizeStatus(entry.action);

    if (action === "stage_otp_verified") {
        const previous = entry.previous_stage
            ? normalizeStage(entry.previous_stage)
            : "previous stage";

        const current = entry.current_stage
            ? normalizeStage(entry.current_stage)
            : "next stage";

        return `OTP verification advanced clearance from ${previous} to ${current}.`;
    }

    if (action === "clearance_completed") {
        return "Final clearance completed.";
    }

    if (entry.previous_stage && entry.current_stage) {
        return (
            `Clearance moved from ${normalizeStage(entry.previous_stage)} ` +
            `to ${normalizeStage(entry.current_stage)}.`
        );
    }

    return "Workflow record";
}

function historyActionLabel(action) {
    const labels = {
        approve: "Approved",
        approved: "Approved",
        reject: "Rejected",
        rejected: "Rejected",
        stage_otp_verified: "OTP Verified",
        clearance_completed: "Completed",
        workflow_update: "Workflow Update"
    };

    return labels[action] || titleCase(action);
}

function historyActionClass(action) {
    if (
        ["approve", "approved", "clearance_completed"].includes(action)
    ) {
        return "status-approved";
    }

    if (["reject", "rejected"].includes(action)) {
        return "status-rejected";
    }

    if (action === "stage_otp_verified") {
        return "status-in-progress";
    }

    return "status-default";
}

function renderReviewHistory() {
    const tbody = $("reviewHistoryTableBody");
    const entries = collectHistory();

    setText(
        "reviewHistoryCount",
        `${entries.length} entr${entries.length === 1 ? "y" : "ies"}`
    );

    if (!tbody) return;

    tbody.replaceChildren();

    if (!entries.length) {
        renderEmptyRow(
            tbody,
            "No review or workflow history has been recorded yet.",
            5
        );

        return;
    }

    entries.forEach(entry => {
        const row = document.createElement("tr");

        appendCell(row, formatDate(entry.date));

        appendCell(
            row,
            entry.stage ? normalizeStage(entry.stage) : "—"
        );

        const actionCell = document.createElement("td");
        const badge = document.createElement("span");

        const actionStatus = normalizeStatus(entry.action);

        badge.className =
            `status-pill ${historyActionClass(actionStatus)}`;

        badge.textContent = historyActionLabel(actionStatus);

        actionCell.appendChild(badge);
        row.appendChild(actionCell);

        appendCell(row, entry.officer || "—");
        appendCell(row, entry.comment || "—");

        tbody.appendChild(row);
    });
}

/* ============================================================
   16. REJECTION AND CORRECTION DETAILS
============================================================ */

function renderRejectionInformation() {
    const record = assignedStageRecord || {};

    const documents = Array.isArray(record.documents)
        ? record.documents
        : [];

    const rejectedDocument = [...documents]
        .reverse()
        .find(documentRecord =>
            normalizeStatus(documentRecord.status) === "rejected" &&
            (
                documentRecord.rejection_comment ||
                record.rejection_comment
            )
        );

    const reason =
        record.rejection_comment ||
        rejectedDocument?.rejection_comment ||
        "";

    if (!reason) {
        hide("rejectionDetailsSection");
        return;
    }

    setText("studentRejectionReason", reason);

    setText(
        "rejectionReviewedBy",
        record.reviewed_by ||
        rejectedDocument?.reviewed_by ||
        "—"
    );

    setText(
        "rejectionReviewedAt",
        formatDate(
            record.reviewed_at ||
            rejectedDocument?.reviewed_at
        )
    );

    show("rejectionDetailsSection");
}

/* ============================================================
   17. APPROVE THE CURRENT STAGE
============================================================ */

async function approveCurrentStage() {
    if (isSubmittingReview) return;

    if (!canReviewCurrentStage) {
        showToast(
            "This submission is not currently eligible for approval.",
            "warning"
        );

        return;
    }

    const isFinalStage = assignedStage === "final";

    const confirmationMessage = isFinalStage
        ? "Approve the final clearance stage and complete this student's clearance?"
        : `Approve the ${normalizeStage(assignedStage)} submission and issue an OTP for the next stage?`;

    if (!window.confirm(confirmationMessage)) {
        return;
    }

    await submitStageReview("approve", "");
}

/* ============================================================
   18. REJECT THE CURRENT STAGE

   A rejection reason is mandatory.
   The existing HTML does not contain a rejection modal, so this
   version collects the reason with the browser's prompt dialog.
============================================================ */

async function rejectCurrentStage() {
    if (isSubmittingReview) return;

    if (!canReviewCurrentStage) {
        showToast(
            "This submission is not currently eligible for rejection.",
            "warning"
        );

        return;
    }

    const reason = window.prompt(
        "Enter the reason for rejecting this document. The student will receive this reason."
    );

    if (reason === null) return;

    const trimmedReason = reason.trim();

    if (!trimmedReason) {
        showToast(
            "A rejection reason is required.",
            "warning"
        );

        return;
    }

    if (trimmedReason.length < 5) {
        showToast(
            "Please provide a clear rejection reason of at least 5 characters.",
            "warning"
        );

        return;
    }

    await submitStageReview("reject", trimmedReason);
}

/* ============================================================
   19. SUBMIT APPROVAL OR REJECTION

   POST /api/v1/clearance/staff/review-stage

   Approval body:
   {
       "staff_id": "FIN001",
       "reg_no": "REG/2022/TEST001",
       "action": "approve"
   }

   Rejection body:
   {
       "staff_id": "FIN001",
       "reg_no": "REG/2022/TEST001",
       "action": "reject",
       "reason": "Reason for rejection"
   }
============================================================ */

async function submitStageReview(action, reason) {
    if (!getStaffId() || !currentRegNo) {
        showToast(
            "Staff ID or student registration number is missing.",
            "error"
        );

        return;
    }

    const approveButton = $("approveStudentBtn");
    const rejectButton = $("rejectStudentBtn");

    isSubmittingReview = true;

    [approveButton, rejectButton].forEach(button => {
        if (button) button.disabled = true;
    });

    const originalApproveText = approveButton?.textContent;
    const originalRejectText = rejectButton?.textContent;

    if (action === "approve" && approveButton) {
        approveButton.textContent = "Approving…";
    }

    if (action === "reject" && rejectButton) {
        rejectButton.textContent = "Rejecting…";
    }

    try {
        const body = {
            staff_id: getStaffId(),
            reg_no: currentRegNo,
            action
        };

        if (action === "reject") {
            body.reason = reason;
        }

        const response = await apiRequest(
            ENDPOINTS.reviewStage,
            {
                method: "POST",
                body: JSON.stringify(body)
            }
        );

        canReviewCurrentStage = false;

        hide("approveStudentBtn");
        hide("rejectStudentBtn");

        let message =
            response.message ||
            `Stage ${action} action completed.`;

        if (response.email_sent === false) {
            message +=
                " The database update succeeded, but the email could not be confirmed as sent.";
        } else if (action === "approve" && response.next_stage) {
            message +=
                ` The next stage is ${normalizeStage(response.next_stage)}.`;
        }

        showPageMessage(
            message,
            action === "reject" ? "warning" : "success"
        );

        showToast(
            message,
            response.email_sent === false
                ? "warning"
                : "success"
        );

        // Refresh the student record so the latest backend state appears.
        await loadStudentDetails({ silent: true });

    } catch (error) {
        console.error(
            `Unable to ${action} the current stage:`,
            error
        );

        showPageMessage(
            error.message || `Unable to ${action} this stage.`,
            "error"
        );

        showToast(
            error.message || `Unable to ${action} this stage.`,
            "error"
        );

    } finally {
        isSubmittingReview = false;

        if (approveButton) {
            approveButton.disabled = false;

            approveButton.textContent =
                originalApproveText || "Approve Submission";
        }

        if (rejectButton) {
            rejectButton.disabled = false;

            rejectButton.textContent =
                originalRejectText || "Reject Submission";
        }
    }
}

/* ============================================================
   20. REVIEW AND REFRESH BUTTONS
============================================================ */

function initializeReviewButtons() {
    $("approveStudentBtn")?.addEventListener(
        "click",
        approveCurrentStage
    );

    $("rejectStudentBtn")?.addEventListener(
        "click",
        rejectCurrentStage
    );

    $("refreshStudentDetailsBtn")?.addEventListener(
        "click",
        () => loadStudentDetails()
    );
}

/* ============================================================
   21. INITIALIZE THE PAGE
============================================================ */

async function initializeStudentDetailsPage() {
    currentRegNo = String(
        queryParams.get("reg_no") || ""
    ).trim().toUpperCase();

    if (!ensureStaffSession()) {
        return;
    }

    renderStaffHeader();

    initializeSidebar();
    initializeLogout();
    initializeBackLink();
    initializeReviewButtons();

    if (queryParams.get("otp_verified") === "1") {
        show("otpVerifiedNotice");

        const storedMessage = sessionStorage.getItem(
            "uniclear_stage_otp_notice"
        );

        if (storedMessage) {
            setText("otpVerifiedNotice", storedMessage);

            sessionStorage.removeItem(
                "uniclear_stage_otp_notice"
            );
        }
    }

    if (!currentRegNo) {
        showPageError(
            "The student registration number is missing. Return to Clearance Work and open a student's record."
        );

        hide("pageLoadingNotice");
        return;
    }

    await loadStudentDetails();
}

/* ============================================================
   22. DOM READY
============================================================ */

if (document.readyState === "loading") {
    document.addEventListener(
        "DOMContentLoaded",
        initializeStudentDetailsPage
    );
} else {
    initializeStudentDetailsPage();
}