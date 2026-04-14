(function () {
  "use strict";

  var ROUTES = {
    orientation: {
      label: "Orientation Loop",
      stops: [
        "front-gate",
        "flag-pole",
        "parking",
        "museum-entrance",
        "resource-center-office",
        "rightside-outside",
        "middle-ground",
        "left-side-inside",
        "right-side-inside",
        "left-tombs",
        "right-tombs",
        "church-front",
        "church",
        "underground-crypts",
      ],
    },
    heritage: {
      label: "Heritage Core",
      stops: [
        "front-gate",
        "middle-ground",
        "left-tombs",
        "right-tombs",
        "church-front",
        "church",
        "underground-crypts",
      ],
    },
    accessibility: {
      label: "Accessible Route",
      stops: [
        "front-gate",
        "parking",
        "museum-entrance",
        "resource-center-office",
        "middle-ground",
        "church-front",
      ],
    },
  };

  var DEFAULT_IMAGE_URL = "/static/images/site-map/aerial-view.jpg";
  var HOTSPOT_DATA_URL = "/static/data/site-map-hotspots.json";
  var MAP_INFO_MIN_ZOOM_OFFSET = 1.25;

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
    searchInput: document.getElementById("mapSearchInput"),
    resetViewBtn: document.getElementById("resetViewBtn"),
    mapInfoOverlay: document.getElementById("mapInfoOverlay"),
    mapInfoCard: document.getElementById("mapInfoCard"),
    mapInfoRoute: document.getElementById("mapInfoRoute"),
    mapInfoTitle: document.getElementById("mapInfoTitle"),
    mapInfoMeta: document.getElementById("mapInfoMeta"),
    mapInfoSummary: document.getElementById("mapInfoSummary"),
  };

  if (!elements.mapRoot || !window.L) {
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

    var marker = window.L.marker([spot.y, spot.x], {
      keyboard: false,
      icon: window.L.divIcon({
        className: "map-pin-marker",
        html:
          '<span class="map-pin" aria-hidden="true"><span class="map-pin__pulse"></span><span class="map-pin__shape"><span class="map-pin__inner"></span></span></span>',
        iconSize: [30, 42],
        iconAnchor: [15, 42],
      }),
    });

    marker.on("click", function () {
      setActiveStop(spot.id, true);
    });

    marker.on("mouseover", function () {
      var node = marker.getElement();
      if (node && state.stopId !== spot.id) {
        node.classList.add("is-hover");
      }
    });

    marker.on("mouseout", function () {
      var node = marker.getElement();
      if (node && state.stopId !== spot.id) {
        node.classList.remove("is-hover");
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
      node.dataset.stopMarker = spot.id;
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
    return state.hotspots.filter(function (spot) {
      var bySearch = !search || spot.title.toLowerCase().indexOf(search) !== -1;
      return bySearch;
    });
  }

  function stopStoryMode() {
    if (state.storyTimer) {
      window.clearInterval(state.storyTimer);
      state.storyTimer = null;
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

  function clearMarkerStyles() {
    Object.keys(state.markerById).forEach(function (id) {
      var marker = state.markerById[id];
      var node = marker.getElement();
      if (!node) {
        return;
      }

      node.classList.remove("is-active");
      node.classList.remove("is-hover");
      node.removeAttribute("aria-current");
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
      var activeNode = active.getElement();
      if (activeNode) {
        activeNode.classList.add("is-active");
        activeNode.setAttribute("aria-current", "true");
      }
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

  function hideMapInfoOverlay() {
    if (elements.mapInfoOverlay) {
      elements.mapInfoOverlay.hidden = true;
    }
  }

  function isMapInfoVisibleForCurrentZoom() {
    if (!state.map) {
      return false;
    }

    return state.map.getZoom() >= state.minZoom + MAP_INFO_MIN_ZOOM_OFFSET;
  }

  function positionMapInfoOverlay(stop) {
    if (!stop || !state.map || !elements.mapInfoOverlay || !elements.mapInfoCard) {
      hideMapInfoOverlay();
      return;
    }

    if (!isMapInfoVisibleForCurrentZoom()) {
      hideMapInfoOverlay();
      return;
    }

    var markerPoint = state.map.latLngToContainerPoint([stop.y, stop.x]);
    var mapWidth = elements.mapRoot.clientWidth || 0;
    var mapHeight = elements.mapRoot.clientHeight || 0;

    if (!mapWidth || !mapHeight) {
      hideMapInfoOverlay();
      return;
    }

    elements.mapInfoOverlay.hidden = false;

    var cardWidth = elements.mapInfoCard.offsetWidth || Math.min(320, Math.max(220, mapWidth - 24));
    var cardHeight = elements.mapInfoCard.offsetHeight || 140;
    var gap = 22;
    var cardLeft = markerPoint.x - cardWidth * 0.5;
    var minLeft = 12;
    var maxLeft = Math.max(minLeft, mapWidth - cardWidth - 12);

    cardLeft = Math.max(minLeft, Math.min(cardLeft, maxLeft));

    var cardTop = markerPoint.y + gap;
    var minTop = 12;
    var maxTop = Math.max(minTop, mapHeight - cardHeight - 12);

    cardTop = Math.max(minTop, Math.min(cardTop, maxTop));

    elements.mapInfoCard.style.left = cardLeft + "px";
    elements.mapInfoCard.style.top = cardTop + "px";
  }

  function renderMapInfo(stop) {
    if (!elements.mapInfoOverlay || !elements.mapInfoTitle || !elements.mapInfoSummary || !elements.mapInfoMeta || !elements.mapInfoRoute) {
      return;
    }

    if (!stop) {
      hideMapInfoOverlay();
      return;
    }

    if (!isMapInfoVisibleForCurrentZoom()) {
      hideMapInfoOverlay();
      return;
    }

    elements.mapInfoRoute.textContent = "Hotspot Information";
    elements.mapInfoTitle.textContent = stop.title;
    elements.mapInfoMeta.textContent = stop.category + " · " + String(Math.round(stop.x)) + ", " + String(Math.round(stop.y));
    elements.mapInfoSummary.textContent = stop.description;

    positionMapInfoOverlay(stop);
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
    renderMarkers(visibleStops);
    drawRouteLine(visibleStops);

    var activeStop = state.hotspotsById[state.stopId] || null;
    renderMapInfo(activeStop);
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

  function bindEvents() {
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

    if (state.map) {
      ["move", "zoom", "resize"].forEach(function (eventName) {
        state.map.on(eventName, function () {
          var activeStop = state.hotspotsById[state.stopId] || null;
          if (activeStop) {
            positionMapInfoOverlay(activeStop);
          }
        });
      });
    }
  }

  function init() {
    fetchMapData()
      .then(function () {
        return initLeafletMap();
      })
      .then(function () {
        bindEvents();

        var initialStops = getVisibleStops();
        if (initialStops.length) {
          state.stopId = initialStops[0].id;
        }
        renderAll();
      })
      .catch(function () {
        elements.mapRoot.innerHTML = '<div class="map-empty-state">Unable to load map data. Check <code>/static/data/site-map-hotspots.json</code>.</div>';
      });
  }

  init();
})();
