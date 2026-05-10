(function () {
  var modal = document.getElementById("submissionModal");
  var modalTitle = document.getElementById("submissionModalTitle");
  var modalDescription = document.getElementById("submissionModalDescription");
  var openButtons = document.querySelectorAll("[data-open-modal]");
  var closeButtons = document.querySelectorAll("[data-close-modal]");
  var modalForms = document.querySelectorAll("[data-modal-form]");

  if (!modal) {
    return;
  }

  var modalMeta = {
    "visitor-feedback": {
      title: "Visitor Feedback Form",
      description: "For quick comments and ratings from on-site and website visitors.",
    },
    "teacher-corner": {
      title: "Teacher Corner Upload",
      description: "For educators sharing classroom files. Submissions remain pending until admin approval.",
    },
    "stories-submit": {
      title: "Stories Submit Form",
      description: "For community and family heritage stories with optional photo attachments.",
    },
  };

  function closeModal() {
    modal.classList.add("hidden");
    modal.classList.remove("flex");
    modal.setAttribute("aria-hidden", "true");
    document.body.classList.remove("overflow-hidden");
    modalForms.forEach(function (form) {
      form.classList.add("hidden");
    });
  }

  function openModal(formKey) {
    var targetForm = modal.querySelector('[data-modal-form="' + formKey + '"]');
    var meta = modalMeta[formKey];

    if (!targetForm) {
      return;
    }

    modalForms.forEach(function (form) {
      form.classList.add("hidden");
    });
    targetForm.classList.remove("hidden");

    if (modalTitle && meta && meta.title) {
      modalTitle.textContent = meta.title;
    }
    if (modalDescription && meta && meta.description) {
      modalDescription.textContent = meta.description;
    }

    modal.classList.remove("hidden");
    modal.classList.add("flex");
    modal.setAttribute("aria-hidden", "false");
    document.body.classList.add("overflow-hidden");

    var firstInput = targetForm.querySelector("input, select, textarea, button");
    if (firstInput) {
      firstInput.focus();
    }
  }

  openButtons.forEach(function (button) {
    button.addEventListener("click", function () {
      openModal(button.getAttribute("data-open-modal"));
    });
  });

  closeButtons.forEach(function (button) {
    button.addEventListener("click", closeModal);
  });

  document.addEventListener("keydown", function (event) {
    if (event.key === "Escape") {
      closeModal();
    }
  });

  var stars = document.querySelectorAll(".rating-star");
  var ratingInput = document.getElementById("visitorRating");
  var ratingText = document.getElementById("visitorRatingText");
  var rating = 0;

  stars.forEach(function (star) {
    star.addEventListener("click", function () {
      rating = Number(star.getAttribute("data-rating"));
      if (ratingInput) {
        ratingInput.value = String(rating);
      }
      if (ratingText) {
        ratingText.textContent = rating + " out of 5 selected";
      }
      stars.forEach(function (item) {
        var itemRating = Number(item.getAttribute("data-rating"));
        item.classList.toggle("text-amber-400", itemRating <= rating);
        item.classList.toggle("text-gray-300", itemRating > rating);
        item.setAttribute("aria-pressed", itemRating <= rating ? "true" : "false");
      });
    });
  });
})();
