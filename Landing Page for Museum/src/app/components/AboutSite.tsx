const tunnelBg = "https://images.unsplash.com/photo-1751965680641-fc721ed2599e?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxhbmNpZW50JTIwYnJpY2slMjBhcmNoJTIwdW5kZXJncm91bmQlMjBwYXNzYWdlJTIwZGFyayUyMGF0bW9zcGhlcmljfGVufDF8fHx8MTc3ODUxNDcxOHww&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral";

export function AboutSite() {
  return (
    <section id="about" className="bg-[#F5F0E8]">
      <div className="max-w-6xl mx-auto px-6 py-24">
        {/* Section label */}
        <div className="flex items-center gap-3 mb-5">
          <div className="h-px w-10 bg-[#B8923A]" />
          <span
            className="text-[#B8923A] text-xs tracking-[0.3em] uppercase"
            style={{ fontFamily: "'Inter', sans-serif" }}
          >
            Heritage Overview
          </span>
        </div>

        <div className="grid lg:grid-cols-2 gap-14 items-center">
          {/* Text */}
          <div>
            <h2
              className="text-[#1C1208] mb-8"
              style={{
                fontFamily: "'Playfair Display', serif",
                fontSize: "clamp(1.8rem, 4vw, 2.8rem)",
                fontWeight: 500,
                lineHeight: 1.2,
              }}
            >
              About the Site
            </h2>

            <div className="space-y-5">
              <p
                className="text-[#4A3B2E] leading-relaxed"
                style={{
                  fontFamily: "'Cormorant Garamond', serif",
                  fontSize: "1.1rem",
                }}
              >
                The Nagcarlan Underground Cemetery is a rare architectural gem
                built during the Spanish colonial period in 1845. Constructed
                under the supervision of Franciscan friars, this unique
                structure served as both a cemetery and a chapel, featuring an
                underground crypt system that was revolutionary for its time.
              </p>

              <p
                className="text-[#4A3B2E] leading-relaxed"
                style={{
                  fontFamily: "'Cormorant Garamond', serif",
                  fontSize: "1.1rem",
                }}
              >
                The cemetery's brick vaults and arched passages demonstrate the
                sophisticated engineering and architectural knowledge of the
                period. Its design reflects a blend of European cemetery
                traditions adapted to the tropical Philippine climate.
              </p>

              <p
                className="text-[#4A3B2E] leading-relaxed"
                style={{
                  fontFamily: "'Cormorant Garamond', serif",
                  fontSize: "1.1rem",
                }}
              >
                During the Philippine Revolution, the underground chambers
                served as a secret meeting place for the Katipuneros, adding
                another layer of historical significance to this remarkable
                structure.
              </p>
            </div>

            {/* Decorative quote */}
            <div className="mt-8 pl-5 border-l-2 border-[#B8923A]">
              <p
                className="text-[#6B4F3A] italic"
                style={{
                  fontFamily: "'Cormorant Garamond', serif",
                  fontSize: "1.05rem",
                }}
              >
                "A silent witness to revolution, faith, and the enduring spirit
                of a nation."
              </p>
            </div>
          </div>

          {/* Image */}
          <div className="relative">
            <div className="relative overflow-hidden aspect-[3/4] max-h-[520px]">
              <img
                src={tunnelBg}
                alt="Underground crypt passage"
                className="w-full h-full object-cover"
              />
              {/* Decorative frame offset */}
              <div className="absolute -bottom-3 -right-3 w-full h-full border border-[#B8923A]/40 pointer-events-none" />
            </div>
            {/* Caption */}
            <div className="mt-5 flex items-center gap-3">
              <div className="h-px flex-1 bg-[#B8923A]/20" />
              <p
                className="text-[#8B7355] text-xs tracking-widest uppercase"
                style={{ fontFamily: "'Inter', sans-serif" }}
              >
                The Underground Crypt, Est. 1845
              </p>
              <div className="h-px flex-1 bg-[#B8923A]/20" />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
