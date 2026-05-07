import { useState } from "react";
import { motion } from "motion/react";
import {
  ChevronDown,
  ChevronUp,
  MessageSquare,
  Mail,
  Phone,
  BookOpen,
  Accessibility,
  HelpCircle,
  Search,
  Eye,
  Globe,
} from "lucide-react";
import { useAccessibility } from "../context/AccessibilityContext";

const faqs = [
  {
    question: "How do I navigate the gallery?",
    questionFil: "Paano ko mananavigasyon ang galería?",
    answer:
      "Use the top navigation bar to move between pages. On the Gallery page, use the search bar and category filters to find specific artifacts. Click on any artifact card or the 'View More' button to see full details.",
    answerFil:
      "Gamitin ang navigation bar sa itaas para lumipat sa pagitan ng mga pahina. Sa Gallery page, gamitin ang search bar at category filters para mahanap ang mga espesipikong artefakto. I-click ang anumang artifact card o ang 'Tingnan Pa' button para makita ang buong detalye.",
  },
  {
    question: "Can I search for artifacts in Filipino?",
    questionFil: "Maaari bang maghanap ng artefakto sa Filipino?",
    answer:
      "Yes! Switch to Filipino using the Language toggle in the navigation bar or Accessibility page. Many artifact titles and descriptions include Filipino terms. The search bar works with both Filipino and English queries.",
    answerFil:
      "Oo! Lumipat sa Filipino gamit ang Language toggle sa navigation bar o sa Accessibility page. Maraming pamagat at paglalarawan ng artefakto ang may kasamang mga salitang Filipino. Gumagana ang search bar sa parehong Filipino at Ingles na mga query.",
  },
  {
    question: "How do I enable the Audio Guide?",
    questionFil: "Paano ko i-enable ang Audio Guide?",
    answer:
      "Go to the Accessibility page (accessible via the navigation) or click the floating accessibility button (gold circular button at the bottom right of every page). Toggle on 'Audio Guide'. Audio guide controls will then appear on individual artifact detail pages.",
    answerFil:
      "Pumunta sa Accessibility page (accessible sa pamamagitan ng navigation) o i-click ang floating accessibility button (gintong bilugang button sa ibabang kanan ng bawat pahina). I-toggle ang 'Gabay sa Tunog'. Lalabas ang audio guide controls sa indibidwal na artifact detail pages.",
  },
  {
    question: "How do I increase text size?",
    questionFil: "Paano ko palakihin ang laki ng teksto?",
    answer:
      "Open the Accessibility settings (via the Accessibility page or the floating button on the bottom right). Under 'Text Size', choose from Small, Medium, or Large. Your preference is saved automatically and will persist across pages.",
    answerFil:
      "Buksan ang Accessibility settings (sa pamamagitan ng Accessibility page o ang floating button sa ibabang kanan). Sa ilalim ng 'Laki ng Teksto', pumili mula sa Maliit, Katamtaman, o Malaki. Ang iyong kagustuhan ay awtomatikong nase-save at mananatili sa lahat ng pahina.",
  },
  {
    question: "What is High Contrast Mode?",
    questionFil: "Ano ang High Contrast Mode?",
    answer:
      "High Contrast Mode changes the gallery's color scheme to a high-contrast black-and-yellow palette, designed for users with low vision or light sensitivity. Enable it from the Accessibility page or the floating accessibility button.",
    answerFil:
      "Ang High Contrast Mode ay nagbabago ng color scheme ng galería sa mataas na kontrasto na itim-at-dilaw na palette, dinisenyo para sa mga may mababang paningin o light sensitivity. I-enable ito mula sa Accessibility page o ang floating accessibility button.",
  },
  {
    question: "Is the gallery free to use?",
    questionFil: "Libre ba ang galería?",
    answer:
      "Yes, the Online Gallery is completely free to browse. No registration or payment is required to view any artifact in our collection.",
    answerFil:
      "Oo, ang Online Gallery ay ganap na libre para ma-browse. Walang kinakailangang pagpaparehistro o bayad para makita ang anumang artefakto sa aming koleksyon.",
  },
  {
    question: "How can I suggest an artifact or report an issue?",
    questionFil: "Paano ako makapagmumungkahi ng artefakto o makakapag-ulat ng isyu?",
    answer:
      "Use the contact form below or email us directly at hello@onlinegallery.ph. For accessibility-related issues, please include details about what barrier you encountered and which assistive technology you are using.",
    answerFil:
      "Gamitin ang contact form sa ibaba o mag-email sa amin nang direkta sa hello@onlinegallery.ph. Para sa mga isyu na may kaugnayan sa accessibility, mangyaring isama ang mga detalye tungkol sa kung anong hadlang ang iyong naranasan at kung anong assistive technology ang iyong ginagamit.",
  },
];

const guides = [
  {
    icon: Search,
    title: "Searching & Filtering",
    titleFil: "Paghahanap at Pag-filter",
    steps: [
      "Use the search bar at the top of the Gallery page",
      "Type keywords: artifact name, category, origin, or period",
      "Use category tabs to filter by type",
      "Combine search and category filters together",
    ],
    stepsFil: [
      "Gamitin ang search bar sa itaas ng Gallery page",
      "Mag-type ng keywords: pangalan ng artefakto, kategorya, pinagmulan, o panahon",
      "Gamitin ang category tabs para mag-filter ayon sa uri",
      "Pagsamahin ang search at category filters",
    ],
  },
  {
    icon: Eye,
    title: "Viewing Artifact Details",
    titleFil: "Pagtingin sa Mga Detalye ng Artefakto",
    steps: [
      "Click any artifact card or 'View More' button",
      "Scroll through the full description and metadata",
      "Click the image to zoom in/out",
      "Use the Previous/Next arrows to navigate between artifacts",
    ],
    stepsFil: [
      "I-click ang anumang artifact card o 'Tingnan Pa' button",
      "Mag-scroll sa buong paglalarawan at metadata",
      "I-click ang imahe para mag-zoom in/out",
      "Gamitin ang Previous/Next arrows para mag-navigate sa pagitan ng mga artefakto",
    ],
  },
  {
    icon: Accessibility,
    title: "Using Accessibility Features",
    titleFil: "Paggamit ng Mga Feature ng Accessibility",
    steps: [
      "Click the gold circular button at the bottom right",
      "Or visit the Accessibility page from the navigation",
      "Toggle features on/off as needed",
      "Settings are automatically saved to your browser",
    ],
    stepsFil: [
      "I-click ang gintong bilugang button sa ibabang kanan",
      "O bisitahin ang Accessibility page mula sa navigation",
      "I-toggle ang mga feature ayon sa pangangailangan",
      "Awtomatikong nase-save ang mga setting sa iyong browser",
    ],
  },
  {
    icon: Globe,
    title: "Switching Language",
    titleFil: "Pagpapalit ng Wika",
    steps: [
      "Click 'EN' or 'FIL' in the navigation bar",
      "Or use the Language toggle in the Accessibility panel",
      "All interface text switches instantly",
      "Your language preference is saved automatically",
    ],
    stepsFil: [
      "I-click ang 'EN' o 'FIL' sa navigation bar",
      "O gamitin ang Language toggle sa Accessibility panel",
      "Agad na nagbabago ang lahat ng interface text",
      "Awtomatikong nase-save ang iyong kagustuhan sa wika",
    ],
  },
];

function FAQItem({
  item,
  lang,
  hc,
}: {
  item: (typeof faqs)[0];
  lang: string;
  hc: boolean;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div
      className={`border rounded-xl overflow-hidden transition-colors ${
        hc
          ? open
            ? "border-yellow-400 bg-yellow-400/5"
            : "border-yellow-400/20"
          : open
          ? "border-[#B8945A]/40 bg-[#B8945A]/5"
          : "border-[#E8E4DF] bg-white"
      }`}
    >
      <button
        onClick={() => setOpen((v) => !v)}
        className={`w-full flex items-center justify-between px-5 py-4 text-left transition-colors ${
          hc ? "text-white hover:text-yellow-400" : "text-[#1C1917] hover:text-[#B8945A]"
        }`}
        aria-expanded={open}
        aria-controls={`faq-answer-${item.question.replace(/\s+/g, "-")}`}
      >
        <span className="text-sm font-medium pr-4">
          {lang === "filipino" ? item.questionFil : item.question}
        </span>
        {open ? (
          <ChevronUp size={16} className="flex-shrink-0" aria-hidden="true" />
        ) : (
          <ChevronDown size={16} className="flex-shrink-0" aria-hidden="true" />
        )}
      </button>
      {open && (
        <div
          id={`faq-answer-${item.question.replace(/\s+/g, "-")}`}
          className={`px-5 pb-4 text-sm leading-relaxed ${
            hc ? "text-gray-400" : "text-[#6B6560]"
          }`}
        >
          {lang === "filipino" ? item.answerFil : item.answer}
        </div>
      )}
    </div>
  );
}

export function SupportPage() {
  const { settings } = useAccessibility();
  const hc = settings.highContrast;
  const lang = settings.language;
  const [formSubmitted, setFormSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormSubmitted(true);
  };

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
        aria-labelledby="support-heading"
      >
        <div className="max-w-7xl mx-auto">
          <span
            className={`text-xs font-semibold tracking-widest uppercase mb-2 block ${
              hc ? "text-yellow-400" : "text-[#B8945A]"
            }`}
          >
            {lang === "filipino" ? "Tulong" : "Help Center"}
          </span>
          <h1 id="support-heading" className={hc ? "text-yellow-400" : "text-[#1C1917]"}>
            {lang === "filipino" ? "Suporta at Gabay" : "Support & Guidance"}
          </h1>
          <p className={`mt-2 max-w-2xl ${hc ? "text-gray-400" : "text-[#6B6560]"}`}>
            {lang === "filipino"
              ? "Handa kaming tulungan ka. Hanapin ang mga sagot sa iyong mga katanungan o makipag-ugnayan sa aming koponan."
              : "We're here to help. Find answers to your questions or get in touch with our team."}
          </p>
        </div>
      </section>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        {/* How to Use Guide */}
        <section className="mb-12" aria-labelledby="how-to-heading">
          <h2
            id="how-to-heading"
            className={`mb-6 ${hc ? "text-yellow-400" : "text-[#1C1917]"}`}
          >
            {lang === "filipino" ? "Paano Gamitin ang Galería" : "How to Use the Gallery"}
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {guides.map((guide, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: i * 0.08 }}
                className={`p-5 rounded-2xl border ${
                  hc ? "border-yellow-400/20 bg-yellow-400/5" : "border-[#E8E4DF] bg-white"
                }`}
              >
                <div
                  className={`w-10 h-10 rounded-xl flex items-center justify-center mb-4 ${
                    hc ? "bg-yellow-400/20 text-yellow-400" : "bg-[#B8945A]/10 text-[#B8945A]"
                  }`}
                  aria-hidden="true"
                >
                  <guide.icon size={18} />
                </div>
                <h3
                  className={`mb-3 ${hc ? "text-yellow-400" : "text-[#1C1917]"}`}
                  style={{ fontSize: "0.95rem" }}
                >
                  {lang === "filipino" ? guide.titleFil : guide.title}
                </h3>
                <ol className="flex flex-col gap-2" aria-label={`Steps for ${guide.title}`}>
                  {(lang === "filipino" ? guide.stepsFil : guide.steps).map(
                    (step, j) => (
                      <li
                        key={j}
                        className={`flex gap-2 text-xs leading-relaxed ${
                          hc ? "text-gray-400" : "text-[#6B6560]"
                        }`}
                      >
                        <span
                          className={`w-4 h-4 rounded-full flex items-center justify-center text-xs flex-shrink-0 mt-0.5 font-semibold ${
                            hc ? "bg-yellow-400/20 text-yellow-400" : "bg-[#F5F1EC] text-[#B8945A]"
                          }`}
                          aria-hidden="true"
                        >
                          {j + 1}
                        </span>
                        {step}
                      </li>
                    )
                  )}
                </ol>
              </motion.div>
            ))}
          </div>
        </section>

        {/* FAQ */}
        <section className="mb-12" aria-labelledby="faq-heading">
          <h2
            id="faq-heading"
            className={`mb-6 ${hc ? "text-yellow-400" : "text-[#1C1917]"}`}
          >
            {lang === "filipino"
              ? "Mga Madalas na Tanong"
              : "Frequently Asked Questions"}
          </h2>
          <div className="flex flex-col gap-3 max-w-3xl">
            {faqs.map((faq, i) => (
              <FAQItem key={i} item={faq} lang={lang} hc={hc} />
            ))}
          </div>
        </section>

        {/* Contact */}
        <section
          className="grid grid-cols-1 lg:grid-cols-2 gap-8"
          aria-labelledby="contact-heading"
        >
          {/* Contact Info */}
          <div>
            <h2
              id="contact-heading"
              className={`mb-6 ${hc ? "text-yellow-400" : "text-[#1C1917]"}`}
            >
              {lang === "filipino" ? "Makipag-ugnayan" : "Get in Touch"}
            </h2>
            <div className="flex flex-col gap-4">
              {[
                {
                  icon: Mail,
                  label: lang === "filipino" ? "Email" : "Email",
                  value: "hello@onlinegallery.ph",
                  href: "mailto:hello@onlinegallery.ph",
                },
                {
                  icon: Phone,
                  label: lang === "filipino" ? "Telepono" : "Phone",
                  value: "+63 (2) 123 4567",
                  href: "tel:+6321234567",
                },
                {
                  icon: MessageSquare,
                  label: lang === "filipino" ? "Live Chat" : "Live Chat",
                  value:
                    lang === "filipino"
                      ? "Available Lunes–Biyernes, 9am–5pm PHT"
                      : "Available Mon–Fri, 9am–5pm PHT",
                  href: "#",
                },
                {
                  icon: HelpCircle,
                  label: lang === "filipino" ? "Accessibility Support" : "Accessibility Support",
                  value:
                    lang === "filipino"
                      ? "access@onlinegallery.ph"
                      : "access@onlinegallery.ph",
                  href: "mailto:access@onlinegallery.ph",
                },
                {
                  icon: BookOpen,
                  label: lang === "filipino" ? "Research Inquiry" : "Research Inquiry",
                  value:
                    lang === "filipino"
                      ? "research@onlinegallery.ph"
                      : "research@onlinegallery.ph",
                  href: "mailto:research@onlinegallery.ph",
                },
              ].map(({ icon: Icon, label, value, href }, i) => (
                <a
                  key={i}
                  href={href}
                  className={`flex items-start gap-4 p-4 rounded-xl border transition-all ${
                    hc
                      ? "border-yellow-400/20 hover:border-yellow-400/40 bg-yellow-400/5"
                      : "border-[#E8E4DF] bg-white hover:border-[#B8945A]/30 hover:shadow-sm"
                  }`}
                >
                  <div
                    className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${
                      hc ? "bg-yellow-400/20 text-yellow-400" : "bg-[#F5F1EC] text-[#B8945A]"
                    }`}
                    aria-hidden="true"
                  >
                    <Icon size={16} />
                  </div>
                  <div>
                    <p className={`text-xs font-semibold uppercase tracking-wide mb-0.5 ${
                      hc ? "text-gray-500" : "text-[#ABA89F]"
                    }`}>
                      {label}
                    </p>
                    <p className={`text-sm ${hc ? "text-white" : "text-[#1C1917]"}`}>{value}</p>
                  </div>
                </a>
              ))}
            </div>
          </div>

          {/* Inquiry Form */}
          <div>
            <h3
              className={`mb-5 ${hc ? "text-yellow-400" : "text-[#1C1917]"}`}
            >
              {lang === "filipino" ? "Magpadala ng Mensahe" : "Send a Message"}
            </h3>

            {formSubmitted ? (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className={`p-8 rounded-2xl border text-center ${
                  hc ? "border-yellow-400 bg-yellow-400/10" : "border-[#B8945A]/30 bg-[#B8945A]/5"
                }`}
                role="alert"
              >
                <div
                  className={`w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-4 text-2xl ${
                    hc ? "bg-yellow-400/20" : "bg-[#B8945A]/10"
                  }`}
                >
                  ✓
                </div>
                <h4 className={`mb-2 ${hc ? "text-yellow-400" : "text-[#B8945A]"}`}>
                  {lang === "filipino" ? "Salamat!" : "Message Sent!"}
                </h4>
                <p className={`text-sm ${hc ? "text-gray-400" : "text-[#6B6560]"}`}>
                  {lang === "filipino"
                    ? "Natanggap namin ang iyong mensahe. Susubukan naming sagutin ito sa loob ng 1–2 araw ng trabaho."
                    : "We've received your message. We'll try to respond within 1–2 business days."}
                </p>
                <button
                  onClick={() => setFormSubmitted(false)}
                  className={`mt-4 text-sm underline ${
                    hc ? "text-yellow-400" : "text-[#B8945A]"
                  }`}
                >
                  {lang === "filipino" ? "Magpadala ng Isa Pa" : "Send Another"}
                </button>
              </motion.div>
            ) : (
              <form
                onSubmit={handleSubmit}
                className={`p-6 rounded-2xl border ${
                  hc ? "border-yellow-400/20 bg-yellow-400/5" : "border-[#E8E4DF] bg-white"
                }`}
                aria-label="Contact form"
              >
                <div className="flex flex-col gap-4">
                  <div>
                    <label
                      htmlFor="contact-name"
                      className={`block text-sm font-medium mb-1.5 ${
                        hc ? "text-white" : "text-[#1C1917]"
                      }`}
                    >
                      {lang === "filipino" ? "Pangalan" : "Name"}
                      <span className="text-red-400 ml-0.5" aria-hidden="true">*</span>
                    </label>
                    <input
                      id="contact-name"
                      type="text"
                      required
                      placeholder={lang === "filipino" ? "Iyong pangalan" : "Your name"}
                      className={`w-full px-4 py-2.5 rounded-xl border text-sm outline-none transition-colors ${
                        hc
                          ? "bg-black border-yellow-400/30 text-white placeholder-gray-600 focus:border-yellow-400"
                          : "bg-[#FAFAF7] border-[#E8E4DF] text-[#1C1917] placeholder-[#ABA89F] focus:border-[#B8945A]"
                      }`}
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="contact-email"
                      className={`block text-sm font-medium mb-1.5 ${
                        hc ? "text-white" : "text-[#1C1917]"
                      }`}
                    >
                      {lang === "filipino" ? "Email" : "Email"}
                      <span className="text-red-400 ml-0.5" aria-hidden="true">*</span>
                    </label>
                    <input
                      id="contact-email"
                      type="email"
                      required
                      placeholder={lang === "filipino" ? "iyong@email.com" : "your@email.com"}
                      className={`w-full px-4 py-2.5 rounded-xl border text-sm outline-none transition-colors ${
                        hc
                          ? "bg-black border-yellow-400/30 text-white placeholder-gray-600 focus:border-yellow-400"
                          : "bg-[#FAFAF7] border-[#E8E4DF] text-[#1C1917] placeholder-[#ABA89F] focus:border-[#B8945A]"
                      }`}
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="contact-topic"
                      className={`block text-sm font-medium mb-1.5 ${
                        hc ? "text-white" : "text-[#1C1917]"
                      }`}
                    >
                      {lang === "filipino" ? "Paksa" : "Topic"}
                    </label>
                    <select
                      id="contact-topic"
                      className={`w-full px-4 py-2.5 rounded-xl border text-sm outline-none transition-colors ${
                        hc
                          ? "bg-black border-yellow-400/30 text-white focus:border-yellow-400"
                          : "bg-[#FAFAF7] border-[#E8E4DF] text-[#1C1917] focus:border-[#B8945A]"
                      }`}
                    >
                      <option value="">
                        {lang === "filipino" ? "Piliin ang paksa..." : "Select a topic..."}
                      </option>
                      <option value="general">
                        {lang === "filipino" ? "Pangkalahatang Katanungan" : "General Inquiry"}
                      </option>
                      <option value="accessibility">
                        {lang === "filipino" ? "Accessibility Help" : "Accessibility Help"}
                      </option>
                      <option value="artifact">
                        {lang === "filipino" ? "Impormasyon sa Artefakto" : "Artifact Information"}
                      </option>
                      <option value="research">
                        {lang === "filipino" ? "Research Request" : "Research Request"}
                      </option>
                      <option value="technical">
                        {lang === "filipino" ? "Technical Issue" : "Technical Issue"}
                      </option>
                    </select>
                  </div>

                  <div>
                    <label
                      htmlFor="contact-message"
                      className={`block text-sm font-medium mb-1.5 ${
                        hc ? "text-white" : "text-[#1C1917]"
                      }`}
                    >
                      {lang === "filipino" ? "Mensahe" : "Message"}
                      <span className="text-red-400 ml-0.5" aria-hidden="true">*</span>
                    </label>
                    <textarea
                      id="contact-message"
                      rows={4}
                      required
                      placeholder={
                        lang === "filipino"
                          ? "Ipaliwanag ang iyong katanungan o isyu..."
                          : "Describe your question or issue..."
                      }
                      className={`w-full px-4 py-2.5 rounded-xl border text-sm outline-none transition-colors resize-none ${
                        hc
                          ? "bg-black border-yellow-400/30 text-white placeholder-gray-600 focus:border-yellow-400"
                          : "bg-[#FAFAF7] border-[#E8E4DF] text-[#1C1917] placeholder-[#ABA89F] focus:border-[#B8945A]"
                      }`}
                    />
                  </div>

                  <button
                    type="submit"
                    className={`w-full py-3 rounded-xl text-sm font-medium transition-all duration-200 ${
                      hc
                        ? "bg-yellow-400 text-black hover:bg-yellow-300"
                        : "bg-[#B8945A] text-white hover:bg-[#A07D47]"
                    }`}
                  >
                    {lang === "filipino" ? "Ipadala ang Mensahe" : "Send Message"}
                  </button>
                </div>
              </form>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}
