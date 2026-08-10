(function () {
  "use strict";

  var password = document.getElementById("resetPassword");
  var confirmation = document.getElementById("resetConfirmPassword");
  var lengthCheck = document.querySelector('[data-password-check="length"]');
  var matchCheck = document.querySelector('[data-password-check="match"]');

  function updateChecks() {
    if (!password || !confirmation) return;
    var lengthValid = password.value.length >= 8 && password.value.length <= 128;
    var matchValid = Boolean(confirmation.value) && password.value === confirmation.value;
    if (lengthCheck) lengthCheck.classList.toggle("is-valid", lengthValid);
    if (matchCheck) matchCheck.classList.toggle("is-valid", matchValid);
  }

  [password, confirmation].forEach(function (input) {
    if (input) input.addEventListener("input", updateChecks);
  });

  document.querySelectorAll("[data-reset-password-toggle]").forEach(function (button) {
    button.addEventListener("click", function () {
      var input = document.getElementById(button.getAttribute("data-reset-password-toggle") || "");
      if (!input) return;
      var willShow = input.type === "password";
      input.type = willShow ? "text" : "password";
      button.setAttribute("aria-label", willShow ? "Hide password" : "Show password");
    });
  });

  updateChecks();
})();
