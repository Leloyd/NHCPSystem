(function () {
  var configNode = document.getElementById("accountSettingsConfig");
  var config = {};
  try {
    config = JSON.parse((configNode && configNode.textContent) || "{}");
  } catch (_e) {
    config = {};
  }

  var root = document.documentElement;
  var themeField = document.getElementById("themeField");
  var langField = document.getElementById("langField");

  function currentTheme() {
    return root.getAttribute("data-theme") === "dark" ? "dark" : "light";
  }
  function currentLang() {
    return root.getAttribute("data-lang") === "tl" ? "tl" : "en";
  }

  function savePreference(params) {
    if (!config.preferencesEndpoint) {
      return;
    }
    try {
      var body = new URLSearchParams(params);
      body.set("csrf_token", config.csrfToken || "");
      fetch(config.preferencesEndpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          "X-CSRF-Token": config.csrfToken || "",
        },
        body: body.toString(),
        credentials: "same-origin",
      }).catch(function () {});
    } catch (_e) {}
  }

  /* ---- Theme ---- */
  var themeButtons = Array.prototype.slice.call(document.querySelectorAll("[data-theme-option]"));
  function syncThemeButtons() {
    var active = currentTheme();
    themeButtons.forEach(function (btn) {
      btn.classList.toggle("is-active", btn.getAttribute("data-theme-option") === active);
    });
    if (themeField) {
      themeField.value = active;
    }
  }
  function setTheme(value) {
    var theme = value === "dark" ? "dark" : "light";
    root.setAttribute("data-theme", theme);
    try {
      localStorage.setItem("nhcp-theme", theme);
    } catch (_e) {}
    syncThemeButtons();
    savePreference({ theme_preference: theme });
  }
  themeButtons.forEach(function (btn) {
    btn.addEventListener("click", function () {
      setTheme(btn.getAttribute("data-theme-option"));
    });
  });

  /* ---- Language ---- */
  var langButtons = Array.prototype.slice.call(document.querySelectorAll("[data-lang-option]"));
  function syncLangButtons() {
    var active = currentLang();
    langButtons.forEach(function (btn) {
      btn.classList.toggle("is-active", btn.getAttribute("data-lang-option") === active);
    });
    if (langField) {
      langField.value = active;
    }
  }
  function setLanguage(value) {
    var lang = value === "tl" ? "tl" : "en";
    root.setAttribute("data-lang", lang);
    try {
      localStorage.setItem("nhcp-lang", lang);
    } catch (_e) {}
    syncLangButtons();
    savePreference({ language_preference: lang });
  }
  langButtons.forEach(function (btn) {
    btn.addEventListener("click", function () {
      setLanguage(btn.getAttribute("data-lang-option"));
    });
  });

  syncThemeButtons();
  syncLangButtons();

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
