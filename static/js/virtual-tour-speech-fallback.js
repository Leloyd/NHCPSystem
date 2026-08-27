(function () {
  "use strict";

  var synth = window.speechSynthesis || null;
  var voices = [];
  var utterance = null;
  var playing = false;
  var paused = false;

  function refreshVoices() {
    voices = synth && typeof synth.getVoices === "function" ? synth.getVoices() : [];
  }

  function languageCode(language) {
    return language === "tl" ? "fil-PH" : "en-US";
  }

  function voiceScore(voice, language) {
    var name = String(voice.name || "").toLowerCase();
    var lang = String(voice.lang || "").toLowerCase();
    var wantsTagalog = language === "tl";
    var languageMatch = wantsTagalog
      ? /^(fil|tl)(-|$)/.test(lang)
      : /^en(-|$)/.test(lang);
    if (!languageMatch) return -1000;

    var score = 100;
    if (wantsTagalog && /^(fil|tl)-ph/.test(lang)) score += 30;
    if (!wantsTagalog && /^en-(us|ph)/.test(lang)) score += 24;
    if (/google/.test(name)) score += 45;
    if (/\b(female|woman|filipina|samantha|zira|aria|jenny|ava|karen|moira|victoria|susan)\b/.test(name)) score += 35;
    if (/\b(male|man|david|mark|george|daniel)\b/.test(name)) score -= 35;
    if (voice.default) score += 5;
    return score;
  }

  function preferredVoice(language) {
    refreshVoices();
    return voices
      .map(function (voice) { return { voice: voice, score: voiceScore(voice, language) }; })
      .filter(function (entry) { return entry.score > 0; })
      .sort(function (left, right) { return right.score - left.score; })
      .map(function (entry) { return entry.voice; })[0] || null;
  }

  function clearState() {
    utterance = null;
    playing = false;
    paused = false;
  }

  function cancel() {
    if (utterance) {
      utterance.onstart = null;
      utterance.onend = null;
      utterance.onerror = null;
    }
    if (synth) synth.cancel();
    clearState();
  }

  function speak(text, language, handlers) {
    var copy = String(text || "").trim();
    var callbacks = handlers || {};
    if (!synth || typeof window.SpeechSynthesisUtterance !== "function" || !copy) return false;

    cancel();
    var nextUtterance = new SpeechSynthesisUtterance(copy);
    utterance = nextUtterance;
    nextUtterance.lang = languageCode(language);
    nextUtterance.rate = 0.94;
    nextUtterance.pitch = 1.08;
    nextUtterance.volume = 1;
    var voice = preferredVoice(language);
    if (voice) nextUtterance.voice = voice;
    nextUtterance.onstart = function () {
      if (utterance !== nextUtterance) return;
      playing = true;
      paused = false;
      if (typeof callbacks.onstart === "function") callbacks.onstart();
    };
    nextUtterance.onend = function () {
      if (utterance !== nextUtterance) return;
      clearState();
      if (typeof callbacks.onend === "function") callbacks.onend();
    };
    nextUtterance.onerror = function (event) {
      if (utterance !== nextUtterance) return;
      clearState();
      if (typeof callbacks.onerror === "function") callbacks.onerror(event);
    };
    synth.speak(nextUtterance);
    return true;
  }

  function pause() {
    if (!synth || !utterance || paused) return;
    synth.pause();
    paused = true;
    playing = false;
  }

  function resume() {
    if (!synth || !utterance || !paused) return;
    synth.resume();
    paused = false;
    playing = true;
  }

  if (synth) {
    refreshVoices();
    if (typeof synth.addEventListener === "function") synth.addEventListener("voiceschanged", refreshVoices);
  }

  window.NHCPSpeechFallback = {
    available: Boolean(synth && typeof window.SpeechSynthesisUtterance === "function"),
    speak: speak,
    cancel: cancel,
    pause: pause,
    resume: resume,
    isPlaying: function () { return playing && !paused; },
    isPaused: function () { return paused; },
  };
})();
