function readCommunityParticipationData() {
  const payloadElement = document.getElementById('communityParticipationData');
  if (!payloadElement) {
    return { highlights: [], events: [] };
  }

  try {
    return JSON.parse(payloadElement.textContent || '{}');
  } catch (error) {
    console.error('Failed to parse community participation data.', error);
    return { highlights: [], events: [] };
  }
}

const communityParticipationData = readCommunityParticipationData();
const highlights = Array.isArray(communityParticipationData.highlights) ? communityParticipationData.highlights : [];
const events = Array.isArray(communityParticipationData.events) ? communityParticipationData.events : [];

const categoryConfig = {
  "Booked Tour (former Orientation)": {
    label: "Booked Tour (former Orientation)",
    color: "#1E3A5F",
    bg: "rgba(30, 58, 95, 0.1)",
    dot: "#1E3A5F",
  },
  "Community Gathering": {
    label: "Community Gathering",
    color: "#16A34A",
    bg: "rgba(22, 163, 74, 0.1)",
    dot: "#16A34A",
  },
  "Student Activity": {
    label: "Student Activity",
    color: "#C5973A",
    bg: "rgba(197, 151, 58, 0.1)",
    dot: "#C5973A",
  },
  "Heritage Session": {
    label: "Heritage Session",
    color: "#7C3AED",
    bg: "rgba(124, 58, 237, 0.1)",
    dot: "#7C3AED",
  },
  "Workshop": {
    label: "Workshop",
    color: "#DC2626",
    bg: "rgba(220, 38, 38, 0.08)",
    dot: "#DC2626",
  },
};

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

const today = new Date();
const todayKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
const initialCalendarDate = (() => {
  const sortedDates = events
    .map((event) => new Date(`${event.date}T00:00:00`))
    .filter((value) => !Number.isNaN(value.getTime()))
    .sort((a, b) => a.getTime() - b.getTime());

  return sortedDates.find((value) => formatDateKey(value) >= todayKey) || sortedDates[0] || today;
})();

const INITIAL_HIGHLIGHTS_TOTAL = 7;

let currentYear = initialCalendarDate.getFullYear();
let currentMonth = initialCalendarDate.getMonth();
let selectedDate = null;
let activeFilter = "all";
let selectedEvent = null;
let areAllHighlightsVisible = false;

function formatDateKey(value) {
  return `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, "0")}-${String(value.getDate()).padStart(2, "0")}`;
}

function getCategoryConfig(category) {
  return categoryConfig[category] || categoryConfig["Booked Tour (former Orientation)"];
}

function initHighlights() {
  const filterButtons = document.querySelectorAll('#highlightFilters .filter-tab');
  const viewAllButton = document.getElementById('viewAllHighlightsBtn');

  filterButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      filterButtons.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      activeFilter = btn.dataset.filter;
      areAllHighlightsVisible = false;
      renderHighlights();
    });
  });

  if (viewAllButton) {
    viewAllButton.addEventListener('click', () => {
      areAllHighlightsVisible = true;
      renderHighlights();
    });
  }

  renderHighlights();
}

function renderHighlights() {
  const filtered = highlights.filter(h => activeFilter === "all" || h.category === activeFilter);
  const featured = filtered.find(h => h.is_featured);
  const rest = filtered.filter(h => !h.is_featured);

  const featuredContainer = document.getElementById('highlightsFeatured');
  const gridContainer = document.getElementById('highlightsGrid');
  const viewAllButton = document.getElementById('viewAllHighlightsBtn');

  if (filtered.length === 0) {
    featuredContainer.innerHTML = '';
    gridContainer.innerHTML = `
      <div class="col-span-full bg-stone-50 border border-stone-200 rounded-3xl px-6 py-12 text-center text-gray-500">
        No community highlights are available in this category yet.
      </div>
    `;
    if (viewAllButton) {
      viewAllButton.classList.add('hidden');
    }
    return;
  }

  if (featured && activeFilter === "all") {
    featuredContainer.innerHTML = `
      <div class="featured-highlight">
        <div class="featured-highlight-grid">
          <div class="featured-highlight-image">
            ${featured.image_url ? `<img src="${featured.image_url}" alt="${featured.title}" loading="lazy" />` : '<div class="highlight-card-overlay"></div>'}
            <div style="position: absolute; inset: 0; background: linear-gradient(to right, rgba(15,30,50,0.3), transparent);"></div>
            <span class="featured-badge">✦ Featured</span>
          </div>
          <div class="featured-highlight-content">
            <div>
              <span class="highlight-category-badge" style="background: ${featured.category_bg}; color: ${featured.category_color};">
                ${featured.category}
              </span>
              <h3 class="highlight-card-title" style="font-size: 1.4rem; margin-bottom: 0.75rem;">${featured.title}</h3>
              <p class="highlight-card-excerpt">${featured.short_description}</p>
            </div>
            <div class="highlight-card-footer">
              <div class="highlight-card-meta">
                <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                <span>${featured.display_date}</span>
                <span style="margin-left: 0.5rem;">${featured.estimated_read_label}</span>
              </div>
              <a href="${featured.detail_url}" class="highlight-card-action" style="color: ${featured.category_color};">
                Read More
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7l5 5m0 0l-5 5m5-5H6"></path></svg>
              </a>
            </div>
          </div>
        </div>
      </div>
    `;
  } else {
    featuredContainer.innerHTML = '';
  }

  const limit = featured && activeFilter === "all"
    ? Math.max(INITIAL_HIGHLIGHTS_TOTAL - 1, 0)
    : INITIAL_HIGHLIGHTS_TOTAL;
  const sourceItems = activeFilter === "all" ? rest : filtered;
  const itemsToShow = areAllHighlightsVisible ? sourceItems : sourceItems.slice(0, limit);

  if (viewAllButton) {
    const hasMoreItems = sourceItems.length > itemsToShow.length;
    viewAllButton.classList.toggle('hidden', !hasMoreItems);
  }

  gridContainer.innerHTML = itemsToShow.map(item => `
    <div class="highlight-card">
      <div class="highlight-card-image">
        ${item.image_url ? `<img src="${item.image_url}" alt="${item.title}" loading="lazy" />` : ''}
        <div class="highlight-card-overlay"></div>
      </div>
      <div class="highlight-card-content">
        <span class="highlight-category-badge" style="background: ${item.category_bg}; color: ${item.category_color};">
          ${item.category}
        </span>
        <h3 class="highlight-card-title">${item.title}</h3>
        <p class="highlight-card-excerpt">${item.short_description}</p>
        <div class="highlight-card-footer">
          <span class="highlight-card-meta">
            <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
            ${item.display_date}
          </span>
          <a href="${item.detail_url}" class="highlight-card-action" style="color: ${item.category_color};">
            Read
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"></path></svg>
          </a>
        </div>
      </div>
    </div>
  `).join('');
}

function getDaysInMonth(year, month) {
  return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfMonth(year, month) {
  return new Date(year, month, 1).getDay();
}

function getEventsForDate(day) {
  const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
  return events.filter(e => e.date === dateStr);
}

function formatDateDisplay(dateStr) {
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" });
}

function initCalendar() {
  document.getElementById('prevMonth').addEventListener('click', () => {
    if (currentMonth === 0) {
      currentMonth = 11;
      currentYear--;
    } else {
      currentMonth--;
    }
    renderCalendar();
  });

  document.getElementById('nextMonth').addEventListener('click', () => {
    if (currentMonth === 11) {
      currentMonth = 0;
      currentYear++;
    } else {
      currentMonth++;
    }
    renderCalendar();
  });

  renderCalendar();
  renderUpcomingEvents();
}

function renderCalendar() {
  document.getElementById('calendarMonthYear').textContent = `${MONTHS[currentMonth]} ${currentYear}`;

  const daysInMonth = getDaysInMonth(currentYear, currentMonth);
  const firstDay = getFirstDayOfMonth(currentYear, currentMonth);

  const grid = document.getElementById('calendarGrid');
  let html = '';

  for (let i = 0; i < firstDay; i++) {
    html += '<div style="height: 3.5rem;"></div>';
  }

  for (let day = 1; day <= daysInMonth; day++) {
    const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    const dayEvents = getEventsForDate(day);
    const isToday = dateStr === todayKey;
    const isSelected = dateStr === selectedDate;

    let classes = 'calendar-day';
    if (isToday) classes += ' today';
    if (isSelected) classes += ' selected';

    html += `
      <button class="${classes}" data-date="${dateStr}">
        <span class="calendar-day-number">${day}</span>
        ${dayEvents.length > 0 ? `
          <div class="calendar-day-dots">
            ${dayEvents.slice(0, 3).map(ev => `
              <span class="calendar-event-dot" style="background: ${isSelected ? 'rgba(255,255,255,0.8)' : getCategoryConfig(ev.category).dot};"></span>
            `).join('')}
          </div>
        ` : ''}
      </button>
    `;
  }

  grid.innerHTML = html;

  grid.querySelectorAll('.calendar-day').forEach(btn => {
    btn.addEventListener('click', () => {
      const date = btn.dataset.date;
      if (selectedDate === date) {
        selectedDate = null;
        document.getElementById('selectedDateEvents').classList.add('hidden');
      } else {
        selectedDate = date;
        renderSelectedDateEvents();
      }
      renderCalendar();
    });
  });
}

function renderSelectedDateEvents() {
  const container = document.getElementById('selectedDateEvents');
  const dateEvents = events.filter(e => e.date === selectedDate);

  if (dateEvents.length === 0) {
    container.innerHTML = `
      <div class="bg-white rounded-2xl border border-gray-200 p-5">
        <div class="flex items-center justify-between mb-4">
          <h4 class="text-blue-900" style="font-family: 'Playfair Display', serif; font-weight: 600; font-size: 1rem;">
            ${formatDateDisplay(selectedDate)}
          </h4>
          <button class="text-gray-400 hover:text-gray-600" onclick="selectedDate = null; renderCalendar(); document.getElementById('selectedDateEvents').classList.add('hidden');">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg>
          </button>
        </div>
        <p class="text-gray-400 text-sm">No events scheduled for this date.</p>
      </div>
    `;
  } else {
    container.innerHTML = `
      <div class="bg-white rounded-2xl border border-gray-200 p-5">
        <div class="flex items-center justify-between mb-4">
          <h4 class="text-blue-900" style="font-family: 'Playfair Display', serif; font-weight: 600; font-size: 1rem;">
            ${formatDateDisplay(selectedDate)}
          </h4>
          <button class="text-gray-400 hover:text-gray-600" onclick="selectedDate = null; renderCalendar(); document.getElementById('selectedDateEvents').classList.add('hidden');">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg>
          </button>
        </div>
        <div class="space-y-3">
          ${dateEvents.map(ev => {
            const cfg = getCategoryConfig(ev.category);
            return `
              <div class="flex items-start gap-3 p-3 rounded-xl border border-gray-100 hover:border-blue-200 cursor-pointer transition-all" onclick="openEventModal(${ev.id})">
                <div class="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0" style="background: ${cfg.bg};">
                  <svg class="w-4 h-4" style="color: ${cfg.color};" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg>
                </div>
                <div>
                  <p class="text-blue-900 text-sm font-medium">${ev.title}</p>
                  <p class="text-gray-400 text-xs mt-0.5">${ev.time} · ${ev.location}</p>
                </div>
              </div>
            `;
          }).join('')}
        </div>
      </div>
    `;
  }

  container.classList.remove('hidden');
}

function renderUpcomingEvents() {
  const upcoming = events
    .filter(e => e.date >= todayKey)
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(0, 5);

  const container = document.getElementById('upcomingEventsList');
  if (upcoming.length === 0) {
    container.innerHTML = '<div class="text-sm text-gray-400 text-center py-8">No upcoming events available right now.</div>';
    return;
  }

  container.innerHTML = upcoming.map(ev => {
    const cfg = getCategoryConfig(ev.category);
    const d = new Date(ev.date + "T00:00:00");
    const dayNum = d.getDate();
    const monthShort = d.toLocaleString("en-US", { month: "short" });

    return `
      <button class="upcoming-event-item" onclick="openEventModal(${ev.id})">
        <div class="upcoming-event-content">
          <div class="upcoming-event-date-box" style="background: ${cfg.bg};">
            <span class="upcoming-event-month" style="color: ${cfg.color};">${monthShort}</span>
            <span class="upcoming-event-day" style="color: ${cfg.color};">${dayNum}</span>
          </div>
          <div class="upcoming-event-details">
            <p class="upcoming-event-title">${ev.title}</p>
            <div class="upcoming-event-time">
              <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
              <span>${ev.time}</span>
            </div>
          </div>
        </div>
      </button>
    `;
  }).join('');
}

function openEventModal(eventId) {
  selectedEvent = events.find(e => e.id === eventId);
  if (!selectedEvent) return;

  const cfg = getCategoryConfig(selectedEvent.category);
  const modal = document.getElementById('eventModal');
  const content = document.getElementById('eventModalContent');

  content.innerHTML = `
    <div class="px-6 py-5 relative" style="background: linear-gradient(135deg, ${cfg.dot}22, ${cfg.dot}08);">
      <div class="flex items-start gap-3">
        <div class="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5" style="background: ${cfg.bg};">
          <svg class="w-5 h-5" style="color: ${cfg.color};" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg>
        </div>
        <div class="flex-1">
          <span class="text-xs px-2.5 py-0.5 rounded-full mb-1.5 inline-block" style="background: ${cfg.bg}; color: ${cfg.color}; font-weight: 600;">
            ${cfg.label}
          </span>
          <h3 class="text-blue-900" style="font-family: 'Playfair Display', serif; font-weight: 700; font-size: 1.15rem; line-height: 1.3;">
            ${selectedEvent.title}
          </h3>
        </div>
        <button onclick="closeEventModal()" class="w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-white/60 transition-colors flex-shrink-0">
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg>
        </button>
      </div>
    </div>

    <div class="px-6 py-5 space-y-4">
      <p class="text-gray-600 text-sm leading-relaxed">${selectedEvent.description}</p>

      <div class="space-y-2.5">
        <div class="flex items-center gap-3 text-sm">
          <div class="w-8 h-8 rounded-lg flex items-center justify-center bg-blue-50">
            <svg class="w-4 h-4 text-blue-900" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg>
          </div>
          <div>
            <p class="text-gray-400 text-xs uppercase tracking-wider">Date</p>
            <p class="text-gray-700 text-sm font-medium">${formatDateDisplay(selectedEvent.date)}</p>
          </div>
        </div>
        <div class="flex items-center gap-3 text-sm">
          <div class="w-8 h-8 rounded-lg flex items-center justify-center bg-blue-50">
            <svg class="w-4 h-4 text-blue-900" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
          </div>
          <div>
            <p class="text-gray-400 text-xs uppercase tracking-wider">Time</p>
            <p class="text-gray-700 text-sm font-medium">${selectedEvent.time}</p>
          </div>
        </div>
        <div class="flex items-center gap-3 text-sm">
          <div class="w-8 h-8 rounded-lg flex items-center justify-center bg-blue-50">
            <svg class="w-4 h-4 text-blue-900" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"></path><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"></path></svg>
          </div>
          <div>
            <p class="text-gray-400 text-xs uppercase tracking-wider">Location</p>
            <p class="text-gray-700 text-sm font-medium">${selectedEvent.location}</p>
          </div>
        </div>
      </div>
    </div>
  `;

  modal.style.display = 'flex';
}

function closeEventModal() {
  document.getElementById('eventModal').style.display = 'none';
  selectedEvent = null;
}

function initParticipationModals() {
  const modalButtons = document.querySelectorAll('[data-open-modal]');
  const modal = document.getElementById('participationModal');
  const closeBtn = document.getElementById('closeParticipationModal');
  const modalTitle = document.getElementById('modalTitle');
  const modalDescription = document.getElementById('modalDescription');
  const modalIconBox = document.getElementById('modalIconBox');

  const panels = {
    'visitor-feedback': document.getElementById('visitorFeedbackPanel'),
    'teacher-corner': document.getElementById('teacherCornerPanel'),
    'stories-submit': document.getElementById('storiesSubmitPanel'),
  };

  const forms = {
    'visitor-feedback': document.getElementById('visitorFeedbackForm'),
    'teacher-corner': document.getElementById('teacherCornerForm'),
    'stories-submit': document.getElementById('storiesSubmitForm'),
  };

  const successes = {
    'visitor-feedback': document.getElementById('visitorFeedbackSuccess'),
    'teacher-corner': document.getElementById('teacherCornerSuccess'),
    'stories-submit': document.getElementById('storiesSubmitSuccess'),
  };

  const modalConfigs = {
    'visitor-feedback': {
      title: 'Visitor Feedback',
      description: 'Share your experience with us! Rate your visit and leave comments that help us improve the quality and usability of our museum services.',
      iconBackground: '#FFF7ED',
      iconColor: '#C5973A',
      iconMarkup: '<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118L2.98 10.1c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.616-4.673z"></path></svg>',
    },
    'teacher-corner': {
      title: 'Teacher Corner',
      description: 'Educators are invited to submit classroom-ready learning materials in PDF, DOCX, and slide formats to build our curated educational resource library.',
      iconBackground: '#EEF4FF',
      iconColor: '#1E3A5F',
      iconMarkup: '<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"></path></svg>',
    },
    'stories-submit': {
      title: 'Stories Submit',
      description: 'Community members are welcome to share experiences, memories, and personal stories with optional photos to help preserve public and family narratives.',
      iconBackground: '#F5F3FF',
      iconColor: '#7C3AED',
      iconMarkup: '<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 8h2a2 2 0 012 2v10a2 2 0 01-2 2H5a2 2 0 01-2-2V10a2 2 0 012-2h2m10 0V6a5 5 0 00-10 0v2m10 0H7"></path></svg>',
    },
  };

  function resetPanels() {
    Object.values(panels).forEach((panel) => {
      if (panel) {
        panel.style.display = 'none';
      }
    });

    Object.entries(forms).forEach(([key, form]) => {
      if (form) {
        form.classList.remove('hidden');
        form.reset();
      }

      const success = successes[key];
      if (success) {
        success.classList.add('hidden');
      }
    });

    const visitTypeInput = document.getElementById('visitType');
    const visitTypeButtons = document.querySelectorAll('.visit-type-btn');
    visitTypeButtons.forEach((button) => button.classList.remove('active'));
    if (visitTypeButtons[0]) {
      visitTypeButtons[0].classList.add('active');
    }
    if (visitTypeInput) {
      visitTypeInput.value = 'on-site';
    }

    const starButtons = document.querySelectorAll('.star-btn');
    starButtons.forEach((button) => button.classList.remove('filled'));
    const ratingInput = document.getElementById('rating');
    const ratingText = document.getElementById('ratingText');
    if (ratingInput) {
      ratingInput.value = '';
    }
    if (ratingText) {
      ratingText.textContent = '';
      ratingText.style.display = 'none';
      ratingText.style.color = '#C5973A';
    }
    const visitorFeedbackFormMessage = document.getElementById('visitorFeedbackFormMessage');
    if (visitorFeedbackFormMessage) {
      visitorFeedbackFormMessage.textContent = '';
      visitorFeedbackFormMessage.classList.add('hidden');
      visitorFeedbackFormMessage.classList.remove('is-error', 'is-success');
    }
    if (typeof window.resetParticipationFeedbackState === 'function') {
      window.resetParticipationFeedbackState();
    }

    const categoryButtons = document.querySelectorAll('.category-btn');
    const categoryInput = document.getElementById('storyCategory');
    categoryButtons.forEach((button) => button.classList.remove('active'));
    if (categoryInput) {
      categoryInput.value = '';
    }

    const storyCharacterCount = document.getElementById('storyCharacterCount');
    if (storyCharacterCount) {
      storyCharacterCount.textContent = '0 characters';
    }

    const photoPreview = document.getElementById('photoPreview');
    const photoUploadPrompt = document.getElementById('photoUploadPrompt');
    const storyPhotoInput = document.getElementById('storyPhoto');
    const photoPreviewImg = document.getElementById('photoPreviewImg');
    if (storyPhotoInput) {
      storyPhotoInput.value = '';
    }
    if (photoPreviewImg) {
      photoPreviewImg.src = '';
    }
    if (photoPreview) {
      photoPreview.classList.add('hidden');
    }
    if (photoUploadPrompt) {
      photoUploadPrompt.classList.remove('hidden');
    }
    if (typeof window.resetParticipationTeacherState === 'function') {
      window.resetParticipationTeacherState();
    }
    if (typeof window.resetParticipationSubmissionState === 'function') {
      window.resetParticipationSubmissionState();
    }
  }

  function closeParticipationModal() {
    modal.style.display = 'none';
    resetPanels();
  }

  modalButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      const formType = btn.dataset.openModal;

      resetPanels();

      if (panels[formType] && modalConfigs[formType]) {
        panels[formType].style.display = 'block';
        modalTitle.textContent = modalConfigs[formType].title;
        modalDescription.textContent = modalConfigs[formType].description;
        modalIconBox.style.background = modalConfigs[formType].iconBackground;
        modalIconBox.style.color = modalConfigs[formType].iconColor;
        modalIconBox.innerHTML = modalConfigs[formType].iconMarkup;
        modal.style.display = 'flex';
      }
    });
  });

  closeBtn.addEventListener('click', closeParticipationModal);

  document.querySelectorAll('[data-close-participation]').forEach((button) => {
    button.addEventListener('click', closeParticipationModal);
  });

  modal.addEventListener('click', (e) => {
    if (e.target === modal) {
      closeParticipationModal();
    }
  });

  document.getElementById('eventModal').addEventListener('click', (e) => {
    if (e.target === document.getElementById('eventModal')) {
      closeEventModal();
    }
  });
}

function initFormInteractions() {
  // Visit Type Buttons
  const visitTypeBtns = document.querySelectorAll('.visit-type-btn');
  const visitTypeInput = document.getElementById('visitType');
  
  visitTypeBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      visitTypeBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      if (visitTypeInput) {
        visitTypeInput.value = btn.dataset.visitType;
      }
    });
  });

  // Star Rating
  const starBtns = document.querySelectorAll('.star-btn');
  const ratingInput = document.getElementById('rating');
  const ratingText = document.getElementById('ratingText');
  const ratingLabels = ['', 'Poor', 'Fair', 'Good', 'Very Good', 'Excellent'];
  let currentRating = 0;

  starBtns.forEach((btn, index) => {
    btn.addEventListener('mouseenter', () => {
      starBtns.forEach((b, i) => {
        if (i <= index) {
          b.classList.add('filled');
        } else {
          b.classList.remove('filled');
        }
      });
    });

    btn.addEventListener('click', () => {
      currentRating = index + 1;
      if (ratingInput) ratingInput.value = currentRating;
      if (ratingText) {
        ratingText.textContent = ratingLabels[currentRating];
        ratingText.style.display = 'block';
        ratingText.style.color = '#C5973A';
      }
    });
  });

  document.getElementById('starRating')?.addEventListener('mouseleave', () => {
    starBtns.forEach((b, i) => {
      if (i < currentRating) {
        b.classList.add('filled');
      } else {
        b.classList.remove('filled');
      }
    });
  });

  window.resetParticipationFeedbackState = () => {
    currentRating = 0;
    starBtns.forEach((button) => button.classList.remove('filled'));
  };

  // File Drop Zone
  const fileDropZone = document.getElementById('fileDropZone');
  const resourceFileInput = document.getElementById('resourceFile');
  const fileList = document.getElementById('fileList');
  let uploadedFiles = [];

  if (fileDropZone && resourceFileInput) {
    fileDropZone.addEventListener('click', () => resourceFileInput.click());

    fileDropZone.addEventListener('dragover', (e) => {
      e.preventDefault();
      fileDropZone.classList.add('drag-over');
    });

    fileDropZone.addEventListener('dragleave', () => {
      fileDropZone.classList.remove('drag-over');
    });

    fileDropZone.addEventListener('drop', (e) => {
      e.preventDefault();
      fileDropZone.classList.remove('drag-over');
      const files = Array.from(e.dataTransfer.files);
      handleFiles(files);
    });

    resourceFileInput.addEventListener('change', (e) => {
      const files = Array.from(e.target.files);
      handleFiles(files);
    });

    function handleFiles(files) {
      const acceptedFormats = ['.pdf', '.docx', '.pptx', '.ppt'];
      const firstValidFile = files.find(f => acceptedFormats.some(ext => f.name.toLowerCase().endsWith(ext)));
      if (!firstValidFile) {
        return;
      }
      const transfer = new DataTransfer();
      transfer.items.add(firstValidFile);
      resourceFileInput.files = transfer.files;
      uploadedFiles = [firstValidFile];
      renderFileList();
    }

    function renderFileList() {
      if (!fileList) return;
      fileList.innerHTML = uploadedFiles.map((file, index) => {
        const icon = file.name.endsWith('.pdf') ? '📄' : file.name.endsWith('.pptx') || file.name.endsWith('.ppt') ? '📊' : '📝';
        return `
          <div class="flex items-center gap-3 p-3 rounded-xl bg-stone-50 border border-gray-200">
            <span class="text-lg">${icon}</span>
            <div class="flex-1 min-w-0">
              <p class="text-gray-700 text-xs truncate font-medium">${file.name}</p>
              <p class="text-gray-400 text-xs">${(file.size / 1024).toFixed(0)} KB</p>
            </div>
            <button type="button" class="text-gray-400 hover:text-red-500 transition-colors" onclick="removeFile(${index})">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
              </svg>
            </button>
          </div>
        `;
      }).join('');
    }

    window.removeFile = (index) => {
      uploadedFiles.splice(index, 1);
      const transfer = new DataTransfer();
      resourceFileInput.files = transfer.files;
      renderFileList();
    };

    window.resetParticipationTeacherState = () => {
      uploadedFiles = [];
      resourceFileInput.value = '';
      fileDropZone.classList.remove('drag-over');
      renderFileList();
    };
  }

  // Category Buttons
  const categoryBtns = document.querySelectorAll('.category-btn');
  const categoryInput = document.getElementById('storyCategory');

  categoryBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      categoryBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      if (categoryInput) {
        categoryInput.value = btn.dataset.category;
      }
    });
  });

  // Photo Upload with Preview
  const photoUploadZone = document.getElementById('photoUploadZone');
  const storyPhotoInput = document.getElementById('storyPhoto');
  const photoPreview = document.getElementById('photoPreview');
  const photoPreviewImg = document.getElementById('photoPreviewImg');
  const photoUploadPrompt = document.getElementById('photoUploadPrompt');
  const removePhotoBtn = document.getElementById('removePhoto');
  const storyContent = document.getElementById('storyContent');
  const storyCharacterCount = document.getElementById('storyCharacterCount');

  const visitorFeedbackForm = document.getElementById('visitorFeedbackForm');
  const visitorFeedbackSuccess = document.getElementById('visitorFeedbackSuccess');
  const visitorFeedbackFormMessage = document.getElementById('visitorFeedbackFormMessage');
  const teacherCornerForm = document.getElementById('teacherCornerForm');
  const teacherCornerSuccess = document.getElementById('teacherCornerSuccess');
  const teacherCornerVerification = document.getElementById('teacherCornerVerification');
  const teacherCornerVerificationEmail = document.getElementById('teacherCornerVerificationEmail');
  const teacherCornerVerificationCode = document.getElementById('teacherCornerVerificationCode');
  const teacherCornerVerifyButton = document.getElementById('teacherCornerVerifyButton');
  const teacherCornerBackButton = document.getElementById('teacherCornerBackButton');
  const teacherCornerFormMessage = document.getElementById('teacherCornerFormMessage');
  const teacherCornerVerificationMessage = document.getElementById('teacherCornerVerificationMessage');
  const storiesSubmitForm = document.getElementById('storiesSubmitForm');
  const storiesSubmitSuccess = document.getElementById('storiesSubmitSuccess');
  const storiesSubmitVerification = document.getElementById('storiesSubmitVerification');
  const storiesSubmitVerificationEmail = document.getElementById('storiesSubmitVerificationEmail');
  const storiesSubmitVerificationCode = document.getElementById('storiesSubmitVerificationCode');
  const storiesSubmitVerifyButton = document.getElementById('storiesSubmitVerifyButton');
  const storiesSubmitBackButton = document.getElementById('storiesSubmitBackButton');
  const storiesSubmitFormMessage = document.getElementById('storiesSubmitFormMessage');
  const storiesSubmitVerificationMessage = document.getElementById('storiesSubmitVerificationMessage');
  const submissionState = {
    'teacher-corner': { submissionId: null, email: '' },
    'stories-submit': { submissionId: null, email: '' },
  };

  function setSubmissionMessage(element, message, tone = 'error') {
    if (!element) {
      return;
    }
    element.textContent = message || '';
    element.classList.toggle('hidden', !message);
    element.classList.remove('is-error', 'is-success');
    if (message) {
      element.classList.add(tone === 'success' ? 'is-success' : 'is-error');
    }
  }

  function resetSubmissionState() {
    submissionState['teacher-corner'] = { submissionId: null, email: '' };
    submissionState['stories-submit'] = { submissionId: null, email: '' };
    if (teacherCornerVerification) {
      teacherCornerVerification.classList.add('hidden');
    }
    if (storiesSubmitVerification) {
      storiesSubmitVerification.classList.add('hidden');
    }
    if (teacherCornerVerificationCode) {
      teacherCornerVerificationCode.value = '';
    }
    if (storiesSubmitVerificationCode) {
      storiesSubmitVerificationCode.value = '';
    }
    setSubmissionMessage(teacherCornerFormMessage, '');
    setSubmissionMessage(teacherCornerVerificationMessage, '');
    setSubmissionMessage(storiesSubmitFormMessage, '');
    setSubmissionMessage(storiesSubmitVerificationMessage, '');
  }

  window.resetParticipationSubmissionState = resetSubmissionState;

  async function postForm(url, formData) {
    const response = await fetch(url, {
      method: 'POST',
      body: formData,
      headers: {
        'X-Requested-With': 'XMLHttpRequest',
      },
    });

    let payload = {};
    try {
      payload = await response.json();
    } catch (error) {
      payload = { ok: false, error: 'Unexpected server response.' };
    }

    return { response, payload };
  }

  function openVerificationStep(type, email, submissionId, message) {
    const isTeacher = type === 'teacher-corner';
    const form = isTeacher ? teacherCornerForm : storiesSubmitForm;
    const verification = isTeacher ? teacherCornerVerification : storiesSubmitVerification;
    const emailLabel = isTeacher ? teacherCornerVerificationEmail : storiesSubmitVerificationEmail;
    const verifyMessage = isTeacher ? teacherCornerVerificationMessage : storiesSubmitVerificationMessage;
    const codeInput = isTeacher ? teacherCornerVerificationCode : storiesSubmitVerificationCode;

    submissionState[type] = { submissionId, email };
    if (emailLabel) {
      emailLabel.textContent = email;
    }
    if (form) {
      form.classList.add('hidden');
    }
    if (verification) {
      verification.classList.remove('hidden');
    }
    if (codeInput) {
      codeInput.value = '';
      codeInput.focus();
    }
    setSubmissionMessage(verifyMessage, message || 'Enter the verification code sent to your email.', 'success');
  }

  function returnToForm(type) {
    const isTeacher = type === 'teacher-corner';
    const form = isTeacher ? teacherCornerForm : storiesSubmitForm;
    const verification = isTeacher ? teacherCornerVerification : storiesSubmitVerification;
    const verifyMessage = isTeacher ? teacherCornerVerificationMessage : storiesSubmitVerificationMessage;
    if (verification) {
      verification.classList.add('hidden');
    }
    if (form) {
      form.classList.remove('hidden');
    }
    setSubmissionMessage(verifyMessage, '');
  }

  async function requestSubmissionVerification(type) {
    const isTeacher = type === 'teacher-corner';
    const form = isTeacher ? teacherCornerForm : storiesSubmitForm;
    const formMessage = isTeacher ? teacherCornerFormMessage : storiesSubmitFormMessage;
    if (!form) {
      return;
    }

    if (isTeacher && uploadedFiles.length === 0) {
      fileDropZone.classList.add('drag-over');
      setTimeout(() => fileDropZone.classList.remove('drag-over'), 800);
      setSubmissionMessage(formMessage, 'Please upload a file before submitting.');
      return;
    }

    const formData = new FormData(form);
    const email = String(formData.get('submitter_email') || '').trim();
    setSubmissionMessage(formMessage, '');

    try {
      const { response, payload } = await postForm('/community-participation/submissions/request-verification', formData);
      if (payload.ok) {
        openVerificationStep(type, email, payload.submission_id, payload.message);
        return;
      }

      if (response.status === 429 && payload.requires_verification && payload.submission_id) {
        openVerificationStep(type, email, payload.submission_id, payload.error);
        return;
      }

      setSubmissionMessage(formMessage, payload.error || 'Could not start email verification right now.');
    } catch (error) {
      setSubmissionMessage(formMessage, 'Could not reach the server right now. Please try again.');
    }
  }

  async function verifySubmission(type) {
    const isTeacher = type === 'teacher-corner';
    const verifyMessage = isTeacher ? teacherCornerVerificationMessage : storiesSubmitVerificationMessage;
    const successBox = isTeacher ? teacherCornerSuccess : storiesSubmitSuccess;
    const verification = isTeacher ? teacherCornerVerification : storiesSubmitVerification;
    const codeInput = isTeacher ? teacherCornerVerificationCode : storiesSubmitVerificationCode;
    const state = submissionState[type];

    if (!state || !state.submissionId) {
      setSubmissionMessage(verifyMessage, 'Your submission session has expired. Please submit the form again.');
      return;
    }

    const verificationCode = String(codeInput?.value || '').trim();
    if (!verificationCode) {
      setSubmissionMessage(verifyMessage, 'Please enter the verification code.');
      return;
    }

    const formData = new FormData();
    formData.set('submission_id', String(state.submissionId));
    formData.set('submitter_email', state.email);
    formData.set('verification_code', verificationCode);

    try {
      const { payload } = await postForm('/community-participation/submissions/verify', formData);
      if (!payload.ok) {
        setSubmissionMessage(verifyMessage, payload.error || 'Could not verify your submission right now.');
        return;
      }

      setSubmissionMessage(verifyMessage, payload.message || 'Submission verified successfully.', 'success');
      if (verification) {
        verification.classList.add('hidden');
      }
      if (successBox) {
        successBox.classList.remove('hidden');
      }
    } catch (error) {
      setSubmissionMessage(verifyMessage, 'Could not reach the server right now. Please try again.');
    }
  }

  if (storyContent && storyCharacterCount) {
    storyContent.addEventListener('input', () => {
      storyCharacterCount.textContent = `${storyContent.value.length} characters`;
    });
  }

  if (visitorFeedbackForm) {
    visitorFeedbackForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      if (!ratingInput || !ratingInput.value) {
        if (ratingText) {
          ratingText.textContent = 'Please select a rating before submitting.';
          ratingText.style.display = 'block';
          ratingText.style.color = '#DC2626';
        }
        setSubmissionMessage(visitorFeedbackFormMessage, 'Please select a rating before submitting.');
        return;
      }

      const formData = new FormData(visitorFeedbackForm);
      setSubmissionMessage(visitorFeedbackFormMessage, '');

      try {
        const { payload } = await postForm('/community-participation/visitor-feedback', formData);
        if (!payload.ok) {
          setSubmissionMessage(visitorFeedbackFormMessage, payload.error || 'Could not submit your feedback right now.');
          return;
        }

        visitorFeedbackForm.classList.add('hidden');
        visitorFeedbackSuccess.classList.remove('hidden');
      } catch (error) {
        setSubmissionMessage(visitorFeedbackFormMessage, 'Could not reach the server right now. Please try again.');
      }
    });
  }

  if (teacherCornerForm) {
    teacherCornerForm.addEventListener('submit', (e) => {
      e.preventDefault();
      requestSubmissionVerification('teacher-corner');
    });
  }

  if (storiesSubmitForm) {
    storiesSubmitForm.addEventListener('submit', (e) => {
      e.preventDefault();
      requestSubmissionVerification('stories-submit');
    });
  }

  teacherCornerVerifyButton?.addEventListener('click', () => {
    verifySubmission('teacher-corner');
  });

  storiesSubmitVerifyButton?.addEventListener('click', () => {
    verifySubmission('stories-submit');
  });

  teacherCornerBackButton?.addEventListener('click', () => {
    returnToForm('teacher-corner');
  });

  storiesSubmitBackButton?.addEventListener('click', () => {
    returnToForm('stories-submit');
  });

  if (photoUploadZone && storyPhotoInput) {
    photoUploadZone.addEventListener('click', () => {
      if (!photoPreview?.classList.contains('hidden')) return;
      storyPhotoInput.click();
    });

    storyPhotoInput.addEventListener('change', (e) => {
      const file = e.target.files?.[0];
      if (file && file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = (ev) => {
          if (photoPreviewImg && photoPreview && photoUploadPrompt) {
            photoPreviewImg.src = ev.target.result;
            photoPreview.classList.remove('hidden');
            photoUploadPrompt.classList.add('hidden');
          }
        };
        reader.readAsDataURL(file);
      }
    });

    removePhotoBtn?.addEventListener('click', (e) => {
      e.stopPropagation();
      if (storyPhotoInput) storyPhotoInput.value = '';
      if (photoPreview && photoUploadPrompt) {
        photoPreview.classList.add('hidden');
        photoUploadPrompt.classList.remove('hidden');
      }
    });
  }
}

document.addEventListener('DOMContentLoaded', () => {
  initHighlights();
  initCalendar();
  initParticipationModals();
  initFormInteractions();
});
