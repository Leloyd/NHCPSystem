import { useState } from "react";
import { useSearchParams, Link } from "react-router";
import { motion } from "motion/react";
import { ArrowRight } from "lucide-react";
import { artifacts, categories } from "../data/artifacts";
import { ArtifactCard } from "../components/ArtifactCard";
import { useAccessibility } from "../context/AccessibilityContext";

const categoryDescriptions: Record<string, { en: string; fil: string; icon: string }> = {
  Ceramics: {
    en: "Pottery, porcelain, and earthenware vessels spanning centuries of craft tradition.",
    fil: "Mga palayok, porselana, at mga sisidlang lupa mula sa iba't ibang panahon.",
    icon: "🏺",
  },
  Tools: {
    en: "Hand-forged implements that powered agriculture and everyday life.",
    fil: "Mga gamit at kagamitan para sa pagsasaka at pang-araw-araw na buhay.",
    icon: "⚒️",
  },
  Textiles: {
    en: "Woven fabrics and garments reflecting indigenous artistry and social identity.",
    fil: "Mga tela at damit na nagpapakita ng katutubong sining at pagkakakilanlan.",
    icon: "🧵",
  },
  "Religious Objects": {
    en: "Sacred figures, ritual objects, and spiritual implements from diverse traditions.",
    fil: "Mga sagradong imahe, rituwal na gamit, at espirituwal na kasangkapan.",
    icon: "✨",
  },
  "Memorial Objects": {
    en: "Funerary art and memorial markers that honor ancestors and mark sacred spaces.",
    fil: "Libing na sining at mga marker na nagbibigay-pugay sa mga ninuno.",
    icon: "🗿",
  },
  Jewelry: {
    en: "Ornaments and adornments in gold, shell, and precious materials.",
    fil: "Mga alahas at palamuti gawa sa ginto, kabibe, at mahalagang materyales.",
    icon: "💎",
  },
  Manuscripts: {
    en: "Written records, inscribed tablets, and annotated documents preserving knowledge.",
    fil: "Mga sulatin, inscribed na tablet, at mga dokumentong nagpapanatili ng kaalaman.",
    icon: "📜",
  },
  Coins: {
    en: "Indigenous and trade currency reflecting early economic systems.",
    fil: "Katutubong pera at trade currency na nagpapakita ng mga maagang sistema ng ekonomiya.",
    icon: "🪙",
  },
  Paintings: {
    en: "Oil, fresco, and mixed-media artworks spanning colonial and contemporary periods.",
    fil: "Mga painting sa langis, fresco, at mixed-media mula sa iba't ibang panahon.",
    icon: "🖼️",
  },
};

export function CategoriesPage() {
  const [searchParams] = useSearchParams();
  const [activeCategory, setActiveCategory] = useState(
    searchParams.get("cat") || ""
  );
  const { settings } = useAccessibility();
  const hc = settings.highContrast;
  const lang = settings.language;

  const contentCategories = categories.filter((c) => c !== "All Artifacts");

  const categoryArtifacts = activeCategory
    ? artifacts.filter((a) => a.category === activeCategory)
    : [];

  return (
    <main
      id="main-content"
      className={`min-h-screen ${hc ? "bg-black" : "bg-[#FAFAF7]"}`}
    >
      {/* Header */}
      <section
        className={`border-b py-12 px-4 sm:px-6 lg:px-8 ${
          hc ? "bg-black border-yellow-400/20" : "bg-white border-[#E8E4DF]"
        }`}
        aria-labelledby="categories-heading"
      >
        <div className="max-w-7xl mx-auto">
          <span
            className={`text-xs font-semibold tracking-widest uppercase mb-2 block ${
              hc ? "text-yellow-400" : "text-[#B8945A]"
            }`}
          >
            {lang === "filipino" ? "I-explore" : "Explore"}
          </span>
          <h1 id="categories-heading" className={hc ? "text-yellow-400" : "text-[#1C1917]"}>
            {lang === "filipino" ? "Mga Kategorya" : "Categories"}
          </h1>
          <p className={`mt-2 max-w-xl ${hc ? "text-gray-400" : "text-[#6B6560]"}`}>
            {lang === "filipino"
              ? "Piliin ang isang kategorya upang tuklasin ang mga kaugnay na artefakto."
              : "Select a category to explore related artifacts from our collection."}
          </p>
        </div>
      </section>

      {/* Category Grid */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 mb-12">
          {contentCategories.map((cat, i) => {
            const desc = categoryDescriptions[cat];
            const count = artifacts.filter((a) => a.category === cat).length;
            const isActive = activeCategory === cat;

            return (
              <motion.button
                key={cat}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: i * 0.04 }}
                onClick={() => setActiveCategory(isActive ? "" : cat)}
                className={`text-left p-5 rounded-2xl border transition-all duration-200 ${
                  isActive
                    ? hc
                      ? "bg-yellow-400 border-yellow-400 text-black"
                      : "bg-[#B8945A] border-[#B8945A] text-white shadow-lg shadow-[#B8945A]/20"
                    : hc
                    ? "bg-black border-yellow-400/20 text-white hover:border-yellow-400/50"
                    : "bg-white border-[#E8E4DF] text-[#1C1917] hover:border-[#B8945A]/40 hover:shadow-md"
                }`}
                aria-pressed={isActive}
                aria-label={`Filter by ${cat} — ${count} artifact${count !== 1 ? "s" : ""}`}
              >
                <span className="text-2xl mb-3 block" aria-hidden="true">
                  {desc?.icon || "📦"}
                </span>
                <h3
                  className={`text-sm font-semibold mb-1 ${
                    isActive ? (hc ? "text-black" : "text-white") : ""
                  }`}
                  style={{ fontSize: "0.875rem" }}
                >
                  {cat}
                </h3>
                <p
                  className={`text-xs leading-relaxed mb-2 line-clamp-2 ${
                    isActive
                      ? hc
                        ? "text-black/70"
                        : "text-white/80"
                      : hc
                      ? "text-gray-500"
                      : "text-[#ABA89F]"
                  }`}
                >
                  {lang === "filipino" ? desc?.fil : desc?.en}
                </p>
                <span
                  className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                    isActive
                      ? hc
                        ? "bg-black/20 text-black"
                        : "bg-white/20 text-white"
                      : hc
                      ? "bg-yellow-400/10 text-yellow-400"
                      : "bg-[#F5F1EC] text-[#B8945A]"
                  }`}
                >
                  {count} {lang === "filipino" ? "piraso" : count === 1 ? "piece" : "pieces"}
                </span>
              </motion.button>
            );
          })}
        </div>

        {/* Filtered Artifacts */}
        {activeCategory && (
          <section aria-labelledby="filtered-heading">
            <div className="flex items-end justify-between mb-6">
              <div>
                <span
                  className={`text-xs font-semibold tracking-widest uppercase mb-1 block ${
                    hc ? "text-yellow-400" : "text-[#B8945A]"
                  }`}
                >
                  {lang === "filipino" ? "Mga Artefakto" : "Artifacts"}
                </span>
                <h2
                  id="filtered-heading"
                  className={hc ? "text-yellow-400" : "text-[#1C1917]"}
                >
                  {activeCategory}
                </h2>
                <p className={`text-sm mt-1 ${hc ? "text-gray-400" : "text-[#6B6560]"}`}>
                  {categoryArtifacts.length}{" "}
                  {lang === "filipino" ? "artefakto" : `artifact${categoryArtifacts.length !== 1 ? "s" : ""}`}
                </p>
              </div>
              <Link
                to={`/gallery?cat=${encodeURIComponent(activeCategory)}`}
                className={`flex items-center gap-2 text-sm font-medium transition-colors ${
                  hc
                    ? "text-yellow-400 hover:text-yellow-300"
                    : "text-[#B8945A] hover:text-[#A07D47]"
                }`}
              >
                {lang === "filipino" ? "Tingnan sa Galería" : "View in Gallery"}
                <ArrowRight size={14} aria-hidden="true" />
              </Link>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {categoryArtifacts.map((artifact, i) => (
                <ArtifactCard key={artifact.id} artifact={artifact} index={i} />
              ))}
            </div>
          </section>
        )}

        {!activeCategory && (
          <div
            className={`text-center py-16 border rounded-2xl ${
              hc ? "border-yellow-400/20" : "border-[#E8E4DF] bg-white"
            }`}
          >
            <p className={`text-sm ${hc ? "text-gray-500" : "text-[#ABA89F]"}`}>
              {lang === "filipino"
                ? "Pumili ng kategorya sa itaas upang makita ang mga artefakto."
                : "Select a category above to explore its artifacts."}
            </p>
          </div>
        )}
      </section>
    </main>
  );
}
