(function () {
  "use strict";

  var ROUTES = {
    orientation: {
      label: "Orientation Loop",
      stops: [
        "main-gate",
        "welcome-plaza",
        "chapel-facade",
        "underground-entrance",
        "crypt-viewpoint",
        "bell-tower",
        "garden-court",
      ],
    },
    heritage: {
      label: "Heritage Core",
      stops: ["chapel-facade", "underground-entrance", "crypt-viewpoint", "bell-tower"],
    },
    accessibility: {
      label: "Accessible Route",
      stops: ["main-gate", "welcome-plaza", "underground-entrance", "garden-court"],
    },
  };

  var STOPS = {
    "main-gate": {
      title: "Main Gate",
      summary: "Primary orientation point where visitors are introduced to site etiquette and route flow.",
      era: "Contemporary Visitor Layer",
      focus: "Orientation and navigation",
      prompt: "How does this gateway frame your expectations of a heritage space?",
    },
    "welcome-plaza": {
      title: "Welcome Plaza",
      summary: "Open gathering zone used for briefing, class regrouping, and guide-led introductions.",
      era: "Modern Interpretation Zone",
      focus: "Visitor preparation",
      prompt: "Why is a staging area important before entering sacred historical zones?",
    },
    "chapel-facade": {
      title: "Chapel Facade",
      summary: "The chapel facade reflects the site's architectural identity and public devotional function.",
      era: "Spanish Colonial Period",
      focus: "Architecture and symbolism",
      prompt: "Which details indicate colonial religious design influences?",
    },
    "underground-entrance": {
      title: "Underground Entrance",
      summary: "The stairway and portal reveal the transition from surface worship space to subterranean chamber.",
      era: "1845 Construction Context",
      focus: "Spatial transition",
      prompt: "What feelings does the descent into the underground level evoke?",
    },
    "crypt-viewpoint": {
      title: "Crypt Viewpoint",
      summary: "Interpretive stop discussing function, social history, and funerary practices tied to the chamber.",
      era: "19th to Early 20th Century",
      focus: "Historical interpretation",
      prompt: "How does this space reflect class, faith, and memory in local history?",
    },
    "bell-tower": {
      title: "Bell Tower",
      summary: "Elevated marker used to signal liturgical and community rhythms around the church complex.",
      era: "Colonial-Era Parish Layout",
      focus: "Civic and spiritual communication",
      prompt: "How did bell towers shape timekeeping before modern systems?",
    },
    "garden-court": {
      title: "Garden Court",
      summary: "Quiet open area for reflection, discussion, and post-tour synthesis activities.",
      era: "Contemporary Visitor Amenity",
      focus: "Reflection and inclusive access",
      prompt: "Which part of the site should be prioritized in conservation planning and why?",
    },
  };

  var QUIZ_QUESTIONS = [
    {
      question: "Which stop marks the transition from the surface level to the underground chamber?",
      options: [
        { id: "a", text: "Bell Tower" },
        { id: "b", text: "Underground Entrance" },
        { id: "c", text: "Welcome Plaza" },
      ],
      correct: "b",
    },
    {
      question: "In the Heritage Core route, which stop best represents architectural symbolism?",
      options: [
        { id: "a", text: "Main Gate" },
        { id: "b", text: "Garden Court" },
        { id: "c", text: "Chapel Facade" },
      ],
      correct: "c",
    },
    {
      question: "Which route is designed to reduce movement complexity for broader visitor access?",
      options: [
        { id: "a", text: "Accessible Route" },
        { id: "b", text: "Heritage Core" },
        { id: "c", text: "Orientation Loop" },
      ],
      correct: "a",
    },
  ];

  var state = {
    routeId: "orientation",
    stopId: ROUTES.orientation.stops[0],
    quizIndex: 0,
    selectedOptionId: "",
    quizScore: 0,
    quizLocked: false,
  };

  var elements = {
    routeButtons: Array.prototype.slice.call(document.querySelectorAll("[data-route-btn]")),
    routePaths: Array.prototype.slice.call(document.querySelectorAll(".map-route")),
    mapStops: Array.prototype.slice.call(document.querySelectorAll(".map-stop")),
    stopList: document.getElementById("stopList"),
    stopRouteBadge: document.getElementById("stopRouteBadge"),
    stopTitle: document.getElementById("stopTitle"),
    stopSummary: document.getElementById("stopSummary"),
    stopEra: document.getElementById("stopEra"),
    stopFocus: document.getElementById("stopFocus"),
    stopPrompt: document.getElementById("stopPrompt"),
    stopOrder: document.getElementById("stopOrder"),
    prevStopBtn: document.getElementById("prevStopBtn"),
    nextStopBtn: document.getElementById("nextStopBtn"),
    quizProgress: document.getElementById("quizProgress"),
    quizQuestion: document.getElementById("quizQuestion"),
    quizOptions: document.getElementById("quizOptions"),
    quizSubmitBtn: document.getElementById("quizSubmitBtn"),
    quizNextBtn: document.getElementById("quizNextBtn"),
    quizFeedback: document.getElementById("quizFeedback"),
  };

  if (!elements.stopList || !elements.stopTitle || !elements.quizQuestion) {
    return;
  }

  function getCurrentRouteStops() {
    var route = ROUTES[state.routeId];
    if (!route || !Array.isArray(route.stops)) {
      return [];
    }
    return route.stops;
  }

  function getRouteLabel(routeId) {
    return ROUTES[routeId] ? ROUTES[routeId].label : "Route";
  }

  function ensureStopInRoute() {
    var stops = getCurrentRouteStops();
    if (!stops.length) {
      return;
    }

    if (stops.indexOf(state.stopId) === -1) {
      state.stopId = stops[0];
    }
  }

  function buildStopList() {
    var routeStops = getCurrentRouteStops();

    elements.stopList.innerHTML = "";
    routeStops.forEach(function (stopId, index) {
      var stop = STOPS[stopId];
      if (!stop) {
        return;
      }

      var button = document.createElement("button");
      button.type = "button";
      button.className = "stop-item-btn";
      button.dataset.stopListItem = stopId;
      button.textContent = String(index + 1) + ". " + stop.title;
      button.addEventListener("click", function () {
        setActiveStop(stopId, true);
      });

      elements.stopList.appendChild(button);
    });
  }

  function renderRoute() {
    elements.routeButtons.forEach(function (button) {
      if (!button || !button.dataset) {
        return;
      }
      var routeId = button.dataset.routeBtn;
      button.classList.toggle("is-active", routeId === state.routeId);
    });

    elements.routePaths.forEach(function (path) {
      if (!path || !path.dataset) {
        return;
      }
      path.classList.toggle("is-active", path.dataset.route === state.routeId);
    });
  }

  function renderStopSelection() {
    elements.mapStops.forEach(function (stopNode) {
      if (!stopNode || !stopNode.dataset) {
        return;
      }
      var stopId = stopNode.dataset.stop;
      stopNode.classList.toggle("is-active", stopId === state.stopId);
    });

    Array.prototype.slice.call(elements.stopList.querySelectorAll("[data-stop-list-item]")).forEach(function (button) {
      button.classList.toggle("is-active", button.dataset.stopListItem === state.stopId);
    });
  }

  function renderStopDetails() {
    var stop = STOPS[state.stopId];
    var routeStops = getCurrentRouteStops();
    var stopIndex = routeStops.indexOf(state.stopId);

    if (!stop || stopIndex < 0) {
      return;
    }

    elements.stopRouteBadge.textContent = getRouteLabel(state.routeId);
    elements.stopTitle.textContent = stop.title;
    elements.stopSummary.textContent = stop.summary;
    elements.stopEra.textContent = stop.era;
    elements.stopFocus.textContent = stop.focus;
    elements.stopPrompt.textContent = stop.prompt;
    elements.stopOrder.textContent = "Stop " + String(stopIndex + 1) + " of " + String(routeStops.length);

    elements.prevStopBtn.disabled = stopIndex === 0;
    elements.nextStopBtn.disabled = stopIndex === routeStops.length - 1;
  }

  function setActiveStop(stopId, scrollIntoView) {
    if (!STOPS[stopId]) {
      return;
    }

    state.stopId = stopId;

    renderStopSelection();
    renderStopDetails();

    if (scrollIntoView && window.innerWidth < 1024) {
      var panel = document.querySelector(".details-shell");
      if (panel) {
        panel.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    }
  }

  function setRoute(routeId) {
    if (!ROUTES[routeId]) {
      return;
    }

    state.routeId = routeId;
    ensureStopInRoute();

    renderRoute();
    buildStopList();
    setActiveStop(state.stopId, false);
  }

  function moveStop(step) {
    var routeStops = getCurrentRouteStops();
    var currentIndex = routeStops.indexOf(state.stopId);
    if (currentIndex < 0) {
      return;
    }

    var nextIndex = currentIndex + step;
    if (nextIndex < 0 || nextIndex >= routeStops.length) {
      return;
    }

    setActiveStop(routeStops[nextIndex], false);
  }

  function renderQuizOptions(question) {
    elements.quizOptions.innerHTML = "";

    question.options.forEach(function (option) {
      var optionButton = document.createElement("button");
      optionButton.type = "button";
      optionButton.className = "quiz-option";
      optionButton.dataset.optionId = option.id;
      optionButton.textContent = option.text;
      optionButton.setAttribute("role", "radio");
      optionButton.setAttribute("aria-checked", "false");

      optionButton.addEventListener("click", function () {
        if (state.quizLocked) {
          return;
        }

        state.selectedOptionId = option.id;
        Array.prototype.slice.call(elements.quizOptions.querySelectorAll(".quiz-option")).forEach(function (node) {
          var isSelected = node.dataset.optionId === option.id;
          node.classList.toggle("is-selected", isSelected);
          node.setAttribute("aria-checked", String(isSelected));
        });
      });

      elements.quizOptions.appendChild(optionButton);
    });
  }

  function clearQuizFeedback() {
    elements.quizFeedback.textContent = "";
    elements.quizFeedback.classList.remove("is-success", "is-error");
  }

  function renderQuizQuestion() {
    var question = QUIZ_QUESTIONS[state.quizIndex];
    if (!question) {
      return;
    }

    state.selectedOptionId = "";
    state.quizLocked = false;

    elements.quizProgress.textContent = "Question " + String(state.quizIndex + 1) + " / " + String(QUIZ_QUESTIONS.length);
    elements.quizQuestion.textContent = question.question;
    elements.quizSubmitBtn.disabled = false;
    elements.quizNextBtn.disabled = true;
    elements.quizNextBtn.textContent = "Next Question";

    clearQuizFeedback();
    renderQuizOptions(question);
  }

  function lockQuizSelection(question) {
    var optionNodes = Array.prototype.slice.call(elements.quizOptions.querySelectorAll(".quiz-option"));
    optionNodes.forEach(function (node) {
      var optionId = node.dataset.optionId;
      var isCorrect = optionId === question.correct;
      var isSelected = optionId === state.selectedOptionId;

      node.classList.remove("is-selected");
      node.classList.toggle("is-correct", isCorrect);
      node.classList.toggle("is-wrong", isSelected && !isCorrect);
    });
  }

  function submitAnswer() {
    if (state.quizLocked) {
      return;
    }

    var question = QUIZ_QUESTIONS[state.quizIndex];
    if (!question) {
      return;
    }

    if (!state.selectedOptionId) {
      elements.quizFeedback.textContent = "Please choose an answer first.";
      elements.quizFeedback.classList.remove("is-success");
      elements.quizFeedback.classList.add("is-error");
      return;
    }

    state.quizLocked = true;
    elements.quizSubmitBtn.disabled = true;
    elements.quizNextBtn.disabled = false;

    lockQuizSelection(question);

    if (state.selectedOptionId === question.correct) {
      state.quizScore += 1;
      elements.quizFeedback.textContent = "Correct. Great observation.";
      elements.quizFeedback.classList.remove("is-error");
      elements.quizFeedback.classList.add("is-success");
    } else {
      var correctOption = question.options.find(function (opt) {
        return opt.id === question.correct;
      });
      var correctText = correctOption ? correctOption.text : "the correct answer";
      elements.quizFeedback.textContent = "Not quite. Correct answer: " + correctText + ".";
      elements.quizFeedback.classList.remove("is-success");
      elements.quizFeedback.classList.add("is-error");
    }

    if (state.quizIndex === QUIZ_QUESTIONS.length - 1) {
      elements.quizNextBtn.textContent = "Show Result";
    }
  }

  function showQuizResult() {
    elements.quizQuestion.textContent = "Quiz complete. You scored " + String(state.quizScore) + " out of " + String(QUIZ_QUESTIONS.length) + ".";
    elements.quizProgress.textContent = "Completed";
    elements.quizSubmitBtn.disabled = true;
    elements.quizNextBtn.disabled = false;
    elements.quizNextBtn.textContent = "Restart Quiz";

    elements.quizOptions.innerHTML = "";
    clearQuizFeedback();
  }

  function nextQuestion() {
    if (!state.quizLocked && state.quizIndex < QUIZ_QUESTIONS.length) {
      return;
    }

    if (state.quizIndex === QUIZ_QUESTIONS.length - 1) {
      showQuizResult();
      state.quizIndex += 1;
      return;
    }

    if (state.quizIndex >= QUIZ_QUESTIONS.length) {
      state.quizIndex = 0;
      state.quizScore = 0;
      renderQuizQuestion();
      return;
    }

    state.quizIndex += 1;
    renderQuizQuestion();
  }

  function bindEvents() {
    elements.routeButtons.forEach(function (button) {
      button.addEventListener("click", function () {
        if (!button.dataset || !button.dataset.routeBtn) {
          return;
        }
        setRoute(button.dataset.routeBtn);
      });
    });

    elements.mapStops.forEach(function (node) {
      var activate = function () {
        if (!node.dataset || !node.dataset.stop) {
          return;
        }
        setActiveStop(node.dataset.stop, false);
      };

      node.addEventListener("click", activate);
      node.addEventListener("keydown", function (event) {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          activate();
        }
      });
    });

    elements.prevStopBtn.addEventListener("click", function () {
      moveStop(-1);
    });

    elements.nextStopBtn.addEventListener("click", function () {
      moveStop(1);
    });

    elements.quizSubmitBtn.addEventListener("click", submitAnswer);
    elements.quizNextBtn.addEventListener("click", nextQuestion);
  }

  function init() {
    bindEvents();
    setRoute(state.routeId);
    renderQuizQuestion();
  }

  init();
})();
