
/* =========================================================
   UNICLEAR STUDENT CLEARANCE PORTAL
   File: Frontend/js/student-dashboard.js

   FEATURES
   1. Restore student details after login.
   2. Personalize the dashboard with the student's full name.
   3. Load the student's clearance record from the backend.
   4. Start clearance when no record exists.
   5. Display the seven clearance stages in sequential order.
   6. Calculate progress from actual backend statuses.
   7. Load uploaded documents and display their count.
   8. Make profile, navigation, quick actions and mobile menu work.
   9. Handle loading, network errors and backend responses.
  10. Avoid duplicate clearance creation requests.

   BACKEND
   https://uniclear-student-platform.vercel.app

   IMPORTANT
   The backend remains responsible for approval, rejection,
   staff permissions, stage progression and OTP verification.
========================================================= */

"use strict";

/* =========================================================
   1. CONFIGURATION
========================================================= */

const API_BASE_URL = "https://uniclear-student-platform.vercel.app";

const API_ENDPOINTS = {
    viewClearance: "/api/v1/clearance/view",
    createClearance: "/api/v1/clearance/create",
    studentDocuments: "/api/v1/clearance/documents"
};

const CLEARANCE_STAGES = [
    {
        key: "finance",
        name: "Finance",
        description: "Verification of financial obligations.",
        icon: "fa-wallet"
    },
    {
        key: "department",
        name: "Department",
        description: "Departmental clearance and verification.",
        icon: "fa-building"
    },
    {
        key: "faculty",
        name: "Faculty",
        description: "Faculty-level clearance and verification.",
        icon: "fa-graduation-cap"
    },
    {
        key: "library",
        name: "Library",
        description: "Library record and outstanding-book checks.",
        icon: "fa-book-open"
    },
    {
        key: "health",
        name: "Health",
        description: "Health-centre clearance verification.",
        icon: "fa-heart-pulse"
    },
    {
        key: "student_affairs",
        name: "Student Affairs",
        description: "Student Affairs clearance verification.",
        icon: "fa-users"
    },
    {
        key: "final",
        name: "Final Clearance",
        description: "Final review and completion of clearance.",
        icon: "fa-circle-check"
    }
];

const STORAGE_KEYS = {
    student: "uniclear_student",
    studentFallback: "uniclear_student_data",
    studentFallback2: "student_data",
    studentFallback3: "student",
    regNo: "uniclear_reg_no",
    role: "uniclear_user_role",
    staffId: "uniclear_staff_id"
};

let currentStudent = null;
let currentClearance = null;
let currentDocuments = [];
let clearanceExists = false;
let clearanceLoading = false;
let documentsLoading = false;
let creatingClearance = false;
let dashboardInitialized = false;


/* =========================================================
   2. GENERAL HELPERS
========================================================= */

function getElement(id) {
    return document.getElementById(id);
}

function setText(id, value) {
    const element = getElement(id);

    if (element) {
        element.textContent =
            value === undefined || value === null || value === ""
                ? "Not provided"
                : String(value);
    }
}

function normalizeText(value) {
    return String(value ?? "")
        .trim()
        .toLowerCase()
        .replace(/[\s-]+/g, "_");
}

function titleCase(value) {
    if (!value) {
        return "";
    }

    return String(value)
        .replace(/[_-]+/g, " ")
        .replace(/\s+/g, " ")
        .trim()
        .replace(/\b\w/g, character => character.toUpperCase());
}

function safeJsonParse(value) {
    if (!value || typeof value !== "string") {
        return null;
    }

    try {
        return JSON.parse(value);
    } catch (error) {
        console.warn("Could not parse saved student data.", error);
        return null;
    }
}

function getFullName(student) {
    if (!student) {
        return "";
    }

    const parts = [
        student.surname,
        student.first_name,
        student.other_names
    ];

    return parts
        .filter(part => typeof part === "string" && part.trim())
        .map(part => part.trim())
        .join(" ");
}

function getInitials(student) {
    const name = getFullName(student);

    if (!name) {
        return "ST";
    }

    const parts = name.split(/\s+/).filter(Boolean);

    if (parts.length === 1) {
        return parts[0].substring(0, 2).toUpperCase();
    }

    return (
        parts[0].charAt(0) +
        parts[parts.length - 1].charAt(0)
    ).toUpperCase();
}

function getStudentRegNo(student) {
    return (
        student?.reg_no ||
        student?.registration_number ||
        sessionStorage.getItem(STORAGE_KEYS.regNo) ||
        localStorage.getItem(STORAGE_KEYS.regNo) ||
        ""
    );
}

function formatStudentStatus(value) {
    if (!value) {
        return "Not provided";
    }

    return titleCase(value);
}

function getErrorMessage(error, fallback) {
    if (error && error.message) {
        return error.message;
    }

    return fallback || "Something went wrong. Please try again.";
}


/* =========================================================
   3. RESTORE STUDENT SESSION
========================================================= */

function getSavedStudent() {
    const storageKeys = [
        STORAGE_KEYS.student,
        STORAGE_KEYS.studentFallback,
        STORAGE_KEYS.studentFallback2,
        STORAGE_KEYS.studentFallback3
    ];

    for (const key of storageKeys) {
        const savedValue = sessionStorage.getItem(key);

        if (!savedValue) {
            continue;
        }

        const parsed = safeJsonParse(savedValue);

        if (parsed && typeof parsed === "object") {
            /*
             * Accept either the student object itself or a response
             * wrapper containing the student object in data.
             */
            const student = parsed.data || parsed;

            if (
                student.reg_no ||
                student.registration_number ||
                student.first_name ||
                student.surname
            ) {
                return student;
            }
        }
    }

    /*
     * The registration number may be available even if an older
     * login script did not save the complete student profile.
     */
    const regNo =
        sessionStorage.getItem(STORAGE_KEYS.regNo) ||
        localStorage.getItem(STORAGE_KEYS.regNo);

    if (!regNo) {
        return null;
    }

    return {
        reg_no: regNo
    };
}

function saveStudent(student) {
    if (!student || typeof student !== "object") {
        return;
    }

    currentStudent = student;

    const regNo = getStudentRegNo(student);

    try {
        sessionStorage.setItem(
            STORAGE_KEYS.student,
            JSON.stringify(student)
        );

        sessionStorage.setItem(
            STORAGE_KEYS.role,
            "student"
        );

        if (regNo) {
            sessionStorage.setItem(
                STORAGE_KEYS.regNo,
                regNo
            );
        }
    } catch (error) {
        console.warn("Could not update the saved student session.", error);
    }
}

function requireStudentSession() {
    currentStudent = getSavedStudent();

    const role = (
        sessionStorage.getItem(STORAGE_KEYS.role) ||
        localStorage.getItem(STORAGE_KEYS.role) ||
        ""
    ).toLowerCase();

    const regNo = getStudentRegNo(currentStudent);

    if (
        !currentStudent ||
        !regNo ||
        (role && role !== "student")
    ) {
        showDashboardMessage(
            "Your student session could not be restored. Please log in again.",
            "error"
        );

        /*
         * Delay the redirect slightly so the student can read the message.
         */
        window.setTimeout(() => {
            window.location.href = "login.html";
        }, 1600);

        return false;
    }

    saveStudent({
        ...currentStudent,
        reg_no: regNo
    });

    return true;
}


/* =========================================================
   4. DASHBOARD MESSAGE DISPLAY
========================================================= */

function showDashboardMessage(message, type = "info") {
    const element = getElement("dashboardMessage");

    if (!element) {
        if (message) {
            console.info(message);
        }
        return;
    }

    element.textContent = message;
    element.className = "dashboard-message";

    if (type === "success") {
        element.classList.add("alert-success");
    } else if (type === "error") {
        element.classList.add("alert-error");
    } else if (type === "warning") {
        element.classList.add("alert-warning");
    } else {
        element.classList.add("alert-info");
    }

    element.hidden = !message;

    if (message) {
        element.setAttribute("role", "status");
        element.setAttribute("aria-live", "polite");
    }
}

function clearDashboardMessage() {
    const element = getElement("dashboardMessage");

    if (element) {
        element.textContent = "";
        element.hidden = true;
        element.className = "dashboard-message";
    }
}


/* =========================================================
   5. API REQUEST HELPER
========================================================= */

async function apiRequest(endpoint, options = {}) {
    const controller = new AbortController();

    const timeoutId = window.setTimeout(() => {
        controller.abort();
    }, 30000);

    const requestOptions = {
        method: options.method || "GET",
        headers: {
            Accept: "application/json",
            ...(options.headers || {})
        },
        signal: controller.signal
    };

    if (options.body !== undefined) {
        requestOptions.headers["Content-Type"] = "application/json";
        requestOptions.body = JSON.stringify(options.body);
    }

    try {
        const response = await fetch(
            `${API_BASE_URL}${endpoint}`,
            requestOptions
        );

        const rawText = await response.text();
        let result = {};

        if (rawText) {
            try {
                result = JSON.parse(rawText);
            } catch (error) {
                result = {
                    success: false,
                    message: "The server returned an unreadable response."
                };
            }
        }

        if (!response.ok || result.success === false) {
            const error = new Error(
                result.message ||
                `The request failed with status ${response.status}.`
            );

            error.status = response.status;
            error.data = result.data;
            error.response = result;

            throw error;
        }

        return result;
    } catch (error) {
        if (error.name === "AbortError") {
            throw new Error(
                "The server took too long to respond. Please try again."
            );
        }

        if (
            error instanceof TypeError &&
            !navigator.onLine
        ) {
            throw new Error(
                "You appear to be offline. Check your internet connection."
            );
        }

        if (error instanceof TypeError) {
            throw new Error(
                "Unable to reach the UniClear server. Check your connection and try again."
            );
        }

        throw error;
    } finally {
        window.clearTimeout(timeoutId);
    }
}


/* =========================================================
   6. RENDER STUDENT PROFILE DETAILS
========================================================= */

function renderStudentProfile() {
    if (!currentStudent) {
        return;
    }

    const student = currentStudent;
    const fullName = getFullName(student);
    const regNo = getStudentRegNo(student);

    const displayName = fullName || "Student";
    const initials = getInitials(student);

    setText("welcomeHeading", `Welcome back, ${displayName}`);

    setText("studentFullName", fullName || "Not provided");
    setText("studentRegNo", regNo || "Not provided");
    setText("studentEmail", student.email);
    setText("studentPhone", student.phone_number);
    setText("studentFaculty", student.faculty);
    setText("studentDepartment", student.department);
    setText("studentAdmissionYear", student.admission_year);
    setText(
        "studentStudyCategory",
        formatStudentStatus(student.student_status)
    );
    setText("studentStudyDuration", formatStudyDuration(student.study_duration));
    setText("studentGender", formatStudentStatus(student.gender));
    setText(
        "studentAccountStatus",
        formatStudentStatus(student.account_status)
    );

    setText("sidebarStudentName", displayName);
    setText("sidebarStudentRegNo", regNo || "Registration number unavailable");
    setText("sidebarProfileName", displayName);
    setText("sidebarProfileRegNo", regNo || "Registration number unavailable");

    setText("topbarStudentName", displayName);

    const sidebarAvatarIds = [
        "sidebarAvatar",
        "sidebarUserAvatar",
        "sidebarProfileAvatar"
    ];

    sidebarAvatarIds.forEach(id => {
        const avatar = getElement(id);

        if (avatar) {
            avatar.textContent = initials;
            avatar.setAttribute("aria-label", `${displayName} initials`);
        }
    });

    const topbarAvatar = getElement("topbarAvatar");

    if (topbarAvatar) {
        topbarAvatar.textContent = initials;
        topbarAvatar.setAttribute("aria-label", `${displayName} initials`);
    }

    /*
     * Update the document title to make the page easier to identify.
     */
    document.title = `Student Dashboard | UniClear`;
}

function formatStudyDuration(duration) {
    if (
        duration === undefined ||
        duration === null ||
        duration === ""
    ) {
        return "Not provided";
    }

    const number = Number(duration);

    if (!Number.isFinite(number)) {
        return String(duration);
    }

    return `${number} ${number === 1 ? "year" : "years"}`;
}


/* =========================================================
   7. CLEARANCE RECORD EXTRACTION
========================================================= */

function getClearanceRecord(response) {
    if (!response || typeof response !== "object") {
        return null;
    }

    /*
     * The backend returns the clearance document in response.data.
     */
    const data = response.data;

    if (!data || typeof data !== "object") {
        return null;
    }

    /*
     * Do not mistake an unrelated response for a clearance record.
     */
    const hasStages =
        data.stages !== undefined ||
        data.clearance_stages !== undefined ||
        data.current_stage !== undefined ||
        data.currentStage !== undefined;

    const hasClearanceIdentity =
        data.reg_no !== undefined ||
        data.student_id !== undefined ||
        data.clearance_status !== undefined ||
        data.overall_status !== undefined;

    if (hasStages || hasClearanceIdentity) {
        return data;
    }

    return null;
}

function isClearanceNotFoundError(error) {
    if (!error) {
        return false;
    }

    if (error.status === 404) {
        return true;
    }

    const message = normalizeText(error.message);

    return (
        message.includes("clearance_record_not_found") ||
        message.includes("clearance_not_found") ||
        message.includes("no_clearance_record")
    );
}

function extractStageCollection(clearance) {
    if (!clearance) {
        return {};
    }

    const collection =
        clearance.stages ??
        clearance.clearance_stages ??
        clearance.stage_statuses ??
        {};

    return collection;
}

function getStageRecord(clearance, stageKey) {
    const stages = extractStageCollection(clearance);

    if (Array.isArray(stages)) {
        return stages.find(stage => {
            const key = normalizeText(
                stage.stage ||
                stage.stage_name ||
                stage.name ||
                stage.key
            );

            return key === normalizeText(stageKey);
        }) || null;
    }

    if (stages && typeof stages === "object") {
        if (stages[stageKey] !== undefined) {
            return stages[stageKey];
        }

        const matchingKey = Object.keys(stages).find(
            key => normalizeText(key) === normalizeText(stageKey)
        );

        if (matchingKey) {
            return stages[matchingKey];
        }
    }

    /*
     * Some records may place stage fields directly on the document.
     */
    if (clearance[stageKey] !== undefined) {
        return clearance[stageKey];
    }

    return null;
}

function getStageStatus(clearance, stageKey) {
    const stageRecord = getStageRecord(clearance, stageKey);

    if (stageRecord === null || stageRecord === undefined) {
        return "awaiting_submission";
    }

    if (typeof stageRecord === "string") {
        return normalizeText(stageRecord);
    }

    if (typeof stageRecord === "boolean") {
        return stageRecord ? "approved" : "pending";
    }

    if (typeof stageRecord === "object") {
        const rawStatus =
            stageRecord.status ??
            stageRecord.clearance_status ??
            stageRecord.stage_status ??
            stageRecord.review_status;

        if (rawStatus !== undefined && rawStatus !== null) {
            return normalizeText(rawStatus);
        }

        if (stageRecord.approved === true || stageRecord.is_approved === true) {
            return "approved";
        }

        if (stageRecord.rejected === true || stageRecord.is_rejected === true) {
            return "rejected";
        }

        if (
            stageRecord.document_id ||
            stageRecord.document ||
            stageRecord.document_name ||
            stageRecord.uploaded_at
        ) {
            return "under_review";
        }
    }

    return "awaiting_submission";
}


/* =========================================================
   8. CLEARANCE STATUS HELPERS
========================================================= */

function isApprovedStatus(status) {
    return [
        "approved",
        "complete",
        "completed",
        "verified",
        "cleared"
    ].includes(normalizeText(status));
}

function isRejectedStatus(status) {
    return [
        "rejected",
        "declined",
        "returned"
    ].includes(normalizeText(status));
}

function isUnderReviewStatus(status) {
    return [
        "under_review",
        "in_review",
        "in_progress_review",
        "reviewing",
        "processing"
    ].includes(normalizeText(status));
}

function isPendingStatus(status) {
    return [
        "pending",
        "submitted",
        "awaiting_review",
        "awaiting_approval"
    ].includes(normalizeText(status));
}

function isAwaitingSubmissionStatus(status) {
    return [
        "",
        "awaiting_submission",
        "not_started",
        "not_submitted",
        "not_uploaded",
        "waiting_for_submission"
    ].includes(normalizeText(status));
}

function getStatusLabel(status) {
    const normalized = normalizeText(status);

    if (isApprovedStatus(normalized)) {
        return "Approved";
    }

    if (isRejectedStatus(normalized)) {
        return "Rejected";
    }

    if (isUnderReviewStatus(normalized)) {
        return "Under Review";
    }

    if (isPendingStatus(normalized)) {
        return "Pending";
    }

    if (isAwaitingSubmissionStatus(normalized)) {
        return "Awaiting Submission";
    }

    if (normalized === "in_progress") {
        return "In Progress";
    }

    if (normalized === "completed") {
        return "Completed";
    }

    return titleCase(normalized) || "Awaiting Submission";
}

function getStatusClass(status) {
    const normalized = normalizeText(status);

    if (isApprovedStatus(normalized)) {
        return "approved";
    }

    if (isRejectedStatus(normalized)) {
        return "rejected";
    }

    if (isUnderReviewStatus(normalized)) {
        return "under-review";
    }

    if (isPendingStatus(normalized)) {
        return "pending";
    }

    return "awaiting-submission";
}


/* =========================================================
   9. RENDER CLEARANCE STAGE CARDS
========================================================= */

function renderClearanceStages() {
    const stageCards = document.querySelectorAll(
        ".clearance-stage-card[data-stage]"
    );

    if (!stageCards.length) {
        return;
    }

    stageCards.forEach(card => {
        const stageKey = normalizeText(card.dataset.stage);
        const stageDefinition = CLEARANCE_STAGES.find(
            stage => stage.key === stageKey
        );

        if (!stageDefinition) {
            return;
        }

        const status = clearanceExists
            ? getStageStatus(currentClearance, stageKey)
            : "awaiting_submission";

        const statusElement = card.querySelector(".stage-status");
        const descriptionElement = card.querySelector(".stage-description");

        if (statusElement) {
            statusElement.textContent = getStatusLabel(status);
            statusElement.className =
                `stage-status ${getStatusClass(status)}`;
        }

        if (descriptionElement) {
            if (!clearanceExists) {
                descriptionElement.textContent =
                    "Start your clearance to begin this stage.";
            } else if (isRejectedStatus(status)) {
                descriptionElement.textContent =
                    "This stage requires attention. Follow the instructions provided by the clearance office.";
            } else if (isApprovedStatus(status)) {
                descriptionElement.textContent =
                    "This stage has been approved.";
            } else if (isUnderReviewStatus(status)) {
                descriptionElement.textContent =
                    "Your submission is being reviewed.";
            } else if (isPendingStatus(status)) {
                descriptionElement.textContent =
                    "Your submission is awaiting review or approval.";
            } else {
                descriptionElement.textContent =
                    stageDefinition.description;
            }
        }

        card.dataset.status = status;

        card.setAttribute(
            "aria-label",
            `${stageDefinition.name}: ${getStatusLabel(status)}`
        );
    });
}


/* =========================================================
   10. CALCULATE SEQUENTIAL CLEARANCE PROGRESS
========================================================= */

function getClearanceProgress() {
    if (!clearanceExists || !currentClearance) {
        return {
            approved: 0,
            total: CLEARANCE_STAGES.length,
            percentage: 0,
            currentStage: "Not Started",
            completed: false
        };
    }

    const statuses = CLEARANCE_STAGES.map(stage => ({
        ...stage,
        status: getStageStatus(currentClearance, stage.key)
    }));

    const approved = statuses.filter(
        stage => isApprovedStatus(stage.status)
    ).length;

    /*
     * Progress is calculated from the actual stage approvals.
     */
    const percentage = Math.round(
        (approved / CLEARANCE_STAGES.length) * 100
    );

    /*
     * Sequential display: the first stage not yet approved is the
     * current stage. Later stages are not treated as approved merely
     * because an earlier stage was approved.
     */
    const current = statuses.find(
        stage => !isApprovedStatus(stage.status)
    );

    const overallStatus = normalizeText(
        currentClearance.clearance_status ||
        currentClearance.overall_status ||
        currentClearance.status ||
        ""
    );

    const completed =
        overallStatus === "completed" ||
        statuses.every(stage => isApprovedStatus(stage.status));

    return {
        approved,
        total: CLEARANCE_STAGES.length,
        percentage: completed ? 100 : percentage,
        currentStage: completed
            ? "Completed"
            : current
                ? current.name
                : "Not Started",
        completed
    };
}

function renderClearanceProgress() {
    const progress = getClearanceProgress();

    setText("progressPercentage", `${progress.percentage}%`);
    setText(
        "progressApprovedText",
        `${progress.approved} of ${progress.total} stages approved`
    );
    setText(
        "progressRemainingText",
        `${progress.total - progress.approved} stages remaining`
    );
    setText("approvedStagesCount", progress.approved);
    setText("currentClearanceStage", progress.currentStage);

    const progressFill = getElement("clearanceProgressFill");

    if (progressFill) {
        progressFill.style.width = `${progress.percentage}%`;
        progressFill.setAttribute("role", "progressbar");
        progressFill.setAttribute("aria-valuemin", "0");
        progressFill.setAttribute("aria-valuemax", "100");
        progressFill.setAttribute(
            "aria-valuenow",
            String(progress.percentage)
        );
        progressFill.setAttribute(
            "aria-label",
            "Clearance completion progress"
        );
    }

    const progressBar = getElement("clearanceProgressBar");

    if (progressBar) {
        progressBar.setAttribute("role", "progressbar");
        progressBar.setAttribute("aria-valuemin", "0");
        progressBar.setAttribute("aria-valuemax", "100");
        progressBar.setAttribute(
            "aria-valuenow",
            String(progress.percentage)
        );
        progressBar.setAttribute(
            "aria-label",
            "Clearance completion progress"
        );
    }

    const overallStatusElement = getElement("overallClearanceStatus");
    const overallDescription = getElement("overallStatusDescription");

    if (!clearanceExists) {
        if (overallStatusElement) {
            overallStatusElement.textContent = "Not Started";
            overallStatusElement.className = "status-badge neutral";
        }

        if (overallDescription) {
            overallDescription.textContent =
                "Start your clearance to begin the approval process.";
        }

        return;
    }

    const overallStatus = normalizeText(
        currentClearance.clearance_status ||
        currentClearance.overall_status ||
        currentClearance.status ||
        ""
    );

    const statusLabel = progress.completed
        ? "Completed"
        : overallStatus
            ? getStatusLabel(overallStatus)
            : "In Progress";

    if (overallStatusElement) {
        overallStatusElement.textContent = statusLabel;

        overallStatusElement.className = "status-badge";

        if (progress.completed) {
            overallStatusElement.classList.add("success");
        } else if (overallStatus === "rejected") {
            overallStatusElement.classList.add("danger");
        } else {
            overallStatusElement.classList.add("warning");
        }
    }

    if (overallDescription) {
        if (progress.completed) {
            overallDescription.textContent =
                "Congratulations! Your clearance has been completed.";
        } else {
            overallDescription.textContent =
                `Your clearance is currently at ${progress.currentStage}. ` +
                "Stages must be completed in the prescribed order.";
        }
    }
}


/* =========================================================
   11. START CLEARANCE PROMPT
========================================================= */

function updateStartClearancePrompt() {
    const prompt = getElement("createClearancePrompt");
    const button = getElement("createClearanceButton");

    if (prompt) {
        prompt.hidden = clearanceExists;
    }

    if (button) {
        button.hidden = clearanceExists;
        button.disabled = creatingClearance;

        button.innerHTML = creatingClearance
            ? '<i class="fas fa-spinner fa-spin" aria-hidden="true"></i> Starting Clearance...'
            : '<i class="fas fa-play" aria-hidden="true"></i> Start Clearance';
    }
}


/* =========================================================
   12. LOAD CLEARANCE RECORD
========================================================= */

async function loadClearance(options = {}) {
    if (clearanceLoading) {
        return;
    }

    const regNo = getStudentRegNo(currentStudent);

    if (!regNo) {
        showDashboardMessage(
            "Your registration number is missing. Please log in again.",
            "error"
        );
        return;
    }

    clearanceLoading = true;

    if (!options.silent) {
        showDashboardMessage("Loading your clearance record...", "info");
    }

    try {
        const response = await apiRequest(
            API_ENDPOINTS.viewClearance,
            {
                method: "POST",
                body: {
                    reg_no: regNo
                }
            }
        );

        const record = getClearanceRecord(response);

        if (!record) {
            /*
             * A successful response without a recognizable record is
             * not treated as proof that no record exists.
             */
            throw new Error(
                "The server response did not contain a recognizable clearance record."
            );
        }

        currentClearance = record;
        clearanceExists = true;

        updateStartClearancePrompt();
        renderClearanceStages();
        renderClearanceProgress();

        showDashboardMessage(
            "Your clearance record has been loaded.",
            "success"
        );

        await loadStudentDocuments({ silent: true });
    } catch (error) {
        if (isClearanceNotFoundError(error)) {
            currentClearance = null;
            clearanceExists = false;

            updateStartClearancePrompt();
            renderClearanceStages();
            renderClearanceProgress();

            showDashboardMessage(
                "You have not started clearance yet. Click Start Clearance to create your clearance record.",
                "info"
            );

            await loadStudentDocuments({ silent: true });
            return;
        }

        console.error("Unable to load clearance record:", error);

        /*
         * Do not incorrectly show the Start Clearance button when the
         * server could not be reached. A network failure does not prove
         * that a clearance record is absent.
         */
        updateStartClearancePrompt();

        showDashboardMessage(
            getErrorMessage(
                error,
                "Unable to load your clearance record."
            ),
            "error"
        );
    } finally {
        clearanceLoading = false;
    }
}


/* =========================================================
   13. CREATE CLEARANCE RECORD
========================================================= */

async function createStudentClearance() {
    if (creatingClearance) {
        return;
    }

    const regNo = getStudentRegNo(currentStudent);

    if (!regNo) {
        showDashboardMessage(
            "Your registration number is missing. Please log in again.",
            "error"
        );
        return;
    }

    const button = getElement("createClearanceButton");

    creatingClearance = true;
    updateStartClearancePrompt();
    showDashboardMessage("Starting your clearance...", "info");

    if (button) {
        button.setAttribute("aria-busy", "true");
    }

    try {
        const response = await apiRequest(
            API_ENDPOINTS.createClearance,
            {
                method: "POST",
                body: {
                    reg_no: regNo
                }
            }
        );

        const record = getClearanceRecord(response);

        if (record) {
            currentClearance = record;
            clearanceExists = true;

            updateStartClearancePrompt();
            renderClearanceStages();
            renderClearanceProgress();

            showDashboardMessage(
                response.message || "Your clearance has been started successfully.",
                "success"
            );

            await loadStudentDocuments({ silent: true });
        } else {
            /*
             * If the endpoint confirms success but does not return a
             * recognizable record, reload it from the view endpoint.
             */
            await loadClearance({ silent: true });

            if (clearanceExists) {
                showDashboardMessage(
                    response.message || "Your clearance has been started successfully.",
                    "success"
                );
            } else {
                showDashboardMessage(
                    "The server responded, but the clearance record could not be confirmed. Please refresh and check before trying again.",
                    "warning"
                );
            }
        }
    } catch (error) {
        console.error("Unable to create clearance record:", error);

        /*
         * The backend may return HTTP 409 if the student already has a
         * record. Reload it instead of creating another record.
         */
        if (error.status === 409) {
            await loadClearance({ silent: true });

            if (clearanceExists) {
                showDashboardMessage(
                    "Your clearance record already exists. Your dashboard has been refreshed.",
                    "success"
                );
            } else {
                showDashboardMessage(
                    error.message ||
                    "A clearance record may already exist. Refresh the dashboard before trying again.",
                    "warning"
                );
            }

            return;
        }

        showDashboardMessage(
            getErrorMessage(
                error,
                "Unable to start your clearance. Please try again."
            ),
            "error"
        );
    } finally {
        creatingClearance = false;
        updateStartClearancePrompt();

        if (button) {
            button.removeAttribute("aria-busy");
        }
    }
}


/* =========================================================
   14. LOAD STUDENT DOCUMENTS
========================================================= */

function extractDocuments(response) {
    if (!response || typeof response !== "object") {
        return [];
    }

    const data = response.data;

    if (Array.isArray(data)) {
        return data;
    }

    if (data && typeof data === "object") {
        const possibleArrays = [
            data.documents,
            data.uploaded_documents,
            data.files,
            data.results,
            data.items
        ];

        for (const value of possibleArrays) {
            if (Array.isArray(value)) {
                return value;
            }
        }
    }

    if (Array.isArray(response.documents)) {
        return response.documents;
    }

    return [];
}

async function loadStudentDocuments(options = {}) {
    if (documentsLoading) {
        return;
    }

    const regNo = getStudentRegNo(currentStudent);

    if (!regNo) {
        return;
    }

    documentsLoading = true;

    try {
        const response = await apiRequest(
            API_ENDPOINTS.studentDocuments,
            {
                method: "POST",
                body: {
                    reg_no: regNo
                }
            }
        );

        currentDocuments = extractDocuments(response);

        setText("uploadedDocumentsCount", currentDocuments.length);

        /*
         * If a document list is included in this HTML, render it too.
         * If not, the count is still updated.
         */
        renderDocumentList(currentDocuments);
    } catch (error) {
        console.warn("Could not load student documents:", error);

        /*
         * A failed request is not evidence that the student has zero
         * documents, so do not overwrite the count with zero.
         */
        if (!options.silent) {
            showDashboardMessage(
                getErrorMessage(
                    error,
                    "Unable to load uploaded documents."
                ),
                "warning"
            );
        }
    } finally {
        documentsLoading = false;
    }
}

function renderDocumentList(documents) {
    const container =
        getElement("studentDocumentsList") ||
        getElement("documentsList") ||
        getElement("uploadedDocumentsList");

    if (!container) {
        return;
    }

    container.replaceChildren();

    if (!documents.length) {
        const emptyMessage = document.createElement("p");
        emptyMessage.className = "empty-state";
        emptyMessage.textContent = clearanceExists
            ? "No uploaded documents were returned by the server."
            : "Your uploaded documents will appear here after you start clearance.";

        container.appendChild(emptyMessage);
        return;
    }

    documents.forEach(documentRecord => {
        const item = document.createElement("div");
        item.className = "document-list-item";

        const name = document.createElement("span");
        name.className = "document-name";
        name.textContent =
            documentRecord.document_name ||
            documentRecord.name ||
            documentRecord.filename ||
            "Uploaded document";

        const status = document.createElement("span");
        status.className = "status-badge";

        const rawStatus = normalizeText(
            documentRecord.status ||
            documentRecord.document_status ||
            "under_review"
        );

        status.textContent = getStatusLabel(rawStatus);
        status.classList.add(
            isApprovedStatus(rawStatus)
                ? "success"
                : isRejectedStatus(rawStatus)
                    ? "danger"
                    : "info"
        );

        item.append(name, status);
        container.appendChild(item);
    });
}


/* =========================================================
   15. PROFILE BUTTON
========================================================= */

function openStudentProfile() {
    /*
     * The latest dashboard HTML contains the student information
     * fields directly on the dashboard. Scroll to those details first.
     */
    const possibleTargets = [
        getElement("studentFullName"),
        getElement("studentRegNo"),
        getElement("studentInformationSection"),
        getElement("studentProfileSection")
    ];

    let target = null;

    for (const element of possibleTargets) {
        if (element) {
            target =
                element.closest(
                    ".student-information-section, " +
                    ".student-profile-section, " +
                    ".student-info-card, " +
                    ".profile-card, " +
                    ".dashboard-card, " +
                    "section"
                ) || element;
            break;
        }
    }

    if (target) {
        target.scrollIntoView({
            behavior: "smooth",
            block: "start"
        });

        target.setAttribute("tabindex", "-1");

        try {
            target.focus({ preventScroll: true });
        } catch (error) {
            // Scrolling still works in browsers without preventScroll.
        }

        return;
    }

    /*
     * Fallback if a separate profile page has been created.
     */
    window.location.href = "student-profile.html";
}


/* =========================================================
   16. NAVIGATION AND QUICK ACTIONS
========================================================= */

function navigateToPage(path) {
    if (!path) {
        return;
    }

    window.location.href = path;
}

function bindNavigationLinks() {
    /*
     * These links can carry data-page attributes in the HTML.
     */
    document.querySelectorAll("[data-page]").forEach(element => {
        element.addEventListener("click", event => {
            const path = element.getAttribute("data-page");

            if (path) {
                event.preventDefault();
                navigateToPage(path);
            }
        });
    });

    const topbarProfileButton = getElement("topbarProfileButton");

    if (topbarProfileButton) {
        topbarProfileButton.addEventListener("click", event => {
            event.preventDefault();
            openStudentProfile();
        });
    }

    /*
     * Profile links in the sidebar can use these IDs or data attributes.
     */
    document.querySelectorAll(
        '[data-action="profile"], .profile-navigation-link'
    ).forEach(element => {
        element.addEventListener("click", event => {
            event.preventDefault();
            openStudentProfile();
            closeMobileSidebar();
        });
    });

    /*
     * Quick-action cards can use data-href or data-page to specify
     * their destination. Ordinary anchor elements keep their href.
     */
    document.querySelectorAll(".quick-action-card[data-href]").forEach(card => {
        card.addEventListener("click", event => {
            if (event.target.closest("a, button")) {
                return;
            }

            const path = card.getAttribute("data-href");

            if (path) {
                navigateToPage(path);
            }
        });

        card.setAttribute("role", "link");
        card.setAttribute("tabindex", "0");

        card.addEventListener("keydown", event => {
            if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();

                const path = card.getAttribute("data-href");

                if (path) {
                    navigateToPage(path);
                }
            }
        });
    });
}


/* =========================================================
   17. MOBILE SIDEBAR
========================================================= */

function openMobileSidebar() {
    const sidebar = getElement("dashboardSidebar");
    const overlay = getElement("sidebarOverlay");
    const menuButton = getElement("mobileMenuButton");

    if (sidebar) {
        sidebar.classList.add("open");
        sidebar.classList.add("active");
    }

    if (overlay) {
        overlay.hidden = false;
        overlay.setAttribute("aria-hidden", "false");
    }

    if (menuButton) {
        menuButton.setAttribute("aria-expanded", "true");
        menuButton.setAttribute("aria-label", "Close navigation menu");
    }

    document.body.classList.add("sidebar-open");
}

function closeMobileSidebar() {
    const sidebar = getElement("dashboardSidebar");
    const overlay = getElement("sidebarOverlay");
    const menuButton = getElement("mobileMenuButton");

    if (sidebar) {
        sidebar.classList.remove("open");
        sidebar.classList.remove("active");
    }

    if (overlay) {
        overlay.hidden = true;
        overlay.setAttribute("aria-hidden", "true");
    }

    if (menuButton) {
        menuButton.setAttribute("aria-expanded", "false");
        menuButton.setAttribute("aria-label", "Open navigation menu");
    }

    document.body.classList.remove("sidebar-open");
}

function toggleMobileSidebar() {
    const sidebar = getElement("dashboardSidebar");

    if (
        sidebar &&
        (
            sidebar.classList.contains("open") ||
            sidebar.classList.contains("active")
        )
    ) {
        closeMobileSidebar();
    } else {
        openMobileSidebar();
    }
}

function bindMobileSidebar() {
    const menuButton = getElement("mobileMenuButton");
    const overlay = getElement("sidebarOverlay");
    const sidebar = getElement("dashboardSidebar");

    if (menuButton) {
        menuButton.setAttribute("aria-expanded", "false");
        menuButton.addEventListener("click", toggleMobileSidebar);
    }

    if (overlay) {
        overlay.hidden = true;
        overlay.setAttribute("aria-hidden", "true");
        overlay.addEventListener("click", closeMobileSidebar);
    }

    if (sidebar) {
        sidebar.querySelectorAll("a").forEach(link => {
            link.addEventListener("click", () => {
                closeMobileSidebar();
            });
        });
    }

    document.addEventListener("keydown", event => {
        if (event.key === "Escape") {
            closeMobileSidebar();
        }
    });

    window.addEventListener("resize", () => {
        if (window.innerWidth > 900) {
            closeMobileSidebar();
        }
    });
}


/* =========================================================
   18. LOGOUT
========================================================= */

function logoutStudent() {
    const confirmed = window.confirm(
        "Are you sure you want to log out of UniClear?"
    );

    if (!confirmed) {
        return;
    }

    /*
     * UniClear's current student login does not use token-based
     * authentication. Remove the student session values without
     * deleting unrelated application data.
     */
    const keysToRemove = [
        STORAGE_KEYS.student,
        STORAGE_KEYS.studentFallback,
        STORAGE_KEYS.studentFallback2,
        STORAGE_KEYS.studentFallback3,
        STORAGE_KEYS.regNo,
        STORAGE_KEYS.role,
        "uniclear_student_name",
        "uniclear_student_email"
    ];

    keysToRemove.forEach(key => {
        sessionStorage.removeItem(key);
        localStorage.removeItem(key);
    });

    window.location.href = "login.html";
}

function bindLogout() {
    const logoutButton = getElement("logoutButton");

    if (logoutButton) {
        logoutButton.addEventListener("click", event => {
            event.preventDefault();
            logoutStudent();
        });
    }

    document.querySelectorAll(
        '[data-action="logout"], .logout-link'
    ).forEach(element => {
        if (element === logoutButton) {
            return;
        }

        element.addEventListener("click", event => {
            event.preventDefault();
            logoutStudent();
        });
    });
}


/* =========================================================
   19. REFRESH DASHBOARD
========================================================= */

async function refreshDashboard() {
    if (!currentStudent) {
        showDashboardMessage(
            "Student information is not available. Please log in again.",
            "error"
        );
        return;
    }

    clearDashboardMessage();

    await loadClearance({ silent: true });
    await loadStudentDocuments({ silent: true });

    showDashboardMessage(
        "Dashboard refreshed.",
        "success"
    );
}

function bindRefreshActions() {
    document.querySelectorAll(
        '[data-action="refresh"], #refreshDashboardButton'
    ).forEach(button => {
        button.addEventListener("click", async event => {
            event.preventDefault();

            if (button.disabled) {
                return;
            }

            button.disabled = true;

            try {
                await refreshDashboard();
            } finally {
                button.disabled = false;
            }
        });
    });
}


/* =========================================================
   20. START CLEARANCE BUTTON EVENT
========================================================= */

function bindCreateClearanceButton() {
    const button = getElement("createClearanceButton");

    if (!button) {
        console.warn(
            'The dashboard HTML does not contain id="createClearanceButton".'
        );
        return;
    }

    button.addEventListener("click", async event => {
        event.preventDefault();

        if (creatingClearance) {
            return;
        }

        await createStudentClearance();
    });
}


/* =========================================================
   21. CURRENT YEAR
========================================================= */

function renderCurrentYear() {
    setText("dashboardCurrentYear", new Date().getFullYear());
}


/* =========================================================
   22. INITIALIZE DASHBOARD
========================================================= */

async function initializeStudentDashboard() {
    if (dashboardInitialized) {
        return;
    }

    dashboardInitialized = true;

    renderCurrentYear();

    bindMobileSidebar();
    bindNavigationLinks();
    bindLogout();
    bindRefreshActions();
    bindCreateClearanceButton();

    currentStudent = getSavedStudent();

    if (!requireStudentSession()) {
        return;
    }

    renderStudentProfile();

    /*
     * Initialize the interface before loading the server record.
     */
    updateStartClearancePrompt();
    renderClearanceStages();
    renderClearanceProgress();

    await loadClearance();
}


/* =========================================================
   23. START WHEN THE PAGE IS READY
========================================================= */

if (document.readyState === "loading") {
    document.addEventListener(
        "DOMContentLoaded",
        initializeStudentDashboard,
        { once: true }
    );
} else {
    initializeStudentDashboard();
}
