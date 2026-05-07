import { useState } from "react";
import { Accessibility, X, ZoomIn, ZoomOut, Sun, Volume2, Subtitles, Globe, RotateCcw, Eye } from "lucide-react";
import { useAccessibility } from "../context/AccessibilityContext";
import { motion, AnimatePresence } from "motion/react";

export function FloatingAccessibility() {
  const [open, setOpen] = useState(false);
  const { settings, updateSetting, resetSettings } = useAccessibility();
  const hc = settings.highContrast;
  const lang = settings.language;

  const toggleLanguage = () => {
    updateSetting("language", settings.language === "english" ? "filipino" : "english");
  };

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-3">
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 10 }}
            transition={{ duration: 0.2 }}
            className={`rounded-2xl border shadow-2xl p-5 w-72 ${
              hc
                ? "bg-black border-yellow-400 text-white"
                : "bg-white border-[#E8E4DF] text-[#1C1917]"
            }`}
            role="dialog"
            aria-label="Accessibility controls panel"
            aria-modal="false"
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className={`text-sm font-semibold ${hc ? "text-yellow-400" : "text-[#1C1917]"}`}>
                {lang === "filipino" ? "Mga Kontrol sa Aksesibilidad" : "Accessibility Controls"}
              </h2>
              <button
                onClick={() => setOpen(false)}
                className={`p-1.5 rounded-md transition-colors ${
                  hc ? "hover:text-yellow-400" : "text-[#6B6560] hover:text-[#1C1917]"
                }`}
                aria-label="Close accessibility panel"
              >
                <X size={16} />
              </button>
            </div>

            <div className="flex flex-col gap-3">
              {/* Text Size */}
              <div>
                <p className={`text-xs font-medium mb-2 ${hc ? "text-gray-400" : "text-[#ABA89F]"}`}>
                  {lang === "filipino" ? "Laki ng Teksto" : "Text Size"}
                </p>
                <div className="flex gap-2" role="group" aria-label="Text size options">
                  {(["small", "medium", "large"] as const).map((size) => (
                    <button
                      key={size}
                      onClick={() => updateSetting("textSize", size)}
                      className={`flex-1 py-1.5 rounded-md text-xs capitalize font-medium transition-colors ${
                        settings.textSize === size
                          ? hc
                            ? "bg-yellow-400 text-black"
                            : "bg-[#B8945A] text-white"
                          : hc
                          ? "border border-gray-700 text-gray-300 hover:border-yellow-400"
                          : "border border-[#E8E4DF] text-[#6B6560] hover:border-[#B8945A]"
                      }`}
                      aria-pressed={settings.textSize === size}
                      aria-label={`Set text size to ${size}`}
                    >
                      {lang === "filipino"
                        ? size === "small" ? "Maliit" : size === "medium" ? "Katamtaman" : "Malaki"
                        : size.charAt(0).toUpperCase() + size.slice(1)}
                    </button>
                  ))}
                </div>
              </div>

              {/* Toggles */}
              {[
                {
                  key: "highContrast" as const,
                  icon: Eye,
                  label: "High Contrast",
                  labelFil: "Mataas na Kontrasto",
                },
                {
                  key: "audioGuide" as const,
                  icon: Volume2,
                  label: "Audio Guide",
                  labelFil: "Gabay sa Tunog",
                },
                {
                  key: "captions" as const,
                  icon: Subtitles,
                  label: "Captions / Transcript",
                  labelFil: "Mga Subtitle",
                },
                {
                  key: "reducedMotion" as const,
                  icon: Sun,
                  label: "Reduce Motion",
                  labelFil: "Bawasan ang Galaw",
                },
              ].map(({ key, icon: Icon, label, labelFil }) => (
                <button
                  key={key}
                  onClick={() => updateSetting(key, !settings[key])}
                  className={`flex items-center justify-between px-3 py-2.5 rounded-lg text-sm transition-colors ${
                    settings[key]
                      ? hc
                        ? "bg-yellow-400/20 border border-yellow-400 text-yellow-400"
                        : "bg-[#B8945A]/10 border border-[#B8945A]/40 text-[#B8945A]"
                      : hc
                      ? "border border-gray-700 text-gray-300 hover:border-yellow-400/50"
                      : "border border-[#E8E4DF] text-[#6B6560] hover:border-[#B8945A]/30"
                  }`}
                  role="switch"
                  aria-checked={settings[key]}
                  aria-label={`Toggle ${label}`}
                >
                  <span className="flex items-center gap-2.5">
                    <Icon size={15} aria-hidden="true" />
                    {lang === "filipino" ? labelFil : label}
                  </span>
                  <span
                    className={`w-8 h-4 rounded-full relative transition-colors flex-shrink-0 ${
                      settings[key]
                        ? hc ? "bg-yellow-400" : "bg-[#B8945A]"
                        : hc ? "bg-gray-700" : "bg-[#E8E4DF]"
                    }`}
                    aria-hidden="true"
                  >
                    <span
                      className={`absolute top-0.5 w-3 h-3 rounded-full bg-white shadow transition-all ${
                        settings[key] ? "left-4" : "left-0.5"
                      }`}
                    />
                  </span>
                </button>
              ))}

              {/* Language Toggle */}
              <button
                onClick={toggleLanguage}
                className={`flex items-center justify-between px-3 py-2.5 rounded-lg text-sm transition-colors border ${
                  hc
                    ? "border-gray-700 text-gray-300 hover:border-yellow-400/50"
                    : "border-[#E8E4DF] text-[#6B6560] hover:border-[#B8945A]/30"
                }`}
                aria-label={`Switch language to ${settings.language === "english" ? "Filipino" : "English"}`}
              >
                <span className="flex items-center gap-2.5">
                  <Globe size={15} aria-hidden="true" />
                  {lang === "filipino" ? "Wika" : "Language"}
                </span>
                <span
                  className={`text-xs font-semibold px-2 py-0.5 rounded ${
                    hc ? "bg-yellow-400 text-black" : "bg-[#F5F1EC] text-[#B8945A]"
                  }`}
                >
                  {settings.language === "english" ? "EN" : "FIL"}
                </span>
              </button>

              {/* Reset */}
              <button
                onClick={resetSettings}
                className={`flex items-center gap-2 justify-center px-3 py-2 rounded-lg text-xs transition-colors mt-1 ${
                  hc
                    ? "text-gray-400 hover:text-yellow-400"
                    : "text-[#ABA89F] hover:text-[#6B6560]"
                }`}
                aria-label="Reset all accessibility settings to defaults"
              >
                <RotateCcw size={13} aria-hidden="true" />
                {lang === "filipino" ? "I-reset ang mga Setting" : "Reset to defaults"}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* FAB */}
      <button
        onClick={() => setOpen((v) => !v)}
        className={`w-14 h-14 rounded-full shadow-xl flex items-center justify-center transition-all duration-300 ${
          hc
            ? "bg-yellow-400 text-black hover:bg-yellow-300"
            : "bg-[#B8945A] text-white hover:bg-[#A07D47] hover:shadow-2xl"
        } ${open ? "rotate-12" : ""}`}
        aria-label={open ? "Close accessibility panel" : "Open accessibility panel"}
        aria-expanded={open}
        aria-haspopup="dialog"
      >
        <Accessibility size={22} />
      </button>
    </div>
  );
}
