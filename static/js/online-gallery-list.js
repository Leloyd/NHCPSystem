(function () {
  const items = Array.isArray(window.ONLINE_GALLERY_ITEMS)
    ? [...window.ONLINE_GALLERY_ITEMS]
    : [];

  const galleryGrid = document.getElementById("galleryGrid");
  const galleryCount = document.getElementById("galleryCount");
  const searchInput = document.getElementById("gallerySearch");
  const periodFilter = document.getElementById("periodFilter");
  const categoryFilter = document.getElementById("categoryFilter");
  const sourceFilter = document.getElementById("sourceFilter");
  const sortFilter = document.getElementById("sortFilter");

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
          <a href="/online-gallery/details?item=${item.id}" class="text-amber-700 hover:text-amber-900 text-sm font-semibold">View details →</a>
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
      if (galleryCount) {
        galleryCount.textContent = "0 items";
      }
      return;
    }

    galleryGrid.innerHTML = data.map(buildCard).join("");

    if (galleryCount) {
      galleryCount.textContent = `${data.length} item${data.length > 1 ? "s" : ""}`;
    }

    if (window.lucide && typeof window.lucide.createIcons === "function") {
      window.lucide.createIcons();
    }
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

    renderGrid(sortItems(filtered, sortMode));
  }

  if (searchInput) searchInput.addEventListener("input", applyFilters);
  if (periodFilter) periodFilter.addEventListener("change", applyFilters);
  if (categoryFilter) categoryFilter.addEventListener("change", applyFilters);
  if (sourceFilter) sourceFilter.addEventListener("change", applyFilters);
  if (sortFilter) sortFilter.addEventListener("change", applyFilters);

  applyFilters();
})();
