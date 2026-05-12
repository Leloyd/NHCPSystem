import { useState, useRef, useEffect } from "react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "./ui/accordion";
import {
  MessageCircle,
  X,
  Send,
  ChevronRight,
  FileText,
  ExternalLink,
  Search,
  Phone,
  Mail,
  MapPin,
  BookOpen,
  ShieldCheck,
  HelpCircle,
  Bot,
  Clock,
  Globe,
  AlertCircle,
  Download,
  Landmark,
  Menu,
  ChevronDown,
} from "lucide-react";

// ─── Data ────────────────────────────────────────────────────────────────────

const faqCategories = [
  {
    id: "visit",
    label: "Visiting & Access",
    icon: MapPin,
    color: "#c9a550",
  },
  {
    id: "heritage",
    label: "Heritage & History",
    icon: Landmark,
    color: "#c9a550",
  },
  {
    id: "policy",
    label: "Policies & Rules",
    icon: ShieldCheck,
    color: "#c9a550",
  },
  {
    id: "digital",
    label: "Digital Services",
    icon: Globe,
    color: "#c9a550",
  },
];

const faqs: Record<
  string,
  { q: string; a: string }[]
> = {
  visit: [
    {
      q: "What are the visiting hours of the Nagcarlan Underground Cemetery?",
      a: "The Nagcarlan Underground Cemetery is open to the public from Tuesday to Sunday, 8:00 AM to 5:00 PM. It is closed every Monday and on major public holidays. Guided tours are available throughout operating hours.",
    },
    {
      q: "Is there an entrance fee to visit the cemetery?",
      a: "Filipino nationals are charged ₱30.00, while foreign nationals are charged ₱100.00. Senior citizens and persons with disabilities (PWDs) with valid IDs are entitled to a 20% discount as prescribed by law.",
    },
    {
      q: "How do I get to the Nagcarlan Underground Cemetery?",
      a: "The cemetery is located in Nagcarlan, Laguna. From Manila, take the South Luzon Expressway (SLEX) to Santa Cruz exit, then proceed to Nagcarlan. By bus, take Tritran or JAC Liner buses bound for Nagcarlan from Buendia or Cubao terminal.",
    },
    {
      q: "Are there accessibility provisions for visitors with disabilities?",
      a: "The NHCP provides reasonable accommodations for visitors with disabilities. Wheelchair ramps are available at the main entrance. Please contact us in advance so we can best assist you during your visit.",
    },
  ],
  heritage: [
    {
      q: "What is the historical significance of the Nagcarlan Underground Cemetery?",
      a: "The Nagcarlan Underground Cemetery (Libingan sa Ilalim ng Lupa) was built in 1845 under the supervision of Fray Isidoro Salcedo, an Augustinian Recollect priest. It served as the burial site for Spanish-era priests and prominent townspeople. It is one of the few remaining underground cemeteries in the Philippines and is declared a National Cultural Treasure.",
    },
    {
      q: "Why is it called an 'underground cemetery'?",
      a: "The cemetery features a circular underground ossuary (crypt) beneath a central chapel. The subterranean chamber contains niches along its walls where the remains of early Spanish friars and prominent citizens were interred, which is why it is referred to as an 'underground' cemetery.",
    },
    {
      q: "Is the Nagcarlan Underground Cemetery a National Cultural Treasure?",
      a: "Yes. The Nagcarlan Underground Cemetery has been declared a National Cultural Treasure by the National Historical Commission of the Philippines (NHCP) under Republic Act No. 10066, also known as the National Cultural Heritage Act of 2009.",
    },
    {
      q: "Did the cemetery play a role in the Philippine Revolution?",
      a: "Yes. Historical accounts indicate that Katipunan members used the underground crypt as a secret meeting place during the Philippine Revolution against Spanish colonialism in the late 19th century, adding another layer of patriotic significance to the site.",
    },
  ],
  policy: [
    {
      q: "What are the prohibited activities within the cemetery grounds?",
      a: "Visitors are prohibited from: littering or defacing the structures, using flash photography inside the crypt, bringing food and drinks within the heritage zone, smoking or vaping on the premises, removing or damaging any artifacts or natural materials, and conducting commercial activities without prior NHCP authorization.",
    },
    {
      q: "Can I conduct academic research or documentation inside the cemetery?",
      a: "Academic researchers and documentarians must secure a formal Research and Documentation Permit from the NHCP Central Office. Submit a letter of intent, research proposal, institutional endorsement, and valid government ID. The permit process typically takes 10–15 working days.",
    },
    {
      q: "Are drones or aerial photography allowed at the site?",
      a: "Drone operations and aerial photography require a special permit from the NHCP and must comply with CAAP regulations. Commercial drone use is strictly regulated. Submit a written request at least 30 days before your intended date of operation.",
    },
    {
      q: "What is the NHCP's policy on souvenir or merchandise selling?",
      a: "Only NHCP-accredited vendors are permitted to sell souvenirs within the designated commercial areas. Unauthorized vending is strictly prohibited. Accreditation applications can be submitted to the Site Administrator.",
    },
  ],
  digital: [
    {
      q: "What digital services does the NHCP provide for this heritage site?",
      a: "The NHCP provides virtual tours, a digital archive, an online permit application portal, an educational resource library, and this interactive Heritage Portal. The digital services aim to expand access to the cultural significance of the site to audiences worldwide.",
    },
    {
      q: "How do I apply for a permit online?",
      a: "Visit the NHCP Permit Portal at permits.nhcp.gov.ph to apply for research, documentation, filming, or commercial permits online. Create an account, complete the application form, upload required documents, and pay the applicable fees through the online payment gateway.",
    },
    {
      q: "Is the virtual tour of the cemetery available for free?",
      a: "Yes. The virtual 360° tour of the Nagcarlan Underground Cemetery is freely accessible through this Heritage Portal. Educational institutions may request premium access with narration and supplementary learning materials at no cost by submitting an institutional request.",
    },
    {
      q: "How can I report a technical issue with the Heritage Portal?",
      a: "Report technical issues through the Support Ticket form available on this page, or email digital@nhcp.gov.ph with a description of the issue, your device/browser information, and screenshots if possible. Our technical team responds within 2 business days.",
    },
  ],
};

const policies = [
  {
    icon: ShieldCheck,
    title: "Republic Act No. 10066",
    subtitle: "National Cultural Heritage Act of 2009",
    description:
      "The primary legislation governing the protection, preservation, and promotion of the cultural heritage of the Philippines. Declares penalties for destroying or damaging cultural properties.",
    tag: "National Law",
    tagColor: "bg-amber-100 text-amber-800",
    link: "#",
  },
  {
    icon: FileText,
    title: "NHCP Administrative Order No. 1",
    subtitle: "Guidelines on the Administration of National Shrines",
    description:
      "Outlines the operational, preservation, and visitor management standards for all National Shrines and Cultural Treasures under NHCP administration.",
    tag: "Administrative Order",
    tagColor: "bg-stone-100 text-stone-700",
    link: "#",
  },
  {
    icon: BookOpen,
    title: "NHCP Memorandum Circular No. 2023-04",
    subtitle: "Digital Heritage Access and Use Policy",
    description:
      "Governs the use, reproduction, and distribution of digital content derived from NHCP-managed heritage sites, including virtual tours, archives, and digital publications.",
    tag: "Digital Policy",
    tagColor: "bg-green-100 text-green-800",
    link: "#",
  },
  {
    icon: AlertCircle,
    title: "Executive Order No. 374",
    subtitle: "Declaring All Historical Landmarks as Protected Zones",
    description:
      "Executive order establishing buffer zones and protection boundaries around declared National Cultural Treasures, prohibiting incompatible land use.",
    tag: "Executive Order",
    tagColor: "bg-blue-100 text-blue-800",
    link: "#",
  },
  {
    icon: Globe,
    title: "UNESCO World Heritage Convention",
    subtitle: "Convention Concerning the Protection of World Cultural Heritage",
    description:
      "International treaty to which the Philippines is a State Party, committing to identify, protect, and preserve cultural and natural heritage of outstanding universal value.",
    tag: "International Treaty",
    tagColor: "bg-purple-100 text-purple-800",
    link: "#",
  },
  {
    icon: Download,
    title: "Site Visitor Regulations",
    subtitle: "Nagcarlan Underground Cemetery Site Rules (2024 Edition)",
    description:
      "Complete rules and regulations for visitors, researchers, media, and commercial entities accessing the Nagcarlan Underground Cemetery premises.",
    tag: "Site Regulation",
    tagColor: "bg-red-100 text-red-700",
    link: "#",
    downloadable: true,
  },
];

type ChatMessage = {
  id: number;
  from: "user" | "bot";
  text: string;
  time: string;
};

const botResponses: Record<string, string> = {
  default:
    "Thank you for your inquiry! For detailed assistance, please contact us at info@nhcp.gov.ph or call (02) 8527-3225. Our staff will be happy to assist you.",
  hours:
    "The Nagcarlan Underground Cemetery is open Tuesday to Sunday, 8:00 AM – 5:00 PM. It is closed on Mondays and major holidays.",
  fee: "Entrance fees: ₱30 for Filipino nationals, ₱100 for foreign nationals. Senior citizens and PWDs receive a 20% discount with valid ID.",
  permit:
    "To apply for a research or documentation permit, visit permits.nhcp.gov.ph or visit the NHCP Central Office at T.M. Kalaw St., Ermita, Manila.",
  history:
    "The Nagcarlan Underground Cemetery was built in 1845. It served as a burial site for Spanish priests and later as a secret meeting place for Katipunan members during the Philippine Revolution.",
  location:
    "Located in Nagcarlan, Laguna. Take SLEX to Santa Cruz exit, then proceed to Nagcarlan. Bus options: Tritran or JAC Liner from Buendia or Cubao.",
};

function getAutoReply(input: string): string {
  const lower = input.toLowerCase();
  if (lower.includes("hour") || lower.includes("open") || lower.includes("time") || lower.includes("schedule"))
    return botResponses.hours;
  if (lower.includes("fee") || lower.includes("cost") || lower.includes("price") || lower.includes("entrance"))
    return botResponses.fee;
  if (lower.includes("permit") || lower.includes("research") || lower.includes("documentary"))
    return botResponses.permit;
  if (lower.includes("history") || lower.includes("built") || lower.includes("katipunan") || lower.includes("revolution"))
    return botResponses.history;
  if (lower.includes("location") || lower.includes("how to get") || lower.includes("direction") || lower.includes("where"))
    return botResponses.location;
  return botResponses.default;
}

// ─── Header ──────────────────────────────────────────────────────────────────

function Header() {
  const [menuOpen, setMenuOpen] = useState(false);
  const navLinks = [
    { label: "Home", href: "#" },
    { label: "About the Site", href: "#" },
    { label: "Virtual Tour", href: "#" },
    { label: "Artifacts", href: "#" },
    { label: "Events", href: "#" },
    { label: "Support", href: "#", active: true },
  ];

  return (
    <header className="w-full" style={{ background: "#1a1208" }}>
      {/* Top bar */}
      <div
        className="w-full py-2 px-4 flex items-center justify-between"
        style={{ background: "#0e0a04", borderBottom: "1px solid rgba(201,165,80,0.2)" }}
      >
        <div className="flex items-center gap-2">
          <img
            src="https://upload.wikimedia.org/wikipedia/commons/thumb/9/99/Seal_of_the_National_Historical_Commission_of_the_Philippines.svg/120px-Seal_of_the_National_Historical_Commission_of_the_Philippines.svg.png"
            alt="NHCP Seal"
            className="h-7 w-7 object-contain opacity-90"
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = "none";
            }}
          />
          <span className="text-xs" style={{ color: "#c9a550" }}>
            National Historical Commission of the Philippines
          </span>
        </div>
        <div className="hidden md:flex items-center gap-4 text-xs" style={{ color: "#9a8060" }}>
          <span className="flex items-center gap-1">
            <Phone className="w-3 h-3" /> (02) 8527-3225
          </span>
          <span className="flex items-center gap-1">
            <Mail className="w-3 h-3" /> info@nhcp.gov.ph
          </span>
        </div>
      </div>

      {/* Main nav */}
      <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div
            className="w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0"
            style={{ background: "rgba(201,165,80,0.15)", border: "1.5px solid rgba(201,165,80,0.4)" }}
          >
            <Landmark className="w-6 h-6" style={{ color: "#c9a550" }} />
          </div>
          <div>
            <p className="text-xs tracking-widest uppercase" style={{ color: "#c9a550" }}>
              NHCP Digital Heritage
            </p>
            <h1 className="leading-tight" style={{ color: "#f5ede0", fontSize: "14px", fontWeight: 600 }}>
              Museo ng Libingan sa Ilalim ng Lupa
            </h1>
            <p className="text-xs" style={{ color: "#9a8060" }}>
              Nagcarlan Underground Cemetery · Laguna
            </p>
          </div>
        </div>

        {/* Desktop Nav */}
        <nav className="hidden lg:flex items-center gap-1">
          {navLinks.map((link) => (
            <a
              key={link.label}
              href={link.href}
              className="px-3 py-2 rounded text-sm transition-colors"
              style={{
                color: link.active ? "#c9a550" : "#c8b89a",
                background: link.active ? "rgba(201,165,80,0.12)" : "transparent",
                borderBottom: link.active ? "2px solid #c9a550" : "2px solid transparent",
              }}
            >
              {link.label}
            </a>
          ))}
        </nav>

        <button
          className="lg:hidden p-2 rounded"
          style={{ color: "#c9a550" }}
          onClick={() => setMenuOpen(!menuOpen)}
        >
          <Menu className="w-5 h-5" />
        </button>
      </div>

      {/* Mobile menu */}
      {menuOpen && (
        <div
          className="lg:hidden px-4 pb-4 flex flex-col gap-1"
          style={{ borderTop: "1px solid rgba(201,165,80,0.15)" }}
        >
          {navLinks.map((link) => (
            <a
              key={link.label}
              href={link.href}
              className="px-3 py-2 rounded text-sm"
              style={{ color: link.active ? "#c9a550" : "#c8b89a" }}
            >
              {link.label}
            </a>
          ))}
        </div>
      )}
    </header>
  );
}

// ─── Hero ─────────────────────────────────────────────────────────────────────

function Hero() {
  return (
    <div className="relative w-full overflow-hidden" style={{ minHeight: "340px" }}>
      <img
        src="https://images.unsplash.com/photo-1532689193429-29caa23e5268?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHx1bmRlcmdyb3VuZCUyMGNlbWV0ZXJ5JTIwc3RvbmUlMjBhcmNoaXRlY3R1cmUlMjBoZXJpdGFnZXxlbnwxfHx8fDE3Nzg1ODY5MTV8MA&ixlib=rb-4.1.0&q=80&w=1080"
        alt="Nagcarlan Underground Cemetery"
        className="w-full h-full object-cover absolute inset-0"
        style={{ filter: "brightness(0.3) sepia(0.4)" }}
      />
      {/* Gradient overlay */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "linear-gradient(135deg, rgba(10,7,3,0.85) 0%, rgba(28,18,8,0.7) 50%, rgba(10,7,3,0.9) 100%)",
        }}
      />
      {/* Decorative border line */}
      <div
        className="absolute bottom-0 left-0 right-0 h-1"
        style={{ background: "linear-gradient(90deg, transparent, #c9a550, transparent)" }}
      />

      <div className="relative z-10 max-w-7xl mx-auto px-4 py-16 flex flex-col items-start justify-center" style={{ minHeight: "340px" }}>
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-xs mb-4" style={{ color: "#9a8060" }}>
          <a href="#" className="hover:text-amber-400 transition-colors">Home</a>
          <ChevronRight className="w-3 h-3" />
          <span style={{ color: "#c9a550" }}>Support & Governance</span>
        </div>

        <div
          className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs mb-4"
          style={{ background: "rgba(201,165,80,0.15)", border: "1px solid rgba(201,165,80,0.3)", color: "#c9a550" }}
        >
          <HelpCircle className="w-3.5 h-3.5" />
          <span className="tracking-widest uppercase">Visitor Support Portal</span>
        </div>

        <h1
          className="mb-3 leading-tight"
          style={{ color: "#f5ede0", fontSize: "clamp(1.8rem, 4vw, 3rem)", fontWeight: 700 }}
        >
          Support &{" "}
          <span style={{ color: "#c9a550" }}>Governance</span>
        </h1>
        <p className="max-w-xl text-sm leading-relaxed mb-6" style={{ color: "#c8b89a" }}>
          Your resource center for visiting the Nagcarlan Underground Cemetery — a National Cultural Treasure.
          Find answers to frequently asked questions, review applicable heritage policies, or chat with
          our Heritage Assistant.
        </p>

        {/* Quick stats */}
        <div className="flex flex-wrap gap-6">
          {[
            { label: "FAQs Available", value: "16+" },
            { label: "Policy Documents", value: "6" },
            { label: "Support Hours", value: "Mon–Fri" },
          ].map((stat) => (
            <div key={stat.label} className="flex flex-col">
              <span
                className="text-xl"
                style={{ color: "#c9a550", fontWeight: 700 }}
              >
                {stat.value}
              </span>
              <span className="text-xs" style={{ color: "#9a8060" }}>
                {stat.label}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── FAQ Section ──────────────────────────────────────────────────────────────

function FAQSection() {
  const [activeCategory, setActiveCategory] = useState("visit");
  const [searchQuery, setSearchQuery] = useState("");

  const currentFaqs = faqs[activeCategory] || [];
  const filtered = searchQuery.trim()
    ? Object.values(faqs)
        .flat()
        .filter(
          (f) =>
            f.q.toLowerCase().includes(searchQuery.toLowerCase()) ||
            f.a.toLowerCase().includes(searchQuery.toLowerCase())
        )
    : currentFaqs;

  return (
    <section className="py-16 px-4" style={{ background: "#f9f5ef" }}>
      <div className="max-w-7xl mx-auto">
        {/* Section header */}
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 mb-10">
          <div>
            <div
              className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs mb-3"
              style={{ background: "rgba(201,165,80,0.1)", border: "1px solid rgba(201,165,80,0.25)", color: "#8b6914" }}
            >
              <HelpCircle className="w-3.5 h-3.5" />
              <span className="tracking-widest uppercase">Frequently Asked Questions</span>
            </div>
            <h2 className="leading-tight mb-2" style={{ color: "#1a1208", fontSize: "clamp(1.4rem, 3vw, 2rem)" }}>
              How can we help you?
            </h2>
            <p className="text-sm" style={{ color: "#6b5a40" }}>
              Browse by category or search for specific topics.
            </p>
          </div>
          {/* Search */}
          <div
            className="relative flex-shrink-0 w-full md:w-72"
          >
            <Search
              className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4"
              style={{ color: "#9a8060" }}
            />
            <input
              type="text"
              placeholder="Search FAQs…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-lg text-sm outline-none transition-all"
              style={{
                background: "#fff",
                border: "1.5px solid rgba(201,165,80,0.3)",
                color: "#1a1208",
              }}
            />
          </div>
        </div>

        {/* Category tabs */}
        {!searchQuery && (
          <div className="flex flex-wrap gap-2 mb-8">
            {faqCategories.map((cat) => {
              const Icon = cat.icon;
              const active = activeCategory === cat.id;
              return (
                <button
                  key={cat.id}
                  onClick={() => setActiveCategory(cat.id)}
                  className="flex items-center gap-2 px-4 py-2 rounded-full text-sm transition-all"
                  style={{
                    background: active ? "#1a1208" : "#fff",
                    color: active ? "#c9a550" : "#6b5a40",
                    border: active
                      ? "1.5px solid #c9a550"
                      : "1.5px solid rgba(201,165,80,0.2)",
                    boxShadow: active ? "0 2px 8px rgba(201,165,80,0.15)" : "none",
                  }}
                >
                  <Icon className="w-4 h-4" />
                  {cat.label}
                </button>
              );
            })}
          </div>
        )}

        {/* Accordion */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2">
            {filtered.length === 0 ? (
              <div
                className="rounded-xl p-10 text-center"
                style={{ background: "#fff", border: "1px solid rgba(201,165,80,0.2)" }}
              >
                <HelpCircle className="w-10 h-10 mx-auto mb-3" style={{ color: "#c9a550" }} />
                <p className="text-sm" style={{ color: "#6b5a40" }}>
                  No results found for "<strong>{searchQuery}</strong>". Try a different keyword or browse by category.
                </p>
              </div>
            ) : (
              <div
                className="rounded-xl overflow-hidden"
                style={{ border: "1px solid rgba(201,165,80,0.2)", background: "#fff" }}
              >
                <Accordion type="single" collapsible className="w-full">
                  {filtered.map((faq, idx) => (
                    <AccordionItem
                      key={idx}
                      value={`faq-${idx}`}
                      className="px-5"
                      style={{ borderBottomColor: "rgba(201,165,80,0.15)" }}
                    >
                      <AccordionTrigger
                        className="text-sm text-left hover:no-underline py-4"
                        style={{ color: "#1a1208" }}
                      >
                        <span className="flex items-start gap-3">
                          <span
                            className="mt-0.5 w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 text-xs"
                            style={{ background: "rgba(201,165,80,0.15)", color: "#c9a550" }}
                          >
                            {idx + 1}
                          </span>
                          {faq.q}
                        </span>
                      </AccordionTrigger>
                      <AccordionContent className="text-sm pl-8 pb-4" style={{ color: "#5a4a30" }}>
                        {faq.a}
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="flex flex-col gap-4">
            {/* Still have questions? */}
            <div
              className="rounded-xl p-6"
              style={{ background: "#1a1208", border: "1px solid rgba(201,165,80,0.2)" }}
            >
              <h3 className="mb-2" style={{ color: "#c9a550", fontSize: "15px" }}>
                Still have questions?
              </h3>
              <p className="text-xs leading-relaxed mb-4" style={{ color: "#c8b89a" }}>
                Our heritage officers are available to assist you with specific inquiries about the site.
              </p>
              <div className="flex flex-col gap-3">
                <a
                  href="mailto:info@nhcp.gov.ph"
                  className="flex items-center gap-3 p-3 rounded-lg transition-colors hover:bg-amber-900/20"
                  style={{ border: "1px solid rgba(201,165,80,0.2)" }}
                >
                  <Mail className="w-4 h-4 flex-shrink-0" style={{ color: "#c9a550" }} />
                  <div>
                    <p className="text-xs" style={{ color: "#c9a550" }}>Email Us</p>
                    <p className="text-xs" style={{ color: "#9a8060" }}>info@nhcp.gov.ph</p>
                  </div>
                </a>
                <a
                  href="tel:028527-3225"
                  className="flex items-center gap-3 p-3 rounded-lg transition-colors hover:bg-amber-900/20"
                  style={{ border: "1px solid rgba(201,165,80,0.2)" }}
                >
                  <Phone className="w-4 h-4 flex-shrink-0" style={{ color: "#c9a550" }} />
                  <div>
                    <p className="text-xs" style={{ color: "#c9a550" }}>Call Us</p>
                    <p className="text-xs" style={{ color: "#9a8060" }}>(02) 8527-3225</p>
                  </div>
                </a>
                <div
                  className="flex items-center gap-3 p-3 rounded-lg"
                  style={{ border: "1px solid rgba(201,165,80,0.2)" }}
                >
                  <Clock className="w-4 h-4 flex-shrink-0" style={{ color: "#c9a550" }} />
                  <div>
                    <p className="text-xs" style={{ color: "#c9a550" }}>Office Hours</p>
                    <p className="text-xs" style={{ color: "#9a8060" }}>Mon–Fri, 8AM–5PM</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Site visit card */}
            <div
              className="rounded-xl overflow-hidden relative"
              style={{ minHeight: "160px" }}
            >
              <img
                src="https://images.unsplash.com/photo-1767963710970-68cc2191c19e?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxhbmNpZW50JTIwc3RvbmUlMjB2YXVsdCUyMGNhdGFjb21icyUyMGRhcmslMjBoZXJpdGFnZXxlbnwxfHx8fDE3Nzg1ODY5MTh8MA&ixlib=rb-4.1.0&q=80&w=400"
                alt="Cemetery"
                className="w-full h-full object-cover absolute inset-0"
                style={{ filter: "brightness(0.4)" }}
              />
              <div className="relative z-10 p-5">
                <p className="text-xs tracking-widest uppercase mb-1" style={{ color: "#c9a550" }}>Plan Your Visit</p>
                <h4 className="mb-2" style={{ color: "#f5ede0" }}>Nagcarlan, Laguna</h4>
                <p className="text-xs mb-3" style={{ color: "#c8b89a" }}>Tue–Sun · 8:00 AM – 5:00 PM</p>
                <a
                  href="#"
                  className="inline-flex items-center gap-1 text-xs px-3 py-1.5 rounded"
                  style={{ background: "rgba(201,165,80,0.9)", color: "#1a1208" }}
                >
                  Get Directions <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

// ─── Policy Section ───────────────────────────────────────────────────────────

function PolicySection() {
  return (
    <section
      className="py-16 px-4"
      style={{ background: "#fff" }}
    >
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 mb-10">
          <div>
            <div
              className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs mb-3"
              style={{ background: "rgba(201,165,80,0.1)", border: "1px solid rgba(201,165,80,0.25)", color: "#8b6914" }}
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              <span className="tracking-widest uppercase">Policy References</span>
            </div>
            <h2 className="leading-tight mb-2" style={{ color: "#1a1208", fontSize: "clamp(1.4rem, 3vw, 2rem)" }}>
              Governance & Legal Framework
            </h2>
            <p className="text-sm max-w-xl" style={{ color: "#6b5a40" }}>
              The Nagcarlan Underground Cemetery is protected under national and international heritage laws.
              Review the applicable policies and regulations below.
            </p>
          </div>
          <a
            href="#"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm flex-shrink-0 transition-colors hover:opacity-90"
            style={{ background: "#1a1208", color: "#c9a550", border: "1px solid rgba(201,165,80,0.3)" }}
          >
            <Download className="w-4 h-4" />
            Download All Policies
          </a>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {policies.map((policy, idx) => {
            const Icon = policy.icon;
            return (
              <div
                key={idx}
                className="rounded-xl p-6 flex flex-col gap-3 group hover:shadow-md transition-shadow cursor-pointer"
                style={{ border: "1.5px solid rgba(201,165,80,0.15)", background: "#faf7f2" }}
              >
                <div className="flex items-start justify-between gap-3">
                  <div
                    className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
                    style={{ background: "rgba(201,165,80,0.12)", border: "1px solid rgba(201,165,80,0.25)" }}
                  >
                    <Icon className="w-5 h-5" style={{ color: "#c9a550" }} />
                  </div>
                  <span
                    className={`text-xs px-2.5 py-1 rounded-full flex-shrink-0 ${policy.tagColor}`}
                  >
                    {policy.tag}
                  </span>
                </div>

                <div>
                  <h3
                    className="mb-1 leading-snug"
                    style={{ color: "#1a1208", fontSize: "14px" }}
                  >
                    {policy.title}
                  </h3>
                  <p
                    className="text-xs mb-2"
                    style={{ color: "#c9a550", fontWeight: 500 }}
                  >
                    {policy.subtitle}
                  </p>
                  <p className="text-xs leading-relaxed" style={{ color: "#6b5a40" }}>
                    {policy.description}
                  </p>
                </div>

                <div className="flex items-center gap-3 mt-auto pt-2" style={{ borderTop: "1px solid rgba(201,165,80,0.1)" }}>
                  <a
                    href={policy.link}
                    className="flex items-center gap-1 text-xs transition-colors hover:text-amber-600"
                    style={{ color: "#8b6914" }}
                  >
                    <ExternalLink className="w-3.5 h-3.5" /> View Full Text
                  </a>
                  {policy.downloadable && (
                    <a
                      href="#"
                      className="flex items-center gap-1 text-xs transition-colors hover:text-amber-600"
                      style={{ color: "#8b6914" }}
                    >
                      <Download className="w-3.5 h-3.5" /> Download PDF
                    </a>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Disclaimer */}
        <div
          className="mt-8 rounded-xl p-5 flex items-start gap-4"
          style={{ background: "rgba(201,165,80,0.06)", border: "1px solid rgba(201,165,80,0.2)" }}
        >
          <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" style={{ color: "#c9a550" }} />
          <div>
            <p className="text-xs leading-relaxed" style={{ color: "#6b5a40" }}>
              <strong style={{ color: "#1a1208" }}>Legal Disclaimer:</strong> The policy documents provided here are for
              reference purposes only. For the official and most current versions, please visit the Official Gazette
              of the Republic of the Philippines at <a href="https://www.officialgazette.gov.ph" className="underline hover:text-amber-700" style={{ color: "#8b6914" }}>www.officialgazette.gov.ph</a> or
              the NHCP official website at <a href="https://nhcp.gov.ph" className="underline hover:text-amber-700" style={{ color: "#8b6914" }}>nhcp.gov.ph</a>.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

// ─── Chatbot Widget ────────────────────────────────────────────────────────────

function ChatbotWidget() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 1,
      from: "bot",
      text: "Maligayang pagdating! Welcome to the Nagcarlan Underground Cemetery Heritage Assistant. How can I help you today? You can ask about visiting hours, entrance fees, directions, permits, or the history of the site.",
      time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    },
  ]);
  const [input, setInput] = useState("");
  const [typing, setTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, open]);

  const sendMessage = (overrideText?: string) => {
    const text = (overrideText ?? input).trim();
    if (!text) return;
    const now = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

    setMessages((prev) => [
      ...prev,
      { id: Date.now(), from: "user", text, time: now },
    ]);
    setInput("");
    setTyping(true);

    setTimeout(() => {
      setTyping(false);
      const reply = getAutoReply(text);
      setMessages((prev) => [
        ...prev,
        { id: Date.now() + 1, from: "bot", text: reply, time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) },
      ]);
    }, 1200);
  };

  const quickReplies = ["Visiting hours", "Entrance fee", "How to get there", "History of the site"];

  return (
    <>
      {/* Chatbot section (embedded card) */}
      <section className="py-16 px-4" style={{ background: "#f9f5ef" }}>
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col lg:flex-row gap-10 items-start">
            {/* Left info */}
            <div className="flex-1">
              <div
                className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs mb-4"
                style={{ background: "rgba(201,165,80,0.1)", border: "1px solid rgba(201,165,80,0.25)", color: "#8b6914" }}
              >
                <Bot className="w-3.5 h-3.5" />
                <span className="tracking-widest uppercase">Heritage Assistant</span>
              </div>
              <h2 className="leading-tight mb-3" style={{ color: "#1a1208", fontSize: "clamp(1.4rem, 3vw, 2rem)" }}>
                Ask our Heritage{" "}
                <span style={{ color: "#c9a550" }}>Chatbot</span>
              </h2>
              <p className="text-sm leading-relaxed mb-6" style={{ color: "#6b5a40" }}>
                Have a quick question about the Nagcarlan Underground Cemetery? Our AI-powered Heritage
                Assistant can provide instant answers about visiting, history, policies, and more.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {[
                  { icon: Clock, title: "Instant Responses", desc: "Get answers immediately, day or night." },
                  { icon: BookOpen, title: "Historical Info", desc: "Detailed heritage and historical facts." },
                  { icon: ShieldCheck, title: "Policy Guidance", desc: "Clarifications on rules and permits." },
                  { icon: MapPin, title: "Visit Planning", desc: "Directions, fees, and travel tips." },
                ].map((item) => {
                  const Icon = item.icon;
                  return (
                    <div
                      key={item.title}
                      className="flex items-start gap-3 p-4 rounded-xl"
                      style={{ background: "#fff", border: "1px solid rgba(201,165,80,0.15)" }}
                    >
                      <div
                        className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                        style={{ background: "rgba(201,165,80,0.1)" }}
                      >
                        <Icon className="w-4 h-4" style={{ color: "#c9a550" }} />
                      </div>
                      <div>
                        <p className="text-sm mb-0.5" style={{ color: "#1a1208", fontWeight: 500 }}>
                          {item.title}
                        </p>
                        <p className="text-xs" style={{ color: "#6b5a40" }}>{item.desc}</p>
                      </div>
                    </div>
                  );
                })}
              </div>

              <p className="text-xs mt-4" style={{ color: "#9a8060" }}>
                * For complex inquiries, please contact NHCP directly at info@nhcp.gov.ph
              </p>
            </div>

            {/* Chat window */}
            <div
              className="flex-shrink-0 w-full lg:w-[400px] rounded-2xl overflow-hidden shadow-xl"
              style={{ border: "1.5px solid rgba(201,165,80,0.25)" }}
            >
              {/* Chat header */}
              <div
                className="px-5 py-4 flex items-center gap-3"
                style={{ background: "#1a1208" }}
              >
                <div
                  className="w-9 h-9 rounded-full flex items-center justify-center"
                  style={{ background: "rgba(201,165,80,0.2)" }}
                >
                  <Bot className="w-5 h-5" style={{ color: "#c9a550" }} />
                </div>
                <div>
                  <p className="text-sm" style={{ color: "#f5ede0", fontWeight: 600 }}>
                    Heritage Assistant
                  </p>
                  <div className="flex items-center gap-1.5">
                    <div
                      className="w-1.5 h-1.5 rounded-full"
                      style={{ background: "#4ade80" }}
                    />
                    <p className="text-xs" style={{ color: "#9a8060" }}>Online · Typical reply: instant</p>
                  </div>
                </div>
              </div>

              {/* Messages */}
              <div
                className="px-4 py-4 flex flex-col gap-3 overflow-y-auto"
                style={{ background: "#faf7f2", minHeight: "320px", maxHeight: "320px" }}
              >
                {messages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`flex ${msg.from === "user" ? "justify-end" : "justify-start"} gap-2`}
                  >
                    {msg.from === "bot" && (
                      <div
                        className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 mt-1"
                        style={{ background: "rgba(201,165,80,0.15)" }}
                      >
                        <Bot className="w-4 h-4" style={{ color: "#c9a550" }} />
                      </div>
                    )}
                    <div className="max-w-[80%] flex flex-col gap-1">
                      <div
                        className="px-4 py-3 rounded-2xl text-xs leading-relaxed"
                        style={
                          msg.from === "user"
                            ? { background: "#1a1208", color: "#f5ede0", borderBottomRightRadius: "4px" }
                            : { background: "#fff", color: "#2a1a08", border: "1px solid rgba(201,165,80,0.15)", borderBottomLeftRadius: "4px" }
                        }
                      >
                        {msg.text}
                      </div>
                      <span className="text-xs px-1" style={{ color: "#9a8060" }}>
                        {msg.time}
                      </span>
                    </div>
                  </div>
                ))}
                {typing && (
                  <div className="flex justify-start gap-2">
                    <div
                      className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0"
                      style={{ background: "rgba(201,165,80,0.15)" }}
                    >
                      <Bot className="w-4 h-4" style={{ color: "#c9a550" }} />
                    </div>
                    <div
                      className="px-4 py-3 rounded-2xl"
                      style={{ background: "#fff", border: "1px solid rgba(201,165,80,0.15)" }}
                    >
                      <div className="flex gap-1 items-center h-4">
                        {[0, 1, 2].map((i) => (
                          <div
                            key={i}
                            className="w-1.5 h-1.5 rounded-full animate-bounce"
                            style={{ background: "#c9a550", animationDelay: `${i * 0.15}s` }}
                          />
                        ))}
                      </div>
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Quick replies */}
              <div
                className="px-4 py-2 flex gap-2 overflow-x-auto"
                style={{ background: "#f5f0e8", borderTop: "1px solid rgba(201,165,80,0.1)" }}
              >
                {quickReplies.map((qr) => (
                  <button
                    key={qr}
                    onClick={() => sendMessage(qr)}
                    className="flex-shrink-0 px-3 py-1.5 rounded-full text-xs transition-colors hover:bg-amber-100"
                    style={{ background: "#fff", border: "1px solid rgba(201,165,80,0.25)", color: "#8b6914", whiteSpace: "nowrap" }}
                  >
                    {qr}
                  </button>
                ))}
              </div>

              {/* Input */}
              <div
                className="px-4 py-3 flex items-center gap-3"
                style={{ background: "#fff", borderTop: "1px solid rgba(201,165,80,0.15)" }}
              >
                <input
                  type="text"
                  placeholder="Type your question here…"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") sendMessage(); }}
                  className="flex-1 text-xs outline-none py-2 px-3 rounded-lg"
                  style={{
                    background: "#f9f5ef",
                    border: "1px solid rgba(201,165,80,0.2)",
                    color: "#1a1208",
                  }}
                />
                <button
                  onClick={sendMessage}
                  className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 transition-opacity hover:opacity-80"
                  style={{ background: "#1a1208" }}
                >
                  <Send className="w-3.5 h-3.5" style={{ color: "#c9a550" }} />
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Floating chatbot button */}
      <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-3">
        {open && (
          <div
            className="rounded-2xl overflow-hidden shadow-2xl w-80"
            style={{ border: "1.5px solid rgba(201,165,80,0.3)" }}
          >
            {/* Header */}
            <div
              className="px-4 py-3 flex items-center justify-between"
              style={{ background: "#1a1208" }}
            >
              <div className="flex items-center gap-2">
                <Bot className="w-4 h-4" style={{ color: "#c9a550" }} />
                <span className="text-sm" style={{ color: "#f5ede0" }}>Heritage Assistant</span>
              </div>
              <button onClick={() => setOpen(false)}>
                <X className="w-4 h-4" style={{ color: "#9a8060" }} />
              </button>
            </div>
            {/* Mini messages */}
            <div
              className="px-3 py-3 flex flex-col gap-2 overflow-y-auto"
              style={{ background: "#faf7f2", maxHeight: "240px" }}
            >
              {messages.slice(-4).map((msg) => (
                <div
                  key={msg.id}
                  className={`flex ${msg.from === "user" ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className="max-w-[85%] px-3 py-2 rounded-xl text-xs leading-relaxed"
                    style={
                      msg.from === "user"
                        ? { background: "#1a1208", color: "#f5ede0" }
                        : { background: "#fff", color: "#2a1a08", border: "1px solid rgba(201,165,80,0.15)" }
                    }
                  >
                    {msg.text}
                  </div>
                </div>
              ))}
              {typing && (
                <div className="flex justify-start">
                  <div
                    className="px-3 py-2 rounded-xl"
                    style={{ background: "#fff", border: "1px solid rgba(201,165,80,0.15)" }}
                  >
                    <div className="flex gap-1 items-center h-3">
                      {[0, 1, 2].map((i) => (
                        <div
                          key={i}
                          className="w-1 h-1 rounded-full animate-bounce"
                          style={{ background: "#c9a550", animationDelay: `${i * 0.15}s` }}
                        />
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
            {/* Mini input */}
            <div
              className="px-3 py-2 flex items-center gap-2"
              style={{ background: "#fff", borderTop: "1px solid rgba(201,165,80,0.15)" }}
            >
              <input
                type="text"
                placeholder="Ask something…"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") sendMessage(); }}
                className="flex-1 text-xs outline-none py-1.5 px-2 rounded-lg"
                style={{ background: "#f9f5ef", border: "1px solid rgba(201,165,80,0.2)", color: "#1a1208" }}
              />
              <button
                onClick={sendMessage}
                className="w-7 h-7 rounded-full flex items-center justify-center"
                style={{ background: "#1a1208" }}
              >
                <Send className="w-3 h-3" style={{ color: "#c9a550" }} />
              </button>
            </div>
          </div>
        )}
        <button
          onClick={() => setOpen(!open)}
          className="w-14 h-14 rounded-full shadow-xl flex items-center justify-center transition-transform hover:scale-105 relative"
          style={{ background: "#1a1208", border: "2px solid rgba(201,165,80,0.5)" }}
        >
          {open ? (
            <X className="w-6 h-6" style={{ color: "#c9a550" }} />
          ) : (
            <MessageCircle className="w-6 h-6" style={{ color: "#c9a550" }} />
          )}
          {!open && (
            <span
              className="absolute -top-1 -right-1 w-4 h-4 rounded-full text-xs flex items-center justify-center"
              style={{ background: "#c9a550", color: "#1a1208", fontSize: "9px" }}
            >
              1
            </span>
          )}
        </button>
      </div>
    </>
  );
}

// ─── Quick Actions ────────────────────────────────────────────────────────────

function QuickActions() {
  const actions = [
    {
      icon: FileText,
      title: "Apply for Permit",
      desc: "Research, filming & documentation permits",
      href: "#",
      cta: "Apply Online",
    },
    {
      icon: Globe,
      title: "Virtual Tour",
      desc: "Explore the cemetery in 360° from anywhere",
      href: "#",
      cta: "Start Tour",
    },
    {
      icon: BookOpen,
      title: "Digital Archive",
      desc: "Access historical records and photographs",
      href: "#",
      cta: "Browse Archive",
    },
    {
      icon: Mail,
      title: "Submit a Concern",
      desc: "Report issues or send official inquiries",
      href: "#",
      cta: "Submit Now",
    },
  ];

  return (
    <section className="py-12 px-4" style={{ background: "#1a1208" }}>
      <div className="max-w-7xl mx-auto">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {actions.map((action) => {
            const Icon = action.icon;
            return (
              <a
                key={action.title}
                href={action.href}
                className="flex flex-col gap-3 p-5 rounded-xl group transition-all hover:shadow-lg"
                style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(201,165,80,0.2)" }}
              >
                <div
                  className="w-10 h-10 rounded-lg flex items-center justify-center"
                  style={{ background: "rgba(201,165,80,0.1)" }}
                >
                  <Icon className="w-5 h-5" style={{ color: "#c9a550" }} />
                </div>
                <div>
                  <h3
                    className="mb-1"
                    style={{ color: "#f5ede0", fontSize: "14px" }}
                  >
                    {action.title}
                  </h3>
                  <p className="text-xs leading-relaxed" style={{ color: "#9a8060" }}>
                    {action.desc}
                  </p>
                </div>
                <div className="flex items-center gap-1 text-xs mt-auto" style={{ color: "#c9a550" }}>
                  {action.cta} <ChevronRight className="w-3.5 h-3.5" />
                </div>
              </a>
            );
          })}
        </div>
      </div>
    </section>
  );
}

// ─── Footer ───────────────────────────────────────────────────────────────────

function Footer() {
  return (
    <footer style={{ background: "#0e0a04", borderTop: "1px solid rgba(201,165,80,0.15)" }}>
      <div className="max-w-7xl mx-auto px-4 py-12 grid grid-cols-1 md:grid-cols-3 gap-10">
        <div>
          <div className="flex items-center gap-3 mb-4">
            <div
              className="w-10 h-10 rounded-full flex items-center justify-center"
              style={{ background: "rgba(201,165,80,0.1)", border: "1px solid rgba(201,165,80,0.25)" }}
            >
              <Landmark className="w-5 h-5" style={{ color: "#c9a550" }} />
            </div>
            <div>
              <p className="text-xs tracking-widest uppercase" style={{ color: "#c9a550" }}>NHCP</p>
              <p style={{ color: "#f5ede0", fontSize: "13px" }}>Nagcarlan Underground Cemetery</p>
            </div>
          </div>
          <p className="text-xs leading-relaxed" style={{ color: "#6b5a40" }}>
            A National Cultural Treasure declared under RA 10066. Managed by the National Historical
            Commission of the Philippines.
          </p>
        </div>

        <div>
          <h4 className="mb-4" style={{ color: "#c9a550", fontSize: "13px" }}>Quick Links</h4>
          <div className="grid grid-cols-2 gap-2">
            {["Home", "About the Site", "Virtual Tour", "Artifacts Gallery", "Events", "Research Permits", "Contact Us", "Privacy Policy"].map((link) => (
              <a
                key={link}
                href="#"
                className="text-xs hover:text-amber-400 transition-colors"
                style={{ color: "#6b5a40" }}
              >
                {link}
              </a>
            ))}
          </div>
        </div>

        <div>
          <h4 className="mb-4" style={{ color: "#c9a550", fontSize: "13px" }}>Contact</h4>
          <div className="flex flex-col gap-3">
            {[
              { Icon: MapPin, text: "T.M. Kalaw St., Ermita, Manila 1000" },
              { Icon: Phone, text: "(02) 8527-3225" },
              { Icon: Mail, text: "info@nhcp.gov.ph" },
              { Icon: Globe, text: "www.nhcp.gov.ph" },
            ].map(({ Icon, text }) => (
              <div key={text} className="flex items-start gap-2">
                <Icon className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" style={{ color: "#c9a550" }} />
                <span className="text-xs" style={{ color: "#6b5a40" }}>{text}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div
        className="px-4 py-4 flex flex-col sm:flex-row items-center justify-between gap-2"
        style={{ borderTop: "1px solid rgba(201,165,80,0.1)" }}
      >
        <p className="text-xs" style={{ color: "#4a3a28" }}>
          © {new Date().getFullYear()} National Historical Commission of the Philippines. All rights reserved.
        </p>
        <p className="text-xs" style={{ color: "#4a3a28" }}>
          Republic of the Philippines · Official Government Website
        </p>
      </div>
    </footer>
  );
}

// ─── Main Export ──────────────────────────────────────────────────────────────

export function SupportPage() {
  return (
    <div className="min-h-screen flex flex-col" style={{ background: "#f9f5ef" }}>
      <Header />
      <Hero />
      <QuickActions />
      <FAQSection />
      <PolicySection />
      <ChatbotWidget />
      <Footer />
    </div>
  );
}
