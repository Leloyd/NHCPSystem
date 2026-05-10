import { useState, useRef } from "react";
import {
  Star,
  BookOpen,
  BookHeart,
  Upload,
  X,
  CheckCircle2,
  ChevronRight,
  ImageIcon,
  MapPin,
  Globe,
  Paperclip,
} from "lucide-react";
import { toast } from "sonner";

// ─── Shared Section Title ────────────────────────────────────────────
function SectionTitle({
  eyebrow,
  title,
  subtitle,
}: {
  eyebrow: string;
  title: string;
  subtitle: string;
}) {
  return (
    <div className="text-center max-w-2xl mx-auto mb-14">
      <span
        className="inline-block text-[#C5973A] text-xs uppercase tracking-widest mb-3"
        style={{ fontFamily: "'Inter', sans-serif", fontWeight: 600 }}
      >
        {eyebrow}
      </span>
      <h2
        className="text-[#1E3A5F] mb-4"
        style={{
          fontFamily: "'Playfair Display', serif",
          fontWeight: 700,
          fontSize: "clamp(1.6rem, 3.5vw, 2.4rem)",
          lineHeight: 1.25,
        }}
      >
        {title}
      </h2>
      <p
        className="text-[#6B7280]"
        style={{ fontFamily: "'Inter', sans-serif", fontSize: "0.97rem", lineHeight: 1.75 }}
      >
        {subtitle}
      </p>
    </div>
  );
}

// ─── Star Rating ─────────────────────────────────────────────────────
function StarRating({
  value,
  onChange,
}: {
  value: number;
  onChange: (val: number) => void;
}) {
  const [hover, setHover] = useState(0);
  return (
    <div className="flex gap-1.5">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          onMouseEnter={() => setHover(star)}
          onMouseLeave={() => setHover(0)}
          onClick={() => onChange(star)}
          className="transition-transform hover:scale-110 active:scale-95"
        >
          <Star
            size={28}
            className={`transition-colors ${
              star <= (hover || value) ? "fill-[#C5973A] text-[#C5973A]" : "text-[#D1C5B8]"
            }`}
          />
        </button>
      ))}
    </div>
  );
}

// ─── Visitor Feedback Modal ───────────────────────────────────────────
function VisitorFeedbackModal({ onClose }: { onClose: () => void }) {
  const [rating, setRating] = useState(0);
  const [visitType, setVisitType] = useState<"on-site" | "website">("on-site");
  const [comment, setComment] = useState("");
  const [name, setName] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (rating === 0) {
      toast.error("Please select a rating before submitting.");
      return;
    }
    setSubmitted(true);
    toast.success("Thank you! Your feedback has been recorded.");
  };

  if (submitted) {
    return (
      <div className="flex flex-col items-center justify-center py-10 text-center">
        <div className="w-16 h-16 rounded-full bg-[#E8F5E9] flex items-center justify-center mb-4">
          <CheckCircle2 size={32} className="text-green-600" />
        </div>
        <h3
          className="text-[#1E3A5F] mb-2"
          style={{ fontFamily: "'Playfair Display', serif", fontWeight: 600, fontSize: "1.25rem" }}
        >
          Feedback Submitted!
        </h3>
        <p className="text-[#6B7280] text-sm mb-6" style={{ fontFamily: "'Inter', sans-serif" }}>
          Thank you for sharing your experience. Your feedback helps us improve.
        </p>
        <button
          onClick={onClose}
          className="px-6 py-2.5 rounded-lg text-white text-sm"
          style={{ background: "linear-gradient(135deg, #1E3A5F, #2A5A8A)", fontFamily: "'Inter', sans-serif", fontWeight: 500 }}
        >
          Close
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* Visit Type */}
      <div>
        <label className="block text-[#374151] text-sm mb-2.5" style={{ fontFamily: "'Inter', sans-serif", fontWeight: 500 }}>
          How did you visit us?
        </label>
        <div className="flex gap-3">
          {(["on-site", "website"] as const).map((type) => (
            <button
              key={type}
              type="button"
              onClick={() => setVisitType(type)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm border transition-all ${
                visitType === type
                  ? "border-[#1E3A5F] bg-[#1E3A5F] text-white"
                  : "border-[#E8E0D5] text-[#6B7280] hover:border-[#1E3A5F]/50"
              }`}
              style={{ fontFamily: "'Inter', sans-serif", fontWeight: 500 }}
            >
              {type === "on-site" ? <MapPin size={15} /> : <Globe size={15} />}
              {type === "on-site" ? "On-Site Visit" : "Website Visit"}
            </button>
          ))}
        </div>
      </div>

      {/* Rating */}
      <div>
        <label className="block text-[#374151] text-sm mb-2.5" style={{ fontFamily: "'Inter', sans-serif", fontWeight: 500 }}>
          Overall Experience
        </label>
        <StarRating value={rating} onChange={setRating} />
        {rating > 0 && (
          <p className="text-[#C5973A] text-xs mt-1.5" style={{ fontFamily: "'Inter', sans-serif" }}>
            {["", "Poor", "Fair", "Good", "Very Good", "Excellent"][rating]}
          </p>
        )}
      </div>

      {/* Name */}
      <div>
        <label className="block text-[#374151] text-sm mb-2" style={{ fontFamily: "'Inter', sans-serif", fontWeight: 500 }}>
          Your Name <span className="text-[#9CA3AF] font-normal">(optional)</span>
        </label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Enter your name"
          className="w-full px-4 py-3 rounded-xl border border-[#E8E0D5] bg-[#F9F7F4] text-[#374151] text-sm placeholder-[#9CA3AF] focus:outline-none focus:border-[#1E3A5F] focus:ring-2 focus:ring-[#1E3A5F]/10 transition-all"
          style={{ fontFamily: "'Inter', sans-serif" }}
        />
      </div>

      {/* Comment */}
      <div>
        <label className="block text-[#374151] text-sm mb-2" style={{ fontFamily: "'Inter', sans-serif", fontWeight: 500 }}>
          Comments &amp; Suggestions
        </label>
        <textarea
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          placeholder="Share your thoughts, suggestions, or experience..."
          rows={4}
          className="w-full px-4 py-3 rounded-xl border border-[#E8E0D5] bg-[#F9F7F4] text-[#374151] text-sm placeholder-[#9CA3AF] focus:outline-none focus:border-[#1E3A5F] focus:ring-2 focus:ring-[#1E3A5F]/10 transition-all resize-none"
          style={{ fontFamily: "'Inter', sans-serif" }}
        />
      </div>

      <button
        type="submit"
        className="w-full py-3 rounded-xl text-white text-sm transition-all hover:opacity-90 active:scale-[0.98]"
        style={{ background: "linear-gradient(135deg, #1E3A5F, #2A5A8A)", fontFamily: "'Inter', sans-serif", fontWeight: 500 }}
      >
        Submit Feedback
      </button>
    </form>
  );
}

// ─── Teacher Corner Modal ─────────────────────────────────────────────
function TeacherCornerModal({ onClose }: { onClose: () => void }) {
  const [files, setFiles] = useState<File[]>([]);
  const [dragOver, setDragOver] = useState(false);
  const [subject, setSubject] = useState("");
  const [gradeLevel, setGradeLevel] = useState("");
  const [description, setDescription] = useState("");
  const [teacherName, setTeacherName] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const acceptedFormats = [".pdf", ".docx", ".pptx", ".ppt", ".doc"];

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const dropped = Array.from(e.dataTransfer.files).filter((f) =>
      acceptedFormats.some((ext) => f.name.toLowerCase().endsWith(ext))
    );
    setFiles((prev) => [...prev, ...dropped]);
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = Array.from(e.target.files || []);
    setFiles((prev) => [...prev, ...selected]);
  };

  const removeFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const getFileIcon = (name: string) => {
    if (name.endsWith(".pdf")) return "📄";
    if (name.endsWith(".docx") || name.endsWith(".doc")) return "📝";
    return "📊";
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (files.length === 0) {
      toast.error("Please upload at least one file.");
      return;
    }
    setSubmitted(true);
    toast.success("Materials submitted for review!");
  };

  if (submitted) {
    return (
      <div className="flex flex-col items-center justify-center py-10 text-center">
        <div className="w-16 h-16 rounded-full bg-[#EEF2FF] flex items-center justify-center mb-4">
          <CheckCircle2 size={32} className="text-[#4F46E5]" />
        </div>
        <h3 className="text-[#1E3A5F] mb-2" style={{ fontFamily: "'Playfair Display', serif", fontWeight: 600, fontSize: "1.25rem" }}>
          Materials Submitted!
        </h3>
        <p className="text-[#6B7280] text-sm mb-6" style={{ fontFamily: "'Inter', sans-serif" }}>
          Your classroom materials are under review. They'll be featured in our resource library soon.
        </p>
        <button onClick={onClose} className="px-6 py-2.5 rounded-lg text-white text-sm" style={{ background: "linear-gradient(135deg, #1E3A5F, #2A5A8A)", fontFamily: "'Inter', sans-serif", fontWeight: 500 }}>
          Close
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* File Drop Zone */}
      <div>
        <label className="block text-[#374151] text-sm mb-2.5" style={{ fontFamily: "'Inter', sans-serif", fontWeight: 500 }}>
          Upload Materials
        </label>
        <div
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`relative border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all ${
            dragOver
              ? "border-[#1E3A5F] bg-[#1E3A5F]/5"
              : "border-[#D1C5B8] hover:border-[#1E3A5F]/50 hover:bg-[#F9F7F4]"
          }`}
        >
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept=".pdf,.docx,.doc,.pptx,.ppt"
            className="hidden"
            onChange={handleFileInput}
          />
          <Upload size={28} className="mx-auto mb-2 text-[#9CA3AF]" />
          <p className="text-[#374151] text-sm" style={{ fontFamily: "'Inter', sans-serif", fontWeight: 500 }}>
            Drop files here or click to browse
          </p>
          <p className="text-[#9CA3AF] text-xs mt-1" style={{ fontFamily: "'Inter', sans-serif" }}>
            Accepted: PDF, DOCX, DOC, PPTX, PPT
          </p>
          {/* Format Badges */}
          <div className="flex justify-center gap-1.5 mt-3 flex-wrap">
            {["PDF", "DOCX", "Slides"].map((fmt) => (
              <span
                key={fmt}
                className="px-2 py-0.5 text-[10px] rounded-md font-medium"
                style={{
                  fontFamily: "'Inter', sans-serif",
                  background: fmt === "PDF" ? "#FEE2E2" : fmt === "DOCX" ? "#DBEAFE" : "#F0FDF4",
                  color: fmt === "PDF" ? "#DC2626" : fmt === "DOCX" ? "#1D4ED8" : "#16A34A",
                }}
              >
                {fmt}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Uploaded Files */}
      {files.length > 0 && (
        <div className="space-y-2">
          {files.map((file, i) => (
            <div key={i} className="flex items-center gap-3 p-3 rounded-xl bg-[#F9F7F4] border border-[#E8E0D5]">
              <span className="text-lg">{getFileIcon(file.name)}</span>
              <div className="flex-1 min-w-0">
                <p className="text-[#374151] text-xs truncate" style={{ fontFamily: "'Inter', sans-serif", fontWeight: 500 }}>{file.name}</p>
                <p className="text-[#9CA3AF] text-[10px]" style={{ fontFamily: "'Inter', sans-serif" }}>{(file.size / 1024).toFixed(0)} KB</p>
              </div>
              <button type="button" onClick={() => removeFile(i)} className="text-[#9CA3AF] hover:text-red-500 transition-colors">
                <X size={15} />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Teacher Name */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-[#374151] text-sm mb-2" style={{ fontFamily: "'Inter', sans-serif", fontWeight: 500 }}>
            Teacher / Educator Name
          </label>
          <input
            type="text"
            value={teacherName}
            onChange={(e) => setTeacherName(e.target.value)}
            required
            placeholder="Your full name"
            className="w-full px-4 py-3 rounded-xl border border-[#E8E0D5] bg-[#F9F7F4] text-[#374151] text-sm placeholder-[#9CA3AF] focus:outline-none focus:border-[#1E3A5F] focus:ring-2 focus:ring-[#1E3A5F]/10 transition-all"
            style={{ fontFamily: "'Inter', sans-serif" }}
          />
        </div>
        <div>
          <label className="block text-[#374151] text-sm mb-2" style={{ fontFamily: "'Inter', sans-serif", fontWeight: 500 }}>
            Grade Level
          </label>
          <select
            value={gradeLevel}
            onChange={(e) => setGradeLevel(e.target.value)}
            required
            className="w-full px-4 py-3 rounded-xl border border-[#E8E0D5] bg-[#F9F7F4] text-[#374151] text-sm focus:outline-none focus:border-[#1E3A5F] focus:ring-2 focus:ring-[#1E3A5F]/10 transition-all"
            style={{ fontFamily: "'Inter', sans-serif" }}
          >
            <option value="">Select grade</option>
            <option>Kindergarten</option>
            <option>Grade 1–3</option>
            <option>Grade 4–6</option>
            <option>Grade 7–10</option>
            <option>Grade 11–12</option>
            <option>College Level</option>
          </select>
        </div>
      </div>

      {/* Subject */}
      <div>
        <label className="block text-[#374151] text-sm mb-2" style={{ fontFamily: "'Inter', sans-serif", fontWeight: 500 }}>
          Subject / Topic
        </label>
        <input
          type="text"
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          required
          placeholder="e.g. Philippine History, Heritage Arts, Cultural Studies"
          className="w-full px-4 py-3 rounded-xl border border-[#E8E0D5] bg-[#F9F7F4] text-[#374151] text-sm placeholder-[#9CA3AF] focus:outline-none focus:border-[#1E3A5F] focus:ring-2 focus:ring-[#1E3A5F]/10 transition-all"
          style={{ fontFamily: "'Inter', sans-serif" }}
        />
      </div>

      {/* Description */}
      <div>
        <label className="block text-[#374151] text-sm mb-2" style={{ fontFamily: "'Inter', sans-serif", fontWeight: 500 }}>
          Material Description
        </label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Briefly describe the content and learning objectives..."
          rows={3}
          className="w-full px-4 py-3 rounded-xl border border-[#E8E0D5] bg-[#F9F7F4] text-[#374151] text-sm placeholder-[#9CA3AF] focus:outline-none focus:border-[#1E3A5F] focus:ring-2 focus:ring-[#1E3A5F]/10 transition-all resize-none"
          style={{ fontFamily: "'Inter', sans-serif" }}
        />
      </div>

      <button
        type="submit"
        className="w-full py-3 rounded-xl text-white text-sm transition-all hover:opacity-90 active:scale-[0.98]"
        style={{ background: "linear-gradient(135deg, #1E3A5F, #2A5A8A)", fontFamily: "'Inter', sans-serif", fontWeight: 500 }}
      >
        Submit Materials
      </button>
    </form>
  );
}

// ─── Stories Submit Modal ─────────────────────────────────────────────
function StoriesSubmitModal({ onClose }: { onClose: () => void }) {
  const [title, setTitle] = useState("");
  const [story, setStory] = useState("");
  const [authorName, setAuthorName] = useState("");
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [category, setCategory] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const photoInputRef = useRef<HTMLInputElement>(null);

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setPhotoFile(file);
      const reader = new FileReader();
      reader.onload = (ev) => setPhotoPreview(ev.target?.result as string);
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
    toast.success("Your story has been shared with the community!");
  };

  if (submitted) {
    return (
      <div className="flex flex-col items-center justify-center py-10 text-center">
        <div className="w-16 h-16 rounded-full bg-[#FFF7ED] flex items-center justify-center mb-4">
          <CheckCircle2 size={32} className="text-[#C5973A]" />
        </div>
        <h3 className="text-[#1E3A5F] mb-2" style={{ fontFamily: "'Playfair Display', serif", fontWeight: 600, fontSize: "1.25rem" }}>
          Story Shared!
        </h3>
        <p className="text-[#6B7280] text-sm mb-6" style={{ fontFamily: "'Inter', sans-serif" }}>
          Your story will be reviewed and featured in our Community Stories archive.
        </p>
        <button onClick={onClose} className="px-6 py-2.5 rounded-lg text-white text-sm" style={{ background: "linear-gradient(135deg, #C5973A, #D4A843)", fontFamily: "'Inter', sans-serif", fontWeight: 500 }}>
          Close
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* Category */}
      <div>
        <label className="block text-[#374151] text-sm mb-2" style={{ fontFamily: "'Inter', sans-serif", fontWeight: 500 }}>
          Story Category
        </label>
        <div className="flex flex-wrap gap-2">
          {["Personal Memory", "Family History", "Community Experience", "Cultural Story", "Heritage Discovery"].map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setCategory(cat)}
              className={`px-3 py-1.5 text-xs rounded-lg border transition-all ${
                category === cat
                  ? "border-[#C5973A] bg-[#C5973A] text-white"
                  : "border-[#E8E0D5] text-[#6B7280] hover:border-[#C5973A]/50"
              }`}
              style={{ fontFamily: "'Inter', sans-serif", fontWeight: 500 }}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Title */}
      <div>
        <label className="block text-[#374151] text-sm mb-2" style={{ fontFamily: "'Inter', sans-serif", fontWeight: 500 }}>
          Story Title
        </label>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
          placeholder="Give your story a title..."
          className="w-full px-4 py-3 rounded-xl border border-[#E8E0D5] bg-[#F9F7F4] text-[#374151] text-sm placeholder-[#9CA3AF] focus:outline-none focus:border-[#C5973A] focus:ring-2 focus:ring-[#C5973A]/10 transition-all"
          style={{ fontFamily: "'Inter', sans-serif" }}
        />
      </div>

      {/* Author */}
      <div>
        <label className="block text-[#374151] text-sm mb-2" style={{ fontFamily: "'Inter', sans-serif", fontWeight: 500 }}>
          Your Name <span className="text-[#9CA3AF] font-normal">(optional)</span>
        </label>
        <input
          type="text"
          value={authorName}
          onChange={(e) => setAuthorName(e.target.value)}
          placeholder="Anonymous if not provided"
          className="w-full px-4 py-3 rounded-xl border border-[#E8E0D5] bg-[#F9F7F4] text-[#374151] text-sm placeholder-[#9CA3AF] focus:outline-none focus:border-[#C5973A] focus:ring-2 focus:ring-[#C5973A]/10 transition-all"
          style={{ fontFamily: "'Inter', sans-serif" }}
        />
      </div>

      {/* Story */}
      <div>
        <label className="block text-[#374151] text-sm mb-2" style={{ fontFamily: "'Inter', sans-serif", fontWeight: 500 }}>
          Your Story
        </label>
        <textarea
          value={story}
          onChange={(e) => setStory(e.target.value)}
          required
          placeholder="Share your memory, experience, or story here. Every story matters and helps preserve our community's heritage..."
          rows={5}
          className="w-full px-4 py-3 rounded-xl border border-[#E8E0D5] bg-[#F9F7F4] text-[#374151] text-sm placeholder-[#9CA3AF] focus:outline-none focus:border-[#C5973A] focus:ring-2 focus:ring-[#C5973A]/10 transition-all resize-none"
          style={{ fontFamily: "'Inter', sans-serif" }}
        />
        <p className="text-[#9CA3AF] text-xs mt-1" style={{ fontFamily: "'Inter', sans-serif" }}>
          {story.length} characters
        </p>
      </div>

      {/* Photo Upload */}
      <div>
        <label className="block text-[#374151] text-sm mb-2" style={{ fontFamily: "'Inter', sans-serif", fontWeight: 500 }}>
          Add Photo <span className="text-[#9CA3AF] font-normal">(optional)</span>
        </label>
        {photoPreview ? (
          <div className="relative rounded-xl overflow-hidden">
            <img src={photoPreview} alt="Preview" className="w-full h-40 object-cover" />
            <button
              type="button"
              onClick={() => { setPhotoFile(null); setPhotoPreview(null); }}
              className="absolute top-2 right-2 w-7 h-7 rounded-full bg-black/50 flex items-center justify-center text-white hover:bg-black/70 transition-colors"
            >
              <X size={14} />
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => photoInputRef.current?.click()}
            className="w-full flex items-center justify-center gap-2 px-4 py-4 rounded-xl border-2 border-dashed border-[#D1C5B8] text-[#9CA3AF] text-sm hover:border-[#C5973A]/50 hover:bg-[#FFF7ED]/50 transition-all"
            style={{ fontFamily: "'Inter', sans-serif" }}
          >
            <ImageIcon size={18} />
            Click to add a photo
          </button>
        )}
        <input
          ref={photoInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handlePhotoChange}
        />
      </div>

      <button
        type="submit"
        className="w-full py-3 rounded-xl text-white text-sm transition-all hover:opacity-90 active:scale-[0.98]"
        style={{ background: "linear-gradient(135deg, #C5973A, #D4A843)", fontFamily: "'Inter', sans-serif", fontWeight: 500 }}
      >
        Share My Story
      </button>
    </form>
  );
}

// ─── Participation Card ───────────────────────────────────────────────
interface CardData {
  icon: React.ReactNode;
  color: string;
  bgColor: string;
  borderColor: string;
  tag: string;
  tagBg: string;
  tagColor: string;
  title: string;
  description: string;
  purpose: string;
  buttonLabel: string;
  buttonStyle: React.CSSProperties;
  image: string;
  modalContent: (props: { onClose: () => void }) => React.ReactNode;
}

function ParticipationCard({
  card,
  onOpen,
}: {
  card: CardData;
  onOpen: () => void;
}) {
  return (
    <div
      className={`group relative rounded-2xl overflow-hidden border bg-white transition-all duration-300 hover:-translate-y-1 hover:shadow-xl cursor-pointer`}
      style={{ borderColor: card.borderColor }}
      onClick={onOpen}
    >
      {/* Image */}
      <div className="relative h-48 overflow-hidden">
        <img
          src={card.image}
          alt={card.title}
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
        />
        <div className="absolute inset-0" style={{ background: "linear-gradient(to top, rgba(15,30,50,0.6), transparent 60%)" }} />
        {/* Tag */}
        <span
          className="absolute top-3 left-3 px-3 py-1 rounded-full text-xs"
          style={{ background: card.tagBg, color: card.tagColor, fontFamily: "'Inter', sans-serif", fontWeight: 600 }}
        >
          {card.tag}
        </span>
      </div>

      {/* Content */}
      <div className="p-6">
        {/* Icon + Purpose */}
        <div className="flex items-start justify-between mb-4">
          <div
            className="w-11 h-11 rounded-xl flex items-center justify-center"
            style={{ background: card.bgColor }}
          >
            {card.icon}
          </div>
          <span
            className="text-xs px-2.5 py-1 rounded-lg"
            style={{
              background: "#F9F7F4",
              color: "#6B7280",
              fontFamily: "'Inter', sans-serif",
              border: "1px solid #E8E0D5",
            }}
          >
            {card.purpose}
          </span>
        </div>

        <h3
          className="text-[#1E3A5F] mb-2"
          style={{ fontFamily: "'Playfair Display', serif", fontWeight: 600, fontSize: "1.15rem" }}
        >
          {card.title}
        </h3>
        <p
          className="text-[#6B7280] text-sm mb-5 leading-relaxed"
          style={{ fontFamily: "'Inter', sans-serif" }}
        >
          {card.description}
        </p>

        <button
          className="flex items-center gap-2 text-sm transition-all hover:gap-3"
          style={{ ...card.buttonStyle, fontFamily: "'Inter', sans-serif", fontWeight: 600 }}
          onClick={(e) => { e.stopPropagation(); onOpen(); }}
        >
          {card.buttonLabel}
          <ChevronRight size={16} />
        </button>
      </div>
    </div>
  );
}

// ─── Modal Overlay ────────────────────────────────────────────────────
function Modal({
  title,
  subtitle,
  icon,
  onClose,
  children,
}: {
  title: string;
  subtitle: string;
  icon: React.ReactNode;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(10, 20, 40, 0.6)", backdropFilter: "blur(4px)" }}
      onClick={onClose}
    >
      <div
        className="relative bg-white rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="sticky top-0 bg-white z-10 px-6 pt-6 pb-4 border-b border-[#F0EBE4]">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              {icon}
              <div>
                <h2
                  className="text-[#1E3A5F]"
                  style={{ fontFamily: "'Playfair Display', serif", fontWeight: 600, fontSize: "1.2rem" }}
                >
                  {title}
                </h2>
                <p className="text-[#9CA3AF] text-xs mt-0.5" style={{ fontFamily: "'Inter', sans-serif" }}>
                  {subtitle}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-lg flex items-center justify-center text-[#9CA3AF] hover:text-[#374151] hover:bg-[#F9F7F4] transition-colors flex-shrink-0"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="px-6 py-5">{children}</div>
      </div>
    </div>
  );
}

// ─── Main Section ─────────────────────────────────────────────────────
export function EParticipation() {
  const [activeModal, setActiveModal] = useState<string | null>(null);

  const cards: CardData[] = [
    {
      icon: <Star size={20} className="text-[#C5973A]" />,
      color: "#C5973A",
      bgColor: "#FFF7ED",
      borderColor: "#F0E6D3",
      tag: "Quick & Easy",
      tagBg: "rgba(197, 151, 58, 0.15)",
      tagColor: "#92680A",
      title: "Visitor Feedback",
      description:
        "Share your experience with us! Rate your visit and leave comments that help us improve the quality and usability of our museum services.",
      purpose: "Quality Improvement",
      buttonLabel: "Leave a Review",
      buttonStyle: { color: "#C5973A" },
      image: "https://images.unsplash.com/photo-1763224810010-4e5d23f261af?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxtdXNldW0lMjBjb21tdW5pdHklMjBoZXJpdGFnZSUyMGV2ZW50fGVufDF8fHx8MTc3ODQxODg3M3ww&ixlib=rb-4.1.0&q=80&w=400",
      modalContent: ({ onClose }) => <VisitorFeedbackModal onClose={onClose} />,
    },
    {
      icon: <BookOpen size={20} className="text-[#1E3A5F]" />,
      color: "#1E3A5F",
      bgColor: "#EEF4FF",
      borderColor: "#D1DCF0",
      tag: "For Educators",
      tagBg: "rgba(30, 58, 95, 0.12)",
      tagColor: "#1E3A5F",
      title: "Teacher Corner",
      description:
        "Educators are invited to submit classroom-ready learning materials in PDF, DOCX, and slide formats to build our curated educational resource library.",
      purpose: "Learning Materials",
      buttonLabel: "Submit Materials",
      buttonStyle: { color: "#1E3A5F" },
      image: "https://images.unsplash.com/photo-1758270704524-596810e891b5?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxzdHVkZW50cyUyMGNsYXNzcm9vbSUyMGxlYXJuaW5nJTIwZWR1Y2F0aW9ufGVufDF8fHx8MTc3ODQxODg3NHww&ixlib=rb-4.1.0&q=80&w=400",
      modalContent: ({ onClose }) => <TeacherCornerModal onClose={onClose} />,
    },
    {
      icon: <BookHeart size={20} className="text-[#7C3AED]" />,
      color: "#7C3AED",
      bgColor: "#F5F3FF",
      borderColor: "#DDD6F0",
      tag: "Share Stories",
      tagBg: "rgba(124, 58, 237, 0.12)",
      tagColor: "#5B21B6",
      title: "Stories Submit",
      description:
        "Community members are welcome to share experiences, memories, and personal stories with optional photos to help preserve public and family narratives.",
      purpose: "Preserve Narratives",
      buttonLabel: "Share My Story",
      buttonStyle: { color: "#7C3AED" },
      image: "https://images.unsplash.com/photo-1759409972741-57859a437f41?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxjb21tdW5pdHklMjBzdG9yaWVzJTIwbWVtb3JpZXMlMjBmYW1pbHklMjBwaG90b3N8ZW58MXx8fHwxNzc4NDE4ODc3fDA&ixlib=rb-4.1.0&q=80&w=400",
      modalContent: ({ onClose }) => <StoriesSubmitModal onClose={onClose} />,
    },
  ];

  const activeCard = cards.find((c) => c.title === activeModal);

  return (
    <section id="e-participation" className="py-20 lg:py-28" style={{ background: "#F9F7F4" }}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <SectionTitle
          eyebrow="E-Participation"
          title="Engage with Your Heritage Museum"
          subtitle="Your voice, knowledge, and stories are the heartbeat of our community. Choose how you'd like to contribute to our growing digital archive."
        />

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8">
          {cards.map((card) => (
            <ParticipationCard
              key={card.title}
              card={card}
              onOpen={() => setActiveModal(card.title)}
            />
          ))}
        </div>

        {/* Info Banner */}
        <div className="mt-10 p-5 rounded-2xl border border-[#D1DCF0] bg-[#EEF4FF]/60 flex flex-col sm:flex-row items-start sm:items-center gap-3">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: "#1E3A5F" }}>
            <Paperclip size={16} className="text-white" />
          </div>
          <div>
            <p className="text-[#1E3A5F] text-sm" style={{ fontFamily: "'Inter', sans-serif", fontWeight: 500 }}>
              All submissions are reviewed by our curatorial team before being published.
            </p>
            <p className="text-[#6B7280] text-xs mt-0.5" style={{ fontFamily: "'Inter', sans-serif" }}>
              Your privacy is important to us. Personal information will only be used for museum communication purposes.
            </p>
          </div>
        </div>
      </div>

      {/* Modal */}
      {activeModal && activeCard && (
        <Modal
          title={activeCard.title}
          subtitle={activeCard.description.slice(0, 60) + "..."}
          icon={
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ background: activeCard.bgColor }}
            >
              {activeCard.icon}
            </div>
          }
          onClose={() => setActiveModal(null)}
        >
          {activeCard.modalContent({ onClose: () => setActiveModal(null) })}
        </Modal>
      )}
    </section>
  );
}