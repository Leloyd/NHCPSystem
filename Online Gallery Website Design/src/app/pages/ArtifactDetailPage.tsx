import { useParams, Link, useNavigate } from "react-router";
import { motion } from "motion/react";
import {
  ArrowLeft,
  MapPin,
  Calendar,
  Tag,
  Layers,
  Star,
  Volume2,
  ZoomIn,
  Share2,
  Bookmark,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { artifacts } from "../data/artifacts";
import { ArtifactCard } from "../components/ArtifactCard";
import { useAccessibility } from "../context/AccessibilityContext";
import { useState } from "react";

export function ArtifactDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { settings } = useAccessibility();
  const hc = settings.highContrast;
  const lang = settings.language;
  const [zoomed, setZoomed] = useState(false);
  const [bookmarked, setBookmarked] = useState(false);

  const artifact = artifacts.find((a) => a.id === id);

  if (!artifact) {
    return (
      <main
        className={`min-h-screen flex items-center justify-center ${
          hc ? "bg-black text-yellow-400" : "bg-[#FAFAF7] text-[#1C1917]"
        }`}
      >
        <div className="text-center">
          <h1>Artifact Not Found</h1>
          <Link to="/gallery" className="mt-4 inline-block text-[#B8945A] underline">
            Back to Gallery
          </Link>
        </div>
      </main>
    );
  }

  const artifactIndex = artifacts.findIndex((a) => a.id === id);
  const prevArtifact = artifactIndex > 0 ? artifacts[artifactIndex - 1] : null;
  const nextArtifact =
    artifactIndex < artifacts.length - 1 ? artifacts[artifactIndex + 1] : null;

  const related = artifacts
    .filter((a) => a.id !== artifact.id && a.category === artifact.category)
    .slice(0, 4);

  const moreRelated =
    related.length < 4
      ? [
          ...related,
          ...artifacts
            .filter(
              (a) =>
                a.id !== artifact.id &&
                a.category !== artifact.category &&
                !related.includes(a)
            )
            .slice(0, 4 - related.length),
        ]
      : related;

  const metadata = [
    {
      icon: Tag,
      label: lang === "filipino" ? "Kategorya" : "Category",
      value: artifact.category,
    },
    {
      icon: Calendar,
      label: lang === "filipino" ? "Panahon / Petsa" : "Period / Date",
      value: artifact.period,
    },
    {
      icon: MapPin,
      label: lang === "filipino" ? "Pinagmulan" : "Origin",
      value: artifact.origin,
    },
    {
      icon: Layers,
      label: lang === "filipino" ? "Materyales" : "Material",
      value: artifact.material,
    },
    {
      icon: Star,
      label: lang === "filipino" ? "Kultural na Kahalagahan" : "Cultural Significance",
      value: artifact.culturalSignificance,
    },
  ];

  return (
    <main
      id="main-content"
      className={`min-h-screen ${hc ? "bg-black" : "bg-[#FAFAF7]"}`}
    >
      {/* Breadcrumb / Back */}
      <div
        className={`border-b py-4 px-4 sm:px-6 lg:px-8 ${
          hc ? "bg-black border-yellow-400/20" : "bg-white border-[#E8E4DF]"
        }`}
      >
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <nav aria-label="Breadcrumb">
            <ol className="flex items-center gap-2 text-sm">
              <li>
                <Link
                  to="/"
                  className={`transition-colors ${
                    hc ? "text-gray-400 hover:text-yellow-400" : "text-[#ABA89F] hover:text-[#6B6560]"
                  }`}
                >
                  {lang === "filipino" ? "Tahanan" : "Home"}
                </Link>
              </li>
              <li aria-hidden="true" className={hc ? "text-gray-600" : "text-[#D4CFC9]"}>
                /
              </li>
              <li>
                <Link
                  to="/gallery"
                  className={`transition-colors ${
                    hc ? "text-gray-400 hover:text-yellow-400" : "text-[#ABA89F] hover:text-[#6B6560]"
                  }`}
                >
                  {lang === "filipino" ? "Galería" : "Gallery"}
                </Link>
              </li>
              <li aria-hidden="true" className={hc ? "text-gray-600" : "text-[#D4CFC9]"}>
                /
              </li>
              <li
                className={`truncate max-w-xs ${hc ? "text-yellow-400" : "text-[#1C1917]"}`}
                aria-current="page"
              >
                {artifact.title}
              </li>
            </ol>
          </nav>

          {/* Artifact Navigation */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => prevArtifact && navigate(`/artifact/${prevArtifact.id}`)}
              disabled={!prevArtifact}
              className={`p-2 rounded-lg border transition-colors ${
                !prevArtifact
                  ? hc
                    ? "border-gray-800 text-gray-700 cursor-not-allowed"
                    : "border-[#F0ECE6] text-[#D4CFC9] cursor-not-allowed"
                  : hc
                  ? "border-yellow-400/30 text-yellow-400 hover:bg-yellow-400/10"
                  : "border-[#E8E4DF] text-[#6B6560] hover:bg-[#F5F1EC]"
              }`}
              aria-label="Previous artifact"
            >
              <ChevronLeft size={16} />
            </button>
            <button
              onClick={() => nextArtifact && navigate(`/artifact/${nextArtifact.id}`)}
              disabled={!nextArtifact}
              className={`p-2 rounded-lg border transition-colors ${
                !nextArtifact
                  ? hc
                    ? "border-gray-800 text-gray-700 cursor-not-allowed"
                    : "border-[#F0ECE6] text-[#D4CFC9] cursor-not-allowed"
                  : hc
                  ? "border-yellow-400/30 text-yellow-400 hover:bg-yellow-400/10"
                  : "border-[#E8E4DF] text-[#6B6560] hover:bg-[#F5F1EC]"
              }`}
              aria-label="Next artifact"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 xl:gap-16">
          {/* Image */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5 }}
          >
            <div className="sticky top-24">
              <div
                className={`relative rounded-2xl overflow-hidden border ${
                  hc ? "border-yellow-400/30" : "border-[#E8E4DF]"
                } ${zoomed ? "cursor-zoom-out" : "cursor-zoom-in"}`}
                onClick={() => setZoomed((v) => !v)}
                role="img"
                aria-label={`${artifact.title}. Click to ${zoomed ? "zoom out" : "zoom in"}`}
              >
                <div
                  className={`overflow-hidden transition-all duration-500 ${
                    zoomed ? "aspect-auto" : "aspect-[4/3]"
                  }`}
                >
                  <img
                    src={artifact.image}
                    alt={`${artifact.title} — ${artifact.category} from ${artifact.origin}`}
                    className={`w-full h-full object-cover transition-transform duration-500 ${
                      zoomed ? "scale-110" : "scale-100"
                    }`}
                  />
                </div>

                {/* Category Badge */}
                <span
                  className={`absolute top-4 left-4 px-3 py-1 rounded-full text-xs font-medium ${
                    hc ? "bg-yellow-400 text-black" : "bg-white/90 text-[#B8945A] border border-[#B8945A]/30"
                  }`}
                >
                  {artifact.category}
                </span>

                {/* Zoom hint */}
                <div
                  className={`absolute bottom-4 right-4 flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs ${
                    hc ? "bg-black/80 text-yellow-400" : "bg-white/80 text-[#6B6560]"
                  }`}
                  aria-hidden="true"
                >
                  <ZoomIn size={13} />
                  {zoomed ? "Click to zoom out" : "Click to zoom in"}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-3 mt-4">
                <button
                  onClick={() => setBookmarked((v) => !v)}
                  className={`flex items-center gap-2 flex-1 justify-center px-4 py-2.5 rounded-xl border text-sm font-medium transition-all duration-200 ${
                    bookmarked
                      ? hc
                        ? "bg-yellow-400 border-yellow-400 text-black"
                        : "bg-[#B8945A] border-[#B8945A] text-white"
                      : hc
                      ? "border-yellow-400/30 text-yellow-400 hover:bg-yellow-400/10"
                      : "border-[#E8E4DF] text-[#6B6560] hover:bg-[#F5F1EC]"
                  }`}
                  aria-pressed={bookmarked}
                  aria-label={bookmarked ? "Remove bookmark" : "Bookmark this artifact"}
                >
                  <Bookmark size={15} aria-hidden="true" />
                  {bookmarked
                    ? lang === "filipino"
                      ? "Naka-bookmark"
                      : "Bookmarked"
                    : lang === "filipino"
                    ? "I-bookmark"
                    : "Bookmark"}
                </button>

                {settings.audioGuide && (
                  <button
                    className={`flex items-center gap-2 flex-1 justify-center px-4 py-2.5 rounded-xl border text-sm font-medium transition-colors ${
                      hc
                        ? "border-yellow-400/30 text-yellow-400 hover:bg-yellow-400/10"
                        : "border-[#E8E4DF] text-[#6B6560] hover:bg-[#F5F1EC]"
                    }`}
                    aria-label="Play audio guide for this artifact"
                  >
                    <Volume2 size={15} aria-hidden="true" />
                    {lang === "filipino" ? "Audio Guide" : "Audio Guide"}
                  </button>
                )}

                <button
                  className={`p-2.5 rounded-xl border transition-colors ${
                    hc
                      ? "border-yellow-400/30 text-yellow-400 hover:bg-yellow-400/10"
                      : "border-[#E8E4DF] text-[#6B6560] hover:bg-[#F5F1EC]"
                  }`}
                  aria-label="Share this artifact"
                  onClick={() => {
                    if (navigator.share) {
                      navigator.share({ title: artifact.title, url: window.location.href });
                    }
                  }}
                >
                  <Share2 size={15} />
                </button>
              </div>
            </div>
          </motion.div>

          {/* Detail Content */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
          >
            {/* Title & Header */}
            <div className="mb-6">
              <h1
                className={`mb-3 ${hc ? "text-yellow-400" : "text-[#1C1917]"}`}
                style={{ fontSize: "clamp(1.5rem, 3vw, 2rem)", fontWeight: 600, lineHeight: 1.2 }}
              >
                {artifact.title}
              </h1>
              <div className="flex items-center gap-3 flex-wrap">
                <span
                  className={`px-3 py-1 rounded-full text-xs font-medium border ${
                    hc
                      ? "border-yellow-400 text-yellow-400"
                      : "border-[#B8945A]/40 text-[#B8945A] bg-[#B8945A]/5"
                  }`}
                >
                  {artifact.category}
                </span>
                <span className={`text-sm ${hc ? "text-gray-400" : "text-[#ABA89F]"}`}>
                  {artifact.period}
                </span>
              </div>
            </div>

            {/* Full Description */}
            <div className={`mb-8 rounded-xl p-6 border ${
              hc ? "border-yellow-400/20 bg-yellow-400/5" : "border-[#F0ECE6] bg-white"
            }`}>
              <h2
                className={`mb-3 text-sm font-semibold uppercase tracking-wider ${
                  hc ? "text-yellow-400" : "text-[#B8945A]"
                }`}
              >
                {lang === "filipino" ? "Paglalarawan" : "Description"}
              </h2>
              <p
                className={`text-sm leading-loose ${hc ? "text-gray-300" : "text-[#4A4641]"}`}
              >
                {artifact.fullDescription}
              </p>

              {/* Captions / transcript area */}
              {settings.captions && (
                <div
                  className={`mt-4 pt-4 border-t text-xs ${
                    hc ? "border-yellow-400/20 text-gray-500" : "border-[#F0ECE6] text-[#ABA89F]"
                  }`}
                  role="complementary"
                  aria-label="Transcript"
                >
                  <span className="font-semibold block mb-1">
                    [{lang === "filipino" ? "Transkripsyon" : "Transcript"}]
                  </span>
                  {artifact.fullDescription}
                </div>
              )}
            </div>

            {/* Metadata */}
            <div>
              <h2
                className={`text-sm font-semibold uppercase tracking-wider mb-4 ${
                  hc ? "text-yellow-400" : "text-[#B8945A]"
                }`}
              >
                {lang === "filipino" ? "Detalye ng Artefakto" : "Artifact Details"}
              </h2>
              <dl className="flex flex-col gap-3">
                {metadata.map(({ icon: Icon, label, value }) => (
                  <div
                    key={label}
                    className={`flex gap-3 p-3.5 rounded-xl border ${
                      hc
                        ? "border-yellow-400/15 bg-yellow-400/5"
                        : "border-[#F0ECE6] bg-white"
                    }`}
                  >
                    <div
                      className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5 ${
                        hc ? "bg-yellow-400/20 text-yellow-400" : "bg-[#F5F1EC] text-[#B8945A]"
                      }`}
                      aria-hidden="true"
                    >
                      <Icon size={14} />
                    </div>
                    <div className="min-w-0">
                      <dt
                        className={`text-xs font-semibold uppercase tracking-wide mb-0.5 ${
                          hc ? "text-gray-500" : "text-[#ABA89F]"
                        }`}
                      >
                        {label}
                      </dt>
                      <dd
                        className={`text-sm leading-relaxed ${
                          hc ? "text-gray-300" : "text-[#4A4641]"
                        }`}
                      >
                        {value}
                      </dd>
                    </div>
                  </div>
                ))}
              </dl>
            </div>

            {/* Back Button */}
            <div className="mt-8">
              <Link
                to="/gallery"
                className={`inline-flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-medium transition-all duration-200 ${
                  hc
                    ? "border border-yellow-400 text-yellow-400 hover:bg-yellow-400 hover:text-black"
                    : "bg-[#1C1917] text-white hover:bg-[#2D2926]"
                }`}
              >
                <ArrowLeft size={16} aria-hidden="true" />
                {lang === "filipino" ? "Bumalik sa Galería" : "Back to Gallery"}
              </Link>
            </div>
          </motion.div>
        </div>

        {/* Related Artifacts */}
        {moreRelated.length > 0 && (
          <section
            className={`mt-20 pt-10 border-t ${
              hc ? "border-yellow-400/20" : "border-[#E8E4DF]"
            }`}
            aria-labelledby="related-heading"
          >
            <div className="flex items-end justify-between mb-8">
              <div>
                <span
                  className={`text-xs font-semibold tracking-widest uppercase mb-1 block ${
                    hc ? "text-yellow-400" : "text-[#B8945A]"
                  }`}
                >
                  {lang === "filipino" ? "Maaari Ring Gusto Mo" : "You Might Also Like"}
                </span>
                <h2 className={hc ? "text-yellow-400" : "text-[#1C1917]"}>
                  {lang === "filipino" ? "Mga Kaugnay na Artefakto" : "Related Artifacts"}
                </h2>
              </div>
              <Link
                to="/gallery"
                className={`text-sm font-medium transition-colors ${
                  hc ? "text-yellow-400 hover:text-yellow-300" : "text-[#B8945A] hover:text-[#A07D47]"
                }`}
              >
                {lang === "filipino" ? "Tingnan Lahat" : "View All"}
              </Link>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {moreRelated.map((rel, i) => (
                <ArtifactCard key={rel.id} artifact={rel} index={i} />
              ))}
            </div>
          </section>
        )}
      </div>
    </main>
  );
}
