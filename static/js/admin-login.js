(function () {
  function setupPasswordToggle() {
    var toggle = document.querySelector("[data-password-toggle]");
    var passwordInput = document.getElementById("adminPassword");

    if (!toggle || !passwordInput) {
      return;
    }

    toggle.addEventListener("click", function () {
      var isVisible = passwordInput.getAttribute("type") === "text";
      passwordInput.setAttribute("type", isVisible ? "password" : "text");
      toggle.classList.toggle("is-visible", !isVisible);
      toggle.setAttribute("aria-pressed", String(!isVisible));
      toggle.setAttribute("aria-label", isVisible ? "Show password" : "Hide password");
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
      ".admin-auth-card-title, .admin-auth-card-copy, .admin-auth-error, .admin-auth-field, .admin-auth-meta, .admin-auth-submit"
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
    animateLogin();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
