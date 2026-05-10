import { Toaster } from "sonner";
import { Navbar } from "./components/Navbar";
import { HeroSection } from "./components/HeroSection";
import { EParticipation } from "./components/EParticipation";
import { CommunityHighlights } from "./components/CommunityHighlights";
import { EventsCalendar } from "./components/EventsCalendar";
import { Footer } from "./components/Footer";

export default function App() {
  return (
    <div className="min-h-screen" style={{ fontFamily: "'Inter', sans-serif" }}>
      <Toaster
        position="top-right"
        toastOptions={{
          style: {
            fontFamily: "'Inter', sans-serif",
            fontSize: "0.875rem",
          },
        }}
      />
      <Navbar />
      <HeroSection />
      <EParticipation />
      <CommunityHighlights />
      <EventsCalendar />
      <Footer />
    </div>
  );
}
