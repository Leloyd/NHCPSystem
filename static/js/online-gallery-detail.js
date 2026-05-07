(function () {
  const itemsDataScript = document.getElementById("onlineGalleryItemsData");
  let items = [];
  try {
    const parsedItems = itemsDataScript ? JSON.parse(itemsDataScript.textContent || "[]") : window.ONLINE_GALLERY_ITEMS;
    items = Array.isArray(parsedItems) ? [...parsedItems] : [];
  } catch (_error) {
    items = [];
  }

  const titleEl = document.getElementById("detailTitle");
  const breadcrumbHomeEl = document.getElementById("detailBreadcrumbHome");
  const breadcrumbGalleryEl = document.getElementById("detailBreadcrumbGallery");
  const breadcrumbTitleEl = document.getElementById("detailBreadcrumbTitle");
  const metaEl = document.getElementById("detailMeta");
  const categoryPillEl = document.getElementById("detailCategoryPill");
  const imageEl = document.getElementById("detailImage");
  const imageBadgeEl = document.getElementById("detailImageBadge");
  const zoomToggleEl = document.getElementById("detailZoomToggle");
  const zoomHintTextEl = document.getElementById("detailZoomHintText");
  const descEl = document.getElementById("detailDesc");
  const descHeadingEl = document.getElementById("detailDescriptionHeading");
  const tagsEl = document.getElementById("detailTags");
  const tagsHeadingEl = document.getElementById("detailTagsHeading");
  const tagsSectionEl = document.getElementById("detailTagsSection");
  const teachingEl = document.getElementById("detailTeaching");
  const teachingHeadingEl = document.getElementById("detailTeachingHeading");
  const teachingSectionEl = document.getElementById("detailTeachingSection");
  const factsEl = document.getElementById("detailFacts");
  const factsHeadingEl = document.getElementById("detailFactsHeading");
  const counterEl = document.getElementById("detailCounter");
  const prevBtn = document.getElementById("prevItem");
  const nextBtn = document.getElementById("nextItem");
  const shareButton = document.getElementById("detailShare");
  const shareTextEl = document.getElementById("detailShareText");
  const bookmarkButton = document.getElementById("detailBookmark");
  const bookmarkTextEl = document.getElementById("detailBookmarkText");
  const backTextEl = document.getElementById("detailBackText");
  const relatedSectionKickerEl = document.getElementById("relatedSectionKicker");
  const relatedSectionTitleEl = document.getElementById("relatedSectionTitle");
  const relatedSectionLinkEl = document.getElementById("relatedSectionLink");
  const relatedItemsSection = document.getElementById("relatedItemsSection");
  const relatedItemsGrid = document.getElementById("relatedItemsGrid");
  const BOOKMARK_STORAGE_KEY = "nhcpOnlineGalleryBookmarks";
  let activeIndex = 0;
  let isZoomed = false;

  const i18n = {
    english: {
      home: "Home",
      gallery: "Gallery",
      prev: "Previous artifact",
      next: "Next artifact",
      zoomIn: "Click to zoom in",
      zoomOut: "Click to zoom out",
      bookmark: "Bookmark",
      bookmarked: "Bookmarked",
      share: "Share",
      linkCopied: "Link copied",
      description: "Description",
      tags: "Tags",
      teaching: "Teaching Note",
      facts: "Artifact Details",
      back: "Back to Gallery",
      relatedKicker: "You Might Also Like",
      relatedTitle: "Related Artifacts",
      relatedLink: "View All",
      itemCounter: "Item {current} of {total}",
      itemUnavailable: "No gallery items available",
      unavailable: "Unavailable",
      returnMessage: "Please return to the gallery page.",
      category: "Category",
      year: "Year / Period",
      location: "Location",
      record: "Archive Record",
      recordValue: "Item {id}",
      dateUnavailable: "Date unavailable",
      locationUnavailable: "Location unavailable",
      fallbackCategory: "Online Gallery",
      viewDetails: "View More",
      detailTitleSuffix: "Online Gallery",
    },
    filipino: {
      home: "Tahanan",
      gallery: "Gallery",
      prev: "Nakaraang artifact",
      next: "Susunod na artifact",
      zoomIn: "I-click para i-zoom in",
      zoomOut: "I-click para i-zoom out",
      bookmark: "I-bookmark",
      bookmarked: "Naka-bookmark",
      share: "Ibahagi",
      linkCopied: "Nakopya ang link",
      description: "Paglalarawan",
      tags: "Mga Tag",
      teaching: "Tala sa Pagtuturo",
      facts: "Detalye ng Artifact",
      back: "Bumalik sa Gallery",
      relatedKicker: "Maaari Mo Ring Magustuhan",
      relatedTitle: "Kaugnay na mga Artifact",
      relatedLink: "Tingnan Lahat",
      itemCounter: "Artifact {current} ng {total}",
      itemUnavailable: "Walang available na artifact sa gallery",
      unavailable: "Hindi available",
      returnMessage: "Mangyaring bumalik sa pahina ng gallery.",
      category: "Kategorya",
      year: "Taon / Panahon",
      location: "Lokasyon",
      record: "Tala sa Archive",
      recordValue: "Artifact {id}",
      dateUnavailable: "Walang petsang available",
      locationUnavailable: "Walang lokasyong available",
      fallbackCategory: "Online Gallery",
      viewDetails: "Tingnan Pa",
      detailTitleSuffix: "Online Gallery",
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

  function getLocalizedTitle(item) {
    return getLocalizedField(item, "title");
  }

  function getLocalizedSummary(item) {
    return getLocalizedField(item, "short_caption");
  }

  function getLocalizedDescription(item) {
    return getLocalizedField(item, "full_description");
  }

  function getLocalizedLocation(item) {
    return getLocalizedField(item, "location");
  }

  function getBookmarks() {
    try {
      const parsed = JSON.parse(window.localStorage.getItem(BOOKMARK_STORAGE_KEY) || "[]");
      return Array.isArray(parsed) ? parsed : [];
    } catch (_error) {
      return [];
    }
  }

  function setBookmarks(nextBookmarks) {
    try {
      window.localStorage.setItem(BOOKMARK_STORAGE_KEY, JSON.stringify(nextBookmarks));
    } catch (_error) {
      return;
    }
  }

  function isBookmarked(itemId) {
    return getBookmarks().includes(String(itemId));
  }

  function updateBookmarkUi(itemId) {
    if (!bookmarkButton || !bookmarkTextEl) {
      return;
    }
    const strings = getStrings();
    const bookmarked = isBookmarked(itemId);
    bookmarkButton.classList.toggle("is-active", bookmarked);
    bookmarkButton.setAttribute("aria-pressed", bookmarked ? "true" : "false");
    bookmarkTextEl.textContent = bookmarked ? strings.bookmarked : strings.bookmark;
  }

  function toggleBookmark(itemId) {
    const normalizedId = String(itemId);
    const bookmarks = getBookmarks();
    const nextBookmarks = bookmarks.includes(normalizedId)
      ? bookmarks.filter((value) => value !== normalizedId)
      : [...bookmarks, normalizedId];
    setBookmarks(nextBookmarks);
    updateBookmarkUi(itemId);
  }

  function setZoomState(nextZoomed) {
    isZoomed = Boolean(nextZoomed);
    if (!zoomToggleEl || !zoomHintTextEl) {
      return;
    }
    const strings = getStrings();
    const label = isZoomed ? strings.zoomOut : strings.zoomIn;
    zoomToggleEl.classList.toggle("is-zoomed", isZoomed);
    zoomToggleEl.setAttribute("aria-pressed", isZoomed ? "true" : "false");
    zoomToggleEl.setAttribute("aria-label", label);
    zoomHintTextEl.textContent = label;
  }

  function buildDetailImage(item) {
    const title = getLocalizedTitle(item);
    const category = getLocalizedCategory(item) || getStrings().fallbackCategory;
    return item.image_url
      ? `<img src="${escapeHtml(item.image_url)}" alt="${escapeHtml(title)}" class="ogd-detail-media__image" />`
      : `<div class="ogd-detail-media__fallback"><span>${escapeHtml(category)}</span></div>`;
  }

  function buildFactItem(iconName, label, value) {
    return `
      <div class="ogd-detail-fact">
        <div class="ogd-detail-fact__icon"><i data-lucide="${iconName}" aria-hidden="true"></i></div>
        <div class="ogd-detail-fact__content">
          <dt class="ogd-detail-fact__label">${escapeHtml(label)}</dt>
          <dd class="ogd-detail-fact__value">${escapeHtml(value)}</dd>
        </div>
      </div>
    `;
  }

  function buildRelatedCard(item) {
    const strings = getStrings();
    const title = getLocalizedTitle(item);
    const summary = getLocalizedSummary(item);
    const category = getLocalizedCategory(item) || strings.fallbackCategory;
    const yearText = normalizeText(item.year) || strings.dateUnavailable;
    const locationText = getLocalizedLocation(item);
    const imageMarkup = item.image_url
      ? `<img src="${escapeHtml(item.image_url)}" alt="${escapeHtml(title)}" class="ogd-artifact-card__image" loading="lazy" />`
      : `<div class="ogd-artifact-card__fallback"><span>${escapeHtml(category)}</span></div>`;
    return `
      <article class="ogd-artifact-card">
        <a href="/online-gallery/details?item=${item.id}" class="ogd-artifact-card__media" aria-label="${escapeHtml(strings.viewDetails)}: ${escapeHtml(title)}">
          ${imageMarkup}
          <span class="ogd-artifact-card__badge">${escapeHtml(category)}</span>
        </a>
        <div class="ogd-artifact-card__body">
          <h3 class="ogd-artifact-card__title font-serif">${escapeHtml(title)}</h3>
          <p class="ogd-artifact-card__summary">${escapeHtml(summary)}</p>
          <div class="ogd-artifact-card__meta">
            <span>${escapeHtml(yearText)}</span>
            ${locationText ? `<span aria-hidden="true">·</span><span>${escapeHtml(locationText)}</span>` : ""}
          </div>
          <a href="/online-gallery/details?item=${item.id}" class="ogd-artifact-card__action" aria-label="${escapeHtml(strings.viewDetails)}: ${escapeHtml(title)}">
            <span>${escapeHtml(strings.viewDetails)}</span>
            <i data-lucide="arrow-right" aria-hidden="true"></i>
          </a>
        </div>
      </article>
    `;
  }

  function renderRelatedItems(currentItem) {
    if (!relatedItemsSection || !relatedItemsGrid) {
      return;
    }
    const sameCategory = items.filter((item) => item.id !== currentItem.id && normalizeText(item.category_id) === normalizeText(currentItem.category_id));
    const fallbackItems = items.filter((item) => item.id !== currentItem.id && normalizeText(item.category_id) !== normalizeText(currentItem.category_id));
    const related = [...sameCategory, ...fallbackItems].slice(0, 4);
    if (!related.length) {
      relatedItemsSection.hidden = true;
      relatedItemsGrid.innerHTML = "";
      return;
    }
    relatedItemsGrid.innerHTML = related.map(buildRelatedCard).join("");
    relatedItemsSection.hidden = false;
  }

  async function handleShare(item) {
    if (!shareTextEl) {
      return;
    }
    const strings = getStrings();
    const currentUrl = window.location.href;
    try {
      if (navigator.share) {
        await navigator.share({
          title: getLocalizedTitle(item),
          text: getLocalizedSummary(item) || getLocalizedTitle(item),
          url: currentUrl,
        });
        return;
      }
      if (navigator.clipboard && typeof navigator.clipboard.writeText === "function") {
        await navigator.clipboard.writeText(currentUrl);
        shareTextEl.textContent = strings.linkCopied;
        window.setTimeout(() => {
          shareTextEl.textContent = strings.share;
        }, 1800);
      }
    } catch (_error) {
      shareTextEl.textContent = strings.share;
    }
  }

  function updateStaticLabels() {
    const strings = getStrings();
    if (breadcrumbHomeEl) breadcrumbHomeEl.textContent = strings.home;
    if (breadcrumbGalleryEl) breadcrumbGalleryEl.textContent = strings.gallery;
    if (prevBtn) prevBtn.setAttribute("aria-label", strings.prev);
    if (nextBtn) nextBtn.setAttribute("aria-label", strings.next);
    if (descHeadingEl) descHeadingEl.textContent = strings.description;
    if (tagsHeadingEl) tagsHeadingEl.textContent = strings.tags;
    if (teachingHeadingEl) teachingHeadingEl.textContent = strings.teaching;
    if (factsHeadingEl) factsHeadingEl.textContent = strings.facts;
    if (backTextEl) backTextEl.textContent = strings.back;
    if (relatedSectionKickerEl) relatedSectionKickerEl.textContent = strings.relatedKicker;
    if (relatedSectionTitleEl) relatedSectionTitleEl.textContent = strings.relatedTitle;
    if (relatedSectionLinkEl) relatedSectionLinkEl.textContent = strings.relatedLink;
    if (shareTextEl) shareTextEl.textContent = strings.share;
    setZoomState(isZoomed);
    const currentItem = items[activeIndex];
    if (currentItem) {
      updateBookmarkUi(currentItem.id);
    }
  }

  if (!items.length) {
    const strings = getStrings();
    if (titleEl) titleEl.textContent = strings.itemUnavailable;
    if (breadcrumbTitleEl) breadcrumbTitleEl.textContent = strings.unavailable;
    if (metaEl) metaEl.textContent = strings.returnMessage;
    if (imageEl) imageEl.innerHTML = "";
    if (descEl) descEl.textContent = "";
    if (tagsEl) tagsEl.innerHTML = "";
    if (teachingEl) teachingEl.textContent = "";
    if (factsEl) factsEl.innerHTML = "";
    if (prevBtn) prevBtn.disabled = true;
    if (nextBtn) nextBtn.disabled = true;
    if (zoomToggleEl) zoomToggleEl.disabled = true;
    if (bookmarkButton) bookmarkButton.disabled = true;
    if (shareButton) shareButton.disabled = true;
    updateStaticLabels();
    return;
  }

  const params = new URLSearchParams(window.location.search);
  const requestedId = Number(params.get("item"));

  activeIndex = items.findIndex((item) => item.id === requestedId);
  if (activeIndex < 0) {
    activeIndex = 0;
  }

  function navigateToItem(itemId) {
    const nextUrl = new URL(window.location.href);
    nextUrl.searchParams.set("item", String(itemId));
    window.location.assign(nextUrl.toString());
  }

  function render(index) {
    const item = items[index];
    if (!item) {
      return;
    }

    const strings = getStrings();
    const title = getLocalizedTitle(item);
    const category = getLocalizedCategory(item) || strings.fallbackCategory;
    const location = getLocalizedLocation(item);
    const year = normalizeText(item.year) || strings.dateUnavailable;
    const summary = getLocalizedSummary(item);
    const description = getLocalizedDescription(item);

    activeIndex = index;
    setZoomState(false);
    updateStaticLabels();

    if (titleEl) titleEl.textContent = title;
    if (breadcrumbTitleEl) breadcrumbTitleEl.textContent = title;
    if (categoryPillEl) categoryPillEl.textContent = category;
    if (metaEl) {
      const metaParts = [normalizeText(item.year), location].filter((value) => normalizeText(value));
      metaEl.textContent = metaParts.join(" • ");
    }

    if (imageEl) {
      imageEl.innerHTML = buildDetailImage(item);
    }
    if (imageBadgeEl) imageBadgeEl.textContent = category;

    if (descEl) {
      descEl.textContent = description;
    }

    if (tagsEl && tagsSectionEl) {
      const tagMarkup = Array.isArray(item.tags) ? item.tags.map((tag) => `<span class="ogd-detail-tag">${escapeHtml(tag)}</span>`).join("") : "";
      tagsEl.innerHTML = tagMarkup;
      tagsSectionEl.hidden = !tagMarkup;
    }

    if (teachingEl && teachingSectionEl) {
      const teachingNote = normalizeText(item.teaching_note);
      teachingEl.textContent = teachingNote;
      teachingSectionEl.hidden = !teachingNote;
    }

    if (factsEl) {
      const factMarkup = [
        buildFactItem("tag", strings.category, category),
        buildFactItem("calendar", strings.year, year),
        buildFactItem("map-pin", strings.location, location || strings.locationUnavailable),
        buildFactItem("star", strings.record, strings.recordValue.replace("{id}", String(item.id))),
      ].join("");
      factsEl.innerHTML = factMarkup;
    }

    if (counterEl) {
      counterEl.textContent = strings.itemCounter
        .replace("{current}", String(activeIndex + 1))
        .replace("{total}", String(items.length));
    }

    document.title = `${title} | ${strings.detailTitleSuffix}`;
    updateBookmarkUi(item.id);
    renderRelatedItems(item);

    if (window.lucide && typeof window.lucide.createIcons === "function") {
      window.lucide.createIcons();
    }

    void summary;
  }

  if (prevBtn) {
    prevBtn.addEventListener("click", () => {
      const nextIndex = (activeIndex - 1 + items.length) % items.length;
      navigateToItem(items[nextIndex].id);
    });
  }

  if (nextBtn) {
    nextBtn.addEventListener("click", () => {
      const nextIndex = (activeIndex + 1) % items.length;
      navigateToItem(items[nextIndex].id);
    });
  }

  if (zoomToggleEl) {
    zoomToggleEl.addEventListener("click", () => {
      setZoomState(!isZoomed);
    });
  }

  if (bookmarkButton) {
    bookmarkButton.addEventListener("click", () => {
      const currentItem = items[activeIndex];
      if (!currentItem) {
        return;
      }
      toggleBookmark(currentItem.id);
    });
  }

  if (shareButton) {
    shareButton.addEventListener("click", () => {
      const currentItem = items[activeIndex];
      if (!currentItem) {
        return;
      }
      handleShare(currentItem);
    });
  }

  window.addEventListener("ogd:accessibility-change", () => {
    render(activeIndex);
  });

  render(activeIndex);
})();
