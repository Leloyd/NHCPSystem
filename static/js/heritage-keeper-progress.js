(function () {
  "use strict";

  var configElement = document.getElementById("heritageKeeperConfig");
  if (!configElement) return;

  var config;
  try {
    config = JSON.parse(configElement.textContent || "{}");
  } catch (error) {
    return;
  }

  var source = config.source === "ar" ? "ar" : "trail";
  var authenticated = config.authenticated === true;
  var sent = new Set();
  var beatTimers = [];
  var completionTimer = 0;
  var activeModal = null;
  var lastFocusedElement = null;
  var serverProgress = null;

  function deriveRequiredTotal() {
    var configured = Number(config.total || 0);
    if (configured > 0) return configured;
    if (source !== "ar") return 10;

    var markerConfig = document.getElementById("ar-three-config");
    if (!markerConfig) return 0;
    try {
      var parsed = JSON.parse(markerConfig.textContent || "{}");
      return Array.isArray(parsed.markers)
        ? parsed.markers.filter(function (marker) { return marker && marker.anamorphicPuzzle === true; }).length
        : 0;
    } catch (error) {
      return 0;
    }
  }

  var requiredTotal = deriveRequiredTotal();
  var guestStorageKey = "nhcpHeritageKeeperGuest:" + source;
  var completionStorageKey = "nhcpHeritageKeeperCompleteShown:" + source;

  var capsule = document.createElement("div");
  capsule.className = "hk-progress-capsule";
  capsule.setAttribute("role", "status");
  capsule.setAttribute("aria-live", "polite");
  capsule.setAttribute("aria-atomic", "true");
  capsule.innerHTML = [
    '<span class="hk-progress-capsule__icon" aria-hidden="true">',
    '  <svg class="hk-progress-capsule__fragment" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path stroke-linecap="round" stroke-linejoin="round" d="M5.2 4.8h5.1c.1 1.9 1.1 3 2.7 3s2.6-1.1 2.7-3h3.1v5.1c-1.9.1-3 1.1-3 2.7s1.1 2.6 3 2.7v3.9h-5.1c-.1-1.9-1.1-3-2.7-3s-2.6 1.1-2.7 3H5.2v-5.1c1.9-.1 3-1.1 3-2.7s-1.1-2.6-3-2.7V4.8Z"/></svg>',
    '  <svg class="hk-progress-capsule__check" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.3"><path stroke-linecap="round" stroke-linejoin="round" d="m6.5 12.4 3.4 3.4 7.8-8"/></svg>',
    '</span>',
    '<span class="hk-progress-capsule__count"></span>'
  ].join("");
  document.body.appendChild(capsule);

  var capsuleCount = capsule.querySelector(".hk-progress-capsule__count");

  function clearBeatTimers() {
    while (beatTimers.length) window.clearTimeout(beatTimers.pop());
  }

  function sourceCount(progress) {
    if (!progress) return 0;
    return source === "ar" ? Number(progress.ar_count || 0) : Number(progress.trail_count || 0);
  }

  function sourceRequired(progress) {
    if (progress) {
      var serverRequired = source === "ar" ? Number(progress.ar_required || 0) : Number(progress.trail_required || 0);
      if (serverRequired > 0) return serverRequired;
    }
    return requiredTotal;
  }

  function readGuestKeys() {
    try {
      var parsed = JSON.parse(window.sessionStorage.getItem(guestStorageKey) || "[]");
      return Array.isArray(parsed)
        ? parsed.map(function (key) { return String(key || "").trim().toLowerCase(); }).filter(Boolean)
        : [];
    } catch (error) {
      return [];
    }
  }

  function writeGuestKeys(keys) {
    try {
      window.sessionStorage.setItem(guestStorageKey, JSON.stringify(keys));
    } catch (error) {
      // The reward animation remains available even when storage is blocked.
    }
  }

  function recordGuestKey(itemKey) {
    var normalized = String(itemKey || "").trim().toLowerCase();
    var keys = readGuestKeys();
    if (!normalized || keys.indexOf(normalized) >= 0) {
      return { added: false, count: keys.length, total: requiredTotal };
    }
    keys.push(normalized);
    if (source === "trail") {
      keys.sort(function (left, right) {
        return Number(left.replace(/\D/g, "")) - Number(right.replace(/\D/g, ""));
      });
    }
    writeGuestKeys(keys);
    return { added: true, count: keys.length, total: requiredTotal };
  }

  function showProgressBeat(count, total) {
    clearBeatTimers();
    var safeTotal = Math.max(1, Number(total || requiredTotal || 1));
    var safeCount = Math.max(0, Math.min(safeTotal, Number(count || 0)));
    var unit = source === "ar" ? "Fragments" : "Stops";
    capsuleCount.textContent = safeCount + "/" + safeTotal + " " + unit;
    capsule.setAttribute("aria-label", safeCount + " of " + safeTotal + " " + unit + " collected");
    capsule.classList.remove("is-visible", "is-expanded", "is-checked");
    void capsule.offsetWidth;
    capsule.classList.add("is-visible");

    beatTimers.push(window.setTimeout(function () { capsule.classList.add("is-expanded"); }, 170));
    beatTimers.push(window.setTimeout(function () { capsule.classList.add("is-checked"); }, 1250));
    beatTimers.push(window.setTimeout(function () { capsule.classList.remove("is-expanded"); }, 2450));
    beatTimers.push(window.setTimeout(function () { capsule.classList.remove("is-visible", "is-checked"); }, 2950));
  }

  function closeModal() {
    if (!activeModal) return;
    var modal = activeModal;
    activeModal = null;
    modal.remove();
    document.documentElement.classList.remove("hk-modal-open");
    document.body.classList.remove("hk-modal-open");
    if (lastFocusedElement && typeof lastFocusedElement.focus === "function") {
      lastFocusedElement.focus({ preventScroll: true });
    }
    lastFocusedElement = null;
  }

  function getArInterfaceLanguage() {
    var storedLanguage = String(document.documentElement.getAttribute("data-ar-language") || "").toLowerCase();
    if (storedLanguage === "en" || storedLanguage === "tl") return storedLanguage;

    var languageControl = document.getElementById("arLanguage");
    return languageControl && String(languageControl.textContent || "").trim().toUpperCase() === "EN"
      ? "en"
      : "tl";
  }

  function escapeAttribute(value) {
    return String(value || "")
      .replace(/&/g, "&amp;")
      .replace(/"/g, "&quot;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
  }

  function showArCompletionModal(isGuest) {
    if (source !== "ar") return;
    try {
      if (window.sessionStorage.getItem(completionStorageKey) === "1") return;
      window.sessionStorage.setItem(completionStorageKey, "1");
    } catch (error) {
      // Showing the dialog once per runtime is still safe without storage.
    }

    closeModal();
    lastFocusedElement = document.activeElement;
    var language = getArInterfaceLanguage();
    var total = Math.max(1, requiredTotal || 1);
    var copy = language === "en"
      ? {
          close: "Close AR restoration record",
          eyebrow: "Restoration record",
          title: "AR Restoration Complete",
          lead: "You restored every registered artifact and recovered every fragment of the AR restoration seal.",
          plate: "Restoration Plate I",
          seal: "AR Restoration Seal",
          status: "Collection status",
          recovered: total + " of " + total + " fragments recovered",
          note: isGuest
            ? "Your restoration is complete on this device. Sign in or create an account to preserve these fragments in your Heritage Keeper."
            : "Your restored fragments are now preserved in your Heritage Keeper.",
          primary: isGuest ? "Sign in to save the seal" : "View Heritage Keeper",
          secondary: "Continue scanning",
          loading: "Preparing the restored seal",
          unavailable: "The 3D seal could not be displayed. Your collected fragments are still complete."
        }
      : {
          close: "Isara ang tala ng pagpapanumbalik sa AR",
          eyebrow: "Tala ng pagpapanumbalik",
          title: "Kumpleto ang Pagpapanumbalik sa AR",
          lead: "Naibalik mo ang lahat ng nakatalang artifact at nakuha ang bawat bahagi ng AR restoration seal.",
          plate: "Plaka ng Pagpapanumbalik I",
          seal: "Selyo ng AR Restoration",
          status: "Katayuan ng koleksiyon",
          recovered: total + " sa " + total + " bahagi ang nakuha",
          note: isGuest
            ? "Kumpleto na sa device na ito ang iyong pagpapanumbalik. Mag-sign in o gumawa ng account upang maitala ang mga bahaging ito sa iyong Heritage Keeper."
            : "Naitala na sa iyong Heritage Keeper ang mga bahaging naibalik mo.",
          primary: isGuest ? "Mag-sign in upang itala" : "Tingnan ang Heritage Keeper",
          secondary: "Magpatuloy sa pag-scan",
          loading: "Inihahanda ang naibalik na selyo",
          unavailable: "Hindi maipakita ang 3D seal. Kumpleto pa rin ang mga bahaging iyong nakuha."
        };
    var sealUrl = escapeAttribute(config.sealUrl || "/Seal/AR-seal.glb");
    var primaryUrl = escapeAttribute(isGuest ? config.loginUrl : config.rewardUrl);
    var modal = document.createElement("div");
    modal.className = "hk-unlock-modal hk-unlock-modal--ar";
    modal.setAttribute("role", "dialog");
    modal.setAttribute("aria-modal", "true");
    modal.setAttribute("aria-labelledby", "hkArCompleteTitle");
    modal.setAttribute("data-hk-language", language);
    modal.innerHTML = [
      '<div class="hk-unlock-modal__card">',
      '  <button class="hk-unlock-modal__close" type="button" aria-label="' + escapeAttribute(copy.close) + '">&times;</button>',
      '  <span class="hk-unlock-modal__corner hk-unlock-modal__corner--one" aria-hidden="true"></span>',
      '  <span class="hk-unlock-modal__corner hk-unlock-modal__corner--two" aria-hidden="true"></span>',
      '  <div class="hk-unlock-modal__layout">',
      '    <div class="hk-unlock-modal__seal-panel">',
      '      <p class="hk-unlock-modal__plate">' + copy.plate + '</p>',
      '      <div class="hk-unlock-modal__model-wrap">',
      '        <model-viewer class="hk-unlock-modal__model" src="' + sealUrl + '" alt="' + escapeAttribute(copy.seal) + '" camera-controls auto-rotate rotation-per-second="12deg" interaction-prompt="none" shadow-intensity="0" exposure="1.05" camera-orbit="0deg 75deg 105%" min-camera-orbit="auto auto 72%" max-camera-orbit="auto auto 145%">',
      '          <div class="hk-unlock-modal__model-progress" slot="progress-bar"><span></span></div>',
      '        </model-viewer>',
      '        <p class="hk-unlock-modal__model-status" role="status">' + copy.loading + '</p>',
      '        <p class="hk-unlock-modal__model-error" hidden>' + copy.unavailable + '</p>',
      '      </div>',
      '      <p class="hk-unlock-modal__seal-caption">' + copy.seal + '</p>',
      '    </div>',
      '    <div class="hk-unlock-modal__copy">',
      '      <p class="hk-unlock-modal__eyebrow">' + copy.eyebrow + '</p>',
      '      <h2 id="hkArCompleteTitle">' + copy.title + '</h2>',
      '      <p class="hk-unlock-modal__lead">' + copy.lead + '</p>',
      '      <div class="hk-unlock-modal__record">',
      '        <span>' + copy.status + '</span>',
      '        <strong>' + copy.recovered + '</strong>',
      '      </div>',
      '      <p class="hk-unlock-modal__note">' + copy.note + '</p>',
      '      <div class="hk-unlock-modal__actions">',
      '        <a href="' + primaryUrl + '">' + copy.primary + '</a>',
      '        <button type="button" data-hk-modal-close>' + copy.secondary + '</button>',
      '      </div>',
      '    </div>',
      '  </div>',
      '</div>'
    ].join("");

    activeModal = modal;
    document.body.appendChild(modal);
    document.documentElement.classList.add("hk-modal-open");
    document.body.classList.add("hk-modal-open");

    var sealViewer = modal.querySelector(".hk-unlock-modal__model");
    var modelStatus = modal.querySelector(".hk-unlock-modal__model-status");
    var modelError = modal.querySelector(".hk-unlock-modal__model-error");
    if (sealViewer) {
      if (window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
        sealViewer.removeAttribute("auto-rotate");
      }
      sealViewer.addEventListener("load", function () {
        sealViewer.classList.add("is-ready");
        if (modelStatus) modelStatus.hidden = true;
      }, { once: true });
      sealViewer.addEventListener("error", function () {
        if (modelStatus) modelStatus.hidden = true;
        if (modelError) modelError.hidden = false;
      }, { once: true });
    }

    modal.querySelector(".hk-unlock-modal__close").addEventListener("click", closeModal);
    modal.querySelector("[data-hk-modal-close]").addEventListener("click", closeModal);
    modal.addEventListener("click", function (event) { if (event.target === modal) closeModal(); });
    modal.addEventListener("keydown", function (event) {
      if (event.key === "Escape") {
        event.preventDefault();
        closeModal();
        return;
      }
      if (event.key !== "Tab") return;
      var focusable = Array.prototype.slice.call(
        modal.querySelectorAll('a[href], button:not([disabled]), model-viewer[camera-controls]')
      );
      if (!focusable.length) return;
      var first = focusable[0];
      var last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    });
    modal.querySelector(".hk-unlock-modal__close").focus({ preventScroll: true });
  }

  function queueArCompletionModal(isGuest) {
    window.clearTimeout(completionTimer);
    completionTimer = window.setTimeout(function () {
      completionTimer = 0;
      showArCompletionModal(isGuest);
    }, 3150);
  }

  async function postAward(itemSource, itemKey) {
    var response = await fetch(config.awardUrl, {
      method: "POST",
      credentials: "same-origin",
      headers: {
        "Content-Type": "application/json",
        "Accept": "application/json",
        "X-CSRF-Token": config.csrfToken || "",
      },
      body: JSON.stringify({ source: itemSource, item_key: itemKey }),
    });
    var payload = await response.json();
    if (!response.ok || !payload.ok) throw new Error(payload.error || "Progress could not be saved.");
    serverProgress = payload.progress || serverProgress;
    return payload;
  }

  async function loadProgress() {
    if (!authenticated || !config.progressUrl) return null;
    try {
      var response = await fetch(config.progressUrl, {
        headers: { Accept: "application/json" },
        credentials: "same-origin"
      });
      var payload = await response.json();
      if (response.ok && payload.ok) {
        serverProgress = payload.progress;
        return payload.progress;
      }
    } catch (error) {
      // The museum experience remains available when progress is offline.
    }
    return null;
  }

  async function syncGuestProgress() {
    if (!authenticated || !config.awardUrl) return;
    var guestKeys = readGuestKeys();
    if (!guestKeys.length) return;

    var remaining = [];
    var latestPayload = null;
    for (var index = 0; index < guestKeys.length; index += 1) {
      var key = guestKeys[index];
      try {
        latestPayload = await postAward(source, key);
        sent.add(source + ":" + key);
      } catch (error) {
        remaining.push(key);
      }
    }
    writeGuestKeys(remaining);

    if (latestPayload && latestPayload.progress) {
      var count = sourceCount(latestPayload.progress);
      var total = sourceRequired(latestPayload.progress);
      showProgressBeat(count, total);
      if (source === "ar" && count >= total && total > 0) queueArCompletionModal(false);
    }
  }

  async function award(itemSource, itemKey) {
    var normalizedSource = itemSource === "ar" ? "ar" : "trail";
    var normalizedKey = String(itemKey || "").trim().toLowerCase();
    if (normalizedSource !== source || !normalizedKey) return null;

    var identity = normalizedSource + ":" + normalizedKey;
    if (sent.has(identity)) return null;
    sent.add(identity);

    if (!authenticated) {
      var guestResult = recordGuestKey(normalizedKey);
      if (guestResult.added) showProgressBeat(guestResult.count, guestResult.total);
      if (normalizedSource === "ar" && guestResult.added && guestResult.total > 0 && guestResult.count >= guestResult.total) {
        queueArCompletionModal(true);
      }
      return {
        ok: true,
        guest: true,
        new_fragment: guestResult.added,
        source_count: guestResult.count,
        source_required: guestResult.total
      };
    }

    try {
      var payload = await postAward(normalizedSource, normalizedKey);
      if (payload.new_fragment) {
        var count = sourceCount(payload.progress);
        var total = sourceRequired(payload.progress);
        showProgressBeat(count, total);
        if (normalizedSource === "ar" && count >= total && total > 0) queueArCompletionModal(false);
      }
      return payload;
    } catch (error) {
      sent.delete(identity);
      return null;
    }
  }

  document.querySelectorAll("[data-hk-award-link]").forEach(function (link) {
    link.addEventListener("click", async function (event) {
      var href = link.getAttribute("href");
      var itemSource = link.getAttribute("data-hk-source") || source;
      var itemKey = link.getAttribute("data-hk-key") || "";
      if (!href || !itemKey) return;
      event.preventDefault();
      await award(itemSource, itemKey);
      window.location.assign(href);
    });
  });

  window.NHCPHeritageKeeper = {
    award: award,
    refresh: loadProgress,
    getSource: function () { return source; },
    getGuestCount: function () { return readGuestKeys().length; }
  };

  if (authenticated) {
    loadProgress().then(syncGuestProgress);
  }
})();
