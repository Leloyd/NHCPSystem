(function () {
  function setupPasswordToggle() {
    document.querySelectorAll("[data-password-toggle]").forEach(function (toggle) {
      var passwordInput = document.getElementById(toggle.getAttribute("aria-controls") || "");
      if (!passwordInput) return;
      toggle.addEventListener("click", function () {
        var isVisible = passwordInput.getAttribute("type") === "text";
        passwordInput.setAttribute("type", isVisible ? "password" : "text");
        toggle.classList.toggle("is-visible", !isVisible);
        toggle.setAttribute("aria-pressed", String(!isVisible));
        toggle.setAttribute("aria-label", isVisible ? "Show password" : "Hide password");
      });
    });
  }

  function hideMessage(message) {
    if (!message) return;
    window.clearTimeout(message._adminDismissTimer);
    message.classList.remove("is-dismissing");
    message.hidden = true;
    message.textContent = "";
  }

  function showMessage(message, text, dismissAfter) {
    if (!message) return;
    if (!text) {
      hideMessage(message);
      return;
    }
    window.clearTimeout(message._adminDismissTimer);
    message.textContent = text;
    message.hidden = false;
    message.classList.remove("is-dismissing");
    if (dismissAfter > 0) {
      message._adminDismissTimer = window.setTimeout(function () {
        message.classList.add("is-dismissing");
        message._adminDismissTimer = window.setTimeout(function () {
          hideMessage(message);
        }, 230);
      }, dismissAfter);
    }
  }

  function setupDismissibleMessages() {
    document.querySelectorAll("[data-auto-dismiss]").forEach(function (message) {
      var delay = Number.parseInt(message.getAttribute("data-auto-dismiss") || "3000", 10);
      showMessage(message, message.textContent, Number.isFinite(delay) ? delay : 3000);
    });
  }

  function formatRemainingTime(totalSeconds) {
    var safeSeconds = Math.max(0, Math.ceil(totalSeconds));
    var minutes = Math.floor(safeSeconds / 60);
    var seconds = String(safeSeconds % 60).padStart(2, "0");
    return minutes + ":" + seconds;
  }

  function isOtpStep(form) {
    var otpStep = form.querySelector("[data-admin-otp-step]");
    return Boolean(otpStep && !otpStep.hidden);
  }

  function updateCsrfToken(form, token) {
    var csrfInput = form.querySelector('input[name="csrf_token"]');
    if (csrfInput && token) csrfInput.value = token;
  }

  function startOtpTimers(form, expiresIn, resendIn) {
    var otpStep = form.querySelector("[data-admin-otp-step]");
    var timer = form.querySelector("[data-admin-otp-timer]");
    var resendButton = form.querySelector("[data-admin-otp-resend]");
    var otpInput = form.querySelector("[data-admin-otp-input]");
    if (!otpStep || otpStep.hidden) return;

    window.clearInterval(form._adminOtpTimer);
    var expiresAt = Date.now() + Math.max(0, Number(expiresIn) || 0) * 1000;
    var resendAt = Date.now() + Math.max(0, Number(resendIn) || 0) * 1000;

    function update() {
      var remaining = Math.max(0, Math.ceil((expiresAt - Date.now()) / 1000));
      var resendRemaining = Math.max(0, Math.ceil((resendAt - Date.now()) / 1000));
      if (timer) {
        timer.textContent = remaining > 0 ? "Code expires in " + formatRemainingTime(remaining) : "Code expired";
      }
      if (resendButton) {
        resendButton.disabled = resendRemaining > 0 || remaining <= 0 || form.hasAttribute("data-submitting");
        resendButton.textContent = resendRemaining > 0 ? "Resend in " + formatRemainingTime(resendRemaining) : "Send a new code";
      }
      if (remaining <= 0) {
        window.clearInterval(form._adminOtpTimer);
        if (otpInput) otpInput.disabled = true;
        var submitButton = form.querySelector("[data-admin-login-submit]");
        if (submitButton) submitButton.disabled = true;
        var announcement = form.querySelector("[data-admin-login-announcement]");
        if (announcement) announcement.textContent = "The one-time code expired. Use another account to restart sign-in.";
      }
    }

    update();
    form._adminOtpTimer = window.setInterval(update, 1000);
  }

  function showOtpStep(form, payload) {
    var credentialsStep = form.querySelector("[data-admin-credentials-step]");
    var otpStep = form.querySelector("[data-admin-otp-step]");
    var otpInput = form.querySelector("[data-admin-otp-input]");
    var actionInput = form.querySelector("[data-admin-login-action]");
    var heading = document.querySelector("[data-admin-login-heading]");
    var copy = document.querySelector("[data-admin-login-copy]");
    var passwordInput = form.querySelector('input[name="password"]');
    if (passwordInput) passwordInput.value = "";
    if (credentialsStep) {
      credentialsStep.hidden = true;
      credentialsStep.querySelectorAll("input, button").forEach(function (control) {
        control.disabled = true;
      });
    }
    if (otpStep) {
      otpStep.hidden = false;
      otpStep.setAttribute("data-otp-expires-seconds", String(payload.expires_in || 0));
      otpStep.setAttribute("data-otp-resend-seconds", String(payload.resend_in || 0));
    }
    if (otpInput) {
      otpInput.disabled = false;
      otpInput.required = true;
      otpInput.value = "";
    }
    if (actionInput) actionInput.value = "verify_otp";
    if (heading) heading.textContent = "Verify Your Sign-In";
    if (copy) copy.textContent = "Enter the six-digit code sent to " + (payload.email_hint || "your administrator email") + ".";
    updateCsrfToken(form, payload.csrf_token);
    setReadyState(form);
    startOtpTimers(form, payload.expires_in, payload.resend_in);
    var announcement = form.querySelector("[data-admin-login-announcement]");
    if (announcement) announcement.textContent = "A one-time code was sent. Enter the six digits to continue.";
    if (otpInput) otpInput.focus();
  }

  function showCredentialsStep(form) {
    var credentialsStep = form.querySelector("[data-admin-credentials-step]");
    var otpStep = form.querySelector("[data-admin-otp-step]");
    var otpInput = form.querySelector("[data-admin-otp-input]");
    var actionInput = form.querySelector("[data-admin-login-action]");
    var heading = document.querySelector("[data-admin-login-heading]");
    var copy = document.querySelector("[data-admin-login-copy]");
    window.clearInterval(form._adminOtpTimer);
    if (credentialsStep) {
      credentialsStep.hidden = false;
      credentialsStep.querySelectorAll("input, button").forEach(function (control) {
        control.disabled = false;
      });
    }
    if (otpStep) otpStep.hidden = true;
    if (otpInput) {
      otpInput.disabled = true;
      otpInput.required = false;
      otpInput.value = "";
    }
    if (actionInput) actionInput.value = "credentials";
    if (heading) heading.textContent = "Sign In";
    if (copy) copy.textContent = "Enter your credentials to access the dashboard.";
    setReadyState(form);
  }

  function setReadyState(form) {
    var submitButton = form.querySelector("[data-admin-login-submit]");
    var submitLabel = form.querySelector("[data-admin-login-submit-label]");
    form.removeAttribute("data-submitting");
    form.removeAttribute("aria-busy");
    form.removeAttribute("data-lockout-active");
    form.querySelectorAll("[data-login-lockable]").forEach(function (control) {
      control.disabled = isOtpStep(form) && Boolean(control.closest("[data-admin-credentials-step]"));
    });
    if (submitButton) {
      submitButton.classList.remove("is-loading", "is-locked");
    }
    if (submitLabel) {
      submitLabel.textContent = isOtpStep(form) ? "Verify and Continue" : "Sign In to Dashboard";
    }
    var resendButton = form.querySelector("[data-admin-otp-resend]");
    if (resendButton && isOtpStep(form)) {
      var resendSeconds = Number.parseInt(form.querySelector("[data-admin-otp-step]").getAttribute("data-otp-resend-seconds") || "0", 10);
      resendButton.disabled = resendSeconds > 0;
    }
    var cancelButton = form.querySelector("[data-admin-otp-cancel]");
    if (cancelButton) cancelButton.disabled = false;
  }

  function setSubmittingState(form, label) {
    form.setAttribute("data-submitting", "true");
    form.setAttribute("aria-busy", "true");
    var submitButton = form.querySelector("[data-admin-login-submit]");
    var submitLabel = form.querySelector("[data-admin-login-submit-label]");
    if (submitButton) {
      submitButton.disabled = true;
      submitButton.classList.add("is-loading");
    }
    if (submitLabel) {
      submitLabel.textContent = label || (isOtpStep(form) ? "Verifying code…" : "Signing in…");
    }
    var resendButton = form.querySelector("[data-admin-otp-resend]");
    if (resendButton) resendButton.disabled = true;
    var cancelButton = form.querySelector("[data-admin-otp-cancel]");
    if (cancelButton) cancelButton.disabled = true;
  }

  function startLockout(form, totalSeconds) {
    var seconds = Math.max(1, Number.parseInt(totalSeconds || "0", 10) || 1);
    var submitButton = form.querySelector("[data-admin-login-submit]");
    var submitLabel = form.querySelector("[data-admin-login-submit-label]");
    var passwordInput = form.querySelector('input[name="password"]');
    var errorMessage = document.querySelector("[data-admin-login-error]");
    var warningMessage = document.querySelector("[data-admin-login-warning]");
    var announcement = form.querySelector("[data-admin-login-announcement]");

    window.clearInterval(form._adminLockoutTimer);
    form.removeAttribute("data-submitting");
    form.removeAttribute("aria-busy");
    form.setAttribute("data-lockout-active", "true");
    form.querySelectorAll("[data-login-lockable]").forEach(function (control) {
      control.disabled = true;
    });
    if (passwordInput) passwordInput.value = "";
    if (submitButton) submitButton.classList.remove("is-loading");
    if (submitButton) submitButton.classList.add("is-locked");
    if (announcement) {
      announcement.textContent = "Administrator login is temporarily locked. The form will unlock automatically.";
    }

    var unlockAt = Date.now() + seconds * 1000;
    form.setAttribute("data-lockout-until", String(unlockAt));

    function updateTimer() {
      var remaining = Math.max(0, Math.ceil((unlockAt - Date.now()) / 1000));
      form.setAttribute("data-lockout-seconds", String(remaining));
      if (remaining > 0) {
        if (submitLabel) submitLabel.textContent = "Try again in " + formatRemainingTime(remaining);
        return;
      }

      window.clearInterval(form._adminLockoutTimer);
      form.removeAttribute("data-lockout-until");
      form.setAttribute("data-lockout-seconds", "0");
      setReadyState(form);
      hideMessage(errorMessage);
      showMessage(warningMessage, "The temporary login lock has ended. You may sign in again.", 4000);
      if (announcement) announcement.textContent = "The login form is available again.";
    }

    updateTimer();
    form._adminLockoutTimer = window.setInterval(updateTimer, 1000);
  }

  function setupSubmitGuard() {
    document.querySelectorAll("[data-admin-login-form]").forEach(function (form) {
      var initialLockout = Number.parseInt(form.getAttribute("data-lockout-seconds") || "0", 10);
      if (initialLockout > 0) {
        startLockout(form, initialLockout);
      } else {
        setReadyState(form);
      }

      var initialOtpStep = form.querySelector("[data-admin-otp-step]");
      if (initialOtpStep && !initialOtpStep.hidden) {
        startOtpTimers(
          form,
          initialOtpStep.getAttribute("data-otp-expires-seconds"),
          initialOtpStep.getAttribute("data-otp-resend-seconds")
        );
      }

      var otpInput = form.querySelector("[data-admin-otp-input]");
      if (otpInput) {
        otpInput.addEventListener("input", function () {
          otpInput.value = otpInput.value.replace(/\D/g, "").slice(0, 6);
        });
      }

      form.addEventListener("submit", function (event) {
        if (form.hasAttribute("data-submitting") || form.hasAttribute("data-lockout-active")) {
          event.preventDefault();
          return;
        }

        if (typeof window.fetch !== "function") {
          setSubmittingState(form);
          return;
        }

        event.preventDefault();
        var formData = new FormData(form);
        if (event.submitter && event.submitter.name === "cancel_otp") {
          formData.set("cancel_otp", "1");
        }
        setSubmittingState(form);
        var errorMessage = document.querySelector("[data-admin-login-error]");
        var warningMessage = document.querySelector("[data-admin-login-warning]");
        var successMessage = document.querySelector("[data-admin-login-success]");

        window.fetch(form.action || window.location.href, {
          method: "POST",
          body: formData,
          credentials: "same-origin",
          headers: {
            Accept: "application/json",
            "X-Requested-With": "XMLHttpRequest",
          },
        }).then(function (response) {
          return response.json().then(function (payload) {
            return { response: response, payload: payload };
          });
        }).then(function (result) {
          var payload = result.payload || {};
          if (result.response.ok && payload.ok && payload.redirect) {
            window.location.assign(payload.redirect);
            return;
          }

          if (result.response.ok && payload.credentials_required) {
            updateCsrfToken(form, payload.csrf_token);
            showCredentialsStep(form);
            hideMessage(errorMessage);
            hideMessage(warningMessage);
            hideMessage(successMessage);
            var emailInput = form.querySelector('input[name="email"]');
            if (emailInput) emailInput.focus();
            return;
          }

          if (payload.otp_required) {
            showOtpStep(form, payload);
            showMessage(errorMessage, payload.error || "", 0);
            showMessage(warningMessage, payload.warning || "", 0);
            showMessage(successMessage, payload.message || "", payload.message ? 4000 : 0);
            return;
          }

          if (isOtpStep(form)) showCredentialsStep(form);

          var errorText = payload.error || "Sign in could not be completed. Please try again.";
          showMessage(errorMessage, errorText, errorText === "Invalid credentials." ? 3000 : 0);
          showMessage(warningMessage, payload.warning || "", 0);
          hideMessage(successMessage);
          if (payload.locked && payload.retry_after_seconds > 0) {
            startLockout(form, payload.retry_after_seconds);
          } else {
            setReadyState(form);
          }
        }).catch(function () {
          showMessage(errorMessage, "The sign-in request could not be completed. Check your connection and try again.", 0);
          hideMessage(warningMessage);
          setReadyState(form);
        });
      });

      var resendButton = form.querySelector("[data-admin-otp-resend]");
      if (resendButton) {
        resendButton.addEventListener("click", function () {
          if (form.hasAttribute("data-submitting") || resendButton.disabled) return;
          var formData = new FormData(form);
          formData.set("login_action", "resend_otp");
          formData.delete("otp_code");
          var errorMessage = document.querySelector("[data-admin-login-error]");
          var warningMessage = document.querySelector("[data-admin-login-warning]");
          var successMessage = document.querySelector("[data-admin-login-success]");
          setSubmittingState(form, "Sending new code…");
          window.fetch(form.action || window.location.href, {
            method: "POST",
            body: formData,
            credentials: "same-origin",
            headers: { Accept: "application/json", "X-Requested-With": "XMLHttpRequest" },
          }).then(function (response) {
            return response.json().then(function (payload) {
              return { response: response, payload: payload };
            });
          }).then(function (result) {
            var payload = result.payload || {};
            if (payload.otp_required) {
              showOtpStep(form, payload);
              showMessage(errorMessage, payload.error || "", 0);
              showMessage(warningMessage, payload.warning || "", 0);
              showMessage(successMessage, payload.message || "", payload.message ? 4000 : 0);
              return;
            }
            showCredentialsStep(form);
            showMessage(errorMessage, payload.error || "A new code could not be sent.", 0);
            hideMessage(warningMessage);
            hideMessage(successMessage);
          }).catch(function () {
            showMessage(errorMessage, "A new code could not be sent. Check your connection and try again.", 0);
            hideMessage(warningMessage);
            setReadyState(form);
          });
        });
      }
    });

    window.addEventListener("pageshow", function () {
      document.querySelectorAll("[data-admin-login-form]").forEach(function (form) {
        var unlockAt = Number.parseInt(form.getAttribute("data-lockout-until") || "0", 10);
        if (unlockAt > Date.now()) {
          startLockout(form, Math.ceil((unlockAt - Date.now()) / 1000));
        } else {
          setReadyState(form);
        }
      });
    });
  }

  function animateLogin() {
    if (typeof window.gsap === "undefined") {
      return;
    }

    var gsap = window.gsap;
    var panel = document.querySelector(".admin-auth-panel");
    var backdrop = document.querySelector(".admin-auth-backdrop");
    var brand = document.querySelector(".admin-auth-brand");
    var badge = document.querySelector(".admin-auth-brand-badge");
    var footer = document.querySelector(".admin-auth-footer");
    var glows = document.querySelectorAll(".admin-auth-glow");
    var fields = document.querySelectorAll(
      ".admin-auth-card-title, .admin-auth-card-copy, .admin-auth-error, .admin-auth-warning, .admin-auth-field, .admin-auth-meta, .admin-auth-submit"
    );

    if (!panel || !backdrop) {
      return;
    }

    gsap.fromTo(backdrop, { opacity: 0.08 }, { opacity: 0.24, duration: 0.65, ease: "power2.out" });
    gsap.fromTo(
      panel,
      { y: 22, autoAlpha: 0, scale: 0.985 },
      { y: 0, autoAlpha: 1, scale: 1, duration: 0.52, ease: "power2.out" }
    );

    if (brand) {
      gsap.fromTo(
        brand,
        { y: -12, autoAlpha: 0 },
        { y: 0, autoAlpha: 1, duration: 0.42, delay: 0.06, ease: "power2.out" }
      );
    }

    if (badge) {
      gsap.fromTo(
        badge,
        { scale: 0.92, autoAlpha: 0 },
        { scale: 1, autoAlpha: 1, duration: 0.38, delay: 0.1, ease: "back.out(1.6)" }
      );
    }

    if (fields.length > 0) {
      gsap.fromTo(
        fields,
        { y: 8, autoAlpha: 0 },
        { y: 0, autoAlpha: 1, duration: 0.28, stagger: 0.05, delay: 0.18, ease: "power2.out" }
      );
    }

    if (footer) {
      gsap.fromTo(
        footer,
        { y: 6, autoAlpha: 0 },
        { y: 0, autoAlpha: 1, duration: 0.3, delay: 0.3, ease: "power2.out" }
      );
    }

    if (glows.length > 0) {
      gsap.fromTo(glows, { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.7, stagger: 0.08, ease: "power2.out" });
    }

    document.addEventListener("mousemove", function (event) {
      var x = ((event.clientX / window.innerWidth) - 0.5) * 8;
      var y = ((event.clientY / window.innerHeight) - 0.5) * 8;
      gsap.to(backdrop, {
        x: x,
        y: y,
        duration: 0.35,
        overwrite: "auto",
        ease: "power1.out",
      });
    });
  }

  function init() {
    setupPasswordToggle();
    setupDismissibleMessages();
    setupSubmitGuard();
    animateLogin();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
