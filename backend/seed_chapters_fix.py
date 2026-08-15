"""
Fix Chapter Seeding - Proper Subject Name Mapping for All Boards
=================================================================
Maps CBSE chapter data to correct subject names for each board.
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


def get_cbse_chapters(cur, standard_id, subject_name, stream_id=None):
    """Get chapters from CBSE for a subject."""
    subject_id = get_subject_id(cur, "cbse", standard_id, subject_name, stream_id)
    if not subject_id:
        return []
    
    cur.execute("""
        SELECT chapter_number, chapter_name, description, topics
        FROM chapters
        WHERE board_id = 'cbse' AND standard_id = %s AND subject_id = %s
        ORDER BY chapter_number
    """, (standard_id, subject_id))
    return cur.fetchall()


def seed_chapters_direct(cur, board_id, standard_id, subject_name, chapters, stream_id=None):
    """Seed chapters directly to a subject."""
    subject_id = get_subject_id(cur, board_id, standard_id, subject_name, stream_id)
    if not subject_id:
        return 0
    
    count = 0
    for ch in chapters:
        cur.execute("""
            INSERT INTO chapters (board_id, standard_id, subject_id, stream_id, chapter_number, chapter_name, description, topics)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
            ON CONFLICT (board_id, standard_id, subject_id, chapter_number) 
            DO UPDATE SET chapter_name = EXCLUDED.chapter_name, 
                          description = EXCLUDED.description, 
                          topics = EXCLUDED.topics,
                          stream_id = EXCLUDED.stream_id
        """, (board_id, standard_id, subject_id, stream_id, 
              ch['chapter_number'], ch['chapter_name'], ch['description'], ch['topics']))
        count += 1
    return count


def filter_chapters(chapters, start_ch, end_ch):
    """Filter chapters by chapter number range (inclusive)."""
    return [ch for ch in chapters if start_ch <= ch['chapter_number'] <= end_ch]


def main():
    """Main function to fix chapter seeding."""
    conn = psycopg2.connect(DATABASE_URL, cursor_factory=psycopg2.extras.RealDictCursor)
    cur = conn.cursor()
    
    # First, delete incorrectly seeded chapters for other boards
    print("Cleaning up incorrectly seeded chapters...")
    cur.execute("DELETE FROM chapters WHERE board_id != 'cbse'")
    deleted = cur.rowcount
    print(f"  Removed {deleted} chapters from non-CBSE boards\n")
    
    total = 0
    
    # ═══════════════════════════════════════════════════════════════════
    # ICSE BOARD
    # ICSE has separate Physics, Chemistry, Biology for Class 9-10
    # ═══════════════════════════════════════════════════════════════════
    print("=" * 60)
    print("SEEDING ICSE CHAPTERS")
    print("=" * 60)
    
    # Get CBSE Science chapters and split them
    cbse_science_9 = get_cbse_chapters(cur, "class-9", "Science")
    cbse_science_10 = get_cbse_chapters(cur, "class-10", "Science")
    
    # CBSE Class 9 Science has 12 chapters:
    # Ch 1-4: Matter/Atoms (Chemistry)
    # Ch 5-6: Tissues/Cell (Biology) 
    # Ch 7-12: Physics (Motion, Force, Gravity, Work, Sound, Improvement)
    
    # Class 9 - Split Science into Physics, Chemistry, Biology
    # Physics chapters (Motion, Force, Gravitation, Work/Energy, Sound)
    physics_9 = []
    for ch in cbse_science_9:
        if ch['chapter_name'] in ['Motion', 'Force and Laws of Motion', 'Gravitation', 'Work and Energy', 'Sound']:
            physics_9.append(ch)
    
    # Chemistry chapters (Matter, Pure Substances, Atoms, Structure)
    chemistry_9 = []
    for ch in cbse_science_9:
        if 'Matter' in ch['chapter_name'] or 'Pure' in ch['chapter_name'] or 'Atom' in ch['chapter_name']:
            chemistry_9.append(ch)
    
    # Biology chapters (Cell, Tissues, Improvement)
    biology_9 = []
    for ch in cbse_science_9:
        if 'Cell' in ch['chapter_name'] or 'Tissue' in ch['chapter_name'] or 'Improvement' in ch['chapter_name']:
            biology_9.append(ch)
    
    # Renumber chapters for each subject
    def renumber_chapters(chapters):
        result = []
        for i, ch in enumerate(chapters, 1):
            new_ch = dict(ch)
            new_ch['chapter_number'] = i
            result.append(new_ch)
        return result
    
    physics_9 = renumber_chapters(physics_9)
    chemistry_9 = renumber_chapters(chemistry_9)
    biology_9 = renumber_chapters(biology_9)
    
    count = seed_chapters_direct(cur, "icse", "class-9", "Physics", physics_9)
    if count > 0:
        total += count
        print(f"  ✓ Class 9 Physics: {count} chapters")
    
    count = seed_chapters_direct(cur, "icse", "class-9", "Chemistry", chemistry_9)
    if count > 0:
        total += count
        print(f"  ✓ Class 9 Chemistry: {count} chapters")
    
    count = seed_chapters_direct(cur, "icse", "class-9", "Biology", biology_9)
    if count > 0:
        total += count
        print(f"  ✓ Class 9 Biology: {count} chapters")
    
    # Class 10 - Split Science
    # Physics: Light, Electricity, Magnetism
    physics_10 = []
    for ch in cbse_science_10:
        if 'Light' in ch['chapter_name'] or 'Electricity' in ch['chapter_name'] or 'Magnetic' in ch['chapter_name'] or 'Eye' in ch['chapter_name']:
            physics_10.append(ch)
    
    # Chemistry: Reactions, Acids, Metals, Carbon
    chemistry_10 = []
    for ch in cbse_science_10:
        if 'Chemical' in ch['chapter_name'] or 'Acid' in ch['chapter_name'] or 'Metal' in ch['chapter_name'] or 'Carbon' in ch['chapter_name']:
            chemistry_10.append(ch)
    
    # Biology: Life Processes, Control, Reproduction, Heredity, Environment
    biology_10 = []
    for ch in cbse_science_10:
        if 'Life Process' in ch['chapter_name'] or 'Control' in ch['chapter_name'] or 'Reproduce' in ch['chapter_name'] or 'Heredity' in ch['chapter_name'] or 'Environment' in ch['chapter_name']:
            biology_10.append(ch)
    
    physics_10 = renumber_chapters(physics_10)
    chemistry_10 = renumber_chapters(chemistry_10)
    biology_10 = renumber_chapters(biology_10)
    
    count = seed_chapters_direct(cur, "icse", "class-10", "Physics", physics_10)
    if count > 0:
        total += count
        print(f"  ✓ Class 10 Physics: {count} chapters")
    
    count = seed_chapters_direct(cur, "icse", "class-10", "Chemistry", chemistry_10)
    if count > 0:
        total += count
        print(f"  ✓ Class 10 Chemistry: {count} chapters")
    
    count = seed_chapters_direct(cur, "icse", "class-10", "Biology", biology_10)
    if count > 0:
        total += count
        print(f"  ✓ Class 10 Biology: {count} chapters")
    
    # ICSE Social Science -> History + Geography
    cbse_ss_9 = get_cbse_chapters(cur, "class-9", "Social Science")
    cbse_ss_10 = get_cbse_chapters(cur, "class-10", "Social Science")
    
    # Class 9 SS: Ch 1-5 History, 6-11 Geography, 12-16 Civics, 17-20 Economics
    history_9 = renumber_chapters([ch for ch in cbse_ss_9 if ch['chapter_number'] <= 5])
    geography_9 = renumber_chapters([ch for ch in cbse_ss_9 if 6 <= ch['chapter_number'] <= 11])
    
    count = seed_chapters_direct(cur, "icse", "class-9", "History", history_9)
    if count > 0:
        total += count
        print(f"  ✓ Class 9 History: {count} chapters")
    
    count = seed_chapters_direct(cur, "icse", "class-9", "Geography", geography_9)
    if count > 0:
        total += count
        print(f"  ✓ Class 9 Geography: {count} chapters")
    
    # Class 10 SS: Ch 1-5 History, 6-12 Geography, 13-17 Civics, 18-22 Economics
    history_10 = renumber_chapters([ch for ch in cbse_ss_10 if ch['chapter_number'] <= 5])
    geography_10 = renumber_chapters([ch for ch in cbse_ss_10 if 6 <= ch['chapter_number'] <= 12])
    
    count = seed_chapters_direct(cur, "icse", "class-10", "History", history_10)
    if count > 0:
        total += count
        print(f"  ✓ Class 10 History: {count} chapters")
    
    count = seed_chapters_direct(cur, "icse", "class-10", "Geography", geography_10)
    if count > 0:
        total += count
        print(f"  ✓ Class 10 Geography: {count} chapters")
    
    # ICSE Math and English
    cbse_math_9 = get_cbse_chapters(cur, "class-9", "Mathematics")
    cbse_math_10 = get_cbse_chapters(cur, "class-10", "Mathematics")
    cbse_eng_9 = get_cbse_chapters(cur, "class-9", "English")
    cbse_eng_10 = get_cbse_chapters(cur, "class-10", "English")
    
    count = seed_chapters_direct(cur, "icse", "class-9", "Mathematics", cbse_math_9)
    if count > 0:
        total += count
        print(f"  ✓ Class 9 Mathematics: {count} chapters")
    
    count = seed_chapters_direct(cur, "icse", "class-10", "Mathematics", cbse_math_10)
    if count > 0:
        total += count
        print(f"  ✓ Class 10 Mathematics: {count} chapters")
    
    count = seed_chapters_direct(cur, "icse", "class-9", "English", cbse_eng_9)
    if count > 0:
        total += count
        print(f"  ✓ Class 9 English: {count} chapters")
    
    count = seed_chapters_direct(cur, "icse", "class-10", "English", cbse_eng_10)
    if count > 0:
        total += count
        print(f"  ✓ Class 10 English: {count} chapters")
    
    # ICSE Class 11-12 Science (same as CBSE)
    for standard in ["class-11", "class-12"]:
        for subject in ["Physics", "Chemistry", "Biology", "Mathematics"]:
            chapters = get_cbse_chapters(cur, standard, subject, "science")
            count = seed_chapters_direct(cur, "icse", standard, subject, chapters, "science")
            if count > 0:
                total += count
                print(f"  ✓ {standard} {subject} (Science): {count} chapters")
    
    # ICSE Class 11-12 Commerce - "Accounts" instead of "Accountancy"
    for standard in ["class-11", "class-12"]:
        chapters = get_cbse_chapters(cur, standard, "Accountancy", "commerce")
        count = seed_chapters_direct(cur, "icse", standard, "Accounts", chapters, "commerce")
        if count > 0:
            total += count
            print(f"  ✓ {standard} Accounts (Commerce): {count} chapters")
        
        chapters = get_cbse_chapters(cur, standard, "Economics", "commerce")
        count = seed_chapters_direct(cur, "icse", standard, "Economics", chapters, "commerce")
        if count > 0:
            total += count
            print(f"  ✓ {standard} Economics (Commerce): {count} chapters")
    
    # ICSE Class 11-12 Arts
    for standard in ["class-11", "class-12"]:
        for subject in ["History", "Geography", "Political Science", "Psychology", "Economics", "Sociology"]:
            chapters = get_cbse_chapters(cur, standard, subject, "arts")
            count = seed_chapters_direct(cur, "icse", standard, subject, chapters, "arts")
            if count > 0:
                total += count
                print(f"  ✓ {standard} {subject} (Arts): {count} chapters")
    
    # ═══════════════════════════════════════════════════════════════════
    # AP/TS BOARD
    # Has "Physical Science" and "Biological Science" for Class 9-10
    # ═══════════════════════════════════════════════════════════════════
    print("\n" + "=" * 60)
    print("SEEDING AP/TS BOARD CHAPTERS")
    print("=" * 60)
    
    # Class 9-10: Physical Science = Physics portion of CBSE Science
    # Class 9-10: Biological Science = Biology portion of CBSE Science
    for standard, cbse_chapters in [("class-9", cbse_science_9), ("class-10", cbse_science_10)]:
        phys_sci = []
        bio_sci = []
        
        for ch in cbse_chapters:
            name = ch['chapter_name']
            # Physics/Chemistry topics
            if any(kw in name for kw in ['Motion', 'Force', 'Gravitation', 'Work', 'Energy', 'Sound', 
                                          'Light', 'Electricity', 'Magnetic', 'Eye',
                                          'Matter', 'Pure', 'Atom', 'Chemical', 'Acid', 'Metal', 'Carbon']):
                phys_sci.append(ch)
            # Biology topics
            if any(kw in name for kw in ['Cell', 'Tissue', 'Life Process', 'Control', 'Reproduce', 
                                          'Heredity', 'Environment', 'Improvement']):
                bio_sci.append(ch)
        
        phys_sci = renumber_chapters(phys_sci)
        bio_sci = renumber_chapters(bio_sci)
        
        count = seed_chapters_direct(cur, "ap-ts", standard, "Physical Science", phys_sci)
        if count > 0:
            total += count
            print(f"  ✓ {standard} Physical Science: {count} chapters")
        
        count = seed_chapters_direct(cur, "ap-ts", standard, "Biological Science", bio_sci)
        if count > 0:
            total += count
            print(f"  ✓ {standard} Biological Science: {count} chapters")
    
    # AP/TS Social Studies = CBSE Social Science
    for standard, cbse_chapters in [("class-9", cbse_ss_9), ("class-10", cbse_ss_10)]:
        count = seed_chapters_direct(cur, "ap-ts", standard, "Social Studies", cbse_chapters)
        if count > 0:
            total += count
            print(f"  ✓ {standard} Social Studies: {count} chapters")
    
    # AP/TS Math and English
    count = seed_chapters_direct(cur, "ap-ts", "class-9", "Mathematics", cbse_math_9)
    if count > 0:
        total += count
        print(f"  ✓ Class 9 Mathematics: {count} chapters")
    
    count = seed_chapters_direct(cur, "ap-ts", "class-10", "Mathematics", cbse_math_10)
    if count > 0:
        total += count
        print(f"  ✓ Class 10 Mathematics: {count} chapters")
    
    count = seed_chapters_direct(cur, "ap-ts", "class-9", "English", cbse_eng_9)
    if count > 0:
        total += count
        print(f"  ✓ Class 9 English: {count} chapters")
    
    count = seed_chapters_direct(cur, "ap-ts", "class-10", "English", cbse_eng_10)
    if count > 0:
        total += count
        print(f"  ✓ Class 10 English: {count} chapters")
    
    # AP/TS Class 11-12 Science
    for standard in ["class-11", "class-12"]:
        for subject in ["Physics", "Chemistry", "Biology", "Mathematics"]:
            chapters = get_cbse_chapters(cur, standard, subject, "science")
            count = seed_chapters_direct(cur, "ap-ts", standard, subject, chapters, "science")
            if count > 0:
                total += count
                print(f"  ✓ {standard} {subject} (Science): {count} chapters")
    
    # AP/TS Class 11-12 Commerce
    for standard in ["class-11", "class-12"]:
        for subject in ["Accountancy", "Business Studies", "Economics"]:
            chapters = get_cbse_chapters(cur, standard, subject, "commerce")
            count = seed_chapters_direct(cur, "ap-ts", standard, subject, chapters, "commerce")
            if count > 0:
                total += count
                print(f"  ✓ {standard} {subject} (Commerce): {count} chapters")
    
    # AP/TS Class 11-12 Arts
    for standard in ["class-11", "class-12"]:
        for subject in ["History", "Geography", "Political Science", "Economics", "Sociology"]:
            chapters = get_cbse_chapters(cur, standard, subject, "arts")
            count = seed_chapters_direct(cur, "ap-ts", standard, subject, chapters, "arts")
            if count > 0:
                total += count
                print(f"  ✓ {standard} {subject} (Arts): {count} chapters")
    
    # ═══════════════════════════════════════════════════════════════════
    # GSEB (Gujarat Board)
    # Has "Vigyan" (Science) and "Samajik Vigyan" (Social Science) in Gujarati
    # ═══════════════════════════════════════════════════════════════════
    print("\n" + "=" * 60)
    print("SEEDING GSEB CHAPTERS")
    print("=" * 60)
    
    # Class 9-10: Vigyan = Science, Samajik Vigyan = Social Science
    count = seed_chapters_direct(cur, "gseb", "class-9", "Vigyan", cbse_science_9)
    if count > 0:
        total += count
        print(f"  ✓ Class 9 Vigyan (Science): {count} chapters")
    
    count = seed_chapters_direct(cur, "gseb", "class-10", "Vigyan", cbse_science_10)
    if count > 0:
        total += count
        print(f"  ✓ Class 10 Vigyan (Science): {count} chapters")
    
    count = seed_chapters_direct(cur, "gseb", "class-9", "Samajik Vigyan", cbse_ss_9)
    if count > 0:
        total += count
        print(f"  ✓ Class 9 Samajik Vigyan (Social Science): {count} chapters")
    
    count = seed_chapters_direct(cur, "gseb", "class-10", "Samajik Vigyan", cbse_ss_10)
    if count > 0:
        total += count
        print(f"  ✓ Class 10 Samajik Vigyan (Social Science): {count} chapters")
    
    # GSEB Math and English
    count = seed_chapters_direct(cur, "gseb", "class-9", "Mathematics", cbse_math_9)
    if count > 0:
        total += count
        print(f"  ✓ Class 9 Mathematics: {count} chapters")
    
    count = seed_chapters_direct(cur, "gseb", "class-10", "Mathematics", cbse_math_10)
    if count > 0:
        total += count
        print(f"  ✓ Class 10 Mathematics: {count} chapters")
    
    count = seed_chapters_direct(cur, "gseb", "class-9", "English", cbse_eng_9)
    if count > 0:
        total += count
        print(f"  ✓ Class 9 English: {count} chapters")
    
    count = seed_chapters_direct(cur, "gseb", "class-10", "English", cbse_eng_10)
    if count > 0:
        total += count
        print(f"  ✓ Class 10 English: {count} chapters")
    
    # GSEB Class 11-12 Science
    for standard in ["class-11", "class-12"]:
        for subject in ["Physics", "Chemistry", "Biology", "Mathematics"]:
            chapters = get_cbse_chapters(cur, standard, subject, "science")
            count = seed_chapters_direct(cur, "gseb", standard, subject, chapters, "science")
            if count > 0:
                total += count
                print(f"  ✓ {standard} {subject} (Science): {count} chapters")
    
    # GSEB Class 11-12 Commerce
    for standard in ["class-11", "class-12"]:
        chapters = get_cbse_chapters(cur, standard, "Accountancy", "commerce")
        count = seed_chapters_direct(cur, "gseb", standard, "Accountancy", chapters, "commerce")
        if count > 0:
            total += count
            print(f"  ✓ {standard} Accountancy (Commerce): {count} chapters")
        
        chapters = get_cbse_chapters(cur, standard, "Economics", "commerce")
        count = seed_chapters_direct(cur, "gseb", standard, "Economics", chapters, "commerce")
        if count > 0:
            total += count
            print(f"  ✓ {standard} Economics (Commerce): {count} chapters")
    
    # GSEB Class 11-12 Arts
    for standard in ["class-11", "class-12"]:
        for subject in ["History", "Geography", "Political Science", "Psychology", "Economics", "Sociology"]:
            chapters = get_cbse_chapters(cur, standard, subject, "arts")
            count = seed_chapters_direct(cur, "gseb", standard, subject, chapters, "arts")
            if count > 0:
                total += count
                print(f"  ✓ {standard} {subject} (Arts): {count} chapters")
    
    # ═══════════════════════════════════════════════════════════════════
    # TN BOARD (Tamil Nadu)
    # Similar to CBSE for most subjects
    # ═══════════════════════════════════════════════════════════════════
    print("\n" + "=" * 60)
    print("SEEDING TN BOARD CHAPTERS")
    print("=" * 60)
    
    # Class 9-10: Science, Social Science (same as CBSE)
    count = seed_chapters_direct(cur, "tn-board", "class-9", "Science", cbse_science_9)
    if count > 0:
        total += count
        print(f"  ✓ Class 9 Science: {count} chapters")
    
    count = seed_chapters_direct(cur, "tn-board", "class-10", "Science", cbse_science_10)
    if count > 0:
        total += count
        print(f"  ✓ Class 10 Science: {count} chapters")
    
    count = seed_chapters_direct(cur, "tn-board", "class-9", "Social Science", cbse_ss_9)
    if count > 0:
        total += count
        print(f"  ✓ Class 9 Social Science: {count} chapters")
    
    count = seed_chapters_direct(cur, "tn-board", "class-10", "Social Science", cbse_ss_10)
    if count > 0:
        total += count
        print(f"  ✓ Class 10 Social Science: {count} chapters")
    
    # TN Board Math and English
    count = seed_chapters_direct(cur, "tn-board", "class-9", "Mathematics", cbse_math_9)
    if count > 0:
        total += count
        print(f"  ✓ Class 9 Mathematics: {count} chapters")
    
    count = seed_chapters_direct(cur, "tn-board", "class-10", "Mathematics", cbse_math_10)
    if count > 0:
        total += count
        print(f"  ✓ Class 10 Mathematics: {count} chapters")
    
    count = seed_chapters_direct(cur, "tn-board", "class-9", "English", cbse_eng_9)
    if count > 0:
        total += count
        print(f"  ✓ Class 9 English: {count} chapters")
    
    count = seed_chapters_direct(cur, "tn-board", "class-10", "English", cbse_eng_10)
    if count > 0:
        total += count
        print(f"  ✓ Class 10 English: {count} chapters")
    
    # TN Board Class 11-12 Science
    for standard in ["class-11", "class-12"]:
        for subject in ["Physics", "Chemistry", "Biology", "Mathematics"]:
            chapters = get_cbse_chapters(cur, standard, subject, "science")
            count = seed_chapters_direct(cur, "tn-board", standard, subject, chapters, "science")
            if count > 0:
                total += count
                print(f"  ✓ {standard} {subject} (Science): {count} chapters")
    
    # TN Board Class 11-12 Commerce
    for standard in ["class-11", "class-12"]:
        chapters = get_cbse_chapters(cur, standard, "Accountancy", "commerce")
        count = seed_chapters_direct(cur, "tn-board", standard, "Accountancy", chapters, "commerce")
        if count > 0:
            total += count
            print(f"  ✓ {standard} Accountancy (Commerce): {count} chapters")
        
        chapters = get_cbse_chapters(cur, standard, "Economics", "commerce")
        count = seed_chapters_direct(cur, "tn-board", standard, "Economics", chapters, "commerce")
        if count > 0:
            total += count
            print(f"  ✓ {standard} Economics (Commerce): {count} chapters")
    
    # TN Board Class 11-12 Arts
    for standard in ["class-11", "class-12"]:
        for subject in ["History", "Geography", "Political Science", "Economics", "Sociology"]:
            chapters = get_cbse_chapters(cur, standard, subject, "arts")
            count = seed_chapters_direct(cur, "tn-board", standard, subject, chapters, "arts")
            if count > 0:
                total += count
                print(f"  ✓ {standard} {subject} (Arts): {count} chapters")
    
    conn.commit()
    conn.close()
    
    print("\n" + "=" * 60)
    print(f"SEED COMPLETE: {total} chapters seeded for all boards")
    print("=" * 60 + "\n")


if __name__ == "__main__":
    main()
