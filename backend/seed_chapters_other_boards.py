"""
Seed Chapters for Other Boards - ICSE, GSEB, AP/TS Board, TN Board
===================================================================
Most boards follow similar curriculum to NCERT for core subjects.
This script seeds chapters by copying CBSE structure with board-specific subject IDs.
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


def copy_chapters_from_cbse(cur, source_standard, target_board, target_standard, subject_name, stream_id=None):
    """Copy chapters from CBSE to another board."""
    # Get source subject
    source_subject_id = get_subject_id(cur, "cbse", source_standard, subject_name, stream_id)
    if not source_subject_id:
        return 0
    
    # Get target subject
    target_subject_id = get_subject_id(cur, target_board, target_standard, subject_name, stream_id)
    if not target_subject_id:
        print(f"  ⚠ Target subject not found: {target_board}/{target_standard}/{subject_name} (stream={stream_id})")
        return 0
    
    # Get chapters from CBSE
    cur.execute("""
        SELECT chapter_number, chapter_name, description, topics
        FROM chapters
        WHERE board_id = 'cbse' AND standard_id = %s AND subject_id = %s
        ORDER BY chapter_number
    """, (source_standard, source_subject_id))
    chapters = cur.fetchall()
    
    if not chapters:
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
        """, (target_board, target_standard, target_subject_id, stream_id, 
              ch['chapter_number'], ch['chapter_name'], ch['description'], ch['topics']))
        count += 1
    
    return count


def main():
    """Main seed function."""
    conn = psycopg2.connect(DATABASE_URL, cursor_factory=psycopg2.extras.RealDictCursor)
    cur = conn.cursor()
    
    total = 0
    
    # ═══════════════════════════════════════════════════════════════════
    # ICSE BOARD (follows similar curriculum to CBSE/NCERT)
    # ═══════════════════════════════════════════════════════════════════
    print("\n" + "=" * 60)
    print("SEEDING ICSE CHAPTERS")
    print("=" * 60)
    
    # Class 9
    for subject in ["Mathematics", "Science", "Social Science", "English"]:
        count = copy_chapters_from_cbse(cur, "class-9", "icse", "class-9", subject)
        if count > 0:
            total += count
            print(f"  ✓ Class 9 {subject}: {count} chapters")
    
    # Class 10
    for subject in ["Mathematics", "Science", "Social Science", "English"]:
        count = copy_chapters_from_cbse(cur, "class-10", "icse", "class-10", subject)
        if count > 0:
            total += count
            print(f"  ✓ Class 10 {subject}: {count} chapters")
    
    # Class 11 Science
    for subject in ["Physics", "Chemistry", "Biology", "Mathematics"]:
        count = copy_chapters_from_cbse(cur, "class-11", "icse", "class-11", subject, "science")
        if count > 0:
            total += count
            print(f"  ✓ Class 11 {subject} (Science): {count} chapters")
    
    # Class 11 Commerce
    for subject in ["Accountancy", "Business Studies", "Economics"]:
        count = copy_chapters_from_cbse(cur, "class-11", "icse", "class-11", subject, "commerce")
        if count > 0:
            total += count
            print(f"  ✓ Class 11 {subject} (Commerce): {count} chapters")
    
    # Class 11 Arts
    for subject in ["History", "Geography", "Political Science", "Psychology"]:
        count = copy_chapters_from_cbse(cur, "class-11", "icse", "class-11", subject, "arts")
        if count > 0:
            total += count
            print(f"  ✓ Class 11 {subject} (Arts): {count} chapters")
    
    # Class 12 Science
    for subject in ["Physics", "Chemistry", "Biology", "Mathematics"]:
        count = copy_chapters_from_cbse(cur, "class-12", "icse", "class-12", subject, "science")
        if count > 0:
            total += count
            print(f"  ✓ Class 12 {subject} (Science): {count} chapters")
    
    # Class 12 Commerce
    for subject in ["Accountancy", "Business Studies", "Economics"]:
        count = copy_chapters_from_cbse(cur, "class-12", "icse", "class-12", subject, "commerce")
        if count > 0:
            total += count
            print(f"  ✓ Class 12 {subject} (Commerce): {count} chapters")
    
    # Class 12 Arts
    for subject in ["History", "Geography", "Political Science", "Psychology"]:
        count = copy_chapters_from_cbse(cur, "class-12", "icse", "class-12", subject, "arts")
        if count > 0:
            total += count
            print(f"  ✓ Class 12 {subject} (Arts): {count} chapters")
    
    # ═══════════════════════════════════════════════════════════════════
    # GSEB (Gujarat State Education Board)
    # ═══════════════════════════════════════════════════════════════════
    print("\n" + "=" * 60)
    print("SEEDING GSEB CHAPTERS")
    print("=" * 60)
    
    # Class 9 & 10 (Core subjects similar to NCERT)
    for standard in ["class-9", "class-10"]:
        for subject in ["Mathematics", "Science", "Social Science"]:
            count = copy_chapters_from_cbse(cur, standard, "gseb", standard, subject)
            if count > 0:
                total += count
                print(f"  ✓ {standard} {subject}: {count} chapters")
    
    # Class 11 & 12 Science
    for standard in ["class-11", "class-12"]:
        for subject in ["Physics", "Chemistry", "Biology", "Mathematics"]:
            count = copy_chapters_from_cbse(cur, standard, "gseb", standard, subject, "science")
            if count > 0:
                total += count
                print(f"  ✓ {standard} {subject} (Science): {count} chapters")
    
    # Class 11 & 12 Commerce
    for standard in ["class-11", "class-12"]:
        # Direct subject matches
        for subject in ["Accountancy", "Economics"]:
            count = copy_chapters_from_cbse(cur, standard, "gseb", standard, subject, "commerce")
            if count > 0:
                total += count
                print(f"  ✓ {standard} {subject} (Commerce): {count} chapters")

        # GSEB uses "Commerce" where CBSE uses "Business Studies".
        # Copy chapter structure from CBSE Business Studies into GSEB Commerce.
        source_subject = "Business Studies"
        target_subject = "Commerce"
        source_subject_id = get_subject_id(cur, "cbse", standard, source_subject, "commerce")
        target_subject_id = get_subject_id(cur, "gseb", standard, target_subject, "commerce")
        if source_subject_id and target_subject_id:
            cur.execute(
                """
                SELECT chapter_number, chapter_name, description, topics
                FROM chapters
                WHERE board_id = 'cbse' AND standard_id = %s AND subject_id = %s
                ORDER BY chapter_number
                """,
                (standard, source_subject_id)
            )
            chapters = cur.fetchall()
            copied = 0
            for ch in chapters:
                cur.execute(
                    """
                    INSERT INTO chapters (board_id, standard_id, subject_id, stream_id, chapter_number, chapter_name, description, topics)
                    VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
                    ON CONFLICT (board_id, standard_id, subject_id, chapter_number)
                    DO UPDATE SET
                        chapter_name = EXCLUDED.chapter_name,
                        description = EXCLUDED.description,
                        topics = EXCLUDED.topics,
                        stream_id = EXCLUDED.stream_id
                    """,
                    ("gseb", standard, target_subject_id, "commerce", ch["chapter_number"], ch["chapter_name"], ch["description"], ch["topics"])
                )
                copied += 1
            if copied > 0:
                total += copied
                print(f"  ✓ {standard} Commerce (mapped from CBSE Business Studies): {copied} chapters")
        else:
            print(f"  ⚠ Missing mapping IDs for GSEB commerce backfill on {standard}")
    
    # ═══════════════════════════════════════════════════════════════════
    # AP/TS Board (Andhra Pradesh / Telangana State Board)
    # ═══════════════════════════════════════════════════════════════════
    print("\n" + "=" * 60)
    print("SEEDING AP/TS BOARD CHAPTERS")
    print("=" * 60)
    
    # Class 9 & 10 (Core subjects)
    for standard in ["class-9", "class-10"]:
        for subject in ["Mathematics", "Science", "Social Science"]:
            count = copy_chapters_from_cbse(cur, standard, "ap-ts", standard, subject)
            if count > 0:
                total += count
                print(f"  ✓ {standard} {subject}: {count} chapters")
    
    # Class 11 & 12 Science
    for standard in ["class-11", "class-12"]:
        for subject in ["Physics", "Chemistry", "Biology", "Mathematics"]:
            count = copy_chapters_from_cbse(cur, standard, "ap-ts", standard, subject, "science")
            if count > 0:
                total += count
                print(f"  ✓ {standard} {subject} (Science): {count} chapters")
    
    # Class 11 & 12 Commerce
    for standard in ["class-11", "class-12"]:
        for subject in ["Accountancy", "Business Studies", "Economics"]:
            count = copy_chapters_from_cbse(cur, standard, "ap-ts", standard, subject, "commerce")
            if count > 0:
                total += count
                print(f"  ✓ {standard} {subject} (Commerce): {count} chapters")
    
    # ═══════════════════════════════════════════════════════════════════
    # TN Board (Tamil Nadu State Board)
    # ═══════════════════════════════════════════════════════════════════
    print("\n" + "=" * 60)
    print("SEEDING TN BOARD CHAPTERS")
    print("=" * 60)
    
    # Class 9 & 10 (Core subjects)
    for standard in ["class-9", "class-10"]:
        for subject in ["Mathematics", "Science", "Social Science"]:
            count = copy_chapters_from_cbse(cur, standard, "tn-board", standard, subject)
            if count > 0:
                total += count
                print(f"  ✓ {standard} {subject}: {count} chapters")
    
    # Class 11 & 12 Science
    for standard in ["class-11", "class-12"]:
        for subject in ["Physics", "Chemistry", "Biology", "Mathematics"]:
            count = copy_chapters_from_cbse(cur, standard, "tn-board", standard, subject, "science")
            if count > 0:
                total += count
                print(f"  ✓ {standard} {subject} (Science): {count} chapters")
    
    # Class 11 & 12 Commerce
    for standard in ["class-11", "class-12"]:
        for subject in ["Accountancy", "Business Studies", "Economics"]:
            count = copy_chapters_from_cbse(cur, standard, "tn-board", standard, subject, "commerce")
            if count > 0:
                total += count
                print(f"  ✓ {standard} {subject} (Commerce): {count} chapters")
    
    conn.commit()
    conn.close()
    
    print("\n" + "=" * 60)
    print(f"SEED COMPLETE: {total} chapters seeded for other boards")
    print("=" * 60 + "\n")


if __name__ == "__main__":
    main()
