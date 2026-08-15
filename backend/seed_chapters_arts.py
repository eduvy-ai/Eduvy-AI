"""
CBSE Arts Stream Chapters - Class 11 and 12
=============================================
History, Geography, Political Science, Psychology, Sociology
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

if DATABASE_URL.startswith("postgresql+"):
    DATABASE_URL = "postgresql" + DATABASE_URL[DATABASE_URL.index("://"):]

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
# CBSE CLASS 11 HISTORY (ARTS STREAM)
# ══════════════════════════════════════════════════════════════════════════════

CBSE_CLASS_11_HISTORY = [
    {
        "chapter_number": 1,
        "chapter_name": "From the Beginning of Time",
        "description": "Early humans, evolution of hominids. Stone tools, hunting-gathering societies, and early human settlements.",
        "topics": [
            "The Story of Human Evolution",
            "Early Humans in Africa",
            "Tool Making and Use",
            "Hunter-Gatherer Societies",
            "Early Human Migration",
            "Neanderthals and Homo Sapiens"
        ]
    },
    {
        "chapter_number": 2,
        "chapter_name": "Writing and City Life",
        "description": "Mesopotamian civilization, urbanization. Cuneiform writing, trade, and social organization.",
        "topics": [
            "Mesopotamian Civilization",
            "City Life in Ur",
            "Cuneiform Writing System",
            "Trade and Economy",
            "Social Hierarchy",
            "The Significance of Writing"
        ]
    },
    {
        "chapter_number": 3,
        "chapter_name": "An Empire Across Three Continents",
        "description": "Roman Empire's political organization, economy, and society. Rise and transformation of the empire.",
        "topics": [
            "Roman Empire Overview",
            "Political Structure",
            "Economy and Society",
            "Slavery in Rome",
            "Social Hierarchies",
            "Late Antiquity and Transformation"
        ]
    },
    {
        "chapter_number": 4,
        "chapter_name": "The Central Islamic Lands",
        "description": "Rise of Islam, Caliphate, economy, and culture. Islamic civilization's contributions.",
        "topics": [
            "Rise of Islam",
            "The Caliphate",
            "Economy and Society",
            "Art and Architecture",
            "Learning and Culture",
            "Crusades"
        ]
    },
    {
        "chapter_number": 5,
        "chapter_name": "Nomadic Empires",
        "description": "Mongol Empire, Genghis Khan's conquests. Social and political organization of nomads.",
        "topics": [
            "Nomadic Societies",
            "Rise of Genghis Khan",
            "Mongol Military Organization",
            "Mongol Conquests",
            "Administration of Empire",
            "Legacy of the Mongols"
        ]
    },
    {
        "chapter_number": 6,
        "chapter_name": "The Three Orders",
        "description": "Medieval European feudal society. Clergy, nobility, and peasantry. Economic and social changes.",
        "topics": [
            "Feudal Society Structure",
            "The First Order - Clergy",
            "The Second Order - Nobility",
            "The Third Order - Peasantry",
            "Manorial Economy",
            "Changes in Medieval Society"
        ]
    },
    {
        "chapter_number": 7,
        "chapter_name": "Changing Cultural Traditions",
        "description": "Renaissance in Europe, humanism, art, and architecture. Scientific revolution beginnings.",
        "topics": [
            "The Italian Renaissance",
            "Humanism",
            "Renaissance Art and Artists",
            "Architecture",
            "The Reformation",
            "Scientific Revolution"
        ]
    },
    {
        "chapter_number": 8,
        "chapter_name": "Confrontation of Cultures",
        "description": "European encounters with Americas, Africa, and Asia. Colonization and cultural interactions.",
        "topics": [
            "European Voyages of Exploration",
            "Encounter with the Americas",
            "Conquest of South America",
            "Slave Trade",
            "Impact on Indigenous Peoples",
            "Cultural Exchanges"
        ]
    },
    {
        "chapter_number": 9,
        "chapter_name": "The Industrial Revolution",
        "description": "Industrialization in Britain, technological changes. Social and economic transformations.",
        "topics": [
            "Origins of Industrial Revolution",
            "Technological Innovations",
            "Coal and Iron Industries",
            "Textile Industry Changes",
            "Social Consequences",
            "Urbanization"
        ]
    },
    {
        "chapter_number": 10,
        "chapter_name": "Displacing Indigenous Peoples",
        "description": "Settlement of North America and Australia. Impact on native populations, settler colonialism.",
        "topics": [
            "European Settlement in North America",
            "Native American Displacement",
            "Settlement of Australia",
            "Aboriginal Peoples",
            "Gold Rushes",
            "Impact of Colonization"
        ]
    },
    {
        "chapter_number": 11,
        "chapter_name": "Paths to Modernisation",
        "description": "Modernization in Japan and China. Meiji Restoration, Chinese revolutions.",
        "topics": [
            "Japan Before Modernisation",
            "Meiji Restoration",
            "Japanese Industrialization",
            "China - Qing Dynasty Decline",
            "Opium Wars",
            "Chinese Revolution"
        ]
    }
]

# ══════════════════════════════════════════════════════════════════════════════
# CBSE CLASS 11 GEOGRAPHY (ARTS STREAM)
# ══════════════════════════════════════════════════════════════════════════════

CBSE_CLASS_11_GEOGRAPHY = [
    {
        "chapter_number": 1,
        "chapter_name": "Geography as a Discipline",
        "description": "Nature and scope of geography. Branches of geography, relationship with other sciences.",
        "topics": [
            "What is Geography",
            "Physical and Human Geography",
            "Branches of Geography",
            "Geography and Other Sciences",
            "Approaches to Geography",
            "Significance of Geography"
        ]
    },
    {
        "chapter_number": 2,
        "chapter_name": "The Origin and Evolution of the Earth",
        "description": "Theories of earth's origin, geological time scale. Evolution of atmosphere and hydrosphere.",
        "topics": [
            "Origin of the Earth",
            "Early Theories",
            "Modern Theories",
            "Geological Time Scale",
            "Evolution of Lithosphere",
            "Evolution of Atmosphere and Hydrosphere"
        ]
    },
    {
        "chapter_number": 3,
        "chapter_name": "Interior of the Earth",
        "description": "Earth's interior structure, seismic waves. Composition of earth's layers.",
        "topics": [
            "Sources of Information",
            "Direct Sources",
            "Indirect Sources - Seismic Waves",
            "Structure of Earth's Interior",
            "Crust, Mantle, Core",
            "Volcanoes and Volcanic Landforms"
        ]
    },
    {
        "chapter_number": 4,
        "chapter_name": "Distribution of Oceans and Continents",
        "description": "Continental drift theory, plate tectonics. Formation of oceans and continents.",
        "topics": [
            "Continental Drift Theory",
            "Evidence for Continental Drift",
            "Sea Floor Spreading",
            "Plate Tectonics",
            "Types of Plate Boundaries",
            "Movement of Indian Plate"
        ]
    },
    {
        "chapter_number": 5,
        "chapter_name": "Minerals and Rocks",
        "description": "Classification of minerals and rocks. Rock cycle and geological processes.",
        "topics": [
            "What are Minerals",
            "Physical Properties of Minerals",
            "Classification of Rocks",
            "Igneous Rocks",
            "Sedimentary Rocks",
            "Metamorphic Rocks",
            "Rock Cycle"
        ]
    },
    {
        "chapter_number": 6,
        "chapter_name": "Geomorphic Processes",
        "description": "Endogenic and exogenic forces. Weathering, mass wasting, erosion.",
        "topics": [
            "Geomorphic Agents and Processes",
            "Endogenic Processes - Diastrophism",
            "Volcanism",
            "Exogenic Processes",
            "Weathering - Types",
            "Mass Movements"
        ]
    },
    {
        "chapter_number": 7,
        "chapter_name": "Landforms and Their Evolution",
        "description": "Landforms created by running water, groundwater, glaciers, wind, and waves.",
        "topics": [
            "Running Water Landforms",
            "Groundwater Landforms",
            "Glacial Landforms",
            "Aeolian (Wind) Landforms",
            "Coastal Landforms",
            "Karst Topography"
        ]
    },
    {
        "chapter_number": 8,
        "chapter_name": "Composition and Structure of Atmosphere",
        "description": "Atmosphere composition, layers. Solar radiation, heat balance.",
        "topics": [
            "Composition of Atmosphere",
            "Structure of Atmosphere",
            "Troposphere, Stratosphere",
            "Insolation",
            "Heat Budget",
            "Temperature Distribution"
        ]
    },
    {
        "chapter_number": 9,
        "chapter_name": "Solar Radiation, Heat Balance and Temperature",
        "description": "Factors affecting temperature distribution. Global temperature patterns.",
        "topics": [
            "Insolation",
            "Factors Affecting Insolation",
            "Heat Budget of Earth",
            "Variation in Temperature",
            "Temperature Inversion",
            "Global Temperature Distribution"
        ]
    },
    {
        "chapter_number": 10,
        "chapter_name": "Atmospheric Circulation and Weather Systems",
        "description": "Atmospheric pressure, winds, air masses. Cyclones and weather phenomena.",
        "topics": [
            "Atmospheric Pressure",
            "Pressure Belts",
            "Wind Systems",
            "Air Masses",
            "Fronts",
            "Cyclones - Tropical and Temperate"
        ]
    },
    {
        "chapter_number": 11,
        "chapter_name": "Water in the Atmosphere",
        "description": "Humidity, evaporation, condensation. Precipitation types and distribution.",
        "topics": [
            "Water Vapour in Atmosphere",
            "Evaporation and Condensation",
            "Humidity",
            "Dew, Frost, Fog",
            "Clouds - Types",
            "Precipitation - Types and Distribution"
        ]
    },
    {
        "chapter_number": 12,
        "chapter_name": "World Climate and Climate Change",
        "description": "Classification of world climates. Climate change causes and effects.",
        "topics": [
            "Climate Classification",
            "Koeppen's Scheme",
            "Major Climate Types",
            "Climate Change",
            "Causes of Climate Change",
            "Global Warming and Effects"
        ]
    },
    {
        "chapter_number": 13,
        "chapter_name": "Water (Oceans)",
        "description": "Ocean water properties, movements. Waves, tides, currents.",
        "topics": [
            "Hydrological Cycle",
            "Ocean Relief",
            "Temperature of Ocean Water",
            "Salinity",
            "Waves",
            "Ocean Currents",
            "Tides"
        ]
    },
    {
        "chapter_number": 14,
        "chapter_name": "Movements of Ocean Water",
        "description": "Ocean waves, currents, and tides. Importance of ocean movements.",
        "topics": [
            "Waves - Formation and Types",
            "Ocean Currents",
            "Types of Ocean Currents",
            "Effects of Ocean Currents",
            "Tides - Types",
            "Importance of Tides"
        ]
    },
    {
        "chapter_number": 15,
        "chapter_name": "Life on the Earth",
        "description": "Biosphere, ecosystems, biodiversity. Environmental degradation and conservation.",
        "topics": [
            "The Biosphere",
            "Ecosystem",
            "Components of Ecosystem",
            "Biomes",
            "Biodiversity",
            "Conservation of Biodiversity"
        ]
    }
]

# ══════════════════════════════════════════════════════════════════════════════
# CBSE CLASS 11 POLITICAL SCIENCE (ARTS STREAM)
# ══════════════════════════════════════════════════════════════════════════════

CBSE_CLASS_11_POLITICAL_SCIENCE = [
    # Part A: Indian Constitution at Work
    {
        "chapter_number": 1,
        "chapter_name": "Constitution: Why and How?",
        "description": "Need for constitution, making of Indian Constitution. Constituent Assembly and its work.",
        "topics": [
            "Why Do We Need a Constitution",
            "Making of the Indian Constitution",
            "The Constituent Assembly",
            "Procedure of the Constituent Assembly",
            "Inheritance and Originality",
            "Philosophy of the Constitution"
        ]
    },
    {
        "chapter_number": 2,
        "chapter_name": "Rights in the Indian Constitution",
        "description": "Fundamental Rights, Directive Principles. Relationship between rights and duties.",
        "topics": [
            "Bill of Rights",
            "Fundamental Rights - Types",
            "Right to Equality",
            "Right to Freedom",
            "Directive Principles of State Policy",
            "Fundamental Duties"
        ]
    },
    {
        "chapter_number": 3,
        "chapter_name": "Election and Representation",
        "description": "Electoral system in India, Election Commission. Representation and electoral reforms.",
        "topics": [
            "Elections and Democracy",
            "Electoral System in India",
            "Reserved Constituencies",
            "Free and Fair Elections",
            "Election Commission",
            "Electoral Reforms"
        ]
    },
    {
        "chapter_number": 4,
        "chapter_name": "Executive",
        "description": "President, Prime Minister, Council of Ministers. Parliamentary vs Presidential system.",
        "topics": [
            "Types of Executive",
            "Parliamentary System",
            "President of India",
            "Prime Minister and Council of Ministers",
            "Permanent Executive - Bureaucracy",
            "Executive Powers"
        ]
    },
    {
        "chapter_number": 5,
        "chapter_name": "Legislature",
        "description": "Parliament structure, powers, and functions. Law-making process.",
        "topics": [
            "Why Do We Need a Parliament",
            "Two Houses of Parliament",
            "Lok Sabha and Rajya Sabha",
            "Functions of Parliament",
            "Law-Making Process",
            "Parliamentary Control"
        ]
    },
    {
        "chapter_number": 6,
        "chapter_name": "Judiciary",
        "description": "Structure of judiciary, independence. Judicial review and judicial activism.",
        "topics": [
            "Independence of Judiciary",
            "Structure of Judiciary",
            "Supreme Court of India",
            "High Courts",
            "Judicial Review",
            "Judicial Activism"
        ]
    },
    {
        "chapter_number": 7,
        "chapter_name": "Federalism",
        "description": "Federal structure, Centre-State relations. Issues in Indian federalism.",
        "topics": [
            "What is Federalism",
            "Indian Federal System",
            "Centre-State Relations",
            "Tensions in Federation",
            "Special Provisions",
            "Inter-State Relations"
        ]
    },
    {
        "chapter_number": 8,
        "chapter_name": "Local Governments",
        "description": "Panchayati Raj, urban local bodies. Decentralization and local governance.",
        "topics": [
            "Why Local Governments",
            "Growth of Local Government",
            "73rd and 74th Amendments",
            "Panchayati Raj",
            "Municipalities",
            "Challenges of Local Government"
        ]
    },
    # Part B: Political Theory
    {
        "chapter_number": 9,
        "chapter_name": "Political Theory: An Introduction",
        "description": "What is politics, political theory. Relevance and scope of political theory.",
        "topics": [
            "What is Politics",
            "What is Political Theory",
            "Politics as Public Affairs",
            "Studying Political Theory",
            "Democracy and Political Theory",
            "Indian Political Thought"
        ]
    },
    {
        "chapter_number": 10,
        "chapter_name": "Freedom",
        "description": "Meaning of freedom, constraints on freedom. Negative and positive liberty.",
        "topics": [
            "The Ideal of Freedom",
            "What is Freedom",
            "Why Freedom Matters",
            "Harm Principle",
            "Negative Liberty",
            "Positive Liberty"
        ]
    },
    {
        "chapter_number": 11,
        "chapter_name": "Equality",
        "description": "Different dimensions of equality. Affirmative action and social justice.",
        "topics": [
            "Significance of Equality",
            "What is Equality",
            "Different Dimensions of Equality",
            "Natural and Social Inequalities",
            "Three Dimensions of Equality",
            "Affirmative Action"
        ]
    },
    {
        "chapter_number": 12,
        "chapter_name": "Social Justice",
        "description": "Meaning of social justice, distributive justice. Rawls' theory of justice.",
        "topics": [
            "What is Justice",
            "Just Distribution",
            "Rawls' Theory of Justice",
            "Pursuing Social Justice",
            "Justice in India",
            "Social Justice and Equality"
        ]
    },
    {
        "chapter_number": 13,
        "chapter_name": "Rights",
        "description": "Natural rights, legal rights, human rights. Rights and obligations.",
        "topics": [
            "What are Rights",
            "Where Do Rights Come From",
            "Legal Rights and State",
            "Natural Rights",
            "Human Rights",
            "Rights and Duties"
        ]
    },
    {
        "chapter_number": 14,
        "chapter_name": "Citizenship",
        "description": "Meaning of citizenship, global citizenship. Citizenship rights and responsibilities.",
        "topics": [
            "What is Citizenship",
            "Citizen and State",
            "Full and Equal Membership",
            "Universal Citizenship",
            "Global Citizenship",
            "Citizenship in India"
        ]
    },
    {
        "chapter_number": 15,
        "chapter_name": "Nationalism",
        "description": "Nation and nationalism, national self-determination. Critique of nationalism.",
        "topics": [
            "Nations and Nationalism",
            "National Self-Determination",
            "Nationalism in India",
            "Challenges of Nationalism",
            "Limits of Nationalism",
            "Beyond Nationalism"
        ]
    },
    {
        "chapter_number": 16,
        "chapter_name": "Secularism",
        "description": "Religion and politics, Western and Indian secularism. Critique of secularism.",
        "topics": [
            "What is Secularism",
            "What is Secular State",
            "Western Model of Secularism",
            "Indian Secularism",
            "Criticisms of Secularism",
            "Secularism in Practice"
        ]
    }
]

# ══════════════════════════════════════════════════════════════════════════════
# CBSE CLASS 12 HISTORY (ARTS STREAM)
# ══════════════════════════════════════════════════════════════════════════════

CBSE_CLASS_12_HISTORY = [
    {
        "chapter_number": 1,
        "chapter_name": "Bricks, Beads and Bones",
        "description": "Harappan civilization, urban planning, crafts, and trade. Archaeological evidence.",
        "topics": [
            "Harappan Civilization",
            "Urban Planning",
            "Subsistence Strategies",
            "Crafts and Technology",
            "Trade and Exchange",
            "End of the Civilization"
        ]
    },
    {
        "chapter_number": 2,
        "chapter_name": "Kings, Farmers and Towns",
        "description": "Early states and economies. Mauryan Empire, agrarian economy, cities and trade.",
        "topics": [
            "Early States",
            "New Notions of Kingship",
            "Mauryan Empire",
            "New Coinage and Economy",
            "Cities and Trade",
            "Prinsep and the Inscriptions"
        ]
    },
    {
        "chapter_number": 3,
        "chapter_name": "Kinship, Caste and Class",
        "description": "Social hierarchies in ancient India. Mahabharata as a source, family and gender.",
        "topics": [
            "Mahabharata - A Story of Kinship",
            "Finding Out About Families",
            "Rules and Practices",
            "Social Differences",
            "Handling Texts",
            "Gender and Patriarchy"
        ]
    },
    {
        "chapter_number": 4,
        "chapter_name": "Thinkers, Beliefs and Buildings",
        "description": "Early religious beliefs, Buddhism, Jainism. Buddhist architecture at Sanchi.",
        "topics": [
            "A Background to Religions",
            "Buddhism - Teachings",
            "The Stupas",
            "Sculpture at Sanchi",
            "Discovering Buddhism",
            "Understanding Symbols"
        ]
    },
    {
        "chapter_number": 5,
        "chapter_name": "Through the Eyes of Travellers",
        "description": "Foreign travellers' accounts - Al-Biruni, Ibn Battuta, Bernier.",
        "topics": [
            "Al-Biruni and the Kitab-ul-Hind",
            "Ibn Battuta's Rihla",
            "Francois Bernier's Account",
            "Comparing Accounts",
            "Women in Travellers' Accounts",
            "Value of Travellers' Accounts"
        ]
    },
    {
        "chapter_number": 6,
        "chapter_name": "Bhakti-Sufi Traditions",
        "description": "Religious developments from 8th to 18th century. Bhakti and Sufi movements.",
        "topics": [
            "Ideas of Bhakti",
            "Songs and Stories",
            "Sufi Traditions",
            "Relations with the State",
            "New Devotional Paths",
            "Contemporary Significance"
        ]
    },
    {
        "chapter_number": 7,
        "chapter_name": "An Imperial Capital: Vijayanagara",
        "description": "Vijayanagara Empire, architecture, society. Hampi as imperial capital.",
        "topics": [
            "Discovery of Hampi",
            "Rayas, Nayakas and Sultans",
            "The Architecture of the City",
            "Sacred Centre",
            "Urban Core",
            "Fortifications and Roads"
        ]
    },
    {
        "chapter_number": 8,
        "chapter_name": "Peasants, Zamindars and the State",
        "description": "Agrarian relations 16th-17th century. Ain-i-Akbari as source.",
        "topics": [
            "Peasant and Agriculture",
            "Caste and Agricultural Production",
            "Panchayats and Villages",
            "The Zamindars",
            "Land Revenue System",
            "Ain-i-Akbari - The Source"
        ]
    },
    {
        "chapter_number": 9,
        "chapter_name": "Kings and Chronicles",
        "description": "Mughal court, ideology of empire. Manuscripts and paintings as sources.",
        "topics": [
            "The Mughal Chronicles",
            "The Mughal Household",
            "The Imperial Pillar",
            "Ideal of Justice",
            "Akbar's Sulh-i-Kul",
            "Mughal Manuscript Culture"
        ]
    },
    {
        "chapter_number": 10,
        "chapter_name": "Colonialism and the Countryside",
        "description": "Colonial agrarian policies, peasant rebellions. Land revenue systems.",
        "topics": [
            "Bengal and Permanent Settlement",
            "The Paharias and Santhals",
            "Bombay Deccan",
            "Deccan Riots",
            "Colonial Reports",
            "Peasant Resistance"
        ]
    },
    {
        "chapter_number": 11,
        "chapter_name": "Rebels and the Raj",
        "description": "1857 Revolt, causes, spread, repression. Popular memories and representations.",
        "topics": [
            "Pattern of the Rebellion",
            "Leadership and Organization",
            "Rumours and Prophecies",
            "Vision of Unity",
            "British Response",
            "Images of the Revolt"
        ]
    },
    {
        "chapter_number": 12,
        "chapter_name": "Colonial Cities",
        "description": "Urbanisation, architecture, town planning. Colonial interventions in Indian cities.",
        "topics": [
            "Urban Patterns",
            "Bombay, Calcutta, Madras",
            "Social Milieu",
            "Architecture",
            "Town Planning",
            "New Delhi"
        ]
    },
    {
        "chapter_number": 13,
        "chapter_name": "Mahatma Gandhi and the Nationalist Movement",
        "description": "Gandhi's role in freedom struggle. Non-violent resistance, mass movements.",
        "topics": [
            "Gandhi's Political Career",
            "Non-Cooperation Movement",
            "Civil Disobedience Movement",
            "Quit India Movement",
            "Gandhi's Methods",
            "Last Years and Legacy"
        ]
    },
    {
        "chapter_number": 14,
        "chapter_name": "Understanding Partition",
        "description": "Politics of partition, trauma of refugees. Oral histories and narratives.",
        "topics": [
            "Why Partition",
            "Muslim League and Congress",
            "Planning and Implementation",
            "Violence and Displacement",
            "Oral Histories",
            "Remembering Partition"
        ]
    },
    {
        "chapter_number": 15,
        "chapter_name": "Framing the Constitution",
        "description": "Constitution-making debates. Vision of the constitution makers.",
        "topics": [
            "Constituent Assembly",
            "Objectives Resolution",
            "Debates on Fundamental Rights",
            "Language and Minorities",
            "Political Vision",
            "Adoption of Constitution"
        ]
    }
]

# ══════════════════════════════════════════════════════════════════════════════
# CBSE CLASS 12 GEOGRAPHY (ARTS STREAM)
# ══════════════════════════════════════════════════════════════════════════════

CBSE_CLASS_12_GEOGRAPHY = [
    # Part A: Fundamentals of Human Geography
    {
        "chapter_number": 1,
        "chapter_name": "Human Geography: Nature and Scope",
        "description": "Meaning and scope of human geography. Man-environment relationship.",
        "topics": [
            "What is Human Geography",
            "Nature of Human Geography",
            "Fields of Human Geography",
            "Man-Environment Relationship",
            "Schools of Human Geography",
            "Contemporary Approaches"
        ]
    },
    {
        "chapter_number": 2,
        "chapter_name": "The World Population: Distribution, Density and Growth",
        "description": "Population distribution patterns, density, and growth. Demographic transition.",
        "topics": [
            "Population Distribution",
            "Density of Population",
            "Factors Affecting Distribution",
            "Population Growth",
            "Demographic Transition",
            "Population Control"
        ]
    },
    {
        "chapter_number": 3,
        "chapter_name": "Population Composition",
        "description": "Age-sex composition, occupational structure. Population pyramids.",
        "topics": [
            "Age Structure",
            "Sex Ratio",
            "Population Pyramids",
            "Rural-Urban Composition",
            "Literacy",
            "Occupational Structure"
        ]
    },
    {
        "chapter_number": 4,
        "chapter_name": "Human Development",
        "description": "Concept of human development, HDI. Development approaches.",
        "topics": [
            "Growth and Development",
            "Human Development Concept",
            "Approaches to Human Development",
            "Human Development Index",
            "International Comparisons",
            "India's HDI"
        ]
    },
    {
        "chapter_number": 5,
        "chapter_name": "Primary Activities",
        "description": "Gathering, pastoral, mining, fishing activities. Agriculture types.",
        "topics": [
            "Primary Activities",
            "Hunting and Gathering",
            "Pastoral Activities",
            "Agriculture - Types",
            "Mining",
            "Fishing"
        ]
    },
    {
        "chapter_number": 6,
        "chapter_name": "Secondary Activities",
        "description": "Manufacturing industries, types and factors. Industrial regions.",
        "topics": [
            "Manufacturing",
            "Types of Industries",
            "Factors Affecting Industry",
            "Industrial Regions",
            "Traditional vs Modern",
            "High-Tech Industries"
        ]
    },
    {
        "chapter_number": 7,
        "chapter_name": "Tertiary and Quaternary Activities",
        "description": "Service sector, trade, transport. Knowledge-based activities.",
        "topics": [
            "Tertiary Activities",
            "Trade - Retail and Wholesale",
            "Transport and Communication",
            "Tourism",
            "Quaternary Activities",
            "Quinary Activities"
        ]
    },
    {
        "chapter_number": 8,
        "chapter_name": "Transport and Communication",
        "description": "Means of transport, communication networks. Modern transportation.",
        "topics": [
            "Land Transport",
            "Water Transport",
            "Air Transport",
            "Pipelines",
            "Communication",
            "Satellite Communication"
        ]
    },
    {
        "chapter_number": 9,
        "chapter_name": "International Trade",
        "description": "Basis of international trade, WTO. Regional trading blocs.",
        "topics": [
            "Basis of International Trade",
            "Components of Trade",
            "Types of International Trade",
            "Trade Balance",
            "WTO",
            "Regional Trade Blocs"
        ]
    },
    {
        "chapter_number": 10,
        "chapter_name": "Human Settlements",
        "description": "Rural and urban settlements. Urbanization patterns.",
        "topics": [
            "Types of Settlements",
            "Rural Settlements",
            "Urban Settlements",
            "Classification of Urban Centres",
            "Urbanisation",
            "Smart Cities"
        ]
    },
    # Part B: India - People and Economy
    {
        "chapter_number": 11,
        "chapter_name": "Population: Distribution, Density, Growth and Composition",
        "description": "India's population characteristics. Demographic patterns and challenges.",
        "topics": [
            "Population Distribution",
            "Density of Population",
            "Population Growth",
            "Population Composition",
            "Migration",
            "Population Policy"
        ]
    },
    {
        "chapter_number": 12,
        "chapter_name": "Migration: Types, Causes and Consequences",
        "description": "Internal and international migration. Push and pull factors.",
        "topics": [
            "Types of Migration",
            "Spatial Migration",
            "Rural-Urban Migration",
            "Causes of Migration",
            "Push and Pull Factors",
            "Consequences of Migration"
        ]
    },
    {
        "chapter_number": 13,
        "chapter_name": "Human Development",
        "description": "Human development in India. State-wise variations.",
        "topics": [
            "Human Development in India",
            "National Trends",
            "State-Level Variations",
            "Health Indicators",
            "Education Indicators",
            "Development Challenges"
        ]
    },
    {
        "chapter_number": 14,
        "chapter_name": "Human Settlements",
        "description": "Rural and urban settlements in India. Town planning.",
        "topics": [
            "Rural Settlements in India",
            "Types of Rural Settlements",
            "Urban Settlements",
            "Types of Urban Settlements",
            "Urban Problems",
            "Town Planning"
        ]
    },
    {
        "chapter_number": 15,
        "chapter_name": "Land Resources and Agriculture",
        "description": "Land use, agricultural development. Problems and reforms.",
        "topics": [
            "Land Use Categories",
            "Agricultural Land Use",
            "Cropping Pattern",
            "Agricultural Development",
            "Problems of Agriculture",
            "Agricultural Reforms"
        ]
    },
    {
        "chapter_number": 16,
        "chapter_name": "Water Resources",
        "description": "Water resources in India, management. Conservation strategies.",
        "topics": [
            "Water Resources Availability",
            "Surface Water",
            "Groundwater",
            "Demand and Utilization",
            "Water Quality",
            "Conservation and Management"
        ]
    },
    {
        "chapter_number": 17,
        "chapter_name": "Mineral and Energy Resources",
        "description": "Distribution of minerals in India. Energy resources and conservation.",
        "topics": [
            "Distribution of Minerals",
            "Metallic Minerals",
            "Non-Metallic Minerals",
            "Energy Resources - Conventional",
            "Non-Conventional Energy",
            "Conservation of Resources"
        ]
    },
    {
        "chapter_number": 18,
        "chapter_name": "Manufacturing Industries",
        "description": "Industrial development in India. Major industries and regions.",
        "topics": [
            "Industrial Development",
            "Industrial Policies",
            "Types of Industries",
            "Major Industries",
            "Industrial Regions",
            "Industrial Problems"
        ]
    },
    {
        "chapter_number": 19,
        "chapter_name": "Planning and Sustainable Development in Indian Context",
        "description": "Target area planning, sustainable development. Case studies.",
        "topics": [
            "Regional Planning",
            "Target Area Planning",
            "Sustainable Development",
            "Hill Area Development",
            "Drought Prone Area Programme",
            "Integrated Development"
        ]
    },
    {
        "chapter_number": 20,
        "chapter_name": "Transport and Communication",
        "description": "Transport infrastructure in India. Communication networks.",
        "topics": [
            "Land Transport - Roads, Railways",
            "Water Transport",
            "Air Transport",
            "Pipelines",
            "Communication",
            "Emerging Modes"
        ]
    },
    {
        "chapter_number": 21,
        "chapter_name": "International Trade",
        "description": "India's foreign trade. Trading partners and exports.",
        "topics": [
            "Changing Pattern of Trade",
            "Exports and Imports",
            "Direction of Trade",
            "Trade Balance",
            "Sea Ports and Air Ports",
            "Trade Policy"
        ]
    },
    {
        "chapter_number": 22,
        "chapter_name": "Geographical Perspective on Selected Issues and Problems",
        "description": "Environmental pollution, urban problems. Global concerns.",
        "topics": [
            "Environmental Pollution",
            "Water Pollution",
            "Air Pollution",
            "Urban Waste Disposal",
            "Slums",
            "Land Degradation"
        ]
    }
]

# ══════════════════════════════════════════════════════════════════════════════
# CBSE CLASS 12 POLITICAL SCIENCE (ARTS STREAM)
# ══════════════════════════════════════════════════════════════════════════════

CBSE_CLASS_12_POLITICAL_SCIENCE = [
    # Part A: Contemporary World Politics
    {
        "chapter_number": 1,
        "chapter_name": "The Cold War Era",
        "description": "US-Soviet rivalry, nuclear arms race. NAM and India's role.",
        "topics": [
            "Emergence of Two Power Blocs",
            "Arenas of the Cold War",
            "Nuclear Arms Race",
            "Non-Aligned Movement",
            "India and the Cold War",
            "End of Cold War"
        ]
    },
    {
        "chapter_number": 2,
        "chapter_name": "The End of Bipolarity",
        "description": "Collapse of Soviet Union, emergence of new states. Shock therapy.",
        "topics": [
            "Crisis in Soviet Union",
            "Gorbachev's Reforms",
            "Fall of Soviet Union",
            "Consequences",
            "Shock Therapy",
            "India and Post-Soviet States"
        ]
    },
    {
        "chapter_number": 3,
        "chapter_name": "US Hegemony in World Politics",
        "description": "American dominance, military interventions. Resistance to hegemony.",
        "topics": [
            "US as Sole Superpower",
            "Operation Desert Storm",
            "9/11 and War on Terror",
            "US Military Dominance",
            "Soft Power",
            "Constraints on US Hegemony"
        ]
    },
    {
        "chapter_number": 4,
        "chapter_name": "Alternative Centres of Power",
        "description": "European Union, ASEAN, China's rise. Emerging power centres.",
        "topics": [
            "European Union",
            "Association of Southeast Asian Nations",
            "Rise of China",
            "China-India Relations",
            "Japan and Korea",
            "Alternative Power Centres"
        ]
    },
    {
        "chapter_number": 5,
        "chapter_name": "Contemporary South Asia",
        "description": "Democracies and military regimes. India's relations with neighbors.",
        "topics": [
            "South Asian Countries",
            "India-Pakistan Relations",
            "India-Nepal Relations",
            "India-Sri Lanka Relations",
            "India-Bangladesh Relations",
            "SAARC"
        ]
    },
    {
        "chapter_number": 6,
        "chapter_name": "International Organisations",
        "description": "UN reform, role of international organizations. Global governance.",
        "topics": [
            "United Nations",
            "UN Reform",
            "India and UN Security Council",
            "IMF, World Bank, WTO",
            "International NGOs",
            "Global Governance"
        ]
    },
    {
        "chapter_number": 7,
        "chapter_name": "Security in the Contemporary World",
        "description": "Traditional and non-traditional security threats. India's security strategy.",
        "topics": [
            "Traditional Security",
            "Non-Traditional Security",
            "Terrorism",
            "Human Security",
            "Global Security",
            "India's Security Policy"
        ]
    },
    {
        "chapter_number": 8,
        "chapter_name": "Environment and Natural Resources",
        "description": "Global environmental issues, resource geopolitics. Sustainable development.",
        "topics": [
            "Environmental Movements",
            "Resource Geopolitics",
            "Climate Change",
            "Indigenous Peoples",
            "Environmental Agreements",
            "India's Environment Policy"
        ]
    },
    {
        "chapter_number": 9,
        "chapter_name": "Globalisation",
        "description": "Dimensions of globalisation, impact on state. Resistance to globalisation.",
        "topics": [
            "What is Globalisation",
            "Causes of Globalisation",
            "Consequences of Globalisation",
            "Cultural Globalisation",
            "India and Globalisation",
            "Resistance to Globalisation"
        ]
    },
    # Part B: Politics in India Since Independence
    {
        "chapter_number": 10,
        "chapter_name": "Challenges of Nation Building",
        "description": "Partition, integration of states. Reorganisation of states.",
        "topics": [
            "Challenge of Partition",
            "Integration of Princely States",
            "Sardar Patel's Role",
            "Reorganisation of States",
            "Language and State Formation",
            "Nation Building Process"
        ]
    },
    {
        "chapter_number": 11,
        "chapter_name": "Era of One-Party Dominance",
        "description": "Congress system, first general elections. Opposition and socialist parties.",
        "topics": [
            "Challenge of Elections",
            "Congress Dominance",
            "Nature of Congress System",
            "Coalition Nature of Congress",
            "Opposition Parties",
            "Socialist Parties"
        ]
    },
    {
        "chapter_number": 12,
        "chapter_name": "Politics of Planned Development",
        "description": "Planning commission, five year plans. Debates on development.",
        "topics": [
            "Ideas of Development",
            "Planning Commission",
            "Five Year Plans",
            "Debates on Development",
            "Agriculture vs Industry",
            "Green Revolution"
        ]
    },
    {
        "chapter_number": 13,
        "chapter_name": "India's External Relations",
        "description": "Foreign policy, wars with neighbors. Nuclear policy.",
        "topics": [
            "Nehru's Foreign Policy",
            "Non-Alignment",
            "Sino-Indian War",
            "Indo-Pak Wars",
            "Bangladesh Formation",
            "Nuclear Policy"
        ]
    },
    {
        "chapter_number": 14,
        "chapter_name": "Challenges to and Restoration of Congress System",
        "description": "Congress split, 1971 elections. Emergency and its aftermath.",
        "topics": [
            "Challenge to Congress",
            "1967 Elections",
            "Congress Split",
            "1971 Elections",
            "Emergency",
            "Post-Emergency Politics"
        ]
    },
    {
        "chapter_number": 15,
        "chapter_name": "Rise of Popular Movements",
        "description": "Social movements, environmental movements. Women's movements.",
        "topics": [
            "Nature of Popular Movements",
            "Chipko Movement",
            "Anti-Arrack Movement",
            "Narmada Bachao Andolan",
            "Right to Information",
            "Women's Movements"
        ]
    },
    {
        "chapter_number": 16,
        "chapter_name": "Regional Aspirations",
        "description": "Regional movements, insurgency. Center-state tensions.",
        "topics": [
            "Regional Aspirations",
            "Jammu and Kashmir",
            "Punjab Crisis",
            "North-East Issues",
            "Dravidian Movement",
            "Accommodation of Diversity"
        ]
    },
    {
        "chapter_number": 17,
        "chapter_name": "Recent Developments in Indian Politics",
        "description": "Coalition era, new economic policy. Rise of BJP and regional parties.",
        "topics": [
            "Context of 1990s",
            "Era of Coalitions",
            "Rise of BJP",
            "Mandal Commission",
            "New Economic Policy",
            "Regional Parties"
        ]
    }
]

# ══════════════════════════════════════════════════════════════════════════════
# CBSE CLASS 11 PSYCHOLOGY (ARTS STREAM)
# ══════════════════════════════════════════════════════════════════════════════

CBSE_CLASS_11_PSYCHOLOGY = [
    {
        "chapter_number": 1,
        "chapter_name": "What is Psychology?",
        "description": "Definition, evolution of psychology. Psychology as a discipline, branches of psychology.",
        "topics": [
            "What is Psychology",
            "Evolution of Psychology",
            "Development of Psychology in India",
            "Branches of Psychology",
            "Themes of Research",
            "Psychology and Other Disciplines"
        ]
    },
    {
        "chapter_number": 2,
        "chapter_name": "Methods of Enquiry in Psychology",
        "description": "Scientific method, research methods. Observation, experiment, survey.",
        "topics": [
            "Goals of Psychological Enquiry",
            "Scientific Method",
            "Observation Method",
            "Experimental Method",
            "Survey Method",
            "Ethics in Psychological Research"
        ]
    },
    {
        "chapter_number": 3,
        "chapter_name": "The Bases of Human Behaviour",
        "description": "Biological basis of behavior. Nervous system, brain, endocrine system.",
        "topics": [
            "Evolutionary Perspective",
            "Nervous System",
            "The Brain",
            "Endocrine System",
            "Heredity",
            "Culture and Behaviour"
        ]
    },
    {
        "chapter_number": 4,
        "chapter_name": "Human Development",
        "description": "Life span development, factors influencing development. Stages of development.",
        "topics": [
            "Meaning of Development",
            "Factors Influencing Development",
            "Context of Development",
            "Stages - Infancy",
            "Childhood and Adolescence",
            "Adulthood and Old Age"
        ]
    },
    {
        "chapter_number": 5,
        "chapter_name": "Sensory, Attentional and Perceptual Processes",
        "description": "Sensation, attention, and perception. Perceptual organization.",
        "topics": [
            "Sensation",
            "Attentional Processes",
            "Selective Attention",
            "Perceptual Processes",
            "Laws of Perceptual Organisation",
            "Socio-cultural Factors in Perception"
        ]
    },
    {
        "chapter_number": 6,
        "chapter_name": "Learning",
        "description": "Learning theories, classical and operant conditioning. Observational learning.",
        "topics": [
            "Nature of Learning",
            "Paradigms of Learning",
            "Classical Conditioning",
            "Operant Conditioning",
            "Observational Learning",
            "Cognitive Learning"
        ]
    },
    {
        "chapter_number": 7,
        "chapter_name": "Human Memory",
        "description": "Memory processes, types of memory. Forgetting and improving memory.",
        "topics": [
            "Nature of Memory",
            "Memory System - Encoding, Storage, Retrieval",
            "Types of Memory",
            "Nature of Forgetting",
            "Enhancing Memory",
            "Memory Improvement Strategies"
        ]
    },
    {
        "chapter_number": 8,
        "chapter_name": "Thinking",
        "description": "Thinking processes, reasoning, problem solving. Creativity and language.",
        "topics": [
            "Nature of Thinking",
            "Building Blocks of Thought",
            "Reasoning",
            "Problem Solving",
            "Decision Making",
            "Creative Thinking",
            "Language and Thought"
        ]
    },
    {
        "chapter_number": 9,
        "chapter_name": "Motivation and Emotion",
        "description": "Nature of motivation, types. Emotions, expression and regulation.",
        "topics": [
            "Nature of Motivation",
            "Types of Motives",
            "Hierarchy of Needs",
            "Nature of Emotions",
            "Physiological Bases",
            "Expression of Emotions",
            "Managing Emotions"
        ]
    }
]

# ══════════════════════════════════════════════════════════════════════════════
# CBSE CLASS 12 PSYCHOLOGY (ARTS STREAM)
# ══════════════════════════════════════════════════════════════════════════════

CBSE_CLASS_12_PSYCHOLOGY = [
    {
        "chapter_number": 1,
        "chapter_name": "Variations in Psychological Attributes",
        "description": "Individual differences, intelligence. Assessment of psychological attributes.",
        "topics": [
            "Individual Differences",
            "Assessment of Psychological Attributes",
            "Intelligence",
            "Theories of Intelligence",
            "Assessment of Intelligence",
            "Emotional Intelligence"
        ]
    },
    {
        "chapter_number": 2,
        "chapter_name": "Self and Personality",
        "description": "Concept of self, personality theories. Assessment of personality.",
        "topics": [
            "Concept of Self",
            "Self-Esteem and Self-Efficacy",
            "Personality Theories",
            "Trait Approach",
            "Type and Trait Theories",
            "Personality Assessment"
        ]
    },
    {
        "chapter_number": 3,
        "chapter_name": "Meeting Life Challenges",
        "description": "Stress, coping strategies. Promoting positive health.",
        "topics": [
            "Nature of Stress",
            "Sources of Stress",
            "Effects of Stress",
            "Coping with Stress",
            "Stress Management",
            "Positive Health"
        ]
    },
    {
        "chapter_number": 4,
        "chapter_name": "Psychological Disorders",
        "description": "Concept of abnormality, classification of disorders. Major psychological disorders.",
        "topics": [
            "Concepts of Abnormality",
            "Classification of Disorders",
            "Anxiety Disorders",
            "Mood Disorders",
            "Schizophrenia",
            "Substance-Related Disorders"
        ]
    },
    {
        "chapter_number": 5,
        "chapter_name": "Therapeutic Approaches",
        "description": "Types of therapies, psychotherapy. Rehabilitation of mentally ill.",
        "topics": [
            "Nature of Therapy",
            "Types of Therapies",
            "Psychodynamic Therapy",
            "Behaviour Therapies",
            "Cognitive Therapies",
            "Rehabilitation"
        ]
    },
    {
        "chapter_number": 6,
        "chapter_name": "Attitude and Social Cognition",
        "description": "Attitudes, attitude formation and change. Social cognition.",
        "topics": [
            "Explaining Social Behaviour",
            "Nature of Attitudes",
            "Attitude Formation",
            "Attitude Change",
            "Prejudice and Discrimination",
            "Social Cognition"
        ]
    },
    {
        "chapter_number": 7,
        "chapter_name": "Social Influence and Group Processes",
        "description": "Groups, conformity, obedience. Leadership and intergroup relations.",
        "topics": [
            "Nature of Groups",
            "Types of Groups",
            "Influence of Group on Behaviour",
            "Conformity and Obedience",
            "Cooperation and Competition",
            "Social Identity"
        ]
    },
    {
        "chapter_number": 8,
        "chapter_name": "Psychology and Life",
        "description": "Environmental psychology, positive psychology. Application of psychology.",
        "topics": [
            "Human-Environment Relationship",
            "Environmental Effects",
            "Promoting Pro-Environmental Behaviour",
            "Psychology and Social Concerns",
            "Aggression and Violence",
            "Health and Well-being"
        ]
    },
    {
        "chapter_number": 9,
        "chapter_name": "Developing Psychological Skills",
        "description": "Competencies of psychologists. Communication and counseling skills.",
        "topics": [
            "Effective Psychologist",
            "General Skills",
            "Observational Skills",
            "Communication Skills",
            "Psychological Testing Skills",
            "Interviewing Skills",
            "Counselling Skills"
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
    print("SEEDING CBSE CLASS 11 ARTS STREAM")
    print("=" * 60)
    
    total += seed_chapters(cur, "cbse", "class-11", "History", CBSE_CLASS_11_HISTORY, "arts")
    print(f"  ✓ History: {len(CBSE_CLASS_11_HISTORY)} chapters")
    
    total += seed_chapters(cur, "cbse", "class-11", "Geography", CBSE_CLASS_11_GEOGRAPHY, "arts")
    print(f"  ✓ Geography: {len(CBSE_CLASS_11_GEOGRAPHY)} chapters")
    
    total += seed_chapters(cur, "cbse", "class-11", "Political Science", CBSE_CLASS_11_POLITICAL_SCIENCE, "arts")
    print(f"  ✓ Political Science: {len(CBSE_CLASS_11_POLITICAL_SCIENCE)} chapters")
    
    total += seed_chapters(cur, "cbse", "class-11", "Psychology", CBSE_CLASS_11_PSYCHOLOGY, "arts")
    print(f"  ✓ Psychology: {len(CBSE_CLASS_11_PSYCHOLOGY)} chapters")
    
    print("\n" + "=" * 60)
    print("SEEDING CBSE CLASS 12 ARTS STREAM")
    print("=" * 60)
    
    total += seed_chapters(cur, "cbse", "class-12", "History", CBSE_CLASS_12_HISTORY, "arts")
    print(f"  ✓ History: {len(CBSE_CLASS_12_HISTORY)} chapters")
    
    total += seed_chapters(cur, "cbse", "class-12", "Geography", CBSE_CLASS_12_GEOGRAPHY, "arts")
    print(f"  ✓ Geography: {len(CBSE_CLASS_12_GEOGRAPHY)} chapters")
    
    total += seed_chapters(cur, "cbse", "class-12", "Political Science", CBSE_CLASS_12_POLITICAL_SCIENCE, "arts")
    print(f"  ✓ Political Science: {len(CBSE_CLASS_12_POLITICAL_SCIENCE)} chapters")
    
    total += seed_chapters(cur, "cbse", "class-12", "Psychology", CBSE_CLASS_12_PSYCHOLOGY, "arts")
    print(f"  ✓ Psychology: {len(CBSE_CLASS_12_PSYCHOLOGY)} chapters")
    
    conn.commit()
    conn.close()
    
    print("\n" + "=" * 60)
    print(f"SEED COMPLETE: {total} arts stream chapters seeded")
    print("=" * 60 + "\n")


if __name__ == "__main__":
    main()
