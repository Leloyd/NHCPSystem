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

  function initConfirmedSubmissions() {
    var forms = document.querySelectorAll("[data-confirm-submit]");

    forms.forEach(function (form) {
      form.addEventListener("submit", function (event) {
        var message = String(form.getAttribute("data-confirm-message") || "").trim();
        if (message && !window.confirm(message)) {
          event.preventDefault();
        }
      });
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

  function initAdminBookingCalendar() {
    var calendarRoots = document.querySelectorAll("[data-admin-booking-calendar]");

    calendarRoots.forEach(function (calendarRoot) {
      var payload = document.getElementById("adminBookingCalendarData");
      var grid = calendarRoot.querySelector("#adminBookingCalendarGrid");
      var label = calendarRoot.querySelector("#adminBookingMonthLabel");
      var details = calendarRoot.querySelector("#adminBookingCalendarDetails") || document.getElementById("adminBookingCalendarDetails");
      var prevButton = calendarRoot.querySelector("#adminBookingPrevMonth");
      var nextButton = calendarRoot.querySelector("#adminBookingNextMonth");
      var bookingReviewBaseUrl = String(
        calendarRoot.getAttribute("data-booking-review-base-url") || ""
      ).trim();

      if (!payload || !grid || !label || !details) {
        return;
      }

      var bookings = [];
      try {
        var parsedPayload = JSON.parse(payload.textContent || "[]");
        bookings = Array.isArray(parsedPayload) ? parsedPayload : [];
      } catch (error) {
        console.error("Failed to parse admin booking calendar data.", error);
      }

      var publicCalendarBookings = bookings.filter(function (booking) {
        return booking && booking.status === "confirmed";
      });
      var monthNames = [
        "January", "February", "March", "April", "May", "June",
        "July", "August", "September", "October", "November", "December"
      ];
      var now = new Date();
      var todayKey = [
        now.getFullYear(),
        String(now.getMonth() + 1).padStart(2, "0"),
        String(now.getDate()).padStart(2, "0")
      ].join("-");
      var currentMonth = now.getMonth();
      var currentYear = now.getFullYear();
      var selectedDate = null;

      function formatDateDisplay(dateText) {
        var parsed = new Date(String(dateText || "") + "T00:00:00");
        return parsed.toLocaleDateString("en-US", {
          weekday: "long",
          month: "long",
          day: "numeric",
          year: "numeric"
        });
      }

      function getEffectiveDate(booking) {
        if (booking.status === "rescheduled" && booking.rescheduled_date) {
          return booking.rescheduled_date;
        }
        return booking.date || "";
      }

      function getPublicCalendarBookingsForDate(dateText) {
        return publicCalendarBookings.filter(function (booking) {
          return booking.date === dateText;
        });
      }

      function getBookingsForDate(dateText) {
        return bookings.filter(function (booking) {
          return getEffectiveDate(booking) === dateText;
        });
      }

      function getStatusClass(status) {
        if (status === "confirmed") {
          return "is-confirmed";
        }
        if (status === "rescheduled") {
          return "is-rescheduled";
        }
        if (status === "cancelled") {
          return "is-cancelled";
        }
        return "is-pending";
      }

      function getStatusBadgeClass(status) {
        if (status === "confirmed") {
          return "is-published";
        }
        if (status === "cancelled") {
          return "is-cancelled";
        }
        if (status === "rescheduled") {
          return "is-rescheduled";
        }
        return "is-draft";
      }

      function escapeHtml(value) {
        return String(value == null ? "" : value)
          .replace(/&/g, "&amp;")
          .replace(/</g, "&lt;")
          .replace(/>/g, "&gt;")
          .replace(/\"/g, "&quot;")
          .replace(/'/g, "&#39;");
      }

      function renderDetails() {
        if (!selectedDate) {
          details.innerHTML = '<div class="admin-booking-calendar-empty">Select a date on the public calendar to see the full staff booking details for that day.</div>';
          return;
        }

        var dateBookings = getBookingsForDate(selectedDate);
        if (!dateBookings.length) {
          details.innerHTML = '<div class="admin-booking-calendar-empty">No booking requests are mapped to ' +
            escapeHtml(formatDateDisplay(selectedDate)) +
            '.</div>';
          return;
        }

        details.innerHTML = [
          '<div class="admin-booking-calendar-detail-head">',
          '<h4>' + escapeHtml(formatDateDisplay(selectedDate)) + '</h4>',
          '<p>' + dateBookings.length + ' booking request' + (dateBookings.length === 1 ? '' : 's') + ' on this date</p>',
          '</div>',
          '<div class="admin-booking-calendar-detail-list">',
          dateBookings.map(function (booking) {
            return [
              '<div class="admin-booking-calendar-card ' + getStatusClass(booking.status) + '">',
              '<div class="admin-booking-calendar-card-head">',
              '<div>',
              '<strong>' + escapeHtml(booking.scheduled_tour || booking.display_title || 'Museum Tour Booking') + '</strong>',
              '<p>' + escapeHtml(booking.institution_name || 'No institution provided') + '</p>',
              '</div>',
              '<span class="admin-status-badge ' + getStatusBadgeClass(booking.status) + '">' + escapeHtml(booking.status_label || 'Pending Review') + '</span>',
              '</div>',
              '<dl class="admin-booking-calendar-meta">',
              '<div><dt>Contact Person</dt><dd>' + escapeHtml(booking.contact_person || 'N/A') + '</dd></div>',
              '<div><dt>Contact Number</dt><dd>' + escapeHtml(booking.contact_number || 'N/A') + '</dd></div>',
              '<div><dt>Tour Agency</dt><dd>' + escapeHtml(booking.tour_agency || 'None') + '</dd></div>',
              '<div><dt>Visitors</dt><dd>' + escapeHtml((booking.total_visitors || 0) + ' total · ' + (booking.male_visitors || 0) + ' male · ' + (booking.female_visitors || 0) + ' female · ' + (booking.pwd_visitors || 0) + ' PWD') + '</dd></div>',
              '<div><dt>Requested Date</dt><dd>' + escapeHtml(booking.display_date || '—') + '</dd></div>',
              '<div><dt>Rescheduled Date</dt><dd>' + escapeHtml(booking.rescheduled_display_date || '—') + '</dd></div>',
              '<div><dt>Decision Reason</dt><dd>' + escapeHtml(booking.decision_reason || '—') + '</dd></div>',
              '<div><dt>Admin Notes</dt><dd>' + escapeHtml(booking.admin_notes || '—') + '</dd></div>',
              '</dl>',
              '<a href="' + escapeHtml(bookingReviewBaseUrl + '/' + booking.id) + '" class="admin-inline-link">Open booking</a>',
              '</div>'
            ].join('');
          }).join(''),
          '</div>'
        ].join('');
      }

      function renderCalendar() {
        label.textContent = monthNames[currentMonth] + ' ' + currentYear;
        var firstDay = new Date(currentYear, currentMonth, 1).getDay();
        var daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
        var html = '';
        var day;
        var index;

        for (index = 0; index < firstDay; index += 1) {
          html += '<div class="calendar-day-spacer" aria-hidden="true"></div>';
        }

        for (day = 1; day <= daysInMonth; day += 1) {
          var dateText = [
            currentYear,
            String(currentMonth + 1).padStart(2, '0'),
            String(day).padStart(2, '0')
          ].join('-');
          var dayBookings = getPublicCalendarBookingsForDate(dateText);
          var isToday = dateText === todayKey;
          var isSelected = selectedDate === dateText;

          html += [
            '<button type="button" class="calendar-day ' + (isToday ? 'today ' : '') + (isSelected ? 'selected' : '') + '" data-date="' + dateText + '">',
            '<span class="calendar-day-number">' + day + '</span>',
            dayBookings.length ? '<div class="calendar-day-dots">' + dayBookings.slice(0, 3).map(function () {
              return '<span class="calendar-event-dot"></span>';
            }).join('') + '</div>' : '',
            '</button>'
          ].join('');
        }

        grid.innerHTML = html;

        Array.prototype.slice.call(grid.querySelectorAll('.calendar-day')).forEach(function (button) {
          button.addEventListener('click', function () {
            var clickedDate = button.getAttribute('data-date');
            selectedDate = selectedDate === clickedDate ? null : clickedDate;
            renderCalendar();
            renderDetails();
          });
        });
      }

      if (prevButton) {
        prevButton.addEventListener('click', function () {
          if (currentMonth === 0) {
            currentMonth = 11;
            currentYear -= 1;
          } else {
            currentMonth -= 1;
          }
          renderCalendar();
        });
      }

      if (nextButton) {
        nextButton.addEventListener('click', function () {
          if (currentMonth === 11) {
            currentMonth = 0;
            currentYear += 1;
          } else {
            currentMonth += 1;
          }
          renderCalendar();
        });
      }

      renderCalendar();
      renderDetails();
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
    initAdminBookingCalendar();
    initDashboardSearch();
    initConfirmedSubmissions();
    initAutoDismissAlerts();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initDashboardUi);
  } else {
    initDashboardUi();
  }
})();
