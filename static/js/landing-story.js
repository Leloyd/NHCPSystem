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
const dotsWrap = story?.querySelector('[data-story-dots]');
const hint = story?.querySelector('[data-story-hint]');
const playBtn = story?.querySelector('[data-story-play]');
const muteBtn = story?.querySelector('[data-story-mute]');
const langBtn = story?.querySelector('[data-story-lang]');

const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const mobileQuery = window.matchMedia('(max-width: 768px)');

/* --- State ------------------------------------------------------------------ */
const state = {
  chapter: -1,
  localProgress: 0, // 0..1 within the current chapter's scroll segment
  visible: true,
  lang: localStorage.getItem('anaGuideLang') === 'tl' ? 'tl' : 'en',
  muted: localStorage.getItem('anaGuideMuted') === 'true',
  unlocked: false, // true after the first user gesture (required for TTS)
  playing: false,
  typeTimer: 0,
};

/* The GLB is authored facing screen-right; turn her to face the camera. */
const MODEL_FACE_OFFSET = -Math.PI / 2;
const CAM_BASE_Y = 1.42;
const CAM_BASE_Z = 2.55;

/* Camera distance grows with the CSS-pixel viewport height, so when the
   browser is zoomed out (viewport gets "bigger") Ana shrinks along with the
   text instead of dominating the screen. */
function cameraDistance() {
  const zoomComp = Math.min(1.75, Math.max(0.85, window.innerHeight / 900));
  return (mobileQuery.matches ? 2.9 : CAM_BASE_Z) * zoomComp;
}

/* Ana's horizontal offset for a chapter: side, a small alternating "step",
   wider berth for wide panels, and proportional to camera distance so her
   on-screen position stays consistent across zoom levels. */
function computeOffsetX(index) {
  const side = chapterModelSide(index);
  const wide = chapters[index]?.classList.contains('story-chapter--wide');
  let offset = (mobileQuery.matches ? 0.34 : 0.62) * (index % 2 ? 0.8 : 1);
  if (wide) offset *= 1.5;
  offset *= cameraDistance() / CAM_BASE_Z;
  return side === 'right' ? offset : -offset;
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
  synth.speak(utter);
}

/* ========================================================================== */
/*  Speech bubble (typewriter)                                                */
/* ========================================================================== */
function renderBubble(text) {
  if (!bubbleText) return;
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

function narrateChapter(index, { speakIt } = {}) {
  const key = chapters[index]?.getAttribute('data-chapter');
  const entry = key ? SCRIPT[key] : null;
  if (!entry) return;
  const text = entry[state.lang] || entry.en;
  renderBubble(text);
  if (speakIt) speak(text);
  else stopSpeaking();
}

/* ========================================================================== */
/*  Chapter engine                                                            */
/* ========================================================================== */
const modelTarget = { x: 0, rotY: 0 };
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

  const side = chapterModelSide(index);
  viewport?.setAttribute('data-model-side', side);
  // Drives the per-chapter background crossfade in CSS.
  viewport?.setAttribute('data-chapter', chapters[index]?.getAttribute('data-chapter') || '');
  modelTarget.x = computeOffsetX(index);
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

function unlockAudio() {
  if (state.unlocked) return;
  state.unlocked = true;
  // Some browsers require a speak() inside the gesture to unlock TTS.
  if (synth && !state.muted) synth.speak(new SpeechSynthesisUtterance(''));
}

function wireControls() {
  viewport?.setAttribute('data-playing', 'false');
  setMuted(state.muted);
  if (langBtn) langBtn.textContent = state.lang === 'tl' ? 'TL' : 'EN';

  playBtn?.addEventListener('click', () => {
    unlockAudio();
    if (state.playing) stopSpeaking();
    else narrateChapter(state.chapter, { speakIt: !state.muted });
  });
  muteBtn?.addEventListener('click', () => setMuted(!state.muted));
  langBtn?.addEventListener('click', () => setLang(state.lang === 'en' ? 'tl' : 'en'));
}

/* ========================================================================== */
/*  3D stage (Three.js)                                                       */
/* ========================================================================== */
function initStage() {
  if (!canvasWrap || !viewport) return;

  const modelUrl = story.getAttribute('data-model-url') || '';
  let renderer, scene, camera, mixer, clock, avatar;
  let disposed = false;
  const pointer = { x: 0, y: 0 }; // -1..1 parallax input

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
      if (state.chapter >= 0) modelTarget.x = computeOffsetX(state.chapter);
    };
    window.addEventListener('resize', onResize);

    const cursorGlow = document.querySelector('[data-story-cursor]');
    const cursorPos = { x: window.innerWidth / 2, y: window.innerHeight / 2 };
    const cursorGoal = { x: cursorPos.x, y: cursorPos.y };
    let cursorMoved = false;
    if (!prefersReducedMotion) {
      window.addEventListener('pointermove', (event) => {
        pointer.x = (event.clientX / window.innerWidth) * 2 - 1;
        pointer.y = (event.clientY / window.innerHeight) * 2 - 1;
        cursorGoal.x = event.clientX;
        cursorGoal.y = event.clientY;
        cursorMoved = true;
      }, { passive: true });
    }

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
      if (mixer) mixer.update(dt);

      if (avatar) {
        // Ease toward the chapter's side/orientation.
        const ease = prefersReducedMotion ? 1 : Math.min(1, dt * 3.2);
        avatar.position.x += (modelTarget.x - avatar.position.x) * ease;
        // Small extra turn as the visitor moves through the chapter.
        const micro = prefersReducedMotion ? 0 : (state.localProgress - 0.5) * 0.22;
        const rotGoal = modelTarget.rotY + micro;
        avatar.rotation.y += (rotGoal - avatar.rotation.y) * ease;
      }

      // Gentle camera parallax toward the cursor.
      if (!prefersReducedMotion) {
        camera.position.x += (pointer.x * 0.06 - camera.position.x) * Math.min(1, dt * 2);
        camera.position.y += (CAM_BASE_Y - pointer.y * 0.04 - camera.position.y) * Math.min(1, dt * 2);
      }
      camera.lookAt((avatar ? avatar.position.x : 0) * 0.72, 1.4, 0);

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

          if (gltf.animations && gltf.animations.length) {
            mixer = new THREE.AnimationMixer(root);
            const clip = gltf.animations.find((c) => /idle/i.test(c.name || '')) || gltf.animations[0];
            const action = mixer.clipAction(clip);
            action.setLoop(THREE.LoopRepeat, Infinity);
            action.play();
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
