
/* =========================================================
   UNICLEAR STUDENT CLEARANCE SYSTEM
   OTP VERIFICATION AND PASSWORD RESET
   File: Frontend/js/verify-otp.js

   FEATURES:
   1. Supports Student and Staff account types.
   2. Displays the correct account identifier field.
   3. Validates the six-digit OTP.
   4. Validates the new password and confirmation.
   5. Sends student requests to the student endpoint.
   6. Sends staff requests to the staff endpoint.
   7. Displays success and error messages.
   8. Redirects to login after a successful reset.

   BACKEND:
   Student: /api/v1/clearance/otp-reset-password/student
   Staff:   /api/v1/clearance/reset-password/staff
========================================================= */

"use strict";

/* =========================
   CONFIGURATION
========================= */

const API_BASE_URL = "https://uniclear-student-platform.vercel.app";

const RESET_ENDPOINTS = {
    student: "/api/v1/clearance/otp-reset-password/student",
    staff: "/api/v1/clearance/reset-password/staff"
};

/* =========================
   GET HTML ELEMENTS
========================= */

const resetForm = document.getElementById("resetPasswordForm");
const accountTypeSelect = document.getElementById("accountType");

const studentIdentifierGroup =
    document.getElementById("studentIdentifierGroup");

const staffIdentifierGroup =
    document.getElementById("staffIdentifierGroup");

const studentIdentifierInput =
    document.getElementById("reg_no");

const staffIdentifierInput =
    document.getElementById("staff_id");

const otpInput = document.getElementById("otp");
const newPasswordInput = document.getElementById("new_password");
const confirmPasswordInput = document.getElementById("confirm_password");

const submitButton = document.getElementById("resetPasswordBtn");
const messageBox = document.getElementById("message");

/* =========================
   DISPLAY MESSAGE
========================= */

function showMessage(message, type = "info") {
    if (!messageBox) {
        alert(message);
        return;
    }

    messageBox.textContent = message;
    messageBox.className = `message ${type}`;
    messageBox.hidden = false;
}

function clearMessage() {
    if (!messageBox) return;

    messageBox.textContent = "";
    messageBox.className = "message";
    messageBox.hidden = true;
}

/* =========================
   TOGGLE ACCOUNT IDENTIFIER
========================= */

function updateAccountFields() {
    if (!accountTypeSelect) return;

    const accountType = accountTypeSelect.value;

    clearMessage();

    // Student account selected.
    if (accountType === "student") {
        studentIdentifierGroup.hidden = false;
        studentIdentifierInput.disabled = false;
        studentIdentifierInput.required = true;

        staffIdentifierGroup.hidden = true;
        staffIdentifierInput.disabled = true;
        staffIdentifierInput.required = false;
        staffIdentifierInput.value = "";

        studentIdentifierInput.focus();
        return;
    }

    // Staff account selected.
    if (accountType === "staff") {
        staffIdentifierGroup.hidden = false;
        staffIdentifierInput.disabled = false;
        staffIdentifierInput.required = true;

        studentIdentifierGroup.hidden = true;
        studentIdentifierInput.disabled = true;
        studentIdentifierInput.required = false;
        studentIdentifierInput.value = "";

        staffIdentifierInput.focus();
        return;
    }

    // No account type selected.
    studentIdentifierGroup.hidden = true;
    studentIdentifierInput.disabled = true;
    studentIdentifierInput.required = false;
    studentIdentifierInput.value = "";

    staffIdentifierGroup.hidden = true;
    staffIdentifierInput.disabled = true;
    staffIdentifierInput.required = false;
    staffIdentifierInput.value = "";
}

/* =========================
   NORMALIZE IDENTIFIER
========================= */

function getAccountIdentifier(accountType) {
    if (accountType === "student") {
        return studentIdentifierInput.value.trim();
    }

    if (accountType === "staff") {
        return staffIdentifierInput.value.trim();
    }

    return "";
}

/* =========================
   VALIDATE FORM
========================= */

function validateForm() {
    const accountType = accountTypeSelect.value;
    const identifier = getAccountIdentifier(accountType);
    const otp = otpInput.value.trim();
    const newPassword = newPasswordInput.value;
    const confirmPassword = confirmPasswordInput.value;

    if (!["student", "staff"].includes(accountType)) {
        showMessage("Please select Student or Staff as your account type.", "error");
        accountTypeSelect.focus();
        return null;
    }

    if (!identifier) {
        showMessage(
            accountType === "student"
                ? "Please enter your student registration number."
                : "Please enter your staff ID.",
            "error"
        );

        if (accountType === "student") {
            studentIdentifierInput.focus();
        } else {
            staffIdentifierInput.focus();
        }

        return null;
    }

    if (!/^\d{6}$/.test(otp)) {
        showMessage("Enter a valid six-digit OTP.", "error");
        otpInput.focus();
        return null;
    }

    if (newPassword.length < 8) {
        showMessage(
            "Your new password must contain at least 8 characters.",
            "error"
        );

        newPasswordInput.focus();
        return null;
    }

    if (newPassword !== confirmPassword) {
        showMessage("The passwords do not match.", "error");
        confirmPasswordInput.focus();
        return null;
    }

    return {
        accountType,
        identifier,
        otp,
        newPassword,
        confirmPassword
    };
}

/* =========================
   SUBMIT PASSWORD RESET
========================= */

async function handlePasswordReset(event) {
    event.preventDefault();
    clearMessage();

    const formData = validateForm();

    if (!formData) return;

    const {
        accountType,
        identifier,
        otp,
        newPassword,
        confirmPassword
    } = formData;

    let endpoint;
    let payload;

    /*
       STUDENT REQUEST
       Identifier: reg_no
    */
    if (accountType === "student") {
        endpoint = RESET_ENDPOINTS.student;

        payload = {
            reg_no: identifier,
            otp: otp,
            new_password: newPassword,
            confirm_password: confirmPassword
        };
    }

    /*
       STAFF REQUEST
       Identifier: staff_id
    */
    else {
        endpoint = RESET_ENDPOINTS.staff;

        payload = {
            staff_id: identifier,
            otp: otp,
            new_password: newPassword,
            confirm_password: confirmPassword
        };
    }

    const originalButtonText = submitButton.textContent;

    submitButton.disabled = true;
    submitButton.textContent = "Verifying OTP...";

    try {
        const response = await fetch(`${API_BASE_URL}${endpoint}`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Accept": "application/json"
            },
            body: JSON.stringify(payload)
        });

        let result;

        try {
            result = await response.json();
        } catch {
            result = {};
        }

        if (!response.ok) {
            const errorMessage =
                result.message ||
                result.error ||
                result.msg ||
                `Password reset failed (HTTP ${response.status}).`;

            showMessage(errorMessage, "error");
            return;
        }

        // Also handle APIs that return success:false with HTTP 200.
        if (
            result.success === false ||
            result.status === "error" ||
            result.error
        ) {
            showMessage(
                result.message || result.error || "Password reset failed.",
                "error"
            );
            return;
        }

        showMessage(
            result.message ||
                "Your password has been reset successfully. Redirecting to login...",
            "success"
        );

        resetForm.reset();
        updateAccountFields();

        submitButton.textContent = "Password Reset Successful";

        // Redirect only after a successful response.
        window.setTimeout(() => {
            window.location.href = "login.html";
        }, 1800);

    } catch (error) {
        console.error("Password reset error:", error);

        showMessage(
            "Unable to connect to the server. Check your internet connection and try again.",
            "error"
        );

    } finally {
        // Keep the successful button state until the redirect.
        if (!submitButton.textContent.includes("Successful")) {
            submitButton.disabled = false;
            submitButton.textContent = originalButtonText;
        }
    }
}

/* =========================
   INITIALIZE PAGE
========================= */

document.addEventListener("DOMContentLoaded", () => {
    if (
        !resetForm ||
        !accountTypeSelect ||
        !studentIdentifierGroup ||
        !staffIdentifierGroup ||
        !studentIdentifierInput ||
        !staffIdentifierInput ||
        !otpInput ||
        !newPasswordInput ||
        !confirmPasswordInput ||
        !submitButton
    ) {
        console.error(
            "OTP reset initialization failed. Check the element IDs in verify-otp.html."
        );
        return;
    }

    updateAccountFields();

    accountTypeSelect.addEventListener("change", updateAccountFields);

    resetForm.addEventListener("submit", handlePasswordReset);

    // Keep OTP input numeric and limit it to six digits.
    otpInput.addEventListener("input", () => {
        otpInput.value = otpInput.value.replace(/\D/g, "").slice(0, 6);
    });

    // Clear stale errors when the user edits a field.
    resetForm.addEventListener("input", clearMessage);
});
