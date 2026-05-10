import { useState, useEffect } from "react";
import { Menu, X, Landmark } from "lucide-react";

const navLinks = [
  { label: "E-Participation", href: "#e-participation" },
  { label: "Highlights", href: "#community-highlights" },
  { label: "Events", href: "#events-calendar" },
  { label: "Contact", href: "#footer" },
];

export function Navbar() {
  const [isOpen, setIsOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const handleNavClick = (href: string) => {
    setIsOpen(false);
    const el = document.querySelector(href);
    if (el) el.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <nav
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled
          ? "bg-white/95 backdrop-blur-md shadow-sm border-b border-[#E8E0D5]"
          : "bg-transparent"
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 md:h-20">
          {/* Logo */}
          <button
            onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
            className="flex items-center gap-2.5 group"
          >
            <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ background: "linear-gradient(135deg, #1E3A5F 0%, #2A5A8A 100%)" }}>
              <Landmark size={18} className="text-white" />
            </div>
            <div className="flex flex-col items-start">
              <span
                className={`text-sm leading-tight transition-colors duration-300 ${scrolled ? "text-[#1E3A5F]" : "text-white"}`}
                style={{ fontFamily: "'Playfair Display', serif", fontWeight: 600 }}
              >
                Heritage Museum
              </span>
              <span
                className={`text-[10px] uppercase tracking-widest leading-tight transition-colors duration-300 ${scrolled ? "text-[#C5973A]" : "text-[#C5973A]"}`}
                style={{ fontFamily: "'Inter', sans-serif", fontWeight: 500 }}
              >
                Community Portal
              </span>
            </div>
          </button>

          {/* Desktop Nav */}
          <div className="hidden md:flex items-center gap-1">
            {navLinks.map((link) => (
              <button
                key={link.label}
                onClick={() => handleNavClick(link.href)}
                className={`px-4 py-2 rounded-lg text-sm transition-all duration-200 hover:bg-white/10 ${
                  scrolled
                    ? "text-[#374151] hover:text-[#1E3A5F] hover:bg-[#F5ECD7]"
                    : "text-white/90 hover:text-white hover:bg-white/10"
                }`}
                style={{ fontFamily: "'Inter', sans-serif", fontWeight: 500 }}
              >
                {link.label}
              </button>
            ))}
            <button
              onClick={() => handleNavClick("#e-participation")}
              className="ml-2 px-5 py-2 rounded-lg text-sm text-white transition-all duration-200 hover:opacity-90 active:scale-95"
              style={{
                background: "linear-gradient(135deg, #C5973A 0%, #E0B050 100%)",
                fontFamily: "'Inter', sans-serif",
                fontWeight: 500,
              }}
            >
              Participate Now
            </button>
          </div>

          {/* Mobile Toggle */}
          <button
            onClick={() => setIsOpen(!isOpen)}
            className={`md:hidden p-2 rounded-lg transition-colors ${
              scrolled ? "text-[#1E3A5F] hover:bg-[#F5ECD7]" : "text-white hover:bg-white/10"
            }`}
          >
            {isOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      <div
        className={`md:hidden transition-all duration-300 overflow-hidden ${
          isOpen ? "max-h-80 opacity-100" : "max-h-0 opacity-0"
        }`}
      >
        <div className="bg-white/98 backdrop-blur-md border-t border-[#E8E0D5] px-4 py-4 space-y-1">
          {navLinks.map((link) => (
            <button
              key={link.label}
              onClick={() => handleNavClick(link.href)}
              className="w-full text-left px-4 py-2.5 rounded-lg text-[#374151] hover:text-[#1E3A5F] hover:bg-[#F5ECD7] transition-colors text-sm"
              style={{ fontFamily: "'Inter', sans-serif", fontWeight: 500 }}
            >
              {link.label}
            </button>
          ))}
          <button
            onClick={() => handleNavClick("#e-participation")}
            className="w-full mt-2 px-4 py-2.5 rounded-lg text-sm text-white transition-all duration-200"
            style={{
              background: "linear-gradient(135deg, #C5973A 0%, #E0B050 100%)",
              fontFamily: "'Inter', sans-serif",
              fontWeight: 500,
            }}
          >
            Participate Now
          </button>
        </div>
      </div>
    </nav>
  );
}
