(function () {
  const app = document.getElementById("tourApp");
  const viewerContainer = document.getElementById("tourViewer");
  const loadingOverlay = document.getElementById("tourLoadingOverlay");
  const errorOverlay = document.getElementById("tourErrorOverlay");
  const artifactOverlay = document.getElementById("tourArtifactOverlay");
  const artifactCloseButton = document.getElementById("tourArtifactClose");
  const artifactImage = document.getElementById("tourArtifactImage");
  const artifactModel = document.getElementById("tourArtifactModel");
  const artifactTagalogTitle = document.getElementById("tourArtifactTagalogTitle");
  const artifactTagalogText = document.getElementById("tourArtifactTagalogText");
  const artifactEnglishTitle = document.getElementById("tourArtifactEnglishTitle");
  const artifactEnglishText = document.getElementById("tourArtifactEnglishText");
  const controlDock = document.getElementById("tourControlDock");
  const toggleSceneHotspotsButton = document.getElementById("tourToggleSceneHotspots");
  const toggleArtifactHotspotsButton = document.getElementById("tourToggleArtifactHotspots");
  const captureViewButton = document.getElementById("tourCaptureView");
  const toggleFullscreenButton = document.getElementById("tourToggleFullscreen");
  const backToExhibitsButton = document.getElementById("tourBackToExhibits");
  const debugParams = new URLSearchParams(window.location.search);
  const hotspotDebugEnabled = debugParams.get("debugHotspots") === "1";
  const userAgent = navigator.userAgent || "";
  const isIOSDevice = /iPad|iPhone|iPod/.test(userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  const fullscreenTarget = document.documentElement;
  const canUseFullscreen = !isIOSDevice && typeof fullscreenTarget.requestFullscreen === "function" && typeof document.exitFullscreen === "function";
  const digitalExhibitsUrl = app ? app.dataset.digitalExhibitsUrl : "";
  const balanghayImageSrc = app ? app.dataset.balanghayImageSrc : "";
  const balanghayGlbSrc = app ? app.dataset.balanghayGlbSrc : "";
  const kabaongImageSrc = app ? app.dataset.kabaongImageSrc : "";
  const kabaongGlbSrc = app ? app.dataset.kabaongGlbSrc : "";
  const ulohImageSrc = app ? app.dataset.ulohImageSrc : "";
  const ulohGlbSrc = app ? app.dataset.ulohGlbSrc : "";
  const artifactNavButtons = Array.from(document.querySelectorAll("[data-artifact-view]"));
  const artifactPanes = Array.from(document.querySelectorAll("[data-artifact-pane]"));
  let sceneHotspotsVisible = true;
  let artifactHotspotsVisible = true;
  let tourViewer = null;
  let resolvedScenes = null;
  const balanghayArtifactCopy = {
    tagalogTitle: "Ang Balanghay",
    tagalogText:
      "ANG BALANGHAY ay isang sasakyang-pandagat na ginamit noon pang 320 A.D. na kumakatawan sa kakayahang pandagar at paniniwalang espiritwal ng mga ng mga sinaunang Pilipino. Higit pa sa papel nito sa kalakalan at pakikidigma, sinasagisag nito ang paglalakbay ng kaluluwa sa kabilang buhay, kabilang ang mga kilalang mandirigma at mandaragat na kadalasang inililibing sa loob o kasama ng kanilang mga bangka upang ipagpatuloy ang kanilang paglalakbay sa kabilang daigdig.",
    englishTitle: "The Balanghay",
    englishText:
      "THE BALANGHAY, a seafaring vessel dating back to 320 A.D., exemplified the maritime skill and spiritual beliefs of pre-colonial Filipinos. It symbolized the soul's voyage to the afterlife, with notable warriors and seafarers often buried in or with their boats to continue their journey in the netherworld.",
  };
  const kabaongArtifactCopy = {
    tagalogTitle: "Ang mga Nakabiting Kabaong ng Sagada",
    tagalogText:
      "ANG MGA IGOROT ng Sagada, Mountain Province, ay sumusunod sa isang natatanging paglilibing na mahigit dalawang libong taong tradisyon, kung saan ang mga pumanaw ay inilalagay sa mga kabaong na gawa sa kahoy at isinasabit sa gilid ng mga bangin, kadalasan ay nasa posisyong mala-sanggol na sumasagisag sa pagbabalik sa lupa. Maraming matatanda ang umuukit pa nga ng kanilang sariling mga kabaong bilang paghahanda sa kamatayan.",
    englishTitle: "The Hanging Coffins of Sagada",
    englishText:
      "THE IGOROTS of Sagada, Mountain Province, follow a distinctive burial tradition dating back over two thousand years, where the deceased are placed in wooden coffins and hung on cliff edges, often in a fetal position to symbolize returning to the earth. Many elders even carve their own coffins in preparation for death.",
  };
  const ulohArtifactCopy = {
    tagalogTitle: "Tradisyunal na Ulóh ng mga Ifugao",
    tagalogText:
      "ANG ULÓH ay isang tradisyunal na tela ng Ifugao na gawa sa tatlong magkakaibang bahagi: adolna (gitna), balingbing (mga gilid), at talungtong (mga laylay), hinabi ng magkakahiwalay at pinagsama-sama gamit ang natatanging pamamaraan, karaniwang kulay itim at pula. Ito ay gumaganap ng isang pangunahing papel sa ritwal ng kamatayan, ang bogwa, kung saan ang mga buto ng namatay ay hinuhukay, nililinis, at muling binabalot sa isang bagong Ulóh bilang paggalang at patuloy na pangangalaga, na may mga partikular na uri tulad ng kinuttiyan, inlhadang, pinagpagan, at gamong na ginagamit para sa paglilibing.",
    englishTitle: "Traditional Ulóh of Ifugao",
    englishText:
      "THE ULÓH iS a traditional Ifugao textile made of three distinct parts: adolna(center), balingbing(sides), and talungtong(edges), woven separately and stitched together using a unique technique, typically in black and red. It plays a central role in the bogwa death ritual, where the deceased's bones are exhumed, cleansed, and rewrapped in a new Ulóh as a gesture of reverence and ongoing care, with specific types like kinuttiyan, inlha’dang, pinagpagan, and gamong used for funerary purposes.",
  };

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
          id: "go-left-corner-inside-front-gate-from-inside-front-gate",
          pitch: -9.82,
          yaw: -87.41,
          type: "scene",
          text: "Move to left corner inside front gate view",
          sceneId: "leftCornerInsideFrontGate",
          targetPitch: -3.69,
          targetYaw: -89.47,
          targetHfov: 100,
          cssClass: "tour-ground-hotspot",
        },
        {
          id: "go-right-corner-inside-front-gate-from-inside-front-gate",
          pitch: -8.2,
          yaw: 93.64,
          type: "scene",
          text: "Move to right corner inside front gate view",
          sceneId: "rightCornerInsideFrontGate",
          targetPitch: -1.98,
          targetYaw: 78.32,
          targetHfov: 100,
          cssClass: "tour-ground-hotspot",
        },
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
    leftCornerInsideFrontGate: {
      type: "equirectangular",
      panorama: app.dataset.panoramaLeftCornerInsideFrontGateSrc,
      pitch: 0,
      yaw: 0,
      hfov: 100,
      hotSpots: [
        {
          id: "go-left-middle-inside-front-gate-from-left-corner-inside-front-gate",
          pitch: -16.04,
          yaw: -89.09,
          type: "scene",
          text: "Move to left middle inside front gate view",
          sceneId: "leftMiddleInsideFrontGate",
          targetPitch: -6.26,
          targetYaw: -101.9,
          targetHfov: 100,
          cssClass: "tour-ground-hotspot",
        },
        {
          id: "go-inside-front-gate-from-left-corner-inside-front-gate",
          pitch: -6.46,
          yaw: 51.43,
          type: "scene",
          text: "Move to inside front gate view",
          sceneId: "insideFrontGate",
          targetPitch: -1.73,
          targetYaw: 93.15,
          targetHfov: 100,
          cssClass: "tour-ground-hotspot",
        },
      ],
    },
    leftMiddleInsideFrontGate: {
      type: "equirectangular",
      panorama: app.dataset.panoramaLeftMiddleInsideFrontGateSrc,
      pitch: 0,
      yaw: 0,
      hfov: 100,
      hotSpots: [
        {
          id: "go-left-middle-g-from-left-middle-inside-front-gate",
          pitch: -13.77,
          yaw: -102.25,
          type: "scene",
          text: "Move to left middle gate view",
          sceneId: "leftMiddleG",
          targetPitch: -5.23,
          targetYaw: -102.56,
          targetHfov: 100,
          cssClass: "tour-ground-hotspot",
        },
        {
          id: "return-left-corner-inside-front-gate-from-left-middle-inside-front-gate",
          pitch: -10.23 ,
          yaw: 76.89,
          type: "scene",
          text: "Return to left corner inside front gate view",
          sceneId: "leftCornerInsideFrontGate",
          targetPitch: -2.76,
          targetYaw: 77.72,
          targetHfov: 100,
          cssClass: "tour-ground-hotspot",
        },
      ],
    },
    leftMiddleG: {
      type: "equirectangular",
      panorama: app.dataset.panoramaLeftMiddleGSrc,
      pitch: 0,
      yaw: 0,
      hfov: 100,
      hotSpots: [
        {
          id: "go-left-middle-middle-g-from-left-middle-g",
          pitch: -16.03,
          yaw: -93.48,
          type: "scene",
          text: "Move to left middle middle gate view",
          sceneId: "leftMiddleMiddleG",
          targetPitch: -2.64,
          targetYaw: -95.37,
          targetHfov: 100,
          cssClass: "tour-ground-hotspot",
        },
        {
          id: "return-left-middle-inside-front-gate-from-left-middle-g",
          pitch: -13.32,
          yaw: 83.61,
          type: "scene",
          text: "Return to left middle inside front gate view",
          sceneId: "leftMiddleInsideFrontGate",
          targetPitch: -0.59,
          targetYaw: 77.94,
          targetHfov: 100,
          cssClass: "tour-ground-hotspot",
        },
      ],
    },
    leftMiddleMiddleG: {
      type: "equirectangular",
      panorama: app.dataset.panoramaLeftMiddleMiddleGSrc,
      pitch: 0,
      yaw: 0,
      hfov: 100,
      hotSpots: [
        {
          id: "go-left-g-from-left-middle-middle-g",
          pitch: -13.22,
          yaw: -94.79,
          type: "scene",
          text: "Move to left gate view",
          sceneId: "leftG",
          targetPitch: -4.6,
          targetYaw: -99.01,
          targetHfov: 100,
          cssClass: "tour-ground-hotspot",
        },
        {
          id: "return-left-middle-g-from-left-middle-middle-g",
          pitch: -13.01,
          yaw: 56.07,
          type: "scene",
          text: "Return to left middle gate view",
          sceneId: "leftMiddleG",
          targetPitch: -3.01,
          targetYaw: 82.37,
          targetHfov: 100,
          cssClass: "tour-ground-hotspot",
        },
      ],
    },
    leftG: {
      type: "equirectangular",
      panorama: app.dataset.panoramaLeftGSrc,
      pitch: 0,
      yaw: 0,
      hfov: 100,
      hotSpots: [
        {
          id: "go-left-end-tombs-from-left-g",
          pitch: -10.95,
          yaw: -95.49,
          type: "scene",
          text: "Move to left end tombs view",
          sceneId: "leftEndTombs",
          targetPitch: -2.91,
          targetYaw: -99.35,
          targetHfov: 100,
          cssClass: "tour-ground-hotspot",
        },
        {
          id: "return-left-middle-middle-g-from-left-g",
          pitch: -8.27 ,
          yaw: 81.02,
          type: "scene",
          text: "Return to left middle middle gate view",
          sceneId: "leftMiddleMiddleG",
          targetPitch: -2.8,
          targetYaw: 61.31,
          targetHfov: 100,
          cssClass: "tour-ground-hotspot",
        },
      ],
    },
    leftEndTombs: {
      type: "equirectangular",
      panorama: app.dataset.panoramaLeftEndTombsSrc,
      pitch: 0,
      yaw: 0,
      hfov: 100,
      hotSpots: [
        {
          id: "go-left-middle-tombs-from-left-end-tombs",
          pitch: -11.06,
          yaw: -99.54,
          type: "scene",
          text: "Move to left middle tombs view",
          sceneId: "leftMiddleTombs",
          targetPitch: -7.35,
          targetYaw: -106.9,
          targetHfov: 100,
          cssClass: "tour-ground-hotspot",
        },
        {
          id: "return-left-g-from-left-end-tombs",
          pitch: -5.96 ,
          yaw: 37.33,
          type: "scene",
          text: "Return to left gate view",
          sceneId: "leftG",
          targetPitch: -1.72,
          targetYaw: 81.4,
          targetHfov: 100,
          cssClass: "tour-ground-hotspot",
        },
      ],
    },
    leftMiddleTombs: {
      type: "equirectangular",
      panorama: app.dataset.panoramaLeftMiddleTombsSrc,
      pitch: 0,
      yaw: 0,
      hfov: 100,
      hotSpots: [
        {
          id: "go-left-tombs-from-left-middle-tombs",
          pitch: -11.02,
          yaw: -105.65,
          type: "scene",
          text: "Move to left tombs view",
          sceneId: "leftTombs",
          targetPitch: -4.95,
          targetYaw: -89.26,
          targetHfov: 100,
          cssClass: "tour-ground-hotspot",
        },
        {
          id: "return-left-end-tombs-from-left-middle-tombs",
          pitch: -8.41,
          yaw: 74.15,
          type: "scene",
          text: "Return to left end tombs view",
          sceneId: "leftEndTombs",
          targetPitch: 0.74,
          targetYaw: 37.45,
          targetHfov: 100,
          cssClass: "tour-ground-hotspot",
        },
      ],
    },
    leftTombs: {
      type: "equirectangular",
      panorama: app.dataset.panoramaLeftTombsSrc,
      pitch: 0,
      yaw: 0,
      hfov: 100,
      hotSpots: [
        {
          id: "go-left-first-tombs-from-left-tombs",
          pitch: -20.76,
          yaw: -89.75,
          type: "scene",
          text: "Move to left first tombs view",
          sceneId: "leftFirstTombs",
          cssClass: "tour-ground-hotspot",
        },
        {
          id: "return-left-middle-tombs-from-left-tombs",
          pitch: -7.73,
          yaw: 48.09,
          type: "scene",
          text: "Return to left middle tombs view",
          sceneId: "leftMiddleTombs",
          targetPitch: -1.02,
          targetYaw: 74.28,
          targetHfov: 100,
          cssClass: "tour-ground-hotspot",
        },
      ],
    },
    leftFirstTombs: {
      type: "equirectangular",
      panorama: app.dataset.panoramaLeftFirstTombsSrc,
      pitch: 0,
      yaw: 0,
      hfov: 100,
      hotSpots: [
        {
          id: "return-left-tombs-from-left-first-tombs",
          pitch: -14.72,
          yaw: 82.97,
          type: "scene",
          text: "Return to left tombs view",
          sceneId: "leftTombs",
          targetPitch: 0.56,
          targetYaw: 46.68,
          targetHfov: 100,
          cssClass: "tour-ground-hotspot",
        },
        {
          id: "return-left-front-church-from-left-first-tombs",
          pitch: -25.55,
          yaw: -25.99,
          type: "scene",
          text: "Return to left front church view",
          sceneId: "leftFrontChurch",
          targetPitch: -1.46,
          targetYaw: 70.52,
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
          id: "go-left-first-tombs-from-left-front-church",
          pitch: -21.26,
          yaw: -80.65,
          type: "scene",
          text: "Move to left first tombs view",
          sceneId: "leftFirstTombs",
          targetPitch: -1.82,
          targetYaw: 82.26,
          targetHfov: 100,
          cssClass: "tour-ground-hotspot",
        },
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
          targetPitch: -6.57,
          targetYaw: -83.58,
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
          targetPitch: -6.57,
          targetYaw: -83.58,
          targetHfov: 100,
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
          id: "go-right-front-tombs-2",
          pitch: -11.27,
          yaw: -99.92,
          type: "scene",
          text: "Move to deepest right front tombs view",
          sceneId: "rightFrontTombs2",
          targetPitch: -1.11,
          targetYaw: -53.2,
          targetHfov: 100,
          cssClass: "tour-ground-hotspot",
        },
        {
          id: "return-right-front-tombs-from-right-front-tombs-1",
          pitch: -5,
          yaw: 77,
          type: "scene",
          text: "Return to right front tombs view",
          sceneId: "rightFrontTombs",
          targetPitch: 0.59,
          targetYaw: 34.92,
          targetHfov: 100,
          cssClass: "tour-ground-hotspot",
        },
      ],
    },
    rightFrontTombs2: {
      type: "equirectangular",
      panorama: app.dataset.panoramaRightFrontTombs2Src,
      pitch: 0,
      yaw: 0,
      hfov: 100,
      hotSpots: [
        {
          id: "go-right-middle-g",
          pitch: -6.34,
          yaw: -52.9,
          type: "scene",
          text: "Move to right middle gate view",
          sceneId: "rightMiddleG",
          targetPitch: -6.66,
          targetYaw: -99.92,
          targetHfov: 100,
          cssClass: "tour-ground-hotspot",
        },
        {
          id: "return-right-front-tombs-1-from-right-front-tombs-2",
          pitch: -7.06,
          yaw: 86.13,
          type: "scene",
          text: "Return to deeper right front tombs view",
          sceneId: "rightFrontTombs1",
          targetPitch: 3.34,
          targetYaw: 80.68,
          targetHfov: 100,
          cssClass: "tour-ground-hotspot",
        },
      ],
    },
    rightMiddleG: {
      type: "equirectangular",
      panorama: app.dataset.panoramaRightMiddleGSrc,
      pitch: 0,
      yaw: 0,
      hfov: 100,
      hotSpots: [
        {
          id: "go-right-corner-middle-g",
          pitch: -9.2,
          yaw: -98.01,
          type: "scene",
          text: "Move to right corner middle gate view",
          sceneId: "rightCornerMiddleG",
          targetPitch: -2.89,
          targetYaw: -93.68,
          targetHfov: 100,
          cssClass: "tour-ground-hotspot",
        },
        {
          id: "return-right-front-tombs-2-from-right-middle-g",
          pitch: -7.89,
          yaw: 74.9,
          type: "scene",
          text: "Return to deepest right front tombs view",
          sceneId: "rightFrontTombs2",
          targetPitch: 0.5,
          targetYaw: 88.81,
          targetHfov: 100,
          cssClass: "tour-ground-hotspot",
        },
      ],
    },
    rightCornerMiddleG: {
      type: "equirectangular",
      panorama: app.dataset.panoramaRightCornerMiddleGSrc,
      pitch: 0,
      yaw: 0,
      hfov: 100,
      hotSpots: [
        {
          id: "go-right-middle-corner-middle-g",
          pitch: -14.61,
          yaw: -93.01,
          type: "scene",
          text: "Move to right middle corner middle gate view",
          sceneId: "rightMiddleCornerMiddleG",
          targetPitch: -4.48,
          targetYaw: -104.05,
          targetHfov: 100,
          cssClass: "tour-ground-hotspot",
        },
        {
          id: "return-right-middle-g-from-right-corner-middle-g",
          pitch: -7.09,
          yaw: 43.01,
          type: "scene",
          text: "Return to right middle gate view",
          sceneId: "rightMiddleG",
          targetPitch: 1.09,
          targetYaw: 77.68,
          targetHfov: 100,
          cssClass: "tour-ground-hotspot",
        },
      ],
    },
    rightMiddleCornerMiddleG: {
      type: "equirectangular",
      panorama: app.dataset.panoramaRightMiddleCornerMiddleGSrc,
      pitch: 0,
      yaw: 0,
      hfov: 100,
      hotSpots: [
        {
          id: "go-right-corner-inside-front-gate",
          pitch: -8.24,
          yaw: -102.44,
          type: "scene",
          text: "Move to right corner inside front gate view",
          sceneId: "rightCornerInsideFrontGate",
          targetPitch: -2.81,
          targetYaw: -59.21,
          targetHfov: 100,
          cssClass: "tour-ground-hotspot",
        },
        {
          id: "return-right-corner-middle-g-from-right-middle-corner-middle-g",
          pitch: -13.59,
          yaw: 76.99,
          type: "scene",
          text: "Return to right corner middle gate view",
          sceneId: "rightCornerMiddleG",
          targetPitch: 0.23,
          targetYaw: 42.85,
          targetHfov: 100,
          cssClass: "tour-ground-hotspot",
        },
      ],
    },
    rightCornerInsideFrontGate: {
      type: "equirectangular",
      panorama: app.dataset.panoramaRightCornerInsideFrontGateSrc,
      pitch: 0,
      yaw: 0,
      hfov: 100,
      hotSpots: [
        {
          id: "go-inside-front-gate-from-right-corner-inside-front-gate",
          pitch: -8.28,
          yaw: -58.85,
          type: "scene",
          text: "Move to inside front gate view",
          sceneId: "insideFrontGate",
          targetPitch: -4.83,
          targetYaw: -88.96,
          targetHfov: 100,
          cssClass: "tour-ground-hotspot",
        },
        {
          id: "return-right-middle-corner-middle-g-from-right-corner-inside-front-gate",
          pitch: -7.52,
          yaw: 78.46,
          type: "scene",
          text: "Return to right middle corner middle gate view",
          sceneId: "rightMiddleCornerMiddleG",
          targetPitch: -1.42,
          targetYaw: 78.78,
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
          id: "museum1-pulse-marker",
          pitch: -20.31,
          yaw: 101.6,
          type: "info",
          text: "",
          clickHandlerFunc: openArtifactOverlay,
          clickHandlerArgs: {
            imageSrc: balanghayImageSrc,
            imageAlt: "Balanghay",
            glbSrc: balanghayGlbSrc,
            tagalogTitle: balanghayArtifactCopy.tagalogTitle,
            tagalogText: balanghayArtifactCopy.tagalogText,
            englishTitle: balanghayArtifactCopy.englishTitle,
            englishText: balanghayArtifactCopy.englishText,
            view: "image",
          },
          cssClass: "tour-ground-hotspot tour-ground-hotspot--pulse tour-ground-hotspot--compact tour-ground-hotspot--no-icon",
        },
        {
          id: "museum1-kabaong-marker",
          pitch: -18.35,
          yaw: 26.68,
          type: "info",
          text: "",
          clickHandlerFunc: openArtifactOverlay,
          clickHandlerArgs: {
            imageSrc: kabaongImageSrc,
            imageAlt: "Kabaong",
            glbSrc: kabaongGlbSrc,
            tagalogTitle: kabaongArtifactCopy.tagalogTitle,
            tagalogText: kabaongArtifactCopy.tagalogText,
            englishTitle: kabaongArtifactCopy.englishTitle,
            englishText: kabaongArtifactCopy.englishText,
            view: "image",
          },
          cssClass: "tour-ground-hotspot tour-ground-hotspot--pulse tour-ground-hotspot--compact tour-ground-hotspot--no-icon",
        },
        {
          id: "museum1-uloh-marker",
          pitch: -17.35,
          yaw: -128.78,
          type: "info",
          text: "",
          clickHandlerFunc: openArtifactOverlay,
          clickHandlerArgs: {
            imageSrc: ulohImageSrc,
            imageAlt: "Ulóh",
            glbSrc: ulohGlbSrc,
            tagalogTitle: ulohArtifactCopy.tagalogTitle,
            tagalogText: ulohArtifactCopy.tagalogText,
            englishTitle: ulohArtifactCopy.englishTitle,
            englishText: ulohArtifactCopy.englishText,
            view: "image",
          },
          cssClass: "tour-ground-hotspot tour-ground-hotspot--pulse tour-ground-hotspot--compact tour-ground-hotspot--no-icon",
        },
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

  function updateHotspotVisibilityState() {
    if (!app) {
      return;
    }

    app.classList.toggle("tour-hide-scene-hotspots", !sceneHotspotsVisible);
    app.classList.toggle("tour-hide-artifact-hotspots", !artifactHotspotsVisible);

    if (toggleSceneHotspotsButton) {
      toggleSceneHotspotsButton.classList.toggle("is-active", sceneHotspotsVisible);
      toggleSceneHotspotsButton.setAttribute("aria-pressed", sceneHotspotsVisible ? "true" : "false");
    }

    if (toggleArtifactHotspotsButton) {
      toggleArtifactHotspotsButton.classList.toggle("is-active", artifactHotspotsVisible);
      toggleArtifactHotspotsButton.setAttribute("aria-pressed", artifactHotspotsVisible ? "true" : "false");
    }
  }

  function syncFullscreenButton() {
    if (!toggleFullscreenButton) {
      return;
    }

    if (!canUseFullscreen) {
      toggleFullscreenButton.hidden = true;
      toggleFullscreenButton.disabled = true;
      toggleFullscreenButton.setAttribute("aria-hidden", "true");
      toggleFullscreenButton.setAttribute("aria-disabled", "true");
      return;
    }

    const isFullscreen = Boolean(document.fullscreenElement);
    toggleFullscreenButton.classList.toggle("is-active", isFullscreen);
    toggleFullscreenButton.setAttribute("aria-pressed", isFullscreen ? "true" : "false");
  }

  function setControlDockVisibility(isVisible) {
    if (!controlDock) {
      return;
    }

    controlDock.hidden = !isVisible;
    controlDock.classList.toggle("is-visible", isVisible);
  }

  function degreesToRadians(value) {
    return (Number(value) * Math.PI) / 180;
  }

  function downloadImageDataUrl(dataUrl) {
    if (isIOSDevice) {
      window.location.href = dataUrl;
      return;
    }

    const link = document.createElement("a");
    const timestamp = new Date().toISOString().replace(/[.:]/g, "-");
    link.href = dataUrl;
    link.download = `virtual-tour-${timestamp}.png`;
    document.body.appendChild(link);
    link.click();
    link.remove();
  }

  function wrapHorizontalIndex(value, size) {
    const remainder = value % size;
    return remainder < 0 ? remainder + size : remainder;
  }

  function getExportDimensions() {
    const viewerRect = viewerContainer ? viewerContainer.getBoundingClientRect() : null;
    const baseWidth = Math.max(1, Math.round(viewerRect && viewerRect.width ? viewerRect.width : window.innerWidth || 1280));
    const baseHeight = Math.max(1, Math.round(viewerRect && viewerRect.height ? viewerRect.height : window.innerHeight || 720));
    const deviceScale = Math.max(1, Math.min(window.devicePixelRatio || 1, 2));
    let width = Math.max(1, Math.round(baseWidth * deviceScale));
    let height = Math.max(1, Math.round(baseHeight * deviceScale));
    const maxEdge = 1600;
    const longestEdge = Math.max(width, height);

    if (longestEdge > maxEdge) {
      const scale = maxEdge / longestEdge;
      width = Math.max(1, Math.round(width * scale));
      height = Math.max(1, Math.round(height * scale));
    }

    return { width, height };
  }

  async function renderExportImageFromCurrentView() {
    if (!tourViewer || typeof tourViewer.getScene !== "function" || !resolvedScenes) {
      throw new Error("Virtual tour viewer is not ready for export.");
    }

    const sceneId = tourViewer.getScene();
    const scene = sceneId && resolvedScenes[sceneId] ? resolvedScenes[sceneId] : null;
    const currentConfig = typeof tourViewer.getConfig === "function" ? tourViewer.getConfig() || {} : {};

    if (!scene || !scene.panorama) {
      throw new Error("Current panorama source is unavailable for export.");
    }

    const panoramaImage = await loadImage(scene.panorama);
    const sourceWidth = panoramaImage.naturalWidth || panoramaImage.width;
    const sourceHeight = panoramaImage.naturalHeight || panoramaImage.height;
    const sourceCanvas = document.createElement("canvas");
    sourceCanvas.width = sourceWidth;
    sourceCanvas.height = sourceHeight;

    const sourceContext = sourceCanvas.getContext("2d", { willReadFrequently: true });
    if (!sourceContext) {
      throw new Error("Unable to create source panorama context.");
    }

    sourceContext.drawImage(panoramaImage, 0, 0, sourceWidth, sourceHeight);
    const sourcePixels = sourceContext.getImageData(0, 0, sourceWidth, sourceHeight).data;

    const exportSize = getExportDimensions();
    const exportWidth = exportSize.width;
    const exportHeight = exportSize.height;
    const exportCanvas = document.createElement("canvas");
    exportCanvas.width = exportWidth;
    exportCanvas.height = exportHeight;

    const exportContext = exportCanvas.getContext("2d");
    if (!exportContext) {
      throw new Error("Unable to create export canvas context.");
    }

    const exportImage = exportContext.createImageData(exportWidth, exportHeight);
    const exportPixels = exportImage.data;
    const pitch = degreesToRadians(typeof tourViewer.getPitch === "function" ? tourViewer.getPitch() : 0);
    const yaw = degreesToRadians(typeof tourViewer.getYaw === "function" ? tourViewer.getYaw() : 0);
    const hfov = degreesToRadians(typeof tourViewer.getHfov === "function" ? tourViewer.getHfov() : 100);
    const aspect = exportWidth / exportHeight;
    const vfov = 2 * Math.atan(Math.tan(hfov / 2) / aspect);
    const tanHalfHfov = Math.tan(hfov / 2);
    const tanHalfVfov = Math.tan(vfov / 2);
    const sinPitch = Math.sin(pitch);
    const cosPitch = Math.cos(pitch);
    const sinYaw = Math.sin(yaw);
    const cosYaw = Math.cos(yaw);

    for (let y = 0; y < exportHeight; y += 1) {
      const normalizedY = 1 - (2 * (y + 0.5)) / exportHeight;

      for (let x = 0; x < exportWidth; x += 1) {
        const normalizedX = (2 * (x + 0.5)) / exportWidth - 1;
        let dirX = normalizedX * tanHalfHfov;
        let dirY = normalizedY * tanHalfVfov;
        let dirZ = 1;
        const invLength = 1 / Math.hypot(dirX, dirY, dirZ);
        dirX *= invLength;
        dirY *= invLength;
        dirZ *= invLength;

        const pitchedY = dirY * cosPitch + dirZ * sinPitch;
        const pitchedZ = -dirY * sinPitch + dirZ * cosPitch;
        const worldX = dirX * cosYaw + pitchedZ * sinYaw;
        const worldY = pitchedY;
        const worldZ = -dirX * sinYaw + pitchedZ * cosYaw;

        const longitude = Math.atan2(worldX, worldZ);
        const latitude = Math.asin(Math.max(-1, Math.min(1, worldY)));
        const panoramaX = wrapHorizontalIndex((longitude / (2 * Math.PI) + 0.5) * sourceWidth, sourceWidth);
        const panoramaY = Math.min(sourceHeight - 1, Math.max(0, (0.5 - latitude / Math.PI) * sourceHeight));

        const x0 = Math.floor(panoramaX);
        const y0 = Math.floor(panoramaY);
        const x1 = wrapHorizontalIndex(x0 + 1, sourceWidth);
        const y1 = Math.min(sourceHeight - 1, y0 + 1);
        const weightX = panoramaX - x0;
        const weightY = panoramaY - y0;
        const index00 = (y0 * sourceWidth + x0) * 4;
        const index10 = (y0 * sourceWidth + x1) * 4;
        const index01 = (y1 * sourceWidth + x0) * 4;
        const index11 = (y1 * sourceWidth + x1) * 4;
        const outputIndex = (y * exportWidth + x) * 4;

        for (let channel = 0; channel < 4; channel += 1) {
          const top = sourcePixels[index00 + channel] * (1 - weightX) + sourcePixels[index10 + channel] * weightX;
          const bottom = sourcePixels[index01 + channel] * (1 - weightX) + sourcePixels[index11 + channel] * weightX;
          exportPixels[outputIndex + channel] = top * (1 - weightY) + bottom * weightY;
        }
      }
    }

    exportContext.putImageData(exportImage, 0, 0);
    return exportCanvas.toDataURL("image/png");
  }

  function writeCapturePreview(previewWindow, dataUrl) {
    if (!previewWindow || previewWindow.closed) {
      return false;
    }

    previewWindow.document.open();
    previewWindow.document.write(`<title>Virtual Tour Capture</title><body style="margin:0;background:#000;display:flex;align-items:center;justify-content:center;min-height:100vh;"><img src="${dataUrl}" alt="Virtual tour capture" style="display:block;max-width:100%;height:auto;" /></body>`);
    previewWindow.document.close();
    return true;
  }

  async function captureCurrentView(previewWindow) {
    try {
      const imageDataUrl = await renderExportImageFromCurrentView();

      if (isIOSDevice && writeCapturePreview(previewWindow, imageDataUrl)) {
        return;
      }

      downloadImageDataUrl(imageDataUrl);
    } catch (error) {
      if (previewWindow && !previewWindow.closed) {
        previewWindow.close();
      }

      console.error("Unable to export virtual tour view.", error);
      window.alert("Unable to capture the current 360 view yet. Please wait for the scene to finish loading, then try again.");
    }
  }

  async function toggleFullscreenMode() {
    if (!canUseFullscreen) {
      return;
    }

    if (!document.fullscreenElement) {
      try {
        await fullscreenTarget.requestFullscreen();
      } catch (error) {
        console.error("Unable to enter fullscreen mode.", error);
      }
      return;
    }

    try {
      await document.exitFullscreen();
    } catch (error) {
      console.error("Unable to exit fullscreen mode.", error);
    }
  }

  function setArtifactView(nextView) {
    artifactNavButtons.forEach(function (button) {
      const isActive = button.dataset.artifactView === nextView;
      button.classList.toggle("is-active", isActive);
      button.setAttribute("aria-pressed", isActive ? "true" : "false");
    });

    artifactPanes.forEach(function (pane) {
      const isActive = pane.dataset.artifactPane === nextView;
      pane.hidden = !isActive;
      pane.classList.toggle("is-active", isActive);
    });
  }

  function openArtifactOverlay(event, args) {
    if (event && typeof event.preventDefault === "function") {
      event.preventDefault();
    }

    if (artifactImage && args && args.imageSrc) {
      artifactImage.src = args.imageSrc;
      artifactImage.alt = args.imageAlt || "Artifact image";
    }

    if (artifactModel && args && args.glbSrc) {
      artifactModel.src = args.glbSrc;
    }

    if (artifactTagalogTitle && args && args.tagalogTitle) {
      artifactTagalogTitle.textContent = args.tagalogTitle;
    }

    if (artifactTagalogText && args && args.tagalogText) {
      artifactTagalogText.textContent = args.tagalogText;
    }

    if (artifactEnglishTitle && args && args.englishTitle) {
      artifactEnglishTitle.textContent = args.englishTitle;
    }

    if (artifactEnglishText && args && args.englishText) {
      artifactEnglishText.textContent = args.englishText;
    }

    setArtifactView(args && args.view ? args.view : "image");

    if (artifactOverlay) {
      artifactOverlay.hidden = false;
    }
  }

  function closeArtifactOverlay() {
    if (artifactOverlay) {
      artifactOverlay.hidden = true;
    }

    if (artifactImage) {
      artifactImage.removeAttribute("src");
    }

    if (artifactModel) {
      artifactModel.removeAttribute("src");
    }

    setArtifactView("image");
  }

  artifactNavButtons.forEach(function (button) {
    button.addEventListener("click", function () {
      setArtifactView(button.dataset.artifactView || "image");
    });
  });

  if (artifactCloseButton) {
    artifactCloseButton.addEventListener("click", closeArtifactOverlay);
  }

  if (artifactOverlay) {
    artifactOverlay.addEventListener("click", function (event) {
      if (event.target === artifactOverlay) {
        closeArtifactOverlay();
      }
    });
  }

  document.addEventListener("keydown", function (event) {
    if (event.key === "Escape" && artifactOverlay && !artifactOverlay.hidden) {
      closeArtifactOverlay();
    }
  });

  if (toggleSceneHotspotsButton) {
    toggleSceneHotspotsButton.addEventListener("click", function () {
      sceneHotspotsVisible = !sceneHotspotsVisible;
      updateHotspotVisibilityState();
    });
  }

  if (toggleArtifactHotspotsButton) {
    toggleArtifactHotspotsButton.addEventListener("click", function () {
      artifactHotspotsVisible = !artifactHotspotsVisible;
      updateHotspotVisibilityState();
    });
  }

  if (captureViewButton) {
    captureViewButton.addEventListener("click", function () {
      let previewWindow = null;

      if (isIOSDevice) {
        previewWindow = window.open("", "_blank");

        if (previewWindow) {
          previewWindow.document.open();
          previewWindow.document.write('<title>Preparing Capture</title><body style="margin:0;background:#000;color:#fff;font-family:Arial,sans-serif;display:flex;align-items:center;justify-content:center;min-height:100vh;">Preparing capture...</body>');
          previewWindow.document.close();
        }
      }

      captureCurrentView(previewWindow);
    });
  }

  if (toggleFullscreenButton) {
    toggleFullscreenButton.addEventListener("click", function () {
      toggleFullscreenMode();
    });
  }

  if (backToExhibitsButton) {
    backToExhibitsButton.addEventListener("click", function () {
      if (digitalExhibitsUrl) {
        window.location.href = digitalExhibitsUrl;
      }
    });
  }

  document.addEventListener("fullscreenchange", syncFullscreenButton);
  setControlDockVisibility(false);
  updateHotspotVisibilityState();
  syncFullscreenButton();

  function createViewerWithCaptureSupport(scenes) {
    const originalGetContext = HTMLCanvasElement.prototype.getContext;
    let webglContextPatched = false;

    HTMLCanvasElement.prototype.getContext = function (type, attributes) {
      if (!webglContextPatched && (type === "webgl" || type === "experimental-webgl" || type === "webgl2")) {
        webglContextPatched = true;
        const nextAttributes = { ...(attributes || {}), preserveDrawingBuffer: true };
        return originalGetContext.call(this, type, nextAttributes);
      }

      return originalGetContext.call(this, type, attributes);
    };

    try {
      return window.pannellum.viewer("tourViewer", {
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
    } finally {
      HTMLCanvasElement.prototype.getContext = originalGetContext;
    }
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

  if (!rawScenes.frontGate.panorama || !rawScenes.insideFrontGate.panorama || !rawScenes.leftCornerInsideFrontGate.panorama || !rawScenes.leftMiddleInsideFrontGate.panorama || !rawScenes.leftMiddleG.panorama || !rawScenes.leftMiddleMiddleG.panorama || !rawScenes.leftG.panorama || !rawScenes.leftEndTombs.panorama || !rawScenes.leftMiddleTombs.panorama || !rawScenes.leftTombs.panorama || !rawScenes.leftFirstTombs.panorama || !rawScenes.insideFrontGate1.panorama || !rawScenes.middleGInside.panorama || !rawScenes.frontChurch.panorama || !rawScenes.leftFrontChurch.panorama || !rawScenes.insideChurch.panorama || !rawScenes.insideChurch1.panorama || !rawScenes.stairsChurch.panorama || !rawScenes.underground1.panorama || !rawScenes.middleUnderground.panorama || !rawScenes.frontAltarUnderground.panorama || !rawScenes.underground2.panorama || !rawScenes.underground3.panorama || !rawScenes.rightFrontChurch.panorama || !rawScenes.rightFrontTombs.panorama || !rawScenes.rightFrontTombs1.panorama || !rawScenes.rightFrontTombs2.panorama || !rawScenes.rightMiddleG.panorama || !rawScenes.rightCornerMiddleG.panorama || !rawScenes.rightMiddleCornerMiddleG.panorama || !rawScenes.rightCornerInsideFrontGate.panorama || !rawScenes.rightFrontGate.panorama || !rawScenes.leftFrontGate.panorama || !rawScenes.leftFlag.panorama || !rawScenes.middleGMuseum.panorama || !rawScenes.frontMuseum.panorama || !rawScenes.insideMuseum.panorama || !rawScenes.museum1.panorama || !rawScenes.museum2.panorama || !rawScenes.museum3.panorama) {
    if (loadingOverlay) {
      loadingOverlay.hidden = true;
    }
    if (errorOverlay) {
      errorOverlay.hidden = false;
    }
    setControlDockVisibility(false);
    return;
  }

  buildScenes()
    .then((scenes) => {
      resolvedScenes = scenes;
      const viewer = createViewerWithCaptureSupport(scenes);
      tourViewer = viewer;

      if (viewer && typeof viewer.on === "function") {
        syncSceneInUrl(initialScene);
        updateHotspotVisibilityState();

        viewer.on("scenechange", function (sceneId) {
          syncSceneInUrl(sceneId);
          window.requestAnimationFrame(updateHotspotVisibilityState);
        });

        viewer.on("load", function () {
          if (loadingOverlay) {
            loadingOverlay.hidden = true;
          }
          if (errorOverlay) {
            errorOverlay.hidden = true;
          }
          setControlDockVisibility(true);
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
    })
    .catch(() => {
      resolvedScenes = null;
      tourViewer = null;
      if (loadingOverlay) {
        loadingOverlay.hidden = true;
      }
      if (errorOverlay) {
        errorOverlay.hidden = false;
      }
      setControlDockVisibility(false);
    });
})();
