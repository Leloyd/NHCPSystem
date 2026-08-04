import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";

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
  const getHotspots = typeof options.getHotspots === "function"
    ? options.getHotspots
    : function () { return []; };
  const activateHotspot = typeof options.activateHotspot === "function"
    ? options.activateHotspot
    : function () {};
  const closeHotspot = typeof options.closeHotspot === "function"
    ? options.closeHotspot
    : function () {};
  const changeHotspotLanguage = typeof options.changeHotspotLanguage === "function"
    ? options.changeHotspotLanguage
    : function () {};
  const activateNestedHotspot = typeof options.activateNestedHotspot === "function"
    ? options.activateNestedHotspot
    : function () {};
  const restoreHotspotNarration = typeof options.restoreHotspotNarration === "function"
    ? options.restoreHotspotNarration
    : function () {};
  const translate = typeof options.translate === "function"
    ? options.translate
    : function (english) { return english; };
  const activeRootClass = options.activeRootClass || "panorama-vr-active";
  const infoInitialZoom = Number.isFinite(Number(options.infoInitialZoom))
    ? Math.max(0.65, Number(options.infoInitialZoom))
    : 2;
  const infoMaxZoom = Number.isFinite(Number(options.infoMaxZoom))
    ? Math.max(infoInitialZoom, Number(options.infoMaxZoom))
    : 3;

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
    worldRoot: null,
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
    tapTimer: 0,
    targets: [],
    gazeTarget: null,
    gazeSince: 0,
    gazeLatchedTarget: null,
    activationLockedUntil: 0,
    controllers: [],
    infoCard: null,
    infoTarget: null,
    infoSourceRecord: null,
    infoControls: [],
    infoMode: "image",
    infoLanguage: "tl",
    infoSubtitlesOpen: false,
    infoZoom: 1,
    infoMediaRoot: null,
    infoSubtitleRoot: null,
    infoModelRoot: null,
    infoImageHotspotsVisible: true,
    infoDetail: null,
    infoLanguageControl: null,
    pendingSceneView: null,
    lastGazeDirection: new THREE.Vector3(0, 0, -1),
  };

  const orientationEuler = new THREE.Euler();
  const orientationQuaternion = new THREE.Quaternion();
  const screenQuaternion = new THREE.Quaternion();
  const lookQuaternion = new THREE.Quaternion().setFromAxisAngle(
    new THREE.Vector3(1, 0, 0),
    -Math.PI / 2,
  );
  const zAxis = new THREE.Vector3(0, 0, 1);
  const gazeDirection = new THREE.Vector3();
  const targetDirection = new THREE.Vector3();
  const controllerDirection = new THREE.Vector3();
  const controllerOrigin = new THREE.Vector3();
  const targetWorldPosition = new THREE.Vector3();
  const sceneTargetEuler = new THREE.Euler(0, 0, 0, "YXZ");
  const sceneGazeEuler = new THREE.Euler(0, 0, 0, "YXZ");
  const sceneTargetQuaternion = new THREE.Quaternion();
  const sceneGazeQuaternion = new THREE.Quaternion();
  const DWELL_MS = 1250;
  const GAZE_ANGLE_DEG = 6;

  function tr(english, tagalog) {
    return translate(english, tagalog);
  }

  function createCanvasTexture(draw) {
    const canvas = document.createElement("canvas");
    canvas.width = 256;
    canvas.height = 256;
    const context = canvas.getContext("2d");
    if (!context) {
      return null;
    }
    draw(context, canvas);
    const texture = new THREE.CanvasTexture(canvas);
    if ("colorSpace" in texture && THREE.SRGBColorSpace) {
      texture.colorSpace = THREE.SRGBColorSpace;
    }
    texture.needsUpdate = true;
    return texture;
  }

  function createHotspotTexture(type) {
    return createCanvasTexture(function (context, canvas) {
      const center = canvas.width / 2;
      context.clearRect(0, 0, canvas.width, canvas.height);
      context.beginPath();
      context.arc(center, center, 91, 0, Math.PI * 2);
      context.fillStyle = "rgba(13, 10, 4, 0.9)";
      context.fill();
      context.lineWidth = 12;
      context.strokeStyle = "#d4af6a";
      context.stroke();
      context.beginPath();
      context.arc(center, center, 71, 0, Math.PI * 2);
      context.lineWidth = 3;
      context.strokeStyle = "rgba(250, 247, 242, 0.72)";
      context.stroke();
      context.fillStyle = "#faf7f2";
      context.strokeStyle = "#faf7f2";
      context.lineCap = "round";
      context.lineJoin = "round";
      if (type === "scene") {
        context.lineWidth = 13;
        context.beginPath();
        context.moveTo(76, 128);
        context.lineTo(171, 128);
        context.moveTo(139, 91);
        context.lineTo(176, 128);
        context.lineTo(139, 165);
        context.stroke();
      } else {
        context.font = "700 112px Georgia, serif";
        context.textAlign = "center";
        context.textBaseline = "middle";
        context.fillText("i", center, 129);
      }
    });
  }

  function hotspotPosition(pitch, yaw, radius) {
    const pitchRad = THREE.MathUtils.degToRad(Number(pitch) || 0);
    const yawRad = THREE.MathUtils.degToRad(Number(yaw) || 0);
    const horizontal = Math.cos(pitchRad) * radius;
    return new THREE.Vector3(
      Math.sin(yawRad) * horizontal,
      Math.sin(pitchRad) * radius,
      -Math.cos(yawRad) * horizontal,
    );
  }

  function clearVrTargets() {
    vr.targets.forEach(function (record) {
      if (record.sprite && record.sprite.parent) {
        record.sprite.parent.remove(record.sprite);
      }
      if (record.sprite && record.sprite.material) {
        if (record.sprite.material.map) {
          record.sprite.material.map.dispose();
        }
        record.sprite.material.dispose();
      }
    });
    vr.targets = [];
    vr.gazeTarget = null;
    vr.gazeSince = 0;
    vr.gazeLatchedTarget = null;
    if (overlay) {
      overlay.classList.remove("is-targeting");
      overlay.style.setProperty("--vr-dwell-progress", "0");
    }
  }

  function buildVrTargets() {
    clearVrTargets();
    if (!vr.scene) {
      return;
    }
    let hotspots = [];
    try {
      hotspots = getHotspots() || [];
    } catch (error) {
      console.warn("[Panorama VR] Hotspots could not be read.", error);
    }
    hotspots.forEach(function (hotspot, index) {
      const pitch = Number(hotspot && hotspot.pitch);
      const yaw = Number(hotspot && hotspot.yaw);
      if (!hotspot || !Number.isFinite(pitch) || !Number.isFinite(yaw)) {
        return;
      }
      const texture = createHotspotTexture(hotspot.type === "scene" ? "scene" : "info");
      if (!texture) {
        return;
      }
      const material = new THREE.SpriteMaterial({
        map: texture,
        transparent: true,
        depthTest: false,
        depthWrite: false,
        sizeAttenuation: true,
      });
      const sprite = new THREE.Sprite(material);
      sprite.position.copy(hotspotPosition(pitch, yaw, 10.7));
      sprite.scale.setScalar(0.58);
      sprite.renderOrder = 20;
      sprite.userData.vrHotspotIndex = index;
      (vr.worldRoot || vr.scene).add(sprite);
      vr.targets.push({
        hotspot,
        sprite,
        direction: sprite.position.clone().normalize(),
      });
    });
  }

  function createInfoLabelTexture(label) {
    return createCanvasTexture(function (context, canvas) {
      context.clearRect(0, 0, canvas.width, canvas.height);
      context.fillStyle = "rgba(13, 10, 4, 0.94)";
      context.fillRect(0, 0, canvas.width, canvas.height);
      context.strokeStyle = "#d4af6a";
      context.lineWidth = 8;
      context.strokeRect(5, 5, canvas.width - 10, canvas.height - 10);
      context.fillStyle = "#faf7f2";
      context.textAlign = "center";
      context.textBaseline = "middle";
      context.font = "700 25px Georgia, serif";
      const words = String(label || tr("Artifact", "Artifact")).trim().split(/\s+/);
      const lines = [];
      let line = "";
      words.forEach(function (word) {
        const candidate = line ? `${line} ${word}` : word;
        if (context.measureText(candidate).width > 218 && line) {
          lines.push(line);
          line = word;
        } else {
          line = candidate;
        }
      });
      if (line) lines.push(line);
      lines.slice(0, 3).forEach(function (item, lineIndex) {
        context.fillText(item, 128, 101 + lineIndex * 32);
      });
      context.fillStyle = "#d4af6a";
      context.font = "600 14px Inter, sans-serif";
      context.fillText(tr("Look at a control to select", "Tumingin sa control upang piliin"), 128, 224);
    });
  }

  function createControlTexture(label) {
    return createCanvasTexture(function (context) {
      context.clearRect(0, 0, 256, 256);
      context.beginPath();
      context.arc(128, 128, 103, 0, Math.PI * 2);
      context.fillStyle = "rgba(13, 10, 4, 0.95)";
      context.fill();
      context.lineWidth = 9;
      context.strokeStyle = "#d4af6a";
      context.stroke();
      context.fillStyle = "#faf7f2";
      context.font = label.length > 2 ? "700 60px Inter, sans-serif" : "700 92px Inter, sans-serif";
      context.textAlign = "center";
      context.textBaseline = "middle";
      context.fillText(label, 128, 132);
    });
  }

  function createViewerBackdropTexture() {
    return createCanvasTexture(function (context, canvas) {
      const width = canvas.width;
      const height = canvas.height;
      const base = context.createLinearGradient(0, 0, 0, height);
      base.addColorStop(0, "#211b15");
      base.addColorStop(0.58, "#3d342a");
      base.addColorStop(1, "#15100c");
      context.fillStyle = base;
      context.fillRect(0, 0, width, height);

      const light = context.createRadialGradient(
        width * 0.5,
        height * 0.4,
        8,
        width * 0.5,
        height * 0.44,
        width * 0.62,
      );
      light.addColorStop(0, "rgba(250, 247, 242, 0.48)");
      light.addColorStop(0.42, "rgba(190, 171, 143, 0.22)");
      light.addColorStop(1, "rgba(13, 10, 4, 0)");
      context.fillStyle = light;
      context.fillRect(0, 0, width, height);

      context.save();
      context.scale(1, 0.32);
      const floorGlow = context.createRadialGradient(
        width * 0.5,
        height * 2.55,
        4,
        width * 0.5,
        height * 2.55,
        width * 0.46,
      );
      floorGlow.addColorStop(0, "rgba(212, 175, 106, 0.32)");
      floorGlow.addColorStop(1, "rgba(212, 175, 106, 0)");
      context.fillStyle = floorGlow;
      context.beginPath();
      context.arc(width * 0.5, height * 2.55, width * 0.46, 0, Math.PI * 2);
      context.fill();
      context.restore();

      const vignette = context.createRadialGradient(
        width * 0.5,
        height * 0.48,
        width * 0.25,
        width * 0.5,
        height * 0.48,
        width * 0.72,
      );
      vignette.addColorStop(0, "rgba(0, 0, 0, 0)");
      vignette.addColorStop(1, "rgba(0, 0, 0, 0.58)");
      context.fillStyle = vignette;
      context.fillRect(0, 0, width, height);
    });
  }

  function addVrInfoControl(label, x, y, action, scale, parent) {
    if (!vr.infoCard) {
      return null;
    }
    const texture = createControlTexture(label);
    if (!texture) {
      return null;
    }
    const material = new THREE.SpriteMaterial({
      map: texture,
      transparent: true,
      depthTest: false,
      depthWrite: false,
    });
    const sprite = new THREE.Sprite(material);
    const baseScale = scale || 0.28;
    sprite.position.set(x, y, 0.09);
    sprite.scale.setScalar(baseScale);
    sprite.renderOrder = 130;
    (parent || vr.infoCard).add(sprite);
    const record = {
      sprite,
      action,
      baseScale,
      hotspot: vr.infoTarget,
      isUi: true,
    };
    vr.infoControls.push(record);
    return record;
  }

  function updateVrInfoControlLabel(record, label) {
    const material = record && record.sprite && record.sprite.material;
    if (!material) {
      return;
    }
    const nextTexture = createControlTexture(label);
    if (!nextTexture) {
      return;
    }
    if (material.map) {
      material.map.dispose();
    }
    material.map = nextTexture;
    material.needsUpdate = true;
  }

  function disposeThreeObject(root) {
    if (!root) {
      return;
    }
    root.traverse(function (object) {
      if (object.geometry) object.geometry.dispose();
      if (!object.material) return;
      const materials = Array.isArray(object.material) ? object.material : [object.material];
      materials.forEach(function (material) {
        if (material.map) material.map.dispose();
        material.dispose();
      });
    });
    if (root.parent) root.parent.remove(root);
  }

  function setVrInfoSourceVisible(visible) {
    const sourceSprite = vr.infoSourceRecord && vr.infoSourceRecord.sprite;
    if (!sourceSprite) {
      return;
    }
    sourceSprite.visible = Boolean(visible);
  }

  function createSubtitleTexture(hotspot, language) {
    const subtitle = hotspot && hotspot.subtitle;
    const text = subtitle
      ? String(subtitle[language] || subtitle.en || subtitle.tl || "").trim()
      : "";
    if (!text) return null;

    const canvas = document.createElement("canvas");
    canvas.width = 1024;
    canvas.height = 640;
    const context = canvas.getContext("2d");
    if (!context) return null;
    context.fillStyle = "rgba(250, 247, 242, 0.97)";
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.strokeStyle = "#d4af6a";
    context.lineWidth = 10;
    context.strokeRect(7, 7, canvas.width - 14, canvas.height - 14);
    context.fillStyle = "#9a7428";
    context.font = "700 25px Inter, sans-serif";
    context.textAlign = "left";
    context.textBaseline = "top";
    context.fillText(language === "tl" ? "SALAYSAY" : "NARRATION", 54, 40);

    const paragraphs = text.split(/\n+/);
    const lines = [];
    context.font = "500 31px Georgia, serif";
    paragraphs.forEach(function (paragraph, paragraphIndex) {
      const words = paragraph.trim().split(/\s+/).filter(Boolean);
      let line = "";
      words.forEach(function (word) {
        const candidate = line ? `${line} ${word}` : word;
        if (context.measureText(candidate).width > 910 && line) {
          lines.push(line);
          line = word;
        } else {
          line = candidate;
        }
      });
      if (line) lines.push(line);
      if (paragraphIndex < paragraphs.length - 1) lines.push("");
    });
    let fontSize = 31;
    while (lines.length * (fontSize + 10) > 490 && fontSize > 21) {
      fontSize -= 2;
    }
    context.font = `500 ${fontSize}px Georgia, serif`;
    context.fillStyle = "#1c1208";
    const lineHeight = fontSize + 10;
    lines.slice(0, Math.floor(490 / lineHeight)).forEach(function (line, index) {
      context.fillText(line, 54, 92 + index * lineHeight);
    });

    const texture = new THREE.CanvasTexture(canvas);
    if ("colorSpace" in texture && THREE.SRGBColorSpace) texture.colorSpace = THREE.SRGBColorSpace;
    texture.needsUpdate = true;
    return texture;
  }

  function renderVrInfoSubtitle() {
    vr.infoControls
      .filter(function (record) { return record.controlArea === "subtitle"; })
      .forEach(function (record) { disposeThreeObject(record.sprite); });
    disposeThreeObject(vr.infoSubtitleRoot);
    vr.infoSubtitleRoot = null;
    vr.infoControls = vr.infoControls.filter(function (record) {
      return record.controlArea !== "subtitle";
    });
    if (!vr.infoCard || !vr.infoTarget || !vr.infoSubtitlesOpen) {
      return;
    }
    const texture = createSubtitleTexture(vr.infoDetail || vr.infoTarget, vr.infoLanguage);
    if (!texture) {
      vr.infoSubtitlesOpen = false;
      return;
    }
    const root = new THREE.Group();
    root.position.set(0, -1.62, 0.18);
    // Angle the lower reading panel toward the visitor. This keeps long
    // subtitles facing the eyes when the complete artifact viewer is zoomed.
    root.rotation.x = THREE.MathUtils.degToRad(-20);
    const panel = new THREE.Mesh(
      new THREE.PlaneGeometry(2.72, 1.55),
      new THREE.MeshBasicMaterial({
        map: texture,
        transparent: true,
        depthTest: false,
        depthWrite: false,
      }),
    );
    panel.renderOrder = 115;
    root.add(panel);
    vr.infoCard.add(root);
    vr.infoSubtitleRoot = root;

    const languageRecord = addVrInfoControl(
      vr.infoLanguage === "tl" ? "TL" : "EN",
      0.94,
      -0.6,
      function () {
        vr.infoLanguage = vr.infoLanguage === "tl" ? "en" : "tl";
        if (vr.infoDetail) {
          activateNestedHotspot(vr.infoTarget, vr.infoDetail, vr.infoLanguage);
        } else {
          changeHotspotLanguage(vr.infoTarget, vr.infoLanguage);
        }
        updateVrInfoControlLabel(
          vr.infoLanguageControl,
          vr.infoLanguage === "tl" ? "TL" : "EN",
        );
        renderVrInfoSubtitle();
      },
      0.25,
      root,
    );
    const closeRecord = addVrInfoControl("×", 1.24, -0.6, function () {
      vr.infoSubtitlesOpen = false;
      renderVrInfoSubtitle();
    }, 0.25, root);
    if (languageRecord) languageRecord.controlArea = "subtitle";
    if (closeRecord) closeRecord.controlArea = "subtitle";
  }

  function renderVrInfoMedia() {
    // Keep the panorama marker hidden while any of its image, model, subtitle,
    // or nested table details remain open.
    setVrInfoSourceVisible(false);
    vr.infoControls = vr.infoControls.filter(function (record) {
      return record.controlArea !== "media";
    });
    disposeThreeObject(vr.infoMediaRoot);
    vr.infoMediaRoot = null;
    vr.infoModelRoot = null;
    if (!vr.infoCard || !vr.infoTarget) {
      return;
    }
    const hotspot = vr.infoTarget;
    const detail = vr.infoDetail;
    const root = new THREE.Group();
    root.position.set(0, 0.12, 0.018);
    vr.infoCard.add(root);
    vr.infoMediaRoot = root;

    if (!detail && vr.infoMode === "model" && hotspot.glbSrc) {
      const loadingTexture = createInfoLabelTexture(tr("Preparing 3D model…", "Inihahanda ang 3D model…"));
      const loading = new THREE.Mesh(
        new THREE.PlaneGeometry(1.82, 1.04),
        new THREE.MeshBasicMaterial({ map: loadingTexture, depthTest: false, depthWrite: false }),
      );
      loading.renderOrder = 103;
      root.add(loading);
      new GLTFLoader().load(
        hotspot.glbSrc,
        function (gltf) {
          if (vr.infoMediaRoot !== root || vr.infoMode !== "model") {
            disposeThreeObject(gltf.scene);
            return;
          }
          disposeThreeObject(loading);
          const model = gltf.scene;
          const bounds = new THREE.Box3().setFromObject(model);
          const size = new THREE.Vector3();
          const center = new THREE.Vector3();
          bounds.getSize(size);
          bounds.getCenter(center);
          const largest = Math.max(size.x, size.y, size.z, 0.001);
          const fitScale = 1.25 / largest;
          model.scale.setScalar(fitScale);
          model.position.set(
            -center.x * fitScale,
            -center.y * fitScale,
            -center.z * fitScale,
          );
          model.position.y += 0.03;
          model.traverse(function (node) {
            if (node.isMesh) {
              node.frustumCulled = false;
              node.renderOrder = 106;
            }
          });
          root.add(new THREE.HemisphereLight(0xffffff, 0x6b4e24, 1.8));
          const light = new THREE.DirectionalLight(0xffffff, 2.2);
          light.position.set(1.5, 2, 2);
          root.add(light);
          const pivot = new THREE.Group();
          pivot.add(model);
          root.add(pivot);
          vr.infoModelRoot = pivot;
        },
        undefined,
        function () {
          if (vr.infoMediaRoot === root) {
            vr.infoMode = "image";
            renderVrInfoMedia();
          }
        },
      );
      return;
    }

    const imageSrc = detail && detail.imageSrc ? detail.imageSrc : hotspot.imageSrc;
    if (imageSrc) {
      new THREE.TextureLoader().load(
        imageSrc,
        function (texture) {
          if (vr.infoMediaRoot !== root || vr.infoMode !== "image") {
            texture.dispose();
            return;
          }
          if ("colorSpace" in texture && THREE.SRGBColorSpace) texture.colorSpace = THREE.SRGBColorSpace;
          const imageWidth = texture.image && texture.image.width ? texture.image.width : 1;
          const imageHeight = texture.image && texture.image.height ? texture.image.height : 1;
          const aspect = imageWidth / imageHeight;
          let width = 1.82;
          let height = width / aspect;
          if (height > 1.04) {
            height = 1.04;
            width = height * aspect;
          }
          const image = new THREE.Mesh(
            new THREE.PlaneGeometry(width, height),
            new THREE.MeshBasicMaterial({ map: texture, depthTest: false, depthWrite: false }),
          );
          image.renderOrder = 105;
          root.add(image);

          if (detail) {
            const backRecord = addVrInfoControl("←", -width * 0.42, height * 0.39, function () {
              vr.infoDetail = null;
              restoreHotspotNarration(vr.infoTarget, vr.infoLanguage);
              renderVrInfoMedia();
              if (vr.infoSubtitlesOpen) renderVrInfoSubtitle();
            }, 0.2, root);
            if (backRecord) backRecord.controlArea = "media";
            return;
          }

          const imageHotspots = Array.isArray(hotspot.imageHotspots)
            ? hotspot.imageHotspots.filter(function (item) {
                return item
                  && item.imageSrc
                  && Number.isFinite(Number(item.x))
                  && Number.isFinite(Number(item.y));
              })
            : [];
          if (!vr.infoImageHotspotsVisible) {
            return;
          }
          imageHotspots.forEach(function (item, index) {
            const x = (Math.min(100, Math.max(0, Number(item.x))) / 100 - 0.5) * width;
            const y = (0.5 - Math.min(100, Math.max(0, Number(item.y))) / 100) * height;
            const pinRecord = addVrInfoControl(String(index + 1), x, y, function () {
              vr.infoDetail = item;
              vr.infoMode = "image";
              activateNestedHotspot(vr.infoTarget, item, vr.infoLanguage);
              renderVrInfoMedia();
              if (vr.infoSubtitlesOpen) renderVrInfoSubtitle();
            }, 0.15, root);
            if (pinRecord) pinRecord.controlArea = "media";
          });
        },
        undefined,
        function () {},
      );
    }
  }

  function closeVrInfoCard() {
    if (!vr.infoCard) {
      return false;
    }
    const card = vr.infoCard;
    setVrInfoSourceVisible(true);
    if (card.parent) {
      card.parent.remove(card);
    }
    card.traverse(function (object) {
      if (object.geometry) object.geometry.dispose();
      if (object.material) {
        const materials = Array.isArray(object.material) ? object.material : [object.material];
        materials.forEach(function (material) {
          if (material.map) material.map.dispose();
          material.dispose();
        });
      }
    });
    vr.infoCard = null;
    vr.infoTarget = null;
    vr.infoSourceRecord = null;
    vr.infoControls = [];
    vr.infoMediaRoot = null;
    vr.infoSubtitleRoot = null;
    vr.infoModelRoot = null;
    vr.infoImageHotspotsVisible = true;
    vr.infoDetail = null;
    vr.infoLanguageControl = null;
    vr.activationLockedUntil = performance.now() + 450;
    return true;
  }

  function showVrInfoCard(hotspot, sourceRecord) {
    closeVrInfoCard();
    if (!vr.scene) {
      return;
    }
    const group = new THREE.Group();
    // Keep the opened content fixed to its panorama hotspot instead of
    // attaching it to the camera. Looking away therefore leaves the card in
    // that real 360 position, and looking back reveals it again.
    group.position.copy(hotspotPosition(hotspot.pitch, hotspot.yaw, 6.4));
    group.lookAt(0, 0, 0);
    group.scale.setScalar(infoInitialZoom);
    vr.infoCard = group;
    vr.infoTarget = hotspot;
    vr.infoSourceRecord = sourceRecord || null;
    setVrInfoSourceVisible(false);
    vr.infoMode = "image";
    vr.infoLanguage = hotspot.language === "en" ? "en" : "tl";
    vr.infoSubtitlesOpen = false;
    vr.infoZoom = infoInitialZoom;
    vr.infoImageHotspotsVisible = true;
    vr.infoDetail = null;
    vr.infoLanguageControl = null;

    const borderMaterial = new THREE.MeshBasicMaterial({
      color: 0xd4af6a,
      depthTest: false,
      depthWrite: false,
    });
    const border = new THREE.Mesh(new THREE.PlaneGeometry(2.08, 1.58), borderMaterial);
    border.renderOrder = 101;
    group.add(border);

    const panelMaterial = new THREE.MeshBasicMaterial({
      map: createViewerBackdropTexture(),
      color: 0xffffff,
      depthTest: false,
      depthWrite: false,
    });
    const panel = new THREE.Mesh(new THREE.PlaneGeometry(2, 1.5), panelMaterial);
    panel.position.z = 0.006;
    panel.renderOrder = 102;
    group.add(panel);

    (vr.worldRoot || vr.scene).add(group);
    renderVrInfoMedia();

    if (hotspot.glbSrc) {
      addVrInfoControl("3D", -0.72, -0.58, function () {
        if (vr.infoDetail) {
          vr.infoDetail = null;
          restoreHotspotNarration(vr.infoTarget, vr.infoLanguage);
          if (vr.infoSubtitlesOpen) renderVrInfoSubtitle();
        }
        vr.infoMode = vr.infoMode === "image" ? "model" : "image";
        renderVrInfoMedia();
      });
    }
    const imageHotspots = Array.isArray(hotspot.imageHotspots) ? hotspot.imageHotspots : [];
    const hasBilingualTableAudio = imageHotspots.some(function (item) {
      const audio = item && item.audioByLanguage;
      return Boolean(audio && audio.tl && audio.en);
    });
    const hasNestedSubtitle = imageHotspots.some(function (item) {
      return item && item.subtitle && (item.subtitle.tl || item.subtitle.en);
    });
    if (hasBilingualTableAudio) {
      let languageRecord = null;
      languageRecord = addVrInfoControl(
        vr.infoLanguage === "tl" ? "TL" : "EN",
        -0.72,
        -0.58,
        function () {
          vr.infoLanguage = vr.infoLanguage === "tl" ? "en" : "tl";
          if (vr.infoDetail) {
            activateNestedHotspot(vr.infoTarget, vr.infoDetail, vr.infoLanguage);
          } else {
            changeHotspotLanguage(vr.infoTarget, vr.infoLanguage);
          }
          updateVrInfoControlLabel(
            languageRecord,
            vr.infoLanguage === "tl" ? "TL" : "EN",
          );
          if (vr.infoSubtitlesOpen) renderVrInfoSubtitle();
        },
      );
      vr.infoLanguageControl = languageRecord;
    }
    if ((hotspot.subtitle && (hotspot.subtitle.tl || hotspot.subtitle.en)) || hasNestedSubtitle) {
      addVrInfoControl("CC", -0.36, -0.58, function () {
        vr.infoSubtitlesOpen = !vr.infoSubtitlesOpen;
        renderVrInfoSubtitle();
      });
    }
    if (imageHotspots.length) {
      addVrInfoControl("PIN", 0, -0.58, function () {
        vr.infoImageHotspotsVisible = !vr.infoImageHotspotsVisible;
        renderVrInfoMedia();
      });
    }
    addVrInfoControl("−", 0.36, -0.58, function () {
      vr.infoZoom = Math.max(0.65, vr.infoZoom - 0.2);
      vr.infoCard.scale.setScalar(vr.infoZoom);
    });
    addVrInfoControl("+", 0.72, -0.58, function () {
      vr.infoZoom = Math.min(infoMaxZoom, vr.infoZoom + 0.2);
      vr.infoCard.scale.setScalar(vr.infoZoom);
    });
    addVrInfoControl("×", 0.84, 0.58, function () {
      const target = vr.infoTarget;
      closeVrInfoCard();
      closeHotspot(target);
    });
  }

  function activateVrTarget(record) {
    if (!record || performance.now() < vr.activationLockedUntil) {
      return;
    }
    vr.activationLockedUntil = performance.now() + 900;
    vr.gazeSince = 0;
    vr.gazeLatchedTarget = record;
    if (record.action) {
      record.action();
      return;
    }
    if (record.hotspot.type === "scene") {
      const source = record.hotspot.source || {};
      const viewer = getViewer();
      const targetPitch = Number(
        record.hotspot.targetPitch ?? source.targetPitch,
      );
      const targetYaw = Number(
        record.hotspot.targetYaw ?? source.targetYaw,
      );
      let currentPitch = null;
      let currentYaw = null;
      try {
        currentPitch = Number(viewer && viewer.getPitch());
        currentYaw = Number(viewer && viewer.getYaw());
      } catch {
        // The captured gaze below remains sufficient for native WebXR.
      }
      vr.pendingSceneView = {
        pitch: Number.isFinite(targetPitch) ? targetPitch : null,
        yaw: Number.isFinite(targetYaw) ? targetYaw : null,
        currentPitch: Number.isFinite(currentPitch) ? currentPitch : null,
        currentYaw: Number.isFinite(currentYaw) ? currentYaw : null,
        gazeDirection: vr.lastGazeDirection.lengthSq() > 0
          ? vr.lastGazeDirection.clone().normalize()
          : null,
      };
    }
    if (record.hotspot.type !== "scene") {
      showVrInfoCard(record.hotspot, record);
    }
    try {
      activateHotspot(record.hotspot);
    } catch (error) {
      console.warn("[Panorama VR] Hotspot activation failed.", error);
    }
  }

  function updateVrGaze(camera, now) {
    const selectableTargets = vr.infoCard ? vr.infoControls : vr.targets;
    if (!camera) {
      return;
    }
    camera.getWorldDirection(gazeDirection);
    vr.lastGazeDirection.copy(gazeDirection);
    if (!selectableTargets.length) {
      vr.gazeTarget = null;
      vr.gazeSince = 0;
      vr.gazeLatchedTarget = null;
      overlay.classList.remove("is-targeting");
      overlay.style.setProperty("--vr-dwell-progress", "0");
      return;
    }
    let closest = null;
    let closestAngle = Infinity;
    camera.getWorldPosition(controllerOrigin);
    selectableTargets.forEach(function (record) {
      record.sprite.getWorldPosition(targetWorldPosition);
      targetDirection.copy(targetWorldPosition).sub(controllerOrigin).normalize();
      const angle = THREE.MathUtils.radToDeg(gazeDirection.angleTo(targetDirection));
      if (angle < closestAngle) {
        closestAngle = angle;
        closest = record;
      }
    });
    const selectionAngle = closest && closest.isUi ? 2.2 : GAZE_ANGLE_DEG;
    if (!closest || closestAngle > selectionAngle) {
      selectableTargets.forEach(function (record) {
        record.sprite.scale.setScalar(record.baseScale || 0.58);
        record.sprite.material.opacity = 0.86;
      });
      vr.gazeTarget = null;
      vr.gazeSince = 0;
      vr.gazeLatchedTarget = null;
      overlay.classList.remove("is-targeting");
      overlay.style.setProperty("--vr-dwell-progress", "0");
      return;
    }
    if (vr.gazeTarget !== closest) {
      vr.gazeTarget = closest;
      vr.gazeSince = now;
    }
    if (vr.gazeLatchedTarget === closest) {
      selectableTargets.forEach(function (record) {
        const baseScale = record.baseScale || 0.58;
        record.sprite.scale.setScalar(record === closest ? baseScale * 1.08 : baseScale);
        record.sprite.material.opacity = record === closest ? 1 : 0.75;
      });
      overlay.classList.remove("is-targeting");
      overlay.style.setProperty("--vr-dwell-progress", "0");
      return;
    }
    const progress = Math.min(1, Math.max(0, (now - vr.gazeSince) / DWELL_MS));
    selectableTargets.forEach(function (record) {
      const focused = record === closest;
      const baseScale = record.baseScale || 0.58;
      record.sprite.scale.setScalar(focused ? baseScale * (1.14 + progress * 0.24) : baseScale);
      record.sprite.material.opacity = focused ? 1 : 0.75;
    });
    overlay.classList.add("is-targeting");
    overlay.style.setProperty("--vr-dwell-progress", String(progress));
    if (progress >= 1) {
      activateVrTarget(closest);
    }
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
    if (vr.tapTimer) {
      window.clearTimeout(vr.tapTimer);
      vr.tapTimer = 0;
    }
    if (vr.renderer) {
      vr.renderer.setAnimationLoop(null);
    }
    closeVrInfoCard();
    clearVrTargets();
    vr.controllers.forEach(function (controller) {
      if (controller.userData && controller.userData.vrSelectHandler) {
        controller.removeEventListener("select", controller.userData.vrSelectHandler);
      }
      controller.children.slice().forEach(function (child) {
        if (!child.userData || !child.userData.panoramaVrRay) {
          return;
        }
        child.geometry?.dispose?.();
        child.material?.dispose?.();
        controller.remove(child);
      });
      if (controller.parent) controller.parent.remove(controller);
    });
    vr.controllers = [];
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
    vr.worldRoot = null;
    vr.camera = null;
    vr.stereo = null;
    vr.sphere = null;
    vr.material = null;
    vr.texture = null;
    vr.pendingSceneView = null;
    vr.lastGazeDirection.set(0, 0, -1);
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
    const worldRoot = new THREE.Group();
    scene.add(worldRoot);
    const camera = new THREE.PerspectiveCamera(78, 1, 0.05, 40);
    camera.rotation.order = "YXZ";
    scene.add(camera);
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
    // Pannellum yaw 0 is the horizontal center of an equirectangular image.
    // Three's inverted SphereGeometry places that center on -X, while this
    // camera / hotspot coordinate system uses -Z. Rotate only the panorama
    // by -90° so a Pannellum pitch/yaw lands on the same visible pixel in VR.
    sphere.rotation.y = -Math.PI / 2;
    worldRoot.add(sphere);

    vr.renderer = renderer;
    vr.scene = scene;
    vr.worldRoot = worldRoot;
    vr.camera = camera;
    vr.sphere = sphere;
    vr.material = material;
    resizeVrRenderer(true);
    buildVrTargets();

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

  function applyPendingVrSceneView() {
    const target = vr.pendingSceneView;
    vr.pendingSceneView = null;
    if (!target) {
      return;
    }

    const viewer = getViewer();
    let fallbackPitch = 0;
    let fallbackYaw = 0;
    try {
      fallbackPitch = Number(viewer.getPitch()) || 0;
      fallbackYaw = Number(viewer.getYaw()) || 0;
    } catch {
      // Neutral values are safe if the underlying viewer is unavailable.
    }
    const rawPitch = target.pitch !== null && Number.isFinite(Number(target.pitch))
      ? Number(target.pitch)
      : fallbackPitch;
    const rawYaw = target.yaw !== null && Number.isFinite(Number(target.yaw))
      ? Number(target.yaw)
      : fallbackYaw;
    const targetPitch = Math.max(-85, Math.min(85, rawPitch));
    const targetYaw = ((rawYaw % 360) + 540) % 360 - 180;

    if (vr.mode === "native" && vr.worldRoot) {
      const gaze = target.gazeDirection && target.gazeDirection.lengthSq() > 0
        ? target.gazeDirection.clone().normalize()
        : vr.lastGazeDirection.lengthSq() > 0
          ? vr.lastGazeDirection.clone().normalize()
        : new THREE.Vector3(0, 0, -1);
      const gazePitch = Math.asin(Math.max(-1, Math.min(1, gaze.y)));
      const gazeYaw = Math.atan2(gaze.x, -gaze.z);
      sceneTargetEuler.set(
        THREE.MathUtils.degToRad(targetPitch),
        THREE.MathUtils.degToRad(-targetYaw),
        0,
        "YXZ",
      );
      sceneGazeEuler.set(gazePitch, -gazeYaw, 0, "YXZ");
      sceneTargetQuaternion.setFromEuler(sceneTargetEuler).invert();
      sceneGazeQuaternion.setFromEuler(sceneGazeEuler);
      vr.worldRoot.quaternion.copy(sceneGazeQuaternion).multiply(sceneTargetQuaternion);
      return;
    }

    if (vr.worldRoot) {
      vr.worldRoot.quaternion.identity();
    }
    // Cardboard VR keeps the phone's live vertical look angle through a scene
    // change. The destination yaw still controls the intended walking
    // direction, but looking down / up no longer snaps back to level.
    const preservedPitch = target.currentPitch !== null
      && Number.isFinite(Number(target.currentPitch))
      ? Math.max(-85, Math.min(85, Number(target.currentPitch)))
      : targetPitch;
    const destinationYaw = Number.isFinite(targetYaw)
      ? targetYaw
      : target.currentYaw !== null && Number.isFinite(Number(target.currentYaw))
        ? ((Number(target.currentYaw) % 360) + 540) % 360 - 180
        : fallbackYaw;
    try {
      viewer.setYaw(destinationYaw, false);
      viewer.setPitch(preservedPitch, false);
    } catch {
      // The underlying viewer may still be completing its scene transition.
    }
    if (gyro.enabled && gyro.hasReading) {
      gyro.yawOffset = destinationYaw - (-gyro.yaw);
      gyro.pitchOffset = preservedPitch - gyro.pitch;
      gyro.needsSync = false;
    } else {
      gyro.needsSync = true;
    }
    if (vr.camera) {
      vr.camera.rotation.x = THREE.MathUtils.degToRad(preservedPitch);
      vr.camera.rotation.y = THREE.MathUtils.degToRad(-destinationYaw);
      vr.camera.rotation.z = 0;
    }
  }

  function refreshVrWorld() {
    if (!vr.mode || !vr.material) {
      return;
    }
    const source = getPanoramaSource();
    if (!source) {
      return;
    }
    closeVrInfoCard();
    buildVrTargets();
    applyPendingVrSceneView();
    status.classList.remove("is-ready");
    const material = vr.material;
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
        const previousTexture = vr.texture;
        vr.texture = texture;
        material.map = texture;
        material.color.set(0xffffff);
        material.needsUpdate = true;
        if (previousTexture && previousTexture !== texture) {
          previousTexture.dispose();
        }
        status.classList.add("is-ready");
      },
      undefined,
      function (error) {
        console.warn("[Panorama VR] Next scene texture failed to load.", error);
        notify(
          tr("Scene unavailable in VR", "Hindi mabuksan ang tanaw sa VR"),
          tr(
            "The next 360 image could not be prepared. Please try that hotspot again.",
            "Hindi maihanda ang susunod na 360 na larawan. Subukang piliin muli ang hotspot.",
          ),
          6500,
        );
      },
    );
  }

  function renderCardboard(now) {
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
    if (vr.infoModelRoot) {
      vr.infoModelRoot.rotation.y = (Number(now) || performance.now()) * 0.00028;
    }
    updateVrGaze(vr.camera, Number(now) || performance.now());

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

  function findControllerTarget(controller) {
    const selectableTargets = vr.infoCard ? vr.infoControls : vr.targets;
    if (!controller || !selectableTargets.length) {
      return null;
    }
    controller.updateWorldMatrix(true, false);
    controller.getWorldPosition(controllerOrigin);
    controller.getWorldQuaternion(orientationQuaternion);
    controllerDirection.set(0, 0, -1).applyQuaternion(orientationQuaternion).normalize();
    let closest = null;
    let closestAngle = Infinity;
    selectableTargets.forEach(function (record) {
      record.sprite.getWorldPosition(targetWorldPosition);
      targetDirection.copy(targetWorldPosition).sub(controllerOrigin).normalize();
      const angle = THREE.MathUtils.radToDeg(controllerDirection.angleTo(targetDirection));
      if (angle < closestAngle) {
        closestAngle = angle;
        closest = record;
      }
    });
    const selectionAngle = closest && closest.isUi ? 3 : 10;
    return closestAngle <= selectionAngle ? closest : null;
  }

  function setupNativeControllers() {
    if (!vr.renderer || !vr.scene) {
      return;
    }
    const rayGeometry = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(0, 0, -1),
    ]);
    for (let index = 0; index < 2; index += 1) {
      const controller = vr.renderer.xr.getController(index);
      const rayMaterial = new THREE.LineBasicMaterial({
        color: 0xd4af6a,
        transparent: true,
        opacity: 0.88,
      });
      const ray = new THREE.Line(rayGeometry.clone(), rayMaterial);
      ray.scale.z = 4;
      ray.userData.panoramaVrRay = true;
      controller.add(ray);
      const onSelect = function () {
        activateVrTarget(findControllerTarget(controller) || vr.gazeTarget);
      };
      controller.userData.vrSelectHandler = onSelect;
      controller.addEventListener("select", onSelect);
      vr.scene.add(controller);
      vr.controllers.push(controller);
    }
    rayGeometry.dispose();
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
        "Aim the center dot at a gold hotspot and hold, or tap once to select it. Double-tap or use Exit VR to leave.",
        "Itapat ang gitnang tuldok sa gold hotspot at manatili, o mag-tap nang isang beses upang piliin. Mag-double tap o pindutin ang Isara ang VR upang lumabas.",
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
      setupNativeControllers();
      vr.renderer.setAnimationLoop(function (time) {
        if (vr.scene && vr.camera) {
          const xrCamera = vr.renderer.xr.getCamera(vr.camera);
          const gazeCamera = xrCamera && xrCamera.cameras && xrCamera.cameras.length
            ? xrCamera.cameras[0]
            : xrCamera;
          if (vr.infoModelRoot) {
            vr.infoModelRoot.rotation.y = (Number(time) || performance.now()) * 0.00028;
          }
          updateVrGaze(gazeCamera || vr.camera, Number(time) || performance.now());
          vr.renderer.render(vr.scene, vr.camera);
        }
      });
      updateButtons();
      notify(
        tr("Headset hotspots are ready", "Handa na ang mga hotspot sa headset"),
        tr(
          "Look at a gold hotspot and hold, or point a controller and press its trigger.",
          "Tumingin at manatili sa gold hotspot, o itutok ang controller at pindutin ang trigger.",
        ),
        6500,
      );
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
      if (vr.tapTimer) {
        window.clearTimeout(vr.tapTimer);
        vr.tapTimer = 0;
      }
      requestVrExit();
      vr.lastTapAt = 0;
      return;
    }
    vr.lastTapAt = now;
    if (vr.tapTimer) {
      window.clearTimeout(vr.tapTimer);
    }
    vr.tapTimer = window.setTimeout(function () {
      vr.tapTimer = 0;
      activateVrTarget(vr.gazeTarget);
    }, 360);
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
      // Outside VR, a new panorama should establish a fresh gyro baseline.
      // During VR, keep the existing physical-phone baseline so scene changes
      // cannot recenter a visitor who is looking up or down.
      if (!vr.mode) {
        gyro.needsSync = true;
      }
      if (vr.mode) {
        window.setTimeout(refreshVrWorld, 40);
      }
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
