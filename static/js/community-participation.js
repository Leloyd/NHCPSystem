(function () {
  const highlights = [
    {
      id: 1,
      category: "Museum Programs",
      categoryColor: "#1E3A5F",
      categoryBg: "rgba(30, 58, 95, 0.1)",
      title: "Heritage Walk: Rediscovering Our Roots",
      excerpt: "Join our guided immersive walk through the archaeological site where local guides share the living history of the community and its ancestors.",
      date: "May 8, 2026",
      readTime: "3 min read",
      image: "https://images.unsplash.com/photo-1773601104029-24b985b7f460?w=600&q=80",
      featured: true,
    },
    {
      id: 2,
      category: "School Engagement",
      categoryColor: "#C5973A",
      categoryBg: "rgba(197, 151, 58, 0.1)",
      title: "School Partnership Program Expands to 65 Schools",
      excerpt: "Our annual school engagement program has reached a milestone, connecting over 65 local schools with our heritage resources and on-site educational activities.",
      date: "May 5, 2026",
      readTime: "4 min read",
      image: "https://images.unsplash.com/photo-1758270704524-596810e891b5?w=600&q=80",
      featured: false,
    },
    {
      id: 3,
      category: "Public Activity",
      categoryColor: "#16A34A",
      categoryBg: "rgba(22, 163, 74, 0.1)",
      title: "Community Day Celebration Draws 2,400 Visitors",
      excerpt: "Last month's Community Day was a vibrant success, featuring local performers, craft workshops, storytelling sessions, and guided heritage tours for all ages.",
      date: "Apr 28, 2026",
      readTime: "5 min read",
      image: "https://images.unsplash.com/photo-1768776179834-93e6cafc6d97?w=600&q=80",
      featured: false,
    },
    {
      id: 4,
      category: "Public Advisory",
      categoryColor: "#DC2626",
      categoryBg: "rgba(220, 38, 38, 0.08)",
      title: "Advisory: New Visitor Guidelines for Heritage Zone B",
      excerpt: "Effective June 1, 2026, visitors to Heritage Zone B are reminded to follow updated access protocols to protect the newly excavated pre-colonial artifacts.",
      date: "Apr 22, 2026",
      readTime: "2 min read",
      image: "https://images.unsplash.com/photo-1763224810010-4e5d23f261af?w=600&q=80",
      featured: false,
    },
    {
      id: 5,
      category: "Museum Programs",
      categoryColor: "#1E3A5F",
      categoryBg: "rgba(30, 58, 95, 0.1)",
      title: "Youth Heritage Ambassadors Program – Applications Open",
      excerpt: "We are proud to open applications for our Youth Heritage Ambassadors, inviting students aged 15–22 to be trained as community educators and heritage advocates.",
      date: "Apr 15, 2026",
      readTime: "3 min read",
      image: "https://images.unsplash.com/photo-1759409972741-57859a437f41?w=600&q=80",
      featured: false,
    },
    {
      id: 6,
      category: "Public Activity",
      categoryColor: "#16A34A",
      categoryBg: "rgba(22, 163, 74, 0.1)",
      title: "Family History Documentation Drive This June",
      excerpt: "Bring your old family photographs and documents to the museum this June. Our team will help digitize and archive them for the community record.",
      date: "Apr 10, 2026",
      readTime: "3 min read",
      image: "https://images.unsplash.com/photo-1768776179834-93e6cafc6d97?w=600&q=80",
      featured: false,
    },
  ];

  const events = [
    {
      id: 1,
      title: "Museum Orientation for Schools",
      date: "2026-05-15",
      time: "9:00 AM – 11:00 AM",
      location: "Main Hall, Museum Complex",
      category: "orientation",
      description: "An introductory orientation for new school groups visiting the heritage museum. Teachers and students will be given a comprehensive tour of the facilities and exhibits.",
      capacity: 80,
      registered: 62,
    },
    {
      id: 2,
      title: "Community Story Sharing Session",
      date: "2026-05-18",
      time: "2:00 PM – 5:00 PM",
      location: "Community Room, Annex Building",
      category: "gathering",
      description: "An open session where community members can share personal stories, memories, and family histories. Light refreshments will be served.",
      capacity: 50,
      registered: 34,
    },
    {
      id: 3,
      title: "Heritage Photography Workshop",
      date: "2026-05-22",
      time: "10:00 AM – 12:00 PM",
      location: "Heritage Zone A",
      category: "workshop",
      description: "Learn to document cultural heritage through photography. Participants will explore the outdoor heritage zones with professional guidance on heritage documentation.",
      capacity: 30,
      registered: 28,
    },
    {
      id: 4,
      title: "Student Historical Research Day",
      date: "2026-05-25",
      time: "8:00 AM – 4:00 PM",
      location: "Archive Library",
      category: "student",
      description: "High school and college students are invited to spend the day in our archive library conducting primary research on local history with the guidance of our curators.",
      capacity: 40,
      registered: 22,
    },
    {
      id: 5,
      title: "June Community Day",
      date: "2026-06-01",
      time: "8:00 AM – 6:00 PM",
      location: "Museum Grounds",
      category: "gathering",
      description: "Our annual Community Day celebration featuring cultural performances, craft workshops, storytelling, and guided heritage tours open to the public.",
      capacity: 500,
      registered: 280,
    },
    {
      id: 6,
      title: "Guided Heritage Walk",
      date: "2026-06-08",
      time: "7:00 AM – 10:00 AM",
      location: "Heritage Trail, Site B",
      category: "heritage",
      description: "A guided early morning walk through the heritage trail covering pre-colonial and colonial-era sites with expert narration from our resident archaeologist.",
      capacity: 25,
      registered: 20,
    },
    {
      id: 7,
      title: "Teacher Resource Workshop",
      date: "2026-06-14",
      time: "1:00 PM – 4:00 PM",
      location: "Learning Center",
      category: "workshop",
      description: "An exclusive workshop for educators on integrating local heritage into classroom lessons. Teachers will leave with ready-to-use materials and curriculum guides.",
      capacity: 45,
      registered: 31,
    },
    {
      id: 8,
      title: "Family History Exhibit Opening",
      date: "2026-06-20",
      time: "5:00 PM – 8:00 PM",
      location: "Gallery Hall 2",
      category: "heritage",
      description: "Grand opening of our new Family History Exhibit featuring digitized photographs, documents, and oral history recordings contributed by the community.",
      capacity: 200,
      registered: 150,
    },
    {
      id: 9,
      title: "Youth Heritage Ambassador Training",
      date: "2026-06-28",
      time: "9:00 AM – 3:00 PM",
      location: "Training Room",
      category: "orientation",
      description: "First training session for newly selected Youth Heritage Ambassadors. Participants will be oriented on heritage preservation, museum operations, and community engagement.",
      capacity: 30,
      registered: 30,
    },
  ];

  const categoryConfig = {
    orientation: { label: "Orientation", color: "#1E3A5F", bg: "rgba(30, 58, 95, 0.1)", dot: "#1E3A5F" },
    gathering: { label: "Community Gathering", color: "#16A34A", bg: "rgba(22, 163, 74, 0.1)", dot: "#16A34A" },
    student: { label: "Student Activity", color: "#C5973A", bg: "rgba(197, 151, 58, 0.1)", dot: "#C5973A" },
    heritage: { label: "Heritage Session", color: "#7C3AED", bg: "rgba(124, 58, 237, 0.1)", dot: "#7C3AED" },
    workshop: { label: "Workshop", color: "#DC2626", bg: "rgba(220, 38, 38, 0.08)", dot: "#DC2626" },
  };

  const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

  let activeFilter = "all";
  let currentYear = 2026;
  let currentMonth = 4;
  let selectedDate = null;

  function renderHighlights() {
    const filtered = highlights.filter((h) => activeFilter === "all" || h.category === activeFilter);
    const featured = filtered.find((h) => h.featured);
    const rest = filtered.filter((h) => !h.featured);

    const featuredCard = document.getElementById("featuredCard");
    const regularCards = document.getElementById("regularCards");

    if (!featuredCard || !regularCards) return;

    if (featured && activeFilter === "all") {
      featuredCard.innerHTML = `
        <div class="highlight-card group rounded-2xl overflow-hidden border border-stone-200 bg-white hover:shadow-xl transition-all duration-300 hover:-translate-y-1 cursor-pointer">
          <div class="grid md:grid-cols-2">
            <div class="relative h-60 md:h-full overflow-hidden">
              <img src="${featured.image}" alt="${featured.title}" class="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
              <div class="absolute inset-0" style="background: linear-gradient(to right, rgba(15,30,50,0.3), transparent)"></div>
              <span class="absolute top-4 left-4 px-3 py-1 text-xs rounded-full bg-amber-700 text-white font-semibold">✦ Featured</span>
            </div>
            <div class="p-8 flex flex-col justify-between">
              <div>
                <span class="category-badge" style="background: ${featured.categoryBg}; color: ${featured.categoryColor};">
                  ${featured.category}
                </span>
                <h3 class="text-slate-800 mb-3 mt-4 font-serif font-bold text-2xl leading-tight">${featured.title}</h3>
                <p class="text-gray-600 leading-relaxed text-sm">${featured.excerpt}</p>
              </div>
              <div class="flex items-center justify-between mt-6 pt-5 border-t border-stone-200">
                <div class="flex items-center gap-3 text-xs text-gray-500">
                  <span>${featured.date}</span>
                  <span>${featured.readTime}</span>
                </div>
                <button class="flex items-center gap-1.5 text-sm text-slate-800 font-semibold transition-all hover:gap-2.5">
                  Read More
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 8l4 4m0 0l-4 4m4-4H3" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        </div>
      `;
    } else {
      featuredCard.innerHTML = "";
    }

    const cardsToShow = activeFilter === "all" ? rest : filtered;
    regularCards.innerHTML = cardsToShow
      .map(
        (item) => `
      <div class="highlight-card group">
        <div class="relative h-48 overflow-hidden">
          <img src="${item.image}" alt="${item.title}" class="w-full h-full object-cover" />
          <div class="absolute inset-0" style="background: linear-gradient(to top, rgba(15,30,50,0.5), transparent 60%)"></div>
        </div>
        <div class="p-5 flex flex-col flex-1">
          <span class="category-badge self-start mb-3" style="background: ${item.categoryBg}; color: ${item.categoryColor};">
            ${item.category}
          </span>
          <h3 class="text-slate-800 mb-2.5 flex-1 font-serif font-semibold text-lg leading-snug">${item.title}</h3>
          <p class="text-gray-600 text-sm leading-relaxed mb-4">${item.excerpt.slice(0, 100)}...</p>
          <div class="flex items-center justify-between pt-4 border-t border-stone-200">
            <span class="text-xs text-gray-500">${item.date}</span>
            <button class="text-xs font-semibold transition-all hover:gap-2" style="color: ${item.categoryColor};">
              Read
              <svg class="w-3 h-3 inline ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    `
      )
      .join("");
  }

  function getDaysInMonth(year, month) {
    return new Date(year, month + 1, 0).getDate();
  }

  function getFirstDayOfMonth(year, month) {
    return new Date(year, month, 1).getDay();
  }

  function getEventsForDate(day) {
    const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    return events.filter((e) => e.date === dateStr);
  }

  function formatDateDisplay(dateStr) {
    const d = new Date(dateStr + "T00:00:00");
    return d.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" });
  }

  function renderCalendar() {
    const calendarGrid = document.getElementById("calendarGrid");
    const calendarMonthYear = document.getElementById("calendarMonthYear");

    if (!calendarGrid || !calendarMonthYear) return;

    calendarMonthYear.textContent = `${MONTHS[currentMonth]} ${currentYear}`;

    const daysInMonth = getDaysInMonth(currentYear, currentMonth);
    const firstDay = getFirstDayOfMonth(currentYear, currentMonth);

    let html = "";

    for (let i = 0; i < firstDay; i++) {
      html += '<div class="h-14 md:h-16"></div>';
    }

    for (let day = 1; day <= daysInMonth; day++) {
      const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
      const dayEvents = getEventsForDate(day);
      const isToday = dateStr === "2026-05-10";
      const isSelected = dateStr === selectedDate;

      let classes = "calendar-day";
      if (isSelected) classes += " selected";
      else if (isToday) classes += " today";

      html += `
        <button class="${classes}" data-date="${dateStr}">
          <span class="calendar-day-number">${day}</span>
          ${
            dayEvents.length > 0
              ? `<div class="event-dots">${dayEvents
                  .slice(0, 3)
                  .map((ev) => `<span class="event-dot" style="background: ${categoryConfig[ev.category].dot};"></span>`)
                  .join("")}</div>`
              : ""
          }
        </button>
      `;
    }

    calendarGrid.innerHTML = html;

    document.querySelectorAll(".calendar-day").forEach((btn) => {
      btn.addEventListener("click", () => {
        const date = btn.getAttribute("data-date");
        if (selectedDate === date) {
          selectedDate = null;
          renderCalendar();
          renderSelectedDateEvents();
        } else {
          selectedDate = date;
          renderCalendar();
          renderSelectedDateEvents();
        }
      });
    });
  }

  function renderSelectedDateEvents() {
    const container = document.getElementById("selectedDateEvents");
    const title = document.getElementById("selectedDateTitle");
    const list = document.getElementById("selectedDateEventsList");

    if (!container || !title || !list) return;

    if (!selectedDate) {
      container.classList.add("hidden");
      return;
    }

    container.classList.remove("hidden");
    title.textContent = formatDateDisplay(selectedDate);

    const dateEvents = events.filter((e) => e.date === selectedDate);

    if (dateEvents.length === 0) {
      list.innerHTML = '<p class="text-gray-500 text-sm">No events scheduled for this date.</p>';
    } else {
      list.innerHTML = `
        <div class="space-y-3">
          ${dateEvents
            .map(
              (ev) => `
            <div class="flex items-start gap-3 p-3 rounded-xl border border-stone-200 hover:border-amber-300 cursor-pointer transition-all" data-event-id="${ev.id}">
              <div class="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0" style="background: ${categoryConfig[ev.category].bg};">
                <span style="color: ${categoryConfig[ev.category].color}; font-size: 14px;">●</span>
              </div>
              <div>
                <p class="text-slate-800 text-sm font-medium">${ev.title}</p>
                <p class="text-gray-500 text-xs mt-0.5">${ev.time} · ${ev.location}</p>
              </div>
            </div>
          `
            )
            .join("")}
        </div>
      `;

      list.querySelectorAll("[data-event-id]").forEach((el) => {
        el.addEventListener("click", () => {
          const eventId = parseInt(el.getAttribute("data-event-id"));
          const event = events.find((e) => e.id === eventId);
          if (event) openEventModal(event);
        });
      });
    }
  }

  function renderUpcomingEvents() {
    const list = document.getElementById("upcomingEventsList");
    if (!list) return;

    const upcoming = events
      .filter((e) => e.date >= "2026-05-10")
      .sort((a, b) => a.date.localeCompare(b.date))
      .slice(0, 5);

    list.innerHTML = upcoming
      .map((ev) => {
        const cfg = categoryConfig[ev.category];
        const d = new Date(ev.date + "T00:00:00");
        const dayNum = d.getDate();
        const monthShort = d.toLocaleString("en-US", { month: "short" });
        const fillPercent = ev.capacity ? Math.round(((ev.registered || 0) / ev.capacity) * 100) : 0;

        return `
        <button class="event-card w-full text-left" data-event-id="${ev.id}">
          <div class="flex gap-3">
            <div class="event-date-box" style="background: ${cfg.bg};">
              <span class="event-date-month" style="color: ${cfg.color};">${monthShort}</span>
              <span class="event-date-day" style="color: ${cfg.color};">${dayNum}</span>
            </div>
            <div class="flex-1 min-w-0">
              <p class="text-slate-800 text-sm leading-snug font-medium">${ev.title}</p>
              <div class="flex items-center gap-1 mt-1">
                <svg class="w-3 h-3 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span class="text-gray-500 text-xs">${ev.time.split("–")[0].trim()}</span>
              </div>
              ${
                ev.capacity
                  ? `
                <div class="mt-2">
                  <div class="flex justify-between text-[10px] text-gray-500 mb-1">
                    <span>${ev.registered}/${ev.capacity} registered</span>
                    <span>${fillPercent}%</span>
                  </div>
                  <div class="capacity-bar">
                    <div class="capacity-fill" style="width: ${fillPercent}%; background: ${fillPercent >= 90 ? "#DC2626" : fillPercent >= 60 ? "#C5973A" : "#16A34A"};"></div>
                  </div>
                </div>
              `
                  : ""
              }
            </div>
          </div>
        </button>
      `;
      })
      .join("");

    list.querySelectorAll("[data-event-id]").forEach((el) => {
      el.addEventListener("click", () => {
        const eventId = parseInt(el.getAttribute("data-event-id"));
        const event = events.find((e) => e.id === eventId);
        if (event) openEventModal(event);
      });
    });
  }

  function openEventModal(event) {
    const modal = document.getElementById("eventModal");
    const content = document.getElementById("eventModalContent");
    if (!modal || !content) return;

    const cfg = categoryConfig[event.category];
    const fillPercent = event.capacity ? Math.round(((event.registered || 0) / event.capacity) * 100) : 0;

    content.innerHTML = `
      <div class="px-6 py-5 relative" style="background: linear-gradient(135deg, ${cfg.dot}22, ${cfg.dot}08);">
        <div class="flex items-start gap-3">
          <div class="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5" style="background: ${cfg.bg};">
            <span style="color: ${cfg.color}; font-size: 16px;">●</span>
          </div>
          <div class="flex-1">
            <span class="text-xs px-2.5 py-0.5 rounded-full mb-1.5 inline-block font-semibold" style="background: ${cfg.bg}; color: ${cfg.color};">
              ${cfg.label}
            </span>
            <h3 class="text-slate-800 font-serif font-bold text-xl leading-tight">${event.title}</h3>
          </div>
          <button data-close-event-modal class="w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-white/60 transition-colors flex-shrink-0">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>

      <div class="px-6 py-5 space-y-4">
        <p class="text-gray-600 text-sm leading-relaxed">${event.description}</p>

        <div class="space-y-2.5">
          <div class="flex items-center gap-3 text-sm">
            <div class="w-8 h-8 rounded-lg flex items-center justify-center bg-blue-50">
              <svg class="w-4 h-4 text-slate-800" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <div>
              <p class="text-gray-500 text-[10px] uppercase tracking-wider">Date</p>
              <p class="text-gray-800 text-sm font-medium">${formatDateDisplay(event.date)}</p>
            </div>
          </div>
          <div class="flex items-center gap-3 text-sm">
            <div class="w-8 h-8 rounded-lg flex items-center justify-center bg-blue-50">
              <svg class="w-4 h-4 text-slate-800" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <p class="text-gray-500 text-[10px] uppercase tracking-wider">Time</p>
              <p class="text-gray-800 text-sm font-medium">${event.time}</p>
            </div>
          </div>
          <div class="flex items-center gap-3 text-sm">
            <div class="w-8 h-8 rounded-lg flex items-center justify-center bg-blue-50">
              <svg class="w-4 h-4 text-slate-800" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </div>
            <div>
              <p class="text-gray-500 text-[10px] uppercase tracking-wider">Location</p>
              <p class="text-gray-800 text-sm font-medium">${event.location}</p>
            </div>
          </div>
          ${
            event.capacity
              ? `
            <div class="flex items-center gap-3 text-sm">
              <div class="w-8 h-8 rounded-lg flex items-center justify-center bg-blue-50">
                <svg class="w-4 h-4 text-slate-800" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
              <div class="flex-1">
                <p class="text-gray-500 text-[10px] uppercase tracking-wider mb-1">Capacity</p>
                <div class="flex items-center gap-2">
                  <div class="flex-1 h-1.5 rounded-full bg-stone-200 overflow-hidden">
                    <div class="h-full rounded-full" style="width: ${fillPercent}%; background: ${cfg.dot};"></div>
                  </div>
                  <span class="text-gray-800 text-xs font-medium">${event.registered}/${event.capacity}</span>
                </div>
              </div>
            </div>
          `
              : ""
          }
        </div>

        <button class="w-full py-3 rounded-xl text-white text-sm mt-2 transition-all hover:opacity-90 active:scale-[0.98]" style="background: linear-gradient(135deg, #C5973A, #D4A843);">
          Register for this Event
        </button>
      </div>
    `;

    modal.classList.remove("hidden");
    modal.classList.add("flex");

    document.querySelectorAll("[data-close-event-modal]").forEach((btn) => {
      btn.addEventListener("click", () => {
        modal.classList.add("hidden");
        modal.classList.remove("flex");
      });
    });
  }

  document.querySelectorAll(".filter-tab").forEach((tab) => {
    tab.addEventListener("click", () => {
      document.querySelectorAll(".filter-tab").forEach((t) => t.classList.remove("active"));
      tab.classList.add("active");
      activeFilter = tab.getAttribute("data-filter");
      renderHighlights();
    });
  });

  const prevMonthBtn = document.getElementById("prevMonth");
  const nextMonthBtn = document.getElementById("nextMonth");
  const closeSelectedDateBtn = document.getElementById("closeSelectedDate");

  if (prevMonthBtn) {
    prevMonthBtn.addEventListener("click", () => {
      if (currentMonth === 0) {
        currentMonth = 11;
        currentYear--;
      } else {
        currentMonth--;
      }
      selectedDate = null;
      renderCalendar();
      renderSelectedDateEvents();
    });
  }

  if (nextMonthBtn) {
    nextMonthBtn.addEventListener("click", () => {
      if (currentMonth === 11) {
        currentMonth = 0;
        currentYear++;
      } else {
        currentMonth++;
      }
      selectedDate = null;
      renderCalendar();
      renderSelectedDateEvents();
    });
  }

  if (closeSelectedDateBtn) {
    closeSelectedDateBtn.addEventListener("click", () => {
      selectedDate = null;
      renderCalendar();
      renderSelectedDateEvents();
    });
  }

  const modal = document.getElementById("submissionModal");
  const modalTitle = document.getElementById("submissionModalTitle");
  const modalEyebrow = document.getElementById("submissionModalEyebrow");
  const modalDescription = document.getElementById("submissionModalDescription");
  const modalIcon = document.getElementById("submissionModalIcon");
  const openButtons = document.querySelectorAll("[data-open-modal]");
  const closeButtons = document.querySelectorAll("[data-close-modal]");
  const modalForms = document.querySelectorAll("[data-modal-form]");

  const modalMeta = {
    "visitor-feedback": {
      eyebrow: "Visitor Feedback",
      title: "Visitor Feedback Form",
      description: "For quick comments and ratings from on-site and website visitors.",
      iconBg: "#FFF7ED",
      iconColor: "#C5973A",
      icon: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 0 0 .95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 0 0-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 0 0-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 0 0-.363-1.118L2.98 10.1c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 0 0 .951-.69l1.519-4.674Z" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"></path></svg>'
    },
    "teacher-corner": {
      eyebrow: "Teacher Corner",
      title: "Teacher Corner Upload",
      description: "For educators sharing classroom files. Submissions remain pending until admin approval.",
      iconBg: "#EEF4FF",
      iconColor: "#1E3A5F",
      icon: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"></path></svg>'
    },
    "stories-submit": {
      eyebrow: "Community Stories",
      title: "Stories Submit Form",
      description: "For community and family heritage stories with optional photo attachments.",
      iconBg: "#F5F3FF",
      iconColor: "#7C3AED",
      icon: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"></path></svg>'
    },
  };

  function closeModal() {
    if (!modal) return;
    modal.classList.add("hidden");
    modal.classList.remove("flex");
    modal.setAttribute("aria-hidden", "true");
    document.body.classList.remove("overflow-hidden");
    modalForms.forEach((form) => form.classList.add("hidden"));
  }

  function openModal(formKey) {
    if (!modal) return;
    const targetForm = modal.querySelector(`[data-modal-form="${formKey}"]`);
    if (!targetForm) return;

    modalForms.forEach((form) => form.classList.add("hidden"));
    targetForm.classList.remove("hidden");

    const meta = modalMeta[formKey];
    if (modalTitle && meta?.title) modalTitle.textContent = meta.title;
    if (modalEyebrow && meta?.eyebrow) modalEyebrow.textContent = meta.eyebrow;
    if (modalDescription && meta?.description) modalDescription.textContent = meta.description;
    if (modalIcon && meta?.icon) {
      modalIcon.style.background = meta.iconBg;
      modalIcon.style.color = meta.iconColor;
      modalIcon.innerHTML = meta.icon;
    }

    modal.classList.remove("hidden");
    modal.classList.add("flex");
    modal.setAttribute("aria-hidden", "false");
    document.body.classList.add("overflow-hidden");

    const firstInput = targetForm.querySelector("input, select, textarea, button");
    if (firstInput) firstInput.focus();
  }

  openButtons.forEach((button) => {
    button.addEventListener("click", () => {
      const formKey = button.getAttribute("data-open-modal");
      openModal(formKey);
    });
  });

  closeButtons.forEach((button) => {
    button.addEventListener("click", closeModal);
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") closeModal();
  });

  const visitModeInput = document.getElementById("visitMode");
  document.querySelectorAll("[data-visit-mode]").forEach((button) => {
    button.addEventListener("click", () => {
      document.querySelectorAll("[data-visit-mode]").forEach((item) => item.classList.remove("active"));
      button.classList.add("active");
      if (visitModeInput) {
        visitModeInput.value = button.getAttribute("data-visit-mode") || "";
      }
    });
  });

  const storyCategoryInput = document.getElementById("storyCategory");
  document.querySelectorAll("[data-story-category]").forEach((button) => {
    button.addEventListener("click", () => {
      document.querySelectorAll("[data-story-category]").forEach((item) => item.classList.remove("active"));
      button.classList.add("active");
      if (storyCategoryInput) {
        storyCategoryInput.value = button.getAttribute("data-story-category") || "";
      }
    });
  });

  const teacherUploadTrigger = document.getElementById("teacherUploadTrigger");
  const teacherUploadInput = document.getElementById("resourceFile");
  const teacherUploadSummary = document.getElementById("teacherUploadSummary");

  if (teacherUploadTrigger && teacherUploadInput) {
    teacherUploadTrigger.addEventListener("click", () => {
      teacherUploadInput.click();
    });

    teacherUploadInput.addEventListener("change", () => {
      const files = teacherUploadInput.files;
      if (!teacherUploadSummary) {
        return;
      }
      if (!files || files.length === 0) {
        teacherUploadSummary.textContent = "No file selected yet.";
        return;
      }
      if (files.length === 1) {
        teacherUploadSummary.textContent = `Selected: ${files[0].name}`;
        return;
      }
      teacherUploadSummary.textContent = `${files.length} files selected.`;
    });
  }

  const storyPhotoTrigger = document.getElementById("storyPhotoTrigger");
  const storyPhotoInput = document.getElementById("storyPhoto");
  const storyPhotoSummary = document.getElementById("storyPhotoSummary");

  if (storyPhotoTrigger && storyPhotoInput) {
    storyPhotoTrigger.addEventListener("click", () => {
      storyPhotoInput.click();
    });

    storyPhotoInput.addEventListener("change", () => {
      const files = storyPhotoInput.files;
      if (!storyPhotoSummary) {
        return;
      }
      if (!files || files.length === 0) {
        storyPhotoSummary.textContent = "No photo selected yet.";
        return;
      }
      storyPhotoSummary.textContent = `Selected: ${files[0].name}`;
    });
  }

  const stars = document.querySelectorAll(".rating-star");
  const ratingInput = document.getElementById("visitorRating");
  const ratingText = document.getElementById("visitorRatingText");
  let rating = 0;

  stars.forEach((star) => {
    star.addEventListener("click", () => {
      rating = Number(star.getAttribute("data-rating"));
      if (ratingInput) ratingInput.value = String(rating);
      if (ratingText) ratingText.textContent = `${rating} out of 5 selected`;
      stars.forEach((item) => {
        const itemRating = Number(item.getAttribute("data-rating"));
        item.classList.toggle("text-amber-400", itemRating <= rating);
        item.classList.toggle("text-gray-300", itemRating > rating);
        item.setAttribute("aria-pressed", itemRating <= rating ? "true" : "false");
      });
    });
  });

  renderHighlights();
  renderCalendar();
  renderSelectedDateEvents();
  renderUpcomingEvents();
})();
