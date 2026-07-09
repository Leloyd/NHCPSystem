/* ==========================================================================
   Heritage Trail — Starting Point (/trail)
   - A 360 equirectangular panorama of the aerial view (Pannellum, no controls).
   - Ana Kalang (idle GLB) slides in from the right; greets on arrival, plays a
     heart gesture when tapped, gentle sway while narrating.
   - Bilingual narration (EN / Tagalog) with the landing page's control family.
   - Begin → the heritage trail (with a matching leave animation); Cancel → home.
   ========================================================================== */

import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

const root = document.getElementById('trailStart');
if (!root) throw new Error('[Trail] Starting-point markup not found.');

const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/* --- Narration -------------------------------------------------------------- */
const SCRIPT = {
  en: "This is where your journey begins. Before us lies the Nagcarlan Underground Cemetery, seen from above — the circular enclosure, the chapel, and the paths worn by centuries of passage. Look around, take it in. When you are ready, we will walk the trail together.",
  tl: "Dito magsisimula ang iyong paglalakbay. Sa harap natin ang Libingan sa Ilalim ng Lupa ng Nagcarlan, mula sa itaas — ang pabilog na pader, ang kapilya, at ang mga daanang ginugol ng mga siglo. Lumingon-lingon, damhin ito. Kapag handa ka na, sabay nating tatahakin ang landas.",
};

/* --- Refs & state ----------------------------------------------------------- */
const panoEl = document.getElementById('trailPano');
const curtain = root.querySelector('[data-trail-curtain]');
const canvasWrap = root.querySelector('[data-trail-canvas]');
const bubble = root.querySelector('[data-trail-bubble]');
const bubbleText = root.querySelector('[data-trail-text]');
const cursorGlow = root.querySelector('[data-trail-cursor]');
const playBtn = root.querySelector('[data-trail-play]');
const muteBtn = root.querySelector('[data-trail-mute]');
const langBtn = root.querySelector('[data-trail-lang]');
const subsBtn = root.querySelector('[data-trail-subs]');
const textSizeBtn = root.querySelector('[data-trail-textsize]');
const beginLink = root.querySelector('[data-trail-begin]');
const cancelLink = root.querySelector('[data-trail-cancel]');

const state = {
  lang: localStorage.getItem('anaGuideLang') === 'tl' ? 'tl' : 'en',
  muted: localStorage.getItem('anaGuideMuted') === 'true',
  subtitles: localStorage.getItem('anaGuideSubs') !== 'off',
  textSize: Math.min(3, Math.max(1, parseInt(localStorage.getItem('anaGuideTextSize') || '1', 10) || 1)),
  unlocked: false,
  playing: false,
  typeTimer: 0,
};

/* --- Arrival ---------------------------------------------------------------- */
// Whether we came here via the landing "Start Heritage Trail" exit.
let cameFromLanding = false;
try {
  cameFromLanding = sessionStorage.getItem('trailArrival') === '1';
  sessionStorage.removeItem('trailArrival');
} catch { /* private mode */ }

if (!cameFromLanding && curtain) curtain.style.transitionDelay = '0s';
window.requestAnimationFrame(() => {
  root.classList.add('is-entered');
  window.setTimeout(() => curtain && curtain.classList.add('is-lifted'), 60);
});

/* --- Speech (TTS until trail VO exists) ------------------------------------- */
const synth = 'speechSynthesis' in window ? window.speechSynthesis : null;
let voices = [];
function refreshVoices() { if (synth) voices = synth.getVoices() || []; }
if (synth) { refreshVoices(); synth.onvoiceschanged = refreshVoices; }
function pickVoice(lang) {
  if (!voices.length) refreshVoices();
  if (lang === 'tl') {
    return voices.find((v) => /fil|tl/i.test(v.lang)) ||
      voices.find((v) => /fil|tagalog|filipino/i.test(v.name)) ||
      voices.find((v) => /en/i.test(v.lang)) || voices[0];
  }
  return voices.find((v) => /en[-_]?(ph|us|gb)/i.test(v.lang)) || voices.find((v) => /^en/i.test(v.lang)) || voices[0];
}
function setPlaying(p) {
  state.playing = p;
  root.setAttribute('data-playing', String(p));
  playBtn?.setAttribute('aria-pressed', String(p));
}
function stopSpeaking() { if (synth) synth.cancel(); setPlaying(false); }
function speak(text) {
  if (!synth || state.muted || !state.unlocked) { setPlaying(false); return; }
  synth.cancel();
  const u = new SpeechSynthesisUtterance(text);
  const v = pickVoice(state.lang);
  if (v) u.voice = v;
  u.lang = state.lang === 'tl' ? (v && /fil|tl/i.test(v.lang) ? v.lang : 'fil-PH') : 'en-US';
  u.rate = 0.96; u.pitch = 1.05;
  u.onstart = () => setPlaying(true);
  u.onend = () => setPlaying(false);
  u.onerror = () => setPlaying(false);
  synth.speak(u);
}

/* --- Bubble (typewriter) ---------------------------------------------------- */
function renderBubble(text) {
  if (!bubbleText) return;
  window.clearInterval(state.typeTimer);
  if (prefersReducedMotion) { bubbleText.textContent = text; return; }
  bubbleText.textContent = '';
  const cursor = document.createElement('span');
  cursor.className = 'tx-cursor';
  cursor.textContent = ' ';
  bubbleText.appendChild(cursor);
  let i = 0;
  state.typeTimer = window.setInterval(() => {
    if (i >= text.length) { window.clearInterval(state.typeTimer); cursor.remove(); return; }
    cursor.before(document.createTextNode(text[i]));
    i += 1;
  }, 16);
}
function narrate({ speakIt } = {}) {
  const text = SCRIPT[state.lang] || SCRIPT.en;
  renderBubble(text);
  if (speakIt) speak(text);
  else stopSpeaking();
}

/* --- Controls --------------------------------------------------------------- */
function setMuted(m) {
  state.muted = m;
  localStorage.setItem('anaGuideMuted', String(m));
  root.setAttribute('data-muted', String(m));
  muteBtn?.setAttribute('aria-pressed', String(m));
  if (m) stopSpeaking();
}
function setLang(lang) {
  state.lang = lang;
  localStorage.setItem('anaGuideLang', lang);
  root.setAttribute('data-lang', lang);
  if (langBtn) langBtn.textContent = lang === 'tl' ? 'TL' : 'EN';
  narrate({ speakIt: state.unlocked && !state.muted });
}
function setSubtitles(on) {
  state.subtitles = on;
  localStorage.setItem('anaGuideSubs', on ? 'on' : 'off');
  root.setAttribute('data-subtitles', on ? 'on' : 'off');
  if (subsBtn) {
    subsBtn.setAttribute('aria-pressed', String(on));
    subsBtn.setAttribute('aria-label', on ? 'Hide subtitles' : 'Show subtitles');
  }
}

const TEXT_SIZE_LABELS = { 1: 'A', 2: 'A+', 3: 'A++' };
const TEXT_SIZE_NAMES = { 1: 'normal', 2: 'large', 3: 'extra large' };
function setTextSize(size) {
  state.textSize = size;
  localStorage.setItem('anaGuideTextSize', String(size));
  root.setAttribute('data-textsize', String(size));
  if (textSizeBtn) {
    textSizeBtn.textContent = TEXT_SIZE_LABELS[size];
    textSizeBtn.setAttribute('aria-label', `Text size: ${TEXT_SIZE_NAMES[size]}. Tap to ${size >= 3 ? 'reset' : 'enlarge'}`);
  }
}

function unlockAudio() {
  if (state.unlocked) return;
  state.unlocked = true;
  if (synth && !state.muted) synth.speak(new SpeechSynthesisUtterance(''));
}

root.setAttribute('data-lang', state.lang);
root.setAttribute('data-playing', 'false');
setMuted(state.muted);
setSubtitles(state.subtitles);
setTextSize(state.textSize);
if (langBtn) langBtn.textContent = state.lang === 'tl' ? 'TL' : 'EN';

playBtn?.addEventListener('click', () => {
  unlockAudio();
  if (state.playing) stopSpeaking();
  else narrate({ speakIt: !state.muted });
});
muteBtn?.addEventListener('click', () => setMuted(!state.muted));
langBtn?.addEventListener('click', () => setLang(state.lang === 'en' ? 'tl' : 'en'));
subsBtn?.addEventListener('click', () => setSubtitles(!state.subtitles));
textSizeBtn?.addEventListener('click', () => setTextSize(state.textSize >= 3 ? 1 : state.textSize + 1));

// Immersive toggle: slide the panels / Ana / controls out for a clean 360
// view; click again to slide them back in from the same side.
const immersiveBtn = root.querySelector('[data-trail-immersive]');
root.setAttribute('data-immersive', 'false');
immersiveBtn?.addEventListener('click', () => {
  const on = root.getAttribute('data-immersive') === 'true';
  root.setAttribute('data-immersive', on ? 'false' : 'true');
  immersiveBtn.setAttribute('aria-pressed', String(!on));
});

// First interaction anywhere unlocks TTS, then auto-narrates once.
const kickstart = () => {
  const wasLocked = !state.unlocked;
  unlockAudio();
  if (wasLocked && !state.muted) narrate({ speakIt: true });
  window.removeEventListener('pointerdown', kickstart, true);
  window.removeEventListener('keydown', kickstart, true);
};
window.addEventListener('pointerdown', kickstart, true);
window.addEventListener('keydown', kickstart, true);
window.addEventListener('pagehide', () => stopSpeaking());

/* --- Begin / Cancel with matching leave animation --------------------------- */
function leaveTo(url, mode) {
  stopSpeaking();
  if (prefersReducedMotion) { window.location.href = url; return; }
  if (mode === 'begin') {
    try { sessionStorage.setItem('trailArrival', '1'); } catch { /* ignore */ }
    root.classList.add('is-leaving');
    window.setTimeout(() => { window.location.href = url; }, 850);
  } else {
    curtain?.classList.remove('is-lifted');
    window.setTimeout(() => { window.location.href = url; }, 650);
  }
}
beginLink?.addEventListener('click', (e) => { e.preventDefault(); leaveTo(beginLink.getAttribute('href'), 'begin'); });
cancelLink?.addEventListener('click', (e) => { e.preventDefault(); leaveTo(cancelLink.getAttribute('href'), 'cancel'); });

/* --- 360 panorama (Pannellum, no controls, gentle auto-rotate) -------------- */
function initPanorama() {
  const src = root.getAttribute('data-panorama') || '';
  if (!src || !window.pannellum || !panoEl) return;

  // Starting view: set data-yaw / data-pitch on #trailStart in the template.
  // Yaw is horizontal (-180..180), pitch is up/down. Drag around and check
  // the console — the current view is logged after every drag, so you can
  // pick a starting direction and copy its numbers into the attributes.
  const startYaw = parseFloat(root.getAttribute('data-yaw')) || 0;
  const startPitch = parseFloat(root.getAttribute('data-pitch')) || 0;

  const build = (finalSrc) => {
    try {
      const viewer = window.pannellum.viewer('trailPano', {
        type: 'equirectangular',
        panorama: finalSrc,
        autoLoad: true,
        showControls: false,
        showZoomCtrl: false,
        showFullscreenCtrl: false,
        keyboardZoom: false,
        mouseZoom: false,
        draggable: true,
        compass: false,
        autoRotate: prefersReducedMotion ? 0 : -1.4,
        autoRotateInactivityDelay: 3500,
        hfov: 100,
        minHfov: 70,
        maxHfov: 118,
        pitch: startPitch,
        yaw: startYaw,
      });
      // Helper for picking the starting view: log where the visitor is
      // looking after each drag ends.
      const logView = () => {
        try {
          console.info(`[Trail] view → data-yaw="${viewer.getYaw().toFixed(1)}" data-pitch="${viewer.getPitch().toFixed(1)}"`);
        } catch { /* viewer not ready */ }
      };
      panoEl.addEventListener('mouseup', logView);
      panoEl.addEventListener('touchend', logView);
      window.setTimeout(() => panoEl.classList.add('is-ready'), 250);
    } catch (err) {
      console.warn('[Trail] Panorama failed to initialize:', err);
    }
  };

  // Downscale huge images to the GPU's safe texture size (like the site map).
  const img = new Image();
  img.decoding = 'async';
  img.onload = () => {
    let limit = 4096;
    try {
      const gl = document.createElement('canvas').getContext('webgl') ||
        document.createElement('canvas').getContext('experimental-webgl');
      if (gl) limit = Math.min(limit, gl.getParameter(gl.MAX_TEXTURE_SIZE) || 4096);
    } catch { /* keep default */ }
    const longest = Math.max(img.naturalWidth, img.naturalHeight);
    if (longest <= limit) { build(src); return; }
    const scale = limit / longest;
    const c = document.createElement('canvas');
    c.width = Math.round(img.naturalWidth * scale);
    c.height = Math.round(img.naturalHeight * scale);
    const ctx = c.getContext('2d', { alpha: false });
    if (!ctx) { build(src); return; }
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(img, 0, 0, c.width, c.height);
    build(c.toDataURL('image/jpeg', 0.92));
  };
  img.onerror = () => build(src);
  img.src = src;
}

/* --- Cursor glow ------------------------------------------------------------- */
if (cursorGlow && !prefersReducedMotion) {
  const pos = { x: innerWidth / 2, y: innerHeight / 2 };
  const goal = { ...pos };
  let moved = false;
  window.addEventListener('pointermove', (e) => {
    goal.x = e.clientX; goal.y = e.clientY;
    if (!moved) { moved = true; cursorGlow.classList.add('is-on'); }
  }, { passive: true });
  const follow = () => {
    pos.x += (goal.x - pos.x) * 0.16;
    pos.y += (goal.y - pos.y) * 0.16;
    cursorGlow.style.transform = `translate3d(${pos.x}px, ${pos.y}px, 0)`;
    window.requestAnimationFrame(follow);
  };
  follow();
}

/* --- Ana's 3D stage ---------------------------------------------------------- */
function initCharacter() {
  if (!canvasWrap) return;
  const modelUrl = root.getAttribute('data-model-url') || '';
  const BASE_ROT_Y = -Math.PI / 2; // GLB authored facing screen-right → face camera
  const mobile = window.matchMedia('(max-width: 820px)').matches;
  const ANA_REST_X = mobile ? 0.55 : 1.15; // world-space resting X (right side)
  const CAM_LOOK_X = ANA_REST_X * 0.2;     // frame her without pushing her off-edge
  let renderer, scene, camera, mixer, clock, avatar;
  let idleAction = null;
  let gestureAction = null;
  let gestureFadingBack = false;
  let slideT = prefersReducedMotion ? 1 : 0; // 0→1 entrance slide progress
  const gestures = {};
  const pointer = { x: 0, y: 0 };

  // Publish Ana's on-screen X (%) so the bubble + glow center on her. Runs
  // every frame with her LIVE position, so it stays glued to the model even
  // through the slide-in and camera parallax.
  const anaProbe = new THREE.Vector3();
  const projectAnaX = (worldX) => {
    if (!camera) return;
    anaProbe.set(typeof worldX === 'number' ? worldX : ANA_REST_X, 1.0, 0);
    anaProbe.project(camera);
    const pct = Math.min(92, Math.max(8, (anaProbe.x * 0.5 + 0.5) * 100));
    root.style.setProperty('--tx-ana-x', `${pct.toFixed(1)}%`);
  };

  try {
    scene = new THREE.Scene();
    const w = Math.max(canvasWrap.clientWidth, 1);
    const h = Math.max(canvasWrap.clientHeight, 1);
    camera = new THREE.PerspectiveCamera(32, w / h, 0.1, 100);
    camera.position.set(0, 1.5, 3.1);
    camera.lookAt(CAM_LOOK_X, 1.35, 0);

    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.8));
    renderer.setSize(w, h, false);
    if ('outputColorSpace' in renderer && THREE.SRGBColorSpace) renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.05;
    canvasWrap.appendChild(renderer.domElement);

    scene.add(new THREE.HemisphereLight(0xffe9c8, 0x21160c, 1.0));
    const key = new THREE.DirectionalLight(0xffd9a6, 1.6);
    key.position.set(2.5, 4, 3);
    scene.add(key);
    const rim = new THREE.DirectionalLight(0xd4af6a, 0.85);
    rim.position.set(-3, 2, -2);
    scene.add(rim);

    clock = new THREE.Clock();

    const onResize = () => {
      const nw = Math.max(canvasWrap.clientWidth, 1);
      const nh = Math.max(canvasWrap.clientHeight, 1);
      renderer.setSize(nw, nh, false);
      camera.aspect = nw / nh;
      camera.updateProjectionMatrix();
      projectAnaX();
    };
    window.addEventListener('resize', onResize);
    projectAnaX();
    if (!prefersReducedMotion) {
      window.addEventListener('pointermove', (e) => {
        pointer.x = (e.clientX / innerWidth) * 2 - 1;
        pointer.y = (e.clientY / innerHeight) * 2 - 1;
      }, { passive: true });
    }

    const playGesture = (name) => {
      const action = gestures[name];
      if (!action || !idleAction || (gestureAction && gestureAction.isRunning())) return;
      gestureAction = action;
      gestureFadingBack = false;
      action.reset().play();
      idleAction.crossFadeTo(action, 0.4, false);
    };

    const animate = () => {
      window.requestAnimationFrame(animate);
      const dt = Math.min(clock.getDelta(), 0.05);
      if (mixer) {
        if (gestureAction && idleAction && gestureAction.isRunning() && !gestureFadingBack &&
            gestureAction.getClip().duration - gestureAction.time <= 0.6) {
          gestureFadingBack = true;
          idleAction.reset().play();
          gestureAction.crossFadeTo(idleAction, 0.6, false);
        }
        mixer.update(dt);
      }
      if (avatar) {
        // Entrance: glide in from off-screen right to her resting spot.
        if (slideT < 1) slideT = Math.min(1, slideT + dt / 1.3);
        const ease = 1 - Math.pow(1 - slideT, 3); // easeOutCubic
        const sway = state.playing && !prefersReducedMotion ? Math.sin(clock.elapsedTime * 1.4) * 0.05 : 0;
        avatar.position.x = ANA_REST_X + (1 - ease) * 2.6;
        avatar.rotation.y = BASE_ROT_Y + sway;
      }
      if (!prefersReducedMotion) {
        camera.position.x += (CAM_LOOK_X + pointer.x * 0.08 - camera.position.x) * Math.min(1, dt * 2);
        camera.position.y += (1.5 - pointer.y * 0.05 - camera.position.y) * Math.min(1, dt * 2);
      }
      camera.lookAt(CAM_LOOK_X, 1.35, 0);
      if (avatar) projectAnaX(avatar.position.x); // keep bubble/glow centered on her
      renderer.render(scene, camera);
    };
    animate();

    if (modelUrl) {
      const loader = new GLTFLoader();
      loader.load(modelUrl, (gltf) => {
        const model = gltf.scene || (gltf.scenes && gltf.scenes[0]);
        if (!model) return;
        model.traverse((o) => { if (o.isMesh || o.isSkinnedMesh) o.frustumCulled = false; });
        const box = new THREE.Box3().setFromObject(model);
        const size = new THREE.Vector3(); const center = new THREE.Vector3();
        box.getSize(size); box.getCenter(center);
        const scale = size.y > 0 ? 2.0 / size.y : 1;
        model.scale.setScalar(scale);
        model.position.x -= center.x * scale;
        model.position.z -= center.z * scale;
        model.position.y -= box.min.y * scale;
        avatar = new THREE.Group();
        avatar.add(model);
        avatar.rotation.y = BASE_ROT_Y;
        avatar.position.x = ANA_REST_X + (prefersReducedMotion ? 0 : 2.6); // start off-right
        scene.add(avatar);

        if (gltf.animations && gltf.animations.length) {
          mixer = new THREE.AnimationMixer(model);
          idleAction = mixer.clipAction(gltf.animations[0]);
          idleAction.setLoop(THREE.LoopRepeat, Infinity);
          idleAction.play();
          ['greet', 'heart', 'look'].forEach((name) => {
            const url = root.getAttribute(`data-${name}-url`) || '';
            if (!url) return;
            loader.load(url, (g2) => {
              if (!g2.animations || !g2.animations.length) return;
              const a = mixer.clipAction(g2.animations[0]);
              a.setLoop(THREE.LoopOnce, 1);
              a.clampWhenFinished = true;
              gestures[name] = a;
              if (name === 'greet') window.setTimeout(() => playGesture('greet'), cameFromLanding ? 900 : 400);
            });
          });
        }
      }, undefined, (err) => console.warn('[Trail] Ana model failed:', err));
    }

    canvasWrap.addEventListener('click', () => playGesture('heart'));
  } catch (err) {
    console.warn('[Trail] 3D stage unavailable; scene still works.', err);
  }
}

/* --- Boot -------------------------------------------------------------------- */
narrate({ speakIt: false }); // seed the bubble
initPanorama();
initCharacter();
