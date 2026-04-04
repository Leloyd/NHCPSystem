import { WebXRApp } from './app/webxr-app.js';

function getRefs() {
  return {
    root: document.getElementById('app-root'),
    crosshair: document.getElementById('crosshair'),
    loadingOverlay: document.getElementById('loading-overlay'),
    loadingProgress: document.getElementById('loading-progress'),
    loadingText: document.getElementById('loading-text'),
    errorBanner: document.getElementById('error-banner'),
    xrButtonContainer: document.getElementById('xr-button-container'),
    xrStatus: document.getElementById('xr-status'),
    pointerLockButton: document.getElementById('pointer-lock-button'),
    playerCoordinates: document.getElementById('player-coordinates'),
    hotspotHelper: document.getElementById('hotspot-helper'),
    qualitySelect: document.getElementById('quality-select'),
    debugCollisionToggle: document.getElementById('debug-collision-toggle'),
    interactionPanel: document.getElementById('interaction-panel'),
    interactionName: document.getElementById('interaction-name'),
    interactionMeta: document.getElementById('interaction-meta'),
    mobileControls: document.getElementById('mobile-controls'),
    leftStickZone: document.getElementById('left-stick-zone'),
    leftStickThumb: document.getElementById('left-stick-thumb'),
    rightStickZone: document.getElementById('right-stick-zone'),
    rightStickThumb: document.getElementById('right-stick-thumb'),
    mobileJumpButton: document.getElementById('mobile-jump-button'),
    mobileSprintButton: document.getElementById('mobile-sprint-button'),
  };
}

async function bootstrap() {
  const refs = getRefs();
  const app = new WebXRApp({
    container: refs.root,
    refs,
  });

  await app.init();
}

bootstrap().catch((error) => {
  console.error('Boot error:', error);
});
