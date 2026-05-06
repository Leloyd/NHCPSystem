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
  const titleTranslationEl = document.getElementById("detailTitleTranslation");
  const metaEl = document.getElementById("detailMeta");
  const imageEl = document.getElementById("detailImage");
  const descEl = document.getElementById("detailDesc");
  const descTranslationEl = document.getElementById("detailDescTranslation");
  const locationTranslationEl = document.getElementById("detailLocationTranslation");
  const tagsEl = document.getElementById("detailTags");
  const teachingEl = document.getElementById("detailTeaching");
  const counterEl = document.getElementById("detailCounter");
  const prevBtn = document.getElementById("prevItem");
  const nextBtn = document.getElementById("nextItem");

  function escapeHtml(value) {
    return String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/\"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  if (!items.length) {
    if (titleEl) titleEl.textContent = "No gallery items available";
    if (titleTranslationEl) titleTranslationEl.textContent = "";
    if (metaEl) metaEl.textContent = "Please return to the gallery page.";
    if (imageEl) imageEl.innerHTML = "";
    if (descEl) descEl.textContent = "";
    if (descTranslationEl) descTranslationEl.textContent = "";
    if (locationTranslationEl) locationTranslationEl.textContent = "";
    if (tagsEl) tagsEl.innerHTML = "";
    if (teachingEl) teachingEl.textContent = "";
    if (prevBtn) prevBtn.disabled = true;
    if (nextBtn) nextBtn.disabled = true;
    return;
  }

  const params = new URLSearchParams(window.location.search);
  const requestedId = Number(params.get("item"));

  let activeIndex = items.findIndex((item) => item.id === requestedId);
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

    if (titleEl) titleEl.textContent = item.title || item.title_tl || "Untitled";
    if (titleTranslationEl) {
      titleTranslationEl.textContent = item.title_tl || "";
      titleTranslationEl.hidden = !String(item.title_tl || "").trim();
    }
    if (metaEl) {
      const metaParts = [item.category, item.year, item.location].filter(Boolean);
      metaEl.textContent = metaParts.join(" • ");
    }

    if (imageEl) {
      imageEl.innerHTML = item.image_url
        ? `<img src="${escapeHtml(item.image_url)}" alt="${escapeHtml(item.title || item.title_tl || "Online Gallery item")}" class="gallery-detail-card__image-tag" />`
        : `<div class="gallery-thumb__fallback"><p class="gallery-thumb__category">${escapeHtml(item.category || "Online Gallery")}</p></div>`;
    }

    if (descEl) descEl.textContent = item.full_description || "";
    if (descTranslationEl) {
      descTranslationEl.textContent = item.full_description_tl || "";
      descTranslationEl.hidden = !String(item.full_description_tl || "").trim();
    }
    if (locationTranslationEl) {
      const locationSecondary = String(item.location_tl || "").trim();
      locationTranslationEl.textContent = locationSecondary ? `Tagalog Location: ${locationSecondary}` : "";
      locationTranslationEl.hidden = !locationSecondary;
    }

    if (tagsEl) {
      tagsEl.innerHTML = (Array.isArray(item.tags) ? item.tags : []).map((tag) => `<span class="gallery-tag">${escapeHtml(tag)}</span>`).join("");
    }

    if (teachingEl) {
      teachingEl.textContent = item.teaching_note || "";
    }

    if (counterEl) {
      counterEl.textContent = `Item ${activeIndex + 1} of ${items.length}`;
    }

    document.title = `${item.title || item.title_tl || "Online Gallery"} | Online Gallery`;

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

  render(activeIndex);
})();
