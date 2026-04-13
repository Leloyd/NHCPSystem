import { useState } from "react";
import { useNavigate } from "react-router";
import { Eye, EyeOff, Lock, User } from "lucide-react";

export function Login() {
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);
  const [form, setForm] = useState({ username: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setTimeout(() => {
      if (form.username === "admin" && form.password === "nchp2024") {
        navigate("/");
      } else {
        setError("Invalid username or password.");
        setLoading(false);
      }
    }, 900);
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center relative"
      style={{
        background: "linear-gradient(135deg, #0D2B1F 0%, #1B4332 40%, #2D6A4F 100%)",
        fontFamily: "'Inter', sans-serif",
      }}
    >
      {/* Decorative background pattern */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div
          className="absolute inset-0 opacity-5"
          style={{
            backgroundImage: `radial-gradient(circle at 20% 50%, #C9A84C 0%, transparent 50%), radial-gradient(circle at 80% 20%, #C9A84C 0%, transparent 40%)`,
          }}
        />
        <div
          className="absolute top-0 left-0 right-0 h-1"
          style={{ background: "linear-gradient(90deg, transparent, #C9A84C, transparent)" }}
        />
      </div>

      <div className="w-full max-w-md mx-4 relative z-10">
        {/* Logo Block */}
        <div className="text-center mb-8">
          <div
            className="inline-flex items-center justify-center w-20 h-20 rounded-2xl mb-4 shadow-2xl"
            style={{ background: "linear-gradient(135deg, #C9A84C, #A07830)" }}
          >
            <svg width="40" height="40" viewBox="0 0 40 40" fill="none">
              <path d="M20 4L36 14V26L20 36L4 26V14L20 4Z" fill="white" fillOpacity="0.2" stroke="white" strokeWidth="1.5"/>
              <path d="M20 10L30 16V24L20 30L10 24V16L20 10Z" fill="white" fillOpacity="0.15" stroke="white" strokeWidth="1"/>
              <circle cx="20" cy="20" r="4" fill="white"/>
            </svg>
          </div>
          <h1
            className="text-white mb-1"
            style={{ fontFamily: "'Playfair Display', serif", fontSize: "1.6rem", fontWeight: 700 }}
          >
            NCHP Admin Portal
          </h1>
          <p style={{ color: "#A8C5B5", fontSize: "0.85rem" }}>
            Museo ng Libingan sa Ilalim ng Lupa ng Nagcarlan
          </p>
        </div>

        {/* Login Card */}
        <div
          className="rounded-2xl shadow-2xl overflow-hidden"
          style={{ background: "rgba(255,255,255,0.97)", backdropFilter: "blur(20px)" }}
        >
          <div className="h-1 w-full" style={{ background: "linear-gradient(90deg, #C9A84C, #A07830, #C9A84C)" }} />
          <div className="p-8">
            <h2 className="mb-1" style={{ color: "#0D2B1F", fontSize: "1.25rem", fontWeight: 700 }}>
              Sign In
            </h2>
            <p style={{ color: "#6B7280", fontSize: "0.85rem", marginBottom: "1.5rem" }}>
              Enter your credentials to access the dashboard
            </p>

            {error && (
              <div
                className="rounded-lg px-4 py-3 mb-4 flex items-center gap-2"
                style={{ background: "#FEF2F2", border: "1px solid #FECACA", color: "#DC2626", fontSize: "0.85rem" }}
              >
                <span>⚠</span> {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label style={{ color: "#374151", fontSize: "0.85rem", fontWeight: 600, display: "block", marginBottom: 6 }}>
                  Username
                </label>
                <div className="relative">
                  <User size={16} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: "#9CA3AF" }} />
                  <input
                    type="text"
                    placeholder="Enter username"
                    value={form.username}
                    onChange={(e) => setForm({ ...form, username: e.target.value })}
                    className="w-full pl-10 pr-4 py-3 rounded-xl outline-none transition-all"
                    style={{
                      background: "#F9FAFB",
                      border: "1.5px solid #E5E7EB",
                      color: "#111827",
                      fontSize: "0.9rem",
                    }}
                    onFocus={(e) => (e.target.style.borderColor = "#C9A84C")}
                    onBlur={(e) => (e.target.style.borderColor = "#E5E7EB")}
                    required
                  />
                </div>
              </div>

              <div>
                <label style={{ color: "#374151", fontSize: "0.85rem", fontWeight: 600, display: "block", marginBottom: 6 }}>
                  Password
                </label>
                <div className="relative">
                  <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: "#9CA3AF" }} />
                  <input
                    type={showPassword ? "text" : "password"}
                    placeholder="Enter password"
                    value={form.password}
                    onChange={(e) => setForm({ ...form, password: e.target.value })}
                    className="w-full pl-10 pr-12 py-3 rounded-xl outline-none transition-all"
                    style={{
                      background: "#F9FAFB",
                      border: "1.5px solid #E5E7EB",
                      color: "#111827",
                      fontSize: "0.9rem",
                    }}
                    onFocus={(e) => (e.target.style.borderColor = "#C9A84C")}
                    onBlur={(e) => (e.target.style.borderColor = "#E5E7EB")}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-1"
                    style={{ color: "#9CA3AF" }}
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between" style={{ fontSize: "0.82rem" }}>
                <label className="flex items-center gap-2 cursor-pointer" style={{ color: "#6B7280" }}>
                  <input type="checkbox" className="rounded" /> Remember me
                </label>
                <button type="button" style={{ color: "#C9A84C", fontWeight: 600 }}>
                  Forgot password?
                </button>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 rounded-xl text-white transition-all duration-200 mt-2"
                style={{
                  background: loading
                    ? "#9CA3AF"
                    : "linear-gradient(135deg, #1B4332, #0D2B1F)",
                  fontSize: "0.9rem",
                  fontWeight: 600,
                  cursor: loading ? "not-allowed" : "pointer",
                  boxShadow: "0 4px 15px rgba(13,43,31,0.35)",
                }}
              >
                {loading ? "Authenticating…" : "Sign In to Dashboard"}
              </button>
            </form>

            <p className="text-center mt-6" style={{ color: "#9CA3AF", fontSize: "0.78rem" }}>
              Demo credentials: admin / nchp2024
            </p>
          </div>
        </div>

        <p className="text-center mt-6" style={{ color: "rgba(255,255,255,0.4)", fontSize: "0.75rem" }}>
          © 2024 National Commission for Culture and the Arts Heritage Program
        </p>
      </div>
    </div>
  );
}
