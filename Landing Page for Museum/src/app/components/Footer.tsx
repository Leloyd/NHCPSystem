import { MapPin, Phone, Mail } from "lucide-react";

export function Footer() {
  const scrollTo = (href: string) => {
    const el = document.querySelector(href);
    if (el) el.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <footer className="bg-[#0D0A04] text-white">
      {/* Gold top line */}
      <div className="h-px bg-gradient-to-r from-transparent via-[#D4AF6A] to-transparent" />

      <div className="max-w-6xl mx-auto px-6 py-16">
        <div className="grid md:grid-cols-3 gap-12 mb-12">
          {/* Brand */}
          <div>
            <div className="mb-4">
              <p
                className="text-[#D4AF6A] text-lg mb-1"
                style={{ fontFamily: "'Playfair Display', serif", fontWeight: 500 }}
              >
                Museo ng Libingan
              </p>
              <p
                className="text-[#D4AF6A]/60 text-xs tracking-widest uppercase"
                style={{ fontFamily: "'Inter', sans-serif" }}
              >
                sa Ilalim ng Lupa
              </p>
            </div>
            <p
              className="text-white/40 text-sm leading-relaxed"
              style={{ fontFamily: "'Inter', sans-serif" }}
            >
              Nagcarlan Underground Cemetery Museum — A National Historical
              Landmark since 1973.
            </p>
          </div>

          {/* Quick links */}
          <div>
            <h5
              className="text-[#D4AF6A]/70 text-xs tracking-widest uppercase mb-5"
              style={{ fontFamily: "'Inter', sans-serif" }}
            >
              Explore
            </h5>
            <ul className="space-y-3">
              {[
                { label: "Living Testament", href: "#testament" },
                { label: "About the Site", href: "#about" },
                { label: "Cemetery History", href: "#history" },
                { label: "Plan Your Visit", href: "#visit" },
                { label: "House Rules", href: "#rules" },
              ].map((link) => (
                <li key={link.href}>
                  <button
                    onClick={() => scrollTo(link.href)}
                    className="text-white/45 hover:text-[#D4AF6A] transition-colors text-sm cursor-pointer"
                    style={{ fontFamily: "'Inter', sans-serif" }}
                  >
                    {link.label}
                  </button>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h5
              className="text-[#D4AF6A]/70 text-xs tracking-widest uppercase mb-5"
              style={{ fontFamily: "'Inter', sans-serif" }}
            >
              Get in Touch
            </h5>
            <ul className="space-y-4">
              <li className="flex items-start gap-3">
                <MapPin size={14} className="text-[#D4AF6A]/60 mt-0.5 flex-shrink-0" />
                <span
                  className="text-white/45 text-sm leading-relaxed"
                  style={{ fontFamily: "'Inter', sans-serif" }}
                >
                  Rizal Ave., Brgy. Bambang,
                  <br />
                  Nagcarlan, Laguna 4002
                </span>
              </li>
              <li className="flex items-center gap-3">
                <Phone size={14} className="text-[#D4AF6A]/60 flex-shrink-0" />
                <span
                  className="text-white/45 text-sm"
                  style={{ fontFamily: "'Inter', sans-serif" }}
                >
                  +63 915 249 1151
                </span>
              </li>
              <li className="flex items-center gap-3">
                <Mail size={14} className="text-[#D4AF6A]/60 flex-shrink-0" />
                <span
                  className="text-white/45 text-sm break-all"
                  style={{ fontFamily: "'Inter', sans-serif" }}
                >
                  museum.undergroundnagcarlan
                  <br />
                  @gmail.com
                </span>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="pt-8 border-t border-white/8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p
            className="text-white/25 text-xs"
            style={{ fontFamily: "'Inter', sans-serif" }}
          >
            © 2025 Nagcarlan Underground Cemetery Museum. All rights reserved.
          </p>
          <div className="flex items-center gap-2">
            <div className="h-px w-6 bg-[#D4AF6A]/30" />
            <p
              className="text-white/25 text-xs tracking-widest uppercase"
              style={{ fontFamily: "'Inter', sans-serif" }}
            >
              Nagcarlan, Laguna · Philippines
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}
