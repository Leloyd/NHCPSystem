import { WebXRApp } from './app/webxr-app.js';

function getRefs() {
  return {
    root: document.getElementById('app-root'),
    loadingOverlay: document.getElementById('loading-overlay'),
    loadingProgress: document.getElementById('loading-progress'),
    loadingText: document.getElementById('loading-text'),
    errorBanner: document.getElementById('error-banner'),
    xrButtonContainer: document.getElementById('xr-button-container'),
    xrStatus: document.getElementById('xr-status'),
    fullscreenButton: document.getElementById('control-fullscreen-button'),
    gyroButton: document.getElementById('control-gyro-button'),
    cardboardButton: document.getElementById('control-cardboard-button'),
    backButton: document.getElementById('control-back-button'),
    interactionPanel: document.getElementById('interaction-panel'),
    interactionName: document.getElementById('interaction-name'),
    interactionMeta: document.getElementById('interaction-meta'),
    positionDebugPanel: document.getElementById('position-debug-panel'),
    positionDebugValue: document.getElementById('position-debug-value'),
    positionDebugCopy: document.getElementById('position-debug-copy'),
    positionDebugCopyLabel: document.getElementById('position-debug-copy-label'),
    mobileControls: document.getElementById('mobile-controls'),
    moveStickZone: document.getElementById('move-stick-zone'),
    moveStickThumb: document.getElementById('move-stick-thumb'),
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
