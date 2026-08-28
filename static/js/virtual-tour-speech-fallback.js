(function () {
  "use strict";

  var synth = window.speechSynthesis || null;
  var voices = [];
  var utterance = null;
  var startTimer = 0;
  var requestVersion = 0;
  var playing = false;
  var paused = false;
  var pending = false;

  function refreshVoices() {
    try {
      voices = synth && typeof synth.getVoices === "function" ? synth.getVoices() : [];
    } catch (_) {
      voices = [];
    }
  }

  function languageCode(language) {
    return language === "tl" ? "fil-PH" : "en-US";
  }

  function femaleVoiceScore(name) {
    var score = 0;
    if (/google/.test(name)) score += 45;
    if (/\b(female|woman|filipina|samantha|zira|aria|jenny|ava|karen|moira|victoria|susan)\b/.test(name)) score += 35;
    if (/\b(male|man|david|mark|george|daniel)\b/.test(name)) score -= 35;
    return score;
  }

  function voiceScore(voice, language, allowLanguageFallback) {
    var name = String(voice.name || "").toLowerCase();
    var lang = String(voice.lang || "").toLowerCase();
    var wantsTagalog = language === "tl";
    var languageMatch = wantsTagalog ? /^(fil|tl)(-|$)/.test(lang) : /^en(-|$)/.test(lang);
    if (!languageMatch && !allowLanguageFallback) return -1000;

    var score = languageMatch ? 100 : 0;
    if (wantsTagalog && /^(fil|tl)-ph/.test(lang)) score += 35;
    if (!wantsTagalog && /^en-(us|ph)/.test(lang)) score += 28;
    if (!languageMatch && /^en-ph/.test(lang)) score += 30;
    else if (!languageMatch && /^en-us/.test(lang)) score += 24;
    else if (!languageMatch && /^en(-|$)/.test(lang)) score += 18;
    score += femaleVoiceScore(name);
    if (voice.default) score += 5;
    return score;
  }

  function preferredVoice(language, allowLanguageFallback) {
    refreshVoices();
    return voices
      .map(function (voice) {
        return { voice: voice, score: voiceScore(voice, language, allowLanguageFallback) };
      })
      .filter(function (entry) { return entry.score > -1000; })
      .sort(function (left, right) { return right.score - left.score; })
      .map(function (entry) { return entry.voice; })[0] || null;
  }

  function splitLongPart(part, maximum) {
    var words = String(part || "").trim().split(/\s+/).filter(Boolean);
    var chunks = [];
    var current = "";
    words.forEach(function (word) {
      var candidate = current ? current + " " + word : word;
      if (current && candidate.length > maximum) {
        chunks.push(current);
        current = word;
      } else {
        current = candidate;
      }
    });
    if (current) chunks.push(current);
    return chunks;
  }

  function narrationChunks(text) {
    var maximum = 240;
    var sentences = String(text || "").replace(/\s+/g, " ").trim().match(/[^.!?]+[.!?]+|[^.!?]+$/g) || [];
    var chunks = [];
    var current = "";
    sentences.forEach(function (sentence) {
      var copy = sentence.trim();
      if (!copy) return;
      if (copy.length > maximum) {
        if (current) { chunks.push(current); current = ""; }
        chunks = chunks.concat(splitLongPart(copy, maximum));
        return;
      }
      var candidate = current ? current + " " + copy : copy;
      if (current && candidate.length > maximum) {
        chunks.push(current);
        current = copy;
      } else {
        current = candidate;
      }
    });
    if (current) chunks.push(current);
    return chunks;
  }

  function detachUtterance() {
    if (!utterance) return;
    utterance.onstart = null;
    utterance.onend = null;
    utterance.onerror = null;
    utterance = null;
  }

  function clearState() {
    detachUtterance();
    playing = false;
    paused = false;
    pending = false;
  }

  function cancel() {
    requestVersion += 1;
    if (startTimer) {
      window.clearTimeout(startTimer);
      startTimer = 0;
    }
    detachUtterance();
    if (synth) {
      try { synth.cancel(); } catch (_) {}
    }
    playing = false;
    paused = false;
    pending = false;
  }

  function speak(text, language, handlers) {
    var copy = String(text || "").trim();
    var callbacks = handlers || {};
    if (!synth || typeof window.SpeechSynthesisUtterance !== "function" || !copy) return false;

    cancel();
    var version = requestVersion;
    var chunks = narrationChunks(copy);
    var started = false;
    pending = true;

    function fail(event) {
      if (version !== requestVersion) return;
      clearState();
      if (typeof callbacks.onerror === "function") callbacks.onerror(event || {});
    }

    function speakChunk(index, forceLanguageFallback) {
      if (version !== requestVersion) return;
      if (index >= chunks.length) {
        clearState();
        if (typeof callbacks.onend === "function") callbacks.onend();
        return;
      }

      var nextUtterance = new SpeechSynthesisUtterance(chunks[index]);
      var exactVoice = preferredVoice(language, false);
      var selectedVoice = exactVoice || (forceLanguageFallback || language === "tl" ? preferredVoice(language, true) : null);
      utterance = nextUtterance;
      nextUtterance.lang = selectedVoice && selectedVoice.lang ? selectedVoice.lang : (forceLanguageFallback ? "en-US" : languageCode(language));
      nextUtterance.rate = 0.94;
      nextUtterance.pitch = 1.08;
      nextUtterance.volume = 1;
      if (selectedVoice) nextUtterance.voice = selectedVoice;

      nextUtterance.onstart = function () {
        if (version !== requestVersion || utterance !== nextUtterance) return;
        pending = false;
        playing = true;
        paused = false;
        if (!started) {
          started = true;
          if (typeof callbacks.onstart === "function") callbacks.onstart();
        }
      };
      nextUtterance.onend = function () {
        if (version !== requestVersion || utterance !== nextUtterance) return;
        detachUtterance();
        pending = true;
        startTimer = window.setTimeout(function () {
          startTimer = 0;
          speakChunk(index + 1, forceLanguageFallback);
        }, 20);
      };
      nextUtterance.onerror = function (event) {
        if (version !== requestVersion || utterance !== nextUtterance) return;
        var errorName = String((event && event.error) || "");
        detachUtterance();
        if (!forceLanguageFallback && /^(language-unavailable|voice-unavailable|synthesis-unavailable)$/.test(errorName)) {
          pending = true;
          startTimer = window.setTimeout(function () {
            startTimer = 0;
            speakChunk(index, true);
          }, 40);
          return;
        }
        fail(event);
      };

      try {
        if (synth.paused && !paused) synth.resume();
        synth.speak(nextUtterance);
      } catch (error) {
        fail({ error: "synthesis-failed", detail: error });
      }
    }

    // Chrome may finish cancelling the previous queue asynchronously. Starting
    // on the next task prevents that cancellation from swallowing this request.
    startTimer = window.setTimeout(function () {
      startTimer = 0;
      speakChunk(0, false);
    }, 0);
    return true;
  }

  function pause() {
    if (!synth || (!utterance && !pending) || paused) return;
    try { synth.pause(); } catch (_) { return; }
    paused = true;
    playing = false;
  }

  function resume() {
    if (!synth || !paused) return;
    try { synth.resume(); } catch (_) { return; }
    paused = false;
    playing = true;
  }

  if (synth) {
    refreshVoices();
    if (typeof synth.addEventListener === "function") synth.addEventListener("voiceschanged", refreshVoices);
    else if ("onvoiceschanged" in synth) synth.onvoiceschanged = refreshVoices;
  }

  window.NHCPSpeechFallback = {
    available: Boolean(synth && typeof window.SpeechSynthesisUtterance === "function"),
    speak: speak,
    cancel: cancel,
    pause: pause,
    resume: resume,
    isPlaying: function () { return (playing || pending) && !paused; },
    isPaused: function () { return paused; },
  };
})();
