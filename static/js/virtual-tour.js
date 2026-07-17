(function () {
  const app = document.getElementById("tourApp");
  const viewerContainer = document.getElementById("tourViewer");
  const loadingOverlay = document.getElementById("tourLoadingOverlay");
  const errorOverlay = document.getElementById("tourErrorOverlay");
  const artifactOverlay = document.getElementById("tourArtifactOverlay");
  const artifactCloseButton = document.getElementById("tourArtifactClose");
  const artifactImage = document.getElementById("tourArtifactImage");
  const artifactModel = document.getElementById("tourArtifactModel");
  const artifactTagalogTitle = document.getElementById("tourArtifactTagalogTitle");
  const artifactTagalogText = document.getElementById("tourArtifactTagalogText");
  const artifactEnglishTitle = document.getElementById("tourArtifactEnglishTitle");
  const artifactEnglishText = document.getElementById("tourArtifactEnglishText");
  const controlDock = document.getElementById("tourControlDock");
  const toggleSceneHotspotsButton = document.getElementById("tourToggleSceneHotspots");
  const toggleArtifactHotspotsButton = document.getElementById("tourToggleArtifactHotspots");
  const captureViewButton = document.getElementById("tourCaptureView");
  const toggleFullscreenButton = document.getElementById("tourToggleFullscreen");
  const backToExhibitsButton = document.getElementById("tourBackToExhibits");
  const listenButton = document.getElementById("tourListen");
  const muteButton = document.getElementById("tourMute");
  const subtitlesButton = document.getElementById("tourSubs");
  const subtitleBar = document.getElementById("tourSubtitle");
  const subtitleTextEl = document.getElementById("tourSubtitleText");
  const minimapEl = document.getElementById("tourMinimap");
  const minimapImg = document.getElementById("tourMinimapImg");
  const minimapCircle = document.getElementById("tourMinimapCircle");
  const minimapLabelEl = document.getElementById("tourMinimapLabel");
  const minimapConeEl = minimapEl ? minimapEl.querySelector(".tour-minimap__cone") : null;
  const mapxEl = document.getElementById("tourMapx");
  const mapxImg = document.getElementById("tourMapxImg");
  const mapxFrame = document.getElementById("tourMapxFrame");
  const mapxStage = document.getElementById("tourMapxStage");
  const mapxDotsEl = document.getElementById("tourMapxDots");
  const mapxLabelEl = document.getElementById("tourMapxLabel");
  const mapxClose = document.getElementById("tourMapxClose");
  const debugParams = new URLSearchParams(window.location.search);
  const hotspotDebugEnabled = debugParams.get("debugHotspots") === "1";
  const minimapDebug = debugParams.get("minimapDebug") === "1";
  const userAgent = navigator.userAgent || "";
  const isIOSDevice = /iPad|iPhone|iPod/.test(userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  const isIOSChrome = isIOSDevice && /CriOS/.test(userAgent);
  const fullscreenTarget = document.documentElement;
  const canUseNativeFullscreen = !isIOSDevice && typeof fullscreenTarget.requestFullscreen === "function" && typeof document.exitFullscreen === "function";
  const canUseFullscreen = canUseNativeFullscreen;
  const digitalExhibitsUrl = app ? app.dataset.digitalExhibitsUrl : "";
  const balanghayImageSrc = app ? app.dataset.balanghayImageSrc : "";
  const balanghayGlbSrc = app ? app.dataset.balanghayGlbSrc : "";
  const balanghayTagalogAudioSrc = app ? app.dataset.balanghayTagalogAudioSrc : "";
  const balanghayEnglishAudioSrc = app ? app.dataset.balanghayEnglishAudioSrc : "";
  const kabaongImageSrc = app ? app.dataset.kabaongImageSrc : "";
  const kabaongGlbSrc = app ? app.dataset.kabaongGlbSrc : "";
  const kabaongTagalogAudioSrc = app ? app.dataset.kabaongTagalogAudioSrc : "";
  const kabaongEnglishAudioSrc = app ? app.dataset.kabaongEnglishAudioSrc : "";
  const ulohImageSrc = app ? app.dataset.ulohImageSrc : "";
  const ulohGlbSrc = app ? app.dataset.ulohGlbSrc : "";
  const ulohTagalogAudioSrc = app ? app.dataset.ulohTagalogAudioSrc : "";
  const ulohEnglishAudioSrc = app ? app.dataset.ulohEnglishAudioSrc : "";
  const kabilaImageSrc = app ? (app.dataset.kabilaImageSrc || "/AR-Artifacts/Kabila/kabila.png") : "/AR-Artifacts/Kabila/kabila.png";
  const kabilaTagalogAudioSrc = app ? app.dataset.kabilaTagalogAudioSrc : "";
  const kabilaEnglishAudioSrc = app ? app.dataset.kabilaEnglishAudioSrc : "";
  const bangaImageSrc = app ? app.dataset.bangaImageSrc : "";
  const bangaGlbSrc = app ? app.dataset.bangaGlbSrc : "";
  const bangaTagalogAudioSrc = app ? app.dataset.bangaTagalogAudioSrc : "";
  const bangaEnglishAudioSrc = app ? app.dataset.bangaEnglishAudioSrc : "";
  const jarImageSrc = app ? app.dataset.jarImageSrc : "";
  const jarTagalogAudioSrc = app ? app.dataset.jarTagalogAudioSrc : "";
  const jarEnglishAudioSrc = app ? app.dataset.jarEnglishAudioSrc : "";
  const insideChapelImageAssets = {
    art1LeftTable: app ? app.dataset.insideChapelArt1LeftTableImageSrc : "",
    art2LeftTable: app ? app.dataset.insideChapelArt2LeftTableImageSrc : "",
    art1RightTable: app ? app.dataset.insideChapelArt1RightTableImageSrc : "",
    art2RightTable: app ? app.dataset.insideChapelArt2RightTableImageSrc : "",
    pagkasira: app ? app.dataset.insideChapelPagkasiraImageSrc : "",
    pransiskano: app ? app.dataset.insideChapelPransiskanoImageSrc : "",
    pagsaayos: app ? app.dataset.insideChapelPagsaayosImageSrc : "",
  };
  const museum3ArtifactAssets = {
    inscription: {
      imageSrc: app ? app.dataset.museum3InscriptionImageSrc : "",
    },
    map: {
      imageSrc: app ? app.dataset.museum3MapImageSrc : "",
    },
    kagamitan: {
      imageSrc: app ? app.dataset.kagamitanImageSrc : "",
      glbSrc: app ? app.dataset.kagamitanGlbSrc : "",
      audioByLanguage: {
        tl: app ? app.dataset.kagamitanTagalogAudioSrc : "",
        en: app ? app.dataset.kagamitanEnglishAudioSrc : "",
      },
    },
    bagongon: {
      imageSrc: app ? app.dataset.bagongonImageSrc : "",
      glbSrc: app ? app.dataset.bagongonGlbSrc : "",
      audioByLanguage: {
        tl: app ? app.dataset.bagongonTagalogAudioSrc : "",
        en: app ? app.dataset.bagongonEnglishAudioSrc : "",
      },
    },
    bogwa: {
      imageSrc: app ? app.dataset.bogwaImageSrc : "",
      glbSrc: app ? app.dataset.bogwaGlbSrc : "",
      audioByLanguage: {
        tl: app ? app.dataset.bogwaTagalogAudioSrc : "",
        en: app ? app.dataset.bogwaEnglishAudioSrc : "",
      },
    },
    pagpag: {
      imageSrc: app ? app.dataset.pagpagImageSrc : "",
      glbSrc: app ? app.dataset.pagpagGlbSrc : "",
      audioByLanguage: {
        tl: app ? app.dataset.pagpagTagalogAudioSrc : "",
        en: app ? app.dataset.pagpagEnglishAudioSrc : "",
      },
    },
    pahimakas: {
      imageSrc: app ? app.dataset.pahimakasImageSrc : "",
      glbSrc: app ? app.dataset.pahimakasGlbSrc : "",
      audioByLanguage: {
        tl: app ? app.dataset.pahimakasTagalogAudioSrc : "",
        en: app ? app.dataset.pahimakasEnglishAudioSrc : "",
      },
      alternateAudioSrc: app ? app.dataset.pahimakasMarchAudioSrc : "",
    },
    alay: {
      imageSrc: app ? app.dataset.alayImageSrc : "",
      glbSrc: app ? app.dataset.alayGlbSrc : "",
      audioByLanguage: {
        tl: app ? app.dataset.alayTagalogAudioSrc : "",
        en: app ? app.dataset.alayEnglishAudioSrc : "",
      },
    },
    antuk: {
      imageSrc: app ? app.dataset.antukImageSrc : "",
      glbSrc: app ? app.dataset.antukGlbSrc : "",
      audioByLanguage: {
        tl: app ? app.dataset.antukTagalogAudioSrc : "",
        en: app ? app.dataset.antukEnglishAudioSrc : "",
      },
    },
    pagtubas: {
      imageSrc: app ? app.dataset.pagtubasImageSrc : "",
      glbSrc: app ? app.dataset.pagtubasGlbSrc : "",
      audioByLanguage: {
        tl: app ? app.dataset.pagtubasTagalogAudioSrc : "",
        en: app ? app.dataset.pagtubasEnglishAudioSrc : "",
      },
    },
    tsapang: {
      imageSrc: app ? app.dataset.tsapangImageSrc : "",
      glbSrc: app ? app.dataset.tsapangGlbSrc : "",
      audioByLanguage: {
        tl: app ? app.dataset.tsapangTagalogAudioSrc : "",
        en: app ? app.dataset.tsapangEnglishAudioSrc : "",
      },
    },
    tboli: {
      imageSrc: app ? app.dataset.tboliImageSrc : "",
      glbSrc: app ? app.dataset.tboliGlbSrc : "",
      audioByLanguage: {
        tl: app ? app.dataset.tboliTagalogAudioSrc : "",
        en: app ? app.dataset.tboliEnglishAudioSrc : "",
      },
    },
    sisiw: {
      imageSrc: app ? app.dataset.sisiwImageSrc : "",
      glbSrc: app ? app.dataset.sisiwGlbSrc : "",
      audioByLanguage: {
        tl: app ? app.dataset.sisiwTagalogAudioSrc : "",
        en: app ? app.dataset.sisiwEnglishAudioSrc : "",
      },
    },
    sabwag: {
      imageSrc: app ? app.dataset.sabwagImageSrc : "",
      glbSrc: app ? app.dataset.sabwagGlbSrc : "",
      audioByLanguage: {
        tl: app ? app.dataset.sabwagTagalogAudioSrc : "",
        en: app ? app.dataset.sabwagEnglishAudioSrc : "",
      },
    },
    tausug: {
      imageSrc: app ? app.dataset.tausugImageSrc : "",
      glbSources: [
        app ? app.dataset.tausugGlb1Src : "",
        app ? app.dataset.tausugGlb2Src : "",
        app ? app.dataset.tausugGlb3Src : "",
        app ? app.dataset.tausugGlb4Src : "",
      ].filter(Boolean),
      audioByLanguage: {
        tl: app ? app.dataset.tausugTagalogAudioSrc : "",
        en: app ? app.dataset.tausugEnglishAudioSrc : "",
      },
    },
    luksa: {
      imageSrc: app ? app.dataset.luksaImageSrc : "",
      glbSrc: app ? app.dataset.luksaGlbSrc : "",
      audioByLanguage: {
        tl: app ? app.dataset.luksaTagalogAudioSrc : "",
        en: app ? app.dataset.luksaEnglishAudioSrc : "",
      },
    },
    mensahe: {
      imageSrc: app ? app.dataset.mensaheImageSrc : "",
      audioByLanguage: {
        tl: app ? app.dataset.mensaheTagalogAudioSrc : "",
        en: app ? app.dataset.mensaheEnglishAudioSrc : "",
      },
    },
    pahiwatig: {
      imageSrc: app ? app.dataset.pahiwatigImageSrc : "",
      glbSrc: app ? app.dataset.pahiwatigGlbSrc : "",
      audioByLanguage: {
        tl: app ? app.dataset.pahiwatigTagalogAudioSrc : "",
        en: app ? app.dataset.pahiwatigEnglishAudioSrc : "",
      },
    },
    recuerdos: {
      imageSrc: app ? app.dataset.recuerdosImageSrc : "",
      glbSrc: app ? app.dataset.recuerdosGlbSrc : "",
      audioByLanguage: {
        tl: app ? app.dataset.recuerdosTagalogAudioSrc : "",
        en: app ? app.dataset.recuerdosEnglishAudioSrc : "",
      },
    },
  };
  const frontGateHotspotH1Src = app ? app.dataset.frontGateHotspotH1Src : "";
  const frontGateHotspotH1AudioSrc = app ? app.dataset.frontGateHotspotH1AudioSrc : "";
  const artifactNavButtons = Array.from(document.querySelectorAll("[data-artifact-view]"));
  const artifactPanes = Array.from(document.querySelectorAll("[data-artifact-pane]"));
  let hotspotsVisible = true;
  let tourViewer = null;
  let resolvedScenes = null;
  // Live "you are here" minimap
  let minimapData = null;
  const minimapDotEls = {}; // expanded-map dots, keyed by sceneId
  let minimapActiveScene = "";
  let minimapRaf = 0;
  let minimapAspect = 3074 / 2250; // updated once the aerial image loads
  let minimapNorths = null; // per-scene map orientation (deg), auto-derived
  let minimapYawSign = -1;  // detected pannellum yaw handedness
  // Expanded-map pan/zoom (the map zooms itself; the page never does)
  let mapxScale = 1;
  let mapxTx = 0;
  let mapxTy = 0;
  const mapxPointers = new Map();
  let mapxPanning = false;
  let mapxPinchDist = 0;
  let capturePreviewOverlay = null;
  let capturePreviewImage = null;
  let floatingImagePreviewOverlay = null;
  let floatingImagePreviewImage = null;
  let floatingImagePreviewTitle = null;
  let floatingImagePreviewZoom = null; // pinch/scroll/drag zoom controller
  let floatingArtifactPreviewOverlay = null;
  let floatingArtifactPreviewImage = null;
  let floatingArtifactPreviewImageFrame = null;
  let floatingArtifactPreviewImageZoom = null;
  let floatingArtifactPreviewTitle = null;
  let floatingArtifactPreviewModel = null;
  let floatingArtifactPreviewModelNav = null;
  let floatingArtifactPreviewModelPrev = null;
  let floatingArtifactPreviewModelNext = null;
  let floatingArtifactPreviewArButton = null;
  let floatingArtifactPreviewArgs = null;
  const floatingImageHotspots = new Map();
  const floatingArtifactHotspots = new Map();
  let floatingArtifactAudioLanguage = "tl";
  let activeFloatingArtifactAudioConfig = null;
  let floatingImageAudio = null;
  let floatingImageAudioSrc = "";
  let narrationMuted = false;
  let subtitlesOn = true;
  let activeSubtitle = null; // { tl, en } text for the artifact currently open

  // Per-artifact narration subtitles (Tagalog + English), keyed by a normalized
  // artifact name that matches each hotspot's imageAlt (e.g. "Ulóh" -> "uloh").
  const ARTIFACT_SUBTITLES = window.NHCP_ARTIFACT_SUBTITLES || {
    balanghay: {
      tl: "Ang Balanghay ay isang sasakyang-pandagat na ginamit noon pang 320 A.D. na kumakatawan sa kakayahang pandagat at paniniwalang espiritwal ng mga sinaunang Pilipino. Higit pa sa papel nito sa kalakalan at pakikidigma, sinasagisag nito ang paglalakbay ng kaluluwa sa kabilang buhay, kabilang ang mga kilalang mandirigma at mandaragat na kadalasang inililibing sa loob o kasama ng kanilang mga bangka upang ipagpatuloy ang kanilang paglalakbay sa kabilang daigdig.",
      en: "The Balanghay, a seafaring vessel dating back to 320 A.D., exemplified the maritime skill and spiritual beliefs of pre-colonial Filipinos. It symbolized the soul's voyage to the afterlife, with notable warriors and seafarers often buried in or with their boats to continue their journey in the netherworld.",
    },
    kabaong: {
      tl: "Ang mga Igorot ng Sagada, Mountain Province, ay sumusunod sa isang natatanging paglilibing na mahigit dalawang libong taong tradisyon, kung saan ang mga pumanaw ay inilalagay sa mga kabaong na gawa sa kahoy at isinasabit sa gilid ng mga bangin, kadalasan ay nasa posisyong mala-sanggol na sumasagisag sa pagbabalik sa lupa. Maraming matatanda ang umuukit pa nga ng kanilang sariling mga kabaong bilang paghahanda sa kamatayan.",
      en: "The Igorots of Sagada, Mountain Province, follow a distinctive burial tradition dating back over two thousand years, where the deceased are placed in wooden coffins and hung on cliff edges, often in a fetal position to symbolize returning to the earth. Many elders even carve their own coffins in preparation for death.",
    },
    uloh: {
      tl: "Ang Ulóh ay isang tradisyunal na tela ng Ifugao na gawa sa tatlong magkakaibang bahagi: adolna (gitna), balingbing (mga gilid), at talungtong (mga laylay), hinabi ng magkahiwalay at pinagsama-sama gamit ang natatanging pamamaraan, karaniwang kulay itim at pula. Ito ay gumaganap ng isang pangunahing papel sa ritwal ng kamatayan, ang bogwa, kung saan ang mga buto ng namatay ay hinuhukay, nililinis, at muling binabalot sa isang bagong Ulóh bilang paggalang at patuloy na pangangalaga, na may mga partikular na uri tulad ng kinuttiyan, inlhadang, pinagpagan, at gamong na ginagamit para sa paglilibing.",
      en: "The Ulóh is a traditional Ifugao textile made of three distinct parts: adolna (center), balingbing (sides), and talungtong (edges), woven separately and stitched together using a unique technique, typically in black and red. It plays a central role in the bogwa death ritual, where the deceased's bones are exhumed, cleansed, and rewrapped in a new Ulóh as a gesture of reverence and ongoing care, with specific types like kinuttiyan, inlha'dang, pinagpagan, and gamong used for funerary purposes.",
    },
    kabila: {
      tl: "Ipinapakita ng likhang-sining na ito ang sinaunang paniniwala ng mga Pilipino hinggil sa paglalakbay ng kaluluwa tungo sa kabilang buhay sa pamamagitan ng bangka, kung saan ang mga kabaong na hugis-sasakyang pandagat ay sumasagisag sa pagtawid sa ilog tungo sa susunod na buhay. Ipinakikita rin nito ang mayamang ritwal sa paglilibing ng mga sinaunang Pilipino, na sinasabayan ng mga alay at awit, bilang pagpupugay at paggabay sa kaluluwa tungo sa walang hanggang kapahingahan.",
      en: "This artwork portrays the ancient Filipino belief in the soul's journey to the afterlife by boat, with vessel-shaped coffins symbolizing the passage along a river to the next life. It also captures the rich funerary rituals of early Filipinos, complete with offerings and chants, meant to honor and guide the soul toward eternal rest.",
    },
    banga: {
      tl: "Ang Banga ng Manunggul, na ginamit noong Panahong Neolitiko ay natuklasan noong 1964 sa Palawan. Kinikilala ito bilang isang obra maestra ng sining seramiko ng mga sinaunang Pilipino. Ginamit para sa ikalawang paglibing. Ang takip nito na nagtatampok ng bangka na may dalawang hugis tao, ay sumasagisag sa paglalakbay tungo sa kabilang buhay, ayon sa paniniwala ng mga sinaunang Pilipino sa buhay matapos ang kamatayan.",
      en: "The Manunggul Jar, a Neolithic artifact discovered in 1964 in Palawan, is celebrated as a masterpiece of ancient Filipino ceramic art. Used for secondary burials, its lid featuring a boat with two human figures, symbolizes the journey to the afterlife, reflecting early Filipino's belief in life after death.",
    },
    jar: {
      tl: "Ang mga Banga ng Maitum, na natuklasan sa Yungib ng Ayub sa Lalawigan ng Sarangani, ay mga hugis-taong sisidlang panlibing noong Panahong Metal (190 B.C. hanggang 500 A.D.). Ipinakikita ng mga ito ang kahanga-hangang kasanayan sa paggawa na sumasalamin sa mga naunang paniniwala ng mga taga-Mindanao hinggil sa kabilang buhay. Ang kanilang anyong tao at makahulugang disenyo ay nagpapahiwatig ng espiritwal na kahalagahan ng kamatayan at paglilibing sa mga sinaunang pamayanan.",
      en: "The Maitum Jars, discovered in Ayub Cave, Sarangani Province are anthropomorphic earthenware burial vessels from the Metal Age (190 B.C. and 500 A.D.), showcasing exceptional craftsmanship and reflecting early Mindanaoan beliefs in the afterlife. Their human-like forms and symbolic design highlight the spiritual significance of death and burial among ancient communities.",
    },
    kagamitan: {
      tl: "Kabilang sa mga sinaunang kaugalian sa paglilibing ng mga Ivatan ang paglalagay ng mga sagisag na gamit sa libingan tulad ng sagwan, kalang na obsidian, pana, at karne kasama ng yumao. Ipinapakita nito ang kanilang paraan ng pamumuhay, at layuning tulungan ang kaluluwa sa paglalakbay tungo sa kabilang buhay at bigyan ito ng kaligtasan sa masasamang espiritu.",
      en: "Ancient Ivatan burial customs included placing symbolic grave goods such as paddles, obsidian wedges, arrowheads, and meat with the deceased to reflect their way of life, aid their journey to the afterlife, and offer protection from evil spirits.",
    },
    bagongon: {
      tl: "Sa mga Ilokano, ang bagongon, o ang paghahanda sa katawan ng yumao bago ang burol, ay isinasagawa ng asawa ng namatay. Pinaniniwalaan na maaaring magpabatid ng mga huling mensahe ang kaluluwa ng yumao sa kanyang asawa, na siya lamang ang pinahihintulutang damitan ang bangkay.",
      en: "In Ilocano tradition, the bagongon, or the preparation of the deceased's body before the wake, is performed by the spouse of the departed. It is believed that the deceased may communicate final messages through the spouse, who is the only person permitted to dress the body.",
    },
    bogwa: {
      tl: "Ang Bogwa ay isang ritwal ng mga Ifugao na kinapapalooban ng paghuhukay at paglilinis ng mga buto ng mahal sa buhay bilang pagpupugay sa yumao o paghingi ng kanilang basbas. Ang mga buto ay hinuhugasan at muling binabalot sa bagong kumot panlibing na tinatawag na ulóh.",
      en: "Bogwa, an Ifugao ritual involving the exhumation and cleansing of a loved one's bones, performed to honor the dead or seek their blessing. The bones are washed and rewrapped in a new burial blanket called ulóh.",
    },
    pagpag: {
      tl: "Ang Pagpag ay isang kaugaliang Pilipino sa pagluluksa kung saan iniiwasan ng mga nakiramay na umuwi agad matapos ang lamay. Sa halip, dumaraan muna sila sa ibang lugar upang \"ipagpag\" o itaboy ang mga kaluluwang maaaring sumunod sa kanila, at maiwasang sumabay ang espiritu ng yumao sa kanila.",
      en: "Pagpag is a Filipino mourning custom where mourners avoid going straight home after a wake, instead stopping briefly elsewhere to shake off lingering spirits and prevent the deceased's soul from following them.",
    },
    pahimakas: {
      tl: "Iisang marcha funebre ang \"Pahimakas\" ni Julio Nakpil (1867-1960) na nilikha niya bilang pagpupugay kay Dr. Jose Rizal matapos ang kamatayan nito noong 1896.",
      en: "\"Pahimakas\" by Julio Nakpil (1867-1960) is a funeral march composed as a tribute to Dr. Jose Rizal following his execution in 1896.",
    },
    alay: {
      tl: "Ang pag-aalay ng pagkain sa mga yumao, na kilala bilang alay, atang, o halad, ay isang laganap na kaugaliang Pilipino na sumasagisag ng pag-aaruga at pag-alala sa mga yumao. Sa ibat ibang rehiyon, naglalaan ang mga pamilya ng pagkain upang tulungan ang kanilang mga mahal sa buhay sa paglalakbay patungo sa kabilang daigdig.",
      en: "Offering food to the dead, known as alay, atang, or halad, is a widespread Filipino custom symbolizing care for the departed. Across regions, families set aside food to aid loved ones on their journey to the afterlife.",
    },
    antuk: {
      tl: "Sa mga Ata-Manobo, ang balo ay humihiga sa tabi ng kaniyang yumaong asawa sa panahon ng lamay, habang nagkakatipon ang mga kamag-anak at kaibigan upang umawit, sumayaw, at tumugtog ng mga instrumento. Ang mga ritwal na ito ay isinasagawa upang mapawi ang dalamhati at maipahayag ang sama-samang pagdadalamhati ng pamayanan.",
      en: "Among the Ata-Manobo, a widower lies beside his deceased wife during the wake as relatives and friends gather to sing, dance, and play music, rituals that ease sorrow and express shared grief.",
    },
    pagtubas: {
      tl: "Sa Silangang Kabisayaan, ang pagtubas ay isang ritwal ng paglilinis kung saan winiwisikan ng tubig na hinaluan ng binabasang dahon ang silid bago ilabas ang labi ng yumao. Isinasagawa ito upang matiyak na hindi na babalik ang kaluluwa. Una munang lumalabas ang pamilya, kasunod ang kabaong na inilalabas nang pauna ang paa.",
      en: "In Eastern Visayas, pagtubas is a cleansing ritual where a room is sprinkled with water infused with blessed leaves before removing the deceased, ensuring the spirit does not return. The family exits first, followed by the coffin carried feet-first.",
    },
    tsapang: {
      tl: "Sa buong Pilipinas, ang mga nakikiramay ay nagsusuot ng maliit na itim na laso o pardible sa dibdib sa loob ng apatnapung araw bilang sagisag ng pagdadalamhati, paggalang, at matatag na ugnayang pampamilya na sumasalamin sa pagkakaisa ng mga Pilipino sa panahon ng pagluluksa.",
      en: "Across the Philippines, mourners wear a small black ribbon or pin on the chest for forty days as a symbol of grief, respect, and the enduring familial bonds that reflect Filipino solidarity in mourning.",
    },
    tboli: {
      tl: "Sa mga T'boli, ang tao ay patay na kapag tuluyang nilisan ng kaluluwa ang katawan o kung ito ay kinuha ng isang masamang espiritu na tinatawag na busao. Ang bangkay ay inilalagay sa kabaong na hugis-bangka, at sa mahabang lamay, ang mga tumutulo mula sa kabaong ay ginagawang sawsawan ng nilagang kamote, na kinakain upang mapasalin sa mga nabubuhay ang mga mabuting katangian ng yumao.",
      en: "Among the T'boli, death is believed to occur when the soul permanently leaves the body or is taken by an evil spirit called busao. The deceased is placed in a boat-shaped coffin, and during the lengthy wake, the essence dripping from the coffin is used as a dip for sweet potatoes, which is eaten to inherit the virtues of the departed.",
    },
    sisiw: {
      tl: "Kapag ang isang tao ay pinatay, isang sisiw ang inilalagay sa ibabaw ng kabaong at pinapakain ng mga butil. Inaasahan na ang tunog ng pagtuka nito ang gigising sa konsensiya ng pumatay at ipapaalaala ang kanyang kasalanan.",
      en: "When someone is murdered, a live chick is placed on the coffin and fed with grains, symbolically sending its pecking sounds to awaken the killer's conscience and remind them of their guilt.",
    },
    sabwag: {
      tl: "Sa Bikol, matapos ang libing, ang mga nakiramay ay binubudburan ng abo na nakalagay sa bao ng niyog bilang ritwal ng paglilinis. Ito ay nagsisilbing paalala na ang tao ay magbabalik sa alabok.",
      en: "In Bikol, mourners are sprinkled with ashes held in a coconut shell after burial, a cleansing ritual symbolizing purification and the reminder that humans return to ashes.",
    },
    tausug: {
      tl: "Ang kaugalian ng mga Tausug sa paglilibing ay sumusunod sa apat na bahagi ayon sa Islam: paglinis, pagbalot, panalangin, at paglibing. Ang mga libingan ay nakahanay mula hilaga hanggang timog, at sa kanlurang bahagi ay may hukay na tinatawag na paliyangan kung saan iniluluklok ang katawan. Ito ay pinalilibutan ng kahoy na ding ding hali at may sunduk bilang pananda sa libingan.",
      en: "The Tausug burial tradition follows four Islamic stages, washing, wrapping, prayer, and burial, with graves oriented north to south. A westward cavity called paliyangan houses the body, enclosed by a wooden ding ding hali and marked with a sunduk as a grave marker.",
    },
    luksa: {
      tl: "Sa mga pamayanang Tsinoy, nangungupahan ng mga propesyonal na taga-luksa upang isagawa ang ritwal na pag-iyak habang nakasuot ng puting damit. Ang tradisyong ito ay nagmula pa sa Dinastiyang Han ng Tsina at nilalayong palalimin at ibahagi ang sama-samang pagdadalamhati.",
      en: "In Filipino-Chinese communities, professional mourners are hired to perform ritual wailing in white attire, a tradition dating back to China's Han Dynasty that aims to intensify and share the collective experience of grief.",
    },
    mensahe: {
      tl: "Namatay si Heneral Emilio Aguinaldo, ang unang Pangulo ng Pilipinas, noong 6 Pebrero 1964, na nagdulot ng pandaigdigang pakikiramay at pambansang pagluluksa na idineklara ni Pangulong Macapagal bilang pagpupugay sa kanya. Ang mga sulat ng pagpupugay ay sumasalamin sa patuloy na paggalang sa kanyang pamana.",
      en: "General Emilio Aguinaldo, the Philippines first president, died on 6 February 1964, prompting global condolences and a national mourning period declared by President Macapagal in his honor. The letters of tribute reflect the enduring respect for his legacy.",
    },
    pahiwatig: {
      tl: "Sa buong Pilipinas, may mga paniniwala na ang ilang palatandaan tulad ng itim na paruparo, pag-ungol ng aso, o pagbagsak ng litrato ay pinaniniwalaang nagpapabatid ng kamatayan. Dahil dito, gumagawa ang mga tao ng mga hakbang upang maiwasan ang kamalasan.",
      en: "Throughout the Philippines, certain signs like black butterflies, howling dogs, or falling photographs are believed to foretell death, prompting people to take precautions to prevent misfortune.",
    },
    recuerdos: {
      tl: "Sa kulturang Pilipino, ang recuerdos de patay ay ang pagriritrato ng yumao at ng kanilang pamilya sa lamay bilang pagpapanatili sa alaala, kung saan ang yumao ay isinasalarawan na mapayapang nakahimlay.",
      en: "In Filipino culture, recuerdos de patay is the practice of photographing the deceased and their family during wakes, preserving memories through images that depict the departed as peacefully at rest.",
    },
  };

  function subtitleForArtifact(name) {
    if (!name) {
      return null;
    }
    const key = String(name)
      .toLowerCase()
      .replace(/ó/g, "o") // ó -> o (Ulóh)
      .replace(/[^a-z0-9]/g, ""); // drop apostrophes/spaces (T'boli -> tboli)
    return ARTIFACT_SUBTITLES[key] || null;
  }
  const balanghayArtifactCopy = {
    tagalogTitle: "Ang Balanghay",
    tagalogText:
      "ANG BALANGHAY ay isang sasakyang-pandagat na ginamit noon pang 320 A.D. na kumakatawan sa kakayahang pandagar at paniniwalang espiritwal ng mga ng mga sinaunang Pilipino. Higit pa sa papel nito sa kalakalan at pakikidigma, sinasagisag nito ang paglalakbay ng kaluluwa sa kabilang buhay, kabilang ang mga kilalang mandirigma at mandaragat na kadalasang inililibing sa loob o kasama ng kanilang mga bangka upang ipagpatuloy ang kanilang paglalakbay sa kabilang daigdig.",
    englishTitle: "The Balanghay",
    englishText:
      "THE BALANGHAY, a seafaring vessel dating back to 320 A.D., exemplified the maritime skill and spiritual beliefs of pre-colonial Filipinos. It symbolized the soul's voyage to the afterlife, with notable warriors and seafarers often buried in or with their boats to continue their journey in the netherworld.",
  };
  const kabaongArtifactCopy = {
    tagalogTitle: "Ang mga Nakabiting Kabaong ng Sagada",
    tagalogText:
      "ANG MGA IGOROT ng Sagada, Mountain Province, ay sumusunod sa isang natatanging paglilibing na mahigit dalawang libong taong tradisyon, kung saan ang mga pumanaw ay inilalagay sa mga kabaong na gawa sa kahoy at isinasabit sa gilid ng mga bangin, kadalasan ay nasa posisyong mala-sanggol na sumasagisag sa pagbabalik sa lupa. Maraming matatanda ang umuukit pa nga ng kanilang sariling mga kabaong bilang paghahanda sa kamatayan.",
    englishTitle: "The Hanging Coffins of Sagada",
    englishText:
      "THE IGOROTS of Sagada, Mountain Province, follow a distinctive burial tradition dating back over two thousand years, where the deceased are placed in wooden coffins and hung on cliff edges, often in a fetal position to symbolize returning to the earth. Many elders even carve their own coffins in preparation for death.",
  };
  const ulohArtifactCopy = {
    tagalogTitle: "Tradisyunal na Ulóh ng mga Ifugao",
    tagalogText:
      "ANG ULÓH ay isang tradisyunal na tela ng Ifugao na gawa sa tatlong magkakaibang bahagi: adolna (gitna), balingbing (mga gilid), at talungtong (mga laylay), hinabi ng magkakahiwalay at pinagsama-sama gamit ang natatanging pamamaraan, karaniwang kulay itim at pula. Ito ay gumaganap ng isang pangunahing papel sa ritwal ng kamatayan, ang bogwa, kung saan ang mga buto ng namatay ay hinuhukay, nililinis, at muling binabalot sa isang bagong Ulóh bilang paggalang at patuloy na pangangalaga, na may mga partikular na uri tulad ng kinuttiyan, inlhadang, pinagpagan, at gamong na ginagamit para sa paglilibing.",
    englishTitle: "Traditional Ulóh of Ifugao",
    englishText:
      "THE ULÓH iS a traditional Ifugao textile made of three distinct parts: adolna(center), balingbing(sides), and talungtong(edges), woven separately and stitched together using a unique technique, typically in black and red. It plays a central role in the bogwa death ritual, where the deceased's bones are exhumed, cleansed, and rewrapped in a new Ulóh as a gesture of reverence and ongoing care, with specific types like kinuttiyan, inlha’dang, pinagpagan, and gamong used for funerary purposes.",
  };

  let arNotice = null;
  let arNoticeTimer = 0;
  const managedArModels = new WeakSet();
  const arButtonIcon = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" d="M12 2.75 19 6.2v8.1L12 17.75 5 14.3V6.2L12 2.75Zm0 7.05L5.4 6.55M12 9.8l6.6-3.25M12 9.8v7.6"/><path stroke-linecap="round" d="M8.25 20.5h7.5"/></svg>';

  function ensureArNotice() {
    if (arNotice) {
      return arNotice;
    }

    const notice = document.createElement("div");
    notice.className = "tour-ar-notice";
    notice.hidden = true;
    notice.setAttribute("role", "alert");
    notice.setAttribute("aria-live", "assertive");
    notice.setAttribute("aria-atomic", "true");
    notice.innerHTML = `
      <span class="tour-ar-notice__icon" aria-hidden="true">!</span>
      <span class="tour-ar-notice__copy">
        <strong data-ar-notice-lang="en">AR is unavailable</strong>
        <strong data-ar-notice-lang="tl">Hindi suportado ang AR</strong>
        <span data-ar-notice-lang="en">This device or browser does not support Quick Look, WebXR, or Scene Viewer AR. You can still explore the 3D model here.</span>
        <span data-ar-notice-lang="tl">Hindi sinusuportahan ng device o browser na ito ang Quick Look, WebXR, o Scene Viewer AR. Maaari mo pa ring galugarin ang 3D model dito.</span>
      </span>
      <button class="tour-ar-notice__close" type="button" aria-label="Close AR compatibility notice">&times;</button>`;

    notice.querySelector(".tour-ar-notice__close")?.addEventListener("click", function () {
      window.clearTimeout(arNoticeTimer);
      notice.classList.remove("is-visible");
      notice.hidden = true;
    });
    app?.appendChild(notice);
    arNotice = notice;
    return notice;
  }

  function showArCompatibilityNotice() {
    const notice = ensureArNotice();
    const language = floatingArtifactAudioLanguage === "en" ? "en" : "tl";
    notice.querySelectorAll("[data-ar-notice-lang]").forEach(function (node) {
      node.hidden = node.dataset.arNoticeLang !== language;
    });
    window.clearTimeout(arNoticeTimer);
    notice.hidden = false;
    window.requestAnimationFrame(function () {
      notice.classList.add("is-visible");
    });
    arNoticeTimer = window.setTimeout(function () {
      notice.classList.remove("is-visible");
      window.setTimeout(function () {
        if (!notice.classList.contains("is-visible")) {
          notice.hidden = true;
        }
      }, 220);
    }, 6000);
  }

  function installModelArControl(model, container) {
    if (!model || !container) {
      return null;
    }

    const existingButton = container.querySelector(":scope > .tour-model-ar-button");
    if (existingButton) {
      return existingButton;
    }

    model.classList.add("tour-model--managed-ar");
    const button = document.createElement("button");
    button.className = "tour-model-ar-button";
    button.type = "button";
    button.setAttribute("aria-label", "View artifact in your space / Tingnan ang artifact sa iyong paligid");
    button.setAttribute("title", "View in your space / Tingnan sa iyong paligid");
    button.innerHTML = arButtonIcon;
    container.appendChild(button);

    if (!managedArModels.has(model)) {
      managedArModels.add(model);
      model.addEventListener("ar-status", function (event) {
        if (event.detail && event.detail.status === "failed") {
          showArCompatibilityNotice();
        }
      });
    }

    button.addEventListener("click", async function (event) {
      event.preventDefault();
      event.stopPropagation();

      try {
        await window.customElements.whenDefined("model-viewer");
        if (!model.src || typeof model.activateAR !== "function" || !model.canActivateAR) {
          showArCompatibilityNotice();
          return;
        }
        await model.activateAR();
      } catch (error) {
        console.warn("Unable to launch artifact AR.", error);
        showArCompatibilityNotice();
      }
    });

    return button;
  }

  installModelArControl(artifactModel, artifactModel?.parentElement);

  if (!app || !viewerContainer || !window.pannellum) {
    if (loadingOverlay) {
      loadingOverlay.hidden = true;
    }
    if (errorOverlay) {
      errorOverlay.hidden = false;
    }
    return;
  }

  function getArtifactGlbSources(args) {
    if (!args) {
      return [];
    }

    if (Array.isArray(args.glbSources) && args.glbSources.length) {
      return args.glbSources.filter(Boolean);
    }

    return args.glbSrc ? [args.glbSrc] : [];
  }

  function getArtifactGlbIndex(args) {
    const glbSources = getArtifactGlbSources(args);
    if (!glbSources.length) {
      if (args) {
        args.currentGlbIndex = 0;
      }
      return 0;
    }

    const requestedIndex = args && Number.isInteger(args.currentGlbIndex) ? args.currentGlbIndex : 0;
    const safeIndex = Math.min(Math.max(requestedIndex, 0), glbSources.length - 1);
    if (args) {
      args.currentGlbIndex = safeIndex;
    }
    return safeIndex;
  }

  function getArtifactCurrentGlbSrc(args) {
    const glbSources = getArtifactGlbSources(args);
    if (!glbSources.length) {
      return "";
    }

    return glbSources[getArtifactGlbIndex(args)] || "";
  }

  function getArtifactCurrentGlbAlt(args) {
    const glbSources = getArtifactGlbSources(args);
    const baseAlt = args && (args.glbAlt || args.imageAlt) ? args.glbAlt || args.imageAlt : "Artifact 3D model";
    if (glbSources.length > 1) {
      return `${baseAlt} ${getArtifactGlbIndex(args) + 1}`;
    }
    return baseAlt;
  }

  function buildFloatingArtifactHotspot(options) {
    return {
      id: options.id,
      pitch: options.pitch,
      yaw: options.yaw,
      type: "info",
      text: "",
      clickHandlerFunc: openFloatingArtifactOverlay,
      clickHandlerArgs: {
        sourceHotspotId: options.id,
        windowHotspotId: `${options.id}-window`,
        title: options.title || options.imageAlt || "",
        imageSrc: options.imageSrc,
        imageAlt: options.imageAlt,
        glbSrc: options.glbSrc || "",
        glbSources: Array.isArray(options.glbSources) ? options.glbSources.filter(Boolean) : [],
        glbAlt: options.glbAlt || `${options.imageAlt} 3D model`,
        audioByLanguage: options.audioByLanguage && typeof options.audioByLanguage === "object" ? { ...options.audioByLanguage } : null,
        alternateAudioSrc: options.alternateAudioSrc || "",
        previewFrameStyle: options.previewFrameStyle || "",
        windowPitch: options.pitch,
        windowYaw: options.yaw,
      },
      cssClass: "tour-ground-hotspot tour-ground-hotspot--pulse tour-ground-hotspot--compact tour-ground-hotspot--no-icon",
    };
  }

  const museum3ArtifactHotspots = [
    buildFloatingArtifactHotspot({
      id: "museum3-inscription-marker",
      pitch: -10.62,
      yaw: 26.8,
      imageSrc: museum3ArtifactAssets.inscription.imageSrc,
      imageAlt: "Inscription",
      previewFrameStyle: "outline",
    }),
    buildFloatingArtifactHotspot({
      id: "museum3-map-marker",
      pitch: -17.76,
      yaw: -72.4,
      imageSrc: museum3ArtifactAssets.map.imageSrc,
      imageAlt: "Map",
      previewFrameStyle: "outline",
    }),
    buildFloatingArtifactHotspot({
      id: "museum3-kagamitan-marker",
      pitch: -20.3,
      yaw: -92.86,
      imageSrc: museum3ArtifactAssets.kagamitan.imageSrc,
      imageAlt: "Kagamitan",
      glbSrc: museum3ArtifactAssets.kagamitan.glbSrc,
      audioByLanguage: museum3ArtifactAssets.kagamitan.audioByLanguage,
      glbAlt: "Kagamitan 3D model",
    }),
    buildFloatingArtifactHotspot({
      id: "museum3-bagongon-marker",
      pitch: -12.37,
      yaw: -116.55,
      imageSrc: museum3ArtifactAssets.bagongon.imageSrc,
      imageAlt: "Bagongon",
      glbSrc: museum3ArtifactAssets.bagongon.glbSrc,
      audioByLanguage: museum3ArtifactAssets.bagongon.audioByLanguage,
      glbAlt: "Bagongon 3D model",
    }),
    buildFloatingArtifactHotspot({
      id: "museum3-bogwa-marker",
      pitch: -26.32,
      yaw: -122.8,
      imageSrc: museum3ArtifactAssets.bogwa.imageSrc,
      imageAlt: "Bogwa",
      glbSrc: museum3ArtifactAssets.bogwa.glbSrc,
      audioByLanguage: museum3ArtifactAssets.bogwa.audioByLanguage,
      glbAlt: "Bogwa 3D model",
    }),
    buildFloatingArtifactHotspot({
      id: "museum3-pagpag-marker",
      pitch: -12.59,
      yaw: -139.64,
      imageSrc: museum3ArtifactAssets.pagpag.imageSrc,
      imageAlt: "Pagpag",
      glbSrc: museum3ArtifactAssets.pagpag.glbSrc,
      audioByLanguage: museum3ArtifactAssets.pagpag.audioByLanguage,
      glbAlt: "Pagpag 3D model",
    }),
    buildFloatingArtifactHotspot({
      id: "museum3-pahimakas-marker",
      pitch: -24.85,
      yaw: -133.85,
      imageSrc: museum3ArtifactAssets.pahimakas.imageSrc,
      imageAlt: "Pahimakas",
      glbSrc: museum3ArtifactAssets.pahimakas.glbSrc,
      audioByLanguage: museum3ArtifactAssets.pahimakas.audioByLanguage,
      alternateAudioSrc: museum3ArtifactAssets.pahimakas.alternateAudioSrc,
      glbAlt: "Pahimakas 3D model",
    }),
    buildFloatingArtifactHotspot({
      id: "museum3-alay-marker",
      pitch: -15.1,
      yaw: -165.57,
      imageSrc: museum3ArtifactAssets.alay.imageSrc,
      imageAlt: "Alay",
      glbSrc: museum3ArtifactAssets.alay.glbSrc,
      audioByLanguage: museum3ArtifactAssets.alay.audioByLanguage,
      glbAlt: "Alay 3D model",
    }),
    buildFloatingArtifactHotspot({
      id: "museum3-antuk-marker",
      pitch: -25.93,
      yaw: -177.89,
      imageSrc: museum3ArtifactAssets.antuk.imageSrc,
      imageAlt: "Antuk",
      glbSrc: museum3ArtifactAssets.antuk.glbSrc,
      audioByLanguage: museum3ArtifactAssets.antuk.audioByLanguage,
      glbAlt: "Antuk 3D model",
    }),
    buildFloatingArtifactHotspot({
      id: "museum3-pagtubas-marker",
      pitch: -25.72,
      yaw: 168.51,
      imageSrc: museum3ArtifactAssets.pagtubas.imageSrc,
      imageAlt: "Pagtubas",
      glbSrc: museum3ArtifactAssets.pagtubas.glbSrc,
      audioByLanguage: museum3ArtifactAssets.pagtubas.audioByLanguage,
      glbAlt: "Pagtubas 3D model",
    }),
    buildFloatingArtifactHotspot({
      id: "museum3-tsapang-marker",
      pitch: -18.18,
      yaw: 147.99,
      imageSrc: museum3ArtifactAssets.tsapang.imageSrc,
      imageAlt: "Tsapang",
      glbSrc: museum3ArtifactAssets.tsapang.glbSrc,
      audioByLanguage: museum3ArtifactAssets.tsapang.audioByLanguage,
      glbAlt: "Tsapang 3D model",
    }),
    buildFloatingArtifactHotspot({
      id: "museum3-tboli-marker",
      pitch: -7.75,
      yaw: 154.08,
      imageSrc: museum3ArtifactAssets.tboli.imageSrc,
      imageAlt: "T'boli",
      glbSrc: museum3ArtifactAssets.tboli.glbSrc,
      audioByLanguage: museum3ArtifactAssets.tboli.audioByLanguage,
      glbAlt: "T'boli 3D model",
    }),
    buildFloatingArtifactHotspot({
      id: "museum3-sisiw-marker",
      pitch: -7.99,
      yaw: 143.31,
      imageSrc: museum3ArtifactAssets.sisiw.imageSrc,
      imageAlt: "Sisiw",
      glbSrc: museum3ArtifactAssets.sisiw.glbSrc,
      audioByLanguage: museum3ArtifactAssets.sisiw.audioByLanguage,
      glbAlt: "Sisiw 3D model",
    }),
    buildFloatingArtifactHotspot({
      id: "museum3-sabwag-marker",
      pitch: -16.01,
      yaw: 137.14,
      imageSrc: museum3ArtifactAssets.sabwag.imageSrc,
      imageAlt: "Sabwag",
      glbSrc: museum3ArtifactAssets.sabwag.glbSrc,
      audioByLanguage: museum3ArtifactAssets.sabwag.audioByLanguage,
      glbAlt: "Sabwag 3D model",
    }),
    buildFloatingArtifactHotspot({
      id: "museum3-tausug-marker",
      pitch: -23.6,
      yaw: 140.94,
      imageSrc: museum3ArtifactAssets.tausug.imageSrc,
      imageAlt: "Tausug",
      glbSources: museum3ArtifactAssets.tausug.glbSources,
      audioByLanguage: museum3ArtifactAssets.tausug.audioByLanguage,
      glbAlt: "Tausug 3D model",
    }),
    buildFloatingArtifactHotspot({
      id: "museum3-luksa-marker",
      pitch: -14.26,
      yaw: 116.98,
      imageSrc: museum3ArtifactAssets.luksa.imageSrc,
      imageAlt: "Luksa",
      glbSrc: museum3ArtifactAssets.luksa.glbSrc,
      audioByLanguage: museum3ArtifactAssets.luksa.audioByLanguage,
      glbAlt: "Luksa 3D model",
    }),
    buildFloatingArtifactHotspot({
      id: "museum3-mensahe-marker",
      pitch: -14.29,
      yaw: 108.16,
      imageSrc: museum3ArtifactAssets.mensahe.imageSrc,
      imageAlt: "Mensahe",
      audioByLanguage: museum3ArtifactAssets.mensahe.audioByLanguage,
    }),
    buildFloatingArtifactHotspot({
      id: "museum3-pahiwatig-marker",
      pitch: -28.09,
      yaw: 104.25,
      imageSrc: museum3ArtifactAssets.pahiwatig.imageSrc,
      imageAlt: "Pahiwatig",
      glbSrc: museum3ArtifactAssets.pahiwatig.glbSrc,
      audioByLanguage: museum3ArtifactAssets.pahiwatig.audioByLanguage,
      glbAlt: "Pahiwatig 3D model",
    }),
    buildFloatingArtifactHotspot({
      id: "museum3-recuerdos-marker",
      pitch: -22.93,
      yaw: 78.03,
      imageSrc: museum3ArtifactAssets.recuerdos.imageSrc,
      imageAlt: "Recuerdos",
      glbSrc: museum3ArtifactAssets.recuerdos.glbSrc,
      audioByLanguage: museum3ArtifactAssets.recuerdos.audioByLanguage,
      glbAlt: "Recuerdos 3D model",
    }),
  ];

  // Image-only exhibits inside the chapel. They use the museum artifact card
  // and expanded preview, but omit the image/3D switch because no GLBs exist.
  const insideChapelImageHotspots = [
    buildFloatingArtifactHotspot({
      id: "inside-chapel-art1-left-table-marker",
      pitch: -26.98,
      yaw: -95.71,
      imageSrc: insideChapelImageAssets.art1LeftTable,
      imageAlt: "Art1-LeftTable",
    }),
    buildFloatingArtifactHotspot({
      id: "inside-chapel-art2-left-table-marker",
      pitch: -39.25,
      yaw: -82.8,
      imageSrc: insideChapelImageAssets.art2LeftTable,
      imageAlt: "Art2-LeftTable",
    }),
    buildFloatingArtifactHotspot({
      id: "inside-chapel-art1-right-table-marker",
      pitch: -36.02,
      yaw: 36.94,
      imageSrc: insideChapelImageAssets.art1RightTable,
      imageAlt: "Art1-RightTable",
    }),
    buildFloatingArtifactHotspot({
      id: "inside-chapel-art2-right-table-marker",
      pitch: -24.26,
      yaw: 46.29,
      imageSrc: insideChapelImageAssets.art2RightTable,
      imageAlt: "Art2-RightTable",
    }),
    buildFloatingArtifactHotspot({
      id: "inside-chapel-pagkasira-marker",
      pitch: -16.07,
      yaw: -118.57,
      imageSrc: insideChapelImageAssets.pagkasira,
      imageAlt: "Pagkasira",
      previewFrameStyle: "outline",
    }),
    buildFloatingArtifactHotspot({
      id: "inside-chapel-pransiskano-marker",
      pitch: -18.22,
      yaw: -135.02,
      imageSrc: insideChapelImageAssets.pransiskano,
      imageAlt: "Pransiskano",
      previewFrameStyle: "outline",
    }),
    buildFloatingArtifactHotspot({
      id: "inside-chapel-pagsaayos-marker",
      pitch: -18.35,
      yaw: 91.92,
      imageSrc: insideChapelImageAssets.pagsaayos,
      imageAlt: "Pagsaayos",
      previewFrameStyle: "outline",
    }),
  ];

  const rawScenes = {
    frontGate: {
      type: "equirectangular",
      panorama: app.dataset.panoramaSrc,
      pitch: 1.8,
      yaw: -10.2,
      hfov: 150,
      hotSpots: [
        {
          id: "go-left-front-gate",
          pitch: -12,
          yaw: -83,
          type: "scene",
          text: "Move to left viewpoint",
          sceneId: "leftFrontGate",
          cssClass: "tour-ground-hotspot",
        },
        {
          id: "go-right-front-gate",
          pitch: -10,
          yaw: 90,
          type: "scene",
          text: "Move to right viewpoint",
          targetPitch: -20,
          targetYaw: 90,
          targetHfov: 100,
          sceneId: "rightFrontGate",
          
          cssClass: "tour-ground-hotspot",
        },
        {
          id: "go-inside-front-gate",
          pitch: -17,
          yaw: -10.2,
          type: "scene",
          text: "Move inside the front gate",
          sceneId: "insideFrontGate",
          cssClass: "tour-ground-hotspot",
        },
        {
          id: "front-gate-hotspot-h1",
          pitch: 1.06,
          yaw: 24.41,
          type: "info",
          text: "",
          clickHandlerFunc: openFloatingImageOverlay,
          clickHandlerArgs: {
            sourceHotspotId: "front-gate-hotspot-h1",
            windowHotspotId: "front-gate-hotspot-h1-window",
            title: "The Front Gate",
            imageSrc: frontGateHotspotH1Src,
            audioSrc: frontGateHotspotH1AudioSrc,
            imageAlt: "Front Gate hotspot image",
            windowPitch: 1.06,
            windowYaw: 24.41,
          },
          cssClass: "tour-ground-hotspot tour-ground-hotspot--pulse tour-ground-hotspot--compact tour-ground-hotspot--no-icon",
        },
      ],
    },
    insideFrontGate: {
      type: "equirectangular",
      panorama: app.dataset.panoramaInsideFrontGateSrc,
      pitch: 0,
      yaw: 0,
      hfov: 100,
      hotSpots: [
        {
          id: "go-left-corner-inside-front-gate-from-inside-front-gate",
          pitch: -9.82,
          yaw: -87.41,
          type: "scene",
          text: "Move to left corner inside front gate view",
          sceneId: "leftCornerInsideFrontGate",
          targetPitch: -3.69,
          targetYaw: -89.47,
          targetHfov: 100,
          cssClass: "tour-ground-hotspot",
        },
        {
          id: "go-right-corner-inside-front-gate-from-inside-front-gate",
          pitch: -8.2,
          yaw: 93.64,
          type: "scene",
          text: "Move to right corner inside front gate view",
          sceneId: "rightCornerInsideFrontGate",
          targetPitch: -1.98,
          targetYaw: 78.32,
          targetHfov: 100,
          cssClass: "tour-ground-hotspot",
        },
        {
          id: "go-inside-front-gate-1",
          pitch: -18,
          yaw: 2,
          type: "scene",
          text: "Move deeper inside the front gate",
          sceneId: "insideFrontGate1",
          cssClass: "tour-ground-hotspot",
        },
        {
          id: "return-front-gate-from-inside",
          pitch: -16,
          yaw: 180,
          type: "scene",
          text: "Return to front gate view",
          sceneId: "frontGate",
          targetPitch: -20,
          targetYaw: 170,
          targetHfov: 100,
          cssClass: "tour-ground-hotspot",
        },
      ],
    },
    leftCornerInsideFrontGate: {
      type: "equirectangular",
      panorama: app.dataset.panoramaLeftCornerInsideFrontGateSrc,
      pitch: 0,
      yaw: 0,
      hfov: 100,
      hotSpots: [
        {
          id: "go-left-middle-inside-front-gate-from-left-corner-inside-front-gate",
          pitch: -16.04,
          yaw: -89.09,
          type: "scene",
          text: "Move to left middle inside front gate view",
          sceneId: "leftMiddleInsideFrontGate",
          targetPitch: -6.26,
          targetYaw: -101.9,
          targetHfov: 100,
          cssClass: "tour-ground-hotspot",
        },
        {
          id: "go-inside-front-gate-from-left-corner-inside-front-gate",
          pitch: -6.46,
          yaw: 51.43,
          type: "scene",
          text: "Move to inside front gate view",
          sceneId: "insideFrontGate",
          targetPitch: -1.73,
          targetYaw: 93.15,
          targetHfov: 100,
          cssClass: "tour-ground-hotspot",
        },
      ],
    },
    leftMiddleInsideFrontGate: {
      type: "equirectangular",
      panorama: app.dataset.panoramaLeftMiddleInsideFrontGateSrc,
      pitch: 0,
      yaw: 0,
      hfov: 100,
      hotSpots: [
        {
          id: "go-left-middle-g-from-left-middle-inside-front-gate",
          pitch: -13.77,
          yaw: -102.25,
          type: "scene",
          text: "Move to left middle gate view",
          sceneId: "leftMiddleG",
          targetPitch: -5.23,
          targetYaw: -102.56,
          targetHfov: 100,
          cssClass: "tour-ground-hotspot",
        },
        {
          id: "return-left-corner-inside-front-gate-from-left-middle-inside-front-gate",
          pitch: -10.23 ,
          yaw: 76.89,
          type: "scene",
          text: "Return to left corner inside front gate view",
          sceneId: "leftCornerInsideFrontGate",
          targetPitch: -2.76,
          targetYaw: 77.72,
          targetHfov: 100,
          cssClass: "tour-ground-hotspot",
        },
      ],
    },
    leftMiddleG: {
      type: "equirectangular",
      panorama: app.dataset.panoramaLeftMiddleGSrc,
      pitch: 0,
      yaw: 0,
      hfov: 100,
      hotSpots: [
        {
          id: "go-left-middle-middle-g-from-left-middle-g",
          pitch: -16.03,
          yaw: -93.48,
          type: "scene",
          text: "Move to left middle middle gate view",
          sceneId: "leftMiddleMiddleG",
          targetPitch: -2.64,
          targetYaw: -95.37,
          targetHfov: 100,
          cssClass: "tour-ground-hotspot",
        },
        {
          id: "return-left-middle-inside-front-gate-from-left-middle-g",
          pitch: -13.32,
          yaw: 83.61,
          type: "scene",
          text: "Return to left middle inside front gate view",
          sceneId: "leftMiddleInsideFrontGate",
          targetPitch: -0.59,
          targetYaw: 77.94,
          targetHfov: 100,
          cssClass: "tour-ground-hotspot",
        },
      ],
    },
    leftMiddleMiddleG: {
      type: "equirectangular",
      panorama: app.dataset.panoramaLeftMiddleMiddleGSrc,
      pitch: 0,
      yaw: 0,
      hfov: 100,
      hotSpots: [
        {
          id: "go-left-g-from-left-middle-middle-g",
          pitch: -13.22,
          yaw: -94.79,
          type: "scene",
          text: "Move to left gate view",
          sceneId: "leftG",
          targetPitch: -4.6,
          targetYaw: -99.01,
          targetHfov: 100,
          cssClass: "tour-ground-hotspot",
        },
        {
          id: "return-left-middle-g-from-left-middle-middle-g",
          pitch: -13.01,
          yaw: 56.07,
          type: "scene",
          text: "Return to left middle gate view",
          sceneId: "leftMiddleG",
          targetPitch: -3.01,
          targetYaw: 82.37,
          targetHfov: 100,
          cssClass: "tour-ground-hotspot",
        },
      ],
    },
    leftG: {
      type: "equirectangular",
      panorama: app.dataset.panoramaLeftGSrc,
      pitch: 0,
      yaw: 0,
      hfov: 100,
      hotSpots: [
        {
          id: "go-left-end-tombs-from-left-g",
          pitch: -10.95,
          yaw: -95.49,
          type: "scene",
          text: "Move to left end tombs view",
          sceneId: "leftEndTombs",
          targetPitch: -2.91,
          targetYaw: -99.35,
          targetHfov: 100,
          cssClass: "tour-ground-hotspot",
        },
        {
          id: "return-left-middle-middle-g-from-left-g",
          pitch: -8.27 ,
          yaw: 81.02,
          type: "scene",
          text: "Return to left middle middle gate view",
          sceneId: "leftMiddleMiddleG",
          targetPitch: -2.8,
          targetYaw: 61.31,
          targetHfov: 100,
          cssClass: "tour-ground-hotspot",
        },
      ],
    },
    leftEndTombs: {
      type: "equirectangular",
      panorama: app.dataset.panoramaLeftEndTombsSrc,
      pitch: 0,
      yaw: 0,
      hfov: 100,
      hotSpots: [
        {
          id: "go-left-middle-tombs-from-left-end-tombs",
          pitch: -11.06,
          yaw: -99.54,
          type: "scene",
          text: "Move to left middle tombs view",
          sceneId: "leftMiddleTombs",
          targetPitch: -7.35,
          targetYaw: -106.9,
          targetHfov: 100,
          cssClass: "tour-ground-hotspot",
        },
        {
          id: "return-left-g-from-left-end-tombs",
          pitch: -5.96 ,
          yaw: 37.33,
          type: "scene",
          text: "Return to left gate view",
          sceneId: "leftG",
          targetPitch: -1.72,
          targetYaw: 81.4,
          targetHfov: 100,
          cssClass: "tour-ground-hotspot",
        },
      ],
    },
    leftMiddleTombs: {
      type: "equirectangular",
      panorama: app.dataset.panoramaLeftMiddleTombsSrc,
      pitch: 0,
      yaw: 0,
      hfov: 100,
      hotSpots: [
        {
          id: "go-left-tombs-from-left-middle-tombs",
          pitch: -11.02,
          yaw: -105.65,
          type: "scene",
          text: "Move to left tombs view",
          sceneId: "leftTombs",
          targetPitch: -4.95,
          targetYaw: -89.26,
          targetHfov: 100,
          cssClass: "tour-ground-hotspot",
        },
        {
          id: "return-left-end-tombs-from-left-middle-tombs",
          pitch: -8.41,
          yaw: 74.15,
          type: "scene",
          text: "Return to left end tombs view",
          sceneId: "leftEndTombs",
          targetPitch: 0.74,
          targetYaw: 37.45,
          targetHfov: 100,
          cssClass: "tour-ground-hotspot",
        },
      ],
    },
    leftTombs: {
      type: "equirectangular",
      panorama: app.dataset.panoramaLeftTombsSrc,
      pitch: 0,
      yaw: 0,
      hfov: 100,
      hotSpots: [
        {
          id: "go-left-first-tombs-from-left-tombs",
          pitch: -20.76,
          yaw: -89.75,
          type: "scene",
          text: "Move to left first tombs view",
          sceneId: "leftFirstTombs",
          cssClass: "tour-ground-hotspot",
        },
        {
          id: "return-left-middle-tombs-from-left-tombs",
          pitch: -7.73,
          yaw: 48.09,
          type: "scene",
          text: "Return to left middle tombs view",
          sceneId: "leftMiddleTombs",
          targetPitch: -1.02,
          targetYaw: 74.28,
          targetHfov: 100,
          cssClass: "tour-ground-hotspot",
        },
      ],
    },
    leftFirstTombs: {
      type: "equirectangular",
      panorama: app.dataset.panoramaLeftFirstTombsSrc,
      pitch: 0,
      yaw: 0,
      hfov: 100,
      hotSpots: [
        {
          id: "return-left-tombs-from-left-first-tombs",
          pitch: -14.72,
          yaw: 82.97,
          type: "scene",
          text: "Return to left tombs view",
          sceneId: "leftTombs",
          targetPitch: 0.56,
          targetYaw: 46.68,
          targetHfov: 100,
          cssClass: "tour-ground-hotspot",
        },
        {
          id: "return-left-front-church-from-left-first-tombs",
          pitch: -25.55,
          yaw: -25.99,
          type: "scene",
          text: "Return to left front chapel view",
          sceneId: "leftFrontChurch",
          targetPitch: -1.46,
          targetYaw: 70.52,
          targetHfov: 100,
          cssClass: "tour-ground-hotspot",
        },
      ],
    },
    insideFrontGate1: {
      type: "equirectangular",
      panorama: app.dataset.panoramaInsideFrontGate1Src,
      pitch: 0,
      yaw: 0,
      hfov: 100,
      hotSpots: [
        {
          id: "go-middle-g-inside",
          pitch: -5,
          yaw: -4,
          type: "scene",
          text: "Move to middle gate inside view",
          sceneId: "middleGInside",
          cssClass: "tour-ground-hotspot",
        },
        {
          id: "return-inside-front-gate",
          pitch: -15,
          yaw: 175,
          type: "scene",
          text: "Return to inside front gate view",
          sceneId: "insideFrontGate",
          targetPitch: -20,
          targetYaw: 170,
          targetHfov: 100,
          cssClass: "tour-ground-hotspot",
        },
      ],
    },
    middleGInside: {
      type: "equirectangular",
      panorama: app.dataset.panoramaMiddleGInsideSrc,
      pitch: 0,
      yaw: 123,
      hfov: 100,
      hotSpots: [
        {
          id: "go-front-church",
          pitch: -5,
          yaw: 125,
          type: "scene",
          text: "Move to front chapel view",
          sceneId: "frontChurch",
          cssClass: "tour-ground-hotspot",
        },
        {
          id: "return-inside-front-gate-1",
          pitch: -7,
          yaw: -55,
          type: "scene",
          text: "Return to inside front gate 1 view",
          sceneId: "insideFrontGate1",
          targetPitch: -20,
          targetYaw: 180,
          targetHfov: 100,
          cssClass: "tour-ground-hotspot",
        },
      ],
    },
    frontChurch: {
      type: "equirectangular",
      panorama: app.dataset.panoramaFrontChurchSrc,
      pitch: 0,
      yaw: -10,
      hfov: 100,
      hotSpots: [
        {
          id: "go-left-front-church",
          pitch: -20,
          yaw: -75,
          type: "scene",
          text: "Move to left chapel view",
          sceneId: "leftFrontChurch",
          targetPitch: -20,
          targetYaw: -80,
          targetHfov: 100,
          cssClass: "tour-ground-hotspot",
        },
        {
          id: "go-right-front-church",
          pitch: -17,
          yaw: 48,
          type: "scene",
          text: "Move to right chapel view",
          sceneId: "rightFrontChurch",
          cssClass: "tour-ground-hotspot",
        },
        {
          id: "go-inside-church-from-front-church",
          pitch: 0,
          yaw: -15,
          type: "scene",
          text: "Move inside the chapel",
          sceneId: "insideChurch",
          cssClass: "tour-ground-hotspot tour-ground-hotspot--enter",
        },
        {
          id: "return-middle-g-inside",
          pitch: -7,
          yaw: 166,
          type: "scene",
          text: "Return to middle gate inside view",
          sceneId: "middleGInside",
          targetPitch: -20,
          targetYaw: -55,
          targetHfov: 100,
          cssClass: "tour-ground-hotspot",
        },
      ],
    },
    leftFrontChurch: {
      type: "equirectangular",
      panorama: app.dataset.panoramaLeftFrontChurchSrc,
      pitch: 0,
      yaw: 0,
      hfov: 100,
      hotSpots: [
        {
          id: "go-left-first-tombs-from-left-front-church",
          pitch: -21.26,
          yaw: -80.65,
          type: "scene",
          text: "Move to left first tombs view",
          sceneId: "leftFirstTombs",
          targetPitch: -1.82,
          targetYaw: 82.26,
          targetHfov: 100,
          cssClass: "tour-ground-hotspot",
        },
        {
          id: "return-front-church-from-left",
          pitch: -25,
          yaw: 66,
          type: "scene",
          text: "Return to front chapel view",
          sceneId: "frontChurch",
          targetPitch: -20,
          targetYaw: 55,
          targetHfov: 100,
          cssClass: "tour-ground-hotspot",
        },
        {
          id: "go-inside-church-from-left",
          pitch: 0,
          yaw: -18,
          type: "scene",
          text: "Move inside the chapel",
          sceneId: "insideChurch",
          cssClass: "tour-ground-hotspot tour-ground-hotspot--enter",
        },
      ],
    },
    insideChurch: {
      type: "equirectangular",
      panorama: app.dataset.panoramaInsideChurchSrc,
      pitch: 0,
      yaw: -24,
      hfov: 100,
      hotSpots: [
        ...insideChapelImageHotspots,
        {
          id: "go-stairs-church",
          pitch: -29,
          yaw: 68,
          type: "scene",
          text: "Move to chapel stairs view",
          sceneId: "stairsChurch",
          cssClass: "tour-ground-hotspot",
        },
        {
          id: "go-inside-church-1",
          pitch: -23,
          yaw: -24,
          type: "scene",
          text: "Move deeper inside the chapel",
          sceneId: "insideChurch1",
          cssClass: "tour-ground-hotspot",
        },
        {
          id: "return-front-church-from-inside-church",
          pitch: -12,
          yaw: 155,
          type: "scene",
          text: "Return to front chapel view",
          sceneId: "frontChurch",
          sceneId: "frontChurch",
          cssClass: "tour-ground-hotspot tour-ground-hotspot--exit",
        },
      ],
    },
    stairsChurch: {
      type: "equirectangular",
      panorama: app.dataset.panoramaStairsChurchSrc,
      pitch: 0,
      yaw: 0,
      hfov: 100,
      hotSpots: [
        {
          id: "go-underground-1",
          pitch: -45,
          yaw: -10,
          type: "scene",
          text: "Move to underground view",
          sceneId: "underground1",
          cssClass: "tour-ground-hotspot",
        },
        {
          id: "return-inside-church-from-stairs",
          pitch: 2,
          yaw: -50,
          type: "scene",
          text: "Return to inside chapel view",
          sceneId: "insideChurch",
          cssClass: "tour-ground-hotspot",
        },
      ],
    },
    underground1: {
      type: "equirectangular",
      panorama: app.dataset.panoramaUnderground1Src,
      pitch: 0,
      yaw: -20,
      hfov: 100,
      hotSpots: [
        {
          id: "go-middle-underground",
          pitch: -36,
          yaw: -17,
          type: "scene",
          text: "Move to middle underground view",
          sceneId: "middleUnderground",
          targetPitch: 0,
          targetYaw: 60,
          targetHfov: 100,
          cssClass: "tour-ground-hotspot",
        },
        {
          id: "return-stairs-church-from-underground",
          pitch: -6,
          yaw: 164,
          type: "scene",
          text: "Return to chapel stairs view",
          sceneId: "stairsChurch",
          cssClass: "tour-ground-hotspot",
        },
      ],
    },
    middleUnderground: {
      type: "equirectangular",
      panorama: app.dataset.panoramaMiddleUndergroundSrc,
      pitch: 0,
      yaw: -110,
      hfov: 100,
      hotSpots: [
        {
          id: "go-front-altar-underground",
          pitch: -33,
          yaw: -22,
          type: "scene",
          text: "Move to front altar underground view",
          sceneId: "frontAltarUnderground",
          targetPitch: -5,
          targetYaw: 180,
          targetHfov: 100,
          cssClass: "tour-ground-hotspot",
        },
        {
          id: "go-underground-2",
          pitch: -27,
          yaw: 67,
          type: "scene",
          text: "Move to underground 2 view",
          sceneId: "underground2",
          cssClass: "tour-ground-hotspot",
        },
        {
          id: "go-underground-3",
          pitch: -22,
          yaw: 158,
          type: "scene",
          text: "Move to underground 3 view",
          sceneId: "underground3",
          cssClass: "tour-ground-hotspot",
        },
        {
          id: "return-underground-1-from-middle",
          pitch: -30,
          yaw: 248,
          type: "scene",
          text: "Return to underground view",
          sceneId: "underground1",
          targetPitch: 0,
          targetYaw: 170,
          targetHfov: 100,
          cssClass: "tour-ground-hotspot",
        },
      ],
    },
    frontAltarUnderground: {
      type: "equirectangular",
      panorama: app.dataset.panoramaFrontAltarUndergroundSrc,
      pitch: 0,
      yaw: 0,
      hfov: 100,
      hotSpots: [
        {
          id: "return-middle-underground-from-front-altar",
          pitch: -45,
          yaw: -9,
          type: "scene",
          text: "Return to middle underground view",
          sceneId: "middleUnderground",
          targetPitch: 0,
          targetYaw: -200,
          targetHfov: 100,
          cssClass: "tour-ground-hotspot",
        },
      ],
    },
    underground2: {
      type: "equirectangular",
      panorama: app.dataset.panoramaUnderground2Src,
      pitch: 0,
      yaw: -14,
      hfov: 100,
      hotSpots: [
        {
          id: "return-middle-underground-from-underground-2",
          pitch: -35,
          yaw: -17,
          type: "scene",
          text: "Return to middle underground view",
          sceneId: "middleUnderground",
          cssClass: "tour-ground-hotspot",
        },
      ],
    },
    underground3: {
      type: "equirectangular",
      panorama: app.dataset.panoramaUnderground3Src,
      pitch: 0,
      yaw: 0,
      hfov: 100,
      hotSpots: [
        {
          id: "return-middle-underground-from-underground-3",
          pitch: -20,
          yaw: -5,
          type: "scene",
          text: "Return to middle underground view",
          sceneId: "middleUnderground",
          targetPitch: 0,
          targetYaw: -20,
          targetHfov: 100,
          cssClass: "tour-ground-hotspot",
        },
      ],
    },
    insideChurch1: {
      type: "equirectangular",
      panorama: app.dataset.panoramaInsideChurch1Src,
      pitch: 0,
      yaw: 160,
      hfov: 100,
      hotSpots: [
        {
          id: "return-inside-church",
          pitch: -24,
          yaw: -20,
          type: "scene",
          text: "Return to inside chapel view",
          sceneId: "insideChurch",
          targetPitch: -20,
          targetYaw: 160,
          targetHfov: 100,
          cssClass: "tour-ground-hotspot",
        },
      ],
    },
    rightFrontChurch: {
      type: "equirectangular",
      panorama: app.dataset.panoramaRightFrontChurchSrc,
      pitch: 0,
      yaw: 0,
      hfov: 100,
      hotSpots: [
        {
          id: "return-front-church-from-right",
          pitch: -17,
          yaw: -133,
          type: "scene",
          text: "Return to front chapel view",
          sceneId: "frontChurch",
          targetPitch: -20,
          targetYaw: -140,
          targetHfov: 100,
          cssClass: "tour-ground-hotspot",
        },
        {
          id: "go-right-front-tombs",
          pitch: -22,
          yaw: 27,
          type: "scene",
          text: "Move to right front tombs view",
          sceneId: "rightFrontTombs",
          targetPitch: -6.57,
          targetYaw: -83.58,
          targetHfov: 100,
          cssClass: "tour-ground-hotspot",
        },
        {
          id: "go-inside-church-from-right",
          pitch: 0,
          yaw: -64,
          type: "scene",
          text: "Move inside the chapel",
          sceneId: "insideChurch",
          cssClass: "tour-ground-hotspot tour-ground-hotspot--enter",
        },
      ],
    },
    rightFrontTombs: {
      type: "equirectangular",
      panorama: app.dataset.panoramaRightFrontTombsSrc,
      pitch: 0,
      yaw: 0,
      hfov: 100,
      hotSpots: [
        {
          id: "go-right-front-tombs-1",
          pitch: -9,
          yaw: -67,
          type: "scene",
          text: "Move to deeper right front tombs view",
          sceneId: "rightFrontTombs1",
          targetPitch: -6.57,
          targetYaw: -83.58,
          targetHfov: 100,
          cssClass: "tour-ground-hotspot",
        },
        {
          id: "return-right-front-church-from-tombs",
          pitch: -14,
          yaw: 30,
          type: "scene",
          text: "Return to right chapel view",
          sceneId: "rightFrontChurch",
          targetPitch: -12,
          targetYaw: 180,
          targetHfov: 100,
          cssClass: "tour-ground-hotspot",
        },
      ],
    },
    rightFrontTombs1: {
      type: "equirectangular",
      panorama: app.dataset.panoramaRightFrontTombs1Src,
      pitch: 0,
      yaw: -110,
      hfov: 100,
      hotSpots: [
        {
          id: "go-right-front-tombs-2",
          pitch: -11.27,
          yaw: -99.92,
          type: "scene",
          text: "Move to deepest right front tombs view",
          sceneId: "rightFrontTombs2",
          targetPitch: -1.11,
          targetYaw: -53.2,
          targetHfov: 100,
          cssClass: "tour-ground-hotspot",
        },
        {
          id: "return-right-front-tombs-from-right-front-tombs-1",
          pitch: -5,
          yaw: 77,
          type: "scene",
          text: "Return to right front tombs view",
          sceneId: "rightFrontTombs",
          targetPitch: 0.59,
          targetYaw: 34.92,
          targetHfov: 100,
          cssClass: "tour-ground-hotspot",
        },
      ],
    },
    rightFrontTombs2: {
      type: "equirectangular",
      panorama: app.dataset.panoramaRightFrontTombs2Src,
      pitch: 0,
      yaw: 0,
      hfov: 100,
      hotSpots: [
        {
          id: "go-right-middle-g",
          pitch: -6.34,
          yaw: -52.9,
          type: "scene",
          text: "Move to right middle gate view",
          sceneId: "rightMiddleG",
          targetPitch: -6.66,
          targetYaw: -99.92,
          targetHfov: 100,
          cssClass: "tour-ground-hotspot",
        },
        {
          id: "return-right-front-tombs-1-from-right-front-tombs-2",
          pitch: -7.06,
          yaw: 86.13,
          type: "scene",
          text: "Return to deeper right front tombs view",
          sceneId: "rightFrontTombs1",
          targetPitch: 3.34,
          targetYaw: 80.68,
          targetHfov: 100,
          cssClass: "tour-ground-hotspot",
        },
      ],
    },
    rightMiddleG: {
      type: "equirectangular",
      panorama: app.dataset.panoramaRightMiddleGSrc,
      pitch: 0,
      yaw: 0,
      hfov: 100,
      hotSpots: [
        {
          id: "go-right-corner-middle-g",
          pitch: -9.2,
          yaw: -98.01,
          type: "scene",
          text: "Move to right corner middle gate view",
          sceneId: "rightCornerMiddleG",
          targetPitch: -2.89,
          targetYaw: -93.68,
          targetHfov: 100,
          cssClass: "tour-ground-hotspot",
        },
        {
          id: "return-right-front-tombs-2-from-right-middle-g",
          pitch: -7.89,
          yaw: 74.9,
          type: "scene",
          text: "Return to deepest right front tombs view",
          sceneId: "rightFrontTombs2",
          targetPitch: 0.5,
          targetYaw: 88.81,
          targetHfov: 100,
          cssClass: "tour-ground-hotspot",
        },
      ],
    },
    rightCornerMiddleG: {
      type: "equirectangular",
      panorama: app.dataset.panoramaRightCornerMiddleGSrc,
      pitch: 0,
      yaw: 0,
      hfov: 100,
      hotSpots: [
        {
          id: "go-right-middle-corner-middle-g",
          pitch: -14.61,
          yaw: -93.01,
          type: "scene",
          text: "Move to right middle corner middle gate view",
          sceneId: "rightMiddleCornerMiddleG",
          targetPitch: -4.48,
          targetYaw: -104.05,
          targetHfov: 100,
          cssClass: "tour-ground-hotspot",
        },
        {
          id: "return-right-middle-g-from-right-corner-middle-g",
          pitch: -7.09,
          yaw: 43.01,
          type: "scene",
          text: "Return to right middle gate view",
          sceneId: "rightMiddleG",
          targetPitch: 1.09,
          targetYaw: 77.68,
          targetHfov: 100,
          cssClass: "tour-ground-hotspot",
        },
      ],
    },
    rightMiddleCornerMiddleG: {
      type: "equirectangular",
      panorama: app.dataset.panoramaRightMiddleCornerMiddleGSrc,
      pitch: 0,
      yaw: 0,
      hfov: 100,
      hotSpots: [
        {
          id: "go-right-corner-inside-front-gate",
          pitch: -8.24,
          yaw: -102.44,
          type: "scene",
          text: "Move to right corner inside front gate view",
          sceneId: "rightCornerInsideFrontGate",
          targetPitch: -2.81,
          targetYaw: -59.21,
          targetHfov: 100,
          cssClass: "tour-ground-hotspot",
        },
        {
          id: "return-right-corner-middle-g-from-right-middle-corner-middle-g",
          pitch: -13.59,
          yaw: 76.99,
          type: "scene",
          text: "Return to right corner middle gate view",
          sceneId: "rightCornerMiddleG",
          targetPitch: 0.23,
          targetYaw: 42.85,
          targetHfov: 100,
          cssClass: "tour-ground-hotspot",
        },
      ],
    },
    rightCornerInsideFrontGate: {
      type: "equirectangular",
      panorama: app.dataset.panoramaRightCornerInsideFrontGateSrc,
      pitch: 0,
      yaw: 0,
      hfov: 100,
      hotSpots: [
        {
          id: "go-inside-front-gate-from-right-corner-inside-front-gate",
          pitch: -8.28,
          yaw: -58.85,
          type: "scene",
          text: "Move to inside front gate view",
          sceneId: "insideFrontGate",
          targetPitch: -4.83,
          targetYaw: -88.96,
          targetHfov: 100,
          cssClass: "tour-ground-hotspot",
        },
        {
          id: "return-right-middle-corner-middle-g-from-right-corner-inside-front-gate",
          pitch: -7.52,
          yaw: 78.46,
          type: "scene",
          text: "Return to right middle corner middle gate view",
          sceneId: "rightMiddleCornerMiddleG",
          targetPitch: -1.42,
          targetYaw: 78.78,
          targetHfov: 100,
          cssClass: "tour-ground-hotspot",
        },
      ],
    },
    rightFrontGate: {
      type: "equirectangular",
      panorama: app.dataset.panoramaRightSrc,
      pitch: -20,
      yaw: 90,
      hfov: 100,
      hotSpots: [
        {
          id: "return-front-gate-from-right",
          pitch: -11,
          yaw: -89,
          type: "scene",
          text: "Return to front gate view",
          sceneId: "frontGate",
          targetPitch: -20,
          targetYaw: -90,
          targetHfov: 100,
          cssClass: "tour-ground-hotspot",
        },
      ],
    },
    leftFrontGate: {
      type: "equirectangular",
      panorama: app.dataset.panoramaLeftSrc,
      pitch: -2,
      yaw: -93,
      hfov: 100,
      hotSpots: [
        {
          id: "go-left-flag",
          pitch: -14,
          yaw: -95,
          type: "scene",
          text: "Move to flag viewpoint",
          sceneId: "leftFlag",
          cssClass: "tour-ground-hotspot",
        },
        {
          id: "return-front-gate",
          pitch: -14,
          yaw: 105,
          type: "scene",
          text: "Return to front gate view",
          sceneId: "frontGate",
          targetPitch: -20,
          targetYaw: 90,
          targetHfov: 100,
          cssClass: "tour-ground-hotspot",
        },
      ],
    },
    leftFlag: {
      type: "equirectangular",
      panorama: app.dataset.panoramaFlagSrc,
      pitch: -5,
      yaw: -100,
      hfov: 100,
      hotSpots: [
        {
          id: "go-middle-g-museum",
          pitch: -18,
          yaw: -101.5,
          type: "scene",
          text: "Move to middle gate museum view",
          sceneId: "middleGMuseum",
          cssClass: "tour-ground-hotspot",
        },
        {
          id: "return-left-front-gate",
          pitch: -15,
          yaw: 75,
          type: "scene",
          text: "Return to left front gate",
          sceneId: "leftFrontGate",
          targetPitch: -20,
          targetYaw: 90,
          targetHfov: 100,
          cssClass: "tour-ground-hotspot",
        },
      ],
    },
    middleGMuseum: {
      type: "equirectangular",
      panorama: app.dataset.panoramaMiddleGSrc,
      pitch: -5,
      yaw: -100,
      hfov: 100,
      hotSpots: [
        {
          id: "go-front-museum",
          pitch: -25,
          yaw: -100,
          type: "scene",
          text: "Move to front museum view",
          sceneId: "frontMuseum",
          cssClass: "tour-ground-hotspot",
        },
        {
          id: "return-left-flag",
          pitch: -17,
          yaw: 83,
          type: "scene",
          text: "Return to flag viewpoint",
          sceneId: "leftFlag",
          targetPitch: -20,
          targetYaw: 90,
          targetHfov: 100,
          cssClass: "tour-ground-hotspot",
        },
      ],
    },
    frontMuseum: {
      type: "equirectangular",
      panorama: app.dataset.panoramaFrontMuseumSrc,
      pitch: 0,
      yaw: 0,
      hfov: 100,
      hotSpots: [
        {
          id: "go-inside-museum",
          pitch: -12,
          yaw: 37,
          type: "scene",
          text: "Move inside the museum",
          sceneId: "insideMuseum",
          cssClass: "tour-ground-hotspot tour-ground-hotspot--enter",
        },
        {
          id: "return-middle-g-museum",
          pitch: -30,
          yaw: 173,
          type: "scene",
          text: "Return to middle gate museum view",
          sceneId: "middleGMuseum",
          targetPitch: -20,
          targetYaw: 90,
          targetHfov: 100,
          cssClass: "tour-ground-hotspot",
        },
      ],
    },
    insideMuseum: {
      type: "equirectangular",
      panorama: app.dataset.panoramaInsideMuseumSrc,
      pitch: -5,
      yaw: 90,
      hfov: 150,
      hotSpots: [
        {
          id: "go-museum-1",
          pitch: -50,
          yaw: 40,
          type: "scene",
          text: "Move to museum 1 view",
          sceneId: "museum1",
          cssClass: "tour-ground-hotspot",
        },
        {
          id: "return-front-museum",
          pitch: -60,
          yaw: 180,
          type: "scene",
          text: "Return to front museum view",
          sceneId: "frontMuseum",
          targetPitch: -20,
          targetYaw: 180,
          targetHfov: 140,
          cssClass: "tour-ground-hotspot tour-ground-hotspot--exit",
        },
      ],
    },
    museum1: {
      type: "equirectangular",
      panorama: app.dataset.panoramaMuseum1Src,
      pitch: -20,
      yaw: 75,
      hfov: 140,
      hotSpots: [
        {
          id: "museum1-pulse-marker",
          pitch: -20.31,
          yaw: 101.6,
          type: "info",
          text: "",
          clickHandlerFunc: openFloatingArtifactOverlay,
          clickHandlerArgs: {
            sourceHotspotId: "museum1-pulse-marker",
            windowHotspotId: "museum1-pulse-marker-window",
            imageSrc: balanghayImageSrc,
            imageAlt: "Balanghay",
            glbSrc: balanghayGlbSrc,
            glbAlt: "Balanghay 3D model",
            audioByLanguage: {
              tl: balanghayTagalogAudioSrc,
              en: balanghayEnglishAudioSrc,
            },
            windowPitch: -20.31,
            windowYaw: 101.6,
          },
          cssClass: "tour-ground-hotspot tour-ground-hotspot--pulse tour-ground-hotspot--compact tour-ground-hotspot--no-icon",
        },
        {
          id: "museum1-kabaong-marker",
          pitch: -18.35,
          yaw: 26.68,
          type: "info",
          text: "",
          clickHandlerFunc: openFloatingArtifactOverlay,
          clickHandlerArgs: {
            sourceHotspotId: "museum1-kabaong-marker",
            windowHotspotId: "museum1-kabaong-marker-window",
            imageSrc: kabaongImageSrc,
            imageAlt: "Kabaong",
            glbSrc: kabaongGlbSrc,
            glbAlt: "Kabaong 3D model",
            audioByLanguage: {
              tl: kabaongTagalogAudioSrc,
              en: kabaongEnglishAudioSrc,
            },
            windowPitch: -18.35,
            windowYaw: 26.68,
          },
          cssClass: "tour-ground-hotspot tour-ground-hotspot--pulse tour-ground-hotspot--compact tour-ground-hotspot--no-icon",
        },
        {
          id: "museum1-uloh-marker",
          pitch: -17.35,
          yaw: -128.78,
          type: "info",
          text: "",
          clickHandlerFunc: openFloatingArtifactOverlay,
          clickHandlerArgs: {
            sourceHotspotId: "museum1-uloh-marker",
            windowHotspotId: "museum1-uloh-marker-window",
            imageSrc: ulohImageSrc,
            imageAlt: "Ulóh",
            glbSrc: ulohGlbSrc,
            glbAlt: "Ulóh 3D model",
            audioByLanguage: {
              tl: ulohTagalogAudioSrc,
              en: ulohEnglishAudioSrc,
            },
            windowPitch: -17.35,
            windowYaw: -128.78,
          },
          cssClass: "tour-ground-hotspot tour-ground-hotspot--pulse tour-ground-hotspot--compact tour-ground-hotspot--no-icon",
        },
        {
          id: "go-museum-2",
          pitch: -30,
          yaw: -100,
          type: "scene",
          text: "Move to museum 2 view",
          sceneId: "museum2",
          cssClass: "tour-ground-hotspot",
        },
        {
          id: "return-inside-museum",
          pitch: -45,
          yaw: 180,
          type: "scene",
          text: "Return to inside museum view",
          sceneId: "insideMuseum",
          targetPitch: -20,
          targetYaw: 180,
          targetHfov: 140,
          cssClass: "tour-ground-hotspot",
        },
      ],
    },
    museum2: {
      type: "equirectangular",
      panorama: app.dataset.panoramaMuseum2Src,
      pitch: -20,
      yaw: 80,
      hfov: 100,
      hotSpots: [
        {
          id: "museum2-kabila-marker",
          pitch: -20.36,
          yaw: 47.56,
          type: "info",
          text: "",
          clickHandlerFunc: openFloatingArtifactOverlay,
          clickHandlerArgs: {
            sourceHotspotId: "museum2-kabila-marker",
            windowHotspotId: "museum2-kabila-marker-window",
            imageSrc: kabilaImageSrc,
            imageAlt: "Kabila",
            audioByLanguage: {
              tl: kabilaTagalogAudioSrc,
              en: kabilaEnglishAudioSrc,
            },
            windowPitch: -20.36,
            windowYaw: 47.56,
          },
          cssClass: "tour-ground-hotspot tour-ground-hotspot--pulse tour-ground-hotspot--compact tour-ground-hotspot--no-icon",
        },
        {
          id: "museum2-banga-marker",
          pitch: -17.11,
          yaw: 169.7,
          type: "info",
          text: "",
          clickHandlerFunc: openFloatingArtifactOverlay,
          clickHandlerArgs: {
            sourceHotspotId: "museum2-banga-marker",
            windowHotspotId: "museum2-banga-marker-window",
            imageSrc: bangaImageSrc,
            imageAlt: "Banga",
            glbSrc: bangaGlbSrc,
            glbAlt: "Banga 3D model",
            audioByLanguage: {
              tl: bangaTagalogAudioSrc,
              en: bangaEnglishAudioSrc,
            },
            windowPitch: -17.11,
            windowYaw: 169.7,
          },
          cssClass: "tour-ground-hotspot tour-ground-hotspot--pulse tour-ground-hotspot--compact tour-ground-hotspot--no-icon",
        },
        {
          id: "museum2-jar-marker",
          pitch: -29.35,
          yaw: 169.12,
          type: "info",
          text: "",
          clickHandlerFunc: openFloatingArtifactOverlay,
          clickHandlerArgs: {
            sourceHotspotId: "museum2-jar-marker",
            windowHotspotId: "museum2-jar-marker-window",
            imageSrc: jarImageSrc,
            imageAlt: "Jar",
            audioByLanguage: {
              tl: jarTagalogAudioSrc,
              en: jarEnglishAudioSrc,
            },
            windowPitch: -29.35,
            windowYaw: 169.12,
          },
          cssClass: "tour-ground-hotspot tour-ground-hotspot--pulse tour-ground-hotspot--compact tour-ground-hotspot--no-icon",
        },
        {
          id: "go-museum-3",
          pitch: -23,
          yaw: 83,
          type: "scene",
          text: "Move to museum 3 view",
          sceneId: "museum3",
          cssClass: "tour-ground-hotspot",
        },
        {
          id: "return-museum-1",
          pitch: -30,
          yaw: -110,
          type: "scene",
          text: "Return to museum 1 view",
          sceneId: "museum1",
          targetPitch: -20,
          targetYaw: 180,
          targetHfov: 140,
          cssClass: "tour-ground-hotspot",
        },
      ],
    },
    museum3: {
      type: "equirectangular",
      panorama: app.dataset.panoramaMuseum3Src,
      pitch: -12,
      yaw: 170,
      hfov: 100,
      hotSpots: [
        ...museum3ArtifactHotspots,
        {
          id: "return-museum-2",
          pitch: -30,
          yaw: -10,
          type: "scene",
          text: "Return to museum 2 view",
          sceneId: "museum2",
          targetPitch: -20,
          targetYaw: -100,
          targetHfov: 100,
          cssClass: "tour-ground-hotspot",
        },
      ],
    },
  };

  const requestedScene = debugParams.get("scene");
  const initialScene = requestedScene && Object.prototype.hasOwnProperty.call(rawScenes, requestedScene) ? requestedScene : "frontGate";

  function syncSceneInUrl(sceneId) {
    if (!sceneId || !Object.prototype.hasOwnProperty.call(rawScenes, sceneId)) {
      return;
    }

    const nextUrl = new URL(window.location.href);
    nextUrl.searchParams.set("scene", sceneId);
    window.history.replaceState({}, "", nextUrl);
  }

  function updateHotspotVisibilityState() {
    if (!app) {
      return;
    }

    app.classList.toggle("tour-hide-scene-hotspots", !hotspotsVisible);
    app.classList.toggle("tour-hide-artifact-hotspots", !hotspotsVisible);

    if (toggleSceneHotspotsButton) {
      toggleSceneHotspotsButton.classList.toggle("is-active", hotspotsVisible);
      toggleSceneHotspotsButton.setAttribute("aria-pressed", hotspotsVisible ? "true" : "false");
      toggleSceneHotspotsButton.setAttribute("aria-label", hotspotsVisible ? "Hide hotspots" : "Show hotspots");
    }

    // Translation button: shows the current narration language (TL/EN) and is
    // only enabled while an artifact with audio is open.
    if (toggleArtifactHotspotsButton) {
      const artifactAudioEnabled = Boolean(activeFloatingArtifactAudioConfig && (activeFloatingArtifactAudioConfig.tl || activeFloatingArtifactAudioConfig.en));
      const isTagalog = floatingArtifactAudioLanguage === "tl";
      toggleArtifactHotspotsButton.textContent = isTagalog ? "TL" : "EN";
      toggleArtifactHotspotsButton.disabled = !artifactAudioEnabled;
      toggleArtifactHotspotsButton.setAttribute("aria-disabled", artifactAudioEnabled ? "false" : "true");
      toggleArtifactHotspotsButton.setAttribute("aria-label", artifactAudioEnabled ? `Switch narration to ${isTagalog ? "English" : "Tagalog"}` : "Narration language unavailable");
    }
  }

  function syncFullscreenButton() {
    if (!toggleFullscreenButton) {
      return;
    }

    if (!canUseFullscreen) {
      toggleFullscreenButton.classList.remove("is-active");
      toggleFullscreenButton.setAttribute("aria-pressed", "false");
      return;
    }

    const isFullscreen = Boolean(document.fullscreenElement);
    toggleFullscreenButton.classList.toggle("is-active", isFullscreen);
    toggleFullscreenButton.setAttribute("aria-pressed", isFullscreen ? "true" : "false");
  }

  function setControlDockVisibility(isVisible) {
    if (!controlDock) {
      return;
    }

    controlDock.hidden = !isVisible;
    controlDock.classList.toggle("is-visible", isVisible);
  }

  /* ===== Live "you are here" minimap =====
     A round, zoomed-in close-up of your current spot (upper-right). Tapping it
     opens the full map, where every scene is a dot you can tap to travel. */
  function initMinimap() {
    if (!minimapEl || !minimapImg || !app) {
      return;
    }
    const url = app.dataset.minimapUrl;
    if (!url) {
      return;
    }

    // Tap the circle → open the full map.
    if (minimapCircle) {
      minimapCircle.addEventListener("click", openMapx);
    }
    if (mapxClose) {
      mapxClose.addEventListener("click", closeMapx);
    }
    if (mapxEl) {
      mapxEl.addEventListener("click", function (event) {
        if (event.target === mapxEl) { closeMapx(); } // click the backdrop to close
      });
    }
    window.addEventListener("keydown", function (event) {
      if (event.key === "Escape" && mapxEl && !mapxEl.hidden) { closeMapx(); }
    });
    window.addEventListener("resize", function () {
      if (minimapActiveScene) { centerMinimapOn(minimapActiveScene); }
      resetMapxView(); // frame size changed — refit the map
    });

    initMapxPanZoom();

    // Calibration helper: on the expanded map, click a scene's true spot to log
    // its fractional x/y (and yaw), ready to paste into tour-minimap.json.
    if (minimapDebug && mapxFrame) {
      mapxFrame.addEventListener("click", function (event) {
        if (event.target.classList && event.target.classList.contains("tour-mapx__dot")) {
          return; // let dot clicks travel instead of logging
        }
        const r = (mapxImg || mapxFrame).getBoundingClientRect();
        const x = Number(((event.clientX - r.left) / r.width).toFixed(3));
        const y = Number(((event.clientY - r.top) / r.height).toFixed(3));
        const scene = tourViewer && typeof tourViewer.getScene === "function" ? tourViewer.getScene() : "?";
        const yaw = tourViewer && typeof tourViewer.getYaw === "function" ? Number(tourViewer.getYaw().toFixed(1)) : 0;
        console.log(`"${scene}": { "x": ${x}, "y": ${y} },   // yaw=${yaw}`);
      });
    }

    fetch(url)
      .then(function (r) { return r.json(); })
      .then(function (data) {
        minimapData = data;
        if (data.width && data.height) {
          minimapAspect = data.width / data.height;
        }
        if (data.image) {
          minimapImg.src = data.image;
          if (mapxImg) { mapxImg.src = data.image; }
        }
        if (mapxEl) {
          mapxEl.style.setProperty("--map-aspect", String(minimapAspect));
        }
        minimapImg.addEventListener("load", function () {
          if (minimapImg.naturalWidth && minimapImg.naturalHeight) {
            minimapAspect = minimapImg.naturalWidth / minimapImg.naturalHeight;
            if (mapxEl) {
              mapxEl.style.setProperty("--map-aspect", String(minimapAspect));
            }
          }
          if (minimapActiveScene) { centerMinimapOn(minimapActiveScene); }
        });
        buildMapxDots(data);
        if (minimapActiveScene) { minimapSetActive(minimapActiveScene); }
      })
      .catch(function (err) {
        console.warn("Minimap data unavailable.", err);
      });
  }

  function openMapx() {
    if (mapxEl) { mapxEl.hidden = false; }
    resetMapxView(); // always open at fit-to-frame
  }
  function closeMapx() {
    if (mapxEl) { mapxEl.hidden = true; }
    mapxPointers.clear();
    mapxPanning = false;
    if (mapxFrame) { mapxFrame.classList.remove("is-panning"); }
  }

  /* ---- Expanded map: its own pan + zoom -----------------------------------
     Pinch / wheel / drag zoom and pan the MAP. Browser page-zoom is blocked on
     this overlay: the page is a fixed, full-screen app, so a stray page-zoom
     pushes the controls off-screen and the panorama then swallows the gestures
     that would zoom back out — leaving the visitor stuck. */
  function applyMapxTransform() {
    if (mapxStage) {
      mapxStage.style.transform =
        "translate(" + mapxTx + "px, " + mapxTy + "px) scale(" + mapxScale + ")";
    }
    if (mapxFrame) {
      mapxFrame.classList.toggle("is-zoomed", mapxScale > 1.01);
    }
  }

  function resetMapxView() {
    mapxScale = 1;
    mapxTx = 0;
    mapxTy = 0;
    applyMapxTransform();
  }

  function clampMapxPan() {
    if (!mapxFrame) { return; }
    const fw = mapxFrame.clientWidth;
    const fh = mapxFrame.clientHeight;
    const w = fw * mapxScale;
    const h = fh * mapxScale;
    // Never let the map drift away from the frame.
    mapxTx = Math.min(0, Math.max(Math.min(0, fw - w), mapxTx));
    mapxTy = Math.min(0, Math.max(Math.min(0, fh - h), mapxTy));
  }

  function zoomMapxAt(clientX, clientY, factor) {
    if (!mapxFrame) { return; }
    const next = Math.min(6, Math.max(1, mapxScale * factor));
    if (Math.abs(next - mapxScale) < 0.0001) { return; }
    const r = mapxFrame.getBoundingClientRect();
    const px = clientX - r.left;
    const py = clientY - r.top;
    // Keep the point under the fingers/cursor anchored while scaling.
    mapxTx = px - (px - mapxTx) * (next / mapxScale);
    mapxTy = py - (py - mapxTy) * (next / mapxScale);
    mapxScale = next;
    clampMapxPan();
    applyMapxTransform();
  }

  function initMapxPanZoom() {
    if (!mapxFrame || !mapxEl) { return; }

    // Wheel / trackpad-pinch (ctrl+wheel) zooms the map, never the page.
    mapxFrame.addEventListener("wheel", function (e) {
      e.preventDefault();
      zoomMapxAt(e.clientX, e.clientY, e.deltaY < 0 ? 1.18 : 1 / 1.18);
    }, { passive: false });

    // iOS Safari pinch fires gesture events — block them so the page can't zoom.
    ["gesturestart", "gesturechange", "gestureend"].forEach(function (t) {
      mapxEl.addEventListener(t, function (e) { e.preventDefault(); }, { passive: false });
    });

    mapxFrame.addEventListener("pointerdown", function (e) {
      if (e.target.closest && e.target.closest(".tour-mapx__dot")) { return; }
      mapxPointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (mapxPointers.size === 2) {
        const p = Array.from(mapxPointers.values());
        mapxPinchDist = Math.hypot(p[0].x - p[1].x, p[0].y - p[1].y);
        mapxPanning = false;
      } else if (mapxPointers.size === 1 && mapxScale > 1.01) {
        mapxPanning = true;
        mapxFrame.classList.add("is-panning");
        try { mapxFrame.setPointerCapture(e.pointerId); } catch (err) { /* ignore */ }
      }
    });

    mapxFrame.addEventListener("pointermove", function (e) {
      if (!mapxPointers.has(e.pointerId)) { return; }
      const prev = mapxPointers.get(e.pointerId);
      mapxPointers.set(e.pointerId, { x: e.clientX, y: e.clientY });

      if (mapxPointers.size === 2) {
        const p = Array.from(mapxPointers.values());
        const dist = Math.hypot(p[0].x - p[1].x, p[0].y - p[1].y);
        if (mapxPinchDist > 0 && dist > 0) {
          zoomMapxAt((p[0].x + p[1].x) / 2, (p[0].y + p[1].y) / 2, dist / mapxPinchDist);
        }
        mapxPinchDist = dist;
        e.preventDefault();
        return;
      }

      if (mapxPanning) {
        mapxTx += e.clientX - prev.x;
        mapxTy += e.clientY - prev.y;
        clampMapxPan();
        applyMapxTransform();
        e.preventDefault();
      }
    }, { passive: false });

    const endPointer = function (e) {
      mapxPointers.delete(e.pointerId);
      if (mapxPointers.size < 2) { mapxPinchDist = 0; }
      if (mapxPointers.size === 0) {
        mapxPanning = false;
        mapxFrame.classList.remove("is-panning");
      }
    };
    ["pointerup", "pointercancel", "pointerleave"].forEach(function (t) {
      mapxFrame.addEventListener(t, endPointer);
    });

    // Double-click / double-tap resets the map to fit.
    mapxFrame.addEventListener("dblclick", function (e) {
      e.preventDefault();
      resetMapxView();
    });
  }

  // Dots on the expanded (full) map.
  function buildMapxDots(data) {
    if (!mapxDotsEl) { return; }
    mapxDotsEl.innerHTML = "";
    const scenes = (data && data.scenes) || {};
    Object.keys(scenes).forEach(function (sceneId) {
      const pos = scenes[sceneId];
      if (!pos || typeof pos.x !== "number" || typeof pos.y !== "number") {
        return;
      }
      const dot = document.createElement("button");
      dot.type = "button";
      dot.className = "tour-mapx__dot";
      dot.style.left = pos.x * 100 + "%";
      dot.style.top = pos.y * 100 + "%";
      dot.setAttribute("aria-label", pos.label || sceneId);
      dot.title = pos.label || sceneId;
      dot.addEventListener("click", function () {
        if (tourViewer && typeof tourViewer.loadScene === "function" && sceneId !== minimapActiveScene) {
          try { tourViewer.loadScene(sceneId); } catch (e) { /* ignore */ }
        }
        closeMapx();
      });
      minimapDotEls[sceneId] = dot;
      mapxDotsEl.appendChild(dot);
    });

    // Non-clickable place markers (Museum, Chapel) — a distinct pin + label.
    (data.landmarks || []).forEach(function (lm) {
      if (!lm || typeof lm.x !== "number" || typeof lm.y !== "number") {
        return;
      }
      const mark = document.createElement("div");
      mark.className = "tour-mapx__landmark";
      mark.style.left = lm.x * 100 + "%";
      mark.style.top = lm.y * 100 + "%";
      const pin = document.createElement("span");
      pin.className = "tour-mapx__landmark-pin";
      const lbl = document.createElement("span");
      lbl.className = "tour-mapx__landmark-label";
      lbl.textContent = lm.label || "";
      mark.appendChild(pin);
      mark.appendChild(lbl);
      mapxDotsEl.appendChild(mark);
    });
  }

  // Slide + scale the circle's image so the current scene sits dead center.
  function centerMinimapOn(sceneId) {
    if (!minimapImg || !minimapCircle || !minimapData) { return; }
    const pos = minimapData.scenes && minimapData.scenes[sceneId];
    if (!pos) { return; }
    const d = minimapCircle.clientWidth || 90;
    const zoom = (typeof minimapData.zoom === "number" && minimapData.zoom > 0) ? minimapData.zoom : 3.2;
    const dispH = zoom * d;
    const dispW = dispH * minimapAspect;
    minimapImg.style.width = dispW + "px";
    minimapImg.style.height = dispH + "px";
    minimapImg.style.left = (d / 2 - pos.x * dispW) + "px";
    minimapImg.style.top = (d / 2 - pos.y * dispH) + "px";
  }

  function minimapSetActive(sceneId) {
    minimapActiveScene = sceneId;
    if (!minimapData) {
      return; // built once the data loads
    }
    // Indoors (museum / chapel-underground): hide the whole map.
    const hideList = minimapData.hideOn || [];
    if (hideList.indexOf(sceneId) !== -1) {
      if (minimapEl) { minimapEl.hidden = true; }
      closeMapx();
      return;
    }
    if (minimapEl) { minimapEl.hidden = false; }

    Object.keys(minimapDotEls).forEach(function (id) {
      minimapDotEls[id].classList.toggle("is-active", id === sceneId);
    });
    const pos = minimapData.scenes && minimapData.scenes[sceneId];
    const label = (pos && pos.label) || sceneId || "";
    if (minimapLabelEl) { minimapLabelEl.textContent = label; }
    if (mapxLabelEl) { mapxLabelEl.textContent = label; }
    centerMinimapOn(sceneId);
    startMinimapHeadingLoop();
  }

  // Bearing (deg, clockwise from map-up) from scene a to scene b, using their
  // fractional map positions.
  function minimapBearing(a, b) {
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    if (Math.abs(dx) < 1e-4 && Math.abs(dy) < 1e-4) { return null; }
    return (Math.atan2(dx, -dy) * 180) / Math.PI;
  }

  function minimapCircMean(list) {
    let s = 0;
    let c = 0;
    list.forEach(function (deg) {
      const r = (deg * Math.PI) / 180;
      s += Math.sin(r);
      c += Math.cos(r);
    });
    return { mean: (Math.atan2(s, c) * 180) / Math.PI, strength: Math.hypot(s, c) / (list.length || 1) };
  }

  /* Derive each scene's map orientation automatically: every "walk here" hotspot
     points at a neighbour whose map position we know, so the offset between the
     hotspot's 360 yaw and the on-map bearing to that neighbour tells us how the
     scene's yaw frame is rotated relative to the map. Averaging the scene's
     hotspots gives a robust per-scene north — so the heading pointer matches the
     real look direction in every scene. */
  function computeSceneNorths() {
    if (!minimapData || !resolvedScenes) { return null; }
    const scenes = minimapData.scenes || {};

    // Detect the global yaw handedness (pannellum's sign) — the one that makes a
    // scene's several hotspots agree on a single offset.
    let bestSign = -1;
    let bestScore = -1;
    [-1, 1].forEach(function (sign) {
      let total = 0;
      let count = 0;
      Object.keys(scenes).forEach(function (aId) {
        const a = scenes[aId];
        const rs = resolvedScenes[aId];
        if (!a || !rs) { return; }
        const offs = [];
        (rs.hotSpots || []).forEach(function (h) {
          if (h.type !== "scene" || !h.sceneId) { return; }
          const b = scenes[h.sceneId];
          if (!b) { return; }
          const mb = minimapBearing(a, b);
          if (mb === null) { return; }
          offs.push(mb - sign * h.yaw);
        });
        if (offs.length >= 2) { total += minimapCircMean(offs).strength; count += 1; }
      });
      const score = count ? total / count : 0;
      if (score > bestScore) { bestScore = score; bestSign = sign; }
    });
    minimapYawSign = (typeof minimapData.yawSign === "number") ? minimapData.yawSign : bestSign;

    const norths = {};
    Object.keys(scenes).forEach(function (aId) {
      const a = scenes[aId];
      const rs = resolvedScenes[aId];
      if (!a || !rs) { return; }
      const offs = [];
      (rs.hotSpots || []).forEach(function (h) {
        if (h.type !== "scene" || !h.sceneId) { return; }
        const b = scenes[h.sceneId];
        if (!b) { return; }
        const mb = minimapBearing(a, b);
        if (mb === null) { return; }
        offs.push(mb - minimapYawSign * h.yaw);
      });
      if (offs.length) { norths[aId] = minimapCircMean(offs).mean; }
    });
    return norths;
  }

  function startMinimapHeadingLoop() {
    if (minimapRaf) {
      return;
    }
    const tick = function () {
      minimapRaf = 0;
      if (!minimapNorths) { minimapNorths = computeSceneNorths(); }
      if (minimapConeEl && tourViewer && typeof tourViewer.getYaw === "function") {
        const pos = minimapData && minimapData.scenes && minimapData.scenes[minimapActiveScene];
        // Manual override wins; otherwise the auto-derived north; else 0.
        let northOff = 0;
        if (pos && typeof pos.north === "number") { northOff = pos.north; }
        else if (minimapNorths && typeof minimapNorths[minimapActiveScene] === "number") { northOff = minimapNorths[minimapActiveScene]; }
        else if (minimapData && typeof minimapData.northYaw === "number") { northOff = minimapData.northYaw; }
        let deg = 0;
        try { deg = minimapYawSign * tourViewer.getYaw() + northOff; } catch (e) { deg = 0; }
        minimapConeEl.style.transform = "translate(-50%, -100%) rotate(" + deg + "deg)";
      }
      if (minimapEl && !minimapEl.hidden) {
        minimapRaf = window.requestAnimationFrame(tick);
      }
    };
    minimapRaf = window.requestAnimationFrame(tick);
  }

  function degreesToRadians(value) {
    return (Number(value) * Math.PI) / 180;
  }

  function showFullscreenUnsupportedMessage() {
    window.alert("Fullscreen is not supported in this browser on iPhone. Please use pinch zoom and landscape mode for a larger view.");
  }

  function ensureCapturePreviewOverlay() {
    if (capturePreviewOverlay && capturePreviewImage) {
      return;
    }

    const overlay = document.createElement("div");
    overlay.className = "tour-overlay tour-overlay--center tour-overlay--interactive";
    overlay.hidden = true;
    overlay.id = "tourCapturePreviewOverlay";

    const panel = document.createElement("section");
    panel.className = "tour-capture-preview";
    panel.setAttribute("role", "dialog");
    panel.setAttribute("aria-modal", "true");
    panel.setAttribute("aria-label", "Captured virtual tour image");

    const closeButton = document.createElement("button");
    closeButton.className = "tour-capture-preview__close";
    closeButton.type = "button";
    closeButton.setAttribute("aria-label", "Close captured image preview");
    closeButton.textContent = "×";

    const imageWrap = document.createElement("div");
    imageWrap.className = "tour-capture-preview__image-wrap";

    const image = document.createElement("img");
    image.className = "tour-capture-preview__image";
    image.alt = "Captured virtual tour image";

    imageWrap.appendChild(image);
    panel.appendChild(closeButton);
    panel.appendChild(imageWrap);
    overlay.appendChild(panel);
    app.appendChild(overlay);

    closeButton.addEventListener("click", function () {
      overlay.hidden = true;
      image.removeAttribute("src");
    });

    overlay.addEventListener("click", function (event) {
      if (event.target === overlay) {
        overlay.hidden = true;
        image.removeAttribute("src");
      }
    });

    capturePreviewOverlay = overlay;
    capturePreviewImage = image;
  }

  function showCapturePreview(dataUrl) {
    ensureCapturePreviewOverlay();

    if (!capturePreviewOverlay || !capturePreviewImage) {
      return;
    }

    capturePreviewImage.src = dataUrl;
    capturePreviewOverlay.hidden = false;
  }

  // Belt-and-suspenders with the CSS touch-action:none — stop iOS Safari from
  // page-zooming when a pinch lands on the overlay backdrop or the 3D area.
  function blockOverlayPageZoom(overlay) {
    if (!overlay) { return; }
    ["gesturestart", "gesturechange", "gestureend"].forEach(function (t) {
      overlay.addEventListener(t, function (e) { e.preventDefault(); }, { passive: false });
    });
  }

  /* ---- Expanded photo: its own pan + zoom (same guard as the map) ---------
     Pinch / wheel / drag zoom and pan the PHOTO inside its frame. Browser
     page-zoom is blocked on the overlay (touch-action:none + gesture events),
     so a stray pinch can no longer zoom the whole page / panorama and leave
     the visitor stuck zoomed after closing. Returns { reset }. */
  function createPreviewImageZoom(frame, img) {
    const st = { scale: 1, tx: 0, ty: 0, pointers: new Map(), panning: false, pinch: 0 };

    function apply() {
      img.style.transformOrigin = "0 0";
      img.style.transform = "translate(" + st.tx + "px, " + st.ty + "px) scale(" + st.scale + ")";
      frame.classList.toggle("is-zoomed", st.scale > 1.01);
    }

    function reset() {
      st.scale = 1;
      st.tx = 0;
      st.ty = 0;
      st.pointers.clear();
      st.panning = false;
      st.pinch = 0;
      frame.classList.remove("is-panning");
      apply();
    }

    function clamp() {
      const fw = frame.clientWidth;
      const fh = frame.clientHeight;
      const w = fw * st.scale;
      const h = fh * st.scale;
      st.tx = Math.min(0, Math.max(Math.min(0, fw - w), st.tx));
      st.ty = Math.min(0, Math.max(Math.min(0, fh - h), st.ty));
    }

    function zoomAt(clientX, clientY, factor) {
      const next = Math.min(5, Math.max(1, st.scale * factor));
      if (Math.abs(next - st.scale) < 0.0001) { return; }
      const r = frame.getBoundingClientRect();
      const px = clientX - r.left;
      const py = clientY - r.top;
      st.tx = px - (px - st.tx) * (next / st.scale);
      st.ty = py - (py - st.ty) * (next / st.scale);
      st.scale = next;
      clamp();
      apply();
    }

    frame.addEventListener("wheel", function (e) {
      e.preventDefault();
      zoomAt(e.clientX, e.clientY, e.deltaY < 0 ? 1.18 : 1 / 1.18);
    }, { passive: false });

    // iOS Safari pinch fires gesture events — block them so the page can't zoom.
    ["gesturestart", "gesturechange", "gestureend"].forEach(function (t) {
      frame.addEventListener(t, function (e) { e.preventDefault(); }, { passive: false });
    });

    frame.addEventListener("pointerdown", function (e) {
      st.pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (st.pointers.size === 2) {
        const p = Array.from(st.pointers.values());
        st.pinch = Math.hypot(p[0].x - p[1].x, p[0].y - p[1].y);
        st.panning = false;
      } else if (st.pointers.size === 1 && st.scale > 1.01) {
        st.panning = true;
        frame.classList.add("is-panning");
        try { frame.setPointerCapture(e.pointerId); } catch (err) { /* ignore */ }
      }
    });

    frame.addEventListener("pointermove", function (e) {
      if (!st.pointers.has(e.pointerId)) { return; }
      const prev = st.pointers.get(e.pointerId);
      st.pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });

      if (st.pointers.size === 2) {
        const p = Array.from(st.pointers.values());
        const dist = Math.hypot(p[0].x - p[1].x, p[0].y - p[1].y);
        if (st.pinch > 0 && dist > 0) {
          zoomAt((p[0].x + p[1].x) / 2, (p[0].y + p[1].y) / 2, dist / st.pinch);
        }
        st.pinch = dist;
        e.preventDefault();
        return;
      }

      if (st.panning) {
        st.tx += e.clientX - prev.x;
        st.ty += e.clientY - prev.y;
        clamp();
        apply();
        e.preventDefault();
      }
    }, { passive: false });

    const endPointer = function (e) {
      st.pointers.delete(e.pointerId);
      if (st.pointers.size < 2) { st.pinch = 0; }
      if (st.pointers.size === 0) {
        st.panning = false;
        frame.classList.remove("is-panning");
      }
    };
    ["pointerup", "pointercancel", "pointerleave"].forEach(function (t) {
      frame.addEventListener(t, endPointer);
    });

    // Double-click / double-tap resets to fit.
    frame.addEventListener("dblclick", function (e) {
      e.preventDefault();
      reset();
    });

    return { reset: reset };
  }

  function ensureFloatingImagePreviewOverlay() {
    if (floatingImagePreviewOverlay && floatingImagePreviewImage) {
      return;
    }

    const overlay = document.createElement("div");
    overlay.className = "tour-overlay tour-overlay--center tour-overlay--interactive tour-floating-preview-overlay";
    overlay.hidden = true;
    overlay.id = "tourFloatingImagePreviewOverlay";

    const panel = document.createElement("section");
    panel.className = "tour-floating-image-preview";
    panel.setAttribute("role", "dialog");
    panel.setAttribute("aria-modal", "true");
    panel.setAttribute("aria-label", "Expanded hotspot image preview");

    // The photo lives inside a zoom frame so pinch/scroll/drag zooms the
    // picture, never the page underneath.
    const frame = document.createElement("div");
    frame.className = "tour-preview-zoomframe";

    const image = document.createElement("img");
    image.className = "tour-floating-image-preview__image";
    image.alt = "";
    frame.appendChild(image);

    // Title + centered close below the media (Heritage Trail viewer pattern).
    const title = document.createElement("p");
    title.className = "tour-floating-preview__title";
    title.hidden = true;

    const closeButton = document.createElement("button");
    closeButton.className = "tour-floating-image-preview__close";
    closeButton.type = "button";
    closeButton.setAttribute("aria-label", "Return hotspot image to floating view");
    closeButton.textContent = "×";

    panel.appendChild(frame);
    panel.appendChild(title);
    panel.appendChild(closeButton);
    overlay.appendChild(panel);
    app.appendChild(overlay);

    blockOverlayPageZoom(overlay);
    floatingImagePreviewZoom = createPreviewImageZoom(frame, image);

    closeButton.addEventListener("click", function () {
      hideFloatingImagePreviewOverlay();
    });

    overlay.addEventListener("click", function (event) {
      if (event.target === overlay) {
        hideFloatingImagePreviewOverlay();
      }
    });

    floatingImagePreviewOverlay = overlay;
    floatingImagePreviewImage = image;
    floatingImagePreviewTitle = title;
  }

  function showFloatingImagePreviewOverlay(args) {
    if (!args || !args.imageSrc) {
      return;
    }

    ensureFloatingImagePreviewOverlay();

    if (!floatingImagePreviewOverlay || !floatingImagePreviewImage) {
      return;
    }

    floatingImagePreviewImage.src = args.imageSrc;
    floatingImagePreviewImage.alt = args.imageAlt || "Hotspot image";
    setFloatingWindowTitle(floatingImagePreviewTitle, args);
    if (floatingImagePreviewZoom) { floatingImagePreviewZoom.reset(); } // start unzoomed
    floatingImagePreviewOverlay.hidden = false;
  }

  function hideFloatingImagePreviewOverlay() {
    if (floatingImagePreviewOverlay) {
      floatingImagePreviewOverlay.hidden = true;
    }

    if (floatingImagePreviewZoom) { floatingImagePreviewZoom.reset(); } // never carry zoom out

    if (floatingImagePreviewImage) {
      floatingImagePreviewImage.removeAttribute("src");
      floatingImagePreviewImage.alt = "";
    }
  }

  function ensureFloatingArtifactPreviewOverlay() {
    if (floatingArtifactPreviewOverlay && floatingArtifactPreviewImage && floatingArtifactPreviewModel && floatingArtifactPreviewModelNav && floatingArtifactPreviewModelPrev && floatingArtifactPreviewModelNext) {
      return;
    }

    const overlay = document.createElement("div");
    overlay.className = "tour-overlay tour-overlay--center tour-overlay--interactive tour-floating-preview-overlay";
    overlay.hidden = true;
    overlay.id = "tourFloatingArtifactPreviewOverlay";

    const panel = document.createElement("section");
    panel.className = "tour-floating-media-preview";
    panel.setAttribute("role", "dialog");
    panel.setAttribute("aria-modal", "true");
    panel.setAttribute("aria-label", "Expanded floating artifact preview");

    const title = document.createElement("p");
    title.className = "tour-floating-preview__title";
    title.hidden = true;

    const closeButton = document.createElement("button");
    closeButton.className = "tour-floating-media-preview__close";
    closeButton.type = "button";
    closeButton.setAttribute("aria-label", "Return floating artifact to tour view");
    closeButton.textContent = "×";

    // The photo lives inside a zoom frame (pinch/scroll/drag zooms the picture,
    // never the page). The 3D model keeps its own gesture handling.
    const imageFrame = document.createElement("div");
    imageFrame.className = "tour-preview-zoomframe";
    imageFrame.hidden = true;

    const image = document.createElement("img");
    image.className = "tour-floating-media-preview__image";
    image.alt = "";
    imageFrame.appendChild(image);

    const model = document.createElement("model-viewer");
    model.className = "tour-floating-media-preview__model";
    model.setAttribute("camera-controls", "");
    model.setAttribute("touch-action", "none");
    model.setAttribute("auto-rotate", "");
    model.setAttribute("shadow-intensity", "1");
    // Real-world AR: WebXR/Scene Viewer on Android, Quick Look on iPhone
    // (model-viewer converts the GLB to USDZ on the device).
    model.setAttribute("ar", "");
    model.setAttribute("ar-modes", "webxr scene-viewer quick-look");
    model.hidden = true;

    const modelNav = document.createElement("div");
    modelNav.className = "tour-floating-media-preview__model-nav";
    modelNav.hidden = true;

    const prevButton = document.createElement("button");
    prevButton.className = "tour-floating-media-preview__model-nav-button tour-floating-media-preview__model-nav-button--prev";
    prevButton.type = "button";
    prevButton.setAttribute("aria-label", "Show previous 3D model");
    prevButton.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M14.78 5.22a.75.75 0 0 1 0 1.06L9.06 12l5.72 5.72a.75.75 0 1 1-1.06 1.06l-6.25-6.25a.75.75 0 0 1 0-1.06l6.25-6.25a.75.75 0 0 1 1.06 0Z" fill="currentColor"></path></svg>';

    const nextButton = document.createElement("button");
    nextButton.className = "tour-floating-media-preview__model-nav-button tour-floating-media-preview__model-nav-button--next";
    nextButton.type = "button";
    nextButton.setAttribute("aria-label", "Show next 3D model");
    nextButton.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9.22 18.78a.75.75 0 0 1 0-1.06L14.94 12 9.22 6.28a.75.75 0 1 1 1.06-1.06l6.25 6.25a.75.75 0 0 1 0 1.06l-6.25 6.25a.75.75 0 0 1-1.06 0Z" fill="currentColor"></path></svg>';

    modelNav.appendChild(prevButton);
    modelNav.appendChild(nextButton);

    // Media (photo/model + its nav) on top, then the title, then a centered
    // close below — the Heritage Trail viewer layout.
    const mediaWrap = document.createElement("div");
    mediaWrap.className = "tour-floating-media-preview__mediawrap";
    mediaWrap.appendChild(imageFrame);
    mediaWrap.appendChild(model);
    mediaWrap.appendChild(modelNav);
    floatingArtifactPreviewArButton = installModelArControl(model, mediaWrap);
    if (floatingArtifactPreviewArButton) {
      floatingArtifactPreviewArButton.hidden = true;
    }

    panel.appendChild(mediaWrap);
    panel.appendChild(title);
    panel.appendChild(closeButton);
    overlay.appendChild(panel);
    app.appendChild(overlay);

    closeButton.addEventListener("click", function () {
      hideFloatingArtifactPreviewOverlay();
    });

    overlay.addEventListener("click", function (event) {
      if (event.target === overlay) {
        hideFloatingArtifactPreviewOverlay();
      }
    });

    prevButton.addEventListener("click", function (event) {
      event.preventDefault();
      event.stopPropagation();
      if (!floatingArtifactPreviewArgs) {
        return;
      }
      floatingArtifactPreviewArgs.currentGlbIndex = getArtifactGlbIndex(floatingArtifactPreviewArgs) - 1;
      showFloatingArtifactPreviewOverlay(floatingArtifactPreviewArgs, "glb");
    });

    nextButton.addEventListener("click", function (event) {
      event.preventDefault();
      event.stopPropagation();
      if (!floatingArtifactPreviewArgs) {
        return;
      }
      floatingArtifactPreviewArgs.currentGlbIndex = getArtifactGlbIndex(floatingArtifactPreviewArgs) + 1;
      showFloatingArtifactPreviewOverlay(floatingArtifactPreviewArgs, "glb");
    });

    blockOverlayPageZoom(overlay);
    floatingArtifactPreviewImageZoom = createPreviewImageZoom(imageFrame, image);

    floatingArtifactPreviewOverlay = overlay;
    floatingArtifactPreviewImage = image;
    floatingArtifactPreviewImageFrame = imageFrame;
    floatingArtifactPreviewModel = model;
    floatingArtifactPreviewModelNav = modelNav;
    floatingArtifactPreviewModelPrev = prevButton;
    floatingArtifactPreviewModelNext = nextButton;
    floatingArtifactPreviewTitle = title;
  }

  function showFloatingArtifactPreviewOverlay(args, view) {
    if (!args) {
      return;
    }

    ensureFloatingArtifactPreviewOverlay();

    if (!floatingArtifactPreviewOverlay || !floatingArtifactPreviewImage || !floatingArtifactPreviewModel) {
      return;
    }

    const glbSources = getArtifactGlbSources(args);
    const nextView = view === "glb" ? "glb" : "image";
    const showImage = nextView === "image" && Boolean(args.imageSrc);
    const showGlb = nextView === "glb" && glbSources.length > 0;

    floatingArtifactPreviewArgs = args;

    setFloatingWindowTitle(floatingArtifactPreviewTitle, args);
    floatingArtifactPreviewImage.hidden = !showImage;
    floatingArtifactPreviewModel.hidden = !showGlb;
    if (floatingArtifactPreviewArButton) {
      floatingArtifactPreviewArButton.hidden = !showGlb;
    }
    if (floatingArtifactPreviewImageFrame) {
      floatingArtifactPreviewImageFrame.hidden = !showImage;
      floatingArtifactPreviewImageFrame.style.display = showImage ? "block" : "none";
      floatingArtifactPreviewImageFrame.classList.toggle("tour-preview-zoomframe--outline", args.previewFrameStyle === "outline");
    }
    floatingArtifactPreviewImage.style.display = showImage ? "block" : "none";
    floatingArtifactPreviewModel.style.display = showGlb ? "block" : "none";
    floatingArtifactPreviewModel.style.pointerEvents = showGlb ? "auto" : "none";
    if (floatingArtifactPreviewImageZoom) { floatingArtifactPreviewImageZoom.reset(); } // fresh photo, no carried zoom

    if (showImage) {
      floatingArtifactPreviewImage.src = args.imageSrc;
      floatingArtifactPreviewImage.alt = args.imageAlt || "Artifact image";
    } else {
      floatingArtifactPreviewImage.removeAttribute("src");
      floatingArtifactPreviewImage.alt = "";
    }

    if (showGlb) {
      floatingArtifactPreviewModel.src = getArtifactCurrentGlbSrc(args);
      floatingArtifactPreviewModel.setAttribute("aria-label", getArtifactCurrentGlbAlt(args));
    } else {
      floatingArtifactPreviewModel.removeAttribute("src");
      floatingArtifactPreviewModel.removeAttribute("aria-label");
    }

    if (floatingArtifactPreviewModelNav && floatingArtifactPreviewModelPrev && floatingArtifactPreviewModelNext) {
      const showModelNav = showGlb && glbSources.length > 1;
      const currentGlbIndex = getArtifactGlbIndex(args);
      floatingArtifactPreviewModelNav.hidden = !showModelNav;
      floatingArtifactPreviewModelNav.style.display = showModelNav ? "flex" : "none";
      floatingArtifactPreviewModelPrev.disabled = !showModelNav || currentGlbIndex <= 0;
      floatingArtifactPreviewModelNext.disabled = !showModelNav || currentGlbIndex >= glbSources.length - 1;
    }

    floatingArtifactPreviewOverlay.hidden = false;
  }

  function hideFloatingArtifactPreviewOverlay() {
    if (floatingArtifactPreviewOverlay) {
      floatingArtifactPreviewOverlay.hidden = true;
    }

    if (floatingArtifactPreviewImageZoom) { floatingArtifactPreviewImageZoom.reset(); } // never carry zoom out

    if (floatingArtifactPreviewImageFrame) {
      floatingArtifactPreviewImageFrame.hidden = true;
      floatingArtifactPreviewImageFrame.style.display = "none";
    }

    if (floatingArtifactPreviewImage) {
      floatingArtifactPreviewImage.hidden = true;
      floatingArtifactPreviewImage.removeAttribute("src");
      floatingArtifactPreviewImage.alt = "";
      floatingArtifactPreviewImage.style.display = "none";
    }

    if (floatingArtifactPreviewModel) {
      floatingArtifactPreviewModel.hidden = true;
      floatingArtifactPreviewModel.removeAttribute("src");
      floatingArtifactPreviewModel.removeAttribute("aria-label");
      floatingArtifactPreviewModel.style.display = "none";
      floatingArtifactPreviewModel.style.pointerEvents = "none";
    }

    if (floatingArtifactPreviewModelNav && floatingArtifactPreviewModelPrev && floatingArtifactPreviewModelNext) {
      floatingArtifactPreviewModelNav.hidden = true;
      floatingArtifactPreviewModelNav.style.display = "none";
      floatingArtifactPreviewModelPrev.disabled = true;
      floatingArtifactPreviewModelNext.disabled = true;
    }

    floatingArtifactPreviewArgs = null;
  }

  function ensureFloatingImageAudio(audioSrc) {
    if (!audioSrc) {
      return null;
    }

    if (floatingImageAudio && floatingImageAudioSrc === audioSrc) {
      return floatingImageAudio;
    }

    stopFloatingImageAudio();

    const audio = new Audio(audioSrc);
    audio.preload = "auto";
    audio.muted = narrationMuted;
    audio.addEventListener("play", syncNarrationControls);
    audio.addEventListener("pause", syncNarrationControls);
    audio.addEventListener("ended", function () {
      floatingImageAudio = null;
      floatingImageAudioSrc = "";
      syncNarrationControls();
    });

    floatingImageAudio = audio;
    floatingImageAudioSrc = audioSrc;
    return audio;
  }

  function playFloatingImageAudio(audioSrc) {
    const audio = ensureFloatingImageAudio(audioSrc);
    if (!audio) {
      return;
    }

    if (!audio.paused && !audio.ended) {
      return;
    }

    const playPromise = audio.play();
    if (playPromise && typeof playPromise.catch === "function") {
      playPromise.catch(function (error) {
        console.warn("Unable to autoplay hotspot audio.", error);
      });
    }
  }

  function stopFloatingImageAudio() {
    if (!floatingImageAudio) {
      floatingImageAudioSrc = "";
      return;
    }

    floatingImageAudio.pause();
    floatingImageAudio.currentTime = 0;
    floatingImageAudio = null;
    floatingImageAudioSrc = "";
  }

  function getFloatingArtifactAudioSource(audioConfig, language) {
    if (!audioConfig) {
      return "";
    }

    if (language === "en" && audioConfig.en) {
      return audioConfig.en;
    }

    if (audioConfig.tl) {
      return audioConfig.tl;
    }

    return audioConfig.en || "";
  }

  function playFloatingArtifactAudio(audioConfig, language) {
    const nextAudioSrc = getFloatingArtifactAudioSource(audioConfig, language);
    if (!nextAudioSrc) {
      stopFloatingImageAudio();
      floatingArtifactAudioLanguage = language === "en" ? "en" : "tl";
      activeFloatingArtifactAudioConfig = audioConfig || null;
      updateHotspotVisibilityState();
      renderSubtitle();
      syncNarrationControls();
      return;
    }

    activeFloatingArtifactAudioConfig = audioConfig || null;
    floatingArtifactAudioLanguage = language === "en" ? "en" : "tl";

    if (floatingImageAudio && floatingImageAudioSrc === nextAudioSrc && !floatingImageAudio.paused && !floatingImageAudio.ended) {
      updateHotspotVisibilityState();
      renderSubtitle();
      syncNarrationControls();
      return;
    }

    stopFloatingImageAudio();
    updateHotspotVisibilityState();
    renderSubtitle();
    playFloatingImageAudio(nextAudioSrc);
    syncNarrationControls();
  }

  function clearFloatingArtifactAudioState() {
    stopFloatingImageAudio();
    activeFloatingArtifactAudioConfig = null;
    floatingArtifactAudioLanguage = "tl";
    setActiveSubtitle(null);
    updateHotspotVisibilityState();
    syncNarrationControls();
  }

  /* ---- Narration + subtitle controls (Listen / Mute / Translation / CC) ---- */
  function renderSubtitle() {
    if (!subtitleBar || !subtitleTextEl) {
      return;
    }
    const text = activeSubtitle
      ? (floatingArtifactAudioLanguage === "en" ? activeSubtitle.en : activeSubtitle.tl)
      : "";
    subtitleTextEl.textContent = text || "";
    const show = subtitlesOn && Boolean(text);
    subtitleBar.hidden = !show;
    if (show) {
      subtitleBar.scrollTop = 0;
    }
  }

  function setActiveSubtitle(subtitle) {
    activeSubtitle = subtitle || null;
    renderSubtitle();
  }

  function isNarrationPlaying() {
    return Boolean(floatingImageAudio && !floatingImageAudio.paused && !floatingImageAudio.ended);
  }

  function syncNarrationControls() {
    if (listenButton) {
      const playing = isNarrationPlaying();
      listenButton.classList.toggle("is-playing", playing);
      listenButton.setAttribute("aria-pressed", playing ? "true" : "false");
      listenButton.setAttribute("aria-label", playing ? "Pause narration" : "Play narration");
    }
    if (muteButton) {
      muteButton.classList.toggle("is-muted", narrationMuted);
      muteButton.setAttribute("aria-pressed", narrationMuted ? "true" : "false");
      muteButton.setAttribute("aria-label", narrationMuted ? "Unmute narration" : "Mute narration");
    }
  }

  function toggleNarration() {
    // Anything currently playing? Pause it — this is the primary Listen action.
    if (floatingImageAudio && !floatingImageAudio.paused) {
      floatingImageAudio.pause();
      syncNarrationControls();
      return;
    }
    // Buffered but paused → resume from where it stopped.
    if (floatingImageAudio && floatingImageAudioSrc) {
      const resume = floatingImageAudio.play();
      if (resume && typeof resume.catch === "function") {
        resume.catch(function () {});
      }
      syncNarrationControls();
      return;
    }
    // Nothing buffered — (re)start the open artifact's narration.
    if (activeFloatingArtifactAudioConfig) {
      playFloatingArtifactAudio(activeFloatingArtifactAudioConfig, floatingArtifactAudioLanguage);
    }
  }

  function toggleNarrationMute() {
    narrationMuted = !narrationMuted;
    if (floatingImageAudio) {
      floatingImageAudio.muted = narrationMuted;
    }
    syncNarrationControls();
  }

  function toggleSubtitlesVisibility() {
    subtitlesOn = !subtitlesOn;
    if (subtitlesButton) {
      subtitlesButton.classList.toggle("is-active", subtitlesOn);
      subtitlesButton.setAttribute("aria-pressed", subtitlesOn ? "true" : "false");
      subtitlesButton.setAttribute("aria-label", subtitlesOn ? "Hide subtitles" : "Show subtitles");
    }
    renderSubtitle();
  }

  function forceCloseAllFloatingOverlays() {
    const imageEntries = Array.from(floatingImageHotspots.entries());
    const artifactEntries = Array.from(floatingArtifactHotspots.entries());

    imageEntries.forEach(function ([imageHotspotKey, entry]) {
      if (tourViewer && entry) {
        try {
          tourViewer.removeHotSpot(entry.hotspotId, entry.sceneId);
        } catch (error) {
          console.warn("Unable to remove floating hotspot image.", error);
        }
      }
      floatingImageHotspots.delete(imageHotspotKey);
    });

    artifactEntries.forEach(function ([artifactHotspotKey, entry]) {
      if (tourViewer && entry) {
        try {
          tourViewer.removeHotSpot(entry.hotspotId, entry.sceneId);
        } catch (error) {
          console.warn("Unable to remove floating artifact.", error);
        }
      }
      floatingArtifactHotspots.delete(artifactHotspotKey);
    });

    hideFloatingImagePreviewOverlay();
    hideFloatingArtifactPreviewOverlay();
    stopFloatingImageAudio();
    clearFloatingArtifactAudioState();

    if (viewerContainer) {
      Array.from(viewerContainer.querySelectorAll(".tour-floating-image-window-hotspot, .tour-floating-media-window-hotspot")).forEach(function (hotspotNode) {
        hotspotNode.remove();
      });
    }
  }

  // The floating window's caption: the artifact/hotspot's name, shown above the
  // close button (mirrors the Heritage Trail's floating window). Generic image
  // alts aren't names, so they stay hidden.
  function setFloatingWindowTitle(el, args) {
    if (!el) {
      return;
    }
    const generic = ["Hotspot image", "Artifact image", "Front Gate hotspot image"];
    const name = (args && args.title) || (args && args.imageAlt && !generic.includes(args.imageAlt) ? args.imageAlt : "");
    if (name) {
      el.textContent = name;
      el.hidden = false;
    } else {
      el.hidden = true;
    }
  }

  function renderFloatingImageHotspot(hotSpotDiv, args) {
    hotSpotDiv.classList.add("tour-floating-image-window-hotspot");

    const panel = document.createElement("div");
    panel.className = "tour-floating-image-window-shell";

    const mediaWrap = document.createElement("div");
    mediaWrap.className = "tour-floating-image-window-mediawrap";

    const imageButton = document.createElement("button");
    imageButton.className = "tour-floating-image-window-trigger";
    imageButton.type = "button";
    imageButton.setAttribute("aria-label", "Open hotspot image preview");

    const image = document.createElement("img");
    image.className = "tour-floating-image-window";
    image.src = args.imageSrc;
    image.alt = args.imageAlt || "Hotspot image";
    image.draggable = false;

    // Title above the close button (Heritage Trail floating-window pattern).
    const title = document.createElement("p");
    title.className = "tour-floating-image-window-title";
    setFloatingWindowTitle(title, args);

    // Close: centered under the title, in the flow so it never covers the image.
    const closeButton = document.createElement("button");
    closeButton.className = "tour-floating-image-window-close";
    closeButton.type = "button";
    closeButton.setAttribute("aria-label", "Close floating hotspot image");
    closeButton.textContent = "×";

    closeButton.addEventListener("click", function (event) {
      event.preventDefault();
      event.stopPropagation();
      closeFloatingImageOverlay(args.windowHotspotId, args.windowSceneId);
    });

    imageButton.addEventListener("click", function (event) {
      event.preventDefault();
      event.stopPropagation();
      showFloatingImagePreviewOverlay(args);
    });

    imageButton.appendChild(image);
    mediaWrap.appendChild(imageButton);
    panel.appendChild(mediaWrap);
    panel.appendChild(title);
    panel.appendChild(closeButton);
    hotSpotDiv.appendChild(panel);
  }

  function renderFloatingArtifactHotspot(hotSpotDiv, args) {
    hotSpotDiv.classList.add("tour-floating-image-window-hotspot", "tour-floating-media-window-hotspot");

    const panel = document.createElement("div");
    panel.className = "tour-floating-image-window-shell";

    const closeButton = document.createElement("button");
    closeButton.className = "tour-floating-image-window-close";
    closeButton.type = "button";
    closeButton.setAttribute("aria-label", "Close floating artifact");
    closeButton.textContent = "×";

    const switchButton = document.createElement("button");
    switchButton.className = "tour-floating-media-window-switch";
    switchButton.type = "button";

    const switchIcon = document.createElement("span");
    switchIcon.className = "tour-floating-media-window-switch-icon";
    switchIcon.setAttribute("aria-hidden", "true");

    const switchLabel = document.createElement("span");
    switchLabel.className = "tour-sr-only";

    const imageButton = document.createElement("button");
    imageButton.className = "tour-floating-image-window-trigger";
    imageButton.type = "button";

    const showAlternateAudioButton = args.sourceHotspotId === "museum3-pahimakas-marker" && Boolean(args.alternateAudioSrc);
    let alternateAudioButton = null;
    if (showAlternateAudioButton) {
      alternateAudioButton = document.createElement("button");
      alternateAudioButton.className = "tour-floating-media-window-audio-button";
      alternateAudioButton.type = "button";
      alternateAudioButton.setAttribute("aria-label", "Play Pahimakas march audio");
      alternateAudioButton.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15.5 3.75a.75.75 0 0 1 .75.75v10.84a3.5 3.5 0 1 1-1.5-2.88V8.91l-5.96 1.48a.75.75 0 0 1-.93-.73V5.93c0-.34.23-.64.56-.73l6.9-1.72a.76.76 0 0 1 .18-.03ZM8.75 6.52v2.18l6-1.49V5.02l-6 1.5Zm4.25 10.23a2 2 0 1 0-4 0 2 2 0 0 0 4 0Z" fill="currentColor"></path></svg>';
    }

    const image = document.createElement("img");
    image.className = "tour-floating-image-window";
    image.src = args.imageSrc;
    image.alt = args.imageAlt || "Artifact image";
    image.draggable = false;

    const model = document.createElement("model-viewer");
    model.className = "tour-floating-media-window-model";
    model.setAttribute("camera-controls", "");
    model.setAttribute("touch-action", "pan-y");
    model.setAttribute("auto-rotate", "");
    model.setAttribute("shadow-intensity", "1");
    model.setAttribute("ar", "");
    model.setAttribute("ar-modes", "webxr scene-viewer quick-look");
    let arButton = null;
    const glbSources = getArtifactGlbSources(args);
    if (!Number.isInteger(args.currentGlbIndex)) {
      args.currentGlbIndex = 0;
    }

    const modelNav = document.createElement("div");
    modelNav.className = "tour-floating-media-window-model-nav";
    modelNav.hidden = true;

    const prevButton = document.createElement("button");
    prevButton.className = "tour-floating-media-window-model-nav-button tour-floating-media-window-model-nav-button--prev";
    prevButton.type = "button";
    prevButton.setAttribute("aria-label", "Show previous 3D model");
    prevButton.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M14.78 5.22a.75.75 0 0 1 0 1.06L9.06 12l5.72 5.72a.75.75 0 1 1-1.06 1.06l-6.25-6.25a.75.75 0 0 1 0-1.06l6.25-6.25a.75.75 0 0 1 1.06 0Z" fill="currentColor"></path></svg>';

    const nextButton = document.createElement("button");
    nextButton.className = "tour-floating-media-window-model-nav-button tour-floating-media-window-model-nav-button--next";
    nextButton.type = "button";
    nextButton.setAttribute("aria-label", "Show next 3D model");
    nextButton.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9.22 18.78a.75.75 0 0 1 0-1.06L14.94 12 9.22 6.28a.75.75 0 1 1 1.06-1.06l6.25 6.25a.75.75 0 0 1 0 1.06l-6.25 6.25a.75.75 0 0 1-1.06 0Z" fill="currentColor"></path></svg>';

    let currentView = args.glbSrc ? "image" : "image";
    let modelPointerDown = null;
    let modelWasDragged = false;

    function syncModelSource() {
      const hasCurrentGlb = Boolean(getArtifactCurrentGlbSrc(args));
      if (hasCurrentGlb) {
        model.src = getArtifactCurrentGlbSrc(args);
        model.setAttribute("aria-label", getArtifactCurrentGlbAlt(args));
      } else {
        model.removeAttribute("src");
        model.removeAttribute("aria-label");
      }
    }

    function syncView(nextView) {
      currentView = nextView === "glb" && glbSources.length ? "glb" : "image";
      const isImageView = currentView === "image";
      const showModelNav = !isImageView && glbSources.length > 1;
      const currentGlbIndex = getArtifactGlbIndex(args);

      if (alternateAudioButton) {
        alternateAudioButton.hidden = !isImageView;
      }
      imageButton.hidden = !isImageView;
      imageButton.style.display = isImageView ? "block" : "none";
      image.hidden = !isImageView;
      image.style.display = isImageView ? "block" : "none";
      model.hidden = isImageView;
      model.style.display = isImageView ? "none" : "block";
      if (arButton) {
        arButton.hidden = isImageView;
      }
      modelNav.hidden = !showModelNav;
      modelNav.style.display = showModelNav ? "flex" : "none";
      prevButton.disabled = !showModelNav || currentGlbIndex <= 0;
      nextButton.disabled = !showModelNav || currentGlbIndex >= glbSources.length - 1;
      switchIcon.innerHTML = isImageView
        ? '<svg viewBox="0 0 24 24"><path d="M12 2.5 19.5 6v12L12 21.5 4.5 18V6L12 2.5Zm0 1.12L5.73 6.5 12 9.38l6.27-2.88L12 3.62Zm6.5 3.69-6 2.76v10.28l6-3V7.31Zm-13 0v7.74l6 3V10.07l-6-2.76Z" fill="currentColor"></path></svg>'
        : '<svg viewBox="0 0 24 24"><path d="M5 6.5A1.5 1.5 0 0 1 6.5 5h11A1.5 1.5 0 0 1 19 6.5v11a1.5 1.5 0 0 1-1.5 1.5h-11A1.5 1.5 0 0 1 5 17.5v-11Zm1.5-.5a.5.5 0 0 0-.5.5v8.2l3.1-3.45a1 1 0 0 1 1.48-.03l1.9 2.02 2.45-2.78a1 1 0 0 1 1.5.02L18 12.4V6.5a.5.5 0 0 0-.5-.5h-11Zm11.5 10.83-2.3-3.1-2.38 2.7a1 1 0 0 1-1.47.06l-1.95-2.08L6 18h11.5a.5.5 0 0 0 .5-.5v-.67ZM9 8.75a1.75 1.75 0 1 1 3.5 0 1.75 1.75 0 0 1-3.5 0Z" fill="currentColor"></path></svg>';
      switchButton.setAttribute("aria-label", isImageView ? "Switch floating artifact to 3D model" : "Switch floating artifact to image");
      switchLabel.textContent = isImageView ? "Switch to 3D model" : "Switch to image";
      switchButton.hidden = !glbSources.length;
      syncModelSource();
    }

    closeButton.addEventListener("click", function (event) {
      event.preventDefault();
      event.stopPropagation();
      closeFloatingArtifactOverlay(args.windowHotspotId, args.windowSceneId);
    });

    switchButton.addEventListener("click", function (event) {
      event.preventDefault();
      event.stopPropagation();
      syncView(currentView === "image" ? "glb" : "image");
    });

    if (alternateAudioButton) {
      alternateAudioButton.addEventListener("click", function (event) {
        event.preventDefault();
        event.stopPropagation();
        stopFloatingImageAudio();
        playFloatingImageAudio(args.alternateAudioSrc);
      });
    }

    prevButton.addEventListener("click", function (event) {
      event.preventDefault();
      event.stopPropagation();
      args.currentGlbIndex = getArtifactGlbIndex(args) - 1;
      syncView("glb");
    });

    nextButton.addEventListener("click", function (event) {
      event.preventDefault();
      event.stopPropagation();
      args.currentGlbIndex = getArtifactGlbIndex(args) + 1;
      syncView("glb");
    });

    imageButton.addEventListener("click", function (event) {
      event.preventDefault();
      event.stopPropagation();
      showFloatingArtifactPreviewOverlay(args, "image");
    });

    model.addEventListener("pointerdown", function (event) {
      modelPointerDown = {
        x: event.clientX,
        y: event.clientY,
      };
      modelWasDragged = false;
    });

    model.addEventListener("pointermove", function (event) {
      if (!modelPointerDown) {
        return;
      }

      const deltaX = event.clientX - modelPointerDown.x;
      const deltaY = event.clientY - modelPointerDown.y;
      if (Math.hypot(deltaX, deltaY) > 6) {
        modelWasDragged = true;
      }
    });

    model.addEventListener("pointerup", function () {
      window.setTimeout(function () {
        modelPointerDown = null;
      }, 0);
    });

    model.addEventListener("pointercancel", function () {
      modelPointerDown = null;
      modelWasDragged = false;
    });

    model.addEventListener("click", function (event) {
      if (modelWasDragged) {
        modelWasDragged = false;
        return;
      }

      event.preventDefault();
      event.stopPropagation();
      showFloatingArtifactPreviewOverlay(args, "glb");
    });

    imageButton.appendChild(image);
    switchButton.appendChild(switchIcon);
    switchButton.appendChild(switchLabel);
    modelNav.appendChild(prevButton);
    modelNav.appendChild(nextButton);

    // Media (photo ↔ 3D) with its overlaid switch/audio/nav buttons, then the
    // title, then a centered close button below — matching the Heritage Trail.
    const mediaWrap = document.createElement("div");
    mediaWrap.className = "tour-floating-image-window-mediawrap";
    mediaWrap.appendChild(imageButton);
    mediaWrap.appendChild(model);
    arButton = installModelArControl(model, mediaWrap);
    if (arButton) {
      arButton.hidden = true;
    }
    mediaWrap.appendChild(switchButton);
    if (alternateAudioButton) {
      mediaWrap.appendChild(alternateAudioButton);
    }
    mediaWrap.appendChild(modelNav);

    const title = document.createElement("p");
    title.className = "tour-floating-image-window-title";
    setFloatingWindowTitle(title, args);

    panel.appendChild(mediaWrap);
    panel.appendChild(title);
    panel.appendChild(closeButton);
    hotSpotDiv.appendChild(panel);
    syncView(args.initialView || "image");
  }

  function openFloatingImageOverlay(event, args) {
    if (event && typeof event.preventDefault === "function") {
      event.preventDefault();
    }

    if (!args || !args.imageSrc || !tourViewer || typeof tourViewer.getScene !== "function") {
      return;
    }

    const sceneId = tourViewer.getScene();
    const nextHotspotId = args.windowHotspotId || `${args.sourceHotspotId || "floating-image"}-window`;
    const imageHotspotKey = `${sceneId}::${nextHotspotId}`;
    const isSameFloatingWindowOpen = floatingImageHotspots.has(imageHotspotKey);

    if (isSameFloatingWindowOpen) {
      forceCloseAllFloatingOverlays();
      return;
    }

    forceCloseAllFloatingOverlays();

    const floatingWindowHotspot = {
      id: nextHotspotId,
      pitch: Number.isFinite(Number(args.windowPitch)) ? Number(args.windowPitch) : 8,
      yaw: Number.isFinite(Number(args.windowYaw)) ? Number(args.windowYaw) : 30,
      type: "info",
      text: "",
      cssClass: "tour-floating-image-window-hotspot",
      createTooltipFunc: renderFloatingImageHotspot,
      createTooltipArgs: {
        imageSrc: args.imageSrc,
        imageAlt: args.imageAlt || "Hotspot image",
        windowHotspotId: nextHotspotId,
        windowSceneId: sceneId,
      },
    };

    try {
      tourViewer.addHotSpot(floatingWindowHotspot, sceneId);
      floatingImageHotspots.set(imageHotspotKey, {
        hotspotId: nextHotspotId,
        sceneId,
        audioSrc: args.audioSrc || "",
      });
      playFloatingImageAudio(args.audioSrc);
    } catch (error) {
      console.error("Unable to open floating hotspot image.", error);
    }
  }

  function openFloatingArtifactOverlay(event, args) {
    if (event && typeof event.preventDefault === "function") {
      event.preventDefault();
    }

    if (!args || !args.imageSrc || !tourViewer || typeof tourViewer.getScene !== "function") {
      return;
    }

    const sceneId = tourViewer.getScene();
    const nextHotspotId = args.windowHotspotId || `${args.sourceHotspotId || "floating-artifact"}-window`;
    const artifactHotspotKey = `${sceneId}::${nextHotspotId}`;
    const isSameFloatingWindowOpen = floatingArtifactHotspots.has(artifactHotspotKey);
    const artifactAudioByLanguage = args.audioByLanguage && typeof args.audioByLanguage === "object" ? { ...args.audioByLanguage } : null;
    const artifactAlternateAudioSrc = args.alternateAudioSrc || "";

    if (isSameFloatingWindowOpen) {
      forceCloseAllFloatingOverlays();
      return;
    }

    forceCloseAllFloatingOverlays();

    setActiveSubtitle(subtitleForArtifact(args.imageAlt));

    if (artifactAudioByLanguage && (artifactAudioByLanguage.tl || artifactAudioByLanguage.en)) {
      playFloatingArtifactAudio(artifactAudioByLanguage, "tl");
    } else {
      clearFloatingArtifactAudioState();
    }

    const floatingWindowHotspot = {
      id: nextHotspotId,
      pitch: Number.isFinite(Number(args.windowPitch)) ? Number(args.windowPitch) : 8,
      yaw: Number.isFinite(Number(args.windowYaw)) ? Number(args.windowYaw) : 30,
      type: "info",
      text: "",
      cssClass: "tour-floating-image-window-hotspot tour-floating-media-window-hotspot",
      createTooltipFunc: renderFloatingArtifactHotspot,
      createTooltipArgs: {
        sourceHotspotId: args.sourceHotspotId || "",
        imageSrc: args.imageSrc,
        imageAlt: args.imageAlt || "Artifact image",
        glbSrc: args.glbSrc || "",
        glbSources: Array.isArray(args.glbSources) ? args.glbSources.filter(Boolean) : [],
        audioByLanguage: artifactAudioByLanguage,
        alternateAudioSrc: artifactAlternateAudioSrc,
        previewFrameStyle: args.previewFrameStyle || "",
        glbAlt: args.glbAlt || args.imageAlt || "Artifact 3D model",
        initialView: args.initialView || "image",
        currentGlbIndex: Number.isInteger(args.currentGlbIndex) ? args.currentGlbIndex : 0,
        windowHotspotId: nextHotspotId,
        windowSceneId: sceneId,
      },
    };

    try {
      tourViewer.addHotSpot(floatingWindowHotspot, sceneId);
      floatingArtifactHotspots.set(artifactHotspotKey, {
        hotspotId: nextHotspotId,
        sceneId,
        audioByLanguage: artifactAudioByLanguage,
        alternateAudioSrc: artifactAlternateAudioSrc,
      });
    } catch (error) {
      clearFloatingArtifactAudioState();
      console.error("Unable to open floating artifact.", error);
    }
  }

  function closeFloatingImageOverlay(hotspotId, sceneId) {
    const hasSpecificHotspot = Boolean(hotspotId && sceneId);

    if (!hasSpecificHotspot) {
      Array.from(floatingImageHotspots.values()).forEach(function (entry) {
        closeFloatingImageOverlay(entry.hotspotId, entry.sceneId);
      });
      return;
    }

    const imageHotspotKey = `${sceneId}::${hotspotId}`;
    const hotspotEntry = floatingImageHotspots.get(imageHotspotKey);

    if (tourViewer && hotspotEntry) {
      try {
        tourViewer.removeHotSpot(hotspotEntry.hotspotId, hotspotEntry.sceneId);
      } catch (error) {
        console.warn("Unable to remove floating hotspot image.", error);
      }
    }

    hideFloatingImagePreviewOverlay();

    if (hotspotEntry && hotspotEntry.audioSrc && floatingImageAudioSrc === hotspotEntry.audioSrc) {
      stopFloatingImageAudio();
    }

    floatingImageHotspots.delete(imageHotspotKey);
  }

  function closeFloatingArtifactOverlay(hotspotId, sceneId) {
    const hasSpecificHotspot = Boolean(hotspotId && sceneId);

    if (!hasSpecificHotspot) {
      Array.from(floatingArtifactHotspots.values()).forEach(function (entry) {
        closeFloatingArtifactOverlay(entry.hotspotId, entry.sceneId);
      });
      return;
    }

    const artifactHotspotKey = `${sceneId}::${hotspotId}`;
    const hotspotEntry = floatingArtifactHotspots.get(artifactHotspotKey);

    if (tourViewer && hotspotEntry) {
      try {
        tourViewer.removeHotSpot(hotspotEntry.hotspotId, hotspotEntry.sceneId);
      } catch (error) {
        console.warn("Unable to remove floating artifact.", error);
      }
    }

    hideFloatingArtifactPreviewOverlay();
    if (hotspotEntry && hotspotEntry.audioByLanguage) {
      clearFloatingArtifactAudioState();
    }
    floatingArtifactHotspots.delete(artifactHotspotKey);
  }

  function downloadImageDataUrl(dataUrl) {
    if (isIOSChrome || isIOSDevice) {
      showCapturePreview(dataUrl);
      return;
    }

    const link = document.createElement("a");
    const timestamp = new Date().toISOString().replace(/[.:]/g, "-");
    link.href = dataUrl;
    link.download = `virtual-tour-${timestamp}.png`;
    document.body.appendChild(link);
    link.click();
    link.remove();
  }

  function wrapHorizontalIndex(value, size) {
    const remainder = value % size;
    return remainder < 0 ? remainder + size : remainder;
  }

  function getExportDimensions() {
    const viewerRect = viewerContainer ? viewerContainer.getBoundingClientRect() : null;
    const baseWidth = Math.max(1, Math.round(viewerRect && viewerRect.width ? viewerRect.width : window.innerWidth || 1280));
    const baseHeight = Math.max(1, Math.round(viewerRect && viewerRect.height ? viewerRect.height : window.innerHeight || 720));
    const deviceScale = Math.max(1, Math.min(window.devicePixelRatio || 1, 2));
    let width = Math.max(1, Math.round(baseWidth * deviceScale));
    let height = Math.max(1, Math.round(baseHeight * deviceScale));
    const maxEdge = 1600;
    const longestEdge = Math.max(width, height);

    if (longestEdge > maxEdge) {
      const scale = maxEdge / longestEdge;
      width = Math.max(1, Math.round(width * scale));
      height = Math.max(1, Math.round(height * scale));
    }

    return { width, height };
  }

  async function renderExportImageFromCurrentView() {
    if (!tourViewer || typeof tourViewer.getScene !== "function" || !resolvedScenes) {
      throw new Error("Virtual tour viewer is not ready for export.");
    }

    const sceneId = tourViewer.getScene();
    const scene = sceneId && resolvedScenes[sceneId] ? resolvedScenes[sceneId] : null;
    const currentConfig = typeof tourViewer.getConfig === "function" ? tourViewer.getConfig() || {} : {};

    if (!scene || !scene.panorama) {
      throw new Error("Current panorama source is unavailable for export.");
    }

    const panoramaImage = await loadImage(scene.panorama);
    const sourceWidth = panoramaImage.naturalWidth || panoramaImage.width;
    const sourceHeight = panoramaImage.naturalHeight || panoramaImage.height;
    const sourceCanvas = document.createElement("canvas");
    sourceCanvas.width = sourceWidth;
    sourceCanvas.height = sourceHeight;

    const sourceContext = sourceCanvas.getContext("2d", { willReadFrequently: true });
    if (!sourceContext) {
      throw new Error("Unable to create source panorama context.");
    }

    sourceContext.drawImage(panoramaImage, 0, 0, sourceWidth, sourceHeight);
    const sourcePixels = sourceContext.getImageData(0, 0, sourceWidth, sourceHeight).data;

    const exportSize = getExportDimensions();
    const exportWidth = exportSize.width;
    const exportHeight = exportSize.height;
    const exportCanvas = document.createElement("canvas");
    exportCanvas.width = exportWidth;
    exportCanvas.height = exportHeight;

    const exportContext = exportCanvas.getContext("2d");
    if (!exportContext) {
      throw new Error("Unable to create export canvas context.");
    }

    const exportImage = exportContext.createImageData(exportWidth, exportHeight);
    const exportPixels = exportImage.data;
    const pitch = degreesToRadians(typeof tourViewer.getPitch === "function" ? tourViewer.getPitch() : 0);
    const yaw = degreesToRadians(typeof tourViewer.getYaw === "function" ? tourViewer.getYaw() : 0);
    const hfov = degreesToRadians(typeof tourViewer.getHfov === "function" ? tourViewer.getHfov() : 100);
    const aspect = exportWidth / exportHeight;
    const vfov = 2 * Math.atan(Math.tan(hfov / 2) / aspect);
    const tanHalfHfov = Math.tan(hfov / 2);
    const tanHalfVfov = Math.tan(vfov / 2);
    const sinPitch = Math.sin(pitch);
    const cosPitch = Math.cos(pitch);
    const sinYaw = Math.sin(yaw);
    const cosYaw = Math.cos(yaw);

    for (let y = 0; y < exportHeight; y += 1) {
      const normalizedY = 1 - (2 * (y + 0.5)) / exportHeight;

      for (let x = 0; x < exportWidth; x += 1) {
        const normalizedX = (2 * (x + 0.5)) / exportWidth - 1;
        let dirX = normalizedX * tanHalfHfov;
        let dirY = normalizedY * tanHalfVfov;
        let dirZ = 1;
        const invLength = 1 / Math.hypot(dirX, dirY, dirZ);
        dirX *= invLength;
        dirY *= invLength;
        dirZ *= invLength;

        const pitchedY = dirY * cosPitch + dirZ * sinPitch;
        const pitchedZ = -dirY * sinPitch + dirZ * cosPitch;
        const worldX = dirX * cosYaw + pitchedZ * sinYaw;
        const worldY = pitchedY;
        const worldZ = -dirX * sinYaw + pitchedZ * cosYaw;

        const longitude = Math.atan2(worldX, worldZ);
        const latitude = Math.asin(Math.max(-1, Math.min(1, worldY)));
        const panoramaX = wrapHorizontalIndex((longitude / (2 * Math.PI) + 0.5) * sourceWidth, sourceWidth);
        const panoramaY = Math.min(sourceHeight - 1, Math.max(0, (0.5 - latitude / Math.PI) * sourceHeight));

        const x0 = Math.floor(panoramaX);
        const y0 = Math.floor(panoramaY);
        const x1 = wrapHorizontalIndex(x0 + 1, sourceWidth);
        const y1 = Math.min(sourceHeight - 1, y0 + 1);
        const weightX = panoramaX - x0;
        const weightY = panoramaY - y0;
        const index00 = (y0 * sourceWidth + x0) * 4;
        const index10 = (y0 * sourceWidth + x1) * 4;
        const index01 = (y1 * sourceWidth + x0) * 4;
        const index11 = (y1 * sourceWidth + x1) * 4;
        const outputIndex = (y * exportWidth + x) * 4;

        for (let channel = 0; channel < 4; channel += 1) {
          const top = sourcePixels[index00 + channel] * (1 - weightX) + sourcePixels[index10 + channel] * weightX;
          const bottom = sourcePixels[index01 + channel] * (1 - weightX) + sourcePixels[index11 + channel] * weightX;
          exportPixels[outputIndex + channel] = top * (1 - weightY) + bottom * weightY;
        }
      }
    }

    exportContext.putImageData(exportImage, 0, 0);
    return exportCanvas.toDataURL("image/png");
  }

  async function captureCurrentView() {
    try {
      const imageDataUrl = await renderExportImageFromCurrentView();
      downloadImageDataUrl(imageDataUrl);
    } catch (error) {
      console.error("Unable to export virtual tour view.", error);
      window.alert("Unable to capture the current 360 view yet. Please wait for the scene to finish loading, then try again.");
    }
  }

  async function toggleFullscreenMode() {
    if (!canUseFullscreen) {
      if (isIOSDevice) {
        showFullscreenUnsupportedMessage();
      }
      return;
    }

    if (!document.fullscreenElement) {
      try {
        await fullscreenTarget.requestFullscreen();
      } catch (error) {
        console.error("Unable to enter fullscreen mode.", error);
      }
      return;
    }

    try {
      await document.exitFullscreen();
    } catch (error) {
      console.error("Unable to exit fullscreen mode.", error);
    }
  }

  function setArtifactView(nextView) {
    artifactNavButtons.forEach(function (button) {
      const isActive = button.dataset.artifactView === nextView;
      button.classList.toggle("is-active", isActive);
      button.setAttribute("aria-pressed", isActive ? "true" : "false");
    });

    artifactPanes.forEach(function (pane) {
      const isActive = pane.dataset.artifactPane === nextView;
      pane.hidden = !isActive;
      pane.classList.toggle("is-active", isActive);
    });
  }

  function openArtifactOverlay(event, args) {
    if (event && typeof event.preventDefault === "function") {
      event.preventDefault();
    }

    if (artifactImage && args && args.imageSrc) {
      artifactImage.src = args.imageSrc;
      artifactImage.alt = args.imageAlt || "Artifact image";
    }

    if (artifactModel && args && args.glbSrc) {
      artifactModel.src = args.glbSrc;
    }

    if (artifactTagalogTitle && args && args.tagalogTitle) {
      artifactTagalogTitle.textContent = args.tagalogTitle;
    }

    if (artifactTagalogText && args && args.tagalogText) {
      artifactTagalogText.textContent = args.tagalogText;
    }

    if (artifactEnglishTitle && args && args.englishTitle) {
      artifactEnglishTitle.textContent = args.englishTitle;
    }

    if (artifactEnglishText && args && args.englishText) {
      artifactEnglishText.textContent = args.englishText;
    }

    setArtifactView(args && args.view ? args.view : "image");

    if (artifactOverlay) {
      artifactOverlay.hidden = false;
    }
  }

  function closeArtifactOverlay() {
    if (artifactOverlay) {
      artifactOverlay.hidden = true;
    }

    if (artifactImage) {
      artifactImage.removeAttribute("src");
    }

    if (artifactModel) {
      artifactModel.removeAttribute("src");
    }

    setArtifactView("image");
  }

  artifactNavButtons.forEach(function (button) {
    button.addEventListener("click", function () {
      setArtifactView(button.dataset.artifactView || "image");
    });
  });

  if (artifactCloseButton) {
    artifactCloseButton.addEventListener("click", closeArtifactOverlay);
  }

  if (artifactOverlay) {
    artifactOverlay.addEventListener("click", function (event) {
      if (event.target === artifactOverlay) {
        closeArtifactOverlay();
      }
    });
  }

  document.addEventListener("keydown", function (event) {
    if (event.key === "Escape" && artifactOverlay && !artifactOverlay.hidden) {
      closeArtifactOverlay();
    }

    if (event.key === "Escape" && floatingArtifactPreviewOverlay && !floatingArtifactPreviewOverlay.hidden) {
      hideFloatingArtifactPreviewOverlay();
      return;
    }

    if (event.key === "Escape" && floatingArtifactHotspots.size) {
      closeFloatingArtifactOverlay();
      return;
    }

    if (event.key === "Escape" && floatingImagePreviewOverlay && !floatingImagePreviewOverlay.hidden) {
      hideFloatingImagePreviewOverlay();
      return;
    }

    if (event.key === "Escape" && floatingImageHotspots.size) {
      closeFloatingImageOverlay();
      return;
    }

    if (event.key === "Escape" && capturePreviewOverlay && !capturePreviewOverlay.hidden) {
      capturePreviewOverlay.hidden = true;
      if (capturePreviewImage) {
        capturePreviewImage.removeAttribute("src");
      }
    }
  });

  if (listenButton) {
    listenButton.addEventListener("click", function () {
      toggleNarration();
    });
  }

  if (muteButton) {
    muteButton.addEventListener("click", function () {
      toggleNarrationMute();
    });
  }

  if (subtitlesButton) {
    subtitlesButton.addEventListener("click", function () {
      toggleSubtitlesVisibility();
    });
  }

  if (toggleSceneHotspotsButton) {
    toggleSceneHotspotsButton.addEventListener("click", function () {
      hotspotsVisible = !hotspotsVisible;
      updateHotspotVisibilityState();
    });
  }

  if (toggleArtifactHotspotsButton) {
    toggleArtifactHotspotsButton.addEventListener("click", function () {
      if (!activeFloatingArtifactAudioConfig) {
        return;
      }

      const nextLanguage = floatingArtifactAudioLanguage === "tl" ? "en" : "tl";
      playFloatingArtifactAudio(activeFloatingArtifactAudioConfig, nextLanguage);
    });
  }

  if (captureViewButton) {
    captureViewButton.addEventListener("click", function () {
      captureCurrentView();
    });
  }

  if (toggleFullscreenButton) {
    toggleFullscreenButton.addEventListener("click", function () {
      toggleFullscreenMode();
    });
  }

  if (backToExhibitsButton) {
    backToExhibitsButton.addEventListener("click", function () {
      if (digitalExhibitsUrl) {
        window.location.href = digitalExhibitsUrl;
      }
    });
  }

  document.addEventListener("fullscreenchange", syncFullscreenButton);
  setControlDockVisibility(false);
  updateHotspotVisibilityState();
  syncFullscreenButton();
  if (subtitlesButton) {
    subtitlesButton.classList.toggle("is-active", subtitlesOn);
    subtitlesButton.setAttribute("aria-pressed", subtitlesOn ? "true" : "false");
  }
  syncNarrationControls();
  renderSubtitle();
  initMinimap();

  function createViewerWithCaptureSupport(scenes) {
    const originalGetContext = HTMLCanvasElement.prototype.getContext;
    let webglContextPatched = false;

    HTMLCanvasElement.prototype.getContext = function (type, attributes) {
      if (!webglContextPatched && (type === "webgl" || type === "experimental-webgl" || type === "webgl2")) {
        webglContextPatched = true;
        const nextAttributes = { ...(attributes || {}), preserveDrawingBuffer: true };
        return originalGetContext.call(this, type, nextAttributes);
      }

      return originalGetContext.call(this, type, attributes);
    };

    try {
      return window.pannellum.viewer("tourViewer", {
        default: {
          firstScene: initialScene,
          sceneFadeDuration: 1000,
        },
        scenes,
        autoLoad: true,
        hotSpotDebug: hotspotDebugEnabled,
        showControls: true,
        compass: false,
        autoRotate: 0,
        hfov: 100,
        minHfov: 50,
        maxHfov: 140,
        mouseZoom: true,
        draggable: true,
        disableKeyboardCtrl: false,
        showZoomCtrl: true,
        showFullscreenCtrl: true,
        loadingText: "Loading 360 view...",
      });
    } finally {
      HTMLCanvasElement.prototype.getContext = originalGetContext;
    }
  }

  function getSafeTextureLimit() {
    try {
      const canvas = document.createElement("canvas");
      const gl = canvas.getContext("webgl") || canvas.getContext("experimental-webgl");
      const maxTextureSize = gl ? gl.getParameter(gl.MAX_TEXTURE_SIZE) : 4096;
      return Math.max(2048, Math.min(maxTextureSize || 4096, 8192));
    } catch (error) {
      return 4096;
    }
  }

  function loadImage(src) {
    return new Promise((resolve, reject) => {
      const image = new Image();
      image.decoding = "async";
      image.onload = function () {
        resolve(image);
      };
      image.onerror = function () {
        reject(new Error(`Unable to load panorama source: ${src}`));
      };
      image.src = src;
    });
  }

  async function buildSafePanoramaSource(src, maxTextureSize) {
    const image = await loadImage(src);
    const longestSide = Math.max(image.naturalWidth || image.width, image.naturalHeight || image.height);

    if (longestSide <= maxTextureSize) {
      return src;
    }

    const scale = maxTextureSize / longestSide;
    const targetWidth = Math.max(1, Math.round((image.naturalWidth || image.width) * scale));
    const targetHeight = Math.max(1, Math.round((image.naturalHeight || image.height) * scale));
    const canvas = document.createElement("canvas");
    const context = canvas.getContext("2d", { alpha: false });

    if (!context) {
      return src;
    }

    canvas.width = targetWidth;
    canvas.height = targetHeight;
    context.imageSmoothingEnabled = true;
    context.imageSmoothingQuality = "high";
    context.drawImage(image, 0, 0, targetWidth, targetHeight);

    return canvas.toDataURL("image/jpeg", 0.92);
  }

  async function buildScenes() {
    const maxTextureSize = getSafeTextureLimit();
    const sceneEntries = await Promise.all(
      Object.entries(rawScenes).map(async ([sceneId, scene]) => {
        const safePanorama = await buildSafePanoramaSource(scene.panorama, maxTextureSize);
        return [sceneId, { ...scene, panorama: safePanorama }];
      })
    );

    return Object.fromEntries(sceneEntries);
  }

  if (!rawScenes.frontGate.panorama || !rawScenes.insideFrontGate.panorama || !rawScenes.leftCornerInsideFrontGate.panorama || !rawScenes.leftMiddleInsideFrontGate.panorama || !rawScenes.leftMiddleG.panorama || !rawScenes.leftMiddleMiddleG.panorama || !rawScenes.leftG.panorama || !rawScenes.leftEndTombs.panorama || !rawScenes.leftMiddleTombs.panorama || !rawScenes.leftTombs.panorama || !rawScenes.leftFirstTombs.panorama || !rawScenes.insideFrontGate1.panorama || !rawScenes.middleGInside.panorama || !rawScenes.frontChurch.panorama || !rawScenes.leftFrontChurch.panorama || !rawScenes.insideChurch.panorama || !rawScenes.insideChurch1.panorama || !rawScenes.stairsChurch.panorama || !rawScenes.underground1.panorama || !rawScenes.middleUnderground.panorama || !rawScenes.frontAltarUnderground.panorama || !rawScenes.underground2.panorama || !rawScenes.underground3.panorama || !rawScenes.rightFrontChurch.panorama || !rawScenes.rightFrontTombs.panorama || !rawScenes.rightFrontTombs1.panorama || !rawScenes.rightFrontTombs2.panorama || !rawScenes.rightMiddleG.panorama || !rawScenes.rightCornerMiddleG.panorama || !rawScenes.rightMiddleCornerMiddleG.panorama || !rawScenes.rightCornerInsideFrontGate.panorama || !rawScenes.rightFrontGate.panorama || !rawScenes.leftFrontGate.panorama || !rawScenes.leftFlag.panorama || !rawScenes.middleGMuseum.panorama || !rawScenes.frontMuseum.panorama || !rawScenes.insideMuseum.panorama || !rawScenes.museum1.panorama || !rawScenes.museum2.panorama || !rawScenes.museum3.panorama) {
    if (loadingOverlay) {
      loadingOverlay.hidden = true;
    }
    if (errorOverlay) {
      errorOverlay.hidden = false;
    }
    setControlDockVisibility(false);
    return;
  }

  buildScenes()
    .then((scenes) => {
      resolvedScenes = scenes;
      const viewer = createViewerWithCaptureSupport(scenes);
      tourViewer = viewer;

      if (viewer && typeof viewer.on === "function") {
        syncSceneInUrl(initialScene);
        updateHotspotVisibilityState();

        viewer.on("scenechange", function (sceneId) {
          Array.from(floatingImageHotspots.values()).forEach(function (entry) {
            if (entry.sceneId !== sceneId) {
              closeFloatingImageOverlay(entry.hotspotId, entry.sceneId);
            }
          });
          Array.from(floatingArtifactHotspots.values()).forEach(function (entry) {
            if (entry.sceneId !== sceneId) {
              closeFloatingArtifactOverlay(entry.hotspotId, entry.sceneId);
            }
          });
          syncSceneInUrl(sceneId);
          minimapSetActive(sceneId);
          window.requestAnimationFrame(updateHotspotVisibilityState);
        });

        viewer.on("load", function () {
          if (loadingOverlay) {
            loadingOverlay.hidden = true;
          }
          if (errorOverlay) {
            errorOverlay.hidden = true;
          }
          setControlDockVisibility(true);
          minimapSetActive(typeof viewer.getScene === "function" ? viewer.getScene() : initialScene);
        });

        if (hotspotDebugEnabled) {
          viewer.on("mousedown", function (event) {
            const coords = viewer.mouseEventToCoords(event);
            if (!coords || coords.length < 2) {
              return;
            }

            const pitch = Number(coords[0].toFixed(2));
            const yaw = Number(coords[1].toFixed(2));
            const sceneId = typeof viewer.getScene === "function" ? viewer.getScene() : "unknown";

            console.log(`[VirtualTour hotspot helper] scene=${sceneId} pitch=${pitch} yaw=${yaw}`);
            console.log({ sceneId, pitch, yaw });
          });
        }
      }
    })
    .catch(() => {
      resolvedScenes = null;
      tourViewer = null;
      if (loadingOverlay) {
        loadingOverlay.hidden = true;
      }
      if (errorOverlay) {
        errorOverlay.hidden = false;
      }
      setControlDockVisibility(false);
    });
})();
