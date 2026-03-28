(function () {
  "use strict";

  var body = document.body;
  if (!body) {
    return;
  }

  var sceneEl = document.getElementById("arScene");
  if (!sceneEl) {
    return;
  }

  var stateCardEl = document.getElementById("arStateCard");
  var stateTitleEl = document.getElementById("arStateTitle");
  var stateMessageEl = document.getElementById("arStateMessage");
  var spinnerEl = document.getElementById("arSpinner");
  var statusTextEl = document.getElementById("arStatusText");
  var debugPanelEl = document.getElementById("arDebugPanel");
  var retryCameraButtonEl = document.getElementById("retryCameraButton");

  var THREE_NS = window.THREE || (window.AFRAME && window.AFRAME.THREE);
  var IS_MOBILE = /android|iphone|ipad|ipod/i.test(navigator.userAgent);

  var CONFIG = {
    markerFilter: "all",
    debug: false,
    analyticsEndpoint: body.dataset.arAnalyticsEndpoint || "",
    models: {
      balanghay: {
        targetSize: 0.76,
        scaleMultiplier: 3,
        rotation: [0, 0, 0],
      },
      kabaong: {
        targetSize: 0.84,
        scaleMultiplier: 3,
        rotation: [0, 0, 0],
      },
    },
  };

  var runtime = {
    cameraReady: false,
    cameraError: false,
    activeMarkers: new Set(),
    debugLines: [],
    lastVideoWidth: 0,
    lastVideoHeight: 0,
    viewportKey: "",
    resizeRafId: 0,
    cameraWaitTimeoutId: 0,
    videoScanIntervalId: 0,
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

  function toFixedNumber(value, precision) {
    return Number(clampNumber(value, 0, -Infinity, Infinity).toFixed(precision));
  }

  function safeStringify(value) {
    try {
      return JSON.stringify(value);
    } catch (error) {
      return String(value);
    }
  }

  function debugLog(label, details) {
    if (!CONFIG.debug) {
      return;
    }

    var now = new Date();
    var stamp = now.toISOString().slice(11, 23);
    var line = "[" + stamp + "] " + label;

    if (typeof details !== "undefined") {
      line += " " + safeStringify(details);
    }

    runtime.debugLines.push(line);
    if (runtime.debugLines.length > 80) {
      runtime.debugLines.shift();
    }

    if (debugPanelEl) {
      debugPanelEl.textContent = runtime.debugLines.join("\n");
    }

    if (typeof details !== "undefined") {
      console.log("[AR DEBUG]", label, details);
      return;
    }

    console.log("[AR DEBUG]", label);
  }

  function setStatusText(message, tone) {
    if (!statusTextEl) {
      return;
    }

    statusTextEl.textContent = message;
    statusTextEl.dataset.tone = tone || "info";
  }

  function updateStateCard(options) {
    if (!stateCardEl) {
      return;
    }

    if (Object.prototype.hasOwnProperty.call(options, "showCard")) {
      stateCardEl.classList.toggle("is-hidden", !options.showCard);
    }

    if (Object.prototype.hasOwnProperty.call(options, "isError")) {
      stateCardEl.classList.toggle("is-error", Boolean(options.isError));
    }

    if (typeof options.title === "string" && stateTitleEl) {
      stateTitleEl.textContent = options.title;
    }

    if (typeof options.message === "string" && stateMessageEl) {
      stateMessageEl.textContent = options.message;
    }

    if (spinnerEl && Object.prototype.hasOwnProperty.call(options, "showSpinner")) {
      spinnerEl.classList.toggle("is-hidden", !options.showSpinner);
    }
  }

  function getSafePixelRatio() {
    var raw = clampNumber(window.devicePixelRatio, 1, 1, 4);
    var cap = IS_MOBILE ? 1.5 : 2;
    return Math.min(raw, cap);
  }

  function getViewportMetrics() {
    var viewport = window.visualViewport;
    var width = Math.round((viewport && viewport.width) || window.innerWidth || document.documentElement.clientWidth || 0);
    var height = Math.round((viewport && viewport.height) || window.innerHeight || document.documentElement.clientHeight || 0);

    return {
      width: Math.max(width, 1),
      height: Math.max(height, 1),
      dpr: clampNumber(window.devicePixelRatio, 1, 1, 4),
    };
  }

  function getArVideoElement() {
    return document.getElementById("arjs-video") || document.querySelector("video.arjs-video") || document.querySelector("a-scene video");
  }

  function getSourceDimensions(videoEl) {
    var sourceWidth = 0;
    var sourceHeight = 0;

    if (videoEl) {
      sourceWidth = Math.round(clampNumber(videoEl.videoWidth, 0, 0, 20000));
      sourceHeight = Math.round(clampNumber(videoEl.videoHeight, 0, 0, 20000));

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

    applyElementBounds(sceneEl, metrics.width, metrics.height, 0, 0);
    applyElementBounds(sceneEl.canvas, frame.width, frame.height, frame.left, frame.top);
    applyElementBounds(videoEl, frame.width, frame.height, frame.left, frame.top);

    if (sceneEl.renderer) {
      sceneEl.renderer.setPixelRatio(getSafePixelRatio());
      sceneEl.renderer.setSize(frame.width, frame.height, false);
    }

    if (typeof sceneEl.resize === "function") {
      sceneEl.resize();
    }

    debugLog("viewport", {
      reason: reason,
      width: metrics.width,
      height: metrics.height,
      devicePixelRatio: toFixedNumber(metrics.dpr, 2),
      rendererPixelRatio: toFixedNumber(getSafePixelRatio(), 2),
      sourceWidth: sourceDimensions.width,
      sourceHeight: sourceDimensions.height,
      frameWidth: frame.width,
      frameHeight: frame.height,
      frameLeft: frame.left,
      frameTop: frame.top,
    });
  }

  function requestViewportSync(reason, force) {
    if (runtime.resizeRafId) {
      return;
    }

    runtime.resizeRafId = window.requestAnimationFrame(function () {
      runtime.resizeRafId = 0;
      syncViewport(reason, Boolean(force));
    });
  }

  function sendAnalytics(eventName, extraData) {
    if (!CONFIG.analyticsEndpoint) {
      return;
    }

    var payload = Object.assign(
      {
        event: eventName,
        marker: CONFIG.markerFilter,
        timestamp: Date.now(),
      },
      extraData || {},
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

  function parseErrorMessage(value) {
    if (!value) {
      return "Camera permission denied or camera unavailable.";
    }

    if (typeof value === "string") {
      return value;
    }

    if (value.message) {
      return value.message;
    }

    if (value.error && value.error.message) {
      return value.error.message;
    }

    if (value.detail && value.detail.message) {
      return value.detail.message;
    }

    if (value.name) {
      return value.name;
    }

    return "Unknown camera error.";
  }

  function showCameraError(rawError) {
    runtime.cameraError = true;

    if (runtime.cameraWaitTimeoutId) {
      window.clearTimeout(runtime.cameraWaitTimeoutId);
      runtime.cameraWaitTimeoutId = 0;
    }

    var errorMessage = parseErrorMessage(rawError);
    updateStateCard({
      showCard: true,
      showSpinner: false,
      isError: true,
      title: "Camera Access Error",
      message:
        errorMessage + " Open this page on HTTPS or localhost, then grant camera permission and retry.",
    });
    setStatusText("Camera access failed. Use Retry Camera after granting permission.", "error");

    debugLog("camera-error", { message: errorMessage });
    sendAnalytics("camera_error", { error: errorMessage });
  }

  function markCameraReady(source) {
    if (runtime.cameraReady) {
      return;
    }

    runtime.cameraReady = true;

    if (runtime.cameraWaitTimeoutId) {
      window.clearTimeout(runtime.cameraWaitTimeoutId);
      runtime.cameraWaitTimeoutId = 0;
    }

    updateStateCard({
      showCard: true,
      showSpinner: false,
      isError: false,
      title: "Camera Ready",
      message: "Camera stream is active. Point at a marker card to place the artifact.",
    });
    setStatusText("Camera ready. Point at a marker card.", "success");

    window.setTimeout(function () {
      updateStateCard({ showCard: false });
    }, 1300);

    debugLog("camera-ready", { source: source });
    sendAnalytics("camera_ready", { source: source });
  }

  function normalizeModelEntity(modelEl, modelKey) {
    if (!THREE_NS || !modelEl) {
      return;
    }

    if (modelEl.dataset.modelNormalized === "1") {
      modelEl.setAttribute("visible", "true");
      return;
    }

    var mesh = modelEl.getObject3D("mesh");
    if (!mesh) {
      return;
    }

    var modelConfig = CONFIG.models[modelKey] || {
      targetSize: 0.75,
      scaleMultiplier: 1,
      rotation: [0, 0, 0],
    };

    try {
      mesh.updateMatrixWorld(true);

      var bounds = new THREE_NS.Box3().setFromObject(mesh);
      if (bounds.isEmpty()) {
        throw new Error("Model bounds are empty.");
      }

      var size = new THREE_NS.Vector3();
      var center = new THREE_NS.Vector3();
      bounds.getSize(size);
      bounds.getCenter(center);

      var maxDimension = Math.max(size.x, size.y, size.z, 0.0001);
      var targetSize = clampNumber(modelConfig.targetSize, 0.75, 0.05, 3);
      var scaleMultiplier = clampNumber(modelConfig.scaleMultiplier, 1, 0.01, 20);
      var fitScale = clampNumber((targetSize / maxDimension) * scaleMultiplier, 1, 0.01, 6);

      mesh.position.x -= center.x;
      mesh.position.y -= bounds.min.y;
      mesh.position.z -= center.z;

      modelEl.object3D.scale.setScalar(fitScale);

      var rotation = Array.isArray(modelConfig.rotation) ? modelConfig.rotation : [0, 0, 0];
      modelEl.object3D.rotation.set(
        THREE_NS.MathUtils.degToRad(clampNumber(rotation[0], 0, -360, 360)),
        THREE_NS.MathUtils.degToRad(clampNumber(rotation[1], 0, -360, 360)),
        THREE_NS.MathUtils.degToRad(clampNumber(rotation[2], 0, -360, 360)),
      );

      modelEl.dataset.modelNormalized = "1";
      modelEl.setAttribute("visible", "true");

      debugLog("model-loaded", {
        model: modelKey,
        size: {
          x: toFixedNumber(size.x, 3),
          y: toFixedNumber(size.y, 3),
          z: toFixedNumber(size.z, 3),
        },
        scale: toFixedNumber(fitScale, 4),
      });

      sendAnalytics("model_loaded", { model: modelKey });
    } catch (error) {
      var message = parseErrorMessage(error);
      debugLog("model-normalize-error", { model: modelKey, error: message });
      setStatusText("Model failed to normalize. Check debug logs.", "warn");
      sendAnalytics("model_error", { model: modelKey, error: message });
    }
  }

  function setupMarkerEvents() {
    var markerEls = Array.prototype.slice.call(document.querySelectorAll("a-marker[data-marker-key]"));

    markerEls.forEach(function (markerEl) {
      var markerKey = markerEl.dataset.markerKey || "unknown";

      markerEl.addEventListener("markerFound", function () {
        runtime.activeMarkers.add(markerKey);
        setStatusText(markerKey + " marker detected.", "success");
        debugLog("marker-found", {
          marker: markerKey,
          activeCount: runtime.activeMarkers.size,
        });
        sendAnalytics("marker_found", { marker: markerKey });
      });

      markerEl.addEventListener("markerLost", function () {
        runtime.activeMarkers.delete(markerKey);

        if (runtime.activeMarkers.size > 0) {
          setStatusText("Marker tracking active.", "info");
        } else {
          setStatusText("Marker lost. Keep the full marker in frame.", "warn");
        }

        debugLog("marker-lost", {
          marker: markerKey,
          activeCount: runtime.activeMarkers.size,
        });
        sendAnalytics("marker_lost", { marker: markerKey });
      });
    });
  }

  function setupModelEvents() {
    var modelEls = Array.prototype.slice.call(document.querySelectorAll("a-entity[data-model-key]"));

    modelEls.forEach(function (modelEl) {
      var modelKey = modelEl.dataset.modelKey || "unknown";

      modelEl.addEventListener("model-loaded", function () {
        normalizeModelEntity(modelEl, modelKey);
      });

      modelEl.addEventListener("model-error", function (event) {
        var message = parseErrorMessage(event && event.detail);
        debugLog("model-error", {
          model: modelKey,
          error: message,
        });
        setStatusText(modelKey + " model failed to load.", "error");
        sendAnalytics("model_error", { model: modelKey, error: message });
      });

      if (modelEl.getObject3D("mesh")) {
        normalizeModelEntity(modelEl, modelKey);
      }
    });
  }

  function attachVideoListeners(videoEl) {
    if (!videoEl || videoEl.dataset.arVideoBound === "1") {
      return;
    }

    videoEl.dataset.arVideoBound = "1";

    videoEl.addEventListener("loadedmetadata", function () {
      runtime.lastVideoWidth = videoEl.videoWidth || runtime.lastVideoWidth;
      runtime.lastVideoHeight = videoEl.videoHeight || runtime.lastVideoHeight;
      debugLog("video-metadata", {
        videoWidth: videoEl.videoWidth,
        videoHeight: videoEl.videoHeight,
      });
      requestViewportSync("video-loadedmetadata", true);
    });

    videoEl.addEventListener("playing", function () {
      markCameraReady("video-playing");
      requestViewportSync("video-playing", true);
    });

    videoEl.addEventListener("error", function () {
      showCameraError(videoEl.error || "Video playback error.");
    });
  }

  function startVideoWatcher() {
    if (runtime.videoScanIntervalId) {
      window.clearInterval(runtime.videoScanIntervalId);
    }

    runtime.videoScanIntervalId = window.setInterval(function () {
      var videoEl = getArVideoElement();
      if (!videoEl) {
        return;
      }

      attachVideoListeners(videoEl);
      requestViewportSync("video-found");

      if (videoEl.videoWidth > 0 && videoEl.videoHeight > 0) {
        markCameraReady("video-dimensions-ready");
        requestViewportSync("video-dimensions-ready", true);

        if (runtime.videoScanIntervalId) {
          window.clearInterval(runtime.videoScanIntervalId);
          runtime.videoScanIntervalId = 0;
        }
      }
    }, 500);

    window.setTimeout(function () {
      if (runtime.videoScanIntervalId) {
        window.clearInterval(runtime.videoScanIntervalId);
        runtime.videoScanIntervalId = 0;
      }
    }, 20000);
  }

  function setupRetryButton() {
    if (!retryCameraButtonEl) {
      return;
    }

    retryCameraButtonEl.addEventListener("click", function () {
      var videoEl = getArVideoElement();
      if (videoEl && videoEl.srcObject && typeof videoEl.srcObject.getTracks === "function") {
        videoEl.srcObject.getTracks().forEach(function (track) {
          track.stop();
        });
      }

      window.location.reload();
    });
  }

  function setupSceneEvents() {
    sceneEl.addEventListener("loaded", function () {
      debugLog("scene-loaded");
      requestViewportSync("scene-loaded", true);
    });

    sceneEl.addEventListener("renderstart", function () {
      debugLog("renderstart");
      requestViewportSync("renderstart", true);
    });

    sceneEl.addEventListener("camera-init", function (event) {
      var stream = event && event.detail && event.detail.stream;
      debugLog("camera-init", {
        hasStream: Boolean(stream),
      });
      markCameraReady("camera-init-event");
    });

    sceneEl.addEventListener("camera-error", function (event) {
      showCameraError(event && event.detail);
    });
  }

  function setupViewportListeners() {
    window.addEventListener(
      "resize",
      function () {
        requestViewportSync("window-resize");
      },
      { passive: true },
    );

    window.addEventListener(
      "orientationchange",
      function () {
        window.setTimeout(function () {
          requestViewportSync("orientationchange", true);
        }, 140);
      },
      { passive: true },
    );

    if (window.visualViewport) {
      window.visualViewport.addEventListener(
        "resize",
        function () {
          requestViewportSync("visualViewport-resize");
        },
        { passive: true },
      );

      window.visualViewport.addEventListener(
        "scroll",
        function () {
          requestViewportSync("visualViewport-scroll");
        },
        { passive: true },
      );
    }

    document.addEventListener("visibilitychange", function () {
      if (!document.hidden) {
        requestViewportSync("visibilitychange", true);
      }
    });
  }

  function validateEnvironment() {
    var hostname = window.location.hostname;
    var isLocalhost = hostname === "localhost" || hostname === "127.0.0.1" || hostname === "[::1]";

    if (!window.isSecureContext && !isLocalhost) {
      showCameraError("Insecure context detected. Camera access requires HTTPS or localhost.");
      return false;
    }

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      showCameraError("This browser does not support camera access APIs required by WebAR.");
      return false;
    }

    if (!window.AFRAME || !THREE_NS) {
      showCameraError("A-Frame/three.js failed to load. Check network access to CDN scripts.");
      return false;
    }

    return true;
  }

  function init() {
    updateStateCard({
      showCard: true,
      showSpinner: true,
      isError: false,
      title: "Camera Permission Required",
      message: "Allow camera access when prompted. For best stability, keep the marker flat and fully visible.",
    });
    setStatusText("Waiting for camera permission...", "info");

    debugLog("init", {
      markerFilter: CONFIG.markerFilter,
      debug: CONFIG.debug,
      userAgent: navigator.userAgent,
    });

    if (!validateEnvironment()) {
      return;
    }

    setupRetryButton();
    setupSceneEvents();
    setupMarkerEvents();
    setupModelEvents();
    setupViewportListeners();
    startVideoWatcher();

    runtime.cameraWaitTimeoutId = window.setTimeout(function () {
      if (runtime.cameraReady || runtime.cameraError) {
        return;
      }

      updateStateCard({
        showCard: true,
        showSpinner: true,
        isError: false,
        title: "Still waiting for camera",
        message: "If no camera prompt appears, check browser camera permissions and verify you are on HTTPS or localhost.",
      });
      setStatusText("Still waiting for camera permission...", "warn");
      debugLog("camera-wait-timeout");
    }, 8500);

    requestViewportSync("init", true);
    sendAnalytics("session_start", { marker: CONFIG.markerFilter });
  }

  init();
})();
