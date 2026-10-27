
/* =========================================================
   UNICLEAR STUDENT CLEARANCE PORTAL
   FORGOT PASSWORD JAVASCRIPT

   File: Frontend/js/forgot-password.js

   FEATURES:
   1. Student and Staff account selection.
   2. Dynamic account identifier labels and placeholders.
   3. Student registration number recovery.
   4. Staff ID recovery.
   5. Recovery request validation.
   6. Backend success and error messages.
   7. Redirect to OTP verification after successful request.
   8. Preserve account type and identifier during navigation.
   9. Loading state to prevent duplicate submissions.
   10. Support role selection through URL parameters.

   IMPORTANT:
   Confirm the API endpoints and request fields against
   the Flask backend before testing in production.
========================================================= */


/* =========================================================
   1. API CONFIGURATION
========================================================= */

const API_BASE_URL =
    "https://uniclear-student-platform.vercel.app";

const RECOVERY_ENDPOINTS = {
    student: "/api/v1/clearance/forgot-password/student",
    staff: "/api/v1/clearance/forgot-password/staff"
};


/* =========================================================
   2. GET HTML ELEMENTS
========================================================= */

const studentRecoveryTab =
    document.getElementById("studentRecoveryTab");

const staffRecoveryTab =
    document.getElementById("staffRecoveryTab");

const recoveryRole =
    document.getElementById("recoveryRole");

const recoveryAccountHelp =
    document.getElementById("recoveryAccountHelp");

const forgotPasswordForm =
    document.getElementById("forgotPasswordForm");

const forgotPasswordMessage =
    document.getElementById("forgotPasswordMessage");

const recoveryIdentifierLabel =
    document.getElementById("recoveryIdentifierLabel");

const recoveryIdentifier =
    document.getElementById("recoveryIdentifier");

const recoveryIdentifierHelp =
    document.getElementById("recoveryIdentifierHelp");

const recoveryEmail =
    document.getElementById("recoveryEmail");

const recoverySubmitButton =
    document.getElementById("recoverySubmitButton");

const recoveryButtonText =
    document.getElementById("recoveryButtonText");

const recoveryCurrentYear =
    document.getElementById("recoveryCurrentYear");


/* =========================================================
   3. INITIAL PAGE SETUP
========================================================= */

if (recoveryCurrentYear) {
    recoveryCurrentYear.textContent =
        new Date().getFullYear();
}


/* =========================================================
   4. DISPLAY MESSAGES
========================================================= */

function showRecoveryMessage(message, type = "error") {
    if (!forgotPasswordMessage) {
        return;
    }

    forgotPasswordMessage.textContent = message;

    forgotPasswordMessage.classList.remove(
        "success",
        "error",
        "info"
    );

    forgotPasswordMessage.classList.add(type);
    forgotPasswordMessage.hidden = false;
}


function clearRecoveryMessage() {
    if (!forgotPasswordMessage) {
        return;
    }

    forgotPasswordMessage.textContent = "";
    forgotPasswordMessage.hidden = true;

    forgotPasswordMessage.classList.remove(
        "success",
        "error",
        "info"
    );
}


/* =========================================================
   5. UPDATE ACCOUNT TYPE INTERFACE
========================================================= */

function updateRecoveryAccountType(role) {
    if (role !== "student" && role !== "staff") {
        role = "student";
    }

    recoveryRole.value = role;

    const isStudent = role === "student";

    studentRecoveryTab.classList.toggle(
        "active",
        isStudent
    );

    staffRecoveryTab.classList.toggle(
        "active",
        !isStudent
    );

    studentRecoveryTab.setAttribute(
        "aria-pressed",
        String(isStudent)
    );

    staffRecoveryTab.setAttribute(
        "aria-pressed",
        String(!isStudent)
    );

    if (isStudent) {
        recoveryIdentifierLabel.textContent =
            "Registration Number";

        recoveryIdentifier.placeholder =
            "Enter your registration number";

        recoveryIdentifierHelp.textContent =
            "Enter the registration number associated with your student account.";

        recoveryAccountHelp.textContent =
            "Enter your student registration number. A verification code will be sent to the email address registered to your account.";

        recoveryIdentifier.autocomplete = "username";
    } else {
        recoveryIdentifierLabel.textContent =
            "Staff ID";

        recoveryIdentifier.placeholder =
            "Enter your staff ID";

        recoveryIdentifierHelp.textContent =
            "Enter the staff ID associated with your UniClear staff account.";

        recoveryAccountHelp.textContent =
            "Enter your staff ID. A verification code will be sent to the email address registered to your staff account.";

        recoveryIdentifier.autocomplete = "username";
    }

    clearRecoveryMessage();
}


/* =========================================================
   6. ACCOUNT TYPE BUTTON EVENTS
========================================================= */

studentRecoveryTab.addEventListener("click", function () {
    updateRecoveryAccountType("student");
});

staffRecoveryTab.addEventListener("click", function () {
    updateRecoveryAccountType("staff");
});


/* =========================================================
   7. READ ROLE FROM URL
========================================================= */

function initialiseRecoveryRole() {
    const params = new URLSearchParams(
        window.location.search
    );

    const requestedRole = params.get("role");

    if (
        requestedRole === "student" ||
        requestedRole === "staff"
    ) {
        updateRecoveryAccountType(requestedRole);
    } else {
        updateRecoveryAccountType("student");
    }
}

initialiseRecoveryRole();


/* =========================================================
   8. BUTTON LOADING STATE
========================================================= */

function setRecoveryLoading(isLoading) {
    recoverySubmitButton.disabled = isLoading;

    if (isLoading) {
        recoveryButtonText.textContent =
            "Sending Verification Code...";

        recoverySubmitButton.setAttribute(
            "aria-busy",
            "true"
        );
    } else {
        recoveryButtonText.textContent =
            "Send Verification Code";

        recoverySubmitButton.removeAttribute(
            "aria-busy"
        );
    }
}


/* =========================================================
   9. PARSE BACKEND RESPONSE
========================================================= */

async function readRecoveryResponse(response) {
    const responseText = await response.text();

    if (!responseText) {
        return {};
    }

    try {
        return JSON.parse(responseText);
    } catch {
        return {
            message: responseText
        };
    }
}


/* =========================================================
   10. SUBMIT PASSWORD RECOVERY REQUEST
========================================================= */

forgotPasswordForm.addEventListener(
    "submit",
    async function (event) {
        event.preventDefault();

        clearRecoveryMessage();

        const role = recoveryRole.value;

        const identifier =
            recoveryIdentifier.value.trim();

        /*
         * Validate account type.
         */
        if (
            role !== "student" &&
            role !== "staff"
        ) {
            showRecoveryMessage(
                "Please select a valid account type.",
                "error"
            );
            return;
        }

        /*
         * Validate account identifier.
         */
        if (!identifier) {
            showRecoveryMessage(
                role === "student"
                    ? "Please enter your registration number."
                    : "Please enter your staff ID.",
                "error"
            );

            recoveryIdentifier.focus();
            return;
        }

        /*
         * The email field is optional in this interface.
         * The backend should identify the registered email
         * using the account identifier.
         *
         * Do not send an extra email field unless the
         * backend explicitly requires it.
         */
        const payload = role === "student"
            ? { reg_no: identifier }
            : { staff_id: identifier };

        const endpoint =
            API_BASE_URL + RECOVERY_ENDPOINTS[role];

        setRecoveryLoading(true);

        try {
            const response = await fetch(endpoint, {
                method: "POST",

                headers: {
                    "Content-Type": "application/json",
                    "Accept": "application/json"
                },

                body: JSON.stringify(payload)
            });

            const data =
                await readRecoveryResponse(response);

            /*
             * Stop if the backend did not accept the request.
             */
            if (
                !response.ok ||
                data.success === false ||
                data.status === "error"
            ) {
                showRecoveryMessage(
                    data.message ||
                    data.error ||
                    "Unable to process your recovery request. Please check your details and try again.",
                    "error"
                );

                return;
            }

            /*
             * Only redirect after a successful response.
             * Preserve the selected account type and ID.
             */
            showRecoveryMessage(
                data.message ||
                "Your recovery request was successful. Redirecting to OTP verification...",
                "success"
            );

            const nextPage = new URL(
                "verify-otp.html",
                window.location.href
            );

            nextPage.searchParams.set("role", role);
            nextPage.searchParams.set(
                "identifier",
                identifier
            );

            /*
             * Allow the success message to be displayed
             * briefly before navigating to the next page.
             */
            window.setTimeout(function () {
                window.location.assign(nextPage.href);
            }, 1000);

        } catch (error) {
            console.error(
                "Password recovery request failed:",
                error
            );

            showRecoveryMessage(
                "Unable to connect to the server. Please check your internet connection and try again.",
                "error"
            );

        } finally {
            setRecoveryLoading(false);
        }
    }
);


/* =========================================================
   END OF FORGOT PASSWORD JAVASCRIPT
========================================================= */
