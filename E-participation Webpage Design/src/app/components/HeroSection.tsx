import { ChevronDown, Calendar, Users } from "lucide-react";
import { ImageWithFallback } from "./figma/ImageWithFallback";

export function HeroSection() {
  const handleScroll = (href: string) => {
    const el = document.querySelector(href);
    if (el) el.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
      {/* Background Image */}
      <div className="absolute inset-0">
        <ImageWithFallback
          src="https://images.unsplash.com/photo-1773601104029-24b985b7f460?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxoZXJpdGFnZSUyMHNpdGUlMjBhbmNpZW50JTIwcnVpbnMlMjBjdWx0dXJlfGVufDF8fHx8MTc3ODQxODg3N3ww&ixlib=rb-4.1.0&q=80&w=1080"
          alt="Heritage Museum"
          className="w-full h-full object-cover"
        />
        {/* Gradient Overlay */}
        <div
          className="absolute inset-0"
          style={{
            background:
              "linear-gradient(to bottom, rgba(15,30,50,0.65) 0%, rgba(15,30,50,0.75) 60%, rgba(15,30,50,0.92) 100%)",
          }}
        />
      </div>

      {/* Content */}
      <div className="relative z-10 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        {/* Badge */}
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full mb-6 border border-[#C5973A]/40 bg-[#C5973A]/10 backdrop-blur-sm">
          <span className="w-1.5 h-1.5 rounded-full bg-[#C5973A] animate-pulse" />
          <span
            className="text-[#E0B868] text-xs uppercase tracking-widest"
            style={{ fontFamily: "'Inter', sans-serif", fontWeight: 600 }}
          >
            Open for Community Participation
          </span>
        </div>

        {/* Heading */}
        <h1
          className="text-white mb-6"
          style={{
            fontFamily: "'Playfair Display', serif",
            fontWeight: 700,
            fontSize: "clamp(2rem, 5vw, 3.75rem)",
            lineHeight: 1.15,
          }}
        >
          E-Participation,{" "}
          <span
            style={{
              background: "linear-gradient(90deg, #C5973A, #E8C06A)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
            }}
          >
            Community Highlights
          </span>{" "}
          &amp; Events
        </h1>

        {/* Subtitle */}
        <p
          className="text-white/75 max-w-2xl mx-auto mb-10"
          style={{
            fontFamily: "'Inter', sans-serif",
            fontWeight: 400,
            fontSize: "clamp(0.95rem, 2vw, 1.15rem)",
            lineHeight: 1.75,
          }}
        >
          Stay connected with museum programs, public activities, school engagements, and community
          announcements curated by our dedicated heritage team.
        </p>

        {/* CTA Buttons */}
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <button
            onClick={() => handleScroll("#e-participation")}
            className="group flex items-center justify-center gap-2 px-7 py-3.5 rounded-xl text-white transition-all duration-300 hover:scale-105 active:scale-95"
            style={{
              background: "linear-gradient(135deg, #C5973A 0%, #D4A843 100%)",
              fontFamily: "'Inter', sans-serif",
              fontWeight: 500,
              fontSize: "0.95rem",
            }}
          >
            <Users size={18} />
            Join E-Participation
          </button>
          <button
            onClick={() => handleScroll("#events-calendar")}
            className="flex items-center justify-center gap-2 px-7 py-3.5 rounded-xl text-white border border-white/30 backdrop-blur-sm hover:bg-white/15 transition-all duration-300 hover:scale-105 active:scale-95"
            style={{
              fontFamily: "'Inter', sans-serif",
              fontWeight: 500,
              fontSize: "0.95rem",
            }}
          >
            <Calendar size={18} />
            View Events
          </button>
        </div>

        {/* Stats */}
        <div className="flex flex-wrap justify-center gap-8 mt-16 pt-8 border-t border-white/15">
          {[
            { value: "2,400+", label: "Visitors Engaged" },
            { value: "180+", label: "Stories Shared" },
            { value: "65+", label: "School Partners" },
            { value: "40+", label: "Annual Events" },
          ].map((stat) => (
            <div key={stat.label} className="text-center">
              <div
                className="text-[#E0B868] mb-1"
                style={{
                  fontFamily: "'Playfair Display', serif",
                  fontWeight: 700,
                  fontSize: "1.6rem",
                }}
              >
                {stat.value}
              </div>
              <div
                className="text-white/60 text-xs uppercase tracking-wider"
                style={{ fontFamily: "'Inter', sans-serif" }}
              >
                {stat.label}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Scroll indicator */}
      <button
        onClick={() => handleScroll("#e-participation")}
        className="absolute bottom-8 left-1/2 -translate-x-1/2 text-white/50 hover:text-white/80 transition-colors animate-bounce"
      >
        <ChevronDown size={28} />
      </button>
    </section>
  );
}
