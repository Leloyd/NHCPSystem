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
const CHURCH_FLOATING_LABEL_IMAGES = {};
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
const XR_SESSION_MODE_AR = 'immersive-ar';
const XR_SESSION_MODE_VR = 'immersive-vr';

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
    this.activeXrReferenceSpaceType = null;

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
    });

    this.uiController.setMobileControlsVisible(true);
    this.uiController.setFullscreenState(Boolean(document.fullscreenElement));

    // Gyro "magic window" is the look-around fallback for phones without
    // WebXR (every iOS browser). Only offered where motion sensors exist.
    const gyroCapable = typeof window.DeviceOrientationEvent !== 'undefined'
      && (this.mobileMode || Boolean(window.matchMedia?.('(pointer: coarse)')?.matches));
    this.uiController.setGyroVisible(gyroCapable);
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
    if (this.requestedZipOverride) {
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
    if (this.requestedZipOverride) {
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

      if (splatObject && splatObject.initialized && typeof splatObject.initialized.then === 'function') {
        await splatObject.initialized;
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
    return this._isUndergroundScene()
      ? UNDERGROUND_HOTSPOT_MARKERS
      : CHURCH_HOTSPOT_MARKERS;
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
        : null;
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
    const maxPositiveClamp = this._isUndergroundScene()
      ? UNDERGROUND_MAX_POSITIVE_CLAMP
      : CHURCH_MAX_POSITIVE_CLAMP;
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

    return this._computeWorldBounds();
  }

  _computeSpawnPoint() {
    if (this._isUndergroundScene()) {
      return new THREE.Vector3(...UNDERGROUND_SPAWN_POINT);
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

    this.renderer.render(this.scene, this.camera);
  }
}
