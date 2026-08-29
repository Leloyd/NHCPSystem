(function () {
  "use strict";

  var ROUTES = {
    orientation: {
      label: "Orientation Loop",
      stops: [
        "front-gate",
        "flag-pole",
        "parking",
        "museum-landmark",
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
        "museum-landmark",
        "resource-center-office",
        "middle-ground",
        "church-front",
      ],
    },
  };

  var DEFAULT_IMAGE_URL = "/static/images/site-map/aerial-map.jpg";
  var ALT_IMAGE_URL = "/static/images/site-map/360aerial_view.jpg";
  var HOTSPOT_DATA_URL = "/static/data/site-map-hotspots.json";
  var VIRTUAL_TOUR_MAP_DATA_URL = "/static/data/tour-minimap.json";
  var INTRO_AUDIO_BY_LANGUAGE = {
    en: "/static/images/site-map/SiteMapIntroEng.mp3",
    tl: "/static/images/site-map/SiteMapIntroTag.mp3",
  };
  var RUNTIME_CONFIG = (function () {
    var node = document.getElementById("siteMapRuntimeConfig");
    if (!node) return {};
    try { return JSON.parse(node.textContent || "{}"); }
    catch (_error) { return {}; }
  })();
  var VIRTUAL_TOUR_SCENE_BY_STOP = {
    "front-gate": "frontGate",
    "flag-pole": "leftFlag",
    "middle-ground": "middleGInside",
    "left-side-inside": "leftCornerInsideFrontGate",
    "right-side-inside": "rightCornerInsideFrontGate",
    "left-tombs": "leftTombs",
    "right-tombs": "rightFrontTombs",
    "church-front": "frontChurch",
    church: "insidechurch",
    "underground-crypts": "underground1",
  };
  var PANORAMA_COORDINATES_BY_TARGET = {
    rightfrontgate: { pitch: -79.21, yaw: 21.77 },
    insidefrontgate: { pitch: -61.59, yaw: -16.54 },
    insidefrontgate1: { pitch: -53.53, yaw: -3.70 },
    leftfrontchurch: { pitch: -27.16, yaw: 8.76 },
    rightfrontchurch: { pitch: -27.39, yaw: 16.57 },
    rightfronttombs: { pitch: -26.40, yaw: 20.40 },
    rightfronttombs2: { pitch: -31.86, yaw: 38.71 },
    rightcornermiddleg: { pitch: -46.37, yaw: 50.82 },
    rightmiddlecornermiddleg: { pitch: -54.59, yaw: 45.10 },
    rightcornerinsidefrontgate: { pitch: -67.40, yaw: 27.23 },
    leftfrontgate: { pitch: -57.66, yaw: -37.91 },
    leftcornerinsidefrontgate: { pitch: -51.56, yaw: -37.02 },
    middlegmuseum: { pitch: -44.85, yaw: -47.73 },
    frontmuseum: { pitch: -41.44, yaw: -49.23 },
    museumlandmark: { pitch: -35.64, yaw: -47.54 },
    leftmiddleinsidefrontgate: { pitch: -43.07, yaw: -33.32 },
    leftmiddleg: { pitch: -38.34, yaw: -31.58 },
    leftmiddlemiddleg: { pitch: -34.09, yaw: -28.80 },
    leftendtombs: { pitch: -27.39, yaw: -13.33 },
    lefttombs: { pitch: -25.33, yaw: 3.78 },
    leftfirsttombs: { pitch: -25.61, yaw: 7.54 },
  };
  var TAGALOG_TITLE_BY_STOP = {
    "front-gate": "Harapang Tarangkahan",
    "flag-pole": "Poste ng Watawat",
    parking: "Paradahan",
    "museum-landmark": "Museo",
    "resource-center-office": "Sentrong Sanggunian",
    "middle-ground": "Gitnang Bahagi",
    "left-side-inside": "Kaliwang Bahagi",
    "right-side-inside": "Kanang Bahagi",
    "left-tombs": "Mga Puntod sa Kaliwa",
    "right-tombs": "Mga Puntod sa Kanan",
    "church-front": "Harap ng Kapilya",
    church: "Kapilya",
    "underground-crypts": "Mga Libingan sa Ilalim ng Lupa",
  };
  var TAGALOG_CATEGORY = {
    Access: "Daanan",
    Landmark: "Palatandaan",
    "Visitor Zone": "Lugar ng Bisita",
    Tombs: "Mga Puntod",
    Chapel: "Kapilya",
    "Virtual Tour Stop": "Hintuan ng Virtual Tour",
  };

  var state = {
    map: null,
    imageOverlay: null,
    panoramaViewer: null,
    panoramaReadyPromise: null,
    panoramaFailed: false,
    panoramaOriginalUrl: "",
    panoramaSourceUrl: "",
    imageBounds: null,
    imageSize: null,
    sourceCoordinateSpace: null,
    imageUrl: DEFAULT_IMAGE_URL,
    defaultImageUrl: DEFAULT_IMAGE_URL,
    alternateImageUrl: ALT_IMAGE_URL,
    defaultViewMode: "default",
    databaseConfigActive: false,
    panoramaInitialPitch: 0,
    panoramaInitialYaw: 0,
    panoramaInitialHfov: 110,
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
    virtualTourLandmarks: [],
    virtualTourLandmarkMarkers: [],
    virtualTourSceneCount: 0,
    panoramaHotspotNodesById: {},
    coordinateCaptureEnabled: false,
    coordinateCapturePointerStart: null,
    coordinateCapturePointerMoved: false,
    coordinateCaptureFeedbackTimer: 0,
    markerRefreshRafId: 0,
    routeLayer: null,
    audioPlayer: null,
    introAudioPlayer: null,
    storyTimer: null,
    storyIndex: 0,
    calibrationEnabled: false,
    hotspotsVisible: true,
    viewSwitching: false,
    transitionTimer: 0,
    controlRevealTimer: 0,
    infoConnectorRafId: 0,
    infoConnectorStopId: "",
    infoCardDragged: false,
    infoCardPosition: null,
    infoCardDrag: null,
    reduceMotion: window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches,
  };

  var elements = {
    mapRoot: document.getElementById("interactiveMap"),
    panoramaRoot: document.getElementById("panoramaMap"),
    coordinateCaptureBtn: document.getElementById("mapCoordinateCaptureBtn"),
    coordinateCaptureLabel: document.getElementById("mapCoordinateCaptureLabel"),
    coordinateCaptureToast: document.getElementById("mapCoordinateCaptureToast"),
    resetViewBtn: document.getElementById("resetViewBtn"),
    viewModeBtn: document.getElementById("mapViewModeBtn"),
    viewModeLabel: document.getElementById("mapViewModeLabel"),
    languageBtn: document.getElementById("mapLanguageBtn"),
    languageLabel: document.getElementById("mapLanguageLabel"),
    resetLabel: document.getElementById("mapResetLabel"),
    hotspotsLabel: document.getElementById("mapHotspotsLabel"),
    backLabel: document.getElementById("mapBackLabel"),
    toggleHotspotsBtn: document.getElementById("mapToggleHotspotsBtn"),
    controlDock: document.getElementById("mapControlDock"),
    loadingOverlay: document.getElementById("mapLoadingOverlay"),
    loadingTitle: document.getElementById("mapLoadingTitle"),
    loadingCopy: document.getElementById("mapLoadingCopy"),
    viewTransition: document.getElementById("mapViewTransition"),
    viewTransitionText: document.getElementById("mapViewTransitionText"),
    mapInfoOverlay: document.getElementById("mapInfoOverlay"),
    mapInfoCard: document.getElementById("mapInfoCard"),
    mapInfoDragHandle: document.getElementById("mapInfoDragHandle"),
    mapInfoConnector: document.getElementById("mapInfoConnector"),
    mapInfoConnectorShadow: document.getElementById("mapInfoConnectorShadow"),
    mapInfoConnectorPath: document.getElementById("mapInfoConnectorPath"),
    mapInfoConnectorOrigin: document.getElementById("mapInfoConnectorOrigin"),
    mapInfoConnectorEnd: document.getElementById("mapInfoConnectorEnd"),
    mapInfoClose: document.getElementById("mapInfoClose"),
    mapInfoTitle: document.getElementById("mapInfoTitle"),
    mapInfoMeta: document.getElementById("mapInfoMeta"),
    stopMedia: document.getElementById("mapInfoMedia"),
    mapInfoSummary: document.getElementById("mapInfoSummary"),
    stopLinks: document.getElementById("mapInfoLinks"),
  };

  if (!elements.mapRoot || !window.L) {
    return;
  }

  function setLoadingState(isLoading, title, copy) {
    if (elements.loadingCopy && (copy || title)) {
      elements.loadingCopy.textContent = copy || title;
    }

    if (elements.loadingOverlay) {
      elements.loadingOverlay.hidden = !isLoading;
    }

    if (elements.controlDock) {
      window.clearTimeout(state.controlRevealTimer);
      if (isLoading) {
        elements.controlDock.hidden = true;
      } else {
        state.controlRevealTimer = window.setTimeout(function () {
          elements.controlDock.hidden = false;
        }, state.reduceMotion ? 0 : 620);
      }
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
    if (RUNTIME_CONFIG && RUNTIME_CONFIG.source === "database") {
      var aerial = RUNTIME_CONFIG.aerialMap || {};
      var panorama = RUNTIME_CONFIG.panoramaMap || {};
      var intro = RUNTIME_CONFIG.introAudio || {};
      var settings = RUNTIME_CONFIG.settings || {};
      var width = Number(aerial.width) || 3074;
      var height = Number(aerial.height) || 2250;
      state.defaultImageUrl = String(aerial.url || aerial.path || DEFAULT_IMAGE_URL);
      state.imageUrl = state.defaultImageUrl;
      state.alternateImageUrl = String(panorama.url || panorama.path || ALT_IMAGE_URL);
      state.sourceCoordinateSpace = normalizeCoordinateSpace({
        width: width, height: height, coordinateWidth: width, coordinateHeight: height,
        referenceWidth: width, referenceHeight: height,
      });
      state.hotspotsVisible = settings.hotspotsVisible !== false;
      state.defaultViewMode = settings.defaultView === "360" ? "360" : "default";
      state.databaseConfigActive = true;
      state.panoramaInitialPitch = Number(panorama.initialPitch) || 0;
      state.panoramaInitialYaw = Number(panorama.initialYaw) || 0;
      state.panoramaInitialHfov = Number(panorama.initialHfov) || 110;
      INTRO_AUDIO_BY_LANGUAGE = {
        en: String(intro.enUrl || intro.en || ""),
        tl: String(intro.tlUrl || intro.tl || ""),
      };
      state.hotspots = (Array.isArray(RUNTIME_CONFIG.hotspots) ? RUNTIME_CONFIG.hotspots : [])
        .filter(function (item) { return item && item.enabled !== false && (item.showAerial || item.show360); })
        .map(function (item) {
          var title = item.title && typeof item.title === "object" ? item.title : {};
          var description = item.description && typeof item.description === "object" ? item.description : {};
          var audio = item.audio && typeof item.audio === "object" ? item.audio : {};
          var action = item.action && typeof item.action === "object" ? item.action : {};
          var actionLabel = action.label && typeof action.label === "object" ? action.label : {};
          var aerialPosition = item.aerial && typeof item.aerial === "object" ? item.aerial : {};
          return normalizeHotspot({
            id: item.id,
            title: title.en || item.id,
            titleTl: title.tl || "",
            category: item.category || "General",
            x: Number(aerialPosition.x || 0) * width,
            y: Number(aerialPosition.y || 0) * height,
            description: description.en || "",
            translations: { tl: { title: title.tl || "", description: description.tl || "" } },
            panorama: item.show360 ? item.panorama : null,
            media: item.imageUrl || item.imagePath ? [{ src: item.imageUrl || item.imagePath, alt: item.imageAlt || title.en || "" }] : [],
            audioByLanguage: { en: audio.enUrl || audio.en || "", tl: audio.tlUrl || audio.tl || "" },
            virtualTourScene: item.virtualTourScene || "",
            markerStyle: item.markerStyle,
            linkedViews: item.linkedViews !== false,
            showAerial: item.showAerial !== false,
            customLinks: action.url ? [{ href: action.url, labelEn: actionLabel.en || "Learn More", labelTl: actionLabel.tl || actionLabel.en || "Alamin Pa" }] : [],
          });
        })
        .filter(function (item) { return item; });
      state.virtualTourLandmarks = [];
      state.virtualTourSceneCount = 0;
      indexHotspots();
      return Promise.resolve();
    }

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
        state.hotspotsVisible = true;
      })
      .then(function () {
        return fetch(VIRTUAL_TOUR_MAP_DATA_URL, { cache: "no-store" })
          .then(function (response) {
            if (!response.ok) {
              throw new Error("Failed to load Virtual Tour map landmarks.");
            }
            return response.json();
          })
          .then(function (payload) {
            state.virtualTourLandmarks = Array.isArray(payload.landmarks)
              ? payload.landmarks.map(normalizeVirtualTourLandmark).filter(function (item) {
                  return item;
                })
              : [];
            mergeVirtualTourScenes(payload && payload.scenes);
            mergeInteractiveLandmarks();
            applyCapturedPanoramaCoordinates();
          })
          .catch(function (error) {
            state.virtualTourLandmarks = [];
            state.virtualTourSceneCount = 0;
            if (window.console && window.console.warn) {
              window.console.warn("The Site Map opened without the shared Virtual Tour coordinates.", error);
            }
          });
      })
      .then(function () {
        indexHotspots();
      });
  }

  function indexHotspots() {
    var categories = {};
    state.hotspotsById = {};

    state.hotspots.forEach(function (spot) {
      state.hotspotsById[spot.id] = spot;
      categories[spot.category] = true;
    });
    state.selectedCategories = categories;
  }

  function normalizeVirtualTourScene(sceneId, raw) {
    if (!sceneId || !raw) {
      return null;
    }

    var x = Number(raw.x);
    var y = Number(raw.y);
    if (!isFinite(x) || !isFinite(y) || x < 0 || x > 1 || y < 0 || y > 1) {
      return null;
    }

    return {
      sceneId: String(sceneId),
      x: x,
      y: y,
      label: String(raw.label || sceneId),
    };
  }

  function createVirtualTourHotspot(scene) {
    var title = scene.label || scene.sceneId;
    return {
      id: "virtual-tour-" + scene.sceneId,
      title: title,
      category: "Virtual Tour Stop",
      sourceX: 0,
      sourceY: 0,
      x: 0,
      y: 0,
      mapFractionX: scene.x,
      mapFractionY: scene.y,
      virtualTourScene: scene.sceneId,
      era: "-",
      focus: "-",
      prompt: "-",
      description: "This point marks the “" + title + "” location in the Virtual Tour.",
      translations: {
        tl: {
          description: "Tinutukoy ng puntong ito ang lokasyong “" + title + "” sa Virtual Tour.",
        },
      },
      panorama: null,
      media: [],
      learnMore: "",
      learnMoreLabel: "",
      view360: "",
      arModel: "",
      arModelLabel: "",
      audio: "",
      audioByLanguage: {},
      videoEmbed: "",
    };
  }

  function mergeVirtualTourScenes(rawScenes) {
    var scenes = [];
    var scenesById = {};
    var scenesByNormalizedId = {};
    var claimedScenes = {};

    if (rawScenes && typeof rawScenes === "object") {
      Object.keys(rawScenes).forEach(function (sceneId) {
        var scene = normalizeVirtualTourScene(sceneId, rawScenes[sceneId]);
        if (!scene) {
          return;
        }
        scenes.push(scene);
        scenesById[scene.sceneId] = scene;
        scenesByNormalizedId[scene.sceneId.toLowerCase().replace(/[^a-z0-9]/g, "")] = scene;
      });
    }

    state.hotspots.forEach(function (spot) {
      var sceneId = VIRTUAL_TOUR_SCENE_BY_STOP[spot.id] || "";
      var normalizedSceneId = sceneId.toLowerCase().replace(/[^a-z0-9]/g, "");
      var scene = sceneId ? (scenesById[sceneId] || scenesByNormalizedId[normalizedSceneId]) : null;
      var matchedSceneId = scene ? scene.sceneId : "";

      // Reuse the rich Site Map information at the matching Virtual Tour point.
      // Stops without a tour destination remain information-only hotspots.
      if (scene && !claimedScenes[matchedSceneId]) {
        spot.mapFractionX = scene.x;
        spot.mapFractionY = scene.y;
        spot.virtualTourScene = sceneId;
        claimedScenes[matchedSceneId] = true;
      }
    });

    scenes.forEach(function (scene) {
      if (!claimedScenes[scene.sceneId]) {
        state.hotspots.push(createVirtualTourHotspot(scene));
      }
    });

    state.virtualTourSceneCount = scenes.length;
  }

  function findVirtualTourLandmark(label) {
    var target = String(label || "").toLowerCase();
    return state.virtualTourLandmarks.find(function (landmark) {
      return String(landmark.label || "").toLowerCase() === target;
    }) || null;
  }

  function mergeInteractiveLandmarks() {
    var chapelLandmark = findVirtualTourLandmark("Chapel");
    var chapelStop = state.hotspots.find(function (spot) {
      return spot.id === "church";
    });

    if (chapelLandmark && chapelStop) {
      chapelStop.mapFractionX = chapelLandmark.x;
      chapelStop.mapFractionY = chapelLandmark.y;
      chapelStop.landmarkOnly = true;
    }

    var museumLandmark = findVirtualTourLandmark("Museum");
    if (!museumLandmark || state.hotspots.some(function (spot) { return spot.id === "museum-landmark"; })) {
      return;
    }

    var museumStop = normalizeHotspot({
      id: "museum-landmark",
      title: "Museum",
      category: "Landmark",
      x: 0,
      y: 0,
      description: "The museum preserves and interprets the history of the Nagcarlan Underground Cemetery. Its exhibits help visitors understand the site’s architecture, burial traditions, cultural importance, and role in Philippine history.",
      translations: {
        tl: {
          description: "Pinangangalagaan at ipinapaliwanag ng museo ang kasaysayan ng Libingan sa Ilalim ng Lupa ng Nagcarlan. Tinutulungan ng mga eksibit nito ang mga bisita na maunawaan ang arkitektura, mga tradisyon sa paglilibing, kahalagahang pangkultura, at papel ng pook sa kasaysayan ng Pilipinas.",
        },
      },
      media: [
        {
          src: "/static/SiteMap/Museum/InsideMuseum.png",
          alt: "Interior of the museum at the Nagcarlan Underground Cemetery",
        },
      ],
      learnMore: "/online-gallery",
      learnMoreLabel: "Online Gallery",
    });

    if (museumStop) {
      museumStop.mapFractionX = museumLandmark.x;
      museumStop.mapFractionY = museumLandmark.y;
      museumStop.virtualTourScene = "insidemuseum";
      museumStop.landmarkOnly = true;
      state.hotspots.push(museumStop);
    }
  }

  function normalizeVirtualTourLandmark(raw) {
    if (!raw) {
      return null;
    }

    var x = Number(raw.x);
    var y = Number(raw.y);
    if (!isFinite(x) || !isFinite(y) || x < 0 || x > 1 || y < 0 || y > 1) {
      return null;
    }

    return {
      x: x,
      y: y,
      label: String(raw.label || ""),
    };
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
      referenceWidth: normalizePositiveNumber(imageMeta.referenceWidth),
      referenceHeight: normalizePositiveNumber(imageMeta.referenceHeight),
      cropOffsetX: Number(imageMeta.cropOffsetX) || 0,
      cropOffsetY: Number(imageMeta.cropOffsetY) || 0,
    };
  }

  function normalizePanoramaCoordinates(panoramaMeta) {
    if (!panoramaMeta || typeof panoramaMeta !== "object") {
      return null;
    }

    var pitch = Number(panoramaMeta.pitch);
    var yaw = Number(panoramaMeta.yaw);

    if (!isFinite(pitch) || !isFinite(yaw)) {
      return null;
    }

    return {
      pitch: pitch,
      yaw: yaw,
    };
  }

  function normalizePanoramaTargetKey(value) {
    return String(value || "").toLowerCase().replace(/[^a-z0-9]/g, "");
  }

  function applyCapturedPanoramaCoordinates() {
    state.hotspots.forEach(function (spot) {
      var stopCoordinates = PANORAMA_COORDINATES_BY_TARGET[normalizePanoramaTargetKey(spot.id)] || null;
      var sceneCoordinates = PANORAMA_COORDINATES_BY_TARGET[normalizePanoramaTargetKey(spot.virtualTourScene)] || null;
      var coordinates = stopCoordinates || sceneCoordinates;
      if (coordinates) {
        spot.panorama = {
          pitch: coordinates.pitch,
          yaw: coordinates.yaw,
        };
      }
    });
  }

  function normalizeHotspot(raw) {
    if (!raw || !raw.id || typeof raw.x !== "number" || typeof raw.y !== "number") {
      return null;
    }

    return {
      id: String(raw.id),
      title: String(raw.title || raw.id),
      titleTl: String(raw.titleTl || ""),
      category: String(raw.category || "General"),
      sourceX: Number(raw.x),
      sourceY: Number(raw.y),
      x: Number(raw.x),
      y: Number(raw.y),
      mapFractionX: null,
      mapFractionY: null,
      virtualTourScene: raw.virtualTourScene ? String(raw.virtualTourScene) : "",
      landmarkOnly: !!raw.landmarkOnly,
      markerStyle: raw.markerStyle === "main" ? "main" : "dot",
      linkedViews: raw.linkedViews !== false,
      showAerial: raw.showAerial !== false,
      era: String(raw.era || "-"),
      focus: String(raw.focus || "-"),
      prompt: String(raw.prompt || "-"),
      description: String(raw.description || "No description available."),
      translations: raw.translations && typeof raw.translations === "object" ? raw.translations : {},
      panorama: normalizePanoramaCoordinates(raw.panorama),
      media: Array.isArray(raw.media) ? raw.media : [],
      learnMore: raw.learnMore ? String(raw.learnMore) : "",
      learnMoreLabel: raw.learnMoreLabel ? String(raw.learnMoreLabel) : "",
      view360: raw.view360 ? String(raw.view360) : "",
      arModel: raw.arModel ? String(raw.arModel) : "",
      arModelLabel: raw.arModelLabel ? String(raw.arModelLabel) : "",
      audio: raw.audio ? String(raw.audio) : "",
      audioByLanguage: raw.audioByLanguage && typeof raw.audioByLanguage === "object" ? raw.audioByLanguage : {},
      videoEmbed: raw.videoEmbed ? String(raw.videoEmbed) : "",
      customLinks: Array.isArray(raw.customLinks) ? raw.customLinks : [],
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

  function getLocalizedTitle(stop) {
    if (!stop) {
      return "";
    }
    if (getCurrentLanguage() === "tl") {
      var translation = stop.translations && stop.translations.tl;
      if (translation && translation.title) return String(translation.title);
      if (stop.titleTl) return String(stop.titleTl);
      if (TAGALOG_TITLE_BY_STOP[stop.id]) return TAGALOG_TITLE_BY_STOP[stop.id];
    }
    return String(stop.title || stop.id || "Location");
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

  function updateCoordinateCaptureButton(message) {
    if (!elements.coordinateCaptureBtn || !elements.coordinateCaptureLabel) {
      return;
    }

    var inPanorama = is360ViewActive();
    var isTagalog = getCurrentLanguage() === "tl";
    elements.coordinateCaptureBtn.hidden = !inPanorama;
    elements.coordinateCaptureBtn.classList.toggle("is-active", inPanorama && state.coordinateCaptureEnabled);
    elements.coordinateCaptureBtn.setAttribute("aria-pressed", state.coordinateCaptureEnabled ? "true" : "false");
    elements.coordinateCaptureBtn.setAttribute(
      "aria-label",
      state.coordinateCaptureEnabled
        ? (isTagalog ? "I-click ang punto sa 360 upang kopyahin ang pitch at yaw" : "Click a point in the 360 view to copy its pitch and yaw")
        : (isTagalog ? "Kopyahin ang pitch at yaw ng panorama" : "Copy panorama pitch and yaw"),
    );
    elements.coordinateCaptureLabel.textContent = message || (state.coordinateCaptureEnabled
      ? (isTagalog ? "I-click ang 360°" : "Click the 360°")
      : (isTagalog ? "Kopyahin Pitch/Yaw" : "Copy Pitch/Yaw"));

    if (elements.panoramaRoot) {
      elements.panoramaRoot.classList.toggle("is-coordinate-capture", inPanorama && state.coordinateCaptureEnabled);
    }
  }

  function setCoordinateCaptureEnabled(enabled) {
    state.coordinateCaptureEnabled = !!enabled && is360ViewActive();
    state.coordinateCapturePointerStart = null;
    state.coordinateCapturePointerMoved = false;
    updateCoordinateCaptureButton();
  }

  function legacyCopyCoordinateText(text) {
    return new Promise(function (resolve, reject) {
      var textarea = document.createElement("textarea");
      textarea.value = text;
      textarea.setAttribute("readonly", "");
      textarea.style.position = "fixed";
      textarea.style.opacity = "0";
      document.body.appendChild(textarea);
      textarea.select();
      try {
        if (!document.execCommand("copy")) {
          throw new Error("Copy command was rejected.");
        }
        resolve();
      } catch (error) {
        reject(error);
      } finally {
        textarea.remove();
      }
    });
  }

  function copyCoordinateText(text) {
    if (navigator.clipboard && typeof navigator.clipboard.writeText === "function") {
      return navigator.clipboard.writeText(text).catch(function () {
        return legacyCopyCoordinateText(text);
      });
    }

    return legacyCopyCoordinateText(text);
  }

  function showCoordinateCaptureFeedback(message, succeeded) {
    window.clearTimeout(state.coordinateCaptureFeedbackTimer);
    updateCoordinateCaptureButton(succeeded
      ? (getCurrentLanguage() === "tl" ? "Nakopya!" : "Copied!")
      : (getCurrentLanguage() === "tl" ? "Hindi nakopya" : "Copy failed"));

    if (elements.coordinateCaptureToast) {
      elements.coordinateCaptureToast.textContent = message;
      elements.coordinateCaptureToast.classList.toggle("is-error", !succeeded);
      elements.coordinateCaptureToast.hidden = false;
    }

    state.coordinateCaptureFeedbackTimer = window.setTimeout(function () {
      updateCoordinateCaptureButton();
      if (elements.coordinateCaptureToast) {
        elements.coordinateCaptureToast.hidden = true;
      }
    }, 2400);
  }

  function capturePanoramaCoordinates(event) {
    if (!state.coordinateCaptureEnabled || !is360ViewActive() || state.coordinateCapturePointerMoved) {
      state.coordinateCapturePointerMoved = false;
      return;
    }
    if (!state.panoramaViewer || typeof state.panoramaViewer.mouseEventToCoords !== "function") {
      showCoordinateCaptureFeedback("The panorama coordinates are not available yet.", false);
      return;
    }
    if (event.target && typeof event.target.closest === "function" && event.target.closest(".tour-ground-hotspot")) {
      return;
    }

    var coordinates = state.panoramaViewer.mouseEventToCoords(event);
    var pitch = coordinates && Number(coordinates[0]);
    var yaw = coordinates && Number(coordinates[1]);
    if (!isFinite(pitch) || !isFinite(yaw)) {
      showCoordinateCaptureFeedback("Unable to read this panorama point.", false);
      return;
    }

    var coordinateText = "pitch: " + pitch.toFixed(2) + ", yaw: " + yaw.toFixed(2);
    copyCoordinateText(coordinateText).then(function () {
      showCoordinateCaptureFeedback("Copied: " + coordinateText, true);
    }).catch(function () {
      showCoordinateCaptureFeedback("Copy failed. " + coordinateText, false);
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

  function getHotspotMarkerHtml(spot) {
    var label = spot && spot.markerStyle === "main"
      ? '<span class="site-map-main-hotspot-label">' + escapeMarkerLabel(spot.title) + "</span>"
      : "";
    return '<span class="site-map-hotspot-dot" aria-hidden="true"></span>' + label;
  }

  function getPanoramaStops() {
    return state.hotspots.filter(function (spot) {
      return !!(spot && spot.panorama && isFinite(spot.panorama.pitch) && isFinite(spot.panorama.yaw));
    });
  }

  function cachePanoramaHotspotNodes() {
    if (!elements.panoramaRoot) {
      return;
    }

    var panoramaStops = getPanoramaStops();
    var hotspotNodes = elements.panoramaRoot.querySelectorAll(".tour-ground-hotspot");

    if (!hotspotNodes.length) {
      return;
    }

    state.panoramaHotspotNodesById = {};

    panoramaStops.forEach(function (stop, index) {
      var node = hotspotNodes[index] || null;
      if (!node) {
        return;
      }

      state.panoramaHotspotNodesById[stop.id] = node;
      node.dataset.stopMarker = stop.id;
      node.setAttribute("tabindex", "0");
      node.setAttribute("role", "button");
      node.setAttribute("aria-label", getLocalizedTitle(stop));
    });
  }

  function syncPanoramaHotspotVisibility() {
    if (!elements.panoramaRoot) {
      return;
    }

    cachePanoramaHotspotNodes();
    elements.panoramaRoot.classList.toggle("is-hotspots-hidden", !state.hotspotsVisible);

    Object.keys(state.panoramaHotspotNodesById).forEach(function (id) {
      var node = state.panoramaHotspotNodesById[id];
      if (!node) {
        return;
      }

      node.style.opacity = state.hotspotsVisible ? "" : "0";
      node.style.pointerEvents = state.hotspotsVisible ? "" : "none";
      node.style.visibility = state.hotspotsVisible ? "" : "hidden";
    });
  }

  function syncPanoramaHotspotStyles() {
    cachePanoramaHotspotNodes();

    Object.keys(state.panoramaHotspotNodesById).forEach(function (id) {
      var node = state.panoramaHotspotNodesById[id];
      if (!node) {
        return;
      }

      var isActive = state.hotspotsVisible && state.stopId === id;
      node.classList.toggle("is-active", isActive);
      if (isActive) {
        node.setAttribute("aria-current", "true");
      } else {
        node.removeAttribute("aria-current");
      }
    });
  }

  function renderPanoramaHotspots() {
    syncPanoramaHotspotVisibility();
    syncPanoramaHotspotStyles();
  }

  function buildPanoramaHotspotDefinition(stop) {
    if (!stop || !stop.panorama) {
      return null;
    }

    return {
      id: stop.id,
      pitch: stop.panorama.pitch,
      yaw: stop.panorama.yaw,
      type: "info",
      text: "",
      cssClass: "tour-ground-hotspot tour-ground-hotspot--pulse tour-ground-hotspot--compact tour-ground-hotspot--no-icon" + (stop.markerStyle === "main" ? " is-main" : ""),
      clickHandlerFunc: function (event, args) {
        if (event) {
          if (typeof event.preventDefault === "function") {
            event.preventDefault();
          }
          if (typeof event.stopPropagation === "function") {
            event.stopPropagation();
          }
        }
        setActiveStop(args.stopId, false);
      },
      clickHandlerArgs: {
        stopId: stop.id,
      },
    };
  }

  function applyHotspotCoordinateScale() {
    if (!state.imageSize) {
      return;
    }

    var coordinateSpace = state.sourceCoordinateSpace || state.imageSize;
    var referenceWidth = coordinateSpace.referenceWidth || state.imageSize.width;
    var referenceHeight = coordinateSpace.referenceHeight || state.imageSize.height;
    var scaleX = referenceWidth / coordinateSpace.width;
    var scaleY = referenceHeight / coordinateSpace.height;
    var cropOffsetX = Number(coordinateSpace.cropOffsetX) || 0;
    var cropOffsetY = Number(coordinateSpace.cropOffsetY) || 0;

    state.hotspots.forEach(function (spot) {
      if (spot.mapFractionX !== null && spot.mapFractionY !== null && isFinite(spot.mapFractionX) && isFinite(spot.mapFractionY)) {
        spot.x = spot.mapFractionX * state.imageSize.width;
        spot.y = (1 - spot.mapFractionY) * state.imageSize.height;
      } else {
        spot.x = spot.sourceX * scaleX - cropOffsetX;
        spot.y = spot.sourceY * scaleY - cropOffsetY;
      }
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

  function setLeafletVisibility(isVisible) {
    if (elements.mapRoot) {
      elements.mapRoot.hidden = false;
      elements.mapRoot.classList.toggle("is-active", !!isVisible);
      elements.mapRoot.setAttribute("aria-hidden", isVisible ? "false" : "true");
    }
  }

  function setPanoramaVisibility(isVisible) {
    if (elements.panoramaRoot) {
      elements.panoramaRoot.hidden = false;
      elements.panoramaRoot.classList.toggle("is-active", !!isVisible);
      elements.panoramaRoot.setAttribute("aria-hidden", isVisible ? "false" : "true");
    }
  }

  function showViewTransition(message) {
    if (!elements.viewTransition) {
      return;
    }
    window.clearTimeout(state.transitionTimer);
    if (elements.viewTransitionText) {
      elements.viewTransitionText.textContent = message || "Changing view...";
    }
    elements.viewTransition.hidden = false;
    window.requestAnimationFrame(function () {
      elements.viewTransition.classList.add("is-visible");
    });
  }

  function hideViewTransition(delay) {
    if (!elements.viewTransition) {
      return;
    }
    state.transitionTimer = window.setTimeout(function () {
      elements.viewTransition.classList.remove("is-visible");
      window.setTimeout(function () {
        if (!elements.viewTransition.classList.contains("is-visible")) {
          elements.viewTransition.hidden = true;
        }
      }, state.reduceMotion ? 0 : 260);
    }, Math.max(0, Number(delay) || 0));
  }

  function getSafeTextureLimit() {
    try {
      var canvas = document.createElement("canvas");
      var gl = canvas.getContext("webgl") || canvas.getContext("experimental-webgl");
      var maxTextureSize = gl ? gl.getParameter(gl.MAX_TEXTURE_SIZE) : 4096;
      return Math.max(2048, Math.min(maxTextureSize || 4096, 8192));
    } catch (_error) {
      return 4096;
    }
  }

  function loadRawImage(src) {
    return new Promise(function (resolve, reject) {
      var image = new Image();
      image.decoding = "async";
      image.onload = function () {
        resolve(image);
      };
      image.onerror = function () {
        reject(new Error("Unable to load panorama source."));
      };
      image.src = src;
    });
  }

  function buildSafePanoramaSource(src, maxTextureSize) {
    return loadRawImage(src).then(function (image) {
      var longestSide = Math.max(image.naturalWidth || image.width, image.naturalHeight || image.height);

      if (longestSide <= maxTextureSize) {
        return src;
      }

      var scale = maxTextureSize / longestSide;
      var targetWidth = Math.max(1, Math.round((image.naturalWidth || image.width) * scale));
      var targetHeight = Math.max(1, Math.round((image.naturalHeight || image.height) * scale));
      var canvas = document.createElement("canvas");
      var context = canvas.getContext("2d", { alpha: false });

      if (!context) {
        return src;
      }

      canvas.width = targetWidth;
      canvas.height = targetHeight;
      context.imageSmoothingEnabled = true;
      context.imageSmoothingQuality = "high";
      context.drawImage(image, 0, 0, targetWidth, targetHeight);

      return canvas.toDataURL("image/jpeg", 0.92);
    });
  }

  function createPanoramaViewer(panoramaSrc) {
    if (!elements.panoramaRoot || !window.pannellum) {
      return Promise.reject(new Error("Pannellum is unavailable."));
    }

    if (state.panoramaReadyPromise && state.panoramaOriginalUrl === panoramaSrc) {
      return state.panoramaReadyPromise;
    }

    var safeTextureLimit = getSafeTextureLimit();
    state.panoramaOriginalUrl = panoramaSrc;
    state.panoramaReadyPromise = buildSafePanoramaSource(panoramaSrc, safeTextureLimit).then(function (safePanoramaSrc) {
      state.panoramaOriginalUrl = panoramaSrc;
      state.panoramaSourceUrl = safePanoramaSrc;
      state.panoramaHotspotNodesById = {};
      elements.panoramaRoot.innerHTML = "";

      return new Promise(function (resolve, reject) {
        var settled = false;
        var timeoutId = window.setTimeout(function () {
          if (!settled) {
            settled = true;
            reject(new Error("The 360 aerial view took too long to load."));
          }
        }, 30000);

        state.panoramaViewer = window.pannellum.viewer("panoramaMap", {
          type: "equirectangular",
          panorama: safePanoramaSrc,
          hotSpots: getPanoramaStops()
            .map(buildPanoramaHotspotDefinition)
            .filter(function (item) {
              return item;
            }),
          autoLoad: true,
          showControls: false,
          compass: false,
          autoRotate: 0,
          pitch: state.panoramaInitialPitch,
          yaw: state.panoramaInitialYaw,
          hfov: state.panoramaInitialHfov,
          minHfov: 50,
          maxHfov: 140,
          mouseZoom: true,
          draggable: true,
          disableKeyboardCtrl: false,
          showZoomCtrl: false,
          showFullscreenCtrl: false,
          loadingText: "Preparing the 360 aerial view...",
        });

        if (!state.panoramaViewer || typeof state.panoramaViewer.on !== "function") {
          window.clearTimeout(timeoutId);
          reject(new Error("The 360 aerial viewer could not start."));
          return;
        }

        state.panoramaViewer.on("load", function () {
          if (settled) {
            return;
          }
          settled = true;
          window.clearTimeout(timeoutId);
          state.panoramaFailed = false;
          renderPanoramaHotspots();
          resolve(state.panoramaViewer);
        });

        state.panoramaViewer.on("error", function (message) {
          if (settled) {
            return;
          }
          settled = true;
          window.clearTimeout(timeoutId);
          reject(new Error(String(message || "Unable to load the 360 aerial view.")));
        });
      });
    }).catch(function (error) {
      state.panoramaFailed = true;
      state.panoramaReadyPromise = null;
      throw error;
    });

    return state.panoramaReadyPromise;
  }

  function focusPanoramaOnStop(stop) {
    if (!state.panoramaViewer || !stop || !stop.panorama) {
      return;
    }

    var pitch = Number(stop.panorama.pitch);
    var yaw = Number(stop.panorama.yaw);

    if (!isFinite(pitch) || !isFinite(yaw)) {
      return;
    }

    if (typeof state.panoramaViewer.lookAt === "function") {
      state.panoramaViewer.lookAt(pitch, yaw, 110, 0);
      return;
    }

    if (typeof state.panoramaViewer.setPitch === "function") {
      state.panoramaViewer.setPitch(pitch);
    }

    if (typeof state.panoramaViewer.setYaw === "function") {
      state.panoramaViewer.setYaw(yaw);
    }

    if (typeof state.panoramaViewer.setHfov === "function") {
      state.panoramaViewer.setHfov(110);
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
    if (state.viewSwitching || nextMode === state.activeViewMode) {
      return Promise.resolve();
    }

    state.viewSwitching = true;
    var changingCopy = getCurrentLanguage() === "tl"
      ? (nextMode === "360" ? "Binubuksan ang 360° tanawin..." : "Binubuksan ang aerial map...")
      : (nextMode === "360" ? "Opening the 360° view..." : "Opening the aerial map...");
    showViewTransition(changingCopy);

    var ready = nextMode === "360"
      ? createPanoramaViewer(state.alternateImageUrl)
      : Promise.resolve(state.map);

    return ready.then(function () {
      state.activeViewMode = nextMode;
      setLeafletVisibility(nextMode === "default");
      setPanoramaVisibility(nextMode === "360");

      if (nextMode === "360") {
        if (state.panoramaViewer && typeof state.panoramaViewer.resize === "function") {
          state.panoramaViewer.resize();
        }
        focusPanoramaOnStop(state.hotspotsById[state.stopId] || getPanoramaStops()[0] || null);
      } else if (state.map) {
        state.map.invalidateSize(false);
        if (state.stopId && state.hotspotsById[state.stopId]) {
          var stop = state.hotspotsById[state.stopId];
          state.map.flyTo([stop.y, stop.x], Math.max(0, state.map.getZoom()), {
            animate: !state.reduceMotion,
            duration: state.reduceMotion ? 0 : 0.55,
          });
        } else {
          resetMapView();
        }
      }

      updateViewModeButton();
      updateHotspotToggleButton();
      renderAll();
      hideViewTransition(state.reduceMotion ? 0 : 460);
    }).catch(function (error) {
      if (window.console && window.console.error) {
        window.console.error("Site map view transition failed", error);
      }
      state.activeViewMode = "default";
      setPanoramaVisibility(false);
      setLeafletVisibility(true);
      updateViewModeButton();
      if (elements.viewTransitionText) {
        elements.viewTransitionText.textContent = getCurrentLanguage() === "tl"
          ? "Hindi mabuksan ang 360° tanawin. Subukan muli."
          : "The 360° view could not open. Please try again.";
      }
      hideViewTransition(1800);
    }).finally(function () {
      state.viewSwitching = false;
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
        renderVirtualTourLandmarks();
        resetMapView();

        state.map.on("resize", function () {
          applyMapBoundsConstraints();
          refreshAerialMarkerVisibility();
        });
        ["moveend", "zoomend", "viewreset"].forEach(function (eventName) {
          state.map.on(eventName, refreshAerialMarkerVisibility);
        });
      })
      .catch(function (error) {
        if (window.console && window.console.error) {
          window.console.error("Site map initialization failed", error);
        }
        elements.mapRoot.innerHTML =
          '<div class="map-empty-state">Unable to initialize map image. Try <strong>Ctrl+F5</strong> to hard refresh, then open <code>/static/images/site-map/aerial-map.jpg</code> directly to confirm it loads.</div>';
      });
  }

  function escapeMarkerLabel(value) {
    return String(value || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function renderVirtualTourLandmarks() {
    if (!state.map || !state.imageSize || !state.virtualTourLandmarks.length) {
      return;
    }

    state.virtualTourLandmarkMarkers.forEach(function (marker) {
      if (state.map.hasLayer(marker)) {
        state.map.removeLayer(marker);
      }
    });
    state.virtualTourLandmarkMarkers = [];

    state.virtualTourLandmarks.forEach(function (landmark) {
      var x = landmark.x * state.imageSize.width;
      var y = (1 - landmark.y) * state.imageSize.height;
      var landmarkName = String(landmark.label || "").toLowerCase();
      var stopId = landmarkName === "museum"
        ? "museum-landmark"
        : (landmarkName === "chapel" ? "church" : "");
      var stop = stopId ? state.hotspotsById[stopId] || null : null;
      var marker = window.L.marker([y, x], {
        interactive: !!stop,
        keyboard: !!stop,
        opacity: 1,
        riseOnHover: true,
        riseOffset: 1000,
        zIndexOffset: 800,
        icon: window.L.divIcon({
          className: "site-map-landmark-marker" + (stop ? " is-clickable" : ""),
          html: '<span class="site-map-landmark-pin" aria-hidden="true"></span>'
            + '<span class="site-map-landmark-label">' + escapeMarkerLabel(landmark.label) + "</span>",
          iconSize: [18, 18],
          iconAnchor: [9, 9],
        }),
      });

      marker.siteMapStopId = stopId;
      if (stop) {
        marker.on("click", function (event) {
          if (event && event.originalEvent && window.L && window.L.DomEvent) {
            window.L.DomEvent.stopPropagation(event.originalEvent);
          }
          setActiveStop(stopId, true);
        });
        marker.on("add", function () {
          var node = marker.getElement();
          if (!node) {
            return;
          }
          node.setAttribute("tabindex", "0");
          node.setAttribute("role", "button");
          node.setAttribute("aria-label", "View " + getLocalizedTitle(stop) + " information");
          node.dataset.stopMarker = stopId;
        });
      }

      marker.addTo(state.map);
      state.virtualTourLandmarkMarkers.push(marker);
    });
  }

  function ensureMarker(spot) {
    if (state.markerById[spot.id]) {
      return state.markerById[spot.id];
    }

    var marker = window.L.marker([spot.y, spot.x], {
      keyboard: false,
      opacity: 1,
      riseOnHover: true,
      riseOffset: 1000,
      zIndexOffset: 800,
      icon: window.L.divIcon({
        className: "site-map-hotspot-marker" + (spot.markerStyle === "main" ? " is-main" : ""),
        html: getHotspotMarkerHtml(spot),
        iconSize: [44, 44],
        iconAnchor: [22, 22],
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
      if (!node) {
        return;
      }

      node.setAttribute("tabindex", "0");
      node.setAttribute("role", "button");
      node.setAttribute("aria-label", getLocalizedTitle(spot));
      node.dataset.stopMarker = spot.id;
      if (node.dataset.siteMapKeyboardBound === "true") {
        return;
      }
      node.addEventListener("keydown", function (event) {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          setActiveStop(spot.id, true);
        }
      });

      node.dataset.siteMapKeyboardBound = "true";
    });

    state.markerById[spot.id] = marker;
    return marker;
  }

  function refreshAerialMarkerVisibility() {
    if (!state.map || !state.hotspotsVisible) {
      return;
    }

    window.cancelAnimationFrame(state.markerRefreshRafId);
    state.markerRefreshRafId = window.requestAnimationFrame(function () {
      Object.keys(state.markerById).forEach(function (id) {
        var marker = state.markerById[id];
        if (!marker || !state.map.hasLayer(marker)) {
          return;
        }
        marker.setOpacity(1);
        if (typeof marker.update === "function") {
          marker.update();
        }
        var node = marker.getElement();
        if (node) {
          node.style.opacity = "1";
          node.style.visibility = "visible";
        }
      });

      state.virtualTourLandmarkMarkers.forEach(function (marker) {
        if (!marker || !state.map.hasLayer(marker)) {
          return;
        }
        marker.setOpacity(1);
        if (typeof marker.update === "function") {
          marker.update();
        }
        var node = marker.getElement();
        if (node) {
          node.style.opacity = "1";
          node.style.visibility = "visible";
        }
      });
    });
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
    if (!state.hotspotsVisible) {
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
      if (typeof marker.setOpacity === "function") {
        marker.setOpacity(1);
      }
      var node = marker.getElement();
      if (!node) {
        return;
      }

      node.classList.remove("is-active");
      node.classList.remove("is-hover");
      node.removeAttribute("aria-current");
    });

    state.virtualTourLandmarkMarkers.forEach(function (marker) {
      if (typeof marker.setOpacity === "function") {
        marker.setOpacity(1);
      }
      var node = marker.getElement();
      if (!node) {
        return;
      }
      node.classList.remove("is-active");
      node.removeAttribute("aria-current");
    });
  }

  function syncVirtualTourLandmarkAvailability() {
    state.virtualTourLandmarkMarkers.forEach(function (marker) {
      var node = marker.getElement();
      var stop = marker.siteMapStopId ? state.hotspotsById[marker.siteMapStopId] || null : null;
      if (!node || !stop) {
        return;
      }

      node.classList.toggle("is-clickable", state.hotspotsVisible);
      node.setAttribute("tabindex", state.hotspotsVisible ? "0" : "-1");
      node.setAttribute("aria-disabled", state.hotspotsVisible ? "false" : "true");
      node.setAttribute("aria-label", "View " + getLocalizedTitle(stop) + " information");
    });
  }

  function renderMarkers(visibleStops) {
    if (!state.map) {
      return;
    }

    if (!state.hotspotsVisible) {
      state.hotspots.forEach(function (spot) {
        if (spot.landmarkOnly) {
          return;
        }
        var hiddenMarker = ensureMarker(spot);
        if (state.map.hasLayer(hiddenMarker)) {
          state.map.removeLayer(hiddenMarker);
        }
      });
      syncVirtualTourLandmarkAvailability();
      clearMarkerStyles();
      hideMapInfoOverlay();
      return;
    }

    var visibleLookup = {};
    visibleStops.forEach(function (spot) {
      visibleLookup[spot.id] = true;
    });

    state.hotspots.forEach(function (spot) {
      if (spot.landmarkOnly || !spot.showAerial) {
        var oldMarker = state.markerById[spot.id];
        if (oldMarker && state.map.hasLayer(oldMarker)) {
          state.map.removeLayer(oldMarker);
        }
        return;
      }
      var marker = ensureMarker(spot);
      marker.setLatLng([spot.y, spot.x]);
      marker.setOpacity(1);
      var markerNode = marker.getElement();
      if (markerNode) {
        markerNode.setAttribute("aria-label", getLocalizedTitle(spot));
        var mainLabel = markerNode.querySelector(".site-map-main-hotspot-label");
        if (mainLabel) mainLabel.textContent = getLocalizedTitle(spot);
      }
      var shouldShow = !!visibleLookup[spot.id];
      var isOnMap = state.map.hasLayer(marker);

      if (shouldShow && !isOnMap) {
        marker.addTo(state.map);
      } else if (!shouldShow && isOnMap) {
        state.map.removeLayer(marker);
      }
    });

    syncVirtualTourLandmarkAvailability();
    clearMarkerStyles();

    var active = state.markerById[state.stopId];
    if (active && state.map.hasLayer(active)) {
      var activeNode = active.getElement();
      if (activeNode) {
        activeNode.classList.add("is-active");
        activeNode.setAttribute("aria-current", "true");
      }
    }

    state.virtualTourLandmarkMarkers.forEach(function (landmarkMarker) {
      if (landmarkMarker.siteMapStopId !== state.stopId) {
        return;
      }
      var landmarkNode = landmarkMarker.getElement();
      if (landmarkNode) {
        landmarkNode.classList.add("is-active");
        landmarkNode.setAttribute("aria-current", "true");
      }
    });

    refreshAerialMarkerVisibility();
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
    elements.stopLinks.hidden = true;

    if (!stop) {
      return;
    }

    if (stop.panorama && stop.linkedViews !== false) {
      var locateButton = document.createElement("button");
      locateButton.type = "button";
      locateButton.className = "stop-link stop-link--primary";
      locateButton.textContent = is360ViewActive()
        ? (getCurrentLanguage() === "tl" ? "Ipakita sa Aerial Map" : "Show on Aerial Map")
        : (getCurrentLanguage() === "tl" ? "Hanapin sa 360°" : "Locate in 360°");
      locateButton.addEventListener("click", function () {
        setViewMode(is360ViewActive() ? "default" : "360");
      });
      elements.stopLinks.appendChild(locateButton);
    }

    var virtualTourScene = stop.virtualTourScene || (state.databaseConfigActive ? "" : (VIRTUAL_TOUR_SCENE_BY_STOP[stop.id] || ""));
    var links = [
      {
        href: virtualTourScene ? "/virtual-tour?scene=" + encodeURIComponent(virtualTourScene) : "",
        text: getCurrentLanguage() === "tl" ? "Buksan ang Virtual Tour" : "Open Virtual Tour",
      },
      { href: stop.learnMore, text: stop.learnMoreLabel || (getCurrentLanguage() === "tl" ? "Alamin Pa" : "Learn More") },
      { href: stop.view360, text: "360 View" },
      { href: stop.arModel, text: stop.arModelLabel || "AR / 3D" },
      { href: stop.audio, text: getCurrentLanguage() === "tl" ? "Audio" : "Audio" },
    ];

    (stop.customLinks || []).forEach(function (customLink) {
      links.push({
        href: String(customLink.href || ""),
        text: getCurrentLanguage() === "tl"
          ? String(customLink.labelTl || customLink.labelEn || "Alamin Pa")
          : String(customLink.labelEn || "Learn More"),
      });
    });

    links.forEach(function (linkMeta) {
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

    elements.stopLinks.hidden = !elements.stopLinks.childElementCount;
  }

  function renderInfoMeta(stop) {
    var isTagalog = getCurrentLanguage() === "tl";

    if (elements.mapInfoMeta) {
      var category = stop ? String(stop.category || "Heritage Site") : "";
      var localizedCategory = isTagalog ? (TAGALOG_CATEGORY[category] || category) : category;
      var viewLabel = is360ViewActive()
        ? (isTagalog ? "360° Tanawin" : "360° Aerial View")
        : (isTagalog ? "Aerial Map" : "Aerial Map");
      elements.mapInfoMeta.hidden = !stop;
      elements.mapInfoMeta.textContent = stop ? localizedCategory + " · " + viewLabel : "";
    }
  }

  function hideMapInfoConnector() {
    if (state.infoConnectorRafId) {
      window.cancelAnimationFrame(state.infoConnectorRafId);
      state.infoConnectorRafId = 0;
    }
    state.infoConnectorStopId = "";
    if (elements.mapInfoConnector) {
      elements.mapInfoConnector.classList.remove("is-visible");
    }
    if (elements.mapInfoConnectorPath) {
      elements.mapInfoConnectorPath.classList.remove("is-drawing");
      elements.mapInfoConnectorPath.removeAttribute("d");
    }
    if (elements.mapInfoConnectorShadow) {
      elements.mapInfoConnectorShadow.removeAttribute("d");
    }
  }

  function getInfoHotspotPoint(stop, overlayRect) {
    if (!stop || !overlayRect) {
      return null;
    }

    if (is360ViewActive()) {
      cachePanoramaHotspotNodes();
      var panoramaNode = state.panoramaHotspotNodesById[stop.id];
      if (!panoramaNode) {
        return null;
      }
      var panoramaRect = panoramaNode.getBoundingClientRect();
      return {
        x: panoramaRect.left + panoramaRect.width * 0.5 - overlayRect.left,
        y: panoramaRect.top + panoramaRect.height * 0.5 - overlayRect.top,
      };
    }

    if (!state.map || !elements.mapRoot) {
      return null;
    }
    var markerPoint = state.map.latLngToContainerPoint([stop.y, stop.x]);
    var mapRect = elements.mapRoot.getBoundingClientRect();
    return {
      x: mapRect.left + markerPoint.x - overlayRect.left,
      y: mapRect.top + markerPoint.y - overlayRect.top,
    };
  }

  function getNearestCardEdgePoint(point, cardRect, overlayRect) {
    var left = cardRect.left - overlayRect.left;
    var right = cardRect.right - overlayRect.left;
    var top = cardRect.top - overlayRect.top;
    var bottom = cardRect.bottom - overlayRect.top;
    var candidates = [
      { x: Math.max(left + 18, Math.min(point.x, right - 18)), y: top },
      { x: Math.max(left + 18, Math.min(point.x, right - 18)), y: bottom },
      { x: left, y: Math.max(top + 18, Math.min(point.y, bottom - 18)) },
      { x: right, y: Math.max(top + 18, Math.min(point.y, bottom - 18)) },
    ];

    candidates.sort(function (a, b) {
      var distanceA = Math.pow(a.x - point.x, 2) + Math.pow(a.y - point.y, 2);
      var distanceB = Math.pow(b.x - point.x, 2) + Math.pow(b.y - point.y, 2);
      return distanceA - distanceB;
    });
    return candidates[0];
  }

  function updateMapInfoConnector(stop) {
    if (
      !stop
      || !elements.mapInfoOverlay
      || elements.mapInfoOverlay.hidden
      || !elements.mapInfoCard
      || !elements.mapInfoConnector
      || !elements.mapInfoConnectorPath
      || !elements.mapInfoConnectorShadow
    ) {
      hideMapInfoConnector();
      return;
    }

    var overlayRect = elements.mapInfoOverlay.getBoundingClientRect();
    var cardRect = elements.mapInfoCard.getBoundingClientRect();
    var start = getInfoHotspotPoint(stop, overlayRect);
    if (!start || !overlayRect.width || !overlayRect.height || !cardRect.width || !cardRect.height) {
      elements.mapInfoConnector.classList.remove("is-visible");
      return;
    }

    var end = getNearestCardEdgePoint(start, cardRect, overlayRect);
    var dx = end.x - start.x;
    var dy = end.y - start.y;
    var distance = Math.max(1, Math.sqrt(dx * dx + dy * dy));
    var curve = Math.min(28, Math.max(8, distance * 0.08));
    var curveDirection = start.x <= end.x ? 1 : -1;
    var controlX = (start.x + end.x) * 0.5 + (-dy / distance) * curve * curveDirection;
    var controlY = (start.y + end.y) * 0.5 + (dx / distance) * curve * curveDirection;
    var pathData = "M " + start.x.toFixed(2) + " " + start.y.toFixed(2)
      + " Q " + controlX.toFixed(2) + " " + controlY.toFixed(2)
      + " " + end.x.toFixed(2) + " " + end.y.toFixed(2);
    var isNewConnection = state.infoConnectorStopId !== stop.id;

    elements.mapInfoConnector.setAttribute("viewBox", "0 0 " + overlayRect.width + " " + overlayRect.height);
    elements.mapInfoConnectorPath.setAttribute("d", pathData);
    elements.mapInfoConnectorShadow.setAttribute("d", pathData);
    if (elements.mapInfoConnectorOrigin) {
      elements.mapInfoConnectorOrigin.setAttribute("cx", start.x.toFixed(2));
      elements.mapInfoConnectorOrigin.setAttribute("cy", start.y.toFixed(2));
    }
    if (elements.mapInfoConnectorEnd) {
      elements.mapInfoConnectorEnd.setAttribute("cx", end.x.toFixed(2));
      elements.mapInfoConnectorEnd.setAttribute("cy", end.y.toFixed(2));
    }

    elements.mapInfoConnector.classList.add("is-visible");
    if (isNewConnection && !state.reduceMotion) {
      var pathLength = Math.max(1, elements.mapInfoConnectorPath.getTotalLength());
      elements.mapInfoConnectorPath.style.setProperty("--map-connector-length", pathLength);
      elements.mapInfoConnectorPath.classList.remove("is-drawing");
      void elements.mapInfoConnectorPath.getBoundingClientRect();
      elements.mapInfoConnectorPath.classList.add("is-drawing");
    }
    state.infoConnectorStopId = stop.id;

    if (is360ViewActive() && state.infoStopId === stop.id) {
      state.infoConnectorRafId = window.requestAnimationFrame(function () {
        state.infoConnectorRafId = 0;
        updateMapInfoConnector(stop);
      });
    }
  }

  function scheduleMapInfoConnector(stop) {
    if (state.infoConnectorRafId) {
      window.cancelAnimationFrame(state.infoConnectorRafId);
    }
    state.infoConnectorRafId = window.requestAnimationFrame(function () {
      state.infoConnectorRafId = 0;
      updateMapInfoConnector(stop);
    });
  }

  function hideMapInfoOverlay() {
    if (elements.mapInfoOverlay) {
      elements.mapInfoOverlay.hidden = true;
    }

    stopHotspotAudio();
    hideMapInfoConnector();
    state.infoStopId = "";
  }

  function clearActiveSelection() {
    state.stopId = "";
    hideMapInfoOverlay();
    resetInfoCardDrag();
    clearMarkerStyles();
  }

  function updateHotspotToggleButton() {
    if (!elements.toggleHotspotsBtn) {
      return;
    }

    var enabled = state.hotspotsVisible;
    elements.toggleHotspotsBtn.classList.toggle("is-active", enabled);
    elements.toggleHotspotsBtn.classList.remove("is-disabled");
    elements.toggleHotspotsBtn.setAttribute("aria-pressed", enabled ? "true" : "false");
    elements.toggleHotspotsBtn.setAttribute("aria-disabled", "false");
  }

  function updateLanguageButton() {
    if (!elements.languageBtn || !elements.languageLabel) {
      return;
    }

    var isTagalog = getCurrentLanguage() === "tl";
    elements.languageBtn.dataset.language = isTagalog ? "tl" : "en";
    elements.languageLabel.textContent = isTagalog ? "Tagalog" : "English";
    elements.languageBtn.classList.remove("is-active");
    elements.languageBtn.setAttribute("aria-pressed", isTagalog ? "true" : "false");
    elements.languageBtn.setAttribute(
      "aria-label",
      isTagalog ? "Switch site map language to English" : "Palitan ang wika ng site map sa Tagalog",
    );
    if (elements.resetLabel) {
      elements.resetLabel.textContent = isTagalog ? "I-reset" : "Reset";
    }
    if (elements.hotspotsLabel) {
      elements.hotspotsLabel.textContent = isTagalog ? "Mga Lugar" : "Hotspots";
    }
    if (elements.backLabel) {
      elements.backLabel.textContent = isTagalog ? "Bumalik" : "Back";
    }
    updateViewModeButton();
  }

  function updateViewModeButton() {
    if (!elements.viewModeBtn || !elements.viewModeLabel) {
      return;
    }
    var inPanorama = is360ViewActive();
    var isTagalog = getCurrentLanguage() === "tl";
    elements.viewModeBtn.classList.toggle("is-active", inPanorama);
    elements.viewModeBtn.setAttribute("aria-pressed", inPanorama ? "true" : "false");
    elements.viewModeBtn.setAttribute(
      "aria-label",
      inPanorama
        ? (isTagalog ? "Bumalik sa aerial map" : "Return to the aerial map")
        : (isTagalog ? "Lumipat sa 360° aerial view" : "Switch to the 360° aerial view"),
    );
    elements.viewModeLabel.textContent = inPanorama
      ? (isTagalog ? "Aerial Map" : "Aerial Map")
      : (isTagalog ? "360° Tanawin" : "360° View");

    if (!inPanorama) {
      state.coordinateCaptureEnabled = false;
    }
    updateCoordinateCaptureButton();
  }

  function resetCurrentView() {
    var activeStop = state.stopId ? state.hotspotsById[state.stopId] || null : null;
    if (is360ViewActive()) {
      if (activeStop && activeStop.panorama) {
        focusPanoramaOnStop(activeStop);
      } else if (state.panoramaViewer && typeof state.panoramaViewer.lookAt === "function") {
        state.panoramaViewer.lookAt(0, 0, 110, state.reduceMotion ? 0 : 500);
      }
      return;
    }
    resetMapView();
    clearActiveSelection();
  }

  function resetInfoCardDrag() {
    state.infoCardDragged = false;
    state.infoCardPosition = null;
    state.infoCardDrag = null;

    if (!elements.mapInfoCard) {
      return;
    }

    elements.mapInfoCard.classList.remove("is-dragged", "is-dragging");
    ["right", "bottom", "left", "top", "transform"].forEach(function (property) {
      elements.mapInfoCard.style.removeProperty(property);
    });
    if (elements.mapInfoDragHandle) {
      elements.mapInfoDragHandle.setAttribute("aria-grabbed", "false");
    }
  }

  function applyDraggedInfoCardPosition(stop) {
    if (!elements.mapInfoOverlay || !elements.mapInfoCard || !state.infoCardPosition) {
      return;
    }

    var overlayWidth = elements.mapInfoOverlay.clientWidth || window.innerWidth || 0;
    var overlayHeight = elements.mapInfoOverlay.clientHeight || window.innerHeight || 0;
    var cardWidth = elements.mapInfoCard.offsetWidth || 320;
    var cardHeight = elements.mapInfoCard.offsetHeight || 180;
    var padding = 8;
    var dockClearance = window.innerWidth <= 640 ? 72 : 10;
    var maxLeft = Math.max(padding, overlayWidth - cardWidth - padding);
    var maxTop = Math.max(padding, overlayHeight - cardHeight - dockClearance);
    var left = Math.max(padding, Math.min(state.infoCardPosition.left, maxLeft));
    var top = Math.max(padding, Math.min(state.infoCardPosition.top, maxTop));

    state.infoCardPosition = { left: left, top: top };
    elements.mapInfoCard.classList.add("is-dragged");
    elements.mapInfoCard.style.setProperty("left", left + "px", "important");
    elements.mapInfoCard.style.setProperty("top", top + "px", "important");
    elements.mapInfoCard.style.setProperty("right", "auto", "important");
    elements.mapInfoCard.style.setProperty("bottom", "auto", "important");
    elements.mapInfoCard.style.setProperty("transform", "none", "important");
    elements.mapInfoCard.dataset.placement = "dragged";

    if (stop) {
      scheduleMapInfoConnector(stop);
    }
  }

  function startInfoCardDrag(event) {
    if (!elements.mapInfoCard || !elements.mapInfoOverlay || elements.mapInfoOverlay.hidden) {
      return;
    }
    if (typeof event.button === "number" && event.button !== 0) {
      return;
    }

    var overlayRect = elements.mapInfoOverlay.getBoundingClientRect();
    var cardRect = elements.mapInfoCard.getBoundingClientRect();
    state.infoCardDrag = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      left: cardRect.left - overlayRect.left,
      top: cardRect.top - overlayRect.top,
    };
    state.infoCardPosition = {
      left: state.infoCardDrag.left,
      top: state.infoCardDrag.top,
    };
    elements.mapInfoCard.classList.add("is-dragging");
    if (elements.mapInfoDragHandle) {
      elements.mapInfoDragHandle.setAttribute("aria-grabbed", "true");
      if (typeof elements.mapInfoDragHandle.setPointerCapture === "function") {
        elements.mapInfoDragHandle.setPointerCapture(event.pointerId);
      }
    }
    event.preventDefault();
    event.stopPropagation();
  }

  function moveInfoCardDrag(event) {
    if (!state.infoCardDrag || event.pointerId !== state.infoCardDrag.pointerId) {
      return;
    }

    state.infoCardDragged = true;
    state.infoCardPosition = {
      left: state.infoCardDrag.left + event.clientX - state.infoCardDrag.startX,
      top: state.infoCardDrag.top + event.clientY - state.infoCardDrag.startY,
    };
    applyDraggedInfoCardPosition(state.infoStopId ? state.hotspotsById[state.infoStopId] || null : null);
    event.preventDefault();
    event.stopPropagation();
  }

  function endInfoCardDrag(event) {
    if (!state.infoCardDrag || event.pointerId !== state.infoCardDrag.pointerId) {
      return;
    }

    state.infoCardDrag = null;
    if (elements.mapInfoCard) {
      elements.mapInfoCard.classList.remove("is-dragging");
    }
    if (elements.mapInfoDragHandle) {
      elements.mapInfoDragHandle.setAttribute("aria-grabbed", "false");
    }
    event.preventDefault();
    event.stopPropagation();
  }

  function positionMapInfoOverlay(stop) {
    if (!stop || !elements.mapInfoOverlay || !elements.mapInfoCard) {
      return;
    }

    if (state.infoCardDragged && state.infoCardPosition) {
      elements.mapInfoOverlay.hidden = false;
      applyDraggedInfoCardPosition(stop);
      return;
    }

    if (is360ViewActive()) {
      var panoramaWidth = elements.panoramaRoot ? elements.panoramaRoot.clientWidth || 0 : 0;
      var panoramaHeight = elements.panoramaRoot ? elements.panoramaRoot.clientHeight || 0 : 0;

      if (!panoramaWidth || !panoramaHeight) {
        hideMapInfoOverlay();
        return;
      }

      elements.mapInfoOverlay.hidden = false;
      elements.mapInfoCard.style.left = "50%";
      elements.mapInfoCard.style.top = "12px";
      elements.mapInfoCard.style.transform = "translateX(-50%)";
      elements.mapInfoCard.dataset.placement = "top";
      scheduleMapInfoConnector(stop);

      return;
    }

    if (!state.map) {
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
    var gap = 68;
    var padding = 14;
    var maxLeft = Math.max(padding, mapWidth - cardWidth - padding);
    var bottomClearance = mapWidth <= 640 ? 80 : 92;
    var maxTop = Math.max(padding, mapHeight - cardHeight - bottomClearance);
    var cardLeft = markerPoint.x - cardWidth * 0.5;
    var cardTop = markerPoint.y - cardHeight * 0.5;
    var placement = "bottom";

    if (mapWidth <= 640) {
      elements.mapInfoCard.style.left = "50%";
      elements.mapInfoCard.style.top = "auto";
      elements.mapInfoCard.style.transform = "translateX(-50%)";
      elements.mapInfoCard.dataset.placement = "bottom";
      scheduleMapInfoConnector(stop);
      return;
    }

    var canPlaceRight = markerPoint.x + gap + cardWidth <= mapWidth - padding;
    var canPlaceLeft = markerPoint.x - gap - cardWidth >= padding;
    var preferRight = markerPoint.x <= mapWidth * 0.5;

    if ((preferRight && canPlaceRight) || !canPlaceLeft) {
      cardLeft = markerPoint.x + gap;
      placement = "right";
    } else {
      cardLeft = markerPoint.x - gap - cardWidth;
      placement = "left";
    }

    if (!canPlaceRight && !canPlaceLeft) {
      cardLeft = markerPoint.x - cardWidth * 0.5;
      if (markerPoint.y + gap + cardHeight <= mapHeight - bottomClearance) {
        cardTop = markerPoint.y + gap;
        placement = "bottom";
      } else {
        cardTop = markerPoint.y - gap - cardHeight;
        placement = "top";
      }
    }

    cardLeft = Math.max(padding, Math.min(cardLeft, maxLeft));
    cardTop = Math.max(padding, Math.min(cardTop, maxTop));

    elements.mapInfoCard.style.left = cardLeft + "px";
    elements.mapInfoCard.style.top = cardTop + "px";
    elements.mapInfoCard.style.transform = "";
    elements.mapInfoCard.dataset.placement = placement;
    scheduleMapInfoConnector(stop);
  }

  function renderMapInfo(stop) {
    if (!elements.mapInfoOverlay || !elements.mapInfoTitle || !elements.mapInfoSummary || !elements.mapInfoMeta) {
      return;
    }

    if (!stop || !state.hotspotsVisible || !state.infoStopId || state.infoStopId !== stop.id) {
      hideMapInfoOverlay();
      return;
    }

    var previousStopId = elements.mapInfoCard ? elements.mapInfoCard.dataset.stopId || "" : "";
    elements.mapInfoTitle.textContent = getLocalizedTitle(stop);
    renderMedia(stop);
    elements.mapInfoSummary.textContent = getLocalizedDescription(stop);
    renderLinks(stop);
    renderInfoMeta(stop);
    playHotspotAudio(stop);

    if (elements.mapInfoCard && previousStopId !== stop.id) {
      elements.mapInfoCard.dataset.stopId = stop.id;
      elements.mapInfoCard.classList.remove("is-entering");
      void elements.mapInfoCard.offsetWidth;
      elements.mapInfoCard.classList.add("is-entering");
    }

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
    renderPanoramaHotspots();
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

    if (state.infoStopId !== target.id) {
      resetInfoCardDrag();
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
    if (elements.viewModeBtn) {
      elements.viewModeBtn.addEventListener("click", function () {
        setViewMode(is360ViewActive() ? "default" : "360");
      });
    }

    if (elements.resetViewBtn) {
      elements.resetViewBtn.addEventListener("click", function () {
        resetCurrentView();
      });
    }

    if (elements.coordinateCaptureBtn) {
      elements.coordinateCaptureBtn.addEventListener("click", function () {
        setCoordinateCaptureEnabled(!state.coordinateCaptureEnabled);
      });
    }

    if (elements.panoramaRoot) {
      elements.panoramaRoot.addEventListener("pointerdown", function (event) {
        if (!state.coordinateCaptureEnabled) {
          return;
        }
        state.coordinateCapturePointerStart = { x: event.clientX, y: event.clientY };
        state.coordinateCapturePointerMoved = false;
      }, true);
      elements.panoramaRoot.addEventListener("pointermove", function (event) {
        var start = state.coordinateCapturePointerStart;
        if (!state.coordinateCaptureEnabled || !start) {
          return;
        }
        if (Math.hypot(event.clientX - start.x, event.clientY - start.y) > 7) {
          state.coordinateCapturePointerMoved = true;
        }
      }, true);
      elements.panoramaRoot.addEventListener("pointerup", function () {
        state.coordinateCapturePointerStart = null;
      }, true);
      elements.panoramaRoot.addEventListener("pointercancel", function () {
        state.coordinateCapturePointerStart = null;
        state.coordinateCapturePointerMoved = false;
      }, true);
      elements.panoramaRoot.addEventListener("click", capturePanoramaCoordinates);
    }

    if (elements.mapInfoClose) {
      elements.mapInfoClose.addEventListener("click", function () {
        clearActiveSelection();
      });
    }

    if (elements.mapInfoDragHandle) {
      elements.mapInfoDragHandle.setAttribute("aria-grabbed", "false");
      elements.mapInfoDragHandle.addEventListener("pointerdown", startInfoCardDrag);
      elements.mapInfoDragHandle.addEventListener("pointermove", moveInfoCardDrag);
      elements.mapInfoDragHandle.addEventListener("pointerup", endInfoCardDrag);
      elements.mapInfoDragHandle.addEventListener("pointercancel", endInfoCardDrag);
      elements.mapInfoDragHandle.addEventListener("lostpointercapture", function () {
        state.infoCardDrag = null;
        elements.mapInfoCard.classList.remove("is-dragging");
        elements.mapInfoDragHandle.setAttribute("aria-grabbed", "false");
      });
      elements.mapInfoDragHandle.addEventListener("keydown", function (event) {
        if (!state.infoStopId || ["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].indexOf(event.key) === -1) {
          return;
        }

        var overlayRect = elements.mapInfoOverlay.getBoundingClientRect();
        var cardRect = elements.mapInfoCard.getBoundingClientRect();
        var step = event.shiftKey ? 24 : 8;
        state.infoCardDragged = true;
        state.infoCardPosition = state.infoCardPosition || {
          left: cardRect.left - overlayRect.left,
          top: cardRect.top - overlayRect.top,
        };
        if (event.key === "ArrowLeft") {
          state.infoCardPosition.left -= step;
        } else if (event.key === "ArrowRight") {
          state.infoCardPosition.left += step;
        } else if (event.key === "ArrowUp") {
          state.infoCardPosition.top -= step;
        } else if (event.key === "ArrowDown") {
          state.infoCardPosition.top += step;
        }
        applyDraggedInfoCardPosition(state.hotspotsById[state.infoStopId] || null);
        event.preventDefault();
        event.stopPropagation();
      });
    }

    if (elements.languageBtn) {
      elements.languageBtn.addEventListener("click", function () {
        state.language = getCurrentLanguage() === "en" ? "tl" : "en";
        updateLanguageButton();

        if (state.infoStopId) {
          renderAll();
        } else {
          playIntroAudio();
        }
      });
    }

    if (elements.toggleHotspotsBtn) {
      elements.toggleHotspotsBtn.addEventListener("click", function () {
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

      ["move", "zoom", "resize"].forEach(function (eventName) {
        state.map.on(eventName, function () {
          var activeStop = state.infoStopId ? state.hotspotsById[state.infoStopId] || null : null;
          if (activeStop) {
            positionMapInfoOverlay(activeStop);
          }
        });
      });

    }

    window.addEventListener("resize", function () {
      var activeStop = state.infoStopId ? state.hotspotsById[state.infoStopId] || null : null;
      if (activeStop) {
        positionMapInfoOverlay(activeStop);
      }
    });

    window.addEventListener("keydown", function (event) {
      if (event.key === "Escape" && state.infoStopId) {
        clearActiveSelection();
      }
    });
  }

  function init() {
    setLoadingState(true, "", "Preparing the Site Map...");

    fetchMapData()
      .then(function () {
        return initLeafletMap();
      })
      .then(function () {
        setLoadingState(true, "", "Preparing the Site Map...");
        setLeafletVisibility(true);
        setPanoramaVisibility(false);
        return createPanoramaViewer(state.alternateImageUrl).catch(function (error) {
          state.panoramaFailed = true;
          if (window.console && window.console.warn) {
            window.console.warn("The Site Map opened without the 360 aerial view.", error);
          }
          return null;
        });
      })
      .then(function () {
        bindEvents();

        var initialStops = getVisibleStops();
        if (initialStops.length) {
          state.stopId = initialStops[0].id;
        }
        state.activeViewMode = state.defaultViewMode;
        updateLanguageButton();
        updateViewModeButton();
        updateHotspotToggleButton();
        setLeafletVisibility(state.defaultViewMode !== "360");
        setPanoramaVisibility(state.defaultViewMode === "360");
        if (state.defaultViewMode === "360" && state.panoramaViewer && typeof state.panoramaViewer.resize === "function") {
          state.panoramaViewer.resize();
        }
        renderAll();
        setLoadingState(false);
        playIntroAudio();

        if (state.panoramaFailed && elements.viewModeBtn) {
          elements.viewModeBtn.setAttribute("aria-label", "Retry loading the 360 aerial view");
        }
      })
      .catch(function () {
        setLoadingState(true, "Unable to load Site Map", "Please refresh the page and try again.");
        elements.mapRoot.innerHTML = '<div class="map-empty-state">Unable to load map data. Check <code>/static/data/site-map-hotspots.json</code>.</div>';
      });
  }

  init();
})();
