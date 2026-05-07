import { Link } from "react-router";
import { motion } from "motion/react";
import { ArrowRight } from "lucide-react";
import type { Artifact } from "../data/artifacts";
import { useAccessibility } from "../context/AccessibilityContext";

interface ArtifactCardProps {
  artifact: Artifact;
  index?: number;
}

export function ArtifactCard({ artifact, index = 0 }: ArtifactCardProps) {
  const { settings } = useAccessibility();
  const hc = settings.highContrast;
  const lang = settings.language;
  const reducedMotion = settings.reducedMotion;

  return (
    <motion.article
      initial={reducedMotion ? false : { opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: index * 0.05 }}
      className={`group rounded-xl overflow-hidden border transition-all duration-300 flex flex-col ${
        hc
          ? "bg-black border-yellow-400 hover:border-yellow-300"
          : "bg-white border-[#E8E4DF] hover:border-[#B8945A]/50 hover:shadow-lg hover:shadow-[#B8945A]/8"
      }`}
      role="article"
      aria-labelledby={`artifact-title-${artifact.id}`}
    >
      {/* Image */}
      <Link
        to={`/artifact/${artifact.id}`}
        className="block overflow-hidden aspect-[4/3] relative"
        aria-label={`View details for ${artifact.title}`}
        tabIndex={-1}
      >
        <img
          src={artifact.image}
          alt={`${artifact.title} — ${artifact.category}`}
          className={`w-full h-full object-cover transition-transform duration-500 ${
            reducedMotion ? "" : "group-hover:scale-105"
          }`}
          loading="lazy"
        />
        {/* Category Badge */}
        <span
          className={`absolute top-3 left-3 px-2.5 py-1 rounded-full text-xs font-medium ${
            hc
              ? "bg-yellow-400 text-black"
              : "bg-white/90 text-[#B8945A] border border-[#B8945A]/30"
          }`}
          aria-label={`Category: ${artifact.category}`}
        >
          {artifact.category}
        </span>
      </Link>

      {/* Content */}
      <div className="p-5 flex flex-col flex-1">
        <h3
          id={`artifact-title-${artifact.id}`}
          className={`mb-2 line-clamp-2 ${hc ? "text-yellow-400" : "text-[#1C1917]"}`}
        >
          {artifact.title}
        </h3>
        <p
          className={`text-sm leading-relaxed line-clamp-3 flex-1 ${
            hc ? "text-gray-300" : "text-[#6B6560]"
          }`}
        >
          {artifact.shortDescription}
        </p>

        {/* Metadata */}
        <div
          className={`mt-3 pt-3 border-t flex items-center gap-3 text-xs ${
            hc ? "border-yellow-400/20 text-gray-400" : "border-[#F0ECE6] text-[#ABA89F]"
          }`}
        >
          <span>{artifact.period}</span>
          <span aria-hidden="true">·</span>
          <span>{artifact.origin.split(",")[0]}</span>
        </div>

        {/* View More Button */}
        <Link
          to={`/artifact/${artifact.id}`}
          className={`mt-4 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 ${
            hc
              ? "border border-yellow-400 text-yellow-400 hover:bg-yellow-400 hover:text-black"
              : "bg-[#F5F1EC] text-[#B8945A] hover:bg-[#B8945A] hover:text-white"
          }`}
          aria-label={`View more details about ${artifact.title}`}
        >
          {lang === "filipino" ? "Tingnan Pa" : "View More"}
          <ArrowRight size={15} aria-hidden="true" />
        </Link>
      </div>
    </motion.article>
  );
}
