import { Heart, Camera, Users, Shield, AlertCircle } from "lucide-react";

const rules = [
  {
    icon: Heart,
    title: "Respect the Heritage",
    description:
      "This is a sacred historical site. Please maintain a respectful demeanor and speak in moderate tones.",
  },
  {
    icon: Camera,
    title: "Photography Guidelines",
    description:
      "Photography is allowed without flash. Please do not touch or lean on historical artifacts and structures.",
  },
  {
    icon: Users,
    title: "Group Tours",
    description:
      "Groups of 10 or more must arrange guided tours in advance. Follow your guide's instructions at all times.",
  },
  {
    icon: Shield,
    title: "Preservation",
    description:
      "Do not touch, write on, or damage any part of the structure. Help us preserve this heritage site for future generations.",
  },
  {
    icon: AlertCircle,
    title: "Safety First",
    description:
      "Watch your step, especially in the underground areas. Children must be accompanied by adults at all times.",
  },
];

export function HouseRules() {
  return (
    <section id="rules" className="bg-[#FAF7F2]">
      <div className="max-w-6xl mx-auto px-6 py-24">
        {/* Section label */}
        <div className="flex items-center gap-3 mb-5">
          <div className="h-px w-10 bg-[#B8923A]" />
          <span
            className="text-[#B8923A] text-xs tracking-[0.3em] uppercase"
            style={{ fontFamily: "'Inter', sans-serif" }}
          >
            Responsible Visiting
          </span>
        </div>

        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-14">
          <h2
            className="text-[#1C1208]"
            style={{
              fontFamily: "'Playfair Display', serif",
              fontSize: "clamp(1.8rem, 4vw, 2.8rem)",
              fontWeight: 500,
              lineHeight: 1.2,
            }}
          >
            House Rules
          </h2>
          <p
            className="text-[#8B7355] text-sm max-w-xs"
            style={{ fontFamily: "'Inter', sans-serif" }}
          >
            Help us protect this irreplaceable piece of Philippine heritage for
            generations to come.
          </p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {rules.map(({ icon: Icon, title, description }, index) => (
            <div
              key={title}
              className={`group relative bg-white border border-[#E8DDD0] p-7 hover:border-[#B8923A]/50 hover:shadow-md transition-all duration-300 ${
                index === rules.length - 1 && rules.length % 3 !== 0
                  ? "sm:col-span-2 lg:col-span-1"
                  : ""
              }`}
            >
              {/* Gold accent line top */}
              <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-[#B8923A]/0 via-[#B8923A] to-[#B8923A]/0 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

              <div className="flex items-center gap-3 mb-4">
                <div className="w-9 h-9 flex items-center justify-center bg-[#F5EDD8] border border-[#D4AF6A]/30 group-hover:bg-[#D4AF6A]/15 transition-colors duration-300">
                  <Icon size={16} className="text-[#B8923A]" />
                </div>
                <h4
                  className="text-[#1C1208]"
                  style={{
                    fontFamily: "'Playfair Display', serif",
                    fontWeight: 500,
                    fontSize: "1rem",
                  }}
                >
                  {title}
                </h4>
              </div>
              <p
                className="text-[#6B4F3A] leading-relaxed text-sm"
                style={{ fontFamily: "'Inter', sans-serif" }}
              >
                {description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
