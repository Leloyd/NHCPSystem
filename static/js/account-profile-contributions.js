(function () {
  "use strict";

  function initialize() {
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
