import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";

const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
const viewers = document.querySelectorAll("[data-hk-fragment-viewer]");

viewers.forEach((viewer) => {
  const canvas = viewer.querySelector("[data-hk-fragment-canvas]");
  const loading = viewer.querySelector("[data-hk-fragment-loading]");
  const help = viewer.querySelector("[data-hk-fragment-help]");
  const errorMessage = viewer.querySelector("[data-hk-fragment-error]");
  let earnedFragments = [];

  try {
    earnedFragments = JSON.parse(viewer.dataset.earnedFragments || "[]").map(Boolean);
  } catch (error) {
    console.warn("[Heritage Keeper] Invalid fragment progress.", error);
  }

  function showViewerError(error) {
    console.error("[Heritage Keeper] Unable to load recovered fragments.", error);
    viewer.classList.add("has-error");
    if (loading) loading.hidden = true;
    if (errorMessage) errorMessage.hidden = false;
  }

  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({
      canvas,
      alpha: true,
      antialias: true,
      powerPreference: "high-performance",
    });
  } catch (error) {
    showViewerError(error);
  }

  if (renderer) {
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(28, 1, 0.01, 100);
    const displayRoot = new THREE.Group();
    const fragmentGroup = new THREE.Group();

    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.setClearColor(0x000000, 0);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));

    const ambientLight = new THREE.HemisphereLight(0xffedc2, 0x170c03, 2.15);
    const keyLight = new THREE.DirectionalLight(0xffd982, 4.1);
    const fillLight = new THREE.DirectionalLight(0xc9dcff, 1.8);
    keyLight.position.set(3.2, 4.6, 6.5);
    fillLight.position.set(-4, 1.8, -2.5);
    scene.add(ambientLight, keyLight, fillLight, displayRoot);
    displayRoot.add(fragmentGroup);

    let baseRotationX = -0.08;
    let baseRotationY = 0;
    let pointerActive = false;
    let pointerId = null;
    let pointerX = 0;
    let pointerY = 0;
    let ready = false;
    let frameId = 0;

    function cloneMaterial(material) {
      const next = material.clone();
      next.transparent = false;
      next.opacity = 1;
      next.depthWrite = true;
      next.side = THREE.DoubleSide;
      next.needsUpdate = true;
      return next;
    }

    function prepareFragment(node, fragmentIndex) {
      node.userData.heritageFragmentIndex = fragmentIndex;
      node.traverse((child) => {
        if (!child.isMesh) return;
        child.frustumCulled = false;
        child.material = Array.isArray(child.material)
          ? child.material.map(cloneMaterial)
          : cloneMaterial(child.material);
      });
    }

    function fitFragmentsToView(modelRoot, completeBounds) {
      displayRoot.position.set(0, 0, 0);
      displayRoot.scale.setScalar(1);
      displayRoot.updateMatrixWorld(true);

      const center = completeBounds.getCenter(new THREE.Vector3());
      const size = completeBounds.getSize(new THREE.Vector3());
      const largest = Math.max(size.x, size.y, size.z, 0.001);

      modelRoot.position.sub(center);
      displayRoot.scale.setScalar(2.6 / largest);
      camera.position.set(0, 0, 4.6);
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
        const idleTilt = ready && !pointerActive && !reducedMotion.matches
          ? Math.sin(time * 0.00035) * 0.035
          : 0;
        displayRoot.rotation.x += (baseRotationX - displayRoot.rotation.x) * 0.08;
        displayRoot.rotation.y += (baseRotationY + idleTilt - displayRoot.rotation.y) * 0.08;
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
      baseRotationY += deltaX * 0.007;
      baseRotationX = THREE.MathUtils.clamp(baseRotationX + deltaY * 0.005, -0.5, 0.5);
    });

    viewer.addEventListener("pointerup", finishPointer);
    viewer.addEventListener("pointercancel", finishPointer);
    viewer.addEventListener("lostpointercapture", finishPointer);
    viewer.addEventListener("keydown", (event) => {
      if (!ready || !["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(event.key)) return;
      event.preventDefault();
      if (event.key === "ArrowLeft") baseRotationY -= 0.12;
      if (event.key === "ArrowRight") baseRotationY += 0.12;
      if (event.key === "ArrowUp") baseRotationX = Math.max(-0.5, baseRotationX - 0.08);
      if (event.key === "ArrowDown") baseRotationX = Math.min(0.5, baseRotationX + 0.08);
    });

    const resizeObserver = typeof window.ResizeObserver === "function"
      ? new ResizeObserver(resizeRenderer)
      : null;
    if (resizeObserver) resizeObserver.observe(viewer);
    window.addEventListener("resize", resizeRenderer, { passive: true });
    resizeRenderer();

    const loader = new GLTFLoader();
    loader.load(
      viewer.dataset.modelUrl,
      (gltf) => {
        gltf.scene.updateMatrixWorld(true);
        const completeBounds = new THREE.Box3().setFromObject(gltf.scene);
        const recoveredNodes = [];
        gltf.scene.children.slice().forEach((node) => {
          const match = String(node.name || "").match(/Seal_Fragment_(\d+)/i);
          if (!match) return;

          const fragmentIndex = Math.max(0, Number(match[1]) - 1);
          if (!earnedFragments[fragmentIndex]) {
            node.parent?.remove(node);
            return;
          }

          prepareFragment(node, fragmentIndex);
          recoveredNodes.push(node);
        });

        if (!recoveredNodes.length) {
          showViewerError(new Error("No recovered fragment meshes were found."));
          return;
        }

        recoveredNodes.sort((left, right) => left.userData.heritageFragmentIndex - right.userData.heritageFragmentIndex);
        fragmentGroup.add(gltf.scene);
        fitFragmentsToView(gltf.scene, completeBounds);
        ready = true;
        viewer.classList.add("is-ready");
        if (loading) loading.hidden = true;
        if (help) help.hidden = false;
      },
      undefined,
      showViewerError
    );

    frameId = window.requestAnimationFrame(renderFrame);

    window.addEventListener("pagehide", () => {
      window.cancelAnimationFrame(frameId);
      if (resizeObserver) resizeObserver.disconnect();
      window.removeEventListener("resize", resizeRenderer);
      renderer.dispose();
    }, { once: true });
  }
});
