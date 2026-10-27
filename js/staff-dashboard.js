/* ============================================================
   UNICLEAR STUDENT CLEARANCE SYSTEM
   FILE: Frontend/Staff Interface/js/staff-dashboard.js

   STAFF DASHBOARD FEATURES
   1. Restore the logged-in staff profile.
   2. Render the staff name, role, stage and profile information.
   3. Navigate dashboard sections.
   4. Support mobile sidebar navigation.
   5. Load student records from the staff-listing API.
   6. Search and filter clearance records.
   7. Open a separate student-details page for each record.
   8. Verify stage-transfer OTPs and open the student's details.
   9. Change staff password.
  10. Toggle current/new/confirm password visibility.
  11. Refresh dashboard/profile data and log out.

   API BASE:
   https://uniclear-student-platform.vercel.app

   This script does not introduce bearer-token authentication.
============================================================ */

"use strict";

/* ============================================================
   1. API CONFIGURATION
============================================================ */

const API_BASE_URL = "https://uniclear-student-platform.vercel.app";

const STAFF_ENDPOINTS = {
    listStudents: "/api/v1/clearance/staff/students",
    verifyStageOtp: "/api/v1/clearance/staff/verify-stage-otp",
    changePassword: "/api/v1/clearance/change-password/staff"
};

const LOGIN_PAGE = "login.html";
const STUDENT_DETAILS_PAGE = "student-details.html";

/* ============================================================
   2. APPLICATION STATE
============================================================ */

let staffProfile = null;
let clearanceRecords = [];
let isSubmitting = false;
let activeSection = "dashboard";

/* ============================================================
   3. DOM AND VALUE HELPERS
============================================================ */

const getElement = id => document.getElementById(id);

function setText(id, value, fallback = "—") {
    const element = getElement(id);
    if (!element) return;

    if (value === null || value === undefined || value === "") {
        element.textContent = fallback;
    } else {
        element.textContent = String(value);
    }
}

function showElement(id) {
    const element = getElement(id);
    if (element) element.hidden = false;
}

function hideElement(id) {
    const element = getElement(id);
    if (element) element.hidden = true;
}

function normalizeStage(value) {
    if (!value) return "Not assigned";

    return String(value)
        .replace(/[_-]+/g, " ")
        .replace(/\b\w/g, letter => letter.toUpperCase());
}

function getFullName(profile) {
    if (!profile) return "Staff Member";

    const parts = [profile.first_name, profile.other_names, profile.surname]
        .filter(value => typeof value === "string" && value.trim())
        .map(value => value.trim());

    return parts.join(" ") || profile.full_name || profile.name || "Staff Member";
}

function getInitials(name) {
    const parts = String(name || "SM").trim().split(/\s+/).filter(Boolean);

    return parts
        .slice(0, 2)
        .map(part => part.charAt(0).toUpperCase())
        .join("") || "SM";
}

function getStaffId() {
    return (
        staffProfile?.staff_id ||
        sessionStorage.getItem("uniclear_staff_id") ||
        localStorage.getItem("staff_id") ||
        sessionStorage.getItem("staff_id") ||
        ""
    );
}

function isTrue(value) {
    return value === true || String(value).toLowerCase() === "true";
}

function isPasswordChangeRequired(profile = staffProfile) {
    return isTrue(profile?.must_change_password);
}

function getAccountStatus(profile = staffProfile) {
    return String(profile?.account_status || profile?.status || "active")
        .trim()
        .toLowerCase();
}

function isAccountActive() {
    return ["active", "enabled"].includes(getAccountStatus());
}

function normalizeRegNo(value) {
    return String(value || "").trim().toUpperCase();
}

/* ============================================================
   4. STAFF SESSION RESTORE AND SAVE
============================================================ */

function readStoredProfile() {
    const profileKeys = [
        "uniclear_staff",
        "staffProfile",
        "staff",
        "loggedInStaff",
        "currentStaff",
        "user"
    ];

    for (const key of profileKeys) {
        try {
            const raw = sessionStorage.getItem(key) || localStorage.getItem(key);
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

            if (!candidate || !staffId) continue;

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
            console.warn(`Could not read staff profile from ${key}.`, error);
        }
    }

    const staffId =
        sessionStorage.getItem("uniclear_staff_id") ||
        localStorage.getItem("staff_id") ||
        sessionStorage.getItem("staff_id");

    if (!staffId) return null;

    return {
        staff_id: staffId,
        first_name: localStorage.getItem("staff_first_name") || "",
        other_names: localStorage.getItem("staff_other_names") || "",
        surname: localStorage.getItem("staff_surname") || "",
        email: localStorage.getItem("staff_email") || "",
        role:
            sessionStorage.getItem("uniclear_staff_role") ||
            localStorage.getItem("staff_role") ||
            "",
        assigned_stage:
            sessionStorage.getItem("uniclear_assigned_stage") ||
            localStorage.getItem("assigned_stage") ||
            "",
        department: localStorage.getItem("staff_department") || "",
        faculty: localStorage.getItem("staff_faculty") || "",
        account_status: localStorage.getItem("account_status") || "active",
        must_change_password: isTrue(localStorage.getItem("must_change_password"))
    };
}

function saveStoredProfile(profile) {
    if (!profile?.staff_id) return;

    try {
        sessionStorage.setItem("uniclear_staff", JSON.stringify(profile));
        sessionStorage.setItem("uniclear_staff_id", profile.staff_id);
        sessionStorage.setItem("uniclear_user_role", "staff");
        sessionStorage.setItem("uniclear_staff_role", profile.role || "");
        sessionStorage.setItem("uniclear_assigned_stage", profile.assigned_stage || "");

        localStorage.setItem("staffProfile", JSON.stringify(profile));
        localStorage.setItem("staff_id", profile.staff_id);
        localStorage.setItem("staff_first_name", profile.first_name || "");
        localStorage.setItem("staff_other_names", profile.other_names || "");
        localStorage.setItem("staff_surname", profile.surname || "");
        localStorage.setItem("staff_email", profile.email || "");
        localStorage.setItem("staff_role", profile.role || "");
        localStorage.setItem("assigned_stage", profile.assigned_stage || "");
        localStorage.setItem("staff_department", profile.department || "");
        localStorage.setItem("staff_faculty", profile.faculty || "");
        localStorage.setItem("account_status", profile.account_status || "active");
        localStorage.setItem(
            "must_change_password",
            String(Boolean(profile.must_change_password))
        );
    } catch (error) {
        console.error("Could not save staff profile to browser storage.", error);
    }
}

function requireStaffSession() {
    staffProfile = readStoredProfile();

    if (!staffProfile?.staff_id) {
        showToast(
            "Your staff session could not be found. Please sign in again.",
            "error"
        );
        return false;
    }

    const accountType = sessionStorage.getItem("uniclear_user_role");
    if (accountType && accountType.toLowerCase() !== "staff") {
        showToast("This dashboard is for staff accounts.", "error");
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
            "Unable to connect to the server. Check your internet connection and API URL."
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
            message: responseText || "The server returned an unexpected response."
        };
    }

    if (!response.ok || data.success === false) {
        const error = new Error(
            data.message || data.error || `The request failed (${response.status}).`
        );
        error.status = response.status;
        error.data = data;
        throw error;
    }

    return data;
}

/* ============================================================
   6. TOAST NOTIFICATIONS
============================================================ */

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
    toast.setAttribute("role", type === "error" ? "alert" : "status");

    const messageElement = document.createElement("span");
    messageElement.textContent = String(message || "Please try again.");
    toast.appendChild(messageElement);
    container.appendChild(toast);

    window.setTimeout(() => {
        toast.style.opacity = "0";
        toast.style.transform = "translateX(10px)";
        window.setTimeout(() => toast.remove(), 250);
    }, 4500);
}

function showInlineNotice(id, message, type = "info") {
    const element = getElement(id);
    if (!element) return;

    element.className = `notice notice-${type}`;
    element.textContent = message;
    element.hidden = false;
}

/* ============================================================
   7. STAFF PROFILE DISPLAY
============================================================ */

function renderStaffProfile() {
    if (!staffProfile) return;

    const fullName = getFullName(staffProfile);
    const role = staffProfile.role || "Clearance Officer";
    const stage = normalizeStage(staffProfile.assigned_stage);
    const status = getAccountStatus();
    const accountActive = isAccountActive();
    const mustChangePassword = isPasswordChangeRequired();

    setText("welcomeHeading", `Welcome back, ${fullName}`);

    setText(
        "welcomeMessage",
        `You are signed in as ${role}. Review your assigned clearance work and keep student clearance moving forward.`
    );

    setText("welcomeStage", `Assigned stage: ${stage}`);
    setText("assignedStageName", stage);

    setText(
        "assignedStageDescription",
        `You are responsible for reviewing clearance submissions at the ${stage} stage.`
    );

    setText("sidebarStaffName", fullName);
    setText("sidebarStaffRole", role);
    setText("topbarStaffName", fullName);
    setText("topbarStaffRole", role);

    setText("profileFullName", fullName);
    setText("profileRole", role);
    setText("profileStaffId", staffProfile.staff_id);
    setText("profileEmail", staffProfile.email);
    setText("profileDepartment", staffProfile.department);
    setText("profileFaculty", staffProfile.faculty);
    setText("profileAssignedStage", stage);

    ["sidebarAvatar", "topbarAvatar", "profileAvatar"].forEach(id => {
        const avatar = getElement(id);
        if (avatar) {
            avatar.textContent = getInitials(fullName);
            avatar.setAttribute("aria-label", fullName);
        }
    });

    const badgeText = normalizeStage(status);
    const profileBadge = getElement("profileAccountStatus");

    if (profileBadge) {
        profileBadge.textContent = badgeText;
        profileBadge.className =
            `status-pill ${accountActive ? "status-active" : "status-inactive"}`;
    }

    const accountBadge = getElement("accountStatusBadge");

    if (accountBadge) {
        accountBadge.textContent = badgeText;
        accountBadge.className =
            `status-pill ${accountActive ? "status-active" : "status-inactive"}`;
    }

    if (mustChangePassword) {
        showElement("passwordChangeNotice");
    } else {
        hideElement("passwordChangeNotice");
    }

    const verifyButton = getElement("verifyStageOtpBtn");

    if (verifyButton) {
        verifyButton.disabled = mustChangePassword || !accountActive;
    }
}

function renderCurrentDate() {
    setText(
        "currentDate",
        new Intl.DateTimeFormat("en-NG", {
            weekday: "long",
            day: "numeric",
            month: "long",
            year: "numeric"
        }).format(new Date())
    );

    setText("footerYear", new Date().getFullYear());
}

/* ============================================================
   8. SECTION NAVIGATION
============================================================ */

function showSection(sectionName, updateHash = true) {
    const target = getElement(sectionName);
    if (!target || !target.classList.contains("dashboard-section")) return;

    activeSection = sectionName;

    document.querySelectorAll(".dashboard-section").forEach(section => {
        section.hidden = section.id !== sectionName;
    });

    document.querySelectorAll(".nav-link[data-section]").forEach(link => {
        const isActive = link.dataset.section === sectionName;
        link.classList.toggle("active", isActive);

        if (isActive) {
            link.setAttribute("aria-current", "page");
        } else {
            link.removeAttribute("aria-current");
        }
    });

    setText("pageTitle", target.dataset.pageTitle || "Staff Dashboard");

    if (updateHash && window.history?.replaceState) {
        window.history.replaceState(null, "", `#${sectionName}`);
    }

    closeMobileSidebar();

    if (sectionName === "change-password") {
        window.setTimeout(() => getElement("currentPassword")?.focus(), 0);
    }

    window.scrollTo({ top: 0, behavior: "smooth" });
}

function initializeNavigation() {
    document.querySelectorAll(".nav-link[data-section]").forEach(link => {
        link.addEventListener("click", event => {
            event.preventDefault();
            showSection(link.dataset.section);
        });
    });

    document.querySelectorAll("[data-open-section]").forEach(button => {
        button.addEventListener("click", () => {
            showSection(button.dataset.openSection);
        });
    });

    getElement("topbarProfileBtn")?.addEventListener("click", () => {
        showSection("staff-profile");
    });

    const requestedSection = window.location.hash.replace(/^#/, "");

    if (
        requestedSection &&
        getElement(requestedSection)?.classList.contains("dashboard-section")
    ) {
        showSection(requestedSection, false);
    } else {
        showSection("dashboard", false);
    }

    window.addEventListener("hashchange", () => {
        const sectionName = window.location.hash.replace(/^#/, "");

        if (
            sectionName &&
            getElement(sectionName)?.classList.contains("dashboard-section")
        ) {
            showSection(sectionName, false);
        }
    });
}

/* ============================================================
   9. MOBILE SIDEBAR
============================================================ */

function openMobileSidebar() {
    getElement("sidebar")?.classList.add("is-open");

    const overlay = getElement("sidebarOverlay");
    if (overlay) overlay.hidden = false;
}

function closeMobileSidebar() {
    getElement("sidebar")?.classList.remove("is-open");

    const overlay = getElement("sidebarOverlay");
    if (overlay) overlay.hidden = true;
}

function initializeMobileNavigation() {
    getElement("menuToggleBtn")?.addEventListener(
        "click",
        openMobileSidebar
    );

    getElement("closeSidebarBtn")?.addEventListener(
        "click",
        closeMobileSidebar
    );

    getElement("sidebarOverlay")?.addEventListener(
        "click",
        closeMobileSidebar
    );

    document.addEventListener("keydown", event => {
        if (event.key === "Escape") closeMobileSidebar();
    });
}

/* ============================================================
   10. CLEARANCE RECORD HELPERS AND TABLES
============================================================ */

function getRecordRegNo(record) {
    return normalizeRegNo(
        record?.reg_no ||
        record?.registration_number ||
        record?.student?.reg_no ||
        ""
    );
}

function getRecordName(record) {
    const nestedStudent = record?.student || {};

    const name = [
        nestedStudent.first_name,
        nestedStudent.other_names,
        nestedStudent.surname
    ]
        .filter(Boolean)
        .join(" ");

    return (
        record?.student_name ||
        record?.full_name ||
        record?.name ||
        nestedStudent.full_name ||
        name ||
        "Student"
    );
}

function getRecordStage(record) {
    return String(
        record?.assigned_stage ||
        record?.stage ||
        record?.current_stage ||
        ""
    ).trim().toLowerCase();
}

function getRecordStatus(record) {
    return String(
        record?.stage_status ||
        record?.document_status ||
        record?.status ||
        "unknown"
    ).trim().toLowerCase();
}

function getRecordDate(record) {
    const rawDate =
        record?.uploaded_at ||
        record?.latest_document?.uploaded_at ||
        record?.submitted_at ||
        record?.updated_at ||
        record?.created_at ||
        "";

    if (!rawDate) return "—";

    const parsedDate = new Date(rawDate);

    return Number.isNaN(parsedDate.getTime())
        ? String(rawDate)
        : parsedDate.toLocaleString("en-NG", {
            year: "numeric",
            month: "short",
            day: "numeric",
            hour: "2-digit",
            minute: "2-digit"
        });
}

function getRecordDocumentName(record) {
    const document = record?.latest_document || record?.document || {};
    return document.document_name || record?.document_name || "No document listed";
}

function getAssignedStageRecords(records) {
    const assignedStage = String(staffProfile?.assigned_stage || "").toLowerCase();

    return records.filter(record => {
        const rowStage = getRecordStage(record);
        return !assignedStage || !rowStage || rowStage === assignedStage;
    });
}

function getStatusClass(status) {
    const classes = {
        under_review: "status-under-review",
        awaiting_submission: "status-pending",
        pending: "status-pending",
        approved: "status-approved",
        rejected: "status-rejected",
        completed: "status-completed",
        in_progress: "status-in-progress",
        unknown: "status-default"
    };

    return classes[status] || "status-default";
}

function makeTableCell(row, value, className = "") {
    const cell = document.createElement("td");
    cell.textContent = String(value ?? "—");

    if (className) cell.className = className;

    row.appendChild(cell);
    return cell;
}

function renderEmptyRow(tbody, message, columnCount) {
    if (!tbody) return;

    tbody.replaceChildren();

    const row = document.createElement("tr");
    const cell = document.createElement("td");

    cell.colSpan = columnCount;
    cell.className = "table-empty";
    cell.textContent = message;

    row.appendChild(cell);
    tbody.appendChild(row);
}

function renderRecordsIntoTable(tbody, records, tableType = "work") {
    if (!tbody) return;

    const isRecentTable = tableType === "recent";
    const columnCount = isRecentTable ? 6 : 7;

    tbody.replaceChildren();

    if (!records.length) {
        renderEmptyRow(
            tbody,
            "No clearance records are available for this stage.",
            columnCount
        );
        return;
    }

    records.forEach(record => {
        const row = document.createElement("tr");
        const regNo = getRecordRegNo(record);
        const status = getRecordStatus(record);

        if (isRecentTable) {
            const studentCell = makeTableCell(row, "");
            const studentName = document.createElement("strong");

            studentName.textContent = getRecordName(record);
            studentCell.appendChild(studentName);

            makeTableCell(row, regNo || "—");
            makeTableCell(
                row,
                record?.department || record?.student?.department || "—"
            );
            makeTableCell(row, getRecordDate(record));
        } else {
            makeTableCell(row, getRecordName(record));
            makeTableCell(row, regNo || "—");
            makeTableCell(
                row,
                record?.department || record?.student?.department || "—"
            );
            makeTableCell(row, getRecordDocumentName(record));
            makeTableCell(row, getRecordDate(record));
        }

        const statusCell = makeTableCell(row, "");
        const statusBadge = document.createElement("span");

        statusBadge.className = `status-pill ${getStatusClass(status)}`;
        statusBadge.textContent = normalizeStage(status);
        statusCell.appendChild(statusBadge);

        const actionCell = makeTableCell(row, "");
        const actionButton = document.createElement("button");

        actionButton.type = "button";
        actionButton.className = "button button-primary button-small";
        actionButton.textContent =
            status === "under_review" ? "Review" : "View Details";

        actionButton.addEventListener("click", () => openStudentDetails(record));

        actionCell.appendChild(actionButton);
        tbody.appendChild(row);
    });
}

function renderClearanceTables(records, serverCounts = {}) {
    if (!Array.isArray(records)) return;

    const stageRecords = getAssignedStageRecords(records);

    const pending = stageRecords.filter(record =>
        record.is_pending_review === true ||
        getRecordStatus(record) === "under_review"
    );

    const approved = stageRecords.filter(record =>
        record.was_processed_by_staff === true &&
        getRecordStatus(record) === "approved"
    );

    const rejected = stageRecords.filter(record =>
        record.was_rejected_by_staff === true ||
        getRecordStatus(record) === "rejected"
    );

    const completed = stageRecords.filter(record =>
        String(record.clearance_status || "").toLowerCase() === "completed"
    );

    const currentStageRows = stageRecords.filter(record =>
        record.is_current_stage === true ||
        (
            !record.is_current_stage &&
            getRecordStage(record) ===
            String(staffProfile?.assigned_stage || "").toLowerCase()
        )
    );

    setText("pendingReviewsCount", serverCounts.pending_review ?? pending.length);
    setText("approvedReviewsCount", approved.length);
    setText("rejectedReviewsCount", rejected.length);
    setText("completedClearancesCount", completed.length);
    setText("recentWorkCount", `${currentStageRows.length} records`);
    setText("clearanceWorkCount", `${stageRecords.length} records`);

    renderRecordsIntoTable(
        getElement("recentClearanceTableBody"),
        currentStageRows.slice(0, 5),
        "recent"
    );

    renderRecordsIntoTable(
        getElement("clearanceWorkTableBody"),
        stageRecords,
        "work"
    );

    const pendingNavCount = getElement("pendingNavCount");

    if (pendingNavCount) {
        pendingNavCount.textContent = String(
            serverCounts.pending_review ?? pending.length
        );
        pendingNavCount.hidden = false;
    }
}

function renderClearanceLoadError(message) {
    renderEmptyRow(getElement("recentClearanceTableBody"), message, 6);
    renderEmptyRow(getElement("clearanceWorkTableBody"), message, 7);

    setText("pendingReviewsCount", "—");
    setText("approvedReviewsCount", "—");
    setText("rejectedReviewsCount", "—");
    setText("completedClearancesCount", "—");
    setText("recentWorkCount", "Unavailable");
    setText("clearanceWorkCount", "Unavailable");

    const pendingNavCount = getElement("pendingNavCount");
    if (pendingNavCount) pendingNavCount.hidden = true;
}

async function loadClearanceWork(view = "all") {
    if (!getStaffId()) {
        renderClearanceLoadError("Staff ID is missing. Please sign in again.");
        return;
    }

    const tableBody = getElement("clearanceWorkTableBody");
    tableBody?.classList.add("is-loading");

    try {
        const response = await apiRequest(STAFF_ENDPOINTS.listStudents, {
            method: "POST",
            body: JSON.stringify({
                staff_id: getStaffId(),
                view
            })
        });

        clearanceRecords = Array.isArray(response.data) ? response.data : [];

        renderClearanceTables(clearanceRecords, response.counts || {});

        const info = getElement("clearanceWorkInfo");

        if (info) {
            info.className = "notice notice-info";
            info.textContent = clearanceRecords.length
                ? `Loaded ${clearanceRecords.length} clearance record(s) relevant to your ${normalizeStage(staffProfile?.assigned_stage)} assignment.`
                : `No student records are currently available for your ${normalizeStage(staffProfile?.assigned_stage)} assignment.`;
        }
    } catch (error) {
        console.error("Unable to load clearance work:", error);

        renderClearanceLoadError(
            error.message || "Unable to load clearance records. Please try again."
        );

        showToast(
            error.message || "Clearance records could not be loaded.",
            "error"
        );
    } finally {
        tableBody?.classList.remove("is-loading");
    }
}

function openStudentDetails(record) {
    const regNo = getRecordRegNo(record);
    const stage =
        getRecordStage(record) ||
        String(staffProfile?.assigned_stage || "");

    if (!regNo) {
        showToast("The selected record has no registration number.", "error");
        return;
    }

    const destination = new URL(
        STUDENT_DETAILS_PAGE,
        window.location.href
    );

    destination.searchParams.set("reg_no", regNo);

    if (stage) {
        destination.searchParams.set("stage", stage);
    }

    destination.searchParams.set("return_to", "staff-dashboard.html");
    window.location.href = destination.href;
}

/* ============================================================
   11. SEARCH AND STATUS FILTERS
============================================================ */

function initializeClearanceFilters() {
    const searchInput = getElement("clearanceSearch");
    const statusFilter = getElement("clearanceStatusFilter");

    function applyFilters() {
        const searchTerm = String(searchInput?.value || "")
            .trim()
            .toLowerCase();

        const selectedStatus = String(statusFilter?.value || "all")
            .trim()
            .toLowerCase();

        const filtered = getAssignedStageRecords(clearanceRecords).filter(record => {
            const name = getRecordName(record).toLowerCase();
            const regNo = getRecordRegNo(record).toLowerCase();
            const status = getRecordStatus(record);

            const matchesSearch =
                !searchTerm ||
                name.includes(searchTerm) ||
                regNo.includes(searchTerm);

            const matchesStatus =
                selectedStatus === "all" ||
                status === selectedStatus;

            return matchesSearch && matchesStatus;
        });

        renderRecordsIntoTable(
            getElement("clearanceWorkTableBody"),
            filtered,
            "work"
        );

        setText("clearanceWorkCount", `${filtered.length} records`);
    }

    searchInput?.addEventListener("input", applyFilters);
    statusFilter?.addEventListener("change", applyFilters);
}

/* ============================================================
   12. STAGE OTP VERIFICATION
============================================================ */

function initializeStageOtpForm() {
    const form = getElement("stageOtpForm");
    if (!form) return;

    form.addEventListener("submit", async event => {
        event.preventDefault();

        if (isSubmitting) return;

        if (!getStaffId()) {
            showToast("Staff ID is missing. Please sign in again.", "error");
            return;
        }

        if (isPasswordChangeRequired()) {
            showToast(
                "Change your password before verifying a stage OTP.",
                "warning"
            );
            showSection("change-password");
            return;
        }

        if (!isAccountActive()) {
            showToast("Your staff account is not active.", "error");
            return;
        }

        const regNo = normalizeRegNo(
            getElement("stageOtpRegNo")?.value
        );

        const otp = String(
            getElement("stageOtpCode")?.value || ""
        ).trim();

        if (!regNo || !/^\d{6}$/.test(otp)) {
            showInlineNotice(
                "stageOtpMessage",
                "Enter the student's registration number and the six-digit OTP.",
                "warning"
            );

            showToast(
                "Enter a registration number and valid six-digit OTP.",
                "warning"
            );
            return;
        }

        const button = getElement("verifyStageOtpBtn");

        isSubmitting = true;

        if (button) {
            button.disabled = true;
            button.dataset.originalText = button.textContent;
            button.textContent = "Verifying...";
        }

        try {
            const response = await apiRequest(
                STAFF_ENDPOINTS.verifyStageOtp,
                {
                    method: "POST",
                    body: JSON.stringify({
                        staff_id: getStaffId(),
                        reg_no: regNo,
                        otp
                    })
                }
            );

            form.reset();
            hideElement("stageOtpMessage");

            let message =
                response.message || "Stage OTP verified successfully.";

            if (response.email_sent === false) {
                message += " The email notification could not be confirmed.";
            }

            try {
                sessionStorage.setItem("uniclear_stage_otp_notice", message);
            } catch (storageError) {
                console.warn(
                    "Could not save the OTP success message.",
                    storageError
                );
            }

            /*
             * After successful verification, open the student's
             * details page for the newly advanced clearance stage.
             */
            const destination = new URL(
                STUDENT_DETAILS_PAGE,
                window.location.href
            );

            destination.searchParams.set("reg_no", regNo);
            destination.searchParams.set(
                "stage",
                response.current_stage || staffProfile?.assigned_stage || ""
            );
            destination.searchParams.set("otp_verified", "1");
            destination.searchParams.set("return_to", "staff-dashboard.html");

            window.location.href = destination.href;
        } catch (error) {
            console.error("Stage OTP verification failed:", error);

            showInlineNotice(
                "stageOtpMessage",
                error.message || "Stage OTP verification failed.",
                "error"
            );

            showToast(
                error.message || "Stage OTP verification failed.",
                "error"
            );
        } finally {
            isSubmitting = false;

            if (button) {
                button.disabled =
                    isPasswordChangeRequired() || !isAccountActive();

                button.textContent =
                    button.dataset.originalText || "Verify Stage OTP";
            }
        }
    });
}

/* ============================================================
   13. PASSWORD SHOW/HIDE EYE BUTTONS

   These IDs match staff-dashboard.html:
   currentPassword      -> toggleCurrentPassword
   newPassword          -> toggleNewPassword
   confirmPassword      -> toggleConfirmPassword
============================================================ */

function initializePasswordVisibility() {
    const settings = [
        {
            inputId: "currentPassword",
            buttonId: "toggleCurrentPassword",
            label: "current password"
        },
        {
            inputId: "newPassword",
            buttonId: "toggleNewPassword",
            label: "new password"
        },
        {
            inputId: "confirmPassword",
            buttonId: "toggleConfirmPassword",
            label: "confirm password"
        }
    ];

    settings.forEach(({ inputId, buttonId, label }) => {
        const input = getElement(inputId);
        const button = getElement(buttonId);

        if (
            !input ||
            !button ||
            button.dataset.passwordToggleInitialized === "true"
        ) {
            return;
        }

        button.dataset.passwordToggleInitialized = "true";
        button.setAttribute("aria-controls", inputId);
        button.setAttribute("aria-pressed", "false");
        button.setAttribute("aria-label", `Show ${label}`);

        button.addEventListener("click", () => {
            const makeVisible = input.type === "password";

            input.type = makeVisible ? "text" : "password";

            button.setAttribute(
                "aria-pressed",
                String(makeVisible)
            );

            button.setAttribute(
                "aria-label",
                `${makeVisible ? "Hide" : "Show"} ${label}`
            );
        });
    });
}

/* ============================================================
   14. CHANGE STAFF PASSWORD

   POST /api/v1/clearance/change-password/staff

   JSON:
   {
       staff_id,
       current_password,
       new_password,
       confirm_password
   }
============================================================ */

function initializeChangePasswordForm() {
    const form = getElement("changePasswordForm");
    if (!form) return;

    form.addEventListener("submit", async event => {
        event.preventDefault();

        if (isSubmitting) return;

        const currentPassword = String(
            getElement("currentPassword")?.value || ""
        );

        const newPassword = String(
            getElement("newPassword")?.value || ""
        );

        const confirmPassword = String(
            getElement("confirmPassword")?.value || ""
        );

        if (!getStaffId()) {
            showToast(
                "Staff ID is missing. Please sign in again.",
                "error"
            );
            return;
        }

        if (!currentPassword || !newPassword || !confirmPassword) {
            showInlineNotice(
                "changePasswordMessage",
                "Complete all three password fields.",
                "warning"
            );

            showToast(
                "Complete all three password fields.",
                "warning"
            );
            return;
        }

        if (newPassword.length < 8) {
            showInlineNotice(
                "changePasswordMessage",
                "Your new password must contain at least 8 characters.",
                "warning"
            );

            showToast(
                "Your new password must contain at least 8 characters.",
                "warning"
            );

            getElement("newPassword")?.focus();
            return;
        }

        if (newPassword !== confirmPassword) {
            showInlineNotice(
                "changePasswordMessage",
                "The new password and confirmation do not match.",
                "warning"
            );

            showToast(
                "The new password and confirmation do not match.",
                "warning"
            );

            getElement("confirmPassword")?.focus();
            return;
        }

        if (newPassword === currentPassword) {
            showInlineNotice(
                "changePasswordMessage",
                "Choose a password different from your current password.",
                "warning"
            );

            showToast(
                "Choose a password different from your current password.",
                "warning"
            );

            getElement("newPassword")?.focus();
            return;
        }

        const button = getElement("changeStaffPasswordBtn");

        isSubmitting = true;

        if (button) {
            button.disabled = true;
            button.dataset.originalText = button.textContent;
            button.textContent = "Updating...";
        }

        try {
            const response = await apiRequest(
                STAFF_ENDPOINTS.changePassword,
                {
                    method: "POST",
                    body: JSON.stringify({
                        staff_id: getStaffId(),
                        current_password: currentPassword,
                        new_password: newPassword,
                        confirm_password: confirmPassword
                    })
                }
            );

            form.reset();

            /*
             * Return all password fields to hidden after a successful
             * password update, and reset each eye button's state.
             */
            ["currentPassword", "newPassword", "confirmPassword"].forEach(id => {
                const input = getElement(id);
                if (input) input.type = "password";
            });

            const toggleLabels = {
                toggleCurrentPassword: "Show current password",
                toggleNewPassword: "Show new password",
                toggleConfirmPassword: "Show confirm password"
            };

            Object.entries(toggleLabels).forEach(([id, label]) => {
                const toggle = getElement(id);

                if (toggle) {
                    toggle.setAttribute("aria-pressed", "false");
                    toggle.setAttribute("aria-label", label);
                }
            });

            staffProfile.must_change_password = false;
            saveStoredProfile(staffProfile);

            hideElement("passwordChangeNotice");

            showInlineNotice(
                "changePasswordMessage",
                response.message || "Staff password changed successfully.",
                "success"
            );

            renderStaffProfile();

            let message =
                response.message || "Staff password changed successfully.";

            if (response.email_sent === false) {
                message += " The email notification could not be confirmed.";
            }

            showToast(
                message,
                response.email_sent === false ? "warning" : "success"
            );
        } catch (error) {
            console.error("Staff password change failed:", error);

            showInlineNotice(
                "changePasswordMessage",
                error.message || "Unable to change your password.",
                "error"
            );

            showToast(
                error.message || "Unable to change your password.",
                "error"
            );
        } finally {
            isSubmitting = false;

            if (button) {
                button.disabled = false;
                button.textContent =
                    button.dataset.originalText || "Update Password";
            }
        }
    });
}

/* ============================================================
   15. LOGOUT
============================================================ */

function logoutStaff() {
    if (!window.confirm("Are you sure you want to sign out?")) return;

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
    getElement("logoutBtn")?.addEventListener("click", logoutStaff);
}

/* ============================================================
   16. REFRESH BUTTONS
============================================================ */

function initializeRefreshButtons() {
    getElement("refreshDashboardBtn")?.addEventListener("click", () => {
        loadClearanceWork("all");
    });

    getElement("refreshClearanceWorkBtn")?.addEventListener("click", () => {
        loadClearanceWork("all");
    });

    getElement("refreshProfileBtn")?.addEventListener("click", () => {
        const savedProfile = readStoredProfile();

        if (!savedProfile) {
            showToast(
                "Unable to reload the saved staff profile.",
                "error"
            );
            return;
        }

        staffProfile = savedProfile;
        renderStaffProfile();
        showToast("Staff profile refreshed.", "success");
    });
}

/* ============================================================
   17. DASHBOARD INITIALIZATION
============================================================ */

function initializeStaffDashboard() {
    if (!requireStaffSession()) return;

    renderStaffProfile();
    renderCurrentDate();

    initializeNavigation();
    initializeMobileNavigation();
    initializeClearanceFilters();
    initializeStageOtpForm();
    initializePasswordVisibility();
    initializeChangePasswordForm();
    initializeLogout();
    initializeRefreshButtons();

    loadClearanceWork("all");

    console.info("UniClear staff dashboard initialized.");
}

/* ============================================================
   18. WAIT FOR THE HTML TO LOAD
============================================================ */

if (document.readyState === "loading") {
    document.addEventListener(
        "DOMContentLoaded",
        initializeStaffDashboard
    );
} else {
    initializeStaffDashboard();
}