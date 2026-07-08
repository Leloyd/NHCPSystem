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
    en: "Mabuhay! I am Ana Kalang, guardian of Nagcarlan's memory. Welcome to the Museo ng Libingan sa Ilalim ng Lupa ng Nagcarlan — the only underground cemetery in the Philippines. Scroll with me, and let me walk you through our story.",
    tl: "Mabuhay! Ako si Ana Kalang, tagapag-ingat ng alaala ng Nagcarlan. Maligayang pagdating sa Museo ng Libingan sa Ilalim ng Lupa ng Nagcarlan — ang tanging libingan sa ilalim ng lupa sa Pilipinas. Samahan mo akong ikuwento ito.",
  },
  testament: {
    en: "This place is a living testament to history. Built in 1845, its underground crypt shows the ingenuity of our ancestors. Today it stands proudly as a National Historical Landmark.",
    tl: "Ang lugar na ito ay buhay na patunay ng kasaysayan. Itinayo noong 1845, ipinapakita ng silong nitong libingan ang talino ng ating mga ninuno. Ngayon, ipinagmamalaki itong Pambansang Makasaysayang Palatandaan.",
  },
  // About · I: the narration IS the on-screen text (subtitle hidden there).
  about1: {
    en: "THE NAGCARLAN Underground Cemetery, built in 1845 under Fray Vicente Velloc, stands as a historic landmark that served as a burial site, a revolutionary meeting place, and a hideout of guerillas. Declared a National Historical Landmark on 24 October 1981, it continues to embody Nagcarlan's faith, history, and collective memory.",
    tl: "ANG LIBINGAN sa Ilalim ng Lupa ng Nagcarlan, itinayo sa patnubay ni Padre Vicente Velloc nong 1845, ay isang makasaysayang palatandaan na nagsilbing libingan, tagpuan ng mga rebolusyonaryo, at taguan ng mga gerilya noong panahon ng digmaan. Idineklarang Pambansang Palatandaang Pangkasaysayan noong 24 Oktubre 1981, patuloy nitong kinakatawan ang pananampalataya, kasaysayan, at kabuuang gunita ng Nagcarlan.",
  },
  about2: {
    en: "Look closely at the gravestones. Many bear Catholic inscriptions — R.I.P., D.E.P., and D.O.M. — prayers for the departed. Among ordinary Filipinos, you will often find S.L.N., Sumalangit Nawa — may their soul ascend to heaven.",
    tl: "Pagmasdan mo ang mga lapida. Marami ang may mga inskripsiyong Katoliko — R.I.P., D.E.P., at D.O.M. — mga panalangin para sa mga yumao. Sa mga karaniwang Pilipino, madalas makikita ang S.L.N., Sumalangit Nawa.",
  },
  about3: {
    en: "During the Japanese occupation, this cemetery sheltered Filipino guerrillas. Colonel Guillermo Billy Aynaga Sr. led the First Laguna Division until his capture in 1944. His remains now rest at the Libingan ng mga Bayani.",
    tl: "Noong panahon ng pananakop ng mga Hapones, naging kanlungan ng mga gerilyang Pilipino ang libingang ito. Pinamunuan ni Koronel Guillermo Billy Aynaga Sr. ang First Laguna Division hanggang madakip siya noong 1944. Ang kaniyang mga labi ay nasa Libingan ng mga Bayani na ngayon.",
  },
  // Cemetery History — one era per chapter, narrated like a walk through time.
  era1845: {
    en: "Let us return to 1845. Under the guidance of Franciscan friars, workers raised a burial ground unlike any other — with crypts resting beneath the earth. An architectural feat far ahead of its time.",
    tl: "Balikan natin ang 1845. Sa patnubay ng mga praileng Pransiskano, itinayo ang isang libingang naiiba sa lahat — may mga kriptang nahihimlay sa ilalim ng lupa. Isang kahanga-hangang arkitektura na lampas sa panahon nito.",
  },
  era1896: {
    en: "By 1896, revolution stirred. In the secrecy of these underground chambers, members of the Katipunan gathered — planning a nation's freedom beneath the resting dead.",
    tl: "Pagsapit ng 1896, nag-alab ang rebolusyon. Sa lihim ng mga silid sa ilalim ng lupa, nagtipon ang mga Katipunero — pinaplano ang kalayaan ng bayan sa ilalim ng mga yumaong nahihimlay.",
  },
  era1981: {
    en: "In 1981, the nation gave this place its due honor — declared a National Historical Landmark, recognized for its unique architecture and its place in our history.",
    tl: "Noong 1981, kinilala ng bansa ang lugar na ito — idineklarang Pambansang Palatandaang Pangkasaysayan, dahil sa natatanging arkitektura at papel nito sa ating kasaysayan.",
  },
  eraToday: {
    en: "And today, the cemetery lives on as a museum and heritage site — welcoming visitors from all over the world to walk through this unique piece of Philippine history.",
    tl: "At ngayon, nananatiling buhay ang libingan bilang museo at pamanang pook — tinatanggap ang mga bisita mula sa iba't ibang panig ng mundo upang tahakin ang natatanging bahagi ng kasaysayang Pilipino.",
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

/* Recorded voice-overs (Supabase). Chapters listed here play the MP3 in the
   active language; chapters without an entry fall back to browser TTS. */
const VOICE_BASE = 'https://ayfudbwshjpjfxqrvdhq.supabase.co/storage/v1/object/public/nhcp-media/LandingPageVid-and-Pics/Audio/';
const VOICE = {
  hero: { en: `${VOICE_BASE}E1%20-%20Title.mp3`, tl: `${VOICE_BASE}T1%20-%20Title.mp3` },
  testament: { en: `${VOICE_BASE}E2%20-%20Testament.mp3`, tl: `${VOICE_BASE}T2%20-%20Testament.mp3` },
  about1: { en: `${VOICE_BASE}E3%20-%20AboutSite1.mp3`, tl: `${VOICE_BASE}T3%20-%20AboutSite1.mp3` },
  about2: { en: `${VOICE_BASE}E4%20-%20AboutSite2.mp3`, tl: `${VOICE_BASE}T4%20-%20AboutSite2.mp3` },
  about3: { en: `${VOICE_BASE}E5%20-%20AboutSite3.mp3`, tl: `${VOICE_BASE}T5%20-%20AboutSite3.mp3` },
  era1845: { en: `${VOICE_BASE}1845-E.mp3`, tl: `${VOICE_BASE}1845-T.mp3` },
  era1896: { en: `${VOICE_BASE}1896-E.mp3`, tl: `${VOICE_BASE}1896-T.mp3` },
  era1981: { en: `${VOICE_BASE}1981-E.mp3`, tl: `${VOICE_BASE}1981-T.mp3` },
  eraToday: { en: `${VOICE_BASE}Today-E.mp3`, tl: `${VOICE_BASE}Ngayon-T.mp3` },
  'visitor-info': { en: `${VOICE_BASE}E-7.mp3`, tl: `${VOICE_BASE}T-7.mp3` },
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
const fatherEl = story?.querySelector('[data-story-father]');
const puntodEl = story?.querySelector('[data-story-puntod]');
const bgVideos = [story?.querySelector('[data-story-video-a]'), story?.querySelector('[data-story-video-b]')].filter(Boolean);
function parsePlaylist(attr) {
  return (story?.getAttribute(attr) || '')
    .split(',')
    .map((url) => url.trim())
    .filter(Boolean);
}
const aboutPlaylist = parsePlaylist('data-about-videos');
const about2Playlist = parsePlaylist('data-about2-videos');
const about3Playlist = parsePlaylist('data-about3-videos');
const guerrillaEls = ['a', 'b', 'c']
  .map((k) => story?.querySelector(`[data-story-guerrilla-${k}]`))
  .filter(Boolean);
const playBtn = story?.querySelector('[data-story-play]');
const muteBtn = story?.querySelector('[data-story-mute]');
const langBtn = story?.querySelector('[data-story-lang]');
const subsBtn = story?.querySelector('[data-story-subs]');
const textSizeBtn = story?.querySelector('[data-story-textsize]');

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
  textSize: Math.min(3, Math.max(1, parseInt(localStorage.getItem('anaGuideTextSize') || '1', 10) || 1)),
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
  // Mobile pulls the camera back further so Ana reads as part of the scene
  // rather than filling the frame — keeps the background visible around her.
  return (mobileQuery.matches ? 4.1 : CAM_BASE_Z) * zoomComp;
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
  // Mobile: hug the screen edge — part of her may crop off, by design.
  if (mobileQuery.matches) return chapterModelSide(index) === 'right' ? 92 : 8;
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

/* The narration engine tracks the spoken position (via word-boundary events)
   so that mute works like a volume control — the speech keeps advancing
   silently and can come back audible mid-sentence — and the Listen button
   pauses/resumes from the same spot instead of restarting. The utterGen
   counter invalidates callbacks from cancelled utterances. */
let utterGen = 0;
const narration = { full: '', pos: 0, paused: false, startPos: 0, startedAt: 0, boundaryFired: false, mode: 'tts' };

/* Shared player for the recorded voice-overs. */
const voiceEl = typeof Audio !== 'undefined' ? new Audio() : null;
if (voiceEl) {
  voiceEl.preload = 'auto';
  voiceEl.addEventListener('play', () => { if (narration.mode === 'audio') setPlaying(true); });
  voiceEl.addEventListener('ended', () => {
    if (narration.mode === 'audio') {
      narration.paused = false;
      setPlaying(false);
    }
  });
  voiceEl.addEventListener('error', () => {
    // Recording failed to load — fall back to TTS so she still speaks.
    if (narration.mode === 'audio' && state.unlocked && narration.full) {
      narration.mode = 'tts';
      speakFrom(0);
    }
  });
}

function playVoiceFrom(url, seconds) {
  if (!voiceEl) return false;
  narration.mode = 'audio';
  narration.paused = false;
  utterGen += 1; // invalidate any in-flight TTS
  if (synth) synth.cancel();
  if (voiceEl.src !== url) voiceEl.src = url;
  try { voiceEl.currentTime = seconds || 0; } catch { /* metadata not ready */ }
  voiceEl.muted = state.muted;
  const playing = voiceEl.play();
  if (playing && playing.catch) {
    playing.catch((err) => {
      // Autoplay refused — the first-gesture kickstart will retry.
      if (err && err.name === 'NotAllowedError') state.unlocked = false;
      setPlaying(false);
    });
  }
  return true;
}

/* Android Chrome never fires word-boundary events, so estimate the spoken
   position from elapsed time instead, snapped back to a word start. */
const SPEECH_CHARS_PER_SEC = 14; // ≈150 wpm at our speaking rate
function currentSpeechPos() {
  if (narration.mode === 'audio' && voiceEl) {
    // Recorded VO: map playback progress onto the script text proportionally.
    if (!voiceEl.duration || !Number.isFinite(voiceEl.duration)) return 0;
    return Math.min(narration.full.length, Math.round((voiceEl.currentTime / voiceEl.duration) * narration.full.length));
  }
  if (narration.boundaryFired || !state.playing) return narration.pos;
  const elapsed = (performance.now() - narration.startedAt) / 1000;
  let pos = Math.min(narration.full.length, narration.startPos + Math.round(elapsed * SPEECH_CHARS_PER_SEC));
  while (pos > narration.startPos && pos < narration.full.length && !/\s/.test(narration.full[pos])) pos -= 1;
  return pos;
}

function stopSpeaking() {
  utterGen += 1;
  if (synth) synth.cancel();
  if (voiceEl) {
    voiceEl.pause();
    try { voiceEl.currentTime = 0; } catch { /* metadata not ready */ }
  }
  narration.paused = false;
  narration.pos = 0;
  setPlaying(false);
}

/* Speak the current narration from a character offset, at the current
   mute-volume. Used for starts, resumes, and mute/unmute swaps. */
function speakFrom(pos) {
  if (!synth || !state.unlocked) {
    setPlaying(false);
    return;
  }
  const text = narration.full.slice(pos);
  if (!text) {
    setPlaying(false);
    return;
  }
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
    talk.pulse = 1; // drives the talking motion
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

function speak(text, key) {
  narration.full = text;
  // Recorded voice-over when this chapter has one; browser TTS otherwise.
  const voiceUrl = key && VOICE[key] ? VOICE[key][state.lang] || VOICE[key].en : null;
  if (voiceUrl && voiceEl) {
    playVoiceFrom(voiceUrl, 0);
    return;
  }
  narration.mode = 'tts';
  if (voiceEl) voiceEl.pause();
  speakFrom(0);
}

function pauseSpeaking() {
  if (narration.mode === 'audio' && voiceEl) {
    voiceEl.pause(); // position is kept by the element itself
    narration.paused = true;
    setPlaying(false);
    return;
  }
  narration.pos = currentSpeechPos(); // capture before playing flips off
  narration.paused = true;
  utterGen += 1; // silence callbacks from the utterance we cancel
  if (synth) synth.cancel();
  setPlaying(false);
}

function resumeSpeaking() {
  if (narration.mode === 'audio' && voiceEl) {
    voiceEl.muted = state.muted;
    const playing = voiceEl.play();
    if (playing && playing.catch) playing.catch(() => setPlaying(false));
    narration.paused = false;
    return;
  }
  speakFrom(narration.pos);
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
  // The About visuals are choreographed to the narration: whenever it
  // (re)starts from the top, replay the chapter's scene — bg, photo, videos.
  if ((key === 'about1' || key === 'about2' || key === 'about3') && speakIt) resetAboutScene(key);
  renderBubble(text);
  if (speakIt) speak(text, key);
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

/* ========================================================================== */
/*  About · I scene: portrait + video moment                                  */
/*  While Ana narrates Part I, the portrait of Padre Vicente Velloc appears  */
/*  right as she names him, lingers, then the background becomes the video.  */
/* ========================================================================== */
const aboutScene = { key: null, step: 0, enteredAt: 0, timers: [] };
/* Double-buffered playlist state: which clip is queued and which of the two
   stacked <video> layers is currently showing. */
const videoState = { playlist: [], clip: 0, active: 0, switching: false, on: false };

function sceneTimer(fn, ms) {
  aboutScene.timers.push(window.setTimeout(fn, ms));
}

function showScenePhoto(el) {
  el?.classList.add('is-visible');
  el?.setAttribute('aria-hidden', 'false');
}

function hideScenePhoto(el) {
  el?.classList.remove('is-visible');
  el?.setAttribute('aria-hidden', 'true');
}

/* Lightbox: tap any scene photo to view it large; ✕, ESC, or the backdrop
   closes it. Captions carry over (including their EN/TL variants). */
const lightbox = story?.querySelector('[data-story-lightbox]');
const lightboxImg = story?.querySelector('[data-story-lightbox-img]');
const lightboxCaption = story?.querySelector('[data-story-lightbox-caption]');

function openLightbox(figureEl) {
  if (!lightbox || !lightboxImg) return;
  const img = figureEl.querySelector('img');
  const caption = figureEl.querySelector('figcaption');
  if (!img) return;
  lightboxImg.src = img.src;
  lightboxImg.alt = img.alt || '';
  if (lightboxCaption) lightboxCaption.innerHTML = caption ? caption.innerHTML : '';
  lightbox.hidden = false;
  window.requestAnimationFrame(() => lightbox.classList.add('is-open'));
}

function closeLightbox() {
  if (!lightbox || lightbox.hidden) return;
  lightbox.classList.remove('is-open');
  window.setTimeout(() => { lightbox.hidden = true; }, 300);
}

/* Every scene photo opens the lightbox once it's visible. */
[fatherEl, puntodEl, ...guerrillaEls].forEach((photo) => {
  photo?.addEventListener('click', () => {
    if (photo.classList.contains('is-visible')) openLightbox(photo);
  });
});

if (lightbox) {
  lightbox.addEventListener('click', (event) => {
    // Close on the backdrop or the ✕ — not on the image/caption itself.
    const target = event.target;
    if (target === lightbox || (target instanceof Element && target.closest('[data-story-lightbox-close]'))) {
      closeLightbox();
    }
  });
  window.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') closeLightbox();
  });
}

function safePlay(video) {
  const playing = video.play();
  if (playing && playing.catch) playing.catch(() => {});
}

function stopAboutVideos() {
  videoState.on = false;
  videoState.playlist = [];
  videoState.clip = 0;
  videoState.active = 0;
  videoState.switching = false;
  bgVideos.forEach((video) => {
    video.classList.remove('is-active');
    video.pause();
    try { video.currentTime = 0; } catch { /* not seekable yet */ }
  });
}

/* Buffer the next clip in the hidden layer so the crossfade starts instantly. */
function primeStandbyVideo() {
  if (bgVideos.length < 2 || videoState.playlist.length < 2) return;
  const standby = bgVideos[1 - videoState.active];
  const nextUrl = videoState.playlist[(videoState.clip + 1) % videoState.playlist.length];
  if (standby.getAttribute('src') !== nextUrl) {
    standby.setAttribute('src', nextUrl);
    standby.load();
  }
}

function startVideos(playlist) {
  if (!bgVideos.length || !playlist.length) return;
  videoState.playlist = playlist;
  videoState.on = true;
  videoState.clip = 0;
  videoState.active = 0;
  videoState.switching = false;
  const first = bgVideos[0];
  if (first.getAttribute('src') !== playlist[0]) first.setAttribute('src', playlist[0]);
  try { first.currentTime = 0; } catch { /* not seekable yet */ }
  first.classList.add('is-active');
  safePlay(first);
  primeStandbyVideo();
}

/* Crossfade to the next clip in the playlist (wraps around at the end). */
function advanceAboutVideo() {
  if (!videoState.on || videoState.switching || !videoState.playlist.length) return;
  videoState.switching = true;
  const current = bgVideos[videoState.active];
  const nextIndex = bgVideos.length > 1 ? 1 - videoState.active : videoState.active;
  const next = bgVideos[nextIndex];
  videoState.clip = (videoState.clip + 1) % videoState.playlist.length;
  if (next === current) {
    current.setAttribute('src', videoState.playlist[videoState.clip]);
    safePlay(current);
    videoState.switching = false;
    return;
  }
  if (next.getAttribute('src') !== videoState.playlist[videoState.clip]) {
    next.setAttribute('src', videoState.playlist[videoState.clip]);
    next.load();
  }
  try { next.currentTime = 0; } catch { /* not seekable yet */ }
  next.classList.add('is-active');
  safePlay(next);
  window.setTimeout(() => {
    current.classList.remove('is-active');
    current.pause();
    videoState.active = nextIndex;
    videoState.switching = false;
    primeStandbyVideo();
    // Unplayable clip (e.g. an HEVC .MOV in Chrome) — skip past it.
    if (next.error && videoState.on) advanceAboutVideo();
  }, 1250); // just past the CSS opacity fade
}

/* Begin the crossfade shortly before a clip runs out ('ended' as backup,
   'error' so a broken clip never stalls the tour). */
bgVideos.forEach((video) => {
  video.addEventListener('timeupdate', () => {
    if (video !== bgVideos[videoState.active]) return;
    if (video.duration && video.duration - video.currentTime < 1.2) advanceAboutVideo();
  });
  video.addEventListener('ended', () => {
    if (video === bgVideos[videoState.active]) advanceAboutVideo();
  });
  video.addEventListener('error', () => {
    if (video === bgVideos[videoState.active]) advanceAboutVideo();
  });
});

/* Reset + (re)start the scripted scene for the given chapter key (or null).
   about1: cue-driven — portrait flashes as the narration names Padre Velloc,
           then the site tour videos begin (see updateAboutScene).
   about2: time-driven — the gravestone photo appears after a beat and STAYS,
           with the crypt tour videos rolling in behind it. */
function resetAboutScene(key) {
  aboutScene.timers.forEach(window.clearTimeout);
  aboutScene.timers = [];
  aboutScene.key = key || null;
  aboutScene.step = 0;
  aboutScene.enteredAt = performance.now();
  hideScenePhoto(fatherEl);
  hideScenePhoto(puntodEl);
  guerrillaEls.forEach(hideScenePhoto);
  closeLightbox();
  stopAboutVideos();
  if (aboutScene.key === 'about2') {
    sceneTimer(() => showScenePhoto(puntodEl), 1800);
    sceneTimer(() => startVideos(about2Playlist), 6000);
  }
  if (aboutScene.key === 'about3') {
    // Polaroid collage: the three photos cascade in together and STAY,
    // with the crypt video tour rolling in behind them.
    guerrillaEls.forEach((el, i) => {
      sceneTimer(() => showScenePhoto(el), 2000 + i * 450);
    });
    sceneTimer(() => startVideos(about3Playlist), 7000);
  }
}

/* Character offset just past "…Fray Vicente Velloc" (EN) or
   "…Padre Vicente Velloc nong 1845" (TL) in the current narration. */
function aboutCuePos() {
  const entry = SCRIPT.about1;
  const text = (entry && (entry[state.lang] || entry.en)) || '';
  const velloc = text.indexOf('Velloc');
  const year = text.indexOf('1845');
  return Math.max(velloc >= 0 ? velloc + 6 : 0, year >= 0 ? year + 4 : 0);
}

function updateAboutScene() {
  if (aboutScene.key !== 'about1' || aboutScene.step !== 0) return;
  const text = SCRIPT.about1 ? SCRIPT.about1[state.lang] || SCRIPT.about1.en : '';
  let cueHit = false;
  if (state.playing && narration.full === text) {
    cueHit = currentSpeechPos() >= aboutCuePos();
  } else if (performance.now() - aboutScene.enteredAt > 8000) {
    cueHit = true; // silent visitors still get the moment
  }
  if (!cueHit) return;

  aboutScene.step = 1;
  showScenePhoto(fatherEl);
  sceneTimer(() => {
    hideScenePhoto(fatherEl);
    aboutScene.step = 2;
    startVideos(aboutPlaylist);
  }, 5000);
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

  const side = chapterModelSide(index);
  viewport?.setAttribute('data-model-side', side);
  // Drives the per-chapter background crossfade in CSS.
  const chapterKey = chapters[index]?.getAttribute('data-chapter') || '';
  viewport?.setAttribute('data-chapter', chapterKey);
  resetAboutScene(['about1', 'about2', 'about3'].includes(chapterKey) ? chapterKey : null);
  modelTarget.x = computeOffsetX(index);
  updateBubbleAnchor(index);
  // Face the camera, angled slightly toward the text panel.
  modelTarget.rotY = MODEL_FACE_OFFSET + (side === 'right' ? -0.42 : 0.42);

  dots.forEach((dot, i) => dot.classList.toggle('is-active', i === index));
  hint?.classList.toggle('is-hidden', index > 0);

  // Mobile: start tall chapters at their top and re-check the scroll veil.
  if (mobileQuery.matches) chapters[index].scrollTop = 0;
  refreshChapterFit();

  // Auto-narrate every chapter once audio is unlocked — even while muted
  // (silent playback keeps advancing, so unmuting rejoins mid-sentence).
  narrateChapter(index, { speakIt: state.unlocked });
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
  // The stage is revealed — start speaking (or arm the first-gesture start).
  attemptAutoSpeak();
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
  // Mute is a volume switch, not a stop. Recorded VO mutes natively; TTS
  // re-speaks the remainder from the current word at the new volume.
  if (voiceEl) voiceEl.muted = isMuted;
  if (state.playing && narration.mode !== 'audio') speakFrom(currentSpeechPos());
}

function setLang(lang) {
  state.lang = lang;
  localStorage.setItem('anaGuideLang', lang);
  viewport?.setAttribute('data-lang', lang); // swaps bilingual on-page content
  if (langBtn) langBtn.textContent = lang === 'tl' ? 'TL' : 'EN';
  refreshChapterFit(); // the other language may run longer/shorter
  narrateChapter(state.chapter, { speakIt: state.unlocked });
}

/* Re-check whether the active chapter needs its scrollable "tall" mode —
   layout-affecting settings (subtitles, text size) change its height. */
function refreshChapterFit() {
  if (!mobileQuery.matches || state.chapter < 0) return;
  const active = chapters[state.chapter];
  if (active) active.classList.toggle('is-tall', active.scrollHeight > active.clientHeight + 8);
}

function setSubtitles(on) {
  state.subtitles = on;
  localStorage.setItem('anaGuideSubs', on ? 'on' : 'off');
  viewport?.setAttribute('data-subtitles', on ? 'on' : 'off');
  if (subsBtn) {
    subsBtn.setAttribute('aria-pressed', String(on));
    subsBtn.setAttribute('aria-label', on ? 'Hide subtitles' : 'Show subtitles');
  }
  refreshChapterFit();
}

const TEXT_SIZE_LABELS = { 1: 'A', 2: 'A+', 3: 'A++' };
const TEXT_SIZE_NAMES = { 1: 'normal', 2: 'large', 3: 'extra large' };

function setTextSize(size) {
  state.textSize = size;
  localStorage.setItem('anaGuideTextSize', String(size));
  viewport?.setAttribute('data-textsize', String(size));
  if (textSizeBtn) {
    textSizeBtn.textContent = TEXT_SIZE_LABELS[size];
    const next = size >= 3 ? 'reset' : 'enlarge';
    textSizeBtn.setAttribute('aria-label', `Text size: ${TEXT_SIZE_NAMES[size]}. Tap to ${next}`);
  }
  refreshChapterFit();
}

function unlockAudio() {
  if (state.unlocked) return;
  state.unlocked = true;
  // Some browsers require a speak() inside the gesture to unlock TTS.
  if (synth && !state.muted) synth.speak(new SpeechSynthesisUtterance(''));
}

/* Auto-start narration on load. Browsers usually block TTS before the first
   user gesture, so: try immediately (the not-allowed handler above reverts
   the unlock if refused), and arm a one-shot "kickstart" so the visitor's
   very first tap/click/keypress anywhere starts her speaking. */
function attemptAutoSpeak() {
  if (state.playing || state.unlocked) return;
  state.unlocked = true; // optimistic — revoked by the not-allowed error
  narrateChapter(state.chapter, { speakIt: true });
}

function setupAutoSpeakKickstart() {
  const types = ['pointerdown', 'keydown', 'touchend'];
  const handler = (event) => {
    const target = event.target;
    // On the guide controls, only unlock — their own handlers decide playback.
    const onControls = target instanceof Element && target.closest('.story__guidebar');
    if (!state.unlocked) unlockAudio();
    if (!onControls && !state.playing && !narration.paused) {
      narrateChapter(state.chapter, { speakIt: true });
    }
    types.forEach((t) => window.removeEventListener(t, handler, true));
  };
  types.forEach((t) => window.addEventListener(t, handler, true));
}

function wireControls() {
  viewport?.setAttribute('data-playing', 'false');
  viewport?.setAttribute('data-lang', state.lang);
  setMuted(state.muted);
  setSubtitles(state.subtitles);
  setTextSize(state.textSize);
  if (langBtn) langBtn.textContent = state.lang === 'tl' ? 'TL' : 'EN';

  playBtn?.addEventListener('click', () => {
    unlockAudio();
    if (state.playing) {
      pauseSpeaking(); // Listen acts as pause…
    } else if (narration.paused && (narration.mode === 'audio' || narration.pos > 0)) {
      resumeSpeaking(); // …and resumes from the same spot,
    } else {
      narrateChapter(state.chapter, { speakIt: true }); // or restarts when finished.
    }
  });
  muteBtn?.addEventListener('click', () => setMuted(!state.muted));
  langBtn?.addEventListener('click', () => setLang(state.lang === 'en' ? 'tl' : 'en'));
  subsBtn?.addEventListener('click', () => setSubtitles(!state.subtitles));
  textSizeBtn?.addEventListener('click', () => setTextSize(state.textSize >= 3 ? 1 : state.textSize + 1));
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
      // Ignore clicks on real UI (links, buttons, chapter text, dots, photos,
      // the lightbox) — anything else on the stage picks Ana.
      const target = event.target;
      if (target instanceof Element && target.closest('a, button, .story-chapter, .story__guidebar, .story__dots, .story__father, .story__lightbox')) {
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

    // No beforeunload teardown: killing the renderer there freezes Ana when
    // the page is restored from the back/forward cache. On a real unload the
    // browser reclaims the WebGL context itself; on a bfcache restore the
    // animation loop simply resumes.
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
  setupAutoSpeakKickstart();

  // History timeline rail: each year jumps to its era chapter.
  story.querySelectorAll('[data-era-jump]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const target = btn.getAttribute('data-era-jump');
      const idx = chapters.findIndex((ch) => ch.getAttribute('data-chapter') === target);
      if (idx >= 0) scrollToChapter(idx);
    });
  });

  initStage();

  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onScroll, { passive: true });

  // Drive the About scenes. A timer (not the render loop) so it also works
  // if WebGL is unavailable. Recorded VO has no word-boundary events, so the
  // same tick keeps her talking motion pulsing while an MP3 plays.
  window.setInterval(() => {
    updateAboutScene();
    if (state.playing && narration.mode === 'audio') talk.pulse = 1;
  }, 300);

  // Leaving the page (including into the back/forward cache): silence the
  // narration — some mobile browsers keep speaking otherwise.
  window.addEventListener('pagehide', () => stopSpeaking());
  // Restored from the back/forward cache: the render loop resumes by itself;
  // just reset the transient audio state so the Listen button is accurate.
  window.addEventListener('pageshow', (event) => {
    if (event.persisted) stopSpeaking();
  });

  setChapter(0);
  onScroll();
}
