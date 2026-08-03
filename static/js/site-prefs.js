/* Shared site preferences: theme (light/dark), high contrast, language
   (en/tl) and text size (small/medium/large). Persists to localStorage for
   everyone, and syncs theme+language to the signed-in account. Any control
   with data-set-theme / data-set-contrast / data-toggle-contrast /
   data-set-lang / data-set-textsize is wired automatically. */
(function () {
  var d = document.documentElement;
  var KEY = { theme: "nhcp-theme", contrast: "nhcp-contrast", lang: "nhcp-lang", size: "nhcp-textsize" };

  function ls(k) { try { return window.localStorage.getItem(k); } catch (e) { return null; } }
  function save(k, v) { try { window.localStorage.setItem(k, v); } catch (e) {} }

  var cfg = {};
  try { cfg = JSON.parse((document.getElementById("sitePrefsConfig") || {}).textContent || "{}"); } catch (e) { cfg = {}; }

  var state = {
    theme: ls(KEY.theme) === "dark" ? "dark" : (ls(KEY.theme) === "light" ? "light" : (cfg.theme === "dark" ? "dark" : "light")),
    contrast: ls(KEY.contrast) === "on" ? "on" : "off",
    lang: ls(KEY.lang) === "tl" ? "tl" : (ls(KEY.lang) === "en" ? "en" : (cfg.language === "tl" ? "tl" : "en")),
    size: ["small", "medium", "large"].indexOf(ls(KEY.size)) >= 0 ? ls(KEY.size) : "medium",
  };

  function applyDom() {
    d.setAttribute("data-theme", state.theme);
    d.setAttribute("data-contrast", state.contrast);
    d.setAttribute("data-textsize", state.size);
    d.setAttribute("data-lang", state.lang);
    d.setAttribute("lang", state.lang === "tl" ? "tl" : "en");
    d.classList.toggle("ogd-high-contrast", state.contrast === "on");
    if (document.body) document.body.classList.toggle("ogd-high-contrast-page", state.contrast === "on");
  }

  function syncControls() {
    function mark(sel, attr, value) {
      document.querySelectorAll(sel).forEach(function (el) {
        var active = el.getAttribute(attr) === value;
        el.classList.toggle("is-active", active);
        el.setAttribute("aria-pressed", active ? "true" : "false");
      });
    }
    mark("[data-set-theme]", "data-set-theme", state.theme);
    mark("[data-set-contrast]", "data-set-contrast", state.contrast);
    mark("[data-set-lang]", "data-set-lang", state.lang);
    mark("[data-set-textsize]", "data-set-textsize", state.size);
    document.querySelectorAll("[data-toggle-contrast]").forEach(function (el) {
      var on = state.contrast === "on";
      el.classList.toggle("is-active", on);
      el.setAttribute("aria-checked", on ? "true" : "false");
    });
    document.querySelectorAll("[data-lang-badge]").forEach(function (el) {
      el.textContent = state.lang === "tl" ? "FIL" : "EN";
    });
  }

  function serverSave(payload) {
    if (!cfg.preferencesEndpoint || !cfg.authenticated) return;
    try {
      var body = new URLSearchParams(payload);
      body.set("csrf_token", cfg.csrfToken || "");
      fetch(cfg.preferencesEndpoint, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded", "X-CSRF-Token": cfg.csrfToken || "" },
        body: body.toString(),
        credentials: "same-origin",
      }).catch(function () {});
    } catch (e) {}
  }

  var Prefs = {
    get: function () { return { theme: state.theme, contrast: state.contrast, lang: state.lang, size: state.size }; },
    setTheme: function (v) {
      state.theme = v === "dark" ? "dark" : "light";
      save(KEY.theme, state.theme); serverSave({ theme_preference: state.theme });
      applyDom(); syncControls();
    },
    setContrast: function (v) {
      state.contrast = v === "on" ? "on" : "off";
      save(KEY.contrast, state.contrast); applyDom(); syncControls();
    },
    toggleContrast: function () { this.setContrast(state.contrast === "on" ? "off" : "on"); },
    setTextSize: function (v) {
      state.size = ["small", "medium", "large"].indexOf(v) >= 0 ? v : "medium";
      save(KEY.size, state.size); applyDom(); syncControls();
    },
    setLang: function (v) {
      var next = v === "tl" ? "tl" : "en";
      if (next === state.lang) return;
      state.lang = next; save(KEY.lang, state.lang); serverSave({ language_preference: state.lang });
      /* Most list-rendered pages need a reload to request translated server
         content. Span-based settings pages opt out and update in place. */
      if (document.body && document.body.hasAttribute("data-site-prefs-no-reload")) {
        applyDom(); syncControls();
      } else {
        try { window.location.reload(); } catch (e) { applyDom(); }
      }
    },
  };
  window.NHCPPrefs = Prefs;

  document.addEventListener("click", function (e) {
    var t = e.target.closest ? e.target.closest(
      "[data-set-theme],[data-set-contrast],[data-toggle-contrast],[data-set-lang],[data-set-textsize],[data-a11y-toggle],[data-a11y-close]"
    ) : null;
    if (!t) return;
    if (t.hasAttribute("data-set-theme")) Prefs.setTheme(t.getAttribute("data-set-theme"));
    else if (t.hasAttribute("data-set-contrast")) Prefs.setContrast(t.getAttribute("data-set-contrast"));
    else if (t.hasAttribute("data-toggle-contrast")) Prefs.toggleContrast();
    else if (t.hasAttribute("data-set-lang")) Prefs.setLang(t.getAttribute("data-set-lang"));
    else if (t.hasAttribute("data-set-textsize")) Prefs.setTextSize(t.getAttribute("data-set-textsize"));
    else if (t.hasAttribute("data-a11y-toggle")) {
      var root = document.getElementById("siteA11yRoot");
      if (root) {
        var open = root.classList.toggle("is-open");
        t.setAttribute("aria-expanded", open ? "true" : "false");
      }
    } else if (t.hasAttribute("data-a11y-close")) {
      var r = document.getElementById("siteA11yRoot");
      if (r) r.classList.remove("is-open");
    }
  });

  applyDom();
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", function () { applyDom(); syncControls(); });
  } else {
    syncControls();
  }
})();
