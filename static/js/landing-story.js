/* ==========================================================================
   Ana Kalang — Scrollytelling Landing Story
   - A sticky full-viewport stage renders Ana Kalang (half-body, Three.js).
   - Scrolling advances "chapters": the leaving text slides out, the next
     slides in, and Ana glides to the opposite side and turns toward the copy.
   - Each chapter is narrated (Web Speech API) with EN / Tagalog toggle,
     play/pause and mute, mirrored in a typewriter speech bubble.
   ========================================================================== */

import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

/* --- Narration scripts (spoken as Ana Kalang, guardian of Nagcarlan) ------ */
const SCRIPT = {
  hero: {
    en: "Mabuhay! I am Ana Kalang, guardian of Nagcarlan's memory. Welcome to the Museo ng Libingan sa Ilalim ng Lupa — the only underground cemetery in the Philippines. Scroll with me, and let me walk you through our story.",
    tl: "Mabuhay! Ako si Ana Kalang, tagapag-ingat ng alaala ng Nagcarlan. Maligayang pagdating sa Museo ng Libingan sa Ilalim ng Lupa — ang tanging libingan sa ilalim ng lupa sa Pilipinas. Samahan mo akong ikuwento ito.",
  },
  testament: {
    en: "This place is a living testament to history. Built in 1845, its underground crypt shows the ingenuity of our ancestors. Today it stands proudly as a National Historical Landmark.",
    tl: "Ang lugar na ito ay buhay na patunay ng kasaysayan. Itinayo noong 1845, ipinapakita ng silong nitong libingan ang talino ng ating mga ninuno. Ngayon, ipinagmamalaki itong Pambansang Makasaysayang Palatandaan.",
  },
  about: {
    en: "The cemetery was built under Fray Vicente Velloc. It was a burial site, a secret meeting place, and a hideout for guerrillas. It carries Nagcarlan's faith, history, and shared memory.",
    tl: "Itinayo ang libingan sa pamumuno ni Fray Vicente Velloc. Naging libingan ito, lihim na pagpupulungan, at taguan ng mga gerilya. Taglay nito ang pananampalataya, kasaysayan, at sama-samang alaala ng Nagcarlan.",
  },
  history: {
    en: "Walk with me through time — from its construction in 1845, to the revolution in 1896, to its declaration as a National Landmark, and to the museum that welcomes you today.",
    tl: "Samahan mo ako sa paglalakbay sa panahon — mula sa pagkakatayo noong 1845, sa rebolusyon noong 1896, sa pagiging Pambansang Palatandaan, hanggang sa museo na tumatanggap sa iyo ngayon.",
  },
  'visitor-info': {
    en: "Planning a visit? We are open Tuesday to Sunday, eight in the morning to four in the afternoon, and admission is free for everyone. I will be glad to see you here in Nagcarlan, Laguna.",
    tl: "Balak mong bumisita? Bukas kami Martes hanggang Linggo, alas-otso ng umaga hanggang alas-kuwatro ng hapon, at libre ang pagpasok para sa lahat. Ikalulugod kong makita ka rito sa Nagcarlan, Laguna.",
  },
  rules: {
    en: "Before you go, please remember: observe silence, dress respectfully, do not touch the artifacts, and follow your guide. Help us protect this sacred place for the generations to come.",
    tl: "Bago ka umalis, tandaan: manahimik, magbihis nang may paggalang, huwag hawakan ang mga artepakto, at sundin ang iyong gabay. Tulungan mo kaming pangalagaan ang banal na lugar na ito para sa susunod na henerasyon.",
  },
};

/* --- DOM refs -------------------------------------------------------------- */
const story = document.getElementById('anaStory');
if (!story) console.warn('[Ana Kalang] Story markup not found.');

const viewport = story?.querySelector('[data-story-viewport]');
const canvasWrap = story?.querySelector('[data-story-canvas]');
const chapters = story ? Array.from(story.querySelectorAll('.story-chapter')) : [];
const bubbleText = story?.querySelector('[data-story-bubble-text]');
const bubbleWrap = story?.querySelector('.story__bubble');
const dotsWrap = story?.querySelector('[data-story-dots]');
const hint = story?.querySelector('[data-story-hint]');
const playBtn = story?.querySelector('[data-story-play]');
const muteBtn = story?.querySelector('[data-story-mute]');
const langBtn = story?.querySelector('[data-story-lang]');
const subsBtn = story?.querySelector('[data-story-subs]');

const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const mobileQuery = window.matchMedia('(max-width: 768px)');

/* --- State ------------------------------------------------------------------ */
const state = {
  chapter: -1,
  localProgress: 0, // 0..1 within the current chapter's scroll segment
  visible: true,
  lang: localStorage.getItem('anaGuideLang') === 'tl' ? 'tl' : 'en',
  muted: localStorage.getItem('anaGuideMuted') === 'true',
  subtitles: localStorage.getItem('anaGuideSubs') !== 'off',
  unlocked: false, // true after the first user gesture (required for TTS)
  playing: false,
  typeTimer: 0,
};

/* The GLB is authored facing screen-right; turn her to face the camera. */
const MODEL_FACE_OFFSET = -Math.PI / 2;
const CAM_BASE_Y = 1.42;
const CAM_BASE_Z = 2.55;
const CAM_FOV = 34;
/* How much the camera swings toward Ana. Higher values re-center her on
   screen and shrink her apparent side offset, so keep this low. */
const LOOK_FACTOR = 0.35;

/* Camera distance grows with the CSS-pixel viewport height, so when the
   browser is zoomed out (viewport gets "bigger") Ana shrinks along with the
   text instead of dominating the screen. */
function cameraDistance() {
  const zoomComp = Math.min(1.75, Math.max(0.85, window.innerHeight / 900));
  return (mobileQuery.matches ? 2.9 : CAM_BASE_Z) * zoomComp;
}

/* Centered two-column composition: [ text column | gap | Ana ] treated as one
   group and centered in the viewport, so both sides get equal outer margins. */
const ANA_WIDTH_PCT = 20; // her approximate on-screen width
const GROUP_GAP_PCT = 8; // breathing room between the text and Ana

function chapterLayout(index) {
  const vw = Math.max(window.innerWidth, 1);
  const wide = chapters[index]?.classList.contains('story-chapter--wide');
  const textPct = (Math.min(wide ? 760 : 600, vw * (wide ? 0.58 : 0.46)) / vw) * 100;
  const groupPct = textPct + GROUP_GAP_PCT + ANA_WIDTH_PCT;
  const insetPct = Math.max(4, (100 - groupPct) / 2);
  const anaFromTextSide = insetPct + textPct + GROUP_GAP_PCT + ANA_WIDTH_PCT / 2;
  const textSide = chapters[index]?.getAttribute('data-side') || 'left';
  return {
    insetPct,
    anaPct: textSide === 'left' ? anaFromTextSide : 100 - anaFromTextSide,
  };
}

function anaTargetPercent(index) {
  if (mobileQuery.matches) return chapterModelSide(index) === 'right' ? 60 : 40;
  return Math.min(88, Math.max(12, chapterLayout(index).anaPct));
}

/* Convert the target screen % into a world-space X for the model, undoing
   the camera's partial swing toward her. */
function computeOffsetX(index) {
  if (!viewport) return 0;
  const frac = (anaTargetPercent(index) - 50) / 50;
  const z = cameraDistance();
  const aspect = Math.max(viewport.clientWidth, 1) / Math.max(viewport.clientHeight, 1);
  const halfW = Math.tan((CAM_FOV * Math.PI) / 360) * z * aspect;
  return (frac * halfW) / (1 - LOOK_FACTOR);
}

function updateBubbleAnchor(index) {
  if (!viewport || index < 0) return;
  if (!mobileQuery.matches) {
    story.style.setProperty('--story-inset', `${chapterLayout(index).insetPct.toFixed(2)}%`);
  }
  viewport.style.setProperty('--ana-x', `${anaTargetPercent(index).toFixed(1)}%`);
}

/* ========================================================================== */
/*  Speech (Web Speech API)                                                   */
/* ========================================================================== */
const synth = 'speechSynthesis' in window ? window.speechSynthesis : null;
let voices = [];

function refreshVoices() {
  if (synth) voices = synth.getVoices() || [];
}
if (synth) {
  refreshVoices();
  synth.onvoiceschanged = refreshVoices;
}

function pickVoice(lang) {
  if (!voices.length) refreshVoices();
  if (lang === 'tl') {
    return (
      voices.find((v) => /fil|tl/i.test(v.lang)) ||
      voices.find((v) => /fil|tagalog|filipino/i.test(v.name)) ||
      voices.find((v) => /en/i.test(v.lang)) ||
      voices[0]
    );
  }
  return voices.find((v) => /en[-_]?(ph|us|gb)/i.test(v.lang)) || voices.find((v) => /^en/i.test(v.lang)) || voices[0];
}

function setPlaying(isPlaying) {
  state.playing = isPlaying;
  viewport?.setAttribute('data-playing', String(isPlaying));
  if (playBtn) {
    playBtn.setAttribute('aria-pressed', String(isPlaying));
    playBtn.setAttribute('aria-label', isPlaying ? 'Pause narration' : 'Play narration');
  }
}

function stopSpeaking() {
  if (synth) synth.cancel();
  setPlaying(false);
}

function speak(text) {
  if (!synth || state.muted || !state.unlocked) {
    setPlaying(false);
    return;
  }
  synth.cancel();
  const utter = new SpeechSynthesisUtterance(text);
  const voice = pickVoice(state.lang);
  if (voice) utter.voice = voice;
  utter.lang = state.lang === 'tl' ? (voice && /fil|tl/i.test(voice.lang) ? voice.lang : 'fil-PH') : 'en-US';
  utter.rate = 0.96;
  utter.pitch = 1.05;
  utter.onstart = () => setPlaying(true);
  utter.onend = () => setPlaying(false);
  utter.onerror = () => setPlaying(false);
  // Fires per spoken word in most browsers — drives the talking pulses.
  utter.onboundary = () => { talk.pulse = 1; };
  synth.speak(utter);
}

/* ========================================================================== */
/*  Speech bubble (typewriter)                                                */
/* ========================================================================== */
function renderBubble(text) {
  if (!bubbleText) return;
  bubbleWrap?.classList.remove('is-expanded'); // new narration → collapsed chip
  window.clearInterval(state.typeTimer);

  if (prefersReducedMotion) {
    bubbleText.textContent = text;
    return;
  }

  bubbleText.textContent = '';
  const cursor = document.createElement('span');
  cursor.className = 'ana-cursor';
  cursor.textContent = ' ';
  bubbleText.appendChild(cursor);

  let i = 0;
  state.typeTimer = window.setInterval(() => {
    if (i >= text.length) {
      window.clearInterval(state.typeTimer);
      cursor.remove();
      return;
    }
    cursor.before(document.createTextNode(text[i]));
    i += 1;
  }, 16);
}

/* Greet gesture: requested whenever a narration opens with "Mabuhay"; the 3D
   stage fulfils it once the greet clip is available. */
let greetWanted = false;
let requestGreetImpl = null;
function requestGreet() {
  greetWanted = true;
  if (requestGreetImpl) requestGreetImpl();
}

function narrateChapter(index, { speakIt } = {}) {
  const key = chapters[index]?.getAttribute('data-chapter');
  const entry = key ? SCRIPT[key] : null;
  if (!entry) return;
  const text = entry[state.lang] || entry.en;
  if (/^\s*mabuhay/i.test(text)) requestGreet();
  renderBubble(text);
  if (speakIt) speak(text);
  else stopSpeaking();
}

/* ========================================================================== */
/*  Chapter engine                                                            */
/* ========================================================================== */
const modelTarget = { x: 0, rotY: 0 };
/* Talking animation state: level eases in/out with speech; pulse spikes on
   every spoken word (via the utterance's boundary events). */
const talk = { level: 0, pulse: 0 };
let dots = [];

function chapterModelSide(index) {
  // Ana stands opposite the text panel.
  const textSide = chapters[index]?.getAttribute('data-side') || 'left';
  return textSide === 'left' ? 'right' : 'left';
}

function setChapter(index) {
  if (index === state.chapter || index < 0 || index >= chapters.length) return;
  state.chapter = index;

  chapters.forEach((chapter, i) => {
    chapter.classList.toggle('is-active', i === index);
    chapter.classList.toggle('is-above', i < index);
    chapter.classList.toggle('is-below', i > index);
    chapter.setAttribute('aria-hidden', String(i !== index));
  });

  // Mobile: chapters taller than the screen scroll internally — start them
  // at the top and switch to the full veil so scrolled text stays readable.
  if (mobileQuery.matches) {
    const active = chapters[index];
    active.scrollTop = 0;
    active.classList.toggle('is-tall', active.scrollHeight > active.clientHeight + 8);
  }

  const side = chapterModelSide(index);
  viewport?.setAttribute('data-model-side', side);
  // Drives the per-chapter background crossfade in CSS.
  viewport?.setAttribute('data-chapter', chapters[index]?.getAttribute('data-chapter') || '');
  modelTarget.x = computeOffsetX(index);
  updateBubbleAnchor(index);
  // Face the camera, angled slightly toward the text panel.
  modelTarget.rotY = MODEL_FACE_OFFSET + (side === 'right' ? -0.42 : 0.42);

  dots.forEach((dot, i) => dot.classList.toggle('is-active', i === index));
  hint?.classList.toggle('is-hidden', index > 0);

  narrateChapter(index, { speakIt: state.unlocked && !state.muted });
}

function buildDots() {
  if (!dotsWrap) return;
  dots = chapters.map((chapter, i) => {
    const dot = document.createElement('button');
    dot.type = 'button';
    dot.className = 'story__dot';
    const label = chapter.getAttribute('data-title') || `Chapter ${i + 1}`;
    dot.setAttribute('data-label', label);
    dot.setAttribute('aria-label', `Go to: ${label}`);
    dot.addEventListener('click', () => scrollToChapter(i));
    dotsWrap.appendChild(dot);
    return dot;
  });
}

function scrollToChapter(index) {
  const total = story.offsetHeight - window.innerHeight;
  const storyTop = story.getBoundingClientRect().top + window.scrollY;
  const target = storyTop + (index / chapters.length) * total + 2;
  window.scrollTo({ top: target, behavior: prefersReducedMotion ? 'auto' : 'smooth' });
}

/* Loading overlay: dismissed when the model arrives (or after a timeout so a
   failed download never traps the visitor), then chapter 1 replays its
   entrance so the reveal happens on a visible stage. */
function dismissLoader() {
  const loaderEl = document.querySelector('[data-story-loader]');
  if (!loaderEl || loaderEl.classList.contains('is-done')) return;
  loaderEl.classList.add('is-done');
  window.setTimeout(() => loaderEl.remove(), 900);
  if (state.chapter === 0) {
    const first = chapters[0];
    first.classList.remove('is-active');
    void first.offsetWidth; // restart the CSS transition
    first.classList.add('is-active');
  }
}
window.setTimeout(dismissLoader, 4500);

/* Scroll → progress → chapter index (rAF-throttled). */
let scrollScheduled = false;
function onScroll() {
  if (scrollScheduled) return;
  scrollScheduled = true;
  window.requestAnimationFrame(() => {
    scrollScheduled = false;
    if (!story) return;
    const rect = story.getBoundingClientRect();
    state.visible = rect.bottom > 0 && rect.top < window.innerHeight;
    const total = story.offsetHeight - window.innerHeight;
    if (total <= 0) return;
    const progress = Math.min(1, Math.max(0, -rect.top / total));
    const scaled = Math.min(chapters.length - 1e-4, progress * chapters.length);
    const index = Math.floor(scaled);
    state.localProgress = scaled - index;
    setChapter(index);
  });
}

/* ========================================================================== */
/*  Controls                                                                  */
/* ========================================================================== */
function setMuted(isMuted) {
  state.muted = isMuted;
  localStorage.setItem('anaGuideMuted', String(isMuted));
  viewport?.setAttribute('data-muted', String(isMuted));
  if (muteBtn) {
    muteBtn.setAttribute('aria-pressed', String(isMuted));
    muteBtn.setAttribute('aria-label', isMuted ? 'Unmute narration' : 'Mute narration');
  }
  if (isMuted) stopSpeaking();
}

function setLang(lang) {
  state.lang = lang;
  localStorage.setItem('anaGuideLang', lang);
  if (langBtn) langBtn.textContent = lang === 'tl' ? 'TL' : 'EN';
  narrateChapter(state.chapter, { speakIt: state.unlocked && !state.muted });
}

function setSubtitles(on) {
  state.subtitles = on;
  localStorage.setItem('anaGuideSubs', on ? 'on' : 'off');
  viewport?.setAttribute('data-subtitles', on ? 'on' : 'off');
  if (subsBtn) {
    subsBtn.setAttribute('aria-pressed', String(on));
    subsBtn.setAttribute('aria-label', on ? 'Hide subtitles' : 'Show subtitles');
  }
}

function unlockAudio() {
  if (state.unlocked) return;
  state.unlocked = true;
  // Some browsers require a speak() inside the gesture to unlock TTS.
  if (synth && !state.muted) synth.speak(new SpeechSynthesisUtterance(''));
}

function wireControls() {
  viewport?.setAttribute('data-playing', 'false');
  setMuted(state.muted);
  setSubtitles(state.subtitles);
  if (langBtn) langBtn.textContent = state.lang === 'tl' ? 'TL' : 'EN';

  playBtn?.addEventListener('click', () => {
    unlockAudio();
    if (state.playing) stopSpeaking();
    else narrateChapter(state.chapter, { speakIt: !state.muted });
  });
  muteBtn?.addEventListener('click', () => setMuted(!state.muted));
  langBtn?.addEventListener('click', () => setLang(state.lang === 'en' ? 'tl' : 'en'));
  subsBtn?.addEventListener('click', () => setSubtitles(!state.subtitles));
  // On mobile the bubble is a collapsed 2-line chip; tapping it expands the
  // full narration (pointer-events are off on desktop, so this is inert there).
  bubbleWrap?.addEventListener('click', () => bubbleWrap.classList.toggle('is-expanded'));
}

/* ========================================================================== */
/*  3D stage (Three.js)                                                       */
/* ========================================================================== */
function initStage() {
  if (!canvasWrap || !viewport) return;

  const modelUrl = story.getAttribute('data-model-url') || '';
  let renderer, scene, camera, mixer, clock, avatar;
  let idleAction = null;
  let disposed = false;
  const pointer = { x: 0, y: 0 }; // -1..1 parallax input

  /* One-shot gesture clips that crossfade over the idle loop on the same
     skeleton — no model swap, no visible loading. Ambient gestures (look,
     wait, foldarm) fire on their own; featured ones (greet, heart) take
     priority and may interrupt an ambient gesture mid-play. */
  const AMBIENT_GESTURES = new Set(['look', 'wait', 'foldarm']);
  const AMBIENT_CHOICES = ['idle', 'look', 'wait', 'foldarm'];
  const gestures = {};
  let activeGesture = null;
  let activeGestureAmbient = false;
  let gestureFadingBack = false;
  let ambientCountdown = 6 + Math.random() * 6;

  const gestureBusy = () => Boolean(activeGesture && activeGesture.isRunning());

  const playGesture = (name, { interrupt = false } = {}) => {
    const action = gestures[name];
    if (!action || !idleAction) return false;
    if (gestureBusy()) {
      // Only featured gestures may cut in, and only over ambient ones.
      if (!interrupt || !activeGestureAmbient || action === activeGesture) return false;
      const from = activeGesture;
      activeGesture = action;
      activeGestureAmbient = AMBIENT_GESTURES.has(name);
      gestureFadingBack = false;
      action.reset().play();
      from.crossFadeTo(action, 0.35, false);
      idleAction.fadeOut(0.35); // in case idle was mid-fade-in
      return true;
    }
    activeGesture = action;
    activeGestureAmbient = AMBIENT_GESTURES.has(name);
    gestureFadingBack = false;
    action.reset().play();
    idleAction.crossFadeTo(action, 0.45, false);
    return true;
  };

  requestGreetImpl = () => {
    if (playGesture('greet', { interrupt: true })) greetWanted = false;
  };

  try {
    scene = new THREE.Scene();

    const w = Math.max(viewport.clientWidth, 1);
    const h = Math.max(viewport.clientHeight, 1);

    // Half-body framing: camera raised and aimed at the chest, with headroom.
    camera = new THREE.PerspectiveCamera(34, w / h, 0.1, 100);
    camera.position.set(0, CAM_BASE_Y, cameraDistance());
    camera.lookAt(0, 1.4, 0);

    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.8));
    renderer.setSize(w, h, false);
    if ('outputColorSpace' in renderer && THREE.SRGBColorSpace) {
      renderer.outputColorSpace = THREE.SRGBColorSpace;
    }
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.05;
    canvasWrap.appendChild(renderer.domElement);

    // Warm heritage lighting.
    scene.add(new THREE.HemisphereLight(0xffe9c8, 0x21160c, 1.0));
    const key = new THREE.DirectionalLight(0xffd9a6, 1.5);
    key.position.set(2.5, 4, 3);
    scene.add(key);
    const rim = new THREE.DirectionalLight(0xd4af6a, 0.8);
    rim.position.set(-3, 2, -2);
    scene.add(rim);

    clock = new THREE.Clock();

    const onResize = () => {
      if (disposed) return;
      const nw = Math.max(viewport.clientWidth, 1);
      const nh = Math.max(viewport.clientHeight, 1);
      renderer.setSize(nw, nh, false);
      camera.aspect = nw / nh;
      camera.updateProjectionMatrix();
      // Re-fit Ana for the new viewport size / browser zoom level.
      camera.position.z = cameraDistance();
      if (state.chapter >= 0) {
        modelTarget.x = computeOffsetX(state.chapter);
        updateBubbleAnchor(state.chapter);
      }
    };
    window.addEventListener('resize', onResize);

    /* Pointer picking: is the cursor over Ana? */
    const raycaster = new THREE.Raycaster();
    const ndc = new THREE.Vector2();
    const pointerHitsAna = (clientX, clientY) => {
      const hitProxy = avatar?.userData.hitProxy;
      if (!hitProxy || !state.visible) return false;
      ndc.set((clientX / window.innerWidth) * 2 - 1, -(clientY / window.innerHeight) * 2 + 1);
      raycaster.setFromCamera(ndc, camera);
      return raycaster.intersectObject(hitProxy, false).length > 0;
    };
    // She reacts to a tap whenever no voice-over is playing — ambient
    // gestures don't block her, only a featured one (greet/heart) mid-play.
    const anaClickable = () => Boolean(avatar) && !state.playing && !(gestureBusy() && !activeGestureAmbient);

    viewport.addEventListener('click', (event) => {
      // Ignore clicks on real UI (links, buttons, chapter text, dots) —
      // anything else on the stage is fair game for picking Ana.
      const target = event.target;
      if (target instanceof Element && target.closest('a, button, .story-chapter, .story__guidebar, .story__dots')) {
        return;
      }
      if (anaClickable() && pointerHitsAna(event.clientX, event.clientY)) {
        playGesture('heart', { interrupt: true });
      }
    });

    const cursorGlow = document.querySelector('[data-story-cursor]');
    const cursorPos = { x: window.innerWidth / 2, y: window.innerHeight / 2 };
    const cursorGoal = { x: cursorPos.x, y: cursorPos.y };
    let cursorMoved = false;
    window.addEventListener('pointermove', (event) => {
      if (!prefersReducedMotion) {
        pointer.x = (event.clientX / window.innerWidth) * 2 - 1;
        pointer.y = (event.clientY / window.innerHeight) * 2 - 1;
        cursorGoal.x = event.clientX;
        cursorGoal.y = event.clientY;
        cursorMoved = true;
      }
      // Cursor hint when she's interactive.
      viewport.style.cursor =
        anaClickable() && pointerHitsAna(event.clientX, event.clientY) ? 'pointer' : '';
    }, { passive: true });

    // Floating golden dust drifting up through the stage (background animation).
    let dust = null;
    let dustSpeeds = null;
    if (!prefersReducedMotion) {
      const COUNT = 140;
      const positions = new Float32Array(COUNT * 3);
      dustSpeeds = new Float32Array(COUNT);
      for (let i = 0; i < COUNT; i += 1) {
        positions[i * 3] = (Math.random() - 0.5) * 4.4;
        positions[i * 3 + 1] = Math.random() * 3.2;
        positions[i * 3 + 2] = (Math.random() - 0.5) * 2 - 0.2;
        dustSpeeds[i] = 0.03 + Math.random() * 0.08;
      }
      const dustGeo = new THREE.BufferGeometry();
      dustGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
      dust = new THREE.Points(
        dustGeo,
        new THREE.PointsMaterial({
          color: 0xd4af6a,
          size: 0.02,
          transparent: true,
          opacity: 0.5,
          depthWrite: false,
          blending: THREE.AdditiveBlending,
        })
      );
      scene.add(dust);
    }

    const animate = () => {
      if (disposed) return;
      window.requestAnimationFrame(animate);
      const dt = Math.min(clock.getDelta(), 0.05);
      // Only show the cursor glow while the story stage is on screen.
      cursorGlow?.classList.toggle('is-on', state.visible && cursorMoved);
      if (!state.visible) return; // stage is offscreen — skip the draw
      if (mixer) {
        // Blend the running one-shot gesture back into the idle loop just
        // before it ends, so she returns to idling with no snap.
        if (
          activeGesture && idleAction && activeGesture.isRunning() && !gestureFadingBack &&
          activeGesture.getClip().duration - activeGesture.time <= 0.6
        ) {
          gestureFadingBack = true;
          idleAction.reset().play();
          activeGesture.crossFadeTo(idleAction, 0.6, false);
        }
        mixer.update(dt);

        // Ambient variety: every so often, randomly stay idle or play one of
        // the ambient gestures (look / wait / foldarm) — talking or not.
        if (!prefersReducedMotion && idleAction) {
          ambientCountdown -= dt;
          if (ambientCountdown <= 0) {
            ambientCountdown = 7 + Math.random() * 8;
            if (!gestureBusy()) {
              const pick = AMBIENT_CHOICES[Math.floor(Math.random() * AMBIENT_CHOICES.length)];
              if (pick !== 'idle') playGesture(pick);
            }
          }
        }
      }

      if (avatar) {
        // Ease toward the chapter's side/orientation.
        const ease = prefersReducedMotion ? 1 : Math.min(1, dt * 3.2);
        avatar.position.x += (modelTarget.x - avatar.position.x) * ease;
        // Small extra turn as the visitor moves through the chapter.
        const micro = prefersReducedMotion ? 0 : (state.localProgress - 0.5) * 0.22;
        const rotGoal = modelTarget.rotY + micro;
        avatar.rotation.y += (rotGoal - avatar.rotation.y) * ease;

        // "Talking" motion while narration plays. Runs after mixer.update so
        // it layers on top of the idle clip's pose for this frame.
        talk.level += ((state.playing ? 1 : 0) - talk.level) * Math.min(1, dt * 5);
        talk.pulse *= Math.exp(-dt * 7); // decay the per-word spike
        if (talk.level > 0.01 && !prefersReducedMotion) {
          const t = clock.elapsedTime;
          const energy = talk.level * (0.55 + talk.pulse);
          const mouths = avatar.userData.mouths;
          if (mouths && mouths.length) {
            // Real face rig: open/close the mouth with a speech-like pattern.
            const open = Math.max(0, Math.sin(t * 11) * 0.6 + Math.sin(t * 17.3) * 0.4) * energy;
            mouths.forEach(({ mesh, index }) => {
              if (mesh.morphTargetInfluences) mesh.morphTargetInfluences[index] = open;
            });
          } else if (avatar.userData.head) {
            // No face rig: conversational head motion — light nods and tilts
            // that spike on each spoken word.
            const head = avatar.userData.head;
            head.rotation.x += (Math.sin(t * 8.7) * 0.028 + Math.sin(t * 13.1) * 0.014) * energy;
            head.rotation.z += Math.sin(t * 5.3) * 0.016 * energy;
            head.rotation.y += Math.sin(t * 3.1) * 0.02 * energy;
          }
        } else if (avatar.userData.mouths && avatar.userData.mouths.length && talk.level <= 0.01) {
          avatar.userData.mouths.forEach(({ mesh, index }) => {
            if (mesh.morphTargetInfluences) mesh.morphTargetInfluences[index] = 0;
          });
        }
      }

      // Gentle camera parallax toward the cursor.
      if (!prefersReducedMotion) {
        camera.position.x += (pointer.x * 0.06 - camera.position.x) * Math.min(1, dt * 2);
        camera.position.y += (CAM_BASE_Y - pointer.y * 0.04 - camera.position.y) * Math.min(1, dt * 2);
      }
      camera.lookAt((avatar ? avatar.position.x : 0) * LOOK_FACTOR, 1.4, 0);

      // Drift the dust upward with a light sway; wrap at the top.
      if (dust) {
        const positions = dust.geometry.attributes.position;
        const t = clock.elapsedTime;
        for (let i = 0; i < dustSpeeds.length; i += 1) {
          let y = positions.getY(i) + dustSpeeds[i] * dt;
          if (y > 3.2) y = 0;
          positions.setY(i, y);
          positions.setX(i, positions.getX(i) + Math.sin(t * 0.6 + i) * dt * 0.015);
        }
        positions.needsUpdate = true;
      }

      // Smoothly trail the cursor glow behind the mouse.
      if (cursorGlow && !prefersReducedMotion) {
        cursorPos.x += (cursorGoal.x - cursorPos.x) * Math.min(1, dt * 6);
        cursorPos.y += (cursorGoal.y - cursorPos.y) * Math.min(1, dt * 6);
        cursorGlow.style.transform = `translate3d(${cursorPos.x}px, ${cursorPos.y}px, 0)`;
      }

      renderer.render(scene, camera);
    };
    animate();

    if (modelUrl) {
      const loader = new GLTFLoader();
      loader.load(
        modelUrl,
        (gltf) => {
          if (disposed) return;
          const root = gltf.scene || (gltf.scenes && gltf.scenes[0]);
          if (!root) return;

          // Skinned characters animate past the bounding sphere computed at
          // load time and get frustum-culled mid-clip. Keep them drawing.
          root.traverse((obj) => {
            if (obj.isMesh || obj.isSkinnedMesh) obj.frustumCulled = false;
          });

          // Normalize: feet on the ground, consistent 2-unit height.
          const box = new THREE.Box3().setFromObject(root);
          const size = new THREE.Vector3();
          const center = new THREE.Vector3();
          box.getSize(size);
          box.getCenter(center);
          const scale = size.y > 0 ? 2.0 / size.y : 1;
          root.scale.setScalar(scale);
          root.position.x -= center.x * scale;
          root.position.z -= center.z * scale;
          root.position.y -= box.min.y * scale;

          avatar = new THREE.Group();
          avatar.add(root);
          avatar.position.x = modelTarget.x;
          avatar.rotation.y = modelTarget.rotY;
          scene.add(avatar);

          // Invisible hit volume for click/hover detection — much cheaper
          // and more forgiving than raycasting the skinned mesh itself.
          const hitProxy = new THREE.Mesh(
            new THREE.BoxGeometry(1.0, 2.1, 0.7),
            new THREE.MeshBasicMaterial({ visible: false })
          );
          hitProxy.position.y = 1.05;
          avatar.add(hitProxy);
          avatar.userData.hitProxy = hitProxy;

          // Talking rig: prefer real mouth morphs (jawOpen/mouthOpen/visemes)
          // if the model ever ships with a face rig; this model has none, so
          // fall back to animating the Head bone while she speaks.
          const mouths = [];
          root.traverse((obj) => {
            const dict = obj.morphTargetDictionary;
            if (!dict) return;
            Object.keys(dict).forEach((key) => {
              if (/jaw[_ ]?open|mouth[_ ]?open|viseme[_ ]?(aa|oh|ou)/i.test(key)) {
                mouths.push({ mesh: obj, index: dict[key] });
              }
            });
          });
          avatar.userData.mouths = mouths;
          avatar.userData.head = root.getObjectByName('Head') || null;

          if (gltf.animations && gltf.animations.length) {
            mixer = new THREE.AnimationMixer(root);
            const clip = gltf.animations.find((c) => /idle/i.test(c.name || '')) || gltf.animations[0];
            idleAction = mixer.clipAction(clip);
            idleAction.setLoop(THREE.LoopRepeat, Infinity);
            idleAction.play();

            // Quietly fetch the gesture GLBs in the background just for their
            // animation clips — same skeleton, so the clips bind onto the
            // already-visible model and can crossfade in with no reload.
            const gestureUrls = {
              greet: story.getAttribute('data-greet-url') || '',
              heart: story.getAttribute('data-heart-url') || '',
              look: story.getAttribute('data-look-url') || '',
              wait: story.getAttribute('data-wait-url') || '',
              foldarm: story.getAttribute('data-foldarm-url') || '',
            };
            Object.entries(gestureUrls).forEach(([name, url]) => {
              if (!url) return;
              loader.load(
                url,
                (gestureGltf) => {
                  if (disposed || !gestureGltf.animations || !gestureGltf.animations.length) return;
                  const action = mixer.clipAction(gestureGltf.animations[0]);
                  action.setLoop(THREE.LoopOnce, 1);
                  action.clampWhenFinished = true; // hold the last pose through the fade back
                  gestures[name] = action;
                  // If "Mabuhay" already played while this downloaded (first
                  // page load), greet now — but only if we're still on it.
                  if (name === 'greet' && greetWanted && state.chapter === 0) requestGreetImpl();
                },
                undefined,
                (err) => console.warn(`[Ana Kalang] ${name} clip failed to load:`, err)
              );
            });
          }
          dismissLoader();
        },
        undefined,
        (err) => {
          console.warn('[Ana Kalang] Model failed to load:', modelUrl, err);
          dismissLoader();
        }
      );
    } else {
      dismissLoader();
    }

    window.addEventListener('beforeunload', () => {
      disposed = true;
      renderer?.dispose();
    });
  } catch (err) {
    console.warn('[Ana Kalang] 3D stage unavailable; the story still works as text.', err);
  }
}

/* ========================================================================== */
/*  Boot                                                                      */
/* ========================================================================== */
if (story && viewport && chapters.length) {
  buildDots();
  wireControls();
  initStage();

  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onScroll, { passive: true });
  setChapter(0);
  onScroll();
}
