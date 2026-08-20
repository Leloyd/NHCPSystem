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
  var placeCenterButton = root.querySelector("[data-vt-place-center]");
  var setStartButton = root.querySelector("[data-vt-set-start]");
  var replaceSceneButton = root.querySelector("[data-vt-replace-scene]");
  var deleteSceneButton = root.querySelector("[data-vt-delete-scene]");

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
      placeCenterButton.disabled = true;
      setStartButton.disabled = true;
      replaceSceneButton.disabled = true;
      deleteSceneButton.disabled = true;
      root.querySelectorAll("[data-vt-add-hotspot]").forEach(function (button) { button.disabled = true; });
      return;
    }
    if (empty) empty.hidden = true;
    if (currentName) currentName.textContent = selectedScene.name_en;
    placeCenterButton.disabled = false;
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
      var target = hotspot.target_scene_id ? sceneById(hotspot.target_scene_id) : null;
      card.innerHTML = '<i aria-hidden="true">' + (hotspot.hotspot_type === "navigation" ? "→" : "◎") + '</i><span><strong></strong><small></small></span><div class="vt-hotspot-card__buttons"><button type="button" data-action="edit" aria-label="Edit hotspot">Edit</button><button type="button" data-action="delete" aria-label="Delete hotspot">×</button></div>';
      card.querySelector("strong").textContent = hotspot.name_en;
      card.querySelector("small").textContent = hotspot.hotspot_type === "navigation" ? "Links to " + (target ? target.name_en : "missing scene") : "Item · pitch " + hotspot.pitch + ", yaw " + hotspot.yaw;
      card.querySelector('[data-action="edit"]').addEventListener("click", function () { editHotspot(hotspot); });
      card.querySelector('[data-action="delete"]').addEventListener("click", async function () {
        if (!window.confirm('Delete the hotspot “' + hotspot.name_en + '”?')) return;
        try {
          await api(endpoint("/hotspots/" + hotspot.id), { method: "DELETE" });
          hotspots = hotspots.filter(function (entry) { return Number(entry.id) !== Number(hotspot.id); });
          renderHotspots(); renderViewer();
        } catch (error) { message(placementStatus, error.message, "error"); }
      });
      if (hotspot.hotspot_type === "item") {
        var controls = document.createElement("span");
        controls.className = "vt-tts-actions";
        ["en", "tl"].forEach(function (language) {
          if (!hotspot["subtitle_" + language]) return;
          var button = document.createElement("button");
          button.type = "button"; button.textContent = "Generate " + language.toUpperCase() + " voice";
          button.addEventListener("click", async function () {
            button.disabled = true; button.textContent = "Generating…";
            try {
              var result = await api(endpoint("/hotspots/" + hotspot.id + "/tts"), { method: "POST", body: JSON.stringify({ language: language }) });
              Object.assign(hotspot, result.hotspot); button.textContent = language.toUpperCase() + " voice ready";
            } catch (error) { button.disabled = false; button.textContent = "Retry " + language.toUpperCase(); message(placementStatus, error.message, "error"); }
          });
          controls.appendChild(button);
        });
        if (controls.children.length) card.appendChild(controls);
      }
      hotspotList.appendChild(card);
    });
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

  function beginHotspot(kind) {
    editingHotspot = null;
    hotspotForm.reset();
    hotspotForm.hidden = false;
    hotspotForm.elements.hotspot_type.value = kind;
    hotspotForm.querySelector("[data-vt-hotspot-kicker]").textContent = kind === "navigation" ? "Navigation hotspot" : "Artifact hotspot";
    hotspotForm.querySelector("[data-vt-hotspot-title]").textContent = "Click the 360° view to place it";
    hotspotForm.querySelector("[data-vt-navigation-fields]").hidden = kind !== "navigation";
    hotspotForm.querySelector("[data-vt-item-fields]").hidden = kind !== "item";
    hotspotForm.elements.subtitle_en.required = kind === "item";
    hotspotForm.elements.subtitle_tl.required = kind === "item";
    hotspotForm.querySelector('[data-vt-asset-input="image"]').required = kind === "item";
    hotspotForm.elements.target_scene_id.required = kind === "navigation";
    placementMode = true; positionLocked = false;
    root.classList.add("vt-editor-placement");
    placementStatus.textContent = "Placement mode is active. Click the panorama, or use Place at view center.";
    hotspotForm.querySelector("[data-vt-confirm-position]").disabled = true;
    hotspotForm.querySelector("[data-vt-reposition]").disabled = true;
    hotspotForm.querySelector(".vt-save-hotspot").disabled = true;
    fillTargetScenes();
    hotspotForm.elements.name_en.focus();
  }

  function editHotspot(hotspot) {
    editingHotspot = hotspot;
    hotspotForm.reset(); hotspotForm.hidden = false;
    hotspotForm.elements.hotspot_type.value = hotspot.hotspot_type;
    ["name_en", "name_tl", "pitch", "yaw", "subtitle_en", "subtitle_tl", "image_path", "glb_path", "audio_en_path", "audio_tl_path"].forEach(function (field) {
      if (hotspotForm.elements[field]) hotspotForm.elements[field].value = hotspot[field] == null ? "" : hotspot[field];
    });
    hotspotForm.querySelector("[data-vt-hotspot-kicker]").textContent = "Edit " + hotspot.hotspot_type + " hotspot";
    hotspotForm.querySelector("[data-vt-hotspot-title]").textContent = "Position locked";
    hotspotForm.querySelector("[data-vt-navigation-fields]").hidden = hotspot.hotspot_type !== "navigation";
    hotspotForm.querySelector("[data-vt-item-fields]").hidden = hotspot.hotspot_type !== "item";
    hotspotForm.elements.subtitle_en.required = hotspot.hotspot_type === "item";
    hotspotForm.elements.subtitle_tl.required = hotspot.hotspot_type === "item";
    hotspotForm.querySelector('[data-vt-asset-input="image"]').required = false;
    hotspotForm.elements.target_scene_id.required = hotspot.hotspot_type === "navigation";
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
    editingHotspot = null;
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
    message(sceneMessage, ""); sceneDialog.showModal();
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
    sceneDialog.showModal();
  });
  root.querySelectorAll("[data-vt-add-hotspot]").forEach(function (button) { button.addEventListener("click", function () { beginHotspot(button.dataset.vtAddHotspot); }); });
  root.querySelector("[data-vt-cancel-hotspot]").addEventListener("click", cancelHotspot);
  root.querySelector("[data-vt-confirm-position]").addEventListener("click", confirmPosition);
  root.querySelector("[data-vt-reposition]").addEventListener("click", reposition);
  placeCenterButton.addEventListener("click", function () { if (placementMode && viewer) capturePosition(viewer.getPitch(), viewer.getYaw()); });

  setStartButton.addEventListener("click", async function () {
    if (!selectedScene) return;
    try {
      var result = await api(endpoint("/scenes/" + selectedScene.id), { method: "PATCH", body: JSON.stringify({ is_start_scene: true }) });
      scenes.forEach(function (scene) { scene.is_start_scene = Number(scene.id) === Number(selectedScene.id); });
      Object.assign(selectedScene, result.scene); setStartButton.disabled = true;
      root.querySelectorAll("[data-scene-id] small").forEach(function (small) { var scene = sceneById(small.closest("[data-scene-id]").dataset.sceneId); small.textContent = scene.is_start_scene ? "Starting scene" : scene.panorama_width + " × " + scene.panorama_height; });
      message(placementStatus, "Starting scene updated.", "success");
    } catch (error) { message(placementStatus, error.message, "error"); }
  });
  deleteSceneButton.addEventListener("click", async function () {
    if (!selectedScene || scenes.length <= 1 || !window.confirm('Delete the scene “' + selectedScene.name_en + '” and all of its item hotspots? Navigation links targeting it must be removed first.')) return;
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
    var form = root.querySelector("[data-vt-details-form]"); var data = Object.fromEntries(new FormData(form).entries());
    if (!form.reportValidity()) return;
    try { await api(endpoint("/metadata"), { method: "POST", body: JSON.stringify(data) }); message(root.querySelector("[data-vt-details-message]"), "Environment details saved.", "success"); }
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
      window.location.reload();
    } catch (error) {
      await discardUploads([path]);
      submit.disabled = false;
      submit.textContent = sceneDialogMode === "replace" ? "Validate and replace panorama" : "Validate and add scene";
      message(sceneMessage, error.message, "error");
    }
  });

  hotspotForm.addEventListener("submit", async function (event) {
    event.preventDefault(); if (!selectedScene || !positionLocked) return;
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
        hotspots = hotspots.map(function (entry) { return Number(entry.id) === Number(result.hotspot.id) ? result.hotspot : entry; });
      } else {
        result = await api(endpoint("/hotspots"), { method: "POST", body: JSON.stringify(data) });
        hotspots.push(result.hotspot);
      }
      cancelHotspot(); renderHotspots(); renderViewer();
      message(placementStatus, "Hotspot saved. You can add another one.", "success");
    } catch (error) {
      await discardUploads(uploadedPaths);
      submit.disabled = false;
      message(hotspotMessage, error.message, "error");
    }
  });

  renderSceneSelection(); renderHotspots(); renderViewer(); fillTargetScenes();
})();
