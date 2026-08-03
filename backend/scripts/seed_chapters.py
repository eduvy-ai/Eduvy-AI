"""
Seed Chapters - Real chapter data from official 2024-25 syllabi.
Covers Classes 9-12 for CBSE, ICSE, MSBSHSE, GSEB.

Usage:
    cd backend
    python -m scripts.seed_chapters              # Seed (skip existing)
    python -m scripts.seed_chapters --clean      # Delete all + re-seed

Data sources:
    CBSE: NCERT textbooks (ncert.nic.in)
    ICSE: CISCE syllabus (cisce.org)
    MSBSHSE: Balbharati textbooks (ebalbharati.in)
    GSEB: GCERT textbooks (gcert.gujarat.gov.in) — follows NCERT
"""
import sys
import os
import json
import argparse

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.db.connection import get_db, init_db
from app.modules.chapters.schema import ChapterCreate
from app.modules.chapters.service import ChapterService


# ══════════════════════════════════════════════════════════════════════════════
# CHAPTER DATA — Structure:
# { (board, standard, subject): [(num, name_en, name_local, desc, [topics]), ...] }
# ══════════════════════════════════════════════════════════════════════════════

# ─────────────────────────────────────────────────────────────────────────────
# CLASS 9 — CBSE (NCERT 2024-25)
# ─────────────────────────────────────────────────────────────────────────────

CBSE_CLASS_9 = {
    # ── Science (NCERT) ──
    ("CBSE", "Class 9", "Science"): [
        (1, "Matter in Our Surroundings", "हमारे आस-पास के पदार्थ", "States of matter and their properties", ["solid", "liquid", "gas", "evaporation", "latent heat"]),
        (2, "Is Matter Around Us Pure?", "क्या हमारे आस-पास के पदार्थ शुद्ध हैं?", "Mixtures, solutions, and separation techniques", ["mixtures", "solutions", "colloids", "suspensions", "distillation"]),
        (3, "Atoms and Molecules", "परमाणु एवं अणु", "Atomic theory and molecular formula", ["Dalton's theory", "atomic mass", "molecular formula", "mole concept", "valency"]),
        (4, "Structure of the Atom", "परमाणु की संरचना", "Subatomic particles and atomic models", ["electrons", "protons", "neutrons", "Bohr model", "electronic configuration"]),
        (5, "The Fundamental Unit of Life", "जीवन की मौलिक इकाई", "Cell structure and organelles", ["cell membrane", "nucleus", "mitochondria", "endoplasmic reticulum", "cell division"]),
        (6, "Tissues", "ऊतक", "Plant and animal tissues", ["meristematic tissue", "permanent tissue", "epithelial tissue", "connective tissue", "muscular tissue"]),
        (7, "Diversity in Living Organisms", "जीवों में विविधता", "Classification of living organisms", ["taxonomy", "five kingdoms", "vertebrates", "invertebrates", "binomial nomenclature"]),
        (8, "Motion", "गति", "Distance, displacement, speed, velocity and acceleration", ["distance", "displacement", "velocity", "acceleration", "equations of motion", "graphical representation"]),
        (9, "Force and Laws of Motion", "बल तथा गति के नियम", "Newton's laws of motion", ["inertia", "momentum", "Newton's first law", "Newton's second law", "Newton's third law"]),
        (10, "Gravitation", "गुरुत्वाकर्षण", "Universal law of gravitation", ["gravitational force", "free fall", "mass vs weight", "Kepler's laws", "acceleration due to gravity"]),
        (11, "Work and Energy", "कार्य तथा ऊर्जा", "Work, energy, and power", ["work", "kinetic energy", "potential energy", "law of conservation", "power"]),
        (12, "Sound", "ध्वनि", "Production and propagation of sound", ["longitudinal waves", "frequency", "amplitude", "speed of sound", "echo", "resonance"]),
        (13, "Why Do We Fall Ill?", "हम बीमार क्यों होते हैं?", "Health and diseases", ["infectious diseases", "non-infectious diseases", "pathogens", "immunity", "prevention"]),
        (14, "Natural Resources", "प्राकृतिक संसाधन", "Air, water, soil, and biogeochemical cycles", ["water cycle", "nitrogen cycle", "carbon cycle", "ozone layer", "pollution"]),
        (15, "Improvement in Food Resources", "खाद्य संसाधनों में सुधार", "Agriculture and animal husbandry", ["crop improvement", "crop protection", "animal husbandry", "poultry", "fisheries"]),
    ],

    # ── Mathematics (NCERT) ──
    ("CBSE", "Class 9", "Mathematics"): [
        (1, "Number Systems", "संख्या पद्धति", "Real numbers and their properties", ["natural numbers", "rational numbers", "irrational numbers", "real number line", "laws of exponents"]),
        (2, "Polynomials", "बहुपद", "Polynomials in one variable", ["degree", "zeroes of polynomial", "remainder theorem", "factor theorem", "algebraic identities"]),
        (3, "Coordinate Geometry", "निर्देशांक ज्यामिति", "Cartesian plane and plotting points", ["x-axis", "y-axis", "origin", "quadrants", "ordered pairs"]),
        (4, "Linear Equations in Two Variables", "दो चरों वाले रैखिक समीकरण", "Linear equations and their graphs", ["linear equation", "solution of equation", "graph of linear equation"]),
        (5, "Introduction to Euclid's Geometry", "यूक्लिड की ज्यामिति का परिचय", "Axioms and postulates", ["axioms", "postulates", "Euclid's five postulates", "equivalent versions"]),
        (6, "Lines and Angles", "रेखाएँ और कोण", "Properties of lines and angles", ["linear pair", "vertically opposite angles", "transversal", "parallel lines", "angle sum property"]),
        (7, "Triangles", "त्रिभुज", "Congruence of triangles", ["SAS", "ASA", "SSS", "RHS", "congruence rules", "inequalities"]),
        (8, "Quadrilaterals", "चतुर्भुज", "Properties of quadrilaterals", ["parallelogram", "rectangle", "rhombus", "square", "mid-point theorem"]),
        (9, "Circles", "वृत्त", "Properties of circles", ["chord", "arc", "angle subtended", "cyclic quadrilateral"]),
        (10, "Heron's Formula", "हीरोन का सूत्र", "Area of triangles using Heron's formula", ["semi-perimeter", "area of triangle", "area of quadrilateral"]),
        (11, "Surface Areas and Volumes", "पृष्ठीय क्षेत्रफल और आयतन", "Surface areas and volumes of solids", ["cuboid", "cylinder", "cone", "sphere", "hemisphere"]),
        (12, "Statistics", "सांख्यिकी", "Collection and presentation of data", ["mean", "median", "mode", "frequency distribution", "histogram", "bar graph"]),
    ],

    # ── English (Beehive — NCERT) ──
    ("CBSE", "Class 9", "English"): [
        (1, "The Fun They Had", "—", "A futuristic story about school and learning", ["science fiction", "future education", "technology in education"]),
        (2, "The Sound of Music", "—", "Stories of two musical geniuses", ["Evelyn Glennie", "Bismillah Khan", "determination", "shehnai"]),
        (3, "The Little Girl", "—", "A girl's changing perception of her father", ["father-daughter relationship", "understanding", "fear"]),
        (4, "A Truly Beautiful Mind", "—", "Biography of Albert Einstein", ["Einstein", "relativity", "genius", "nuclear weapons"]),
        (5, "The Snake and the Mirror", "—", "A humorous story about a doctor and a snake", ["humour", "self-admiration", "snake encounter"]),
        (6, "My Childhood", "—", "APJ Abdul Kalam's childhood experiences", ["autobiography", "communal harmony", "Rameswaram"]),
        (7, "Packing", "—", "A humorous account of packing for a trip", ["humour", "Jerome K. Jerome", "Three Men in a Boat"]),
        (8, "Reach for the Top", "—", "Stories of Santosh Yadav and Maria Sharapova", ["determination", "mountaineering", "tennis", "achievement"]),
        (9, "The Bond of Love", "—", "A story about a pet bear", ["animal bonding", "love", "separation"]),
        (10, "Kathmandu", "—", "A travel account of Kathmandu", ["travel writing", "Pashupatinath", "culture"]),
        (11, "If I Were You", "—", "A one-act play about an intruder", ["drama", "suspense", "irony", "one-act play"]),
    ],

    # ── Social Science (History + Geography + Political Science + Economics) ──
    ("CBSE", "Class 9", "Social Science"): [
        # History (India and the Contemporary World I)
        (1, "The French Revolution", "फ्रांसीसी क्रांति", "Rise of democracy in France", ["French Revolution", "liberty", "equality", "Napoleon", "republic"]),
        (2, "Socialism in Europe and the Russian Revolution", "यूरोप में समाजवाद एवं रूसी क्रांति", "Rise of socialism and Russian Revolution", ["socialism", "communism", "Bolsheviks", "Lenin", "October Revolution"]),
        (3, "Nazism and the Rise of Hitler", "नात्सीवाद और हिटलर का उदय", "Nazi Germany and World War II", ["Hitler", "Nazi ideology", "Holocaust", "propaganda", "youth"]),
        (4, "Forest Society and Colonialism", "वन्य समाज एवं उपनिवेशवाद", "Impact of colonialism on forests", ["deforestation", "colonial forest laws", "tribal communities", "Java forests"]),
        (5, "Pastoralists in the Modern World", "आधुनिक विश्व में चरवाहे", "Pastoral communities and their challenges", ["nomadic pastoralists", "colonial rule", "Maasai", "Gaddi"]),
        # Geography (Contemporary India I)
        (6, "India – Size and Location", "भारत – आकार और स्थिति", "India's geographical position and extent", ["latitude", "longitude", "neighbours", "Indian Standard Time"]),
        (7, "Physical Features of India", "भारत का भौतिक स्वरूप", "Major landforms of India", ["Himalayas", "Northern Plains", "Peninsular Plateau", "Coastal Plains", "Islands"]),
        (8, "Drainage", "अपवाह", "River systems of India", ["Himalayan rivers", "Peninsular rivers", "Ganga", "Brahmaputra", "drainage patterns"]),
        (9, "Climate", "जलवायु", "Factors affecting India's climate", ["monsoon", "seasons", "El Nino", "temperature", "rainfall distribution"]),
        (10, "Natural Vegetation and Wild Life", "प्राकृतिक वनस्पति तथा वन्य प्राणी", "Flora and fauna of India", ["tropical forest", "deciduous forest", "national parks", "biosphere reserves"]),
        (11, "Population", "जनसंख्या", "Population characteristics of India", ["population density", "growth rate", "age composition", "literacy", "migration"]),
        # Political Science (Democratic Politics I)
        (12, "What is Democracy? Why Democracy?", "लोकतंत्र क्या? लोकतंत्र क्यों?", "Defining and understanding democracy", ["democracy", "features", "merits", "demerits", "broader meaning"]),
        (13, "Constitutional Design", "संविधान निर्माण", "Making of the Indian Constitution", ["Constituent Assembly", "preamble", "guiding values", "South Africa"]),
        (14, "Electoral Politics", "चुनावी राजनीति", "Elections in a democracy", ["elections", "political competition", "electoral system", "voter participation"]),
        (15, "Working of Institutions", "संस्थाओं का कामकाज", "How government institutions work", ["Parliament", "executive", "judiciary", "President", "Prime Minister"]),
        (16, "Democratic Rights", "लोकतांत्रिक अधिकार", "Fundamental rights in democracy", ["fundamental rights", "right to equality", "right to freedom", "constitutional remedies"]),
        # Economics
        (17, "The Story of Village Palampur", "पालमपुर गाँव की कहानी", "Production and employment in a village", ["factors of production", "farming", "non-farm activities", "capital"]),
        (18, "People as Resource", "संसाधन के रूप में लोग", "Human capital and economic activities", ["human capital", "education", "health", "economic activities", "unemployment"]),
        (19, "Poverty as a Challenge", "निर्धनता: एक चुनौती", "Understanding poverty in India", ["poverty line", "vulnerability", "anti-poverty measures", "human poverty index"]),
        (20, "Food Security in India", "भारत में खाद्य सुरक्षा", "Ensuring food for all", ["PDS", "food security", "buffer stock", "ration shops", "food insecurity"]),
    ],

    # ── Hindi (Kshitij — क्षितिज) ──
    ("CBSE", "Class 9", "Hindi"): [
        (1, "दो बैलों की कथा", "Do Bailon Ki Katha", "प्रेमचंद — दो बैलों के माध्यम से किसान जीवन की कथा", ["प्रेमचंद", "किसान", "पशु", "शोषण", "संघर्ष"]),
        (2, "ल्हासा की ओर", "Lhasa Ki Or", "राहुल सांकृत्यायन — तिब्बत यात्रा का वर्णन", ["यात्रा वृत्तांत", "तिब्बत", "साहसिक यात्रा"]),
        (3, "उपभोक्तावाद की संस्कृति", "Upbhoktavad Ki Sanskriti", "श्यामाचरण दुबे — उपभोक्तावाद की समीक्षा", ["उपभोक्तावाद", "संस्कृति", "विज्ञापन"]),
        (4, "साँवले सपनों की याद", "Saanwle Sapnon Ki Yaad", "जाबिर हुसैन — सालिम अली की स्मृति", ["प्रकृति प्रेमी", "पक्षी विज्ञानी", "सालिम अली"]),
        (5, "नाना साहब की पुत्री", "Nana Sahab Ki Putri", "चपला देवी — 1857 की क्रांति की कहानी", ["देशभक्ति", "1857 की क्रांति", "बलिदान"]),
        (6, "प्रेमचंद के फटे जूते", "Premchand Ke Phate Joote", "हरिशंकर परसाई — व्यंग्य लेख", ["व्यंग्य", "सादगी", "साहित्यकार"]),
        (7, "मेरे बचपन के दिन", "Mere Bachpan Ke Din", "महादेवी वर्मा — बचपन की स्मृतियाँ", ["आत्मकथा", "बचपन", "शिक्षा", "संस्मरण"]),
        (8, "एक कुत्ता और एक मैना", "Ek Kutta Aur Ek Maina", "हज़ारी प्रसाद द्विवेदी — पशु-पक्षी प्रेम", ["ललित निबंध", "करुणा", "पशु-प्रेम"]),
        (9, "साखियाँ एवं सबद", "Sakhiyan Evam Sabad", "कबीर — भक्ति काल की रचनाएँ", ["कबीर", "भक्ति काल", "दोहे", "आध्यात्मिकता"]),
        (10, "वाख", "Vaakh", "ललद्यद — कश्मीरी कवयित्री की रचना", ["कश्मीर", "आध्यात्मिकता", "ललद्यद"]),
        (11, "सवैये", "Savaiye", "रसखान — कृष्ण भक्ति के सवैये", ["रसखान", "कृष्ण भक्ति", "सवैया छंद"]),
        (12, "कैदी और कोकिला", "Kaidi Aur Kokila", "माखनलाल चतुर्वेदी — स्वतंत्रता संग्राम", ["देशभक्ति", "कविता", "जेल", "कोकिला"]),
        (13, "ग्राम श्री", "Gram Shri", "सुमित्रानंदन पंत — गाँव की सुंदरता", ["प्रकृति", "ग्राम जीवन", "छायावाद"]),
        (14, "चंद्र गहना से लौटती बेर", "Chandra Gehna Se Lautti Ber", "केदारनाथ अग्रवाल — प्रकृति चित्रण", ["प्रकृति", "ग्रामीण परिवेश"]),
        (15, "मेघ आए", "Megh Aaye", "सर्वेश्वर दयाल सक्सेना — बादलों का आगमन", ["वर्षा", "बादल", "प्रकृति"]),
        (16, "यमराज की दिशा", "Yamraj Ki Disha", "चंद्रकांत देवताले — पर्यावरण चिंता", ["पर्यावरण", "प्रदूषण", "चिंता"]),
        (17, "बच्चे काम पर जा रहे हैं", "Bachche Kaam Par Ja Rahe Hain", "राजेश जोशी — बाल श्रम पर कविता", ["बाल श्रम", "सामाजिक समस्या", "करुणा"]),
    ],
}


# ─────────────────────────────────────────────────────────────────────────────
# CLASS 9 — ICSE (CISCE Syllabus 2024-25)
# ─────────────────────────────────────────────────────────────────────────────

ICSE_CLASS_9 = {
    # ── Physics ──
    ("ICSE", "Class 9", "Physics"): [
        (1, "Measurements and Experimentation", "", "Measurement systems and lab techniques", ["SI units", "vernier caliper", "screw gauge", "pendulum", "significant figures"]),
        (2, "Motion in One Dimension", "", "Kinematics of linear motion", ["speed", "velocity", "acceleration", "distance-time graph", "equations of motion"]),
        (3, "Laws of Motion", "", "Newton's three laws", ["inertia", "force", "momentum", "Newton's laws", "friction"]),
        (4, "Fluids", "", "Pressure in fluids", ["pressure", "Pascal's law", "atmospheric pressure", "Archimedes' principle", "hydraulic machines"]),
        (5, "Upthrust in Fluids", "", "Buoyancy and Archimedes' principle", ["buoyancy", "upthrust", "density", "relative density", "floatation"]),
        (6, "Work, Energy and Power", "", "Work-energy theorem and conservation", ["work", "kinetic energy", "potential energy", "conservation of energy", "power"]),
        (7, "Sound", "", "Production and characteristics of sound", ["longitudinal waves", "frequency", "wavelength", "speed of sound", "echo", "resonance"]),
        (8, "Current Electricity", "", "Electric circuits and Ohm's law", ["current", "voltage", "resistance", "Ohm's law", "series", "parallel", "EMF"]),
        (9, "Magnetism", "", "Properties of magnets and magnetic fields", ["magnetic field", "magnetic lines", "Earth's magnetism", "electromagnets"]),
        (10, "Heat and Energy", "", "Heat transfer and calorimetry", ["specific heat", "latent heat", "calorimetry", "change of state", "conduction", "convection", "radiation"]),
    ],

    # ── Chemistry ──
    ("ICSE", "Class 9", "Chemistry"): [
        (1, "The Language of Chemistry", "", "Chemical symbols, formulae, and equations", ["symbols", "formulae", "equations", "balancing", "types of reactions"]),
        (2, "Chemical Changes and Reactions", "", "Types of chemical reactions", ["combination", "decomposition", "displacement", "double decomposition", "exothermic", "endothermic"]),
        (3, "Water", "", "Properties and uses of water", ["water cycle", "hard water", "soft water", "water treatment", "hydrogen bonding"]),
        (4, "Atomic Structure and Chemical Bonding", "", "Atoms, ions, and bonding", ["atomic number", "mass number", "isotopes", "ionic bond", "covalent bond", "electrovalent bond"]),
        (5, "The Periodic Table", "", "Modern periodic table and periodicity", ["periods", "groups", "periodic properties", "metallic character", "electronegativity"]),
        (6, "Study of the First Element — Hydrogen", "", "Preparation and properties of hydrogen", ["preparation", "properties", "isotopes", "uses", "water gas"]),
        (7, "Study of Gas Laws", "", "Boyle's, Charles', and gas equations", ["Boyle's law", "Charles' law", "gas equation", "STP", "molar volume"]),
        (8, "Atmospheric Pollution", "", "Air pollution and its effects", ["greenhouse effect", "global warming", "acid rain", "ozone depletion", "smog"]),
    ],

    # ── Biology ──
    ("ICSE", "Class 9", "Biology"): [
        (1, "Introduction to Biology", "", "Branches and scope of biology", ["botany", "zoology", "microbiology", "ecology", "scientific method"]),
        (2, "Cell: The Unit of Life", "", "Cell structure and function", ["cell theory", "prokaryotic", "eukaryotic", "organelles", "cell division"]),
        (3, "Tissues: Plant and Animal Tissues", "", "Types and functions of tissues", ["meristematic", "permanent tissue", "epithelial", "connective", "muscular", "nervous"]),
        (4, "The Flower", "", "Structure and function of flowers", ["calyx", "corolla", "androecium", "gynoecium", "placentation"]),
        (5, "Pollination and Fertilization", "", "Reproductive processes in plants", ["self-pollination", "cross-pollination", "fertilization", "embryo", "endosperm"]),
        (6, "Seeds — Structure and Germination", "", "Seed structure and growth conditions", ["monocot", "dicot", "germination", "epigeal", "hypogeal"]),
        (7, "Respiration in Plants", "", "Aerobic and anaerobic respiration", ["aerobic", "anaerobic", "fermentation", "ATP", "glycolysis"]),
        (8, "Five Kingdom Classification", "", "Classification systems for organisms", ["Monera", "Protista", "Fungi", "Plantae", "Animalia"]),
        (9, "Economic Importance of Bacteria and Fungi", "", "Uses and harms of microorganisms", ["bacteria in food", "antibiotics", "fermentation", "fungal diseases"]),
        (10, "Nutrition", "", "Types of nutrition and nutrients", ["autotrophic", "heterotrophic", "carbohydrates", "proteins", "vitamins", "minerals"]),
        (11, "Digestive System", "", "Human digestive system", ["alimentary canal", "enzymes", "digestion", "absorption", "assimilation"]),
        (12, "Skeleton — Movement and Locomotion", "", "Human skeletal system", ["axial skeleton", "appendicular skeleton", "joints", "cartilage", "bone"]),
        (13, "Skin — The Jack of All Trades", "", "Structure and functions of skin", ["epidermis", "dermis", "sweat glands", "temperature regulation", "protection"]),
    ],

    # ── Mathematics ──
    ("ICSE", "Class 9", "Mathematics"): [
        (1, "Rational and Irrational Numbers", "", "Number system properties", ["rational numbers", "irrational numbers", "surds", "rationalisation"]),
        (2, "Compound Interest", "", "CI calculation and applications", ["compound interest", "amount", "rate", "time", "depreciation"]),
        (3, "Expansions", "", "Algebraic expansions and identities", ["algebraic identities", "binomial expansion", "special products"]),
        (4, "Factorisation", "", "Factoring algebraic expressions", ["common factor", "grouping", "splitting middle term", "identities"]),
        (5, "Simultaneous Linear Equations", "", "Solving systems of linear equations", ["substitution", "elimination", "cross multiplication", "graphical method"]),
        (6, "Indices and Logarithms", "", "Laws of exponents and logarithms", ["laws of indices", "logarithm", "log tables", "antilog"]),
        (7, "Triangles", "", "Properties and theorems of triangles", ["angle sum property", "exterior angle", "congruence", "isosceles triangle"]),
        (8, "Mid-point and Intercept Theorems", "", "Theorems on mid-points and intercepts", ["mid-point theorem", "converse", "intercept theorem", "equal intercepts"]),
        (9, "Pythagoras Theorem", "", "Pythagorean theorem and applications", ["Pythagoras theorem", "converse", "Pythagorean triplets"]),
        (10, "Rectilinear Figures", "", "Properties of quadrilaterals and polygons", ["parallelogram", "rectangle", "rhombus", "trapezium", "regular polygon"]),
        (11, "Area and Perimeter of Plane Figures", "", "Calculations for 2D shapes", ["triangle area", "quadrilateral area", "circle", "sector", "segment"]),
        (12, "Circle", "", "Properties of circles", ["chord", "arc", "tangent", "angle in semicircle", "cyclic quadrilateral"]),
        (13, "Statistics", "", "Data representation and measures", ["mean", "median", "mode", "histogram", "frequency polygon", "ogive"]),
        (14, "Surface Area and Volume of Solids", "", "3D shape calculations", ["cuboid", "cylinder", "cone", "sphere", "hemisphere"]),
        (15, "Trigonometric Ratios", "", "Introduction to trigonometry", ["sin", "cos", "tan", "trigonometric identities", "complementary angles"]),
        (16, "Co-ordinate Geometry", "", "Cartesian plane and line equations", ["distance formula", "section formula", "slope", "equation of line"]),
    ],

    # ── English (Literature) ──
    ("ICSE", "Class 9", "English"): [
        (1, "The Merchant of Venice", "", "Shakespeare — drama study", ["Shakespeare", "Shylock", "Portia", "justice", "mercy"]),
        (2, "Treasure Trove — Short Stories Collection", "", "Collection of prose pieces", ["prose", "short stories", "comprehension", "literary devices"]),
        (3, "Treasure Trove — Poems Collection", "", "Collection of poems for study", ["poetry", "figures of speech", "themes", "analysis"]),
        (4, "Grammar and Composition", "", "English language skills", ["tenses", "voice", "narration", "prepositions", "composition"]),
        (5, "Essay Writing and Letter Writing", "", "Formal writing skills", ["formal letters", "informal letters", "essay structure", "argument"]),
        (6, "Comprehension and Precis", "", "Reading and summarizing skills", ["comprehension", "precis", "main idea", "summary"]),
    ],

    # ── History and Civics ──
    ("ICSE", "Class 9", "History and Civics"): [
        (1, "The Harappan Civilization", "", "Indus Valley Civilization study", ["Harappa", "Mohenjo-daro", "urban planning", "trade", "decline"]),
        (2, "The Vedic Period", "", "Early and Later Vedic age", ["Rigveda", "varna system", "Ashrams", "Upanishads"]),
        (3, "Jainism and Buddhism", "", "Rise of new religions in India", ["Mahavira", "Buddha", "ahimsa", "Four Noble Truths", "Jain principles"]),
        (4, "The Mauryan Empire", "", "Rise and administration of Mauryas", ["Chandragupta", "Ashoka", "administration", "Dhamma", "Arthashastra"]),
        (5, "The Sangam Age", "", "South Indian history and literature", ["Cheras", "Cholas", "Pandyas", "Sangam literature", "trade"]),
        (6, "The Age of the Guptas", "", "Golden age of Indian history", ["Chandragupta I", "Samudragupta", "art", "science", "literature"]),
        (7, "Medieval India — The Sultanate Period", "", "Delhi Sultanate and its impact", ["slave dynasty", "Khilji", "Tughlaq", "administration", "architecture"]),
        (8, "The Mughal Empire", "", "Mughal rule and legacy", ["Akbar", "administration", "Mansabdari", "art", "architecture", "decline"]),
        (9, "Our Constitution", "", "Indian Constitution basics", ["Constituent Assembly", "Preamble", "features", "fundamental rights"]),
        (10, "Fundamental Rights and Duties", "", "Rights and duties of citizens", ["six fundamental rights", "duties", "right to equality", "right to freedom"]),
        (11, "Directive Principles of State Policy", "", "Guiding principles for governance", ["DPSP", "classification", "implementation", "significance"]),
        (12, "The Union Legislature", "", "Structure of Indian Parliament", ["Lok Sabha", "Rajya Sabha", "speaker", "sessions", "law-making"]),
        (13, "The Union Executive", "", "President, PM, and Council of Ministers", ["President", "Prime Minister", "Council of Ministers", "powers"]),
        (14, "The Judiciary", "", "Indian judicial system", ["Supreme Court", "High Court", "independence", "judicial review", "PIL"]),
    ],

    # ── Geography ──
    ("ICSE", "Class 9", "Geography"): [
        (1, "Earth as a Planet", "", "Earth's shape, size, and movements", ["rotation", "revolution", "latitude", "longitude", "time zones"]),
        (2, "Geographic Grid — Latitudes and Longitudes", "", "Understanding geographic coordinates", ["equator", "parallels", "meridians", "IST", "GMT"]),
        (3, "Composition and Structure of the Atmosphere", "", "Layers and properties of atmosphere", ["troposphere", "stratosphere", "composition", "ozone"]),
        (4, "Insolation", "", "Distribution of solar radiation", ["angle of incidence", "duration of day", "heat budget", "temperature distribution"]),
        (5, "Atmospheric Pressure and Winds", "", "Pressure belts and wind systems", ["pressure belts", "planetary winds", "local winds", "monsoons"]),
        (6, "Humidity and Precipitation", "", "Water vapour and rainfall", ["humidity", "dew point", "clouds", "rainfall types", "condensation"]),
        (7, "Weathering and Soil Formation", "", "Types of weathering and soil", ["physical weathering", "chemical weathering", "soil profile", "soil types"]),
        (8, "Rocks", "", "Types and rock cycle", ["igneous", "sedimentary", "metamorphic", "rock cycle"]),
        (9, "Volcanoes", "", "Volcanic activity and landforms", ["types of volcanoes", "volcanic eruptions", "lava", "magma", "volcanic landforms"]),
        (10, "Earthquakes", "", "Causes and effects of earthquakes", ["seismic waves", "focus", "epicentre", "Richter scale", "earthquake zones"]),
        (11, "Map Work", "", "Map reading and interpretation", ["scale", "direction", "symbols", "contours", "topographic maps"]),
    ],
}


# ─────────────────────────────────────────────────────────────────────────────
# CLASS 9 — MSBSHSE (Maharashtra Board — Balbharati 2024-25)
# ─────────────────────────────────────────────────────────────────────────────

MSBSHSE_CLASS_9 = {
    # ── Science and Technology (Part 1 + Part 2) ──
    ("MSBSHSE", "Class 9", "Science"): [
        (1, "Laws of Motion", "गतीचे नियम", "Newton's laws and force", ["Newton's laws", "inertia", "force", "momentum", "friction"]),
        (2, "Work and Energy", "कार्य आणि ऊर्जा", "Work, energy, and their transformations", ["work", "kinetic energy", "potential energy", "conservation", "power"]),
        (3, "Current Electricity", "विद्युत धारा", "Electric circuits and resistance", ["current", "voltage", "resistance", "Ohm's law", "electric power"]),
        (4, "Measurement of Matter", "द्रव्याचे मापन", "Measurement of physical quantities", ["mass", "volume", "density", "mole concept", "atomic mass"]),
        (5, "Acids, Bases and Salts", "आम्ल, आम्लारी आणि क्षार", "Properties and uses of acids and bases", ["indicators", "pH scale", "neutralization", "salts"]),
        (6, "Classification of Plants", "वनस्पतींचे वर्गीकरण", "Plant classification systems", ["cryptogams", "phanerogams", "monocots", "dicots"]),
        (7, "Energy Flow in an Ecosystem", "परिसंस्थेतील ऊर्जा प्रवाह", "Food chains and energy transfer", ["food chain", "food web", "trophic levels", "energy pyramid"]),
        (8, "Useful and Harmful Microorganisms", "उपयुक्त आणि अपायकारक सूक्ष्मजीव", "Role of microorganisms", ["bacteria", "virus", "fungi", "vaccination", "antibiotics"]),
        (9, "Environmental Management", "पर्यावरण व्यवस्थापन", "Environmental conservation and management", ["pollution", "waste management", "conservation", "sustainable development"]),
        (10, "Heat", "उष्णता", "Heat transfer and effects", ["conduction", "convection", "radiation", "specific heat", "change of state"]),
        (11, "Reflection of Light", "प्रकाशाचे परावर्तन", "Laws and types of reflection", ["laws of reflection", "plane mirror", "curved mirrors", "image formation"]),
        (12, "Study of Sound", "ध्वनीचा अभ्यास", "Sound production and characteristics", ["vibration", "frequency", "loudness", "pitch", "echo"]),
        (13, "Carbon: An Important Element", "कार्बन: एक महत्त्वाचे मूलद्रव्य", "Carbon compounds and allotropes", ["allotropes", "hydrocarbons", "organic compounds", "bonding"]),
        (14, "Substances in Common Use", "सामान्य वापरातील पदार्थ", "Daily-use chemicals and materials", ["soaps", "detergents", "cement", "glass", "ceramics"]),
        (15, "Life Processes in Living Organisms", "सजीवांतील जीवनप्रक्रिया", "Nutrition, respiration in organisms", ["nutrition", "respiration", "transportation", "excretion"]),
        (16, "Heredity and Variation", "आनुवंशिकता आणि विविधता", "Genes and inheritance", ["genes", "chromosomes", "DNA", "dominant", "recessive"]),
        (17, "Introduction to Biotechnology", "जैवतंत्रज्ञान परिचय", "Applications of biotechnology", ["genetic engineering", "GMO", "cloning", "DNA fingerprinting"]),
        (18, "Observing Space: Telescopes", "अवकाश निरीक्षण: दुर्बिणी", "Telescopes and space observation", ["optical telescope", "radio telescope", "satellites", "space exploration"]),
    ],

    # ── Mathematics (Part I + Part II) ──
    ("MSBSHSE", "Class 9", "Mathematics"): [
        (1, "Sets", "संच", "Set theory basics", ["types of sets", "subset", "union", "intersection", "Venn diagram"]),
        (2, "Real Numbers", "वास्तव संख्या", "Properties of real numbers", ["rational", "irrational", "number line", "surds", "rationalisation"]),
        (3, "Polynomials", "बहुपदी", "Polynomial operations and factoring", ["degree", "zeroes", "remainder theorem", "factor theorem"]),
        (4, "Linear Equations in Two Variables", "दोन चलांतील रेषीय समीकरणे", "Solving linear equations graphically", ["graph", "solution", "pair of equations", "consistency"]),
        (5, "Ratio and Proportion", "गुणोत्तर आणि समप्रमाण", "Ratios, proportions, and variations", ["ratio", "proportion", "direct variation", "inverse variation"]),
        (6, "Financial Planning", "आर्थिक नियोजन", "Interest, profit, loss, tax", ["compound interest", "GST", "shares", "dividend"]),
        (7, "Statistics", "सांख्यिकी", "Data collection and representation", ["mean", "median", "mode", "frequency table", "histogram"]),
        (8, "Trigonometry", "त्रिकोणमिती", "Trigonometric ratios and identities", ["sin", "cos", "tan", "identities", "complementary angles"]),
        (9, "Surface Area and Volume", "पृष्ठफळ आणि घनफळ", "3D shapes calculations", ["cuboid", "cylinder", "cone", "sphere"]),
        (10, "Lines and Angles", "रेषा आणि कोन", "Properties of parallel lines and angles", ["transversal", "corresponding angles", "alternate angles", "co-interior angles"]),
        (11, "Triangles", "त्रिकोण", "Properties and congruence", ["congruence rules", "similarity", "Pythagoras theorem", "angle sum property"]),
        (12, "Quadrilaterals", "चतुर्भुज", "Properties of quadrilaterals", ["parallelogram", "rectangle", "rhombus", "trapezium", "kite"]),
        (13, "Circle", "वर्तुळ", "Circle properties and theorems", ["chord", "arc", "inscribed angle", "tangent", "secant"]),
        (14, "Constructions", "रचना", "Geometric constructions", ["bisector", "triangle construction", "circle constructions"]),
        (15, "Coordinate Geometry", "सहनिर्देशक भूमिती", "Plotting and distance in plane", ["distance formula", "section formula", "slope"]),
    ],

    # ── English ──
    ("MSBSHSE", "Class 9", "English"): [
        (1, "Watching a Hillside", "", "Prose — nature and observation", ["nature", "imagery", "observation"]),
        (2, "An Encounter of a Special Kind", "", "Prose — wildlife and adventure", ["wildlife", "courage", "encounter"]),
        (3, "Comet", "", "Prose — science and space", ["comet", "astronomy", "science"]),
        (4, "Please Listen!", "", "Prose — communication and empathy", ["listening", "empathy", "communication"]),
        (5, "The Storyteller", "", "Prose — art of storytelling", ["narrative", "irony", "children"]),
        (6, "The Necklace", "", "Prose — consequences and values", ["ambition", "consequences", "irony", "Guy de Maupassant"]),
        (7, "A Boy's Best Friend", "", "Prose — friendship and technology", ["sci-fi", "friendship", "robot"]),
        (8, "Wonderland", "", "Poetry — imagination", ["imagination", "wonder", "poetry"]),
        (9, "Silver", "", "Poetry — nature and moonlight", ["moon", "imagery", "Walter de la Mare"]),
        (10, "Somebody's Mother", "", "Poetry — kindness", ["kindness", "elderly", "compassion"]),
        (11, "Grammar and Writing Skills", "", "Language study", ["tenses", "voice", "reported speech", "composition"]),
    ],

    # ── Social Science (History + Geography + Political Science + Economics) ──
    ("MSBSHSE", "Class 9", "Social Science"): [
        # History
        (1, "Sources of History", "इतिहासाची साधने", "Types of historical sources", ["literary sources", "archaeological sources", "inscriptions", "coins"]),
        (2, "India: Timeline – I", "भारत: कालरेषा – I", "Ancient India chronology", ["Vedic age", "Maurya", "Gupta", "medieval India"]),
        (3, "India: Timeline – II", "भारत: कालरेषा – II", "Medieval to modern India", ["Mughal period", "Maratha empire", "British rule"]),
        (4, "History of Indian Scripts", "भारतातील लिपींचा इतिहास", "Development of Indian scripts", ["Brahmi", "Devanagari", "scripts evolution"]),
        (5, "The World in the 20th Century – I", "विसाव्या शतकातील जग – I", "World War I and interwar period", ["World War I", "League of Nations", "imperialism"]),
        (6, "The World in the 20th Century – II", "विसाव्या शतकातील जग – II", "World War II and aftermath", ["World War II", "UN", "Cold War"]),
        # Geography
        (7, "Fieldwork", "क्षेत्रभेट", "Geographical fieldwork methods", ["observation", "data collection", "analysis", "reporting"]),
        (8, "Endogenetic Movements", "अंतर्गत हालचाली", "Internal earth processes", ["earthquake", "volcanism", "folds", "faults"]),
        (9, "Exogenetic Processes – Part I", "बाह्य प्रक्रिया – भाग I", "Weathering and erosion", ["weathering", "erosion", "river work"]),
        (10, "Exogenetic Processes – Part II", "बाह्य प्रक्रिया – भाग II", "Glacial and aeolian processes", ["glaciers", "wind", "sea waves", "landforms"]),
        (11, "Humidity and Precipitation", "आर्द्रता आणि पर्जन्य", "Water vapour and rainfall", ["humidity", "clouds", "types of rainfall", "cyclone"]),
        (12, "Population", "लोकसंख्या", "Population studies", ["census", "density", "growth rate", "migration"]),
        # Political Science
        (13, "Post-Independence India – I", "स्वातंत्र्योत्तर भारत – I", "Nation building after independence", ["integration", "Constitution", "planning"]),
        (14, "Post-Independence India – II", "स्वातंत्र्योत्तर भारत – II", "India's democratic journey", ["elections", "emergency", "reforms"]),
        (15, "India and the World", "भारत आणि जग", "India's foreign relations", ["non-alignment", "UN", "neighbours", "SAARC"]),
        # Economics
        (16, "Concept of Economics and Economy", "अर्थशास्त्र आणि अर्थव्यवस्था", "Basic economic concepts", ["economy", "sectors", "GDP", "development"]),
        (17, "Economic Development and Planning", "आर्थिक विकास आणि नियोजन", "Five year plans and development", ["planning commission", "NITI Aayog", "five year plans"]),
        (18, "Indian Economy: Challenges", "भारतीय अर्थव्यवस्था: आव्हाने", "Key challenges in Indian economy", ["poverty", "unemployment", "inequality", "population"]),
    ],

    # ── Marathi (First Language) ──
    ("MSBSHSE", "Class 9", "Marathi"): [
        (1, "गाण्याचे मूळ शोधताना", "Gaanyache Mul Shodhatana", "संगीताचा शोध — गद्य", ["संगीत", "शोध", "गद्य"]),
        (2, "बोलतो मराठी", "Bolato Marathi", "मराठी भाषेचे वैभव", ["भाषा", "मराठी", "अभिमान"]),
        (3, "झुळूक", "Jhuluk", "कविता — निसर्ग वर्णन", ["कविता", "निसर्ग", "वारा"]),
        (4, "माणसाला पंख असतात?", "Manasala Pankh Astat?", "कल्पनाशक्ती आणि उड्डाण", ["कल्पना", "विज्ञान", "उड्डाण"]),
        (5, "गोष्ट अरुणिमाची", "Goshta Arunimachi", "प्रेरणादायी कथा", ["साहस", "प्रेरणा", "दृढनिश्चय"]),
        (6, "आजी : कालची आणि आजची", "Aaji: Kalchi Aani Aajchi", "पिढीतील बदल", ["कुटुंब", "बदल", "पिढी"]),
        (7, "वाचन — एक आनंद", "Vachan — Ek Anand", "वाचनाचे महत्त्व", ["वाचन", "ज्ञान", "आनंद"]),
        (8, "पुस्तकाबद्दल सांगा", "Pustakabaddal Sanga", "पुस्तक परिचय", ["पुस्तक", "परीक्षण", "समीक्षा"]),
        (9, "मला जगायचंय", "Mala Jagaychany", "जीवनाविषयी कविता", ["जीवन", "आशा", "कविता"]),
        (10, "कर्ता सुधारक", "Karta Sudharak", "समाजसुधारक व्यक्तिमत्त्व", ["समाजसुधारक", "शिक्षण", "क्रांती"]),
        (11, "ऊन", "Un", "उन्हाळ्याचे वर्णन — कविता", ["ऊन", "उन्हाळा", "निसर्ग"]),
    ],
}


# ─────────────────────────────────────────────────────────────────────────────
# CLASS 9 — GSEB (Gujarat Board — GCERT, follows NCERT pattern)
# Note: GSEB adopted NCERT curriculum. Chapters same as CBSE, local name in Gujarati.
# ─────────────────────────────────────────────────────────────────────────────

GSEB_CLASS_9 = {
    # ── Science (Vigyan — વિજ્ઞાન) ──
    ("GSEB", "Class 9", "Science"): [
        (1, "Matter in Our Surroundings", "આપણી આસપાસના દ્રવ્યો", "States of matter and their properties", ["solid", "liquid", "gas", "evaporation", "latent heat"]),
        (2, "Is Matter Around Us Pure?", "આપણી આસપાસના દ્રવ્યો શુદ્ધ છે?", "Mixtures, solutions, and separation", ["mixtures", "solutions", "colloids", "suspensions", "distillation"]),
        (3, "Atoms and Molecules", "પરમાણુ અને અણુ", "Atomic theory and molecular formula", ["Dalton's theory", "atomic mass", "molecular formula", "mole concept"]),
        (4, "Structure of the Atom", "પરમાણુનું બંધારણ", "Subatomic particles and models", ["electrons", "protons", "neutrons", "Bohr model", "electronic configuration"]),
        (5, "The Fundamental Unit of Life", "જીવનનો મૂળભૂત એકમ", "Cell structure and organelles", ["cell membrane", "nucleus", "mitochondria", "cell division"]),
        (6, "Tissues", "પેશીઓ", "Plant and animal tissues", ["meristematic", "permanent tissue", "epithelial", "connective", "muscular"]),
        (7, "Diversity in Living Organisms", "સજીવોમાં વિવિધતા", "Classification of living organisms", ["taxonomy", "five kingdoms", "vertebrates", "invertebrates"]),
        (8, "Motion", "ગતિ", "Distance, displacement, speed, velocity", ["distance", "displacement", "velocity", "acceleration", "equations of motion"]),
        (9, "Force and Laws of Motion", "બળ અને ગતિના નિયમો", "Newton's laws of motion", ["inertia", "momentum", "Newton's laws", "action-reaction"]),
        (10, "Gravitation", "ગુરુત્વાકર્ષણ", "Universal law of gravitation", ["gravitational force", "free fall", "mass vs weight", "g"]),
        (11, "Work and Energy", "કાર્ય અને ઊર્જા", "Work, energy, and power", ["work", "kinetic energy", "potential energy", "conservation", "power"]),
        (12, "Sound", "ધ્વનિ", "Production and propagation of sound", ["longitudinal waves", "frequency", "amplitude", "echo", "resonance"]),
        (13, "Why Do We Fall Ill?", "આપણે શા માટે બીમાર પડીએ છીએ?", "Health and diseases", ["infectious", "non-infectious", "pathogens", "immunity"]),
        (14, "Natural Resources", "કુદરતી સંસાધનો", "Air, water, soil, and cycles", ["water cycle", "nitrogen cycle", "carbon cycle", "ozone"]),
        (15, "Improvement in Food Resources", "ખાદ્ય સંસાધનોમાં સુધારો", "Agriculture and animal husbandry", ["crop improvement", "animal husbandry", "fisheries"]),
    ],

    # ── Mathematics (Ganit — ગણિત) ──
    ("GSEB", "Class 9", "Mathematics"): [
        (1, "Number Systems", "સંખ્યા પદ્ધતિ", "Real numbers and properties", ["natural numbers", "rational", "irrational", "real number line", "exponents"]),
        (2, "Polynomials", "બહુપદી", "Polynomials in one variable", ["degree", "zeroes", "remainder theorem", "factor theorem", "identities"]),
        (3, "Coordinate Geometry", "યામ ભૂમિતિ", "Cartesian plane and plotting", ["x-axis", "y-axis", "origin", "quadrants", "ordered pairs"]),
        (4, "Linear Equations in Two Variables", "બે ચલમાં રેખીય સમીકરણો", "Linear equations and graphs", ["linear equation", "solution", "graph"]),
        (5, "Introduction to Euclid's Geometry", "યુક્લિડની ભૂમિતિનો પરિચય", "Axioms and postulates", ["axioms", "postulates", "Euclid's postulates"]),
        (6, "Lines and Angles", "રેખાઓ અને ખૂણાઓ", "Properties of lines and angles", ["linear pair", "vertically opposite", "transversal", "parallel lines"]),
        (7, "Triangles", "ત્રિકોણ", "Congruence of triangles", ["SAS", "ASA", "SSS", "RHS", "inequalities"]),
        (8, "Quadrilaterals", "ચતુર્ભુજ", "Properties of quadrilaterals", ["parallelogram", "rectangle", "rhombus", "mid-point theorem"]),
        (9, "Circles", "વર્તુળ", "Properties of circles", ["chord", "arc", "angle subtended", "cyclic quadrilateral"]),
        (10, "Heron's Formula", "હિરોનનું સૂત્ર", "Area using Heron's formula", ["semi-perimeter", "area of triangle", "applications"]),
        (11, "Surface Areas and Volumes", "પૃષ્ઠફળ અને ઘનફળ", "Surface areas and volumes of solids", ["cuboid", "cylinder", "cone", "sphere"]),
        (12, "Statistics", "આંકડાશાસ્ત્ર", "Data collection and representation", ["mean", "median", "mode", "frequency", "histogram"]),
    ],

    # ── English ──
    ("GSEB", "Class 9", "English"): [
        (1, "The Fun They Had", "", "Futuristic story about school", ["science fiction", "education", "technology"]),
        (2, "The Sound of Music", "", "Musical geniuses", ["Evelyn Glennie", "Bismillah Khan", "determination"]),
        (3, "The Little Girl", "", "Father-daughter relationship", ["family", "understanding", "fear"]),
        (4, "A Truly Beautiful Mind", "", "Albert Einstein biography", ["Einstein", "relativity", "genius"]),
        (5, "The Snake and the Mirror", "", "Humorous story", ["humour", "vanity", "snake"]),
        (6, "My Childhood", "", "APJ Abdul Kalam's memoir", ["autobiography", "harmony", "Rameswaram"]),
        (7, "Packing", "", "Humorous travel account", ["humour", "Jerome K. Jerome"]),
        (8, "Reach for the Top", "", "Achievement stories", ["Santosh Yadav", "Maria Sharapova", "determination"]),
        (9, "The Bond of Love", "", "A pet bear story", ["animal bonding", "love"]),
        (10, "Kathmandu", "", "Travel writing", ["travel", "Pashupatinath", "culture"]),
        (11, "If I Were You", "", "One-act play", ["drama", "suspense", "irony"]),
    ],

    # ── Social Science ──
    ("GSEB", "Class 9", "Social Science"): [
        # History
        (1, "The French Revolution", "ફ્રાંસની ક્રાંતિ", "Rise of democracy in France", ["French Revolution", "liberty", "equality", "Napoleon"]),
        (2, "Socialism in Europe and the Russian Revolution", "યુરોપમાં સમાજવાદ અને રશિયન ક્રાંતિ", "Rise of socialism", ["socialism", "communism", "Bolsheviks", "Lenin"]),
        (3, "Nazism and the Rise of Hitler", "નાઝીવાદ અને હિટલરનો ઉદય", "Nazi Germany", ["Hitler", "Nazi ideology", "Holocaust"]),
        (4, "Forest Society and Colonialism", "વન સમાજ અને સંસ્થાનવાદ", "Colonialism and forests", ["deforestation", "colonial laws", "tribal communities"]),
        (5, "Pastoralists in the Modern World", "આધુનિક વિશ્વમાં પશુપાલકો", "Pastoral communities", ["nomadic", "colonial rule", "pastoralism"]),
        # Geography
        (6, "India – Size and Location", "ભારત – કદ અને સ્થાન", "India's position and extent", ["latitude", "longitude", "neighbours", "IST"]),
        (7, "Physical Features of India", "ભારતનું ભૌતિક સ્વરૂપ", "Major landforms", ["Himalayas", "Northern Plains", "Peninsular Plateau"]),
        (8, "Drainage", "જળપ્રવાહ", "River systems of India", ["Himalayan rivers", "Peninsular rivers", "Ganga"]),
        (9, "Climate", "આબોહવા", "India's climate factors", ["monsoon", "seasons", "rainfall"]),
        (10, "Natural Vegetation and Wild Life", "કુદરતી વનસ્પતિ અને વન્ય પ્રાણીઓ", "Flora and fauna", ["tropical forest", "deciduous", "national parks"]),
        (11, "Population", "વસ્તી", "Population of India", ["density", "growth rate", "literacy", "migration"]),
        # Political Science
        (12, "What is Democracy? Why Democracy?", "લોકશાહી શું છે? લોકશાહી શા માટે?", "Understanding democracy", ["democracy", "features", "merits"]),
        (13, "Constitutional Design", "બંધારણીય રચના", "Indian Constitution making", ["Constituent Assembly", "preamble", "values"]),
        (14, "Electoral Politics", "ચૂંટણી રાજકારણ", "Elections in democracy", ["elections", "competition", "electoral system"]),
        (15, "Working of Institutions", "સંસ્થાઓનું કામકાજ", "Government institutions", ["Parliament", "executive", "judiciary"]),
        (16, "Democratic Rights", "લોકશાહી અધિકારો", "Fundamental rights", ["fundamental rights", "equality", "freedom"]),
        # Economics
        (17, "The Story of Village Palampur", "પાલમપુર ગામની કહાની", "Village economy", ["factors of production", "farming", "capital"]),
        (18, "People as Resource", "સંસાધન તરીકે લોકો", "Human capital", ["human capital", "education", "health"]),
        (19, "Poverty as a Challenge", "ગરીબી એક પડકાર", "Poverty in India", ["poverty line", "anti-poverty measures"]),
        (20, "Food Security in India", "ભારતમાં ખાદ્ય સુરક્ષા", "Ensuring food for all", ["PDS", "buffer stock", "food security"]),
    ],

    # ── Gujarati (First Language — ગુજરાતી) ──
    ("GSEB", "Class 9", "Gujarati"): [
        (1, "ઉત્તમ લક્ષણ", "Uttam Lakshan", "સદ્ગુણ વિશે — પદ્ય", ["કવિતા", "સદ્ગુણ", "નીતિ"]),
        (2, "વહાલનો દરિયો", "Vahalno Dariyo", "પ્રેમ અને કરુણા — ગદ્ય", ["પ્રેમ", "કુટુંબ", "ગદ્ય"]),
        (3, "ગાંધીજીનું જીવન", "Gandhijinu Jivan", "મહાત્મા ગાંધી — જીવનચરિત્ર", ["ગાંધીજી", "સત્ય", "અહિંસા"]),
        (4, "રખડપટ્ટી", "Rakhad-patti", "પ્રવાસ — ગદ્ય", ["પ્રવાસ", "સાહસ", "અનુભવ"]),
        (5, "ઝવેરચંદ મેઘાણી", "Zaverchand Meghani", "સાહિત્યકાર પરિચય", ["મેઘાણી", "લોકસાહિત્ય", "રાષ્ટ્રીય શાયર"]),
        (6, "વૃક્ષ", "Vruksh", "પ્રકૃતિ — કવિતા", ["વૃક્ષ", "પ્રકૃતિ", "પર્યાવરણ"]),
        (7, "નવલકથા — અંશ", "Navalkatha Ansh", "નવલકથામાંથી પસંદ ભાગ", ["નવલકથા", "ગદ્ય", "વાચન"]),
        (8, "નિબંધ લેખન", "Nibandh Lekhan", "નિબંધ લખવાની કળા", ["નિબંધ", "લેખન", "વ્યાકરણ"]),
        (9, "પત્ર લેખન", "Patra Lekhan", "ઔપચારિક અને અનૌપચારિક પત્ર", ["પત્ર", "ઔપચારિક", "અનૌપચારિક"]),
        (10, "વ્યાકરણ", "Vyakaran", "ગુજરાતી વ્યાકરણ", ["સંજ્ઞા", "ક્રિયાપદ", "વિશેષણ", "અલંકાર"]),
    ],
}


# ─────────────────────────────────────────────────────────────────────────────
# CLASS 10 — CBSE (NCERT 2024-25)
# ─────────────────────────────────────────────────────────────────────────────

CBSE_CLASS_10 = {
    # ── Science (NCERT) ──
    ("CBSE", "Class 10", "Science"): [
        (1, "Chemical Reactions and Equations", "रासायनिक अभिक्रियाएँ एवं समीकरण", "Types of chemical reactions and balancing", ["combination", "decomposition", "displacement", "double displacement", "oxidation-reduction"]),
        (2, "Acids, Bases and Salts", "अम्ल, क्षारक एवं लवण", "Properties and uses of acids, bases, salts", ["pH scale", "indicators", "neutralisation", "salt preparation", "water of crystallisation"]),
        (3, "Metals and Non-metals", "धातु एवं अधातु", "Properties and reactivity of metals", ["reactivity series", "extraction", "corrosion", "ionic compounds", "alloys"]),
        (4, "Carbon and its Compounds", "कार्बन एवं उसके यौगिक", "Organic chemistry basics", ["covalent bonding", "hydrocarbons", "functional groups", "homologous series", "ethanol", "ethanoic acid"]),
        (5, "Life Processes", "जैव प्रक्रम", "Nutrition, respiration, transport, excretion", ["autotrophic nutrition", "human digestion", "respiration", "blood circulation", "excretion"]),
        (6, "Control and Coordination", "नियंत्रण एवं समन्वय", "Nervous and hormonal systems", ["nervous system", "reflex arc", "brain", "hormones", "plant hormones"]),
        (7, "How do Organisms Reproduce?", "जीव जनन कैसे करते हैं?", "Reproduction in organisms", ["asexual reproduction", "sexual reproduction", "human reproductive system", "contraception"]),
        (8, "Heredity", "आनुवंशिकता", "Genetics and evolution basics", ["Mendel's laws", "dominant", "recessive", "sex determination", "evolution"]),
        (9, "Light – Reflection and Refraction", "प्रकाश – परावर्तन तथा अपवर्तन", "Laws of reflection and refraction", ["mirror formula", "lens formula", "magnification", "refractive index", "Snell's law"]),
        (10, "The Human Eye and the Colourful World", "मानव नेत्र तथा रंगबिरंगा संसार", "Eye defects and optical phenomena", ["myopia", "hypermetropia", "presbyopia", "dispersion", "scattering", "rainbow"]),
        (11, "Electricity", "विद्युत", "Current electricity fundamentals", ["Ohm's law", "resistance", "series", "parallel", "electric power", "heating effect"]),
        (12, "Magnetic Effects of Electric Current", "विद्युत धारा के चुम्बकीय प्रभाव", "Electromagnetism", ["magnetic field", "solenoid", "electromagnet", "electric motor", "electromagnetic induction", "generator"]),
        (13, "Our Environment", "हमारा पर्यावरण", "Ecosystems and environmental issues", ["food chains", "food webs", "ozone depletion", "waste management", "biodegradable"]),
    ],

    # ── Mathematics (NCERT) ──
    ("CBSE", "Class 10", "Mathematics"): [
        (1, "Real Numbers", "वास्तविक संख्याएँ", "Euclid's division and fundamental theorem", ["Euclid's division lemma", "HCF", "fundamental theorem of arithmetic", "irrational numbers", "decimal expansions"]),
        (2, "Polynomials", "बहुपद", "Zeros and division algorithm", ["zeros of polynomial", "relationship between zeros and coefficients", "division algorithm"]),
        (3, "Pair of Linear Equations in Two Variables", "दो चरों वाले रैखिक समीकरण युग्म", "Methods of solving linear equations", ["graphical method", "substitution", "elimination", "cross-multiplication", "consistency"]),
        (4, "Quadratic Equations", "द्विघात समीकरण", "Solving quadratic equations", ["factorisation", "completing the square", "quadratic formula", "discriminant", "nature of roots"]),
        (5, "Arithmetic Progressions", "समांतर श्रेढ़ी", "AP and its applications", ["common difference", "nth term", "sum of n terms", "applications"]),
        (6, "Triangles", "त्रिभुज", "Similarity of triangles", ["similar triangles", "BPT", "criteria for similarity", "Pythagoras theorem", "areas of similar triangles"]),
        (7, "Coordinate Geometry", "निर्देशांक ज्यामिति", "Distance, section formula, area", ["distance formula", "section formula", "mid-point", "area of triangle"]),
        (8, "Introduction to Trigonometry", "त्रिकोणमिति का परिचय", "Trigonometric ratios and identities", ["sin", "cos", "tan", "trigonometric ratios", "trigonometric identities", "complementary angles"]),
        (9, "Some Applications of Trigonometry", "त्रिकोणमिति के कुछ अनुप्रयोग", "Heights and distances", ["angle of elevation", "angle of depression", "height and distance problems"]),
        (10, "Circles", "वृत्त", "Tangents to a circle", ["tangent", "number of tangents", "tangent from external point", "tangent properties"]),
        (11, "Areas Related to Circles", "वृत्तों से संबंधित क्षेत्रफल", "Area of sectors and segments", ["area of sector", "area of segment", "area of combinations"]),
        (12, "Surface Areas and Volumes", "पृष्ठीय क्षेत्रफल और आयतन", "Combinations of solids", ["combination of solids", "conversion of solids", "frustum of cone"]),
        (13, "Statistics", "सांख्यिकी", "Mean, median, mode of grouped data", ["mean of grouped data", "median of grouped data", "mode of grouped data", "ogive"]),
        (14, "Probability", "प्रायिकता", "Classical probability", ["experimental probability", "theoretical probability", "complementary events", "impossible event", "sure event"]),
    ],

    # ── English (First Flight — NCERT) ──
    ("CBSE", "Class 10", "English"): [
        (1, "A Letter to God", "—", "Faith and humour in a farmer's letter", ["faith", "irony", "poverty", "Lencho"]),
        (2, "Nelson Mandela: Long Walk to Freedom", "—", "Mandela's journey to freedom", ["apartheid", "freedom", "courage", "inauguration"]),
        (3, "Two Stories about Flying", "—", "Fear and courage in flying", ["fear", "Black Aeroplane", "courage", "mystery"]),
        (4, "From the Diary of Anne Frank", "—", "Anne Frank's diary entries", ["diary", "World War II", "adolescence", "hope"]),
        (5, "The Hundred Dresses – I", "—", "Bullying and acceptance", ["bullying", "poverty", "friendship", "regret"]),
        (6, "The Hundred Dresses – II", "—", "Resolution and realisation", ["guilt", "apology", "kindness", "understanding"]),
        (7, "Glimpses of India", "—", "Stories from different parts of India", ["Goa", "Rajasthan", "Assam", "culture", "diversity"]),
        (8, "Mijbil the Otter", "—", "A man and his pet otter", ["pet", "travel", "otter", "companionship"]),
        (9, "Madam Rides the Bus", "—", "A child's first bus journey", ["curiosity", "independence", "childhood", "adventure"]),
        (10, "The Sermon at Benares", "—", "Buddha's teachings on death", ["Buddha", "death", "grief", "wisdom", "impermanence"]),
        (11, "The Proposal", "—", "A one-act play by Chekhov", ["comedy", "marriage", "argument", "Chekhov", "satire"]),
    ],

    # ── Social Science (History + Geography + Political Science + Economics) ──
    ("CBSE", "Class 10", "Social Science"): [
        # History (India and the Contemporary World II)
        (1, "The Rise of Nationalism in Europe", "यूरोप में राष्ट्रवाद का उदय", "Nationalism and nation-states in Europe", ["nationalism", "nation-state", "liberalism", "unification of Italy", "unification of Germany"]),
        (2, "Nationalism in India", "भारत में राष्ट्रवाद", "Indian national movement", ["Non-Cooperation", "Civil Disobedience", "Salt March", "Quit India", "Gandhiji"]),
        (3, "The Making of a Global World", "भूमंडलीकृत विश्व का बनना", "Globalisation through history", ["silk routes", "colonialism", "industrialisation", "Great Depression", "post-war economy"]),
        (4, "The Age of Industrialisation", "औद्योगीकरण का युग", "Industrial revolution in India and Europe", ["proto-industrialisation", "factories", "labour", "Indian textiles", "hand vs machine"]),
        (5, "Print Culture and the Modern World", "मुद्रण संस्कृति और आधुनिक दुनिया", "History of print and its impact", ["printing press", "Gutenberg", "manuscripts", "censorship", "reading public"]),
        # Geography (Contemporary India II)
        (6, "Resources and Development", "संसाधन एवं विकास", "Types and conservation of resources", ["renewable", "non-renewable", "resource planning", "land use", "soil conservation"]),
        (7, "Forest and Wildlife Resources", "वन एवं वन्य जीव संसाधन", "Conservation of forests and wildlife", ["biodiversity", "flora", "fauna", "conservation", "community participation"]),
        (8, "Water Resources", "जल संसाधन", "Water availability and management", ["dams", "rainwater harvesting", "groundwater", "irrigation", "multipurpose projects"]),
        (9, "Agriculture", "कृषि", "Types and reforms in Indian agriculture", ["types of farming", "cropping pattern", "food crops", "cash crops", "Green Revolution"]),
        (10, "Minerals and Energy Resources", "खनिज तथा ऊर्जा संसाधन", "Mineral and energy resources of India", ["metallic minerals", "non-metallic minerals", "conventional energy", "non-conventional energy"]),
        (11, "Manufacturing Industries", "विनिर्माण उद्योग", "Industrial development in India", ["agro-based", "mineral-based", "industrial pollution", "NMCC"]),
        (12, "Life Lines of National Economy", "राष्ट्रीय अर्थव्यवस्था की जीवन रेखाएँ", "Transport and communication", ["roadways", "railways", "waterways", "airways", "communication", "trade"]),
        # Political Science (Democratic Politics II)
        (13, "Power Sharing", "सत्ता की साझेदारी", "Need and forms of power sharing", ["Belgium", "Sri Lanka", "horizontal", "vertical distribution", "community government"]),
        (14, "Federalism", "संघवाद", "Federal system in India", ["federalism", "unitary", "union list", "state list", "concurrent list", "decentralisation"]),
        (15, "Gender, Religion and Caste", "लिंग, धर्म और जाति", "Social divisions and politics", ["gender inequality", "communalism", "casteism", "secularism"]),
        (16, "Political Parties", "राजनीतिक दल", "Role and types of political parties", ["national parties", "state parties", "party system", "reforms", "challenges"]),
        (17, "Outcomes of Democracy", "लोकतंत्र के परिणाम", "Assessing democracy", ["accountability", "responsive government", "inequality", "dignity", "conflict resolution"]),
        # Economics
        (18, "Development", "विकास", "Concept and measurement of development", ["income", "HDI", "sustainability", "public facilities", "BMI"]),
        (19, "Sectors of the Indian Economy", "भारतीय अर्थव्यवस्था के क्षेत्रक", "Primary, secondary, tertiary sectors", ["primary sector", "secondary sector", "tertiary sector", "organised", "unorganised", "GDP"]),
        (20, "Money and Credit", "मुद्रा और साख", "Money, banking, and credit", ["barter system", "money", "banks", "credit", "self-help groups"]),
        (21, "Globalisation and the Indian Economy", "वैश्वीकरण और भारतीय अर्थव्यवस्था", "Impact of globalisation", ["MNCs", "foreign trade", "liberalisation", "WTO", "fair globalisation"]),
        (22, "Consumer Rights", "उपभोक्ता अधिकार", "Consumer protection", ["consumer rights", "RTI", "consumer courts", "COPRA", "exploitation"]),
    ],

    # ── Hindi (Kshitij Part 2 — क्षितिज भाग 2) ──
    ("CBSE", "Class 10", "Hindi"): [
        (1, "पद", "Pad — Surdas", "सूरदास — कृष्ण भक्ति के पद", ["सूरदास", "कृष्ण", "भक्ति", "वात्सल्य"]),
        (2, "राम-लक्ष्मण-परशुराम संवाद", "Ram-Lakshman-Parshuram Samvad", "तुलसीदास — राम और परशुराम का संवाद", ["तुलसीदास", "रामचरितमानस", "वीर रस"]),
        (3, "सवैया एवं कवित्त", "Savaiya Evam Kavitt", "देव — शृंगार रस की कविता", ["देव", "शृंगार रस", "सवैया", "कवित्त"]),
        (4, "आत्मकथ्य", "Atmakathya", "जयशंकर प्रसाद — आत्मकथा शैली", ["जयशंकर प्रसाद", "छायावाद", "आत्मकथा"]),
        (5, "उत्साह / अट नहीं रही है", "Utsaah / At Nahi Rahi Hai", "निराला — प्रकृति और उत्साह", ["निराला", "छायावाद", "बादल", "प्रकृति"]),
        (6, "यह दंतुरित मुसकान / फसल", "Yah Danturit Muskan / Fasal", "नागार्जुन — बाल सौंदर्य और किसान", ["नागार्जुन", "प्रगतिवाद", "बच्चे", "किसान"]),
        (7, "छाया मत छूना", "Chhaya Mat Chhuna", "गिरिजाकुमार माथुर — जीवन दर्शन", ["गिरिजाकुमार माथुर", "स्मृति", "वर्तमान"]),
        (8, "कन्यादान", "Kanyadaan", "ऋतुराज — माँ की शिक्षा", ["ऋतुराज", "कन्यादान", "माँ-बेटी", "विवाह"]),
        (9, "संगतकार", "Sangatkar", "मंगलेश डबराल — सहयोगी की भूमिका", ["मंगलेश डबराल", "संगीत", "सहयोग"]),
        (10, "नेताजी का चश्मा", "Netaji Ka Chashma", "स्वयं प्रकाश — देशभक्ति की कहानी", ["स्वयं प्रकाश", "देशभक्ति", "कहानी"]),
        (11, "बालगोबिन भगत", "Balgobin Bhagat", "रामवृक्ष बेनीपुरी — संत स्वभाव का चित्रण", ["रामवृक्ष बेनीपुरी", "रेखाचित्र", "सादगी"]),
        (12, "लखनवी अंदाज़", "Lakhnavi Andaaz", "यशपाल — नवाबी अंदाज़ पर व्यंग्य", ["यशपाल", "व्यंग्य", "दिखावा"]),
        (13, "मानवीय करुणा की दिव्य चमक", "Manviya Karuna Ki Divya Chamak", "सर्वेश्वर दयाल सक्सेना — फ़ादर बुल्के", ["सर्वेश्वर दयाल सक्सेना", "फ़ादर बुल्के", "करुणा"]),
        (14, "एक कहानी यह भी", "Ek Kahani Yah Bhi", "मन्नू भंडारी — स्त्री संघर्ष", ["मन्नू भंडारी", "आत्मकथा", "स्त्री"]),
        (15, "नौबतखाने में इबादत", "Naubatkhane Mein Ibadat", "यतींद्र मिश्र — बिस्मिल्लाह खाँ", ["यतींद्र मिश्र", "बिस्मिल्लाह खाँ", "शहनाई", "संगीत"]),
        (16, "संस्कृति", "Sanskriti", "भदंत आनंद कौसल्यायन — संस्कृति की समझ", ["भदंत आनंद कौसल्यायन", "संस्कृति", "सभ्यता"]),
    ],
}


# ─────────────────────────────────────────────────────────────────────────────
# CLASS 10 — ICSE (CISCE Syllabus 2024-25)
# ─────────────────────────────────────────────────────────────────────────────

ICSE_CLASS_10 = {
    # ── Physics ──
    ("ICSE", "Class 10", "Physics"): [
        (1, "Force", "", "Force, turning effects, and equilibrium", ["moment of force", "couple", "equilibrium", "centre of gravity", "uniform circular motion"]),
        (2, "Work, Energy and Power", "", "Work-energy theorem and machines", ["work", "energy", "power", "machines", "mechanical advantage", "velocity ratio"]),
        (3, "Machines", "", "Simple machines and their types", ["lever", "pulley", "inclined plane", "efficiency", "MA", "VR"]),
        (4, "Refraction of Light at Plane Surfaces", "", "Refraction laws and total internal reflection", ["Snell's law", "refractive index", "critical angle", "total internal reflection", "prism"]),
        (5, "Refraction through Lenses", "", "Lens formula and power", ["convex lens", "concave lens", "lens formula", "power of lens", "magnification"]),
        (6, "Spectrum", "", "Dispersion and electromagnetic spectrum", ["dispersion", "spectrum", "scattering", "electromagnetic spectrum"]),
        (7, "Sound", "", "Sound waves and characteristics", ["reflection of sound", "echo", "natural frequency", "forced vibrations", "resonance", "loudness", "pitch"]),
        (8, "Current Electricity", "", "Ohm's law, circuits, and electrical energy", ["Ohm's law", "resistivity", "EMF", "internal resistance", "electrical energy", "power"]),
        (9, "Household Circuits", "", "Domestic electric circuits and safety", ["fuse", "earthing", "MCB", "three-pin plug", "power rating"]),
        (10, "Electromagnetism", "", "Magnetic effects of current", ["magnetic field", "solenoid", "electromagnetic induction", "transformer", "AC generator", "DC motor"]),
        (11, "Calorimetry", "", "Heat and temperature measurement", ["specific heat capacity", "calorimetry", "change of state", "latent heat"]),
        (12, "Radioactivity and Nuclear Energy", "", "Nuclear physics basics", ["radioactivity", "alpha", "beta", "gamma", "nuclear fission", "nuclear fusion", "atomic energy"]),
    ],

    # ── Chemistry ──
    ("ICSE", "Class 10", "Chemistry"): [
        (1, "Periodic Table and Periodicity", "", "Modern periodic table", ["periods", "groups", "periodic properties", "atomic radius", "ionisation energy", "electronegativity"]),
        (2, "Chemical Bonding", "", "Ionic and covalent bonding", ["ionic bond", "covalent bond", "coordinate bond", "electrovalent compounds", "properties"]),
        (3, "Acids, Bases and Salts", "", "Properties, reactions, and pH", ["strong acids", "weak acids", "bases", "pH", "indicators", "neutralisation"]),
        (4, "Analytical Chemistry", "", "Testing for ions and gases", ["flame test", "dry test", "wet test", "gas tests", "qualitative analysis"]),
        (5, "Mole Concept and Stoichiometry", "", "Chemical calculations", ["mole", "Avogadro's number", "molar volume", "stoichiometry", "percentage composition"]),
        (6, "Electrolysis", "", "Electrolysis and its applications", ["electrolyte", "electrode", "electroplating", "extraction of metals", "electrolysis of water"]),
        (7, "Metallurgy", "", "Extraction of metals from ores", ["ore concentration", "reduction", "refining", "alloys", "corrosion"]),
        (8, "Study of Compounds — Hydrogen Chloride", "", "Preparation and properties of HCl", ["preparation", "properties", "fountain experiment", "tests"]),
        (9, "Study of Compounds — Ammonia and Nitric Acid", "", "Nitrogen compounds", ["Haber process", "Ostwald process", "ammonia properties", "nitric acid"]),
        (10, "Study of Compounds — Sulphuric Acid", "", "King of chemicals", ["Contact process", "properties", "uses", "dilution", "tests"]),
        (11, "Organic Chemistry", "", "Introduction to organic compounds", ["hydrocarbons", "homologous series", "IUPAC naming", "isomerism", "functional groups"]),
    ],

    # ── Biology ──
    ("ICSE", "Class 10", "Biology"): [
        (1, "Cell Division", "", "Mitosis and meiosis", ["cell cycle", "mitosis", "meiosis", "chromosomes", "significance"]),
        (2, "Genetics", "", "Heredity and variation", ["Mendel's laws", "monohybrid cross", "dihybrid cross", "sex determination", "genetic disorders"]),
        (3, "Absorption by Roots", "", "Water absorption mechanisms", ["osmosis", "diffusion", "active transport", "root pressure", "factors affecting"]),
        (4, "Transpiration", "", "Loss of water from plants", ["stomata", "factors", "significance", "guttation", "transpiration pull"]),
        (5, "Photosynthesis", "", "Food production in plants", ["light reaction", "dark reaction", "factors", "chloroplast", "adaptations"]),
        (6, "Chemical Coordination in Plants", "", "Plant hormones and responses", ["auxins", "gibberellins", "cytokinins", "tropisms", "nastic movements"]),
        (7, "The Nervous System", "", "Human nervous system", ["central nervous system", "peripheral", "reflex arc", "brain structure", "spinal cord"]),
        (8, "The Endocrine System", "", "Hormones and glands", ["pituitary", "thyroid", "adrenal", "pancreas", "feedback mechanism"]),
        (9, "The Reproductive System", "", "Human reproduction", ["male system", "female system", "menstrual cycle", "fertilisation", "development"]),
        (10, "Population", "", "Population growth and control", ["growth rate", "birth rate", "death rate", "population explosion", "family planning"]),
        (11, "Pollution", "", "Environmental pollution", ["air pollution", "water pollution", "soil pollution", "noise pollution", "control measures"]),
    ],

    # ── Mathematics ──
    ("ICSE", "Class 10", "Mathematics"): [
        (1, "GST (Goods and Services Tax)", "", "Tax calculations and problems", ["GST", "CGST", "SGST", "IGST", "input tax credit"]),
        (2, "Banking", "", "Savings and recurring deposits", ["simple interest", "compound interest", "recurring deposit", "maturity value"]),
        (3, "Shares and Dividends", "", "Investment in shares", ["shares", "face value", "market value", "dividend", "return on investment"]),
        (4, "Linear Inequations", "", "Solving and graphing inequations", ["linear inequation", "solution set", "number line", "replacement set"]),
        (5, "Quadratic Equations", "", "Solving quadratic equations", ["factorisation", "formula method", "discriminant", "nature of roots", "word problems"]),
        (6, "Ratio and Proportion", "", "Componendo, dividendo, and applications", ["componendo", "dividendo", "alternendo", "invertendo", "k-method"]),
        (7, "Factorisation of Polynomials", "", "Factor theorem applications", ["factor theorem", "remainder theorem", "factorisation", "HCF", "LCM"]),
        (8, "Matrices", "", "Matrix operations", ["order", "addition", "subtraction", "multiplication", "identity matrix", "transpose"]),
        (9, "Arithmetic and Geometric Progressions", "", "AP and GP formulas", ["nth term AP", "sum of AP", "nth term GP", "sum of GP", "applications"]),
        (10, "Reflection", "", "Reflection in coordinate geometry", ["reflection in x-axis", "y-axis", "origin", "invariant points"]),
        (11, "Section and Mid-point Formula", "", "Dividing line segments", ["section formula", "mid-point", "centroid", "applications"]),
        (12, "Equation of a Line", "", "Straight line equations", ["slope", "intercept", "slope-intercept form", "two-point form", "parallel", "perpendicular"]),
        (13, "Similarity", "", "Similar triangles and applications", ["criteria for similarity", "areas", "BPT", "applications"]),
        (14, "Loci", "", "Locus and its construction", ["definition", "locus theorems", "construction of loci", "intersection of loci"]),
        (15, "Circles", "", "Circle theorems and tangent properties", ["cyclic quadrilateral", "tangent properties", "alternate segment theorem", "constructions"]),
        (16, "Constructions", "", "Geometric constructions with compass", ["tangent to circle", "circumscribed circle", "inscribed circle", "similar triangles"]),
        (17, "Mensuration", "", "Surface area and volume of solids", ["cylinder", "cone", "sphere", "combination of solids", "conversion"]),
        (18, "Trigonometry", "", "Identities, heights, and distances", ["identities", "complementary angles", "heights and distances", "angle of elevation", "angle of depression"]),
        (19, "Statistics", "", "Mean, median, mode, and ogive", ["mean", "median", "quartiles", "histogram", "ogive", "inter-quartile range"]),
        (20, "Probability", "", "Classical probability problems", ["equally likely outcomes", "complementary events", "sample space", "simple events"]),
    ],

    # ── English (Literature) ──
    ("ICSE", "Class 10", "English"): [
        (1, "The Merchant of Venice", "", "Shakespeare — detailed drama study", ["Shylock", "Portia", "Antonio", "trial scene", "mercy vs justice"]),
        (2, "Treasure Trove — Short Stories", "", "Prose: short stories collection", ["prose analysis", "character study", "themes", "literary devices"]),
        (3, "Treasure Trove — Poems", "", "Poetry: poems collection", ["poetry analysis", "figures of speech", "imagery", "themes"]),
        (4, "Grammar", "", "Advanced English grammar", ["tenses", "voice", "narration", "conditionals", "prepositions", "conjunctions"]),
        (5, "Composition — Essay and Letter", "", "Formal writing skills", ["argumentative essay", "descriptive essay", "formal letter", "informal letter"]),
        (6, "Comprehension and Precis", "", "Reading comprehension and summary", ["unseen passage", "precis writing", "note-making"]),
    ],

    # ── History and Civics ──
    ("ICSE", "Class 10", "History and Civics"): [
        # History
        (1, "The First War of Independence (1857)", "", "Causes, events, and aftermath", ["causes", "leaders", "centres of revolt", "failure", "consequences"]),
        (2, "Growth of Nationalism", "", "Rise of Indian national movement", ["Indian National Congress", "moderates", "extremists", "Swadeshi", "partition of Bengal"]),
        (3, "First Phase of Indian National Movement (1885-1919)", "", "Congress and early freedom struggle", ["INC formation", "moderates", "extremists", "Lucknow Pact", "Home Rule"]),
        (4, "Mahatma Gandhi and the National Movement (1919-1947)", "", "Gandhi's role in freedom struggle", ["Non-Cooperation", "Civil Disobedience", "Quit India", "Salt March"]),
        (5, "The Contemporary World", "", "World War I and II, League of Nations, UN", ["World War I", "World War II", "League of Nations", "United Nations", "Cold War"]),
        (6, "India Wins Freedom and Partition", "", "Independence and partition of India", ["Mountbatten Plan", "partition", "integration of states", "Constitution"]),
        (7, "Non-Aligned Movement and India's Foreign Policy", "", "India's role in world affairs", ["NAM", "Panchsheel", "India-China", "India-Pakistan", "foreign policy"]),
        # Civics
        (8, "The Union Parliament", "", "Structure and functions", ["Lok Sabha", "Rajya Sabha", "sessions", "legislation", "budget"]),
        (9, "The President and Vice-President", "", "Executive head of India", ["election", "powers", "emergency powers", "ordinance", "veto"]),
        (10, "The Prime Minister and Council of Ministers", "", "Real executive of India", ["appointment", "powers", "collective responsibility", "cabinet"]),
        (11, "The Supreme Court", "", "Guardian of the Constitution", ["composition", "jurisdiction", "judicial review", "PIL", "independence"]),
        (12, "The High Court", "", "Highest court in a state", ["composition", "jurisdiction", "writ jurisdiction", "appeals"]),
        (13, "The State Legislature and Executive", "", "State government structure", ["Governor", "Chief Minister", "state legislature", "Vidhan Sabha"]),
    ],

    # ── Geography ──
    ("ICSE", "Class 10", "Geography"): [
        (1, "Map Reading and Interpretation", "", "Topographic maps and survey of India maps", ["scale", "symbols", "contours", "gradient", "cross-section"]),
        (2, "Climate of India", "", "Factors and seasons of India's climate", ["monsoon mechanism", "seasons", "rainfall distribution", "climate regions"]),
        (3, "Soil Resources of India", "", "Types and conservation of soil", ["alluvial", "black soil", "red soil", "laterite", "soil erosion", "conservation"]),
        (4, "Natural Vegetation of India", "", "Types of forests and conservation", ["tropical rainforest", "deciduous", "tidal", "desert vegetation", "afforestation"]),
        (5, "Water Resources of India", "", "Irrigation and water management", ["monsoon dependence", "irrigation methods", "multipurpose projects", "conservation"]),
        (6, "Mineral Resources of India", "", "Distribution of minerals", ["iron ore", "manganese", "coal", "petroleum", "mica", "limestone"]),
        (7, "Energy Resources — Conventional", "", "Coal, petroleum, and hydel power", ["coal fields", "oil fields", "thermal power", "hydel power"]),
        (8, "Energy Resources — Non-Conventional", "", "Renewable energy sources", ["solar", "wind", "tidal", "geothermal", "biogas", "nuclear"]),
        (9, "Manufacturing Industries", "", "Major industries of India", ["iron and steel", "cotton textile", "sugar", "petrochemical", "IT"]),
        (10, "Transport in India", "", "Modes of transport", ["roadways", "railways", "waterways", "airways", "pipelines"]),
        (11, "Waste Management", "", "Types and methods of waste disposal", ["biodegradable", "non-biodegradable", "recycling", "composting", "incineration"]),
    ],
}


# ─────────────────────────────────────────────────────────────────────────────
# CLASS 10 — MSBSHSE (Maharashtra Board — Balbharati 2024-25)
# ─────────────────────────────────────────────────────────────────────────────

MSBSHSE_CLASS_10 = {
    # ── Science and Technology (Part 1 + Part 2) ──
    ("MSBSHSE", "Class 10", "Science"): [
        (1, "Gravitation", "गुरुत्वाकर्षण", "Kepler's laws and gravity", ["Kepler's laws", "universal gravitation", "free fall", "escape velocity", "satellites"]),
        (2, "Periodic Classification of Elements", "मूलद्रव्यांचे आवर्ती वर्गीकरण", "Modern periodic table", ["Mendeleev", "modern periodic table", "periods", "groups", "trends"]),
        (3, "Chemical Reactions and Equations", "रासायनिक अभिक्रिया व समीकरणे", "Types and balancing of reactions", ["combination", "decomposition", "displacement", "redox", "balancing"]),
        (4, "Effects of Electric Current", "विद्युत धारेचे परिणाम", "Heating and magnetic effects", ["heating effect", "magnetic effect", "electromagnet", "motor", "generator"]),
        (5, "Heat", "उष्णता", "Specific heat and latent heat", ["specific heat capacity", "calorimetry", "latent heat", "change of state"]),
        (6, "Refraction of Light", "प्रकाशाचे अपवर्तन", "Laws of refraction", ["Snell's law", "refractive index", "total internal reflection", "prism"]),
        (7, "Lenses", "भिंग", "Convex and concave lenses", ["lens formula", "magnification", "power of lens", "lens maker equation"]),
        (8, "Metallurgy", "धातुकर्म", "Extraction and properties of metals", ["ore concentration", "roasting", "smelting", "refining", "alloys"]),
        (9, "Carbon Compounds", "कार्बनी संयुगे", "Organic chemistry basics", ["hydrocarbons", "functional groups", "nomenclature", "isomerism", "reactions"]),
        (10, "Space Missions", "अंतराळ मोहिमा", "India's space program", ["ISRO", "satellites", "Chandrayaan", "Mangalyaan", "space technology"]),
        (11, "Heredity and Evolution", "आनुवंशिकता आणि उत्क्रांती", "Genetics and evolution", ["Mendel", "DNA", "mutation", "natural selection", "speciation"]),
        (12, "Life Processes in Living Organisms – Part 1", "सजीवांतील जीवनप्रक्रिया – भाग 1", "Nutrition and respiration", ["nutrition types", "human digestion", "respiration", "ATP"]),
        (13, "Life Processes in Living Organisms – Part 2", "सजीवांतील जीवनप्रक्रिया – भाग 2", "Excretion and circulation", ["excretion", "blood circulation", "lymph", "kidneys"]),
        (14, "Environmental Management", "पर्यावरण व्यवस्थापन", "Biodiversity and conservation", ["biodiversity", "ecosystem", "conservation", "sustainable development"]),
        (15, "Towards Green Energy", "हरित ऊर्जेकडे", "Renewable energy sources", ["solar energy", "wind energy", "biogas", "hydrogen fuel", "energy conservation"]),
        (16, "Animal Classification", "प्राण्यांचे वर्गीकरण", "Vertebrate and invertebrate classification", ["invertebrates", "vertebrates", "phylum", "class", "characteristics"]),
        (17, "Introduction to Microbiology", "सूक्ष्मजीवशास्त्र परिचय", "Study of microorganisms", ["bacteria", "virus", "fungi", "protozoa", "microbial techniques"]),
        (18, "Cell Biology and Biotechnology", "पेशी जीवशास्त्र आणि जैवतंत्रज्ञान", "Cell and genetic engineering", ["cell organelles", "DNA", "GMO", "gene therapy", "biotechnology applications"]),
        (19, "Social Health", "सामाजिक आरोग्य", "Addiction and mental health", ["addiction", "tobacco", "alcohol", "mental health", "stress management"]),
        (20, "Disaster Management", "आपत्ती व्यवस्थापन", "Natural and man-made disasters", ["earthquake", "flood", "fire", "first aid", "preparedness"]),
    ],

    # ── Mathematics (Algebra + Geometry) ──
    ("MSBSHSE", "Class 10", "Mathematics"): [
        (1, "Linear Equations in Two Variables", "दोन चलांतील रेषीय समीकरणे", "Solving pair of linear equations", ["graphical method", "substitution", "elimination", "cross-multiplication"]),
        (2, "Quadratic Equations", "वर्गसमीकरणे", "Quadratic formula and applications", ["factorisation", "formula method", "nature of roots", "discriminant", "word problems"]),
        (3, "Arithmetic Progression", "समांतर श्रेणी", "AP formulas and applications", ["common difference", "nth term", "sum of terms", "applications"]),
        (4, "Financial Planning", "आर्थिक नियोजन", "GST, shares, and banking", ["GST", "shares", "dividend", "banking", "compound interest"]),
        (5, "Probability", "संभाव्यता", "Classical probability", ["sample space", "events", "equally likely", "complementary events"]),
        (6, "Statistics", "सांख्यिकी", "Mean, median, mode", ["mean", "median", "mode", "grouped data", "ogive"]),
        (7, "Similarity", "समरूपता", "Similar triangles and properties", ["AA criterion", "SAS", "SSS", "areas of similar triangles", "BPT"]),
        (8, "Pythagoras Theorem", "पायथागोरस प्रमेय", "Theorem and applications", ["Pythagoras theorem", "converse", "30-60-90", "45-45-90", "applications"]),
        (9, "Circle", "वर्तुळ", "Tangent properties and theorems", ["tangent", "secant", "tangent properties", "tangent from external point"]),
        (10, "Geometric Constructions", "भौमितिक रचना", "Construction of tangents and triangles", ["tangent to circle", "triangle construction", "similar triangle"]),
        (11, "Coordinate Geometry", "सहनिर्देशक भूमिती", "Distance, section, slope", ["distance formula", "section formula", "slope", "equation of line"]),
        (12, "Trigonometry", "त्रिकोणमिती", "Heights, distances, and identities", ["trigonometric identities", "heights and distances", "angle of elevation", "angle of depression"]),
        (13, "Mensuration", "क्षेत्रमिती", "Area and volume of solids", ["cylinder", "cone", "sphere", "frustum", "combination of solids"]),
    ],

    # ── English ──
    ("MSBSHSE", "Class 10", "English"): [
        (1, "Where the Mind is Without Fear", "", "Poetry — Tagore's vision of India", ["Rabindranath Tagore", "freedom", "knowledge", "courage"]),
        (2, "The Thief's Story", "", "Prose — trust and transformation", ["trust", "theft", "transformation", "honesty"]),
        (3, "On Wings of Courage", "", "Prose — bravery and adventure", ["courage", "adventure", "determination"]),
        (4, "The Luncheon", "", "Prose — humour and social commentary", ["humour", "irony", "social dining"]),
        (5, "His First Flight", "", "Prose — overcoming fear", ["fear", "flight", "courage", "self-confidence"]),
        (6, "The Last Lesson", "", "Prose — patriotism and language", ["patriotism", "language", "war", "Alphonse Daudet"]),
        (7, "An Astrologer's Day", "", "Prose — irony and fate", ["astrology", "irony", "fate", "R.K. Narayan"]),
        (8, "Small Towns and Rivers", "", "Poetry — nostalgia and nature", ["nature", "nostalgia", "hometown"]),
        (9, "Unbeatable Jack", "", "Prose — perseverance", ["determination", "sports", "never give up"]),
        (10, "The Gift of the Magi", "", "Prose — love and sacrifice", ["love", "sacrifice", "O. Henry", "irony"]),
        (11, "Grammar and Writing Skills", "", "Language study and composition", ["tenses", "voice", "clauses", "letter writing", "essay"]),
    ],

    # ── Social Science (History + Geography + Political Science + Economics) ──
    ("MSBSHSE", "Class 10", "Social Science"): [
        # History
        (1, "Historiography — Development", "इतिहासलेखन — विकास", "Methods and approaches in history", ["historiography", "sources", "interpretation", "objectivity"]),
        (2, "World Heritage", "जागतिक वारसा", "UNESCO World Heritage sites", ["UNESCO", "cultural heritage", "natural heritage", "preservation"]),
        (3, "India and European Contacts", "भारत आणि युरोपीय संपर्क", "European arrival in India", ["Portuguese", "Dutch", "French", "British", "trade"]),
        (4, "Expansion of British Rule", "ब्रिटिश राजवटीचा विस्तार", "British territorial expansion", ["subsidiary alliance", "doctrine of lapse", "wars", "resistance"]),
        (5, "Social and Religious Reforms", "सामाजिक व धार्मिक सुधारणा", "Reform movements in India", ["Raja Ram Mohan Roy", "Jyotirao Phule", "Dayananda Saraswati", "women's rights"]),
        (6, "Indian National Movement", "भारतीय राष्ट्रीय चळवळ", "Freedom struggle phases", ["INC", "Gandhiji", "Non-Cooperation", "Civil Disobedience", "Quit India"]),
        # Geography
        (7, "Field Visit and Study", "क्षेत्रभेट आणि अभ्यास", "Geographical fieldwork", ["survey", "data collection", "analysis", "report"]),
        (8, "Climate of Maharashtra", "महाराष्ट्राचे हवामान", "Maharashtra's climate features", ["monsoon", "rainfall", "temperature", "seasons"]),
        (9, "Population and Urbanisation", "लोकसंख्या आणि नागरीकरण", "Population trends and urban growth", ["growth rate", "density", "urbanisation", "problems"]),
        (10, "Tourism, Transport and Communication", "पर्यटन, वाहतूक आणि दळणवळण", "Infrastructure of Maharashtra", ["tourism", "road", "rail", "communication"]),
        (11, "Trade", "व्यापार", "Internal and international trade", ["exports", "imports", "balance of trade", "WTO"]),
        # Political Science
        (12, "Democracy", "लोकशाही", "Principles and challenges of democracy", ["democracy", "participation", "accountability", "challenges"]),
        (13, "Political Parties", "राजकीय पक्ष", "Party system in India", ["national parties", "regional parties", "functions", "challenges"]),
        (14, "Challenges to Democracy", "लोकशाहीसमोरील आव्हाने", "Issues facing Indian democracy", ["corruption", "criminalization", "inequality", "communalism"]),
        # Economics
        (15, "Indian Economy: Towards Self-Reliance", "भारतीय अर्थव्यवस्था: स्वावलंबनाकडे", "Self-reliant India", ["Atmanirbhar Bharat", "Make in India", "economic reforms"]),
        (16, "Money and Banking", "मुद्रा आणि बँकिंग", "Banking system in India", ["RBI", "commercial banks", "digital banking", "credit"]),
        (17, "Government Budget and Taxation", "सरकारी अर्थसंकल्प आणि कर", "Government finances", ["budget", "revenue", "expenditure", "direct tax", "indirect tax"]),
    ],

    # ── Marathi (First Language) ──
    ("MSBSHSE", "Class 10", "Marathi"): [
        (1, "जय जय हे भारत देशा", "Jay Jay He Bharat Desha", "देशभक्ती — पद्य", ["देशभक्ती", "कविता"]),
        (2, "खोद आणखी थोडे", "Khod Aankhi Thode", "प्रयत्न — गद्य", ["प्रयत्न", "चिकाटी"]),
        (3, "शब्दांचे सामर्थ्य", "Shabdanche Samarthya", "भाषेची ताकद — ललित", ["भाषा", "शब्द", "सामर्थ्य"]),
        (4, "उत्तम लक्षण", "Uttam Lakshan", "सदगुण — कविता", ["नीती", "सदगुण", "संतसाहित्य"]),
        (5, "दहा वर्षे", "Daha Varshe", "कालगणना — कथा", ["काळ", "आठवणी", "जीवन"]),
        (6, "आईची आठवण", "Aaichi Aathvan", "स्मरण — ललित लेख", ["आई", "स्मृती", "प्रेम"]),
        (7, "फूल आणि मधुमाशी", "Phul Aani Madhumashi", "निसर्ग — कविता", ["निसर्ग", "फुले", "मधमाशी"]),
        (8, "गवताचे पाते", "Gavatache Pate", "सूक्ष्म निरीक्षण — ललित", ["निसर्ग", "निरीक्षण", "ललित"]),
        (9, "वस्तू", "Vastu", "वस्तूंचे महत्त्व — गद्य", ["वस्तू", "जीवन", "मूल्य"]),
        (10, "आश्वासक चित्र", "Aashwasak Chitra", "आशावाद — कविता", ["आशा", "भविष्य", "कविता"]),
        (11, "व्याकरण व भाषाभ्यास", "Vyakaran va Bhashaabhyas", "मराठी व्याकरण", ["शब्दसिद्धी", "वाक्यप्रकार", "अलंकार", "समास"]),
    ],
}


# ─────────────────────────────────────────────────────────────────────────────
# CLASS 10 — GSEB (Gujarat Board — follows NCERT pattern)
# ─────────────────────────────────────────────────────────────────────────────

GSEB_CLASS_10 = {
    # ── Science (Vigyan — વિજ્ઞાન) ──
    ("GSEB", "Class 10", "Science"): [
        (1, "Chemical Reactions and Equations", "રાસાયણિક પ્રક્રિયાઓ અને સમીકરણો", "Types and balancing of reactions", ["combination", "decomposition", "displacement", "redox", "balancing"]),
        (2, "Acids, Bases and Salts", "ઍસિડ, બેઇઝ અને ક્ષાર", "Properties and reactions", ["pH scale", "indicators", "neutralisation", "salts"]),
        (3, "Metals and Non-metals", "ધાતુઓ અને અધાતુઓ", "Properties and reactivity", ["reactivity series", "extraction", "corrosion", "alloys"]),
        (4, "Carbon and its Compounds", "કાર્બન અને તેના સંયોજનો", "Organic chemistry basics", ["covalent bonding", "hydrocarbons", "functional groups", "nomenclature"]),
        (5, "Life Processes", "જીવન પ્રક્રિયાઓ", "Nutrition, respiration, transport, excretion", ["nutrition", "respiration", "circulation", "excretion"]),
        (6, "Control and Coordination", "નિયંત્રણ અને સંકલન", "Nervous and hormonal systems", ["nervous system", "reflex arc", "hormones", "plant hormones"]),
        (7, "How do Organisms Reproduce?", "સજીવો કેવી રીતે પ્રજનન કરે છે?", "Types of reproduction", ["asexual", "sexual", "human reproduction", "contraception"]),
        (8, "Heredity", "આનુવંશિકતા", "Genetics and evolution", ["Mendel", "dominant", "recessive", "sex determination", "evolution"]),
        (9, "Light – Reflection and Refraction", "પ્રકાશ – પરાવર્તન અને વક્રીભવન", "Mirror and lens formulas", ["mirror formula", "lens formula", "magnification", "Snell's law"]),
        (10, "The Human Eye and the Colourful World", "માનવ આંખ અને રંગબેરંગી દુનિયા", "Eye defects and phenomena", ["myopia", "hypermetropia", "dispersion", "scattering"]),
        (11, "Electricity", "વિદ્યુત", "Current electricity", ["Ohm's law", "resistance", "power", "series", "parallel"]),
        (12, "Magnetic Effects of Electric Current", "વિદ્યુત પ્રવાહની ચુંબકીય અસરો", "Electromagnetism", ["magnetic field", "solenoid", "motor", "generator", "induction"]),
        (13, "Our Environment", "આપણું પર્યાવરણ", "Ecosystems and conservation", ["food chains", "ozone", "waste management", "biodegradable"]),
    ],

    # ── Mathematics (Ganit — ગણિત) ──
    ("GSEB", "Class 10", "Mathematics"): [
        (1, "Real Numbers", "વાસ્તવિક સંખ્યાઓ", "Euclid's division and FTA", ["Euclid's division", "HCF", "fundamental theorem", "irrational numbers"]),
        (2, "Polynomials", "બહુપદી", "Zeros and division algorithm", ["zeros", "coefficients relationship", "division algorithm"]),
        (3, "Pair of Linear Equations in Two Variables", "બે ચલમાં રેખીય સમીકરણોની જોડ", "Solving methods", ["graphical", "substitution", "elimination", "cross-multiplication"]),
        (4, "Quadratic Equations", "દ્વિઘાત સમીકરણો", "Solving quadratic equations", ["factorisation", "quadratic formula", "discriminant", "nature of roots"]),
        (5, "Arithmetic Progressions", "સમાંતર શ્રેણી", "AP formulas", ["common difference", "nth term", "sum of n terms"]),
        (6, "Triangles", "ત્રિકોણ", "Similarity of triangles", ["similar triangles", "BPT", "Pythagoras theorem", "areas"]),
        (7, "Coordinate Geometry", "યામ ભૂમિતિ", "Distance and section formula", ["distance formula", "section formula", "mid-point", "area"]),
        (8, "Introduction to Trigonometry", "ત્રિકોણમિતિનો પરિચય", "Trigonometric ratios", ["sin", "cos", "tan", "identities", "complementary angles"]),
        (9, "Some Applications of Trigonometry", "ત્રિકોણમિતિના કેટલાક ઉપયોગો", "Heights and distances", ["angle of elevation", "angle of depression", "applications"]),
        (10, "Circles", "વર્તુળ", "Tangent properties", ["tangent", "tangent from external point", "properties"]),
        (11, "Areas Related to Circles", "વર્તુળ સંબંધિત ક્ષેત્રફળ", "Sector and segment areas", ["area of sector", "area of segment", "combinations"]),
        (12, "Surface Areas and Volumes", "પૃષ્ઠફળ અને ઘનફળ", "Combination of solids", ["combination", "conversion", "frustum"]),
        (13, "Statistics", "આંકડાશાસ્ત્ર", "Grouped data analysis", ["mean", "median", "mode", "ogive"]),
        (14, "Probability", "સંભાવના", "Classical probability", ["sample space", "events", "complementary events"]),
    ],

    # ── English ──
    ("GSEB", "Class 10", "English"): [
        (1, "A Letter to God", "", "Faith and irony", ["faith", "irony", "poverty", "Lencho"]),
        (2, "Nelson Mandela: Long Walk to Freedom", "", "Freedom and apartheid", ["apartheid", "freedom", "courage"]),
        (3, "Two Stories about Flying", "", "Fear and courage", ["fear", "Black Aeroplane", "mystery"]),
        (4, "From the Diary of Anne Frank", "", "War and adolescence", ["diary", "World War II", "adolescence"]),
        (5, "The Hundred Dresses – I", "", "Bullying and acceptance", ["bullying", "poverty", "friendship"]),
        (6, "The Hundred Dresses – II", "", "Resolution and kindness", ["guilt", "apology", "kindness"]),
        (7, "Glimpses of India", "", "Cultural diversity", ["Goa", "Rajasthan", "Assam", "diversity"]),
        (8, "Mijbil the Otter", "", "Pet and companionship", ["pet", "otter", "travel"]),
        (9, "Madam Rides the Bus", "", "Childhood curiosity", ["curiosity", "independence", "bus journey"]),
        (10, "The Sermon at Benares", "", "Buddha's wisdom", ["Buddha", "death", "grief", "wisdom"]),
        (11, "The Proposal", "", "Comedy play", ["comedy", "marriage", "argument", "Chekhov"]),
    ],

    # ── Social Science ──
    ("GSEB", "Class 10", "Social Science"): [
        # History
        (1, "The Rise of Nationalism in Europe", "યુરોપમાં રાષ્ટ્રવાદનો ઉદય", "Nation-states in Europe", ["nationalism", "unification", "liberalism"]),
        (2, "Nationalism in India", "ભારતમાં રાષ્ટ્રવાદ", "Indian freedom movement", ["Non-Cooperation", "Civil Disobedience", "Salt March", "Gandhiji"]),
        (3, "The Making of a Global World", "વૈશ્વિક વિશ્વનું નિર્માણ", "Globalisation history", ["silk routes", "colonialism", "Great Depression"]),
        (4, "The Age of Industrialisation", "ઔદ્યોગીકરણનો યુગ", "Industrial revolution", ["factories", "labour", "Indian textiles", "industrialisation"]),
        (5, "Print Culture and the Modern World", "છાપકળા સંસ્કૃતિ અને આધુનિક વિશ્વ", "History of print", ["printing press", "Gutenberg", "censorship"]),
        # Geography
        (6, "Resources and Development", "સંસાધનો અને વિકાસ", "Resource types and planning", ["renewable", "non-renewable", "resource planning", "soil"]),
        (7, "Forest and Wildlife Resources", "વન અને વન્યજીવ સંસાધનો", "Conservation", ["biodiversity", "flora", "fauna", "conservation"]),
        (8, "Water Resources", "જળ સંસાધનો", "Water management", ["dams", "rainwater harvesting", "irrigation"]),
        (9, "Agriculture", "કૃષિ", "Indian agriculture", ["farming types", "crops", "Green Revolution"]),
        (10, "Minerals and Energy Resources", "ખનિજ અને ઊર્જા સંસાધનો", "Distribution of minerals", ["metallic", "non-metallic", "conventional", "non-conventional"]),
        (11, "Manufacturing Industries", "ઉત્પાદન ઉદ્યોગો", "Industries of India", ["agro-based", "mineral-based", "pollution"]),
        (12, "Life Lines of National Economy", "રાષ્ટ્રીય અર્થતંત્રની જીવનરેખાઓ", "Transport and communication", ["roadways", "railways", "waterways", "airways"]),
        # Political Science
        (13, "Power Sharing", "સત્તાની ભાગીદારી", "Forms of power sharing", ["Belgium", "Sri Lanka", "horizontal", "vertical"]),
        (14, "Federalism", "સંઘવાદ", "Federal system in India", ["union list", "state list", "concurrent list", "decentralisation"]),
        (15, "Gender, Religion and Caste", "જાતિ, ધર્મ અને જ્ઞાતિ", "Social divisions in politics", ["gender", "communalism", "casteism"]),
        (16, "Political Parties", "રાજકીય પક્ષો", "Party system", ["national parties", "state parties", "functions"]),
        (17, "Outcomes of Democracy", "લોકશાહીના પરિણામો", "Assessing democracy", ["accountability", "responsiveness", "dignity"]),
        # Economics
        (18, "Development", "વિકાસ", "Measuring development", ["income", "HDI", "sustainability"]),
        (19, "Sectors of the Indian Economy", "ભારતીય અર્થતંત્રના ક્ષેત્રો", "Three sectors", ["primary", "secondary", "tertiary", "GDP"]),
        (20, "Money and Credit", "નાણાં અને શાખ", "Banking and credit", ["money", "banks", "credit", "SHGs"]),
        (21, "Globalisation and the Indian Economy", "વૈશ્વીકરણ અને ભારતીય અર્થતંત્ર", "Impact of globalisation", ["MNCs", "liberalisation", "WTO"]),
        (22, "Consumer Rights", "ઉપભોક્તા અધિકારો", "Consumer protection", ["consumer rights", "RTI", "consumer courts"]),
    ],

    # ── Gujarati (First Language — ગુજરાતી) ──
    ("GSEB", "Class 10", "Gujarati"): [
        (1, "વૈષ્ણવજન", "Vaishnav Jan", "નરસિંહ મહેતા — ભજન", ["ભજન", "નરસિંહ", "ભક્તિ"]),
        (2, "મારું ગામ", "Maru Gaam", "ગામડાનું ચિત્રણ — ગદ્ય", ["ગામ", "સંસ્કૃતિ", "ગ્રામજીવન"]),
        (3, "છ અક્ષરનું નામ", "Chha Aksharnu Naam", "કથા — ગદ્ય", ["કથા", "જીવન", "સંબંધ"]),
        (4, "જનની જન્મભૂમિ", "Janani Janmabhumi", "દેશપ્રેમ — કવિતા", ["દેશપ્રેમ", "માતૃભૂમિ"]),
        (5, "વસંતનો વૈભવ", "Vasantno Vaibhav", "પ્રકૃતિ — કવિતા", ["વસંત", "પ્રકૃતિ", "ફૂલ"]),
        (6, "ગુજરાતી સાહિત્ય — પરિચય", "Gujarati Sahitya Parichay", "સાહિત્ય પરિચય", ["નવલકથા", "વાર્તા", "કવિતા"]),
        (7, "પત્રલેખન", "Patralekhan", "ઔપચારિક પત્ર", ["પત્ર", "ઔપચારિક", "અનૌપચારિક"]),
        (8, "નિબંધ", "Nibandh", "નિબંધ લેખન", ["નિબંધ", "વર્ણન", "ચર્ચા"]),
        (9, "સંક્ષેપન", "Sankshepan", "સંક્ષેપ લેખન", ["સારાંશ", "સંક્ષેપન"]),
        (10, "વ્યાકરણ", "Vyakaran", "ગુજરાતી વ્યાકરણ", ["સમાસ", "અલંકાર", "છંદ", "કહેવત"]),
    ],
}


# ─────────────────────────────────────────────────────────────────────────────
# CLASS 11 — CBSE (NCERT 2024-25) — Science + Commerce + Arts
# ─────────────────────────────────────────────────────────────────────────────

CBSE_CLASS_11 = {
    # ── Physics (NCERT) ──
    ("CBSE", "Class 11", "Physics"): [
        (1, "Physical World", "भौतिक जगत", "Scope and excitement of physics", ["scientific method", "fundamental forces", "scope of physics"]),
        (2, "Units and Measurements", "मात्रक और मापन", "SI units and dimensional analysis", ["SI units", "significant figures", "dimensional analysis", "errors"]),
        (3, "Motion in a Straight Line", "सरल रेखा में गति", "Kinematics in 1D", ["position", "velocity", "acceleration", "equations of motion", "free fall"]),
        (4, "Motion in a Plane", "समतल में गति", "Vectors and projectile motion", ["vectors", "projectile motion", "uniform circular motion", "relative velocity"]),
        (5, "Laws of Motion", "गति के नियम", "Newton's laws and applications", ["Newton's laws", "friction", "circular motion", "free body diagram"]),
        (6, "Work, Energy and Power", "कार्य, ऊर्जा और शक्ति", "Work-energy theorem", ["work", "kinetic energy", "potential energy", "conservation", "collisions"]),
        (7, "System of Particles and Rotational Motion", "कणों का निकाय तथा घूर्णी गति", "Centre of mass and rotation", ["centre of mass", "torque", "angular momentum", "moment of inertia"]),
        (8, "Gravitation", "गुरुत्वाकर्षण", "Universal gravitation and satellites", ["Kepler's laws", "gravitational potential", "escape velocity", "satellites", "orbital velocity"]),
        (9, "Mechanical Properties of Solids", "ठोसों के यांत्रिक गुण", "Elasticity and stress-strain", ["stress", "strain", "Young's modulus", "Hooke's law", "elastic energy"]),
        (10, "Mechanical Properties of Fluids", "तरलों के यांत्रिक गुण", "Fluid mechanics", ["pressure", "Pascal's law", "Bernoulli's principle", "viscosity", "surface tension"]),
        (11, "Thermal Properties of Matter", "द्रव्य के तापीय गुण", "Heat transfer and expansion", ["thermal expansion", "specific heat", "calorimetry", "change of state", "heat transfer"]),
        (12, "Thermodynamics", "ऊष्मागतिकी", "Laws of thermodynamics", ["first law", "second law", "heat engines", "refrigerator", "Carnot engine"]),
        (13, "Kinetic Theory", "अणुगति सिद्धांत", "Kinetic theory of gases", ["ideal gas", "kinetic energy", "degrees of freedom", "mean free path", "specific heat of gases"]),
        (14, "Oscillations", "दोलन", "Simple harmonic motion", ["SHM", "spring-mass system", "pendulum", "damped oscillations", "resonance"]),
        (15, "Waves", "तरंगें", "Mechanical waves", ["transverse", "longitudinal", "superposition", "standing waves", "beats", "Doppler effect"]),
    ],

    # ── Chemistry (NCERT) ──
    ("CBSE", "Class 11", "Chemistry"): [
        (1, "Some Basic Concepts of Chemistry", "रसायन विज्ञान की कुछ मूल अवधारणाएँ", "Mole concept and stoichiometry", ["mole concept", "atomic mass", "molecular mass", "stoichiometry", "empirical formula"]),
        (2, "Structure of Atom", "परमाणु की संरचना", "Quantum mechanical model", ["Bohr model", "quantum numbers", "orbitals", "electronic configuration", "Aufbau principle"]),
        (3, "Classification of Elements and Periodicity", "तत्वों का वर्गीकरण एवं आवर्तिता", "Periodic table and trends", ["periodic law", "blocks", "ionic radius", "ionisation enthalpy", "electronegativity"]),
        (4, "Chemical Bonding and Molecular Structure", "रासायनिक आबंधन एवं आणविक संरचना", "Types of bonds and VSEPR", ["ionic bond", "covalent bond", "VSEPR", "hybridisation", "molecular orbital theory"]),
        (5, "States of Matter", "द्रव्य की अवस्थाएँ", "Gas laws and liquid state", ["ideal gas", "gas laws", "kinetic theory", "intermolecular forces", "liquefaction"]),
        (6, "Thermodynamics", "ऊष्मागतिकी", "Chemical thermodynamics", ["enthalpy", "Hess's law", "entropy", "Gibbs energy", "spontaneity"]),
        (7, "Equilibrium", "साम्यावस्था", "Chemical and ionic equilibrium", ["law of mass action", "Le Chatelier's principle", "pH", "buffer solutions", "solubility product"]),
        (8, "Redox Reactions", "अपचयोपचय अभिक्रियाएँ", "Oxidation-reduction", ["oxidation number", "balancing redox", "electrode potential", "electrochemical cells"]),
        (9, "Hydrogen", "हाइड्रोजन", "Chemistry of hydrogen", ["isotopes", "preparation", "water", "hydrogen peroxide", "hydrides"]),
        (10, "The s-Block Elements", "s-ब्लॉक तत्व", "Alkali and alkaline earth metals", ["Group 1", "Group 2", "properties", "compounds", "anomalous behaviour"]),
        (11, "The p-Block Elements", "p-ब्लॉक तत्व", "Group 13 and 14 elements", ["boron family", "carbon family", "properties", "compounds"]),
        (12, "Organic Chemistry – Some Basic Principles", "कार्बनिक रसायन – मूल सिद्धांत", "IUPAC and reaction mechanisms", ["IUPAC nomenclature", "isomerism", "inductive effect", "resonance", "reaction mechanisms"]),
        (13, "Hydrocarbons", "हाइड्रोकार्बन", "Alkanes, alkenes, alkynes", ["alkanes", "alkenes", "alkynes", "aromatic compounds", "reactions"]),
        (14, "Environmental Chemistry", "पर्यावरणीय रसायन", "Pollution and green chemistry", ["air pollution", "water pollution", "ozone depletion", "green chemistry"]),
    ],

    # ── Mathematics (NCERT) ──
    ("CBSE", "Class 11", "Mathematics"): [
        (1, "Sets", "समुच्चय", "Set theory fundamentals", ["types of sets", "Venn diagrams", "union", "intersection", "complement", "power set"]),
        (2, "Relations and Functions", "संबंध एवं फलन", "Relations, functions, and types", ["ordered pairs", "domain", "range", "types of functions", "composition"]),
        (3, "Trigonometric Functions", "त्रिकोणमितीय फलन", "Trigonometric functions and identities", ["radian measure", "trigonometric functions", "identities", "graphs", "general solutions"]),
        (4, "Complex Numbers and Quadratic Equations", "सम्मिश्र संख्याएँ और द्विघात समीकरण", "Complex number algebra", ["imaginary unit", "algebra of complex numbers", "Argand plane", "quadratic equations"]),
        (5, "Linear Inequalities", "रैखिक असमिकाएँ", "Solving inequalities", ["linear inequalities", "graphical solution", "system of inequalities"]),
        (6, "Permutations and Combinations", "क्रमचय और संचय", "Counting principles", ["fundamental principle", "permutations", "combinations", "factorial"]),
        (7, "Binomial Theorem", "द्विपद प्रमेय", "Binomial expansion", ["binomial theorem", "general term", "middle term", "Pascal's triangle"]),
        (8, "Sequences and Series", "अनुक्रम तथा श्रेणी", "AP, GP, and special series", ["AP", "GP", "sum of n terms", "infinite GP", "special series"]),
        (9, "Straight Lines", "सरल रेखाएँ", "Coordinate geometry of lines", ["slope", "various forms of equation", "angle between lines", "distance from a point"]),
        (10, "Conic Sections", "शंकु परिच्छेद", "Circle, parabola, ellipse, hyperbola", ["circle", "parabola", "ellipse", "hyperbola", "eccentricity"]),
        (11, "Introduction to Three Dimensional Geometry", "त्रिविमीय ज्यामिति का परिचय", "3D coordinate system", ["coordinate axes", "distance formula", "section formula", "octants"]),
        (12, "Limits and Derivatives", "सीमा और अवकलज", "Introduction to calculus", ["limits", "derivatives", "algebra of limits", "derivative rules"]),
        (13, "Statistics", "सांख्यिकी", "Measures of dispersion", ["range", "mean deviation", "variance", "standard deviation"]),
        (14, "Probability", "प्रायिकता", "Random experiments and events", ["sample space", "events", "axiomatic approach", "conditional probability"]),
    ],

    # ── Biology (NCERT) ──
    ("CBSE", "Class 11", "Biology"): [
        (1, "The Living World", "जीव जगत", "Characteristics of living organisms", ["biodiversity", "taxonomy", "nomenclature", "classification hierarchy"]),
        (2, "Biological Classification", "जीव जगत का वर्गीकरण", "Five kingdom classification", ["Monera", "Protista", "Fungi", "Plantae", "Animalia"]),
        (3, "Plant Kingdom", "वनस्पति जगत", "Classification of plants", ["algae", "bryophytes", "pteridophytes", "gymnosperms", "angiosperms"]),
        (4, "Animal Kingdom", "प्राणी जगत", "Classification of animals", ["phylum", "invertebrates", "vertebrates", "characteristic features"]),
        (5, "Morphology of Flowering Plants", "पुष्पी पादपों की आकारिकी", "Plant organs and their modifications", ["root", "stem", "leaf", "flower", "fruit", "seed"]),
        (6, "Anatomy of Flowering Plants", "पुष्पी पादपों का शारीर", "Internal structure of plants", ["tissues", "tissue systems", "anatomy of root", "stem", "leaf"]),
        (7, "Structural Organisation in Animals", "प्राणियों में संरचनात्मक संगठन", "Animal tissues and organ systems", ["epithelial", "connective", "muscular", "neural", "cockroach anatomy"]),
        (8, "Cell: The Unit of Life", "कोशिका: जीवन की इकाई", "Cell structure and organelles", ["cell theory", "prokaryotic", "eukaryotic", "organelles", "endomembrane system"]),
        (9, "Biomolecules", "जैव अणु", "Chemistry of living systems", ["carbohydrates", "proteins", "lipids", "nucleic acids", "enzymes"]),
        (10, "Cell Cycle and Cell Division", "कोशिका चक्र और कोशिका विभाजन", "Mitosis and meiosis", ["cell cycle", "mitosis", "meiosis", "significance"]),
        (11, "Photosynthesis in Higher Plants", "उच्च पादपों में प्रकाश संश्लेषण", "Light and dark reactions", ["light reaction", "Calvin cycle", "C3", "C4", "photorespiration"]),
        (12, "Respiration in Plants", "पादप में श्वसन", "Cellular respiration", ["glycolysis", "Krebs cycle", "ETC", "fermentation", "respiratory quotient"]),
        (13, "Plant Growth and Development", "पादप वृद्धि एवं परिवर्धन", "Growth regulators", ["auxins", "gibberellins", "cytokinins", "ethylene", "photoperiodism"]),
        (14, "Breathing and Exchange of Gases", "श्वसन और गैसों का विनिमय", "Respiratory system", ["respiratory organs", "mechanism of breathing", "exchange of gases", "respiratory disorders"]),
        (15, "Body Fluids and Circulation", "शरीर द्रव तथा परिसंचरण", "Circulatory system", ["blood", "blood groups", "heart", "cardiac cycle", "ECG", "blood vessels"]),
        (16, "Excretory Products and their Elimination", "उत्सर्जी उत्पाद एवं उनका निष्कासन", "Excretory system", ["nephron", "urine formation", "osmoregulation", "dialysis"]),
    ],

    # ── Accountancy (NCERT — Financial Accounting) ──
    ("CBSE", "Class 11", "Accountancy"): [
        (1, "Introduction to Accounting", "लेखांकन का परिचय", "Meaning and objectives of accounting", ["accounting", "objectives", "users", "qualitative characteristics"]),
        (2, "Theory Base of Accounting", "लेखांकन का सैद्धांतिक आधार", "Concepts and conventions", ["GAAP", "accounting concepts", "conventions", "accounting standards"]),
        (3, "Recording of Transactions – I", "लेन-देनों का अभिलेखन – I", "Journal entries", ["journal", "debit", "credit", "ledger", "posting"]),
        (4, "Recording of Transactions – II", "लेन-देनों का अभिलेखन – II", "Special purpose books", ["cash book", "purchase book", "sales book", "returns book"]),
        (5, "Bank Reconciliation Statement", "बैंक समाधान विवरण", "Reconciling bank and cash book", ["bank statement", "causes of difference", "BRS preparation"]),
        (6, "Trial Balance and Rectification of Errors", "तलपट एवं अशुद्धियों का शोधन", "Trial balance and error correction", ["trial balance", "types of errors", "suspense account", "rectification"]),
        (7, "Depreciation, Provisions and Reserves", "ह्रास, प्रावधान और आरक्षित निधि", "Asset depreciation methods", ["depreciation", "straight line", "WDV", "provisions", "reserves"]),
        (8, "Bill of Exchange", "विनिमय विपत्र", "Bills and promissory notes", ["drawer", "drawee", "payee", "acceptance", "endorsement", "dishonour"]),
        (9, "Financial Statements – I", "वित्तीय विवरण – I", "Trading and P&L account", ["trading account", "profit and loss account", "gross profit", "net profit"]),
        (10, "Financial Statements – II", "वित्तीय विवरण – II", "Balance sheet and adjustments", ["balance sheet", "closing stock", "outstanding expenses", "prepaid expenses"]),
        (11, "Accounts from Incomplete Records", "अपूर्ण अभिलेखों से खाते", "Single entry system", ["single entry", "statement of affairs", "conversion method"]),
        (12, "Applications of Computers in Accounting", "लेखांकन में कंप्यूटर का अनुप्रयोग", "Computerised accounting", ["computerised accounting", "database", "MIS", "automation"]),
    ],

    # ── Business Studies (NCERT) ──
    ("CBSE", "Class 11", "Business Studies"): [
        (1, "Nature and Purpose of Business", "व्यवसाय की प्रकृति और उद्देश्य", "Business concept and objectives", ["business", "profession", "employment", "objectives", "business risk"]),
        (2, "Forms of Business Organisation", "व्यावसायिक संगठन के स्वरूप", "Sole proprietorship to company", ["sole proprietorship", "partnership", "HUF", "cooperative", "company"]),
        (3, "Private, Public and Global Enterprises", "निजी, सार्वजनिक एवं भूमंडलीय उपक्रम", "Types of enterprises", ["private sector", "public sector", "PSUs", "MNCs", "joint ventures"]),
        (4, "Business Services", "व्यावसायिक सेवाएँ", "Banking, insurance, and transport", ["banking", "insurance", "warehousing", "transportation", "communication"]),
        (5, "Emerging Modes of Business", "व्यवसाय के उभरते स्वरूप", "E-business and BPO", ["e-business", "e-commerce", "BPO", "outsourcing", "online transactions"]),
        (6, "Social Responsibilities of Business", "व्यवसाय का सामाजिक उत्तरदायित्व", "CSR and business ethics", ["social responsibility", "environment", "stakeholders", "business ethics"]),
        (7, "Formation of a Company", "कंपनी का निर्माण", "Company incorporation process", ["promotion", "incorporation", "MOA", "AOA", "prospectus", "commencement"]),
        (8, "Sources of Business Finance", "व्यावसायिक वित्त के स्रोत", "Sources of funds", ["equity", "debentures", "retained earnings", "loans", "trade credit", "factoring"]),
        (9, "Small Business", "लघु व्यवसाय", "MSMEs and government support", ["small scale", "cottage industry", "MSME", "government schemes", "startup India"]),
        (10, "Internal Trade", "आंतरिक व्यापार", "Wholesale and retail trade", ["wholesale", "retail", "departmental store", "supermarket", "franchise", "GST"]),
        (11, "International Business", "अंतर्राष्ट्रीय व्यापार", "Import-export and WTO", ["international trade", "export", "import", "WTO", "EPZ", "SEZ"]),
    ],

    # ── Economics (Indian Economic Development — NCERT) ──
    ("CBSE", "Class 11", "Economics"): [
        (1, "Indian Economy on the Eve of Independence", "स्वतंत्रता की पूर्व संध्या पर भारतीय अर्थव्यवस्था", "Colonial economic legacy", ["colonial economy", "agriculture", "industry", "infrastructure", "demographic condition"]),
        (2, "Indian Economy 1950-1990", "भारतीय अर्थव्यवस्था 1950-1990", "Planning and mixed economy", ["five year plans", "planning commission", "mixed economy", "industrial policy", "Green Revolution"]),
        (3, "Liberalisation, Privatisation and Globalisation", "उदारीकरण, निजीकरण और वैश्वीकरण", "Economic reforms since 1991", ["LPG reforms", "liberalisation", "privatisation", "globalisation", "WTO"]),
        (4, "Poverty", "निर्धनता", "Poverty measurement and programmes", ["poverty line", "causes", "anti-poverty programmes", "MGNREGA"]),
        (5, "Human Capital Formation in India", "भारत में मानव पूँजी निर्माण", "Education and health as investment", ["human capital", "education expenditure", "health expenditure", "brain drain"]),
        (6, "Rural Development", "ग्रामीण विकास", "Agriculture and rural credit", ["rural credit", "agricultural marketing", "diversification", "organic farming"]),
        (7, "Employment: Growth, Informalisation", "रोजगार: संवृद्धि, अनौपचारिकीकरण", "Employment trends in India", ["employment types", "informalisation", "unemployment", "jobless growth"]),
        (8, "Infrastructure", "अवसंरचना", "Energy, health, and transport", ["energy", "health infrastructure", "education", "transportation"]),
        (9, "Environment and Sustainable Development", "पर्यावरण और सतत विकास", "Environmental issues and solutions", ["pollution", "global warming", "sustainable development", "renewable energy"]),
        (10, "Comparative Development — India and Neighbours", "तुलनात्मक विकास — भारत और पड़ोसी", "India vs China vs Pakistan", ["India", "China", "Pakistan", "development indicators", "comparison"]),
    ],

    # ── History (Themes in World History — NCERT) ──
    ("CBSE", "Class 11", "History"): [
        (1, "From the Beginning of Time", "समय की शुरुआत से", "Early humans and evolution", ["evolution", "early humans", "hunter-gatherers", "tools", "migration"]),
        (2, "Writing and City Life", "लेखन कला और शहरी जीवन", "Mesopotamian civilization", ["Mesopotamia", "cuneiform", "urbanisation", "trade", "social hierarchy"]),
        (3, "An Empire Across Three Continents", "तीन महाद्वीपों में फैला साम्राज्य", "Roman Empire", ["Roman Empire", "administration", "economy", "culture", "decline"]),
        (4, "The Central Islamic Lands", "इस्लाम का उदय और विस्तार", "Rise and spread of Islam", ["Islam", "Caliphate", "economy", "science", "culture"]),
        (5, "Nomadic Empires", "यायावर साम्राज्य", "Mongol empire and nomadic societies", ["Mongols", "Genghis Khan", "steppe societies", "trade routes"]),
        (6, "The Three Orders", "तीन वर्ग", "Medieval European society", ["feudalism", "Church", "peasantry", "manor system"]),
        (7, "Changing Cultural Traditions", "बदलती सांस्कृतिक परंपराएँ", "Renaissance and humanism", ["Renaissance", "humanism", "art", "science", "Reformation"]),
        (8, "Confrontation of Cultures", "संस्कृतियों का टकराव", "European expansion and encounters", ["colonisation", "Americas", "indigenous peoples", "slave trade"]),
        (9, "The Industrial Revolution", "औद्योगिक क्रांति", "Industrialisation in Britain", ["factories", "steam engine", "urbanisation", "labour", "social change"]),
        (10, "Displacing Indigenous Peoples", "मूलवासियों का विस्थापन", "Colonialism in Americas and Australia", ["colonialism", "Native Americans", "Aboriginal Australians", "displacement"]),
        (11, "Paths to Modernisation", "आधुनिकीकरण के रास्ते", "Japan and China modernisation", ["Meiji Restoration", "Chinese Revolution", "modernisation", "nationalism"]),
    ],

    # ── Political Science (Indian Constitution at Work — NCERT) ──
    ("CBSE", "Class 11", "Political Science"): [
        (1, "Constitution: Why and How?", "संविधान: क्यों और कैसे?", "Need and making of Constitution", ["Constituent Assembly", "constitution making", "philosophy", "features"]),
        (2, "Rights in the Indian Constitution", "भारतीय संविधान में अधिकार", "Fundamental rights and DPSP", ["fundamental rights", "right to equality", "right to freedom", "DPSP"]),
        (3, "Election and Representation", "चुनाव और प्रतिनिधित्व", "Electoral system in India", ["FPTP", "proportional representation", "Election Commission", "electoral reforms"]),
        (4, "Executive", "कार्यपालिका", "President, PM, and bureaucracy", ["President", "Prime Minister", "Council of Ministers", "bureaucracy"]),
        (5, "Legislature", "विधायिका", "Parliament structure and functions", ["Lok Sabha", "Rajya Sabha", "law making", "parliamentary committees"]),
        (6, "Judiciary", "न्यायपालिका", "Supreme Court and judicial review", ["Supreme Court", "High Court", "judicial review", "PIL", "judicial activism"]),
        (7, "Federalism", "संघवाद", "Centre-state relations", ["union list", "state list", "concurrent list", "Governor", "inter-state disputes"]),
        (8, "Local Governments", "स्थानीय शासन", "Panchayati Raj and municipalities", ["73rd Amendment", "74th Amendment", "Panchayati Raj", "municipality"]),
        (9, "Constitution as a Living Document", "संविधान: एक जीवंत दस्तावेज़", "Constitutional amendments", ["amendments", "basic structure", "judicial interpretation", "evolution"]),
        (10, "The Philosophy of the Constitution", "संविधान का दर्शन", "Underlying values and philosophy", ["preamble", "secularism", "socialism", "democracy", "justice"]),
    ],
}


# ─────────────────────────────────────────────────────────────────────────────
# CLASS 11 — ICSE/ISC (CISCE Syllabus 2024-25)
# ─────────────────────────────────────────────────────────────────────────────

ICSE_CLASS_11 = {
    # ── Physics ──
    ("ICSE", "Class 11", "Physics"): [
        (1, "Physical World and Measurement", "", "Scope and measurement", ["SI units", "dimensional analysis", "errors", "significant figures"]),
        (2, "Kinematics", "", "Motion in 1D and 2D", ["velocity", "acceleration", "projectile motion", "relative motion", "uniform circular motion"]),
        (3, "Laws of Motion", "", "Newton's laws and friction", ["Newton's laws", "momentum", "impulse", "friction", "circular motion dynamics"]),
        (4, "Work, Energy and Power", "", "Conservation and collisions", ["work-energy theorem", "potential energy", "conservation", "collisions", "power"]),
        (5, "Motion of System of Particles", "", "Centre of mass and rotation", ["centre of mass", "moment of inertia", "torque", "angular momentum", "rolling"]),
        (6, "Gravitation", "", "Gravitational field and satellites", ["Newton's law", "gravitational field", "potential", "escape velocity", "satellites"]),
        (7, "Properties of Bulk Matter", "", "Elasticity and fluid mechanics", ["elasticity", "pressure", "viscosity", "surface tension", "Bernoulli's theorem"]),
        (8, "Thermodynamics", "", "Laws and heat engines", ["zeroth law", "first law", "second law", "entropy", "Carnot cycle"]),
        (9, "Kinetic Theory of Gases", "", "Gas laws and molecular speeds", ["ideal gas", "pressure", "temperature", "RMS speed", "degrees of freedom"]),
        (10, "Oscillations and Waves", "", "SHM and wave motion", ["SHM", "pendulum", "wave types", "superposition", "Doppler effect"]),
    ],

    # ── Chemistry ──
    ("ICSE", "Class 11", "Chemistry"): [
        (1, "Some Basic Concepts of Chemistry", "", "Mole concept and stoichiometry", ["atomic mass", "mole", "molarity", "empirical formula", "stoichiometry"]),
        (2, "Structure of Atom", "", "Quantum model", ["Bohr model", "quantum numbers", "orbitals", "Aufbau", "Hund's rule"]),
        (3, "Classification of Elements and Periodicity", "", "Periodic table trends", ["periodic law", "s/p/d/f blocks", "atomic radius", "IE", "EA"]),
        (4, "Chemical Bonding and Molecular Structure", "", "Bonding theories", ["ionic", "covalent", "VSEPR", "hybridisation", "MOT"]),
        (5, "States of Matter", "", "Gas laws and liquids", ["Boyle's law", "Charles' law", "ideal gas", "van der Waals", "liquefaction"]),
        (6, "Chemical Thermodynamics", "", "Enthalpy and Gibbs energy", ["first law", "enthalpy", "Hess's law", "entropy", "Gibbs energy"]),
        (7, "Equilibrium", "", "Chemical and ionic equilibrium", ["Kc", "Kp", "Le Chatelier", "pH", "buffers", "solubility product"]),
        (8, "Redox Reactions", "", "Oxidation-reduction", ["oxidation number", "redox balancing", "electrode potential"]),
        (9, "Hydrogen", "", "Position and compounds", ["preparation", "properties", "water", "H2O2", "hydrides"]),
        (10, "s-Block Elements", "", "Alkali and alkaline earth", ["Group 1", "Group 2", "diagonal relationship", "compounds"]),
        (11, "p-Block Elements", "", "Group 13 and 14", ["boron family", "carbon family", "allotropes", "compounds"]),
        (12, "Organic Chemistry – Basic Principles", "", "IUPAC and mechanisms", ["hybridisation", "IUPAC", "isomerism", "inductive effect", "resonance"]),
        (13, "Hydrocarbons", "", "Alkanes, alkenes, alkynes, arenes", ["alkanes", "alkenes", "alkynes", "benzene", "reactions"]),
        (14, "Environmental Chemistry", "", "Pollution and control", ["air pollution", "water pollution", "ozone", "green chemistry"]),
    ],

    # ── Mathematics ──
    ("ICSE", "Class 11", "Mathematics"): [
        (1, "Sets and Functions", "", "Set theory and functions", ["sets", "Venn diagram", "relations", "functions", "types of functions"]),
        (2, "Trigonometry", "", "Trigonometric functions and equations", ["radian", "trigonometric functions", "identities", "inverse trigonometric", "general solutions"]),
        (3, "Complex Numbers", "", "Complex number algebra", ["complex numbers", "Argand plane", "modulus", "conjugate", "square roots"]),
        (4, "Quadratic Equations", "", "Roots and nature of equations", ["discriminant", "sum and product of roots", "quadratic inequalities"]),
        (5, "Linear Inequalities", "", "Solving and graphing", ["linear inequalities", "system of inequalities", "graphical method"]),
        (6, "Permutations and Combinations", "", "Counting principles", ["factorial", "permutations", "combinations", "applications"]),
        (7, "Binomial Theorem", "", "Binomial expansion", ["binomial theorem", "general term", "middle term", "applications"]),
        (8, "Sequences and Series", "", "AP, GP, and HP", ["AP", "GP", "HP", "sum of series", "infinite GP"]),
        (9, "Matrices and Determinants", "", "Matrix operations", ["types of matrices", "operations", "determinants", "properties", "applications"]),
        (10, "Coordinate Geometry — Straight Lines", "", "Line equations and properties", ["slope", "forms of equations", "angle between lines", "distance"]),
        (11, "Coordinate Geometry — Circles", "", "Circle equations", ["standard form", "general form", "tangent", "normal"]),
        (12, "Conic Sections", "", "Parabola, ellipse, hyperbola", ["parabola", "ellipse", "hyperbola", "eccentricity", "tangent"]),
        (13, "Limits and Derivatives", "", "Introduction to calculus", ["limits", "continuity", "differentiation", "rules of differentiation"]),
        (14, "Statistics", "", "Dispersion measures", ["variance", "standard deviation", "coefficient of variation"]),
        (15, "Probability", "", "Probability theory", ["axiomatic approach", "addition theorem", "conditional probability"]),
    ],

    # ── Biology ──
    ("ICSE", "Class 11", "Biology"): [
        (1, "Diversity of Living Organisms", "", "Taxonomy and classification", ["taxonomy", "binomial nomenclature", "five kingdoms", "hierarchy"]),
        (2, "Plant Kingdom", "", "Plant diversity", ["algae", "bryophytes", "pteridophytes", "gymnosperms", "angiosperms"]),
        (3, "Animal Kingdom", "", "Animal diversity", ["invertebrates", "vertebrates", "phyla", "classification basis"]),
        (4, "Morphology of Plants", "", "Plant external structure", ["root", "stem", "leaf", "flower", "fruit", "modifications"]),
        (5, "Anatomy of Plants", "", "Plant internal structure", ["tissue systems", "secondary growth", "anatomy of organs"]),
        (6, "Cell: Structure and Function", "", "Cell biology", ["cell theory", "organelles", "membrane", "nucleus", "cytoskeleton"]),
        (7, "Biomolecules", "", "Biochemistry", ["carbohydrates", "proteins", "lipids", "nucleic acids", "enzymes"]),
        (8, "Cell Division", "", "Mitosis and meiosis", ["cell cycle", "mitosis", "meiosis", "significance"]),
        (9, "Photosynthesis", "", "Light and dark reactions", ["chloroplast", "light reaction", "Calvin cycle", "C4", "CAM"]),
        (10, "Cellular Respiration", "", "Aerobic and anaerobic", ["glycolysis", "Krebs cycle", "ETC", "fermentation"]),
        (11, "Plant Growth and Development", "", "Hormones and growth", ["growth phases", "plant hormones", "photoperiodism", "vernalisation"]),
        (12, "Breathing and Gaseous Exchange", "", "Respiratory system", ["mechanism", "transport of gases", "respiratory disorders"]),
        (13, "Circulation", "", "Blood and heart", ["blood composition", "heart structure", "cardiac cycle", "blood vessels"]),
        (14, "Excretion", "", "Kidney and urine formation", ["nephron", "urine formation", "osmoregulation", "disorders"]),
    ],

    # ── Accountancy ──
    ("ICSE", "Class 11", "Accountancy"): [
        (1, "Introduction to Accounting", "", "Meaning and scope", ["accounting", "bookkeeping", "objectives", "users"]),
        (2, "Accounting Concepts and Conventions", "", "Fundamental principles", ["entity concept", "going concern", "accrual", "matching", "conservatism"]),
        (3, "Double Entry System", "", "Debit and credit rules", ["double entry", "debit", "credit", "accounts classification"]),
        (4, "Journal and Ledger", "", "Recording transactions", ["journal entries", "posting", "ledger accounts", "balancing"]),
        (5, "Cash Book and Subsidiary Books", "", "Special purpose books", ["cash book", "purchase book", "sales book", "returns"]),
        (6, "Trial Balance", "", "Preparation and errors", ["trial balance", "types of errors", "rectification"]),
        (7, "Bank Reconciliation Statement", "", "Reconciling differences", ["bank statement", "causes of difference", "preparation"]),
        (8, "Depreciation", "", "Methods of depreciation", ["straight line", "written down value", "provision for depreciation"]),
        (9, "Final Accounts", "", "Trading, P&L, Balance Sheet", ["trading account", "profit and loss", "balance sheet", "adjustments"]),
        (10, "Accounts from Incomplete Records", "", "Single entry conversion", ["single entry", "statement of affairs", "estimation of profit"]),
        (11, "Bills of Exchange", "", "Negotiable instruments", ["drawer", "drawee", "acceptance", "endorsement", "dishonour"]),
        (12, "Introduction to Company Accounts", "", "Share capital basics", ["shares", "debentures", "issue of shares", "calls"]),
    ],

    # ── Economics ──
    ("ICSE", "Class 11", "Economics"): [
        (1, "Introduction to Economics", "", "Basic economic concepts", ["scarcity", "opportunity cost", "economic systems", "basic problems"]),
        (2, "Consumer's Equilibrium", "", "Utility and demand", ["utility", "marginal utility", "indifference curve", "budget line", "consumer equilibrium"]),
        (3, "Demand Analysis", "", "Law of demand and elasticity", ["demand", "determinants", "law of demand", "elasticity of demand"]),
        (4, "Supply Analysis", "", "Law of supply", ["supply", "determinants", "law of supply", "elasticity of supply"]),
        (5, "Market Equilibrium", "", "Price determination", ["equilibrium price", "shifts in demand and supply", "excess demand", "excess supply"]),
        (6, "Production and Costs", "", "Production function and costs", ["production function", "returns to factor", "returns to scale", "cost curves"]),
        (7, "Forms of Market", "", "Perfect competition to monopoly", ["perfect competition", "monopoly", "oligopoly", "monopolistic competition"]),
        (8, "National Income", "", "GDP and related concepts", ["GDP", "GNP", "NNP", "methods of calculation"]),
        (9, "Money and Banking", "", "Functions of money and banking", ["money functions", "commercial banks", "central bank", "credit creation"]),
        (10, "Government Budget", "", "Public finance", ["revenue", "expenditure", "deficit", "fiscal policy"]),
    ],
}


# ─────────────────────────────────────────────────────────────────────────────
# CLASS 11 — MSBSHSE (Maharashtra HSC — Balbharati 2024-25)
# ─────────────────────────────────────────────────────────────────────────────

MSBSHSE_CLASS_11 = {
    # ── Physics ──
    ("MSBSHSE", "Class 11", "Physics"): [
        (1, "Units and Measurements", "एकके आणि मापन", "SI units and errors", ["SI system", "dimensional analysis", "errors", "significant figures"]),
        (2, "Mathematical Methods", "गणितीय पद्धती", "Vectors and calculus basics", ["vectors", "scalar product", "vector product", "differentiation", "integration"]),
        (3, "Motion in a Plane", "प्रतलातील गती", "Projectile and circular motion", ["projectile motion", "uniform circular motion", "relative velocity"]),
        (4, "Laws of Motion", "गतीचे नियम", "Newton's laws applications", ["Newton's laws", "free body diagram", "friction", "banking of roads"]),
        (5, "Gravitation", "गुरुत्वाकर्षण", "Gravitational field and satellites", ["universal gravitation", "gravitational field", "satellites", "escape velocity"]),
        (6, "Mechanical Properties of Solids", "घन पदार्थांचे यांत्रिक गुणधर्म", "Stress, strain, and elasticity", ["stress", "strain", "Young's modulus", "bulk modulus", "shear modulus"]),
        (7, "Thermal Properties of Matter", "द्रव्याचे औष्णिक गुणधर्म", "Heat transfer and expansion", ["thermal expansion", "specific heat", "latent heat", "conduction", "radiation"]),
        (8, "Sound", "ध्वनी", "Wave motion and acoustics", ["wave motion", "superposition", "resonance", "Doppler effect", "acoustics"]),
        (9, "Optics", "प्रकाशिकी", "Ray optics and wave optics", ["reflection", "refraction", "lenses", "interference", "diffraction"]),
        (10, "Electrostatics", "स्थिरविद्युतशास्त्र", "Electric charges and fields", ["Coulomb's law", "electric field", "potential", "capacitance", "dielectrics"]),
        (11, "Electric Current Through Conductors", "वाहकांतून विद्युत प्रवाह", "Current electricity", ["Ohm's law", "resistivity", "Kirchhoff's laws", "Wheatstone bridge"]),
        (12, "Magnetism", "चुंबकत्व", "Magnetic properties of matter", ["magnetic field", "Earth's magnetism", "dia/para/ferromagnetic", "hysteresis"]),
        (13, "Electromagnetic Waves", "विद्युतचुंबकीय तरंग", "EM spectrum and communication", ["EM waves", "spectrum", "communication systems"]),
    ],

    # ── Chemistry ──
    ("MSBSHSE", "Class 11", "Chemistry"): [
        (1, "Some Basic Concepts of Chemistry", "रसायनशास्त्रातील काही मूलभूत संकल्पना", "Mole concept", ["mole", "atomic mass", "molecular mass", "stoichiometry"]),
        (2, "Introduction to Analytical Chemistry", "विश्लेषणात्मक रसायनशास्त्र परिचय", "Analytical techniques", ["qualitative", "quantitative", "accuracy", "precision"]),
        (3, "Structure of Atom", "अणूंची रचना", "Quantum mechanical model", ["Bohr model", "quantum numbers", "orbitals", "electronic configuration"]),
        (4, "Periodicity of Elements", "मूलद्रव्यांची आवर्तिता", "Periodic trends", ["periodic table", "atomic radius", "IE", "EA", "electronegativity"]),
        (5, "Chemical Bonding", "रासायनिक बंध", "Types of bonding", ["ionic", "covalent", "VSEPR", "hybridisation", "hydrogen bonding"]),
        (6, "Redox Reactions", "ऑक्सिडीकरण-रिडक्शन", "Oxidation number method", ["oxidation number", "redox balancing", "types of redox"]),
        (7, "Modern Periodic Table", "आधुनिक आवर्तसारणी", "s, p, d, f blocks", ["s-block", "p-block", "d-block", "f-block", "diagonal relationship"]),
        (8, "Elements of Groups 1 and 2", "गट 1 व 2 चे मूलद्रव्य", "Alkali and alkaline earth", ["alkali metals", "alkaline earth", "compounds", "anomalous behaviour"]),
        (9, "Elements of Groups 13, 14, 15", "गट 13, 14, 15 चे मूलद्रव्य", "p-block elements", ["boron family", "carbon family", "nitrogen family"]),
        (10, "States of Matter", "द्रव्याच्या अवस्था", "Gases and liquids", ["gas laws", "ideal gas", "van der Waals", "liquids"]),
        (11, "Adsorption and Colloids", "अधिशोषण आणि कलिल", "Surface chemistry", ["adsorption", "colloids", "emulsions", "applications"]),
        (12, "Chemical Equilibrium", "रासायनिक साम्य", "Equilibrium and Le Chatelier", ["equilibrium constant", "Le Chatelier", "factors affecting"]),
        (13, "Nuclear Chemistry and Radioactivity", "केंद्रकीय रसायनशास्त्र आणि किरणोत्सर्ग", "Nuclear reactions", ["radioactivity", "half-life", "fission", "fusion", "applications"]),
        (14, "Basic Principles of Organic Chemistry", "सेंद्रिय रसायनशास्त्राची मूलतत्त्वे", "IUPAC and mechanisms", ["IUPAC", "isomerism", "inductive effect", "resonance"]),
        (15, "Hydrocarbons", "हायड्रोकार्बन्स", "Alkanes, alkenes, alkynes", ["alkanes", "alkenes", "alkynes", "aromatics"]),
        (16, "Chemistry in Everyday Life", "दैनंदिन जीवनातील रसायनशास्त्र", "Applications of chemistry", ["drugs", "food additives", "soaps", "detergents"]),
    ],

    # ── Mathematics ──
    ("MSBSHSE", "Class 11", "Mathematics"): [
        (1, "Angle and its Measurement", "कोन आणि त्याचे मापन", "Angle measures and trigonometry", ["degree", "radian", "arc length", "sector area"]),
        (2, "Trigonometry – I", "त्रिकोणमिती – I", "Trigonometric functions", ["trigonometric ratios", "allied angles", "compound angles"]),
        (3, "Trigonometry – II", "त्रिकोणमिती – II", "Identities and equations", ["sum/product formulae", "inverse trig", "general solutions"]),
        (4, "Determinants and Matrices", "सारणिक आणि आव्यूह", "Matrix algebra", ["determinants", "matrices", "operations", "inverse", "Cramer's rule"]),
        (5, "Straight Line", "सरळ रेषा", "Line equations", ["slope", "forms of equations", "angle between lines", "distance"]),
        (6, "Circle", "वर्तुळ", "Circle equations and properties", ["standard form", "general form", "tangent", "chord"]),
        (7, "Conic Sections", "शंकुच्छेद", "Parabola, ellipse, hyperbola", ["parabola", "ellipse", "hyperbola", "parametric form"]),
        (8, "Measures of Dispersion", "अपस्करणाची मापे", "Variance and standard deviation", ["range", "mean deviation", "variance", "standard deviation"]),
        (9, "Probability", "संभाव्यता", "Probability theory", ["addition theorem", "conditional probability", "multiplication theorem"]),
        (10, "Complex Numbers", "संम्मिश्र संख्या", "Complex number algebra", ["Argand plane", "modulus", "argument", "De Moivre's theorem"]),
        (11, "Sequences and Series", "अनुक्रम आणि श्रेणी", "AP, GP, HP", ["AP", "GP", "HP", "sum of series", "special series"]),
    ],

    # ── Biology ──
    ("MSBSHSE", "Class 11", "Biology"): [
        (1, "Living World", "सजीव सृष्टी", "Characteristics of life", ["characteristics", "taxonomy", "biodiversity"]),
        (2, "Systematics of Living Organisms", "सजीवांचे वर्गीकरण शास्त्र", "Classification systems", ["five kingdoms", "nomenclature", "hierarchy"]),
        (3, "Kingdom Plantae", "वनस्पती सृष्टी", "Plant diversity", ["algae", "bryophytes", "pteridophytes", "gymnosperms", "angiosperms"]),
        (4, "Kingdom Animalia", "प्राणी सृष्टी", "Animal diversity", ["invertebrates", "vertebrates", "phyla"]),
        (5, "Cell Structure and Organisation", "पेशी रचना आणि संघटन", "Cell biology", ["cell organelles", "membrane", "nucleus"]),
        (6, "Biomolecules", "जैवरेणू", "Biochemistry of life", ["carbohydrates", "proteins", "lipids", "nucleic acids", "enzymes"]),
        (7, "Cell Division", "पेशी विभाजन", "Mitosis and meiosis", ["cell cycle", "mitosis", "meiosis", "significance"]),
        (8, "Plant Tissues and Anatomy", "वनस्पती ऊती आणि शारीर", "Tissue systems", ["meristematic", "permanent", "secondary growth"]),
        (9, "Morphology of Plants", "वनस्पतींचे बाह्य आकारविज्ञान", "Plant organs", ["root", "stem", "leaf", "flower", "fruit"]),
        (10, "Animal Tissue", "प्राणी ऊती", "Animal tissue types", ["epithelial", "connective", "muscular", "nervous"]),
        (11, "Study of Animal Type", "प्राणी प्रकाराचा अभ्यास", "Cockroach anatomy", ["morphology", "anatomy", "digestive system", "nervous system"]),
        (12, "Photosynthesis", "प्रकाश संश्लेषण", "Light and dark reactions", ["chloroplast", "light reaction", "Calvin cycle", "factors"]),
        (13, "Respiration and Energy Transfer", "श्वसन आणि ऊर्जा हस्तांतरण", "Cellular respiration", ["glycolysis", "Krebs cycle", "ETC", "fermentation"]),
        (14, "Human Nutrition", "मानवी पोषण", "Digestive system", ["alimentary canal", "digestion", "absorption", "disorders"]),
        (15, "Excretion and Osmoregulation", "उत्सर्जन आणि परासरण नियमन", "Excretory system", ["nephron", "urine formation", "osmoregulation"]),
        (16, "Skeleton and Movement", "कंकाल आणि चलन", "Skeletal and muscular system", ["bones", "joints", "muscles", "locomotion"]),
    ],

    # ── Book-keeping and Accountancy ──
    ("MSBSHSE", "Class 11", "Accountancy"): [
        (1, "Introduction to Book-keeping and Accountancy", "पुस्तपालन आणि लेखाकर्म परिचय", "Meaning and objectives", ["book-keeping", "accountancy", "objectives", "users"]),
        (2, "Accounting Concepts and Conventions", "लेखांकन संकल्पना आणि परंपरा", "Principles of accounting", ["entity", "going concern", "accrual", "matching"]),
        (3, "Journal", "रोजनामा", "Journal entries", ["journal", "debit", "credit", "compound entries"]),
        (4, "Ledger", "खातेवही", "Posting and balancing", ["ledger", "posting", "balancing accounts"]),
        (5, "Sub-division of Journal", "रोजनाम्याचे उपविभाजन", "Subsidiary books", ["cash book", "purchase book", "sales book", "returns"]),
        (6, "Trial Balance", "तलपट", "Preparation of trial balance", ["trial balance", "errors", "agreement"]),
        (7, "Bank Reconciliation Statement", "बँक मेळजुळणी पत्रक", "Reconciliation", ["causes of difference", "preparation method"]),
        (8, "Depreciation", "घसारा", "Depreciation methods", ["straight line", "WDV", "provision for depreciation"]),
        (9, "Provisions and Reserves", "तरतूद आणि राखीव निधी", "Types and creation", ["provision for doubtful debts", "reserve fund", "sinking fund"]),
        (10, "Final Accounts", "अंतिम लेखे", "Trading, P&L, Balance Sheet", ["trading account", "P&L account", "balance sheet"]),
        (11, "Accounts from Incomplete Records", "अपूर्ण नोंदींवरून लेखे", "Single entry system", ["single entry", "statement of affairs"]),
        (12, "Computer in Accountancy", "लेखाकर्मात संगणक", "Computerised accounting", ["Tally", "automation", "advantages"]),
    ],

    # ── Organisation of Commerce and Management ──
    ("MSBSHSE", "Class 11", "Business Studies"): [
        (1, "Nature and Scope of Business", "व्यवसायाची व्याप्ती आणि स्वरूप", "Business fundamentals", ["business", "trade", "industry", "commerce"]),
        (2, "Forms of Business Organisation", "व्यवसायाचे प्रकार", "Types of organisations", ["sole proprietorship", "partnership", "company", "cooperative"]),
        (3, "Government and Business", "सरकार आणि व्यवसाय", "Government role in business", ["public sector", "privatisation", "regulation", "policies"]),
        (4, "Business Services", "व्यावसायिक सेवा", "Banking, insurance, transport", ["banking", "insurance", "warehousing", "communication"]),
        (5, "Business Ethics and CSR", "व्यावसायिक नीतिमत्ता आणि CSR", "Ethics in business", ["ethics", "CSR", "corporate governance"]),
        (6, "Principles of Management", "व्यवस्थापन तत्त्वे", "Management functions", ["planning", "organising", "staffing", "directing", "controlling"]),
        (7, "Functions of Management", "व्यवस्थापनाची कार्ये", "POSDCORB", ["planning", "organising", "directing", "controlling", "coordination"]),
        (8, "Entrepreneurship Development", "उद्योजकता विकास", "Startup and entrepreneurship", ["entrepreneur", "innovation", "startup", "challenges"]),
        (9, "Consumer Protection", "ग्राहक संरक्षण", "Consumer rights and redressal", ["consumer rights", "COPRA", "consumer courts"]),
        (10, "Marketing", "विपणन", "Marketing concepts", ["marketing mix", "4Ps", "market research", "promotion"]),
    ],

    # ── Economics ──
    ("MSBSHSE", "Class 11", "Economics"): [
        (1, "Introduction to Economics", "अर्थशास्त्र परिचय", "Basic concepts", ["scarcity", "choice", "opportunity cost", "economic systems"]),
        (2, "Demand Analysis", "मागणी विश्लेषण", "Law of demand", ["demand", "determinants", "elasticity", "demand curve"]),
        (3, "Supply Analysis", "पुरवठा विश्लेषण", "Law of supply", ["supply", "determinants", "elasticity", "supply curve"]),
        (4, "Market Equilibrium", "बाजार साम्य", "Price determination", ["equilibrium", "excess demand", "excess supply", "shifts"]),
        (5, "Production Function", "उत्पादन फलन", "Returns and costs", ["production function", "returns to factor", "cost curves"]),
        (6, "Forms of Market", "बाजाराचे प्रकार", "Market structures", ["perfect competition", "monopoly", "oligopoly"]),
        (7, "National Income", "राष्ट्रीय उत्पन्न", "GDP and measurement", ["GDP", "GNP", "NNP", "methods"]),
        (8, "Public Finance", "सार्वजनिक अर्थव्यवस्था", "Government budget", ["revenue", "expenditure", "deficit", "fiscal policy"]),
        (9, "Money and Banking", "मुद्रा आणि बँकिंग", "Banking system", ["money", "functions", "commercial banks", "RBI"]),
        (10, "Indian Economy", "भारतीय अर्थव्यवस्था", "Economic development", ["planning", "LPG", "challenges", "reforms"]),
    ],
}


# ─────────────────────────────────────────────────────────────────────────────
# CLASS 11 — GSEB (Gujarat Board — Science + Commerce)
# ─────────────────────────────────────────────────────────────────────────────

GSEB_CLASS_11 = {
    # ── Physics (follows NCERT pattern) ──
    ("GSEB", "Class 11", "Physics"): [
        (1, "Physical World", "ભૌતિક વિશ્વ", "Scope of physics", ["scientific method", "fundamental forces", "scope"]),
        (2, "Units and Measurements", "એકમો અને માપન", "SI units and errors", ["SI units", "dimensional analysis", "errors"]),
        (3, "Motion in a Straight Line", "સીધી રેખામાં ગતિ", "Kinematics in 1D", ["velocity", "acceleration", "equations of motion"]),
        (4, "Motion in a Plane", "સમતલમાં ગતિ", "Vectors and projectile", ["vectors", "projectile motion", "circular motion"]),
        (5, "Laws of Motion", "ગતિના નિયમો", "Newton's laws", ["Newton's laws", "friction", "dynamics"]),
        (6, "Work, Energy and Power", "કાર્ય, ઊર્જા અને શક્તિ", "Work-energy theorem", ["work", "energy", "conservation", "collisions"]),
        (7, "System of Particles and Rotational Motion", "કણોની પ્રણાલી અને ઘૂર્ણન ગતિ", "Rotation mechanics", ["centre of mass", "torque", "angular momentum", "moment of inertia"]),
        (8, "Gravitation", "ગુરુત્વાકર્ષણ", "Gravity and satellites", ["Kepler's laws", "potential", "escape velocity", "satellites"]),
        (9, "Mechanical Properties of Solids", "ઘન પદાર્થોના યાંત્રિક ગુણધર્મો", "Elasticity", ["stress", "strain", "moduli", "Hooke's law"]),
        (10, "Mechanical Properties of Fluids", "તરલ પદાર્થોના યાંત્રિક ગુણધર્મો", "Fluid mechanics", ["pressure", "Bernoulli", "viscosity", "surface tension"]),
        (11, "Thermal Properties of Matter", "દ્રવ્યના ઔષ્ણિક ગુણધર્મો", "Heat and thermometry", ["expansion", "specific heat", "latent heat", "heat transfer"]),
        (12, "Thermodynamics", "ઉષ્માગતિશાસ્ત્ર", "Laws of thermodynamics", ["first law", "second law", "Carnot engine"]),
        (13, "Kinetic Theory", "ગતિજ સિદ્ધાંત", "Kinetic theory of gases", ["ideal gas", "RMS speed", "degrees of freedom"]),
        (14, "Oscillations and Waves", "દોલનો અને તરંગો", "SHM and wave motion", ["SHM", "waves", "superposition", "Doppler effect"]),
    ],

    # ── Chemistry ──
    ("GSEB", "Class 11", "Chemistry"): [
        (1, "Some Basic Concepts of Chemistry", "રસાયણશાસ્ત્રની મૂળભૂત વિભાવનાઓ", "Mole concept", ["mole", "atomic mass", "stoichiometry"]),
        (2, "Structure of Atom", "પરમાણુનું બંધારણ", "Quantum model", ["Bohr model", "quantum numbers", "orbitals", "configuration"]),
        (3, "Classification of Elements and Periodicity", "તત્ત્વોનું વર્ગીકરણ અને આવર્તિતા", "Periodic trends", ["periodic law", "blocks", "trends"]),
        (4, "Chemical Bonding and Molecular Structure", "રાસાયણિક બંધ અને અણુ રચના", "Bonding theories", ["ionic", "covalent", "VSEPR", "hybridisation"]),
        (5, "States of Matter", "દ્રવ્યની અવસ્થાઓ", "Gas laws", ["gas laws", "ideal gas", "van der Waals"]),
        (6, "Thermodynamics", "ઉષ્માગતિશાસ્ત્ર", "Chemical thermodynamics", ["enthalpy", "Hess's law", "entropy", "Gibbs energy"]),
        (7, "Equilibrium", "સામ્યાવસ્થા", "Chemical equilibrium", ["Kc", "Kp", "Le Chatelier", "ionic equilibrium"]),
        (8, "Redox Reactions", "ઓક્સિડેશન-રિડક્શન", "Redox chemistry", ["oxidation number", "balancing"]),
        (9, "Hydrogen", "હાઇડ્રોજન", "Hydrogen chemistry", ["preparation", "properties", "water", "H2O2"]),
        (10, "s-Block Elements", "s-બ્લૉક તત્ત્વો", "Groups 1 and 2", ["alkali metals", "alkaline earth", "compounds"]),
        (11, "p-Block Elements", "p-બ્લૉક તત્ત્વો", "Groups 13 and 14", ["boron family", "carbon family"]),
        (12, "Organic Chemistry – Basic Principles", "કાર્બનિક રસાયણ – મૂળ સિદ્ધાંતો", "IUPAC and mechanisms", ["IUPAC", "isomerism", "electronic effects"]),
        (13, "Hydrocarbons", "હાઇડ્રોકાર્બન", "Alkanes, alkenes, alkynes", ["alkanes", "alkenes", "alkynes", "aromatics"]),
        (14, "Environmental Chemistry", "પર્યાવરણીય રસાયણશાસ્ત્ર", "Pollution", ["air pollution", "water pollution", "green chemistry"]),
    ],

    # ── Mathematics ──
    ("GSEB", "Class 11", "Mathematics"): [
        (1, "Sets", "ગણ", "Set theory", ["types of sets", "Venn diagram", "operations", "complement"]),
        (2, "Relations and Functions", "સંબંધો અને વિધેયો", "Functions and types", ["relations", "domain", "range", "types of functions"]),
        (3, "Trigonometric Functions", "ત્રિકોણમિતીય વિધેયો", "Trig functions and identities", ["radian", "trig functions", "identities", "graphs"]),
        (4, "Complex Numbers", "સંમિશ્ર સંખ્યાઓ", "Complex algebra", ["imaginary unit", "Argand plane", "modulus"]),
        (5, "Linear Inequalities", "રેખીય અસમીકરણો", "Solving inequalities", ["linear inequalities", "graphical solution"]),
        (6, "Permutations and Combinations", "ક્રમચય અને સંચય", "Counting", ["permutations", "combinations", "factorial"]),
        (7, "Binomial Theorem", "દ્વિપદ પ્રમેય", "Binomial expansion", ["binomial theorem", "general term", "middle term"]),
        (8, "Sequences and Series", "અનુક્રમ અને શ્રેણી", "AP and GP", ["AP", "GP", "sum of series"]),
        (9, "Straight Lines", "સરળ રેખાઓ", "Line equations", ["slope", "forms", "angle", "distance"]),
        (10, "Conic Sections", "શંકુ છેદો", "Conics", ["circle", "parabola", "ellipse", "hyperbola"]),
        (11, "Three Dimensional Geometry", "ત્રિપરિમાણીય ભૂમિતિ", "3D coordinates", ["distance", "section formula", "direction cosines"]),
        (12, "Limits and Derivatives", "સીમા અને અવકલજ", "Introduction to calculus", ["limits", "derivatives", "rules"]),
        (13, "Statistics", "આંકડાશાસ્ત્ર", "Dispersion measures", ["variance", "standard deviation"]),
        (14, "Probability", "સંભાવના", "Probability theory", ["sample space", "axiomatic approach"]),
    ],

    # ── Biology ──
    ("GSEB", "Class 11", "Biology"): [
        (1, "The Living World", "સજીવ વિશ્વ", "Characteristics of life", ["biodiversity", "taxonomy", "nomenclature"]),
        (2, "Biological Classification", "જૈવિક વર્ગીકરણ", "Five kingdom system", ["Monera", "Protista", "Fungi", "Plantae", "Animalia"]),
        (3, "Plant Kingdom", "વનસ્પતિ જગત", "Plant diversity", ["algae", "bryophytes", "pteridophytes", "gymnosperms", "angiosperms"]),
        (4, "Animal Kingdom", "પ્રાણી જગત", "Animal classification", ["invertebrates", "vertebrates", "phyla"]),
        (5, "Morphology of Flowering Plants", "પુષ્પી છોડનું આકારવિજ્ઞાન", "Plant organs", ["root", "stem", "leaf", "flower"]),
        (6, "Anatomy of Flowering Plants", "પુષ્પી છોડનું શરીરવિજ્ઞાન", "Internal structure", ["tissue systems", "anatomy"]),
        (7, "Cell: The Unit of Life", "કોષ: જીવનનો એકમ", "Cell structure", ["cell theory", "organelles", "prokaryotic", "eukaryotic"]),
        (8, "Biomolecules", "જૈવ અણુઓ", "Biochemistry", ["carbohydrates", "proteins", "lipids", "nucleic acids", "enzymes"]),
        (9, "Cell Cycle and Cell Division", "કોષ ચક્ર અને કોષ વિભાજન", "Division types", ["cell cycle", "mitosis", "meiosis"]),
        (10, "Photosynthesis", "પ્રકાશસંશ્લેષણ", "Light and dark reactions", ["light reaction", "Calvin cycle", "C3", "C4"]),
        (11, "Respiration in Plants", "છોડમાં શ્વસન", "Cellular respiration", ["glycolysis", "Krebs cycle", "ETC"]),
        (12, "Plant Growth and Development", "છોડની વૃદ્ધિ અને વિકાસ", "Growth regulators", ["auxins", "gibberellins", "photoperiodism"]),
        (13, "Breathing and Exchange of Gases", "શ્વાસોચ્છ્વાસ અને વાયુ વિનિમય", "Respiratory system", ["mechanism", "gas exchange", "disorders"]),
        (14, "Body Fluids and Circulation", "શરીર પ્રવાહી અને પરિભ્રમણ", "Circulatory system", ["blood", "heart", "cardiac cycle"]),
        (15, "Excretory Products and Elimination", "ઉત્સર્જન ઉત્પાદનો અને નિષ્કાસન", "Excretion", ["nephron", "urine formation", "osmoregulation"]),
        (16, "Locomotion and Movement", "ગતિ અને ચલન", "Skeletal system", ["skeleton", "joints", "muscles"]),
    ],

    # ── Accountancy ──
    ("GSEB", "Class 11", "Accountancy"): [
        (1, "Introduction to Accounting", "હિસાબી પરિચય", "Meaning and objectives", ["accounting", "bookkeeping", "objectives"]),
        (2, "Accounting Concepts", "હિસાબી સંકલ્પનાઓ", "Principles and standards", ["entity", "going concern", "accrual", "matching"]),
        (3, "Journal", "રોજમેળ", "Recording transactions", ["journal entries", "rules of debit and credit"]),
        (4, "Ledger and Trial Balance", "ખાતાવહી અને ત્રાજવું", "Posting and trial balance", ["ledger", "posting", "trial balance"]),
        (5, "Cash Book", "રોકડ મેળ", "Types of cash books", ["single column", "double column", "triple column", "petty cash"]),
        (6, "Subsidiary Books", "સહાયક ચોપડીઓ", "Special purpose books", ["purchase book", "sales book", "returns books"]),
        (7, "Bank Reconciliation Statement", "બૅન્ક મેળવણી પત્રક", "Reconciliation", ["causes", "preparation", "adjusted cash book"]),
        (8, "Depreciation", "ઘસારો", "Depreciation methods", ["SLM", "WDV", "provision for depreciation"]),
        (9, "Final Accounts", "અંતિમ ખાતાં", "Financial statements", ["trading account", "P&L", "balance sheet"]),
        (10, "Bills of Exchange", "હૂંડીપત્ર", "Negotiable instruments", ["drawer", "drawee", "endorsement"]),
        (11, "Errors and Rectification", "ભૂલો અને સુધારો", "Types of errors", ["types of errors", "suspense account", "rectification"]),
        (12, "Computer in Accounting", "હિસાબમાં કમ્પ્યુટર", "Computerised systems", ["Tally", "advantages", "accounting software"]),
    ],

    # ── Economics ──
    ("GSEB", "Class 11", "Economics"): [
        (1, "Introduction to Economics", "અર્થશાસ્ત્ર પરિચય", "Basic concepts", ["scarcity", "choice", "economic systems"]),
        (2, "Consumer Behaviour", "ઉપભોક્તા વર્તન", "Utility and demand", ["utility", "marginal utility", "indifference curves"]),
        (3, "Demand", "માંગ", "Law of demand", ["demand", "determinants", "elasticity"]),
        (4, "Supply", "પુરવઠો", "Law of supply", ["supply", "determinants", "elasticity"]),
        (5, "Market Equilibrium", "બજાર સમતુલા", "Price determination", ["equilibrium", "excess demand/supply"]),
        (6, "Production and Costs", "ઉત્પાદન અને ખર્ચ", "Production function", ["production function", "returns", "cost curves"]),
        (7, "Market Forms", "બજારના પ્રકારો", "Market structures", ["perfect competition", "monopoly", "oligopoly"]),
        (8, "National Income", "રાષ્ટ્રીય આવક", "GDP measurement", ["GDP", "GNP", "NNP"]),
        (9, "Money and Banking", "નાણાં અને બૅન્કિંગ", "Banking system", ["money", "commercial banks", "RBI"]),
        (10, "Government Budget", "સરકારી બજેટ", "Public finance", ["revenue", "expenditure", "fiscal policy"]),
    ],
}


# ─────────────────────────────────────────────────────────────────────────────
# CLASS 12 — CBSE (NCERT 2024-25) — Science + Commerce + Arts
# ─────────────────────────────────────────────────────────────────────────────

CBSE_CLASS_12 = {
    # ── Physics (NCERT) ──
    ("CBSE", "Class 12", "Physics"): [
        (1, "Electric Charges and Fields", "वैद्युत आवेश तथा क्षेत्र", "Coulomb's law and electric field", ["Coulomb's law", "electric field", "field lines", "Gauss's law", "dipole"]),
        (2, "Electrostatic Potential and Capacitance", "स्थिरवैद्युत विभव तथा धारिता", "Potential and capacitors", ["potential", "potential difference", "equipotential surfaces", "capacitors", "dielectrics"]),
        (3, "Current Electricity", "विद्युत धारा", "Ohm's law and circuits", ["drift velocity", "resistivity", "Kirchhoff's laws", "Wheatstone bridge", "potentiometer"]),
        (4, "Moving Charges and Magnetism", "गतिमान आवेश और चुम्बकत्व", "Magnetic field due to current", ["Biot-Savart law", "Ampere's law", "solenoid", "force on current", "cyclotron"]),
        (5, "Magnetism and Matter", "चुम्बकत्व एवं द्रव्य", "Magnetic materials", ["bar magnet", "Earth's magnetism", "diamagnetic", "paramagnetic", "ferromagnetic"]),
        (6, "Electromagnetic Induction", "वैद्युतचुम्बकीय प्रेरण", "Faraday's laws", ["Faraday's law", "Lenz's law", "motional EMF", "eddy currents", "self-inductance"]),
        (7, "Alternating Current", "प्रत्यावर्ती धारा", "AC circuits and transformers", ["AC generator", "RMS value", "LCR circuit", "resonance", "transformer"]),
        (8, "Electromagnetic Waves", "वैद्युतचुम्बकीय तरंगें", "EM spectrum", ["displacement current", "Maxwell's equations", "EM spectrum", "properties"]),
        (9, "Ray Optics and Optical Instruments", "किरण प्रकाशिकी एवं प्रकाशिक यंत्र", "Reflection and refraction", ["reflection", "refraction", "TIR", "prism", "microscope", "telescope"]),
        (10, "Wave Optics", "तरंग प्रकाशिकी", "Interference and diffraction", ["Huygens' principle", "Young's experiment", "diffraction", "polarisation"]),
        (11, "Dual Nature of Radiation and Matter", "विकिरण तथा द्रव्य की द्वैत प्रकृति", "Photoelectric effect", ["photoelectric effect", "photon", "de Broglie wavelength", "Davisson-Germer"]),
        (12, "Atoms", "परमाणु", "Atomic models", ["Rutherford model", "Bohr model", "hydrogen spectrum", "energy levels"]),
        (13, "Nuclei", "नाभिक", "Nuclear physics", ["nuclear size", "mass defect", "binding energy", "radioactivity", "fission", "fusion"]),
        (14, "Semiconductor Electronics", "अर्धचालक इलेक्ट्रॉनिकी", "Diodes and transistors", ["p-n junction", "diode", "LED", "transistor", "logic gates"]),
    ],

    # ── Chemistry (NCERT) ──
    ("CBSE", "Class 12", "Chemistry"): [
        (1, "The Solid State", "ठोस अवस्था", "Crystal structures and defects", ["unit cell", "packing efficiency", "crystal systems", "point defects", "band theory"]),
        (2, "Solutions", "विलयन", "Colligative properties", ["molarity", "molality", "Raoult's law", "colligative properties", "van't Hoff factor"]),
        (3, "Electrochemistry", "वैद्युतरसायन", "Cells and electrolysis", ["Nernst equation", "conductance", "Kohlrausch's law", "batteries", "corrosion"]),
        (4, "Chemical Kinetics", "रासायनिक बलगतिकी", "Rate of reactions", ["rate law", "order of reaction", "Arrhenius equation", "activation energy", "collision theory"]),
        (5, "Surface Chemistry", "पृष्ठ रसायन", "Adsorption and colloids", ["adsorption", "catalysis", "colloids", "emulsions", "Tyndall effect"]),
        (6, "General Principles of Isolation of Elements", "तत्वों के निष्कर्षण के सामान्य सिद्धांत", "Metallurgy", ["concentration", "reduction", "refining", "thermodynamic principles"]),
        (7, "The p-Block Elements", "p-ब्लॉक तत्व", "Group 15 to 18 elements", ["nitrogen family", "oxygen family", "halogens", "noble gases"]),
        (8, "The d- and f-Block Elements", "d- एवं f-ब्लॉक तत्व", "Transition and inner transition metals", ["transition metals", "properties", "lanthanoids", "actinoids", "KMnO4", "K2Cr2O7"]),
        (9, "Coordination Compounds", "उपसहसंयोजक यौगिक", "Werner's theory and isomerism", ["ligands", "coordination number", "IUPAC naming", "isomerism", "CFT"]),
        (10, "Haloalkanes and Haloarenes", "हैलोऐल्केन तथा हैलोऐरीन", "Organic halogen compounds", ["nomenclature", "SN1", "SN2", "elimination", "reactions"]),
        (11, "Alcohols, Phenols and Ethers", "ऐल्कोहॉल, फीनॉल एवं ईथर", "Oxygen-containing compounds", ["preparation", "properties", "reactions", "dehydration"]),
        (12, "Aldehydes, Ketones and Carboxylic Acids", "ऐल्डिहाइड, कीटोन एवं कार्बोक्सिलिक अम्ल", "Carbonyl compounds", ["nucleophilic addition", "aldol condensation", "Cannizzaro", "carboxylic acid reactions"]),
        (13, "Amines", "ऐमीन", "Nitrogen-containing compounds", ["classification", "preparation", "properties", "diazonium salts"]),
        (14, "Biomolecules", "जैव-अणु", "Carbohydrates, proteins, nucleic acids", ["carbohydrates", "proteins", "enzymes", "vitamins", "nucleic acids"]),
        (15, "Polymers", "बहुलक", "Types and uses of polymers", ["addition polymers", "condensation polymers", "rubber", "biodegradable polymers"]),
        (16, "Chemistry in Everyday Life", "दैनिक जीवन में रसायन", "Drugs, food, and cleansing agents", ["drugs", "food preservatives", "antioxidants", "soaps", "detergents"]),
    ],

    # ── Mathematics (NCERT) ──
    ("CBSE", "Class 12", "Mathematics"): [
        (1, "Relations and Functions", "संबंध एवं फलन", "Types of relations and functions", ["types of relations", "one-one", "onto", "inverse", "composition", "binary operations"]),
        (2, "Inverse Trigonometric Functions", "प्रतिलोम त्रिकोणमितीय फलन", "Inverse trig functions", ["domain", "range", "principal value", "properties"]),
        (3, "Matrices", "आव्यूह", "Matrix algebra", ["types of matrices", "operations", "transpose", "symmetric", "inverse"]),
        (4, "Determinants", "सारणिक", "Determinants and applications", ["properties", "cofactors", "adjoint", "inverse", "Cramer's rule", "area of triangle"]),
        (5, "Continuity and Differentiability", "सांतत्य तथा अवकलनीयता", "Differentiation rules", ["continuity", "differentiability", "chain rule", "implicit", "logarithmic differentiation"]),
        (6, "Application of Derivatives", "अवकलज के अनुप्रयोग", "Maxima, minima, tangents", ["rate of change", "tangent", "normal", "increasing/decreasing", "maxima", "minima"]),
        (7, "Integrals", "समाकलन", "Integration methods", ["indefinite integrals", "substitution", "partial fractions", "by parts", "definite integrals"]),
        (8, "Application of Integrals", "समाकलन के अनुप्रयोग", "Area under curves", ["area under curve", "area between curves"]),
        (9, "Differential Equations", "अवकल समीकरण", "Solving differential equations", ["order", "degree", "general solution", "particular solution", "variable separable", "homogeneous"]),
        (10, "Vector Algebra", "सदिश बीजगणित", "Vector operations", ["types of vectors", "addition", "dot product", "cross product", "scalar triple product"]),
        (11, "Three Dimensional Geometry", "त्रिविमीय ज्यामिति", "Lines and planes in 3D", ["direction cosines", "equation of line", "equation of plane", "angle between planes"]),
        (12, "Linear Programming", "रैखिक प्रोग्रामन", "Optimisation problems", ["constraints", "objective function", "feasible region", "corner point method"]),
        (13, "Probability", "प्रायिकता", "Conditional probability and Bayes theorem", ["conditional probability", "multiplication theorem", "Bayes theorem", "random variable", "Bernoulli trials"]),
    ],

    # ── Biology (NCERT) ──
    ("CBSE", "Class 12", "Biology"): [
        (1, "Reproduction in Organisms", "जीवों में जनन", "Asexual and sexual reproduction", ["asexual reproduction", "sexual reproduction", "life span", "events in reproduction"]),
        (2, "Sexual Reproduction in Flowering Plants", "पुष्पी पादपों में लैंगिक जनन", "Flower structure and fertilisation", ["microsporogenesis", "megasporogenesis", "pollination", "fertilisation", "endosperm"]),
        (3, "Human Reproduction", "मानव जनन", "Human reproductive system", ["male reproductive system", "female reproductive system", "gametogenesis", "menstrual cycle", "fertilisation"]),
        (4, "Reproductive Health", "जनन स्वास्थ्य", "Population control and STDs", ["family planning", "contraception", "MTP", "STDs", "infertility"]),
        (5, "Principles of Inheritance and Variation", "वंशागति एवं विविधता के सिद्धांत", "Mendelian and post-Mendelian genetics", ["Mendel's laws", "incomplete dominance", "codominance", "linkage", "mutation"]),
        (6, "Molecular Basis of Inheritance", "वंशागति का आणविक आधार", "DNA, RNA, and gene expression", ["DNA structure", "replication", "transcription", "translation", "genetic code", "regulation"]),
        (7, "Evolution", "विकास", "Origin of life and evolutionary evidence", ["origin of life", "natural selection", "Hardy-Weinberg", "adaptive radiation"]),
        (8, "Human Health and Disease", "मानव स्वास्थ्य तथा रोग", "Immunity and diseases", ["immunity", "AIDS", "cancer", "drugs", "pathogens"]),
        (9, "Strategies for Enhancement in Food Production", "खाद्य उत्पादन में वृद्धि की कार्यनीति", "Plant and animal breeding", ["plant breeding", "tissue culture", "single cell protein", "animal husbandry"]),
        (10, "Microbes in Human Welfare", "मानव कल्याण में सूक्ष्मजीव", "Industrial and ecological applications", ["fermentation", "biogas", "sewage treatment", "biocontrol", "biofertilisers"]),
        (11, "Biotechnology: Principles and Processes", "जैव प्रौद्योगिकी: सिद्धांत व प्रक्रम", "Genetic engineering tools", ["restriction enzymes", "cloning vectors", "PCR", "recombinant DNA", "bioreactors"]),
        (12, "Biotechnology and its Applications", "जैव प्रौद्योगिकी एवं उसके अनुप्रयोग", "GMO and gene therapy", ["Bt crops", "gene therapy", "transgenic animals", "bioethics", "biopiracy"]),
        (13, "Organisms and Populations", "जीव और समष्टियाँ", "Ecology: organisms and populations", ["adaptations", "population attributes", "growth models", "interactions"]),
        (14, "Ecosystem", "पारितंत्र", "Ecosystem structure and function", ["productivity", "decomposition", "energy flow", "nutrient cycling", "succession"]),
        (15, "Biodiversity and Conservation", "जैव-विविधता एवं संरक्षण", "Conservation of biodiversity", ["biodiversity patterns", "loss of biodiversity", "conservation strategies", "hotspots"]),
        (16, "Environmental Issues", "पर्यावरण के मुद्दे", "Pollution and conservation", ["air pollution", "water pollution", "solid waste", "ozone depletion", "deforestation"]),
    ],

    # ── Accountancy (NCERT — Partnership and Company Accounts) ──
    ("CBSE", "Class 12", "Accountancy"): [
        (1, "Accounting for Partnership: Basic Concepts", "साझेदारी लेखांकन: मूल अवधारणाएँ", "Partnership fundamentals", ["partnership deed", "profit sharing", "interest on capital", "drawings", "guarantee"]),
        (2, "Reconstitution of Partnership: Change in Profit Sharing Ratio", "साझेदारी पुनर्गठन: लाभ विभाजन अनुपात में परिवर्तन", "Goodwill and revaluation", ["goodwill", "revaluation", "sacrificing ratio", "gaining ratio"]),
        (3, "Admission of a Partner", "साझेदार का प्रवेश", "New partner admission", ["goodwill treatment", "revaluation of assets", "new profit sharing ratio", "capital adjustment"]),
        (4, "Retirement and Death of a Partner", "साझेदार की सेवानिवृत्ति/मृत्यु", "Settlement of accounts", ["gaining ratio", "revaluation", "goodwill", "deceased partner's account"]),
        (5, "Dissolution of Partnership Firm", "साझेदारी फर्म का विघटन", "Closing the firm", ["dissolution", "realisation account", "settlement of accounts"]),
        (6, "Accounting for Share Capital", "अंश पूँजी के लिए लेखांकन", "Issue and forfeiture of shares", ["issue of shares", "oversubscription", "forfeiture", "reissue", "ESOP"]),
        (7, "Issue and Redemption of Debentures", "ऋणपत्रों का निर्गम एवं मोचन", "Debenture transactions", ["issue of debentures", "types", "interest", "redemption", "sinking fund"]),
        (8, "Financial Statements of a Company", "कंपनी के वित्तीय विवरण", "Balance sheet and P&L as per Companies Act", ["balance sheet format", "statement of P&L", "schedule III"]),
        (9, "Analysis of Financial Statements", "वित्तीय विवरणों का विश्लेषण", "Tools of analysis", ["comparative statements", "common size", "trend analysis", "ratio analysis"]),
        (10, "Accounting Ratios", "लेखांकन अनुपात", "Ratio analysis", ["liquidity ratios", "solvency ratios", "profitability ratios", "activity ratios"]),
        (11, "Cash Flow Statement", "नकदी प्रवाह विवरण", "AS-3 Cash flow statement", ["operating activities", "investing activities", "financing activities"]),
    ],

    # ── Business Studies (NCERT) ──
    ("CBSE", "Class 12", "Business Studies"): [
        (1, "Nature and Significance of Management", "प्रबंधन की प्रकृति और महत्व", "Management as art, science, and profession", ["management", "levels", "functions", "coordination"]),
        (2, "Principles of Management", "प्रबंधन के सिद्धांत", "Fayol and Taylor's principles", ["Fayol's principles", "Taylor's scientific management", "techniques"]),
        (3, "Business Environment", "व्यावसायिक पर्यावरण", "Components of business environment", ["economic", "social", "technological", "political", "legal", "demonetisation", "GST"]),
        (4, "Planning", "नियोजन", "Planning process and types", ["objectives", "strategies", "policies", "procedures", "single-use", "standing plans"]),
        (5, "Organising", "संगठन", "Organisational structure", ["formal", "informal", "functional", "divisional", "delegation", "decentralisation"]),
        (6, "Staffing", "नियुक्तिकरण", "HRM process", ["recruitment", "selection", "training", "development", "performance appraisal"]),
        (7, "Directing", "निर्देशन", "Leadership, motivation, communication", ["supervision", "motivation", "leadership", "communication", "Maslow", "Herzberg"]),
        (8, "Controlling", "नियंत्रण", "Control process and techniques", ["control process", "budgetary control", "ratio analysis", "PERT", "MIS"]),
        (9, "Financial Management", "वित्तीय प्रबंधन", "Capital structure and dividend", ["capital structure", "financial leverage", "cost of capital", "dividend policy"]),
        (10, "Financial Markets", "वित्तीय बाजार", "Money and capital markets", ["money market", "capital market", "stock exchange", "SEBI", "instruments"]),
        (11, "Marketing Management", "विपणन प्रबंधन", "Marketing mix and consumer protection", ["marketing mix", "product", "price", "place", "promotion", "branding", "packaging"]),
        (12, "Consumer Protection", "उपभोक्ता संरक्षण", "Consumer rights and remedies", ["Consumer Protection Act", "rights", "responsibilities", "redressal"]),
    ],

    # ── Economics (Macroeconomics + Indian Economic Development — NCERT) ──
    ("CBSE", "Class 12", "Economics"): [
        (1, "National Income Accounting", "राष्ट्रीय आय लेखांकन", "GDP, GNP, and circular flow", ["circular flow", "GDP", "GNP", "NNP", "methods of measurement"]),
        (2, "Money and Banking", "मुद्रा और बैंकिंग", "Functions of money and banking", ["money supply", "commercial banks", "central bank", "credit creation"]),
        (3, "Determination of Income and Employment", "आय और रोजगार का निर्धारण", "Keynesian theory", ["aggregate demand", "aggregate supply", "multiplier", "equilibrium"]),
        (4, "Government Budget and the Economy", "सरकारी बजट एवं अर्थव्यवस्था", "Fiscal policy", ["budget components", "revenue", "expenditure", "deficit types", "fiscal policy"]),
        (5, "Balance of Payments", "भुगतान शेष", "International transactions", ["current account", "capital account", "BOP deficit", "foreign exchange"]),
        (6, "Indian Economy: Issues and Challenges", "भारतीय अर्थव्यवस्था: मुद्दे और चुनौतियाँ", "Current economic issues", ["poverty", "unemployment", "inflation", "rural development"]),
        (7, "Development Experience of India", "भारत का विकास अनुभव", "Comparing with neighbours", ["India vs China", "India vs Pakistan", "development strategies"]),
        (8, "Open Economy Macroeconomics", "खुली अर्थव्यवस्था", "Exchange rate and trade", ["exchange rate", "fixed vs flexible", "trade policy", "foreign exchange market"]),
    ],

    # ── History (Themes in Indian History — NCERT) ──
    ("CBSE", "Class 12", "History"): [
        (1, "Bricks, Beads and Bones", "ईंटें, मनके तथा अस्थियाँ", "Harappan Civilisation", ["Harappa", "Mohenjo-daro", "urban planning", "craft production", "decline"]),
        (2, "Kings, Farmers and Towns", "राजा, किसान और नगर", "Political and economic history", ["Mauryas", "inscriptions", "coins", "Mahajanapadas"]),
        (3, "Kinship, Caste and Class", "बंधुत्व, जाति तथा वर्ग", "Social structures in early India", ["Mahabharata", "varna", "jati", "patriarchy", "kinship"]),
        (4, "Thinkers, Beliefs and Buildings", "विचारक, विश्वास और इमारतें", "Religious and philosophical traditions", ["Buddhism", "Jainism", "Sanchi stupa", "bhakti"]),
        (5, "Through the Eyes of Travellers", "यात्रियों के नज़रिए", "Accounts of Al-Biruni, Ibn Battuta, Bernier", ["Al-Biruni", "Ibn Battuta", "Bernier", "Mughal India"]),
        (6, "Bhakti-Sufi Traditions", "भक्ति-सूफी परंपराएँ", "Devotional and mystical movements", ["bhakti saints", "Sufi orders", "Kabir", "Guru Nanak", "Mirabai"]),
        (7, "An Imperial Capital: Vijayanagara", "एक शाही राजधानी: विजयनगर", "Vijayanagara empire", ["Hampi", "architecture", "administration", "decline"]),
        (8, "Peasants, Zamindars and the State", "किसान, जमींदार और राज्य", "Agrarian history under Mughals", ["Mughal administration", "Ain-i-Akbari", "peasants", "zamindars"]),
        (9, "Colonialism and the Countryside", "उपनिवेशवाद और देहात", "British agrarian policies", ["Permanent Settlement", "Mahalwari", "Ryotwari", "indigo revolt"]),
        (10, "Rebels and the Raj", "विद्रोही और राज", "1857 revolt and patterns", ["1857 revolt", "centres", "leaders", "vision of unity", "repression"]),
        (11, "Mahatma Gandhi and the Nationalist Movement", "महात्मा गांधी और राष्ट्रीय आंदोलन", "Gandhi's role in freedom struggle", ["Non-Cooperation", "Civil Disobedience", "Quit India", "Dandi March"]),
        (12, "Framing the Constitution", "संविधान का निर्माण", "Making of Indian Constitution", ["Constituent Assembly", "debates", "objectives resolution", "fundamental rights"]),
        (13, "Understanding Partition", "विभाजन को समझना", "Partition of India", ["communalism", "partition", "refugees", "violence", "oral histories"]),
    ],

    # ── Political Science (NCERT — Contemporary World Politics + Politics in India since Independence) ──
    ("CBSE", "Class 12", "Political Science"): [
        (1, "The Cold War Era", "शीत युद्ध का दौर", "Bipolar world and Cold War", ["USA vs USSR", "NATO", "Warsaw Pact", "Cuban missile crisis", "detente"]),
        (2, "The End of Bipolarity", "द्विध्रुवीयता का अंत", "Collapse of USSR", ["Soviet disintegration", "shock therapy", "unipolar world", "CIS"]),
        (3, "US Hegemony in World Politics", "समकालीन विश्व में अमेरिकी वर्चस्व", "American dominance post-Cold War", ["Gulf War", "9/11", "Iraq", "hegemony", "constraints"]),
        (4, "Alternative Centres of Power", "सत्ता के वैकल्पिक केंद्र", "EU, ASEAN, China", ["European Union", "ASEAN", "China's rise", "Japan"]),
        (5, "Contemporary South Asia", "समकालीन दक्षिण एशिया", "South Asian politics", ["India-Pakistan", "democracy in South Asia", "SAARC", "bilateral issues"]),
        (6, "International Organisations", "अंतर्राष्ट्रीय संगठन", "UN and global governance", ["United Nations", "Security Council", "reforms", "IMF", "World Bank"]),
        (7, "Challenges of Nation Building", "राष्ट्र-निर्माण की चुनौतियाँ", "Post-independence challenges", ["partition", "integration of states", "linguistic states"]),
        (8, "Era of One-Party Dominance", "एक दल के प्रभुत्व का दौर", "Congress dominance 1947-1967", ["Congress system", "opposition", "socialist ideology"]),
        (9, "Politics of Planned Development", "नियोजित विकास की राजनीति", "Planning and economic debates", ["planning", "mixed economy", "Green Revolution", "debates"]),
        (10, "India's External Relations", "भारत के विदेशी संबंध", "Foreign policy evolution", ["NAM", "Sino-Indian war", "Indo-Pak wars", "nuclear policy"]),
    ],
}


# ─────────────────────────────────────────────────────────────────────────────
# CLASS 12 — ICSE/ISC (CISCE Syllabus 2024-25)
# ─────────────────────────────────────────────────────────────────────────────

ICSE_CLASS_12 = {
    # ── Physics ──
    ("ICSE", "Class 12", "Physics"): [
        (1, "Electric Charges, Fields and Potential", "", "Electrostatics", ["Coulomb's law", "electric field", "Gauss's law", "potential", "capacitance"]),
        (2, "Current Electricity", "", "Ohm's law and circuits", ["drift velocity", "Kirchhoff's laws", "Wheatstone bridge", "potentiometer"]),
        (3, "Magnetic Effects of Current", "", "Biot-Savart and Ampere's law", ["Biot-Savart", "Ampere's law", "solenoid", "force on conductor", "galvanometer"]),
        (4, "Electromagnetic Induction and AC", "", "Faraday's laws and AC circuits", ["Faraday's law", "Lenz's law", "AC generator", "transformer", "LCR circuit"]),
        (5, "Electromagnetic Waves", "", "EM spectrum", ["Maxwell's equations", "EM spectrum", "properties"]),
        (6, "Optics", "", "Ray and wave optics", ["reflection", "refraction", "interference", "diffraction", "polarisation", "optical instruments"]),
        (7, "Dual Nature of Radiation and Matter", "", "Quantum theory basics", ["photoelectric effect", "photon", "de Broglie", "electron microscope"]),
        (8, "Atoms and Nuclei", "", "Atomic and nuclear physics", ["Bohr model", "radioactivity", "binding energy", "fission", "fusion"]),
        (9, "Electronic Devices", "", "Semiconductors and applications", ["p-n junction", "diode", "transistor", "logic gates", "communication"]),
        (10, "Communication Systems", "", "Modulation and signals", ["modulation", "AM", "FM", "bandwidth", "satellite communication"]),
    ],

    # ── Chemistry ──
    ("ICSE", "Class 12", "Chemistry"): [
        (1, "Solutions", "", "Colligative properties", ["Raoult's law", "osmotic pressure", "depression in freezing point", "van't Hoff factor"]),
        (2, "Electrochemistry", "", "Cells and electrolysis", ["Nernst equation", "conductance", "Faraday's laws", "batteries"]),
        (3, "Chemical Kinetics", "", "Rate and order of reactions", ["rate law", "order", "molecularity", "Arrhenius equation"]),
        (4, "d- and f-Block Elements", "", "Transition metals", ["properties", "compounds", "lanthanoids", "actinoids"]),
        (5, "Coordination Compounds", "", "Complex compounds", ["Werner's theory", "nomenclature", "isomerism", "bonding", "stability"]),
        (6, "Haloalkanes and Haloarenes", "", "Organic halides", ["nomenclature", "SN1", "SN2", "elimination", "Grignard"]),
        (7, "Alcohols, Phenols and Ethers", "", "Hydroxy and ether compounds", ["preparation", "reactions", "identification"]),
        (8, "Aldehydes, Ketones and Carboxylic Acids", "", "Carbonyl chemistry", ["nucleophilic addition", "named reactions", "acidic properties"]),
        (9, "Organic Nitrogen Compounds", "", "Amines and diazonium", ["amines", "diazonium salts", "cyanides", "isocyanides"]),
        (10, "Biomolecules and Polymers", "", "Biological and synthetic macromolecules", ["carbohydrates", "proteins", "nucleic acids", "polymers"]),
    ],

    # ── Mathematics ──
    ("ICSE", "Class 12", "Mathematics"): [
        (1, "Relations and Functions", "", "Types and inverse functions", ["types of relations", "inverse functions", "binary operations"]),
        (2, "Inverse Trigonometric Functions", "", "Properties and graphs", ["principal values", "properties", "simplification"]),
        (3, "Matrices and Determinants", "", "Matrix algebra and applications", ["operations", "inverse", "determinants", "Cramer's rule", "rank"]),
        (4, "Continuity and Differentiability", "", "Differentiation", ["continuity", "chain rule", "implicit", "parametric", "higher order"]),
        (5, "Application of Derivatives", "", "Maxima, minima, rate of change", ["rate of change", "tangent/normal", "increasing/decreasing", "maxima/minima"]),
        (6, "Integration", "", "Indefinite and definite integrals", ["methods of integration", "definite integrals", "properties"]),
        (7, "Application of Integrals", "", "Areas under curves", ["area under curve", "area between curves"]),
        (8, "Differential Equations", "", "Formation and solution", ["order", "degree", "variable separable", "linear DE", "homogeneous"]),
        (9, "Vectors", "", "Vector algebra", ["types", "dot product", "cross product", "scalar triple product"]),
        (10, "Three Dimensional Geometry", "", "Lines and planes", ["direction cosines", "line equation", "plane equation", "shortest distance"]),
        (11, "Probability", "", "Bayes theorem and distributions", ["conditional probability", "Bayes theorem", "random variable", "Bernoulli", "binomial"]),
        (12, "Linear Programming", "", "Optimisation problems", ["formulation", "graphical method", "feasible region", "optimal solution"]),
    ],

    # ── Biology ──
    ("ICSE", "Class 12", "Biology"): [
        (1, "Reproduction in Organisms", "", "Types of reproduction", ["asexual", "sexual", "vegetative propagation"]),
        (2, "Sexual Reproduction in Plants", "", "Flower to seed", ["microsporogenesis", "megasporogenesis", "pollination", "fertilisation"]),
        (3, "Human Reproduction", "", "Reproductive system and development", ["gametogenesis", "menstrual cycle", "pregnancy", "parturition"]),
        (4, "Reproductive Health", "", "Family planning and STDs", ["contraception", "ART", "STDs", "population control"]),
        (5, "Genetics and Evolution", "", "Inheritance patterns", ["Mendel", "linkage", "sex-linked", "mutations", "evolution"]),
        (6, "Molecular Biology", "", "DNA and gene expression", ["DNA replication", "transcription", "translation", "lac operon", "HGP"]),
        (7, "Biotechnology", "", "Genetic engineering applications", ["rDNA", "PCR", "gene therapy", "GMO", "bioethics"]),
        (8, "Human Health and Disease", "", "Immunity and diseases", ["immunity types", "AIDS", "cancer", "drugs", "vaccines"]),
        (9, "Food Production", "", "Animal husbandry and plant breeding", ["plant breeding", "SCP", "tissue culture", "animal husbandry"]),
        (10, "Ecology and Environment", "", "Ecosystems and biodiversity", ["ecosystem", "biodiversity", "conservation", "pollution", "environmental issues"]),
    ],

    # ── Accountancy ──
    ("ICSE", "Class 12", "Accountancy"): [
        (1, "Partnership Accounts – Fundamentals", "", "Partnership basics", ["partnership deed", "profit sharing", "interest", "salary", "commission"]),
        (2, "Goodwill", "", "Valuation of goodwill", ["methods of valuation", "super profit", "capitalisation", "treatment"]),
        (3, "Admission of a Partner", "", "Accounting for new partner", ["new ratio", "goodwill", "revaluation", "capital adjustment"]),
        (4, "Retirement and Death of a Partner", "", "Settlement", ["gaining ratio", "goodwill", "revaluation", "executor's account"]),
        (5, "Dissolution of Partnership", "", "Closing accounts", ["realisation account", "settlement", "piecemeal distribution"]),
        (6, "Joint Stock Company Accounts", "", "Share capital and debentures", ["issue of shares", "forfeiture", "debentures", "redemption"]),
        (7, "Financial Statements of Companies", "", "As per Companies Act", ["balance sheet", "P&L statement", "Schedule III"]),
        (8, "Ratio Analysis", "", "Types of ratios", ["liquidity", "profitability", "solvency", "turnover ratios"]),
        (9, "Cash Flow Statement", "", "Operating, investing, financing", ["operating activities", "investing activities", "financing activities"]),
        (10, "Computerised Accounting", "", "Using accounting software", ["Tally", "features", "voucher entry", "reports"]),
    ],

    # ── Economics ──
    ("ICSE", "Class 12", "Economics"): [
        (1, "National Income", "", "Concepts and measurement", ["GDP", "GNP", "NDP", "methods of calculation", "circular flow"]),
        (2, "Money and Banking", "", "Functions and credit creation", ["money supply", "commercial banks", "central bank", "credit creation"]),
        (3, "Aggregate Demand and Supply", "", "Keynesian economics", ["consumption", "investment", "multiplier", "equilibrium"]),
        (4, "Government Budget", "", "Fiscal policy", ["revenue", "expenditure", "types of deficit", "fiscal policy measures"]),
        (5, "Balance of Payments", "", "International economics", ["current account", "capital account", "exchange rate", "trade policy"]),
        (6, "Indian Economy — An Overview", "", "Structure and growth", ["sectors", "GDP composition", "planning", "liberalisation"]),
        (7, "Problems of Indian Economy", "", "Major challenges", ["poverty", "unemployment", "inequality", "inflation"]),
        (8, "Economic Reforms", "", "LPG and after", ["liberalisation", "privatisation", "globalisation", "FDI", "Make in India"]),
    ],
}


# ─────────────────────────────────────────────────────────────────────────────
# CLASS 12 — MSBSHSE (Maharashtra HSC — Balbharati 2024-25)
# ─────────────────────────────────────────────────────────────────────────────

MSBSHSE_CLASS_12 = {
    # ── Physics ──
    ("MSBSHSE", "Class 12", "Physics"): [
        (1, "Rotational Dynamics", "घूर्णन गतीशास्त्र", "Moment of inertia and angular momentum", ["moment of inertia", "torque", "angular momentum", "rolling motion"]),
        (2, "Mechanical Properties of Fluids", "तरल पदार्थांचे यांत्रिक गुणधर्म", "Fluid statics and dynamics", ["viscosity", "surface tension", "Bernoulli", "Stokes' law"]),
        (3, "Kinetic Theory of Gases and Radiation", "वायूंचा अणुगती सिद्धांत आणि प्रारण", "Gas kinetics and heat radiation", ["kinetic theory", "degrees of freedom", "radiation laws", "Stefan's law"]),
        (4, "Thermodynamics", "उष्मागतीशास्त्र", "Laws of thermodynamics", ["first law", "second law", "entropy", "Carnot engine"]),
        (5, "Oscillations", "दोलने", "SHM and types", ["SHM", "spring-mass", "pendulum", "damped", "forced"]),
        (6, "Superposition of Waves", "तरंगांचे अध्यारोपण", "Interference and resonance", ["superposition", "stationary waves", "resonance", "beats"]),
        (7, "Wave Optics", "तरंग प्रकाशिकी", "Interference, diffraction, polarisation", ["Young's experiment", "diffraction", "resolving power", "polarisation"]),
        (8, "Electrostatics", "स्थिरविद्युतशास्त्र", "Charges and fields", ["Coulomb's law", "electric field", "Gauss's law", "potential", "capacitor"]),
        (9, "Current Electricity", "विद्युत प्रवाह", "Resistance and circuits", ["Ohm's law", "Kirchhoff's laws", "Wheatstone", "potentiometer"]),
        (10, "Magnetic Fields due to Electric Current", "विद्युत प्रवाहामुळे चुंबकीय क्षेत्र", "Biot-Savart and Ampere", ["Biot-Savart", "Ampere's law", "solenoid", "force on conductor"]),
        (11, "Magnetic Materials", "चुंबकीय पदार्थ", "Magnetic properties of materials", ["diamagnetic", "paramagnetic", "ferromagnetic", "hysteresis"]),
        (12, "Electromagnetic Induction", "विद्युतचुंबकीय प्रवर्तन", "Faraday's laws and applications", ["Faraday's law", "Lenz's law", "self-induction", "mutual induction", "AC generator"]),
        (13, "AC Circuits", "प्रत्यावर्ती धारा मंडल", "AC theory and resonance", ["RMS", "reactance", "impedance", "LCR", "resonance", "power factor"]),
        (14, "Dual Nature of Radiation and Matter", "प्रारण आणि द्रव्याची द्वैत प्रकृती", "Photoelectric effect", ["photoelectric effect", "photon", "de Broglie", "electron emission"]),
        (15, "Structure of Atoms and Nuclei", "अणू आणि केंद्रकांची रचना", "Atomic and nuclear models", ["Bohr model", "nuclear structure", "radioactivity", "fission", "fusion"]),
        (16, "Semiconductor Devices", "अर्धवाहक साधने", "Electronics", ["p-n junction", "diode", "transistor", "logic gates"]),
    ],

    # ── Chemistry ──
    ("MSBSHSE", "Class 12", "Chemistry"): [
        (1, "Solid State", "घन अवस्था", "Crystal structures", ["unit cell", "packing", "defects", "electrical properties"]),
        (2, "Solutions", "विद्रावण", "Colligative properties", ["concentration", "Raoult's law", "colligative properties", "osmosis"]),
        (3, "Ionic Equilibria", "आयनी साम्य", "pH and buffers", ["ionisation", "pH", "buffers", "solubility product"]),
        (4, "Chemical Thermodynamics", "रासायनिक ऊष्मागतीशास्त्र", "Enthalpy and entropy", ["enthalpy", "entropy", "Gibbs energy", "spontaneity"]),
        (5, "Electrochemistry", "विद्युतरसायनशास्त्र", "Cells and Nernst equation", ["galvanic cell", "Nernst equation", "electrolysis", "batteries"]),
        (6, "Chemical Kinetics", "रासायनिक गतीशास्त्र", "Rates and mechanisms", ["rate law", "order", "half-life", "Arrhenius equation"]),
        (7, "Elements of Groups 16, 17, 18", "गट 16, 17, 18 चे मूलद्रव्य", "Non-metals", ["oxygen family", "halogens", "noble gases", "compounds"]),
        (8, "Transition and Inner Transition Elements", "संक्रमण आणि अंतर्संक्रमण मूलद्रव्ये", "d and f block", ["properties", "compounds", "KMnO4", "lanthanoids"]),
        (9, "Coordination Compounds", "उपसहसंयोजक संयुगे", "Werner's theory", ["nomenclature", "isomerism", "bonding", "stability"]),
        (10, "Halogen Derivatives", "हॅलोजन व्युत्पन्ने", "Organic halides", ["nomenclature", "SN1", "SN2", "elimination"]),
        (11, "Alcohols, Phenols and Ethers", "अल्कोहॉल, फिनॉल आणि ईथर", "Hydroxy compounds", ["preparation", "properties", "reactions"]),
        (12, "Aldehydes, Ketones and Carboxylic Acids", "अल्डिहाइड, कीटोन आणि कार्बोक्सिलिक आम्ल", "Carbonyl compounds", ["nucleophilic addition", "reactions", "named reactions"]),
        (13, "Amines", "अमाइन्स", "Organic nitrogen compounds", ["classification", "preparation", "reactions", "diazonium"]),
        (14, "Biomolecules", "जैवरेणू", "Biological chemistry", ["carbohydrates", "proteins", "nucleic acids", "vitamins"]),
        (15, "Polymers", "बहुवारिके", "Polymer chemistry", ["addition", "condensation", "natural", "synthetic", "biodegradable"]),
        (16, "Green Chemistry and Nanochemistry", "हरित रसायनशास्त्र आणि नॅनोरसायनशास्त्र", "Sustainable chemistry", ["green chemistry principles", "nanomaterials", "applications"]),
    ],

    # ── Mathematics ──
    ("MSBSHSE", "Class 12", "Mathematics"): [
        (1, "Mathematical Logic", "गणितीय तर्कशास्त्र", "Statements and truth tables", ["statements", "connectives", "truth tables", "tautology", "contradiction"]),
        (2, "Matrices", "आव्यूह", "Matrix algebra", ["types", "operations", "inverse", "elementary transformations"]),
        (3, "Trigonometric Functions", "त्रिकोणमितीय फलने", "Inverse trig and equations", ["inverse functions", "general solutions", "properties"]),
        (4, "Pair of Straight Lines", "सरळ रेषांचे जोडे", "Combined equations", ["combined equation", "homogeneous", "angle between lines"]),
        (5, "Vectors", "सदिश", "Vector algebra", ["types", "dot product", "cross product", "applications"]),
        (6, "Three Dimensional Geometry", "त्रिमितीय भूमिती", "Lines and planes", ["direction cosines", "line equation", "plane equation"]),
        (7, "Linear Programming", "रेषीय नियोजन", "Optimisation", ["constraints", "feasible region", "optimal solution"]),
        (8, "Continuity", "सातत्य", "Continuity of functions", ["continuity at point", "types of discontinuity", "theorems"]),
        (9, "Differentiation", "अवकलन", "Differentiation rules", ["chain rule", "implicit", "parametric", "logarithmic", "higher order"]),
        (10, "Applications of Derivatives", "अवकलजांचे उपयोजन", "Maxima and minima", ["rate of change", "tangent", "increasing/decreasing", "maxima/minima"]),
        (11, "Integration", "समाकलन", "Integration methods", ["substitution", "partial fractions", "by parts", "definite integrals"]),
        (12, "Applications of Definite Integrals", "निश्चित समाकलनांचे उपयोजन", "Areas", ["area under curve", "area between curves"]),
        (13, "Differential Equations", "अवकल समीकरणे", "Solving DEs", ["order", "degree", "variable separable", "linear"]),
        (14, "Probability Distribution", "संभाव्यता वितरण", "Random variables", ["random variable", "probability distribution", "binomial", "Poisson"]),
        (15, "Bernoulli Trials and Binomial Distribution", "बर्नूली चाचण्या", "Binomial distribution", ["Bernoulli trials", "binomial distribution", "mean", "variance"]),
    ],

    # ── Biology ──
    ("MSBSHSE", "Class 12", "Biology"): [
        (1, "Reproduction in Lower and Higher Plants", "वनस्पतींतील प्रजनन", "Plant reproduction", ["vegetative", "asexual", "sexual", "double fertilisation"]),
        (2, "Reproduction in Lower and Higher Animals", "प्राण्यांतील प्रजनन", "Animal reproduction", ["asexual", "sexual", "human reproduction"]),
        (3, "Inheritance and Variation", "आनुवंशिकता आणि विविधता", "Genetics", ["Mendel", "linkage", "crossing over", "sex-linked"]),
        (4, "Molecular Basis of Inheritance", "आनुवंशिकतेचा आण्विक आधार", "DNA and gene expression", ["DNA", "RNA", "replication", "transcription", "translation"]),
        (5, "Origin and Evolution of Life", "जीवनाची उत्पत्ती आणि उत्क्रांती", "Evolution", ["origin of life", "natural selection", "speciation", "human evolution"]),
        (6, "Plant Water Relations and Mineral Nutrition", "वनस्पती जलसंबंध आणि खनिज पोषण", "Water and minerals in plants", ["osmosis", "transpiration", "mineral absorption"]),
        (7, "Plant Growth and Development", "वनस्पती वृद्धी आणि विकास", "Growth hormones", ["auxins", "gibberellins", "photoperiodism", "vernalisation"]),
        (8, "Respiration and Circulation", "श्वसन आणि रक्ताभिसरण", "Respiratory and circulatory systems", ["respiration mechanism", "heart", "blood vessels", "blood"]),
        (9, "Control and Coordination", "नियंत्रण आणि समन्वय", "Nervous and hormonal control", ["nervous system", "brain", "endocrine glands", "hormones"]),
        (10, "Human Health and Diseases", "मानवी आरोग्य आणि रोग", "Immunity and diseases", ["immunity", "AIDS", "cancer", "drugs"]),
        (11, "Enhancement of Food Production", "अन्न उत्पादन वाढ", "Breeding and biotechnology", ["plant breeding", "animal husbandry", "microbes in food"]),
        (12, "Biotechnology", "जैवतंत्रज्ञान", "Genetic engineering", ["rDNA", "PCR", "gene therapy", "transgenic", "bioethics"]),
        (13, "Organisms and Environment", "सजीव आणि पर्यावरण", "Ecology", ["population", "community", "ecosystem", "biodiversity"]),
        (14, "Biodiversity, Conservation and Environmental Issues", "जैवविविधता, संवर्धन आणि पर्यावरणविषयक मुद्दे", "Conservation", ["biodiversity loss", "conservation", "pollution", "global warming"]),
    ],

    # ── Accountancy ──
    ("MSBSHSE", "Class 12", "Accountancy"): [
        (1, "Partnership — Final Accounts", "भागीदारी — अंतिम लेखे", "Partnership final accounts", ["trading account", "P&L", "balance sheet", "adjustments"]),
        (2, "Accounts of Not-for-Profit Organisations", "ना-नफा संस्थांचे लेखे", "NPO accounting", ["receipts & payments", "income & expenditure", "balance sheet"]),
        (3, "Reconstitution of Partnership", "भागीदारी पुनर्रचना", "Change in firm structure", ["goodwill", "revaluation", "ratios"]),
        (4, "Admission of Partner", "भागीदाराचा प्रवेश", "New partner accounting", ["sacrificing ratio", "goodwill", "capital adjustment"]),
        (5, "Retirement of Partner", "भागीदाराची निवृत्ती", "Retiring partner settlement", ["gaining ratio", "goodwill", "revaluation"]),
        (6, "Death of a Partner", "भागीदाराचा मृत्यू", "Deceased partner's dues", ["executor's account", "share of profit", "settlement"]),
        (7, "Dissolution of Partnership Firm", "भागीदारी विसर्जन", "Closing accounts", ["realisation account", "settlement", "deficiency account"]),
        (8, "Company Accounts — Issue of Shares", "कंपनी लेखे — शेअर विक्री", "Share capital transactions", ["issue at par/premium/discount", "oversubscription", "forfeiture"]),
        (9, "Company Accounts — Issue of Debentures", "कंपनी लेखे — डिबेंचर विक्री", "Debenture transactions", ["types", "issue", "interest", "redemption"]),
        (10, "Analysis of Financial Statements", "आर्थिक विवरणांचे विश्लेषण", "Tools of analysis", ["comparative", "common size", "trend", "ratio analysis"]),
        (11, "Cash Flow Statement", "रोकड प्रवाह विवरणपत्र", "Cash flow preparation", ["operating", "investing", "financing"]),
    ],

    # ── Organisation of Commerce and Management ──
    ("MSBSHSE", "Class 12", "Business Studies"): [
        (1, "Principles of Management", "व्यवस्थापन तत्त्वे", "Management principles", ["Fayol", "Taylor", "scientific management"]),
        (2, "Functions of Management", "व्यवस्थापनाची कार्ये", "POSDCORB", ["planning", "organising", "staffing", "directing", "controlling"]),
        (3, "Entrepreneurship Development", "उद्योजकता विकास", "Entrepreneur and startup", ["entrepreneur", "startup", "EDP", "government schemes"]),
        (4, "Business Services", "व्यावसायिक सेवा", "Insurance, banking, logistics", ["insurance types", "banking services", "logistics", "e-services"]),
        (5, "Emerging Modes of Business", "व्यवसायाचे उदयोन्मुख प्रकार", "E-business and outsourcing", ["e-commerce", "BPO", "KPO", "digital marketing"]),
        (6, "Social Responsibility of Business", "व्यवसायाचे सामाजिक उत्तरदायित्व", "CSR", ["CSR", "business ethics", "environment", "community"]),
        (7, "Consumer Protection", "ग्राहक संरक्षण", "Consumer Act 2019", ["Consumer Protection Act", "consumer rights", "redressal", "consumer courts"]),
        (8, "Marketing", "विपणन", "Marketing management", ["marketing mix", "4Ps", "digital marketing", "branding"]),
        (9, "Stock Exchange", "शेअर बाजार", "Stock market operations", ["BSE", "NSE", "SEBI", "IPO", "trading"]),
        (10, "Industrial Disputes", "औद्योगिक वाद", "Labour relations", ["strikes", "lockouts", "settlements", "Industrial Disputes Act"]),
    ],

    # ── Economics ──
    ("MSBSHSE", "Class 12", "Economics"): [
        (1, "National Income", "राष्ट्रीय उत्पन्न", "GDP concepts and measurement", ["GDP", "GNP", "NNP", "methods"]),
        (2, "Aggregate Demand and Supply", "एकत्रित मागणी आणि पुरवठा", "Macroeconomic equilibrium", ["AD", "AS", "equilibrium", "multiplier"]),
        (3, "Money and Banking", "मुद्रा आणि बँकिंग", "Banking system", ["money functions", "RBI", "credit creation", "monetary policy"]),
        (4, "Public Finance", "सार्वजनिक अर्थव्यवस्था", "Government budget", ["revenue", "expenditure", "debt", "fiscal policy"]),
        (5, "Foreign Trade", "परकीय व्यापार", "International trade", ["comparative advantage", "terms of trade", "BOP", "WTO"]),
        (6, "Indian Economy", "भारतीय अर्थव्यवस्था", "Overview and structure", ["sectors", "planning", "LPG reforms"]),
        (7, "Agriculture", "शेती", "Indian agriculture", ["Green Revolution", "problems", "government policies"]),
        (8, "Industry", "उद्योग", "Industrial development", ["industrialisation", "MSMEs", "Make in India"]),
        (9, "Economic Reforms", "आर्थिक सुधारणा", "LPG and challenges", ["liberalisation", "privatisation", "FDI", "challenges"]),
        (10, "Globalisation", "जागतिकीकरण", "Impact of globalisation", ["WTO", "MNCs", "impact on India", "challenges"]),
    ],
}


# ─────────────────────────────────────────────────────────────────────────────
# CLASS 12 — GSEB (Gujarat Board)
# ─────────────────────────────────────────────────────────────────────────────

GSEB_CLASS_12 = {
    # ── Physics ──
    ("GSEB", "Class 12", "Physics"): [
        (1, "Electric Charges and Fields", "વિદ્યુત આવેશ અને ક્ષેત્ર", "Electrostatics", ["Coulomb's law", "electric field", "Gauss's law", "dipole"]),
        (2, "Electrostatic Potential and Capacitance", "સ્થિતવિદ્યુત વિભવ અને ધારિતા", "Potential and capacitors", ["potential", "equipotential", "capacitors", "dielectrics"]),
        (3, "Current Electricity", "વિદ્યુત પ્રવાહ", "Circuits and Kirchhoff's laws", ["Ohm's law", "Kirchhoff's laws", "Wheatstone", "potentiometer"]),
        (4, "Moving Charges and Magnetism", "ગતિમાન આવેશ અને ચુંબકત્વ", "Magnetic field due to current", ["Biot-Savart", "Ampere's law", "solenoid", "force"]),
        (5, "Magnetism and Matter", "ચુંબકત્વ અને દ્રવ્ય", "Magnetic materials", ["bar magnet", "diamagnetic", "paramagnetic", "ferromagnetic"]),
        (6, "Electromagnetic Induction", "વિદ્યુતચુંબકીય પ્રેરણ", "Faraday's laws", ["Faraday's law", "Lenz's law", "inductance", "generator"]),
        (7, "Alternating Current", "પ્રત્યાવર્તી વિદ્યુત પ્રવાહ", "AC circuits", ["AC generator", "LCR circuit", "resonance", "transformer"]),
        (8, "Electromagnetic Waves", "વિદ્યુતચુંબકીય તરંગો", "EM spectrum", ["Maxwell", "EM spectrum", "properties"]),
        (9, "Ray Optics", "કિરણ પ્રકાશિકી", "Reflection and refraction", ["mirror", "lens", "prism", "optical instruments"]),
        (10, "Wave Optics", "તરંગ પ્રકાશિકી", "Interference and diffraction", ["Young's experiment", "diffraction", "polarisation"]),
        (11, "Dual Nature of Radiation and Matter", "વિકિરણ અને દ્રવ્યની દ્વૈત પ્રકૃતિ", "Photoelectric effect", ["photoelectric effect", "photon", "de Broglie"]),
        (12, "Atoms and Nuclei", "પરમાણુ અને ન્યુક્લિયસ", "Atomic and nuclear physics", ["Bohr model", "radioactivity", "fission", "fusion"]),
        (13, "Semiconductor Electronics", "અર્ધવાહક ઈલેક્ટ્રોનિક્સ", "Devices", ["p-n junction", "diode", "transistor", "logic gates"]),
        (14, "Communication Systems", "સંદેશાવ્યવહાર પ્રણાલી", "Signal processing", ["modulation", "bandwidth", "communication systems"]),
    ],

    # ── Chemistry ──
    ("GSEB", "Class 12", "Chemistry"): [
        (1, "The Solid State", "ઘન અવસ્થા", "Crystal structures", ["unit cell", "packing", "defects"]),
        (2, "Solutions", "દ્રાવણ", "Colligative properties", ["Raoult's law", "colligative properties", "osmosis"]),
        (3, "Electrochemistry", "વિદ્યુતરસાયણ", "Cells and electrolysis", ["Nernst equation", "conductance", "batteries"]),
        (4, "Chemical Kinetics", "રાસાયણિક ગતિશાસ્ત્ર", "Rate laws", ["rate law", "order", "Arrhenius equation"]),
        (5, "Surface Chemistry", "પૃષ્ઠ રસાયણ", "Adsorption and colloids", ["adsorption", "catalysis", "colloids"]),
        (6, "p-Block Elements", "p-બ્લૉક તત્ત્વો", "Groups 15-18", ["nitrogen family", "oxygen family", "halogens", "noble gases"]),
        (7, "d- and f-Block Elements", "d- અને f-બ્લૉક તત્ત્વો", "Transition metals", ["properties", "compounds", "lanthanoids"]),
        (8, "Coordination Compounds", "ઉપસહસંયોજક સંયોજનો", "Complex chemistry", ["nomenclature", "isomerism", "bonding"]),
        (9, "Haloalkanes and Haloarenes", "હેલોઆલ્કેન અને હેલોએરિન", "Organic halides", ["SN1", "SN2", "elimination"]),
        (10, "Alcohols, Phenols and Ethers", "આલ્કોહોલ, ફિનોલ અને ઈથર", "Hydroxy compounds", ["preparation", "reactions"]),
        (11, "Aldehydes, Ketones and Carboxylic Acids", "એલ્ડિહાઇડ, કીટોન અને કાર્બોક્સિલિક ઍસિડ", "Carbonyl chemistry", ["nucleophilic addition", "reactions"]),
        (12, "Amines", "એમાઇન", "Organic nitrogen", ["classification", "reactions", "diazonium"]),
        (13, "Biomolecules", "જૈવ અણુઓ", "Biological chemistry", ["carbohydrates", "proteins", "nucleic acids"]),
        (14, "Polymers", "બહુલકો", "Polymer types", ["addition", "condensation", "natural", "synthetic"]),
        (15, "Chemistry in Everyday Life", "દૈનિક જીવનમાં રસાયણ", "Applications", ["drugs", "food", "soaps"]),
    ],

    # ── Mathematics ──
    ("GSEB", "Class 12", "Mathematics"): [
        (1, "Relations and Functions", "સંબંધો અને વિધેયો", "Types and inverse", ["types of relations", "one-one", "onto", "inverse"]),
        (2, "Inverse Trigonometric Functions", "પ્રતિલોમ ત્રિકોણમિતીય વિધેયો", "Inverse trig", ["principal values", "properties"]),
        (3, "Matrices", "આવ્યૂહ", "Matrix algebra", ["types", "operations", "inverse"]),
        (4, "Determinants", "સારણિક", "Properties and applications", ["properties", "cofactors", "Cramer's rule"]),
        (5, "Continuity and Differentiability", "સાતત્ય અને અવકલનીયતા", "Differentiation", ["continuity", "chain rule", "implicit", "logarithmic"]),
        (6, "Application of Derivatives", "અવકલજના ઉપયોગો", "Maxima and minima", ["rate of change", "tangent", "maxima", "minima"]),
        (7, "Integrals", "સમાકલન", "Integration methods", ["substitution", "partial fractions", "by parts", "definite"]),
        (8, "Application of Integrals", "સમાકલનના ઉપયોગો", "Areas", ["area under curve", "area between curves"]),
        (9, "Differential Equations", "અવકલ સમીકરણો", "Solving DEs", ["order", "degree", "methods"]),
        (10, "Vector Algebra", "સદિશ બીજગણિત", "Vector operations", ["dot product", "cross product", "triple product"]),
        (11, "Three Dimensional Geometry", "ત્રિપરિમાણીય ભૂમિતિ", "Lines and planes", ["direction cosines", "line", "plane"]),
        (12, "Linear Programming", "રેખીય પ્રોગ્રામિંગ", "Optimisation", ["constraints", "feasible region", "corner point"]),
        (13, "Probability", "સંભાવના", "Bayes and distributions", ["Bayes theorem", "random variable", "binomial"]),
    ],

    # ── Biology ──
    ("GSEB", "Class 12", "Biology"): [
        (1, "Reproduction in Organisms", "સજીવોમાં પ્રજનન", "Types of reproduction", ["asexual", "sexual", "vegetative"]),
        (2, "Sexual Reproduction in Flowering Plants", "પુષ્પી છોડમાં લૈંગિક પ્રજનન", "Flower to seed", ["pollination", "fertilisation", "embryo"]),
        (3, "Human Reproduction", "માનવ પ્રજનન", "Reproductive system", ["gametogenesis", "menstrual cycle", "pregnancy"]),
        (4, "Reproductive Health", "પ્રજનન સ્વાસ્થ્ય", "Family planning", ["contraception", "STDs", "infertility"]),
        (5, "Principles of Inheritance", "આનુવંશિકતાના સિદ્ધાંતો", "Genetics", ["Mendel", "linkage", "sex determination"]),
        (6, "Molecular Basis of Inheritance", "આનુવંશિકતાનો આણ્વિક આધાર", "DNA and genes", ["DNA", "replication", "transcription", "translation"]),
        (7, "Evolution", "ઉત્ક્રાંતિ", "Origin and mechanisms", ["origin of life", "natural selection", "speciation"]),
        (8, "Human Health and Disease", "માનવ સ્વાસ્થ્ય અને રોગ", "Immunity", ["immunity", "AIDS", "cancer"]),
        (9, "Biotechnology: Principles and Processes", "જૈવતંત્રજ્ઞાન: સિદ્ધાંતો અને પ્રક્રિયાઓ", "Genetic engineering", ["rDNA", "PCR", "vectors"]),
        (10, "Biotechnology and its Applications", "જૈવતંત્રજ્ઞાન અને ઉપયોગો", "GMO and therapy", ["Bt crops", "gene therapy", "bioethics"]),
        (11, "Organisms and Populations", "સજીવો અને વસ્તી", "Ecology", ["adaptations", "population", "interactions"]),
        (12, "Ecosystem", "ઇકોસિસ્ટમ", "Structure and function", ["productivity", "energy flow", "nutrient cycling"]),
        (13, "Biodiversity and Conservation", "જૈવવિવિધતા અને સંરક્ષણ", "Conservation", ["hotspots", "threats", "conservation strategies"]),
        (14, "Environmental Issues", "પર્યાવરણીય મુદ્દાઓ", "Pollution", ["air", "water", "solid waste", "ozone"]),
    ],

    # ── Accountancy ──
    ("GSEB", "Class 12", "Accountancy"): [
        (1, "Partnership: Basic Concepts", "ભાગીદારી: મૂળ સંકલ્પનાઓ", "Partnership fundamentals", ["deed", "profit sharing", "interest", "salary"]),
        (2, "Reconstitution: Change in Ratio", "પુનર્ગઠન: ગુણોત્તર ફેરફાર", "Goodwill and revaluation", ["goodwill", "revaluation", "sacrificing ratio"]),
        (3, "Admission of a Partner", "ભાગીદારનો પ્રવેશ", "New partner", ["new ratio", "goodwill", "capital adjustment"]),
        (4, "Retirement/Death of a Partner", "ભાગીદારની નિવૃત્તિ/મૃત્યુ", "Settlement", ["gaining ratio", "revaluation", "executor's account"]),
        (5, "Dissolution of Firm", "ફર્મનું વિસર્જન", "Closing", ["realisation account", "settlement"]),
        (6, "Issue of Shares", "શેરની ફાળવણી", "Share capital", ["issue at par/premium", "forfeiture", "reissue"]),
        (7, "Issue of Debentures", "ડિબેન્ચર ફાળવણી", "Debenture accounting", ["types", "issue", "redemption"]),
        (8, "Financial Statements of Company", "કંપનીના નાણાકીય પત્રકો", "Company accounts", ["balance sheet", "P&L", "Schedule III"]),
        (9, "Ratio Analysis", "ગુણોત્તર વિશ્લેષણ", "Financial ratios", ["liquidity", "profitability", "solvency"]),
        (10, "Cash Flow Statement", "રોકડ પ્રવાહ પત્રક", "Cash flow", ["operating", "investing", "financing"]),
    ],

    # ── Economics ──
    ("GSEB", "Class 12", "Economics"): [
        (1, "National Income", "રાષ્ટ્રીય આવક", "GDP concepts", ["GDP", "GNP", "methods"]),
        (2, "Money and Banking", "નાણાં અને બૅન્કિંગ", "Banking system", ["money supply", "RBI", "credit creation"]),
        (3, "Aggregate Demand and Supply", "એકત્રિત માંગ અને પુરવઠો", "Macroeconomics", ["AD", "AS", "equilibrium", "multiplier"]),
        (4, "Government Budget", "સરકારી બજેટ", "Fiscal policy", ["revenue", "expenditure", "deficit"]),
        (5, "Balance of Payments", "ચુકવણી સંતુલન", "International economics", ["current account", "capital account", "exchange rate"]),
        (6, "Indian Economy — Development", "ભારતીય અર્થતંત્ર — વિકાસ", "Economic development", ["planning", "LPG", "reforms"]),
        (7, "Agriculture and Rural Development", "કૃષિ અને ગ્રામ વિકાસ", "Agricultural issues", ["Green Revolution", "problems", "policies"]),
        (8, "Industry and Trade", "ઉદ્યોગ અને વ્યાપાર", "Industrial growth", ["industrialisation", "MSMEs", "trade policy"]),
    ],
}


# ══════════════════════════════════════════════════════════════════════════════
# COMBINE ALL DATA
# ══════════════════════════════════════════════════════════════════════════════

ALL_CHAPTERS = {}
ALL_CHAPTERS.update(CBSE_CLASS_9)
ALL_CHAPTERS.update(ICSE_CLASS_9)
ALL_CHAPTERS.update(MSBSHSE_CLASS_9)
ALL_CHAPTERS.update(GSEB_CLASS_9)
ALL_CHAPTERS.update(CBSE_CLASS_10)
ALL_CHAPTERS.update(ICSE_CLASS_10)
ALL_CHAPTERS.update(MSBSHSE_CLASS_10)
ALL_CHAPTERS.update(GSEB_CLASS_10)
ALL_CHAPTERS.update(CBSE_CLASS_11)
ALL_CHAPTERS.update(ICSE_CLASS_11)
ALL_CHAPTERS.update(MSBSHSE_CLASS_11)
ALL_CHAPTERS.update(GSEB_CLASS_11)
ALL_CHAPTERS.update(CBSE_CLASS_12)
ALL_CHAPTERS.update(ICSE_CLASS_12)
ALL_CHAPTERS.update(MSBSHSE_CLASS_12)
ALL_CHAPTERS.update(GSEB_CLASS_12)


# ══════════════════════════════════════════════════════════════════════════════
# SEED LOGIC
# ══════════════════════════════════════════════════════════════════════════════

def clean_all_chapters():
    """Delete all existing chapter data."""
    conn = get_db()
    try:
        cur = conn.cursor()
        cur.execute("DELETE FROM chapters")
        count = cur.rowcount
        conn.commit()
        print(f"  Deleted {count} existing chapters")
        return count
    except Exception as e:
        conn.rollback()
        print(f"  Failed to clean chapters: {e}")
        return 0
    finally:
        conn.close()


def seed_chapters():
    """Seed all chapter data."""
    total_created = 0
    total_skipped = 0

    for (board, standard, subject), chapters in ALL_CHAPTERS.items():
        chapter_objects = []
        for ch in chapters:
            num, name_en, name_local, desc, topics = ch
            chapter_objects.append(ChapterCreate(
                board=board,
                standard=standard,
                subject=subject,
                chapter_number=num,
                chapter_name=name_en,
                chapter_name_local=name_local,
                description=desc,
                topics=topics,
                is_active=True,
            ))

        created = ChapterService.bulk_create_chapters(chapter_objects)
        skipped = len(chapters) - created
        total_created += created
        total_skipped += skipped

        status = "+" if created > 0 else "="
        print(f"  [{status}] {board} / {standard} / {subject}: {created} created, {skipped} skipped")

    return total_created, total_skipped


def print_summary():
    """Print summary of chapters in database."""
    conn = get_db()
    try:
        cur = conn.cursor()
        cur.execute("""
            SELECT board, standard, COUNT(*) as chapters, COUNT(DISTINCT subject) as subjects
            FROM chapters
            GROUP BY board, standard
            ORDER BY board, standard
        """)
        rows = cur.fetchall()
        print("\n  -------------------------------------------------------")
        print(f"  {'Board':<10} {'Standard':<12} {'Subjects':<10} {'Chapters':<10}")
        print("  -------------------------------------------------------")
        total = 0
        for row in rows:
            r = dict(row)
            print(f"  {r['board']:<10} {r['standard']:<12} {r['subjects']:<10} {r['chapters']:<10}")
            total += r['chapters']
        print("  -------------------------------------------------------")
        print(f"  {'TOTAL':<10} {'':<12} {'':<10} {total:<10}")
        print("  -------------------------------------------------------")
    finally:
        conn.close()


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Seed chapter data for all boards")
    parser.add_argument("--clean", action="store_true", help="Delete all chapters before seeding")
    args = parser.parse_args()

    print("\n Initializing database...")
    init_db()

    if args.clean:
        print("\n Cleaning existing chapter data...")
        clean_all_chapters()

    print("\n Seeding chapters (Class 9 + 10 + 11 + 12)...")
    created, skipped = seed_chapters()
    print(f"\n  Total: {created} created, {skipped} skipped")

    print_summary()
    print("\n Done!\n")
