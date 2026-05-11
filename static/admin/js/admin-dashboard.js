(function () {
  function initAutoDismissAlerts() {
    var successAlerts = document.querySelectorAll(".admin-alert-success");

    successAlerts.forEach(function (alertElement) {
      window.setTimeout(function () {
        alertElement.classList.add("admin-alert-is-hiding");

        window.setTimeout(function () {
          alertElement.classList.add("admin-alert-is-hidden");
        }, 300);
      }, 2000);
    });
  }

  function setSidebarState(isOpen) {
    document.body.classList.toggle("sidebar-open", Boolean(isOpen));
  }

  function initDashboardUi() {
    var toggle = document.querySelector("[data-sidebar-toggle]");
    var overlay = document.querySelector("[data-sidebar-overlay]");
    var mediaButtons = document.querySelectorAll(
      ".admin-primary-action, .admin-secondary-action, .admin-quick-action, .admin-text-link"
    );

    if (toggle) {
      toggle.addEventListener("click", function () {
        setSidebarState(!document.body.classList.contains("sidebar-open"));
      });
    }

    if (overlay) {
      overlay.addEventListener("click", function () {
        setSidebarState(false);
      });
    }

    window.addEventListener("resize", function () {
      if (window.innerWidth > 900) {
        setSidebarState(false);
      }
    });

    mediaButtons.forEach(function (button) {
      button.addEventListener("click", function () {
        if (window.innerWidth <= 900) {
          setSidebarState(false);
        }
      });
    });

    initAutoDismissAlerts();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initDashboardUi);
  } else {
    initDashboardUi();
  }
})();
