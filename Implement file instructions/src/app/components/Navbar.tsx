import { useState, useRef, useEffect } from "react";
import { User, ChevronDown, LogOut, Settings, Activity, UserCircle, Menu, X } from "lucide-react";

interface NavUser {
  email: string;
  name: string;
}

interface NavbarProps {
  user: NavUser | null;
  onAccountClick: () => void;
  onLogout: () => void;
}

export function Navbar({ user, onAccountClick, onLogout }: NavbarProps) {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const navLinks = [
    { label: "Exhibits", href: "#exhibits" },
    { label: "Visit", href: "#visit" },
    { label: "History", href: "#history" },
    { label: "Platform", href: "#platform" },
  ];

  const avatarInitial = user ? user.name.charAt(0).toUpperCase() : "";

  return (
    <nav className="fixed top-0 left-0 right-0 z-40" style={{ background: "rgba(28, 16, 8, 0.95)", backdropFilter: "blur(12px)", borderBottom: "1px solid rgba(184,150,62,0.15)" }}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ background: "linear-gradient(135deg, #B8963E, #C9A84C)" }}>
              <span style={{ fontSize: 16 }}>🏛️</span>
            </div>
            <div className="hidden sm:block">
              <div style={{ color: "#F5EDD6", fontWeight: 700, fontSize: 15, lineHeight: 1.2 }}>NHCP</div>
              <div style={{ color: "#B8963E", fontSize: 11, letterSpacing: "0.08em" }}>MUSEO NG LIBINGAN</div>
            </div>
          </div>

          {/* Desktop Nav Links */}
          <div className="hidden md:flex items-center gap-6">
            {navLinks.map(link => (
              <a
                key={link.label}
                href={link.href}
                className="transition-colors hover:text-amber-400 focus:outline-none focus:underline"
                style={{ color: "#C9B99A", fontSize: 14, fontWeight: 500 }}
              >
                {link.label}
              </a>
            ))}
          </div>

          {/* Right: Account / User */}
          <div className="flex items-center gap-3">
            {user ? (
              <div className="relative" ref={dropdownRef}>
                <button
                  onClick={() => setDropdownOpen(v => !v)}
                  className="flex items-center gap-2 px-3 py-2 rounded-xl transition-all hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-amber-600/40"
                  aria-expanded={dropdownOpen}
                  aria-haspopup="true"
                >
                  <div className="w-8 h-8 rounded-full flex items-center justify-center text-sm" style={{ background: "linear-gradient(135deg, #B8963E, #C9A84C)", color: "#2C1A0E", fontWeight: 700 }}>
                    {avatarInitial}
                  </div>
                  <span className="hidden sm:block" style={{ color: "#F5EDD6", fontSize: 14, fontWeight: 500 }}>Hi, {user.name.split(" ")[0]}</span>
                  <ChevronDown size={14} style={{ color: "#9E8B72", transform: dropdownOpen ? "rotate(180deg)" : "none", transition: "transform 0.2s" }} />
                </button>

                {dropdownOpen && (
                  <div className="absolute right-0 top-full mt-2 w-48 rounded-xl overflow-hidden shadow-xl" style={{ background: "#FAF6EF", border: "1px solid rgba(184,150,62,0.2)" }}>
                    <div className="px-4 py-3 border-b" style={{ borderColor: "rgba(0,0,0,0.08)" }}>
                      <p style={{ color: "#2C1A0E", fontSize: 13, fontWeight: 600 }}>{user.name}</p>
                      <p style={{ color: "#9E8B72", fontSize: 12 }}>{user.email}</p>
                    </div>
                    {[
                      { icon: <UserCircle size={15} />, label: "Profile" },
                      { icon: <Activity size={15} />, label: "My Activity" },
                      { icon: <Settings size={15} />, label: "Settings" },
                    ].map(item => (
                      <button
                        key={item.label}
                        className="w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors hover:bg-amber-50 focus:outline-none focus:bg-amber-50"
                        style={{ color: "#3D2B1F", fontSize: 14 }}
                      >
                        <span style={{ color: "#9E8B72" }}>{item.icon}</span>
                        {item.label}
                      </button>
                    ))}
                    <div className="border-t" style={{ borderColor: "rgba(0,0,0,0.08)" }}>
                      <button
                        onClick={() => { setDropdownOpen(false); onLogout(); }}
                        className="w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors hover:bg-red-50 focus:outline-none focus:bg-red-50"
                        style={{ color: "#DC2626", fontSize: 14 }}
                      >
                        <LogOut size={15} />
                        Logout
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <button
                onClick={onAccountClick}
                className="flex items-center gap-2 px-4 py-2 rounded-xl transition-all hover:opacity-90 active:scale-[0.98] focus:outline-none focus:ring-2 focus:ring-amber-400/40"
                style={{ background: "linear-gradient(135deg, #B8963E, #C9A84C)", color: "#1C1008", fontWeight: 600, fontSize: 14 }}
              >
                <User size={15} />
                Sign In
              </button>
            )}

            {/* Mobile hamburger */}
            <button
              onClick={() => setMobileOpen(v => !v)}
              className="md:hidden p-2 rounded-lg hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-amber-600/40"
              aria-label="Toggle menu"
            >
              {mobileOpen ? <X size={20} style={{ color: "#F5EDD6" }} /> : <Menu size={20} style={{ color: "#F5EDD6" }} />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="md:hidden border-t" style={{ borderColor: "rgba(184,150,62,0.15)", background: "rgba(28, 16, 8, 0.98)" }}>
          <div className="px-4 py-4 flex flex-col gap-1">
            {navLinks.map(link => (
              <a
                key={link.label}
                href={link.href}
                onClick={() => setMobileOpen(false)}
                className="px-3 py-2.5 rounded-lg transition-colors hover:bg-white/10 focus:outline-none"
                style={{ color: "#C9B99A", fontSize: 15 }}
              >
                {link.label}
              </a>
            ))}
          </div>
        </div>
      )}
    </nav>
  );
}
