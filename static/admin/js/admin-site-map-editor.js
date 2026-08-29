(function () {
  "use strict";

  var root = document.querySelector("[data-sm-editor]");
  if (!root) return;

  function readJson(id, fallback) {
    try { return JSON.parse(document.getElementById(id).textContent || ""); }
    catch (_) { return fallback; }
  }

  var apiConfig = readJson("smEditorConfig", {});
  var data = readJson("smEditorData", {});
  var readOnly = Boolean(apiConfig.readOnly);
  var hotspots = Array.isArray(data.hotspots) ? data.hotspots : [];
  var selected = hotspots[0] || null;
  var activeView = "aerial";
  var placing = false;
  var dirty = false;
  var allowPageExit = false;
  var viewer = null;
  var MAX_MAP_UPLOAD_BYTES = 30 * 1024 * 1024;
  var supabaseClient = null;
  var temporaryUrls = [];

  var list = root.querySelector("[data-sm-hotspot-list]");
  var count = root.querySelector("[data-sm-hotspot-count]");
  var search = root.querySelector("[data-sm-search]");
  var hotspotForm = root.querySelector("[data-sm-hotspot-form]");
  var hotspotFields = root.querySelector("[data-sm-hotspot-fields]");
  var noSelection = root.querySelector("[data-sm-no-selection]");
  var aerialStage = root.querySelector("[data-sm-aerial-stage]");
  var aerialImage = root.querySelector("[data-sm-aerial-image]");
  var aerialMarkers = root.querySelector("[data-sm-aerial-markers]");
  var panoramaStage = root.querySelector("[data-sm-panorama-stage]");
  var stageStatus = root.querySelector("[data-sm-stage-status]");
  var placeButton = root.querySelector("[data-sm-place]");
  var mapsPanel = root.querySelector('[data-sm-panel="maps"]');
  var settingsPanel = root.querySelector('[data-sm-panel="settings"]');
  var uploadStatus = root.querySelector("[data-sm-upload-status]");
  var publishForm = root.querySelector("[data-sm-publish]");
  var publishButton = root.querySelector("[data-sm-publish-button]");
  var publishHint = root.querySelector("[data-sm-publish-hint]");
  var publishCheck = root.querySelector("[data-sm-publish-check]");
  var publishIssues = root.querySelector("[data-sm-publish-issues]");

  if (window.supabase && apiConfig.supabaseUrl && apiConfig.supabaseKey) {
    supabaseClient = window.supabase.createClient(apiConfig.supabaseUrl, apiConfig.supabaseKey, {
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    });
  }

  function endpoint(path) { return "/_admin/site-map" + path; }
  function clone(value) { return JSON.parse(JSON.stringify(value)); }
  function number(value, fallback) { var result = Number(value); return isFinite(result) ? result : fallback; }
  function slugify(value, fallback) { return String(value || "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || fallback; }
  function confirmAction(options) {
    if (typeof window.NHCPAdminConfirm === "function") return window.NHCPAdminConfirm(options);
    return Promise.resolve(window.confirm((options && (options.message || options.title)) || "Confirm this action?"));
  }
  function setSource(element, value) {
    if (!element) return false;
    var source = String(value || "");
    if ((element.getAttribute("src") || "") === source) return false;
    if (source) element.setAttribute("src", source);
    else element.removeAttribute("src");
    return true;
  }
  function setDirty(value) {
    dirty = Boolean(value);
    var node = root.querySelector("[data-sm-unsaved]");
    if (node) node.hidden = !dirty;
    if (publishButton) publishButton.disabled = dirty || publishButton.getAttribute("aria-busy") === "true";
    if (publishHint) publishHint.hidden = !dirty;
    if (dirty && publishCheck) publishCheck.hidden = true;
  }
  function renderPublishIssues(issues) {
    if (!publishCheck || !publishIssues) return;
    publishIssues.innerHTML = "";
    (Array.isArray(issues) ? issues : []).forEach(function (issue) {
      var item = document.createElement("li");
      item.textContent = String(issue || "");
      publishIssues.appendChild(item);
    });
    publishCheck.hidden = publishIssues.children.length === 0;
    if (!publishCheck.hidden) publishCheck.focus();
  }
  function showStatus(message, isError) {
    if (!uploadStatus) return;
    uploadStatus.textContent = message;
    uploadStatus.classList.toggle("is-error", Boolean(isError));
    uploadStatus.hidden = false;
    window.clearTimeout(showStatus.timer);
    showStatus.timer = window.setTimeout(function () { uploadStatus.hidden = true; }, isError ? 5000 : 2600);
  }
  async function request(path, options) {
    var next = options || {};
    next.credentials = "same-origin";
    next.headers = Object.assign({ "Content-Type": "application/json", "X-CSRF-Token": apiConfig.csrfToken, "X-Requested-With": "XMLHttpRequest" }, next.headers || {});
    var response = await fetch(endpoint(path), next);
    var payload = await response.json().catch(function () { return {}; });
    if (!response.ok || !payload.ok) {
      var error = new Error(payload.error || "The request could not be completed.");
      error.issues = payload.issues;
      throw error;
    }
    return payload;
  }

  function hotspotById(id) { return hotspots.find(function (item) { return item.id === id; }) || null; }
  function selectedAudio(language) { return selected && selected.audio ? selected.audio[language] || "" : ""; }
  function selectedAudioUrl(language) { return selected && selected.audio ? selected.audio[language + "Url"] || selected.audio[language] || "" : ""; }
  function field(name) { return hotspotForm.elements.namedItem(name); }
  function setField(name, value) { var element = field(name); if (!element) return; if (element.type === "checkbox") element.checked = Boolean(value); else element.value = value == null ? "" : value; }

  function renderList() {
    var query = String(search && search.value || "").trim().toLowerCase();
    list.innerHTML = "";
    hotspots.forEach(function (hotspot) {
      var title = String((hotspot.title || {}).en || hotspot.id);
      if (query && (title + " " + hotspot.category).toLowerCase().indexOf(query) === -1) return;
      var button = document.createElement("button");
      button.type = "button";
      button.className = "sm-hotspot-item" + (hotspot === selected ? " is-active" : "") + (hotspot.markerStyle === "main" ? " is-main" : "") + (!hotspot.enabled ? " is-disabled" : "");
      button.innerHTML = '<span class="sm-hotspot-item__marker" aria-hidden="true"></span><span><strong></strong><small></small></span>';
      button.querySelector("strong").textContent = title;
      button.querySelector("small").textContent = String(hotspot.category || "General") + " · " + (hotspot.showAerial ? "Aerial" : "") + (hotspot.showAerial && hotspot.show360 ? " + " : "") + (hotspot.show360 ? "360°" : "");
      button.addEventListener("click", function () { selected = hotspot; placing = false; renderAll(); });
      list.appendChild(button);
    });
    count.textContent = hotspots.length + (hotspots.length === 1 ? " hotspot" : " hotspots");
  }

  function renderForm() {
    noSelection.hidden = Boolean(selected);
    hotspotFields.disabled = readOnly || !selected;
    if (!selected) return;
    setField("id", selected.id); setField("title_en", (selected.title || {}).en); setField("title_tl", (selected.title || {}).tl);
    setField("category", selected.category); setField("description_en", (selected.description || {}).en); setField("description_tl", (selected.description || {}).tl);
    setField("markerStyle", selected.markerStyle); setField("enabled", selected.enabled); setField("showAerial", selected.showAerial); setField("show360", selected.show360); setField("linkedViews", selected.linkedViews);
    setField("aerial_x", number((selected.aerial || {}).x, 0).toFixed(5)); setField("aerial_y", number((selected.aerial || {}).y, 0).toFixed(5));
    setField("panorama_pitch", number((selected.panorama || {}).pitch, 0).toFixed(2)); setField("panorama_yaw", number((selected.panorama || {}).yaw, 0).toFixed(2));
    setField("imageAlt", selected.imageAlt); setField("virtualTourScene", selected.virtualTourScene);
    setField("action_label_en", ((selected.action || {}).label || {}).en); setField("action_label_tl", ((selected.action || {}).label || {}).tl); setField("action_url", (selected.action || {}).url);
    var selectedTitle = root.querySelector("[data-sm-selected-title]");
    if (selectedTitle) selectedTitle.textContent = (selected.title || {}).en || selected.id;
    root.querySelectorAll("[data-sm-place-view]").forEach(function (button) {
      var view = button.dataset.smPlaceView;
      var hasPosition = view === "aerial" ? selected.showAerial : selected.show360;
      button.textContent = (hasPosition ? "Reposition in " : "Place in ") + (view === "aerial" ? "aerial map" : "360° view");
      button.disabled = readOnly;
    });
    var image = root.querySelector("[data-sm-image-preview]");
    setSource(image, selected.imageUrl || selected.imagePath); image.alt = selected.imageAlt || "Hotspot photo preview"; image.hidden = !image.getAttribute("src");
    ["en", "tl"].forEach(function (language) { var audio = root.querySelector('[data-sm-audio-preview="' + language + '"]'); setSource(audio, selectedAudioUrl(language)); audio.hidden = !audio.getAttribute("src"); });
  }

  function imageDisplayRect() {
    var container = aerialStage.getBoundingClientRect();
    var naturalWidth = aerialImage.naturalWidth || number((data.aerialMap || {}).width, 1);
    var naturalHeight = aerialImage.naturalHeight || number((data.aerialMap || {}).height, 1);
    var scale = Math.min(container.width / naturalWidth, container.height / naturalHeight);
    var width = naturalWidth * scale, height = naturalHeight * scale;
    return { left: (container.width - width) / 2, top: (container.height - height) / 2, width: width, height: height, container: container };
  }

  function renderAerial() {
    var aerial = data.aerialMap || {};
    var source = aerial.url || aerial.path || "";
    var sourceChanged = setSource(aerialImage, source);
    aerialImage.hidden = !source;
    root.querySelector("[data-sm-aerial-empty]").hidden = Boolean(source);
    aerialMarkers.innerHTML = "";
    // Wait for the one load event after a source change. Reassigning the same
    // src from that event caused an endless image reload and browser spinner.
    if (sourceChanged) return;
    if (!aerialImage.complete || !aerialImage.naturalWidth) return;
    var rect = imageDisplayRect();
    hotspots.filter(function (item) { return item.enabled && item.showAerial; }).forEach(function (hotspot) {
      var button = document.createElement("button");
      button.type = "button";
      button.className = "sm-aerial-marker" + (hotspot.markerStyle === "main" ? " is-main" : "") + (hotspot === selected ? " is-active" : "");
      button.style.left = (rect.left + number(hotspot.aerial.x, 0) * rect.width) + "px";
      button.style.top = (rect.top + number(hotspot.aerial.y, 0) * rect.height) + "px";
      button.title = (hotspot.title || {}).en || hotspot.id;
      button.addEventListener("click", function (event) { event.stopPropagation(); selected = hotspot; placing = false; renderAll(); });
      aerialMarkers.appendChild(button);
    });
  }

  function panoramaHotspot(hotspot) {
    return { pitch: number(hotspot.panorama.pitch, 0), yaw: number(hotspot.panorama.yaw, 0), type: "info", text: (hotspot.title || {}).en || hotspot.id,
      cssClass: "sm-panorama-hotspot" + (hotspot.markerStyle === "main" ? " is-main" : "") + (hotspot === selected ? " is-active" : ""),
      clickHandlerFunc: function () { selected = hotspot; placing = false; renderAll(); } };
  }
  function renderPanorama() {
    if (activeView !== "360" || !window.pannellum) return;
    var panorama = data.panoramaMap || {};
    var source = panorama.url || panorama.path || "";
    if (!source) return;
    if (viewer && typeof viewer.destroy === "function") viewer.destroy();
    panoramaStage.innerHTML = "";
    viewer = window.pannellum.viewer("smPanoramaStage", { type: "equirectangular", panorama: source, autoLoad: true, showControls: true,
      pitch: number(panorama.initialPitch, 0), yaw: number(panorama.initialYaw, 0), hfov: number(panorama.initialHfov, 110),
      hotSpots: hotspots.filter(function (item) { return item.enabled && item.show360; }).map(panoramaHotspot) });
  }

  function renderMapsPanel() {
    ["aerial", "panorama"].forEach(function (kind) {
      var section = kind === "aerial" ? data.aerialMap : data.panoramaMap;
      var preview = root.querySelector('[data-sm-map-preview="' + kind + '"]');
      setSource(preview, section.url || section.path);
      var size = root.querySelector('[data-sm-map-size="' + kind + '"]');
      if (size) size.textContent = section.width + " × " + section.height + " pixels";
    });
    ["en", "tl"].forEach(function (language) {
      var audio = root.querySelector('[data-sm-intro-preview="' + language + '"]');
      setSource(audio, data.introAudio[language + "Url"] || data.introAudio[language]);
    });
    settingsPanel.elements.defaultView.value = (data.settings || {}).defaultView || "aerial";
    settingsPanel.elements.hotspotsVisible.checked = Boolean((data.settings || {}).hotspotsVisible);
    settingsPanel.elements.initialPitch.value = number(data.panoramaMap.initialPitch, 0);
    settingsPanel.elements.initialYaw.value = number(data.panoramaMap.initialYaw, 0);
    settingsPanel.elements.initialHfov.value = number(data.panoramaMap.initialHfov, 110);
  }

  function updateStage() {
    var selectedName = selected ? ((selected.title || {}).en || selected.id) : "a selected hotspot";
    root.querySelectorAll("[data-sm-view]").forEach(function (button) { var active = button.dataset.smView === activeView; button.classList.toggle("is-active", active); button.setAttribute("aria-selected", active ? "true" : "false"); });
    aerialStage.hidden = activeView !== "aerial"; panoramaStage.hidden = activeView !== "360";
    aerialStage.classList.toggle("is-placing", placing && activeView === "aerial"); panoramaStage.classList.toggle("is-placing", placing && activeView === "360"); stageStatus.classList.toggle("is-placing", placing);
    placeButton.disabled = readOnly || !selected;
    placeButton.textContent = placing ? "Cancel placement" : "Pin selected hotspot";
    stageStatus.textContent = placing ? "Click the exact " + (activeView === "aerial" ? "aerial map" : "360° panorama") + " location for “" + selectedName + "”." : "Select a hotspot, then choose “Pin selected hotspot” and click the map.";
    root.querySelectorAll("[data-sm-place-view]").forEach(function (button) {
      var active = placing && button.dataset.smPlaceView === activeView;
      button.classList.toggle("is-active", active);
      if (active) button.textContent = "Cancel placement";
    });
    if (activeView === "aerial") renderAerial(); else renderPanorama();
  }
  function renderAll() { renderList(); renderForm(); renderMapsPanel(); updateStage(); }

  function syncSelectedFromForm() {
    if (!selected) return;
    selected.id = slugify(field("id").value || field("title_en").value, "hotspot");
    selected.title = { en: field("title_en").value.trim(), tl: field("title_tl").value.trim() };
    selected.category = field("category").value.trim(); selected.description = { en: field("description_en").value.trim(), tl: field("description_tl").value.trim() };
    selected.markerStyle = field("markerStyle").value === "main" ? "main" : "dot"; selected.enabled = field("enabled").checked;
    selected.showAerial = field("showAerial").checked; selected.show360 = field("show360").checked; selected.linkedViews = field("linkedViews").checked;
    selected.imageAlt = field("imageAlt").value.trim(); selected.virtualTourScene = field("virtualTourScene").value.trim();
    selected.action = { label: { en: field("action_label_en").value.trim(), tl: field("action_label_tl").value.trim() }, url: field("action_url").value.trim() };
    setDirty(true); renderList(); renderAerial();
  }

  function addHotspot() {
    var index = hotspots.length + 1;
    selected = { id: "hotspot-" + index, enabled: true, sortOrder: hotspots.length, title: { en: "New hotspot", tl: "" }, category: "Landmark", description: { en: "", tl: "" }, markerStyle: "dot", showAerial: true, aerial: { x: .5, y: .5 }, show360: false, panorama: { pitch: 0, yaw: 0 }, linkedViews: true, imagePath: "", imageUrl: "", imageAlt: "", audio: { en: "", tl: "", enUrl: "", tlUrl: "" }, virtualTourScene: "", action: { label: { en: "", tl: "" }, url: "" } };
    hotspots.push(selected); setDirty(true); renderAll();
  }

  function beginPlacement(view) {
    if (!selected) { showStatus("Select a hotspot first.", true); return; }
    if (placing && activeView === view) { placing = false; updateStage(); return; }
    activeView = view;
    placing = true;
    updateStage();
  }
  async function placeAerial(event) {
    if (!placing || activeView !== "aerial" || !selected) return;
    var rect = imageDisplayRect();
    var x = (event.clientX - rect.container.left - rect.left) / rect.width;
    var y = (event.clientY - rect.container.top - rect.top) / rect.height;
    if (x < 0 || x > 1 || y < 0 || y > 1) { showStatus("Click inside the displayed aerial image.", true); return; }
    x = Number(x.toFixed(5)); y = Number(y.toFixed(5));
    var approved = await confirmAction({ eyebrow: "Aerial hotspot position", title: "Use this map position?", message: "The hotspot will move to X " + x.toFixed(5) + " and Y " + y.toFixed(5) + ".", label: "Confirm position", variant: "enable" });
    if (!approved) return;
    selected.aerial = { x: x, y: y }; selected.showAerial = true; placing = false; setDirty(true); renderAll();
  }
  async function placePanorama(event) {
    if (!placing || activeView !== "360" || !selected || !viewer || typeof viewer.mouseEventToCoords !== "function") return;
    if (event.target.closest && event.target.closest(".sm-panorama-hotspot")) return;
    var coords = viewer.mouseEventToCoords(event);
    var pitch = Number(Number(coords[0]).toFixed(2)); var yaw = Number(Number(coords[1]).toFixed(2));
    var approved = await confirmAction({ eyebrow: "360° hotspot position", title: "Use this panorama position?", message: "The hotspot will move to pitch " + pitch.toFixed(2) + " and yaw " + yaw.toFixed(2) + ".", label: "Confirm position", variant: "enable" });
    if (!approved) return;
    selected.panorama = { pitch: pitch, yaw: yaw }; selected.show360 = true; placing = false; setDirty(true); renderAll();
  }

  async function uploadFile(file, kind) {
    if (!supabaseClient) throw new Error("The secure upload library is unavailable. Refresh and try again.");
    var signed = await request("/uploads/sign", { method: "POST", body: JSON.stringify({ filename: file.name, size: file.size, kind: kind }) });
    var result = await supabaseClient.storage.from(signed.bucket).uploadToSignedUrl(signed.path, signed.token, file, { contentType: file.type || undefined, cacheControl: "31536000" });
    if (result.error) throw result.error;
    return signed.path;
  }
  function inspectImage(file) {
    return new Promise(function (resolve, reject) { var url = URL.createObjectURL(file); var image = new Image(); image.onload = function () { temporaryUrls.push(url); resolve({ url: url, width: image.naturalWidth, height: image.naturalHeight }); }; image.onerror = function () { URL.revokeObjectURL(url); reject(new Error("The selected image cannot be decoded.")); }; image.src = url; });
  }
  async function handleUpload(input) {
    var file = input.files && input.files[0]; if (!file || readOnly) return;
    var purpose = input.dataset.smUpload; var kind = purpose === "aerial" ? "aerial" : purpose === "panorama" ? "panorama" : purpose.indexOf("audio") !== -1 || purpose.indexOf("intro") !== -1 ? "audio" : "image";
    if ((kind === "aerial" || kind === "panorama") && file.size > MAX_MAP_UPLOAD_BYTES) {
      input.value = "";
      showStatus("The map image is over the 30 MB upload limit.", true);
      return;
    }
    var mediaName = kind === "audio" ? "audio file" : kind === "panorama" ? "360° map" : kind === "aerial" ? "aerial map" : "hotspot photo";
    var approved = await confirmAction({ eyebrow: "Site Map media", title: "Upload this " + mediaName + "?", message: "“" + file.name + "” will be uploaded to this working draft. Save the draft afterward to keep it.", label: "Upload file", variant: "enable" });
    if (!approved) { input.value = ""; return; }
    input.disabled = true; showStatus("Uploading " + file.name + "…", false);
    try {
      var meta = kind === "audio" ? { url: URL.createObjectURL(file) } : await inspectImage(file); if (kind === "audio") temporaryUrls.push(meta.url);
      if (kind === "panorama" && (meta.width < 1024 || meta.height < 512 || Math.abs(meta.width / meta.height - 2) > .02)) throw new Error("The 360° image must use a 2:1 equirectangular ratio and be at least 1024 × 512.");
      var path = await uploadFile(file, kind);
      if (purpose === "aerial" || purpose === "panorama") { var section = purpose === "aerial" ? data.aerialMap : data.panoramaMap; section.path = path; section.url = meta.url; section.width = meta.width; section.height = meta.height; if (purpose === "panorama") { if (viewer) { viewer.destroy(); viewer = null; } } }
      else if (purpose === "image") { selected.imagePath = path; selected.imageUrl = meta.url; }
      else if (purpose === "audio-en" || purpose === "audio-tl") { var lang = purpose.slice(-2); selected.audio[lang] = path; selected.audio[lang + "Url"] = meta.url; }
      else { var introLang = purpose.slice(-2); data.introAudio[introLang] = path; data.introAudio[introLang + "Url"] = meta.url; }
      setDirty(true); renderAll(); showStatus("Upload complete. Save the draft to keep it.", false);
    } catch (error) { showStatus(error.message || "Upload failed.", true); }
    finally { input.value = ""; input.disabled = false; }
  }

  function publicConfigPayload() {
    syncSelectedFromForm();
    data.hotspots = hotspots.map(function (hotspot, index) { hotspot.sortOrder = index; return hotspot; });
    data.settings = { defaultView: settingsPanel.elements.defaultView.value, hotspotsVisible: settingsPanel.elements.hotspotsVisible.checked };
    data.panoramaMap.initialPitch = number(settingsPanel.elements.initialPitch.value, 0); data.panoramaMap.initialYaw = number(settingsPanel.elements.initialYaw.value, 0); data.panoramaMap.initialHfov = number(settingsPanel.elements.initialHfov.value, 110);
    return data;
  }

  root.querySelectorAll("[data-sm-view]").forEach(function (button) { button.addEventListener("click", function () { activeView = button.dataset.smView; placing = false; updateStage(); }); });
  var inspectorTabs = Array.prototype.slice.call(root.querySelectorAll("[data-sm-tab]"));
  function activateInspectorTab(button) {
    inspectorTabs.forEach(function (item) { var active = item === button; item.classList.toggle("is-active", active); item.setAttribute("aria-selected", active ? "true" : "false"); item.tabIndex = active ? 0 : -1; });
    root.querySelectorAll("[data-sm-panel]").forEach(function (panel) { panel.hidden = panel.dataset.smPanel !== button.dataset.smTab; });
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
  root.querySelector("[data-sm-add]").addEventListener("click", addHotspot);
  root.querySelector("[data-sm-duplicate]").addEventListener("click", function () { if (!selected) return; var copy = clone(selected); copy.id = slugify(copy.id + "-copy", "hotspot-copy"); copy.title.en += " Copy"; hotspots.push(copy); selected = copy; setDirty(true); renderAll(); });
  root.querySelector("[data-sm-delete]").addEventListener("click", async function () {
    if (!selected) return;
    var title = (selected.title || {}).en || selected.id;
    var approved = await confirmAction({ eyebrow: "Site Map hotspot", title: "Delete this hotspot?", message: "“" + title + "” will be removed from both Site Map views in this working draft.", label: "Delete hotspot", variant: "disable" });
    if (!approved) return;
    hotspots = hotspots.filter(function (item) { return item !== selected; }); selected = hotspots[0] || null; placing = false; setDirty(true); renderAll();
  });
  placeButton.addEventListener("click", function () { beginPlacement(activeView); });
  root.querySelectorAll("[data-sm-place-view]").forEach(function (button) { button.addEventListener("click", function () { beginPlacement(button.dataset.smPlaceView); }); });
  aerialStage.addEventListener("click", placeAerial); panoramaStage.addEventListener("click", placePanorama);
  aerialImage.addEventListener("load", renderAerial); window.addEventListener("resize", renderAerial); if (search) search.addEventListener("input", renderList);
  [hotspotForm, mapsPanel, settingsPanel].forEach(function (form) { if (form) form.addEventListener("submit", function (event) { event.preventDefault(); }); });
  hotspotForm.addEventListener("input", syncSelectedFromForm);
  settingsPanel.addEventListener("input", function () {
    data.settings.defaultView = settingsPanel.elements.defaultView.value;
    data.settings.hotspotsVisible = settingsPanel.elements.hotspotsVisible.checked;
    data.panoramaMap.initialPitch = number(settingsPanel.elements.initialPitch.value, 0);
    data.panoramaMap.initialYaw = number(settingsPanel.elements.initialYaw.value, 0);
    data.panoramaMap.initialHfov = number(settingsPanel.elements.initialHfov.value, 110);
    setDirty(true);
  });
  root.querySelectorAll("[data-sm-upload]").forEach(function (input) { input.addEventListener("change", function () { handleUpload(input); }); });
  root.querySelectorAll("[data-sm-remove-asset]").forEach(function (button) { button.addEventListener("click", async function () {
    if (!selected) return;
    var kind = button.dataset.smRemoveAsset; var label = kind === "image" ? "photo" : (kind.slice(-2) === "tl" ? "Tagalog audio" : "English audio");
    var hasAsset = kind === "image" ? Boolean(selected.imagePath || selected.imageUrl) : Boolean(selectedAudio(kind.slice(-2)) || selectedAudioUrl(kind.slice(-2)));
    if (!hasAsset) { showStatus("This hotspot has no " + label + " to remove.", true); return; }
    var approved = await confirmAction({ eyebrow: "Hotspot media", title: "Remove this " + label + "?", message: "The " + label + " will be detached from “" + ((selected.title || {}).en || selected.id) + "” in this working draft.", label: "Remove " + label, variant: "disable" });
    if (!approved) return;
    if (kind === "image") { selected.imagePath = ""; selected.imageUrl = ""; } else { var language = kind.slice(-2); selected.audio[language] = ""; selected.audio[language + "Url"] = ""; }
    setDirty(true); renderForm();
  }); });
  var saveButton = root.querySelector("[data-sm-save]"); if (saveButton) saveButton.addEventListener("click", async function () {
    var approved = await confirmAction({ eyebrow: "Site Map draft", title: "Save all Site Map changes?", message: "Hotspot positions, content, media, maps, and settings will be saved to the working database revision. The public version will not change until you publish.", label: "Save draft", variant: "enable" });
    if (!approved) return;
    saveButton.disabled = true; showStatus("Validating and saving the Site Map draft…", false);
    try { var response = await request("/config", { method: "PUT", body: JSON.stringify(publicConfigPayload()) }); data = response.config; hotspots = data.hotspots; selected = selected ? hotspotById(selected.id) : hotspots[0] || null; setDirty(false); renderAll(); showStatus("Site Map draft saved.", false); }
    catch (error) { showStatus(error.message || "The draft could not be saved.", true); }
    finally { saveButton.disabled = false; }
  });
  if (publishForm) publishForm.addEventListener("submit", async function (event) {
    event.preventDefault();
    if (dirty) {
      setDirty(true);
      showStatus("Save your changes before publishing.", true);
      return;
    }
    renderPublishIssues([]);
    if (publishButton) { publishButton.disabled = true; publishButton.setAttribute("aria-busy", "true"); }
    showStatus("Checking the saved Site Map revision…", false);
    try {
      var preflight = await request("/publish/preflight", { method: "POST", body: "{}" });
      if (!preflight.valid) {
        renderPublishIssues(preflight.issues);
        showStatus("Resolve the listed items before publishing.", true);
        return;
      }
      var approved = await confirmAction({
        eyebrow: "Site Map",
        title: "Publish this Site Map revision?",
        message: "The saved draft passed its publish check. Visitors will receive this complete revision.",
        label: "Publish",
        variant: "enable",
      });
      if (!approved) return;
      showStatus("Publishing the saved Site Map revision…", false);
      var response = await request("/publish", { method: "POST", body: "{}" });
      apiConfig.revisionId = response.revisionId;
      var summary = root.querySelector("[data-sm-revision-summary]");
      if (summary) summary.textContent = "Working revision " + response.revisionId + "; revision " + response.publishedRevisionId + " is now public.";
      showStatus("Site Map published. You can continue editing this page.", false);
    } catch (error) {
      if (error.issues) renderPublishIssues(error.issues);
      showStatus(error.message || "The Site Map could not be published.", true);
    } finally {
      if (publishButton) publishButton.removeAttribute("aria-busy");
      setDirty(dirty);
    }
  });
  document.addEventListener("click", function (event) {
    if (allowPageExit || !dirty || readOnly || event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    var link = event.target.closest && event.target.closest("a[href]");
    if (!link || link.target === "_blank" || link.hasAttribute("download")) return;
    var destination; try { destination = new URL(link.href, window.location.href); } catch (_) { return; }
    if (destination.protocol !== "http:" && destination.protocol !== "https:") return;
    event.preventDefault(); event.stopImmediatePropagation();
    confirmAction({ eyebrow: "Unsaved Site Map changes", title: "Leave without saving?", message: "Your unsaved Site Map edits will be lost if you leave this page now.", label: "Leave page", variant: "disable" }).then(function (approved) { if (!approved) return; allowPageExit = true; window.location.assign(destination.href); });
  }, true);
  window.addEventListener("beforeunload", function (event) { if (allowPageExit || !dirty || readOnly) return; event.preventDefault(); event.returnValue = ""; });
  window.addEventListener("unload", function () { temporaryUrls.forEach(function (url) { URL.revokeObjectURL(url); }); });

  renderAll();
  setDirty(false);
})();
