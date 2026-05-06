(function () {
  const items = Array.isArray(window.ONLINE_GALLERY_ITEMS)
    ? [...window.ONLINE_GALLERY_ITEMS]
    : [];

  const galleryGrid = document.getElementById("galleryGrid");
  const galleryCount = document.getElementById("galleryCount");
  const searchInput = document.getElementById("gallerySearch");
  const categoryFilter = document.getElementById("categoryFilter");
  const categoryButtons = categoryFilter ? Array.from(categoryFilter.querySelectorAll("[data-category-filter]")) : [];
  const sourceFilter = document.getElementById("sourceFilter");
  let activeCategory = "all";

  function setActiveCategory(nextCategory) {
    activeCategory = nextCategory || "all";
    categoryButtons.forEach((button) => {
      const isActive = button.dataset.categoryFilter === activeCategory;
      button.classList.toggle("is-active", isActive);
      button.setAttribute("aria-pressed", isActive ? "true" : "false");
    });
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
          <p class="text-sm text-gray-500 mt-2">Try changing category, source, or search terms.</p>
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
    const category = activeCategory;
    const source = sourceFilter?.value || "all";

    const filtered = items.filter((item) => {
      const inQuery =
        item.title.toLowerCase().includes(q) ||
        item.shortCaption.toLowerCase().includes(q) ||
        item.tags.join(" ").toLowerCase().includes(q);
      const inCategory = category === "all" || item.category === category;
      const inSource = source === "all" || item.source === source;
      return inQuery && inCategory && inSource;
    });

    renderGrid(filtered);
  }

  if (searchInput) searchInput.addEventListener("input", applyFilters);
  if (sourceFilter) sourceFilter.addEventListener("change", applyFilters);
  categoryButtons.forEach((button) => {
    button.addEventListener("click", () => {
      setActiveCategory(button.dataset.categoryFilter);
      applyFilters();
    });
  });

  setActiveCategory(activeCategory);
  applyFilters();
})();
