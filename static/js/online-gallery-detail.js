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
  const breadcrumbTitleEl = document.getElementById("detailBreadcrumbTitle");
  const metaEl = document.getElementById("detailMeta");
  const categoryPillEl = document.getElementById("detailCategoryPill");
  const imageEl = document.getElementById("detailImage");
  const imageBadgeEl = document.getElementById("detailImageBadge");
  const zoomToggleEl = document.getElementById("detailZoomToggle");
  const zoomHintTextEl = document.getElementById("detailZoomHintText");
  const descEl = document.getElementById("detailDesc");
  const tagsEl = document.getElementById("detailTags");
  const tagsSectionEl = document.getElementById("detailTagsSection");
  const teachingEl = document.getElementById("detailTeaching");
  const teachingSectionEl = document.getElementById("detailTeachingSection");
  const factsEl = document.getElementById("detailFacts");
  const counterEl = document.getElementById("detailCounter");
  const prevBtn = document.getElementById("prevItem");
  const nextBtn = document.getElementById("nextItem");
  const shareButton = document.getElementById("detailShare");
  const shareTextEl = document.getElementById("detailShareText");
  const bookmarkButton = document.getElementById("detailBookmark");
  const bookmarkTextEl = document.getElementById("detailBookmarkText");
  const relatedItemsSection = document.getElementById("relatedItemsSection");
  const relatedItemsGrid = document.getElementById("relatedItemsGrid");
  const BOOKMARK_STORAGE_KEY = "nhcpOnlineGalleryBookmarks";
  let activeIndex = 0;
  let isZoomed = false;

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
    const bookmarked = isBookmarked(itemId);
    bookmarkButton.classList.toggle("is-active", bookmarked);
    bookmarkButton.setAttribute("aria-pressed", bookmarked ? "true" : "false");
    bookmarkTextEl.textContent = bookmarked ? "Bookmarked" : "Bookmark";
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
    zoomToggleEl.classList.toggle("is-zoomed", isZoomed);
    zoomToggleEl.setAttribute("aria-pressed", isZoomed ? "true" : "false");
    zoomToggleEl.setAttribute("aria-label", isZoomed ? "Click to zoom out" : "Click to zoom in");
    zoomHintTextEl.textContent = isZoomed ? "Click to zoom out" : "Click to zoom in";
  }

  function buildDetailImage(item) {
    return item.image_url
      ? `<img src="${escapeHtml(item.image_url)}" alt="${escapeHtml(item.title)}" class="ogd-detail-media__image" />`
      : `<div class="ogd-detail-media__fallback"><span>${escapeHtml(item.category || "Online Gallery")}</span></div>`;
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
    const imageMarkup = item.image_url
      ? `<img src="${escapeHtml(item.image_url)}" alt="${escapeHtml(item.title)}" class="ogd-artifact-card__image" loading="lazy" />`
      : `<div class="ogd-artifact-card__fallback"><span>${escapeHtml(item.category || "Online Gallery")}</span></div>`;
    const yearText = normalizeText(item.year) || "Date unavailable";
    const locationText = normalizeText(item.location);
    return `
      <article class="ogd-artifact-card">
        <a href="/online-gallery/details?item=${item.id}" class="ogd-artifact-card__media" aria-label="View details for ${escapeHtml(item.title)}">
          ${imageMarkup}
          <span class="ogd-artifact-card__badge">${escapeHtml(item.category || "Online Gallery")}</span>
        </a>
        <div class="ogd-artifact-card__body">
          <h3 class="ogd-artifact-card__title font-serif">${escapeHtml(item.title)}</h3>
          <p class="ogd-artifact-card__summary">${escapeHtml(item.short_caption || "")}</p>
          <div class="ogd-artifact-card__meta">
            <span>${escapeHtml(yearText)}</span>
            ${locationText ? `<span aria-hidden="true">·</span><span>${escapeHtml(locationText)}</span>` : ""}
          </div>
          <a href="/online-gallery/details?item=${item.id}" class="ogd-artifact-card__action" aria-label="View more details about ${escapeHtml(item.title)}">
            <span>View More</span>
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
    const sameCategory = items.filter((item) => item.id !== currentItem.id && item.category === currentItem.category);
    const fallbackItems = items.filter((item) => item.id !== currentItem.id && item.category !== currentItem.category);
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
    const currentUrl = window.location.href;
    try {
      if (navigator.share) {
        await navigator.share({
          title: item.title,
          text: normalizeText(item.short_caption) || item.title,
          url: currentUrl,
        });
        return;
      }
      if (navigator.clipboard && typeof navigator.clipboard.writeText === "function") {
        await navigator.clipboard.writeText(currentUrl);
        shareTextEl.textContent = "Link copied";
        window.setTimeout(() => {
          shareTextEl.textContent = "Share";
        }, 1800);
      }
    } catch (_error) {
      shareTextEl.textContent = "Share";
    }
  }

  if (!items.length) {
    if (titleEl) titleEl.textContent = "No gallery items available";
    if (breadcrumbTitleEl) breadcrumbTitleEl.textContent = "Unavailable";
    if (metaEl) metaEl.textContent = "Please return to the gallery page.";
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

    activeIndex = index;
    setZoomState(false);

    if (titleEl) titleEl.textContent = item.title;
    if (breadcrumbTitleEl) breadcrumbTitleEl.textContent = item.title;
    if (categoryPillEl) categoryPillEl.textContent = normalizeText(item.category) || "Online Gallery";
    if (metaEl) {
      const metaParts = [item.year, item.location].filter((value) => normalizeText(value));
      metaEl.textContent = metaParts.join(" • ");
    }

    if (imageEl) {
      imageEl.innerHTML = buildDetailImage(item);
    }
    if (imageBadgeEl) imageBadgeEl.textContent = normalizeText(item.category) || "Online Gallery";

    if (descEl) {
      descEl.textContent = item.full_description;
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
        buildFactItem("tag", "Category", normalizeText(item.category) || "Online Gallery"),
        buildFactItem("calendar", "Year / Period", normalizeText(item.year) || "Date unavailable"),
        buildFactItem("map-pin", "Location", normalizeText(item.location) || "Location unavailable"),
        buildFactItem("star", "Archive Record", `Item ${item.id}`),
      ].join("");
      factsEl.innerHTML = factMarkup;
    }

    if (counterEl) {
      counterEl.textContent = `Item ${activeIndex + 1} of ${items.length}`;
    }

    document.title = `${item.title} | Online Gallery`;
    updateBookmarkUi(item.id);
    renderRelatedItems(item);

    if (window.lucide && typeof window.lucide.createIcons === "function") {
      window.lucide.createIcons();
    }

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

  render(activeIndex);
})();
