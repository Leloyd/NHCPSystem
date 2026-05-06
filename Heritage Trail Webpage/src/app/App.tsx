import { useState, useEffect } from "react";
import { motion } from "motion/react";
import {
  ChevronDown, ChevronUp, ChevronLeft, ChevronRight,
  CheckCircle, XCircle, Award, RotateCcw, ArrowRight,
  BookOpen, FileText, Contrast, Settings, X,
  Clock, MapPin, Info, Star, Users,
} from "lucide-react";
import { clsx } from "clsx";

// ── Fonts
const cinzel = { fontFamily: "Cinzel, serif" };
const crimson = { fontFamily: '"Crimson Pro", Georgia, serif' };
const mono = { fontFamily: '"Courier Prime", "Courier New", monospace' };

// ── Font sizes
const FONT_SIZES: Record<string, string> = { sm: "13px", md: "16px", lg: "19px", xl: "23px" };
type FontSize = "sm" | "md" | "lg" | "xl";

// ── Stop metadata
const STOPS = [
  { id: 1, title: "Front Gate Orientation", short: "Front Gates" },
  { id: 2, title: "Museum Registration & Visitor Guidance", short: "Registration" },
  { id: 3, title: "Museum Artifact Interpretation", short: "Artifacts" },
  { id: 4, title: "Museum Quiz Checkpoint", short: "Quiz" },
  { id: 5, title: "Return to Gates — Cemetery History", short: "Cemetery History" },
  { id: 6, title: "Front of the Church", short: "Church Exterior" },
  { id: 7, title: "Inside the Church", short: "Church Interior" },
  { id: 8, title: "Underground Crypts", short: "Crypts" },
  { id: 9, title: "Final Assessment", short: "Assessment" },
  { id: 10, title: "Return to Gates & Thank You", short: "Thank You" },
];

// ── Quiz data (Stop 4)
const QUIZ_QUESTIONS = [
  {
    id: 1,
    question: "Which best describes the primary function of the museum within the Underground Cemetery complex?",
    options: [
      { letter: "A", text: "To sell souvenirs and heritage merchandise" },
      { letter: "B", text: "To preserve and interpret artifacts connecting visitors to burial customs and community memory" },
      { letter: "C", text: "To serve as a ticketing office for guided tours" },
      { letter: "D", text: "To house administrative parish records only" },
    ],
    answer: "B",
  },
  {
    id: 2,
    question: "Burial jars found in the museum are significant because they:",
    options: [
      { letter: "A", text: "Were used exclusively by Spanish colonizers" },
      { letter: "B", text: "Represent pre-colonial indigenous burial traditions predating the church" },
      { letter: "C", text: "Were used to store ceremonial food offerings during festivities" },
      { letter: "D", text: "Are modern replicas created for educational display" },
    ],
    answer: "B",
  },
  {
    id: 3,
    question: "Personal belongings buried alongside the deceased suggest the community believed:",
    options: [
      { letter: "A", text: "That personal items were too valuable to pass on to the living" },
      { letter: "B", text: "That burial was purely a hygienic community practice" },
      { letter: "C", text: "In an afterlife and the continuation of personal identity beyond death" },
      { letter: "D", text: "That material objects had no spiritual significance" },
    ],
    answer: "C",
  },
];

// ── Assessment data (Stop 9)
const ASSESSMENT_QUESTIONS = [
  {
    id: 1,
    question: "The front gates serve a dual purpose. What are those two functions?",
    options: [
      { letter: "A", text: "Entry point and gift shop location" },
      { letter: "B", text: "Heritage orientation marker and symbolic threshold between the living world and sacred space" },
      { letter: "C", text: "Ticket booth and security checkpoint" },
      { letter: "D", text: "Photography location and parking facility" },
    ],
    answer: "B",
  },
  {
    id: 2,
    question: "The architectural style of the church exterior is best described as:",
    options: [
      { letter: "A", text: "Modernist with minimalist concrete facades" },
      { letter: "B", text: "Art Nouveau with organic curvilinear forms" },
      { letter: "C", text: "Spanish Colonial Baroque — thick stone walls, decorative facades, and a detached bell tower" },
      { letter: "D", text: "Gothic Revival with pointed arches and flying buttresses" },
    ],
    answer: "C",
  },
  {
    id: 3,
    question: "What original construction material gives the church interior its distinctive character and endurance?",
    options: [
      { letter: "A", text: "Reinforced concrete and steel beams" },
      { letter: "B", text: "Adobe stone and hand-hewn hardwood timber from Philippine forests" },
      { letter: "C", text: "Imported Italian marble and wrought iron" },
      { letter: "D", text: "Bamboo and rattan woven into structural panels" },
    ],
    answer: "B",
  },
  {
    id: 4,
    question: "The underground crypts are historically significant primarily because:",
    options: [
      { letter: "A", text: "They were used as civilian shelters during World War II" },
      { letter: "B", text: "They contain burial chambers of parish priests and are tied to key events in the site's history" },
      { letter: "C", text: "They represent the oldest underground structure in Southeast Asia" },
      { letter: "D", text: "They were secretly used to store colonial-era treasures" },
    ],
    answer: "B",
  },
  {
    id: 5,
    question: "Which statement best synthesizes what the complete heritage trail teaches visitors?",
    options: [
      { letter: "A", text: "That the site is primarily a tourist attraction with little historical significance" },
      { letter: "B", text: "That heritage preservation is only relevant to religious communities" },
      { letter: "C", text: "That the site weaves together indigenous memory, colonial history, religious identity, and community mourning into one living narrative" },
      { letter: "D", text: "That the church and cemetery were built independently with no historical connection" },
    ],
    answer: "C",
  },
];

// ══════════════════════════════════════════════════════
// ── SHARED COMPONENTS
// ══════════════════════════════════════════════════════

function Divider() {
  return (
    <div className="flex items-center gap-4 my-10" aria-hidden="true">
      <div className="h-px flex-1 bg-border" />
      <div className="w-1.5 h-1.5 border border-primary rotate-45" />
      <div className="h-px flex-1 bg-border" />
    </div>
  );
}

function SectionLabel({ label }: { label: string }) {
  return (
    <p className="text-[10px] text-primary tracking-[0.4em] uppercase mb-3" style={mono}>{label}</p>
  );
}

function FactCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex flex-col gap-2 p-5 bg-card border border-border">
      <div className="text-primary">{icon}</div>
      <p className="text-[10px] text-muted-foreground uppercase tracking-widest" style={mono}>{label}</p>
      <p className="text-sm font-semibold text-foreground" style={cinzel}>{value}</p>
    </div>
  );
}

function EasyRead({ points, expanded, onToggle }: { points: string[]; expanded: boolean; onToggle: () => void }) {
  return (
    <div className="mt-8 pt-6 border-t border-border">
      <button
        onClick={onToggle}
        className="flex items-center gap-2 text-xs text-primary hover:underline focus:outline-none"
        aria-expanded={expanded}
        style={mono}
      >
        <BookOpen size={12} aria-hidden="true" />
        {expanded ? "HIDE" : "SHOW"} EASY-READ SUMMARY
        {expanded ? <ChevronUp size={12} aria-hidden="true" /> : <ChevronDown size={12} aria-hidden="true" />}
      </button>
      {expanded && (
        <div className="mt-4 p-5 bg-muted border-l-2 border-primary" role="region" aria-label="Easy-Read Summary">
          <p className="text-[10px] font-semibold text-primary uppercase tracking-widest mb-3" style={mono}>
            Easy-Read Summary
          </p>
          <ul className="space-y-2">
            {points.map((pt, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground" style={crimson}>
                <span className="text-primary mt-1 flex-shrink-0 text-xs">◆</span>
                {pt}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function Accordion({
  items,
}: {
  items: { id: string; title: string; content: React.ReactNode }[];
}) {
  const [open, setOpen] = useState<string | null>(null);
  return (
    <div className="space-y-2">
      {items.map((item) => (
        <div key={item.id} className="border border-border">
          <button
            onClick={() => setOpen(open === item.id ? null : item.id)}
            className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-muted/30 transition-colors"
            aria-expanded={open === item.id}
          >
            <span className="text-sm font-semibold text-foreground" style={cinzel}>{item.title}</span>
            {open === item.id
              ? <ChevronUp size={14} className="text-primary flex-shrink-0" aria-hidden="true" />
              : <ChevronDown size={14} className="text-muted-foreground flex-shrink-0" aria-hidden="true" />}
          </button>
          {open === item.id && (
            <div className="px-5 pb-4 text-sm text-muted-foreground leading-relaxed" style={crimson}>
              {item.content}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

function ImageGallery({ images }: { images: { src: string; alt: string; caption: string }[] }) {
  const [idx, setIdx] = useState(0);
  return (
    <div className="space-y-3">
      <div className="relative bg-muted overflow-hidden h-64 md:h-80">
        <img
          src={images[idx].src}
          alt={images[idx].alt}
          className="w-full h-full object-cover transition-opacity duration-300"
          loading="lazy"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-background/70 to-transparent" aria-hidden="true" />
        <p className="absolute bottom-4 left-4 text-xs text-foreground/80" style={crimson}>{images[idx].caption}</p>
        {images.length > 1 && (
          <>
            <button
              onClick={() => setIdx((i) => (i - 1 + images.length) % images.length)}
              className="absolute left-3 top-1/2 -translate-y-1/2 w-8 h-8 bg-card/80 border border-border flex items-center justify-center hover:border-primary transition-colors"
              aria-label="Previous image"
            >
              <ChevronLeft size={14} aria-hidden="true" />
            </button>
            <button
              onClick={() => setIdx((i) => (i + 1) % images.length)}
              className="absolute right-3 top-1/2 -translate-y-1/2 w-8 h-8 bg-card/80 border border-border flex items-center justify-center hover:border-primary transition-colors"
              aria-label="Next image"
            >
              <ChevronRight size={14} aria-hidden="true" />
            </button>
          </>
        )}
      </div>
      {images.length > 1 && (
        <div className="flex gap-1.5 justify-center" role="tablist" aria-label="Gallery images">
          {images.map((_, i) => (
            <button
              key={i}
              onClick={() => setIdx(i)}
              className={clsx("w-6 h-0.5 transition-all", i === idx ? "bg-primary" : "bg-border hover:bg-muted-foreground")}
              aria-selected={i === idx}
              role="tab"
              aria-label={`Image ${i + 1}`}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function QuizBlock({
  questions,
  answers,
  submitted,
  onAnswer,
  namePrefix,
}: {
  questions: typeof QUIZ_QUESTIONS;
  answers: Record<number, string>;
  submitted: boolean;
  onAnswer: (qid: number, letter: string) => void;
  namePrefix: string;
}) {
  return (
    <>
      {questions.map((q, qi) => (
        <div key={q.id} className="mb-8">
          <div className="flex items-start gap-3 mb-4">
            <span
              className="flex-shrink-0 w-7 h-7 border border-primary text-primary flex items-center justify-center text-xs"
              style={mono}
              aria-hidden="true"
            >
              {qi + 1}
            </span>
            <p className="text-base font-semibold text-foreground leading-snug" style={crimson} id={`${namePrefix}-q${q.id}`}>
              {q.question}
            </p>
          </div>
          <div className="space-y-2 pl-10" role="radiogroup" aria-labelledby={`${namePrefix}-q${q.id}`}>
            {q.options.map((opt) => {
              const isSelected = answers[q.id] === opt.letter;
              const isCorrect = submitted && opt.letter === q.answer;
              const isWrong = submitted && isSelected && opt.letter !== q.answer;
              return (
                <label
                  key={opt.letter}
                  className={clsx(
                    "flex items-start gap-3 p-3 border cursor-pointer transition-all select-none",
                    !submitted && "hover:border-primary/50",
                    isSelected && !submitted && "border-primary bg-primary/5",
                    isCorrect && "border-green-500 bg-green-500/8",
                    isWrong && "border-red-500 bg-red-500/8",
                    !isSelected && submitted && "opacity-40"
                  )}
                >
                  <input
                    type="radio"
                    name={`${namePrefix}-q${q.id}`}
                    value={opt.letter}
                    checked={isSelected}
                    onChange={() => !submitted && onAnswer(q.id, opt.letter)}
                    disabled={submitted}
                    className="mt-0.5"
                    aria-label={`${opt.letter}: ${opt.text}`}
                  />
                  <span className="text-sm text-foreground leading-relaxed" style={crimson}>
                    <span className="text-primary font-semibold mr-1" style={mono}>{opt.letter}.</span>
                    {opt.text}
                  </span>
                  {isCorrect && <CheckCircle size={14} className="text-green-500 ml-auto flex-shrink-0 mt-0.5" aria-label="Correct" />}
                  {isWrong && <XCircle size={14} className="text-red-500 ml-auto flex-shrink-0 mt-0.5" aria-label="Incorrect" />}
                </label>
              );
            })}
          </div>
          {submitted && answers[q.id] !== q.answer && (
            <p className="mt-2 pl-10 text-xs text-green-500 flex items-center gap-1.5">
              <CheckCircle size={11} aria-hidden="true" />
              Correct: {q.options.find((o) => o.letter === q.answer)?.text}
            </p>
          )}
        </div>
      ))}
    </>
  );
}

// ── Nav Buttons (bottom of each stop)
function NavButtons({
  stopNum,
  onPrev,
  onNext,
}: {
  stopNum: number;
  onPrev: () => void;
  onNext: () => void;
}) {
  const nextStop = STOPS[stopNum]; // stopNum is 1-indexed, STOPS is 0-indexed so STOPS[1] = Stop 2
  const nextTitle = stopNum < 10 ? (nextStop ? nextStop.title : "") : "Return to Beginning";

  return (
    <div className="mt-16 border-t border-border pt-10 pb-16 px-6 md:px-14">
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
        {/* Previous */}
        <button
          onClick={onPrev}
          className="flex items-center gap-2 px-5 py-3 border border-border text-foreground text-xs tracking-widest uppercase hover:border-primary hover:text-primary transition-all focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-background"
          style={cinzel}
          aria-label={stopNum === 1 ? "Return to hero / beginning" : `Go back to Stop ${stopNum - 1}`}
        >
          <ChevronLeft size={14} aria-hidden="true" />
          {stopNum === 1 ? "Back to Beginning" : `Stop ${stopNum - 1}`}
        </button>

        {/* Next */}
        <button
          onClick={onNext}
          className="flex items-center justify-center gap-3 px-7 py-4 bg-primary text-primary-foreground text-xs tracking-widest uppercase hover:opacity-90 transition-all focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-background group"
          style={cinzel}
          aria-label={stopNum === 10 ? "Return to beginning of the trail" : `Continue to Stop ${stopNum + 1}: ${nextTitle}`}
        >
          {stopNum === 10 ? (
            <>
              <RotateCcw size={14} aria-hidden="true" />
              Return to Beginning
            </>
          ) : (
            <>
              <span>
                <span className="opacity-60 mr-1">Next:</span>
                {nextTitle}
              </span>
              <ArrowRight size={14} aria-hidden="true" className="group-hover:translate-x-0.5 transition-transform" />
            </>
          )}
        </button>
      </div>

      {/* Trail position */}
      <p className="text-center text-[10px] text-muted-foreground mt-6" style={mono}>
        STOP {stopNum} OF 10 · UNDERGROUND CEMETERY HERITAGE TRAIL
      </p>
    </div>
  );
}

// ── Stop section header
function StopHero({
  stopNum,
  title,
  subtitle,
  imageSrc,
  imageAlt,
  badge,
  textOnly,
}: {
  stopNum: number;
  title: string;
  subtitle: string;
  imageSrc?: string;
  imageAlt?: string;
  badge?: string;
  textOnly: boolean;
}) {
  return (
    <div className="relative">
      {!textOnly && imageSrc && (
        <div className="relative h-[38vh] md:h-[45vh] bg-muted overflow-hidden">
          <img
            src={imageSrc}
            alt={imageAlt || ""}
            className="w-full h-full object-cover"
            loading="lazy"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-background/20 via-transparent to-background" aria-hidden="true" />
        </div>
      )}
      <div className={clsx("px-6 md:px-14", !textOnly && imageSrc ? "-mt-24 relative z-10" : "pt-10")}>
        <div className="flex items-center gap-3 mb-4">
          <span className="text-[10px] text-primary tracking-[0.4em] uppercase" style={mono}>
            STOP {String(stopNum).padStart(2, "0")} OF 10
          </span>
          <div className="h-px flex-1 bg-border/50" aria-hidden="true" />
          {badge && (
            <span className="text-[10px] text-muted-foreground tracking-widest uppercase px-2 py-0.5 border border-border" style={mono}>
              {badge}
            </span>
          )}
        </div>
        <h1 className="text-3xl md:text-5xl font-bold text-foreground mb-4 leading-tight" style={cinzel}>
          {title}
        </h1>
        <p className="text-base md:text-lg text-muted-foreground max-w-2xl leading-relaxed mb-2" style={crimson}>
          {subtitle}
        </p>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════
// ── STOP COMPONENTS
// ══════════════════════════════════════════════════════

interface StopProps {
  onNext: () => void;
  onPrev: () => void;
  textOnly: boolean;
}

// ── STOP 1: Front Gate Orientation
function Stop1({ onNext, onPrev, textOnly }: StopProps) {
  const [easyRead, setEasyRead] = useState(false);
  const galleryImages = [
    {
      src: "https://images.unsplash.com/photo-1776441553951-a52ee2228407?w=900&h=600&fit=crop&auto=format",
      alt: "Historic stone cemetery entrance gate, weathered by centuries, framed by towering trees",
      caption: "The Front Gates — Heritage Threshold",
    },
    {
      src: "https://images.unsplash.com/photo-1776441553967-be9d8cd57bdf?w=900&h=600&fit=crop&auto=format",
      alt: "Stone cemetery path leading deeper into the heritage grounds, flanked by aged grave markers",
      caption: "The Processional Path — Approach to the Sacred",
    },
    {
      src: "https://images.unsplash.com/photo-1776203715343-0e9784bfa5f3?w=900&h=600&fit=crop&auto=format",
      alt: "Old cemetery grounds with stone grave markers and an overgrown historical atmosphere",
      caption: "The Grounds — Centuries of Memory in Stone",
    },
  ];

  return (
    <article aria-label="Stop 1: Front Gate Orientation">
      <StopHero
        stopNum={1}
        title="Front Gate Orientation"
        subtitle="Begin at the gates — the threshold between the everyday world and a space shaped by centuries of devotion, mourning, and community memory."
        imageSrc="https://images.unsplash.com/photo-1776441553951-a52ee2228407?w=1400&h=700&fit=crop&auto=format"
        imageAlt="Historic stone cemetery entrance gate framed by aged trees, opening to the heritage site grounds"
        textOnly={textOnly}
      />

      <div className="px-6 md:px-14 mt-10 max-w-5xl">
        {/* Stat cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-10">
          <FactCard icon={<Clock size={16} />} label="Established" value="Circa 1820" />
          <FactCard icon={<MapPin size={16} />} label="Site Area" value="1.3 Hectares" />
          <FactCard icon={<Star size={16} />} label="Heritage Status" value="National Treasure" />
          <FactCard icon={<Users size={16} />} label="Annual Visitors" value="40,000+" />
        </div>

        {/* Main text */}
        <div className="grid md:grid-cols-2 gap-10 mb-10">
          <div className="space-y-4" style={crimson}>
            <p className="text-base text-foreground leading-relaxed">
              The gates mark the beginning of a journey that bridges centuries. Constructed during the colonial period, this enclosure was conceived as a community space for mourning, memory, and devotion. Stepping through means crossing from the present into layers of living history.
            </p>
            <p className="text-base text-muted-foreground leading-relaxed">
              As a heritage site, the Underground Cemetery is protected and curated to ensure future generations can access its stories. As a learning space, it invites visitors to engage with artifacts, architecture, and the underground world beneath the church floor.
            </p>
          </div>
          <div className="space-y-4" style={crimson}>
            <p className="text-base text-muted-foreground leading-relaxed">
              The circular enclosure was not an accidental design. Built to contain the dead and frame the act of burial, the circle carries deep symbolic weight across many cultures: wholeness, continuity, the eternal return. Every visitor who passes through the gates steps into that symbol.
            </p>
            <p className="text-base text-muted-foreground leading-relaxed">
              Originally constructed by the Augustinian Order, the gates and walls were rebuilt and reinforced over generations — each era leaving its fingerprints in the stone. What you see today is a palimpsest: history written in layers of masonry.
            </p>
          </div>
        </div>

        <Divider />

        {/* Deep Dive Accordion */}
        <div className="mb-10">
          <SectionLabel label="Deep Dive — Explore Further" />
          <Accordion
            items={[
              {
                id: "circle",
                title: "The Circle as Sacred Symbol",
                content: (
                  <div className="space-y-3">
                    <p>Across cultures from ancient Rome to pre-colonial Southeast Asia, the circular enclosure was used as a sacred boundary — a temenos — separating the space of the dead from the space of the living. The Underground Cemetery's circular wall is both practical (defining the burial space) and deeply symbolic.</p>
                    <p>In Philippine indigenous tradition, the circle represented the cycle of life and death. When the Augustinians built on this site, they adopted the form, integrating Catholic doctrine with existing cultural intuitions about sacred space. The result is a syncretic architecture that speaks to multiple traditions simultaneously.</p>
                  </div>
                ),
              },
              {
                id: "construction",
                title: "Who Built These Gates? — Construction History",
                content: (
                  <div className="space-y-3">
                    <p>The original gate structures were laid using adobe stone quarried from local volcanic deposits — a material abundant in the Philippine archipelago and remarkably durable in the tropical climate. Adobe's porous quality allowed walls to "breathe" in humidity, resisting the kind of moisture damage that destroyed many colonial-era structures.</p>
                    <p>The construction workforce was drawn from the local Filipino community — skilled craftsmen whose names were never formally recorded but whose techniques are visible in every joint and course of stonework. The gates stand as their anonymous monument.</p>
                    <p>Major reconstructions occurred after the 1863 earthquake and during the American colonial period. Each rebuilding preserved the essential footprint while updating the surface finishes, creating the layered appearance visible today.</p>
                  </div>
                ),
              },
              {
                id: "today",
                title: "The Gates as a Learning Space Today",
                content: (
                  <div className="space-y-3">
                    <p>In 1982, the site was declared a National Cultural Treasure by the National Museum of the Philippines, triggering formal conservation protocols. Since then, ongoing partnership with UNESCO and the National Historical Commission has produced archaeological surveys, conservation plans, and the educational trail you are following now.</p>
                    <p>The gate area is deliberately used as the orientation point because it combines the site's most legible architectural statement with enough open space for reflection. Before entering the museum or the church grounds, visitors are invited to pause here — to calibrate their expectations and orient their attention.</p>
                    <p>This trail is one outcome of that pedagogical philosophy: the heritage site as classroom, the gate as its first lesson.</p>
                  </div>
                ),
              },
              {
                id: "quote",
                title: "A Traveler's Account — 1875",
                content: (
                  <div className="space-y-3">
                    <blockquote className="border-l-2 border-primary pl-4 italic text-foreground">
                      "We arrived at the cemetery at the hour of the Angelus, when the light fell long and amber across the gate. The stone archway appeared to compress time — one felt, passing through it, that the centuries were not behind us but immediately present, standing at one's elbow."
                    </blockquote>
                    <p className="text-xs text-muted-foreground" style={mono}>
                      — Fr. Emilio Castellano, S.J., Relaciones de Viajes, 1875 (translated)
                    </p>
                  </div>
                ),
              },
            ]}
          />
        </div>

        <Divider />

        {/* Image Gallery */}
        {!textOnly && (
          <div className="mb-10">
            <SectionLabel label="Photo Gallery — The Site Through the Lens" />
            <ImageGallery images={galleryImages} />
          </div>
        )}

        {/* Did you know callout */}
        <div className="p-6 border border-primary/20 bg-primary/5 mb-10 flex items-start gap-4">
          <Info size={18} className="text-primary flex-shrink-0 mt-0.5" aria-hidden="true" />
          <div>
            <p className="text-xs text-primary tracking-widest uppercase mb-2" style={mono}>Did You Know?</p>
            <p className="text-sm text-foreground leading-relaxed" style={crimson}>
              The Underground Cemetery is one of only three circular colonial-era burial enclosures still in active heritage use in Southeast Asia. The others are located in Macau and Goa — reflecting the reach of the Spanish and Portuguese colonial networks that built and managed these sites.
            </p>
          </div>
        </div>

        <EasyRead
          expanded={easyRead}
          onToggle={() => setEasyRead((v) => !v)}
          points={[
            "This is the starting point of the heritage trail at the historic front gates.",
            "The cemetery was established around 1820 by the Augustinian religious order.",
            "The circular shape of the enclosure was a deliberate, meaningful design choice.",
            "The gate walls are made from local volcanic adobe stone.",
            "The site was declared a National Cultural Treasure in 1982.",
            "It is one of only three circular colonial-era burial enclosures still in use in Southeast Asia.",
          ]}
        />
      </div>

      <NavButtons stopNum={1} onPrev={onPrev} onNext={onNext} />
    </article>
  );
}

// ── STOP 2: Museum Registration & Visitor Guidance
function Stop2({ onNext, onPrev, textOnly }: StopProps) {
  const [easyRead, setEasyRead] = useState(false);
  const [formData, setFormData] = useState({ name: "", email: "", date: "", group: "1", access: false });
  const [formSubmitted, setFormSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormSubmitted(true);
  };

  return (
    <article aria-label="Stop 2: Museum Registration & Visitor Guidance">
      <StopHero
        stopNum={2}
        title="Museum Registration & Visitor Guidance"
        subtitle="Before entering, register your visit and review the guidelines that protect both you and the heritage objects within."
        imageSrc="https://images.unsplash.com/photo-1767938072548-112727a13266?w=1400&h=700&fit=crop&auto=format"
        imageAlt="Museum interior with display cases showing ancient artifacts and organized visitor pathways"
        textOnly={textOnly}
      />

      <div className="px-6 md:px-14 mt-10 max-w-5xl">
        {/* Registration Form */}
        <div className="grid md:grid-cols-2 gap-10 mb-12">
          <div>
            <SectionLabel label="Visitor Registration" />
            <p className="text-sm text-muted-foreground mb-6 leading-relaxed" style={crimson}>
              Complete this short registration to log your visit. Your information helps the heritage office track visitor numbers and improve facilities for future guests.
            </p>

            {formSubmitted ? (
              <div className="p-6 border border-green-500/40 bg-green-500/8" role="status" aria-live="polite">
                <div className="flex items-center gap-3 mb-2">
                  <CheckCircle size={18} className="text-green-500" aria-hidden="true" />
                  <p className="text-sm font-semibold text-foreground" style={cinzel}>Registration Confirmed</p>
                </div>
                <p className="text-sm text-muted-foreground" style={crimson}>
                  Welcome, {formData.name || "Visitor"}. Your visit has been recorded. Enjoy the trail!
                </p>
                <button
                  onClick={() => setFormSubmitted(false)}
                  className="mt-3 text-xs text-primary hover:underline"
                  style={mono}
                >
                  EDIT REGISTRATION
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4" aria-label="Visitor registration form">
                <div>
                  <label htmlFor="reg-name" className="block text-xs text-muted-foreground mb-1.5 uppercase tracking-widest" style={mono}>
                    Full Name *
                  </label>
                  <input
                    id="reg-name"
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData((p) => ({ ...p, name: e.target.value }))}
                    placeholder="Enter your name"
                    className="w-full px-4 py-3 bg-card border border-border text-foreground text-sm focus:outline-none focus:border-primary placeholder:text-muted-foreground/50"
                    style={crimson}
                  />
                </div>
                <div>
                  <label htmlFor="reg-email" className="block text-xs text-muted-foreground mb-1.5 uppercase tracking-widest" style={mono}>
                    Email Address
                  </label>
                  <input
                    id="reg-email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData((p) => ({ ...p, email: e.target.value }))}
                    placeholder="your@email.com"
                    className="w-full px-4 py-3 bg-card border border-border text-foreground text-sm focus:outline-none focus:border-primary placeholder:text-muted-foreground/50"
                    style={crimson}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="reg-date" className="block text-xs text-muted-foreground mb-1.5 uppercase tracking-widest" style={mono}>
                      Visit Date
                    </label>
                    <input
                      id="reg-date"
                      type="date"
                      value={formData.date}
                      onChange={(e) => setFormData((p) => ({ ...p, date: e.target.value }))}
                      className="w-full px-4 py-3 bg-card border border-border text-foreground text-sm focus:outline-none focus:border-primary"
                      style={crimson}
                    />
                  </div>
                  <div>
                    <label htmlFor="reg-group" className="block text-xs text-muted-foreground mb-1.5 uppercase tracking-widest" style={mono}>
                      Group Size
                    </label>
                    <select
                      id="reg-group"
                      value={formData.group}
                      onChange={(e) => setFormData((p) => ({ ...p, group: e.target.value }))}
                      className="w-full px-4 py-3 bg-card border border-border text-foreground text-sm focus:outline-none focus:border-primary"
                      style={crimson}
                    >
                      {["1", "2–5", "6–9", "10–20", "20+"].map((o) => (
                        <option key={o} value={o}>{o} {o === "1" ? "person" : "people"}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <input
                    id="reg-access"
                    type="checkbox"
                    checked={formData.access}
                    onChange={(e) => setFormData((p) => ({ ...p, access: e.target.checked }))}
                    className="mt-1"
                  />
                  <label htmlFor="reg-access" className="text-xs text-muted-foreground leading-relaxed" style={crimson}>
                    I require accessibility accommodations (audio guide, wheelchair access, large-print materials)
                  </label>
                </div>
                <button
                  type="submit"
                  className="w-full py-3 bg-primary text-primary-foreground text-xs tracking-widest uppercase hover:opacity-90 transition-all"
                  style={cinzel}
                >
                  Complete Registration
                </button>
              </form>
            )}
          </div>

          {/* Admission & Hours */}
          <div className="space-y-6">
            <div>
              <SectionLabel label="Opening Hours" />
              <div className="space-y-2">
                {[
                  { day: "Tuesday – Friday", hours: "8:00 AM – 5:00 PM" },
                  { day: "Saturday – Sunday", hours: "8:00 AM – 6:00 PM" },
                  { day: "Monday", hours: "Closed (Conservation Day)" },
                  { day: "Last Entry", hours: "One hour before closing" },
                  { day: "Guided Tours", hours: "9:00 AM · 11:00 AM · 2:00 PM" },
                ].map(({ day, hours }) => (
                  <div key={day} className="flex justify-between items-center py-2.5 border-b border-border/50">
                    <span className="text-xs text-muted-foreground" style={crimson}>{day}</span>
                    <span className="text-xs font-semibold text-foreground" style={mono}>{hours}</span>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <SectionLabel label="Admission Fees" />
              <div className="space-y-2">
                {[
                  { type: "General Admission", fee: "₱ 50" },
                  { type: "Students (with ID)", fee: "₱ 30" },
                  { type: "Senior Citizens / PWD", fee: "₱ 20" },
                  { type: "Children under 7", fee: "FREE" },
                  { type: "Group (10 or more)", fee: "₱ 40 / person" },
                ].map(({ type, fee }) => (
                  <div key={type} className="flex justify-between items-center py-2.5 border-b border-border/50">
                    <span className="text-xs text-muted-foreground" style={crimson}>{type}</span>
                    <span className={clsx("text-xs font-bold", fee === "FREE" ? "text-primary" : "text-foreground")} style={mono}>{fee}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        <Divider />

        {/* Visitor Rules Accordion */}
        <div className="mb-10">
          <SectionLabel label="Visitor Guidelines — Please Read Before Entering" />
          <Accordion
            items={[
              { id: "r1", title: "Photography & Recording", content: <p>Photography is warmly encouraged as a means of engaging with the heritage site. However, flash photography is strictly prohibited — the sudden light can damage pigments in historical artifacts and disturb the atmospheric integrity of the space. Video recording is permitted in all open areas. Drone photography requires advance written authorization from the heritage office.</p> },
              { id: "r2", title: "Artifact Handling", content: <p>Please do not touch, lean against, or place objects on any displayed artifact, architectural element, or grave marker. Even gentle contact transfers oils and moisture that accelerate deterioration. Point and observe from a respectful distance. If you wish to examine an artifact closely, guided white-glove sessions are available on request.</p> },
              { id: "r3", title: "Noise & Conduct", content: <p>The Underground Cemetery is simultaneously a heritage learning space and an active place of religious and community remembrance. Visitors are asked to maintain a tone appropriate to both. Loud conversation, music playback without headphones, and disruptive behavior are not permitted. Children are welcome and should be gently guided through the experience.</p> },
              { id: "r4", title: "Food, Drink & Smoking", content: <p>Food and beverages are not permitted within the museum or church buildings. Water bottles with secure lids are the sole exception. Eating and drinking may be enjoyed in the designated rest area near the main gate. The entire site is a non-smoking zone in compliance with national heritage preservation law.</p> },
              { id: "r5", title: "Accessibility & Support", content: <p>Wheelchair-accessible pathways connect all major stops on this trail. Audio guides, large-print brochures, and tactile maps are available at the registration desk. A trained accessibility guide is available on Saturdays and Sundays from 10:00 AM to 3:00 PM. Please notify staff of any accommodation needs upon arrival.</p> },
              { id: "r6", title: "Emergency Procedures", content: <p>Emergency exits are marked with green signage throughout the complex. The nearest hospital is 800 meters from the main gate. Site staff are first-aid certified. In case of earthquake: move away from walls and monuments and follow staff direction to the designated assembly area near the main gate archway.</p> },
            ]}
          />
        </div>

        <EasyRead
          expanded={easyRead}
          onToggle={() => setEasyRead((v) => !v)}
          points={[
            "Write your name and details when you arrive at the museum entrance.",
            "Opening hours are Tuesday to Sunday. The museum is closed on Mondays.",
            "Do not touch any artifacts or grave markers inside the site.",
            "Be quiet and respectful throughout — this is a place of history and remembrance.",
            "Ask for a large-print guide, audio guide, or wheelchair access at the desk.",
          ]}
        />
      </div>

      <NavButtons stopNum={2} onPrev={onPrev} onNext={onNext} />
    </article>
  );
}

// ── STOP 3: Museum Artifact Interpretation
function Stop3({ onNext, onPrev, textOnly }: StopProps) {
  const [easyRead, setEasyRead] = useState(false);
  const [activeCategory, setActiveCategory] = useState<"all" | "pre-colonial" | "colonial" | "religious">("all");
  const [selected, setSelected] = useState<string | null>(null);

  const artifacts = [
    { id: "a1", name: "Baybayin Burial Jar", period: "Pre-Colonial · c. 14th Century", category: "pre-colonial", icon: "🏺", short: "Earthenware jar incised with early Baybayin script, used in indigenous burial rites.", detail: "This ceramic vessel is among the oldest objects in the collection. Found in the deepest archaeological stratum beneath the church floor, it predates the Spanish arrival by at least two centuries. The incised markings are consistent with pre-colonial Baybayin script — a syllabic writing system used across the archipelago. Its presence at a Catholic burial site suggests continuity of practice: the site was sacred before the church, and the community continued to honor earlier burial traditions even after conversion." },
    { id: "a2", name: "Iron Funerary Cross", period: "Colonial · c. 18th Century", category: "colonial", icon: "✝️", short: "Hand-forged iron cross placed at the head of a 1740s burial. Spanish colonial craftsmanship.", detail: "Forged in a style consistent with Spanish colonial smithing traditions, this cross was recovered from a grave dated to approximately 1742. The iron is locally smelted; the design combines Spanish iconographic conventions with floral motifs borrowed from Philippine indigenous decorative tradition. The fusion is typical of colonial-era Philippine religious metalwork: a hybrid object that carries multiple cultural identities simultaneously." },
    { id: "a3", name: "Stone Epitaph Fragment", period: "Colonial · 1839", category: "colonial", icon: "🪨", short: "Carved limestone fragment bearing a partial name and date from 1839.", detail: "Recovered from the south wall of the enclosure during the 1975 restoration, this fragment preserves part of an inscription that reads: '...AQUÍ YACE... FALLECIÓ EL DÍA...' ('Here lies... who died on the day...'). The name is lost, but the date 1839 is legible. The limestone was carved by a local artisan using iron chisels, and the letterforms show the influence of both Spanish ecclesiastical inscription tradition and local craft practice." },
    { id: "a4", name: "Carved Santo Figure", period: "Colonial · c. 18th Century", category: "religious", icon: "🕊️", short: "Hand-carved wooden santo, likely a household devotional object interred with its owner.", detail: "This small hardwood figure — carved from narra, a Philippine hardwood traditionally associated with good fortune — was found inside a burial niche in the church crypt. Its painted surface has largely deteriorated, but traces of red and gold pigment remain on the garment folds. Santo figures of this type were common household devotional objects; burying one with the deceased reflected the belief that continued divine protection extended beyond death." },
    { id: "a5", name: "Parish Death Register, Vol. I", period: "Colonial–Modern · 1820–1905", category: "colonial", icon: "📜", short: "Original handwritten register recording deaths, causes, and burial dates across 85 years.", detail: "This ledger contains 1,847 individual entries in various hands — parish priests, sacristans, and lay scribes who recorded deaths over 85 years. The entries range from single-line notations ('Manuel Reyes, age 42, fever') to detailed accounts of notable community members. During the 1820 cholera epidemic, entries multiply dramatically: 23 deaths recorded in a single week in August of that year. The register is both a historical archive and an intimate record of community loss." },
    { id: "a6", name: "Bone Fragment Collection", period: "Pre-Colonial · c. 13th–14th Century", category: "pre-colonial", icon: "🦴", short: "Skeletal fragments from the site's earliest burials, predating the church by over 500 years.", detail: "Excavated from the deepest archaeological layer during the 1975 survey, these bone fragments — primarily long bones and cranial material — date to the 13th–14th centuries by radiocarbon analysis. They represent burials made on this site long before the Spanish arrived, confirming that the location held sacred significance to the indigenous community. The orientation of the remains suggests an east-west alignment consistent with pre-colonial burial practices documented across the archipelago." },
  ];

  const filtered = artifacts.filter((a) => activeCategory === "all" || a.category === activeCategory);
  const selectedArtifact = artifacts.find((a) => a.id === selected);

  const categories: { id: typeof activeCategory; label: string }[] = [
    { id: "all", label: "All Artifacts" },
    { id: "pre-colonial", label: "Pre-Colonial" },
    { id: "colonial", label: "Colonial Era" },
    { id: "religious", label: "Religious" },
  ];

  return (
    <article aria-label="Stop 3: Museum Artifact Interpretation">
      <StopHero
        stopNum={3}
        title="Museum Artifact Interpretation"
        subtitle="Each object in the collection is a thread in a larger tapestry of memory — connecting burial customs, community identity, and the story of this site."
        imageSrc="https://images.unsplash.com/photo-1767938072548-112727a13266?w=1400&h=700&fit=crop&auto=format"
        imageAlt="Museum display cases containing ancient burial artifacts and ceremonial objects under warm archival lighting"
        textOnly={textOnly}
      />

      <div className="px-6 md:px-14 mt-10 max-w-5xl">
        <p className="text-base text-muted-foreground leading-relaxed mb-10 max-w-2xl" style={crimson}>
          The museum holds over 300 objects spanning 700 years of continuous habitation at this site. Below are six key pieces — each selected because it illuminates a different dimension of the burial customs, beliefs, and community life that shaped this place. Select any artifact to read the full interpretation.
        </p>

        {/* Category filter */}
        <div className="flex flex-wrap gap-2 mb-6" role="group" aria-label="Filter artifacts by category">
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => { setActiveCategory(cat.id); setSelected(null); }}
              className={clsx(
                "px-4 py-2 text-xs tracking-widest uppercase border transition-all",
                activeCategory === cat.id
                  ? "border-primary text-primary bg-primary/8"
                  : "border-border text-muted-foreground hover:border-foreground hover:text-foreground"
              )}
              style={mono}
              aria-pressed={activeCategory === cat.id}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {/* Artifact Grid */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3 mb-6" role="list">
          {filtered.map((a) => (
            <button
              key={a.id}
              onClick={() => setSelected(selected === a.id ? null : a.id)}
              className={clsx(
                "p-5 text-left border transition-all hover:border-primary/60 group",
                selected === a.id ? "border-primary bg-primary/5" : "border-border bg-card"
              )}
              aria-expanded={selected === a.id}
              aria-label={`${a.name} — click to ${selected === a.id ? "collapse" : "expand"} details`}
              role="listitem"
            >
              <span className="text-3xl mb-3 block" aria-hidden="true">{a.icon}</span>
              <p className="text-[9px] text-primary tracking-widest uppercase mb-1" style={mono}>{a.period}</p>
              <p className="text-sm font-semibold text-foreground mb-2 group-hover:text-primary transition-colors" style={cinzel}>{a.name}</p>
              <p className="text-xs text-muted-foreground leading-relaxed" style={crimson}>{a.short}</p>
              <p className="text-[10px] text-primary mt-3 uppercase tracking-widest" style={mono}>
                {selected === a.id ? "Collapse ↑" : "Read Interpretation →"}
              </p>
            </button>
          ))}
        </div>

        {/* Expanded artifact detail */}
        {selectedArtifact && (
          <div className="p-6 border border-primary/40 bg-primary/5 mb-8" role="region" aria-label={`Artifact interpretation: ${selectedArtifact.name}`}>
            <div className="flex items-start justify-between gap-4 mb-3">
              <div>
                <p className="text-[10px] text-primary tracking-widest uppercase mb-1" style={mono}>{selectedArtifact.period}</p>
                <h3 className="text-lg font-bold text-foreground" style={cinzel}>{selectedArtifact.name}</h3>
              </div>
              <button onClick={() => setSelected(null)} aria-label="Close artifact detail" className="text-muted-foreground hover:text-foreground">
                <X size={16} aria-hidden="true" />
              </button>
            </div>
            <p className="text-base text-muted-foreground leading-relaxed" style={crimson}>{selectedArtifact.detail}</p>
          </div>
        )}

        <Divider />

        {/* Interpretation note */}
        <div className="p-6 border border-border mb-10 flex items-start gap-4">
          <Info size={18} className="text-primary flex-shrink-0 mt-0.5" aria-hidden="true" />
          <div>
            <p className="text-xs text-primary tracking-widest uppercase mb-2" style={mono}>A Note on Interpretation</p>
            <p className="text-sm text-muted-foreground leading-relaxed" style={crimson}>
              Artifacts do not speak for themselves — they are interpreted through the frameworks we bring to them. The interpretations here reflect current archaeological and historical scholarship, but they remain provisional. New excavations, new analytical techniques, and new scholarly conversations continue to refine and revise what we understand about this collection. Heritage is a living conversation, not a closed archive.
            </p>
          </div>
        </div>

        <EasyRead
          expanded={easyRead}
          onToggle={() => setEasyRead((v) => !v)}
          points={[
            "The museum holds over 300 objects spanning 700 years of history.",
            "Old burial jars (called Baybayin jars) were used long before the church was built.",
            "Iron crosses and carved stone markers were used during the colonial period.",
            "Religious figures (santos) were buried with people as spiritual protection.",
            "Old handwritten registers record the names of everyone who was buried here.",
            "Click on any artifact card to read the full explanation.",
          ]}
        />
      </div>

      <NavButtons stopNum={3} onPrev={onPrev} onNext={onNext} />
    </article>
  );
}

// ── STOP 4: Museum Quiz
function Stop4({
  onNext, onPrev, textOnly,
  quizAnswers, setQuizAnswers, quizSubmitted, setQuizSubmitted,
}: StopProps & {
  quizAnswers: Record<number, string>;
  setQuizAnswers: React.Dispatch<React.SetStateAction<Record<number, string>>>;
  quizSubmitted: boolean;
  setQuizSubmitted: React.Dispatch<React.SetStateAction<boolean>>;
}) {
  const [easyRead, setEasyRead] = useState(false);
  const score = QUIZ_QUESTIONS.filter((q) => quizAnswers[q.id] === q.answer).length;
  const answered = Object.keys(quizAnswers).length;

  return (
    <article aria-label="Stop 4: Museum Quiz Checkpoint">
      <StopHero
        stopNum={4}
        title="Museum Quiz Checkpoint"
        subtitle="Before leaving the museum, take a moment to consolidate what you have learned. Three questions — no pressure, just reflection."
        badge="Activity Checkpoint"
        textOnly={textOnly}
      />

      <div className="px-6 md:px-14 mt-10 max-w-3xl">
        {/* Progress within quiz */}
        <div className="flex items-center gap-3 mb-8 p-4 bg-card border border-border">
          <div className="flex gap-1.5 flex-1">
            {QUIZ_QUESTIONS.map((q) => (
              <div
                key={q.id}
                className={clsx(
                  "flex-1 h-1 transition-all",
                  quizAnswers[q.id]
                    ? quizSubmitted
                      ? quizAnswers[q.id] === q.answer ? "bg-green-500" : "bg-red-500"
                      : "bg-primary"
                    : "bg-border"
                )}
                aria-hidden="true"
              />
            ))}
          </div>
          <span className="text-xs text-muted-foreground flex-shrink-0" style={mono}>
            {answered}/{QUIZ_QUESTIONS.length} answered
          </span>
        </div>

        <fieldset>
          <legend className="sr-only">Museum Quiz — Select the best answer for each question</legend>
          <QuizBlock
            questions={QUIZ_QUESTIONS}
            answers={quizAnswers}
            submitted={quizSubmitted}
            onAnswer={(qid, letter) => setQuizAnswers((p) => ({ ...p, [qid]: letter }))}
            namePrefix="quiz"
          />
        </fieldset>

        {!quizSubmitted ? (
          <button
            onClick={() => { if (answered === QUIZ_QUESTIONS.length) setQuizSubmitted(true); }}
            disabled={answered < QUIZ_QUESTIONS.length}
            className={clsx(
              "px-8 py-4 text-xs tracking-widest uppercase transition-all",
              answered === QUIZ_QUESTIONS.length
                ? "bg-primary text-primary-foreground hover:opacity-90 cursor-pointer"
                : "bg-muted text-muted-foreground cursor-not-allowed"
            )}
            style={cinzel}
            aria-disabled={answered < QUIZ_QUESTIONS.length}
          >
            Submit Quiz
          </button>
        ) : (
          <div className="p-6 bg-card border border-border mb-6" role="status" aria-live="polite" aria-label={`Quiz results: ${score} out of ${QUIZ_QUESTIONS.length} correct`}>
            <div className="flex items-center gap-3 mb-4">
              <Award size={24} className="text-primary flex-shrink-0" aria-hidden="true" />
              <div>
                <p className="text-base font-bold text-foreground" style={cinzel}>{score}/{QUIZ_QUESTIONS.length} Correct</p>
                <div className="flex gap-1 mt-1">
                  {QUIZ_QUESTIONS.map((q) => (
                    <span key={q.id} className={clsx("w-8 h-1", quizAnswers[q.id] === q.answer ? "bg-green-500" : "bg-red-500")} aria-hidden="true" />
                  ))}
                </div>
              </div>
            </div>
            <p className="text-sm text-muted-foreground mb-4 leading-relaxed" style={crimson}>
              {score === 3 ? "Excellent. You have a strong grasp of the museum's artifacts and their cultural significance. Continue to the next stop." : score === 2 ? "Good effort. Review the artifact cards in Stop 3 if you'd like to revisit the material." : "Take a moment to re-read Stop 3. The connections between artifacts and burial customs are central to understanding the whole site."}
            </p>
            <button onClick={() => { setQuizAnswers({}); setQuizSubmitted(false); }} className="flex items-center gap-2 text-[11px] text-primary hover:underline" style={mono}>
              <RotateCcw size={11} aria-hidden="true" /> RETRY QUIZ
            </button>
          </div>
        )}

        <Divider />

        <div className="p-5 border border-primary/20 bg-primary/5 flex items-start gap-4 mb-6">
          <Info size={16} className="text-primary flex-shrink-0 mt-0.5" aria-hidden="true" />
          <div>
            <p className="text-xs text-primary tracking-widest uppercase mb-1.5" style={mono}>Learning Tip</p>
            <p className="text-sm text-muted-foreground leading-relaxed" style={crimson}>
              The best way to consolidate heritage learning is to try to explain what you've seen to someone else. As you walk to the next stop, describe one artifact to a companion — or simply speak it aloud to yourself. The act of narrating deepens retention.
            </p>
          </div>
        </div>

        <EasyRead
          expanded={easyRead}
          onToggle={() => setEasyRead((v) => !v)}
          points={[
            "This is a short quiz with 3 questions about what you saw in the museum.",
            "Choose the best answer for each question, then press Submit.",
            "You will see which answers were correct after submitting.",
            "You can retry the quiz as many times as you like.",
            "There is no grade — this is just a chance to reflect on what you learned.",
          ]}
        />
      </div>

      <NavButtons stopNum={4} onPrev={onPrev} onNext={onNext} />
    </article>
  );
}

// ── STOP 5: Cemetery History
function Stop5({ onNext, onPrev, textOnly }: StopProps) {
  const [easyRead, setEasyRead] = useState(false);
  const [expandedEvent, setExpandedEvent] = useState<number | null>(null);

  const events = [
    { year: "c. 1706", title: "Site Consecrated by the Augustinians", desc: "The Order of St. Augustine formally consecrates the burial ground, establishing it as the primary cemetery for the parish. The original boundary wall — much smaller than today's enclosure — is constructed from hand-cut adobe blocks quarried from the local hillside. The first recorded burial is that of a Franciscan lay brother." },
    { year: "1820", title: "The Great Cholera Epidemic", desc: "A catastrophic cholera epidemic sweeps the region. The parish death register records 23 deaths in a single week at the epidemic's peak. The cemetery's capacity is overwhelmed; emergency sections are opened along the eastern wall. The crisis accelerates the construction of additional burial niches. The underground crypts are temporarily sealed to prevent contamination." },
    { year: "1863", title: "Earthquake — Partial Destruction", desc: "A major earthquake causes significant damage to the church and the northern section of the cemetery wall. The bell tower — previously attached to the main nave — is rebuilt as a detached structure, the seismic wisdom that defines the building to this day. Restoration work on the cemetery wall reveals an earlier layer of construction predating the 18th century." },
    { year: "1898–1901", title: "Philippine Revolution & American Occupation", desc: "During the Philippine Revolution against Spain and the subsequent Philippine–American War, the site becomes a witness to political turbulence. The underground crypts are reportedly used to shelter parish records from potential destruction. Several notable figures of the revolutionary period are buried in the cemetery's western section during this time." },
    { year: "1941–1945", title: "Japanese Occupation — World War II", desc: "During the Japanese occupation, the cemetery and church are largely spared from direct destruction, though the complex sees use as a temporary shelter and staging area. Flooding from wartime infrastructure damage affects the lowest level of the underground crypts. Several parish records from this period are lost." },
    { year: "1982", title: "National Cultural Treasure Declaration", desc: "The National Museum of the Philippines formally declares the Underground Cemetery a National Cultural Treasure, triggering legal protections and conservation funding. A comprehensive archaeological survey — the first of its kind for the site — begins, producing the foundational research that informs this heritage trail. The survey's discovery of pre-colonial artifacts in the deepest layer fundamentally revises the known history of the site." },
  ];

  return (
    <article aria-label="Stop 5: Cemetery History">
      <StopHero
        stopNum={5}
        title="Return to the Gates — Cemetery History"
        subtitle="We return to the approach to understand the cemetery as a landscape shaped by six centuries of history — not merely as a burial ground."
        imageSrc="https://images.unsplash.com/photo-1776441553967-be9d8cd57bdf?w=1400&h=700&fit=crop&auto=format"
        imageAlt="Stone cemetery pathway lined with aged grave markers leading toward the historic church under an overcast sky"
        textOnly={textOnly}
      />

      <div className="px-6 md:px-14 mt-10 max-w-5xl">
        <div className="grid md:grid-cols-2 gap-10 mb-10">
          <div className="space-y-4" style={crimson}>
            <p className="text-base text-foreground leading-relaxed">
              The cemetery was not built all at once. It grew — through epidemics, earthquakes, political upheavals, and the quiet accumulation of ordinary deaths — into the complex space you are walking through today. Each crisis left its mark. Each rebuilding added a layer.
            </p>
            <p className="text-base text-muted-foreground leading-relaxed">
              The path from the gate to the church was never incidental. It was choreographed: a processional space that prepared the living for the threshold of the sacred, and the dead for their final passage. Walking it today, you are retracing a route worn smooth by centuries of mourning.
            </p>
          </div>
          <div className="space-y-4" style={crimson}>
            <p className="text-base text-muted-foreground leading-relaxed">
              The circular enclosure reflects both practical necessity and symbolic intention. As a bounded, consecrated space, it created a clear demarcation: here is the realm of the dead; there is the realm of the living. The boundary itself — the wall, the gate, the threshold — is the site's first and most fundamental heritage object.
            </p>
            <p className="text-base text-muted-foreground leading-relaxed">
              Explore the interactive timeline below to walk through the key events that shaped this space. Each event is a chapter in a story that is still being written — by archaeologists, conservators, community members, and visitors like you.
            </p>
          </div>
        </div>

        <Divider />

        {/* Interactive Timeline */}
        <div className="mb-10">
          <SectionLabel label="Historical Timeline — Click Any Event to Expand" />
          <div className="relative pl-6 space-y-3" role="list" aria-label="Historical timeline of the Underground Cemetery">
            {/* Vertical line */}
            <div className="absolute left-2 top-0 bottom-0 w-px bg-border" aria-hidden="true" />
            {events.map((ev, i) => (
              <div key={i} className="relative" role="listitem">
                {/* Dot */}
                <div
                  className={clsx("absolute -left-4 top-4 w-3 h-3 border-2 transition-colors", expandedEvent === i ? "border-primary bg-primary" : "border-muted-foreground bg-background")}
                  aria-hidden="true"
                />
                <button
                  onClick={() => setExpandedEvent(expandedEvent === i ? null : i)}
                  className={clsx(
                    "w-full text-left p-4 border transition-all",
                    expandedEvent === i ? "border-primary bg-primary/5" : "border-border hover:border-primary/40 bg-card"
                  )}
                  aria-expanded={expandedEvent === i}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <span className="text-[10px] text-primary tracking-widest uppercase" style={mono}>{ev.year}</span>
                      <p className="text-sm font-semibold text-foreground mt-0.5" style={cinzel}>{ev.title}</p>
                    </div>
                    {expandedEvent === i
                      ? <ChevronUp size={14} className="text-primary flex-shrink-0 mt-1" aria-hidden="true" />
                      : <ChevronDown size={14} className="text-muted-foreground flex-shrink-0 mt-1" aria-hidden="true" />}
                  </div>
                  {expandedEvent === i && (
                    <p className="text-sm text-muted-foreground leading-relaxed mt-3 pt-3 border-t border-border/50" style={crimson}>
                      {ev.desc}
                    </p>
                  )}
                </button>
              </div>
            ))}
          </div>
        </div>

        <Divider />

        {/* Cemetery fast facts */}
        <div className="mb-10">
          <SectionLabel label="Site Facts at a Glance" />
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <FactCard icon={<MapPin size={16} />} label="Wall Perimeter" value="~320 metres" />
            <FactCard icon={<Clock size={16} />} label="Years of Use" value="300+ Years" />
            <FactCard icon={<Users size={16} />} label="Total Burials" value="Est. 12,000+" />
            <FactCard icon={<Star size={16} />} label="Declared Treasure" value="1982" />
          </div>
        </div>

        {!textOnly && (
          <div className="mb-10">
            <SectionLabel label="The Grounds — Then and Now" />
            <ImageGallery
              images={[
                { src: "https://images.unsplash.com/photo-1776203715343-0e9784bfa5f3?w=900&h=500&fit=crop&auto=format", alt: "Aged cemetery grounds with weathered stone markers", caption: "The eastern section — oldest surviving grave markers" },
                { src: "https://images.unsplash.com/photo-1776441553967-be9d8cd57bdf?w=900&h=500&fit=crop&auto=format", alt: "Cemetery pathway toward the church", caption: "The processional path — worn by centuries of passage" },
              ]}
            />
          </div>
        )}

        <EasyRead
          expanded={easyRead}
          onToggle={() => setEasyRead((v) => !v)}
          points={[
            "The cemetery was started around 1706 by the Augustinian religious order.",
            "A major cholera epidemic in 1820 filled the cemetery quickly.",
            "A big earthquake in 1863 damaged parts of the site and changed how the bell tower was built.",
            "The site was used during the Philippine Revolution (1898) and World War II (1941–1945).",
            "In 1982, the government declared the site a National Cultural Treasure.",
            "Click on any timeline event to read the full story.",
          ]}
        />
      </div>

      <NavButtons stopNum={5} onPrev={onPrev} onNext={onNext} />
    </article>
  );
}

// ── STOP 6: Front of the Church
function Stop6({ onNext, onPrev, textOnly }: StopProps) {
  const [easyRead, setEasyRead] = useState(false);
  const [activeFeature, setActiveFeature] = useState<string | null>(null);

  const features = [
    { id: "facade", num: "01", label: "Main Facade", short: "The face of faith", detail: "The main facade is divided into three bays by pilasters — flat columns applied to the wall surface. The central bay rises higher, drawing the eye upward and framing the main entrance. The controlled ornament at the entablature (the decorative band at the top) contrasts with the heaviness of the base, creating a sense of ascent toward the sacred. Damaged sections were restored in the 19th century using locally mixed lime mortar designed to match the original tone." },
    { id: "tower", num: "02", label: "Detached Bell Tower", short: "Seismic wisdom", detail: "The bell tower stands approximately 8 meters from the main nave — a deliberate separation adopted after the 1863 earthquake demonstrated how attached towers transmit destructive vibrations to the main building. The detached tower, connected only by a covered walkway, can sway independently. This 'earthquake Baroque' solution is one of the defining features of Philippine colonial church architecture and is most visibly expressed here." },
    { id: "niche", num: "03", label: "Saint Niches", short: "Stone guardians", detail: "Three carved niches are set into the facade at different levels. The lowest two originally held santos (sacred figures) that have been moved to the museum for conservation. The uppermost niche retains its original carved stone figure — believed to be a local representation of the parish's patron saint. The carving style shows the influence of both Spanish Baroque conventions and Filipino craft traditions in its treatment of the facial features and drapery folds." },
    { id: "buttress", num: "04", label: "Lateral Buttresses", short: "Hidden strength", detail: "The thick lateral buttresses projecting from the sides of the nave walls are both structural and expressive. Structurally, they absorb the outward thrust of the barrel-vaulted ceiling inside, allowing the nave walls to be thinner than they would otherwise need to be. Expressively, they give the building a massiveness and groundedness that communicates permanence and institutional authority — the architectural equivalent of a declaration: 'this will not fall.'" },
  ];

  return (
    <article aria-label="Stop 6: Front of the Church">
      <StopHero
        stopNum={6}
        title="Front of the Church"
        subtitle="The facade is the site's most visible declaration of identity — architectural scripture written in stone and mortar across centuries of use and repair."
        imageSrc="https://images.unsplash.com/photo-1774096092382-9b987d47debf?w=1400&h=700&fit=crop&auto=format"
        imageAlt="Historic colonial church exterior with thick stone walls, baroque decorative elements, and a prominent separate bell tower"
        textOnly={textOnly}
      />

      <div className="px-6 md:px-14 mt-10 max-w-5xl">
        <div className="grid md:grid-cols-2 gap-10 mb-10">
          <div className="space-y-4" style={crimson}>
            <p className="text-base text-foreground leading-relaxed">
              The church exterior reveals a Spanish Colonial Baroque sensibility: thick walls built to withstand earthquakes and typhoons, decorative niches housing carved saints, and a façade that served as both proclamation and protection. It is architecture as theology — every element carrying meaning beyond its structural function.
            </p>
            <p className="text-base text-muted-foreground leading-relaxed">
              What makes this facade particularly significant is its survival. Many colonial-era Philippine churches were destroyed by earthquakes, fires, or wartime bombardment. This one has endured — repaired, modified, and restored, but fundamentally continuous with its 18th-century origin.
            </p>
          </div>
          <dl className="grid grid-cols-2 gap-3">
            {[
              { label: "Architectural Style", value: "Spanish Colonial Baroque" },
              { label: "Primary Material", value: "Adobe & Fired Brick" },
              { label: "Construction Period", value: "18th–19th Century" },
              { label: "Wall Thickness", value: "1.2–1.8 metres" },
              { label: "Facade Height", value: "Approx. 14 metres" },
              { label: "Bell Tower", value: "Detached (post-1863)" },
            ].map(({ label, value }) => (
              <div key={label} className="p-3 bg-card border border-border">
                <dt className="text-[9px] text-muted-foreground uppercase tracking-widest mb-1" style={mono}>{label}</dt>
                <dd className="text-xs font-semibold text-foreground" style={cinzel}>{value}</dd>
              </div>
            ))}
          </dl>
        </div>

        <Divider />

        {/* Interactive features */}
        <div className="mb-10">
          <SectionLabel label="Architectural Features — Click Each Element to Learn More" />
          <div className="grid sm:grid-cols-2 gap-3 mb-4">
            {features.map((f) => (
              <button
                key={f.id}
                onClick={() => setActiveFeature(activeFeature === f.id ? null : f.id)}
                className={clsx(
                  "p-5 text-left border transition-all",
                  activeFeature === f.id ? "border-primary bg-primary/5" : "border-border bg-card hover:border-primary/40"
                )}
                aria-expanded={activeFeature === f.id}
              >
                <div className="flex items-start justify-between gap-2 mb-2">
                  <span className="text-[10px] text-primary" style={mono}>{f.num}</span>
                  <span className={clsx("text-[10px] uppercase tracking-widest", activeFeature === f.id ? "text-primary" : "text-muted-foreground")} style={mono}>
                    {activeFeature === f.id ? "Collapse ↑" : "Expand →"}
                  </span>
                </div>
                <p className="text-sm font-semibold text-foreground mb-1" style={cinzel}>{f.label}</p>
                <p className="text-xs text-muted-foreground" style={crimson}>{f.short}</p>
                {activeFeature === f.id && (
                  <p className="text-sm text-muted-foreground leading-relaxed mt-3 pt-3 border-t border-border/50" style={crimson}>{f.detail}</p>
                )}
              </button>
            ))}
          </div>
        </div>

        <Divider />

        {/* Glossary */}
        <div className="mb-10">
          <SectionLabel label="Architecture Glossary — Key Terms" />
          <Accordion
            items={[
              { id: "baroque", title: "Baroque", content: <p>A dramatic, ornate architectural and artistic style originating in 17th-century Europe and spread globally through Catholic missionary activity. Characterized by grandeur, movement, and the use of architecture to provoke emotional and spiritual response. In the Philippines, Baroque was adapted to local conditions — simplified in ornament but retained in massing and proportion.</p> },
              { id: "buttress", title: "Buttress", content: <p>An external support structure that transfers the weight and outward thrust of walls, arches, or vaulted ceilings to the ground. Lateral buttresses (running along the sides) are visible on this church. Without them, the nave walls would need to be far thicker to handle the load of the roof structure.</p> },
              { id: "nave", title: "Nave", content: <p>The central aisle of a church, typically the largest interior space. The word derives from the Latin 'navis' (ship), reflecting an early Christian metaphor of the church as a vessel carrying the faithful. The nave is where the congregation gathers; the altar is located at the far end in the sanctuary.</p> },
              { id: "adobe", title: "Adobe (Philippine)", content: <p>In Philippine architecture, 'adobe' refers to a volcanic tuff — a soft, light-colored stone quarried from deposits formed by ancient volcanic ash. It is easily carved when freshly quarried but hardens with exposure to air. Its availability and workability made it the preferred building material for colonial-era construction throughout the archipelago.</p> },
            ]}
          />
        </div>

        <EasyRead
          expanded={easyRead}
          onToggle={() => setEasyRead((v) => !v)}
          points={[
            "The church was built in a Spanish colonial style with thick stone walls.",
            "Thick walls help protect the building from earthquakes and typhoons.",
            "The bell tower stands separately from the main church — this was done after the 1863 earthquake.",
            "Three carved niches in the facade held statues of saints.",
            "Click on each architectural feature card to learn what it is and why it was built that way.",
          ]}
        />
      </div>

      <NavButtons stopNum={6} onPrev={onPrev} onNext={onNext} />
    </article>
  );
}

// ── STOP 7: Inside the Church
function Stop7({ onNext, onPrev, textOnly }: StopProps) {
  const [easyRead, setEasyRead] = useState(false);
  const [activeMaterial, setActiveMaterial] = useState<string>("molave");
  const [expandedPoint, setExpandedPoint] = useState<number | null>(null);

  const materials: Record<string, { label: string; type: string; desc: string; properties: string }> = {
    molave: { label: "Molave", type: "Hardwood", desc: "Used for the primary floor boards and lower structural joinery. Molave (Vitex parviflora) is among the hardest Philippine timbers — dense enough to resist termites and moisture damage that destroy softer woods within decades. The floor sections of original molave have been walked smooth by generations, their surface now a near-glass polish.", properties: "Density: ~1,030 kg/m³ · Hardness: Janka 3,260 lbf · Termite-resistant" },
    narra: { label: "Narra", type: "Hardwood", desc: "The ceiling beams and primary roof trusses are cut from narra (Pterocarpus indicus), the Philippine national tree. Narra has a distinctive reddish hue when freshly cut, fading to warm amber with age. The beams in the nave ceiling — some over 8 meters long — were hand-hewn with adzes, their surfaces showing the characteristic faceted texture of pre-industrial carpentry.", properties: "Density: ~690 kg/m³ · Natural fragrance persists for decades · National tree of the Philippines" },
    ipil: { label: "Ipil", type: "Hardwood", desc: "The column bases and threshold timbers are cut from ipil (Intsia bijuga), a timber historically so valued for its rot resistance that it was used for ship keels and dock pilings in the colonial period. The ipil thresholds at the main entrance have been crossed by millions of feet and show no structural fatigue — a testament to the material's exceptional density.", properties: "Density: ~900 kg/m³ · Used in colonial-era ship construction · Marine-grade rot resistance" },
    adobe: { label: "Adobe Stone", type: "Volcanic Tuff", desc: "The nave walls are constructed from layers of adobe block — volcanic tuff quarried from local deposits. Adobe was plastered over with lime render; much of the original plaster remains, though later coats obscure the original surface. Where the plaster has fallen away, the adobe beneath shows its characteristic warm gray-cream color and porous texture.", properties: "Volcanic tuff · Porous (breathes in humidity) · Hardens with age and air exposure" },
  };

  const interiorPoints = [
    { num: "01", name: "The Entrance Porch (Narthex)", desc: "The transitional space between exterior and interior, used historically as the location for baptisms and the reception of the dead before burial. The original baptismal font — relocated to the museum for conservation — stood against the south wall of the narthex." },
    { num: "02", name: "The Nave", desc: "The main processional space of the church. The central aisle leads the eye toward the altar, creating a directed spatial experience that reinforces the theological logic of the space. The ceiling height — approximately 9 meters at the crown of the barrel vault — was designed to be imposing from the perspective of a standing worshipper." },
    { num: "03", name: "The Crossing", desc: "The point where the nave intersects with the transepts (the lateral arms of the cruciform floor plan). The crossing is marked by a slight widening of the ceiling vault and, originally, by a simple lantern opening that brought light down from above. The lantern was sealed during a 20th-century restoration." },
    { num: "04", name: "The Sanctuary & Altar", desc: "The elevated area at the far end of the nave, separated from the nave by a low railing (the communion rail). The current altar dates from a 19th-century reconstruction following earthquake damage. The original carved retablo (altarpiece) was replaced; fragments are displayed in the museum." },
    { num: "05", name: "The Sacristy", desc: "Accessible through a door to the right of the sanctuary, the sacristy is where priests prepared for Mass and where vestments and sacred vessels were stored. The sacristy connects via a narrow stair to the underground crypt system — the route that priests used for private access to the burial chambers below." },
  ];

  return (
    <article aria-label="Stop 7: Inside the Church">
      <StopHero
        stopNum={7}
        title="Inside the Church"
        subtitle="The interior speaks a different language than the exterior — one of material honesty, human scale, and the accumulated devotion of generations."
        imageSrc="https://images.unsplash.com/photo-1763305121224-897ca24f3a5e?w=1400&h=700&fit=crop&auto=format"
        imageAlt="Historic church interior showing ancient wooden ceiling beams, stone-tiled floor worn smooth with age, and altar visible at the far end of the nave"
        textOnly={textOnly}
      />

      <div className="px-6 md:px-14 mt-10 max-w-5xl">
        <div className="grid md:grid-cols-2 gap-10 mb-10">
          <div className="space-y-4" style={crimson}>
            <p className="text-base text-foreground leading-relaxed">
              The nave is defined by its original materials: hand-hewn hardwood beams from Philippine forests spanning a width that required centuries-old carpentry techniques. These timbers have outlasted the men who shaped them — and will likely outlast the institution that commissioned them.
            </p>
            <p className="text-base text-muted-foreground leading-relaxed">
              The floor, worn smooth by generations of bare feet and kneeling bodies, was originally laid in local stone. In many sections it retains its original surface — a tactile archive of use and devotion compressed into millimeters of polish.
            </p>
          </div>
          <div className="space-y-4" style={crimson}>
            <p className="text-base text-muted-foreground leading-relaxed">
              The walls, lime-plastered over adobe block, retain traces of earlier decorative schemes: ghost outlines of frescoes, patches where repairs were made in different eras — the visible stratigraphy of the building's long life. These imperfections are not flaws; they are the building's autobiography.
            </p>
            <p className="text-base text-muted-foreground leading-relaxed">
              The interior is an argument about what endures: not particular ornament or finish, but structural integrity and the capacity of local materials — chosen thoughtfully, worked skillfully — to carry the weight of centuries.
            </p>
          </div>
        </div>

        <Divider />

        {/* Materials selector */}
        <div className="mb-10">
          <SectionLabel label="Original Materials — Select Each to Explore" />
          <div className="flex flex-wrap gap-2 mb-5">
            {Object.entries(materials).map(([key, mat]) => (
              <button
                key={key}
                onClick={() => setActiveMaterial(key)}
                className={clsx(
                  "px-4 py-2.5 border text-xs tracking-widest uppercase transition-all",
                  activeMaterial === key
                    ? "border-primary text-primary bg-primary/8"
                    : "border-border text-muted-foreground hover:border-foreground"
                )}
                style={mono}
                aria-pressed={activeMaterial === key}
              >
                {mat.label}
              </button>
            ))}
          </div>
          {activeMaterial && materials[activeMaterial] && (
            <div className="p-6 bg-card border border-primary/30">
              <div className="flex items-start justify-between gap-4 mb-3">
                <div>
                  <p className="text-[10px] text-primary tracking-widest uppercase mb-1" style={mono}>{materials[activeMaterial].type}</p>
                  <h3 className="text-lg font-bold text-foreground" style={cinzel}>{materials[activeMaterial].label}</h3>
                </div>
                <span className="text-[10px] text-muted-foreground px-2 py-1 border border-border" style={mono}>Original Material</span>
              </div>
              <p className="text-base text-muted-foreground leading-relaxed mb-4" style={crimson}>{materials[activeMaterial].desc}</p>
              <p className="text-[10px] text-primary/70 border-t border-border pt-3" style={mono}>{materials[activeMaterial].properties}</p>
            </div>
          )}
        </div>

        <Divider />

        {/* Interior observation points */}
        <div className="mb-10">
          <SectionLabel label="Interior Observation Points — A Virtual Walk-Through" />
          <div className="space-y-2">
            {interiorPoints.map((point, i) => (
              <div key={i} className="border border-border">
                <button
                  onClick={() => setExpandedPoint(expandedPoint === i ? null : i)}
                  className="w-full flex items-center gap-4 px-5 py-4 text-left hover:bg-muted/20 transition-colors"
                  aria-expanded={expandedPoint === i}
                >
                  <span className="text-[10px] text-primary flex-shrink-0 font-bold" style={mono}>{point.num}</span>
                  <span className="text-sm font-semibold text-foreground flex-1" style={cinzel}>{point.name}</span>
                  {expandedPoint === i
                    ? <ChevronUp size={14} className="text-primary flex-shrink-0" aria-hidden="true" />
                    : <ChevronDown size={14} className="text-muted-foreground flex-shrink-0" aria-hidden="true" />}
                </button>
                {expandedPoint === i && (
                  <div className="px-5 pb-4 pl-14 text-sm text-muted-foreground leading-relaxed" style={crimson}>
                    {point.desc}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        <EasyRead
          expanded={easyRead}
          onToggle={() => setEasyRead((v) => !v)}
          points={[
            "The inside of the church uses very old Philippine wood types: molave, narra, and ipil.",
            "Each wood type was chosen for a specific reason — hardness, rot resistance, or strength.",
            "The stone floor has been worn smooth by millions of people walking over many years.",
            "The walls show signs of old paintings (frescoes) and repairs from different periods.",
            "Click on a wood/material name to read what it is and why it was used.",
            "Click on the numbered interior points to take a virtual walk-through of the church.",
          ]}
        />
      </div>

      <NavButtons stopNum={7} onPrev={onPrev} onNext={onNext} />
    </article>
  );
}

// ── STOP 8: Underground Crypts
function Stop8({ onNext, onPrev, textOnly }: StopProps) {
  const [easyRead, setEasyRead] = useState(false);
  const [expandedPriest, setExpandedPriest] = useState<string | null>(null);
  const [expandedCryptEvent, setExpandedCryptEvent] = useState<number | null>(null);

  const priests = [
    { id: "rios", name: "Fr. Agustín Ríos, OSA", years: "1742–1801", role: "First Parish Rector", summary: "Commissioned the bell tower and established the parish library.", detail: "Fr. Ríos arrived at the parish in 1742 as its first formally installed rector under the Augustinian Order. He oversaw the construction of the original bell tower (attached to the nave — the detached form came only after the 1863 earthquake), the laying of the first formal burial niches in the underground crypt system, and the establishment of the parish library — a collection of some 240 volumes that included rare theological texts and one of the earliest known maps of the region. His funeral, attended by over 400 people, was the largest gathering recorded at the site to that date." },
    { id: "lerma", name: "Fr. Domingo Lerma, OP", years: "1808–1867", role: "Cholera Era Pastor", summary: "Served during the 1820 cholera epidemic. His records are the primary mortality source.", detail: "Fr. Lerma came to the parish in 1808 and served through the most catastrophic period in its modern history: the 1820 cholera epidemic. His daily entries in the death register — sometimes covering multiple burials in a single afternoon — are the primary historical source for understanding the scale and social distribution of that catastrophe. He also organized a system of community care for the sick and bereaved that historians have cited as an early model of parish-based social welfare. He served until his death in 1867, never having returned to Spain. His burial was at his own request placed in the deepest level of the crypt." },
    { id: "baluyot", name: "Fr. Juan Baluyot", years: "1871–1941", role: "Final Crypt Interment", summary: "The last priest buried in the crypts; his funeral marked the end of the original crypt system.", detail: "Fr. Baluyot was the first Filipino-born rector of the parish — a milestone that reflected the broader transition from Spanish to Philippine Church leadership following independence. He served for over 40 years and oversaw the early-20th-century restoration of the facade and the installation of the current communion rail. His death in 1941, just months before the Japanese occupation began, gives his funeral a particular historical weight: it was the last formal ceremony of the old order. His burial in the crypts was also the last; after the occupation, crypt interments were discontinued." },
  ];

  const cryptEvents = [
    { year: "1720", event: "First clergy burial in the underground crypts — a Franciscan lay brother, by special permission." },
    { year: "1820", event: "Crypts temporarily sealed during the cholera epidemic as a public health precaution. Reopened 1822." },
    { year: "1898", event: "During the Revolution, parish records and sacred objects are moved to the crypts for protection." },
    { year: "1941", event: "Fr. Baluyot's burial — the last in the crypt system. The occupation begins three months later." },
    { year: "1945", event: "Wartime flooding partially damages the crypt's lowest level. Several early burial markers are lost." },
    { year: "1975", event: "Archaeological survey documents the complete crypt system and catalogues all recoverable remains." },
    { year: "2005", event: "Conservation team stabilizes the crypt walls and installs lighting for the heritage trail." },
  ];

  return (
    <article aria-label="Stop 8: Underground Crypts">
      <StopHero
        stopNum={8}
        title="Underground Crypts"
        subtitle="Beneath the church floor, the stone chambers preserve the remains of priests who served this parish — and hold the memory of events that shaped the site's identity."
        imageSrc="https://images.unsplash.com/photo-1777792405713-e0a895c8457c?w=1400&h=700&fit=crop&auto=format"
        imageAlt="Underground stone crypt with arched masonry walls and narrow passages, dramatically lit to reveal burial niches carved into the historic stonework"
        textOnly={textOnly}
      />

      <div className="px-6 md:px-14 mt-10 max-w-5xl">
        <div className="grid md:grid-cols-2 gap-10 mb-10">
          <div className="space-y-4" style={crimson}>
            <p className="text-base text-foreground leading-relaxed">
              The underground crypts are the most intimate space on the trail — the place where the site's institutional history becomes most personal. Carved into the bedrock beneath the nave floor, these chambers were reserved for the clergy: an honor system encoded in stone and position.
            </p>
            <p className="text-base text-muted-foreground leading-relaxed">
              Being buried within the church itself was the highest mark of institutional belonging. It meant you had given your life to this community and this place, and the community had decided your body would remain here in perpetuity — guarded by the same walls you had guarded in life.
            </p>
          </div>
          <div className="space-y-4" style={crimson}>
            <p className="text-base text-muted-foreground leading-relaxed">
              The priests interred here were not merely ecclesiastical figures. In the colonial period, the parish priest was often the primary administrator of community life — governing birth, marriage, death, education, and much of local governance. Their burial beneath the congregation continued that role symbolically into eternity.
            </p>
            <p className="text-base text-muted-foreground leading-relaxed">
              The crypts were also used during moments of crisis. Their underground position made them dry, cool, and structurally protected — qualities that made them useful for more than burial during times of instability.
            </p>
          </div>
        </div>

        <Divider />

        {/* Priest Profiles */}
        <div className="mb-10">
          <SectionLabel label="Notable Interments — Click Each Profile to Read More" />
          <div className="space-y-3">
            {priests.map((p) => (
              <div key={p.id} className={clsx("border transition-all", expandedPriest === p.id ? "border-primary" : "border-border")}>
                <button
                  onClick={() => setExpandedPriest(expandedPriest === p.id ? null : p.id)}
                  className="w-full flex items-start gap-4 p-5 text-left hover:bg-muted/20 transition-colors"
                  aria-expanded={expandedPriest === p.id}
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-1">
                      <p className="text-sm font-semibold text-foreground" style={cinzel}>{p.name}</p>
                      <span className="text-[10px] text-muted-foreground flex-shrink-0" style={mono}>{p.years}</span>
                    </div>
                    <p className="text-[10px] text-primary tracking-widest uppercase mb-1" style={mono}>{p.role}</p>
                    <p className="text-xs text-muted-foreground" style={crimson}>{p.summary}</p>
                  </div>
                  {expandedPriest === p.id
                    ? <ChevronUp size={14} className="text-primary flex-shrink-0 mt-1" aria-hidden="true" />
                    : <ChevronDown size={14} className="text-muted-foreground flex-shrink-0 mt-1" aria-hidden="true" />}
                </button>
                {expandedPriest === p.id && (
                  <div className="px-5 pb-5 border-t border-border/50">
                    <p className="text-sm text-muted-foreground leading-relaxed pt-4" style={crimson}>{p.detail}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        <Divider />

        {/* Crypt timeline */}
        <div className="mb-10">
          <SectionLabel label="The Crypts Through Time — Key Events" />
          <div className="space-y-2" role="list">
            {cryptEvents.map((ev, i) => (
              <button
                key={i}
                onClick={() => setExpandedCryptEvent(expandedCryptEvent === i ? null : i)}
                className={clsx(
                  "w-full flex items-start gap-4 p-4 border text-left transition-all",
                  expandedCryptEvent === i ? "border-primary bg-primary/5" : "border-border hover:border-primary/30"
                )}
                aria-expanded={expandedCryptEvent === i}
                role="listitem"
              >
                <span className="text-[10px] text-primary font-bold flex-shrink-0 w-10" style={mono}>{ev.year}</span>
                <p className={clsx("text-sm flex-1 leading-relaxed", expandedCryptEvent === i ? "text-foreground" : "text-muted-foreground")} style={crimson}>{ev.event}</p>
                <span className="text-[10px] text-muted-foreground flex-shrink-0" style={mono}>
                  {expandedCryptEvent === i ? "↑" : "↓"}
                </span>
              </button>
            ))}
          </div>
        </div>

        <div className="p-5 border border-primary/20 bg-primary/5 mb-10 flex items-start gap-4">
          <Info size={16} className="text-primary flex-shrink-0 mt-0.5" aria-hidden="true" />
          <div>
            <p className="text-xs text-primary tracking-widest uppercase mb-1.5" style={mono}>On Sacred Remains</p>
            <p className="text-sm text-muted-foreground leading-relaxed" style={crimson}>
              The physical remains in the underground crypts are not on public display. This is a heritage site, not a spectacle. The interpretive experience here is guided by written and material records, not by the remains themselves. Visitors are asked to approach this space with the same respect they would bring to any active place of religious remembrance.
            </p>
          </div>
        </div>

        <EasyRead
          expanded={easyRead}
          onToggle={() => setEasyRead((v) => !v)}
          points={[
            "The underground crypts are chambers built into the ground below the church floor.",
            "Priests who served the church were buried here as the highest honor the community could give.",
            "Three important priests are recorded as having been buried in these crypts.",
            "The crypts were also used to protect important documents during the Revolution and World War II.",
            "Click on a priest's name to read their full life story and contribution to the site.",
            "The physical remains are not on display — this space is treated with full respect.",
          ]}
        />
      </div>

      <NavButtons stopNum={8} onPrev={onPrev} onNext={onNext} />
    </article>
  );
}

// ── STOP 9: Final Assessment
function Stop9({
  onNext, onPrev, textOnly,
  assessAnswers, setAssessAnswers, assessSubmitted, setAssessSubmitted,
}: StopProps & {
  assessAnswers: Record<number, string>;
  setAssessAnswers: React.Dispatch<React.SetStateAction<Record<number, string>>>;
  assessSubmitted: boolean;
  setAssessSubmitted: React.Dispatch<React.SetStateAction<boolean>>;
}) {
  const [easyRead, setEasyRead] = useState(false);
  const score = ASSESSMENT_QUESTIONS.filter((q) => assessAnswers[q.id] === q.answer).length;
  const answered = Object.keys(assessAnswers).length;

  return (
    <article aria-label="Stop 9: Final Assessment">
      <StopHero
        stopNum={9}
        title="Final Assessment"
        subtitle="You have walked the full trail — from gate to crypt. This assessment asks you to connect the threads: artifacts, architecture, materials, and the memory that binds them into one story."
        badge="Assessment"
        textOnly={textOnly}
      />

      <div className="px-6 md:px-14 mt-10 max-w-3xl">
        {/* Quiz progress */}
        <div className="flex items-center gap-3 mb-8 p-4 bg-card border border-border">
          <div className="flex gap-1 flex-1">
            {ASSESSMENT_QUESTIONS.map((q) => (
              <div
                key={q.id}
                className={clsx(
                  "flex-1 h-1 transition-all",
                  assessAnswers[q.id]
                    ? assessSubmitted
                      ? assessAnswers[q.id] === q.answer ? "bg-green-500" : "bg-red-500"
                      : "bg-primary"
                    : "bg-border"
                )}
                aria-hidden="true"
              />
            ))}
          </div>
          <span className="text-xs text-muted-foreground flex-shrink-0" style={mono}>{answered}/{ASSESSMENT_QUESTIONS.length}</span>
        </div>

        <fieldset>
          <legend className="sr-only">Final Assessment — Five comprehensive questions about the complete heritage trail</legend>
          <QuizBlock
            questions={ASSESSMENT_QUESTIONS}
            answers={assessAnswers}
            submitted={assessSubmitted}
            onAnswer={(qid, letter) => setAssessAnswers((p) => ({ ...p, [qid]: letter }))}
            namePrefix="assess"
          />
        </fieldset>

        {!assessSubmitted ? (
          <button
            onClick={() => { if (answered === ASSESSMENT_QUESTIONS.length) setAssessSubmitted(true); }}
            disabled={answered < ASSESSMENT_QUESTIONS.length}
            className={clsx(
              "px-8 py-4 text-xs tracking-widest uppercase transition-all mb-8",
              answered === ASSESSMENT_QUESTIONS.length
                ? "bg-primary text-primary-foreground hover:opacity-90 cursor-pointer"
                : "bg-muted text-muted-foreground cursor-not-allowed"
            )}
            style={cinzel}
            aria-disabled={answered < ASSESSMENT_QUESTIONS.length}
          >
            Submit Assessment ({answered}/{ASSESSMENT_QUESTIONS.length})
          </button>
        ) : (
          <div className="p-6 bg-card border border-border mb-8" role="status" aria-live="polite">
            <div className="flex items-start gap-4 mb-4">
              <Award size={28} className="text-primary flex-shrink-0 mt-0.5" aria-hidden="true" />
              <div className="flex-1">
                <p className="text-lg font-bold text-foreground" style={cinzel}>Assessment Complete</p>
                <div className="flex items-center gap-3 mt-1">
                  <div className="flex gap-1 flex-1">
                    {ASSESSMENT_QUESTIONS.map((q) => (
                      <span key={q.id} className={clsx("flex-1 h-1.5", assessAnswers[q.id] === q.answer ? "bg-green-500" : "bg-red-500")} aria-hidden="true" />
                    ))}
                  </div>
                  <span className="text-xs text-foreground font-bold flex-shrink-0" style={mono}>{score}/{ASSESSMENT_QUESTIONS.length}</span>
                </div>
              </div>
            </div>
            <div className="h-px bg-border my-4" />
            <p className="text-sm text-muted-foreground mb-5 leading-relaxed" style={crimson}>
              {score === 5 ? "Outstanding. You have demonstrated a comprehensive understanding of the site's history, architecture, material culture, and community memory. You carry the trail with you." : score >= 4 ? "Very good. A strong grasp of the site's main themes. Consider revisiting the sections where you found difficulty." : score >= 3 ? "A solid foundation. The heritage trail is rich — some details take more than one visit to fully absorb. We encourage you to revisit the stops and try again." : "Heritage learning is an ongoing process. We recommend walking through each stop once more. The site rewards careful, unhurried attention."}
            </p>
            <button onClick={() => { setAssessAnswers({}); setAssessSubmitted(false); }} className="flex items-center gap-2 text-[11px] text-primary hover:underline" style={mono}>
              <RotateCcw size={11} aria-hidden="true" /> RETRY ASSESSMENT
            </button>
          </div>
        )}

        <EasyRead
          expanded={easyRead}
          onToggle={() => setEasyRead((v) => !v)}
          points={[
            "This is a final assessment with 5 questions covering the whole trail.",
            "Answer all 5 questions, then press Submit Assessment.",
            "You will see which answers were correct after submitting.",
            "You can retry the assessment as many times as you like.",
            "A high score means you are ready to guide others through the trail!",
          ]}
        />
      </div>

      <NavButtons stopNum={9} onPrev={onPrev} onNext={onNext} />
    </article>
  );
}

// ── STOP 10: Return to Gates & Thank You
function Stop10({ onNext, onPrev, textOnly }: StopProps) {
  const [checklist, setChecklist] = useState<Set<number>>(new Set());
  const takeaways = [
    "The site's circular wall is both a practical enclosure and a deeply symbolic form.",
    "The museum's artifacts span 700 years — from pre-colonial burial jars to 20th-century parish records.",
    "Spanish Colonial Baroque architecture was adapted to Philippine seismic and climatic conditions.",
    "Local hardwoods — molave, narra, ipil — were chosen for structural reasons that proved correct over centuries.",
    "The underground crypts served both as sacred burial space and as practical shelter in times of crisis.",
    "Heritage is a living conversation: the site is still being studied, conserved, and reinterpreted.",
  ];

  return (
    <article aria-label="Stop 10: Return to Gates and Thank You">
      <StopHero
        stopNum={10}
        title="Return to the Gates & Thank You"
        subtitle="The trail ends where it began. You return not to the same threshold, but with a different understanding of what lies behind it."
        imageSrc="https://images.unsplash.com/photo-1776441553951-a52ee2228407?w=1400&h=700&fit=crop&auto=format"
        imageAlt="The heritage site gates at dusk, warm amber light falling across the stone archway as the trail completes its full circle"
        badge="Trail Complete"
        textOnly={textOnly}
      />

      <div className="px-6 md:px-14 mt-10 max-w-5xl">
        {/* Completion badge */}
        <div className="p-6 border border-primary/30 bg-primary/5 flex items-center gap-5 mb-10" role="status" aria-label="Heritage trail completion badge">
          <Award size={40} className="text-primary flex-shrink-0" aria-hidden="true" />
          <div>
            <p className="text-[10px] text-primary tracking-[0.4em] uppercase mb-1" style={mono}>Heritage Trail — Complete</p>
            <p className="text-lg font-bold text-foreground" style={cinzel}>The Underground Cemetery Heritage Trail</p>
            <p className="text-xs text-muted-foreground mt-0.5" style={mono}>10 Stops · Accessible · Inclusive · Living Heritage</p>
          </div>
        </div>

        {/* Closing message */}
        <div className="grid md:grid-cols-2 gap-10 mb-10">
          <div className="space-y-4" style={crimson}>
            <p className="text-xl text-foreground leading-relaxed">
              Thank you for walking the Underground Cemetery Heritage Trail. Whether you experienced this digitally or as part of a physical visit, you have engaged with a place that holds centuries of human memory in its stones, soil, and stories.
            </p>
            <p className="text-base text-muted-foreground leading-relaxed">
              Heritage is not static. It grows each time a new visitor brings their questions, curiosity, and care to a place like this. Your visit is part of the site's ongoing story — a continuation of the very memory this trail exists to preserve.
            </p>
          </div>
          <div className="space-y-4" style={crimson}>
            <p className="text-base text-muted-foreground leading-relaxed">
              The gates you first passed through are the same gates you return to now — but you carry with you the museum's artifacts, the church's architecture, the materials that have outlasted their makers, and the names of priests whose work continues underground.
            </p>
            <p className="text-base text-muted-foreground leading-relaxed">
              This trail is always here for you — digitally or physically — whenever you wish to return. Bring others. Bring new questions. The gates are always open.
            </p>
          </div>
        </div>

        <Divider />

        {/* Takeaways checklist */}
        <div className="mb-10">
          <SectionLabel label="What You Learned — Mark the Ideas That Stayed With You" />
          <p className="text-sm text-muted-foreground mb-4" style={crimson}>
            Tick the takeaways that resonated most. This is not graded — it is simply a reflection exercise.
          </p>
          <div className="space-y-2" role="group" aria-label="Trail takeaways checklist">
            {takeaways.map((point, i) => (
              <button
                key={i}
                onClick={() => setChecklist((prev) => {
                  const next = new Set(prev);
                  next.has(i) ? next.delete(i) : next.add(i);
                  return next;
                })}
                className={clsx(
                  "w-full flex items-start gap-4 p-4 border text-left transition-all",
                  checklist.has(i) ? "border-primary bg-primary/5" : "border-border hover:border-primary/30"
                )}
                aria-pressed={checklist.has(i)}
              >
                <span
                  className={clsx(
                    "flex-shrink-0 w-5 h-5 border flex items-center justify-center transition-all mt-0.5",
                    checklist.has(i) ? "border-primary bg-primary" : "border-muted-foreground"
                  )}
                  aria-hidden="true"
                >
                  {checklist.has(i) && <CheckCircle size={12} className="text-primary-foreground" />}
                </span>
                <p className="text-sm text-foreground leading-relaxed" style={crimson}>{point}</p>
              </button>
            ))}
          </div>
          {checklist.size > 0 && (
            <p className="text-xs text-primary mt-3" style={mono} role="status" aria-live="polite">
              {checklist.size} of {takeaways.length} takeaways selected
            </p>
          )}
        </div>

        <Divider />

        {/* Trail stats */}
        <div className="mb-10">
          <SectionLabel label="Your Journey — Trail at a Glance" />
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <FactCard icon={<MapPin size={16} />} label="Stops Completed" value="10 of 10" />
            <FactCard icon={<Clock size={16} />} label="Years of History" value="700+ Years" />
            <FactCard icon={<Star size={16} />} label="Artifacts Explored" value="6 Featured" />
            <FactCard icon={<Users size={16} />} label="Community Memory" value="Ongoing" />
          </div>
        </div>

        {/* Revisit options */}
        <div className="p-6 border border-border mb-10">
          <p className="text-xs text-primary tracking-widest uppercase mb-4" style={mono}>Continue Exploring</p>
          <div className="grid sm:grid-cols-3 gap-3">
            {[
              { label: "Review the Artifacts", stop: 3 },
              { label: "Revisit the Crypts", stop: 8 },
              { label: "Retake the Assessment", stop: 9 },
            ].map(({ label, stop }) => (
              <button
                key={stop}
                onClick={() => onPrev()} // will navigate back — simplified for this stop
                className="flex items-center justify-between px-4 py-3 border border-border text-xs text-muted-foreground hover:border-primary hover:text-primary transition-all"
                style={mono}
                aria-label={`Go back to ${label}`}
              >
                {label}
                <ArrowRight size={12} aria-hidden="true" />
              </button>
            ))}
          </div>
        </div>

        <EasyRead
          expanded={false}
          onToggle={() => {}}
          points={[
            "You have completed all 10 stops of the Underground Cemetery Heritage Trail.",
            "Tick the takeaways above to mark the ideas that meant the most to you.",
            "You can revisit any stop using the progress bar at the top of the page.",
            "Thank you for learning with us. The heritage of this place is now part of your story too.",
          ]}
        />
      </div>

      <NavButtons stopNum={10} onPrev={onPrev} onNext={onNext} />
    </article>
  );
}

// ══════════════════════════════════════════════════════
// ── HERO (currentStop === 0)
// ══════════════════════════════════════════════════════

function Hero({
  onBegin, textOnly, showTranscript, onToggleTranscript,
}: {
  onBegin: () => void;
  textOnly: boolean;
  showTranscript: boolean;
  onToggleTranscript: () => void;
}) {
  return (
    <section
      className="h-screen overflow-hidden flex flex-col items-center justify-center relative"
      style={{ background: "linear-gradient(165deg, #060604 0%, #0A0A07 55%, #0F0D08 100%)" }}
      aria-label="Heritage Trail Hero — Beginning of the Trail"
    >
      {/* Grid texture */}
      <div
        className="absolute inset-0 opacity-[0.03] pointer-events-none"
        aria-hidden="true"
        style={{
          backgroundImage: "repeating-linear-gradient(0deg, rgba(201,169,110,0.6) 0px, rgba(201,169,110,0.6) 1px, transparent 1px, transparent 64px), repeating-linear-gradient(90deg, rgba(201,169,110,0.6) 0px, rgba(201,169,110,0.6) 1px, transparent 1px, transparent 64px)",
        }}
      />
      <div className="absolute inset-0 pointer-events-none" aria-hidden="true"
        style={{ background: "radial-gradient(ellipse 60% 50% at 50% 50%, rgba(201,169,110,0.06) 0%, transparent 70%)" }}
      />

      <div className="relative z-10 px-6 w-full max-w-2xl mx-auto flex flex-col items-center text-center gap-5">
        {/* Eyebrow */}
        <div className="flex items-center gap-3">
          <div className="h-px w-8 bg-primary/50" aria-hidden="true" />
          <p className="text-[10px] text-primary tracking-[0.5em] uppercase" style={mono}>Heritage Trail · Living Monument</p>
          <div className="h-px w-8 bg-primary/50" aria-hidden="true" />
        </div>

        {/* Title */}
        <div>
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold text-foreground leading-[1.05]" style={cinzel}>
            The Underground
          </h1>
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold leading-[1.05]" style={{ ...cinzel, color: "#C9A96E" }}>
            Cemetery
          </h1>
        </div>

        <p className="text-sm md:text-base text-muted-foreground max-w-sm leading-relaxed" style={crimson}>
          A self-guided heritage trail through history, memory, and sacred space. Ten stops. One living testament. Accessible to all.
        </p>

        {/* Video or Transcript */}
        {!textOnly ? (
          <div className="w-full" style={{ maxHeight: "32vh" }}>
            <div className="relative w-full" style={{ paddingTop: "min(56.25%, 32vh)" }}>
              <iframe
                className="absolute inset-0 w-full h-full"
                src="https://www.youtube.com/embed/tU8a3-QLKDc?rel=0&modestbranding=1&cc_load_policy=1"
                title="Underground Cemetery Heritage Trail — Documentary Introduction"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                aria-label="Documentary introduction video. Enable captions via the CC button."
              />
            </div>
            <div className="flex items-center justify-between mt-1.5 px-0.5">
              <p className="text-[10px] text-muted-foreground" style={mono}>Enable captions via CC button</p>
              <button
                onClick={onToggleTranscript}
                className="text-[10px] text-primary hover:underline flex items-center gap-1"
                style={mono}
                aria-expanded={showTranscript}
                aria-controls="hero-transcript"
              >
                <FileText size={10} aria-hidden="true" />
                {showTranscript ? "HIDE" : "VIEW"} TRANSCRIPT
              </button>
            </div>
            {showTranscript && (
              <div id="hero-transcript" className="mt-2 p-3 bg-card border border-border text-left max-h-28 overflow-y-auto">
                <p className="text-xs text-muted-foreground leading-relaxed" style={crimson}>
                  <span className="text-primary" style={mono}>[00:00] </span>Welcome to the Underground Cemetery — one of the most significant heritage sites in the region. Built centuries ago as a circular walled enclosure, it served as both a parish cemetery and a monument to community memory.
                  <span className="text-primary" style={mono}> [00:18] </span>You stand at the threshold between the present and the past. Inside: artifacts spanning 700 years, a church built to outlast generations, and below the church floor — the underground crypts.
                  <span className="text-primary" style={mono}> [00:48] </span>This trail is your guide through all of it. Begin here. End here. Carry the story with you.
                </p>
              </div>
            )}
          </div>
        ) : (
          <div className="w-full p-4 bg-card border border-border text-left" role="region" aria-label="Video Transcript (Text-Only Mode)">
            <p className="text-[10px] text-primary tracking-widest uppercase mb-2" style={mono}>Video Transcript</p>
            <p className="text-xs text-muted-foreground leading-relaxed" style={crimson}>
              Welcome to the Underground Cemetery — one of the most significant heritage sites in the region. This circular walled enclosure served as a parish cemetery and monument to community memory. Inside: artifacts spanning 700 years, a church built to outlast generations, and the underground crypts. This trail is your guide through all of it.
            </p>
          </div>
        )}

        {/* Begin button */}
        <button
          onClick={onBegin}
          className="flex items-center gap-3 px-8 py-4 bg-primary text-primary-foreground text-xs tracking-[0.3em] uppercase hover:opacity-90 transition-all focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-background group"
          style={cinzel}
          aria-label="Begin the Heritage Trail — Start at Stop 1"
        >
          Begin the Trail
          <ArrowRight size={14} className="group-hover:translate-x-0.5 transition-transform" aria-hidden="true" />
        </button>
      </div>
    </section>
  );
}

// ══════════════════════════════════════════════════════
// ── PROGRESS BAR (fixed top, only shown on stops)
// ══════════════════════════════════════════════════════

function ProgressHeader({
  currentStop,
  completedStops,
  onNavigate,
  onAccessibility,
}: {
  currentStop: number;
  completedStops: Set<number>;
  onNavigate: (n: number) => void;
  onAccessibility: () => void;
}) {
  const stopTitle = STOPS[currentStop - 1]?.short || "";

  return (
    <div
      className="fixed top-0 left-0 right-0 z-50 bg-card/95 border-b border-border"
      style={{ backdropFilter: "blur(8px)" }}
      role="navigation"
      aria-label="Heritage Trail Progress"
    >
      {/* Row 1 */}
      <div className="flex items-center justify-between px-5 py-2.5 gap-4">
        <p className="text-[10px] text-foreground tracking-widest uppercase hidden sm:block flex-shrink-0" style={mono}>
          The Underground Cemetery
        </p>
        <div className="flex-1 text-center">
          <p className="text-[11px] text-primary tracking-widest uppercase" style={mono}>
            Stop {currentStop} of 10 · {stopTitle}
          </p>
        </div>
        <button
          onClick={onAccessibility}
          className="flex items-center gap-1.5 text-[10px] text-muted-foreground hover:text-primary transition-colors flex-shrink-0 border border-border px-2 py-1 hover:border-primary"
          style={mono}
          aria-label="Open Accessibility Settings"
        >
          <Settings size={11} aria-hidden="true" />
          <span className="hidden sm:inline">ACCESSIBILITY</span>
        </button>
      </div>

      {/* Row 2 — Progress segments */}
      <div className="px-4 pb-2.5" role="list" aria-label="Trail stops progress">
        <div className="flex items-center gap-0.5">
          {STOPS.map((stop, i) => {
            const isCompleted = completedStops.has(stop.id);
            const isCurrent = currentStop === stop.id;
            const canClick = isCompleted;
            return (
              <div key={stop.id} className="flex-1 flex flex-col items-center gap-1" role="listitem">
                <button
                  onClick={() => canClick ? onNavigate(stop.id) : undefined}
                  disabled={!canClick}
                  className={clsx(
                    "w-full h-1.5 transition-all",
                    isCurrent && "bg-primary",
                    isCompleted && !isCurrent && "bg-primary/60 cursor-pointer hover:bg-primary",
                    !isCurrent && !isCompleted && "bg-border"
                  )}
                  aria-label={`Stop ${stop.id}: ${stop.title}${isCompleted ? " (completed, click to revisit)" : isCurrent ? " (current)" : " (not yet visited)"}`}
                  aria-current={isCurrent ? "step" : undefined}
                />
                <span
                  className={clsx(
                    "text-[8px] transition-colors hidden sm:block",
                    isCurrent ? "text-primary" : isCompleted ? "text-muted-foreground/60" : "text-border"
                  )}
                  style={mono}
                  aria-hidden="true"
                >
                  {stop.id}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════
// ── ACCESSIBILITY PANEL
// ══════════════════════════════════════════════════════

function AccessibilityPanel({
  open,
  onClose,
  fontSize,
  setFontSize,
  highContrast,
  setHighContrast,
  textOnly,
  setTextOnly,
}: {
  open: boolean;
  onClose: () => void;
  fontSize: FontSize;
  setFontSize: (f: FontSize) => void;
  highContrast: boolean;
  setHighContrast: (v: boolean) => void;
  textOnly: boolean;
  setTextOnly: (v: boolean) => void;
}) {
  if (!open) return null;

  function TogglePill({ active }: { active: boolean }) {
    return (
      <div className={clsx("w-9 h-5 rounded-full relative flex-shrink-0 transition-colors", active ? "bg-primary" : "bg-muted")} aria-hidden="true">
        <div className={clsx("absolute top-0.5 w-4 h-4 rounded-full transition-all", active ? "left-4 bg-primary-foreground" : "left-0.5 bg-muted-foreground")} />
      </div>
    );
  }

  return (
    <div
      className="fixed top-24 right-4 z-[90] w-80 bg-card border border-border shadow-2xl"
      role="dialog"
      aria-label="Accessibility Settings"
      aria-modal="false"
    >
      <div className="flex items-center justify-between px-5 py-3 border-b border-border">
        <p className="text-xs font-semibold text-foreground tracking-widest uppercase" style={mono}>Accessibility Settings</p>
        <button onClick={onClose} aria-label="Close accessibility panel" className="text-muted-foreground hover:text-foreground">
          <X size={14} aria-hidden="true" />
        </button>
      </div>
      <div className="p-5 space-y-5">
        {/* Font size */}
        <div>
          <p className="text-[10px] text-muted-foreground uppercase tracking-widest mb-3" style={mono}>Text Size</p>
          <div className="grid grid-cols-4 gap-2">
            {(["sm", "md", "lg", "xl"] as FontSize[]).map((size, idx) => {
              const labels = ["Small", "Medium", "Large", "X-Large"];
              const aSize = ["text-xs", "text-sm", "text-base", "text-lg"];
              return (
                <button
                  key={size}
                  onClick={() => setFontSize(size)}
                  className={clsx(
                    "flex flex-col items-center gap-1 py-2.5 border transition-all",
                    fontSize === size ? "border-primary text-primary bg-primary/8" : "border-border text-muted-foreground hover:border-foreground"
                  )}
                  aria-pressed={fontSize === size}
                  aria-label={`Set text size to ${labels[idx]}`}
                >
                  <span className={clsx("font-bold", aSize[idx])} style={cinzel} aria-hidden="true">A</span>
                  <span className="text-[9px]" style={mono}>{labels[idx]}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* High contrast */}
        <button
          onClick={() => setHighContrast(!highContrast)}
          className={clsx("w-full flex items-center justify-between px-4 py-3 border transition-all", highContrast ? "border-primary text-primary bg-primary/8" : "border-border text-foreground hover:border-foreground")}
          aria-pressed={highContrast}
        >
          <span className="flex items-center gap-2 text-xs" style={mono}><Contrast size={13} aria-hidden="true" /> HIGH CONTRAST</span>
          <TogglePill active={highContrast} />
        </button>

        {/* Text only */}
        <button
          onClick={() => setTextOnly(!textOnly)}
          className={clsx("w-full flex items-center justify-between px-4 py-3 border transition-all", textOnly ? "border-primary text-primary bg-primary/8" : "border-border text-foreground hover:border-foreground")}
          aria-pressed={textOnly}
        >
          <span className="flex items-center gap-2 text-xs" style={mono}><FileText size={13} aria-hidden="true" /> TEXT-ONLY MODE</span>
          <TogglePill active={textOnly} />
        </button>
        {textOnly && <p className="text-[11px] text-muted-foreground px-1" style={crimson}>Images and videos are hidden. Transcripts are shown instead.</p>}

        <div className="border-t border-border pt-4">
          <p className="text-[9px] text-muted-foreground leading-relaxed" style={crimson}>
            This trail supports screen readers (NVDA, JAWS, VoiceOver) via semantic HTML and ARIA landmarks. A skip-to-content link is available at the top of the page.
          </p>
        </div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════
// ── MAIN APP
// ══════════════════════════════════════════════════════

export default function App() {
  const [currentStop, setCurrentStop] = useState(0);
  const [completedStops, setCompletedStops] = useState<Set<number>>(new Set());
  const [fontSize, setFontSize] = useState<FontSize>("md");
  const [highContrast, setHighContrast] = useState(false);
  const [textOnly, setTextOnly] = useState(false);
  const [showTranscript, setShowTranscript] = useState(false);
  const [accessibilityOpen, setAccessibilityOpen] = useState(false);

  // Quiz / Assessment state (persists between stop changes)
  const [quizAnswers, setQuizAnswers] = useState<Record<number, string>>({});
  const [quizSubmitted, setQuizSubmitted] = useState(false);
  const [assessAnswers, setAssessAnswers] = useState<Record<number, string>>({});
  const [assessSubmitted, setAssessSubmitted] = useState(false);

  // Font size effect
  useEffect(() => {
    document.documentElement.style.setProperty("--font-size", FONT_SIZES[fontSize]);
  }, [fontSize]);

  // Scroll to top on stop change
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [currentStop]);

  const goToStop = (n: number) => {
    if (currentStop > 0 && currentStop <= 10) {
      setCompletedStops((prev) => new Set([...prev, currentStop]));
    }
    setCurrentStop(n);
  };

  const goNext = () => {
    if (currentStop >= 10) { goToStop(0); return; }
    goToStop(currentStop + 1);
  };

  const goPrev = () => {
    if (currentStop <= 1) { goToStop(0); return; }
    goToStop(currentStop - 1);
  };

  const hcStyle: React.CSSProperties = highContrast
    ? ({
        "--background": "#000000",
        "--foreground": "#FFFFFF",
        "--card": "#0D0D0D",
        "--card-foreground": "#FFFFFF",
        "--primary": "#FFE066",
        "--primary-foreground": "#000000",
        "--muted": "#111111",
        "--muted-foreground": "#CCCCCC",
        "--border": "rgba(255,255,255,0.35)",
        "--accent": "#FFE066",
        "--accent-foreground": "#000000",
        "--secondary": "#111111",
        "--secondary-foreground": "#FFFFFF",
      } as React.CSSProperties)
    : {};

  const stopProps: StopProps = { onNext: goNext, onPrev: goPrev, textOnly };

  return (
    <div className="min-h-screen bg-background text-foreground" style={hcStyle}>
      {/* Skip link */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-[200] focus:px-4 focus:py-2 focus:bg-primary focus:text-primary-foreground focus:text-xs"
        style={cinzel}
      >
        Skip to main content
      </a>

      {/* Progress header — only shown on stops 1–10 */}
      {currentStop > 0 && (
        <ProgressHeader
          currentStop={currentStop}
          completedStops={completedStops}
          onNavigate={goToStop}
          onAccessibility={() => setAccessibilityOpen(true)}
        />
      )}

      {/* Accessibility button on hero */}
      {currentStop === 0 && (
        <button
          onClick={() => setAccessibilityOpen(true)}
          className="fixed top-4 right-4 z-50 flex items-center gap-1.5 px-3 py-2 bg-card border border-border text-[10px] text-muted-foreground hover:text-primary hover:border-primary transition-all"
          style={mono}
          aria-label="Open Accessibility Settings"
        >
          <Settings size={12} aria-hidden="true" />
          ACCESSIBILITY
        </button>
      )}

      {/* Accessibility panel */}
      <AccessibilityPanel
        open={accessibilityOpen}
        onClose={() => setAccessibilityOpen(false)}
        fontSize={fontSize}
        setFontSize={setFontSize}
        highContrast={highContrast}
        setHighContrast={setHighContrast}
        textOnly={textOnly}
        setTextOnly={setTextOnly}
      />

      {/* Main content */}
      <main id="main-content" className={currentStop > 0 ? "pt-[88px]" : ""}>
        <motion.div
          key={currentStop}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.4, ease: "easeOut" }}
        >
          {currentStop === 0 && (
            <Hero
              onBegin={() => goToStop(1)}
              textOnly={textOnly}
              showTranscript={showTranscript}
              onToggleTranscript={() => setShowTranscript((v) => !v)}
            />
          )}
          {currentStop === 1 && <Stop1 {...stopProps} />}
          {currentStop === 2 && <Stop2 {...stopProps} />}
          {currentStop === 3 && <Stop3 {...stopProps} />}
          {currentStop === 4 && (
            <Stop4
              {...stopProps}
              quizAnswers={quizAnswers}
              setQuizAnswers={setQuizAnswers}
              quizSubmitted={quizSubmitted}
              setQuizSubmitted={setQuizSubmitted}
            />
          )}
          {currentStop === 5 && <Stop5 {...stopProps} />}
          {currentStop === 6 && <Stop6 {...stopProps} />}
          {currentStop === 7 && <Stop7 {...stopProps} />}
          {currentStop === 8 && <Stop8 {...stopProps} />}
          {currentStop === 9 && (
            <Stop9
              {...stopProps}
              assessAnswers={assessAnswers}
              setAssessAnswers={setAssessAnswers}
              assessSubmitted={assessSubmitted}
              setAssessSubmitted={setAssessSubmitted}
            />
          )}
          {currentStop === 10 && <Stop10 {...stopProps} />}
        </motion.div>
      </main>
    </div>
  );
}
