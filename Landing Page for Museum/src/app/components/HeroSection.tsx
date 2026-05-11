import { ChevronDown } from "lucide-react";

const heroBg = "https://images.unsplash.com/photo-1777792405713-e0a895c8457c?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxoaXN0b3JpYyUyMHN0b25lJTIwY2VtZXRlcnklMjB1bmRlcmdyb3VuZCUyMGNyeXB0JTIwYXJjaGl0ZWN0dXJlfGVufDF8fHx8MTc3ODUxNDcxMXww&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral";

export function HeroSection() {
  const scrollToTrail = () => {
    const el = document.querySelector("#about");
    if (el) el.scrollIntoView({ behavior: "smooth" });
  };

  const scrollDown = () => {
    const el = document.querySelector("#testament");
    if (el) el.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <section
      id="hero"
      className="relative min-h-screen flex items-center justify-center overflow-hidden"
    >
      {/* Background image */}
      <div
        className="absolute inset-0 bg-cover bg-center"
        style={{ backgroundImage: `url(${heroBg})` }}
      />
      {/* Deep gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-b from-[#0D0A04]/80 via-[#1C1208]/65 to-[#0D0A04]/90" />
      {/* Subtle texture overlay */}
      <div
        className="absolute inset-0 opacity-20"
        style={{
          backgroundImage:
            "repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,0.05) 2px, rgba(0,0,0,0.05) 4px)",
        }}
      />

      {/* Content */}
      <div className="relative z-10 text-center px-6 max-w-4xl mx-auto">
        {/* Badge */}
        <div className="inline-flex items-center gap-2 mb-8">
          <div className="h-px w-12 bg-[#D4AF6A]" />
          <span
            className="text-[#D4AF6A] text-xs tracking-[0.3em] uppercase"
            style={{ fontFamily: "'Inter', sans-serif" }}
          >
            National Historical Landmark
          </span>
          <div className="h-px w-12 bg-[#D4AF6A]" />
        </div>

        {/* Title */}
        <h1
          className="text-white mb-3 leading-tight"
          style={{
            fontFamily: "'Playfair Display', serif",
            fontSize: "clamp(2.2rem, 6vw, 4.5rem)",
            fontWeight: 500,
            lineHeight: 1.15,
          }}
        >
          Museo ng Libingan
          <br />
          <em style={{ fontStyle: "italic", color: "#D4AF6A" }}>
            sa Ilalim ng Lupa
          </em>
        </h1>

        <p
          className="text-white/60 text-sm tracking-[0.25em] uppercase mb-6"
          style={{ fontFamily: "'Inter', sans-serif" }}
        >
          Nagcarlan Underground Cemetery Museum
        </p>

        {/* Thin gold divider */}
        <div className="flex justify-center mb-8">
          <div className="h-px w-24 bg-gradient-to-r from-transparent via-[#D4AF6A] to-transparent" />
        </div>

        {/* Tagline */}
        <p
          className="text-white/75 max-w-2xl mx-auto mb-12 leading-relaxed"
          style={{
            fontFamily: "'Cormorant Garamond', serif",
            fontSize: "clamp(1rem, 2.5vw, 1.3rem)",
          }}
        >
          Discover the unique architectural and cultural heritage of the
          Philippines' only underground cemetery, a National Historical Landmark.
        </p>

        {/* CTA Button */}
        <button
          onClick={scrollToTrail}
          className="group inline-flex items-center gap-3 px-10 py-4 bg-[#D4AF6A] text-[#1C1208] hover:bg-[#E8C97A] transition-all duration-300 text-sm tracking-[0.2em] uppercase cursor-pointer"
          style={{ fontFamily: "'Inter', sans-serif", fontWeight: 600 }}
        >
          <span>Start Heritage Trail</span>
          <ChevronDown
            size={16}
            className="group-hover:translate-y-1 transition-transform duration-300"
          />
        </button>

        <p
          className="mt-4 text-white/35 text-xs tracking-wider"
          style={{ fontFamily: "'Inter', sans-serif" }}
        >
          Est. 1845 · Nagcarlan, Laguna · Philippines
        </p>
      </div>

      {/* Scroll indicator */}
      <button
        onClick={scrollDown}
        className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 text-white/40 hover:text-white/70 transition-colors cursor-pointer"
      >
        <span
          className="text-xs tracking-widest uppercase"
          style={{ fontFamily: "'Inter', sans-serif" }}
        >
          Scroll
        </span>
        <div className="w-px h-12 bg-gradient-to-b from-white/40 to-transparent" />
      </button>
    </section>
  );
}
