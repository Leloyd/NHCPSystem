(function () {
  function animateLogin() {
    if (typeof window.gsap === "undefined") {
      return;
    }

    var gsap = window.gsap;
    var panel = document.querySelector(".admin-auth-panel");
    var backdrop = document.querySelector(".admin-auth-backdrop");
    var logo = document.querySelector(".admin-auth-logo");
    var brand = document.querySelector(".admin-auth-brand");
    var fields = document.querySelectorAll(".admin-auth-field, .admin-auth-submit, .admin-auth-error");

    if (!panel || !backdrop) {
      return;
    }

    gsap.fromTo(backdrop, { opacity: 0.4 }, { opacity: 1, duration: 0.55, ease: "power2.out" });
    gsap.fromTo(
      panel,
      { y: 20, autoAlpha: 0, scale: 0.985 },
      { y: 0, autoAlpha: 1, scale: 1, duration: 0.5, ease: "power2.out" }
    );

    if (logo) {
      gsap.fromTo(
        logo,
        { y: -10, autoAlpha: 0 },
        { y: 0, autoAlpha: 1, duration: 0.35, delay: 0.08, ease: "power2.out" }
      );
    }

    if (brand) {
      gsap.fromTo(
        brand,
        { y: 8, autoAlpha: 0 },
        { y: 0, autoAlpha: 1, duration: 0.34, delay: 0.12, ease: "power2.out" }
      );
    }

    if (fields.length > 0) {
      gsap.fromTo(
        fields,
        { y: 8, autoAlpha: 0 },
        { y: 0, autoAlpha: 1, duration: 0.28, stagger: 0.05, delay: 0.18, ease: "power2.out" }
      );
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

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", animateLogin);
  } else {
    animateLogin();
  }
})();
