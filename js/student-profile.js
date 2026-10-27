/* =========================================================
   UNICLEAR STUDENT CLEARANCE PORTAL
   STUDENT PROFILE JAVASCRIPT

   File: js/student-profile.js

   FEATURES:
   1. Restore the logged-in student's information.
   2. Read student data from existing session storage.
   3. Support compatible local storage session keys.
   4. Display personal and academic information.
   5. Display student category and account status.
   6. Update the profile summary cards.
   7. Refresh the displayed student information.
   8. Display helpful messages when information is missing.
   9. Support mobile sidebar navigation.
   10. Handle logout and return to the login page.

   IMPORTANT:
   This implementation does not invent a profile API endpoint.
   It reads the student information saved during login.
   If the login script uses different storage keys, update
   the SESSION_KEYS list to match that script.
========================================================= */


/* =========================================================
   1. CONFIGURATION
========================================================= */

"use strict";

const StudentProfile = (() => {

    const SESSION_KEYS = [
        "uniclear_student",
        "uniclear_student_data",
        "student_data",
        "student"
    ];

    const REGISTRATION_NUMBER_KEYS = [
        "uniclear_reg_no",
        "reg_no"
    ];

    const ROLE_KEYS = [
        "uniclear_user_role",
        "user_role",
        "role"
    ];


    /* =====================================================
       2. DOM HELPERS
    ===================================================== */

    function getElement(id) {
        return document.getElementById(id);
    }

    function setText(id, value, fallback = "Not available") {
        const element = getElement(id);

        if (!element) {
            return;
        }

        const normalizedValue = normalizeValue(value);

        element.textContent = normalizedValue || fallback;
    }

    function normalizeValue(value) {
        if (value === null || value === undefined) {
            return "";
        }

        if (typeof value === "object") {
            return "";
        }

        return String(value).trim();
    }

    function getFirstValue(object, keys) {
        if (!object || typeof object !== "object") {
            return "";
        }

        for (const key of keys) {
            const value = object[key];

            if (
                value !== null &&
                value !== undefined &&
                typeof value !== "object" &&
                String(value).trim() !== ""
            ) {
                return String(value).trim();
            }
        }

        return "";
    }

    function getStoredValue(keys) {
        for (const key of keys) {
            try {
                const sessionValue = sessionStorage.getItem(key);

                if (
                    sessionValue !== null &&
                    sessionValue.trim() !== ""
                ) {
                    return sessionValue;
                }
            } catch (error) {
                console.warn(
                    "Unable to read session storage key:",
                    key
                );
            }

            try {
                const localValue = localStorage.getItem(key);

                if (
                    localValue !== null &&
                    localValue.trim() !== ""
                ) {
                    return localValue;
                }
            } catch (error) {
                console.warn(
                    "Unable to read local storage key:",
                    key
                );
            }
        }

        return "";
    }


    /* =====================================================
       3. STUDENT SESSION RECOVERY
    ===================================================== */

    function parseStoredStudent(value) {
        if (!value) {
            return null;
        }

        try {
            const parsed = JSON.parse(value);

            if (!parsed || typeof parsed !== "object") {
                return null;
            }

            /*
             * Support common login response wrappers.
             * This does not make a network request.
             */
            let student = parsed;

            for (let i = 0; i < 3; i++) {
                if (
                    student &&
                    typeof student === "object" &&
                    !Array.isArray(student)
                ) {
                    const hasStudentFields = [
                        "reg_no",
                        "registration_number",
                        "surname",
                        "first_name",
                        "email",
                        "department"
                    ].some(key => student[key] !== undefined);

                    if (hasStudentFields) {
                        return student;
                    }

                    if (
                        student.data &&
                        typeof student.data === "object"
                    ) {
                        student = student.data;
                        continue;
                    }

                    if (
                        student.student &&
                        typeof student.student === "object"
                    ) {
                        student = student.student;
                        continue;
                    }
                }

                break;
            }

            return student && typeof student === "object"
                ? student
                : null;

        } catch (error) {
            console.warn(
                "Stored student information is not valid JSON."
            );

            return null;
        }
    }

    function loadStudentFromStorage() {
        for (const key of SESSION_KEYS) {
            let storedValue = "";

            try {
                storedValue = sessionStorage.getItem(key) || "";
            } catch (error) {
                // Continue to local storage.
            }

            let student = parseStoredStudent(storedValue);

            if (student) {
                return student;
            }

            try {
                storedValue = localStorage.getItem(key) || "";
            } catch (error) {
                storedValue = "";
            }

            student = parseStoredStudent(storedValue);

            if (student) {
                return student;
            }
        }

        /*
         * Some login scripts may store profile fields
         * individually instead of saving one JSON object.
         */
        const registrationNumber = getStoredValue(
            REGISTRATION_NUMBER_KEYS
        );

        if (registrationNumber) {
            return {
                reg_no: registrationNumber,
                role: getStoredValue(ROLE_KEYS) || "student",
                surname: getStoredValue(["surname"]),
                first_name: getStoredValue(["first_name"]),
                other_names: getStoredValue(["other_names"]),
                email: getStoredValue(["email"]),
                department: getStoredValue(["department"]),
                faculty: getStoredValue(["faculty"]),
                phone_number: getStoredValue(["phone_number"]),
                gender: getStoredValue(["gender"]),
                admission_year: getStoredValue(["admission_year"]),
                study_duration: getStoredValue(["study_duration"]),
                student_status: getStoredValue(["student_status"]),
                account_status: getStoredValue(["account_status"])
            };
        }

        return null;
    }


    /* =====================================================
       4. STUDENT DATA NORMALIZATION
    ===================================================== */

    function normalizeStudent(student) {
        if (!student || typeof student !== "object") {
            return null;
        }

        const normalized = {
            surname: getFirstValue(student, [
                "surname",
                "last_name",
                "lastname"
            ]),

            firstName: getFirstValue(student, [
                "first_name",
                "firstname",
                "given_name"
            ]),

            otherNames: getFirstValue(student, [
                "other_names",
                "otherNames",
                "middle_name",
                "middlename"
            ]),

            registrationNumber: getFirstValue(student, [
                "reg_no",
                "registration_number",
                "registrationNumber",
                "matric_number",
                "matric_no"
            ]),

            email: getFirstValue(student, [
                "email",
                "email_address"
            ]),

            phoneNumber: getFirstValue(student, [
                "phone_number",
                "phone",
                "phoneNumber",
                "telephone"
            ]),

            gender: getFirstValue(student, [
                "gender"
            ]),

            department: getFirstValue(student, [
                "department"
            ]),

            faculty: getFirstValue(student, [
                "faculty"
            ]),

            admissionYear: getFirstValue(student, [
                "admission_year",
                "admissionYear",
                "year_of_admission"
            ]),

            studyDuration: getFirstValue(student, [
                "study_duration",
                "studyDuration"
            ]),

            studentStatus: getFirstValue(student, [
                "student_status",
                "studentStatus"
            ]),

            accountStatus: getFirstValue(student, [
                "account_status",
                "accountStatus",
                "status"
            ]),

            role: getFirstValue(student, [
                "role",
                "user_role"
            ])
        };

        normalized.fullName = [
            normalized.surname,
            normalized.firstName,
            normalized.otherNames
        ]
            .filter(Boolean)
            .join(" ");

        return normalized;
    }


    /* =====================================================
       5. DATE AND FORMATTING HELPERS
    ===================================================== */

    function formatCurrentDate() {
        const dateElement = getElement("currentDate");

        if (!dateElement) {
            return;
        }

        dateElement.textContent = new Date().toLocaleDateString(
            "en-GB",
            {
                day: "numeric",
                month: "short",
                year: "numeric"
            }
        );
    }

    function formatGender(value) {
        if (!value) {
            return "Not available";
        }

        const gender = value.toLowerCase();

        if (gender === "male") {
            return "Male";
        }

        if (gender === "female") {
            return "Female";
        }

        return value.charAt(0).toUpperCase() + value.slice(1);
    }

    function formatAccountStatus(value) {
        if (!value) {
            return "Not available";
        }

        return value
            .replace(/[_-]+/g, " ")
            .replace(/\b\w/g, character => character.toUpperCase());
    }

    function formatStudyDuration(value) {
        if (value === "" || value === null || value === undefined) {
            return "Not available";
        }

        const duration = Number(value);

        if (!Number.isFinite(duration)) {
            return String(value);
        }

        if (duration === 1) {
            return "1 year";
        }

        if (duration > 1) {
            return `${duration} years`;
        }

        return String(value);
    }

    function getStudentCategory(student) {
        /*
         * Prefer a category explicitly supplied by the backend.
         */
        const explicitCategory = getFirstValue(student, [
            "student_category",
            "studentCategory",
            "category"
        ]);

        if (explicitCategory) {
            return formatAccountStatus(explicitCategory);
        }

        /*
         * Existing UniClear registration rule:
         * study duration greater than six years = external.
         *
         * Do not infer a category if duration is missing.
         */
        const duration = Number(student.studyDuration);

        if (
            student.studyDuration !== "" &&
            Number.isFinite(duration)
        ) {
            return duration > 6 ? "External Student" : "Regular Student";
        }

        const status = student.studentStatus.toLowerCase();

        if (status.includes("external")) {
            return "External Student";
        }

        if (status.includes("regular")) {
            return "Regular Student";
        }

        return "Not available";
    }


    /* =====================================================
       6. PROFILE MESSAGE HANDLING
    ===================================================== */

    function showMessage(message, type = "info") {
        const messageElement = getElement("profileMessage");

        if (!messageElement) {
            return;
        }

        messageElement.textContent = message;
        messageElement.className = `profile-message ${type}`;
        messageElement.hidden = false;
    }

    function hideMessage() {
        const messageElement = getElement("profileMessage");

        if (!messageElement) {
            return;
        }

        messageElement.textContent = "";
        messageElement.className = "profile-message";
        messageElement.hidden = true;
    }


    /* =====================================================
       7. PROFILE AVATAR INITIALS
    ===================================================== */

    function getInitials(student) {
        const first = student.firstName.charAt(0);
        const surname = student.surname.charAt(0);

        const initials = `${first}${surname}`.trim();

        return initials.toUpperCase();
    }

    function renderAvatar(elementId, student) {
        const avatar = getElement(elementId);

        if (!avatar) {
            return;
        }

        const initials = getInitials(student);

        /*
         * Use textContent to avoid inserting user-provided
         * names as HTML.
         */
        if (initials) {
            avatar.textContent = initials;
            avatar.classList.add("has-initials");
        } else {
            avatar.textContent = "";
            avatar.classList.remove("has-initials");

            const icon = document.createElement("i");
            icon.className = "fa-solid fa-user-graduate";

            avatar.appendChild(icon);
        }

        avatar.setAttribute(
            "aria-label",
            student.fullName
                ? `Avatar for ${student.fullName}`
                : "Student avatar"
        );
    }


    /* =====================================================
       8. ACCOUNT STATUS BADGE
    ===================================================== */

    function renderAccountStatus(student) {
        const badge = getElement("profileAccountStatus");

        if (!badge) {
            return;
        }

        const status = student.accountStatus || "Not available";
        const normalizedStatus = status.toLowerCase();

        badge.classList.remove(
            "inactive",
            "suspended",
            "disabled"
        );

        badge.replaceChildren();

        const icon = document.createElement("i");
        const label = document.createElement("span");

        if (
            normalizedStatus.includes("inactive") ||
            normalizedStatus.includes("suspended") ||
            normalizedStatus.includes("disabled")
        ) {
            badge.classList.add("inactive");
            icon.className = "fa-solid fa-circle-xmark";
        } else {
            icon.className = "fa-solid fa-circle-check";
        }

        label.textContent = formatAccountStatus(status);

        badge.append(icon, label);

        setText(
            "profileAccountStatusDetails",
            formatAccountStatus(status)
        );
    }


    /* =====================================================
       9. RENDER STUDENT PROFILE
    ===================================================== */

    function renderStudentProfile(student) {
        const fullStudent = normalizeStudent(student);

        if (!fullStudent) {
            showMessage(
                "Your student profile could not be loaded. Please sign in again.",
                "error"
            );

            return false;
        }

        hideMessage();

        /*
         * Sidebar identity.
         */
        setText(
            "sidebarStudentName",
            fullStudent.fullName,
            "Student Name"
        );

        setText(
            "sidebarStudentRegNo",
            fullStudent.registrationNumber,
            "Registration Number"
        );

        /*
         * Topbar identity.
         */
        setText(
            "topbarStudentName",
            fullStudent.fullName,
            "Student"
        );

        /*
         * Profile overview.
         */
        setText(
            "profileFullName",
            fullStudent.fullName,
            "Student Name"
        );

        setText(
            "profileRegNo",
            fullStudent.registrationNumber
                ? ` ${fullStudent.registrationNumber}`
                : "",
            "Registration Number"
        );

        setText(
            "profileDepartment",
            fullStudent.department,
            "Department"
        );

        /*
         * Personal information.
         */
        setText("profileSurname", fullStudent.surname);
        setText("profileFirstName", fullStudent.firstName);
        setText("profileOtherNames", fullStudent.otherNames);
        setText("profileEmail", fullStudent.email);
        setText("profilePhoneNumber", fullStudent.phoneNumber);

        setText(
            "profileGender",
            formatGender(fullStudent.gender)
        );

        /*
         * Academic information.
         */
        setText(
            "academicRegNo",
            fullStudent.registrationNumber
        );

        setText(
            "academicFaculty",
            fullStudent.faculty
        );

        setText(
            "academicDepartment",
            fullStudent.department
        );

        setText(
            "academicAdmissionYear",
            fullStudent.admissionYear
        );

        setText(
            "academicStudyDuration",
            formatStudyDuration(fullStudent.studyDuration)
        );

        setText(
            "academicStudentStatus",
            formatAccountStatus(
                fullStudent.studentStatus
            )
        );

        /*
         * Summary cards.
         */
        setText(
            "profileStudentCategory",
            getStudentCategory(fullStudent)
        );

        setText(
            "profileFacultySummary",
            fullStudent.faculty
        );

        setText(
            "profileAdmissionYearSummary",
            fullStudent.admissionYear
        );

        /*
         * Account information.
         */
        setText(
            "profileRole",
            fullStudent.role || "Student"
        );

        renderAccountStatus(fullStudent);

        /*
         * Avatars.
         */
        renderAvatar("sidebarStudentAvatar", fullStudent);
        renderAvatar("topbarAvatar", fullStudent);
        renderAvatar("profileAvatar", fullStudent);

        return true;
    }


    /* =====================================================
       10. LOAD AND REFRESH PROFILE
    ===================================================== */

    function loadProfile() {
        hideMessage();

        const student = loadStudentFromStorage();

        if (!student) {
            showMessage(
                "No saved student session was found. Please log in again to view your profile.",
                "error"
            );

            return;
        }

        const normalizedStudent = normalizeStudent(student);

        /*
         * Verify that this appears to be a student account.
         */
        const storedRole = (
            normalizedStudent.role ||
            getStoredValue(ROLE_KEYS)
        ).toLowerCase();

        if (
            storedRole &&
            storedRole !== "student"
        ) {
            showMessage(
                "This page is intended for student accounts. Please sign in with your student account.",
                "warning"
            );

            return;
        }

        renderStudentProfile(student);
    }

    function refreshProfile() {
        const refreshButton = getElement("refreshProfileButton");

        if (refreshButton) {
            refreshButton.disabled = true;

            const originalHTML = refreshButton.innerHTML;

            refreshButton.innerHTML =
                '<i class="fa-solid fa-spinner fa-spin"></i> Refreshing...';

            /*
             * Reload the locally stored login data.
             * This is not a server-side profile refresh.
             */
            loadProfile();

            window.setTimeout(() => {
                refreshButton.disabled = false;
                refreshButton.innerHTML = originalHTML;
            }, 350);

            return;
        }

        loadProfile();
    }


    /* =====================================================
       11. MOBILE SIDEBAR NAVIGATION
    ===================================================== */

    function openSidebar() {
        const sidebar = getElement("dashboardSidebar");
        const overlay = getElement("sidebarOverlay");

        if (sidebar) {
            sidebar.classList.add("open");
        }

        if (overlay) {
            overlay.classList.add("active");
        }

        document.body.classList.add("sidebar-open");
    }

    function closeSidebar() {
        const sidebar = getElement("dashboardSidebar");
        const overlay = getElement("sidebarOverlay");

        if (sidebar) {
            sidebar.classList.remove("open");
        }

        if (overlay) {
            overlay.classList.remove("active");
        }

        document.body.classList.remove("sidebar-open");
    }

    function initializeSidebar() {
        const menuButton = getElement("mobileMenuButton");
        const closeButton = getElement("sidebarCloseButton");
        const overlay = getElement("sidebarOverlay");

        if (menuButton) {
            menuButton.addEventListener("click", openSidebar);
        }

        if (closeButton) {
            closeButton.addEventListener("click", closeSidebar);
        }

        if (overlay) {
            overlay.addEventListener("click", closeSidebar);
        }

        document.addEventListener("keydown", event => {
            if (event.key === "Escape") {
                closeSidebar();
            }
        });

        document.querySelectorAll(".sidebar-navigation .nav-link")
            .forEach(link => {
                link.addEventListener("click", closeSidebar);
            });
    }


    /* =====================================================
       12. LOGOUT
    ===================================================== */

    function logout() {
        const confirmed = window.confirm(
            "Are you sure you want to log out of UniClear?"
        );

        if (!confirmed) {
            return;
        }

        /*
         * Remove only known student-session keys.
         * Do not clear unrelated application storage.
         */
        const keysToRemove = [
            ...SESSION_KEYS,
            ...REGISTRATION_NUMBER_KEYS,
            ...ROLE_KEYS,
            "uniclear_student_name",
            "uniclear_email",
            "uniclear_department",
            "uniclear_faculty",
            "uniclear_phone_number",
            "uniclear_gender",
            "uniclear_admission_year",
            "uniclear_study_duration",
            "uniclear_student_status",
            "uniclear_account_status"
        ];

        for (const key of keysToRemove) {
            try {
                sessionStorage.removeItem(key);
            } catch (error) {
                console.warn(
                    "Could not clear session key:",
                    key
                );
            }

            try {
                localStorage.removeItem(key);
            } catch (error) {
                console.warn(
                    "Could not clear local storage key:",
                    key
                );
            }
        }

        window.location.href = "login.html";
    }

    function initializeLogout() {
        const logoutButton = getElement("logoutButton");

        if (logoutButton) {
            logoutButton.addEventListener("click", logout);
        }
    }


    /* =====================================================
       13. PROFILE BUTTON
    ===================================================== */

    function initializeProfileButton() {
        const profileButton = getElement("topbarProfileButton");

        if (!profileButton) {
            return;
        }

        profileButton.addEventListener("click", () => {
            window.scrollTo({
                top: 0,
                behavior: "smooth"
            });
        });
    }


    /* =====================================================
       14. INITIALIZE PAGE
    ===================================================== */

    function initializePage() {
        formatCurrentDate();

        setText(
            "footerYear",
            new Date().getFullYear()
        );

        initializeSidebar();
        initializeLogout();
        initializeProfileButton();

        const refreshButton = getElement("refreshProfileButton");

        if (refreshButton) {
            refreshButton.addEventListener(
                "click",
                refreshProfile
            );
        }

        loadProfile();
    }


    /* =====================================================
       15. PUBLIC METHODS
    ===================================================== */

    return {
        initializePage,
        loadProfile,
        refreshProfile
    };

})();


/* =========================================================
   16. START PROFILE PAGE
========================================================= */

document.addEventListener("DOMContentLoaded", () => {
    StudentProfile.initializePage();
});


/* =========================================================
   END OF STUDENT PROFILE JAVASCRIPT
========================================================= */