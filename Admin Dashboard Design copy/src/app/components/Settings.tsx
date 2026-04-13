import { useState } from "react";
import {
  Globe,
  Bell,
  Shield,
  User,
  Mail,
  Phone,
  MapPin,
  Save,
  Check,
  Eye,
  EyeOff,
  Palette,
  Database,
  RefreshCw,
} from "lucide-react";

const TABS = [
  { id: "general", label: "General", icon: Globe },
  { id: "profile", label: "Profile", icon: User },
  { id: "notifications", label: "Notifications", icon: Bell },
  { id: "security", label: "Security", icon: Shield },
];

export function Settings() {
  const [activeTab, setActiveTab] = useState("general");
  const [saved, setSaved] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // General settings state
  const [siteName, setSiteName] = useState("Museo ng Libingan sa Ilalim ng Lupa ng Nagcarlan");
  const [tagline, setTagline] = useState("A National Cultural Treasure");
  const [siteEmail, setSiteEmail] = useState("info@nagcarlanmuseum.gov.ph");
  const [sitePhone, setSitePhone] = useState("+63 49 501 0000");
  const [siteAddress, setSiteAddress] = useState("Nagcarlan, Laguna, Philippines");
  const [maintenanceMode, setMaintenanceMode] = useState(false);
  const [commentsEnabled, setCommentsEnabled] = useState(true);
  const [postsPerPage, setPostsPerPage] = useState("10");

  // Notification toggles
  const [notifs, setNotifs] = useState({
    newComment: true,
    newVisitor: false,
    weeklyReport: true,
    systemAlerts: true,
    emailDigest: false,
  });

  const handleSave = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  const Toggle = ({ value, onChange }: { value: boolean; onChange: () => void }) => (
    <button
      onClick={onChange}
      className="relative rounded-full transition-all"
      style={{
        width: 44,
        height: 24,
        background: value ? "linear-gradient(135deg, #1B4332, #2D6A4F)" : "#E5E7EB",
        flexShrink: 0,
      }}
    >
      <div
        className="absolute top-0.5 rounded-full bg-white shadow-sm transition-all duration-200"
        style={{ width: 20, height: 20, left: value ? 22 : 2 }}
      />
    </button>
  );

  const Field = ({
    label,
    sublabel,
    children,
  }: {
    label: string;
    sublabel?: string;
    children: React.ReactNode;
  }) => (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 py-5" style={{ borderBottom: "1px solid #F3F4F6" }}>
      <div>
        <p style={{ color: "#374151", fontSize: "0.875rem", fontWeight: 600 }}>{label}</p>
        {sublabel && <p style={{ color: "#9CA3AF", fontSize: "0.78rem", marginTop: 2 }}>{sublabel}</p>}
      </div>
      <div className="md:col-span-2">{children}</div>
    </div>
  );

  const inputStyle = {
    background: "#F9FAFB",
    border: "1.5px solid #E5E7EB",
    color: "#111827",
    fontSize: "0.875rem",
    borderRadius: "0.75rem",
    padding: "0.625rem 1rem",
    width: "100%",
    outline: "none",
    fontFamily: "'Inter', sans-serif",
  };

  return (
    <div className="max-w-4xl mx-auto space-y-5">
      {/* Tabs */}
      <div
        className="rounded-2xl p-1.5 flex gap-1"
        style={{ background: "#FFF", border: "1px solid rgba(0,0,0,0.05)", boxShadow: "0 1px 8px rgba(0,0,0,0.05)" }}
      >
        {TABS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setActiveTab(id)}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl transition-all"
            style={{
              background: activeTab === id ? "linear-gradient(135deg, #1B4332, #2D6A4F)" : "transparent",
              color: activeTab === id ? "white" : "#6B7280",
              fontSize: "0.82rem",
              fontWeight: activeTab === id ? 600 : 500,
            }}
          >
            <Icon size={15} />
            <span className="hidden sm:inline">{label}</span>
          </button>
        ))}
      </div>

      {/* Content Card */}
      <div
        className="rounded-2xl overflow-hidden"
        style={{ background: "#FFF", border: "1px solid rgba(0,0,0,0.05)", boxShadow: "0 1px 8px rgba(0,0,0,0.05)" }}
      >
        {/* Tab Header */}
        <div
          className="px-8 py-5"
          style={{
            background: "linear-gradient(135deg, #0D2B1F, #1B4332)",
            borderBottom: "1px solid rgba(201,168,76,0.15)",
          }}
        >
          <h2
            style={{
              fontFamily: "'Playfair Display', serif",
              color: "white",
              fontSize: "1.15rem",
              fontWeight: 700,
              marginBottom: 4,
            }}
          >
            {TABS.find((t) => t.id === activeTab)?.label} Settings
          </h2>
          <p style={{ color: "rgba(255,255,255,0.5)", fontSize: "0.8rem" }}>
            Manage your {TABS.find((t) => t.id === activeTab)?.label.toLowerCase()} configuration and preferences
          </p>
        </div>

        <div className="px-8 pb-6">
          {/* General Tab */}
          {activeTab === "general" && (
            <>
              <Field label="Site Name" sublabel="The official name of the museum website">
                <input style={inputStyle} value={siteName} onChange={(e) => setSiteName(e.target.value)} />
              </Field>

              <Field label="Tagline" sublabel="A short description shown in search results">
                <input style={inputStyle} value={tagline} onChange={(e) => setTagline(e.target.value)} />
              </Field>

              <Field label="Contact Email" sublabel="Public-facing contact email address">
                <div className="relative">
                  <Mail size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2" style={{ color: "#9CA3AF" }} />
                  <input
                    style={{ ...inputStyle, paddingLeft: "2.5rem" }}
                    value={siteEmail}
                    onChange={(e) => setSiteEmail(e.target.value)}
                  />
                </div>
              </Field>

              <Field label="Phone Number" sublabel="Museum contact number">
                <div className="relative">
                  <Phone size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2" style={{ color: "#9CA3AF" }} />
                  <input
                    style={{ ...inputStyle, paddingLeft: "2.5rem" }}
                    value={sitePhone}
                    onChange={(e) => setSitePhone(e.target.value)}
                  />
                </div>
              </Field>

              <Field label="Address" sublabel="Physical location of the museum">
                <div className="relative">
                  <MapPin size={15} className="absolute left-3.5 top-3.5" style={{ color: "#9CA3AF" }} />
                  <textarea
                    style={{ ...inputStyle, paddingLeft: "2.5rem", resize: "none", minHeight: 80 }}
                    value={siteAddress}
                    onChange={(e) => setSiteAddress(e.target.value)}
                  />
                </div>
              </Field>

              <Field label="Posts Per Page" sublabel="Number of posts shown in listing pages">
                <select
                  style={{ ...inputStyle, cursor: "pointer" }}
                  value={postsPerPage}
                  onChange={(e) => setPostsPerPage(e.target.value)}
                >
                  {["5", "10", "15", "20", "25"].map((n) => (
                    <option key={n} value={n}>{n} posts per page</option>
                  ))}
                </select>
              </Field>

              <Field label="Comments" sublabel="Allow visitors to post comments">
                <div className="flex items-center gap-3">
                  <Toggle value={commentsEnabled} onChange={() => setCommentsEnabled(!commentsEnabled)} />
                  <span style={{ color: "#6B7280", fontSize: "0.875rem" }}>
                    {commentsEnabled ? "Comments are enabled" : "Comments are disabled"}
                  </span>
                </div>
              </Field>

              <Field label="Maintenance Mode" sublabel="Show maintenance page to public visitors">
                <div className="flex items-center gap-3">
                  <Toggle value={maintenanceMode} onChange={() => setMaintenanceMode(!maintenanceMode)} />
                  <span
                    style={{
                      color: maintenanceMode ? "#D97706" : "#6B7280",
                      fontSize: "0.875rem",
                      fontWeight: maintenanceMode ? 600 : 400,
                    }}
                  >
                    {maintenanceMode ? "⚠ Maintenance mode is ON" : "Site is live and accessible"}
                  </span>
                </div>
              </Field>
            </>
          )}

          {/* Profile Tab */}
          {activeTab === "profile" && (
            <>
              <Field label="Display Name" sublabel="Your name shown on published posts">
                <input style={inputStyle} defaultValue="Administrator" />
              </Field>

              <Field label="Email Address" sublabel="Used for login and notifications">
                <div className="relative">
                  <Mail size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2" style={{ color: "#9CA3AF" }} />
                  <input style={{ ...inputStyle, paddingLeft: "2.5rem" }} defaultValue="admin@nchp.gov.ph" />
                </div>
              </Field>

              <Field label="Bio / About" sublabel="Short bio displayed on the author page">
                <textarea
                  style={{ ...inputStyle, resize: "none", minHeight: 100 }}
                  defaultValue="Administrator of the NCHP Museo ng Libingan sa Ilalim ng Lupa ng Nagcarlan website."
                />
              </Field>

              <Field label="Profile Photo" sublabel="Your avatar image">
                <div className="flex items-center gap-5">
                  <div
                    className="rounded-2xl flex items-center justify-center text-white"
                    style={{
                      width: 64,
                      height: 64,
                      background: "linear-gradient(135deg, #1B4332, #2D6A4F)",
                      border: "2px solid rgba(201,168,76,0.4)",
                      fontSize: "1.5rem",
                      fontWeight: 700,
                    }}
                  >
                    A
                  </div>
                  <div>
                    <button
                      className="px-4 py-2.5 rounded-xl transition-colors"
                      style={{ border: "1.5px solid #E5E7EB", color: "#374151", fontSize: "0.82rem", fontWeight: 600 }}
                    >
                      Upload new photo
                    </button>
                    <p style={{ color: "#9CA3AF", fontSize: "0.72rem", marginTop: 6 }}>PNG, JPG up to 2MB</p>
                  </div>
                </div>
              </Field>
            </>
          )}

          {/* Notifications Tab */}
          {activeTab === "notifications" && (
            <>
              {[
                { key: "newComment", label: "New Comment", desc: "When a visitor submits a new comment" },
                { key: "newVisitor", label: "Visitor Milestones", desc: "When visitor count hits milestones" },
                { key: "weeklyReport", label: "Weekly Analytics Report", desc: "Summary of site performance each week" },
                { key: "systemAlerts", label: "System Alerts", desc: "Critical updates and security notices" },
                { key: "emailDigest", label: "Daily Email Digest", desc: "Daily summary of all activity" },
              ].map(({ key, label, desc }) => (
                <div
                  key={key}
                  className="flex items-center justify-between py-5"
                  style={{ borderBottom: "1px solid #F3F4F6" }}
                >
                  <div>
                    <p style={{ color: "#374151", fontSize: "0.875rem", fontWeight: 600 }}>{label}</p>
                    <p style={{ color: "#9CA3AF", fontSize: "0.78rem", marginTop: 2 }}>{desc}</p>
                  </div>
                  <Toggle
                    value={notifs[key as keyof typeof notifs]}
                    onChange={() => setNotifs((n) => ({ ...n, [key]: !n[key as keyof typeof notifs] }))}
                  />
                </div>
              ))}
            </>
          )}

          {/* Security Tab */}
          {activeTab === "security" && (
            <>
              <Field label="Current Password" sublabel="Enter your current password">
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    style={{ ...inputStyle, paddingRight: "2.5rem" }}
                    placeholder="••••••••"
                  />
                  <button
                    className="absolute right-3 top-1/2 -translate-y-1/2"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? <EyeOff size={15} style={{ color: "#9CA3AF" }} /> : <Eye size={15} style={{ color: "#9CA3AF" }} />}
                  </button>
                </div>
              </Field>

              <Field label="New Password" sublabel="Must be at least 8 characters">
                <input type="password" style={inputStyle} placeholder="••••••••" />
              </Field>

              <Field label="Confirm Password" sublabel="Re-enter your new password">
                <input type="password" style={inputStyle} placeholder="••••••••" />
              </Field>

              <div className="py-5" style={{ borderBottom: "1px solid #F3F4F6" }}>
                <div
                  className="rounded-2xl p-5"
                  style={{ background: "#FFF9EE", border: "1px solid rgba(201,168,76,0.25)" }}
                >
                  <h4 style={{ color: "#92400E", fontSize: "0.875rem", fontWeight: 700, marginBottom: 8 }}>
                    Password Requirements
                  </h4>
                  <ul className="space-y-1.5">
                    {[
                      "At least 8 characters long",
                      "Contains uppercase and lowercase letters",
                      "Contains at least one number",
                      "Contains at least one special character",
                    ].map((req) => (
                      <li key={req} className="flex items-center gap-2" style={{ color: "#92400E", fontSize: "0.8rem" }}>
                        <Check size={12} style={{ color: "#C9A84C" }} /> {req}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              <div className="py-5">
                <p style={{ color: "#374151", fontSize: "0.875rem", fontWeight: 600, marginBottom: 4 }}>Login Sessions</p>
                <p style={{ color: "#9CA3AF", fontSize: "0.78rem", marginBottom: 12 }}>Manage active sessions on other devices</p>
                <button
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl hover:bg-red-50 transition-colors"
                  style={{ border: "1.5px solid #FECACA", color: "#DC2626", fontSize: "0.82rem", fontWeight: 600 }}
                >
                  <RefreshCw size={14} /> Revoke All Other Sessions
                </button>
              </div>
            </>
          )}

          {/* Save Button */}
          <div className="flex items-center justify-end gap-3 pt-6 mt-2" style={{ borderTop: "1px solid #F3F4F6" }}>
            {saved && (
              <span
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl"
                style={{ background: "#ECFDF5", color: "#059669", fontSize: "0.82rem", fontWeight: 600 }}
              >
                <Check size={14} /> Changes saved
              </span>
            )}
            <button
              className="px-4 py-2.5 rounded-xl transition-colors"
              style={{ background: "#F3F4F6", color: "#6B7280", fontSize: "0.875rem", fontWeight: 600, border: "1px solid #E5E7EB" }}
            >
              Reset
            </button>
            <button
              onClick={handleSave}
              className="flex items-center gap-2 px-6 py-2.5 rounded-xl text-white transition-all hover:opacity-90"
              style={{
                background: "linear-gradient(135deg, #1B4332, #0D2B1F)",
                fontSize: "0.875rem",
                fontWeight: 600,
                boxShadow: "0 4px 14px rgba(13,43,31,0.3)",
              }}
            >
              <Save size={15} /> Save Changes
            </button>
          </div>
        </div>
      </div>

      {/* Danger Zone */}
      <div
        className="rounded-2xl overflow-hidden"
        style={{ background: "#FFF", border: "1.5px solid #FECACA", boxShadow: "0 1px 8px rgba(0,0,0,0.05)" }}
      >
        <div className="px-8 py-5" style={{ borderBottom: "1px solid #FEF2F2", background: "#FFF5F5" }}>
          <h3 style={{ color: "#991B1B", fontSize: "0.95rem", fontWeight: 700 }}>Danger Zone</h3>
          <p style={{ color: "#9CA3AF", fontSize: "0.78rem", marginTop: 2 }}>Irreversible actions — proceed with caution</p>
        </div>
        <div className="px-8 py-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <p style={{ color: "#374151", fontSize: "0.875rem", fontWeight: 600 }}>Clear All Cache</p>
            <p style={{ color: "#9CA3AF", fontSize: "0.78rem" }}>Flush the site cache and rebuild all pages</p>
          </div>
          <button
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl shrink-0 hover:opacity-90 transition-opacity"
            style={{ background: "#EF4444", color: "white", fontSize: "0.82rem", fontWeight: 600 }}
          >
            <Database size={14} /> Clear Cache
          </button>
        </div>
      </div>
    </div>
  );
}
