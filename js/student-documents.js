/* =========================================================
   UNICLEAR STUDENT CLEARANCE PORTAL
   STUDENT DOCUMENTS PAGE JAVASCRIPT

   File: js/student-documents.js

   FEATURES:
   1. Restore the logged-in student session.
   2. Display the student's name and registration number.
   3. Load submitted documents from the Flask backend.
   4. Upload PDF, DOC, and DOCX documents.
   5. Enforce the 10 MB file-size limit.
   6. Display document statistics and status badges.
   7. Search and filter submitted documents.
   8. View and download uploaded documents.
   9. Display rejection comments and document details.
   10. Refresh the document list.
   11. Handle mobile navigation.
   12. Handle logout and session cleanup.

   API BASE URL:
   https://uniclear-student-platform.vercel.app

   IMPORTANT:
   - No token authentication is assumed.
   - Uses the existing student session keys.
   - Uses the confirmed document API endpoints.
   - Does not set Content-Type manually for FormData.
========================================================= */

"use strict";


/* =========================================================
   1. CONFIGURATION
========================================================= */

const DOCUMENTS_API_BASE_URL =
    "https://uniclear-student-platform.vercel.app";

const DOCUMENTS_API_ENDPOINTS = {
    list: "/api/v1/clearance/documents",
    upload: "/api/v1/clearance/upload-document",
    view: "/api/v1/clearance/document/view/",
    download: "/api/v1/clearance/document/download/"
};

const DOCUMENTS_MAX_FILE_SIZE = 10 * 1024 * 1024;

const DOCUMENTS_ALLOWED_EXTENSIONS = [
    "pdf",
    "doc",
    "docx"
];

const DOCUMENTS_STAGE_LABELS = {
    finance: "Finance",
    department: "Department",
    faculty: "Faculty",
    library: "Library",
    health: "Health Services",
    student_affairs: "Student Affairs",
    final: "Final Clearance"
};


/* =========================================================
   2. DOM HELPERS
========================================================= */

function documentsGetElement(id) {
    return document.getElementById(id);
}

function documentsSetText(id, value) {
    const element = documentsGetElement(id);

    if (element) {
        element.textContent =
            value === null || value === undefined || value === ""
                ? "—"
                : String(value);
    }
}

function documentsShowElement(id, visible = true) {
    const element = documentsGetElement(id);

    if (element) {
        element.hidden = !visible;
    }
}

function documentsGetValue(id) {
    const element = documentsGetElement(id);

    return element ? element.value.trim() : "";
}


/* =========================================================
   3. STUDENT SESSION
========================================================= */

let documentsStudent = null;
let documentsStudentRegNo = "";
let documentsAllRecords = [];
let documentsFilteredRecords = [];
let documentsIsLoading = false;
let documentsIsUploading = false;
let documentsActiveRecord = null;


/*
   Recover the student information saved during login.

   Supported session keys:
   uniclear_student
   uniclear_student_data
   student_data
   student

   The primary key is uniclear_student.
*/

function documentsReadStudentSession() {
    const possibleKeys = [
        "uniclear_student",
        "uniclear_student_data",
        "student_data",
        "student"
    ];

    for (const key of possibleKeys) {
        const savedValue = sessionStorage.getItem(key);

        if (!savedValue) {
            continue;
        }

        try {
            const parsedValue = JSON.parse(savedValue);

            if (
                parsedValue &&
                typeof parsedValue === "object" &&
                !Array.isArray(parsedValue)
            ) {
                const student =
                    parsedValue.student ||
                    parsedValue.user ||
                    parsedValue.data ||
                    parsedValue;

                if (
                    student &&
                    typeof student === "object" &&
                    (
                        student.reg_no ||
                        student.registration_number ||
                        student.registrationNumber
                    )
                ) {
                    return student;
                }
            }
        } catch (error) {
            console.warn(
                "Unable to parse saved student session:",
                key
            );
        }
    }

    return null;
}


function documentsGetStudentRegNo(student) {
    return (
        student?.reg_no ||
        student?.registration_number ||
        student?.registrationNumber ||
        sessionStorage.getItem("uniclear_reg_no") ||
        ""
    ).toString().trim();
}


function documentsRedirectToLogin() {
    window.location.replace("login.html");
}


function documentsInitializeSession() {
    documentsStudent = documentsReadStudentSession();

    documentsStudentRegNo =
        documentsGetStudentRegNo(documentsStudent);

    const savedRole =
        sessionStorage.getItem("uniclear_user_role");

    if (
        savedRole &&
        savedRole.toLowerCase() !== "student"
    ) {
        documentsRedirectToLogin();
        return false;
    }

    if (!documentsStudentRegNo) {
        documentsShowMessage(
            "Your student session could not be restored. Please log in again.",
            "error"
        );

        documentsRedirectToLogin();
        return false;
    }

    documentsSetText(
        "uploadRegNo",
        documentsStudentRegNo
    );

    const registrationInput =
        documentsGetElement("uploadRegNo");

    if (registrationInput) {
        registrationInput.value = documentsStudentRegNo;
    }

    documentsPopulateStudentDetails();

    return true;
}


/* =========================================================
   4. STUDENT PROFILE DISPLAY
========================================================= */

function documentsGetStudentFullName() {
    if (!documentsStudent) {
        return "Student";
    }

    const names = [
        documentsStudent.surname,
        documentsStudent.first_name ||
            documentsStudent.firstName,
        documentsStudent.other_names ||
            documentsStudent.otherNames
    ];

    const fullName = names
        .filter(Boolean)
        .join(" ")
        .trim();

    return fullName || "Student";
}


function documentsGetInitials(fullName) {
    const words = String(fullName || "")
        .trim()
        .split(/\s+/)
        .filter(Boolean);

    if (words.length === 0) {
        return "ST";
    }

    if (words.length === 1) {
        return words[0].substring(0, 2).toUpperCase();
    }

    return (
        words[0].charAt(0) +
        words[words.length - 1].charAt(0)
    ).toUpperCase();
}


function documentsPopulateStudentDetails() {
    const fullName = documentsGetStudentFullName();

    const initials = documentsGetInitials(fullName);

    documentsSetText("sidebarStudentName", fullName);
    documentsSetText("sidebarStudentRegNo", documentsStudentRegNo);

    documentsSetText("topbarStudentName", fullName);
    documentsSetText("topbarAvatar", initials);
    documentsSetText("sidebarStudentAvatar", initials);

    const currentDateElement =
        documentsGetElement("currentDate");

    if (currentDateElement) {
        currentDateElement.textContent =
            new Date().toLocaleDateString("en-NG", {
                day: "numeric",
                month: "short",
                year: "numeric"
            });
    }

    documentsSetText(
        "footerYear",
        new Date().getFullYear()
    );
}


/* =========================================================
   5. MESSAGE DISPLAY
========================================================= */

function documentsShowMessage(message, type = "info") {
    const messageElement =
        documentsGetElement("documentsMessage");

    if (!messageElement) {
        return;
    }

    messageElement.textContent = message;

    messageElement.className = "page-message";

    if (
        ["success", "error", "warning", "info"].includes(type)
    ) {
        messageElement.classList.add(type);
    }

    messageElement.hidden = false;

    messageElement.scrollIntoView({
        behavior: "smooth",
        block: "nearest"
    });
}


function documentsHideMessage() {
    const messageElement =
        documentsGetElement("documentsMessage");

    if (messageElement) {
        messageElement.hidden = true;
        messageElement.textContent = "";
        messageElement.className = "page-message";
    }
}


/* =========================================================
   6. API RESPONSE HELPERS
========================================================= */

async function documentsReadApiResponse(response) {
    const responseText = await response.text();

    if (!responseText) {
        return {};
    }

    try {
        return JSON.parse(responseText);
    } catch (error) {
        return {
            success: response.ok,
            message: response.ok
                ? "The request completed."
                : "The server returned an unreadable response."
        };
    }
}


function documentsGetApiMessage(data, fallbackMessage) {
    if (data && typeof data.message === "string") {
        return data.message;
    }

    if (data && typeof data.error === "string") {
        return data.error;
    }

    return fallbackMessage;
}


function documentsUnwrapApiData(data) {
    let current = data;

    for (let depth = 0; depth < 4; depth++) {
        if (!current || typeof current !== "object") {
            break;
        }

        if (Array.isArray(current)) {
            return current;
        }

        if (Array.isArray(current.documents)) {
            return current;
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


/* =========================================================
   7. LOAD STUDENT DOCUMENTS
========================================================= */

async function documentsLoadRecords(options = {}) {
    if (documentsIsLoading) {
        return;
    }

    if (!documentsStudentRegNo) {
        documentsShowMessage(
            "Student registration number is unavailable. Please log in again.",
            "error"
        );

        return;
    }

    documentsIsLoading = true;

    documentsShowElement("documentsLoadingState", true);
    documentsShowElement("documentsEmptyState", false);

    const refreshButton =
        documentsGetElement("refreshDocumentsButton");

    if (refreshButton) {
        refreshButton.disabled = true;
    }

    if (options.showMessage !== false) {
        documentsHideMessage();
    }

    try {
        const response = await fetch(
            DOCUMENTS_API_BASE_URL +
                DOCUMENTS_API_ENDPOINTS.list,
            {
                method: "POST",

                headers: {
                    "Content-Type": "application/json",
                    "Accept": "application/json"
                },

                body: JSON.stringify({
                    reg_no: documentsStudentRegNo
                })
            }
        );

        const result =
            await documentsReadApiResponse(response);

        if (!response.ok || result.success === false) {
            throw new Error(
                documentsGetApiMessage(
                    result,
                    "Unable to load your submitted documents."
                )
            );
        }

        const responseData =
            documentsUnwrapApiData(result);

        let records = [];

        if (Array.isArray(responseData)) {
            records = responseData;
        } else if (
            responseData &&
            Array.isArray(responseData.documents)
        ) {
            records = responseData.documents;
        } else if (
            responseData &&
            responseData.document
        ) {
            records = [responseData.document];
        }

        documentsAllRecords = records.filter(
            record =>
                record &&
                typeof record === "object"
        );

        documentsApplyFilters();

        documentsUpdateStatistics();

        documentsSetText(
            "sidebarDocumentCount",
            documentsAllRecords.length
        );

        if (options.showMessage === true) {
            documentsShowMessage(
                "Your document list has been refreshed.",
                "success"
            );
        }
    } catch (error) {
        console.error(
            "Student documents loading error:",
            error
        );

        documentsShowMessage(
            error.message ||
                "Unable to load documents. Check your internet connection and try again.",
            "error"
        );

        /*
           Preserve previously loaded records on refresh failure.
           Do not mistake a network error for an empty document list.
        */

        if (documentsAllRecords.length === 0) {
            documentsApplyFilters();
            documentsUpdateStatistics();
        }
    } finally {
        documentsIsLoading = false;

        documentsShowElement(
            "documentsLoadingState",
            false
        );

        if (refreshButton) {
            refreshButton.disabled = false;
        }
    }
}


/* =========================================================
   8. NORMALIZE DOCUMENT FIELDS
========================================================= */

function documentsGetId(record) {
    return (
        record.document_id ||
        record.documentId ||
        record.id ||
        ""
    ).toString();
}


function documentsGetName(record) {
    return (
        record.document_name ||
        record.documentName ||
        record.original_filename ||
        record.originalFilename ||
        record.file_name ||
        record.filename ||
        "Untitled Document"
    ).toString();
}


function documentsGetStage(record) {
    return (
        record.stage ||
        record.clearance_stage ||
        record.clearanceStage ||
        ""
    ).toString().toLowerCase();
}


function documentsGetStatus(record) {
    return (
        record.status ||
        record.document_status ||
        record.documentStatus ||
        "unknown"
    ).toString().toLowerCase().replace(/[\s-]+/g, "_");
}


function documentsGetUploadedDate(record) {
    return (
        record.uploaded_at ||
        record.uploadedAt ||
        record.created_at ||
        record.createdAt ||
        record.date_submitted ||
        record.dateSubmitted ||
        ""
    );
}


function documentsGetFeedback(record) {
    return (
        record.rejection_comment ||
        record.rejectionComment ||
        record.feedback ||
        record.review_comment ||
        record.reviewComment ||
        ""
    ).toString().trim();
}


function documentsGetFileSize(record) {
    const size = Number(
        record.file_size ||
        record.fileSize ||
        record.size ||
        0
    );

    return Number.isFinite(size) && size > 0
        ? size
        : 0;
}


function documentsFormatDate(value) {
    if (!value) {
        return "—";
    }

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
        return String(value);
    }

    return date.toLocaleDateString("en-NG", {
        day: "numeric",
        month: "short",
        year: "numeric"
    });
}


function documentsFormatFileSize(bytes) {
    if (!bytes || bytes <= 0) {
        return "Size unavailable";
    }

    if (bytes < 1024) {
        return `${bytes} B`;
    }

    if (bytes < 1024 * 1024) {
        return `${(bytes / 1024).toFixed(1)} KB`;
    }

    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}


function documentsFormatStage(stage) {
    return DOCUMENTS_STAGE_LABELS[stage] ||
        (stage
            ? stage
                .replace(/_/g, " ")
                .replace(/\b\w/g, character =>
                    character.toUpperCase()
                )
            : "Not specified");
}


function documentsFormatStatus(status) {
    const labels = {
        awaiting_submission: "Awaiting Submission",
        pending: "Pending",
        under_review: "Under Review",
        approved: "Approved",
        rejected: "Rejected",
        completed: "Completed"
    };

    return labels[status] || "Unknown";
}


function documentsGetStatusClass(status) {
    const classes = {
        awaiting_submission: "status-pending",
        pending: "status-pending",
        under_review: "status-under-review",
        approved: "status-approved",
        rejected: "status-rejected"
    };

    return classes[status] || "status-unknown";
}


function documentsGetStatusIcon(status) {
    const icons = {
        awaiting_submission: "fa-clock",
        pending: "fa-clock",
        under_review: "fa-magnifying-glass",
        approved: "fa-check-circle",
        rejected: "fa-times-circle"
    };

    return icons[status] || "fa-circle-question";
}


/* =========================================================
   9. DOCUMENT STATISTICS
========================================================= */

function documentsUpdateStatistics() {
    const total = documentsAllRecords.length;

    const underReview = documentsAllRecords.filter(
        record =>
            documentsGetStatus(record) === "under_review"
    ).length;

    const pending = documentsAllRecords.filter(
        record =>
            documentsGetStatus(record) === "pending" ||
            documentsGetStatus(record) === "awaiting_submission"
    ).length;

    const approved = documentsAllRecords.filter(
        record =>
            documentsGetStatus(record) === "approved"
    ).length;

    const rejected = documentsAllRecords.filter(
        record =>
            documentsGetStatus(record) === "rejected"
    ).length;

    documentsSetText("totalDocuments", total);

    /*
       The existing HTML labels this card "Under Review".
       Count only under_review records in that card.
    */

    documentsSetText("pendingDocuments", underReview);
    documentsSetText("approvedDocuments", approved);
    documentsSetText("rejectedDocuments", rejected);

    const pendingCard =
        documentsGetElement("pendingDocuments");

    if (pendingCard) {
        pendingCard.setAttribute(
            "aria-label",
            `${underReview} documents under review; ${pending} pending`
        );

        pendingCard.title =
            `${pending} pending; ${underReview} under review`;
    }
}


/* =========================================================
   10. SEARCH AND FILTER
========================================================= */

function documentsApplyFilters() {
    const searchText =
        documentsGetValue("documentSearch").toLowerCase();

    const selectedStage =
        documentsGetValue("stageFilter").toLowerCase();

    const selectedStatus =
        documentsGetValue("statusFilter").toLowerCase();

    documentsFilteredRecords = documentsAllRecords.filter(
        record => {
            const name =
                documentsGetName(record).toLowerCase();

            const stage =
                documentsGetStage(record);

            const status =
                documentsGetStatus(record);

            const matchesSearch =
                !searchText || name.includes(searchText);

            const matchesStage =
                !selectedStage || stage === selectedStage;

            const matchesStatus =
                !selectedStatus || status === selectedStatus;

            return (
                matchesSearch &&
                matchesStage &&
                matchesStatus
            );
        }
    );

    documentsRenderTable();
}


/* =========================================================
   11. SAFE HTML HELPERS
========================================================= */

function documentsEscapeHtml(value) {
    return String(value ?? "").replace(
        /[&<>"']/g,
        character => {
            const entities = {
                "&": "&amp;",
                "<": "&lt;",
                ">": "&gt;",
                '"': "&quot;",
                "'": "&#39;"
            };

            return entities[character];
        }
    );
}


function documentsEscapeAttribute(value) {
    return documentsEscapeHtml(value);
}


/* =========================================================
   12. RENDER DOCUMENT TABLE
========================================================= */

function documentsRenderTable() {
    const tableBody =
        documentsGetElement("documentsTableBody");

    if (!tableBody) {
        return;
    }

    tableBody.replaceChildren();

    documentsFilteredRecords.forEach(record => {
        const documentId = documentsGetId(record);

        const name = documentsGetName(record);

        const stage = documentsGetStage(record);

        const status = documentsGetStatus(record);

        const uploadedDate =
            documentsGetUploadedDate(record);

        const feedback = documentsGetFeedback(record);

        const fileSize =
            documentsFormatFileSize(
                documentsGetFileSize(record)
            );

        const statusClass =
            documentsGetStatusClass(status);

        const statusIcon =
            documentsGetStatusIcon(status);

        const row = document.createElement("tr");

        row.innerHTML = `
            <td>
                <div class="document-name-cell">
                    <div class="document-file-icon">
                        <i class="fas fa-file-lines"></i>
                    </div>

                    <div class="document-name-details">
                        <strong>
                            ${documentsEscapeHtml(name)}
                        </strong>

                        <small>
                            ${documentsEscapeHtml(fileSize)}
                        </small>
                    </div>
                </div>
            </td>

            <td>
                <span class="document-stage-label">
                    ${documentsEscapeHtml(
                        documentsFormatStage(stage)
                    )}
                </span>
            </td>

            <td>
                ${documentsEscapeHtml(
                    documentsFormatDate(uploadedDate)
                )}
            </td>

            <td>
                <span class="status-badge ${statusClass}">
                    <i class="fas ${statusIcon}"></i>

                    ${documentsEscapeHtml(
                        documentsFormatStatus(status)
                    )}
                </span>
            </td>

            <td>
                <span class="document-feedback ${
                    feedback ? "has-feedback" : ""
                }">
                    ${documentsEscapeHtml(
                        feedback || "No feedback available"
                    )}
                </span>
            </td>

            <td>
                <div class="document-actions">

                    <button
                        type="button"
                        class="document-action-button view-action"
                        data-document-action="view"
                        data-document-id="${documentsEscapeAttribute(documentId)}"
                        ${documentId ? "" : "disabled"}
                        title="View document details"
                    >
                        <i class="fas fa-eye"></i>
                        View
                    </button>

                    <button
                        type="button"
                        class="document-action-button download-action"
                        data-document-action="download"
                        data-document-id="${documentsEscapeAttribute(documentId)}"
                        ${documentId ? "" : "disabled"}
                        title="Download document"
                    >
                        <i class="fas fa-download"></i>
                        Download
                    </button>

                </div>
            </td>
        `;

        tableBody.appendChild(row);
    });

    const count = documentsFilteredRecords.length;

    documentsSetText(
        "documentsResultCount",
        `Showing ${count} of ${documentsAllRecords.length} documents`
    );

    documentsShowElement(
        "documentsEmptyState",
        count === 0 && !documentsIsLoading
    );

    const emptyTitle =
        documentsGetElement("documentsEmptyTitle");

    const emptyDescription =
        documentsGetElement("documentsEmptyDescription");

    const searchText =
        documentsGetValue("documentSearch");

    const stageFilter =
        documentsGetValue("stageFilter");

    const statusFilter =
        documentsGetValue("statusFilter");

    const hasFilters =
        Boolean(searchText || stageFilter || statusFilter);

    if (emptyTitle && emptyDescription) {
        if (hasFilters) {
            emptyTitle.textContent = "No matching documents";

            emptyDescription.textContent =
                "Try another search term or clear your filters.";
        } else {
            emptyTitle.textContent = "No documents found";

            emptyDescription.textContent =
                "Your submitted documents will appear here after you upload them.";
        }
    }

    documentsShowElement(
        "emptyStateUploadButton",
        !hasFilters && count === 0
    );

    documentsShowElement(
        "clearDocumentFiltersButton",
        hasFilters
    );
}


/* =========================================================
   13. FILE VALIDATION
========================================================= */

function documentsValidateFile(file) {
    if (!file) {
        return "Please select a document to upload.";
    }

    const fileName = file.name || "";

    const extension = fileName
        .split(".")
        .pop()
        .toLowerCase();

    if (!DOCUMENTS_ALLOWED_EXTENSIONS.includes(extension)) {
        return "Unsupported file type. Please select a PDF, DOC, or DOCX file.";
    }

    if (file.size <= 0) {
        return "The selected file is empty. Please choose another file.";
    }

    if (file.size > DOCUMENTS_MAX_FILE_SIZE) {
        return "The file exceeds the maximum allowed size of 10 MB.";
    }

    return "";
}


/* =========================================================
   14. SELECTED FILE PREVIEW
========================================================= */

function documentsUpdateSelectedFile(file) {
    const fileDropContent =
        documentsGetElement("fileDropContent");

    const filePreview =
        documentsGetElement("selectedFilePreview");

    if (!file) {
        documentsShowElement("fileDropContent", true);
        documentsShowElement("selectedFilePreview", false);

        documentsSetText(
            "selectedFileName",
            "No file selected"
        );

        documentsSetText(
            "selectedFileSize",
            "0 KB"
        );

        return;
    }

    documentsSetText("selectedFileName", file.name);

    documentsSetText(
        "selectedFileSize",
        documentsFormatFileSize(file.size)
    );

    if (fileDropContent) {
        fileDropContent.hidden = true;
    }

    if (filePreview) {
        filePreview.hidden = false;
    }
}


function documentsClearSelectedFile() {
    const fileInput =
        documentsGetElement("documentFile");

    if (fileInput) {
        fileInput.value = "";
    }

    documentsUpdateSelectedFile(null);
}


/* =========================================================
   15. UPLOAD BUTTON STATE
========================================================= */

function documentsSetUploadButtonState(isUploading) {
    const button =
        documentsGetElement("uploadDocumentButton");

    const buttonText =
        documentsGetElement("uploadButtonText");

    if (button) {
        button.disabled = isUploading;
    }

    if (buttonText) {
        buttonText.textContent = isUploading
            ? "Uploading..."
            : "Upload Document";
    }
}


/* =========================================================
   16. UPLOAD DOCUMENT
========================================================= */

async function documentsUploadSelectedFile(event) {
    event.preventDefault();

    if (documentsIsUploading) {
        return;
    }

    documentsHideMessage();

    const form =
        documentsGetElement("documentUploadForm");

    const registrationNumber =
        documentsGetValue("uploadRegNo") ||
        documentsStudentRegNo;

    const stage =
        documentsGetValue("documentStage");

    const documentName =
        documentsGetValue("documentName");

    const fileInput =
        documentsGetElement("documentFile");

    const file =
        fileInput?.files?.[0] || null;

    if (!registrationNumber) {
        documentsShowMessage(
            "Your registration number is missing. Please log in again.",
            "error"
        );

        return;
    }

    if (!stage) {
        documentsShowMessage(
            "Please select the clearance stage for this document.",
            "error"
        );

        documentsGetElement("documentStage")?.focus();

        return;
    }

    if (!documentName) {
        documentsShowMessage(
            "Please enter a document name.",
            "error"
        );

        documentsGetElement("documentName")?.focus();

        return;
    }

    if (!file) {
        documentsShowMessage(
            "Please select a document to upload.",
            "error"
        );

        return;
    }

    const validationError =
        documentsValidateFile(file);

    if (validationError) {
        documentsShowMessage(
            validationError,
            "error"
        );

        return;
    }

    /*
       The backend enforces the current clearance stage and
       its submission status. This frontend does not guess
       the student's current stage from potentially stale data.
    */

    const formData = new FormData();

    formData.append("reg_no", registrationNumber);
    formData.append("stage", stage);
    formData.append("document_name", documentName);
    formData.append("document", file);

    documentsIsUploading = true;

    documentsSetUploadButtonState(true);

    documentsShowElement(
        "uploadProgressContainer",
        true
    );

    documentsSetText(
        "uploadProgressLabel",
        "Uploading document..."
    );

    documentsSetText(
        "uploadProgressPercent",
        "Working..."
    );

    const progressBar =
        documentsGetElement("uploadProgressBar");

    const progressTrack =
        documentsGetElement("uploadProgressTrack");

    if (progressBar) {
        progressBar.style.width = "35%";
    }

    if (progressTrack) {
        progressTrack.setAttribute(
            "aria-valuenow",
            "35"
        );
    }

    try {
        const response = await fetch(
            DOCUMENTS_API_BASE_URL +
                DOCUMENTS_API_ENDPOINTS.upload,
            {
                method: "POST",
                headers: {
                    "Accept": "application/json"
                },
                body: formData
            }
        );

        const result =
            await documentsReadApiResponse(response);

        /*
           UPDATE:
           Check the HTTP status and backend response before
           treating the upload as successful. Some backends
           return a success flag, while others return a message
           or the uploaded document without a success flag.
        */

        const uploadExplicitlyFailed =
            result.success === false ||
            result.status === "error" ||
            result.status === "failed" ||
            result.success === 0;

        if (!response.ok || uploadExplicitlyFailed) {
            throw new Error(
                documentsGetApiMessage(
                    result,
                    "Document upload failed. Please try again."
                )
            );
        }

        if (progressBar) {
            progressBar.style.width = "100%";
        }

        if (progressTrack) {
            progressTrack.setAttribute(
                "aria-valuenow",
                "100"
            );
        }

        documentsSetText(
            "uploadProgressPercent",
            "100%"
        );

        documentsSetText(
            "uploadProgressLabel",
            "Upload completed"
        );

        /*
           UPDATE:
           Show a clear success message after the server
           confirms the request completed successfully.
        */

        const successMessage =
            documentsGetApiMessage(
                result,
                "Document uploaded successfully and submitted for review."
            );

        documentsShowMessage(
            successMessage,
            "success"
        );

        /*
           Reset the upload form only after the backend
           confirms a successful upload.
        */

        if (form) {
            form.reset();
        }

        documentsClearSelectedFile();

        /*
           Refresh the document list to show the new record.
           Do not let a list-refresh failure hide the upload
           success message or report the upload as failed.
        */

        await documentsLoadRecords({
            showMessage: false
        });

        documentsShowMessage(
            successMessage,
            "success"
        );
    } catch (error) {
        console.error(
            "Document upload error:",
            error
        );

        documentsShowMessage(
            error.message ||
                "Unable to upload your document. Check your connection and try again.",
            "error"
        );
    } finally {
        documentsIsUploading = false;

        documentsSetUploadButtonState(false);

        documentsShowElement(
            "uploadProgressContainer",
            false
        );
    }
}


/* =========================================================
   17. DOCUMENT VIEW AND DOWNLOAD URLS
========================================================= */

function documentsBuildFileUrl(action, documentId) {
    if (!documentId || !documentsStudentRegNo) {
        throw new Error(
            "The document ID or student registration number is missing."
        );
    }

    const endpoint =
        action === "download"
            ? DOCUMENTS_API_ENDPOINTS.download
            : DOCUMENTS_API_ENDPOINTS.view;

    return (
        DOCUMENTS_API_BASE_URL +
        endpoint +
        encodeURIComponent(documentId) +
        "?reg_no=" +
        encodeURIComponent(documentsStudentRegNo)
    );
}


/* =========================================================
   18. VIEW DOCUMENT DETAILS
========================================================= */

function documentsOpenPreview(record) {
    if (!record) {
        return;
    }

    documentsActiveRecord = record;

    const name = documentsGetName(record);

    const stage = documentsGetStage(record);

    const status = documentsGetStatus(record);

    const uploadedAt = documentsGetUploadedDate(record);

    const feedback = documentsGetFeedback(record);

    const size = documentsFormatFileSize(
        documentsGetFileSize(record)
    );

    documentsSetText(
        "documentPreviewTitle",
        name
    );

    documentsSetText(
        "documentPreviewSubtitle",
        "Document submission details"
    );

    const body =
        documentsGetElement("documentPreviewBody");

    if (body) {
        body.replaceChildren();

        const details = [
            ["Document Name", name],
            ["Clearance Stage", documentsFormatStage(stage)],
            ["Status", documentsFormatStatus(status)],
            ["Date Submitted", documentsFormatDate(uploadedAt)],
            ["File Size", size],
            ["Officer's Feedback", feedback || "No feedback available"]
        ];

        details.forEach(([label, value]) => {
            const item = document.createElement("div");

            item.className = "document-preview-detail";

            const heading = document.createElement("strong");
            heading.textContent = label;

            const paragraph = document.createElement("p");
            paragraph.textContent = value;

            item.appendChild(heading);
            item.appendChild(paragraph);

            body.appendChild(item);
        });
    }

    const downloadLink =
        documentsGetElement("downloadDocumentLink");

    if (downloadLink) {
        const documentId = documentsGetId(record);

        if (documentId) {
            downloadLink.href = documentsBuildFileUrl(
                "download",
                documentId
            );

            downloadLink.hidden = false;
        } else {
            downloadLink.hidden = true;
        }
    }

    documentsShowElement(
        "documentPreviewModal",
        true
    );

    document.body.style.overflow = "hidden";
}


function documentsClosePreview() {
    documentsShowElement(
        "documentPreviewModal",
        false
    );

    document.body.style.overflow = "";

    documentsActiveRecord = null;
}


/* =========================================================
   19. OPEN DOCUMENT FILE
========================================================= */

function documentsHandleTableAction(event) {
    const button = event.target.closest(
        "[data-document-action]"
    );

    if (!button) {
        return;
    }

    const action =
        button.dataset.documentAction;

    const documentId =
        button.dataset.documentId;

    const record = documentsAllRecords.find(
        item => documentsGetId(item) === documentId
    );

    if (!record) {
        documentsShowMessage(
            "The selected document could not be found. Refresh the list and try again.",
            "error"
        );

        return;
    }

    if (action === "view") {
        documentsOpenPreview(record);
        return;
    }

    if (action === "download") {
        documentsDownloadRecord(record);
    }
}


function documentsViewRecord(record) {
    const documentId = documentsGetId(record);

    if (!documentId) {
        documentsShowMessage(
            "This document has no valid document ID.",
            "error"
        );

        return;
    }

    try {
        const url = documentsBuildFileUrl(
            "view",
            documentId
        );

        window.open(
            url,
            "_blank",
            "noopener,noreferrer"
        );
    } catch (error) {
        documentsShowMessage(
            error.message,
            "error"
        );
    }
}


function documentsDownloadRecord(record) {
    const documentId = documentsGetId(record);

    if (!documentId) {
        documentsShowMessage(
            "This document has no valid document ID.",
            "error"
        );

        return;
    }

    try {
        const url = documentsBuildFileUrl(
            "download",
            documentId
        );

        const link = document.createElement("a");

        link.href = url;
        link.target = "_blank";
        link.rel = "noopener noreferrer";

        document.body.appendChild(link);

        link.click();

        link.remove();
    } catch (error) {
        documentsShowMessage(
            error.message,
            "error"
        );
    }
}


/* =========================================================
   20. FILTER RESET
========================================================= */

function documentsClearFilters() {
    const searchInput =
        documentsGetElement("documentSearch");

    const stageFilter =
        documentsGetElement("stageFilter");

    const statusFilter =
        documentsGetElement("statusFilter");

    if (searchInput) {
        searchInput.value = "";
    }

    if (stageFilter) {
        stageFilter.value = "";
    }

    if (statusFilter) {
        statusFilter.value = "";
    }

    documentsApplyFilters();
}


/* =========================================================
   21. UPLOAD FORM RESET
========================================================= */

function documentsHandleFormReset() {
    /*
       Wait until the browser has reset the form controls.
    */

    window.setTimeout(() => {
        documentsClearSelectedFile();
        documentsHideMessage();
    }, 0);
}


/* =========================================================
   22. MOBILE SIDEBAR
========================================================= */

function documentsOpenSidebar() {
    const sidebar =
        documentsGetElement("dashboardSidebar");

    const overlay =
        documentsGetElement("sidebarOverlay");

    if (sidebar) {
        sidebar.classList.add("sidebar-open");
    }

    if (overlay) {
        overlay.classList.add("overlay-visible");
    }

    document.body.style.overflow = "hidden";
}


function documentsCloseSidebar() {
    const sidebar =
        documentsGetElement("dashboardSidebar");

    const overlay =
        documentsGetElement("sidebarOverlay");

    if (sidebar) {
        sidebar.classList.remove("sidebar-open");
    }

    if (overlay) {
        overlay.classList.remove("overlay-visible");
    }

    document.body.style.overflow = "";
}


/* =========================================================
   23. LOGOUT
========================================================= */

function documentsLogout() {
    const confirmed = window.confirm(
        "Are you sure you want to log out?"
    );

    if (!confirmed) {
        return;
    }

    /*
       This project does not use token-based logout.
       Clear only UniClear session information.
    */

    const sessionKeys = [
        "uniclear_student",
        "uniclear_student_data",
        "uniclear_reg_no",
        "uniclear_user_role",
        "uniclear_staff_id",
        "student_data",
        "student"
    ];

    sessionKeys.forEach(key => {
        sessionStorage.removeItem(key);
    });

    documentsRedirectToLogin();
}


/* =========================================================
   24. EVENT LISTENERS
========================================================= */

function documentsRegisterEventListeners() {
    const uploadForm =
        documentsGetElement("documentUploadForm");

    if (uploadForm) {
        uploadForm.addEventListener(
            "submit",
            documentsUploadSelectedFile
        );

        uploadForm.addEventListener(
            "reset",
            documentsHandleFormReset
        );
    }

    const fileInput =
        documentsGetElement("documentFile");

    if (fileInput) {
        fileInput.addEventListener("change", () => {
            const file = fileInput.files?.[0] || null;

            if (!file) {
                documentsUpdateSelectedFile(null);
                return;
            }

            const validationError =
                documentsValidateFile(file);

            if (validationError) {
                documentsShowMessage(
                    validationError,
                    "error"
                );

                documentsClearSelectedFile();
                return;
            }

            documentsHideMessage();
            documentsUpdateSelectedFile(file);
        });
    }

    const removeFileButton =
        documentsGetElement("removeSelectedFile");

    if (removeFileButton) {
        removeFileButton.addEventListener(
            "click",
            event => {
                event.preventDefault();
                event.stopPropagation();

                documentsClearSelectedFile();
            }
        );
    }

    /*
       Optional drag-and-drop file selection.
       The same file validation is used as the file input.
    */

    const dropZone =
        documentsGetElement("fileDropZone");

    if (dropZone) {
        ["dragenter", "dragover"].forEach(eventName => {
            dropZone.addEventListener(eventName, event => {
                event.preventDefault();

                dropZone.classList.add("drag-over");
            });
        });

        ["dragleave", "drop"].forEach(eventName => {
            dropZone.addEventListener(eventName, event => {
                event.preventDefault();

                dropZone.classList.remove("drag-over");
            });
        });

        dropZone.addEventListener("drop", event => {
            const droppedFile =
                event.dataTransfer?.files?.[0];

            if (!droppedFile || !fileInput) {
                return;
            }

            /*
               Assigning dropped files through DataTransfer
               allows the existing form submission to use them.
            */

            const validationError =
                documentsValidateFile(droppedFile);

            if (validationError) {
                documentsShowMessage(
                    validationError,
                    "error"
                );

                return;
            }

            try {
                const transfer = new DataTransfer();

                transfer.items.add(droppedFile);

                fileInput.files = transfer.files;

                documentsUpdateSelectedFile(droppedFile);

                documentsHideMessage();
            } catch (error) {
                documentsShowMessage(
                    "Your browser could not attach the dropped file. Please use Browse Files instead.",
                    "warning"
                );
            }
        });
    }

    const refreshButton =
        documentsGetElement("refreshDocumentsButton");

    if (refreshButton) {
        refreshButton.addEventListener("click", () => {
            documentsLoadRecords({
                showMessage: true
            });
        });
    }

    const searchInput =
        documentsGetElement("documentSearch");

    if (searchInput) {
        searchInput.addEventListener(
            "input",
            documentsApplyFilters
        );
    }

    const stageFilter =
        documentsGetElement("stageFilter");

    if (stageFilter) {
        stageFilter.addEventListener(
            "change",
            documentsApplyFilters
        );
    }

    const statusFilter =
        documentsGetElement("statusFilter");

    if (statusFilter) {
        statusFilter.addEventListener(
            "change",
            documentsApplyFilters
        );
    }

    const clearFiltersButton =
        documentsGetElement("clearDocumentFiltersButton");

    if (clearFiltersButton) {
        clearFiltersButton.addEventListener(
            "click",
            documentsClearFilters
        );
    }

    const emptyStateUploadButton =
        documentsGetElement("emptyStateUploadButton");

    if (emptyStateUploadButton) {
        emptyStateUploadButton.addEventListener(
            "click",
            () => {
                documentsGetElement("documentName")?.focus();

                documentsGetElement(
                    "documentUploadForm"
                )?.scrollIntoView({
                    behavior: "smooth",
                    block: "start"
                });
            }
        );
    }

    const tableBody =
        documentsGetElement("documentsTableBody");

    if (tableBody) {
        tableBody.addEventListener(
            "click",
            documentsHandleTableAction
        );
    }

    const closePreviewButton =
        documentsGetElement("closeDocumentPreview");

    const cancelPreviewButton =
        documentsGetElement("cancelDocumentPreview");

    const modalBackdrop =
        documentsGetElement("documentModalBackdrop");

    if (closePreviewButton) {
        closePreviewButton.addEventListener(
            "click",
            documentsClosePreview
        );
    }

    if (cancelPreviewButton) {
        cancelPreviewButton.addEventListener(
            "click",
            documentsClosePreview
        );
    }

    if (modalBackdrop) {
        modalBackdrop.addEventListener(
            "click",
            documentsClosePreview
        );
    }

    const mobileMenuButton =
        documentsGetElement("mobileMenuButton");

    if (mobileMenuButton) {
        mobileMenuButton.addEventListener(
            "click",
            documentsOpenSidebar
        );
    }

    const sidebarCloseButton =
        documentsGetElement("sidebarCloseButton");

    if (sidebarCloseButton) {
        sidebarCloseButton.addEventListener(
            "click",
            documentsCloseSidebar
        );
    }

    const sidebarOverlay =
        documentsGetElement("sidebarOverlay");

    if (sidebarOverlay) {
        sidebarOverlay.addEventListener(
            "click",
            documentsCloseSidebar
        );
    }

    const logoutButton =
        documentsGetElement("logoutButton");

    if (logoutButton) {
        logoutButton.addEventListener(
            "click",
            documentsLogout
        );
    }

    const profileButton =
        documentsGetElement("topbarProfileButton");

    if (profileButton) {
        profileButton.addEventListener(
            "click",
            () => {
                window.location.href =
                    "student-profile.html";
            }
        );
    }

    document.addEventListener("keydown", event => {
        if (event.key === "Escape") {
            documentsClosePreview();
            documentsCloseSidebar();
        }
    });

    window.addEventListener("resize", () => {
        if (window.innerWidth > 950) {
            documentsCloseSidebar();
        }
    });
}


/* =========================================================
   25. INITIALIZE PAGE
========================================================= */

function initializeStudentDocumentsPage() {
    documentsPopulateStudentDetails();

    documentsRegisterEventListeners();

    if (!documentsInitializeSession()) {
        return;
    }

    documentsLoadRecords({
        showMessage: false
    });
}


/* =========================================================
   26. START APPLICATION
========================================================= */

if (document.readyState === "loading") {
    document.addEventListener(
        "DOMContentLoaded",
        initializeStudentDocumentsPage
    );
} else {
    initializeStudentDocumentsPage();
}