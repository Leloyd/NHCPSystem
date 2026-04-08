import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { VRButton } from 'three/addons/webxr/VRButton.js';

import { CollisionSystem } from './collision-system.js';
import { InteractionRegistry } from './interaction-registry.js';
import { InteractionSystem } from './interaction-system.js';
import { PlayerController } from './player-controller.js';
import { UiController } from './ui-controller.js';
import { applyAssetTransform, isMobileLikeDevice } from './utils.js';

const DEFAULT_BG = 0x0f1114;
const CROSSHAIR_NDC = new THREE.Vector2(0, 0);
const HOTSPOT_FALLBACK_DISTANCE = 5.0;
const UNDERGROUND_ZIP_NAME = 'underground.zip';
const WEBXR_PREFETCH_STORAGE_KEY = 'webxrSceneMetadataPrefetchV1';
const WEBXR_PREFETCH_MAX_AGE_MS = 8 * 60 * 1000;
const CHURCH_RETURN_SPAWN = [-3.7, -0.32, 2.5];
const CHURCH_MAX_POSITIVE_CLAMP = { x: 2.5, z: 2.5 };
const UNDERGROUND_MAX_POSITIVE_CLAMP = { x: 3.5, z: 2.5 };
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
    position: [-2.598, 0.438, -2.459],
    color: 0x8fd3ff,
    radius: 0.07,
  },
];
const UNDERGROUND_HOTSPOT_MARKERS = [
  {
    id: 'go-back-to-church',
    position: [3.5, 1.136, 0],
    color: 0x8fd3ff,
    radius: 0.07,
  },
];
const CHURCH_FLOATING_LABEL_IMAGES = {
  'hotspot-1': '/webxr/images/IMG_2628.jpg',
};
const CHURCH_HOTSPOT_INFO_TEXT = {
  'hotspot-1':
    'Sample exhibit: glazed azulejo tilework from Philippine heritage craftsmanship, often used for decorative floors and wall accents in historic structures.',
};
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

export class WebXRApp {
  constructor({ container, refs }) {
    this.container = container;
    this.refs = refs;

    this.metadata = null;
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
    this.expandedHotspotOverlayDescription = null;

    this.sparkRenderer = null;
    this.SplatMeshCtor = null;

    this.interactionRegistry = new InteractionRegistry();

    this.uiController = new UiController(this.refs);
    this.mobileMode = isMobileLikeDevice();

    this.playerController = null;
    this.collisionSystem = null;
    this.interactionSystem = null;

    this.boundResize = this.onResize.bind(this);
    this.boundGlobalKeyDown = this._onGlobalKeyDown.bind(this);
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
      this.uiController.setDebugCollision(Boolean(this.metadata.debug?.collision));

      const quality = this.metadata.quality?.default ?? 'auto';
      this.uiController.setQuality(quality);
      this.applyQuality(quality);

      await this._loadSparkRuntime();
      await this._loadSceneAssets();
      this._createHotspotMarkers();
      this._setupGameplaySystems();

      this.uiController.completeLoading('Scene ready.');

      window.addEventListener('resize', this.boundResize);
      window.addEventListener('keydown', this.boundGlobalKeyDown);
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
      onPointerLockRequested: () => this.playerController?.requestPointerLock(),
      onQualityChanged: (quality) => this.applyQuality(quality),
      onDebugCollisionChanged: (enabled) => this.collisionSystem?.setDebugEnabled(enabled),
    });

    this.uiController.setMobileControlsVisible(this.mobileMode);
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

    const image = document.createElement('img');
    image.className = 'hotspot-image-overlay-image';
    image.alt = '';

    const caption = document.createElement('p');
    caption.className = 'hotspot-image-overlay-caption';

    const toggleInfoButton = document.createElement('button');
    toggleInfoButton.type = 'button';
    toggleInfoButton.className = 'hotspot-image-overlay-toggle hidden';
    toggleInfoButton.textContent = 'Show info';

    const description = document.createElement('p');
    description.className = 'hotspot-image-overlay-description hidden';

    panel.append(closeButton, image, caption, toggleInfoButton, description);
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

      const shouldShow = description.classList.contains('hidden');
      description.classList.toggle('hidden', !shouldShow);
      toggleInfoButton.textContent = shouldShow ? 'Hide info' : 'Show info';
    });

    this.expandedHotspotOverlay = overlay;
    this.expandedHotspotOverlayImage = image;
    this.expandedHotspotOverlayCaption = caption;
    this.expandedHotspotOverlayToggle = toggleInfoButton;
    this.expandedHotspotOverlayDescription = description;
  }

  _showExpandedHotspotImage(imageUrl, hotspotId) {
    if (!imageUrl) {
      return;
    }

    this._setupExpandedHotspotOverlay();
    if (!this.expandedHotspotOverlay || !this.expandedHotspotOverlayImage) {
      return;
    }

    this.expandedHotspotOverlayImage.src = imageUrl;
    this.expandedHotspotOverlayImage.alt = `${hotspotId} full image`;
    if (this.expandedHotspotOverlayCaption) {
      this.expandedHotspotOverlayCaption.textContent = String(hotspotId || '').replace(/-/g, ' ');
    }

    const infoText = CHURCH_HOTSPOT_INFO_TEXT[hotspotId] ?? '';
    if (this.expandedHotspotOverlayToggle && this.expandedHotspotOverlayDescription) {
      const hasInfoText = Boolean(infoText);
      this.expandedHotspotOverlayToggle.classList.toggle('hidden', !hasInfoText);
      this.expandedHotspotOverlayToggle.textContent = 'Show info';

      this.expandedHotspotOverlayDescription.textContent = infoText;
      this.expandedHotspotOverlayDescription.classList.add('hidden');
    }

    this.expandedHotspotOverlay.classList.remove('hidden');
  }

  _hideExpandedHotspotImage() {
    this.expandedHotspotOverlayDescription?.classList.add('hidden');
    if (this.expandedHotspotOverlayToggle) {
      this.expandedHotspotOverlayToggle.textContent = 'Show info';
    }

    this.expandedHotspotOverlay?.classList.add('hidden');
  }

  _setupLights() {
    const hemi = new THREE.HemisphereLight(0xffffff, 0x223344, 0.72);
    const key = new THREE.DirectionalLight(0xffffff, 0.45);
    key.position.set(5, 8, 5);
    this.scene.add(hemi, key);
  }

  _setupXrUi() {
    const button = VRButton.createButton(this.renderer, {
      optionalFeatures: ['local-floor', 'bounded-floor', 'hand-tracking'],
    });
    this.refs.xrButtonContainer?.appendChild(button);

    if (!navigator.xr) {
      this.uiController.setXrStatus('WebXR not available in this browser.');
      return;
    }

    navigator.xr
      .isSessionSupported('immersive-vr')
      .then((supported) => {
        this.uiController.setXrStatus(supported ? 'WebXR supported.' : 'WebXR unsupported on this device.');
      })
      .catch(() => {
        this.uiController.setXrStatus('WebXR capability check failed.');
      });

    this.renderer.xr.addEventListener('sessionstart', () => {
      this.uiController.setXrStatus('XR session started.');
    });
    this.renderer.xr.addEventListener('sessionend', () => {
      this.uiController.setXrStatus('XR session ended.');
    });
  }

  _registerInteractions() {
    this.interactionRegistry.register('door', () => {
      this._transferToUnderground();
    });

    this.interactionRegistry.register('go-back-to-church', () => {
      this._transferToChurch(CHURCH_RETURN_SPAWN);
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

    const query = this.requestedZipOverride
      ? `?zip=${encodeURIComponent(this.requestedZipOverride)}`
      : '';
    const response = await fetch(`/api/webxr/scene${query}`, { cache: 'no-store' });
    if (!response.ok) {
      throw new Error(`Could not load /api/webxr/scene (${response.status})`);
    }
    const payload = await response.json();
    this._storePrefetchedMetadata(payload);
    return payload;
  }

  _readPrefetchedMetadata() {
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
      updateProgress(`Loaded splat ${done}/${total}`);
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
      console.warn('[splat] Spark not available; skipping', asset.relativePath);
      return;
    }

    try {
      const splatObject = new this.SplatMeshCtor({
        url: asset.url,
        lod: true,
      });
      splatObject.name = asset.name || asset.fileName;
      applyAssetTransform(splatObject, asset.transform);
      this.scene.add(splatObject);

      this.splatEntries.push({
        asset,
        object: splatObject,
      });
    } catch (error) {
      console.warn(`[splat] failed to load ${asset.relativePath}`, error);
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
            metadata: {
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

  _createHotspotMarkers() {
    for (const marker of this.hotspotMarkers) {
      this.scene.remove(marker);
    }
    this.hotspotMarkers = [];
    this._clearFloatingHotspotLabels();
    this.pickableMeshes = this.pickableMeshes.filter((mesh) => !mesh.userData?.isHotspotPickable);

    const activeHotspots = this._isUndergroundScene()
      ? UNDERGROUND_HOTSPOT_MARKERS
      : CHURCH_HOTSPOT_MARKERS;

    for (const hotspot of activeHotspots) {
      const root = new THREE.Group();
      root.name = hotspot.id;
      root.position.set(hotspot.position[0], hotspot.position[1], hotspot.position[2]);

      const ring = new THREE.Mesh(
        new THREE.TorusGeometry(hotspot.radius * 1.1, hotspot.radius * 0.13, 12, 48),
        new THREE.MeshBasicMaterial({
          color: hotspot.color,
          transparent: true,
          opacity: 0.58,
          depthWrite: false,
        }),
      );
      ring.position.y = 0.02;
      ring.rotation.x = Math.PI / 2;

      const orb = new THREE.Mesh(
        new THREE.SphereGeometry(hotspot.radius * 0.42, 14, 14),
        new THREE.MeshStandardMaterial({
          color: 0xffffff,
          emissive: hotspot.color,
          emissiveIntensity: 0.48,
          roughness: 0.52,
          metalness: 0.0,
        }),
      );
      orb.position.y = hotspot.radius * 0.55;
      orb.castShadow = false;
      orb.receiveShadow = false;

      if (hotspot.id === 'go-back-to-church') {
        ring.name = `${hotspot.id}-ring`;
        orb.name = `${hotspot.id}-orb`;

        ring.userData.interaction = {
          name: hotspot.id,
          metadata: {
            type: 'hotspot',
            hotspotId: hotspot.id,
          },
        };
        orb.userData.interaction = {
          name: hotspot.id,
          metadata: {
            type: 'hotspot',
            hotspotId: hotspot.id,
          },
        };
        ring.userData.isHotspotPickable = true;
        orb.userData.isHotspotPickable = true;

        this.pickableMeshes.push(ring, orb);
      }

      root.add(ring, orb);
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

    this.floatingHotspotLabels.push({
      anchor,
      element,
      yOffset: Math.max(0.12, Number(radius) * 2.4),
    });
  }

  _clearFloatingHotspotLabels() {
    for (const label of this.floatingHotspotLabels) {
      label.element?.remove();
    }
    this.floatingHotspotLabels = [];
  }

  _updateFloatingHotspotLabels() {
    if (!this.camera || this.floatingHotspotLabels.length === 0) {
      return;
    }

    const width = window.innerWidth;
    const height = window.innerHeight;

    for (const label of this.floatingHotspotLabels) {
      if (!label.anchor?.parent || !label.element) {
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
    const maxPositiveClamp = this._isUndergroundScene()
      ? UNDERGROUND_MAX_POSITIVE_CLAMP
      : CHURCH_MAX_POSITIVE_CLAMP;

    this.collisionSystem = new CollisionSystem({
      scene: this.scene,
      debugEnabled: Boolean(this.metadata.debug?.collision),
      walkBoundary: this._isUndergroundScene() ? UNDERGROUND_WALK_BOUNDARY : null,
      maxPositiveClamp,
    });

    const preferredCollisionIds = new Set(this.metadata.scene?.collision?.preferredMeshIds ?? []);
    const collisionEntries = this.meshEntries.filter((entry) => preferredCollisionIds.has(entry.asset.id));

    const chosenEntries = collisionEntries.length > 0 ? collisionEntries : this.meshEntries;
    const collisionSummary = this.collisionSystem.buildFromMeshes(chosenEntries);

    if (collisionSummary.colliderCount === 0) {
      const fallbackBounds = this._computeWorldBounds();
      this.collisionSystem.setFallbackBounds(fallbackBounds);
    } else {
      const worldBounds = this._computeWorldBounds();
      this.collisionSystem.setFallbackBounds(worldBounds);
    }

    this.playerController = new PlayerController({
      camera: this.camera,
      rig: this.playerRig,
      renderer: this.renderer,
      uiController: this.uiController,
      playerConfig: this.metadata.player,
      mobileMode: this.mobileMode,
      mobileRefs: {
        leftStickZone: this.refs.leftStickZone,
        leftStickThumb: this.refs.leftStickThumb,
        rightStickZone: this.refs.rightStickZone,
        rightStickThumb: this.refs.rightStickThumb,
        mobileJumpButton: this.refs.mobileJumpButton,
        mobileSprintButton: this.refs.mobileSprintButton,
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
      pointerLockControls: this.playerController.controls,
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

  _computeSpawnPoint() {
    if (this._isUndergroundScene()) {
      return new THREE.Vector3(3.5, 0.10, 0);
    }

    if (this.requestedSpawnOverride) {
      return this.requestedSpawnOverride.clone();
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
      this.uiController.setHotspotHelperHint('No surface under crosshair. Aim at a mesh and press H again.', 2600);
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

    const roots = this.meshEntries.map((entry) => entry.root).filter(Boolean);
    if (roots.length > 0) {
      const hits = this.hotspotRaycaster.intersectObjects(roots, true);
      if (hits.length > 0) {
        return hits[0].point;
      }
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

    this.uiController.setQuality(value in QUALITY_PRESETS ? value : 'auto');
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

    this.renderer.render(this.scene, this.camera);
  }
}
