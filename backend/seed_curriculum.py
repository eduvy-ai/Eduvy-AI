"""
seed_curriculum.py — Seed curriculum data into the DB.

Creates:
  • 5 boards (CBSE, ICSE, GSEB, AP/TS Board, TN Board)
  • 4 standards (Class 9, 10, 11, 12)
  • 5 mediums (English, Hindi, Gujarati, Telugu, Tamil)
  • 3 streams (Science, Commerce, Arts) for Class 11-12
  • Subjects per board×class×stream combination

Run: python seed_curriculum.py
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

conn = psycopg2.connect(DATABASE_URL, cursor_factory=psycopg2.extras.RealDictCursor)
cur = conn.cursor()

# ══════════════════════════════════════════════════════════════════
# BOARDS
# ══════════════════════════════════════════════════════════════════
BOARDS = [
    ("cbse", "CBSE", 0),
    ("icse", "ICSE", 1),
    ("gseb", "GSEB", 2),
    ("ap-ts", "AP/TS Board", 3),  # Andhra Pradesh / Telangana (Telugu)
    ("tn-board", "TN Board", 4),   # Tamil Nadu
]

for bid, bname, bord in BOARDS:
    cur.execute(
        "INSERT INTO boards (id,name,sort_order,is_active) VALUES (%s,%s,%s,TRUE)"
        " ON CONFLICT (id) DO UPDATE SET name=EXCLUDED.name, sort_order=EXCLUDED.sort_order",
        (bid, bname, bord),
    )
print(f"✓ Boards seeded: {len(BOARDS)}")

# ══════════════════════════════════════════════════════════════════
# STANDARDS (Class 9, 10, 11, 12)
# ══════════════════════════════════════════════════════════════════
STANDARDS = [
    ("class-9", "Class 9", 9, 1),
    ("class-10", "Class 10", 10, 2),
    ("class-11", "Class 11", 11, 3),
    ("class-12", "Class 12", 12, 4),
]

for sid, sname, grade, sort in STANDARDS:
    cur.execute(
        "INSERT INTO standards (id,name,grade_num,sort_order,is_active) VALUES (%s,%s,%s,%s,TRUE)"
        " ON CONFLICT (id) DO UPDATE SET name=EXCLUDED.name, grade_num=EXCLUDED.grade_num",
        (sid, sname, grade, sort),
    )
print(f"✓ Standards seeded: {len(STANDARDS)}")

# ══════════════════════════════════════════════════════════════════
# MEDIUMS
# ══════════════════════════════════════════════════════════════════
MEDIUMS = [
    ("english", "English", 0),
    ("hindi", "Hindi", 1),
    ("gujarati", "Gujarati", 2),
    ("telugu", "Telugu", 3),
    ("tamil", "Tamil", 4),
]

for mid, mname, mord in MEDIUMS:
    cur.execute(
        "INSERT INTO mediums (id,name,sort_order,is_active) VALUES (%s,%s,%s,TRUE)"
        " ON CONFLICT (id) DO UPDATE SET name=EXCLUDED.name, sort_order=EXCLUDED.sort_order",
        (mid, mname, mord),
    )
print(f"✓ Mediums seeded: {len(MEDIUMS)}")

# ══════════════════════════════════════════════════════════════════
# STREAMS (Science, Commerce, Arts for Class 11-12)
# ══════════════════════════════════════════════════════════════════
STREAMS = [
    ("science", "Science", 0),
    ("commerce", "Commerce", 1),
    ("arts", "Arts", 2),
]

for sid, sname, sord in STREAMS:
    cur.execute(
        "INSERT INTO streams (id,name,sort_order,is_active) VALUES (%s,%s,%s,TRUE)"
        " ON CONFLICT (id) DO UPDATE SET name=EXCLUDED.name, sort_order=EXCLUDED.sort_order",
        (sid, sname, sord),
    )
print(f"✓ Streams seeded: {len(STREAMS)}")

conn.commit()

# ══════════════════════════════════════════════════════════════════
# SUBJECTS
# ══════════════════════════════════════════════════════════════════

# Class 9 & 10 subjects (no stream needed)
SUBJECTS_9_10 = {
    "cbse": ["English", "Hindi", "Mathematics", "Science", "Social Science", "IT"],
    "icse": ["English", "Hindi", "Mathematics", "Physics", "Chemistry", "Biology", "History", "Geography", "Computer Applications"],
    "gseb": ["Gujarati", "Hindi", "English", "Mathematics", "Vigyan", "Samajik Vigyan"],
    "ap-ts": ["Telugu", "Hindi", "English", "Mathematics", "Physical Science", "Biological Science", "Social Studies"],
    "tn-board": ["Tamil", "English", "Mathematics", "Science", "Social Science"],
}

# Class 11-12 subjects BY STREAM
SUBJECTS_11_12 = {
    "cbse": {
        "science": ["Physics", "Chemistry", "Mathematics", "Biology", "English", "Computer Science", "Physical Education"],
        "commerce": ["Accountancy", "Business Studies", "Economics", "Mathematics", "English", "Informatics Practices", "Physical Education"],
        "arts": ["History", "Geography", "Political Science", "Economics", "English", "Hindi", "Sociology", "Psychology", "Physical Education"],
    },
    "icse": {
        "science": ["Physics", "Chemistry", "Mathematics", "Biology", "English", "Computer Science", "Physical Education"],
        "commerce": ["Accounts", "Commerce", "Economics", "Mathematics", "English", "Computer Science", "Physical Education"],
        "arts": ["History", "Geography", "Political Science", "Economics", "English", "Sociology", "Psychology", "Physical Education"],
    },
    "gseb": {
        "science": ["Physics", "Chemistry", "Mathematics", "Biology", "English", "Gujarati", "Computer Science"],
        "commerce": ["Accountancy", "Statistics", "Economics", "Commerce", "English", "Gujarati", "Computer Science"],
        "arts": ["History", "Geography", "Political Science", "Economics", "English", "Gujarati", "Psychology", "Sociology"],
    },
    "ap-ts": {
        "science": ["Physics", "Chemistry", "Mathematics", "Biology", "English", "Telugu", "Computer Science"],
        "commerce": ["Accountancy", "Commerce", "Economics", "Business Studies", "English", "Telugu"],
        "arts": ["History", "Geography", "Political Science", "Economics", "English", "Telugu", "Public Administration", "Sociology"],
    },
    "tn-board": {
        "science": ["Physics", "Chemistry", "Mathematics", "Biology", "English", "Tamil", "Computer Science"],
        "commerce": ["Accountancy", "Commerce", "Economics", "Business Maths", "English", "Tamil", "Computer Applications"],
        "arts": ["History", "Geography", "Political Science", "Economics", "English", "Tamil", "Sociology"],
    },
}

def insert_subject(board_id, standard_id, stream_id, name, sort_order):
    """Insert a subject."""
    if stream_id:
        subj_id = f"{board_id}_{standard_id}_{stream_id}_{name.lower().replace(' ', '-').replace('&', 'and')}"
    else:
        subj_id = f"{board_id}_{standard_id}_{name.lower().replace(' ', '-').replace('&', 'and')}"
    
    try:
        cur.execute(
            """INSERT INTO subjects (id, name, board_id, standard_id, stream_id, sort_order, is_active)
               VALUES (%s, %s, %s, %s, %s, %s, TRUE)
               ON CONFLICT (id) 
               DO UPDATE SET name=EXCLUDED.name, sort_order=EXCLUDED.sort_order, is_active=TRUE""",
            (subj_id, name, board_id, standard_id, stream_id, sort_order),
        )
        return True
    except Exception as e:
        print(f"  Subject error {board_id}/{standard_id}/{stream_id}/{name}: {e}")
        conn.rollback()
        return False

print("\nSeeding subjects...")
subject_count = 0

for board_id in ["cbse", "icse", "gseb", "ap-ts", "tn-board"]:
    # Class 9 & 10: No stream
    for cls in ["class-9", "class-10"]:
        subjects = SUBJECTS_9_10[board_id]
        for idx, subj in enumerate(subjects):
            if insert_subject(board_id, cls, None, subj, idx):
                subject_count += 1
    
    # Class 11 & 12: With streams
    for cls in ["class-11", "class-12"]:
        for stream_id in ["science", "commerce", "arts"]:
            subjects = SUBJECTS_11_12[board_id][stream_id]
            for idx, subj in enumerate(subjects):
                if insert_subject(board_id, cls, stream_id, subj, idx):
                    subject_count += 1
    
    print(f"  ✓ {board_id.upper()}")

conn.commit()
print(f"\n✓ Total subjects seeded: {subject_count}")

# ══════════════════════════════════════════════════════════════════
# CURRICULUM TABLE (board × standard × medium → subjects list)
# ══════════════════════════════════════════════════════════════════

print("\nSeeding curriculum lookup table...")

def get_subjects_list(board_id, cls):
    """Get flat subject list for a class."""
    if cls in [9, 10]:
        return SUBJECTS_9_10[board_id]
    else:
        # For 11-12, combine all stream subjects (unique)
        all_subjects = set()
        for stream in ["science", "commerce", "arts"]:
            all_subjects.update(SUBJECTS_11_12[board_id][stream])
        return list(all_subjects)

# Board → available mediums mapping
BOARD_MEDIUMS = {
    "cbse": ["english", "hindi"],
    "icse": ["english"],
    "gseb": ["gujarati", "english"],
    "ap-ts": ["telugu", "english"],
    "tn-board": ["tamil", "english"],
}

curriculum_count = 0

for board_id, mediums in BOARD_MEDIUMS.items():
    for medium_id in mediums:
        for cls in [9, 10, 11, 12]:
            standard_id = f"class-{cls}"
            subjects = get_subjects_list(board_id, cls)
            try:
                cur.execute(
                    """INSERT INTO curriculum (board_id, standard_id, medium_id, subjects)
                       VALUES (%s, %s, %s, %s)
                       ON CONFLICT (board_id, standard_id, medium_id)
                       DO UPDATE SET subjects=EXCLUDED.subjects, is_active=TRUE""",
                    (board_id, standard_id, medium_id, json.dumps(subjects)),
                )
                curriculum_count += 1
            except Exception as e:
                print(f"  Curriculum error {board_id}/{standard_id}/{medium_id}: {e}")
                conn.rollback()

conn.commit()
print(f"✓ Curriculum rows seeded: {curriculum_count}")

# ══════════════════════════════════════════════════════════════════
# SUMMARY
# ══════════════════════════════════════════════════════════════════
cur.close()
conn.close()

print("\n" + "="*60)
print("SEED COMPLETE")
print("="*60)
print(f"Boards:     {len(BOARDS)} (CBSE, ICSE, GSEB, AP/TS, TN Board)")
print(f"Standards:  {len(STANDARDS)} (Class 9, 10, 11, 12)")
print(f"Mediums:    {len(MEDIUMS)} (English, Hindi, Gujarati, Telugu, Tamil)")
print(f"Streams:    {len(STREAMS)} (Science, Commerce, Arts)")
print(f"Subjects:   {subject_count}")
print(f"Curriculum: {curriculum_count}")
print("="*60)
