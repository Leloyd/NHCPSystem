export interface Artifact {
  id: string;
  title: string;
  shortDescription: string;
  fullDescription: string;
  category: string;
  period: string;
  origin: string;
  material: string;
  culturalSignificance: string;
  image: string;
  featured?: boolean;
}

export const categories = [
  "All Artifacts",
  "Ceramics",
  "Tools",
  "Textiles",
  "Religious Objects",
  "Memorial Objects",
  "Jewelry",
  "Manuscripts",
  "Coins",
  "Paintings",
];

export const artifacts: Artifact[] = [
  {
    id: "1",
    title: "Ritual Earthenware Vessel",
    shortDescription:
      "A hand-coiled ceremonial pottery used in ancestral rites and communal feasting traditions.",
    fullDescription:
      "This remarkable earthenware vessel was discovered in the highlands and dates back to the early pre-colonial period. Hand-coiled using locally sourced clay and fired at low temperatures, it exhibits characteristic geometric incisions along its body — symbolic patterns believed to invoke ancestral spirits during communal rites. The vessel was likely used to hold fermented rice wine (tapuy) during harvest festivals and marriage ceremonies. Its compact form and wide mouth suggest it was also used as a communal serving piece. The reddish-brown surface patina is a result of centuries of burial and soil mineral interaction, preserving an extraordinary snapshot of early community life.",
    category: "Ceramics",
    period: "9th–12th Century",
    origin: "Northern Highlands, Luzon",
    material: "Earthenware clay, natural pigment",
    culturalSignificance:
      "Reflects pre-colonial ceremonial practices and the central role of communal gathering in indigenous societies. Considered a sacred object by descendant communities.",
    image:
      "https://images.unsplash.com/photo-1775057194807-f97e2080c797?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxhbmNpZW50JTIwY2VyYW1pYyUyMHBvdHRlcnklMjBhcnRpZmFjdCUyMG11c2V1bXxlbnwxfHx8fDE3NzgxNzI5MjN8MA&ixlib=rb-4.1.0&q=80&w=1080",
    featured: true,
  },
  {
    id: "2",
    title: "Iron Agricultural Tool Set",
    shortDescription:
      "A collection of hand-forged iron implements used by early farming communities for rice cultivation.",
    fullDescription:
      "This set of iron agricultural tools represents the ingenuity of early blacksmithing traditions in the archipelago. Each tool — a bolo (large knife), a trowel-like implement, and a digging spike — was hand-forged by local pandaysmiths (blacksmiths) using bloomery iron smelting techniques. The ergonomic wooden handles have since deteriorated, but the iron blades remain largely intact, preserved through careful conservation. The tools bear evidence of repeated use and sharpening, indicating these were working implements passed down through generations of a single farming family. Microscopic analysis of the blade edges reveals a sophisticated layered forging technique that increased edge durability.",
    category: "Tools",
    period: "14th–16th Century",
    origin: "Central Visayas",
    material: "Wrought iron, hardwood (handle remnants)",
    culturalSignificance:
      "Documents the advancement of indigenous metallurgy and agricultural productivity in pre-colonial communities. These tools enabled the terraced rice cultivation systems still practiced today.",
    image:
      "https://images.unsplash.com/photo-1759150467270-aa4496d4c61a?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxhbmNpZW50JTIwYnJvbnplJTIwdG9vbHMlMjBoaXN0b3JpY2FsJTIwYXJ0aWZhY3R8ZW58MXx8fHwxNzc4MTcyOTIzfDA&ixlib=rb-4.1.0&q=80&w=1080",
    featured: false,
  },
  {
    id: "3",
    title: "Piña Fiber Ceremonial Cloth",
    shortDescription:
      "An exquisite hand-woven cloth made from pineapple fiber, worn during elite ceremonial occasions.",
    fullDescription:
      "Piña cloth — woven from the fibers of pineapple leaves — represents the pinnacle of indigenous weaving artistry in the archipelago. This particular ceremonial cloth features intricate floral embroidery worked in gold-wrapped thread, likely commissioned by a local datu (chieftain) for use during significant rites of passage. The weaving demonstrates mastery of the hablon technique, producing a translucent, gauze-like fabric of extraordinary delicacy. The preservation of this textile is remarkable given its organic composition; it was recovered from a sealed ceremonial chest, protected from humidity and light. Its dimensions suggest it served as a formal stole or shoulder covering during important gatherings.",
    category: "Textiles",
    period: "18th Century",
    origin: "Western Visayas, Panay Island",
    material: "Piña fiber, gold-wrapped thread, natural dyes",
    culturalSignificance:
      "Represents the sophisticated textile traditions of Visayan elites and the cultural prestige associated with fine weaving. Piña weaving is now recognized as an Intangible Cultural Heritage.",
    image:
      "https://images.unsplash.com/photo-1774679683446-202638a55981?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHx3b3ZlbiUyMHRleHRpbGUlMjBjdWx0dXJhbCUyMGhlcml0YWdlJTIwZmFicmljfGVufDF8fHx8MTc3ODE3MjkyM3ww&ixlib=rb-4.1.0&q=80&w=1080",
    featured: true,
  },
  {
    id: "4",
    title: "Anito Ancestral Figure",
    shortDescription:
      "A carved wooden deity figure used as a medium for communicating with ancestral spirits in indigenous rituals.",
    fullDescription:
      "This anito figure — a carved wooden representation of an ancestral spirit — was used as a spiritual intermediary in animistic religious practices. Standing at approximately 45 centimeters, the figure is carved from molave (Vitex parviflora), a hardwood prized for its durability and resistance to decay. The face bears stylized features with inlaid shell eyes, and the body shows deliberate abstraction of human form. Traces of beeswax and animal fat indicate it was regularly anointed during ritual observances. The figure was likely housed in a dedicated alcove within a community longhouse and consulted by the babaylan (spiritual leader) during times of illness, conflict, or planting cycles.",
    category: "Religious Objects",
    period: "Pre-Colonial, 15th Century",
    origin: "Mindanao",
    material: "Molave wood, shell inlay, beeswax coating",
    culturalSignificance:
      "Embodies the animistic spiritual worldview of pre-colonial indigenous communities. Anito figures represent the ongoing connection between the living and their ancestors.",
    image:
      "https://images.unsplash.com/photo-1670796114644-4cf4a821d663?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxyZWxpZ2lvdXMlMjBzY3VscHR1cmUlMjBnb2xkJTIwYXJ0aWZhY3QlMjBtdXNldW18ZW58MXx8fHwxNzc4MTcyOTI1fDA&ixlib=rb-4.1.0&q=80&w=1080",
    featured: true,
  },
  {
    id: "5",
    title: "Carved Burial Marker Stone",
    shortDescription:
      "A large limestone memorial carved with clan symbols, marking the burial site of a prominent community elder.",
    fullDescription:
      "This carved limestone burial marker was excavated from a secondary burial site in the coastal lowlands. The stone features a series of deeply incised curvilinear motifs — a visual language unique to the culture group that inhabited this region — arranged around a central anthropomorphic figure believed to represent the deceased. Secondary burials (the reburial of bones after initial decomposition) were common practice and indicated high social status. The stone's placement above the burial pit served as both a territorial marker and a spiritual anchor, believed to keep the ancestor's spirit connected to the land and community. Radiocarbon dating places its creation between the 13th and 15th centuries.",
    category: "Memorial Objects",
    period: "13th–15th Century",
    origin: "Eastern Mindanao Coastal Region",
    material: "Limestone",
    culturalSignificance:
      "Provides evidence of sophisticated funerary practices and social stratification in coastal communities. The clan symbols carved into the stone are unique to this specific cultural group.",
    image:
      "https://images.unsplash.com/photo-1772005043644-40873f6f546c?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxhbmNpZW50JTIwc3RvbmUlMjBjYXJ2aW5nJTIwc2N1bHB0dXJlJTIwbWVtb3JpYWx8ZW58MXx8fHwxNzc4MTcyOTI1fDA&ixlib=rb-4.1.0&q=80&w=1080",
    featured: false,
  },
  {
    id: "6",
    title: "Baybayin Writing Tablet",
    shortDescription:
      "A rare bamboo tablet inscribed with the pre-colonial Baybayin script, recording a land agreement.",
    fullDescription:
      "This bamboo tablet is among the very few surviving physical examples of Baybayin — the pre-colonial syllabic writing system used across much of the archipelago before Spanish colonization. The inscription was made using a sharp metal stylus, cutting into the bamboo surface, which was then treated with soot to make the characters visible. Scholars have partially deciphered the text as a record of a land boundary agreement between two datu lineages, specifying natural landmarks as boundary markers. The tablet was preserved within a sealed clay container, protecting it from humidity and insect damage over centuries. Its discovery has significantly contributed to our understanding of indigenous literacy and land tenure systems.",
    category: "Manuscripts",
    period: "Early 17th Century",
    origin: "Tagalog Region, Luzon",
    material: "Bamboo, carbon (soot) pigment",
    culturalSignificance:
      "One of the rarest surviving examples of Baybayin script on an original organic substrate. Demonstrates pre-colonial legal and literacy traditions independent of foreign influence.",
    image:
      "https://images.unsplash.com/photo-1752161669985-b8b1124ee6e8?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxoaXN0b3JpY2FsJTIwbWFudXNjcmlwdCUyMGFuY2llbnQlMjB3cml0aW5nJTIwc2Nyb2xsfGVufDF8fHx8MTc3ODE3MjkyNXww&ixlib=rb-4.1.0&q=80&w=1080",
    featured: true,
  },
  {
    id: "7",
    title: "Golden Funerary Mask",
    shortDescription:
      "A hammered gold mask placed over the face of a deceased nobility figure during burial ceremonies.",
    fullDescription:
      "This extraordinary funerary mask of hammered gold is one of the finest examples of pre-colonial goldsmithing ever discovered. Crafted from locally mined alluvial gold, it was beaten into thin sheets and shaped over a clay mold to conform to human facial features. The eye holes are framed by delicate repoussé borders, and small perforations along the perimeter indicate it was once attached to a burial shroud or headdress. The mask's discovery alongside other prestige items — including gold ornaments, ceramics, and foreign trade goods — suggests the burial of an individual of the highest social rank. Chemical analysis of the gold alloy indicates a purity of approximately 22 karats.",
    category: "Jewelry",
    period: "10th–13th Century",
    origin: "Surigao Region, Mindanao",
    material: "Hammered gold (22-karat alloy)",
    culturalSignificance:
      "Demonstrates the exceptional metalworking skill of pre-colonial artisans and the profound importance of gold in expressing status and spiritual power. Comparable to pieces in the renowned Golden Tara collection.",
    image:
      "https://images.unsplash.com/photo-1762698352739-70a81fa055af?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxhbmNpZW50JTIwamV3ZWxyeSUyMGdvbGQlMjBvcm5hbWVudCUyMGhlcml0YWdlfGVufDF8fHx8MTc3ODE3MjkyNnww&ixlib=rb-4.1.0&q=80&w=1080",
    featured: false,
  },
  {
    id: "8",
    title: "Blue-and-White Trade Porcelain",
    shortDescription:
      "A Chinese trade porcelain vessel reflecting the extensive maritime trade networks of the pre-colonial era.",
    fullDescription:
      "This blue-and-white porcelain jar was produced in the kilns of Jingdezhen, China, during the Yuan or early Ming Dynasty, and made its way to the archipelago through extensive maritime trade networks. The vessel features classic cobalt-blue cloud-and-dragon motifs against a white ground — emblematic of Yuan period export porcelain. Its presence in a local burial site indicates not only trade contact but also the high value placed on foreign prestige goods by local elites. Similar vessels have been found across Southeast Asia, tracing the routes of the ancient maritime Silk Road. This particular jar was repaired in antiquity using gold lacquer repair (a technique akin to Japanese kintsugi), suggesting it was a treasured possession.",
    category: "Ceramics",
    period: "Yuan Dynasty, 13th–14th Century",
    origin: "Jingdezhen, China (recovered locally)",
    material: "Porcelain, cobalt blue pigment",
    culturalSignificance:
      "Physical evidence of the sophisticated maritime trade networks linking the archipelago to China and beyond. Illustrates the cosmopolitan nature of pre-colonial coastal communities.",
    image:
      "https://images.unsplash.com/photo-1776332514405-557bf85af096?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxkZWNvcmF0aXZlJTIwY2VyYW1pYyUyMHZhc2UlMjBhc2lhbiUyMGhlcml0YWdlfGVufDF8fHx8MTc3ODE3MjkyNnww&ixlib=rb-4.1.0&q=80&w=1080",
    featured: false,
  },
  {
    id: "9",
    title: "Piloncitos Gold Coinage",
    shortDescription:
      "The earliest known indigenous currency — small gold currency pieces used in pre-colonial commerce.",
    fullDescription:
      "Piloncitos are the earliest known form of indigenous currency used in the archipelago, predating Spanish colonization by several centuries. These small, hat-shaped gold pieces were produced in standard weights and bear inscribed marks — likely denoting their weight or issuing authority — in a script related to Indian Kawi or early Baybayin. The collection on display spans multiple size variants, from the smallest (roughly equivalent to a modern rice grain) to larger denominations. They were used in commercial transactions, tribute payments, and as components of bride-price (dowry) payments. Their standardized weight and gold purity demonstrate a sophisticated economic system and integration into regional trade networks.",
    category: "Coins",
    period: "9th–16th Century",
    origin: "Various sites across Luzon and Visayas",
    material: "Gold alloy (18–22 karat)",
    culturalSignificance:
      "Proof of an organized indigenous monetary economy predating European contact. Piloncitos are the earliest known currency indigenous to the Philippine archipelago.",
    image:
      "https://images.unsplash.com/photo-1768429670472-c37090eb7e37?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxhbmNpZW50JTIwY29pbiUyMGNvbGxlY3Rpb24lMjBudW1pc21hdGljcyUyMGhpc3RvcmljYWx8ZW58MXx8fHwxNzc4MTcyOTMwfDA&ixlib=rb-4.1.0&q=80&w=1080",
    featured: true,
  },
  {
    id: "10",
    title: "Courtly Portrait Painting",
    shortDescription:
      "A formal oil painting depicting a local principalia family in Spanish colonial-era dress.",
    fullDescription:
      "This formal portrait painting depicts a prominent principalia (local elite) family in the attire of the Spanish colonial period. Executed in oil on canvas, the work follows European portrait conventions while incorporating distinctive local elements — the woman's Maria Clara dress features piña cloth insets, and the background includes a partially visible colonial-era church facade. The painting was commissioned to document the family's social standing and was displayed prominently in their ancestral home. The artist, though unnamed in surviving records, demonstrates technical proficiency in European painting techniques, suggesting training under Spanish missionary or mestizo artists. The work is notable for the dignified, direct gaze of its female subjects — a subtle assertion of agency within the colonial context.",
    category: "Paintings",
    period: "Late 19th Century",
    origin: "Manila, Luzon",
    material: "Oil on canvas",
    culturalSignificance:
      "Documents the emergence of a distinct Filipino colonial identity — blending indigenous, Spanish, and Chinese cultural influences — through the visual language of formal portraiture.",
    image:
      "https://images.unsplash.com/photo-1698054634378-1a3ca52f2d3d?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxhbmNpZW50JTIwcGFpbnRpbmclMjBhcnQlMjBjYW52YXMlMjB0cmFkaXRpb25hbHxlbnwxfHx8fDE3NzgxNzI5MzF8MA&ixlib=rb-4.1.0&q=80&w=1080",
    featured: false,
  },
  {
    id: "11",
    title: "Ritual Ceremonial Mask",
    shortDescription:
      "A carved wooden mask used in ritual dances connecting communities to the spirit world.",
    fullDescription:
      "This elaborately carved ritual mask was used in traditional ceremonial dances performed at the transitions of seasons, at times of harvest, and during community celebrations of significant life events. The mask's exaggerated features — wide eyes, a prominent forehead, and a stylized open mouth — are designed to be visible and impactful from a distance, as the wearer would perform expansive physical movements in an open communal space. Red and black pigments, derived from natural mineral and plant sources, have been applied in bold geometric patterns that carry specific symbolic meaning within the community's visual language. The interior of the mask shows wear patterns consistent with repeated use over many decades.",
    category: "Religious Objects",
    period: "19th–Early 20th Century",
    origin: "Cordillera Region, Northern Luzon",
    material: "Hardwood, natural mineral pigments",
    culturalSignificance:
      "Integral to the living cultural tradition of ritual performance in Cordillera communities. Similar masks continue to be made and used in active ritual practice today.",
    image:
      "https://images.unsplash.com/photo-1770036245373-db22acac9b44?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxpbmRpZ2Vub3VzJTIwd29vZGVuJTIwbWFzayUyMGN1bHR1cmFsJTIwYXJ0aWZhY3R8ZW58MXx8fHwxNzc4MTcyOTMwfDA&ixlib=rb-4.1.0&q=80&w=1080",
    featured: false,
  },
  {
    id: "12",
    title: "Colonial-Era Museum Archive",
    shortDescription:
      "A collection of annotated drawings and specimens compiled by a 19th-century Spanish naturalist.",
    fullDescription:
      "This archive of botanical and zoological drawings was compiled by a Spanish naturalist stationed in the archipelago during the mid-19th century. The collection includes meticulously detailed pen-and-ink illustrations of endemic plant species, accompanied by handwritten annotations in Spanish and Latin describing their local uses, distribution, and medicinal properties. Some illustrations also include indigenous plant names — recorded phonetically in Spanish — providing valuable ethnobotanical data. The archive was donated to a local academic institution in the early 20th century and has since been digitized for research purposes. Several of the species illustrated are now endangered or extinct, making this record of particular scientific and cultural value.",
    category: "Manuscripts",
    period: "Mid-19th Century (1840s–1870s)",
    origin: "Manila, Philippines",
    material: "Paper, iron gall ink, watercolor pigments",
    culturalSignificance:
      "An important intersection of colonial-era scientific documentation and indigenous knowledge. The archive preserves records of biodiversity and ethnobotanical knowledge that might otherwise have been lost.",
    image:
      "https://images.unsplash.com/photo-1772990914935-a2c506de480c?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxtdXNldW0lMjBnYWxsZXJ5JTIwaW50ZXJpb3IlMjBleGhpYml0aW9uJTIwaGFsbHxlbnwxfHx8fDE3NzgxNzI5MzB8MA&ixlib=rb-4.1.0&q=80&w=1080",
    featured: false,
  },
];
