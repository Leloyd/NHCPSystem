(function () {
  const resources = [
    {
      id: 1,
      title: "Site History Guide",
      type: "Lesson Plan",
      audience: "Teachers",
      format: "PDF",
      year: "2026",
      usageCount: 198,
      dateAdded: "2026-03-05",
      description: "Short lesson flow for introducing the cemetery timeline and historical context.",
      tags: ["Timeline", "History", "Discussion"],
      gradient: "linear-gradient(135deg, #f59e0b, #b45309)",
      icon: "book-open",
    },
    {
      id: 2,
      title: "Map Observation Sheet",
      type: "Worksheet",
      audience: "Students",
      format: "DOCX",
      year: "2026",
      usageCount: 167,
      dateAdded: "2026-03-07",
      description: "Worksheet aligned with the Site Map route exploration and landmark identification.",
      tags: ["Map", "Landmarks", "Activity"],
      gradient: "linear-gradient(135deg, #14b8a6, #0f766e)",
      icon: "map",
    },
    {
      id: 3,
      title: "Class Prompt Cards",
      type: "Discussion",
      audience: "Mixed",
      format: "PDF",
      year: "2026",
      usageCount: 144,
      dateAdded: "2026-03-09",
      description: "Prompt set for reflection after virtual tour, AR, or WebXR session.",
      tags: ["Reflection", "Critical Thinking", "Prompts"],
      gradient: "linear-gradient(135deg, #6366f1, #3730a3)",
      icon: "message-square",
    },
    {
      id: 4,
      title: "Quick Quiz Bank",
      type: "Assessment",
      audience: "Teachers",
      format: "DOCX",
      year: "2026",
      usageCount: 221,
      dateAdded: "2026-03-11",
      description: "Question bank for short formative assessments linked to platform modules.",
      tags: ["Quiz", "Assessment", "Formative"],
      gradient: "linear-gradient(135deg, #f97316, #c2410c)",
      icon: "clipboard-check",
    },
    {
      id: 5,
      title: "Timeline Matching Task",
      type: "Worksheet",
      audience: "Students",
      format: "PDF",
      year: "2026",
      usageCount: 138,
      dateAdded: "2026-03-13",
      description: "Printable matching exercise connecting events, spaces, and significance.",
      tags: ["Timeline", "Matching", "Practice"],
      gradient: "linear-gradient(135deg, #0ea5e9, #0369a1)",
      icon: "clock-3",
    },
    {
      id: 6,
      title: "Learning Journal Sheet",
      type: "Reflection",
      audience: "Students",
      format: "PDF",
      year: "2026",
      usageCount: 112,
      dateAdded: "2026-03-15",
      description: "End-of-session guided reflection with prompts for insights and takeaways.",
      tags: ["Reflection", "Journal", "Writing"],
      gradient: "linear-gradient(135deg, #10b981, #047857)",
      icon: "notebook-pen",
    },
    {
      id: 7,
      title: "Heritage Walk Slides",
      type: "Lesson Plan",
      audience: "Teachers",
      format: "Slides",
      year: "2026",
      usageCount: 95,
      dateAdded: "2026-03-17",
      description: "Slide deck template for introducing key route stops before virtual exploration.",
      tags: ["Slides", "Orientation", "Heritage Walk"],
      gradient: "linear-gradient(135deg, #8b5cf6, #5b21b6)",
      icon: "presentation",
    },
    {
      id: 8,
      title: "Artifact Observation Log",
      type: "Assessment",
      audience: "Mixed",
      format: "DOCX",
      year: "2026",
      usageCount: 83,
      dateAdded: "2026-03-20",
      description: "Observation log for documenting artifact details from gallery and AR modules.",
      tags: ["Artifacts", "Observation", "Documentation"],
      gradient: "linear-gradient(135deg, #475569, #1e293b)",
      icon: "scan-search",
    },
    {
      id: 9,
      title: "Community Story Reflection",
      type: "Discussion",
      audience: "Mixed",
      format: "PDF",
      year: "2026",
      usageCount: 76,
      dateAdded: "2026-03-22",
      description: "Guide questions for discussing local narratives from the participation module.",
      tags: ["Community", "Stories", "Discussion"],
      gradient: "linear-gradient(135deg, #f59e0b, #92400e)",
      icon: "users",
    },
  ];

  const resourceGrid = document.getElementById("resourceGrid");
  const resourceCount = document.getElementById("resourceCount");
  const searchInput = document.getElementById("resourceSearch");
  const typeFilter = document.getElementById("resourceTypeFilter");
  const audienceFilter = document.getElementById("resourceAudienceFilter");
  const formatFilter = document.getElementById("resourceFormatFilter");
  const sortFilter = document.getElementById("resourceSortFilter");

  if (!resourceGrid) {
    return;
  }

  function sortResources(data, mode) {
    const sorted = [...data];
    if (mode === "oldest") {
      return sorted.sort((a, b) => new Date(a.dateAdded) - new Date(b.dateAdded));
    }
    if (mode === "most-used") {
      return sorted.sort((a, b) => b.usageCount - a.usageCount);
    }
    if (mode === "curated") {
      const priority = ["Lesson Plan", "Worksheet", "Discussion", "Assessment", "Reflection"];
      return sorted.sort((a, b) => priority.indexOf(a.type) - priority.indexOf(b.type));
    }
    return sorted.sort((a, b) => new Date(b.dateAdded) - new Date(a.dateAdded));
  }

  function buildCard(item) {
    return `
      <article class="gallery-card">
        <div class="gallery-thumb" style="background:${item.gradient}">
          <div class="text-center p-4">
            <i data-lucide="${item.icon}" class="w-12 h-12 mx-auto mb-2"></i>
            <p class="font-semibold">${item.type}</p>
          </div>
        </div>
        <div class="p-5">
          <p class="text-xs text-amber-700 mb-1">${item.audience} • ${item.format} • ${item.year}</p>
          <h3 class="text-lg font-serif text-gray-900 mb-2">${item.title}</h3>
          <p class="text-sm text-gray-700 mb-3">${item.description}</p>
          <div class="mb-3">${item.tags.map((tag) => `<span class="gallery-tag">${tag}</span>`).join("")}</div>
          <button type="button" class="text-amber-700 hover:text-amber-900 text-sm font-semibold">Download Template →</button>
        </div>
      </article>
    `;
  }

  function renderGrid(data) {
    if (!data.length) {
      resourceGrid.innerHTML = `
        <div class="col-span-full bg-white border border-stone-200 rounded-lg p-8 text-center">
          <p class="text-lg text-gray-700">No resources found for the selected filters.</p>
          <p class="text-sm text-gray-500 mt-2">Try changing search terms or filter options.</p>
        </div>
      `;
      if (resourceCount) {
        resourceCount.textContent = "0 items";
      }
      return;
    }

    resourceGrid.innerHTML = data.map(buildCard).join("");
    if (resourceCount) {
      resourceCount.textContent = `${data.length} item${data.length > 1 ? "s" : ""}`;
    }

    if (window.lucide && typeof window.lucide.createIcons === "function") {
      window.lucide.createIcons();
    }
  }

  function applyFilters() {
    const query = (searchInput?.value || "").trim().toLowerCase();
    const type = typeFilter?.value || "all";
    const audience = audienceFilter?.value || "all";
    const format = formatFilter?.value || "all";
    const sortMode = sortFilter?.value || "newest";

    const filtered = resources.filter((item) => {
      const inQuery =
        item.title.toLowerCase().includes(query) ||
        item.description.toLowerCase().includes(query) ||
        item.tags.join(" ").toLowerCase().includes(query);
      const inType = type === "all" || item.type === type;
      const inAudience = audience === "all" || item.audience === audience;
      const inFormat = format === "all" || item.format === format;

      return inQuery && inType && inAudience && inFormat;
    });

    renderGrid(sortResources(filtered, sortMode));
  }

  if (searchInput) searchInput.addEventListener("input", applyFilters);
  if (typeFilter) typeFilter.addEventListener("change", applyFilters);
  if (audienceFilter) audienceFilter.addEventListener("change", applyFilters);
  if (formatFilter) formatFilter.addEventListener("change", applyFilters);
  if (sortFilter) sortFilter.addEventListener("change", applyFilters);

  applyFilters();
})();
