(function () {
  const itemsDataScript = document.getElementById("onlineGalleryItemsData");
  let items = [];
  try {
    const parsedItems = itemsDataScript ? JSON.parse(itemsDataScript.textContent || "[]") : window.ONLINE_GALLERY_ITEMS;
    items = Array.isArray(parsedItems) ? [...parsedItems] : [];
  } catch (_error) {
    items = [];
  }

  const galleryGrid = document.getElementById("galleryGrid");
  const galleryCount = document.getElementById("galleryCount");
  const searchInput = document.getElementById("gallerySearch");
  const categoryFilter = document.getElementById("categoryFilter");
  const categoryButtons = categoryFilter ? Array.from(categoryFilter.querySelectorAll("[data-category-filter]")) : [];
  let activeCategory = "all";

  function escapeHtml(value) {
    return String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/\"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function setActiveCategory(nextCategory) {
    activeCategory = nextCategory || "all";
    categoryButtons.forEach((button) => {
      const isActive = button.dataset.categoryFilter === activeCategory;
      button.classList.toggle("is-active", isActive);
      button.setAttribute("aria-pressed", isActive ? "true" : "false");
    });
  }

  function buildCard(item) {
    const thumbMarkup = item.image_url
      ? `<img src="${escapeHtml(item.image_url)}" alt="${escapeHtml(item.title)}" class="gallery-thumb__image" loading="lazy" />`
      : `<div class="gallery-thumb__fallback"><p class="gallery-thumb__category">${escapeHtml(item.category || "Online Gallery")}</p></div>`;
    const categoryText = String(item.category || "").trim();
    const detailParts = [item.year, item.location].filter((value) => String(value || "").trim());
    const metaMarkup = categoryText || detailParts.length
      ? `
          <div class="gallery-card__meta-row">
            <p class="gallery-card__meta-left">${escapeHtml(categoryText)}</p>
            <p class="gallery-card__meta-right">${escapeHtml(detailParts.join(" • "))}</p>
          </div>
        `
      : "";
    const tagsMarkup = Array.isArray(item.tags) && item.tags.length
      ? `<div class="mb-3">${item.tags.map((tag) => `<span class="gallery-tag">${escapeHtml(tag)}</span>`).join("")}</div>`
      : "";
    return `
      <article class="gallery-card">
        <div class="gallery-thumb">
          ${thumbMarkup}
        </div>
        <div class="gallery-card__body">
          ${metaMarkup}
          <h3 class="gallery-card__title font-serif">${escapeHtml(item.title)}</h3>
          <p class="gallery-card__summary">${escapeHtml(item.short_caption)}</p>
          ${tagsMarkup}
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
          <p class="text-sm text-gray-500 mt-2">Try changing category or search terms.</p>
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

    const filtered = items.filter((item) => {
      const itemTags = Array.isArray(item.tags) ? item.tags : [];
      const inQuery =
        item.title.toLowerCase().includes(q) ||
        item.short_caption.toLowerCase().includes(q) ||
        itemTags.join(" ").toLowerCase().includes(q);
      const inCategory = category === "all" || item.category === category;
      return inQuery && inCategory;
    });

    renderGrid(filtered);
  }

  if (searchInput) searchInput.addEventListener("input", applyFilters);
  categoryButtons.forEach((button) => {
    button.addEventListener("click", () => {
      setActiveCategory(button.dataset.categoryFilter);
      applyFilters();
    });
  });

  setActiveCategory(activeCategory);
  applyFilters();
})();
