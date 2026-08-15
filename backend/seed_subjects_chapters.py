"""
seed_subjects_chapters.py — Seed subjects and chapters from existing curriculum data.

Run:  python seed_subjects_chapters.py

Creates:
  • Subjects from curriculum.subjects JSON for each board+standard
  • Default chapters (1-10) for each subject

Uses the existing curriculum table data. Safe to run multiple times (UPSERT).
"""
import json
import os
import sys
from urllib.parse import urlparse, quote, urlunparse
import psycopg2
import psycopg2.extras
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")
if not DATABASE_URL:
    print("ERROR: DATABASE_URL not set in .env")
    sys.exit(1)

# Strip SQLAlchemy dialect suffix (e.g., postgresql+asyncpg -> postgresql)
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

conn = psycopg2.connect(DATABASE_URL, cursor_factory=psycopg2.extras.RealDictCursor)
cur = conn.cursor()

# ── Default chapter templates per subject ─────────────────────────
# These are generic chapter names; schools can customize via admin panel
DEFAULT_CHAPTERS = {
    # Class 9-10 Science subjects
    "Science": [
        "Matter in Our Surroundings",
        "Is Matter Around Us Pure",
        "Atoms and Molecules",
        "Structure of the Atom",
        "The Fundamental Unit of Life",
        "Tissues",
        "Motion",
        "Force and Laws of Motion",
        "Gravitation",
        "Work and Energy",
    ],
    "Mathematics": [
        "Number Systems",
        "Polynomials",
        "Coordinate Geometry",
        "Linear Equations in Two Variables",
        "Introduction to Euclid's Geometry",
        "Lines and Angles",
        "Triangles",
        "Quadrilaterals",
        "Areas of Parallelograms and Triangles",
        "Circles",
    ],
    "Social Science": [
        "The French Revolution",
        "Socialism in Europe and the Russian Revolution",
        "Nazism and the Rise of Hitler",
        "Forest Society and Colonialism",
        "Pastoralists in the Modern World",
        "India - Size and Location",
        "Physical Features of India",
        "Drainage",
        "Climate",
        "Natural Vegetation and Wildlife",
    ],
    "English": [
        "Reading Comprehension",
        "Writing Skills - Letters",
        "Writing Skills - Essays",
        "Grammar - Tenses",
        "Grammar - Voice",
        "Grammar - Narration",
        "Literature - Prose",
        "Literature - Poetry",
        "Literature - Drama",
        "Vocabulary and Word Power",
    ],
    "Hindi": [
        "गद्य खंड - कहानी",
        "गद्य खंड - निबंध",
        "पद्य खंड - कविता",
        "व्याकरण - संज्ञा और सर्वनाम",
        "व्याकरण - क्रिया और विशेषण",
        "व्याकरण - समास और संधि",
        "पत्र लेखन",
        "निबंध लेखन",
        "अपठित गद्यांश",
        "मुहावरे और लोकोक्तियाँ",
    ],
    # Class 11-12 subjects
    "Physics": [
        "Physical World and Measurement",
        "Kinematics",
        "Laws of Motion",
        "Work, Energy and Power",
        "Motion of System of Particles",
        "Gravitation",
        "Properties of Bulk Matter",
        "Thermodynamics",
        "Kinetic Theory",
        "Oscillations and Waves",
    ],
    "Chemistry": [
        "Some Basic Concepts of Chemistry",
        "Structure of Atom",
        "Classification of Elements",
        "Chemical Bonding and Molecular Structure",
        "States of Matter",
        "Thermodynamics",
        "Equilibrium",
        "Redox Reactions",
        "Hydrogen",
        "The s-Block Elements",
    ],
    "Biology": [
        "The Living World",
        "Biological Classification",
        "Plant Kingdom",
        "Animal Kingdom",
        "Morphology of Flowering Plants",
        "Anatomy of Flowering Plants",
        "Structural Organisation in Animals",
        "Cell: The Unit of Life",
        "Biomolecules",
        "Cell Cycle and Cell Division",
    ],
    "Computer Science": [
        "Computer Fundamentals",
        "Getting Started with Python",
        "Python Fundamentals",
        "Data Handling",
        "Conditional and Iterative Statements",
        "String Manipulation",
        "Lists",
        "Tuples and Dictionaries",
        "Introduction to NumPy",
        "Database Concepts",
    ],
    "Economics": [
        "Introduction to Economics",
        "Collection of Data",
        "Organisation of Data",
        "Presentation of Data",
        "Measures of Central Tendency",
        "Measures of Dispersion",
        "Correlation",
        "Index Numbers",
        "Introduction to Microeconomics",
        "Consumer's Equilibrium",
    ],
    "Accountancy": [
        "Introduction to Accounting",
        "Theory Base of Accounting",
        "Recording of Transactions I",
        "Recording of Transactions II",
        "Bank Reconciliation Statement",
        "Trial Balance and Rectification of Errors",
        "Depreciation, Provisions and Reserves",
        "Bill of Exchange",
        "Financial Statements I",
        "Financial Statements II",
    ],
    "Business Studies": [
        "Nature and Purpose of Business",
        "Forms of Business Organisation",
        "Private, Public and Global Enterprises",
        "Business Services",
        "Emerging Modes of Business",
        "Social Responsibilities of Business",
        "Formation of a Company",
        "Sources of Business Finance",
        "Small Business",
        "Internal Trade",
    ],
    # Regional language subjects
    "Gujarati": [
        "ગદ્ય વિભાગ - વાર્તા",
        "ગદ્ય વિભાગ - નિબંધ",
        "પદ્ય વિભાગ - કવિતા",
        "વ્યાકરણ - નામ અને સર્વનામ",
        "વ્યાકરણ - ક્રિયાપદ",
        "વ્યાકરણ - સમાસ",
        "પત્ર લેખન",
        "નિબંધ લેખન",
        "અપઠિત ગદ્યાંશ",
        "રૂઢિપ્રયોગો અને કહેવતો",
    ],
    "Marathi": [
        "गद्य विभाग - कथा",
        "गद्य विभाग - निबंध",
        "पद्य विभाग - कविता",
        "व्याकरण - नाम आणि सर्वनाम",
        "व्याकरण - क्रियापद",
        "व्याकरण - समास आणि संधी",
        "पत्र लेखन",
        "निबंध लेखन",
        "अवांतर वाचन",
        "म्हणी आणि वाक्प्रचार",
    ],
    "Tamil": [
        "உரைநடை - சிறுகதை",
        "உரைநடை - கட்டுரை",
        "பாடல் பகுதி - கவிதை",
        "இலக்கணம் - பெயர்ச்சொல்",
        "இலக்கணம் - வினைச்சொல்",
        "இலக்கணம் - தொகைச்சொல்",
        "கடிதம் எழுதுதல்",
        "கட்டுரை எழுதுதல்",
        "படிக்காத பத்தி",
        "பழமொழிகள் மற்றும் முதுமொழிகள்",
    ],
    "Kannada": [
        "ಗದ್ಯ ವಿಭಾಗ - ಕಥೆ",
        "ಗದ್ಯ ವಿಭಾಗ - ಪ್ರಬಂಧ",
        "ಪದ್ಯ ವಿಭಾಗ - ಕವಿತೆ",
        "ವ್ಯಾಕರಣ - ನಾಮಪದ",
        "ವ್ಯಾಕರಣ - ಕ್ರಿಯಾಪದ",
        "ವ್ಯಾಕರಣ - ಸಮಾಸ",
        "ಪತ್ರ ಬರಹ",
        "ಪ್ರಬಂಧ ಬರಹ",
        "ಅಪಠಿತ ಗದ್ಯ",
        "ಗಾದೆಗಳು ಮತ್ತು ನುಡಿಗಟ್ಟುಗಳು",
    ],
}

# Generic chapter template for subjects not in the list
GENERIC_CHAPTERS = [
    "Chapter 1 - Introduction",
    "Chapter 2 - Fundamentals",
    "Chapter 3 - Core Concepts",
    "Chapter 4 - Applications",
    "Chapter 5 - Advanced Topics I",
    "Chapter 6 - Advanced Topics II",
    "Chapter 7 - Problem Solving",
    "Chapter 8 - Practice Exercises",
    "Chapter 9 - Case Studies",
    "Chapter 10 - Summary and Review",
]

def get_chapters_for_subject(subject_name):
    """Get chapter list for a subject, using template or generic."""
    return DEFAULT_CHAPTERS.get(subject_name, GENERIC_CHAPTERS)

# ── Step 1: Extract unique subjects from curriculum ───────────────
print("Step 1: Extracting subjects from curriculum...")

cur.execute("""
    SELECT DISTINCT board_id, standard_id, subjects
    FROM curriculum
    WHERE is_active = TRUE AND subjects IS NOT NULL AND subjects != '[]'
""")

subject_set = set()  # (board_id, standard_id, subject_name)
for row in cur.fetchall():
    board_id = row["board_id"]
    standard_id = row["standard_id"]
    subjects_json = row["subjects"]
    
    if isinstance(subjects_json, str):
        try:
            subjects = json.loads(subjects_json)
        except json.JSONDecodeError:
            continue
    else:
        subjects = subjects_json
    
    if isinstance(subjects, list):
        for subj in subjects:
            if subj:
                subject_set.add((board_id, standard_id, subj))

print(f"  Found {len(subject_set)} unique board+standard+subject combinations")

# ── Step 2: Insert subjects ───────────────────────────────────────
print("Step 2: Inserting subjects...")

subjects_inserted = subjects_updated = 0
subject_ids = {}  # (board_id, standard_id, subject_name) -> subject_id

for idx, (board_id, standard_id, subject_name) in enumerate(sorted(subject_set)):
    # Create a unique ID for the subject
    subject_id = f"{board_id}_{standard_id}_{subject_name.lower().replace(' ', '-').replace('/', '-')}"
    subject_ids[(board_id, standard_id, subject_name)] = subject_id
    
    try:
        cur.execute(
            """INSERT INTO subjects (id, name, board_id, standard_id, sort_order, is_active)
               VALUES (%s, %s, %s, %s, %s, TRUE)
               ON CONFLICT (board_id, standard_id, name)
               DO UPDATE SET is_active = TRUE""",
            (subject_id, subject_name, board_id, standard_id, idx),
        )
        if cur.statusmessage.startswith("INSERT"):
            subjects_inserted += 1
        else:
            subjects_updated += 1
    except Exception as e:
        print(f"  ERROR inserting subject {subject_id}: {e}")
        conn.rollback()
        cur = conn.cursor()

conn.commit()
print(f"  Subjects: Inserted={subjects_inserted}, Updated={subjects_updated}")

# ── Step 3: Insert chapters for each subject ──────────────────────
print("Step 3: Inserting chapters...")

chapters_inserted = chapters_updated = chapters_errors = 0

for (board_id, standard_id, subject_name), subject_id in subject_ids.items():
    chapters = get_chapters_for_subject(subject_name)
    
    for chapter_num, chapter_name in enumerate(chapters, 1):
        try:
            cur.execute(
                """INSERT INTO chapters (board_id, standard_id, subject_id, chapter_number, chapter_name, is_active)
                   VALUES (%s, %s, %s, %s, %s, TRUE)
                   ON CONFLICT (board_id, standard_id, subject_id, chapter_number)
                   DO UPDATE SET chapter_name = EXCLUDED.chapter_name, is_active = TRUE""",
                (board_id, standard_id, subject_id, chapter_num, chapter_name),
            )
            if cur.statusmessage.startswith("INSERT"):
                chapters_inserted += 1
            else:
                chapters_updated += 1
        except Exception as e:
            print(f"  ERROR inserting chapter {board_id}/{standard_id}/{subject_name}/{chapter_num}: {e}")
            conn.rollback()
            chapters_errors += 1
            cur = conn.cursor()

conn.commit()
cur.close()
conn.close()

print(f"  Chapters: Inserted={chapters_inserted}, Updated={chapters_updated}, Errors={chapters_errors}")
print("\n✅ Done!")
print(f"   Total subjects: {len(subject_ids)}")
print(f"   Total chapters: {chapters_inserted + chapters_updated}")
