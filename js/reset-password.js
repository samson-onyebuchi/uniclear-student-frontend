/* =========================================================
   UNICLEAR STUDENT CLEARANCE PLATFORM
   SHARED STUDENT / STAFF PASSWORD RESET
   File: Frontend/js/reset-password.js

   STUDENT:
   POST /api/v1/clearance/otp-reset-password/student
   { reg_no, otp, new_password, confirm_password }

   STAFF:
   POST /api/v1/clearance/reset-password/staff
   { staff_id, otp, new_password, confirm_password }

   The account type determines the identifier and endpoint.
   The backend remains responsible for validating the OTP.
========================================================= */

"use strict";

const API_BASE_URL = "https://uniclear-student-platform.vercel.app";

const RESET_ENDPOINTS = {
    student: "/api/v1/clearance/otp-reset-password/student",
    staff: "/api/v1/clearance/reset-password/staff"
};

/* ---------------------------------------------------------
   FIND AN EXISTING HTML ELEMENT BY POSSIBLE IDs
--------------------------------------------------------- */

function findElement(ids) {
    for (const id of ids) {
        const element = document.getElementById(id);

        if (element) {
            return element;
        }
    }

    return null;
}

/* ---------------------------------------------------------
   GET THE ACCOUNT TYPE
--------------------------------------------------------- */

function getAccountType() {
    const accountTypeInput = findElement([
        "accountType",
        "accountRole",
        "userType",
        "role",
        "user_type",
        "account_type"
    ]);

    const value = accountTypeInput
        ? String(accountTypeInput.value || "").trim().toLowerCase()
        : "";

    if (["student", "students"].includes(value)) {
        return "student";
    }

    if (["staff", "lecturer", "employee"].includes(value)) {
        return "staff";
    }

    return "";
}

/* ---------------------------------------------------------
   DISPLAY FEEDBACK
--------------------------------------------------------- */

function showMessage(message, type = "error") {
    const messageElement = findElement([
        "message",
        "statusMessage",
        "errorMessage",
        "successMessage",
        "formMessage",
        "resetMessage",
        "alertMessage"
    ]);

    if (messageElement) {
        messageElement.textContent = message;
        messageElement.style.display = "block";
        messageElement.style.color =
            type === "success" ? "green" : "red";
        messageElement.setAttribute("role", "status");
    } else {
        alert(message);
    }
}

/* ---------------------------------------------------------
   READ SERVER RESPONSE SAFELY
--------------------------------------------------------- */

async function readResponse(response) {
    const text = await response.text();

    if (!text) {
        return {};
    }

    try {
        return JSON.parse(text);
    } catch {
        return {
            success: false,
            message: "The server returned an unreadable response."
        };
    }
}

/* ---------------------------------------------------------
   SUBMIT PASSWORD RESET
--------------------------------------------------------- */

async function handlePasswordReset(event) {
    event.preventDefault();

    const accountType = getAccountType();

    if (!accountType) {
        showMessage(
            "Select Student or Staff before resetting your password."
        );
        return;
    }

    const identifierElement = accountType === "student"
        ? findElement([
            "reg_no",
            "regNo",
            "registrationNumber",
            "studentRegNo",
            "studentRegNumber",
            "studentId"
        ])
        : findElement([
            "staff_id",
            "staffId",
            "staffID",
            "staffNumber"
        ]);

    const otpElement = findElement([
        "otp",
        "OTP",
        "verificationCode",
        "otpCode"
    ]);

    const newPasswordElement = findElement([
        "new_password",
        "newPassword",
        "password",
        "resetPassword"
    ]);

    const confirmPasswordElement = findElement([
        "confirm_password",
        "confirmPassword",
        "confirmNewPassword",
        "passwordConfirmation"
    ]);

    if (
        !identifierElement ||
        !otpElement ||
        !newPasswordElement ||
        !confirmPasswordElement
    ) {
        showMessage(
            "A required form field could not be found. " +
            "Check the HTML input IDs for the account identifier, " +
            "OTP, new password, and confirmation password."
        );
        return;
    }

    const identifier = identifierElement.value.trim();
    const otp = otpElement.value.trim();
    const newPassword = newPasswordElement.value;
    const confirmPassword = confirmPasswordElement.value;

    if (!identifier) {
        showMessage(
            accountType === "student"
                ? "Enter your student registration number."
                : "Enter your staff ID."
        );
        identifierElement.focus();
        return;
    }

    if (!/^\d{6}$/.test(otp)) {
        showMessage("Enter the complete six-digit OTP.");
        otpElement.focus();
        return;
    }

    if (newPassword.length < 8) {
        showMessage(
            "Your new password must contain at least 8 characters."
        );
        newPasswordElement.focus();
        return;
    }

    if (newPassword !== confirmPassword) {
        showMessage("The passwords do not match.");
        confirmPasswordElement.focus();
        return;
    }

    const payload = accountType === "student"
        ? {
            reg_no: identifier.toUpperCase(),
            otp: otp,
            new_password: newPassword,
            confirm_password: confirmPassword
        }
        : {
            staff_id: identifier.toUpperCase(),
            otp: otp,
            new_password: newPassword,
            confirm_password: confirmPassword
        };

    const submitButton = findElement([
        "resetPasswordBtn",
        "resetPasswordButton",
        "resetBtn",
        "submitBtn"
    ]);

    const originalButtonText = submitButton
        ? submitButton.textContent
        : "";

    if (submitButton) {
        submitButton.disabled = true;
        submitButton.textContent = "Resetting password...";
    }

    try {
        const response = await fetch(
            `${API_BASE_URL}${RESET_ENDPOINTS[accountType]}`,
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Accept": "application/json"
                },
                body: JSON.stringify(payload)
            }
        );

        const data = await readResponse(response);

        if (!response.ok || data.success !== true) {
            showMessage(
                data.message ||
                `Password reset failed (HTTP ${response.status}).`
            );
            return;
        }

        showMessage(
            data.message || "Your password was reset successfully.",
            "success"
        );

        otpElement.value = "";
        newPasswordElement.value = "";
        confirmPasswordElement.value = "";

        // Redirect only after the backend confirms success.
        setTimeout(() => {
            window.location.href = "login.html";
        }, 1800);

    } catch (error) {
        console.error("Password reset request failed:", error);

        showMessage(
            "Unable to contact the server. Check your internet " +
            "connection, backend availability, and CORS settings."
        );
    } finally {
        if (submitButton) {
            submitButton.disabled = false;
            submitButton.textContent = originalButtonText;
        }
    }
}

/* ---------------------------------------------------------
   CONNECT THE EXISTING FORM
--------------------------------------------------------- */

document.addEventListener("DOMContentLoaded", () => {
    const form = findElement([
        "resetPasswordForm",
        "reset-password-form",
        "passwordResetForm",
        "resetForm"
    ]);

    if (!form) {
        console.error(
            "Password reset form not found. Check the form ID in HTML."
        );
        return;
    }

    form.addEventListener("submit", handlePasswordReset);
});