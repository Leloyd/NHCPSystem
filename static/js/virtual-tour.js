(function () {
  const app = document.getElementById("tourApp");
  const viewerContainer = document.getElementById("tourViewer");
  const titleEl = document.getElementById("tourTitle");
  const subtitleEl = document.getElementById("tourSubtitle");
  const loadingOverlay = document.getElementById("tourLoadingOverlay");
  const errorOverlay = document.getElementById("tourErrorOverlay");
  const debugParams = new URLSearchParams(window.location.search);
  const hotspotDebugEnabled = debugParams.get("debugHotspots") === "1";

  if (!app || !viewerContainer || !window.pannellum) {
    if (loadingOverlay) {
      loadingOverlay.hidden = true;
    }
    if (errorOverlay) {
      errorOverlay.hidden = false;
    }
    return;
  }

  const sceneContent = {
    frontGate: {
      title: app.dataset.panoramaTitle || "Front Gate Panorama",
      subtitle: app.dataset.panoramaSubtitle || "Drag to look around the site and use scroll or pinch to zoom.",
    },
    leftFrontGate: {
      title: app.dataset.panoramaLeftTitle || "Left Front Gate Panorama",
      subtitle: app.dataset.panoramaLeftSubtitle || "Continue exploring from a left-side perspective of the front gate.",
    },
  };

  const scenes = {
    frontGate: {
      type: "equirectangular",
      panorama: app.dataset.panoramaSrc,
      title: sceneContent.frontGate.title,
      pitch: 1.8,
      yaw: -10.2,
      hfov: 150,
      hotSpots: [
        {
          id: "go-left-front-gate",
          pitch: -12,
          yaw: -83,
          type: "scene",
          text: "Move to left viewpoint",
          sceneId: "leftFrontGate",
          cssClass: "tour-ground-hotspot",
        },
      ],
    },
    leftFrontGate: {
      type: "equirectangular",
      panorama: app.dataset.panoramaLeftSrc,
      title: sceneContent.leftFrontGate.title,
      pitch: -2,
      yaw: -93,
      hfov: 100,
      hotSpots: [
        {
          id: "return-front-gate",
          pitch: -14,
          yaw: 105,
          type: "scene",
          text: "Return to front gate view",
          sceneId: "frontGate",
          cssClass: "tour-ground-hotspot",
        },
      ],
    },
  };

  function updateSceneCopy(sceneId) {
    const nextScene = sceneContent[sceneId];
    if (!nextScene) {
      return;
    }

    if (titleEl) {
      titleEl.textContent = nextScene.title;
    }

    if (subtitleEl) {
      subtitleEl.textContent = nextScene.subtitle;
    }
  }

  if (!scenes.frontGate.panorama || !scenes.leftFrontGate.panorama) {
    if (loadingOverlay) {
      loadingOverlay.hidden = true;
    }
    if (errorOverlay) {
      errorOverlay.hidden = false;
    }
    return;
  }

  try {
    const viewer = window.pannellum.viewer("tourViewer", {
      default: {
        firstScene: "frontGate",
        sceneFadeDuration: 1000,
      },
      scenes,
      autoLoad: true,
      hotSpotDebug: hotspotDebugEnabled,
      showControls: true,
      compass: false,
      autoRotate: 0,
      hfov: 100,
      minHfov: 45,
      maxHfov: 120,
      mouseZoom: true,
      draggable: true,
      disableKeyboardCtrl: false,
      showZoomCtrl: true,
      showFullscreenCtrl: true,
      loadingText: "Loading 360 view...",
    });

    updateSceneCopy("frontGate");

    if (viewer && typeof viewer.on === "function") {
      viewer.on("scenechange", function (sceneId) {
        updateSceneCopy(sceneId);
      });
      viewer.on("load", function () {
        if (loadingOverlay) {
          loadingOverlay.hidden = true;
        }
        if (errorOverlay) {
          errorOverlay.hidden = true;
        }
      });

      if (hotspotDebugEnabled) {
        viewer.on("mousedown", function (event) {
          const coords = viewer.mouseEventToCoords(event);
          if (!coords || coords.length < 2) {
            return;
          }

          const pitch = Number(coords[0].toFixed(2));
          const yaw = Number(coords[1].toFixed(2));
          const sceneId = typeof viewer.getScene === "function" ? viewer.getScene() : "unknown";

          console.log(`[VirtualTour hotspot helper] scene=${sceneId} pitch=${pitch} yaw=${yaw}`);
          console.log({ sceneId, pitch, yaw });
        });
      }
    }

    window.setTimeout(() => {
      if (loadingOverlay) {
        loadingOverlay.hidden = true;
      }
      if (errorOverlay) {
        errorOverlay.hidden = true;
      }
    }, 900);
  } catch (error) {
    if (loadingOverlay) {
      loadingOverlay.hidden = true;
    }
    if (errorOverlay) {
      errorOverlay.hidden = false;
    }
  }
})();
