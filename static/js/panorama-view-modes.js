import * as THREE from "three";

/*
 * Shared 360 viewing modes for a Pannellum viewer:
 * - device-orientation "magic window"
 * - native WebXR immersive-vr
 * - gyro-driven, split-screen VR Box fallback
 */
export function createPanoramaViewModes(options) {
  const getViewer = options.getViewer;
  const getPanoramaSource = options.getPanoramaSource;
  const gyroButton = options.gyroButton;
  const vrButton = options.vrButton;
  const overlay = options.overlay;
  const stage = options.stage;
  const status = options.status;
  const exitButton = options.exitButton;
  const interactionElement = options.interactionElement;
  const notify = typeof options.notify === "function" ? options.notify : function () {};
  const translate = typeof options.translate === "function"
    ? options.translate
    : function (english) { return english; };
  const activeRootClass = options.activeRootClass || "panorama-vr-active";

  const gyro = {
    enabled: false,
    hasReading: false,
    needsSync: true,
    dragging: false,
    yaw: 0,
    pitch: 0,
    yawOffset: 0,
    pitchOffset: 0,
    rafId: 0,
    readingTimer: 0,
    onOrientation: null,
  };
  const vr = {
    mode: "",
    nativeSupported: false,
    renderer: null,
    scene: null,
    camera: null,
    stereo: null,
    sphere: null,
    material: null,
    texture: null,
    rafId: 0,
    session: null,
    exiting: false,
    fullscreenOwned: false,
    width: 0,
    height: 0,
    lastTapAt: 0,
  };

  const orientationEuler = new THREE.Euler();
  const orientationQuaternion = new THREE.Quaternion();
  const screenQuaternion = new THREE.Quaternion();
  const lookQuaternion = new THREE.Quaternion().setFromAxisAngle(
    new THREE.Vector3(1, 0, 0),
    -Math.PI / 2,
  );
  const zAxis = new THREE.Vector3(0, 0, 1);

  function tr(english, tagalog) {
    return translate(english, tagalog);
  }

  function updateButtons() {
    if (gyroButton) {
      gyroButton.setAttribute("aria-pressed", String(gyro.enabled));
      gyroButton.setAttribute(
        "aria-label",
        gyro.enabled ? "Turn off gyro look" : "Turn on gyro look",
      );
    }
    if (vrButton) {
      const active = Boolean(vr.mode);
      vrButton.setAttribute("aria-pressed", String(active));
      vrButton.setAttribute("aria-label", active ? "Exit VR mode" : "Enter VR mode");
    }
  }

  function applyGyroReading() {
    gyro.rafId = 0;
    const viewer = getViewer();
    if (!gyro.enabled || !gyro.hasReading || gyro.dragging || !viewer) {
      return;
    }

    // DeviceOrientation and Pannellum use opposite horizontal directions.
    // Negating this value makes a physical right turn move the view right.
    const pannellumYaw = -gyro.yaw;
    if (gyro.needsSync) {
      try {
        gyro.yawOffset = viewer.getYaw() - pannellumYaw;
        gyro.pitchOffset = viewer.getPitch() - gyro.pitch;
      } catch {
        return;
      }
      gyro.needsSync = false;
    }

    try {
      const yaw = ((pannellumYaw + gyro.yawOffset + 540) % 360) - 180;
      const pitch = Math.max(-85, Math.min(85, gyro.pitch + gyro.pitchOffset));
      viewer.setYaw(yaw, false);
      viewer.setPitch(pitch, false);
    } catch {
      // Pannellum may be between scenes.
    }
  }

  function readOrientation(event) {
    if (!gyro.enabled || event.alpha === null || event.alpha === undefined) {
      return;
    }

    window.clearTimeout(gyro.readingTimer);
    gyro.readingTimer = 0;
    gyro.hasReading = true;

    const degToRad = Math.PI / 180;
    const alpha = Number(event.alpha || 0) * degToRad;
    const beta = Number(event.beta || 0) * degToRad;
    const gamma = Number(event.gamma || 0) * degToRad;
    const screenAngle = Number(
      (window.screen && window.screen.orientation && window.screen.orientation.angle)
        || window.orientation
        || 0,
    ) * degToRad;

    orientationEuler.set(beta, alpha, -gamma, "YXZ");
    orientationQuaternion.setFromEuler(orientationEuler);
    orientationQuaternion.multiply(lookQuaternion);
    screenQuaternion.setFromAxisAngle(zAxis, -screenAngle);
    orientationQuaternion.multiply(screenQuaternion);
    orientationEuler.setFromQuaternion(orientationQuaternion, "YXZ");

    gyro.yaw = THREE.MathUtils.radToDeg(orientationEuler.y);
    gyro.pitch = THREE.MathUtils.radToDeg(orientationEuler.x);
    if (!gyro.rafId) {
      gyro.rafId = window.requestAnimationFrame(applyGyroReading);
    }
  }

  async function setGyroEnabled(enabled, settings) {
    const quiet = settings && settings.quiet;
    if (!enabled) {
      window.clearTimeout(gyro.readingTimer);
      gyro.readingTimer = 0;
      if (gyro.onOrientation) {
        window.removeEventListener("deviceorientation", gyro.onOrientation, true);
        gyro.onOrientation = null;
      }
      gyro.enabled = false;
      gyro.hasReading = false;
      gyro.needsSync = true;
      updateButtons();
      return true;
    }

    if (!getViewer()) {
      throw new Error(tr(
        "The 360 view is still loading. Please try again.",
        "Naglo-load pa ang 360 na tanaw. Subukang muli.",
      ));
    }
    if (typeof window.DeviceOrientationEvent === "undefined") {
      throw new Error(tr(
        "This device does not report motion or orientation.",
        "Walang motion o orientation sensor na ibinibigay ang device na ito.",
      ));
    }

    if (typeof window.DeviceOrientationEvent.requestPermission === "function") {
      let response = "";
      try {
        response = await window.DeviceOrientationEvent.requestPermission();
      } catch {
        throw new Error(tr(
          "Motion permission could not be requested. Use HTTPS and try again.",
          "Hindi mahingi ang pahintulot sa motion. Gumamit ng HTTPS at subukang muli.",
        ));
      }
      if (response !== "granted") {
        throw new Error(tr(
          "Motion access was denied. Allow Motion & Orientation Access, then try again.",
          "Hindi pinayagan ang motion access. Payagan ang Motion & Orientation Access at subukang muli.",
        ));
      }
    }

    if (gyro.onOrientation) {
      window.removeEventListener("deviceorientation", gyro.onOrientation, true);
    }
    gyro.onOrientation = readOrientation;
    window.addEventListener("deviceorientation", gyro.onOrientation, true);
    gyro.enabled = true;
    gyro.hasReading = false;
    gyro.needsSync = true;
    updateButtons();

    gyro.readingTimer = window.setTimeout(function () {
      if (!gyro.enabled || gyro.hasReading) {
        return;
      }
      void setGyroEnabled(false);
      notify(
        tr("Gyro unavailable", "Hindi magamit ang gyro"),
        tr(
          "No motion reading was received. Check browser sensor permissions and use HTTPS.",
          "Walang natanggap na motion reading. Suriin ang sensor permission ng browser at gumamit ng HTTPS.",
        ),
        6500,
      );
    }, 2200);

    if (!quiet) {
      notify(
        tr("Gyro look is on", "Naka-on ang gyro"),
        tr(
          "Move your phone to look around. Dragging resets your facing direction.",
          "Igalaw ang telepono upang lumingon. Ang pag-drag ay magtatakda muli ng direksiyong kaharap.",
        ),
        5000,
      );
    }
    return true;
  }

  function showVrOverlay(kind) {
    overlay.hidden = false;
    overlay.dataset.vrKind = kind;
    status.classList.remove("is-ready");
    status.textContent = tr("Preparing the VR view…", "Inihahanda ang VR na tanaw…");
    const exitLabel = exitButton.querySelector("span");
    if (exitLabel) {
      exitLabel.textContent = tr("Exit VR", "Isara ang VR");
    }
    document.documentElement.classList.add(activeRootClass);
  }

  function disposeVrWorld() {
    if (vr.rafId) {
      window.cancelAnimationFrame(vr.rafId);
      vr.rafId = 0;
    }
    if (vr.renderer) {
      vr.renderer.setAnimationLoop(null);
    }
    if (vr.texture) vr.texture.dispose();
    if (vr.material) vr.material.dispose();
    if (vr.sphere && vr.sphere.geometry) vr.sphere.geometry.dispose();
    if (vr.renderer) {
      vr.renderer.dispose();
      if (typeof vr.renderer.forceContextLoss === "function") {
        vr.renderer.forceContextLoss();
      }
      vr.renderer.domElement.remove();
    }
    vr.renderer = null;
    vr.scene = null;
    vr.camera = null;
    vr.stereo = null;
    vr.sphere = null;
    vr.material = null;
    vr.texture = null;
    vr.width = 0;
    vr.height = 0;
    stage.replaceChildren();
  }

  function resizeVrRenderer(force) {
    if (!vr.renderer || !vr.camera) {
      return;
    }
    const width = Math.max(1, window.innerWidth || document.documentElement.clientWidth || 1);
    const height = Math.max(1, window.innerHeight || document.documentElement.clientHeight || 1);
    if (!force && width === vr.width && height === vr.height) {
      return;
    }
    vr.width = width;
    vr.height = height;
    vr.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
    vr.renderer.setSize(width, height, false);
    vr.camera.aspect = width / height;
    vr.camera.updateProjectionMatrix();
  }

  function buildVrWorld(source) {
    if (!source) {
      throw new Error(tr(
        "The current panorama is unavailable for VR.",
        "Hindi magamit sa VR ang kasalukuyang panorama.",
      ));
    }
    disposeVrWorld();

    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: false,
      powerPreference: "high-performance",
    });
    renderer.setClearColor(0x000000, 1);
    if ("outputColorSpace" in renderer && THREE.SRGBColorSpace) {
      renderer.outputColorSpace = THREE.SRGBColorSpace;
    }
    renderer.domElement.setAttribute("aria-hidden", "true");
    stage.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x000000);
    const camera = new THREE.PerspectiveCamera(78, 1, 0.05, 40);
    camera.rotation.order = "YXZ";
    const viewer = getViewer();
    try {
      camera.rotation.x = THREE.MathUtils.degToRad(viewer.getPitch());
      camera.rotation.y = THREE.MathUtils.degToRad(-viewer.getYaw());
    } catch {
      // Keep a neutral starting view.
    }

    const geometry = new THREE.SphereGeometry(12, 72, 48);
    geometry.scale(-1, 1, 1);
    const material = new THREE.MeshBasicMaterial({ color: 0x17110a });
    const sphere = new THREE.Mesh(geometry, material);
    scene.add(sphere);

    vr.renderer = renderer;
    vr.scene = scene;
    vr.camera = camera;
    vr.sphere = sphere;
    vr.material = material;
    resizeVrRenderer(true);

    new THREE.TextureLoader().load(
      source,
      function (texture) {
        if (vr.material !== material) {
          texture.dispose();
          return;
        }
        if ("colorSpace" in texture && THREE.SRGBColorSpace) {
          texture.colorSpace = THREE.SRGBColorSpace;
        }
        vr.texture = texture;
        material.color.set(0xffffff);
        material.map = texture;
        material.needsUpdate = true;
        status.classList.add("is-ready");
      },
      undefined,
      function (error) {
        console.warn("[Panorama VR] Texture failed to load.", error);
        notify(
          tr("VR view unavailable", "Hindi mabuksan ang VR"),
          tr(
            "The current 360 image could not be prepared for VR. Please try again.",
            "Hindi maihanda ang kasalukuyang 360 na larawan para sa VR. Subukang muli.",
          ),
          6500,
        );
        requestVrExit();
      },
    );
  }

  function renderCardboard() {
    if (
      vr.mode !== "cardboard"
      || !vr.renderer
      || !vr.scene
      || !vr.camera
      || !vr.stereo
    ) {
      return;
    }

    resizeVrRenderer(false);
    const viewer = getViewer();
    try {
      vr.camera.rotation.x = THREE.MathUtils.degToRad(viewer.getPitch());
      vr.camera.rotation.y = THREE.MathUtils.degToRad(-viewer.getYaw());
    } catch {
      // Keep the most recent pose.
    }
    vr.camera.rotation.z = 0;
    vr.camera.updateWorldMatrix(true, false);

    const width = vr.width;
    const height = vr.height;
    const halfWidth = Math.floor(width / 2);
    vr.stereo.aspect = 0.5;
    vr.stereo.update(vr.camera);

    vr.renderer.setScissorTest(true);
    vr.renderer.setScissor(0, 0, halfWidth, height);
    vr.renderer.setViewport(0, 0, halfWidth, height);
    vr.renderer.render(vr.scene, vr.stereo.cameraL);
    vr.renderer.setScissor(halfWidth, 0, width - halfWidth, height);
    vr.renderer.setViewport(halfWidth, 0, width - halfWidth, height);
    vr.renderer.render(vr.scene, vr.stereo.cameraR);
    vr.renderer.setScissorTest(false);
    vr.renderer.setViewport(0, 0, width, height);

    vr.rafId = window.requestAnimationFrame(renderCardboard);
  }

  async function requestBestFullscreen() {
    const page = document.documentElement;
    try {
      if (page.requestFullscreen) {
        await page.requestFullscreen();
        return true;
      }
    } catch {
      // Try WebKit below.
    }
    try {
      if (page.webkitRequestFullscreen) {
        page.webkitRequestFullscreen();
        return Boolean(document.webkitFullscreenElement);
      }
    } catch {
      // Full page fullscreen is unavailable on iPhone.
    }
    return false;
  }

  async function enterCardboard() {
    try {
      await setGyroEnabled(true, { quiet: true });
    } catch (error) {
      notify(
        tr("VR motion unavailable", "Hindi magamit ang galaw para sa VR"),
        String(error && error.message ? error.message : error),
        6500,
      );
      return;
    }

    try {
      vr.mode = "cardboard";
      showVrOverlay("cardboard");
      buildVrWorld(getPanoramaSource());
      vr.stereo = new THREE.StereoCamera();
      vr.stereo.eyeSep = 0.064;
      updateButtons();
      renderCardboard();
    } catch (error) {
      vr.mode = "";
      disposeVrWorld();
      overlay.hidden = true;
      document.documentElement.classList.remove(activeRootClass);
      updateButtons();
      notify(
        tr("VR view unavailable", "Hindi mabuksan ang VR"),
        String(error && error.message ? error.message : error),
        6500,
      );
      return;
    }

    vr.fullscreenOwned = await requestBestFullscreen();
    try {
      await window.screen?.orientation?.lock?.("landscape");
    } catch {
      // Orientation lock is optional.
    }
    notify(
      tr("VR Box mode is ready", "Handa na ang VR Box mode"),
      tr(
        "Rotate to landscape and place the phone in your viewer. Double-tap or use Exit VR to leave.",
        "I-rotate sa landscape at ilagay ang telepono sa VR viewer. Mag-double tap o pindutin ang Isara ang VR upang lumabas.",
      ),
      vr.fullscreenOwned ? 6000 : 8500,
    );
  }

  async function enterNativeVr() {
    let session;
    try {
      session = await navigator.xr.requestSession("immersive-vr", {
        optionalFeatures: ["local-floor", "bounded-floor"],
      });
    } catch {
      notify(
        tr("VR session did not start", "Hindi nagsimula ang VR session"),
        tr(
          "The headset or browser declined the immersive VR session.",
          "Hindi pinayagan ng headset o browser ang immersive VR session.",
        ),
        6500,
      );
      return;
    }

    try {
      await setGyroEnabled(false);
      vr.mode = "native";
      vr.session = session;
      showVrOverlay("native");
      buildVrWorld(getPanoramaSource());
      vr.renderer.xr.enabled = true;
      vr.renderer.xr.setReferenceSpaceType("local");
      session.addEventListener("end", finishVrExit, { once: true });
      await vr.renderer.xr.setSession(session);
      vr.renderer.setAnimationLoop(function () {
        if (vr.scene && vr.camera) {
          vr.renderer.render(vr.scene, vr.camera);
        }
      });
      updateButtons();
    } catch (error) {
      console.warn("[Panorama VR] Native session setup failed.", error);
      try {
        await session.end();
      } catch {
        // Session already ended.
      }
      finishVrExit();
      notify(
        tr("VR view unavailable", "Hindi mabuksan ang VR"),
        tr(
          "The panorama could not be connected to the headset.",
          "Hindi maikonekta ang panorama sa headset.",
        ),
        6500,
      );
    }
  }

  function finishVrExit() {
    if (!vr.mode && !vr.exiting && !vr.renderer) {
      return;
    }
    const ownedFullscreen = vr.fullscreenOwned;
    vr.mode = "";
    vr.session = null;
    vr.exiting = false;
    vr.fullscreenOwned = false;
    disposeVrWorld();
    overlay.hidden = true;
    delete overlay.dataset.vrKind;
    document.documentElement.classList.remove(activeRootClass);
    try {
      window.screen?.orientation?.unlock?.();
    } catch {
      // Optional API.
    }
    if (ownedFullscreen) {
      if (document.fullscreenElement) {
        const ending = document.exitFullscreen && document.exitFullscreen();
        if (ending && typeof ending.catch === "function") {
          ending.catch(function () {});
        }
      } else if (document.webkitFullscreenElement) {
        try {
          document.webkitExitFullscreen?.();
        } catch {
          // Unsupported.
        }
      }
    }
    updateButtons();
    window.setTimeout(function () {
      const viewer = getViewer();
      try {
        if (viewer && typeof viewer.resize === "function") {
          viewer.resize();
        }
      } catch {
        // Viewer may be changing scenes.
      }
    }, 80);
  }

  function requestVrExit() {
    if (!vr.mode || vr.exiting) {
      return;
    }
    if (vr.mode === "native" && vr.session) {
      vr.exiting = true;
      const ending = vr.session.end();
      if (ending && typeof ending.catch === "function") {
        ending.catch(finishVrExit);
      }
      return;
    }
    finishVrExit();
  }

  async function onGyroClick() {
    try {
      await setGyroEnabled(!gyro.enabled);
    } catch (error) {
      updateButtons();
      notify(
        tr("Gyro unavailable", "Hindi magamit ang gyro"),
        String(error && error.message ? error.message : error),
        6500,
      );
    }
  }

  function onVrClick() {
    if (vr.mode) {
      requestVrExit();
      return;
    }
    if (vr.nativeSupported && navigator.xr) {
      void enterNativeVr();
      return;
    }
    void enterCardboard();
  }

  function onOverlayTouchEnd(event) {
    const exitTarget = event.target instanceof Element
      && event.target.closest("[data-panorama-vr-exit], #tourVrExit");
    if (vr.mode !== "cardboard" || exitTarget) {
      return;
    }
    const now = performance.now();
    if (now - vr.lastTapAt < 350) {
      requestVrExit();
      vr.lastTapAt = 0;
      return;
    }
    vr.lastTapAt = now;
  }

  function onPointerDown() {
    if (gyro.enabled) {
      gyro.dragging = true;
    }
  }

  function onPointerUp() {
    if (!gyro.dragging) {
      return;
    }
    gyro.dragging = false;
    gyro.needsSync = true;
  }

  function onOrientationChange() {
    if (gyro.enabled) {
      gyro.needsSync = true;
    }
  }

  function onKeyDown(event) {
    if (event.key === "Escape" && vr.mode) {
      requestVrExit();
    }
  }

  function onFullscreenChange() {
    const fullscreenElement = document.fullscreenElement || document.webkitFullscreenElement;
    if (vr.mode === "cardboard" && vr.fullscreenOwned && !fullscreenElement) {
      finishVrExit();
    }
  }

  gyroButton.addEventListener("click", onGyroClick);
  vrButton.addEventListener("click", onVrClick);
  exitButton.addEventListener("click", requestVrExit);
  overlay.addEventListener("touchend", onOverlayTouchEnd, { passive: true });
  interactionElement.addEventListener("pointerdown", onPointerDown);
  window.addEventListener("pointerup", onPointerUp);
  window.addEventListener("orientationchange", onOrientationChange);
  window.addEventListener("resize", resizeVrRenderer);
  window.addEventListener("keydown", onKeyDown);
  document.addEventListener("fullscreenchange", onFullscreenChange);
  document.addEventListener("webkitfullscreenchange", onFullscreenChange);

  const sensorCapable = typeof window.DeviceOrientationEvent !== "undefined"
    && (
      navigator.maxTouchPoints > 0
      || Boolean(window.matchMedia && window.matchMedia("(pointer: coarse)").matches)
    );
  gyroButton.disabled = !sensorCapable;
  gyroButton.setAttribute("aria-disabled", String(!sensorCapable));
  vrButton.disabled = !sensorCapable;
  vrButton.setAttribute("aria-disabled", String(!sensorCapable));

  if (navigator.xr && typeof navigator.xr.isSessionSupported === "function") {
    navigator.xr.isSessionSupported("immersive-vr").then(function (supported) {
      vr.nativeSupported = Boolean(supported);
      const available = vr.nativeSupported || sensorCapable;
      vrButton.disabled = !available;
      vrButton.setAttribute("aria-disabled", String(!available));
    }).catch(function () {
      // The Cardboard path remains available when a phone sensor exists.
    });
  }
  updateButtons();

  return {
    syncScene: function () {
      gyro.needsSync = true;
    },
    exitVr: requestVrExit,
    suspend: function () {
      requestVrExit();
      void setGyroEnabled(false);
    },
    destroy: function () {
      requestVrExit();
      void setGyroEnabled(false);
      gyroButton.removeEventListener("click", onGyroClick);
      vrButton.removeEventListener("click", onVrClick);
      exitButton.removeEventListener("click", requestVrExit);
      overlay.removeEventListener("touchend", onOverlayTouchEnd);
      interactionElement.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("pointerup", onPointerUp);
      window.removeEventListener("orientationchange", onOrientationChange);
      window.removeEventListener("resize", resizeVrRenderer);
      window.removeEventListener("keydown", onKeyDown);
      document.removeEventListener("fullscreenchange", onFullscreenChange);
      document.removeEventListener("webkitfullscreenchange", onFullscreenChange);
    },
  };
}
