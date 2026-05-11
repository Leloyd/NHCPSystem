import { Shield, Clock, Star } from "lucide-react";

const archBg = "https://images.unsplash.com/photo-1722197913440-0128aff38a9d?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxjb2xvbmlhbCUyMGVyYSUyMGJyaWNrJTIwdmF1bHQlMjBhcmNod2F5JTIwaGVyaXRhZ2V8ZW58MXx8fHwxNzc4NTE0NzEyfDA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral";

const stats = [
  {
    icon: Shield,
    title: "National Landmark",
    description:
      "Declared a National Historical Landmark, preserving centuries of heritage",
  },
  {
    icon: Clock,
    title: "Est. 1845",
    description:
      "Nearly two centuries of history preserved for future generations",
  },
  {
    icon: Star,
    title: "Cultural Heritage",
    description:
      "A testament to Filipino ingenuity and colonial-era architecture",
  },
];

export function TestamentSection() {
  return (
    <section id="testament" className="bg-[#FAF7F2]">
      {/* Top image band */}
      <div
        className="h-64 md:h-80 bg-cover bg-center relative"
        style={{ backgroundImage: `url(${archBg})` }}
      >
        <div className="absolute inset-0 bg-gradient-to-b from-[#0D0A04]/30 to-[#FAF7F2]" />
      </div>

      <div className="max-w-6xl mx-auto px-6 -mt-16 pb-20 relative z-10">
        {/* Section label */}
        <div className="flex items-center gap-3 mb-5">
          <div className="h-px w-10 bg-[#B8923A]" />
          <span
            className="text-[#B8923A] text-xs tracking-[0.3em] uppercase"
            style={{ fontFamily: "'Inter', sans-serif" }}
          >
            Living Testament to History
          </span>
        </div>

        <div className="grid md:grid-cols-2 gap-12 items-start">
          <div>
            <h2
              className="text-[#1C1208] mb-6 leading-tight"
              style={{
                fontFamily: "'Playfair Display', serif",
                fontSize: "clamp(1.8rem, 4vw, 2.8rem)",
                fontWeight: 500,
                lineHeight: 1.2,
              }}
            >
              A Living Testament
              <br />
              <em style={{ fontStyle: "italic", color: "#6B4F3A" }}>
                to History
              </em>
            </h2>
            <p
              className="text-[#4A3B2E] leading-relaxed"
              style={{
                fontFamily: "'Cormorant Garamond', serif",
                fontSize: "1.15rem",
              }}
            >
              The Nagcarlan Underground Cemetery is a unique colonial-era
              structure built in 1845. This architectural marvel features an
              underground crypt system, showcasing the ingenuity and
              craftsmanship of our ancestors. Today, it stands as a National
              Historical Landmark and a proud symbol of Filipino heritage.
            </p>
          </div>

          <div className="space-y-6 pt-2">
            {stats.map(({ icon: Icon, title, description }) => (
              <div key={title} className="flex items-start gap-4">
                <div className="flex-shrink-0 w-10 h-10 flex items-center justify-center border border-[#B8923A]/40 bg-[#F5EDD8]">
                  <Icon size={18} className="text-[#B8923A]" />
                </div>
                <div>
                  <h4
                    className="text-[#1C1208] mb-1"
                    style={{
                      fontFamily: "'Playfair Display', serif",
                      fontWeight: 500,
                    }}
                  >
                    {title}
                  </h4>
                  <p
                    className="text-[#6B4F3A] text-sm leading-relaxed"
                    style={{ fontFamily: "'Inter', sans-serif" }}
                  >
                    {description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
