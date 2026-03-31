(function () {
  "use strict";

  var ROUTES = {
    orientation: {
      label: "Orientation Loop",
      stops: [
        "parking",
        "entrance",
        "side",
        "flag-pole",
        "museum",
        "museum-entrance",
        "main-gate",
        "resource-center-office",
        "middle",
        "tombs-right-side",
        "tombs-left-side",
        "church-entrance",
        "underground-tombs",
        "church",
      ],
    },
    heritage: {
      label: "Heritage Core",
      stops: [
        "main-gate",
        "middle",
        "tombs-left-side",
        "tombs-right-side",
        "church-entrance",
        "church",
        "underground-tombs",
      ],
    },
    accessibility: {
      label: "Accessible Route",
      stops: [
        "entrance",
        "parking",
        "museum-entrance",
        "museum",
        "resource-center-office",
        "main-gate",
        "church-entrance",
      ],
    },
  };

  var DEFAULT_IMAGE_URL = "/static/images/site-map/aerial-view.jpg";
  var HOTSPOT_DATA_URL = "/static/data/site-map-hotspots.json";

  var state = {
    map: null,
    imageBounds: null,
    imageSize: null,
    imageUrl: DEFAULT_IMAGE_URL,
    minZoom: -2,
    routeId: "orientation",
    stopId: "",
    searchText: "",
    selectedCategories: {},
    hotspots: [],
    hotspotsById: {},
    markerById: {},
    markerNodesBound: {},
    routeLayer: null,
    storyTimer: null,
    storyIndex: 0,
    calibrationEnabled: false,
    reduceMotion: window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches,
  };

  var elements = {
    mapRoot: document.getElementById("interactiveMap"),
    routeButtons: Array.prototype.slice.call(document.querySelectorAll("[data-route-btn]")),
    searchInput: document.getElementById("mapSearchInput"),
    resetViewBtn: document.getElementById("resetViewBtn"),
    storyModeBtn: document.getElementById("storyModeBtn"),
    calibrateToggleBtn: document.getElementById("calibrateToggleBtn"),
    categoryFilters: document.getElementById("categoryFilters"),
    calibrationHint: document.getElementById("calibrationHint"),
    stopList: document.getElementById("stopList"),
    stopRouteBadge: document.getElementById("stopRouteBadge"),
    stopTitle: document.getElementById("stopTitle"),
    stopSummary: document.getElementById("stopSummary"),
    stopCategory: document.getElementById("stopCategory"),
    stopEra: document.getElementById("stopEra"),
    stopFocus: document.getElementById("stopFocus"),
    stopCoordinates: document.getElementById("stopCoordinates"),
    stopPrompt: document.getElementById("stopPrompt"),
    stopOrder: document.getElementById("stopOrder"),
    stopMedia: document.getElementById("stopMedia"),
    stopLinks: document.getElementById("stopLinks"),
    stopVideoWrap: document.getElementById("stopVideoWrap"),
    prevStopBtn: document.getElementById("prevStopBtn"),
    nextStopBtn: document.getElementById("nextStopBtn"),
  };

  if (!elements.mapRoot || !window.L || !elements.stopList || !elements.stopTitle) {
    return;
  }

  function appendCacheBuster(url) {
    if (!url) {
      return "";
    }
    return String(url) + (String(url).indexOf("?") === -1 ? "?" : "&") + "v=" + Date.now();
  }

  function loadImageDimensionsOnce(url) {
    return new Promise(function (resolve, reject) {
      var img = new Image();
      img.onload = function () {
        resolve({ width: img.naturalWidth, height: img.naturalHeight, url: url });
      };
      img.onerror = function () {
        reject(new Error("Unable to load site map image."));
      };
      img.src = url;
    });
  }

  function loadImageDimensions(url) {
    return loadImageDimensionsOnce(url).catch(function () {
      return loadImageDimensionsOnce(appendCacheBuster(url));
    });
  }

  function fetchMapData() {
    return fetch(HOTSPOT_DATA_URL, { cache: "no-store" })
      .then(function (response) {
        if (!response.ok) {
          throw new Error("Failed to load hotspot data.");
        }
        return response.json();
      })
      .then(function (payload) {
        var hotspots = Array.isArray(payload.hotspots) ? payload.hotspots : [];
        state.hotspots = hotspots
          .map(normalizeHotspot)
          .filter(function (item) {
            return item;
          });

        state.imageUrl = payload && payload.image && payload.image.url ? String(payload.image.url) : DEFAULT_IMAGE_URL;
        state.hotspotsById = {};

        state.hotspots.forEach(function (spot) {
          state.hotspotsById[spot.id] = spot;
        });

        var categories = {};
        state.hotspots.forEach(function (spot) {
          categories[spot.category] = true;
        });
        state.selectedCategories = categories;
      });
  }

  function normalizeHotspot(raw) {
    if (!raw || !raw.id || typeof raw.x !== "number" || typeof raw.y !== "number") {
      return null;
    }

    return {
      id: String(raw.id),
      title: String(raw.title || raw.id),
      category: String(raw.category || "General"),
      x: Number(raw.x),
      y: Number(raw.y),
      era: String(raw.era || "-"),
      focus: String(raw.focus || "-"),
      prompt: String(raw.prompt || "-"),
      description: String(raw.description || "No description available."),
      media: Array.isArray(raw.media) ? raw.media : [],
      learnMore: raw.learnMore ? String(raw.learnMore) : "",
      view360: raw.view360 ? String(raw.view360) : "",
      arModel: raw.arModel ? String(raw.arModel) : "",
      audio: raw.audio ? String(raw.audio) : "",
      videoEmbed: raw.videoEmbed ? String(raw.videoEmbed) : "",
    };
  }

  function calculateHeightBoundMinZoom() {
    if (!state.map || !state.imageSize || !state.imageSize.height) {
      return -2;
    }

    var mapSize = state.map.getSize();
    var containerHeight = mapSize && mapSize.y ? mapSize.y : elements.mapRoot.clientHeight;
    var ratio = containerHeight / state.imageSize.height;

    if (!ratio || ratio <= 0) {
      return -2;
    }

    return Math.log(ratio) / Math.LN2;
  }

  function applyMapBoundsConstraints() {
    if (!state.map || !state.imageBounds) {
      return;
    }

    var bounds = window.L.latLngBounds(state.imageBounds);
    var nextMinZoom = calculateHeightBoundMinZoom();

    if (!isFinite(nextMinZoom)) {
      nextMinZoom = -2;
    }

    nextMinZoom = Math.min(nextMinZoom, state.map.getMaxZoom());

    state.minZoom = nextMinZoom;
    state.map.setMaxBounds(bounds);
    state.map.setMinZoom(nextMinZoom);

    if (state.map._loaded) {
      state.map.panInsideBounds(bounds, { animate: false });

      if (state.map.getZoom() < nextMinZoom) {
        state.map.setZoom(nextMinZoom, { animate: false });
      }
    }
  }

  function resetMapView() {
    if (!state.map || !state.imageBounds) {
      return;
    }

    applyMapBoundsConstraints();

    var bounds = window.L.latLngBounds(state.imageBounds);
    state.map.setView(bounds.getCenter(), state.minZoom, { animate: false });
  }

  function initLeafletMap() {
    return loadImageDimensions(state.imageUrl)
      .then(function (imageMeta) {
        var dims = {
          width: imageMeta.width,
          height: imageMeta.height,
        };

        state.imageUrl = imageMeta.url;
        var bounds = [
          [0, 0],
          [dims.height, dims.width],
        ];

        state.imageBounds = bounds;
        state.imageSize = dims;
        state.map = window.L.map(elements.mapRoot, {
          crs: window.L.CRS.Simple,
          minZoom: -2,
          maxZoom: 2,
          zoomSnap: 0.25,
          zoomDelta: 0.25,
          maxBoundsViscosity: 1,
          attributionControl: false,
        });

        window.L.imageOverlay(state.imageUrl, bounds).addTo(state.map);
        resetMapView();

        state.map.on("resize", function () {
          applyMapBoundsConstraints();
        });

        state.map.on("click", function (event) {
          if (!state.calibrationEnabled) {
            return;
          }

          var x = Math.round(event.latlng.lng);
          var y = Math.round(event.latlng.lat);
          var hint = "Calibration point: x=" + x + ", y=" + y + " (copied)";
          elements.calibrationHint.hidden = false;
          elements.calibrationHint.textContent = hint;

          if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(x + "," + y).catch(function () {});
          }
        });
      })
      .catch(function (error) {
        if (window.console && window.console.error) {
          window.console.error("Site map initialization failed", error);
        }
        elements.mapRoot.innerHTML =
          '<div class="map-empty-state">Unable to initialize map image. Try <strong>Ctrl+F5</strong> to hard refresh, then open <code>/static/images/site-map/aerial-view.jpg</code> directly to confirm it loads.</div>';
      });
  }

  function ensureMarker(spot) {
    if (state.markerById[spot.id]) {
      return state.markerById[spot.id];
    }

    var marker = window.L.circleMarker([spot.y, spot.x], {
      radius: 8,
      color: "#7c2d12",
      weight: 2,
      fillColor: "#b45309",
      fillOpacity: 0.94,
    });

    marker.on("click", function () {
      setActiveStop(spot.id, true);
    });

    marker.on("mouseover", function () {
      if (state.stopId !== spot.id) {
        marker.setRadius(9.5);
      }
    });

    marker.on("mouseout", function () {
      if (state.stopId !== spot.id) {
        marker.setRadius(8);
      }
    });

    marker.on("add", function () {
      var node = marker.getElement();
      if (!node || state.markerNodesBound[spot.id]) {
        return;
      }

      node.setAttribute("tabindex", "0");
      node.setAttribute("role", "button");
      node.setAttribute("aria-label", spot.title);
      node.addEventListener("keydown", function (event) {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          setActiveStop(spot.id, true);
        }
      });

      state.markerNodesBound[spot.id] = true;
    });

    state.markerById[spot.id] = marker;
    return marker;
  }

  function getRouteStops(routeId) {
    var route = ROUTES[routeId] || ROUTES.orientation;
    return route.stops
      .map(function (stopId) {
        return state.hotspotsById[stopId] || null;
      })
      .filter(function (item) {
        return item;
      });
  }

  function isCategoryEnabled(category) {
    return !!state.selectedCategories[category];
  }

  function getVisibleStops() {
    var search = state.searchText.trim().toLowerCase();
    return getRouteStops(state.routeId).filter(function (spot) {
      var byCategory = isCategoryEnabled(spot.category);
      var bySearch = !search || spot.title.toLowerCase().indexOf(search) !== -1;
      return byCategory && bySearch;
    });
  }

  function stopStoryMode() {
    if (state.storyTimer) {
      window.clearInterval(state.storyTimer);
      state.storyTimer = null;
    }

    if (elements.storyModeBtn) {
      elements.storyModeBtn.textContent = "Story Mode";
      elements.storyModeBtn.setAttribute("aria-pressed", "false");
    }
  }

  function drawRouteLine(visibleStops) {
    if (!state.map) {
      return;
    }

    if (state.routeLayer) {
      state.map.removeLayer(state.routeLayer);
      state.routeLayer = null;
    }

    return;
  }

  function renderRouteButtons() {
    elements.routeButtons.forEach(function (button) {
      if (!button || !button.dataset) {
        return;
      }
      button.classList.toggle("is-active", button.dataset.routeBtn === state.routeId);
    });
  }

  function renderCategoryFilters() {
    if (!elements.categoryFilters) {
      return;
    }

    var categories = Object.keys(
      state.hotspots.reduce(function (acc, spot) {
        acc[spot.category] = true;
        return acc;
      }, {})
    ).sort();

    elements.categoryFilters.innerHTML = "";

    categories.forEach(function (category) {
      var btn = document.createElement("button");
      btn.type = "button";
      btn.className = "category-chip" + (isCategoryEnabled(category) ? " is-active" : "");
      btn.textContent = category;
      btn.setAttribute("aria-pressed", String(isCategoryEnabled(category)));
      btn.addEventListener("click", function () {
        state.selectedCategories[category] = !state.selectedCategories[category];
        stopStoryMode();
        renderAll();
      });
      elements.categoryFilters.appendChild(btn);
    });
  }

  function renderStopList(visibleStops) {
    elements.stopList.innerHTML = "";

    if (!visibleStops.length) {
      elements.stopList.innerHTML = '<p class="map-empty-state">No hotspots match the current filters.</p>';
      return;
    }

    visibleStops.forEach(function (spot, index) {
      var btn = document.createElement("button");
      btn.type = "button";
      btn.className = "stop-item-btn" + (spot.id === state.stopId ? " is-active" : "");
      btn.dataset.stopListItem = spot.id;
      btn.textContent = String(index + 1) + ". " + spot.title;
      btn.addEventListener("click", function () {
        setActiveStop(spot.id, true);
      });
      elements.stopList.appendChild(btn);
    });
  }

  function clearMarkerStyles() {
    Object.keys(state.markerById).forEach(function (id) {
      var marker = state.markerById[id];
      marker.setStyle({
        color: "#7c2d12",
        weight: 2,
        fillColor: "#b45309",
        fillOpacity: 0.94,
      });
      marker.setRadius(8);
    });
  }

  function renderMarkers(visibleStops) {
    if (!state.map) {
      return;
    }

    var visibleLookup = {};
    visibleStops.forEach(function (spot) {
      visibleLookup[spot.id] = true;
    });

    state.hotspots.forEach(function (spot) {
      var marker = ensureMarker(spot);
      var shouldShow = !!visibleLookup[spot.id];
      var isOnMap = state.map.hasLayer(marker);

      if (shouldShow && !isOnMap) {
        marker.addTo(state.map);
      } else if (!shouldShow && isOnMap) {
        state.map.removeLayer(marker);
      }
    });

    clearMarkerStyles();

    var active = state.markerById[state.stopId];
    if (active && state.map.hasLayer(active)) {
      active.setStyle({
        color: "#1d4ed8",
        weight: 2,
        fillColor: "#f59e0b",
        fillOpacity: 1,
      });
      active.setRadius(10.5);
    }
  }

  function renderMedia(stop) {
    if (!elements.stopMedia) {
      return;
    }

    elements.stopMedia.innerHTML = "";

    if (!stop || !Array.isArray(stop.media) || !stop.media.length) {
      return;
    }

    stop.media.slice(0, 4).forEach(function (media) {
      if (!media || !media.src) {
        return;
      }
      var img = document.createElement("img");
      img.className = "stop-media-item";
      img.loading = "lazy";
      img.src = String(media.src);
      img.alt = String(media.alt || stop.title);
      elements.stopMedia.appendChild(img);
    });
  }

  function renderLinks(stop) {
    if (!elements.stopLinks) {
      return;
    }

    elements.stopLinks.innerHTML = "";

    if (!stop) {
      return;
    }

    [
      { href: stop.learnMore, text: "Learn More" },
      { href: stop.view360, text: "360 View" },
      { href: stop.arModel, text: "AR / 3D" },
      { href: stop.audio, text: "Audio" },
    ].forEach(function (linkMeta) {
      if (!linkMeta.href) {
        return;
      }

      var link = document.createElement("a");
      link.className = "stop-link";
      link.href = linkMeta.href;
      if (/^https?:/i.test(linkMeta.href)) {
        link.target = "_blank";
        link.rel = "noopener noreferrer";
      }
      link.textContent = linkMeta.text;
      elements.stopLinks.appendChild(link);
    });
  }

  function renderVideo(stop) {
    if (!elements.stopVideoWrap) {
      return;
    }

    elements.stopVideoWrap.innerHTML = "";

    if (!stop || !stop.videoEmbed) {
      return;
    }

    var iframe = document.createElement("iframe");
    iframe.src = stop.videoEmbed;
    iframe.title = stop.title + " video";
    iframe.loading = "lazy";
    iframe.allow = "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture";
    iframe.allowFullscreen = true;
    elements.stopVideoWrap.appendChild(iframe);
  }

  function renderDetails(stop, visibleStops) {
    if (!stop) {
      elements.stopRouteBadge.textContent = ROUTES[state.routeId].label;
      elements.stopTitle.textContent = "Select a hotspot";
      elements.stopSummary.textContent = "Use the map or list on the left to open a landmark profile.";
      elements.stopCategory.textContent = "-";
      elements.stopEra.textContent = "-";
      elements.stopFocus.textContent = "-";
      elements.stopCoordinates.textContent = "-";
      elements.stopPrompt.textContent = "-";
      elements.stopOrder.textContent = "-";
      elements.prevStopBtn.disabled = true;
      elements.nextStopBtn.disabled = true;
      renderMedia(null);
      renderLinks(null);
      renderVideo(null);
      return;
    }

    elements.stopRouteBadge.textContent = ROUTES[state.routeId].label;
    elements.stopTitle.textContent = stop.title;
    elements.stopSummary.textContent = stop.description;
    elements.stopCategory.textContent = stop.category;
    elements.stopEra.textContent = stop.era;
    elements.stopFocus.textContent = stop.focus;
    elements.stopCoordinates.textContent = String(Math.round(stop.x)) + ", " + String(Math.round(stop.y));
    elements.stopPrompt.textContent = stop.prompt;

    var index = visibleStops.findIndex(function (item) {
      return item.id === stop.id;
    });

    if (index >= 0) {
      elements.stopOrder.textContent = "Stop " + String(index + 1) + " of " + String(visibleStops.length);
      elements.prevStopBtn.disabled = index === 0;
      elements.nextStopBtn.disabled = index === visibleStops.length - 1;
    } else {
      elements.stopOrder.textContent = "-";
      elements.prevStopBtn.disabled = true;
      elements.nextStopBtn.disabled = true;
    }

    renderMedia(stop);
    renderLinks(stop);
    renderVideo(stop);
  }

  function ensureActiveStop(visibleStops) {
    if (!visibleStops.length) {
      state.stopId = "";
      return;
    }

    var stillVisible = visibleStops.some(function (item) {
      return item.id === state.stopId;
    });

    if (!stillVisible) {
      state.stopId = visibleStops[0].id;
    }
  }

  function renderAll() {
    var visibleStops = getVisibleStops();

    ensureActiveStop(visibleStops);
    renderRouteButtons();
    renderCategoryFilters();
    renderStopList(visibleStops);
    renderMarkers(visibleStops);
    drawRouteLine(visibleStops);

    var activeStop = state.hotspotsById[state.stopId] || null;
    renderDetails(activeStop, visibleStops);
  }

  function setActiveStop(stopId, panTo) {
    var visibleStops = getVisibleStops();
    var target = visibleStops.find(function (spot) {
      return spot.id === stopId;
    });

    if (!target) {
      return;
    }

    state.stopId = target.id;
    renderAll();

    if (panTo && state.map) {
      state.map.flyTo([target.y, target.x], Math.max(0, state.map.getZoom()), {
        animate: !state.reduceMotion,
        duration: state.reduceMotion ? 0 : 0.5,
      });
    }
  }

  function setRoute(routeId) {
    if (!ROUTES[routeId]) {
      return;
    }
    state.routeId = routeId;
    state.storyIndex = 0;
    stopStoryMode();
    renderAll();
  }

  function moveStop(step) {
    var visibleStops = getVisibleStops();
    if (!visibleStops.length) {
      return;
    }

    var idx = visibleStops.findIndex(function (spot) {
      return spot.id === state.stopId;
    });
    if (idx < 0) {
      return;
    }

    var next = idx + step;
    if (next < 0 || next >= visibleStops.length) {
      return;
    }

    setActiveStop(visibleStops[next].id, true);
  }

  function startStoryMode() {
    var visibleStops = getVisibleStops();
    if (!visibleStops.length) {
      return;
    }

    stopStoryMode();

    elements.storyModeBtn.textContent = "Stop Story";
    elements.storyModeBtn.setAttribute("aria-pressed", "true");

    state.storyTimer = window.setInterval(function () {
      var items = getVisibleStops();
      if (!items.length) {
        return;
      }

      var nextSpot = items[state.storyIndex % items.length];
      state.storyIndex += 1;
      setActiveStop(nextSpot.id, true);
    }, state.reduceMotion ? 4600 : 2800);
  }

  function setCalibrationEnabled(enabled) {
    state.calibrationEnabled = enabled;
    if (!elements.calibrateToggleBtn) {
      return;
    }

    elements.calibrateToggleBtn.setAttribute("aria-pressed", String(enabled));
    elements.calibrateToggleBtn.classList.toggle("details-btn--primary", enabled);

    if (!elements.calibrationHint) {
      return;
    }

    if (enabled) {
      elements.calibrationHint.hidden = false;
      elements.calibrationHint.textContent = "Calibration mode active. Click map to capture x,y coordinates.";
    } else {
      elements.calibrationHint.hidden = true;
      elements.calibrationHint.textContent = "";
    }
  }

  function bindEvents() {
    elements.routeButtons.forEach(function (button) {
      button.addEventListener("click", function () {
        if (!button.dataset || !button.dataset.routeBtn) {
          return;
        }
        setRoute(button.dataset.routeBtn);
      });
    });

    if (elements.searchInput) {
      elements.searchInput.addEventListener("input", function () {
        state.searchText = elements.searchInput.value || "";
        state.storyIndex = 0;
        stopStoryMode();
        renderAll();
      });
    }

    if (elements.resetViewBtn) {
      elements.resetViewBtn.addEventListener("click", function () {
        resetMapView();
      });
    }

    if (elements.storyModeBtn) {
      elements.storyModeBtn.addEventListener("click", function () {
        if (state.storyTimer) {
          stopStoryMode();
          return;
        }
        startStoryMode();
      });
    }

    if (elements.calibrateToggleBtn) {
      elements.calibrateToggleBtn.addEventListener("click", function () {
        setCalibrationEnabled(!state.calibrationEnabled);
      });
    }

    elements.prevStopBtn.addEventListener("click", function () {
      moveStop(-1);
    });

    elements.nextStopBtn.addEventListener("click", function () {
      moveStop(1);
    });
  }

  function init() {
    fetchMapData()
      .then(function () {
        return initLeafletMap();
      })
      .then(function () {
        bindEvents();

        if (new URLSearchParams(window.location.search).get("calibrate") === "1") {
          setCalibrationEnabled(true);
        }

        var initialStops = getVisibleStops();
        if (initialStops.length) {
          state.stopId = initialStops[0].id;
        }
        renderAll();
      })
      .catch(function () {
        elements.stopList.innerHTML = '<p class="map-empty-state">Unable to load map data. Check <code>/static/data/site-map-hotspots.json</code>.</p>';
      });
  }

  init();
})();
