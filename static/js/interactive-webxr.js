(function () {
  const statusBadge = document.getElementById("webxrStatusBadge");
  const statusText = document.getElementById("webxrStatusText");
  const startButton = document.getElementById("startWebxrButton");
  const fallbackButton = document.getElementById("openFallbackButton");
  const webxrArea = document.getElementById("webxrCanvasArea");
  const fallbackArea = document.getElementById("fallbackExperienceArea");

  if (!statusBadge || !statusText || !startButton || !fallbackButton || !webxrArea || !fallbackArea) {
    return;
  }

  function showArea(areaToShow) {
    webxrArea.classList.add("hidden");
    fallbackArea.classList.add("hidden");
    areaToShow.classList.remove("hidden");
  }

  async function supportsWebXR() {
    if (!("xr" in navigator) || !navigator.xr || typeof navigator.xr.isSessionSupported !== "function") {
      return false;
    }

    try {
      const immersiveVr = await navigator.xr.isSessionSupported("immersive-vr");
      const immersiveAr = await navigator.xr.isSessionSupported("immersive-ar");
      return immersiveVr || immersiveAr;
    } catch (_error) {
      return false;
    }
  }

  function setSupportedUi() {
    statusBadge.textContent = "WebXR Supported";
    statusBadge.className = "px-4 py-2 rounded-full text-sm font-medium bg-green-100 text-green-800";
    statusText.textContent = "Your browser appears to support WebXR. You can launch immersive prototype mode.";
    startButton.disabled = false;
  }

  function setUnsupportedUi() {
    statusBadge.textContent = "Fallback Recommended";
    statusBadge.className = "px-4 py-2 rounded-full text-sm font-medium bg-amber-100 text-amber-800";
    statusText.textContent = "WebXR is not available on this device/browser. Use the 2D fallback for equivalent content access.";
    startButton.disabled = true;
  }

  startButton.addEventListener("click", function () {
    showArea(webxrArea);
    statusText.textContent = "WebXR prototype panel loaded. Connect your real scene integration in the next iteration.";
  });

  fallbackButton.addEventListener("click", function () {
    showArea(fallbackArea);
    statusText.textContent = "2D fallback is active. You can continue with hotspot descriptions and quiz activities.";
  });

  supportsWebXR().then(function (isSupported) {
    if (isSupported) {
      setSupportedUi();
    } else {
      setUnsupportedUi();
    }
  });
})();
