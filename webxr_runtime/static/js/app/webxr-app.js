import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

import { CollisionSystem } from './collision-system.js';
import { InteractionRegistry } from './interaction-registry.js';
import { InteractionSystem } from './interaction-system.js';
import { PlayerController } from './player-controller.js';
import { UiController } from './ui-controller.js';
import { applyAssetTransform, isMobileLikeDevice } from './utils.js';

const DEFAULT_BG = 0x0f1114;
const CROSSHAIR_NDC = new THREE.Vector2(0, 0);
const HOTSPOT_FALLBACK_DISTANCE = 5.0;
const DOOR_INTERACTION_MAX_DISTANCE = 2.35;
const HOTSPOT_INTERACTION_MAX_DISTANCE = 1.85;
const HOTSPOT_HELPER_COLOR = 0xffd54a;
const HOTSPOT_HELPER_RADIUS = 0.07;
const UNDERGROUND_ZIP_NAME = 'underground.zip';
const MUSEUM_ZIP_NAME = 'museum.zip';
// Museum has no hand-tuned hotspots yet; keep it empty so church markers don't leak in.
const MUSEUM_HOTSPOT_MARKERS = [];
// Museum is a splat-only capture (no .glb collision meshes), so its floor height
// and roam area come from these bounds rather than mesh geometry. Values are
// derived from the scene.json splat extents (X ~ -9.8..0, Z ~ 0). Tune to taste;
// ?spawn=x,y,z overrides the start position live for quick calibration.
const MUSEUM_SPAWN_POINT = [-4.7, 0.0, 0.1];
const MUSEUM_FALLBACK_BOUNDS = { min: [-13, 0, -5], max: [4, 5, 5] };
const MUSEUM_MAX_POSITIVE_CLAMP = { x: 4, z: 5 };
const WEBXR_PREFETCH_STORAGE_KEY = 'webxrSceneMetadataPrefetchV1';
const WEBXR_PREFETCH_MAX_AGE_MS = 8 * 60 * 1000;
const CHURCH_RETURN_SPAWN = [-3.7, -0.32, 2.5];
const UNDERGROUND_SPAWN_POINT = [3.15, -0.47, 0.0];
const CHURCH_MAX_POSITIVE_CLAMP = { x: 2.5, z: 2.5 };
const UNDERGROUND_MAX_POSITIVE_CLAMP = { x: 3.5, z: 2.5 };
const UNDERGROUND_FALLBACK_BOUNDS = {
  min: [-3.45, 0, -5.35],
  max: [3.65, 3.4, 2.65],
};
const UNDERGROUND_FLOOR_REGIONS = [
  {
    floorY: -0.1,
    points: [
      [-1.6, -5.1],
      [1.5, -5.1],
      [1.5, 1.1],
      [-1.6, 1.2],
    ],
  },
];
const UNDERGROUND_WALK_BOUNDARY = [
  [3.5, -0.7],
  [1.5, -0.7],
  [1.5, -5.2],
  [-1.6, -5.2],
  [-1.6, -0.4],
  [-3.2, -0.4],
  [-3.2, 1.0],
  [-1.6, 1.0],
  [-1.6, 2.5],
  [1.65, 2.5],
  [1.65, 0.7],
  [3.5, 0.7],
];
const CHURCH_HOTSPOT_MARKERS = [
  {
    id: 'hotspot-1',
    position: [-2.494, 0.343, -2.280],
    color: 0x8fd3ff,
    radius: 0.07,
    interactionMaxDistance: HOTSPOT_INTERACTION_MAX_DISTANCE,
  },
  {
    id: 'hotspot-2',
    position: [-2.504, 0.345, -1.342],
    color: 0x8fd3ff,
    radius: 0.07,
    interactionMaxDistance: HOTSPOT_INTERACTION_MAX_DISTANCE,
  },
  {
    id: 'hotspot-3',
    position: [-2.619, 0.334, 1.068],
    color: 0x8fd3ff,
    radius: 0.07,
    interactionMaxDistance: HOTSPOT_INTERACTION_MAX_DISTANCE,
  },
  {
    id: 'hotspot-4',
    position: [-2.641, 0.339, 2.063],
    color: 0x8fd3ff,
    radius: 0.07,
    interactionMaxDistance: HOTSPOT_INTERACTION_MAX_DISTANCE,
  },
];
const UNDERGROUND_HOTSPOT_MARKERS = [
  {
    id: 'go-back-to-church',
    position: [3.5, 1.136, 0],
    color: 0x8fd3ff,
    radius: 0.07,
    interactionMaxDistance: DOOR_INTERACTION_MAX_DISTANCE,
  },
];
const TABLE_IMAGE_BASE = '/images/360InsideChapel/';
const TABLE_AUDIO_BASE = '/audio/360VT/TableAudio/';
const tableAudio = (tl, en) => ({
  tl: tl ? `${TABLE_AUDIO_BASE}${tl}` : '',
  en: en ? `${TABLE_AUDIO_BASE}${en}` : '',
});
const CHURCH_HOTSPOT_TABLES = {
  // Physical marker assignment:
  // hotspot-1 = Materials I, hotspot-2 = Wood / structural elements,
  // hotspot-3 = Details I, hotspot-4 = Details II.
  'hotspot-3': {
    title: { en: 'Architectural Details I', tl: 'Mga Detalye ng Arkitektura I' },
    imageUrl: `${TABLE_IMAGE_BASE}Art1-RightTable.png`,
    imageAlt: 'Art1 Right Table',
    hotspots: [
      { id: 'art1-right-table-1', x: 27.20, y: 52.56, imageUrl: `${TABLE_IMAGE_BASE}Artifact2/AzulejosTile.png`, title: 'Azulejos Tile', audio: tableAudio('Azulejos-T.mp3', 'Azulejos-E.mp3') },
      { id: 'art1-right-table-2', x: 48.46, y: 29.74, imageUrl: `${TABLE_IMAGE_BASE}Artifact2/RightWindow.png`, title: 'Right Window', audio: tableAudio('Right Window(T).mp3', 'Right Window.mp3') },
      { id: 'art1-right-table-3', x: 47.90, y: 56.52, imageUrl: `${TABLE_IMAGE_BASE}Artifact2/ChapelCeiling.png`, title: 'Chapel Ceiling', audio: tableAudio('Chapel Ceiling(T).mp3', 'Chapel Ceiling.mp3') },
      { id: 'art1-right-table-4', x: 69.59, y: 30.90, imageUrl: `${TABLE_IMAGE_BASE}Artifact2/PigmentAboveNiche.png`, title: 'Pigment Above Niche', audio: tableAudio('Pigment Above Niche(T).mp3', 'Pigment Above Niche.mp3') },
      { id: 'art1-right-table-5', x: 69.45, y: 56.29, imageUrl: `${TABLE_IMAGE_BASE}Artifact2/BasReliefNiche.png`, title: 'Bas-Relief Niche', audio: tableAudio('Bas Relief Niche(T).mp3', 'Bas Relief Niche.mp3') },
    ],
  },
  'hotspot-4': {
    title: { en: 'Architectural Details II', tl: 'Mga Detalye ng Arkitektura II' },
    imageUrl: `${TABLE_IMAGE_BASE}Art2-RightTable.png`,
    imageAlt: 'Art2 Right Table',
    hotspots: [
      { id: 'art2-right-table-1', x: 29.44, y: 18.22, imageUrl: `${TABLE_IMAGE_BASE}Artifact1/InteriorWall.png`, title: 'Interior Wall', audio: tableAudio('Interior Wall, Chapel(T).mp3', 'Interior Wall, Chapel.mp3') },
      { id: 'art2-right-table-2', x: 29.58, y: 38.40, imageUrl: `${TABLE_IMAGE_BASE}Artifact1/Flooring.png`, title: 'Flooring', audio: tableAudio('Flooring, Crypt(T).mp3', 'Flooring, Crypt.mp3') },
      { id: 'art2-right-table-3', x: 29.58, y: 56.56, imageUrl: `${TABLE_IMAGE_BASE}Artifact1/Pilaster.png`, title: 'Pilaster', audio: tableAudio('Pilaster (T).mp3', 'Pilaster.mp3') },
      { id: 'art2-right-table-4', x: 29.02, y: 73.96, imageUrl: `${TABLE_IMAGE_BASE}Artifact1/PerimeterWall.png`, title: 'Perimeter Wall', audio: tableAudio('Perimeter Wall(T).mp3', 'Perimeter Wall.mp3') },
      { id: 'art2-right-table-5', x: 40.49, y: 19.73, imageUrl: `${TABLE_IMAGE_BASE}Artifact1/Pigments.png`, title: 'Pigments', audio: tableAudio('Mga Kulay Pigments.mp3', 'Mga Kulay Pigments(E).mp3') },
      { id: 'art2-right-table-6', x: 40.49, y: 73.21, imageUrl: `${TABLE_IMAGE_BASE}Artifact1/Artist_sMarterials.png`, title: "Artist's Materials", audio: tableAudio('Mga Kagamitan sa Pagdisenyo.mp3', 'Mga Kagamitan sa Pagdisenyo(E).mp3') },
      { id: 'art2-right-table-7', x: 70.56, y: 36.89, imageUrl: `${TABLE_IMAGE_BASE}Artifact1/CoralPowder.png`, title: 'Coral Powder', audio: tableAudio('Pulbos na Koral.mp3', 'Pulbos na Koral(E).mp3') },
      { id: 'art2-right-table-8', x: 80.92, y: 37.64, imageUrl: `${TABLE_IMAGE_BASE}Artifact1/AdobePowder.png`, title: 'Adobe Powder', audio: tableAudio('Pulbos na Adobe.mp3', 'Pulbos na Adobe(E).mp3') },
      { id: 'art2-right-table-9', x: 91.55, y: 38.40, imageUrl: `${TABLE_IMAGE_BASE}Artifact1/BrickPowder.png`, title: 'Brick Powder', audio: tableAudio('Pulbos na Ladrilyo.mp3', 'Pulbos na Ladrilyo(E).mp3') },
      { id: 'art2-right-table-10', x: 73.92, y: 70.43, imageUrl: `${TABLE_IMAGE_BASE}Artifact1/Lime.png`, title: 'Lime', audio: tableAudio('Apog.mp3', 'Apog(E).mp3') },
      { id: 'art2-right-table-11', x: 85.53, y: 70.69, imageUrl: `${TABLE_IMAGE_BASE}Artifact1/Sand.png`, title: 'Sand', audio: tableAudio('Buhangin.mp3', 'Buhangin(E).mp3') },
    ],
  },
  'hotspot-1': {
    title: { en: 'Construction Materials I', tl: 'Mga Materyales sa Konstruksyon I' },
    imageUrl: `${TABLE_IMAGE_BASE}Art1-LeftTable.png`,
    imageAlt: 'Art1 Left Table',
    hotspots: [
      { id: 'art1-left-table-1', x: 14.40, y: 28.76, imageUrl: `${TABLE_IMAGE_BASE}Artifact/ApogAdobe.png`, title: 'Lime Putty and Adobe Powder', audio: tableAudio('ApogAdobe-T.mp3', 'ApogAdobe-E.mp3') },
      { id: 'art1-left-table-2', x: 13.70, y: 50.00, imageUrl: `${TABLE_IMAGE_BASE}Artifact/LimeSand.png`, title: 'Lime Putty and Sand', audio: tableAudio('ApogSand-T.mp3', 'ApogSand-E.mp3') },
      { id: 'art1-left-table-3', x: 13.28, y: 71.24, imageUrl: `${TABLE_IMAGE_BASE}Artifact/LimeCoral.png`, title: 'Lime Putty and Coral Powder', audio: tableAudio('ApogCoral-T.mp3', 'ApogCoral-E.mp3') },
      { id: 'art1-left-table-4', x: 58.74, y: 39.13, imageUrl: `${TABLE_IMAGE_BASE}Artifact/Limestone.png`, title: 'Limestone', audio: tableAudio('Batong-Apog-T.mp3', 'Batong-Apog-E.mp3') },
      { id: 'art1-left-table-5', x: 58.46, y: 78.82, imageUrl: `${TABLE_IMAGE_BASE}Artifact/Brick.png`, title: 'Brick', audio: tableAudio('Ladrilyo-T.mp3', 'Ladrilyo-E.mp3') },
      { id: 'art1-left-table-6', x: 84.62, y: 78.06, imageUrl: `${TABLE_IMAGE_BASE}Artifact/Adobe.png`, title: 'Adobe', audio: tableAudio('Adobe-T.mp3', 'Adobe-E.mp3') },
      { id: 'art1-left-table-7', x: 83.79, y: 36.35, imageUrl: `${TABLE_IMAGE_BASE}Artifact/CoralStone.png`, title: 'Coral Stone', audio: tableAudio('CoralStone-T.mp3', 'CoralStone-E.mp3') },
    ],
  },
  'hotspot-2': {
    title: { en: 'Wood and Structural Elements', tl: 'Kahoy at mga Elementong Istruktural' },
    imageUrl: `${TABLE_IMAGE_BASE}Art2-LeftTable.png`,
    imageAlt: 'Art2 Left Table',
    hotspots: [
      { id: 'art2-left-table-1', x: 23.77, y: 21.26, imageUrl: `${TABLE_IMAGE_BASE}Artifact3/molave.png`, title: 'Molave', audio: tableAudio('Molave-T.mp3', 'Molave-E.mp3') },
      { id: 'art2-left-table-2', x: 23.28, y: 48.22, imageUrl: `${TABLE_IMAGE_BASE}Artifact3/Narra.png`, title: 'Narra', audio: tableAudio('Narra-T.mp3', 'Narra-E.mp3') },
      { id: 'art2-left-table-3', x: 23.42, y: 75.69, imageUrl: `${TABLE_IMAGE_BASE}Artifact3/KatongMatsing.png`, title: 'Katong Matsing', audio: tableAudio('Katong-Matsing-T.mp3', 'Katong-Matsing-E.mp3') },
      { id: 'art2-left-table-4', x: 45.66, y: 32.45, imageUrl: `${TABLE_IMAGE_BASE}Artifact3/Kamagong.png`, title: 'Kamagong', audio: tableAudio('Kamagong-T.mp3', 'Kamagong-E.mp3') },
      { id: 'art2-left-table-5', x: 45.80, y: 66.28, imageUrl: `${TABLE_IMAGE_BASE}Artifact3/Yakal.png`, title: 'Yakal', audio: tableAudio('Yakal-T.mp3', 'Yakal-E.mp3') },
      { id: 'art2-left-table-6', x: 62.31, y: 55.60, imageUrl: `${TABLE_IMAGE_BASE}Artifact3/BatikulingWHR.png`, title: 'Batikuling WHR', audio: tableAudio('Batikuling-T.mp3', 'Batikuling-E.mp3') },
      { id: 'art2-left-table-7', x: 74.76, y: 53.56, imageUrl: `${TABLE_IMAGE_BASE}Artifact3/Headrest.png`, title: 'Headrest', audio: tableAudio('Headrest-T.mp3', 'Headrest-E.mp3') },
      { id: 'art2-left-table-8', x: 75.46, y: 87.14, imageUrl: `${TABLE_IMAGE_BASE}Artifact3/IronNail.png`, title: 'Iron Nail', audio: tableAudio('IronNail-T.mp3', 'IronNail-E.mp3') },
    ],
  },
};
const CHURCH_FLOATING_LABEL_IMAGES = Object.fromEntries(
  Object.entries(CHURCH_HOTSPOT_TABLES).map(([id, table]) => [id, table.imageUrl]),
);
const QUALITY_PRESETS = {
  auto: {
    pixelRatio: () => Math.min(window.devicePixelRatio || 1, isMobileLikeDevice() ? 1.2 : 1.6),
    splatLodScale: 1.0,
  },
  low: {
    pixelRatio: () => 0.9,
    splatLodScale: 1.35,
  },
  medium: {
    pixelRatio: () => Math.min(window.devicePixelRatio || 1, 1.25),
    splatLodScale: 1.0,
  },
  high: {
    pixelRatio: () => Math.min(window.devicePixelRatio || 1, 2.0),
    splatLodScale: 0.75,
  },
};
const CARDBOARD_SIZE = new THREE.Vector2();
const XR_SESSION_MODE_AR = 'immersive-ar';
const XR_SESSION_MODE_VR = 'immersive-vr';

export class WebXRApp {
  constructor({ container, refs }) {
    this.container = container;
    this.refs = refs;

    this.metadata = null;
    this.requestedScene = String(this.container?.dataset?.webxrScene || '').trim().toLowerCase() || null;
    this.requestedZipOverride = this._readZipOverrideFromUrl();
    this.requestedSpawnOverride = this._readSpawnOverrideFromUrl();

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(DEFAULT_BG);

    this.camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.01, 3000);

    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: false,
      powerPreference: 'high-performance',
    });
    this.renderer.xr.enabled = true;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;

    this.clock = new THREE.Clock();
    this.hotspotRaycaster = new THREE.Raycaster();
    this.hotspotRaycaster.firstHitOnly = true;
    this.labelProjection = new THREE.Vector3();

    this.playerRig = new THREE.Group();
    this.playerRig.name = 'player-rig';
    this.playerRig.add(this.camera);
    this.scene.add(this.playerRig);

    this.loadingManager = new THREE.LoadingManager();
    this.gltfLoader = new GLTFLoader(this.loadingManager);

    this.meshEntries = [];
    this.splatEntries = [];
    this.pickableMeshes = [];
    this.hotspotMarkers = [];
    this.floatingHotspotLabels = [];
    this.expandedHotspotOverlay = null;
    this.expandedHotspotOverlayImage = null;
    this.expandedHotspotOverlayCaption = null;
    this.expandedHotspotOverlayToggle = null;
    this.expandedHotspotOverlayLanguage = null;
    this.expandedHotspotOverlayLayer = null;
    this.expandedHotspotOverlayDetail = null;
    this.expandedHotspotOverlayDetailImage = null;
    this.expandedHotspotOverlayDetailTitle = null;
    this.expandedHotspotTable = null;
    this.expandedHotspotDetail = null;
    this.expandedHotspotLanguage = 'tl';
    this.expandedHotspotAudio = null;
    this.xrHotspotTableViewer = null;
    this.xrHotspotTableId = '';
    this.xrHotspotTableDetail = null;
    this.xrHotspotTablePinsVisible = true;
    this.xrHotspotTableSourceMarker = null;

    this.sparkRenderer = null;
    this.SplatMeshCtor = null;

    this.interactionRegistry = new InteractionRegistry();

    this.uiController = new UiController(this.refs);
    this.mobileMode = isMobileLikeDevice();

    this.playerController = null;
    this.collisionSystem = null;
    this.interactionSystem = null;
    this.activeXrReferenceSpaceType = null;

    // "VR Box" (Cardboard) mode: gyro look + side-by-side stereo rendering,
    // for phones without WebXR (every iOS browser). No XR session involved.
    this.cardboard = {
      active: false,
      stereo: null,
      lastTapAt: 0,
      onTouchStart: null,
      onTouchEnd: null,
    };

    this.boundResize = this.onResize.bind(this);
    this.boundGlobalKeyDown = this._onGlobalKeyDown.bind(this);
    this.boundFullscreenChange = this._onFullscreenChange.bind(this);
  }

  async init() {
    try {
      this.container.appendChild(this.renderer.domElement);

      this._setupUi();
      this._setupExpandedHotspotOverlay();
      this._setupLights();
      this._setupXrUi();
      this._registerInteractions();

      this.uiController.setLoadingProgress(0.05, 'Fetching scene metadata...');
      this.metadata = await this._fetchMetadata();

      this.uiController.clearError();

      const quality = this.metadata.quality?.default ?? 'auto';
      this.applyQuality(quality);

      await this._loadSparkRuntime();
      await this._loadSceneAssets();
      this._createHotspotMarkers();
      this._setupGameplaySystems();

      this.uiController.completeLoading('Scene ready.');

      window.addEventListener('resize', this.boundResize);
      window.addEventListener('keydown', this.boundGlobalKeyDown);
      document.addEventListener('fullscreenchange', this.boundFullscreenChange);
      this.onResize();

      this.renderer.setAnimationLoop(this._animate.bind(this));
    } catch (error) {
      console.error('[startup] failed', error);
      this.uiController.showError(`Startup failed: ${error?.message ?? error}`);
      this.uiController.setLoadingProgress(1, 'Failed to start scene. Check console.');
      throw error;
    }
  }

  _setupUi() {
    this.uiController.bindHandlers({
      onBackRequested: () => this._handleBackRequested(),
      onFullscreenToggled: () => {
        void this._toggleFullscreen();
      },
      onGyroToggled: () => {
        void this._toggleGyroLook();
      },
      onCardboardToggled: () => {
        void this._toggleCardboard();
      },
    });

    this.uiController.setMobileControlsVisible(true);
    this.uiController.setFullscreenState(Boolean(document.fullscreenElement));

    // Gyro "magic window" + VR Box (Cardboard stereo) are the fallbacks for
    // phones without WebXR (every iOS browser). Offered where sensors exist.
    const gyroCapable = typeof window.DeviceOrientationEvent !== 'undefined'
      && (this.mobileMode || Boolean(window.matchMedia?.('(pointer: coarse)')?.matches));
    this.uiController.setGyroVisible(gyroCapable);
    this.uiController.setCardboardVisible(gyroCapable);
  }

  async _toggleGyroLook() {
    if (!this.playerController) {
      return;
    }
    const next = !this.playerController.gyro.enabled;
    try {
      await this.playerController.setGyroEnabled(next);
      this.uiController.setGyroState(next);
      if (next) {
        this.uiController.showError('Gyro look on — move your phone to look around.', 2600);
      }
    } catch (error) {
      this.uiController.setGyroState(false);
      this.uiController.showError(String(error?.message ?? error), 4500);
    }
  }

  /* --- "VR Box" (Cardboard) stereo mode ------------------------------------ */
  async _toggleCardboard() {
    if (!this.playerController) {
      return;
    }
    if (this.cardboard.active) {
      this._exitCardboard();
      return;
    }

    // Gyro drives the head look; enabling it here also runs the iOS motion
    // permission prompt inside this tap.
    try {
      await this.playerController.setGyroEnabled(true);
      this.uiController.setGyroState(true);
    } catch (error) {
      this.uiController.showError(String(error?.message ?? error), 4500);
      return;
    }

    if (!this.cardboard.stereo) {
      this.cardboard.stereo = new THREE.StereoCamera();
      this.cardboard.stereo.eyeSep = 0.064;
    }

    this.cardboard.active = true;
    this.playerController.suppressDragLook = true;
    if (this.interactionSystem) {
      this.interactionSystem.suspended = true;
    }
    this.uiController.setMobileControlsVisible(false);
    this.uiController.setCardboardState(true);
    this.uiController.hideInteraction();

    const gotFullscreen = await this._requestBestFullscreen();
    try { await window.screen?.orientation?.lock?.('landscape'); } catch { /* unsupported */ }

    // In the box the whole screen is the one button: hold = walk forward,
    // double-tap = leave VR Box mode.
    const element = this.renderer.domElement;
    this.cardboard.onTouchStart = () => {
      this.playerController.input.forward = true;
    };
    this.cardboard.onTouchEnd = () => {
      this.playerController.input.forward = false;
      const now = performance.now();
      if (now - this.cardboard.lastTapAt < 350) {
        this._exitCardboard();
        return;
      }
      this.cardboard.lastTapAt = now;
    };
    element.addEventListener('touchstart', this.cardboard.onTouchStart, { passive: true });
    element.addEventListener('touchend', this.cardboard.onTouchEnd, { passive: true });

    const portrait = window.innerHeight > window.innerWidth;
    const isStandalone = Boolean(window.navigator.standalone)
      || Boolean(window.matchMedia?.('(display-mode: standalone)')?.matches);
    let hint = `${portrait ? 'Rotate your phone to landscape, then place' : 'Place'} it in your VR box. Touch & hold = walk · double-tap = exit.`;
    if (!gotFullscreen && !isStandalone) {
      // iPhone WebKit only fullscreens <video>; a Home-Screen launch is the
      // one way Apple allows a truly full screen page.
      hint += ' Tip: for full screen on iPhone, use Share → Add to Home Screen and open from there.';
    }
    this.uiController.showError(hint, gotFullscreen ? 6000 : 9000);
  }

  /* Try every fullscreen mechanism a browser might offer. Returns true when
     one of them took; false on iPhone WebKit, where none exists for pages. */
  async _requestBestFullscreen() {
    const root = document.documentElement;
    try {
      if (root.requestFullscreen) {
        await root.requestFullscreen();
        return true;
      }
    } catch { /* fall through */ }
    try {
      if (root.webkitRequestFullscreen) {
        root.webkitRequestFullscreen(); // iPad + older WebKit/Blink
        return Boolean(document.webkitFullscreenElement);
      }
    } catch { /* fall through */ }
    return false;
  }

  _exitCardboard() {
    if (!this.cardboard.active) {
      return;
    }
    this.cardboard.active = false;

    const element = this.renderer.domElement;
    if (this.cardboard.onTouchStart) {
      element.removeEventListener('touchstart', this.cardboard.onTouchStart);
      this.cardboard.onTouchStart = null;
    }
    if (this.cardboard.onTouchEnd) {
      element.removeEventListener('touchend', this.cardboard.onTouchEnd);
      this.cardboard.onTouchEnd = null;
    }

    if (this.playerController) {
      this.playerController.input.forward = false;
      this.playerController.suppressDragLook = false;
    }
    if (this.interactionSystem) {
      this.interactionSystem.suspended = false;
    }
    this.uiController.setMobileControlsVisible(true);
    this.uiController.setCardboardState(false);

    try { window.screen?.orientation?.unlock?.(); } catch { /* unsupported */ }
    if (document.fullscreenElement) {
      void document.exitFullscreen?.().catch(() => {});
    } else if (document.webkitFullscreenElement) {
      try { document.webkitExitFullscreen?.(); } catch { /* unsupported */ }
    }
    // Gyro look stays on — the visitor is still holding the phone; the Gyro
    // button turns it off if they want drag-look back.
  }

  _renderCardboardStereo() {
    const renderer = this.renderer;
    renderer.getSize(CARDBOARD_SIZE);
    const halfWidth = Math.floor(CARDBOARD_SIZE.x / 2);
    const height = CARDBOARD_SIZE.y;

    this.camera.updateWorldMatrix(true, false);
    const stereo = this.cardboard.stereo;
    stereo.aspect = 0.5;
    stereo.update(this.camera);

    renderer.setScissorTest(true);
    renderer.setScissor(0, 0, halfWidth, height);
    renderer.setViewport(0, 0, halfWidth, height);
    renderer.render(this.scene, stereo.cameraL);

    renderer.setScissor(halfWidth, 0, CARDBOARD_SIZE.x - halfWidth, height);
    renderer.setViewport(halfWidth, 0, CARDBOARD_SIZE.x - halfWidth, height);
    renderer.render(this.scene, stereo.cameraR);

    renderer.setScissorTest(false);
    renderer.setViewport(0, 0, CARDBOARD_SIZE.x, CARDBOARD_SIZE.y);
    renderer.setScissor(0, 0, CARDBOARD_SIZE.x, CARDBOARD_SIZE.y);
  }

  _handleBackRequested() {
    window.location.assign('/interactive');
  }

  async _toggleFullscreen() {
    const doc = document;
    const root = document.documentElement;
    const isActive = Boolean(doc.fullscreenElement);

    try {
      if (isActive) {
        await doc.exitFullscreen?.();
      } else {
        await root.requestFullscreen?.();
      }
    } catch (error) {
      console.warn('[ui] fullscreen toggle failed', error);
      this.uiController.setXrStatus('Fullscreen toggle failed on this device/browser.');
    } finally {
      this.uiController.setFullscreenState(Boolean(doc.fullscreenElement));
    }
  }

  _onFullscreenChange() {
    this.uiController.setFullscreenState(Boolean(document.fullscreenElement));
  }

  _setupExpandedHotspotOverlay() {
    if (this.expandedHotspotOverlay) {
      return;
    }

    const overlay = document.createElement('div');
    overlay.className = 'hotspot-image-overlay hidden';

    const panel = document.createElement('div');
    panel.className = 'hotspot-image-overlay-panel';

    const closeButton = document.createElement('button');
    closeButton.type = 'button';
    closeButton.className = 'hotspot-image-overlay-close';
    closeButton.textContent = 'x';
    closeButton.setAttribute('aria-label', 'Close hotspot image');

    const mediaFrame = document.createElement('div');
    mediaFrame.className = 'hotspot-image-overlay-media';

    const image = document.createElement('img');
    image.className = 'hotspot-image-overlay-image';
    image.alt = '';

    const hotspotLayer = document.createElement('div');
    hotspotLayer.className = 'hotspot-image-overlay-hotspots';
    hotspotLayer.setAttribute('aria-label', 'Table image hotspots');

    const detail = document.createElement('div');
    detail.className = 'hotspot-image-overlay-detail hidden';
    detail.setAttribute('role', 'dialog');
    detail.setAttribute('aria-label', 'Artifact detail');

    const detailImage = document.createElement('img');
    detailImage.className = 'hotspot-image-overlay-detail-image';
    detailImage.alt = '';

    const detailTitle = document.createElement('p');
    detailTitle.className = 'hotspot-image-overlay-detail-title';

    const detailBack = document.createElement('button');
    detailBack.type = 'button';
    detailBack.className = 'hotspot-image-overlay-detail-back';
    detailBack.textContent = '← Back to table';
    detailBack.setAttribute('aria-label', 'Return to the complete table');

    detail.append(detailImage, detailTitle, detailBack);
    mediaFrame.append(image, hotspotLayer, detail);

    const caption = document.createElement('p');
    caption.className = 'hotspot-image-overlay-caption';

    const controls = document.createElement('div');
    controls.className = 'hotspot-image-overlay-controls';

    const toggleInfoButton = document.createElement('button');
    toggleInfoButton.type = 'button';
    toggleInfoButton.className = 'hotspot-image-overlay-toggle hidden';
    toggleInfoButton.textContent = 'Hide hotspots';
    toggleInfoButton.setAttribute('aria-pressed', 'true');

    const languageButton = document.createElement('button');
    languageButton.type = 'button';
    languageButton.className = 'hotspot-image-overlay-toggle hidden';
    languageButton.textContent = 'TL';
    languageButton.setAttribute('aria-label', 'Switch table narration to English');

    controls.append(toggleInfoButton, languageButton);
    panel.append(closeButton, mediaFrame, caption, controls);
    overlay.appendChild(panel);
    document.body.appendChild(overlay);

    closeButton.addEventListener('click', (event) => {
      event.preventDefault();
      this._hideExpandedHotspotImage();
    });

    overlay.addEventListener('click', (event) => {
      if (event.target === overlay) {
        this._hideExpandedHotspotImage();
      }
    });

    toggleInfoButton.addEventListener('click', (event) => {
      event.preventDefault();
      const shouldHide = !hotspotLayer.classList.contains('hidden');
      hotspotLayer.classList.toggle('hidden', shouldHide);
      toggleInfoButton.textContent = shouldHide ? 'Show hotspots' : 'Hide hotspots';
      toggleInfoButton.setAttribute('aria-pressed', String(!shouldHide));
    });

    languageButton.addEventListener('click', (event) => {
      event.preventDefault();
      this.expandedHotspotLanguage = this.expandedHotspotLanguage === 'tl' ? 'en' : 'tl';
      languageButton.textContent = this.expandedHotspotLanguage === 'tl' ? 'TL' : 'EN';
      languageButton.setAttribute(
        'aria-label',
        this.expandedHotspotLanguage === 'tl'
          ? 'Switch table narration to English'
          : 'Switch table narration to Tagalog',
      );
      if (this.expandedHotspotTable && this.expandedHotspotOverlayCaption) {
        this.expandedHotspotOverlayCaption.textContent =
          this.expandedHotspotTable.title?.[this.expandedHotspotLanguage]
          || this.expandedHotspotTable.title?.en
          || this.expandedHotspotTable.imageAlt;
      }
      if (this.expandedHotspotDetail) {
        this._playExpandedHotspotAudio(this.expandedHotspotDetail.audio);
      }
    });

    detailBack.addEventListener('click', (event) => {
      event.preventDefault();
      this._hideExpandedHotspotDetail();
    });

    this.expandedHotspotOverlay = overlay;
    this.expandedHotspotOverlayImage = image;
    this.expandedHotspotOverlayCaption = caption;
    this.expandedHotspotOverlayToggle = toggleInfoButton;
    this.expandedHotspotOverlayLanguage = languageButton;
    this.expandedHotspotOverlayLayer = hotspotLayer;
    this.expandedHotspotOverlayDetail = detail;
    this.expandedHotspotOverlayDetailImage = detailImage;
    this.expandedHotspotOverlayDetailTitle = detailTitle;
  }

  _showExpandedHotspotImage(imageUrl, hotspotId) {
    const table = CHURCH_HOTSPOT_TABLES[hotspotId];
    if (!table || !imageUrl) {
      return;
    }
    if (this.renderer.xr.isPresenting) {
      this._showXrHotspotTable(hotspotId);
      return;
    }

    this._setupExpandedHotspotOverlay();
    if (!this.expandedHotspotOverlay || !this.expandedHotspotOverlayImage) {
      return;
    }

    this._stopExpandedHotspotAudio();
    this.expandedHotspotTable = table;
    this.expandedHotspotDetail = null;
    this.expandedHotspotOverlayImage.src = table.imageUrl || imageUrl;
    this.expandedHotspotOverlayImage.alt = table.imageAlt || `${hotspotId} full image`;
    if (this.expandedHotspotOverlayCaption) {
      this.expandedHotspotOverlayCaption.textContent =
        table.title?.[this.expandedHotspotLanguage] || table.title?.en || table.imageAlt;
    }

    this._hideExpandedHotspotDetail();
    this._renderExpandedHotspotPins(table);

    const hasHotspots = Array.isArray(table.hotspots) && table.hotspots.length > 0;
    if (this.expandedHotspotOverlayToggle) {
      this.expandedHotspotOverlayToggle.classList.toggle('hidden', !hasHotspots);
      this.expandedHotspotOverlayToggle.textContent = 'Hide hotspots';
      this.expandedHotspotOverlayToggle.setAttribute('aria-pressed', 'true');
    }
    if (this.expandedHotspotOverlayLayer) {
      this.expandedHotspotOverlayLayer.classList.toggle('hidden', !hasHotspots);
    }
    if (this.expandedHotspotOverlayLanguage) {
      const hasBilingualAudio = table.hotspots.some((hotspot) => (
        hotspot?.audio?.tl && hotspot.audio.en
      ));
      this.expandedHotspotOverlayLanguage.classList.toggle('hidden', !hasBilingualAudio);
      this.expandedHotspotOverlayLanguage.textContent =
        this.expandedHotspotLanguage === 'tl' ? 'TL' : 'EN';
    }

    this.expandedHotspotOverlay.classList.remove('hidden');
  }

  _renderExpandedHotspotPins(table) {
    if (!this.expandedHotspotOverlayLayer) {
      return;
    }
    this.expandedHotspotOverlayLayer.replaceChildren();
    const hotspots = Array.isArray(table?.hotspots) ? table.hotspots : [];
    hotspots.forEach((hotspot, index) => {
      if (
        !hotspot?.imageUrl
        || !Number.isFinite(Number(hotspot.x))
        || !Number.isFinite(Number(hotspot.y))
      ) {
        return;
      }
      const pin = document.createElement('button');
      pin.type = 'button';
      pin.className = 'hotspot-image-overlay-pin';
      pin.style.left = `${Math.min(100, Math.max(0, Number(hotspot.x)))}%`;
      pin.style.top = `${Math.min(100, Math.max(0, Number(hotspot.y)))}%`;
      pin.textContent = String(index + 1);
      pin.setAttribute('aria-label', `Open ${hotspot.title || `table detail ${index + 1}`}`);
      pin.addEventListener('click', (event) => {
        event.preventDefault();
        event.stopPropagation();
        this._showExpandedHotspotDetail(hotspot);
      });
      this.expandedHotspotOverlayLayer.appendChild(pin);
    });
  }

  _showExpandedHotspotDetail(detail) {
    if (
      !detail?.imageUrl
      || !this.expandedHotspotOverlayDetail
      || !this.expandedHotspotOverlayDetailImage
    ) {
      return;
    }
    this.expandedHotspotDetail = detail;
    this.expandedHotspotOverlayDetailImage.src = detail.imageUrl;
    this.expandedHotspotOverlayDetailImage.alt = detail.title || 'Artifact detail';
    if (this.expandedHotspotOverlayDetailTitle) {
      this.expandedHotspotOverlayDetailTitle.textContent = detail.title || 'Artifact detail';
    }
    this.expandedHotspotOverlayDetail.setAttribute(
      'aria-label',
      detail.title || 'Artifact detail',
    );
    this.expandedHotspotOverlayDetail.classList.remove('hidden');
    this._playExpandedHotspotAudio(detail.audio);
  }

  _hideExpandedHotspotDetail() {
    this._stopExpandedHotspotAudio();
    this.expandedHotspotDetail = null;
    this.expandedHotspotOverlayDetail?.classList.add('hidden');
    if (this.expandedHotspotOverlayDetailImage) {
      this.expandedHotspotOverlayDetailImage.removeAttribute('src');
      this.expandedHotspotOverlayDetailImage.alt = '';
    }
    if (this.expandedHotspotOverlayDetailTitle) {
      this.expandedHotspotOverlayDetailTitle.textContent = '';
    }
  }

  _playExpandedHotspotAudio(audioByLanguage) {
    this._stopExpandedHotspotAudio();
    const source = audioByLanguage
      ? (
          audioByLanguage[this.expandedHotspotLanguage]
          || audioByLanguage.en
          || audioByLanguage.tl
          || ''
        )
      : '';
    if (!source) {
      return;
    }
    const audio = new Audio(encodeURI(source));
    audio.preload = 'auto';
    this.expandedHotspotAudio = audio;
    const playing = audio.play();
    if (playing?.catch) {
      playing.catch((error) => {
        console.warn('[hotspot] Table detail audio could not autoplay.', error);
      });
    }
  }

  _stopExpandedHotspotAudio() {
    if (!this.expandedHotspotAudio) {
      return;
    }
    this.expandedHotspotAudio.pause();
    this.expandedHotspotAudio.currentTime = 0;
    this.expandedHotspotAudio = null;
  }

  _createXrTableControlTexture(label) {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 256;
    const context = canvas.getContext('2d');
    if (!context) {
      return null;
    }
    context.clearRect(0, 0, 256, 256);
    context.beginPath();
    context.arc(128, 128, 104, 0, Math.PI * 2);
    context.fillStyle = 'rgba(13, 10, 4, 0.96)';
    context.fill();
    context.lineWidth = 10;
    context.strokeStyle = '#d4af6a';
    context.stroke();
    context.fillStyle = '#faf7f2';
    context.font = String(label).length > 2
      ? '700 54px Inter, sans-serif'
      : '800 86px Inter, sans-serif';
    context.textAlign = 'center';
    context.textBaseline = 'middle';
    context.fillText(String(label), 128, 132);
    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.needsUpdate = true;
    return texture;
  }

  _createXrTableControl({
    parent,
    label,
    position,
    scale = 0.2,
    name,
    metadata = {},
  }) {
    const texture = this._createXrTableControlTexture(label);
    if (!parent || !texture) {
      return null;
    }
    const sprite = new THREE.Sprite(new THREE.SpriteMaterial({
      map: texture,
      transparent: true,
      depthTest: false,
      depthWrite: false,
      toneMapped: false,
    }));
    sprite.position.set(position[0], position[1], position[2] ?? 0.08);
    sprite.scale.setScalar(scale);
    sprite.renderOrder = 54;
    sprite.userData.isXrTablePickable = true;
    sprite.userData.interaction = {
      name,
      suppressPanel: true,
      metadata,
    };
    parent.add(sprite);
    this.pickableMeshes.push(sprite);
    return sprite;
  }

  _showXrHotspotTable(hotspotId) {
    const table = CHURCH_HOTSPOT_TABLES[hotspotId];
    if (!table || !this.scene || !this.camera) {
      return;
    }
    this._disposeXrHotspotTableViewer();
    this.xrHotspotTableId = hotspotId;
    this.xrHotspotTableDetail = null;
    this.xrHotspotTablePinsVisible = true;
    this.xrHotspotTableSourceMarker =
      this.hotspotMarkers.find((marker) => marker.name === hotspotId) || null;
    if (this.xrHotspotTableSourceMarker) {
      this.xrHotspotTableSourceMarker.visible = false;
    }
    this._rebuildXrHotspotTableViewer();
  }

  _rebuildXrHotspotTableViewer() {
    const table = CHURCH_HOTSPOT_TABLES[this.xrHotspotTableId];
    if (!table || !this.scene || !this.camera) {
      return;
    }

    const previousViewer = this.xrHotspotTableViewer;
    const previousPosition = previousViewer?.position?.clone() || null;
    const previousQuaternion = previousViewer?.quaternion?.clone() || null;
    this._disposeXrHotspotTableViewer({ restoreSource: false, stopAudio: false });

    const viewerRoot = new THREE.Group();
    viewerRoot.name = 'xr-hotspot-table-viewer';
    if (previousPosition && previousQuaternion) {
      viewerRoot.position.copy(previousPosition);
      viewerRoot.quaternion.copy(previousQuaternion);
    } else {
      const cameraPosition = new THREE.Vector3();
      const cameraDirection = new THREE.Vector3();
      this.camera.getWorldPosition(cameraPosition);
      this.camera.getWorldDirection(cameraDirection);
      cameraDirection.y = Math.max(-0.18, Math.min(0.18, cameraDirection.y));
      cameraDirection.normalize();
      viewerRoot.position.copy(cameraPosition).addScaledVector(cameraDirection, 1.75);
      viewerRoot.lookAt(cameraPosition);
    }

    const border = new THREE.Mesh(
      new THREE.PlaneGeometry(1.94, 1.44),
      new THREE.MeshBasicMaterial({
        color: 0xd4af6a,
        depthTest: false,
        depthWrite: false,
      }),
    );
    border.renderOrder = 45;
    viewerRoot.add(border);

    const panel = new THREE.Mesh(
      new THREE.PlaneGeometry(1.88, 1.38),
      new THREE.MeshBasicMaterial({
        color: 0x1c1208,
        depthTest: false,
        depthWrite: false,
      }),
    );
    panel.position.z = 0.012;
    panel.renderOrder = 46;
    viewerRoot.add(panel);

    this.xrHotspotTableViewer = viewerRoot;
    this.scene.add(viewerRoot);

    this._createXrTableControl({
      parent: viewerRoot,
      label: '×',
      position: [0.81, 0.58, 0.09],
      scale: 0.2,
      name: 'xr-table-close',
    });
    this._createXrTableControl({
      parent: viewerRoot,
      label: this.expandedHotspotLanguage === 'tl' ? 'TL' : 'EN',
      position: [-0.66, -0.56, 0.09],
      scale: 0.2,
      name: 'xr-table-language',
    });

    const detail = this.xrHotspotTableDetail;
    const imageUrl = detail?.imageUrl || table.imageUrl;
    const viewerAtBuild = viewerRoot;
    new THREE.TextureLoader().load(imageUrl, (texture) => {
      if (this.xrHotspotTableViewer !== viewerAtBuild) {
        texture.dispose();
        return;
      }
      texture.colorSpace = THREE.SRGBColorSpace;
      const sourceWidth = Number(texture.image?.naturalWidth ?? texture.image?.width ?? 1);
      const sourceHeight = Number(texture.image?.naturalHeight ?? texture.image?.height ?? 1);
      const aspect = sourceWidth / Math.max(1, sourceHeight);
      let width = 1.68;
      let height = width / aspect;
      if (height > 1.02) {
        height = 1.02;
        width = height * aspect;
      }
      const image = new THREE.Mesh(
        new THREE.PlaneGeometry(width, height),
        new THREE.MeshBasicMaterial({
          map: texture,
          transparent: true,
          depthTest: false,
          depthWrite: false,
          toneMapped: false,
        }),
      );
      image.position.set(0, 0.08, 0.06);
      image.renderOrder = 49;
      viewerRoot.add(image);

      if (detail) {
        this._createXrTableControl({
          parent: viewerRoot,
          label: '←',
          position: [-0.72, 0.52, 0.09],
          scale: 0.2,
          name: 'xr-table-back',
        });
        return;
      }

      if (!this.xrHotspotTablePinsVisible) {
        return;
      }
      table.hotspots.forEach((hotspot, index) => {
        const x = (Math.min(100, Math.max(0, Number(hotspot.x))) / 100 - 0.5) * width;
        const y = (0.5 - Math.min(100, Math.max(0, Number(hotspot.y))) / 100) * height + 0.08;
        this._createXrTableControl({
          parent: viewerRoot,
          label: String(index + 1),
          position: [x, y, 0.09],
          scale: 0.13,
          name: 'xr-table-detail',
          metadata: {
            hotspotId: this.xrHotspotTableId,
            detailId: hotspot.id,
          },
        });
      });
    });

    if (!detail) {
      this._createXrTableControl({
        parent: viewerRoot,
        label: 'PIN',
        position: [-0.34, -0.56, 0.09],
        scale: 0.2,
        name: 'xr-table-toggle',
      });
    }
  }

  _disposeXrHotspotTableViewer(options = {}) {
    const restoreSource = options.restoreSource !== false;
    const stopAudio = options.stopAudio !== false;
    const viewerRoot = this.xrHotspotTableViewer;
    if (viewerRoot) {
      const removedPickables = new Set();
      viewerRoot.traverse((object) => {
        if (object.userData?.isXrTablePickable) {
          removedPickables.add(object);
        }
        object.geometry?.dispose?.();
        const materials = Array.isArray(object.material) ? object.material : [object.material];
        materials.filter(Boolean).forEach((material) => {
          material.map?.dispose?.();
          material.dispose?.();
        });
      });
      this.pickableMeshes = this.pickableMeshes.filter((mesh) => !removedPickables.has(mesh));
      viewerRoot.parent?.remove(viewerRoot);
    }
    this.xrHotspotTableViewer = null;
    if (restoreSource && this.xrHotspotTableSourceMarker) {
      this.xrHotspotTableSourceMarker.visible = true;
      this.xrHotspotTableSourceMarker = null;
      this.xrHotspotTableId = '';
      this.xrHotspotTableDetail = null;
    }
    if (stopAudio) {
      this._stopExpandedHotspotAudio();
    }
  }

  _hideExpandedHotspotImage() {
    this._hideExpandedHotspotDetail();
    this.expandedHotspotTable = null;
    this.expandedHotspotOverlayLayer?.replaceChildren();
    this.expandedHotspotOverlay?.classList.add('hidden');
  }

  _setupLights() {
    const hemi = new THREE.HemisphereLight(0xffffff, 0x223344, 0.72);
    const key = new THREE.DirectionalLight(0xffffff, 0.45);
    key.position.set(5, 8, 5);
    this.scene.add(hemi, key);
  }

  _setupXrUi() {
    const mountXrButton = (button) => {
      const host = this.refs.xrButtonContainer ?? document.body;
      host.appendChild(button);
    };

    try {
      this.renderer.xr.setReferenceSpaceType('local-floor');
    } catch {
      this.renderer.xr.setReferenceSpaceType('local');
    }

    const xrApiAvailable = Boolean(navigator.xr);

    Promise.resolve(
      xrApiAvailable
        ? Promise.all([
          navigator.xr.isSessionSupported(XR_SESSION_MODE_AR).catch(() => false),
          navigator.xr.isSessionSupported(XR_SESSION_MODE_VR).catch(() => false),
        ])
        : [false, false],
    )
      .then(([arSupported, vrSupported]) => {
        const formatArStartError = (error) => {
          const name = String(error?.name || 'Error');
          const message = String(error?.message || '').trim();
          const detail = message ? `${name}: ${message}` : name;

          if (name === 'NotAllowedError') {
            return `AR blocked (${detail}). Allow camera/motion permissions for this site.`;
          }

          if (name === 'SecurityError') {
            return `AR blocked (${detail}). Open this page over HTTPS.`;
          }

          if (name === 'NotSupportedError') {
            return `AR unsupported (${detail}). Try Chrome on Android with Google Play Services for AR.`;
          }

          return `AR start failed (${detail}). Check HTTPS, permissions, and browser/device support.`;
        };

        const formatVrStartError = (error) => {
          const name = String(error?.name || 'Error');
          const message = String(error?.message || '').trim();
          const detail = message ? `${name}: ${message}` : name;

          if (name === 'NotAllowedError') {
            return `Full 3D XR blocked (${detail}). Allow XR permissions for this site.`;
          }

          if (name === 'SecurityError') {
            return `Full 3D XR blocked (${detail}). Open this page over HTTPS.`;
          }

          if (name === 'NotSupportedError') {
            return `Full 3D XR unsupported (${detail}). Tip: on phones without VR support (like iPhone), use the Gyro button to look around by moving your phone.`;
          }

          return `Full 3D XR start failed (${detail}).`;
        };

        const showUnsupportedModeMessage = (sessionMode) => {
          if (sessionMode === XR_SESSION_MODE_AR) {
            this.uiController.showError('AR needs Chrome on Android (with Google Play Services for AR). On iPhone, use the artifact 3D viewers’ AR button instead.', 4500);
            return;
          }

          this.uiController.showError('VR headset mode is not available on this device/browser. Tip: tap the Gyro button to look around by moving your phone.', 4500);
        };

        const requestArSessionWithFallback = async () => {
          const sessionAttempts = [
            {
              optionalFeatures: ['local-floor', 'bounded-floor', 'hit-test', 'hand-tracking'],
            },
            {
              optionalFeatures: ['local-floor', 'bounded-floor'],
            },
            {},
          ];

          let lastError = null;

          for (const options of sessionAttempts) {
            try {
              return await navigator.xr.requestSession(XR_SESSION_MODE_AR, options);
            } catch (error) {
              lastError = error;
              console.warn('[xr] AR requestSession attempt failed', { options, error });
            }
          }

          throw lastError || new Error('AR session request failed.');
        };

        const requestVrSessionWithFallback = async () => {
          const sessionAttempts = [
            {
              optionalFeatures: ['local-floor', 'bounded-floor', 'hand-tracking'],
            },
            {
              optionalFeatures: ['local-floor', 'bounded-floor'],
            },
            {},
          ];

          let lastError = null;

          for (const options of sessionAttempts) {
            try {
              return await navigator.xr.requestSession(XR_SESSION_MODE_VR, options);
            } catch (error) {
              lastError = error;
              console.warn('[xr] VR requestSession attempt failed', { options, error });
            }
          }

          throw lastError || new Error('VR session request failed.');
        };

        const getReferenceSpaceCandidates = (sessionMode) => (
          sessionMode === XR_SESSION_MODE_VR
            ? ['local-floor']
            : ['local-floor', 'local']
        );

        const bindSessionWithReferenceSpaceFallback = async (session, sessionMode) => {
          const candidates = getReferenceSpaceCandidates(sessionMode);
          let lastError = null;

          for (const referenceSpaceType of candidates) {
            try {
              this.renderer.xr.setReferenceSpaceType(referenceSpaceType);
            } catch (error) {
              lastError = error;
              continue;
            }

            try {
              await this.renderer.xr.setSession(session);
              return referenceSpaceType;
            } catch (error) {
              lastError = error;
              console.warn('[xr] setSession failed for reference space', {
                sessionMode,
                referenceSpaceType,
                error,
              });
            }
          }

          throw lastError || new Error('Failed to bind XR session.');
        };
          let activeSession = null;
          let activeButton = null;
          const xrButtons = [];

          const setButtonsDisabled = (disabled) => {
            for (const entry of xrButtons) {
              entry.button.disabled = disabled;
            }
          };

          const resetButtons = () => {
            for (const entry of xrButtons) {
              entry.button.disabled = false;
              if (entry.buttonLabel) {
                entry.buttonLabel.textContent = entry.startLabel;
              }
            }
          };

          const onSessionEnded = () => {
            if (activeSession) {
              activeSession.removeEventListener('end', onSessionEnded);
            }
            activeSession = null;
            activeButton = null;
            this.activeXrReferenceSpaceType = null;
            resetButtons();
          };

          const createSessionButton = ({
            iconLabel,
            startLabel,
            startingLabel,
            stopLabel,
            sessionMode,
            supported,
            requestSession,
            formatStartError,
          }) => {
            const button = document.createElement('button');
            button.type = 'button';
            button.className = 'tour-control-dock__action';
            button.innerHTML = `
              <span class="tour-control-dock__icon" aria-hidden="true">${iconLabel}</span>
              <span class="tour-control-dock__label">${startLabel}</span>
            `;
            const buttonLabel = button.querySelector('.tour-control-dock__label');
            xrButtons.push({ button, startLabel, buttonLabel });

            button.addEventListener('click', async () => {
              this.uiController.clearError();

              if (activeSession) {
                if (activeButton === button) {
                  button.disabled = true;
                  try {
                    await activeSession.end();
                  } catch {
                    this.uiController.setXrStatus('Could not end active XR session. Try again.');
                    resetButtons();
                  }
                } else {
                  this.uiController.setXrStatus('Another XR mode is active. Stop it first, then start this mode.');
                }
                return;
              }

              if (!supported) {
                showUnsupportedModeMessage(sessionMode);
                return;
              }

              setButtonsDisabled(true);
              if (buttonLabel) {
                buttonLabel.textContent = startingLabel;
              }
              let pendingSession = null;

              try {
                const session = await requestSession();
                pendingSession = session;
                session.addEventListener('end', onSessionEnded);

                const boundReferenceSpaceType = await bindSessionWithReferenceSpaceFallback(
                  session,
                  sessionMode,
                );

                activeSession = session;
                activeButton = button;
                this.activeXrReferenceSpaceType = boundReferenceSpaceType;
                pendingSession = null;

                setButtonsDisabled(true);
                button.disabled = false;
                if (buttonLabel) {
                  buttonLabel.textContent = stopLabel;
                }
              } catch (error) {
                if (pendingSession) {
                  try {
                    pendingSession.removeEventListener('end', onSessionEnded);
                    await pendingSession.end();
                  } catch {
                  }
                }

                console.warn('[xr] failed to start XR session', { sessionMode, error });
                this.activeXrReferenceSpaceType = null;
                resetButtons();
                this.uiController.setXrStatus(formatStartError(error));
              }
            });

            mountXrButton(button);
          };

          createSessionButton({
            iconLabel: 'VR',
            startLabel: 'VR',
            startingLabel: '...',
            stopLabel: 'Stop',
            sessionMode: XR_SESSION_MODE_VR,
            supported: vrSupported,
            requestSession: requestVrSessionWithFallback,
            formatStartError: formatVrStartError,
          });

          createSessionButton({
            iconLabel: 'AR',
            startLabel: 'AR',
            startingLabel: '...',
            stopLabel: 'Stop',
            sessionMode: XR_SESSION_MODE_AR,
            supported: arSupported,
            requestSession: requestArSessionWithFallback,
            formatStartError: formatArStartError,
          });
      })
      .catch(() => {
        const fallbackButtons = [
          {
            iconLabel: 'VR',
            startLabel: 'VR',
            sessionMode: XR_SESSION_MODE_VR,
          },
          {
            iconLabel: 'AR',
            startLabel: 'AR',
            sessionMode: XR_SESSION_MODE_AR,
          },
        ];

        for (const entry of fallbackButtons) {
          const button = document.createElement('button');
          button.type = 'button';
          button.className = 'tour-control-dock__action';
          button.innerHTML = `
            <span class="tour-control-dock__icon" aria-hidden="true">${entry.iconLabel}</span>
            <span class="tour-control-dock__label">${entry.startLabel}</span>
          `;
          button.addEventListener('click', () => {
            this.uiController.showError('WebXR capability check failed on this device/browser, so this XR mode cannot start.', 3200);
          });
          mountXrButton(button);
        }
      });

    this.renderer.xr.addEventListener('sessionstart', () => {
      const mode = this.renderer.xr.getSession()?.mode;
      if (mode === XR_SESSION_MODE_AR) {
        this.uiController.clearError();
      } else if (mode === XR_SESSION_MODE_VR) {
        this.uiController.clearError();
      } else {
        this.uiController.clearError();
      }

      this.uiController.setMobileControlsVisible(true);
    });
    this.renderer.xr.addEventListener('sessionend', () => {
      this.activeXrReferenceSpaceType = null;
      this._disposeXrHotspotTableViewer();

      this.uiController.setMobileControlsVisible(true);
    });
  }

  _registerInteractions() {
    this.interactionRegistry.register('door', () => {
      this._transferToUnderground();
    });

    this.interactionRegistry.register('go-back-to-church', () => {
      this._transferToChurch(CHURCH_RETURN_SPAWN);
    });

    Object.keys(CHURCH_HOTSPOT_TABLES).forEach((hotspotId) => {
      this.interactionRegistry.register(hotspotId, () => {
        const table = CHURCH_HOTSPOT_TABLES[hotspotId];
        if (table) {
          this._showExpandedHotspotImage(table.imageUrl, hotspotId);
        }
      });
    });
    this.interactionRegistry.register('xr-table-close', () => {
      this._disposeXrHotspotTableViewer();
    });
    this.interactionRegistry.register('xr-table-toggle', () => {
      this.xrHotspotTablePinsVisible = !this.xrHotspotTablePinsVisible;
      this._rebuildXrHotspotTableViewer();
    });
    this.interactionRegistry.register('xr-table-language', () => {
      this.expandedHotspotLanguage = this.expandedHotspotLanguage === 'tl' ? 'en' : 'tl';
      if (this.xrHotspotTableDetail) {
        this._playExpandedHotspotAudio(this.xrHotspotTableDetail.audio);
      }
      this._rebuildXrHotspotTableViewer();
    });
    this.interactionRegistry.register('xr-table-back', () => {
      this._stopExpandedHotspotAudio();
      this.xrHotspotTableDetail = null;
      this._rebuildXrHotspotTableViewer();
    });
    this.interactionRegistry.register('xr-table-detail', (context) => {
      const table = CHURCH_HOTSPOT_TABLES[this.xrHotspotTableId];
      const detailId = context?.metadata?.detailId;
      const detail = table?.hotspots?.find((hotspot) => hotspot.id === detailId);
      if (!detail) {
        return;
      }
      this.xrHotspotTableDetail = detail;
      this._playExpandedHotspotAudio(detail.audio);
      this._rebuildXrHotspotTableViewer();
    });

    this.interactionRegistry.register('altar', (context) => {
      console.log('[interaction] altar selected', context);
    });
  }

  async _fetchMetadata() {
    const prefetched = this._readPrefetchedMetadata();
    if (prefetched) {
      return prefetched;
    }

    let query = '';
    if (this.requestedScene) {
      query = `?scene=${encodeURIComponent(this.requestedScene)}`;
    } else if (this.requestedZipOverride) {
      query = `?zip=${encodeURIComponent(this.requestedZipOverride)}`;
    }
    const response = await fetch(`/api/webxr/scene${query}`, { cache: 'no-store' });
    if (!response.ok) {
      throw new Error(`Could not load /api/webxr/scene (${response.status})`);
    }
    const payload = await response.json();
    this._storePrefetchedMetadata(payload);
    return payload;
  }

  _readPrefetchedMetadata() {
    if (this.requestedScene || this.requestedZipOverride) {
      return null;
    }

    if (!window.sessionStorage) {
      return null;
    }

    let raw = null;
    try {
      raw = window.sessionStorage.getItem(WEBXR_PREFETCH_STORAGE_KEY);
    } catch {
      return null;
    }

    if (!raw) {
      return null;
    }

    try {
      const payload = JSON.parse(raw);
      if (!payload || payload.version !== 1 || !payload.metadata || !payload.metadata.scene) {
        return null;
      }

      const expectedZip = String(this.requestedZipOverride || '').trim();
      const cachedZip = String(payload.zipOverride || '').trim();
      if (cachedZip !== expectedZip) {
        return null;
      }

      const now = Date.now();
      const expiresAt = Number(payload.expiresAt || 0);
      if (Number.isFinite(expiresAt) && expiresAt > now) {
        return payload.metadata;
      }

      const storedAt = Number(payload.storedAt || 0);
      if (Number.isFinite(storedAt) && now - storedAt <= WEBXR_PREFETCH_MAX_AGE_MS) {
        return payload.metadata;
      }
    } catch {
      try {
        window.sessionStorage.removeItem(WEBXR_PREFETCH_STORAGE_KEY);
      } catch {
      }
      return null;
    }

    return null;
  }

  _storePrefetchedMetadata(payload) {
    if (this.requestedScene || this.requestedZipOverride) {
      return;
    }

    if (!window.sessionStorage || !payload || !payload.scene) {
      return;
    }

    const now = Date.now();
    const toStore = {
      version: 1,
      zipOverride: String(this.requestedZipOverride || '').trim(),
      storedAt: now,
      expiresAt: now + WEBXR_PREFETCH_MAX_AGE_MS,
      metadata: payload,
    };

    try {
      window.sessionStorage.setItem(WEBXR_PREFETCH_STORAGE_KEY, JSON.stringify(toStore));
    } catch {
    }
  }

  async _loadSparkRuntime() {
    const sparkUrl = this.metadata.scene?.source?.sparkModuleUrl;
    if (!sparkUrl) {
      console.warn('[spark] no module URL in metadata; splats may fail to load');
      return;
    }

    this.uiController.setLoadingProgress(0.1, 'Loading Spark runtime...');

    try {
      const spark = await import(sparkUrl);
      this.SplatMeshCtor = spark.SplatMesh;

      if (spark.SparkRenderer) {
        this.sparkRenderer = new spark.SparkRenderer({
          renderer: this.renderer,
          maxStdDev: Math.sqrt(5),
        });
        this.sparkRenderer.name = 'spark-renderer';
        this.scene.add(this.sparkRenderer);
      }
    } catch (error) {
      console.warn('[spark] failed to load Spark module', error);
      this.uiController.showError(
        'Spark module failed to load. GLB meshes will still render, but splats may be missing.',
      );
    }
  }

  async _loadSceneAssets() {
    const splatAssets = this.metadata.scene?.assets?.splats ?? [];
    const meshAssets = this.metadata.scene?.assets?.meshes ?? [];

    const total = splatAssets.length + meshAssets.length;
    const splatsBeforeLoad = this.splatEntries.length;
    let done = 0;

    const updateProgress = (label) => {
      const ratio = total > 0 ? done / total : 1;
      const from = 0.15;
      const to = 0.92;
      this.uiController.setLoadingProgress(from + (to - from) * ratio, label);
    };

    updateProgress('Loading scene assets...');

    for (const splat of splatAssets) {
      await this._loadSingleSplat(splat);
      done += 1;
      updateProgress(`Loaded SPZ ${done}/${splatAssets.length}`);
    }

    const loadedSplatCount = this.splatEntries.length - splatsBeforeLoad;
    if (loadedSplatCount !== splatAssets.length) {
      throw new Error(
        `Scene startup stopped: loaded ${loadedSplatCount} of ${splatAssets.length} SPZ files.`,
      );
    }

    for (const mesh of meshAssets) {
      await this._loadSingleMesh(mesh);
      done += 1;
      updateProgress(`Loaded mesh ${done}/${total}`);
    }

    if (this.meshEntries.length === 0 && this.splatEntries.length === 0) {
      throw new Error('No renderable assets were loaded from metadata.');
    }
  }

  async _loadSingleSplat(asset) {
    if (!this.SplatMeshCtor) {
      throw new Error(`Spark is unavailable; cannot load ${asset.relativePath}.`);
    }

    let splatObject = null;
    try {
      splatObject = new this.SplatMeshCtor({
        url: asset.url,
        lod: true,
      });

      if (!splatObject?.initialized || typeof splatObject.initialized.then !== 'function') {
        throw new Error('Spark did not provide an initialization promise.');
      }

      await splatObject.initialized;

      if (splatObject.isInitialized !== true) {
        throw new Error('Spark initialization did not complete.');
      }
      if (!Number.isFinite(splatObject.numSplats) || splatObject.numSplats < 1) {
        throw new Error('The SPZ contains no renderable splats.');
      }

      splatObject.name = asset.name || asset.fileName;
      applyAssetTransform(splatObject, asset.transform);
      splatObject.updateMatrixWorld(true);
      this.scene.add(splatObject);

      this.splatEntries.push({
        asset,
        object: splatObject,
      });
    } catch (error) {
      if (splatObject && typeof splatObject.dispose === 'function') {
        splatObject.dispose();
      }
      throw new Error(`Failed to fully load ${asset.relativePath}: ${error?.message ?? error}`);
    }
  }

  async _loadSingleMesh(asset) {
    try {
      const gltf = await this.gltfLoader.loadAsync(asset.url);
      const root = gltf.scene;
      root.name = asset.name || asset.fileName;
      const isDoorAsset = String(asset.fileName || asset.relativePath || asset.name || '')
        .toLowerCase()
        .includes('doorglb');

      applyAssetTransform(root, asset.transform);
      root.updateMatrixWorld(true);

      root.traverse((child) => {
        if (!child.isMesh) {
          return;
        }

        child.castShadow = false;
        child.receiveShadow = true;
        child.frustumCulled = true;

        if (isDoorAsset) {
          child.userData.interaction = {
            assetId: asset.id,
            name: asset.fileName || asset.relativePath || child.name || root.name,
            suppressPanel: true,
            maxDistance: DOOR_INTERACTION_MAX_DISTANCE,
            metadata: {
              type: 'door',
              fileName: asset.fileName,
              relativePath: asset.relativePath,
              ...asset.metadata,
            },
          };

          this.pickableMeshes.push(child);
        }
      });

      this.scene.add(root);
      this.meshEntries.push({
        asset,
        root,
      });
    } catch (error) {
      console.warn(`[mesh] failed to load ${asset.relativePath}`, error);
    }
  }

  _getActiveHotspotMarkers() {
    if (this._isUndergroundScene()) {
      return UNDERGROUND_HOTSPOT_MARKERS;
    }
    if (this._isMuseumScene()) {
      return MUSEUM_HOTSPOT_MARKERS;
    }
    return CHURCH_HOTSPOT_MARKERS;
  }

  _getHotspotConfig(hotspotId) {
    return this._getActiveHotspotMarkers().find((hotspot) => hotspot.id === hotspotId) ?? null;
  }

  _buildHotspotMarker({
    id,
    position,
    color,
    radius,
    interactionName = null,
    metadata = {},
    maxDistance = null,
    suppressPanel = true,
  }) {
    const root = new THREE.Group();
    root.name = id;

    const markerPosition = position?.isVector3
      ? position.clone()
      : new THREE.Vector3(position[0], position[1], position[2]);
    root.position.copy(markerPosition);

    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(radius * 1.1, radius * 0.13, 12, 48),
      new THREE.MeshBasicMaterial({
        color,
        transparent: true,
        opacity: 0.58,
        depthTest: false,
        depthWrite: false,
      }),
    );
    ring.position.y = 0.02;
    ring.rotation.x = Math.PI / 2;
    ring.renderOrder = 5;

    const orb = new THREE.Mesh(
      new THREE.SphereGeometry(radius * 0.42, 14, 14),
      new THREE.MeshStandardMaterial({
        color: 0xffffff,
        emissive: color,
        emissiveIntensity: 0.48,
        roughness: 0.52,
        metalness: 0.0,
        depthTest: false,
        depthWrite: false,
      }),
    );
    orb.position.y = radius * 0.55;
    orb.castShadow = false;
    orb.receiveShadow = false;
    orb.renderOrder = 6;

    if (interactionName) {
      ring.name = `${interactionName}-ring`;
      orb.name = `${interactionName}-orb`;

      const interaction = {
        name: interactionName,
        suppressPanel,
        maxDistance,
        metadata,
      };

      ring.userData.interaction = interaction;
      orb.userData.interaction = interaction;
      ring.userData.isHotspotPickable = true;
      orb.userData.isHotspotPickable = true;

      this.pickableMeshes.push(ring, orb);
    }

    root.add(ring, orb);

    return { root, ring, orb };
  }

  _createHotspotMarkers() {
    for (const marker of this.hotspotMarkers) {
      this.scene.remove(marker);
    }
    this.hotspotMarkers = [];
    this._clearFloatingHotspotLabels();
    this.pickableMeshes = this.pickableMeshes.filter((mesh) => !mesh.userData?.isHotspotPickable);

    const activeHotspots = this._getActiveHotspotMarkers();

    for (const hotspot of activeHotspots) {
      const interactionName = hotspot.id === 'go-back-to-church'
        ? hotspot.id
        : (CHURCH_HOTSPOT_TABLES[hotspot.id] ? hotspot.id : null);
      const { root } = this._buildHotspotMarker({
        id: hotspot.id,
        position: hotspot.position,
        color: hotspot.color,
        radius: hotspot.radius,
        interactionName,
        maxDistance: hotspot.interactionMaxDistance ?? HOTSPOT_INTERACTION_MAX_DISTANCE,
        metadata: {
          type: 'hotspot',
          hotspotId: hotspot.id,
        },
      });

      this.scene.add(root);
      this.hotspotMarkers.push(root);

      const labelImageUrl = !this._isUndergroundScene()
        ? CHURCH_FLOATING_LABEL_IMAGES[hotspot.id]
        : null;
      if (labelImageUrl) {
        this._createFloatingHotspotLabel(root, hotspot.id, labelImageUrl, hotspot.radius);
      }
    }

    this._updateFloatingHotspotLabels();
  }

  _createFloatingHotspotLabel(anchor, hotspotId, imageUrl, radius = 0.07) {
    const element = document.createElement('div');
    element.className = 'hotspot-floating-label hotspot-floating-label-image-wrap';

    const trigger = document.createElement('button');
    trigger.type = 'button';
    trigger.className = 'hotspot-floating-label-link';
    trigger.setAttribute('aria-label', `Open image for ${hotspotId}`);
    trigger.title = `Open image for ${hotspotId}`;
    trigger.addEventListener('click', (event) => {
      event.preventDefault();
      event.stopPropagation();

      const hotspot = this._getHotspotConfig(hotspotId);
      const maxDistance = Number(hotspot?.interactionMaxDistance ?? HOTSPOT_INTERACTION_MAX_DISTANCE);
      if (!this._isWithinInteractionDistance(anchor, maxDistance, 'hotspot')) {
        return;
      }

      this._showExpandedHotspotImage(imageUrl, hotspotId);
    });

    const image = document.createElement('img');
    image.className = 'hotspot-floating-label-image';
    image.src = imageUrl;
    image.alt = `${hotspotId} preview`;
    image.decoding = 'async';
    trigger.appendChild(image);
    element.appendChild(trigger);

    document.body.appendChild(element);

    const yOffset = Math.max(0.12, Number(radius) * 2.4);
    const xrSprite = this._createXrFloatingHotspotSprite({
      anchor,
      hotspotId,
      imageUrl,
      radius,
      yOffset,
    });

    this.floatingHotspotLabels.push({
      anchor,
      element,
      yOffset,
      xrSprite,
    });
  }

  _createXrFloatingHotspotSprite({ anchor, hotspotId, imageUrl, radius = 0.07, yOffset = 0.12 }) {
    if (!anchor || !imageUrl) {
      return null;
    }

    const baseHeight = Math.max(0.28, Number(radius) * 5.2);
    let sprite = null;

    const texture = new THREE.TextureLoader().load(imageUrl, (loadedTexture) => {
      if (!sprite) {
        return;
      }

      const width = Number(loadedTexture.image?.naturalWidth ?? loadedTexture.image?.width ?? 0);
      const height = Number(loadedTexture.image?.naturalHeight ?? loadedTexture.image?.height ?? 0);
      if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) {
        return;
      }

      const aspect = width / height;
      sprite.scale.set(baseHeight * aspect, baseHeight, 1);
    });
    texture.colorSpace = THREE.SRGBColorSpace;

    const material = new THREE.SpriteMaterial({
      map: texture,
      transparent: true,
      depthTest: false,
      depthWrite: false,
      toneMapped: false,
    });

    sprite = new THREE.Sprite(material);
    sprite.name = `${hotspotId}-xr-floating-label`;
    sprite.position.set(0, yOffset, 0);
    sprite.scale.set(baseHeight * 1.2, baseHeight, 1);
    sprite.renderOrder = 3;
    sprite.visible = this.renderer.xr.isPresenting;
    sprite.userData.interaction = {
      name: hotspotId,
      maxDistance: Number(this._getHotspotConfig(hotspotId)?.interactionMaxDistance ?? HOTSPOT_INTERACTION_MAX_DISTANCE),
      metadata: {
        type: 'hotspot-floating-label',
        hotspotId,
      },
    };
    sprite.userData.isHotspotPickable = true;

    anchor.add(sprite);
    this.pickableMeshes.push(sprite);

    return sprite;
  }

  _clearFloatingHotspotLabels() {
    for (const label of this.floatingHotspotLabels) {
      label.element?.remove();

      if (label.xrSprite) {
        label.xrSprite.parent?.remove(label.xrSprite);
        label.xrSprite.material?.map?.dispose?.();
        label.xrSprite.material?.dispose?.();
      }
    }
    this.floatingHotspotLabels = [];
  }

  _getPlanarDistanceToPosition(position) {
    if (!position || !this.playerRig) {
      return null;
    }

    const dx = position.x - this.playerRig.position.x;
    const dz = position.z - this.playerRig.position.z;
    return Math.hypot(dx, dz);
  }

  _showInteractionDistanceHint(targetLabel, distance, maxDistance) {
    const safeLabel = targetLabel || 'object';
    this.uiController.setHotspotHelperHint(
      `Move closer to the ${safeLabel}. Current ${distance.toFixed(2)}, max ${maxDistance.toFixed(2)}.`,
      2200,
    );
  }

  _isWithinInteractionDistance(anchor, maxDistance, targetLabel) {
    if (!anchor || !Number.isFinite(maxDistance)) {
      return true;
    }

    const worldPosition = new THREE.Vector3();
    anchor.getWorldPosition(worldPosition);
    const distance = this._getPlanarDistanceToPosition(worldPosition);
    if (!Number.isFinite(distance) || distance <= maxDistance) {
      return true;
    }

    this._showInteractionDistanceHint(targetLabel, distance, maxDistance);
    return false;
  }

  _updateFloatingHotspotLabels() {
    if (!this.camera || this.floatingHotspotLabels.length === 0) {
      return;
    }

    const width = window.innerWidth;
    const height = window.innerHeight;
    const xrPresenting = this.renderer.xr.isPresenting;

    for (const label of this.floatingHotspotLabels) {
      if (!label.anchor?.parent || !label.element) {
        if (label.xrSprite) {
          label.xrSprite.visible = false;
        }
        continue;
      }

      if (label.xrSprite) {
        label.xrSprite.visible = xrPresenting;
      }

      if (xrPresenting) {
        label.element.classList.add('hidden');
        continue;
      }

      label.anchor.getWorldPosition(this.labelProjection);
      this.labelProjection.y += label.yOffset;
      this.labelProjection.project(this.camera);

      const isBehindCamera = this.labelProjection.z < -1 || this.labelProjection.z > 1;
      const isOffscreen =
        this.labelProjection.x < -1.05 ||
        this.labelProjection.x > 1.05 ||
        this.labelProjection.y < -1.05 ||
        this.labelProjection.y > 1.05;

      if (isBehindCamera || isOffscreen) {
        label.element.classList.add('hidden');
        continue;
      }

      const x = (this.labelProjection.x * 0.5 + 0.5) * width;
      const y = (-this.labelProjection.y * 0.5 + 0.5) * height;

      label.element.classList.remove('hidden');
      label.element.style.left = `${x}px`;
      label.element.style.top = `${y}px`;
    }
  }

  _setupGameplaySystems() {
    let maxPositiveClamp;
    if (this._isUndergroundScene()) {
      maxPositiveClamp = UNDERGROUND_MAX_POSITIVE_CLAMP;
    } else if (this._isMuseumScene()) {
      maxPositiveClamp = MUSEUM_MAX_POSITIVE_CLAMP;
    } else {
      maxPositiveClamp = CHURCH_MAX_POSITIVE_CLAMP;
    }
    const preferredCollisionIds = new Set(this.metadata.scene?.collision?.preferredMeshIds ?? []);
    const collisionEntries = this.meshEntries.filter((entry) => preferredCollisionIds.has(entry.asset.id));
    const useUndergroundFallbackOnly = this._isUndergroundScene() && collisionEntries.length === 0 && this.meshEntries.length <= 2;
    const chosenEntries = useUndergroundFallbackOnly
      ? []
      : collisionEntries.length > 0
        ? collisionEntries
        : this.meshEntries;

    this.collisionSystem = new CollisionSystem({
      scene: this.scene,
      debugEnabled: Boolean(this.metadata.debug?.collision),
      walkBoundary: this._isUndergroundScene() ? UNDERGROUND_WALK_BOUNDARY : null,
      maxPositiveClamp,
      floorRegions: this._isUndergroundScene() ? UNDERGROUND_FLOOR_REGIONS : null,
    });
    this.collisionSystem.buildFromMeshes(chosenEntries);
    const fallbackBounds = this._computeSceneFallbackBounds();

    this.collisionSystem.setFallbackBounds(fallbackBounds);

    this.playerController = new PlayerController({
      camera: this.camera,
      rig: this.playerRig,
      renderer: this.renderer,
      uiController: this.uiController,
      playerConfig: this.metadata.player,
      mobileMode: this.mobileMode,
      mobileRefs: {
        moveStickZone: this.refs.moveStickZone,
        moveStickThumb: this.refs.moveStickThumb,
      },
    });

    this.playerController.setMobileMode(this.mobileMode);

    const spawnPoint = this._computeSpawnPoint();
    this.playerController.setFeetPosition(spawnPoint);
    const spawnYaw = this._isUndergroundScene()
      ? Math.PI / 2
      : this.requestedSpawnOverride
        ? 0
        : -Math.PI / 2;
    this.camera.rotation.set(0, spawnYaw, 0);
    this.uiController.setPlayerCoordinates(this.playerRig.position);

    this.interactionSystem?.dispose?.();
    this.interactionSystem = new InteractionSystem({
      camera: this.camera,
      renderer: this.renderer,
      domElement: this.renderer.domElement,
      uiController: this.uiController,
      registry: this.interactionRegistry,
      getPickables: () => this.pickableMeshes,
      getPlayerPosition: () => this.playerRig.position,
    });
    this.uiController.hideInteraction();
  }

  _computeWorldBounds() {
    const bounds = new THREE.Box3();
    for (const { root } of this.meshEntries) {
      bounds.expandByObject(root, true);
    }

    if (bounds.isEmpty()) {
      bounds.set(new THREE.Vector3(-8, 0, -8), new THREE.Vector3(8, 5, 8));
    }

    if (!Number.isFinite(bounds.min.y)) {
      bounds.min.y = 0;
    }

    return bounds;
  }

  _computeSceneFallbackBounds() {
    if (this._isUndergroundScene()) {
      return new THREE.Box3(
        new THREE.Vector3(...UNDERGROUND_FALLBACK_BOUNDS.min),
        new THREE.Vector3(...UNDERGROUND_FALLBACK_BOUNDS.max),
      );
    }

    if (this._isMuseumScene()) {
      return new THREE.Box3(
        new THREE.Vector3(...MUSEUM_FALLBACK_BOUNDS.min),
        new THREE.Vector3(...MUSEUM_FALLBACK_BOUNDS.max),
      );
    }

    return this._computeWorldBounds();
  }

  _computeSpawnPoint() {
    if (this._isUndergroundScene()) {
      return new THREE.Vector3(...UNDERGROUND_SPAWN_POINT);
    }

    if (this.requestedSpawnOverride) {
      return this.requestedSpawnOverride.clone();
    }

    if (this._isMuseumScene()) {
      return new THREE.Vector3(...MUSEUM_SPAWN_POINT);
    }

    return new THREE.Vector3(-4.04, -0.32, -0.04);
  }

  _readZipOverrideFromUrl() {
    const params = new URLSearchParams(window.location.search);
    const zipOverride = (params.get('zip') || '').trim();
    return zipOverride || null;
  }

  _readSpawnOverrideFromUrl() {
    const params = new URLSearchParams(window.location.search);
    const raw = (params.get('spawn') || '').trim();
    if (!raw) {
      return null;
    }

    const parts = raw.split(',').map((value) => Number(value.trim()));
    if (parts.length !== 3 || parts.some((value) => !Number.isFinite(value))) {
      return null;
    }

    return new THREE.Vector3(parts[0], parts[1], parts[2]);
  }

  _isUndergroundScene() {
    const zipSource = String(
      this.requestedZipOverride || this.metadata?.scene?.source?.zipPath || '',
    ).toLowerCase();
    return zipSource.includes(UNDERGROUND_ZIP_NAME);
  }

  _isMuseumScene() {
    if (this.requestedScene === 'museum') {
      return true;
    }

    const zipSource = String(
      this.requestedZipOverride || this.metadata?.scene?.source?.zipPath || '',
    ).toLowerCase();
    return zipSource.includes(MUSEUM_ZIP_NAME);
  }

  _transferToChurch(spawnOverride = null) {
    if (!this._isUndergroundScene()) {
      return;
    }

    const nextUrl = new URL(window.location.href);
    nextUrl.searchParams.delete('zip');

    if (Array.isArray(spawnOverride) && spawnOverride.length === 3) {
      nextUrl.searchParams.set('spawn', spawnOverride.join(','));
    } else {
      nextUrl.searchParams.delete('spawn');
    }

    window.location.assign(nextUrl.toString());
  }

  _transferToUnderground() {
    if (this._isUndergroundScene()) {
      return;
    }

    const nextUrl = new URL(window.location.href);
    nextUrl.searchParams.delete('spawn');
    nextUrl.searchParams.set('zip', UNDERGROUND_ZIP_NAME);
    window.location.assign(nextUrl.toString());
  }

  _onGlobalKeyDown(event) {
    if (event.code === 'Escape' && this.expandedHotspotOverlay && !this.expandedHotspotOverlay.classList.contains('hidden')) {
      this._hideExpandedHotspotImage();
      return;
    }

    if (event.code !== 'KeyH' || event.repeat) {
      return;
    }

    void this._copyCurrentPositionAsHotspot();
  }

  async _copyCurrentPositionAsHotspot() {
    const position = this._getCrosshairHitPoint();
    if (!position) {
      this.uiController.setHotspotHelperHint('No surface under crosshair. Aim at the scene and press H again.', 2600);
      return;
    }

    const hotspot = `[${position.x.toFixed(3)}, ${position.y.toFixed(3)}, ${position.z.toFixed(3)}]`;

    try {
      if (!navigator.clipboard?.writeText) {
        throw new Error('clipboard-unavailable');
      }

      await navigator.clipboard.writeText(hotspot);
      this.uiController.setHotspotHelperHint(`Copied hotspot: ${hotspot}`, 2400);
    } catch {
      this.uiController.setHotspotHelperHint(`Hotspot: ${hotspot} (copy manually)`, 3000);
    }
  }

  _getCrosshairHitPoint() {
    if (!this.camera) {
      return null;
    }

    this.hotspotRaycaster.setFromCamera(CROSSHAIR_NDC, this.camera);

    const allHits = [];

    const roots = this.meshEntries.map((entry) => entry.root).filter(Boolean);
    if (roots.length > 0) {
      allHits.push(...this.hotspotRaycaster.intersectObjects(roots, true));
    }

    const splatRoots = this.splatEntries.map((entry) => entry.object).filter(Boolean);
    if (splatRoots.length > 0) {
      allHits.push(...this.hotspotRaycaster.intersectObjects(splatRoots, true));
    }

    if (allHits.length > 0) {
      allHits.sort((left, right) => left.distance - right.distance);
      return allHits[0].point.clone();
    }

    return this.hotspotRaycaster.ray.origin
      .clone()
      .addScaledVector(this.hotspotRaycaster.ray.direction, HOTSPOT_FALLBACK_DISTANCE);
  }

  applyQuality(value) {
    const preset = QUALITY_PRESETS[value] ?? QUALITY_PRESETS.auto;
    this.renderer.setPixelRatio(preset.pixelRatio());

    if (this.sparkRenderer && 'lodSplatScale' in this.sparkRenderer) {
      this.sparkRenderer.lodSplatScale = preset.splatLodScale;
    }

    this.onResize();
  }

  onResize() {
    const width = window.innerWidth;
    const height = window.innerHeight;

    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height, false);
    this._updateFloatingHotspotLabels();
  }

  _animate() {
    const dt = Math.min(0.05, this.clock.getDelta());

    if (this.playerController && this.collisionSystem) {
      this.playerController.update(dt, this.collisionSystem);
      this.uiController.setPlayerCoordinates(this.playerRig.position);
    }

    this._updateFloatingHotspotLabels();

    if (this.cardboard.active && !this.renderer.xr.isPresenting) {
      this._renderCardboardStereo();
    } else {
      this.renderer.render(this.scene, this.camera);
    }
  }
}
