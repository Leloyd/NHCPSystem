(function () {
  const resources = Array.isArray(window.EDU_RESOURCES_ITEMS)
    ? [...window.EDU_RESOURCES_ITEMS]
    : [];

  const resourceGrid = document.getElementById("resourceGrid");
  const resourceCount = document.getElementById("resourceCount");
  const searchInput = document.getElementById("resourceSearch");
  const typeFilter = document.getElementById("resourceTypeFilter");
  const audienceFilter = document.getElementById("resourceAudienceFilter");
  const formatFilter = document.getElementById("resourceFormatFilter");
  const sortFilter = document.getElementById("resourceSortFilter");

  if (!resourceGrid) {
    return;
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

  function buildCard(item) {
    return `
      <article class="gallery-card">
        <div class="gallery-thumb" style="background:${item.gradient}">
          <div class="text-center p-4">
            <i data-lucide="${item.icon}" class="w-12 h-12 mx-auto mb-2"></i>
            <p class="font-semibold">${item.type}</p>
          </div>
        </div>
        <div class="p-5">
          <p class="text-xs text-amber-700 mb-1">${item.audience} • ${item.format} • ${item.year}</p>
          <h3 class="text-lg font-serif text-gray-900 mb-2">${item.title}</h3>
          <p class="text-sm text-gray-700 mb-3">${item.description}</p>
          <div class="mb-3">${item.tags.map((tag) => `<span class="gallery-tag">${tag}</span>`).join("")}</div>
          <div class="gallery-card__actions">
            <a href="/edu-resources/details?item=${item.id}" class="text-amber-700 hover:text-amber-900 text-sm font-semibold">Learn more →</a>
            <button type="button" class="gallery-card__download" data-resource-id="${item.id}" aria-label="Download ${item.title}">
              <i data-lucide="download" class="w-4 h-4"></i>
            </button>
          </div>
        </div>
      </article>
    `;
  }

  function renderGrid(data) {
    if (!data.length) {
      resourceGrid.innerHTML = `
        <div class="col-span-full bg-white border border-stone-200 rounded-lg p-8 text-center">
          <p class="text-lg text-gray-700">No resources found for the selected filters.</p>
          <p class="text-sm text-gray-500 mt-2">Try changing search terms or filter options.</p>
        </div>
      `;
      if (resourceCount) {
        resourceCount.textContent = "0 items";
      }
      return;
    }

    resourceGrid.innerHTML = data.map(buildCard).join("");
    if (resourceCount) {
      resourceCount.textContent = `${data.length} item${data.length > 1 ? "s" : ""}`;
    }

    if (window.lucide && typeof window.lucide.createIcons === "function") {
      window.lucide.createIcons();
    }

    resourceGrid.querySelectorAll(".gallery-card__download").forEach((button) => {
      button.addEventListener("click", () => {
        const resourceId = Number(button.getAttribute("data-resource-id"));
        const resource = resources.find((item) => item.id === resourceId);
        triggerDownload(resource);
      });
    });
  }

  function applyFilters() {
    const query = (searchInput?.value || "").trim().toLowerCase();
    const type = typeFilter?.value || "all";
    const audience = audienceFilter?.value || "all";
    const format = formatFilter?.value || "all";
    const sortMode = sortFilter?.value || "newest";

    const filtered = resources.filter((item) => {
      const inQuery =
        item.title.toLowerCase().includes(query) ||
        item.description.toLowerCase().includes(query) ||
        item.tags.join(" ").toLowerCase().includes(query);
      const inType = type === "all" || item.type === type;
      const inAudience = audience === "all" || item.audience === audience;
      const inFormat = format === "all" || item.format === format;

      return inQuery && inType && inAudience && inFormat;
    });

    renderGrid(sortResources(filtered, sortMode));
  }

  if (searchInput) searchInput.addEventListener("input", applyFilters);
  if (typeFilter) typeFilter.addEventListener("change", applyFilters);
  if (audienceFilter) audienceFilter.addEventListener("change", applyFilters);
  if (formatFilter) formatFilter.addEventListener("change", applyFilters);
  if (sortFilter) sortFilter.addEventListener("change", applyFilters);

  applyFilters();
})();
