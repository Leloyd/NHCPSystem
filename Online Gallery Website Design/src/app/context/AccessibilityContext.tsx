import React, { createContext, useContext, useState, useEffect } from "react";

type TextSize = "small" | "medium" | "large";
type Language = "english" | "filipino";

interface AccessibilitySettings {
  textSize: TextSize;
  highContrast: boolean;
  audioGuide: boolean;
  captions: boolean;
  language: Language;
  reducedMotion: boolean;
}

interface AccessibilityContextType {
  settings: AccessibilitySettings;
  updateSetting: <K extends keyof AccessibilitySettings>(
    key: K,
    value: AccessibilitySettings[K]
  ) => void;
  resetSettings: () => void;
}

const defaultSettings: AccessibilitySettings = {
  textSize: "medium",
  highContrast: false,
  audioGuide: false,
  captions: false,
  language: "english",
  reducedMotion: false,
};

const AccessibilityContext = createContext<AccessibilityContextType | undefined>(
  undefined
);

export function AccessibilityProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [settings, setSettings] = useState<AccessibilitySettings>(() => {
    try {
      const stored = localStorage.getItem("gallery-accessibility");
      return stored ? { ...defaultSettings, ...JSON.parse(stored) } : defaultSettings;
    } catch {
      return defaultSettings;
    }
  });

  useEffect(() => {
    localStorage.setItem("gallery-accessibility", JSON.stringify(settings));

    const root = document.documentElement;

    // Text size
    const sizeMap = { small: "14px", medium: "16px", large: "19px" };
    root.style.setProperty("--font-size", sizeMap[settings.textSize]);

    // High contrast
    if (settings.highContrast) {
      root.classList.add("high-contrast");
    } else {
      root.classList.remove("high-contrast");
    }

    // Reduced motion
    if (settings.reducedMotion) {
      root.classList.add("reduce-motion");
    } else {
      root.classList.remove("reduce-motion");
    }
  }, [settings]);

  const updateSetting = <K extends keyof AccessibilitySettings>(
    key: K,
    value: AccessibilitySettings[K]
  ) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
  };

  const resetSettings = () => setSettings(defaultSettings);

  return (
    <AccessibilityContext.Provider value={{ settings, updateSetting, resetSettings }}>
      {children}
    </AccessibilityContext.Provider>
  );
}

export function useAccessibility() {
  const ctx = useContext(AccessibilityContext);
  if (!ctx) throw new Error("useAccessibility must be used within AccessibilityProvider");
  return ctx;
}
