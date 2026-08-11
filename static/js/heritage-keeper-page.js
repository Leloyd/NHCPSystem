import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";

const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
const viewers = document.querySelectorAll("[data-hk-fragment-viewer]");

viewers.forEach((viewer) => {
  const canvas = viewer.querySelector("[data-hk-fragment-canvas]");
  const loading = viewer.querySelector("[data-hk-fragment-loading]");
  const help = viewer.querySelector("[data-hk-fragment-help]");
  const errorMessage = viewer.querySelector("[data-hk-fragment-error]");
  const showsWholeModel = viewer.hasAttribute("data-hk-whole-model-viewer");
  const runtimePieceCount = Math.max(0, Number.parseInt(viewer.dataset.runtimePieceCount || "0", 10) || 0);
  const runtimePieceLayout = viewer.dataset.runtimePieceLayout || "vertical";
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
    renderer.localClippingEnabled = runtimePieceCount > 0;
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
    let fittedModelSize = null;
    const runtimeClippingPlanes = [];

    const cameraDistance = 4.6;
    const modelFrameFill = showsWholeModel ? 0.74 : 0.78;

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

    function applyResponsiveModelFit() {
      if (!fittedModelSize) return;

      const verticalView = 2 * cameraDistance * Math.tan(THREE.MathUtils.degToRad(camera.fov * 0.5));
      const horizontalView = verticalView * camera.aspect;
      const availableDiameter = Math.min(verticalView, horizontalView) * modelFrameFill;
      const modelDiameter = Math.max(fittedModelSize.x, fittedModelSize.y, fittedModelSize.z, 0.001);

      displayRoot.scale.setScalar(availableDiameter / modelDiameter);
    }

    function fitFragmentsToView(modelRoot, completeBounds) {
      displayRoot.position.set(0, 0, 0);
      displayRoot.scale.setScalar(1);
      displayRoot.updateMatrixWorld(true);

      const center = completeBounds.getCenter(new THREE.Vector3());
      modelRoot.position.sub(center);
      fittedModelSize = completeBounds.getSize(new THREE.Vector3());
      camera.position.set(0, 0, cameraDistance);
      camera.lookAt(0, 0, 0);
      applyResponsiveModelFit();
    }

    function resizeRenderer() {
      const width = Math.max(1, viewer.clientWidth);
      const height = Math.max(1, viewer.clientHeight);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
      renderer.setSize(width, height, false);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      applyResponsiveModelFit();
    }

    function renderFrame(time) {
      if (!document.hidden) {
        const idleTilt = ready && !pointerActive && !reducedMotion.matches
          ? Math.sin(time * 0.00035) * 0.035
          : 0;
        displayRoot.rotation.x += (baseRotationX - displayRoot.rotation.x) * 0.08;
        displayRoot.rotation.y += (baseRotationY + idleTilt - displayRoot.rotation.y) * 0.08;
        if (runtimeClippingPlanes.length) {
          displayRoot.updateMatrixWorld(true);
          runtimeClippingPlanes.forEach(({ base, world }) => {
            world.copy(base).applyMatrix4(displayRoot.matrixWorld);
          });
        }
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

        if (runtimePieceCount > 0) {
          const center = completeBounds.getCenter(new THREE.Vector3());
          const size = completeBounds.getSize(new THREE.Vector3());
          const minX = completeBounds.min.x - center.x;
          const maxX = completeBounds.max.x - center.x;
          const sliceWidth = Math.max(0.0001, (maxX - minX) / runtimePieceCount);

          earnedFragments.slice(0, runtimePieceCount).forEach((earned, fragmentIndex) => {
            if (!earned) return;

            const clone = gltf.scene.clone(true);
            clone.position.sub(center);
            prepareFragment(clone, fragmentIndex);

            let leftBase;
            let rightBase;
            if (runtimePieceLayout === "radial") {
              // Number clockwise from the upper section. For the three-part
              // environment seal this maps museum to the upper piece, chapel
              // to lower-left, and underground to lower-right.
              const centerAngle = Math.PI * 0.5 + fragmentIndex * ((Math.PI * 2) / runtimePieceCount);
              const halfAngle = Math.PI / runtimePieceCount;
              const firstBoundary = centerAngle - halfAngle;
              const secondBoundary = centerAngle + halfAngle;
              leftBase = new THREE.Plane(
                new THREE.Vector3(-Math.sin(firstBoundary), Math.cos(firstBoundary), 0),
                0,
              );
              rightBase = new THREE.Plane(
                new THREE.Vector3(Math.sin(secondBoundary), -Math.cos(secondBoundary), 0),
                0,
              );
            } else {
              const sliceMin = minX + sliceWidth * fragmentIndex;
              const sliceMax = fragmentIndex === runtimePieceCount - 1
                ? maxX
                : minX + sliceWidth * (fragmentIndex + 1);
              leftBase = new THREE.Plane(new THREE.Vector3(1, 0, 0), -sliceMin);
              rightBase = new THREE.Plane(new THREE.Vector3(-1, 0, 0), sliceMax);
            }
            const leftWorld = leftBase.clone();
            const rightWorld = rightBase.clone();

            clone.traverse((child) => {
              if (!child.isMesh) return;
              const materials = Array.isArray(child.material) ? child.material : [child.material];
              materials.forEach((material) => {
                material.clippingPlanes = [leftWorld, rightWorld];
                material.clipIntersection = false;
                material.needsUpdate = true;
              });
            });

            runtimeClippingPlanes.push(
              { base: leftBase, world: leftWorld },
              { base: rightBase, world: rightWorld },
            );
            fragmentGroup.add(clone);
          });

          if (!fragmentGroup.children.length) {
            showViewerError(new Error("No recovered runtime seal pieces were available."));
            return;
          }

          fittedModelSize = size;
          camera.position.set(0, 0, cameraDistance);
          camera.lookAt(0, 0, 0);
          applyResponsiveModelFit();
          ready = true;
          viewer.classList.add("is-ready");
          if (loading) loading.hidden = true;
          if (help) help.hidden = false;
          return;
        }

        if (showsWholeModel) {
          prepareFragment(gltf.scene, 0);
          fragmentGroup.add(gltf.scene);
          fitFragmentsToView(gltf.scene, completeBounds);
          ready = true;
          viewer.classList.add("is-ready");
          if (loading) loading.hidden = true;
          if (help) help.hidden = false;
          return;
        }

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
