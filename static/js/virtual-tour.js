(function () {
  const app = document.getElementById("tourApp");
  const viewerContainer = document.getElementById("tourViewer");
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

  const rawScenes = {
    frontGate: {
      type: "equirectangular",
      panorama: app.dataset.panoramaSrc,
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
        {
          id: "go-right-front-gate",
          pitch: -10,
          yaw: 90,
          type: "scene",
          text: "Move to right viewpoint",
          targetPitch: -20,
          targetYaw: 90,
          targetHfov: 100,
          sceneId: "rightFrontGate",
          
          cssClass: "tour-ground-hotspot",
        },
        {
          id: "go-inside-front-gate",
          pitch: -17,
          yaw: -10.2,
          type: "scene",
          text: "Move inside the front gate",
          sceneId: "insideFrontGate",
          cssClass: "tour-ground-hotspot",
        },
      ],
    },
    insideFrontGate: {
      type: "equirectangular",
      panorama: app.dataset.panoramaInsideFrontGateSrc,
      pitch: 0,
      yaw: 0,
      hfov: 100,
      hotSpots: [
        {
          id: "go-inside-front-gate-1",
          pitch: -18,
          yaw: 2,
          type: "scene",
          text: "Move deeper inside the front gate",
          sceneId: "insideFrontGate1",
          cssClass: "tour-ground-hotspot",
        },
        {
          id: "return-front-gate-from-inside",
          pitch: -16,
          yaw: 180,
          type: "scene",
          text: "Return to front gate view",
          sceneId: "frontGate",
          targetPitch: -20,
          targetYaw: 170,
          targetHfov: 100,
          cssClass: "tour-ground-hotspot",
        },
      ],
    },
    insideFrontGate1: {
      type: "equirectangular",
      panorama: app.dataset.panoramaInsideFrontGate1Src,
      pitch: 0,
      yaw: 0,
      hfov: 100,
      hotSpots: [
        {
          id: "go-middle-g-inside",
          pitch: -5,
          yaw: -4,
          type: "scene",
          text: "Move to middle gate inside view",
          sceneId: "middleGInside",
          cssClass: "tour-ground-hotspot",
        },
        {
          id: "return-inside-front-gate",
          pitch: -15,
          yaw: 175,
          type: "scene",
          text: "Return to inside front gate view",
          sceneId: "insideFrontGate",
          targetPitch: -20,
          targetYaw: 170,
          targetHfov: 100,
          cssClass: "tour-ground-hotspot",
        },
      ],
    },
    middleGInside: {
      type: "equirectangular",
      panorama: app.dataset.panoramaMiddleGInsideSrc,
      pitch: 0,
      yaw: 123,
      hfov: 100,
      hotSpots: [
        {
          id: "go-front-church",
          pitch: -5,
          yaw: 125,
          type: "scene",
          text: "Move to front church view",
          sceneId: "frontChurch",
          cssClass: "tour-ground-hotspot",
        },
        {
          id: "return-inside-front-gate-1",
          pitch: -7,
          yaw: -55,
          type: "scene",
          text: "Return to inside front gate 1 view",
          sceneId: "insideFrontGate1",
          targetPitch: -20,
          targetYaw: 180,
          targetHfov: 100,
          cssClass: "tour-ground-hotspot",
        },
      ],
    },
    frontChurch: {
      type: "equirectangular",
      panorama: app.dataset.panoramaFrontChurchSrc,
      pitch: 0,
      yaw: -10,
      hfov: 100,
      hotSpots: [
        {
          id: "return-middle-g-inside",
          pitch: -7,
          yaw: 166,
          type: "scene",
          text: "Return to middle gate inside view",
          sceneId: "middleGInside",
          targetPitch: -20,
          targetYaw: -55,
          targetHfov: 100,
          cssClass: "tour-ground-hotspot",
        },
      ],
    },
    rightFrontGate: {
      type: "equirectangular",
      panorama: app.dataset.panoramaRightSrc,
      pitch: -20,
      yaw: 90,
      hfov: 100,
      hotSpots: [
        {
          id: "return-front-gate-from-right",
          pitch: -11,
          yaw: -89,
          type: "scene",
          text: "Return to front gate view",
          sceneId: "frontGate",
          targetPitch: -20,
          targetYaw: -90,
          targetHfov: 100,
          cssClass: "tour-ground-hotspot",
        },
      ],
    },
    leftFrontGate: {
      type: "equirectangular",
      panorama: app.dataset.panoramaLeftSrc,
      pitch: -2,
      yaw: -93,
      hfov: 100,
      hotSpots: [
        {
          id: "go-left-flag",
          pitch: -14,
          yaw: -95,
          type: "scene",
          text: "Move to flag viewpoint",
          sceneId: "leftFlag",
          cssClass: "tour-ground-hotspot",
        },
        {
          id: "return-front-gate",
          pitch: -14,
          yaw: 105,
          type: "scene",
          text: "Return to front gate view",
          sceneId: "frontGate",
          targetPitch: -20,
          targetYaw: 90,
          targetHfov: 100,
          cssClass: "tour-ground-hotspot",
        },
      ],
    },
    leftFlag: {
      type: "equirectangular",
      panorama: app.dataset.panoramaFlagSrc,
      pitch: -5,
      yaw: -100,
      hfov: 100,
      hotSpots: [
        {
          id: "go-middle-g-museum",
          pitch: -18,
          yaw: -101.5,
          type: "scene",
          text: "Move to middle gate museum view",
          sceneId: "middleGMuseum",
          cssClass: "tour-ground-hotspot",
        },
        {
          id: "return-left-front-gate",
          pitch: -15,
          yaw: 75,
          type: "scene",
          text: "Return to left front gate",
          sceneId: "leftFrontGate",
          targetPitch: -20,
          targetYaw: 90,
          targetHfov: 100,
          cssClass: "tour-ground-hotspot",
        },
      ],
    },
    middleGMuseum: {
      type: "equirectangular",
      panorama: app.dataset.panoramaMiddleGSrc,
      pitch: -5,
      yaw: -100,
      hfov: 100,
      hotSpots: [
        {
          id: "go-front-museum",
          pitch: -25,
          yaw: -100,
          type: "scene",
          text: "Move to front museum view",
          sceneId: "frontMuseum",
          cssClass: "tour-ground-hotspot",
        },
        {
          id: "return-left-flag",
          pitch: -17,
          yaw: 83,
          type: "scene",
          text: "Return to flag viewpoint",
          sceneId: "leftFlag",
          targetPitch: -20,
          targetYaw: 90,
          targetHfov: 100,
          cssClass: "tour-ground-hotspot",
        },
      ],
    },
    frontMuseum: {
      type: "equirectangular",
      panorama: app.dataset.panoramaFrontMuseumSrc,
      pitch: 0,
      yaw: 0,
      hfov: 100,
      hotSpots: [
        {
          id: "go-inside-museum",
          pitch: -12,
          yaw: 37,
          type: "scene",
          text: "Move inside the museum",
          sceneId: "insideMuseum",
          cssClass: "tour-ground-hotspot tour-ground-hotspot--enter",
        },
        {
          id: "return-middle-g-museum",
          pitch: -30,
          yaw: 173,
          type: "scene",
          text: "Return to middle gate museum view",
          sceneId: "middleGMuseum",
          targetPitch: -20,
          targetYaw: 90,
          targetHfov: 100,
          cssClass: "tour-ground-hotspot",
        },
      ],
    },
    insideMuseum: {
      type: "equirectangular",
      panorama: app.dataset.panoramaInsideMuseumSrc,
      pitch: -5,
      yaw: 90,
      hfov: 150,
      hotSpots: [
        {
          id: "go-museum-1",
          pitch: -50,
          yaw: 40,
          type: "scene",
          text: "Move to museum 1 view",
          sceneId: "museum1",
          cssClass: "tour-ground-hotspot",
        },
        {
          id: "return-front-museum",
          pitch: -60,
          yaw: 180,
          type: "scene",
          text: "Return to front museum view",
          sceneId: "frontMuseum",
          targetPitch: -20,
          targetYaw: 180,
          targetHfov: 140,
          cssClass: "tour-ground-hotspot tour-ground-hotspot--exit",
        },
      ],
    },
    museum1: {
      type: "equirectangular",
      panorama: app.dataset.panoramaMuseum1Src,
      pitch: -20,
      yaw: 75,
      hfov: 140,
      hotSpots: [
        {
          id: "go-museum-2",
          pitch: -30,
          yaw: -100,
          type: "scene",
          text: "Move to museum 2 view",
          sceneId: "museum2",
          cssClass: "tour-ground-hotspot",
        },
        {
          id: "return-inside-museum",
          pitch: -45,
          yaw: 180,
          type: "scene",
          text: "Return to inside museum view",
          sceneId: "insideMuseum",
          targetPitch: -20,
          targetYaw: 180,
          targetHfov: 140,
          cssClass: "tour-ground-hotspot",
        },
      ],
    },
    museum2: {
      type: "equirectangular",
      panorama: app.dataset.panoramaMuseum2Src,
      pitch: -20,
      yaw: 80,
      hfov: 100,
      hotSpots: [
        {
          id: "go-museum-3",
          pitch: -23,
          yaw: 83,
          type: "scene",
          text: "Move to museum 3 view",
          sceneId: "museum3",
          cssClass: "tour-ground-hotspot",
        },
        {
          id: "return-museum-1",
          pitch: -30,
          yaw: -110,
          type: "scene",
          text: "Return to museum 1 view",
          sceneId: "museum1",
          targetPitch: -20,
          targetYaw: 180,
          targetHfov: 140,
          cssClass: "tour-ground-hotspot",
        },
      ],
    },
    museum3: {
      type: "equirectangular",
      panorama: app.dataset.panoramaMuseum3Src,
      pitch: -12,
      yaw: 170,
      hfov: 100,
      hotSpots: [
        {
          id: "return-museum-2",
          pitch: -30,
          yaw: -10,
          type: "scene",
          text: "Return to museum 2 view",
          sceneId: "museum2",
          targetPitch: -20,
          targetYaw: -100,
          targetHfov: 100,
          cssClass: "tour-ground-hotspot",
        },
      ],
    },
  };

  const requestedScene = debugParams.get("scene");
  const initialScene = requestedScene && Object.prototype.hasOwnProperty.call(rawScenes, requestedScene) ? requestedScene : "frontGate";

  function syncSceneInUrl(sceneId) {
    if (!sceneId || !Object.prototype.hasOwnProperty.call(rawScenes, sceneId)) {
      return;
    }

    const nextUrl = new URL(window.location.href);
    nextUrl.searchParams.set("scene", sceneId);
    window.history.replaceState({}, "", nextUrl);
  }

  function getSafeTextureLimit() {
    try {
      const canvas = document.createElement("canvas");
      const gl = canvas.getContext("webgl") || canvas.getContext("experimental-webgl");
      const maxTextureSize = gl ? gl.getParameter(gl.MAX_TEXTURE_SIZE) : 4096;
      return Math.max(2048, Math.min(maxTextureSize || 4096, 8192));
    } catch (error) {
      return 4096;
    }
  }

  function loadImage(src) {
    return new Promise((resolve, reject) => {
      const image = new Image();
      image.decoding = "async";
      image.onload = function () {
        resolve(image);
      };
      image.onerror = function () {
        reject(new Error(`Unable to load panorama source: ${src}`));
      };
      image.src = src;
    });
  }

  async function buildSafePanoramaSource(src, maxTextureSize) {
    const image = await loadImage(src);
    const longestSide = Math.max(image.naturalWidth || image.width, image.naturalHeight || image.height);

    if (longestSide <= maxTextureSize) {
      return src;
    }

    const scale = maxTextureSize / longestSide;
    const targetWidth = Math.max(1, Math.round((image.naturalWidth || image.width) * scale));
    const targetHeight = Math.max(1, Math.round((image.naturalHeight || image.height) * scale));
    const canvas = document.createElement("canvas");
    const context = canvas.getContext("2d", { alpha: false });

    if (!context) {
      return src;
    }

    canvas.width = targetWidth;
    canvas.height = targetHeight;
    context.imageSmoothingEnabled = true;
    context.imageSmoothingQuality = "high";
    context.drawImage(image, 0, 0, targetWidth, targetHeight);

    return canvas.toDataURL("image/jpeg", 0.92);
  }

  async function buildScenes() {
    const maxTextureSize = getSafeTextureLimit();
    const sceneEntries = await Promise.all(
      Object.entries(rawScenes).map(async ([sceneId, scene]) => {
        const safePanorama = await buildSafePanoramaSource(scene.panorama, maxTextureSize);
        return [sceneId, { ...scene, panorama: safePanorama }];
      })
    );

    return Object.fromEntries(sceneEntries);
  }

  if (!rawScenes.frontGate.panorama || !rawScenes.insideFrontGate.panorama || !rawScenes.insideFrontGate1.panorama || !rawScenes.middleGInside.panorama || !rawScenes.frontChurch.panorama || !rawScenes.rightFrontGate.panorama || !rawScenes.leftFrontGate.panorama || !rawScenes.leftFlag.panorama || !rawScenes.middleGMuseum.panorama || !rawScenes.frontMuseum.panorama || !rawScenes.insideMuseum.panorama || !rawScenes.museum1.panorama || !rawScenes.museum2.panorama || !rawScenes.museum3.panorama) {
    if (loadingOverlay) {
      loadingOverlay.hidden = true;
    }
    if (errorOverlay) {
      errorOverlay.hidden = false;
    }
    return;
  }

  buildScenes()
    .then((scenes) => {
      const viewer = window.pannellum.viewer("tourViewer", {
        default: {
          firstScene: initialScene,
          sceneFadeDuration: 1000,
        },
        scenes,
        autoLoad: true,
        hotSpotDebug: hotspotDebugEnabled,
        showControls: true,
        compass: false,
        autoRotate: 0,
        hfov: 100,
        minHfov: 50,
        maxHfov: 140,
        mouseZoom: true,
        draggable: true,
        disableKeyboardCtrl: false,
        showZoomCtrl: true,
        showFullscreenCtrl: true,
        loadingText: "Loading 360 view...",
      });

      if (viewer && typeof viewer.on === "function") {
        syncSceneInUrl(initialScene);

        viewer.on("scenechange", function (sceneId) {
          syncSceneInUrl(sceneId);
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
    })
    .catch(() => {
      if (loadingOverlay) {
        loadingOverlay.hidden = true;
      }
      if (errorOverlay) {
        errorOverlay.hidden = false;
      }
    });
})();
