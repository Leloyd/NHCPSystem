const events = [
  {
    year: "1845",
    era: "Construction Era",
    description:
      "Built under the direction of Franciscan friars as a modern burial ground featuring underground crypts. The structure represented a significant advancement in cemetery architecture in the Philippines.",
  },
  {
    year: "1896",
    era: "Revolutionary Period",
    description:
      "The underground chambers became a secret meeting place for members of the Katipunan during the Philippine Revolution against Spanish colonial rule.",
  },
  {
    year: "1973",
    era: "National Landmark",
    description:
      "Declared a National Historical Landmark by the National Historical Institute, recognizing its unique architectural and historical significance.",
  },
  {
    year: "Today",
    era: "Museum & Heritage Site",
    description:
      "Now serves as a museum and cultural heritage site, welcoming visitors from around the world to experience this unique piece of Philippine history.",
  },
];

export function HistoryTimeline() {
  return (
    <section id="history" className="bg-[#1C1208] relative overflow-hidden">
      {/* Subtle background texture */}
      <div
        className="absolute inset-0 opacity-5"
        style={{
          backgroundImage:
            "radial-gradient(circle at 20% 50%, #D4AF6A 0%, transparent 50%), radial-gradient(circle at 80% 20%, #D4AF6A 0%, transparent 40%)",
        }}
      />

      <div className="relative z-10 max-w-5xl mx-auto px-6 py-24">
        {/* Section label */}
        <div className="flex items-center gap-3 mb-5">
          <div className="h-px w-10 bg-[#D4AF6A]" />
          <span
            className="text-[#D4AF6A] text-xs tracking-[0.3em] uppercase"
            style={{ fontFamily: "'Inter', sans-serif" }}
          >
            Historical Journey
          </span>
        </div>

        <h2
          className="text-white mb-16"
          style={{
            fontFamily: "'Playfair Display', serif",
            fontSize: "clamp(1.8rem, 4vw, 2.8rem)",
            fontWeight: 500,
          }}
        >
          Cemetery History
        </h2>

        {/* Timeline */}
        <div className="relative">
          {/* Vertical line */}
          <div className="absolute left-[60px] md:left-1/2 top-0 bottom-0 w-px bg-gradient-to-b from-[#D4AF6A]/60 via-[#D4AF6A]/30 to-transparent hidden sm:block" />

          <div className="space-y-12">
            {events.map((event, index) => (
              <div
                key={event.year}
                className={`relative flex flex-col sm:flex-row items-start gap-6 ${
                  index % 2 === 0 ? "sm:flex-row" : "sm:flex-row-reverse"
                }`}
              >
                {/* Year marker */}
                <div
                  className={`hidden sm:flex flex-1 ${
                    index % 2 === 0 ? "justify-end pr-8" : "justify-start pl-8"
                  }`}
                >
                  <div className="text-right">
                    <span
                      className={`${
                        index % 2 === 0 ? "text-right" : "text-left"
                      } block`}
                    >
                      <span
                        className="text-[#D4AF6A]"
                        style={{
                          fontFamily: "'Playfair Display', serif",
                          fontSize: "2.5rem",
                          fontWeight: 400,
                          lineHeight: 1,
                        }}
                      >
                        {event.year}
                      </span>
                    </span>
                    <p
                      className={`text-white/40 text-xs tracking-widest uppercase mt-1 ${
                        index % 2 === 0 ? "text-right" : "text-left"
                      }`}
                      style={{ fontFamily: "'Inter', sans-serif" }}
                    >
                      {event.era}
                    </p>
                  </div>
                </div>

                {/* Center dot */}
                <div className="hidden sm:flex absolute left-1/2 -translate-x-1/2 items-center justify-center">
                  <div className="w-3 h-3 rounded-full bg-[#D4AF6A] border-2 border-[#1C1208] shadow-lg shadow-[#D4AF6A]/30" />
                </div>

                {/* Content card */}
                <div
                  className={`flex-1 ${
                    index % 2 === 0 ? "sm:pl-8" : "sm:pr-8"
                  }`}
                >
                  {/* Mobile: show year here */}
                  <div className="sm:hidden mb-3">
                    <span
                      className="text-[#D4AF6A]"
                      style={{
                        fontFamily: "'Playfair Display', serif",
                        fontSize: "2rem",
                        fontWeight: 400,
                      }}
                    >
                      {event.year}
                    </span>
                    <p
                      className="text-white/40 text-xs tracking-widest uppercase mt-0.5"
                      style={{ fontFamily: "'Inter', sans-serif" }}
                    >
                      {event.era}
                    </p>
                  </div>

                  <div className="border border-white/10 bg-white/5 p-6 hover:border-[#D4AF6A]/30 hover:bg-white/8 transition-all duration-300">
                    <p
                      className="text-white/70 leading-relaxed"
                      style={{
                        fontFamily: "'Cormorant Garamond', serif",
                        fontSize: "1.05rem",
                      }}
                    >
                      {event.description}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
