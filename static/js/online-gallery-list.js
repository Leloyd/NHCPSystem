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

  function buildBilingualText(primaryValue, secondaryValue, primaryClassName, secondaryClassName) {
    const primaryText = String(primaryValue || "").trim();
    const secondaryText = String(secondaryValue || "").trim();
    if (!primaryText && !secondaryText) {
      return "";
    }

    const parts = [];
    if (primaryText) {
      parts.push(`<div class="${primaryClassName}">${escapeHtml(primaryText)}</div>`);
    }
    if (secondaryText) {
      parts.push(`<div class="${secondaryClassName}" lang="tl">${escapeHtml(secondaryText)}</div>`);
    }
    return parts.join("");
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
      ? `<img src="${escapeHtml(item.image_url)}" alt="${escapeHtml(item.title || item.title_tl || "Online Gallery item")}" class="gallery-thumb__image" loading="lazy" />`
      : `<div class="gallery-thumb__fallback"><p class="gallery-thumb__category">${escapeHtml(item.category || "Online Gallery")}</p></div>`;
    const metaParts = [item.category, item.year, item.location].filter(Boolean);
    const titleMarkup = buildBilingualText(item.title, item.title_tl, "text-lg font-serif text-gray-900", "text-sm text-gray-500 mt-1");
    const captionMarkup = buildBilingualText(item.short_caption, item.short_caption_tl, "text-sm text-gray-700 mb-1", "text-sm text-gray-500 mb-3");
    return `
      <article class="gallery-card">
        <div class="gallery-thumb">
          ${thumbMarkup}
        </div>
        <div class="p-5">
          <p class="text-xs text-amber-700 mb-1">${escapeHtml(metaParts.join(" • "))}</p>
          <div class="mb-2">${titleMarkup}</div>
          <div>${captionMarkup}</div>
          <div class="mb-3">${(Array.isArray(item.tags) ? item.tags : []).map((tag) => `<span class="gallery-tag">${escapeHtml(tag)}</span>`).join("")}</div>
          <a href="/online-gallery/details?item=${encodeURIComponent(item.id)}" class="text-amber-700 hover:text-amber-900 text-sm font-semibold">View details →</a>
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
      const searchText = [
        item.title,
        item.title_tl,
        item.short_caption,
        item.short_caption_tl,
        item.full_description,
        item.full_description_tl,
        item.location,
        item.location_tl,
        item.category,
        item.year,
        Array.isArray(item.tags) ? item.tags.join(" ") : "",
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      const inQuery =
        !q || searchText.includes(q);
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
