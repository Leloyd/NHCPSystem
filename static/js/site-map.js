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
  var ALT_IMAGE_URL = "/static/images/site-map/360aerial_view.jpg";
  var HOTSPOT_DATA_URL = "/static/data/site-map-hotspots.json";
  var INTRO_AUDIO_BY_LANGUAGE = {
    en: "/static/images/site-map/SiteMapIntroEng.mp3",
    tl: "/static/images/site-map/SiteMapIntroTag.mp3",
  };

  var state = {
    map: null,
    imageOverlay: null,
    imageBounds: null,
    imageSize: null,
    sourceCoordinateSpace: null,
    imageUrl: DEFAULT_IMAGE_URL,
    defaultImageUrl: DEFAULT_IMAGE_URL,
    alternateImageUrl: ALT_IMAGE_URL,
    activeViewMode: "default",
    minZoom: -2,
    routeId: "orientation",
    stopId: "",
    infoStopId: "",
    language: "en",
    searchText: "",
    selectedCategories: {},
    hotspots: [],
    hotspotsById: {},
    markerById: {},
    markerNodesBound: {},
    routeLayer: null,
    audioPlayer: null,
    introAudioPlayer: null,
    storyTimer: null,
    storyIndex: 0,
    calibrationEnabled: false,
    hotspotsVisible: true,
    reduceMotion: window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches,
  };

  var elements = {
    mapRoot: document.getElementById("interactiveMap"),
    resetViewBtn: document.getElementById("resetViewBtn"),
    languageBtn: document.getElementById("mapLanguageBtn"),
    languageLabel: document.getElementById("mapLanguageLabel"),
    toggleHotspotsBtn: document.getElementById("mapToggleHotspotsBtn"),
    controlDock: document.getElementById("mapControlDock"),
    loadingOverlay: document.getElementById("mapLoadingOverlay"),
    loadingTitle: document.getElementById("mapLoadingTitle"),
    loadingCopy: document.getElementById("mapLoadingCopy"),
    mapInfoOverlay: document.getElementById("mapInfoOverlay"),
    mapInfoCard: document.getElementById("mapInfoCard"),
    mapInfoRoute: document.getElementById("mapInfoRoute"),
    mapInfoTitle: document.getElementById("mapInfoTitle"),
    mapInfoMeta: document.getElementById("mapInfoMeta"),
    stopMedia: document.getElementById("mapInfoMedia"),
    mapInfoSummary: document.getElementById("mapInfoSummary"),
    coordHelper: document.getElementById("mapCoordHelper"),
    coordHelperCopy: document.getElementById("mapCoordHelperCopy"),
  };

  if (!elements.mapRoot || !window.L) {
    return;
  }

  function setLoadingState(isLoading, title, copy) {
    if (elements.loadingTitle && title) {
      elements.loadingTitle.textContent = title;
    }

    if (elements.loadingCopy && copy) {
      elements.loadingCopy.textContent = copy;
    }

    if (elements.loadingOverlay) {
      elements.loadingOverlay.hidden = !isLoading;
    }

    if (elements.controlDock) {
      elements.controlDock.hidden = !!isLoading;
    }
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

        state.defaultImageUrl = payload && payload.image && payload.image.url ? String(payload.image.url) : DEFAULT_IMAGE_URL;
        state.imageUrl = state.defaultImageUrl;
        state.alternateImageUrl = ALT_IMAGE_URL;
        state.sourceCoordinateSpace = normalizeCoordinateSpace(payload && payload.image);
        state.hotspotsById = {};

        state.hotspots.forEach(function (spot) {
          state.hotspotsById[spot.id] = spot;
        });

        var categories = {};
        state.hotspots.forEach(function (spot) {
          categories[spot.category] = true;
        });
        state.selectedCategories = categories;
        state.hotspotsVisible = true;
      });
  }

  function normalizePositiveNumber(value) {
    var number = Number(value);
    return isFinite(number) && number > 0 ? number : 0;
  }

  function normalizeCoordinateSpace(imageMeta) {
    if (!imageMeta) {
      return null;
    }

    var width = normalizePositiveNumber(imageMeta.coordinateWidth || imageMeta.width);
    var height = normalizePositiveNumber(imageMeta.coordinateHeight || imageMeta.height);

    if (!width || !height) {
      return null;
    }

    return {
      width: width,
      height: height,
    };
  }

  function normalizeHotspot(raw) {
    if (!raw || !raw.id || typeof raw.x !== "number" || typeof raw.y !== "number") {
      return null;
    }

    return {
      id: String(raw.id),
      title: String(raw.title || raw.id),
      category: String(raw.category || "General"),
      sourceX: Number(raw.x),
      sourceY: Number(raw.y),
      x: Number(raw.x),
      y: Number(raw.y),
      era: String(raw.era || "-"),
      focus: String(raw.focus || "-"),
      prompt: String(raw.prompt || "-"),
      description: String(raw.description || "No description available."),
      translations: raw.translations && typeof raw.translations === "object" ? raw.translations : {},
      media: Array.isArray(raw.media) ? raw.media : [],
      learnMore: raw.learnMore ? String(raw.learnMore) : "",
      view360: raw.view360 ? String(raw.view360) : "",
      arModel: raw.arModel ? String(raw.arModel) : "",
      audio: raw.audio ? String(raw.audio) : "",
      audioByLanguage: raw.audioByLanguage && typeof raw.audioByLanguage === "object" ? raw.audioByLanguage : {},
      videoEmbed: raw.videoEmbed ? String(raw.videoEmbed) : "",
    };
  }

  function getCurrentLanguage() {
    return state.language === "tl" ? "tl" : "en";
  }

  function getLocalizedDescription(stop) {
    if (!stop) {
      return "";
    }

    var language = getCurrentLanguage();
    var translation = stop.translations && stop.translations[language];
    if (translation && translation.description) {
      return String(translation.description);
    }

    return String(stop.description || "No description available.");
  }

  function stopHotspotAudio() {
    if (!state.audioPlayer) {
      return;
    }

    try {
      state.audioPlayer.pause();
      state.audioPlayer.currentTime = 0;
    } catch (_error) {
      return;
    } finally {
      state.audioPlayer = null;
    }
  }

  function stopIntroAudio() {
    if (!state.introAudioPlayer) {
      return;
    }

    try {
      state.introAudioPlayer.pause();
      state.introAudioPlayer.currentTime = 0;
    } catch (_error) {
      return;
    } finally {
      state.introAudioPlayer = null;
    }
  }

  function playIntroAudio() {
    stopIntroAudio();

    var language = getCurrentLanguage();
    var audioUrl = INTRO_AUDIO_BY_LANGUAGE[language] || INTRO_AUDIO_BY_LANGUAGE.en;
    if (!audioUrl) {
      return;
    }

    state.introAudioPlayer = new Audio(appendCacheBuster(audioUrl));
    state.introAudioPlayer.preload = "auto";

    var playPromise = state.introAudioPlayer.play();
    if (playPromise && typeof playPromise.catch === "function") {
      playPromise.catch(function () {});
    }
  }

  function is360ViewActive() {
    return state.activeViewMode === "360";
  }

  function updateCoordinateHelper(message) {
    if (!elements.coordHelper || !elements.coordHelperCopy) {
      return;
    }

    elements.coordHelper.hidden = !is360ViewActive();
    if (message) {
      elements.coordHelperCopy.textContent = message;
    } else if (is360ViewActive()) {
      elements.coordHelperCopy.textContent = "Tap anywhere on the 360 aerial view to copy the hotspot coordinates.";
    }
  }

  function copyCoordinateSnippet(snippet) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      return navigator.clipboard.writeText(snippet);
    }

    return Promise.reject(new Error("Clipboard unavailable"));
  }

  function handle360CoordinateClick(event) {
    if (!is360ViewActive() || !event || !event.latlng) {
      return;
    }

    var x = Math.round(event.latlng.lng);
    var y = Math.round(event.latlng.lat);
    var coordinateSnippet = '"x": ' + String(x) + ', "y": ' + String(y);

    copyCoordinateSnippet(coordinateSnippet)
      .then(function () {
        updateCoordinateHelper("Copied coordinates: " + coordinateSnippet);
      })
      .catch(function () {
        updateCoordinateHelper("Coordinates: " + coordinateSnippet + " (copy manually)");
      });
  }

  function playHotspotAudio(stop) {
    stopIntroAudio();
    stopHotspotAudio();

    if (!stop) {
      return;
    }

    var language = getCurrentLanguage();
    var audioUrl = "";

    if (stop.audioByLanguage && stop.audioByLanguage[language]) {
      audioUrl = String(stop.audioByLanguage[language]);
    } else if (stop.audioByLanguage && stop.audioByLanguage.en) {
      audioUrl = String(stop.audioByLanguage.en);
    } else if (stop.audio) {
      audioUrl = String(stop.audio);
    }

    if (!audioUrl) {
      return;
    }

    state.audioPlayer = new Audio(appendCacheBuster(audioUrl));
    state.audioPlayer.preload = "auto";

    var playPromise = state.audioPlayer.play();
    if (playPromise && typeof playPromise.catch === "function") {
      playPromise.catch(function () {});
    }
  }

  function applyHotspotCoordinateScale() {
    if (!state.imageSize) {
      return;
    }

    var coordinateSpace = state.sourceCoordinateSpace || state.imageSize;
    var scaleX = state.imageSize.width / coordinateSpace.width;
    var scaleY = state.imageSize.height / coordinateSpace.height;

    state.hotspots.forEach(function (spot) {
      spot.x = spot.sourceX * scaleX;
      spot.y = spot.sourceY * scaleY;
    });
  }

  function calculateCoverMinZoom() {
    if (!state.map || !state.imageBounds) {
      return -2;
    }

    var bounds = window.L.latLngBounds(state.imageBounds);
    var fittedZoom = state.map.getBoundsZoom(bounds, true);

    if (!isFinite(fittedZoom)) {
      return -2;
    }

    return fittedZoom;
  }

  function applyMapBoundsConstraints() {
    if (!state.map || !state.imageBounds) {
      return;
    }

    var bounds = window.L.latLngBounds(state.imageBounds);
    var nextMinZoom = calculateCoverMinZoom();

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

  function updateImageOverlay(nextUrl) {
    if (!state.map || !nextUrl) {
      return Promise.resolve();
    }

    setLoadingState(true, "Switching Site Map View...", "Preparing the selected aerial image.");

    return loadImageDimensions(nextUrl)
      .then(function (imageMeta) {
        var dims = {
          width: imageMeta.width,
          height: imageMeta.height,
        };
        var nextBounds = [
          [0, 0],
          [dims.height, dims.width],
        ];

        state.imageUrl = imageMeta.url;
        state.imageBounds = nextBounds;
        state.imageSize = dims;
        applyHotspotCoordinateScale();

        if (state.imageOverlay) {
          state.map.removeLayer(state.imageOverlay);
        }

        state.imageOverlay = window.L.imageOverlay(state.imageUrl, nextBounds).addTo(state.map);
        resetMapView();
        renderAll();
        setLoadingState(false);
      })
      .catch(function () {
        setLoadingState(true, "Unable to switch Site Map view", "Please refresh the page and try again.");
      });
  }

  function setViewMode(mode) {
    var nextMode = mode === "360" ? "360" : "default";
    var nextUrl = nextMode === "360" ? state.alternateImageUrl : state.defaultImageUrl;

    state.activeViewMode = nextMode;

    if (nextMode === "360") {
      state.hotspotsVisible = false;
      clearActiveSelection();
    } else {
      stopIntroAudio();
      state.hotspotsVisible = true;
      updateCoordinateHelper("");
    }

    updateHotspotToggleButton();
    updateCoordinateHelper("");
    return updateImageOverlay(nextUrl).then(function () {
      if (nextMode === "360") {
        playIntroAudio();
      }
    });
  }

  function resetMapView() {
    if (!state.map || !state.imageBounds) {
      return;
    }

    applyMapBoundsConstraints();

    var bounds = window.L.latLngBounds(state.imageBounds);
    state.map.setView(bounds.getCenter(), state.minZoom, { animate: false });
    state.map.panInsideBounds(bounds, { animate: false });

    if (state.map.getZoom() < state.minZoom) {
      state.map.setZoom(state.minZoom, { animate: false });
    }
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
        applyHotspotCoordinateScale();
        state.map = window.L.map(elements.mapRoot, {
          crs: window.L.CRS.Simple,
          minZoom: -2,
          maxZoom: 2,
          zoomSnap: 0.25,
          zoomDelta: 0.25,
          maxBoundsViscosity: 1,
          attributionControl: false,
        });

        state.imageOverlay = window.L.imageOverlay(state.imageUrl, bounds).addTo(state.map);
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
          '<span class="map-pin" aria-hidden="true"><span class="map-pin__pulse"></span><span class="map-pin__shadow"></span><span class="map-pin__badge"><span class="map-pin__core"></span></span></span>',
        iconSize: [36, 36],
        iconAnchor: [18, 18],
      }),
    });

    marker.on("click", function (event) {
      if (event && event.originalEvent && window.L && window.L.DomEvent) {
        window.L.DomEvent.stopPropagation(event.originalEvent);
      }

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
    if (is360ViewActive() || !state.hotspotsVisible) {
      return [];
    }

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

    if (!state.hotspotsVisible) {
      state.hotspots.forEach(function (spot) {
        var hiddenMarker = ensureMarker(spot);
        if (state.map.hasLayer(hiddenMarker)) {
          state.map.removeLayer(hiddenMarker);
        }
      });
      clearMarkerStyles();
      hideMapInfoOverlay();
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
      elements.stopMedia.hidden = true;
      return;
    }

    elements.stopMedia.hidden = false;

    stop.media.slice(0, 4).forEach(function (media) {
      if (!media || !media.src) {
        return;
      }
      var img = document.createElement("img");
      img.className = "stop-media-item";
      img.loading = "lazy";
      img.src = appendCacheBuster(String(media.src));
      img.alt = String(media.alt || stop.title);
      img.addEventListener("load", function () {
        if (state.infoStopId === stop.id) {
          positionMapInfoOverlay(stop);
        }
      });
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

    stopHotspotAudio();
    state.infoStopId = "";
  }

  function clearActiveSelection() {
    state.stopId = "";
    hideMapInfoOverlay();
    clearMarkerStyles();
  }

  function updateHotspotToggleButton() {
    if (!elements.toggleHotspotsBtn) {
      return;
    }

    var enabled = state.hotspotsVisible && !is360ViewActive();
    elements.toggleHotspotsBtn.classList.toggle("is-active", enabled);
    elements.toggleHotspotsBtn.classList.toggle("is-disabled", is360ViewActive());
    elements.toggleHotspotsBtn.setAttribute("aria-pressed", enabled ? "true" : "false");
    elements.toggleHotspotsBtn.setAttribute("aria-disabled", is360ViewActive() ? "true" : "false");
  }

  function updateLanguageButton() {
    if (!elements.languageBtn || !elements.languageLabel) {
      return;
    }

    var isTagalog = getCurrentLanguage() === "tl";
    elements.languageLabel.textContent = isTagalog ? "Tagalog" : "English";
    elements.languageBtn.classList.toggle("is-active", isTagalog);
    elements.languageBtn.setAttribute("aria-pressed", isTagalog ? "true" : "false");
  }

  function positionMapInfoOverlay(stop) {
    if (!stop || !state.map || !elements.mapInfoOverlay || !elements.mapInfoCard) {
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

    if (!stop || !state.hotspotsVisible || !state.infoStopId || state.infoStopId !== stop.id) {
      hideMapInfoOverlay();
      return;
    }

    elements.mapInfoRoute.textContent = "";
    elements.mapInfoRoute.hidden = true;
    elements.mapInfoTitle.textContent = stop.title;
    elements.mapInfoMeta.textContent = "";
    elements.mapInfoMeta.hidden = true;
    renderMedia(stop);
    elements.mapInfoSummary.textContent = getLocalizedDescription(stop);
    playHotspotAudio(stop);

    positionMapInfoOverlay(stop);
  }

  function ensureActiveStop(visibleStops) {
    if (!visibleStops.length) {
      state.stopId = "";
      state.infoStopId = "";
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
    state.infoStopId = target.id;
    renderAll();

    if (panTo && state.map) {
      state.map.flyTo([target.y, target.x], Math.max(0, state.map.getZoom()), {
        animate: !state.reduceMotion,
        duration: state.reduceMotion ? 0 : 0.5,
      });
    }
  }

  function bindEvents() {
    if (elements.resetViewBtn) {
      elements.resetViewBtn.addEventListener("click", function () {
        var nextMode = is360ViewActive() ? "default" : "360";
        setViewMode(nextMode);
      });
    }

    if (elements.languageBtn) {
      elements.languageBtn.addEventListener("click", function () {
        state.language = getCurrentLanguage() === "en" ? "tl" : "en";
        updateLanguageButton();

        if (is360ViewActive()) {
          playIntroAudio();
        } else if (state.infoStopId) {
          renderAll();
        }
      });
    }

    if (elements.toggleHotspotsBtn) {
      elements.toggleHotspotsBtn.addEventListener("click", function () {
        if (is360ViewActive()) {
          return;
        }

        state.hotspotsVisible = !state.hotspotsVisible;
        updateHotspotToggleButton();
        renderAll();
      });
    }

    if (state.map) {
      state.map.on("click", function () {
        if (is360ViewActive()) {
          return;
        }

        clearActiveSelection();
      });

      state.map.on("click", handle360CoordinateClick);

      ["move", "zoom", "resize"].forEach(function (eventName) {
        state.map.on(eventName, function () {
          var activeStop = state.infoStopId ? state.hotspotsById[state.infoStopId] || null : null;
          if (activeStop) {
            positionMapInfoOverlay(activeStop);
          }
        });
      });
    }
  }

  function init() {
    setLoadingState(true, "Loading Site Map...", "Preparing the aerial image and controls.");

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
        updateLanguageButton();
        updateHotspotToggleButton();
        updateCoordinateHelper("");
        renderAll();
        setLoadingState(false);
        playIntroAudio();
      })
      .catch(function () {
        setLoadingState(true, "Unable to load Site Map", "Please refresh the page and try again.");
        elements.mapRoot.innerHTML = '<div class="map-empty-state">Unable to load map data. Check <code>/static/data/site-map-hotspots.json</code>.</div>';
      });
  }

  init();
})();
