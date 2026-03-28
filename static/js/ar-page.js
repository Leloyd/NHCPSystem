(function () {
  const page = document.body;
  if (!page || !page.classList.contains("ar-page")) return;

  const configNode = document.getElementById("arPageConfig");
  const scene = document.getElementById("arScene");
  const cameraNode = document.getElementById("arCamera");

  const loadingOverlay = document.getElementById("arLoading");
  const permissionOverlay = document.getElementById("arPermission");
  const errorOverlay = document.getElementById("arError");
  const startButton = document.getElementById("arStartButton");
  const retryButton = document.getElementById("arRetryButton");
  const statusChip = document.getElementById("arStatusChip");
  const noteText = document.getElementById("arNoteText");
  const debugPanel = document.getElementById("arDebugPanel");
  const debugToggle = document.getElementById("arDebugToggle");
  const errorMessage = document.getElementById("arErrorMessage");

  if (!configNode || !scene || !cameraNode) return;

  let config = {};
  try {
    config = JSON.parse(configNode.textContent || "{}");
  } catch (error) {
    console.error("Invalid AR config JSON", error);
    return;
  }

  const state = {
    foundMarker: null,
    started: false,
    streamReady: false,
    debugEnabled: new URLSearchParams(window.location.search).get("debug") === "1",
    videoReadyLogged: false,
  };

  function isMobileDevice() {
    return /android|iphone|ipad|ipod|mobile/i.test(navigator.userAgent);
  }

  function parseVec3(value, fallback) {
    const safe = fallback || { x: 0, y: 0, z: 0 };

    if (!value) return safe;

    if (typeof value === "string") {
      const parts = value.trim().split(/\s+/).map(Number);
      return {
        x: Number.isFinite(parts[0]) ? parts[0] : safe.x,
        y: Number.isFinite(parts[1]) ? parts[1] : safe.y,
        z: Number.isFinite(parts[2]) ? parts[2] : safe.z,
      };
    }

    if (typeof value === "object") {
      return {
        x: Number.isFinite(value.x) ? value.x : safe.x,
        y: Number.isFinite(value.y) ? value.y : safe.y,
        z: Number.isFinite(value.z) ? value.z : safe.z,
      };
    }

    return safe;
  }

  function setViewportHeight() {
    document.documentElement.style.setProperty("--ar-height", `${window.innerHeight}px`);
  }

  function logDebug(message) {
    if (!state.debugEnabled || !debugPanel) return;

    const timestamp = new Date().toLocaleTimeString();
    debugPanel.textContent = `[${timestamp}] ${message}\n${debugPanel.textContent}`;
    console.log("[AR Debug]", message);
  }

  function setStatus(text, found) {
    if (statusChip) {
      statusChip.textContent = text;
      statusChip.classList.toggle("is-found", Boolean(found));
    }
  }

  function showLoading(show) {
    if (loadingOverlay) loadingOverlay.hidden = !show;
  }

  function showPermission(show) {
    if (permissionOverlay) permissionOverlay.hidden = !show;
  }

  function showError(message) {
    if (errorMessage) errorMessage.textContent = message;
    if (errorOverlay) errorOverlay.hidden = false;
    showLoading(false);
    setStatus("Camera unavailable", false);
    logDebug(`Error: ${message}`);
  }

  function hideError() {
    if (errorOverlay) errorOverlay.hidden = true;
  }

  function attachDebugToggle() {
    if (!debugToggle || !debugPanel) return;

    debugPanel.hidden = !state.debugEnabled;
    debugToggle.setAttribute("aria-pressed", state.debugEnabled ? "true" : "false");

    debugToggle.addEventListener("click", function () {
      state.debugEnabled = !state.debugEnabled;
      debugPanel.hidden = !state.debugEnabled;
      debugToggle.setAttribute("aria-pressed", state.debugEnabled ? "true" : "false");
      logDebug(`Debug ${state.debugEnabled ? "enabled" : "disabled"}`);
    });
  }

  function setRendererProfile() {
    const mobile = isMobileDevice();

    const rendererConfig = [
      "alpha: true",
      `antialias: ${mobile ? "false" : "true"}`,
      `precision: ${mobile ? "mediump" : "highp"}`,
      "colorManagement: true",
      "logarithmicDepthBuffer: false",
      "physicallyCorrectLights: false",
    ].join("; ");

    scene.setAttribute("renderer", rendererConfig);
    logDebug(`Renderer config: ${rendererConfig}`);
  }

  function applyMaterialFixes(object3D) {
    object3D.traverse(function (node) {
      if (!node.isMesh) return;

      node.frustumCulled = false;
      node.castShadow = true;
      node.receiveShadow = false;

      if (!node.material) return;

      const materials = Array.isArray(node.material) ? node.material : [node.material];
      materials.forEach(function (material) {
        material.side = THREE.DoubleSide;
        material.needsUpdate = true;
      });
    });
  }

  function autoFitModel(modelEntity, markerConfig) {
    const meshRoot = modelEntity.getObject3D("mesh");
    if (!meshRoot) {
      logDebug(`No mesh found for ${markerConfig.name}`);
      return;
    }

    applyMaterialFixes(meshRoot);

    const bbox = new THREE.Box3().setFromObject(meshRoot);
    if (bbox.isEmpty()) {
      logDebug(`Empty bounding box for ${markerConfig.name}`);
      return;
    }

    const size = new THREE.Vector3();
    const center = new THREE.Vector3();
    bbox.getSize(size);
    bbox.getCenter(center);

    const maxDim = Math.max(size.x, size.y, size.z, 0.0001);
    const fitTarget = Number(markerConfig.fitTarget || 0.6);
    const scaleVec = parseVec3(markerConfig.scale, { x: 1, y: 1, z: 1 });

    modelEntity.object3D.position.set(
      -center.x,
      -bbox.min.y,
      -center.z
    );

    const baseScale = fitTarget / maxDim;
    modelEntity.object3D.scale.set(
      scaleVec.x * baseScale,
      scaleVec.y * baseScale,
      scaleVec.z * baseScale
    );

    const rot = parseVec3(markerConfig.rotation, { x: 0, y: 0, z: 0 });
    modelEntity.object3D.rotation.set(
      THREE.MathUtils.degToRad(rot.x),
      THREE.MathUtils.degToRad(rot.y),
      THREE.MathUtils.degToRad(rot.z)
    );

    logDebug(
      `Model fitted: ${markerConfig.name} | size=${size.x.toFixed(3)},${size.y.toFixed(3)},${size.z.toFixed(3)} | baseScale=${baseScale.toFixed(4)}`
    );
  }

  function clearGeneratedMarkers() {
    scene.querySelectorAll("a-marker[data-generated='true']").forEach(function (node) {
      node.remove();
    });
  }

  function buildMarkers() {
    clearGeneratedMarkers();

    const smoothing = config.smoothing || {};
    const smoothCount = String(smoothing.count ?? 10);
    const smoothTolerance = String(smoothing.tolerance ?? 0.02);
    const smoothThreshold = String(smoothing.threshold ?? 5);

    (config.markers || []).forEach(function (marker) {
      const markerNode = document.createElement("a-marker");
      markerNode.setAttribute("type", "pattern");
      markerNode.setAttribute("url", marker.patternUrl);
      markerNode.setAttribute("emitevents", "true");
      markerNode.setAttribute("smooth", "true");
      markerNode.setAttribute("smooth-count", smoothCount);
      markerNode.setAttribute("smooth-tolerance", smoothTolerance);
      markerNode.setAttribute("smooth-threshold", smoothThreshold);
      markerNode.dataset.generated = "true";
      markerNode.dataset.markerName = marker.label || marker.name;

      if (marker.size) {
        markerNode.setAttribute("size", String(marker.size));
      }

      const anchor = document.createElement("a-entity");
      const pos = parseVec3(marker.position, { x: 0, y: 0.01, z: 0 });
      anchor.setAttribute("position", `${pos.x} ${pos.y} ${pos.z}`);
      anchor.object3D.visible = false;

      const modelEntity = document.createElement("a-entity");
      modelEntity.setAttribute("gltf-model", `url(${marker.modelUrl})`);
      modelEntity.setAttribute("visible", "true");
      modelEntity.setAttribute("shadow", "cast: true; receive: false");

      anchor.appendChild(modelEntity);
      markerNode.appendChild(anchor);

      let modelReady = false;

      modelEntity.addEventListener("model-loaded", function () {
        autoFitModel(modelEntity, marker);
        modelReady = true;
        logDebug(`model-loaded: ${marker.name}`);
      });

      modelEntity.addEventListener("model-error", function (event) {
        console.error("Model failed:", marker.name, event);
        setStatus(`Model failed: ${marker.label || marker.name}`, false);
        logDebug(`model-error: ${marker.name}`);
      });

      markerNode.addEventListener("markerFound", function () {
        state.foundMarker = markerNode.dataset.markerName;
        anchor.object3D.visible = true;

        setStatus(`Marker detected: ${state.foundMarker}`, true);

        if (noteText) {
          const prefix = config.ui?.foundNotePrefix || "Tracking marker";
          noteText.textContent = `${prefix} ${state.foundMarker}.`;
        }

        if (!modelReady) {
          logDebug(`markerFound before model-loaded: ${marker.name}`);
        } else {
          logDebug(`markerFound: ${marker.name}`);
        }
      });

      markerNode.addEventListener("markerLost", function () {
        anchor.object3D.visible = false;

        if (state.foundMarker === markerNode.dataset.markerName) {
          state.foundMarker = null;
          setStatus(config.ui?.searchingStatus || "Searching for marker...", false);

          if (noteText && config.ui?.defaultNote) {
            noteText.textContent = config.ui.defaultNote;
          }
        }

        logDebug(`markerLost: ${marker.name}`);
      });

      scene.insertBefore(markerNode, cameraNode);
    });
  }

  function updateRendererSize() {
    setViewportHeight();

    if (scene.renderer) {
      scene.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
      scene.renderer.setSize(window.innerWidth, window.innerHeight, false);
    }

    const video = document.getElementById("arjs-video") || scene.querySelector("video");
    if (video && state.debugEnabled) {
      logDebug(
        `Resize -> viewport ${window.innerWidth}x${window.innerHeight}, video ${video.videoWidth || 0}x${video.videoHeight || 0}`
      );
    }
  }

  function bindResizeHandlers() {
    let resizeTimer = null;

    function onResize() {
      window.clearTimeout(resizeTimer);
      resizeTimer = window.setTimeout(updateRendererSize, 120);
    }

    window.addEventListener("resize", onResize);
    window.addEventListener("orientationchange", onResize);

    if (window.visualViewport) {
      window.visualViewport.addEventListener("resize", onResize);
    }
  }

  function bindArjsEvents() {
    const onVideoLoaded = function () {
      state.streamReady = true;
      showLoading(false);
      setStatus(config.ui?.searchingStatus || "Searching for marker...", false);
      logDebug("arjs-video-loaded");
    };

    const onCameraInit = function () {
      logDebug("camera-init");
    };

    const onCameraError = function (event) {
      const msg = event?.detail?.error?.message || event?.error?.message || "Camera failed to initialize.";
      showError(msg);
    };

    [window, document, scene].forEach(function (target) {
      target.addEventListener("arjs-video-loaded", onVideoLoaded);
      target.addEventListener("camera-init", onCameraInit);
      target.addEventListener("camera-error", onCameraError);
    });
  }

  function monitorVideoFallback() {
    const startedAt = Date.now();
    const timeoutMs = 12000;

    const intervalId = window.setInterval(function () {
      const video = document.getElementById("arjs-video") || scene.querySelector("video");

      if (!video) {
        if (Date.now() - startedAt > timeoutMs) {
          window.clearInterval(intervalId);
          showError("Camera stream did not start. Please allow camera access and retry.");
        }
        return;
      }

      const ready = video.readyState >= 2 && video.videoWidth > 0 && video.videoHeight > 0;
      if (!ready) {
        if (Date.now() - startedAt > timeoutMs) {
          window.clearInterval(intervalId);
          showError("Camera is present but not delivering frames. Close other camera apps and retry.");
        }
        return;
      }

      if (!state.videoReadyLogged) {
        logDebug(`Video ready: ${video.videoWidth}x${video.videoHeight}`);
        logDebug(`Viewport: ${window.innerWidth}x${window.innerHeight}, DPR=${window.devicePixelRatio}`);
        state.videoReadyLogged = true;
      }

      state.streamReady = true;
      showLoading(false);
      setStatus(config.ui?.searchingStatus || "Searching for marker...", false);
      window.clearInterval(intervalId);
    }, 250);
  }

  async function requestCameraPermission() {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      throw new Error("This browser does not support camera access APIs.");
    }

    const stream = await navigator.mediaDevices.getUserMedia({
      audio: false,
      video: {
        facingMode: { ideal: "environment" },
        width: { ideal: 1280 },
        height: { ideal: 720 }
      }
    });

    stream.getTracks().forEach(function (track) {
      track.stop();
    });
  }

  async function startArFlow() {
    if (state.started) return;

    hideError();
    showPermission(false);
    showLoading(true);
    setStatus(config.ui?.bootStatus || "Starting camera...", false);

    try {
      await requestCameraPermission();
    } catch (error) {
      showPermission(true);
      showError("Camera permission denied or blocked. Enable camera access in browser/site settings.");
      return;
    }

    setRendererProfile();
    buildMarkers();

    if (noteText && config.ui?.defaultNote) {
      noteText.textContent = config.ui.defaultNote;
    }

    if (scene.hasLoaded) {
      updateRendererSize();
    } else {
      scene.addEventListener("loaded", updateRendererSize, { once: true });
    }

    monitorVideoFallback();
    state.started = true;
  }

  function bootstrap() {
    attachDebugToggle();
    bindArjsEvents();
    bindResizeHandlers();
    setViewportHeight();

    showLoading(false);
    showPermission(true);
    setStatus(config.ui?.idleStatus || "Ready to detect marker", false);

    if (state.debugEnabled) {
      logDebug(`Initial viewport ${window.innerWidth}x${window.innerHeight}, DPR=${window.devicePixelRatio}`);
      logDebug(`Markers configured: ${(config.markers || []).map((m) => m.name).join(", ")}`);
    }

    if (startButton) {
      startButton.addEventListener("click", startArFlow);
    }

    if (retryButton) {
      retryButton.addEventListener("click", function () {
        window.location.reload();
      });
    }
  }

  bootstrap();
})();