
/* =========================================================
   UNICLEAR STUDENT CLEARANCE PORTAL
   STUDENT CHANGE PASSWORD JAVASCRIPT

   File: js/student-change-password.js

   FEATURES:
   1. Restore the signed-in student's registration number.
   2. Display the current date and footer year.
   3. Toggle password visibility.
   4. Validate required password fields.
   5. Check new password confirmation.
   6. Submit password changes to the Flask backend.
   7. Display success, error and loading messages.
   8. Prevent duplicate form submissions.
   9. Support the UniClear responsive navigation.
   10. Avoid storing passwords in browser storage.
   11. Handle unsuccessful and unexpected backend responses.
   12. Preserve the disabled state when required information
       is missing.

   BACKEND ENDPOINT:
   POST /api/v1/clearance/change-password/student

   EXPECTED JSON:
   {
       "reg_no": "...",
       "current_password": "...",
       "new_password": "...",
       "confirm_password": "..."
   }

   IMPORTANT:
   Change API_BASE_URL to your local Flask server when
   testing locally. The deployed URL is used by default.
========================================================= */


/* =========================================================
   1. API CONFIGURATION
========================================================= */

const API_BASE_URL = "https://uniclear-student-platform.vercel.app";

const CHANGE_PASSWORD_ENDPOINT =
    `${API_BASE_URL}/api/v1/clearance/change-password/student`;


/* =========================================================
   2. PAGE ELEMENTS
========================================================= */

const changePasswordForm =
    document.getElementById("changePasswordForm");

const regNoInput =
    document.getElementById("regNo");

const currentPasswordInput =
    document.getElementById("currentPassword");

const newPasswordInput =
    document.getElementById("newPassword");

const confirmPasswordInput =
    document.getElementById("confirmPassword");

const changePasswordButton =
    document.getElementById("changePasswordButton");

const passwordMessage =
    document.getElementById("passwordMessage");

const confirmPasswordHelp =
    document.getElementById("confirmPasswordHelp");

const footerYear =
    document.getElementById("footerYear");

const currentDateElement =
    document.getElementById("currentDate");


/* =========================================================
   3. FORM SUBMISSION STATE
========================================================= */

let isPasswordRequestInProgress = false;

let isRegistrationNumberMissing = false;


/* =========================================================
   4. STORAGE HELPERS
========================================================= */

function readStoredValue(key) {
    try {
        const value = localStorage.getItem(key);

        if (value !== null && value !== "") {
            return value;
        }
    } catch (error) {
        console.warn("Could not read local storage:", error);
    }

    try {
        const value = sessionStorage.getItem(key);

        if (value !== null && value !== "") {
            return value;
        }
    } catch (error) {
        console.warn("Could not read session storage:", error);
    }

    return null;
}


function parseStoredStudent(value) {
    if (!value) {
        return null;
    }

    try {
        const parsed = JSON.parse(value);

        if (parsed && typeof parsed === "object") {
            return parsed;
        }
    } catch (error) {
        // The stored value may be a plain string.
    }

    return null;
}


function getStudentDetails() {
    const possibleStudentKeys = [
        "uniclear_student",
        "uniclear_student_data",
        "student_data",
        "student"
    ];

    for (const key of possibleStudentKeys) {
        const student = parseStoredStudent(readStoredValue(key));

        if (student) {
            return student;
        }
    }

    return {
        reg_no:
            readStoredValue("uniclear_reg_no") ||
            readStoredValue("reg_no") ||
            readStoredValue("student_reg_no"),

        surname:
            readStoredValue("uniclear_surname") ||
            readStoredValue("surname"),

        first_name:
            readStoredValue("uniclear_first_name") ||
            readStoredValue("first_name"),

        other_names:
            readStoredValue("uniclear_other_names") ||
            readStoredValue("other_names")
    };
}


function getStudentRegNo(student) {
    if (!student || typeof student !== "object") {
        return "";
    }

    return String(
        student.reg_no ||
        student.regNo ||
        student.registration_number ||
        student.registrationNumber ||
        student.student_reg_no ||
        ""
    ).trim();
}


function getStudentFullName(student) {
    if (!student || typeof student !== "object") {
        return "Student";
    }

    const fullName = [
        student.first_name || student.firstName,
        student.other_names || student.otherNames,
        student.surname
    ]
        .filter(Boolean)
        .join(" ")
        .trim();

    return fullName || student.full_name || student.fullName || "Student";
}


/* =========================================================
   5. INITIALIZE STUDENT INFORMATION
========================================================= */

function initializeStudentInformation() {
    const student = getStudentDetails();
    const registrationNumber = getStudentRegNo(student);
    const fullName = getStudentFullName(student);

    isRegistrationNumberMissing = !registrationNumber;

    if (regNoInput) {
        regNoInput.value = registrationNumber;
    }

    const sidebarStudentName =
        document.getElementById("sidebarStudentName");

    const sidebarStudentRegNo =
        document.getElementById("sidebarStudentRegNo");

    const topbarStudentName =
        document.getElementById("topbarStudentName");

    if (sidebarStudentName) {
        sidebarStudentName.textContent = fullName;
    }

    if (sidebarStudentRegNo) {
        sidebarStudentRegNo.textContent =
            registrationNumber || "Registration Number";
    }

    if (topbarStudentName) {
        topbarStudentName.textContent = fullName;
    }

    if (footerYear) {
        footerYear.textContent = new Date().getFullYear();
    }

    if (currentDateElement) {
        currentDateElement.textContent =
            new Intl.DateTimeFormat("en-NG", {
                day: "numeric",
                month: "short",
                year: "numeric"
            }).format(new Date());
    }

    if (isRegistrationNumberMissing) {
        showPasswordMessage(
            "error",
            "Your registration number could not be found. Please sign in again before changing your password."
        );

        if (changePasswordButton) {
            changePasswordButton.disabled = true;
        }
    }
}


/* =========================================================
   6. DISPLAY FORM MESSAGES
========================================================= */

function showPasswordMessage(type, message) {
    if (!passwordMessage) {
        return;
    }

    passwordMessage.className = `password-message ${type}`;
    passwordMessage.textContent = message;
    passwordMessage.hidden = false;

    passwordMessage.scrollIntoView({
        behavior: "smooth",
        block: "nearest"
    });
}


function clearPasswordMessage() {
    if (!passwordMessage) {
        return;
    }

    passwordMessage.textContent = "";
    passwordMessage.className = "password-message";
    passwordMessage.hidden = true;
}


/* =========================================================
   7. PASSWORD VISIBILITY TOGGLE
========================================================= */

function initializePasswordVisibility() {
    const toggleButtons = document.querySelectorAll(
        ".password-toggle[data-target]"
    );

    toggleButtons.forEach((button) => {
        button.addEventListener("click", () => {
            const targetId = button.dataset.target;
            const input = document.getElementById(targetId);

            if (!input) {
                return;
            }

            const shouldShow = input.type === "password";

            input.type = shouldShow ? "text" : "password";

            button.setAttribute(
                "aria-label",
                shouldShow ? "Hide password" : "Show password"
            );

            button.setAttribute(
                "aria-pressed",
                String(shouldShow)
            );

            const icon = button.querySelector("i");

            if (icon) {
                icon.classList.toggle(
                    "fa-eye",
                    !shouldShow
                );

                icon.classList.toggle(
                    "fa-eye-slash",
                    shouldShow
                );
            }
        });
    });
}


/* =========================================================
   8. CONFIRM PASSWORD VALIDATION
========================================================= */

function updatePasswordConfirmation() {
    if (!newPasswordInput ||
        !confirmPasswordInput ||
        !confirmPasswordHelp) {
        return true;
    }

    const newPassword = newPasswordInput.value;
    const confirmPassword = confirmPasswordInput.value;

    const wrapper = confirmPasswordInput.closest(".input-wrapper");

    if (wrapper) {
        wrapper.classList.remove("input-valid", "input-invalid");
    }

    confirmPasswordHelp.classList.remove("match", "mismatch");

    if (!confirmPassword) {
        confirmPasswordHelp.textContent =
            "Enter the same password you entered above.";

        return false;
    }

    if (newPassword !== confirmPassword) {
        confirmPasswordHelp.textContent =
            "The passwords do not match.";

        confirmPasswordHelp.classList.add("mismatch");

        if (wrapper) {
            wrapper.classList.add("input-invalid");
        }

        return false;
    }

    confirmPasswordHelp.textContent =
        "Your passwords match.";

    confirmPasswordHelp.classList.add("match");

    if (wrapper) {
        wrapper.classList.add("input-valid");
    }

    return true;
}


/* =========================================================
   9. PASSWORD FORM VALIDATION
========================================================= */

function validatePasswordForm() {
    const registrationNumber =
        regNoInput ? regNoInput.value.trim() : "";

    const currentPassword =
        currentPasswordInput ? currentPasswordInput.value : "";

    const newPassword =
        newPasswordInput ? newPasswordInput.value : "";

    const confirmPassword =
        confirmPasswordInput ? confirmPasswordInput.value : "";

    if (!registrationNumber) {
        showPasswordMessage(
            "error",
            "Your registration number is missing. Please sign in again."
        );

        return false;
    }

    if (!currentPassword) {
        showPasswordMessage(
            "error",
            "Please enter your current password."
        );

        if (currentPasswordInput) {
            currentPasswordInput.focus();
        }

        return false;
    }

    if (!newPassword) {
        showPasswordMessage(
            "error",
            "Please enter your new password."
        );

        if (newPasswordInput) {
            newPasswordInput.focus();
        }

        return false;
    }

    if (newPassword.length < 8) {
        showPasswordMessage(
            "error",
            "Your new password must contain at least 8 characters."
        );

        if (newPasswordInput) {
            newPasswordInput.focus();
        }

        return false;
    }

    if (newPassword === currentPassword) {
        showPasswordMessage(
            "error",
            "Your new password must be different from your current password."
        );

        if (newPasswordInput) {
            newPasswordInput.focus();
        }

        return false;
    }

    if (!confirmPassword) {
        showPasswordMessage(
            "error",
            "Please confirm your new password."
        );

        if (confirmPasswordInput) {
            confirmPasswordInput.focus();
        }

        return false;
    }

    if (newPassword !== confirmPassword) {
        showPasswordMessage(
            "error",
            "Your new password and confirmation do not match."
        );

        if (confirmPasswordInput) {
            confirmPasswordInput.focus();
        }

        updatePasswordConfirmation();

        return false;
    }

    return true;
}


/* =========================================================
   10. LOADING STATE
========================================================= */

function setPasswordFormLoading(isLoading) {
    if (!changePasswordButton) {
        return;
    }

    changePasswordButton.disabled =
        isLoading || isRegistrationNumberMissing;

    const buttonText =
        changePasswordButton.querySelector("span");

    const buttonIcon =
        changePasswordButton.querySelector("i");

    if (isLoading) {
        if (buttonText) {
            buttonText.textContent = "Updating Password...";
        }

        if (buttonIcon) {
            buttonIcon.className = "fa-solid fa-spinner fa-spin";
        }

        return;
    }

    if (buttonText) {
        buttonText.textContent = "Update Password";
    }

    if (buttonIcon) {
        buttonIcon.className = "fa-solid fa-shield-halved";
    }
}


/* =========================================================
   11. CLEAR PASSWORD FIELDS
========================================================= */

function clearPasswordFields() {
    if (currentPasswordInput) {
        currentPasswordInput.value = "";
    }

    if (newPasswordInput) {
        newPasswordInput.value = "";
    }

    if (confirmPasswordInput) {
        confirmPasswordInput.value = "";
    }

    if (confirmPasswordHelp) {
        confirmPasswordHelp.textContent =
            "Enter the same password you entered above.";

        confirmPasswordHelp.classList.remove("match", "mismatch");
    }

    document.querySelectorAll(
        "#currentPassword, #newPassword, #confirmPassword"
    ).forEach((input) => {
        const wrapper = input.closest(".input-wrapper");

        if (wrapper) {
            wrapper.classList.remove(
                "input-valid",
                "input-invalid"
            );
        }

        input.type = "password";
    });

    document.querySelectorAll(
        ".password-toggle[data-target]"
    ).forEach((button) => {
        button.setAttribute("aria-pressed", "false");
        button.setAttribute("aria-label", "Show password");

        const icon = button.querySelector("i");

        if (icon) {
            icon.className = "fa-regular fa-eye";
        }
    });
}


/* =========================================================
   12. INTERPRET BACKEND RESPONSES
========================================================= */

async function readBackendResponse(response) {
    const responseText = await response.text();

    if (!responseText) {
        return {};
    }

    try {
        const data = JSON.parse(responseText);

        if (data && typeof data === "object") {
            return data;
        }

        return {
            message: "The server returned an unexpected response."
        };
    } catch (error) {
        return {
            message: response.ok
                ? "The server returned an unexpected response."
                : "The server could not process your request."
        };
    }
}


function getBackendErrorMessage(data, status) {
    if (data && typeof data.message === "string") {
        return data.message;
    }

    if (data && typeof data.error === "string") {
        return data.error;
    }

    if (status === 400) {
        return "Please check the information you entered.";
    }

    if (status === 401 || status === 403) {
        return "Your current password may be incorrect, or the request was not authorized.";
    }

    if (status === 404) {
        return "The password-change endpoint could not be found. Please verify the deployed backend.";
    }

    if (status === 405) {
        return "The backend does not allow this request method for the password-change endpoint.";
    }

    if (status === 429) {
        return "Too many requests were made. Please wait a moment and try again.";
    }

    if (status >= 500) {
        return "The server encountered an error. Please try again later.";
    }

    return "Your password could not be changed. Please try again.";
}


/* =========================================================
   13. SUBMIT PASSWORD CHANGE REQUEST
========================================================= */

async function handleChangePassword(event) {
    event.preventDefault();

    /*
     * Prevent duplicate submissions while a request
     * is already being processed.
     */
    if (isPasswordRequestInProgress) {
        return;
    }

    clearPasswordMessage();

    if (!validatePasswordForm()) {
        return;
    }

    const registrationNumber = regNoInput.value.trim();

    const requestBody = {
        reg_no: registrationNumber,
        current_password: currentPasswordInput.value,
        new_password: newPasswordInput.value,
        confirm_password: confirmPasswordInput.value
    };

    isPasswordRequestInProgress = true;

    setPasswordFormLoading(true);

    try {
        const response = await fetch(CHANGE_PASSWORD_ENDPOINT, {
            method: "POST",

            headers: {
                "Content-Type": "application/json",
                "Accept": "application/json"
            },

            body: JSON.stringify(requestBody)
        });

        const data = await readBackendResponse(response);

        /*
         * A successful HTTP response alone is not sufficient
         * if the backend explicitly reports failure.
         */
        const backendReportedFailure =
            data.success === false ||
            data.status === "error" ||
            data.status === "failed";

        if (!response.ok || backendReportedFailure) {
            showPasswordMessage(
                "error",
                getBackendErrorMessage(data, response.status)
            );

            return;
        }

        showPasswordMessage(
            "success",
            data.message || "Your password has been changed successfully."
        );

        /*
         * Clear password values after a successful update.
         * Passwords are never saved to localStorage or
         * sessionStorage by this script.
         */
        clearPasswordFields();

        /*
         * Do not log the student out automatically.
         * The existing backend response confirms that the
         * password was changed successfully.
         */

    } catch (error) {
        console.error("Change password request failed:", error);

        showPasswordMessage(
            "error",
            "Unable to connect to the server. Check your internet connection and try again."
        );

    } finally {
        isPasswordRequestInProgress = false;

        setPasswordFormLoading(false);
    }
}


/* =========================================================
   14. LIVE VALIDATION EVENTS
========================================================= */

function initializePasswordValidation() {
    if (newPasswordInput) {
        newPasswordInput.addEventListener("input", () => {
            clearPasswordMessage();

            if (confirmPasswordInput &&
                confirmPasswordInput.value) {
                updatePasswordConfirmation();
            }
        });
    }

    if (confirmPasswordInput) {
        confirmPasswordInput.addEventListener("input", () => {
            clearPasswordMessage();
            updatePasswordConfirmation();
        });
    }

    if (currentPasswordInput) {
        currentPasswordInput.addEventListener("input", () => {
            clearPasswordMessage();
        });
    }
}


/* =========================================================
   15. MOBILE SIDEBAR NAVIGATION
========================================================= */

function initializeChangePasswordNavigation() {
    const sidebar =
        document.getElementById("dashboardSidebar");

    const overlay =
        document.getElementById("sidebarOverlay");

    const openButton =
        document.getElementById("mobileMenuButton");

    const closeButton =
        document.getElementById("sidebarCloseButton");

    function openSidebar() {
        if (sidebar) {
            sidebar.classList.add("active");
        }

        if (overlay) {
            overlay.classList.add("active");
        }

        document.body.classList.add("sidebar-open");
    }

    function closeSidebar() {
        if (sidebar) {
            sidebar.classList.remove("active");
        }

        if (overlay) {
            overlay.classList.remove("active");
        }

        document.body.classList.remove("sidebar-open");
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

    document.querySelectorAll(
        "#dashboardSidebar .sidebar-link"
    ).forEach((link) => {
        link.addEventListener("click", closeSidebar);
    });

    document.addEventListener("keydown", (event) => {
        if (event.key === "Escape") {
            closeSidebar();
        }
    });
}


/* =========================================================
   16. INITIALIZE PAGE
========================================================= */

document.addEventListener("DOMContentLoaded", () => {
    initializeStudentInformation();

    initializePasswordVisibility();

    initializePasswordValidation();

    initializeChangePasswordNavigation();

    if (changePasswordForm) {
        changePasswordForm.addEventListener(
            "submit",
            handleChangePassword
        );
    }
});
