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

  const items = readEduResourcesData();
  const titleEl = document.getElementById("detailTitle");
  const breadcrumbHomeEl = document.getElementById("detailBreadcrumbHome");
  const breadcrumbResourcesEl = document.getElementById("detailBreadcrumbResources");
  const breadcrumbTitleEl = document.getElementById("detailBreadcrumbTitle");
  const metaEl = document.getElementById("detailMeta");
  const categoryPillEl = document.getElementById("detailCategoryPill");
  const imageEl = document.getElementById("detailImage");
  const imageBadgeEl = document.getElementById("detailImageBadge");
  const mediaShellEl = document.getElementById("detailMediaShell");
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
  const backTextEl = document.getElementById("detailBackText");
  const relatedSectionKickerEl = document.getElementById("relatedSectionKicker");
  const relatedSectionTitleEl = document.getElementById("relatedSectionTitle");
  const relatedSectionLinkEl = document.getElementById("relatedSectionLink");
  const relatedItemsSection = document.getElementById("relatedItemsSection");
  const relatedItemsGrid = document.getElementById("relatedItemsGrid");
  const downloadRowEl = document.getElementById("detailDownloadRow");
  const downloadLinkEl = document.getElementById("detailDownloadLink");
  const downloadTextEl = document.getElementById("detailDownloadText");
  let activeIndex = 0;
  let isZoomed = false;

  const i18n = {
    english: {
      home: "Home",
      resources: "Edu Resources",
      prev: "Previous resource",
      next: "Next resource",
      zoomIn: "Click to zoom in",
      zoomOut: "Click to zoom out",
      description: "Description",
      tags: "Tags",
      teaching: "Teaching Prompt",
      facts: "Resource Details",
      back: "Back to Edu Resources",
      relatedKicker: "You Might Also Like",
      relatedTitle: "Related Resources",
      relatedLink: "View All",
      viewDetails: "Learn More",
      download: "Download Resource",
      documentPreview: "Use the viewer controls to move between pages or slides.",
      itemCounter: "Resource {current} of {total}",
      itemUnavailable: "No resources available",
      unavailable: "Unavailable",
      returnMessage: "Please return to the Edu Resources page.",
      category: "Category",
      author: "Author",
      contributor: "Contributor",
      year: "Year",
      source: "Educator / Source",
      subject: "Subject / Topic",
      format: "Format",
      fallbackCategory: "Edu Resource",
      metadataUnavailable: "Metadata unavailable",
      titleSuffix: "Edu Resources",
    },
    filipino: {
      home: "Tahanan",
      resources: "Edu Resources",
      prev: "Nakaraang resource",
      next: "Susunod na resource",
      zoomIn: "I-click para i-zoom in",
      zoomOut: "I-click para i-zoom out",
      description: "Paglalarawan",
      tags: "Mga Tag",
      teaching: "Teaching Prompt",
      facts: "Detalye ng Resource",
      back: "Bumalik sa Edu Resources",
      relatedKicker: "Maaari Mo Ring Magustuhan",
      relatedTitle: "Kaugnay na mga Resource",
      relatedLink: "Tingnan Lahat",
      viewDetails: "Tingnan Pa",
      download: "I-download ang Resource",
      documentPreview: "Gamitin ang mga control ng viewer upang lumipat ng pahina o slide.",
      itemCounter: "Resource {current} ng {total}",
      itemUnavailable: "Walang available na resource",
      unavailable: "Hindi available",
      returnMessage: "Mangyaring bumalik sa pahina ng Edu Resources.",
      category: "Kategorya",
      author: "Awtor",
      contributor: "Nag-ambag",
      year: "Taon",
      source: "Educator / Source",
      subject: "Paksa",
      format: "Format",
      fallbackCategory: "Edu Resource",
      metadataUnavailable: "Walang metadata na available",
      titleSuffix: "Edu Resources",
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

  function buildImageMarkup(item) {
    if (item.is_story && item.cover_image_url) {
      return `<img class="ogd-detail-media__image" src="${escapeHtml(item.cover_image_url)}" alt="${escapeHtml(item.title)}" loading="eager" />`;
    }

    if (!item.is_story && item.file_url) {
      const viewerUrl = item.category === "PDF"
        ? `${item.file_url}#page=1&view=FitH`
        : `https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(item.file_url)}`;
      return `
        <div class="edu-resource-document-viewer">
          <iframe src="${escapeHtml(viewerUrl)}" title="${escapeHtml(item.title)}" loading="eager" allowfullscreen></iframe>
          <p class="edu-resource-document-viewer__help"><i data-lucide="gallery-horizontal-end" aria-hidden="true"></i>${escapeHtml(getStrings().documentPreview)}</p>
        </div>
      `;
    }

    return `
      <div class="ogd-detail-media__fallback" style="background:${escapeHtml(item.gradient || 'linear-gradient(135deg, #1e3a5f, #0f172a)')};">
        <div class="text-center p-6">
          <i data-lucide="${escapeHtml(item.is_story ? 'book-heart' : (item.icon || 'file-text'))}" class="w-16 h-16 mx-auto mb-3"></i>
          <p class="font-semibold text-base">${escapeHtml(item.is_story ? "Story" : (item.category || getStrings().fallbackCategory))}</p>
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

  function buildRelatedMediaMarkup(item) {
    if (item.is_story && item.cover_image_url) {
      return `<img class="ogd-artifact-card__image" src="${escapeHtml(item.cover_image_url)}" alt="${escapeHtml(item.title)}" loading="lazy" />`;
    }
    return `
      <div class="ogd-artifact-card__fallback" style="background:${escapeHtml(item.gradient || 'linear-gradient(135deg, #1e3a5f, #0f172a)')};">
        <div class="text-center p-4 text-white">
          <i data-lucide="${escapeHtml(item.is_story ? 'book-heart' : (item.icon || 'file-text'))}" class="w-12 h-12 mx-auto mb-2"></i>
          <p class="font-semibold text-sm">${escapeHtml(item.is_story ? "Story" : (item.category || getStrings().fallbackCategory))}</p>
        </div>
      </div>
    `;
  }

  function buildRelatedCard(item) {
    const strings = getStrings();
    return `
      <article class="ogd-artifact-card">
        <a href="/edu-resources/details?item=${item.id}" class="ogd-artifact-card__media" aria-label="${escapeHtml(strings.viewDetails)}: ${escapeHtml(item.title)}">
          ${buildRelatedMediaMarkup(item)}
        </a>
        <div class="ogd-artifact-card__body">
          <h3 class="ogd-artifact-card__title font-serif">${escapeHtml(item.title)}</h3>
          <p class="ogd-artifact-card__summary">${escapeHtml(item.description || '')}</p>
          <div class="ogd-artifact-card__meta">
            <span>${escapeHtml(getMetaText(item) || strings.metadataUnavailable)}</span>
          </div>
          <a href="/edu-resources/details?item=${item.id}" class="ogd-artifact-card__action" aria-label="${escapeHtml(strings.viewDetails)}: ${escapeHtml(item.title)}">
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

  function setZoomState(nextValue) {
    isZoomed = !!nextValue;
    if (zoomToggleEl) {
      zoomToggleEl.setAttribute("aria-pressed", isZoomed ? "true" : "false");
    }
    if (mediaShellEl) mediaShellEl.classList.toggle("is-zoomed", isZoomed);
    if (zoomHintTextEl) {
      zoomHintTextEl.textContent = isZoomed ? getStrings().zoomOut : getStrings().zoomIn;
    }
  }

  function updateStaticLabels() {
    const strings = getStrings();
    if (breadcrumbHomeEl) breadcrumbHomeEl.textContent = strings.home;
    if (breadcrumbResourcesEl) breadcrumbResourcesEl.textContent = strings.resources;
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
    if (downloadTextEl) downloadTextEl.textContent = strings.download;
    setZoomState(isZoomed);
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
    if (downloadRowEl) downloadRowEl.hidden = true;
    updateStaticLabels();
    return;
  }

  const params = new URLSearchParams(window.location.search);
  const requestedId = String(params.get("item") || "").trim();

  activeIndex = items.findIndex((item) => String(item.id) === requestedId);
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
    const category = item.category || strings.fallbackCategory;
    const metaText = getMetaText(item);
    const detailText = item.full_text || item.description || "";

    activeIndex = index;
    setZoomState(false);
    updateStaticLabels();

    if (titleEl) titleEl.textContent = item.title;
    if (breadcrumbTitleEl) breadcrumbTitleEl.textContent = item.title;
    if (categoryPillEl) categoryPillEl.textContent = category;
    if (metaEl) metaEl.textContent = metaText || strings.metadataUnavailable;
    if (imageEl) imageEl.innerHTML = buildImageMarkup(item);
    if (imageBadgeEl) imageBadgeEl.textContent = category;
    if (descEl) descEl.textContent = detailText;
    const canZoomImage = Boolean(item.is_story && item.cover_image_url);
    if (zoomToggleEl) {
      zoomToggleEl.hidden = !canZoomImage;
      zoomToggleEl.disabled = !canZoomImage;
    }
    if (imageEl) {
      imageEl.classList.toggle("ogd-detail-media__frame--viewer", Boolean(!item.is_story && item.file_url));
      imageEl.classList.toggle("ogd-detail-media__frame--image", canZoomImage);
    }

    if (tagsEl && tagsSectionEl) {
      tagsEl.innerHTML = "";
      tagsSectionEl.hidden = true;
    }

    if (teachingEl && teachingSectionEl) {
      teachingEl.textContent = "";
      teachingSectionEl.hidden = true;
    }

    if (factsEl) {
      factsEl.innerHTML = item.is_story
        ? [
            buildFactItem("tag", strings.category, category),
            buildFactItem("user", strings.contributor, item.author || strings.metadataUnavailable),
            buildFactItem("calendar", strings.year, item.year || strings.metadataUnavailable),
          ].join("")
        : [
            buildFactItem("tag", strings.category, category),
            buildFactItem("user", strings.source, item.educator_name || strings.metadataUnavailable),
            buildFactItem("book-open", strings.subject, item.subject_topic || strings.metadataUnavailable),
            buildFactItem("file-text", strings.format, item.format || strings.metadataUnavailable),
          ].join("");
    }

    if (counterEl) {
      counterEl.textContent = strings.itemCounter
        .replace("{current}", String(activeIndex + 1))
        .replace("{total}", String(items.length));
    }
    if (window.NHCPAnalytics && typeof window.NHCPAnalytics.track === "function") {
      window.NHCPAnalytics.track(
        "resource_viewed",
        "edu-resources",
        String(item.id || item.title),
        { title: item.title || "" },
        { onceKey: `edu-resource:${item.id || item.title}` }
      );
    }

    if (downloadRowEl && downloadLinkEl) {
      const hasDownload = !item.is_story && normalizeText(item.file_url);
      downloadRowEl.hidden = !hasDownload;
      if (hasDownload) {
        downloadLinkEl.href = item.file_url;
        downloadLinkEl.setAttribute("download", "");
      }
    }

    document.title = `${item.title} | ${strings.titleSuffix}`;
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

  if (downloadLinkEl) {
    downloadLinkEl.addEventListener("click", async (event) => {
      const item = items[activeIndex];
      if (!item || !item.file_url) {
        return;
      }
      event.preventDefault();
      const fallbackUrl = item.file_url;
      try {
        const response = await fetch(fallbackUrl, { credentials: "omit" });
        if (!response.ok) {
          throw new Error(`Download failed with HTTP ${response.status}`);
        }
        const blob = await response.blob();
        const objectUrl = URL.createObjectURL(blob);
        const extensionMatch = String(item.file_filename || fallbackUrl).match(/\.(pdf|docx?|pptx?)(?:$|[?#])/i);
        const safeTitle = String(item.title || "educational-resource")
          .replace(/[<>:"/\\|?*\x00-\x1F]/g, "-")
          .replace(/\s+/g, " ")
          .trim() || "educational-resource";
        const temporaryLink = document.createElement("a");
        temporaryLink.href = objectUrl;
        temporaryLink.download = `${safeTitle}.${extensionMatch ? extensionMatch[1].toLowerCase() : "file"}`;
        document.body.appendChild(temporaryLink);
        temporaryLink.click();
        temporaryLink.remove();
        window.setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
      } catch (error) {
        console.warn("Direct download was unavailable; opening the resource file instead.", error);
        window.open(fallbackUrl, "_blank", "noopener,noreferrer");
      }
    });
  }

  window.addEventListener("ogd:accessibility-change", () => {
    render(activeIndex);
  });

  render(activeIndex);
})();
