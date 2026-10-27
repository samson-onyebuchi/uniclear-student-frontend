
/* =========================================================
   UNICLEAR STUDENT CLEARANCE SYSTEM
   Registration JavaScript
   File: Frontend/js/register.js

   FEATURES:
   1. Preserve existing student registration behaviour.
   2. Allow users to switch between Student and Staff.
   3. Validate the active registration form only.
   4. Submit student registration to the existing endpoint.
   5. Submit staff onboarding to the existing endpoint.
   6. Preserve password visibility toggles.
   7. Display validation and server feedback.
   8. Preserve existing HTML IDs and file paths.
========================================================= */

// ---------------------------------------------------------
// 1. API CONFIGURATION
// ---------------------------------------------------------

const API_BASE_URL = "https://uniclear-student-platform.vercel.app";

const STUDENT_REGISTER_ENDPOINT =
    `${API_BASE_URL}/api/v1/clearance/register/student`;

const STAFF_REGISTER_ENDPOINT =
    `${API_BASE_URL}/api/v1/clearance/admin/onboard/staff`;

// ---------------------------------------------------------
// 2. GET HTML ELEMENTS
// ---------------------------------------------------------

const registerForm = document.getElementById("registerForm");
const registerMessage = document.getElementById("registerMessage");
const registerSubmitButton = document.getElementById("registerSubmitButton");
const registerButtonText = document.getElementById("registerButtonText");
const registerCurrentYear = document.getElementById("registerCurrentYear");

const studentAccountButton =
    document.getElementById("studentAccountButton");

const staffAccountButton =
    document.getElementById("staffAccountButton");

const studentRegistrationFields =
    document.getElementById("studentRegistrationFields");

const staffRegistrationFields =
    document.getElementById("staffRegistrationFields");

let activeAccountType = "student";
let registrationInProgress = false;

// ---------------------------------------------------------
// 3. INITIALIZE THE REGISTRATION PAGE
// ---------------------------------------------------------

document.addEventListener("DOMContentLoaded", () => {
    if (registerCurrentYear) {
        registerCurrentYear.textContent = new Date().getFullYear();
    }

    initializePasswordToggles();
    initializeAccountTypeSelector();
    initializeFieldValidation();
    initializeRegistrationForm();

    setAccountType("student");
});

// ---------------------------------------------------------
// 4. FIELD HELPERS
// ---------------------------------------------------------

function getElement(id) {
    return document.getElementById(id);
}

function getActiveFieldsContainer() {
    return activeAccountType === "staff"
        ? staffRegistrationFields
        : studentRegistrationFields;
}

function getActiveField(id) {
    const container = getActiveFieldsContainer();

    if (!container) {
        return null;
    }

    return container.querySelector(`#${id}`);
}

function getSharedField(id) {
    return getElement(id);
}

function getFieldValue(id) {
    const field = getElement(id);

    return field ? String(field.value || "").trim() : "";
}

// ---------------------------------------------------------
// 5. PASSWORD VISIBILITY TOGGLES
// ---------------------------------------------------------

function initializePasswordToggles() {
    document.querySelectorAll("[data-password-target]").forEach((button) => {
        button.addEventListener("click", () => {
            const targetId = button.dataset.passwordTarget;
            const passwordInput = getElement(targetId);

            if (!passwordInput) {
                return;
            }

            const shouldShow = passwordInput.type === "password";

            passwordInput.type = shouldShow ? "text" : "password";

            const icon = button.querySelector("i");

            if (icon) {
                icon.classList.toggle("fa-eye", !shouldShow);
                icon.classList.toggle("fa-eye-slash", shouldShow);
            }

            button.setAttribute(
                "aria-label",
                shouldShow ? "Hide password" : "Show password"
            );

            button.setAttribute(
                "title",
                shouldShow ? "Hide password" : "Show password"
            );
        });
    });
}

// ---------------------------------------------------------
// 6. DISPLAY REGISTRATION MESSAGES
// ---------------------------------------------------------

function showRegisterMessage(message, type = "info") {
    if (!registerMessage) {
        alert(message);
        return;
    }

    registerMessage.replaceChildren();

    const icon = document.createElement("i");
    const messageText = document.createElement("span");

    const iconClasses = {
        success: "fa-solid fa-circle-check",
        error: "fa-solid fa-circle-exclamation",
        info: "fa-solid fa-circle-info"
    };

    icon.className = iconClasses[type] || iconClasses.info;
    icon.setAttribute("aria-hidden", "true");

    messageText.textContent = message;

    registerMessage.appendChild(icon);
    registerMessage.appendChild(messageText);

    registerMessage.className = `register-message visible ${type}`;
    registerMessage.setAttribute(
        "role",
        type === "error" ? "alert" : "status"
    );
    registerMessage.setAttribute("aria-live", "polite");
}

function clearRegisterMessage() {
    if (!registerMessage) {
        return;
    }

    registerMessage.replaceChildren();
    registerMessage.className = "register-message";
    registerMessage.setAttribute("role", "status");
    registerMessage.setAttribute("aria-live", "polite");
}

// ---------------------------------------------------------
// 7. FIELD ERROR HANDLING
// ---------------------------------------------------------

function showFieldError(field, message) {
    if (!field) {
        return;
    }

    field.setAttribute("aria-invalid", "true");

    const container = field.closest(".register-field");

    if (!container) {
        return;
    }

    let errorElement = container.querySelector(".field-error");

    if (!errorElement) {
        errorElement = document.createElement("small");
        errorElement.className = "field-error";
        errorElement.setAttribute("role", "alert");
        container.appendChild(errorElement);
    }

    errorElement.textContent = message;
    errorElement.classList.add("visible");
}

function clearFieldError(field) {
    if (!field) {
        return;
    }

    field.removeAttribute("aria-invalid");

    const container = field.closest(".register-field");

    if (!container) {
        return;
    }

    const errorElement = container.querySelector(".field-error");

    if (errorElement) {
        errorElement.textContent = "";
        errorElement.classList.remove("visible");
    }
}

function clearActiveFormErrors() {
    const container = getActiveFieldsContainer();

    if (container) {
        container.querySelectorAll("input, select").forEach((field) => {
            clearFieldError(field);
        });
    }

    ["password", "confirm_password", "agreeTerms"].forEach((id) => {
        clearFieldError(getElement(id));
    });
}

// ---------------------------------------------------------
// 8. STUDENT / STAFF ACCOUNT TYPE SELECTOR
// ---------------------------------------------------------

function setContainerFieldsEnabled(container, enabled) {
    if (!container) {
        return;
    }

    container.querySelectorAll("input, select, textarea").forEach((field) => {
        field.disabled = !enabled;
    });
}

function setAccountType(accountType) {
    if (!["student", "staff"].includes(accountType)) {
        return;
    }

    if (registrationInProgress) {
        return;
    }

    activeAccountType = accountType;

    const isStudent = accountType === "student";

    if (studentRegistrationFields) {
        studentRegistrationFields.hidden = !isStudent;
        setContainerFieldsEnabled(studentRegistrationFields, isStudent);
    }

    if (staffRegistrationFields) {
        staffRegistrationFields.hidden = isStudent;
        setContainerFieldsEnabled(staffRegistrationFields, !isStudent);
    }

    if (studentAccountButton) {
        studentAccountButton.setAttribute(
            "aria-pressed",
            String(isStudent)
        );

        studentAccountButton.classList.toggle("active", isStudent);
    }

    if (staffAccountButton) {
        staffAccountButton.setAttribute(
            "aria-pressed",
            String(!isStudent)
        );

        staffAccountButton.classList.toggle("active", !isStudent);
    }

    if (registerForm) {
        registerForm.dataset.accountType = accountType;
    }

    if (registerButtonText) {
        registerButtonText.textContent = isStudent
            ? "Create Student Account"
            : "Register Staff Account";
    }

    clearRegisterMessage();
    clearActiveFormErrors();

    const password = getElement("password");
    const confirmPassword = getElement("confirm_password");

    if (password) {
        password.value = "";
    }

    if (confirmPassword) {
        confirmPassword.value = "";
    }

    const terms = getElement("agreeTerms");

    if (terms) {
        terms.checked = false;
    }
}

function initializeAccountTypeSelector() {
    if (studentAccountButton) {
        studentAccountButton.addEventListener("click", () => {
            setAccountType("student");
        });
    }

    if (staffAccountButton) {
        staffAccountButton.addEventListener("click", () => {
            setAccountType("staff");
        });
    }
}

// ---------------------------------------------------------
// 9. LIVE FIELD VALIDATION
// ---------------------------------------------------------

function initializeFieldValidation() {
    if (!registerForm) {
        return;
    }

    registerForm.querySelectorAll("input, select").forEach((field) => {
        field.addEventListener("input", () => {
            clearFieldError(field);
            clearRegisterMessage();
        });

        field.addEventListener("change", () => {
            clearFieldError(field);
            clearRegisterMessage();
        });
    });
}

// ---------------------------------------------------------
// 10. VALIDATION HELPERS
// ---------------------------------------------------------

function validateRequiredField(id, message, fail) {
    const field = getElement(id);

    if (!field || !String(field.value || "").trim()) {
        fail(field, message);
        return false;
    }

    return true;
}

function validateEmail(field, fail) {
    if (!field || !field.value.trim()) {
        return;
    }

    const email = field.value.trim();
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!emailPattern.test(email) || email.length > 254) {
        fail(field, "Enter a valid email address.");
    }
}

function validatePasswords(fail) {
    const password = getElement("password");
    const confirmPassword = getElement("confirm_password");

    if (password && password.value) {
        if (password.value.length < 8) {
            fail(password, "Password must contain at least 8 characters.");
        } else if (password.value.length > 128) {
            fail(password, "Password must not exceed 128 characters.");
        }
    }

    if (
        password &&
        confirmPassword &&
        password.value &&
        confirmPassword.value &&
        password.value !== confirmPassword.value
    ) {
        fail(confirmPassword, "Your passwords do not match.");
    }
}

function validateTerms(fail) {
    const terms = getElement("agreeTerms");

    if (!terms || !terms.checked) {
        showRegisterMessage(
            "Please accept the terms before creating your account.",
            "error"
        );

        if (terms) {
            terms.focus();
        }

        return false;
    }

    return true;
}

// ---------------------------------------------------------
// 11. VALIDATE STUDENT REGISTRATION
// ---------------------------------------------------------

function validateStudentRegistration(fail) {
    let isValid = true;

    const requiredFields = [
        ["surname", "Enter your surname."],
        ["first_name", "Enter your first name."],
        ["email", "Enter your email address."],
        ["phone_number", "Enter your phone number."],
        ["gender", "Select your gender."],
        ["reg_no", "Enter your registration number."],
        ["admission_year", "Enter your admission year."],
        ["faculty", "Enter your faculty."],
        ["department", "Enter your department."]
    ];

    requiredFields.forEach(([id, message]) => {
        if (!validateRequiredField(id, message, fail)) {
            isValid = false;
        }
    });

    const surname = getElement("surname");
    const firstName = getElement("first_name");
    const otherNames = getElement("other_names");
    const email = getElement("email");
    const phoneNumber = getElement("phone_number");
    const gender = getElement("gender");
    const regNo = getElement("reg_no");
    const admissionYear = getElement("admission_year");

    if (surname && surname.value.trim().length < 2) {
        fail(surname, "Surname must contain at least 2 characters.");
        isValid = false;
    }

    if (firstName && firstName.value.trim().length < 2) {
        fail(firstName, "First name must contain at least 2 characters.");
        isValid = false;
    }

    if (otherNames && otherNames.value.trim().length > 100) {
        fail(otherNames, "Other names must not exceed 100 characters.");
        isValid = false;
    }

    if (email && email.value.trim()) {
        const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

        if (
            !emailPattern.test(email.value.trim()) ||
            email.value.trim().length > 254
        ) {
            fail(email, "Enter a valid email address.");
            isValid = false;
        }
    }

    if (phoneNumber && phoneNumber.value.trim()) {
        const normalizedPhone = phoneNumber.value.replace(/[\s()-]/g, "");

        if (!/^\+?\d{7,15}$/.test(normalizedPhone)) {
            fail(
                phoneNumber,
                "Enter a valid phone number, including your country code if needed."
            );
            isValid = false;
        }
    }

    if (gender && gender.value) {
        if (!["male", "female"].includes(gender.value.toLowerCase())) {
            fail(gender, "Select Male or Female.");
            isValid = false;
        }
    }

    if (regNo && regNo.value.trim().length > 100) {
        fail(regNo, "Registration number is too long.");
        isValid = false;
    }

    if (admissionYear && admissionYear.value.trim()) {
        const year = Number(admissionYear.value);
        const currentYear = new Date().getFullYear();

        if (!Number.isInteger(year) || year < 1900 || year > currentYear) {
            fail(
                admissionYear,
                `Enter a valid admission year between 1900 and ${currentYear}.`
            );
            isValid = false;
        }
    }

    return isValid;
}

// ---------------------------------------------------------
// 12. VALIDATE STAFF REGISTRATION
// ---------------------------------------------------------

function validateStaffRegistration(fail) {
    let isValid = true;

    const requiredFields = [
        ["staff_id", "Enter your official staff ID."],
        ["staff_surname", "Enter your surname."],
        ["staff_first_name", "Enter your first name."],
        ["staff_email", "Enter your official email address."],
        ["staff_department", "Enter your department."],
        ["staff_faculty", "Enter your faculty or administrative unit."],
        ["staff_role", "Select your authorized staff role."]
    ];

    requiredFields.forEach(([id, message]) => {
        if (!validateRequiredField(id, message, fail)) {
            isValid = false;
        }
    });

    const staffId = getElement("staff_id");
    const surname = getElement("staff_surname");
    const firstName = getElement("staff_first_name");
    const otherNames = getElement("staff_other_names");
    const email = getElement("staff_email");
    const department = getElement("staff_department");
    const faculty = getElement("staff_faculty");
    const role = getElement("staff_role");

    if (staffId && staffId.value.trim().length > 100) {
        fail(staffId, "Staff ID must not exceed 100 characters.");
        isValid = false;
    }

    if (surname && surname.value.trim().length < 2) {
        fail(surname, "Surname must contain at least 2 characters.");
        isValid = false;
    }

    if (firstName && firstName.value.trim().length < 2) {
        fail(firstName, "First name must contain at least 2 characters.");
        isValid = false;
    }

    if (otherNames && otherNames.value.trim().length > 100) {
        fail(otherNames, "Other names must not exceed 100 characters.");
        isValid = false;
    }

    if (email && email.value.trim()) {
        const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

        if (
            !emailPattern.test(email.value.trim()) ||
            email.value.trim().length > 254
        ) {
            fail(email, "Enter a valid staff email address.");
            isValid = false;
        }
    }

    if (department && department.value.trim().length > 150) {
        fail(department, "Department must not exceed 150 characters.");
        isValid = false;
    }

    if (faculty && faculty.value.trim().length > 150) {
        fail(faculty, "Faculty must not exceed 150 characters.");
        isValid = false;
    }

    const allowedRoles = [
        "Finance Clearance Officer",
        "Department Clearance Officer",
        "Faculty Clearance Officer",
        "Library Clearance Officer",
        "Health Clearance Officer",
        "Student Affairs Clearance Officer",
        "Final Clearance Officer"
    ];

    if (role && role.value && !allowedRoles.includes(role.value)) {
        fail(role, "Select a valid staff role.");
        isValid = false;
    }

    return isValid;
}

// ---------------------------------------------------------
// 13. VALIDATE THE ACTIVE REGISTRATION FORM
// ---------------------------------------------------------

function validateRegistrationForm() {
    clearRegisterMessage();
    clearActiveFormErrors();

    let isValid = true;
    let firstInvalidField = null;

    function fail(field, message) {
        if (!field) {
            return;
        }

        showFieldError(field, message);

        if (!firstInvalidField) {
            firstInvalidField = field;
        }

        isValid = false;
    }

    if (activeAccountType === "student") {
        if (!validateStudentRegistration(fail)) {
            isValid = false;
        }
    } else {
        if (!validateStaffRegistration(fail)) {
            isValid = false;
        }
    }

    const password = getElement("password");
    const confirmPassword = getElement("confirm_password");

    if (!password || !password.value) {
        fail(password, "Create a password.");
    }

    if (!confirmPassword || !confirmPassword.value) {
        fail(confirmPassword, "Confirm your password.");
    }

    validatePasswords(fail);

    if (!validateTerms(fail)) {
        isValid = false;
    }

    if (!isValid && firstInvalidField) {
        firstInvalidField.focus();
    }

    return isValid;
}

// ---------------------------------------------------------
// 14. SUBMISSION LOADING STATE
// ---------------------------------------------------------

function setRegistrationLoading(isLoading) {
    registrationInProgress = isLoading;

    if (registerSubmitButton) {
        registerSubmitButton.disabled = isLoading;
        registerSubmitButton.classList.toggle("loading", isLoading);

        registerSubmitButton.setAttribute(
            "aria-busy",
            String(isLoading)
        );
    }

    if (registerButtonText) {
        if (isLoading) {
            registerButtonText.textContent =
                activeAccountType === "student"
                    ? "Creating student account..."
                    : "Registering staff account...";
        } else {
            registerButtonText.textContent =
                activeAccountType === "student"
                    ? "Create Student Account"
                    : "Register Staff Account";
        }
    }

    if (studentAccountButton) {
        studentAccountButton.disabled = isLoading;
    }

    if (staffAccountButton) {
        staffAccountButton.disabled = isLoading;
    }
}

// ---------------------------------------------------------
// 15. BUILD STUDENT REGISTRATION PAYLOAD
// ---------------------------------------------------------

function buildStudentRegistrationPayload() {
    const payload = {
        surname: getFieldValue("surname"),
        first_name: getFieldValue("first_name"),
        email: getFieldValue("email"),
        reg_no: getFieldValue("reg_no"),
        department: getFieldValue("department"),
        faculty: getFieldValue("faculty"),
        phone_number: getFieldValue("phone_number"),
        gender: getFieldValue("gender").toLowerCase(),
        admission_year: Number(getFieldValue("admission_year")),
        password: getElement("password").value
    };

    const otherNames = getFieldValue("other_names");

    if (otherNames) {
        payload.other_names = otherNames;
    }

    return payload;
}

// ---------------------------------------------------------
// 16. BUILD STAFF REGISTRATION PAYLOAD
// ---------------------------------------------------------

function buildStaffRegistrationPayload() {
    const payload = {
        staff_id: getFieldValue("staff_id"),
        surname: getFieldValue("staff_surname"),
        first_name: getFieldValue("staff_first_name"),
        email: getFieldValue("staff_email"),
        department: getFieldValue("staff_department"),
        faculty: getFieldValue("staff_faculty"),
        role: getFieldValue("staff_role"),
        password: getElement("password").value,
        confirm_password: getElement("confirm_password").value
    };

    const otherNames = getFieldValue("staff_other_names");

    if (otherNames) {
        payload.other_names = otherNames;
    }

    return payload;
}

// ---------------------------------------------------------
// 17. SEND REGISTRATION REQUEST
// ---------------------------------------------------------

async function sendRegistrationRequest(endpoint, payload) {
    const response = await fetch(endpoint, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "Accept": "application/json"
        },
        body: JSON.stringify(payload)
    });

    const responseText = await response.text();

    let result = {};

    if (responseText) {
        try {
            result = JSON.parse(responseText);
        } catch {
            result = {
                message: "The server returned an unreadable response."
            };
        }
    }

    if (!response.ok || result.success === false) {
        const message =
            result.message ||
            result.error ||
            result.description ||
            `Registration failed (HTTP ${response.status}).`;

        throw new Error(message);
    }

    return result;
}

// ---------------------------------------------------------
// 18. RESET THE ACTIVE FORM AFTER SUCCESS
// ---------------------------------------------------------

function resetRegistrationAfterSuccess() {
    if (!registerForm) {
        return;
    }

    const activeContainer = getActiveFieldsContainer();

    if (activeContainer) {
        activeContainer.querySelectorAll("input, select").forEach((field) => {
            if (field.type === "checkbox" || field.type === "radio") {
                field.checked = false;
            } else {
                field.value = "";
            }

            clearFieldError(field);
        });
    }

    const password = getElement("password");
    const confirmPassword = getElement("confirm_password");
    const terms = getElement("agreeTerms");

    if (password) {
        password.value = "";
    }

    if (confirmPassword) {
        confirmPassword.value = "";
    }

    if (terms) {
        terms.checked = false;
    }

    clearActiveFormErrors();
}

// ---------------------------------------------------------
// 19. INITIALIZE REGISTRATION SUBMISSION
// ---------------------------------------------------------

function initializeRegistrationForm() {
    if (!registerForm) {
        console.error(
            "UniClear registration form not found. Check the ID registerForm."
        );
        return;
    }

    registerForm.addEventListener("submit", async (event) => {
        event.preventDefault();

        if (registrationInProgress) {
            return;
        }

        if (!validateRegistrationForm()) {
            return;
        }

        const accountTypeAtSubmission = activeAccountType;

        const endpoint =
            accountTypeAtSubmission === "student"
                ? STUDENT_REGISTER_ENDPOINT
                : STAFF_REGISTER_ENDPOINT;

        const payload =
            accountTypeAtSubmission === "student"
                ? buildStudentRegistrationPayload()
                : buildStaffRegistrationPayload();

        setRegistrationLoading(true);

        try {
            const result = await sendRegistrationRequest(endpoint, payload);

            const successMessage =
                result.message ||
                (accountTypeAtSubmission === "student"
                    ? "Your student account has been created successfully."
                    : "Your staff account has been registered successfully.");

            showRegisterMessage(successMessage, "success");

            resetRegistrationAfterSuccess();

            // Keep the existing sign-in destination.
            window.setTimeout(() => {
                window.location.href = "login.html";
            }, 2500);
        } catch (error) {
            console.error(
                `UniClear ${accountTypeAtSubmission} registration error:`,
                error
            );

            showRegisterMessage(
                error.message ||
                    "Registration could not be completed. Please try again.",
                "error"
            );
        } finally {
            setRegistrationLoading(false);
        }
    });
}
