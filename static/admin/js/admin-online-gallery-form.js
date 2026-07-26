(function () {
  "use strict";

  var editor = document.querySelector("[data-gallery-editor]");
  if (!editor) {
    return;
  }

  var categorySelect = editor.querySelector("[data-gallery-editor-category]");
  var statusSelect = editor.querySelector("[data-gallery-editor-status]");
  var statusNote = editor.querySelector("[data-gallery-editor-status-note]");
  var visibility = editor.querySelector("[data-gallery-editor-visibility]");
  var visibilityText = editor.querySelector("[data-gallery-editor-visibility-text]");
  var visibilityPath = editor.querySelector("[data-gallery-editor-visibility-icon]");
  var languageButtons = Array.prototype.slice.call(
    editor.querySelectorAll("[data-gallery-editor-lang]")
  );
  var languagePanels = Array.prototype.slice.call(
    editor.querySelectorAll("[data-gallery-editor-lang-panel]")
  );
  var languageLabels = Array.prototype.slice.call(
    editor.querySelectorAll("[data-gallery-editor-language-label]")
  );
  var titleInputs = {
    en: editor.querySelector('[data-gallery-editor-title="en"]'),
    tl: editor.querySelector('[data-gallery-editor-title="tl"]'),
  };
  var locationInputs = {
    en: editor.querySelector('[data-gallery-editor-location="en"]'),
    tl: editor.querySelector('[data-gallery-editor-location="tl"]'),
  };
  var yearInput = editor.querySelector("[data-gallery-editor-year]");
  var copyFields = Array.prototype.slice.call(
    editor.querySelectorAll("[data-gallery-editor-copy]")
  );
  var imageInput = editor.querySelector("[data-gallery-editor-image-input]");
  var imagePreview = editor.querySelector("[data-gallery-editor-image-preview]");
  var imageFallback = editor.querySelector("[data-gallery-editor-image-fallback]");
  var fallbackLetter = editor.querySelector("[data-gallery-editor-fallback-letter]");
  var modelInput = editor.querySelector("[data-gallery-editor-model-input]");
  var modelPreview = editor.querySelector("[data-gallery-editor-model-preview]");
  var modelFallback = editor.querySelector("[data-gallery-editor-model-fallback]");
  var modelName = editor.querySelector("[data-gallery-editor-model-name]");
  var mediaTabs = Array.prototype.slice.call(
    editor.querySelectorAll("[data-gallery-editor-media-tab]")
  );
  var mediaPanels = Array.prototype.slice.call(
    editor.querySelectorAll("[data-gallery-editor-media-panel]")
  );
  var uploadFeedback = editor.querySelector("[data-gallery-editor-upload-feedback]");
  var readTime = editor.querySelector("[data-gallery-editor-read-time]");
  var conditionalFields = {
    year_label: editor.querySelector('[data-category-field="year_label"]'),
    location: editor.querySelector('[data-category-field="location"]'),
  };
  var visibilityByCategory = {
    "mga-rehiyunal-na-kaugalian-regional-customs": ["location"],
    "mga-paniniwala-sa-buong-bansa-beliefs-across-the-nation": [],
    "kasaysayan-history": ["year_label"],
    "materyales-materials": [],
  };
  var activeLanguage = "en";
  var activeMedia = "image";
  var selectedCategoryFields = [];
  var imageObjectUrl = "";
  var modelObjectUrl = "";
  var hasSavedImage =
    editor.getAttribute("data-gallery-editor-has-image") === "1";

  function normalize(value) {
    return String(value || "").trim();
  }

  function resizeTextarea(field) {
    if (!field || field.tagName !== "TEXTAREA") {
      return;
    }
    field.style.height = "auto";
    field.style.height = Math.min(Math.max(field.scrollHeight, 112), 416) + "px";
  }

  function showFeedback(message, isError) {
    if (!uploadFeedback) {
      return;
    }
    uploadFeedback.textContent = message;
    uploadFeedback.classList.toggle("is-error", Boolean(isError));
    uploadFeedback.hidden = !message;
  }

  function setMedia(media) {
    activeMedia = media === "model" ? "model" : "image";
    mediaTabs.forEach(function (button) {
      var isActive =
        button.getAttribute("data-gallery-editor-media-tab") === activeMedia;
      button.classList.toggle("is-active", isActive);
      button.setAttribute("aria-selected", isActive ? "true" : "false");
    });
    mediaPanels.forEach(function (panel) {
      panel.hidden =
        panel.getAttribute("data-gallery-editor-media-panel") !== activeMedia;
    });
  }

  function setLanguage(language) {
    activeLanguage = language === "tl" ? "tl" : "en";
    languageButtons.forEach(function (button) {
      var isActive =
        button.getAttribute("data-gallery-editor-lang") === activeLanguage;
      button.classList.toggle("is-active", isActive);
      button.setAttribute("aria-pressed", isActive ? "true" : "false");
    });
    languagePanels.forEach(function (panel) {
      var isActive =
        panel.getAttribute("data-gallery-editor-lang-panel") === activeLanguage;
      panel.hidden = !isActive;
      if (isActive) {
        Array.prototype.slice.call(panel.querySelectorAll("textarea")).forEach(
          resizeTextarea
        );
      }
    });
    languageLabels.forEach(function (label) {
      var languageName = activeLanguage === "tl" ? "Tagalog" : "English";
      if (label.closest(".admin-gallery-editor-location")) {
        label.textContent = languageName + " location";
        return;
      }
      var section = label.closest(".admin-gallery-editor-section");
      var isShort = Boolean(
        section && section.querySelector('[data-gallery-editor-copy="short"]')
      );
      label.textContent =
        languageName + (isShort ? " short description" : " full description");
    });
    updateTitlePreview();
    updateContextOutput();
    updateReadTime();
  }

  function setFieldVisibility(fieldName, isVisible) {
    var field = conditionalFields[fieldName];
    if (!field) {
      return;
    }
    field.hidden = !isVisible;
    Array.prototype.slice.call(
      field.querySelectorAll("input, textarea, select")
    ).forEach(function (input) {
      input.disabled = !isVisible;
    });
  }

  function getSelectedCategorySlug() {
    if (!categorySelect || categorySelect.selectedIndex < 0) {
      return "";
    }
    var option = categorySelect.options[categorySelect.selectedIndex];
    return normalize(option && option.getAttribute("data-category-slug")).toLowerCase();
  }

  function updateCategory() {
    var selectedOption =
      categorySelect && categorySelect.selectedIndex >= 0
        ? categorySelect.options[categorySelect.selectedIndex]
        : null;
    var categoryLabel = normalize(selectedOption && selectedOption.textContent) ||
      "Select a category";
    var slug = getSelectedCategorySlug();
    selectedCategoryFields = visibilityByCategory[slug] || [];

    Object.keys(conditionalFields).forEach(function (fieldName) {
      setFieldVisibility(
        fieldName,
        selectedCategoryFields.indexOf(fieldName) !== -1
      );
    });

    Array.prototype.slice.call(
      editor.querySelectorAll('[data-gallery-editor-output="category"]')
    ).forEach(function (output) {
      output.textContent = categoryLabel;
    });
    updateContextOutput();
  }

  function updateContextOutput() {
    var context = "Gallery record";
    if (
      selectedCategoryFields.indexOf("year_label") !== -1 &&
      normalize(yearInput && yearInput.value)
    ) {
      context = normalize(yearInput.value);
    } else if (selectedCategoryFields.indexOf("location") !== -1) {
      context =
        normalize(locationInputs[activeLanguage] && locationInputs[activeLanguage].value) ||
        normalize(locationInputs.en && locationInputs.en.value) ||
        normalize(locationInputs.tl && locationInputs.tl.value) ||
        "Add a location";
    }
    Array.prototype.slice.call(
      editor.querySelectorAll('[data-gallery-editor-output="context"]')
    ).forEach(function (output) {
      output.textContent = context;
    });
  }

  function updateTitlePreview() {
    var activeTitle = normalize(
      titleInputs[activeLanguage] && titleInputs[activeLanguage].value
    );
    var fallbackTitle =
      activeTitle ||
      normalize(titleInputs.en && titleInputs.en.value) ||
      normalize(titleInputs.tl && titleInputs.tl.value);
    if (fallbackLetter) {
      fallbackLetter.textContent = (fallbackTitle.charAt(0) || "G").toUpperCase();
    }
    if (imagePreview) {
      imagePreview.alt = fallbackTitle
        ? fallbackTitle + " gallery image preview"
        : "Gallery image preview";
    }
  }

  function updateVisibility() {
    var isPublished = Boolean(statusSelect && statusSelect.value === "1");
    if (visibility) {
      visibility.classList.toggle("is-active", isPublished);
      visibility.classList.toggle("is-draft", !isPublished);
    }
    if (visibilityText) {
      visibilityText.textContent = isPublished
        ? "Visible in the Online Gallery"
        : "Draft and hidden";
    }
    if (statusNote) {
      statusNote.textContent = isPublished
        ? "Visible to visitors"
        : "Hidden from visitors";
      statusNote.classList.toggle("is-draft", !isPublished);
    }
    if (visibilityPath) {
      visibilityPath.setAttribute(
        "d",
        isPublished
          ? "M12 5c5.5 0 9.5 5.4 9.5 7s-4 7-9.5 7S2.5 13.6 2.5 12 6.5 5 12 5Zm0 2C8.2 7 5.2 10.3 4.6 12c.6 1.7 3.6 5 7.4 5s6.8-3.3 7.4-5c-.6-1.7-3.6-5-7.4-5Zm0 2a3 3 0 1 1 0 6 3 3 0 0 1 0-6Z"
          : "M5 3h10l4 4v14H5Zm2 2v14h10V8h-3V5Zm2 7h6v2H9Zm0 4h6v2H9Z"
      );
    }
  }

  function updateReadTime() {
    if (!readTime) {
      return;
    }
    var activeCopy = copyFields
      .filter(function (field) {
        return (
          field.getAttribute("data-gallery-editor-copy-language") ===
          activeLanguage
        );
      })
      .map(function (field) {
        return normalize(field.value);
      })
      .join(" ");
    var wordCount = activeCopy ? activeCopy.split(/\s+/).filter(Boolean).length : 0;
    var minutes = Math.max(1, Math.ceil(wordCount / 200));
    readTime.textContent = minutes + " min read";
  }

  function isAllowedImage(file) {
    return Boolean(
      file &&
      (/\.(jpe?g|png)$/i.test(file.name) ||
        file.type === "image/jpeg" ||
        file.type === "image/png")
    );
  }

  function isAllowedModel(file) {
    return Boolean(file && /\.glb$/i.test(file.name));
  }

  function handleImageSelection() {
    var file = imageInput && imageInput.files && imageInput.files[0];
    if (!file) {
      return;
    }
    if (!isAllowedImage(file)) {
      imageInput.value = "";
      showFeedback("The gallery image must be a JPG or PNG file.", true);
      return;
    }
    if (imageObjectUrl) {
      window.URL.revokeObjectURL(imageObjectUrl);
    }
    imageObjectUrl = window.URL.createObjectURL(file);
    if (imagePreview) {
      imagePreview.src = imageObjectUrl;
      imagePreview.hidden = false;
    }
    if (imageFallback) {
      imageFallback.hidden = true;
    }
    hasSavedImage = true;
    setMedia("image");
    showFeedback("Image preview updated to " + file.name + ".", false);
  }

  function handleModelSelection() {
    var file = modelInput && modelInput.files && modelInput.files[0];
    if (!file) {
      return;
    }
    if (!isAllowedModel(file)) {
      modelInput.value = "";
      showFeedback("The 3D object must be a GLB file.", true);
      return;
    }
    if (modelObjectUrl) {
      window.URL.revokeObjectURL(modelObjectUrl);
    }
    modelObjectUrl = window.URL.createObjectURL(file);
    if (modelPreview) {
      modelPreview.src = modelObjectUrl;
      modelPreview.hidden = false;
    }
    if (modelFallback) {
      modelFallback.hidden = true;
    }
    if (modelName) {
      modelName.textContent = file.name;
    }
    setMedia("model");
    showFeedback("3D preview updated to " + file.name + ".", false);
  }

  function clearFieldErrors() {
    [
      titleInputs.en,
      titleInputs.tl,
      locationInputs.en,
      locationInputs.tl,
      yearInput,
    ]
      .concat(copyFields)
      .filter(Boolean)
      .forEach(function (field) {
        field.setCustomValidity("");
      });
  }

  function validateEditor(event) {
    clearFieldErrors();

    var requirements = [
      {
        field: titleInputs.en,
        language: "en",
        min: 3,
        message: "English title must be at least 3 characters.",
      },
      {
        field: titleInputs.tl,
        language: "tl",
        min: 3,
        message: "Tagalog title must be at least 3 characters.",
      },
    ];

    copyFields.forEach(function (field) {
      var isLong = field.getAttribute("data-gallery-editor-copy") === "long";
      requirements.push({
        field: field,
        language:
          field.getAttribute("data-gallery-editor-copy-language") === "tl"
            ? "tl"
            : "en",
        min: isLong ? 24 : 12,
        message:
          (field.getAttribute("data-gallery-editor-copy-language") === "tl"
            ? "Tagalog "
            : "English ") +
          (isLong ? "full description" : "short description") +
          " is too short.",
      });
    });

    if (selectedCategoryFields.indexOf("year_label") !== -1) {
      requirements.push({
        field: yearInput,
        language: activeLanguage,
        min: 2,
        message: "Year must be at least 2 characters.",
      });
    }
    if (selectedCategoryFields.indexOf("location") !== -1) {
      requirements.push({
        field: locationInputs.en,
        language: "en",
        min: 2,
        message: "English location must be at least 2 characters.",
      });
      requirements.push({
        field: locationInputs.tl,
        language: "tl",
        min: 2,
        message: "Tagalog location must be at least 2 characters.",
      });
    }

    var invalid = requirements.find(function (requirement) {
      return (
        !requirement.field ||
        normalize(requirement.field.value).length < requirement.min
      );
    });

    if (!invalid && !hasSavedImage) {
      event.preventDefault();
      event.stopImmediatePropagation();
      setMedia("image");
      showFeedback("Please upload a gallery image before saving.", true);
      if (imageInput) {
        imageInput.focus();
      }
      return;
    }

    if (!invalid) {
      return;
    }

    event.preventDefault();
    event.stopImmediatePropagation();
    setLanguage(invalid.language);
    invalid.field.setCustomValidity(invalid.message);
    invalid.field.focus();
    invalid.field.reportValidity();
  }

  languageButtons.forEach(function (button) {
    button.addEventListener("click", function () {
      setLanguage(button.getAttribute("data-gallery-editor-lang"));
    });
  });
  mediaTabs.forEach(function (button) {
    button.addEventListener("click", function () {
      setMedia(button.getAttribute("data-gallery-editor-media-tab"));
    });
  });
  Object.keys(titleInputs).forEach(function (language) {
    if (titleInputs[language]) {
      titleInputs[language].addEventListener("input", updateTitlePreview);
    }
  });
  Object.keys(locationInputs).forEach(function (language) {
    if (locationInputs[language]) {
      locationInputs[language].addEventListener("input", updateContextOutput);
    }
  });
  copyFields.forEach(function (field) {
    field.addEventListener("input", function () {
      resizeTextarea(field);
      updateReadTime();
    });
  });
  [
    titleInputs.en,
    titleInputs.tl,
    locationInputs.en,
    locationInputs.tl,
    yearInput,
  ]
    .concat(copyFields)
    .filter(Boolean)
    .forEach(function (field) {
      field.addEventListener("input", function () {
        field.setCustomValidity("");
      });
    });
  if (categorySelect) {
    categorySelect.addEventListener("change", updateCategory);
  }
  if (yearInput) {
    yearInput.addEventListener("input", updateContextOutput);
  }
  if (statusSelect) {
    statusSelect.addEventListener("change", updateVisibility);
  }
  if (imageInput) {
    imageInput.addEventListener("change", handleImageSelection);
  }
  if (modelInput) {
    modelInput.addEventListener("change", handleModelSelection);
  }

  editor.addEventListener("submit", validateEditor, { capture: true });
  window.addEventListener("beforeunload", function () {
    if (imageObjectUrl) {
      window.URL.revokeObjectURL(imageObjectUrl);
    }
    if (modelObjectUrl) {
      window.URL.revokeObjectURL(modelObjectUrl);
    }
  });

  setLanguage("en");
  setMedia("image");
  updateCategory();
  updateVisibility();
  updateTitlePreview();
  copyFields.forEach(resizeTextarea);
})();
