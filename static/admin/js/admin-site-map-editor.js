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
  var viewer = null;
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

  if (window.supabase && apiConfig.supabaseUrl && apiConfig.supabaseKey) {
    supabaseClient = window.supabase.createClient(apiConfig.supabaseUrl, apiConfig.supabaseKey, {
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    });
  }

  function endpoint(path) { return "/_admin/site-map" + path; }
  function clone(value) { return JSON.parse(JSON.stringify(value)); }
  function number(value, fallback) { var result = Number(value); return isFinite(result) ? result : fallback; }
  function slugify(value, fallback) { return String(value || "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || fallback; }
  function setDirty(value) {
    dirty = Boolean(value);
    var node = root.querySelector("[data-sm-unsaved]");
    if (node) node.hidden = !dirty;
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
    if (!response.ok || !payload.ok) throw new Error(payload.error || "The request could not be completed.");
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
    setField("imageAlt", selected.imageAlt); setField("virtualTourScene", selected.virtualTourScene);
    setField("action_label_en", ((selected.action || {}).label || {}).en); setField("action_label_tl", ((selected.action || {}).label || {}).tl); setField("action_url", (selected.action || {}).url);
    root.querySelector("[data-sm-aerial-coordinates]").textContent = selected.showAerial ? "x " + number(selected.aerial.x, 0).toFixed(4) + " · y " + number(selected.aerial.y, 0).toFixed(4) : "Not shown";
    root.querySelector("[data-sm-panorama-coordinates]").textContent = selected.show360 ? "pitch " + number(selected.panorama.pitch, 0).toFixed(2) + " · yaw " + number(selected.panorama.yaw, 0).toFixed(2) : "Not shown";
    var image = root.querySelector("[data-sm-image-preview]");
    image.src = selected.imageUrl || selected.imagePath || ""; image.alt = selected.imageAlt || "Hotspot photo preview"; image.hidden = !image.src;
    ["en", "tl"].forEach(function (language) { var audio = root.querySelector('[data-sm-audio-preview="' + language + '"]'); audio.src = selectedAudioUrl(language); audio.hidden = !audio.src; });
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
    aerialImage.src = aerial.url || aerial.path || "";
    aerialImage.hidden = !aerialImage.src;
    root.querySelector("[data-sm-aerial-empty]").hidden = Boolean(aerialImage.src);
    aerialMarkers.innerHTML = "";
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
      preview.src = section.url || section.path || "";
      root.querySelector('[data-sm-map-size="' + kind + '"]').textContent = section.width + " × " + section.height + " pixels";
    });
    ["en", "tl"].forEach(function (language) {
      var audio = root.querySelector('[data-sm-intro-preview="' + language + '"]');
      audio.src = data.introAudio[language + "Url"] || data.introAudio[language] || "";
    });
    settingsPanel.elements.defaultView.value = (data.settings || {}).defaultView || "aerial";
    settingsPanel.elements.hotspotsVisible.checked = Boolean((data.settings || {}).hotspotsVisible);
    settingsPanel.elements.initialPitch.value = number(data.panoramaMap.initialPitch, 0);
    settingsPanel.elements.initialYaw.value = number(data.panoramaMap.initialYaw, 0);
    settingsPanel.elements.initialHfov.value = number(data.panoramaMap.initialHfov, 110);
  }

  function updateStage() {
    root.querySelectorAll("[data-sm-view]").forEach(function (button) { var active = button.dataset.smView === activeView; button.classList.toggle("is-active", active); button.setAttribute("aria-selected", active ? "true" : "false"); });
    aerialStage.hidden = activeView !== "aerial"; panoramaStage.hidden = activeView !== "360";
    aerialStage.classList.toggle("is-placing", placing && activeView === "aerial"); panoramaStage.classList.toggle("is-placing", placing && activeView === "360"); stageStatus.classList.toggle("is-placing", placing);
    placeButton.textContent = placing ? "Cancel placement" : "Pin selected hotspot";
    stageStatus.textContent = placing ? "Click the exact " + (activeView === "aerial" ? "aerial map" : "360° panorama") + " location for “" + ((selected.title || {}).en || selected.id) + "”." : "Select a hotspot, then choose “Pin selected hotspot” and click the map.";
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

  function placeAerial(event) {
    if (!placing || activeView !== "aerial" || !selected) return;
    var rect = imageDisplayRect();
    var x = (event.clientX - rect.container.left - rect.left) / rect.width;
    var y = (event.clientY - rect.container.top - rect.top) / rect.height;
    if (x < 0 || x > 1 || y < 0 || y > 1) { showStatus("Click inside the displayed aerial image.", true); return; }
    selected.aerial = { x: Number(x.toFixed(5)), y: Number(y.toFixed(5)) }; selected.showAerial = true; placing = false; setDirty(true); renderAll();
  }
  function placePanorama(event) {
    if (!placing || activeView !== "360" || !selected || !viewer || typeof viewer.mouseEventToCoords !== "function") return;
    if (event.target.closest && event.target.closest(".sm-panorama-hotspot")) return;
    var coords = viewer.mouseEventToCoords(event);
    selected.panorama = { pitch: Number(Number(coords[0]).toFixed(2)), yaw: Number(Number(coords[1]).toFixed(2)) }; selected.show360 = true; placing = false; setDirty(true); renderAll();
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
  root.querySelectorAll("[data-sm-tab]").forEach(function (button) { button.addEventListener("click", function () { root.querySelectorAll("[data-sm-tab]").forEach(function (item) { item.classList.toggle("is-active", item === button); }); root.querySelectorAll("[data-sm-panel]").forEach(function (panel) { panel.hidden = panel.dataset.smPanel !== button.dataset.smTab; }); }); });
  root.querySelector("[data-sm-add]").addEventListener("click", addHotspot);
  root.querySelector("[data-sm-duplicate]").addEventListener("click", function () { if (!selected) return; var copy = clone(selected); copy.id = slugify(copy.id + "-copy", "hotspot-copy"); copy.title.en += " Copy"; hotspots.push(copy); selected = copy; setDirty(true); renderAll(); });
  root.querySelector("[data-sm-delete]").addEventListener("click", function () { if (!selected || !window.confirm("Delete “" + ((selected.title || {}).en || selected.id) + "” from this draft?")) return; hotspots = hotspots.filter(function (item) { return item !== selected; }); selected = hotspots[0] || null; setDirty(true); renderAll(); });
  placeButton.addEventListener("click", function () { if (!selected) { showStatus("Select a hotspot first.", true); return; } placing = !placing; updateStage(); });
  aerialStage.addEventListener("click", placeAerial); panoramaStage.addEventListener("click", placePanorama);
  aerialImage.addEventListener("load", renderAerial); window.addEventListener("resize", renderAerial); if (search) search.addEventListener("input", renderList);
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
  root.querySelectorAll("[data-sm-remove-asset]").forEach(function (button) { button.addEventListener("click", function () { if (!selected) return; var kind = button.dataset.smRemoveAsset; if (kind === "image") { selected.imagePath = ""; selected.imageUrl = ""; } else { var language = kind.slice(-2); selected.audio[language] = ""; selected.audio[language + "Url"] = ""; } setDirty(true); renderForm(); }); });
  var saveButton = root.querySelector("[data-sm-save]"); if (saveButton) saveButton.addEventListener("click", async function () { saveButton.disabled = true; showStatus("Validating and saving the Site Map draft…", false); try { var response = await request("/config", { method: "PUT", body: JSON.stringify(publicConfigPayload()) }); data = response.config; hotspots = data.hotspots; selected = selected ? hotspotById(selected.id) : hotspots[0] || null; setDirty(false); renderAll(); showStatus("Site Map draft saved.", false); } catch (error) { showStatus(error.message || "The draft could not be saved.", true); } finally { saveButton.disabled = false; } });
  window.addEventListener("beforeunload", function (event) { if (!dirty || readOnly) return; event.preventDefault(); event.returnValue = ""; });
  window.addEventListener("unload", function () { temporaryUrls.forEach(function (url) { URL.revokeObjectURL(url); }); });

  renderAll();
})();
