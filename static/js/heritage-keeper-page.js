import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";

const viewer = document.querySelector("[data-hk-seal-viewer]");

if (viewer) {
  const canvas = viewer.querySelector("[data-hk-seal-canvas]");
  const loading = viewer.querySelector("[data-hk-seal-loading]");
  const help = viewer.querySelector("[data-hk-seal-help]");
  const errorMessage = viewer.querySelector("[data-hk-seal-error]");
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  let earnedFragments = [];

  try {
    earnedFragments = JSON.parse(viewer.dataset.earnedFragments || "[]").map(Boolean);
  } catch (error) {
    console.warn("[Heritage Keeper] Invalid fragment progress.", error);
  }

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(28, 1, 0.01, 100);
  const renderer = new THREE.WebGLRenderer({
    canvas,
    alpha: true,
    antialias: true,
    powerPreference: "high-performance",
  });

  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.setClearColor(0x000000, 0);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));

  const ambientLight = new THREE.HemisphereLight(0xffedc2, 0x170c03, 2.1);
  const keyLight = new THREE.DirectionalLight(0xffd982, 4.2);
  const rimLight = new THREE.DirectionalLight(0xd7e7ff, 2.2);
  keyLight.position.set(2.8, 3.6, 5.5);
  rimLight.position.set(-3.5, 1.5, -2.5);
  scene.add(ambientLight, keyLight, rimLight);

  const sealRoot = new THREE.Group();
  scene.add(sealRoot);

  let baseRotationX = 0;
  let baseRotationY = 0;
  let pointerActive = false;
  let pointerId = null;
  let pointerX = 0;
  let pointerY = 0;
  let ready = false;
  let frameId = 0;

  function cloneMaterial(material, earned) {
    const next = material.clone();
    next.transparent = !earned;
    next.opacity = earned ? 1 : 0.11;
    next.depthWrite = earned;
    next.side = THREE.DoubleSide;

    if (!earned) {
      if (next.color) next.color.set(0x75654e);
      if (next.emissive) {
        next.emissive.set(0x2b2012);
        next.emissiveIntensity = 0.24;
      }
      next.roughness = 1;
      next.metalness = 0;
    }

    next.needsUpdate = true;
    return next;
  }

  function configureFragment(node) {
    const match = String(node.name || "").match(/Seal_Fragment_(\d+)/i);
    if (!match) return;

    const index = Math.max(0, Number(match[1]) - 1);
    const earned = Boolean(earnedFragments[index]);
    node.userData.heritageFragmentIndex = index;
    node.userData.earned = earned;

    node.traverse((child) => {
      if (!child.isMesh) return;
      child.frustumCulled = false;
      child.renderOrder = earned ? 2 : 1;
      child.material = Array.isArray(child.material)
        ? child.material.map((material) => cloneMaterial(material, earned))
        : cloneMaterial(child.material, earned);
    });
  }

  function fitSealToView(model) {
    model.updateMatrixWorld(true);
    const bounds = new THREE.Box3().setFromObject(model);
    const center = bounds.getCenter(new THREE.Vector3());
    const size = bounds.getSize(new THREE.Vector3());
    const largest = Math.max(size.x, size.y, size.z, 0.001);

    model.position.sub(center);
    model.scale.setScalar(2.15 / largest);
    model.updateMatrixWorld(true);

    const fittedBounds = new THREE.Box3().setFromObject(model);
    const fittedCenter = fittedBounds.getCenter(new THREE.Vector3());
    model.position.sub(fittedCenter);

    camera.position.set(0, 0, 4.55);
    camera.lookAt(0, 0, 0);
  }

  function resizeRenderer() {
    const width = Math.max(1, viewer.clientWidth);
    const height = Math.max(1, viewer.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
  }

  function renderFrame(time) {
    if (!document.hidden) {
      const idleTurn = ready && !pointerActive && !reducedMotion.matches ? time * 0.00008 : 0;
      sealRoot.rotation.x += (baseRotationX - sealRoot.rotation.x) * 0.08;
      sealRoot.rotation.y += (baseRotationY + idleTurn - sealRoot.rotation.y) * 0.08;
      renderer.render(scene, camera);
    }
    frameId = window.requestAnimationFrame(renderFrame);
  }

  function finishPointer(event) {
    if (!pointerActive || (pointerId !== null && event.pointerId !== pointerId)) return;
    pointerActive = false;
    pointerId = null;
    viewer.classList.remove("is-dragging");
  }

  viewer.addEventListener("pointerdown", (event) => {
    if (!ready || event.button > 0) return;
    pointerActive = true;
    pointerId = event.pointerId;
    pointerX = event.clientX;
    pointerY = event.clientY;
    viewer.classList.add("is-dragging");
    viewer.setPointerCapture?.(event.pointerId);
  });

  viewer.addEventListener("pointermove", (event) => {
    if (!pointerActive || event.pointerId !== pointerId) return;
    const deltaX = event.clientX - pointerX;
    const deltaY = event.clientY - pointerY;
    pointerX = event.clientX;
    pointerY = event.clientY;
    baseRotationY += deltaX * 0.008;
    baseRotationX = THREE.MathUtils.clamp(baseRotationX + deltaY * 0.006, -0.45, 0.45);
  });

  viewer.addEventListener("pointerup", finishPointer);
  viewer.addEventListener("pointercancel", finishPointer);
  viewer.addEventListener("lostpointercapture", finishPointer);

  const resizeObserver = typeof window.ResizeObserver === "function"
    ? new ResizeObserver(resizeRenderer)
    : null;
  if (resizeObserver) {
    resizeObserver.observe(viewer);
  }
  window.addEventListener("resize", resizeRenderer, { passive: true });
  resizeRenderer();

  const loader = new GLTFLoader();
  loader.load(
    viewer.dataset.modelUrl,
    (gltf) => {
      gltf.scene.children.slice().forEach(configureFragment);
      fitSealToView(gltf.scene);
      sealRoot.add(gltf.scene);
      ready = true;
      viewer.classList.add("is-ready");
      if (loading) loading.hidden = true;
      if (help) help.hidden = false;
    },
    undefined,
    (error) => {
      console.error("[Heritage Keeper] Unable to load the seal model.", error);
      viewer.classList.add("has-error");
      if (loading) loading.hidden = true;
      if (errorMessage) errorMessage.hidden = false;
    }
  );

  frameId = window.requestAnimationFrame(renderFrame);

  window.addEventListener("pagehide", () => {
    window.cancelAnimationFrame(frameId);
    if (resizeObserver) {
      resizeObserver.disconnect();
    }
    window.removeEventListener("resize", resizeRenderer);
    renderer.dispose();
  }, { once: true });
}
