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

  function initNewsCarousels() {
    var carousels = document.querySelectorAll("[data-news-carousel]");

    carousels.forEach(function (carousel) {
      var track = carousel.querySelector("[data-news-track]");
      var cards = carousel.querySelectorAll("[data-news-card]");
      var nextButton = carousel.querySelector("[data-news-next]");
      var prevButton = carousel.querySelector("[data-news-prev]");

      if (!track || cards.length === 0) {
        return;
      }

      var currentIndex = 0;

      function getVisibleCount() {
        if (window.innerWidth <= 768) {
          return 1;
        }
        if (window.innerWidth <= 1024) {
          return 2;
        }
        return 3;
      }

      function getMaxIndex() {
        return Math.max(0, cards.length - getVisibleCount());
      }

      function updateButtons() {
        if (prevButton) {
          prevButton.disabled = currentIndex <= 0;
        }
        if (nextButton) {
          nextButton.disabled = currentIndex >= getMaxIndex();
        }
      }

      function updateCarousel() {
        var card = cards[0];
        if (!card) {
          return;
        }

        var cardStyles = window.getComputedStyle(card);
        var trackStyles = window.getComputedStyle(track);
        var cardWidth = card.getBoundingClientRect().width;
        var gap = parseFloat(trackStyles.columnGap || trackStyles.gap || cardStyles.marginRight || "0") || 0;
        var translateX = currentIndex * (cardWidth + gap);
        track.style.transform = "translateX(-" + translateX + "px)";
        updateButtons();
      }

      if (nextButton) {
        nextButton.addEventListener("click", function () {
          currentIndex = Math.min(getMaxIndex(), currentIndex + 1);
          updateCarousel();
        });
      }

      if (prevButton) {
        prevButton.addEventListener("click", function () {
          currentIndex = Math.max(0, currentIndex - 1);
          updateCarousel();
        });
      }

      window.addEventListener("resize", function () {
        currentIndex = Math.min(currentIndex, getMaxIndex());
        updateCarousel();
      });

      updateCarousel();
    });
  }

  function initGsapReveal() {
    if (typeof window.gsap === "undefined") {
      return;
    }

    var gsap = window.gsap;
    var revealItems = document.querySelectorAll(".news-reveal, .news-card, .news-detail-card, .news-social-card");

    if (revealItems.length > 0) {
      gsap.fromTo(
        revealItems,
        { y: 24, autoAlpha: 0 },
        { y: 0, autoAlpha: 1, duration: 0.65, stagger: 0.08, ease: "power2.out" }
      );
    }
  }

  var menuToggle = document.getElementById("menuToggle");
  var mobileMenu = document.getElementById("mobileMenu");
  var iconMenu = document.getElementById("iconMenu");
  var iconClose = document.getElementById("iconClose");

  if (menuToggle && mobileMenu && iconMenu && iconClose) {
    menuToggle.addEventListener("click", function () {
      mobileMenu.classList.toggle("hidden");
      iconMenu.classList.toggle("hidden");
      iconClose.classList.toggle("hidden");
    });
  }

  if (window.lucide && typeof window.lucide.createIcons === "function") {
    window.lucide.createIcons();
  }

  ensureFavicon();
  initNewsCarousels();
  initGsapReveal();
})();
