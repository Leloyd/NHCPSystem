(function () {
  const stops = [
    {
      id: 1,
      title: "Site Entrance Arch",
      subtitle: "Gateway and orientation point",
      description:
        "This opening stop introduces the historical boundary of the cemetery complex and gives visitors context before entering the core heritage space.",
      teachingPrompt:
        "Ask learners: What visual clues in this entrance suggest colonial-era planning and community use?",
      gradient: "linear-gradient(135deg, #92400e, #44403c)",
    },
    {
      id: 2,
      title: "Chapel Facade View",
      subtitle: "Primary architectural landmark",
      description:
        "The facade demonstrates masonry rhythm, symmetry, and material craftsmanship that are central to preservation discussions.",
      teachingPrompt:
        "Ask learners: Which facade details seem designed for symbolism versus structural function?",
      gradient: "linear-gradient(135deg, #b45309, #78350f)",
    },
    {
      id: 3,
      title: "Crypt Corridor",
      subtitle: "Subsurface circulation route",
      description:
        "This stop focuses on enclosed circulation and ventilation, showing how underground architecture balanced ritual use and environmental constraints.",
      teachingPrompt:
        "Ask learners: How might corridor layout influence movement, atmosphere, and visitor interpretation?",
      gradient: "linear-gradient(135deg, #57534e, #292524)",
    },
    {
      id: 4,
      title: "Historic Marker Zone",
      subtitle: "Interpretation and memory point",
      description:
        "The final stop highlights inscription and public-history interpretation, linking the physical site to modern educational storytelling.",
      teachingPrompt:
        "Ask learners: How do official markers shape what future visitors remember about a place?",
      gradient: "linear-gradient(135deg, #7c2d12, #431407)",
    },
  ];

  const tourScene = document.getElementById("tourScene");
  const tourStopCount = document.getElementById("tourStopCount");
  const tourTitle = document.getElementById("tourTitle");
  const tourSubtitle = document.getElementById("tourSubtitle");
  const tourDescription = document.getElementById("tourDescription");
  const tourTeaching = document.getElementById("tourTeaching");
  const tourStopsList = document.getElementById("tourStopsList");

  const prevStopBtn = document.getElementById("prevStop");
  const nextStopBtn = document.getElementById("nextStop");
  const autoWalkBtn = document.getElementById("autoWalkBtn");

  let activeIndex = 0;
  let autoWalkInterval = null;

  function renderStopsList() {
    if (!tourStopsList) {
      return;
    }

    tourStopsList.innerHTML = stops
      .map(
        (stop, index) => `
      <li>
        <button type="button" class="tour-stop-button ${index === activeIndex ? "is-active" : ""}" data-stop-index="${index}">
          Stop ${index + 1}: ${stop.title}
        </button>
      </li>
    `,
      )
      .join("");

    tourStopsList.querySelectorAll("[data-stop-index]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const index = Number(btn.getAttribute("data-stop-index"));
        showStop(index);
      });
    });
  }

  function showStop(index) {
    if (!stops.length) {
      return;
    }

    activeIndex = (index + stops.length) % stops.length;
    const stop = stops[activeIndex];

    if (tourStopCount) {
      tourStopCount.textContent = `Stop ${activeIndex + 1} of ${stops.length}`;
    }
    if (tourTitle) {
      tourTitle.textContent = stop.title;
    }
    if (tourSubtitle) {
      tourSubtitle.textContent = stop.subtitle;
    }
    if (tourDescription) {
      tourDescription.textContent = stop.description;
    }
    if (tourTeaching) {
      tourTeaching.textContent = stop.teachingPrompt;
    }
    if (tourScene) {
      tourScene.style.background = stop.gradient;
    }

    renderStopsList();

    if (window.lucide && typeof window.lucide.createIcons === "function") {
      window.lucide.createIcons();
    }
  }

  function stopAutoWalk() {
    if (autoWalkInterval) {
      clearInterval(autoWalkInterval);
      autoWalkInterval = null;
    }
    if (autoWalkBtn) {
      autoWalkBtn.textContent = "Start Auto Walkthrough";
      autoWalkBtn.classList.remove("bg-stone-700", "hover:bg-stone-800");
      autoWalkBtn.classList.add("bg-amber-600", "hover:bg-amber-700");
    }
  }

  function startAutoWalk() {
    if (autoWalkInterval) {
      stopAutoWalk();
      return;
    }

    if (autoWalkBtn) {
      autoWalkBtn.textContent = "Pause Auto Walkthrough";
      autoWalkBtn.classList.remove("bg-amber-600", "hover:bg-amber-700");
      autoWalkBtn.classList.add("bg-stone-700", "hover:bg-stone-800");
    }

    autoWalkInterval = setInterval(() => {
      showStop(activeIndex + 1);
    }, 4000);
  }

  if (prevStopBtn) {
    prevStopBtn.addEventListener("click", () => {
      showStop(activeIndex - 1);
    });
  }

  if (nextStopBtn) {
    nextStopBtn.addEventListener("click", () => {
      showStop(activeIndex + 1);
    });
  }

  if (autoWalkBtn) {
    autoWalkBtn.addEventListener("click", startAutoWalk);
  }

  document.addEventListener("keydown", (event) => {
    if (event.key === "ArrowLeft") {
      showStop(activeIndex - 1);
    }
    if (event.key === "ArrowRight") {
      showStop(activeIndex + 1);
    }
  });

  window.addEventListener("beforeunload", stopAutoWalk);

  showStop(0);
})();
