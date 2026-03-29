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

  var THREE_NS = window.THREE || (window.AFRAME && window.AFRAME.THREE);
  var IS_MOBILE = /android|iphone|ipad|ipod/i.test(navigator.userAgent);

  var CONFIG = {
    markerFilter: "all",
    analyticsEndpoint: body.dataset.arAnalyticsEndpoint || "",
    markerLostDebounceMs: 320,
    markerVisibilityHoldMs: 220,
    poseFilter: {
      enabled: true,
      posDeadzone: 0.0025,
      rotDeadzoneDeg: 1,
      posSnap: 0.065,
      rotSnapDeg: 12,
      posBaseLerp: 0.24,
      rotBaseLerp: 0.22,
      reacquireBoostMs: 280,
      reacquireLerpBoost: 0.2,
    },
    renderer: {
      mobilePixelRatioCap: 2,
      desktopPixelRatioCap: 2,
      maxAnisotropy: 8,
    },
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
    lastVideoWidth: 0,
    lastVideoHeight: 0,
    viewportKey: "",
    resizeRafId: 0,
    videoScanIntervalId: 0,
    pendingViewportForce: false,
    viewportSettleTimeoutIds: [],
    rendererConfigured: false,
    markerPoseRafId: 0,
    markerStates: {},
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

  function getUniformScale(vector3) {
    if (!vector3) {
      return 1;
    }

    var x = clampNumber(vector3.x, 1, 0.0001, 1000);
    var y = clampNumber(vector3.y, 1, 0.0001, 1000);
    var z = clampNumber(vector3.z, 1, 0.0001, 1000);
    return clampNumber((x + y + z) / 3, 1, 0.0001, 1000);
  }

  function getSafePixelRatio() {
    var raw = clampNumber(window.devicePixelRatio, 1, 1, 4);
    var cap = IS_MOBILE ? CONFIG.renderer.mobilePixelRatioCap : CONFIG.renderer.desktopPixelRatioCap;
    return Math.min(raw, cap);
  }

  function configureRendererQuality() {
    if (!sceneEl.renderer) {
      return;
    }

    if (!runtime.rendererConfigured) {
      if (THREE_NS && "outputColorSpace" in sceneEl.renderer && THREE_NS.SRGBColorSpace) {
        sceneEl.renderer.outputColorSpace = THREE_NS.SRGBColorSpace;
      } else if (THREE_NS && "outputEncoding" in sceneEl.renderer && THREE_NS.sRGBEncoding) {
        sceneEl.renderer.outputEncoding = THREE_NS.sRGBEncoding;
      }

      if (typeof sceneEl.renderer.physicallyCorrectLights === "boolean") {
        sceneEl.renderer.physicallyCorrectLights = false;
      }

      if (typeof sceneEl.renderer.sortObjects === "boolean") {
        sceneEl.renderer.sortObjects = true;
      }

      runtime.rendererConfigured = true;
    }

    sceneEl.renderer.setPixelRatio(getSafePixelRatio());
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

    applyElementBounds(sceneEl, metrics.width, metrics.height, 0, 0);

    if (typeof sceneEl.resize === "function") {
      sceneEl.resize();
    }

    if (sceneEl.renderer) {
      configureRendererQuality();
      sceneEl.renderer.setSize(frame.width, frame.height, false);
      if (typeof sceneEl.renderer.setViewport === "function") {
        sceneEl.renderer.setViewport(0, 0, frame.width, frame.height);
      }
    }

    applyElementBounds(sceneEl.canvas, frame.width, frame.height, frame.left, frame.top);
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

  function getMarkerState(markerKey) {
    if (runtime.markerStates[markerKey]) {
      return runtime.markerStates[markerKey];
    }

    runtime.markerStates[markerKey] = {
      markerKey: markerKey,
      markerEl: null,
      lostTimerId: 0,
      isVisibleStable: false,
      lastSeenAt: 0,
      justFoundAt: 0,
      hasFilteredPose: false,
      fixedScale: 1,
      filteredPosition: new THREE_NS.Vector3(),
      filteredQuaternion: new THREE_NS.Quaternion(),
    };

    return runtime.markerStates[markerKey];
  }

  function clearMarkerLostTimer(markerState) {
    if (!markerState || !markerState.lostTimerId) {
      return;
    }

    window.clearTimeout(markerState.lostTimerId);
    markerState.lostTimerId = 0;
  }

  function stabilizeMarkerPose(markerState, nowMs) {
    if (!markerState || !markerState.markerEl || !markerState.markerEl.object3D || !CONFIG.poseFilter.enabled) {
      return;
    }

    var markerObj = markerState.markerEl.object3D;
    if (!markerObj.visible) {
      if (
        markerState.isVisibleStable &&
        markerState.hasFilteredPose &&
        nowMs - markerState.lastSeenAt <= CONFIG.markerVisibilityHoldMs
      ) {
        markerObj.visible = true;
        markerObj.position.copy(markerState.filteredPosition);
        markerObj.quaternion.copy(markerState.filteredQuaternion);
        markerObj.scale.setScalar(markerState.fixedScale);
      }
      return;
    }

    markerState.lastSeenAt = nowMs;

    if (!markerState.hasFilteredPose) {
      markerState.filteredPosition.copy(markerObj.position);
      markerState.filteredQuaternion.copy(markerObj.quaternion).normalize();
      markerState.fixedScale = getUniformScale(markerObj.scale);
      markerObj.scale.setScalar(markerState.fixedScale);
      markerState.hasFilteredPose = true;
      return;
    }

    var poseFilter = CONFIG.poseFilter;
    var rotationDeadzone = degToRad(poseFilter.rotDeadzoneDeg);
    var rotationSnap = degToRad(poseFilter.rotSnapDeg);

    var positionDelta = markerState.filteredPosition.distanceTo(markerObj.position);
    var rotationDelta = markerState.filteredQuaternion.angleTo(markerObj.quaternion);

    if (positionDelta <= poseFilter.posDeadzone && rotationDelta <= rotationDeadzone) {
      markerObj.position.copy(markerState.filteredPosition);
      markerObj.quaternion.copy(markerState.filteredQuaternion);
      markerObj.scale.setScalar(markerState.fixedScale);
      return;
    }

    if (positionDelta >= poseFilter.posSnap || rotationDelta >= rotationSnap) {
      markerState.filteredPosition.copy(markerObj.position);
      markerState.filteredQuaternion.copy(markerObj.quaternion).normalize();
      markerState.fixedScale = getUniformScale(markerObj.scale);
    } else {
      var positionRatio = positionDelta / Math.max(poseFilter.posSnap, 0.0001);
      var rotationRatio = rotationDelta / Math.max(rotationSnap, 0.0001);
      var reacquireBoost = nowMs - markerState.justFoundAt < poseFilter.reacquireBoostMs ? poseFilter.reacquireLerpBoost : 0;
      var positionAlpha = clampUnit(poseFilter.posBaseLerp + positionRatio * 0.18 + reacquireBoost);
      var rotationAlpha = clampUnit(poseFilter.rotBaseLerp + rotationRatio * 0.2 + reacquireBoost);

      markerState.filteredPosition.lerp(markerObj.position, positionAlpha);
      markerState.filteredQuaternion.slerp(markerObj.quaternion, rotationAlpha).normalize();
    }

    markerObj.position.copy(markerState.filteredPosition);
    markerObj.quaternion.copy(markerState.filteredQuaternion);
    markerObj.scale.setScalar(markerState.fixedScale);
  }

  function startMarkerPoseStabilizer() {
    if (!THREE_NS || runtime.markerPoseRafId) {
      return;
    }

    var tick = function (timestamp) {
      runtime.markerPoseRafId = window.requestAnimationFrame(tick);

      var markerKeys = Object.keys(runtime.markerStates);
      if (!markerKeys.length) {
        return;
      }

      for (var index = 0; index < markerKeys.length; index += 1) {
        var markerState = runtime.markerStates[markerKeys[index]];
        stabilizeMarkerPose(markerState, timestamp || performance.now());
      }
    };

    runtime.markerPoseRafId = window.requestAnimationFrame(tick);
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
    var errorMessage = parseErrorMessage(rawError);
    runtime.cameraError = true;
    console.error("[AR] Camera error:", errorMessage);
    sendAnalytics("camera_error", { error: errorMessage });
  }

  function markCameraReady(source) {
    if (runtime.cameraReady) {
      return;
    }

    runtime.cameraReady = true;
    sendAnalytics("camera_ready", { source: source });
  }

  function tuneModelMaterials(mesh) {
    if (!mesh || typeof mesh.traverse !== "function") {
      return;
    }

    var maxAnisotropy = 0;
    if (sceneEl.renderer && sceneEl.renderer.capabilities && typeof sceneEl.renderer.capabilities.getMaxAnisotropy === "function") {
      maxAnisotropy = Math.min(sceneEl.renderer.capabilities.getMaxAnisotropy(), CONFIG.renderer.maxAnisotropy);
    }

    mesh.traverse(function (node) {
      if (!node || !node.isMesh) {
        return;
      }

      node.frustumCulled = false;

      var materials = Array.isArray(node.material) ? node.material : [node.material];
      materials.forEach(function (material) {
        if (!material) {
          return;
        }

        ["map", "normalMap", "roughnessMap", "metalnessMap", "emissiveMap"].forEach(function (textureKey) {
          var texture = material[textureKey];
          if (texture && maxAnisotropy > 0) {
            texture.anisotropy = maxAnisotropy;
            if ((textureKey === "map" || textureKey === "emissiveMap") && THREE_NS) {
              if ("colorSpace" in texture && THREE_NS.SRGBColorSpace) {
                texture.colorSpace = THREE_NS.SRGBColorSpace;
              } else if ("encoding" in texture && THREE_NS.sRGBEncoding) {
                texture.encoding = THREE_NS.sRGBEncoding;
              }
            }
            texture.needsUpdate = true;
          }
        });

        material.needsUpdate = true;
      });
    });
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
      configureRendererQuality();
      mesh.updateMatrixWorld(true);
      tuneModelMaterials(mesh);

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

      modelEl.object3D.position.set(0, 0, 0);
      modelEl.object3D.scale.setScalar(fitScale);

      var rotation = Array.isArray(modelConfig.rotation) ? modelConfig.rotation : [0, 0, 0];
      modelEl.object3D.rotation.set(
        THREE_NS.MathUtils.degToRad(clampNumber(rotation[0], 0, -360, 360)),
        THREE_NS.MathUtils.degToRad(clampNumber(rotation[1], 0, -360, 360)),
        THREE_NS.MathUtils.degToRad(clampNumber(rotation[2], 0, -360, 360)),
      );

      modelEl.dataset.modelNormalized = "1";
      modelEl.setAttribute("visible", "true");

      sendAnalytics("model_loaded", { model: modelKey });
    } catch (error) {
      sendAnalytics("model_error", {
        model: modelKey,
        error: parseErrorMessage(error),
      });
    }
  }

  function setupMarkerEvents() {
    var markerEls = Array.prototype.slice.call(document.querySelectorAll("a-marker[data-marker-key]"));

    markerEls.forEach(function (markerEl) {
      var markerKey = markerEl.dataset.markerKey || "unknown";
      var markerState = getMarkerState(markerKey);
      markerState.markerEl = markerEl;

      markerEl.addEventListener("markerFound", function () {
        clearMarkerLostTimer(markerState);
        markerState.lastSeenAt = performance.now();
        markerState.justFoundAt = markerState.lastSeenAt;
        markerState.hasFilteredPose = false;
        markerState.fixedScale = 1;

        if (!markerState.isVisibleStable) {
          markerState.isVisibleStable = true;
          sendAnalytics("marker_found", { marker: markerKey });
        }
      });

      markerEl.addEventListener("markerLost", function () {
        clearMarkerLostTimer(markerState);

        markerState.lostTimerId = window.setTimeout(function () {
          markerState.lostTimerId = 0;
          if (!markerState.isVisibleStable) {
            return;
          }

          markerState.isVisibleStable = false;
          markerState.hasFilteredPose = false;
          sendAnalytics("marker_lost", { marker: markerKey });
        }, CONFIG.markerLostDebounceMs);
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
        sendAnalytics("model_error", {
          model: modelKey,
          error: parseErrorMessage(event && event.detail),
        });
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
        scheduleViewportSettle("video-dimensions-ready");

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

  function setupSceneEvents() {
    sceneEl.addEventListener("loaded", function () {
      configureRendererQuality();
      requestViewportSync("scene-loaded", true);
      scheduleViewportSettle("scene-loaded");
    });

    sceneEl.addEventListener("renderstart", function () {
      configureRendererQuality();
      requestViewportSync("renderstart", true);
    });

    sceneEl.addEventListener("camera-init", function () {
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
        scheduleViewportSettle("orientationchange");
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
      { passive: true },
    );
  }

  function setupLifecycleCleanup() {
    window.addEventListener("beforeunload", function () {
      clearViewportSettleTimers();

      if (runtime.videoScanIntervalId) {
        window.clearInterval(runtime.videoScanIntervalId);
        runtime.videoScanIntervalId = 0;
      }

      if (runtime.resizeRafId) {
        window.cancelAnimationFrame(runtime.resizeRafId);
        runtime.resizeRafId = 0;
      }

      if (runtime.markerPoseRafId) {
        window.cancelAnimationFrame(runtime.markerPoseRafId);
        runtime.markerPoseRafId = 0;
      }

      Object.keys(runtime.markerStates).forEach(function (markerKey) {
        clearMarkerLostTimer(runtime.markerStates[markerKey]);
      });
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
    if (!validateEnvironment()) {
      return;
    }

    setupSceneEvents();
    setupMarkerEvents();
    startMarkerPoseStabilizer();
    setupModelEvents();
    setupViewportListeners();
    setupLifecycleCleanup();
    startVideoWatcher();

    configureRendererQuality();
    requestViewportSync("init", true);
    scheduleViewportSettle("init");
    sendAnalytics("session_start", { marker: CONFIG.markerFilter });
  }

  init();
})();
