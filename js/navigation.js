
/* =========================================================
   UNICLEAR — UNIVERSITY OF NIGERIA, NSUKKA
   File: js/navigation.js
   Purpose:
   1. Toggle the mobile navigation menu.
   2. Close the menu after a navigation link is selected.
   3. Close the menu when the Escape key is pressed.
   4. Update the footer copyright year automatically.
   ========================================================= */

document.addEventListener("DOMContentLoaded", function () {

    // ==================== 1. GET PAGE ELEMENTS ====================

    const menuToggle = document.getElementById("menuToggle");
    const mainNavigation = document.getElementById("mainNavigation");
    const currentYear = document.getElementById("currentYear");


    // ==================== 2. MOBILE NAVIGATION ====================

    /**
     * Open or close the mobile navigation menu.
     * The CSS class "open" controls the menu visibility.
     */
    function toggleNavigation() {
        if (!menuToggle || !mainNavigation) {
            return;
        }

        const isOpen = mainNavigation.classList.toggle("open");

        menuToggle.setAttribute("aria-expanded", String(isOpen));

        menuToggle.setAttribute(
            "aria-label",
            isOpen ? "Close navigation menu" : "Open navigation menu"
        );

        menuToggle.innerHTML = isOpen
            ? '<i class="fa-solid fa-xmark"></i>'
            : '<i class="fa-solid fa-bars"></i>';
    }


    /**
     * Close the mobile navigation menu.
     */
    function closeNavigation() {
        if (!menuToggle || !mainNavigation) {
            return;
        }

        mainNavigation.classList.remove("open");

        menuToggle.setAttribute("aria-expanded", "false");
        menuToggle.setAttribute("aria-label", "Open navigation menu");

        menuToggle.innerHTML = '<i class="fa-solid fa-bars"></i>';
    }


    // Attach the open/close action to the menu button.
    if (menuToggle && mainNavigation) {
        menuToggle.addEventListener("click", toggleNavigation);
    }


    // ==================== 3. NAVIGATION LINKS ====================

    if (mainNavigation) {
        const navigationLinks = mainNavigation.querySelectorAll(".nav-link");

        navigationLinks.forEach(function (link) {

            // Close the mobile menu after a link is selected.
            link.addEventListener("click", function () {
                closeNavigation();
            });

        });
    }


    // ==================== 4. ESCAPE KEY ====================

    document.addEventListener("keydown", function (event) {
        if (event.key === "Escape") {
            closeNavigation();
        }
    });


    // ==================== 5. RESPONSIVE MENU CLEANUP ====================

    /**
     * If the browser returns to desktop width,
     * reset the mobile menu state.
     */
    window.addEventListener("resize", function () {
        if (window.innerWidth > 900) {
            closeNavigation();
        }
    });


    // ==================== 6. FOOTER COPYRIGHT YEAR ====================

    if (currentYear) {
        currentYear.textContent = new Date().getFullYear();
    }


    // ==================== 7. INITIAL MENU STATE ====================

    closeNavigation();

});
