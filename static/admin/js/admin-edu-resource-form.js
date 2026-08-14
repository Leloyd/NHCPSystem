(function () {
  "use strict";

  var editor = document.querySelector("[data-edu-editor]");
  if (!editor) {
    return;
  }

  var categorySelect = editor.querySelector("[data-edu-editor-category]");
  var statusSelect = editor.querySelector("[data-edu-editor-status]");
  var statusNote = editor.querySelector("[data-edu-editor-status-note]");
  var visibility = editor.querySelector("[data-edu-editor-visibility]");
  var visibilityText = editor.querySelector("[data-edu-editor-visibility-text]");
  var visibilityPath = editor.querySelector("[data-edu-editor-visibility-icon]");
  var titleInput = editor.querySelector("[data-edu-editor-title]");
  var descriptionInput = editor.querySelector("[data-edu-editor-description]");
  var authorInput = editor.querySelector("[data-edu-editor-author]");
  var yearInput = editor.querySelector("[data-edu-editor-year]");
  var educatorInput = editor.querySelector("[data-edu-editor-educator]");
  var topicInput = editor.querySelector("[data-edu-editor-topic]");
  var kindOutput = editor.querySelector("[data-edu-editor-kind]");
  var categoryOutputs = Array.prototype.slice.call(
    editor.querySelectorAll('[data-edu-editor-output="category"]')
  );
  var contextOutputs = Array.prototype.slice.call(
    editor.querySelectorAll('[data-edu-editor-output="context"]')
  );
  var formatOutput = editor.querySelector("[data-edu-editor-format]");
  var fileNameOutput = editor.querySelector("[data-edu-editor-file-name]");
  var coverInput = editor.querySelector("[data-edu-editor-cover-input]");
  var fileInput = editor.querySelector("[data-edu-editor-file-input]");
  var coverPreview = editor.querySelector("[data-edu-editor-cover-preview]");
  var documentPreview = editor.querySelector("[data-edu-editor-document-preview]");
  var uploadHelp = editor.querySelector("[data-edu-editor-upload-help]");
  var uploadFeedback = editor.querySelector("[data-edu-editor-upload-feedback]");
  var uploadSizeOutput = editor.querySelector("[data-edu-editor-upload-size]");
  var uploadMeter = editor.querySelector("[data-edu-editor-upload-meter]");
  var uploadMeterBar = editor.querySelector("[data-edu-editor-upload-meter-bar]");
  var groups = {
    storyMeta: editor.querySelector('[data-resource-field="story_meta"]'),
    materialMeta: editor.querySelector('[data-resource-field="material_meta"]'),
    storyUpload: editor.querySelector('[data-resource-field="story_upload"]'),
    materialUpload: editor.querySelector('[data-resource-field="material_upload"]'),
  };
  var acceptByCategory = {
    PPT: ".ppt,.pptx,application/vnd.ms-powerpoint,application/vnd.openxmlformats-officedocument.presentationml.presentation",
    DOCS: ".docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    PDF: ".pdf,application/pdf",
  };
  var savedCoverUrl = normalize(
    editor.getAttribute("data-edu-editor-saved-cover-url")
  );
  var hasPersistedCover =
    editor.getAttribute("data-edu-editor-has-cover") === "1";
  var hasPersistedFile =
    editor.getAttribute("data-edu-editor-has-file") === "1";
  var hasSelectedCover = hasPersistedCover;
  var hasSelectedFile = hasPersistedFile;
  var maxUploadBytes = Math.max(
    0,
    Number(editor.getAttribute("data-edu-editor-max-upload-bytes")) || 0
  );
  var coverObjectUrl = "";

  function normalize(value) {
    return String(value || "").trim();
  }

  function formatMegabytes(byteCount) {
    return (
      Math.max(0, Number(byteCount) || 0) /
      (1024 * 1024)
    ).toFixed(2) + " MB";
  }

  function getSelectedFile(input) {
    return input && !input.disabled && input.files && input.files[0]
      ? input.files[0]
      : null;
  }

  function setGroupVisibility(group, isVisible) {
    if (!group) {
      return;
    }
    group.hidden = !isVisible;
    Array.prototype.slice
      .call(group.querySelectorAll("input, textarea, select"))
      .forEach(function (field) {
        field.disabled = !isVisible;
      });
  }

  function showFeedback(message, isError) {
    if (!uploadFeedback) {
      return;
    }
    uploadFeedback.textContent = message;
    uploadFeedback.classList.toggle("is-error", Boolean(isError));
    uploadFeedback.hidden = !message;
  }

  function updateUploadBudget() {
    var selectedFile = getSelectedFile(coverInput) || getSelectedFile(fileInput);
    var selectedBytes = Math.max(0, Number(selectedFile && selectedFile.size) || 0);
    var ratio = maxUploadBytes > 0 ? selectedBytes / maxUploadBytes : 0;
    if (uploadSizeOutput) {
      uploadSizeOutput.textContent =
        formatMegabytes(selectedBytes) + " / " + formatMegabytes(maxUploadBytes);
    }
    if (uploadMeter) {
      uploadMeter.setAttribute("aria-valuenow", String(selectedBytes));
      uploadMeter.classList.toggle("is-near-limit", ratio >= 0.8 && ratio <= 1);
      uploadMeter.classList.toggle("is-over-limit", ratio > 1);
    }
    if (uploadMeterBar) {
      uploadMeterBar.style.width = Math.min(100, ratio * 100) + "%";
    }
    return selectedBytes;
  }

  function rejectUploadOverBudget(input) {
    var selectedBytes = updateUploadBudget();
    if (!maxUploadBytes || selectedBytes <= maxUploadBytes) {
      return false;
    }
    var selectedLabel = formatMegabytes(selectedBytes);
    input.value = "";
    if (input === coverInput) {
      hasSelectedCover = hasPersistedCover;
      resetCoverPreview();
    } else {
      hasSelectedFile = hasPersistedFile;
      updateFileName();
    }
    updateUploadBudget();
    showFeedback(
      "The selected upload is " +
        selectedLabel +
        ". Keep each save at or below " +
        formatMegabytes(maxUploadBytes) +
        " for Vercel.",
      true
    );
    return true;
  }

  function resetCoverPreview() {
    if (coverPreview) {
      coverPreview.src = savedCoverUrl;
      coverPreview.hidden = !savedCoverUrl;
    }
    if (documentPreview) {
      documentPreview.hidden = Boolean(savedCoverUrl);
    }
  }

  function updateFileName() {
    var selectedFile = getSelectedFile(fileInput);
    if (fileNameOutput && selectedFile) {
      fileNameOutput.textContent = selectedFile.name;
    }
  }

  function updateContext() {
    var isStory = categorySelect && categorySelect.value === "Story";
    var value = isStory
      ? normalize(authorInput && authorInput.value) ||
        normalize(yearInput && yearInput.value) ||
        "Community story"
      : normalize(topicInput && topicInput.value) ||
        "Learning material";
    contextOutputs.forEach(function (output) {
      output.textContent = value;
    });
  }

  function updateCategory() {
    if (!categorySelect) {
      return;
    }
    var category = normalize(categorySelect.value) || "PPT";
    var isStory = category === "Story";
    setGroupVisibility(groups.storyMeta, isStory);
    setGroupVisibility(groups.storyUpload, isStory);
    setGroupVisibility(groups.materialMeta, !isStory);
    setGroupVisibility(groups.materialUpload, !isStory);

    if (fileInput) {
      fileInput.setAttribute("accept", acceptByCategory[category] || "");
    }
    if (formatOutput) {
      formatOutput.textContent = isStory ? "STORY" : category;
    }
    if (kindOutput) {
      kindOutput.textContent = isStory ? "Community story" : "Downloadable file";
    }
    if (uploadHelp && !hasPersistedFile && !getSelectedFile(fileInput)) {
      uploadHelp.textContent =
        category === "PPT"
          ? "PPT or PPTX file"
          : category === "DOCS"
            ? "DOCX file"
            : "PDF file";
    }
    categoryOutputs.forEach(function (output) {
      output.textContent = category;
    });

    if (isStory) {
      if (getSelectedFile(coverInput) && coverObjectUrl) {
        if (coverPreview) {
          coverPreview.src = coverObjectUrl;
          coverPreview.hidden = false;
        }
        if (documentPreview) {
          documentPreview.hidden = true;
        }
      } else {
        resetCoverPreview();
      }
    } else {
      if (coverPreview) {
        coverPreview.hidden = true;
      }
      if (documentPreview) {
        documentPreview.hidden = false;
      }
    }
    updateContext();
    updateUploadBudget();
  }

  function updateVisibility() {
    var status = statusSelect ? statusSelect.value : "draft";
    var isActive = status === "active";
    var isArchived = status === "archived";
    if (visibility) {
      visibility.classList.toggle("is-active", isActive);
      visibility.classList.toggle("is-draft", !isActive && !isArchived);
      visibility.classList.toggle("is-archived", isArchived);
    }
    if (visibilityText) {
      visibilityText.textContent = isActive
        ? "Visible in Educational Resources"
        : isArchived
          ? "Archived and hidden"
          : "Draft and hidden";
    }
    if (statusNote) {
      statusNote.textContent = isActive
        ? "Visible to visitors"
        : isArchived
          ? "Retained in the archive"
          : "Hidden from visitors";
      statusNote.classList.toggle("is-draft", !isActive && !isArchived);
      statusNote.classList.toggle("is-archived", isArchived);
    }
    if (visibilityPath) {
      visibilityPath.setAttribute(
        "d",
        isActive
          ? "M12 5c5.5 0 9.5 5.4 9.5 7s-4 7-9.5 7S2.5 13.6 2.5 12 6.5 5 12 5Zm0 2C8.2 7 5.2 10.3 4.6 12c.6 1.7 3.6 5 7.4 5s6.8-3.3 7.4-5c-.6-1.7-3.6-5-7.4-5Zm0 2a3 3 0 1 1 0 6 3 3 0 0 1 0-6Z"
          : isArchived
            ? "M3 4h18v5H3Zm2 2v1h14V6Zm1 5h12v9H6Zm4 2v2h4v-2Z"
            : "M5 3h10l4 4v14H5Zm2 2v14h10V8h-3V5Zm2 7h6v2H9Zm0 4h6v2H9Z"
      );
    }
  }

  function isAllowedCover(file) {
    return Boolean(
      file &&
      (/\.(jpe?g|png)$/i.test(file.name) ||
        file.type === "image/jpeg" ||
        file.type === "image/png")
    );
  }

  function isAllowedResourceFile(file, category) {
    var patterns = {
      PPT: /\.(ppt|pptx)$/i,
      DOCS: /\.docx$/i,
      PDF: /\.pdf$/i,
    };
    return Boolean(file && patterns[category] && patterns[category].test(file.name));
  }

  function handleCoverSelection() {
    var file = getSelectedFile(coverInput);
    if (!file) {
      return;
    }
    if (!isAllowedCover(file)) {
      coverInput.value = "";
      hasSelectedCover = hasPersistedCover;
      resetCoverPreview();
      updateUploadBudget();
      showFeedback("The story image must be a JPG or PNG file.", true);
      return;
    }
    if (rejectUploadOverBudget(coverInput)) {
      return;
    }
    if (coverObjectUrl) {
      window.URL.revokeObjectURL(coverObjectUrl);
    }
    coverObjectUrl = window.URL.createObjectURL(file);
    if (coverPreview) {
      coverPreview.src = coverObjectUrl;
      coverPreview.hidden = false;
    }
    if (documentPreview) {
      documentPreview.hidden = true;
    }
    hasSelectedCover = true;
    showFeedback("Story image preview updated to " + file.name + ".", false);
  }

  function handleFileSelection() {
    var file = getSelectedFile(fileInput);
    if (!file) {
      return;
    }
    var category = normalize(categorySelect && categorySelect.value);
    if (!isAllowedResourceFile(file, category)) {
      fileInput.value = "";
      hasSelectedFile = hasPersistedFile;
      updateUploadBudget();
      showFeedback(
        "Please choose a file that matches the selected " + category + " category.",
        true
      );
      return;
    }
    if (rejectUploadOverBudget(fileInput)) {
      return;
    }
    hasSelectedFile = true;
    updateFileName();
    showFeedback("Resource file selected: " + file.name + ".", false);
  }

  function validateEditor(event) {
    var category = normalize(categorySelect && categorySelect.value);
    var isStory = category === "Story";
    var requirements = [
      { field: titleInput, min: 3, message: "Title must be at least 3 characters." },
      { field: descriptionInput, min: 12, message: "Description must be at least 12 characters." },
    ];
    if (!isStory) {
      requirements.push(
        { field: educatorInput, min: 2, message: "Educator name or source must be at least 2 characters." },
        { field: topicInput, min: 2, message: "Subject or topic must be at least 2 characters." }
      );
    }

    requirements.forEach(function (requirement) {
      if (requirement.field) {
        requirement.field.setCustomValidity("");
      }
    });
    var invalid = requirements.find(function (requirement) {
      return (
        !requirement.field ||
        normalize(requirement.field.value).length < requirement.min
      );
    });
    if (invalid) {
      event.preventDefault();
      event.stopImmediatePropagation();
      invalid.field.setCustomValidity(invalid.message);
      invalid.field.focus();
      invalid.field.reportValidity();
      return;
    }

    if (!isStory && !hasSelectedFile) {
      event.preventDefault();
      event.stopImmediatePropagation();
      var missingMessage = "Please upload the resource file before saving.";
      showFeedback(missingMessage, true);
      fileInput.focus();
      return;
    }

    if (maxUploadBytes && updateUploadBudget() > maxUploadBytes) {
      event.preventDefault();
      event.stopImmediatePropagation();
      showFeedback(
        "The selected upload must be " +
          formatMegabytes(maxUploadBytes) +
          " or less before saving.",
        true
      );
    }
  }

  if (categorySelect) {
    categorySelect.addEventListener("change", updateCategory);
  }
  if (statusSelect) {
    statusSelect.addEventListener("change", updateVisibility);
  }
  if (coverInput) {
    coverInput.addEventListener("change", handleCoverSelection);
  }
  if (fileInput) {
    fileInput.addEventListener("change", handleFileSelection);
  }
  [authorInput, yearInput, topicInput]
    .filter(Boolean)
    .forEach(function (field) {
      field.addEventListener("input", updateContext);
    });
  [titleInput, descriptionInput, authorInput, yearInput, educatorInput, topicInput]
    .filter(Boolean)
    .forEach(function (field) {
      field.addEventListener("input", function () {
        field.setCustomValidity("");
      });
    });
  if (descriptionInput) {
    descriptionInput.addEventListener("input", function () {
      descriptionInput.style.height = "auto";
      descriptionInput.style.height =
        Math.min(Math.max(descriptionInput.scrollHeight, 160), 440) + "px";
    });
  }
  editor.addEventListener("submit", validateEditor, { capture: true });
  window.addEventListener("beforeunload", function () {
    if (coverObjectUrl) {
      window.URL.revokeObjectURL(coverObjectUrl);
    }
  });

  updateCategory();
  updateVisibility();
  updateUploadBudget();
})();
