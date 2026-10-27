/* ============================================================
   UNICLEAR STUDENT CLEARANCE SYSTEM
   FILE: Frontend/js/current-stage-students.js

   CURRENT-STAGE STUDENTS PAGE

   FEATURES:
   1. Restore the logged-in staff profile.
   2. Display staff name, role and assigned stage.
   3. Load students for the logged-in officer's current stage.
   4. Display total, pending, approved and rejected statistics.
   5. Search student records by name or registration number.
   6. Filter records by stage/document status.
   7. Display department, faculty, document and submission date.
   8. Open the separate Student Details page.
   9. Refresh student records.
  10. Support mobile sidebar navigation.
  11. Provide loading, empty, success and error messages.
  12. Support staff logout.

   API BASE:
   https://uniclear-student-platform.vercel.app

   STUDENT LIST ENDPOINT:
   POST /api/v1/clearance/staff/students

   REQUEST BODY:
   {
       "staff_id": "FIN001",
       "view": "current"
   }

   No bearer-token authentication is introduced.
============================================================ */


/* ============================================================
   1. API CONFIGURATION
============================================================ */

"use strict";

const API_BASE_URL =
    "https://uniclear-student-platform.vercel.app";

const STAFF_STUDENTS_ENDPOINT =
    "/api/v1/clearance/staff/students";

const LOGIN_PAGE = "login.html";
const STAFF_DASHBOARD_PAGE = "staff-dashboard.html";
const STUDENT_DETAILS_PAGE = "student-details.html";


/* ============================================================
   2. APPLICATION STATE
============================================================ */

let staffProfile = null;

let allStudentRecords = [];
let filteredStudentRecords = [];

let serverCounts = {};

let isLoadingStudents = false;

let selectedStatus = "all";
let currentSearchTerm = "";


/* ============================================================
   3. DOM HELPERS
============================================================ */

function getElement(id) {
    return document.getElementById(id);
}

function setText(id, value, fallback = "—") {
    const element = getElement(id);

    if (!element) return;

    if (
        value === null ||
        value === undefined ||
        value === ""
    ) {
        element.textContent = fallback;
    } else {
        element.textContent = String(value);
    }
}

function showElement(id) {
    const element = getElement(id);

    if (element) {
        element.hidden = false;
    }
}

function hideElement(id) {
    const element = getElement(id);

    if (element) {
        element.hidden = true;
    }
}

function normalizeStatus(value) {
    return String(value || "unknown")
        .trim()
        .toLowerCase()
        .replace(/[\s-]+/g, "_");
}

function normalizeStage(value) {
    return String(value || "")
        .trim()
        .toLowerCase()
        .replace(/[\s-]+/g, "_");
}

function formatStage(value) {
    const labels = {
        finance: "Finance",
        department: "Department",
        faculty: "Faculty",
        library: "Library",
        health: "Health",
        student_affairs: "Student Affairs",
        final: "Final Clearance"
    };

    const normalized = normalizeStage(value);

    return labels[normalized] ||
        String(value || "Not assigned")
            .replace(/[_-]+/g, " ")
            .replace(/\b\w/g, character => character.toUpperCase());
}


/* ============================================================
   CORRECTION: MISSING TITLE-CASE FUNCTION

   renderStaffHeader() and getStatusLabel() use this function.
   Without it, page initialization throws a ReferenceError
   before loadCurrentStageStudents() can execute.
============================================================ */

function titleCase(value) {
    return String(value || "")
        .replace(/[_-]+/g, " ")
        .replace(/\b\w/g, character => character.toUpperCase());
}


function getInitials(name) {
    const parts = String(name || "SM")
        .trim()
        .split(/\s+/)
        .filter(Boolean);

    return parts
        .slice(0, 2)
        .map(part => part.charAt(0).toUpperCase())
        .join("") || "SM";
}

function getFullName(profile) {
    if (!profile) return "Staff Member";

    const parts = [
        profile.first_name,
        profile.other_names,
        profile.surname
    ]
        .filter(value =>
            typeof value === "string" &&
            value.trim()
        )
        .map(value => value.trim());

    return parts.join(" ") ||
        profile.full_name ||
        profile.name ||
        "Staff Member";
}

function isTrue(value) {
    return value === true ||
        String(value).toLowerCase() === "true";
}


/* ============================================================
   4. STAFF SESSION MANAGEMENT

   Supports the storage conventions used by the
   UniClear Staff Dashboard.
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
                parsed?.data?.staff_id
                    ? parsed.data
                    : parsed?.data?.staff?.staff_id
                        ? parsed.data.staff
                        : parsed?.staff?.staff_id
                            ? parsed.staff
                            : parsed?.user?.staff_id
                                ? parsed.user
                                : parsed;

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
                `Unable to read stored staff profile: ${key}`,
                error
            );
        }
    }

    /*
     * Fallback for installations where the login page
     * stores the staff ID and profile fields separately.
     */
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

function ensureStaffSession() {
    staffProfile = readStoredStaffProfile();

    if (!staffProfile?.staff_id) {
        showPageError(
            "Your staff session could not be found. Please sign in again."
        );

        return false;
    }

    const accountType =
        sessionStorage.getItem("uniclear_user_role");

    if (
        accountType &&
        accountType.toLowerCase() !== "staff"
    ) {
        showPageError(
            "This page is available to staff accounts only."
        );

        return false;
    }

    return true;
}

function getAccountStatus() {
    return normalizeStatus(
        staffProfile?.account_status ||
        staffProfile?.status ||
        "active"
    );
}

function isAccountActive() {
    return ["active", "enabled"].includes(getAccountStatus());
}

function mustChangePassword() {
    return isTrue(staffProfile?.must_change_password);
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
        response = await fetch(
            `${API_BASE_URL}${endpoint}`,
            {
                ...options,
                headers
            }
        );
    } catch (error) {
        throw new Error(
            "Unable to connect to the UniClear server. Check your internet connection and API URL."
        );
    }

    const contentType =
        response.headers.get("content-type") || "";

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
   6. PAGE NOTICES AND TOASTS
============================================================ */

function showPageError(message) {
    const box = getElement("pageErrorNotice");

    if (box) {
        box.textContent = message;
        box.className = "notice notice-error";
        box.hidden = false;
    }

    hideElement("loadingNotice");

    setText("studentListInfo", message);
}

function showPageSuccess(message) {
    const box = getElement("pageSuccessNotice");

    if (!box) return;

    box.textContent = message;
    box.className = "notice notice-success";
    box.hidden = false;
}

function showPageMessage(message, type = "info") {
    const box = getElement("pageMessageNotice");

    if (!box) return;

    box.textContent = message;
    box.className = `notice notice-${type}`;
    box.hidden = false;
}

function showToast(message, type = "info") {
    let container = getElement("toastContainer");

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

    const messageElement = document.createElement("span");

    messageElement.textContent =
        String(message || "Please try again.");

    toast.appendChild(messageElement);
    container.appendChild(toast);

    window.setTimeout(() => {
        toast.style.opacity = "0";
        toast.style.transform = "translateX(10px)";

        window.setTimeout(
            () => toast.remove(),
            250
        );
    }, 4500);
}


/* ============================================================
   7. STAFF PROFILE AND HEADER
============================================================ */

function renderStaffHeader() {
    if (!staffProfile) return;

    const fullName = getFullName(staffProfile);
    const role = staffProfile.role || "Clearance Officer";
    const stage = formatStage(staffProfile.assigned_stage);

    setText("sidebarStaffName", fullName);
    setText("sidebarStaffRole", role);

    setText("topbarStaffName", fullName);
    setText("topbarStaffRole", role);

    setText("assignedStageHeading", stage);

    setText(
        "assignedStageDescription",
        `You are assigned to the ${stage} clearance stage. This list is retrieved using your staff ID and the current-stage view.`
    );

    setText(
        "staffAccountStatus",
        titleCase(getAccountStatus())
    );

    const accountBadge = getElement("staffAccountStatus");

    if (accountBadge) {
        accountBadge.className =
            `status-pill ${
                isAccountActive()
                    ? "status-active"
                    : "status-inactive"
            }`;
    }

    const initials = getInitials(fullName);

    ["sidebarAvatar", "topbarAvatar"].forEach(id => {
        const avatar = getElement(id);

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


/* ============================================================
   8. MOBILE SIDEBAR
============================================================ */

function initializeSidebar() {
    const sidebar = getElement("sidebar");
    const overlay = getElement("sidebarOverlay");

    function openSidebar() {
        sidebar?.classList.add("is-open");

        if (overlay) {
            overlay.hidden = false;
        }
    }

    function closeSidebar() {
        sidebar?.classList.remove("is-open");

        if (overlay) {
            overlay.hidden = true;
        }
    }

    getElement("menuToggleBtn")?.addEventListener(
        "click",
        openSidebar
    );

    getElement("closeSidebarBtn")?.addEventListener(
        "click",
        closeSidebar
    );

    overlay?.addEventListener("click", closeSidebar);

    document.addEventListener("keydown", event => {
        if (event.key === "Escape") {
            closeSidebar();
        }
    });

    getElement("topbarProfileBtn")?.addEventListener(
        "click",
        () => {
            window.location.href =
                `${STAFF_DASHBOARD_PAGE}#staff-profile`;
        }
    );

    document.querySelectorAll(".sidebar .nav-link").forEach(link => {
        link.addEventListener("click", closeSidebar);
    });
}


/* ============================================================
   9. STAFF LOGOUT
============================================================ */

function initializeLogout() {
    getElement("logoutBtn")?.addEventListener("click", () => {
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
    });
}


/* ============================================================
   10. STUDENT RECORD HELPERS
============================================================ */

function getRecordRegNo(record) {
    return String(
        record?.reg_no ||
        record?.registration_number ||
        record?.student?.reg_no ||
        ""
    ).trim().toUpperCase();
}

function getRecordName(record) {
    const student = record?.student || {};

    const assembledName = [
        student.first_name,
        student.other_names,
        student.surname
    ]
        .filter(Boolean)
        .join(" ");

    return (
        record?.student_name ||
        record?.full_name ||
        record?.name ||
        student.full_name ||
        assembledName ||
        "Student"
    );
}

function getRecordDepartment(record) {
    return (
        record?.department ||
        record?.student?.department ||
        "—"
    );
}

function getRecordFaculty(record) {
    return (
        record?.faculty ||
        record?.student?.faculty ||
        "—"
    );
}

function getRecordStage(record) {
    return normalizeStage(
        record?.assigned_stage ||
        record?.stage ||
        record?.current_stage ||
        staffProfile?.assigned_stage ||
        ""
    );
}

function getRawRecordStatus(record) {
    /*
     * document_status identifies the latest document's
     * status when it is available.
     *
     * stage_status describes the current stage record.
     */
    return normalizeStatus(
        record?.document_status ||
        record?.stage_status ||
        record?.latest_document?.status ||
        record?.status ||
        "unknown"
    );
}

function getRecordDate(record) {
    const rawDate =
        record?.uploaded_at ||
        record?.latest_document?.uploaded_at ||
        record?.submitted_at ||
        record?.updated_at ||
        "";

    if (!rawDate) {
        return "—";
    }

    const date = new Date(rawDate);

    if (Number.isNaN(date.getTime())) {
        return String(rawDate);
    }

    return date.toLocaleString("en-NG", {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit"
    });
}

function getRecordDocument(record) {
    const document =
        record?.latest_document ||
        record?.document ||
        {};

    return (
        document.document_name ||
        document.original_filename ||
        document.file_name ||
        record?.document_name ||
        (
            Number(record?.document_count) > 0
                ? "Submitted document"
                : "No document submitted"
        )
    );
}

function getStatusClass(status) {
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

function getStatusLabel(status) {
    const labels = {
        under_review: "Under Review",
        awaiting_submission: "Awaiting Document",
        approved: "Approved",
        rejected: "Rejected",
        completed: "Completed",
        pending: "Pending",
        in_progress: "In Progress",
        unknown: "Unknown"
    };

    return labels[status] || titleCase(status);
}


/* ============================================================
   11. COUNT RECORDS FOR THE STATISTICS CARDS
============================================================ */

function getReviewStatus(record) {
    return getRawRecordStatus(record);
}

function calculateStatistics(records) {
    const pending = records.filter(record => {
        return (
            record.is_pending_review === true ||
            getReviewStatus(record) === "under_review"
        );
    });

    const approved = records.filter(record => {
        return (
            getReviewStatus(record) === "approved" ||
            (
                record.was_processed_by_staff === true &&
                record.latest_review?.action === "approve"
            )
        );
    });

    const rejected = records.filter(record => {
        return (
            getReviewStatus(record) === "rejected" ||
            record.was_rejected_by_staff === true
        );
    });

    return {
        total: records.length,
        pending: pending.length,
        approved: approved.length,
        rejected: rejected.length
    };
}

function renderStatistics(records, counts = {}) {
    const statistics = calculateStatistics(records);

    /*
     * Use the server counts when supplied.
     * Otherwise calculate visible-stage statistics from the rows.
     */
    const total =
        counts.current ??
        counts.total ??
        records.length;

    const pending =
        counts.pending_review ??
        statistics.pending;

    const approved =
        counts.approved ??
        counts.processed ??
        statistics.approved;

    const rejected =
        counts.rejected ??
        statistics.rejected;

    setText("totalStudentsCount", total);
    setText("pendingReviewCount", pending);
    setText("approvedStudentsCount", approved);
    setText("rejectedStudentsCount", rejected);

    setText(
        "studentsCount",
        `${records.length} record${records.length === 1 ? "" : "s"}`
    );

    setText(
        "tableRecordCount",
        `${records.length} record${records.length === 1 ? "" : "s"}`
    );
}


/* ============================================================
   12. SAFE TABLE-CELL HELPERS
============================================================ */

function appendCell(row, value, className = "") {
    const cell = document.createElement("td");

    cell.textContent = String(value ?? "—");

    if (className) {
        cell.className = className;
    }

    row.appendChild(cell);

    return cell;
}

function appendStatusCell(row, status) {
    const cell = document.createElement("td");
    const badge = document.createElement("span");

    badge.className =
        `status-pill ${getStatusClass(status)}`;

    badge.textContent = getStatusLabel(status);

    cell.appendChild(badge);
    row.appendChild(cell);

    return cell;
}

function renderEmptyTable(message) {
    const tbody = getElement("currentStageStudentsTableBody");

    if (!tbody) return;

    tbody.replaceChildren();

    const row = document.createElement("tr");
    const cell = document.createElement("td");

    cell.colSpan = 8;
    cell.className = "table-empty";
    cell.textContent = message;

    row.appendChild(cell);
    tbody.appendChild(row);
}

function renderLoadingTable() {
    renderEmptyTable("Loading student records…");
}


/* ============================================================
   13. OPEN STUDENT DETAILS
============================================================ */

function openStudentDetails(record) {
    const regNo = getRecordRegNo(record);

    if (!regNo) {
        showToast(
            "The selected student record has no registration number.",
            "error"
        );

        return;
    }

    const stage =
        normalizeStage(
            record?.assigned_stage ||
            record?.current_stage ||
            staffProfile?.assigned_stage
        );

    const destination = new URL(
        STUDENT_DETAILS_PAGE,
        window.location.href
    );

    destination.searchParams.set("reg_no", regNo);

    if (stage) {
        destination.searchParams.set("stage", stage);
    }

    destination.searchParams.set(
        "return_to",
        "current-stage-students.html"
    );

    window.location.href = destination.href;
}


/* ============================================================
   14. RENDER THE STUDENT TABLE
============================================================ */

function renderStudentTable(records) {
    const tbody = getElement("currentStageStudentsTableBody");

    if (!tbody) return;

    tbody.replaceChildren();

    if (!records.length) {
        renderEmptyTable(
            allStudentRecords.length
                ? "No student records match your search and status filters."
                : "No student records are currently available for your assigned clearance stage."
        );

        return;
    }

    records.forEach(record => {
        const row = document.createElement("tr");

        const regNo = getRecordRegNo(record);
        const status = getRawRecordStatus(record);

        /*
         * Student name cell
         */
        const nameCell = document.createElement("td");
        const nameContainer = document.createElement("div");
        const nameStrong = document.createElement("strong");

        nameContainer.className = "student-name-cell";
        nameStrong.textContent = getRecordName(record);

        nameContainer.appendChild(nameStrong);
        nameCell.appendChild(nameContainer);
        row.appendChild(nameCell);

        /*
         * Registration number
         */
        appendCell(
            row,
            regNo || "—",
            "registration-number"
        );

        /*
         * Department and faculty
         */
        appendCell(row, getRecordDepartment(record));
        appendCell(row, getRecordFaculty(record));

        /*
         * Latest submitted document
         */
        appendCell(
            row,
            getRecordDocument(record),
            "document-name-cell"
        );

        /*
         * Upload/submission date
         */
        appendCell(row, getRecordDate(record));

        /*
         * Current stage status
         */
        appendStatusCell(row, status);

        /*
         * Open Student Details button
         */
        const actionCell = document.createElement("td");
        const detailsButton = document.createElement("button");

        detailsButton.type = "button";
        detailsButton.className = "view-student-button";

        detailsButton.textContent =
            status === "under_review"
                ? "Review"
                : "View Details";

        detailsButton.setAttribute(
            "aria-label",
            `${status === "under_review" ? "Review" : "View"} ${getRecordName(record)}`
        );

        detailsButton.addEventListener("click", () => {
            openStudentDetails(record);
        });

        actionCell.appendChild(detailsButton);
        row.appendChild(actionCell);

        tbody.appendChild(row);
    });
}


/* ============================================================
   15. SEARCH AND STATUS FILTERS
============================================================ */

function applyStudentFilters() {
    const searchInput = getElement("studentSearch");
    const statusFilter = getElement("studentStatusFilter");

    currentSearchTerm = String(searchInput?.value || "")
        .trim()
        .toLowerCase();

    selectedStatus = String(statusFilter?.value || "all")
        .trim()
        .toLowerCase();

    filteredStudentRecords = allStudentRecords.filter(record => {
        const name = getRecordName(record).toLowerCase();
        const regNo = getRecordRegNo(record).toLowerCase();
        const department = String(getRecordDepartment(record)).toLowerCase();
        const faculty = String(getRecordFaculty(record)).toLowerCase();

        const recordStatus = getRawRecordStatus(record);

        const matchesSearch =
            !currentSearchTerm ||
            name.includes(currentSearchTerm) ||
            regNo.includes(currentSearchTerm) ||
            department.includes(currentSearchTerm) ||
            faculty.includes(currentSearchTerm);

        const matchesStatus =
            selectedStatus === "all" ||
            recordStatus === selectedStatus;

        return matchesSearch && matchesStatus;
    });

    renderStudentTable(filteredStudentRecords);

    setText(
        "studentsCount",
        `${filteredStudentRecords.length} record${filteredStudentRecords.length === 1 ? "" : "s"}`
    );

    setText(
        "tableRecordCount",
        `${filteredStudentRecords.length} record${filteredStudentRecords.length === 1 ? "" : "s"}`
    );

    setText(
        "tableFooterMessage",
        `Showing ${filteredStudentRecords.length} of ${allStudentRecords.length} student record${allStudentRecords.length === 1 ? "" : "s"}.`
    );
}

function initializeStudentFilters() {
    getElement("studentSearch")?.addEventListener(
        "input",
        applyStudentFilters
    );

    getElement("studentStatusFilter")?.addEventListener(
        "change",
        applyStudentFilters
    );

    getElement("resetStudentFiltersBtn")?.addEventListener(
        "click",
        () => {
            const searchInput = getElement("studentSearch");
            const statusFilter = getElement("studentStatusFilter");

            if (searchInput) {
                searchInput.value = "";
            }

            if (statusFilter) {
                statusFilter.value = "all";
            }

            currentSearchTerm = "";
            selectedStatus = "all";

            applyStudentFilters();
        }
    );
}


/* ============================================================
   16. LOAD CURRENT-STAGE STUDENTS

   POST /api/v1/clearance/staff/students

   Request:
   {
       "staff_id": "FIN001",
       "view": "current"
   }

   Response fields confirmed from Postman:
   {
       "success": true,
       "staff": {},
       "assigned_stage": "finance",
       "view": "current",
       "counts": {},
       "total": 0,
       "data": []
   }
============================================================ */

async function loadCurrentStageStudents() {
    if (isLoadingStudents) return;

    if (!getStaffId()) {
        showPageError(
            "Your staff ID is missing. Sign in again before loading student records."
        );

        return;
    }

    if (!staffProfile?.assigned_stage) {
        showPageError(
            "Your assigned clearance stage was not found in the stored staff profile."
        );

        return;
    }

    isLoadingStudents = true;

    const refreshButton = getElement("refreshStudentsBtn");
    const tableRefreshButton = getElement("tableRefreshBtn");

    const buttons = [
        refreshButton,
        tableRefreshButton
    ].filter(Boolean);

    buttons.forEach(button => {
        button.disabled = true;

        button.dataset.originalText =
            button.textContent;

        button.textContent = "Loading…";
    });

    showElement("loadingNotice");
    hideElement("pageErrorNotice");
    hideElement("pageSuccessNotice");
    hideElement("pageMessageNotice");

    renderLoadingTable();

    setText(
        "studentListInfo",
        `Loading students assigned to ${formatStage(staffProfile.assigned_stage)}…`
    );

    try {
        const response = await apiRequest(
            STAFF_STUDENTS_ENDPOINT,
            {
                method: "POST",

                body: JSON.stringify({
                    staff_id: getStaffId(),
                    view: "current"
                })
            }
        );

        /*
         * Handle the exact response shape returned by the
         * current backend, where records are in response.data.
         */
        let records = Array.isArray(response.data)
            ? response.data
            : Array.isArray(response.students)
                ? response.students
                : Array.isArray(response.data?.students)
                    ? response.data.students
                    : [];

        if (
            !records.length &&
            Array.isArray(response.data?.records)
        ) {
            records = response.data.records;
        }

        serverCounts =
            response.counts ||
            response.data?.counts ||
            {};

        /*
         * Keep the backend's staff assignment information
         * current if the response supplies it.
         */
        if (
            response.staff &&
            String(response.staff.staff_id) === getStaffId()
        ) {
            staffProfile = {
                ...staffProfile,
                ...response.staff,

                assigned_stage:
                    response.assigned_stage ||
                    response.staff.assigned_stage ||
                    staffProfile.assigned_stage
            };

            renderStaffHeader();
        }

        allStudentRecords = records;

        /*
         * Do not fabricate student rows from counts.
         * The table must display actual records returned in data.
         */
        renderStatistics(allStudentRecords, serverCounts);

        applyStudentFilters();

        const stageName = formatStage(
            response.assigned_stage ||
            staffProfile.assigned_stage
        );

        if (allStudentRecords.length) {
            setText(
                "studentListInfo",
                `${allStudentRecords.length} student record${allStudentRecords.length === 1 ? "" : "s"} loaded for ${stageName}. Select a student's record to view their details.`
            );

            setText(
                "tableFooterMessage",
                `Loaded ${allStudentRecords.length} student record${allStudentRecords.length === 1 ? "" : "s"} for ${stageName}.`
            );

        } else {
            setText(
                "studentListInfo",
                `No student records were returned for your ${stageName} stage.`
            );

            setText(
                "tableFooterMessage",
                `No current-stage records are available for ${stageName}.`
            );
        }

        if (mustChangePassword()) {
            showPageMessage(
                "Your staff account requires a password change before you can perform clearance actions.",
                "warning"
            );
        } else if (!isAccountActive()) {
            showPageMessage(
                "Your staff account is not active. Contact the system administrator.",
                "error"
            );
        }

    } catch (error) {
        console.error(
            "Unable to load current-stage student records:",
            error
        );

        allStudentRecords = [];
        filteredStudentRecords = [];
        serverCounts = {};

        renderStatistics([], {});

        renderEmptyTable(
            error.message ||
            "Unable to load student records. Please try again."
        );

        showPageError(
            error.message ||
            "Unable to load student records."
        );

        setText(
            "tableFooterMessage",
            "Student records could not be loaded."
        );

        showToast(
            error.message ||
            "Unable to load student records.",
            "error"
        );

    } finally {
        isLoadingStudents = false;

        hideElement("loadingNotice");

        buttons.forEach(button => {
            button.disabled = false;

            button.textContent =
                button.dataset.originalText ||
                (
                    button.id === "tableRefreshBtn"
                        ? "↻ Refresh"
                        : "↻ Refresh Students"
                );
        });
    }
}


/* ============================================================
   17. REFRESH CONTROLS
============================================================ */

function initializeRefreshButtons() {
    getElement("refreshStudentsBtn")?.addEventListener(
        "click",
        loadCurrentStageStudents
    );

    getElement("tableRefreshBtn")?.addEventListener(
        "click",
        loadCurrentStageStudents
    );
}


/* ============================================================
   18. INITIALIZE PAGE
============================================================ */

function initializeCurrentStageStudentsPage() {
    try {
        if (!ensureStaffSession()) {
            return;
        }

        renderStaffHeader();

        initializeSidebar();
        initializeLogout();
        initializeStudentFilters();
        initializeRefreshButtons();

        loadCurrentStageStudents().catch(error => {
            console.error(
                "Unexpected student-list loading error:",
                error
            );

            showPageError(
                error.message ||
                "An unexpected error occurred while loading student records."
            );

            hideElement("loadingNotice");
        });

        console.info(
            "UniClear Current-Stage Students page initialized."
        );

    } catch (error) {
        console.error(
            "Current-Stage Students initialization failed:",
            error
        );

        showPageError(
            error.message ||
            "The Current-Stage Students page could not be initialized."
        );

        hideElement("loadingNotice");
    }
}


/* ============================================================
   19. DOM READY
============================================================ */

if (document.readyState === "loading") {
    document.addEventListener(
        "DOMContentLoaded",
        initializeCurrentStageStudentsPage
    );
} else {
    initializeCurrentStageStudentsPage();
}