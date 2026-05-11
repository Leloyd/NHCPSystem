import "../styles/fonts.css";
import { Navbar } from "./components/Navbar";
import { HeroSection } from "./components/HeroSection";
import { TestamentSection } from "./components/TestamentSection";
import { VisitorInfo } from "./components/VisitorInfo";
import { AboutSite } from "./components/AboutSite";
import { HistoryTimeline } from "./components/HistoryTimeline";
import { HouseRules } from "./components/HouseRules";
import { Footer } from "./components/Footer";

export default function App() {
  return (
    <div className="min-h-screen overflow-x-hidden">
      <Navbar />
      <HeroSection />
      <TestamentSection />
      <AboutSite />
      <HistoryTimeline />
      <VisitorInfo />
      <HouseRules />
      <Footer />
    </div>
  );
}
