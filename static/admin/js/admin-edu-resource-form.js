(function () {
  const categorySelect = document.getElementById("resourceCategory");
  const fileInput = document.getElementById("resourceFile");
  const fields = {
    bookMeta: document.querySelector('[data-resource-field="book_meta"]'),
    materialMeta: document.querySelectorAll('[data-resource-field="material_meta"]'),
    materialUpload: document.querySelector('[data-resource-field="material_upload"]'),
    bookUpload: document.querySelector('[data-resource-field="book_upload"]'),
  };
  const acceptByCategory = {
    PPT: ".ppt,.pptx,application/vnd.ms-powerpoint,application/vnd.openxmlformats-officedocument.presentationml.presentation",
    DOCS: ".docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    PDF: ".pdf,application/pdf",
  };

  function setSingleFieldVisibility(field, isVisible) {
    if (!field) {
      return;
    }
    field.hidden = !isVisible;
    field.querySelectorAll("input, textarea, select").forEach((input) => {
      input.disabled = !isVisible;
    });
  }

  function setMultipleFieldVisibility(nodeList, isVisible) {
    nodeList.forEach((field) => {
      setSingleFieldVisibility(field, isVisible);
    });
  }

  function updateFormForCategory() {
    if (!categorySelect) {
      return;
    }

    const category = String(categorySelect.value || "").trim();
    const isBook = category === "Books";

    setSingleFieldVisibility(fields.bookMeta, isBook);
    setSingleFieldVisibility(fields.bookUpload, isBook);
    setSingleFieldVisibility(fields.materialUpload, !isBook);
    setMultipleFieldVisibility(fields.materialMeta, !isBook);

    if (fileInput) {
      fileInput.setAttribute("accept", acceptByCategory[category] || "");
    }
  }

  if (!categorySelect) {
    return;
  }

  categorySelect.addEventListener("change", updateFormForCategory);
  updateFormForCategory();
})();
