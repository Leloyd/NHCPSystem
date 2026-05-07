import { Link } from "react-router";
import { useAccessibility } from "../context/AccessibilityContext";
import { Mail, Phone, MapPin, Facebook, Instagram, Twitter } from "lucide-react";

export function Footer() {
  const { settings } = useAccessibility();
  const lang = settings.language;
  const hc = settings.highContrast;

  return (
    <footer
      className={`mt-20 border-t ${
        hc ? "bg-black border-yellow-400 text-white" : "bg-[#1C1917] text-[#D4CFC9]"
      }`}
      role="contentinfo"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10">
          {/* Brand */}
          <div className="lg:col-span-1">
            <div className="flex items-center gap-3 mb-4">
              <div
                className={`w-8 h-8 rounded-sm flex items-center justify-center flex-shrink-0 ${
                  hc ? "bg-yellow-400" : "bg-[#B8945A]"
                }`}
              >
                <span className={`text-sm font-semibold ${hc ? "text-black" : "text-white"}`}>
                  OG
                </span>
              </div>
              <span
                className={`font-semibold tracking-wide ${hc ? "text-yellow-400" : "text-white"}`}
              >
                {lang === "filipino" ? "Online Galería" : "Online Gallery"}
              </span>
            </div>
            <p className="text-sm leading-relaxed mb-5">
              {lang === "filipino"
                ? "Isang digital na museo na nagtatangkilik ng kultura at kasaysayan para sa lahat."
                : "A digital museum preserving culture and history, accessible to everyone."}
            </p>
            <div className="flex items-center gap-3">
              {[Facebook, Instagram, Twitter].map((Icon, i) => (
                <a
                  key={i}
                  href="#"
                  className={`p-2 rounded-md transition-colors duration-200 ${
                    hc
                      ? "hover:text-yellow-400"
                      : "text-[#8A857E] hover:text-white hover:bg-[#2D2926]"
                  }`}
                  aria-label={["Facebook", "Instagram", "Twitter"][i]}
                >
                  <Icon size={16} />
                </a>
              ))}
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h3
              className={`text-sm font-semibold uppercase tracking-widest mb-4 ${
                hc ? "text-yellow-400" : "text-[#B8945A]"
              }`}
            >
              {lang === "filipino" ? "Mabilis na Link" : "Quick Links"}
            </h3>
            <ul className="flex flex-col gap-2.5 text-sm">
              {[
                { label: "Home", labelFil: "Tahanan", path: "/" },
                { label: "Online Gallery", labelFil: "Galería", path: "/gallery" },
                { label: "Categories", labelFil: "Kategorya", path: "/categories" },
                { label: "Accessibility", labelFil: "Aksesibilidad", path: "/accessibility" },
                { label: "Support", labelFil: "Suporta", path: "/support" },
              ].map((item) => (
                <li key={item.path}>
                  <Link
                    to={item.path}
                    className={`transition-colors duration-200 ${
                      hc ? "hover:text-yellow-400" : "hover:text-white"
                    }`}
                  >
                    {lang === "filipino" ? item.labelFil : item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Collections */}
          <div>
            <h3
              className={`text-sm font-semibold uppercase tracking-widest mb-4 ${
                hc ? "text-yellow-400" : "text-[#B8945A]"
              }`}
            >
              {lang === "filipino" ? "Mga Koleksyon" : "Collections"}
            </h3>
            <ul className="flex flex-col gap-2.5 text-sm">
              {[
                "Ceramics",
                "Tools",
                "Textiles",
                "Religious Objects",
                "Jewelry",
                "Manuscripts",
              ].map((cat) => (
                <li key={cat}>
                  <Link
                    to={`/categories?cat=${encodeURIComponent(cat)}`}
                    className={`transition-colors duration-200 ${
                      hc ? "hover:text-yellow-400" : "hover:text-white"
                    }`}
                  >
                    {cat}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h3
              className={`text-sm font-semibold uppercase tracking-widest mb-4 ${
                hc ? "text-yellow-400" : "text-[#B8945A]"
              }`}
            >
              {lang === "filipino" ? "Makipag-ugnayan" : "Contact"}
            </h3>
            <ul className="flex flex-col gap-3 text-sm">
              <li className="flex items-start gap-2.5">
                <MapPin size={15} className="flex-shrink-0 mt-0.5 opacity-60" />
                <span>123 Heritage Boulevard, Manila, Philippines 1000</span>
              </li>
              <li className="flex items-center gap-2.5">
                <Phone size={15} className="flex-shrink-0 opacity-60" />
                <a
                  href="tel:+6321234567"
                  className={`transition-colors ${hc ? "hover:text-yellow-400" : "hover:text-white"}`}
                >
                  +63 (2) 123 4567
                </a>
              </li>
              <li className="flex items-center gap-2.5">
                <Mail size={15} className="flex-shrink-0 opacity-60" />
                <a
                  href="mailto:hello@onlinegallery.ph"
                  className={`transition-colors ${hc ? "hover:text-yellow-400" : "hover:text-white"}`}
                >
                  hello@onlinegallery.ph
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div
          className={`mt-12 pt-6 border-t flex flex-col sm:flex-row items-center justify-between gap-3 text-xs ${
            hc ? "border-yellow-400/30 text-gray-400" : "border-white/10 text-[#6B6560]"
          }`}
        >
          <p>
            © 2026 Online Gallery.{" "}
            {lang === "filipino"
              ? "Lahat ng karapatan ay nakalaan."
              : "All rights reserved."}
          </p>
          <div className="flex items-center gap-4">
            <a href="#" className={`transition-colors ${hc ? "hover:text-yellow-400" : "hover:text-white"}`}>
              {lang === "filipino" ? "Patakaran sa Privacy" : "Privacy Policy"}
            </a>
            <a href="#" className={`transition-colors ${hc ? "hover:text-yellow-400" : "hover:text-white"}`}>
              {lang === "filipino" ? "Mga Tuntunin" : "Terms of Use"}
            </a>
            <a href="#" className={`transition-colors ${hc ? "hover:text-yellow-400" : "hover:text-white"}`}>
              {lang === "filipino" ? "Aksesibilidad" : "Accessibility"}
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
