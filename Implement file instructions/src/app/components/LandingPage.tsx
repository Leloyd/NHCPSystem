import {
  MapPin, Clock, Phone, Mail, Globe, ChevronRight,
  Eye, Accessibility, BookOpen, Users, Headphones,
  Calendar, Info, Scroll, Shield, Compass, ExternalLink,
} from "lucide-react";

interface LandingPageProps {
  onOpenAuth: () => void;
  isLoggedIn: boolean;
}

const HERO_IMG = "https://images.unsplash.com/photo-1645889722826-dfc12064a573?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHx1bmRlcmdyb3VuZCUyMGNlbWV0ZXJ5JTIwaGVyaXRhZ2UlMjBtdXNldW0lMjBQaGlsaXBwaW5lcyUyMHN0b25lfGVufDF8fHx8MTc3OTAxODg0Nnww&ixlib=rb-4.1.0&q=80&w=1080";
const CHURCH_IMG = "https://images.unsplash.com/photo-1733345571509-df8d90de8b7e?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwzfHxjb2xvbmlhbCUyMGNodXJjaCUyMGhpc3RvcmljJTIwY2VtZXRlcnklMjBhcmNoaXRlY3R1cmV8ZW58MXx8fHwxNzc5MDE4ODQ3fDA&ixlib=rb-4.1.0&q=80&w=1080";
const STONE_IMG = "https://images.unsplash.com/photo-1645889895574-05ade6baf9b4?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHw1fHx1bmRlcmdyb3VuZCUyMGNlbWV0ZXJ5JTIwaGVyaXRhZ2UlMjBtdXNldW0lMjBQaGlsaXBwaW5lcyUyMHN0b25lfGVufDF8fHx8MTc3OTAxODg0Nnww&ixlib=rb-4.1.0&q=80&w=1080";
const CHAPEL_IMG = "https://images.unsplash.com/photo-1744066492916-1905231de218?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwyfHxjb2xvbmlhbCUyMGNodXJjaCUyMGhpc3RvcmljJTIwY2VtZXRlcnklMjBhcmNoaXRlY3R1cmV8ZW58MXx8fHwxNzc5MDE4ODQ3fDA&ixlib=rb-4.1.0&q=80&w=1080";

const exhibits = [
  {
    title: "Spanish Colonial Crypts",
    date: "Permanent Collection",
    desc: "Explore the circular underground chamber featuring 24 niches built during the Spanish colonial era.",
    tag: "Permanent",
    icon: "🏺",
  },
  {
    title: "Katipunan Heritage Walk",
    date: "Ongoing · 2026",
    desc: "A curated exhibit on the revolutionary connections of Nagcarlan in the late 19th century.",
    tag: "Ongoing",
    icon: "📜",
  },
  {
    title: "Stones & Stories Photo Exhibition",
    date: "Until June 30, 2026",
    desc: "A collection of archival and contemporary photographs documenting the cemetery's evolution.",
    tag: "Temporary",
    icon: "📷",
  },
];

const platformFeatures = [
  { icon: <Eye size={22} />, title: "WebXR Virtual Tours", desc: "Immersive 360° tours of the underground crypt accessible on web browsers and VR headsets." },
  { icon: <Accessibility size={22} />, title: "Accessibility Features", desc: "Audio descriptions, high-contrast mode, and screen-reader-friendly navigation throughout." },
  { icon: <BookOpen size={22} />, title: "Digital Learning Hub", desc: "Curated materials for students, teachers, and researchers about Nagcarlan's heritage." },
  { icon: <Headphones size={22} />, title: "Audio Guides", desc: "Multilingual audio narration for every exhibit, available in Filipino and English." },
  { icon: <Users size={22} />, title: "Community Contributions", desc: "Share your family stories, photos, and memories connected to the Nagcarlan community." },
  { icon: <Compass size={22} />, title: "Interactive Maps", desc: "Detailed site maps with wayfinding for both physical visits and virtual exploration." },
];

const houseRules = [
  "Maintain a respectful and quiet demeanor throughout the site.",
  "Photography is allowed; flash and drone use require a permit.",
  "Do not touch or lean on historical structures.",
  "Proper attire is required — no shorts or sleeveless tops inside the chapel.",
  "Guided tours must be arranged in advance for groups of 10 or more.",
  "Food and beverages are not allowed inside the underground crypt.",
  "Children must be accompanied by an adult at all times.",
  "Respect the sacred nature of this site — it is an active heritage space.",
];

export function LandingPage({ onOpenAuth, isLoggedIn }: LandingPageProps) {
  return (
    <div style={{ background: "#FAF6EF", color: "#2C1A0E" }}>
      {/* HERO */}
      <section className="relative min-h-screen flex items-end" style={{ paddingTop: 64 }}>
        <div className="absolute inset-0">
          <img src={HERO_IMG} alt="Nagcarlan Underground Cemetery stone building" className="w-full h-full object-cover" />
          <div className="absolute inset-0" style={{ background: "linear-gradient(to top, rgba(18,10,4,0.92) 0%, rgba(18,10,4,0.5) 50%, rgba(18,10,4,0.25) 100%)" }} />
        </div>

        {/* Ana Kalang Tour Guide */}
        <div className="absolute bottom-8 right-6 lg:right-12 z-10 hidden md:block">
          <div className="relative max-w-xs">
            {/* Speech bubble */}
            <div className="mb-2 p-4 rounded-2xl rounded-br-sm shadow-xl" style={{ background: "rgba(245,237,214,0.96)", border: "1px solid rgba(184,150,62,0.4)" }}>
              <p style={{ color: "#3D2B1F", fontSize: 13, lineHeight: 1.6 }}>
                "Welcome! I'm <strong>Ana Kalang</strong>, your digital heritage guide. Let me help you explore the history, exhibits, accessibility features, and immersive experiences of the Nagcarlan Underground Cemetery."
              </p>
            </div>
            {/* Character placeholder */}
            <div className="flex flex-col items-center">
              <div
                className="w-28 h-36 rounded-2xl flex flex-col items-center justify-end pb-3 gap-1 shadow-xl"
                style={{
                  background: "linear-gradient(180deg, #8B6914 0%, #5C3D11 100%)",
                  border: "2px solid rgba(184,150,62,0.5)",
                  position: "relative",
                  overflow: "hidden",
                }}
              >
                <div className="absolute inset-0 flex items-center justify-center opacity-10">
                  <svg width="80" height="80" viewBox="0 0 80 80" fill="none">
                    <circle cx="40" cy="28" r="18" fill="white"/>
                    <ellipse cx="40" cy="68" rx="26" ry="22" fill="white"/>
                  </svg>
                </div>
                <div className="w-12 h-12 rounded-full" style={{ background: "#C9A060", border: "2px solid rgba(255,255,255,0.3)" }} />
                <div className="w-20 h-16 rounded-t-3xl" style={{ background: "#6B3F10" }} />
                <div className="absolute bottom-0 left-0 right-0 text-center py-1" style={{ background: "rgba(0,0,0,0.3)" }}>
                  <span style={{ color: "#F5EDD6", fontSize: 9, letterSpacing: "0.05em" }}>ANA KALANG</span>
                </div>
              </div>
              <div className="mt-1.5 px-3 py-1 rounded-full text-center" style={{ background: "rgba(184,150,62,0.15)", border: "1px solid rgba(184,150,62,0.3)" }}>
                <span style={{ color: "#B8963E", fontSize: 10, letterSpacing: "0.06em" }}>3D TOUR GUIDE PLACEHOLDER</span>
              </div>
            </div>
          </div>
        </div>

        {/* Hero content */}
        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-20 pt-24 w-full">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full mb-6" style={{ background: "rgba(184,150,62,0.15)", border: "1px solid rgba(184,150,62,0.35)" }}>
              <span style={{ color: "#C9A84C", fontSize: 12, letterSpacing: "0.1em" }}>NATIONAL HISTORICAL COMMISSION OF THE PHILIPPINES</span>
            </div>
            <h1 className="mb-4" style={{ color: "#F5EDD6", fontSize: "clamp(2rem, 5vw, 3.5rem)", fontWeight: 700, lineHeight: 1.15 }}>
              Museo ng Libingan<br />
              <span style={{ color: "#C9A84C" }}>sa Ilalim ng Lupa</span>
            </h1>
            <p className="mb-2" style={{ color: "#C9B99A", fontSize: "clamp(1rem, 2vw, 1.2rem)" }}>Nagcarlan Underground Cemetery Museum</p>
            <p className="mb-8" style={{ color: "#9E8B72", maxWidth: "34rem", lineHeight: 1.7 }}>
              Discover the 19th-century Spanish colonial underground crypt of Nagcarlan, Laguna — a National Cultural Treasure preserved for future generations through digital heritage technology.
            </p>
            <div className="flex flex-wrap gap-3">
              <a
                href="#platform"
                className="inline-flex items-center gap-2 px-6 py-3 rounded-xl transition-all hover:opacity-90 active:scale-[0.98] focus:outline-none focus:ring-2 focus:ring-amber-400/40"
                style={{ background: "linear-gradient(135deg, #B8963E, #C9A84C)", color: "#1C1008", fontWeight: 600 }}
              >
                Explore Platform <ChevronRight size={16} />
              </a>
              {!isLoggedIn && (
                <button
                  onClick={onOpenAuth}
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-xl border transition-all hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-white/30"
                  style={{ borderColor: "rgba(255,255,255,0.3)", color: "#F5EDD6", fontWeight: 600 }}
                >
                  Create Account
                </button>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* EXHIBITS & NEWS */}
      <section id="exhibits" className="py-20 px-4 sm:px-6 lg:px-8" style={{ background: "#F5EDD6" }}>
        <div className="max-w-7xl mx-auto">
          <div className="flex items-end justify-between mb-12">
            <div>
              <div className="flex items-center gap-2 mb-3">
                <div className="w-8 h-0.5" style={{ background: "#B8963E" }} />
                <span style={{ color: "#B8963E", fontSize: 12, letterSpacing: "0.12em" }}>CURRENT HIGHLIGHTS</span>
              </div>
              <h2 style={{ color: "#2C1A0E" }}>Exhibits & News</h2>
            </div>
            <a href="#" className="hidden sm:flex items-center gap-1.5 transition-colors hover:opacity-70" style={{ color: "#B8963E", fontSize: 14 }}>
              View all <ExternalLink size={13} />
            </a>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {exhibits.map((ex, i) => (
              <article key={i} className="rounded-2xl overflow-hidden transition-all hover:-translate-y-1 hover:shadow-lg cursor-pointer" style={{ background: "#FAF6EF", border: "1px solid rgba(184,150,62,0.15)" }}>
                <div className="h-48 flex items-center justify-center" style={{ background: "linear-gradient(135deg, #E8D5B0, #D4C090)" }}>
                  <span style={{ fontSize: 48 }}>{ex.icon}</span>
                </div>
                <div className="p-5">
                  <div className="flex items-center justify-between mb-3">
                    <span className="px-2.5 py-1 rounded-full text-xs" style={{
                      background: ex.tag === "Permanent" ? "rgba(184,150,62,0.15)" : ex.tag === "Ongoing" ? "rgba(45,106,79,0.12)" : "rgba(139,68,19,0.1)",
                      color: ex.tag === "Permanent" ? "#B8963E" : ex.tag === "Ongoing" ? "#2D6A4F" : "#8B4513",
                      fontWeight: 500,
                    }}>
                      {ex.tag}
                    </span>
                    <span style={{ color: "#9E8B72", fontSize: 12 }}>{ex.date}</span>
                  </div>
                  <h3 style={{ color: "#2C1A0E", marginBottom: 8 }}>{ex.title}</h3>
                  <p style={{ color: "#7D6B54", fontSize: 14, lineHeight: 1.6 }}>{ex.desc}</p>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* VISITOR INFORMATION */}
      <section id="visit" className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div>
              <div className="flex items-center gap-2 mb-3">
                <div className="w-8 h-0.5" style={{ background: "#B8963E" }} />
                <span style={{ color: "#B8963E", fontSize: 12, letterSpacing: "0.12em" }}>PLAN YOUR VISIT</span>
              </div>
              <h2 className="mb-6" style={{ color: "#2C1A0E" }}>Visitor Information</h2>
              <div className="space-y-5">
                <div className="flex gap-4">
                  <div className="flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: "rgba(184,150,62,0.12)" }}>
                    <MapPin size={18} style={{ color: "#B8963E" }} />
                  </div>
                  <div>
                    <p style={{ color: "#2C1A0E", fontWeight: 600, marginBottom: 2 }}>Location</p>
                    <p style={{ color: "#7D6B54", fontSize: 14, lineHeight: 1.6 }}>Cemetery Road, Nagcarlan, Laguna 4023, Philippines</p>
                  </div>
                </div>
                <div className="flex gap-4">
                  <div className="flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: "rgba(184,150,62,0.12)" }}>
                    <Clock size={18} style={{ color: "#B8963E" }} />
                  </div>
                  <div>
                    <p style={{ color: "#2C1A0E", fontWeight: 600, marginBottom: 2 }}>Visiting Hours</p>
                    <p style={{ color: "#7D6B54", fontSize: 14, lineHeight: 1.6 }}>Tuesday – Sunday · 8:00 AM – 5:00 PM<br />Closed on Mondays and public holidays</p>
                  </div>
                </div>
                <div className="flex gap-4">
                  <div className="flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: "rgba(184,150,62,0.12)" }}>
                    <Phone size={18} style={{ color: "#B8963E" }} />
                  </div>
                  <div>
                    <p style={{ color: "#2C1A0E", fontWeight: 600, marginBottom: 2 }}>Contact</p>
                    <p style={{ color: "#7D6B54", fontSize: 14 }}>+63 (049) 501-0000</p>
                  </div>
                </div>
                <div className="flex gap-4">
                  <div className="flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: "rgba(184,150,62,0.12)" }}>
                    <Calendar size={18} style={{ color: "#B8963E" }} />
                  </div>
                  <div>
                    <p style={{ color: "#2C1A0E", fontWeight: 600, marginBottom: 2 }}>Admission</p>
                    <p style={{ color: "#7D6B54", fontSize: 14, lineHeight: 1.6 }}>Adults: ₱50 · Students: ₱20 · PWD / Senior: Free<br />Group rates available for 20+ visitors</p>
                  </div>
                </div>
              </div>
            </div>
            <div className="relative rounded-2xl overflow-hidden h-80 lg:h-[420px] shadow-xl">
              <img src={CHURCH_IMG} alt="Cemetery with church" className="w-full h-full object-cover" />
              <div className="absolute inset-0" style={{ background: "linear-gradient(to top, rgba(28,16,8,0.5) 0%, transparent 60%)" }} />
              <div className="absolute bottom-5 left-5 right-5">
                <p style={{ color: "#F5EDD6", fontWeight: 600 }}>Nagcarlan Underground Cemetery</p>
                <p style={{ color: "#C9B99A", fontSize: 13 }}>A National Cultural Treasure · Est. 1845</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ABOUT THE SITE */}
      <section className="py-20 px-4 sm:px-6 lg:px-8" style={{ background: "#F5EDD6" }}>
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div className="relative rounded-2xl overflow-hidden h-80 lg:h-[420px] shadow-xl order-2 lg:order-1">
              <img src={STONE_IMG} alt="Stone heritage building" className="w-full h-full object-cover" />
              <div className="absolute inset-0" style={{ background: "linear-gradient(to top, rgba(28,16,8,0.4) 0%, transparent 50%)" }} />
            </div>
            <div className="order-1 lg:order-2">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-8 h-0.5" style={{ background: "#B8963E" }} />
                <span style={{ color: "#B8963E", fontSize: 12, letterSpacing: "0.12em" }}>ABOUT THE SITE</span>
              </div>
              <h2 className="mb-5" style={{ color: "#2C1A0E" }}>A Living Heritage Site</h2>
              <p className="mb-4" style={{ color: "#7D6B54", lineHeight: 1.8 }}>
                The Nagcarlan Underground Cemetery is a National Cultural Treasure and one of the most architecturally significant heritage sites in the Philippines. Built in 1845 by Franciscan friar Isidoro de los Santos, the circular brick crypt features 24 wall niches and a central chamber beneath a chapel.
              </p>
              <p style={{ color: "#7D6B54", lineHeight: 1.8 }}>
                The site holds deep historical significance — it served as a meeting place for Katipunan members during the Philippine Revolution. Today, it is managed by the National Historical Commission of the Philippines and preserved as a museum open to the public.
              </p>
              <div className="mt-6 grid grid-cols-3 gap-4">
                {[{ value: "1845", label: "Year Built" }, { value: "24", label: "Burial Niches" }, { value: "NCT", label: "Cultural Status" }].map(stat => (
                  <div key={stat.label} className="text-center p-3 rounded-xl" style={{ background: "rgba(184,150,62,0.08)", border: "1px solid rgba(184,150,62,0.15)" }}>
                    <div style={{ color: "#B8963E", fontWeight: 700, fontSize: 20 }}>{stat.value}</div>
                    <div style={{ color: "#9E8B72", fontSize: 12 }}>{stat.label}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CEMETERY HISTORY */}
      <section id="history" className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12">
            <div className="flex items-center justify-center gap-2 mb-3">
              <div className="w-8 h-0.5" style={{ background: "#B8963E" }} />
              <span style={{ color: "#B8963E", fontSize: 12, letterSpacing: "0.12em" }}>THROUGH THE AGES</span>
              <div className="w-8 h-0.5" style={{ background: "#B8963E" }} />
            </div>
            <h2 style={{ color: "#2C1A0E" }}>Cemetery History</h2>
          </div>
          <div className="relative">
            <div className="absolute left-1/2 top-0 bottom-0 w-px -translate-x-1/2 hidden md:block" style={{ background: "linear-gradient(to bottom, transparent, rgba(184,150,62,0.3), transparent)" }} />
            <div className="space-y-8 md:space-y-0">
              {[
                { year: "1845", title: "Construction", desc: "Built by Franciscan friar Fr. Isidoro de los Santos as a burial place for priests and prominent residents of Nagcarlan.", side: "left" },
                { year: "1890s", title: "Katipunan Meetings", desc: "The underground chamber was reportedly used as a secret meeting place by Katipunan revolutionaries plotting independence from Spain.", side: "right" },
                { year: "1973", title: "National Landmark Declaration", desc: "Declared a National Cultural Treasure by the National Historical Commission of the Philippines.", side: "left" },
                { year: "2024", title: "Digital Heritage Platform Launch", desc: "The NHCP launched the WebXR-enabled digital heritage platform to bring the site to audiences worldwide.", side: "right" },
              ].map((item, i) => (
                <div key={i} className={`md:flex items-center gap-8 md:mb-8 ${item.side === "right" ? "md:flex-row-reverse" : ""}`}>
                  <div className={`flex-1 ${item.side === "right" ? "md:text-left" : "md:text-right"}`}>
                    <div className="p-5 rounded-2xl inline-block max-w-sm w-full" style={{ background: "#F5EDD6", border: "1px solid rgba(184,150,62,0.2)" }}>
                      <div className="flex items-center gap-2 mb-2" style={{ justifyContent: item.side === "right" ? "flex-start" : "flex-end" }}>
                        <Scroll size={14} style={{ color: "#B8963E" }} />
                        <span style={{ color: "#B8963E", fontSize: 13, fontWeight: 600 }}>{item.year}</span>
                      </div>
                      <h3 style={{ color: "#2C1A0E", marginBottom: 6 }}>{item.title}</h3>
                      <p style={{ color: "#7D6B54", fontSize: 14, lineHeight: 1.6 }}>{item.desc}</p>
                    </div>
                  </div>
                  <div className="hidden md:flex w-4 h-4 rounded-full flex-shrink-0 z-10 items-center justify-center" style={{ background: "#B8963E", boxShadow: "0 0 0 4px rgba(184,150,62,0.2)" }} />
                  <div className="flex-1 hidden md:block" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* HOUSE RULES */}
      <section className="py-20 px-4 sm:px-6 lg:px-8" style={{ background: "#2C1A0E" }}>
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <div className="flex items-center justify-center gap-2 mb-3">
              <div className="w-8 h-0.5" style={{ background: "#B8963E" }} />
              <span style={{ color: "#B8963E", fontSize: 12, letterSpacing: "0.12em" }}>SITE GUIDELINES</span>
              <div className="w-8 h-0.5" style={{ background: "#B8963E" }} />
            </div>
            <h2 style={{ color: "#F5EDD6" }}>House Rules</h2>
            <p className="mt-3" style={{ color: "#9E8B72" }}>Help us preserve this sacred heritage space for generations to come.</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {houseRules.map((rule, i) => (
              <div key={i} className="flex items-start gap-3 p-4 rounded-xl" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(184,150,62,0.12)" }}>
                <div className="flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center mt-0.5" style={{ background: "rgba(184,150,62,0.2)" }}>
                  <Shield size={12} style={{ color: "#B8963E" }} />
                </div>
                <p style={{ color: "#C9B99A", fontSize: 14, lineHeight: 1.6 }}>{rule}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* EXPLORE OUR PLATFORM */}
      <section id="platform" className="py-20 px-4 sm:px-6 lg:px-8" style={{ background: "#F5EDD6" }}>
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12">
            <div className="flex items-center justify-center gap-2 mb-3">
              <div className="w-8 h-0.5" style={{ background: "#B8963E" }} />
              <span style={{ color: "#B8963E", fontSize: 12, letterSpacing: "0.12em" }}>DIGITAL EXPERIENCE</span>
              <div className="w-8 h-0.5" style={{ background: "#B8963E" }} />
            </div>
            <h2 style={{ color: "#2C1A0E" }}>Explore Our Platform</h2>
            <p className="mt-3 max-w-xl mx-auto" style={{ color: "#7D6B54" }}>
              A WebXR-enabled heritage platform designed for everyone — visitors, students, researchers, and persons with disabilities.
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {platformFeatures.map((feat, i) => (
              <div key={i} className="p-6 rounded-2xl transition-all hover:-translate-y-1 hover:shadow-md" style={{ background: "#FAF6EF", border: "1px solid rgba(184,150,62,0.15)" }}>
                <div className="w-11 h-11 rounded-xl flex items-center justify-center mb-4" style={{ background: "linear-gradient(135deg, rgba(184,150,62,0.15), rgba(201,168,76,0.2))" }}>
                  <span style={{ color: "#B8963E" }}>{feat.icon}</span>
                </div>
                <h3 className="mb-2" style={{ color: "#2C1A0E" }}>{feat.title}</h3>
                <p style={{ color: "#7D6B54", fontSize: 14, lineHeight: 1.6 }}>{feat.desc}</p>
              </div>
            ))}
          </div>
          {!isLoggedIn && (
            <div className="mt-12 text-center">
              <div className="inline-block px-8 py-8 rounded-2xl" style={{ background: "linear-gradient(135deg, #2C1A0E, #3D2B1F)", maxWidth: 480 }}>
                <p style={{ color: "#C9B99A", marginBottom: 16, lineHeight: 1.7 }}>
                  Create a free account to unlock personalized tours, save your progress, and access exclusive digital exhibits.
                </p>
                <button
                  onClick={onOpenAuth}
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-xl transition-all hover:opacity-90 active:scale-[0.98] focus:outline-none focus:ring-2 focus:ring-amber-400/40"
                  style={{ background: "linear-gradient(135deg, #B8963E, #C9A84C)", color: "#1C1008", fontWeight: 600 }}
                >
                  Get Started — It's Free <ChevronRight size={16} />
                </button>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* FOOTER */}
      <footer style={{ background: "#1C1008", borderTop: "1px solid rgba(184,150,62,0.15)" }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-10">
            {/* Brand */}
            <div className="lg:col-span-1">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: "linear-gradient(135deg, #B8963E, #C9A84C)" }}>
                  <span style={{ fontSize: 14 }}>🏛️</span>
                </div>
                <span style={{ color: "#F5EDD6", fontWeight: 700, fontSize: 14 }}>NHCP Museo ng Libingan</span>
              </div>
              <p style={{ color: "#7D6B54", fontSize: 13, lineHeight: 1.7 }}>
                Preserving the heritage of Nagcarlan's Underground Cemetery through digital innovation and community engagement.
              </p>
            </div>

            {/* Quick Links */}
            <div>
              <h4 className="mb-4" style={{ color: "#B8963E" }}>Quick Links</h4>
              <ul className="space-y-2">
                {["Exhibits & News", "Visitor Information", "About the Site", "Cemetery History", "House Rules", "Explore Platform"].map(link => (
                  <li key={link}>
                    <a href="#" className="transition-colors hover:text-amber-400 focus:outline-none focus:underline" style={{ color: "#7D6B54", fontSize: 14 }}>{link}</a>
                  </li>
                ))}
              </ul>
            </div>

            {/* Contact */}
            <div>
              <h4 className="mb-4" style={{ color: "#B8963E" }}>Contact</h4>
              <ul className="space-y-3">
                <li className="flex items-start gap-2">
                  <MapPin size={14} className="mt-0.5 flex-shrink-0" style={{ color: "#B8963E" }} />
                  <span style={{ color: "#7D6B54", fontSize: 13 }}>Cemetery Road, Nagcarlan, Laguna 4023</span>
                </li>
                <li className="flex items-center gap-2">
                  <Phone size={14} style={{ color: "#B8963E" }} />
                  <span style={{ color: "#7D6B54", fontSize: 13 }}>+63 (049) 501-0000</span>
                </li>
                <li className="flex items-center gap-2">
                  <Mail size={14} style={{ color: "#B8963E" }} />
                  <span style={{ color: "#7D6B54", fontSize: 13 }}>info@nhcp-nagcarlan.gov.ph</span>
                </li>
                <li className="flex items-center gap-2">
                  <Globe size={14} style={{ color: "#B8963E" }} />
                  <span style={{ color: "#7D6B54", fontSize: 13 }}>nhcp-digital-heritage.vercel.app</span>
                </li>
              </ul>
            </div>

            {/* Visiting Hours */}
            <div>
              <h4 className="mb-4" style={{ color: "#B8963E" }}>Visiting Hours</h4>
              <ul className="space-y-2">
                {[
                  { day: "Tue – Fri", time: "8:00 AM – 5:00 PM" },
                  { day: "Saturday", time: "8:00 AM – 5:00 PM" },
                  { day: "Sunday", time: "9:00 AM – 4:00 PM" },
                  { day: "Monday", time: "Closed" },
                  { day: "Holidays", time: "Closed" },
                ].map(h => (
                  <li key={h.day} className="flex justify-between" style={{ fontSize: 13 }}>
                    <span style={{ color: "#9E8B72" }}>{h.day}</span>
                    <span style={{ color: h.time === "Closed" ? "#7D6B54" : "#C9B99A" }}>{h.time}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div className="mt-12 pt-6 flex flex-col sm:flex-row items-center justify-between gap-4" style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}>
            <p style={{ color: "#4A3828", fontSize: 13 }}>
              © 2026 National Historical Commission of the Philippines. All rights reserved.
            </p>
            <div className="flex items-center gap-1">
              <Info size={12} style={{ color: "#4A3828" }} />
              <span style={{ color: "#4A3828", fontSize: 12 }}>A Digital Heritage Initiative</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
