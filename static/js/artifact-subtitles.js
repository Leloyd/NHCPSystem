(function () {
  "use strict";

  // Shared by the Virtual Tour floating artifacts and AR marker detection.
  // Keys are normalized artifact names; values mirror the recorded TL/EN audio.
  window.NHCP_ARTIFACT_SUBTITLES = Object.freeze({
    thenagcarlanundergroundcemetery: {
      tl: "ANG LIBINGAN sa Ilalim ng Lupa ng Nagcarlan, itinayo sa patnubay ni Padre Vicente Velloc nong 1845, ay isang makasaysayang palatandaan na nagsilbing libingan, tagpuan ng mga rebolusyonaryo, at taguan ng mga gerilya noong panahon ng digmaan. Idineklarang Pambansang Palatandaang Pangkasaysayan noong 24 Oktubre 1981, patuloy nitong kinakatawan ang pananampalataya, kasaysayan, at kabuuang gunita ng Nagcarlan.",
      en: "THE NAGCARLAN Underground Cemetery, built in 1845 under Fray Vicente Velloc, stands as a historic landmark that served as a burial site, a revolutionary meeting place, and a hideout of guerillas. Declared a National Historical Landmark on 24 October 1981, it continues to embody Nagcarlan's faith, history, and collective memory.",
    },
    inscription: {
      tl: "HUMAYO ka, mortal na nilalang, tigib ng buhay.\nMalugod mong isinadya ngayon itong himlayan.\nDatapwa’t sa iyong paglisan,\ngunitain dini’y may isang himlayang\nsa iyo’y inilaan.",
      en: "Go forth, mortal man, full of life.\nToday you happily visited this shelter.\nBut after you have gone out,\nremember, you have a resting place here\nprepared for you.",
    },
    hulingtaludtod: {
      tl: "Paalam, magulang at mga kapatid kapilas ng aking kaluluwa’t dibdib,\nMga kaibigan bata pang maliit sa aking tahanan di na masisilip.\nPag pasalamatan at napahinga rin, paalam estrangherang kasuyo ko’t aliw.\nPaalam sa inyo mga ginigiliw: mamatay ay siyang pagkagupiling!",
      en: "FAREWELL, fathers and brothers, fragments of my soul,\nFriends of my childhood in this ruined abode.\nGive thanks that I rest now from this tiresome day;\nFarewell, sweet stranger, my friend, my joy;\nFarewell, to all I love: to die is to rest.",
    },
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
  });
})();
