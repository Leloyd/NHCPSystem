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
          id: "go-left-front-church",
          pitch: -20,
          yaw: -75,
          type: "scene",
          text: "Move to left church view",
          sceneId: "leftFrontChurch",
          targetPitch: -20,
          targetYaw: -80,
          targetHfov: 100,
          cssClass: "tour-ground-hotspot",
        },
        {
          id: "go-right-front-church",
          pitch: -17,
          yaw: 48,
          type: "scene",
          text: "Move to right church view",
          sceneId: "rightFrontChurch",
          cssClass: "tour-ground-hotspot",
        },
        {
          id: "go-inside-church-from-front-church",
          pitch: 0,
          yaw: -15,
          type: "scene",
          text: "Move inside the church",
          sceneId: "insideChurch",
          cssClass: "tour-ground-hotspot tour-ground-hotspot--enter",
        },
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
    leftFrontChurch: {
      type: "equirectangular",
      panorama: app.dataset.panoramaLeftFrontChurchSrc,
      pitch: 0,
      yaw: 0,
      hfov: 100,
      hotSpots: [
        {
          id: "return-front-church-from-left",
          pitch: -25,
          yaw: 66,
          type: "scene",
          text: "Return to front church view",
          sceneId: "frontChurch",
          targetPitch: -20,
          targetYaw: 55,
          targetHfov: 100,
          cssClass: "tour-ground-hotspot",
        },
        {
          id: "go-inside-church-from-left",
          pitch: 0,
          yaw: -18,
          type: "scene",
          text: "Move inside the church",
          sceneId: "insideChurch",
          cssClass: "tour-ground-hotspot tour-ground-hotspot--enter",
        },
      ],
    },
    insideChurch: {
      type: "equirectangular",
      panorama: app.dataset.panoramaInsideChurchSrc,
      pitch: 0,
      yaw: -24,
      hfov: 100,
      hotSpots: [
        {
          id: "go-stairs-church",
          pitch: -29,
          yaw: 68,
          type: "scene",
          text: "Move to church stairs view",
          sceneId: "stairsChurch",
          cssClass: "tour-ground-hotspot",
        },
        {
          id: "go-inside-church-1",
          pitch: -23,
          yaw: -24,
          type: "scene",
          text: "Move deeper inside the church",
          sceneId: "insideChurch1",
          cssClass: "tour-ground-hotspot",
        },
        {
          id: "return-front-church-from-inside-church",
          pitch: -12,
          yaw: 155,
          type: "scene",
          text: "Return to front church view",
          sceneId: "frontChurch",
          sceneId: "frontChurch",
          cssClass: "tour-ground-hotspot tour-ground-hotspot--exit",
        },
      ],
    },
    stairsChurch: {
      type: "equirectangular",
      panorama: app.dataset.panoramaStairsChurchSrc,
      pitch: 0,
      yaw: 0,
      hfov: 100,
      hotSpots: [
        {
          id: "go-underground-1",
          pitch: -45,
          yaw: -10,
          type: "scene",
          text: "Move to underground view",
          sceneId: "underground1",
          cssClass: "tour-ground-hotspot",
        },
        {
          id: "return-inside-church-from-stairs",
          pitch: 2,
          yaw: -50,
          type: "scene",
          text: "Return to inside church view",
          sceneId: "insideChurch",
          cssClass: "tour-ground-hotspot",
        },
      ],
    },
    underground1: {
      type: "equirectangular",
      panorama: app.dataset.panoramaUnderground1Src,
      pitch: 0,
      yaw: -20,
      hfov: 100,
      hotSpots: [
        {
          id: "go-middle-underground",
          pitch: -36,
          yaw: -17,
          type: "scene",
          text: "Move to middle underground view",
          sceneId: "middleUnderground",
          targetPitch: 0,
          targetYaw: 60,
          targetHfov: 100,
          cssClass: "tour-ground-hotspot",
        },
        {
          id: "return-stairs-church-from-underground",
          pitch: -6,
          yaw: 164,
          type: "scene",
          text: "Return to church stairs view",
          sceneId: "stairsChurch",
          cssClass: "tour-ground-hotspot",
        },
      ],
    },
    middleUnderground: {
      type: "equirectangular",
      panorama: app.dataset.panoramaMiddleUndergroundSrc,
      pitch: 0,
      yaw: -110,
      hfov: 100,
      hotSpots: [
        {
          id: "go-front-altar-underground",
          pitch: -33,
          yaw: -22,
          type: "scene",
          text: "Move to front altar underground view",
          sceneId: "frontAltarUnderground",
          targetPitch: -5,
          targetYaw: 180,
          targetHfov: 100,
          cssClass: "tour-ground-hotspot",
        },
        {
          id: "go-underground-2",
          pitch: -27,
          yaw: 67,
          type: "scene",
          text: "Move to underground 2 view",
          sceneId: "underground2",
          cssClass: "tour-ground-hotspot",
        },
        {
          id: "go-underground-3",
          pitch: -22,
          yaw: 158,
          type: "scene",
          text: "Move to underground 3 view",
          sceneId: "underground3",
          cssClass: "tour-ground-hotspot",
        },
        {
          id: "return-underground-1-from-middle",
          pitch: -30,
          yaw: 248,
          type: "scene",
          text: "Return to underground view",
          sceneId: "underground1",
          targetPitch: 0,
          targetYaw: 170,
          targetHfov: 100,
          cssClass: "tour-ground-hotspot",
        },
      ],
    },
    frontAltarUnderground: {
      type: "equirectangular",
      panorama: app.dataset.panoramaFrontAltarUndergroundSrc,
      pitch: 0,
      yaw: 0,
      hfov: 100,
      hotSpots: [
        {
          id: "return-middle-underground-from-front-altar",
          pitch: -45,
          yaw: -9,
          type: "scene",
          text: "Return to middle underground view",
          sceneId: "middleUnderground",
          targetPitch: 0,
          targetYaw: -200,
          targetHfov: 100,
          cssClass: "tour-ground-hotspot",
        },
      ],
    },
    underground2: {
      type: "equirectangular",
      panorama: app.dataset.panoramaUnderground2Src,
      pitch: 0,
      yaw: -14,
      hfov: 100,
      hotSpots: [
        {
          id: "return-middle-underground-from-underground-2",
          pitch: -35,
          yaw: -17,
          type: "scene",
          text: "Return to middle underground view",
          sceneId: "middleUnderground",
          cssClass: "tour-ground-hotspot",
        },
      ],
    },
    underground3: {
      type: "equirectangular",
      panorama: app.dataset.panoramaUnderground3Src,
      pitch: 0,
      yaw: 0,
      hfov: 100,
      hotSpots: [
        {
          id: "return-middle-underground-from-underground-3",
          pitch: -20,
          yaw: -5,
          type: "scene",
          text: "Return to middle underground view",
          sceneId: "middleUnderground",
          targetPitch: 0,
          targetYaw: -20,
          targetHfov: 100,
          cssClass: "tour-ground-hotspot",
        },
      ],
    },
    insideChurch1: {
      type: "equirectangular",
      panorama: app.dataset.panoramaInsideChurch1Src,
      pitch: 0,
      yaw: 160,
      hfov: 100,
      hotSpots: [
        {
          id: "return-inside-church",
          pitch: -24,
          yaw: -20,
          type: "scene",
          text: "Return to inside church view",
          sceneId: "insideChurch",
          targetPitch: -20,
          targetYaw: 160,
          targetHfov: 100,
          cssClass: "tour-ground-hotspot",
        },
      ],
    },
    rightFrontChurch: {
      type: "equirectangular",
      panorama: app.dataset.panoramaRightFrontChurchSrc,
      pitch: 0,
      yaw: 0,
      hfov: 100,
      hotSpots: [
        {
          id: "return-front-church-from-right",
          pitch: -17,
          yaw: -133,
          type: "scene",
          text: "Return to front church view",
          sceneId: "frontChurch",
          targetPitch: -20,
          targetYaw: -140,
          targetHfov: 100,
          cssClass: "tour-ground-hotspot",
        },
        {
          id: "go-right-front-tombs",
          pitch: -22,
          yaw: 27,
          type: "scene",
          text: "Move to right front tombs view",
          sceneId: "rightFrontTombs",
          targetPitch: -12,
          targetYaw: -120,
          targetHfov: 100,
          cssClass: "tour-ground-hotspot",
        },
        {
          id: "go-inside-church-from-right",
          pitch: 0,
          yaw: -64,
          type: "scene",
          text: "Move inside the church",
          sceneId: "insideChurch",
          cssClass: "tour-ground-hotspot tour-ground-hotspot--enter",
        },
      ],
    },
    rightFrontTombs: {
      type: "equirectangular",
      panorama: app.dataset.panoramaRightFrontTombsSrc,
      pitch: 0,
      yaw: 0,
      hfov: 100,
      hotSpots: [
        {
          id: "go-right-front-tombs-1",
          pitch: -9,
          yaw: -67,
          type: "scene",
          text: "Move to deeper right front tombs view",
          sceneId: "rightFrontTombs1",
          cssClass: "tour-ground-hotspot",
        },
        {
          id: "return-right-front-church-from-tombs",
          pitch: -14,
          yaw: 30,
          type: "scene",
          text: "Return to right church view",
          sceneId: "rightFrontChurch",
          targetPitch: -12,
          targetYaw: 180,
          targetHfov: 100,
          cssClass: "tour-ground-hotspot",
        },
      ],
    },
    rightFrontTombs1: {
      type: "equirectangular",
      panorama: app.dataset.panoramaRightFrontTombs1Src,
      pitch: 0,
      yaw: -110,
      hfov: 100,
      hotSpots: [
        {
          id: "return-right-front-tombs-from-right-front-tombs-1",
          pitch: -10,
          yaw: 80,
          type: "scene",
          text: "Return to right front tombs view",
          sceneId: "rightFrontTombs",
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

  if (!rawScenes.frontGate.panorama || !rawScenes.insideFrontGate.panorama || !rawScenes.insideFrontGate1.panorama || !rawScenes.middleGInside.panorama || !rawScenes.frontChurch.panorama || !rawScenes.leftFrontChurch.panorama || !rawScenes.insideChurch.panorama || !rawScenes.insideChurch1.panorama || !rawScenes.stairsChurch.panorama || !rawScenes.underground1.panorama || !rawScenes.middleUnderground.panorama || !rawScenes.frontAltarUnderground.panorama || !rawScenes.underground2.panorama || !rawScenes.underground3.panorama || !rawScenes.rightFrontChurch.panorama || !rawScenes.rightFrontTombs.panorama || !rawScenes.rightFrontTombs1.panorama || !rawScenes.rightFrontGate.panorama || !rawScenes.leftFrontGate.panorama || !rawScenes.leftFlag.panorama || !rawScenes.middleGMuseum.panorama || !rawScenes.frontMuseum.panorama || !rawScenes.insideMuseum.panorama || !rawScenes.museum1.panorama || !rawScenes.museum2.panorama || !rawScenes.museum3.panorama) {
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
