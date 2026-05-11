import { useState, useEffect } from "react";
import { Menu, X } from "lucide-react";

export function Navbar() {
  const [isOpen, setIsOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const links = [
    { label: "History", href: "#history" },
    { label: "About", href: "#about" },
    { label: "Visit", href: "#visit" },
    { label: "Rules", href: "#rules" },
  ];

  const scrollTo = (href: string) => {
    setIsOpen(false);
    const el = document.querySelector(href);
    if (el) el.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${
        scrolled
          ? "bg-[#1C1208]/95 backdrop-blur-md shadow-lg"
          : "bg-transparent"
      }`}
    >
      <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
        <div className="flex flex-col leading-tight">
          <span
            style={{ fontFamily: "'Playfair Display', serif" }}
            className="text-[#D4AF6A] text-sm tracking-widest uppercase"
          >
            Museo ng Libingan
          </span>
          <span
            style={{ fontFamily: "'Inter', sans-serif" }}
            className="text-white/60 text-xs tracking-wider"
          >
            Nagcarlan Underground Cemetery
          </span>
        </div>

        {/* Desktop Nav */}
        <nav className="hidden md:flex items-center gap-8">
          {links.map((link) => (
            <button
              key={link.href}
              onClick={() => scrollTo(link.href)}
              className="text-white/70 hover:text-[#D4AF6A] transition-colors duration-200 text-sm tracking-wider uppercase cursor-pointer"
              style={{ fontFamily: "'Inter', sans-serif" }}
            >
              {link.label}
            </button>
          ))}
          <button
            onClick={() => scrollTo("#visit")}
            className="px-5 py-2 border border-[#D4AF6A] text-[#D4AF6A] hover:bg-[#D4AF6A] hover:text-[#1C1208] transition-all duration-300 text-sm tracking-wider uppercase cursor-pointer"
            style={{ fontFamily: "'Inter', sans-serif" }}
          >
            Plan Visit
          </button>
        </nav>

        {/* Mobile toggle */}
        <button
          className="md:hidden text-white p-2 cursor-pointer"
          onClick={() => setIsOpen(!isOpen)}
        >
          {isOpen ? <X size={22} /> : <Menu size={22} />}
        </button>
      </div>

      {/* Mobile menu */}
      {isOpen && (
        <div className="md:hidden bg-[#1C1208]/98 backdrop-blur-md px-6 pb-6">
          <div className="flex flex-col gap-4">
            {links.map((link) => (
              <button
                key={link.href}
                onClick={() => scrollTo(link.href)}
                className="text-white/70 hover:text-[#D4AF6A] transition-colors text-sm tracking-wider uppercase text-left py-2 border-b border-white/10 cursor-pointer"
                style={{ fontFamily: "'Inter', sans-serif" }}
              >
                {link.label}
              </button>
            ))}
            <button
              onClick={() => scrollTo("#visit")}
              className="mt-2 px-5 py-3 border border-[#D4AF6A] text-[#D4AF6A] hover:bg-[#D4AF6A] hover:text-[#1C1208] transition-all duration-300 text-sm tracking-wider uppercase cursor-pointer"
              style={{ fontFamily: "'Inter', sans-serif" }}
            >
              Plan Your Visit
            </button>
          </div>
        </div>
      )}
    </header>
  );
}
