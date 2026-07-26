(function () {
  "use strict";

  var endpoint = "/api/analytics/events";
  var queue = [];
  var flushTimer = 0;
  var clientStorageKey = "nhcp-analytics-client";
  var sessionPrefix = "nhcp-analytics-once:";

  function safeStorage(storage, action) {
    try {
      return action(storage);
    } catch (_error) {
      return null;
    }
  }

  function createClientId() {
    if (window.crypto && typeof window.crypto.randomUUID === "function") {
      return window.crypto.randomUUID();
    }
    if (window.crypto && typeof window.crypto.getRandomValues === "function") {
      var values = new Uint32Array(4);
      window.crypto.getRandomValues(values);
      return Array.prototype.map.call(values, function (value) {
        return value.toString(16).padStart(8, "0");
      }).join("");
    }
    return String(Date.now()) + "-" + Math.random().toString(36).slice(2);
  }

  var clientId =
    safeStorage(window.localStorage, function (storage) {
      return storage.getItem(clientStorageKey);
    }) || createClientId();

  safeStorage(window.localStorage, function (storage) {
    storage.setItem(clientStorageKey, clientId);
  });

  function cleanText(value, limit) {
    return String(value || "").trim().replace(/\s+/g, " ").slice(0, limit);
  }

  function cleanMetadata(metadata) {
    var output = {};
    var allowed = ["score", "total", "language", "source", "scene", "marker", "title"];
    if (!metadata || typeof metadata !== "object") {
      return output;
    }
    allowed.forEach(function (key) {
      if (!(key in metadata)) {
        return;
      }
      if (key === "score" || key === "total") {
        var number = Number.parseInt(metadata[key], 10);
        if (Number.isFinite(number)) {
          output[key] = Math.max(0, Math.min(number, 10000));
        }
        return;
      }
      output[key] = cleanText(metadata[key], 160);
    });
    return output;
  }

  function scheduleFlush() {
    if (flushTimer) {
      return;
    }
    flushTimer = window.setTimeout(function () {
      flushTimer = 0;
      flush(false);
    }, 1800);
  }

  function flush(useBeacon) {
    if (!queue.length) {
      return;
    }
    var events = queue.splice(0, 20);
    var body = JSON.stringify({ client_id: clientId, events: events });
    if (useBeacon && navigator.sendBeacon) {
      var accepted = navigator.sendBeacon(
        endpoint,
        new Blob([body], { type: "application/json" })
      );
      if (accepted) {
        return;
      }
    }
    fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: body,
      credentials: "same-origin",
      keepalive: true,
    }).catch(function () {
      return undefined;
    });
  }

  function track(eventType, moduleName, targetId, metadata, options) {
    if (navigator.doNotTrack === "1") {
      return false;
    }
    var onceKey = options && cleanText(options.onceKey, 180);
    if (onceKey) {
      var storageKey = sessionPrefix + onceKey;
      var alreadyTracked = safeStorage(window.sessionStorage, function (storage) {
        return storage.getItem(storageKey) === "1";
      });
      if (alreadyTracked) {
        return false;
      }
      safeStorage(window.sessionStorage, function (storage) {
        storage.setItem(storageKey, "1");
      });
    }
    queue.push({
      event_type: cleanText(eventType, 60),
      module: cleanText(moduleName, 50) || "public-site",
      target_id: cleanText(targetId, 160),
      page_path: cleanText(window.location.pathname, 300),
      metadata: cleanMetadata(metadata),
    });
    if (queue.length >= 10) {
      flush(false);
    } else {
      scheduleFlush();
    }
    return true;
  }

  function moduleForPath(path) {
    if (path === "/" || path === "/home") return "landing";
    if (path.indexOf("/virtual-tour") === 0) return "virtual-tour";
    if (path.indexOf("/trail") === 0) return "heritage-trail";
    if (path.indexOf("/ar-content-detection") === 0) return "ar-scanner";
    if (path.indexOf("/online-gallery") === 0) return "online-gallery";
    if (path.indexOf("/edu-resources") === 0) return "edu-resources";
    if (path.indexOf("/interactive") === 0) return "interactive";
    if (path.indexOf("/site-map") === 0) return "site-map";
    if (path.indexOf("/3d-environment") === 0 || path.indexOf("/webxr") === 0) return "webxr";
    if (path.indexOf("/community") === 0 || path.indexOf("/participation") === 0) return "community";
    return "public-site";
  }

  window.NHCPAnalytics = {
    track: track,
    flush: flush,
    getClientId: function () {
      return clientId;
    },
  };

  var pageModule = moduleForPath(window.location.pathname);
  var pageTarget = new URLSearchParams(window.location.search).get("item") || "";
  track("page_view", pageModule, pageTarget, null);
  if (pageModule === "webxr") {
    track("webxr_opened", "webxr", "", null, { onceKey: "webxr-opened" });
  }

  document.addEventListener("visibilitychange", function () {
    if (document.visibilityState === "hidden") {
      flush(true);
    }
  });
  window.addEventListener("pagehide", function () {
    flush(true);
  });
})();

