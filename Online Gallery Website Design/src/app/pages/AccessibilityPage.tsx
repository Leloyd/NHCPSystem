import { motion } from "motion/react";
import {
  Eye,
  Volume2,
  Subtitles,
  Globe,
  ZoomIn,
  Sun,
  RotateCcw,
  CheckCircle2,
  Accessibility,
  Route,
  Mic,
  Type,
} from "lucide-react";
import { useAccessibility } from "../context/AccessibilityContext";

export function AccessibilityPage() {
  const { settings, updateSetting, resetSettings } = useAccessibility();
  const hc = settings.highContrast;
  const lang = settings.language;

  const toggleLanguage = () => {
    updateSetting("language", settings.language === "english" ? "filipino" : "english");
  };

  const accessibilityRoutes = [
    {
      area: lang === "filipino" ? "Pangunahing Pahina" : "Main Gallery Page",
      areaFil: "Pangunahing Pahina",
      notes:
        lang === "filipino"
          ? "Lahat ng artifact card ay may alt text. Ang search bar ay may naaangkop na label. Ang mga filter ay gumagamit ng ARIA roles."
          : "All artifact cards have descriptive alt text. The search bar has appropriate ARIA labels. Filters use proper ARIA roles.",
      accessible: true,
    },
    {
      area: lang === "filipino" ? "Pahina ng Detalye" : "Artifact Detail Page",
      notes:
        lang === "filipino"
          ? "Ang buong paglalarawan ay available. Ang imahe ay may zoom feature. Ang audio guide ay available kapag na-enable."
          : "Full descriptions are available. Image has zoom capability. Audio guide available when enabled.",
      accessible: true,
    },
    {
      area: lang === "filipino" ? "Nabigasyon" : "Navigation",
      notes:
        lang === "filipino"
          ? "Sumusuporta sa keyboard navigation. Ang 'Skip to main content' ay available. Lahat ng link ay may malinaw na label."
          : "Supports full keyboard navigation. Skip to main content available. All links have clear labels.",
      accessible: true,
    },
    {
      area: lang === "filipino" ? "Mga Form at Kontrol" : "Forms & Controls",
      notes:
        lang === "filipino"
          ? "Ang lahat ng input ay may label. Ang mga button ay may malinaw na purpose. Ang mga toggle ay gumagamit ng ARIA switch roles."
          : "All inputs have associated labels. Buttons have clear purposes. Toggles use ARIA switch roles.",
      accessible: true,
    },
  ];

  const exhibits = [
    {
      icon: "🏺",
      title: "Ceramics Collection",
      desc:
        lang === "filipino"
          ? "Mga palayok at sisidlang may audio description para sa mga bisitang may kapansanan sa paningin."
          : "Pottery and vessels with full audio descriptions for visitors with visual impairments.",
    },
    {
      icon: "📜",
      title: "Manuscripts & Scripts",
      desc:
        lang === "filipino"
          ? "Ang Baybayin at iba pang sinulat ay may audio playback at enlarged text view."
          : "Baybayin and other scripts include audio playback and enlarged text display options.",
    },
    {
      icon: "💎",
      title: "Jewelry & Ornaments",
      desc:
        lang === "filipino"
          ? "Ang bawat piraso ay may detalyadong paglalarawan ng tekstura, sukat, at disenyo."
          : "Each piece includes detailed descriptions of texture, dimensions, and design motifs.",
    },
  ];

  return (
    <main
      id="main-content"
      className={`min-h-screen ${hc ? "bg-black" : "bg-[#FAFAF7]"}`}
    >
      {/* Header */}
      <section
        className={`border-b py-12 px-4 sm:px-6 lg:px-8 ${
          hc ? "bg-black border-yellow-400/20" : "bg-white border-[#E8E4DF]"
        }`}
        aria-labelledby="a11y-heading"
      >
        <div className="max-w-7xl mx-auto">
          <div className="flex items-start gap-5">
            <div
              className={`w-14 h-14 rounded-2xl flex items-center justify-center flex-shrink-0 ${
                hc ? "bg-yellow-400" : "bg-[#B8945A]"
              }`}
              aria-hidden="true"
            >
              <Accessibility size={28} className={hc ? "text-black" : "text-white"} />
            </div>
            <div>
              <span
                className={`text-xs font-semibold tracking-widest uppercase mb-2 block ${
                  hc ? "text-yellow-400" : "text-[#B8945A]"
                }`}
              >
                {lang === "filipino" ? "Para sa Lahat" : "For Everyone"}
              </span>
              <h1 id="a11y-heading" className={hc ? "text-yellow-400" : "text-[#1C1917]"}>
                {lang === "filipino" ? "Aksesibilidad" : "Accessibility"}
              </h1>
              <p className={`mt-2 max-w-2xl ${hc ? "text-gray-400" : "text-[#6B6560]"}`}>
                {lang === "filipino"
                  ? "Ang aming galería ay dinisenyo para maabot ng lahat — anuman ang iyong kakayahan o wika. I-customize ang iyong karanasan gamit ang mga kontrol sa ibaba."
                  : "Our gallery is designed to be accessible to everyone — regardless of ability or language. Customize your experience using the controls below."}
              </p>
            </div>
          </div>
        </div>
      </section>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
          {/* Controls Panel */}
          <div className="lg:col-span-1">
            <div
              className={`rounded-2xl border p-6 sticky top-24 ${
                hc ? "border-yellow-400/30 bg-yellow-400/5" : "border-[#E8E4DF] bg-white"
              }`}
              aria-label="Accessibility settings panel"
            >
              <h2
                className={`text-sm font-semibold uppercase tracking-wider mb-5 ${
                  hc ? "text-yellow-400" : "text-[#B8945A]"
                }`}
              >
                {lang === "filipino" ? "Mga Setting" : "Settings"}
              </h2>

              {/* Text Size */}
              <div className="mb-5">
                <div className="flex items-center gap-2 mb-3">
                  <Type
                    size={15}
                    className={hc ? "text-yellow-400" : "text-[#B8945A]"}
                    aria-hidden="true"
                  />
                  <p className={`text-sm font-medium ${hc ? "text-white" : "text-[#1C1917]"}`}>
                    {lang === "filipino" ? "Laki ng Teksto" : "Text Size"}
                  </p>
                </div>
                <div className="flex gap-2" role="group" aria-label="Text size options">
                  {(["small", "medium", "large"] as const).map((size) => (
                    <button
                      key={size}
                      onClick={() => updateSetting("textSize", size)}
                      className={`flex-1 py-2 rounded-lg text-sm capitalize font-medium border transition-all ${
                        settings.textSize === size
                          ? hc
                            ? "bg-yellow-400 border-yellow-400 text-black"
                            : "bg-[#B8945A] border-[#B8945A] text-white"
                          : hc
                          ? "border-gray-700 text-gray-300 hover:border-yellow-400"
                          : "border-[#E8E4DF] text-[#6B6560] hover:border-[#B8945A]/50"
                      }`}
                      aria-pressed={settings.textSize === size}
                      aria-label={`Set text size to ${size}`}
                    >
                      {lang === "filipino"
                        ? size === "small"
                          ? "Maliit"
                          : size === "medium"
                          ? "Katamtaman"
                          : "Malaki"
                        : size.charAt(0).toUpperCase() + size.slice(1)}
                    </button>
                  ))}
                </div>
                <div className="flex justify-between mt-2" aria-hidden="true">
                  <span className={`text-xs ${hc ? "text-gray-600" : "text-[#D4CFC9]"}`} style={{ fontSize: "0.7rem" }}>Aa</span>
                  <span className={`text-sm ${hc ? "text-gray-500" : "text-[#ABA89F]"}`} style={{ fontSize: "0.85rem" }}>Aa</span>
                  <span className={`text-base ${hc ? "text-gray-400" : "text-[#6B6560]"}`} style={{ fontSize: "1rem" }}>Aa</span>
                </div>
              </div>

              {/* Toggle Controls */}
              <div className="flex flex-col gap-3">
                {[
                  {
                    key: "highContrast" as const,
                    icon: Eye,
                    label: "High Contrast Mode",
                    labelFil: "Mataas na Kontrasto",
                    desc: "Increases color contrast for better visibility",
                    descFil: "Pinapataas ang kontrasto para sa mas malinaw na paningin",
                  },
                  {
                    key: "audioGuide" as const,
                    icon: Volume2,
                    label: "Audio Guide",
                    labelFil: "Gabay sa Tunog",
                    desc: "Enable audio descriptions for artifacts",
                    descFil: "I-enable ang audio para sa mga artefakto",
                  },
                  {
                    key: "captions" as const,
                    icon: Subtitles,
                    label: "Captions & Transcripts",
                    labelFil: "Mga Subtitle at Transkripsyon",
                    desc: "Show text captions and transcripts",
                    descFil: "Ipakita ang mga subtitle at transkripsyon",
                  },
                  {
                    key: "reducedMotion" as const,
                    icon: Sun,
                    label: "Reduce Motion",
                    labelFil: "Bawasan ang Galaw",
                    desc: "Minimize animations and transitions",
                    descFil: "Bawasan ang mga animasyon at transisyon",
                  },
                ].map(({ key, icon: Icon, label, labelFil, desc, descFil }) => (
                  <button
                    key={key}
                    onClick={() => updateSetting(key, !settings[key])}
                    className={`flex items-start gap-3 px-4 py-3.5 rounded-xl border text-left transition-all ${
                      settings[key]
                        ? hc
                          ? "bg-yellow-400/15 border-yellow-400 text-yellow-400"
                          : "bg-[#B8945A]/10 border-[#B8945A]/40 text-[#B8945A]"
                        : hc
                        ? "border-gray-700 text-gray-300 hover:border-yellow-400/40"
                        : "border-[#E8E4DF] text-[#6B6560] hover:border-[#B8945A]/30"
                    }`}
                    role="switch"
                    aria-checked={settings[key]}
                    aria-label={`${settings[key] ? "Disable" : "Enable"} ${label}`}
                  >
                    <Icon
                      size={16}
                      className="flex-shrink-0 mt-0.5"
                      aria-hidden="true"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium leading-tight">
                        {lang === "filipino" ? labelFil : label}
                      </p>
                      <p
                        className={`text-xs mt-0.5 ${
                          settings[key]
                            ? hc
                              ? "text-yellow-400/70"
                              : "text-[#B8945A]/70"
                            : hc
                            ? "text-gray-600"
                            : "text-[#ABA89F]"
                        }`}
                      >
                        {lang === "filipino" ? descFil : desc}
                      </p>
                    </div>
                    <span
                      className={`w-9 h-5 rounded-full relative flex-shrink-0 mt-0.5 transition-colors ${
                        settings[key]
                          ? hc
                            ? "bg-yellow-400"
                            : "bg-[#B8945A]"
                          : hc
                          ? "bg-gray-700"
                          : "bg-[#E8E4DF]"
                      }`}
                      aria-hidden="true"
                    >
                      <span
                        className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-all ${
                          settings[key] ? "left-[1.125rem]" : "left-0.5"
                        }`}
                      />
                    </span>
                  </button>
                ))}

                {/* Language Toggle */}
                <button
                  onClick={toggleLanguage}
                  className={`flex items-start gap-3 px-4 py-3.5 rounded-xl border text-left transition-all ${
                    hc
                      ? "border-gray-700 text-gray-300 hover:border-yellow-400/40"
                      : "border-[#E8E4DF] text-[#6B6560] hover:border-[#B8945A]/30"
                  }`}
                  aria-label={`Switch language to ${settings.language === "english" ? "Filipino" : "English"}`}
                >
                  <Globe size={16} className="flex-shrink-0 mt-0.5" aria-hidden="true" />
                  <div className="flex-1">
                    <p className="text-sm font-medium">
                      {lang === "filipino" ? "Wika" : "Language"}
                    </p>
                    <p className={`text-xs mt-0.5 ${hc ? "text-gray-600" : "text-[#ABA89F]"}`}>
                      {lang === "filipino"
                        ? "Kasalukuyang: Filipino"
                        : "Current: English"}
                    </p>
                  </div>
                  <span
                    className={`text-xs font-semibold px-2 py-1 rounded-lg flex-shrink-0 ${
                      hc ? "bg-yellow-400 text-black" : "bg-[#F5F1EC] text-[#B8945A]"
                    }`}
                  >
                    {settings.language === "english" ? "EN" : "FIL"}
                  </span>
                </button>
              </div>

              {/* Reset */}
              <button
                onClick={resetSettings}
                className={`w-full mt-4 flex items-center gap-2 justify-center px-4 py-2.5 rounded-xl text-sm transition-colors border ${
                  hc
                    ? "border-gray-700 text-gray-500 hover:text-yellow-400 hover:border-yellow-400/30"
                    : "border-[#F0ECE6] text-[#ABA89F] hover:text-[#6B6560] hover:border-[#E8E4DF]"
                }`}
                aria-label="Reset all accessibility settings to defaults"
              >
                <RotateCcw size={14} aria-hidden="true" />
                {lang === "filipino" ? "I-reset ang Lahat" : "Reset All Settings"}
              </button>
            </div>
          </div>

          {/* Information Content */}
          <div className="lg:col-span-2 flex flex-col gap-8">
            {/* Visitor Guide */}
            <motion.section
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
              className={`rounded-2xl border p-6 ${
                hc ? "border-yellow-400/20 bg-yellow-400/5" : "border-[#E8E4DF] bg-white"
              }`}
              aria-labelledby="visitor-guide-heading"
            >
              <div className="flex items-center gap-3 mb-5">
                <div
                  className={`w-9 h-9 rounded-lg flex items-center justify-center ${
                    hc ? "bg-yellow-400/20 text-yellow-400" : "bg-[#B8945A]/10 text-[#B8945A]"
                  }`}
                  aria-hidden="true"
                >
                  <Route size={18} />
                </div>
                <h2
                  id="visitor-guide-heading"
                  className={`font-semibold ${hc ? "text-yellow-400" : "text-[#1C1917]"}`}
                  style={{ fontSize: "1.1rem" }}
                >
                  {lang === "filipino"
                    ? "Gabay para sa mga Bisita"
                    : "Visitor Accessibility Guide"}
                </h2>
              </div>

              <div className="flex flex-col gap-4">
                {accessibilityRoutes.map((route, i) => (
                  <div
                    key={i}
                    className={`flex gap-3 p-4 rounded-xl border ${
                      hc ? "border-yellow-400/15" : "border-[#F0ECE6]"
                    }`}
                  >
                    <CheckCircle2
                      size={18}
                      className={`flex-shrink-0 mt-0.5 ${
                        hc ? "text-yellow-400" : "text-[#B8945A]"
                      }`}
                      aria-hidden="true"
                    />
                    <div>
                      <p className={`text-sm font-medium mb-1 ${hc ? "text-white" : "text-[#1C1917]"}`}>
                        {route.area}
                      </p>
                      <p className={`text-xs leading-relaxed ${hc ? "text-gray-400" : "text-[#6B6560]"}`}>
                        {route.notes}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </motion.section>

            {/* Audio-Assisted Exhibits */}
            <motion.section
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.1 }}
              className={`rounded-2xl border p-6 ${
                hc ? "border-yellow-400/20 bg-yellow-400/5" : "border-[#E8E4DF] bg-white"
              }`}
              aria-labelledby="audio-heading"
            >
              <div className="flex items-center gap-3 mb-5">
                <div
                  className={`w-9 h-9 rounded-lg flex items-center justify-center ${
                    hc ? "bg-yellow-400/20 text-yellow-400" : "bg-[#B8945A]/10 text-[#B8945A]"
                  }`}
                  aria-hidden="true"
                >
                  <Mic size={18} />
                </div>
                <h2
                  id="audio-heading"
                  className={`font-semibold ${hc ? "text-yellow-400" : "text-[#1C1917]"}`}
                  style={{ fontSize: "1.1rem" }}
                >
                  {lang === "filipino"
                    ? "Audio-Assisted na mga Eksibisyon"
                    : "Audio-Assisted Exhibits"}
                </h2>
              </div>

              <p className={`text-sm mb-5 ${hc ? "text-gray-400" : "text-[#6B6560]"}`}>
                {lang === "filipino"
                  ? "Ang mga sumusunod na koleksyon ay may audio guide. I-enable ang Audio Guide sa mga setting para makinig."
                  : "The following collections have audio guide support. Enable Audio Guide in settings to listen."}
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {exhibits.map((exhibit, i) => (
                  <div
                    key={i}
                    className={`p-4 rounded-xl border text-center ${
                      hc ? "border-yellow-400/15" : "border-[#F0ECE6]"
                    }`}
                  >
                    <span className="text-2xl mb-3 block" aria-hidden="true">
                      {exhibit.icon}
                    </span>
                    <h3
                      className={`text-sm font-semibold mb-2 ${hc ? "text-white" : "text-[#1C1917]"}`}
                      style={{ fontSize: "0.875rem" }}
                    >
                      {exhibit.title}
                    </h3>
                    <p className={`text-xs leading-relaxed ${hc ? "text-gray-500" : "text-[#ABA89F]"}`}>
                      {exhibit.desc}
                    </p>
                  </div>
                ))}
              </div>
            </motion.section>

            {/* Content Options */}
            <motion.section
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.15 }}
              className={`rounded-2xl border p-6 ${
                hc ? "border-yellow-400/20 bg-yellow-400/5" : "border-[#E8E4DF] bg-white"
              }`}
              aria-labelledby="content-options-heading"
            >
              <div className="flex items-center gap-3 mb-5">
                <div
                  className={`w-9 h-9 rounded-lg flex items-center justify-center ${
                    hc ? "bg-yellow-400/20 text-yellow-400" : "bg-[#B8945A]/10 text-[#B8945A]"
                  }`}
                  aria-hidden="true"
                >
                  <ZoomIn size={18} />
                </div>
                <h2
                  id="content-options-heading"
                  className={`font-semibold ${hc ? "text-yellow-400" : "text-[#1C1917]"}`}
                  style={{ fontSize: "1.1rem" }}
                >
                  {lang === "filipino" ? "Mga Opsyon sa Nilalaman" : "Content Options"}
                </h2>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {[
                  {
                    icon: Type,
                    label: lang === "filipino" ? "Mga Opsyon sa Laki ng Teksto" : "Text Size Options",
                    desc:
                      lang === "filipino"
                        ? "Piliin ang Maliit, Katamtaman, o Malaki sa left panel."
                        : "Choose Small, Medium, or Large in the left panel.",
                    status: "available",
                  },
                  {
                    icon: Eye,
                    label: lang === "filipino" ? "Contrast-Friendly na Estilo" : "Contrast-Friendly Styling",
                    desc:
                      lang === "filipino"
                        ? "I-enable ang High Contrast para sa mas malinaw na pagtingin."
                        : "Enable High Contrast for a clearer viewing experience.",
                    status: "available",
                  },
                  {
                    icon: Subtitles,
                    label: lang === "filipino" ? "Mga Caption at Transkripsyon" : "Captions & Transcripts",
                    desc:
                      lang === "filipino"
                        ? "Ipinapakita ang mga caption at buong text sa artifact detail pages."
                        : "Displays captions and full text on artifact detail pages.",
                    status: "available",
                  },
                  {
                    icon: Globe,
                    label: lang === "filipino" ? "Filipino at Ingles" : "Filipino & English Labels",
                    desc:
                      lang === "filipino"
                        ? "Lahat ng nilalaman ay available sa Filipino at Ingles."
                        : "All content available in both Filipino and English.",
                    status: "available",
                  },
                ].map(({ icon: Icon, label, desc, status }, i) => (
                  <div
                    key={i}
                    className={`flex gap-3 p-4 rounded-xl border ${
                      hc ? "border-yellow-400/15" : "border-[#F0ECE6]"
                    }`}
                  >
                    <div
                      className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                        hc ? "bg-yellow-400/20 text-yellow-400" : "bg-[#F5F1EC] text-[#B8945A]"
                      }`}
                      aria-hidden="true"
                    >
                      <Icon size={15} />
                    </div>
                    <div>
                      <p className={`text-sm font-medium mb-0.5 ${hc ? "text-white" : "text-[#1C1917]"}`}>
                        {label}
                      </p>
                      <p className={`text-xs leading-relaxed ${hc ? "text-gray-500" : "text-[#ABA89F]"}`}>
                        {desc}
                      </p>
                      <span
                        className={`inline-block mt-1.5 text-xs px-2 py-0.5 rounded-full ${
                          hc ? "bg-yellow-400/20 text-yellow-400" : "bg-[#B8945A]/10 text-[#B8945A]"
                        }`}
                      >
                        {lang === "filipino" ? "✓ Available" : "✓ Available"}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </motion.section>

            {/* WCAG Compliance Note */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.2 }}
              className={`rounded-2xl border p-5 ${
                hc
                  ? "border-yellow-400/20 bg-yellow-400/5"
                  : "border-[#B8945A]/20 bg-[#B8945A]/5"
              }`}
              role="note"
            >
              <p className={`text-sm leading-relaxed ${hc ? "text-yellow-400" : "text-[#B8945A]"}`}>
                <span className="font-semibold">
                  {lang === "filipino" ? "Aming Pangako: " : "Our Commitment: "}
                </span>
                {lang === "filipino"
                  ? "Nagsisikap kaming sumunod sa WCAG 2.1 AA standards. Kung mayroon kang feedback o nakaranas ng isyu sa accessibility, mangyaring makipag-ugnayan sa aming support team."
                  : "We strive to comply with WCAG 2.1 AA accessibility standards. If you encounter any accessibility barriers or have feedback, please contact our support team."}
              </p>
            </motion.div>
          </div>
        </div>
      </div>
    </main>
  );
}
