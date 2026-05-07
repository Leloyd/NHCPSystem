(function () {
  const STORAGE_KEY = "gallery-accessibility";
  const root = document.documentElement;
  const pageRoot = document.body;
  const fabButton = document.getElementById("ogdAccessibilityToggle");
  const panelEl = document.getElementById("ogdAccessibilityPanel");
  const closeButton = document.getElementById("ogdAccessibilityClose");
  const contrastButton = document.getElementById("ogdContrastToggle");
  const languageButton = document.getElementById("ogdLanguageToggle");
  const languageBadge = document.getElementById("ogdLanguageBadge");
  const textSizeButtons = Array.from(document.querySelectorAll("[data-ogd-text-size]"));

  const panelI18n = {
    english: {
      panelTitle: "Accessibility Controls",
      closeLabel: "Close accessibility panel",
      textSizeLabel: "Text Size",
      textSizeAria: "Text size options",
      textSizes: {
        small: "Small",
        medium: "Medium",
        large: "Large",
      },
      highContrast: "High Contrast",
      language: "Language",
      fabOpen: "Open accessibility panel",
      fabClose: "Close accessibility panel",
      switchLanguage: "Switch language to Filipino",
    },
    filipino: {
      panelTitle: "Mga Kontrol sa Aksesibilidad",
      closeLabel: "Isara ang panel ng aksesibilidad",
      textSizeLabel: "Laki ng Teksto",
      textSizeAria: "Mga pagpipilian sa laki ng teksto",
      textSizes: {
        small: "Maliit",
        medium: "Katamtaman",
        large: "Malaki",
      },
      highContrast: "Mataas na Kontrasto",
      language: "Wika",
      fabOpen: "Buksan ang panel ng aksesibilidad",
      fabClose: "Isara ang panel ng aksesibilidad",
      switchLanguage: "Palitan ang wika sa English",
    },
  };

  function getDefaultLanguage() {
    return String(root.lang || "").toLowerCase().startsWith("tl") ? "filipino" : "english";
  }

  const defaultSettings = {
    textSize: "medium",
    highContrast: false,
    language: getDefaultLanguage(),
  };

  let state = loadSettings();
  let isOpen = false;

  function loadSettings() {
    try {
      const parsed = JSON.parse(window.localStorage.getItem(STORAGE_KEY) || "{}");
      return {
        ...defaultSettings,
        ...parsed,
        textSize: ["small", "medium", "large"].includes(parsed.textSize) ? parsed.textSize : defaultSettings.textSize,
        highContrast: Boolean(parsed.highContrast),
        language: parsed.language === "english" || parsed.language === "filipino" ? parsed.language : defaultSettings.language,
      };
    } catch (_error) {
      return { ...defaultSettings };
    }
  }

  function saveSettings() {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (_error) {
      return;
    }
  }

  function getCurrentStrings() {
    return panelI18n[state.language] || panelI18n.filipino;
  }

  function applyVisualSettings() {
    const sizeMap = {
      small: "14px",
      medium: "16px",
      large: "19px",
    };
    root.style.fontSize = sizeMap[state.textSize] || sizeMap.medium;
    root.classList.toggle("ogd-high-contrast", state.highContrast);
    if (pageRoot) {
      pageRoot.classList.toggle("ogd-high-contrast-page", state.highContrast);
    }
    root.lang = state.language === "english" ? "en" : "tl";
  }

  function applyPanelLabels() {
    const strings = getCurrentStrings();
    const titleEl = document.getElementById("ogdAccessibilityTitle");
    const labelEl = document.getElementById("ogdTextSizeLabel");
    const contrastLabelEl = document.getElementById("ogdContrastLabel");
    const languageLabelEl = document.getElementById("ogdLanguageLabel");
    const segmentedGroup = panelEl ? panelEl.querySelector(".ogd-accessibility-segmented") : null;

    if (titleEl) titleEl.textContent = strings.panelTitle;
    if (closeButton) closeButton.setAttribute("aria-label", strings.closeLabel);
    if (labelEl) labelEl.textContent = strings.textSizeLabel;
    if (segmentedGroup) segmentedGroup.setAttribute("aria-label", strings.textSizeAria);
    if (contrastLabelEl) contrastLabelEl.textContent = strings.highContrast;
    if (languageLabelEl) languageLabelEl.textContent = strings.language;
    if (fabButton) {
      fabButton.setAttribute("aria-label", isOpen ? strings.fabClose : strings.fabOpen);
    }
    if (languageButton) {
      languageButton.setAttribute("aria-label", strings.switchLanguage);
    }

    textSizeButtons.forEach((button) => {
      const size = String(button.getAttribute("data-ogd-text-size") || "medium");
      button.textContent = strings.textSizes[size] || size;
    });

    if (languageBadge) {
      languageBadge.textContent = state.language === "english" ? "EN" : "FIL";
    }
  }

  function syncControls() {
    textSizeButtons.forEach((button) => {
      const size = String(button.getAttribute("data-ogd-text-size") || "medium");
      const isActive = state.textSize === size;
      button.classList.toggle("is-active", isActive);
      button.setAttribute("aria-pressed", isActive ? "true" : "false");
    });

    if (contrastButton) {
      contrastButton.classList.toggle("is-active", state.highContrast);
      contrastButton.setAttribute("aria-checked", state.highContrast ? "true" : "false");
    }
  }

  function broadcastChange() {
    window.dispatchEvent(new CustomEvent("ogd:accessibility-change", {
      detail: { ...state },
    }));
  }

  function setPanelOpen(nextOpen) {
    isOpen = Boolean(nextOpen);
    if (panelEl) {
      panelEl.hidden = !isOpen;
    }
    if (fabButton) {
      fabButton.setAttribute("aria-expanded", isOpen ? "true" : "false");
      fabButton.classList.toggle("is-open", isOpen);
    }
    applyPanelLabels();
    if (window.lucide && typeof window.lucide.createIcons === "function") {
      window.lucide.createIcons();
    }
  }

  function updateSetting(key, value) {
    state = {
      ...state,
      [key]: value,
    };
    saveSettings();
    applyVisualSettings();
    applyPanelLabels();
    syncControls();
    broadcastChange();
  }

  textSizeButtons.forEach((button) => {
    button.addEventListener("click", () => {
      updateSetting("textSize", String(button.getAttribute("data-ogd-text-size") || "medium"));
    });
  });

  if (contrastButton) {
    contrastButton.addEventListener("click", () => {
      updateSetting("highContrast", !state.highContrast);
    });
  }

  if (languageButton) {
    languageButton.addEventListener("click", () => {
      updateSetting("language", state.language === "english" ? "filipino" : "english");
    });
  }

  if (fabButton) {
    fabButton.addEventListener("click", () => {
      setPanelOpen(!isOpen);
    });
  }

  if (closeButton) {
    closeButton.addEventListener("click", () => {
      setPanelOpen(false);
    });
  }

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && isOpen) {
      setPanelOpen(false);
    }
  });

  applyVisualSettings();
  applyPanelLabels();
  syncControls();
  setPanelOpen(false);
  broadcastChange();

  window.ogdAccessibility = {
    getSettings() {
      return { ...state };
    },
    updateSetting,
  };
})();
