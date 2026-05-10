import { useState } from "react";
import { ArrowRight, Clock, Tag, ChevronRight, Megaphone, GraduationCap, Users2, Sparkles } from "lucide-react";

const highlights = [
  {
    id: 1,
    category: "Museum Programs",
    categoryIcon: <Sparkles size={11} />,
    categoryColor: "#1E3A5F",
    categoryBg: "rgba(30, 58, 95, 0.1)",
    title: "Heritage Walk: Rediscovering Our Roots",
    excerpt:
      "Join our guided immersive walk through the archaeological site where local guides share the living history of the community and its ancestors.",
    date: "May 8, 2026",
    readTime: "3 min read",
    image:
      "https://images.unsplash.com/photo-1773601104029-24b985b7f460?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxoZXJpdGFnZSUyMHNpdGUlMjBhbmNpZW50JTIwcnVpbnMlMjBjdWx0dXJlfGVufDF8fHx8MTc3ODQxODg3N3ww&ixlib=rb-4.1.0&q=80&w=600",
    featured: true,
  },
  {
    id: 2,
    category: "School Engagement",
    categoryIcon: <GraduationCap size={11} />,
    categoryColor: "#C5973A",
    categoryBg: "rgba(197, 151, 58, 0.1)",
    title: "School Partnership Program Expands to 65 Schools",
    excerpt:
      "Our annual school engagement program has reached a milestone, connecting over 65 local schools with our heritage resources and on-site educational activities.",
    date: "May 5, 2026",
    readTime: "4 min read",
    image:
      "https://images.unsplash.com/photo-1758270704524-596810e891b5?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxzdHVkZW50cyUyMGNsYXNzcm9vbSUyMGxlYXJuaW5nJTIwZWR1Y2F0aW9ufGVufDF8fHx8MTc3ODQxODg3NHww&ixlib=rb-4.1.0&q=80&w=600",
    featured: false,
  },
  {
    id: 3,
    category: "Public Activity",
    categoryIcon: <Users2 size={11} />,
    categoryColor: "#16A34A",
    categoryBg: "rgba(22, 163, 74, 0.1)",
    title: "Community Day Celebration Draws 2,400 Visitors",
    excerpt:
      "Last month's Community Day was a vibrant success, featuring local performers, craft workshops, storytelling sessions, and guided heritage tours for all ages.",
    date: "Apr 28, 2026",
    readTime: "5 min read",
    image:
      "https://images.unsplash.com/photo-1768776179834-93e6cafc6d97?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxjb21tdW5pdHklMjBnYXRoZXJpbmclMjBwZW9wbGUlMjBvdXRkb29yJTIwZXZlbnR8ZW58MXx8fHwxNzc4NDE4ODc0fDA&ixlib=rb-4.1.0&q=80&w=600",
    featured: false,
  },
  {
    id: 4,
    category: "Public Advisory",
    categoryIcon: <Megaphone size={11} />,
    categoryColor: "#DC2626",
    categoryBg: "rgba(220, 38, 38, 0.08)",
    title: "Advisory: New Visitor Guidelines for Heritage Zone B",
    excerpt:
      "Effective June 1, 2026, visitors to Heritage Zone B are reminded to follow updated access protocols to protect the newly excavated pre-colonial artifacts.",
    date: "Apr 22, 2026",
    readTime: "2 min read",
    image:
      "https://images.unsplash.com/photo-1763224810010-4e5d23f261af?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxtdXNldW0lMjBjb21tdW5pdHklMjBoZXJpdGFnZSUyMGV2ZW50fGVufDF8fHx8MTc3ODQxODg3M3ww&ixlib=rb-4.1.0&q=80&w=600",
    featured: false,
  },
  {
    id: 5,
    category: "Museum Programs",
    categoryIcon: <Sparkles size={11} />,
    categoryColor: "#1E3A5F",
    categoryBg: "rgba(30, 58, 95, 0.1)",
    title: "Youth Heritage Ambassadors Program – Applications Open",
    excerpt:
      "We are proud to open applications for our Youth Heritage Ambassadors, inviting students aged 15–22 to be trained as community educators and heritage advocates.",
    date: "Apr 15, 2026",
    readTime: "3 min read",
    image:
      "https://images.unsplash.com/photo-1759409972741-57859a437f41?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxjb21tdW5pdHklMjBzdG9yaWVzJTIwbWVtb3JpZXMlMjBmYW1pbHklMjBwaG90b3N8ZW58MXx8fHwxNzc4NDE4ODc3fDA&ixlib=rb-4.1.0&q=80&w=600",
    featured: false,
  },
  {
    id: 6,
    category: "Public Activity",
    categoryIcon: <Users2 size={11} />,
    categoryColor: "#16A34A",
    categoryBg: "rgba(22, 163, 74, 0.1)",
    title: "Family History Documentation Drive This June",
    excerpt:
      "Bring your old family photographs and documents to the museum this June. Our team will help digitize and archive them for the community record.",
    date: "Apr 10, 2026",
    readTime: "3 min read",
    image:
      "https://images.unsplash.com/photo-1768776179834-93e6cafc6d97?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxjb21tdW5pdHklMjBnYXRoZXJpbmclMjBwZW9wbGUlMjBvdXRkb29yJTIwZXZlbnR8ZW58MXx8fHwxNzc4NDE4ODc0fDA&ixlib=rb-4.1.0&q=80&w=600",
    featured: false,
  },
];

const filterTabs = [
  { label: "All", value: "all" },
  { label: "Museum Programs", value: "Museum Programs" },
  { label: "School Engagement", value: "School Engagement" },
  { label: "Public Activity", value: "Public Activity" },
  { label: "Public Advisory", value: "Public Advisory" },
];

export function CommunityHighlights() {
  const [activeFilter, setActiveFilter] = useState("all");

  const filtered = highlights.filter(
    (h) => activeFilter === "all" || h.category === activeFilter
  );

  const featured = filtered.find((h) => h.featured);
  const rest = filtered.filter((h) => !h.featured);

  return (
    <section id="community-highlights" className="py-20 lg:py-28 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center max-w-2xl mx-auto mb-10">
          <span
            className="inline-block text-[#C5973A] text-xs uppercase tracking-widest mb-3"
            style={{ fontFamily: "'Inter', sans-serif", fontWeight: 600 }}
          >
            Community Highlights
          </span>
          <h2
            className="text-[#1E3A5F] mb-4"
            style={{
              fontFamily: "'Playfair Display', serif",
              fontWeight: 700,
              fontSize: "clamp(1.6rem, 3.5vw, 2.4rem)",
              lineHeight: 1.25,
            }}
          >
            Spotlight on Our Community
          </h2>
          <p
            className="text-[#6B7280]"
            style={{ fontFamily: "'Inter', sans-serif", fontSize: "0.97rem", lineHeight: 1.75 }}
          >
            Discover museum-led programs, community activities, and public advisories that connect
            our heritage site with teachers, students, and local visitors.
          </p>
        </div>

        {/* Filter Tabs */}
        <div className="flex flex-wrap justify-center gap-2 mb-10">
          {filterTabs.map((tab) => (
            <button
              key={tab.value}
              onClick={() => setActiveFilter(tab.value)}
              className={`px-4 py-2 rounded-full text-sm transition-all duration-200 ${
                activeFilter === tab.value
                  ? "text-white shadow-md"
                  : "text-[#6B7280] bg-[#F9F7F4] hover:bg-[#F0EBE4] border border-[#E8E0D5]"
              }`}
              style={{
                fontFamily: "'Inter', sans-serif",
                fontWeight: 500,
                ...(activeFilter === tab.value
                  ? { background: "linear-gradient(135deg, #1E3A5F, #2A5A8A)" }
                  : {}),
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content Grid */}
        {filtered.length === 0 ? (
          <div className="text-center py-16 text-[#9CA3AF]" style={{ fontFamily: "'Inter', sans-serif" }}>
            No highlights found for this category.
          </div>
        ) : (
          <>
            {/* Featured Card */}
            {featured && activeFilter === "all" && (
              <div className="mb-8 group rounded-2xl overflow-hidden border border-[#E8E0D5] bg-white hover:shadow-xl transition-all duration-300 hover:-translate-y-1 cursor-pointer">
                <div className="grid md:grid-cols-2">
                  <div className="relative h-60 md:h-full overflow-hidden">
                    <img
                      src={featured.image}
                      alt={featured.title}
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                    <div className="absolute inset-0" style={{ background: "linear-gradient(to right, rgba(15,30,50,0.3), transparent)" }} />
                    <span
                      className="absolute top-4 left-4 px-3 py-1 text-xs rounded-full"
                      style={{ background: "#C5973A", color: "white", fontFamily: "'Inter', sans-serif", fontWeight: 600 }}
                    >
                      ✦ Featured
                    </span>
                  </div>
                  <div className="p-8 flex flex-col justify-between">
                    <div>
                      <span
                        className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs mb-4"
                        style={{
                          background: featured.categoryBg,
                          color: featured.categoryColor,
                          fontFamily: "'Inter', sans-serif",
                          fontWeight: 600,
                        }}
                      >
                        {featured.categoryIcon}
                        {featured.category}
                      </span>
                      <h3
                        className="text-[#1E3A5F] mb-3"
                        style={{ fontFamily: "'Playfair Display', serif", fontWeight: 700, fontSize: "1.4rem", lineHeight: 1.3 }}
                      >
                        {featured.title}
                      </h3>
                      <p
                        className="text-[#6B7280] leading-relaxed text-sm"
                        style={{ fontFamily: "'Inter', sans-serif" }}
                      >
                        {featured.excerpt}
                      </p>
                    </div>
                    <div className="flex items-center justify-between mt-6 pt-5 border-t border-[#F0EBE4]">
                      <div className="flex items-center gap-3 text-xs text-[#9CA3AF]" style={{ fontFamily: "'Inter', sans-serif" }}>
                        <span className="flex items-center gap-1"><Clock size={12} />{featured.date}</span>
                        <span className="flex items-center gap-1"><Tag size={12} />{featured.readTime}</span>
                      </div>
                      <button
                        className="flex items-center gap-1.5 text-sm transition-all hover:gap-2.5"
                        style={{ color: "#1E3A5F", fontFamily: "'Inter', sans-serif", fontWeight: 600 }}
                      >
                        Read More <ArrowRight size={15} />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Cards Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {(activeFilter === "all" ? rest : filtered).map((item) => (
                <div
                  key={item.id}
                  className="group rounded-2xl overflow-hidden border border-[#E8E0D5] bg-white hover:shadow-xl transition-all duration-300 hover:-translate-y-1 cursor-pointer flex flex-col"
                >
                  <div className="relative h-48 overflow-hidden">
                    <img
                      src={item.image}
                      alt={item.title}
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                    <div className="absolute inset-0" style={{ background: "linear-gradient(to top, rgba(15,30,50,0.5), transparent 60%)" }} />
                  </div>
                  <div className="p-5 flex flex-col flex-1">
                    <span
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs mb-3 self-start"
                      style={{
                        background: item.categoryBg,
                        color: item.categoryColor,
                        fontFamily: "'Inter', sans-serif",
                        fontWeight: 600,
                      }}
                    >
                      {item.categoryIcon}
                      {item.category}
                    </span>
                    <h3
                      className="text-[#1E3A5F] mb-2.5 flex-1"
                      style={{ fontFamily: "'Playfair Display', serif", fontWeight: 600, fontSize: "1.05rem", lineHeight: 1.4 }}
                    >
                      {item.title}
                    </h3>
                    <p
                      className="text-[#6B7280] text-sm leading-relaxed mb-4"
                      style={{ fontFamily: "'Inter', sans-serif" }}
                    >
                      {item.excerpt.slice(0, 100)}...
                    </p>
                    <div className="flex items-center justify-between pt-4 border-t border-[#F0EBE4]">
                      <span className="flex items-center gap-1 text-xs text-[#9CA3AF]" style={{ fontFamily: "'Inter', sans-serif" }}>
                        <Clock size={11} /> {item.date}
                      </span>
                      <button
                        className="flex items-center gap-1 text-xs font-semibold transition-all hover:gap-2"
                        style={{ color: item.categoryColor, fontFamily: "'Inter', sans-serif" }}
                      >
                        Read <ChevronRight size={13} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        {/* View All Button */}
        <div className="text-center mt-10">
          <button
            className="inline-flex items-center gap-2 px-7 py-3 rounded-xl border border-[#1E3A5F] text-[#1E3A5F] text-sm hover:bg-[#1E3A5F] hover:text-white transition-all duration-300"
            style={{ fontFamily: "'Inter', sans-serif", fontWeight: 500 }}
          >
            View All Highlights <ArrowRight size={16} />
          </button>
        </div>
      </div>
    </section>
  );
}
