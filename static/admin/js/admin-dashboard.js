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

  function initSuccessModals() {
    Array.prototype.slice.call(document.querySelectorAll("[data-admin-success-modal]")).forEach(function (modal) {
      var closeButton = modal.querySelector("[data-admin-success-close]");
      var returnFocus = document.querySelector("[data-admin-success-return]");
      var closeTimer = 0;

      function closeModal() {
        modal.classList.remove("is-open");
        modal.setAttribute("aria-hidden", "true");
        document.body.classList.remove("admin-confirm-open");
        if (closeTimer) window.clearTimeout(closeTimer);
        closeTimer = window.setTimeout(function () {
          modal.hidden = true;
          closeTimer = 0;
          if (returnFocus && typeof returnFocus.focus === "function") returnFocus.focus();
        }, 180);
      }

      if (!closeButton) return;
      modal.hidden = false;
      modal.setAttribute("aria-hidden", "false");
      document.body.classList.add("admin-confirm-open");
      window.requestAnimationFrame(function () {
        modal.classList.add("is-open");
        closeButton.focus();
      });

      // A refresh should not replay a completed-action notification.
      try {
        var cleanUrl = new URL(window.location.href);
        cleanUrl.searchParams.delete("status");
        window.history.replaceState(window.history.state, "", cleanUrl.pathname + cleanUrl.search + cleanUrl.hash);
      } catch (_) {}

      closeButton.addEventListener("click", closeModal);
      modal.addEventListener("click", function (event) {
        if (event.target === modal) closeModal();
      });
      modal.addEventListener("keydown", function (event) {
        if (event.key === "Escape") {
          event.preventDefault();
          closeModal();
        } else if (event.key === "Tab") {
          event.preventDefault();
          closeButton.focus();
        }
      });
    });
  }

  function initConfirmedSubmissions() {
    var forms = document.querySelectorAll("[data-confirm-submit]");
    var modal = document.querySelector("[data-admin-confirm-modal]");
    var title = modal && modal.querySelector("[data-admin-confirm-title]");
    var message = modal && modal.querySelector("[data-admin-confirm-message]");
    var eyebrow = modal && modal.querySelector("[data-admin-confirm-eyebrow]");
    var cancelButton = modal && modal.querySelector("[data-admin-confirm-cancel]");
    var approveButton = modal && modal.querySelector("[data-admin-confirm-approve]");
    var pendingForm = null;
    var pendingSubmitter = null;
    var pendingConfirmationResolve = null;
    var approvedForm = null;
    var previousFocus = null;
    var closeTimer = 0;

    function closeModal(restoreFocus, confirmationResult) {
      if (!modal) {
        return;
      }

      var confirmationResolve = pendingConfirmationResolve;
      pendingConfirmationResolve = null;

      modal.classList.remove("is-open");
      modal.setAttribute("aria-hidden", "true");
      document.body.classList.remove("admin-confirm-open");

      if (closeTimer) {
        window.clearTimeout(closeTimer);
      }
      closeTimer = window.setTimeout(function () {
        modal.hidden = true;
        closeTimer = 0;
      }, 180);

      pendingForm = null;
      pendingSubmitter = null;

      if (restoreFocus !== false && previousFocus && typeof previousFocus.focus === "function") {
        previousFocus.focus();
      }
      previousFocus = null;

      if (confirmationResolve) {
        confirmationResolve(confirmationResult === true);
      }
    }

    function openModal(form, submitter) {
      var variant = String(form.getAttribute("data-confirm-variant") || "disable").trim().toLowerCase();
      var nextTitle = String(form.getAttribute("data-confirm-title") || "Confirm action").trim();
      var nextMessage = String(form.getAttribute("data-confirm-message") || "").trim();
      var nextLabel = String(form.getAttribute("data-confirm-label") || "Confirm").trim();
      var nextEyebrow = String(form.getAttribute("data-confirm-eyebrow") || "Account access").trim();

      if (!modal || !title || !message || !approveButton || !cancelButton) {
        return window.confirm(nextMessage || nextTitle);
      }

      if (closeTimer) {
        window.clearTimeout(closeTimer);
        closeTimer = 0;
      }

      pendingForm = form;
      pendingSubmitter = submitter || form.querySelector('button[type="submit"], input[type="submit"]');
      pendingConfirmationResolve = null;
      previousFocus = document.activeElement;
      title.textContent = nextTitle;
      message.textContent = nextMessage;
      if (eyebrow) {
        eyebrow.textContent = nextEyebrow;
      }
      approveButton.textContent = nextLabel;
      modal.classList.toggle("is-enable", variant === "enable");
      modal.classList.toggle("is-disable", variant !== "enable");
      modal.hidden = false;
      modal.setAttribute("aria-hidden", "false");
      document.body.classList.add("admin-confirm-open");

      window.requestAnimationFrame(function () {
        modal.classList.add("is-open");
        cancelButton.focus();
      });
      return false;
    }

    function requestConfirmation(options) {
      var settings = options || {};
      var nextTitle = String(settings.title || "Confirm action").trim();
      var nextMessage = String(settings.message || "").trim();
      var nextLabel = String(settings.label || "Confirm").trim();
      var nextEyebrow = String(settings.eyebrow || "Confirm action").trim();
      var variant = String(settings.variant || "disable").trim().toLowerCase();

      if (!modal || !title || !message || !approveButton || !cancelButton) {
        return Promise.resolve(window.confirm(nextMessage || nextTitle));
      }

      if (!modal.hidden || pendingForm || pendingConfirmationResolve) {
        return Promise.resolve(false);
      }

      return new Promise(function (resolve) {
        if (closeTimer) {
          window.clearTimeout(closeTimer);
          closeTimer = 0;
        }
        pendingForm = null;
        pendingSubmitter = null;
        pendingConfirmationResolve = resolve;
        previousFocus = document.activeElement;
        title.textContent = nextTitle;
        message.textContent = nextMessage;
        if (eyebrow) eyebrow.textContent = nextEyebrow;
        approveButton.textContent = nextLabel;
        modal.classList.toggle("is-enable", variant === "enable");
        modal.classList.toggle("is-disable", variant !== "enable");
        modal.hidden = false;
        modal.setAttribute("aria-hidden", "false");
        document.body.classList.add("admin-confirm-open");
        window.requestAnimationFrame(function () {
          modal.classList.add("is-open");
          cancelButton.focus();
        });
      });
    }

    window.NHCPAdminConfirm = requestConfirmation;

    forms.forEach(function (form) {
      form.addEventListener("submit", function (event) {
        if (approvedForm === form) {
          approvedForm = null;
          return;
        }

        event.preventDefault();
        event.stopImmediatePropagation();
        if (openModal(form, event.submitter)) {
          approvedForm = form;
          if (typeof form.requestSubmit === "function") {
            form.requestSubmit(event.submitter || undefined);
          } else {
            form.submit();
          }
        }
      });
    });

    if (!modal || !cancelButton || !approveButton) {
      return;
    }

    cancelButton.addEventListener("click", function () {
      closeModal(true, false);
    });

    approveButton.addEventListener("click", function () {
      if (pendingConfirmationResolve) {
        closeModal(true, true);
        return;
      }
      var form = pendingForm;
      var submitter = pendingSubmitter;
      if (!form) {
        closeModal(true);
        return;
      }

      closeModal(false);
      approvedForm = form;
      if (typeof form.requestSubmit === "function") {
        form.requestSubmit(submitter || undefined);
        return;
      }

      if (submitter && submitter.name) {
        var fallbackValue = document.createElement("input");
        fallbackValue.type = "hidden";
        fallbackValue.name = submitter.name;
        fallbackValue.value = submitter.value;
        form.appendChild(fallbackValue);
      }
      form.submit();
    });

    modal.addEventListener("click", function (event) {
      if (event.target === modal) {
        closeModal(true, false);
      }
    });

    modal.addEventListener("keydown", function (event) {
      if (event.key === "Escape") {
        event.preventDefault();
        closeModal(true, false);
        return;
      }

      if (event.key !== "Tab") {
        return;
      }

      var focusable = [cancelButton, approveButton];
      var first = focusable[0];
      var last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
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
    var heightElements = document.querySelectorAll("[data-dashboard-bar-height]");

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

    heightElements.forEach(function (element) {
      var rawValue = Number(element.getAttribute("data-dashboard-bar-height") || 0);
      var clampedValue = Math.max(0, Math.min(100, rawValue));
      element.style.height = clampedValue + "%";
    });
  }

  function initHighlightSwitcher() {
    var switchers = Array.prototype.slice.call(
      document.querySelectorAll("[data-highlight-switcher]")
    );

    switchers.forEach(function (switcher) {
      var tabs = Array.prototype.slice.call(
        switcher.querySelectorAll("[data-highlight-tab]")
      );
      var cards = Array.prototype.slice.call(
        switcher.querySelectorAll("[data-highlight-card]")
      );
      var description = switcher.querySelector("[data-highlight-filter-description]");
      var emptyState = switcher.querySelector("[data-highlight-empty]");
      var emptyTitle = switcher.querySelector("[data-highlight-empty-title]");
      var emptyCopy = switcher.querySelector("[data-highlight-empty-copy]");
      var allowedFilters = ["all", "active", "draft", "archived"];
      var currentFilter = String(
        switcher.getAttribute("data-current-highlight-filter") || "all"
      ).trim().toLowerCase();

      if (!tabs.length) {
        return;
      }

      function normalizeFilter(filterName) {
        var normalized = String(filterName || "").trim().toLowerCase();
        if (allowedFilters.indexOf(normalized) === -1) {
          return "all";
        }
        return normalized;
      }

      function updateAddress(mode) {
        if (!window.history || typeof window.history.replaceState !== "function") {
          return;
        }
        var url = new URL(window.location.href);
        url.searchParams.set("filter", currentFilter);
        var method = mode === "push" ? "pushState" : "replaceState";
        window.history[method](
          { highlightFilter: currentFilter },
          "",
          url.pathname + url.search + url.hash
        );
      }

      function setActiveFilter(filterName, options) {
        currentFilter = normalizeFilter(filterName);
        var visibleCount = 0;

        cards.forEach(function (card) {
          var cardStatus = String(
            card.getAttribute("data-highlight-status") || ""
          ).trim().toLowerCase();
          var isVisible = currentFilter === "all" || cardStatus === currentFilter;
          card.hidden = !isVisible;
          if (isVisible) {
            visibleCount += 1;
          }
        });

        tabs.forEach(function (tab) {
          var isActive = normalizeFilter(tab.getAttribute("data-highlight-tab")) === currentFilter;
          tab.classList.toggle("is-active", isActive);
          if (isActive) {
            tab.setAttribute("aria-current", "page");
          } else {
            tab.removeAttribute("aria-current");
          }
        });

        var descriptions = {
          all: "Showing every community highlight card.",
          active: "Cards currently visible on the public Community Highlights section.",
          draft: "Unpublished cards still being prepared.",
          archived: "Retained cards hidden from the public site.",
        };
        if (description) {
          description.textContent = descriptions[currentFilter];
        }

        if (emptyState) {
          emptyState.hidden = visibleCount > 0;
        }
        if (emptyTitle) {
          emptyTitle.textContent = cards.length
            ? "No " + currentFilter + " highlights"
            : "No community highlights yet";
        }
        if (emptyCopy) {
          emptyCopy.textContent = cards.length
            ? "There are currently no cards in this status."
            : "Create the first card for the public Community Highlights collection.";
        }

        if (!options || options.updateUrl !== false) {
          updateAddress(options && options.historyMode);
        }
      }

      tabs.forEach(function (tab) {
        tab.addEventListener("click", function (event) {
          event.preventDefault();
          setActiveFilter(tab.getAttribute("data-highlight-tab"), {
            historyMode: "push",
          });
        });
      });

      window.addEventListener("popstate", function () {
        var params = new URLSearchParams(window.location.search);
        setActiveFilter(params.get("filter"), { updateUrl: false });
      });

      setActiveFilter(currentFilter, { updateUrl: false });
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

      var calendarBookings = bookings.filter(function (booking) {
        return booking && (
          booking.status === "confirmed" ||
          booking.status === "pending"
        );
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

      function getCalendarBookingsForDate(dateText) {
        return calendarBookings.filter(function (booking) {
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
          details.innerHTML = '<div class="admin-booking-calendar-empty">Select a date on the staff calendar to see the full booking details for that day.</div>';
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
          var dayBookings = getCalendarBookingsForDate(dateText);
          var pendingCount = dayBookings.filter(function (booking) {
            return booking.status === "pending";
          }).length;
          var confirmedCount = dayBookings.filter(function (booking) {
            return booking.status === "confirmed";
          }).length;
          var isToday = dateText === todayKey;
          var isSelected = selectedDate === dateText;
          var bookingLabelParts = [];
          if (confirmedCount) {
            bookingLabelParts.push(
              confirmedCount + " confirmed booking" + (confirmedCount === 1 ? "" : "s")
            );
          }
          if (pendingCount) {
            bookingLabelParts.push(
              pendingCount + " pending booking" + (pendingCount === 1 ? "" : "s")
            );
          }
          var dayAriaLabel = formatDateDisplay(dateText) +
            (bookingLabelParts.length ? ": " + bookingLabelParts.join(", ") : ": no bookings");

          html += [
            '<button type="button" class="calendar-day ' + (isToday ? 'today ' : '') + (isSelected ? 'selected' : '') + '" data-date="' + dateText + '" aria-label="' + escapeHtml(dayAriaLabel) + '">',
            '<span class="calendar-day-number">' + day + '</span>',
            dayBookings.length
              ? '<div class="calendar-day-dots" aria-hidden="true">' +
                (confirmedCount ? '<span class="calendar-event-dot is-confirmed"></span>' : '') +
                (pendingCount ? '<span class="calendar-event-dot is-pending"></span>' : '') +
                '</div>'
              : '',
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

  function initAdminBookingManagement() {
    var root = document.querySelector("[data-admin-bookings]");
    if (!root) {
      return;
    }

    var cards = Array.prototype.slice.call(root.querySelectorAll("[data-booking-card]"));
    var filterButtons = Array.prototype.slice.call(root.querySelectorAll("[data-booking-filter]"));
    var searchInput = root.querySelector("#adminBookingSearch");
    var clearButton = root.querySelector("[data-booking-search-clear]");
    var visibleCount = root.querySelector("[data-booking-visible-count]");
    var emptyState = root.querySelector("[data-booking-empty]");
    var emptyTitle = root.querySelector("[data-booking-empty-title]");
    var emptyCopy = root.querySelector("[data-booking-empty-copy]");
    var currentFilter = String(
      root.getAttribute("data-current-booking-filter") || "all"
    ).toLowerCase();

    function normalize(value) {
      return String(value || "").trim().toLowerCase();
    }

    function getSearchQuery() {
      return normalize(searchInput && searchInput.value);
    }

    function updateControls() {
      filterButtons.forEach(function (button) {
        var isActive = button.getAttribute("data-booking-filter") === currentFilter;
        button.classList.toggle("is-active", isActive);
        button.setAttribute("aria-pressed", isActive ? "true" : "false");
      });

    }

    function applyBookingView() {
      var query = getSearchQuery();
      var shown = 0;

      cards.forEach(function (card) {
        var statusMatches =
          currentFilter === "all" ||
          card.getAttribute("data-booking-status") === currentFilter;
        var searchMatches =
          !query ||
          normalize(card.getAttribute("data-booking-search")).indexOf(query) !== -1;
        var shouldShow = statusMatches && searchMatches;

        card.hidden = !shouldShow;
        if (shouldShow) {
          shown += 1;
        }
      });

      if (visibleCount) {
        visibleCount.textContent =
          shown + " booking" + (shown === 1 ? "" : "s");
      }

      if (clearButton) {
        clearButton.hidden = !query;
      }

      if (emptyState) {
        emptyState.hidden = shown > 0;
      }

      if (shown === 0 && emptyTitle && emptyCopy) {
        if (query) {
          emptyTitle.textContent = "No matching bookings";
          emptyCopy.textContent = "Try another institution, contact name, agency, or date.";
        } else if (currentFilter !== "all") {
          emptyTitle.textContent =
            "No " + currentFilter + " bookings";
          emptyCopy.textContent =
            "There are currently no booking records with this status.";
        } else {
          emptyTitle.textContent = "No booking requests yet";
          emptyCopy.textContent = "New visitor booking requests will appear here.";
        }
      }

      updateControls();
    }

    function selectFilter(filter) {
      var allowed = ["all", "pending", "confirmed", "rescheduled", "cancelled"];
      currentFilter = allowed.indexOf(filter) !== -1 ? filter : "all";
      root.setAttribute("data-current-booking-filter", currentFilter);
      applyBookingView();
    }

    filterButtons.forEach(function (button) {
      button.addEventListener("click", function () {
        selectFilter(button.getAttribute("data-booking-filter"));
      });
    });

    if (searchInput) {
      searchInput.addEventListener("input", applyBookingView);
      searchInput.addEventListener("keydown", function (event) {
        if (event.key === "Escape" && searchInput.value) {
          searchInput.value = "";
          applyBookingView();
        }
      });
    }

    if (clearButton && searchInput) {
      clearButton.addEventListener("click", function () {
        searchInput.value = "";
        applyBookingView();
        searchInput.focus();
      });
    }

    applyBookingView();
  }

  function initAdminBookingReview() {
    var form = document.querySelector("[data-admin-booking-review]");
    if (!form) {
      return;
    }

    var actionInputs = Array.prototype.slice.call(
      form.querySelectorAll('input[name="moderation_action"]')
    );
    var options = Array.prototype.slice.call(
      form.querySelectorAll(".admin-booking-decision-option")
    );
    var reasonField = form.querySelector("[data-booking-reason-field]");
    var reasonInput = form.querySelector("#decisionReason");
    var rescheduleField = form.querySelector("[data-booking-reschedule-field]");
    var rescheduleInput = form.querySelector("#rescheduledVisitDate");
    var help = form.querySelector("[data-booking-decision-help]");
    var submitButton = form.querySelector("[data-booking-decision-submit]");
    var submitLabel = submitButton && submitButton.querySelector("span");

    var actionSettings = {
      confirm: {
        help: "Confirming publishes this date on the public booking calendar and notifies the visitor.",
        submit: "Confirm booking",
        title: "Confirm this booking?",
        message: "Save this booking as confirmed? The visitor will be notified and the visit will appear on the public calendar.",
        confirmLabel: "Confirm booking",
        variant: "enable",
      },
      reschedule: {
        help: "Choose a new proposed date and explain why the original schedule needs to change.",
        submit: "Send new schedule",
        title: "Reschedule this booking?",
        message: "Save the proposed date and reason? The visitor will be notified that this booking needs a new schedule.",
        confirmLabel: "Reschedule booking",
        variant: "enable",
      },
      cancel: {
        help: "Explain the cancellation clearly. The visitor will receive the updated booking status.",
        submit: "Cancel booking",
        title: "Cancel this booking?",
        message: "Cancel this booking request? The visitor will be notified and the visit will not appear on the public calendar.",
        confirmLabel: "Cancel booking",
        variant: "disable",
      },
    };

    function getSelectedAction() {
      var selected = actionInputs.find(function (input) {
        return input.checked;
      });
      return selected ? selected.value : "confirm";
    }

    function setFieldState(field, input, isVisible, isRequired) {
      if (field) {
        field.hidden = !isVisible;
      }
      if (input) {
        input.disabled = !isVisible;
        input.required = Boolean(isVisible && isRequired);
      }
    }

    function updateDecisionUi() {
      var action = getSelectedAction();
      var settings = actionSettings[action] || actionSettings.confirm;

      options.forEach(function (option) {
        var input = option.querySelector('input[name="moderation_action"]');
        option.classList.toggle("is-selected", Boolean(input && input.checked));
      });

      setFieldState(reasonField, reasonInput, action !== "confirm", true);
      setFieldState(
        rescheduleField,
        rescheduleInput,
        action === "reschedule",
        true
      );

      if (help) {
        help.textContent = settings.help;
      }
      if (submitLabel) {
        submitLabel.textContent = settings.submit;
      }
      if (submitButton) {
        submitButton.classList.toggle("is-reschedule", action === "reschedule");
        submitButton.classList.toggle("is-cancel", action === "cancel");
      }

      form.setAttribute("data-confirm-title", settings.title);
      form.setAttribute("data-confirm-message", settings.message);
      form.setAttribute("data-confirm-label", settings.confirmLabel);
      form.setAttribute("data-confirm-variant", settings.variant);
    }

    if (rescheduleInput && !rescheduleInput.min) {
      var tomorrow = new Date();
      tomorrow.setHours(12, 0, 0, 0);
      tomorrow.setDate(tomorrow.getDate() + 1);
      rescheduleInput.min = [
        tomorrow.getFullYear(),
        String(tomorrow.getMonth() + 1).padStart(2, "0"),
        String(tomorrow.getDate()).padStart(2, "0"),
      ].join("-");
    }

    actionInputs.forEach(function (input) {
      input.addEventListener("change", updateDecisionUi);
      input.addEventListener("focus", function () {
        var option = input.closest(".admin-booking-decision-option");
        if (option) {
          option.classList.add("is-focused");
        }
      });
      input.addEventListener("blur", function () {
        var option = input.closest(".admin-booking-decision-option");
        if (option) {
          option.classList.remove("is-focused");
        }
      });
    });

    updateDecisionUi();
  }

  function initAdminGalleryManagement() {
    var root = document.querySelector("[data-admin-gallery-manager]");
    if (!root) {
      return;
    }

    var cards = Array.prototype.slice.call(root.querySelectorAll("[data-gallery-card]"));
    var filterButtons = Array.prototype.slice.call(
      root.querySelectorAll("[data-gallery-filter-button]")
    );
    var searchInput = root.querySelector("#adminGallerySearch");
    var clearButton = root.querySelector("[data-gallery-search-clear]");
    var visibleCount = root.querySelector("[data-gallery-visible-count]");
    var libraryTitle = root.querySelector("[data-gallery-library-title]");
    var libraryDescription = root.querySelector("[data-gallery-library-description]");
    var emptyState = root.querySelector("[data-gallery-empty]");
    var emptyTitle = root.querySelector("[data-gallery-empty-title]");
    var emptyCopy = root.querySelector("[data-gallery-empty-copy]");
    var currentFilter = String(
      root.getAttribute("data-gallery-filter") || "all"
    ).toLowerCase();

    var filterCopy = {
      all: {
        title: "Complete collection",
        description: "Every published, draft, and archived gallery card",
      },
      published: {
        title: "Public collection",
        description: "Cards currently visible in the Online Gallery",
      },
      draft: {
        title: "Draft workspace",
        description: "Unpublished cards still being prepared",
      },
      archived: {
        title: "Collection archive",
        description: "Hidden cards retained for future restoration",
      },
    };

    function normalize(value) {
      return String(value || "").trim().toLowerCase();
    }

    function applyGalleryView() {
      var query = normalize(searchInput && searchInput.value);
      var shown = 0;

      cards.forEach(function (card) {
        var statusMatches =
          currentFilter === "all" ||
          card.getAttribute("data-gallery-status") === currentFilter;
        var searchMatches =
          !query ||
          normalize(card.getAttribute("data-gallery-search")).indexOf(query) !== -1;
        var shouldShow = statusMatches && searchMatches;

        card.hidden = !shouldShow;
        if (shouldShow) {
          shown += 1;
        }
      });

      filterButtons.forEach(function (button) {
        var isActive =
          button.getAttribute("data-gallery-filter-button") === currentFilter;
        button.classList.toggle("is-active", isActive);
        button.setAttribute("aria-pressed", isActive ? "true" : "false");
      });

      var copy = filterCopy[currentFilter] || filterCopy.all;
      if (libraryTitle) {
        libraryTitle.textContent = copy.title;
      }
      if (libraryDescription) {
        libraryDescription.textContent = copy.description;
      }
      if (visibleCount) {
        visibleCount.textContent = shown + " card" + (shown === 1 ? "" : "s");
      }
      if (clearButton) {
        clearButton.hidden = !query;
      }
      if (emptyState) {
        emptyState.hidden = shown > 0;
      }

      if (shown === 0 && emptyTitle && emptyCopy) {
        if (query) {
          emptyTitle.textContent = "No matching gallery cards";
          emptyCopy.textContent =
            "Try another title, category, location, or year.";
        } else if (currentFilter === "published") {
          emptyTitle.textContent = "No published gallery cards";
          emptyCopy.textContent =
            "Publish a card to make it available in the public Online Gallery.";
        } else if (currentFilter === "draft") {
          emptyTitle.textContent = "No draft gallery cards";
          emptyCopy.textContent =
            "Every gallery card is currently published.";
        } else if (currentFilter === "archived") {
          emptyTitle.textContent = "No archived gallery cards";
          emptyCopy.textContent =
            "Archived cards will remain available here for restoration.";
        } else {
          emptyTitle.textContent = "No gallery cards yet";
          emptyCopy.textContent =
            "Create the first visual record for the public Online Gallery.";
        }
      }
    }

    filterButtons.forEach(function (button) {
      button.addEventListener("click", function () {
        var nextFilter = button.getAttribute("data-gallery-filter-button");
        currentFilter = filterCopy[nextFilter] ? nextFilter : "all";
        root.setAttribute("data-gallery-filter", currentFilter);
        applyGalleryView();
      });
    });

    if (searchInput) {
      searchInput.addEventListener("input", applyGalleryView);
      searchInput.addEventListener("keydown", function (event) {
        if (event.key === "Escape" && searchInput.value) {
          searchInput.value = "";
          applyGalleryView();
        }
      });
    }

    if (clearButton && searchInput) {
      clearButton.addEventListener("click", function () {
        searchInput.value = "";
        applyGalleryView();
        searchInput.focus();
      });
    }

    applyGalleryView();
  }

  function initAdminGalleryView() {
    var root = document.querySelector(".admin-gallery-view");
    if (!root) {
      return;
    }

    var buttons = Array.prototype.slice.call(
      root.querySelectorAll("[data-gallery-view-media-tab]")
    );
    var panels = Array.prototype.slice.call(
      root.querySelectorAll("[data-gallery-view-media-panel]")
    );
    var modelViewer = root.querySelector("[data-gallery-view-model]");
    var modelFallback = root.querySelector("[data-gallery-view-model-fallback]");
    var modelRetry = root.querySelector("[data-gallery-view-model-retry]");
    var modelSource = modelViewer
      ? String(modelViewer.getAttribute("data-model-src") || "").trim()
      : "";
    var modelFailed = false;

    function loadModelPreview(forceReload) {
      if (!modelViewer || !modelSource) {
        return;
      }

      modelViewer.hidden = false;
      if (modelFallback) {
        modelFallback.hidden = true;
      }

      if (modelFailed && !forceReload) {
        modelViewer.hidden = true;
        if (modelFallback) {
          modelFallback.hidden = false;
        }
        return;
      }
      if (forceReload) {
        modelFailed = false;
      }

      var currentSource = String(modelViewer.getAttribute("src") || "").trim();
      if (currentSource && !forceReload) {
        return;
      }

      modelViewer.removeAttribute("src");
      window.requestAnimationFrame(function () {
        modelViewer.setAttribute("src", modelSource);
      });
    }

    function setGalleryMedia(media) {
      buttons.forEach(function (item) {
        var active =
          item.getAttribute("data-gallery-view-media-tab") === media;
        item.classList.toggle("is-active", active);
        item.setAttribute("aria-selected", active ? "true" : "false");
      });
      panels.forEach(function (panel) {
        panel.hidden =
          panel.getAttribute("data-gallery-view-media-panel") !== media;
      });
      if (media === "model") {
        loadModelPreview(false);
      }
    }

    buttons.forEach(function (button) {
      button.addEventListener("click", function () {
        var media = button.getAttribute("data-gallery-view-media-tab");
        setGalleryMedia(media);
      });
    });

    if (modelViewer) {
      modelViewer.addEventListener("load", function () {
        modelFailed = false;
        modelViewer.hidden = false;
        if (modelFallback) {
          modelFallback.hidden = true;
        }
      });
      modelViewer.addEventListener("error", function (event) {
        modelFailed = true;
        modelViewer.hidden = true;
        if (modelFallback) {
          modelFallback.hidden = false;
        }
        console.warn(
          "[Admin gallery] The stored GLB could not be rendered.",
          event && event.detail ? event.detail : modelSource
        );
      });
    }
    if (modelRetry) {
      modelRetry.addEventListener("click", function () {
        loadModelPreview(true);
      });
    }
  }

  function initAdminEduResourceManagement() {
    var root = document.querySelector("[data-admin-edu-manager]");
    if (!root) {
      return;
    }

    var cards = Array.prototype.slice.call(root.querySelectorAll("[data-edu-card]"));
    var filterButtons = Array.prototype.slice.call(
      root.querySelectorAll("[data-edu-filter-button]")
    );
    var searchInput = root.querySelector("#adminEduSearch");
    var clearButton = root.querySelector("[data-edu-search-clear]");
    var visibleCount = root.querySelector("[data-edu-visible-count]");
    var libraryTitle = root.querySelector("[data-edu-library-title]");
    var libraryDescription = root.querySelector("[data-edu-library-description]");
    var emptyState = root.querySelector("[data-edu-empty]");
    var emptyTitle = root.querySelector("[data-edu-empty-title]");
    var emptyCopy = root.querySelector("[data-edu-empty-copy]");
    var currentFilter = String(root.getAttribute("data-edu-filter") || "all").toLowerCase();

    var filterCopy = {
      all: {
        title: "Complete collection",
        description: "Every active, draft, and archived educational resource",
      },
      active: {
        title: "Public learning collection",
        description: "Resources currently visible to visitors and educators",
      },
      draft: {
        title: "Draft workspace",
        description: "Learning materials still being prepared",
      },
      archived: {
        title: "Resource archive",
        description: "Hidden materials retained for future restoration",
      },
    };

    function normalize(value) {
      return String(value || "").trim().toLowerCase();
    }

    function applyResourceView() {
      var query = normalize(searchInput && searchInput.value);
      var shown = 0;

      cards.forEach(function (card) {
        var statusMatches =
          currentFilter === "all" ||
          card.getAttribute("data-edu-status") === currentFilter;
        var searchMatches =
          !query ||
          normalize(card.getAttribute("data-edu-search")).indexOf(query) !== -1;
        var shouldShow = statusMatches && searchMatches;
        card.hidden = !shouldShow;
        if (shouldShow) {
          shown += 1;
        }
      });

      filterButtons.forEach(function (button) {
        var isActive =
          button.getAttribute("data-edu-filter-button") === currentFilter;
        button.classList.toggle("is-active", isActive);
        button.setAttribute("aria-pressed", isActive ? "true" : "false");
      });

      var copy = filterCopy[currentFilter] || filterCopy.all;
      if (libraryTitle) {
        libraryTitle.textContent = copy.title;
      }
      if (libraryDescription) {
        libraryDescription.textContent = copy.description;
      }
      if (visibleCount) {
        visibleCount.textContent =
          shown + " resource" + (shown === 1 ? "" : "s");
      }
      if (clearButton) {
        clearButton.hidden = !query;
      }
      if (emptyState) {
        emptyState.hidden = shown > 0;
      }

      if (shown === 0 && emptyTitle && emptyCopy) {
        if (query) {
          emptyTitle.textContent = "No matching educational resources";
          emptyCopy.textContent =
            "Try another title, category, grade, topic, author, or source.";
        } else if (currentFilter === "active") {
          emptyTitle.textContent = "No active educational resources";
          emptyCopy.textContent =
            "Activate a draft to make it available in the public collection.";
        } else if (currentFilter === "draft") {
          emptyTitle.textContent = "No draft educational resources";
          emptyCopy.textContent =
            "Every learning material is currently active or archived.";
        } else if (currentFilter === "archived") {
          emptyTitle.textContent = "No archived educational resources";
          emptyCopy.textContent =
            "Archived materials will remain available here for restoration.";
        } else {
          emptyTitle.textContent = "No educational resources yet";
          emptyCopy.textContent =
            "Create the first book or downloadable learning material.";
        }
      }
    }

    filterButtons.forEach(function (button) {
      button.addEventListener("click", function () {
        var nextFilter = button.getAttribute("data-edu-filter-button");
        currentFilter = filterCopy[nextFilter] ? nextFilter : "all";
        root.setAttribute("data-edu-filter", currentFilter);
        applyResourceView();
      });
    });

    if (searchInput) {
      searchInput.addEventListener("input", applyResourceView);
      searchInput.addEventListener("keydown", function (event) {
        if (event.key === "Escape" && searchInput.value) {
          searchInput.value = "";
          applyResourceView();
        }
      });
    }
    if (clearButton && searchInput) {
      clearButton.addEventListener("click", function () {
        searchInput.value = "";
        applyResourceView();
        searchInput.focus();
      });
    }

    applyResourceView();
  }

  function initAdminSubmissionManagement() {
    var root = document.querySelector("[data-admin-submission-manager]");
    if (!root) {
      return;
    }

    var cards = Array.prototype.slice.call(
      root.querySelectorAll("[data-submission-card]")
    );
    var filterButtons = Array.prototype.slice.call(
      root.querySelectorAll("[data-submission-filter-button]")
    );
    var searchInput = root.querySelector("#adminSubmissionSearch");
    var clearButton = root.querySelector("[data-submission-search-clear]");
    var visibleCount = root.querySelector("[data-submission-visible-count]");
    var libraryTitle = root.querySelector("[data-submission-library-title]");
    var libraryDescription = root.querySelector(
      "[data-submission-library-description]"
    );
    var emptyState = root.querySelector("[data-submission-empty]");
    var emptyTitle = root.querySelector("[data-submission-empty-title]");
    var emptyCopy = root.querySelector("[data-submission-empty-copy]");
    var currentFilter = String(
      root.getAttribute("data-submission-filter") || "all"
    ).toLowerCase();

    var filterCopy = {
      all: {
        title: "Complete submission record",
        description:
          "Every pending, published, archived, and legacy unverified entry",
      },
      pending_review: {
        title: "Pending review queue",
        description:
          "Verified contributions waiting for an administrator's decision",
      },
      active: {
        title: "Published contributions",
        description:
          "Approved entries currently visible in Educational Resources",
      },
      archived: {
        title: "Submission archive",
        description:
          "Rejected or withdrawn entries retained for future reference",
      },
      pending_verification: {
        title: "Legacy unverified entries",
        description:
          "Older submissions that did not complete email verification",
      },
    };

    function normalize(value) {
      return String(value || "").trim().toLowerCase();
    }

    function applySubmissionView() {
      var query = normalize(searchInput && searchInput.value);
      var shown = 0;

      cards.forEach(function (card) {
        var statusMatches =
          currentFilter === "all" ||
          card.getAttribute("data-submission-status") === currentFilter;
        var searchMatches =
          !query ||
          normalize(card.getAttribute("data-submission-search")).indexOf(query) !==
            -1;
        var shouldShow = statusMatches && searchMatches;
        card.hidden = !shouldShow;
        if (shouldShow) {
          shown += 1;
        }
      });

      filterButtons.forEach(function (button) {
        var isActive =
          button.getAttribute("data-submission-filter-button") === currentFilter;
        button.classList.toggle("is-active", isActive);
        button.setAttribute("aria-pressed", isActive ? "true" : "false");
      });

      var copy = filterCopy[currentFilter] || filterCopy.all;
      if (libraryTitle) {
        libraryTitle.textContent = copy.title;
      }
      if (libraryDescription) {
        libraryDescription.textContent = copy.description;
      }
      if (visibleCount) {
        visibleCount.textContent =
          shown + " submission" + (shown === 1 ? "" : "s");
      }
      if (clearButton) {
        clearButton.hidden = !query;
      }
      if (emptyState) {
        emptyState.hidden = shown > 0;
      }

      if (shown === 0 && emptyTitle && emptyCopy) {
        if (query) {
          emptyTitle.textContent = "No matching participation submissions";
          emptyCopy.textContent =
            "Try another title, contributor, type, grade, category, or topic.";
        } else if (currentFilter === "pending_review") {
          emptyTitle.textContent = "The review queue is clear";
          emptyCopy.textContent =
            "New verified community contributions will appear here.";
        } else if (currentFilter === "active") {
          emptyTitle.textContent = "No published submissions";
          emptyCopy.textContent =
            "Approved community contributions will appear here.";
        } else if (currentFilter === "archived") {
          emptyTitle.textContent = "No archived submissions";
          emptyCopy.textContent =
            "Rejected or withdrawn entries will be retained here.";
        } else if (currentFilter === "pending_verification") {
          emptyTitle.textContent = "No unverified submissions";
          emptyCopy.textContent =
            "There are no legacy entries awaiting email verification.";
        } else {
          emptyTitle.textContent = "No participation submissions yet";
          emptyCopy.textContent =
            "Teacher Corner materials and community stories will appear here.";
        }
      }
    }

    filterButtons.forEach(function (button) {
      button.addEventListener("click", function () {
        var nextFilter = button.getAttribute("data-submission-filter-button");
        currentFilter = filterCopy[nextFilter] ? nextFilter : "all";
        root.setAttribute("data-submission-filter", currentFilter);
        applySubmissionView();
      });
    });

    if (searchInput) {
      searchInput.addEventListener("input", applySubmissionView);
      searchInput.addEventListener("keydown", function (event) {
        if (event.key === "Escape" && searchInput.value) {
          searchInput.value = "";
          applySubmissionView();
        }
      });
    }

    if (clearButton && searchInput) {
      clearButton.addEventListener("click", function () {
        searchInput.value = "";
        applySubmissionView();
        searchInput.focus();
      });
    }

    applySubmissionView();
  }

  function initAdminFeedbackManagement() {
    var root = document.querySelector("[data-admin-feedback-manager]");
    if (!root) {
      return;
    }

    var cards = Array.prototype.slice.call(
      root.querySelectorAll("[data-feedback-card]")
    );
    var filterButtons = Array.prototype.slice.call(
      root.querySelectorAll("[data-feedback-filter-button]")
    );
    var searchInput = root.querySelector("#adminFeedbackSearch");
    var clearButton = root.querySelector("[data-feedback-search-clear]");
    var visibleCount = root.querySelector("[data-feedback-visible-count]");
    var libraryTitle = root.querySelector("[data-feedback-library-title]");
    var libraryDescription = root.querySelector(
      "[data-feedback-library-description]"
    );
    var emptyState = root.querySelector("[data-feedback-empty]");
    var emptyTitle = root.querySelector("[data-feedback-empty-title]");
    var emptyCopy = root.querySelector("[data-feedback-empty-copy]");
    var currentFilter = String(
      root.getAttribute("data-feedback-filter") || "all"
    ).toLowerCase();

    var filterCopy = {
      all: {
        title: "Complete feedback record",
        description: "Every new, reviewed, and archived visitor response",
      },
      new: {
        title: "Pending review queue",
        description: "Fresh visitor responses awaiting an administrator's review",
      },
      reviewed: {
        title: "Reviewed feedback",
        description: "Visitor responses already checked by an administrator",
      },
      archived: {
        title: "Feedback archive",
        description: "Historical responses retained outside the active review record",
      },
    };

    function normalize(value) {
      return String(value || "").trim().toLowerCase();
    }

    function applyFeedbackView() {
      var query = normalize(searchInput && searchInput.value);
      var shown = 0;

      cards.forEach(function (card) {
        var statusMatches =
          currentFilter === "all" ||
          card.getAttribute("data-feedback-status") === currentFilter;
        var searchMatches =
          !query ||
          normalize(card.getAttribute("data-feedback-search")).indexOf(query) !==
            -1;
        var shouldShow = statusMatches && searchMatches;
        card.hidden = !shouldShow;
        if (shouldShow) {
          shown += 1;
        }
      });

      filterButtons.forEach(function (button) {
        var isActive =
          button.getAttribute("data-feedback-filter-button") === currentFilter;
        button.classList.toggle("is-active", isActive);
        button.setAttribute("aria-pressed", isActive ? "true" : "false");
      });

      var copy = filterCopy[currentFilter] || filterCopy.all;
      if (libraryTitle) {
        libraryTitle.textContent = copy.title;
      }
      if (libraryDescription) {
        libraryDescription.textContent = copy.description;
      }
      if (visibleCount) {
        visibleCount.textContent =
          shown + " response" + (shown === 1 ? "" : "s");
      }
      if (clearButton) {
        clearButton.hidden = !query;
      }
      if (emptyState) {
        emptyState.hidden = shown > 0;
      }

      if (shown === 0 && emptyTitle && emptyCopy) {
        if (query) {
          emptyTitle.textContent = "No matching visitor feedback";
          emptyCopy.textContent =
            "Try another visitor name, comment, visit channel, rating, or status.";
        } else if (currentFilter === "new") {
          emptyTitle.textContent = "The feedback queue is clear";
          emptyCopy.textContent =
            "New visitor responses will appear here for review.";
        } else if (currentFilter === "reviewed") {
          emptyTitle.textContent = "No reviewed feedback";
          emptyCopy.textContent =
            "Responses marked as reviewed will appear here.";
        } else if (currentFilter === "archived") {
          emptyTitle.textContent = "No archived feedback";
          emptyCopy.textContent =
            "Archived visitor responses will be retained here.";
        } else {
          emptyTitle.textContent = "No visitor feedback yet";
          emptyCopy.textContent =
            "Visitor responses will appear here after signed-in visitors share their experience.";
        }
      }
    }

    filterButtons.forEach(function (button) {
      button.addEventListener("click", function () {
        var nextFilter = button.getAttribute("data-feedback-filter-button");
        currentFilter = filterCopy[nextFilter] ? nextFilter : "all";
        root.setAttribute("data-feedback-filter", currentFilter);
        applyFeedbackView();
      });
    });

    if (searchInput) {
      searchInput.addEventListener("input", applyFeedbackView);
      searchInput.addEventListener("keydown", function (event) {
        if (event.key === "Escape" && searchInput.value) {
          searchInput.value = "";
          applyFeedbackView();
        }
      });
    }

    if (clearButton && searchInput) {
      clearButton.addEventListener("click", function () {
        searchInput.value = "";
        applyFeedbackView();
        searchInput.focus();
      });
    }

    applyFeedbackView();
  }

  function initAdminUserManagement() {
    var root = document.querySelector("[data-admin-users]");
    if (!root) {
      return;
    }

    var rows = Array.prototype.slice.call(root.querySelectorAll("[data-user-row]"));
    var filterLinks = Array.prototype.slice.call(root.querySelectorAll("[data-users-filter]"));
    var searchForm = root.querySelector(".admin-users-search-form");
    var searchInput = root.querySelector("#adminUsersSearch");
    var clearSearch = root.querySelector("[data-users-clear-search]");
    var filterInput = searchForm && searchForm.querySelector('input[name="filter"]');
    var emptyRow = root.querySelector("[data-users-empty-row]");
    var emptyTitle = root.querySelector("[data-users-empty-title]");
    var emptyCopy = root.querySelector("[data-users-empty-copy]");
    var notice = root.querySelector("[data-admin-users-notice]");
    var dataElement = document.getElementById("adminUsersData");
    var detailModal = document.querySelector("[data-user-detail-modal]");
    var detailName = detailModal && detailModal.querySelector("[data-user-detail-name]");
    var detailUsername = detailModal && detailModal.querySelector("[data-user-detail-username]");
    var detailAvatar = detailModal && detailModal.querySelector("[data-user-detail-avatar]");
    var detailStatus = detailModal && detailModal.querySelector("[data-user-detail-status]");
    var detailFullLink = detailModal && detailModal.querySelector("[data-user-detail-full-link]");
    var detailCloseButtons = detailModal
      ? Array.prototype.slice.call(detailModal.querySelectorAll("[data-user-detail-close]"))
      : [];
    var usersById = {};
    var currentFilter = String(root.getAttribute("data-current-filter") || "all").toLowerCase();
    var noticeTimer = 0;
    var detailCloseTimer = 0;
    var detailPreviousFocus = null;
    var openDetailUserId = "";

    try {
      var userData = JSON.parse((dataElement && dataElement.textContent) || "[]");
      if (Array.isArray(userData)) {
        userData.forEach(function (user) {
          if (user && user.id != null) {
            usersById[String(user.id)] = user;
          }
        });
      }
    } catch (error) {
      console.error("Failed to parse administrator user data.", error);
    }

    function normalize(value) {
      return String(value || "").trim().toLowerCase();
    }

    function getQuery() {
      return normalize(searchInput && searchInput.value);
    }

    function updateAddress(mode) {
      if (!window.history || typeof window.history.replaceState !== "function") {
        return;
      }

      var url = new URL(window.location.href);
      url.searchParams.set("filter", currentFilter);
      var query = String((searchInput && searchInput.value) || "").trim();
      if (query) {
        url.searchParams.set("q", query);
      } else {
        url.searchParams.delete("q");
      }
      var method = mode === "push" ? "pushState" : "replaceState";
      window.history[method]({ filter: currentFilter, q: query }, "", url.pathname + url.search + url.hash);
    }

    function refreshCounts() {
      var activeCount = rows.filter(function (row) {
        return row.getAttribute("data-user-status") === "active";
      }).length;
      var deactivatedCount = rows.length - activeCount;
      var values = {
        all: rows.length,
        active: activeCount,
        deactivated: deactivatedCount,
      };

      Object.keys(values).forEach(function (key) {
        var summary = root.querySelector("[data-users-" + (key === "all" ? "total" : key) + "-count]");
        var filterCount = root.querySelector('[data-users-filter-count="' + key + '"]');
        if (summary) {
          summary.textContent = String(values[key]);
        }
        if (filterCount) {
          filterCount.textContent = String(values[key]);
        }
      });
    }

    function applyFilters(options) {
      var query = getQuery();
      var visibleCount = 0;

      rows.forEach(function (row) {
        var statusMatches = currentFilter === "all" || row.getAttribute("data-user-status") === currentFilter;
        var searchMatches = !query || normalize(row.getAttribute("data-user-search")).indexOf(query) !== -1;
        var isVisible = statusMatches && searchMatches;
        row.hidden = !isVisible;
        if (isVisible) {
          visibleCount += 1;
        }
      });

      filterLinks.forEach(function (link) {
        var isActive = link.getAttribute("data-users-filter") === currentFilter;
        link.classList.toggle("is-active", isActive);
        if (isActive) {
          link.setAttribute("aria-current", "page");
        } else {
          link.removeAttribute("aria-current");
        }
      });

      if (filterInput) {
        filterInput.value = currentFilter;
      }

      if (clearSearch) {
        clearSearch.hidden = !query;
      }

      if (emptyRow) {
        emptyRow.hidden = visibleCount > 0;
      }
      if (emptyTitle) {
        emptyTitle.textContent = rows.length ? "No matching accounts" : "No registered accounts yet";
      }
      if (emptyCopy) {
        emptyCopy.textContent = rows.length
          ? "Try a different search or status filter."
          : "Visitor sign-ups will appear here.";
      }

      if (!options || options.updateUrl !== false) {
        updateAddress(options && options.historyMode);
      }
    }

    function showNotice(text, kind) {
      if (!notice) {
        return;
      }
      if (noticeTimer) {
        window.clearTimeout(noticeTimer);
      }
      notice.textContent = String(text || "");
      notice.classList.toggle("is-error", kind === "error");
      notice.hidden = false;
      noticeTimer = window.setTimeout(function () {
        notice.hidden = true;
        noticeTimer = 0;
      }, 5000);
    }

    function setDetailText(fieldName, value) {
      if (!detailModal) {
        return;
      }
      var target = detailModal.querySelector('[data-user-detail-field="' + fieldName + '"]');
      if (target) {
        target.textContent = String(value || "—");
      }
    }

    function renderDetail(user, fallbackHref) {
      if (!detailModal || !user) {
        return false;
      }

      openDetailUserId = String(user.id);
      detailName.textContent = String(user.display_name || user.username || "Unnamed user");
      detailUsername.textContent = user.username ? "@" + user.username : "No username";
      detailAvatar.textContent = String(user.display_name || user.username || "U").charAt(0).toUpperCase();
      detailStatus.textContent = user.is_active ? "Active" : "Deactivated";
      detailStatus.classList.toggle("is-published", Boolean(user.is_active));
      detailStatus.classList.toggle("is-cancelled", !user.is_active);
      detailFullLink.href = fallbackHref || "/_admin/users/" + encodeURIComponent(user.id);

      setDetailText("email", user.email);
      setDetailText("phone_display", user.phone_display);
      setDetailText("organization_display", user.organization_display);
      setDetailText("roles_display", user.roles_display);
      setDetailText("use_case_display", user.use_case_display);
      setDetailText("location_display", user.location_display);
      setDetailText("auth_provider_label", user.auth_provider_label);
      setDetailText(
        "verification_display",
        String(user.verified_label || "Unverified") + " · " + String(user.display_verified_at || "Not verified")
      );
      setDetailText("onboarding_label", user.onboarding_label);
      setDetailText("display_created", user.display_created);
      setDetailText("display_last_login", user.display_last_login);
      setDetailText("display_updated", user.display_updated);

      if (detailCloseTimer) {
        window.clearTimeout(detailCloseTimer);
        detailCloseTimer = 0;
      }
      detailPreviousFocus = document.activeElement;
      detailModal.hidden = false;
      detailModal.setAttribute("aria-hidden", "false");
      document.body.classList.add("admin-user-detail-open");
      window.requestAnimationFrame(function () {
        detailModal.classList.add("is-open");
        if (detailCloseButtons[0]) {
          detailCloseButtons[0].focus();
        }
      });
      return true;
    }

    function closeDetail() {
      if (!detailModal || detailModal.hidden) {
        return;
      }
      detailModal.classList.remove("is-open");
      detailModal.setAttribute("aria-hidden", "true");
      document.body.classList.remove("admin-user-detail-open");
      openDetailUserId = "";
      detailCloseTimer = window.setTimeout(function () {
        detailModal.hidden = true;
        detailCloseTimer = 0;
      }, 180);
      if (detailPreviousFocus && typeof detailPreviousFocus.focus === "function") {
        detailPreviousFocus.focus();
      }
      detailPreviousFocus = null;
    }

    function updateActionForm(form, user) {
      var isActive = Boolean(user.is_active);
      var button = form.querySelector('button[type="submit"]');
      var name = String(user.display_name || user.username || "this user");
      if (!button) {
        return;
      }

      form.setAttribute("data-confirm-title", isActive ? "Disable this account?" : "Enable this account?");
      form.setAttribute(
        "data-confirm-message",
        isActive
          ? "Disable " + name + "? This account will immediately lose access to the public site."
          : "Enable " + name + "? This account will be allowed to sign in to the public site again."
      );
      form.setAttribute("data-confirm-label", isActive ? "Disable account" : "Enable account");
      form.setAttribute("data-confirm-variant", isActive ? "disable" : "enable");
      button.value = isActive ? "deactivate" : "activate";
      button.classList.toggle("is-disable", isActive);
      button.classList.toggle("is-enable", !isActive);
      button.setAttribute("aria-label", (isActive ? "Disable " : "Enable ") + name);
      var label = button.querySelector("span");
      if (label) {
        label.textContent = isActive ? "Disable" : "Enable";
      }
      var icon = button.querySelector("svg");
      if (icon) {
        icon.innerHTML = isActive
          ? '<path d="M12 2a10 10 0 1 0 10 10A10 10 0 0 0 12 2Zm0 2a8 8 0 0 1 5.2 14.08L5.92 6.8A7.94 7.94 0 0 1 12 4Zm-8 8a7.94 7.94 0 0 1 .8-3.48L15.48 19.2A8 8 0 0 1 4 12Z"></path>'
          : '<path d="m9.2 16.6-4.1-4.1 1.4-1.4 2.7 2.7 7.9-7.9 1.4 1.4Z"></path>';
      }
    }

    filterLinks.forEach(function (link) {
      link.addEventListener("click", function (event) {
        event.preventDefault();
        currentFilter = String(link.getAttribute("data-users-filter") || "all");
        applyFilters({ historyMode: "push" });
      });
    });

    if (searchInput) {
      searchInput.addEventListener("input", function () {
        applyFilters({ historyMode: "replace" });
      });
      searchInput.addEventListener("keydown", function (event) {
        if (event.key === "Escape" && searchInput.value) {
          searchInput.value = "";
          applyFilters({ historyMode: "replace" });
        }
      });
    }

    if (searchForm) {
      searchForm.addEventListener("submit", function (event) {
        event.preventDefault();
        applyFilters({ historyMode: "replace" });
      });
    }

    if (clearSearch) {
      clearSearch.addEventListener("click", function (event) {
        event.preventDefault();
        if (searchInput) {
          searchInput.value = "";
          searchInput.focus();
        }
        applyFilters({ historyMode: "replace" });
      });
    }

    Array.prototype.slice.call(root.querySelectorAll("[data-user-view]")).forEach(function (link) {
      link.addEventListener("click", function (event) {
        var user = usersById[String(link.getAttribute("data-user-view") || "")];
        if (user && renderDetail(user, link.href)) {
          event.preventDefault();
        }
      });
    });

    Array.prototype.slice.call(root.querySelectorAll("[data-async-user-action]")).forEach(function (form) {
      form.addEventListener("submit", function (event) {
        if (typeof window.fetch !== "function" || typeof window.FormData !== "function") {
          return;
        }

        event.preventDefault();
        if (form.getAttribute("aria-busy") === "true") {
          return;
        }

        var submitter = event.submitter || form.querySelector('button[type="submit"]');
        var formData = new FormData(form);
        if (submitter && submitter.name) {
          formData.set(submitter.name, submitter.value);
        }
        form.setAttribute("aria-busy", "true");
        if (submitter) {
          submitter.disabled = true;
        }

        fetch(form.action, {
          method: "POST",
          body: formData,
          credentials: "same-origin",
          headers: {
            "X-Requested-With": "XMLHttpRequest",
            "Accept": "application/json",
          },
        })
          .then(function (response) {
            return response.json().catch(function () {
              return {};
            }).then(function (payload) {
              if (!response.ok || !payload.ok) {
                throw new Error(payload.error || "Could not update this account right now.");
              }
              return payload;
            });
          })
          .then(function (payload) {
            var userId = String(payload.user_id || form.getAttribute("data-user-action-form") || "");
            var user = usersById[userId];
            var row = root.querySelector('[data-user-row][data-user-id="' + userId + '"]');
            if (!user || !row) {
              throw new Error("The account was updated, but its row could not be refreshed.");
            }

            user.is_active = Boolean(payload.is_active);
            user.status_label = String(payload.status_label || (user.is_active ? "Active" : "Deactivated"));
            row.setAttribute("data-user-status", user.is_active ? "active" : "deactivated");
            var badge = row.querySelector("[data-user-status-badge]");
            if (badge) {
              badge.textContent = user.status_label;
              badge.classList.toggle("is-published", user.is_active);
              badge.classList.toggle("is-cancelled", !user.is_active);
            }
            updateActionForm(form, user);
            refreshCounts();
            applyFilters({ historyMode: "replace" });

            if (openDetailUserId === userId && detailStatus) {
              detailStatus.textContent = user.status_label;
              detailStatus.classList.toggle("is-published", user.is_active);
              detailStatus.classList.toggle("is-cancelled", !user.is_active);
            }
            showNotice(payload.message || "The account access was updated.", "success");
          })
          .catch(function (error) {
            showNotice(error.message || "Could not update this account right now.", "error");
          })
          .then(function () {
            form.removeAttribute("aria-busy");
            if (submitter) {
              submitter.disabled = false;
            }
          });
      });
    });

    detailCloseButtons.forEach(function (button) {
      button.addEventListener("click", closeDetail);
    });
    if (detailModal) {
      detailModal.addEventListener("click", function (event) {
        if (event.target === detailModal) {
          closeDetail();
        }
      });
      detailModal.addEventListener("keydown", function (event) {
        if (event.key === "Escape") {
          event.preventDefault();
          closeDetail();
          return;
        }

        if (event.key === "Tab") {
          var focusable = Array.prototype.slice.call(
            detailModal.querySelectorAll('a[href], button:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"])')
          ).filter(function (element) {
            return !element.hidden && element.offsetParent !== null;
          });
          if (!focusable.length) {
            return;
          }
          var first = focusable[0];
          var last = focusable[focusable.length - 1];
          if (event.shiftKey && document.activeElement === first) {
            event.preventDefault();
            last.focus();
          } else if (!event.shiftKey && document.activeElement === last) {
            event.preventDefault();
            first.focus();
          }
        }
      });
    }

    window.addEventListener("popstate", function () {
      var params = new URLSearchParams(window.location.search);
      var nextFilter = normalize(params.get("filter") || "all");
      currentFilter = ["all", "active", "deactivated"].indexOf(nextFilter) !== -1 ? nextFilter : "all";
      if (searchInput) {
        searchInput.value = String(params.get("q") || "");
      }
      applyFilters({ updateUrl: false });
    });

    refreshCounts();
    applyFilters({ updateUrl: false });
  }

  function initAdminHighlightEditor() {
    var editor = document.querySelector("[data-highlight-editor]");
    if (!editor) {
      return;
    }

    var languageButtons = Array.prototype.slice.call(
      editor.querySelectorAll("[data-highlight-editor-lang]")
    );
    var languagePanels = Array.prototype.slice.call(
      editor.querySelectorAll("[data-highlight-editor-lang-panel]")
    );
    var languageLabels = Array.prototype.slice.call(
      editor.querySelectorAll("[data-highlight-editor-language-label]")
    );
    var statusSelect = editor.querySelector("[data-highlight-editor-status]");
    var visibility = editor.querySelector("[data-highlight-editor-visibility]");
    var visibilityText = editor.querySelector("[data-highlight-editor-visibility-text]");
    var visibilityPath = editor.querySelector("[data-highlight-editor-visibility-icon]");
    var titleInput = editor.querySelector("[data-highlight-editor-title]");
    var fallbackLetter = editor.querySelector("[data-highlight-editor-fallback-letter]");
    var categoryInput = editor.querySelector("[data-highlight-editor-category]");
    var dateInput = editor.querySelector("[data-highlight-editor-date]");
    var imageInput = editor.querySelector("[data-highlight-editor-image-input]");
    var imagePreview = editor.querySelector("[data-highlight-editor-image-preview]");
    var imageFallback = editor.querySelector("[data-highlight-editor-image-fallback]");
    var imageLibrary = editor.querySelector("[data-highlight-editor-image-library]");
    var imageGrid = editor.querySelector("[data-highlight-editor-image-grid]");
    var imageCount = editor.querySelector("[data-highlight-editor-image-count]");
    var imageEmpty = editor.querySelector("[data-highlight-editor-image-empty]");
    var imageFeedback = editor.querySelector("[data-highlight-editor-image-feedback]");
    var removalInputs = editor.querySelector("[data-highlight-editor-removal-inputs]");
    var uploadSizeLabel = editor.querySelector("[data-highlight-editor-upload-size]");
    var uploadMeter = editor.querySelector("[data-highlight-editor-upload-meter]");
    var uploadMeterBar = editor.querySelector("[data-highlight-editor-upload-meter-bar]");
    var saveNotice = document.querySelector("[data-highlight-editor-save-notice]");
    var saveNoticeTitle = saveNotice && saveNotice.querySelector("[data-highlight-editor-save-title]");
    var saveNoticeDetail = saveNotice && saveNotice.querySelector("[data-highlight-editor-save-detail]");
    var readTime = editor.querySelector("[data-highlight-editor-read-time]");
    var copyFields = Array.prototype.slice.call(
      editor.querySelectorAll("[data-highlight-editor-copy]")
    );
    var activeLanguage = "en";
    var selectedImageFiles = [];
    var previewObjectUrls = [];
    var maxImages = Math.max(
      1,
      parseInt((imageLibrary && imageLibrary.getAttribute("data-highlight-editor-max-images")) || "12", 10) || 12
    );
    var maxUploadBytes = Math.max(
      1,
      parseInt((imageLibrary && imageLibrary.getAttribute("data-highlight-editor-max-upload-bytes")) || "26214400", 10) || 26214400
    );

    var visibilityStates = {
      active: {
        className: "is-active",
        text: "Visible on the public site",
        path: "M12 5c5.5 0 9.5 5.4 9.5 7s-4 7-9.5 7S2.5 13.6 2.5 12 6.5 5 12 5Zm0 2C8.2 7 5.2 10.3 4.6 12c.6 1.7 3.6 5 7.4 5s6.8-3.3 7.4-5c-.6-1.7-3.6-5-7.4-5Zm0 2a3 3 0 1 1 0 6 3 3 0 0 1 0-6Z",
      },
      draft: {
        className: "is-draft",
        text: "Draft and hidden",
        path: "M5 3h10l4 4v14H5Zm2 2v14h10V8h-3V5Zm2 7h6v2H9Zm0 4h6v2H9Z",
      },
      archived: {
        className: "is-archived",
        text: "Archived and hidden",
        path: "M3 4h18v5H3Zm2 2v1h14V6Zm1 5h12v9H6Zm4 2v2h4v-2Z",
      },
    };

    function setLanguage(language) {
      activeLanguage = language === "tl" ? "tl" : "en";
      languageButtons.forEach(function (button) {
        var isActive = button.getAttribute("data-highlight-editor-lang") === activeLanguage;
        button.classList.toggle("is-active", isActive);
        button.setAttribute("aria-pressed", isActive ? "true" : "false");
      });
      languagePanels.forEach(function (panel) {
        var isActive = panel.getAttribute("data-highlight-editor-lang-panel") === activeLanguage;
        panel.hidden = !isActive;
        if (isActive) {
          Array.prototype.slice.call(
            panel.querySelectorAll("[data-highlight-editor-copy]")
          ).forEach(resizeCopyField);
        }
      });
      languageLabels.forEach(function (label) {
        var section = label.closest(".admin-highlight-editor-section");
        var isShort = Boolean(section && section.querySelector('[data-highlight-editor-copy="short"]'));
        label.textContent =
          (activeLanguage === "tl" ? "Tagalog " : "English ") +
          (isShort ? "short description" : "full description");
      });
      updateReadTime();
    }

    function updateVisibility() {
      if (!statusSelect || !visibility) {
        return;
      }
      var state = visibilityStates[statusSelect.value] || visibilityStates.draft;
      visibility.classList.remove("is-active", "is-draft", "is-archived");
      visibility.classList.add(state.className);
      if (visibilityText) {
        visibilityText.textContent = state.text;
      }
      if (visibilityPath) {
        visibilityPath.setAttribute("d", state.path);
      }
    }

    function updateFallbackLetter() {
      if (!fallbackLetter || !titleInput) {
        return;
      }
      var title = String(titleInput.value || "").trim();
      fallbackLetter.textContent = (title.charAt(0) || "C").toUpperCase();
      if (imagePreview) {
        imagePreview.alt = title ? title + " image preview" : "Community highlight image preview";
      }
    }

    function updateCategory() {
      if (!categoryInput) {
        return;
      }
      Array.prototype.slice.call(
        editor.querySelectorAll('[data-highlight-editor-output="category"]')
      ).forEach(function (output) {
        output.textContent = categoryInput.value;
      });
    }

    function updateDate() {
      var value = dateInput && dateInput.value;
      var label = "Select a date";
      if (value) {
        var parsed = new Date(value + "T00:00:00");
        if (!Number.isNaN(parsed.getTime())) {
          label = parsed.toLocaleDateString("en-US", {
            month: "long",
            day: "numeric",
            year: "numeric",
          });
        }
      }
      Array.prototype.slice.call(
        editor.querySelectorAll('[data-highlight-editor-output="date"]')
      ).forEach(function (output) {
        output.textContent = label;
      });
    }

    function updateReadTime() {
      if (!readTime) {
        return;
      }
      var activeLong = editor.querySelector(
        '[data-highlight-editor-lang-panel="' + activeLanguage + '"] [data-highlight-editor-copy="long"]'
      );
      var words = String((activeLong && activeLong.value) || "")
        .trim()
        .split(/\s+/)
        .filter(Boolean).length;
      var minutes = Math.max(1, Math.round(words / 180));
      readTime.textContent = minutes + " min read";
    }

    function resizeCopyField(field) {
      if (!field) {
        return;
      }
      field.style.height = "auto";
      field.style.height = Math.min(Math.max(field.scrollHeight, 112), 416) + "px";
    }

    function getImageCards() {
      return imageGrid
        ? Array.prototype.slice.call(
            imageGrid.querySelectorAll(
              "[data-highlight-editor-existing-image], [data-highlight-editor-new-image]"
            )
          )
        : [];
    }

    function setImageFeedback(message) {
      if (!imageFeedback) {
        return;
      }
      imageFeedback.textContent = String(message || "");
      imageFeedback.hidden = !message;
    }

    function formatMegabytes(byteCount) {
      return (Math.max(0, Number(byteCount) || 0) / (1024 * 1024)).toFixed(2) + " MB";
    }

    function getSelectedUploadBytes() {
      return selectedImageFiles.reduce(function (total, record) {
        return total + Math.max(0, Number(record.file && record.file.size) || 0);
      }, 0);
    }

    function updateUploadBudget() {
      var selectedBytes = getSelectedUploadBytes();
      var percentage = Math.min(100, (selectedBytes / maxUploadBytes) * 100);
      var isNearLimit = selectedBytes >= maxUploadBytes * 0.85;
      var isOverLimit = selectedBytes > maxUploadBytes;

      if (uploadSizeLabel) {
        uploadSizeLabel.textContent =
          formatMegabytes(selectedBytes) + " / " + formatMegabytes(maxUploadBytes);
      }
      if (uploadMeter) {
        uploadMeter.setAttribute("aria-valuenow", String(selectedBytes));
        uploadMeter.classList.toggle("is-near-limit", isNearLimit && !isOverLimit);
        uploadMeter.classList.toggle("is-over-limit", isOverLimit);
      }
      if (uploadMeterBar) {
        uploadMeterBar.style.width = percentage + "%";
      }
    }

    function getActiveImageCards() {
      return getImageCards().filter(function (card) {
        return !card.classList.contains("is-removed");
      });
    }

    function showImageFallback() {
      if (imagePreview) {
        imagePreview.hidden = true;
        imagePreview.removeAttribute("src");
        imagePreview.setAttribute("data-highlight-editor-image-key", "");
      }
      if (imageFallback) {
        imageFallback.hidden = false;
      }
      getImageCards().forEach(function (card) {
        card.classList.remove("is-selected");
      });
    }

    function selectImageCard(card) {
      if (
        !card ||
        card.classList.contains("is-removed") ||
        !imagePreview ||
        !imageFallback
      ) {
        return;
      }
      var imageUrl = String(card.getAttribute("data-image-url") || "").trim();
      if (!imageUrl) {
        return;
      }
      getImageCards().forEach(function (candidate) {
        candidate.classList.toggle("is-selected", candidate === card);
      });
      imagePreview.src = imageUrl;
      imagePreview.hidden = false;
      imagePreview.setAttribute(
        "data-highlight-editor-image-key",
        String(card.getAttribute("data-image-key") || "")
      );
      imageFallback.hidden = true;
    }

    function rebuildRemovalInputs() {
      if (!removalInputs) {
        return;
      }
      removalInputs.replaceChildren();
      getImageCards().forEach(function (card) {
        if (
          !card.hasAttribute("data-highlight-editor-existing-image") ||
          !card.classList.contains("is-removed")
        ) {
          return;
        }
        var input = document.createElement("input");
        input.type = "hidden";
        input.name = "remove_image_filenames";
        input.value = String(card.getAttribute("data-image-key") || "");
        removalInputs.appendChild(input);
      });
    }

    function refreshImageLibrary() {
      var cards = getImageCards();
      var activeCards = getActiveImageCards();
      if (imageCount) {
        imageCount.textContent = activeCards.length + " / " + maxImages;
      }
      if (imageEmpty) {
        imageEmpty.hidden = activeCards.length > 0;
      }
      activeCards.forEach(function (card, index) {
        var label = card.querySelector("div small");
        if (label) {
          var imageSize = Number(card.getAttribute("data-image-size") || 0);
          label.textContent =
            "Image " +
            (index + 1) +
            (imageSize > 0 ? " · " + formatMegabytes(imageSize) : "");
        }
        var viewButton = card.querySelector("[data-highlight-editor-image-view]");
        var removeButton = card.querySelector("[data-highlight-editor-image-remove]");
        if (viewButton) {
          viewButton.setAttribute("aria-label", "Preview image " + (index + 1));
        }
        if (removeButton) {
          removeButton.setAttribute("aria-label", "Remove image " + (index + 1));
        }
      });
      cards
        .filter(function (card) {
          return card.classList.contains("is-removed");
        })
        .forEach(function (card) {
          var removeButton = card.querySelector("[data-highlight-editor-image-remove]");
          if (removeButton) {
            removeButton.setAttribute("aria-label", "Restore removed image");
          }
        });

      var selectedCard = cards.find(function (card) {
        return card.classList.contains("is-selected") && !card.classList.contains("is-removed");
      });
      if (!selectedCard) {
        if (activeCards[0]) {
          selectImageCard(activeCards[0]);
        } else {
          showImageFallback();
        }
      }
      rebuildRemovalInputs();
      updateUploadBudget();
    }

    function syncSelectedImageFiles() {
      if (!imageInput || typeof window.DataTransfer !== "function") {
        return false;
      }
      try {
        var transfer = new window.DataTransfer();
        selectedImageFiles.forEach(function (record) {
          transfer.items.add(record.file);
        });
        imageInput.files = transfer.files;
        return true;
      } catch (error) {
        return false;
      }
    }

    function canRewriteSelectedImageFiles() {
      if (typeof window.DataTransfer !== "function") {
        return false;
      }
      try {
        return Boolean(new window.DataTransfer());
      } catch (error) {
        return false;
      }
    }

    function imageFileFingerprint(file) {
      return [file.name, file.size, file.lastModified].join(":");
    }

    function createNewImageCard(record) {
      if (!imageGrid) {
        return null;
      }
      var card = document.createElement("article");
      card.className = "admin-highlight-editor-image-card";
      card.setAttribute("data-highlight-editor-new-image", "");
      card.setAttribute("data-image-key", record.fingerprint);
      card.setAttribute("data-image-url", record.url);
      card.setAttribute("data-image-size", String(record.file.size || 0));

      var viewButton = document.createElement("button");
      viewButton.type = "button";
      viewButton.className = "admin-highlight-editor-image-view";
      viewButton.setAttribute("data-highlight-editor-image-view", "");

      var thumbnail = document.createElement("img");
      thumbnail.src = record.url;
      thumbnail.alt = "";
      viewButton.appendChild(thumbnail);

      var viewLabel = document.createElement("span");
      viewLabel.textContent = "View";
      viewButton.appendChild(viewLabel);

      var actions = document.createElement("div");
      var itemLabel = document.createElement("small");
      itemLabel.textContent = "New image";
      actions.appendChild(itemLabel);

      var removeButton = document.createElement("button");
      removeButton.type = "button";
      removeButton.setAttribute("data-highlight-editor-image-remove", "");
      removeButton.textContent = "Remove";
      actions.appendChild(removeButton);

      card.appendChild(viewButton);
      card.appendChild(actions);
      imageGrid.appendChild(card);
      return card;
    }

    function clearNewImageCards() {
      getImageCards()
        .filter(function (card) {
          return card.hasAttribute("data-highlight-editor-new-image");
        })
        .forEach(function (card) {
          card.remove();
        });
      previewObjectUrls.forEach(function (url) {
        window.URL.revokeObjectURL(url);
      });
      previewObjectUrls = [];
      selectedImageFiles = [];
    }

    function addSelectedImages() {
      if (!imageInput || !imageGrid) {
        return;
      }
      var incomingFiles = Array.prototype.slice.call(imageInput.files || []);
      if (!incomingFiles.length) {
        return;
      }
      var validFiles = incomingFiles.filter(function (file) {
        return /\.(?:jpe?g|png)$/i.test(String(file.name || ""));
      });

      if (!canRewriteSelectedImageFiles()) {
        clearNewImageCards();
      }

      var existingFingerprints = new Set(
        selectedImageFiles.map(function (record) {
          return record.fingerprint;
        })
      );
      var activeExistingCount = getActiveImageCards().filter(function (card) {
        return card.hasAttribute("data-highlight-editor-existing-image");
      }).length;
      var filesToAdd = validFiles.filter(function (file) {
        return !existingFingerprints.has(imageFileFingerprint(file));
      });

      function restorePreviousSelection() {
        if (!syncSelectedImageFiles()) {
          imageInput.value = "";
          clearNewImageCards();
          refreshImageLibrary();
        }
      }

      if (validFiles.length !== incomingFiles.length) {
        setImageFeedback(
          "The selection was not added. Choose JPG or PNG image files only."
        );
        restorePreviousSelection();
        return;
      }

      if (!filesToAdd.length) {
        setImageFeedback("Those images are already in the new upload selection.");
        restorePreviousSelection();
        return;
      }

      if (activeExistingCount + selectedImageFiles.length + filesToAdd.length > maxImages) {
        setImageFeedback(
          "The selection was not added. A highlight can contain up to " +
            maxImages +
            " images."
        );
        restorePreviousSelection();
        return;
      }

      var incomingBytes = filesToAdd.reduce(function (total, file) {
        return total + Math.max(0, Number(file.size) || 0);
      }, 0);
      var nextUploadBytes = getSelectedUploadBytes() + incomingBytes;
      if (nextUploadBytes > maxUploadBytes) {
        setImageFeedback(
          "The selection was not added. It would bring this save to " +
            formatMegabytes(nextUploadBytes) +
            ". Keep newly selected images at or below " +
            formatMegabytes(maxUploadBytes) +
            " combined."
        );
        restorePreviousSelection();
        return;
      }

      setImageFeedback("");
      var firstNewCard = null;
      filesToAdd.forEach(function (file) {
        var url = window.URL.createObjectURL(file);
        var record = {
          file: file,
          fingerprint: imageFileFingerprint(file),
          url: url,
        };
        selectedImageFiles.push(record);
        previewObjectUrls.push(url);
        var card = createNewImageCard(record);
        if (!firstNewCard) {
          firstNewCard = card;
        }
      });

      syncSelectedImageFiles();
      refreshImageLibrary();
      if (firstNewCard) {
        selectImageCard(firstNewCard);
      }
    }

    function removeNewImageCard(card) {
      var fingerprint = String(card.getAttribute("data-image-key") || "");
      var record = selectedImageFiles.find(function (candidate) {
        return candidate.fingerprint === fingerprint;
      });
      selectedImageFiles = selectedImageFiles.filter(function (candidate) {
        return candidate.fingerprint !== fingerprint;
      });
      if (record) {
        window.URL.revokeObjectURL(record.url);
        previewObjectUrls = previewObjectUrls.filter(function (url) {
          return url !== record.url;
        });
      }
      card.remove();
      if (!syncSelectedImageFiles() && imageInput) {
        imageInput.value = "";
        clearNewImageCards();
      }
      setImageFeedback("");
      refreshImageLibrary();
    }

    function toggleExistingImageRemoval(card) {
      var isRemoved = card.classList.toggle("is-removed");
      var removeButton = card.querySelector("[data-highlight-editor-image-remove]");
      if (removeButton) {
        removeButton.textContent = isRemoved ? "Undo" : "Remove";
      }
      setImageFeedback("");
      refreshImageLibrary();
    }

    languageButtons.forEach(function (button) {
      button.addEventListener("click", function () {
        setLanguage(button.getAttribute("data-highlight-editor-lang"));
      });
    });
    if (statusSelect) {
      statusSelect.addEventListener("change", updateVisibility);
    }
    if (titleInput) {
      titleInput.addEventListener("input", updateFallbackLetter);
    }
    if (categoryInput) {
      categoryInput.addEventListener("change", updateCategory);
    }
    if (dateInput) {
      dateInput.addEventListener("change", updateDate);
      dateInput.addEventListener("input", updateDate);
    }
    if (imageInput) {
      imageInput.addEventListener("change", addSelectedImages);
    }
    if (imageGrid) {
      imageGrid.addEventListener("click", function (event) {
        var viewButton = event.target.closest("[data-highlight-editor-image-view]");
        var removeButton = event.target.closest("[data-highlight-editor-image-remove]");
        var card = event.target.closest(
          "[data-highlight-editor-existing-image], [data-highlight-editor-new-image]"
        );
        if (!card) {
          return;
        }
        if (viewButton) {
          selectImageCard(card);
          return;
        }
        if (!removeButton) {
          return;
        }
        if (card.hasAttribute("data-highlight-editor-new-image")) {
          removeNewImageCard(card);
        } else {
          toggleExistingImageRemoval(card);
        }
      });
    }
    copyFields.forEach(function (field) {
      field.addEventListener("input", function () {
        field.setCustomValidity("");
        resizeCopyField(field);
        if (field.getAttribute("data-highlight-editor-copy") === "long") {
          updateReadTime();
        }
      });
      resizeCopyField(field);
    });

    editor.addEventListener("submit", function (event) {
      var selectedUploadBytes = getSelectedUploadBytes();
      if (selectedUploadBytes > maxUploadBytes) {
        event.preventDefault();
        event.stopImmediatePropagation();
        setImageFeedback(
          "Saving was stopped because the new images total " +
            formatMegabytes(selectedUploadBytes) +
            ". Keep the combined upload at or below " +
            formatMegabytes(maxUploadBytes) +
            "."
        );
        if (imageLibrary) {
          imageLibrary.scrollIntoView({ behavior: "smooth", block: "center" });
        }
        return;
      }

      var requirements = [
        { name: "short_description", min: 12, language: "en", message: "Enter at least 12 characters for the English short description." },
        { name: "long_description", min: 24, language: "en", message: "Enter at least 24 characters for the English full description." },
        { name: "short_description_tl", min: 12, language: "tl", message: "Enter at least 12 characters for the Tagalog short description." },
        { name: "long_description_tl", min: 24, language: "tl", message: "Enter at least 24 characters for the Tagalog full description." },
      ];
      var invalid = requirements.find(function (requirement) {
        var field = editor.elements[requirement.name];
        return !field || String(field.value || "").trim().length < requirement.min;
      });
      if (!invalid) {
        return;
      }
      event.preventDefault();
      event.stopImmediatePropagation();
      var invalidField = editor.elements[invalid.name];
      setLanguage(invalid.language);
      if (invalidField) {
        invalidField.setCustomValidity(invalid.message);
        invalidField.focus();
        invalidField.reportValidity();
      }
    }, { capture: true });

    editor.addEventListener("submit", function () {
      var selectedUploadBytes = getSelectedUploadBytes();
      var selectedUploadCount = selectedImageFiles.length;
      var submitLabel = String(
        editor.getAttribute("data-highlight-editor-submit-label") || "Save Changes"
      ).trim();

      editor.setAttribute("aria-busy", "true");
      Array.prototype.slice.call(
        editor.querySelectorAll('button[type="submit"]')
      ).forEach(function (button) {
        button.disabled = true;
      });

      if (!saveNotice) {
        return;
      }
      if (saveNoticeTitle) {
        saveNoticeTitle.textContent =
          submitLabel === "Create Highlight"
            ? "Creating community highlight…"
            : "Saving community highlight changes…";
      }
      if (saveNoticeDetail) {
        saveNoticeDetail.textContent = selectedUploadCount
          ? "Uploading " +
            selectedUploadCount +
            (selectedUploadCount === 1 ? " image" : " images") +
            " (" +
            formatMegabytes(selectedUploadBytes) +
            "). Please keep this page open."
          : "Saving the highlight information. Please keep this page open.";
      }
      saveNotice.hidden = false;
      window.requestAnimationFrame(function () {
        saveNotice.classList.add("is-visible");
      });
    });

    window.addEventListener("beforeunload", function () {
      previewObjectUrls.forEach(function (url) {
        window.URL.revokeObjectURL(url);
      });
    });

    setLanguage("en");
    updateVisibility();
    updateFallbackLetter();
    updateCategory();
    updateDate();
    refreshImageLibrary();
  }

  function initAdminAccountSettings() {
    var root = document.querySelector("[data-admin-settings]");
    if (!root) {
      return;
    }

    var forms = Array.prototype.slice.call(root.querySelectorAll("[data-admin-settings-form]"));
    var toggles = root.querySelectorAll("[data-admin-password-toggle]");
    var resultModal = document.querySelector("[data-admin-settings-result]");
    var resultTitle = resultModal && resultModal.querySelector("[data-admin-settings-result-title]");
    var resultMessage = resultModal && resultModal.querySelector("[data-admin-settings-result-message]");
    var resultClose = resultModal && resultModal.querySelector("[data-admin-settings-result-close]");
    var resultRedirect = "";
    var resultTimer = 0;
    var previousFocus = null;

    function closeResult() {
      if (!resultModal) {
        return;
      }

      if (resultRedirect) {
        window.location.assign(resultRedirect);
        return;
      }

      resultModal.classList.remove("is-open");
      resultModal.setAttribute("aria-hidden", "true");
      document.body.classList.remove("admin-settings-result-open");
      if (resultTimer) {
        window.clearTimeout(resultTimer);
      }
      resultTimer = window.setTimeout(function () {
        resultModal.hidden = true;
        resultTimer = 0;
      }, 180);

      if (previousFocus && typeof previousFocus.focus === "function") {
        previousFocus.focus();
      }
      previousFocus = null;
    }

    function showResult(payload) {
      if (!resultModal || !resultTitle || !resultMessage || !resultClose) {
        if (payload.redirect_url) {
          window.location.assign(payload.redirect_url);
          return;
        }
        window.alert(payload.message || payload.title || "The account action could not be completed.");
        return;
      }

      if (resultTimer) {
        window.clearTimeout(resultTimer);
        resultTimer = 0;
      }
      previousFocus = document.activeElement;
      resultRedirect = String(payload.redirect_url || "");
      resultTitle.textContent = String(payload.title || (payload.ok ? "Account updated" : "Unable to save"));
      resultMessage.textContent = String(payload.message || "");
      resultClose.textContent = resultRedirect ? "Sign in again" : "Done";
      resultModal.classList.toggle("is-error", !payload.ok);
      resultModal.hidden = false;
      resultModal.setAttribute("aria-hidden", "false");
      document.body.classList.add("admin-settings-result-open");

      window.requestAnimationFrame(function () {
        resultModal.classList.add("is-open");
        resultClose.focus();
      });
    }

    toggles.forEach(function (toggle) {
      toggle.addEventListener("click", function () {
        var targetId = toggle.getAttribute("aria-controls");
        var input = targetId ? document.getElementById(targetId) : null;
        if (!input) {
          return;
        }
        var showing = input.type === "text";
        input.type = showing ? "password" : "text";
        toggle.textContent = showing ? "Show" : "Hide";
        toggle.setAttribute("aria-pressed", showing ? "false" : "true");
        toggle.setAttribute("aria-label", (showing ? "Show" : "Hide") + " password");
      });
    });

    forms.forEach(function (form) {
      form.addEventListener("submit", function (event) {
        event.preventDefault();
        var submitButtons = Array.prototype.slice.call(form.querySelectorAll('button[type="submit"]'));
        submitButtons.forEach(function (button) {
          button.disabled = true;
        });

        window.fetch(form.action || window.location.href, {
          method: "POST",
          body: new FormData(form),
          credentials: "same-origin",
          headers: {
            Accept: "application/json",
            "X-Requested-With": "XMLHttpRequest",
          },
        })
          .then(function (response) {
            var contentType = String(response.headers.get("content-type") || "");
            if (contentType.indexOf("application/json") === -1) {
              if (response.redirected && response.url) {
                window.location.assign(response.url);
                return null;
              }
              throw new Error("Unexpected server response.");
            }
            return response.json();
          })
          .then(function (payload) {
            if (payload) {
              showResult(payload);
            }
          })
          .catch(function () {
            showResult({
              ok: false,
              title: "Unable to save",
              message: "The account request could not be completed. Check your connection and try again.",
            });
          })
          .finally(function () {
            submitButtons.forEach(function (button) {
              button.disabled = false;
            });
          });
      });
    });

    if (resultClose) {
      resultClose.addEventListener("click", closeResult);
    }
    if (resultModal) {
      resultModal.addEventListener("click", function (event) {
        if (event.target === resultModal && !resultRedirect) {
          closeResult();
        }
      });
      resultModal.addEventListener("keydown", function (event) {
        if (event.key === "Escape" && !resultRedirect) {
          event.preventDefault();
          closeResult();
        }
        if (event.key === "Tab" && resultClose) {
          event.preventDefault();
          resultClose.focus();
        }
      });
    }
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
    initAdminBookingManagement();
    initAdminBookingReview();
    initAdminGalleryManagement();
    initAdminGalleryView();
    initAdminEduResourceManagement();
    initAdminSubmissionManagement();
    initAdminFeedbackManagement();
    initDashboardSearch();
    initConfirmedSubmissions();
    initSuccessModals();
    initAdminAccountSettings();
    initAdminUserManagement();
    initAdminHighlightEditor();
    initAutoDismissAlerts();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initDashboardUi);
  } else {
    initDashboardUi();
  }
})();
