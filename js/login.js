/* =========================================================
   UNICLEAR STUDENT CLEARANCE PORTAL
   LOGIN PAGE JAVASCRIPT

   File: Frontend/js/login.js

   FEATURES:
   1. Switch between Student and Staff login.
   2. Update the identifier label and placeholder.
   3. Synchronize the Forgot Password link with the selected role.
   4. Validate login form fields.
   5. Authenticate students through the student login endpoint.
   6. Authenticate staff through the staff login endpoint.
   7. Show and hide passwords.
   8. Remember the user's identifier when requested.
   9. Display login success and error messages.
   10. Store the appropriate account details in sessionStorage.
   11. Redirect students and staff to the correct dashboard.
   12. Redirect staff who must change their password.
   13. Prevent duplicate login submissions.
   14. Display the current year in the page footer.

   IMPORTANT:
   - This file uses the existing UniClear backend endpoints.
   - It does not introduce token authentication.
   - It does not change the backend API.
========================================================= */


/* =========================================================
   1. CONFIGURATION
========================================================= */

const API_BASE_URL = "https://uniclear-student-platform.vercel.app";

const STUDENT_LOGIN_ENDPOINT =
    `${API_BASE_URL}/api/v1/clearance/login/student`;

const STAFF_LOGIN_ENDPOINT =
    `${API_BASE_URL}/api/v1/clearance/login/staff`;


/* =========================================================
   2. GET HTML ELEMENTS
========================================================= */

const loginForm = document.getElementById("loginForm");

const studentLoginTab = document.getElementById("studentLoginTab");
const staffLoginTab = document.getElementById("staffLoginTab");

const loginRole = document.getElementById("loginRole");

const loginIdentifier = document.getElementById("loginIdentifier");
const identifierLabel = document.getElementById("identifierLabel");
const identifierHelp = document.getElementById("identifierHelp");

const loginPassword = document.getElementById("loginPassword");
const toggleLoginPassword =
    document.getElementById("toggleLoginPassword");

const forgotPasswordLink =
    document.getElementById("forgotPasswordLink");

const rememberLogin = document.getElementById("rememberLogin");

const loginMessage = document.getElementById("loginMessage");

const loginSubmitButton =
    document.getElementById("loginSubmitButton");

const loginButtonText =
    document.getElementById("loginButtonText");

const registerLink = document.getElementById("registerLink");

const loginCurrentYear =
    document.getElementById("loginCurrentYear");


/* =========================================================
   3. CURRENT ACCOUNT TYPE
========================================================= */

let currentRole = "student";
let isLoginInProgress = false;


/* =========================================================
   4. DISPLAY CURRENT YEAR
========================================================= */

if (loginCurrentYear) {
    loginCurrentYear.textContent = new Date().getFullYear();
}


/* =========================================================
   5. DISPLAY LOGIN MESSAGES
========================================================= */

function showLoginMessage(message, type = "error") {
    if (!loginMessage) {
        return;
    }

    loginMessage.textContent = message;
    loginMessage.hidden = false;

    loginMessage.classList.remove(
        "success",
        "error",
        "info",
        "auth-message-success",
        "auth-message-error",
        "auth-message-info"
    );

    loginMessage.classList.add(type);

    if (type === "success") {
        loginMessage.setAttribute("role", "status");
    } else {
        loginMessage.setAttribute("role", "alert");
    }
}


/* =========================================================
   6. CLEAR LOGIN MESSAGES
========================================================= */

function clearLoginMessage() {
    if (!loginMessage) {
        return;
    }

    loginMessage.textContent = "";
    loginMessage.hidden = true;

    loginMessage.classList.remove(
        "success",
        "error",
        "info",
        "auth-message-success",
        "auth-message-error",
        "auth-message-info"
    );

    loginMessage.setAttribute("role", "status");
}


/* =========================================================
   7. UPDATE FORGOT PASSWORD LINK

   The recovery page will use the role query parameter
   to determine whether the user selected Student or Staff.

   Student:
   forgot-password.html?role=student

   Staff:
   forgot-password.html?role=staff
========================================================= */

function updateForgotPasswordLink() {
    if (!forgotPasswordLink) {
        return;
    }

    const selectedRole =
        currentRole === "staff" ? "staff" : "student";

    forgotPasswordLink.href =
        `forgot-password.html?role=${encodeURIComponent(selectedRole)}`;
}


/* =========================================================
   8. UPDATE LOGIN INTERFACE
========================================================= */

function updateLoginInterface(role) {
    currentRole = role === "staff" ? "staff" : "student";

    if (loginRole) {
        loginRole.value = currentRole;
    }

    /* -----------------------------------------
       Update Student Tab
    ----------------------------------------- */

    if (studentLoginTab) {
        const isStudent = currentRole === "student";

        studentLoginTab.classList.toggle("active", isStudent);
        studentLoginTab.setAttribute(
            "aria-pressed",
            String(isStudent)
        );
    }

    /* -----------------------------------------
       Update Staff Tab
    ----------------------------------------- */

    if (staffLoginTab) {
        const isStaff = currentRole === "staff";

        staffLoginTab.classList.toggle("active", isStaff);
        staffLoginTab.setAttribute(
            "aria-pressed",
            String(isStaff)
        );
    }

    /* -----------------------------------------
       Update Identifier Label
    ----------------------------------------- */

    if (identifierLabel) {
        identifierLabel.textContent =
            currentRole === "staff"
                ? "Staff ID"
                : "Registration Number";
    }

    /* -----------------------------------------
       Update Identifier Placeholder
    ----------------------------------------- */

    if (loginIdentifier) {
        loginIdentifier.placeholder =
            currentRole === "staff"
                ? "Enter your staff ID"
                : "Enter your registration number";

        loginIdentifier.setAttribute(
            "autocomplete",
            "username"
        );
    }

    /* -----------------------------------------
       Update Identifier Help
    ----------------------------------------- */

    if (identifierHelp) {
        identifierHelp.textContent =
            currentRole === "staff"
                ? "Use the staff ID assigned to your staff account."
                : "Use the registration number associated with your student account.";
    }

    /* -----------------------------------------
       Update Submit Button
    ----------------------------------------- */

    if (loginButtonText) {
        loginButtonText.textContent =
            currentRole === "staff"
                ? "Sign In as Staff"
                : "Sign In as Student";
    }

    /* -----------------------------------------
       Update Registration Link
    ----------------------------------------- */

    if (registerLink) {
        registerLink.style.display =
            currentRole === "staff" ? "none" : "";
    }

    /* -----------------------------------------
       IMPORTANT: Update Forgot Password Link
    ----------------------------------------- */

    updateForgotPasswordLink();

    /* -----------------------------------------
       Clear Old Messages
    ----------------------------------------- */

    clearLoginMessage();
}


/* =========================================================
   9. STUDENT / STAFF TAB EVENTS
========================================================= */

if (studentLoginTab) {
    studentLoginTab.addEventListener("click", function () {
        if (isLoginInProgress) {
            return;
        }

        updateLoginInterface("student");
    });
}

if (staffLoginTab) {
    staffLoginTab.addEventListener("click", function () {
        if (isLoginInProgress) {
            return;
        }

        updateLoginInterface("staff");
    });
}


/* =========================================================
   10. SHOW / HIDE PASSWORD
========================================================= */

if (toggleLoginPassword && loginPassword) {
    toggleLoginPassword.addEventListener("click", function () {
        const passwordIsHidden =
            loginPassword.type === "password";

        loginPassword.type =
            passwordIsHidden ? "text" : "password";

        toggleLoginPassword.setAttribute(
            "aria-label",
            passwordIsHidden ? "Hide password" : "Show password"
        );

        toggleLoginPassword.setAttribute(
            "aria-pressed",
            String(passwordIsHidden)
        );

        const icon =
            toggleLoginPassword.querySelector("i");

        if (icon) {
            icon.classList.toggle(
                "fa-eye",
                !passwordIsHidden
            );

            icon.classList.toggle(
                "fa-eye-slash",
                passwordIsHidden
            );
        }
    });
}


/* =========================================================
   11. REMEMBER ACCOUNT IDENTIFIER

   Only the identifier is remembered.
   The user's password is never saved.
========================================================= */

function getRememberedIdentifier(role) {
    const storageKey =
        role === "staff"
            ? "uniclear_remembered_staff_id"
            : "uniclear_remembered_student_id";

    try {
        return localStorage.getItem(storageKey) || "";
    } catch (error) {
        console.warn(
            "Unable to access remembered login details.",
            error
        );

        return "";
    }
}


function saveRememberedIdentifier(role, identifier, remember) {
    const storageKey =
        role === "staff"
            ? "uniclear_remembered_staff_id"
            : "uniclear_remembered_student_id";

    try {
        if (remember) {
            localStorage.setItem(storageKey, identifier);
        } else {
            localStorage.removeItem(storageKey);
        }
    } catch (error) {
        console.warn(
            "Unable to save remembered login details.",
            error
        );
    }
}


function loadRememberedIdentifier(role) {
    if (!loginIdentifier || !rememberLogin) {
        return;
    }

    const rememberedIdentifier =
        getRememberedIdentifier(role);

    loginIdentifier.value = rememberedIdentifier;
    rememberLogin.checked = Boolean(rememberedIdentifier);
}


/* =========================================================
   12. LOGIN BUTTON LOADING STATE
========================================================= */

function setLoginLoadingState(isLoading) {
    if (loginSubmitButton) {
        loginSubmitButton.disabled = isLoading;
        loginSubmitButton.setAttribute(
            "aria-busy",
            String(isLoading)
        );
    }

    if (loginButtonText) {
        if (isLoading) {
            loginButtonText.textContent = "Signing in...";
        } else {
            loginButtonText.textContent =
                currentRole === "staff"
                    ? "Sign In as Staff"
                    : "Sign In as Student";
        }
    }
}


/* =========================================================
   13. EXTRACT MESSAGE FROM API RESPONSE
========================================================= */

function getApiMessage(data, fallbackMessage) {
    if (!data || typeof data !== "object") {
        return fallbackMessage;
    }

    return (
        data.message ||
        data.error ||
        data.detail ||
        fallbackMessage
    );
}


/* =========================================================
   14. SAFELY PARSE API RESPONSE
========================================================= */

async function parseApiResponse(response) {
    const responseText = await response.text();

    if (!responseText) {
        return {};
    }

    try {
        return JSON.parse(responseText);
    } catch (error) {
        return {
            message: response.ok
                ? "The server returned an unexpected response."
                : "Unable to complete login. Please try again."
        };
    }
}


/* =========================================================
   15. SAVE STUDENT SESSION
========================================================= */

function saveStudentSession(data, registrationNumber) {
    const student =
        data.student ||
        data.user ||
        data.data ||
        {};

    try {
        sessionStorage.setItem(
            "uniclear_student",
            JSON.stringify(student)
        );

        sessionStorage.setItem(
            "uniclear_reg_no",
            student.reg_no ||
            student.registration_number ||
            registrationNumber
        );

        sessionStorage.setItem(
            "uniclear_user_role",
            "student"
        );
    } catch (error) {
        console.error(
            "Unable to save student session.",
            error
        );
    }
}


/* =========================================================
   16. SAVE STAFF SESSION
========================================================= */

function saveStaffSession(data, staffId) {
    const staff =
        data.staff ||
        data.user ||
        data.data ||
        {};

    try {
        sessionStorage.setItem(
            "uniclear_staff",
            JSON.stringify(staff)
        );

        sessionStorage.setItem(
            "uniclear_staff_id",
            staff.staff_id ||
            staffId
        );

        sessionStorage.setItem(
            "uniclear_user_role",
            "staff"
        );

        if (staff.role) {
            sessionStorage.setItem(
                "uniclear_staff_role",
                staff.role
            );
        } else if (data.role) {
            sessionStorage.setItem(
                "uniclear_staff_role",
                data.role
            );
        }

        if (staff.assigned_stage) {
            sessionStorage.setItem(
                "uniclear_assigned_stage",
                staff.assigned_stage
            );
        }
    } catch (error) {
        console.error(
            "Unable to save staff session.",
            error
        );
    }
}


/* =========================================================
   17. HANDLE STUDENT LOGIN
========================================================= */

async function loginStudent(identifier, password) {
    const payload = {
        reg_no: identifier.toUpperCase(),
        password: password
    };

    const response = await fetch(STUDENT_LOGIN_ENDPOINT, {
        method: "POST",

        headers: {
            "Content-Type": "application/json",
            "Accept": "application/json"
        },

        body: JSON.stringify(payload)
    });

    const data = await parseApiResponse(response);

    if (!response.ok || data.success === false) {
        throw new Error(
            getApiMessage(
                data,
                "Student login failed. Check your registration number and password."
            )
        );
    }

    /*
       Preserve compatibility with APIs that return a
       success flag or a successful HTTP response.
    */

    saveStudentSession(data, identifier);

    showLoginMessage(
        getApiMessage(data, "Login successful. Redirecting..."),
        "success"
    );

    window.location.href = "student-dashboard.html";
}


/* =========================================================
   18. HANDLE STAFF LOGIN
========================================================= */

async function loginStaff(identifier, password) {
    const payload = {
        staff_id: identifier.toUpperCase(),
        password: password
    };

    const response = await fetch(STAFF_LOGIN_ENDPOINT, {
        method: "POST",

        headers: {
            "Content-Type": "application/json",
            "Accept": "application/json"
        },

        body: JSON.stringify(payload)
    });

    const data = await parseApiResponse(response);

    if (!response.ok || data.success === false) {
        throw new Error(
            getApiMessage(
                data,
                "Staff login failed. Check your staff ID and password."
            )
        );
    }

    saveStaffSession(data, identifier);

    /*
       Staff who must change their temporary password
       should be sent to the password-change page.
    */

    const staff =
        data.staff ||
        data.user ||
        data.data ||
        {};

    const mustChangePassword =
        data.must_change_password === true ||
        staff.must_change_password === true;

    showLoginMessage(
        getApiMessage(data, "Login successful. Redirecting..."),
        "success"
    );

    if (mustChangePassword) {
        window.location.href = "change-password.html";
        return;
    }

    window.location.href = "staff-dashboard.html";
}


/* =========================================================
   19. LOGIN FORM SUBMISSION
========================================================= */

if (loginForm) {
    loginForm.addEventListener("submit", async function (event) {
        event.preventDefault();

        if (isLoginInProgress) {
            return;
        }

        clearLoginMessage();

        /* -----------------------------------------
           Read and validate identifier
        ----------------------------------------- */

        const identifier =
            loginIdentifier
                ? loginIdentifier.value.trim()
                : "";

        const password =
            loginPassword
                ? loginPassword.value
                : "";

        if (!identifier) {
            showLoginMessage(
                currentRole === "staff"
                    ? "Please enter your staff ID."
                    : "Please enter your registration number."
            );

            if (loginIdentifier) {
                loginIdentifier.focus();
            }

            return;
        }

        if (!password) {
            showLoginMessage(
                "Please enter your password."
            );

            if (loginPassword) {
                loginPassword.focus();
            }

            return;
        }

        /* -----------------------------------------
           Prevent duplicate submissions
        ----------------------------------------- */

        isLoginInProgress = true;
        setLoginLoadingState(true);

        try {
            /* Save only the identifier if requested. */

            saveRememberedIdentifier(
                currentRole,
                identifier.toUpperCase(),
                Boolean(rememberLogin && rememberLogin.checked)
            );

            /* -------------------------------------
               Authenticate selected account
            ------------------------------------- */

            if (currentRole === "staff") {
                await loginStaff(identifier, password);
            } else {
                await loginStudent(identifier, password);
            }

        } catch (error) {
            console.error("UniClear login error:", error);

            showLoginMessage(
                error.message ||
                "Unable to sign in. Please check your details and try again."
            );

        } finally {
            isLoginInProgress = false;
            setLoginLoadingState(false);
        }
    });
}


/* =========================================================
   20. INITIALIZE LOGIN PAGE
========================================================= */

document.addEventListener("DOMContentLoaded", function () {
    /*
       Start with the Student account type, matching the
       default value in login.html.
    */

    updateLoginInterface("student");

    /*
       Load the remembered Student ID when the page opens.
    */

    loadRememberedIdentifier("student");

    /*
       Make sure the Forgot Password link is synchronized
       with the selected account type immediately.
    */

    updateForgotPasswordLink();
});


/* =========================================================
   21. LOAD REMEMBERED ID WHEN ACCOUNT TYPE CHANGES

   Wrap the interface updater so the remembered identifier
   changes together with the selected account type.
========================================================= */

function selectLoginRole(role) {
    if (isLoginInProgress) {
        return;
    }

    updateLoginInterface(role);
    loadRememberedIdentifier(currentRole);
}