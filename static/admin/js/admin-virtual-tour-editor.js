(function () {
  "use strict";

  var root = document.querySelector("[data-vt-editor]");
  if (!root) return;

  function readJson(id, fallback) {
    try { return JSON.parse(document.getElementById(id).textContent || ""); }
    catch (_) { return fallback; }
  }

  var config = readJson("vtEditorConfig", {});
  var scenes = readJson("vtEditorScenes", []);
  var hotspots = readJson("vtEditorHotspots", []);
  var viewer = null;
  var uploadViewer = null;
  var selectedScene = scenes.length ? scenes[0] : null;
  var placementMode = false;
  var positionLocked = false;
  var panoramaCandidate = null;
  var panoramaObjectUrl = "";
  var supabaseClient = null;
  var tempHotspotId = "vt-editor-temporary-hotspot";
  var sceneDialogMode = "add";
  var editingHotspot = null;

  var sceneList = root.querySelector("[data-vt-scene-list]");
  var hotspotList = root.querySelector("[data-vt-hotspot-list]");
  var hotspotForm = root.querySelector("[data-vt-hotspot-form]");
  var sceneDialog = root.querySelector("[data-vt-scene-dialog]");
  var sceneForm = root.querySelector("[data-vt-scene-form]");
  var sceneMessage = root.querySelector("[data-vt-scene-message]");
  var hotspotMessage = root.querySelector("[data-vt-hotspot-message]");
  var placementStatus = root.querySelector("[data-vt-placement-status]");
  var hotspotFormSlot = root.querySelector("[data-vt-hotspot-form-slot]");
  var setStartButton = root.querySelector("[data-vt-set-start]");
  var replaceSceneButton = root.querySelector("[data-vt-replace-scene]");
  var deleteSceneButton = root.querySelector("[data-vt-delete-scene]");
  var generateVoicesButton = root.querySelector("[data-vt-generate-voices]");
  var ttsStatus = root.querySelector("[data-vt-tts-status]");
  var viewerHost = root.querySelector("#vtEditorViewer");
  var viewerResizeFrame = 0;
  var viewerResizeObserver = null;
  var loadingModal = root.querySelector("[data-vt-loading-modal]");
  var loadingPreviousFocus = null;
  var detailsForm = root.querySelector("[data-vt-details-form]");
  var unsavedIndicator = root.querySelector("[data-vt-unsaved]");
  var dirtyState = { details: false, hotspot: false, scene: false };
  var formBaselines = { details: "", hotspot: null, scene: null };
  var beforeUnloadAttached = false;
  var allowPageExit = false;
  var mediaPreviewUrls = { image: "", glb: "" };
  var mediaPreviewFiles = { image: null, glb: null };
  var activeMediaPreview = "image";

  function formSnapshot(form) {
    if (!form) return "";
    var controls = Array.prototype.slice.call(form.elements).map(function (control, index) {
      if (!control || /^(button|submit|reset)$/i.test(control.type || "")) return null;
      var key = control.name || control.getAttribute("data-vt-asset-input") || (control.type || control.tagName) + "-" + index;
      if (control.type === "file") {
        return [key, Array.prototype.slice.call(control.files || []).map(function (file) {
          return [file.name, file.size, file.lastModified, file.type];
        })];
      }
      if (control.type === "checkbox" || control.type === "radio") return [key, control.checked, control.value];
      return [key, String(control.value == null ? "" : control.value), Boolean(control.disabled)];
    }).filter(Boolean);
    return JSON.stringify(controls);
  }

  function hasUnsavedChanges() {
    return Object.keys(dirtyState).some(function (key) { return dirtyState[key]; });
  }

  function handleBeforeUnload(event) {
    if (allowPageExit || !hasUnsavedChanges()) return;
    event.preventDefault();
    event.returnValue = "";
  }

  function updateDirtyUi() {
    var dirty = hasUnsavedChanges();
    if (unsavedIndicator) unsavedIndicator.hidden = !dirty;
    if (dirty && !beforeUnloadAttached) {
      window.addEventListener("beforeunload", handleBeforeUnload);
      beforeUnloadAttached = true;
    } else if (!dirty && beforeUnloadAttached) {
      window.removeEventListener("beforeunload", handleBeforeUnload);
      beforeUnloadAttached = false;
    }
  }

  function setDirty(section, value) {
    dirtyState[section] = Boolean(value);
    updateDirtyUi();
  }

  function syncFormDirty(section, form) {
    if (formBaselines[section] == null) return;
    setDirty(section, formSnapshot(form) !== formBaselines[section]);
  }

  function clearAllDirty() {
    Object.keys(dirtyState).forEach(function (key) { dirtyState[key] = false; });
    updateDirtyUi();
  }

  function dirtyDescription() {
    var labels = [];
    if (dirtyState.details) labels.push("environment details");
    if (dirtyState.hotspot) labels.push("hotspot changes");
    if (dirtyState.scene) labels.push("scene upload changes");
    return labels.join(", ");
  }

  async function confirmUnsavedExit() {
    if (!hasUnsavedChanges()) return true;
    return confirmAction({
      eyebrow: "Unsaved changes",
      title: "Leave without saving?",
      message: "Your unsaved " + dirtyDescription() + " will be lost. Stay on this page to save them first.",
      label: "Leave page",
      variant: "disable",
    });
  }

  function permitPageExit() {
    allowPageExit = true;
    clearAllDirty();
  }

  function resizeViewer() {
    if (viewerResizeFrame) window.cancelAnimationFrame(viewerResizeFrame);
    viewerResizeFrame = window.requestAnimationFrame(function () {
      viewerResizeFrame = 0;
      if (viewer && typeof viewer.resize === "function") viewer.resize();
    });
  }

  if (viewerHost && "ResizeObserver" in window) {
    viewerResizeObserver = new ResizeObserver(resizeViewer);
    viewerResizeObserver.observe(viewerHost);
  } else {
    window.addEventListener("resize", resizeViewer);
  }

  if (window.supabase && config.supabaseUrl && config.supabaseKey) {
    supabaseClient = window.supabase.createClient(config.supabaseUrl, config.supabaseKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }

  function message(element, value, kind) {
    if (!element) return;
    element.textContent = value || "";
    element.classList.toggle("is-error", kind === "error");
    element.classList.toggle("is-success", kind === "success");
    element.classList.toggle("is-warning", kind === "warning");
  }

  function confirmAction(options) {
    if (typeof window.NHCPAdminConfirm === "function") return window.NHCPAdminConfirm(options);
    return Promise.resolve(window.confirm((options && (options.message || options.title)) || "Confirm this action?"));
  }

  function showLoading(title, value) {
    if (!loadingModal) return;
    loadingPreviousFocus = document.activeElement;
    loadingModal.querySelector("[data-vt-loading-title]").textContent = title;
    loadingModal.querySelector("[data-vt-loading-message]").textContent = value;
    loadingModal.hidden = false;
    loadingModal.setAttribute("aria-hidden", "false");
    document.body.classList.add("vt-loading-open");
    root.setAttribute("aria-busy", "true");
    var card = loadingModal.querySelector(".vt-loading-card");
    card.tabIndex = -1;
    card.focus();
  }

  function hideLoading() {
    if (!loadingModal) return;
    loadingModal.hidden = true;
    loadingModal.setAttribute("aria-hidden", "true");
    document.body.classList.remove("vt-loading-open");
    root.removeAttribute("aria-busy");
    if (loadingPreviousFocus && loadingPreviousFocus.isConnected && !loadingPreviousFocus.disabled) loadingPreviousFocus.focus();
    else if (viewerHost) viewerHost.focus();
    loadingPreviousFocus = null;
  }

  async function api(path, options) {
    var next = options || {};
    next.headers = Object.assign({
      "Content-Type": "application/json",
      "X-CSRF-Token": config.csrfToken,
      "X-Requested-With": "XMLHttpRequest",
    }, next.headers || {});
    var response = await fetch(path, next);
    var payload = await response.json().catch(function () { return {}; });
    if (!response.ok || !payload.ok) throw new Error(payload.error || "The request could not be completed.");
    return payload;
  }

  function endpoint(suffix) {
    return "/_admin/virtual-tours/" + config.tourId + suffix;
  }

  function sceneById(value) {
    return scenes.find(function (scene) { return Number(scene.id) === Number(value); }) || null;
  }

  function hotspotsForScene(sceneId) {
    return hotspots.filter(function (hotspot) { return Number(hotspot.scene_id) === Number(sceneId); });
  }

  function panoramaUrl(scene) {
    return scene ? String(scene.panorama_url || "") : "";
  }

  function makeEditorHotspot(hotspot) {
    var isNavigation = hotspot.hotspot_type === "navigation";
    return {
      id: "saved-" + hotspot.id,
      pitch: Number(hotspot.pitch),
      yaw: Number(hotspot.yaw),
      type: "info",
      text: hotspot.name_en || (isNavigation ? "Navigation hotspot" : "Item hotspot"),
      cssClass: isNavigation ? "vt-editor-nav-hotspot" : "vt-editor-item-hotspot",
      createTooltipFunc: function (node) {
        node.setAttribute("aria-label", hotspot.name_en || "Hotspot");
        node.setAttribute("role", "button");
      },
    };
  }

  function renderViewer() {
    if (viewer && typeof viewer.destroy === "function") viewer.destroy();
    viewer = null;
    var empty = root.querySelector("[data-vt-viewer-empty]");
    var currentName = root.querySelector("[data-vt-current-scene]");
    if (!selectedScene || !panoramaUrl(selectedScene)) {
      if (empty) empty.hidden = false;
      if (currentName) currentName.textContent = "No scene selected";
      setStartButton.disabled = true;
      replaceSceneButton.disabled = true;
      deleteSceneButton.disabled = true;
      root.querySelectorAll("[data-vt-add-hotspot]").forEach(function (button) { button.disabled = true; });
      return;
    }
    if (empty) empty.hidden = true;
    if (currentName) currentName.textContent = selectedScene.name_en;
    setStartButton.disabled = Boolean(selectedScene.is_start_scene);
    replaceSceneButton.disabled = false;
    deleteSceneButton.disabled = scenes.length <= 1;
    root.querySelectorAll("[data-vt-add-hotspot]").forEach(function (button) { button.disabled = false; });
    viewer = window.pannellum.viewer("vtEditorViewer", {
      type: "equirectangular", panorama: panoramaUrl(selectedScene), autoLoad: true,
      pitch: Number(selectedScene.initial_pitch || 0), yaw: Number(selectedScene.initial_yaw || 0),
      hfov: Number(selectedScene.initial_hfov || 100), minHfov: 40, maxHfov: 140,
      hotSpots: hotspotsForScene(selectedScene.id).map(makeEditorHotspot),
      showFullscreenCtrl: true, showZoomCtrl: true, compass: false,
      strings: { loadButtonLabel: "Load panorama", loadingLabel: "Loading scene" },
    });
    viewer.on("mousedown", function (event) {
      if (!placementMode || positionLocked) return;
      var coords = viewer.mouseEventToCoords(event);
      if (coords && coords.length >= 2) capturePosition(coords[0], coords[1]);
    });
  }

  function renderSceneSelection() {
    root.querySelectorAll("[data-scene-id]").forEach(function (button) {
      button.classList.toggle("is-active", selectedScene && Number(button.dataset.sceneId) === Number(selectedScene.id));
    });
  }

  function renderHotspots() {
    if (hotspotList.contains(hotspotForm)) hotspotFormSlot.appendChild(hotspotForm);
    if (!selectedScene) {
      hotspotList.innerHTML = '<div class="vt-empty"><strong>No scene selected</strong><p>Select a panorama to view its hotspots.</p></div>';
      return;
    }
    var entries = hotspotsForScene(selectedScene.id);
    if (!entries.length) {
      hotspotList.innerHTML = '<div class="vt-empty"><strong>No hotspots in this scene</strong><p>Add an item or connect this panorama to another scene.</p></div>';
      return;
    }
    hotspotList.innerHTML = "";
    entries.forEach(function (hotspot) {
      var card = document.createElement("article");
      card.className = "vt-hotspot-card";
      card.dataset.hotspotId = hotspot.id;
      var target = hotspot.target_scene_id ? sceneById(hotspot.target_scene_id) : null;
      card.innerHTML = '<i aria-hidden="true">' + (hotspot.hotspot_type === "navigation" ? "→" : "◎") + '</i><span><strong></strong><small></small></span><div class="vt-hotspot-card__buttons"><button type="button" data-action="edit" aria-label="Edit hotspot">Edit</button><button type="button" data-action="delete" aria-label="Delete hotspot">×</button></div>';
      card.querySelector("strong").textContent = hotspot.name_en;
      card.querySelector("small").textContent = hotspot.hotspot_type === "navigation" ? "Links to " + (target ? target.name_en : "missing scene") : "Item · pitch " + hotspot.pitch + ", yaw " + hotspot.yaw;
      card.querySelector('[data-action="edit"]').addEventListener("click", function () { editHotspot(hotspot); });
      card.querySelector('[data-action="delete"]').addEventListener("click", async function () {
        var approved = await confirmAction({
          eyebrow: "Virtual Tour hotspot",
          title: "Delete this " + (hotspot.hotspot_type === "navigation" ? "navigation" : "item") + " hotspot?",
          message: '“' + hotspot.name_en + '” will be permanently removed from this draft scene.',
          label: "Delete hotspot",
          variant: "disable",
        });
        if (!approved) return;
        try {
          await api(endpoint("/hotspots/" + hotspot.id), { method: "DELETE" });
          if (editingHotspot && Number(editingHotspot.id) === Number(hotspot.id)) cancelHotspot();
          hotspots = hotspots.filter(function (entry) { return Number(entry.id) !== Number(hotspot.id); });
          renderHotspots(); renderViewer();
        } catch (error) { message(placementStatus, error.message, "error"); }
      });
      hotspotList.appendChild(card);
    });
    if (editingHotspot && !hotspotForm.hidden) {
      var editingCard = hotspotList.querySelector('[data-hotspot-id="' + editingHotspot.id + '"]');
      if (editingCard) {
        editingCard.classList.add("is-editing");
        editingCard.after(hotspotForm);
      }
    }
  }

  function selectScene(id) {
    selectedScene = sceneById(id);
    cancelHotspot();
    renderSceneSelection(); renderHotspots(); renderViewer(); fillTargetScenes();
  }

  function fillTargetScenes() {
    var select = hotspotForm.querySelector('[name="target_scene_id"]');
    select.innerHTML = '<option value="">Choose destination</option>';
    scenes.forEach(function (scene) {
      if (selectedScene && Number(scene.id) === Number(selectedScene.id)) return;
      var option = document.createElement("option"); option.value = scene.id; option.textContent = scene.name_en; select.appendChild(option);
    });
  }

  function setPreviewKind(kind) {
    var image = hotspotForm.querySelector("[data-vt-current-image]");
    var model = hotspotForm.querySelector("[data-vt-current-model]");
    var hasImage = Boolean(image && image.getAttribute("src"));
    var hasModel = Boolean(model && model.getAttribute("src"));
    var next = kind === "glb" && hasModel ? "glb" : (hasImage ? "image" : (hasModel ? "glb" : "image"));
    activeMediaPreview = next;
    if (image) image.hidden = next !== "image";
    if (model) model.hidden = next !== "glb";
    hotspotForm.querySelectorAll("[data-vt-preview-kind]").forEach(function (button) {
      var active = button.dataset.vtPreviewKind === next;
      button.classList.toggle("is-active", active);
      button.setAttribute("aria-pressed", active ? "true" : "false");
    });
  }

  function clearMediaPreviewUrl(kind) {
    if (mediaPreviewUrls[kind]) URL.revokeObjectURL(mediaPreviewUrls[kind]);
    mediaPreviewUrls[kind] = "";
    mediaPreviewFiles[kind] = null;
  }

  function selectedMediaUrl(kind, hotspot) {
    var input = hotspotForm.querySelector('[data-vt-asset-input="' + kind + '"]');
    var file = input && input.files ? input.files[0] : null;
    if (file) {
      if (mediaPreviewFiles[kind] !== file) {
        clearMediaPreviewUrl(kind);
        mediaPreviewFiles[kind] = file;
        mediaPreviewUrls[kind] = URL.createObjectURL(file);
      }
      return mediaPreviewUrls[kind];
    }
    clearMediaPreviewUrl(kind);
    return hotspot ? String(hotspot[kind + "_url"] || "") : "";
  }

  function refreshCurrentMedia(hotspot, preferredKind) {
    var media = hotspotForm.querySelector("[data-vt-current-media]");
    var image = hotspotForm.querySelector("[data-vt-current-image]");
    var model = hotspotForm.querySelector("[data-vt-current-model]");
    var imageUrl = selectedMediaUrl("image", hotspot);
    var glbUrl = selectedMediaUrl("glb", hotspot);
    if (image) {
      if (imageUrl) image.src = imageUrl; else image.removeAttribute("src");
      image.alt = hotspotForm.elements.name_en.value
        ? "Current image for " + hotspotForm.elements.name_en.value
        : "Current artifact image";
    }
    if (model) {
      if (glbUrl) model.src = glbUrl; else model.removeAttribute("src");
    }
    var imageButton = hotspotForm.querySelector('[data-vt-preview-kind="image"]');
    var modelButton = hotspotForm.querySelector('[data-vt-preview-kind="glb"]');
    if (imageButton) imageButton.disabled = !imageUrl;
    if (modelButton) modelButton.hidden = !glbUrl;
    if (media) media.hidden = !imageUrl && !glbUrl;
    setPreviewKind(preferredKind || activeMediaPreview);
  }

  function updateAssetPreviews(hotspot, preferredKind) {
    activeMediaPreview = preferredKind || "image";
    refreshCurrentMedia(hotspot, activeMediaPreview);

    ["en", "tl"].forEach(function (language) {
      var preview = hotspotForm.querySelector('[data-vt-audio-preview="' + language + '"]');
      var player = preview ? preview.querySelector("audio") : null;
      var source = hotspot ? String(hotspot["audio_" + language + "_url"] || "") : "";
      if (player) {
        player.pause();
        if (source) player.src = source; else player.removeAttribute("src");
      }
      if (preview) preview.hidden = !source;
    });
    if (generateVoicesButton) {
      var hasBoth = Boolean(hotspot && hotspot.audio_en_path && hotspot.audio_tl_path);
      generateVoicesButton.lastChild.textContent = hasBoth ? " Regenerate English + Tagalog voices" : " Generate English + Tagalog voices";
    }
    message(ttsStatus, "");
  }

  function configureHotspotKind(kind) {
    var isItem = kind === "item";
    var navigationFields = hotspotForm.querySelector("[data-vt-navigation-fields]");
    var itemFields = hotspotForm.querySelector("[data-vt-item-fields]");
    navigationFields.hidden = isItem;
    itemFields.hidden = !isItem;
    hotspotForm.elements.target_scene_id.disabled = isItem;
    hotspotForm.elements.target_scene_id.required = !isItem;
    itemFields.querySelectorAll("input,textarea,button").forEach(function (control) { control.disabled = !isItem; });
    hotspotForm.elements.subtitle_en.required = isItem;
    hotspotForm.elements.subtitle_tl.required = isItem;
    hotspotForm.querySelector('[data-vt-asset-input="image"]').required = isItem && !editingHotspot;
  }

  function beginHotspot(kind) {
    editingHotspot = null;
    hotspotFormSlot.appendChild(hotspotForm);
    hotspotForm.reset();
    hotspotForm.hidden = false;
    hotspotForm.elements.hotspot_type.value = kind;
    hotspotForm.querySelector("[data-vt-hotspot-kicker]").textContent = kind === "navigation" ? "Navigation hotspot" : "Artifact hotspot";
    hotspotForm.querySelector("[data-vt-hotspot-title]").textContent = "Click the 360° view to place it";
    configureHotspotKind(kind);
    updateAssetPreviews(null);
    placementMode = true; positionLocked = false;
    root.classList.add("vt-editor-placement");
    placementStatus.textContent = "Placement mode is active. Click the panorama to choose the hotspot position.";
    hotspotForm.querySelector("[data-vt-confirm-position]").disabled = true;
    hotspotForm.querySelector("[data-vt-reposition]").disabled = true;
    hotspotForm.querySelector(".vt-save-hotspot").disabled = true;
    fillTargetScenes();
    formBaselines.hotspot = formSnapshot(hotspotForm);
    setDirty("hotspot", false);
    hotspotForm.elements.name_en.focus();
  }

  function editHotspot(hotspot) {
    editingHotspot = hotspot;
    hotspotForm.reset(); hotspotForm.hidden = false;
    hotspotForm.elements.hotspot_type.value = hotspot.hotspot_type;
    ["name_en", "name_tl", "pitch", "yaw", "subtitle_en", "subtitle_tl", "image_path", "glb_path", "audio_en_path", "audio_tl_path"].forEach(function (field) {
      if (hotspotForm.elements[field]) hotspotForm.elements[field].value = hotspot[field] == null ? "" : hotspot[field];
    });
    hotspotForm.querySelector("[data-vt-hotspot-kicker]").textContent = hotspot.hotspot_type === "navigation" ? "Edit Navigation Hotspot" : "Edit Item Hotspot";
    hotspotForm.querySelector("[data-vt-hotspot-title]").textContent = "Position locked";
    configureHotspotKind(hotspot.hotspot_type);
    hotspotForm.querySelector('[data-vt-asset-input="image"]').required = false;
    updateAssetPreviews(hotspot);
    fillTargetScenes();
    if (hotspot.target_scene_id) hotspotForm.elements.target_scene_id.value = hotspot.target_scene_id;
    placementMode = false; positionLocked = true; root.classList.remove("vt-editor-placement");
    removeTempHotspot();
    if (viewer) viewer.addHotSpot({ id: tempHotspotId, pitch: Number(hotspot.pitch), yaw: Number(hotspot.yaw), type: "info", text: "Editing hotspot", cssClass: "vt-temp-hotspot" });
    hotspotForm.querySelector("[data-vt-confirm-position]").disabled = true;
    hotspotForm.querySelector("[data-vt-reposition]").disabled = false;
    hotspotForm.querySelector(".vt-save-hotspot").disabled = false;
    hotspotForm.querySelector(".vt-save-hotspot").textContent = "Save hotspot changes";
    placementStatus.textContent = "Editing “" + hotspot.name_en + "”. Reposition it only if its coordinates need to change.";
    hotspotList.querySelectorAll(".vt-hotspot-card").forEach(function (card) { card.classList.remove("is-editing"); });
    var editingCard = hotspotList.querySelector('[data-hotspot-id="' + hotspot.id + '"]');
    if (editingCard) {
      editingCard.classList.add("is-editing");
      editingCard.after(hotspotForm);
    }
    formBaselines.hotspot = formSnapshot(hotspotForm);
    setDirty("hotspot", false);
    hotspotForm.elements.name_en.focus();
  }

  function removeTempHotspot() {
    if (!viewer) return;
    try { viewer.removeHotSpot(tempHotspotId); } catch (_) {}
  }

  function capturePosition(pitch, yaw) {
    removeTempHotspot();
    pitch = Number(Number(pitch).toFixed(2)); yaw = Number(Number(yaw).toFixed(2));
    hotspotForm.elements.pitch.value = pitch; hotspotForm.elements.yaw.value = yaw;
    syncFormDirty("hotspot", hotspotForm);
    viewer.addHotSpot({ id: tempHotspotId, pitch: pitch, yaw: yaw, type: "info", text: "Pending hotspot", cssClass: "vt-temp-hotspot" });
    hotspotForm.querySelector("[data-vt-confirm-position]").disabled = false;
    hotspotForm.querySelector("[data-vt-hotspot-title]").textContent = "Position captured — confirm to lock";
    placementStatus.textContent = "Coordinates captured: pitch " + pitch + ", yaw " + yaw + ". Confirm this position or click elsewhere.";
  }

  function confirmPosition() {
    if (!hotspotForm.elements.pitch.value || !hotspotForm.elements.yaw.value) return;
    positionLocked = true; placementMode = false; root.classList.remove("vt-editor-placement");
    hotspotForm.querySelector("[data-vt-confirm-position]").disabled = true;
    hotspotForm.querySelector("[data-vt-reposition]").disabled = false;
    hotspotForm.querySelector(".vt-save-hotspot").disabled = false;
    hotspotForm.querySelector("[data-vt-hotspot-title]").textContent = "Position locked";
    placementStatus.textContent = "Hotspot position locked. Complete the fields and save, or choose Reposition.";
  }

  function reposition() {
    positionLocked = false; placementMode = true; root.classList.add("vt-editor-placement");
    hotspotForm.querySelector("[data-vt-reposition]").disabled = true;
    hotspotForm.querySelector(".vt-save-hotspot").disabled = true;
    placementStatus.textContent = "Repositioning is active. Click a new point in the panorama.";
  }

  function cancelHotspot() {
    placementMode = false; positionLocked = false; root.classList.remove("vt-editor-placement");
    removeTempHotspot();
    hotspotForm.hidden = true;
    hotspotFormSlot.appendChild(hotspotForm);
    hotspotList.querySelectorAll(".vt-hotspot-card").forEach(function (card) { card.classList.remove("is-editing"); });
    editingHotspot = null;
    clearMediaPreviewUrl("image");
    clearMediaPreviewUrl("glb");
    formBaselines.hotspot = null;
    setDirty("hotspot", false);
    hotspotForm.querySelector(".vt-save-hotspot").textContent = "Save hotspot";
    message(hotspotMessage, "");
    placementStatus.textContent = selectedScene ? "Select Add item or Add navigation to place a hotspot." : "Select a scene to begin.";
  }

  async function signedUpload(file, kind) {
    if (!supabaseClient) throw new Error("Direct upload is not configured. Set SUPABASE_PUBLISHABLE_KEY (or SUPABASE_ANON_KEY) and refresh.");
    var signed = await api(endpoint("/uploads/sign"), { method: "POST", body: JSON.stringify({ filename: file.name, kind: kind, size: file.size }) });
    var result = await supabaseClient.storage.from(signed.bucket).uploadToSignedUrl(signed.path, signed.token, file, { contentType: file.type || undefined, cacheControl: "31536000" });
    if (result.error) throw result.error;
    return signed.path;
  }

  async function discardUploads(paths) {
    var safe = (paths || []).filter(Boolean);
    if (!safe.length) return;
    try {
      await api(endpoint("/uploads/discard"), { method: "POST", body: JSON.stringify({ paths: safe }) });
    } catch (_) {}
  }

  function inspectPanorama(file) {
    return new Promise(function (resolve, reject) {
      var url = URL.createObjectURL(file); var image = new Image();
      image.onload = function () {
        var width = image.naturalWidth, height = image.naturalHeight;
        if (width < 2048 || height < 1024) { URL.revokeObjectURL(url); reject(new Error("Panorama must be at least 2048 × 1024 pixels.")); return; }
        if (width > 4096 || height > 2048) { URL.revokeObjectURL(url); reject(new Error("For reliable mobile support, panorama cannot exceed 4096 × 2048 pixels.")); return; }
        if (Math.abs(width / height - 2) > .02) { URL.revokeObjectURL(url); reject(new Error("This image is not a full 2:1 equirectangular panorama.")); return; }
        resolve({ file: file, url: url, width: width, height: height });
      };
      image.onerror = function () { URL.revokeObjectURL(url); reject(new Error("The selected image could not be decoded.")); };
      image.src = url;
    });
  }

  function previewPanorama(candidate) {
    if (uploadViewer && uploadViewer.destroy) uploadViewer.destroy();
    var preview = root.querySelector("[data-vt-upload-preview]"); preview.hidden = false;
    return new Promise(function (resolve, reject) {
      var settled = false;
      uploadViewer = window.pannellum.viewer("vtUploadViewer", { type: "equirectangular", panorama: candidate.url, autoLoad: true, showControls: true });
      uploadViewer.on("load", function () { if (!settled) { settled = true; resolve(candidate); } });
      uploadViewer.on("error", function () { if (!settled) { settled = true; reject(new Error("Pannellum could not render this panorama.")); } });
      window.setTimeout(function () { if (!settled && (!uploadViewer.isLoaded || !uploadViewer.isLoaded())) { settled = true; reject(new Error("Panorama preview timed out and was not accepted.")); } }, 15000);
    });
  }

  sceneList.addEventListener("click", function (event) {
    var button = event.target.closest("[data-scene-id]"); if (button) selectScene(button.dataset.sceneId);
  });
  root.querySelector("[data-vt-open-scene-upload]").addEventListener("click", function () {
    sceneDialogMode = "add"; sceneForm.reset(); panoramaCandidate = null;
    sceneDialog.querySelector("h2").textContent = "Upload a full 360° view";
    sceneForm.querySelector("[data-vt-upload-scene]").textContent = "Validate and add scene";
    sceneForm.querySelector("[data-vt-upload-scene]").disabled = true;
    message(sceneMessage, "");
    formBaselines.scene = formSnapshot(sceneForm);
    setDirty("scene", false);
    sceneDialog.showModal();
  });
  replaceSceneButton.addEventListener("click", function () {
    if (!selectedScene) return;
    sceneDialogMode = "replace"; sceneForm.reset(); panoramaCandidate = null;
    sceneForm.elements.name_en.value = selectedScene.name_en || "";
    sceneForm.elements.name_tl.value = selectedScene.name_tl || "";
    sceneDialog.querySelector("h2").textContent = "Replace “" + selectedScene.name_en + "”";
    sceneForm.querySelector("[data-vt-upload-scene]").textContent = "Validate and replace panorama";
    sceneForm.querySelector("[data-vt-upload-scene]").disabled = true;
    message(sceneMessage, "Existing hotspots retain their pitch and yaw coordinates. Review them after replacement.");
    formBaselines.scene = formSnapshot(sceneForm);
    setDirty("scene", false);
    sceneDialog.showModal();
  });
  sceneDialog.addEventListener("close", function () {
    formBaselines.scene = null;
    setDirty("scene", false);
  });
  root.querySelectorAll("[data-vt-add-hotspot]").forEach(function (button) { button.addEventListener("click", function () { beginHotspot(button.dataset.vtAddHotspot); }); });
  root.querySelector("[data-vt-cancel-hotspot]").addEventListener("click", cancelHotspot);
  root.querySelector("[data-vt-confirm-position]").addEventListener("click", confirmPosition);
  root.querySelector("[data-vt-reposition]").addEventListener("click", reposition);
  hotspotForm.querySelectorAll("[data-vt-preview-kind]").forEach(function (button) {
    button.addEventListener("click", function () { setPreviewKind(button.dataset.vtPreviewKind); });
  });
  ["image", "glb"].forEach(function (kind) {
    var input = hotspotForm.querySelector('[data-vt-asset-input="' + kind + '"]');
    if (!input) return;
    input.addEventListener("change", function () {
      refreshCurrentMedia(editingHotspot, kind);
    });
  });
  setStartButton.addEventListener("click", async function () {
    if (!selectedScene) return;
    var sceneName = selectedScene.name_en || "selected scene";
    setStartButton.disabled = true;
    setStartButton.setAttribute("aria-busy", "true");
    showLoading("Setting the starting scene", "Saving “" + sceneName + "” as the first view visitors will see.");
    try {
      var result = await api(endpoint("/scenes/" + selectedScene.id), { method: "PATCH", body: JSON.stringify({ is_start_scene: true }) });
      scenes.forEach(function (scene) { scene.is_start_scene = Number(scene.id) === Number(selectedScene.id); });
      Object.assign(selectedScene, result.scene); setStartButton.disabled = true;
      root.querySelectorAll("[data-scene-id] small").forEach(function (small) { var scene = sceneById(small.closest("[data-scene-id]").dataset.sceneId); small.textContent = scene.is_start_scene ? "Starting scene" : scene.panorama_width + " × " + scene.panorama_height; });
      message(placementStatus, "Starting scene updated.", "success");
    } catch (error) {
      setStartButton.disabled = Boolean(selectedScene && selectedScene.is_start_scene);
      message(placementStatus, error.message, "error");
    } finally {
      setStartButton.removeAttribute("aria-busy");
      hideLoading();
    }
  });
  deleteSceneButton.addEventListener("click", async function () {
    if (!selectedScene || scenes.length <= 1) return;
    var approved = await confirmAction({
      eyebrow: "Virtual Tour scene",
      title: "Delete this 360° scene?",
      message: '“' + selectedScene.name_en + '” and all hotspots placed inside it will be permanently removed from this draft. Navigation links pointing to it must be removed first.',
      label: "Delete scene",
      variant: "disable",
    });
    if (!approved) return;
    try { await api(endpoint("/scenes/" + selectedScene.id), { method: "DELETE" }); window.location.reload(); }
    catch (error) { message(placementStatus, error.message, "error"); }
  });

  var inspectorTabs = Array.prototype.slice.call(root.querySelectorAll("[data-vt-tab]"));
  function activateInspectorTab(button) {
    var name = button.dataset.vtTab;
    inspectorTabs.forEach(function (entry) {
      var active = entry === button;
      entry.setAttribute("aria-selected", active ? "true" : "false");
      entry.tabIndex = active ? 0 : -1;
    });
    root.querySelectorAll("[data-vt-panel]").forEach(function (panel) { panel.hidden = panel.dataset.vtPanel !== name; });
  }
  inspectorTabs.forEach(function (button, index) {
    button.addEventListener("click", function () { activateInspectorTab(button); });
    button.addEventListener("keydown", function (event) {
      if (["ArrowLeft", "ArrowRight", "Home", "End"].indexOf(event.key) < 0) return;
      event.preventDefault();
      var nextIndex = event.key === "Home" ? 0 : event.key === "End" ? inspectorTabs.length - 1 : (index + (event.key === "ArrowRight" ? 1 : -1) + inspectorTabs.length) % inspectorTabs.length;
      activateInspectorTab(inspectorTabs[nextIndex]); inspectorTabs[nextIndex].focus();
    });
  });

  root.querySelector("[data-vt-save-meta]").addEventListener("click", async function () {
    var form = detailsForm; var data = Object.fromEntries(new FormData(form).entries());
    if (!form.reportValidity()) return;
    try {
      await api(endpoint("/metadata"), { method: "POST", body: JSON.stringify(data) });
      formBaselines.details = formSnapshot(form);
      setDirty("details", false);
      message(root.querySelector("[data-vt-details-message]"), "Environment details saved.", "success");
    }
    catch (error) { message(root.querySelector("[data-vt-details-message]"), error.message, "error"); }
  });

  sceneForm.elements.panorama.addEventListener("change", async function () {
    var file = sceneForm.elements.panorama.files[0]; panoramaCandidate = null;
    sceneForm.querySelector("[data-vt-upload-scene]").disabled = true;
    if (!file) return;
    message(sceneMessage, "Checking image dimensions and opening it in Pannellum…");
    try {
      if (panoramaObjectUrl) URL.revokeObjectURL(panoramaObjectUrl);
      panoramaCandidate = await previewPanorama(await inspectPanorama(file)); panoramaObjectUrl = panoramaCandidate.url;
      root.querySelector("[data-vt-panorama-file]").textContent = file.name + " · " + panoramaCandidate.width + " × " + panoramaCandidate.height;
      message(sceneMessage, "Panorama passed the browser preview. It will be verified again after upload.", "success");
      sceneForm.querySelector("[data-vt-upload-scene]").disabled = false;
    } catch (error) { message(sceneMessage, error.message, "error"); }
  });

  sceneForm.addEventListener("submit", async function (event) {
    event.preventDefault(); if (!panoramaCandidate) return;
    var submit = sceneForm.querySelector("[data-vt-upload-scene]"); submit.disabled = true; submit.textContent = "Uploading panorama…";
    var path = "";
    try {
      path = await signedUpload(panoramaCandidate.file, "panorama");
      submit.textContent = "Verifying panorama…";
      var payload = {
        name_en: sceneForm.elements.name_en.value, name_tl: sceneForm.elements.name_tl.value,
        panorama_path: path, panorama_width: panoramaCandidate.width, panorama_height: panoramaCandidate.height,
      };
      if (sceneDialogMode === "replace" && selectedScene) {
        await api(endpoint("/scenes/" + selectedScene.id), { method: "PATCH", body: JSON.stringify(payload) });
        message(sceneMessage, "Panorama replaced. Reloading editor…", "success");
      } else {
        await api(endpoint("/scenes"), { method: "POST", body: JSON.stringify(payload) });
        message(sceneMessage, "Scene added. Reloading editor…", "success");
      }
      formBaselines.scene = formSnapshot(sceneForm);
      setDirty("scene", false);
      window.location.reload();
    } catch (error) {
      await discardUploads([path]);
      submit.disabled = false;
      submit.textContent = sceneDialogMode === "replace" ? "Validate and replace panorama" : "Validate and add scene";
      message(sceneMessage, error.message, "error");
    }
  });

  async function saveHotspot(keepOpen) {
    if (!selectedScene || !positionLocked) throw new Error("Confirm the hotspot position before saving.");
    if (!hotspotForm.reportValidity()) throw new Error("Complete the required hotspot fields first.");
    var submit = hotspotForm.querySelector(".vt-save-hotspot"); submit.disabled = true;
    message(hotspotMessage, "Uploading attached media and saving hotspot…");
    var uploadedPaths = [];
    try {
      var data = Object.fromEntries(new FormData(hotspotForm).entries());
      data.scene_id = selectedScene.id;
      var inputs = hotspotForm.querySelectorAll("[data-vt-asset-input]");
      for (var i = 0; i < inputs.length; i += 1) {
        var file = inputs[i].files && inputs[i].files[0]; if (!file) continue;
        var inputKind = inputs[i].dataset.vtAssetInput;
        var kind = inputKind.indexOf("audio_") === 0 ? "audio" : inputKind;
        data[inputKind + "_path"] = await signedUpload(file, kind);
        uploadedPaths.push(data[inputKind + "_path"]);
      }
      var result;
      if (editingHotspot) {
        result = await api(endpoint("/hotspots/" + editingHotspot.id), { method: "PATCH", body: JSON.stringify(data) });
        result.hotspot = Object.assign({}, editingHotspot, result.hotspot);
        hotspots = hotspots.map(function (entry) { return Number(entry.id) === Number(result.hotspot.id) ? result.hotspot : entry; });
      } else {
        result = await api(endpoint("/hotspots"), { method: "POST", body: JSON.stringify(data) });
        hotspots.push(result.hotspot);
      }
      editingHotspot = result.hotspot;
      hotspotForm.querySelector('[data-vt-asset-input="image"]').required = false;
      ["image_path", "glb_path", "audio_en_path", "audio_tl_path"].forEach(function (field) {
        hotspotForm.elements[field].value = result.hotspot[field] || hotspotForm.elements[field].value || "";
      });
      hotspotForm.querySelectorAll("[data-vt-asset-input]").forEach(function (input) { input.value = ""; });
      updateAssetPreviews(result.hotspot, activeMediaPreview);
      formBaselines.hotspot = formSnapshot(hotspotForm);
      setDirty("hotspot", false);
      renderHotspots();
      if (keepOpen) {
        submit.disabled = false;
        submit.textContent = "Save hotspot changes";
        message(hotspotMessage, "Hotspot details saved.", "success");
      } else {
        cancelHotspot(); renderViewer();
        message(placementStatus, "Hotspot saved. You can add another one.", "success");
      }
      return result.hotspot;
    } catch (error) {
      await discardUploads(uploadedPaths);
      submit.disabled = false;
      message(hotspotMessage, error.message, "error");
      throw error;
    }
  }

  hotspotForm.addEventListener("submit", async function (event) {
    event.preventDefault();
    try { await saveHotspot(false); } catch (_) {}
  });

  if (generateVoicesButton) {
    generateVoicesButton.addEventListener("click", async function () {
      var english = hotspotForm.elements.subtitle_en.value.trim();
      var tagalog = hotspotForm.elements.subtitle_tl.value.trim();
      if (!english || !tagalog) {
        var missing = !english ? hotspotForm.elements.subtitle_en : hotspotForm.elements.subtitle_tl;
        message(ttsStatus, "Add both English and Tagalog subtitle text before generating voices.", "error");
        missing.focus();
        return;
      }
      generateVoicesButton.disabled = true;
      message(ttsStatus, "Saving subtitles…");
      try {
        var saved = await saveHotspot(true);
        message(ttsStatus, "Generating both voices with ElevenLabs. This may take a moment…");
        var result = await api(endpoint("/hotspots/" + saved.id + "/tts"), {
          method: "POST", body: JSON.stringify({ languages: ["en", "tl"] }),
        });
        result.hotspot = Object.assign({}, editingHotspot, result.hotspot);
        hotspots = hotspots.map(function (entry) { return Number(entry.id) === Number(result.hotspot.id) ? result.hotspot : entry; });
        editingHotspot = result.hotspot;
        updateAssetPreviews(result.hotspot, activeMediaPreview);
        renderHotspots();
        if (result.complete) {
          message(ttsStatus, "✓ English and Tagalog voices are ready.", "success");
        } else {
          var failedNames = Object.keys(result.failures || {}).map(function (language) { return language === "tl" ? "Tagalog" : "English"; });
          message(ttsStatus, "✓ One voice is ready. " + failedNames.join(" and ") + " could not be generated.", "warning");
        }
      } catch (error) {
        message(ttsStatus, "Voice generation failed: " + error.message, "error");
      } finally {
        generateVoicesButton.disabled = false;
        hotspotForm.querySelector(".vt-save-hotspot").disabled = false;
      }
    });
  }

  ["input", "change"].forEach(function (eventName) {
    detailsForm.addEventListener(eventName, function () { syncFormDirty("details", detailsForm); });
    hotspotForm.addEventListener(eventName, function () { syncFormDirty("hotspot", hotspotForm); });
    sceneForm.addEventListener(eventName, function () { syncFormDirty("scene", sceneForm); });
  });
  formBaselines.details = formSnapshot(detailsForm);

  document.addEventListener("click", function (event) {
    if (allowPageExit || !hasUnsavedChanges() || event.defaultPrevented) return;
    if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    var link = event.target.closest("a[href]");
    if (!link || link.target === "_blank" || link.hasAttribute("download")) return;
    var destination;
    try { destination = new URL(link.href, window.location.href); } catch (_) { return; }
    if (destination.protocol !== "http:" && destination.protocol !== "https:") return;
    if (destination.origin === window.location.origin && destination.pathname === window.location.pathname && destination.search === window.location.search && destination.hash) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    confirmUnsavedExit().then(function (approved) {
      if (!approved) return;
      permitPageExit();
      window.location.assign(destination.href);
    });
  }, true);

  renderSceneSelection(); renderHotspots(); renderViewer(); fillTargetScenes();
})();
