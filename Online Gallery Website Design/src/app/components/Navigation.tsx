import { useState } from "react";
import { Link, useLocation } from "react-router";
import { Search, Menu, X, Globe, Accessibility } from "lucide-react";
import { useAccessibility } from "../context/AccessibilityContext";

const navItems = [
  { label: "Home", labelFil: "Tahanan", path: "/" },
  { label: "Online Gallery", labelFil: "Galería", path: "/gallery" },
  { label: "Categories", labelFil: "Kategorya", path: "/categories" },
  { label: "Accessibility", labelFil: "Aksesibilidad", path: "/accessibility" },
  { label: "Support", labelFil: "Suporta", path: "/support" },
];

export function Navigation() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const location = useLocation();
  const { settings, updateSetting } = useAccessibility();

  const isActive = (path: string) => {
    if (path === "/") return location.pathname === "/";
    return location.pathname.startsWith(path);
  };

  const toggleLanguage = () => {
    updateSetting("language", settings.language === "english" ? "filipino" : "english");
  };

  const lang = settings.language;

  return (
    <header
      className={`sticky top-0 z-50 border-b transition-colors duration-300 ${
        settings.highContrast
          ? "bg-black border-yellow-400"
          : "bg-[#FAFAF7] border-[#E8E4DF]"
      }`}
      role="banner"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link
            to="/"
            className={`flex items-center gap-3 flex-shrink-0 ${
              settings.highContrast ? "text-yellow-400" : "text-[#1C1917]"
            }`}
            aria-label="Online Gallery — Return to home"
          >
            <div
              className={`w-8 h-8 rounded-sm flex items-center justify-center flex-shrink-0 ${
                settings.highContrast ? "bg-yellow-400" : "bg-[#B8945A]"
              }`}
            >
              <span
                className={`text-sm font-semibold ${
                  settings.highContrast ? "text-black" : "text-white"
                }`}
              >
                OG
              </span>
            </div>
            <span className="font-semibold tracking-wide hidden sm:block">
              {lang === "filipino" ? "Online Galería" : "Online Gallery"}
            </span>
          </Link>

          {/* Desktop Navigation */}
          <nav
            className="hidden lg:flex items-center gap-1"
            role="navigation"
            aria-label="Main navigation"
          >
            {navItems.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                className={`px-4 py-2 rounded-md text-sm transition-colors duration-200 ${
                  isActive(item.path)
                    ? settings.highContrast
                      ? "bg-yellow-400 text-black"
                      : "bg-[#B8945A]/10 text-[#B8945A]"
                    : settings.highContrast
                    ? "text-white hover:text-yellow-400"
                    : "text-[#6B6560] hover:text-[#1C1917] hover:bg-[#F5F1EC]"
                }`}
                aria-current={isActive(item.path) ? "page" : undefined}
              >
                {lang === "filipino" ? item.labelFil : item.label}
              </Link>
            ))}
          </nav>

          {/* Right Controls */}
          <div className="flex items-center gap-2">
            {/* Search Toggle */}
            <button
              onClick={() => setSearchOpen((v) => !v)}
              className={`p-2 rounded-md transition-colors duration-200 ${
                settings.highContrast
                  ? "text-white hover:text-yellow-400"
                  : "text-[#6B6560] hover:text-[#1C1917] hover:bg-[#F5F1EC]"
              }`}
              aria-label="Toggle search"
              aria-expanded={searchOpen}
            >
              <Search size={18} />
            </button>

            {/* Language Toggle */}
            <button
              onClick={toggleLanguage}
              className={`hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm transition-colors duration-200 ${
                settings.highContrast
                  ? "border border-yellow-400 text-yellow-400 hover:bg-yellow-400 hover:text-black"
                  : "border border-[#E8E4DF] text-[#6B6560] hover:bg-[#F5F1EC] hover:text-[#1C1917]"
              }`}
              aria-label={`Switch language to ${settings.language === "english" ? "Filipino" : "English"}`}
            >
              <Globe size={14} />
              <span className="font-medium">{lang === "english" ? "EN" : "FIL"}</span>
            </button>

            {/* Accessibility Quick Link */}
            <Link
              to="/accessibility"
              className={`p-2 rounded-md transition-colors duration-200 ${
                settings.highContrast
                  ? "text-yellow-400"
                  : "text-[#B8945A] hover:bg-[#B8945A]/10"
              }`}
              aria-label="Accessibility settings"
            >
              <Accessibility size={18} />
            </Link>

            {/* Mobile Menu Toggle */}
            <button
              onClick={() => setMobileOpen((v) => !v)}
              className={`lg:hidden p-2 rounded-md transition-colors duration-200 ${
                settings.highContrast
                  ? "text-white hover:text-yellow-400"
                  : "text-[#6B6560] hover:text-[#1C1917] hover:bg-[#F5F1EC]"
              }`}
              aria-label="Toggle mobile menu"
              aria-expanded={mobileOpen}
            >
              {mobileOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
        </div>

        {/* Search Bar */}
        {searchOpen && (
          <div className="pb-3 pt-1">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                const value = (e.currentTarget.elements.namedItem("search") as HTMLInputElement).value;
                if (value.trim()) {
                  window.location.href = `/gallery?search=${encodeURIComponent(value)}`;
                }
              }}
              role="search"
            >
              <label htmlFor="nav-search" className="sr-only">
                Search artifacts
              </label>
              <input
                id="nav-search"
                name="search"
                type="search"
                placeholder={
                  lang === "filipino"
                    ? "Maghanap ng artefakto..."
                    : "Search artifacts..."
                }
                autoFocus
                className={`w-full px-4 py-2.5 rounded-lg border text-sm outline-none transition-colors duration-200 ${
                  settings.highContrast
                    ? "bg-black border-yellow-400 text-white placeholder-gray-400 focus:border-yellow-300"
                    : "bg-white border-[#E8E4DF] text-[#1C1917] placeholder-[#ABA89F] focus:border-[#B8945A]"
                }`}
              />
            </form>
          </div>
        )}
      </div>

      {/* Mobile Menu */}
      {mobileOpen && (
        <div
          className={`lg:hidden border-t ${
            settings.highContrast ? "bg-black border-yellow-400" : "bg-[#FAFAF7] border-[#E8E4DF]"
          }`}
          role="navigation"
          aria-label="Mobile navigation"
        >
          <div className="max-w-7xl mx-auto px-4 py-3 flex flex-col gap-1">
            {navItems.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => setMobileOpen(false)}
                className={`px-4 py-3 rounded-md text-sm transition-colors duration-200 ${
                  isActive(item.path)
                    ? settings.highContrast
                      ? "bg-yellow-400 text-black"
                      : "bg-[#B8945A]/10 text-[#B8945A]"
                    : settings.highContrast
                    ? "text-white hover:text-yellow-400"
                    : "text-[#6B6560] hover:text-[#1C1917] hover:bg-[#F5F1EC]"
                }`}
                aria-current={isActive(item.path) ? "page" : undefined}
              >
                {lang === "filipino" ? item.labelFil : item.label}
              </Link>
            ))}
            <div className="pt-2 mt-1 border-t border-[#E8E4DF]">
              <button
                onClick={() => {
                  toggleLanguage();
                  setMobileOpen(false);
                }}
                className={`w-full text-left px-4 py-3 rounded-md text-sm flex items-center gap-2 transition-colors ${
                  settings.highContrast
                    ? "text-yellow-400"
                    : "text-[#6B6560] hover:text-[#1C1917] hover:bg-[#F5F1EC]"
                }`}
              >
                <Globe size={16} />
                {lang === "english" ? "Switch to Filipino" : "Lumipat sa Ingles"}
              </button>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
