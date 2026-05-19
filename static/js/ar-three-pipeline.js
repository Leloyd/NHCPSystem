(function () {
  "use strict";

  var body = document.body;
  var rootEl = document.getElementById("arScene");
  if (!body || !rootEl) {
    return;
  }

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
    return;
  }

  var IS_MOBILE = /android|iphone|ipad|ipod/i.test(navigator.userAgent);
  var CONTENT_LAYER = 0;
  var OCCLUSION_LAYER = 1;
  var BALANGHAY_KEY = "balanghay";
  var TAUSUG_KEY = "tausug";

  var MODEL_CONFIG = {
    balanghay: {
      targetSize: 0.76,
      scaleMultiplier: 2,
      position: [0, 0, 0],
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
      rotation: [0, 0, 0],
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
      rotation: [0, 0, 0],
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
      rotation: [0, 0, 0],
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
      rotation: [0, -90, 0],
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
        yOffset: -0.02,
      },
    },
    pagpag: {
      targetSize: 0.8,
      scaleMultiplier: 2,
      position: [0, 0, 0],
      rotation: [0, 0, 0],
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
      rotation: [0, 0, 0],
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
    tausug: {
      targetSize: 0.8,
      scaleMultiplier: 2,
      position: [0, 0, 0],
      rotation: [0, 0, 0],
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
    tausugSwitcher: null,
    activeTausugEntry: null,
    destroyed: false,
  };

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

  function getMarkerModelUrls(item) {
    var urls = [];

    if (Array.isArray(item && item.modelUrls)) {
      urls = item.modelUrls
        .map(function (value) {
          return String(value || "").trim();
        })
        .filter(Boolean);
    }

    if (!urls.length) {
      var fallbackUrl = String(item && item.modelUrl ? item.modelUrl : "").trim();
      if (fallbackUrl) {
        urls.push(fallbackUrl);
      }
    }

    return urls;
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
          modelUrls: getMarkerModelUrls(item),
          imageUrl: String(item && item.imageUrl ? item.imageUrl : ""),
          infoTitle: String(item && item.infoTitle ? item.infoTitle : ""),
          infoText: String(item && item.infoText ? item.infoText : ""),
        };
      })
      .filter(function (item) {
        return Boolean(item.key && item.patternUrl && item.modelUrls.length);
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

  function disposeMaterialTextures(material) {
    if (!material) {
      return;
    }

    ["map", "alphaMap", "aoMap", "bumpMap", "displacementMap", "emissiveMap", "envMap", "lightMap", "metalnessMap", "normalMap", "roughnessMap"].forEach(function (textureKey) {
      var texture = material[textureKey];
      if (texture && typeof texture.dispose === "function") {
        texture.dispose();
      }
    });

    if (typeof material.dispose === "function") {
      material.dispose();
    }
  }

  function disposeSceneGraph(root) {
    if (!root || typeof root.traverse !== "function") {
      return;
    }

    root.traverse(function (node) {
      if (!node || !node.isMesh) {
        return;
      }

      if (node.geometry && typeof node.geometry.dispose === "function") {
        node.geometry.dispose();
      }

      if (Array.isArray(node.material)) {
        node.material.forEach(disposeMaterialTextures);
        return;
      }

      disposeMaterialTextures(node.material);
    });
  }

  function clearEntryModelScene(entry) {
    if (!entry || !entry.modelScene || !entry.modelContainer) {
      return;
    }

    entry.modelContainer.remove(entry.modelScene);
    disposeSceneGraph(entry.modelScene);
    entry.modelScene = null;
    entry.modelLoaded = false;
  }

  function getEntryModelUrls(entry) {
    if (!entry) {
      return [];
    }

    if (Array.isArray(entry.modelUrls) && entry.modelUrls.length) {
      return entry.modelUrls;
    }

    if (entry.markerConfig && entry.markerConfig.modelUrl) {
      return [entry.markerConfig.modelUrl];
    }

    return [];
  }

  function getVisibleTausugEntry() {
    for (var index = 0; index < runtime.markerEntries.length; index += 1) {
      var entry = runtime.markerEntries[index];
      if (
        entry &&
        entry.key === TAUSUG_KEY &&
        entry.trackingRoot &&
        entry.trackingRoot.visible &&
        entry.renderRoot &&
        entry.renderRoot.visible &&
        entry.modelLoaded
      ) {
        return entry;
      }
    }

    return null;
  }

  function updateTausugSwitcherVisibility() {
    if (!runtime.tausugSwitcher) {
      return;
    }

    var activeEntry = getVisibleTausugEntry();
    runtime.activeTausugEntry = activeEntry;

    var modelUrls = getEntryModelUrls(activeEntry);
    var shouldShow = Boolean(activeEntry && modelUrls.length > 1);
    runtime.tausugSwitcher.container.hidden = !shouldShow;

    if (!shouldShow) {
      return;
    }

    var disableButtons = Boolean(activeEntry.modelLoading);
    runtime.tausugSwitcher.previous.disabled = disableButtons;
    runtime.tausugSwitcher.next.disabled = disableButtons;
  }

  function createTausugSwitcher() {
    if (runtime.tausugSwitcher) {
      return;
    }

    var hasTausugVariants = runtime.markerEntries.some(function (entry) {
      return entry && entry.key === TAUSUG_KEY && getEntryModelUrls(entry).length > 1;
    });

    if (!hasTausugVariants) {
      return;
    }

    var overlay = document.createElement("div");
    overlay.className = "ar-overlay ar-overlay--tausug-nav";
    overlay.hidden = true;

    var controls = document.createElement("div");
    controls.className = "ar-tausug-nav";

    var previousButton = document.createElement("button");
    previousButton.type = "button";
    previousButton.className = "ar-btn ar-btn--icon";
    previousButton.setAttribute("aria-label", "Previous Tausug model");
    previousButton.textContent = "‹";

    var nextButton = document.createElement("button");
    nextButton.type = "button";
    nextButton.className = "ar-btn ar-btn--icon";
    nextButton.setAttribute("aria-label", "Next Tausug model");
    nextButton.textContent = "›";

    controls.appendChild(previousButton);
    controls.appendChild(nextButton);
    overlay.appendChild(controls);
    body.appendChild(overlay);

    runtime.tausugSwitcher = {
      container: overlay,
      previous: previousButton,
      next: nextButton,
    };

    previousButton.addEventListener("click", function () {
      stepTausugModel(-1);
    });

    nextButton.addEventListener("click", function () {
      stepTausugModel(1);
    });

    updateTausugSwitcherVisibility();
  }

  function stepTausugModel(direction) {
    var entry = runtime.activeTausugEntry;
    var modelUrls = getEntryModelUrls(entry);
    if (!entry || modelUrls.length < 2 || entry.modelLoading) {
      return;
    }

    var step = direction < 0 ? -1 : 1;
    var nextIndex = (entry.activeModelIndex + step + modelUrls.length) % modelUrls.length;
    loadMarkerModel(entry, entry.markerConfig, nextIndex);
  }

  function showCameraError(rawError) {
    runtime.cameraError = true;
    var message = parseErrorMessage(rawError);
    console.error("[AR]", message);
    sendAnalytics("camera_error", { error: message });
  }

  function markCameraReady(source) {
    if (runtime.cameraReady) {
      return;
    }

    runtime.cameraReady = true;
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
    }, CONFIG.markerLostDebounceMs);
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

    updateTausugSwitcherVisibility();
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

    entry.modelContainer.scale.setScalar(fitScale);
    updateGroundOccluder(entry, modelSettings, size, fitScale);
  }

  function loadMarkerModel(entry, markerConfig, requestedModelIndex) {
    if (!runtime.loader || !entry) {
      return;
    }

    var modelUrls = getEntryModelUrls(entry);
    if (!modelUrls.length) {
      return;
    }

    var safeIndex = ((Math.round(Number(requestedModelIndex)) || 0) + modelUrls.length) % modelUrls.length;
    var modelUrl = modelUrls[safeIndex];
    if (!modelUrl) {
      return;
    }

    var loadToken = (entry.pendingLoadToken || 0) + 1;
    entry.pendingLoadToken = loadToken;
    entry.activeModelIndex = safeIndex;
    entry.modelLoading = true;
    entry.modelLoaded = false;
    clearEntryModelScene(entry);
    updateTausugSwitcherVisibility();

    runtime.loader.load(
      modelUrl,
      function (gltf) {
        if (entry.pendingLoadToken !== loadToken) {
          var staleScene = gltf && (gltf.scene || (gltf.scenes && gltf.scenes[0]));
          disposeSceneGraph(staleScene);
          return;
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
        entry.modelLoading = false;
        entry.modelLoaded = true;
        updateTausugSwitcherVisibility();

        sendAnalytics("model_loaded", { model: entry.key, variant: safeIndex + 1 });
      },
      undefined,
      function (error) {
        if (entry.pendingLoadToken !== loadToken) {
          return;
        }

        entry.modelLoading = false;
        updateTausugSwitcherVisibility();
        sendAnalytics("model_error", {
          model: entry.key,
          variant: safeIndex + 1,
          error: parseErrorMessage(error),
        });
      }
    );
  }

  function buildMarkerEntries(markers) {
    runtime.markerEntries = [];

    markers.forEach(function (markerConfig) {
      var trackingRoot = new THREE_NS.Group();
      trackingRoot.visible = false;
      runtime.scene.add(trackingRoot);

      var markerControls = new THREEx_NS.ArMarkerControls(runtime.arContext, trackingRoot, {
        type: "pattern",
        patternUrl: markerConfig.patternUrl,
        changeMatrixMode: "modelViewMatrix",
        minConfidence: clampUnit(CONFIG.markerControls.minConfidence),
        smooth: CONFIG.markerControls.smooth,
        smoothCount: Math.round(clampNumber(CONFIG.markerControls.smoothCount, 8, 1, 40)),
        smoothTolerance: clampNumber(CONFIG.markerControls.smoothTolerance, 0.01, 0.0001, 1),
        smoothThreshold: Math.round(clampNumber(CONFIG.markerControls.smoothThreshold, 2, 1, 20)),
      });

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
        markerConfig: markerConfig,
        modelUrls: Array.isArray(markerConfig.modelUrls) ? markerConfig.modelUrls.slice() : getMarkerModelUrls(markerConfig),
        activeModelIndex: 0,
        pendingLoadToken: 0,
        modelLoading: false,
        trackingRoot: trackingRoot,
        renderRoot: renderRoot,
        occluderRoot: occluderRoot,
        occluderMesh: null,
        markerControls: markerControls,
        modelContainer: modelContainer,
        modelScene: null,
        modelLoaded: false,
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

      loadMarkerModel(entry, markerConfig);
      runtime.markerEntries.push(entry);
    });

    createTausugSwitcher();
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

  function initArToolkit() {
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
      if (runtime.camera && typeof runtime.arContext.getProjectionMatrix === "function") {
        runtime.camera.projectionMatrix.copy(runtime.arContext.getProjectionMatrix());
      }

      requestViewportSync("context-ready", true);
    });

    runtime.arSource.init(
      function onSourceReady() {
        markCameraReady("source-ready");
        bindVideoListeners();
        scheduleViewportSettle("source-ready");
      },
      function onSourceError(error) {
        showCameraError(error);
      }
    );
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

    runtime.markerEntries.forEach(function (entry) {
      clearMarkerLostTimer(entry);
      clearEntryModelScene(entry);

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

    if (runtime.tausugSwitcher && runtime.tausugSwitcher.container && runtime.tausugSwitcher.container.parentNode) {
      runtime.tausugSwitcher.container.parentNode.removeChild(runtime.tausugSwitcher.container);
    }

    runtime.tausugSwitcher = null;
    runtime.activeTausugEntry = null;

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
      return;
    }

    console.log(
      "[AR] Enabled markers:",
      enabledMarkers.map(function (marker) {
        return marker.key;
      })
    );

    initRendererScene();
    initArToolkit();
    buildMarkerEntries(enabledMarkers);
    setupViewportListeners();
    setupErrorListeners();
    startVideoWatcher();

    requestViewportSync("init", true);
    scheduleViewportSettle("init");
    sendAnalytics("session_start", { marker: runtime.markerFilter });

    window.addEventListener("beforeunload", teardown);
    animate(performance.now());
  }

  init();
})();
