(function () {
  "use strict";

  var body = document.body;
  var rootEl = document.getElementById("arScene");
  var listenButton = document.getElementById("arListen");
  var muteButton = document.getElementById("arMute");
  var languageButton = document.getElementById("arLanguage");
  var subtitlesButton = document.getElementById("arSubtitles");
  var pahimakasMarchButton = document.getElementById("arPahimakasMarch");
  var subtitleBar = document.getElementById("arSubtitle");
  var subtitleTextEl = document.getElementById("arSubtitleText");
  var subtitleEyebrow = document.getElementById("arSubtitleEyebrow");
  var listenLabel = document.getElementById("arListenLabel");
  var backButton = document.getElementById("arBackButton");
  var preloaderEl = document.getElementById("arPreloader");
  var preloaderProgressEl = document.getElementById("arLoaderProgress");
  var preloaderProgressBar = document.getElementById("arLoaderProgressBar");
  var preloaderStatusEl = document.getElementById("arLoaderStatus");
  var preloaderCountEl = document.getElementById("arLoaderCount");
  var preloaderRetryButton = document.getElementById("arLoaderRetry");
  if (!body || !rootEl) {
    return;
  }

  function showBootstrapLoaderError(message) {
    if (!preloaderEl) {
      return;
    }
    preloaderEl.hidden = false;
    preloaderEl.classList.remove("is-done");
    preloaderEl.classList.add("has-error");
    preloaderEl.setAttribute("aria-busy", "false");
    preloaderEl.removeAttribute("aria-hidden");
    if (preloaderStatusEl) {
      preloaderStatusEl.textContent = message;
    }
    if (preloaderRetryButton) {
      preloaderRetryButton.hidden = false;
    }
  }

  if (preloaderRetryButton) {
    preloaderRetryButton.addEventListener("click", function () {
      window.location.reload();
    });
  }

  configureBackButton();

  var THREE_NS = window.THREE;
  var THREEx_NS = window.THREEx;
  if (
    !THREE_NS ||
    !THREE_NS.GLTFLoader ||
    !THREEx_NS ||
    !THREEx_NS.ArToolkitSource ||
    !THREEx_NS.ArToolkitContext ||
    !THREEx_NS.ArMarkerControls
  ) {
    console.error("[AR] Missing custom pipeline dependencies.");
    showBootstrapLoaderError("The AR components could not load. Check your connection and retry. / Hindi nag-load ang mga bahagi ng AR. Suriin ang koneksiyon at subukang muli.");
    return;
  }

  var IS_MOBILE = /android|iphone|ipad|ipod/i.test(navigator.userAgent);
  var CONTENT_LAYER = 0;
  var OCCLUSION_LAYER = 1;
  var ARTIFACT_SUBTITLES = window.NHCP_ARTIFACT_SUBTITLES || {};

  var MODEL_CONFIG = {
    balanghay: {
      targetSize: 0.76,
      scaleMultiplier: 2,
      position: [0, 0.6, 0],
      solvedPosition: [0, 0, 0],
      rotation: [0, 0, 0],
      occluder: {
        enabled: true,
        sizeMultiplier: 1.15,
        yOffset: 0.001,
      },
    },
    alay: {
      targetSize: 0.8,
      scaleMultiplier: 2,
      position: [0, 0, 0],
      rotation: [0, -90, 0],
      occluder: {
        enabled: true,
        sizeMultiplier: 1.15,
        yOffset: 0.001,
      },
    },
    antuk: {
      targetSize: 0.8,
      scaleMultiplier: 2,
      position: [0, 0, 0],
      rotation: [0, -90, 0],
      occluder: {
        enabled: true,
        sizeMultiplier: 1.15,
        yOffset: 0.001,
      },
    },
    bagongon: {
      targetSize: 0.8,
      scaleMultiplier: 2,
      position: [0, 0, 0],
      rotation: [0, -90, 0],
      occluder: {
        enabled: true,
        sizeMultiplier: 1.15,
        yOffset: 0.001,
      },
    },
    bogwa: {
      targetSize: 0.8,
      scaleMultiplier: 2,
      position: [0, 0, 0],
      rotation: [0, -130, 0],
      occluder: {
        enabled: true,
        sizeMultiplier: 1.15,
        yOffset: 0.001,
      },
    },
    kabaong: {
      targetSize: 0.84,
      scaleMultiplier: 2,
      position: [0, 0, 0],
      rotation: [0, 0, 0],
      occluder: {
        enabled: true,
        sizeMultiplier: 1.15,
        yOffset: 0.001,
      },
    },
    banga: {
      targetSize: 0.8,
      scaleMultiplier: 2,
      position: [0, 0, 0],
      rotation: [0, 0, 0],
      occluder: {
        enabled: true,
        sizeMultiplier: 1.15,
        yOffset: -0.001,
      },
    },
    pagpag: {
      targetSize: 0.8,
      scaleMultiplier: 2,
      position: [0, 0, 0],
      rotation: [0, -90, 0],
      occluder: {
        enabled: true,
        sizeMultiplier: 1.15,
        yOffset: 0.001,
      },
    },
    pahimakas: {
      targetSize: 0.8,
      scaleMultiplier: 2,
      position: [0, 0, 0],
      rotation: [0, -90, 0],
      occluder: {
        enabled: true,
        sizeMultiplier: 1.15,
        yOffset: 0.001,
      },
    },
    uloh: {
      targetSize: 0.8,
      scaleMultiplier: 2,
      position: [0, 0, 0],
      rotation: [0, -90, 0],
      occluder: {
        enabled: true,
        sizeMultiplier: 1.15,
        yOffset: 0.001,
      },
    },
    tsapang: {
      targetSize: 0.8,
      scaleMultiplier: 2,
      position: [0, 0, 0],
      rotation: [0, -90, 0],
      occluder: {
        enabled: true,
        sizeMultiplier: 1.15,
        yOffset: 0.001,
      },
    },
    kagamitan: {
      targetSize: 0.8,
      scaleMultiplier: 2,
      position: [0, 0, 0],
      rotation: [0, -90, 0],
      occluder: {
        enabled: true,
        sizeMultiplier: 1.15,
        yOffset: 0.001,
      },
    },
    luksa: {
      targetSize: 0.8,
      scaleMultiplier: 2.5,
      position: [0, 0, 0],
      rotation: [0, -180, 0],
      occluder: {
        enabled: true,
        sizeMultiplier: 1.15,
        yOffset: 0.001,
      },
    },
    pagtubas: {
      targetSize: 0.8,
      scaleMultiplier: 2,
      position: [0, 0, 0],
      rotation: [0, -90, 0],
      occluder: {
        enabled: true,
        sizeMultiplier: 1.15,
        yOffset: 0.001,
      },
    },
    pahiwatig: {
      targetSize: 0.8,
      scaleMultiplier: 2,
      position: [0, 0, 0],
      rotation: [0, -120, 0],
      occluder: {
        enabled: true,
        sizeMultiplier: 1.15,
        yOffset: 0.001,
      },
    },
    recuerdos: {
      targetSize: 0.8,
      scaleMultiplier: 2,
      position: [0, 0, 0],
      rotation: [0, -90, 0],
      occluder: {
        enabled: true,
        sizeMultiplier: 1.15,
        yOffset: 0.001,
      },
    },
    sabwag: {
      targetSize: 0.8,
      scaleMultiplier: 2,
      position: [0, 0, 0],
      rotation: [0, -90, 0],
      occluder: {
        enabled: true,
        sizeMultiplier: 1.15,
        yOffset: 0.001,
      },
    },
    sisiw: {
      targetSize: 0.8,
      scaleMultiplier: 2.5,
      position: [0, 0, 0],
      rotation: [0, 0, 0],
      occluder: {
        enabled: true,
        sizeMultiplier: 1.15,
        yOffset: 0.001,
      },
    },
    tausug: {
      targetSize: 0.8,
      scaleMultiplier: 2.5,
      position: [0, 0, 0],
      rotation: [0, -90, 0],
      occluder: {
        enabled: true,
        sizeMultiplier: 1.15,
        yOffset: 0.001,
      },
    },
    tboli: {
      targetSize: 0.8,
      scaleMultiplier: 2,
      position: [0, 0, 0],
      rotation: [0, -90, 0],
      occluder: {
        enabled: true,
        sizeMultiplier: 1.15,
        yOffset: 0.001,
      },
    },
  };

  var CONFIG = {
    analyticsEndpoint: body.dataset.arAnalyticsEndpoint || "",
    markerLostDebounceMs: 320,
    markerVisibilityHoldMs: 220,
    renderer: {
      mobilePixelRatioCap: 2,
      desktopPixelRatioCap: 2,
      maxAnisotropy: 8,
    },
    source: {
      sourceType: "webcam",
      sourceWidth: 1280,
      sourceHeight: 960,
      displayWidth: 1280,
      displayHeight: 960,
    },
    context: {
      cameraParametersUrl: "https://ar-js-org.github.io/AR.js/data/data/camera_para.dat",
      detectionMode: "mono",
      matrixCodeType: "3x3",
      maxDetectionRate: 60,
      canvasWidth: 1280,
      canvasHeight: 960,
      patternRatio: 0.5,
    },
    markerControls: {
      minConfidence: 0.55,
      smooth: true,
      smoothCount: 8,
      smoothTolerance: 0.01,
      smoothThreshold: 2,
    },
    poseFilter: {
      positionLerp: 0.32,
      rotationLerp: 0.28,
      scaleLerp: 0.38,
      snapPositionDistance: 0.16,
      snapAngleDegrees: 18,
      minDeltaMs: 8,
      maxDeltaMs: 66,
    },
  };

  if (IS_MOBILE) {
    CONFIG.markerVisibilityHoldMs = 90;
    CONFIG.markerControls.smoothCount = 4;
    CONFIG.markerControls.smoothTolerance = 0.006;
    CONFIG.markerControls.smoothThreshold = 1;
    CONFIG.poseFilter.positionLerp = 0.5;
    CONFIG.poseFilter.rotationLerp = 0.78;
    CONFIG.poseFilter.scaleLerp = 0.52;
    CONFIG.poseFilter.snapPositionDistance = 0.08;
    CONFIG.poseFilter.snapAngleDegrees = 8;
  }

  var runtime = {
    renderer: null,
    scene: null,
    camera: null,
    arSource: null,
    arContext: null,
    loader: null,
    markerEntries: [],
    cameraReady: false,
    cameraError: false,
    rendererConfigured: false,
    viewportKey: "",
    resizeRafId: 0,
    pendingViewportForce: false,
    viewportSettleTimeoutIds: [],
    lastVideoWidth: 0,
    lastVideoHeight: 0,
    videoWatcherIntervalId: 0,
    markerFilter: "all",
    rafId: 0,
    audioElement: null,
    marchAudioElement: null,
    activeAudioEntry: null,
    activeNarrationKind: "",
    activeGuidanceState: "",
    audioLanguage: "tl",
    narrationMuted: false,
    narrationPausedByUser: false,
    subtitlesOn: false,
    renderedSubtitleText: "",
    audioPrimed: false,
    audioPriming: false,
    audioPrimeHandler: null,
    audioPrimeUrl: "",
    pendingAudioSrc: "",
    audioUnlockHandler: null,
    // Preload gate: model downloads + shard preparation finish before camera.
    preloadTotal: 0,
    preloadReady: 0,
    preloadFractions: {},
    cameraStartTimeoutId: 0,
    // Anamorphic puzzle UI
    puzzleHintEl: null,
    puzzleHintState: "",
    puzzleHintTimerId: 0,
    quickLookViewer: null,
    viewInSpaceButton: null,
    solvedPuzzleEntry: null,
    // Touch-drag to rotate the on-screen artifact
    modelDrag: { active: false, pointerId: null, lastX: 0, lastY: 0, entry: null },
    modelRotationHandlers: null,
    destroyed: false,
  };

  function renderPreloadProgress() {
    var total = Math.max(0, runtime.preloadTotal);
    var sum = Object.keys(runtime.preloadFractions).reduce(function (value, key) {
      return value + clampNumber(runtime.preloadFractions[key], 0, 0, 1);
    }, 0);
    var percent = total ? Math.min(100, Math.round((sum / total) * 100)) : 0;

    if (preloaderProgressBar) {
      preloaderProgressBar.style.width = percent + "%";
    }
    if (preloaderProgressEl) {
      preloaderProgressEl.setAttribute("aria-valuenow", String(percent));
    }
    if (preloaderCountEl) {
      preloaderCountEl.textContent = runtime.preloadReady + " of " + total + " artifacts ready / " + runtime.preloadReady + " sa " + total + " artifact handa · " + percent + "%";
    }
  }

  function initializePreloader(total) {
    runtime.preloadTotal = Math.max(0, total || 0);
    runtime.preloadReady = 0;
    runtime.preloadFractions = {};
    if (preloaderEl) {
      preloaderEl.hidden = false;
      preloaderEl.classList.remove("is-done", "has-error");
      preloaderEl.setAttribute("aria-busy", "true");
      preloaderEl.removeAttribute("aria-hidden");
    }
    if (preloaderRetryButton) {
      preloaderRetryButton.hidden = true;
    }
    if (preloaderStatusEl) {
      preloaderStatusEl.textContent = "Preparing 3D artifacts… / Inihahanda ang mga 3D artifact…";
    }
    renderPreloadProgress();
  }

  function reportModelDownload(key, event) {
    if (!key || !event || !event.lengthComputable || !event.total) {
      return;
    }
    var fraction = Math.min(0.9, Math.max(0, event.loaded / event.total) * 0.9);
    runtime.preloadFractions[key] = Math.max(runtime.preloadFractions[key] || 0, fraction);
    renderPreloadProgress();
  }

  function markModelPrepared(key) {
    if (!key || runtime.preloadFractions[key] === 1) {
      return;
    }
    runtime.preloadFractions[key] = 1;
    runtime.preloadReady += 1;
    renderPreloadProgress();
  }

  function setPreloaderStatus(message) {
    if (preloaderStatusEl) {
      preloaderStatusEl.textContent = message;
    }
  }

  function showPreloaderError(message) {
    showBootstrapLoaderError(message);
    if (preloaderCountEl) {
      preloaderCountEl.textContent = runtime.preloadReady + " of " + runtime.preloadTotal + " artifacts prepared / " + runtime.preloadReady + " sa " + runtime.preloadTotal + " artifact ang nahanda bago nagkaroon ng error.";
    }
  }

  function dismissPreloader() {
    if (!preloaderEl || preloaderEl.classList.contains("is-done")) {
      return;
    }
    runtime.preloadReady = runtime.preloadTotal;
    Object.keys(runtime.preloadFractions).forEach(function (key) {
      runtime.preloadFractions[key] = 1;
    });
    renderPreloadProgress();
    preloaderEl.setAttribute("aria-busy", "false");
    preloaderEl.setAttribute("aria-hidden", "true");
    preloaderEl.classList.add("is-done");
  }

  function clampNumber(value, fallback, min, max) {
    var parsed = Number(value);
    var next = Number.isFinite(parsed) ? parsed : fallback;
    if (Number.isFinite(min)) {
      next = Math.max(min, next);
    }
    if (Number.isFinite(max)) {
      next = Math.min(max, next);
    }
    return next;
  }

  function clampUnit(value) {
    return clampNumber(value, 0, 0, 1);
  }

  function degToRad(value) {
    return (clampNumber(value, 0, -1080, 1080) * Math.PI) / 180;
  }

  function getAdaptiveLerp(baseLerp, deltaMs) {
    var base = clampNumber(baseLerp, 0.3, 0.001, 1);
    var clampedDelta = clampNumber(deltaMs, 16.67, CONFIG.poseFilter.minDeltaMs, CONFIG.poseFilter.maxDeltaMs);
    var frameFactor = clampedDelta / 16.67;
    var eased = 1 - Math.pow(1 - base, frameFactor);
    return clampNumber(eased, base, 0.001, 1);
  }

  function readPipelineConfig() {
    var configEl = document.getElementById("ar-three-config");
    if (!configEl) {
      return { markers: [] };
    }

    try {
      var parsed = JSON.parse(configEl.textContent || "{}");
      if (!parsed || !Array.isArray(parsed.markers)) {
        return { markers: [] };
      }
      return parsed;
    } catch (error) {
      console.error("[AR] Invalid JSON in #ar-three-config", error);
      return { markers: [] };
    }
  }

  function getMarkerFilter() {
    var search = new URLSearchParams(window.location.search);
    var markerValue = (search.get("marker") || "all").toLowerCase();
    return markerValue || "all";
  }

  function getEnabledMarkers(rawMarkers) {
    var requestedFilter = getMarkerFilter();
    runtime.markerFilter = requestedFilter;

    var markers = rawMarkers
      .map(function (item) {
        return {
          key: String(item && item.key ? item.key : "").toLowerCase(),
          patternUrl: String(item && item.patternUrl ? item.patternUrl : ""),
          modelUrl: String(item && item.modelUrl ? item.modelUrl : ""),
          imageUrl: String(item && item.imageUrl ? item.imageUrl : ""),
          audioByLanguage: item && item.audioByLanguage && typeof item.audioByLanguage === "object"
            ? {
                tl: String(item.audioByLanguage.tl || ""),
                en: String(item.audioByLanguage.en || ""),
              }
            : null,
          alternateAudioUrl: String(item && item.alternateAudioUrl ? item.alternateAudioUrl : ""),
          infoTitle: String(item && item.infoTitle ? item.infoTitle : ""),
          infoText: String(item && item.infoText ? item.infoText : ""),
          anamorphicPuzzle: item && item.anamorphicPuzzle === true,
        };
      })
      .filter(function (item) {
        return Boolean(item.key && item.patternUrl && item.modelUrl);
      });

    if (!markers.length) {
      return [];
    }

    if (requestedFilter === "all") {
      return markers;
    }

    var filteredMarkers = markers.filter(function (item) {
      return item.key === requestedFilter;
    });

    if (filteredMarkers.length) {
      return filteredMarkers;
    }

    runtime.markerFilter = "all";
    return markers;
  }

  function getModelConfig(markerKey) {
    var fallback = {
      targetSize: 0.75,
      scaleMultiplier: 1,
      position: [0, 0, 0],
      rotation: [0, 0, 0],
      occluder: {
        enabled: true,
        sizeMultiplier: 1.15,
        yOffset: 0.001,
      },
    };

    return MODEL_CONFIG[markerKey] || fallback;
  }

  function parseErrorMessage(value) {
    if (!value) {
      return "Unknown camera or tracker error.";
    }

    if (typeof value === "string") {
      return value;
    }

    if (value.message) {
      return value.message;
    }

    if (value.detail && value.detail.message) {
      return value.detail.message;
    }

    if (value.error && value.error.message) {
      return value.error.message;
    }

    if (value.name) {
      return value.name;
    }

    return "Unknown camera or tracker error.";
  }

  function sendAnalytics(eventName, extraData) {
    if (!CONFIG.analyticsEndpoint) {
      return;
    }

    var payload = Object.assign(
      {
        event: eventName,
        marker: runtime.markerFilter,
        timestamp: Date.now(),
      },
      extraData || {}
    );

    fetch(CONFIG.analyticsEndpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
      keepalive: true,
    }).catch(function () {
      return undefined;
    });
  }

  function showCameraError(rawError) {
    runtime.cameraError = true;
    var message = parseErrorMessage(rawError);
    console.error("[AR]", message);
    if (runtime.cameraStartTimeoutId) {
      window.clearTimeout(runtime.cameraStartTimeoutId);
      runtime.cameraStartTimeoutId = 0;
    }
    showPreloaderError("The camera could not start. Allow camera access, then retry. / Hindi mabuksan ang camera. Payagan ang camera access at subukang muli.");
    sendAnalytics("camera_error", { error: message });
  }

  function markCameraReady(source) {
    if (runtime.cameraReady) {
      return;
    }

    runtime.cameraReady = true;
    if (runtime.cameraStartTimeoutId) {
      window.clearTimeout(runtime.cameraStartTimeoutId);
      runtime.cameraStartTimeoutId = 0;
    }
    dismissPreloader();
    sendAnalytics("camera_ready", { source: source });
  }

  function wrapCanvasTextLines(context, text, maxWidth) {
    var words = String(text || "").trim().split(/\s+/).filter(Boolean);
    if (!words.length) {
      return [""];
    }

    var lines = [];
    var currentLine = words[0];

    for (var index = 1; index < words.length; index += 1) {
      var candidate = currentLine + " " + words[index];
      if (context.measureText(candidate).width <= maxWidth) {
        currentLine = candidate;
      } else {
        lines.push(currentLine);
        currentLine = words[index];
      }
    }

    lines.push(currentLine);
    return lines;
  }

  function createBalanghayInfoTexture(title, description) {
    var canvas = document.createElement("canvas");
    canvas.width = 1024;
    canvas.height = 640;

    var context = canvas.getContext("2d");
    if (!context) {
      return null;
    }

    context.fillStyle = "rgba(8, 16, 28, 0.92)";
    context.fillRect(0, 0, canvas.width, canvas.height);

    context.strokeStyle = "rgba(255, 196, 82, 0.9)";
    context.lineWidth = 10;
    context.strokeRect(12, 12, canvas.width - 24, canvas.height - 24);

    context.fillStyle = "#fbbf24";
    context.font = "700 76px 'Segoe UI', sans-serif";
    context.fillText(String(title || "Balanghay"), 66, 130);

    context.fillStyle = "rgba(255, 255, 255, 0.95)";
    context.font = "500 46px 'Segoe UI', sans-serif";
    var textLines = wrapCanvasTextLines(context, description, canvas.width - 132).slice(0, 7);

    textLines.forEach(function (line, lineIndex) {
      context.fillText(line, 66, 220 + lineIndex * 58);
    });

    var texture = new THREE_NS.CanvasTexture(canvas);
    if ("colorSpace" in texture && THREE_NS.SRGBColorSpace) {
      texture.colorSpace = THREE_NS.SRGBColorSpace;
    } else if ("encoding" in texture && THREE_NS.sRGBEncoding) {
      texture.encoding = THREE_NS.sRGBEncoding;
    }
    texture.needsUpdate = true;

    return texture;
  }


  function getSafePixelRatio() {
    var raw = clampNumber(window.devicePixelRatio, 1, 1, 4);
    var cap = IS_MOBILE ? CONFIG.renderer.mobilePixelRatioCap : CONFIG.renderer.desktopPixelRatioCap;
    return Math.min(raw, cap);
  }

  function configureRendererQuality() {
    if (!runtime.renderer) {
      return;
    }

    if (!runtime.rendererConfigured) {
      if ("outputColorSpace" in runtime.renderer && THREE_NS.SRGBColorSpace) {
        runtime.renderer.outputColorSpace = THREE_NS.SRGBColorSpace;
      } else if ("outputEncoding" in runtime.renderer && THREE_NS.sRGBEncoding) {
        runtime.renderer.outputEncoding = THREE_NS.sRGBEncoding;
      }

      if (typeof runtime.renderer.physicallyCorrectLights === "boolean") {
        runtime.renderer.physicallyCorrectLights = false;
      }

      if (typeof runtime.renderer.sortObjects === "boolean") {
        runtime.renderer.sortObjects = true;
      }

      runtime.rendererConfigured = true;
    }

    runtime.renderer.setPixelRatio(getSafePixelRatio());
  }

  function getViewportMetrics() {
    var viewport = window.visualViewport;
    var viewportScale = clampNumber((viewport && viewport.scale) || 1, 1, 0.25, 4);
    var rawWidth = (viewport && viewport.width) || window.innerWidth || document.documentElement.clientWidth || 0;
    var rawHeight = (viewport && viewport.height) || window.innerHeight || document.documentElement.clientHeight || 0;
    var width = Math.round(rawWidth * viewportScale);
    var height = Math.round(rawHeight * viewportScale);

    return {
      width: Math.max(width, 1),
      height: Math.max(height, 1),
      dpr: clampNumber(window.devicePixelRatio, 1, 1, 4),
      scale: viewportScale,
    };
  }

  function getArVideoElement() {
    return document.getElementById("arjs-video") || (runtime.arSource && runtime.arSource.domElement) || document.querySelector("video");
  }

  function getSourceDimensions(videoEl) {
    var sourceWidth = 0;
    var sourceHeight = 0;

    if (videoEl) {
      sourceWidth = Math.round(clampNumber(videoEl.videoWidth || videoEl.width, 0, 0, 20000));
      sourceHeight = Math.round(clampNumber(videoEl.videoHeight || videoEl.height, 0, 0, 20000));

      if (sourceWidth > 0 && sourceHeight > 0) {
        runtime.lastVideoWidth = sourceWidth;
        runtime.lastVideoHeight = sourceHeight;
      }
    }

    if (sourceWidth < 1 || sourceHeight < 1) {
      sourceWidth = runtime.lastVideoWidth;
      sourceHeight = runtime.lastVideoHeight;
    }

    return {
      width: sourceWidth,
      height: sourceHeight,
    };
  }

  function getCoverFrame(viewportWidth, viewportHeight, sourceWidth, sourceHeight) {
    if (sourceWidth < 1 || sourceHeight < 1) {
      return {
        left: 0,
        top: 0,
        width: viewportWidth,
        height: viewportHeight,
      };
    }

    var scale = Math.max(viewportWidth / sourceWidth, viewportHeight / sourceHeight);
    var frameWidth = Math.round(sourceWidth * scale);
    var frameHeight = Math.round(sourceHeight * scale);

    return {
      left: Math.round((viewportWidth - frameWidth) * 0.5),
      top: Math.round((viewportHeight - frameHeight) * 0.5),
      width: Math.max(frameWidth, 1),
      height: Math.max(frameHeight, 1),
    };
  }

  function applyElementBounds(element, width, height, left, top) {
    if (!element || !element.style) {
      return;
    }

    element.style.left = Math.round(clampNumber(left, 0, -50000, 50000)) + "px";
    element.style.top = Math.round(clampNumber(top, 0, -50000, 50000)) + "px";
    element.style.width = width + "px";
    element.style.height = height + "px";
  }

  function syncViewport(reason, force) {
    if (!runtime.renderer || !runtime.renderer.domElement) {
      return;
    }

    var metrics = getViewportMetrics();
    var videoEl = getArVideoElement();
    var sourceDimensions = getSourceDimensions(videoEl);
    var frame = getCoverFrame(metrics.width, metrics.height, sourceDimensions.width, sourceDimensions.height);

    var key =
      metrics.width +
      "x" +
      metrics.height +
      "@" +
      metrics.dpr.toFixed(2) +
      "|scale:" +
      metrics.scale.toFixed(2) +
      "|src:" +
      sourceDimensions.width +
      "x" +
      sourceDimensions.height +
      "|frame:" +
      frame.width +
      "x" +
      frame.height +
      "+" +
      frame.left +
      "+" +
      frame.top;

    if (!force && runtime.viewportKey === key) {
      return;
    }

    runtime.viewportKey = key;

    document.documentElement.style.setProperty("--app-width", metrics.width + "px");
    document.documentElement.style.setProperty("--app-height", metrics.height + "px");

    applyElementBounds(rootEl, metrics.width, metrics.height, 0, 0);

    if (runtime.arSource && typeof runtime.arSource.onResizeElement === "function") {
      runtime.arSource.onResizeElement();
    }

    configureRendererQuality();
    runtime.renderer.setSize(frame.width, frame.height, false);
    if (typeof runtime.renderer.setViewport === "function") {
      runtime.renderer.setViewport(0, 0, frame.width, frame.height);
    }

    if (
      runtime.arSource &&
      typeof runtime.arSource.copyElementSizeTo === "function" &&
      runtime.arContext &&
      runtime.arContext.arController &&
      runtime.arContext.arController.canvas
    ) {
      runtime.arSource.copyElementSizeTo(runtime.arContext.arController.canvas);
    }

    applyElementBounds(runtime.renderer.domElement, frame.width, frame.height, frame.left, frame.top);
    applyElementBounds(videoEl, frame.width, frame.height, frame.left, frame.top);
  }

  function requestViewportSync(reason, force) {
    runtime.pendingViewportForce = runtime.pendingViewportForce || Boolean(force);

    if (runtime.resizeRafId) {
      return;
    }

    runtime.resizeRafId = window.requestAnimationFrame(function () {
      runtime.resizeRafId = 0;
      var shouldForce = runtime.pendingViewportForce;
      runtime.pendingViewportForce = false;
      syncViewport(reason, shouldForce);
    });
  }

  function clearViewportSettleTimers() {
    while (runtime.viewportSettleTimeoutIds.length) {
      var timeoutId = runtime.viewportSettleTimeoutIds.pop();
      window.clearTimeout(timeoutId);
    }
  }

  function scheduleViewportSettle(reason) {
    clearViewportSettleTimers();

    [0, 120, 280, 520].forEach(function (delay) {
      var timeoutId = window.setTimeout(function () {
        requestViewportSync(reason + "-settle-" + delay, true);
      }, delay);

      runtime.viewportSettleTimeoutIds.push(timeoutId);
    });
  }

  function clearMarkerLostTimer(entry) {
    if (!entry || !entry.lostTimerId) {
      return;
    }

    window.clearTimeout(entry.lostTimerId);
    entry.lostTimerId = 0;
  }

  function scheduleMarkerLost(entry) {
    if (!entry || entry.lostTimerId || !entry.isVisibleStable) {
      return;
    }

    entry.lostTimerId = window.setTimeout(function () {
      entry.lostTimerId = 0;
      if (!entry.isVisibleStable) {
        return;
      }

      entry.isVisibleStable = false;
      entry.renderRoot.visible = false;
      sendAnalytics("marker_lost", { marker: entry.key });
      syncActiveAudioEntry();
    }, CONFIG.markerLostDebounceMs);
  }

  function getEntryAudioConfig(entry) {
    if (!entry || !entry.audioByLanguage || typeof entry.audioByLanguage !== "object") {
      return null;
    }

    return entry.audioByLanguage;
  }

  function resolveAudioSource(audioConfig, language) {
    if (!audioConfig) {
      return "";
    }

    var normalizedLanguage = language === "en" ? "en" : "tl";
    var preferred = String(audioConfig[normalizedLanguage] || "").trim();
    if (preferred) {
      return preferred;
    }

    var fallbackLanguage = normalizedLanguage === "tl" ? "en" : "tl";
    return String(audioConfig[fallbackLanguage] || "").trim();
  }

  function removePendingAudioUnlockHandler() {
    if (!runtime.audioUnlockHandler) {
      return;
    }

    document.removeEventListener("pointerdown", runtime.audioUnlockHandler);
    document.removeEventListener("touchend", runtime.audioUnlockHandler);
    document.removeEventListener("keydown", runtime.audioUnlockHandler);
    runtime.audioUnlockHandler = null;
  }

  function retryPendingAudioPlayback() {
    if (!runtime.pendingAudioSrc || !runtime.audioElement) {
      return;
    }

    var playResult = runtime.audioElement.play();
    if (!playResult || typeof playResult.then !== "function") {
      runtime.pendingAudioSrc = "";
      removePendingAudioUnlockHandler();
      return;
    }

    playResult
      .then(function () {
        runtime.pendingAudioSrc = "";
        runtime.audioPrimed = true;
        removeAudioPrimeHandler();
        removePendingAudioUnlockHandler();
      })
      .catch(function () {
        schedulePendingAudioRetry();
      });
  }

  function schedulePendingAudioRetry() {
    if (runtime.audioUnlockHandler) {
      return;
    }

    runtime.audioUnlockHandler = function (event) {
      // Let the Listen button own its gesture. Otherwise the document-level
      // unlock would start playback on pointerdown and the following click
      // would immediately interpret that state as a request to pause.
      if (event && event.target && event.target.closest && event.target.closest("#arListen")) {
        return;
      }
      removePendingAudioUnlockHandler();
      retryPendingAudioPlayback();
    };

    document.addEventListener("pointerdown", runtime.audioUnlockHandler, { passive: true });
    document.addEventListener("touchend", runtime.audioUnlockHandler, { passive: true });
    document.addEventListener("keydown", runtime.audioUnlockHandler);
  }

  function ensureAudioElement() {
    if (runtime.audioElement) {
      return runtime.audioElement;
    }

    var audioEl = document.createElement("audio");
    audioEl.preload = "auto";
    audioEl.hidden = true;
    audioEl.setAttribute("playsinline", "");
    audioEl.playsInline = true;
    audioEl.muted = runtime.narrationMuted;
    ["play", "pause", "ended", "volumechange"].forEach(function (eventName) {
      audioEl.addEventListener(eventName, updateNarrationControls);
    });
    audioEl.addEventListener("ended", handleNarrationEnded);
    body.appendChild(audioEl);
    runtime.audioElement = audioEl;
    return audioEl;
  }

  function ensureMarchAudioElement() {
    if (runtime.marchAudioElement) {
      return runtime.marchAudioElement;
    }

    var audioEl = document.createElement("audio");
    audioEl.preload = "auto";
    audioEl.hidden = true;
    audioEl.setAttribute("playsinline", "");
    audioEl.playsInline = true;
    audioEl.muted = runtime.narrationMuted;
    ["play", "pause", "ended", "volumechange"].forEach(function (eventName) {
      audioEl.addEventListener(eventName, updateNarrationControls);
    });
    body.appendChild(audioEl);
    runtime.marchAudioElement = audioEl;
    return audioEl;
  }

  function stopPahimakasMarch(resetTime) {
    if (!runtime.marchAudioElement) {
      return;
    }

    runtime.marchAudioElement.pause();
    if (resetTime) {
      try {
        runtime.marchAudioElement.currentTime = 0;
      } catch (error) {
        return;
      }
    }
  }

  function createSilentAudioUrl() {
    if (runtime.audioPrimeUrl) {
      return runtime.audioPrimeUrl;
    }

    if (!window.URL || typeof window.URL.createObjectURL !== "function" || typeof window.Blob !== "function") {
      return "";
    }

    // A valid 100 ms, 8-bit mono WAV containing only silence. Playing this
    // inside the first page gesture unlocks the same HTMLAudioElement that
    // later carries the detected artifact's narration.
    var sampleRate = 8000;
    var sampleCount = 800;
    var buffer = new ArrayBuffer(44 + sampleCount);
    var view = new DataView(buffer);

    function writeAscii(offset, value) {
      for (var index = 0; index < value.length; index += 1) {
        view.setUint8(offset + index, value.charCodeAt(index));
      }
    }

    writeAscii(0, "RIFF");
    view.setUint32(4, 36 + sampleCount, true);
    writeAscii(8, "WAVE");
    writeAscii(12, "fmt ");
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true);
    view.setUint16(22, 1, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate, true);
    view.setUint16(32, 1, true);
    view.setUint16(34, 8, true);
    writeAscii(36, "data");
    view.setUint32(40, sampleCount, true);

    for (var sampleIndex = 44; sampleIndex < 44 + sampleCount; sampleIndex += 1) {
      view.setUint8(sampleIndex, 128);
    }

    runtime.audioPrimeUrl = window.URL.createObjectURL(new Blob([buffer], { type: "audio/wav" }));
    return runtime.audioPrimeUrl;
  }

  function removeAudioPrimeHandler() {
    if (!runtime.audioPrimeHandler) {
      return;
    }

    document.removeEventListener("pointerdown", runtime.audioPrimeHandler);
    document.removeEventListener("touchend", runtime.audioPrimeHandler);
    document.removeEventListener("keydown", runtime.audioPrimeHandler);
    runtime.audioPrimeHandler = null;
  }

  function finishAudioPriming(audioEl, succeeded) {
    runtime.audioPriming = false;
    runtime.audioPrimed = runtime.audioPrimed || Boolean(succeeded);

    if (audioEl && audioEl.getAttribute("data-audio-prime") === "1") {
      audioEl.pause();
      try {
        audioEl.currentTime = 0;
      } catch (error) {
        // The silent clip may already have ended; it is still safe to reuse.
      }
      audioEl.removeAttribute("data-audio-prime");
    }

    if (succeeded) {
      removeAudioPrimeHandler();
    }
  }

  function primeAudioForMarkerAutoplay() {
    if (runtime.audioPrimed || runtime.audioPriming || runtime.activeAudioEntry) {
      if (runtime.activeAudioEntry) {
        removeAudioPrimeHandler();
      }
      return;
    }

    var silentUrl = createSilentAudioUrl();
    if (!silentUrl) {
      removeAudioPrimeHandler();
      return;
    }

    var audioEl = ensureAudioElement();
    runtime.audioPriming = true;
    audioEl.pause();
    audioEl.removeAttribute("data-audio-src");
    audioEl.setAttribute("data-audio-prime", "1");
    audioEl.src = silentUrl;
    audioEl.load();

    var playResult = audioEl.play();
    if (!playResult || typeof playResult.then !== "function") {
      finishAudioPriming(audioEl, true);
      return;
    }

    playResult
      .then(function () {
        finishAudioPriming(audioEl, true);
      })
      .catch(function () {
        finishAudioPriming(audioEl, false);
      });
  }

  function setupAudioPriming() {
    if (runtime.audioPrimeHandler || runtime.audioPrimed) {
      return;
    }

    runtime.audioPrimeHandler = function () {
      primeAudioForMarkerAutoplay();
    };

    document.addEventListener("pointerdown", runtime.audioPrimeHandler, { passive: true });
    document.addEventListener("touchend", runtime.audioPrimeHandler, { passive: true });
    document.addEventListener("keydown", runtime.audioPrimeHandler);
  }

  function stopActiveAudio(resetTime) {
    removePendingAudioUnlockHandler();
    runtime.pendingAudioSrc = "";
    stopPahimakasMarch(resetTime);

    if (!runtime.audioElement) {
      return;
    }

    runtime.audioElement.pause();
    if (resetTime) {
      try {
        runtime.audioElement.currentTime = 0;
      } catch (error) {
        return;
      }
    }
  }

  function getActiveSubtitle() {
    if (!runtime.activeAudioEntry) {
      return null;
    }

    if (runtime.activeNarrationKind === "guidance") {
      return PUZZLE_HINTS[runtime.activeGuidanceState] || null;
    }

    if (runtime.activeNarrationKind !== "artifact" || !runtime.activeAudioEntry.puzzleSolved) {
      return null;
    }

    return ARTIFACT_SUBTITLES[runtime.activeAudioEntry.key] || null;
  }

  function getActiveNarrationAudioConfig() {
    if (!runtime.activeAudioEntry) {
      return null;
    }

    if (runtime.activeNarrationKind === "guidance") {
      var guidance = PUZZLE_HINTS[runtime.activeGuidanceState];
      return guidance && guidance.audioByLanguage ? guidance.audioByLanguage : null;
    }

    if (runtime.activeNarrationKind === "artifact" && runtime.activeAudioEntry.puzzleSolved) {
      return getEntryAudioConfig(runtime.activeAudioEntry);
    }

    return null;
  }

  function renderSubtitle() {
    if (!subtitleBar || !subtitleTextEl) {
      return;
    }

    var subtitle = getActiveSubtitle();
    var text = subtitle ? String(subtitle[runtime.audioLanguage] || "") : "";
    var wasHidden = subtitleBar.hidden;
    subtitleTextEl.textContent = text;
    subtitleBar.hidden = !(runtime.subtitlesOn && text);

    if (!subtitleBar.hidden && (wasHidden || runtime.renderedSubtitleText !== text)) {
      subtitleBar.scrollTop = 0;
    }
    runtime.renderedSubtitleText = text;

    if (subtitleEyebrow) {
      subtitleEyebrow.textContent = runtime.activeNarrationKind === "guidance"
        ? (runtime.audioLanguage === "tl" ? "Gabay" : "Guide")
        : (runtime.audioLanguage === "tl" ? "Salaysay" : "Narration");
    }
  }

  function isNarrationPlaying() {
    return Boolean(runtime.audioElement && !runtime.audioElement.paused && !runtime.audioElement.ended);
  }

  function isPahimakasMarchPlaying() {
    return Boolean(runtime.marchAudioElement && !runtime.marchAudioElement.paused && !runtime.marchAudioElement.ended);
  }

  function setControlAvailability(control, enabled) {
    if (!control) {
      return;
    }
    control.disabled = !enabled;
    control.setAttribute("aria-disabled", enabled ? "false" : "true");
  }

  function updateNarrationControls() {
    var audioConfig = getActiveNarrationAudioConfig();
    var hasTagalog = Boolean(audioConfig && String(audioConfig.tl || "").trim());
    var hasEnglish = Boolean(audioConfig && String(audioConfig.en || "").trim());
    var hasAudio = Boolean(runtime.activeAudioEntry && (hasTagalog || hasEnglish));
    var hasSubtitle = Boolean(getActiveSubtitle());
    var playing = isNarrationPlaying();
    var isPahimakas = Boolean(
      runtime.activeAudioEntry &&
      runtime.activeAudioEntry.key === "pahimakas" &&
      runtime.activeAudioEntry.puzzleSolved &&
      runtime.activeAudioEntry.alternateAudioUrl
    );
    var marchPlaying = isPahimakasMarchPlaying();

    setControlAvailability(listenButton, hasAudio);
    setControlAvailability(muteButton, hasAudio);
    setControlAvailability(languageButton, hasAudio && hasTagalog && hasEnglish);
    setControlAvailability(subtitlesButton, Boolean(runtime.activeAudioEntry && hasSubtitle));

    if (listenButton) {
      listenButton.classList.toggle("is-playing", playing);
      listenButton.setAttribute("aria-pressed", playing ? "true" : "false");
      listenButton.setAttribute(
        "aria-label",
        hasAudio ? (playing ? "Pause narration" : "Play narration") : "Narration unavailable until an artifact is detected"
      );
    }

    if (listenLabel) {
      listenLabel.textContent = "Listen";
    }

    if (muteButton) {
      muteButton.classList.toggle("is-muted", runtime.narrationMuted);
      muteButton.setAttribute("aria-pressed", runtime.narrationMuted ? "true" : "false");
      muteButton.setAttribute(
        "aria-label",
        hasAudio
          ? (runtime.narrationMuted ? "Unmute narration" : "Mute narration")
          : "Narration unavailable until an artifact is detected"
      );
    }

    if (languageButton) {
      languageButton.textContent = runtime.audioLanguage === "en" ? "EN" : "TL";
      languageButton.setAttribute(
        "aria-label",
        hasAudio && hasTagalog && hasEnglish
          ? "Switch narration to " + (runtime.audioLanguage === "tl" ? "English" : "Tagalog")
          : "Narration language unavailable"
      );
    }

    if (subtitlesButton) {
      subtitlesButton.classList.toggle("is-active", runtime.subtitlesOn);
      subtitlesButton.setAttribute("aria-pressed", runtime.subtitlesOn ? "true" : "false");
      subtitlesButton.setAttribute(
        "aria-label",
        hasSubtitle
          ? (runtime.subtitlesOn ? "Hide subtitles" : "Show subtitles")
          : "Subtitles unavailable until an artifact is detected"
      );
    }

    if (pahimakasMarchButton) {
      pahimakasMarchButton.hidden = !isPahimakas;
      setControlAvailability(pahimakasMarchButton, isPahimakas);
      pahimakasMarchButton.classList.toggle("is-active", marchPlaying);
      pahimakasMarchButton.classList.toggle("is-playing", marchPlaying);
      pahimakasMarchButton.setAttribute("aria-pressed", marchPlaying ? "true" : "false");
      pahimakasMarchButton.setAttribute(
        "aria-label",
        marchPlaying ? "Pause the Pahimakas funeral march" : "Play the Pahimakas funeral march"
      );
    }

    renderSubtitle();
  }

  function playAudioForEntry(entry, language, shouldRestart) {
    stopPahimakasMarch(true);

    var audioConfig = getActiveNarrationAudioConfig();
    var nextSrc = resolveAudioSource(audioConfig, language);
    if (!nextSrc) {
      stopActiveAudio(true);
      updateNarrationControls();
      return;
    }

    var preferredLanguage = language === "en" ? "en" : "tl";
    var resolvedLanguage = String(audioConfig[preferredLanguage] || "").trim() ? preferredLanguage : preferredLanguage === "tl" ? "en" : "tl";
    var audioEl = ensureAudioElement();
    var currentSrc = audioEl.getAttribute("data-audio-src") || "";

    runtime.audioLanguage = resolvedLanguage;
    runtime.audioPriming = false;
    audioEl.removeAttribute("data-audio-prime");
    audioEl.muted = runtime.narrationMuted;

    if (shouldRestart || currentSrc !== nextSrc) {
      audioEl.pause();
      audioEl.src = nextSrc;
      audioEl.setAttribute("data-audio-src", nextSrc);
      try {
        audioEl.currentTime = 0;
      } catch (error) {
        return;
      }
    }

    runtime.pendingAudioSrc = nextSrc;

    var playResult = audioEl.play();
    if (!playResult || typeof playResult.then !== "function") {
      runtime.pendingAudioSrc = "";
      removePendingAudioUnlockHandler();
      updateNarrationControls();
      return;
    }

    playResult
      .then(function () {
        runtime.pendingAudioSrc = "";
        runtime.audioPrimed = true;
        removeAudioPrimeHandler();
        removePendingAudioUnlockHandler();
      })
      .catch(function () {
        schedulePendingAudioRetry();
      });

    updateNarrationControls();
  }

  function prefetchArtifactDescription(entry) {
    if (!entry || entry.descriptionAudioPrefetched || typeof window.fetch !== "function") {
      return;
    }

    entry.descriptionAudioPrefetched = true;
    var audioConfig = getEntryAudioConfig(entry);
    var urls = audioConfig ? [audioConfig.tl, audioConfig.en].filter(Boolean) : [];
    urls.forEach(function (url) {
      window.fetch(url, { cache: "force-cache" }).then(function (response) {
        if (!response.ok) {
          throw new Error("HTTP " + response.status);
        }
        return response.arrayBuffer();
      }).catch(function (error) {
        console.warn("[AR] Unable to prefetch an artifact narration.", entry.key, error);
      });
    });
  }

  function playPuzzleGuidanceForEntry(entry, state, language) {
    if (!entry || !entry.puzzle || !PUZZLE_HINTS[state]) {
      return;
    }

    runtime.activeNarrationKind = "guidance";
    runtime.activeGuidanceState = state;
    entry.puzzle.lastGuidanceNarratedState = state;
    playAudioForEntry(entry, language || runtime.audioLanguage, true);
  }

  function playArtifactDescriptionForEntry(entry, language) {
    if (!entry || !entry.puzzleSolved) {
      return;
    }

    runtime.activeNarrationKind = "artifact";
    runtime.activeGuidanceState = "";
    playAudioForEntry(entry, language || runtime.audioLanguage, true);
  }

  function beginNarrationForEntry(entry) {
    if (!entry) {
      return;
    }

    runtime.narrationPausedByUser = false;
    prefetchArtifactDescription(entry);

    if (entry.puzzleSolved) {
      if (entry.solvedAnnouncementPending && entry.puzzle) {
        playPuzzleGuidanceForEntry(entry, "solved", runtime.audioLanguage);
      } else {
        playArtifactDescriptionForEntry(entry, runtime.audioLanguage);
      }
      return;
    }

    if (!entry.puzzle) {
      stopActiveAudio(true);
      updateNarrationControls();
      return;
    }

    entry.puzzle.guidanceState = "far";
    entry.puzzle.pendingGuidanceState = "far";
    entry.puzzle.guidanceStateSince = 0;
    entry.puzzle.initialGuidanceFinished = false;
    entry.puzzle.lastGuidanceNarratedState = "";
    playPuzzleGuidanceForEntry(entry, "far", runtime.audioLanguage);
  }

  function updatePuzzleGuidanceForEntry(entry, state, nowMs) {
    if (!entry || !entry.puzzle || entry.puzzleSolved || !PUZZLE_HINTS[state]) {
      return;
    }

    var puzzle = entry.puzzle;
    var currentTime = clampNumber(nowMs, performance.now(), 0, Number.MAX_SAFE_INTEGER);

    if (puzzle.pendingGuidanceState !== state) {
      puzzle.pendingGuidanceState = state;
      puzzle.guidanceStateSince = currentTime;
      return;
    }

    if (
      puzzle.guidanceState === state ||
      currentTime - puzzle.guidanceStateSince < PUZZLE.guidanceDebounceMs
    ) {
      return;
    }

    puzzle.guidanceState = state;

    // Returning to the far zone rearms both proximity messages. Re-entering
    // warm or hot can therefore narrate that cue again during the same scan.
    if (state === "far") {
      puzzle.lastGuidanceNarratedState = "far";
      return;
    }

    if (
      runtime.activeAudioEntry !== entry ||
      !puzzle.initialGuidanceFinished ||
      runtime.narrationPausedByUser ||
      puzzle.lastGuidanceNarratedState === state
    ) {
      return;
    }

    playPuzzleGuidanceForEntry(entry, state, runtime.audioLanguage);
  }

  function handlePuzzleSolved(entry) {
    if (!entry || runtime.activeAudioEntry !== entry) {
      return;
    }

    if (runtime.narrationPausedByUser) {
      updateNarrationControls();
      return;
    }

    playPuzzleGuidanceForEntry(entry, "solved", runtime.audioLanguage);
  }

  function handleNarrationEnded() {
    var entry = runtime.activeAudioEntry;
    if (!entry || !entry.isVisibleStable || runtime.narrationPausedByUser) {
      updateNarrationControls();
      return;
    }

    if (runtime.activeNarrationKind !== "guidance") {
      updateNarrationControls();
      return;
    }

    if (runtime.activeGuidanceState === "solved") {
      entry.solvedAnnouncementPending = false;
      playArtifactDescriptionForEntry(entry, runtime.audioLanguage);
      return;
    }

    if (!entry.puzzle) {
      updateNarrationControls();
      return;
    }

    if (runtime.activeGuidanceState === "far") {
      entry.puzzle.initialGuidanceFinished = true;
    }

    if (entry.puzzleSolved) {
      playPuzzleGuidanceForEntry(entry, "solved", runtime.audioLanguage);
      return;
    }

    var nextState = entry.puzzle.guidanceState;
    if (
      (nextState === "warm" || nextState === "hot") &&
      entry.puzzle.lastGuidanceNarratedState !== nextState
    ) {
      playPuzzleGuidanceForEntry(entry, nextState, runtime.audioLanguage);
      return;
    }

    updateNarrationControls();
  }

  function getPreferredAudioEntry() {
    var visibleEntries = runtime.markerEntries.filter(function (entry) {
      return Boolean(entry && entry.modelLoaded && entry.isVisibleStable && entry.renderRoot && entry.renderRoot.visible);
    });

    if (!visibleEntries.length) {
      return null;
    }

    if (runtime.activeAudioEntry) {
      var activeStillVisible = visibleEntries.find(function (entry) {
        return entry.key === runtime.activeAudioEntry.key;
      });

      if (activeStillVisible) {
        return activeStillVisible;
      }
    }

    visibleEntries.sort(function (entryA, entryB) {
      return clampNumber(entryB.lastSeenAt, 0, 0, Number.MAX_SAFE_INTEGER) - clampNumber(entryA.lastSeenAt, 0, 0, Number.MAX_SAFE_INTEGER);
    });

    return visibleEntries[0] || null;
  }

  function syncActiveAudioEntry() {
    var nextEntry = getPreferredAudioEntry();

    if (!nextEntry) {
      if (runtime.activeAudioEntry) {
        runtime.activeAudioEntry = null;
        runtime.activeNarrationKind = "";
        runtime.activeGuidanceState = "";
        runtime.narrationPausedByUser = false;
        stopActiveAudio(true);
        updateNarrationControls();
      }
      return;
    }

    if (!runtime.activeAudioEntry || runtime.activeAudioEntry.key !== nextEntry.key) {
      runtime.activeAudioEntry = nextEntry;
      beginNarrationForEntry(nextEntry);
      return;
    }

  }

  function handleLanguageToggleClick() {
    if (!runtime.activeAudioEntry) {
      return;
    }

    var nextLanguage = runtime.audioLanguage === "tl" ? "en" : "tl";
    runtime.narrationPausedByUser = false;
    if (
      runtime.activeAudioEntry.puzzleSolved &&
      runtime.activeAudioEntry.solvedAnnouncementPending
    ) {
      playPuzzleGuidanceForEntry(runtime.activeAudioEntry, "solved", nextLanguage);
    } else {
      playAudioForEntry(runtime.activeAudioEntry, nextLanguage, true);
    }
  }

  function handleListenClick() {
    if (!runtime.activeAudioEntry) {
      return;
    }

    removePendingAudioUnlockHandler();
    stopPahimakasMarch(true);

    if (runtime.audioElement && !runtime.audioElement.paused) {
      runtime.narrationPausedByUser = true;
      runtime.audioElement.pause();
      updateNarrationControls();
      return;
    }

    runtime.narrationPausedByUser = false;

    if (runtime.audioElement && runtime.audioElement.getAttribute("data-audio-src") && !runtime.audioElement.ended) {
      runtime.pendingAudioSrc = runtime.audioElement.getAttribute("data-audio-src") || "";
      retryPendingAudioPlayback();
      updateNarrationControls();
      return;
    }

    playAudioForEntry(runtime.activeAudioEntry, runtime.audioLanguage, true);
  }

  function handleMuteClick() {
    if (!runtime.activeAudioEntry) {
      return;
    }

    runtime.narrationMuted = !runtime.narrationMuted;
    if (runtime.audioElement) {
      runtime.audioElement.muted = runtime.narrationMuted;
    }
    if (runtime.marchAudioElement) {
      runtime.marchAudioElement.muted = runtime.narrationMuted;
    }
    updateNarrationControls();
  }

  function handlePahimakasMarchClick() {
    var entry = runtime.activeAudioEntry;
    if (!entry || entry.key !== "pahimakas" || !entry.alternateAudioUrl) {
      return;
    }

    var marchAudio = ensureMarchAudioElement();
    if (!marchAudio.paused && !marchAudio.ended) {
      marchAudio.pause();
      updateNarrationControls();
      return;
    }

    removePendingAudioUnlockHandler();
    runtime.pendingAudioSrc = "";
    if (runtime.audioElement) {
      runtime.audioElement.pause();
    }

    var currentSrc = marchAudio.getAttribute("data-march-src") || "";
    if (currentSrc !== entry.alternateAudioUrl) {
      marchAudio.src = entry.alternateAudioUrl;
      marchAudio.setAttribute("data-march-src", entry.alternateAudioUrl);
      try {
        marchAudio.currentTime = 0;
      } catch (error) {
        return;
      }
    } else if (marchAudio.ended) {
      try {
        marchAudio.currentTime = 0;
      } catch (error) {
        return;
      }
    }

    marchAudio.muted = runtime.narrationMuted;
    var playResult = marchAudio.play();
    if (playResult && typeof playResult.catch === "function") {
      playResult.catch(function (error) {
        console.warn("[AR] Unable to play the Pahimakas funeral march.", error);
        updateNarrationControls();
      });
    }
    updateNarrationControls();
  }

  function handleSubtitlesClick() {
    if (!runtime.activeAudioEntry || !getActiveSubtitle()) {
      return;
    }

    runtime.subtitlesOn = !runtime.subtitlesOn;
    updateNarrationControls();
  }

  function configureBackButton() {
    if (!backButton) {
      return;
    }

    try {
      if (new URLSearchParams(window.location.search).get("from") === "stop3") {
        backButton.setAttribute("href", "/trail#stop-3");
        backButton.setAttribute("aria-label", "Back to Heritage Trail Stop 3");
      }
    } catch (error) {
      return;
    }
  }

  function bindNarrationControls() {
    if (listenButton) {
      listenButton.addEventListener("click", handleListenClick);
    }
    if (muteButton) {
      muteButton.addEventListener("click", handleMuteClick);
    }
    if (languageButton) {
      languageButton.addEventListener("click", handleLanguageToggleClick);
    }
    if (subtitlesButton) {
      subtitlesButton.addEventListener("click", handleSubtitlesClick);
    }
    if (pahimakasMarchButton) {
      pahimakasMarchButton.addEventListener("click", handlePahimakasMarchClick);
    }

    configureBackButton();
    updateNarrationControls();
  }

  function updateSmoothedPose(entry, nowMs) {
    if (!entry || !entry.trackingRoot || !entry.renderRoot) {
      return;
    }

    entry.trackingRoot.updateMatrixWorld(true);
    entry.trackingRoot.matrixWorld.decompose(entry.rawPosition, entry.rawQuaternion, entry.rawScale);

    if (!entry.hasSmoothedPose) {
      entry.smoothedPosition.copy(entry.rawPosition);
      entry.smoothedQuaternion.copy(entry.rawQuaternion);
      entry.smoothedScale.copy(entry.rawScale);
      entry.hasSmoothedPose = true;
      entry.lastPoseAt = nowMs;
    } else {
      var deltaMs = nowMs - entry.lastPoseAt;
      var angleDelta = entry.smoothedQuaternion.angleTo(entry.rawQuaternion);
      var positionDelta = entry.smoothedPosition.distanceTo(entry.rawPosition);

      if (
        positionDelta >= CONFIG.poseFilter.snapPositionDistance ||
        angleDelta >= degToRad(CONFIG.poseFilter.snapAngleDegrees)
      ) {
        entry.smoothedPosition.copy(entry.rawPosition);
        entry.smoothedQuaternion.copy(entry.rawQuaternion);
        entry.smoothedScale.copy(entry.rawScale);
      } else {
        var positionLerp = getAdaptiveLerp(CONFIG.poseFilter.positionLerp, deltaMs);
        var rotationLerp = getAdaptiveLerp(CONFIG.poseFilter.rotationLerp, deltaMs);
        var scaleLerp = getAdaptiveLerp(CONFIG.poseFilter.scaleLerp, deltaMs);

        entry.smoothedPosition.lerp(entry.rawPosition, positionLerp);
        if (IS_MOBILE) {
          entry.smoothedQuaternion.copy(entry.rawQuaternion);
        } else {
          entry.smoothedQuaternion.slerp(entry.rawQuaternion, rotationLerp);
        }
        entry.smoothedScale.lerp(entry.rawScale, scaleLerp);
      }

      entry.lastPoseAt = nowMs;
    }

    entry.renderRoot.position.copy(entry.smoothedPosition);
    entry.renderRoot.quaternion.copy(entry.smoothedQuaternion);
    entry.renderRoot.scale.copy(entry.smoothedScale);
  }

  function updateMarkerVisibility(nowMs) {
    runtime.markerEntries.forEach(function (entry) {
      if (!entry || !entry.trackingRoot || !entry.renderRoot) {
        return;
      }

      var markerVisible = Boolean(entry.trackingRoot.visible);

      if (markerVisible) {
        clearMarkerLostTimer(entry);
        entry.lastSeenAt = nowMs;
        updateSmoothedPose(entry, nowMs);
        entry.renderRoot.visible = true;

        if (!entry.isVisibleStable) {
          entry.isVisibleStable = true;
          sendAnalytics("marker_found", { marker: entry.key });
        }

        return;
      }

      if (entry.isVisibleStable && nowMs - entry.lastSeenAt <= CONFIG.markerVisibilityHoldMs) {
        entry.renderRoot.visible = true;
        return;
      }

      scheduleMarkerLost(entry);
    });

    syncActiveAudioEntry();
    updateAnamorphicPuzzles(nowMs);
  }

  function updateGroundOccluder(entry, modelSettings, size, fitScale) {
    if (!entry || !entry.occluderRoot || !modelSettings || !size) {
      return;
    }

    var occluderConfig = modelSettings.occluder || {};
    if (occluderConfig.enabled === false) {
      return;
    }

    var sizeMultiplier = clampNumber(occluderConfig.sizeMultiplier, 1.15, 0.4, 4);
    var footprint = Math.max(size.x, size.z, 0.001) * fitScale;
    var planeSize = clampNumber(footprint * sizeMultiplier, modelSettings.targetSize, 0.02, 6);
    var yOffset = clampNumber(occluderConfig.yOffset, 0.001, -0.1, 0.1);

    if (entry.occluderMesh && entry.occluderMesh.geometry) {
      entry.occluderMesh.geometry.dispose();
      entry.occluderMesh.geometry = new THREE_NS.PlaneGeometry(planeSize, planeSize);
      entry.occluderMesh.position.y = yOffset;
      return;
    }

    var material = new THREE_NS.MeshBasicMaterial({
      color: 0x000000,
      depthWrite: true,
      depthTest: true,
      side: THREE_NS.DoubleSide,
    });
    material.colorWrite = false;

    var occluderMesh = new THREE_NS.Mesh(new THREE_NS.PlaneGeometry(planeSize, planeSize), material);
    occluderMesh.rotation.x = -Math.PI * 0.5;
    occluderMesh.position.y = yOffset;
    occluderMesh.renderOrder = -1000;
    occluderMesh.layers.set(OCCLUSION_LAYER);

    entry.occluderRoot.add(occluderMesh);
    entry.occluderMesh = occluderMesh;
  }

  function tuneModelMaterials(meshRoot) {
    if (!meshRoot || typeof meshRoot.traverse !== "function") {
      return;
    }

    var maxAnisotropy = 0;
    if (runtime.renderer && runtime.renderer.capabilities && typeof runtime.renderer.capabilities.getMaxAnisotropy === "function") {
      maxAnisotropy = Math.min(runtime.renderer.capabilities.getMaxAnisotropy(), CONFIG.renderer.maxAnisotropy);
    }

    meshRoot.traverse(function (node) {
      if (!node || !node.isMesh) {
        return;
      }

      node.frustumCulled = false;
      node.layers.set(CONTENT_LAYER);

      var materials = Array.isArray(node.material) ? node.material : [node.material];
      materials.forEach(function (material) {
        if (!material) {
          return;
        }

        ["map", "normalMap", "roughnessMap", "metalnessMap", "emissiveMap"].forEach(function (textureKey) {
          var texture = material[textureKey];
          if (!texture) {
            return;
          }

          if (maxAnisotropy > 0) {
            texture.anisotropy = maxAnisotropy;
          }

          if (textureKey === "map" || textureKey === "emissiveMap") {
            if ("colorSpace" in texture && THREE_NS.SRGBColorSpace) {
              texture.colorSpace = THREE_NS.SRGBColorSpace;
            } else if ("encoding" in texture && THREE_NS.sRGBEncoding) {
              texture.encoding = THREE_NS.sRGBEncoding;
            }
          }

          texture.needsUpdate = true;
        });

        material.needsUpdate = true;
      });
    });
  }

  /* ==== Anamorphic puzzle ====================================================
     The artifact appears as broken shards floating apart. Each shard is
     displaced ALONG ONE HIDDEN SIGHT-LINE and scaled by (D + t) / D — a true
     anamorphosis: viewed from that exact direction the perspective projection
     realigns the pieces into the intact artifact; from anywhere else it reads
     as debris. Hold the correct angle briefly and the shards fly home, the
     solve persists for the whole session, and a "view in your space"
     (Quick Look / Scene Viewer) button appears. */
  var PUZZLE = {
    pieces: 18,           // target shard count; denser break-up makes alignment harder
    eyeDistanceR: 6,      // eye distance along the sight-line, in bounding radii
    minOffsetR: 0.4,      // min |displacement| in radii (so it clearly looks broken)
    maxOffsetR: 1.5,      // max displacement in radii
    solveAngleDeg: 8,     // aligned when camera dir is within this of the sight-line
    warmAngleDeg: 30,     // hint feedback thresholds
    hotAngleDeg: 14,
    guidanceDebounceMs: 350, // require a stable zone before replaying its cue
    dwellMs: 450,         // must hold alignment this long
    settleMs: 1400,       // shard fly-home + solved-position animation time
    elevationDeg: 35,     // sight-line tilt above the marker plane
  };

  function puzzleStorageKey(key) {
    return "arPuzzleSolved:" + key;
  }

  function isPuzzleSolvedInSession(key) {
    try {
      return window.sessionStorage.getItem(puzzleStorageKey(key)) === "1";
    } catch (error) {
      return false;
    }
  }

  function markPuzzleSolvedInSession(key) {
    try {
      window.sessionStorage.setItem(puzzleStorageKey(key), "1");
    } catch (error) {
      /* private mode — solved state just won't survive reloads */
    }
  }

  // Local matrix of `obj` relative to `ancestor` (walks the parent chain).
  function getMatrixRelativeTo(obj, ancestor) {
    var matrix = new THREE_NS.Matrix4();
    var node = obj;
    while (node && node !== ancestor) {
      node.updateMatrix();
      matrix.premultiply(node.matrix);
      node = node.parent;
    }
    return matrix;
  }

  /* Split a geometry into `pieceCount` jagged shards: cluster triangles around
     k seed centroids (a light k-means), then rebuild one geometry per cluster
     with every vertex attribute preserved. */
  function splitGeometryIntoShards(geometry, pieceCount) {
    var source = geometry.index ? geometry.toNonIndexed() : geometry.clone();
    var positions = source.getAttribute("position");
    if (!positions) {
      source.dispose();
      return null;
    }

    // Interleaved attributes use a strided layout this splitter can't slice —
    // leave such a mesh whole rather than corrupt it.
    var interleaved = Object.keys(source.attributes).some(function (name) {
      return Boolean(source.attributes[name].isInterleavedBufferAttribute);
    });
    if (interleaved) {
      source.dispose();
      return null;
    }

    var triangleCount = Math.floor(positions.count / 3);
    var k = Math.max(2, Math.min(pieceCount, triangleCount));

    var centroids = new Float32Array(triangleCount * 3);
    for (var t = 0; t < triangleCount; t += 1) {
      var base = t * 9;
      centroids[t * 3] = (positions.array[base] + positions.array[base + 3] + positions.array[base + 6]) / 3;
      centroids[t * 3 + 1] = (positions.array[base + 1] + positions.array[base + 4] + positions.array[base + 7]) / 3;
      centroids[t * 3 + 2] = (positions.array[base + 2] + positions.array[base + 5] + positions.array[base + 8]) / 3;
    }

    // Seed the cluster means from evenly spread triangles, then refine.
    var means = [];
    for (var seed = 0; seed < k; seed += 1) {
      var pick = Math.floor((seed + 0.5) * (triangleCount / k)) * 3;
      means.push([centroids[pick], centroids[pick + 1], centroids[pick + 2]]);
    }

    var assignment = new Uint32Array(triangleCount);
    for (var iter = 0; iter < 8; iter += 1) {
      var sums = [];
      var counts = [];
      for (var c = 0; c < k; c += 1) {
        sums.push([0, 0, 0]);
        counts.push(0);
      }
      for (var tri = 0; tri < triangleCount; tri += 1) {
        var cx = centroids[tri * 3];
        var cy = centroids[tri * 3 + 1];
        var cz = centroids[tri * 3 + 2];
        var best = 0;
        var bestDist = Infinity;
        for (var m = 0; m < k; m += 1) {
          var dx = cx - means[m][0];
          var dy = cy - means[m][1];
          var dz = cz - means[m][2];
          var dist = dx * dx + dy * dy + dz * dz;
          if (dist < bestDist) {
            bestDist = dist;
            best = m;
          }
        }
        assignment[tri] = best;
        sums[best][0] += cx;
        sums[best][1] += cy;
        sums[best][2] += cz;
        counts[best] += 1;
      }
      for (var mm = 0; mm < k; mm += 1) {
        if (counts[mm] > 0) {
          means[mm][0] = sums[mm][0] / counts[mm];
          means[mm][1] = sums[mm][1] / counts[mm];
          means[mm][2] = sums[mm][2] / counts[mm];
        }
      }
    }

    var attributeNames = Object.keys(source.attributes);
    var shards = [];
    for (var cluster = 0; cluster < k; cluster += 1) {
      var triIndices = [];
      for (var ti = 0; ti < triangleCount; ti += 1) {
        if (assignment[ti] === cluster) {
          triIndices.push(ti);
        }
      }
      if (!triIndices.length) {
        continue;
      }

      var shardGeometry = new THREE_NS.BufferGeometry();
      attributeNames.forEach(function (name) {
        var attr = source.getAttribute(name);
        var itemSize = attr.itemSize;
        var out = new Float32Array(triIndices.length * 3 * itemSize);
        for (var idx = 0; idx < triIndices.length; idx += 1) {
          var start = triIndices[idx] * 3;
          for (var v = 0; v < 3; v += 1) {
            for (var comp = 0; comp < itemSize; comp += 1) {
              out[(idx * 3 + v) * itemSize + comp] = attr.array[(start + v) * itemSize + comp];
            }
          }
        }
        shardGeometry.setAttribute(name, new THREE_NS.BufferAttribute(out, itemSize));
      });
      shards.push(shardGeometry);
    }

    var result = shards.length >= 2 ? shards : null;
    source.dispose();
    return result;
  }

  function setupAnamorphicPuzzle(entry) {
    if (!entry || !entry.puzzleEnabled || !entry.modelScene) {
      if (entry && entry.puzzleEnabled) {
        console.warn("[AR puzzle] '" + entry.key + "' enabled but no modelScene to shatter.");
      }
      return false;
    }

    var modelSettings = getModelConfig(entry.key);
    var solvedPosition = Array.isArray(modelSettings.solvedPosition)
      ? modelSettings.solvedPosition
      : [0, 0, 0];
    var solvedContainerPosition = new THREE_NS.Vector3(
      clampNumber(solvedPosition[0], 0, -100, 100),
      clampNumber(solvedPosition[1], 0, -100, 100),
      clampNumber(solvedPosition[2], 0, -100, 100)
    );

    if (isPuzzleSolvedInSession(entry.key)) {
      entry.puzzleSolved = true; // intact for the whole session
      entry.modelContainer.position.copy(solvedContainerPosition);
      console.log("[AR puzzle] '" + entry.key + "' already solved this session — shown intact.");
      return true;
    }

    var scene = entry.modelScene;
    scene.updateMatrixWorld(true);

    // Model bounds in modelScene space — the puzzle's working space.
    var bounds = new THREE_NS.Box3().setFromObject(scene);
    if (bounds.isEmpty()) {
      return false;
    }
    var center = new THREE_NS.Vector3();
    var size = new THREE_NS.Vector3();
    bounds.getCenter(center);
    bounds.getSize(size);
    var radius = Math.max(size.x, size.y, size.z, 0.0001) * 0.5;

    // The hidden sight-line: random azimuth, fixed elevation above the marker.
    var azimuth = Math.random() * Math.PI * 2;
    var elevation = degToRad(PUZZLE.elevationDeg);
    var sight = new THREE_NS.Vector3(
      Math.cos(elevation) * Math.cos(azimuth),
      Math.sin(elevation),
      Math.cos(elevation) * Math.sin(azimuth)
    ).normalize();
    var eyeDistance = radius * PUZZLE.eyeDistanceR;
    var eye = center.clone().addScaledVector(sight, eyeDistance);

    // Collect meshes first (can't mutate the tree while traversing).
    var meshes = [];
    scene.traverse(function (node) {
      if (node.isMesh && node.geometry && !Array.isArray(node.material)) {
        meshes.push(node);
      }
    });
    if (!meshes.length) {
      return false;
    }

    var piecesPerMesh = Math.max(2, Math.round(PUZZLE.pieces / meshes.length));
    var shardRecords = [];

    meshes.forEach(function (mesh) {
      var shardGeometries = splitGeometryIntoShards(mesh.geometry, piecesPerMesh);
      if (!shardGeometries) {
        return;
      }

      // Replace the mesh with a group holding its shards (same local transform).
      var group = new THREE_NS.Group();
      group.position.copy(mesh.position);
      group.quaternion.copy(mesh.quaternion);
      group.scale.copy(mesh.scale);
      mesh.parent.add(group);
      mesh.parent.remove(mesh);

      var toScene = getMatrixRelativeTo(group, scene);
      var fromScene = toScene.clone().invert();

      shardGeometries.forEach(function (shardGeometry) {
        // Recenter the shard on its own centroid so position == home point.
        shardGeometry.computeBoundingBox();
        var home = new THREE_NS.Vector3();
        shardGeometry.boundingBox.getCenter(home);
        shardGeometry.translate(-home.x, -home.y, -home.z);

        var shard = new THREE_NS.Mesh(shardGeometry, mesh.material);
        shard.position.copy(home);
        group.add(shard);

        // Anamorphic scatter: push along the sight-line, scale about the eye.
        var homeScene = home.clone().applyMatrix4(toScene);
        var offset = (PUZZLE.minOffsetR + Math.random() * (PUZZLE.maxOffsetR - PUZZLE.minOffsetR)) * radius;
        if (Math.random() < 0.45) {
          offset = -offset * 0.55; // some shards float toward the viewer
        }
        var scale = (eyeDistance + offset) / eyeDistance;
        var scatterScene = eye.clone().add(homeScene.clone().sub(eye).multiplyScalar(scale));
        var scatterLocal = scatterScene.applyMatrix4(fromScene);

        shard.position.copy(scatterLocal);
        shard.scale.setScalar(scale);

        shardRecords.push({
          mesh: shard,
          home: home.clone(),
          scatterPosition: scatterLocal.clone(),
          scatterScale: scale,
        });
      });
    });

    if (!shardRecords.length) {
      return false;
    }

    entry.puzzle = {
      shards: shardRecords,
      center: center,
      sight: sight,
      alignedSince: 0,
      solving: false,
      solveStartedAt: 0,
      guidanceState: "far",
      pendingGuidanceState: "far",
      guidanceStateSince: 0,
      initialGuidanceFinished: false,
      lastGuidanceNarratedState: "",
      brokenContainerPosition: entry.modelContainer.position.clone(),
      solvedContainerPosition: solvedContainerPosition,
    };

    console.log("[AR puzzle] '" + entry.key + "' shattered into " + shardRecords.length + " shards.");
    sendAnalytics("puzzle_started", { marker: entry.key });
    return true;
  }

  /* --- Puzzle hint chip ---------------------------------------------------- */
  var PUZZLE_HINTS = {
    far: {
      en: "A broken artifact… move around to find the right angle",
      tl: "May basag na artifact… gumalaw upang mahanap ang tamang anggulo",
      audioByLanguage: {
        en: "/audio/ARContents/InMess-eng.mp3",
        tl: "/audio/ARContents/InMess-tg.mp3",
      },
    },
    warm: {
      en: "Getting closer… keep adjusting your angle",
      tl: "Papalapit ka na… ituloy ang paghahanap ng anggulo",
      audioByLanguage: {
        en: "/audio/ARContents/GetClose-eng.mp3",
        tl: "/audio/ARContents/GetClose-tg.mp3",
      },
    },
    hot: {
      en: "Almost there — hold steady…",
      tl: "Malapit na — steady lang…",
      audioByLanguage: {
        en: "/audio/ARContents/Almost-eng.mp3",
        tl: "/audio/ARContents/Almost-tg.mp3",
      },
    },
    solved: {
      en: "Restored! The artifact is whole again.",
      tl: "Naibuo! Muli nang buo ang artifact.",
      audioByLanguage: {
        en: "/audio/ARContents/solved-eng.mp3",
        tl: "/audio/ARContents/solved-tg.mp3",
      },
    },
    noAr: {
      en: "AR view is not supported on this device or browser.",
      tl: "Hindi suportado ang AR view sa device o browser na ito.",
    },
  };

  function preloadPuzzleGuidanceAudio() {
    if (typeof window.fetch !== "function") {
      return Promise.resolve();
    }

    var urls = [];
    ["far", "warm", "hot", "solved"].forEach(function (state) {
      var audioConfig = PUZZLE_HINTS[state] && PUZZLE_HINTS[state].audioByLanguage;
      if (audioConfig) {
        urls.push(audioConfig.tl, audioConfig.en);
      }
    });

    return Promise.all(urls.filter(Boolean).map(function (url) {
      return window.fetch(url, { cache: "force-cache" }).then(function (response) {
        if (!response.ok) {
          throw new Error("Puzzle guidance audio returned HTTP " + response.status + ": " + url);
        }
        return response.arrayBuffer();
      });
    }));
  }

  function ensurePuzzleHint() {
    if (runtime.puzzleHintEl) {
      return runtime.puzzleHintEl;
    }
    var hint = document.createElement("div");
    hint.className = "ar-puzzle-hint";
    hint.hidden = true;
    hint.setAttribute("role", "status");
    hint.setAttribute("aria-live", "polite");
    document.body.appendChild(hint);
    runtime.puzzleHintEl = hint;
    return hint;
  }

  function setPuzzleHint(state) {
    var hint = ensurePuzzleHint();
    if (!state) {
      hint.hidden = true;
      hint.className = "ar-puzzle-hint";
      runtime.puzzleHintState = "";
      return;
    }
    var language = runtime.audioLanguage === "en" ? "en" : "tl";
    var stateKey = state + ":" + language;
    if (runtime.puzzleHintState === stateKey && !hint.hidden) {
      return;
    }
    runtime.puzzleHintState = stateKey;
    hint.textContent = (PUZZLE_HINTS[state] && PUZZLE_HINTS[state][language]) || "";
    hint.className = "ar-puzzle-hint is-visible is-" + state;
    hint.hidden = false;
  }

  function flashPuzzleHint(state, holdMs) {
    setPuzzleHint(state);
    window.clearTimeout(runtime.puzzleHintTimerId);
    runtime.puzzleHintTimerId = window.setTimeout(function () {
      setPuzzleHint("");
    }, holdMs || 2600);
  }

  /* --- View in your space (Quick Look / Scene Viewer) ----------------------- */
  function ensureQuickLookViewer(modelUrl) {
    if (runtime.quickLookViewer) {
      if (modelUrl && runtime.quickLookViewer.getAttribute("src") !== modelUrl) {
        runtime.quickLookViewer.setAttribute("src", modelUrl);
      }
      return runtime.quickLookViewer;
    }
    var viewer = document.createElement("model-viewer");
    viewer.setAttribute("ar", "");
    viewer.setAttribute("ar-modes", "webxr scene-viewer quick-look");
    if (modelUrl) {
      viewer.setAttribute("src", modelUrl);
    }
    // Kept offscreen but rendered — Quick Look needs a live element.
    viewer.style.cssText = "position:fixed;left:-9999px;bottom:0;width:2px;height:2px;opacity:0.01;pointer-events:none;";
    document.body.appendChild(viewer);
    runtime.quickLookViewer = viewer;
    return viewer;
  }

  /* --- Touch-drag to rotate the on-screen artifact -------------------------
     A drag on the camera view spins the artifact the marker is showing. During
     the anamorphic puzzle this is a second way to hunt the alignment angle
     (rotating the model is equivalent to circling it); afterwards it lets the
     visitor turn the restored piece to inspect it. */
  function applyEntryUserRotation(entry) {
    if (!entry || !entry.modelContainer || !entry.baseRotation) {
      return;
    }
    entry.modelContainer.rotation.set(
      entry.baseRotation.x + entry.userPitch,
      entry.baseRotation.y + entry.userYaw,
      entry.baseRotation.z
    );
  }

  function getActiveVisibleEntry() {
    var visible = runtime.markerEntries.filter(function (entry) {
      return entry && entry.modelLoaded && entry.renderRoot && entry.renderRoot.visible && entry.isVisibleStable;
    });
    if (!visible.length) {
      return null;
    }
    visible.sort(function (a, b) {
      return b.lastSeenAt - a.lastSeenAt; // most recently seen wins
    });
    return visible[0];
  }

  function isRotationBlockingTarget(target) {
    return Boolean(target && target.closest && target.closest(".ar-dock, .ar-puzzle-hint, button, a"));
  }

  function setupModelRotationControls() {
    var sceneEl = document.getElementById("arScene");

    var onPointerDown = function (event) {
      if (isRotationBlockingTarget(event.target)) {
        return; // let the controls handle their own taps
      }
      var entry = getActiveVisibleEntry();
      if (!entry) {
        return;
      }
      runtime.modelDrag.active = true;
      runtime.modelDrag.pointerId = event.pointerId;
      runtime.modelDrag.lastX = event.clientX;
      runtime.modelDrag.lastY = event.clientY;
      runtime.modelDrag.entry = entry;
      if (sceneEl) {
        sceneEl.classList.add("is-rotating");
      }
    };

    var onPointerMove = function (event) {
      var drag = runtime.modelDrag;
      if (!drag.active || event.pointerId !== drag.pointerId || !drag.entry) {
        return;
      }
      var dx = event.clientX - drag.lastX;
      var dy = event.clientY - drag.lastY;
      drag.lastX = event.clientX;
      drag.lastY = event.clientY;
      drag.entry.userYaw += dx * 0.011; // ~0.63°/px horizontal spin
      drag.entry.userPitch = clampNumber(drag.entry.userPitch + dy * 0.009, 0, -1.05, 1.05); // ±60° tilt
      applyEntryUserRotation(drag.entry);
    };

    var onPointerUp = function (event) {
      var drag = runtime.modelDrag;
      if (drag.pointerId !== null && event.pointerId !== drag.pointerId) {
        return;
      }
      drag.active = false;
      drag.pointerId = null;
      drag.entry = null;
      if (sceneEl) {
        sceneEl.classList.remove("is-rotating");
      }
    };

    document.addEventListener("pointerdown", onPointerDown, { passive: true });
    document.addEventListener("pointermove", onPointerMove, { passive: true });
    document.addEventListener("pointerup", onPointerUp, { passive: true });
    document.addEventListener("pointercancel", onPointerUp, { passive: true });

    runtime.modelRotationHandlers = {
      onPointerDown: onPointerDown,
      onPointerMove: onPointerMove,
      onPointerUp: onPointerUp,
    };
  }

  function bindViewInSpaceButton() {
    var button = document.getElementById("arViewInSpace");
    if (!button) {
      return;
    }
    runtime.viewInSpaceButton = button;
    button.addEventListener("click", function () {
      var entry = runtime.solvedPuzzleEntry;
      if (!entry || !entry.modelUrl) {
        return;
      }
      var viewer = ensureQuickLookViewer(entry.modelUrl);
      var launch = function () {
        try {
          if (viewer.canActivateAR && typeof viewer.activateAR === "function") {
            viewer.activateAR();
          } else {
            flashPuzzleHint("noAr", 3600);
          }
        } catch (error) {
          flashPuzzleHint("noAr", 3600);
        }
      };
      if (window.customElements && window.customElements.whenDefined) {
        window.customElements.whenDefined("model-viewer").then(launch, launch);
      } else {
        launch();
      }
    });
  }

  function setViewInSpaceVisible(entry, visible) {
    var button = runtime.viewInSpaceButton;
    if (!button) {
      return;
    }
    if (visible && entry) {
      runtime.solvedPuzzleEntry = entry;
      ensureQuickLookViewer(entry.modelUrl); // preload so Quick Look is instant
    }
    button.hidden = !visible;
    button.disabled = !visible;
  }

  /* --- Per-frame puzzle update ---------------------------------------------- */
  var PUZZLE_TMP_CAMERA = null;

  function solvePuzzleShardsProgress(entry, puzzle, progress) {
    var eased = 1 - Math.pow(1 - progress, 3); // easeOutCubic
    puzzle.shards.forEach(function (record) {
      record.mesh.position.lerpVectors(record.scatterPosition, record.home, eased);
      var scale = record.scatterScale + (1 - record.scatterScale) * eased;
      record.mesh.scale.setScalar(scale);
    });

    if (entry && entry.modelContainer) {
      entry.modelContainer.position.lerpVectors(
        puzzle.brokenContainerPosition,
        puzzle.solvedContainerPosition,
        eased
      );
    }
  }

  function updateAnamorphicPuzzles(nowMs) {
    var anySolvedVisible = null;

    runtime.markerEntries.forEach(function (entry) {
      if (!entry || !entry.puzzleEnabled || !entry.modelLoaded) {
        return;
      }

      var visible = Boolean(entry.renderRoot && entry.renderRoot.visible && entry.isVisibleStable);

      if (entry.puzzleSolved) {
        if (visible) {
          anySolvedVisible = entry;
        }
        return;
      }

      var puzzle = entry.puzzle;
      if (!puzzle) {
        return;
      }

      if (!visible) {
        puzzle.alignedSince = 0;
        return;
      }

      // Let the initial instruction finish before accepting alignment. This
      // guarantees the spoken sequence begins with the complete explanation.
      if (!puzzle.initialGuidanceFinished) {
        puzzle.alignedSince = 0;
        return;
      }

      if (puzzle.solving) {
        var progress = Math.min(1, (nowMs - puzzle.solveStartedAt) / PUZZLE.settleMs);
        solvePuzzleShardsProgress(entry, puzzle, progress);
        if (progress >= 1) {
          puzzle.solving = false;
          entry.puzzleSolved = true;
          entry.solvedAnnouncementPending = true;
          markPuzzleSolvedInSession(entry.key);
          handlePuzzleSolved(entry);
          sendAnalytics("puzzle_solved", { marker: entry.key });
        }
        return;
      }

      // Camera (world origin) direction in modelScene space vs the sight-line.
      if (!PUZZLE_TMP_CAMERA) {
        PUZZLE_TMP_CAMERA = new THREE_NS.Vector3();
      }
      entry.modelScene.updateWorldMatrix(true, false);
      PUZZLE_TMP_CAMERA.set(0, 0, 0);
      entry.modelScene.worldToLocal(PUZZLE_TMP_CAMERA);
      var direction = PUZZLE_TMP_CAMERA.sub(puzzle.center);
      if (direction.lengthSq() < 0.000001) {
        return;
      }
      direction.normalize();
      var angleDeg = Math.acos(Math.max(-1, Math.min(1, direction.dot(puzzle.sight)))) * (180 / Math.PI);

      if (angleDeg <= PUZZLE.solveAngleDeg) {
        if (!puzzle.alignedSince) {
          puzzle.alignedSince = nowMs;
        }
        updatePuzzleGuidanceForEntry(entry, "hot", nowMs);
        if (puzzle.guidanceState !== "hot") {
          puzzle.alignedSince = 0;
          return;
        }
        if (nowMs - puzzle.alignedSince >= PUZZLE.dwellMs) {
          puzzle.solving = true;
          puzzle.solveStartedAt = nowMs;
        }
      } else {
        puzzle.alignedSince = 0;
        if (angleDeg <= PUZZLE.hotAngleDeg) {
          updatePuzzleGuidanceForEntry(entry, "hot", nowMs);
        } else if (angleDeg <= PUZZLE.warmAngleDeg) {
          updatePuzzleGuidanceForEntry(entry, "warm", nowMs);
        } else {
          updatePuzzleGuidanceForEntry(entry, "far", nowMs);
        }
      }
    });

    // The "view in your space" button lives while a solved artifact is on screen.
    setViewInSpaceVisible(anySolvedVisible, Boolean(anySolvedVisible));
  }

  function normalizeModel(entry, loadedScene, modelSettings) {
    if (!entry || !entry.modelContainer || !loadedScene) {
      return;
    }

    loadedScene.updateMatrixWorld(true);

    var bounds = new THREE_NS.Box3().setFromObject(loadedScene);
    if (bounds.isEmpty()) {
      throw new Error("Model bounds are empty.");
    }

    var size = new THREE_NS.Vector3();
    var center = new THREE_NS.Vector3();
    bounds.getSize(size);
    bounds.getCenter(center);

    var maxDimension = Math.max(size.x, size.y, size.z, 0.0001);
    var targetSize = clampNumber(modelSettings.targetSize, 0.75, 0.05, 3);
    var scaleMultiplier = clampNumber(modelSettings.scaleMultiplier, 1, 0.01, 20);
    var fitScale = clampNumber((targetSize / maxDimension) * scaleMultiplier, 1, 0.01, 6);

    loadedScene.position.x -= center.x;
    loadedScene.position.y -= bounds.min.y;
    loadedScene.position.z -= center.z;

    var position = Array.isArray(modelSettings.position) ? modelSettings.position : [0, 0, 0];
    entry.modelContainer.position.set(
      clampNumber(position[0], 0, -100, 100),
      clampNumber(position[1], 0, -100, 100),
      clampNumber(position[2], 0, -100, 100)
    );

    var rotation = Array.isArray(modelSettings.rotation) ? modelSettings.rotation : [0, 0, 0];
    entry.modelContainer.rotation.set(
      degToRad(clampNumber(rotation[0], 0, -360, 360)),
      degToRad(clampNumber(rotation[1], 0, -360, 360)),
      degToRad(clampNumber(rotation[2], 0, -360, 360))
    );

    // Remember the configured rotation so touch-drag rotates relative to it,
    // then re-apply any spin the visitor has already dialed in.
    entry.baseRotation = {
      x: entry.modelContainer.rotation.x,
      y: entry.modelContainer.rotation.y,
      z: entry.modelContainer.rotation.z,
    };
    applyEntryUserRotation(entry);

    entry.modelContainer.scale.setScalar(fitScale);
    updateGroundOccluder(entry, modelSettings, size, fitScale);
  }

  function loadMarkerModel(entry, markerConfig) {
    if (!runtime.loader || !entry) {
      return Promise.reject(new Error("The GLB loader is unavailable."));
    }

    return new Promise(function (resolve, reject) {
      runtime.loader.load(
        markerConfig.modelUrl,
        function (gltf) {
          // Yield once before the CPU-heavy normalization and shard build so
          // the branded loader can repaint between completed downloads.
          window.setTimeout(function () {
            try {
              if (runtime.destroyed) {
                throw new Error("AR preparation was cancelled.");
              }
              var scene = gltf && (gltf.scene || (gltf.scenes && gltf.scenes[0]));
              if (!scene) {
                throw new Error("GLB scene is empty.");
              }

              var modelSettings = getModelConfig(entry.key);
              tuneModelMaterials(scene);
              entry.modelScene = scene;
              entry.modelContainer.add(scene);
              normalizeModel(entry, scene, modelSettings);

              var puzzleReady = setupAnamorphicPuzzle(entry);
              if (entry.puzzleEnabled && !puzzleReady) {
                throw new Error("The anamorphic shards could not be prepared.");
              }

              entry.modelLoaded = true;
              sendAnalytics("model_loaded", { model: entry.key });
              resolve(entry);
            } catch (error) {
              entry.modelLoaded = false;
              sendAnalytics("model_error", {
                model: entry.key,
                error: parseErrorMessage(error),
              });
              reject(new Error(entry.key + ": " + parseErrorMessage(error)));
            }
          }, 0);
        },
        function (event) {
          reportModelDownload(entry.key, event);
        },
        function (error) {
          sendAnalytics("model_error", {
            model: entry.key,
            error: parseErrorMessage(error),
          });
          reject(new Error(entry.key + ": " + parseErrorMessage(error)));
        }
      );
    });
  }

  function preloadMarkerPattern(markerConfig) {
    if (!markerConfig || !markerConfig.patternUrl || typeof window.fetch !== "function") {
      return Promise.resolve();
    }
    return window.fetch(markerConfig.patternUrl, { cache: "force-cache" }).then(function (response) {
      if (!response.ok) {
        throw new Error(markerConfig.key + ": marker pattern returned HTTP " + response.status + ".");
      }
      return response.text(); // consume the response so the browser can cache it
    });
  }

  function buildMarkerEntries(markers) {
    runtime.markerEntries = [];
    var preparationTasks = [];

    markers.forEach(function (markerConfig) {
      var trackingRoot = new THREE_NS.Group();
      trackingRoot.visible = false;
      runtime.scene.add(trackingRoot);

      var renderRoot = new THREE_NS.Group();
      renderRoot.visible = false;
      runtime.scene.add(renderRoot);

      var occluderRoot = new THREE_NS.Group();
      occluderRoot.layers.set(OCCLUSION_LAYER);
      renderRoot.add(occluderRoot);

      var modelContainer = new THREE_NS.Group();
      modelContainer.layers.set(CONTENT_LAYER);
      renderRoot.add(modelContainer);

      var entry = {
        key: markerConfig.key,
        trackingRoot: trackingRoot,
        renderRoot: renderRoot,
        occluderRoot: occluderRoot,
        occluderMesh: null,
        markerControls: null,
        patternUrl: markerConfig.patternUrl,
        modelContainer: modelContainer,
        modelScene: null,
        audioByLanguage: markerConfig.audioByLanguage || null,
        alternateAudioUrl: markerConfig.alternateAudioUrl || "",
        modelUrl: markerConfig.modelUrl || "",
        puzzleEnabled: markerConfig.anamorphicPuzzle === true,
        puzzleSolved: false,
        puzzle: null,
        baseRotation: null, // configured rotation; user drag rotates on top
        userYaw: 0,
        userPitch: 0,
        modelLoaded: false,
        descriptionAudioPrefetched: false,
        solvedAnnouncementPending: false,
        isVisibleStable: false,
        lastSeenAt: 0,
        lostTimerId: 0,
        hasSmoothedPose: false,
        lastPoseAt: 0,
        rawPosition: new THREE_NS.Vector3(),
        rawQuaternion: new THREE_NS.Quaternion(),
        rawScale: new THREE_NS.Vector3(1, 1, 1),
        smoothedPosition: new THREE_NS.Vector3(),
        smoothedQuaternion: new THREE_NS.Quaternion(),
        smoothedScale: new THREE_NS.Vector3(1, 1, 1),
      };

      runtime.markerEntries.push(entry);
      preparationTasks.push(
        Promise.all([loadMarkerModel(entry, markerConfig), preloadMarkerPattern(markerConfig)]).then(function () {
          markModelPrepared(entry.key);
          return entry;
        })
      );
    });

    return Promise.all([Promise.all(preparationTasks), preloadPuzzleGuidanceAudio()]).then(function (results) {
      return results[0];
    });
  }

  function initRendererScene() {
    runtime.renderer = new THREE_NS.WebGLRenderer({
      alpha: true,
      antialias: false,
      precision: "highp",
      logarithmicDepthBuffer: false,
      powerPreference: "high-performance",
    });

    runtime.renderer.domElement.id = "ar-canvas";
    runtime.renderer.autoClear = false;
    runtime.renderer.setClearColor(0x000000, 0);
    rootEl.appendChild(runtime.renderer.domElement);

    configureRendererQuality();

    runtime.scene = new THREE_NS.Scene();
    runtime.camera = new THREE_NS.Camera();
    runtime.camera.layers.enable(CONTENT_LAYER);
    runtime.camera.layers.enable(OCCLUSION_LAYER);
    runtime.scene.add(runtime.camera);

    var ambientLight = new THREE_NS.AmbientLight(0xffffff, 0.62);
    runtime.scene.add(ambientLight);

    var directionalLightA = new THREE_NS.DirectionalLight(0xfff7ed, 0.84);
    directionalLightA.position.set(1.2, 2.1, 1.3);
    runtime.scene.add(directionalLightA);

    var directionalLightB = new THREE_NS.DirectionalLight(0xffffff, 0.32);
    directionalLightB.position.set(-1.3, 1.8, -1.1);
    runtime.scene.add(directionalLightB);

    runtime.loader = new THREE_NS.GLTFLoader();
  }

  function attachMarkerControls() {
    if (!runtime.arContext) {
      throw new Error("The AR tracking context is unavailable.");
    }

    runtime.markerEntries.forEach(function (entry) {
      if (entry.markerControls) {
        return;
      }

      entry.markerControls = new THREEx_NS.ArMarkerControls(runtime.arContext, entry.trackingRoot, {
        type: "pattern",
        patternUrl: entry.patternUrl,
        changeMatrixMode: "modelViewMatrix",
        minConfidence: clampUnit(CONFIG.markerControls.minConfidence),
        smooth: CONFIG.markerControls.smooth,
        smoothCount: Math.round(clampNumber(CONFIG.markerControls.smoothCount, 8, 1, 40)),
        smoothTolerance: clampNumber(CONFIG.markerControls.smoothTolerance, 0.01, 0.0001, 1),
        smoothThreshold: Math.round(clampNumber(CONFIG.markerControls.smoothThreshold, 2, 1, 20)),
      });
    });
  }

  function initArToolkit() {
    runtime.cameraStartTimeoutId = window.setTimeout(function () {
      if (!runtime.cameraReady && !runtime.cameraError && !runtime.destroyed) {
        showCameraError("AR camera initialization timed out.");
      }
    }, 45000);

    runtime.arSource = new THREEx_NS.ArToolkitSource({
      sourceType: CONFIG.source.sourceType,
      sourceWidth: CONFIG.source.sourceWidth,
      sourceHeight: CONFIG.source.sourceHeight,
      displayWidth: CONFIG.source.displayWidth,
      displayHeight: CONFIG.source.displayHeight,
    });

    runtime.arContext = new THREEx_NS.ArToolkitContext({
      cameraParametersUrl: CONFIG.context.cameraParametersUrl,
      detectionMode: CONFIG.context.detectionMode,
      matrixCodeType: CONFIG.context.matrixCodeType,
      maxDetectionRate: CONFIG.context.maxDetectionRate,
      canvasWidth: CONFIG.context.canvasWidth,
      canvasHeight: CONFIG.context.canvasHeight,
      patternRatio: CONFIG.context.patternRatio,
    });

    runtime.arContext.init(function onContextReady() {
      if (runtime.destroyed) {
        return;
      }

      try {
        if (runtime.camera && typeof runtime.arContext.getProjectionMatrix === "function") {
          runtime.camera.projectionMatrix.copy(runtime.arContext.getProjectionMatrix());
        }

        attachMarkerControls();
        requestViewportSync("context-ready", true);
        setPreloaderStatus("Artifacts ready. Starting the camera… / Handa na ang mga artifact. Binubuksan ang camera…");
        startVideoWatcher();

        // Camera access is intentionally requested only after every GLB has
        // downloaded and every anamorphic shard set has been constructed.
        runtime.arSource.init(
          function onSourceReady() {
            bindVideoListeners();
            requestViewportSync("source-ready", true);
            scheduleViewportSettle("source-ready");

            var videoEl = getArVideoElement();
            if (videoEl && videoEl.videoWidth > 0 && videoEl.videoHeight > 0) {
              markCameraReady("source-ready-with-video");
            }
          },
          function onSourceError(error) {
            showCameraError(error);
          }
        );
      } catch (error) {
        showCameraError(error);
      }
    });
  }

  function bindVideoListeners() {
    var videoEl = getArVideoElement();
    if (!videoEl || videoEl.dataset.arVideoBound === "1") {
      return;
    }

    videoEl.dataset.arVideoBound = "1";

    videoEl.addEventListener("loadedmetadata", function () {
      runtime.lastVideoWidth = videoEl.videoWidth || runtime.lastVideoWidth;
      runtime.lastVideoHeight = videoEl.videoHeight || runtime.lastVideoHeight;
      scheduleViewportSettle("video-loadedmetadata");
    });

    videoEl.addEventListener("playing", function () {
      markCameraReady("video-playing");
      scheduleViewportSettle("video-playing");
    });

    videoEl.addEventListener("error", function () {
      showCameraError(videoEl.error || "Video playback error.");
    });
  }

  function startVideoWatcher() {
    if (runtime.videoWatcherIntervalId) {
      window.clearInterval(runtime.videoWatcherIntervalId);
    }

    runtime.videoWatcherIntervalId = window.setInterval(function () {
      var videoEl = getArVideoElement();
      if (!videoEl) {
        return;
      }

      bindVideoListeners();
      requestViewportSync("video-found", true);

      if (videoEl.videoWidth > 0 && videoEl.videoHeight > 0) {
        runtime.lastVideoWidth = videoEl.videoWidth;
        runtime.lastVideoHeight = videoEl.videoHeight;
        markCameraReady("video-dimensions-ready");
        scheduleViewportSettle("video-dimensions-ready");

        window.clearInterval(runtime.videoWatcherIntervalId);
        runtime.videoWatcherIntervalId = 0;
      }
    }, 500);

    window.setTimeout(function () {
      if (runtime.videoWatcherIntervalId) {
        window.clearInterval(runtime.videoWatcherIntervalId);
        runtime.videoWatcherIntervalId = 0;
      }
    }, 20000);
  }

  function animate(timestamp) {
    if (runtime.destroyed) {
      return;
    }

    runtime.rafId = window.requestAnimationFrame(animate);

    if (
      runtime.arSource &&
      runtime.arContext &&
      runtime.arSource.ready &&
      runtime.arSource.domElement
    ) {
      runtime.arContext.update(runtime.arSource.domElement);
      updateMarkerVisibility(timestamp || performance.now());
    }

    if (runtime.renderer && runtime.scene && runtime.camera) {
      runtime.renderer.clear(true, true, true);
      runtime.camera.layers.set(OCCLUSION_LAYER);
      runtime.renderer.render(runtime.scene, runtime.camera);
      runtime.camera.layers.set(CONTENT_LAYER);
      runtime.renderer.render(runtime.scene, runtime.camera);
    }
  }

  function setupViewportListeners() {
    window.addEventListener(
      "resize",
      function () {
        requestViewportSync("window-resize");
      },
      { passive: true }
    );

    window.addEventListener(
      "orientationchange",
      function () {
        scheduleViewportSettle("orientationchange");
      },
      { passive: true }
    );

    if (window.visualViewport) {
      window.visualViewport.addEventListener(
        "resize",
        function () {
          requestViewportSync("visualViewport-resize");
        },
        { passive: true }
      );
    }

    document.addEventListener("visibilitychange", function () {
      if (!document.hidden) {
        scheduleViewportSettle("visibilitychange");
      }
    });

    window.addEventListener(
      "pageshow",
      function () {
        scheduleViewportSettle("pageshow");
      },
      { passive: true }
    );
  }

  function setupErrorListeners() {
    window.addEventListener("camera-error", function (event) {
      showCameraError(event || (event && event.detail));
    });
  }

  function teardown() {
    runtime.destroyed = true;

    clearViewportSettleTimers();
    removeAudioPrimeHandler();
    removePendingAudioUnlockHandler();
    stopActiveAudio(true);

    if (runtime.modelRotationHandlers) {
      document.removeEventListener("pointerdown", runtime.modelRotationHandlers.onPointerDown);
      document.removeEventListener("pointermove", runtime.modelRotationHandlers.onPointerMove);
      document.removeEventListener("pointerup", runtime.modelRotationHandlers.onPointerUp);
      document.removeEventListener("pointercancel", runtime.modelRotationHandlers.onPointerUp);
      runtime.modelRotationHandlers = null;
    }

    if (runtime.audioElement) {
      runtime.audioElement.pause();
      runtime.audioElement.removeAttribute("src");
      runtime.audioElement.load();
      runtime.audioElement.remove();
      runtime.audioElement = null;
    }

    if (runtime.marchAudioElement) {
      runtime.marchAudioElement.pause();
      runtime.marchAudioElement.removeAttribute("src");
      runtime.marchAudioElement.load();
      runtime.marchAudioElement.remove();
      runtime.marchAudioElement = null;
    }

    if (runtime.audioPrimeUrl && window.URL && typeof window.URL.revokeObjectURL === "function") {
      window.URL.revokeObjectURL(runtime.audioPrimeUrl);
      runtime.audioPrimeUrl = "";
    }

    if (runtime.resizeRafId) {
      window.cancelAnimationFrame(runtime.resizeRafId);
      runtime.resizeRafId = 0;
    }

    if (runtime.rafId) {
      window.cancelAnimationFrame(runtime.rafId);
      runtime.rafId = 0;
    }

    if (runtime.videoWatcherIntervalId) {
      window.clearInterval(runtime.videoWatcherIntervalId);
      runtime.videoWatcherIntervalId = 0;
    }

    if (runtime.cameraStartTimeoutId) {
      window.clearTimeout(runtime.cameraStartTimeoutId);
      runtime.cameraStartTimeoutId = 0;
    }

    runtime.markerEntries.forEach(function (entry) {
      clearMarkerLostTimer(entry);

      if (entry.occluderMesh) {
        if (entry.occluderMesh.geometry) {
          entry.occluderMesh.geometry.dispose();
        }
        if (entry.occluderMesh.material) {
          if (entry.occluderMesh.material.dispose) {
            entry.occluderMesh.material.dispose();
          }
        }
      }
    });

    if (runtime.arSource && typeof runtime.arSource.dispose === "function") {
      runtime.arSource.dispose();
    }
    if (runtime.arContext && typeof runtime.arContext.dispose === "function") {
      runtime.arContext.dispose();
    }
  }

  function init() {
    var configPayload = readPipelineConfig();
    var enabledMarkers = getEnabledMarkers(configPayload.markers || []);
    if (!enabledMarkers.length) {
      console.error("[AR] No valid marker/model entries found in config.");
      showPreloaderError("No AR artifacts are configured. / Walang naka-configure na AR artifact.");
      return;
    }

    console.log(
      "[AR] Enabled markers:",
      enabledMarkers.map(function (marker) {
        return marker.key;
      })
    );

    bindNarrationControls();
    bindViewInSpaceButton();
    setupModelRotationControls();
    setupAudioPriming();
    initRendererScene();
    setupViewportListeners();
    setupErrorListeners();
    initializePreloader(enabledMarkers.length);

    requestViewportSync("init", true);
    scheduleViewportSettle("init");
    sendAnalytics("session_start", { marker: runtime.markerFilter });

    window.addEventListener("beforeunload", teardown);
    animate(performance.now());

    buildMarkerEntries(enabledMarkers)
      .then(function () {
        if (runtime.destroyed) {
          return;
        }

        setPreloaderStatus("All 3D artifacts are ready. Preparing AR… / Handa na ang lahat ng 3D artifact. Inihahanda ang AR…");
        sendAnalytics("preload_complete", { models: enabledMarkers.length });
        initArToolkit();
      })
      .catch(function (error) {
        if (runtime.destroyed) {
          return;
        }

        console.error("[AR] Artifact preparation failed:", error);
        showPreloaderError("One or more 3D artifacts could not be prepared. Check your connection and retry. / May 3D artifact na hindi naihanda. Suriin ang koneksiyon at subukang muli.");
        sendAnalytics("preload_error", { error: parseErrorMessage(error) });
      });
  }

  init();
})();
