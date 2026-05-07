(function () {
  const categorySelect = document.getElementById("galleryCategory");
  const conditionalFields = {
    year_label: document.querySelector('[data-category-field="year_label"]'),
    location: document.querySelector('[data-category-field="location"]'),
  };
  const visibilityByCategory = {
    "mga-rehiyunal-na-kaugalian-regional-customs": ["location"],
    "mga-paniniwala-sa-buong-bansa-beliefs-across-the-nation": [],
    "kasaysayan-history": ["year_label"],
    "materyales-materials": ["year_label"],
  };

  function setFieldVisibility(fieldName, isVisible) {
    const field = conditionalFields[fieldName];
    if (!field) {
      return;
    }

    field.hidden = !isVisible;
    field.querySelectorAll("input, textarea, select").forEach((input) => {
      input.disabled = !isVisible;
      input.required = isVisible;
    });
  }

  function updateFormForCategory() {
    if (!categorySelect) {
      return;
    }

    const selectedOption = categorySelect.options[categorySelect.selectedIndex];
    const selectedSlug = selectedOption ? String(selectedOption.dataset.categorySlug || "").trim().toLowerCase() : "";
    const visibleFields = new Set(visibilityByCategory[selectedSlug] || []);

    Object.keys(conditionalFields).forEach((fieldName) => {
      setFieldVisibility(fieldName, visibleFields.has(fieldName));
    });
  }

  if (!categorySelect) {
    return;
  }

  categorySelect.addEventListener("change", updateFormForCategory);
  updateFormForCategory();
})();
