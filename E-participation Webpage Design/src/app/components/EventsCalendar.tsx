import { useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Calendar,
  Clock,
  MapPin,
  Users,
  BookOpen,
  Compass,
  Landmark,
  X,
} from "lucide-react";

type EventCategory = "orientation" | "gathering" | "student" | "heritage" | "workshop";

interface CalendarEvent {
  id: number;
  title: string;
  date: string; // YYYY-MM-DD
  time: string;
  location: string;
  category: EventCategory;
  description: string;
  capacity?: number;
  registered?: number;
}

const categoryConfig: Record<
  EventCategory,
  { label: string; color: string; bg: string; icon: React.ReactNode; dot: string }
> = {
  orientation: {
    label: "Orientation",
    color: "#1E3A5F",
    bg: "rgba(30, 58, 95, 0.1)",
    icon: <Compass size={14} />,
    dot: "#1E3A5F",
  },
  gathering: {
    label: "Community Gathering",
    color: "#16A34A",
    bg: "rgba(22, 163, 74, 0.1)",
    icon: <Users size={14} />,
    dot: "#16A34A",
  },
  student: {
    label: "Student Activity",
    color: "#C5973A",
    bg: "rgba(197, 151, 58, 0.1)",
    icon: <BookOpen size={14} />,
    dot: "#C5973A",
  },
  heritage: {
    label: "Heritage Session",
    color: "#7C3AED",
    bg: "rgba(124, 58, 237, 0.1)",
    icon: <Landmark size={14} />,
    dot: "#7C3AED",
  },
  workshop: {
    label: "Workshop",
    color: "#DC2626",
    bg: "rgba(220, 38, 38, 0.08)",
    icon: <Calendar size={14} />,
    dot: "#DC2626",
  },
};

const events: CalendarEvent[] = [
  {
    id: 1,
    title: "Museum Orientation for Schools",
    date: "2026-05-15",
    time: "9:00 AM – 11:00 AM",
    location: "Main Hall, Museum Complex",
    category: "orientation",
    description:
      "An introductory orientation for new school groups visiting the heritage museum. Teachers and students will be given a comprehensive tour of the facilities and exhibits.",
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
    description:
      "An open session where community members can share personal stories, memories, and family histories. Light refreshments will be served.",
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
    description:
      "Learn to document cultural heritage through photography. Participants will explore the outdoor heritage zones with professional guidance on heritage documentation.",
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
    description:
      "High school and college students are invited to spend the day in our archive library conducting primary research on local history with the guidance of our curators.",
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
    description:
      "Our annual Community Day celebration featuring cultural performances, craft workshops, storytelling, and guided heritage tours open to the public.",
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
    description:
      "A guided early morning walk through the heritage trail covering pre-colonial and colonial-era sites with expert narration from our resident archaeologist.",
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
    description:
      "An exclusive workshop for educators on integrating local heritage into classroom lessons. Teachers will leave with ready-to-use materials and curriculum guides.",
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
    description:
      "Grand opening of our new Family History Exhibit featuring digitized photographs, documents, and oral history recordings contributed by the community.",
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
    description:
      "First training session for newly selected Youth Heritage Ambassadors. Participants will be oriented on heritage preservation, museum operations, and community engagement.",
    capacity: 30,
    registered: 30,
  },
];

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfMonth(year: number, month: number) {
  return new Date(year, month, 1).getDay();
}

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

const DAYS_OF_WEEK = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export function EventsCalendar() {
  const [currentYear, setCurrentYear] = useState(2026);
  const [currentMonth, setCurrentMonth] = useState(4); // May = 4
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);

  const daysInMonth = getDaysInMonth(currentYear, currentMonth);
  const firstDay = getFirstDayOfMonth(currentYear, currentMonth);

  const prevMonth = () => {
    if (currentMonth === 0) { setCurrentMonth(11); setCurrentYear(y => y - 1); }
    else setCurrentMonth(m => m - 1);
  };

  const nextMonth = () => {
    if (currentMonth === 11) { setCurrentMonth(0); setCurrentYear(y => y + 1); }
    else setCurrentMonth(m => m + 1);
  };

  const getEventsForDate = (day: number) => {
    const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    return events.filter((e) => e.date === dateStr);
  };

  const selectedDateEvents = selectedDate
    ? events.filter((e) => e.date === selectedDate)
    : [];

  const upcomingEvents = events
    .filter((e) => e.date >= "2026-05-10")
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(0, 5);

  const formatDateDisplay = (dateStr: string) => {
    const d = new Date(dateStr + "T00:00:00");
    return d.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" });
  };

  return (
    <section id="events-calendar" style={{ background: "#F9F7F4" }} className="py-20 lg:py-28">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center max-w-2xl mx-auto mb-14">
          <span
            className="inline-block text-[#C5973A] text-xs uppercase tracking-widest mb-3"
            style={{ fontFamily: "'Inter', sans-serif", fontWeight: 600 }}
          >
            Events Calendar
          </span>
          <h2
            className="text-[#1E3A5F] mb-4"
            style={{
              fontFamily: "'Playfair Display', serif",
              fontWeight: 700,
              fontSize: "clamp(1.6rem, 3.5vw, 2.4rem)",
              lineHeight: 1.25,
            }}
          >
            Upcoming Programs &amp; Events
          </h2>
          <p
            className="text-[#6B7280]"
            style={{ fontFamily: "'Inter', sans-serif", fontSize: "0.97rem", lineHeight: 1.75 }}
          >
            Explore orientations, community gatherings, student activities, and guided heritage
            sessions in one shared public calendar.
          </p>
        </div>

        {/* Legend */}
        <div className="flex flex-wrap justify-center gap-3 mb-10">
          {(Object.entries(categoryConfig) as [EventCategory, typeof categoryConfig[EventCategory]][]).map(([key, cfg]) => (
            <div key={key} className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white border border-[#E8E0D5] text-xs" style={{ fontFamily: "'Inter', sans-serif", color: "#6B7280" }}>
              <span className="w-2 h-2 rounded-full" style={{ background: cfg.dot }} />
              {cfg.label}
            </div>
          ))}
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Calendar */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-2xl shadow-sm border border-[#E8E0D5] overflow-hidden">
              {/* Calendar Header */}
              <div
                className="flex items-center justify-between px-6 py-5"
                style={{ background: "linear-gradient(135deg, #1E3A5F, #2A5A8A)" }}
              >
                <button
                  onClick={prevMonth}
                  className="w-8 h-8 rounded-lg flex items-center justify-center text-white/70 hover:text-white hover:bg-white/10 transition-all"
                >
                  <ChevronLeft size={18} />
                </button>
                <h3
                  className="text-white"
                  style={{ fontFamily: "'Playfair Display', serif", fontWeight: 600, fontSize: "1.2rem" }}
                >
                  {MONTHS[currentMonth]} {currentYear}
                </h3>
                <button
                  onClick={nextMonth}
                  className="w-8 h-8 rounded-lg flex items-center justify-center text-white/70 hover:text-white hover:bg-white/10 transition-all"
                >
                  <ChevronRight size={18} />
                </button>
              </div>

              {/* Day Headers */}
              <div className="grid grid-cols-7 border-b border-[#F0EBE4]">
                {DAYS_OF_WEEK.map((d) => (
                  <div
                    key={d}
                    className="py-3 text-center text-xs text-[#9CA3AF]"
                    style={{ fontFamily: "'Inter', sans-serif", fontWeight: 600 }}
                  >
                    {d}
                  </div>
                ))}
              </div>

              {/* Calendar Grid */}
              <div className="grid grid-cols-7 p-2 gap-1">
                {/* Empty cells */}
                {Array.from({ length: firstDay }).map((_, i) => (
                  <div key={`empty-${i}`} className="h-14 md:h-16" />
                ))}

                {/* Day cells */}
                {Array.from({ length: daysInMonth }).map((_, i) => {
                  const day = i + 1;
                  const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
                  const dayEvents = getEventsForDate(day);
                  const isToday = dateStr === "2026-05-10";
                  const isSelected = dateStr === selectedDate;

                  return (
                    <button
                      key={day}
                      onClick={() => setSelectedDate(isSelected ? null : dateStr)}
                      className={`relative h-14 md:h-16 rounded-xl flex flex-col items-center justify-start pt-1.5 transition-all hover:bg-[#F0F4FF] ${
                        isSelected
                          ? "bg-[#1E3A5F] text-white hover:bg-[#1E3A5F]"
                          : isToday
                          ? "border-2 border-[#C5973A]"
                          : ""
                      }`}
                    >
                      <span
                        className={`text-sm ${isSelected ? "text-white" : isToday ? "text-[#C5973A]" : "text-[#374151]"}`}
                        style={{ fontFamily: "'Inter', sans-serif", fontWeight: isToday || isSelected ? 600 : 400 }}
                      >
                        {day}
                      </span>
                      {dayEvents.length > 0 && (
                        <div className="flex gap-0.5 mt-1 flex-wrap justify-center px-0.5">
                          {dayEvents.slice(0, 3).map((ev) => (
                            <span
                              key={ev.id}
                              className="w-1.5 h-1.5 rounded-full"
                              style={{ background: isSelected ? "rgba(255,255,255,0.8)" : categoryConfig[ev.category].dot }}
                            />
                          ))}
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Selected Date Events */}
            {selectedDate && (
              <div className="mt-4 bg-white rounded-2xl border border-[#E8E0D5] p-5">
                <div className="flex items-center justify-between mb-4">
                  <h4
                    className="text-[#1E3A5F]"
                    style={{ fontFamily: "'Playfair Display', serif", fontWeight: 600, fontSize: "1rem" }}
                  >
                    {formatDateDisplay(selectedDate)}
                  </h4>
                  <button onClick={() => setSelectedDate(null)} className="text-[#9CA3AF] hover:text-[#374151] transition-colors">
                    <X size={16} />
                  </button>
                </div>
                {selectedDateEvents.length === 0 ? (
                  <p className="text-[#9CA3AF] text-sm" style={{ fontFamily: "'Inter', sans-serif" }}>
                    No events scheduled for this date.
                  </p>
                ) : (
                  <div className="space-y-3">
                    {selectedDateEvents.map((ev) => (
                      <div
                        key={ev.id}
                        className="flex items-start gap-3 p-3 rounded-xl border border-[#F0EBE4] hover:border-[#D1DCF0] cursor-pointer transition-all"
                        onClick={() => setSelectedEvent(ev)}
                      >
                        <div
                          className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
                          style={{ background: categoryConfig[ev.category].bg }}
                        >
                          <span style={{ color: categoryConfig[ev.category].color }}>
                            {categoryConfig[ev.category].icon}
                          </span>
                        </div>
                        <div>
                          <p className="text-[#1E3A5F] text-sm" style={{ fontFamily: "'Inter', sans-serif", fontWeight: 500 }}>{ev.title}</p>
                          <p className="text-[#9CA3AF] text-xs mt-0.5" style={{ fontFamily: "'Inter', sans-serif" }}>{ev.time} · {ev.location}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Upcoming Events Sidebar */}
          <div>
            <div className="bg-white rounded-2xl shadow-sm border border-[#E8E0D5] overflow-hidden">
              <div className="px-5 py-4 border-b border-[#F0EBE4]">
                <h3
                  className="text-[#1E3A5F]"
                  style={{ fontFamily: "'Playfair Display', serif", fontWeight: 600, fontSize: "1.05rem" }}
                >
                  Upcoming Events
                </h3>
              </div>
              <div className="divide-y divide-[#F0EBE4]">
                {upcomingEvents.map((ev) => {
                  const cfg = categoryConfig[ev.category];
                  const d = new Date(ev.date + "T00:00:00");
                  const dayNum = d.getDate();
                  const monthShort = d.toLocaleString("en-US", { month: "short" });
                  const fillPercent = ev.capacity
                    ? Math.round(((ev.registered || 0) / ev.capacity) * 100)
                    : 0;

                  return (
                    <button
                      key={ev.id}
                      onClick={() => setSelectedEvent(ev)}
                      className="w-full px-5 py-4 text-left hover:bg-[#F9F7F4] transition-colors"
                    >
                      <div className="flex gap-3">
                        {/* Date Box */}
                        <div
                          className="w-12 h-12 rounded-xl flex flex-col items-center justify-center flex-shrink-0"
                          style={{ background: cfg.bg }}
                        >
                          <span className="text-xs leading-none" style={{ color: cfg.color, fontFamily: "'Inter', sans-serif", fontWeight: 700 }}>{monthShort}</span>
                          <span className="mt-0.5" style={{ color: cfg.color, fontFamily: "'Playfair Display', serif", fontWeight: 700, fontSize: "1.15rem", lineHeight: 1 }}>{dayNum}</span>
                        </div>

                        <div className="flex-1 min-w-0">
                          <p
                            className="text-[#1E3A5F] text-sm leading-snug"
                            style={{ fontFamily: "'Inter', sans-serif", fontWeight: 500 }}
                          >
                            {ev.title}
                          </p>
                          <div className="flex items-center gap-1 mt-1">
                            <Clock size={11} className="text-[#9CA3AF]" />
                            <span className="text-[#9CA3AF] text-xs" style={{ fontFamily: "'Inter', sans-serif" }}>{ev.time.split("–")[0].trim()}</span>
                          </div>
                          {/* Capacity bar */}
                          {ev.capacity && (
                            <div className="mt-2">
                              <div className="flex justify-between text-[10px] text-[#9CA3AF] mb-1" style={{ fontFamily: "'Inter', sans-serif" }}>
                                <span>{ev.registered}/{ev.capacity} registered</span>
                                <span>{fillPercent}%</span>
                              </div>
                              <div className="w-full h-1 rounded-full bg-[#F0EBE4] overflow-hidden">
                                <div
                                  className="h-full rounded-full transition-all"
                                  style={{
                                    width: `${fillPercent}%`,
                                    background: fillPercent >= 90 ? "#DC2626" : fillPercent >= 60 ? "#C5973A" : "#16A34A",
                                  }}
                                />
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
              <div className="px-5 py-4 border-t border-[#F0EBE4]">
                <button
                  className="w-full text-center text-sm text-[#1E3A5F] hover:text-[#2A5A8A] transition-colors flex items-center justify-center gap-1"
                  style={{ fontFamily: "'Inter', sans-serif", fontWeight: 500 }}
                >
                  View All Events <ChevronRight size={14} />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Event Detail Modal */}
      {selectedEvent && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: "rgba(10, 20, 40, 0.6)", backdropFilter: "blur(4px)" }}
          onClick={() => setSelectedEvent(null)}
        >
          <div
            className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div
              className="px-6 py-5 relative"
              style={{ background: `linear-gradient(135deg, ${categoryConfig[selectedEvent.category].dot}22, ${categoryConfig[selectedEvent.category].dot}08)` }}
            >
              <div className="flex items-start gap-3">
                <div
                  className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5"
                  style={{ background: categoryConfig[selectedEvent.category].bg }}
                >
                  <span style={{ color: categoryConfig[selectedEvent.category].color }}>
                    {categoryConfig[selectedEvent.category].icon}
                  </span>
                </div>
                <div className="flex-1">
                  <span
                    className="text-xs px-2.5 py-0.5 rounded-full mb-1.5 inline-block"
                    style={{
                      background: categoryConfig[selectedEvent.category].bg,
                      color: categoryConfig[selectedEvent.category].color,
                      fontFamily: "'Inter', sans-serif",
                      fontWeight: 600,
                    }}
                  >
                    {categoryConfig[selectedEvent.category].label}
                  </span>
                  <h3
                    className="text-[#1E3A5F]"
                    style={{ fontFamily: "'Playfair Display', serif", fontWeight: 700, fontSize: "1.15rem", lineHeight: 1.3 }}
                  >
                    {selectedEvent.title}
                  </h3>
                </div>
                <button
                  onClick={() => setSelectedEvent(null)}
                  className="w-8 h-8 rounded-lg flex items-center justify-center text-[#9CA3AF] hover:text-[#374151] hover:bg-white/60 transition-colors flex-shrink-0"
                >
                  <X size={17} />
                </button>
              </div>
            </div>

            {/* Modal Body */}
            <div className="px-6 py-5 space-y-4">
              <p className="text-[#6B7280] text-sm leading-relaxed" style={{ fontFamily: "'Inter', sans-serif" }}>
                {selectedEvent.description}
              </p>

              <div className="space-y-2.5">
                <div className="flex items-center gap-3 text-sm">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-[#F0F4FF]">
                    <Calendar size={14} className="text-[#1E3A5F]" />
                  </div>
                  <div>
                    <p className="text-[#9CA3AF] text-[10px] uppercase tracking-wider" style={{ fontFamily: "'Inter', sans-serif" }}>Date</p>
                    <p className="text-[#374151] text-sm" style={{ fontFamily: "'Inter', sans-serif", fontWeight: 500 }}>
                      {formatDateDisplay(selectedEvent.date)}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3 text-sm">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-[#F0F4FF]">
                    <Clock size={14} className="text-[#1E3A5F]" />
                  </div>
                  <div>
                    <p className="text-[#9CA3AF] text-[10px] uppercase tracking-wider" style={{ fontFamily: "'Inter', sans-serif" }}>Time</p>
                    <p className="text-[#374151] text-sm" style={{ fontFamily: "'Inter', sans-serif", fontWeight: 500 }}>{selectedEvent.time}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 text-sm">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-[#F0F4FF]">
                    <MapPin size={14} className="text-[#1E3A5F]" />
                  </div>
                  <div>
                    <p className="text-[#9CA3AF] text-[10px] uppercase tracking-wider" style={{ fontFamily: "'Inter', sans-serif" }}>Location</p>
                    <p className="text-[#374151] text-sm" style={{ fontFamily: "'Inter', sans-serif", fontWeight: 500 }}>{selectedEvent.location}</p>
                  </div>
                </div>
                {selectedEvent.capacity && (
                  <div className="flex items-center gap-3 text-sm">
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-[#F0F4FF]">
                      <Users size={14} className="text-[#1E3A5F]" />
                    </div>
                    <div className="flex-1">
                      <p className="text-[#9CA3AF] text-[10px] uppercase tracking-wider mb-1" style={{ fontFamily: "'Inter', sans-serif" }}>Capacity</p>
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-1.5 rounded-full bg-[#F0EBE4] overflow-hidden">
                          <div
                            className="h-full rounded-full"
                            style={{
                              width: `${Math.round(((selectedEvent.registered || 0) / selectedEvent.capacity) * 100)}%`,
                              background: categoryConfig[selectedEvent.category].dot,
                            }}
                          />
                        </div>
                        <span className="text-[#374151] text-xs" style={{ fontFamily: "'Inter', sans-serif", fontWeight: 500 }}>
                          {selectedEvent.registered}/{selectedEvent.capacity}
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <button
                className="w-full py-3 rounded-xl text-white text-sm mt-2 transition-all hover:opacity-90 active:scale-[0.98]"
                style={{ background: "linear-gradient(135deg, #C5973A, #D4A843)", fontFamily: "'Inter', sans-serif", fontWeight: 500 }}
              >
                Register for this Event
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}