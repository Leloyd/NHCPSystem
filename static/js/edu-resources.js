(function () {
  const resources = Array.isArray(window.EDU_RESOURCES_ITEMS)
    ? [...window.EDU_RESOURCES_ITEMS]
    : [];

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
  const audienceFilter = document.getElementById("resourceAudienceFilter");
  const formatFilter = document.getElementById("resourceFormatFilter");
  const sortFilter = document.getElementById("resourceSortFilter");
  const audienceLabel = document.getElementById("resourceAudienceLabel");
  const formatLabel = document.getElementById("resourceFormatLabel");
  const sortLabel = document.getElementById("resourceSortLabel");
  const clearFiltersButton = document.getElementById("resourceClearFilters");
  const clearFiltersText = document.getElementById("resourceClearFiltersText");
  const gridViewButton = document.getElementById("resourceViewGrid");
  const listViewButton = document.getElementById("resourceViewList");
  const params = new URLSearchParams(window.location.search);
  let activeType = "all";
  let viewMode = "grid";

  const typeLabels = {
    "Lesson Plan": { english: "Lesson Plan", filipino: "Banghay-Aralin" },
    Worksheet: { english: "Worksheet", filipino: "Worksheet" },
    Discussion: { english: "Discussion", filipino: "Talakayan" },
    Assessment: { english: "Assessment", filipino: "Pagtataya" },
    Reflection: { english: "Reflection", filipino: "Pagninilay" },
  };

  const audienceLabels = {
    Students: { english: "Students", filipino: "Mga Estudyante" },
    Teachers: { english: "Teachers", filipino: "Mga Guro" },
    Mixed: { english: "Mixed Class", filipino: "Pinaghalong Klase" },
  };

  const i18n = {
    english: {
      headerKicker: "Learning Materials",
      headerCopy: "Explore ready-to-use lesson guides, worksheets, and prompts that can support the museum's Virtual Tour, Site Map, AR, WebXR, and Online Gallery modules.",
      searchLabel: "Search learning resources",
      searchPlaceholder: "Search by title, objective, module, or tag...",
      searchClearLabel: "Clear search",
      audienceLabel: "Filter by audience",
      formatLabel: "Filter by format",
      sortLabel: "Sort resources",
      audienceAria: "Filter by audience",
      formatAria: "Filter by format",
      sortAria: "Sort resources",
      audienceAll: "All Audiences",
      audienceStudents: "Students",
      audienceTeachers: "Teachers",
      audienceMixed: "Mixed Class",
      formatAll: "All Formats",
      sortNewest: "Newest",
      sortOldest: "Oldest",
      sortMostUsed: "Most Used",
      sortCurated: "Curated",
      gridLabel: "Grid view",
      listLabel: "List view",
      countZero: "0 resources found",
      countSingle: "1 resource found",
      countPlural: "{count} resources found",
      clearFilters: "Clear filters",
      emptyTitle: "No Resources Found",
      emptyCopy: "Try changing your search terms or filter options.",
      viewDetails: "Learn More",
      download: "Download",
      fallbackCategory: "Edu Resource",
      metadataUnavailable: "Metadata unavailable",
    },
    filipino: {
      headerKicker: "Mga Materyal sa Pagkatuto",
      headerCopy: "Tuklasin ang mga handang-gamitin na lesson guide, worksheet, at prompt na maaaring iayon sa Virtual Tour, Site Map, AR, WebXR, at Online Gallery ng museo.",
      searchLabel: "Maghanap ng mga materyal sa pagkatuto",
      searchPlaceholder: "Maghanap ayon sa pamagat, layunin, module, o tag...",
      searchClearLabel: "I-clear ang paghahanap",
      audienceLabel: "I-filter ayon sa audience",
      formatLabel: "I-filter ayon sa format",
      sortLabel: "Ayusin ang mga resource",
      audienceAria: "I-filter ayon sa audience",
      formatAria: "I-filter ayon sa format",
      sortAria: "Ayusin ang mga resource",
      audienceAll: "Lahat ng Audience",
      audienceStudents: "Mga Estudyante",
      audienceTeachers: "Mga Guro",
      audienceMixed: "Pinaghalong Klase",
      formatAll: "Lahat ng Format",
      sortNewest: "Pinakabago",
      sortOldest: "Pinakaluma",
      sortMostUsed: "Pinakaginagamit",
      sortCurated: "Kurado",
      gridLabel: "Grid view",
      listLabel: "List view",
      countZero: "0 resource ang nakita",
      countSingle: "1 resource ang nakita",
      countPlural: "{count} resource ang nakita",
      clearFilters: "I-clear ang mga filter",
      emptyTitle: "Walang Nahanap na Resource",
      emptyCopy: "Subukan ang ibang hahanapin o baguhin ang mga filter.",
      viewDetails: "Tingnan Pa",
      download: "I-download",
      fallbackCategory: "Edu Resource",
      metadataUnavailable: "Walang metadata na available",
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

  function getLocalizedType(type) {
    const entry = typeLabels[type];
    return entry ? entry[getLanguage()] || entry.english : type;
  }

  function getLocalizedAudience(audience) {
    const entry = audienceLabels[audience];
    return entry ? entry[getLanguage()] || entry.english : audience;
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

  function buildMediaMarkup(item, sizeClass) {
    return `
      <div class="${sizeClass}" style="background:${escapeHtml(item.gradient)}; display:flex; align-items:center; justify-content:center;">
        <div class="text-center p-4 text-white">
          <i data-lucide="${escapeHtml(item.icon)}" class="w-12 h-12 mx-auto mb-2"></i>
          <p class="font-semibold text-sm">${escapeHtml(getLocalizedType(item.type))}</p>
        </div>
      </div>
    `;
  }

  function buildCard(item) {
    const strings = getStrings();
    const metaText = [getLocalizedAudience(item.audience), item.format, item.year].filter(Boolean).join(" • ");
    return `
      <article class="ogd-artifact-card">
        <a href="/edu-resources/details?item=${item.id}" class="ogd-artifact-card__media" aria-label="${escapeHtml(strings.viewDetails)}: ${escapeHtml(item.title)}">
          ${buildMediaMarkup(item, "ogd-artifact-card__fallback")}
        </a>
        <div class="ogd-artifact-card__body">
          <h2 class="ogd-artifact-card__title font-serif">${escapeHtml(item.title)}</h2>
          <p class="ogd-artifact-card__summary">${escapeHtml(item.description)}</p>
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
    const metaText = [getLocalizedAudience(item.audience), item.format, item.year, item.recommendedModule].filter(Boolean).join(" • ");
    return `
      <article class="ogd-list-item-wrap">
        <a href="/edu-resources/details?item=${item.id}" class="ogd-list-item" aria-label="${escapeHtml(strings.viewDetails)}: ${escapeHtml(item.title)}">
          <div class="ogd-list-item__media" style="background:${escapeHtml(item.gradient)}; display:flex; align-items:center; justify-content:center;">
            <i data-lucide="${escapeHtml(item.icon)}" class="w-8 h-8 text-white" aria-hidden="true"></i>
          </div>
          <div class="ogd-list-item__content">
            <div class="ogd-list-item__head">
              <h2 class="ogd-list-item__title font-serif">${escapeHtml(item.title)}</h2>
              <span class="ogd-list-item__badge">${escapeHtml(getLocalizedType(item.type))}</span>
            </div>
            <p class="ogd-list-item__summary">${escapeHtml(item.description)}</p>
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
    if (audienceLabel) audienceLabel.textContent = strings.audienceLabel;
    if (formatLabel) formatLabel.textContent = strings.formatLabel;
    if (sortLabel) sortLabel.textContent = strings.sortLabel;
    if (audienceFilter) {
      audienceFilter.setAttribute("aria-label", strings.audienceAria);
      const options = audienceFilter.querySelectorAll("option");
      if (options[0]) options[0].textContent = strings.audienceAll;
      if (options[1]) options[1].textContent = strings.audienceStudents;
      if (options[2]) options[2].textContent = strings.audienceTeachers;
      if (options[3]) options[3].textContent = strings.audienceMixed;
    }
    if (formatFilter) {
      formatFilter.setAttribute("aria-label", strings.formatAria);
      const options = formatFilter.querySelectorAll("option");
      if (options[0]) options[0].textContent = strings.formatAll;
    }
    if (sortFilter) {
      sortFilter.setAttribute("aria-label", strings.sortAria);
      const options = sortFilter.querySelectorAll("option");
      if (options[0]) options[0].textContent = strings.sortNewest;
      if (options[1]) options[1].textContent = strings.sortOldest;
      if (options[2]) options[2].textContent = strings.sortMostUsed;
      if (options[3]) options[3].textContent = strings.sortCurated;
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
        clearFiltersButton.hidden = !getSearchValue() && activeType === "all" && (audienceFilter?.value || "all") === "all" && (formatFilter?.value || "all") === "all";
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
      clearFiltersButton.hidden = !getSearchValue() && activeType === "all" && (audienceFilter?.value || "all") === "all" && (formatFilter?.value || "all") === "all";
    }
    if (window.lucide && typeof window.lucide.createIcons === "function") {
      window.lucide.createIcons();
    }
  }

  function applyFilters() {
    const query = getSearchValue();
    const audience = audienceFilter?.value || "all";
    const format = formatFilter?.value || "all";
    const sortMode = sortFilter?.value || "newest";

    const filtered = resources.filter((item) => {
      const haystack = [
        item.title,
        item.description,
        item.fullDescription,
        item.learningObjective,
        item.recommendedModule,
        item.teachingPrompt,
        item.type,
        item.audience,
        item.format,
        item.year,
        Array.isArray(item.tags) ? item.tags.join(" ") : "",
      ].join(" ").toLowerCase();
      const inQuery = haystack.includes(query);
      const inType = activeType === "all" || item.type === activeType;
      const inAudience = audience === "all" || item.audience === audience;
      const inFormat = format === "all" || item.format === format;
      return inQuery && inType && inAudience && inFormat;
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

  if (audienceFilter) audienceFilter.addEventListener("change", applyFilters);
  if (formatFilter) formatFilter.addEventListener("change", applyFilters);
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
      if (audienceFilter) {
        audienceFilter.value = "all";
      }
      if (formatFilter) {
        formatFilter.value = "all";
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
