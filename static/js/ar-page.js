(function () {
  const page = document.body;
  if (!page || !page.classList.contains("ar-page")) {
    return;
  }

  const configNode = document.getElementById("arPageConfig");
  const scene = document.getElementById("arScene");
  const assetsNode = document.getElementById("arAssets");
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

  if (!configNode || !scene || !assetsNode || !cameraNode) {
    return;
  }

  let config;
  try {
    config = JSON.parse(configNode.textContent || "{}");
  } catch (error) {
    console.error("Invalid AR config JSON", error);
    return;
  }

  const state = {
    foundMarker: null,
    debugEnabled: new URLSearchParams(window.location.search).get("debug") === "1",
    started: false,
    streamReady: false,
    videoLogDone: false,
    statusText: config.ui?.idleStatus || "Ready to detect marker",
  };

  function isMobileDevice() {
    return /android|iphone|ipad|ipod|mobile/i.test(navigator.userAgent);
  }

  function setViewportHeight() {
    // Keep visual layers synced with real viewport height to avoid mobile URL bar jumps.
    const height = window.innerHeight;
    document.documentElement.style.setProperty("--ar-height", `${height}px`);
  }

  function logDebug(message) {
    if (!state.debugEnabled || !debugPanel) {
      return;
    }

    const timestamp = new Date().toLocaleTimeString();
    debugPanel.textContent = `[${timestamp}] ${message}\n${debugPanel.textContent}`;
    console.log(`[AR Debug] ${message}`);
  }

  function setStatus(text, found) {
    state.statusText = text;
    if (statusChip) {
      statusChip.textContent = text;
      statusChip.classList.toggle("is-found", Boolean(found));
    }
  }

  function showLoading(show) {
    if (loadingOverlay) {
      loadingOverlay.hidden = !show;
    }
  }

  function showPermission(show) {
    if (permissionOverlay) {
      permissionOverlay.hidden = !show;
    }
  }

  function showError(message) {
    if (errorMessage) {
      errorMessage.textContent = message;
    }

    if (errorOverlay) {
      errorOverlay.hidden = false;
    }

    setStatus("Camera unavailable", false);
    showLoading(false);
    logDebug(`Error: ${message}`);
  }

  function hideError() {
    if (errorOverlay) {
      errorOverlay.hidden = true;
    }
  }

  function attachDebugToggle() {
    if (!debugToggle || !debugPanel) {
      return;
    }

    debugPanel.hidden = !state.debugEnabled;
    debugToggle.setAttribute("aria-pressed", state.debugEnabled ? "true" : "false");

    debugToggle.addEventListener("click", function () {
      state.debugEnabled = !state.debugEnabled;
      debugPanel.hidden = !state.debugEnabled;
      debugToggle.setAttribute("aria-pressed", state.debugEnabled ? "true" : "false");
      logDebug(`Debug ${state.debugEnabled ? "enabled" : "disabled"}`);
    });
  }

  function buildAssetsAndMarkers() {
    assetsNode.innerHTML = "";
    scene.querySelectorAll("a-marker[data-generated='true']").forEach(function (node) {
      node.remove();
    });

    const smooth = config.smoothing || {};
    const smoothCount = String(smooth.count ?? 10);
    const smoothTolerance = String(smooth.tolerance ?? 0.02);
    const smoothThreshold = String(smooth.threshold ?? 5);

    (config.markers || []).forEach(function (marker) {
      const assetId = `${marker.name}Model`;

      const asset = document.createElement("a-asset-item");
      asset.setAttribute("id", assetId);
      asset.setAttribute("src", marker.modelUrl);
      asset.addEventListener("loaded", function () {
        logDebug(`Asset loaded: ${marker.name}`);
      });
      asset.addEventListener("error", function () {
        logDebug(`Asset failed: ${marker.name}`);
      });
      assetsNode.appendChild(asset);

      const markerNode = document.createElement("a-marker");
      markerNode.setAttribute("type", "pattern");
      markerNode.setAttribute("url", marker.patternUrl);
      markerNode.setAttribute("smooth", "true");
      markerNode.setAttribute("smooth-count", smoothCount);
      markerNode.setAttribute("smooth-tolerance", smoothTolerance);
      markerNode.setAttribute("smooth-threshold", smoothThreshold);
      markerNode.setAttribute("emitevents", "true");
      markerNode.dataset.generated = "true";
      markerNode.dataset.markerName = marker.label || marker.name;

      const entity = document.createElement("a-entity");
      entity.setAttribute("gltf-model", `#${assetId}`);
      entity.setAttribute("position", marker.position || "0 0 0");
      entity.setAttribute("rotation", marker.rotation || "0 0 0");
      entity.setAttribute("scale", marker.scale || "0.5 0.5 0.5");
      entity.setAttribute("shadow", "cast: true; receive: false");
      markerNode.appendChild(entity);

      markerNode.addEventListener("markerFound", function () {
        state.foundMarker = markerNode.dataset.markerName;
        setStatus(`Marker detected: ${state.foundMarker}`, true);

        if (noteText && config.ui?.foundNotePrefix) {
          noteText.textContent = `${config.ui.foundNotePrefix} ${state.foundMarker}.`;
        }

        logDebug(`markerFound: ${state.foundMarker}`);
      });

      markerNode.addEventListener("markerLost", function () {
        const lostName = markerNode.dataset.markerName;
        if (state.foundMarker === lostName) {
          state.foundMarker = null;
          setStatus(config.ui?.searchingStatus || "Searching for marker...", false);
          if (noteText && config.ui?.defaultNote) {
            noteText.textContent = config.ui.defaultNote;
          }
        }
        logDebug(`markerLost: ${lostName}`);
      });

      scene.insertBefore(markerNode, cameraNode);
    });
  }

  function monitorVideoReadiness() {
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

      if (ready) {
        if (!state.videoLogDone) {
          logDebug(`Video ready: ${video.videoWidth}x${video.videoHeight}`);
          logDebug(`Viewport: ${window.innerWidth}x${window.innerHeight}, DPR=${window.devicePixelRatio}`);
          state.videoLogDone = true;
        }

        state.streamReady = true;
        showLoading(false);
        setStatus(config.ui?.searchingStatus || "Searching for marker...", false);
        window.clearInterval(intervalId);
        return;
      }

      if (Date.now() - startedAt > timeoutMs) {
        window.clearInterval(intervalId);
        showError("Camera is present but not delivering frames. Close other camera apps and retry.");
      }
    }, 250);
  }

  function setRendererProfile() {
    const mobile = isMobileDevice();
    const rendererConfig = [
      `alpha: true`,
      `antialias: ${mobile ? "false" : "true"}`,
      `precision: ${mobile ? "mediump" : "highp"}`,
      `colorManagement: true`,
      `logarithmicDepthBuffer: false`,
      `physicallyCorrectLights: false`,
    ].join("; ");

    scene.setAttribute("renderer", rendererConfig);
    logDebug(`Renderer config: ${rendererConfig}`);
  }

  function forceSceneResize() {
    setViewportHeight();
    window.dispatchEvent(new Event("resize"));

    if (scene.renderer) {
      scene.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
      scene.renderer.setSize(window.innerWidth, window.innerHeight);
    }

    if (scene.camera) {
      scene.camera.aspect = window.innerWidth / Math.max(window.innerHeight, 1);
      scene.camera.updateProjectionMatrix();
    }

    const video = document.getElementById("arjs-video") || scene.querySelector("video");
    if (video && state.debugEnabled) {
      logDebug(`Resize -> viewport ${window.innerWidth}x${window.innerHeight}, video ${video.videoWidth}x${video.videoHeight}`);
    }
  }

  function bindResizeHandlers() {
    let resizeTimer;
    function onResize() {
      window.clearTimeout(resizeTimer);
      resizeTimer = window.setTimeout(forceSceneResize, 120);
    }

    window.addEventListener("resize", onResize);
    window.addEventListener("orientationchange", onResize);
    if (window.visualViewport) {
      window.visualViewport.addEventListener("resize", onResize);
    }
  }

  async function requestCameraPermission() {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      throw new Error("This browser does not support camera access APIs.");
    }

    const stream = await navigator.mediaDevices.getUserMedia({
      audio: false,
      video: {
        facingMode: "environment",
      },
    });

    stream.getTracks().forEach(function (track) {
      track.stop();
    });
  }

  async function startArFlow() {
    if (state.started) {
      return;
    }

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
    buildAssetsAndMarkers();

    if (noteText && config.ui?.defaultNote) {
      noteText.textContent = config.ui.defaultNote;
    }

    scene.addEventListener("loaded", forceSceneResize, { once: true });
    monitorVideoReadiness();
    state.started = true;
  }

  function bootstrap() {
    attachDebugToggle();
    setViewportHeight();
    bindResizeHandlers();
    showLoading(false);
    showPermission(true);

    setStatus(config.ui?.idleStatus || "Ready to detect marker", false);

    if (state.debugEnabled) {
      logDebug(`Initial viewport ${window.innerWidth}x${window.innerHeight}, DPR=${window.devicePixelRatio}`);
      logDebug(`Markers configured: ${(config.markers || []).map(function (m) { return m.name; }).join(", ")}`);
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
