import { useState } from "react";
import { Navbar } from "./components/Navbar";
import { AuthModal } from "./components/AuthModal";
import { LandingPage } from "./components/LandingPage";
import { OnboardingPage } from "./components/OnboardingPage";

type AppView = "landing" | "onboarding";

interface AuthUser {
  email: string;
  name: string;
}

export default function App() {
  const [view, setView] = useState<AppView>("landing");
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [pendingEmail, setPendingEmail] = useState("");

  const handleAuthenticated = (u: AuthUser) => {
    setUser(u);
    setPendingEmail(u.email);
    // Simulate post-signup onboarding (in real app, check if new user)
    setView("onboarding");
  };

  const handleOnboardingComplete = (name: string) => {
    if (user) {
      setUser({ ...user, name });
    }
    setView("landing");
  };

  const handleLogout = () => {
    setUser(null);
    setView("landing");
  };

  if (view === "onboarding") {
    return (
      <OnboardingPage
        email={pendingEmail}
        onComplete={handleOnboardingComplete}
      />
    );
  }

  return (
    <>
      <Navbar
        user={user}
        onAccountClick={() => setAuthModalOpen(true)}
        onLogout={handleLogout}
      />
      <LandingPage
        onOpenAuth={() => setAuthModalOpen(true)}
        isLoggedIn={!!user}
      />
      <AuthModal
        open={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
        onAuthenticated={handleAuthenticated}
      />
    </>
  );
}
