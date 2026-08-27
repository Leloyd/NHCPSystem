(function () {
  "use strict";

  var DEFAULT_MAX_BYTES = 25 * 1024 * 1024;
  var clients = {};
  var activeUploads = 0;

  function formatMegabytes(bytes) {
    return (Number(bytes || 0) / (1024 * 1024)).toFixed(2) + " MB";
  }

  function getCsrf(form) {
    var field = form.querySelector('input[name="csrf_token"]');
    return field ? String(field.value || "") : "";
  }

  function statusElements(form) {
    var root = form.querySelector("[data-direct-upload-status]");
    return {
      root: root,
      title: root && root.querySelector("[data-direct-upload-title]"),
      detail: root && root.querySelector("[data-direct-upload-detail]"),
    };
  }

  function setStatus(form, state, title, detail) {
    var elements = statusElements(form);
    if (!elements.root) return;
    elements.root.hidden = false;
    elements.root.setAttribute("data-upload-state", state || "working");
    if (elements.title) elements.title.textContent = title || "Preparing upload…";
    if (elements.detail) elements.detail.textContent = detail || "Please keep this page open.";
  }

  function hideStatus(form) {
    var elements = statusElements(form);
    if (!elements.root) return;
    elements.root.hidden = true;
    elements.root.removeAttribute("data-upload-state");
  }

  function setBusy(form, busy) {
    form.setAttribute("aria-busy", busy ? "true" : "false");
    Array.prototype.forEach.call(form.querySelectorAll('button[type="submit"], input[type="submit"]'), function (button) {
      if (busy) {
        button.disabled = true;
      } else {
        button.disabled = false;
      }
    });
    if (!busy) {
      var legacyNotice = document.querySelector("[data-highlight-editor-save-notice]");
      if (legacyNotice) {
        legacyNotice.classList.remove("is-visible");
        legacyNotice.hidden = true;
      }
    }
  }

  async function requestJson(url, options) {
    var response;
    try {
      response = await fetch(url, options);
    } catch (error) {
      throw new Error("The upload service could not be reached. Check your connection and try again.");
    }
    var payload = {};
    try {
      payload = await response.json();
    } catch (_) {}
    if (!response.ok || payload.ok !== true) {
      if (response.status === 413) {
        throw new Error("Vercel rejected the request as too large. Refresh the page and try the direct upload again.");
      }
      if (response.status === 401 || response.status === 403) {
        throw new Error(payload.error || "Your session expired. Refresh the page and try again.");
      }
      if (response.redirected || !Object.keys(payload).length) {
        throw new Error("Your session may have expired. Refresh the page, sign in again if needed, and retry the upload.");
      }
      if (response.status >= 500) {
        throw new Error(payload.error || "The upload service is temporarily unavailable. Please try again.");
      }
      throw new Error(payload.error || "The selected file could not be prepared for upload.");
    }
    return payload;
  }

  function getClient(config) {
    if (!window.supabase || typeof window.supabase.createClient !== "function") {
      throw new Error("The secure upload library did not load. Check your connection, refresh, and try again.");
    }
    var cacheKey = config.supabaseUrl + "|" + config.supabaseKey;
    if (!clients[cacheKey]) {
      clients[cacheKey] = window.supabase.createClient(config.supabaseUrl, config.supabaseKey, {
        auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
      });
    }
    return clients[cacheKey];
  }

  async function discardUploads(form, uploads) {
    if (!uploads || !uploads.length) return;
    var discardUrl = form.getAttribute("data-direct-upload-discard-url");
    if (!discardUrl) return;
    try {
      await requestJson(discardUrl, {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json", "X-CSRF-Token": getCsrf(form) },
        body: JSON.stringify({ uploads: uploads }),
      });
    } catch (_) {
      // Cleanup is best-effort. Random, owner-scoped paths prevent another
      // visitor from claiming an unfinished upload.
    }
  }

  async function signUpload(form, file, purpose) {
    var signUrl = form.getAttribute("data-direct-upload-sign-url");
    if (!signUrl) throw new Error("The direct upload endpoint is missing from this form.");
    return requestJson(signUrl, {
      method: "POST",
      credentials: "same-origin",
      headers: { "Content-Type": "application/json", "X-CSRF-Token": getCsrf(form) },
      body: JSON.stringify({ filename: file.name, size: file.size, purpose: purpose }),
    });
  }

  async function uploadFile(form, descriptor, position, total) {
    var lastError = null;
    for (var attempt = 1; attempt <= 2; attempt += 1) {
      var signed = null;
      try {
        setStatus(
          form,
          attempt === 1 ? "working" : "retrying",
          attempt === 1 ? "Uploading securely…" : "Connection interrupted — retrying…",
          "Sending " + descriptor.file.name + " (" + position + " of " + total + ") directly to Supabase Storage."
        );
        signed = await signUpload(form, descriptor.file, descriptor.purpose);
        var client = getClient(signed);
        var result = await client.storage.from(signed.bucket).uploadToSignedUrl(
          signed.path,
          signed.token,
          descriptor.file,
          { contentType: descriptor.file.type || undefined, cacheControl: "31536000" }
        );
        if (result.error) throw result.error;
        return { path: signed.path, purpose: descriptor.purpose, field: descriptor.field };
      } catch (error) {
        lastError = error;
        if (signed && signed.path) {
          await discardUploads(form, [{ path: signed.path, purpose: descriptor.purpose }]);
        }
      }
    }
    var message = lastError && lastError.message ? String(lastError.message) : "Supabase Storage could not accept this file.";
    if (/bucket|storage|row-level|policy|supabase/i.test(message)) {
      message = "Supabase Storage could not accept the upload. Check the nhcp-media bucket, its 25 MB limit, and your publishable key, then try again. Details: " + message;
    }
    throw new Error(message);
  }

  function selectedDescriptors(form) {
    var descriptors = [];
    Array.prototype.forEach.call(form.querySelectorAll("input[type=file][data-direct-upload-purpose]"), function (input) {
      Array.prototype.forEach.call(input.files || [], function (file) {
        descriptors.push({
          input: input,
          file: file,
          purpose: String(input.getAttribute("data-direct-upload-purpose") || ""),
          field: String(input.getAttribute("data-direct-upload-field") || "uploaded_object_path"),
        });
      });
    });
    return descriptors;
  }

  function removeGeneratedFields(form) {
    Array.prototype.forEach.call(form.querySelectorAll("[data-direct-upload-generated]"), function (field) {
      field.remove();
    });
  }

  function appendUploadFields(form, uploads) {
    removeGeneratedFields(form);
    uploads.forEach(function (upload) {
      var field = document.createElement("input");
      field.type = "hidden";
      field.name = upload.field;
      field.value = upload.path;
      field.setAttribute("data-direct-upload-generated", "");
      field.setAttribute("data-direct-upload-purpose", upload.purpose);
      form.appendChild(field);
    });
  }

  function resetFormUploadState(form) {
    removeGeneratedFields(form);
    delete form.dataset.directUploadReady;
    Array.prototype.forEach.call(form.querySelectorAll("input[type=file][data-direct-upload-purpose]"), function (input) {
      input.disabled = false;
    });
    hideStatus(form);
  }

  async function handleSubmit(event) {
    var form = event.currentTarget;
    if (form.dataset.directUploadReady === "1") {
      delete form.dataset.directUploadReady;
      return;
    }
    var submitter = event.submitter;
    if (submitter && (submitter.hasAttribute("data-direct-upload-skip") || submitter.value === "remove")) return;

    var descriptors = selectedDescriptors(form);
    if (!descriptors.length) return;

    var maxBytes = Number(form.getAttribute("data-direct-upload-max-bytes")) || DEFAULT_MAX_BYTES;
    var totalBytes = descriptors.reduce(function (sum, item) { return sum + Number(item.file.size || 0); }, 0);
    var oversized = descriptors.find(function (item) { return Number(item.file.size || 0) > maxBytes; });
    if (oversized || totalBytes > maxBytes) {
      event.preventDefault();
      event.stopImmediatePropagation();
      var message = oversized
        ? oversized.file.name + " exceeds the " + formatMegabytes(maxBytes) + " limit."
        : "The selected files total " + formatMegabytes(totalBytes) + ". Keep each save at or below " + formatMegabytes(maxBytes) + ".";
      setStatus(form, "error", "Upload stopped", message);
      form.dispatchEvent(new CustomEvent("nhcp:direct-upload-error", { detail: { message: message } }));
      return;
    }

    event.preventDefault();
    event.stopImmediatePropagation();
    setBusy(form, true);
    activeUploads += 1;
    var completed = [];
    try {
      for (var index = 0; index < descriptors.length; index += 1) {
        completed.push(await uploadFile(form, descriptors[index], index + 1, descriptors.length));
      }
      appendUploadFields(form, completed);
      descriptors.forEach(function (descriptor) { descriptor.input.disabled = true; });
      setStatus(form, "success", "Upload complete", "Saving the information linked to your uploaded file…");
      form.dataset.directUploadReady = "1";
      form._nhcpDirectUploads = completed;
      form.dispatchEvent(new CustomEvent("nhcp:direct-upload-complete", { detail: { uploads: completed } }));

      if (form.getAttribute("data-direct-upload-submit-mode") === "native") {
        HTMLFormElement.prototype.submit.call(form);
      } else if (typeof form.requestSubmit === "function") {
        setBusy(form, false);
        form.requestSubmit(submitter || undefined);
      } else {
        setBusy(form, false);
        form.submit();
      }
    } catch (error) {
      await discardUploads(form, completed);
      removeGeneratedFields(form);
      setBusy(form, false);
      var message = error && error.message ? String(error.message) : "The upload could not be completed. Please try again.";
      setStatus(form, "error", "Upload unsuccessful", message);
      form.dispatchEvent(new CustomEvent("nhcp:direct-upload-error", { detail: { message: message } }));
    } finally {
      activeUploads = Math.max(0, activeUploads - 1);
    }
  }

  function initialize() {
    Array.prototype.forEach.call(document.querySelectorAll("form[data-direct-upload-form]"), function (form) {
      if (form.dataset.directUploadBound === "1") return;
      form.dataset.directUploadBound = "1";
      form.addEventListener("submit", handleSubmit);
    });
  }

  window.addEventListener("beforeunload", function (event) {
    if (!activeUploads) return;
    event.preventDefault();
    event.returnValue = "An upload is still in progress.";
  });

  window.NhcpDirectUpload = {
    initialize: initialize,
    clearFormUploads: function (form) {
      if (form) resetFormUploadState(form);
    },
    discardFormUploads: async function (form) {
      if (!form) return;
      await discardUploads(form, form._nhcpDirectUploads || []);
      form._nhcpDirectUploads = [];
      resetFormUploadState(form);
    },
    setStatus: setStatus,
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initialize);
  } else {
    initialize();
  }
})();
