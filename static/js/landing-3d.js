(function () {
  var introSection = document.querySelector(".landing-intro");
  var sceneContainer = document.getElementById("landingIntro3d");
  var startButton = document.getElementById("landingIntroStart");
  var churchButton = document.getElementById("landingIntroChurch");
  var statusElement = document.getElementById("landingIntroStatus");
  var autoStart = introSection ? introSection.getAttribute("data-auto-start") === "true" : false;
  var WEBXR_SCENE_API_URL = "/api/webxr/scene";
  var WEBXR_PREFETCH_STORAGE_KEY = "webxrSceneMetadataPrefetchV1";
  var WEBXR_PREFETCH_MAX_AGE_MS = 8 * 60 * 1000;
  var WEBXR_PREFETCH_CONCURRENCY = 4;
  var webxrPrefetchStarted = false;

  if (!introSection || !sceneContainer || !statusElement) {
    return;
  }

  if (!startButton && !autoStart) {
    return;
  }

  if (churchButton) {
    startWebxrPrefetch();
  }

  var THREE_NS = window.THREE;
  var gsapNs = window.gsap;
  var GLTFLoaderClass = THREE_NS ? THREE_NS.GLTFLoader || window.GLTFLoader : null;

  if (!THREE_NS || !GLTFLoaderClass || !gsapNs) {
    var missing = [];
    if (!THREE_NS) {
      missing.push("THREE");
    }
    if (!GLTFLoaderClass) {
      missing.push("GLTFLoader");
    }
    if (!gsapNs) {
      missing.push("GSAP");
    }

    setStatus("3D libraries did not load: " + missing.join(", ") + ". Please refresh and try again.", true);
    if (startButton) {
      startButton.disabled = true;
      startButton.textContent = "3D Unavailable";
    }
    return;
  }

  var modelPaths = {
    low: {
      wall: "/static/models/landing/wall.glb",
      gateLeft: "/static/models/landing/gate_left.glb",
      gateRight: "/static/models/landing/gate_right.glb",
      church: "/static/models/landing/church.glb",
    },
    high: {
      wall: "/static/models/landing/4k/wall.glb",
      gateLeft: "/static/models/landing/4k/gate_left.glb",
      gateRight: "/static/models/landing/4k/gate_right.glb",
      church: "/static/models/landing/4k/church.glb",
    },
  };

  var renderer = null;
  var scene = null;
  var camera = null;
  var animationFrameId = 0;
  var isDisposed = false;
  var introTimeline = null;

  var leftGatePivot = null;
  var rightGatePivot = null;
  var currentWallModel = null;
  var currentChurchModel = null;

  var baseCameraPosition = new THREE_NS.Vector3(0, 2.2, 12.4);
  var lookTarget = new THREE_NS.Vector3(0, 1.35, -0.2);

  initScene();
  loadModels();
  if (startButton) {
    startButton.addEventListener("click", startIntroAnimation);
  }
  window.addEventListener("resize", onResize);
  window.addEventListener("beforeunload", dispose);

  function setStatus(message, isError) {
    statusElement.textContent = message;
    statusElement.classList.toggle("is-error", Boolean(isError));
  }

  function startWebxrPrefetch() {
    if (webxrPrefetchStarted || !window.fetch || !window.sessionStorage) {
      return;
    }

    webxrPrefetchStarted = true;

    fetch(WEBXR_SCENE_API_URL, {
      cache: "no-store",
      credentials: "same-origin",
    })
      .then(function (response) {
        if (!response.ok) {
          throw new Error("Metadata request failed (" + response.status + ")");
        }
        return response.json();
      })
      .then(function (metadata) {
        if (!metadata || !metadata.scene) {
          return;
        }

        writePrefetchedWebxrMetadata(metadata);
        return prefetchWebxrAssets(collectWebxrPrefetchUrls(metadata));
      })
      .catch(function (error) {
        console.warn("[WebXR Prefetch] Unable to warm runtime assets.", error);
      });
  }

  function writePrefetchedWebxrMetadata(metadata) {
    var now = Date.now();
    var payload = {
      version: 1,
      zipOverride: "",
      storedAt: now,
      expiresAt: now + WEBXR_PREFETCH_MAX_AGE_MS,
      metadata: metadata,
    };

    try {
      window.sessionStorage.setItem(WEBXR_PREFETCH_STORAGE_KEY, JSON.stringify(payload));
    } catch (error) {
      console.warn("[WebXR Prefetch] Unable to persist metadata in sessionStorage.", error);
    }
  }

  function collectWebxrPrefetchUrls(metadata) {
    var scene = metadata && metadata.scene ? metadata.scene : {};
    var source = scene.source || {};
    var assets = scene.assets || {};
    var urls = [];

    if (typeof source.sparkModuleUrl === "string" && source.sparkModuleUrl) {
      urls.push(source.sparkModuleUrl);
    }

    if (typeof source.generatedConfigUrl === "string" && source.generatedConfigUrl) {
      urls.push(source.generatedConfigUrl);
    }

    [assets.splats, assets.meshes, assets.textures].forEach(function (group) {
      if (!Array.isArray(group)) {
        return;
      }

      group.forEach(function (asset) {
        if (asset && typeof asset.url === "string" && asset.url) {
          urls.push(asset.url);
        }
      });
    });

    var deduped = [];
    var seen = {};

    urls.forEach(function (url) {
      if (seen[url]) {
        return;
      }
      seen[url] = true;
      deduped.push(url);
    });

    return deduped;
  }

  function prefetchWebxrAssets(urls) {
    if (!Array.isArray(urls) || !urls.length || !window.fetch) {
      return Promise.resolve();
    }

    var pendingUrls = urls.slice();
    var workerCount = Math.min(WEBXR_PREFETCH_CONCURRENCY, pendingUrls.length);
    var workers = [];

    for (var i = 0; i < workerCount; i += 1) {
      workers.push(
        new Promise(function (resolve) {
          function consumeNext() {
            var nextUrl = pendingUrls.shift();
            if (!nextUrl) {
              resolve();
              return;
            }

            prefetchSingleWebxrAsset(nextUrl).finally(consumeNext);
          }

          consumeNext();
        })
      );
    }

    return Promise.allSettled(workers);
  }

  function prefetchSingleWebxrAsset(url) {
    return fetch(url, {
      cache: "force-cache",
      credentials: "same-origin",
    })
      .then(function (response) {
        if (!response.ok) {
          throw new Error("Asset request failed (" + response.status + ")");
        }
        return drainResponseBody(response);
      })
      .catch(function () {
        return null;
      });
  }

  function drainResponseBody(response) {
    if (!response || !response.body || typeof response.body.getReader !== "function") {
      return response.arrayBuffer().then(
        function () {
          return null;
        },
        function () {
          return null;
        }
      );
    }

    var reader = response.body.getReader();

    function readChunk() {
      return reader.read().then(function (result) {
        if (result.done) {
          return null;
        }
        return readChunk();
      });
    }

    return readChunk();
  }

  function initScene() {
    scene = new THREE_NS.Scene();
    scene.fog = new THREE_NS.Fog(0x120b08, 8, 34);

    camera = new THREE_NS.PerspectiveCamera(47, 1, 0.1, 150);
    camera.position.copy(baseCameraPosition);

    renderer = new THREE_NS.WebGLRenderer({ antialias: true, alpha: true });
    if ("outputColorSpace" in renderer && THREE_NS.SRGBColorSpace) {
      renderer.outputColorSpace = THREE_NS.SRGBColorSpace;
    } else if ("outputEncoding" in renderer && THREE_NS.sRGBEncoding) {
      renderer.outputEncoding = THREE_NS.sRGBEncoding;
    }
    renderer.toneMapping = THREE_NS.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.04;

    sceneContainer.appendChild(renderer.domElement);

    var hemisphereLight = new THREE_NS.HemisphereLight(0xffe0bc, 0x1f1a16, 0.78);
    hemisphereLight.position.set(0, 12, 0);
    scene.add(hemisphereLight);

    var keyLight = new THREE_NS.DirectionalLight(0xffd2a1, 1.3);
    keyLight.position.set(7, 8, 8);
    scene.add(keyLight);

    var fillLight = new THREE_NS.DirectionalLight(0x7e96b8, 0.42);
    fillLight.position.set(-5, 5, -4);
    scene.add(fillLight);

    var foregroundLight = new THREE_NS.PointLight(0xffb777, 0.75, 24);
    foregroundLight.position.set(0, 2.5, 4.2);
    scene.add(foregroundLight);

    var ground = new THREE_NS.Mesh(
      new THREE_NS.CircleGeometry(24, 72),
      new THREE_NS.MeshStandardMaterial({
        color: 0x2e241f,
        roughness: 0.95,
        metalness: 0.02,
      })
    );
    ground.rotation.x = -Math.PI * 0.5;
    ground.position.y = -0.02;
    scene.add(ground);

    var hazePlane = new THREE_NS.Mesh(
      new THREE_NS.PlaneGeometry(16, 7),
      new THREE_NS.MeshBasicMaterial({
        color: 0xffffff,
        transparent: true,
        opacity: 0.06,
        depthWrite: false,
      })
    );
    hazePlane.position.set(0, 1.9, 2.8);
    scene.add(hazePlane);

    onResize();
    animate();
  }

  function loadModels() {
    setStatus("Loading 3D assets...");

    var loadingManager = new THREE_NS.LoadingManager();
    loadingManager.onProgress = function (_url, loaded, total) {
      setStatus("Loading 3D assets (" + loaded + "/" + total + ")...");
    };

    var loader = new GLTFLoaderClass(loadingManager);

    Promise.all([
      loadModel(loader, modelPaths.low.wall),
      loadModel(loader, modelPaths.low.gateLeft),
      loadModel(loader, modelPaths.low.gateRight),
      loadModel(loader, modelPaths.low.church),
    ])
      .then(function (assets) {
        if (isDisposed) {
          return;
        }

        var wallModel = getSceneRoot(assets[0]);
        var leftGateModel = getSceneRoot(assets[1]);
        var rightGateModel = getSceneRoot(assets[2]);
        var churchModel = getSceneRoot(assets[3]);

        applyWallSetup(wallModel);
        currentWallModel = wallModel;
        scene.add(currentWallModel);

        applyChurchSetup(churchModel);
        currentChurchModel = churchModel;
        scene.add(currentChurchModel);

        var leftGateData = createGatePivot(leftGateModel, "left");
        var rightGateData = createGatePivot(rightGateModel, "right");

        leftGatePivot = leftGateData.pivot;
        rightGatePivot = rightGateData.pivot;

        leftGatePivot.position.set(-(leftGateData.width * 0.5) - 0.03, 0, 2);
        rightGatePivot.position.set((rightGateData.width * 0.5) + 0.03, 0, 2);

        scene.add(leftGatePivot);
        scene.add(rightGatePivot);

        if (startButton) {
          startButton.disabled = false;
          startButton.textContent = "Start";
        }

        if (autoStart) {
          startIntroAnimation();
        } else {
          setStatus("Scene ready. Click Start to open the gates.");
        }

        loadHighResModelsInBackground();
      })
      .catch(function (error) {
        console.error("[Landing Intro] Failed to load models", error);
        setStatus("Could not load the 3D intro assets. Please verify the GLB files.", true);
        if (startButton) {
          startButton.disabled = true;
          startButton.textContent = "Unavailable";
        }
      });
  }

  function loadHighResModelsInBackground() {
    var highLoader = new GLTFLoaderClass();

    Promise.allSettled([
      loadModel(highLoader, modelPaths.high.wall),
      loadModel(highLoader, modelPaths.high.gateLeft),
      loadModel(highLoader, modelPaths.high.gateRight),
      loadModel(highLoader, modelPaths.high.church),
    ])
      .then(function (results) {
        if (isDisposed) {
          return;
        }

        if (results[0].status === "fulfilled") {
          var nextWallModel = getSceneRoot(results[0].value);
          applyWallSetup(nextWallModel);
          replaceSceneModel("wall", nextWallModel);
        }

        if (results[3].status === "fulfilled") {
          var nextChurchModel = getSceneRoot(results[3].value);
          applyChurchSetup(nextChurchModel);
          replaceSceneModel("church", nextChurchModel);
        }

        if (results[1].status === "fulfilled" && leftGatePivot) {
          var nextLeftGateData = createGatePivot(getSceneRoot(results[1].value), "left");
          replaceGatePivotContent(leftGatePivot, nextLeftGateData, "left");
        }

        if (results[2].status === "fulfilled" && rightGatePivot) {
          var nextRightGateData = createGatePivot(getSceneRoot(results[2].value), "right");
          replaceGatePivotContent(rightGatePivot, nextRightGateData, "right");
        }
      })
      .catch(function (error) {
        console.warn("[Landing Intro] 4k background upgrade failed", error);
      });
  }

  function applyWallSetup(model) {
    prepareModel(model, 5.6);
    model.rotation.y = -Math.PI * 0.5;
    model.position.z = 0;
  }

  function applyChurchSetup(model) {
    prepareModel(model, 7.2);
    model.rotation.y = -Math.PI * 0.5;
    model.position.z = -20;
  }

  function replaceSceneModel(modelType, nextModel) {
    if (modelType === "wall") {
      if (currentWallModel) {
        nextModel.position.copy(currentWallModel.position);
        nextModel.quaternion.copy(currentWallModel.quaternion);
        nextModel.scale.copy(currentWallModel.scale);

        if (currentWallModel.parent) {
          currentWallModel.parent.remove(currentWallModel);
        }
      }

      currentWallModel = nextModel;
      scene.add(currentWallModel);
      return;
    }

    if (modelType === "church") {
      if (currentChurchModel) {
        nextModel.position.copy(currentChurchModel.position);
        nextModel.quaternion.copy(currentChurchModel.quaternion);
        nextModel.scale.copy(currentChurchModel.scale);

        if (currentChurchModel.parent) {
          currentChurchModel.parent.remove(currentChurchModel);
        }
      }

      currentChurchModel = nextModel;
      scene.add(currentChurchModel);
    }
  }

  function replaceGatePivotContent(targetPivot, nextGateData, side) {
    if (!targetPivot || !nextGateData || !nextGateData.pivot || !nextGateData.pivot.children.length) {
      return;
    }

    var nextGateMesh = nextGateData.pivot.children[0];

    while (targetPivot.children.length) {
      targetPivot.remove(targetPivot.children[0]);
    }

    targetPivot.add(nextGateMesh);

    var gateX = side === "left" ? -(nextGateData.width * 0.5) - 0.03 : (nextGateData.width * 0.5) + 0.03;
    targetPivot.position.x = gateX;
  }

  function loadModel(loader, path) {
    return new Promise(function (resolve, reject) {
      loader.load(path, resolve, undefined, reject);
    });
  }

  function getSceneRoot(gltf) {
    if (gltf.scene) {
      return gltf.scene;
    }
    if (gltf.scenes && gltf.scenes.length) {
      return gltf.scenes[0];
    }
    return new THREE_NS.Group();
  }

  function prepareModel(model, targetHeight) {
    model.traverse(function (node) {
      if (!node.isMesh) {
        return;
      }

      node.castShadow = false;
      node.receiveShadow = false;

      if (Array.isArray(node.material)) {
        node.material.forEach(normalizeMaterial);
      } else {
        normalizeMaterial(node.material);
      }
    });

    centerAndScaleToHeight(model, targetHeight);
    placeOnGround(model);
  }

  function normalizeMaterial(material) {
    if (!material) {
      return;
    }

    if (material.map && "colorSpace" in material.map && THREE_NS.SRGBColorSpace) {
      material.map.colorSpace = THREE_NS.SRGBColorSpace;
    } else if (material.map && "encoding" in material.map && THREE_NS.sRGBEncoding) {
      material.map.encoding = THREE_NS.sRGBEncoding;
    }

    if (typeof material.metalness === "number") {
      material.metalness = Math.min(material.metalness, 0.35);
    }

    if (typeof material.roughness === "number") {
      material.roughness = Math.max(material.roughness, 0.25);
    }

    material.needsUpdate = true;
  }

  function centerAndScaleToHeight(object, targetHeight) {
    object.updateMatrixWorld(true);

    var bounds = new THREE_NS.Box3().setFromObject(object);
    if (!bounds.isEmpty() && Number.isFinite(bounds.min.y) && Number.isFinite(bounds.max.y)) {
      var size = new THREE_NS.Vector3();
      var center = new THREE_NS.Vector3();
      bounds.getSize(size);
      bounds.getCenter(center);

      object.position.sub(center);

      var sourceHeight = size.y > 0 ? size.y : 1;
      var scaleFactor = targetHeight / sourceHeight;
      object.scale.multiplyScalar(scaleFactor);
      object.updateMatrixWorld(true);
    }
  }

  function placeOnGround(object) {
    object.updateMatrixWorld(true);

    var bounds = new THREE_NS.Box3().setFromObject(object);
    if (!bounds.isEmpty() && Number.isFinite(bounds.min.y)) {
      object.position.y -= bounds.min.y;
      object.updateMatrixWorld(true);
    }
  }

  function createGatePivot(gateModel, side) {
    prepareModel(gateModel, 3.2);
    gateModel.scale.y *= 0.715;
    placeOnGround(gateModel);

    gateModel.updateMatrixWorld(true);
    var bounds = new THREE_NS.Box3().setFromObject(gateModel);
    var size = new THREE_NS.Vector3();
    bounds.getSize(size);

    var pivot = new THREE_NS.Group();
    var hingeOffset = size.x * 0.5;
    gateModel.position.x += side === "left" ? hingeOffset : -hingeOffset;

    pivot.add(gateModel);

    return {
      pivot: pivot,
      width: size.x,
    };
  }

  function startIntroAnimation() {
    if (introTimeline || !leftGatePivot || !rightGatePivot) {
      return;
    }

    if (startButton && startButton.disabled) {
      return;
    }

    introSection.classList.add("landing-intro--started");
    statusElement.classList.add("hidden");
    if (startButton) {
      startButton.disabled = true;
      startButton.textContent = "Playing Intro...";
    }

    introTimeline = gsapNs.timeline({
      defaults: { ease: "power2.inOut" },
      onComplete: function () {
        introSection.classList.add("landing-intro--complete");
        if (startButton) {
          startButton.textContent = "Intro Complete";
        }
        if (churchButton) {
          churchButton.classList.remove("hidden");
        }
      },
    });

    introTimeline
      .to(leftGatePivot.rotation, { y: -Math.PI * 0.56, duration: 2.15 }, 0)
      .to(rightGatePivot.rotation, { y: Math.PI * 0.56, duration: 2.15 }, 0)
      .to(camera.position, { z: 7.3, y: 2.05, duration: 2.3 }, 0.2)
      .to(lookTarget, { z: -3.3, y: 1.58, duration: 2.6 }, 0.4)
      .to(camera.position, { z: -8.2, y: 2.35, duration: 3.2, ease: "power3.inOut" }, 2.25)
      .to(lookTarget, { z: -11.8, y: 2.15, duration: 3.2, ease: "power3.inOut" }, 2.25);
  }

  function animate(timestamp) {
    if (isDisposed) {
      return;
    }

    animationFrameId = window.requestAnimationFrame(animate);

    if (!introTimeline) {
      var driftT = timestamp * 0.00025;
      camera.position.x = baseCameraPosition.x + Math.sin(driftT) * 0.22;
      camera.position.y = baseCameraPosition.y + Math.sin(driftT * 1.5) * 0.05;
      camera.position.z = baseCameraPosition.z + Math.cos(driftT * 1.1) * 0.16;
    }

    camera.lookAt(lookTarget);
    renderer.render(scene, camera);
  }

  function onResize() {
    if (!renderer || !camera) {
      return;
    }

    var width = Math.max(sceneContainer.clientWidth, 1);
    var height = Math.max(sceneContainer.clientHeight, 1);

    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, window.innerWidth < 768 ? 1.2 : 1.6));
    renderer.setSize(width, height, false);

    camera.aspect = width / height;
    camera.fov = window.innerWidth < 768 ? 56 : 47;
    camera.updateProjectionMatrix();

    if (!introTimeline) {
      baseCameraPosition.set(0, window.innerWidth < 768 ? 2 : 2.2, window.innerWidth < 768 ? 10.4 : 12.4);
      camera.position.copy(baseCameraPosition);
      lookTarget.set(0, 1.35, -0.2);
    }
  }

  function dispose() {
    if (isDisposed) {
      return;
    }

    isDisposed = true;

    window.removeEventListener("resize", onResize);
    window.removeEventListener("beforeunload", dispose);

    if (animationFrameId) {
      window.cancelAnimationFrame(animationFrameId);
    }

    if (introTimeline) {
      introTimeline.kill();
      introTimeline = null;
    }

    if (renderer) {
      renderer.dispose();
      if (renderer.domElement && renderer.domElement.parentNode === sceneContainer) {
        sceneContainer.removeChild(renderer.domElement);
      }
    }
  }
})();
