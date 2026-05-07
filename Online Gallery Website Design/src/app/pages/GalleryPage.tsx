import { useState, useMemo, useEffect } from "react";
import { useSearchParams } from "react-router";
import { Search, SlidersHorizontal, X, Grid3X3, LayoutList } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { artifacts, categories } from "../data/artifacts";
import { ArtifactCard } from "../components/ArtifactCard";
import { useAccessibility } from "../context/AccessibilityContext";

export function GalleryPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [searchQuery, setSearchQuery] = useState(searchParams.get("search") || "");
  const [activeCategory, setActiveCategory] = useState("All Artifacts");
  const [sortBy, setSortBy] = useState("default");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const { settings } = useAccessibility();
  const hc = settings.highContrast;
  const lang = settings.language;

  useEffect(() => {
    const search = searchParams.get("search");
    if (search) setSearchQuery(search);
  }, [searchParams]);

  const filteredArtifacts = useMemo(() => {
    let result = [...artifacts];

    if (activeCategory !== "All Artifacts") {
      result = result.filter((a) => a.category === activeCategory);
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (a) =>
          a.title.toLowerCase().includes(q) ||
          a.shortDescription.toLowerCase().includes(q) ||
          a.category.toLowerCase().includes(q) ||
          a.origin.toLowerCase().includes(q) ||
          a.period.toLowerCase().includes(q)
      );
    }

    if (sortBy === "az") result.sort((a, b) => a.title.localeCompare(b.title));
    if (sortBy === "za") result.sort((a, b) => b.title.localeCompare(a.title));
    if (sortBy === "period") result.sort((a, b) => a.period.localeCompare(b.period));

    return result;
  }, [activeCategory, searchQuery, sortBy]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setSearchParams(searchQuery ? { search: searchQuery } : {});
  };

  const clearSearch = () => {
    setSearchQuery("");
    setSearchParams({});
  };

  return (
    <main id="main-content" className={`min-h-screen ${hc ? "bg-black" : "bg-[#FAFAF7]"}`}>
      {/* Page Header */}
      <section
        className={`border-b py-12 px-4 sm:px-6 lg:px-8 ${
          hc ? "bg-black border-yellow-400/20" : "bg-white border-[#E8E4DF]"
        }`}
        aria-labelledby="gallery-heading"
      >
        <div className="max-w-7xl mx-auto">
          <span
            className={`text-xs font-semibold tracking-widest uppercase mb-2 block ${
              hc ? "text-yellow-400" : "text-[#B8945A]"
            }`}
          >
            {lang === "filipino" ? "Koleksyon" : "Collection"}
          </span>
          <h1 id="gallery-heading" className={hc ? "text-yellow-400" : "text-[#1C1917]"}>
            {lang === "filipino" ? "Online Galería" : "Online Gallery"}
          </h1>
          <p className={`mt-2 max-w-2xl ${hc ? "text-gray-400" : "text-[#6B6560]"}`}>
            {lang === "filipino"
              ? "Tuklasin ang aming koleksyon ng mga artefakto at alamin ang kanilang kasaysayan at kultural na kahalagahan."
              : "Explore our curated collection of artifacts and learn about their historical and cultural significance."}
          </p>

          {/* Search */}
          <form onSubmit={handleSearch} className="mt-6 max-w-lg" role="search">
            <label htmlFor="gallery-search" className="sr-only">
              {lang === "filipino" ? "Maghanap ng artefakto" : "Search artifacts"}
            </label>
            <div className="relative">
              <Search
                size={17}
                className={`absolute left-3.5 top-1/2 -translate-y-1/2 ${
                  hc ? "text-yellow-400" : "text-[#ABA89F]"
                }`}
                aria-hidden="true"
              />
              <input
                id="gallery-search"
                type="search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={
                  lang === "filipino"
                    ? "Maghanap ng artefakto, kategorya, o pinagmulan..."
                    : "Search artifacts, category, or origin..."
                }
                className={`w-full pl-10 pr-10 py-3 rounded-xl border text-sm outline-none transition-colors ${
                  hc
                    ? "bg-black border-yellow-400 text-white placeholder-gray-500 focus:border-yellow-300"
                    : "bg-white border-[#E8E4DF] text-[#1C1917] placeholder-[#ABA89F] focus:border-[#B8945A]"
                }`}
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={clearSearch}
                  className={`absolute right-3.5 top-1/2 -translate-y-1/2 ${
                    hc ? "text-gray-500 hover:text-yellow-400" : "text-[#ABA89F] hover:text-[#6B6560]"
                  }`}
                  aria-label="Clear search"
                >
                  <X size={16} />
                </button>
              )}
            </div>
          </form>
        </div>
      </section>

      {/* Filters & Controls */}
      <div
        className={`sticky top-16 z-30 border-b ${
          hc ? "bg-black border-yellow-400/20" : "bg-[#FAFAF7] border-[#E8E4DF]"
        }`}
        role="toolbar"
        aria-label="Filter and view controls"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
          <div className="flex items-center gap-3 overflow-x-auto scrollbar-none">
            {/* Category Tabs */}
            <div
              className="flex items-center gap-2 flex-1 overflow-x-auto scrollbar-none"
              role="tablist"
              aria-label="Filter by category"
            >
              {categories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setActiveCategory(cat)}
                  role="tab"
                  aria-selected={activeCategory === cat}
                  className={`flex-shrink-0 px-3.5 py-1.5 rounded-full text-sm font-medium transition-all duration-200 ${
                    activeCategory === cat
                      ? hc
                        ? "bg-yellow-400 text-black"
                        : "bg-[#B8945A] text-white"
                      : hc
                      ? "border border-yellow-400/30 text-gray-300 hover:border-yellow-400 hover:text-yellow-400"
                      : "border border-[#E8E4DF] text-[#6B6560] hover:border-[#B8945A]/50 hover:text-[#1C1917] bg-white"
                  }`}
                >
                  {cat === "All Artifacts" && lang === "filipino" ? "Lahat" : cat}
                </button>
              ))}
            </div>

            {/* Divider */}
            <div
              className={`h-6 w-px flex-shrink-0 ${hc ? "bg-yellow-400/20" : "bg-[#E8E4DF]"}`}
              aria-hidden="true"
            />

            {/* Sort */}
            <div className="flex-shrink-0 flex items-center gap-2">
              <SlidersHorizontal
                size={15}
                className={hc ? "text-yellow-400" : "text-[#ABA89F]"}
                aria-hidden="true"
              />
              <label htmlFor="sort-select" className="sr-only">
                Sort artifacts
              </label>
              <select
                id="sort-select"
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className={`text-sm rounded-lg px-2 py-1.5 border outline-none transition-colors ${
                  hc
                    ? "bg-black border-yellow-400/30 text-white"
                    : "bg-white border-[#E8E4DF] text-[#6B6560]"
                }`}
                aria-label="Sort artifacts"
              >
                <option value="default">
                  {lang === "filipino" ? "Karaniwan" : "Default"}
                </option>
                <option value="az">A – Z</option>
                <option value="za">Z – A</option>
                <option value="period">
                  {lang === "filipino" ? "Ayon sa Panahon" : "By Period"}
                </option>
              </select>
            </div>

            {/* View Toggle */}
            <div
              className={`flex-shrink-0 flex items-center rounded-lg border overflow-hidden ${
                hc ? "border-yellow-400/30" : "border-[#E8E4DF]"
              }`}
              role="group"
              aria-label="View mode"
            >
              <button
                onClick={() => setViewMode("grid")}
                className={`p-2 transition-colors ${
                  viewMode === "grid"
                    ? hc
                      ? "bg-yellow-400 text-black"
                      : "bg-[#B8945A] text-white"
                    : hc
                    ? "text-gray-400 hover:text-yellow-400"
                    : "text-[#ABA89F] hover:text-[#6B6560] bg-white"
                }`}
                aria-pressed={viewMode === "grid"}
                aria-label="Grid view"
              >
                <Grid3X3 size={15} />
              </button>
              <button
                onClick={() => setViewMode("list")}
                className={`p-2 transition-colors ${
                  viewMode === "list"
                    ? hc
                      ? "bg-yellow-400 text-black"
                      : "bg-[#B8945A] text-white"
                    : hc
                    ? "text-gray-400 hover:text-yellow-400"
                    : "text-[#ABA89F] hover:text-[#6B6560] bg-white"
                }`}
                aria-pressed={viewMode === "list"}
                aria-label="List view"
              >
                <LayoutList size={15} />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Gallery Grid */}
      <section
        className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10"
        aria-label="Artifact collection"
      >
        {/* Results Count */}
        <div className="flex items-center justify-between mb-6">
          <p
            className={`text-sm ${hc ? "text-gray-400" : "text-[#6B6560]"}`}
            role="status"
            aria-live="polite"
          >
            {lang === "filipino"
              ? `${filteredArtifacts.length} artefakto ang natagpuan`
              : `${filteredArtifacts.length} artifact${filteredArtifacts.length !== 1 ? "s" : ""} found`}
            {activeCategory !== "All Artifacts" && (
              <span className={`ml-2 px-2 py-0.5 rounded-full text-xs ${
                hc ? "bg-yellow-400/20 text-yellow-400" : "bg-[#B8945A]/10 text-[#B8945A]"
              }`}>
                {activeCategory}
              </span>
            )}
          </p>

          {(searchQuery || activeCategory !== "All Artifacts") && (
            <button
              onClick={() => {
                clearSearch();
                setActiveCategory("All Artifacts");
              }}
              className={`text-sm flex items-center gap-1 transition-colors ${
                hc ? "text-yellow-400 hover:text-yellow-300" : "text-[#B8945A] hover:text-[#A07D47]"
              }`}
            >
              <X size={14} aria-hidden="true" />
              {lang === "filipino" ? "I-clear ang Filter" : "Clear filters"}
            </button>
          )}
        </div>

        <AnimatePresence mode="wait">
          {filteredArtifacts.length === 0 ? (
            <motion.div
              key="empty"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="text-center py-24"
              role="status"
            >
              <div
                className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 ${
                  hc ? "bg-yellow-400/10" : "bg-[#F5F1EC]"
                }`}
              >
                <Search
                  size={24}
                  className={hc ? "text-yellow-400" : "text-[#B8945A]"}
                  aria-hidden="true"
                />
              </div>
              <h3 className={`mb-2 ${hc ? "text-yellow-400" : "text-[#1C1917]"}`}>
                {lang === "filipino" ? "Walang Natagpuan" : "No Artifacts Found"}
              </h3>
              <p className={`text-sm ${hc ? "text-gray-400" : "text-[#6B6560]"}`}>
                {lang === "filipino"
                  ? "Subukan ang ibang keyword o i-clear ang filter."
                  : "Try a different search term or clear the filters."}
              </p>
            </motion.div>
          ) : viewMode === "grid" ? (
            <motion.div
              key="grid"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6"
            >
              {filteredArtifacts.map((artifact, i) => (
                <ArtifactCard key={artifact.id} artifact={artifact} index={i} />
              ))}
            </motion.div>
          ) : (
            <motion.div
              key="list"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col gap-4"
            >
              {filteredArtifacts.map((artifact, i) => (
                <motion.div
                  key={artifact.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.04 }}
                >
                  <a
                    href={`/artifact/${artifact.id}`}
                    className={`flex gap-5 p-4 rounded-xl border group transition-all duration-200 ${
                      hc
                        ? "bg-black border-yellow-400/30 hover:border-yellow-400"
                        : "bg-white border-[#E8E4DF] hover:border-[#B8945A]/40 hover:shadow-md"
                    }`}
                    aria-label={`View details for ${artifact.title}`}
                  >
                    <img
                      src={artifact.image}
                      alt={artifact.title}
                      className="w-20 h-20 sm:w-24 sm:h-24 object-cover rounded-lg flex-shrink-0"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2 flex-wrap">
                        <h3
                          className={`line-clamp-1 ${hc ? "text-yellow-400" : "text-[#1C1917]"}`}
                          style={{ fontSize: "1rem" }}
                        >
                          {artifact.title}
                        </h3>
                        <span
                          className={`text-xs px-2 py-0.5 rounded-full flex-shrink-0 ${
                            hc
                              ? "bg-yellow-400/20 text-yellow-400"
                              : "bg-[#F5F1EC] text-[#B8945A]"
                          }`}
                        >
                          {artifact.category}
                        </span>
                      </div>
                      <p
                        className={`text-sm mt-1 line-clamp-2 ${
                          hc ? "text-gray-400" : "text-[#6B6560]"
                        }`}
                      >
                        {artifact.shortDescription}
                      </p>
                      <p
                        className={`text-xs mt-2 ${hc ? "text-gray-500" : "text-[#ABA89F]"}`}
                      >
                        {artifact.period} · {artifact.origin.split(",")[0]}
                      </p>
                    </div>
                  </a>
                </motion.div>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </section>
    </main>
  );
}
