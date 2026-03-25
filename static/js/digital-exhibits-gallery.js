(function () {
  const items = [
    {
      id: 1,
      title: "Chapel Facade, Early Morning",
      period: "Spanish Period",
      year: "c. 1890 (archival)",
      category: "Exterior",
      source: "NHCP",
      location: "Front courtyard",
      viewed: 286,
      dateAdded: "2026-03-01",
      shortCaption: "Front elevation view showing stonework and symmetrical chapel lines.",
      fullDescription:
        "This archival reference image highlights the original chapel facade proportions and masonry details that became central to later conservation work.",
      tags: ["Chapel", "Stonework", "Archival"],
      gradient: "linear-gradient(135deg, #f59e0b, #b45309)",
      icon: "landmark",
    },
    {
      id: 2,
      title: "Crypt Entrance Corridor",
      period: "Spanish Period",
      year: "c. 1905 (archival)",
      category: "Interior",
      source: "NHCP",
      location: "Underground corridor",
      viewed: 421,
      dateAdded: "2026-03-04",
      shortCaption: "Narrow corridor perspective toward the underground chamber.",
      fullDescription:
        "The corridor composition reveals scale, ventilation openings, and circulation pathways used in ceremonial and practical contexts.",
      tags: ["Crypt", "Corridor", "Architecture"],
      gradient: "linear-gradient(135deg, #7c3aed, #4c1d95)",
      icon: "building-2",
    },
    {
      id: 3,
      title: "Site Map and Orientation Plate",
      period: "American Period",
      year: "c. 1932",
      category: "Maps",
      source: "LGU",
      location: "Orientation board",
      viewed: 198,
      dateAdded: "2026-03-08",
      shortCaption: "Annotated orientation map used in public history tours.",
      fullDescription:
        "This map was used for educational orientation, presenting key zones, pathways, and historical references for guided groups.",
      tags: ["Map", "Orientation", "Education"],
      gradient: "linear-gradient(135deg, #0ea5e9, #0369a1)",
      icon: "map",
    },
    {
      id: 4,
      title: "Restoration Team Documentation",
      period: "Modern Restoration",
      year: "2024",
      category: "Community",
      source: "Community Submission",
      location: "Conservation area",
      viewed: 143,
      dateAdded: "2026-03-10",
      shortCaption: "Local restoration activity documenting conservation methods.",
      fullDescription:
        "Community members and heritage workers collaborated in cleaning, documentation, and preventive conservation activities.",
      tags: ["Restoration", "Community", "Preservation"],
      gradient: "linear-gradient(135deg, #10b981, #047857)",
      icon: "hammer",
    },
    {
      id: 5,
      title: "Historic Marker Detail",
      period: "Modern Restoration",
      year: "2025",
      category: "Artifacts",
      source: "NHCP",
      location: "Marker zone",
      viewed: 177,
      dateAdded: "2026-03-12",
      shortCaption: "Close-up of inscription details and historical marker typography.",
      fullDescription:
        "A high-resolution detail useful for interpretation sessions and typography-based historical reading exercises.",
      tags: ["Marker", "Inscription", "Interpretation"],
      gradient: "linear-gradient(135deg, #f97316, #c2410c)",
      icon: "scroll-text",
    },
    {
      id: 6,
      title: "Courtyard Community Gathering",
      period: "Modern Restoration",
      year: "2026",
      category: "Community",
      source: "Community Submission",
      location: "Main courtyard",
      viewed: 226,
      dateAdded: "2026-03-14",
      shortCaption: "Documented heritage storytelling session in the open courtyard.",
      fullDescription:
        "The image captures intergenerational storytelling where local narratives were shared and contextualized for younger learners.",
      tags: ["Storytelling", "Community", "Education"],
      gradient: "linear-gradient(135deg, #14b8a6, #0f766e)",
      icon: "users",
    },
    {
      id: 7,
      title: "Subsurface Ventilation Arch",
      period: "Spanish Period",
      year: "c. 1880 (archival)",
      category: "Interior",
      source: "NHCP",
      location: "Crypt chamber",
      viewed: 154,
      dateAdded: "2026-03-16",
      shortCaption: "Architectural detail of ventilation strategy inside the crypt level.",
      fullDescription:
        "This image helps explain environmental design decisions and how airflow influenced long-term structural stability.",
      tags: ["Ventilation", "Crypt", "Engineering"],
      gradient: "linear-gradient(135deg, #6366f1, #3730a3)",
      icon: "wind",
    },
    {
      id: 8,
      title: "Visitor Trail Signage",
      period: "Modern Restoration",
      year: "2025",
      category: "Exterior",
      source: "LGU",
      location: "Trail path",
      viewed: 131,
      dateAdded: "2026-03-18",
      shortCaption: "Wayfinding signage used in guided and self-paced tours.",
      fullDescription:
        "Introduced for visitor safety and educational sequencing, this signage system links key architectural and historical points.",
      tags: ["Wayfinding", "Trail", "Visitor Experience"],
      gradient: "linear-gradient(135deg, #f59e0b, #92400e)",
      icon: "signpost",
    },
    {
      id: 9,
      title: "Cast-Iron Candle Stand",
      period: "Spanish Period",
      year: "c. 1885 (archival reference)",
      category: "Artifacts",
      source: "NHCP",
      location: "Chapel sacristy collection",
      viewed: 167,
      dateAdded: "2026-03-20",
      shortCaption: "Liturgical candle stand linked to late-19th-century religious practices.",
      fullDescription:
        "This cast-iron stand reflects devotional use patterns and craftsmanship associated with parish-linked funerary spaces in Laguna.",
      tags: ["Liturgical", "Ironwork", "Religious Practice"],
      gradient: "linear-gradient(135deg, #b45309, #78350f)",
      icon: "candlestick-chart",
    },
    {
      id: 10,
      title: "Chapel Door Hinge Fragment",
      period: "Spanish Period",
      year: "c. 1870 (material study)",
      category: "Artifacts",
      source: "LGU",
      location: "Conservation storage",
      viewed: 149,
      dateAdded: "2026-03-21",
      shortCaption: "Recovered metal hinge section from an earlier chapel door assembly.",
      fullDescription:
        "Used in restoration classes to discuss joinery systems, corrosion impact, and preservation choices for colonial-era architectural hardware.",
      tags: ["Hardware", "Conservation", "Architecture"],
      gradient: "linear-gradient(135deg, #475569, #1e293b)",
      icon: "wrench",
    },
    {
      id: 11,
      title: "Stone Inscription Plate Segment",
      period: "American Period",
      year: "c. 1918",
      category: "Artifacts",
      source: "Community Submission",
      location: "Interpretation lab",
      viewed: 112,
      dateAdded: "2026-03-22",
      shortCaption: "Fragmented inscription slab used for text-reading and context exercises.",
      fullDescription:
        "The plate segment supports epigraphy-based classroom activities and demonstrates how fragment analysis helps reconstruct heritage narratives.",
      tags: ["Inscription", "Epigraphy", "Interpretation"],
      gradient: "linear-gradient(135deg, #78716c, #44403c)",
      icon: "scroll-text",
    },
    {
      id: 12,
      title: "Historic Registry Ledger Copy",
      period: "American Period",
      year: "c. 1936",
      category: "Artifacts",
      source: "NHCP",
      location: "Archive table",
      viewed: 138,
      dateAdded: "2026-03-23",
      shortCaption: "Digitized ledger page referencing site administration records.",
      fullDescription:
        "This registry copy is frequently used for document literacy sessions and highlights administrative transitions in local heritage stewardship.",
      tags: ["Archive", "Ledger", "Governance"],
      gradient: "linear-gradient(135deg, #0f766e, #134e4a)",
      icon: "book-copy",
    },
  ];

  const galleryGrid = document.getElementById("galleryGrid");
  const galleryCount = document.getElementById("galleryCount");
  const searchInput = document.getElementById("gallerySearch");
  const periodFilter = document.getElementById("periodFilter");
  const categoryFilter = document.getElementById("categoryFilter");
  const sourceFilter = document.getElementById("sourceFilter");
  const sortFilter = document.getElementById("sortFilter");

  const modal = document.getElementById("galleryModal");
  const modalTitle = document.getElementById("modalTitle");
  const modalMeta = document.getElementById("modalMeta");
  const modalImage = document.getElementById("modalImage");
  const modalDesc = document.getElementById("modalDesc");
  const modalTags = document.getElementById("modalTags");
  const modalTeaching = document.getElementById("modalTeaching");
  const closeModalBtn = document.getElementById("closeGalleryModal");
  const closeModalBottomBtn = document.getElementById("closeGalleryModalBottom");
  const prevBtn = document.getElementById("prevItem");
  const nextBtn = document.getElementById("nextItem");

  let currentData = [...items];
  let activeIndex = 0;

  function sortItems(data, mode) {
    const sorted = [...data];
    if (mode === "oldest") {
      return sorted.sort((a, b) => new Date(a.dateAdded) - new Date(b.dateAdded));
    }
    if (mode === "most-viewed") {
      return sorted.sort((a, b) => b.viewed - a.viewed);
    }
    if (mode === "curated") {
      const priority = ["Spanish Period", "American Period", "Modern Restoration"];
      return sorted.sort((a, b) => priority.indexOf(a.period) - priority.indexOf(b.period));
    }
    return sorted.sort((a, b) => new Date(b.dateAdded) - new Date(a.dateAdded));
  }

  function applyFilters() {
    const q = (searchInput?.value || "").trim().toLowerCase();
    const period = periodFilter?.value || "all";
    const category = categoryFilter?.value || "all";
    const source = sourceFilter?.value || "all";
    const sortMode = sortFilter?.value || "newest";

    const filtered = items.filter((item) => {
      const inQuery =
        item.title.toLowerCase().includes(q) ||
        item.shortCaption.toLowerCase().includes(q) ||
        item.tags.join(" ").toLowerCase().includes(q);
      const inPeriod = period === "all" || item.period === period;
      const inCategory = category === "all" || item.category === category;
      const inSource = source === "all" || item.source === source;
      return inQuery && inPeriod && inCategory && inSource;
    });

    currentData = sortItems(filtered, sortMode);
    renderGrid(currentData);
  }

  function buildCard(item) {
    return `
      <article class="gallery-card">
        <div class="gallery-thumb" style="background:${item.gradient}">
          <div class="text-center p-4">
            <i data-lucide="${item.icon}" class="w-12 h-12 mx-auto mb-2"></i>
            <p class="font-semibold">${item.category}</p>
          </div>
        </div>
        <div class="p-5">
          <p class="text-xs text-amber-700 mb-1">${item.period} • ${item.year}</p>
          <h3 class="text-lg font-serif text-gray-900 mb-2">${item.title}</h3>
          <p class="text-sm text-gray-700 mb-3">${item.shortCaption}</p>
          <div class="mb-3">${item.tags.map((tag) => `<span class="gallery-tag">${tag}</span>`).join("")}</div>
          <button type="button" class="text-amber-700 hover:text-amber-900 text-sm font-semibold" data-open-id="${item.id}">View details →</button>
        </div>
      </article>
    `;
  }

  function renderGrid(data) {
    if (!galleryGrid) {
      return;
    }

    if (!data.length) {
      galleryGrid.innerHTML = `
        <div class="col-span-full bg-white border border-stone-200 rounded-lg p-8 text-center">
          <p class="text-lg text-gray-700">No gallery items found for your current filters.</p>
          <p class="text-sm text-gray-500 mt-2">Try changing period, category, source, or search terms.</p>
        </div>
      `;
      if (galleryCount) galleryCount.textContent = "0 items";
      return;
    }

    galleryGrid.innerHTML = data.map(buildCard).join("");
    if (galleryCount) {
      galleryCount.textContent = `${data.length} item${data.length > 1 ? "s" : ""}`;
    }

    galleryGrid.querySelectorAll("[data-open-id]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const id = Number(btn.getAttribute("data-open-id"));
        const index = currentData.findIndex((entry) => entry.id === id);
        openModal(index >= 0 ? index : 0);
      });
    });

    if (window.lucide && typeof window.lucide.createIcons === "function") {
      window.lucide.createIcons();
    }
  }

  function openModal(index) {
    if (!modal || !currentData.length) {
      return;
    }

    activeIndex = index;
    const item = currentData[activeIndex];
    modalTitle.textContent = item.title;
    modalMeta.textContent = `${item.period} • ${item.year} • ${item.location} • Source: ${item.source}`;
    modalImage.style.background = item.gradient;
    modalImage.innerHTML = `<i data-lucide="${item.icon}" class="w-16 h-16"></i>`;
    modalDesc.textContent = item.fullDescription;
    modalTags.innerHTML = item.tags.map((tag) => `<span class="gallery-tag">${tag}</span>`).join("");
    modalTeaching.textContent = `Teaching note: Ask learners how this material reflects social, architectural, or cultural changes in Nagcarlan.`;

    modal.classList.add("is-open");
    modal.setAttribute("aria-hidden", "false");
    document.body.classList.add("overflow-hidden");

    if (window.lucide && typeof window.lucide.createIcons === "function") {
      window.lucide.createIcons();
    }
  }

  function closeModal() {
    if (!modal) {
      return;
    }
    modal.classList.remove("is-open");
    modal.setAttribute("aria-hidden", "true");
    document.body.classList.remove("overflow-hidden");
  }

  if (searchInput) searchInput.addEventListener("input", applyFilters);
  if (periodFilter) periodFilter.addEventListener("change", applyFilters);
  if (categoryFilter) categoryFilter.addEventListener("change", applyFilters);
  if (sourceFilter) sourceFilter.addEventListener("change", applyFilters);
  if (sortFilter) sortFilter.addEventListener("change", applyFilters);

  if (closeModalBtn) closeModalBtn.addEventListener("click", closeModal);
  if (closeModalBottomBtn) closeModalBottomBtn.addEventListener("click", closeModal);
  if (prevBtn)
    prevBtn.addEventListener("click", () => {
      if (!currentData.length) return;
      activeIndex = (activeIndex - 1 + currentData.length) % currentData.length;
      openModal(activeIndex);
    });
  if (nextBtn)
    nextBtn.addEventListener("click", () => {
      if (!currentData.length) return;
      activeIndex = (activeIndex + 1) % currentData.length;
      openModal(activeIndex);
    });

  if (modal) {
    modal.addEventListener("click", (event) => {
      if (event.target === modal) {
        closeModal();
      }
    });
  }

  document.addEventListener("keydown", (event) => {
    if (!modal || !modal.classList.contains("is-open")) {
      return;
    }
    if (event.key === "Escape") {
      closeModal();
    }
    if (event.key === "ArrowLeft") {
      activeIndex = (activeIndex - 1 + currentData.length) % currentData.length;
      openModal(activeIndex);
    }
    if (event.key === "ArrowRight") {
      activeIndex = (activeIndex + 1) % currentData.length;
      openModal(activeIndex);
    }
  });

  applyFilters();
})();
