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

  function initDashboardSearch() {
    var searchInput = document.querySelector("[data-dashboard-search-input]");
    var searchRoot = document.querySelector("[data-dashboard-search-root]");

    if (!searchInput || !searchRoot) {
      return;
    }

    var searchableItems = Array.prototype.slice.call(
      searchRoot.querySelectorAll("[data-dashboard-search-item]")
    );
    var searchGroups = Array.prototype.slice.call(
      searchRoot.querySelectorAll("[data-dashboard-search-group]")
    );
    var emptyState = searchRoot.querySelector("[data-dashboard-search-empty]");

    function normalize(value) {
      return String(value || "").trim().toLowerCase();
    }

    function applySearch() {
      var query = normalize(searchInput.value);
      var visibleCount = 0;

      searchableItems.forEach(function (item) {
        var matches = !query || normalize(item.textContent).indexOf(query) !== -1;
        item.hidden = !matches;

        if (matches) {
          visibleCount += 1;
        }
      });

      searchGroups.forEach(function (group) {
        var visibleChildren = group.querySelectorAll(
          "[data-dashboard-search-item]:not([hidden])"
        ).length;
        group.hidden = Boolean(query) && visibleChildren === 0;
      });

      if (emptyState) {
        emptyState.hidden = !query || visibleCount > 0;
      }
    }

    searchInput.addEventListener("input", applySearch);
    searchInput.addEventListener("keydown", function (event) {
      if (event.key !== "Escape") {
        return;
      }

      searchInput.value = "";
      applySearch();
    });
  }

  function initDashboardVisuals() {
    var chartElements = document.querySelectorAll("[data-dashboard-chart]");
    var barElements = document.querySelectorAll("[data-dashboard-bar-value]");

    chartElements.forEach(function (element) {
      var chartValue = String(element.getAttribute("data-dashboard-chart") || "").trim();
      if (chartValue) {
        element.style.background = chartValue;
      }
    });

    barElements.forEach(function (element) {
      var rawValue = Number(element.getAttribute("data-dashboard-bar-value") || 0);
      var clampedValue = Math.max(0, Math.min(100, rawValue));
      element.style.width = clampedValue + "%";
    });
  }

  function initHighlightSwitcher() {
    var switchers = document.querySelectorAll("[data-highlight-switcher]");

    switchers.forEach(function (switcher) {
      var tabs = Array.prototype.slice.call(
        switcher.querySelectorAll("[data-highlight-tab]")
      );
      var panels = Array.prototype.slice.call(
        switcher.querySelectorAll("[data-highlight-panel]")
      );

      if (!tabs.length || !panels.length) {
        return;
      }

      function setActivePanel(panelName) {
        var resolvedPanelName = String(panelName || "").trim().toLowerCase() || "active";
        var hasMatch = panels.some(function (panel) {
          return String(panel.getAttribute("data-highlight-panel") || "").trim().toLowerCase() === resolvedPanelName;
        });

        if (!hasMatch) {
          resolvedPanelName = "active";
        }

        tabs.forEach(function (tab) {
          var isActive = String(tab.getAttribute("data-highlight-tab") || "").trim().toLowerCase() === resolvedPanelName;
          tab.classList.toggle("is-active", isActive);
          tab.setAttribute("aria-selected", isActive ? "true" : "false");
        });

        panels.forEach(function (panel) {
          var isActive = String(panel.getAttribute("data-highlight-panel") || "").trim().toLowerCase() === resolvedPanelName;
          panel.classList.toggle("is-active", isActive);
          panel.hidden = !isActive;
        });
      }

      tabs.forEach(function (tab) {
        tab.addEventListener("click", function () {
          setActivePanel(tab.getAttribute("data-highlight-tab"));
        });
      });

      setActivePanel("active");
    });
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

    initDashboardVisuals();
    initHighlightSwitcher();
    initDashboardSearch();
    initAutoDismissAlerts();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initDashboardUi);
  } else {
    initDashboardUi();
  }
})();
