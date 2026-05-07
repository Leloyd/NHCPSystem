import { Outlet, useLocation } from "react-router";
import { useEffect } from "react";
import { Navigation } from "./Navigation";
import { Footer } from "./Footer";
import { FloatingAccessibility } from "./FloatingAccessibility";
import { useAccessibility } from "../context/AccessibilityContext";

export function Layout() {
  const location = useLocation();
  const { settings } = useAccessibility();

  // Skip to main content focus on route change
  useEffect(() => {
    const main = document.getElementById("main-content");
    if (main) {
      main.focus();
    }
    window.scrollTo({ top: 0, behavior: "instant" });
  }, [location.pathname]);

  return (
    <div
      className={`min-h-screen flex flex-col ${
        settings.highContrast ? "bg-black text-white" : "bg-[#FAFAF7] text-[#1C1917]"
      }`}
    >
      {/* Skip to main content */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-[100] focus:px-4 focus:py-2 focus:rounded-lg focus:bg-[#B8945A] focus:text-white focus:text-sm focus:font-medium focus:shadow-lg"
      >
        Skip to main content
      </a>

      <Navigation />

      <div className="flex-1">
        <Outlet />
      </div>

      <Footer />
      <FloatingAccessibility />
    </div>
  );
}
