(function () {
  "use strict";
  var root = document.querySelector("[data-vt-original-import]"); if (!root) return;
  var frame = root.querySelector("[data-vt-original-frame]");
  var button = root.querySelector("[data-vt-import-original]");
  var status = root.querySelector("[data-vt-original-message]");
  var config = JSON.parse(document.getElementById("vtOriginalImportConfig").textContent || "{}");
  var snapshot = null; var attempts = 0;
  function poll() {
    attempts += 1;
    try { snapshot = frame.contentWindow.NHCPOriginalTourSnapshot || null; } catch (_) { snapshot = null; }
    if (snapshot && snapshot.scenes && snapshot.scenes.length) {
      status.textContent = snapshot.scenes.length + " scenes and their hotspots are ready to import.";
      status.className = "vt-inline-message is-success"; button.disabled = false; return;
    }
    if (attempts > 80) { status.textContent = "The Original snapshot did not become ready. Reload this page and try again."; status.className = "vt-inline-message is-error"; return; }
    window.setTimeout(poll, 250);
  }
  frame.addEventListener("load", poll);
  button.addEventListener("click", async function () {
    if (!snapshot) return; button.disabled = true; button.textContent = "Importing scenes and hotspots…";
    status.textContent = "Creating the editable Original draft. Keep this page open.";
    try {
      var response = await fetch(config.importUrl, { method: "POST", headers: { "Content-Type": "application/json", "X-CSRF-Token": config.csrfToken, "X-Requested-With": "XMLHttpRequest" }, body: JSON.stringify(snapshot) });
      var payload = await response.json(); if (!response.ok || !payload.ok) throw new Error(payload.error || "Import failed.");
      window.location.href = payload.editorUrl;
    } catch (error) { button.disabled = false; button.textContent = "Retry import"; status.textContent = error.message; status.className = "vt-inline-message is-error"; }
  });
})();
