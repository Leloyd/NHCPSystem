(function () {
  const grid = document.getElementById("arArtifactGrid");
  const searchInput = document.getElementById("arSearch");
  const periodFilter = document.getElementById("arPeriodFilter");
  const markerFilter = document.getElementById("arMarkerFilter");
  const sortFilter = document.getElementById("arSortFilter");
  const resultCount = document.getElementById("arResultCount");
  const selectedLabel = document.getElementById("arSelectedLabel");

  if (!grid) {
    return;
  }

  const cards = Array.from(grid.querySelectorAll("[data-artifact-id]"));
  let selectedId = "facade";

  function setSelected(id) {
    selectedId = id;
    cards.forEach((card) => {
      const isActive = card.getAttribute("data-artifact-id") === id;
      card.classList.toggle("ring-2", isActive);
      card.classList.toggle("ring-amber-500", isActive);
      const chooseBtn = card.querySelector("[data-choose-id]");
      if (chooseBtn) {
        chooseBtn.textContent = isActive ? "Selected for AR" : "Choose for AR →";
      }
    });

    const activeCard = cards.find((card) => card.getAttribute("data-artifact-id") === id);
    if (activeCard && selectedLabel) {
      selectedLabel.textContent = `Selected: ${activeCard.getAttribute("data-title")}`;
    }
  }

  function getFilteredCards() {
    const q = (searchInput?.value || "").trim().toLowerCase();
    const selectedPeriod = periodFilter?.value || "all";
    const selectedMarker = markerFilter?.value || "all";

    return cards.filter((card) => {
      const title = (card.getAttribute("data-title") || "").toLowerCase();
      const tags = (card.getAttribute("data-tags") || "").toLowerCase();
      const marker = card.getAttribute("data-marker") || "";
      const period = card.getAttribute("data-period") || "";

      const inQuery = !q || title.includes(q) || tags.includes(q) || marker.toLowerCase().includes(q);
      const inPeriod = selectedPeriod === "all" || period === selectedPeriod;
      const inMarker = selectedMarker === "all" || marker === selectedMarker;

      return inQuery && inPeriod && inMarker;
    });
  }

  function sortCards(filteredCards) {
    const mode = sortFilter?.value || "curated";
    if (mode === "az") {
      return [...filteredCards].sort((a, b) => {
        const aTitle = a.getAttribute("data-title") || "";
        const bTitle = b.getAttribute("data-title") || "";
        return aTitle.localeCompare(bTitle);
      });
    }
    return filteredCards;
  }

  function render() {
    const filtered = getFilteredCards();
    const ordered = sortCards(filtered);

    cards.forEach((card) => {
      card.style.display = "none";
    });

    ordered.forEach((card) => {
      card.style.display = "";
      grid.appendChild(card);
    });

    if (resultCount) {
      resultCount.textContent = `${ordered.length} item${ordered.length === 1 ? "" : "s"}`;
    }

    const selectedStillVisible = ordered.some((card) => card.getAttribute("data-artifact-id") === selectedId);
    if (!selectedStillVisible && ordered.length) {
      setSelected(ordered[0].getAttribute("data-artifact-id") || "");
    }
  }

  grid.querySelectorAll("[data-choose-id]").forEach((button) => {
    button.addEventListener("click", () => {
      const id = button.getAttribute("data-choose-id") || "";
      setSelected(id);
    });
  });

  if (searchInput) searchInput.addEventListener("input", render);
  if (periodFilter) periodFilter.addEventListener("change", render);
  if (markerFilter) markerFilter.addEventListener("change", render);
  if (sortFilter) sortFilter.addEventListener("change", render);

  setSelected(selectedId);
  render();
})();
