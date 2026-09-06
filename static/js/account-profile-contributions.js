(function () {
  "use strict";

  function initialize() {
    document.querySelectorAll(".ap-contribution-notice[data-auto-dismiss]").forEach(function (notice) {
      var delay = Number(notice.getAttribute("data-auto-dismiss")) || 3000;
      window.setTimeout(function () {
        notice.classList.add("is-dismissing");
        window.setTimeout(function () {
          notice.remove();
          try {
            var currentUrl = new URL(window.location.href);
            currentUrl.searchParams.delete("contribution_status");
            window.history.replaceState({}, "", currentUrl.pathname + currentUrl.search + currentUrl.hash);
          } catch (_) {
            // The visual confirmation can still dismiss if URL cleanup is unavailable.
          }
        }, 240);
      }, delay);
    });

    var panel = document.getElementById("participationPanel");
    var editors = document.querySelectorAll(".ap-submission-editor");
    function syncExpandedPanel() {
      if (!panel) return;
      panel.classList.toggle("is-editing", Array.prototype.some.call(editors, function (editor) {
        return editor.open;
      }));
    }

    Array.prototype.forEach.call(editors, function (editor) {
      editor.addEventListener("toggle", syncExpandedPanel);
    });
    syncExpandedPanel();

    document.querySelectorAll(".ap-submission-editor form").forEach(function (form) {
      form.addEventListener("submit", function () {
        if (!form.checkValidity()) return;
        form.setAttribute("aria-busy", "true");
        var button = form.querySelector('button[type="submit"]');
        if (button) button.disabled = true;
      });
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initialize);
  } else {
    initialize();
  }
})();
