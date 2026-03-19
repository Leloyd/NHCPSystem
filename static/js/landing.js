(function () {
  const menuToggle = document.getElementById("menuToggle");
  const mobileMenu = document.getElementById("mobileMenu");
  const iconMenu = document.getElementById("iconMenu");
  const iconClose = document.getElementById("iconClose");

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
})();
