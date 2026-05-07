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
  const metaEl = document.getElementById("detailMeta");
  const imageEl = document.getElementById("detailImage");
  const descEl = document.getElementById("detailDesc");
  const tagsEl = document.getElementById("detailTags");
  const teachingEl = document.getElementById("detailTeaching");
  const counterEl = document.getElementById("detailCounter");
  const prevBtn = document.getElementById("prevItem");
  const nextBtn = document.getElementById("nextItem");

  if (!items.length) {
    if (titleEl) titleEl.textContent = "No gallery items available";
    if (metaEl) metaEl.textContent = "Please return to the gallery page.";
    if (imageEl) imageEl.innerHTML = "";
    if (descEl) descEl.textContent = "";
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

    if (titleEl) titleEl.textContent = item.title;
    if (metaEl) {
      metaEl.textContent = `${item.period} • ${item.year} • ${item.location} • Source: ${item.source}`;
    }

    if (imageEl) {
      imageEl.innerHTML = item.image_url
        ? `<img src="${item.image_url}" alt="${item.title}" class="gallery-detail-card__image-tag" />`
        : `<div class="gallery-thumb__fallback"><p class="gallery-thumb__category">${item.category || "Online Gallery"}</p></div>`;
    }

    if (descEl) {
      descEl.textContent = item.full_description;
    }

    if (tagsEl) {
      tagsEl.innerHTML = item.tags.map((tag) => `<span class="gallery-tag">${tag}</span>`).join("");
    }

    if (teachingEl) {
      teachingEl.textContent = item.teaching_note;
    }

    if (counterEl) {
      counterEl.textContent = `Item ${activeIndex + 1} of ${items.length}`;
    }

    document.title = `${item.title} | Online Gallery`;

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
