import { useState } from "react";
import { Loader2, Check } from "lucide-react";

interface OnboardingPageProps {
  email: string;
  onComplete: (name: string) => void;
}

const USE_CASES = [
  "Explore museum information",
  "Learn for school or research",
  "Prepare for a visit",
  "Access virtual tours and exhibits",
  "Share feedback or stories",
  "Use teaching or learning materials",
];

const ROLES = [
  "Visitor", "Student", "Teacher", "Researcher", "Historian",
  "Person with Disability", "Senior Citizen", "Museum Staff",
  "Local Resident", "Tourist", "Other",
];

export function OnboardingPage({ email, onComplete }: OnboardingPageProps) {
  const [name, setName] = useState("");
  const [selectedUseCase, setSelectedUseCase] = useState<string | null>(null);
  const [selectedRoles, setSelectedRoles] = useState<string[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const toggleRole = (role: string) => {
    setSelectedRoles(prev =>
      prev.includes(role) ? prev.filter(r => r !== role) : [...prev, role]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!name.trim()) { setError("Please enter your full name."); return; }
    if (!selectedUseCase) { setError("Please select how you plan to use the website."); return; }
    if (selectedRoles.length === 0) { setError("Please select at least one role."); return; }
    setLoading(true);
    await new Promise(r => setTimeout(r, 1500));
    setLoading(false);
    onComplete(name.trim());
  };

  return (
    <div className="min-h-screen flex" style={{ background: "#FAF6EF" }}>
      {/* Left decorative panel */}
      <div className="hidden lg:flex flex-col justify-between p-10 w-80 flex-shrink-0" style={{ background: "linear-gradient(160deg, #2C1A0E 0%, #1C1008 100%)" }}>
        <div>
          <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-8" style={{ background: "linear-gradient(135deg, #B8963E, #C9A84C)" }}>
            <span style={{ fontSize: 18 }}>🏛️</span>
          </div>
          <h2 style={{ color: "#F5EDD6", lineHeight: 1.4 }}>Welcome to the Museo ng Libingan</h2>
          <p className="mt-3" style={{ color: "#9E8B72", fontSize: 14, lineHeight: 1.7 }}>
            Your profile helps us personalize your digital heritage experience and connect you with the right resources.
          </p>
        </div>
        <div className="space-y-4">
          {[
            { icon: "🎭", label: "Personalized exhibits" },
            { icon: "🗺️", label: "Tailored virtual tours" },
            { icon: "📚", label: "Curated resources" },
          ].map(item => (
            <div key={item.label} className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: "rgba(184,150,62,0.15)" }}>
                <span style={{ fontSize: 16 }}>{item.icon}</span>
              </div>
              <span style={{ color: "#C9B99A", fontSize: 14 }}>{item.label}</span>
            </div>
          ))}
        </div>
        <p style={{ color: "#4A3828", fontSize: 12 }}>© 2026 NHCP · Museo ng Libingan</p>
      </div>

      {/* Main form */}
      <div className="flex-1 flex flex-col items-center justify-center px-4 py-16 overflow-y-auto">
        <div className="w-full max-w-xl">
          {/* Progress */}
          <div className="flex items-center gap-2 mb-8">
            <div className="w-8 h-0.5" style={{ background: "#B8963E" }} />
            <span style={{ color: "#B8963E", fontSize: 12, letterSpacing: "0.12em" }}>SETUP YOUR PROFILE</span>
          </div>

          <h1 style={{ color: "#2C1A0E", fontSize: "clamp(1.6rem, 4vw, 2.25rem)", fontWeight: 700, lineHeight: 1.2 }}>
            Complete Your Profile
          </h1>
          <p className="mt-2 mb-8" style={{ color: "#7D6B54" }}>
            Help us personalize your digital heritage experience.
          </p>

          <div className="mb-6 px-4 py-3 rounded-xl flex items-center gap-2" style={{ background: "rgba(184,150,62,0.08)", border: "1px solid rgba(184,150,62,0.2)" }}>
            <span style={{ fontSize: 16 }}>✉️</span>
            <p style={{ color: "#7D6B54", fontSize: 13 }}>
              Signed up as <strong style={{ color: "#3D2B1F" }}>{email}</strong>
            </p>
          </div>

          <form onSubmit={handleSubmit} noValidate className="space-y-8">
            {/* Name */}
            <div>
              <label htmlFor="onboard-name" className="block mb-2" style={{ color: "#3D2B1F", fontWeight: 600 }}>
                Full Name <span style={{ color: "#DC2626" }}>*</span>
              </label>
              <input
                id="onboard-name"
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="Enter your full name"
                className="w-full px-4 py-3 rounded-xl outline-none transition-all focus:ring-2 focus:ring-amber-600/30"
                style={{ background: "#F0E6CC", border: "1px solid rgba(184,150,62,0.2)", color: "#2C1A0E", fontSize: 15 }}
              />
            </div>

            {/* Use case */}
            <div>
              <p className="mb-3" style={{ color: "#3D2B1F", fontWeight: 600 }}>
                How do you plan to use the website? <span style={{ color: "#DC2626" }}>*</span>
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {USE_CASES.map(uc => (
                  <button
                    key={uc}
                    type="button"
                    onClick={() => setSelectedUseCase(uc)}
                    className="flex items-center gap-2.5 px-4 py-3 rounded-xl text-left transition-all focus:outline-none focus:ring-2 focus:ring-amber-600/30"
                    style={{
                      background: selectedUseCase === uc ? "rgba(184,150,62,0.15)" : "#F0E6CC",
                      border: `1.5px solid ${selectedUseCase === uc ? "#B8963E" : "rgba(184,150,62,0.15)"}`,
                      color: selectedUseCase === uc ? "#2C1A0E" : "#7D6B54",
                      fontSize: 14,
                    }}
                  >
                    <div
                      className="w-4 h-4 rounded-full flex-shrink-0 flex items-center justify-center"
                      style={{
                        border: `2px solid ${selectedUseCase === uc ? "#B8963E" : "#C9B99A"}`,
                        background: selectedUseCase === uc ? "#B8963E" : "transparent",
                      }}
                    >
                      {selectedUseCase === uc && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                    </div>
                    {uc}
                  </button>
                ))}
              </div>
            </div>

            {/* Roles */}
            <div>
              <p className="mb-3" style={{ color: "#3D2B1F", fontWeight: 600 }}>
                Which roles best describe you? <span style={{ color: "#DC2626" }}>*</span>
              </p>
              <p style={{ color: "#9E8B72", fontSize: 13, marginBottom: 12 }}>Select all that apply.</p>
              <div className="flex flex-wrap gap-2">
                {ROLES.map(role => {
                  const selected = selectedRoles.includes(role);
                  return (
                    <button
                      key={role}
                      type="button"
                      onClick={() => toggleRole(role)}
                      className="flex items-center gap-1.5 px-4 py-2 rounded-full transition-all focus:outline-none focus:ring-2 focus:ring-amber-600/30"
                      style={{
                        background: selected ? "linear-gradient(135deg, #2C1A0E, #3D2B1F)" : "#F0E6CC",
                        border: `1.5px solid ${selected ? "transparent" : "rgba(184,150,62,0.2)"}`,
                        color: selected ? "#F5EDD6" : "#7D6B54",
                        fontSize: 14,
                        fontWeight: selected ? 500 : 400,
                      }}
                    >
                      {selected && <Check size={13} />}
                      {role}
                    </button>
                  );
                })}
              </div>
            </div>

            {error && (
              <div className="px-4 py-3 rounded-xl" style={{ background: "#FEE2E2", border: "1px solid #FECACA" }}>
                <span style={{ color: "#DC2626", fontSize: 14 }}>⚠ {error}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 py-4 px-6 rounded-xl transition-all hover:opacity-90 active:scale-[0.98] focus:outline-none focus:ring-2 focus:ring-amber-600/40 disabled:opacity-60"
              style={{ background: "linear-gradient(135deg, #B8963E, #C9A84C)", color: "#1C1008", fontWeight: 700, fontSize: 16 }}
            >
              {loading ? <><Loader2 size={18} className="animate-spin" /> Setting up your profile...</> : "Finish Setup"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
