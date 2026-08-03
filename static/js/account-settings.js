/* Account settings: in-page form updates, Heritage result modal, avatar
   preview, staged password security, and delete-account confirmation. */
(function () {
  var noticeModal = document.getElementById("settingsNoticeModal");
  var noticeIcon = document.getElementById("settingsNoticeIcon");
  var noticeSuccessIcon = document.getElementById("settingsNoticeSuccessIcon");
  var noticeErrorIcon = document.getElementById("settingsNoticeErrorIcon");
  var noticeTitle = document.getElementById("settingsNoticeTitle");
  var noticeMessage = document.getElementById("settingsNoticeMessage");
  var noticeClose = document.getElementById("settingsNoticeClose");
  var lastNoticeTrigger = null;

  function activeLanguage() {
    return document.documentElement.getAttribute("data-lang") === "tl" ? "tl" : "en";
  }

  function syncBodyLock() {
    var anyOpen = document.querySelector(".s-modal:not([hidden])");
    document.body.style.overflow = anyOpen ? "hidden" : "";
  }

  function setNoticeTitle(type) {
    if (!noticeTitle) return;
    var isError = type === "error";
    noticeTitle.innerHTML = isError
      ? '<span data-lang-en>Unable to save</span><span data-lang-tl>Hindi mai-save</span>'
      : '<span data-lang-en>Changes saved</span><span data-lang-tl>Nai-save ang mga pagbabago</span>';
  }

  function showNotice(message, type, trigger) {
    if (!noticeModal) return;
    var isError = type === "error";
    lastNoticeTrigger = trigger || document.activeElement;
    if (noticeIcon) noticeIcon.classList.toggle("is-error", isError);
    if (noticeSuccessIcon) {
      noticeSuccessIcon.hidden = isError;
      noticeSuccessIcon.classList.toggle("is-visible", !isError);
    }
    if (noticeErrorIcon) {
      noticeErrorIcon.hidden = !isError;
      noticeErrorIcon.classList.toggle("is-visible", isError);
    }
    setNoticeTitle(type);
    if (noticeMessage) noticeMessage.textContent = String(message || (isError ? "Please try again." : "Your changes have been saved."));
    noticeModal.hidden = false;
    syncBodyLock();
    window.requestAnimationFrame(function () {
      if (noticeClose) noticeClose.focus();
    });
  }

  function closeNotice() {
    if (!noticeModal) return;
    noticeModal.hidden = true;
    syncBodyLock();
    if (lastNoticeTrigger && typeof lastNoticeTrigger.focus === "function" && !lastNoticeTrigger.closest("[hidden]")) {
      lastNoticeTrigger.focus();
    } else {
      var visibleSecurityInput = document.querySelector('#securityCodeStage:not([hidden]) input, #securityCreatePasswordForm:not([hidden]) input');
      if (visibleSecurityInput) visibleSecurityInput.focus();
    }
    lastNoticeTrigger = null;
  }

  if (noticeModal) {
    noticeModal.querySelectorAll("[data-settings-notice-close]").forEach(function (element) {
      element.addEventListener("click", closeNotice);
    });
  }

  function updateCsrfTokens(token) {
    if (!token) return;
    document.querySelectorAll('input[name="csrf_token"]').forEach(function (input) {
      input.value = token;
    });
  }

  function formDataWithSubmitter(form, submitter) {
    var data = new FormData(form);
    if (submitter && submitter.name) data.set(submitter.name, submitter.value || "");
    return data;
  }

  /* Keep the exact clicked action on browsers that do not expose
     SubmitEvent.submitter (important for Upload versus Remove photo). */
  document.querySelectorAll("form[data-settings-ajax] button[type=submit], form[data-settings-ajax] input[type=submit]").forEach(function (button) {
    button.addEventListener("click", function () {
      if (button.form) button.form._settingsSubmitter = button;
    });
  });

  async function submitWithoutRefresh(form, submitter) {
    var button = submitter && submitter.matches && submitter.matches('button,input[type="submit"]') ? submitter : form.querySelector('[type="submit"]');
    if (button) {
      button.disabled = true;
      button.setAttribute("aria-busy", "true");
    }
    try {
      var response = await fetch(form.action, {
        method: (form.method || "POST").toUpperCase(),
        body: formDataWithSubmitter(form, submitter),
        credentials: "same-origin",
        headers: { "Accept": "application/json", "X-Requested-With": "XMLHttpRequest" },
      });
      var contentType = response.headers.get("content-type") || "";
      if (contentType.indexOf("application/json") === -1) throw new Error("The server returned an unexpected response.");
      var payload = await response.json();
      if (payload.redirect_url && response.status === 401) {
        window.location.assign(payload.redirect_url);
        return payload;
      }
      if (!response.ok || !payload.ok) throw Object.assign(new Error(payload.error || "The change could not be saved."), { payload: payload });
      updateCsrfTokens(payload.csrf_token);
      return payload;
    } finally {
      if (button && button.isConnected) {
        button.disabled = false;
        button.removeAttribute("aria-busy");
      }
    }
  }

  /* ---- Profile ---- */
  var profileForm = document.getElementById("profileForm");
  if (profileForm) {
    profileForm.addEventListener("submit", function (event) {
      event.preventDefault();
      var submitter = event.submitter || profileForm._settingsSubmitter;
      profileForm._settingsSubmitter = null;
      submitWithoutRefresh(profileForm, submitter)
        .then(function (payload) { if (payload) showNotice(payload.message, "success", submitter); })
        .catch(function (error) { showNotice(error.message, "error", submitter); });
    });
  }

  /* ---- Avatar preview and save ---- */
  var avatarForm = document.getElementById("avatarForm");
  var avatarInput = document.getElementById("avatarInput");
  var avatarChooseBtn = document.getElementById("avatarChooseBtn");
  var avatarPreview = document.getElementById("avatarPreview");
  var avatarFallback = document.getElementById("avatarFallback");
  var avatarUploadBtn = document.getElementById("avatarUploadBtn");
  var avatarRemoveBtn = document.getElementById("avatarRemoveBtn");

  if (avatarChooseBtn && avatarInput) {
    avatarChooseBtn.addEventListener("click", function () { avatarInput.click(); });
    avatarInput.addEventListener("change", function () {
      var file = avatarInput.files && avatarInput.files[0];
      if (!file) return;
      var reader = new FileReader();
      reader.onload = function (event) {
        if (avatarPreview) {
          avatarPreview.src = String(event.target.result || "");
          avatarPreview.alt = "Your profile picture";
          avatarPreview.style.display = "";
        }
        if (avatarFallback) avatarFallback.style.display = "none";
        if (avatarUploadBtn) avatarUploadBtn.classList.remove("hidden");
      };
      reader.readAsDataURL(file);
    });
  }

  if (avatarForm) {
    avatarForm.addEventListener("submit", function (event) {
      event.preventDefault();
      var submitter = event.submitter || avatarForm._settingsSubmitter;
      avatarForm._settingsSubmitter = null;
      submitWithoutRefresh(avatarForm, submitter)
        .then(function (payload) {
          if (!payload) return;
          if (payload.avatar_action === "remove") {
            if (avatarPreview) { avatarPreview.src = ""; avatarPreview.alt = ""; avatarPreview.style.display = "none"; }
            if (avatarFallback) avatarFallback.style.display = "";
            if (avatarRemoveBtn) avatarRemoveBtn.classList.add("hidden");
          } else {
            if (avatarRemoveBtn) avatarRemoveBtn.classList.remove("hidden");
          }
          if (avatarUploadBtn) avatarUploadBtn.classList.add("hidden");
          if (avatarInput) avatarInput.value = "";
          showNotice(payload.message, "success", submitter);
        })
        .catch(function (error) { showNotice(error.message, "error", submitter); });
    });
  }

  /* ---- Password visibility ---- */
  document.querySelectorAll("[data-settings-password-toggle]").forEach(function (button) {
    button.addEventListener("click", function () {
      var input = document.getElementById(button.getAttribute("data-settings-password-toggle") || "");
      if (!input) return;
      var reveal = input.type === "password";
      input.type = reveal ? "text" : "password";
      button.setAttribute("aria-label", reveal ? "Hide password" : "Show password");
      button.setAttribute("aria-pressed", reveal ? "true" : "false");
    });
  });

  var googlePasswordSetup = document.getElementById("googlePasswordSetup");
  var securitySendStage = document.getElementById("securitySendStage");
  var securityCodeStage = document.getElementById("securityCodeStage");
  var securityCreatePasswordForm = document.getElementById("securityCreatePasswordForm");
  var securityCodeInput = document.getElementById("securityCode");
  var localPasswordControls = document.getElementById("localPasswordControls");
  var securitySignInMethods = document.getElementById("securitySignInMethods");
  var securityPasswordStatus = document.getElementById("securityPasswordStatus");
  var openPasswordChange = document.getElementById("openPasswordChange");
  var cancelPasswordChange = document.getElementById("cancelPasswordChange");
  var securityPasswordForm = document.getElementById("securityPasswordForm");

  function setSecurityStage(stage) {
    if (securitySendStage) securitySendStage.hidden = stage !== "";
    if (securityCodeStage) securityCodeStage.hidden = stage !== "code";
    if (securityCreatePasswordForm) securityCreatePasswordForm.hidden = stage !== "password";
    if (stage === "code" && securityCodeInput) securityCodeInput.focus();
    if (stage === "password" && securityCreatePasswordForm) {
      var nextInput = securityCreatePasswordForm.querySelector('input[type="password"]');
      if (nextInput) nextInput.focus();
    }
  }

  function setPasswordFormOpen(isOpen) {
    if (!securityPasswordForm) return;
    securityPasswordForm.hidden = !isOpen;
    if (openPasswordChange) {
      openPasswordChange.hidden = isOpen;
      openPasswordChange.setAttribute("aria-expanded", isOpen ? "true" : "false");
    }
    if (isOpen) {
      var firstPasswordInput = securityPasswordForm.querySelector('input[type="password"]');
      if (firstPasswordInput) firstPasswordInput.focus();
    } else {
      securityPasswordForm.reset();
    }
  }

  if (openPasswordChange) {
    openPasswordChange.setAttribute("aria-expanded", "false");
    openPasswordChange.addEventListener("click", function () { setPasswordFormOpen(true); });
  }
  if (cancelPasswordChange) cancelPasswordChange.addEventListener("click", function () { setPasswordFormOpen(false); });
  if (securityCodeInput) {
    securityCodeInput.addEventListener("input", function () {
      securityCodeInput.value = securityCodeInput.value.replace(/\D/g, "").slice(0, 6);
    });
  }

  document.querySelectorAll("form[data-security-action]").forEach(function (form) {
    form.addEventListener("submit", function (event) {
      event.preventDefault();
      var submitter = event.submitter || form._settingsSubmitter;
      form._settingsSubmitter = null;
      submitWithoutRefresh(form, submitter)
        .then(function (payload) {
          if (!payload) return;
          if (payload.password_created) {
            if (googlePasswordSetup) googlePasswordSetup.hidden = true;
            if (localPasswordControls) localPasswordControls.hidden = false;
            if (securitySignInMethods) securitySignInMethods.textContent = "Google + Password";
            if (securityPasswordStatus) securityPasswordStatus.innerHTML = '<span data-lang-en>Password enabled</span><span data-lang-tl>Aktibo ang password</span>';
            if (securityCreatePasswordForm) securityCreatePasswordForm.reset();
          } else if (payload.password_changed) {
            setPasswordFormOpen(false);
          } else if (typeof payload.stage === "string") {
            setSecurityStage(payload.stage);
          }
          showNotice(payload.message, "success", submitter);
        })
        .catch(function (error) {
          var payload = error.payload || {};
          if (typeof payload.stage === "string") setSecurityStage(payload.stage);
          showNotice(error.message, "error", submitter);
        });
    });
  });

  /* Accessibility changes already apply instantly. Confirm them in the same
     modal without navigating away from Account Settings. */
  document.querySelectorAll("[data-set-theme],[data-toggle-contrast],[data-set-textsize],[data-set-lang]").forEach(function (button) {
    button.addEventListener("click", function () {
      window.setTimeout(function () {
        var message = activeLanguage() === "tl" ? "Na-update ang iyong accessibility preference." : "Your accessibility preference was updated.";
        showNotice(message, "success", button);
      }, 0);
    });
  });

  /* ---- Delete modal ---- */
  var deleteModal = document.getElementById("deleteModal");
  var openDeleteBtn = document.getElementById("openDeleteModal");
  var confirmInput = document.getElementById("deleteConfirmInput");
  var deleteSubmitBtn = document.getElementById("deleteSubmitBtn");
  var REQUIRED_PHRASE = "confirm delete";

  function openDeleteModal() {
    if (!deleteModal) return;
    deleteModal.hidden = false;
    syncBodyLock();
    if (confirmInput) { confirmInput.value = ""; confirmInput.focus(); }
    if (deleteSubmitBtn) deleteSubmitBtn.disabled = true;
  }
  function closeDeleteModal() {
    if (!deleteModal) return;
    deleteModal.hidden = true;
    syncBodyLock();
  }

  if (openDeleteBtn) openDeleteBtn.addEventListener("click", openDeleteModal);
  if (deleteModal) {
    deleteModal.querySelectorAll("[data-delete-close]").forEach(function (element) {
      element.addEventListener("click", closeDeleteModal);
    });
  }
  if (confirmInput && deleteSubmitBtn) {
    confirmInput.addEventListener("input", function () {
      deleteSubmitBtn.disabled = confirmInput.value.trim().toLowerCase() !== REQUIRED_PHRASE;
    });
  }

  document.addEventListener("keydown", function (event) {
    if (event.key !== "Escape") return;
    if (noticeModal && !noticeModal.hidden) closeNotice();
    else if (deleteModal && !deleteModal.hidden) closeDeleteModal();
  });

  if (window.lucide) window.lucide.createIcons();
})();
