import { useState } from "react";
import { useNavigate } from "react-router";
import {
  Plus,
  Search,
  Edit2,
  Trash2,
  Eye,
  Calendar,
  Filter,
  ChevronDown,
  FileText,
  Star,
  StarOff,
  Copy,
  MoreVertical,
  X,
} from "lucide-react";

const INITIAL_POSTS = [
  {
    id: 1,
    title: "The Underground Cemetery: A Living Heritage of Nagcarlan",
    category: "History",
    status: "published",
    date: "Apr 10, 2024",
    author: "Admin",
    views: 1243,
    featured: true,
    excerpt: "Discover the unique underground cemetery built during the Spanish colonial period...",
    thumbnail: "https://images.unsplash.com/photo-1768245076236-dbdf5055bba8?w=120&h=80&fit=crop",
  },
  {
    id: 2,
    title: "Upcoming Heritage Week Celebration 2024",
    category: "Events",
    status: "published",
    date: "Apr 8, 2024",
    author: "Admin",
    views: 876,
    featured: false,
    excerpt: "Join us for a week-long celebration honoring the rich cultural heritage of Nagcarlan...",
    thumbnail: "https://images.unsplash.com/photo-1774302753274-2ae387cedd1b?w=120&h=80&fit=crop",
  },
  {
    id: 3,
    title: "Restoration Project Phase II Update",
    category: "News",
    status: "draft",
    date: "Apr 6, 2024",
    author: "Admin",
    views: 0,
    featured: false,
    excerpt: "The second phase of the restoration project is now underway with new conservation methods...",
    thumbnail: null,
  },
  {
    id: 4,
    title: "Guided Tours: What to Expect at Museo ng Libingan",
    category: "Articles",
    status: "published",
    date: "Apr 3, 2024",
    author: "Admin",
    views: 654,
    featured: false,
    excerpt: "Everything you need to know before visiting the underground cemetery museum...",
    thumbnail: "https://images.unsplash.com/photo-1770910196472-6936b9639687?w=120&h=80&fit=crop",
  },
  {
    id: 5,
    title: "Traditional Funeral Practices in Colonial Philippines",
    category: "History",
    status: "published",
    date: "Mar 28, 2024",
    author: "Admin",
    views: 2341,
    featured: true,
    excerpt: "An in-depth look at the burial rites and traditions observed during Spanish occupation...",
    thumbnail: "https://images.unsplash.com/photo-1701937750716-6b5174d22615?w=120&h=80&fit=crop",
  },
  {
    id: 6,
    title: "Annual Photography Contest: Capturing Heritage",
    category: "Events",
    status: "scheduled",
    date: "Apr 20, 2024",
    author: "Admin",
    views: 0,
    featured: false,
    excerpt: "Submit your best photographs of Nagcarlan's cultural heritage sites...",
    thumbnail: null,
  },
  {
    id: 7,
    title: "NCHP Partners with Local Universities for Research",
    category: "News",
    status: "published",
    date: "Mar 15, 2024",
    author: "Admin",
    views: 432,
    featured: false,
    excerpt: "A new partnership aims to study the preservation of underground structures in tropical climates...",
    thumbnail: "https://images.unsplash.com/photo-1769242448963-6f3ac5cbcf01?w=120&h=80&fit=crop",
  },
];

const STATUS_COLORS: Record<string, { bg: string; color: string }> = {
  published: { bg: "#ECFDF5", color: "#059669" },
  draft: { bg: "#FFF7ED", color: "#D97706" },
  scheduled: { bg: "#EFF6FF", color: "#3B82F6" },
};

const CATEGORIES = ["All", "History", "Events", "News", "Articles"];
const STATUSES = ["All", "Published", "Draft", "Scheduled"];

export function Posts() {
  const navigate = useNavigate();
  const [posts, setPosts] = useState(INITIAL_POSTS);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("All");
  const [statusFilter, setStatusFilter] = useState("All");
  const [openMenu, setOpenMenu] = useState<number | null>(null);
  const [deleteModal, setDeleteModal] = useState<number | null>(null);
  const [viewMode, setViewMode] = useState<"table" | "grid">("table");

  const filtered = posts.filter((p) => {
    const matchSearch = p.title.toLowerCase().includes(search.toLowerCase());
    const matchCat = categoryFilter === "All" || p.category === categoryFilter;
    const matchStatus = statusFilter === "All" || p.status === statusFilter.toLowerCase();
    return matchSearch && matchCat && matchStatus;
  });

  const handleDelete = (id: number) => {
    setPosts((prev) => prev.filter((p) => p.id !== id));
    setDeleteModal(null);
  };

  const handleToggleFeatured = (id: number) => {
    setPosts((prev) =>
      prev.map((p) => (p.id === id ? { ...p, featured: !p.featured } : p))
    );
    setOpenMenu(null);
  };

  const handleDuplicate = (post: (typeof INITIAL_POSTS)[0]) => {
    const newPost = {
      ...post,
      id: Date.now(),
      title: post.title + " (Copy)",
      status: "draft" as const,
      views: 0,
    };
    setPosts((prev) => [newPost, ...prev]);
    setOpenMenu(null);
  };

  const publishedCount = posts.filter((p) => p.status === "published").length;
  const draftCount = posts.filter((p) => p.status === "draft").length;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <p style={{ color: "#9CA3AF", fontSize: "0.85rem" }}>
            {posts.length} total · {publishedCount} published · {draftCount} drafts
          </p>
        </div>
        <button
          onClick={() => navigate("/posts/new")}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-white transition-all hover:opacity-90 shrink-0"
          style={{
            background: "linear-gradient(135deg, #1B4332, #0D2B1F)",
            fontSize: "0.875rem",
            fontWeight: 600,
            boxShadow: "0 4px 14px rgba(13,43,31,0.3)",
          }}
        >
          <Plus size={16} /> New Post
        </button>
      </div>

      {/* Filters Row */}
      <div
        className="rounded-2xl p-4 flex flex-col sm:flex-row gap-3"
        style={{ background: "#FFFFFF", border: "1px solid rgba(0,0,0,0.05)", boxShadow: "0 1px 12px rgba(0,0,0,0.05)" }}
      >
        <div className="flex items-center gap-2 flex-1 px-4 py-2.5 rounded-xl" style={{ background: "#F9FAFB", border: "1px solid #E5E7EB" }}>
          <Search size={15} style={{ color: "#9CA3AF" }} />
          <input
            type="text"
            placeholder="Search posts…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="bg-transparent outline-none flex-1"
            style={{ color: "#374151", fontSize: "0.875rem" }}
          />
          {search && (
            <button onClick={() => setSearch("")}>
              <X size={14} style={{ color: "#9CA3AF" }} />
            </button>
          )}
        </div>

        <div className="flex gap-2 flex-wrap">
          {/* Category Filter */}
          <div className="relative">
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="appearance-none pl-4 pr-8 py-2.5 rounded-xl outline-none cursor-pointer"
              style={{
                background: "#F9FAFB",
                border: "1px solid #E5E7EB",
                color: "#374151",
                fontSize: "0.85rem",
                fontWeight: 500,
              }}
            >
              {CATEGORIES.map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
            <ChevronDown size={13} className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: "#9CA3AF" }} />
          </div>

          {/* Status Filter */}
          <div className="relative">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="appearance-none pl-4 pr-8 py-2.5 rounded-xl outline-none cursor-pointer"
              style={{
                background: "#F9FAFB",
                border: "1px solid #E5E7EB",
                color: "#374151",
                fontSize: "0.85rem",
                fontWeight: 500,
              }}
            >
              {STATUSES.map((s) => (
                <option key={s}>{s}</option>
              ))}
            </select>
            <ChevronDown size={13} className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: "#9CA3AF" }} />
          </div>
        </div>
      </div>

      {/* Posts Table */}
      <div
        className="rounded-2xl overflow-hidden"
        style={{ background: "#FFFFFF", border: "1px solid rgba(0,0,0,0.05)", boxShadow: "0 1px 12px rgba(0,0,0,0.05)" }}
      >
        {/* Table Head */}
        <div
          className="px-6 py-3.5 grid gap-4"
          style={{
            gridTemplateColumns: "2fr 120px 110px 90px 60px 80px",
            background: "#F9FAFB",
            borderBottom: "1px solid #F3F4F6",
            fontSize: "0.75rem",
            fontWeight: 700,
            color: "#9CA3AF",
            letterSpacing: "0.06em",
            textTransform: "uppercase",
          }}
        >
          <span>Post Title</span>
          <span>Category</span>
          <span>Status</span>
          <span>Date</span>
          <span>Views</span>
          <span className="text-right">Actions</span>
        </div>

        {/* Table Body */}
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16" style={{ color: "#9CA3AF" }}>
            <FileText size={40} style={{ marginBottom: 12, opacity: 0.4 }} />
            <p style={{ fontSize: "0.95rem", fontWeight: 600 }}>No posts found</p>
            <p style={{ fontSize: "0.8rem" }}>Try adjusting your search or filters</p>
          </div>
        ) : (
          <div className="divide-y" style={{ borderColor: "#F9FAFB" }}>
            {filtered.map((post) => {
              const sc = STATUS_COLORS[post.status] || STATUS_COLORS.draft;
              return (
                <div
                  key={post.id}
                  className="px-6 py-4 grid gap-4 hover:bg-gray-50/50 transition-colors items-center group"
                  style={{ gridTemplateColumns: "2fr 120px 110px 90px 60px 80px" }}
                >
                  {/* Title */}
                  <div className="flex items-center gap-3 min-w-0">
                    {post.thumbnail ? (
                      <img
                        src={post.thumbnail}
                        alt=""
                        className="rounded-xl shrink-0 object-cover"
                        style={{ width: 48, height: 36 }}
                      />
                    ) : (
                      <div
                        className="rounded-xl shrink-0 flex items-center justify-center"
                        style={{ width: 48, height: 36, background: "#F3F4F6" }}
                      >
                        <FileText size={16} style={{ color: "#D1D5DB" }} />
                      </div>
                    )}
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 mb-0.5">
                        {post.featured && (
                          <Star size={11} style={{ color: "#C9A84C", fill: "#C9A84C", flexShrink: 0 }} />
                        )}
                        <p
                          className="truncate"
                          style={{ color: "#111827", fontSize: "0.875rem", fontWeight: 600 }}
                        >
                          {post.title}
                        </p>
                      </div>
                      <p
                        className="truncate"
                        style={{ color: "#9CA3AF", fontSize: "0.75rem" }}
                      >
                        {post.excerpt}
                      </p>
                    </div>
                  </div>

                  {/* Category */}
                  <span
                    className="px-3 py-1 rounded-full inline-flex items-center"
                    style={{ background: "#F0FDF4", color: "#1B4332", fontSize: "0.75rem", fontWeight: 600, width: "fit-content" }}
                  >
                    {post.category}
                  </span>

                  {/* Status */}
                  <span
                    className="px-3 py-1 rounded-full inline-flex items-center gap-1.5"
                    style={{ background: sc.bg, color: sc.color, fontSize: "0.75rem", fontWeight: 600, width: "fit-content" }}
                  >
                    <span className="w-1.5 h-1.5 rounded-full" style={{ background: sc.color }} />
                    {post.status.charAt(0).toUpperCase() + post.status.slice(1)}
                  </span>

                  {/* Date */}
                  <span style={{ color: "#6B7280", fontSize: "0.78rem" }} className="flex items-center gap-1">
                    <Calendar size={11} /> {post.date}
                  </span>

                  {/* Views */}
                  <span style={{ color: "#374151", fontSize: "0.82rem", fontWeight: 600 }}>
                    {post.views > 0 ? post.views.toLocaleString() : "—"}
                  </span>

                  {/* Actions */}
                  <div className="flex items-center justify-end gap-1">
                    <button
                      onClick={() => navigate(`/posts/edit/${post.id}`)}
                      className="p-2 rounded-lg hover:bg-blue-50 transition-colors"
                      title="Edit"
                    >
                      <Edit2 size={14} style={{ color: "#3B82F6" }} />
                    </button>
                    <button
                      onClick={() => setDeleteModal(post.id)}
                      className="p-2 rounded-lg hover:bg-red-50 transition-colors"
                      title="Delete"
                    >
                      <Trash2 size={14} style={{ color: "#EF4444" }} />
                    </button>
                    <div className="relative">
                      <button
                        onClick={() => setOpenMenu(openMenu === post.id ? null : post.id)}
                        className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
                      >
                        <MoreVertical size={14} style={{ color: "#9CA3AF" }} />
                      </button>
                      {openMenu === post.id && (
                        <div
                          className="absolute right-0 top-full mt-1 w-44 rounded-xl shadow-xl z-20 overflow-hidden"
                          style={{ background: "#FFF", border: "1px solid rgba(0,0,0,0.08)" }}
                        >
                          <button
                            onClick={() => handleToggleFeatured(post.id)}
                            className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50 text-left"
                            style={{ color: "#374151", fontSize: "0.82rem" }}
                          >
                            {post.featured ? <StarOff size={14} /> : <Star size={14} style={{ color: "#C9A84C" }} />}
                            {post.featured ? "Unfeature" : "Mark as Featured"}
                          </button>
                          <button
                            onClick={() => handleDuplicate(post)}
                            className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50 text-left"
                            style={{ color: "#374151", fontSize: "0.82rem" }}
                          >
                            <Copy size={14} /> Duplicate
                          </button>
                          <button
                            className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50 text-left"
                            style={{ color: "#374151", fontSize: "0.82rem" }}
                          >
                            <Eye size={14} /> Preview
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Footer */}
        <div
          className="px-6 py-3.5 flex items-center justify-between"
          style={{ background: "#F9FAFB", borderTop: "1px solid #F3F4F6" }}
        >
          <p style={{ color: "#9CA3AF", fontSize: "0.78rem" }}>
            Showing {filtered.length} of {posts.length} posts
          </p>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {deleteModal !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setDeleteModal(null)} />
          <div
            className="relative w-full max-w-md rounded-2xl p-8 shadow-2xl"
            style={{ background: "#FFF", border: "1px solid rgba(0,0,0,0.08)" }}
          >
            <div
              className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-5"
              style={{ background: "#FEF2F2" }}
            >
              <Trash2 size={24} style={{ color: "#EF4444" }} />
            </div>
            <h3
              className="text-center mb-2"
              style={{ color: "#111827", fontSize: "1.1rem", fontWeight: 700 }}
            >
              Delete Post?
            </h3>
            <p className="text-center mb-6" style={{ color: "#6B7280", fontSize: "0.875rem" }}>
              This action cannot be undone. The post will be permanently removed from the website.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setDeleteModal(null)}
                className="flex-1 py-3 rounded-xl transition-colors"
                style={{ background: "#F3F4F6", color: "#374151", fontWeight: 600, fontSize: "0.875rem" }}
              >
                Cancel
              </button>
              <button
                onClick={() => handleDelete(deleteModal)}
                className="flex-1 py-3 rounded-xl text-white transition-colors"
                style={{ background: "#EF4444", fontWeight: 600, fontSize: "0.875rem" }}
              >
                Delete Post
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
