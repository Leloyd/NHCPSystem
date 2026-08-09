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

  var authenticated = config.authenticated === true;
  var sent = new Set();
  var toastTimer = 0;
  var chip = document.createElement(authenticated ? "a" : "a");
  chip.className = "hk-progress-chip";
  chip.href = authenticated ? config.rewardUrl : config.loginUrl;
  chip.setAttribute("aria-label", authenticated ? "Open Heritage Keeper progress" : "Sign in to save Heritage Keeper fragments");
  chip.innerHTML = '<span class="hk-progress-chip__seal" aria-hidden="true">HK</span><span class="hk-progress-chip__copy"><span class="hk-progress-chip__title">Heritage Keeper</span><span class="hk-progress-chip__count">' + (authenticated ? "Loading progress / Kinukuha ang progreso" : "Sign in / Mag-sign in") + "</span></span>";
  document.body.appendChild(chip);

  var countElement = chip.querySelector(".hk-progress-chip__count");
  var toast = document.createElement("div");
  toast.className = "hk-toast";
  toast.setAttribute("role", "status");
  toast.setAttribute("aria-live", "polite");
  document.body.appendChild(toast);

  function showToast(title, en, tl, includeLogin) {
    window.clearTimeout(toastTimer);
    toast.innerHTML = "<strong>" + title + "</strong><p>" + en + "</p><p>" + tl + "</p>" + (includeLogin ? '<p><a href="' + config.loginUrl + '">Sign in / Mag-sign in</a></p>' : "");
    toast.classList.add("is-visible");
    toastTimer = window.setTimeout(function () { toast.classList.remove("is-visible"); }, 5500);
  }

  function updateProgress(progress) {
    if (!progress || !countElement) return;
    countElement.textContent = String(progress.total_count || 0) + " / " + String(progress.total_required || 0) + " · Fragments / Bahagi";
    chip.classList.toggle("is-complete", Boolean(progress.unlocked));
  }

  function showUnlockModal() {
    var modal = document.createElement("div");
    modal.className = "hk-unlock-modal";
    modal.setAttribute("role", "dialog");
    modal.setAttribute("aria-modal", "true");
    modal.innerHTML = '<div class="hk-unlock-modal__card"><div class="hk-unlock-modal__medal">HK</div><h2>Heritage Keeper Unlocked</h2><p>You completed the Heritage Trail and restored every registered AR cultural artifact. Your bilingual certificate is ready.</p><p>Nakumpleto mo ang Heritage Trail at naibalik ang lahat ng nakatalang AR cultural artifact. Handa na ang iyong sertipiko.</p><div class="hk-unlock-modal__actions"><a href="' + config.rewardUrl + '">View award / Tingnan ang gantimpala</a><button type="button">Continue / Magpatuloy</button></div></div>';
    modal.querySelector("button").addEventListener("click", function () { modal.remove(); });
    modal.addEventListener("click", function (event) { if (event.target === modal) modal.remove(); });
    document.body.appendChild(modal);
    modal.querySelector("button").focus();
  }

  async function loadProgress() {
    if (!authenticated || !config.progressUrl) return;
    try {
      var response = await fetch(config.progressUrl, { headers: { Accept: "application/json" }, credentials: "same-origin" });
      var payload = await response.json();
      if (response.ok && payload.ok) updateProgress(payload.progress);
    } catch (error) {
      // The experience remains usable when progress services are unavailable.
    }
  }

  async function award(source, itemKey) {
    var identity = String(source) + ":" + String(itemKey);
    if (sent.has(identity)) return null;
    sent.add(identity);

    if (!authenticated) {
      var noticeShown = false;
      try {
        noticeShown = sessionStorage.getItem("hkGuestNoticeShown") === "1";
      } catch (error) {
        noticeShown = false;
      }
      if (!noticeShown) {
        try { sessionStorage.setItem("hkGuestNoticeShown", "1"); } catch (error) { /* optional preference only */ }
        showToast("Save your discovery", "Sign in to collect Heritage Fragments and earn the Heritage Keeper award.", "Mag-sign in upang mangolekta ng Heritage Fragments at makamit ang Heritage Keeper award.", true);
      }
      return null;
    }

    try {
      var response = await fetch(config.awardUrl, {
        method: "POST",
        credentials: "same-origin",
        headers: {
          "Content-Type": "application/json",
          "Accept": "application/json",
          "X-CSRF-Token": config.csrfToken || "",
        },
        body: JSON.stringify({ source: source, item_key: itemKey }),
      });
      var payload = await response.json();
      if (!response.ok || !payload.ok) throw new Error(payload.error || "Progress could not be saved.");
      updateProgress(payload.progress);
      if (payload.new_fragment) {
        showToast("Heritage Fragment Found", "Your discovery was added to the seal.", "Idinagdag sa selyo ang iyong natuklasan.", false);
      }
      if (payload.award_just_unlocked) showUnlockModal();
      return payload;
    } catch (error) {
      sent.delete(identity);
      return null;
    }
  }

  window.NHCPHeritageKeeper = { award: award, refresh: loadProgress };
  loadProgress();
})();
