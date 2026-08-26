"""
Backfill missing GSEB Class 11/12 Commerce chapters with baseline templates.

Scope:
- board_id = gseb
- stream_id = commerce
- standards = class-11, class-12
- subjects: Statistics, English, Gujarati, Computer Science

This script only upserts chapters for subjects that currently have 0 active chapters.
Run:
  python scripts/backfill_gseb_commerce_baseline.py
"""

import os
from urllib.parse import quote, urlparse, urlunparse

import psycopg2
import psycopg2.extras
from dotenv import load_dotenv

load_dotenv()


def _db_url() -> str:
    url = os.getenv("DATABASE_URL", "")
    if not url:
        raise RuntimeError("DATABASE_URL not set")

    if url.startswith("postgresql+"):
        url = "postgresql" + url[url.index("://") :]

    parsed = urlparse(url)
    if parsed.password:
        encoded = quote(parsed.password, safe="")
        if encoded != parsed.password:
            host = parsed.hostname or ""
            if parsed.port:
                host += f":{parsed.port}"
            netloc = f"{parsed.username}:{encoded}@{host}"
            url = urlunparse((parsed.scheme, netloc, parsed.path, parsed.params, parsed.query, parsed.fragment))

    return url


SUBJECT_CHAPTERS = {
    "Statistics": [
        "Introduction to Statistics",
        "Collection of Data",
        "Organisation of Data",
        "Presentation of Data",
        "Measures of Central Tendency",
        "Measures of Dispersion",
        "Correlation",
        "Index Numbers",
        "Time Series",
        "Probability Basics",
    ],
    "English": [
        "Reading Comprehension",
        "Writing Skills - Notice and Circular",
        "Writing Skills - Report Writing",
        "Writing Skills - Letter and Email",
        "Grammar - Tenses and Modals",
        "Grammar - Voice and Narration",
        "Literature - Prose",
        "Literature - Poetry",
        "Vocabulary and Editing",
        "Revision and Exam Practice",
    ],
    "Gujarati": [
        "ગદ્ય વિભાગ - વાર્તા",
        "ગદ્ય વિભાગ - નિબંધ",
        "પદ્ય વિભાગ - કવિતા",
        "વ્યાકરણ - નામ અને સર્વનામ",
        "વ્યાકરણ - ક્રિયાપદ",
        "વ્યાકરણ - સમાસ",
        "પત્ર લેખન",
        "નિબંધ લેખન",
        "અવતરણ અને ભાવાર્થ",
        "પુનરાવર્તન અને પ્રશ્નોત્તરી",
    ],
    "Computer Science": [
        "Computer Fundamentals",
        "Problem Solving with Python",
        "Python Data Types and Operators",
        "Control Flow and Loops",
        "Functions and Modular Programming",
        "Strings, Lists and Dictionaries",
        "File Handling",
        "Database Concepts",
        "SQL Basics",
        "Practical Programming and Revision",
    ],
}


def _build_baseline_description(subject_name: str, chapter_name: str, standard: str) -> str:
    """Generate a clear, learner-friendly chapter overview for baseline seeded records."""
    std_label = (standard or "").replace("class-", "Class ")
    std_label = " ".join(std_label.split())
    return (
        f"This chapter, '{chapter_name}', builds core {subject_name} understanding for {std_label} under GSEB Commerce. "
        f"You will study the main ideas step by step, connect them with practical examples, and practice question patterns commonly asked in school and board exams. "
        f"By the end of this chapter, you should be able to explain key concepts in your own words, solve standard application problems, and revise confidently using structured notes and exercises."
    )


def main() -> None:
    conn = psycopg2.connect(_db_url(), cursor_factory=psycopg2.extras.RealDictCursor)
    cur = conn.cursor()

    total_upserts = 0
    standards = ["class-11", "class-12"]

    for standard in standards:
        print(f"\nBackfilling {standard}...")

        for subject_name, chapters in SUBJECT_CHAPTERS.items():
            cur.execute(
                """
                SELECT id
                FROM subjects
                WHERE board_id = %s AND standard_id = %s AND stream_id = %s AND name = %s
                LIMIT 1
                """,
                ("gseb", standard, "commerce", subject_name),
            )
            subject_row = cur.fetchone()
            if not subject_row:
                print(f"  - Skipped {subject_name}: subject not found")
                continue

            subject_id = subject_row["id"]

            cur.execute(
                """
                SELECT COUNT(*) AS cnt
                FROM chapters
                WHERE board_id = %s AND standard_id = %s AND subject_id = %s AND is_active = TRUE
                """,
                ("gseb", standard, subject_id),
            )
            existing = int(cur.fetchone()["cnt"])

            if existing > 0:
                print(f"  - Skipped {subject_name}: already has {existing} chapters")
                continue

            upserts = 0
            for idx, chapter_name in enumerate(chapters, start=1):
                cur.execute(
                    """
                    INSERT INTO chapters (
                        board_id, standard_id, subject_id, stream_id,
                        chapter_number, chapter_name, description, topics, is_active
                    )
                    VALUES (%s, %s, %s, %s, %s, %s, %s, %s, TRUE)
                    ON CONFLICT (board_id, standard_id, subject_id, chapter_number)
                    DO UPDATE SET
                        chapter_name = EXCLUDED.chapter_name,
                        description = EXCLUDED.description,
                        topics = EXCLUDED.topics,
                        stream_id = EXCLUDED.stream_id,
                        is_active = TRUE
                    """,
                    (
                        "gseb",
                        standard,
                        subject_id,
                        "commerce",
                        idx,
                        chapter_name,
                        _build_baseline_description(subject_name, chapter_name, standard),
                        "[]",
                    ),
                )
                upserts += 1

            total_upserts += upserts
            print(f"  + Backfilled {subject_name}: {upserts} chapters")

    conn.commit()

    print("\nVerification:")
    for standard in standards:
        cur.execute(
            """
            SELECT s.name, COUNT(c.id) AS chapter_count
            FROM subjects s
            LEFT JOIN chapters c ON c.subject_id = s.id AND c.is_active = TRUE
            WHERE s.board_id = %s AND s.standard_id = %s AND s.stream_id = %s
            GROUP BY s.name, s.sort_order
            ORDER BY s.sort_order, s.name
            """,
            ("gseb", standard, "commerce"),
        )
        print(f"\nGSEB {standard} commerce:")
        for row in cur.fetchall():
            print(f"- {row['name']}: {row['chapter_count']}")

    cur.close()
    conn.close()
    print(f"\nDone. Total upsert operations: {total_upserts}")


if __name__ == "__main__":
    main()
