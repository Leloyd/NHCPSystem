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

  function initDetailMediaGallery() {
    var gallery = document.querySelector("[data-highlight-detail-gallery]");
    var dataElement = document.getElementById("communityHighlightGalleryData");
    if (!gallery || !dataElement) {
      return;
    }

    var images = [];
    try {
      var parsedImages = JSON.parse(dataElement.textContent || "[]");
      images = Array.isArray(parsedImages)
        ? parsedImages.filter(function (image) {
            return image && String(image.url || "").trim();
          })
        : [];
    } catch (error) {
      console.error("Failed to parse community highlight gallery.", error);
    }
    if (!images.length) {
      return;
    }

    var title = String(gallery.getAttribute("data-highlight-gallery-title") || "Community highlight").trim();
    var openButton = gallery.querySelector("[data-highlight-gallery-open]");
    var mainImage = gallery.querySelector("[data-highlight-gallery-image]");
    var previousButton = gallery.querySelector("[data-highlight-gallery-previous]");
    var nextButton = gallery.querySelector("[data-highlight-gallery-next]");
    var counter = gallery.querySelector("[data-highlight-gallery-counter]");
    var lightbox = document.querySelector("[data-highlight-gallery-lightbox]");
    var lightboxImage = lightbox && lightbox.querySelector("[data-highlight-gallery-lightbox-image]");
    var lightboxCounter = lightbox && lightbox.querySelector("[data-highlight-gallery-lightbox-counter]");
    var lightboxPrevious = lightbox && lightbox.querySelector("[data-highlight-gallery-lightbox-previous]");
    var lightboxNext = lightbox && lightbox.querySelector("[data-highlight-gallery-lightbox-next]");
    var lightboxCloseButtons = lightbox
      ? Array.prototype.slice.call(lightbox.querySelectorAll("[data-highlight-gallery-close]"))
      : [];
    var lightboxClose = lightboxCloseButtons.find(function (button) {
      return button.classList.contains("ogd-detail-lightbox__close");
    });
    var currentIndex = 0;
    var previousFocus = null;
    var closeTimer = 0;
    var touchStartX = null;

    function normalizedIndex(index) {
      return (index + images.length) % images.length;
    }

    function preloadNeighbors() {
      if (images.length < 2) {
        return;
      }
      [normalizedIndex(currentIndex - 1), normalizedIndex(currentIndex + 1)].forEach(function (index) {
        var preload = new Image();
        preload.src = images[index].url;
      });
    }

    function renderImage(index) {
      currentIndex = normalizedIndex(index);
      var image = images[currentIndex];
      var positionLabel = currentIndex + 1 + " / " + images.length;
      if (mainImage) {
        mainImage.src = image.url;
        mainImage.alt = title + " — image " + (currentIndex + 1) + " of " + images.length;
      }
      if (lightboxImage) {
        lightboxImage.src = image.url;
        lightboxImage.alt = title + " — expanded image " + (currentIndex + 1) + " of " + images.length;
      }
      if (counter) {
        counter.textContent = positionLabel;
      }
      if (lightboxCounter) {
        lightboxCounter.textContent = positionLabel;
      }
      preloadNeighbors();
    }

    function showPrevious() {
      renderImage(currentIndex - 1);
    }

    function showNext() {
      renderImage(currentIndex + 1);
    }

    function openLightbox() {
      if (!lightbox || !lightboxImage) {
        return;
      }
      if (closeTimer) {
        window.clearTimeout(closeTimer);
        closeTimer = 0;
      }
      previousFocus = document.activeElement;
      renderImage(currentIndex);
      lightbox.hidden = false;
      lightbox.setAttribute("aria-hidden", "false");
      document.body.classList.add("ogd-detail-lightbox-open");
      window.requestAnimationFrame(function () {
        lightbox.classList.add("is-open");
        if (lightboxClose) {
          lightboxClose.focus();
        }
      });
    }

    function closeLightbox() {
      if (!lightbox || lightbox.hidden) {
        return;
      }
      lightbox.classList.remove("is-open");
      lightbox.setAttribute("aria-hidden", "true");
      document.body.classList.remove("ogd-detail-lightbox-open");
      closeTimer = window.setTimeout(function () {
        lightbox.hidden = true;
        closeTimer = 0;
      }, 180);
      if (previousFocus && typeof previousFocus.focus === "function") {
        previousFocus.focus();
      }
      previousFocus = null;
    }

    function startSwipe(event) {
      var touch = event.changedTouches && event.changedTouches[0];
      touchStartX = touch ? touch.clientX : null;
    }

    function finishSwipe(event) {
      if (touchStartX === null) {
        return;
      }
      var touch = event.changedTouches && event.changedTouches[0];
      var deltaX = touch ? touch.clientX - touchStartX : 0;
      touchStartX = null;
      if (Math.abs(deltaX) < 45) {
        return;
      }
      if (deltaX > 0) {
        showPrevious();
      } else {
        showNext();
      }
    }

    if (openButton) {
      openButton.addEventListener("click", openLightbox);
    }
    if (previousButton) {
      previousButton.addEventListener("click", showPrevious);
    }
    if (nextButton) {
      nextButton.addEventListener("click", showNext);
    }
    if (lightboxPrevious) {
      lightboxPrevious.addEventListener("click", showPrevious);
    }
    if (lightboxNext) {
      lightboxNext.addEventListener("click", showNext);
    }
    lightboxCloseButtons.forEach(function (button) {
      button.addEventListener("click", closeLightbox);
    });
    if (lightbox) {
      lightbox.addEventListener("touchstart", startSwipe, { passive: true });
      lightbox.addEventListener("touchend", finishSwipe, { passive: true });
    }

    document.addEventListener("keydown", function (event) {
      if (!lightbox || lightbox.hidden) {
        return;
      }
      if (event.key === "Escape") {
        closeLightbox();
      } else if (event.key === "ArrowLeft" && images.length > 1) {
        showPrevious();
      } else if (event.key === "ArrowRight" && images.length > 1) {
        showNext();
      } else if (event.key === "Tab") {
        var focusable = Array.prototype.slice.call(
          lightbox.querySelectorAll("button:not([disabled])")
        ).filter(function (button) {
          return button.offsetParent !== null && button.tabIndex >= 0;
        });
        if (!focusable.length) {
          return;
        }
        var first = focusable[0];
        var last = focusable[focusable.length - 1];
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first.focus();
        }
      }
    });

    renderImage(0);
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

  if (menuToggle && mobileMenu && iconMenu && iconClose && menuToggle.dataset.navBound !== "true") {
    menuToggle.dataset.navBound = "true";
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
  initDetailMediaGallery();
  initGsapReveal();
})();
