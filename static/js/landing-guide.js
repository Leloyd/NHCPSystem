/* ==========================================================================
   Ana Kalang — Interactive Heritage Guide
   - Renders a 3D character (GLB) in a small floating canvas using Three.js.
   - Falls back to a procedural 3D placeholder until the real model is added.
   - Narrates each landing-page section on scroll using browser text-to-speech
     (Web Speech API), with English / Tagalog toggle, play/pause, mute and
     minimize controls. Speech bubble text is revealed with a typewriter effect.

   To add the real model: drop a rigged GLB at
     static/models/ana-kalang/ana-kalang.glb
   (the path is passed in via the data-model-url attribute in Landing.html).
   ========================================================================== */

import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

/* --- Narration scripts (spoken as Ana Kalang, the guardian of Nagcarlan) --- */
const SCRIPT = {
  hero: {
    en: "Mabuhay! I am Ana Kalang, guardian of Nagcarlan's memory. Welcome to the Museo ng Libingan sa Ilalim ng Lupa — the only underground cemetery in the Philippines. Let me walk you through our story.",
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
  "visitor-info": {
    en: "Planning a visit? We are open Tuesday to Sunday, eight in the morning to four in the afternoon, and admission is free for everyone. I will be glad to see you here in Nagcarlan, Laguna.",
    tl: "Balak mong bumisita? Bukas kami Martes hanggang Linggo, alas-otso ng umaga hanggang alas-kuwatro ng hapon, at libre ang pagpasok para sa lahat. Ikalulugod kong makita ka rito sa Nagcarlan, Laguna.",
  },
  rules: {
    en: "Before you go, please remember: observe silence, dress respectfully, do not touch the artifacts, and follow your guide. Help us protect this sacred place for the generations to come.",
    tl: "Bago ka umalis, tandaan: manahimik, magbihis nang may paggalang, huwag hawakan ang mga artepakto, at sundin ang iyong gabay. Tulungan mo kaming pangalagaan ang banal na lugar na ito para sa susunod na henerasyon.",
  },
};
const SECTION_ORDER = ['hero', 'testament', 'about', 'history', 'visitor-info', 'rules'];

/* --- DOM refs ------------------------------------------------------------- */
const guideEl = document.getElementById('anaGuide');
const launcherEl = document.getElementById('anaLauncher');
if (!guideEl || !launcherEl) {
  // Markup not present — nothing to do.
  console.warn('[Ana Kalang] Guide markup not found on this page.');
}

const refs = guideEl
  ? {
      bubble: guideEl.querySelector('[data-ana-text]'),
      eyebrow: guideEl.querySelector('[data-ana-eyebrow]'),
      canvasWrap: guideEl.querySelector('[data-ana-canvas]'),
      loading: guideEl.querySelector('[data-ana-loading]'),
      playBtn: guideEl.querySelector('[data-ana-play]'),
      muteBtn: guideEl.querySelector('[data-ana-mute]'),
      langBtn: guideEl.querySelector('[data-ana-lang]'),
      minBtn: guideEl.querySelector('[data-ana-minimize]'),
    }
  : {};

/* --- State ---------------------------------------------------------------- */
const state = {
  lang: localStorage.getItem('anaGuideLang') === 'tl' ? 'tl' : 'en',
  muted: localStorage.getItem('anaGuideMuted') === 'true',
  open: false,
  unlocked: false, // becomes true after first user gesture (needed for TTS)
  currentSection: 'hero',
  playing: false,
  typeTimer: 0,
};

const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/* ========================================================================== */
/*  Speech (Web Speech API)                                                   */
/* ========================================================================== */
const synth = 'speechSynthesis' in window ? window.speechSynthesis : null;
let voices = [];

function refreshVoices() {
  if (!synth) return;
  voices = synth.getVoices() || [];
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
/*  Bubble (typewriter reveal)                                                */
/* ========================================================================== */
function renderBubble(text) {
  if (!refs.bubble) return;
  window.clearInterval(state.typeTimer);

  if (prefersReducedMotion) {
    refs.bubble.textContent = text;
    return;
  }

  refs.bubble.textContent = '';
  const cursor = document.createElement('span');
  cursor.className = 'ana-cursor';
  cursor.textContent = ' ';
  refs.bubble.appendChild(cursor);

  let i = 0;
  state.typeTimer = window.setInterval(() => {
    if (i >= text.length) {
      window.clearInterval(state.typeTimer);
      cursor.remove();
      return;
    }
    cursor.before(document.createTextNode(text[i]));
    i += 1;
  }, 18);
}

function narrate(section, { speakIt = true } = {}) {
  const entry = SCRIPT[section];
  if (!entry) return;
  state.currentSection = section;
  const text = entry[state.lang] || entry.en;
  renderBubble(text);
  if (speakIt) speak(text);
  else stopSpeaking();
}

/* ========================================================================== */
/*  UI state sync                                                             */
/* ========================================================================== */
function setPlaying(isPlaying) {
  state.playing = isPlaying;
  guideEl.setAttribute('data-playing', String(isPlaying));
  if (refs.playBtn) {
    refs.playBtn.setAttribute('aria-pressed', String(isPlaying));
    refs.playBtn.setAttribute('aria-label', isPlaying ? 'Pause narration' : 'Play narration');
  }
}

function setMuted(isMuted) {
  state.muted = isMuted;
  localStorage.setItem('anaGuideMuted', String(isMuted));
  guideEl.setAttribute('data-muted', String(isMuted));
  if (refs.muteBtn) {
    refs.muteBtn.setAttribute('aria-pressed', String(isMuted));
    refs.muteBtn.setAttribute('aria-label', isMuted ? 'Unmute narration' : 'Mute narration');
  }
  if (isMuted) stopSpeaking();
}

function setLang(lang) {
  state.lang = lang;
  localStorage.setItem('anaGuideLang', lang);
  if (refs.langBtn) refs.langBtn.textContent = lang === 'tl' ? 'TL' : 'EN';
  // Re-narrate the current section in the new language.
  narrate(state.currentSection, { speakIt: state.unlocked && !state.muted });
}

function openGuide() {
  state.open = true;
  guideEl.classList.add('is-open');
  launcherEl.setAttribute('hidden', '');
}

function minimizeGuide() {
  state.open = false;
  guideEl.classList.remove('is-open');
  launcherEl.removeAttribute('hidden');
  stopSpeaking();
}

/* First real user gesture unlocks audio and starts the tour. */
function unlockAndStart() {
  if (!state.unlocked) {
    state.unlocked = true;
    // Prime the speech engine (some browsers require a speak() in-gesture).
    if (synth && !state.muted) {
      const warm = new SpeechSynthesisUtterance('');
      synth.speak(warm);
    }
  }
  narrate(state.currentSection, { speakIt: !state.muted });
}

/* ========================================================================== */
/*  Controls wiring                                                           */
/* ========================================================================== */
if (guideEl) {
  guideEl.setAttribute('data-muted', String(state.muted));
  guideEl.setAttribute('data-playing', 'false');
  setMuted(state.muted);
  if (refs.langBtn) refs.langBtn.textContent = state.lang === 'tl' ? 'TL' : 'EN';

  refs.playBtn?.addEventListener('click', () => {
    if (!state.unlocked) {
      unlockAndStart();
      return;
    }
    if (state.playing) {
      stopSpeaking();
    } else {
      narrate(state.currentSection, { speakIt: !state.muted });
    }
  });

  refs.muteBtn?.addEventListener('click', () => setMuted(!state.muted));
  refs.langBtn?.addEventListener('click', () => setLang(state.lang === 'en' ? 'tl' : 'en'));
  refs.minBtn?.addEventListener('click', minimizeGuide);
  launcherEl.addEventListener('click', () => {
    openGuide();
    unlockAndStart();
  });
}

/* ========================================================================== */
/*  Scroll-synced narration                                                   */
/* ========================================================================== */
function observeSections() {
  const sections = SECTION_ORDER.map((id) => document.getElementById(id)).filter(Boolean);
  if (!sections.length || !('IntersectionObserver' in window)) return;

  let activeId = state.currentSection;
  const observer = new IntersectionObserver(
    (entries) => {
      // Choose the most visible intersecting section.
      let best = null;
      entries.forEach((entry) => {
        if (entry.isIntersecting && (!best || entry.intersectionRatio > best.intersectionRatio)) {
          best = entry;
        }
      });
      if (!best) return;
      const id = best.target.id;
      if (id === activeId) return;
      activeId = id;
      // Update bubble always; only speak if the user has opened + unlocked.
      narrate(id, { speakIt: state.open && state.unlocked && !state.muted });
    },
    { threshold: [0.35, 0.6], rootMargin: '-10% 0px -35% 0px' }
  );

  sections.forEach((section) => observer.observe(section));
}

/* ========================================================================== */
/*  3D character (Three.js)                                                   */
/* ========================================================================== */
function initCharacter() {
  if (!refs.canvasWrap) return;

  const modelUrl = guideEl.getAttribute('data-model-url') || '';
  let renderer, scene, camera, mixer, clock, rafId;
  let avatar = null;
  let disposed = false;

  try {
    scene = new THREE.Scene();

    const wrap = refs.canvasWrap;
    const w = Math.max(wrap.clientWidth, 1);
    const h = Math.max(wrap.clientHeight, 1);

    camera = new THREE.PerspectiveCamera(38, w / h, 0.1, 100);
    camera.position.set(0, 1.5, 3.4);
    camera.lookAt(0, 1.25, 0);

    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.8));
    renderer.setSize(w, h, false);
    if ('outputColorSpace' in renderer && THREE.SRGBColorSpace) {
      renderer.outputColorSpace = THREE.SRGBColorSpace;
    }
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.05;
    wrap.appendChild(renderer.domElement);

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
      if (disposed || !renderer) return;
      const nw = Math.max(wrap.clientWidth, 1);
      const nh = Math.max(wrap.clientHeight, 1);
      renderer.setSize(nw, nh, false);
      camera.aspect = nw / nh;
      camera.updateProjectionMatrix();
    };
    window.addEventListener('resize', onResize);

    const animate = () => {
      if (disposed) return;
      rafId = window.requestAnimationFrame(animate);
      const dt = clock.getDelta();
      if (mixer) mixer.update(dt);
      if (avatar && !prefersReducedMotion && !avatar.userData.hasClip) {
        // Gentle idle for the procedural placeholder: slow turn + breathing bob.
        avatar.rotation.y += dt * 0.25;
        avatar.position.y = avatar.userData.baseY + Math.sin(clock.elapsedTime * 1.6) * 0.02;
        // Subtle "talking" scale pulse while speaking.
        const talk = state.playing && !prefersReducedMotion ? 1 + Math.sin(clock.elapsedTime * 12) * 0.012 : 1;
        if (avatar.userData.head) avatar.userData.head.scale.setScalar(talk);
      }
      renderer.render(scene, camera);
    };
    animate();

    const fitAndAdd = (object3d) => {
      // Center on X/Z, sit on ground, scale to a consistent height.
      const box = new THREE.Box3().setFromObject(object3d);
      const size = new THREE.Vector3();
      const center = new THREE.Vector3();
      box.getSize(size);
      box.getCenter(center);
      const targetHeight = 2.0;
      const scale = size.y > 0 ? targetHeight / size.y : 1;
      object3d.scale.setScalar(scale);
      object3d.position.x -= center.x * scale;
      object3d.position.z -= center.z * scale;
      object3d.position.y -= box.min.y * scale;
      object3d.userData.baseY = object3d.position.y;
      const group = new THREE.Group();
      group.add(object3d);
      group.userData.baseY = 0;
      avatar = group;
      scene.add(group);
    };

    const buildPlaceholder = () => {
      // A clearly-stylized stand-in figure in heritage gold.
      const figure = new THREE.Group();
      const gold = new THREE.MeshStandardMaterial({ color: 0xc9a44e, roughness: 0.5, metalness: 0.15 });
      const cream = new THREE.MeshStandardMaterial({ color: 0xf3e3bd, roughness: 0.6 });

      const skirt = new THREE.Mesh(new THREE.ConeGeometry(0.62, 1.25, 32), gold);
      skirt.position.y = 0.62;
      figure.add(skirt);

      const torso = new THREE.Mesh(new THREE.CylinderGeometry(0.26, 0.4, 0.7, 24), gold);
      torso.position.y = 1.4;
      figure.add(torso);

      const shawl = new THREE.Mesh(new THREE.SphereGeometry(0.42, 24, 16, 0, Math.PI * 2, 0, Math.PI / 2), cream);
      shawl.position.y = 1.55;
      figure.add(shawl);

      const head = new THREE.Mesh(new THREE.SphereGeometry(0.27, 28, 28), cream);
      head.position.y = 2.0;
      figure.add(head);

      const bun = new THREE.Mesh(new THREE.SphereGeometry(0.16, 20, 20), gold);
      bun.position.set(0, 2.12, -0.2);
      figure.add(bun);

      figure.userData.head = head;
      fitAndAdd(figure);
      avatar.userData.head = head;
      if (refs.loading) refs.loading.textContent = 'Placeholder · add ana-kalang.glb';
    };

    if (modelUrl) {
      const loader = new GLTFLoader();
      loader.load(
        modelUrl,
        (gltf) => {
          if (disposed) return;
          const root = gltf.scene || (gltf.scenes && gltf.scenes[0]);
          if (!root) {
            buildPlaceholder();
          } else {
            // Skinned characters push their vertices past the bounding sphere
            // three.js measured at load time, so the renderer frustum-culls
            // (hides) them mid-animation. Disable culling so Ana Kalang stays
            // visible through the whole idle loop.
            root.traverse((obj) => {
              if (obj.isMesh || obj.isSkinnedMesh) obj.frustumCulled = false;
            });
            fitAndAdd(root);
            if (gltf.animations && gltf.animations.length) {
              mixer = new THREE.AnimationMixer(root);
              // Prefer an idle clip if the file names one, else the first clip.
              const clip = gltf.animations.find((c) => /idle/i.test(c.name || '')) || gltf.animations[0];
              const action = mixer.clipAction(clip);
              action.setLoop(THREE.LoopRepeat, Infinity); // loop forever
              action.clampWhenFinished = false;
              action.play();
              // The rigged clip already gives the figure life, so skip the
              // procedural spin/bob below — it would fight the clip's motion.
              avatar.userData.hasClip = true;
            }
          }
          if (refs.loading) refs.loading.remove();
        },
        undefined,
        (err) => {
          // Model failed to load → show placeholder so the guide still works.
          console.warn('[Ana Kalang] Model failed to load:', modelUrl, err);
          if (disposed) return;
          buildPlaceholder();
        }
      );
    } else {
      buildPlaceholder();
    }

    window.addEventListener('beforeunload', () => {
      disposed = true;
      if (rafId) window.cancelAnimationFrame(rafId);
      window.removeEventListener('resize', onResize);
      renderer?.dispose();
    });
  } catch (err) {
    console.warn('[Ana Kalang] 3D character unavailable; running text + voice only.', err);
    if (refs.loading) refs.loading.textContent = '';
  }
}

/* ========================================================================== */
/*  Boot                                                                      */
/* ========================================================================== */
if (guideEl) {
  // Seed the opening bubble (silent until the user opts in).
  narrate('hero', { speakIt: false });
  initCharacter();
  observeSections();

  // Reveal the launcher shortly after load so it doesn't fight the hero.
  window.setTimeout(() => {
    if (!state.open) launcherEl.removeAttribute('hidden');
  }, 1800);
}
