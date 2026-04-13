import { useState } from "react";
import { useNavigate } from "react-router";
import {
  TrendingUp,
  Users,
  Eye,
  FileText,
  Image,
  ArrowUpRight,
  ArrowDownRight,
  Plus,
  Calendar,
  Clock,
  Star,
} from "lucide-react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
} from "recharts";

const visitorsData = [
  { month: "Oct", visitors: 1240, pageViews: 3800 },
  { month: "Nov", visitors: 1890, pageViews: 5200 },
  { month: "Dec", visitors: 2340, pageViews: 6800 },
  { month: "Jan", visitors: 1750, pageViews: 5100 },
  { month: "Feb", visitors: 2100, pageViews: 6200 },
  { month: "Mar", visitors: 2850, pageViews: 8100 },
  { month: "Apr", visitors: 3240, pageViews: 9500 },
];

const topPagesData = [
  { page: "Home", views: 4823 },
  { page: "History", views: 3201 },
  { page: "Gallery", views: 2890 },
  { page: "Visit Us", views: 1945 },
  { page: "About", views: 1654 },
];

const contentPieData = [
  { name: "News", value: 42, color: "#1B4332" },
  { name: "Events", value: 28, color: "#C9A84C" },
  { name: "Gallery", value: 18, color: "#2D6A4F" },
  { name: "Articles", value: 12, color: "#A07830" },
];

const recentPosts = [
  {
    id: 1,
    title: "The Underground Cemetery: A Living Heritage",
    category: "History",
    status: "published",
    date: "Apr 10, 2024",
    views: 1243,
  },
  {
    id: 2,
    title: "Upcoming Heritage Week Celebration 2024",
    category: "Events",
    status: "published",
    date: "Apr 8, 2024",
    views: 876,
  },
  {
    id: 3,
    title: "Restoration Project Phase II Update",
    category: "News",
    status: "draft",
    date: "Apr 6, 2024",
    views: 0,
  },
  {
    id: 4,
    title: "Guided Tours: What to Expect",
    category: "Articles",
    status: "published",
    date: "Apr 3, 2024",
    views: 654,
  },
];

const statCards = [
  {
    label: "Total Visitors",
    value: "14,392",
    change: "+18.2%",
    up: true,
    icon: Users,
    color: "#1B4332",
    bg: "linear-gradient(135deg, #1B4332, #2D6A4F)",
    sub: "This month",
  },
  {
    label: "Page Views",
    value: "48,291",
    change: "+24.5%",
    up: true,
    icon: Eye,
    color: "#C9A84C",
    bg: "linear-gradient(135deg, #A07830, #C9A84C)",
    sub: "This month",
  },
  {
    label: "Total Posts",
    value: "127",
    change: "+8 new",
    up: true,
    icon: FileText,
    color: "#6366F1",
    bg: "linear-gradient(135deg, #4F46E5, #6366F1)",
    sub: "Published content",
  },
  {
    label: "Media Files",
    value: "843",
    change: "+32 files",
    up: true,
    icon: Image,
    color: "#EC4899",
    bg: "linear-gradient(135deg, #DB2777, #EC4899)",
    sub: "In library",
  },
];

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div
        className="rounded-xl px-4 py-3 shadow-xl"
        style={{ background: "#0D2B1F", border: "1px solid rgba(201,168,76,0.3)" }}
      >
        <p style={{ color: "#C9A84C", fontSize: "0.78rem", fontWeight: 600, marginBottom: 6 }}>{label}</p>
        {payload.map((entry: any, i: number) => (
          <p key={i} style={{ color: "white", fontSize: "0.82rem" }}>
            {entry.name}: <strong>{entry.value.toLocaleString()}</strong>
          </p>
        ))}
      </div>
    );
  }
  return null;
};

export function Dashboard() {
  const navigate = useNavigate();
  const [activeRange, setActiveRange] = useState("7M");

  return (
    <div className="space-y-6">
      {/* Welcome Banner */}
      <div
        className="rounded-2xl overflow-hidden relative"
        style={{
          background: "linear-gradient(135deg, #0D2B1F 0%, #1B4332 60%, #2D6A4F 100%)",
          padding: "28px 32px",
        }}
      >
        <div
          className="absolute inset-0 opacity-10"
          style={{
            backgroundImage: "radial-gradient(circle at 70% 50%, #C9A84C 0%, transparent 60%)",
          }}
        />
        <div className="absolute top-0 right-0 bottom-0 w-48 opacity-5 flex items-center justify-end pr-8">
          <svg width="120" height="120" viewBox="0 0 40 40" fill="none">
            <path d="M20 2L38 13V27L20 38L2 27V13L20 2Z" fill="white" stroke="white" strokeWidth="1"/>
          </svg>
        </div>
        <div className="relative z-10">
          <p style={{ color: "rgba(201,168,76,0.9)", fontSize: "0.78rem", fontWeight: 600, letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 6 }}>
            Welcome back
          </p>
          <h2
            style={{
              fontFamily: "'Playfair Display', serif",
              color: "white",
              fontSize: "1.65rem",
              fontWeight: 700,
              marginBottom: 8,
              lineHeight: 1.3,
            }}
          >
            Good morning, Administrator
          </h2>
          <p style={{ color: "rgba(255,255,255,0.55)", fontSize: "0.875rem" }}>
            Here's what's happening with your museum website today — April 13, 2024
          </p>
          <div className="flex items-center gap-3 mt-5">
            <button
              onClick={() => navigate("/posts/new")}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-white transition-all hover:opacity-90"
              style={{ background: "linear-gradient(135deg, #C9A84C, #A07830)", fontSize: "0.85rem", fontWeight: 600, boxShadow: "0 4px 14px rgba(201,168,76,0.4)" }}
            >
              <Plus size={15} /> New Post
            </button>
            <button
              onClick={() => navigate("/media")}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl transition-all hover:bg-white/10"
              style={{ background: "rgba(255,255,255,0.12)", color: "rgba(255,255,255,0.85)", fontSize: "0.85rem", fontWeight: 500, border: "1px solid rgba(255,255,255,0.15)" }}
            >
              <Image size={15} /> Upload Media
            </button>
          </div>
        </div>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {statCards.map((card) => {
          const Icon = card.icon;
          return (
            <div
              key={card.label}
              className="rounded-2xl p-5 relative overflow-hidden"
              style={{ background: "#FFFFFF", boxShadow: "0 1px 16px rgba(0,0,0,0.06)", border: "1px solid rgba(0,0,0,0.05)" }}
            >
              <div className="flex items-start justify-between mb-4">
                <div
                  className="rounded-xl flex items-center justify-center"
                  style={{ width: 44, height: 44, background: card.bg, boxShadow: `0 6px 16px rgba(0,0,0,0.2)` }}
                >
                  <Icon size={20} color="white" />
                </div>
                <span
                  className={`flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full`}
                  style={{
                    background: card.up ? "#ECFDF5" : "#FEF2F2",
                    color: card.up ? "#059669" : "#DC2626",
                    fontSize: "0.72rem",
                  }}
                >
                  {card.up ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
                  {card.change}
                </span>
              </div>
              <div>
                <p style={{ color: "#9CA3AF", fontSize: "0.78rem", fontWeight: 500, marginBottom: 2 }}>{card.label}</p>
                <p style={{ color: "#111827", fontSize: "1.65rem", fontWeight: 700, lineHeight: 1.1 }}>{card.value}</p>
                <p style={{ color: "#D1D5DB", fontSize: "0.72rem", marginTop: 4 }}>{card.sub}</p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
        {/* Visitors Chart */}
        <div
          className="xl:col-span-2 rounded-2xl p-6"
          style={{ background: "#FFFFFF", boxShadow: "0 1px 16px rgba(0,0,0,0.06)", border: "1px solid rgba(0,0,0,0.05)" }}
        >
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 style={{ color: "#111827", fontSize: "1rem", fontWeight: 700 }}>Visitor Analytics</h3>
              <p style={{ color: "#9CA3AF", fontSize: "0.78rem", marginTop: 2 }}>Visitors & page views over time</p>
            </div>
            <div className="flex items-center gap-1 p-1 rounded-xl" style={{ background: "#F3F4F6" }}>
              {["7M"].map((r) => (
                <button
                  key={r}
                  onClick={() => setActiveRange(r)}
                  className="px-3 py-1.5 rounded-lg transition-all"
                  style={{
                    background: activeRange === r ? "#1B4332" : "transparent",
                    color: activeRange === r ? "white" : "#6B7280",
                    fontSize: "0.75rem",
                    fontWeight: 600,
                  }}
                >
                  {r}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-4 mb-4">
            <div className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 rounded-full" style={{ background: "#1B4332" }} />
              <span style={{ color: "#6B7280", fontSize: "0.78rem" }}>Visitors</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 rounded-full" style={{ background: "#C9A84C" }} />
              <span style={{ color: "#6B7280", fontSize: "0.78rem" }}>Page Views</span>
            </div>
          </div>

          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={visitorsData}>
              <defs>
                <linearGradient id="visitorsGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#1B4332" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="#1B4332" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="viewsGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#C9A84C" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="#C9A84C" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" />
              <XAxis dataKey="month" tick={{ fill: "#9CA3AF", fontSize: 12 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: "#9CA3AF", fontSize: 12 }} axisLine={false} tickLine={false} />
              <Tooltip content={<CustomTooltip />} />
              <Area type="monotone" dataKey="visitors" name="Visitors" stroke="#1B4332" strokeWidth={2.5} fill="url(#visitorsGrad)" dot={{ fill: "#1B4332", strokeWidth: 2, r: 4 }} />
              <Area type="monotone" dataKey="pageViews" name="Page Views" stroke="#C9A84C" strokeWidth={2.5} fill="url(#viewsGrad)" dot={{ fill: "#C9A84C", strokeWidth: 2, r: 4 }} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Content Distribution */}
        <div
          className="rounded-2xl p-6"
          style={{ background: "#FFFFFF", boxShadow: "0 1px 16px rgba(0,0,0,0.06)", border: "1px solid rgba(0,0,0,0.05)" }}
        >
          <h3 style={{ color: "#111827", fontSize: "1rem", fontWeight: 700, marginBottom: 4 }}>Content Types</h3>
          <p style={{ color: "#9CA3AF", fontSize: "0.78rem", marginBottom: 20 }}>Distribution of published content</p>

          <div className="flex justify-center mb-4">
            <ResponsiveContainer width={180} height={180}>
              <PieChart>
                <Pie
                  data={contentPieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={80}
                  paddingAngle={3}
                  dataKey="value"
                >
                  {contentPieData.map((entry, index) => (
                    <Cell key={index} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    background: "#0D2B1F",
                    border: "1px solid rgba(201,168,76,0.3)",
                    borderRadius: 12,
                    color: "white",
                    fontSize: 12,
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div className="space-y-2.5">
            {contentPieData.map((item) => (
              <div key={item.name} className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: item.color }} />
                  <span style={{ color: "#6B7280", fontSize: "0.82rem" }}>{item.name}</span>
                </div>
                <div className="flex items-center gap-2">
                  <div
                    className="h-1.5 rounded-full"
                    style={{ width: `${item.value * 1.2}px`, background: item.color, opacity: 0.7 }}
                  />
                  <span style={{ color: "#374151", fontSize: "0.82rem", fontWeight: 600, width: 28, textAlign: "right" }}>{item.value}%</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Bottom Row */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
        {/* Recent Posts */}
        <div
          className="xl:col-span-2 rounded-2xl p-6"
          style={{ background: "#FFFFFF", boxShadow: "0 1px 16px rgba(0,0,0,0.06)", border: "1px solid rgba(0,0,0,0.05)" }}
        >
          <div className="flex items-center justify-between mb-5">
            <div>
              <h3 style={{ color: "#111827", fontSize: "1rem", fontWeight: 700 }}>Recent Posts</h3>
              <p style={{ color: "#9CA3AF", fontSize: "0.78rem" }}>Latest published content</p>
            </div>
            <button
              onClick={() => navigate("/posts")}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl hover:bg-gray-50 transition-colors"
              style={{ color: "#1B4332", fontSize: "0.8rem", fontWeight: 600, border: "1px solid #E5E7EB" }}
            >
              View all <ArrowUpRight size={13} />
            </button>
          </div>

          <div className="space-y-3">
            {recentPosts.map((post) => (
              <div
                key={post.id}
                className="flex items-center gap-4 p-4 rounded-xl hover:bg-gray-50 transition-colors cursor-pointer group"
                style={{ border: "1px solid #F3F4F6" }}
              >
                <div
                  className="rounded-xl flex items-center justify-center shrink-0"
                  style={{ width: 42, height: 42, background: "#F0FDF4", border: "1px solid #D1FAE5" }}
                >
                  <FileText size={18} style={{ color: "#1B4332" }} />
                </div>
                <div className="flex-1 min-w-0">
                  <p
                    className="truncate group-hover:text-green-900 transition-colors"
                    style={{ color: "#111827", fontSize: "0.875rem", fontWeight: 600, marginBottom: 2 }}
                  >
                    {post.title}
                  </p>
                  <div className="flex items-center gap-3" style={{ fontSize: "0.75rem", color: "#9CA3AF" }}>
                    <span
                      className="px-2 py-0.5 rounded-full"
                      style={{ background: "#F3F4F6", color: "#6B7280", fontWeight: 500 }}
                    >
                      {post.category}
                    </span>
                    <span className="flex items-center gap-1"><Calendar size={11} /> {post.date}</span>
                    <span className="flex items-center gap-1"><Eye size={11} /> {post.views.toLocaleString()}</span>
                  </div>
                </div>
                <span
                  className="px-3 py-1.5 rounded-full shrink-0"
                  style={{
                    background: post.status === "published" ? "#ECFDF5" : "#FFF7ED",
                    color: post.status === "published" ? "#059669" : "#D97706",
                    fontSize: "0.72rem",
                    fontWeight: 600,
                    textTransform: "capitalize",
                  }}
                >
                  {post.status}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Top Pages + Quick Actions */}
        <div className="space-y-5">
          {/* Top Pages */}
          <div
            className="rounded-2xl p-5"
            style={{ background: "#FFFFFF", boxShadow: "0 1px 16px rgba(0,0,0,0.06)", border: "1px solid rgba(0,0,0,0.05)" }}
          >
            <h3 style={{ color: "#111827", fontSize: "0.95rem", fontWeight: 700, marginBottom: 4 }}>Top Pages</h3>
            <p style={{ color: "#9CA3AF", fontSize: "0.75rem", marginBottom: 16 }}>Most visited this month</p>

            <ResponsiveContainer width="100%" height={140}>
              <BarChart data={topPagesData} layout="vertical" barSize={8}>
                <XAxis type="number" hide />
                <YAxis type="category" dataKey="page" tick={{ fill: "#6B7280", fontSize: 12 }} axisLine={false} tickLine={false} width={55} />
                <Tooltip
                  contentStyle={{
                    background: "#0D2B1F",
                    border: "1px solid rgba(201,168,76,0.3)",
                    borderRadius: 12,
                    color: "white",
                    fontSize: 12,
                  }}
                />
                <Bar dataKey="views" name="Views" radius={[0, 4, 4, 0]}>
                  {topPagesData.map((_, i) => (
                    <Cell key={i} fill={i === 0 ? "#1B4332" : i === 1 ? "#C9A84C" : "#E5E7EB"} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Quick Actions */}
          <div
            className="rounded-2xl p-5"
            style={{ background: "linear-gradient(135deg, #0D2B1F, #1B4332)", boxShadow: "0 1px 16px rgba(0,0,0,0.1)" }}
          >
            <h3 style={{ color: "#C9A84C", fontSize: "0.9rem", fontWeight: 700, marginBottom: 12 }}>Quick Actions</h3>
            <div className="space-y-2">
              {[
                { icon: Plus, label: "Create New Post", action: "/posts/new" },
                { icon: Image, label: "Upload to Gallery", action: "/media" },
                { icon: Star, label: "Manage Featured", action: "/posts" },
              ].map(({ icon: Icon, label, action }) => (
                <button
                  key={label}
                  onClick={() => window.location.href = action}
                  className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left transition-all hover:bg-white/10"
                  style={{ color: "rgba(255,255,255,0.85)", fontSize: "0.82rem", fontWeight: 500, border: "1px solid rgba(255,255,255,0.1)" }}
                >
                  <Icon size={15} style={{ color: "#C9A84C" }} />
                  {label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}