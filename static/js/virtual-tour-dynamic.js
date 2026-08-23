(function () {
  "use strict";

  var configNode = document.getElementById("virtualTourDynamicConfig");
  var app = document.getElementById("tourApp");
  if (!configNode || !app || !window.pannellum) return;

  var config;
  try { config = JSON.parse(configNode.textContent || "{}"); }
  catch (_) { config = {}; }

  var loading = document.getElementById("tourLoadingOverlay");
  var errorOverlay = document.getElementById("tourErrorOverlay");
  var dock = document.getElementById("tourControlDock");
  var artifactOverlay = document.createElement("div");
  var artifactPanel = document.createElement("section");
  var artifactMediaWrap = document.createElement("div");
  var artifactImageWrap = document.createElement("div");
  var artifactImage = document.createElement("img");
  var artifactModel = document.createElement("model-viewer");
  var artifactSwitch = document.createElement("button");
  var artifactArButton = null;
  var artifactTitle = document.createElement("p");
  var artifactClose = document.createElement("button");
  var listenButton = document.getElementById("tourListen");
  var muteButton = document.getElementById("tourMute");
  var languageButton = document.getElementById("tourToggleArtifactHotspots");
  var subtitlesButton = document.getElementById("tourSubs");
  var subtitleBar = document.getElementById("tourSubtitle");
  var subtitleText = document.getElementById("tourSubtitleText");
  var hotspotButton = document.getElementById("tourToggleSceneHotspots");
  var captureButton = document.getElementById("tourCaptureView");
  var backButton = document.getElementById("tourBackToInteractive");
  var minimap = document.getElementById("tourMinimap");
  var viewModes = document.getElementById("tourViewModes");
  var audio = new Audio();
  var activeItem = null;
  var rootItem = null;
  var itemOpener = null;
  var modalOpener = null;
  var detailOpener = null;
  var language = "tl";
  var subtitlesOn = true;
  var hotspotsVisible = true;
  var viewer = null;
  var floatingSceneId = "";
  var floatingHotspotId = "";
  var spatialRefresh = null;
  var arNotice = null;
  var arNoticeTimer = 0;
  var managedArModels = new WeakSet();
  var scenes = Array.isArray(config.scenes) ? config.scenes : [];
  var sceneIds = new Set(scenes.map(function (scene) { return scene.id; }));
  var imageHotspotLayer = document.createElement("div");
  var imageHotspotToggle = document.createElement("button");
  var detailOverlay = document.createElement("div");
  var detailImage = document.createElement("img");
  var detailTitle = document.createElement("p");
  var detailClose = document.createElement("button");

  artifactOverlay.className = "tour-overlay tour-overlay--center tour-overlay--interactive tour-floating-preview-overlay";
  artifactOverlay.hidden = true;
  artifactOverlay.id = "tourArtifactPreviewOverlay";
  artifactPanel.className = "tour-floating-media-preview";
  artifactPanel.setAttribute("role", "dialog");
  artifactPanel.setAttribute("aria-modal", "true");
  artifactPanel.setAttribute("aria-label", "Artifact preview");
  artifactMediaWrap.className = "tour-floating-media-preview__mediawrap";
  artifactImageWrap.className = "tour-preview-zoomframe";
  artifactImage.className = "tour-floating-media-preview__image";
  artifactImage.alt = "";
  artifactImageWrap.appendChild(artifactImage);
  artifactModel.className = "tour-floating-media-preview__model";
  artifactModel.setAttribute("camera-controls", "");
  artifactModel.setAttribute("touch-action", "none");
  artifactModel.setAttribute("auto-rotate", "");
  artifactModel.setAttribute("shadow-intensity", "1");
  artifactModel.setAttribute("ar", "");
  artifactModel.setAttribute("ar-modes", "webxr scene-viewer quick-look");
  artifactModel.hidden = true;
  artifactSwitch.className = "tour-floating-media-window-switch tour-dynamic-artifact-switch";
  artifactSwitch.type = "button";
  artifactSwitch.hidden = true;
  artifactTitle.className = "tour-floating-preview__title";
  artifactClose.className = "tour-floating-media-preview__close";
  artifactClose.type = "button";
  artifactClose.setAttribute("aria-label", "Return artifact to tour view");
  artifactClose.textContent = "\u00d7";
  artifactMediaWrap.appendChild(artifactImageWrap);
  artifactMediaWrap.appendChild(artifactModel);
  artifactArButton = installModelArControl(artifactModel, artifactMediaWrap);
  artifactArButton.hidden = true;
  artifactMediaWrap.appendChild(artifactSwitch);
  artifactPanel.appendChild(artifactMediaWrap);
  artifactPanel.appendChild(artifactTitle);
  artifactPanel.appendChild(artifactClose);
  artifactOverlay.appendChild(artifactPanel);
  app.appendChild(artifactOverlay);

  imageHotspotLayer.className = "tour-artifact-image-hotspots";
  imageHotspotLayer.hidden = true;
  imageHotspotToggle.className = "tour-artifact-image-hotspots__toggle";
  imageHotspotToggle.type = "button";
  imageHotspotToggle.hidden = true;
  imageHotspotToggle.setAttribute("aria-label", "Hide artifact image hotspots");
  imageHotspotToggle.setAttribute("aria-pressed", "true");
  imageHotspotToggle.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="6" cy="12" r="2.2" fill="currentColor"></circle><circle cx="12" cy="7" r="2.2" fill="currentColor"></circle><circle cx="18" cy="12" r="2.2" fill="currentColor"></circle><path d="M7.8 10.8 10.2 8.3M13.8 8.3l2.4 2.5" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"></path></svg>';
  detailOverlay.className = "tour-artifact-image-detail";
  detailOverlay.hidden = true;
  detailOverlay.setAttribute("role", "dialog");
  detailOverlay.setAttribute("aria-modal", "false");
  detailOverlay.setAttribute("aria-label", "Artifact detail image");
  var detailZoomFrame = document.createElement("div");
  detailZoomFrame.className = "tour-artifact-image-detail__zoomframe";
  detailImage.className = "tour-artifact-image-detail__image";
  detailTitle.className = "tour-artifact-image-detail__title";
  detailClose.className = "tour-artifact-image-detail__close";
  detailClose.type = "button";
  detailClose.setAttribute("aria-label", "Close artifact detail");
  detailClose.textContent = "\u00d7";
  detailZoomFrame.appendChild(detailImage);
  detailOverlay.appendChild(detailZoomFrame);
  detailOverlay.appendChild(detailTitle);
  detailOverlay.appendChild(detailClose);
  artifactImageWrap.appendChild(imageHotspotLayer);
  artifactImageWrap.appendChild(imageHotspotToggle);
  artifactOverlay.appendChild(detailOverlay);

  if (minimap) minimap.hidden = true;
  if (viewModes) viewModes.hidden = true;

  function localized(value, preferred) {
    value = value || {};
    return String(value[preferred] || value.en || value.tl || "");
  }

  function ensureArNotice() {
    if (arNotice) return arNotice;
    var notice = document.createElement("div");
    notice.className = "tour-ar-notice";
    notice.hidden = true;
    notice.setAttribute("role", "alert");
    notice.setAttribute("aria-live", "assertive");
    notice.setAttribute("aria-atomic", "true");
    notice.innerHTML = '<span class="tour-ar-notice__icon" aria-hidden="true">!</span>'
      + '<span class="tour-ar-notice__copy"><strong>AR is unavailable</strong>'
      + '<span>This device or browser does not support Quick Look, WebXR, or Scene Viewer AR. You can still explore the 3D model here.</span></span>'
      + '<button class="tour-ar-notice__close" type="button" aria-label="Close AR compatibility notice">&times;</button>';
    notice.querySelector(".tour-ar-notice__close").addEventListener("click", function () {
      window.clearTimeout(arNoticeTimer);
      notice.classList.remove("is-visible");
      notice.hidden = true;
    });
    app.appendChild(notice);
    arNotice = notice;
    return notice;
  }

  function showArCompatibilityNotice() {
    var notice = ensureArNotice();
    window.clearTimeout(arNoticeTimer);
    notice.hidden = false;
    window.requestAnimationFrame(function () { notice.classList.add("is-visible"); });
    arNoticeTimer = window.setTimeout(function () {
      notice.classList.remove("is-visible");
      window.setTimeout(function () {
        if (!notice.classList.contains("is-visible")) notice.hidden = true;
      }, 220);
    }, 6000);
  }

  function installModelArControl(model, container) {
    if (!model || !container) return null;
    var existing = container.querySelector(":scope > .tour-model-ar-button");
    if (existing) return existing;
    model.classList.add("tour-model--managed-ar");
    var button = document.createElement("button");
    button.className = "tour-model-ar-button";
    button.type = "button";
    button.setAttribute("aria-label", "Quick Look: view artifact in your space");
    button.setAttribute("title", "Quick Look · View in your space");
    button.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" d="M12 2.75 19 6.2v8.1L12 17.75 5 14.3V6.2L12 2.75Zm0 7.05L5.4 6.55M12 9.8l6.6-3.25M12 9.8v7.6"/><path stroke-linecap="round" d="M8.25 20.5h7.5"/></svg>';
    container.appendChild(button);
    if (!managedArModels.has(model)) {
      managedArModels.add(model);
      model.addEventListener("ar-status", function (event) {
        if (event.detail && event.detail.status === "failed") showArCompatibilityNotice();
      });
    }
    button.addEventListener("click", function (event) {
      event.preventDefault();
      event.stopPropagation();
      window.customElements.whenDefined("model-viewer").then(function () {
        if (!model.src || typeof model.activateAR !== "function" || !model.canActivateAR) {
          showArCompatibilityNotice();
          return;
        }
        return model.activateAR();
      }).catch(function () { showArCompatibilityNotice(); });
    });
    return button;
  }

  function setSubtitle() {
    var value = activeItem && activeItem.content ? localized(activeItem.content.subtitle, language) : "";
    subtitleText.textContent = value;
    subtitleBar.hidden = !subtitlesOn || !value;
  }

  function setPane(name) {
    var hasGlb = Boolean(activeItem && activeItem.content && activeItem.content.glb);
    if (name === "glb" && !hasGlb) name = "image";
    var showModel = name === "glb";
    artifactImageWrap.hidden = showModel;
    artifactModel.hidden = !showModel;
    artifactArButton.hidden = !showModel;
    artifactSwitch.hidden = !hasGlb;
    artifactSwitch.setAttribute("aria-label", showModel ? "Show artifact image" : "Quick look at the 3D artifact");
    artifactSwitch.setAttribute("aria-pressed", showModel ? "true" : "false");
    artifactSwitch.innerHTML = showModel
      ? '<span class="tour-floating-media-window-switch-icon" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M5 6.5A1.5 1.5 0 0 1 6.5 5h11A1.5 1.5 0 0 1 19 6.5v11a1.5 1.5 0 0 1-1.5 1.5h-11A1.5 1.5 0 0 1 5 17.5v-11Zm1.5-.5a.5.5 0 0 0-.5.5v8.2l3.1-3.45a1 1 0 0 1 1.48-.03l1.9 2.02 2.45-2.78a1 1 0 0 1 1.5.02L18 12.4V6.5a.5.5 0 0 0-.5-.5h-11Z" fill="currentColor"></path></svg></span><span class="tour-sr-only">Show image</span>'
      : '<span class="tour-floating-media-window-switch-icon" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M12 2.5 19.5 6v12L12 21.5 4.5 18V6L12 2.5Zm0 1.12L5.73 6.5 12 9.38l6.27-2.88L12 3.62Zm6.5 3.69-6 2.76v10.28l6-3V7.31Zm-13 0v7.74l6 3V10.07l-6-2.76Z" fill="currentColor"></path></svg></span><span class="tour-sr-only">Quick look at 3D model</span>';
  }

  function syncAudioControls() {
    var source = activeItem && activeItem.content && activeItem.content.audio ? activeItem.content.audio[language] : "";
    var content = activeItem && activeItem.content ? activeItem.content : {};
    var hasLanguageContent = Boolean((content.audio && (content.audio.en || content.audio.tl)) || (content.subtitle && (content.subtitle.en || content.subtitle.tl)));
    languageButton.disabled = !hasLanguageContent;
    languageButton.setAttribute("aria-disabled", languageButton.disabled ? "true" : "false");
    languageButton.textContent = language.toUpperCase();
    languageButton.setAttribute("aria-label", language === "tl" ? "Switch to English narration and subtitles" : "Switch to Tagalog narration and subtitles");
    listenButton.classList.toggle("is-playing", !audio.paused && !audio.ended);
    listenButton.setAttribute("aria-pressed", !audio.paused && !audio.ended ? "true" : "false");
    listenButton.setAttribute("aria-label", !audio.paused && !audio.ended ? "Pause narration" : "Play narration");
    listenButton.disabled = !source;
    muteButton.classList.toggle("is-muted", audio.muted);
    muteButton.setAttribute("aria-pressed", audio.muted ? "true" : "false");
    muteButton.setAttribute("aria-label", audio.muted ? "Unmute narration" : "Mute narration");
  }

  function playNarration(restart) {
    if (!activeItem || !activeItem.content) return;
    var source = String((activeItem.content.audio || {})[language] || "");
    if (!source) { audio.pause(); audio.removeAttribute("src"); syncAudioControls(); return; }
    if (restart || audio.src !== new URL(source, window.location.href).href) { audio.src = source; audio.currentTime = 0; }
    var promise = audio.play(); if (promise && promise.catch) promise.catch(function () {});
    syncAudioControls();
  }

  function hideNestedDetail(restoreNarration) {
    detailOverlay.hidden = true;
    detailImage.removeAttribute("src");
    detailImage.alt = "";
    activeItem = rootItem;
    setSubtitle();
    if (restoreNarration && activeItem) playNarration(true);
    if (restoreNarration && detailOpener && detailOpener.isConnected) detailOpener.focus();
    detailOpener = null;
  }

  function showNestedDetail(detail) {
    if (!rootItem || !detail) return;
    detailOpener = document.activeElement;
    activeItem = {
      id: String(rootItem.id) + ":" + String(detail.id || "detail"),
      name: detail.title || { en: "Artifact detail", tl: "Detalye ng artifact" },
      content: {
        image: detail.image || "", glb: "", nested: [],
        subtitle: detail.subtitle || { en: "", tl: "" },
        audio: detail.audio || { en: "", tl: "" },
      },
    };
    detailImage.src = activeItem.content.image;
    detailImage.alt = localized(activeItem.name, language) || "Artifact detail image";
    detailTitle.textContent = localized(activeItem.name, language) || "Artifact detail";
    detailOverlay.setAttribute("aria-label", detailTitle.textContent);
    detailOverlay.hidden = false;
    setSubtitle();
    playNarration(true);
    detailClose.focus();
    if (window.NHCPAnalytics && window.NHCPAnalytics.track) {
      window.NHCPAnalytics.track("artifact_viewed", "virtual-tour", String(activeItem.id), { tour: config.tour.slug, scene: viewer && viewer.getScene ? viewer.getScene() : "", nestedDetail: true });
    }
  }

  function renderNestedHotspots(item) {
    var nested = item && item.content && Array.isArray(item.content.nested) ? item.content.nested : [];
    imageHotspotLayer.innerHTML = "";
    nested.forEach(function (detail, index) {
      var x = Number(detail.x), y = Number(detail.y);
      if (!Number.isFinite(x) || !Number.isFinite(y) || !detail.image) return;
      var button = document.createElement("button");
      var label = localized(detail.title, language) || "Artifact detail " + (index + 1);
      button.className = "tour-artifact-image-hotspot";
      button.type = "button";
      button.style.left = Math.min(100, Math.max(0, x)) + "%";
      button.style.top = Math.min(100, Math.max(0, y)) + "%";
      button.setAttribute("aria-label", "Open " + label);
      button.title = label;
      button.addEventListener("click", function (event) { event.preventDefault(); event.stopPropagation(); showNestedDetail(detail); });
      imageHotspotLayer.appendChild(button);
    });
    var hasNested = imageHotspotLayer.childElementCount > 0;
    imageHotspotLayer.hidden = !hasNested;
    imageHotspotToggle.hidden = !hasNested;
    imageHotspotToggle.classList.remove("is-off");
    imageHotspotToggle.setAttribute("aria-pressed", "true");
    imageHotspotToggle.setAttribute("aria-label", "Hide artifact image hotspots");
  }

  function openExpandedItem(item, pane, opener) {
    if (!item || !item.content) return;
    modalOpener = opener || (document.activeElement !== document.body ? document.activeElement : null);
    rootItem = item;
    activeItem = item;
    artifactImage.src = item.content.image || "";
    artifactImage.alt = localized(item.name, language) || "Artifact image";
    artifactTitle.textContent = localized(item.name, language) || "Artifact";
    if (item.content.glb) artifactModel.src = item.content.glb; else artifactModel.removeAttribute("src");
    artifactOverlay.hidden = false;
    artifactPanel.setAttribute("aria-label", localized(item.name, language) || "Artifact details");
    hideNestedDetail(false);
    renderNestedHotspots(item);
    setPane(pane || "image");
    setSubtitle();
    syncAudioControls();
    artifactClose.focus();
  }

  function closeExpandedItem(restoreFocus) {
    if (artifactOverlay.hidden) return;
    var wasShowingNestedDetail = Boolean(activeItem && rootItem && activeItem !== rootItem);
    artifactOverlay.hidden = true;
    detailOverlay.hidden = true;
    detailImage.removeAttribute("src");
    imageHotspotLayer.innerHTML = "";
    imageHotspotLayer.hidden = true;
    imageHotspotToggle.hidden = true;
    artifactImage.removeAttribute("src");
    artifactModel.removeAttribute("src");
    artifactArButton.hidden = true;
    activeItem = rootItem;
    setSubtitle();
    syncAudioControls();
    if (wasShowingNestedDetail && activeItem) playNarration(true);
    if (restoreFocus !== false && modalOpener && modalOpener.isConnected) modalOpener.focus();
    modalOpener = null;
    detailOpener = null;
  }

  function renderSpatialItem(node, item) {
    node.classList.add("tour-floating-image-window-hotspot", "tour-floating-media-window-hotspot");
    node.setAttribute("role", "group");
    node.setAttribute("aria-label", (localized(item.name, language) || "Artifact") + " media preview");

    var shell = document.createElement("div");
    var mediaWrap = document.createElement("div");
    var imageButton = document.createElement("button");
    var image = document.createElement("img");
    var model = document.createElement("model-viewer");
    var switchButton = document.createElement("button");
    var switchIcon = document.createElement("span");
    var switchLabel = document.createElement("span");
    var title = document.createElement("p");
    var closeButton = document.createElement("button");
    var currentView = "image";
    var pointerStart = null;
    var modelWasDragged = false;

    shell.className = "tour-floating-image-window-shell";
    mediaWrap.className = "tour-floating-image-window-mediawrap";
    imageButton.className = "tour-floating-image-window-trigger";
    imageButton.type = "button";
    imageButton.setAttribute("aria-label", "Expand artifact image");
    image.className = "tour-floating-image-window";
    image.src = item.content.image || "";
    image.draggable = false;
    model.className = "tour-floating-media-window-model";
    model.setAttribute("camera-controls", "");
    model.setAttribute("touch-action", "pan-y");
    model.setAttribute("auto-rotate", "");
    model.setAttribute("shadow-intensity", "1");
    model.setAttribute("ar", "");
    model.setAttribute("ar-modes", "webxr scene-viewer quick-look");
    model.hidden = true;
    if (item.content.glb) model.src = item.content.glb;
    switchButton.className = "tour-floating-media-window-switch";
    switchButton.type = "button";
    switchIcon.className = "tour-floating-media-window-switch-icon";
    switchIcon.setAttribute("aria-hidden", "true");
    switchLabel.className = "tour-sr-only";
    switchButton.appendChild(switchIcon);
    switchButton.appendChild(switchLabel);
    title.className = "tour-floating-image-window-title";
    closeButton.className = "tour-floating-image-window-close";
    closeButton.type = "button";
    closeButton.setAttribute("aria-label", "Close floating artifact");
    closeButton.textContent = "\u00d7";

    imageButton.appendChild(image);
    mediaWrap.appendChild(imageButton);
    mediaWrap.appendChild(model);
    var arButton = installModelArControl(model, mediaWrap);
    mediaWrap.appendChild(switchButton);
    shell.appendChild(mediaWrap);
    shell.appendChild(title);
    shell.appendChild(closeButton);
    node.appendChild(shell);

    function refreshText() {
      var name = localized(item.name, language) || "Artifact";
      image.alt = name;
      model.setAttribute("aria-label", name + " 3D model");
      title.textContent = name;
      node.setAttribute("aria-label", name + " media preview");
    }

    function syncView(nextView) {
      var hasGlb = Boolean(item.content.glb);
      currentView = nextView === "glb" && hasGlb ? "glb" : "image";
      var showModel = currentView === "glb";
      imageButton.hidden = showModel;
      imageButton.style.display = showModel ? "none" : "block";
      image.hidden = showModel;
      image.style.display = showModel ? "none" : "block";
      model.hidden = !showModel;
      model.style.display = showModel ? "block" : "none";
      arButton.hidden = !showModel;
      switchButton.hidden = !hasGlb;
      switchButton.setAttribute("aria-label", showModel ? "Switch floating artifact to image" : "Switch floating artifact to 3D model");
      switchButton.setAttribute("aria-pressed", showModel ? "true" : "false");
      switchLabel.textContent = showModel ? "Switch to image" : "Switch to 3D model";
      switchIcon.innerHTML = showModel
        ? '<svg viewBox="0 0 24 24"><path d="M5 6.5A1.5 1.5 0 0 1 6.5 5h11A1.5 1.5 0 0 1 19 6.5v11a1.5 1.5 0 0 1-1.5 1.5h-11A1.5 1.5 0 0 1 5 17.5v-11Zm1.5-.5a.5.5 0 0 0-.5.5v8.2l3.1-3.45a1 1 0 0 1 1.48-.03l1.9 2.02 2.45-2.78a1 1 0 0 1 1.5.02L18 12.4V6.5a.5.5 0 0 0-.5-.5h-11Z" fill="currentColor"></path></svg>'
        : '<svg viewBox="0 0 24 24"><path d="M12 2.5 19.5 6v12L12 21.5 4.5 18V6L12 2.5Zm0 1.12L5.73 6.5 12 9.38l6.27-2.88L12 3.62Zm6.5 3.69-6 2.76v10.28l6-3V7.31Zm-13 0v7.74l6 3V10.07l-6-2.76Z" fill="currentColor"></path></svg>';
    }

    imageButton.addEventListener("click", function (event) {
      event.preventDefault();
      event.stopPropagation();
      openExpandedItem(item, "image", imageButton);
    });
    switchButton.addEventListener("click", function (event) {
      event.preventDefault();
      event.stopPropagation();
      syncView(currentView === "image" ? "glb" : "image");
    });
    closeButton.addEventListener("click", function (event) {
      event.preventDefault();
      event.stopPropagation();
      closeItem();
    });
    model.addEventListener("pointerdown", function (event) {
      pointerStart = { x: event.clientX, y: event.clientY };
      modelWasDragged = false;
    });
    model.addEventListener("pointermove", function (event) {
      if (!pointerStart) return;
      if (Math.hypot(event.clientX - pointerStart.x, event.clientY - pointerStart.y) > 6) modelWasDragged = true;
    });
    model.addEventListener("pointerup", function () { window.setTimeout(function () { pointerStart = null; }, 0); });
    model.addEventListener("pointercancel", function () { pointerStart = null; modelWasDragged = false; });
    model.addEventListener("click", function (event) {
      if (modelWasDragged) { modelWasDragged = false; return; }
      event.preventDefault();
      event.stopPropagation();
      openExpandedItem(item, "glb", model);
    });

    spatialRefresh = refreshText;
    refreshText();
    syncView("image");
  }

  function openItem(item) {
    if (!item || !item.content || !viewer || typeof viewer.getScene !== "function") return;
    var nextSceneId = viewer.getScene();
    var nextHotspotId = "item-" + String(item.id) + "-window";
    if (floatingSceneId === nextSceneId && floatingHotspotId === nextHotspotId) {
      closeItem();
      return;
    }
    var opener = document.activeElement && document.activeElement !== document.body ? document.activeElement : null;
    closeItem(false);
    itemOpener = opener;
    rootItem = item;
    activeItem = item;
    floatingSceneId = nextSceneId;
    floatingHotspotId = nextHotspotId;
    try {
      viewer.addHotSpot({
        id: nextHotspotId,
        pitch: Number(item.pitch),
        yaw: Number(item.yaw),
        type: "info",
        text: "",
        cssClass: "tour-floating-image-window-hotspot tour-floating-media-window-hotspot",
        createTooltipFunc: renderSpatialItem,
        createTooltipArgs: item,
      }, nextSceneId);
    } catch (_) {
      floatingSceneId = "";
      floatingHotspotId = "";
      spatialRefresh = null;
      activeItem = null;
      rootItem = null;
      itemOpener = null;
      setSubtitle();
      syncAudioControls();
      return;
    }
    setSubtitle();
    playNarration(true);
    if (window.NHCPAnalytics && window.NHCPAnalytics.track) {
      window.NHCPAnalytics.track("artifact_viewed", "virtual-tour", String(item.id), { tour: config.tour.slug, scene: nextSceneId });
    }
  }

  function closeItem(restoreFocus) {
    closeExpandedItem(false);
    if (viewer && floatingHotspotId && floatingSceneId) {
      try { viewer.removeHotSpot(floatingHotspotId, floatingSceneId); } catch (_) {}
    }
    floatingSceneId = "";
    floatingHotspotId = "";
    spatialRefresh = null;
    audio.pause();
    audio.removeAttribute("src");
    activeItem = null;
    rootItem = null;
    detailOverlay.hidden = true;
    setSubtitle();
    syncAudioControls();
    if (restoreFocus !== false) {
      if (itemOpener && itemOpener.isConnected) itemOpener.focus();
      else document.getElementById("tourViewer").focus();
    }
    itemOpener = null;
    modalOpener = null;
    detailOpener = null;
  }

  function itemTooltip(node, args) {
    node.setAttribute("role", "button"); node.setAttribute("tabindex", "0");
    node.setAttribute("aria-label", localized(args.name, "en") || "Open artifact");
    node.addEventListener("keydown", function (event) { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); openItem(args); } });
  }

  var pannellumScenes = {};
  scenes.forEach(function (scene) {
    var hotSpots = [];
    (scene.hotspots || []).forEach(function (hotspot) {
      if (hotspot.type === "navigation" && sceneIds.has(hotspot.targetScene)) {
        var nav = { id: "nav-" + hotspot.id, pitch: hotspot.pitch, yaw: hotspot.yaw, type: "scene", sceneId: hotspot.targetScene, text: localized(hotspot.name, "en") || "Move to next scene", cssClass: "tour-ground-hotspot" };
        if (hotspot.targetPitch != null) nav.targetPitch = hotspot.targetPitch;
        if (hotspot.targetYaw != null) nav.targetYaw = hotspot.targetYaw;
        if (hotspot.targetHfov != null) nav.targetHfov = hotspot.targetHfov;
        hotSpots.push(nav);
      } else if (hotspot.type === "item") {
        hotSpots.push({
          id: "item-" + hotspot.id, pitch: hotspot.pitch, yaw: hotspot.yaw, type: "info", text: "",
          cssClass: "tour-ground-hotspot tour-ground-hotspot--pulse tour-ground-hotspot--compact tour-ground-hotspot--no-icon",
          clickHandlerFunc: function (_, args) { openItem(args); }, clickHandlerArgs: hotspot,
          createTooltipFunc: itemTooltip, createTooltipArgs: hotspot,
        });
      }
    });
    pannellumScenes[scene.id] = { type: "equirectangular", panorama: scene.panorama, pitch: scene.pitch, yaw: scene.yaw, hfov: scene.hfov, hotSpots: hotSpots };
  });

  var requestedScene = new URLSearchParams(window.location.search).get("scene");
  var initialScene = requestedScene && pannellumScenes[requestedScene] ? requestedScene : config.startScene;
  if (!initialScene || !pannellumScenes[initialScene]) {
    loading.hidden = true; errorOverlay.hidden = false; return;
  }

  try {
    var originalGetContext = HTMLCanvasElement.prototype.getContext;
    var captureContextPatched = false;
    HTMLCanvasElement.prototype.getContext = function (type, attributes) {
      if (!captureContextPatched && (type === "webgl" || type === "experimental-webgl" || type === "webgl2")) {
        captureContextPatched = true;
        return originalGetContext.call(this, type, Object.assign({}, attributes || {}, { preserveDrawingBuffer: true }));
      }
      return originalGetContext.call(this, type, attributes);
    };
    viewer = window.pannellum.viewer("tourViewer", {
      default: { firstScene: initialScene, sceneFadeDuration: 850 }, scenes: pannellumScenes,
      autoLoad: true, showControls: true, compass: false, minHfov: 50, maxHfov: 140,
      mouseZoom: true, draggable: true, disableKeyboardCtrl: false, escapeHTML: true,
      loadingText: "Loading 360 view…",
    });
    HTMLCanvasElement.prototype.getContext = originalGetContext;
    viewer.on("load", function () {
      loading.hidden = true; errorOverlay.hidden = true; dock.hidden = false;
      if (window.NHCPAnalytics && window.NHCPAnalytics.track) {
        window.NHCPAnalytics.track("virtual_tour_opened", "virtual-tour", config.tour.slug, { scene: viewer.getScene(), tour: config.tour.slug }, { onceKey: "virtual-tour:" + config.tour.slug });
      }
    });
    viewer.on("scenechange", function (sceneId) {
      closeItem();
      var url = new URL(window.location.href); url.searchParams.set("scene", sceneId); window.history.replaceState({}, "", url);
      if (window.NHCPAnalytics && window.NHCPAnalytics.track) window.NHCPAnalytics.track("tour_scene_viewed", "virtual-tour", sceneId, { tour: config.tour.slug, scene: sceneId });
    });
  } catch (_) {
    if (typeof originalGetContext === "function") HTMLCanvasElement.prototype.getContext = originalGetContext;
    loading.hidden = true; errorOverlay.hidden = false;
  }

  artifactClose.addEventListener("click", function () { closeExpandedItem(true); });
  detailClose.addEventListener("click", function () { hideNestedDetail(true); });
  detailOverlay.addEventListener("click", function (event) { if (event.target === detailOverlay) hideNestedDetail(true); });
  imageHotspotToggle.addEventListener("click", function () {
    var willShow = imageHotspotLayer.hidden;
    imageHotspotLayer.hidden = !willShow;
    imageHotspotToggle.classList.toggle("is-off", !willShow);
    imageHotspotToggle.setAttribute("aria-pressed", willShow ? "true" : "false");
    imageHotspotToggle.setAttribute("aria-label", willShow ? "Hide artifact image hotspots" : "Show artifact image hotspots");
  });
  artifactOverlay.addEventListener("click", function (event) { if (event.target === artifactOverlay) closeExpandedItem(true); });
  artifactSwitch.addEventListener("click", function () { setPane(artifactModel.hidden ? "glb" : "image"); });
  languageButton.addEventListener("click", function () {
    language = language === "tl" ? "en" : "tl";
    if (!detailOverlay.hidden && activeItem) {
      detailImage.alt = localized(activeItem.name, language) || "Artifact detail image";
      detailTitle.textContent = localized(activeItem.name, language) || "Artifact detail";
    } else if (rootItem) {
      artifactImage.alt = localized(rootItem.name, language) || "Artifact image";
      artifactTitle.textContent = localized(rootItem.name, language) || "Artifact";
      artifactPanel.setAttribute("aria-label", localized(rootItem.name, language) || "Artifact details");
      renderNestedHotspots(rootItem);
    }
    if (spatialRefresh) spatialRefresh();
    setSubtitle(); syncAudioControls(); playNarration(true);
  });
  listenButton.addEventListener("click", function () { if (!audio.paused) audio.pause(); else playNarration(false); syncAudioControls(); });
  muteButton.addEventListener("click", function () { audio.muted = !audio.muted; syncAudioControls(); });
  subtitlesButton.addEventListener("click", function () { subtitlesOn = !subtitlesOn; subtitlesButton.classList.toggle("is-active", subtitlesOn); subtitlesButton.setAttribute("aria-pressed", subtitlesOn ? "true" : "false"); subtitlesButton.setAttribute("aria-label", subtitlesOn ? "Hide subtitles" : "Show subtitles"); setSubtitle(); });
  hotspotButton.addEventListener("click", function () { hotspotsVisible = !hotspotsVisible; app.classList.toggle("tour-hide-scene-hotspots", !hotspotsVisible); app.classList.toggle("tour-hide-artifact-hotspots", !hotspotsVisible); hotspotButton.setAttribute("aria-pressed", hotspotsVisible ? "true" : "false"); hotspotButton.setAttribute("aria-label", hotspotsVisible ? "Hide hotspots" : "Show hotspots"); });
  backButton.addEventListener("click", function () { window.location.href = app.dataset.interactiveUrl || "/interactive"; });
  captureButton.addEventListener("click", function () {
    if (!window.html2canvas) return;
    window.html2canvas(document.getElementById("tourViewer"), { useCORS: true, backgroundColor: null }).then(function (canvas) {
      var link = document.createElement("a"); link.download = "virtual-tour-" + config.tour.slug + ".png"; link.href = canvas.toDataURL("image/png"); link.click();
    }).catch(function () {});
  });
  audio.addEventListener("play", syncAudioControls); audio.addEventListener("pause", syncAudioControls); audio.addEventListener("ended", syncAudioControls);
  document.addEventListener("keydown", function (event) {
    if (event.key === "Escape") {
      if (!artifactOverlay.hidden) {
        if (!detailOverlay.hidden) hideNestedDetail(true); else closeExpandedItem(true);
      } else if (floatingHotspotId) {
        closeItem();
      }
      return;
    }
    if (artifactOverlay.hidden) return;
    if (event.key !== "Tab") return;
    var focusable = Array.prototype.slice.call(artifactOverlay.querySelectorAll('button:not([disabled]), [href], [tabindex]:not([tabindex="-1"])')).filter(function (element) {
      return !element.closest("[hidden]");
    });
    if (!focusable.length) return;
    var first = focusable[0], last = focusable[focusable.length - 1];
    if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
    else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
  });
  hotspotButton.setAttribute("aria-pressed", "true");
  syncAudioControls(); setSubtitle();
})();
