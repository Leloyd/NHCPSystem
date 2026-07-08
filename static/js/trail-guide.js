/* ==========================================================================
   Heritage Trail — Ana Kalang tour guide + arrival transition
   - Opens the golden iris left closed by the landing page (no loader).
   - Renders Ana (idle GLB) in a floating dock; she greets on open, plays a
     heart gesture when tapped, and narrates every stop of the trail with
     EN / Tagalog text-to-speech and a typewriter speech bubble.
   - Follows the trail via the `trail:stop` event emitted by heritage-trail.js.
   ========================================================================== */

import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

/* --- Arrival: open the iris if we came from the landing page -------------- */
const arrival = document.querySelector('[data-trail-arrival]');
let arrivedFromLanding = false;
try {
  arrivedFromLanding = sessionStorage.getItem('trailArrival') === '1';
  sessionStorage.removeItem('trailArrival');
} catch { /* private mode */ }

if (arrival) {
  if (arrivedFromLanding) {
    // Title glows in the darkness, then the iris opens onto the trail.
    window.requestAnimationFrame(() => arrival.classList.add('is-titled'));
    window.setTimeout(() => arrival.classList.add('is-open'), 350);
    window.setTimeout(() => arrival.remove(), 2600);
  } else {
    arrival.remove(); // direct visits skip the ceremony
  }
}

/* --- Per-stop narration (Ana's tour script) -------------------------------- */
const STOP_SCRIPTS = {
  0: {
    en: "Mabuhay, and welcome to the Heritage Trail! I am Ana Kalang, your guide. Ten stops lie ahead — from the front gates to the crypts below. Take your time; I will walk with you at every step.",
    tl: "Mabuhay, at maligayang pagdating sa Heritage Trail! Ako si Ana Kalang, ang iyong gabay. Sampung hinto ang naghihintay — mula sa tarangkahan hanggang sa mga kripta sa ilalim. Huwag magmadali; sasamahan kita sa bawat hakbang.",
  },
  1: {
    en: "This is our orientation point — the front gates. Look around the 360 view and feel the approach: the circular enclosure, the red-brick paths, and the chapel waiting ahead.",
    tl: "Ito ang ating panimulang hinto — ang tarangkahan. Ilibot ang tingin sa 360 view: ang pabilog na pader, ang mga daanang ladrilyo, at ang kapilyang naghihintay sa unahan.",
  },
  2: {
    en: "Before any visit, guests sign the logbook. Register here as you would on-site, and I will make sure you are oriented before we go deeper.",
    tl: "Bago ang anumang pagbisita, pumipirma ang mga panauhin sa logbook. Magpatala rito tulad ng gagawin mo sa mismong lugar, at ihahanda kita bago tayo magpatuloy.",
  },
  3: {
    en: "Welcome to the museum's collection. Each artifact here spans seven centuries of memory — burial jars, iron crosses, and carved stones. Tap any of them; they have stories to tell.",
    tl: "Maligayang pagdating sa koleksiyon ng museo. Ang bawat artepakto rito ay sumasaklaw sa pitong siglo ng alaala — mga banga, krus na bakal, at inukit na bato. Pindutin ang alinman; may kuwento ang bawat isa.",
  },
  4: {
    en: "A quick checkpoint! Answer these three questions about what you have seen so far. Do not worry — I believe in you.",
    tl: "Isang maikling pagsusulit! Sagutin ang tatlong tanong tungkol sa iyong mga nakita. Huwag mag-alala — naniniwala ako sa iyo.",
  },
  5: {
    en: "We return to the gates to look back through time — the cemetery's history from its founding in 1845 through war, revolution, and remembrance.",
    tl: "Bumabalik tayo sa tarangkahan upang balikan ang kasaysayan — mula sa pagkakatatag ng libingan noong 1845, sa digmaan, rebolusyon, at paggunita.",
  },
  6: {
    en: "Behold the chapel's facade — Spanish Colonial Baroque, adapted by Filipino hands to our climate and our earthquakes. Thick stone, warm brick, and centuries of faith.",
    tl: "Masdan ang harapan ng kapilya — Spanish Colonial Baroque, iniangkop ng mga kamay na Pilipino sa ating klima at lindol. Makapal na bato, mainit na ladrilyo, at mga siglo ng pananampalataya.",
  },
  7: {
    en: "Step inside. Molave, narra, and ipil hold this ceiling up — woods our ancestors chose well. Look closely at every corner; the interior keeps its own secrets.",
    tl: "Pumasok tayo. Molave, narra, at ipil ang humahawak sa kisame — mga kahoy na pinili nang tama ng ating mga ninuno. Pagmasdang mabuti ang bawat sulok; may sariling lihim ang loob.",
  },
  8: {
    en: "And now, the heart of it all — the underground crypts. Priests rest here, revolutionaries whispered here, and guerrillas found shelter here. Tread gently.",
    tl: "At ngayon, ang puso ng lahat — ang mga kripta sa ilalim ng lupa. Dito nahihimlay ang mga pari, dito bumulong ang mga rebolusyonaryo, at dito nagkubli ang mga gerilya. Maglakad nang marahan.",
  },
  9: {
    en: "The final assessment! Show me everything you have learned across the trail. Five questions — take a breath, and trust what you now know.",
    tl: "Ang huling pagsusulit! Ipakita mo ang lahat ng iyong natutunan sa buong landas. Limang tanong — huminga nang malalim, at magtiwala sa iyong nalalaman.",
  },
  10: {
    en: "We are back at the gates where we began. Thank you for walking the Heritage Trail with me — and I hope to welcome you, in person, here in Nagcarlan. Paalam!",
    tl: "Nagbalik tayo sa tarangkahang ating pinagsimulan. Salamat sa paglalakad sa Heritage Trail kasama ako — at sana ay masalubong kita, nang personal, dito sa Nagcarlan. Paalam!",
  },
};

/* --- DOM refs ---------------------------------------------------------------- */
const guide = document.getElementById('tgGuide');
const launcher = document.getElementById('tgLauncher');
const bubbleText = guide?.querySelector('[data-tg-text]');
const canvasWrap = guide?.querySelector('[data-tg-canvas]');
const playBtn = guide?.querySelector('[data-tg-play]');
const muteBtn = guide?.querySelector('[data-tg-mute]');
const langBtn = guide?.querySelector('[data-tg-lang]');
const minBtn = guide?.querySelector('[data-tg-minimize]');

const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

const state = {
  lang: localStorage.getItem('anaGuideLang') === 'tl' ? 'tl' : 'en',
  muted: localStorage.getItem('anaGuideMuted') === 'true',
  unlocked: false,
  playing: false,
  stop: 0,
  typeTimer: 0,
};

/* --- Speech (TTS until trail voice-overs are recorded) ---------------------- */
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

function setPlaying(isPlaying) {
  state.playing = isPlaying;
  guide?.setAttribute('data-playing', String(isPlaying));
  playBtn?.setAttribute('aria-pressed', String(isPlaying));
}

function stopSpeaking() {
  if (synth) synth.cancel();
  setPlaying(false);
}

function speak(text) {
  if (!synth || state.muted || !state.unlocked) { setPlaying(false); return; }
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
  synth.speak(utter);
}

/* --- Speech bubble (typewriter) ---------------------------------------------- */
function renderBubble(text) {
  if (!bubbleText) return;
  window.clearInterval(state.typeTimer);
  if (prefersReducedMotion) { bubbleText.textContent = text; return; }
  bubbleText.textContent = '';
  const cursor = document.createElement('span');
  cursor.className = 'tg-cursor';
  cursor.textContent = ' ';
  bubbleText.appendChild(cursor);
  let i = 0;
  state.typeTimer = window.setInterval(() => {
    if (i >= text.length) { window.clearInterval(state.typeTimer); cursor.remove(); return; }
    cursor.before(document.createTextNode(text[i]));
    i += 1;
  }, 16);
}

function narrateStop(stop, { speakIt } = {}) {
  const entry = STOP_SCRIPTS[stop];
  if (!entry) return;
  state.stop = stop;
  const text = entry[state.lang] || entry.en;
  renderBubble(text);
  if (speakIt) speak(text);
  else stopSpeaking();
}

/* --- Controls ------------------------------------------------------------------ */
function setMuted(isMuted) {
  state.muted = isMuted;
  localStorage.setItem('anaGuideMuted', String(isMuted));
  guide?.setAttribute('data-muted', String(isMuted));
  muteBtn?.setAttribute('aria-pressed', String(isMuted));
  if (isMuted) stopSpeaking();
}

function setLang(lang) {
  state.lang = lang;
  localStorage.setItem('anaGuideLang', lang);
  if (langBtn) langBtn.textContent = lang === 'tl' ? 'TL' : 'EN';
  narrateStop(state.stop, { speakIt: state.unlocked && !state.muted });
}

function openGuide() {
  guide?.classList.add('is-open');
  launcher?.setAttribute('hidden', '');
}

function minimizeGuide() {
  guide?.classList.remove('is-open');
  launcher?.removeAttribute('hidden');
  stopSpeaking();
}

function unlockAudio() {
  if (state.unlocked) return;
  state.unlocked = true;
  if (synth && !state.muted) synth.speak(new SpeechSynthesisUtterance(''));
}

if (guide) {
  guide.setAttribute('data-playing', 'false');
  setMuted(state.muted);
  if (langBtn) langBtn.textContent = state.lang === 'tl' ? 'TL' : 'EN';

  playBtn?.addEventListener('click', () => {
    unlockAudio();
    if (state.playing) stopSpeaking();
    else narrateStop(state.stop, { speakIt: !state.muted });
  });
  muteBtn?.addEventListener('click', () => setMuted(!state.muted));
  langBtn?.addEventListener('click', () => setLang(state.lang === 'en' ? 'tl' : 'en'));
  minBtn?.addEventListener('click', minimizeGuide);
  launcher?.addEventListener('click', () => {
    openGuide();
    unlockAudio();
    narrateStop(state.stop, { speakIt: !state.muted });
  });

  // Follow the trail: heritage-trail.js announces every stop change.
  window.addEventListener('trail:stop', (event) => {
    const stop = event.detail ? event.detail.stop : 0;
    narrateStop(stop, { speakIt: state.unlocked && !state.muted && guide.classList.contains('is-open') });
  });

  // First interaction anywhere unlocks the voice for subsequent stops.
  const kickstart = () => { unlockAudio(); window.removeEventListener('pointerdown', kickstart, true); };
  window.addEventListener('pointerdown', kickstart, true);

  window.addEventListener('pagehide', () => stopSpeaking());
}

/* --- Ana's 3D stage -------------------------------------------------------------- */
function initCharacter() {
  if (!canvasWrap || !guide) return;

  const modelUrl = guide.getAttribute('data-model-url') || '';
  const BASE_ROT_Y = -Math.PI / 2; // the GLB is authored facing screen-right
  let renderer, scene, camera, mixer, clock, avatar;
  let idleAction = null;
  let gestureAction = null; // greet or heart, one at a time
  let gestureFadingBack = false;
  const gestures = {};

  try {
    scene = new THREE.Scene();
    const w = Math.max(canvasWrap.clientWidth, 1);
    const h = Math.max(canvasWrap.clientHeight, 1);

    camera = new THREE.PerspectiveCamera(36, w / h, 0.1, 100);
    camera.position.set(0, 1.45, 2.2);
    camera.lookAt(0, 1.35, 0);

    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.8));
    renderer.setSize(w, h, false);
    if ('outputColorSpace' in renderer && THREE.SRGBColorSpace) renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    canvasWrap.appendChild(renderer.domElement);

    scene.add(new THREE.HemisphereLight(0xffe9c8, 0x21160c, 1.0));
    const key = new THREE.DirectionalLight(0xffd9a6, 1.5);
    key.position.set(2.5, 4, 3);
    scene.add(key);
    const rim = new THREE.DirectionalLight(0xd4af6a, 0.8);
    rim.position.set(-3, 2, -2);
    scene.add(rim);

    clock = new THREE.Clock();

    const onResize = () => {
      const nw = Math.max(canvasWrap.clientWidth, 1);
      const nh = Math.max(canvasWrap.clientHeight, 1);
      renderer.setSize(nw, nh, false);
      camera.aspect = nw / nh;
      camera.updateProjectionMatrix();
    };
    window.addEventListener('resize', onResize);

    const playGesture = (name) => {
      const action = gestures[name];
      if (!action || !idleAction) return;
      if (gestureAction && gestureAction.isRunning()) return;
      gestureAction = action;
      gestureFadingBack = false;
      action.reset().play();
      idleAction.crossFadeTo(action, 0.4, false);
    };

    const animate = () => {
      window.requestAnimationFrame(animate);
      const dt = Math.min(clock.getDelta(), 0.05);
      if (mixer) {
        if (
          gestureAction && idleAction && gestureAction.isRunning() && !gestureFadingBack &&
          gestureAction.getClip().duration - gestureAction.time <= 0.6
        ) {
          gestureFadingBack = true;
          idleAction.reset().play();
          gestureAction.crossFadeTo(idleAction, 0.6, false);
        }
        mixer.update(dt);
      }
      // Talking sway while narrating, layered over her base facing.
      if (avatar) {
        const sway = state.playing && !prefersReducedMotion ? Math.sin(clock.elapsedTime * 1.4) * 0.06 : 0;
        avatar.rotation.y = BASE_ROT_Y + sway;
      }
      renderer.render(scene, camera);
    };
    animate();

    if (modelUrl) {
      const loader = new GLTFLoader();
      loader.load(modelUrl, (gltf) => {
        const root = gltf.scene || (gltf.scenes && gltf.scenes[0]);
        if (!root) return;
        // Skinned meshes get frustum-culled mid-animation — keep them drawing.
        root.traverse((obj) => { if (obj.isMesh || obj.isSkinnedMesh) obj.frustumCulled = false; });

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
        avatar.rotation.y = BASE_ROT_Y; // authored facing right; turn to camera
        scene.add(avatar);

        if (gltf.animations && gltf.animations.length) {
          mixer = new THREE.AnimationMixer(root);
          idleAction = mixer.clipAction(gltf.animations[0]);
          idleAction.setLoop(THREE.LoopRepeat, Infinity);
          idleAction.play();

          // Background-load the gesture clips (same skeleton, no model swap).
          ['greet', 'heart'].forEach((name) => {
            const url = guide.getAttribute(`data-${name}-url`) || '';
            if (!url) return;
            loader.load(url, (g2) => {
              if (!g2.animations || !g2.animations.length) return;
              const action = mixer.clipAction(g2.animations[0]);
              action.setLoop(THREE.LoopOnce, 1);
              action.clampWhenFinished = true;
              gestures[name] = action;
              if (name === 'greet') playGesture('greet'); // she waves hello
            });
          });
        }
      }, undefined, (err) => console.warn('[Ana Kalang] Trail guide model failed:', err));
    }

    // Tap Ana → heart gesture.
    canvasWrap.addEventListener('click', () => playGesture('heart'));
  } catch (err) {
    console.warn('[Ana Kalang] Trail guide 3D unavailable; text/voice still work.', err);
  }
}

/* --- Boot -------------------------------------------------------------------------- */
if (guide) {
  narrateStop(0, { speakIt: false }); // seed the welcome bubble
  initCharacter();
  // Reveal after the arrival ceremony (or right away on direct visits).
  window.setTimeout(() => openGuide(), arrivedFromLanding ? 2300 : 900);
}
