"""
seed_curriculum.py — Seed default Indian curriculum data into the DB.

Run once:  python seed_curriculum.py

Creates:
  • All 10 boards
  • Class 1–12 standards
  • All 11 language mediums
  • Default subject lists per board×class×medium combination

Uses the same UPSERT logic as the import API so running it twice is safe.
"""
import json
import os
import sys
import psycopg2
import psycopg2.extras
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")
if not DATABASE_URL:
    print("ERROR: DATABASE_URL not set in .env"); sys.exit(1)

conn = psycopg2.connect(DATABASE_URL, cursor_factory=psycopg2.extras.RealDictCursor)
cur = conn.cursor()

# ── Boards ────────────────────────────────────────────────────────
BOARDS = [
    ("cbse",     "CBSE",     0),
    ("icse",     "ICSE",     1),
    ("gseb",     "GSEB",     2),
    ("msbshse",  "MSBSHSE",  3),
    ("rbse",     "RBSE",     4),
    ("up-board", "UP Board", 5),
    ("bseb",     "BSEB",     6),
    ("tn-board", "TN Board", 7),
    ("kar-board","KAR Board",8),
    ("pseb",     "PSEB",     9),
]

for bid, bname, bord in BOARDS:
    cur.execute(
        "INSERT INTO boards (id,name,sort_order,is_active) VALUES (%s,%s,%s,TRUE)"
        " ON CONFLICT (id) DO UPDATE SET name=EXCLUDED.name, sort_order=EXCLUDED.sort_order",
        (bid, bname, bord),
    )

# ── Standards ─────────────────────────────────────────────────────
for i in range(1, 13):
    cur.execute(
        "INSERT INTO standards (id,name,grade_num,sort_order,is_active) VALUES (%s,%s,%s,%s,TRUE)"
        " ON CONFLICT (id) DO UPDATE SET name=EXCLUDED.name, grade_num=EXCLUDED.grade_num",
        (f"class-{i}", f"Class {i}", i, i),
    )

# ── Mediums ───────────────────────────────────────────────────────
MEDIUMS = [
    ("english",  "English",  0),
    ("hindi",    "Hindi",    1),
    ("gujarati", "Gujarati", 2),
    ("marathi",  "Marathi",  3),
    ("tamil",    "Tamil",    4),
    ("telugu",   "Telugu",   5),
    ("kannada",  "Kannada",  6),
    ("bengali",  "Bengali",  7),
    ("punjabi",  "Punjabi",  8),
    ("odia",     "Odia",     9),
    ("urdu",     "Urdu",    10),
]
for mid, mname, mord in MEDIUMS:
    cur.execute(
        "INSERT INTO mediums (id,name,sort_order,is_active) VALUES (%s,%s,%s,TRUE)"
        " ON CONFLICT (id) DO UPDATE SET name=EXCLUDED.name, sort_order=EXCLUDED.sort_order",
        (mid, mname, mord),
    )

# ── Subject lists ─────────────────────────────────────────────────
# Key: (board_id, class_num, medium_id) → [subjects]
# For brevity we define base subject sets and broadcast to relevant combos.

# Base CBSE subjects (used as default for most boards in English medium)
CBSE_ENG = {
    1:  ["English", "Hindi", "Mathematics", "EVS", "Drawing"],
    2:  ["English", "Hindi", "Mathematics", "EVS", "Drawing"],
    3:  ["English", "Hindi", "Mathematics", "EVS", "Drawing"],
    4:  ["English", "Hindi", "Mathematics", "Science", "Social Studies"],
    5:  ["English", "Hindi", "Mathematics", "Science", "Social Studies"],
    6:  ["English", "Hindi", "Mathematics", "Science", "Social Science", "Sanskrit"],
    7:  ["English", "Hindi", "Mathematics", "Science", "Social Science", "Sanskrit"],
    8:  ["English", "Hindi", "Mathematics", "Science", "Social Science", "Sanskrit"],
    9:  ["English", "Hindi", "Mathematics", "Science", "Social Science", "Sanskrit", "IT"],
    10: ["English", "Hindi", "Mathematics", "Science", "Social Science", "Sanskrit", "IT"],
    11: ["Physics", "Chemistry", "Mathematics", "Biology", "English", "Computer Science",
         "Economics", "History", "Geography", "Accountancy", "Business Studies"],
    12: ["Physics", "Chemistry", "Mathematics", "Biology", "English", "Computer Science",
         "Economics", "History", "Geography", "Accountancy", "Business Studies"],
}

# GSEB Gujarati medium
GSEB_GUJ = {
    1:  ["Gujarati", "Hindi", "Mathematics", "Paryavaran", "Drawing"],
    2:  ["Gujarati", "Hindi", "Mathematics", "Paryavaran", "Drawing"],
    3:  ["Gujarati", "Hindi", "English", "Mathematics", "Paryavaran"],
    4:  ["Gujarati", "Hindi", "English", "Mathematics", "Vigyan ane Taknik"],
    5:  ["Gujarati", "Hindi", "English", "Mathematics", "Vigyan ane Taknik"],
    6:  ["Gujarati", "Hindi", "English", "Mathematics", "Vigyan", "Samajik Vigyan", "Sanskrit"],
    7:  ["Gujarati", "Hindi", "English", "Mathematics", "Vigyan", "Samajik Vigyan", "Sanskrit"],
    8:  ["Gujarati", "Hindi", "English", "Mathematics", "Vigyan", "Samajik Vigyan", "Sanskrit"],
    9:  ["Gujarati", "Hindi", "English", "Mathematics", "Vigyan", "Samajik Vigyan", "Sanskrit"],
    10: ["Gujarati", "Hindi", "English", "Mathematics", "Vigyan", "Samajik Vigyan", "Sanskrit"],
    11: ["Physics", "Chemistry", "Mathematics", "Biology", "English", "Gujarati",
         "Computer Science", "Economics", "Commerce", "Accounts"],
    12: ["Physics", "Chemistry", "Mathematics", "Biology", "English", "Gujarati",
         "Computer Science", "Economics", "Commerce", "Accounts"],
}

# MSBSHSE Marathi medium
MSBSHSE_MAR = {
    1:  ["Marathi", "Hindi", "Mathematics", "Parishar Abhyas", "Drawing"],
    2:  ["Marathi", "Hindi", "Mathematics", "Parishar Abhyas", "Drawing"],
    3:  ["Marathi", "Hindi", "English", "Mathematics", "Parishar Abhyas"],
    4:  ["Marathi", "Hindi", "English", "Mathematics", "Vigyan", "Samajik Vidnyan"],
    5:  ["Marathi", "Hindi", "English", "Mathematics", "Vigyan", "Samajik Vidnyan"],
    6:  ["Marathi", "Hindi", "English", "Mathematics", "Vigyan", "Itihas", "Bhugol", "Sanskrit"],
    7:  ["Marathi", "Hindi", "English", "Mathematics", "Vigyan", "Itihas", "Bhugol", "Sanskrit"],
    8:  ["Marathi", "Hindi", "English", "Mathematics", "Vigyan", "Itihas", "Bhugol", "Sanskrit"],
    9:  ["Marathi", "Hindi", "English", "Mathematics", "Vigyan", "Itihas", "Bhugol", "Sanskrit"],
    10: ["Marathi", "Hindi", "English", "Mathematics", "Vigyan", "Itihas", "Bhugol", "Sanskrit"],
    11: ["Physics", "Chemistry", "Mathematics", "Biology", "English", "Marathi",
         "Economics", "Commerce", "Organisation of Commerce"],
    12: ["Physics", "Chemistry", "Mathematics", "Biology", "English", "Marathi",
         "Economics", "Commerce", "Organisation of Commerce"],
}

# TN Board Tamil medium
TN_TAM = {
    1:  ["Tamil", "English", "Mathematics", "Environmental Studies"],
    2:  ["Tamil", "English", "Mathematics", "Environmental Studies"],
    3:  ["Tamil", "English", "Mathematics", "Environmental Studies"],
    4:  ["Tamil", "English", "Mathematics", "Science", "Social Science"],
    5:  ["Tamil", "English", "Mathematics", "Science", "Social Science"],
    6:  ["Tamil", "English", "Mathematics", "Science", "Social Science"],
    7:  ["Tamil", "English", "Mathematics", "Science", "Social Science"],
    8:  ["Tamil", "English", "Mathematics", "Science", "Social Science"],
    9:  ["Tamil", "English", "Mathematics", "Science", "Social Science"],
    10: ["Tamil", "English", "Mathematics", "Science", "Social Science"],
    11: ["Physics", "Chemistry", "Mathematics", "Biology", "Tamil", "English",
         "Economics", "Commerce", "Computer Science"],
    12: ["Physics", "Chemistry", "Mathematics", "Biology", "Tamil", "English",
         "Economics", "Commerce", "Computer Science"],
}

# KAR Board Kannada medium
KAR_KAN = {
    1:  ["Kannada", "English", "Mathematics", "Environmental Studies"],
    2:  ["Kannada", "English", "Mathematics", "Environmental Studies"],
    3:  ["Kannada", "English", "Mathematics", "Environmental Studies"],
    4:  ["Kannada", "English", "Mathematics", "Science", "Social Science"],
    5:  ["Kannada", "English", "Mathematics", "Science", "Social Science"],
    6:  ["Kannada", "Hindi", "English", "Mathematics", "Science", "Social Science"],
    7:  ["Kannada", "Hindi", "English", "Mathematics", "Science", "Social Science"],
    8:  ["Kannada", "Hindi", "English", "Mathematics", "Science", "Social Science"],
    9:  ["Kannada", "Hindi", "English", "Mathematics", "Science", "Social Science"],
    10: ["Kannada", "Hindi", "English", "Mathematics", "Science", "Social Science"],
    11: ["Physics", "Chemistry", "Mathematics", "Biology", "Kannada", "English",
         "Economics", "Commerce", "Computer Science"],
    12: ["Physics", "Chemistry", "Mathematics", "Biology", "Kannada", "English",
         "Economics", "Commerce", "Computer Science"],
}

# All combinations to seed
CURRICULUM = []

# CBSE — English + Hindi mediums for all classes
for cls in range(1, 13):
    CURRICULUM.append(("cbse", f"class-{cls}", "english", CBSE_ENG[cls]))
    # Hindi medium uses same subjects for CBSE
    CURRICULUM.append(("cbse", f"class-{cls}", "hindi", CBSE_ENG[cls]))

# ICSE — English medium only
for cls in range(1, 13):
    CURRICULUM.append(("icse", f"class-{cls}", "english", CBSE_ENG[cls]))

# GSEB — Gujarati + English mediums
for cls in range(1, 13):
    CURRICULUM.append(("gseb", f"class-{cls}", "gujarati", GSEB_GUJ[cls]))
    CURRICULUM.append(("gseb", f"class-{cls}", "english",  CBSE_ENG[cls]))

# MSBSHSE — Marathi + English mediums
for cls in range(1, 13):
    CURRICULUM.append(("msbshse", f"class-{cls}", "marathi", MSBSHSE_MAR[cls]))
    CURRICULUM.append(("msbshse", f"class-{cls}", "english",  CBSE_ENG[cls]))

# RBSE — Hindi + English mediums
for cls in range(1, 13):
    CURRICULUM.append(("rbse", f"class-{cls}", "hindi",   CBSE_ENG[cls]))
    CURRICULUM.append(("rbse", f"class-{cls}", "english", CBSE_ENG[cls]))

# UP Board — Hindi + English mediums
for cls in range(1, 13):
    CURRICULUM.append(("up-board", f"class-{cls}", "hindi",   CBSE_ENG[cls]))
    CURRICULUM.append(("up-board", f"class-{cls}", "english", CBSE_ENG[cls]))

# BSEB — Hindi + English mediums
for cls in range(1, 13):
    CURRICULUM.append(("bseb", f"class-{cls}", "hindi",   CBSE_ENG[cls]))
    CURRICULUM.append(("bseb", f"class-{cls}", "english", CBSE_ENG[cls]))

# TN Board — Tamil + English mediums
for cls in range(1, 13):
    CURRICULUM.append(("tn-board", f"class-{cls}", "tamil",   TN_TAM[cls]))
    CURRICULUM.append(("tn-board", f"class-{cls}", "english", CBSE_ENG[cls]))

# KAR Board — Kannada + English mediums
for cls in range(1, 13):
    CURRICULUM.append(("kar-board", f"class-{cls}", "kannada", KAR_KAN[cls]))
    CURRICULUM.append(("kar-board", f"class-{cls}", "english", CBSE_ENG[cls]))

# PSEB — Punjabi + English mediums
for cls in range(1, 13):
    CURRICULUM.append(("pseb", f"class-{cls}", "punjabi", CBSE_ENG[cls]))
    CURRICULUM.append(("pseb", f"class-{cls}", "english", CBSE_ENG[cls]))

# ── Insert curriculum ─────────────────────────────────────────────
inserted = updated = errors = 0
for board_id, standard_id, medium_id, subjects in CURRICULUM:
    try:
        cur.execute(
            """INSERT INTO curriculum (board_id, standard_id, medium_id, subjects)
               VALUES (%s,%s,%s,%s)
               ON CONFLICT (board_id, standard_id, medium_id)
               DO UPDATE SET subjects=EXCLUDED.subjects, is_active=TRUE,
                             updated_at=CURRENT_TIMESTAMP""",
            (board_id, standard_id, medium_id, json.dumps(subjects)),
        )
        if cur.statusmessage.startswith("INSERT"):
            inserted += 1
        else:
            updated += 1
    except Exception as e:
        print(f"  ERROR {board_id}/{standard_id}/{medium_id}: {e}")
        conn.rollback()
        errors += 1
        # re-open transaction
        cur = conn.cursor()

conn.commit()
cur.close()
conn.close()

print(f"Done. Inserted={inserted} Updated={updated} Errors={errors}")
print("Boards seeded:", len(BOARDS))
print("Standards seeded: Class 1–12")
print("Mediums seeded:", len(MEDIUMS))
print("Curriculum rows:", len(CURRICULUM))
