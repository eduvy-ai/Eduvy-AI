"""
Seed Chapters for All Subjects - Accurate NCERT/Board Curriculum Data
======================================================================
This script seeds chapters for all subjects across all boards.
Each chapter includes:
- chapter_number, chapter_name
- description: Brief overview with learning outcomes
- topics: Key concepts as JSON array
"""

import os
import json
import sys
from urllib.parse import urlparse, quote, urlunparse
import psycopg2
import psycopg2.extras
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")
if not DATABASE_URL:
    print("ERROR: DATABASE_URL not set in .env"); sys.exit(1)

# Strip SQLAlchemy dialect suffix
if DATABASE_URL.startswith("postgresql+"):
    DATABASE_URL = "postgresql" + DATABASE_URL[DATABASE_URL.index("://"):]

# Auto-encode special chars in password
parsed = urlparse(DATABASE_URL)
if parsed.password:
    encoded_pw = quote(parsed.password, safe="")
    if encoded_pw != parsed.password:
        userinfo = f"{parsed.username}:{encoded_pw}"
        host_part = parsed.hostname or ""
        if parsed.port:
            host_part += f":{parsed.port}"
        netloc = f"{userinfo}@{host_part}"
        DATABASE_URL = urlunparse((
            parsed.scheme, netloc, parsed.path,
            parsed.params, parsed.query, parsed.fragment,
        ))

# ══════════════════════════════════════════════════════════════════════════════
# CBSE CLASS 10 CHAPTERS (NCERT 2024-25)
# ══════════════════════════════════════════════════════════════════════════════

CBSE_CLASS_10_MATHEMATICS = [
    {
        "chapter_number": 1,
        "chapter_name": "Real Numbers",
        "description": "Explores Euclid's Division Lemma, Fundamental Theorem of Arithmetic, and properties of irrational and rational numbers. Key concepts include HCF/LCM using prime factorization and proving irrationality.",
        "topics": [
            "Euclid's Division Lemma and Algorithm",
            "Fundamental Theorem of Arithmetic",
            "Prime Factorization Method",
            "HCF and LCM using Prime Factorization",
            "Proving Irrationality of Numbers",
            "Decimal Expansions of Rational Numbers"
        ]
    },
    {
        "chapter_number": 2,
        "chapter_name": "Polynomials",
        "description": "Studies the relationship between zeros and coefficients of polynomials. Covers division algorithm for polynomials and finding zeros of quadratic and cubic polynomials.",
        "topics": [
            "Zeros of a Polynomial",
            "Relationship between Zeros and Coefficients",
            "Quadratic Polynomials",
            "Division Algorithm for Polynomials",
            "Graphical Representation of Polynomials",
            "Finding Zeros from Graphs"
        ]
    },
    {
        "chapter_number": 3,
        "chapter_name": "Pair of Linear Equations in Two Variables",
        "description": "Methods for solving linear equations: graphical, substitution, elimination, and cross-multiplication. Includes consistency conditions and real-world applications.",
        "topics": [
            "Graphical Method of Solution",
            "Algebraic Methods - Substitution",
            "Algebraic Methods - Elimination",
            "Cross-Multiplication Method",
            "Consistency of Linear Equations",
            "Word Problems on Linear Equations"
        ]
    },
    {
        "chapter_number": 4,
        "chapter_name": "Quadratic Equations",
        "description": "Standard form of quadratic equations, solutions by factorization and quadratic formula. Understanding discriminant and nature of roots with practical applications.",
        "topics": [
            "Standard Form ax² + bx + c = 0",
            "Solution by Factorization",
            "Solution by Completing the Square",
            "Quadratic Formula",
            "Nature of Roots using Discriminant",
            "Applications in Real-Life Problems"
        ]
    },
    {
        "chapter_number": 5,
        "chapter_name": "Arithmetic Progressions",
        "description": "Study of sequences with constant difference. Finding nth term, sum of n terms, and applications in various problem scenarios involving patterns.",
        "topics": [
            "Definition of Arithmetic Progression",
            "Common Difference",
            "nth Term Formula (an = a + (n-1)d)",
            "Sum of n Terms Formula",
            "Finding Missing Terms",
            "Word Problems on AP"
        ]
    },
    {
        "chapter_number": 6,
        "chapter_name": "Triangles",
        "description": "Similarity of triangles, criteria for similarity (AA, SAS, SSS), Basic Proportionality Theorem, and Pythagoras Theorem with proofs and applications.",
        "topics": [
            "Similar Figures and Triangles",
            "Basic Proportionality Theorem (BPT)",
            "Criteria for Similarity (AA, SAS, SSS)",
            "Areas of Similar Triangles",
            "Pythagoras Theorem and Converse",
            "Applications of Similar Triangles"
        ]
    },
    {
        "chapter_number": 7,
        "chapter_name": "Coordinate Geometry",
        "description": "Distance formula, section formula, and area of triangle using coordinates. Finding coordinates of points dividing line segments in given ratios.",
        "topics": [
            "Distance Formula",
            "Section Formula (Internal Division)",
            "Midpoint Formula",
            "Area of Triangle using Coordinates",
            "Collinearity of Points",
            "Centroid of a Triangle"
        ]
    },
    {
        "chapter_number": 8,
        "chapter_name": "Introduction to Trigonometry",
        "description": "Trigonometric ratios for acute angles, values for specific angles (0°, 30°, 45°, 60°, 90°), and fundamental trigonometric identities.",
        "topics": [
            "Trigonometric Ratios (sin, cos, tan, etc.)",
            "Ratios for Specific Angles",
            "Complementary Angles",
            "Trigonometric Identities",
            "sin²θ + cos²θ = 1",
            "Proving Trigonometric Identities"
        ]
    },
    {
        "chapter_number": 9,
        "chapter_name": "Some Applications of Trigonometry",
        "description": "Real-world applications involving heights and distances. Calculating angles of elevation and depression to find heights of buildings, towers, and mountains.",
        "topics": [
            "Line of Sight",
            "Angle of Elevation",
            "Angle of Depression",
            "Heights and Distances Problems",
            "Trigonometric Tables Application",
            "Multi-step Height Problems"
        ]
    },
    {
        "chapter_number": 10,
        "chapter_name": "Circles",
        "description": "Tangent to a circle, number of tangents from external points, and properties. Proves that tangent is perpendicular to radius at point of contact.",
        "topics": [
            "Tangent to a Circle",
            "Tangent from External Point",
            "Length of Tangent",
            "Tangent-Radius Perpendicularity",
            "Two Tangents from External Point",
            "Theorem Proofs on Tangents"
        ]
    },
    {
        "chapter_number": 11,
        "chapter_name": "Areas Related to Circles",
        "description": "Calculating areas and perimeters of circles, sectors, and segments. Finding areas of combinations of plane figures involving circles.",
        "topics": [
            "Perimeter and Area of Circle Review",
            "Area of Sector of a Circle",
            "Area of Segment of a Circle",
            "Areas of Combinations of Figures",
            "Length of Arc",
            "Applications in Design Problems"
        ]
    },
    {
        "chapter_number": 12,
        "chapter_name": "Surface Areas and Volumes",
        "description": "Surface area and volume of combinations of solids. Converting one solid into another and frustum of a cone calculations.",
        "topics": [
            "Combination of Solids",
            "Surface Area of Combined Shapes",
            "Volume of Combined Shapes",
            "Conversion of Solids",
            "Frustum of a Cone",
            "Real-Life Application Problems"
        ]
    },
    {
        "chapter_number": 13,
        "chapter_name": "Statistics",
        "description": "Mean, median, and mode of grouped data. Graphical representation using ogives and finding median graphically.",
        "topics": [
            "Mean of Grouped Data",
            "Direct Method for Mean",
            "Assumed Mean Method",
            "Step Deviation Method",
            "Median of Grouped Data",
            "Mode of Grouped Data",
            "Ogive (Cumulative Frequency Curve)"
        ]
    },
    {
        "chapter_number": 14,
        "chapter_name": "Probability",
        "description": "Theoretical probability, complementary events, and impossible/certain events. Classical definition and solving probability problems.",
        "topics": [
            "Classical Definition of Probability",
            "Theoretical Probability",
            "Complementary Events P(A) + P(A') = 1",
            "Impossible and Certain Events",
            "Elementary Events",
            "Probability Problems with Cards, Dice, Coins"
        ]
    }
]

CBSE_CLASS_10_SCIENCE = [
    {
        "chapter_number": 1,
        "chapter_name": "Chemical Reactions and Equations",
        "description": "Introduction to chemical reactions, writing and balancing equations. Types of reactions including combination, decomposition, displacement, and redox reactions.",
        "topics": [
            "Chemical Equations and Symbols",
            "Balancing Chemical Equations",
            "Types of Chemical Reactions",
            "Combination Reactions",
            "Decomposition Reactions",
            "Displacement and Double Displacement",
            "Oxidation and Reduction (Redox)",
            "Effects of Oxidation in Daily Life"
        ]
    },
    {
        "chapter_number": 2,
        "chapter_name": "Acids, Bases and Salts",
        "description": "Properties of acids and bases, pH scale, and importance of pH in everyday life. Formation and properties of salts, including common salt.",
        "topics": [
            "Properties of Acids and Bases",
            "Chemical Properties of Acids",
            "Chemical Properties of Bases",
            "Indicators - Litmus, Phenolphthalein",
            "pH Scale and its Importance",
            "Neutralization Reaction",
            "Salts and Their Properties",
            "Preparation of Sodium Compounds"
        ]
    },
    {
        "chapter_number": 3,
        "chapter_name": "Metals and Non-metals",
        "description": "Physical and chemical properties of metals and non-metals. Reactivity series, extraction of metals, and corrosion prevention.",
        "topics": [
            "Physical Properties of Metals",
            "Chemical Properties of Metals",
            "Reactivity Series",
            "Ionic Compounds and Properties",
            "Occurrence of Metals",
            "Extraction and Refining of Metals",
            "Corrosion and Its Prevention",
            "Alloys and Their Uses"
        ]
    },
    {
        "chapter_number": 4,
        "chapter_name": "Carbon and its Compounds",
        "description": "Covalent bonding in carbon compounds, versatile nature of carbon. Homologous series, nomenclature, and important carbon compounds.",
        "topics": [
            "Bonding in Carbon - Covalent Bond",
            "Versatile Nature of Carbon",
            "Saturated and Unsaturated Hydrocarbons",
            "Homologous Series",
            "IUPAC Nomenclature",
            "Chemical Properties of Carbon Compounds",
            "Ethanol and Ethanoic Acid",
            "Soaps and Detergents"
        ]
    },
    {
        "chapter_number": 5,
        "chapter_name": "Life Processes",
        "description": "Essential life processes: nutrition, respiration, transportation, and excretion. Comparison between autotrophic and heterotrophic nutrition.",
        "topics": [
            "Nutrition in Organisms",
            "Autotrophic Nutrition - Photosynthesis",
            "Heterotrophic Nutrition",
            "Human Digestive System",
            "Respiration and Types",
            "Human Respiratory System",
            "Transportation in Humans - Heart, Blood",
            "Excretion in Humans - Kidneys"
        ]
    },
    {
        "chapter_number": 6,
        "chapter_name": "Control and Coordination",
        "description": "Nervous system and endocrine system in animals. Coordination in plants through hormones. Reflex actions and voluntary actions.",
        "topics": [
            "Nervous System Components",
            "Reflex Action and Reflex Arc",
            "Human Brain Structure and Functions",
            "Coordination in Plants",
            "Plant Hormones (Auxin, Gibberellin)",
            "Hormones in Animals",
            "Endocrine Glands and Functions",
            "Feedback Mechanisms"
        ]
    },
    {
        "chapter_number": 7,
        "chapter_name": "How do Organisms Reproduce?",
        "description": "Reproduction as a life process. Asexual and sexual reproduction methods. Human reproductive system and reproductive health.",
        "topics": [
            "Importance of Reproduction",
            "Asexual Reproduction Modes",
            "Sexual Reproduction in Plants",
            "Pollination and Fertilization",
            "Human Reproductive System - Male",
            "Human Reproductive System - Female",
            "Menstrual Cycle",
            "Reproductive Health and Contraception"
        ]
    },
    {
        "chapter_number": 8,
        "chapter_name": "Heredity and Evolution",
        "description": "Mendel's laws of inheritance, genes and chromosomes. Evolution theories, evidence for evolution, and speciation.",
        "topics": [
            "Heredity and Variation",
            "Mendel's Experiments with Pea Plants",
            "Laws of Inheritance",
            "Sex Determination in Humans",
            "Evolution and Natural Selection",
            "Acquired and Inherited Traits",
            "Speciation",
            "Evolution and Classification"
        ]
    },
    {
        "chapter_number": 9,
        "chapter_name": "Light - Reflection and Refraction",
        "description": "Laws of reflection and refraction. Image formation by mirrors and lenses. Mirror and lens formulas with applications.",
        "topics": [
            "Nature and Properties of Light",
            "Laws of Reflection",
            "Spherical Mirrors - Concave and Convex",
            "Image Formation by Spherical Mirrors",
            "Mirror Formula and Magnification",
            "Refraction of Light",
            "Refractive Index",
            "Lenses and Image Formation",
            "Lens Formula and Power of Lens"
        ]
    },
    {
        "chapter_number": 10,
        "chapter_name": "The Human Eye and Colourful World",
        "description": "Structure of human eye and its defects. Atmospheric refraction, scattering of light, and formation of rainbow.",
        "topics": [
            "Human Eye Structure and Function",
            "Power of Accommodation",
            "Defects of Vision - Myopia, Hypermetropia",
            "Correction of Vision Defects",
            "Refraction through Prism",
            "Dispersion of White Light",
            "Atmospheric Refraction",
            "Scattering of Light - Tyndall Effect"
        ]
    },
    {
        "chapter_number": 11,
        "chapter_name": "Electricity",
        "description": "Electric current, potential difference, and Ohm's law. Resistors in series and parallel. Heating effect of electric current.",
        "topics": [
            "Electric Current and Circuit",
            "Electric Potential and Potential Difference",
            "Ohm's Law",
            "Resistance and Factors Affecting It",
            "Resistors in Series and Parallel",
            "Heating Effect of Electric Current",
            "Electric Power and Energy",
            "Practical Applications"
        ]
    },
    {
        "chapter_number": 12,
        "chapter_name": "Magnetic Effects of Electric Current",
        "description": "Magnetic field due to current-carrying conductor. Electromagnets, electric motor, and electromagnetic induction.",
        "topics": [
            "Magnetic Field and Field Lines",
            "Magnetic Field due to Current",
            "Right-Hand Thumb Rule",
            "Force on Current-Carrying Conductor",
            "Electric Motor - Principle and Working",
            "Electromagnetic Induction",
            "Electric Generator",
            "Domestic Electric Circuits"
        ]
    },
    {
        "chapter_number": 13,
        "chapter_name": "Our Environment",
        "description": "Ecosystem components and their interactions. Food chains, food webs, and flow of energy. Environmental problems and solutions.",
        "topics": [
            "Ecosystem and Its Components",
            "Producers, Consumers, Decomposers",
            "Food Chains and Food Webs",
            "Ten Percent Law of Energy Transfer",
            "Biological Magnification",
            "Ozone Layer and Its Depletion",
            "Waste Management",
            "Biodegradable and Non-biodegradable Waste"
        ]
    }
]

CBSE_CLASS_10_SOCIAL_SCIENCE = [
    # History
    {
        "chapter_number": 1,
        "chapter_name": "The Rise of Nationalism in Europe",
        "description": "Growth of nationalism in Europe, unification of Germany and Italy. Role of culture, language, and symbols in nation-building.",
        "topics": [
            "French Revolution and Nationalism",
            "Making of Nationalism in Europe",
            "Age of Revolutions (1830-1848)",
            "Unification of Germany",
            "Unification of Italy",
            "Visualizing the Nation",
            "Nationalism and Imperialism"
        ]
    },
    {
        "chapter_number": 2,
        "chapter_name": "Nationalism in India",
        "description": "Indian National Movement from Non-Cooperation to Civil Disobedience. Role of Gandhi, mass participation, and sense of collective belonging.",
        "topics": [
            "First World War and Indian Nationalism",
            "Rowlatt Act and Jallianwala Bagh",
            "Non-Cooperation Movement",
            "Civil Disobedience Movement",
            "Salt March (Dandi March)",
            "Sense of Collective Belonging",
            "Different Strands of Nationalism"
        ]
    },
    {
        "chapter_number": 3,
        "chapter_name": "The Making of a Global World",
        "description": "Global economic connections through trade, migration, and technology. Pre-modern world to post-WWII international economic order.",
        "topics": [
            "Pre-Modern World Trade",
            "Silk Routes and Trade Networks",
            "Conquest, Disease and Trade",
            "Industrial Revolution and Trade",
            "Late 19th Century Colonialism",
            "Inter-War Economy",
            "Post-War International Order",
            "Bretton Woods System"
        ]
    },
    {
        "chapter_number": 4,
        "chapter_name": "The Age of Industrialisation",
        "description": "Industrial Revolution in Britain and its impact on India. Hand technology and steam power, transformation of industries.",
        "topics": [
            "Before the Industrial Revolution",
            "Hand Labour and Steam Power",
            "Factories Come Up in England",
            "Industrial Change in Britain",
            "Industrialisation in the Colonies",
            "Factory Workers in India",
            "Small-Scale Industries Peculiarities",
            "Market for Goods"
        ]
    },
    {
        "chapter_number": 5,
        "chapter_name": "Print Culture and the Modern World",
        "description": "Development of print from East Asia to Europe. Impact of print revolution on society, politics, and culture.",
        "topics": [
            "Print in East Asia",
            "Print Comes to Europe",
            "Gutenberg and Printing Press",
            "Print Revolution Effects",
            "Reading Mania in Europe",
            "Print and Censorship",
            "India and Print Culture",
            "Print and Social Reform"
        ]
    },
    # Geography
    {
        "chapter_number": 6,
        "chapter_name": "Resources and Development",
        "description": "Classification of resources, development and conservation. Land resources, soil types, and soil conservation methods.",
        "topics": [
            "Types of Resources",
            "Resource Planning in India",
            "Land Resources",
            "Land Use Pattern in India",
            "Land Degradation and Conservation",
            "Soil as a Resource",
            "Classification of Soils",
            "Soil Erosion and Conservation"
        ]
    },
    {
        "chapter_number": 7,
        "chapter_name": "Forest and Wildlife Resources",
        "description": "Flora and fauna of India, their conservation. Types of forests, causes of depletion, and conservation efforts.",
        "topics": [
            "Flora and Fauna in India",
            "Biodiversity and Conservation",
            "IUCN Classification of Species",
            "Factors Causing Depletion",
            "Indian Wildlife Act 1972",
            "Types of Forests",
            "Conservation Projects",
            "Community Conservation"
        ]
    },
    {
        "chapter_number": 8,
        "chapter_name": "Water Resources",
        "description": "Water scarcity, need for conservation and management. Dams, rainwater harvesting, and sustainable water management.",
        "topics": [
            "Water Scarcity and Need for Conservation",
            "Multi-Purpose River Projects",
            "Dams - Advantages and Issues",
            "Rainwater Harvesting",
            "Traditional Water Harvesting Systems",
            "Modern Water Management",
            "Groundwater Conservation",
            "Sustainable Water Development"
        ]
    },
    {
        "chapter_number": 9,
        "chapter_name": "Agriculture",
        "description": "Types of farming, major crops, and agricultural development. Food security, technological reforms, and organic farming.",
        "topics": [
            "Types of Farming",
            "Cropping Pattern",
            "Major Crops - Food Grains",
            "Cash Crops and Plantation",
            "Technological and Institutional Reforms",
            "Green Revolution Impact",
            "Food Security",
            "Agricultural Development"
        ]
    },
    {
        "chapter_number": 10,
        "chapter_name": "Minerals and Energy Resources",
        "description": "Types of minerals, their distribution. Conventional and non-conventional energy sources, conservation needs.",
        "topics": [
            "Mode of Occurrence of Minerals",
            "Ferrous and Non-Ferrous Minerals",
            "Non-Metallic Minerals",
            "Distribution of Minerals in India",
            "Conservation of Minerals",
            "Energy Resources - Conventional",
            "Non-Conventional Energy Sources",
            "Conservation of Energy Resources"
        ]
    },
    {
        "chapter_number": 11,
        "chapter_name": "Manufacturing Industries",
        "description": "Importance of manufacturing, industrial location factors. Major industries, pollution, and sustainable development.",
        "topics": [
            "Importance of Manufacturing",
            "Industrial Location Factors",
            "Agro-Based Industries",
            "Mineral-Based Industries",
            "Iron and Steel Industry",
            "Textile Industry",
            "Industrial Pollution",
            "National Manufacturing Policy"
        ]
    },
    {
        "chapter_number": 12,
        "chapter_name": "Lifelines of National Economy",
        "description": "Transport, communication, and trade. Different modes of transport, international trade, and tourism.",
        "topics": [
            "Roadways - Types and Distribution",
            "Railways - Network and Importance",
            "Waterways - Inland and Ocean",
            "Airways and Pipelines",
            "Communication Systems",
            "International Trade",
            "Tourism as Trade",
            "Ports and Trade Centres"
        ]
    },
    # Civics (Political Science)
    {
        "chapter_number": 13,
        "chapter_name": "Power Sharing",
        "description": "Need for power sharing in democracies. Forms of power sharing: horizontal, vertical, and among social groups.",
        "topics": [
            "Belgium and Sri Lanka Stories",
            "Majoritarianism in Sri Lanka",
            "Accommodation in Belgium",
            "Why Power Sharing is Desirable",
            "Forms of Power Sharing",
            "Horizontal Distribution of Power",
            "Vertical Division of Power",
            "Power Sharing Among Social Groups"
        ]
    },
    {
        "chapter_number": 14,
        "chapter_name": "Federalism",
        "description": "Features of federalism, Indian federal system. Division of powers, language policy, and local governments.",
        "topics": [
            "What is Federalism",
            "Features of Federalism",
            "Union, State, Concurrent Lists",
            "How Federalism is Practiced",
            "Linguistic States in India",
            "Language Policy",
            "Centre-State Relations",
            "Decentralisation and Local Governments"
        ]
    },
    {
        "chapter_number": 15,
        "chapter_name": "Gender, Religion and Caste",
        "description": "Social divisions based on gender, religion, and caste. Their role in politics and challenges for democracy.",
        "topics": [
            "Gender and Politics",
            "Women's Political Representation",
            "Religion, Communalism and Politics",
            "Caste System in India",
            "Caste in Politics",
            "Politics in Caste",
            "Social Divisions and Democracy",
            "Secularism in Practice"
        ]
    },
    {
        "chapter_number": 16,
        "chapter_name": "Political Parties",
        "description": "Functions and types of political parties. National and regional parties in India, challenges and reforms.",
        "topics": [
            "Why Do We Need Political Parties",
            "Functions of Political Parties",
            "Types of Political Parties",
            "National Political Parties",
            "State/Regional Parties",
            "Challenges to Political Parties",
            "Electoral Reforms",
            "Role of Opposition"
        ]
    },
    {
        "chapter_number": 17,
        "chapter_name": "Outcomes of Democracy",
        "description": "Evaluating democracy: accountability, responsiveness, equality. Democratic governments and their outcomes.",
        "topics": [
            "How to Assess Democracy",
            "Accountable and Responsive Government",
            "Economic Growth and Development",
            "Reduction of Inequality",
            "Accommodation of Social Diversity",
            "Dignity and Freedom of Citizens",
            "Legitimate Government",
            "Challenges to Democracy"
        ]
    },
    # Economics
    {
        "chapter_number": 18,
        "chapter_name": "Development",
        "description": "Different perspectives on development. Income and other criteria for development, sustainable development.",
        "topics": [
            "What Development Promises",
            "Different Goals of Different People",
            "Income and Other Criteria",
            "National Development",
            "Per Capita Income Comparisons",
            "Public Facilities and Development",
            "Human Development Index",
            "Sustainable Development"
        ]
    },
    {
        "chapter_number": 19,
        "chapter_name": "Sectors of the Indian Economy",
        "description": "Primary, secondary, and tertiary sectors. Organized and unorganized sectors, employment patterns.",
        "topics": [
            "Primary Sector Activities",
            "Secondary Sector Activities",
            "Tertiary Sector Activities",
            "Comparing the Three Sectors",
            "Organised and Unorganised Sectors",
            "Public and Private Sectors",
            "Employment Challenges",
            "NREGA and Employment"
        ]
    },
    {
        "chapter_number": 20,
        "chapter_name": "Money and Credit",
        "description": "Role of money in an economy. Formal and informal credit, banking system, and self-help groups.",
        "topics": [
            "Money as Medium of Exchange",
            "Modern Forms of Money",
            "Banking System",
            "Loan Activities of Banks",
            "Two Different Credit Situations",
            "Formal and Informal Credit",
            "Self-Help Groups (SHGs)",
            "Credit and Development"
        ]
    },
    {
        "chapter_number": 21,
        "chapter_name": "Globalisation and the Indian Economy",
        "description": "Meaning and process of globalization. Role of MNCs, trade liberalization, and impact on Indian economy.",
        "topics": [
            "Production Across Countries",
            "Multinational Corporations (MNCs)",
            "Foreign Investment",
            "Foreign Trade and Integration",
            "Liberalisation Policies",
            "WTO and Trade Agreements",
            "Impact on Indian Economy",
            "Fair Globalisation"
        ]
    },
    {
        "chapter_number": 22,
        "chapter_name": "Consumer Rights",
        "description": "Consumer awareness and protection. Consumer rights, responsibilities, and redressal mechanisms.",
        "topics": [
            "Consumer in the Marketplace",
            "Consumer Rights",
            "Right to Information",
            "Consumer Protection Act",
            "Consumer Courts and Redressal",
            "Three-Tier System",
            "Consumer Responsibilities",
            "Consumer Awareness"
        ]
    }
]

# ══════════════════════════════════════════════════════════════════════════════
# CBSE CLASS 9 CHAPTERS (NCERT 2024-25)
# ══════════════════════════════════════════════════════════════════════════════

CBSE_CLASS_9_MATHEMATICS = [
    {
        "chapter_number": 1,
        "chapter_name": "Number Systems",
        "description": "Review of rational and irrational numbers, representation on number line. Real numbers, operations, and laws of exponents.",
        "topics": [
            "Rational Numbers Review",
            "Irrational Numbers",
            "Real Numbers",
            "Representation on Number Line",
            "Operations on Real Numbers",
            "Laws of Exponents for Real Numbers",
            "Rationalizing the Denominator"
        ]
    },
    {
        "chapter_number": 2,
        "chapter_name": "Polynomials",
        "description": "Definition and examples of polynomials. Zeros of polynomials, Remainder Theorem, and Factor Theorem.",
        "topics": [
            "Definition of Polynomial",
            "Coefficient, Terms, Degree",
            "Types of Polynomials",
            "Value and Zeros of Polynomials",
            "Remainder Theorem",
            "Factor Theorem",
            "Factorization of Polynomials",
            "Algebraic Identities"
        ]
    },
    {
        "chapter_number": 3,
        "chapter_name": "Coordinate Geometry",
        "description": "Cartesian coordinate system, plotting points on the plane. Quadrants and coordinates of a point.",
        "topics": [
            "Cartesian System",
            "Coordinate Axes and Quadrants",
            "Plotting Points on Plane",
            "Coordinates of a Point",
            "Abscissa and Ordinate",
            "Distance from Axes",
            "Graph Plotting"
        ]
    },
    {
        "chapter_number": 4,
        "chapter_name": "Linear Equations in Two Variables",
        "description": "Solutions of linear equations, graph of linear equations. Equations of lines parallel to axes.",
        "topics": [
            "Linear Equations Introduction",
            "Solutions of Linear Equation",
            "Graph of Linear Equation",
            "Equations of Lines Parallel to Axes",
            "Two-Variable Equations",
            "Finding Solutions",
            "Graphical Representation"
        ]
    },
    {
        "chapter_number": 5,
        "chapter_name": "Introduction to Euclid's Geometry",
        "description": "Euclid's definitions, axioms, and postulates. Equivalent versions of Euclid's fifth postulate.",
        "topics": [
            "Euclid's Definitions",
            "Euclid's Axioms",
            "Euclid's Five Postulates",
            "Equivalent Versions of Fifth Postulate",
            "Euclidean Geometry",
            "Non-Euclidean Geometries"
        ]
    },
    {
        "chapter_number": 6,
        "chapter_name": "Lines and Angles",
        "description": "Pairs of angles, transversal and parallel lines. Angle sum property of a triangle.",
        "topics": [
            "Basic Terms and Definitions",
            "Pairs of Angles",
            "Transversal and Parallel Lines",
            "Lines Parallel to Same Line",
            "Angle Sum Property of Triangle",
            "Exterior Angle Property"
        ]
    },
    {
        "chapter_number": 7,
        "chapter_name": "Triangles",
        "description": "Congruence of triangles, criteria for congruence. Properties of isosceles triangles, inequalities in triangles.",
        "topics": [
            "Congruence of Triangles",
            "Criteria for Congruence (SAS, ASA, AAS, SSS, RHS)",
            "Properties of Isosceles Triangle",
            "Some Properties of Triangles",
            "Inequalities in Triangles",
            "Triangle Inequality Theorem"
        ]
    },
    {
        "chapter_number": 8,
        "chapter_name": "Quadrilaterals",
        "description": "Properties of parallelograms, mid-point theorem. Different types of quadrilaterals and their properties.",
        "topics": [
            "Angle Sum Property of Quadrilateral",
            "Types of Quadrilaterals",
            "Properties of Parallelogram",
            "Conditions for a Quadrilateral to be Parallelogram",
            "Mid-Point Theorem",
            "Converse of Mid-Point Theorem"
        ]
    },
    {
        "chapter_number": 9,
        "chapter_name": "Circles",
        "description": "Circles, equal chords, chord from center, arc, cyclic quadrilaterals. Angle subtended by chord at a point.",
        "topics": [
            "Circles and Related Terms",
            "Angle Subtended by Chord at Centre",
            "Perpendicular from Centre to Chord",
            "Equal Chords and Their Distances",
            "Angle Subtended by Arc",
            "Cyclic Quadrilaterals"
        ]
    },
    {
        "chapter_number": 10,
        "chapter_name": "Heron's Formula",
        "description": "Area of triangle using Heron's formula. Application to quadrilaterals by dividing into triangles.",
        "topics": [
            "Area of Triangle by Heron's Formula",
            "Semi-Perimeter Concept",
            "Application to Quadrilaterals",
            "Application to Polygons",
            "Real-Life Problems"
        ]
    },
    {
        "chapter_number": 11,
        "chapter_name": "Surface Areas and Volumes",
        "description": "Surface areas and volumes of cubes, cuboids, cylinders, cones, and spheres.",
        "topics": [
            "Surface Area of Cuboid and Cube",
            "Surface Area of Right Circular Cylinder",
            "Surface Area of Right Circular Cone",
            "Surface Area of Sphere",
            "Volume of Cuboid",
            "Volume of Cylinder",
            "Volume of Right Circular Cone",
            "Volume of Sphere"
        ]
    },
    {
        "chapter_number": 12,
        "chapter_name": "Statistics",
        "description": "Collection, presentation, and graphical representation of data. Mean, median, and mode of ungrouped data.",
        "topics": [
            "Collection of Data",
            "Presentation of Data",
            "Graphical Representation - Bar Graphs",
            "Histograms and Frequency Polygons",
            "Mean of Data",
            "Median of Data",
            "Mode of Data"
        ]
    },
    {
        "chapter_number": 13,
        "chapter_name": "Probability",
        "description": "Empirical probability based on experiments. Probability of an event, simple problems.",
        "topics": [
            "Probability - An Experimental Approach",
            "Random Experiment",
            "Events and Outcomes",
            "Empirical Probability",
            "Probability from Data",
            "Simple Probability Problems"
        ]
    }
]

CBSE_CLASS_9_SCIENCE = [
    {
        "chapter_number": 1,
        "chapter_name": "Matter in Our Surroundings",
        "description": "Physical nature of matter, characteristics of particles. States of matter, interconversion, and factors affecting states.",
        "topics": [
            "Physical Nature of Matter",
            "Characteristics of Particles",
            "States of Matter - Solid, Liquid, Gas",
            "Melting and Boiling Points",
            "Change of State",
            "Evaporation and Factors Affecting It",
            "Effect of Pressure and Temperature"
        ]
    },
    {
        "chapter_number": 2,
        "chapter_name": "Is Matter Around Us Pure?",
        "description": "Mixtures, solutions, suspensions, and colloids. Separation techniques and types of pure substances.",
        "topics": [
            "Pure Substances and Mixtures",
            "Types of Mixtures",
            "Solutions - Solute and Solvent",
            "Concentration of Solutions",
            "Suspensions and Colloids",
            "Separation Techniques",
            "Physical and Chemical Changes",
            "Elements, Compounds, Mixtures"
        ]
    },
    {
        "chapter_number": 3,
        "chapter_name": "Atoms and Molecules",
        "description": "Laws of chemical combination, atomic and molecular masses. Mole concept and chemical formulae.",
        "topics": [
            "Laws of Chemical Combination",
            "Dalton's Atomic Theory",
            "Atom and Its Size",
            "Atomic and Mass Number",
            "Molecule and Ion",
            "Chemical Formulae",
            "Molecular Mass",
            "Mole Concept and Molar Mass"
        ]
    },
    {
        "chapter_number": 4,
        "chapter_name": "Structure of the Atom",
        "description": "Discovery of subatomic particles, atomic models. Distribution of electrons, valency, and isotopes.",
        "topics": [
            "Charged Particles in Matter",
            "Discovery of Electrons, Protons, Neutrons",
            "Thomson's Model of Atom",
            "Rutherford's Model",
            "Bohr's Model of Atom",
            "Distribution of Electrons in Shells",
            "Valency and Atomic Number",
            "Isotopes and Isobars"
        ]
    },
    {
        "chapter_number": 5,
        "chapter_name": "The Fundamental Unit of Life",
        "description": "Cell theory, prokaryotic and eukaryotic cells. Cell organelles, their structure and functions.",
        "topics": [
            "Discovery of Cell",
            "Cell Theory",
            "Structural Organization of Cell",
            "Prokaryotic and Eukaryotic Cells",
            "Cell Membrane - Plasma Membrane",
            "Cell Wall",
            "Nucleus and Cytoplasm",
            "Cell Organelles and Functions"
        ]
    },
    {
        "chapter_number": 6,
        "chapter_name": "Tissues",
        "description": "Plant and animal tissues, their types and functions. Meristematic and permanent tissues.",
        "topics": [
            "Plant Tissues - Meristematic",
            "Permanent Tissues - Simple",
            "Permanent Tissues - Complex",
            "Animal Tissues - Epithelial",
            "Connective Tissues",
            "Muscular Tissues",
            "Nervous Tissues",
            "Tissue Functions"
        ]
    },
    {
        "chapter_number": 7,
        "chapter_name": "Motion",
        "description": "Distance and displacement, velocity and acceleration. Graphical representation, equations of motion.",
        "topics": [
            "Describing Motion",
            "Distance and Displacement",
            "Uniform and Non-Uniform Motion",
            "Speed and Velocity",
            "Rate of Change of Velocity - Acceleration",
            "Graphical Representation of Motion",
            "Equations of Motion",
            "Circular Motion"
        ]
    },
    {
        "chapter_number": 8,
        "chapter_name": "Force and Laws of Motion",
        "description": "Newton's three laws of motion, inertia, momentum. Conservation of momentum and applications.",
        "topics": [
            "Balanced and Unbalanced Forces",
            "First Law of Motion - Inertia",
            "Inertia and Mass",
            "Second Law of Motion",
            "Momentum and Its Conservation",
            "Third Law of Motion",
            "Action and Reaction Forces",
            "Applications of Laws"
        ]
    },
    {
        "chapter_number": 9,
        "chapter_name": "Gravitation",
        "description": "Universal law of gravitation, free fall and weight. Mass vs weight, thrust and pressure, Archimedes' principle.",
        "topics": [
            "Gravitation - Universal Law",
            "Gravitational Constant G",
            "Free Fall",
            "Mass and Weight",
            "Weight on Moon vs Earth",
            "Thrust and Pressure",
            "Buoyancy and Archimedes' Principle",
            "Relative Density"
        ]
    },
    {
        "chapter_number": 10,
        "chapter_name": "Work and Energy",
        "description": "Scientific concept of work, energy, and power. Law of conservation of energy, commercial unit of energy.",
        "topics": [
            "Work - Scientific Definition",
            "Work Done by Constant Force",
            "Energy and Its Forms",
            "Kinetic Energy",
            "Potential Energy",
            "Law of Conservation of Energy",
            "Power and Watt",
            "Commercial Unit of Energy"
        ]
    },
    {
        "chapter_number": 11,
        "chapter_name": "Sound",
        "description": "Production and propagation of sound. Characteristics of sound, echo, and applications of ultrasound.",
        "topics": [
            "Production of Sound",
            "Propagation of Sound",
            "Sound Needs a Medium",
            "Sound is a Longitudinal Wave",
            "Characteristics of Sound Wave",
            "Speed of Sound",
            "Reflection of Sound - Echo",
            "Applications of Ultrasound"
        ]
    },
    {
        "chapter_number": 12,
        "chapter_name": "Improvement in Food Resources",
        "description": "Improvement in crop yields, animal husbandry. Sustainable farming practices and food production.",
        "topics": [
            "Improvement in Crop Yields",
            "Crop Variety Improvement",
            "Crop Production Management",
            "Nutrient Management",
            "Irrigation and Cropping Patterns",
            "Crop Protection Management",
            "Animal Husbandry",
            "Cattle, Poultry, Fish Farming"
        ]
    }
]

# ══════════════════════════════════════════════════════════════════════════════
# CBSE CLASS 11 PHYSICS (SCIENCE STREAM)
# ══════════════════════════════════════════════════════════════════════════════

CBSE_CLASS_11_PHYSICS = [
    {
        "chapter_number": 1,
        "chapter_name": "Physical World",
        "description": "Nature of physics, scope of physics, physics in relation to technology and society. Scientific method and fundamental forces.",
        "topics": [
            "What is Physics",
            "Scope and Excitement of Physics",
            "Physics, Technology and Society",
            "Fundamental Forces in Nature",
            "Nature of Physical Laws",
            "Scientific Method"
        ]
    },
    {
        "chapter_number": 2,
        "chapter_name": "Units and Measurements",
        "description": "SI units, significant figures, dimensional analysis. Measurement of length, mass, time with accuracy and precision.",
        "topics": [
            "Need for Measurement",
            "Units of Measurement",
            "SI System of Units",
            "Significant Figures",
            "Dimensional Analysis",
            "Errors in Measurement",
            "Accuracy and Precision"
        ]
    },
    {
        "chapter_number": 3,
        "chapter_name": "Motion in a Straight Line",
        "description": "Position, path length, displacement. Uniform and non-uniform motion, kinematic equations, relative velocity.",
        "topics": [
            "Position, Path Length, Displacement",
            "Average and Instantaneous Velocity",
            "Acceleration",
            "Kinematic Equations",
            "Motion Under Gravity",
            "Relative Velocity",
            "Motion Graphs"
        ]
    },
    {
        "chapter_number": 4,
        "chapter_name": "Motion in a Plane",
        "description": "Scalars and vectors, vector operations. Projectile motion and uniform circular motion.",
        "topics": [
            "Scalars and Vectors",
            "Vector Addition - Triangle and Parallelogram Law",
            "Resolution of Vectors",
            "Motion in a Plane",
            "Projectile Motion",
            "Uniform Circular Motion",
            "Centripetal Acceleration"
        ]
    },
    {
        "chapter_number": 5,
        "chapter_name": "Laws of Motion",
        "description": "Newton's laws of motion, inertia, momentum, force. Conservation of momentum, equilibrium, friction.",
        "topics": [
            "Aristotle's Fallacy",
            "Newton's First Law and Inertia",
            "Newton's Second Law and Momentum",
            "Newton's Third Law",
            "Conservation of Momentum",
            "Equilibrium of a Particle",
            "Friction - Static and Kinetic",
            "Circular Motion Dynamics"
        ]
    },
    {
        "chapter_number": 6,
        "chapter_name": "Work, Energy and Power",
        "description": "Work-energy theorem, kinetic and potential energy. Conservation of mechanical energy, power and collisions.",
        "topics": [
            "Work Done by Constant and Variable Force",
            "Kinetic Energy and Work-Energy Theorem",
            "Potential Energy",
            "Conservation of Mechanical Energy",
            "Power",
            "Collisions - Elastic and Inelastic",
            "Collision in One and Two Dimensions"
        ]
    },
    {
        "chapter_number": 7,
        "chapter_name": "System of Particles and Rotational Motion",
        "description": "Centre of mass, linear momentum of system. Rotational motion, torque, angular momentum, moment of inertia.",
        "topics": [
            "Centre of Mass",
            "Motion of Centre of Mass",
            "Linear Momentum of a System",
            "Torque and Angular Momentum",
            "Equilibrium of a Rigid Body",
            "Moment of Inertia",
            "Theorems of Parallel and Perpendicular Axes",
            "Rolling Motion"
        ]
    },
    {
        "chapter_number": 8,
        "chapter_name": "Gravitation",
        "description": "Kepler's laws, universal law of gravitation. Gravitational potential energy, escape velocity, satellites.",
        "topics": [
            "Kepler's Laws of Planetary Motion",
            "Universal Law of Gravitation",
            "Acceleration due to Gravity",
            "Gravitational Potential Energy",
            "Escape Velocity",
            "Earth Satellites",
            "Geostationary and Polar Satellites",
            "Weightlessness"
        ]
    },
    {
        "chapter_number": 9,
        "chapter_name": "Mechanical Properties of Solids",
        "description": "Stress and strain, Hooke's law, elastic moduli. Applications of elastic behavior of materials.",
        "topics": [
            "Elastic Behaviour of Solids",
            "Stress and Strain",
            "Hooke's Law",
            "Stress-Strain Curve",
            "Elastic Moduli - Young's, Bulk, Shear",
            "Poisson's Ratio",
            "Applications of Elasticity"
        ]
    },
    {
        "chapter_number": 10,
        "chapter_name": "Mechanical Properties of Fluids",
        "description": "Pressure in fluids, Pascal's law, Bernoulli's principle. Viscosity, surface tension, capillarity.",
        "topics": [
            "Pressure in Fluids",
            "Pascal's Law and Applications",
            "Streamline and Turbulent Flow",
            "Bernoulli's Principle",
            "Viscosity and Stokes' Law",
            "Surface Tension",
            "Surface Energy",
            "Capillarity"
        ]
    },
    {
        "chapter_number": 11,
        "chapter_name": "Thermal Properties of Matter",
        "description": "Temperature scales, thermal expansion. Heat capacity, calorimetry, change of state, heat transfer.",
        "topics": [
            "Temperature and Heat",
            "Measurement of Temperature",
            "Thermal Expansion",
            "Specific Heat Capacity",
            "Calorimetry",
            "Change of State",
            "Heat Transfer - Conduction, Convection, Radiation",
            "Newton's Law of Cooling"
        ]
    },
    {
        "chapter_number": 12,
        "chapter_name": "Thermodynamics",
        "description": "Thermal equilibrium, zeroth law, heat, work. First and second laws of thermodynamics, heat engines, refrigerators.",
        "topics": [
            "Thermal Equilibrium",
            "Zeroth Law of Thermodynamics",
            "Heat, Work and Internal Energy",
            "First Law of Thermodynamics",
            "Thermodynamic Processes",
            "Second Law of Thermodynamics",
            "Heat Engines",
            "Refrigerators and Heat Pumps"
        ]
    },
    {
        "chapter_number": 13,
        "chapter_name": "Kinetic Theory",
        "description": "Kinetic theory of gases, gas laws. Mean free path, law of equipartition of energy, specific heats.",
        "topics": [
            "Molecular Nature of Matter",
            "Kinetic Theory of an Ideal Gas",
            "Pressure of an Ideal Gas",
            "Kinetic Interpretation of Temperature",
            "Law of Equipartition of Energy",
            "Specific Heat Capacities of Gases",
            "Mean Free Path"
        ]
    },
    {
        "chapter_number": 14,
        "chapter_name": "Oscillations",
        "description": "Periodic and oscillatory motion, SHM. Energy in SHM, simple pendulum, damped and forced oscillations.",
        "topics": [
            "Periodic and Oscillatory Motion",
            "Simple Harmonic Motion (SHM)",
            "Displacement, Velocity, Acceleration in SHM",
            "Energy in SHM",
            "Simple Pendulum",
            "Oscillations of a Spring",
            "Damped Oscillations",
            "Forced Oscillations and Resonance"
        ]
    },
    {
        "chapter_number": 15,
        "chapter_name": "Waves",
        "description": "Transverse and longitudinal waves, wave speed. Principle of superposition, beats, Doppler effect.",
        "topics": [
            "Transverse and Longitudinal Waves",
            "Displacement Relation in Progressive Wave",
            "Speed of Travelling Wave",
            "Principle of Superposition",
            "Reflection of Waves",
            "Standing Waves and Normal Modes",
            "Beats",
            "Doppler Effect"
        ]
    }
]

CBSE_CLASS_11_CHEMISTRY = [
    {
        "chapter_number": 1,
        "chapter_name": "Some Basic Concepts of Chemistry",
        "description": "Importance of chemistry, atomic and molecular masses. Mole concept, stoichiometry, and chemical calculations.",
        "topics": [
            "Importance of Chemistry",
            "Nature of Matter",
            "Properties of Matter",
            "Atomic and Molecular Masses",
            "Mole Concept and Molar Mass",
            "Percentage Composition",
            "Stoichiometry and Calculations",
            "Limiting Reagent"
        ]
    },
    {
        "chapter_number": 2,
        "chapter_name": "Structure of Atom",
        "description": "Discovery of subatomic particles, atomic models. Quantum mechanical model, orbitals, electronic configuration.",
        "topics": [
            "Discovery of Subatomic Particles",
            "Atomic Models - Thomson, Rutherford, Bohr",
            "Quantum Mechanical Model",
            "Quantum Numbers",
            "Shapes of Orbitals",
            "Aufbau Principle, Pauli Exclusion",
            "Hund's Rule",
            "Electronic Configuration"
        ]
    },
    {
        "chapter_number": 3,
        "chapter_name": "Classification of Elements and Periodicity",
        "description": "Historical classification, modern periodic table. Periodic trends in properties, nomenclature of elements.",
        "topics": [
            "Historical Development of Periodic Table",
            "Modern Periodic Law",
            "Nomenclature of Elements",
            "Electronic Configuration and Periodic Table",
            "Periodic Trends - Atomic Radius",
            "Ionization Enthalpy",
            "Electron Gain Enthalpy",
            "Electronegativity"
        ]
    },
    {
        "chapter_number": 4,
        "chapter_name": "Chemical Bonding and Molecular Structure",
        "description": "Ionic and covalent bonds, VSEPR theory. Hybridization, molecular orbital theory, hydrogen bonding.",
        "topics": [
            "Kössel-Lewis Approach",
            "Ionic Bond",
            "Covalent Bond",
            "Bond Parameters",
            "VSEPR Theory",
            "Valence Bond Theory",
            "Hybridization",
            "Molecular Orbital Theory",
            "Hydrogen Bond"
        ]
    },
    {
        "chapter_number": 5,
        "chapter_name": "Thermodynamics",
        "description": "Thermodynamic terms, first law, enthalpy. Spontaneity, entropy, and Gibbs energy.",
        "topics": [
            "Thermodynamic Terms and Concepts",
            "First Law of Thermodynamics",
            "Enthalpy and Enthalpy Change",
            "Heat Capacity",
            "Hess's Law",
            "Spontaneous and Non-spontaneous Processes",
            "Second Law and Entropy",
            "Gibbs Energy and Spontaneity"
        ]
    },
    {
        "chapter_number": 6,
        "chapter_name": "Equilibrium",
        "description": "Equilibrium in physical and chemical processes. Law of mass action, Le Chatelier's principle, ionic equilibrium.",
        "topics": [
            "Equilibrium in Physical Processes",
            "Equilibrium in Chemical Processes",
            "Law of Mass Action",
            "Equilibrium Constant",
            "Le Chatelier's Principle",
            "Ionic Equilibrium in Solution",
            "Acids, Bases and Salts",
            "Buffer Solutions"
        ]
    },
    {
        "chapter_number": 7,
        "chapter_name": "Redox Reactions",
        "description": "Oxidation and reduction, oxidation number. Balancing redox reactions, electrode processes.",
        "topics": [
            "Oxidation and Reduction",
            "Electron Transfer Reactions",
            "Oxidation Number",
            "Types of Redox Reactions",
            "Balancing Redox Reactions",
            "Electrode Processes",
            "Redox Reactions as Basis for Titrations"
        ]
    },
    {
        "chapter_number": 8,
        "chapter_name": "Organic Chemistry - Some Basic Principles",
        "description": "Purification and analysis, IUPAC nomenclature. Electronic effects, reaction intermediates, types of reactions.",
        "topics": [
            "General Introduction to Organic Chemistry",
            "Tetravalence of Carbon",
            "Functional Groups",
            "IUPAC Nomenclature",
            "Isomerism",
            "Electronic Effects in Covalent Bonds",
            "Reaction Intermediates",
            "Types of Organic Reactions"
        ]
    },
    {
        "chapter_number": 9,
        "chapter_name": "Hydrocarbons",
        "description": "Classification, nomenclature. Alkanes, alkenes, alkynes - preparation, properties, reactions, uses.",
        "topics": [
            "Classification of Hydrocarbons",
            "Alkanes - Properties and Reactions",
            "Alkenes - Preparation and Properties",
            "Alkynes - Properties",
            "Aromatic Hydrocarbons",
            "Benzene Structure",
            "Electrophilic Substitution",
            "Carcinogenicity and Toxicity"
        ]
    }
]

CBSE_CLASS_11_BIOLOGY = [
    {
        "chapter_number": 1,
        "chapter_name": "The Living World",
        "description": "What is living, diversity in the living world. Taxonomic categories, taxonomic aids.",
        "topics": [
            "What is Living",
            "Diversity in the Living World",
            "Taxonomic Categories",
            "Species, Genus, Family",
            "Order, Class, Phylum",
            "Kingdom, Domain",
            "Taxonomic Aids"
        ]
    },
    {
        "chapter_number": 2,
        "chapter_name": "Biological Classification",
        "description": "Five kingdom classification, characteristics of each kingdom. Viruses, viroids, and lichens.",
        "topics": [
            "Kingdom Monera",
            "Kingdom Protista",
            "Kingdom Fungi",
            "Kingdom Plantae",
            "Kingdom Animalia",
            "Viruses and Viroids",
            "Lichens"
        ]
    },
    {
        "chapter_number": 3,
        "chapter_name": "Plant Kingdom",
        "description": "Classification of plants, algae, bryophytes, pteridophytes. Gymnosperms and angiosperms, life cycles.",
        "topics": [
            "Algae - Characteristics and Types",
            "Bryophytes - Mosses, Liverworts",
            "Pteridophytes - Ferns",
            "Gymnosperms - Pine, Cycas",
            "Angiosperms - Flowering Plants",
            "Plant Life Cycles",
            "Alternation of Generations"
        ]
    },
    {
        "chapter_number": 4,
        "chapter_name": "Animal Kingdom",
        "description": "Basis of classification, classification of animals. Major phyla characteristics and examples.",
        "topics": [
            "Basis of Classification",
            "Phylum Porifera",
            "Phylum Cnidaria",
            "Phylum Platyhelminthes",
            "Phylum Nematoda",
            "Phylum Annelida",
            "Phylum Arthropoda",
            "Phylum Mollusca",
            "Phylum Echinodermata",
            "Phylum Chordata"
        ]
    },
    {
        "chapter_number": 5,
        "chapter_name": "Morphology of Flowering Plants",
        "description": "Parts of a flowering plant - root, stem, leaf, flower. Fruit and seed structure.",
        "topics": [
            "Root - Types and Modifications",
            "Stem - Types and Modifications",
            "Leaf - Structure and Types",
            "Inflorescence",
            "Flower - Parts and Types",
            "Fruit - Types and Classification",
            "Seed Structure",
            "Plant Families - Fabaceae, Solanaceae, Liliaceae"
        ]
    },
    {
        "chapter_number": 6,
        "chapter_name": "Anatomy of Flowering Plants",
        "description": "Internal structure of plants, tissues and tissue systems. Primary and secondary growth.",
        "topics": [
            "Plant Tissues",
            "Tissue System",
            "Anatomy of Dicot and Monocot Root",
            "Anatomy of Dicot and Monocot Stem",
            "Anatomy of Dicot and Monocot Leaf",
            "Secondary Growth in Dicot Stem and Root"
        ]
    },
    {
        "chapter_number": 7,
        "chapter_name": "Structural Organisation in Animals",
        "description": "Organ and organ systems, animal tissues. Morphology and anatomy of frog.",
        "topics": [
            "Animal Tissues - Epithelial",
            "Connective Tissues",
            "Muscle Tissues",
            "Neural Tissues",
            "Organ and Organ Systems",
            "Morphology of Frog",
            "Anatomy of Frog"
        ]
    },
    {
        "chapter_number": 8,
        "chapter_name": "Cell: The Unit of Life",
        "description": "Cell theory, prokaryotic and eukaryotic cells. Cell organelles and their functions.",
        "topics": [
            "Cell Theory",
            "Prokaryotic Cell",
            "Eukaryotic Cell",
            "Cell Membrane",
            "Cell Wall",
            "Endomembrane System",
            "Mitochondria and Plastids",
            "Ribosomes and Cytoskeleton",
            "Cilia and Flagella",
            "Nucleus"
        ]
    },
    {
        "chapter_number": 9,
        "chapter_name": "Biomolecules",
        "description": "Chemical composition of living body. Primary and secondary metabolites, biomacromolecules, enzymes.",
        "topics": [
            "How to Analyse Chemical Composition",
            "Primary and Secondary Metabolites",
            "Biomacromolecules",
            "Carbohydrates",
            "Proteins",
            "Lipids",
            "Nucleic Acids",
            "Enzymes - Properties and Mechanism"
        ]
    },
    {
        "chapter_number": 10,
        "chapter_name": "Cell Cycle and Cell Division",
        "description": "Cell cycle phases, mitosis and meiosis. Significance of cell division.",
        "topics": [
            "Cell Cycle Phases",
            "M Phase - Mitosis",
            "Prophase, Metaphase, Anaphase, Telophase",
            "Cytokinesis",
            "Meiosis - Stages",
            "Meiosis I and Meiosis II",
            "Significance of Meiosis"
        ]
    },
    {
        "chapter_number": 11,
        "chapter_name": "Photosynthesis in Higher Plants",
        "description": "Photosynthesis process, pigments involved. Light and dark reactions, factors affecting photosynthesis.",
        "topics": [
            "Where Does Photosynthesis Occur",
            "Photosynthetic Pigments",
            "Light Reaction",
            "Electron Transport",
            "Chemiosmotic Hypothesis",
            "Dark Reaction - C3 Pathway",
            "C4 Pathway",
            "Photorespiration",
            "Factors Affecting Photosynthesis"
        ]
    },
    {
        "chapter_number": 12,
        "chapter_name": "Respiration in Plants",
        "description": "Cellular respiration, glycolysis, fermentation. Krebs cycle and electron transport chain.",
        "topics": [
            "Cellular Respiration",
            "Glycolysis",
            "Fermentation",
            "Aerobic Respiration",
            "Krebs Cycle (TCA Cycle)",
            "Electron Transport Chain",
            "Oxidative Phosphorylation",
            "Respiratory Quotient"
        ]
    },
    {
        "chapter_number": 13,
        "chapter_name": "Plant Growth and Development",
        "description": "Growth, differentiation, development. Plant hormones and their role, photoperiodism, vernalization.",
        "topics": [
            "Growth in Plants",
            "Plant Growth Rate",
            "Conditions for Growth",
            "Differentiation and Development",
            "Plant Growth Regulators",
            "Auxins, Gibberellins, Cytokinins",
            "Ethylene and ABA",
            "Photoperiodism",
            "Vernalization"
        ]
    }
]

CBSE_CLASS_11_MATHEMATICS = [
    {
        "chapter_number": 1,
        "chapter_name": "Sets",
        "description": "Sets and their representations, types of sets. Set operations, Venn diagrams, practical problems.",
        "topics": [
            "Sets and Their Representations",
            "Empty Set, Finite, Infinite Sets",
            "Subsets and Power Set",
            "Universal Set",
            "Venn Diagrams",
            "Operations on Sets - Union, Intersection",
            "Complement of a Set",
            "Practical Problems on Sets"
        ]
    },
    {
        "chapter_number": 2,
        "chapter_name": "Relations and Functions",
        "description": "Ordered pairs, Cartesian product. Relations, functions, domain and range.",
        "topics": [
            "Ordered Pairs",
            "Cartesian Product of Sets",
            "Relations",
            "Functions",
            "Domain and Range",
            "Real Valued Functions",
            "Algebra of Functions",
            "Graphs of Functions"
        ]
    },
    {
        "chapter_number": 3,
        "chapter_name": "Trigonometric Functions",
        "description": "Trigonometric ratios, identities. Trigonometric equations and their solutions.",
        "topics": [
            "Angles and Their Measure",
            "Trigonometric Functions",
            "Domain and Range of Trigonometric Functions",
            "Trigonometric Functions of Sum and Difference",
            "Trigonometric Identities",
            "Trigonometric Equations",
            "Graphs of Trigonometric Functions"
        ]
    },
    {
        "chapter_number": 4,
        "chapter_name": "Complex Numbers and Quadratic Equations",
        "description": "Complex numbers, algebra of complex numbers. Modulus, conjugate, polar form. Quadratic equations.",
        "topics": [
            "Complex Numbers - Need and Definition",
            "Algebra of Complex Numbers",
            "Modulus and Conjugate",
            "Argand Plane",
            "Polar Representation",
            "Quadratic Equations in Complex Numbers",
            "Square Root of a Complex Number"
        ]
    },
    {
        "chapter_number": 5,
        "chapter_name": "Linear Inequalities",
        "description": "Linear inequalities, algebraic and graphical solutions. System of linear inequalities.",
        "topics": [
            "Inequalities - Introduction",
            "Algebraic Solutions of Linear Inequalities",
            "Graphical Representation",
            "System of Linear Inequalities in One Variable",
            "Two Variables Graphical Solution",
            "Solution Region"
        ]
    },
    {
        "chapter_number": 6,
        "chapter_name": "Permutations and Combinations",
        "description": "Fundamental principle of counting. Permutations, combinations, and their applications.",
        "topics": [
            "Fundamental Principle of Counting",
            "Factorial Notation",
            "Permutations - Definition and Formula",
            "Permutations with Restrictions",
            "Combinations - Definition and Formula",
            "Properties of Combinations",
            "Practical Problems"
        ]
    },
    {
        "chapter_number": 7,
        "chapter_name": "Binomial Theorem",
        "description": "Binomial theorem for positive integral index. General and middle terms, binomial coefficients.",
        "topics": [
            "Binomial Theorem Statement",
            "Binomial Coefficients",
            "General Term",
            "Middle Term",
            "Properties of Binomial Coefficients",
            "Applications of Binomial Theorem"
        ]
    },
    {
        "chapter_number": 8,
        "chapter_name": "Sequences and Series",
        "description": "Arithmetic and geometric progressions. Relationship between AM and GM, special series.",
        "topics": [
            "Sequences",
            "Arithmetic Progression (AP)",
            "Sum of n Terms of AP",
            "Geometric Progression (GP)",
            "Sum of n Terms of GP",
            "Relationship between AM and GM",
            "Special Series - Sum of Squares, Cubes"
        ]
    },
    {
        "chapter_number": 9,
        "chapter_name": "Straight Lines",
        "description": "Slope of a line, equations of lines. General equation, distance from a point, angle between lines.",
        "topics": [
            "Slope of a Line",
            "Various Forms of Equation of Line",
            "Slope-Intercept Form",
            "Point-Slope Form",
            "Two-Point Form",
            "Intercept Form",
            "Distance of Point from Line",
            "Angle Between Two Lines"
        ]
    },
    {
        "chapter_number": 10,
        "chapter_name": "Conic Sections",
        "description": "Circle, parabola, ellipse, and hyperbola. Standard equations and properties.",
        "topics": [
            "Sections of a Cone",
            "Circle - Equation and Properties",
            "Parabola - Standard Equations",
            "Ellipse - Standard Equations",
            "Hyperbola - Standard Equations",
            "Latus Rectum",
            "Focus and Directrix"
        ]
    },
    {
        "chapter_number": 11,
        "chapter_name": "Introduction to Three Dimensional Geometry",
        "description": "Coordinate axes in 3D, distance formula. Section formula and direction cosines.",
        "topics": [
            "Coordinate Axes and Planes",
            "Coordinates of a Point in Space",
            "Distance Between Two Points",
            "Section Formula",
            "Direction Cosines and Ratios"
        ]
    },
    {
        "chapter_number": 12,
        "chapter_name": "Limits and Derivatives",
        "description": "Limits of polynomials and rational functions. Derivatives, algebra of derivatives.",
        "topics": [
            "Intuitive Idea of Limits",
            "Limits - Definition",
            "Limits of Polynomials",
            "Limits of Rational Functions",
            "Limits of Trigonometric Functions",
            "Derivatives - Introduction",
            "Algebra of Derivatives",
            "Derivative of Polynomials and Trigonometric Functions"
        ]
    },
    {
        "chapter_number": 13,
        "chapter_name": "Statistics",
        "description": "Measures of dispersion, range, mean deviation. Variance and standard deviation.",
        "topics": [
            "Measures of Dispersion",
            "Range",
            "Mean Deviation",
            "Variance and Standard Deviation",
            "Analysis of Frequency Distributions",
            "Coefficient of Variation"
        ]
    },
    {
        "chapter_number": 14,
        "chapter_name": "Probability",
        "description": "Random experiments, events, axiomatic approach. Probability calculation, addition rule.",
        "topics": [
            "Random Experiments",
            "Outcomes and Sample Space",
            "Events - Types",
            "Occurrence of an Event",
            "Axiomatic Approach to Probability",
            "Probability of an Event",
            "Probability of 'Not', 'And', 'Or' Events"
        ]
    }
]

# ══════════════════════════════════════════════════════════════════════════════
# CBSE CLASS 12 CHAPTERS (SCIENCE STREAM - PHYSICS)
# ══════════════════════════════════════════════════════════════════════════════

CBSE_CLASS_12_PHYSICS = [
    {
        "chapter_number": 1,
        "chapter_name": "Electric Charges and Fields",
        "description": "Electric charge, Coulomb's law, electric field. Field due to point charge, electric dipole, Gauss's law.",
        "topics": [
            "Electric Charge and Conservation",
            "Coulomb's Law",
            "Forces Between Multiple Charges",
            "Electric Field",
            "Electric Field Lines",
            "Electric Dipole",
            "Electric Flux",
            "Gauss's Law and Applications"
        ]
    },
    {
        "chapter_number": 2,
        "chapter_name": "Electrostatic Potential and Capacitance",
        "description": "Electric potential, potential difference. Equipotential surfaces, capacitors and capacitance.",
        "topics": [
            "Electric Potential",
            "Potential Due to Point Charge",
            "Potential Due to Electric Dipole",
            "Equipotential Surfaces",
            "Potential Energy in Electric Field",
            "Capacitors and Capacitance",
            "Parallel Plate Capacitor",
            "Combination of Capacitors",
            "Energy Stored in Capacitor"
        ]
    },
    {
        "chapter_number": 3,
        "chapter_name": "Current Electricity",
        "description": "Electric current, Ohm's law, resistance. Cells, EMF, resistivity. Kirchhoff's rules and applications.",
        "topics": [
            "Electric Current",
            "Ohm's Law",
            "Drift Velocity and Mobility",
            "Resistivity of Materials",
            "Temperature Dependence of Resistance",
            "Electrical Energy and Power",
            "Combination of Resistors",
            "Cells and EMF",
            "Kirchhoff's Rules",
            "Wheatstone Bridge and Meter Bridge"
        ]
    },
    {
        "chapter_number": 4,
        "chapter_name": "Moving Charges and Magnetism",
        "description": "Magnetic force on moving charge and current-carrying conductor. Biot-Savart law, Ampere's law.",
        "topics": [
            "Magnetic Force on Moving Charge",
            "Motion of Charged Particle in Magnetic Field",
            "Force on Current-Carrying Conductor",
            "Biot-Savart Law",
            "Magnetic Field Due to Circular Loop",
            "Ampere's Circuital Law",
            "Solenoid and Toroid",
            "Force Between Parallel Currents",
            "Moving Coil Galvanometer"
        ]
    },
    {
        "chapter_number": 5,
        "chapter_name": "Magnetism and Matter",
        "description": "Bar magnet, magnetism and Gauss's law. Earth's magnetism, magnetic materials and their properties.",
        "topics": [
            "Bar Magnet as Equivalent Solenoid",
            "Magnetic Field Lines",
            "Gauss's Law in Magnetism",
            "Earth's Magnetism",
            "Magnetisation and Magnetic Intensity",
            "Magnetic Properties of Materials",
            "Dia-, Para-, Ferromagnetic Materials",
            "Hysteresis"
        ]
    },
    {
        "chapter_number": 6,
        "chapter_name": "Electromagnetic Induction",
        "description": "Faraday's laws, Lenz's law. Motional EMF, eddy currents, self and mutual inductance.",
        "topics": [
            "Experiments of Faraday and Henry",
            "Magnetic Flux",
            "Faraday's Law of Induction",
            "Lenz's Law and Energy Conservation",
            "Motional EMF",
            "Energy Consideration",
            "Eddy Currents",
            "Inductance - Self and Mutual",
            "AC Generator"
        ]
    },
    {
        "chapter_number": 7,
        "chapter_name": "Alternating Current",
        "description": "AC voltage, phasors. LCR circuit, resonance, power in AC circuits, transformers.",
        "topics": [
            "AC Voltage Applied to Resistor",
            "AC Voltage Applied to Inductor",
            "AC Voltage Applied to Capacitor",
            "AC Applied to LCR Circuit",
            "Phasors",
            "Resonance",
            "Power in AC Circuit",
            "LC Oscillations",
            "Transformers"
        ]
    },
    {
        "chapter_number": 8,
        "chapter_name": "Electromagnetic Waves",
        "description": "Displacement current, EM waves. Properties of EM waves, electromagnetic spectrum.",
        "topics": [
            "Displacement Current",
            "Electromagnetic Waves",
            "Properties of EM Waves",
            "Electromagnetic Spectrum",
            "Radio Waves",
            "Microwaves",
            "Infrared, Visible, UV Rays",
            "X-rays and Gamma Rays"
        ]
    },
    {
        "chapter_number": 9,
        "chapter_name": "Ray Optics and Optical Instruments",
        "description": "Reflection, refraction, total internal reflection. Prism, dispersion. Optical instruments.",
        "topics": [
            "Reflection of Light - Spherical Mirrors",
            "Refraction at Plane and Spherical Surfaces",
            "Total Internal Reflection",
            "Refraction Through Prism",
            "Dispersion by Prism",
            "Optical Instruments - Eye",
            "Microscope - Simple and Compound",
            "Telescope - Reflecting and Refracting"
        ]
    },
    {
        "chapter_number": 10,
        "chapter_name": "Wave Optics",
        "description": "Huygens principle, interference, diffraction. Young's double slit, polarization.",
        "topics": [
            "Huygens Principle",
            "Refraction and Reflection Using Huygens",
            "Coherent and Incoherent Sources",
            "Interference of Light",
            "Young's Double Slit Experiment",
            "Diffraction",
            "Single Slit Diffraction",
            "Polarisation"
        ]
    },
    {
        "chapter_number": 11,
        "chapter_name": "Dual Nature of Radiation and Matter",
        "description": "Photoelectric effect, Einstein's equation. Wave nature of matter, Davisson-Germer experiment.",
        "topics": [
            "Electron Emission",
            "Photoelectric Effect",
            "Experimental Study of Photoelectric Effect",
            "Einstein's Photoelectric Equation",
            "Particle Nature of Light - Photon",
            "Wave Nature of Matter",
            "de Broglie Relation",
            "Davisson-Germer Experiment"
        ]
    },
    {
        "chapter_number": 12,
        "chapter_name": "Atoms",
        "description": "Alpha particle scattering, Rutherford model. Bohr model, hydrogen spectrum, atomic structure.",
        "topics": [
            "Alpha Particle Scattering",
            "Rutherford's Nuclear Model",
            "Atomic Spectra",
            "Bohr Model of Hydrogen Atom",
            "Energy Levels",
            "Line Spectra of Hydrogen",
            "de Broglie's Explanation of Bohr's Quantization"
        ]
    },
    {
        "chapter_number": 13,
        "chapter_name": "Nuclei",
        "description": "Composition and size of nucleus, mass-energy relation. Nuclear binding energy, radioactivity, nuclear reactions.",
        "topics": [
            "Atomic Masses and Composition",
            "Size of Nucleus",
            "Mass-Energy Equivalence",
            "Nuclear Binding Energy",
            "Nuclear Force",
            "Radioactivity - Alpha, Beta, Gamma",
            "Nuclear Energy - Fission and Fusion"
        ]
    },
    {
        "chapter_number": 14,
        "chapter_name": "Semiconductor Electronics",
        "description": "Classification of materials, semiconductor devices. p-n junction, diodes, transistors, logic gates.",
        "topics": [
            "Classification of Materials",
            "Intrinsic and Extrinsic Semiconductors",
            "p-n Junction Formation",
            "Semiconductor Diode",
            "Application of Junction Diode as Rectifier",
            "Zener Diode",
            "Junction Transistor",
            "Logic Gates"
        ]
    }
]

CBSE_CLASS_12_CHEMISTRY = [
    {
        "chapter_number": 1,
        "chapter_name": "The Solid State",
        "description": "Classification of solids, crystal lattices. Unit cells, close packed structures, defects in solids.",
        "topics": [
            "Classification of Solids",
            "Crystal Lattices and Unit Cells",
            "Number of Atoms in a Unit Cell",
            "Close Packed Structures",
            "Packing Efficiency",
            "Calculations Involving Unit Cell",
            "Imperfections in Solids",
            "Electrical and Magnetic Properties"
        ]
    },
    {
        "chapter_number": 2,
        "chapter_name": "Solutions",
        "description": "Types of solutions, concentration units. Colligative properties, abnormal molecular masses.",
        "topics": [
            "Types of Solutions",
            "Expressing Concentration",
            "Solubility",
            "Henry's Law",
            "Vapour Pressure of Liquid Solutions",
            "Raoult's Law",
            "Colligative Properties",
            "Abnormal Molar Masses"
        ]
    },
    {
        "chapter_number": 3,
        "chapter_name": "Electrochemistry",
        "description": "Electrochemical cells, electrode potentials. Nernst equation, conductance, batteries, corrosion.",
        "topics": [
            "Electrochemical Cells",
            "Galvanic Cells",
            "Nernst Equation",
            "Electrochemical Cell and Gibbs Energy",
            "Conductance of Electrolytic Solutions",
            "Kohlrausch's Law",
            "Electrolytic Cells and Electrolysis",
            "Batteries and Fuel Cells",
            "Corrosion"
        ]
    },
    {
        "chapter_number": 4,
        "chapter_name": "Chemical Kinetics",
        "description": "Rate of reaction, factors affecting rate. Integrated rate equations, collision theory.",
        "topics": [
            "Rate of a Chemical Reaction",
            "Factors Influencing Rate",
            "Rate Law and Rate Constant",
            "Integrated Rate Equations",
            "Zero and First Order Reactions",
            "Half-Life Period",
            "Pseudo First Order Reactions",
            "Temperature Dependence - Arrhenius Equation",
            "Collision Theory"
        ]
    },
    {
        "chapter_number": 5,
        "chapter_name": "Surface Chemistry",
        "description": "Adsorption, catalysis. Colloids and emulsions, their properties and applications.",
        "topics": [
            "Adsorption - Types and Isotherms",
            "Factors Affecting Adsorption",
            "Catalysis - Homogeneous and Heterogeneous",
            "Enzyme Catalysis",
            "Colloidal State",
            "Classification of Colloids",
            "Properties of Colloids",
            "Emulsions"
        ]
    },
    {
        "chapter_number": 6,
        "chapter_name": "General Principles of Isolation of Elements",
        "description": "Occurrence of metals, concentration of ores. Extraction of metals, refining processes.",
        "topics": [
            "Occurrence of Metals",
            "Concentration of Ores",
            "Extraction of Crude Metal",
            "Thermodynamic Principles of Metallurgy",
            "Electrochemical Principles of Metallurgy",
            "Oxidation-Reduction in Metallurgy",
            "Refining of Metals",
            "Uses of Metals"
        ]
    },
    {
        "chapter_number": 7,
        "chapter_name": "The p-Block Elements",
        "description": "Group 15, 16, 17, 18 elements. Properties, compounds, and their applications.",
        "topics": [
            "Group 15 Elements - Properties",
            "Nitrogen and Its Compounds",
            "Phosphorus and Its Compounds",
            "Group 16 Elements - Properties",
            "Oxygen and Sulphur Compounds",
            "Group 17 Elements - Halogens",
            "Halogen Compounds",
            "Group 18 Elements - Noble Gases"
        ]
    },
    {
        "chapter_number": 8,
        "chapter_name": "The d- and f-Block Elements",
        "description": "Transition elements properties, lanthanoids and actinoids. Important compounds of transition metals.",
        "topics": [
            "Transition Elements - General Properties",
            "Electronic Configuration",
            "Trends in Properties",
            "Important Compounds - Oxides, Potassium Dichromate, Potassium Permanganate",
            "Lanthanoids - Properties",
            "Actinoids - Properties",
            "Inner Transition Elements"
        ]
    },
    {
        "chapter_number": 9,
        "chapter_name": "Coordination Compounds",
        "description": "Werner's theory, nomenclature. Bonding, isomerism, importance of coordination compounds.",
        "topics": [
            "Werner's Theory of Coordination Compounds",
            "Definitions - Ligands, Coordination Number",
            "IUPAC Nomenclature",
            "Isomerism in Coordination Compounds",
            "Bonding in Coordination Compounds",
            "Valence Bond Theory",
            "Crystal Field Theory",
            "Colour, Magnetic Properties",
            "Importance of Coordination Compounds"
        ]
    },
    {
        "chapter_number": 10,
        "chapter_name": "Haloalkanes and Haloarenes",
        "description": "Classification, nomenclature. Preparation, properties, reactions of haloalkanes and haloarenes.",
        "topics": [
            "Classification and Nomenclature",
            "Nature of C-X Bond",
            "Methods of Preparation",
            "Physical Properties",
            "Chemical Reactions - Substitution",
            "Elimination Reactions",
            "Reactions of Haloarenes",
            "Polyhalogen Compounds"
        ]
    },
    {
        "chapter_number": 11,
        "chapter_name": "Alcohols, Phenols and Ethers",
        "description": "Classification, nomenclature. Properties and reactions of alcohols, phenols, and ethers.",
        "topics": [
            "Classification and Nomenclature",
            "Structures of Functional Groups",
            "Methods of Preparation of Alcohols",
            "Physical and Chemical Properties of Alcohols",
            "Some Important Alcohols",
            "Phenols - Preparation and Properties",
            "Ethers - Preparation and Properties"
        ]
    },
    {
        "chapter_number": 12,
        "chapter_name": "Aldehydes, Ketones and Carboxylic Acids",
        "description": "Nomenclature, preparation, properties. Reactions of aldehydes, ketones, and carboxylic acids.",
        "topics": [
            "Nomenclature and Structure",
            "Preparation of Aldehydes and Ketones",
            "Physical Properties",
            "Chemical Reactions - Nucleophilic Addition",
            "Reduction and Oxidation",
            "Other Reactions",
            "Carboxylic Acids - Preparation",
            "Properties of Carboxylic Acids"
        ]
    },
    {
        "chapter_number": 13,
        "chapter_name": "Amines",
        "description": "Structure, classification, nomenclature. Preparation, properties, and reactions of amines.",
        "topics": [
            "Structure of Amines",
            "Classification and Nomenclature",
            "Preparation of Amines",
            "Physical Properties",
            "Chemical Reactions - Basicity",
            "Reactions with Acids, Alkyl Halides",
            "Acylation and Carbylamine Reaction",
            "Diazonium Salts"
        ]
    },
    {
        "chapter_number": 14,
        "chapter_name": "Biomolecules",
        "description": "Carbohydrates, proteins, vitamins. Nucleic acids, hormones, and their biological importance.",
        "topics": [
            "Carbohydrates - Classification",
            "Monosaccharides - Glucose, Fructose",
            "Disaccharides and Polysaccharides",
            "Proteins - Amino Acids",
            "Structure of Proteins",
            "Enzymes",
            "Vitamins - Classification",
            "Nucleic Acids - DNA and RNA",
            "Hormones"
        ]
    }
]

CBSE_CLASS_12_BIOLOGY = [
    {
        "chapter_number": 1,
        "chapter_name": "Reproduction in Organisms",
        "description": "Asexual and sexual reproduction. Life span, reproduction events, post-fertilization events.",
        "topics": [
            "Asexual Reproduction - Types",
            "Binary Fission, Sporulation",
            "Vegetative Propagation",
            "Sexual Reproduction",
            "Events in Sexual Reproduction",
            "Pre-fertilization Events",
            "Fertilization",
            "Post-fertilization Events"
        ]
    },
    {
        "chapter_number": 2,
        "chapter_name": "Sexual Reproduction in Flowering Plants",
        "description": "Flower structure, pollination, fertilization. Seed and fruit development, special modes.",
        "topics": [
            "Flower - A Specialized Shoot",
            "Stamen and Microsporangium",
            "Pollen Grain",
            "Pistil and Megasporangium",
            "Pollination - Types",
            "Pollen-Pistil Interaction",
            "Double Fertilization",
            "Seed and Fruit Development",
            "Apomixis and Polyembryony"
        ]
    },
    {
        "chapter_number": 3,
        "chapter_name": "Human Reproduction",
        "description": "Male and female reproductive systems. Gametogenesis, menstrual cycle, fertilization, pregnancy.",
        "topics": [
            "Male Reproductive System",
            "Female Reproductive System",
            "Gametogenesis",
            "Menstrual Cycle",
            "Fertilization and Implantation",
            "Pregnancy and Embryonic Development",
            "Parturition and Lactation"
        ]
    },
    {
        "chapter_number": 4,
        "chapter_name": "Reproductive Health",
        "description": "Reproductive health problems, population explosion. Birth control methods, infertility treatments.",
        "topics": [
            "Reproductive Health - Problems and Strategies",
            "Population Explosion",
            "Birth Control - Methods",
            "Medical Termination of Pregnancy",
            "Sexually Transmitted Diseases",
            "Infertility",
            "Assisted Reproductive Technologies"
        ]
    },
    {
        "chapter_number": 5,
        "chapter_name": "Principles of Inheritance and Variation",
        "description": "Mendel's laws, inheritance patterns. Chromosomal disorders, mutation, genetic disorders.",
        "topics": [
            "Mendel's Laws of Inheritance",
            "Monohybrid and Dihybrid Cross",
            "Linkage and Recombination",
            "Sex Determination",
            "Mutation",
            "Chromosomal Disorders",
            "Mendelian Disorders",
            "Pedigree Analysis"
        ]
    },
    {
        "chapter_number": 6,
        "chapter_name": "Molecular Basis of Inheritance",
        "description": "DNA structure and replication, transcription, translation. Regulation of gene expression.",
        "topics": [
            "DNA as Genetic Material",
            "Structure of DNA",
            "DNA Replication",
            "Transcription",
            "Genetic Code",
            "Translation",
            "Regulation of Gene Expression",
            "Human Genome Project",
            "DNA Fingerprinting"
        ]
    },
    {
        "chapter_number": 7,
        "chapter_name": "Evolution",
        "description": "Origin of life, evidences of evolution. Theories of evolution, human evolution.",
        "topics": [
            "Origin of Life",
            "Evolution of Life Forms",
            "Evidences of Evolution",
            "Adaptive Radiation",
            "Biological Evolution",
            "Mechanism of Evolution",
            "Hardy-Weinberg Principle",
            "Origin and Evolution of Man"
        ]
    },
    {
        "chapter_number": 8,
        "chapter_name": "Human Health and Disease",
        "description": "Common diseases, immunity. AIDS, cancer, drugs and alcohol abuse.",
        "topics": [
            "Common Diseases in Humans",
            "Diseases Caused by Pathogens",
            "Immunity - Types",
            "Vaccination and Immunisation",
            "AIDS",
            "Cancer",
            "Drugs and Alcohol Abuse"
        ]
    },
    {
        "chapter_number": 9,
        "chapter_name": "Strategies for Enhancement in Food Production",
        "description": "Animal husbandry, plant breeding. Single cell proteins, tissue culture.",
        "topics": [
            "Animal Husbandry - Dairy, Poultry, Apiculture, Fisheries",
            "Plant Breeding - Methods",
            "Biofortification",
            "Single Cell Proteins",
            "Tissue Culture",
            "Somatic Hybridization"
        ]
    },
    {
        "chapter_number": 10,
        "chapter_name": "Microbes in Human Welfare",
        "description": "Microbes in food, industry, sewage treatment. Microbes in energy generation and biocontrol.",
        "topics": [
            "Microbes in Household Products",
            "Microbes in Industrial Products",
            "Microbes in Sewage Treatment",
            "Microbes in Production of Biogas",
            "Microbes as Biocontrol Agents",
            "Microbes as Biofertilizers"
        ]
    },
    {
        "chapter_number": 11,
        "chapter_name": "Biotechnology: Principles and Processes",
        "description": "Genetic engineering principles, tools of recombinant DNA technology. Processes in biotechnology.",
        "topics": [
            "Principles of Biotechnology",
            "Tools of Recombinant DNA Technology",
            "Restriction Enzymes",
            "Cloning Vectors",
            "Competent Host",
            "Processes of Recombinant DNA Technology",
            "PCR",
            "Gel Electrophoresis"
        ]
    },
    {
        "chapter_number": 12,
        "chapter_name": "Biotechnology and Its Applications",
        "description": "Applications in agriculture, medicine. Genetically modified organisms, biosafety issues.",
        "topics": [
            "Applications in Agriculture",
            "Bt Crops",
            "RNA Interference",
            "Applications in Medicine",
            "Genetically Engineered Insulin",
            "Gene Therapy",
            "Molecular Diagnosis",
            "Transgenic Animals",
            "Ethical Issues"
        ]
    },
    {
        "chapter_number": 13,
        "chapter_name": "Organisms and Populations",
        "description": "Organism and its environment, populations. Population interactions, adaptations.",
        "topics": [
            "Organism and Its Environment",
            "Major Abiotic Factors",
            "Responses to Abiotic Factors",
            "Adaptations",
            "Population - Attributes",
            "Population Growth",
            "Life History Variation",
            "Population Interactions"
        ]
    },
    {
        "chapter_number": 14,
        "chapter_name": "Ecosystem",
        "description": "Structure and function of ecosystem. Energy flow, decomposition, ecological succession.",
        "topics": [
            "Ecosystem - Structure and Function",
            "Productivity",
            "Decomposition",
            "Energy Flow",
            "Ecological Pyramids",
            "Ecological Succession",
            "Nutrient Cycling",
            "Ecosystem Services"
        ]
    },
    {
        "chapter_number": 15,
        "chapter_name": "Biodiversity and Conservation",
        "description": "Biodiversity levels, patterns, importance. Loss of biodiversity, conservation strategies.",
        "topics": [
            "Biodiversity - Concept",
            "Patterns of Biodiversity",
            "Importance of Species Diversity",
            "Loss of Biodiversity",
            "Biodiversity Conservation",
            "In-situ Conservation",
            "Ex-situ Conservation",
            "Protected Areas"
        ]
    },
    {
        "chapter_number": 16,
        "chapter_name": "Environmental Issues",
        "description": "Pollution types and control, solid waste management. Deforestation, greenhouse effect.",
        "topics": [
            "Air Pollution and Control",
            "Water Pollution and Control",
            "Solid Waste Management",
            "Agro-chemicals and Effects",
            "Radioactive Waste Management",
            "Greenhouse Effect and Global Warming",
            "Ozone Depletion",
            "Deforestation"
        ]
    }
]

CBSE_CLASS_12_MATHEMATICS = [
    {
        "chapter_number": 1,
        "chapter_name": "Relations and Functions",
        "description": "Types of relations, types of functions. Composition of functions, inverse of function.",
        "topics": [
            "Types of Relations",
            "Types of Functions",
            "One-to-One, Onto Functions",
            "Composition of Functions",
            "Invertible Functions",
            "Binary Operations"
        ]
    },
    {
        "chapter_number": 2,
        "chapter_name": "Inverse Trigonometric Functions",
        "description": "Definition, range, principal value. Properties and applications of inverse trigonometric functions.",
        "topics": [
            "Basic Concepts",
            "Range and Domain",
            "Principal Value Branch",
            "Properties of Inverse Functions",
            "Graphs of Inverse Functions",
            "Applications"
        ]
    },
    {
        "chapter_number": 3,
        "chapter_name": "Matrices",
        "description": "Types of matrices, operations on matrices. Transpose, symmetric matrices, invertible matrices.",
        "topics": [
            "Definition and Types of Matrices",
            "Equality of Matrices",
            "Operations on Matrices",
            "Multiplication of Matrices",
            "Transpose of a Matrix",
            "Symmetric and Skew Symmetric Matrices",
            "Elementary Operations",
            "Invertible Matrices"
        ]
    },
    {
        "chapter_number": 4,
        "chapter_name": "Determinants",
        "description": "Determinant of a matrix, properties. Area of triangle, minors and cofactors, adjoint and inverse.",
        "topics": [
            "Determinant of a Matrix",
            "Properties of Determinants",
            "Area of a Triangle",
            "Minors and Co-factors",
            "Adjoint of a Matrix",
            "Inverse of a Matrix",
            "Applications - Solving Linear Equations"
        ]
    },
    {
        "chapter_number": 5,
        "chapter_name": "Continuity and Differentiability",
        "description": "Continuity, differentiability, derivatives. Chain rule, exponential and logarithmic functions.",
        "topics": [
            "Continuity",
            "Differentiability",
            "Derivatives of Composite Functions",
            "Chain Rule",
            "Derivatives of Implicit Functions",
            "Derivatives of Inverse Trigonometric Functions",
            "Exponential and Logarithmic Functions",
            "Logarithmic Differentiation",
            "Second Order Derivatives"
        ]
    },
    {
        "chapter_number": 6,
        "chapter_name": "Application of Derivatives",
        "description": "Rate of change, increasing/decreasing functions. Tangent, normal, approximations, maxima and minima.",
        "topics": [
            "Rate of Change of Quantities",
            "Increasing and Decreasing Functions",
            "Tangents and Normals",
            "Approximations",
            "Maxima and Minima",
            "First Derivative Test",
            "Second Derivative Test"
        ]
    },
    {
        "chapter_number": 7,
        "chapter_name": "Integrals",
        "description": "Integration as inverse of differentiation. Methods of integration, definite integrals, properties.",
        "topics": [
            "Integration as Inverse of Differentiation",
            "Methods of Integration",
            "Integration by Substitution",
            "Integration by Parts",
            "Integration by Partial Fractions",
            "Definite Integrals",
            "Fundamental Theorem of Calculus",
            "Properties of Definite Integrals"
        ]
    },
    {
        "chapter_number": 8,
        "chapter_name": "Application of Integrals",
        "description": "Area under simple curves, area between two curves. Applications of definite integrals.",
        "topics": [
            "Area Under Simple Curves",
            "Area Between Two Curves",
            "Area of Region Bounded by Curve and Line",
            "Applications of Definite Integrals"
        ]
    },
    {
        "chapter_number": 9,
        "chapter_name": "Differential Equations",
        "description": "Order and degree, formation of differential equations. Methods of solving differential equations.",
        "topics": [
            "Basic Concepts",
            "Order and Degree",
            "General and Particular Solutions",
            "Formation of Differential Equations",
            "Methods of Solving First Order Equations",
            "Variable Separable",
            "Homogeneous Equations",
            "Linear Equations"
        ]
    },
    {
        "chapter_number": 10,
        "chapter_name": "Vector Algebra",
        "description": "Vectors, operations, scalar and vector products. Applications of vectors.",
        "topics": [
            "Vectors and Scalars",
            "Direction Cosines and Ratios",
            "Types of Vectors",
            "Addition of Vectors",
            "Multiplication by a Scalar",
            "Scalar (Dot) Product",
            "Vector (Cross) Product",
            "Scalar Triple Product"
        ]
    },
    {
        "chapter_number": 11,
        "chapter_name": "Three Dimensional Geometry",
        "description": "Direction cosines, equations of line and plane. Angle between line and plane, distance.",
        "topics": [
            "Direction Cosines and Ratios",
            "Equation of Line in Space",
            "Angle Between Two Lines",
            "Shortest Distance Between Two Lines",
            "Equation of a Plane",
            "Coplanarity of Two Lines",
            "Angle Between Line and Plane",
            "Distance of Point from Plane"
        ]
    },
    {
        "chapter_number": 12,
        "chapter_name": "Linear Programming",
        "description": "Introduction to linear programming, graphical method. Different types of LP problems.",
        "topics": [
            "Introduction to LPP",
            "Mathematical Formulation",
            "Graphical Method of Solving LPP",
            "Types of LPP",
            "Manufacturing Problems",
            "Diet Problems",
            "Transportation Problems"
        ]
    },
    {
        "chapter_number": 13,
        "chapter_name": "Probability",
        "description": "Conditional probability, multiplication theorem. Bayes' theorem, random variables, distributions.",
        "topics": [
            "Conditional Probability",
            "Multiplication Theorem on Probability",
            "Independent Events",
            "Bayes' Theorem",
            "Random Variables",
            "Probability Distribution",
            "Mean of Random Variable",
            "Variance of Random Variable",
            "Bernoulli Trials and Binomial Distribution"
        ]
    }
]

# ══════════════════════════════════════════════════════════════════════════════
# SEED FUNCTION
# ══════════════════════════════════════════════════════════════════════════════

def get_subject_id(cur, board_id, standard_id, subject_name, stream_id=None):
    """Find subject ID by board, standard, name, and optionally stream."""
    if stream_id:
        cur.execute("""
            SELECT id FROM subjects 
            WHERE board_id = %s AND standard_id = %s AND name = %s AND stream_id = %s
        """, (board_id, standard_id, subject_name, stream_id))
    else:
        cur.execute("""
            SELECT id FROM subjects 
            WHERE board_id = %s AND standard_id = %s AND name = %s AND stream_id IS NULL
        """, (board_id, standard_id, subject_name))
    row = cur.fetchone()
    return row['id'] if row else None


def seed_chapters(cur, board_id, standard_id, subject_name, chapters, stream_id=None):
    """Seed chapters for a specific subject."""
    subject_id = get_subject_id(cur, board_id, standard_id, subject_name, stream_id)
    if not subject_id:
        print(f"  ⚠ Subject not found: {board_id}/{standard_id}/{subject_name} (stream={stream_id})")
        return 0
    
    count = 0
    for ch in chapters:
        topics_json = json.dumps(ch["topics"])
        cur.execute("""
            INSERT INTO chapters (board_id, standard_id, subject_id, stream_id, chapter_number, chapter_name, description, topics)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
            ON CONFLICT (board_id, standard_id, subject_id, chapter_number) 
            DO UPDATE SET chapter_name = EXCLUDED.chapter_name, 
                          description = EXCLUDED.description, 
                          topics = EXCLUDED.topics,
                          stream_id = EXCLUDED.stream_id
        """, (board_id, standard_id, subject_id, stream_id, ch["chapter_number"], ch["chapter_name"], ch["description"], topics_json))
        count += 1
    return count


def main():
    """Main seed function."""
    conn = psycopg2.connect(DATABASE_URL, cursor_factory=psycopg2.extras.RealDictCursor)
    cur = conn.cursor()
    
    total = 0
    
    print("\n" + "=" * 60)
    print("SEEDING CBSE CLASS 10 CHAPTERS")
    print("=" * 60)
    
    # CBSE Class 10
    total += seed_chapters(cur, "cbse", "class-10", "Mathematics", CBSE_CLASS_10_MATHEMATICS)
    print(f"  ✓ Mathematics: {len(CBSE_CLASS_10_MATHEMATICS)} chapters")
    
    total += seed_chapters(cur, "cbse", "class-10", "Science", CBSE_CLASS_10_SCIENCE)
    print(f"  ✓ Science: {len(CBSE_CLASS_10_SCIENCE)} chapters")
    
    total += seed_chapters(cur, "cbse", "class-10", "Social Science", CBSE_CLASS_10_SOCIAL_SCIENCE)
    print(f"  ✓ Social Science: {len(CBSE_CLASS_10_SOCIAL_SCIENCE)} chapters")
    
    print("\n" + "=" * 60)
    print("SEEDING CBSE CLASS 9 CHAPTERS")
    print("=" * 60)
    
    # CBSE Class 9
    total += seed_chapters(cur, "cbse", "class-9", "Mathematics", CBSE_CLASS_9_MATHEMATICS)
    print(f"  ✓ Mathematics: {len(CBSE_CLASS_9_MATHEMATICS)} chapters")
    
    total += seed_chapters(cur, "cbse", "class-9", "Science", CBSE_CLASS_9_SCIENCE)
    print(f"  ✓ Science: {len(CBSE_CLASS_9_SCIENCE)} chapters")
    
    print("\n" + "=" * 60)
    print("SEEDING CBSE CLASS 11 CHAPTERS (SCIENCE STREAM)")
    print("=" * 60)
    
    # CBSE Class 11 - Science Stream
    total += seed_chapters(cur, "cbse", "class-11", "Physics", CBSE_CLASS_11_PHYSICS, "science")
    print(f"  ✓ Physics: {len(CBSE_CLASS_11_PHYSICS)} chapters")
    
    total += seed_chapters(cur, "cbse", "class-11", "Chemistry", CBSE_CLASS_11_CHEMISTRY, "science")
    print(f"  ✓ Chemistry: {len(CBSE_CLASS_11_CHEMISTRY)} chapters")
    
    total += seed_chapters(cur, "cbse", "class-11", "Biology", CBSE_CLASS_11_BIOLOGY, "science")
    print(f"  ✓ Biology: {len(CBSE_CLASS_11_BIOLOGY)} chapters")
    
    total += seed_chapters(cur, "cbse", "class-11", "Mathematics", CBSE_CLASS_11_MATHEMATICS, "science")
    print(f"  ✓ Mathematics: {len(CBSE_CLASS_11_MATHEMATICS)} chapters")
    
    print("\n" + "=" * 60)
    print("SEEDING CBSE CLASS 12 CHAPTERS (SCIENCE STREAM)")
    print("=" * 60)
    
    # CBSE Class 12 - Science Stream
    total += seed_chapters(cur, "cbse", "class-12", "Physics", CBSE_CLASS_12_PHYSICS, "science")
    print(f"  ✓ Physics: {len(CBSE_CLASS_12_PHYSICS)} chapters")
    
    total += seed_chapters(cur, "cbse", "class-12", "Chemistry", CBSE_CLASS_12_CHEMISTRY, "science")
    print(f"  ✓ Chemistry: {len(CBSE_CLASS_12_CHEMISTRY)} chapters")
    
    total += seed_chapters(cur, "cbse", "class-12", "Biology", CBSE_CLASS_12_BIOLOGY, "science")
    print(f"  ✓ Biology: {len(CBSE_CLASS_12_BIOLOGY)} chapters")
    
    total += seed_chapters(cur, "cbse", "class-12", "Mathematics", CBSE_CLASS_12_MATHEMATICS, "science")
    print(f"  ✓ Mathematics: {len(CBSE_CLASS_12_MATHEMATICS)} chapters")
    
    conn.commit()
    conn.close()
    
    print("\n" + "=" * 60)
    print(f"SEED COMPLETE: {total} chapters seeded")
    print("=" * 60 + "\n")


if __name__ == "__main__":
    main()
