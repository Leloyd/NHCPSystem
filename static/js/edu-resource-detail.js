(function () {
  const items = Array.isArray(window.EDU_RESOURCES_ITEMS)
    ? [...window.EDU_RESOURCES_ITEMS]
    : [];

  const titleEl = document.getElementById("detailTitle");
  const metaEl = document.getElementById("detailMeta");
  const imageEl = document.getElementById("detailImage");
  const moduleEl = document.getElementById("detailModule");
  const durationEl = document.getElementById("detailDuration");
  const objectiveEl = document.getElementById("detailObjective");
  const descEl = document.getElementById("detailDesc");
  const tagsEl = document.getElementById("detailTags");
  const teachingEl = document.getElementById("detailTeaching");
  const counterEl = document.getElementById("detailCounter");
  const prevBtn = document.getElementById("prevItem");
  const nextBtn = document.getElementById("nextItem");
  const downloadBtn = document.getElementById("downloadResource");

  function triggerDownload(item) {
    if (!item) {
      return;
    }

    const fileName = `${item.title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "resource-template"}.txt`;
    const fileContents = [
      item.title,
      `Type: ${item.type}`,
      `Audience: ${item.audience}`,
      `Format: ${item.format}`,
      `Year: ${item.year}`,
      `Recommended Module: ${item.recommendedModule}`,
      `Duration: ${item.duration}`,
      `Learning Objective: ${item.learningObjective}`,
      "",
      item.fullDescription,
      "",
      `Teaching Prompt: ${item.teachingPrompt}`,
      `Tags: ${item.tags.join(", ")}`,
    ].join("\n");

    const blob = new Blob([fileContents], { type: "text/plain;charset=utf-8" });
    const downloadUrl = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = downloadUrl;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(downloadUrl);
  }

  if (!items.length) {
    if (titleEl) titleEl.textContent = "No resources available";
    if (metaEl) metaEl.textContent = "Please return to the Edu Resources page.";
    if (moduleEl) moduleEl.textContent = "";
    if (durationEl) durationEl.textContent = "";
    if (objectiveEl) objectiveEl.textContent = "";
    if (imageEl) imageEl.innerHTML = "";
    if (descEl) descEl.textContent = "";
    if (tagsEl) tagsEl.innerHTML = "";
    if (teachingEl) teachingEl.textContent = "";
    if (prevBtn) prevBtn.disabled = true;
    if (nextBtn) nextBtn.disabled = true;
    if (downloadBtn) downloadBtn.disabled = true;
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
      metaEl.textContent = `${item.type} • ${item.audience} • ${item.format} • ${item.year}`;
    }
    if (moduleEl) moduleEl.textContent = item.recommendedModule;
    if (durationEl) durationEl.textContent = item.duration;
    if (objectiveEl) objectiveEl.textContent = item.learningObjective;

    if (imageEl) {
      imageEl.style.background = item.gradient;
      imageEl.innerHTML = `<i data-lucide="${item.icon}" class="w-16 h-16"></i>`;
    }

    if (descEl) {
      descEl.textContent = item.fullDescription;
    }

    if (tagsEl) {
      tagsEl.innerHTML = item.tags.map((tag) => `<span class="gallery-tag">${tag}</span>`).join("");
    }

    if (teachingEl) {
      teachingEl.textContent = item.teachingPrompt;
    }

    if (counterEl) {
      counterEl.textContent = `Item ${activeIndex + 1} of ${items.length}`;
    }

    document.title = `${item.title} | Edu Resources`;

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

  if (downloadBtn) {
    downloadBtn.addEventListener("click", () => {
      triggerDownload(items[activeIndex]);
    });
  }

  render(activeIndex);
})();
