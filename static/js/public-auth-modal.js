(function () {
  if (window.__nhcpPublicAuthModalInitialized) {
    return;
  }
  window.__nhcpPublicAuthModalInitialized = true;

  var configScript = document.getElementById("publicAuthConfigData");
  var modal = document.getElementById("publicAuthModal");
  if (!configScript || !modal) {
    return;
  }

  var config = {};
  try {
    config = JSON.parse(configScript.textContent || "{}");
  } catch (_error) {
    config = {};
  }

  var dialog = modal.querySelector(".public-auth-dialog");
  var panels = modal.querySelectorAll("[data-auth-view]");
  var messageBoxes = modal.querySelectorAll("[data-auth-message]");
  var openButtons = document.querySelectorAll("[data-open-auth-modal]");
  var closeButtons = modal.querySelectorAll("[data-auth-close]");
  var switchButtons = modal.querySelectorAll("[data-auth-view-target]");
  var googleButtons = modal.querySelectorAll("[data-auth-google]");
  var resendButton = modal.querySelector("[data-auth-resend]");
  var useAnotherButton = modal.querySelector("[data-auth-use-another-email]");
  var loginForm = document.getElementById("publicAuthLoginForm");
  var signupForm = document.getElementById("publicAuthSignupForm");
  var forgotForm = document.getElementById("publicAuthForgotForm");
  var emailDisplays = modal.querySelectorAll("[data-auth-email-display]");
  var body = document.body;
  var currentView = config.defaultView || modal.getAttribute("data-auth-default-view") || "login";
  var pendingEmail = "";

  function setEmailDisplays(value) {
    emailDisplays.forEach(function (node) {
      node.textContent = value || "your email";
    });
  }

  function clearMessages() {
    messageBoxes.forEach(function (box) {
      box.textContent = "";
      box.classList.add("hidden");
      box.classList.remove("is-error", "is-success");
    });
  }

  function setMessage(view, text, type) {
    var box = modal.querySelector('[data-auth-message="' + view + '"]');
    if (!box) {
      return;
    }
    if (!text) {
      box.textContent = "";
      box.classList.add("hidden");
      box.classList.remove("is-error", "is-success");
      return;
    }
    box.textContent = text;
    box.classList.remove("hidden", "is-error", "is-success");
    box.classList.add(type === "success" ? "is-success" : "is-error");
  }

  function syncCurrentNext(nextValue) {
    var nextFields = modal.querySelectorAll('input[name="next"]');
    nextFields.forEach(function (field) {
      field.value = nextValue || config.nextUrl || "/account";
    });
  }

  function switchView(view) {
    currentView = view;
    panels.forEach(function (panel) {
      panel.classList.toggle("hidden", panel.getAttribute("data-auth-view") !== view);
    });
    clearMessages();
    modal.setAttribute("data-auth-current-view", view);
  }

  function openModal(view) {
    if (view) {
      switchView(view);
    }
    modal.classList.remove("hidden");
    modal.setAttribute("aria-hidden", "false");
    body.classList.add("public-auth-open");
    window.requestAnimationFrame(function () {
      modal.classList.add("is-visible");
    });
    if (dialog) {
      dialog.focus();
    }
  }

  function closeModal() {
    modal.classList.remove("is-visible");
    modal.setAttribute("aria-hidden", "true");
    body.classList.remove("public-auth-open");
    window.setTimeout(function () {
      if (modal.getAttribute("aria-hidden") === "true") {
        modal.classList.add("hidden");
      }
    }, 180);
  }

  function handleGooglePlaceholder() {
    setMessage(currentView, "Continue with Google is coming soon.", "error");
  }

  function togglePasswordVisibility(button) {
    var targetId = button.getAttribute("data-password-toggle");
    var input = targetId ? document.getElementById(targetId) : null;
    if (!input) {
      return;
    }
    var showIcon = button.querySelector(".password-icon-show");
    var hideIcon = button.querySelector(".password-icon-hide");
    var makeVisible = input.type === "password";
    input.type = makeVisible ? "text" : "password";
    if (showIcon && hideIcon) {
      showIcon.classList.toggle("hidden", makeVisible);
      hideIcon.classList.toggle("hidden", !makeVisible);
    }
    button.setAttribute("aria-label", makeVisible ? "Hide password" : "Show password");
  }

  function serializeForm(form) {
    return new FormData(form);
  }

  function request(url, formData) {
    return fetch(url, {
      method: "POST",
      body: formData,
      headers: {
        "X-Requested-With": "XMLHttpRequest"
      }
    }).then(function (response) {
      return response.json().catch(function () {
        return {};
      }).then(function (payload) {
        return { response: response, payload: payload };
      });
    });
  }

  if (loginForm) {
    loginForm.addEventListener("submit", function (event) {
      event.preventDefault();
      clearMessages();
      var formData = serializeForm(loginForm);
      request(config.loginEndpoint, formData).then(function (result) {
        var payload = result.payload || {};
        if (!result.response.ok) {
          if (payload.verification_required && payload.email) {
            pendingEmail = payload.email;
            setEmailDisplays(pendingEmail);
            switchView("verify");
            setMessage("verify", payload.error || "Please verify your email before signing in.", "error");
            return;
          }
          setMessage("login", payload.error || "Could not sign you in right now.", "error");
          return;
        }
        window.location.href = payload.redirect_url || config.nextUrl || "/account";
      }).catch(function () {
        setMessage("login", "Could not reach the server right now. Please try again.", "error");
      });
    });
  }

  if (signupForm) {
    signupForm.addEventListener("submit", function (event) {
      event.preventDefault();
      clearMessages();
      var formData = serializeForm(signupForm);
      pendingEmail = String(formData.get("email") || "").trim();
      request(config.signupEndpoint, formData).then(function (result) {
        var payload = result.payload || {};
        if (!result.response.ok) {
          setMessage("signup", payload.error || "Could not create your account right now.", "error");
          return;
        }
        pendingEmail = payload.email || pendingEmail;
        setEmailDisplays(pendingEmail);
        switchView("verify");
      }).catch(function () {
        setMessage("signup", "Could not reach the server right now. Please try again.", "error");
      });
    });
  }

  if (forgotForm) {
    forgotForm.addEventListener("submit", function (event) {
      event.preventDefault();
      clearMessages();
      var formData = serializeForm(forgotForm);
      pendingEmail = String(formData.get("email") || "").trim();
      request(config.forgotEndpoint, formData).then(function (result) {
        var payload = result.payload || {};
        if (!result.response.ok) {
          setMessage("forgot", payload.error || "Could not send the reset email right now.", "error");
          return;
        }
        setEmailDisplays(payload.email || pendingEmail);
        switchView("forgot-success");
      }).catch(function () {
        setMessage("forgot", "Could not reach the server right now. Please try again.", "error");
      });
    });
  }

  if (resendButton) {
    resendButton.addEventListener("click", function () {
      clearMessages();
      var resendEmail = pendingEmail || (signupForm ? signupForm.querySelector('input[name="email"]').value : "");
      var nextField = signupForm ? signupForm.querySelector('input[name="next"]') : null;
      var formData = new FormData();
      formData.append("csrf_token", config.csrfToken || ((signupForm && signupForm.querySelector('input[name="csrf_token"]')) ? signupForm.querySelector('input[name="csrf_token"]').value : ""));
      formData.append("next", nextField ? nextField.value : (config.nextUrl || "/account"));
      formData.append("email", resendEmail);
      request(config.resendEndpoint, formData).then(function (result) {
        var payload = result.payload || {};
        if (!result.response.ok) {
          setMessage("verify", payload.error || "Could not resend the verification email right now.", "error");
          return;
        }
        if (payload.redirect_url) {
          window.location.href = payload.redirect_url;
          return;
        }
        pendingEmail = payload.email || resendEmail;
        setEmailDisplays(pendingEmail);
        setMessage("verify", "Verification email resent.", "success");
      }).catch(function () {
        setMessage("verify", "Could not reach the server right now. Please try again.", "error");
      });
    });
  }

  if (useAnotherButton) {
    useAnotherButton.addEventListener("click", function () {
      pendingEmail = "";
      setEmailDisplays("");
      if (signupForm) {
        signupForm.reset();
      }
      switchView("signup");
    });
  }

  openButtons.forEach(function (button) {
    button.addEventListener("click", function () {
      var view = button.getAttribute("data-open-auth-modal") || "login";
      var nextUrl = button.getAttribute("data-auth-next") || config.nextUrl;
      syncCurrentNext(nextUrl);
      openModal(view);
    });
  });

  closeButtons.forEach(function (button) {
    button.addEventListener("click", function () {
      closeModal();
    });
  });

  switchButtons.forEach(function (button) {
    button.addEventListener("click", function () {
      switchView(button.getAttribute("data-auth-view-target") || "login");
    });
  });

  googleButtons.forEach(function (button) {
    button.addEventListener("click", handleGooglePlaceholder);
  });

  modal.querySelectorAll("[data-password-toggle]").forEach(function (button) {
    button.addEventListener("click", function () {
      togglePasswordVisibility(button);
    });
  });

  document.addEventListener("keydown", function (event) {
    if (event.key === "Escape" && modal.getAttribute("aria-hidden") === "false") {
      closeModal();
    }
  });

  switchView(currentView);
  syncCurrentNext(config.nextUrl || "/account");

  if (config.errorMessage) {
    setMessage(currentView, config.errorMessage, "error");
  }
  if (config.statusMessage) {
    setMessage(currentView, config.statusMessage, "success");
  }

  if (String(config.autoOpen) === "true" || modal.getAttribute("data-auth-auto-open") === "true") {
    openModal(currentView);
  }
})();
