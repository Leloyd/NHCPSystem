/* Account settings — avatar preview + delete-account confirmation gate.
   Theme, contrast, language and text size are handled by the shared
   static/js/site-prefs.js (via the data-set-* controls on this page). */
(function () {
  /* ---- Avatar preview ---- */
  var avatarInput = document.getElementById("avatarInput");
  var avatarChooseBtn = document.getElementById("avatarChooseBtn");
  var avatarPreview = document.getElementById("avatarPreview");
  var avatarFallback = document.getElementById("avatarFallback");
  var avatarUploadBtn = document.getElementById("avatarUploadBtn");

  if (avatarChooseBtn && avatarInput) {
    avatarChooseBtn.addEventListener("click", function () {
      avatarInput.click();
    });
    avatarInput.addEventListener("change", function () {
      var file = avatarInput.files && avatarInput.files[0];
      if (!file) {
        return;
      }
      var reader = new FileReader();
      reader.onload = function (e) {
        if (avatarPreview) {
          avatarPreview.src = String(e.target.result || "");
          avatarPreview.style.display = "";
        }
        if (avatarFallback) {
          avatarFallback.style.display = "none";
        }
        if (avatarUploadBtn) {
          avatarUploadBtn.classList.remove("hidden");
        }
      };
      reader.readAsDataURL(file);
    });
  }

  /* ---- Password visibility ---- */
  document.querySelectorAll("[data-settings-password-toggle]").forEach(function (button) {
    button.addEventListener("click", function () {
      var input = document.getElementById(button.getAttribute("data-settings-password-toggle") || "");
      if (!input) {
        return;
      }
      var reveal = input.type === "password";
      input.type = reveal ? "text" : "password";
      button.setAttribute("aria-label", reveal ? "Hide password" : "Show password");
      button.setAttribute("aria-pressed", reveal ? "true" : "false");
    });
  });

  /* ---- Delete modal ---- */
  var deleteModal = document.getElementById("deleteModal");
  var openDeleteBtn = document.getElementById("openDeleteModal");
  var confirmInput = document.getElementById("deleteConfirmInput");
  var deleteSubmitBtn = document.getElementById("deleteSubmitBtn");
  var REQUIRED_PHRASE = "confirm delete";

  function openModal() {
    if (!deleteModal) {
      return;
    }
    deleteModal.hidden = false;
    document.body.style.overflow = "hidden";
    if (confirmInput) {
      confirmInput.value = "";
      confirmInput.focus();
    }
    if (deleteSubmitBtn) {
      deleteSubmitBtn.disabled = true;
    }
  }
  function closeModal() {
    if (!deleteModal) {
      return;
    }
    deleteModal.hidden = true;
    document.body.style.overflow = "";
  }

  if (openDeleteBtn) {
    openDeleteBtn.addEventListener("click", openModal);
  }
  if (deleteModal) {
    deleteModal.querySelectorAll("[data-delete-close]").forEach(function (el) {
      el.addEventListener("click", closeModal);
    });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && !deleteModal.hidden) {
        closeModal();
      }
    });
  }
  if (confirmInput && deleteSubmitBtn) {
    confirmInput.addEventListener("input", function () {
      deleteSubmitBtn.disabled = confirmInput.value.trim().toLowerCase() !== REQUIRED_PHRASE;
    });
  }

  if (window.lucide) {
    window.lucide.createIcons();
  }
})();
