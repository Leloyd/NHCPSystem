import * as THREE from 'three';
import { SplatMesh, SparkRenderer } from '/webxr/static/vendor/spark/spark.module.min.js';

const introSection = document.querySelector('.landing-intro');
const sceneContainer = document.getElementById('landingIntro3d');
const churchButton = document.getElementById('landingIntroChurch');
const statusElement = document.getElementById('landingIntroStatus');

const SPLAT_URL = '/static/models/landing/3DRuntime/church.spz';
const WEBXR_SCENE_API_URL = '/api/webxr/scene';
const WEBXR_PREFETCH_STORAGE_KEY = 'webxrSceneMetadataPrefetchV1';
const WEBXR_PREFETCH_MAX_AGE_MS = 8 * 60 * 1000;
const WEBXR_PREFETCH_CONCURRENCY = 4;
const CHURCH_HOTSPOT_YAW_DEGREES = -256;
const CHURCH_HOTSPOT_PITCH_DEGREES = -20;
const CHURCH_HOTSPOT_DISTANCE = 3;
const CHURCH_HOTSPOT_HEIGHT_OFFSET = -0.2;

if (!introSection || !sceneContainer || !statusElement) {
  throw new Error('Landing splat intro root elements were not found.');
}

function createChurchHotspotAnchor() {
  if (!scene || !camera) {
    return;
  }

  churchHotspotAnchor = new THREE.Object3D();
  hotspotForward
    .set(0, 0, -1)
    .applyEuler(
      new THREE.Euler(
        THREE.MathUtils.degToRad(CHURCH_HOTSPOT_PITCH_DEGREES),
        THREE.MathUtils.degToRad(CHURCH_HOTSPOT_YAW_DEGREES),
        0,
        'YXZ',
      ),
    )
    .applyQuaternion(camera.quaternion)
    .normalize();
  churchHotspotAnchor.position.copy(camera.position).addScaledVector(hotspotForward, CHURCH_HOTSPOT_DISTANCE);
  churchHotspotAnchor.position.y += CHURCH_HOTSPOT_HEIGHT_OFFSET;
  scene.add(churchHotspotAnchor);
}

let renderer = null;
let scene = null;
let camera = null;
let sparkRenderer = null;
let animationFrameId = 0;
let isDisposed = false;
let webxrPrefetchStarted = false;
let churchHotspotAnchor = null;
let churchHotspotEnabled = false;

const hotspotProjection = new THREE.Vector3();
const hotspotForward = new THREE.Vector3();

const lookState = {
  active: false,
  pointerId: null,
  lastX: 0,
  lastY: 0,
  yaw: -Math.PI * 0.5,
  pitch: -0.08,
};

const boundOnResize = onResize.bind(null);
const boundDispose = dispose.bind(null);
const boundPointerDown = onPointerDown.bind(null);
const boundPointerMove = onPointerMove.bind(null);
const boundPointerUp = onPointerUp.bind(null);

init();

async function init() {
  if (churchButton) {
    startWebxrPrefetch();
  }

  try {
    initScene();
    bindLookControls();
    onResize();
    animate();
    await loadSplat();
    introSection.classList.add('landing-intro--complete');
    showChurchButton();
    setStatus('');
  } catch (error) {
    console.error('[Landing Splat Intro] Failed to initialize intro viewer', error);
    setStatus('Could not load the 3D environment preview. You can still open the Church view.', true);
    showChurchButton();
  }
}

function setStatus(message, isError = false) {
  statusElement.textContent = message;
  statusElement.classList.toggle('is-error', Boolean(isError));
}

function showChurchButton() {
  if (!churchButton) {
    return;
  }

  churchHotspotEnabled = true;
  updateChurchHotspot();
}

function startWebxrPrefetch() {
  if (webxrPrefetchStarted || !window.fetch || !window.sessionStorage) {
    return;
  }

  webxrPrefetchStarted = true;

  fetch(WEBXR_SCENE_API_URL, {
    cache: 'no-store',
    credentials: 'same-origin',
  })
    .then((response) => {
      if (!response.ok) {
        throw new Error(`Metadata request failed (${response.status})`);
      }
      return response.json();
    })
    .then((metadata) => {
      if (!metadata || !metadata.scene) {
        return;
      }

      writePrefetchedWebxrMetadata(metadata);
      return prefetchWebxrAssets(collectWebxrPrefetchUrls(metadata));
    })
    .catch((error) => {
      console.warn('[WebXR Prefetch] Unable to warm runtime assets.', error);
    });
}

function writePrefetchedWebxrMetadata(metadata) {
  const now = Date.now();
  const payload = {
    version: 1,
    zipOverride: '',
    storedAt: now,
    expiresAt: now + WEBXR_PREFETCH_MAX_AGE_MS,
    metadata,
  };

  try {
    window.sessionStorage.setItem(WEBXR_PREFETCH_STORAGE_KEY, JSON.stringify(payload));
  } catch (error) {
    console.warn('[WebXR Prefetch] Unable to persist metadata in sessionStorage.', error);
  }
}

function collectWebxrPrefetchUrls(metadata) {
  const sceneMetadata = metadata && metadata.scene ? metadata.scene : {};
  const source = sceneMetadata.source || {};
  const assets = sceneMetadata.assets || {};
  const urls = [];

  if (typeof source.sparkModuleUrl === 'string' && source.sparkModuleUrl) {
    urls.push(source.sparkModuleUrl);
  }

  if (typeof source.generatedConfigUrl === 'string' && source.generatedConfigUrl) {
    urls.push(source.generatedConfigUrl);
  }

  [assets.splats, assets.meshes, assets.textures].forEach((group) => {
    if (!Array.isArray(group)) {
      return;
    }

    group.forEach((asset) => {
      if (asset && typeof asset.url === 'string' && asset.url) {
        urls.push(asset.url);
      }
    });
  });

  return urls.filter((url, index) => urls.indexOf(url) === index);
}

function prefetchWebxrAssets(urls) {
  if (!Array.isArray(urls) || urls.length === 0 || !window.fetch) {
    return Promise.resolve();
  }

  const pendingUrls = urls.slice();
  const workerCount = Math.min(WEBXR_PREFETCH_CONCURRENCY, pendingUrls.length);
  const workers = [];

  for (let index = 0; index < workerCount; index += 1) {
    workers.push(
      new Promise((resolve) => {
        const consumeNext = () => {
          const nextUrl = pendingUrls.shift();
          if (!nextUrl) {
            resolve();
            return;
          }

          prefetchSingleWebxrAsset(nextUrl).finally(consumeNext);
        };

        consumeNext();
      }),
    );
  }

  return Promise.allSettled(workers);
}

function prefetchSingleWebxrAsset(url) {
  return fetch(url, {
    cache: 'force-cache',
    credentials: 'same-origin',
  })
    .then((response) => {
      if (!response.ok) {
        throw new Error(`Asset request failed (${response.status})`);
      }
      return drainResponseBody(response);
    })
    .catch(() => null);
}

function drainResponseBody(response) {
  if (!response || !response.body || typeof response.body.getReader !== 'function') {
    return response.arrayBuffer().then(() => null, () => null);
  }

  const reader = response.body.getReader();

  const readChunk = () => reader.read().then((result) => {
    if (result.done) {
      return null;
    }

    return readChunk();
  });

  return readChunk();
}

function initScene() {
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x050404);

  camera = new THREE.PerspectiveCamera(72, 1, 0.01, 3000);
  camera.rotation.order = 'YXZ';
  camera.position.set(0, 1.6, 0);
  applyLookRotation();
  createChurchHotspotAnchor();

  renderer = new THREE.WebGLRenderer({
    antialias: true,
    alpha: true,
    powerPreference: 'high-performance',
  });

  if ('outputColorSpace' in renderer && THREE.SRGBColorSpace) {
    renderer.outputColorSpace = THREE.SRGBColorSpace;
  }

  renderer.setClearColor(0x000000, 0);
  sceneContainer.appendChild(renderer.domElement);
  introSection.style.touchAction = 'none';

  sparkRenderer = new SparkRenderer({
    renderer,
    maxStdDev: Math.sqrt(5),
  });
  sparkRenderer.name = 'landing-spark-renderer';
  scene.add(sparkRenderer);

  window.addEventListener('resize', boundOnResize);
  window.addEventListener('beforeunload', boundDispose);
}

async function loadSplat() {
  setStatus('Loading church environment...');

  const splat = new SplatMesh({
    url: SPLAT_URL,
    lod: true,
  });

  splat.name = 'landing-church-splat';
  scene.add(splat);

  await new Promise((resolve) => {
    window.requestAnimationFrame(() => {
      window.requestAnimationFrame(resolve);
    });
  });
}

function bindLookControls() {
  introSection.addEventListener('pointerdown', boundPointerDown);
  introSection.addEventListener('pointermove', boundPointerMove);
  introSection.addEventListener('pointerup', boundPointerUp);
  introSection.addEventListener('pointercancel', boundPointerUp);
  introSection.addEventListener('pointerleave', boundPointerUp);
}

function onPointerDown(event) {
  if (event.pointerType === 'mouse' && event.button !== 0) {
    return;
  }

  if (event.target instanceof Element && event.target.closest('a, button')) {
    return;
  }

  lookState.active = true;
  lookState.pointerId = event.pointerId;
  lookState.lastX = event.clientX;
  lookState.lastY = event.clientY;

  try {
    introSection.setPointerCapture(event.pointerId);
  } catch {
  }
}

function onPointerMove(event) {
  if (!lookState.active || event.pointerId !== lookState.pointerId) {
    return;
  }

  const deltaX = event.clientX - lookState.lastX;
  const deltaY = event.clientY - lookState.lastY;

  lookState.lastX = event.clientX;
  lookState.lastY = event.clientY;
  lookState.yaw -= deltaX * 0.0055;
  lookState.pitch = THREE.MathUtils.clamp(lookState.pitch - deltaY * 0.0042, -Math.PI * 0.48, Math.PI * 0.48);
  applyLookRotation();
}

function onPointerUp(event) {
  if (!lookState.active || event.pointerId !== lookState.pointerId) {
    return;
  }

  lookState.active = false;
  lookState.pointerId = null;

  try {
    introSection.releasePointerCapture(event.pointerId);
  } catch {
  }
}

function applyLookRotation() {
  if (!camera) {
    return;
  }

  camera.rotation.y = lookState.yaw;
  camera.rotation.x = lookState.pitch;
}

function animate() {
  if (isDisposed) {
    return;
  }

  animationFrameId = window.requestAnimationFrame(animate);
  updateChurchHotspot();
  renderer.render(scene, camera);
}

function updateChurchHotspot() {
  if (!churchButton) {
    return;
  }

  if (!churchHotspotEnabled || !churchHotspotAnchor || !camera) {
    churchButton.classList.add('hidden');
    return;
  }

  churchHotspotAnchor.getWorldPosition(hotspotProjection);
  hotspotProjection.project(camera);

  const isBehindCamera = hotspotProjection.z < -1 || hotspotProjection.z > 1;
  const isOffscreen =
    hotspotProjection.x < -1.05 ||
    hotspotProjection.x > 1.05 ||
    hotspotProjection.y < -1.05 ||
    hotspotProjection.y > 1.05;

  if (isBehindCamera || isOffscreen) {
    churchButton.classList.add('hidden');
    return;
  }

  const x = (hotspotProjection.x * 0.5 + 0.5) * window.innerWidth;
  const y = (-hotspotProjection.y * 0.5 + 0.5) * window.innerHeight;

  churchButton.classList.remove('hidden');
  churchButton.style.left = `${x}px`;
  churchButton.style.top = `${y}px`;
}

function onResize() {
  if (!renderer || !camera) {
    return;
  }

  const width = Math.max(sceneContainer.clientWidth, 1);
  const height = Math.max(sceneContainer.clientHeight, 1);

  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, window.innerWidth < 768 ? 1.2 : 1.6));
  renderer.setSize(width, height, false);
  camera.aspect = width / height;
  camera.updateProjectionMatrix();
  updateChurchHotspot();
}

function dispose() {
  if (isDisposed) {
    return;
  }

  isDisposed = true;

  window.removeEventListener('resize', boundOnResize);
  window.removeEventListener('beforeunload', boundDispose);
  introSection.removeEventListener('pointerdown', boundPointerDown);
  introSection.removeEventListener('pointermove', boundPointerMove);
  introSection.removeEventListener('pointerup', boundPointerUp);
  introSection.removeEventListener('pointercancel', boundPointerUp);
  introSection.removeEventListener('pointerleave', boundPointerUp);

  if (animationFrameId) {
    window.cancelAnimationFrame(animationFrameId);
  }

  if (scene && sparkRenderer) {
    scene.remove(sparkRenderer);
  }

  if (scene && churchHotspotAnchor) {
    scene.remove(churchHotspotAnchor);
    churchHotspotAnchor = null;
  }

  if (renderer) {
    renderer.dispose();
    if (renderer.domElement && renderer.domElement.parentNode === sceneContainer) {
      sceneContainer.removeChild(renderer.domElement);
    }
  }
}
