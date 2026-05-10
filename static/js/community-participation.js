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
      const acceptedFormats = ['.pdf', '.docx', '.doc', '.pptx', '.ppt'];
      const validFiles = files.filter(f => 
        acceptedFormats.some(ext => f.name.toLowerCase().endsWith(ext))
      );
      uploadedFiles = [...uploadedFiles, ...validFiles];
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
  const teacherCornerForm = document.getElementById('teacherCornerForm');
  const teacherCornerSuccess = document.getElementById('teacherCornerSuccess');
  const storiesSubmitForm = document.getElementById('storiesSubmitForm');
  const storiesSubmitSuccess = document.getElementById('storiesSubmitSuccess');

  if (storyContent && storyCharacterCount) {
    storyContent.addEventListener('input', () => {
      storyCharacterCount.textContent = `${storyContent.value.length} characters`;
    });
  }

  if (visitorFeedbackForm) {
    visitorFeedbackForm.addEventListener('submit', (e) => {
      e.preventDefault();
      if (!ratingInput || !ratingInput.value) {
        if (ratingText) {
          ratingText.textContent = 'Please select a rating before submitting.';
          ratingText.style.display = 'block';
          ratingText.style.color = '#DC2626';
        }
        return;
      }

      visitorFeedbackForm.classList.add('hidden');
      visitorFeedbackSuccess.classList.remove('hidden');
    });
  }

  if (teacherCornerForm) {
    teacherCornerForm.addEventListener('submit', (e) => {
      e.preventDefault();
      if (uploadedFiles.length === 0) {
        fileDropZone.classList.add('drag-over');
        setTimeout(() => fileDropZone.classList.remove('drag-over'), 800);
        return;
      }

      teacherCornerForm.classList.add('hidden');
      teacherCornerSuccess.classList.remove('hidden');
    });
  }

  if (storiesSubmitForm) {
    storiesSubmitForm.addEventListener('submit', (e) => {
      e.preventDefault();
      storiesSubmitForm.classList.add('hidden');
      storiesSubmitSuccess.classList.remove('hidden');
    });
  }

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
