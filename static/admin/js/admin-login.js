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

  function setReadyState(form) {
    var submitButton = form.querySelector("[data-admin-login-submit]");
    var submitLabel = form.querySelector("[data-admin-login-submit-label]");
    form.removeAttribute("data-submitting");
    form.removeAttribute("aria-busy");
    form.removeAttribute("data-lockout-active");
    form.querySelectorAll("[data-login-lockable]").forEach(function (control) {
      control.disabled = false;
    });
    if (submitButton) {
      submitButton.classList.remove("is-loading", "is-locked");
    }
    if (submitLabel) {
      submitLabel.textContent = "Sign In to Dashboard";
    }
  }

  function setSubmittingState(form) {
    form.setAttribute("data-submitting", "true");
    form.setAttribute("aria-busy", "true");
    var submitButton = form.querySelector("[data-admin-login-submit]");
    var submitLabel = form.querySelector("[data-admin-login-submit-label]");
    if (submitButton) {
      submitButton.disabled = true;
      submitButton.classList.add("is-loading");
    }
    if (submitLabel) {
      submitLabel.textContent = "Signing in…";
    }
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
        setSubmittingState(form);
        var errorMessage = document.querySelector("[data-admin-login-error]");
        var warningMessage = document.querySelector("[data-admin-login-warning]");

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

          var errorText = payload.error || "Sign in could not be completed. Please try again.";
          showMessage(errorMessage, errorText, errorText === "Invalid credentials." ? 3000 : 0);
          showMessage(warningMessage, payload.warning || "", 0);
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
