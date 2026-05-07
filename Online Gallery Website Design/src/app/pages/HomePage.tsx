import { Link } from "react-router";
import { motion } from "motion/react";
import { ArrowRight, BookOpen, Search, Users, Headphones } from "lucide-react";
import { artifacts } from "../data/artifacts";
import { ArtifactCard } from "../components/ArtifactCard";
import { useAccessibility } from "../context/AccessibilityContext";

export function HomePage() {
  const { settings } = useAccessibility();
  const hc = settings.highContrast;
  const lang = settings.language;
  const featured = artifacts.filter((a) => a.featured).slice(0, 4);

  const stats = [
    {
      value: "240+",
      label: lang === "filipino" ? "Mga Artefakto" : "Artifacts",
      labelDetail: lang === "filipino" ? "Sa aming koleksyon" : "In our collection",
    },
    {
      value: "12",
      label: lang === "filipino" ? "Mga Kategorya" : "Categories",
      labelDetail: lang === "filipino" ? "Iba't ibang uri" : "Diverse types",
    },
    {
      value: "800+",
      label: lang === "filipino" ? "Taon ng Kasaysayan" : "Years of History",
      labelDetail: lang === "filipino" ? "Mula ika-9 siglo" : "From the 9th century",
    },
    {
      value: "Free",
      label: lang === "filipino" ? "Libreng Access" : "Free Access",
      labelDetail: lang === "filipino" ? "Para sa lahat" : "For everyone",
    },
  ];

  const features = [
    {
      icon: Search,
      title: lang === "filipino" ? "Madaling Paghahanap" : "Easy Discovery",
      desc:
        lang === "filipino"
          ? "Maghanap at mag-filter ng mga artefakto ayon sa kategorya, panahon, o pinagmulan."
          : "Search and filter artifacts by category, period, or origin with ease.",
    },
    {
      icon: BookOpen,
      title: lang === "filipino" ? "Malalim na Impormasyon" : "Rich Information",
      desc:
        lang === "filipino"
          ? "Bawat artefakto ay may detalyadong paglalarawan, kasaysayan, at kultural na kahulugan."
          : "Every artifact features detailed descriptions, history, and cultural significance.",
    },
    {
      icon: Headphones,
      title: lang === "filipino" ? "Gabay sa Audio" : "Audio Guidance",
      desc:
        lang === "filipino"
          ? "Pakinggan ang mga kwento sa likod ng bawat piraso sa pamamagitan ng aming audio guide."
          : "Listen to the stories behind each piece through our audio guide feature.",
    },
    {
      icon: Users,
      title: lang === "filipino" ? "Inclusive na Disenyo" : "Inclusive Design",
      desc:
        lang === "filipino"
          ? "Dinisenyo para sa lahat — may mga opsyon para sa accessibility at maraming wika."
          : "Designed for everyone — with accessibility options and multiple language support.",
    },
  ];

  return (
    <main id="main-content" tabIndex={-1}>
      {/* Hero */}
      <section
        className={`relative overflow-hidden ${
          hc ? "bg-black" : "bg-[#1C1917]"
        }`}
        aria-labelledby="hero-heading"
      >
        {/* Background image with overlay */}
        <div className="absolute inset-0">
          <img
            src="https://images.unsplash.com/photo-1772990914935-a2c506de480c?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxtdXNldW0lMjBnYWxsZXJ5JTIwaW50ZXJpb3IlMjBleGhpYml0aW9uJTIwaGFsbHxlbnwxfHx8fDE3NzgxNzI5MzB8MA&ixlib=rb-4.1.0&q=80&w=1080"
            alt=""
            className="w-full h-full object-cover opacity-20"
            aria-hidden="true"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-[#1C1917]/80 via-[#1C1917]/60 to-[#1C1917]" />
        </div>

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-28 lg:py-36">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7 }}
            className="max-w-3xl"
          >
            <span
              className={`inline-block text-xs font-semibold tracking-widest uppercase mb-6 px-3 py-1.5 rounded-full border ${
                hc
                  ? "border-yellow-400 text-yellow-400"
                  : "border-[#B8945A]/50 text-[#B8945A]"
              }`}
            >
              {lang === "filipino"
                ? "Pambansang Digital na Museo"
                : "National Digital Museum"}
            </span>

            <h1
              id="hero-heading"
              className="text-white mb-6"
              style={{ fontSize: "clamp(2rem, 5vw, 3.5rem)", lineHeight: 1.15, fontWeight: 600 }}
            >
              {lang === "filipino" ? (
                <>
                  Tuklasin ang{" "}
                  <span className={hc ? "text-yellow-400" : "text-[#B8945A]"}>
                    Pamana
                  </span>{" "}
                  ng Ating Kultura
                </>
              ) : (
                <>
                  Explore Our{" "}
                  <span className={hc ? "text-yellow-400" : "text-[#B8945A]"}>
                    Cultural Heritage
                  </span>{" "}
                  Collection
                </>
              )}
            </h1>

            <p className="text-[#D4CFC9] text-lg leading-relaxed mb-10 max-w-2xl">
              {lang === "filipino"
                ? "Bisitahin ang aming online na galería at tuklasin ang daan-daang artefakto na nagkukuwento ng ating kasaysayan, kultura, at pagkakakilanlan."
                : "Browse hundreds of curated artifacts that tell the story of our shared history, cultural traditions, and collective identity — available to everyone, anywhere."}
            </p>

            <div className="flex flex-wrap gap-4">
              <Link
                to="/gallery"
                className={`flex items-center gap-2 px-7 py-3.5 rounded-lg font-medium transition-all duration-200 ${
                  hc
                    ? "bg-yellow-400 text-black hover:bg-yellow-300"
                    : "bg-[#B8945A] text-white hover:bg-[#A07D47] hover:shadow-lg hover:shadow-[#B8945A]/30"
                }`}
              >
                {lang === "filipino" ? "Bisitahin ang Galería" : "Browse Gallery"}
                <ArrowRight size={17} aria-hidden="true" />
              </Link>
              <Link
                to="/categories"
                className={`flex items-center gap-2 px-7 py-3.5 rounded-lg font-medium border transition-all duration-200 ${
                  hc
                    ? "border-yellow-400 text-yellow-400 hover:bg-yellow-400 hover:text-black"
                    : "border-white/30 text-white hover:bg-white/10"
                }`}
              >
                {lang === "filipino" ? "Mga Kategorya" : "View Categories"}
              </Link>
            </div>
          </motion.div>
        </div>

        {/* Stats Row */}
        <div
          className={`relative border-t ${hc ? "border-yellow-400/20" : "border-white/10"}`}
        >
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 lg:gap-8">
              {stats.map((stat, i) => (
                <div key={i} className="text-center">
                  <div
                    className={`text-2xl font-bold mb-1 ${
                      hc ? "text-yellow-400" : "text-[#B8945A]"
                    }`}
                    style={{ fontSize: "1.75rem" }}
                  >
                    {stat.value}
                  </div>
                  <div className="text-white text-sm font-medium">{stat.label}</div>
                  <div className="text-[#8A857E] text-xs mt-0.5">{stat.labelDetail}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Featured Artifacts */}
      <section
        className={`py-20 px-4 sm:px-6 lg:px-8 ${hc ? "bg-black" : "bg-[#FAFAF7]"}`}
        aria-labelledby="featured-heading"
      >
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-10 gap-4">
            <div>
              <span
                className={`text-xs font-semibold tracking-widest uppercase mb-2 block ${
                  hc ? "text-yellow-400" : "text-[#B8945A]"
                }`}
              >
                {lang === "filipino" ? "Mga Tampok" : "Featured"}
              </span>
              <h2 id="featured-heading" className={hc ? "text-yellow-400" : "text-[#1C1917]"}>
                {lang === "filipino" ? "Mga Napiling Artefakto" : "Selected Artifacts"}
              </h2>
              <p className={`mt-2 text-sm ${hc ? "text-gray-400" : "text-[#6B6560]"}`}>
                {lang === "filipino"
                  ? "Mga espesyal na piraso mula sa aming koleksyon"
                  : "Specially curated pieces from our collection"}
              </p>
            </div>
            <Link
              to="/gallery"
              className={`flex items-center gap-2 text-sm font-medium transition-colors ${
                hc ? "text-yellow-400 hover:text-yellow-300" : "text-[#B8945A] hover:text-[#A07D47]"
              }`}
            >
              {lang === "filipino" ? "Tingnan Lahat" : "View All"}
              <ArrowRight size={15} aria-hidden="true" />
            </Link>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {featured.map((artifact, i) => (
              <ArtifactCard key={artifact.id} artifact={artifact} index={i} />
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section
        className={`py-20 px-4 sm:px-6 lg:px-8 border-t ${
          hc ? "bg-black border-yellow-400/20" : "bg-white border-[#F0ECE6]"
        }`}
        aria-labelledby="features-heading"
      >
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-14">
            <span
              className={`text-xs font-semibold tracking-widest uppercase mb-2 block ${
                hc ? "text-yellow-400" : "text-[#B8945A]"
              }`}
            >
              {lang === "filipino" ? "Bakit Kami" : "Why Choose Us"}
            </span>
            <h2 id="features-heading" className={hc ? "text-yellow-400" : "text-[#1C1917]"}>
              {lang === "filipino"
                ? "Isang Galería Para sa Lahat"
                : "A Gallery Built For Everyone"}
            </h2>
            <p
              className={`mt-3 text-sm max-w-xl mx-auto ${
                hc ? "text-gray-400" : "text-[#6B6560]"
              }`}
            >
              {lang === "filipino"
                ? "Dinisenyo namin ito para maging accessible, informative, at maganda para sa bawat bisita."
                : "Designed to be accessible, informative, and beautiful for every visitor."}
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
            {features.map((feature, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: i * 0.1 }}
                className={`p-6 rounded-xl border ${
                  hc
                    ? "border-yellow-400/30 bg-black"
                    : "border-[#F0ECE6] bg-[#FAFAF7]"
                }`}
              >
                <div
                  className={`w-11 h-11 rounded-lg flex items-center justify-center mb-4 ${
                    hc ? "bg-yellow-400/20 text-yellow-400" : "bg-[#B8945A]/10 text-[#B8945A]"
                  }`}
                  aria-hidden="true"
                >
                  <feature.icon size={20} />
                </div>
                <h3
                  className={`mb-2 ${hc ? "text-yellow-400" : "text-[#1C1917]"}`}
                  style={{ fontSize: "1rem" }}
                >
                  {feature.title}
                </h3>
                <p className={`text-sm leading-relaxed ${hc ? "text-gray-400" : "text-[#6B6560]"}`}>
                  {feature.desc}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section
        className={`py-20 px-4 sm:px-6 lg:px-8 ${
          hc ? "bg-yellow-400" : "bg-[#B8945A]"
        }`}
        aria-labelledby="cta-heading"
      >
        <div className="max-w-3xl mx-auto text-center">
          <h2
            id="cta-heading"
            className={hc ? "text-black" : "text-white"}
            style={{ fontSize: "clamp(1.5rem, 3vw, 2rem)", fontWeight: 600, lineHeight: 1.3 }}
          >
            {lang === "filipino"
              ? "Simulan ang Iyong Paglalakbay sa Kasaysayan"
              : "Begin Your Journey Through History"}
          </h2>
          <p
            className={`mt-4 text-base leading-relaxed mb-8 ${
              hc ? "text-black/80" : "text-white/85"
            }`}
          >
            {lang === "filipino"
              ? "Libu-libong artefakto ang naghihintay sa iyo. Tuklasin ang kultura at kasaysayan natin nang libre."
              : "Hundreds of artifacts await your exploration. Discover our culture and history — completely free."}
          </p>
          <Link
            to="/gallery"
            className={`inline-flex items-center gap-2 px-8 py-3.5 rounded-lg font-medium transition-all duration-200 ${
              hc
                ? "bg-black text-yellow-400 hover:bg-gray-900"
                : "bg-white text-[#B8945A] hover:bg-[#FAFAF7] hover:shadow-lg"
            }`}
          >
            {lang === "filipino" ? "Bisitahin ang Galería" : "Explore the Gallery"}
            <ArrowRight size={17} aria-hidden="true" />
          </Link>
        </div>
      </section>
    </main>
  );
}