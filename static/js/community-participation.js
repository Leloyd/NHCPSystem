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
    image: "https://images.unsplash.com/photo-1773601104029-24b985b7f460?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=600",
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
    image: "https://images.unsplash.com/photo-1758270704524-596810e891b5?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=600",
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
    image: "https://images.unsplash.com/photo-1768776179834-93e6cafc6d97?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=600",
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
    image: "https://images.unsplash.com/photo-1763224810010-4e5d23f261af?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=600",
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
    image: "https://images.unsplash.com/photo-1759409972741-57859a437f41?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=600",
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
    image: "https://images.unsplash.com/photo-1768776179834-93e6cafc6d97?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=600",
    featured: false,
  },
];

const categoryConfig = {
  orientation: {
    label: "Orientation",
    color: "#1E3A5F",
    bg: "rgba(30, 58, 95, 0.1)",
    dot: "#1E3A5F",
  },
  gathering: {
    label: "Community Gathering",
    color: "#16A34A",
    bg: "rgba(22, 163, 74, 0.1)",
    dot: "#16A34A",
  },
  student: {
    label: "Student Activity",
    color: "#C5973A",
    bg: "rgba(197, 151, 58, 0.1)",
    dot: "#C5973A",
  },
  heritage: {
    label: "Heritage Session",
    color: "#7C3AED",
    bg: "rgba(124, 58, 237, 0.1)",
    dot: "#7C3AED",
  },
  workshop: {
    label: "Workshop",
    color: "#DC2626",
    bg: "rgba(220, 38, 38, 0.08)",
    dot: "#DC2626",
  },
};

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

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

let currentYear = 2026;
let currentMonth = 4;
let selectedDate = null;
let activeFilter = "all";
let selectedEvent = null;

function initHighlights() {
  const filterButtons = document.querySelectorAll('#highlightFilters .filter-tab');
  filterButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      filterButtons.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      activeFilter = btn.dataset.filter;
      renderHighlights();
    });
  });

  renderHighlights();
}

function renderHighlights() {
  const filtered = highlights.filter(h => activeFilter === "all" || h.category === activeFilter);
  const featured = filtered.find(h => h.featured);
  const rest = filtered.filter(h => !h.featured);

  const featuredContainer = document.getElementById('highlightsFeatured');
  const gridContainer = document.getElementById('highlightsGrid');

  if (featured && activeFilter === "all") {
    featuredContainer.innerHTML = `
      <div class="featured-highlight">
        <div class="featured-highlight-grid">
          <div class="featured-highlight-image">
            <img src="${featured.image}" alt="${featured.title}" loading="lazy" />
            <div style="position: absolute; inset: 0; background: linear-gradient(to right, rgba(15,30,50,0.3), transparent);"></div>
            <span class="featured-badge">✦ Featured</span>
          </div>
          <div class="featured-highlight-content">
            <div>
              <span class="highlight-category-badge" style="background: ${featured.categoryBg}; color: ${featured.categoryColor};">
                ${featured.category}
              </span>
              <h3 class="highlight-card-title" style="font-size: 1.4rem; margin-bottom: 0.75rem;">${featured.title}</h3>
              <p class="highlight-card-excerpt">${featured.excerpt}</p>
            </div>
            <div class="highlight-card-footer">
              <div class="highlight-card-meta">
                <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                <span>${featured.date}</span>
                <span style="margin-left: 0.5rem;">${featured.readTime}</span>
              </div>
              <button class="highlight-card-action" style="color: ${featured.categoryColor};">
                Read More
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7l5 5m0 0l-5 5m5-5H6"></path></svg>
              </button>
            </div>
          </div>
        </div>
      </div>
    `;
  } else {
    featuredContainer.innerHTML = '';
  }

  const itemsToShow = activeFilter === "all" ? rest : filtered;
  gridContainer.innerHTML = itemsToShow.map(item => `
    <div class="highlight-card">
      <div class="highlight-card-image">
        <img src="${item.image}" alt="${item.title}" loading="lazy" />
        <div class="highlight-card-overlay"></div>
      </div>
      <div class="highlight-card-content">
        <span class="highlight-category-badge" style="background: ${item.categoryBg}; color: ${item.categoryColor};">
          ${item.category}
        </span>
        <h3 class="highlight-card-title">${item.title}</h3>
        <p class="highlight-card-excerpt">${item.excerpt.slice(0, 100)}...</p>
        <div class="highlight-card-footer">
          <span class="highlight-card-meta">
            <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
            ${item.date}
          </span>
          <button class="highlight-card-action" style="color: ${item.categoryColor};">
            Read
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"></path></svg>
          </button>
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
    const isToday = dateStr === "2026-05-10";
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
              <span class="calendar-event-dot" style="background: ${isSelected ? 'rgba(255,255,255,0.8)' : categoryConfig[ev.category].dot};"></span>
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
            const cfg = categoryConfig[ev.category];
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
    .filter(e => e.date >= "2026-05-10")
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(0, 5);

  const container = document.getElementById('upcomingEventsList');
  container.innerHTML = upcoming.map(ev => {
    const cfg = categoryConfig[ev.category];
    const d = new Date(ev.date + "T00:00:00");
    const dayNum = d.getDate();
    const monthShort = d.toLocaleString("en-US", { month: "short" });
    const fillPercent = ev.capacity ? Math.round(((ev.registered || 0) / ev.capacity) * 100) : 0;
    const fillColor = fillPercent >= 90 ? "#DC2626" : fillPercent >= 60 ? "#C5973A" : "#16A34A";

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
              <span>${ev.time.split("–")[0].trim()}</span>
            </div>
            ${ev.capacity ? `
              <div class="upcoming-event-capacity">
                <div class="upcoming-event-capacity-text">
                  <span>${ev.registered}/${ev.capacity} registered</span>
                  <span>${fillPercent}%</span>
                </div>
                <div class="upcoming-event-capacity-bar">
                  <div class="upcoming-event-capacity-fill" style="width: ${fillPercent}%; background: ${fillColor};"></div>
                </div>
              </div>
            ` : ''}
          </div>
        </div>
      </button>
    `;
  }).join('');
}

function openEventModal(eventId) {
  selectedEvent = events.find(e => e.id === eventId);
  if (!selectedEvent) return;

  const cfg = categoryConfig[selectedEvent.category];
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
        ${selectedEvent.capacity ? `
          <div class="flex items-center gap-3 text-sm">
            <div class="w-8 h-8 rounded-lg flex items-center justify-center bg-blue-50">
              <svg class="w-4 h-4 text-blue-900" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"></path></svg>
            </div>
            <div class="flex-1">
              <p class="text-gray-400 text-xs uppercase tracking-wider mb-1">Capacity</p>
              <div class="flex items-center gap-2">
                <div class="flex-1 h-1.5 rounded-full bg-gray-200 overflow-hidden">
                  <div class="h-full rounded-full" style="width: ${Math.round(((selectedEvent.registered || 0) / selectedEvent.capacity) * 100)}%; background: ${cfg.dot};"></div>
                </div>
                <span class="text-gray-700 text-xs font-medium">${selectedEvent.registered}/${selectedEvent.capacity}</span>
              </div>
            </div>
          </div>
        ` : ''}
      </div>

      <button class="w-full py-3 rounded-xl text-white text-sm mt-2 transition-all hover:opacity-90" style="background: linear-gradient(135deg, #C5973A, #D4A843); font-weight: 500;">
        Register for this Event
      </button>
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

  const forms = {
    'visitor-feedback': document.getElementById('visitorFeedbackForm'),
    'teacher-corner': document.getElementById('teacherCornerForm'),
    'stories-submit': document.getElementById('storiesSubmitForm'),
  };

  const titles = {
    'visitor-feedback': 'Visitor Feedback',
    'teacher-corner': 'Teacher Corner',
    'stories-submit': 'Stories Submit',
  };

  const descriptions = {
    'visitor-feedback': 'Share your experience and help us improve',
    'teacher-corner': 'Submit educational resources for review',
    'stories-submit': 'Share your memories and stories with the community',
  };

  modalButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      const formType = btn.dataset.openModal;
      
      Object.values(forms).forEach(form => form.style.display = 'none');
      
      if (forms[formType]) {
        forms[formType].style.display = 'flex';
        document.getElementById('modalTitle').textContent = titles[formType];
        document.getElementById('modalDescription').textContent = descriptions[formType];
        modal.style.display = 'flex';
      }
    });
  });

  closeBtn.addEventListener('click', () => {
    modal.style.display = 'none';
  });

  modal.addEventListener('click', (e) => {
    if (e.target === modal) {
      modal.style.display = 'none';
    }
  });

  document.getElementById('eventModal').addEventListener('click', (e) => {
    if (e.target === document.getElementById('eventModal')) {
      closeEventModal();
    }
  });
}

document.addEventListener('DOMContentLoaded', () => {
  initHighlights();
  initCalendar();
  initParticipationModals();
});
