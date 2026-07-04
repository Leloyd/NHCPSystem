(function () {
  function ensureFavicon() {
    var faviconHref = "/static/images/UndergroundLogo.jpg";
    var faviconLink = document.querySelector("link[rel='icon']") || document.querySelector("link[rel='shortcut icon']");

    if (!faviconLink) {
      faviconLink = document.createElement("link");
      faviconLink.rel = "icon";
      document.head.appendChild(faviconLink);
    }

    faviconLink.type = "image/jpeg";
    faviconLink.href = faviconHref;
  }

  function initNavScrollEffect() {
    var navHeader = document.getElementById("publicNavHeader");
    var navMode = navHeader ? navHeader.getAttribute("data-nav-mode") : null;

    if (!navHeader || navMode !== "transparent") {
      return;
    }

    var navTitle = document.getElementById("navTitle");
    var navLinks = document.querySelectorAll("[data-nav-link]");
    var navToggle = document.querySelector("[data-nav-toggle]");
    var publicAccountToggle = document.getElementById("publicAccountDropdownToggle");
    var mobileMenu = document.getElementById("mobileMenu");
    var menuToggle = document.getElementById("menuToggle");
    var isMobileMenuOpen = false;

    function applyWhiteBackground() {
      navHeader.classList.remove("bg-transparent");
      navHeader.classList.add("bg-white/95", "backdrop-blur-sm", "shadow-sm");

      if (navTitle) {
        navTitle.classList.remove("text-white");
        navTitle.classList.add("text-amber-800");
      }

      navLinks.forEach(function (link) {
        link.classList.remove("text-white/90", "hover:text-white", "text-[#D4AF6A]");
        if (link.textContent.trim() === "Home") {
          link.classList.add("text-amber-800", "font-semibold");
        } else {
          link.classList.add("text-gray-700", "hover:text-amber-800");
        }
      });

      if (navToggle) {
        navToggle.classList.remove("text-white");
        navToggle.classList.add("text-gray-700");
      }

      if (publicAccountToggle) {
        publicAccountToggle.classList.remove("is-home-top");
      }

      if (mobileMenu) {
        mobileMenu.classList.remove("border-white/20");
        mobileMenu.classList.add("border-gray-200");
      }
    }

    function applyTransparentBackground() {
      navHeader.classList.add("bg-transparent");
      navHeader.classList.remove("bg-white/95", "backdrop-blur-sm", "shadow-sm");

      if (navTitle) {
        navTitle.classList.add("text-white");
        navTitle.classList.remove("text-amber-800");
      }

      navLinks.forEach(function (link) {
        link.classList.remove("text-gray-700", "hover:text-amber-800", "text-amber-800");
        if (link.textContent.trim() === "Home") {
          link.classList.add("text-[#D4AF6A]", "font-semibold");
        } else {
          link.classList.add("text-white/90", "hover:text-white");
        }
      });

      if (navToggle) {
        navToggle.classList.add("text-white");
        navToggle.classList.remove("text-gray-700");
      }

      if (publicAccountToggle) {
        publicAccountToggle.classList.add("is-home-top");
      }

      if (mobileMenu) {
        mobileMenu.classList.add("border-white/20");
        mobileMenu.classList.remove("border-gray-200");
      }
    }

    // The landing nav stays transparent while scrolling (the immersive stage
    // is dark end-to-end). The white background only applies while the mobile
    // menu is open, for readability.
    if (menuToggle && mobileMenu) {
      menuToggle.addEventListener("click", function () {
        isMobileMenuOpen = !mobileMenu.classList.contains("hidden");

        if (isMobileMenuOpen) {
          applyWhiteBackground();
        } else {
          applyTransparentBackground();
        }
      });
    }

    window.addEventListener("public-nav-mobile-menu-state", function (event) {
      isMobileMenuOpen = Boolean(event && event.detail && event.detail.isOpen);

      if (isMobileMenuOpen) {
        applyWhiteBackground();
      } else {
        applyTransparentBackground();
      }
    });
  }

  function initGSAPAnimations() {
    if (typeof window.gsap === "undefined") {
      return;
    }

    var gsap = window.gsap;
    var ScrollTrigger = window.ScrollTrigger;

    if (ScrollTrigger) {
      gsap.registerPlugin(ScrollTrigger);
    }

    var heroSection = document.querySelector("#hero");
    if (heroSection) {
      var heroBadge = heroSection.querySelector(".inline-flex.items-center.gap-2");
      var heroTitle = heroSection.querySelector("h1");
      var heroSubtitle = heroSection.querySelector("p.text-white\\/60");
      var heroDivider = heroSection.querySelector(".h-px.w-24");
      var heroTagline = heroSection.querySelector("p.text-white\\/75");
      var heroButton = heroSection.querySelector("button.group");
      var heroFooter = heroSection.querySelector("p.mt-4");
      var heroScroll = heroSection.querySelector("button.absolute.bottom-8");

      gsap.fromTo(
        heroBadge,
        { y: -30, autoAlpha: 0 },
        { y: 0, autoAlpha: 1, duration: 0.8, delay: 0.2, ease: "power2.out" }
      );

      gsap.fromTo(
        heroTitle,
        { y: 40, autoAlpha: 0 },
        { y: 0, autoAlpha: 1, duration: 1, delay: 0.4, ease: "power3.out" }
      );

      gsap.fromTo(
        heroSubtitle,
        { y: 20, autoAlpha: 0 },
        { y: 0, autoAlpha: 1, duration: 0.8, delay: 0.6, ease: "power2.out" }
      );

      gsap.fromTo(
        heroDivider,
        { scaleX: 0, autoAlpha: 0 },
        { scaleX: 1, autoAlpha: 1, duration: 0.6, delay: 0.8, ease: "power2.out" }
      );

      gsap.fromTo(
        heroTagline,
        { y: 20, autoAlpha: 0 },
        { y: 0, autoAlpha: 1, duration: 0.8, delay: 1, ease: "power2.out" }
      );

      gsap.fromTo(
        heroButton,
        { y: 20, autoAlpha: 0 },
        { y: 0, autoAlpha: 1, duration: 0.8, delay: 1.2, ease: "power2.out" }
      );

      gsap.fromTo(
        heroFooter,
        { autoAlpha: 0 },
        { autoAlpha: 1, duration: 0.6, delay: 1.4, ease: "power2.out" }
      );

      gsap.fromTo(
        heroScroll,
        { y: 20, autoAlpha: 0 },
        { y: 0, autoAlpha: 1, duration: 0.8, delay: 1.6, ease: "power2.out" }
      );
    }

    if (ScrollTrigger) {
      var sections = ["#testament", "#about", "#history", "#visitor-info", "#rules"];

      sections.forEach(function (selector) {
        var section = document.querySelector(selector);
        if (!section) return;

        var sectionLabel = section.querySelector(".flex.items-center.gap-3");
        var sectionHeading = section.querySelector("h2");
        var sectionContent = section.querySelectorAll(".grid > div, .space-y-16 > div, .space-y-6 > div");

        if (sectionLabel) {
          gsap.fromTo(
            sectionLabel,
            { x: -30, autoAlpha: 0 },
            {
              x: 0,
              autoAlpha: 1,
              duration: 0.8,
              ease: "power2.out",
              scrollTrigger: {
                trigger: sectionLabel,
                start: "top 85%",
                toggleActions: "play none none none",
              },
            }
          );
        }

        if (sectionHeading) {
          gsap.fromTo(
            sectionHeading,
            { y: 30, autoAlpha: 0 },
            {
              y: 0,
              autoAlpha: 1,
              duration: 0.9,
              ease: "power3.out",
              scrollTrigger: {
                trigger: sectionHeading,
                start: "top 85%",
                toggleActions: "play none none none",
              },
            }
          );
        }

        if (sectionContent.length > 0) {
          gsap.fromTo(
            sectionContent,
            { y: 40, autoAlpha: 0 },
            {
              y: 0,
              autoAlpha: 1,
              duration: 0.8,
              stagger: 0.15,
              ease: "power2.out",
              scrollTrigger: {
                trigger: section,
                start: "top 75%",
                toggleActions: "play none none none",
              },
            }
          );
        }
      });
    }
  }

  if (window.lucide && typeof window.lucide.createIcons === "function") {
    window.lucide.createIcons();
  }

  ensureFavicon();
  initNavScrollEffect();

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initGSAPAnimations);
  } else {
    initGSAPAnimations();
  }
})();
