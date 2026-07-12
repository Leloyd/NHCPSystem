/* ==========================================================================
   Heritage Trail — Starting Point + Stop 1 · Orientation (/trail)
   - Intro: 360 aerial panorama (Pannellum, no controls), Ana Kalang on the
     right, info panel + Begin / Cancel on the left.
   - Begin: everything slides out, the aerial view pans down to the front
     gate (data-gate-yaw / data-gate-pitch), then crossfades into the
     FrontGate 360 (Pannellum scene fade) — Stop 1 begins.
   - Stop 1: the FrontGate 360 becomes the living background (with the same
     hotspots as the heritage page + gold info spots), Ana returns with the
     controls, and a scrollable story layer (GSAP-choreographed, like the
     landing page) tells the Orientation chapters.
   - Narration engine ported from the landing page: auto-plays on arrival,
     Listen = pause/resume from the same spot, Mute = volume switch (the
     narration keeps advancing silently and can come back mid-sentence).
   ========================================================================== */

import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

const root = document.getElementById('trailStart');
if (!root) throw new Error('[Trail] Starting-point markup not found.');

const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/* --- Narration (one script per chapter; EN / TL) ----------------------------- */
const SCRIPTS = {
  intro: {
    en: "This is where your journey begins. Before us lies the Nagcarlan Underground Cemetery, seen from above — the circular enclosure, the chapel, and the paths worn by centuries of passage. Look around, take it in. When you are ready, we will walk the trail together.",
    tl: "Dito magsisimula ang iyong paglalakbay. Sa harap natin ang Libingan sa Ilalim ng Lupa ng Nagcarlan, mula sa itaas — ang pabilog na pader, ang kapilya, at ang mga daanang ginugol ng mga siglo. Lumingon-lingon, damhin ito. Kapag handa ka na, sabay nating tatahakin ang landas.",
  },
  's1-arrive': {
    en: "Welcome to the first stop — the front gates of the Nagcarlan Underground Cemetery. Take a moment to look around. When you find the glowing ring on the ground, it will carry you to another view. Then scroll down, and I will tell you what this threshold means.",
    tl: "Maligayang pagdating sa unang hinto — ang tarangkahan ng Libingan sa Ilalim ng Lupa ng Nagcarlan. Lumingon-lingon muna. Kapag nakita mo ang kumikinang na singsing sa lupa, dadalhin ka nito sa ibang tanaw. Pagkatapos, mag-scroll pababa at ikukuwento ko ang kahulugan ng bungad na ito.",
  },
  's1-threshold': {
    en: "Look at the gate as a frame. From this one spot you can already read the whole site — the arch, the circular wall, and the straight path leading to the chapel at the center.",
    tl: "Tingnan ang tarangkahan bilang isang kuwadro. Mula sa iisang puwestong ito, mababasa mo na ang buong pook — ang arko, ang pabilog na pader, at ang tuwid na daanang patungo sa kapilya sa gitna.",
  },
  's1-1845': {
    en: "The cemetery was established in 1845 under Father Vicente Velloc, built south of the town center to follow the health regulations of the time. Distance made it quiet; devotion kept it close.",
    tl: "Itinatag ang libingan noong 1845 sa ilalim ni Padre Vicente Velloc, at itinayo sa timog ng bayan alinsunod sa mga alituntuning pangkalusugan ng panahong iyon. Ang layo ang nagbigay ng katahimikan; ang debosyon ang nagpanatili nitong malapit.",
  },
  's1-landmark': {
    en: "This is sacred ground and historical ground at once. Funerals, secret revolutionary meetings, wartime shelter — all passed through this gate. In 1981 it was declared a National Historical Landmark.",
    tl: "Sabay itong sagrado at makasaysayang lupa. Mga libing, lihim na pulong ng mga rebolusyonaryo, kublihan noong digmaan — lahat dumaan sa tarangkahang ito. Noong 1981, idineklara itong Pambansang Palatandaang Pangkasaysayan.",
  },
  's1-details': {
    en: "The arch, the gate, the walls, and the path inward — four parts of the entrance that separate the town from this resting place. Tap each one to take a closer look.",
    tl: "Ang arko, ang rehas, ang pader, at ang daanang papasok — apat na bahagi ng pasukan na naghihiwalay sa bayan mula sa himlayang ito. Pindutin ang bawat isa upang mapagmasdan.",
  },
  's1-next': {
    en: "That completes our first stop. When you are ready, come with me to the museum — we will register your visit there. Tap Continue and let us walk together.",
    tl: "Tapos na ang ating unang hinto. Kapag handa ka na, sumama ka sa akin sa museo — doon natin itatala ang iyong pagbisita. Pindutin ang Magpatuloy at sabay tayong maglakad.",
  },
  's2-arrive': {
    en: "Welcome to the second stop — the museum grounds. Look around, and find the glowing ring on the ground to walk up to the entrance. Then scroll down, and I will show you how the museum welcomes its visitors.",
    tl: "Maligayang pagdating sa ikalawang hinto — ang bakuran ng museo. Lumingon-lingon, at hanapin ang kumikinang na singsing sa lupa upang lumapit sa pasukan. Pagkatapos, mag-scroll pababa at ipapakita ko kung paano tinatanggap ng museo ang mga bisita nito.",
  },
  's2-registration': {
    en: "At the entrance, the staff will hand you the right form — the daily log for regular visits, a permission form for shoots and research, a short survey after your visit, or a booking form for groups.",
    tl: "Sa pasukan, iaabot sa iyo ng mga tauhan ang tamang form — ang talaan para sa karaniwang pagbisita, pahintulot para sa mga shoot at pananaliksik, maikling sarbey pagkatapos ng iyong pagbisita, o booking form para sa mga grupo.",
  },
  's2-hours': {
    en: "The museum is open from Tuesday to Sunday, eight in the morning until four in the afternoon, and rests on Mondays. Admission is free for everyone.",
    tl: "Bukas ang museo mula Martes hanggang Linggo, alas-otso ng umaga hanggang alas-kuwatro ng hapon, at sarado tuwing Lunes. Libre ang pagpasok para sa lahat.",
  },
  's2-rules': {
    en: "A few simple courtesies: keep quiet, remove your hat, no flash, do not touch the artifacts, and no food or drinks inside. Sign the logbook, and follow the staff at all times.",
    tl: "Ilang simpleng alituntunin: manahimik, alisin ang sumbrero, bawal ang flash, huwag hawakan ang mga artepakto, at bawal ang pagkain o inumin sa loob. Pumirma sa logbook, at laging sundin ang mga tauhan.",
  },
  's2-service': {
    en: "This museum is cared for by the National Historical Commission of the Philippines. Public service here follows clear rules — no smoking, no fixers, no noon break, and no red tape. If anything goes wrong, the complaint channels are posted for you.",
    tl: "Pinangangalagaan ang museong ito ng National Historical Commission of the Philippines. Malinaw ang serbisyo publiko rito — bawal manigarilyo, walang fixer, tuloy ang serbisyo sa tanghali, at bawal ang red tape. Kung may problema, nakapaskil ang mga daluyan ng reklamo para sa iyo.",
  },
  's2-next': {
    en: "That completes our second stop. When Stop Three opens, we will step inside and meet the artifacts. Salamat — see you at the next stop.",
    tl: "Tapos na ang ating ikalawang hinto. Kapag nabuksan na ang Ikatlong Hinto, papasok tayo at makikilala ang mga artepakto. Salamat — kita tayo sa susunod na hinto.",
  },
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
const storyEls = Array.from(root.querySelectorAll('[data-trail-story]'));
const progressEl = root.querySelector('[data-trail-progress] span');
const zoomInBtn = root.querySelector('[data-trail-zoom-in]');
const zoomOutBtn = root.querySelector('[data-trail-zoom-out]');

const state = {
  lang: localStorage.getItem('anaGuideLang') === 'tl' ? 'tl' : 'en',
  muted: localStorage.getItem('anaGuideMuted') === 'true',
  subtitles: localStorage.getItem('anaGuideSubs') !== 'off',
  textSize: Math.min(3, Math.max(1, parseInt(localStorage.getItem('anaGuideTextSize') || '1', 10) || 1)),
  unlocked: false,
  playing: false,
  typeTimer: 0,
  mode: 'intro',       // 'intro' | 'stop1'
  scriptKey: 'intro',  // which SCRIPTS entry the Listen button replays
};

/* Panorama handles (set once the viewer is built) */
let viewer = null;
let currentScene = 'aerial';
let transitioning = false; // true during the Begin pan + scene crossfade
let scrollYaw = 0;         // scroll-linked yaw offset while reading Stop 1

/* Refreshing while reading a stop keeps you in that stop: entering one stamps
   #stop-N on the URL, and on load that hash restores the stop directly (its
   360 as the first scene, no intro). */
const hashStopNum = (window.location.hash.match(/stop-(\d+)/) || [])[1];
const wantsStop = hashStopNum ? `stop${hashStopNum}` : null;

/* Per-stop story engines + the scroller currently on screen. */
const storyApis = {};
let activeStoryEl = null;

/* Character handle (populated by initCharacter) */
const charApi = {};

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

/* --- Speech (Web Speech API — engine ported from the landing page) ----------- */
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
  if (playBtn) {
    playBtn.setAttribute('aria-pressed', String(p));
    playBtn.setAttribute('aria-label', p ? 'Pause narration' : 'Play narration');
  }
}

/* The narration engine tracks the spoken position (via word-boundary events)
   so that Mute works like a volume control — the speech keeps advancing
   silently and can come back audible mid-sentence — and the Listen button
   pauses/resumes from the same spot instead of restarting. The utterGen
   counter invalidates callbacks from cancelled utterances. */
let utterGen = 0;
const narration = { full: '', pos: 0, paused: false, startPos: 0, startedAt: 0, boundaryFired: false };

/* Android Chrome never fires word-boundary events, so estimate the spoken
   position from elapsed time instead, snapped back to a word start. */
const SPEECH_CHARS_PER_SEC = 14; // ≈150 wpm at our speaking rate
function currentSpeechPos() {
  if (narration.boundaryFired || !state.playing) return narration.pos;
  const elapsed = (performance.now() - narration.startedAt) / 1000;
  let pos = Math.min(narration.full.length, narration.startPos + Math.round(elapsed * SPEECH_CHARS_PER_SEC));
  while (pos > narration.startPos && pos < narration.full.length && !/\s/.test(narration.full[pos])) pos -= 1;
  return pos;
}

function stopSpeaking() {
  utterGen += 1;
  if (synth) synth.cancel();
  narration.paused = false;
  narration.pos = 0;
  setPlaying(false);
}

/* Speak the current narration from a character offset, at the current
   mute-volume. Used for starts, resumes, and mute/unmute swaps. */
function speakFrom(pos) {
  if (!synth || !state.unlocked) { setPlaying(false); return; }
  const text = narration.full.slice(pos);
  if (!text) { setPlaying(false); return; }
  const gen = ++utterGen;
  narration.pos = pos;
  narration.startPos = pos;
  narration.startedAt = performance.now();
  narration.boundaryFired = false;
  narration.paused = false;
  synth.cancel();
  const utter = new SpeechSynthesisUtterance(text);
  const voice = pickVoice(state.lang);
  if (voice) utter.voice = voice;
  utter.lang = state.lang === 'tl' ? (voice && /fil|tl/i.test(voice.lang) ? voice.lang : 'fil-PH') : 'en-US';
  utter.rate = 0.96;
  utter.pitch = 1.05;
  utter.volume = state.muted ? 0 : 1; // muted = silent playback, not stopped
  utter.onstart = () => {
    if (gen !== utterGen) return;
    narration.startedAt = performance.now(); // time the pace from real start
    setPlaying(true);
  };
  utter.onboundary = (event) => {
    if (gen !== utterGen) return;
    narration.boundaryFired = true;
    narration.pos = pos + (event.charIndex || 0); // remember where she is
  };
  utter.onend = () => { if (gen === utterGen) setPlaying(false); };
  utter.onerror = (event) => {
    if (gen !== utterGen) return;
    // Autoplay was blocked: flag audio as still locked so the first user
    // gesture (kickstart below) retries the narration properly.
    if (event && event.error === 'not-allowed') state.unlocked = false;
    setPlaying(false);
  };
  // Android drops an utterance issued in the same tick as cancel() — give
  // the engine a beat before speaking. The gen guard voids stale timers.
  window.setTimeout(() => {
    if (gen === utterGen) synth.speak(utter);
  }, 80);
}

function speak(text) {
  narration.full = text;
  speakFrom(0);
}

function pauseSpeaking() {
  narration.pos = currentSpeechPos(); // capture before playing flips off
  narration.paused = true;
  utterGen += 1; // silence callbacks from the utterance we cancel
  if (synth) synth.cancel();
  setPlaying(false);
}

function resumeSpeaking() {
  speakFrom(narration.pos);
}

/* --- Bubble (typewriter) ---------------------------------------------------- */
function renderBubble(text) {
  if (!bubbleText) return;
  bubble?.classList.remove('is-expanded'); // new narration → collapsed chip (mobile)
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
  const script = SCRIPTS[state.scriptKey] || SCRIPTS.intro;
  const text = script[state.lang] || script.en;
  renderBubble(text);
  if (speakIt) speak(text);
  else stopSpeaking();
}

/* --- Controls --------------------------------------------------------------- */
function setMuted(m) {
  state.muted = m;
  localStorage.setItem('anaGuideMuted', String(m));
  root.setAttribute('data-muted', String(m));
  if (muteBtn) {
    muteBtn.setAttribute('aria-pressed', String(m));
    muteBtn.setAttribute('aria-label', m ? 'Unmute narration' : 'Mute narration');
  }
  // Mute is a volume switch, not a stop: re-speak the remainder from the
  // current word at the new volume so she keeps (or regains) her place.
  if (state.playing) speakFrom(currentSpeechPos());
}
function setLang(lang) {
  state.lang = lang;
  localStorage.setItem('anaGuideLang', lang);
  root.setAttribute('data-lang', lang);
  if (langBtn) langBtn.textContent = lang === 'tl' ? 'TL' : 'EN';
  narrate({ speakIt: state.unlocked });
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
  // Some browsers require a speak() inside the gesture to unlock TTS.
  if (synth && !state.muted) synth.speak(new SpeechSynthesisUtterance(''));
}

root.setAttribute('data-lang', state.lang);
root.setAttribute('data-playing', 'false');
root.setAttribute('data-mode', 'intro');
setMuted(state.muted);
setSubtitles(state.subtitles);
setTextSize(state.textSize);
if (langBtn) langBtn.textContent = state.lang === 'tl' ? 'TL' : 'EN';

playBtn?.addEventListener('click', () => {
  unlockAudio();
  if (state.playing) {
    pauseSpeaking(); // Listen acts as pause…
    return;
  }
  if (!state.subtitles) setSubtitles(true); // playing reveals her words
  if (narration.paused && narration.pos > 0) {
    resumeSpeaking(); // …and resumes from the same spot,
  } else {
    narrate({ speakIt: true }); // or restarts when finished.
  }
});
muteBtn?.addEventListener('click', () => setMuted(!state.muted));
langBtn?.addEventListener('click', () => setLang(state.lang === 'en' ? 'tl' : 'en'));
subsBtn?.addEventListener('click', () => setSubtitles(!state.subtitles));
textSizeBtn?.addEventListener('click', () => setTextSize(state.textSize >= 3 ? 1 : state.textSize + 1));
// On mobile the bubble is a collapsed 2-line chip above the controls; tapping
// it expands the full narration (pointer-events are off on desktop → inert).
bubble?.addEventListener('click', () => bubble.classList.toggle('is-expanded'));

/* Auto-start narration on load (like the landing page). Browsers usually
   block TTS before the first gesture, so: try immediately (the not-allowed
   handler reverts the unlock if refused), and arm a one-shot kickstart so
   the visitor's very first tap/click/keypress starts her speaking. */
function attemptAutoSpeak() {
  if (state.playing || state.unlocked) return;
  state.unlocked = true; // optimistic — revoked by the not-allowed error
  narrate({ speakIt: true });
}
function setupAutoSpeakKickstart() {
  const types = ['pointerdown', 'keydown', 'touchend'];
  const handler = (event) => {
    const target = event.target;
    // On the guide controls, only unlock — their own handlers decide playback.
    const onControls = target instanceof Element && target.closest('.trailx__controls');
    if (!state.unlocked) unlockAudio();
    if (!onControls && !state.playing && !narration.paused) {
      narrate({ speakIt: true });
    }
    types.forEach((t) => window.removeEventListener(t, handler, true));
  };
  types.forEach((t) => window.addEventListener(t, handler, true));
}
window.addEventListener('pagehide', () => stopSpeaking());

/* --- Views & scenes ----------------------------------------------------------
   GATE  = where the aerial view pans before the crossfade (aim at the gate).
   FG    = the FrontGate 360's starting view (same numbers as the old page).
   Tune any of these via the data attributes on #trailStart — drag the view
   and read the console: every drag logs data-yaw / data-pitch to copy. ------ */
const GATE = {
  yaw: parseFloat(root.getAttribute('data-gate-yaw')),
  pitch: parseFloat(root.getAttribute('data-gate-pitch')),
};
if (!Number.isFinite(GATE.yaw)) GATE.yaw = -44.6;
if (!Number.isFinite(GATE.pitch)) GATE.pitch = -72.8;

const FG = {
  yaw: parseFloat(root.getAttribute('data-fg-yaw')),
  pitch: parseFloat(root.getAttribute('data-fg-pitch')),
  hfov: 110,
};
if (!Number.isFinite(FG.yaw)) FG.yaw = -10.2;
if (!Number.isFinite(FG.pitch)) FG.pitch = 1.8;

// MiddleG-Museum start view (same numbers as the heritage page's Stop 2).
const M2 = { yaw: -100, pitch: -5, hfov: 100 };

// Where the idle view settles per scene while a stop is active.
const SCENE_BASE = {
  frontGate: { yaw: FG.yaw, pitch: FG.pitch },
  rightFrontGate: { yaw: 90, pitch: -20 },
  middleGMuseum: { yaw: M2.yaw, pitch: M2.pitch },
  frontMuseum: { yaw: 0, pitch: 0 },
};
// Default zoom per scene — Show Panels eases back to this before restoring.
const SCENE_HFOV = { aerial: 100, frontGate: FG.hfov, rightFrontGate: 100, middleGMuseum: 100, frontMuseum: 100 };

// Per-stop config: which 360 the stop opens on, its entry view, and the hash
// that restores the stop on refresh. The scroll-lean follows the stop's scene.
const STOP_CONF = {
  stop1: { scene: 'frontGate', pitch: FG.pitch, yaw: FG.yaw, hfov: FG.hfov, hash: '#stop-1' },
  stop2: { scene: 'middleGMuseum', pitch: M2.pitch, yaw: M2.yaw, hfov: M2.hfov, hash: '#stop-2' },
};

const isImmersive = () => root.getAttribute('data-immersive') === 'true';

/* --- Immersive (Full View) toggle + zoom -------------------------------------
   Full View slides everything out AND unlocks zoom (wheel / buttons / pinch).
   Show Panels first eases the zoom back to the scene's default, then brings
   the panels, Ana and controls back in. ------------------------------------- */
const immersiveBtn = root.querySelector('[data-trail-immersive]');
root.setAttribute('data-immersive', 'false');
let restorePanelsTimer = 0;
immersiveBtn?.addEventListener('click', () => {
  const on = isImmersive();
  window.clearTimeout(restorePanelsTimer);
  if (!on) {
    root.setAttribute('data-immersive', 'true');
    immersiveBtn.setAttribute('aria-pressed', 'true');
    return;
  }
  immersiveBtn.setAttribute('aria-pressed', 'false');
  // Ease any zoom back to the scene default first, then restore the panels.
  let delay = 0;
  if (viewer) {
    try {
      const base = SCENE_HFOV[currentScene] || 100;
      if (Math.abs(viewer.getHfov() - base) > 1.5 && !prefersReducedMotion) {
        viewer.setHfov(base, 900);
        delay = 920;
      } else {
        viewer.setHfov(base, false);
      }
    } catch { /* viewer busy */ }
  }
  restorePanelsTimer = window.setTimeout(() => root.setAttribute('data-immersive', 'false'), delay);
});

function zoomBy(delta, ms = 220) {
  if (!viewer) return;
  try { viewer.setHfov(viewer.getHfov() + delta, prefersReducedMotion ? false : ms); }
  catch { /* viewer busy */ }
}
zoomInBtn?.addEventListener('click', () => zoomBy(-10));
zoomOutBtn?.addEventListener('click', () => zoomBy(10));

/* --- Stop entry / transitions ------------------------------------------------ */
function enterStop(stopId) {
  transitioning = false;
  const conf = STOP_CONF[stopId];
  if (!conf || state.mode === stopId) return;
  state.mode = stopId;
  root.setAttribute('data-mode', stopId);
  root.setAttribute('data-phase', 'guide'); // brings Ana + controls back in
  storyEls.forEach((el) => { el.hidden = el.getAttribute('data-trail-story') !== stopId; });
  activeStoryEl = storyEls.find((el) => !el.hidden) || null;
  try { history.replaceState(null, '', conf.hash); } catch { /* ignore */ }
  charApi.reenter?.();                       // Ana glides in from the side again
  window.setTimeout(() => charApi.playGesture?.('greet'), 1000);
  storyApis[stopId]?.reset();                // step 0 → Ana narrates the arrival
}

/* Stop → stop: the guide slides out, the 360 crossfades to the next stop's
   scene, and everything slides back in with the new chapters. */
function transitionToStop(stopId) {
  const conf = STOP_CONF[stopId];
  if (!conf || state.mode === stopId || root.getAttribute('data-phase') === 'depart') return;
  stopSpeaking();
  if (!viewer) { enterStop(stopId); return; }
  transitioning = true;
  root.setAttribute('data-phase', 'depart');
  window.setTimeout(() => {
    try {
      viewer.loadScene(conf.scene, conf.pitch, conf.yaw, conf.hfov);
      window.setTimeout(() => enterStop(stopId), prefersReducedMotion ? 120 : 1300);
    } catch (err) {
      console.warn('[Trail] Scene change failed:', err);
      enterStop(stopId);
    }
  }, prefersReducedMotion ? 0 : 650);
}

/* Intro → Stop 1: the aerial view swoops down onto the gate first. */
function beginTrail() {
  if (state.mode !== 'intro' || root.getAttribute('data-phase') === 'depart') return;
  stopSpeaking();
  // No panorama? Fall back to the old page transition so Begin never dead-ends.
  if (!viewer) { leaveTo(beginLink?.getAttribute('href') || root.getAttribute('data-begin-url'), 'begin'); return; }
  transitioning = true;
  root.setAttribute('data-phase', 'depart'); // slide panel/Ana/bubble/controls out
  const crossfade = () => {
    try {
      viewer.loadScene('frontGate', FG.pitch, FG.yaw, FG.hfov);
      window.setTimeout(() => enterStop('stop1'), prefersReducedMotion ? 120 : 1300);
    } catch (err) {
      console.warn('[Trail] Scene change failed:', err);
      enterStop('stop1');
    }
  };
  if (prefersReducedMotion) { crossfade(); return; }
  // Let the UI clear first, then swoop the aerial view down onto the gate.
  window.setTimeout(() => {
    try { viewer.lookAt(GATE.pitch, GATE.yaw, 112, 2300, crossfade); }
    catch { crossfade(); }
  }, 620);
}

/* --- Begin / Cancel ----------------------------------------------------------
   Begin now stays on this page (aerial pan → FrontGate crossfade → Stop 1).
   Cancel still returns home with the curtain. leaveTo() remains as the
   reduced-capability fallback (no WebGL / pannellum missing). --------------- */
function leaveTo(url, mode) {
  stopSpeaking();
  if (!url) return;
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
beginLink?.addEventListener('click', (e) => { e.preventDefault(); beginTrail(); });
cancelLink?.addEventListener('click', (e) => { e.preventDefault(); leaveTo(cancelLink.getAttribute('href'), 'cancel'); });

/* --- 360 panorama (Pannellum tour: aerial + FrontGate scenes) ---------------- */
function initPanorama() {
  const src = root.getAttribute('data-panorama') || '';
  if (!src || !window.pannellum || !panoEl) return;

  // Starting view: set data-yaw / data-pitch on #trailStart in the template.
  // Yaw is horizontal (-180..180), pitch is up/down. Drag around and check
  // the console — the current view is logged after every drag, so you can
  // pick a starting direction and copy its numbers into the attributes.
  const startYaw = parseFloat(root.getAttribute('data-yaw')) || 0;
  const startPitch = parseFloat(root.getAttribute('data-pitch')) || 0;

  // Ping-pong drift boundaries (intro only): the idle sweep pans right until
  // data-yaw-max, reverses and pans left until data-yaw-min, and repeats.
  const yawMaxAttr = parseFloat(root.getAttribute('data-yaw-max'));
  const yawMinAttr = parseFloat(root.getAttribute('data-yaw-min'));
  const yawMax = Number.isFinite(yawMaxAttr) ? yawMaxAttr : startYaw + 24;
  const yawMin = Number.isFinite(yawMinAttr) ? yawMinAttr : startYaw - (yawMax - startYaw);

  const gateSrc = root.getAttribute('data-pano-front-gate') || '';
  const rightGateSrc = root.getAttribute('data-pano-right-front-gate') || '';
  const h1ImageSrc = root.getAttribute('data-fg-h1-image') || '';
  const h1AudioSrc = root.getAttribute('data-fg-h1-audio') || '';
  const midMuseumSrc = root.getAttribute('data-pano-middle-museum') || '';
  const frontMuseumSrc = root.getAttribute('data-pano-front-museum') || '';

  /* Floating image hotspot — ported from the virtual tour (front-gate-hotspot-h1):
     tapping the pulsing marker pins the photo on the wall at the same spot and
     plays its audio guide; tapping again (or ×) closes it and stops the audio. */
  let floatingWindow = null; // { hotspotId, sceneId }
  let hotspotAudio = null;
  const stopHotspotAudio = () => {
    if (!hotspotAudio) return;
    hotspotAudio.pause();
    hotspotAudio.currentTime = 0;
    hotspotAudio = null;
  };
  window.addEventListener('pagehide', stopHotspotAudio);
  const playHotspotAudio = (src) => {
    if (!src) return;
    stopHotspotAudio();
    hotspotAudio = new Audio(src);
    hotspotAudio.preload = 'auto';
    const playing = hotspotAudio.play();
    if (playing && playing.catch) playing.catch((err) => console.warn('[Trail] Hotspot audio blocked:', err));
  };
  const closeFloatingImage = () => {
    if (floatingWindow && viewer) {
      try { viewer.removeHotSpot(floatingWindow.hotspotId, floatingWindow.sceneId); } catch { /* already gone */ }
    }
    floatingWindow = null;
    stopHotspotAudio();
    panoEl.querySelectorAll('.tour-floating-image-window-hotspot').forEach((node) => node.remove());
  };
  const renderFloatingImageHotspot = (hotSpotDiv, args) => {
    hotSpotDiv.classList.add('tour-floating-image-window-hotspot');
    const shell = document.createElement('div');
    shell.className = 'tour-floating-image-window-shell';
    const closeButton = document.createElement('button');
    closeButton.className = 'tour-floating-image-window-close';
    closeButton.type = 'button';
    closeButton.setAttribute('aria-label', 'Close hotspot image');
    closeButton.textContent = '×';
    closeButton.addEventListener('click', (event) => {
      event.preventDefault();
      event.stopPropagation();
      closeFloatingImage();
    });
    const image = document.createElement('img');
    image.className = 'tour-floating-image-window';
    image.src = args.imageSrc;
    image.alt = args.imageAlt || 'Hotspot image';
    image.draggable = false;
    shell.appendChild(closeButton);
    shell.appendChild(image);
    hotSpotDiv.appendChild(shell);
  };
  const openFloatingImage = (event, args) => {
    if (event && typeof event.preventDefault === 'function') event.preventDefault();
    if (!args || !args.imageSrc || !viewer) return;
    if (floatingWindow && floatingWindow.hotspotId === args.windowHotspotId) {
      closeFloatingImage(); // same marker tapped again → toggle closed
      return;
    }
    closeFloatingImage();
    pauseSpeaking(); // let the audio guide speak alone; Listen resumes Ana after
    const spot = {
      id: args.windowHotspotId,
      pitch: args.windowPitch,
      yaw: args.windowYaw,
      type: 'info',
      text: '',
      cssClass: 'tour-floating-image-window-hotspot',
      createTooltipFunc: renderFloatingImageHotspot,
      createTooltipArgs: args,
    };
    try {
      viewer.addHotSpot(spot, currentScene);
      floatingWindow = { hotspotId: args.windowHotspotId, sceneId: currentScene };
      playHotspotAudio(args.audioSrc);
    } catch (err) {
      console.warn('[Trail] Unable to open hotspot image:', err);
    }
  };

  const build = (aerialSrc) => {
    try {
      const scenes = {
        aerial: {
          type: 'equirectangular',
          panorama: aerialSrc,
          pitch: startPitch,
          yaw: startYaw,
          hfov: 100,
        },
      };
      if (gateSrc) {
        scenes.frontGate = {
          type: 'equirectangular',
          panorama: gateSrc,
          pitch: FG.pitch,
          yaw: FG.yaw,
          hfov: FG.hfov,
          hotSpots: [
            // Same ground hotspot as the heritage page: step to the right-side view.
            ...(rightGateSrc ? [{
              pitch: -10,
              yaw: 90,
              type: 'scene',
              sceneId: 'rightFrontGate',
              targetPitch: -20,
              targetYaw: 90,
              targetHfov: 100,
              cssClass: 'tour-ground-hotspot',
            }] : []),
            // Wall-photo hotspot copied from the virtual tour (H1 + audio guide).
            ...(h1ImageSrc ? [{
              id: 'front-gate-hotspot-h1',
              pitch: 1.06,
              yaw: 24.41,
              type: 'info',
              text: '',
              clickHandlerFunc: openFloatingImage,
              clickHandlerArgs: {
                sourceHotspotId: 'front-gate-hotspot-h1',
                windowHotspotId: 'front-gate-hotspot-h1-window',
                imageSrc: h1ImageSrc,
                audioSrc: h1AudioSrc,
                imageAlt: 'Front Gate hotspot image',
                windowPitch: 1.06,
                windowYaw: 24.41,
              },
              cssClass: 'tour-ground-hotspot tour-ground-hotspot--pulse tour-ground-hotspot--compact tour-ground-hotspot--no-icon',
            }] : []),
          ],
        };
      }
      if (gateSrc && rightGateSrc) {
        scenes.rightFrontGate = {
          type: 'equirectangular',
          panorama: rightGateSrc,
          pitch: -20,
          yaw: 90,
          hfov: 100,
          hotSpots: [{
            pitch: -11,
            yaw: -89,
            type: 'scene',
            sceneId: 'frontGate',
            targetPitch: -20,
            targetYaw: -90,
            targetHfov: 100,
            cssClass: 'tour-ground-hotspot',
          }],
        };
      }
      // Stop 2 scenes — museum approach ↔ museum front, same hotspots as the
      // heritage page's Stop 2 panorama.
      if (midMuseumSrc) {
        scenes.middleGMuseum = {
          type: 'equirectangular',
          panorama: midMuseumSrc,
          pitch: M2.pitch,
          yaw: M2.yaw,
          hfov: M2.hfov,
          hotSpots: [
            ...(frontMuseumSrc ? [{
              pitch: -25,
              yaw: -100,
              type: 'scene',
              sceneId: 'frontMuseum',
              cssClass: 'tour-ground-hotspot',
            }] : []),
          ],
        };
      }
      if (midMuseumSrc && frontMuseumSrc) {
        scenes.frontMuseum = {
          type: 'equirectangular',
          panorama: frontMuseumSrc,
          pitch: 0,
          yaw: 0,
          hfov: 100,
          hotSpots: [{
            pitch: -30,
            yaw: 173,
            type: 'scene',
            sceneId: 'middleGMuseum',
            targetPitch: -20,
            targetYaw: 90,
            targetHfov: 100,
            cssClass: 'tour-ground-hotspot',
          }],
        };
      }

      // Refresh restore: open directly on the remembered stop's scene.
      const startConf = wantsStop ? STOP_CONF[wantsStop] : null;
      const startScene = startConf && scenes[startConf.scene] ? startConf.scene : 'aerial';
      currentScene = startScene;
      viewer = window.pannellum.viewer('trailPano', {
        default: {
          firstScene: startScene,
          sceneFadeDuration: prefersReducedMotion ? 0 : 1500,
          autoLoad: true,
          showControls: false,
          showZoomCtrl: false,
          showFullscreenCtrl: false,
          keyboardZoom: false,
          mouseZoom: true, // native Pannellum zoom, same feel as the Virtual Tour
          draggable: true,
          compass: false,
          autoRotate: 0, // replaced by the drift loop below
          minHfov: 50,
          maxHfov: 140,
        },
        scenes,
      });

      viewer.on('scenechange', (id) => {
        currentScene = id;
        closeFloatingImage(); // leaving the scene closes the wall photo + audio
      });

      // Helper for picking views: log where the visitor is looking after
      // each drag ends (used to tune start views, boundaries, hotspots).
      const logView = () => {
        try {
          console.info(`[Trail] ${currentScene} view → data-yaw="${viewer.getYaw().toFixed(1)}" data-pitch="${viewer.getPitch().toFixed(1)}"`);
        } catch { /* viewer not ready */ }
      };
      panoEl.addEventListener('mouseup', logView);
      panoEl.addEventListener('touchend', logView);

      // Idle drift. Intro (aerial): ping-pong sweep between yawMin / yawMax.
      // Stop 1 (gate scenes): ease gently toward the scene's base view plus
      // the scroll-linked yaw offset, so the 360 stays alive while reading.
      // Pauses while dragging, during the Begin transition, and in Full View
      // (so a zoomed-in look is never dragged back by the drift).
      if (!prefersReducedMotion) {
        const DRIFT_SPEED = 1.4; // degrees per second (intro sweep)
        const PITCH_EASE = 0.4;
        const IDLE_MS = 3000;
        let dir = 1; // start by panning right, toward yawMax
        let interacting = false;
        let lastEnd = performance.now();
        let prev = performance.now();
        panoEl.addEventListener('pointerdown', () => { interacting = true; });
        window.addEventListener('pointerup', () => {
          if (interacting) { interacting = false; lastEnd = performance.now(); }
        });
        const drift = (now) => {
          const dt = Math.min((now - prev) / 1000, 0.05);
          prev = now;
          const idle = !interacting && now - lastEnd > IDLE_MS && !document.hidden && !transitioning;
          if (idle) {
            try {
              if (state.mode === 'intro' && currentScene === 'aerial') {
                const y = viewer.getYaw() + dir * DRIFT_SPEED * dt;
                // Reverse at the bounds (no clamp — if the visitor parked the
                // view outside them, the sweep simply drifts back into range).
                if (y >= yawMax && dir > 0) dir = -1;
                else if (y <= yawMin && dir < 0) dir = 1;
                viewer.setYaw(y, false);
                const p = viewer.getPitch();
                viewer.setPitch(p + (startPitch - p) * Math.min(1, dt * PITCH_EASE), false);
              } else if (state.mode !== 'intro' && SCENE_BASE[currentScene] && !isImmersive()) {
                const base = SCENE_BASE[currentScene];
                const stopScene = STOP_CONF[state.mode] ? STOP_CONF[state.mode].scene : '';
                const targetYaw = base.yaw + (currentScene === stopScene ? scrollYaw : 0);
                const y = viewer.getYaw();
                viewer.setYaw(y + (targetYaw - y) * Math.min(1, dt * 0.9), false);
                const p = viewer.getPitch();
                viewer.setPitch(p + (base.pitch - p) * Math.min(1, dt * PITCH_EASE), false);
              }
            } catch { /* viewer busy */ }
          }
          window.requestAnimationFrame(drift);
        };
        window.requestAnimationFrame(drift);
      }

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

/* --- Stop stories: smooth scroll, chapter engine, narration, interactions ---- */

/* Smoothed wheel scrolling (landing-like glide) on whichever stop's story is
   on screen. The goal accumulates wheel deltas and GSAP eases the scroller
   toward it; touch stays native. */
let scrollGoal = null;
function smoothScrollBy(delta) {
  const el = activeStoryEl;
  if (!el) return;
  const max = el.scrollHeight - el.clientHeight;
  const from = scrollGoal === null ? el.scrollTop : scrollGoal;
  scrollGoal = Math.max(0, Math.min(max, from + delta));
  if (window.gsap && !prefersReducedMotion) {
    window.gsap.to(el, {
      scrollTop: scrollGoal,
      duration: 0.75,
      ease: 'power3.out',
      overwrite: true,
      onComplete: () => { scrollGoal = null; },
    });
  } else {
    el.scrollTop = scrollGoal;
    scrollGoal = null;
  }
}

/* The landing page's chapter engine, instantiated once per stop: scroll
   progress picks the active step; the leaving panel slides up and out, the
   next rises in from below, and the active panel's children stagger in — all
   with the landing's exact curves (see trail-start.css). Ana narrates every
   step she lands on. */
function setupStory(el) {
  const stopId = el.getAttribute('data-trail-story') || '';
  const trackEl = el.querySelector('[data-trail-track]');
  const dotsWrap = el.querySelector('[data-trail-dots]');
  const hintEl = el.querySelector('[data-trail-hint]');
  const panels = Array.from(el.querySelectorAll('.trailx__chapter'));
  const STEPS = panels.length;
  if (!STEPS) return null;
  let step = -1;

  // Scroll distance per step, sized in real pixels from the story's visible
  // height so the mobile URL bar (dvh) never desyncs the steps. Less than a
  // full screen per step so moving between chapters takes less scrolling
  // (shorter still on touch, where each swipe travels less than a wheel).
  const sizeTrack = () => {
    if (!trackEl) return;
    const h = el.clientHeight;
    if (!h) { trackEl.style.height = `${STEPS * 100}vh`; return; }
    const stepPx = Math.round(h * (window.matchMedia('(max-width: 820px)').matches ? 0.72 : 0.85));
    trackEl.style.height = `${STEPS * stepPx}px`;
  };
  sizeTrack();
  window.addEventListener('resize', sizeTrack);

  function scrollToStep(index) {
    const total = el.scrollHeight - el.clientHeight;
    const target = Math.max(0, Math.min(total, (index / STEPS) * total + 2));
    if (window.gsap && !prefersReducedMotion) {
      scrollGoal = target;
      window.gsap.to(el, {
        scrollTop: target,
        duration: 0.9,
        ease: 'power3.inOut',
        overwrite: true,
        onComplete: () => { scrollGoal = null; },
      });
    } else {
      el.scrollTo({ top: target, behavior: prefersReducedMotion ? 'auto' : 'smooth' });
      scrollGoal = null;
    }
  }

  // Chapter dots — right-edge rail, like the landing.
  const dots = dotsWrap ? panels.map((panel, i) => {
    const dot = document.createElement('button');
    dot.type = 'button';
    dot.className = 'trailx__dot';
    const label = panel.getAttribute('data-title') || `Section ${i + 1}`;
    dot.setAttribute('data-label', label);
    dot.setAttribute('aria-label', `Go to: ${label}`);
    dot.addEventListener('click', () => scrollToStep(i));
    dotsWrap.appendChild(dot);
    return dot;
  }) : [];

  const setStep = (index) => {
    if (index === step || index < 0 || index >= STEPS) return;
    step = index;
    panels.forEach((panel, i) => {
      panel.classList.toggle('is-active', i === index);
      panel.classList.toggle('is-above', i < index);
      panel.classList.toggle('is-below', i > index);
      panel.setAttribute('aria-hidden', String(i !== index));
    });
    dots.forEach((dot, i) => dot.classList.toggle('is-active', i === index));
    hintEl?.classList.toggle('is-hidden', index > 0);
    // Ana stands opposite the text panel and glides across on step changes,
    // exactly like the landing's chapter engine. The side also drives the
    // tint's side veil so the text always has shade behind it.
    const sideAttr = panels[index].getAttribute('data-side');
    const textSide = sideAttr || 'left';
    charApi.setSide?.(textSide === 'left' ? 'right' : 'left');
    if (sideAttr) root.setAttribute('data-panel-side', sideAttr);
    else root.removeAttribute('data-panel-side'); // centered footer: even tint only
    // Auto-narrate the step being read — even muted (silent playback keeps
    // advancing, so unmuting rejoins mid-sentence; landing behaviour).
    const key = panels[index].getAttribute('data-chapter');
    root.setAttribute('data-step', key || ''); // drives the reading tint depth
    if (state.mode === stopId && SCRIPTS[key] && key !== state.scriptKey) {
      state.scriptKey = key;
      narrate({ speakIt: state.unlocked });
    }
  };

  // Scroll → progress → step. Also drives the progress rail + the 360 lean.
  el.addEventListener('scroll', () => {
    const total = el.scrollHeight - el.clientHeight;
    const progress = total > 0 ? Math.min(1, Math.max(0, el.scrollTop / total)) : 0;
    if (el === activeStoryEl) {
      if (progressEl) progressEl.style.transform = `scaleX(${progress.toFixed(4)})`;
      scrollYaw = progress * 26;
    }
    setStep(Math.floor(Math.min(STEPS - 1e-4, progress * STEPS)));
  }, { passive: true });

  // Touch/drag inside the story cancels any in-flight glide so it never fights.
  el.addEventListener('pointerdown', () => {
    if (window.gsap) window.gsap.killTweensOf(el);
    scrollGoal = null;
  }, { passive: true });

  // Detail chips (e.g. gate elements, registration forms): one pane at a time.
  const chips = Array.from(el.querySelectorAll('[data-detail]'));
  const detailPanes = Array.from(el.querySelectorAll('[data-detail-panel]'));
  chips.forEach((chip) => {
    chip.addEventListener('click', () => {
      const key = chip.getAttribute('data-detail');
      chips.forEach((b) => b.setAttribute('aria-pressed', String(b === chip)));
      detailPanes.forEach((p) => { p.hidden = p.getAttribute('data-detail-panel') !== key; });
    });
  });

  // "Continue" tease for a stop that isn't built yet.
  const nextBtn = el.querySelector('[data-trail-next]');
  const nextNote = el.querySelector('[data-trail-next-note]');
  nextBtn?.addEventListener('click', () => {
    nextNote?.removeAttribute('hidden');
    nextBtn.classList.add('is-teased');
    window.setTimeout(() => nextBtn.classList.remove('is-teased'), 700);
  });

  return {
    el,
    stepCount: STEPS,
    getStep: () => step,
    scrollToStep,
    reset() {
      sizeTrack(); // the story has just been unhidden — measure for real now
      el.scrollTop = 0;
      step = -1;
      setStep(0);
    },
  };
}

function initStories() {
  storyEls.forEach((el) => {
    const api = setupStory(el);
    if (api) storyApis[el.getAttribute('data-trail-story')] = api;
  });

  // One wheel rule for the whole scene:
  //  - Intro & Full View → the event reaches Pannellum untouched, so its
  //    native scroll/pinch zoom works exactly like the Virtual Tour page.
  //  - Reading a stop   → we capture the wheel before Pannellum sees it and
  //    glide the active story instead (smoothed via GSAP), wherever the
  //    cursor is, so the panorama gaps scroll too.
  window.addEventListener('wheel', (e) => {
    if (isImmersive()) return; // native Pannellum zoom
    if (state.mode === 'intro' || !activeStoryEl || activeStoryEl.hidden) return;
    e.preventDefault();
    e.stopPropagation(); // keep Pannellum's mouseZoom out of reading mode
    // ×1.5 so each wheel notch travels further — chapters arrive sooner.
    smoothScrollBy((e.deltaMode === 1 ? e.deltaY * 33 : e.deltaY) * 1.5);
  }, { passive: false, capture: true });

  // Keyboard: arrows / page / space step through the active stop's chapters.
  window.addEventListener('keydown', (e) => {
    const api = storyApis[state.mode];
    if (!api || api.el !== activeStoryEl || api.el.hidden || isImmersive()) return;
    if (e.target && e.target.closest && e.target.closest('button, a, input, select, textarea')) return;
    if (e.key === 'ArrowDown' || e.key === 'PageDown' || e.key === ' ') {
      e.preventDefault();
      api.scrollToStep(Math.min(api.stepCount - 1, api.getStep() + 1));
    } else if (e.key === 'ArrowUp' || e.key === 'PageUp') {
      e.preventDefault();
      api.scrollToStep(Math.max(0, api.getStep() - 1));
    }
  });

  // Stop-to-stop travel (e.g. Stop 1's "Continue to Stop 2").
  root.querySelectorAll('[data-trail-goto]').forEach((btn) => {
    btn.addEventListener('click', () => transitionToStop(btn.getAttribute('data-trail-goto')));
  });
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
  // Mobile uses the landing page's exact camera recipe so Ana's size and
  // position match it: FOV 34, distance 4.1 × a viewport-height compensation,
  // camera at y 1.42 looking at 1.4, a 35% swing toward her, and an edge-hug
  // stance at 92% / 8% with the same swing compensation. Desktop keeps this
  // page's own framing.
  const FOV = mobile ? 34 : 32;
  const zoomComp = Math.min(1.75, Math.max(0.85, window.innerHeight / 900));
  const CAM_Z = mobile ? 4.1 * zoomComp : 3.1;
  const CAM_Y = mobile ? 1.42 : 1.5;
  const LOOK_AT_Y = mobile ? 1.4 : 1.35;
  const LOOK = mobile ? 0.35 : 0.2; // how far the camera swings toward Ana
  const SIDE_PCT = { right: 92, left: 8 }; // mobile edge-hug (landing values)
  const DESKTOP_X = 1.15; // desktop keeps her original fixed stance
  let currentSide = 'right';
  const modelTarget = { x: 0, rotY: BASE_ROT_Y - 0.42 };
  let renderer, scene, camera, mixer, clock, avatar;
  let idleAction = null;
  let gestureAction = null;
  let gestureFadingBack = false;
  const gestures = {};
  const pointer = { x: 0, y: 0 };

  // Mobile: landing formula — screen % → world X, undoing the camera's
  // partial swing toward her, so she hugs the edge exactly like the landing.
  const worldXAt = (pct) => {
    const aspect = Math.max(canvasWrap.clientWidth, 1) / Math.max(canvasWrap.clientHeight, 1);
    const halfW = Math.tan((FOV * Math.PI) / 360) * CAM_Z * aspect;
    return (((pct - 50) / 50) * halfW) / (1 - LOOK);
  };
  const applySide = () => {
    modelTarget.x = mobile
      ? worldXAt(SIDE_PCT[currentSide])
      : (currentSide === 'right' ? DESKTOP_X : -DESKTOP_X);
    // Face the camera, angled slightly toward the text panel (landing values).
    modelTarget.rotY = BASE_ROT_Y + (currentSide === 'right' ? -0.42 : 0.42);
  };
  applySide();
  charApi.setSide = (side) => {
    currentSide = side === 'left' ? 'left' : 'right';
    applySide();
  };

  // Publish Ana's on-screen X (%) so the bubble + glow center on her. Runs
  // every frame with her LIVE position, so it stays glued to the model even
  // through the slide-in, side changes and camera parallax.
  const anaProbe = new THREE.Vector3();
  const projectAnaX = (worldX) => {
    if (!camera) return;
    anaProbe.set(typeof worldX === 'number' ? worldX : modelTarget.x, 1.0, 0);
    anaProbe.project(camera);
    const pct = Math.min(92, Math.max(8, (anaProbe.x * 0.5 + 0.5) * 100));
    root.style.setProperty('--tx-ana-x', `${pct.toFixed(1)}%`);
  };

  try {
    scene = new THREE.Scene();
    const w = Math.max(canvasWrap.clientWidth, 1);
    const h = Math.max(canvasWrap.clientHeight, 1);
    camera = new THREE.PerspectiveCamera(FOV, w / h, 0.1, 100);
    camera.position.set(0, CAM_Y, CAM_Z);
    camera.lookAt(modelTarget.x * LOOK, LOOK_AT_Y, 0);

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
      applySide(); // re-derive her world X from the new aspect ratio
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

    // Let the Begin choreography replay her entrance for Stop 1: she re-enters
    // from the edge of whichever side she'll stand on.
    charApi.reenter = () => {
      applySide();
      if (avatar && !prefersReducedMotion) {
        avatar.position.x = modelTarget.x + (currentSide === 'right' ? 2.6 : -2.6);
      }
    };
    charApi.playGesture = playGesture;

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
        // Glide toward her target side (also covers the entrance, since she
        // starts off-screen) — the landing's continuous easing.
        if (prefersReducedMotion) {
          avatar.position.x = modelTarget.x;
          avatar.rotation.y = modelTarget.rotY;
        } else {
          const sway = state.playing ? Math.sin(clock.elapsedTime * 1.4) * 0.05 : 0;
          avatar.position.x += (modelTarget.x - avatar.position.x) * Math.min(1, dt * 2.2);
          avatar.rotation.y += (modelTarget.rotY + sway - avatar.rotation.y) * Math.min(1, dt * 3);
        }
      }
      const lookX = (avatar ? avatar.position.x : modelTarget.x) * LOOK;
      if (!prefersReducedMotion) {
        camera.position.x += (lookX + pointer.x * 0.08 - camera.position.x) * Math.min(1, dt * 2);
        camera.position.y += (CAM_Y - pointer.y * (mobile ? 0.04 : 0.05) - camera.position.y) * Math.min(1, dt * 2);
      }
      camera.lookAt(lookX, LOOK_AT_Y, 0);
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
        avatar.rotation.y = modelTarget.rotY;
        avatar.position.x = modelTarget.x + (prefersReducedMotion ? 0 : 2.6); // start off-right
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
initStories();
if (wantsStop && STOP_CONF[wantsStop]) enterStop(wantsStop); // refresh → restore the stop
attemptAutoSpeak();          // auto-play like the landing page…
setupAutoSpeakKickstart();   // …or on the very first tap if the browser blocks it
