/* ==========================================================================
   Heritage Trail — Starting Point + Stop 1 · Orientation (/trail)
   - Intro: 360 aerial panorama (Pannellum, no controls), Ana Kalang on the
     right, info panel + Begin / Cancel on the left.
   - Begin: everything slides out, the aerial view pans down to the front
     gate (data-gate-yaw / data-gate-pitch), then crossfades into the
     FrontGate 360 (Pannellum scene fade) — Stop 1 begins.
   - Stop 1: the FrontGate 360 becomes the living background (with the same
     hotspots as the heritage page + gold info spots), Ana returns with the
     controls, and a scrollable story layer (GSAP-choreographed, like the
     landing page) tells the Orientation chapters.
   - Narration engine ported from the landing page: recorded VO through Stop 3,
     then browser TTS fallback; auto-plays on arrival,
     Listen = pause/resume from the same spot, Mute = volume switch (the
     narration keeps advancing silently and can come back mid-sentence).
   ========================================================================== */

import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

const root = document.getElementById('trailStart');
if (!root) throw new Error('[Trail] Starting-point markup not found.');

const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/* --- Narration (one script per chapter; EN / TL) ----------------------------- */
const SCRIPTS = {
  intro: {
    en: "This is where your journey begins. Before us lies the Nagcarlan Underground Cemetery, seen from above — the circular enclosure, the chapel, and the paths worn by centuries of passage. Look around, take it in. When you are ready, we will walk the trail together.",
    tl: "Dito magsisimula ang iyong paglalakbay. Sa harap natin ang Libingan sa Ilalim ng Lupa ng Nagcarlan, mula sa itaas — ang pabilog na pader, ang kapilya, at ang mga daanang ginugol ng mga siglo. Lumingon-lingon, damhin ito. Kapag handa ka na, sabay nating tatahakin ang landas.",
  },
  's1-arrive': {
    en: "Welcome to the first stop — the front gates of the Nagcarlan Underground Cemetery. Take a moment to look around. When you find the glowing ring on the ground, it will carry you to another view. Then scroll down, and I will tell you what this threshold means.",
    tl: "Maligayang pagdating sa unang hinto — ang tarangkahan ng Libingan sa Ilalim ng Lupa ng Nagcarlan. Lumingon-lingon muna. Kapag nakita mo ang kumikinang na singsing sa lupa, dadalhin ka nito sa ibang tanaw. Pagkatapos, mag-scroll pababa at ikukuwento ko ang kahulugan ng bungad na ito.",
  },
  's1-threshold': {
    en: "Look at the gate as a frame. From this one spot you can already read the whole site — the arch, the circular wall, and the straight path leading to the chapel at the center.",
    tl: "Tingnan ang tarangkahan bilang isang kuwadro. Mula sa iisang puwestong ito, mababasa mo na ang buong pook — ang arko, ang pabilog na pader, at ang tuwid na daanang patungo sa kapilya sa gitna.",
  },
  's1-1845': {
    en: "The cemetery was established in 1845 under Father Vicente Velloc, built south of the town center to follow the health regulations of the time. Distance made it quiet; devotion kept it close.",
    tl: "Itinatag ang libingan noong 1845 sa ilalim ni Padre Vicente Velloc, at itinayo sa timog ng bayan alinsunod sa mga alituntuning pangkalusugan ng panahong iyon. Ang layo ang nagbigay ng katahimikan; ang debosyon ang nagpanatili nitong malapit.",
  },
  's1-landmark': {
    en: "This is sacred ground and historical ground at once. Funerals, secret revolutionary meetings, wartime shelter — all passed through this gate. In 1981 it was declared a National Historical Landmark.",
    tl: "Sabay itong sagrado at makasaysayang lupa. Mga libing, lihim na pulong ng mga rebolusyonaryo, kublihan noong digmaan — lahat dumaan sa tarangkahang ito. Noong 1981, idineklara itong Pambansang Palatandaang Pangkasaysayan.",
  },
  's1-details': {
    en: "The arch, the gate, the walls, and the path inward — four parts of the entrance that separate the town from this resting place. Tap each one to take a closer look.",
    tl: "Ang arko, ang rehas, ang pader, at ang daanang papasok — apat na bahagi ng pasukan na naghihiwalay sa bayan mula sa himlayang ito. Pindutin ang bawat isa upang mapagmasdan.",
  },
  's1-next': {
    en: "That completes our first stop. When you are ready, come with me to the museum — we will register your visit there. Tap Continue and let us walk together.",
    tl: "Tapos na ang ating unang hinto. Kapag handa ka na, sumama ka sa akin sa museo — doon natin itatala ang iyong pagbisita. Pindutin ang Magpatuloy at sabay tayong maglakad.",
  },
  's2-arrive': {
    en: "Welcome to the second stop — the museum grounds. Look around, and find the glowing ring on the ground to walk up to the entrance. Then scroll down, and I will show you how the museum welcomes its visitors.",
    tl: "Maligayang pagdating sa ikalawang hinto — ang bakuran ng museo. Lumingon-lingon, at hanapin ang kumikinang na singsing sa lupa upang lumapit sa pasukan. Pagkatapos, mag-scroll pababa at ipapakita ko kung paano tinatanggap ng museo ang mga bisita nito.",
  },
  's2-registration': {
    en: "At the entrance, the staff will hand you the right form — the daily log for regular visits, a permission form for shoots and research, a short survey after your visit, or a booking form for groups.",
    tl: "Sa pasukan, iaabot sa iyo ng mga tauhan ang tamang form — ang talaan para sa karaniwang pagbisita, pahintulot para sa mga shoot at pananaliksik, maikling sarbey pagkatapos ng iyong pagbisita, o booking form para sa mga grupo.",
  },
  's2-hours': {
    en: "The museum is open from Tuesday to Sunday, nine in the morning until four in the afternoon, and rests on Mondays. Admission is free for everyone.",
    tl: "Bukas ang museo mula Martes hanggang Linggo, alas-nuwebe ng umaga hanggang alas-kuwatro ng hapon, at sarado tuwing Lunes. Libre ang pagpasok para sa lahat.",
  },
  's2-rules': {
    en: "A few simple courtesies: keep quiet, remove your hat, no flash, do not touch the artifacts, and no food or drinks inside. Sign the logbook, and follow the staff at all times.",
    tl: "Ilang simpleng alituntunin: manahimik, alisin ang sumbrero, bawal ang flash, huwag hawakan ang mga artepakto, at bawal ang pagkain o inumin sa loob. Pumirma sa logbook, at laging sundin ang mga tauhan.",
  },
  's2-service': {
    en: "This museum is cared for by the National Historical Commission of the Philippines. Public service here follows clear rules — no smoking, no fixers, no noon break, and no red tape. If anything goes wrong, the complaint channels are posted for you.",
    tl: "Pinangangalagaan ang museong ito ng National Historical Commission of the Philippines. Malinaw ang serbisyo publiko rito — bawal manigarilyo, walang fixer, tuloy ang serbisyo sa tanghali, at bawal ang red tape. Kung may problema, nakapaskil ang mga daluyan ng reklamo para sa iyo.",
  },
  's2-next': {
    en: "That completes our second stop. When you are ready, step inside with me — the artifacts are waiting to tell their stories. Tap Continue and let us go in.",
    tl: "Tapos na ang ating ikalawang hinto. Kapag handa ka na, pumasok ka kasama ko — naghihintay ang mga artepaktong magkuwento. Pindutin ang Magpatuloy at tayo nang pumasok.",
  },
  's3-arrive': {
    en: "Welcome inside the museum — our third stop. This whole place is yours to explore: drag to look around, follow the glowing rings deeper into the halls, and tap the pulsing markers to meet the artifacts. I will wait while you wander.",
    tl: "Maligayang pagdating sa loob ng museo — ang ating ikatlong hinto. Sa iyo ang buong lugar na ito: i-drag upang lumingon, sundan ang mga kumikinang na singsing papasok sa mga bulwagan, at pindutin ang mga kumukutitap na marker upang makilala ang mga artepakto. Hihintayin kita habang namamasyal ka.",
  },
  's3-explore': {
    en: "Every pulsing marker opens an artifact — its photo appears on the wall, and a voice tells its story in English or Tagalog. There are more than twenty of them across four halls. Take your time; the trail can wait.",
    tl: "Bawat kumukutitap na marker ay nagbubukas ng isang artepakto — lilitaw ang larawan nito sa dingding, at may tinig na magkukuwento sa Ingles o Tagalog. Mahigit dalawampu ang mga ito sa apat na bulwagan. Huwag magmadali; kayang maghintay ng landas.",
  },
  's3-collection': {
    en: "Some voices you should not miss: the balanghay, the boat that carried souls to the next life; the hanging coffins of Sagada; and the uloh of the Ifugao. Tap their names to read, or find their markers in the halls to hear them.",
    tl: "Ilang tinig na hindi mo dapat palampasin: ang balanghay, ang bangkang naghatid ng mga kaluluwa sa kabilang buhay; ang mga nakabiting kabaong ng Sagada; at ang uloh ng mga Ifugao. Pindutin ang kanilang mga pangalan upang basahin, o hanapin ang kanilang mga marker sa mga bulwagan upang mapakinggan sila.",
  },
  's3-ar': {
    en: "One more secret before we move on: these artifacts can step out of their cases. Open our AR scanner and point your camera at the printed markers — the artifacts appear before you in 3D, voices and all. It works anywhere, but it is best onsite at the museum, where the markers wait beside each exhibit.",
    tl: "Isa pang lihim bago tayo magpatuloy: kayang lumabas ng mga artepaktong ito mula sa kanilang mga lalagyan. Buksan ang aming AR scanner at itutok ang iyong camera sa mga nakalimbag na marker — lilitaw ang mga artepakto sa harap mo nang 3D, kasama ang kanilang mga tinig. Gumagana ito kahit saan, ngunit pinakamainam ito onsite sa museo, kung saan naghihintay ang mga marker sa tabi ng bawat eksibit.",
  },
  's3-next': {
    en: "That completes our third stop. But before we leave the museum, its stories need a keeper. Ahead, three fading memories are waiting for your hands. Tap Continue.",
    tl: "Tapos na ang ating ikatlong hinto. Ngunit bago tayo umalis sa museo, kailangan ng mga kuwento nito ng tagapag-ingat. Sa unahan, tatlong kumukupas na alaala ang naghihintay sa iyong mga kamay. Pindutin ang Magpatuloy.",
  },
  's4-arrive': {
    en: "Welcome to Islands of Farewell. There are no questions and no scores here. Every artifact you met in the museum has a home somewhere in our islands — from Batanes in the far north to Sulu in the south. Carry each custom back to where it belongs, and light the whole archipelago.",
    tl: "Maligayang pagdating sa Mga Pulo ng Paalam. Walang tanong at walang puntos dito. May pinagmulan ang bawat artifact na nakilala mo sa museo — mula Batanes sa hilaga hanggang Sulu sa timog. Ihatid ang bawat kaugalian pabalik sa pinagmulan nito, at liwanagan ang buong kapuluan.",
  },
  's4-map': {
    en: "Here is our archipelago. Tap or drag any tradition below, and it will find its island and share its story. There is no wrong place — each custom simply returns home. Take your time, and let every island light up.",
    tl: "Narito ang ating kapuluan. Pindutin o i-drag ang alinmang tradisyon sa ibaba, at hahanapin nito ang pulo nito at ibabahagi ang kuwento. Walang maling lugar — babalik lamang sa pinagmulan ang bawat kaugalian. Huwag magmadali, at hayaang lumiwanag ang bawat pulo.",
  },
  's4-complete': {
    en: "Look how the islands shine. From the hanging coffins of Sagada to the burial jars of Mindanao, every people has its own farewell — yet all share one wish: that the dead are cared for, and never forgotten. One thread now runs through them all.",
    tl: "Tingnan kung paano lumiliwanag ang mga pulo. Mula sa nakasabit na kabaong ng Sagada hanggang sa mga bangang panlibing ng Mindanao, may sariling paalam ang bawat pamayanan — ngunit iisa ang hangarin: na maalagaan ang yumao, at hindi kalimutan kailanman. May isang sinulid nang dumadaloy sa kanilang lahat.",
  },
  's4-next': {
    en: "Carry those farewells with you. When you are ready, come with me back into the open air — the grounds have a long history to tell. Tap Continue.",
    tl: "Dalhin mo ang mga paalam na iyon. Kapag handa ka na, sumama ka sa akin pabalik sa labas — mahaba ang kasaysayang ikukuwento ng bakuran. Pindutin ang Magpatuloy.",
  },
  's5-arrive': {
    en: "Welcome back to the open grounds — our fifth stop. Here the cemetery's history stands in stone. Drag to look around, and follow the glowing rings through the courtyard, the face of the chapel, and the quiet rows of tombs. When you are ready, scroll down.",
    tl: "Maligayang pagbabalik sa bukas na bakuran — ang ating ikalimang hinto. Dito nakatindig sa bato ang kasaysayan ng libingan. I-drag upang lumingon, at sundan ang mga kumikinang na singsing sa patyo, sa harap ng kapilya, at sa tahimik na mga hanay ng puntod. Kapag handa ka na, mag-scroll pababa.",
  },
  's5-history': {
    en: "Long before the tombs, the story began. The Spanish reached Nagcarlan in 1571 under Captain Juan de Salcedo. In 1578, the Franciscan missionaries Fray Juan de Plasencia and Fray Diego de Oropesa brought the Catholic faith. And in 1583, Nagcarlan became a pueblo under Fray Tomas de Miranda.",
    tl: "Bago pa ang mga puntod, nagsimula na ang kuwento. Nakarating ang mga Kastila sa Nagcarlan noong 1571 sa pamumuno ni Kapitan Juan de Salcedo. Noong 1578, dinala ng mga Pransiskanong misyonerong sina Padre Juan de Plasencia at Padre Diego de Oropesa ang pananampalatayang Katoliko. At noong 1583, naging ganap na bayan ang Nagcarlan sa ilalim ni Padre Tomas de Miranda.",
  },
  's5-plasencia': {
    en: "One of those Franciscan missionaries left words that still matter. Fray Juan de Plasencia wrote the Doctrina Cristiana — the very first book printed in the Philippines — and the Relación de las costumbres de los tagalos, which recorded and preserved the customs of our ancestors. Tap View Documents to see its first pages.",
    tl: "Isa sa mga Pransiskanong misyonerong iyon ang nag-iwan ng mga salitang mahalaga pa rin hanggang ngayon. Isinulat ni Padre Juan de Plasencia ang Doctrina Cristiana — ang kauna-unahang aklat na inilimbag sa Pilipinas — at ang Relación de las costumbres de los tagalos, na nagtala at nag-ingat sa mga kaugalian ng ating mga ninuno. Pindutin ang Tingnan ang mga Dokumento upang makita ang mga unang pahina nito.",
  },
  's5-explore': {
    en: "Now the grounds are yours. Step through the gate, cross to the chapel, and wander the rows of tombs on either side. The glowing rings carry you from one view to the next — take all the time you need.",
    tl: "Ngayon, sa iyo na ang bakuran. Dumaan sa tarangkahan, tumawid sa kapilya, at libutin ang mga hanay ng puntod sa magkabilang gilid. Ang mga kumikinang na singsing ang maghahatid sa iyo mula sa isang tanaw patungo sa susunod — huwag magmadali.",
  },
  's5-next': {
    en: "That completes our fifth stop. When you are ready, come with me across the courtyard — the chapel and the tombs are just ahead. Tap Continue.",
    tl: "Tapos na ang ating ikalimang hinto. Kapag handa ka na, sumama ka sa akin patawid sa patyo — nasa unahan lang ang kapilya at ang mga puntod. Pindutin ang Magpatuloy.",
  },
  's6-arrive': {
    en: "Here we are, before the chapel — our sixth stop. Take it in: drag to look around, and follow the glowing rings across its face and along the rows of tombs on either side. When you are ready, scroll down and I will tell you how this place was cared for.",
    tl: "Narito na tayo, sa harap ng kapilya — ang ating ikaanim na hinto. Damhin ito: i-drag upang lumingon, at sundan ang mga kumikinang na singsing sa harap nito at sa mga hanay ng puntod sa magkabilang gilid. Kapag handa ka na, mag-scroll pababa at ikukuwento ko kung paano inalagaan ang pook na ito.",
  },
  's6-renovations': {
    en: "On the 24th of October, 1981, the National Historical Institute placed a marker here — and since then, the site has been in its care. As the National Historical Commission of the Philippines, it has restored the cemetery again and again: from 1982 to 1986, in 2008, from 2015 to 2016, and most recently from 2023 to 2024.",
    tl: "Noong ika-24 ng Oktubre 1981, naglagay ng pananda rito ang Pambansang Suriang Pangkasaysayan — at mula noon, nasa pangangalaga na nito ang pook. Bilang Pambansang Komisyong Pangkasaysayan ng Pilipinas, paulit-ulit nitong isinaayos ang libingan: mula 1982 hanggang 1986, noong 2008, mula 2015 hanggang 2016, at kamakailan lang mula 2023 hanggang 2024.",
  },
  's6-deterioration': {
    en: "Yet time was not always kind. From the early twentieth century, after the Spanish era, all the way to the year 2000, this underground burial site suffered — worn down by the forces of nature that tested its very structure.",
    tl: "Ngunit hindi laging mabait ang panahon. Mula sa unang bahagi ng ikadalawampung siglo, matapos ang panahon ng mga Espanyol, hanggang sa taong 2000, nagdusa ang libingang ito sa ilalim ng lupa — inagnas ng puwersa ng kalikasan na sumubok sa mismong istruktura nito.",
  },
  's6-next': {
    en: "That completes our sixth stop. When you are ready, step inside the chapel with me. Tap Continue.",
    tl: "Tapos na ang ating ikaanim na hinto. Kapag handa ka na, pumasok ka sa kapilya kasama ko. Pindutin ang Magpatuloy.",
  },
  's7-arrive': {
    en: "We are inside the chapel now — our seventh stop. Take it in: drag to look around the nave, up at the ceiling, and toward the altar. When you are ready, scroll down.",
    tl: "Nasa loob na tayo ng kapilya — ang ating ikapitong hinto. Damhin ito: i-drag upang lumingon sa nave, sa kisame, at patungo sa altar. Kapag handa ka na, mag-scroll pababa.",
  },
  's7-tapestry': {
    en: "Let me show you one of the chapel's most meaningful objects — the tapete. Embroidered with a skull and crossbones beside the cross of Christ, this black cloth is a Catholic symbol of death and remembrance, laid amid candles and flowers as the focus of prayers for the departed.",
    tl: "Ipakita ko sa iyo ang isa sa pinakamakabuluhang bagay sa kapilya — ang tapete. Binurdahan ng bungo at magkakrus na buto katabi ng krus ni Kristo, ang itim na telang ito ay simbolong Katoliko ng kamatayan at pag-alaala, inilalatag kasama ng kandila at bulaklak bilang sentro ng dasal para sa mga yumao.",
  },
  's7-explore': {
    en: "Take your time within these walls. Look at the aged timber and stone, and follow the glowing rings from the nave toward the altar. When you are ready, we will descend to the crypts below.",
    tl: "Maglaan ng panahon sa loob ng mga pader na ito. Tingnan ang lumang kahoy at bato, at sundan ang mga kumikinang na singsing mula sa nave patungo sa altar. Kapag handa ka na, bababa tayo sa mga kripta sa ilalim.",
  },
  's7-next': {
    en: "That completes our seventh stop. When you are ready, come down with me into the underground crypts. Tap Continue.",
    tl: "Tapos na ang ating ikapitong hinto. Kapag handa ka na, bumaba ka kasama ko sa mga kripta sa ilalim. Pindutin ang Magpatuloy.",
  },
  's8-arrive': {
    en: "Here we are, beneath the earth — the underground crypts, our eighth stop. This is the heart of the cemetery. Drag to look around, follow the glowing rings through the chambers, and scroll down as I tell you the stories held down here.",
    tl: "Narito na tayo, sa ilalim ng lupa — ang mga kripta, ang ating ikawalong hinto. Ito ang puso ng libingan. I-drag upang lumingon, sundan ang mga kumikinang na singsing sa mga silid, at mag-scroll pababa habang ikinukuwento ko ang mga kuwentong nasa ilalim dito.",
  },
  's8-acronyms': {
    en: "Look closely at the gravestones. R.I.P., D.E.P., D.O.M. — Latin prayers for the dead. But on the graves of ordinary Filipinos you will more often find S.L.N.: Sumalangit Nawa, may their soul ascend to heaven.",
    tl: "Tingnang mabuti ang mga puntod. R.I.P., D.E.P., D.O.M. — mga panalanging Latin para sa yumao. Ngunit sa mga puntod ng karaniwang Pilipino, mas madalas mong makikita ang S.L.N.: Sumalangit Nawa.",
  },
  's8-revolution': {
    en: "These quiet chambers once held secrets. During the revolution against Spain, Katipuneros met here. In 1897, Pedro Paterno and General Severino Taiño gathered to discuss the talks that would lead to the Pact of Biak-na-Bato.",
    tl: "Ang tahimik na mga silid na ito ay minsang nag-ingat ng mga lihim. Noong rebolusyon laban sa Espanya, nagpulong dito ang mga Katipunero. Noong 1897, nagtipon sina Pedro Paterno at Heneral Severino Taiño upang talakayin ang mga usaping humantong sa Kasunduan sa Biak-na-Bato.",
  },
  's8-biak': {
    en: "The story of that pact reaches far beyond Nagcarlan — to the caves of Biak-na-Bato, where Aguinaldo made his stronghold, to a signed agreement in December 1897, and to an exile in Hong Kong. Read the full story here; take your time.",
    tl: "Ang kuwento ng kasunduang iyon ay umaabot nang higit pa sa Nagcarlan — sa mga yungib ng Biak-na-Bato, kung saan itinatag ni Aguinaldo ang kanyang kuta, sa isang nilagdaang kasunduan noong Disyembre 1897, at sa pagkatapon sa Hong Kong. Basahin ang buong kuwento rito; huwag magmadali.",
  },
  's8-wwii': {
    en: "The cemetery kept sheltering the brave. During the Japanese occupation, it became a stronghold for Filipino guerrillas, led by Colonel Guillermo Aynaga, until his capture and death in 1944. His remains now rest at the Libingan ng mga Bayani.",
    tl: "Patuloy na nagkupkop ng matatapang ang libingan. Noong pananakop ng mga Hapon, naging kuta ito ng mga gerilyang Pilipino, sa pamumuno ni Koronel Guillermo Aynaga, hanggang sa kanyang pagkadakip at pagkamatay noong 1944. Ang kanyang labi ay nakahimlay na ngayon sa Libingan ng mga Bayani.",
  },
  's8-guerrillas': {
    en: "They did not fight alone. The Nagcarlan guerrillas — the FAIT, the FAAC, and President Quezon's Own Guerrillas — fought in the mountains, sabotaged the enemy, and fed intelligence to the Allies, standing firm for Philippine freedom until the war's end.",
    tl: "Hindi sila nag-isa. Ang mga gerilya ng Nagcarlan — ang FAIT, ang FAAC, at ang President Quezon's Own Guerrillas — ay nakipaglaban sa kabundukan, nanira sa kaaway, at nagbigay ng impormasyon sa mga Allied, na matatag para sa kalayaan ng Pilipinas hanggang sa katapusan ng digmaan.",
  },
  's8-next': {
    en: "That completes our eighth stop. When you are ready, one last challenge waits before we return to the light. Tap Continue.",
    tl: "Tapos na ang ating ikawalong hinto. Kapag handa ka na, may naghihintay na huling hamon bago tayo bumalik sa liwanag. Pindutin ang Magpatuloy.",
  },
  's9-arrive': {
    en: "One last challenge — our ninth stop. No scores, no grades: just a few games drawn from everything you have seen, from the gates to these crypts. Scroll down and let us play.",
    tl: "Isang huling hamon — ang ating ikasiyam na hinto. Walang puntos, walang grado: ilang laro lamang mula sa lahat ng iyong nakita, mula sa tarangkahan hanggang sa mga kriptang ito. Mag-scroll pababa at maglaro tayo.",
  },
  's9-riddle': {
    en: "First, a riddle from the crypts. Katipuneros met in secret at Nagcarlan in 1897 — and those talks led, months later, to a famous agreement with Spain. Which one? Choose below.",
    tl: "Una, isang bugtong mula sa mga kripta. Lihim na nagpulong ang mga Katipunero sa Nagcarlan noong 1897 — at ang mga usapang iyon ay humantong sa isang tanyag na kasunduan sa Espanya. Alin? Pumili sa ibaba.",
  },
  's9-order': {
    en: "Now the whole story. Tap the four moments in the order they happened — from the friars who built this place to the day it became a national landmark.",
    tl: "Ngayon, ang buong kuwento. Pindutin ang apat na pangyayari ayon sa pagkakasunod — mula sa mga prayleng nagtayo nito hanggang sa araw na naging pambansang palatandaan ito.",
  },
  's9-tf': {
    en: "Last — four quick claims from across the whole trail. Tell me: true, or false? Take your best guess.",
    tl: "Panghuli — apat na mabilisang pahayag mula sa buong landas. Sabihin mo: totoo, o hindi? Manghula lang.",
  },
  's9-next': {
    en: "Well played — that was our final challenge. Let us climb back up into the light, and stand once more at the gates where we began. Tap Continue.",
    tl: "Mahusay — iyon ang ating huling hamon. Umakyat tayong muli sa liwanag, at tumayo pang muli sa tarangkahang pinagsimulan natin. Pindutin ang Magpatuloy.",
  },
  's10-arrive': {
    en: "And here we are again — the front gates, where our journey began. Take one last look around the place you now know so well.",
    tl: "At narito na tayong muli — ang tarangkahan, kung saan nagsimula ang ating paglalakbay. Lumingon-lingon nang huling beses sa pook na kilalang-kilala mo na ngayon.",
  },
  's10-farewell': {
    en: "Salamat — thank you for walking the whole trail with me. From the gates to the crypts, you have carried this history with you now. This heritage grows when you take part: share a story, leave your feedback, or come visit us onsite. Until we meet again, ingat — take care.",
    tl: "Salamat — salamat sa paglakad sa buong landas kasama ako. Mula sa tarangkahan hanggang sa mga kripta, dala mo na ngayon ang kasaysayang ito. Lumalago ang pamanang ito kapag nakikibahagi ka: magbahagi ng kuwento, mag-iwan ng puna, o dalawin kami nang personal. Hanggang sa muli, ingat.",
  },
};

/* Recorded Ana Kalang narration currently covers the Starting Point through
   Stop 3. File names deliberately mirror the SCRIPTS keys; later stops fall
   back to browser TTS until their recordings are added. */
const TRAIL_VOICE_KEYS = [
  'intro',
  's1-arrive', 's1-threshold', 's1-1845', 's1-landmark', 's1-details', 's1-next',
  's2-arrive', 's2-registration', 's2-hours', 's2-rules', 's2-service', 's2-next',
  's3-arrive', 's3-explore', 's3-collection', 's3-ar', 's3-next',
];
const rawTrailVoiceBase = root.dataset.voiceBase || '/audio/trail/';
const TRAIL_VOICE_BASE = rawTrailVoiceBase.endsWith('/') ? rawTrailVoiceBase : `${rawTrailVoiceBase}/`;
const TRAIL_VOICE = Object.fromEntries(TRAIL_VOICE_KEYS.map((key) => [key, {
  en: `${TRAIL_VOICE_BASE}${key}-en.mp3`,
  tl: `${TRAIL_VOICE_BASE}${key}-tl.mp3`,
}]));

/* --- Refs & state ----------------------------------------------------------- */
const panoEl = document.getElementById('trailPano');
const curtain = root.querySelector('[data-trail-curtain]');
const canvasWrap = root.querySelector('[data-trail-canvas]');
const bubble = root.querySelector('[data-trail-bubble]');
const bubbleText = root.querySelector('[data-trail-text]');
const cursorGlow = root.querySelector('[data-trail-cursor]');
const playBtn = root.querySelector('[data-trail-play]');
const muteBtn = root.querySelector('[data-trail-mute]');
const langBtn = root.querySelector('[data-trail-lang]');
const subsBtn = root.querySelector('[data-trail-subs]');
const textSizeBtn = root.querySelector('[data-trail-textsize]');
const beginLink = root.querySelector('[data-trail-begin]');
const cancelLink = root.querySelector('[data-trail-cancel]');
const storyEls = Array.from(root.querySelectorAll('[data-trail-story]'));
const progressEl = root.querySelector('[data-trail-progress] span');
const zoomInBtn = root.querySelector('[data-trail-zoom-in]');
const zoomOutBtn = root.querySelector('[data-trail-zoom-out]');

const state = {
  lang: localStorage.getItem('anaGuideLang') === 'tl' ? 'tl' : 'en',
  muted: localStorage.getItem('anaGuideMuted') === 'true',
  subtitles: localStorage.getItem('anaGuideSubs') !== 'off',
  textSize: Math.min(3, Math.max(1, parseInt(localStorage.getItem('anaGuideTextSize') || '1', 10) || 1)),
  unlocked: false,
  playing: false,
  typeTimer: 0,
  mode: 'intro',       // 'intro' | 'stop1'
  scriptKey: 'intro',  // which SCRIPTS entry the Listen button replays
};

/* Panorama handles (set once the viewer is built) */
let viewer = null;
let currentScene = 'aerial';
let transitioning = false; // true during the Begin pan + scene crossfade
let scrollYaw = 0;         // scroll-linked yaw offset while reading Stop 1

/* Refreshing while reading a stop keeps you in that stop: entering one stamps
   #stop-N on the URL, and on load that hash restores the stop directly (its
   360 as the first scene, no intro). */
const hashStopNum = (window.location.hash.match(/stop-(\d+)/) || [])[1];
const wantsStop = hashStopNum ? `stop${hashStopNum}` : null;

/* Per-stop story engines + the scroller currently on screen. */
const storyApis = {};
let activeStoryEl = null;

/* Character handle (populated by initCharacter) */
const charApi = {};

/* Full-View artifact-controls handle (populated by initPanorama). In Full View
   on the museum stops the guide controls drive the tapped artifact's audio. */
const artApi = {};

/* Stop 4's Fragments of Memory controls. Populated when its story is set up
   so stop transitions and the global mute control can also manage its music. */
const memoryApi = {};

/* --- Arrival ---------------------------------------------------------------- */
// Whether we came here via the landing "Start Heritage Trail" exit.
let cameFromLanding = false;
try {
  cameFromLanding = sessionStorage.getItem('trailArrival') === '1';
  sessionStorage.removeItem('trailArrival');
} catch { /* private mode */ }

if (!cameFromLanding && curtain) curtain.style.transitionDelay = '0s';
window.requestAnimationFrame(() => {
  root.classList.add('is-entered');
  window.setTimeout(() => curtain && curtain.classList.add('is-lifted'), 60);
});

/* --- Speech (Web Speech API — engine ported from the landing page) ----------- */
const synth = 'speechSynthesis' in window ? window.speechSynthesis : null;
let voices = [];
function refreshVoices() { if (synth) voices = synth.getVoices() || []; }
if (synth) { refreshVoices(); synth.onvoiceschanged = refreshVoices; }
function pickVoice(lang) {
  if (!voices.length) refreshVoices();
  if (lang === 'tl') {
    return voices.find((v) => /fil|tl/i.test(v.lang)) ||
      voices.find((v) => /fil|tagalog|filipino/i.test(v.name)) ||
      voices.find((v) => /en/i.test(v.lang)) || voices[0];
  }
  return voices.find((v) => /en[-_]?(ph|us|gb)/i.test(v.lang)) || voices.find((v) => /^en/i.test(v.lang)) || voices[0];
}
function setPlaying(p) {
  state.playing = p;
  root.setAttribute('data-playing', String(p));
  if (playBtn) {
    playBtn.setAttribute('aria-pressed', String(p));
    playBtn.setAttribute('aria-label', p ? 'Pause narration' : 'Play narration');
  }
}

/* The narration engine tracks the spoken position (via word-boundary events)
   so that Mute works like a volume control — the speech keeps advancing
   silently and can come back audible mid-sentence — and the Listen button
   pauses/resumes from the same spot instead of restarting. The utterGen
   counter invalidates callbacks from cancelled utterances. */
let utterGen = 0;
const narration = { full: '', pos: 0, paused: false, startPos: 0, startedAt: 0, boundaryFired: false, mode: 'tts' };

/* One shared player keeps pause/resume and mute behavior consistent while
   chapters and languages change. A failed recording falls back to TTS. */
const voiceEl = typeof Audio !== 'undefined' ? new Audio() : null;
if (voiceEl) {
  voiceEl.preload = 'auto';
  voiceEl.addEventListener('play', () => {
    if (narration.mode === 'audio') setPlaying(true);
  });
  voiceEl.addEventListener('ended', () => {
    if (narration.mode === 'audio') {
      narration.paused = false;
      setPlaying(false);
    }
  });
  voiceEl.addEventListener('error', () => {
    if (narration.mode === 'audio' && state.unlocked && narration.full) {
      narration.mode = 'tts';
      speakFrom(0);
    }
  });
}

/* Mobile browsers allow muted autoplay more reliably than audible autoplay.
   If the first audible attempt is blocked, start silently and unmute on the
   visitor's first gesture, matching the Landing narration behavior. */
let autoMutedStart = false;

function playVoiceFrom(url, seconds) {
  if (!voiceEl) return false;
  narration.mode = 'audio';
  narration.paused = false;
  utterGen += 1;
  if (synth) synth.cancel();
  if (voiceEl.src !== url) voiceEl.src = url;
  try { voiceEl.currentTime = seconds || 0; } catch { /* metadata not ready */ }
  voiceEl.muted = state.muted || autoMutedStart;
  const playing = voiceEl.play();
  if (playing && playing.catch) {
    playing.catch((error) => {
      if (error && error.name === 'NotAllowedError') {
        if (!autoMutedStart) {
          autoMutedStart = true;
          voiceEl.muted = true;
          const retry = voiceEl.play();
          if (retry && retry.catch) {
            retry.catch(() => {
              state.unlocked = false;
              setPlaying(false);
            });
          }
          return;
        }
        state.unlocked = false;
      }
      setPlaying(false);
    });
  }
  return true;
}

/* Android Chrome never fires word-boundary events, so estimate the spoken
   position from elapsed time instead, snapped back to a word start. */
const SPEECH_CHARS_PER_SEC = 14; // ≈150 wpm at our speaking rate
function currentSpeechPos() {
  if (narration.mode === 'audio' && voiceEl) {
    if (!voiceEl.duration || !Number.isFinite(voiceEl.duration)) return 0;
    return Math.min(narration.full.length, Math.round((voiceEl.currentTime / voiceEl.duration) * narration.full.length));
  }
  if (narration.boundaryFired || !state.playing) return narration.pos;
  const elapsed = (performance.now() - narration.startedAt) / 1000;
  let pos = Math.min(narration.full.length, narration.startPos + Math.round(elapsed * SPEECH_CHARS_PER_SEC));
  while (pos > narration.startPos && pos < narration.full.length && !/\s/.test(narration.full[pos])) pos -= 1;
  return pos;
}

function stopSpeaking() {
  utterGen += 1;
  if (synth) synth.cancel();
  if (voiceEl) {
    voiceEl.pause();
    try { voiceEl.currentTime = 0; } catch { /* metadata not ready */ }
  }
  narration.paused = false;
  narration.pos = 0;
  setPlaying(false);
}

/* Speak the current narration from a character offset, at the current
   mute-volume. Used for starts, resumes, and mute/unmute swaps. */
function speakFrom(pos) {
  if (!synth || !state.unlocked) { setPlaying(false); return; }
  const text = narration.full.slice(pos);
  if (!text) { setPlaying(false); return; }
  const gen = ++utterGen;
  narration.pos = pos;
  narration.startPos = pos;
  narration.startedAt = performance.now();
  narration.boundaryFired = false;
  narration.paused = false;
  synth.cancel();
  const utter = new SpeechSynthesisUtterance(text);
  const voice = pickVoice(state.lang);
  if (voice) utter.voice = voice;
  utter.lang = state.lang === 'tl' ? (voice && /fil|tl/i.test(voice.lang) ? voice.lang : 'fil-PH') : 'en-US';
  utter.rate = 0.96;
  utter.pitch = 1.05;
  utter.volume = state.muted ? 0 : 1; // muted = silent playback, not stopped
  utter.onstart = () => {
    if (gen !== utterGen) return;
    narration.startedAt = performance.now(); // time the pace from real start
    setPlaying(true);
  };
  utter.onboundary = (event) => {
    if (gen !== utterGen) return;
    narration.boundaryFired = true;
    narration.pos = pos + (event.charIndex || 0); // remember where she is
  };
  utter.onend = () => { if (gen === utterGen) setPlaying(false); };
  utter.onerror = (event) => {
    if (gen !== utterGen) return;
    // Autoplay was blocked: flag audio as still locked so the first user
    // gesture (kickstart below) retries the narration properly.
    if (event && event.error === 'not-allowed') state.unlocked = false;
    setPlaying(false);
  };
  // Android drops an utterance issued in the same tick as cancel() — give
  // the engine a beat before speaking. The gen guard voids stale timers.
  window.setTimeout(() => {
    if (gen === utterGen) synth.speak(utter);
  }, 80);
}

function speak(text, key) {
  narration.full = text;
  const voiceUrl = key && TRAIL_VOICE[key] ? TRAIL_VOICE[key][state.lang] || TRAIL_VOICE[key].en : null;
  if (voiceUrl && voiceEl) {
    playVoiceFrom(voiceUrl, 0);
    return;
  }
  narration.mode = 'tts';
  if (voiceEl) voiceEl.pause();
  speakFrom(0);
}

function pauseSpeaking() {
  if (narration.mode === 'audio' && voiceEl) {
    voiceEl.pause();
    narration.paused = true;
    setPlaying(false);
    return;
  }
  narration.pos = currentSpeechPos(); // capture before playing flips off
  narration.paused = true;
  utterGen += 1; // silence callbacks from the utterance we cancel
  if (synth) synth.cancel();
  setPlaying(false);
}

function resumeSpeaking() {
  if (narration.mode === 'audio' && voiceEl) {
    voiceEl.muted = state.muted;
    const playing = voiceEl.play();
    if (playing && playing.catch) playing.catch(() => setPlaying(false));
    narration.paused = false;
    return;
  }
  speakFrom(narration.pos);
}

/* --- Bubble (typewriter) ---------------------------------------------------- */
function renderBubble(text) {
  if (!bubbleText) return;
  bubble?.classList.remove('is-expanded'); // new narration → collapsed chip (mobile)
  window.clearInterval(state.typeTimer);
  if (prefersReducedMotion) { bubbleText.textContent = text; return; }
  bubbleText.textContent = '';
  const cursor = document.createElement('span');
  cursor.className = 'tx-cursor';
  cursor.textContent = ' ';
  bubbleText.appendChild(cursor);
  let i = 0;
  state.typeTimer = window.setInterval(() => {
    if (i >= text.length) { window.clearInterval(state.typeTimer); cursor.remove(); return; }
    cursor.before(document.createTextNode(text[i]));
    i += 1;
  }, 16);
}
function narrate({ speakIt } = {}) {
  const script = SCRIPTS[state.scriptKey] || SCRIPTS.intro;
  const text = script[state.lang] || script.en;
  renderBubble(text);
  if (speakIt) speak(text, state.scriptKey);
  else stopSpeaking();
}

/* --- Controls --------------------------------------------------------------- */
function setMuted(m) {
  state.muted = m;
  localStorage.setItem('anaGuideMuted', String(m));
  root.setAttribute('data-muted', String(m));
  if (muteBtn) {
    muteBtn.setAttribute('aria-pressed', String(m));
    muteBtn.setAttribute('aria-label', m ? 'Unmute narration' : 'Mute narration');
  }
  memoryApi.setMuted?.(m);
  // Mute is a volume switch, not a stop. Recorded VO mutes natively; TTS
  // re-speaks the remainder from the current word at the new volume.
  if (voiceEl) voiceEl.muted = m;
  if (state.playing && narration.mode !== 'audio') speakFrom(currentSpeechPos());
}
function setLang(lang) {
  state.lang = lang;
  localStorage.setItem('anaGuideLang', lang);
  root.setAttribute('data-lang', lang);
  if (langBtn) langBtn.textContent = lang === 'tl' ? 'TL' : 'EN';
  narrate({ speakIt: state.unlocked });
}
function setSubtitles(on) {
  state.subtitles = on;
  localStorage.setItem('anaGuideSubs', on ? 'on' : 'off');
  root.setAttribute('data-subtitles', on ? 'on' : 'off');
  if (subsBtn) {
    subsBtn.setAttribute('aria-pressed', String(on));
    subsBtn.setAttribute('aria-label', on ? 'Hide subtitles' : 'Show subtitles');
  }
}

const TEXT_SIZE_LABELS = { 1: 'A', 2: 'A+', 3: 'A++' };
const TEXT_SIZE_NAMES = { 1: 'normal', 2: 'large', 3: 'extra large' };
function setTextSize(size) {
  state.textSize = size;
  localStorage.setItem('anaGuideTextSize', String(size));
  root.setAttribute('data-textsize', String(size));
  if (textSizeBtn) {
    textSizeBtn.textContent = TEXT_SIZE_LABELS[size];
    textSizeBtn.setAttribute('aria-label', `Text size: ${TEXT_SIZE_NAMES[size]}. Tap to ${size >= 3 ? 'reset' : 'enlarge'}`);
  }
}

function unlockAudio() {
  if (state.unlocked) return;
  state.unlocked = true;
  // Some browsers require a speak() inside the gesture to unlock TTS.
  if (synth && !state.muted) synth.speak(new SpeechSynthesisUtterance(''));
}

root.setAttribute('data-lang', state.lang);
root.setAttribute('data-playing', 'false');
root.setAttribute('data-mode', 'intro');
setMuted(state.muted);
setSubtitles(state.subtitles);
setTextSize(state.textSize);
if (langBtn) langBtn.textContent = state.lang === 'tl' ? 'TL' : 'EN';

playBtn?.addEventListener('click', () => {
  unlockAudio();
  if (artApi.isMode?.()) { artApi.toggleListen(); return; } // Full View → artifact audio
  if (state.playing) {
    pauseSpeaking(); // Listen acts as pause…
    return;
  }
  if (!state.subtitles) setSubtitles(true); // playing reveals her words
  if (narration.paused && (narration.mode === 'audio' || narration.pos > 0)) {
    resumeSpeaking(); // …and resumes from the same spot,
  } else {
    narrate({ speakIt: true }); // or restarts when finished.
  }
});
muteBtn?.addEventListener('click', () => {
  if (artApi.isMode?.()) { artApi.toggleMute(); return; }
  setMuted(!state.muted);
});
langBtn?.addEventListener('click', () => {
  const next = state.lang === 'en' ? 'tl' : 'en';
  if (artApi.isMode?.()) { artApi.setLang(next); return; }
  setLang(next);
});
subsBtn?.addEventListener('click', () => { setSubtitles(!state.subtitles); artApi.renderSubtitle?.(); });
textSizeBtn?.addEventListener('click', () => setTextSize(state.textSize >= 3 ? 1 : state.textSize + 1));
// On mobile the bubble is a collapsed 2-line chip above the controls; tapping
// it expands the full narration (pointer-events are off on desktop → inert).
bubble?.addEventListener('click', () => bubble.classList.toggle('is-expanded'));

/* Auto-start narration on load (like the landing page). Browsers may block
   audible media or TTS before the first gesture, so try immediately and arm
   a kickstart for the visitor's first tap/click/keypress. */
function attemptAutoSpeak() {
  if (state.playing || state.unlocked) return;
  state.unlocked = true; // optimistic — revoked by the not-allowed error
  narrate({ speakIt: true });
}
function setupAutoSpeakKickstart() {
  const types = ['pointerdown', 'keydown', 'touchend'];
  let tries = 0;
  let handler = null;
  const disarm = () => types.forEach((t) => window.removeEventListener(t, handler, true));
  handler = (event) => {
    // Mobile may have started the recorded VO silently. The first real gesture
    // restores sound at the recording's current position.
    if (autoMutedStart) {
      autoMutedStart = false;
      if (voiceEl && !state.muted) voiceEl.muted = false;
    }
    // Already talking? The kickstart's job is done.
    const recordedVoiceRunning = narration.mode === 'audio' && voiceEl && !voiceEl.paused;
    if (recordedVoiceRunning || (synth && (synth.speaking || synth.pending))) { disarm(); return; }
    // Prime the engine synchronously INSIDE this real gesture. Mobile only
    // unlocks TTS for a speak() issued during a tap — and the boot attempt
    // can leave state.unlocked stuck true (iOS blocks silently, so the
    // not-allowed revert never fires), which used to skip this prime.
    state.unlocked = true;
    if (synth && !state.muted) synth.speak(new SpeechSynthesisUtterance(''));
    const target = event.target;
    // On the guide controls, the buttons' own handlers decide playback.
    const onControls = target instanceof Element && target.closest('.trailx__controls');
    if (!onControls && !narration.paused) {
      narrate({ speakIt: true });
    }
    // Stay armed until speech is SEEN running (checked on the next tap), but
    // give up after a few tries so devices with no TTS voices at all don't
    // restart the typewriter on every touch.
    tries += 1;
    if (onControls || tries >= 3) disarm();
  };
  types.forEach((t) => window.addEventListener(t, handler, true));
}
window.addEventListener('pagehide', () => stopSpeaking());

/* --- Views & scenes ----------------------------------------------------------
   GATE  = where the aerial view pans before the crossfade (aim at the gate).
   FG    = the FrontGate 360's starting view (same numbers as the old page).
   Tune any of these via the data attributes on #trailStart — drag the view
   and read the console: every drag logs data-yaw / data-pitch to copy. ------ */
const GATE = {
  yaw: parseFloat(root.getAttribute('data-gate-yaw')),
  pitch: parseFloat(root.getAttribute('data-gate-pitch')),
};
if (!Number.isFinite(GATE.yaw)) GATE.yaw = -44.6;
if (!Number.isFinite(GATE.pitch)) GATE.pitch = -72.8;

const FG = {
  yaw: parseFloat(root.getAttribute('data-fg-yaw')),
  pitch: parseFloat(root.getAttribute('data-fg-pitch')),
  hfov: 110,
};
if (!Number.isFinite(FG.yaw)) FG.yaw = -10.2;
if (!Number.isFinite(FG.pitch)) FG.pitch = 1.8;

// MiddleG-Museum start view (same numbers as the heritage page's Stop 2).
const M2 = { yaw: -100, pitch: -5, hfov: 100 };
// InsideMuseum start view (same numbers as the virtual tour, hfov capped).
const M3 = { yaw: 90, pitch: -5, hfov: 140 };

// Where the idle view settles per scene while a stop is active.
const SCENE_BASE = {
  frontGate: { yaw: FG.yaw, pitch: FG.pitch },
  rightFrontGate: { yaw: 90, pitch: -20 },
  middleGMuseum: { yaw: M2.yaw, pitch: M2.pitch },
  frontMuseum: { yaw: 0, pitch: 0 },
  insideMuseum: { yaw: M3.yaw, pitch: M3.pitch },
  museum1: { yaw: 75, pitch: -20 },
  museum2: { yaw: 80, pitch: -20 },
  museum3: { yaw: 170, pitch: -12 },
  // Stop 5 — cemetery grounds (chapel front + tomb rows), virtual-tour views.
  insideFrontGate: { yaw: 0, pitch: 0 },
  insideFrontGate1: { yaw: 0, pitch: 0 },
  middleGInside: { yaw: 123, pitch: 0 },
  frontChurch: { yaw: -10, pitch: 0 },
  rightFrontChurch: { yaw: 0, pitch: 0 },
  leftFrontChurch: { yaw: 0, pitch: 0 },
  rightFrontTombs: { yaw: 0, pitch: 0 },
  rightFrontTombs1: { yaw: -110, pitch: 0 },
  rightFrontTombs2: { yaw: 0, pitch: 0 },
  leftFirstTombs: { yaw: 0, pitch: 0 },
  leftTombs: { yaw: 0, pitch: 0 },
  leftMiddleTombs: { yaw: 0, pitch: 0 },
  leftEndTombs: { yaw: 0, pitch: 0 },
  // Stop 7 — chapel interior.
  insideChurch: { yaw: -24, pitch: 0 },
  insideChurch1: { yaw: 160, pitch: 0 },
  // Stops 8 & 9 — underground crypts.
  underground1: { yaw: -20, pitch: 0 },
  middleUnderground: { yaw: -110, pitch: 0 },
  frontAltarUnderground: { yaw: 0, pitch: 0 },
  underground2: { yaw: -14, pitch: 0 },
  underground3: { yaw: 0, pitch: 0 },
};
// Default zoom per scene — Show Panels eases back to this before restoring.
const SCENE_HFOV = {
  aerial: 100,
  frontGate: FG.hfov,
  rightFrontGate: 100,
  middleGMuseum: 100,
  frontMuseum: 100,
  insideMuseum: M3.hfov,
  museum1: 140,
  museum2: 100,
  museum3: 100,
  insideFrontGate: 100,
  insideFrontGate1: 100,
  middleGInside: 100,
  frontChurch: 100,
  rightFrontChurch: 100,
  leftFrontChurch: 100,
  rightFrontTombs: 100,
  rightFrontTombs1: 100,
  rightFrontTombs2: 100,
  leftFirstTombs: 100,
  leftTombs: 100,
  leftMiddleTombs: 100,
  leftEndTombs: 100,
  insideChurch: 100,
  insideChurch1: 100,
  underground1: 100,
  middleUnderground: 100,
  frontAltarUnderground: 100,
  underground2: 100,
  underground3: 100,
};

// Per-stop config: which 360 the stop opens on, its entry view, and the hash
// that restores the stop on refresh. The scroll-lean follows the stop's scene.
const STOP_CONF = {
  stop1: { scene: 'frontGate', pitch: FG.pitch, yaw: FG.yaw, hfov: FG.hfov, hash: '#stop-1' },
  stop2: { scene: 'middleGMuseum', pitch: M2.pitch, yaw: M2.yaw, hfov: M2.hfov, hash: '#stop-2' },
  stop3: { scene: 'insideMuseum', pitch: M3.pitch, yaw: M3.yaw, hfov: M3.hfov, hash: '#stop-3' },
  // The checkpoint plays over the deepest museum hall — the artifacts the
  // games ask about are on the walls all around.
  stop4: { scene: 'museum3', pitch: -12, yaw: 170, hfov: 100, hash: '#stop-4' },
  // The grounds: enter just inside the front gate and cross into the courtyard.
  stop5: { scene: 'insideFrontGate', pitch: 0, yaw: 0, hfov: 100, hash: '#stop-5' },
  // Front of the chapel + the tomb rows on either side.
  stop6: { scene: 'frontChurch', pitch: 0, yaw: -10, hfov: 100, hash: '#stop-6' },
  // Inside the chapel.
  stop7: { scene: 'insideChurch', pitch: 0, yaw: -24, hfov: 100, hash: '#stop-7' },
  // The underground crypts.
  stop8: { scene: 'underground1', pitch: 0, yaw: -20, hfov: 100, hash: '#stop-8' },
  // The final assessment plays over the same crypts as Stop 8.
  stop9: { scene: 'underground1', pitch: 0, yaw: -20, hfov: 100, hash: '#stop-9' },
  // Back at the front gate, where the trail began.
  stop10: { scene: 'frontGate', pitch: FG.pitch, yaw: FG.yaw, hfov: FG.hfov, hash: '#stop-10' },
};

// Departure views: before travelling to the next stop, the current 360 turns
// to face the way you'd walk — per scene, so it works from either viewpoint.
const DEPART_VIEWS = {
  frontGate: { yaw: -91.9, pitch: 0.6 },
  rightFrontGate: { yaw: -91.1, pitch: -0.8 },
  middleGMuseum: { yaw: -87.6, pitch: -5.7 },
  frontMuseum: { yaw: 32.0, pitch: -9.4 },
  // Stop 5 → 6: from the courtyard, turn to face the chapel before crossing.
  middleGInside: { yaw: 125, pitch: -5 },
  // Stop 7 → 8: from inside the chapel, turn to the stairs before descending.
  insideChurch: { yaw: 68, pitch: -29 },
};

const isImmersive = () => root.getAttribute('data-immersive') === 'true';

/* --- Immersive (Full View) toggle + zoom -------------------------------------
   Full View slides everything out AND unlocks zoom (wheel / buttons / pinch).
   Show Panels first eases the zoom back to the scene's default, then brings
   the panels, Ana and controls back in. ------------------------------------- */
const immersiveBtn = root.querySelector('[data-trail-immersive]');
root.setAttribute('data-immersive', 'false');
let restorePanelsTimer = 0;
immersiveBtn?.addEventListener('click', () => {
  const on = isImmersive();
  window.clearTimeout(restorePanelsTimer);
  if (!on) {
    root.setAttribute('data-immersive', 'true');
    immersiveBtn.setAttribute('aria-pressed', 'true');
    artApi.update?.(); // Full View → controls act on the artifact (museum stops)
    return;
  }
  immersiveBtn.setAttribute('aria-pressed', 'false');
  // Ease any zoom back to the scene default first, then restore the panels.
  let delay = 0;
  if (viewer) {
    try {
      const base = SCENE_HFOV[currentScene] || 100;
      if (Math.abs(viewer.getHfov() - base) > 1.5 && !prefersReducedMotion) {
        viewer.setHfov(base, 900);
        delay = 920;
      } else {
        viewer.setHfov(base, false);
      }
    } catch { /* viewer busy */ }
  }
  restorePanelsTimer = window.setTimeout(() => {
    root.setAttribute('data-immersive', 'false');
    artApi.update?.(); // panels back → controls act on Ana again
  }, delay);
});

function zoomBy(delta, ms = 220) {
  if (!viewer) return;
  try { viewer.setHfov(viewer.getHfov() + delta, prefersReducedMotion ? false : ms); }
  catch { /* viewer busy */ }
}
zoomInBtn?.addEventListener('click', () => zoomBy(-10));
zoomOutBtn?.addEventListener('click', () => zoomBy(10));

/* --- Stop entry / transitions ------------------------------------------------ */
function enterStop(stopId, opts) {
  transitioning = false;
  const conf = STOP_CONF[stopId];
  if (!conf || state.mode === stopId) return;
  if (stopId !== 'stop4') memoryApi.stopAudio?.();
  state.mode = stopId;
  root.setAttribute('data-mode', stopId);
  root.setAttribute('data-phase', 'guide'); // brings Ana + controls back in
  storyEls.forEach((el) => { el.hidden = el.getAttribute('data-trail-story') !== stopId; });
  activeStoryEl = storyEls.find((el) => !el.hidden) || null;
  // History: forward travel pushes a new entry (so the browser/phone Back
  // button walks back one stop at a time); refresh-restore replaces; Back /
  // Forward navigation ('none') leaves the stack alone, as popstate already
  // moved the pointer.
  const hist = (opts && opts.history) || 'push';
  try {
    if (hist === 'push') history.pushState({ trailStop: stopId }, '', conf.hash);
    else if (hist === 'replace') history.replaceState({ trailStop: stopId }, '', conf.hash);
  } catch { /* ignore */ }
  charApi.reenter?.();                       // Ana glides in from the side again
  window.setTimeout(() => charApi.playGesture?.('greet'), 1000);
  storyApis[stopId]?.reset();                // step 0 → Ana narrates the arrival
  artApi.update?.();                         // refresh which mode the controls are in
}

/* Back / Forward (popstate) travel between stops: switch the 360 + chapters
   directly, without writing history (the browser already moved the pointer). */
function jumpToStop(stopId) {
  const conf = STOP_CONF[stopId];
  if (!conf || state.mode === stopId) return;
  stopSpeaking();
  root.removeAttribute('data-phase'); // clear any half-finished depart
  if (viewer && currentScene !== conf.scene) {
    try { viewer.loadScene(conf.scene, conf.pitch, conf.yaw, conf.hfov); }
    catch { /* ignore */ }
  }
  enterStop(stopId, { history: 'none' });
}

/* Back past Stop 1 returns to the intro (Starting Point). From there the
   browser's Back leaves the page entirely, back to wherever we came from. */
function returnToIntro() {
  if (state.mode === 'intro') return;
  stopSpeaking();
  memoryApi.stopAudio?.();
  transitioning = false;
  if (viewer && currentScene !== 'aerial') {
    try { viewer.loadScene('aerial'); } catch { /* ignore */ }
  }
  state.mode = 'intro';
  state.scriptKey = 'intro';
  root.setAttribute('data-mode', 'intro');
  root.removeAttribute('data-phase');        // the intro panel slides back in
  storyEls.forEach((el) => { el.hidden = true; });
  activeStoryEl = null;
  charApi.reenter?.();
  narrate({ speakIt: false });               // reseed the intro bubble
}

/* Browser / phone Back + Forward: map the URL hash back to a stop (or the
   intro when the hash clears). */
window.addEventListener('popstate', () => {
  const num = (window.location.hash.match(/stop-(\d+)/) || [])[1];
  const target = num ? `stop${num}` : 'intro';
  if (target === state.mode) return;
  if (target === 'intro') returnToIntro();
  else if (STOP_CONF[target]) jumpToStop(target);
});

/* Stop → stop: the guide slides out, the current 360 turns to face the path
   ahead (its scene's departure view) and leans in as if walking, then the
   scene crossfades and everything slides back in with the new chapters. */
function transitionToStop(stopId) {
  const conf = STOP_CONF[stopId];
  if (!conf || state.mode === stopId || root.getAttribute('data-phase') === 'depart') return;
  stopSpeaking();
  if (stopId !== 'stop4') memoryApi.stopAudio?.();
  if (!viewer) { enterStop(stopId); return; }
  transitioning = true;
  root.setAttribute('data-phase', 'depart');
  const crossfade = () => {
    try {
      viewer.loadScene(conf.scene, conf.pitch, conf.yaw, conf.hfov);
      window.setTimeout(() => enterStop(stopId), prefersReducedMotion ? 120 : 1300);
    } catch (err) {
      console.warn('[Trail] Scene change failed:', err);
      enterStop(stopId);
    }
  };
  window.setTimeout(() => {
    const look = DEPART_VIEWS[currentScene];
    if (!look || prefersReducedMotion) { crossfade(); return; }
    // Turn toward where we're walking, easing slightly closer (hfov 85).
    try { viewer.lookAt(look.pitch, look.yaw, 85, 2000, crossfade); }
    catch { crossfade(); }
  }, prefersReducedMotion ? 0 : 650);
}

/* Intro → Stop 1: the aerial view swoops down onto the gate first. */
function beginTrail() {
  if (state.mode !== 'intro' || root.getAttribute('data-phase') === 'depart') return;
  stopSpeaking();
  // No panorama? The trail is self-contained now, so just open Stop 1's
  // story over the (failed) 360 rather than navigating away.
  if (!viewer) { enterStop('stop1', { history: 'push' }); return; }
  transitioning = true;
  root.setAttribute('data-phase', 'depart'); // slide panel/Ana/bubble/controls out
  const crossfade = () => {
    try {
      viewer.loadScene('frontGate', FG.pitch, FG.yaw, FG.hfov);
      window.setTimeout(() => enterStop('stop1'), prefersReducedMotion ? 120 : 1300);
    } catch (err) {
      console.warn('[Trail] Scene change failed:', err);
      enterStop('stop1');
    }
  };
  if (prefersReducedMotion) { crossfade(); return; }
  // Let the UI clear first, then swoop the aerial view down onto the gate.
  window.setTimeout(() => {
    try { viewer.lookAt(GATE.pitch, GATE.yaw, 112, 2300, crossfade); }
    catch { crossfade(); }
  }, 620);
}

/* --- Begin / Cancel ----------------------------------------------------------
   Begin now stays on this page (aerial pan → FrontGate crossfade → Stop 1).
   Cancel still returns home with the curtain. leaveTo() remains as the
   reduced-capability fallback (no WebGL / pannellum missing). --------------- */
function leaveTo(url, mode) {
  stopSpeaking();
  if (!url) return;
  if (prefersReducedMotion) { window.location.href = url; return; }
  if (mode === 'begin') {
    try { sessionStorage.setItem('trailArrival', '1'); } catch { /* ignore */ }
    root.classList.add('is-leaving');
    window.setTimeout(() => { window.location.href = url; }, 850);
  } else {
    curtain?.classList.remove('is-lifted');
    window.setTimeout(() => { window.location.href = url; }, 650);
  }
}
beginLink?.addEventListener('click', (e) => { e.preventDefault(); beginTrail(); });
cancelLink?.addEventListener('click', (e) => { e.preventDefault(); leaveTo(cancelLink.getAttribute('href'), 'cancel'); });

/* --- 360 panorama (Pannellum tour: aerial + FrontGate scenes) ---------------- */
function initPanorama() {
  const src = root.getAttribute('data-panorama') || '';
  if (!src || !window.pannellum || !panoEl) return;

  // Starting view: set data-yaw / data-pitch on #trailStart in the template.
  // Yaw is horizontal (-180..180), pitch is up/down. Drag around and check
  // the console — the current view is logged after every drag, so you can
  // pick a starting direction and copy its numbers into the attributes.
  const startYaw = parseFloat(root.getAttribute('data-yaw')) || 0;
  const startPitch = parseFloat(root.getAttribute('data-pitch')) || 0;

  // Ping-pong drift boundaries (intro only): the idle sweep pans right until
  // data-yaw-max, reverses and pans left until data-yaw-min, and repeats.
  const yawMaxAttr = parseFloat(root.getAttribute('data-yaw-max'));
  const yawMinAttr = parseFloat(root.getAttribute('data-yaw-min'));
  const yawMax = Number.isFinite(yawMaxAttr) ? yawMaxAttr : startYaw + 24;
  const yawMin = Number.isFinite(yawMinAttr) ? yawMinAttr : startYaw - (yawMax - startYaw);

  const gateSrc = root.getAttribute('data-pano-front-gate') || '';
  const rightGateSrc = root.getAttribute('data-pano-right-front-gate') || '';
  const h1ImageSrc = root.getAttribute('data-fg-h1-image') || '';
  const h1AudioSrc = root.getAttribute('data-fg-h1-audio') || '';
  const midMuseumSrc = root.getAttribute('data-pano-middle-museum') || '';
  const frontMuseumSrc = root.getAttribute('data-pano-front-museum') || '';
  const insideMuseumSrc = root.getAttribute('data-pano-inside-museum') || '';
  const museum1Src = root.getAttribute('data-pano-museum1') || '';
  const museum2Src = root.getAttribute('data-pano-museum2') || '';
  const museum3Src = root.getAttribute('data-pano-museum3') || '';
  // Stop 5 — cemetery-grounds panoramas (chapel front + tomb rows).
  const s5 = {
    insideFrontGate: root.getAttribute('data-pano-inside-front-gate') || '',
    insideFrontGate1: root.getAttribute('data-pano-inside-front-gate1') || '',
    middleGInside: root.getAttribute('data-pano-middle-g-inside') || '',
    frontChurch: root.getAttribute('data-pano-front-church') || '',
    rightFrontChurch: root.getAttribute('data-pano-right-front-church') || '',
    leftFrontChurch: root.getAttribute('data-pano-left-front-church') || '',
    rightFrontTombs: root.getAttribute('data-pano-right-front-tombs') || '',
    rightFrontTombs1: root.getAttribute('data-pano-right-front-tombs1') || '',
    rightFrontTombs2: root.getAttribute('data-pano-right-front-tombs2') || '',
    leftFirstTombs: root.getAttribute('data-pano-left-first-tombs') || '',
    leftTombs: root.getAttribute('data-pano-left-tombs') || '',
    leftMiddleTombs: root.getAttribute('data-pano-left-middle-tombs') || '',
    leftEndTombs: root.getAttribute('data-pano-left-end-tombs') || '',
  };
  // Stop 7 (chapel interior) + Stops 8/9 (underground crypts) panoramas.
  const s7 = {
    insideChurch: root.getAttribute('data-pano-inside-church') || '',
    insideChurch1: root.getAttribute('data-pano-inside-church1') || '',
    stairsChurch: root.getAttribute('data-pano-stairs-church') || '',
  };
  const s8 = {
    underground1: root.getAttribute('data-pano-underground1') || '',
    middleUnderground: root.getAttribute('data-pano-middle-underground') || '',
    frontAltarUnderground: root.getAttribute('data-pano-front-altar-underground') || '',
    underground2: root.getAttribute('data-pano-underground2') || '',
    underground3: root.getAttribute('data-pano-underground3') || '',
  };

  // Image-only information panels shared with the Virtual Tour. Framed panels
  // use only a thin outline when opened; the four table artifacts keep the
  // regular cream mount.
  const INFO_SUBTITLES = window.NHCP_ARTIFACT_SUBTITLES || {};
  const INFO = {
    inscription: {
      img: root.getAttribute('data-info-inscription-img') || '',
      title: { en: 'Inscription', tl: 'Inskripsiyon' },
      audioByLanguage: {
        tl: root.getAttribute('data-info-inscription-tl') || '',
        en: root.getAttribute('data-info-inscription-en') || '',
      },
      subtitle: INFO_SUBTITLES.inscription || null,
      outline: true,
    },
    map: {
      img: root.getAttribute('data-info-map-img') || '',
      title: { en: 'Map', tl: 'Mapa' },
      outline: true,
    },
    hulingTaludtod: {
      img: root.getAttribute('data-info-huling-taludtod-img') || '',
      title: { en: 'Final Stanza', tl: 'Huling Taludtod' },
      audioByLanguage: {
        tl: root.getAttribute('data-info-huling-taludtod-tl') || '',
        en: root.getAttribute('data-info-huling-taludtod-en') || '',
      },
      subtitle: INFO_SUBTITLES.hulingtaludtod || null,
      outline: true,
    },
    nagcarlanCemetery: {
      img: root.getAttribute('data-info-nagcarlan-cemetery-img') || '',
      title: {
        en: 'The Nagcarlan Underground Cemetery',
        tl: 'Ang Libingan sa Ilalim ng Lupa ng Nagcarlan',
      },
      audioByLanguage: {
        tl: root.getAttribute('data-info-nagcarlan-cemetery-tl') || '',
        en: root.getAttribute('data-info-nagcarlan-cemetery-en') || '',
      },
      subtitle: INFO_SUBTITLES.thenagcarlanundergroundcemetery || null,
      outline: true,
    },
    art1LeftTable: {
      img: root.getAttribute('data-info-art1-left-table-img') || '',
      title: { en: 'Art1-LeftTable', tl: 'Art1-LeftTable' },
    },
    art2LeftTable: {
      img: root.getAttribute('data-info-art2-left-table-img') || '',
      title: { en: 'Art2-LeftTable', tl: 'Art2-LeftTable' },
    },
    art1RightTable: {
      img: root.getAttribute('data-info-art1-right-table-img') || '',
      title: { en: 'Art1-RightTable', tl: 'Art1-RightTable' },
    },
    art2RightTable: {
      img: root.getAttribute('data-info-art2-right-table-img') || '',
      title: { en: 'Art2-RightTable', tl: 'Art2-RightTable' },
    },
    pagkasira: {
      img: root.getAttribute('data-info-pagkasira-img') || '',
      title: { en: 'Deterioration', tl: 'Pagkasira' },
      outline: true,
    },
    pransiskano: {
      img: root.getAttribute('data-info-pransiskano-img') || '',
      title: { en: 'Franciscans', tl: 'Mga Pransiskano' },
      outline: true,
    },
    pagsaayos: {
      img: root.getAttribute('data-info-pagsaayos-img') || '',
      title: { en: 'Restoration', tl: 'Pagsasaayos' },
      outline: true,
    },
    tela: {
      img: root.getAttribute('data-info-tela-img') || '',
      title: { en: 'Cloth', tl: 'Tela' },
      outline: true,
    },
    puntod: {
      img: root.getAttribute('data-info-puntod-img') || '',
      title: { en: 'Gravestone', tl: 'Puntod' },
      outline: true,
    },
    rebulusyonEspanya: {
      img: root.getAttribute('data-info-rebulusyon-espanya-img') || '',
      title: { en: 'Revolution Against Spain', tl: 'Rebolusyon Laban sa Espanya' },
      outline: true,
    },
    secondDigmaan: {
      img: root.getAttribute('data-info-second-digmaan-img') || '',
      title: { en: 'Second World War', tl: 'Ikalawang Digmaang Pandaigdig' },
      outline: true,
    },
    gerilya: {
      img: root.getAttribute('data-info-gerilya-img') || '',
      title: { en: 'Guerrillas', tl: 'Mga Gerilya' },
      outline: true,
    },
    estebanGuillermo: {
      img: root.getAttribute('data-info-esteban-guillermo-img') || '',
      title: { en: 'Rev. Fr. Esteban R. Guillermo', tl: 'Rev. Fr. Esteban R. Guillermo' },
      outline: true,
    },
  };

  // Artifact assets for the museum halls (image + EN/TL voice-over + optional
  // 3D model), copied off the virtual tour page via data attributes.
  const ART_KEYS = ['balanghay', 'kabaong', 'uloh', 'kabila', 'banga', 'jar', 'kagamitan', 'bagongon', 'bogwa', 'pagpag', 'pahimakas', 'alay', 'antuk', 'pagtubas', 'tsapang', 'tboli', 'sisiw', 'sabwag', 'tausug', 'luksa', 'mensahe', 'pahiwatig', 'recuerdos'];
  const ART = {};
  ART_KEYS.forEach((key) => {
    ART[key] = {
      img: root.getAttribute(`data-art-${key}-img`) || '',
      glb: root.getAttribute(`data-art-${key}-glb`) || '',
      tl: root.getAttribute(`data-art-${key}-tl`) || '',
      en: root.getAttribute(`data-art-${key}-en`) || '',
      march: root.getAttribute(`data-art-${key}-march`) || '', // Pahimakas: the funeral-march recording
    };
  });
  // Display titles (shown above the window's close button, and in the viewer).
  const ART_TITLES = {
    balanghay: { en: 'The Balanghay', tl: 'Ang Balanghay' },
    kabaong: { en: 'The Hanging Coffins of Sagada', tl: 'Ang mga Nakabiting Kabaong ng Sagada' },
    uloh: { en: 'Traditional Ulóh of Ifugao', tl: 'Tradisyunal na Ulóh ng mga Ifugao' },
    kabila: { en: 'The Afterlife of the Filipino', tl: 'Ang Kabilang Buhay ng mga Filipino' },
    banga: { en: 'The Manunggul Jar', tl: 'Ang Banga ng Manunggul' },
    jar: { en: 'The Maitum Jars', tl: 'Mga Banga ng Maitum' },
    kagamitan: { en: 'Belongings of the Dead in Batanes', tl: 'Mga Kagamitan ng mga Yumao sa Batanes' },
    bagongon: { en: 'Bagongon of the Ilocano', tl: 'Bagongon ng mga Ilokano' },
    bogwa: { en: 'Bogwa of the Ifugao', tl: 'Bogwa ng mga Ifugao' },
    pagpag: { en: 'The Custom of Pagpag', tl: 'Ang Pagpag' },
    pahimakas: { en: "Nakpil's Pahimakas", tl: 'Pahimakas ni Nakpil' },
    alay: { en: 'Alay, Atang, Halad', tl: 'Alay, Atang, Halad' },
    antuk: { en: 'Antuk and Ulahing of the Ata-Manobo', tl: 'Antuk at Ulahing ng mga Ata-Manobo' },
    pagtubas: { en: 'Pagtubas of the Waray', tl: 'Pagtubas ng mga Waray' },
    tsapang: { en: 'Black Mourning Pins', tl: 'Tsapang: Itim ng Pagluluksa' },
    tboli: { en: "The T'boli Soul", tl: "Ang Kaluluwa ng mga T'boli" },
    sisiw: { en: 'Hatchling of Conscience', tl: 'Sisiw ng Budhi' },
    sabwag: { en: 'Sabwag of the Bikolnon', tl: 'Sabwag ng mga Bikolnon' },
    tausug: { en: 'Tausug Burial Practices', tl: 'Kaugalian sa Paglilibing ng mga Tausug' },
    luksa: { en: 'The Mourners in Filipino-Chinese Burial', tl: 'Ang mga Taga-Luksa sa Burol ng mga Filipino-Tsino' },
    mensahe: { en: 'Condolences for President Aguinaldo', tl: 'Pakikiramay kay Pangulong Aguinaldo' },
    pahiwatig: { en: 'Omens of Death', tl: 'Mga Pahiwatig ng Kamatayan' },
    recuerdos: { en: 'Recuerdos de Patay', tl: 'Recuerdos de Patay' },
  };

  /* Full narration subtitles (Tagalog + English) — shown above the controls in
     Full View, where the controls drive the tapped artifact's audio. */
  const ART_SUBTITLES = {
    balanghay: {
      tl: 'Ang Balanghay ay isang sasakyang-pandagat na ginamit noon pang 320 A.D. na kumakatawan sa kakayahang pandagat at paniniwalang espiritwal ng mga sinaunang Pilipino. Higit pa sa papel nito sa kalakalan at pakikidigma, sinasagisag nito ang paglalakbay ng kaluluwa sa kabilang buhay, kabilang ang mga kilalang mandirigma at mandaragat na kadalasang inililibing sa loob o kasama ng kanilang mga bangka upang ipagpatuloy ang kanilang paglalakbay sa kabilang daigdig.',
      en: "The Balanghay, a seafaring vessel dating back to 320 A.D., exemplified the maritime skill and spiritual beliefs of pre-colonial Filipinos. It symbolized the soul's voyage to the afterlife, with notable warriors and seafarers often buried in or with their boats to continue their journey in the netherworld.",
    },
    kabaong: {
      tl: 'Ang mga Igorot ng Sagada, Mountain Province, ay sumusunod sa isang natatanging paglilibing na mahigit dalawang libong taong tradisyon, kung saan ang mga pumanaw ay inilalagay sa mga kabaong na gawa sa kahoy at isinasabit sa gilid ng mga bangin, kadalasan ay nasa posisyong mala-sanggol na sumasagisag sa pagbabalik sa lupa. Maraming matatanda ang umuukit pa nga ng kanilang sariling mga kabaong bilang paghahanda sa kamatayan.',
      en: 'The Igorots of Sagada, Mountain Province, follow a distinctive burial tradition dating back over two thousand years, where the deceased are placed in wooden coffins and hung on cliff edges, often in a fetal position to symbolize returning to the earth. Many elders even carve their own coffins in preparation for death.',
    },
    uloh: {
      tl: 'Ang Ulóh ay isang tradisyunal na tela ng Ifugao na gawa sa tatlong magkakaibang bahagi: adolna (gitna), balingbing (mga gilid), at talungtong (mga laylay), hinabi ng magkahiwalay at pinagsama-sama gamit ang natatanging pamamaraan, karaniwang kulay itim at pula. Ito ay gumaganap ng isang pangunahing papel sa ritwal ng kamatayan, ang bogwa, kung saan ang mga buto ng namatay ay hinuhukay, nililinis, at muling binabalot sa isang bagong Ulóh bilang paggalang at patuloy na pangangalaga, na may mga partikular na uri tulad ng kinuttiyan, inlhadang, pinagpagan, at gamong na ginagamit para sa paglilibing.',
      en: "The Ulóh is a traditional Ifugao textile made of three distinct parts: adolna (center), balingbing (sides), and talungtong (edges), woven separately and stitched together using a unique technique, typically in black and red. It plays a central role in the bogwa death ritual, where the deceased's bones are exhumed, cleansed, and rewrapped in a new Ulóh as a gesture of reverence and ongoing care, with specific types like kinuttiyan, inlha'dang, pinagpagan, and gamong used for funerary purposes.",
    },
    kabila: {
      tl: 'Ipinapakita ng likhang-sining na ito ang sinaunang paniniwala ng mga Pilipino hinggil sa paglalakbay ng kaluluwa tungo sa kabilang buhay sa pamamagitan ng bangka, kung saan ang mga kabaong na hugis-sasakyang pandagat ay sumasagisag sa pagtawid sa ilog tungo sa susunod na buhay. Ipinakikita rin nito ang mayamang ritwal sa paglilibing ng mga sinaunang Pilipino, na sinasabayan ng mga alay at awit, bilang pagpupugay at paggabay sa kaluluwa tungo sa walang hanggang kapahingahan.',
      en: 'This artwork portrays the ancient Filipino belief in the soul’s journey to the afterlife by boat, with vessel-shaped coffins symbolizing the passage along a river to the next life. It also captures the rich funerary rituals of early Filipinos, complete with offerings and chants, meant to honor and guide the soul toward eternal rest.',
    },
    banga: {
      tl: 'Ang Banga ng Manunggul, na ginamit noong Panahong Neolitiko ay natuklasan noong 1964 sa Palawan. Kinikilala ito bilang isang obra maestra ng sining seramiko ng mga sinaunang Pilipino. Ginamit para sa ikalawang paglibing. Ang takip nito na nagtatampok ng bangka na may dalawang hugis tao, ay sumasagisag sa paglalakbay tungo sa kabilang buhay, ayon sa paniniwala ng mga sinaunang Pilipino sa buhay matapos ang kamatayan.',
      en: "The Manunggul Jar, a Neolithic artifact discovered in 1964 in Palawan, is celebrated as a masterpiece of ancient Filipino ceramic art. Used for secondary burials, its lid featuring a boat with two human figures, symbolizes the journey to the afterlife, reflecting early Filipino's belief in life after death.",
    },
    jar: {
      tl: 'Ang mga Banga ng Maitum, na natuklasan sa Yungib ng Ayub sa Lalawigan ng Sarangani, ay mga hugis-taong sisidlang panlibing noong Panahong Metal (190 B.C. hanggang 500 A.D.). Ipinakikita ng mga ito ang kahanga-hangang kasanayan sa paggawa na sumasalamin sa mga naunang paniniwala ng mga taga-Mindanao hinggil sa kabilang buhay. Ang kanilang anyong tao at makahulugang disenyo ay nagpapahiwatig ng espiritwal na kahalagahan ng kamatayan at paglilibing sa mga sinaunang pamayanan.',
      en: 'The Maitum Jars, discovered in Ayub Cave, Sarangani Province are anthropomorphic earthenware burial vessels from the Metal Age (190 B.C. and 500 A.D.), showcasing exceptional craftsmanship and reflecting early Mindanaoan beliefs in the afterlife. Their human-like forms and symbolic design highlight the spiritual significance of death and burial among ancient communities.',
    },
    kagamitan: {
      tl: 'Kabilang sa mga sinaunang kaugalian sa paglilibing ng mga Ivatan ang paglalagay ng mga sagisag na gamit sa libingan tulad ng sagwan, kalang na obsidian, pana, at karne kasama ng yumao. Ipinapakita nito ang kanilang paraan ng pamumuhay, at layuning tulungan ang kaluluwa sa paglalakbay tungo sa kabilang buhay at bigyan ito ng kaligtasan sa masasamang espiritu.',
      en: 'Ancient Ivatan burial customs included placing symbolic grave goods such as paddles, obsidian wedges, arrowheads, and meat with the deceased to reflect their way of life, aid their journey to the afterlife, and offer protection from evil spirits.',
    },
    bagongon: {
      tl: 'Sa mga Ilokano, ang bagongon, o ang paghahanda sa katawan ng yumao bago ang burol, ay isinasagawa ng asawa ng namatay. Pinaniniwalaan na maaaring magpabatid ng mga huling mensahe ang kaluluwa ng yumao sa kanyang asawa, na siya lamang ang pinahihintulutang damitan ang bangkay.',
      en: 'In Ilocano tradition, the bagongon, or the preparation of the deceased’s body before the wake, is performed by the spouse of the departed. It is believed that the deceased may communicate final messages through the spouse, who is the only person permitted to dress the body.',
    },
    bogwa: {
      tl: 'Ang Bogwa ay isang ritwal ng mga Ifugao na kinapapalooban ng paghuhukay at paglilinis ng mga buto ng mahal sa buhay bilang pagpupugay sa yumao o paghingi ng kanilang basbas. Ang mga buto ay hinuhugasan at muling binabalot sa bagong kumot panlibing na tinatawag na ulóh.',
      en: "Bogwa, an Ifugao ritual involving the exhumation and cleansing of a loved one's bones, performed to honor the dead or seek their blessing. The bones are washed and rewrapped in a new burial blanket called ulóh.",
    },
    pagpag: {
      tl: 'Ang Pagpag ay isang kaugaliang Pilipino sa pagluluksa kung saan iniiwasan ng mga nakiramay na umuwi agad matapos ang lamay. Sa halip, dumaraan muna sila sa ibang lugar upang "ipagpag" o itaboy ang mga kaluluwang maaaring sumunod sa kanila, at maiwasang sumabay ang espiritu ng yumao sa kanila.',
      en: "Pagpag is a Filipino mourning custom where mourners avoid going straight home after a wake, instead stopping briefly elsewhere to shake off lingering spirits and prevent the deceased's soul from following them.",
    },
    pahimakas: {
      tl: 'Iisang marcha funebre ang "Pahimakas" ni Julio Nakpil (1867-1960) na nilikha niya bilang pagpupugay kay Dr. Jose Rizal matapos ang kamatayan nito noong 1896.',
      en: '"Pahimakas" by Julio Nakpil (1867-1960) is a funeral march composed as a tribute to Dr. Jose Rizal following his execution in 1896.',
    },
    alay: {
      tl: 'Ang pag-aalay ng pagkain sa mga yumao, na kilala bilang alay, atang, o halad, ay isang laganap na kaugaliang Pilipino na sumasagisag ng pag-aaruga at pag-alala sa mga yumao. Sa ibat ibang rehiyon, naglalaan ang mga pamilya ng pagkain upang tulungan ang kanilang mga mahal sa buhay sa paglalakbay patungo sa kabilang daigdig.',
      en: 'Offering food to the dead, known as alay, atang, or halad, is a widespread Filipino custom symbolizing care for the departed. Across regions, families set aside food to aid loved ones on their journey to the afterlife.',
    },
    antuk: {
      tl: 'Sa mga Ata-Manobo, ang balo ay humihiga sa tabi ng kaniyang yumaong asawa sa panahon ng lamay, habang nagkakatipon ang mga kamag-anak at kaibigan upang umawit, sumayaw, at tumugtog ng mga instrumento. Ang mga ritwal na ito ay isinasagawa upang mapawi ang dalamhati at maipahayag ang sama-samang pagdadalamhati ng pamayanan.',
      en: 'Among the Ata-Manobo, a widower lies beside his deceased wife during the wake as relatives and friends gather to sing, dance, and play music, rituals that ease sorrow and express shared grief.',
    },
    pagtubas: {
      tl: 'Sa Silangang Kabisayaan, ang pagtubas ay isang ritwal ng paglilinis kung saan winiwisikan ng tubig na hinaluan ng binabasang dahon ang silid bago ilabas ang labi ng yumao. Isinasagawa ito upang matiyak na hindi na babalik ang kaluluwa. Una munang lumalabas ang pamilya, kasunod ang kabaong na inilalabas nang pauna ang paa.',
      en: 'In Eastern Visayas, pagtubas is a cleansing ritual where a room is sprinkled with water infused with blessed leaves before removing the deceased, ensuring the spirit does not return. The family exits first, followed by the coffin carried feet-first.',
    },
    tsapang: {
      tl: 'Sa buong Pilipinas, ang mga nakikiramay ay nagsusuot ng maliit na itim na laso o pardible sa dibdib sa loob ng apatnapung araw bilang sagisag ng pagdadalamhati, paggalang, at matatag na ugnayang pampamilya na sumasalamin sa pagkakaisa ng mga Pilipino sa panahon ng pagluluksa.',
      en: 'Across the Philippines, mourners wear a small black ribbon or pin on the chest for forty days as a symbol of grief, respect, and the enduring familial bonds that reflect Filipino solidarity in mourning.',
    },
    tboli: {
      tl: "Sa mga T'boli, ang tao ay patay na kapag tuluyang nilisan ng kaluluwa ang katawan o kung ito ay kinuha ng isang masamang espiritu na tinatawag na busao. Ang bangkay ay inilalagay sa kabaong na hugis-bangka, at sa mahabang lamay, ang mga tumutulo mula sa kabaong ay ginagawang sawsawan ng nilagang kamote, na kinakain upang mapasalin sa mga nabubuhay ang mga mabuting katangian ng yumao.",
      en: "Among the T'boli, death is believed to occur when the soul permanently leaves the body or is taken by an evil spirit called busao. The deceased is placed in a boat-shaped coffin, and during the lengthy wake, the essence dripping from the coffin is used as a dip for sweet potatoes, which is eaten to inherit the virtues of the departed.",
    },
    sisiw: {
      tl: 'Kapag ang isang tao ay pinatay, isang sisiw ang inilalagay sa ibabaw ng kabaong at pinapakain ng mga butil. Inaasahan na ang tunog ng pagtuka nito ang gigising sa konsensiya ng pumatay at ipapaalaala ang kanyang kasalanan.',
      en: "When someone is murdered, a live chick is placed on the coffin and fed with grains, symbolically sending its pecking sounds to awaken the killer's conscience and remind them of their guilt.",
    },
    sabwag: {
      tl: 'Sa Bikol, matapos ang libing, ang mga nakiramay ay binubudburan ng abo na nakalagay sa bao ng niyog bilang ritwal ng paglilinis. Ito ay nagsisilbing paalala na ang tao ay magbabalik sa alabok.',
      en: 'In Bikol, mourners are sprinkled with ashes held in a coconut shell after burial, a cleansing ritual symbolizing purification and the reminder that humans return to ashes.',
    },
    tausug: {
      tl: 'Ang kaugalian ng mga Tausug sa paglilibing ay sumusunod sa apat na bahagi ayon sa Islam: paglinis, pagbalot, panalangin, at paglibing. Ang mga libingan ay nakahanay mula hilaga hanggang timog, at sa kanlurang bahagi ay may hukay na tinatawag na paliyangan kung saan iniluluklok ang katawan. Ito ay pinalilibutan ng kahoy na ding ding hali at may sunduk bilang pananda sa libingan.',
      en: 'The Tausug burial tradition follows four Islamic stages, washing, wrapping, prayer, and burial, with graves oriented north to south. A westward cavity called paliyangan houses the body, enclosed by a wooden ding ding hali and marked with a sunduk as a grave marker.',
    },
    luksa: {
      tl: 'Sa mga pamayanang Tsinoy, nangungupahan ng mga propesyonal na taga-luksa upang isagawa ang ritwal na pag-iyak habang nakasuot ng puting damit. Ang tradisyong ito ay nagmula pa sa Dinastiyang Han ng Tsina at nilalayong palalimin at ibahagi ang sama-samang pagdadalamhati.',
      en: "In Filipino-Chinese communities, professional mourners are hired to perform ritual wailing in white attire, a tradition dating back to China's Han Dynasty that aims to intensify and share the collective experience of grief.",
    },
    mensahe: {
      tl: 'Namatay si Heneral Emilio Aguinaldo, ang unang Pangulo ng Pilipinas, noong 6 Pebrero 1964, na nagdulot ng pandaigdigang pakikiramay at pambansang pagluluksa na idineklara ni Pangulong Macapagal bilang pagpupugay sa kanya. Ang mga sulat ng pagpupugay ay sumasalamin sa patuloy na paggalang sa kanyang pamana.',
      en: 'General Emilio Aguinaldo, the Philippines first president, died on 6 February 1964, prompting global condolences and a national mourning period declared by President Macapagal in his honor. The letters of tribute reflect the enduring respect for his legacy.',
    },
    pahiwatig: {
      tl: 'Sa buong Pilipinas, may mga paniniwala na ang ilang palatandaan tulad ng itim na paruparo, pag-ungol ng aso, o pagbagsak ng litrato ay pinaniniwalaang nagpapabatid ng kamatayan. Dahil dito, gumagawa ang mga tao ng mga hakbang upang maiwasan ang kamalasan.',
      en: 'Throughout the Philippines, certain signs like black butterflies, howling dogs, or falling photographs are believed to foretell death, prompting people to take precautions to prevent misfortune.',
    },
    recuerdos: {
      tl: 'Sa kulturang Pilipino, ang recuerdos de patay ay ang pagriritrato ng yumao at ng kanilang pamilya sa lamay bilang pagpapanatili sa alaala, kung saan ang yumao ay isinasalarawan na mapayapang nakahimlay.',
      en: 'In Filipino culture, recuerdos de patay is the practice of photographing the deceased and their family during wakes, preserving memories through images that depict the departed as peacefully at rest.',
    },
  };

  /* Floating image hotspot — ported from the virtual tour (front-gate-hotspot-h1):
     tapping the pulsing marker pins the photo on the wall at the same spot and
     plays its audio guide; tapping again (or ×) closes it and stops the audio. */
  let arNotice = null;
  let arNoticeTimer = 0;
  const managedArModels = new WeakSet();
  const arButtonIcon = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" d="M12 2.75 19 6.2v8.1L12 17.75 5 14.3V6.2L12 2.75Zm0 7.05L5.4 6.55M12 9.8l6.6-3.25M12 9.8v7.6"/><path stroke-linecap="round" d="M8.25 20.5h7.5"/></svg>';

  const ensureArNotice = () => {
    if (arNotice) return arNotice;

    arNotice = document.createElement('div');
    arNotice.className = 'trailx-ar-notice';
    arNotice.hidden = true;
    arNotice.setAttribute('role', 'alert');
    arNotice.setAttribute('aria-live', 'assertive');
    arNotice.setAttribute('aria-atomic', 'true');
    arNotice.innerHTML = `
      <span class="trailx-ar-notice__icon" aria-hidden="true">!</span>
      <span class="trailx-ar-notice__copy">
        <strong data-ar-notice-lang="en">AR is unavailable</strong>
        <strong data-ar-notice-lang="tl">Hindi suportado ang AR</strong>
        <span data-ar-notice-lang="en">This device or browser does not support Quick Look, WebXR, or Scene Viewer AR. You can still explore the 3D model here.</span>
        <span data-ar-notice-lang="tl">Hindi sinusuportahan ng device o browser na ito ang Quick Look, WebXR, o Scene Viewer AR. Maaari mo pa ring galugarin ang 3D model dito.</span>
      </span>
      <button class="trailx-ar-notice__close" type="button" aria-label="Close AR compatibility notice">&times;</button>`;
    arNotice.querySelector('.trailx-ar-notice__close')?.addEventListener('click', () => {
      window.clearTimeout(arNoticeTimer);
      arNotice.classList.remove('is-visible');
      arNotice.hidden = true;
    });
    root.appendChild(arNotice);
    return arNotice;
  };

  const showArCompatibilityNotice = () => {
    const notice = ensureArNotice();
    const language = state.lang === 'tl' ? 'tl' : 'en';
    notice.querySelectorAll('[data-ar-notice-lang]').forEach((node) => {
      node.hidden = node.dataset.arNoticeLang !== language;
    });
    window.clearTimeout(arNoticeTimer);
    notice.hidden = false;
    window.requestAnimationFrame(() => notice.classList.add('is-visible'));
    arNoticeTimer = window.setTimeout(() => {
      notice.classList.remove('is-visible');
      window.setTimeout(() => {
        if (!notice.classList.contains('is-visible')) arNotice.hidden = true;
      }, 220);
    }, 6000);
  };

  const installModelArControl = (model, container) => {
    if (!model || !container) return null;
    const existingButton = container.querySelector(':scope > .trailx-model-ar-button');
    if (existingButton) return existingButton;

    model.classList.add('trailx-model--managed-ar');
    const button = document.createElement('button');
    button.className = 'trailx-model-ar-button';
    button.type = 'button';
    button.setAttribute('aria-label', 'View artifact in your space / Tingnan ang artifact sa iyong paligid');
    button.setAttribute('title', 'View in your space / Tingnan sa iyong paligid');
    button.innerHTML = arButtonIcon;
    container.appendChild(button);

    if (!managedArModels.has(model)) {
      managedArModels.add(model);
      model.addEventListener('ar-status', (event) => {
        if (event.detail && event.detail.status === 'failed') showArCompatibilityNotice();
      });
    }

    button.addEventListener('click', async (event) => {
      event.preventDefault();
      event.stopPropagation();
      try {
        await window.customElements.whenDefined('model-viewer');
        if (!model.src || typeof model.activateAR !== 'function' || !model.canActivateAR) {
          showArCompatibilityNotice();
          return;
        }
        await model.activateAR();
      } catch (error) {
        console.warn('[Trail] Unable to launch artifact AR.', error);
        showArCompatibilityNotice();
      }
    });

    return button;
  };

  let floatingWindow = null; // { hotspotId, sceneId }
  let hotspotAudio = null;
  // Full View (Stop 3/4): the guide controls drive the tapped artifact's audio.
  let activeArtifact = null; // { audioByLanguage, subtitle } of the open marker
  let artMuted = false;
  const isMuseumStop = () => state.mode === 'stop3' || state.mode === 'stop4';
  const isArtMode = () => isImmersive() && isMuseumStop();
  const stopHotspotAudio = () => {
    if (!hotspotAudio) return;
    hotspotAudio.pause();
    hotspotAudio.currentTime = 0;
    hotspotAudio = null;
  };
  window.addEventListener('pagehide', stopHotspotAudio);
  const playHotspotAudio = (src) => {
    if (!src) return;
    stopHotspotAudio();
    hotspotAudio = new Audio(src);
    hotspotAudio.preload = 'auto';
    hotspotAudio.muted = artMuted;
    hotspotAudio.addEventListener('play', () => { if (isArtMode()) syncArtControls(); });
    hotspotAudio.addEventListener('pause', () => { if (isArtMode()) syncArtControls(); });
    hotspotAudio.addEventListener('ended', () => { if (isArtMode()) syncArtControls(); });
    const playing = hotspotAudio.play();
    if (playing && playing.catch) playing.catch((err) => console.warn('[Trail] Hotspot audio blocked:', err));
  };

  /* --- Full-View artifact controls -------------------------------------------
     In Full View on the museum stops, the Listen / mute / translation / CC
     buttons act on the artifact whose marker was tapped (its audio + subtitle),
     instead of Ana. The panel view keeps them on Ana (the guide character). */
  const artsubEl = root.querySelector('[data-trail-artsub]');
  const artsubTextEl = root.querySelector('[data-trail-artsub-text]');
  const artSrc = (lang) => {
    const a = activeArtifact && activeArtifact.audioByLanguage;
    if (!a) return '';
    return a[lang] || a.en || a.tl || '';
  };
  const renderArtSubtitle = () => {
    if (!artsubEl || !artsubTextEl) return;
    const sub = activeArtifact && activeArtifact.subtitle;
    const text = sub ? (state.lang === 'tl' ? sub.tl : sub.en) : '';
    artsubTextEl.textContent = text || '';
    const show = isArtMode() && state.subtitles && Boolean(text);
    artsubEl.classList.toggle('is-on', show);
    if (show) artsubEl.scrollTop = 0;
  };
  const syncArtControls = () => {
    const playing = Boolean(hotspotAudio && !hotspotAudio.paused && !hotspotAudio.ended);
    root.setAttribute('data-playing', String(playing));
    root.setAttribute('data-muted', String(artMuted));
    if (playBtn) {
      playBtn.setAttribute('aria-pressed', String(playing));
      playBtn.setAttribute('aria-label', playing ? 'Pause narration' : 'Play narration');
    }
    if (muteBtn) {
      muteBtn.setAttribute('aria-pressed', String(artMuted));
      muteBtn.setAttribute('aria-label', artMuted ? 'Unmute narration' : 'Mute narration');
    }
  };
  // Expose to the module-level control handlers (defined before initPanorama).
  artApi.isMode = isArtMode;
  artApi.renderSubtitle = renderArtSubtitle;
  artApi.toggleListen = () => {
    if (hotspotAudio && !hotspotAudio.paused) { hotspotAudio.pause(); syncArtControls(); return; }
    if (hotspotAudio) { const p = hotspotAudio.play(); if (p && p.catch) p.catch(() => {}); syncArtControls(); return; }
    const src = artSrc(state.lang);
    if (src) playHotspotAudio(src);
  };
  artApi.toggleMute = () => {
    artMuted = !artMuted;
    if (hotspotAudio) hotspotAudio.muted = artMuted;
    syncArtControls();
  };
  artApi.setLang = (lang) => {
    state.lang = lang;
    localStorage.setItem('anaGuideLang', lang);
    root.setAttribute('data-lang', lang);
    if (langBtn) langBtn.textContent = lang === 'tl' ? 'TL' : 'EN';
    renderArtSubtitle();
    const src = artSrc(lang);
    if (src) playHotspotAudio(src);
  };
  // Refresh which mode the controls are in (called on Full View toggle, stop
  // change, and marker open/close).
  artApi.update = () => {
    const on = isArtMode();
    root.setAttribute('data-artifact-controls', String(on));
    if (on) {
      syncArtControls();
      renderArtSubtitle();
    } else {
      if (artsubEl) artsubEl.classList.remove('is-on');
      root.setAttribute('data-playing', String(state.playing));
      root.setAttribute('data-muted', String(state.muted));
    }
  };
  /* Enlarged viewer (the landing lightbox pattern): the media big and clear,
     the title above a centered round close button. Works for the photo and,
     when the artifact has one, its 3D model. */
  let previewEl = null;
  let previewMedia = null;
  let previewTitle = null;
  const closePreview = () => {
    if (!previewEl) return;
    previewEl.classList.remove('is-open');
    previewEl.hidden = true;
    if (previewMedia) previewMedia.innerHTML = '';
  };
  const setTitleHtml = (el, title, fallback) => {
    if (!el) return;
    if (title && (title.en || title.tl)) {
      el.innerHTML = `<span data-lang-en>${title.en || title.tl}</span><span data-lang-tl>${title.tl || title.en}</span>`;
      el.hidden = false;
    } else if (fallback) {
      el.textContent = fallback;
      el.hidden = false;
    } else {
      el.hidden = true;
    }
  };
  // Block iOS Safari page pinch-zoom on the overlay backdrop / 3D area (works
  // with the CSS touch-action:none) so a stray pinch can't zoom the whole page.
  const blockOverlayPageZoom = (overlay) => {
    if (!overlay) return;
    ['gesturestart', 'gesturechange', 'gestureend'].forEach((t) => {
      overlay.addEventListener(t, (e) => e.preventDefault(), { passive: false });
    });
  };

  /* Contained pinch / wheel / drag zoom for the expanded photo — the picture
     zooms inside its frame, never the page or the 360 underneath. */
  const createPreviewImageZoom = (frame, img) => {
    const st = { scale: 1, tx: 0, ty: 0, pointers: new Map(), panning: false, pinch: 0 };
    const apply = () => {
      img.style.transformOrigin = '0 0';
      img.style.transform = `translate(${st.tx}px, ${st.ty}px) scale(${st.scale})`;
      frame.classList.toggle('is-zoomed', st.scale > 1.01);
    };
    const clamp = () => {
      const fw = frame.clientWidth;
      const fh = frame.clientHeight;
      const w = fw * st.scale;
      const h = fh * st.scale;
      st.tx = Math.min(0, Math.max(Math.min(0, fw - w), st.tx));
      st.ty = Math.min(0, Math.max(Math.min(0, fh - h), st.ty));
    };
    const zoomAt = (clientX, clientY, factor) => {
      const next = Math.min(5, Math.max(1, st.scale * factor));
      if (Math.abs(next - st.scale) < 0.0001) return;
      const r = frame.getBoundingClientRect();
      const px = clientX - r.left;
      const py = clientY - r.top;
      st.tx = px - (px - st.tx) * (next / st.scale);
      st.ty = py - (py - st.ty) * (next / st.scale);
      st.scale = next;
      clamp();
      apply();
    };
    frame.addEventListener('wheel', (e) => {
      e.preventDefault();
      zoomAt(e.clientX, e.clientY, e.deltaY < 0 ? 1.18 : 1 / 1.18);
    }, { passive: false });
    ['gesturestart', 'gesturechange', 'gestureend'].forEach((t) => {
      frame.addEventListener(t, (e) => e.preventDefault(), { passive: false });
    });
    frame.addEventListener('pointerdown', (e) => {
      st.pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (st.pointers.size === 2) {
        const p = Array.from(st.pointers.values());
        st.pinch = Math.hypot(p[0].x - p[1].x, p[0].y - p[1].y);
        st.panning = false;
      } else if (st.pointers.size === 1 && st.scale > 1.01) {
        st.panning = true;
        frame.classList.add('is-panning');
        try { frame.setPointerCapture(e.pointerId); } catch { /* ignore */ }
      }
    });
    frame.addEventListener('pointermove', (e) => {
      if (!st.pointers.has(e.pointerId)) return;
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
    const endPointer = (e) => {
      st.pointers.delete(e.pointerId);
      if (st.pointers.size < 2) st.pinch = 0;
      if (st.pointers.size === 0) {
        st.panning = false;
        frame.classList.remove('is-panning');
      }
    };
    ['pointerup', 'pointercancel', 'pointerleave'].forEach((t) => {
      frame.addEventListener(t, endPointer);
    });
    frame.addEventListener('dblclick', (e) => {
      e.preventDefault();
      st.scale = 1; st.tx = 0; st.ty = 0;
      apply();
    });
  };

  const ensurePreview = () => {
    if (previewEl) return;
    previewEl = document.createElement('div');
    previewEl.className = 'trailx-preview';
    previewEl.hidden = true;
    previewEl.setAttribute('role', 'dialog');
    previewEl.setAttribute('aria-modal', 'true');
    previewEl.setAttribute('aria-label', 'Artifact viewer');
    previewMedia = document.createElement('div');
    previewMedia.className = 'trailx-preview__media';
    previewTitle = document.createElement('p');
    previewTitle.className = 'trailx-preview__title';
    const closeBtn = document.createElement('button');
    closeBtn.className = 'trailx-xclose trailx-preview__close';
    closeBtn.type = 'button';
    closeBtn.setAttribute('aria-label', 'Close viewer');
    closeBtn.textContent = '✕';
    closeBtn.addEventListener('click', closePreview);
    previewEl.addEventListener('click', (event) => { if (event.target === previewEl) closePreview(); });
    previewEl.appendChild(previewMedia);
    previewEl.appendChild(previewTitle);
    previewEl.appendChild(closeBtn);
    root.appendChild(previewEl);
    blockOverlayPageZoom(previewEl);
  };
  const openPreview = (args, view) => {
    ensurePreview();
    previewMedia.innerHTML = '';
    if (view === 'model' && args.glbSrc) {
      const big = document.createElement('model-viewer');
      big.className = 'trailx-preview__model';
      big.setAttribute('camera-controls', '');
      big.setAttribute('touch-action', 'none');
      big.setAttribute('auto-rotate', '');
      big.setAttribute('shadow-intensity', '1');
      // Real-world AR: WebXR/Scene Viewer on Android, Quick Look on iPhone
      // (model-viewer converts the GLB to USDZ on the device).
      big.setAttribute('ar', '');
      big.setAttribute('ar-modes', 'webxr scene-viewer quick-look');
      big.setAttribute('alt', args.imageAlt || 'Artifact 3D model');
      big.src = args.glbSrc;
      previewMedia.appendChild(big);
      installModelArControl(big, previewMedia);
    } else {
      // Photo in a zoom frame: pinch/scroll/drag zooms the picture, never the page.
      const frame = document.createElement('div');
      frame.className = 'trailx-preview__frame';
      if (args.previewFrameStyle === 'outline') frame.classList.add('trailx-preview__frame--outline');
      const big = document.createElement('img');
      big.src = args.imageSrc;
      big.alt = args.imageAlt || 'Artifact image';
      frame.appendChild(big);
      previewMedia.appendChild(frame);
      createPreviewImageZoom(frame, big);
    }
    setTitleHtml(previewTitle, args.title, args.imageAlt || '');
    previewEl.hidden = false;
    window.requestAnimationFrame(() => previewEl.classList.add('is-open'));
  };
  window.addEventListener('keydown', (event) => { if (event.key === 'Escape') closePreview(); });

  const closeFloatingImage = () => {
    closePreview();
    if (floatingWindow && viewer) {
      try { viewer.removeHotSpot(floatingWindow.hotspotId, floatingWindow.sceneId); } catch { /* already gone */ }
    }
    floatingWindow = null;
    stopHotspotAudio();
    activeArtifact = null;        // Full View: no artifact → clear its subtitle/controls
    artApi.update?.();
    panoEl.querySelectorAll('.tour-floating-image-window-hotspot').forEach((node) => node.remove());
  };
  const renderFloatingImageHotspot = (hotSpotDiv, args) => {
    hotSpotDiv.classList.add('tour-floating-image-window-hotspot');
    const shell = document.createElement('div');
    shell.className = 'tour-floating-image-window-shell trailx-art';
    let showingModel = false;
    let model = null;
    let arButton = null;

    const mediaWrap = document.createElement('div');
    mediaWrap.className = 'trailx-art__mediawrap';

    // The photo: tap it for the enlarged, clear view.
    const zoomBtn = document.createElement('button');
    zoomBtn.className = 'trailx-art__zoom';
    zoomBtn.type = 'button';
    zoomBtn.setAttribute('aria-label', 'Open a larger view');
    const image = document.createElement('img');
    image.className = 'tour-floating-image-window';
    image.src = args.imageSrc;
    image.alt = args.imageAlt || 'Hotspot image';
    image.draggable = false;
    zoomBtn.appendChild(image);
    zoomBtn.addEventListener('click', (event) => {
      event.preventDefault();
      event.stopPropagation();
      openPreview(args, 'image');
    });
    mediaWrap.appendChild(zoomBtn);

    // Image ↔ 3D switch — lower middle of the media, like the virtual tour's
    // floating window switch. The model loads lazily on the first switch.
    if (args.glbSrc) {
      const switchBtn = document.createElement('button');
      switchBtn.className = 'trailx-art__icon trailx-art__switch';
      switchBtn.type = 'button';
      switchBtn.setAttribute('aria-label', 'Switch between image and 3D model');
      switchBtn.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" d="M12 2.5 19.5 6v12L12 21.5 4.5 18V6L12 2.5Zm0 6.9L5 6.2m7 3.2 7-3.2m-7 3.2V21"/></svg>';
      switchBtn.addEventListener('click', (event) => {
        event.preventDefault();
        event.stopPropagation();
        showingModel = !showingModel;
        if (showingModel && !model) {
          model = document.createElement('model-viewer');
          model.className = 'trailx-art__model';
          model.setAttribute('camera-controls', '');
          model.setAttribute('touch-action', 'pan-y');
          model.setAttribute('auto-rotate', '');
          model.setAttribute('shadow-intensity', '1');
          model.setAttribute('ar', '');
          model.setAttribute('ar-modes', 'webxr scene-viewer quick-look');
          model.setAttribute('alt', args.imageAlt || 'Artifact 3D model');
          model.src = args.glbSrc;
          // Tap the model → expanded 3D view (like the virtual tour). A drag
          // or pinch still rotates/zooms in place — only a clean tap expands.
          let downX = 0;
          let downY = 0;
          let downAt = 0;
          let multiTouch = false;
          let activePointers = 0;
          model.addEventListener('pointerdown', (ev) => {
            activePointers += 1;
            if (activePointers > 1) multiTouch = true;
            downX = ev.clientX;
            downY = ev.clientY;
            downAt = performance.now();
          });
          model.addEventListener('pointerup', (ev) => {
            activePointers = Math.max(0, activePointers - 1);
            if (activePointers > 0) return;
            const moved = Math.hypot(ev.clientX - downX, ev.clientY - downY);
            const quick = performance.now() - downAt < 500;
            if (!multiTouch && moved < 7 && quick) openPreview(args, 'model');
            multiTouch = false;
          });
          mediaWrap.insertBefore(model, switchBtn);
          arButton = installModelArControl(model, mediaWrap);
        }
        zoomBtn.hidden = showingModel;
        if (model) model.hidden = !showingModel;
        if (arButton) arButton.hidden = !showingModel;
        switchBtn.setAttribute('aria-pressed', String(showingModel));
      });
      mediaWrap.appendChild(switchBtn);
    }

    // Pahimakas: a button to play the funeral-march recording (the "song"),
    // just like the virtual tour's floating window. It sits at the media's
    // lower edge, to the left of the 3D switch (or centered if there's none).
    if (args.marchAudioSrc) {
      const songBtn = document.createElement('button');
      songBtn.className = 'trailx-art__icon trailx-art__song';
      if (!args.glbSrc) songBtn.classList.add('trailx-art__song--solo');
      songBtn.type = 'button';
      songBtn.setAttribute('aria-label', 'Play the funeral-march recording');
      songBtn.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15.5 3.75a.75.75 0 0 1 .75.75v10.84a3.5 3.5 0 1 1-1.5-2.88V8.91l-5.96 1.48a.75.75 0 0 1-.93-.73V5.93c0-.34.23-.64.56-.73l6.9-1.72a.76.76 0 0 1 .18-.03ZM8.75 6.52v2.18l6-1.49V5.02l-6 1.5Zm4.25 10.23a2 2 0 1 0-4 0 2 2 0 0 0 4 0Z" fill="currentColor"></path></svg>';
      songBtn.addEventListener('click', (event) => {
        event.preventDefault();
        event.stopPropagation();
        pauseSpeaking();
        playHotspotAudio(args.marchAudioSrc);
      });
      mediaWrap.appendChild(songBtn);
    }

    // Title above the close button (landing lightbox pattern).
    const title = document.createElement('p');
    title.className = 'trailx-art__title';
    setTitleHtml(title, args.title, '');

    // Close: middle-bottom, breathing room above (like the landing lightbox).
    const closeButton = document.createElement('button');
    closeButton.className = 'trailx-xclose trailx-art__close';
    closeButton.type = 'button';
    closeButton.setAttribute('aria-label', 'Close artifact');
    closeButton.textContent = '✕';
    closeButton.addEventListener('click', (event) => {
      event.preventDefault();
      event.stopPropagation();
      closeFloatingImage();
    });

    shell.appendChild(mediaWrap);
    shell.appendChild(title);
    shell.appendChild(closeButton);
    hotSpotDiv.appendChild(shell);
  };
  const openFloatingImage = (event, args) => {
    if (event && typeof event.preventDefault === 'function') event.preventDefault();
    if (!args || !args.imageSrc || !viewer) return;
    if (floatingWindow && floatingWindow.hotspotId === args.windowHotspotId) {
      closeFloatingImage(); // same marker tapped again → toggle closed
      return;
    }
    closeFloatingImage();
    const hasMarkerNarration = Boolean(
      args.audioSrc || args.subtitle || args.marchAudioSrc ||
      (args.audioByLanguage && (args.audioByLanguage.tl || args.audioByLanguage.en))
    );
    if (hasMarkerNarration) pauseSpeaking(); // image-only panels do not interrupt Ana
    const spot = {
      id: args.windowHotspotId,
      pitch: args.windowPitch,
      yaw: args.windowYaw,
      type: 'info',
      text: '',
      cssClass: 'tour-floating-image-window-hotspot',
      createTooltipFunc: renderFloatingImageHotspot,
      createTooltipArgs: args,
    };
    try {
      viewer.addHotSpot(spot, currentScene);
      floatingWindow = { hotspotId: args.windowHotspotId, sceneId: currentScene };
      // Full View: this artifact's audio + subtitle now drive the controls.
      activeArtifact = (args.audioByLanguage || args.subtitle)
        ? { audioByLanguage: args.audioByLanguage || null, subtitle: args.subtitle || null }
        : null;
      // Voice-over: a fixed clip, or the guide language's clip when bilingual.
      const vo = args.audioSrc || (args.audioByLanguage
        ? (args.audioByLanguage[state.lang] || args.audioByLanguage.en || args.audioByLanguage.tl)
        : '');
      playHotspotAudio(vo);
      artApi.update?.();
    } catch (err) {
      console.warn('[Trail] Unable to open hotspot image:', err);
    }
  };

  const build = (aerialSrc) => {
    try {
      const scenes = {
        aerial: {
          type: 'equirectangular',
          panorama: aerialSrc,
          pitch: startPitch,
          yaw: startYaw,
          hfov: 100,
        },
      };
      if (gateSrc) {
        scenes.frontGate = {
          type: 'equirectangular',
          panorama: gateSrc,
          pitch: FG.pitch,
          yaw: FG.yaw,
          hfov: FG.hfov,
          hotSpots: [
            // Same ground hotspot as the heritage page: step to the right-side view.
            ...(rightGateSrc ? [{
              pitch: -10,
              yaw: 90,
              type: 'scene',
              sceneId: 'rightFrontGate',
              targetPitch: -20,
              targetYaw: 90,
              targetHfov: 100,
              cssClass: 'tour-ground-hotspot',
            }] : []),
            // Wall-photo hotspot copied from the virtual tour (H1 + audio guide).
            ...(h1ImageSrc ? [{
              id: 'front-gate-hotspot-h1',
              pitch: 1.06,
              yaw: 24.41,
              type: 'info',
              text: '',
              clickHandlerFunc: openFloatingImage,
              clickHandlerArgs: {
                sourceHotspotId: 'front-gate-hotspot-h1',
                windowHotspotId: 'front-gate-hotspot-h1-window',
                imageSrc: h1ImageSrc,
                audioSrc: h1AudioSrc,
                title: { en: 'The Front Gate', tl: 'Ang Tarangkahan' },
                imageAlt: 'Front Gate hotspot image',
                windowPitch: 1.06,
                windowYaw: 24.41,
              },
              cssClass: 'tour-ground-hotspot tour-ground-hotspot--pulse tour-ground-hotspot--compact tour-ground-hotspot--no-icon',
            }] : []),
          ],
        };
      }
      if (gateSrc && rightGateSrc) {
        scenes.rightFrontGate = {
          type: 'equirectangular',
          panorama: rightGateSrc,
          pitch: -20,
          yaw: 90,
          hfov: 100,
          hotSpots: [{
            pitch: -11,
            yaw: -89,
            type: 'scene',
            sceneId: 'frontGate',
            targetPitch: -20,
            targetYaw: -90,
            targetHfov: 100,
            cssClass: 'tour-ground-hotspot',
          }],
        };
      }
      // Stop 2 scenes — museum approach ↔ museum front, same hotspots as the
      // heritage page's Stop 2 panorama.
      if (midMuseumSrc) {
        scenes.middleGMuseum = {
          type: 'equirectangular',
          panorama: midMuseumSrc,
          pitch: M2.pitch,
          yaw: M2.yaw,
          hfov: M2.hfov,
          hotSpots: [
            ...(frontMuseumSrc ? [{
              pitch: -25,
              yaw: -100,
              type: 'scene',
              sceneId: 'frontMuseum',
              cssClass: 'tour-ground-hotspot',
            }] : []),
          ],
        };
      }
      if (midMuseumSrc && frontMuseumSrc) {
        scenes.frontMuseum = {
          type: 'equirectangular',
          panorama: frontMuseumSrc,
          pitch: 0,
          yaw: 0,
          hfov: 100,
          hotSpots: [{
            pitch: -30,
            yaw: 173,
            type: 'scene',
            sceneId: 'middleGMuseum',
            targetPitch: -20,
            targetYaw: 90,
            targetHfov: 100,
            cssClass: 'tour-ground-hotspot',
          }],
        };
      }

      // Stop 3 scenes — the museum halls, straight from the virtual tour:
      // same viewpoints, same walk rings, same artifact markers (photo pins
      // to the wall + voice-over in the guide's language). insideMuseum has
      // deliberately NO exit ring back outside — the trail owns that journey.
      const artSpot = (id, pitch, yaw, key, alt) => {
        const asset = ART[key];
        if (!asset || !asset.img) return null;
        return {
          id,
          pitch,
          yaw,
          type: 'info',
          text: '',
          clickHandlerFunc: openFloatingImage,
          clickHandlerArgs: {
            sourceHotspotId: id,
            windowHotspotId: `${id}-window`,
            imageSrc: asset.img,
            glbSrc: asset.glb,
            title: ART_TITLES[key],
            subtitle: ART_SUBTITLES[key], // Full View narration text (TL/EN)
            audioByLanguage: { tl: asset.tl, en: asset.en },
            marchAudioSrc: asset.march, // Pahimakas: the funeral-march song button
            imageAlt: alt,
            windowPitch: pitch,
            windowYaw: yaw,
          },
          cssClass: 'tour-ground-hotspot tour-ground-hotspot--pulse tour-ground-hotspot--compact tour-ground-hotspot--no-icon',
        };
      };
      const infoSpot = (id, pitch, yaw, key, alt) => {
        const asset = INFO[key];
        if (!asset || !asset.img) return null;
        return {
          id,
          pitch,
          yaw,
          type: 'info',
          text: '',
          clickHandlerFunc: openFloatingImage,
          clickHandlerArgs: {
            sourceHotspotId: id,
            windowHotspotId: `${id}-window`,
            imageSrc: asset.img,
            title: asset.title,
            subtitle: asset.subtitle || null,
            audioByLanguage: asset.audioByLanguage || null,
            imageAlt: alt,
            previewFrameStyle: asset.outline ? 'outline' : '',
            windowPitch: pitch,
            windowYaw: yaw,
          },
          cssClass: 'tour-ground-hotspot tour-ground-hotspot--pulse tour-ground-hotspot--compact tour-ground-hotspot--no-icon',
        };
      };
      const spots = (list) => list.filter(Boolean);
      if (insideMuseumSrc && museum1Src) {
        scenes.insideMuseum = {
          type: 'equirectangular',
          panorama: insideMuseumSrc,
          pitch: M3.pitch,
          yaw: M3.yaw,
          hfov: M3.hfov,
          hotSpots: spots([
            infoSpot('inside-museum-nagcarlan-cemetery', -40.54, -44.97, 'nagcarlanCemetery', 'The Nagcarlan Underground Cemetery'),
            infoSpot('inside-museum-huling-taludtod', -26.23, -108.89, 'hulingTaludtod', 'Huling Taludtod'),
            {
              pitch: -50,
              yaw: 40,
              type: 'scene',
              sceneId: 'museum1',
              cssClass: 'tour-ground-hotspot',
            },
          ]),
        };
        scenes.museum1 = {
          type: 'equirectangular',
          panorama: museum1Src,
          pitch: -20,
          yaw: 75,
          hfov: 140,
          hotSpots: spots([
            artSpot('museum1-balanghay', -20.31, 101.6, 'balanghay', 'Balanghay'),
            artSpot('museum1-kabaong', -18.35, 26.68, 'kabaong', 'Kabaong'),
            artSpot('museum1-uloh', -17.35, -128.78, 'uloh', 'Ulóh'),
            ...(museum2Src ? [{ pitch: -30, yaw: -100, type: 'scene', sceneId: 'museum2', cssClass: 'tour-ground-hotspot' }] : []),
            { pitch: -45, yaw: 180, type: 'scene', sceneId: 'insideMuseum', targetPitch: -20, targetYaw: 180, targetHfov: 140, cssClass: 'tour-ground-hotspot' },
          ]),
        };
      }
      if (museum2Src && museum1Src) {
        scenes.museum2 = {
          type: 'equirectangular',
          panorama: museum2Src,
          pitch: -20,
          yaw: 80,
          hfov: 100,
          hotSpots: spots([
            artSpot('museum2-kabila', -20.36, 47.56, 'kabila', 'Kabila'),
            artSpot('museum2-banga', -17.11, 169.7, 'banga', 'Banga'),
            artSpot('museum2-jar', -29.35, 169.12, 'jar', 'Jar'),
            ...(museum3Src ? [{ pitch: -23, yaw: 83, type: 'scene', sceneId: 'museum3', cssClass: 'tour-ground-hotspot' }] : []),
            { pitch: -30, yaw: -110, type: 'scene', sceneId: 'museum1', targetPitch: -20, targetYaw: 180, targetHfov: 140, cssClass: 'tour-ground-hotspot' },
          ]),
        };
      }
      if (museum3Src && museum2Src) {
        scenes.museum3 = {
          type: 'equirectangular',
          panorama: museum3Src,
          pitch: -12,
          yaw: 170,
          hfov: 100,
          hotSpots: spots([
            infoSpot('museum3-inscription', -10.62, 26.8, 'inscription', 'Inscription'),
            infoSpot('museum3-map', -17.76, -72.4, 'map', 'Map'),
            artSpot('museum3-kagamitan', -20.3, -92.86, 'kagamitan', 'Kagamitan'),
            artSpot('museum3-bagongon', -12.37, -116.55, 'bagongon', 'Bagongon'),
            artSpot('museum3-bogwa', -26.32, -122.8, 'bogwa', 'Bogwa'),
            artSpot('museum3-pagpag', -12.59, -139.64, 'pagpag', 'Pagpag'),
            artSpot('museum3-pahimakas', -24.85, -133.85, 'pahimakas', 'Pahimakas'),
            artSpot('museum3-alay', -15.1, -165.57, 'alay', 'Alay'),
            artSpot('museum3-antuk', -25.93, -177.89, 'antuk', 'Antuk'),
            artSpot('museum3-pagtubas', -25.72, 168.51, 'pagtubas', 'Pagtubas'),
            artSpot('museum3-tsapang', -18.18, 147.99, 'tsapang', 'Tsapang'),
            artSpot('museum3-tboli', -7.75, 154.08, 'tboli', "T'boli"),
            artSpot('museum3-sisiw', -7.99, 143.31, 'sisiw', 'Sisiw'),
            artSpot('museum3-sabwag', -16.01, 137.14, 'sabwag', 'Sabwag'),
            artSpot('museum3-tausug', -23.6, 140.94, 'tausug', 'Tausug'),
            artSpot('museum3-luksa', -14.26, 116.98, 'luksa', 'Luksa'),
            artSpot('museum3-mensahe', -14.29, 108.16, 'mensahe', 'Mensahe'),
            artSpot('museum3-pahiwatig', -28.09, 104.25, 'pahiwatig', 'Pahiwatig'),
            artSpot('museum3-recuerdos', -22.93, 78.03, 'recuerdos', 'Recuerdos'),
            { pitch: -30, yaw: -10, type: 'scene', sceneId: 'museum2', targetPitch: -20, targetYaw: -100, targetHfov: 100, cssClass: 'tour-ground-hotspot' },
          ]),
        };
      }

      // Stop 5 scenes — the cemetery grounds, chapel front, and tomb rows,
      // straight from the virtual tour. Scene links keep only the paths that
      // stay within this stop's set (the branches into the museum, the chapel
      // interior, and the leftG middle nodes are dropped).
      if (s5.insideFrontGate) {
        const link = (pitch, yaw, sceneId, tPitch, tYaw) => {
          const h = { pitch, yaw, type: 'scene', sceneId, cssClass: 'tour-ground-hotspot' };
          if (tPitch !== undefined) { h.targetPitch = tPitch; h.targetYaw = tYaw; h.targetHfov = 100; }
          return h;
        };
        const eq = (panorama, pitch, yaw, hotSpots) => ({ type: 'equirectangular', panorama, pitch, yaw, hfov: 100, hotSpots });
        scenes.insideFrontGate = eq(s5.insideFrontGate, 0, 0, [
          link(-18, 2, 'insideFrontGate1'),
        ]);
        scenes.insideFrontGate1 = eq(s5.insideFrontGate1, 0, 0, [
          link(-5, -4, 'middleGInside'),
          link(-15, 175, 'insideFrontGate', -20, 170),
        ]);
        // Stop 5 ends here (entrance + courtyard): middleGInside does NOT lead
        // on to the chapel — that's Stop 6's journey.
        scenes.middleGInside = eq(s5.middleGInside, 0, 123, [
          link(-7, -55, 'insideFrontGate1', -20, 180),
        ]);
        // Stop 6 begins at the chapel front: no ring back to the courtyard.
        scenes.frontChurch = eq(s5.frontChurch, 0, -10, [
          link(-20, -75, 'leftFrontChurch', -20, -80),
          link(-17, 48, 'rightFrontChurch'),
        ]);
        scenes.leftFrontChurch = eq(s5.leftFrontChurch, 0, 0, [
          link(-21.26, -80.65, 'leftFirstTombs', -1.82, 82.26),
          link(-25, 66, 'frontChurch', -20, 55),
        ]);
        scenes.leftFirstTombs = eq(s5.leftFirstTombs, 0, 0, [
          link(-14.72, 82.97, 'leftTombs', 0.56, 46.68),
          link(-25.55, -25.99, 'leftFrontChurch', -1.46, 70.52),
        ]);
        scenes.leftTombs = eq(s5.leftTombs, 0, 0, [
          link(-20.76, -89.75, 'leftFirstTombs'),
          link(-7.73, 48.09, 'leftMiddleTombs', -1.02, 74.28),
        ]);
        scenes.leftMiddleTombs = eq(s5.leftMiddleTombs, 0, 0, [
          link(-11.02, -105.65, 'leftTombs', -4.95, -89.26),
          link(-8.41, 74.15, 'leftEndTombs', 0.74, 37.45),
        ]);
        scenes.leftEndTombs = eq(s5.leftEndTombs, 0, 0, [
          link(-11.06, -99.54, 'leftMiddleTombs', -7.35, -106.9),
        ]);
        scenes.rightFrontChurch = eq(s5.rightFrontChurch, 0, 0, [
          link(-17, -133, 'frontChurch', -20, -140),
          link(-22, 27, 'rightFrontTombs', -6.57, -83.58),
        ]);
        scenes.rightFrontTombs = eq(s5.rightFrontTombs, 0, 0, [
          link(-9, -67, 'rightFrontTombs1', -6.57, -83.58),
          link(-14, 30, 'rightFrontChurch', -12, 180),
        ]);
        scenes.rightFrontTombs1 = eq(s5.rightFrontTombs1, 0, -110, [
          link(-11.27, -99.92, 'rightFrontTombs2', -1.11, -53.2),
          link(-5, 77, 'rightFrontTombs', 0.59, 34.92),
        ]);
        scenes.rightFrontTombs2 = eq(s5.rightFrontTombs2, 0, 0, [
          link(-7.06, 86.13, 'rightFrontTombs1', 3.34, 80.68),
        ]);

        // Stop 7 — inside the chapel (nave ↔ deeper toward the altar).
        if (s7.insideChurch) {
          scenes.insideChurch = eq(s7.insideChurch, 0, -24, spots([
            infoSpot('inside-chapel-art1-left-table', -26.98, -95.71, 'art1LeftTable', 'Art1-LeftTable'),
            infoSpot('inside-chapel-art2-left-table', -39.25, -82.8, 'art2LeftTable', 'Art2-LeftTable'),
            infoSpot('inside-chapel-art1-right-table', -36.02, 36.94, 'art1RightTable', 'Art1-RightTable'),
            infoSpot('inside-chapel-art2-right-table', -24.26, 46.29, 'art2RightTable', 'Art2-RightTable'),
            infoSpot('inside-chapel-pagkasira', -16.07, -118.57, 'pagkasira', 'Pagkasira'),
            infoSpot('inside-chapel-pransiskano', -18.22, -135.02, 'pransiskano', 'Pransiskano'),
            infoSpot('inside-chapel-pagsaayos', -18.35, 91.92, 'pagsaayos', 'Pagsaayos'),
            ...(s7.stairsChurch ? [link(-29, 68, 'stairsChurch')] : []),
            link(-23, -24, 'insideChurch1'),
          ]));
          scenes.insideChurch1 = eq(s7.insideChurch1, 0, 160, [
            link(-24, -20, 'insideChurch', -20, 160),
          ]);
          if (s7.stairsChurch) {
            scenes.stairsChurch = eq(s7.stairsChurch, 0, 0, spots([
              infoSpot('stairs-church-inscription', 13.3, -21.33, 'inscription', 'Inscription'),
              link(2, -50, 'insideChurch'),
            ]));
          }
        }
        // Stops 8 & 9 — the underground crypts (virtual-tour walk, self-contained).
        if (s8.underground1) {
          scenes.underground1 = eq(s8.underground1, 0, -20, spots([
            infoSpot('underground1-tela', -35.47, -122.69, 'tela', 'Tela'),
            infoSpot('underground1-puntod', -28.9, 94.27, 'puntod', 'Puntod'),
            link(-36, -17, 'middleUnderground', 0, 60),
          ]));
          scenes.middleUnderground = eq(s8.middleUnderground, 0, -110, [
            link(-33, -22, 'frontAltarUnderground', -5, 180),
            link(-27, 67, 'underground2'),
            link(-22, 158, 'underground3'),
            link(-30, 248, 'underground1', 0, 170),
          ]);
          scenes.frontAltarUnderground = eq(s8.frontAltarUnderground, 0, 0, spots([
            infoSpot('front-altar-esteban-guillermo', -21.3, 80.79, 'estebanGuillermo', 'Rev. Fr. Esteban R. Guillermo'),
            link(-45, -9, 'middleUnderground', 0, -200),
          ]));
          scenes.underground2 = eq(s8.underground2, 0, -14, spots([
            infoSpot('underground2-rebulusyon-espanya', -31.31, 80.39, 'rebulusyonEspanya', 'RebulusyonEspanya'),
            infoSpot('underground2-second-digmaan', -39.85, 164.48, 'secondDigmaan', '2ndDigmaan'),
            infoSpot('underground2-gerilya', -27.43, -110.17, 'gerilya', 'Gerilya'),
            link(-35, -17, 'middleUnderground'),
          ]));
          scenes.underground3 = eq(s8.underground3, 0, 0, [
            link(-20, -5, 'middleUnderground', 0, -20),
          ]);
        }
      }

      // Refresh restore: open directly on the remembered stop's scene.
      const startConf = wantsStop ? STOP_CONF[wantsStop] : null;
      const startScene = startConf && scenes[startConf.scene] ? startConf.scene : 'aerial';
      currentScene = startScene;
      viewer = window.pannellum.viewer('trailPano', {
        default: {
          firstScene: startScene,
          sceneFadeDuration: prefersReducedMotion ? 0 : 1500,
          autoLoad: true,
          showControls: false,
          showZoomCtrl: false,
          showFullscreenCtrl: false,
          keyboardZoom: false,
          mouseZoom: true, // native Pannellum zoom, same feel as the Virtual Tour
          draggable: true,
          compass: false,
          autoRotate: 0, // replaced by the drift loop below
          minHfov: 50,
          maxHfov: 140,
        },
        scenes,
      });

      viewer.on('scenechange', (id) => {
        currentScene = id;
        closeFloatingImage(); // leaving the scene closes the wall photo + audio
      });

      // Helper for picking views: log where the visitor is looking after
      // each drag ends (used to tune start views, boundaries, hotspots).
      const logView = () => {
        try {
          console.info(`[Trail] ${currentScene} view → data-yaw="${viewer.getYaw().toFixed(1)}" data-pitch="${viewer.getPitch().toFixed(1)}"`);
        } catch { /* viewer not ready */ }
      };
      panoEl.addEventListener('mouseup', logView);
      panoEl.addEventListener('touchend', logView);

      // Idle drift. Intro (aerial): ping-pong sweep between yawMin / yawMax.
      // Stop 1 (gate scenes): ease gently toward the scene's base view plus
      // the scroll-linked yaw offset, so the 360 stays alive while reading.
      // Pauses while dragging, during the Begin transition, and in Full View
      // (so a zoomed-in look is never dragged back by the drift).
      if (!prefersReducedMotion) {
        const DRIFT_SPEED = 1.4; // degrees per second (intro sweep)
        const PITCH_EASE = 0.4;
        const IDLE_MS = 3000;
        let dir = 1; // start by panning right, toward yawMax
        let interacting = false;
        let lastEnd = performance.now();
        let prev = performance.now();
        panoEl.addEventListener('pointerdown', () => { interacting = true; });
        window.addEventListener('pointerup', () => {
          if (interacting) { interacting = false; lastEnd = performance.now(); }
        });
        const drift = (now) => {
          const dt = Math.min((now - prev) / 1000, 0.05);
          prev = now;
          const idle = !interacting && now - lastEnd > IDLE_MS && !document.hidden && !transitioning;
          if (idle) {
            try {
              if (state.mode === 'intro' && currentScene === 'aerial') {
                const y = viewer.getYaw() + dir * DRIFT_SPEED * dt;
                // Reverse at the bounds (no clamp — if the visitor parked the
                // view outside them, the sweep simply drifts back into range).
                if (y >= yawMax && dir > 0) dir = -1;
                else if (y <= yawMin && dir < 0) dir = 1;
                viewer.setYaw(y, false);
                const p = viewer.getPitch();
                viewer.setPitch(p + (startPitch - p) * Math.min(1, dt * PITCH_EASE), false);
              } else if (state.mode !== 'intro' && SCENE_BASE[currentScene] && !isImmersive()) {
                const base = SCENE_BASE[currentScene];
                const stopScene = STOP_CONF[state.mode] ? STOP_CONF[state.mode].scene : '';
                const targetYaw = base.yaw + (currentScene === stopScene ? scrollYaw : 0);
                const y = viewer.getYaw();
                viewer.setYaw(y + (targetYaw - y) * Math.min(1, dt * 0.9), false);
                const p = viewer.getPitch();
                viewer.setPitch(p + (base.pitch - p) * Math.min(1, dt * PITCH_EASE), false);
              }
            } catch { /* viewer busy */ }
          }
          window.requestAnimationFrame(drift);
        };
        window.requestAnimationFrame(drift);
      }

      window.setTimeout(() => panoEl.classList.add('is-ready'), 250);
    } catch (err) {
      console.warn('[Trail] Panorama failed to initialize:', err);
    }
  };

  // Downscale huge images to the GPU's safe texture size (like the site map).
  const img = new Image();
  img.decoding = 'async';
  img.onload = () => {
    let limit = 4096;
    try {
      const gl = document.createElement('canvas').getContext('webgl') ||
        document.createElement('canvas').getContext('experimental-webgl');
      if (gl) limit = Math.min(limit, gl.getParameter(gl.MAX_TEXTURE_SIZE) || 4096);
    } catch { /* keep default */ }
    const longest = Math.max(img.naturalWidth, img.naturalHeight);
    if (longest <= limit) { build(src); return; }
    const scale = limit / longest;
    const c = document.createElement('canvas');
    c.width = Math.round(img.naturalWidth * scale);
    c.height = Math.round(img.naturalHeight * scale);
    const ctx = c.getContext('2d', { alpha: false });
    if (!ctx) { build(src); return; }
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(img, 0, 0, c.width, c.height);
    build(c.toDataURL('image/jpeg', 0.92));
  };
  img.onerror = () => build(src);
  img.src = src;
}

/* --- Stop stories: smooth scroll, chapter engine, narration, interactions ---- */

/* Smoothed wheel scrolling (landing-like glide) on whichever stop's story is
   on screen. The goal accumulates wheel deltas and GSAP eases the scroller
   toward it; touch stays native. */
let scrollGoal = null;
function smoothScrollBy(delta) {
  const el = activeStoryEl;
  if (!el) return;
  const max = el.scrollHeight - el.clientHeight;
  const from = scrollGoal === null ? el.scrollTop : scrollGoal;
  scrollGoal = Math.max(0, Math.min(max, from + delta));
  if (window.gsap && !prefersReducedMotion) {
    window.gsap.to(el, {
      scrollTop: scrollGoal,
      duration: 0.75,
      ease: 'power3.out',
      overwrite: true,
      onComplete: () => { scrollGoal = null; },
    });
  } else {
    el.scrollTop = scrollGoal;
    scrollGoal = null;
  }
}

/* Stop 4 · Fragments of Memory ----------------------------------------------
   Three gesture-led interactions replace the old quiz: guide the Balanghay,
   wrap an abstract bundle in the Ulóh, then carry three remembrance tokens
   into a shared circle. There are no wrong states or scores. */
function setupMemoryQuest(el, options = {}) {
  if (!el || !el.hasAttribute('data-memory-quest')) return null;

  const completed = new Set();
  const actEls = new Map(Array.from(el.querySelectorAll('[data-memory-act]')).map((node) => [node.dataset.memoryAct, node]));
  const insights = new Map(Array.from(el.querySelectorAll('[data-memory-insight]')).map((node) => [node.dataset.memoryInsight, node]));
  const legends = Array.from(el.querySelectorAll('[data-memory-legend]'));
  const sealMarks = Array.from(el.querySelectorAll('[data-memory-seal]'));
  const finalEl = el.querySelector('[data-memory-final]');
  const finalWait = el.querySelector('[data-memory-final-wait]');
  const finalComplete = el.querySelector('[data-memory-final-complete]');
  const resetButton = el.querySelector('[data-memory-reset]');
  const journeyInput = el.querySelector('[data-memory-journey]');
  const river = el.querySelector('[data-memory-river]');
  const wrapZone = el.querySelector('[data-memory-wrap-zone]');
  const wrapButton = el.querySelector('[data-memory-wrap-next]');
  const wrapCount = el.querySelector('[data-memory-wrap-count]');
  const altar = el.querySelector('[data-memory-altar]');
  const remembrancePrompt = el.querySelector('[data-memory-prompt="remembrance"]');
  const tokens = Array.from(el.querySelectorAll('[data-memory-token]'));
  const slots = Array.from(el.querySelectorAll('[data-memory-slot]'));
  const marchSrc = root.getAttribute('data-art-pahimakas-march') || '';
  const assets = {
    balanghay: root.getAttribute('data-art-balanghay-img') || '',
    uloh: root.getAttribute('data-art-uloh-img') || '',
    alay: root.getAttribute('data-art-alay-img') || '',
    pahimakas: root.getAttribute('data-art-pahimakas-img') || '',
    recuerdos: root.getAttribute('data-art-recuerdos-img') || '',
  };

  let wrapLayers = 0;
  let marchAudio = null;
  let marchTimer = 0;
  let completionTimer = 0;
  let completionAnnounced = false;

  el.querySelectorAll('[data-memory-image]').forEach((image) => {
    const src = assets[image.dataset.memoryImage] || '';
    if (src) image.src = src;
    else image.hidden = true;
  });
  if (assets.uloh) el.style.setProperty('--memory-uloh-image', `url("${assets.uloh.replace(/"/g, '\\"')}")`);

  const pulse = (pattern = 18) => {
    try {
      if (navigator.vibrate) navigator.vibrate(pattern);
    } catch { /* haptics are optional */ }
  };

  const setCountText = (node, en, tl) => {
    if (!node) return;
    const enNode = node.querySelector('[data-lang-en]');
    const tlNode = node.querySelector('[data-lang-tl]');
    if (enNode) enNode.textContent = en;
    if (tlNode) tlNode.textContent = tl;
  };

  const stopMarch = () => {
    window.clearTimeout(marchTimer);
    marchTimer = 0;
    if (!marchAudio) return;
    marchAudio.pause();
    try { marchAudio.currentTime = 0; } catch { /* metadata may not be ready */ }
  };

  const playMarchExcerpt = () => {
    if (!marchSrc) return;
    if (!marchAudio) {
      marchAudio = new Audio(marchSrc);
      marchAudio.preload = 'auto';
      marchAudio.playsInline = true;
      marchAudio.volume = 0.42;
    }
    stopMarch();
    marchAudio.muted = state.muted;
    const playing = marchAudio.play();
    if (playing && playing.catch) playing.catch(() => {});
    marchTimer = window.setTimeout(stopMarch, 8500);
  };

  const renderProgress = () => {
    legends.forEach((node) => node.classList.toggle('is-restored', completed.has(node.dataset.memoryLegend)));
    sealMarks.forEach((node) => node.classList.toggle('is-restored', completed.has(node.dataset.memorySeal)));
    actEls.forEach((node, key) => node.classList.toggle('is-restored', completed.has(key)));

    const whole = completed.size === 3;
    if (finalEl) finalEl.classList.toggle('is-awake', whole);
    if (finalWait) finalWait.hidden = whole;
    if (finalComplete) finalComplete.hidden = !whole;

    if (whole && !completionAnnounced) {
      completionAnnounced = true;
      pulse([24, 55, 24, 55, 40]);
      spawnBloom(finalEl);
      charApi.playGesture?.('heart');
      window.clearTimeout(completionTimer);
      completionTimer = window.setTimeout(() => {
        if (state.mode === 'stop4') options.onAllComplete?.();
      }, prefersReducedMotion ? 250 : 1200);
    }
  };

  // A short-lived golden light burst — the reward beat each act was missing.
  const spawnBloom = (host) => {
    if (!host || prefersReducedMotion) return;
    const bloom = document.createElement('span');
    bloom.className = 'trailx-memory__bloom';
    bloom.setAttribute('aria-hidden', 'true');
    host.appendChild(bloom);
    window.setTimeout(() => bloom.remove(), 1100);
  };

  const completeAct = (key) => {
    if (!key || completed.has(key)) return;
    completed.add(key);
    const insight = insights.get(key);
    if (insight) insight.hidden = false;
    const actEl = actEls.get(key);
    if (actEl) {
      spawnBloom(actEl);
      actEl.classList.add('is-justrestored');
      window.setTimeout(() => actEl.classList.remove('is-justrestored'), 1000);
    }
    pulse([18, 45, 30]);
    renderProgress();
  };

  const setJourneyProgress = (value) => {
    const progress = Math.max(0, Math.min(100, Number(value) || 0));
    if (river) {
      river.style.setProperty('--memory-progress', `${progress}%`);
      // 0..1 approach drives the far shore's glow (brightens as you near it)
      // and the wake trail length behind the boat.
      river.style.setProperty('--memory-approach', (progress / 100).toFixed(3));
      river.classList.toggle('is-moving', progress > 1 && progress < 96);
    }
    if (progress >= 96) {
      if (journeyInput) {
        journeyInput.value = '100';
        journeyInput.disabled = true;
      }
      if (river) river.classList.add('is-arrived');
      const prompt = el.querySelector('[data-memory-prompt="journey"]');
      setCountText(prompt, 'The other shore is reached', 'Narating na ang kabilang pampang');
      completeAct('journey');
    }
  };
  journeyInput?.addEventListener('input', () => setJourneyProgress(journeyInput.value));
  journeyInput?.addEventListener('change', () => setJourneyProgress(journeyInput.value));

  const restoreWrapLayer = () => {
    if (wrapLayers >= 3) return;
    wrapLayers += 1;
    wrapZone?.setAttribute('data-layer', String(wrapLayers));
    if (wrapZone && !prefersReducedMotion) {
      wrapZone.classList.remove('just-wrapped');
      // reflow so the shimmer sweep restarts on every swipe
      void wrapZone.offsetWidth;
      wrapZone.classList.add('just-wrapped');
    }
    setCountText(
      wrapCount,
      `${wrapLayers} of 3 layers restored`,
      `${wrapLayers} sa 3 sapin ang naibalik`
    );
    pulse(14);
    if (wrapLayers === 3) {
      if (wrapButton) wrapButton.disabled = true;
      setCountText(wrapCount, 'The Ulóh is restored', 'Naibalik na ang Ulóh');
      completeAct('care');
    }
  };

  let wrapPointer = null;
  wrapZone?.addEventListener('pointerdown', (event) => {
    if (wrapLayers >= 3 || event.button > 0) return;
    wrapPointer = { id: event.pointerId, x: event.clientX, y: event.clientY };
    wrapZone.setPointerCapture?.(event.pointerId);
    wrapZone.classList.add('is-swiping');
  });
  const finishWrapPointer = (event) => {
    if (!wrapPointer || event.pointerId !== wrapPointer.id) return;
    const dx = event.clientX - wrapPointer.x;
    const dy = event.clientY - wrapPointer.y;
    wrapPointer = null;
    wrapZone?.classList.remove('is-swiping');
    if (Math.abs(dx) >= 44 && Math.abs(dx) > Math.abs(dy)) restoreWrapLayer();
  };
  wrapZone?.addEventListener('pointerup', finishWrapPointer);
  wrapZone?.addEventListener('pointercancel', () => {
    wrapPointer = null;
    wrapZone?.classList.remove('is-swiping');
  });
  wrapZone?.addEventListener('keydown', (event) => {
    if (event.key !== 'Enter' && event.key !== ' ') return;
    event.preventDefault();
    restoreWrapLayer();
  });
  wrapButton?.addEventListener('click', restoreWrapLayer);

  const placedTokens = new Set();

  // When all three tokens are placed, draw glowing lines between the slots so
  // the three memories visibly become one constellation. Geometry is measured
  // from the live layout so it stays correct on any screen.
  const altarLines = [];
  const clearConstellation = () => {
    while (altarLines.length) altarLines.pop().remove();
  };
  const drawConstellation = () => {
    if (!altar) return;
    clearConstellation();
    const ar = altar.getBoundingClientRect();
    if (!ar.width) return;
    const centers = ['alay', 'pahimakas', 'recuerdos'].map((key) => {
      const slot = slots.find((node) => node.dataset.memorySlot === key);
      if (!slot) return null;
      const r = slot.getBoundingClientRect();
      return { x: r.left + r.width / 2 - ar.left, y: r.top + r.height / 2 - ar.top };
    });
    if (centers.some((point) => !point)) return;
    [[0, 1], [1, 2], [2, 0]].forEach(([a, b], index) => {
      const p1 = centers[a];
      const p2 = centers[b];
      const len = Math.hypot(p2.x - p1.x, p2.y - p1.y);
      const angle = Math.atan2(p2.y - p1.y, p2.x - p1.x) * 180 / Math.PI;
      const line = document.createElement('span');
      line.className = 'trailx-memory__altar-line';
      line.setAttribute('aria-hidden', 'true');
      line.style.left = `${p1.x}px`;
      line.style.top = `${p1.y}px`;
      line.style.width = `${len}px`;
      line.style.transform = `rotate(${angle}deg)`;
      line.style.setProperty('--memory-line-delay', `${index * 0.18}s`);
      altar.appendChild(line);
      altarLines.push(line);
    });
  };

  const placeToken = (token) => {
    if (!token) return;
    const key = token.dataset.memoryToken;
    if (!key || placedTokens.has(key)) return;
    placedTokens.add(key);
    token.classList.remove('is-dragging');
    token.classList.add('is-placed');
    token.style.removeProperty('--memory-drag-x');
    token.style.removeProperty('--memory-drag-y');
    token.disabled = true;
    const slot = slots.find((node) => node.dataset.memorySlot === key);
    slot?.classList.add('is-filled');
    if (key === 'pahimakas') playMarchExcerpt();
    pulse(16);
    setCountText(
      remembrancePrompt,
      `${placedTokens.size} of 3 memories placed`,
      `${placedTokens.size} sa 3 alaala ang nailagay`
    );
    if (placedTokens.size === 3) {
      setCountText(remembrancePrompt, 'The remembrance circle is complete', 'Buo na ang bilog ng pag-alaala');
      altar?.classList.add('is-complete');
      drawConstellation();
      completeAct('remembrance');
    }
  };

  tokens.forEach((token) => {
    let drag = null;
    let suppressClickUntil = 0;
    token.addEventListener('pointerdown', (event) => {
      if (token.disabled || event.button > 0) return;
      drag = { id: event.pointerId, x: event.clientX, y: event.clientY, moved: false };
      token.setPointerCapture?.(event.pointerId);
      token.classList.add('is-dragging');
    });
    token.addEventListener('pointermove', (event) => {
      if (!drag || event.pointerId !== drag.id) return;
      const dx = event.clientX - drag.x;
      const dy = event.clientY - drag.y;
      if (Math.hypot(dx, dy) > 6) drag.moved = true;
      if (!drag.moved) return;
      event.preventDefault();
      token.style.setProperty('--memory-drag-x', `${dx}px`);
      token.style.setProperty('--memory-drag-y', `${dy}px`);
    });
    const finishTokenDrag = (event, cancelled) => {
      if (!drag || event.pointerId !== drag.id) return;
      const wasMoved = drag.moved;
      drag = null;
      token.classList.remove('is-dragging');
      const bounds = altar?.getBoundingClientRect();
      const overAltar = Boolean(bounds && event.clientX >= bounds.left - 12 && event.clientX <= bounds.right + 12 && event.clientY >= bounds.top - 12 && event.clientY <= bounds.bottom + 12);
      suppressClickUntil = performance.now() + 350;
      if (!cancelled && (!wasMoved || overAltar)) placeToken(token);
      else {
        token.style.removeProperty('--memory-drag-x');
        token.style.removeProperty('--memory-drag-y');
      }
    };
    token.addEventListener('pointerup', (event) => finishTokenDrag(event, false));
    token.addEventListener('pointercancel', (event) => finishTokenDrag(event, true));
    token.addEventListener('click', () => {
      if (performance.now() < suppressClickUntil) return;
      placeToken(token);
    });
  });

  const reset = () => {
    window.clearTimeout(completionTimer);
    completionAnnounced = false;
    completed.clear();
    stopMarch();
    insights.forEach((node) => { node.hidden = true; });
    if (journeyInput) {
      journeyInput.disabled = false;
      journeyInput.value = '0';
    }
    if (river) river.classList.remove('is-arrived', 'is-moving');
    setJourneyProgress(0);
    setCountText(el.querySelector('[data-memory-prompt="journey"]'), 'Drag the boat across the current', 'I-drag ang bangka sa agos');
    wrapLayers = 0;
    wrapZone?.setAttribute('data-layer', '0');
    wrapZone?.classList.remove('just-wrapped');
    if (wrapButton) wrapButton.disabled = false;
    setCountText(wrapCount, '0 of 3 layers restored', '0 sa 3 sapin ang naibalik');
    placedTokens.clear();
    altar?.classList.remove('is-complete');
    clearConstellation();
    tokens.forEach((token) => {
      token.disabled = false;
      token.classList.remove('is-placed', 'is-dragging');
      token.style.removeProperty('--memory-drag-x');
      token.style.removeProperty('--memory-drag-y');
    });
    slots.forEach((slot) => slot.classList.remove('is-filled'));
    setCountText(remembrancePrompt, '0 of 3 memories placed', '0 sa 3 alaala ang nailagay');
    renderProgress();
  };

  resetButton?.addEventListener('click', () => {
    reset();
    options.onReset?.();
  });

  memoryApi.stopAudio = stopMarch;
  memoryApi.setMuted = (muted) => { if (marchAudio) marchAudio.muted = Boolean(muted); };
  memoryApi.reset = reset;
  window.addEventListener('pagehide', stopMarch);
  renderProgress();

  return { reset, stopAudio: stopMarch };
}

/* Stop 4 · Map of Traditions ------------------------------------------------
   A discovery map: carry each Stop 3 custom home to its island. Tap or drag a
   card; it flies to its region, the island lights up with the artifact, and
   its story is revealed. There is no wrong placement — it always returns home.
   Lighting every island draws one thread through the whole archipelago. */
function setupTraditionMap(el, options = {}) {
  if (!el || !el.hasAttribute('data-tradition-map')) return null;

  const mapStage = el.querySelector('[data-tradition-map-stage]');
  const board = el.querySelector('[data-map-board]');
  const markersWrap = el.querySelector('[data-map-markers]');
  const threadsSvg = el.querySelector('[data-map-threads]');
  const progress = el.querySelector('[data-map-progress]');
  const reveal = el.querySelector('[data-map-reveal]');
  const revealMv = el.querySelector('[data-map-reveal-mv]');
  const revealRegion = el.querySelector('[data-map-reveal-region]');
  const revealStory = el.querySelector('[data-map-reveal-story]');
  const feedback = el.querySelector('[data-map-feedback]');
  const expandBtn = el.querySelector('[data-map-expand]');
  const resetButton = el.querySelector('[data-map-reset]');
  const finalWait = el.querySelector('[data-map-final-wait]');
  const finalComplete = el.querySelector('[data-map-final-complete]');
  const cards = Array.from(el.querySelectorAll('[data-map-card]'));
  const total = cards.length;
  const placed = new Set();
  const markerByKey = {};
  let announced = false;
  let doneTimer = 0;
  let selectedCard = null;

  const pulse = (pattern = 16) => {
    try { if (navigator.vibrate) navigator.vibrate(pattern); } catch { /* optional */ }
  };
  const setCountText = (node, en, tl) => {
    if (!node) return;
    const e = node.querySelector('[data-lang-en]');
    const t = node.querySelector('[data-lang-tl]');
    if (e) e.textContent = en;
    if (t) t.textContent = tl;
  };
  const esc = (v) => String(v == null ? '' : v)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const cardPoster = (card) => {
    const img = card.querySelector('.trailx-map__card-img');
    return img ? (img.currentSrc || img.src) : '';
  };

  /* The tray holds real 3D artifacts you pick up and drag. To keep the WebGL
     count flat, a card's model is destroyed the moment its twin appears on the
     map — so it is always ~13 live models, never 26. Loading is staggered and
     only begins once this act is on screen. */
  const CARD_MV_ATTRS = {
    'camera-orbit': '0deg 75deg 100%',
    'disable-zoom': '', 'disable-pan': '', 'disable-tap': '',
    'interaction-prompt': 'none', 'shadow-intensity': '0.4',
    'exposure': '1.05', 'environment-image': 'neutral', 'reveal': 'auto',
  };
  let trayLoaded = false;

  const makeCardModel = (card) => {
    const mv = document.createElement('model-viewer');
    mv.className = 'trailx-map__card-mv';
    Object.keys(CARD_MV_ATTRS).forEach((k) => mv.setAttribute(k, CARD_MV_ATTRS[k]));
    mv.setAttribute('aria-hidden', 'true');
    const poster = cardPoster(card);
    if (poster) mv.setAttribute('poster', poster);
    if (trayLoaded && card.dataset.mapGlb) mv.setAttribute('src', card.dataset.mapGlb);
    return mv;
  };

  const loadTrayModels = () => {
    if (trayLoaded) return;
    trayLoaded = true;
    cards.forEach((card, index) => {
      const mv = card.querySelector('.trailx-map__card-mv');
      if (!mv) return;
      const poster = cardPoster(card);
      if (poster && !mv.getAttribute('poster')) mv.setAttribute('poster', poster);
      window.setTimeout(() => {
        if (card.dataset.mapGlb && !mv.getAttribute('src')) {
          mv.setAttribute('src', card.dataset.mapGlb);
        }
      }, index * 140); // stagger so 13 models don't stampede the connection
    });
  };

  // Only start loading once the map act is the step being read.
  if (root.getAttribute('data-step') === 's4-map') loadTrayModels();
  const stepWatcher = new MutationObserver(() => {
    if (root.getAttribute('data-step') === 's4-map') loadTrayModels();
  });
  stepWatcher.observe(root, { attributes: true, attributeFilter: ['data-step'] });

  // A small, static 3D model of the artifact — created only when placed, so
  // WebGL contexts ramp up with play rather than all at once. Static (no
  // auto-rotate) keeps ongoing GPU cost low; the poster image covers loading.
  const buildMarkerModel = (card) => {
    const mv = document.createElement('model-viewer');
    mv.className = 'trailx-map__marker-mv';
    mv.setAttribute('camera-orbit', '0deg 74deg 100%');
    mv.setAttribute('disable-zoom', '');
    mv.setAttribute('disable-pan', '');
    mv.setAttribute('disable-tap', '');
    mv.setAttribute('interaction-prompt', 'none');
    mv.setAttribute('shadow-intensity', '0.4');
    mv.setAttribute('exposure', '1.05');
    mv.setAttribute('environment-image', 'neutral');
    mv.setAttribute('reveal', 'auto');
    mv.setAttribute('aria-hidden', 'true');
    const poster = cardPoster(card);
    if (poster) mv.setAttribute('poster', poster);
    if (card.dataset.mapGlb) mv.setAttribute('src', card.dataset.mapGlb);
    return mv;
  };

  const showReveal = (card) => {
    if (!reveal) return;
    if (revealRegion) {
      revealRegion.innerHTML =
        '<span data-lang-en>' + esc(card.dataset.regionEn) + '</span><span data-lang-tl>' + esc(card.dataset.regionTl) + '</span>';
    }
    if (revealStory) {
      revealStory.innerHTML =
        '<span data-lang-en>' + esc(card.dataset.storyEn) + '</span><span data-lang-tl>' + esc(card.dataset.storyTl) + '</span>';
    }
    if (revealMv) {
      if (prefersReducedMotion) revealMv.removeAttribute('auto-rotate');
      const poster = cardPoster(card);
      if (poster) revealMv.setAttribute('poster', poster);
      if (card.dataset.mapGlb && revealMv.getAttribute('src') !== card.dataset.mapGlb) {
        revealMv.setAttribute('src', card.dataset.mapGlb);
      }
    }
    reveal.hidden = false;
    reveal.classList.remove('is-in');
    void reveal.offsetWidth; // restart the entrance each reveal
    reveal.classList.add('is-in');
  };

  // A target marker for every card, positioned on the real map (x%, y%).
  cards.forEach((card) => {
    const key = card.dataset.mapCard;
    const x = parseFloat(card.dataset.mapX) || 0;
    const y = parseFloat(card.dataset.mapY) || 0;
    const marker = document.createElement('button');
    marker.type = 'button';
    marker.className = 'trailx-map__marker';
    marker.dataset.mapMarker = key;
    marker.style.left = x + '%';
    marker.style.top = y + '%';
    marker.setAttribute('aria-label', card.dataset.regionEn || key);
    // Region names label the islands while you're placing, so the match is
    // learnable rather than guesswork.
    marker.dataset.regionEn = card.dataset.regionEn || '';
    marker.dataset.regionTl = card.dataset.regionTl || card.dataset.regionEn || '';
    marker.innerHTML = '<span class="trailx-map__pin" aria-hidden="true"></span>';
    markersWrap?.appendChild(marker);
    markerByKey[key] = marker;
    marker.addEventListener('click', () => {
      if (selectedCard) { attemptPlace(selectedCard, key); return; } // tap-to-place
      if (placed.has(key)) showReveal(card);
    });
  });

  /* Expand the map to fill the screen so the clustered markers spread out.
     Expanded, it becomes a scroller: zoom in with +/− and simply scroll up and
     down the archipelago. */
  const zoomControls = el.querySelector('[data-map-zoom-controls]');
  const zoomButtons = Array.from(el.querySelectorAll('[data-map-zoom]'));
  const panEl = el.querySelector('[data-map-pan]');
  const ZOOM_MIN = 1;
  const ZOOM_MAX = 5;
  let expanded = false;

  /* A Leaflet-style canvas: drag to pan, pinch / wheel / buttons to zoom. The
     whole map layer is transformed, so the markers travel with it and stay
     exactly on their islands (drop-testing uses live rects, so placing still
     works at any zoom). */
  let mapScale = 1;
  let mapTx = 0;
  let mapTy = 0;
  const mapPointers = new Map();
  let mapPanning = false;
  let mapPinch = 0;

  const applyMapTransform = () => {
    if (panEl) {
      panEl.style.setProperty('--pan-x', mapTx + 'px');
      panEl.style.setProperty('--pan-y', mapTy + 'px');
      panEl.style.setProperty('--map-zoom', String(mapScale));
    }
    zoomButtons.forEach((btn) => {
      btn.disabled = btn.dataset.mapZoom === 'in' ? mapScale >= ZOOM_MAX : mapScale <= ZOOM_MIN;
    });
  };

  const clampPan = () => {
    if (!board || !panEl) return;
    const vw = board.clientWidth;
    const vh = board.clientHeight;
    const w = panEl.offsetWidth * mapScale;
    const h = panEl.offsetHeight * mapScale;
    // Centre the map while it is smaller than the view; otherwise keep its
    // edges from drifting inside the frame.
    mapTx = w <= vw ? (vw - w) / 2 : Math.min(0, Math.max(vw - w, mapTx));
    mapTy = h <= vh ? (vh - h) / 2 : Math.min(0, Math.max(vh - h, mapTy));
  };

  const zoomAt = (clientX, clientY, factor) => {
    if (!board) return;
    const next = Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, mapScale * factor));
    if (Math.abs(next - mapScale) < 0.001) return;
    const r = board.getBoundingClientRect();
    const px = clientX - r.left;
    const py = clientY - r.top;
    mapTx = px - (px - mapTx) * (next / mapScale); // anchor under the fingers
    mapTy = py - (py - mapTy) * (next / mapScale);
    mapScale = next;
    clampPan();
    applyMapTransform();
  };

  const resetMapView = () => {
    mapScale = 1;
    mapTx = 0;
    mapTy = 0;
    mapPointers.clear();
    mapPanning = false;
    mapPinch = 0;
    clampPan();
    applyMapTransform();
  };

  if (board) {
    board.addEventListener('wheel', (event) => {
      if (!expanded) return;
      event.preventDefault();
      zoomAt(event.clientX, event.clientY, event.deltaY < 0 ? 1.16 : 1 / 1.16);
    }, { passive: false });

    // iOS pinch fires gesture events — block them so the page can't zoom.
    ['gesturestart', 'gesturechange', 'gestureend'].forEach((t) => {
      board.addEventListener(t, (event) => { if (expanded) event.preventDefault(); }, { passive: false });
    });

    board.addEventListener('pointerdown', (event) => {
      if (!expanded) return;
      // Taps on a marker or the close button are theirs, not the canvas's.
      if (event.target.closest('.trailx-map__marker, .trailx-map__expand')) return;
      mapPointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
      if (mapPointers.size === 2) {
        const p = Array.from(mapPointers.values());
        mapPinch = Math.hypot(p[0].x - p[1].x, p[0].y - p[1].y);
        mapPanning = false;
      } else if (mapPointers.size === 1) {
        mapPanning = true;
        board.classList.add('is-panning');
        try { board.setPointerCapture(event.pointerId); } catch { /* ignore */ }
      }
    });

    board.addEventListener('pointermove', (event) => {
      if (!expanded || !mapPointers.has(event.pointerId)) return;
      const prev = mapPointers.get(event.pointerId);
      mapPointers.set(event.pointerId, { x: event.clientX, y: event.clientY });

      if (mapPointers.size === 2) {
        const p = Array.from(mapPointers.values());
        const dist = Math.hypot(p[0].x - p[1].x, p[0].y - p[1].y);
        if (mapPinch > 0 && dist > 0) {
          zoomAt((p[0].x + p[1].x) / 2, (p[0].y + p[1].y) / 2, dist / mapPinch);
        }
        mapPinch = dist;
        event.preventDefault();
        return;
      }

      if (mapPanning) {
        mapTx += event.clientX - prev.x;
        mapTy += event.clientY - prev.y;
        clampPan();
        applyMapTransform();
        event.preventDefault();
      }
    }, { passive: false });

    const endMapPointer = (event) => {
      mapPointers.delete(event.pointerId);
      if (mapPointers.size < 2) mapPinch = 0;
      if (mapPointers.size === 0) {
        mapPanning = false;
        board.classList.remove('is-panning');
      }
    };
    ['pointerup', 'pointercancel', 'pointerleave'].forEach((t) => {
      board.addEventListener(t, endMapPointer);
    });

    board.addEventListener('dblclick', (event) => {
      if (!expanded) return;
      event.preventDefault();
      zoomAt(event.clientX, event.clientY, 1.7);
    });
  }

  zoomButtons.forEach((btn) => {
    btn.addEventListener('click', (event) => {
      event.stopPropagation();
      const r = board?.getBoundingClientRect();
      if (!r) return;
      zoomAt(r.left + r.width / 2, r.top + r.height / 2, btn.dataset.mapZoom === 'in' ? 1.5 : 1 / 1.5);
    });
  });

  const setExpanded = (value) => {
    expanded = value;
    mapStage?.classList.toggle('is-expanded', value);
    if (zoomControls) zoomControls.hidden = !value;
    expandBtn?.setAttribute('aria-pressed', String(value));
    expandBtn?.setAttribute('aria-label', value
      ? 'Close the map / Isara ang mapa'
      : 'Expand the map / Palakihin ang mapa');
    // Recentre once the new layout has been measured.
    window.requestAnimationFrame(resetMapView);
  };
  expandBtn?.addEventListener('click', (event) => {
    event.stopPropagation();
    setExpanded(!expanded);
  });
  // Tapping the map itself opens it full screen (but never while you're
  // aiming at an island, and never as a way to close it by accident).
  board?.addEventListener('click', (event) => {
    if (expanded || selectedCard) return;
    if (event.target.closest('.trailx-map__marker, .trailx-map__expand')) return;
    setExpanded(true);
  });
  window.addEventListener('keydown', (event) => { if (event.key === 'Escape' && expanded) setExpanded(false); });

  const flyToMarker = (card, marker) => {
    if (prefersReducedMotion || !card || !marker) return;
    const srcImg = card.querySelector('img');
    if (!srcImg) return;
    const cr = srcImg.getBoundingClientRect();
    const mr = marker.getBoundingClientRect();
    const clone = srcImg.cloneNode();
    clone.className = 'trailx-map__fly';
    clone.style.left = (cr.left + cr.width / 2) + 'px';
    clone.style.top = (cr.top + cr.height / 2) + 'px';
    document.body.appendChild(clone);
    const dx = (mr.left + mr.width / 2) - (cr.left + cr.width / 2);
    const dy = (mr.top + mr.height / 2) - (cr.top + cr.height / 2);
    requestAnimationFrame(() => {
      clone.style.transform = 'translate(-50%, -50%) translate(' + dx + 'px, ' + dy + 'px) scale(0.32)';
      clone.style.opacity = '0.12';
    });
    let gone = false;
    const remove = () => { if (gone) return; gone = true; clone.remove(); };
    clone.addEventListener('transitionend', remove, { once: true });
    window.setTimeout(remove, 1000);
  };

  const drawThreads = () => {
    if (!threadsSvg) return;
    threadsSvg.innerHTML = '';
    const pts = cards.slice()
      .sort((a, b) => (parseFloat(a.dataset.mapY) || 0) - (parseFloat(b.dataset.mapY) || 0))
      .map((c) => ({ x: parseFloat(c.dataset.mapX) || 0, y: parseFloat(c.dataset.mapY) || 0 }));
    for (let i = 0; i < pts.length - 1; i += 1) {
      const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
      line.setAttribute('x1', pts[i].x);
      line.setAttribute('y1', pts[i].y);
      line.setAttribute('x2', pts[i + 1].x);
      line.setAttribute('y2', pts[i + 1].y);
      line.setAttribute('class', 'trailx-map__thread');
      line.style.setProperty('--thread-delay', (i * 0.12) + 's');
      threadsSvg.appendChild(line);
    }
  };

  const updateProgress = () => {
    setCountText(progress,
      placed.size + ' of ' + total + ' traditions placed',
      placed.size + ' sa ' + total + ' tradisyon ang nailagay');
    const whole = placed.size === total && total > 0;
    board?.classList.toggle('is-complete', whole);
    if (finalWait) finalWait.hidden = whole;
    if (finalComplete) finalComplete.hidden = !whole;
    if (whole && !announced) {
      announced = true;
      pulse([24, 55, 24, 55, 40]);
      drawThreads();
      charApi.playGesture?.('heart');
      window.clearTimeout(doneTimer);
      doneTimer = window.setTimeout(() => {
        if (state.mode === 'stop4') options.onAllComplete?.();
      }, prefersReducedMotion ? 300 : 1500);
    }
  };

  const placeCard = (card) => {
    if (!card) return;
    const key = card.dataset.mapCard;
    if (!key || placed.has(key)) return;
    placed.add(key);
    const marker = markerByKey[key];
    if (marker && !marker.querySelector('model-viewer')) {
      marker.appendChild(buildMarkerModel(card)); // the artifact rises in 3D
    }
    flyToMarker(card, marker);
    window.setTimeout(() => marker?.classList.add('is-lit'), prefersReducedMotion ? 0 : 250);
    // Hand the 3D model over to the map: free the card's context, keep its
    // flat poster showing in the dimmed tray slot.
    card.querySelector('.trailx-map__card-mv')?.remove();
    card.classList.add('is-flat');
    card.classList.add('is-placed');
    card.classList.remove('is-selected');
    card.disabled = true;
    card.style.removeProperty('--map-drag-x');
    card.style.removeProperty('--map-drag-y');
    if (feedback) feedback.hidden = true; // the story is the reward now
    pulse(16);
    showReveal(card);
    updateProgress();
  };

  /* --- Getting it right (and wrong) --------------------------------------
     You must drop a tradition on the island it actually came from. A wrong
     island is never punished — the card simply returns, the map says which
     island you hit, and after a few misses it quietly points the way. */
  const wrongCounts = {};
  let hintTimer = 0;
  let feedbackTimer = 0;

  const showFeedback = (en, tl, tone) => {
    if (!feedback) return;
    feedback.innerHTML = '<span data-lang-en>' + esc(en) + '</span><span data-lang-tl>' + esc(tl) + '</span>';
    feedback.hidden = false;
    feedback.classList.remove('is-wrong', 'is-hint', 'is-good');
    if (tone) feedback.classList.add('is-' + tone);
    window.clearTimeout(feedbackTimer);
    feedbackTimer = window.setTimeout(() => { feedback.hidden = true; }, 4200);
  };

  const clearSelection = () => {
    if (selectedCard) selectedCard.classList.remove('is-selected');
    selectedCard = null;
    mapStage?.classList.remove('is-placing');
    Object.values(markerByKey).forEach((m) => m.classList.remove('is-target'));
  };

  const selectCard = (card) => {
    if (!card || card.disabled) return;
    if (selectedCard === card) { clearSelection(); return; }
    clearSelection();
    selectedCard = card;
    card.classList.add('is-selected');
    mapStage?.classList.add('is-placing'); // reveals the island names
    const name = card.querySelector('span')?.textContent || '';
    showFeedback(
      'Now tap the island where ' + name + ' belongs.',
      'Ngayon, pindutin ang pulong pinagmulan ng ' + name + '.');
  };

  const returnCard = (card) => {
    card.style.removeProperty('--map-drag-x');
    card.style.removeProperty('--map-drag-y');
  };

  // Which island did the card land on? Nearest marker within a forgiving reach.
  const markerAtPoint = (clientX, clientY) => {
    let bestKey = null;
    let bestDist = Infinity;
    Object.keys(markerByKey).forEach((key) => {
      const r = markerByKey[key].getBoundingClientRect();
      const dist = Math.hypot(clientX - (r.left + r.width / 2), clientY - (r.top + r.height / 2));
      if (dist < bestDist) { bestDist = dist; bestKey = key; }
    });
    const boardWidth = board?.getBoundingClientRect().width || 300;
    const reach = Math.max(44, boardWidth * 0.14);
    return bestDist <= reach ? bestKey : null;
  };

  const hintFor = (key) => {
    const marker = markerByKey[key];
    if (!marker) return;
    marker.classList.add('is-hint');
    window.clearTimeout(hintTimer);
    hintTimer = window.setTimeout(() => marker.classList.remove('is-hint'), 4000);
  };

  const attemptPlace = (card, targetKey) => {
    const key = card.dataset.mapCard;
    if (!targetKey) { // dropped on open sea
      returnCard(card);
      showFeedback('Drop it on an island.', 'Ihulog ito sa isang pulo.');
      return;
    }
    if (targetKey === key) {
      clearSelection();
      placeCard(card);
      return;
    }
    // Wrong island — say which one it was, and keep it gentle.
    const wrongMarker = markerByKey[targetKey];
    const regionEn = wrongMarker?.dataset.regionEn || 'that island';
    const regionTl = wrongMarker?.dataset.regionTl || 'ang pulong iyon';
    wrongCounts[key] = (wrongCounts[key] || 0) + 1;
    card.classList.add('is-wrong');
    wrongMarker?.classList.add('is-wrong');
    window.setTimeout(() => {
      card.classList.remove('is-wrong');
      wrongMarker?.classList.remove('is-wrong');
    }, 620);
    pulse(28);
    returnCard(card);
    if (wrongCounts[key] >= 3) {
      const right = markerByKey[key];
      hintFor(key);
      showFeedback(
        'Hint: look to ' + (right?.dataset.regionEn || '') + '.',
        'Pahiwatig: tingnan ang ' + (right?.dataset.regionTl || '') + '.',
        'hint');
    } else {
      showFeedback(
        'Not quite — that is ' + regionEn + '. Try another island.',
        'Hindi tama — iyan ang ' + regionTl + '. Sumubok sa ibang pulo.',
        'wrong');
    }
  };

  // Tap selects (then tap an island); dragging drops onto an island directly.
  cards.forEach((card) => {
    let drag = null;
    let suppressClickUntil = 0;
    card.addEventListener('pointerdown', (event) => {
      if (card.disabled || event.button > 0) return;
      drag = { id: event.pointerId, x: event.clientX, y: event.clientY, moved: false };
      card.setPointerCapture?.(event.pointerId);
      card.classList.add('is-dragging');
    });
    card.addEventListener('pointermove', (event) => {
      if (!drag || event.pointerId !== drag.id) return;
      const dx = event.clientX - drag.x;
      const dy = event.clientY - drag.y;
      if (Math.hypot(dx, dy) > 6 && !drag.moved) {
        drag.moved = true;
        mapStage?.classList.add('is-placing'); // show island names while dragging
      }
      if (!drag.moved) return;
      event.preventDefault();
      card.style.setProperty('--map-drag-x', dx + 'px');
      card.style.setProperty('--map-drag-y', dy + 'px');
      // Highlight the island currently under the card.
      const over = markerAtPoint(event.clientX, event.clientY);
      Object.keys(markerByKey).forEach((k) => {
        markerByKey[k].classList.toggle('is-target', k === over);
      });
    });
    const finish = (event, cancelled) => {
      if (!drag || event.pointerId !== drag.id) return;
      const moved = drag.moved;
      drag = null;
      card.classList.remove('is-dragging');
      Object.values(markerByKey).forEach((m) => m.classList.remove('is-target'));
      if (cancelled) { returnCard(card); mapStage?.classList.remove('is-placing'); return; }
      if (moved) {
        suppressClickUntil = performance.now() + 350;
        attemptPlace(card, markerAtPoint(event.clientX, event.clientY));
        if (!selectedCard) mapStage?.classList.remove('is-placing');
      }
    };
    card.addEventListener('pointerup', (event) => finish(event, false));
    card.addEventListener('pointercancel', (event) => finish(event, true));
    card.addEventListener('click', () => {
      if (performance.now() < suppressClickUntil) return;
      selectCard(card); // a tap only picks it up — you still choose the island
    });
  });

  const reset = () => {
    window.clearTimeout(doneTimer);
    window.clearTimeout(hintTimer);
    window.clearTimeout(feedbackTimer);
    announced = false;
    placed.clear();
    Object.keys(wrongCounts).forEach((k) => { delete wrongCounts[k]; });
    clearSelection();
    if (feedback) feedback.hidden = true;
    if (threadsSvg) threadsSvg.innerHTML = '';
    if (reveal) reveal.hidden = true;
    if (revealMv) revealMv.removeAttribute('src'); // free the reveal's WebGL context
    Object.values(markerByKey).forEach((marker) => {
      marker.classList.remove('is-lit');
      marker.querySelector('model-viewer')?.remove(); // free each marker's context
    });
    cards.forEach((card) => {
      card.disabled = false;
      card.classList.remove('is-placed', 'is-dragging', 'is-selected', 'is-wrong', 'is-flat');
      card.style.removeProperty('--map-drag-x');
      card.style.removeProperty('--map-drag-y');
      // give the card its 3D artifact back
      if (!card.querySelector('.trailx-map__card-mv')) {
        card.querySelector('.trailx-map__card-media')?.appendChild(makeCardModel(card));
      }
    });
    board?.classList.remove('is-complete');
    updateProgress();
  };

  resetButton?.addEventListener('click', () => {
    reset();
    options.onReset?.();
  });

  // Keep the shared controls' hooks valid (no audio in this activity).
  memoryApi.reset = reset;
  memoryApi.stopAudio = () => {};
  memoryApi.setMuted = () => {};
  updateProgress();

  return { reset };
}

/* The landing page's chapter engine, instantiated once per stop: scroll
   progress picks the active step; the leaving panel slides up and out, the
   next rises in from below, and the active panel's children stagger in — all
   with the landing's exact curves (see trail-start.css). Ana narrates every
   step she lands on. */
function setupStory(el) {
  const stopId = el.getAttribute('data-trail-story') || '';
  const trackEl = el.querySelector('[data-trail-track]');
  const dotsWrap = el.querySelector('[data-trail-dots]');
  const hintEl = el.querySelector('[data-trail-hint]');
  const panels = Array.from(el.querySelectorAll('.trailx__chapter'));
  const STEPS = panels.length;
  if (!STEPS) return null;
  let step = -1;
  let memorySceneTimer = 0;

  // Scroll distance per step, sized in real pixels from the story's visible
  // height so the mobile URL bar (dvh) never desyncs the steps. Less than a
  // full screen per step so moving between chapters takes less scrolling
  // (shorter still on touch, where each swipe travels less than a wheel).
  const sizeTrack = () => {
    if (!trackEl) return;
    const h = el.clientHeight;
    if (!h) { trackEl.style.height = `${STEPS * 100}vh`; return; }
    const stepPx = Math.round(h * (window.matchMedia('(max-width: 820px)').matches ? 0.72 : 0.85));
    trackEl.style.height = `${STEPS * stepPx}px`;
  };
  sizeTrack();
  window.addEventListener('resize', sizeTrack);

  function scrollToStep(index) {
    const total = el.scrollHeight - el.clientHeight;
    const target = Math.max(0, Math.min(total, (index / STEPS) * total + 2));
    if (window.gsap && !prefersReducedMotion) {
      scrollGoal = target;
      window.gsap.to(el, {
        scrollTop: target,
        duration: 0.9,
        ease: 'power3.inOut',
        overwrite: true,
        onComplete: () => { scrollGoal = null; },
      });
    } else {
      el.scrollTo({ top: target, behavior: prefersReducedMotion ? 'auto' : 'smooth' });
      scrollGoal = null;
    }
  }

  // Chapter dots — right-edge rail, like the landing.
  const dots = dotsWrap ? panels.map((panel, i) => {
    const dot = document.createElement('button');
    dot.type = 'button';
    dot.className = 'trailx__dot';
    const label = panel.getAttribute('data-title') || `Section ${i + 1}`;
    dot.setAttribute('data-label', label);
    dot.setAttribute('aria-label', `Go to: ${label}`);
    dot.addEventListener('click', () => scrollToStep(i));
    dotsWrap.appendChild(dot);
    return dot;
  }) : [];

  const setStep = (index) => {
    if (index === step || index < 0 || index >= STEPS) return;
    step = index;
    panels.forEach((panel, i) => {
      panel.classList.toggle('is-active', i === index);
      panel.classList.toggle('is-above', i < index);
      panel.classList.toggle('is-below', i > index);
      panel.setAttribute('aria-hidden', String(i !== index));
    });
    dots.forEach((dot, i) => dot.classList.toggle('is-active', i === index));
    hintEl?.classList.toggle('is-hidden', index > 0);
    // Ana stands opposite the text panel and glides across on step changes,
    // exactly like the landing's chapter engine. The side also drives the
    // tint's side veil so the text always has shade behind it.
    const sideAttr = panels[index].getAttribute('data-side');
    const textSide = sideAttr || 'left';
    charApi.setSide?.(textSide === 'left' ? 'right' : 'left');
    if (sideAttr) root.setAttribute('data-panel-side', sideAttr);
    else root.removeAttribute('data-panel-side'); // centered footer: even tint only
    // Auto-narrate the step being read — even muted (silent playback keeps
    // advancing, so unmuting rejoins mid-sentence; landing behaviour).
    const key = panels[index].getAttribute('data-chapter');
    root.setAttribute('data-step', key || ''); // drives the reading tint depth

    // Real 3D artifacts (Stop 4): a model-viewer only loads its GLB once its
    // act scrolls into view, so at most one act's models render at a time.
    panels[index].querySelectorAll('model-viewer[data-mv-src]').forEach((mv) => {
      if (mv.getAttribute('src')) return;
      if (prefersReducedMotion) mv.removeAttribute('auto-rotate'); // no spin if unwanted
      mv.setAttribute('src', mv.getAttribute('data-mv-src'));
      if (mv.classList.contains('trailx-memory__boat-mv')) {
        mv.addEventListener('load', () => {
          mv.closest('[data-memory-boat]')?.classList.add('mv-ready');
        }, { once: true });
      }
    });

    // Stop 4 travels through the same halls the visitor explored in Stop 3.
    // Each act quietly turns or crossfades the panorama toward its artifacts.
    const memoryScene = panels[index].getAttribute('data-memory-scene');
    if (stopId === 'stop4' && state.mode === stopId && memoryScene && viewer && !transitioning) {
      const pitch = Number(panels[index].getAttribute('data-memory-pitch')) || 0;
      const yawValue = Number(panels[index].getAttribute('data-memory-yaw'));
      const yaw = Number.isFinite(yawValue) ? yawValue : 0;
      window.clearTimeout(memorySceneTimer);
      memorySceneTimer = window.setTimeout(() => {
        if (state.mode !== 'stop4' || !viewer || transitioning) return;
        try {
          if (currentScene !== memoryScene) viewer.loadScene(memoryScene, pitch, yaw, 100);
          else viewer.lookAt(pitch, yaw, 100, prefersReducedMotion ? false : 900);
        } catch { /* panorama may still be crossfading */ }
      }, prefersReducedMotion ? 0 : 220);
    }

    if (state.mode === stopId && SCRIPTS[key] && key !== state.scriptKey) {
      state.scriptKey = key;
      narrate({ speakIt: state.unlocked });
    }
  };

  // Scroll → progress → step. Also drives the progress rail + the 360 lean.
  el.addEventListener('scroll', () => {
    const total = el.scrollHeight - el.clientHeight;
    const progress = total > 0 ? Math.min(1, Math.max(0, el.scrollTop / total)) : 0;
    if (el === activeStoryEl) {
      if (progressEl) progressEl.style.transform = `scaleX(${progress.toFixed(4)})`;
      scrollYaw = progress * 26;
    }
    setStep(Math.floor(Math.min(STEPS - 1e-4, progress * STEPS)));
  }, { passive: true });

  // Touch/drag inside the story cancels any in-flight glide so it never fights.
  el.addEventListener('pointerdown', () => {
    if (window.gsap) window.gsap.killTweensOf(el);
    scrollGoal = null;
  }, { passive: true });

  const mapCompleteIndex = panels.findIndex((panel) => panel.getAttribute('data-chapter') === 's4-complete');
  const mapActivityIndex = panels.findIndex((panel) => panel.getAttribute('data-chapter') === 's4-map');
  setupTraditionMap(el, {
    onAllComplete: () => {
      if (mapCompleteIndex >= 0) scrollToStep(mapCompleteIndex);
    },
    onReset: () => {
      if (mapActivityIndex >= 0) scrollToStep(mapActivityIndex);
    },
  });

  // Detail chips (e.g. gate elements, registration forms): one pane at a time.
  const chips = Array.from(el.querySelectorAll('[data-detail]'));
  const detailPanes = Array.from(el.querySelectorAll('[data-detail-panel]'));
  chips.forEach((chip) => {
    chip.addEventListener('click', () => {
      const key = chip.getAttribute('data-detail');
      chips.forEach((b) => b.setAttribute('aria-pressed', String(b === chip)));
      detailPanes.forEach((p) => { p.hidden = p.getAttribute('data-detail-panel') !== key; });
    });
  });

  // Mind games (Stop 4) — unscored, retry forever.
  // Choice games (riddle / true-or-false): pick an answer, get feedback.
  el.querySelectorAll('[data-game]').forEach((game) => {
    const fbRight = game.querySelector('[data-fb-right]');
    const fbWrong = game.querySelector('[data-fb-wrong]');
    const choices = Array.from(game.querySelectorAll('[data-choice]'));
    choices.forEach((btn) => {
      btn.addEventListener('click', () => {
        const ok = btn.getAttribute('data-choice') === 'right';
        choices.forEach((b) => b.classList.remove('is-right', 'is-wrong'));
        btn.classList.add(ok ? 'is-right' : 'is-wrong');
        if (fbRight) fbRight.hidden = !ok;
        if (fbWrong) fbWrong.hidden = ok;
      });
    });
  });
  // Order game: tap the tiles in sequence; a wrong order resets gently.
  el.querySelectorAll('[data-order-game]').forEach((game) => {
    const tiles = Array.from(game.querySelectorAll('[data-order]'));
    const chapter = game.closest('.trailx__chapter');
    const fbRight = chapter ? chapter.querySelector('[data-order-right]') : null;
    const fbWrong = chapter ? chapter.querySelector('[data-order-wrong]') : null;
    let picked = [];
    const resetTiles = () => {
      picked = [];
      tiles.forEach((tile) => {
        tile.classList.remove('is-picked');
        tile.removeAttribute('data-pick');
      });
    };
    tiles.forEach((tile) => {
      tile.addEventListener('click', () => {
        if (tile.classList.contains('is-picked')) return;
        tile.classList.add('is-picked');
        tile.setAttribute('data-pick', String(picked.length + 1));
        picked.push(tile);
        if (picked.length < tiles.length) return;
        const correct = picked.every((t, i) => Number(t.getAttribute('data-order')) === i + 1);
        if (fbRight) fbRight.hidden = !correct;
        if (fbWrong) fbWrong.hidden = correct;
        if (!correct) {
          game.classList.add('is-shake');
          window.setTimeout(() => {
            game.classList.remove('is-shake');
            resetTiles();
          }, 900);
        }
      });
    });
  });

  // "Continue" tease for a stop that isn't built yet.
  const nextBtn = el.querySelector('[data-trail-next]');
  const nextNote = el.querySelector('[data-trail-next-note]');
  nextBtn?.addEventListener('click', () => {
    nextNote?.removeAttribute('hidden');
    nextBtn.classList.add('is-teased');
    window.setTimeout(() => nextBtn.classList.remove('is-teased'), 700);
  });

  return {
    el,
    stepCount: STEPS,
    getStep: () => step,
    scrollToStep,
    reset() {
      sizeTrack(); // the story has just been unhidden — measure for real now
      el.scrollTop = 0;
      step = -1;
      setStep(0);
    },
  };
}

function initStories() {
  storyEls.forEach((el) => {
    const api = setupStory(el);
    if (api) storyApis[el.getAttribute('data-trail-story')] = api;
  });

  // One wheel rule for the whole scene:
  //  - Intro & Full View → the event reaches Pannellum untouched, so its
  //    native scroll/pinch zoom works exactly like the Virtual Tour page.
  //  - Reading a stop   → we capture the wheel before Pannellum sees it and
  //    glide the active story instead (smoothed via GSAP), wherever the
  //    cursor is, so the panorama gaps scroll too.
  window.addEventListener('wheel', (e) => {
    if (isImmersive()) return; // native Pannellum zoom
    if (state.mode === 'intro' || !activeStoryEl || activeStoryEl.hidden) return;
    // Inner scroll areas (rules box), the artifact viewer, and 3D models keep
    // their own native wheel behaviour.
    if (e.target && e.target.closest && e.target.closest('.trailx__scrollbox, .trailx-memory, .trailx-preview, .trailx-doc, model-viewer')) return;
    e.preventDefault();
    e.stopPropagation(); // keep Pannellum's mouseZoom out of reading mode
    // ×1.5 so each wheel notch travels further — chapters arrive sooner.
    smoothScrollBy((e.deltaMode === 1 ? e.deltaY * 33 : e.deltaY) * 1.5);
  }, { passive: false, capture: true });

  // Touch scroll driver. iOS Safari/Chrome (WebKit) will NOT scroll a
  // pointer-events:none container even through its children, unlike Android
  // (Blink) — so on iPhone the story never scrolled. We drive it ourselves on
  // both platforms: a vertical drag scrolls the active story (with a momentum
  // fling); a horizontal drag falls through so "drag to look around" still
  // rotates the 360.
  const inExcluded = (t) => !!(t && t.closest && t.closest('.trailx__scrollbox, .trailx-memory, .trailx-preview, .trailx-doc, model-viewer'));
  let tStartY = 0;
  let tStartX = 0;
  let tLastY = 0;
  let tLastT = 0;
  let tVel = 0;
  let tIntent = 'none'; // 'none' | 'scroll' | 'pano'
  let tSkip = false;
  window.addEventListener('touchstart', (e) => {
    tIntent = 'none';
    tSkip = isImmersive() || state.mode === 'intro' || !activeStoryEl || activeStoryEl.hidden ||
      e.touches.length !== 1 || inExcluded(e.target);
    if (tSkip) return;
    tStartY = tLastY = e.touches[0].clientY;
    tStartX = e.touches[0].clientX;
    tVel = 0;
    tLastT = performance.now();
    if (window.gsap) window.gsap.killTweensOf(activeStoryEl);
    scrollGoal = null;
  }, { passive: true });
  window.addEventListener('touchmove', (e) => {
    if (tSkip || e.touches.length !== 1) return;
    const y = e.touches[0].clientY;
    const x = e.touches[0].clientX;
    if (tIntent === 'none') {
      const dy = Math.abs(y - tStartY);
      const dx = Math.abs(x - tStartX);
      if (dy < 6 && dx < 6) return;         // wait for a meaningful move
      tIntent = dx > dy ? 'pano' : 'scroll'; // lock intent for the gesture
    }
    if (tIntent !== 'scroll') return;        // horizontal → panorama rotates
    const now = performance.now();
    const stepDy = y - tLastY;
    activeStoryEl.scrollTop -= stepDy;       // finger down → earlier content
    tVel = stepDy / Math.max(1, now - tLastT);
    tLastY = y;
    tLastT = now;
    e.preventDefault();                      // stop the panorama from also moving
  }, { passive: false });
  window.addEventListener('touchend', () => {
    if (tSkip || tIntent !== 'scroll') return;
    if (Math.abs(tVel) > 0.06) smoothScrollBy(-tVel * 200); // momentum fling
  }, { passive: true });

  // Keyboard: arrows / page / space step through the active stop's chapters.
  window.addEventListener('keydown', (e) => {
    const api = storyApis[state.mode];
    if (!api || api.el !== activeStoryEl || api.el.hidden || isImmersive()) return;
    if (e.target && e.target.closest && e.target.closest('button, a, input, select, textarea')) return;
    if (e.key === 'ArrowDown' || e.key === 'PageDown' || e.key === ' ') {
      e.preventDefault();
      api.scrollToStep(Math.min(api.stepCount - 1, api.getStep() + 1));
    } else if (e.key === 'ArrowUp' || e.key === 'PageUp') {
      e.preventDefault();
      api.scrollToStep(Math.max(0, api.getStep() - 1));
    }
  });

  // Stop-to-stop travel (e.g. Stop 1's "Continue to Stop 2").
  root.querySelectorAll('[data-trail-goto]').forEach((btn) => {
    btn.addEventListener('click', () => transitionToStop(btn.getAttribute('data-trail-goto')));
  });
}

/* --- Cursor glow ------------------------------------------------------------- */
if (cursorGlow && !prefersReducedMotion) {
  const pos = { x: innerWidth / 2, y: innerHeight / 2 };
  const goal = { ...pos };
  let moved = false;
  window.addEventListener('pointermove', (e) => {
    goal.x = e.clientX; goal.y = e.clientY;
    if (!moved) { moved = true; cursorGlow.classList.add('is-on'); }
  }, { passive: true });
  const follow = () => {
    pos.x += (goal.x - pos.x) * 0.16;
    pos.y += (goal.y - pos.y) * 0.16;
    cursorGlow.style.transform = `translate3d(${pos.x}px, ${pos.y}px, 0)`;
    window.requestAnimationFrame(follow);
  };
  follow();
}

/* --- Ana's 3D stage ---------------------------------------------------------- */
function initCharacter() {
  if (!canvasWrap) return;
  const modelUrl = root.getAttribute('data-model-url') || '';
  const BASE_ROT_Y = -Math.PI / 2; // GLB authored facing screen-right → face camera
  // Mobile uses the landing page's exact camera recipe so Ana's size and
  // position match it: FOV 34, distance 4.1 × a viewport-height compensation,
  // camera at y 1.42 looking at 1.4, a 35% swing toward her, and an edge-hug
  // stance at 92% / 8% with the same swing compensation. Desktop keeps this
  // page's own framing. Everything is recomputed live on resize/breakpoint
  // change (e.g. DevTools device emulation), never frozen at load time.
  const mobileQuery = window.matchMedia('(max-width: 820px)');
  let mobile = mobileQuery.matches;
  let FOV = 32;
  let CAM_Z = 3.1;
  let CAM_Y = 1.5;
  let LOOK_AT_Y = 1.35;
  let LOOK = 0.2; // how far the camera swings toward Ana
  const SIDE_PCT = { right: 92, left: 8 }; // mobile edge-hug (landing values)
  const DESKTOP_X = 1.15; // desktop keeps her original fixed stance
  let currentSide = 'right';
  const modelTarget = { x: 0, rotY: BASE_ROT_Y - 0.42 };
  let renderer, scene, camera, mixer, clock, avatar;
  let idleAction = null;
  let gestureAction = null;
  let gestureFadingBack = false;
  const gestures = {};
  const pointer = { x: 0, y: 0 };

  const computeCamera = () => {
    mobile = mobileQuery.matches;
    FOV = mobile ? 34 : 32;
    const zoomComp = Math.min(1.75, Math.max(0.85, window.innerHeight / 900));
    CAM_Z = mobile ? 4.1 * zoomComp : 3.1;
    CAM_Y = mobile ? 1.42 : 1.5;
    LOOK_AT_Y = mobile ? 1.4 : 1.35;
    LOOK = mobile ? 0.35 : 0.2;
    if (camera) {
      camera.fov = FOV;
      camera.position.z = CAM_Z;
      camera.updateProjectionMatrix();
    }
  };
  computeCamera();

  // Mobile: landing formula — screen % → world X, undoing the camera's
  // partial swing toward her, so she hugs the edge exactly like the landing.
  const worldXAt = (pct) => {
    const aspect = Math.max(canvasWrap.clientWidth, 1) / Math.max(canvasWrap.clientHeight, 1);
    const halfW = Math.tan((FOV * Math.PI) / 360) * CAM_Z * aspect;
    return (((pct - 50) / 50) * halfW) / (1 - LOOK);
  };
  const applySide = () => {
    modelTarget.x = mobile
      ? worldXAt(SIDE_PCT[currentSide])
      : (currentSide === 'right' ? DESKTOP_X : -DESKTOP_X);
    // Face the camera, angled slightly toward the text panel (landing values).
    modelTarget.rotY = BASE_ROT_Y + (currentSide === 'right' ? -0.42 : 0.42);
  };
  applySide();
  charApi.setSide = (side) => {
    currentSide = side === 'left' ? 'left' : 'right';
    applySide();
  };

  // Publish Ana's on-screen X (%) so the bubble + glow center on her. Runs
  // every frame with her LIVE position, so it stays glued to the model even
  // through the slide-in, side changes and camera parallax.
  const anaProbe = new THREE.Vector3();
  const projectAnaX = (worldX) => {
    if (!camera) return;
    anaProbe.set(typeof worldX === 'number' ? worldX : modelTarget.x, 1.0, 0);
    anaProbe.project(camera);
    const pct = Math.min(92, Math.max(8, (anaProbe.x * 0.5 + 0.5) * 100));
    root.style.setProperty('--tx-ana-x', `${pct.toFixed(1)}%`);
  };

  try {
    scene = new THREE.Scene();
    const w = Math.max(canvasWrap.clientWidth, 1);
    const h = Math.max(canvasWrap.clientHeight, 1);
    camera = new THREE.PerspectiveCamera(FOV, w / h, 0.1, 100);
    camera.position.set(0, CAM_Y, CAM_Z);
    camera.lookAt(modelTarget.x * LOOK, LOOK_AT_Y, 0);

    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.8));
    renderer.setSize(w, h, false);
    if ('outputColorSpace' in renderer && THREE.SRGBColorSpace) renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.05;
    canvasWrap.appendChild(renderer.domElement);

    scene.add(new THREE.HemisphereLight(0xffe9c8, 0x21160c, 1.0));
    const key = new THREE.DirectionalLight(0xffd9a6, 1.6);
    key.position.set(2.5, 4, 3);
    scene.add(key);
    const rim = new THREE.DirectionalLight(0xd4af6a, 0.85);
    rim.position.set(-3, 2, -2);
    scene.add(rim);

    clock = new THREE.Clock();

    const onResize = () => {
      const nw = Math.max(canvasWrap.clientWidth, 1);
      const nh = Math.max(canvasWrap.clientHeight, 1);
      renderer.setSize(nw, nh, false);
      computeCamera();  // desktop ↔ mobile rig (FOV/distance/height/swing) live
      camera.aspect = nw / nh;
      camera.position.y = CAM_Y;
      camera.updateProjectionMatrix();
      applySide(); // re-derive her world X from the new aspect ratio + rig
      projectAnaX();
    };
    window.addEventListener('resize', onResize);
    // Also react when the breakpoint itself flips (device emulation, rotate).
    if (mobileQuery.addEventListener) mobileQuery.addEventListener('change', onResize);
    else if (mobileQuery.addListener) mobileQuery.addListener(onResize);
    projectAnaX();
    if (!prefersReducedMotion) {
      window.addEventListener('pointermove', (e) => {
        pointer.x = (e.clientX / innerWidth) * 2 - 1;
        pointer.y = (e.clientY / innerHeight) * 2 - 1;
      }, { passive: true });
    }

    const playGesture = (name) => {
      const action = gestures[name];
      if (!action || !idleAction || (gestureAction && gestureAction.isRunning())) return;
      gestureAction = action;
      gestureFadingBack = false;
      action.reset().play();
      idleAction.crossFadeTo(action, 0.4, false);
    };

    // Let the Begin choreography replay her entrance for Stop 1: she re-enters
    // from the edge of whichever side she'll stand on.
    charApi.reenter = () => {
      applySide();
      if (avatar && !prefersReducedMotion) {
        avatar.position.x = modelTarget.x + (currentSide === 'right' ? 2.6 : -2.6);
      }
    };
    charApi.playGesture = playGesture;

    const animate = () => {
      window.requestAnimationFrame(animate);
      const dt = Math.min(clock.getDelta(), 0.05);
      if (mixer) {
        if (gestureAction && idleAction && gestureAction.isRunning() && !gestureFadingBack &&
            gestureAction.getClip().duration - gestureAction.time <= 0.6) {
          gestureFadingBack = true;
          idleAction.reset().play();
          gestureAction.crossFadeTo(idleAction, 0.6, false);
        }
        mixer.update(dt);
      }
      if (avatar) {
        // Glide toward her target side (also covers the entrance, since she
        // starts off-screen) — the landing's continuous easing.
        if (prefersReducedMotion) {
          avatar.position.x = modelTarget.x;
          avatar.rotation.y = modelTarget.rotY;
        } else {
          const sway = state.playing ? Math.sin(clock.elapsedTime * 1.4) * 0.05 : 0;
          avatar.position.x += (modelTarget.x - avatar.position.x) * Math.min(1, dt * 2.2);
          avatar.rotation.y += (modelTarget.rotY + sway - avatar.rotation.y) * Math.min(1, dt * 3);
        }
      }
      const lookX = (avatar ? avatar.position.x : modelTarget.x) * LOOK;
      if (!prefersReducedMotion) {
        camera.position.x += (lookX + pointer.x * 0.08 - camera.position.x) * Math.min(1, dt * 2);
        camera.position.y += (CAM_Y - pointer.y * (mobile ? 0.04 : 0.05) - camera.position.y) * Math.min(1, dt * 2);
      }
      camera.lookAt(lookX, LOOK_AT_Y, 0);
      if (avatar) projectAnaX(avatar.position.x); // keep bubble/glow centered on her
      renderer.render(scene, camera);
    };
    animate();

    if (modelUrl) {
      const loader = new GLTFLoader();
      loader.load(modelUrl, (gltf) => {
        const model = gltf.scene || (gltf.scenes && gltf.scenes[0]);
        if (!model) return;
        model.traverse((o) => { if (o.isMesh || o.isSkinnedMesh) o.frustumCulled = false; });
        const box = new THREE.Box3().setFromObject(model);
        const size = new THREE.Vector3(); const center = new THREE.Vector3();
        box.getSize(size); box.getCenter(center);
        const scale = size.y > 0 ? 2.0 / size.y : 1;
        model.scale.setScalar(scale);
        model.position.x -= center.x * scale;
        model.position.z -= center.z * scale;
        model.position.y -= box.min.y * scale;
        avatar = new THREE.Group();
        avatar.add(model);
        avatar.rotation.y = modelTarget.rotY;
        avatar.position.x = modelTarget.x + (prefersReducedMotion ? 0 : 2.6); // start off-right
        scene.add(avatar);

        if (gltf.animations && gltf.animations.length) {
          mixer = new THREE.AnimationMixer(model);
          idleAction = mixer.clipAction(gltf.animations[0]);
          idleAction.setLoop(THREE.LoopRepeat, Infinity);
          idleAction.play();
          ['greet', 'heart', 'look'].forEach((name) => {
            const url = root.getAttribute(`data-${name}-url`) || '';
            if (!url) return;
            loader.load(url, (g2) => {
              if (!g2.animations || !g2.animations.length) return;
              const a = mixer.clipAction(g2.animations[0]);
              a.setLoop(THREE.LoopOnce, 1);
              a.clampWhenFinished = true;
              gestures[name] = a;
              if (name === 'greet') window.setTimeout(() => playGesture('greet'), cameFromLanding ? 900 : 400);
            });
          });
        }
      }, undefined, (err) => console.warn('[Trail] Ana model failed:', err));
    }

    canvasWrap.addEventListener('click', () => playGesture('heart'));
  } catch (err) {
    console.warn('[Trail] 3D stage unavailable; scene still works.', err);
  }
}

/* --- Stacked document viewer (Stop 5 · Plasencia) ---------------------------
   "View Documents" opens the source pages as a deck: the front page shows on
   top; tapping it tosses it to the back and brings the next forward, cycling
   through all four. Close with the ✕ below (landing lightbox pattern) or the
   backdrop / Esc. */
function initDocViewer() {
  const triggers = Array.from(root.querySelectorAll('[data-trail-docs]'));
  if (!triggers.length) return;
  let overlay = null;
  let deck = null;
  let cards = []; // current stacking order — index 0 is the front page
  let animating = false;

  const relayout = () => {
    cards.forEach((card, i) => {
      // Fan the back pages UP-left, away from the hint/close row below.
      card.style.zIndex = String(100 - i);
      card.style.transform = `translateY(${-i * 12}px) scale(${(1 - i * 0.05).toFixed(3)}) rotate(${(-i * 0.5).toFixed(2)}deg)`;
      card.style.opacity = i > 3 ? '0' : String(Math.max(0, 1 - i * 0.16).toFixed(2));
      card.style.pointerEvents = i === 0 ? 'auto' : 'none';
    });
  };

  const toss = () => {
    if (animating || cards.length < 2) return;
    animating = true;
    const front = cards[0];
    front.style.transition = 'transform 0.42s cubic-bezier(0.5, 0, 0.2, 1), opacity 0.42s ease';
    front.style.transform = 'translateY(-46%) scale(0.86) rotate(-7deg)';
    front.style.opacity = '0';
    const done = () => {
      front.removeEventListener('transitionend', done);
      cards.push(cards.shift());  // front → back of the deck
      front.style.transition = 'none';
      relayout();                 // snaps to the back (dimmed, scaled)
      window.requestAnimationFrame(() => {
        cards.forEach((c) => { c.style.transition = ''; });
        animating = false;
      });
    };
    front.addEventListener('transitionend', done);
  };

  const hideDoc = () => {
    if (!overlay) return;
    overlay.classList.remove('is-open');
    overlay.hidden = true;
    animating = false;
  };

  const ensureOverlay = () => {
    if (overlay) return;
    overlay = document.createElement('div');
    overlay.className = 'trailx-doc';
    overlay.hidden = true;
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-modal', 'true');
    overlay.setAttribute('aria-label', 'Document viewer');
    deck = document.createElement('div');
    deck.className = 'trailx-doc__deck';
    const hint = document.createElement('p');
    hint.className = 'trailx-doc__hint';
    hint.innerHTML = '<span data-lang-en>Tap the page to see the next</span><span data-lang-tl>Pindutin ang pahina para sa susunod</span>';
    const close = document.createElement('button');
    close.className = 'trailx-xclose trailx-doc__close';
    close.type = 'button';
    close.setAttribute('aria-label', 'Close documents');
    close.textContent = '✕';
    close.addEventListener('click', hideDoc);
    overlay.addEventListener('click', (e) => { if (e.target === overlay) hideDoc(); });
    overlay.appendChild(deck);
    overlay.appendChild(hint);
    overlay.appendChild(close);
    root.appendChild(overlay);
  };

  const build = (urls) => {
    ensureOverlay();
    deck.innerHTML = '';
    animating = false;
    cards = urls.map((url, i) => {
      const card = document.createElement('button');
      card.type = 'button';
      card.className = 'trailx-doc__card';
      card.setAttribute('aria-label', `Document page ${i + 1} of ${urls.length} — tap for the next`);
      const img = document.createElement('img');
      img.src = url;
      img.alt = `Document page ${i + 1}`;
      img.draggable = false;
      card.appendChild(img);
      card.addEventListener('click', toss);
      deck.appendChild(card);
      return card;
    });
    relayout();
    overlay.hidden = false;
    window.requestAnimationFrame(() => overlay.classList.add('is-open'));
  };

  triggers.forEach((btn) => {
    btn.addEventListener('click', () => {
      const urls = (btn.getAttribute('data-trail-docs') || '').split(',').map((u) => u.trim()).filter(Boolean);
      if (urls.length) build(urls);
    });
  });
  window.addEventListener('keydown', (e) => { if (e.key === 'Escape') hideDoc(); });
}

/* --- "Larawan ng Panahon" — era photo albums (Stop 6) -------------------------
   Historical photographs of the cemetery grouped by era, presented as a
   documentary-style album: a year rail on top, one photo at a time with a slow
   Ken Burns drift and a vintage vignette, its one-sentence caption below, and
   swipe / arrow navigation. Buttons stay hidden until an album has photos.

   TO ADD PHOTOS: fill in the eras below. Each photo is
     { src: 'https://…/Photo.jpg', caption: { en: 'One sentence.', tl: 'Isang pangungusap.' } }
   (caption may also be a plain string if there is no translation). ----------- */
const HT_PICS = '/images/heritage-albums';
const TIME_ALBUMS = {
  renovation: {
    title: { en: 'The Restorations', tl: 'Ang mga Pagsasaayos' },
    eras: [
      { label: '1982–1986', photos: [
        { src: `${HT_PICS}/1982-1981_1.png`, caption: { tl: 'Tarangkahan ng libingan, Agosto.', en: 'Gate of the cemetery, August.' } },
        { src: `${HT_PICS}/1982-1981_2.png`, caption: { tl: 'Harap ng kapilya.', en: 'Facade of the chapel, August.' } },
        { src: `${HT_PICS}/1982-1981_3.png`, caption: { tl: 'Nilinisan at muling pininturahan ang altar.', en: 'Altar was cleaned and repainted.' } },
        { src: `${HT_PICS}/1982-1981_4.png`, caption: { tl: 'Inayos ang bubong at mga barakilan at naglagay ng mga bagong tisa.', en: 'The roof was repaired, beams were treated, and roof tiles were installed.' } },
        { src: `${HT_PICS}/1982-1981_5.png`, caption: { tl: 'Inilatag ang maayos na daluyang-tubig.', en: 'Proper drainage was laid out.' } },
        { src: `${HT_PICS}/1982-1981_6.png`, caption: { tl: 'Nilinis ang mga tambak ng kripta.', en: 'Rubbles were removed from the crypt.' } },
        { src: `${HT_PICS}/1982-1981_7.png`, caption: { tl: 'Ang mga daanan ay nilatagan ng mga ladrilyong mula sa ginibang Insular Ice Plant sa Maynila.', en: 'The walkways were paved with clay bricks from the demolished Insular Ice Plant in Manila.' } },
        { src: `${HT_PICS}/1982-1981_8.png`, caption: { tl: 'Inilatag ang mga poste ng ilaw sa mga daan.', en: 'Lamp posts were placed on the walkways.' } },
      ] },
      { label: { en: 'Feb–Oct 2008', tl: 'Peb–Okt 2008' }, photos: [
        { src: `${HT_PICS}/PebOk-2008_1.png`, caption: { tl: 'Tarangkahan ng Libingan, Pebrero.', en: 'Gate of the cemetery, February.' } },
        { src: `${HT_PICS}/PebOk-2008_2.png`, caption: { tl: 'Harap ng kapilya, Oktubre.', en: 'Facade of the chapel, October.' } },
        { src: `${HT_PICS}/PebOk-2008_3.png`, caption: { tl: 'Nilinisan ang tarangkahan at bakod, inalis ang mga ligaw na halaman at inayos ang altar.', en: 'Gate and fence were cleaned, growths were cleared, and the altar was restored.' } },
      ] },
      { label: { en: 'Feb–Oct 2015–2016', tl: 'Peb–Okt 2015–2016' }, photos: [
        { src: `${HT_PICS}/PebOk-2015-2016_1.png`, caption: { tl: 'Tarangkahan ng libingan, Pebrero.', en: 'Gate of the cemetery, February.' } },
        { src: `${HT_PICS}/PebOk-2015-2016_2.png`, caption: { tl: 'Harap ng Kapilya, Oktubre.', en: 'Facade of the chapel, October.' } },
        { src: `${HT_PICS}/PebOk-2015-2016_3.png`, caption: { tl: 'Inayos ang bakal ng tarangkahan.', en: 'The iron gate was repaired.' } },
        { src: `${HT_PICS}/PebOk-2015-2016_4.png`, caption: { tl: 'Inayos ang tarangkahan at inalis ang mga ligaw na halaman.', en: 'The gate was cleaned and growths were cleared.' } },
        { src: `${HT_PICS}/PebOk-2015-2016_5.png`, caption: { tl: 'Naglagay ng bagong mga pananggang bakal sa mga pako.', en: 'New iron stoppers were placed on the nails.' } },
        { src: `${HT_PICS}/PebOk-2015-2016_6.png`, caption: { tl: 'Nilinisan ang bubong at ang harap ng kapilya.', en: 'The roof and the facade of the chapel were cleaned.' } },
        { src: `${HT_PICS}/PebOk-2015-2016_7.png`, caption: { tl: 'Ang bulwagan sa tagiliran ay inayos at nilakihan.', en: 'The gallery at the side was repaired and expanded.' } },
        { src: `${HT_PICS}/PebOk-2015-2016_8.png`, caption: { tl: 'Naglapat ng bagong palitada para sa muling pagpintura ng nasirang bahagi ng dingding.', en: 'New plaster was prepared to repaint the damaged parts of the wall.' } },
      ] },
    ],
  },
  deterioration: {
    title: { en: 'The Deterioration', tl: 'Ang Pagkasira' },
    eras: [
      { label: '1911', photos: [
        { src: `${HT_PICS}/1911_1.png`, caption: { tl: 'Tarangkahan ng libingan.', en: 'Gate of the cemetery.' } },
        { src: `${HT_PICS}/1911_2.png`, caption: { tl: 'Harap ng Kapilya.', en: 'Facade of the chapel.' } },
      ] },
      { label: '1982', photos: [
        { src: `${HT_PICS}/1982_1.png`, caption: { tl: 'Kumupas na pintura ng kisame.', en: 'Faded paint on the ceiling.' } },
        { src: `${HT_PICS}/1982_2.png`, caption: { tl: 'Mga bahagi ng dingding na kumupas na ang pintura.', en: 'Walls with areas of faded paint.' } },
        { src: `${HT_PICS}/1982_3.png`, caption: { tl: 'Kumupas na pintura ng altar.', en: 'Faded paint on the altar.' } },
        { src: `${HT_PICS}/1982_4.png`, caption: { tl: 'Sinirang dingding ng kripta.', en: 'Vandalized crypt wall.' } },
      ] },
      { label: '1983', photos: [
        { src: `${HT_PICS}/1983_1.png`, caption: { tl: 'Nabubulok na kahoy.', en: 'Rotting wood.' } },
        { src: `${HT_PICS}/1983_2.png`, caption: { tl: 'Nabubulok na pintuan at kinakalawang na bisagra.', en: 'Rotten door and rusted hinges.' } },
      ] },
      { label: '2000', photos: [
        { src: `${HT_PICS}/2000_1.png`, caption: { tl: 'Bahagi ng kisame ng kripta na may natuklap na palitada.', en: 'Portion of the crypt ceiling with chipped-off plaster.' } },
        { src: `${HT_PICS}/2000_2.png`, caption: { tl: 'Nangitim at nilumot na bakod ng bato at nawawalang palamuti nito.', en: 'Darkened stone fence with moss and lichens and missing decorative parts.' } },
        { src: `${HT_PICS}/2000_3.png`, caption: { tl: 'Tarangkahang tinubuan na ng mga ligaw na halaman.', en: 'Gate with plant growth.' } },
        { src: `${HT_PICS}/2000_4.png`, caption: { tl: 'Kinakalawang na bubong.', en: 'Rusted roof.' } },
        { src: `${HT_PICS}/2000_5.png`, caption: { tl: 'Nilulumot na dingding.', en: 'Walls with algae.' } },
        { src: `${HT_PICS}/2000_6.png`, caption: { tl: 'Sirang bintana.', en: 'Broken window.' } },
        { src: `${HT_PICS}/2000_7.png`, caption: { tl: 'Mga bitak sa dingding.', en: 'Cracks on the walls.' } },
        { src: `${HT_PICS}/2000_8.png`, caption: { tl: 'Bintana at dingding ng kripta na namantsahan ng tubig.', en: 'Water-stained window and wall of the crypt.' } },
      ] },
    ],
  },
};

function initTimeAlbums() {
  const triggers = Array.from(root.querySelectorAll('[data-trail-album]'));
  if (!triggers.length) return;

  // Bilingual helper: {en, tl} → language-switched spans; strings pass through.
  const bi = (v) => {
    if (v && typeof v === 'object') {
      return `<span data-lang-en>${v.en || v.tl}</span><span data-lang-tl>${v.tl || v.en}</span>`;
    }
    return v || '';
  };

  let overlay = null;
  let imgEl = null;
  let capEl = null;
  let metaEl = null;
  let erasEl = null;
  let titleEl = null;
  let flat = [];      // [{ src, caption, eraIdx, nth, of }]
  let eraBtns = [];
  let cur = 0;

  const ensureOverlay = () => {
    if (overlay) return;
    overlay = document.createElement('div');
    overlay.className = 'trailx-album';
    overlay.hidden = true;
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-modal', 'true');
    overlay.setAttribute('aria-label', 'Historical photographs');

    erasEl = document.createElement('nav');
    erasEl.className = 'trailx-album__eras';

    const stage = document.createElement('div');
    stage.className = 'trailx-album__stage';
    const prev = document.createElement('button');
    prev.type = 'button';
    prev.className = 'trailx-album__nav trailx-album__nav--prev';
    prev.setAttribute('aria-label', 'Previous photograph');
    prev.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" d="M15 5l-7 7 7 7"/></svg>';
    const frame = document.createElement('figure');
    frame.className = 'trailx-album__frame';
    imgEl = document.createElement('img');
    imgEl.className = 'trailx-album__img';
    imgEl.alt = '';
    imgEl.draggable = false;
    const vintage = document.createElement('span');
    vintage.className = 'trailx-album__vintage';
    frame.appendChild(imgEl);
    frame.appendChild(vintage);
    const next = document.createElement('button');
    next.type = 'button';
    next.className = 'trailx-album__nav trailx-album__nav--next';
    next.setAttribute('aria-label', 'Next photograph');
    next.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" d="M9 5l7 7-7 7"/></svg>';
    stage.appendChild(prev);
    stage.appendChild(frame);
    stage.appendChild(next);

    capEl = document.createElement('p');
    capEl.className = 'trailx-album__caption';
    metaEl = document.createElement('p');
    metaEl.className = 'trailx-album__meta';
    titleEl = document.createElement('p');
    titleEl.className = 'trailx-album__title';

    const close = document.createElement('button');
    close.type = 'button';
    close.className = 'trailx-xclose trailx-album__close';
    close.setAttribute('aria-label', 'Close photographs');
    close.textContent = '✕';

    overlay.appendChild(erasEl);
    overlay.appendChild(stage);
    overlay.appendChild(capEl);
    overlay.appendChild(metaEl);
    overlay.appendChild(titleEl);
    overlay.appendChild(close);
    root.appendChild(overlay);

    const hide = () => {
      overlay.classList.remove('is-open');
      overlay.hidden = true;
    };
    close.addEventListener('click', hide);
    prev.addEventListener('click', () => show(cur - 1));
    next.addEventListener('click', () => show(cur + 1));
    frame.addEventListener('click', () => show(cur + 1)); // tapping the photo advances
    window.addEventListener('keydown', (e) => {
      if (overlay.hidden) return;
      if (e.key === 'Escape') hide();
      else if (e.key === 'ArrowRight') show(cur + 1);
      else if (e.key === 'ArrowLeft') show(cur - 1);
    });
    // Swipe left/right on the photo (phones).
    let touchX = null;
    stage.addEventListener('touchstart', (e) => { touchX = e.touches[0].clientX; }, { passive: true });
    stage.addEventListener('touchend', (e) => {
      if (touchX === null) return;
      const dx = e.changedTouches[0].clientX - touchX;
      touchX = null;
      if (Math.abs(dx) > 40) show(dx < 0 ? cur + 1 : cur - 1);
    }, { passive: true });
  };

  const show = (i) => {
    if (!flat.length) return;
    cur = (i + flat.length) % flat.length; // wraps around at both ends
    const ph = flat[cur];
    // Crossfade + restart the slow documentary drift for the incoming photo.
    imgEl.classList.remove('is-live');
    imgEl.style.opacity = '0';
    const reveal = () => {
      imgEl.removeEventListener('load', reveal);
      imgEl.style.opacity = '1';
      if (!prefersReducedMotion) {
        void imgEl.offsetWidth; // restart the Ken Burns animation
        imgEl.classList.add('is-live');
      }
    };
    imgEl.addEventListener('load', reveal);
    imgEl.src = ph.src;
    if (imgEl.complete) reveal();
    capEl.innerHTML = bi(ph.caption);
    metaEl.innerHTML = `${bi(ph.eraLabel)} · ${ph.nth} / ${ph.of}`;
    eraBtns.forEach((b, bi2) => b.classList.toggle('is-active', bi2 === ph.eraIdx));
    const nxt = flat[(cur + 1) % flat.length];
    if (nxt) { const pre = new Image(); pre.src = nxt.src; } // preload the next page
  };

  const open = (key) => {
    const album = TIME_ALBUMS[key];
    if (!album) return;
    ensureOverlay();
    // Flatten the eras into one continuous reel, remembering each photo's era.
    flat = [];
    album.eras.forEach((era, eraIdx) => {
      const photos = (era.photos || []).filter((p) => p && p.src);
      photos.forEach((p, j) => {
        flat.push({ src: p.src, caption: p.caption || '', eraLabel: era.label, eraIdx, nth: j + 1, of: photos.length });
      });
    });
    if (!flat.length) return;
    erasEl.innerHTML = '';
    eraBtns = album.eras.map((era, eraIdx) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'trailx-album__era';
      b.innerHTML = bi(era.label);
      b.addEventListener('click', () => {
        const first = flat.findIndex((p) => p.eraIdx === eraIdx);
        if (first !== -1) show(first);
      });
      b.hidden = !flat.some((p) => p.eraIdx === eraIdx);
      erasEl.appendChild(b);
      return b;
    });
    titleEl.innerHTML = bi(album.title);
    overlay.hidden = false;
    window.requestAnimationFrame(() => overlay.classList.add('is-open'));
    show(0);
  };

  triggers.forEach((btn) => {
    const key = btn.getAttribute('data-trail-album');
    const album = TIME_ALBUMS[key];
    const count = album ? album.eras.reduce((n, e) => n + (e.photos || []).filter((p) => p && p.src).length, 0) : 0;
    btn.hidden = count === 0; // appears as soon as photos are added above
    btn.addEventListener('click', () => open(key));
  });
}

/* --- Boot -------------------------------------------------------------------- */
narrate({ speakIt: false }); // seed the bubble
initPanorama();
initCharacter();
initStories();
initDocViewer();
initTimeAlbums();
if (wantsStop && STOP_CONF[wantsStop]) enterStop(wantsStop, { history: 'replace' }); // refresh → restore the stop
attemptAutoSpeak();          // auto-play like the landing page…
setupAutoSpeakKickstart();   // …or on the very first tap if the browser blocks it
