import { useState } from "react";
import { useNavigate, useParams } from "react-router";
import {
  ArrowLeft,
  Save,
  Eye,
  Image,
  Bold,
  Italic,
  Underline,
  List,
  AlignLeft,
  AlignCenter,
  Link,
  Quote,
  Heading,
  ChevronDown,
  X,
  Upload,
  Star,
  Calendar,
} from "lucide-react";

const SAMPLE_POSTS: Record<string, { title: string; content: string; category: string; excerpt: string; status: string; featured: boolean }> = {
  "1": {
    title: "The Underground Cemetery: A Living Heritage of Nagcarlan",
    content: `The Underground Cemetery of Nagcarlan, Laguna, stands as a remarkable testament to Philippine colonial history and the enduring spirit of the Filipino people. Built in 1845 by Fray Cipriano Herrero, this unique burial site has captivated historians, architects, and tourists alike for generations.

Constructed primarily of brick and lime from the volcanic deposits of Mt. Banahaw, the cemetery's underground chapel serves as the central piece of this architectural wonder. The circular design, with its brick-domed roof and subterranean chapel, represents a rare example of Spanish colonial funerary architecture in Southeast Asia.

During the Philippine Revolution, the cemetery served as a secret meeting place for members of the Katipunan, the revolutionary organization led by Andres Bonifacio. This historical significance adds another layer of importance to an already remarkable site.

Today, the Underground Cemetery is maintained by the National Commission for Culture and the Arts (NCHP) as a protected cultural property and museum site, welcoming thousands of visitors annually who come to witness this unique intersection of colonial architecture, religious practice, and revolutionary history.`,
    category: "History",
    excerpt: "Discover the unique underground cemetery built during the Spanish colonial period...",
    status: "published",
    featured: true,
  },
};

const FORMATTING_TOOLS = [
  { icon: Bold, label: "Bold" },
  { icon: Italic, label: "Italic" },
  { icon: Underline, label: "Underline" },
  { icon: Heading, label: "Heading" },
  { icon: Quote, label: "Blockquote" },
  { icon: List, label: "List" },
  { icon: AlignLeft, label: "Left" },
  { icon: AlignCenter, label: "Center" },
  { icon: Link, label: "Link" },
];

export function PostEditor() {
  const navigate = useNavigate();
  const { id } = useParams();
  const existing = id ? SAMPLE_POSTS[id] : null;

  const [title, setTitle] = useState(existing?.title || "");
  const [content, setContent] = useState(existing?.content || "");
  const [category, setCategory] = useState(existing?.category || "History");
  const [excerpt, setExcerpt] = useState(existing?.excerpt || "");
  const [status, setStatus] = useState(existing?.status || "draft");
  const [featured, setFeatured] = useState(existing?.featured || false);
  const [tags, setTags] = useState<string[]>(["Heritage", "Nagcarlan"]);
  const [tagInput, setTagInput] = useState("");
  const [thumbnail, setThumbnail] = useState<string | null>(
    id === "1" ? "https://images.unsplash.com/photo-1768245076236-dbdf5055bba8?w=400&h=200&fit=crop" : null
  );
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);

  const handleSave = (newStatus?: string) => {
    setSaving(true);
    setTimeout(() => {
      setSaving(false);
      setSaved(true);
      if (newStatus) setStatus(newStatus);
      setTimeout(() => setSaved(false), 2500);
    }, 800);
  };

  const addTag = () => {
    const t = tagInput.trim();
    if (t && !tags.includes(t)) {
      setTags([...tags, t]);
    }
    setTagInput("");
  };

  const removeTag = (t: string) => setTags(tags.filter((x) => x !== t));

  return (
    <div className="max-w-6xl mx-auto">
      {/* Top Bar */}
      <div className="flex items-center justify-between mb-6">
        <button
          onClick={() => navigate("/posts")}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl hover:bg-white transition-colors"
          style={{ color: "#6B7280", fontSize: "0.875rem", fontWeight: 500 }}
        >
          <ArrowLeft size={16} /> Back to Posts
        </button>

        <div className="flex items-center gap-2">
          {saved && (
            <span
              className="px-4 py-2 rounded-xl flex items-center gap-2"
              style={{ background: "#ECFDF5", color: "#059669", fontSize: "0.82rem", fontWeight: 600 }}
            >
              ✓ Saved successfully
            </span>
          )}
          <button
            onClick={() => handleSave()}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl transition-all hover:opacity-90"
            style={{
              background: "#F3F4F6",
              color: "#374151",
              fontSize: "0.875rem",
              fontWeight: 600,
              border: "1px solid #E5E7EB",
            }}
            disabled={saving}
          >
            <Save size={15} /> {saving ? "Saving…" : "Save Draft"}
          </button>
          <button
            onClick={() => handleSave("published")}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-white transition-all hover:opacity-90"
            style={{
              background: "linear-gradient(135deg, #1B4332, #0D2B1F)",
              fontSize: "0.875rem",
              fontWeight: 600,
              boxShadow: "0 4px 14px rgba(13,43,31,0.3)",
            }}
            disabled={saving}
          >
            <Eye size={15} /> Publish
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
        {/* Main Editor */}
        <div className="xl:col-span-2 space-y-4">
          {/* Title */}
          <div
            className="rounded-2xl p-6"
            style={{ background: "#FFF", border: "1px solid rgba(0,0,0,0.05)", boxShadow: "0 1px 12px rgba(0,0,0,0.05)" }}
          >
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Enter post title…"
              className="w-full outline-none bg-transparent"
              style={{
                fontFamily: "'Playfair Display', serif",
                fontSize: "1.6rem",
                fontWeight: 700,
                color: "#111827",
                lineHeight: 1.3,
              }}
            />
            <div className="mt-3 pt-3" style={{ borderTop: "1px solid #F3F4F6" }}>
              <input
                type="text"
                value={excerpt}
                onChange={(e) => setExcerpt(e.target.value)}
                placeholder="Write a short excerpt or description…"
                className="w-full outline-none bg-transparent"
                style={{ color: "#6B7280", fontSize: "0.9rem", lineHeight: 1.5 }}
              />
            </div>
          </div>

          {/* Content Editor */}
          <div
            className="rounded-2xl overflow-hidden"
            style={{ background: "#FFF", border: "1px solid rgba(0,0,0,0.05)", boxShadow: "0 1px 12px rgba(0,0,0,0.05)" }}
          >
            {/* Toolbar */}
            <div
              className="px-4 py-3 flex items-center gap-1 flex-wrap"
              style={{ background: "#F9FAFB", borderBottom: "1px solid #F3F4F6" }}
            >
              {FORMATTING_TOOLS.map(({ icon: Icon, label }) => (
                <button
                  key={label}
                  title={label}
                  className="p-2 rounded-lg hover:bg-white hover:shadow-sm transition-all"
                  style={{ color: "#6B7280" }}
                >
                  <Icon size={15} />
                </button>
              ))}
              <div className="w-px h-5 mx-1" style={{ background: "#E5E7EB" }} />
              <button
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg hover:bg-white transition-all"
                style={{ color: "#6B7280", fontSize: "0.78rem", fontWeight: 500 }}
              >
                <Image size={13} /> Insert Image
              </button>
            </div>

            {/* Content Area */}
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Start writing your post content here…"
              className="w-full outline-none p-6 resize-none"
              style={{
                minHeight: 380,
                color: "#374151",
                fontSize: "0.925rem",
                lineHeight: 1.75,
                background: "transparent",
                fontFamily: "'Inter', sans-serif",
              }}
            />

            <div
              className="px-6 py-3 flex items-center justify-between"
              style={{ borderTop: "1px solid #F3F4F6", background: "#F9FAFB" }}
            >
              <span style={{ color: "#9CA3AF", fontSize: "0.75rem" }}>
                {content.split(/\s+/).filter(Boolean).length} words · {content.length} characters
              </span>
              <span style={{ color: "#9CA3AF", fontSize: "0.75rem" }}>
                ~{Math.ceil(content.split(/\s+/).filter(Boolean).length / 200)} min read
              </span>
            </div>
          </div>
        </div>

        {/* Sidebar Settings */}
        <div className="space-y-4">
          {/* Publish Settings */}
          <div
            className="rounded-2xl p-5"
            style={{ background: "#FFF", border: "1px solid rgba(0,0,0,0.05)", boxShadow: "0 1px 12px rgba(0,0,0,0.05)" }}
          >
            <h3 style={{ color: "#111827", fontSize: "0.9rem", fontWeight: 700, marginBottom: 16 }}>
              Publication Settings
            </h3>

            {/* Status */}
            <div className="mb-4">
              <label style={{ color: "#6B7280", fontSize: "0.78rem", fontWeight: 600, display: "block", marginBottom: 6 }}>
                STATUS
              </label>
              <div className="relative">
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                  className="w-full appearance-none pl-4 pr-8 py-2.5 rounded-xl outline-none"
                  style={{
                    background: "#F9FAFB",
                    border: "1px solid #E5E7EB",
                    color: "#374151",
                    fontSize: "0.875rem",
                  }}
                >
                  <option value="draft">Draft</option>
                  <option value="published">Published</option>
                  <option value="scheduled">Scheduled</option>
                </select>
                <ChevronDown size={13} className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: "#9CA3AF" }} />
              </div>
            </div>

            {/* Schedule Date */}
            {status === "scheduled" && (
              <div className="mb-4">
                <label style={{ color: "#6B7280", fontSize: "0.78rem", fontWeight: 600, display: "block", marginBottom: 6 }}>
                  PUBLISH DATE
                </label>
                <div className="relative">
                  <Calendar size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: "#9CA3AF" }} />
                  <input
                    type="datetime-local"
                    className="w-full pl-9 pr-4 py-2.5 rounded-xl outline-none"
                    style={{ background: "#F9FAFB", border: "1px solid #E5E7EB", color: "#374151", fontSize: "0.875rem" }}
                  />
                </div>
              </div>
            )}

            {/* Featured */}
            <div
              className="flex items-center justify-between p-3 rounded-xl cursor-pointer"
              style={{ background: featured ? "#FFF9EE" : "#F9FAFB", border: `1px solid ${featured ? "#C9A84C40" : "#E5E7EB"}` }}
              onClick={() => setFeatured(!featured)}
            >
              <div className="flex items-center gap-2.5">
                <Star size={15} style={{ color: featured ? "#C9A84C" : "#9CA3AF", fill: featured ? "#C9A84C" : "none" }} />
                <span style={{ color: "#374151", fontSize: "0.84rem", fontWeight: 500 }}>Featured Post</span>
              </div>
              <div
                className="w-10 h-5.5 rounded-full transition-all relative"
                style={{
                  background: featured ? "linear-gradient(135deg, #C9A84C, #A07830)" : "#E5E7EB",
                  width: 38,
                  height: 22,
                }}
              >
                <div
                  className="absolute top-0.5 rounded-full bg-white shadow transition-all"
                  style={{ width: 18, height: 18, left: featured ? 18 : 2 }}
                />
              </div>
            </div>

            <div className="flex gap-2 mt-4">
              <button
                onClick={() => handleSave()}
                className="flex-1 py-2.5 rounded-xl transition-colors"
                style={{ background: "#F3F4F6", color: "#374151", fontWeight: 600, fontSize: "0.84rem", border: "1px solid #E5E7EB" }}
                disabled={saving}
              >
                Save Draft
              </button>
              <button
                onClick={() => handleSave("published")}
                className="flex-1 py-2.5 rounded-xl text-white transition-all"
                style={{ background: "linear-gradient(135deg, #1B4332, #0D2B1F)", fontWeight: 600, fontSize: "0.84rem" }}
                disabled={saving}
              >
                {saving ? "…" : "Publish"}
              </button>
            </div>
          </div>

          {/* Category */}
          <div
            className="rounded-2xl p-5"
            style={{ background: "#FFF", border: "1px solid rgba(0,0,0,0.05)", boxShadow: "0 1px 12px rgba(0,0,0,0.05)" }}
          >
            <h3 style={{ color: "#111827", fontSize: "0.9rem", fontWeight: 700, marginBottom: 12 }}>
              Category
            </h3>
            <div className="grid grid-cols-2 gap-2">
              {["History", "Events", "News", "Articles", "Gallery", "Announcements"].map((cat) => (
                <button
                  key={cat}
                  onClick={() => setCategory(cat)}
                  className="py-2 px-3 rounded-xl text-left transition-all"
                  style={{
                    background: category === cat ? "linear-gradient(135deg, #1B4332, #2D6A4F)" : "#F9FAFB",
                    color: category === cat ? "white" : "#374151",
                    fontSize: "0.78rem",
                    fontWeight: category === cat ? 600 : 400,
                    border: `1px solid ${category === cat ? "transparent" : "#E5E7EB"}`,
                  }}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {/* Tags */}
          <div
            className="rounded-2xl p-5"
            style={{ background: "#FFF", border: "1px solid rgba(0,0,0,0.05)", boxShadow: "0 1px 12px rgba(0,0,0,0.05)" }}
          >
            <h3 style={{ color: "#111827", fontSize: "0.9rem", fontWeight: 700, marginBottom: 12 }}>
              Tags
            </h3>
            <div className="flex flex-wrap gap-2 mb-3">
              {tags.map((tag) => (
                <span
                  key={tag}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-full"
                  style={{ background: "#F0FDF4", color: "#1B4332", fontSize: "0.75rem", fontWeight: 600 }}
                >
                  {tag}
                  <button onClick={() => removeTag(tag)}>
                    <X size={11} />
                  </button>
                </span>
              ))}
            </div>
            <div className="flex gap-2">
              <input
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addTag())}
                placeholder="Add a tag…"
                className="flex-1 px-3 py-2 rounded-xl outline-none"
                style={{ background: "#F9FAFB", border: "1px solid #E5E7EB", color: "#374151", fontSize: "0.82rem" }}
              />
              <button
                onClick={addTag}
                className="px-3 py-2 rounded-xl"
                style={{ background: "#1B4332", color: "white", fontSize: "0.82rem", fontWeight: 600 }}
              >
                Add
              </button>
            </div>
          </div>

          {/* Featured Image */}
          <div
            className="rounded-2xl p-5"
            style={{ background: "#FFF", border: "1px solid rgba(0,0,0,0.05)", boxShadow: "0 1px 12px rgba(0,0,0,0.05)" }}
          >
            <h3 style={{ color: "#111827", fontSize: "0.9rem", fontWeight: 700, marginBottom: 12 }}>
              Featured Image
            </h3>
            {thumbnail ? (
              <div className="relative group">
                <img
                  src={thumbnail}
                  alt=""
                  className="w-full rounded-xl object-cover"
                  style={{ height: 140 }}
                />
                <div className="absolute inset-0 rounded-xl bg-black/0 group-hover:bg-black/40 transition-all flex items-center justify-center gap-3 opacity-0 group-hover:opacity-100">
                  <button
                    onClick={() => setThumbnail(null)}
                    className="px-3 py-2 rounded-xl bg-white text-red-500 transition-all"
                    style={{ fontSize: "0.78rem", fontWeight: 600 }}
                  >
                    Remove
                  </button>
                </div>
              </div>
            ) : (
              <button
                className="w-full rounded-xl flex flex-col items-center justify-center py-8 gap-3 transition-all hover:bg-green-50/50"
                style={{
                  border: "2px dashed #D1D5DB",
                  color: "#9CA3AF",
                }}
                onMouseEnter={(e) => (e.currentTarget.style.borderColor = "#1B4332")}
                onMouseLeave={(e) => (e.currentTarget.style.borderColor = "#D1D5DB")}
                onClick={() => setThumbnail("https://images.unsplash.com/photo-1774302753274-2ae387cedd1b?w=400&h=200&fit=crop")}
              >
                <Upload size={24} style={{ opacity: 0.5 }} />
                <div>
                  <p style={{ fontSize: "0.82rem", fontWeight: 600, color: "#6B7280" }}>Click to upload image</p>
                  <p style={{ fontSize: "0.72rem", color: "#9CA3AF" }}>PNG, JPG up to 10MB</p>
                </div>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
