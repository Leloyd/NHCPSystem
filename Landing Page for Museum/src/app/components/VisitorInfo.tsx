import { Clock, MapPin, Ticket, Phone } from "lucide-react";

const visitorBg = "https://images.unsplash.com/photo-1740489799703-bfaa85e0577a?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxtdXNldW0lMjBoZXJpdGFnZSUyMHNpdGUlMjB2aXNpdG9ycyUyMHdhbGtpbmclMjB0cm9waWNhbCUyMGdhcmRlbnxlbnwxfHx8fDE3Nzg1MTQ3MTV8MA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral";

const infoCards = [
  {
    icon: Clock,
    title: "Hours",
    lines: [
      { text: "Tuesday – Sunday", bold: true },
      { text: "8:00 AM – 5:00 PM" },
      { text: "Closed on Mondays", muted: true },
    ],
  },
  {
    icon: MapPin,
    title: "Location",
    lines: [
      { text: "Rizal Ave., Barangay Bambang," },
      { text: "Nagcarlan, Laguna, 4002" },
      { text: "Philippines", muted: true },
    ],
    link: { label: "View Map →", href: "https://maps.google.com/?q=Nagcarlan+Underground+Cemetery,+Laguna,+Philippines" },
  },
  {
    icon: Ticket,
    title: "Admission",
    lines: [{ text: "Free for All", bold: true }],
  },
  {
    icon: Phone,
    title: "Contact",
    lines: [
      { text: "+63 915 249 1151" },
      { text: "museum.undergroundnagcarlan", wrap: true },
      { text: "@gmail.com", muted: true },
    ],
  },
];

export function VisitorInfo() {
  return (
    <section id="visit" className="relative bg-[#1C1208] overflow-hidden">
      {/* Background image with overlay */}
      <div
        className="absolute inset-0 bg-cover bg-center opacity-15"
        style={{ backgroundImage: `url(${visitorBg})` }}
      />
      <div className="absolute inset-0 bg-gradient-to-br from-[#1C1208] via-[#2A1A0A]/90 to-[#1C1208]" />

      {/* Gold top border */}
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#D4AF6A] to-transparent" />

      <div className="relative z-10 max-w-6xl mx-auto px-6 py-24">
        {/* Section label */}
        <div className="flex items-center gap-3 mb-4">
          <div className="h-px w-10 bg-[#D4AF6A]" />
          <span
            className="text-[#D4AF6A] text-xs tracking-[0.3em] uppercase"
            style={{ fontFamily: "'Inter', sans-serif" }}
          >
            Plan Your Visit
          </span>
        </div>

        <h2
          className="text-white mb-3"
          style={{
            fontFamily: "'Playfair Display', serif",
            fontSize: "clamp(1.8rem, 4vw, 2.8rem)",
            fontWeight: 500,
          }}
        >
          Visitor Information
        </h2>
        <p
          className="text-white/50 mb-14 max-w-lg"
          style={{ fontFamily: "'Inter', sans-serif", fontSize: "0.95rem" }}
        >
          Everything you need before exploring the museum grounds, exhibits, and
          heritage spaces.
        </p>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {infoCards.map(({ icon: Icon, title, lines, link }) => (
            <div
              key={title}
              className="border border-white/10 bg-white/5 backdrop-blur-sm p-6 hover:border-[#D4AF6A]/40 hover:bg-white/8 transition-all duration-300"
            >
              <div className="flex items-center gap-3 mb-5">
                <div className="w-8 h-8 flex items-center justify-center bg-[#D4AF6A]/15 border border-[#D4AF6A]/30">
                  <Icon size={15} className="text-[#D4AF6A]" />
                </div>
                <h4
                  className="text-[#D4AF6A] text-xs tracking-widest uppercase"
                  style={{ fontFamily: "'Inter', sans-serif", fontWeight: 600 }}
                >
                  {title}
                </h4>
              </div>
              <div className="space-y-1">
                {lines.map((line, i) => (
                  <p
                    key={i}
                    className={`text-sm leading-relaxed ${
                      line.muted
                        ? "text-white/35"
                        : line.bold
                        ? "text-white"
                        : "text-white/65"
                    }`}
                    style={{
                      fontFamily: "'Inter', sans-serif",
                      fontWeight: line.bold ? 500 : 400,
                    }}
                  >
                    {line.text}
                  </p>
                ))}
                {link && (
                  <a
                    href={link.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-block mt-3 text-[#D4AF6A] text-sm hover:text-[#E8C97A] transition-colors"
                    style={{ fontFamily: "'Inter', sans-serif" }}
                  >
                    {link.label}
                  </a>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Gold bottom border */}
      <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#D4AF6A] to-transparent" />
    </section>
  );
}
