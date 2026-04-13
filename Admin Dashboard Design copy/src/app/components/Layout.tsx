import { useState } from "react";
import { Outlet, NavLink, useNavigate, useLocation } from "react-router";
import {
  LayoutDashboard,
  FileText,
  Image,
  Settings,
  LogOut,
  Menu,
  X,
  Bell,
  Search,
  ChevronDown,
  Globe,
} from "lucide-react";

const NAV_ITEMS = [
  { to: "/", icon: LayoutDashboard, label: "Dashboard", exact: true },
  { to: "/posts", icon: FileText, label: "Posts & Content" },
  { to: "/media", icon: Image, label: "Media Library" },
  { to: "/settings", icon: Settings, label: "Settings" },
];

export function Layout() {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  const getPageTitle = () => {
    const path = location.pathname;
    if (path === "/") return "Dashboard";
    if (path.startsWith("/posts/new")) return "Create New Post";
    if (path.startsWith("/posts/edit")) return "Edit Post";
    if (path.startsWith("/posts")) return "Posts & Content";
    if (path.startsWith("/media")) return "Media Library";
    if (path.startsWith("/settings")) return "Settings";
    return "Admin";
  };

  const handleLogout = () => {
    navigate("/login");
  };

  return (
    <div
      className="min-h-screen flex"
      style={{ background: "#F2EEE6", fontFamily: "'Inter', sans-serif" }}
    >
      {/* Mobile Overlay */}
      {mobileSidebarOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/50 lg:hidden"
          onClick={() => setMobileSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`
          fixed lg:static inset-y-0 left-0 z-40 flex flex-col
          transition-all duration-300 ease-in-out
          ${mobileSidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}
          ${sidebarOpen ? "w-64" : "w-[72px]"}
        `}
        style={{
          background: "linear-gradient(180deg, #0A1F15 0%, #0D2B1F 50%, #0F3024 100%)",
          borderRight: "1px solid rgba(201,168,76,0.1)",
          boxShadow: "4px 0 24px rgba(0,0,0,0.3)",
        }}
      >
        {/* Logo */}
        <div
          className="flex items-center gap-3 px-4 py-5 shrink-0"
          style={{ borderBottom: "1px solid rgba(201,168,76,0.15)" }}
        >
          <div
            className="flex items-center justify-center rounded-xl shrink-0"
            style={{
              width: 40,
              height: 40,
              background: "linear-gradient(135deg, #C9A84C, #A07830)",
              boxShadow: "0 4px 12px rgba(201,168,76,0.3)",
            }}
          >
            <svg width="22" height="22" viewBox="0 0 40 40" fill="none">
              <path d="M20 4L36 14V26L20 36L4 26V14L20 4Z" fill="white" fillOpacity="0.25" stroke="white" strokeWidth="1.5"/>
              <path d="M20 10L30 16V24L20 30L10 24V16L20 10Z" fill="white" fillOpacity="0.2" stroke="white" strokeWidth="1"/>
              <circle cx="20" cy="20" r="4" fill="white"/>
            </svg>
          </div>
          {sidebarOpen && (
            <div className="overflow-hidden">
              <div
                style={{
                  color: "#C9A84C",
                  fontSize: "0.7rem",
                  fontWeight: 700,
                  letterSpacing: "0.12em",
                  textTransform: "uppercase",
                  lineHeight: 1.2,
                }}
              >
                NCHP Admin
              </div>
              <div style={{ color: "rgba(255,255,255,0.5)", fontSize: "0.62rem", lineHeight: 1.3 }}>
                Museo ng Libingan
              </div>
            </div>
          )}
          {/* Desktop collapse toggle */}
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="ml-auto hidden lg:flex items-center justify-center rounded-lg p-1.5 transition-colors hover:bg-white/10"
            style={{ color: "rgba(255,255,255,0.4)" }}
          >
            <Menu size={14} />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto py-4 px-2">
          {sidebarOpen && (
            <p
              className="px-3 mb-2"
              style={{ color: "rgba(255,255,255,0.3)", fontSize: "0.65rem", fontWeight: 700, letterSpacing: "0.15em", textTransform: "uppercase" }}
            >
              Main Menu
            </p>
          )}
          <ul className="space-y-1">
            {NAV_ITEMS.map(({ to, icon: Icon, label, exact }) => (
              <li key={to}>
                <NavLink
                  to={to}
                  end={exact}
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 group relative overflow-hidden ${
                      isActive ? "active-nav" : "hover:bg-white/8"
                    }`
                  }
                  style={({ isActive }) =>
                    isActive
                      ? {
                          background: "linear-gradient(135deg, rgba(201,168,76,0.2), rgba(201,168,76,0.08))",
                          border: "1px solid rgba(201,168,76,0.25)",
                        }
                      : {}
                  }
                  title={!sidebarOpen ? label : undefined}
                >
                  {({ isActive }) => (
                    <>
                      {isActive && (
                        <div
                          className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-6 rounded-full"
                          style={{ background: "#C9A84C" }}
                        />
                      )}
                      <Icon
                        size={18}
                        style={{ color: isActive ? "#C9A84C" : "rgba(255,255,255,0.5)", flexShrink: 0 }}
                        className="group-hover:text-white transition-colors"
                      />
                      {sidebarOpen && (
                        <span
                          style={{
                            color: isActive ? "#C9A84C" : "rgba(255,255,255,0.65)",
                            fontSize: "0.875rem",
                            fontWeight: isActive ? 600 : 400,
                          }}
                          className="group-hover:text-white transition-colors truncate"
                        >
                          {label}
                        </span>
                      )}
                    </>
                  )}
                </NavLink>
              </li>
            ))}
          </ul>

          {sidebarOpen && (
            <div className="mt-6">
              <p
                className="px-3 mb-2"
                style={{ color: "rgba(255,255,255,0.3)", fontSize: "0.65rem", fontWeight: 700, letterSpacing: "0.15em", textTransform: "uppercase" }}
              >
                External
              </p>
              <a
                href="#"
                className="flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 hover:bg-white/8"
              >
                <Globe size={18} style={{ color: "rgba(255,255,255,0.5)", flexShrink: 0 }} />
                <span style={{ color: "rgba(255,255,255,0.65)", fontSize: "0.875rem" }}>View Website</span>
              </a>
            </div>
          )}
        </nav>

        {/* User Section */}
        <div
          className="px-2 py-3 shrink-0"
          style={{ borderTop: "1px solid rgba(201,168,76,0.15)" }}
        >
          <div
            className="flex items-center gap-3 px-3 py-2.5 rounded-xl cursor-pointer hover:bg-white/8 transition-colors"
          >
            <div
              className="rounded-xl flex items-center justify-center shrink-0 text-white"
              style={{
                width: 34,
                height: 34,
                background: "linear-gradient(135deg, #1B4332, #2D6A4F)",
                border: "1.5px solid rgba(201,168,76,0.4)",
                fontSize: "0.8rem",
                fontWeight: 700,
              }}
            >
              A
            </div>
            {sidebarOpen && (
              <div className="flex-1 overflow-hidden">
                <div style={{ color: "rgba(255,255,255,0.9)", fontSize: "0.825rem", fontWeight: 600, truncate: true }}>Admin User</div>
                <div style={{ color: "rgba(255,255,255,0.4)", fontSize: "0.7rem" }}>Super Administrator</div>
              </div>
            )}
            {sidebarOpen && (
              <button
                onClick={handleLogout}
                className="p-1.5 rounded-lg hover:bg-white/10 transition-colors"
                title="Logout"
              >
                <LogOut size={14} style={{ color: "rgba(255,255,255,0.4)" }} />
              </button>
            )}
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top Header */}
        <header
          className="shrink-0 flex items-center gap-4 px-6 py-4"
          style={{
            background: "rgba(255,255,255,0.85)",
            backdropFilter: "blur(12px)",
            borderBottom: "1px solid rgba(0,0,0,0.06)",
            boxShadow: "0 1px 12px rgba(0,0,0,0.06)",
          }}
        >
          {/* Mobile Menu Button */}
          <button
            onClick={() => setMobileSidebarOpen(!mobileSidebarOpen)}
            className="lg:hidden p-2 rounded-xl hover:bg-black/5 transition-colors"
          >
            {mobileSidebarOpen ? <X size={20} /> : <Menu size={20} />}
          </button>

          {/* Page Title */}
          <div>
            <h1
              style={{
                fontFamily: "'Playfair Display', serif",
                color: "#0D2B1F",
                fontSize: "1.35rem",
                fontWeight: 700,
                lineHeight: 1.2,
              }}
            >
              {getPageTitle()}
            </h1>
            <p style={{ color: "#9CA3AF", fontSize: "0.75rem", marginTop: 2 }}>
              NCHP Museo ng Libingan sa Ilalim ng Lupa ng Nagcarlan
            </p>
          </div>

          <div className="flex-1" />

          {/* Search */}
          <div className="hidden md:flex items-center gap-2 px-4 py-2.5 rounded-xl" style={{ background: "#F3F4F6", width: 220 }}>
            <Search size={15} style={{ color: "#9CA3AF" }} />
            <input
              type="text"
              placeholder="Search…"
              className="bg-transparent outline-none flex-1"
              style={{ color: "#374151", fontSize: "0.85rem" }}
            />
          </div>

          {/* Notification Bell */}
          <button
            className="relative p-2.5 rounded-xl hover:bg-black/5 transition-colors"
          >
            <Bell size={18} style={{ color: "#6B7280" }} />
            <span
              className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full"
              style={{ background: "#C9A84C" }}
            />
          </button>

          {/* Profile */}
          <div className="relative">
            <button
              onClick={() => setProfileOpen(!profileOpen)}
              className="flex items-center gap-2.5 px-3 py-2 rounded-xl hover:bg-black/5 transition-colors"
            >
              <div
                className="rounded-xl flex items-center justify-center text-white"
                style={{
                  width: 32,
                  height: 32,
                  background: "linear-gradient(135deg, #1B4332, #2D6A4F)",
                  fontSize: "0.8rem",
                  fontWeight: 700,
                }}
              >
                A
              </div>
              <span style={{ color: "#374151", fontSize: "0.85rem", fontWeight: 600 }} className="hidden sm:block">
                Admin
              </span>
              <ChevronDown size={14} style={{ color: "#9CA3AF" }} />
            </button>

            {profileOpen && (
              <div
                className="absolute right-0 top-full mt-2 w-48 rounded-2xl shadow-xl overflow-hidden z-50"
                style={{ background: "#fff", border: "1px solid rgba(0,0,0,0.08)" }}
              >
                <div className="p-4" style={{ borderBottom: "1px solid #F3F4F6" }}>
                  <p style={{ color: "#111827", fontSize: "0.85rem", fontWeight: 600 }}>Admin User</p>
                  <p style={{ color: "#9CA3AF", fontSize: "0.75rem" }}>admin@nchp.gov.ph</p>
                </div>
                <div className="p-2">
                  <button
                    onClick={handleLogout}
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-red-50 transition-colors text-left"
                    style={{ color: "#DC2626", fontSize: "0.85rem" }}
                  >
                    <LogOut size={15} />
                    Sign Out
                  </button>
                </div>
              </div>
            )}
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
