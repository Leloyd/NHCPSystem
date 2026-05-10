import { Landmark, MapPin, Phone, Mail, Facebook, Instagram, Youtube, ArrowUp, ExternalLink } from "lucide-react";

export function Footer() {
  const scrollTop = () => window.scrollTo({ top: 0, behavior: "smooth" });

  return (
    <footer id="footer" style={{ background: "#0F1E2E" }}>
      {/* CTA Banner */}
      <div
        className="border-b"
        style={{ borderColor: "rgba(255,255,255,0.08)", background: "linear-gradient(135deg, #1E3A5F 0%, #152D4A 100%)" }}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 flex flex-col md:flex-row items-center justify-between gap-6">
          <div>
            <h3
              className="text-white mb-2"
              style={{ fontFamily: "'Playfair Display', serif", fontWeight: 700, fontSize: "1.4rem" }}
            >
              Be Part of Living Heritage
            </h3>
            <p className="text-white/60 text-sm" style={{ fontFamily: "'Inter', sans-serif" }}>
              Contribute your stories, feedback, and resources to our growing community archive.
            </p>
          </div>
          <div className="flex gap-3 flex-wrap">
            <button
              onClick={() => {
                const el = document.querySelector("#e-participation");
                if (el) el.scrollIntoView({ behavior: "smooth" });
              }}
              className="px-6 py-3 rounded-xl text-white text-sm transition-all hover:opacity-90"
              style={{ background: "linear-gradient(135deg, #C5973A, #D4A843)", fontFamily: "'Inter', sans-serif", fontWeight: 500 }}
            >
              Participate Now
            </button>
            <button
              onClick={() => {
                const el = document.querySelector("#events-calendar");
                if (el) el.scrollIntoView({ behavior: "smooth" });
              }}
              className="px-6 py-3 rounded-xl border border-white/20 text-white text-sm hover:bg-white/10 transition-all"
              style={{ fontFamily: "'Inter', sans-serif", fontWeight: 500 }}
            >
              View Events
            </button>
          </div>
        </div>
      </div>

      {/* Main Footer */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-10">
          {/* Brand */}
          <div className="lg:col-span-1">
            <div className="flex items-center gap-2.5 mb-5">
              <div
                className="w-9 h-9 rounded-lg flex items-center justify-center"
                style={{ background: "linear-gradient(135deg, #1E3A5F, #2A5A8A)" }}
              >
                <Landmark size={17} className="text-white" />
              </div>
              <div>
                <p className="text-white text-sm" style={{ fontFamily: "'Playfair Display', serif", fontWeight: 600 }}>
                  Heritage Museum
                </p>
                <p className="text-[#C5973A] text-[10px] uppercase tracking-widest" style={{ fontFamily: "'Inter', sans-serif" }}>
                  Community Portal
                </p>
              </div>
            </div>
            <p className="text-white/50 text-sm leading-relaxed mb-6" style={{ fontFamily: "'Inter', sans-serif" }}>
              Preserving history, engaging communities, and building shared cultural understanding through education and participation.
            </p>
            {/* Social */}
            <div className="flex gap-3">
              {[
                { icon: <Facebook size={16} />, label: "Facebook" },
                { icon: <Instagram size={16} />, label: "Instagram" },
                { icon: <Youtube size={16} />, label: "YouTube" },
              ].map((social) => (
                <button
                  key={social.label}
                  aria-label={social.label}
                  className="w-9 h-9 rounded-lg flex items-center justify-center text-white/50 hover:text-white transition-colors"
                  style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)" }}
                >
                  {social.icon}
                </button>
              ))}
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h4
              className="text-white mb-5 text-sm uppercase tracking-widest"
              style={{ fontFamily: "'Inter', sans-serif", fontWeight: 600 }}
            >
              Participate
            </h4>
            <ul className="space-y-3">
              {["Visitor Feedback", "Teacher Corner", "Submit a Story", "Community Highlights", "Events Calendar"].map((link) => (
                <li key={link}>
                  <button
                    className="text-white/50 text-sm hover:text-[#C5973A] transition-colors text-left"
                    style={{ fontFamily: "'Inter', sans-serif" }}
                    onClick={() => {
                      const el = document.querySelector("#e-participation");
                      if (el) el.scrollIntoView({ behavior: "smooth" });
                    }}
                  >
                    {link}
                  </button>
                </li>
              ))}
            </ul>
          </div>

          {/* Museum Info */}
          <div>
            <h4
              className="text-white mb-5 text-sm uppercase tracking-widest"
              style={{ fontFamily: "'Inter', sans-serif", fontWeight: 600 }}
            >
              Museum
            </h4>
            <ul className="space-y-3">
              {["About the Museum", "Collection & Exhibits", "Research & Archive", "Educational Programs", "Volunteer"].map((link) => (
                <li key={link}>
                  <a
                    href="#"
                    className="text-white/50 text-sm hover:text-[#C5973A] transition-colors flex items-center gap-1 group"
                    style={{ fontFamily: "'Inter', sans-serif" }}
                  >
                    {link}
                    <ExternalLink size={10} className="opacity-0 group-hover:opacity-100 transition-opacity" />
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h4
              className="text-white mb-5 text-sm uppercase tracking-widest"
              style={{ fontFamily: "'Inter', sans-serif", fontWeight: 600 }}
            >
              Contact Us
            </h4>
            <ul className="space-y-4">
              <li className="flex items-start gap-3">
                <MapPin size={15} className="text-[#C5973A] mt-0.5 flex-shrink-0" />
                <span className="text-white/50 text-sm leading-relaxed" style={{ fontFamily: "'Inter', sans-serif" }}>
                  123 Heritage Avenue, Cultural District, Metro City 10001
                </span>
              </li>
              <li className="flex items-center gap-3">
                <Phone size={15} className="text-[#C5973A] flex-shrink-0" />
                <span className="text-white/50 text-sm" style={{ fontFamily: "'Inter', sans-serif" }}>
                  +1 (555) 234-5678
                </span>
              </li>
              <li className="flex items-center gap-3">
                <Mail size={15} className="text-[#C5973A] flex-shrink-0" />
                <span className="text-white/50 text-sm" style={{ fontFamily: "'Inter', sans-serif" }}>
                  community@heritagemuseum.org
                </span>
              </li>
            </ul>

            {/* Hours */}
            <div className="mt-5 p-3 rounded-xl" style={{ background: "rgba(197, 151, 58, 0.08)", border: "1px solid rgba(197, 151, 58, 0.15)" }}>
              <p className="text-[#C5973A] text-[10px] uppercase tracking-wider mb-1.5" style={{ fontFamily: "'Inter', sans-serif", fontWeight: 600 }}>
                Museum Hours
              </p>
              <p className="text-white/60 text-xs" style={{ fontFamily: "'Inter', sans-serif" }}>
                Mon–Fri: 8:00 AM – 5:00 PM<br />
                Sat: 9:00 AM – 4:00 PM<br />
                Sun &amp; Holidays: Closed
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Bar */}
      <div
        className="border-t"
        style={{ borderColor: "rgba(255,255,255,0.06)" }}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-white/30 text-xs" style={{ fontFamily: "'Inter', sans-serif" }}>
            © 2026 Heritage Museum Community Portal. All rights reserved.
          </p>
          <div className="flex items-center gap-5">
            {["Privacy Policy", "Terms of Use", "Accessibility"].map((link) => (
              <a
                key={link}
                href="#"
                className="text-white/30 text-xs hover:text-white/60 transition-colors"
                style={{ fontFamily: "'Inter', sans-serif" }}
              >
                {link}
              </a>
            ))}
          </div>
        </div>
      </div>

      {/* Scroll to Top */}
      <button
        onClick={scrollTop}
        className="fixed bottom-6 right-6 w-10 h-10 rounded-xl flex items-center justify-center text-white shadow-lg transition-all hover:scale-110 active:scale-95 z-40"
        style={{ background: "linear-gradient(135deg, #1E3A5F, #2A5A8A)" }}
        aria-label="Back to top"
      >
        <ArrowUp size={17} />
      </button>
    </footer>
  );
}
