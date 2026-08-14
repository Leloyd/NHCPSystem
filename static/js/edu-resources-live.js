(function () {
  function readEduResourcesData() {
    const payloadElement = document.getElementById("eduResourcesData");
    if (!payloadElement) {
      return [];
    }

    try {
      const parsed = JSON.parse(payloadElement.textContent || "[]");
      return Array.isArray(parsed) ? parsed : [];
    } catch (error) {
      console.error("Failed to parse edu resources payload.", error);
      return [];
    }
  }

  const resources = readEduResourcesData();
  const resourceGrid = document.getElementById("resourceGrid");
  const resourceCount = document.getElementById("resourceCount");
  const resourceHeaderKicker = document.getElementById("resourceHeaderKicker");
  const resourceHeaderCopy = document.getElementById("resourceHeaderCopy");
  const resourceSearchLabel = document.getElementById("resourceSearchLabel");
  const searchForm = document.getElementById("resourceSearchForm");
  const searchInput = document.getElementById("resourceSearch");
  const searchClearButton = document.getElementById("resourceSearchClear");
  const resourceTypeTabs = document.getElementById("resourceTypeTabs");
  const typeButtons = resourceTypeTabs ? Array.from(resourceTypeTabs.querySelectorAll("[data-resource-type-filter]")) : [];
  const subjectFilter = document.getElementById("resourceFormatFilter");
  const sortFilter = document.getElementById("resourceSortFilter");
  const subjectLabel = document.getElementById("resourceFormatLabel");
  const sortLabel = document.getElementById("resourceSortLabel");
  const clearFiltersButton = document.getElementById("resourceClearFilters");
  const clearFiltersText = document.getElementById("resourceClearFiltersText");
  const gridViewButton = document.getElementById("resourceViewGrid");
  const listViewButton = document.getElementById("resourceViewList");
  const params = new URLSearchParams(window.location.search);
  let activeType = "all";
  let viewMode = "grid";

  const i18n = {
    english: {
      headerKicker: "Learning Materials",
      headerCopy: "Browse community stories, presentations, documents, and PDF materials prepared for classroom and heritage learning use.",
      searchLabel: "Search learning resources",
      searchPlaceholder: "Search by title, author, educator, or topic...",
      searchClearLabel: "Clear search",
      subjectLabel: "Filter by subject / topic",
      sortLabel: "Sort resources",
      subjectAll: "All Subjects / Topics",
      sortNewest: "Newest",
      sortOldest: "Oldest",
      sortTitleAsc: "Title A-Z",
      sortTitleDesc: "Title Z-A",
      gridLabel: "Grid view",
      listLabel: "List view",
      countZero: "0 resources found",
      countSingle: "1 resource found",
      countPlural: "{count} resources found",
      clearFilters: "Clear filters",
      emptyTitle: "No Resources Found",
      emptyCopy: "Try changing your search terms or filters.",
      viewDetails: "Learn More",
      fallbackCategory: "Edu Resource",
      metadataUnavailable: "Metadata unavailable",
      authorLabel: "Author",
      sourceLabel: "Educator / Source",
    },
    filipino: {
      headerKicker: "Mga Materyal sa Pagkatuto",
      headerCopy: "Tuklasin ang mga kuwentong pangkomunidad, presentasyon, dokumento, at PDF material na inihanda para sa klase at heritage learning.",
      searchLabel: "Maghanap ng mga materyal sa pagkatuto",
      searchPlaceholder: "Maghanap ayon sa pamagat, awtor, educator, o paksa...",
      searchClearLabel: "I-clear ang paghahanap",
      subjectLabel: "I-filter ayon sa paksa",
      sortLabel: "Ayusin ang mga resource",
      subjectAll: "Lahat ng Paksa",
      sortNewest: "Pinakabago",
      sortOldest: "Pinakaluma",
      sortTitleAsc: "Pamagat A-Z",
      sortTitleDesc: "Pamagat Z-A",
      gridLabel: "Grid view",
      listLabel: "List view",
      countZero: "0 resource ang nakita",
      countSingle: "1 resource ang nakita",
      countPlural: "{count} resource ang nakita",
      clearFilters: "I-clear ang mga filter",
      emptyTitle: "Walang Nahanap na Resource",
      emptyCopy: "Subukan ang ibang hahanapin o baguhin ang mga filter.",
      viewDetails: "Tingnan Pa",
      fallbackCategory: "Edu Resource",
      metadataUnavailable: "Walang metadata na available",
      authorLabel: "Awtor",
      sourceLabel: "Educator / Source",
    },
  };

  if (!resourceGrid) {
    return;
  }

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

  function getTimestamp(item) {
    const candidate = Date.parse(String(item.created_at || item.updated_at || ""));
    if (!Number.isNaN(candidate)) {
      return candidate;
    }
    return Number(String(item.id || "").replace(/[^0-9]/g, "") || 0);
  }

  function sortResources(data, mode) {
    const sorted = [...data];
    if (mode === "oldest") {
      return sorted.sort((a, b) => getTimestamp(a) - getTimestamp(b));
    }
    if (mode === "title-asc") {
      return sorted.sort((a, b) => String(a.title || "").localeCompare(String(b.title || "")));
    }
    if (mode === "title-desc") {
      return sorted.sort((a, b) => String(b.title || "").localeCompare(String(a.title || "")));
    }
    return sorted.sort((a, b) => getTimestamp(b) - getTimestamp(a));
  }

  function getSearchValue() {
    return normalizeText(searchInput?.value).toLowerCase();
  }

  function setActiveType(nextType) {
    activeType = nextType || "all";
    typeButtons.forEach((button) => {
      const isActive = button.dataset.resourceTypeFilter === activeType;
      button.classList.toggle("is-active", isActive);
      button.setAttribute("aria-pressed", isActive ? "true" : "false");
      button.setAttribute("aria-selected", isActive ? "true" : "false");
    });
  }

  function setViewMode(nextMode) {
    viewMode = nextMode === "list" ? "list" : "grid";
    resourceGrid.classList.toggle("ogd-gallery-results--grid", viewMode === "grid");
    resourceGrid.classList.toggle("ogd-gallery-results--list", viewMode === "list");
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

  function populateDynamicOptions(select, values, allLabel) {
    if (!select) {
      return;
    }
    const currentValue = select.value || "all";
    const uniqueValues = [...new Set(values.map((value) => normalizeText(value)).filter(Boolean))].sort((a, b) => a.localeCompare(b));
    select.innerHTML = [`<option value="all">${escapeHtml(allLabel)}</option>`]
      .concat(uniqueValues.map((value) => `<option value="${escapeHtml(value)}">${escapeHtml(value)}</option>`))
      .join("");
    select.value = uniqueValues.includes(currentValue) || currentValue === "all" ? currentValue : "all";
  }

  function buildMediaMarkup(item, sizeClass) {
    if (item.is_story && item.cover_image_url) {
      return `<div class="${sizeClass} edu-resource-preview edu-resource-preview--image"><img src="${escapeHtml(item.cover_image_url)}" alt="${escapeHtml(item.title)}" loading="lazy" /></div>`;
    }

    if (!item.is_story && item.file_url) {
      const viewerUrl = item.category === "PDF"
        ? `${item.file_url}#page=1&toolbar=0&navpanes=0&scrollbar=0&view=FitH`
        : `https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(item.file_url)}`;
      return `
        <div class="${sizeClass} edu-resource-preview edu-resource-preview--document" aria-hidden="true">
          <iframe src="${escapeHtml(viewerUrl)}" title="" loading="lazy" tabindex="-1"></iframe>
          <span class="edu-resource-preview__shield"></span>
        </div>
      `;
    }

    return `
      <div class="${sizeClass} edu-resource-preview edu-resource-preview--fallback" style="background:${escapeHtml(item.gradient || 'linear-gradient(135deg, #1e3a5f, #0f172a)')};">
        <div class="text-center p-4 text-white">
          <i data-lucide="${escapeHtml(item.is_story ? 'book-heart' : (item.icon || 'file-text'))}" class="w-12 h-12 mx-auto mb-2"></i>
          <p class="font-semibold text-sm">${escapeHtml(item.is_story ? "Story" : (item.category || getStrings().fallbackCategory))}</p>
        </div>
      </div>
    `;
  }

  function getMetaText(item) {
    if (item.is_story) {
      return [item.author, item.year, item.category].filter(Boolean).join(" • ");
    }
    return [item.educator_name, item.subject_topic, item.format].filter(Boolean).join(" • ");
  }

  function buildCard(item) {
    const strings = getStrings();
    const metaText = getMetaText(item);
    return `
      <article class="ogd-artifact-card">
        <a href="/edu-resources/details?item=${item.id}" class="ogd-artifact-card__media" aria-label="${escapeHtml(strings.viewDetails)}: ${escapeHtml(item.title)}">
          ${buildMediaMarkup(item, "ogd-artifact-card__fallback")}
        </a>
        <div class="ogd-artifact-card__body">
          <h2 class="ogd-artifact-card__title font-serif">${escapeHtml(item.title)}</h2>
          <p class="ogd-artifact-card__summary">${escapeHtml(item.description || "")}</p>
          <div class="ogd-artifact-card__meta">
            <span>${escapeHtml(metaText || strings.metadataUnavailable)}</span>
          </div>
          <a href="/edu-resources/details?item=${item.id}" class="ogd-artifact-card__action" aria-label="${escapeHtml(strings.viewDetails)}: ${escapeHtml(item.title)}">
            <span>${escapeHtml(strings.viewDetails)}</span>
            <i data-lucide="arrow-right" aria-hidden="true"></i>
          </a>
        </div>
      </article>
    `;
  }

  function buildListItem(item) {
    const strings = getStrings();
    const metaText = getMetaText(item);
    return `
      <article class="ogd-list-item-wrap">
        <a href="/edu-resources/details?item=${item.id}" class="ogd-list-item" aria-label="${escapeHtml(strings.viewDetails)}: ${escapeHtml(item.title)}">
          ${buildMediaMarkup(item, "ogd-list-item__media")}
          <div class="ogd-list-item__content">
            <div class="ogd-list-item__head">
              <h2 class="ogd-list-item__title font-serif">${escapeHtml(item.title)}</h2>
              <span class="ogd-list-item__badge">${escapeHtml(item.category || strings.fallbackCategory)}</span>
            </div>
            <p class="ogd-list-item__summary">${escapeHtml(item.description || "")}</p>
            <p class="ogd-list-item__meta">${escapeHtml(metaText || strings.metadataUnavailable)}</p>
          </div>
        </a>
      </article>
    `;
  }

  function updateStaticLabels() {
    const strings = getStrings();
    if (resourceHeaderKicker) resourceHeaderKicker.textContent = strings.headerKicker;
    if (resourceHeaderCopy) resourceHeaderCopy.textContent = strings.headerCopy;
    if (resourceSearchLabel) resourceSearchLabel.textContent = strings.searchLabel;
    if (searchInput) searchInput.placeholder = strings.searchPlaceholder;
    if (searchClearButton) searchClearButton.setAttribute("aria-label", strings.searchClearLabel);
    if (subjectLabel) subjectLabel.textContent = strings.subjectLabel;
    if (sortLabel) sortLabel.textContent = strings.sortLabel;
    if (subjectFilter) subjectFilter.setAttribute("aria-label", strings.subjectLabel);
    if (sortFilter) {
      sortFilter.setAttribute("aria-label", strings.sortLabel);
      const options = sortFilter.querySelectorAll("option");
      if (options[0]) options[0].textContent = strings.sortNewest;
      if (options[1]) options[1].textContent = strings.sortOldest;
      if (options[2]) options[2].textContent = strings.sortTitleAsc;
      if (options[3]) options[3].textContent = strings.sortTitleDesc;
    }
    if (gridViewButton) gridViewButton.setAttribute("aria-label", strings.gridLabel);
    if (listViewButton) listViewButton.setAttribute("aria-label", strings.listLabel);
    if (clearFiltersText) clearFiltersText.textContent = strings.clearFilters;
    if (clearFiltersButton) clearFiltersButton.setAttribute("aria-label", strings.clearFilters);
    typeButtons.forEach((button) => {
      const label = getLanguage() === "english"
        ? normalizeText(button.dataset.labelEn) || button.textContent
        : normalizeText(button.dataset.labelTl) || button.textContent;
      button.textContent = label;
    });
    populateDynamicOptions(subjectFilter, resources.map((item) => item.subject_topic), strings.subjectAll);
  }

  function renderGrid(data) {
    const strings = getStrings();
    if (!data.length) {
      resourceGrid.innerHTML = `
        <div class="ogd-empty-state">
          <div class="ogd-empty-state__icon"><i data-lucide="search" aria-hidden="true"></i></div>
          <h2 class="ogd-empty-state__title font-serif">${escapeHtml(strings.emptyTitle)}</h2>
          <p class="ogd-empty-state__copy">${escapeHtml(strings.emptyCopy)}</p>
        </div>
      `;
      if (resourceCount) {
        resourceCount.textContent = strings.countZero;
      }
      if (clearFiltersButton) {
        clearFiltersButton.hidden = !getSearchValue() && activeType === "all" && (subjectFilter?.value || "all") === "all";
      }
      if (window.lucide && typeof window.lucide.createIcons === "function") {
        window.lucide.createIcons();
      }
      return;
    }

    resourceGrid.innerHTML = viewMode === "list" ? data.map(buildListItem).join("") : data.map(buildCard).join("");
    if (resourceCount) {
      resourceCount.textContent = data.length === 1 ? strings.countSingle : strings.countPlural.replace("{count}", String(data.length));
    }
    if (clearFiltersButton) {
      clearFiltersButton.hidden = !getSearchValue() && activeType === "all" && (subjectFilter?.value || "all") === "all";
    }
    if (window.lucide && typeof window.lucide.createIcons === "function") {
      window.lucide.createIcons();
    }
  }

  function applyFilters() {
    const query = getSearchValue();
    const subject = subjectFilter?.value || "all";
    const sortMode = sortFilter?.value || "newest";

    const filtered = resources.filter((item) => {
      const haystack = [
        item.title,
        item.description,
        item.author,
        item.year,
        item.educator_name,
        item.subject_topic,
        item.category,
        item.format,
      ].join(" ").toLowerCase();
      const inQuery = haystack.includes(query);
      const inType = activeType === "all" || item.category === activeType;
      const inSubject = subject === "all" || item.subject_topic === subject;
      return inQuery && inType && inSubject;
    });

    updateQueryString();
    updateStaticLabels();
    renderGrid(sortResources(filtered, sortMode));
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

  typeButtons.forEach((button) => {
    button.addEventListener("click", () => {
      setActiveType(button.dataset.resourceTypeFilter);
      applyFilters();
    });
  });

  if (subjectFilter) subjectFilter.addEventListener("change", applyFilters);
  if (sortFilter) sortFilter.addEventListener("change", applyFilters);

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
      if (subjectFilter) {
        subjectFilter.value = "all";
      }
      if (sortFilter) {
        sortFilter.value = "newest";
      }
      setActiveType("all");
      applyFilters();
    });
  }

  window.addEventListener("ogd:accessibility-change", () => {
    applyFilters();
  });

  setActiveType(activeType);
  setViewMode(viewMode);
  if (searchClearButton) {
    searchClearButton.hidden = !getSearchValue();
  }
  updateStaticLabels();
  applyFilters();
})();
