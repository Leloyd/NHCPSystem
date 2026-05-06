(function () {
  "use strict";

  var shell = document.getElementById("heritageTrailShell");
  var stop1Image = shell ? shell.dataset.stop1Image || "" : "";
  var stop1Gallery1 = shell ? shell.dataset.stop1GalleryOne || "" : "";
  var stop1Gallery2 = shell ? shell.dataset.stop1GalleryTwo || "" : "";
  var stop1Gallery3 = shell ? shell.dataset.stop1GalleryThree || "" : "";
  var panoramaFrontGate = shell ? shell.dataset.panoramaFrontGate || "" : "";
  var panoramaRightFrontGate = shell ? shell.dataset.panoramaRightFrontGate || "" : "";
  var step1PanoramaViewer = null;

  if (!shell) {
    return;
  }

  var FONT_SIZES = { sm: "13px", md: "16px", lg: "19px", xl: "23px" };

  var STOPS = [
    { id: 1, title: "Orientation", short: "Front Gates" },
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

  var HERO_TRANSCRIPT = "[00:00] Welcome to the orientation point of the Nagcarlan Underground Cemetery. From the gate, you first encounter the circular enclosure, the red-brick pathways, and the chapel that anchors the site. [00:16] Established in 1845 under Fr. Vicente Velloc, the cemetery was built outside the town center in keeping with 19th-century health regulations. [00:31] The front gate prepares you for what lies ahead: a National Historical Landmark that served the town in life, in death, and at key moments in Philippine history. [00:48] Use this 360 view to familiarize yourself with the approach before beginning the full trail.";

  var QUIZ_QUESTIONS = [
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

  var ASSESSMENT_QUESTIONS = [
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

  var galleryData = {
    stop1: [
      {
        src: stop1Gallery1,
        alt: "Step 01 orientation view of the Nagcarlan Underground Cemetery entrance gate",
        caption: "",
      },
      {
        src: stop1Gallery2,
        alt: "Step 01 gallery image showing another view from the entrance area of the heritage site",
        caption: "",
      },
      {
        src: stop1Gallery3,
        alt: "Step 01 gallery image highlighting the front approach and surrounding grounds",
        caption: "",
      },
    ].filter(function (item) { return !!item.src; }),
    stop5: [
      {
        src: "https://images.unsplash.com/photo-1776203715343-0e9784bfa5f3?w=900&h=500&fit=crop&auto=format",
        alt: "Aged cemetery grounds with weathered stone markers",
        caption: "The eastern section — oldest surviving grave markers",
      },
      {
        src: "https://images.unsplash.com/photo-1776441553967-be9d8cd57bdf?w=900&h=500&fit=crop&auto=format",
        alt: "Cemetery pathway toward the church",
        caption: "The processional path — worn by centuries of passage",
      },
    ],
  };

  var artifacts = [
    { id: "a1", name: "Baybayin Burial Jar", period: "Pre-Colonial · c. 14th Century", category: "pre-colonial", icon: "Jar", short: "Earthenware jar incised with early Baybayin script, used in indigenous burial rites.", detail: "This ceramic vessel is among the oldest objects in the collection. Found in the deepest archaeological stratum beneath the church floor, it predates the Spanish arrival by at least two centuries. The incised markings are consistent with pre-colonial Baybayin script — a syllabic writing system used across the archipelago. Its presence at a Catholic burial site suggests continuity of practice: the site was sacred before the church, and the community continued to honor earlier burial traditions even after conversion." },
    { id: "a2", name: "Iron Funerary Cross", period: "Colonial · c. 18th Century", category: "colonial", icon: "Cross", short: "Hand-forged iron cross placed at the head of a 1740s burial. Spanish colonial craftsmanship.", detail: "Forged in a style consistent with Spanish colonial smithing traditions, this cross was recovered from a grave dated to approximately 1742. The iron is locally smelted; the design combines Spanish iconographic conventions with floral motifs borrowed from Philippine indigenous decorative tradition. The fusion is typical of colonial-era Philippine religious metalwork: a hybrid object that carries multiple cultural identities simultaneously." },
    { id: "a3", name: "Stone Epitaph Fragment", period: "Colonial · 1839", category: "colonial", icon: "Stone", short: "Carved limestone fragment bearing a partial name and date from 1839.", detail: "Recovered from the south wall of the enclosure during the 1975 restoration, this fragment preserves part of an inscription that reads: '...AQUÍ YACE... FALLECIÓ EL DÍA...' ('Here lies... who died on the day...'). The name is lost, but the date 1839 is legible. The limestone was carved by a local artisan using iron chisels, and the letterforms show the influence of both Spanish ecclesiastical inscription tradition and local craft practice." },
    { id: "a4", name: "Carved Santo Figure", period: "Colonial · c. 18th Century", category: "religious", icon: "Santo", short: "Hand-carved wooden santo, likely a household devotional object interred with its owner.", detail: "This small hardwood figure — carved from narra, a Philippine hardwood traditionally associated with good fortune — was found inside a burial niche in the church crypt. Its painted surface has largely deteriorated, but traces of red and gold pigment remain on the garment folds. Santo figures of this type were common household devotional objects; burying one with the deceased reflected the belief that continued divine protection extended beyond death." },
    { id: "a5", name: "Parish Death Register, Vol. I", period: "Colonial–Modern · 1820–1905", category: "colonial", icon: "Register", short: "Original handwritten register recording deaths, causes, and burial dates across 85 years.", detail: "This ledger contains 1,847 individual entries in various hands — parish priests, sacristans, and lay scribes who recorded deaths over 85 years. The entries range from single-line notations ('Manuel Reyes, age 42, fever') to detailed accounts of notable community members. During the 1820 cholera epidemic, entries multiply dramatically: 23 deaths recorded in a single week in August of that year. The register is both a historical archive and an intimate record of community loss." },
    { id: "a6", name: "Bone Fragment Collection", period: "Pre-Colonial · c. 13th–14th Century", category: "pre-colonial", icon: "Bones", short: "Skeletal fragments from the site's earliest burials, predating the church by over 500 years.", detail: "Excavated from the deepest archaeological layer during the 1975 survey, these bone fragments — primarily long bones and cranial material — date to the 13th–14th centuries by radiocarbon analysis. They represent burials made on this site long before the Spanish arrived, confirming that the location held sacred significance to the indigenous community. The orientation of the remains suggests an east-west alignment consistent with pre-colonial burial practices documented across the archipelago." },
  ];

  var cemeteryEvents = [
    { year: "c. 1706", title: "Site Consecrated by the Augustinians", desc: "The Order of St. Augustine formally consecrates the burial ground, establishing it as the primary cemetery for the parish. The original boundary wall — much smaller than today's enclosure — is constructed from hand-cut adobe blocks quarried from the local hillside. The first recorded burial is that of a Franciscan lay brother." },
    { year: "1820", title: "The Great Cholera Epidemic", desc: "A catastrophic cholera epidemic sweeps the region. The parish death register records 23 deaths in a single week at the epidemic's peak. The cemetery's capacity is overwhelmed; emergency sections are opened along the eastern wall. The crisis accelerates the construction of additional burial niches. The underground crypts are temporarily sealed to prevent contamination." },
    { year: "1863", title: "Earthquake — Partial Destruction", desc: "A major earthquake causes significant damage to the church and the northern section of the cemetery wall. The bell tower — previously attached to the main nave — is rebuilt as a detached structure, the seismic wisdom that defines the building to this day. Restoration work on the cemetery wall reveals an earlier layer of construction predating the 18th century." },
    { year: "1898–1901", title: "Philippine Revolution & American Occupation", desc: "During the Philippine Revolution against Spain and the subsequent Philippine–American War, the site becomes a witness to political turbulence. The underground crypts are reportedly used to shelter parish records from potential destruction. Several notable figures of the revolutionary period are buried in the cemetery's western section during this time." },
    { year: "1941–1945", title: "Japanese Occupation — World War II", desc: "During the Japanese occupation, the cemetery and church are largely spared from direct destruction, though the complex sees use as a temporary shelter and staging area. Flooding from wartime infrastructure damage affects the lowest level of the underground crypts. Several parish records from this period are lost." },
    { year: "1982", title: "National Cultural Treasure Declaration", desc: "The National Museum of the Philippines formally declares the Underground Cemetery a National Cultural Treasure, triggering legal protections and conservation funding. A comprehensive archaeological survey — the first of its kind for the site — begins, producing the foundational research that informs this heritage trail. The survey's discovery of pre-colonial artifacts in the deepest layer fundamentally revises the known history of the site." },
  ];

  var churchFeatures = [
    { id: "facade", num: "01", label: "Main Facade", short: "The face of faith", detail: "The main facade is divided into three bays by pilasters — flat columns applied to the wall surface. The central bay rises higher, drawing the eye upward and framing the main entrance. The controlled ornament at the entablature contrasts with the heaviness of the base, creating a sense of ascent toward the sacred. Damaged sections were restored in the 19th century using locally mixed lime mortar designed to match the original tone." },
    { id: "tower", num: "02", label: "Detached Bell Tower", short: "Seismic wisdom", detail: "The bell tower stands approximately 8 meters from the main nave — a deliberate separation adopted after the 1863 earthquake demonstrated how attached towers transmit destructive vibrations to the main building. The detached tower, connected only by a covered walkway, can sway independently. This earthquake Baroque solution is one of the defining features of Philippine colonial church architecture and is most visibly expressed here." },
    { id: "niche", num: "03", label: "Saint Niches", short: "Stone guardians", detail: "Three carved niches are set into the facade at different levels. The lowest two originally held santos that have been moved to the museum for conservation. The uppermost niche retains its original carved stone figure — believed to be a local representation of the parish's patron saint. The carving style shows the influence of both Spanish Baroque conventions and Filipino craft traditions in its treatment of the facial features and drapery folds." },
    { id: "buttress", num: "04", label: "Lateral Buttresses", short: "Hidden strength", detail: "The thick lateral buttresses projecting from the sides of the nave walls are both structural and expressive. Structurally, they absorb the outward thrust of the barrel-vaulted ceiling inside, allowing the nave walls to be thinner than they would otherwise need to be. Expressively, they give the building a massiveness and groundedness that communicates permanence and institutional authority." },
  ];

  var churchMaterials = {
    molave: { label: "Molave", type: "Hardwood", desc: "Used for the primary floor boards and lower structural joinery. Molave is among the hardest Philippine timbers — dense enough to resist termites and moisture damage that destroy softer woods within decades. The floor sections of original molave have been walked smooth by generations, their surface now a near-glass polish.", properties: "Density: ~1,030 kg/m³ · Hardness: Janka 3,260 lbf · Termite-resistant" },
    narra: { label: "Narra", type: "Hardwood", desc: "The ceiling beams and primary roof trusses are cut from narra, the Philippine national tree. Narra has a distinctive reddish hue when freshly cut, fading to warm amber with age. The beams in the nave ceiling — some over 8 meters long — were hand-hewn with adzes, their surfaces showing the characteristic faceted texture of pre-industrial carpentry.", properties: "Density: ~690 kg/m³ · Natural fragrance persists for decades · National tree of the Philippines" },
    ipil: { label: "Ipil", type: "Hardwood", desc: "The column bases and threshold timbers are cut from ipil, a timber historically so valued for its rot resistance that it was used for ship keels and dock pilings in the colonial period. The ipil thresholds at the main entrance have been crossed by millions of feet and show no structural fatigue.", properties: "Density: ~900 kg/m³ · Used in colonial-era ship construction · Marine-grade rot resistance" },
    adobe: { label: "Adobe Stone", type: "Volcanic Tuff", desc: "The nave walls are constructed from layers of adobe block — volcanic tuff quarried from local deposits. Adobe was plastered over with lime render; much of the original plaster remains, though later coats obscure the original surface. Where the plaster has fallen away, the adobe beneath shows its characteristic warm gray-cream color and porous texture.", properties: "Volcanic tuff · Porous (breathes in humidity) · Hardens with age and air exposure" },
  };

  var churchInteriorPoints = [
    { num: "01", name: "The Entrance Porch (Narthex)", desc: "The transitional space between exterior and interior, used historically as the location for baptisms and the reception of the dead before burial. The original baptismal font — relocated to the museum for conservation — stood against the south wall of the narthex." },
    { num: "02", name: "The Nave", desc: "The main processional space of the church. The central aisle leads the eye toward the altar, creating a directed spatial experience that reinforces the theological logic of the space. The ceiling height — approximately 9 meters at the crown of the barrel vault — was designed to be imposing from the perspective of a standing worshipper." },
    { num: "03", name: "The Crossing", desc: "The point where the nave intersects with the transepts. The crossing is marked by a slight widening of the ceiling vault and, originally, by a simple lantern opening that brought light down from above. The lantern was sealed during a 20th-century restoration." },
    { num: "04", name: "The Sanctuary & Altar", desc: "The elevated area at the far end of the nave, separated from the nave by a low railing. The current altar dates from a 19th-century reconstruction following earthquake damage. The original carved retablo was replaced; fragments are displayed in the museum." },
    { num: "05", name: "The Sacristy", desc: "Accessible through a door to the right of the sanctuary, the sacristy is where priests prepared for Mass and where vestments and sacred vessels were stored. The sacristy connects via a narrow stair to the underground crypt system." },
  ];

  var priests = [
    { id: "rios", name: "Fr. Agustín Ríos, OSA", years: "1742–1801", role: "First Parish Rector", summary: "Commissioned the bell tower and established the parish library.", detail: "Fr. Ríos arrived at the parish in 1742 as its first formally installed rector under the Augustinian Order. He oversaw the construction of the original bell tower, the laying of the first formal burial niches in the underground crypt system, and the establishment of the parish library — a collection of some 240 volumes that included rare theological texts and one of the earliest known maps of the region. His funeral, attended by over 400 people, was the largest gathering recorded at the site to that date." },
    { id: "lerma", name: "Fr. Domingo Lerma, OP", years: "1808–1867", role: "Cholera Era Pastor", summary: "Served during the 1820 cholera epidemic. His records are the primary mortality source.", detail: "Fr. Lerma came to the parish in 1808 and served through the most catastrophic period in its modern history: the 1820 cholera epidemic. His daily entries in the death register — sometimes covering multiple burials in a single afternoon — are the primary historical source for understanding the scale and social distribution of that catastrophe. He also organized a system of community care for the sick and bereaved that historians have cited as an early model of parish-based social welfare. He served until his death in 1867, never having returned to Spain. His burial was at his own request placed in the deepest level of the crypt." },
    { id: "baluyot", name: "Fr. Juan Baluyot", years: "1871–1941", role: "Final Crypt Interment", summary: "The last priest buried in the crypts; his funeral marked the end of the original crypt system.", detail: "Fr. Baluyot was the first Filipino-born rector of the parish — a milestone that reflected the broader transition from Spanish to Philippine Church leadership following independence. He served for over 40 years and oversaw the early-20th-century restoration of the facade and the installation of the current communion rail. His death in 1941, just months before the Japanese occupation began, gives his funeral a particular historical weight: it was the last formal ceremony of the old order. His burial in the crypts was also the last; after the occupation, crypt interments were discontinued." },
  ];

  var cryptEvents = [
    { year: "1720", event: "First clergy burial in the underground crypts — a Franciscan lay brother, by special permission." },
    { year: "1820", event: "Crypts temporarily sealed during the cholera epidemic as a public health precaution. Reopened 1822." },
    { year: "1898", event: "During the Revolution, parish records and sacred objects are moved to the crypts for protection." },
    { year: "1941", event: "Fr. Baluyot's burial — the last in the crypt system. The occupation begins three months later." },
    { year: "1945", event: "Wartime flooding partially damages the crypt's lowest level. Several early burial markers are lost." },
    { year: "1975", event: "Archaeological survey documents the complete crypt system and catalogues all recoverable remains." },
    { year: "2005", event: "Conservation team stabilizes the crypt walls and installs lighting for the heritage trail." },
  ];

  var finalTakeaways = [
    "The site's circular wall is both a practical enclosure and a deeply symbolic form.",
    "The museum's artifacts span 700 years — from pre-colonial burial jars to 20th-century parish records.",
    "Spanish Colonial Baroque architecture was adapted to Philippine seismic and climatic conditions.",
    "Local hardwoods — molave, narra, ipil — were chosen for structural reasons that proved correct over centuries.",
    "The underground crypts served both as sacred burial space and as practical shelter in times of crisis.",
    "Heritage is a living conversation: the site is still being studied, conserved, and reinterpreted.",
  ];

  var state = {
    currentStop: 0,
    completedStops: {},
    fontSize: "md",
    highContrast: false,
    textOnly: false,
    showTranscript: false,
    accessibilityOpen: false,
    quizAnswers: {},
    quizSubmitted: false,
    assessAnswers: {},
    assessSubmitted: false,
    registration: { name: "", email: "", date: "", group: "1", access: false },
    registrationSubmitted: false,
    easyRead: {},
    accordions: {},
    galleries: { stop1: 0, stop5: 0 },
    activeArtifactCategory: "all",
    selectedArtifactId: "",
    expandedEvent: null,
    activeFeatureId: "",
    activeMaterialId: "molave",
    expandedInteriorPoint: null,
    expandedPriestId: "",
    expandedCryptEvent: null,
    finalChecklist: {},
  };

  function escapeHtml(value) {
    return String(value || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/\"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function setFontSize() {
    shell.style.setProperty("--heritage-font-size", FONT_SIZES[state.fontSize] || FONT_SIZES.md);
    shell.dataset.contrast = state.highContrast ? "high" : "default";
  }

  function markCurrentStopComplete() {
    if (state.currentStop > 0 && state.currentStop <= 10) {
      state.completedStops[state.currentStop] = true;
    }
  }

  function goToStop(nextStop) {
    markCurrentStopComplete();
    state.currentStop = nextStop;
    window.scrollTo({ top: 0, behavior: "smooth" });
    render();
  }

  function goNext() {
    if (state.currentStop >= 10) {
      goToStop(0);
      return;
    }
    goToStop(state.currentStop + 1);
  }

  function goPrev() {
    if (state.currentStop <= 1) {
      goToStop(0);
      return;
    }
    goToStop(state.currentStop - 1);
  }

  function toggleEasyRead(key) {
    state.easyRead[key] = !state.easyRead[key];
    render();
  }

  function toggleAccordion(group, key) {
    state.accordions[group] = state.accordions[group] === key ? "" : key;
    render();
  }

  function renderButton(label, action, modifier, extra) {
    return '<button type="button" class="' + modifier + '" data-action="' + action + '"' + (extra || "") + '>' + label + '</button>';
  }

  function renderDivider() {
    return '<div class="heritage-divider" aria-hidden="true"><span class="heritage-divider__diamond"></span></div>';
  }

  function renderSectionLabel(label, extraClass) {
    return '<p class="heritage-section-label heritage-label' + (extraClass ? ' ' + extraClass : '') + '">' + escapeHtml(label) + '</p>';
  }

  function renderEasyRead(key, points, forceOpen, extraClass) {
    var isOpen = forceOpen || !!state.easyRead[key];
    var button = forceOpen
      ? ''
      : '<button type="button" class="heritage-inline-button" data-action="toggle-easy-read" data-key="' + key + '" aria-expanded="' + (isOpen ? 'true' : 'false') + '">' + (isOpen ? 'Hide' : 'Show') + ' Easy-Read Summary</button>';

    return '<div class="heritage-stack' + (extraClass ? ' ' + extraClass : '') + '">' +
      button +
      (isOpen
        ? '<div class="heritage-callout' + (extraClass ? ' ' + extraClass : '') + '"><div class="heritage-callout__icon">ER</div><div><p class="heritage-label heritage-small">Easy-Read Summary</p><ul class="heritage-stack">' +
          points.map(function (point) { return '<li class="heritage-copy">' + escapeHtml(point) + '</li>'; }).join('') +
          '</ul></div></div>'
        : '') +
      '</div>';
  }

  function renderAccordion(group, items, extraClass) {
    return '<div class="heritage-accordion' + (extraClass ? ' ' + extraClass : '') + '">' + items.map(function (item) {
      var open = state.accordions[group] === item.id;
      return '<div class="heritage-accordion__item">' +
        '<button type="button" class="heritage-accordion__button" data-action="toggle-accordion" data-group="' + group + '" data-key="' + item.id + '" aria-expanded="' + (open ? 'true' : 'false') + '">' +
        '<span><span class="heritage-card-button__title">' + escapeHtml(item.title) + '</span></span>' +
        '<span class="heritage-small">' + (open ? 'Hide' : 'Open') + '</span>' +
        '</button>' +
        (open ? '<div class="heritage-accordion__content">' + item.content + '</div>' : '') +
      '</div>';
    }).join('') + '</div>';
  }

  function renderGallery(key) {
    var items = galleryData[key] || [];
    var activeIndex = state.galleries[key] || 0;
    var activeItem = items[activeIndex] || items[0];

    if (!activeItem) {
      return '';
    }

    return '<div class="heritage-gallery" data-gallery-key="' + key + '">' +
      '<div class="heritage-gallery__frame">' +
        '<img class="heritage-gallery__image" src="' + escapeHtml(activeItem.src) + '" alt="' + escapeHtml(activeItem.alt) + '" loading="lazy" />' +
        (items.length > 1 ? '<button type="button" class="heritage-gallery__nav" data-direction="prev" data-action="gallery-step" data-gallery="' + key + '" aria-label="Previous image"><span class="heritage-gallery__nav-icon" aria-hidden="true">‹</span></button>' : '') +
        (items.length > 1 ? '<button type="button" class="heritage-gallery__nav" data-direction="next" data-action="gallery-step" data-gallery="' + key + '" aria-label="Next image"><span class="heritage-gallery__nav-icon" aria-hidden="true">›</span></button>' : '') +
        (activeItem.caption ? '<div class="heritage-gallery__caption">' + escapeHtml(activeItem.caption) + '</div>' : '') +
      '</div>' +
      (items.length > 1 ? '<div class="heritage-gallery__dots">' + items.map(function (item, index) {
        return '<button type="button" class="heritage-gallery__dot ' + (index === activeIndex ? 'is-active' : '') + '" data-action="gallery-select" data-gallery="' + key + '" data-index="' + index + '" aria-label="Image ' + (index + 1) + '"></button>';
      }).join('') + '</div>' : '') +
    '</div>';
  }

  function transitionGallery(galleryKey, nextIndex) {
    var items = galleryData[galleryKey] || [];
    var gallery = document.querySelector('.heritage-gallery[data-gallery-key="' + galleryKey + '"]');
    var currentIndex = state.galleries[galleryKey] || 0;
    var nextItem = items[nextIndex];

    if (!items.length || !nextItem) {
      return;
    }

    if (!gallery) {
      state.galleries[galleryKey] = nextIndex;
      render();
      return;
    }

    if (gallery.dataset.transitioning === 'true' || currentIndex === nextIndex) {
      return;
    }

    var frame = gallery.querySelector('.heritage-gallery__frame');
    var currentImage = frame ? frame.querySelector('.heritage-gallery__image:not(.heritage-gallery__image--incoming)') : null;
    var caption = frame ? frame.querySelector('.heritage-gallery__caption') : null;

    if (!frame || !currentImage) {
      state.galleries[galleryKey] = nextIndex;
      render();
      return;
    }

    gallery.dataset.transitioning = 'true';
    state.galleries[galleryKey] = nextIndex;

    Array.prototype.forEach.call(gallery.querySelectorAll('.heritage-gallery__dot'), function (dot, index) {
      dot.classList.toggle('is-active', index === nextIndex);
    });

    var incomingImage = document.createElement('img');
    incomingImage.className = 'heritage-gallery__image heritage-gallery__image--incoming';
    incomingImage.src = nextItem.src;
    incomingImage.alt = nextItem.alt;
    incomingImage.loading = 'lazy';

    frame.insertBefore(incomingImage, caption);

    var swap = function () {
      if (caption) {
        caption.textContent = nextItem.caption;
      }
      requestAnimationFrame(function () {
        currentImage.classList.add('heritage-gallery__image--outgoing');
        incomingImage.classList.add('is-visible');
      });
    };

    if (incomingImage.complete) {
      swap();
    } else {
      incomingImage.addEventListener('load', swap, { once: true });
      incomingImage.addEventListener('error', function () {
        gallery.dataset.transitioning = 'false';
        incomingImage.remove();
        render();
      }, { once: true });
    }

    window.setTimeout(function () {
      if (currentImage.parentNode) {
        currentImage.remove();
      }
      incomingImage.className = 'heritage-gallery__image';
      gallery.dataset.transitioning = 'false';
    }, 440);
  }

  function renderStopHero(config) {
    return '<section class="heritage-stop-hero">' +
      (!state.textOnly && config.imageSrc
        ? '<div class="heritage-stop-hero__image"><img src="' + escapeHtml(config.imageSrc) + '" alt="' + escapeHtml(config.imageAlt || '') + '" loading="lazy" /></div>'
        : '') +
      '<div class="heritage-stop-hero__body ' + (!state.textOnly && config.imageSrc ? 'is-overlap' : '') + '">' +
        '<div class="heritage-stop-hero__header' + (config.headerClass ? ' ' + config.headerClass : '') + '">' +
          '<div class="heritage-kicker-row"><span class="heritage-label">Stop ' + String(config.stopNum).padStart(2, '0') + ' of 10</span>' +
          (config.badge ? '<span class="heritage-pill">' + escapeHtml(config.badge) + '</span>' : '') + '</div>' +
          '<h1 class="heritage-stop-title">' + escapeHtml(config.title) + '</h1>' +
          '<p class="heritage-stop-subtitle">' + escapeHtml(config.subtitle) + '</p>' +
        '</div>' +
      '</div>' +
    '</section>';
  }

  function renderNav(stopNum) {
    var nextTitle = stopNum < 10 ? STOPS[stopNum].title : 'Return to Beginning';
    return '<div class="heritage-nav">' +
      '<div class="heritage-nav__row">' +
        '<button type="button" class="heritage-nav-button" data-action="prev">' + (stopNum === 1 ? 'Back to Beginning' : 'Stop ' + (stopNum - 1)) + '</button>' +
        '<button type="button" class="heritage-nav-button heritage-nav-button--primary" data-action="next">' + (stopNum === 10 ? 'Return to Beginning' : 'Next: ' + escapeHtml(nextTitle)) + '</button>' +
      '</div>' +
      '<p class="heritage-footer-note heritage-small">Stop ' + stopNum + ' of 10 · Underground Cemetery Heritage Trail</p>' +
    '</div>';
  }

  function renderQuizQuestions(questions, answers, submitted, prefix) {
    return questions.map(function (question, index) {
      return '<div class="heritage-stack">' +
        '<div class="heritage-grid" style="grid-template-columns:auto 1fr;align-items:flex-start;">' +
          '<span class="heritage-chip is-active">' + (index + 1) + '</span>' +
          '<p class="heritage-card-button__title">' + escapeHtml(question.question) + '</p>' +
        '</div>' +
        '<div class="heritage-stack">' + question.options.map(function (option) {
          var selected = answers[question.id] === option.letter;
          var correct = submitted && option.letter === question.answer;
          var wrong = submitted && selected && option.letter !== question.answer;
          var dim = submitted && !selected && !correct;
          return '<label class="heritage-quiz-option ' + (selected ? 'is-selected ' : '') + (correct ? 'is-correct ' : '') + (wrong ? 'is-wrong ' : '') + (dim ? 'is-dim' : '') + '">' +
            '<input type="radio" name="' + prefix + '-' + question.id + '" value="' + option.letter + '" data-action="answer-question" data-kind="' + prefix + '" data-id="' + question.id + '" ' + (selected ? 'checked ' : '') + (submitted ? 'disabled ' : '') + '/>' +
            '<span class="heritage-copy"><strong>' + option.letter + '.</strong> ' + escapeHtml(option.text) + '</span>' +
          '</label>';
        }).join('') + '</div>' +
        (submitted && answers[question.id] !== question.answer ? '<p class="heritage-copy">Correct: ' + escapeHtml(question.options.filter(function (item) { return item.letter === question.answer; })[0].text) + '</p>' : '') +
      '</div>';
    }).join('');
  }

  function renderMiniProgress(questions, answers, submitted) {
    return '<div class="heritage-progress-mini">' + questions.map(function (question) {
      var statusClass = '';
      if (answers[question.id]) {
        statusClass = submitted ? (answers[question.id] === question.answer ? 'is-correct' : 'is-wrong') : 'is-filled';
      }
      return '<span class="' + statusClass + '"></span>';
    }).join('') + '</div>';
  }

  function renderHero() {
    return '<section class="heritage-hero">' +
      '<div class="heritage-hero__inner">' +
        '<div class="heritage-eyebrow">Heritage Trail · Living Monument</div>' +
        '<h1 class="heritage-hero__title">The Underground <span class="heritage-hero__accent">Cemetery</span></h1>' +
        '<p class="heritage-hero__copy">A guided heritage trail through history, memory, and sacred space. One living testament. Accessible to all.</p>' +
        '<div class="heritage-hero__actions">' +
          '<button type="button" class="heritage-button" data-action="begin">Begin the Trail</button>' +
          '<button type="button" class="heritage-button--ghost" data-action="toggle-access">Accessibility</button>' +
        '</div>' +
        '<div class="heritage-hero__media">' +
          (!state.textOnly
            ? '<div class="heritage-hero__video"><iframe src="https://www.youtube.com/embed/tU8a3-QLKDc?rel=0&modestbranding=1&cc_load_policy=1" title="Underground Cemetery Heritage Trail Documentary Introduction" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe></div>' +
              '<div class="heritage-hero__media-bar"><span>Enable captions via the CC button.</span><button type="button" class="heritage-inline-button" data-action="toggle-transcript" aria-expanded="' + (state.showTranscript ? 'true' : 'false') + '">' + (state.showTranscript ? 'Hide' : 'View') + ' Transcript</button></div>' +
              (state.showTranscript ? '<div class="heritage-transcript">' + escapeHtml(HERO_TRANSCRIPT) + '</div>' : '')
            : '<div class="heritage-transcript"><p class="heritage-label heritage-small">Video Transcript</p><p>' + escapeHtml(HERO_TRANSCRIPT) + '</p></div>') +
        '</div>' +
      '</div>' +
    '</section>';
  }

  function initStep1Panorama() {
    if (state.textOnly || state.currentStop !== 1) {
      if (step1PanoramaViewer && typeof step1PanoramaViewer.destroy === 'function') {
        step1PanoramaViewer.destroy();
      }
      step1PanoramaViewer = null;
      return;
    }

    var panoramaTarget = document.getElementById('heritageStep1Panorama');

    if (!panoramaTarget || !window.pannellum || !panoramaFrontGate || !panoramaRightFrontGate) {
      return;
    }

    if (step1PanoramaViewer && typeof step1PanoramaViewer.destroy === 'function') {
      step1PanoramaViewer.destroy();
      step1PanoramaViewer = null;
    }

    step1PanoramaViewer = window.pannellum.viewer('heritageStep1Panorama', {
      default: {
        firstScene: 'frontGate',
        sceneFadeDuration: 700,
        autoLoad: true,
        showControls: true,
        autoRotate: -2
      },
      scenes: {
        frontGate: {
          type: 'equirectangular',
          panorama: panoramaFrontGate,
          pitch: 1.8,
          yaw: -10.2,
          hfov: 150,
          hotSpots: [
            {
              pitch: -10,
              yaw: 90,
              type: 'scene',
              text: 'Move to right-side front gate view',
              sceneId: 'rightFrontGate',
              targetPitch: -20,
              targetYaw: 90,
              targetHfov: 100,
              cssClass: 'tour-ground-hotspot'
            }
          ]
        },
        rightFrontGate: {
          type: 'equirectangular',
          panorama: panoramaRightFrontGate,
          pitch: -20,
          yaw: 90,
          hfov: 100,
          hotSpots: [
            {
              pitch: -11,
              yaw: -89,
              type: 'scene',
              text: 'Return to front gate view',
              sceneId: 'frontGate',
              targetPitch: -20,
              targetYaw: -90,
              targetHfov: 100,
              cssClass: 'tour-ground-hotspot'
            }
          ]
        }
      }
    });
  }

  function renderProgress() {
    if (state.currentStop <= 0) {
      return '';
    }

    return '<section class="heritage-progress">' +
      '<div class="heritage-progress__top">' +
        '<p class="heritage-progress__title">The Underground Cemetery</p>' +
        '<p class="heritage-progress__meta">Stop ' + state.currentStop + ' of 10 · ' + escapeHtml(STOPS[state.currentStop - 1].short) + '</p>' +
        '<button type="button" class="heritage-progress__action" data-action="toggle-access">Accessibility</button>' +
      '</div>' +
      '<div class="heritage-progress__segments">' + STOPS.map(function (stop) {
        var complete = !!state.completedStops[stop.id];
        var current = state.currentStop === stop.id;
        var canJump = complete;
        return '<button type="button" class="heritage-segment ' + (complete ? 'is-complete ' : '') + (current ? 'is-current' : '') + '" data-action="jump-stop" data-stop="' + stop.id + '" ' + (!canJump ? 'disabled' : '') + '>' +
          '<span class="heritage-segment__bar"></span><span>' + stop.id + '</span></button>';
      }).join('') + '</div>' +
    '</section>';
  }

  function renderAccessPanel() {
    return '<aside class="heritage-access" ' + (state.accessibilityOpen ? '' : 'hidden') + '>' +
      '<div class="heritage-access__header"><p class="heritage-label heritage-small">Accessibility Settings</p><button type="button" class="heritage-inline-button" data-action="close-access">Close</button></div>' +
      '<div class="heritage-access__body heritage-stack">' +
        '<div class="heritage-stack"><p class="heritage-small">Text Size</p><div class="heritage-access__grid">' + ['sm', 'md', 'lg', 'xl'].map(function (size) {
          return '<button type="button" class="heritage-option ' + (state.fontSize === size ? 'is-active' : '') + '" data-action="set-font-size" data-size="' + size + '">' + size.toUpperCase() + '</button>';
        }).join('') + '</div></div>' +
        '<button type="button" class="heritage-toggle ' + (state.highContrast ? 'is-active' : '') + '" data-action="toggle-contrast">High Contrast</button>' +
        '<button type="button" class="heritage-toggle ' + (state.textOnly ? 'is-active' : '') + '" data-action="toggle-text-only">Text-Only Mode</button>' +
        '<p class="heritage-copy">This trail supports a readable text scale, higher contrast, and text-only mode so the experience remains usable for more visitors.</p>' +
      '</div>' +
    '</aside>';
  }

  function renderStop1() {
    return renderStopHero({
      stopNum: 1,
      title: 'Orientation',
      subtitle: 'Begin at the gates — the threshold between the everyday world and a space shaped by centuries of devotion, mourning, and community memory.',
      imageSrc: stop1Image,
      headerClass: 'heritage-stop-centered-block',
      imageAlt: 'Historic stone cemetery entrance gate framed by aged trees, opening to the heritage site grounds'
    }) +
    '<div class="heritage-stop-body">' +
      '<div class="heritage-grid-4 heritage-stop-centered-block">' +
        '<div class="heritage-stat"><span class="heritage-stat__label heritage-small">Established</span><span class="heritage-stat__value">Year 1845</span></div>' +
        '<div class="heritage-stat"><span class="heritage-stat__label heritage-small">Site Area</span><span class="heritage-stat__value">Approximately 1 hectare</span></div>' +
        '<div class="heritage-stat"><span class="heritage-stat__label heritage-small">Heritage Status</span><span class="heritage-stat__value">National Historical Landmark</span></div>' +
        '<div class="heritage-stat"><span class="heritage-stat__label heritage-small">Annual Visitors</span><span class="heritage-stat__value">15,600</span></div>' +
      '</div>' +
      '<section class="heritage-stop-feature">' +
      (!state.textOnly
        ? '<div class="heritage-hero__media heritage-stop-panorama"><p class="heritage-label heritage-small">360 View — Front Gate Orientation</p><div class="heritage-hero__panorama"><div id="heritageStep1Panorama" class="heritage-hero__panorama-view" role="img" aria-label="360 view of the Nagcarlan Underground Cemetery front gate"></div></div><div class="heritage-hero__media-bar"><span>Drag to look around the front gate. Use the hotspot to move to the right-side viewpoint.</span></div></div>'
        : '') +
      '<div class="heritage-stop-feature__copy heritage-stack heritage-copy">' +
        '<p>The front gate is the opening frame of the Nagcarlan Underground Cemetery. From this point, visitors can immediately understand the site as a planned circular enclosure rather than a single isolated structure. The entrance, the perimeter wall, the central chapel, and the approach path all work together to prepare visitors for a place shaped by ritual, memory, and community history.</p>' +
        '<p>Historical records identify 1845 as the year the cemetery was established under the supervision of Fr. Vicente Velloc. It was built south of the town center in line with 19th-century health regulations that encouraged burial grounds to be placed outside densely populated areas. That location gave the cemetery a solemn distance from everyday life while keeping it closely tied to the people of Nagcarlan.</p>' +
        '<p>This orientation point also helps explain why the site matters beyond architecture. The cemetery functioned as a Catholic burial ground centered on a chapel for funeral rites, yet over time it also became connected to major historical events, including revolutionary activity and later wartime use. Even before entering deeper into the grounds, the gate already introduces the cemetery as both sacred space and historical landmark.</p>' +
        '<p>The materials visible here reinforce that sense of threshold. The high arch, iron gate, masonry walls, and formal path inward separate the public road from the enclosed world of the cemetery. Beginning the trail here allows visitors to recognize the site\'s layout, scale, and atmosphere first, making the later stops easier to understand in context.</p>' +
      '</div>' +
      '</section>' +
      renderDivider() +
      renderSectionLabel('Deep Dive — Explore Further', 'heritage-stop-centered-block') +
      renderAccordion('stop1-deep', [
        { id: 'layout', title: 'Reading the Layout from the Gate', content: '<p>From the entrance, visitors can immediately understand the site\'s one-hectare circular plan. The perimeter wall encloses rows of niches, while the central chapel anchors the composition along a straight approach. This makes the gate more than an entry point: it is the first place where the logic of the cemetery becomes visible.</p><p>Orientation matters because the Nagcarlan Underground Cemetery is not simply a crypt hidden below ground. It is an integrated funerary complex composed of an entrance arch, circular walled enclosure, pathways, chapel, and the subterranean chamber below. The front gate is where these elements first come together in a single frame.</p>' },
        { id: '1845', title: 'Why the Cemetery Was Built Here in 1845', content: '<p>Historical accounts identify 1845 as the year the cemetery was established under Fr. Vicente Velloc. It was intentionally placed outside the town center, following 19th-century sanitary regulations intended to reduce the spread of disease by moving burials away from dense residential areas.</p><p>That decision shaped the visitor experience that remains today. The cemetery is close enough to Nagcarlan to stay part of community memory, yet separate enough to feel solemn and self-contained. Approaching the gate still communicates that original balance between public access and sacred distance.</p>' },
        { id: 'landmark', title: 'Why the Gate Belongs to a National Historical Landmark', content: '<p>The cemetery is recognized as a National Historical Landmark, and the front gate is one of the clearest expressions of that status because it preserves the site\'s scale, form, and ceremonial approach. It is the public face of a place later associated not only with burial practice but also with the Philippine Revolution, the Philippine-American War, and World War II.</p><p>For orientation purposes, the key point is simple: the gate prepares visitors to read the site as both architecture and history. Before anyone reaches the chapel or underground chamber, the entrance already introduces the cemetery as a landmark shaped by faith, memory, and national events.</p>' },
        { id: 'threshold', title: 'Why Orientation Starts at the Threshold', content: '<p>Heritage trails often begin where visitors can best grasp a site\'s overall organization. At Nagcarlan, that place is the front gate. From here, the scale of the enclosure, the material character of the masonry, and the visual axis toward the chapel can all be understood before attention shifts to individual objects or stories.</p><p>Beginning here also respects the original rhythm of entry. The site was designed so that movement inward happened deliberately — from the public road, through the gate, across the open court, and only then toward the chapel and the underground crypt. Orientation at the threshold helps modern visitors experience that sequence with the same sense of progression.</p>' }
      ], 'heritage-stop-centered-block') +
      renderDivider() +
      (!state.textOnly ? renderSectionLabel('Photo Gallery — The Site Through the Lens', 'heritage-stop-centered-block') + '<div class="heritage-stop-gallery">' + renderGallery('stop1') + '</div>' : '') +
      '<div style="margin-top:1.5rem;" class="heritage-callout heritage-stop-centered-block"><div class="heritage-callout__icon">i</div><div><p class="heritage-label heritage-small">Did You Know?</p><p class="heritage-copy">The Underground Cemetery is one of only three circular colonial-era burial enclosures still in active heritage use in Southeast Asia. The others are located in Macau and Goa — reflecting the reach of the Spanish and Portuguese colonial networks that built and managed these sites.</p></div></div>' +
      renderEasyRead('stop1', [
        'This is the starting point of the heritage trail at the historic front gates.',
        'The cemetery was established around 1820 by the Augustinian religious order.',
        'The circular shape of the enclosure was a deliberate, meaningful design choice.',
        'The gate walls are made from local volcanic adobe stone.',
        'The site was declared a National Cultural Treasure in 1982.',
        'It is one of only three circular colonial-era burial enclosures still in use in Southeast Asia.'
      ], false, 'heritage-stop-centered-block') +
      renderNav(1) +
    '</div>';
  }

  function renderStop2() {
    return renderStopHero({
      stopNum: 2,
      title: 'Museum Registration & Visitor Guidance',
      subtitle: 'Before entering, register your visit and review the guidelines that protect both you and the heritage objects within.',
      imageSrc: 'https://images.unsplash.com/photo-1767938072548-112727a13266?w=1400&h=700&fit=crop&auto=format',
      imageAlt: 'Museum interior with display cases showing ancient artifacts and organized visitor pathways'
    }) +
    '<div class="heritage-stop-body">' +
      '<div class="heritage-grid-2">' +
        '<div class="heritage-stack">' +
          renderSectionLabel('Visitor Registration') +
          '<p class="heritage-copy">Complete this short registration to log your visit. Your information helps the heritage office track visitor numbers and improve facilities for future guests.</p>' +
          (state.registrationSubmitted
            ? '<div class="heritage-result is-success"><p class="heritage-card-button__title">Registration Confirmed</p><p class="heritage-copy">Welcome, ' + escapeHtml(state.registration.name || 'Visitor') + '. Your visit has been recorded. Enjoy the trail!</p><button type="button" class="heritage-inline-button" data-action="edit-registration">Edit Registration</button></div>'
            : '<form class="heritage-form" id="heritageRegistrationForm">' +
                '<div><label class="heritage-small">Full Name *</label><input type="text" required data-field="name" value="' + escapeHtml(state.registration.name) + '" /></div>' +
                '<div><label class="heritage-small">Email Address</label><input type="email" data-field="email" value="' + escapeHtml(state.registration.email) + '" /></div>' +
                '<div class="heritage-form-grid"><div><label class="heritage-small">Visit Date</label><input type="date" data-field="date" value="' + escapeHtml(state.registration.date) + '" /></div><div><label class="heritage-small">Group Size</label><select data-field="group">' + ['1', '2–5', '6–9', '10–20', '20+'].map(function (option) { return '<option value="' + option + '" ' + (state.registration.group === option ? 'selected' : '') + '>' + option + (option === '1' ? ' person' : ' people') + '</option>'; }).join('') + '</select></div></div>' +
                '<label class="heritage-form-check"><input type="checkbox" data-field="access" ' + (state.registration.access ? 'checked' : '') + ' /><span class="heritage-copy">I require accessibility accommodations (audio guide, wheelchair access, large-print materials).</span></label>' +
                '<button type="submit" class="heritage-button">Complete Registration</button>' +
              '</form>') +
        '</div>' +
        '<div class="heritage-stack">' +
          renderSectionLabel('Opening Hours') +
          '<div class="heritage-rule">' + [
            ['Tuesday – Friday', '8:00 AM – 5:00 PM'],
            ['Saturday – Sunday', '8:00 AM – 6:00 PM'],
            ['Monday', 'Closed (Conservation Day)'],
            ['Last Entry', 'One hour before closing'],
            ['Guided Tours', '9:00 AM · 11:00 AM · 2:00 PM']
          ].map(function (row) { return '<div class="heritage-nav__row"><span class="heritage-copy">' + row[0] + '</span><strong>' + row[1] + '</strong></div>'; }).join('') + '</div>' +
          renderSectionLabel('Admission Fees') +
          '<div class="heritage-rule">' + [
            ['General Admission', '₱ 50'],
            ['Students (with ID)', '₱ 30'],
            ['Senior Citizens / PWD', '₱ 20'],
            ['Children under 7', 'FREE'],
            ['Group (10 or more)', '₱ 40 / person']
          ].map(function (row) { return '<div class="heritage-nav__row"><span class="heritage-copy">' + row[0] + '</span><strong>' + row[1] + '</strong></div>'; }).join('') + '</div>' +
        '</div>' +
      '</div>' +
      renderDivider() +
      renderSectionLabel('Visitor Guidelines — Please Read Before Entering') +
      renderAccordion('stop2-rules', [
        { id: 'r1', title: 'Photography & Recording', content: '<p>Photography is warmly encouraged as a means of engaging with the heritage site. However, flash photography is strictly prohibited — the sudden light can damage pigments in historical artifacts and disturb the atmospheric integrity of the space. Video recording is permitted in all open areas. Drone photography requires advance written authorization from the heritage office.</p>' },
        { id: 'r2', title: 'Artifact Handling', content: '<p>Please do not touch, lean against, or place objects on any displayed artifact, architectural element, or grave marker. Even gentle contact transfers oils and moisture that accelerate deterioration. Point and observe from a respectful distance. If you wish to examine an artifact closely, guided white-glove sessions are available on request.</p>' },
        { id: 'r3', title: 'Noise & Conduct', content: '<p>The Underground Cemetery is simultaneously a heritage learning space and an active place of religious and community remembrance. Visitors are asked to maintain a tone appropriate to both. Loud conversation, music playback without headphones, and disruptive behavior are not permitted. Children are welcome and should be gently guided through the experience.</p>' },
        { id: 'r4', title: 'Food, Drink & Smoking', content: '<p>Food and beverages are not permitted within the museum or church buildings. Water bottles with secure lids are the sole exception. Eating and drinking may be enjoyed in the designated rest area near the main gate. The entire site is a non-smoking zone in compliance with national heritage preservation law.</p>' },
        { id: 'r5', title: 'Accessibility & Support', content: '<p>Wheelchair-accessible pathways connect all major stops on this trail. Audio guides, large-print brochures, and tactile maps are available at the registration desk. A trained accessibility guide is available on Saturdays and Sundays from 10:00 AM to 3:00 PM. Please notify staff of any accommodation needs upon arrival.</p>' },
        { id: 'r6', title: 'Emergency Procedures', content: '<p>Emergency exits are marked with green signage throughout the complex. The nearest hospital is 800 meters from the main gate. Site staff are first-aid certified. In case of earthquake: move away from walls and monuments and follow staff direction to the designated assembly area near the main gate archway.</p>' }
      ]) +
      renderEasyRead('stop2', [
        'Write your name and details when you arrive at the museum entrance.',
        'Opening hours are Tuesday to Sunday. The museum is closed on Mondays.',
        'Do not touch any artifacts or grave markers inside the site.',
        'Be quiet and respectful throughout — this is a place of history and remembrance.',
        'Ask for a large-print guide, audio guide, or wheelchair access at the desk.'
      ]) +
      renderNav(2) +
    '</div>';
  }

  function renderStop3() {
    var filteredArtifacts = artifacts.filter(function (artifact) {
      return state.activeArtifactCategory === 'all' || artifact.category === state.activeArtifactCategory;
    });
    var selectedArtifact = artifacts.filter(function (artifact) { return artifact.id === state.selectedArtifactId; })[0] || null;

    return renderStopHero({
      stopNum: 3,
      title: 'Museum Artifact Interpretation',
      subtitle: 'Each object in the collection is a thread in a larger tapestry of memory — connecting burial customs, community identity, and the story of this site.',
      imageSrc: 'https://images.unsplash.com/photo-1767938072548-112727a13266?w=1400&h=700&fit=crop&auto=format',
      imageAlt: 'Museum display cases containing ancient burial artifacts and ceremonial objects under warm archival lighting'
    }) +
    '<div class="heritage-stop-body">' +
      '<p class="heritage-copy">The museum holds over 300 objects spanning 700 years of continuous habitation at this site. Below are six key pieces — each selected because it illuminates a different dimension of the burial customs, beliefs, and community life that shaped this place. Select any artifact to read the full interpretation.</p>' +
      '<div class="heritage-chip-row" style="margin-top:1rem;">' + ['all', 'pre-colonial', 'colonial', 'religious'].map(function (category) {
        var labels = { all: 'All Artifacts', 'pre-colonial': 'Pre-Colonial', colonial: 'Colonial Era', religious: 'Religious' };
        return '<button type="button" class="heritage-chip ' + (state.activeArtifactCategory === category ? 'is-active' : '') + '" data-action="set-artifact-category" data-category="' + category + '">' + labels[category] + '</button>';
      }).join('') + '</div>' +
      '<div class="heritage-grid-3" style="margin-top:1rem;">' + filteredArtifacts.map(function (artifact) {
        var selected = state.selectedArtifactId === artifact.id;
        return '<button type="button" class="heritage-card-button ' + (selected ? 'is-active' : '') + '" data-action="select-artifact" data-artifact="' + artifact.id + '" aria-expanded="' + (selected ? 'true' : 'false') + '">' +
          '<span class="heritage-card-button__meta heritage-small">' + escapeHtml(artifact.period) + '</span>' +
          '<p class="heritage-card-button__title">' + escapeHtml(artifact.name) + '</p>' +
          '<p class="heritage-card-button__copy">' + escapeHtml(artifact.short) + '</p>' +
          '<span class="heritage-card-button__hint heritage-small">' + (selected ? 'Collapse' : 'Read Interpretation') + '</span>' +
        '</button>';
      }).join('') + '</div>' +
      (selectedArtifact ? '<div class="heritage-detail" style="margin-top:1rem;"><div class="heritage-nav__row"><div><p class="heritage-label heritage-small">' + escapeHtml(selectedArtifact.period) + '</p><h3 class="heritage-card-button__title">' + escapeHtml(selectedArtifact.name) + '</h3></div><button type="button" class="heritage-inline-button" data-action="close-artifact">Close</button></div><p class="heritage-copy" style="margin-top:0.8rem;">' + escapeHtml(selectedArtifact.detail) + '</p></div>' : '') +
      renderDivider() +
      '<div class="heritage-callout"><div class="heritage-callout__icon">i</div><div><p class="heritage-label heritage-small">A Note on Interpretation</p><p class="heritage-copy">Artifacts do not speak for themselves — they are interpreted through the frameworks we bring to them. The interpretations here reflect current archaeological and historical scholarship, but they remain provisional. New excavations, new analytical techniques, and new scholarly conversations continue to refine and revise what we understand about this collection. Heritage is a living conversation, not a closed archive.</p></div></div>' +
      renderEasyRead('stop3', [
        'The museum holds over 300 objects spanning 700 years of history.',
        'Old burial jars were used long before the church was built.',
        'Iron crosses and carved stone markers were used during the colonial period.',
        'Religious figures were buried with people as spiritual protection.',
        'Old handwritten registers record the names of people who were buried here.',
        'Click on any artifact card to read the full explanation.'
      ]) +
      renderNav(3) +
    '</div>';
  }

  function renderStop4() {
    var answered = Object.keys(state.quizAnswers).length;
    var score = QUIZ_QUESTIONS.filter(function (question) { return state.quizAnswers[question.id] === question.answer; }).length;

    return renderStopHero({
      stopNum: 4,
      title: 'Museum Quiz Checkpoint',
      subtitle: 'Before leaving the museum, take a moment to consolidate what you have learned. Three questions — no pressure, just reflection.',
      badge: 'Activity Checkpoint'
    }) +
    '<div class="heritage-stop-body">' +
      '<div class="heritage-rule"><div class="heritage-nav__row">' + renderMiniProgress(QUIZ_QUESTIONS, state.quizAnswers, state.quizSubmitted) + '<span class="heritage-small">' + answered + '/' + QUIZ_QUESTIONS.length + ' answered</span></div></div>' +
      '<div class="heritage-stack" style="margin-top:1rem;">' + renderQuizQuestions(QUIZ_QUESTIONS, state.quizAnswers, state.quizSubmitted, 'quiz') + '</div>' +
      (!state.quizSubmitted
        ? '<button type="button" class="heritage-button" data-action="submit-quiz" ' + (answered < QUIZ_QUESTIONS.length ? 'disabled' : '') + ' style="margin-top:1rem;">Submit Quiz</button>'
        : '<div class="heritage-result" style="margin-top:1rem;"><p class="heritage-card-button__title">' + score + '/' + QUIZ_QUESTIONS.length + ' Correct</p><div style="margin-top:0.6rem;">' + renderMiniProgress(QUIZ_QUESTIONS, state.quizAnswers, true) + '</div><p class="heritage-copy" style="margin-top:0.8rem;">' + escapeHtml(score === 3 ? 'Excellent. You have a strong grasp of the museum\'s artifacts and their cultural significance. Continue to the next stop.' : score === 2 ? 'Good effort. Review the artifact cards in Stop 3 if you\'d like to revisit the material.' : 'Take a moment to re-read Stop 3. The connections between artifacts and burial customs are central to understanding the whole site.') + '</p><button type="button" class="heritage-inline-button" data-action="retry-quiz">Retry Quiz</button></div>') +
      renderDivider() +
      '<div class="heritage-callout"><div class="heritage-callout__icon">Tip</div><div><p class="heritage-label heritage-small">Learning Tip</p><p class="heritage-copy">The best way to consolidate heritage learning is to try to explain what you have seen to someone else. As you walk to the next stop, describe one artifact to a companion — or simply speak it aloud to yourself. The act of narrating deepens retention.</p></div></div>' +
      renderEasyRead('stop4', [
        'This is a short quiz with 3 questions about what you saw in the museum.',
        'Choose the best answer for each question, then press Submit.',
        'You will see which answers were correct after submitting.',
        'You can retry the quiz as many times as you like.',
        'There is no grade — this is just a chance to reflect on what you learned.'
      ]) +
      renderNav(4) +
    '</div>';
  }

  function renderStop5() {
    return renderStopHero({
      stopNum: 5,
      title: 'Return to the Gates — Cemetery History',
      subtitle: 'We return to the approach to understand the cemetery as a landscape shaped by six centuries of history — not merely as a burial ground.',
      imageSrc: 'https://images.unsplash.com/photo-1776441553967-be9d8cd57bdf?w=1400&h=700&fit=crop&auto=format',
      imageAlt: 'Stone cemetery pathway lined with aged grave markers leading toward the historic church under an overcast sky'
    }) +
    '<div class="heritage-stop-body">' +
      '<div class="heritage-grid-2"><div class="heritage-stack heritage-copy"><p>The cemetery was not built all at once. It grew — through epidemics, earthquakes, political upheavals, and the quiet accumulation of ordinary deaths — into the complex space you are walking through today. Each crisis left its mark. Each rebuilding added a layer.</p><p>The path from the gate to the church was never incidental. It was choreographed: a processional space that prepared the living for the threshold of the sacred, and the dead for their final passage. Walking it today, you are retracing a route worn smooth by centuries of mourning.</p></div><div class="heritage-stack heritage-copy"><p>The circular enclosure reflects both practical necessity and symbolic intention. As a bounded, consecrated space, it created a clear demarcation: here is the realm of the dead; there is the realm of the living. The boundary itself — the wall, the gate, the threshold — is the site\'s first and most fundamental heritage object.</p><p>Explore the interactive timeline below to walk through the key events that shaped this space. Each event is a chapter in a story that is still being written — by archaeologists, conservators, community members, and visitors like you.</p></div></div>' +
      renderDivider() +
      renderSectionLabel('Historical Timeline — Click Any Event to Expand') +
      '<div class="heritage-stack">' + cemeteryEvents.map(function (event, index) {
        var open = state.expandedEvent === index;
        return '<button type="button" class="heritage-line-toggle heritage-card ' + (open ? 'is-active' : '') + '" data-action="toggle-event" data-index="' + index + '" aria-expanded="' + (open ? 'true' : 'false') + '"><div><p class="heritage-label heritage-small">' + escapeHtml(event.year) + '</p><p class="heritage-card-button__title">' + escapeHtml(event.title) + '</p>' + (open ? '<p class="heritage-copy" style="margin-top:0.75rem;">' + escapeHtml(event.desc) + '</p>' : '') + '</div><span class="heritage-small">' + (open ? 'Hide' : 'Open') + '</span></button>';
      }).join('') + '</div>' +
      renderDivider() +
      renderSectionLabel('Site Facts at a Glance') +
      '<div class="heritage-grid-4"><div class="heritage-stat"><span class="heritage-stat__label heritage-small">Wall Perimeter</span><span class="heritage-stat__value">~320 metres</span></div><div class="heritage-stat"><span class="heritage-stat__label heritage-small">Years of Use</span><span class="heritage-stat__value">300+ Years</span></div><div class="heritage-stat"><span class="heritage-stat__label heritage-small">Total Burials</span><span class="heritage-stat__value">Est. 12,000+</span></div><div class="heritage-stat"><span class="heritage-stat__label heritage-small">Declared Treasure</span><span class="heritage-stat__value">1982</span></div></div>' +
      (!state.textOnly ? renderDivider() + renderSectionLabel('The Grounds — Then and Now') + renderGallery('stop5') : '') +
      renderEasyRead('stop5', [
        'The cemetery was started around 1706 by the Augustinian religious order.',
        'A major cholera epidemic in 1820 filled the cemetery quickly.',
        'A big earthquake in 1863 damaged parts of the site and changed how the bell tower was built.',
        'The site was used during the Philippine Revolution and World War II.',
        'In 1982, the government declared the site a National Cultural Treasure.',
        'Click on any timeline event to read the full story.'
      ]) +
      renderNav(5) +
    '</div>';
  }

  function renderStop6() {
    return renderStopHero({
      stopNum: 6,
      title: 'Front of the Church',
      subtitle: 'The facade is the site\'s most visible declaration of identity — architectural scripture written in stone and mortar across centuries of use and repair.',
      imageSrc: 'https://images.unsplash.com/photo-1774096092382-9b987d47debf?w=1400&h=700&fit=crop&auto=format',
      imageAlt: 'Historic colonial church exterior with thick stone walls, baroque decorative elements, and a prominent separate bell tower'
    }) +
    '<div class="heritage-stop-body">' +
      '<div class="heritage-grid-2"><div class="heritage-stack heritage-copy"><p>The church exterior reveals a Spanish Colonial Baroque sensibility: thick walls built to withstand earthquakes and typhoons, decorative niches housing carved saints, and a façade that served as both proclamation and protection. It is architecture as theology — every element carrying meaning beyond its structural function.</p><p>What makes this facade particularly significant is its survival. Many colonial-era Philippine churches were destroyed by earthquakes, fires, or wartime bombardment. This one has endured — repaired, modified, and restored, but fundamentally continuous with its 18th-century origin.</p></div><div class="heritage-grid-2"><div class="heritage-stat"><span class="heritage-stat__label heritage-small">Architectural Style</span><span class="heritage-stat__value">Spanish Colonial Baroque</span></div><div class="heritage-stat"><span class="heritage-stat__label heritage-small">Primary Material</span><span class="heritage-stat__value">Adobe & Fired Brick</span></div><div class="heritage-stat"><span class="heritage-stat__label heritage-small">Construction Period</span><span class="heritage-stat__value">18th–19th Century</span></div><div class="heritage-stat"><span class="heritage-stat__label heritage-small">Wall Thickness</span><span class="heritage-stat__value">1.2–1.8 metres</span></div><div class="heritage-stat"><span class="heritage-stat__label heritage-small">Facade Height</span><span class="heritage-stat__value">Approx. 14 metres</span></div><div class="heritage-stat"><span class="heritage-stat__label heritage-small">Bell Tower</span><span class="heritage-stat__value">Detached (post-1863)</span></div></div></div>' +
      renderDivider() +
      renderSectionLabel('Architectural Features — Click Each Element to Learn More') +
      '<div class="heritage-grid-2">' + churchFeatures.map(function (feature) {
        var open = state.activeFeatureId === feature.id;
        return '<button type="button" class="heritage-card-button ' + (open ? 'is-active' : '') + '" data-action="toggle-feature" data-feature="' + feature.id + '" aria-expanded="' + (open ? 'true' : 'false') + '"><div class="heritage-nav__row"><span class="heritage-label heritage-small">' + feature.num + '</span><span class="heritage-small">' + (open ? 'Collapse' : 'Expand') + '</span></div><p class="heritage-card-button__title">' + escapeHtml(feature.label) + '</p><p class="heritage-card-button__copy">' + escapeHtml(feature.short) + '</p>' + (open ? '<p class="heritage-copy" style="margin-top:0.8rem;">' + escapeHtml(feature.detail) + '</p>' : '') + '</button>';
      }).join('') + '</div>' +
      renderDivider() +
      renderSectionLabel('Architecture Glossary — Key Terms') +
      renderAccordion('stop6-glossary', [
        { id: 'baroque', title: 'Baroque', content: '<p>A dramatic, ornate architectural and artistic style originating in 17th-century Europe and spread globally through Catholic missionary activity. In the Philippines, Baroque was adapted to local conditions — simplified in ornament but retained in massing and proportion.</p>' },
        { id: 'buttress', title: 'Buttress', content: '<p>An external support structure that transfers the weight and outward thrust of walls, arches, or vaulted ceilings to the ground. Lateral buttresses are visible on this church.</p>' },
        { id: 'nave', title: 'Nave', content: '<p>The central aisle of a church, typically the largest interior space. The word derives from the Latin navis, ship, reflecting an early Christian metaphor of the church as a vessel carrying the faithful.</p>' },
        { id: 'adobe', title: 'Adobe (Philippine)', content: '<p>In Philippine architecture, adobe refers to a volcanic tuff — a soft, light-colored stone quarried from deposits formed by ancient volcanic ash. It hardens with exposure to air.</p>' }
      ]) +
      renderEasyRead('stop6', [
        'The church was built in a Spanish colonial style with thick stone walls.',
        'Thick walls help protect the building from earthquakes and typhoons.',
        'The bell tower stands separately from the main church — this was done after the 1863 earthquake.',
        'Three carved niches in the facade held statues of saints.',
        'Click on each architectural feature card to learn what it is and why it was built that way.'
      ]) +
      renderNav(6) +
    '</div>';
  }

  function renderStop7() {
    var material = churchMaterials[state.activeMaterialId] || churchMaterials.molave;
    return renderStopHero({
      stopNum: 7,
      title: 'Inside the Church',
      subtitle: 'The interior speaks a different language than the exterior — one of material honesty, human scale, and the accumulated devotion of generations.',
      imageSrc: 'https://images.unsplash.com/photo-1763305121224-897ca24f3a5e?w=1400&h=700&fit=crop&auto=format',
      imageAlt: 'Historic church interior showing ancient wooden ceiling beams, stone-tiled floor worn smooth with age, and altar visible at the far end of the nave'
    }) +
    '<div class="heritage-stop-body">' +
      '<div class="heritage-grid-2"><div class="heritage-stack heritage-copy"><p>The nave is defined by its original materials: hand-hewn hardwood beams from Philippine forests spanning a width that required centuries-old carpentry techniques. These timbers have outlasted the men who shaped them — and will likely outlast the institution that commissioned them.</p><p>The floor, worn smooth by generations of bare feet and kneeling bodies, was originally laid in local stone. In many sections it retains its original surface — a tactile archive of use and devotion compressed into millimeters of polish.</p></div><div class="heritage-stack heritage-copy"><p>The walls, lime-plastered over adobe block, retain traces of earlier decorative schemes: ghost outlines of frescoes, patches where repairs were made in different eras — the visible stratigraphy of the building\'s long life. These imperfections are not flaws; they are the building\'s autobiography.</p><p>The interior is an argument about what endures: not particular ornament or finish, but structural integrity and the capacity of local materials — chosen thoughtfully, worked skillfully — to carry the weight of centuries.</p></div></div>' +
      renderDivider() +
      renderSectionLabel('Original Materials — Select Each to Explore') +
      '<div class="heritage-chip-row">' + Object.keys(churchMaterials).map(function (key) {
        return '<button type="button" class="heritage-chip ' + (state.activeMaterialId === key ? 'is-active' : '') + '" data-action="set-material" data-material="' + key + '">' + escapeHtml(churchMaterials[key].label) + '</button>';
      }).join('') + '</div>' +
      '<div class="heritage-detail" style="margin-top:1rem;"><div class="heritage-nav__row"><div><p class="heritage-label heritage-small">' + escapeHtml(material.type) + '</p><h3 class="heritage-card-button__title">' + escapeHtml(material.label) + '</h3></div><span class="heritage-pill">Original Material</span></div><p class="heritage-copy" style="margin-top:0.8rem;">' + escapeHtml(material.desc) + '</p><p class="heritage-label heritage-small" style="margin-top:0.8rem;">' + escapeHtml(material.properties) + '</p></div>' +
      renderDivider() +
      renderSectionLabel('Interior Observation Points — A Virtual Walk-Through') +
      '<div class="heritage-accordion">' + churchInteriorPoints.map(function (point, index) {
        var open = state.expandedInteriorPoint === index;
        return '<div class="heritage-accordion__item"><button type="button" class="heritage-accordion__button" data-action="toggle-interior-point" data-index="' + index + '" aria-expanded="' + (open ? 'true' : 'false') + '"><span><span class="heritage-label heritage-small">' + escapeHtml(point.num) + '</span><span class="heritage-card-button__title" style="display:block;margin-top:0.35rem;">' + escapeHtml(point.name) + '</span></span><span class="heritage-small">' + (open ? 'Hide' : 'Open') + '</span></button>' + (open ? '<div class="heritage-accordion__content">' + escapeHtml(point.desc) + '</div>' : '') + '</div>';
      }).join('') + '</div>' +
      renderEasyRead('stop7', [
        'The inside of the church uses very old Philippine wood types: molave, narra, and ipil.',
        'Each wood type was chosen for a specific reason — hardness, rot resistance, or strength.',
        'The stone floor has been worn smooth by millions of people walking over many years.',
        'The walls show signs of old paintings and repairs from different periods.',
        'Click on a material name to read what it is and why it was used.',
        'Click on the numbered interior points to take a virtual walk-through of the church.'
      ]) +
      renderNav(7) +
    '</div>';
  }

  function renderStop8() {
    return renderStopHero({
      stopNum: 8,
      title: 'Underground Crypts',
      subtitle: 'Beneath the church floor, the stone chambers preserve the remains of priests who served this parish — and hold the memory of events that shaped the site\'s identity.',
      imageSrc: 'https://images.unsplash.com/photo-1777792405713-e0a895c8457c?w=1400&h=700&fit=crop&auto=format',
      imageAlt: 'Underground stone crypt with arched masonry walls and narrow passages, dramatically lit to reveal burial niches carved into the historic stonework'
    }) +
    '<div class="heritage-stop-body">' +
      '<div class="heritage-grid-2"><div class="heritage-stack heritage-copy"><p>The underground crypts are the most intimate space on the trail — the place where the site\'s institutional history becomes most personal. Carved into the bedrock beneath the nave floor, these chambers were reserved for the clergy: an honor system encoded in stone and position.</p><p>Being buried within the church itself was the highest mark of institutional belonging. It meant you had given your life to this community and this place, and the community had decided your body would remain here in perpetuity — guarded by the same walls you had guarded in life.</p></div><div class="heritage-stack heritage-copy"><p>The priests interred here were not merely ecclesiastical figures. In the colonial period, the parish priest was often the primary administrator of community life — governing birth, marriage, death, education, and much of local governance. Their burial beneath the congregation continued that role symbolically into eternity.</p><p>The crypts were also used during moments of crisis. Their underground position made them dry, cool, and structurally protected — qualities that made them useful for more than burial during times of instability.</p></div></div>' +
      renderDivider() +
      renderSectionLabel('Notable Interments — Click Each Profile to Read More') +
      '<div class="heritage-accordion">' + priests.map(function (priest) {
        var open = state.expandedPriestId === priest.id;
        return '<div class="heritage-accordion__item"><button type="button" class="heritage-accordion__button" data-action="toggle-priest" data-priest="' + priest.id + '" aria-expanded="' + (open ? 'true' : 'false') + '"><span><span class="heritage-card-button__title">' + escapeHtml(priest.name) + '</span><span class="heritage-label heritage-small" style="display:block;margin-top:0.3rem;">' + escapeHtml(priest.role) + ' · ' + escapeHtml(priest.years) + '</span><span class="heritage-copy" style="display:block;margin-top:0.4rem;">' + escapeHtml(priest.summary) + '</span></span><span class="heritage-small">' + (open ? 'Hide' : 'Open') + '</span></button>' + (open ? '<div class="heritage-accordion__content">' + escapeHtml(priest.detail) + '</div>' : '') + '</div>';
      }).join('') + '</div>' +
      renderDivider() +
      renderSectionLabel('The Crypts Through Time — Key Events') +
      '<div class="heritage-stack">' + cryptEvents.map(function (event, index) {
        var open = state.expandedCryptEvent === index;
        return '<button type="button" class="heritage-line-toggle heritage-card ' + (open ? 'is-active' : '') + '" data-action="toggle-crypt-event" data-index="' + index + '" aria-expanded="' + (open ? 'true' : 'false') + '"><span class="heritage-label heritage-small">' + escapeHtml(event.year) + '</span><span class="heritage-copy">' + escapeHtml(event.event) + '</span><span class="heritage-small">' + (open ? 'Hide' : 'Open') + '</span></button>';
      }).join('') + '</div>' +
      '<div style="margin-top:1.5rem;" class="heritage-callout"><div class="heritage-callout__icon">i</div><div><p class="heritage-label heritage-small">On Sacred Remains</p><p class="heritage-copy">The physical remains in the underground crypts are not on public display. This is a heritage site, not a spectacle. The interpretive experience here is guided by written and material records, not by the remains themselves. Visitors are asked to approach this space with the same respect they would bring to any active place of religious remembrance.</p></div></div>' +
      renderEasyRead('stop8', [
        'The underground crypts are chambers built into the ground below the church floor.',
        'Priests who served the church were buried here as the highest honor the community could give.',
        'Three important priests are recorded as having been buried in these crypts.',
        'The crypts were also used to protect important documents during the Revolution and World War II.',
        'Click on a priest\'s name to read their full life story and contribution to the site.',
        'The physical remains are not on display — this space is treated with full respect.'
      ]) +
      renderNav(8) +
    '</div>';
  }

  function renderStop9() {
    var answered = Object.keys(state.assessAnswers).length;
    var score = ASSESSMENT_QUESTIONS.filter(function (question) { return state.assessAnswers[question.id] === question.answer; }).length;

    return renderStopHero({
      stopNum: 9,
      title: 'Final Assessment',
      subtitle: 'You have walked the full trail — from gate to crypt. This assessment asks you to connect the threads: artifacts, architecture, materials, and the memory that binds them into one story.',
      badge: 'Assessment'
    }) +
    '<div class="heritage-stop-body">' +
      '<div class="heritage-rule"><div class="heritage-nav__row">' + renderMiniProgress(ASSESSMENT_QUESTIONS, state.assessAnswers, state.assessSubmitted) + '<span class="heritage-small">' + answered + '/' + ASSESSMENT_QUESTIONS.length + '</span></div></div>' +
      '<div class="heritage-stack" style="margin-top:1rem;">' + renderQuizQuestions(ASSESSMENT_QUESTIONS, state.assessAnswers, state.assessSubmitted, 'assessment') + '</div>' +
      (!state.assessSubmitted
        ? '<button type="button" class="heritage-button" data-action="submit-assessment" ' + (answered < ASSESSMENT_QUESTIONS.length ? 'disabled' : '') + ' style="margin-top:1rem;">Submit Assessment (' + answered + '/' + ASSESSMENT_QUESTIONS.length + ')</button>'
        : '<div class="heritage-result" style="margin-top:1rem;"><p class="heritage-card-button__title">Assessment Complete</p><div style="margin-top:0.6rem;">' + renderMiniProgress(ASSESSMENT_QUESTIONS, state.assessAnswers, true) + '</div><p class="heritage-copy" style="margin-top:0.8rem;">' + escapeHtml(score === 5 ? 'Outstanding. You have demonstrated a comprehensive understanding of the site\'s history, architecture, material culture, and community memory. You carry the trail with you.' : score >= 4 ? 'Very good. A strong grasp of the site\'s main themes. Consider revisiting the sections where you found difficulty.' : score >= 3 ? 'A solid foundation. The heritage trail is rich — some details take more than one visit to fully absorb. We encourage you to revisit the stops and try again.' : 'Heritage learning is an ongoing process. We recommend walking through each stop once more. The site rewards careful, unhurried attention.') + '</p><button type="button" class="heritage-inline-button" data-action="retry-assessment">Retry Assessment</button></div>') +
      renderEasyRead('stop9', [
        'This is a final assessment with 5 questions covering the whole trail.',
        'Answer all 5 questions, then press Submit Assessment.',
        'You will see which answers were correct after submitting.',
        'You can retry the assessment as many times as you like.',
        'A high score means you are ready to guide others through the trail.'
      ]) +
      renderNav(9) +
    '</div>';
  }

  function renderStop10() {
    var selectedCount = Object.keys(state.finalChecklist).filter(function (key) { return state.finalChecklist[key]; }).length;

    return renderStopHero({
      stopNum: 10,
      title: 'Return to the Gates & Thank You',
      subtitle: 'The trail ends where it began. You return not to the same threshold, but with a different understanding of what lies behind it.',
      imageSrc: 'https://images.unsplash.com/photo-1776441553951-a52ee2228407?w=1400&h=700&fit=crop&auto=format',
      imageAlt: 'The heritage site gates at dusk, warm amber light falling across the stone archway as the trail completes its full circle',
      badge: 'Trail Complete'
    }) +
    '<div class="heritage-stop-body">' +
      '<div class="heritage-callout"><div class="heritage-callout__icon">✓</div><div><p class="heritage-label heritage-small">Heritage Trail — Complete</p><p class="heritage-card-button__title">The Underground Cemetery Heritage Trail</p><p class="heritage-copy">10 Stops · Accessible · Inclusive · Living Heritage</p></div></div>' +
      '<div class="heritage-grid-2" style="margin-top:1.5rem;"><div class="heritage-stack heritage-copy"><p>Thank you for walking the Underground Cemetery Heritage Trail. Whether you experienced this digitally or as part of a physical visit, you have engaged with a place that holds centuries of human memory in its stones, soil, and stories.</p><p>Heritage is not static. It grows each time a new visitor brings their questions, curiosity, and care to a place like this. Your visit is part of the site\'s ongoing story — a continuation of the very memory this trail exists to preserve.</p></div><div class="heritage-stack heritage-copy"><p>The gates you first passed through are the same gates you return to now — but you carry with you the museum\'s artifacts, the church\'s architecture, the materials that have outlasted their makers, and the names of priests whose work continues underground.</p><p>This trail is always here for you — digitally or physically — whenever you wish to return. Bring others. Bring new questions. The gates are always open.</p></div></div>' +
      renderDivider() +
      renderSectionLabel('What You Learned — Mark the Ideas That Stayed With You') +
      '<p class="heritage-copy">Tick the takeaways that resonated most. This is not graded — it is simply a reflection exercise.</p>' +
      '<div class="heritage-stack" style="margin-top:1rem;">' + finalTakeaways.map(function (item, index) {
        var active = !!state.finalChecklist[index];
        return '<button type="button" class="heritage-card-button ' + (active ? 'is-active' : '') + '" data-action="toggle-checklist" data-index="' + index + '" aria-pressed="' + (active ? 'true' : 'false') + '"><div class="heritage-nav__row"><span class="heritage-card-button__copy">' + escapeHtml(item) + '</span><span class="heritage-small">' + (active ? 'Selected' : 'Select') + '</span></div></button>';
      }).join('') + '</div>' +
      (selectedCount ? '<p class="heritage-label heritage-small" style="margin-top:0.8rem;">' + selectedCount + ' of ' + finalTakeaways.length + ' takeaways selected</p>' : '') +
      renderDivider() +
      renderSectionLabel('Your Journey — Trail at a Glance') +
      '<div class="heritage-grid-4"><div class="heritage-stat"><span class="heritage-stat__label heritage-small">Stops Completed</span><span class="heritage-stat__value">10 of 10</span></div><div class="heritage-stat"><span class="heritage-stat__label heritage-small">Years of History</span><span class="heritage-stat__value">700+ Years</span></div><div class="heritage-stat"><span class="heritage-stat__label heritage-small">Artifacts Explored</span><span class="heritage-stat__value">6 Featured</span></div><div class="heritage-stat"><span class="heritage-stat__label heritage-small">Community Memory</span><span class="heritage-stat__value">Ongoing</span></div></div>' +
      renderDivider() +
      renderSectionLabel('Continue Exploring') +
      '<div class="heritage-grid-3"><button type="button" class="heritage-card-button" data-action="direct-stop" data-stop="3">Review the Artifacts</button><button type="button" class="heritage-card-button" data-action="direct-stop" data-stop="8">Revisit the Crypts</button><button type="button" class="heritage-card-button" data-action="direct-stop" data-stop="9">Retake the Assessment</button></div>' +
      renderEasyRead('stop10', [
        'You have completed all 10 stops of the Underground Cemetery Heritage Trail.',
        'Tick the takeaways above to mark the ideas that meant the most to you.',
        'You can revisit any stop using the progress bar at the top of the page.',
        'Thank you for learning with us. The heritage of this place is now part of your story too.'
      ], true) +
      renderNav(10) +
    '</div>';
  }

  function renderStopContent() {
    if (state.currentStop === 0) {
      return renderHero();
    }

    var body = '';

    if (state.currentStop === 1) body = renderStop1();
    if (state.currentStop === 2) body = renderStop2();
    if (state.currentStop === 3) body = renderStop3();
    if (state.currentStop === 4) body = renderStop4();
    if (state.currentStop === 5) body = renderStop5();
    if (state.currentStop === 6) body = renderStop6();
    if (state.currentStop === 7) body = renderStop7();
    if (state.currentStop === 8) body = renderStop8();
    if (state.currentStop === 9) body = renderStop9();
    if (state.currentStop === 10) body = renderStop10();

    return '<section class="heritage-content"><article class="heritage-panel">' + body + '</article></section>';
  }

  function render() {
    setFontSize();
    document.body.classList.toggle('is-immersive', state.currentStop > 0);
    shell.innerHTML =
      '<a href="#heritageTrailMain" class="heritage-skip-link">Skip to main content</a>' +
      renderAccessPanel() +
      renderProgress() +
      '<main id="heritageTrailMain" class="heritage-main ' + (state.currentStop === 0 ? 'is-landing' : '') + '">' + renderStopContent() + '</main>';
    initStep1Panorama();
  }

  shell.addEventListener('click', function (event) {
    var trigger = event.target.closest('[data-action]');

    if (!trigger) {
      return;
    }

    var action = trigger.getAttribute('data-action');

    if (action === 'begin') {
      goToStop(1);
      return;
    }

    if (action === 'next') {
      goNext();
      return;
    }

    if (action === 'prev') {
      goPrev();
      return;
    }

    if (action === 'toggle-access') {
      state.accessibilityOpen = !state.accessibilityOpen;
      render();
      return;
    }

    if (action === 'close-access') {
      state.accessibilityOpen = false;
      render();
      return;
    }

    if (action === 'set-font-size') {
      state.fontSize = trigger.getAttribute('data-size') || 'md';
      render();
      return;
    }

    if (action === 'toggle-contrast') {
      state.highContrast = !state.highContrast;
      render();
      return;
    }

    if (action === 'toggle-text-only') {
      state.textOnly = !state.textOnly;
      render();
      return;
    }

    if (action === 'toggle-transcript') {
      state.showTranscript = !state.showTranscript;
      render();
      return;
    }

    if (action === 'jump-stop') {
      var stopId = Number(trigger.getAttribute('data-stop'));
      if (state.completedStops[stopId]) {
        goToStop(stopId);
      }
      return;
    }

    if (action === 'toggle-easy-read') {
      toggleEasyRead(trigger.getAttribute('data-key'));
      return;
    }

    if (action === 'toggle-accordion') {
      toggleAccordion(trigger.getAttribute('data-group'), trigger.getAttribute('data-key'));
      return;
    }

    if (action === 'gallery-step') {
      var galleryKey = trigger.getAttribute('data-gallery');
      var direction = trigger.getAttribute('data-direction');
      var items = galleryData[galleryKey] || [];
      if (items.length) {
        var current = state.galleries[galleryKey] || 0;
        transitionGallery(galleryKey, direction === 'prev' ? (current - 1 + items.length) % items.length : (current + 1) % items.length);
      }
      return;
    }

    if (action === 'gallery-select') {
      transitionGallery(trigger.getAttribute('data-gallery'), Number(trigger.getAttribute('data-index')));
      return;
    }

    if (action === 'set-artifact-category') {
      state.activeArtifactCategory = trigger.getAttribute('data-category') || 'all';
      state.selectedArtifactId = '';
      render();
      return;
    }

    if (action === 'select-artifact') {
      var artifactId = trigger.getAttribute('data-artifact');
      state.selectedArtifactId = state.selectedArtifactId === artifactId ? '' : artifactId;
      render();
      return;
    }

    if (action === 'close-artifact') {
      state.selectedArtifactId = '';
      render();
      return;
    }

    if (action === 'submit-quiz') {
      if (Object.keys(state.quizAnswers).length === QUIZ_QUESTIONS.length) {
        state.quizSubmitted = true;
        render();
      }
      return;
    }

    if (action === 'retry-quiz') {
      state.quizAnswers = {};
      state.quizSubmitted = false;
      render();
      return;
    }

    if (action === 'toggle-event') {
      var eventIndex = Number(trigger.getAttribute('data-index'));
      state.expandedEvent = state.expandedEvent === eventIndex ? null : eventIndex;
      render();
      return;
    }

    if (action === 'toggle-feature') {
      var featureId = trigger.getAttribute('data-feature');
      state.activeFeatureId = state.activeFeatureId === featureId ? '' : featureId;
      render();
      return;
    }

    if (action === 'set-material') {
      state.activeMaterialId = trigger.getAttribute('data-material') || 'molave';
      render();
      return;
    }

    if (action === 'toggle-interior-point') {
      var pointIndex = Number(trigger.getAttribute('data-index'));
      state.expandedInteriorPoint = state.expandedInteriorPoint === pointIndex ? null : pointIndex;
      render();
      return;
    }

    if (action === 'toggle-priest') {
      var priestId = trigger.getAttribute('data-priest');
      state.expandedPriestId = state.expandedPriestId === priestId ? '' : priestId;
      render();
      return;
    }

    if (action === 'toggle-crypt-event') {
      var cryptIndex = Number(trigger.getAttribute('data-index'));
      state.expandedCryptEvent = state.expandedCryptEvent === cryptIndex ? null : cryptIndex;
      render();
      return;
    }

    if (action === 'submit-assessment') {
      if (Object.keys(state.assessAnswers).length === ASSESSMENT_QUESTIONS.length) {
        state.assessSubmitted = true;
        render();
      }
      return;
    }

    if (action === 'retry-assessment') {
      state.assessAnswers = {};
      state.assessSubmitted = false;
      render();
      return;
    }

    if (action === 'toggle-checklist') {
      var checklistIndex = trigger.getAttribute('data-index');
      state.finalChecklist[checklistIndex] = !state.finalChecklist[checklistIndex];
      render();
      return;
    }

    if (action === 'direct-stop') {
      goToStop(Number(trigger.getAttribute('data-stop')));
      return;
    }

    if (action === 'edit-registration') {
      state.registrationSubmitted = false;
      render();
    }
  });

  shell.addEventListener('change', function (event) {
    var target = event.target;

    if (!(target instanceof HTMLElement)) {
      return;
    }

    if (target.matches('[data-action="answer-question"]')) {
      var input = target;
      var kind = input.getAttribute('data-kind');
      var id = Number(input.getAttribute('data-id'));
      var value = input.value;

      if (kind === 'quiz' && !state.quizSubmitted) {
        state.quizAnswers[id] = value;
        render();
      }

      if (kind === 'assessment' && !state.assessSubmitted) {
        state.assessAnswers[id] = value;
        render();
      }
    }

    if (target.matches('#heritageRegistrationForm [data-field]')) {
      var field = target.getAttribute('data-field');
      state.registration[field] = target.type === 'checkbox' ? target.checked : target.value;
    }
  });

  shell.addEventListener('submit', function (event) {
    var form = event.target;
    if (!(form instanceof HTMLElement)) {
      return;
    }
    if (form.id === 'heritageRegistrationForm') {
      event.preventDefault();
      state.registrationSubmitted = true;
      render();
    }
  });

  render();
})();
