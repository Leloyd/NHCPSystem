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
  const searchForm = document.getElementById("gallerySearchForm");
  const searchInput = document.getElementById("gallerySearch");
  const searchClearButton = document.getElementById("gallerySearchClear");
  const categoryFilter = document.getElementById("categoryFilter");
  const categoryButtons = categoryFilter ? Array.from(categoryFilter.querySelectorAll("[data-category-filter]")) : [];
  const sortSelect = document.getElementById("gallerySort");
  const clearFiltersButton = document.getElementById("galleryClearFilters");
  const gridViewButton = document.getElementById("galleryViewGrid");
  const listViewButton = document.getElementById("galleryViewList");
  const params = new URLSearchParams(window.location.search);
  let activeCategory = "all";
  let viewMode = "grid";
  let sortMode = "default";

  function escapeHtml(value) {
    return String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/\"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function normalizeText(value) {
    return String(value || "").trim();
  }

  function updateQueryString() {
    const nextUrl = new URL(window.location.href);
    const query = normalizeText(searchInput?.value).trim();
    if (query) {
      nextUrl.searchParams.set("search", query);
    } else {
      nextUrl.searchParams.delete("search");
    }
    window.history.replaceState({}, "", nextUrl.toString());
  }

  function setActiveCategory(nextCategory) {
    activeCategory = nextCategory || "all";
    categoryButtons.forEach((button) => {
      const isActive = button.dataset.categoryFilter === activeCategory;
      button.classList.toggle("is-active", isActive);
      button.setAttribute("aria-pressed", isActive ? "true" : "false");
      button.setAttribute("aria-selected", isActive ? "true" : "false");
    });
  }

  function setViewMode(nextMode) {
    viewMode = nextMode === "list" ? "list" : "grid";
    if (galleryGrid) {
      galleryGrid.classList.toggle("ogd-gallery-results--grid", viewMode === "grid");
      galleryGrid.classList.toggle("ogd-gallery-results--list", viewMode === "list");
    }
    if (gridViewButton) {
      const isActive = viewMode === "grid";
      gridViewButton.classList.toggle("is-active", isActive);
      gridViewButton.setAttribute("aria-pressed", isActive ? "true" : "false");
    }
    if (listViewButton) {
      const isActive = viewMode === "list";
      listViewButton.classList.toggle("is-active", isActive);
      listViewButton.setAttribute("aria-pressed", isActive ? "true" : "false");
    }
  }

  function getSearchValue() {
    return normalizeText(searchInput?.value).toLowerCase();
  }

  function getDisplayMeta(item) {
    return [item.year, item.location].filter((value) => normalizeText(value));
  }

  function buildCard(item) {
    const imageMarkup = item.image_url
      ? `<img src="${escapeHtml(item.image_url)}" alt="${escapeHtml(item.title)}" class="ogd-artifact-card__image" loading="lazy" />`
      : `<div class="ogd-artifact-card__fallback"><span>${escapeHtml(item.category || "Online Gallery")}</span></div>`;
    const metaParts = getDisplayMeta(item);
    return `
      <article class="ogd-artifact-card">
        <a href="/online-gallery/details?item=${item.id}" class="ogd-artifact-card__media" aria-label="View details for ${escapeHtml(item.title)}">
          ${imageMarkup}
          <span class="ogd-artifact-card__badge">${escapeHtml(item.category || "Online Gallery")}</span>
        </a>
        <div class="ogd-artifact-card__body">
          <h2 class="ogd-artifact-card__title font-serif">${escapeHtml(item.title)}</h2>
          <p class="ogd-artifact-card__summary">${escapeHtml(item.short_caption || "")}</p>
          <div class="ogd-artifact-card__meta">
            <span>${escapeHtml(item.year || "Date unavailable")}</span>
            ${metaParts[1] ? `<span aria-hidden="true">·</span><span>${escapeHtml(metaParts[1])}</span>` : metaParts[0] && item.location ? `<span aria-hidden="true">·</span><span>${escapeHtml(item.location)}</span>` : metaParts[0] ? "" : `<span>${escapeHtml(item.location || "Location unavailable")}</span>`}
          </div>
          <a href="/online-gallery/details?item=${item.id}" class="ogd-artifact-card__action" aria-label="View more details about ${escapeHtml(item.title)}">
            <span>View More</span>
            <i data-lucide="arrow-right" aria-hidden="true"></i>
          </a>
        </div>
      </article>
    `;
  }

  function buildListItem(item) {
    const imageMarkup = item.image_url
      ? `<img src="${escapeHtml(item.image_url)}" alt="${escapeHtml(item.title)}" class="ogd-list-item__image" loading="lazy" />`
      : `<div class="ogd-list-item__fallback"><span>${escapeHtml(item.category || "Online Gallery")}</span></div>`;
    const metaParts = getDisplayMeta(item);
    const metaText = metaParts.join(" • ") || item.location || "Metadata unavailable";
    return `
      <article class="ogd-list-item-wrap">
        <a href="/online-gallery/details?item=${item.id}" class="ogd-list-item" aria-label="View details for ${escapeHtml(item.title)}">
          <div class="ogd-list-item__media">${imageMarkup}</div>
          <div class="ogd-list-item__content">
            <div class="ogd-list-item__head">
              <h2 class="ogd-list-item__title font-serif">${escapeHtml(item.title)}</h2>
              <span class="ogd-list-item__badge">${escapeHtml(item.category || "Online Gallery")}</span>
            </div>
            <p class="ogd-list-item__summary">${escapeHtml(item.short_caption || "")}</p>
            <p class="ogd-list-item__meta">${escapeHtml(metaText)}</p>
          </div>
        </a>
      </article>
    `;
  }

  function renderGrid(data) {
    if (!galleryGrid) {
      return;
    }

    if (!data.length) {
      galleryGrid.innerHTML = `
        <div class="ogd-empty-state">
          <div class="ogd-empty-state__icon"><i data-lucide="search" aria-hidden="true"></i></div>
          <h2 class="ogd-empty-state__title font-serif">No Artifacts Found</h2>
          <p class="ogd-empty-state__copy">Try a different search term or clear the filters.</p>
        </div>
      `;
      if (galleryCount) {
        galleryCount.textContent = "0 artifacts found";
      }
      if (clearFiltersButton) {
        clearFiltersButton.hidden = !getSearchValue() && activeCategory === "all";
      }
      if (window.lucide && typeof window.lucide.createIcons === "function") {
        window.lucide.createIcons();
      }
      return;
    }

    galleryGrid.innerHTML = viewMode === "list" ? data.map(buildListItem).join("") : data.map(buildCard).join("");

    if (galleryCount) {
      galleryCount.textContent = `${data.length} artifact${data.length !== 1 ? "s" : ""} found`;
    }

    if (clearFiltersButton) {
      clearFiltersButton.hidden = !getSearchValue() && activeCategory === "all";
    }

    if (window.lucide && typeof window.lucide.createIcons === "function") {
      window.lucide.createIcons();
    }
  }

  function sortItems(data) {
    const nextItems = [...data];
    if (sortMode === "az") {
      nextItems.sort((a, b) => normalizeText(a.title).localeCompare(normalizeText(b.title)));
    } else if (sortMode === "za") {
      nextItems.sort((a, b) => normalizeText(b.title).localeCompare(normalizeText(a.title)));
    } else if (sortMode === "period") {
      nextItems.sort((a, b) => normalizeText(a.year).localeCompare(normalizeText(b.year)));
    }
    return nextItems;
  }

  function applyFilters() {
    const q = getSearchValue();
    const category = activeCategory;

    const filtered = items.filter((item) => {
      const itemTags = Array.isArray(item.tags) ? item.tags : [];
      const inQuery =
        normalizeText(item.title).toLowerCase().includes(q) ||
        normalizeText(item.short_caption).toLowerCase().includes(q) ||
        normalizeText(item.category).toLowerCase().includes(q) ||
        normalizeText(item.year).toLowerCase().includes(q) ||
        normalizeText(item.location).toLowerCase().includes(q) ||
        itemTags.join(" ").toLowerCase().includes(q);
      const inCategory = category === "all" || item.category === category;
      return inQuery && inCategory;
    });

    updateQueryString();
    renderGrid(sortItems(filtered));
  }

  if (searchInput) {
    const initialSearch = normalizeText(params.get("search"));
    if (initialSearch) {
      searchInput.value = initialSearch;
    }
    searchInput.addEventListener("input", () => {
      if (searchClearButton) {
        searchClearButton.hidden = !getSearchValue();
      }
      applyFilters();
    });
  }
  if (searchForm) {
    searchForm.addEventListener("submit", (event) => {
      event.preventDefault();
      applyFilters();
    });
  }
  if (searchClearButton) {
    searchClearButton.addEventListener("click", () => {
      if (searchInput) {
        searchInput.value = "";
      }
      searchClearButton.hidden = true;
      applyFilters();
    });
  }
  categoryButtons.forEach((button) => {
    button.addEventListener("click", () => {
      setActiveCategory(button.dataset.categoryFilter);
      applyFilters();
    });
  });
  if (sortSelect) {
    sortSelect.addEventListener("change", () => {
      sortMode = sortSelect.value || "default";
      applyFilters();
    });
  }
  if (gridViewButton) {
    gridViewButton.addEventListener("click", () => {
      setViewMode("grid");
      applyFilters();
    });
  }
  if (listViewButton) {
    listViewButton.addEventListener("click", () => {
      setViewMode("list");
      applyFilters();
    });
  }
  if (clearFiltersButton) {
    clearFiltersButton.addEventListener("click", () => {
      if (searchInput) {
        searchInput.value = "";
      }
      if (searchClearButton) {
        searchClearButton.hidden = true;
      }
      if (sortSelect) {
        sortSelect.value = "default";
      }
      sortMode = "default";
      setActiveCategory("all");
      applyFilters();
    });
  }

  setActiveCategory(activeCategory);
  setViewMode(viewMode);
  if (sortSelect) {
    sortSelect.value = sortMode;
  }
  if (searchClearButton) {
    searchClearButton.hidden = !getSearchValue();
  }
  applyFilters();
})();
