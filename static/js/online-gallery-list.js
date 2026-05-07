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
  const galleryHeaderKicker = document.getElementById("galleryHeaderKicker");
  const galleryHeaderCopy = document.getElementById("galleryHeaderCopy");
  const gallerySearchLabel = document.getElementById("gallerySearchLabel");
  const searchForm = document.getElementById("gallerySearchForm");
  const searchInput = document.getElementById("gallerySearch");
  const searchClearButton = document.getElementById("gallerySearchClear");
  const categoryFilter = document.getElementById("categoryFilter");
  const categoryButtons = categoryFilter ? Array.from(categoryFilter.querySelectorAll("[data-category-filter]")) : [];
  const sortSelect = document.getElementById("gallerySort");
  const sortLabel = document.getElementById("gallerySortLabel");
  const clearFiltersButton = document.getElementById("galleryClearFilters");
  const clearFiltersText = document.getElementById("galleryClearFiltersText");
  const gridViewButton = document.getElementById("galleryViewGrid");
  const listViewButton = document.getElementById("galleryViewList");
  const params = new URLSearchParams(window.location.search);
  let activeCategory = "all";
  let viewMode = "grid";
  let sortMode = "default";

  const i18n = {
    english: {
      headerKicker: "Collection",
      headerCopy: "Explore our curated collection of historical materials and discover their cultural context through a refined digital archive experience.",
      searchLabel: "Search gallery items",
      searchPlaceholder: "Search by title, category, year, location, or tag...",
      searchClearLabel: "Clear search",
      sortLabel: "Sort gallery items",
      sortAria: "Sort gallery items",
      sortDefault: "Default",
      sortPeriod: "By Year",
      gridLabel: "Grid view",
      listLabel: "List view",
      countZero: "0 artifacts found",
      countSingle: "1 artifact found",
      countPlural: "{count} artifacts found",
      clearFilters: "Clear filters",
      emptyTitle: "No Artifacts Found",
      emptyCopy: "Try a different search term or clear the filters.",
      viewDetails: "View More",
      dateUnavailable: "Date unavailable",
      locationUnavailable: "Location unavailable",
      metadataUnavailable: "Metadata unavailable",
      fallbackCategory: "Online Gallery",
    },
    filipino: {
      headerKicker: "Koleksiyon",
      headerCopy: "Tuklasin ang aming piling koleksiyon ng makasaysayang materyales at unawain ang kanilang kontekstong pangkultura sa isang mas pinong digital archive na karanasan.",
      searchLabel: "Maghanap ng mga artifact",
      searchPlaceholder: "Maghanap ayon sa pamagat, kategorya, taon, lokasyon, o tag...",
      searchClearLabel: "I-clear ang paghahanap",
      sortLabel: "Ayusin ang mga artifact",
      sortAria: "Ayusin ang mga artifact",
      sortDefault: "Karaniwan",
      sortPeriod: "Ayon sa Taon",
      gridLabel: "Grid view",
      listLabel: "List view",
      countZero: "0 artifact ang nakita",
      countSingle: "1 artifact ang nakita",
      countPlural: "{count} artifact ang nakita",
      clearFilters: "I-clear ang mga filter",
      emptyTitle: "Walang Nahanap na Artifact",
      emptyCopy: "Subukan ang ibang hahanapin o i-clear ang mga filter.",
      viewDetails: "Tingnan Pa",
      dateUnavailable: "Walang petsang available",
      locationUnavailable: "Walang lokasyong available",
      metadataUnavailable: "Walang metadata na available",
      fallbackCategory: "Online Gallery",
    },
  };

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

  function getSettings() {
    return window.ogdAccessibility && typeof window.ogdAccessibility.getSettings === "function"
      ? window.ogdAccessibility.getSettings()
      : { language: document.documentElement.lang === "en" ? "english" : "filipino" };
  }

  function getLanguage() {
    return getSettings().language === "english" ? "english" : "filipino";
  }

  function getStrings() {
    return i18n[getLanguage()] || i18n.filipino;
  }

  function getLocalizedField(item, baseKey) {
    const language = getLanguage();
    const preferredKey = language === "english" ? `${baseKey}_en` : `${baseKey}_tl`;
    const fallbackKey = language === "english" ? `${baseKey}_tl` : `${baseKey}_en`;
    return normalizeText(item[preferredKey]) || normalizeText(item[baseKey]) || normalizeText(item[fallbackKey]);
  }

  function getLocalizedCategory(item) {
    return getLanguage() === "english"
      ? normalizeText(item.category_en) || normalizeText(item.category) || normalizeText(item.category_tl)
      : normalizeText(item.category_tl) || normalizeText(item.category) || normalizeText(item.category_en);
  }

  function getLocalizedLocation(item) {
    return getLocalizedField(item, "location");
  }

  function getLocalizedTitle(item) {
    return getLocalizedField(item, "title");
  }

  function getLocalizedSummary(item) {
    return getLocalizedField(item, "short_caption");
  }

  function updateQueryString() {
    const nextUrl = new URL(window.location.href);
    const query = normalizeText(searchInput?.value);
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
    return [normalizeText(item.year), getLocalizedLocation(item)].filter((value) => normalizeText(value));
  }

  function buildCard(item) {
    const strings = getStrings();
    const title = getLocalizedTitle(item);
    const summary = getLocalizedSummary(item);
    const category = getLocalizedCategory(item) || strings.fallbackCategory;
    const location = getLocalizedLocation(item);
    const imageMarkup = item.image_url
      ? `<img src="${escapeHtml(item.image_url)}" alt="${escapeHtml(title)}" class="ogd-artifact-card__image" loading="lazy" />`
      : `<div class="ogd-artifact-card__fallback"><span>${escapeHtml(category)}</span></div>`;
    const metaParts = getDisplayMeta(item);
    const yearText = normalizeText(item.year) || strings.dateUnavailable;
    const secondaryMeta = location || strings.locationUnavailable;
    return `
      <article class="ogd-artifact-card">
        <a href="/online-gallery/details?item=${item.id}" class="ogd-artifact-card__media" aria-label="${escapeHtml(strings.viewDetails)}: ${escapeHtml(title)}">
          ${imageMarkup}
        </a>
        <div class="ogd-artifact-card__body">
          <h2 class="ogd-artifact-card__title font-serif">${escapeHtml(title)}</h2>
          <p class="ogd-artifact-card__summary">${escapeHtml(summary)}</p>
          <div class="ogd-artifact-card__meta">
            <span>${escapeHtml(yearText)}</span>
            ${(metaParts.length > 1 || secondaryMeta) ? `<span aria-hidden="true">·</span><span>${escapeHtml(metaParts[1] || secondaryMeta)}</span>` : ""}
          </div>
          <a href="/online-gallery/details?item=${item.id}" class="ogd-artifact-card__action" aria-label="${escapeHtml(strings.viewDetails)}: ${escapeHtml(title)}">
            <span>${escapeHtml(strings.viewDetails)}</span>
            <i data-lucide="arrow-right" aria-hidden="true"></i>
          </a>
        </div>
      </article>
    `;
  }

  function buildListItem(item) {
    const strings = getStrings();
    const title = getLocalizedTitle(item);
    const summary = getLocalizedSummary(item);
    const category = getLocalizedCategory(item) || strings.fallbackCategory;
    const metaParts = getDisplayMeta(item);
    const metaText = metaParts.join(" • ") || strings.metadataUnavailable;
    const imageMarkup = item.image_url
      ? `<img src="${escapeHtml(item.image_url)}" alt="${escapeHtml(title)}" class="ogd-list-item__image" loading="lazy" />`
      : `<div class="ogd-list-item__fallback"><span>${escapeHtml(category)}</span></div>`;
    return `
      <article class="ogd-list-item-wrap">
        <a href="/online-gallery/details?item=${item.id}" class="ogd-list-item" aria-label="${escapeHtml(strings.viewDetails)}: ${escapeHtml(title)}">
          <div class="ogd-list-item__media">${imageMarkup}</div>
          <div class="ogd-list-item__content">
            <div class="ogd-list-item__head">
              <h2 class="ogd-list-item__title font-serif">${escapeHtml(title)}</h2>
              <span class="ogd-list-item__badge">${escapeHtml(category)}</span>
            </div>
            <p class="ogd-list-item__summary">${escapeHtml(summary)}</p>
            <p class="ogd-list-item__meta">${escapeHtml(metaText)}</p>
          </div>
        </a>
      </article>
    `;
  }

  function updateStaticLabels() {
    const strings = getStrings();
    if (galleryHeaderKicker) galleryHeaderKicker.textContent = strings.headerKicker;
    if (galleryHeaderCopy) galleryHeaderCopy.textContent = strings.headerCopy;
    if (gallerySearchLabel) gallerySearchLabel.textContent = strings.searchLabel;
    if (searchInput) searchInput.placeholder = strings.searchPlaceholder;
    if (searchClearButton) searchClearButton.setAttribute("aria-label", strings.searchClearLabel);
    if (sortLabel) sortLabel.textContent = strings.sortLabel;
    if (sortSelect) {
      sortSelect.setAttribute("aria-label", strings.sortAria);
      const defaultOption = sortSelect.querySelector('option[value="default"]');
      const periodOption = sortSelect.querySelector('option[value="period"]');
      if (defaultOption) defaultOption.textContent = strings.sortDefault;
      if (periodOption) periodOption.textContent = strings.sortPeriod;
    }
    if (gridViewButton) gridViewButton.setAttribute("aria-label", strings.gridLabel);
    if (listViewButton) listViewButton.setAttribute("aria-label", strings.listLabel);
    if (clearFiltersText) clearFiltersText.textContent = strings.clearFilters;
    if (clearFiltersButton) clearFiltersButton.setAttribute("aria-label", strings.clearFilters);
    categoryButtons.forEach((button) => {
      const label = getLanguage() === "english"
        ? normalizeText(button.dataset.categoryLabelEn) || button.textContent
        : normalizeText(button.dataset.categoryLabelTl) || button.textContent;
      button.textContent = label;
    });
  }

  function renderGrid(data) {
    if (!galleryGrid) {
      return;
    }

    const strings = getStrings();
    if (!data.length) {
      galleryGrid.innerHTML = `
        <div class="ogd-empty-state">
          <div class="ogd-empty-state__icon"><i data-lucide="search" aria-hidden="true"></i></div>
          <h2 class="ogd-empty-state__title font-serif">${escapeHtml(strings.emptyTitle)}</h2>
          <p class="ogd-empty-state__copy">${escapeHtml(strings.emptyCopy)}</p>
        </div>
      `;
      if (galleryCount) {
        galleryCount.textContent = strings.countZero;
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
      galleryCount.textContent = data.length === 1 ? strings.countSingle : strings.countPlural.replace("{count}", String(data.length));
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
      nextItems.sort((a, b) => getLocalizedTitle(a).localeCompare(getLocalizedTitle(b)));
    } else if (sortMode === "za") {
      nextItems.sort((a, b) => getLocalizedTitle(b).localeCompare(getLocalizedTitle(a)));
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
      const inQuery = [
        getLocalizedTitle(item),
        getLocalizedSummary(item),
        getLocalizedCategory(item),
        normalizeText(item.category_en),
        normalizeText(item.category_tl),
        normalizeText(item.year),
        getLocalizedLocation(item),
        normalizeText(item.location_en),
        normalizeText(item.location_tl),
        itemTags.join(" "),
      ].join(" ").toLowerCase().includes(q);
      const itemCategoryId = normalizeText(item.category_id);
      const inCategory = category === "all" || itemCategoryId === category;
      return inQuery && inCategory;
    });

    updateQueryString();
    updateStaticLabels();
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

  window.addEventListener("ogd:accessibility-change", () => {
    applyFilters();
  });

  setActiveCategory(activeCategory);
  setViewMode(viewMode);
  if (sortSelect) {
    sortSelect.value = sortMode;
  }
  if (searchClearButton) {
    searchClearButton.hidden = !getSearchValue();
  }
  updateStaticLabels();
  applyFilters();
})();
