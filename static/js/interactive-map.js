(function () {
  "use strict";

  var root = document.querySelector("[data-image-map-root]");
  if (!root) {
    return;
  }

  var REDUCED_MOTION = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var MAP_ANIMATE = !REDUCED_MOTION;
  var QUIZ_QUESTIONS = [
    {
      question: "Which landmark usually serves as the main orientation starting point for visitors?",
      options: [
        { id: "a", text: "Main Gate" },
        { id: "b", text: "Crypt Viewpoint" },
        { id: "c", text: "Garden Court" },
      ],
      correct: "a",
    },
    {
      question: "Which category best describes the Underground Entrance hotspot?",
      options: [
        { id: "a", text: "Landscape" },
        { id: "b", text: "Underground" },
        { id: "c", text: "Visitor Zone" },
      ],
      correct: "b",
    },
    {
      question: "What is the purpose of calibration mode on the map page?",
      options: [
        { id: "a", text: "To score quiz answers" },
        { id: "b", text: "To copy clicked x/y hotspot coordinates" },
        { id: "c", text: "To enable 3D mode" },
      ],
      correct: "b",
    },
  ];

  var elements = {
    mapCanvas: document.getElementById("imageMap"),
    mapStatusText: document.getElementById("mapStatusText"),
    mapCoordHint: document.getElementById("mapCoordHint"),
    searchInput: document.getElementById("mapSearchInput"),
    resetBtn: document.getElementById("mapResetBtn"),
    storyBtn: document.getElementById("storyModeBtn"),
    routeToggle: document.getElementById("routeToggle"),
    calibrateBtn: document.getElementById("calibrateToggleBtn"),
    categoryFilters: document.getElementById("mapCategoryFilters"),
    hotspotList: document.getElementById("mapHotspotList"),
    detailPanel: document.getElementById("landmarkDetailPanel"),
    quizProgress: document.getElementById("quizProgress"),
    quizQuestion: document.getElementById("quizQuestion"),
    quizOptions: document.getElementById("quizOptions"),
    quizSubmitBtn: document.getElementById("quizSubmitBtn"),
    quizNextBtn: document.getElementById("quizNextBtn"),
    quizFeedback: document.getElementById("quizFeedback"),
  };

  if (!elements.mapCanvas || !elements.categoryFilters || !elements.hotspotList || !elements.detailPanel) {
    return;
  }

  var state = {
    map: null,
    bounds: null,
    routeLine: null,
    hotspots: [],
    visibleHotspots: [],
    categories: [],
    selectedCategories: new Set(),
    markerById: {},
    activeHotspotId: "",
    searchTerm: "",
    storyTimer: null,
    storyIndex: 0,
    calibrateMode: false,
    quizIndex: 0,
    quizScore: 0,
    selectedOptionId: "",
    quizLocked: false,
  };

  function escapeHtml(value) {
    return String(value == null ? "" : value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/\"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function setStatus(message, isError) {
    if (!elements.mapStatusText) {
      return;
    }
    elements.mapStatusText.textContent = message;
    elements.mapStatusText.classList.toggle("is-error", Boolean(isError));
  }

  function setCoordHint(message) {
    if (!elements.mapCoordHint) {
      return;
    }
    elements.mapCoordHint.textContent = message || "";
  }

  function getHotspotById(hotspotId) {
    return state.hotspots.find(function (hotspot) {
      return hotspot.id === hotspotId;
    });
  }

  function getMarkerStyle(kind) {
    if (kind === "active") {
      return {
        radius: 10,
        color: "#ffffff",
        weight: 2,
        fillColor: "#ea580c",
        fillOpacity: 1,
      };
    }

    if (kind === "hover") {
      return {
        radius: 9,
        color: "#ffffff",
        weight: 2,
        fillColor: "#c2410c",
        fillOpacity: 1,
      };
    }

    return {
      radius: 8,
      color: "#ffffff",
      weight: 2,
      fillColor: "#9a3412",
      fillOpacity: 1,
    };
  }

  function createMapMarker(hotspot) {
    var marker = window.L.circleMarker([hotspot.y, hotspot.x], getMarkerStyle("default"));
    marker.on("click", function () {
      selectHotspot(hotspot.id, true);
    });
    marker.on("mouseover", function () {
      if (state.activeHotspotId !== hotspot.id) {
        marker.setStyle(getMarkerStyle("hover"));
      }
    });
    marker.on("mouseout", function () {
      if (state.activeHotspotId !== hotspot.id) {
        marker.setStyle(getMarkerStyle("default"));
      }
    });
    marker.bindTooltip(String(hotspot.order), {
      permanent: true,
      direction: "center",
      className: "map-marker-order",
    });

    state.markerById[hotspot.id] = marker;
  }

  function updateMarkerVisibility() {
    var visibleIds = new Set(
      state.visibleHotspots.map(function (hotspot) {
        return hotspot.id;
      })
    );

    state.hotspots.forEach(function (hotspot) {
      var marker = state.markerById[hotspot.id];
      if (!marker) {
        return;
      }
      if (visibleIds.has(hotspot.id)) {
        if (!state.map.hasLayer(marker)) {
          marker.addTo(state.map);
        }
      } else if (state.map.hasLayer(marker)) {
        marker.remove();
      }
    });
  }

  function updateMarkerSelectionStyles() {
    state.hotspots.forEach(function (hotspot) {
      var marker = state.markerById[hotspot.id];
      if (!marker || !state.map.hasLayer(marker)) {
        return;
      }
      if (hotspot.id === state.activeHotspotId) {
        marker.setStyle(getMarkerStyle("active"));
      } else {
        marker.setStyle(getMarkerStyle("default"));
      }
    });
  }

  function normalizeGallery(rawGallery) {
    if (!Array.isArray(rawGallery)) {
      return [];
    }

    return rawGallery
      .map(function (item) {
        if (!item || !item.src) {
          return null;
        }
        return {
          src: String(item.src),
          alt: String(item.alt || "Landmark gallery image"),
        };
      })
      .filter(Boolean);
  }

  function normalizeHotspot(raw, index) {
    var fallbackOrder = index + 1;
    var category = String(raw.category || "General");

    return {
      id: String(raw.id || "hotspot-" + String(fallbackOrder)),
      name: String(raw.name || "Landmark " + String(fallbackOrder)),
      category: category,
      x: Number(raw.x) || 0,
      y: Number(raw.y) || 0,
      order: Number(raw.order) || fallbackOrder,
      summary: String(raw.summary || raw.description || "No description available."),
      era: String(raw.era || raw.period || "Not specified"),
      focus: String(raw.focus || "Context and interpretation"),
      prompt: String(raw.prompt || "What observations can be made from this point?"),
      gallery: normalizeGallery(raw.gallery),
      videoEmbed: raw.videoEmbed ? String(raw.videoEmbed) : "",
      learnMoreUrl: raw.learnMoreUrl ? String(raw.learnMoreUrl) : raw.learnMore ? String(raw.learnMore) : "",
      audioUrl: raw.audioUrl ? String(raw.audioUrl) : "",
      view360Url: raw.view360Url ? String(raw.view360Url) : "",
      arUrl: raw.arUrl ? String(raw.arUrl) : "",
      beforeAfter:
        raw.beforeAfter && raw.beforeAfter.before && raw.beforeAfter.after
          ? {
              before: String(raw.beforeAfter.before),
              after: String(raw.beforeAfter.after),
              beforeAlt: String(raw.beforeAfter.beforeAlt || "Before image"),
              afterAlt: String(raw.beforeAfter.afterAlt || "After image"),
            }
          : null,
    };
  }

  function loadImageDimensions(url) {
    return new Promise(function (resolve, reject) {
      var image = new Image();
      image.onload = function () {
        resolve({
          width: image.naturalWidth,
          height: image.naturalHeight,
        });
      };
      image.onerror = function () {
        reject(new Error("Unable to load map image."));
      };
      image.src = url;
    });
  }

  function loadHotspotData(url) {
    return fetch(url, { cache: "no-cache" })
      .then(function (response) {
        if (!response.ok) {
          throw new Error("Unable to load hotspot JSON.");
        }
        return response.json();
      })
      .then(function (payload) {
        if (!Array.isArray(payload)) {
          return [];
        }
        return payload.map(normalizeHotspot).sort(function (a, b) {
          return a.order - b.order;
        });
      });
  }

  function renderCategoryFilters() {
    var html = state.categories
      .map(function (category) {
        var isActive = state.selectedCategories.has(category);
        var activeClass = isActive ? " is-active" : "";
        return (
          '<button type="button" class="filter-chip' +
          activeClass +
          '" data-category-filter="' +
          escapeHtml(category) +
          '" aria-pressed="' +
          String(isActive) +
          '">' +
          escapeHtml(category) +
          "</button>"
        );
      })
      .join("");

    elements.categoryFilters.innerHTML = html;

    Array.prototype.slice.call(elements.categoryFilters.querySelectorAll("[data-category-filter]")).forEach(function (button) {
      button.addEventListener("click", function () {
        var category = button.getAttribute("data-category-filter");
        if (!category) {
          return;
        }

        if (state.selectedCategories.has(category)) {
          state.selectedCategories.delete(category);
        } else {
          state.selectedCategories.add(category);
        }

        stopStoryMode();
        renderCategoryFilters();
        applyFilters();
      });
    });
  }

  function renderLandmarkList() {
    if (!state.visibleHotspots.length) {
      elements.hotspotList.innerHTML = '<p class="landmark-list-empty">No landmarks matched the current filter and search.</p>';
      return;
    }

    var html = state.visibleHotspots
      .map(function (hotspot) {
        var isActive = hotspot.id === state.activeHotspotId;
        var activeClass = isActive ? " is-active" : "";
        return (
          '<button type="button" class="landmark-item-btn' +
          activeClass +
          '" data-hotspot-item="' +
          escapeHtml(hotspot.id) +
          '">' +
          '<p class="landmark-item-title">' +
          escapeHtml(String(hotspot.order) + ". " + hotspot.name) +
          "</p>" +
          '<p class="landmark-item-meta">' +
          escapeHtml(hotspot.category) +
          "</p>" +
          "</button>"
        );
      })
      .join("");

    elements.hotspotList.innerHTML = html;

    Array.prototype.slice.call(elements.hotspotList.querySelectorAll("[data-hotspot-item]")).forEach(function (button) {
      var hotspotId = button.getAttribute("data-hotspot-item");
      if (!hotspotId) {
        return;
      }

      button.addEventListener("click", function () {
        selectHotspot(hotspotId, true);
      });
      button.addEventListener("mouseenter", function () {
        var marker = state.markerById[hotspotId];
        if (marker && hotspotId !== state.activeHotspotId) {
          marker.setStyle(getMarkerStyle("hover"));
        }
      });
      button.addEventListener("mouseleave", function () {
        var marker = state.markerById[hotspotId];
        if (marker && hotspotId !== state.activeHotspotId) {
          marker.setStyle(getMarkerStyle("default"));
        }
      });
    });
  }

  function renderLandmarkDetail(hotspot) {
    if (!hotspot) {
      elements.detailPanel.innerHTML =
        '<div class="landmark-detail-empty">Select a hotspot from the map or list to view details, media, and related links.</div>';
      return;
    }

    var galleryHtml = hotspot.gallery.length
      ? '<div class="landmark-gallery">' +
        hotspot.gallery
          .map(function (media) {
            return '<img loading="lazy" src="' + escapeHtml(media.src) + '" alt="' + escapeHtml(media.alt) + '" />';
          })
          .join("") +
        "</div>"
      : "";

    var beforeAfterHtml = hotspot.beforeAfter
      ? '<div class="landmark-before-after">' +
        '<div class="before-after-stage">' +
        '<img src="' +
        escapeHtml(hotspot.beforeAfter.before) +
        '" alt="' +
        escapeHtml(hotspot.beforeAfter.beforeAlt) +
        '" loading="lazy" />' +
        '<div class="before-after-after" data-before-after-target>' +
        '<img src="' +
        escapeHtml(hotspot.beforeAfter.after) +
        '" alt="' +
        escapeHtml(hotspot.beforeAfter.afterAlt) +
        '" loading="lazy" />' +
        "</div>" +
        "</div>" +
        '<input class="before-after-slider" type="range" min="0" max="100" value="50" data-before-after-slider aria-label="Before and after comparison slider" />' +
        "</div>"
      : "";

    var links = [];
    if (hotspot.learnMoreUrl) {
      links.push('<a class="landmark-link" href="' + escapeHtml(hotspot.learnMoreUrl) + '" target="_blank" rel="noopener noreferrer">Learn More</a>');
    }
    if (hotspot.audioUrl) {
      links.push('<a class="landmark-link" href="' + escapeHtml(hotspot.audioUrl) + '" target="_blank" rel="noopener noreferrer">Audio</a>');
    }
    if (hotspot.view360Url) {
      links.push('<a class="landmark-link" href="' + escapeHtml(hotspot.view360Url) + '" target="_blank" rel="noopener noreferrer">360 View</a>');
    }
    if (hotspot.arUrl) {
      links.push('<a class="landmark-link" href="' + escapeHtml(hotspot.arUrl) + '" target="_blank" rel="noopener noreferrer">AR / 3D</a>');
    }

    var linksHtml = links.length ? '<div class="landmark-links">' + links.join("") + "</div>" : "";

    var videoHtml = hotspot.videoEmbed
      ? '<div class="landmark-video"><iframe loading="lazy" src="' +
        escapeHtml(hotspot.videoEmbed) +
        '" title="Landmark video" allowfullscreen></iframe></div>'
      : "";

    elements.detailPanel.innerHTML =
      '<article class="landmark-detail">' +
      '<div class="landmark-badge-row">' +
      '<span class="landmark-badge">' +
      escapeHtml(hotspot.category) +
      "</span>" +
      '<span class="landmark-badge">Stop ' +
      escapeHtml(String(hotspot.order)) +
      "</span>" +
      "</div>" +
      '<h4 class="landmark-title">' +
      escapeHtml(hotspot.name) +
      "</h4>" +
      '<p class="landmark-summary">' +
      escapeHtml(hotspot.summary) +
      "</p>" +
      '<dl class="landmark-meta-grid">' +
      '<div class="landmark-meta-item"><dt>Historical Period</dt><dd>' +
      escapeHtml(hotspot.era) +
      "</dd></div>" +
      '<div class="landmark-meta-item"><dt>Visitor Focus</dt><dd>' +
      escapeHtml(hotspot.focus) +
      "</dd></div>" +
      '<div class="landmark-meta-item"><dt>Learning Prompt</dt><dd>' +
      escapeHtml(hotspot.prompt) +
      "</dd></div>" +
      '<div class="landmark-meta-item"><dt>Coordinates</dt><dd>x: ' +
      escapeHtml(String(Math.round(hotspot.x))) +
      ", y: " +
      escapeHtml(String(Math.round(hotspot.y))) +
      "</dd></div>" +
      "</dl>" +
      galleryHtml +
      beforeAfterHtml +
      videoHtml +
      linksHtml +
      "</article>";

    var slider = elements.detailPanel.querySelector("[data-before-after-slider]");
    var target = elements.detailPanel.querySelector("[data-before-after-target]");
    if (slider && target) {
      slider.addEventListener("input", function () {
        target.style.width = String(slider.value) + "%";
      });
    }
  }

  function renderRouteOverlay() {
    if (state.routeLine) {
      state.routeLine.remove();
      state.routeLine = null;
    }

    return;
  }

  function applyFilters() {
    var lowerSearch = state.searchTerm.toLowerCase();

    state.visibleHotspots = state.hotspots.filter(function (hotspot) {
      var categoryMatch = state.selectedCategories.has(hotspot.category);
      if (!categoryMatch) {
        return false;
      }
      if (!lowerSearch) {
        return true;
      }
      return hotspot.name.toLowerCase().indexOf(lowerSearch) !== -1 || hotspot.summary.toLowerCase().indexOf(lowerSearch) !== -1;
    });

    state.visibleHotspots.sort(function (a, b) {
      return a.order - b.order;
    });

    updateMarkerVisibility();
    renderRouteOverlay();

    if (!state.visibleHotspots.length) {
      state.activeHotspotId = "";
      updateMarkerSelectionStyles();
      renderLandmarkList();
      renderLandmarkDetail(null);
      setStatus("No landmarks found for current search/filter.", false);
      return;
    }

    var activeStillVisible = state.visibleHotspots.some(function (hotspot) {
      return hotspot.id === state.activeHotspotId;
    });

    if (!activeStillVisible) {
      state.activeHotspotId = state.visibleHotspots[0].id;
    }

    updateMarkerSelectionStyles();
    renderLandmarkList();
    renderLandmarkDetail(getHotspotById(state.activeHotspotId));
    setStatus(String(state.visibleHotspots.length) + " landmarks displayed.", false);
  }

  function selectHotspot(hotspotId, shouldPan) {
    var hotspot = getHotspotById(hotspotId);
    if (!hotspot) {
      return;
    }

    state.activeHotspotId = hotspotId;
    updateMarkerSelectionStyles();
    renderLandmarkList();
    renderLandmarkDetail(hotspot);

    if (shouldPan && state.map) {
      state.map.flyTo([hotspot.y, hotspot.x], Math.max(state.map.getZoom(), 0), {
        animate: MAP_ANIMATE,
        duration: MAP_ANIMATE ? 0.5 : 0,
      });
    }
  }

  function toggleStoryMode() {
    if (state.storyTimer) {
      stopStoryMode();
      return;
    }

    if (!state.visibleHotspots.length) {
      return;
    }

    state.storyIndex = 0;
    elements.storyBtn.textContent = "Stop Story Mode";
    elements.storyBtn.setAttribute("aria-pressed", "true");

    state.storyTimer = window.setInterval(function () {
      if (!state.visibleHotspots.length) {
        return;
      }
      var next = state.visibleHotspots[state.storyIndex % state.visibleHotspots.length];
      selectHotspot(next.id, true);
      state.storyIndex += 1;
    }, REDUCED_MOTION ? 5000 : 2800);
  }

  function stopStoryMode() {
    if (state.storyTimer) {
      window.clearInterval(state.storyTimer);
      state.storyTimer = null;
    }
    if (elements.storyBtn) {
      elements.storyBtn.textContent = "Start Story Mode";
      elements.storyBtn.setAttribute("aria-pressed", "false");
    }
  }

  function toggleCalibrationMode() {
    state.calibrateMode = !state.calibrateMode;
    elements.calibrateBtn.setAttribute("aria-pressed", String(state.calibrateMode));
    elements.calibrateBtn.classList.toggle("details-btn--primary", state.calibrateMode);

    if (state.calibrateMode) {
      setCoordHint("Calibration enabled. Click on map to copy x/y hotspot coordinates.");
    } else {
      setCoordHint("");
    }
  }

  function onMapClick(event) {
    if (!state.calibrateMode) {
      return;
    }

    var x = Math.round(event.latlng.lng);
    var y = Math.round(event.latlng.lat);
    var coordinateSnippet = '"x": ' + String(x) + ', "y": ' + String(y);

    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard
        .writeText(coordinateSnippet)
        .then(function () {
          setCoordHint("Copied coordinates: " + coordinateSnippet);
        })
        .catch(function () {
          setCoordHint("Coordinates: " + coordinateSnippet + " (copy manually)");
        });
      return;
    }

    setCoordHint("Coordinates: " + coordinateSnippet + " (copy manually)");
  }

  function bindImageMapEvents() {
    elements.searchInput.addEventListener("input", function () {
      state.searchTerm = elements.searchInput.value.trim();
      stopStoryMode();
      applyFilters();
    });

    elements.routeToggle.addEventListener("change", function () {
      renderRouteOverlay();
    });

    elements.resetBtn.addEventListener("click", function () {
      if (state.map && state.bounds) {
        state.map.fitBounds(state.bounds, {
          padding: [26, 26],
          animate: MAP_ANIMATE,
        });
      }
    });

    elements.storyBtn.addEventListener("click", toggleStoryMode);
    elements.calibrateBtn.addEventListener("click", toggleCalibrationMode);

    document.addEventListener("keydown", function (event) {
      if (!state.visibleHotspots.length) {
        return;
      }

      var tagName = event.target && event.target.tagName ? event.target.tagName.toLowerCase() : "";
      if (tagName === "input" || tagName === "textarea" || tagName === "select") {
        return;
      }

      if (event.key !== "ArrowRight" && event.key !== "ArrowLeft") {
        return;
      }

      var currentIndex = state.visibleHotspots.findIndex(function (hotspot) {
        return hotspot.id === state.activeHotspotId;
      });
      if (currentIndex < 0) {
        return;
      }

      event.preventDefault();
      var step = event.key === "ArrowRight" ? 1 : -1;
      var nextIndex = currentIndex + step;
      if (nextIndex < 0 || nextIndex >= state.visibleHotspots.length) {
        return;
      }
      selectHotspot(state.visibleHotspots[nextIndex].id, true);
    });
  }

  function initQuiz() {
    if (!elements.quizQuestion || !elements.quizOptions || !elements.quizSubmitBtn || !elements.quizNextBtn) {
      return;
    }

    function clearQuizFeedback() {
      elements.quizFeedback.textContent = "";
      elements.quizFeedback.classList.remove("is-success", "is-error");
    }

    function renderQuizOptions(question) {
      elements.quizOptions.innerHTML = "";

      question.options.forEach(function (option) {
        var button = document.createElement("button");
        button.type = "button";
        button.className = "quiz-option";
        button.dataset.optionId = option.id;
        button.textContent = option.text;
        button.setAttribute("role", "radio");
        button.setAttribute("aria-checked", "false");

        button.addEventListener("click", function () {
          if (state.quizLocked) {
            return;
          }

          state.selectedOptionId = option.id;
          Array.prototype.slice.call(elements.quizOptions.querySelectorAll(".quiz-option")).forEach(function (node) {
            var isSelected = node.dataset.optionId === option.id;
            node.classList.toggle("is-selected", isSelected);
            node.setAttribute("aria-checked", String(isSelected));
          });
        });

        elements.quizOptions.appendChild(button);
      });
    }

    function renderQuizQuestion() {
      var question = QUIZ_QUESTIONS[state.quizIndex];
      if (!question) {
        return;
      }

      state.selectedOptionId = "";
      state.quizLocked = false;

      elements.quizProgress.textContent = "Question " + String(state.quizIndex + 1) + " / " + String(QUIZ_QUESTIONS.length);
      elements.quizQuestion.textContent = question.question;
      elements.quizSubmitBtn.disabled = false;
      elements.quizNextBtn.disabled = true;
      elements.quizNextBtn.textContent = "Next Question";

      clearQuizFeedback();
      renderQuizOptions(question);
    }

    function lockSelection(question) {
      Array.prototype.slice.call(elements.quizOptions.querySelectorAll(".quiz-option")).forEach(function (node) {
        var optionId = node.dataset.optionId;
        var isCorrect = optionId === question.correct;
        var isSelected = optionId === state.selectedOptionId;
        node.classList.remove("is-selected");
        node.classList.toggle("is-correct", isCorrect);
        node.classList.toggle("is-wrong", isSelected && !isCorrect);
      });
    }

    function submitAnswer() {
      if (state.quizLocked) {
        return;
      }

      var question = QUIZ_QUESTIONS[state.quizIndex];
      if (!question) {
        return;
      }

      if (!state.selectedOptionId) {
        elements.quizFeedback.textContent = "Please choose an answer first.";
        elements.quizFeedback.classList.remove("is-success");
        elements.quizFeedback.classList.add("is-error");
        return;
      }

      state.quizLocked = true;
      elements.quizSubmitBtn.disabled = true;
      elements.quizNextBtn.disabled = false;
      lockSelection(question);

      if (state.selectedOptionId === question.correct) {
        state.quizScore += 1;
        elements.quizFeedback.textContent = "Correct. Great observation.";
        elements.quizFeedback.classList.remove("is-error");
        elements.quizFeedback.classList.add("is-success");
      } else {
        var correctOption = question.options.find(function (item) {
          return item.id === question.correct;
        });
        elements.quizFeedback.textContent = "Not quite. Correct answer: " + (correctOption ? correctOption.text : "the correct answer") + ".";
        elements.quizFeedback.classList.remove("is-success");
        elements.quizFeedback.classList.add("is-error");
      }

      if (state.quizIndex === QUIZ_QUESTIONS.length - 1) {
        elements.quizNextBtn.textContent = "Show Result";
      }
    }

    function showQuizResult() {
      elements.quizQuestion.textContent = "Quiz complete. You scored " + String(state.quizScore) + " out of " + String(QUIZ_QUESTIONS.length) + ".";
      elements.quizProgress.textContent = "Completed";
      elements.quizSubmitBtn.disabled = true;
      elements.quizNextBtn.disabled = false;
      elements.quizNextBtn.textContent = "Restart Quiz";
      elements.quizOptions.innerHTML = "";
      clearQuizFeedback();
    }

    function nextQuestion() {
      if (!state.quizLocked && state.quizIndex < QUIZ_QUESTIONS.length) {
        return;
      }

      if (state.quizIndex === QUIZ_QUESTIONS.length - 1) {
        showQuizResult();
        state.quizIndex += 1;
        return;
      }

      if (state.quizIndex >= QUIZ_QUESTIONS.length) {
        state.quizIndex = 0;
        state.quizScore = 0;
        renderQuizQuestion();
        return;
      }

      state.quizIndex += 1;
      renderQuizQuestion();
    }

    elements.quizSubmitBtn.addEventListener("click", submitAnswer);
    elements.quizNextBtn.addEventListener("click", nextQuestion);
    renderQuizQuestion();
  }

  function initializeMap(imageUrl, imageSize) {
    if (!window.L) {
      throw new Error("Leaflet failed to load.");
    }

    state.bounds = [
      [0, 0],
      [imageSize.height, imageSize.width],
    ];

    state.map = window.L.map(elements.mapCanvas, {
      crs: window.L.CRS.Simple,
      zoomControl: true,
      minZoom: -2,
      maxZoom: 3,
      zoomSnap: 0.25,
      zoomDelta: 0.25,
      attributionControl: false,
    });

    window.L.imageOverlay(imageUrl, state.bounds).addTo(state.map);
    state.map.fitBounds(state.bounds, { padding: [26, 26], animate: MAP_ANIMATE });
    state.map.on("click", onMapClick);
  }

  function bootstrapImageMap() {
    var imageUrl = root.getAttribute("data-image-url");
    var hotspotsUrl = root.getAttribute("data-hotspots-url");

    if (!imageUrl || !hotspotsUrl) {
      setStatus("Map configuration is missing.", true);
      return;
    }

    setStatus("Loading map image and hotspot data...", false);

    Promise.all([loadImageDimensions(imageUrl), loadHotspotData(hotspotsUrl)])
      .then(function (results) {
        var imageSize = results[0];
        state.hotspots = results[1];
        if (!state.hotspots.length) {
          throw new Error("No hotspots found in JSON data.");
        }

        state.categories = Array.from(
          new Set(
            state.hotspots.map(function (hotspot) {
              return hotspot.category;
            })
          )
        ).sort();

        state.categories.forEach(function (category) {
          state.selectedCategories.add(category);
        });

        initializeMap(imageUrl, imageSize);
        state.hotspots.forEach(createMapMarker);

        renderCategoryFilters();
        bindImageMapEvents();
        applyFilters();
        initQuiz();

        setStatus("Map ready. Use controls to filter landmarks or start story mode.", false);
      })
      .catch(function (error) {
        console.error("[site-map]", error);
        setStatus(error && error.message ? error.message : "Failed to initialize map.", true);
      });
  }

  bootstrapImageMap();
})();
