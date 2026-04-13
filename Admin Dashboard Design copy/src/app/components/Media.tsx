import { useState, useRef } from "react";
import {
  Upload,
  Search,
  Grid,
  List,
  Trash2,
  Download,
  Copy,
  Eye,
  Image,
  FileVideo,
  FileText,
  Filter,
  X,
  Check,
  MoreVertical,
  FolderOpen,
} from "lucide-react";

const INITIAL_MEDIA = [
  {
    id: 1,
    name: "underground-cemetery-main.jpg",
    type: "image",
    size: "2.4 MB",
    dimensions: "1920×1080",
    url: "https://images.unsplash.com/photo-1768245076236-dbdf5055bba8?w=400&h=280&fit=crop",
    date: "Apr 10, 2024",
    used: 3,
  },
  {
    id: 2,
    name: "heritage-museum-interior.jpg",
    type: "image",
    size: "1.8 MB",
    dimensions: "1600×900",
    url: "https://images.unsplash.com/photo-1774302753274-2ae387cedd1b?w=400&h=280&fit=crop",
    date: "Apr 8, 2024",
    used: 1,
  },
  {
    id: 3,
    name: "colonial-church-nagcarlan.jpg",
    type: "image",
    size: "3.1 MB",
    dimensions: "2560×1440",
    url: "https://images.unsplash.com/photo-1753934810732-d30b2777e869?w=400&h=280&fit=crop",
    date: "Apr 5, 2024",
    used: 2,
  },
  {
    id: 4,
    name: "museum-artifacts-display.jpg",
    type: "image",
    size: "1.5 MB",
    dimensions: "1280×720",
    url: "https://images.unsplash.com/photo-1770910196472-6936b9639687?w=400&h=280&fit=crop",
    date: "Apr 3, 2024",
    used: 0,
  },
  {
    id: 5,
    name: "historical-landmark.jpg",
    type: "image",
    size: "2.2 MB",
    dimensions: "1920×1280",
    url: "https://images.unsplash.com/photo-1701937750716-6b5174d22615?w=400&h=280&fit=crop",
    date: "Mar 28, 2024",
    used: 1,
  },
  {
    id: 6,
    name: "cemetery-garden-path.jpg",
    type: "image",
    size: "1.9 MB",
    dimensions: "1600×1067",
    url: "https://images.unsplash.com/photo-1769242448963-6f3ac5cbcf01?w=400&h=280&fit=crop",
    date: "Mar 25, 2024",
    used: 4,
  },
  {
    id: 7,
    name: "heritage-week-promo.mp4",
    type: "video",
    size: "24.8 MB",
    dimensions: "1920×1080",
    url: null,
    date: "Mar 20, 2024",
    used: 1,
  },
  {
    id: 8,
    name: "visitor-guide-2024.pdf",
    type: "document",
    size: "3.2 MB",
    dimensions: "—",
    url: null,
    date: "Mar 15, 2024",
    used: 2,
  },
  {
    id: 9,
    name: "nagcarlan-map.jpg",
    type: "image",
    size: "856 KB",
    dimensions: "800×600",
    url: "https://images.unsplash.com/photo-1768245076236-dbdf5055bba8?w=400&h=280&fit=crop&q=40",
    date: "Mar 10, 2024",
    used: 5,
  },
];

const TYPE_ICONS = {
  image: Image,
  video: FileVideo,
  document: FileText,
};

const TYPE_COLORS = {
  image: { bg: "#EFF6FF", color: "#3B82F6" },
  video: { bg: "#FEF3C7", color: "#D97706" },
  document: { bg: "#F3E8FF", color: "#9333EA" },
};

export function Media() {
  const [media, setMedia] = useState(INITIAL_MEDIA);
  const [view, setView] = useState<"grid" | "list">("grid");
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const [selected, setSelected] = useState<number[]>([]);
  const [preview, setPreview] = useState<(typeof INITIAL_MEDIA)[0] | null>(null);
  const [openMenu, setOpenMenu] = useState<number | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const filtered = media.filter((m) => {
    const matchSearch = m.name.toLowerCase().includes(search.toLowerCase());
    const matchType = filter === "all" || m.type === filter;
    return matchSearch && matchType;
  });

  const toggleSelect = (id: number) => {
    setSelected((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]);
  };

  const handleDelete = (id: number) => {
    setMedia((prev) => prev.filter((m) => m.id !== id));
    setSelected((prev) => prev.filter((x) => x !== id));
    setOpenMenu(null);
  };

  const handleBulkDelete = () => {
    setMedia((prev) => prev.filter((m) => !selected.includes(m.id)));
    setSelected([]);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    // Mock: add placeholder items
    const newItems = Array.from(e.dataTransfer.files).map((f, i) => ({
      id: Date.now() + i,
      name: f.name,
      type: f.type.startsWith("image") ? "image" : f.type.startsWith("video") ? "video" : "document",
      size: `${(f.size / (1024 * 1024)).toFixed(1)} MB`,
      dimensions: "—",
      url: f.type.startsWith("image") ? URL.createObjectURL(f) : null,
      date: "Apr 13, 2024",
      used: 0,
    }));
    setMedia((prev) => [...newItems, ...prev]);
  };

  const totalSize = "14.7 GB";
  const imageCount = media.filter((m) => m.type === "image").length;
  const videoCount = media.filter((m) => m.type === "video").length;
  const docCount = media.filter((m) => m.type === "document").length;

  return (
    <div className="space-y-5">
      {/* Stats Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: "Total Files", value: media.length, icon: FolderOpen, color: "#1B4332" },
          { label: "Images", value: imageCount, icon: Image, color: "#3B82F6" },
          { label: "Videos", value: videoCount, icon: FileVideo, color: "#D97706" },
          { label: "Documents", value: docCount, icon: FileText, color: "#9333EA" },
        ].map(({ label, value, icon: Icon, color }) => (
          <div
            key={label}
            className="rounded-2xl p-4 flex items-center gap-3"
            style={{ background: "#FFF", border: "1px solid rgba(0,0,0,0.05)", boxShadow: "0 1px 8px rgba(0,0,0,0.05)" }}
          >
            <div
              className="rounded-xl flex items-center justify-center"
              style={{ width: 40, height: 40, background: `${color}15` }}
            >
              <Icon size={18} style={{ color }} />
            </div>
            <div>
              <p style={{ color: "#111827", fontSize: "1.25rem", fontWeight: 700, lineHeight: 1 }}>{value}</p>
              <p style={{ color: "#9CA3AF", fontSize: "0.75rem", marginTop: 2 }}>{label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Upload Zone */}
      <div
        className={`rounded-2xl p-8 border-2 border-dashed text-center cursor-pointer transition-all ${dragOver ? "bg-green-50" : "hover:bg-gray-50/50"}`}
        style={{
          borderColor: dragOver ? "#1B4332" : "#D1D5DB",
          background: dragOver ? "#F0FDF4" : "#FFF",
        }}
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
      >
        <input ref={fileInputRef} type="file" multiple className="hidden" accept="image/*,video/*,.pdf" />
        <div
          className="inline-flex items-center justify-center w-14 h-14 rounded-2xl mb-4"
          style={{ background: dragOver ? "#1B4332" : "#F3F4F6" }}
        >
          <Upload size={24} style={{ color: dragOver ? "white" : "#9CA3AF" }} />
        </div>
        <p style={{ color: "#374151", fontWeight: 600, marginBottom: 4 }}>
          {dragOver ? "Drop files to upload" : "Drag & drop files here"}
        </p>
        <p style={{ color: "#9CA3AF", fontSize: "0.82rem" }}>
          or click to browse · PNG, JPG, MP4, PDF supported · Max 50MB per file
        </p>
      </div>

      {/* Bulk Action Bar */}
      {selected.length > 0 && (
        <div
          className="rounded-2xl px-5 py-3.5 flex items-center justify-between"
          style={{ background: "linear-gradient(135deg, #0D2B1F, #1B4332)", border: "1px solid rgba(201,168,76,0.2)" }}
        >
          <span style={{ color: "white", fontSize: "0.875rem", fontWeight: 600 }}>
            {selected.length} file{selected.length > 1 ? "s" : ""} selected
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setSelected([])}
              className="px-4 py-2 rounded-xl hover:bg-white/10 transition-colors"
              style={{ color: "rgba(255,255,255,0.7)", fontSize: "0.82rem" }}
            >
              Cancel
            </button>
            <button
              onClick={handleBulkDelete}
              className="flex items-center gap-2 px-4 py-2 rounded-xl transition-colors"
              style={{ background: "#EF4444", color: "white", fontSize: "0.82rem", fontWeight: 600 }}
            >
              <Trash2 size={14} /> Delete Selected
            </button>
          </div>
        </div>
      )}

      {/* Controls */}
      <div
        className="rounded-2xl p-4 flex flex-col sm:flex-row gap-3 items-stretch sm:items-center"
        style={{ background: "#FFF", border: "1px solid rgba(0,0,0,0.05)", boxShadow: "0 1px 8px rgba(0,0,0,0.05)" }}
      >
        <div className="flex items-center gap-2 flex-1 px-4 py-2.5 rounded-xl" style={{ background: "#F9FAFB", border: "1px solid #E5E7EB" }}>
          <Search size={15} style={{ color: "#9CA3AF" }} />
          <input
            type="text"
            placeholder="Search media files…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="bg-transparent outline-none flex-1"
            style={{ color: "#374151", fontSize: "0.875rem" }}
          />
          {search && <button onClick={() => setSearch("")}><X size={14} style={{ color: "#9CA3AF" }} /></button>}
        </div>

        {/* Type Filter */}
        <div className="flex items-center gap-1 p-1 rounded-xl" style={{ background: "#F3F4F6" }}>
          {["all", "image", "video", "document"].map((t) => (
            <button
              key={t}
              onClick={() => setFilter(t)}
              className="px-3 py-2 rounded-lg capitalize transition-all"
              style={{
                background: filter === t ? "#1B4332" : "transparent",
                color: filter === t ? "white" : "#6B7280",
                fontSize: "0.78rem",
                fontWeight: 600,
              }}
            >
              {t}
            </button>
          ))}
        </div>

        {/* View Toggle */}
        <div className="flex items-center gap-1 p-1 rounded-xl" style={{ background: "#F3F4F6" }}>
          <button
            onClick={() => setView("grid")}
            className="p-2 rounded-lg transition-all"
            style={{ background: view === "grid" ? "white" : "transparent", color: view === "grid" ? "#1B4332" : "#9CA3AF", boxShadow: view === "grid" ? "0 1px 4px rgba(0,0,0,0.1)" : "none" }}
          >
            <Grid size={15} />
          </button>
          <button
            onClick={() => setView("list")}
            className="p-2 rounded-lg transition-all"
            style={{ background: view === "list" ? "white" : "transparent", color: view === "list" ? "#1B4332" : "#9CA3AF", boxShadow: view === "list" ? "0 1px 4px rgba(0,0,0,0.1)" : "none" }}
          >
            <List size={15} />
          </button>
        </div>
      </div>

      {/* Media Grid */}
      {view === "grid" ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {filtered.map((item) => {
            const isSelected = selected.includes(item.id);
            const TypeIcon = TYPE_ICONS[item.type as keyof typeof TYPE_ICONS];
            const typeColor = TYPE_COLORS[item.type as keyof typeof TYPE_COLORS];

            return (
              <div
                key={item.id}
                className="group relative rounded-2xl overflow-hidden cursor-pointer transition-all hover:-translate-y-0.5"
                style={{
                  background: "#FFF",
                  border: `2px solid ${isSelected ? "#1B4332" : "rgba(0,0,0,0.06)"}`,
                  boxShadow: isSelected ? "0 0 0 3px rgba(27,67,50,0.15)" : "0 2px 8px rgba(0,0,0,0.06)",
                }}
                onClick={() => toggleSelect(item.id)}
              >
                {/* Thumbnail */}
                <div className="relative" style={{ paddingBottom: "65%", background: "#F3F4F6" }}>
                  {item.url ? (
                    <img
                      src={item.url}
                      alt={item.name}
                      className="absolute inset-0 w-full h-full object-cover"
                    />
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div
                        className="rounded-2xl flex items-center justify-center"
                        style={{ width: 52, height: 52, background: typeColor.bg }}
                      >
                        <TypeIcon size={24} style={{ color: typeColor.color }} />
                      </div>
                    </div>
                  )}

                  {/* Overlay */}
                  <div className={`absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-all flex items-center justify-center gap-2 ${isSelected ? "bg-black/20" : ""}`}>
                    {isSelected && (
                      <div
                        className="w-6 h-6 rounded-full flex items-center justify-center absolute top-2 left-2"
                        style={{ background: "#1B4332" }}
                      >
                        <Check size={12} color="white" />
                      </div>
                    )}
                    <div className={`flex gap-2 transition-all ${isSelected ? "opacity-100" : "opacity-0 group-hover:opacity-100"}`}>
                      <button
                        onClick={(e) => { e.stopPropagation(); setPreview(item); }}
                        className="p-2 rounded-xl bg-white/90 hover:bg-white transition-colors"
                        title="Preview"
                      >
                        <Eye size={14} style={{ color: "#374151" }} />
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); handleDelete(item.id); }}
                        className="p-2 rounded-xl bg-white/90 hover:bg-red-50 transition-colors"
                        title="Delete"
                      >
                        <Trash2 size={14} style={{ color: "#EF4444" }} />
                      </button>
                    </div>
                  </div>

                  {/* Type Badge */}
                  <div
                    className="absolute bottom-2 right-2 px-2 py-1 rounded-lg"
                    style={{ background: typeColor.bg, fontSize: "0.65rem", color: typeColor.color, fontWeight: 700, textTransform: "uppercase" }}
                  >
                    {item.type}
                  </div>
                </div>

                {/* Info */}
                <div className="p-3">
                  <p
                    className="truncate"
                    style={{ color: "#111827", fontSize: "0.78rem", fontWeight: 600, marginBottom: 2 }}
                  >
                    {item.name}
                  </p>
                  <p style={{ color: "#9CA3AF", fontSize: "0.7rem" }}>{item.size} · {item.date}</p>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* List View */
        <div
          className="rounded-2xl overflow-hidden"
          style={{ background: "#FFF", border: "1px solid rgba(0,0,0,0.05)", boxShadow: "0 1px 8px rgba(0,0,0,0.05)" }}
        >
          <div
            className="px-5 py-3 grid gap-4"
            style={{
              gridTemplateColumns: "32px 2fr 100px 100px 80px 80px 100px",
              background: "#F9FAFB",
              borderBottom: "1px solid #F3F4F6",
              fontSize: "0.72rem",
              fontWeight: 700,
              color: "#9CA3AF",
              letterSpacing: "0.06em",
              textTransform: "uppercase",
            }}
          >
            <span />
            <span>File Name</span>
            <span>Type</span>
            <span>Size</span>
            <span>Dimensions</span>
            <span>Used</span>
            <span className="text-right">Actions</span>
          </div>

          <div className="divide-y" style={{ borderColor: "#F9FAFB" }}>
            {filtered.map((item) => {
              const TypeIcon = TYPE_ICONS[item.type as keyof typeof TYPE_ICONS];
              const typeColor = TYPE_COLORS[item.type as keyof typeof TYPE_COLORS];
              const isSelected = selected.includes(item.id);

              return (
                <div
                  key={item.id}
                  className="px-5 py-3.5 grid gap-4 hover:bg-gray-50/60 transition-colors items-center"
                  style={{ gridTemplateColumns: "32px 2fr 100px 100px 80px 80px 100px" }}
                >
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => toggleSelect(item.id)}
                    className="rounded"
                    style={{ accentColor: "#1B4332", width: 16, height: 16 }}
                  />
                  <div className="flex items-center gap-3 min-w-0">
                    {item.url ? (
                      <img src={item.url} alt="" className="rounded-lg object-cover shrink-0" style={{ width: 40, height: 32 }} />
                    ) : (
                      <div
                        className="rounded-lg flex items-center justify-center shrink-0"
                        style={{ width: 40, height: 32, background: typeColor.bg }}
                      >
                        <TypeIcon size={16} style={{ color: typeColor.color }} />
                      </div>
                    )}
                    <span className="truncate" style={{ color: "#111827", fontSize: "0.82rem", fontWeight: 500 }}>{item.name}</span>
                  </div>
                  <span
                    className="px-2 py-1 rounded-lg capitalize"
                    style={{ background: typeColor.bg, color: typeColor.color, fontSize: "0.72rem", fontWeight: 700, width: "fit-content" }}
                  >
                    {item.type}
                  </span>
                  <span style={{ color: "#6B7280", fontSize: "0.82rem" }}>{item.size}</span>
                  <span style={{ color: "#6B7280", fontSize: "0.82rem" }}>{item.dimensions}</span>
                  <span style={{ color: item.used > 0 ? "#059669" : "#9CA3AF", fontSize: "0.82rem", fontWeight: 600 }}>
                    {item.used > 0 ? `${item.used}×` : "—"}
                  </span>
                  <div className="flex items-center justify-end gap-1">
                    <button
                      onClick={() => setPreview(item)}
                      className="p-2 rounded-lg hover:bg-blue-50 transition-colors"
                    >
                      <Eye size={14} style={{ color: "#3B82F6" }} />
                    </button>
                    <button
                      className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
                    >
                      <Copy size={14} style={{ color: "#6B7280" }} />
                    </button>
                    <button
                      onClick={() => handleDelete(item.id)}
                      className="p-2 rounded-lg hover:bg-red-50 transition-colors"
                    >
                      <Trash2 size={14} style={{ color: "#EF4444" }} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Preview Modal */}
      {preview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setPreview(null)} />
          <div
            className="relative w-full max-w-2xl rounded-2xl overflow-hidden shadow-2xl"
            style={{ background: "#FFF" }}
          >
            <div
              className="flex items-center justify-between px-6 py-4"
              style={{ borderBottom: "1px solid #F3F4F6" }}
            >
              <div>
                <p style={{ color: "#111827", fontWeight: 700, fontSize: "0.95rem" }}>{preview.name}</p>
                <p style={{ color: "#9CA3AF", fontSize: "0.75rem" }}>{preview.size} · {preview.dimensions} · {preview.date}</p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  className="flex items-center gap-2 px-3 py-2 rounded-xl hover:bg-gray-50 transition-colors"
                  style={{ color: "#6B7280", fontSize: "0.82rem", border: "1px solid #E5E7EB" }}
                >
                  <Download size={14} /> Download
                </button>
                <button
                  onClick={() => setPreview(null)}
                  className="p-2 rounded-xl hover:bg-gray-100 transition-colors"
                >
                  <X size={18} style={{ color: "#6B7280" }} />
                </button>
              </div>
            </div>

            {preview.url ? (
              <img src={preview.url.replace("w=400&h=280", "w=800&h=500")} alt={preview.name} className="w-full object-cover" style={{ maxHeight: 420 }} />
            ) : (
              <div
                className="flex items-center justify-center"
                style={{ height: 280, background: "#F3F4F6" }}
              >
                <div className="text-center">
                  {(() => {
                    const TC = TYPE_ICONS[preview.type as keyof typeof TYPE_ICONS];
                    const tc = TYPE_COLORS[preview.type as keyof typeof TYPE_COLORS];
                    return (
                      <>
                        <div className="inline-flex rounded-2xl p-5 mb-3" style={{ background: tc.bg }}>
                          <TC size={40} style={{ color: tc.color }} />
                        </div>
                        <p style={{ color: "#6B7280", fontSize: "0.875rem" }}>No preview available</p>
                      </>
                    );
                  })()}
                </div>
              </div>
            )}

            <div
              className="px-6 py-4 flex items-center justify-between"
              style={{ borderTop: "1px solid #F3F4F6", background: "#F9FAFB" }}
            >
              <div className="flex items-center gap-3">
                <span
                  className="px-3 py-1 rounded-full"
                  style={{
                    background: TYPE_COLORS[preview.type as keyof typeof TYPE_COLORS].bg,
                    color: TYPE_COLORS[preview.type as keyof typeof TYPE_COLORS].color,
                    fontSize: "0.75rem",
                    fontWeight: 700,
                    textTransform: "uppercase",
                  }}
                >
                  {preview.type}
                </span>
                <span style={{ color: "#9CA3AF", fontSize: "0.78rem" }}>
                  Used in {preview.used} post{preview.used !== 1 ? "s" : ""}
                </span>
              </div>
              <button
                className="flex items-center gap-2 px-4 py-2 rounded-xl text-white"
                style={{ background: "linear-gradient(135deg, #1B4332, #0D2B1F)", fontSize: "0.82rem", fontWeight: 600 }}
              >
                <Copy size={13} /> Copy URL
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
