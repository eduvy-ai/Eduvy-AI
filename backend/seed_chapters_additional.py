"""
Additional Chapters - English, Social Science, Commerce, Arts
==============================================================
Run after seed_chapters.py to add remaining subjects.
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
# CBSE CLASS 9 SOCIAL SCIENCE
# ══════════════════════════════════════════════════════════════════════════════

CBSE_CLASS_9_SOCIAL_SCIENCE = [
    # History
    {
        "chapter_number": 1,
        "chapter_name": "The French Revolution",
        "description": "Causes and outbreak of French Revolution. Reign of Terror, role of women, abolition of slavery. Impact on democracy and human rights.",
        "topics": [
            "French Society During Late 18th Century",
            "Outbreak of the Revolution",
            "France Abolishes Monarchy",
            "Reign of Terror",
            "Role of Women in the Revolution",
            "Abolition of Slavery",
            "Revolution and Everyday Life",
            "Legacy of French Revolution"
        ]
    },
    {
        "chapter_number": 2,
        "chapter_name": "Socialism in Europe and the Russian Revolution",
        "description": "Industrial society and social change. Coming of socialism, Russian Revolution of 1917, and rise of Soviet state.",
        "topics": [
            "Age of Social Change",
            "Liberals, Radicals and Conservatives",
            "Industrial Society and Social Change",
            "Coming of Socialism to Europe",
            "The Russian Revolution",
            "February Revolution 1917",
            "October Revolution 1917",
            "Rise of Soviet State"
        ]
    },
    {
        "chapter_number": 3,
        "chapter_name": "Nazism and the Rise of Hitler",
        "description": "Birth of Weimar Republic, Hitler's rise to power. Nazi ideology, racial policies, and impact on youth. World War II and Holocaust.",
        "topics": [
            "Birth of Weimar Republic",
            "Effects of World War I",
            "Hitler's Rise to Power",
            "Nazi Ideology",
            "State Control and Propaganda",
            "Youth in Nazi Germany",
            "Racial Policies and Holocaust",
            "Ordinary People and the Crimes"
        ]
    },
    {
        "chapter_number": 4,
        "chapter_name": "Forest Society and Colonialism",
        "description": "Colonial forest policies in India. Impact on local communities, forest acts, and resistance movements.",
        "topics": [
            "Why Deforestation",
            "Rise of Commercial Forestry",
            "Forest Rules and Local Livelihoods",
            "How Were Forest Rules Implemented",
            "Forest Transformations in Java",
            "Rebellion in the Forest",
            "Colonial Forest Policies",
            "Impact on Tribal Communities"
        ]
    },
    {
        "chapter_number": 5,
        "chapter_name": "Pastoralists in the Modern World",
        "description": "Pastoral communities in India and Africa. Colonial changes, impact on pastoralism, and adaptation strategies.",
        "topics": [
            "Pastoral Nomads and Their Movements",
            "Colonial Rule and Pastoral Life",
            "Criminal Tribes Act",
            "Forest Laws and Pastoralists",
            "Pastoralism in Africa",
            "Colonial Changes in Africa",
            "Maasai Society",
            "Coping with Changes"
        ]
    },
    # Geography
    {
        "chapter_number": 6,
        "chapter_name": "India - Size and Location",
        "description": "India's location, standard meridian, and neighboring countries. Strategic importance and historical trade routes.",
        "topics": [
            "Location of India",
            "Size and Area",
            "India and the World",
            "India's Neighbors",
            "India's Strategic Importance",
            "Standard Meridian",
            "Time Zone",
            "Maritime and Land Frontiers"
        ]
    },
    {
        "chapter_number": 7,
        "chapter_name": "Physical Features of India",
        "description": "Major physiographic divisions: Himalayan mountains, Northern plains, Peninsular plateau, coastal plains, and islands.",
        "topics": [
            "Major Physiographic Divisions",
            "The Himalayan Mountains",
            "The Northern Plains",
            "The Peninsular Plateau",
            "The Indian Desert",
            "The Coastal Plains",
            "The Islands",
            "Formation and Significance"
        ]
    },
    {
        "chapter_number": 8,
        "chapter_name": "Drainage",
        "description": "River systems of India. Himalayan and Peninsular rivers, river pollution, and water resource management.",
        "topics": [
            "Drainage Patterns",
            "The Himalayan Rivers - Indus, Ganga, Brahmaputra",
            "The Peninsular Rivers - Godavari, Krishna, Kaveri",
            "Lakes",
            "Role of Rivers in Economy",
            "River Pollution",
            "National River Conservation Plan",
            "Interlinking of Rivers"
        ]
    },
    {
        "chapter_number": 9,
        "chapter_name": "Climate",
        "description": "Climate controls, monsoon mechanism. Seasons and distribution of rainfall across India.",
        "topics": [
            "Climate Controls",
            "Factors Influencing Climate",
            "The Indian Monsoon",
            "Monsoon as a Unifying Bond",
            "The Seasons - Cold Weather",
            "Hot Weather Season",
            "Advancing Monsoon",
            "Retreating Monsoon",
            "Distribution of Rainfall"
        ]
    },
    {
        "chapter_number": 10,
        "chapter_name": "Natural Vegetation and Wild Life",
        "description": "Types of vegetation, factors affecting distribution. Wildlife, conservation efforts, and biosphere reserves.",
        "topics": [
            "Types of Vegetation",
            "Tropical Rainforests",
            "Tropical Deciduous Forests",
            "Thorny Forests",
            "Montane Forests",
            "Mangrove Forests",
            "Wildlife",
            "Wildlife Conservation"
        ]
    },
    {
        "chapter_number": 11,
        "chapter_name": "Population",
        "description": "Population size, distribution, and growth. Age composition, literacy, occupational structure, and health.",
        "topics": [
            "Population Size and Distribution",
            "Population Growth and Change",
            "Age Composition",
            "Sex Ratio",
            "Literacy Rate",
            "Occupational Structure",
            "Health",
            "Adolescent Population"
        ]
    },
    # Civics
    {
        "chapter_number": 12,
        "chapter_name": "What is Democracy? Why Democracy?",
        "description": "Definition and features of democracy. Arguments for and against democracy, comparing democratic and non-democratic systems.",
        "topics": [
            "What is Democracy",
            "Features of Democracy",
            "Arguments Against Democracy",
            "Arguments For Democracy",
            "Making of Democracy",
            "Broader Meaning of Democracy",
            "Democracy in Contemporary World",
            "Why Democracy"
        ]
    },
    {
        "chapter_number": 13,
        "chapter_name": "Constitutional Design",
        "description": "Making of Indian Constitution, key features. Fundamental rights, directive principles, and philosophy of constitution.",
        "topics": [
            "Democratic Constitution in South Africa",
            "Making of Indian Constitution",
            "Constituent Assembly",
            "Guiding Values of Constitution",
            "Preamble to the Constitution",
            "Philosophy of the Constitution",
            "Key Features of Constitution",
            "Fundamental Rights"
        ]
    },
    {
        "chapter_number": 14,
        "chapter_name": "Electoral Politics",
        "description": "Elections and democracy, electoral system in India. Role of Election Commission and challenges.",
        "topics": [
            "Why Elections",
            "What Makes an Election Democratic",
            "Indian Electoral System",
            "Constituencies and Voting",
            "Reserved Constituencies",
            "Election Campaign",
            "What Makes Elections Democratic",
            "Challenges to Free Elections"
        ]
    },
    {
        "chapter_number": 15,
        "chapter_name": "Working of Institutions",
        "description": "Parliament, executive, and judiciary. How these institutions function and relate to each other.",
        "topics": [
            "Need for Political Institutions",
            "Parliament",
            "Political Executive",
            "Prime Minister and Council of Ministers",
            "President",
            "The Judiciary",
            "Independence of Judiciary",
            "Relationship Between Institutions"
        ]
    },
    {
        "chapter_number": 16,
        "chapter_name": "Democratic Rights",
        "description": "Rights in a democracy, fundamental rights in India. Expanding scope of rights and National Human Rights Commission.",
        "topics": [
            "Life Without Rights",
            "Rights in a Democracy",
            "Rights in Indian Constitution",
            "Fundamental Rights",
            "Right to Constitutional Remedies",
            "Expanding Scope of Rights",
            "National Human Rights Commission",
            "International Covenant on Rights"
        ]
    },
    # Economics
    {
        "chapter_number": 17,
        "chapter_name": "The Story of Village Palampur",
        "description": "Economic life in a village, factors of production. Farming and non-farming activities, land distribution.",
        "topics": [
            "Organization of Production",
            "Factors of Production",
            "Land as Factor of Production",
            "Farming in Palampur",
            "Land Distribution",
            "Labour as Factor of Production",
            "Capital for Farming",
            "Non-Farm Activities"
        ]
    },
    {
        "chapter_number": 18,
        "chapter_name": "People as Resource",
        "description": "Human capital formation, role of education and health. Economic activities, quality of population.",
        "topics": [
            "People as Resource",
            "Economic Activities",
            "Quality of Population",
            "Education and Health",
            "Human Capital Formation",
            "Role of Health",
            "Unemployment",
            "Human Development Index"
        ]
    },
    {
        "chapter_number": 19,
        "chapter_name": "Poverty as a Challenge",
        "description": "Causes and dimensions of poverty. Poverty line, anti-poverty measures, and challenges.",
        "topics": [
            "Two Typical Cases of Poverty",
            "Poverty as Seen by Social Scientists",
            "Poverty Line",
            "Poverty Estimates",
            "Vulnerable Groups",
            "Inter-State Disparities",
            "Global Poverty",
            "Anti-Poverty Measures"
        ]
    },
    {
        "chapter_number": 20,
        "chapter_name": "Food Security in India",
        "description": "What is food security, food security in India. Public distribution system and government initiatives.",
        "topics": [
            "What is Food Security",
            "Why Food Security",
            "Who are Food Insecure",
            "Food Security in India",
            "What is Buffer Stock",
            "Public Distribution System",
            "Current Status of PDS",
            "Role of Cooperatives"
        ]
    }
]

# ══════════════════════════════════════════════════════════════════════════════
# CBSE CLASS 10 ENGLISH (First Flight)
# ══════════════════════════════════════════════════════════════════════════════

CBSE_CLASS_10_ENGLISH = [
    {
        "chapter_number": 1,
        "chapter_name": "A Letter to God",
        "description": "Story of Lencho's unshakeable faith in God. Explores themes of faith, innocence, and human kindness through simple yet powerful narrative.",
        "topics": [
            "Theme of Faith",
            "Character of Lencho",
            "Role of Post Office Employees",
            "Irony in the Story",
            "Message and Moral",
            "Literary Devices"
        ]
    },
    {
        "chapter_number": 2,
        "chapter_name": "Nelson Mandela: Long Walk to Freedom",
        "description": "Mandela's inauguration as South Africa's first black president. His vision for democracy, freedom, and rainbow nation.",
        "topics": [
            "Historical Context - Apartheid",
            "Mandela's Inauguration",
            "Twin Obligations",
            "Freedom for All",
            "Meaning of Courage",
            "Vision of Rainbow Nation"
        ]
    },
    {
        "chapter_number": 3,
        "chapter_name": "Two Stories about Flying",
        "description": "His First Flight - A young seagull overcomes fear. Black Aeroplane - A mysterious pilot helps in storm.",
        "topics": [
            "His First Flight - Theme of Fear",
            "Overcoming Fear",
            "Role of Family",
            "Black Aeroplane - Mystery",
            "Theme of Help",
            "Gratitude and Wonder"
        ]
    },
    {
        "chapter_number": 4,
        "chapter_name": "From the Diary of Anne Frank",
        "description": "Anne's diary entries during World War II. Reflections on war, adolescence, and human resilience.",
        "topics": [
            "Historical Background - Nazi Occupation",
            "Anne's Character",
            "Role of Diary",
            "Themes of Isolation",
            "Hope Amid Despair",
            "Significance of the Diary"
        ]
    },
    {
        "chapter_number": 5,
        "chapter_name": "The Hundred Dresses - I",
        "description": "Story of Wanda Petronski and her hundred dresses. Themes of bullying, belonging, and empathy.",
        "topics": [
            "Character of Wanda",
            "Theme of Bullying",
            "Maddie's Conflict",
            "Social Discrimination",
            "Imagination vs Reality",
            "Setting and Atmosphere"
        ]
    },
    {
        "chapter_number": 6,
        "chapter_name": "The Hundred Dresses - II",
        "description": "Conclusion of Wanda's story. Regret, forgiveness, and the lasting impact of kindness.",
        "topics": [
            "Wanda's Letter",
            "The Gift of Drawings",
            "Maddie's Realization",
            "Theme of Forgiveness",
            "Resolution",
            "Moral of the Story"
        ]
    },
    {
        "chapter_number": 7,
        "chapter_name": "Glimpses of India",
        "description": "Three essays exploring Indian culture. Coorg, tea from Assam, and memories of childhood.",
        "topics": [
            "A Baker from Goa - Culture",
            "Traditional Occupations",
            "Coorg - Geography and Culture",
            "Tea from Assam - Industry",
            "History of Tea",
            "Indian Cultural Diversity"
        ]
    },
    {
        "chapter_number": 8,
        "chapter_name": "Mijbil the Otter",
        "description": "Gavin Maxwell's experience with his pet otter Mijbil. Human-animal bond and adventure.",
        "topics": [
            "Maxwell's Journey to Basra",
            "Character of Mijbil",
            "Human-Animal Bond",
            "Challenges of Keeping Exotic Pets",
            "Journey Back to England",
            "Theme of Companionship"
        ]
    },
    {
        "chapter_number": 9,
        "chapter_name": "Madam Rides the Bus",
        "description": "Eight-year-old Valli's bus ride adventure. Coming of age, curiosity, and understanding of life.",
        "topics": [
            "Valli's Character",
            "Theme of Curiosity",
            "Planning the Adventure",
            "The Bus Journey",
            "Encounter with Death",
            "Coming of Age Theme"
        ]
    },
    {
        "chapter_number": 10,
        "chapter_name": "The Sermon at Benares",
        "description": "Buddha's teachings through Kisa Gotami's story. Understanding grief, death, and finding peace.",
        "topics": [
            "Kisa Gotami's Grief",
            "Buddha's Teaching Method",
            "The Quest for Mustard Seed",
            "Understanding Death",
            "Path to Peace",
            "Buddhist Philosophy"
        ]
    },
    {
        "chapter_number": 11,
        "chapter_name": "The Proposal",
        "description": "Anton Chekhov's comic play about a marriage proposal. Themes of pride, property, and absurdity.",
        "topics": [
            "Characters - Lomov, Natalya, Chubukov",
            "The Proposal Attempt",
            "Quarrel over Oxen Meadows",
            "Quarrel over Dogs",
            "Comic Elements",
            "Theme of Absurdity",
            "Social Commentary"
        ]
    }
]

# ══════════════════════════════════════════════════════════════════════════════
# CBSE CLASS 9 ENGLISH (Beehive)
# ══════════════════════════════════════════════════════════════════════════════

CBSE_CLASS_9_ENGLISH = [
    {
        "chapter_number": 1,
        "chapter_name": "The Fun They Had",
        "description": "Futuristic story about mechanical teachers. Contrasts future education with traditional schooling, exploring human connections.",
        "topics": [
            "Setting - Future World",
            "Mechanical Teachers",
            "Old Books and Schools",
            "Theme of Nostalgia",
            "Human vs Machine Teaching",
            "Imagination and Technology"
        ]
    },
    {
        "chapter_number": 2,
        "chapter_name": "The Sound of Music",
        "description": "Two stories of determination. Evelyn Glennie overcoming deafness, and Bismillah Khan preserving shehnai tradition.",
        "topics": [
            "Evelyn Glennie's Story",
            "Overcoming Disability",
            "Feeling Music Through Vibrations",
            "Bismillah Khan's Legacy",
            "Preserving Indian Music",
            "Dedication and Passion"
        ]
    },
    {
        "chapter_number": 3,
        "chapter_name": "The Little Girl",
        "description": "Kezia's journey from fearing her father to understanding him. Parent-child relationship and perspective.",
        "topics": [
            "Kezia's Fear of Father",
            "The Handkerchief Incident",
            "Understanding Parents",
            "Role of Grandmother",
            "Change in Perspective",
            "Theme of Love"
        ]
    },
    {
        "chapter_number": 4,
        "chapter_name": "A Truly Beautiful Mind",
        "description": "Biography of Albert Einstein. From troubled childhood to scientific genius, and advocate for peace.",
        "topics": [
            "Einstein's Early Life",
            "Unconventional Education",
            "Theory of Relativity",
            "Nobel Prize",
            "Advocacy for Peace",
            "Legacy of Einstein"
        ]
    },
    {
        "chapter_number": 5,
        "chapter_name": "The Snake and the Mirror",
        "description": "A homeopathic doctor's encounter with a snake. Humorous narrative about vanity and fear.",
        "topics": [
            "The Doctor's Room",
            "His Vanity",
            "The Snake Encounter",
            "Frozen with Fear",
            "Escape",
            "Humor and Irony"
        ]
    },
    {
        "chapter_number": 6,
        "chapter_name": "My Childhood",
        "description": "APJ Abdul Kalam's childhood in Rameswaram. Religious harmony, friendship, and early influences.",
        "topics": [
            "Rameswaram Setting",
            "Family Background",
            "Religious Harmony",
            "Early Education",
            "Influential People",
            "Values Learned"
        ]
    },
    {
        "chapter_number": 7,
        "chapter_name": "Packing",
        "description": "Jerome K. Jerome's humorous account of packing for a trip. Comedy of errors and human nature.",
        "topics": [
            "The Art of Packing",
            "Jerome's Overconfidence",
            "George and Harris",
            "Forgetting Items",
            "Comic Situations",
            "Human Nature"
        ]
    },
    {
        "chapter_number": 8,
        "chapter_name": "Reach for the Top",
        "description": "Two stories of women achievers. Santosh Yadav climbing Everest, Maria Sharapova's tennis journey.",
        "topics": [
            "Santosh Yadav's Journey",
            "Defying Traditions",
            "Everest Achievement",
            "Maria Sharapova's Story",
            "Determination and Sacrifice",
            "Women Achievers"
        ]
    },
    {
        "chapter_number": 9,
        "chapter_name": "The Bond of Love",
        "description": "True story of Bruno the bear. Human-animal bond, love, and compassion.",
        "topics": [
            "Finding Bruno",
            "Life with the Family",
            "Bruno's Adventures",
            "Separation",
            "Reunion",
            "Theme of Bonding"
        ]
    },
    {
        "chapter_number": 10,
        "chapter_name": "Kathmandu",
        "description": "Vikram Seth's travelogue of Kathmandu. Pashupatinath, Bodhnath temples, and cultural observations.",
        "topics": [
            "Pashupatinath Temple",
            "Religious Practices",
            "Bodhnath Stupa",
            "Street Life",
            "Cultural Observations",
            "Journey Back"
        ]
    },
    {
        "chapter_number": 11,
        "chapter_name": "If I Were You",
        "description": "One-act play about an encounter with an intruder. Suspense, wit, and unexpected twists.",
        "topics": [
            "Setting the Scene",
            "The Intruder's Plan",
            "Gerrard's Character",
            "Battle of Wits",
            "The Twist",
            "Theme of Intelligence"
        ]
    }
]

# ══════════════════════════════════════════════════════════════════════════════
# CBSE CLASS 11 COMMERCE STREAM
# ══════════════════════════════════════════════════════════════════════════════

CBSE_CLASS_11_ACCOUNTANCY = [
    {
        "chapter_number": 1,
        "chapter_name": "Introduction to Accounting",
        "description": "Meaning, objectives, and functions of accounting. Types of accounting information and users.",
        "topics": [
            "Meaning of Accounting",
            "Objectives of Accounting",
            "Role of Accounting",
            "Types of Accounting Information",
            "Users of Accounting Information",
            "Qualitative Characteristics"
        ]
    },
    {
        "chapter_number": 2,
        "chapter_name": "Theory Base of Accounting",
        "description": "Accounting principles, concepts, and conventions. GAAP and accounting standards.",
        "topics": [
            "Generally Accepted Accounting Principles (GAAP)",
            "Basic Accounting Concepts",
            "Going Concern, Accrual, Consistency",
            "Accounting Conventions",
            "Accounting Standards",
            "Accounting Policies"
        ]
    },
    {
        "chapter_number": 3,
        "chapter_name": "Recording of Transactions - I",
        "description": "Business transactions, source documents. Books of original entry, journal entries.",
        "topics": [
            "Business Transactions",
            "Source Documents",
            "Accounting Equation",
            "Books of Original Entry",
            "Journal Entries",
            "Rules of Debit and Credit"
        ]
    },
    {
        "chapter_number": 4,
        "chapter_name": "Recording of Transactions - II",
        "description": "Special purpose books: cash book, purchase book, sales book. Ledger posting.",
        "topics": [
            "Cash Book Types",
            "Petty Cash Book",
            "Purchases Book",
            "Sales Book",
            "Purchase Returns Book",
            "Sales Returns Book",
            "Journal Proper"
        ]
    },
    {
        "chapter_number": 5,
        "chapter_name": "Bank Reconciliation Statement",
        "description": "Need for reconciliation, causes of difference. Preparation of bank reconciliation statement.",
        "topics": [
            "Need for Bank Reconciliation",
            "Cash Book vs Pass Book",
            "Causes of Difference",
            "Cheques Issued Not Presented",
            "Cheques Deposited Not Collected",
            "Preparing BRS"
        ]
    },
    {
        "chapter_number": 6,
        "chapter_name": "Trial Balance and Rectification of Errors",
        "description": "Objectives of trial balance, types of errors. Detection and rectification of errors.",
        "topics": [
            "Meaning of Trial Balance",
            "Objectives of Trial Balance",
            "Methods of Preparing Trial Balance",
            "Types of Errors",
            "Errors Not Affecting Trial Balance",
            "Rectification of Errors",
            "Suspense Account"
        ]
    },
    {
        "chapter_number": 7,
        "chapter_name": "Depreciation, Provisions and Reserves",
        "description": "Meaning and need for depreciation. Methods of depreciation, provisions, and reserves.",
        "topics": [
            "Meaning of Depreciation",
            "Causes of Depreciation",
            "Factors Affecting Depreciation",
            "Methods - Straight Line, Written Down Value",
            "Provisions",
            "Reserves",
            "Secret Reserves"
        ]
    },
    {
        "chapter_number": 8,
        "chapter_name": "Bill of Exchange",
        "description": "Meaning and features of bills. Drawing, acceptance, discounting, and dishonor of bills.",
        "topics": [
            "Meaning of Bill of Exchange",
            "Parties to a Bill",
            "Acceptance of Bills",
            "Discounting of Bills",
            "Endorsement of Bills",
            "Dishonor of Bills",
            "Accounting Entries"
        ]
    },
    {
        "chapter_number": 9,
        "chapter_name": "Financial Statements - I",
        "description": "Meaning and objectives of financial statements. Trading and profit & loss account.",
        "topics": [
            "Meaning of Financial Statements",
            "Objectives",
            "Trading Account",
            "Gross Profit",
            "Profit and Loss Account",
            "Net Profit",
            "Operating and Non-Operating Expenses"
        ]
    },
    {
        "chapter_number": 10,
        "chapter_name": "Financial Statements - II",
        "description": "Balance sheet preparation. Adjustments like depreciation, provisions, and accruals.",
        "topics": [
            "Balance Sheet Meaning",
            "Classification of Assets and Liabilities",
            "Adjustments",
            "Outstanding Expenses",
            "Prepaid Expenses",
            "Accrued Income",
            "Closing Stock Adjustment"
        ]
    },
    {
        "chapter_number": 11,
        "chapter_name": "Accounts from Incomplete Records",
        "description": "Meaning and limitations of incomplete records. Statement of affairs method.",
        "topics": [
            "Meaning of Incomplete Records",
            "Limitations",
            "Ascertaining Profit",
            "Statement of Affairs",
            "Preparation of Trading Account",
            "Preparation of Balance Sheet"
        ]
    },
    {
        "chapter_number": 12,
        "chapter_name": "Applications of Computers in Accounting",
        "description": "Introduction to computerized accounting. Advantages and applications in business.",
        "topics": [
            "Meaning of Computerised Accounting",
            "Features of Computerised Accounting",
            "Advantages Over Manual Accounting",
            "Limitations",
            "Accounting Software",
            "Computerised Accounting System"
        ]
    }
]

CBSE_CLASS_11_BUSINESS_STUDIES = [
    {
        "chapter_number": 1,
        "chapter_name": "Nature and Purpose of Business",
        "description": "Concept of business, classification of business activities. Objectives and role in society.",
        "topics": [
            "Concept of Business",
            "Characteristics of Business",
            "Business vs Profession vs Employment",
            "Classification of Business Activities",
            "Business Objectives",
            "Role of Profit",
            "Business Risk"
        ]
    },
    {
        "chapter_number": 2,
        "chapter_name": "Forms of Business Organisation",
        "description": "Sole proprietorship, partnership, company. Choice of form based on various factors.",
        "topics": [
            "Sole Proprietorship",
            "Partnership",
            "Partnership Deed",
            "Types of Partners",
            "Joint Hindu Family Business",
            "Cooperative Society",
            "Company"
        ]
    },
    {
        "chapter_number": 3,
        "chapter_name": "Private, Public and Global Enterprises",
        "description": "Private sector, public sector, and global enterprises. Forms and features.",
        "topics": [
            "Private Sector Enterprises",
            "Public Sector Enterprises",
            "Departmental Undertakings",
            "Statutory Corporation",
            "Government Company",
            "Global Enterprises",
            "Joint Ventures"
        ]
    },
    {
        "chapter_number": 4,
        "chapter_name": "Business Services",
        "description": "Banking, insurance, transportation, warehousing, and communication services.",
        "topics": [
            "Meaning of Business Services",
            "Banking Services",
            "Types of Banks",
            "Insurance - Life and General",
            "Principles of Insurance",
            "Transportation",
            "Warehousing",
            "Communication Services"
        ]
    },
    {
        "chapter_number": 5,
        "chapter_name": "Emerging Modes of Business",
        "description": "E-business, business process outsourcing. Online transactions and digital commerce.",
        "topics": [
            "E-Business",
            "Scope of E-Business",
            "Benefits and Limitations",
            "Online Transactions",
            "Security and Safety",
            "Business Process Outsourcing (BPO)",
            "Knowledge Process Outsourcing (KPO)"
        ]
    },
    {
        "chapter_number": 6,
        "chapter_name": "Social Responsibility of Business",
        "description": "Concept of social responsibility, arguments for and against. Business ethics.",
        "topics": [
            "Concept of Social Responsibility",
            "Case for Social Responsibility",
            "Case Against Social Responsibility",
            "Responsibility Towards Different Groups",
            "Environmental Protection",
            "Business Ethics"
        ]
    },
    {
        "chapter_number": 7,
        "chapter_name": "Formation of a Company",
        "description": "Promotion, incorporation, and commencement. Documents required for company formation.",
        "topics": [
            "Stages in Formation",
            "Promotion Stage",
            "Incorporation Stage",
            "Certificate of Incorporation",
            "Commencement of Business",
            "Documents - Memorandum, Articles, Prospectus"
        ]
    },
    {
        "chapter_number": 8,
        "chapter_name": "Sources of Business Finance",
        "description": "Classification of sources, owner's funds, borrowed funds. Long-term and short-term finance.",
        "topics": [
            "Meaning of Business Finance",
            "Owner's Funds - Equity, Preference",
            "Borrowed Funds - Debentures, Loans",
            "Retained Earnings",
            "Trade Credit",
            "Public Deposits",
            "Commercial Paper"
        ]
    },
    {
        "chapter_number": 9,
        "chapter_name": "Small Business",
        "description": "Small scale enterprises, role and importance. Government support and cottage industries.",
        "topics": [
            "Small Scale Enterprises",
            "Role in Indian Economy",
            "Problems of Small Business",
            "Government Support",
            "Cottage and Rural Industries",
            "Entrepreneurship Development"
        ]
    },
    {
        "chapter_number": 10,
        "chapter_name": "Internal Trade",
        "description": "Wholesale and retail trade. Types of retailers, departmental stores, chain stores.",
        "topics": [
            "Meaning of Internal Trade",
            "Wholesale Trade",
            "Retail Trade",
            "Types of Retail Trade",
            "Departmental Stores",
            "Chain Stores",
            "Mail Order Houses",
            "Automatic Vending Machines"
        ]
    },
    {
        "chapter_number": 11,
        "chapter_name": "International Business",
        "description": "Scope of international business, export-import. World Trade Organization.",
        "topics": [
            "Meaning of International Business",
            "Reasons for International Business",
            "Exports and Imports",
            "Export Procedure",
            "Import Procedure",
            "World Trade Organization",
            "International Trade Agreements"
        ]
    }
]

CBSE_CLASS_11_ECONOMICS = [
    {
        "chapter_number": 1,
        "chapter_name": "Introduction to Statistics",
        "description": "Meaning, scope, and importance of statistics. Functions and limitations of statistics.",
        "topics": [
            "Meaning of Statistics",
            "Scope of Statistics",
            "Importance in Economics",
            "Functions of Statistics",
            "Limitations of Statistics",
            "Distrust of Statistics"
        ]
    },
    {
        "chapter_number": 2,
        "chapter_name": "Collection of Data",
        "description": "Primary and secondary data, methods of collection. Census and sample surveys.",
        "topics": [
            "Sources of Data",
            "Primary Data Collection",
            "Secondary Data Collection",
            "Census and Sample Methods",
            "Sampling Techniques",
            "Random and Non-Random Sampling"
        ]
    },
    {
        "chapter_number": 3,
        "chapter_name": "Organisation of Data",
        "description": "Classification of data, frequency distribution. Preparation of tables.",
        "topics": [
            "Meaning of Classification",
            "Types of Classification",
            "Frequency Distribution",
            "Class Intervals",
            "Exclusive and Inclusive Series",
            "Tabulation of Data"
        ]
    },
    {
        "chapter_number": 4,
        "chapter_name": "Presentation of Data",
        "description": "Textual, tabular, and diagrammatic presentation. Bar diagrams, pie charts.",
        "topics": [
            "Textual Presentation",
            "Tabular Presentation",
            "Diagrammatic Presentation",
            "Bar Diagrams",
            "Pie Charts",
            "Frequency Diagrams",
            "Histogram and Ogive"
        ]
    },
    {
        "chapter_number": 5,
        "chapter_name": "Measures of Central Tendency",
        "description": "Mean, median, and mode. Calculation methods for grouped and ungrouped data.",
        "topics": [
            "Arithmetic Mean",
            "Weighted Mean",
            "Median",
            "Mode",
            "Relationship Between Mean, Median, Mode",
            "Ogive Method for Median"
        ]
    },
    {
        "chapter_number": 6,
        "chapter_name": "Measures of Dispersion",
        "description": "Range, quartile deviation, mean deviation. Standard deviation and coefficient of variation.",
        "topics": [
            "Meaning of Dispersion",
            "Absolute and Relative Measures",
            "Range",
            "Quartile Deviation",
            "Mean Deviation",
            "Standard Deviation",
            "Coefficient of Variation"
        ]
    },
    {
        "chapter_number": 7,
        "chapter_name": "Correlation",
        "description": "Meaning and types of correlation. Methods of measuring correlation.",
        "topics": [
            "Meaning of Correlation",
            "Types of Correlation",
            "Scatter Diagram",
            "Karl Pearson's Coefficient",
            "Spearman's Rank Correlation",
            "Interpretation of Correlation"
        ]
    },
    {
        "chapter_number": 8,
        "chapter_name": "Index Numbers",
        "description": "Meaning and uses of index numbers. Construction methods and limitations.",
        "topics": [
            "Meaning of Index Numbers",
            "Types of Index Numbers",
            "Construction of Index Numbers",
            "Simple and Weighted Index",
            "Consumer Price Index",
            "Wholesale Price Index",
            "Uses and Limitations"
        ]
    },
    {
        "chapter_number": 9,
        "chapter_name": "Indian Economy on the Eve of Independence",
        "description": "State of Indian economy before independence. Agriculture, industry, and infrastructure.",
        "topics": [
            "Low Level of Economic Development",
            "Agricultural Sector",
            "Industrial Sector",
            "Foreign Trade",
            "Demographic Condition",
            "Infrastructure",
            "Occupational Structure"
        ]
    },
    {
        "chapter_number": 10,
        "chapter_name": "Indian Economy 1950-1990",
        "description": "Goals of Five Year Plans, agriculture, and industry during this period.",
        "topics": [
            "Goals of Five Year Plans",
            "Agriculture - Land Reforms",
            "Green Revolution",
            "Industrial Policy 1956",
            "Industrial Licensing",
            "Public Sector",
            "Trade Policy"
        ]
    },
    {
        "chapter_number": 11,
        "chapter_name": "Liberalisation, Privatisation and Globalisation",
        "description": "Economic reforms of 1991. LPG policies and their impact on Indian economy.",
        "topics": [
            "Background of Reforms",
            "Liberalisation",
            "Privatisation",
            "Globalisation",
            "World Trade Organization",
            "Impact of Reforms",
            "Critical Appraisal"
        ]
    },
    {
        "chapter_number": 12,
        "chapter_name": "Current Challenges Facing Indian Economy",
        "description": "Poverty, unemployment, and regional disparities. Rural development and sustainability.",
        "topics": [
            "Poverty - Causes and Measures",
            "Rural Development",
            "Human Capital Formation",
            "Employment Generation",
            "Infrastructure",
            "Sustainable Development",
            "Environment and Economy"
        ]
    },
    {
        "chapter_number": 13,
        "chapter_name": "Development Experience of India",
        "description": "Comparative study with neighbors - Pakistan and China. Lessons learned.",
        "topics": [
            "Development Strategies Compared",
            "Demographic Indicators",
            "GDP and Growth",
            "India and Pakistan",
            "India and China",
            "Lessons for India"
        ]
    }
]

# ══════════════════════════════════════════════════════════════════════════════
# CBSE CLASS 12 COMMERCE STREAM
# ══════════════════════════════════════════════════════════════════════════════

CBSE_CLASS_12_ACCOUNTANCY = [
    {
        "chapter_number": 1,
        "chapter_name": "Accounting for Partnership: Basic Concepts",
        "description": "Partnership deed, capital accounts, profit sharing. Goodwill valuation and treatment.",
        "topics": [
            "Partnership Deed",
            "Capital Accounts - Fixed and Fluctuating",
            "Interest on Capital and Drawings",
            "Profit and Loss Appropriation",
            "Guarantee of Profit",
            "Past Adjustments"
        ]
    },
    {
        "chapter_number": 2,
        "chapter_name": "Goodwill: Nature and Valuation",
        "description": "Meaning and factors affecting goodwill. Methods of valuation of goodwill.",
        "topics": [
            "Meaning of Goodwill",
            "Factors Affecting Goodwill",
            "Need for Valuation",
            "Average Profit Method",
            "Super Profit Method",
            "Capitalization Method"
        ]
    },
    {
        "chapter_number": 3,
        "chapter_name": "Change in Profit-Sharing Ratio",
        "description": "Reconstitution of partnership. Sacrificing ratio, gaining ratio, and adjustments.",
        "topics": [
            "Need for Change in Ratio",
            "Sacrificing Ratio",
            "Gaining Ratio",
            "Treatment of Goodwill",
            "Reserves and Accumulated Profits",
            "Revaluation of Assets and Liabilities"
        ]
    },
    {
        "chapter_number": 4,
        "chapter_name": "Admission of a Partner",
        "description": "Treatment of goodwill, capital, and profit sharing on admission. Journal entries.",
        "topics": [
            "Effect of Admission",
            "New Profit Sharing Ratio",
            "Sacrificing Ratio",
            "Treatment of Goodwill",
            "Revaluation Account",
            "Adjustment of Capital",
            "Cash Brought In"
        ]
    },
    {
        "chapter_number": 5,
        "chapter_name": "Retirement and Death of a Partner",
        "description": "Settlement of accounts on retirement or death. Treatment of goodwill and profit share.",
        "topics": [
            "Adjustment on Retirement",
            "Gaining Ratio",
            "Treatment of Goodwill",
            "Revaluation of Assets",
            "Settlement of Amount Due",
            "Death of a Partner",
            "Joint Life Policy"
        ]
    },
    {
        "chapter_number": 6,
        "chapter_name": "Dissolution of Partnership Firm",
        "description": "Settlement of accounts on dissolution. Realization account and distribution.",
        "topics": [
            "Meaning of Dissolution",
            "Settlement of Accounts",
            "Realization Account",
            "Deficiency Account",
            "Garner vs Murray Rule",
            "Piecemeal Distribution"
        ]
    },
    {
        "chapter_number": 7,
        "chapter_name": "Issue of Shares",
        "description": "Types of shares, issue at par, premium, and discount. Forfeiture and reissue.",
        "topics": [
            "Share Capital",
            "Types of Shares",
            "Issue of Shares at Par",
            "Issue at Premium",
            "Issue at Discount",
            "Forfeiture of Shares",
            "Reissue of Forfeited Shares"
        ]
    },
    {
        "chapter_number": 8,
        "chapter_name": "Issue of Debentures",
        "description": "Types of debentures, issue methods. Interest on debentures, redemption.",
        "topics": [
            "Meaning of Debentures",
            "Types of Debentures",
            "Issue of Debentures",
            "Issue at Premium and Discount",
            "Issue as Collateral Security",
            "Interest on Debentures",
            "Redemption of Debentures"
        ]
    },
    {
        "chapter_number": 9,
        "chapter_name": "Financial Statements of a Company",
        "description": "Statement of profit and loss, balance sheet. Schedule III format and presentation.",
        "topics": [
            "Statement of Profit and Loss",
            "Balance Sheet Format",
            "Schedule III Requirements",
            "Classification of Items",
            "Revenue Recognition",
            "Disclosure Requirements"
        ]
    },
    {
        "chapter_number": 10,
        "chapter_name": "Financial Statement Analysis",
        "description": "Meaning, objectives, and techniques. Comparative and common-size statements.",
        "topics": [
            "Meaning of Analysis",
            "Objectives",
            "Techniques of Analysis",
            "Comparative Statements",
            "Common-Size Statements",
            "Trend Analysis",
            "Limitations"
        ]
    },
    {
        "chapter_number": 11,
        "chapter_name": "Accounting Ratios",
        "description": "Types of ratios: liquidity, solvency, profitability. Calculation and interpretation.",
        "topics": [
            "Meaning of Ratios",
            "Types of Ratios",
            "Liquidity Ratios",
            "Solvency Ratios",
            "Activity Ratios",
            "Profitability Ratios",
            "Interpretation of Ratios"
        ]
    },
    {
        "chapter_number": 12,
        "chapter_name": "Cash Flow Statement",
        "description": "Operating, investing, and financing activities. Preparation of cash flow statement.",
        "topics": [
            "Meaning of Cash Flow",
            "Objectives of Cash Flow Statement",
            "Classification of Activities",
            "Operating Activities",
            "Investing Activities",
            "Financing Activities",
            "Preparation of Statement"
        ]
    }
]

CBSE_CLASS_12_BUSINESS_STUDIES = [
    {
        "chapter_number": 1,
        "chapter_name": "Nature and Significance of Management",
        "description": "Meaning, characteristics, and levels of management. Management as art, science, and profession.",
        "topics": [
            "Meaning of Management",
            "Characteristics of Management",
            "Objectives of Management",
            "Importance of Management",
            "Management as Art, Science, Profession",
            "Levels of Management",
            "Management Functions"
        ]
    },
    {
        "chapter_number": 2,
        "chapter_name": "Principles of Management",
        "description": "Fayol's principles, Taylor's scientific management. Techniques of scientific management.",
        "topics": [
            "Nature of Management Principles",
            "Significance of Principles",
            "Fayol's 14 Principles",
            "Taylor's Scientific Management",
            "Principles of Scientific Management",
            "Techniques of Scientific Management"
        ]
    },
    {
        "chapter_number": 3,
        "chapter_name": "Business Environment",
        "description": "Components of business environment. Economic, political, and technological environment.",
        "topics": [
            "Meaning of Business Environment",
            "Features and Importance",
            "Dimensions of Environment",
            "Economic Environment",
            "Political Environment",
            "Legal Environment",
            "Technological Environment"
        ]
    },
    {
        "chapter_number": 4,
        "chapter_name": "Planning",
        "description": "Meaning, importance, and limitations of planning. Types of plans and planning process.",
        "topics": [
            "Meaning of Planning",
            "Features of Planning",
            "Importance of Planning",
            "Limitations of Planning",
            "Planning Process",
            "Types of Plans"
        ]
    },
    {
        "chapter_number": 5,
        "chapter_name": "Organising",
        "description": "Organizing process, formal and informal organization. Delegation and decentralization.",
        "topics": [
            "Meaning of Organising",
            "Importance of Organising",
            "Organising Process",
            "Organizational Structure",
            "Formal and Informal Organisation",
            "Delegation",
            "Decentralisation"
        ]
    },
    {
        "chapter_number": 6,
        "chapter_name": "Staffing",
        "description": "Human resource management, recruitment, and selection. Training and development.",
        "topics": [
            "Meaning of Staffing",
            "Importance of Staffing",
            "Staffing Process",
            "Recruitment - Sources",
            "Selection Process",
            "Training Methods",
            "Training vs Development"
        ]
    },
    {
        "chapter_number": 7,
        "chapter_name": "Directing",
        "description": "Elements of directing: supervision, motivation, leadership, communication.",
        "topics": [
            "Meaning of Directing",
            "Importance of Directing",
            "Elements of Directing",
            "Supervision",
            "Motivation - Maslow, Herzberg",
            "Leadership Styles",
            "Communication"
        ]
    },
    {
        "chapter_number": 8,
        "chapter_name": "Controlling",
        "description": "Controlling process, techniques. Relationship with planning.",
        "topics": [
            "Meaning of Controlling",
            "Importance of Controlling",
            "Limitations",
            "Relationship with Planning",
            "Controlling Process",
            "Techniques of Controlling"
        ]
    },
    {
        "chapter_number": 9,
        "chapter_name": "Financial Management",
        "description": "Financial decisions, capital structure. Factors affecting financing decisions.",
        "topics": [
            "Meaning of Financial Management",
            "Role of Financial Management",
            "Financial Decisions",
            "Investment Decision",
            "Financing Decision",
            "Dividend Decision",
            "Capital Structure",
            "Factors Affecting Financial Decisions"
        ]
    },
    {
        "chapter_number": 10,
        "chapter_name": "Financial Markets",
        "description": "Money market, capital market. Stock exchange, SEBI regulations.",
        "topics": [
            "Concept of Financial Market",
            "Money Market - Instruments",
            "Capital Market",
            "Primary Market",
            "Secondary Market",
            "Stock Exchange",
            "SEBI - Objectives and Functions",
            "Trading Procedure"
        ]
    },
    {
        "chapter_number": 11,
        "chapter_name": "Marketing Management",
        "description": "Marketing concepts, marketing mix. Product, price, place, promotion decisions.",
        "topics": [
            "Meaning of Marketing",
            "Marketing vs Selling",
            "Marketing Concepts",
            "Marketing Functions",
            "Marketing Mix",
            "Product Decisions",
            "Price Decisions",
            "Place (Distribution)",
            "Promotion Mix"
        ]
    },
    {
        "chapter_number": 12,
        "chapter_name": "Consumer Protection",
        "description": "Consumer rights and responsibilities. Consumer protection act, redressal machinery.",
        "topics": [
            "Importance of Consumer Protection",
            "Consumer Rights",
            "Consumer Responsibilities",
            "Consumer Protection Act 2019",
            "Redressal Machinery",
            "Consumer Awareness",
            "Legal Provisions"
        ]
    }
]

CBSE_CLASS_12_ECONOMICS = [
    {
        "chapter_number": 1,
        "chapter_name": "Introduction to Microeconomics",
        "description": "Meaning of microeconomics, central problems. Production possibility curve.",
        "topics": [
            "Meaning of Economy",
            "Central Problems of Economy",
            "Production Possibility Curve",
            "Opportunity Cost",
            "Economic Systems",
            "Positive and Normative Economics"
        ]
    },
    {
        "chapter_number": 2,
        "chapter_name": "Theory of Consumer Behaviour",
        "description": "Utility analysis, indifference curve. Consumer equilibrium and demand.",
        "topics": [
            "Total and Marginal Utility",
            "Law of Diminishing Marginal Utility",
            "Indifference Curve",
            "Properties of Indifference Curve",
            "Budget Line",
            "Consumer Equilibrium",
            "Demand Curve from IC"
        ]
    },
    {
        "chapter_number": 3,
        "chapter_name": "Demand",
        "description": "Law of demand, determinants of demand. Elasticity of demand.",
        "topics": [
            "Meaning of Demand",
            "Law of Demand",
            "Determinants of Demand",
            "Movement vs Shift",
            "Price Elasticity of Demand",
            "Factors Affecting Elasticity",
            "Methods of Measuring Elasticity"
        ]
    },
    {
        "chapter_number": 4,
        "chapter_name": "Production and Costs",
        "description": "Production function, law of variable proportions. Returns to scale, cost concepts.",
        "topics": [
            "Production Function",
            "Total, Average, Marginal Product",
            "Law of Variable Proportions",
            "Returns to Scale",
            "Cost Concepts",
            "Short Run Costs",
            "Long Run Costs"
        ]
    },
    {
        "chapter_number": 5,
        "chapter_name": "Theory of the Firm under Perfect Competition",
        "description": "Perfect competition features, revenue. Equilibrium of firm and industry.",
        "topics": [
            "Features of Perfect Competition",
            "Revenue - Total, Average, Marginal",
            "Producer's Equilibrium",
            "Supply Curve of Firm",
            "Supply Curve of Industry",
            "Price Determination"
        ]
    },
    {
        "chapter_number": 6,
        "chapter_name": "Non-Competitive Markets",
        "description": "Monopoly, monopolistic competition. Price and output determination.",
        "topics": [
            "Features of Monopoly",
            "Price Determination under Monopoly",
            "Monopolistic Competition",
            "Product Differentiation",
            "Price and Output under Monopolistic",
            "Oligopoly Features"
        ]
    },
    {
        "chapter_number": 7,
        "chapter_name": "National Income and Related Aggregates",
        "description": "Concepts of national income. Methods of calculating national income.",
        "topics": [
            "Circular Flow of Income",
            "Concepts of National Income",
            "GDP, GNP, NDP, NNP",
            "National Income at Market and Factor Cost",
            "Real and Nominal Income",
            "Methods of Calculation"
        ]
    },
    {
        "chapter_number": 8,
        "chapter_name": "Money and Banking",
        "description": "Functions of money, central bank, commercial banks. Money creation.",
        "topics": [
            "Meaning and Functions of Money",
            "Supply of Money",
            "Commercial Banks - Functions",
            "Credit Creation",
            "Central Bank - Functions",
            "Quantitative Credit Control",
            "Qualitative Credit Control"
        ]
    },
    {
        "chapter_number": 9,
        "chapter_name": "Determination of Income and Employment",
        "description": "Aggregate demand and supply. Equilibrium income, multiplier effect.",
        "topics": [
            "Aggregate Demand",
            "Aggregate Supply",
            "Consumption Function",
            "Investment Function",
            "Equilibrium Level of Income",
            "Investment Multiplier",
            "Excess Demand and Supply"
        ]
    },
    {
        "chapter_number": 10,
        "chapter_name": "Government Budget and the Economy",
        "description": "Budget components, types of budget. Fiscal policy and deficit.",
        "topics": [
            "Meaning of Government Budget",
            "Objectives of Budget",
            "Budget Receipts",
            "Budget Expenditure",
            "Types of Budget",
            "Fiscal Deficit",
            "Revenue Deficit",
            "Primary Deficit"
        ]
    },
    {
        "chapter_number": 11,
        "chapter_name": "Balance of Payments",
        "description": "BOP components, current and capital account. Foreign exchange rate.",
        "topics": [
            "Meaning of Balance of Payments",
            "Current Account",
            "Capital Account",
            "Balance of Trade",
            "BOP Surplus and Deficit",
            "Foreign Exchange Rate",
            "Fixed vs Flexible Exchange Rate"
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
    print("SEEDING CBSE CLASS 9 ADDITIONAL CHAPTERS")
    print("=" * 60)
    
    total += seed_chapters(cur, "cbse", "class-9", "Social Science", CBSE_CLASS_9_SOCIAL_SCIENCE)
    print(f"  ✓ Social Science: {len(CBSE_CLASS_9_SOCIAL_SCIENCE)} chapters")
    
    total += seed_chapters(cur, "cbse", "class-9", "English", CBSE_CLASS_9_ENGLISH)
    print(f"  ✓ English: {len(CBSE_CLASS_9_ENGLISH)} chapters")
    
    print("\n" + "=" * 60)
    print("SEEDING CBSE CLASS 10 ADDITIONAL CHAPTERS")
    print("=" * 60)
    
    total += seed_chapters(cur, "cbse", "class-10", "English", CBSE_CLASS_10_ENGLISH)
    print(f"  ✓ English: {len(CBSE_CLASS_10_ENGLISH)} chapters")
    
    print("\n" + "=" * 60)
    print("SEEDING CBSE CLASS 11 COMMERCE STREAM")
    print("=" * 60)
    
    total += seed_chapters(cur, "cbse", "class-11", "Accountancy", CBSE_CLASS_11_ACCOUNTANCY, "commerce")
    print(f"  ✓ Accountancy: {len(CBSE_CLASS_11_ACCOUNTANCY)} chapters")
    
    total += seed_chapters(cur, "cbse", "class-11", "Business Studies", CBSE_CLASS_11_BUSINESS_STUDIES, "commerce")
    print(f"  ✓ Business Studies: {len(CBSE_CLASS_11_BUSINESS_STUDIES)} chapters")
    
    total += seed_chapters(cur, "cbse", "class-11", "Economics", CBSE_CLASS_11_ECONOMICS, "commerce")
    print(f"  ✓ Economics: {len(CBSE_CLASS_11_ECONOMICS)} chapters")
    
    print("\n" + "=" * 60)
    print("SEEDING CBSE CLASS 12 COMMERCE STREAM")
    print("=" * 60)
    
    total += seed_chapters(cur, "cbse", "class-12", "Accountancy", CBSE_CLASS_12_ACCOUNTANCY, "commerce")
    print(f"  ✓ Accountancy: {len(CBSE_CLASS_12_ACCOUNTANCY)} chapters")
    
    total += seed_chapters(cur, "cbse", "class-12", "Business Studies", CBSE_CLASS_12_BUSINESS_STUDIES, "commerce")
    print(f"  ✓ Business Studies: {len(CBSE_CLASS_12_BUSINESS_STUDIES)} chapters")
    
    total += seed_chapters(cur, "cbse", "class-12", "Economics", CBSE_CLASS_12_ECONOMICS, "commerce")
    print(f"  ✓ Economics: {len(CBSE_CLASS_12_ECONOMICS)} chapters")
    
    conn.commit()
    conn.close()
    
    print("\n" + "=" * 60)
    print(f"SEED COMPLETE: {total} additional chapters seeded")
    print("=" * 60 + "\n")


if __name__ == "__main__":
    main()
