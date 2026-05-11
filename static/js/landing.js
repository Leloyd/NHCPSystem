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

  if (window.lucide && typeof window.lucide.createIcons === "function") {
    window.lucide.createIcons();
  }

  ensureFavicon();
})();
