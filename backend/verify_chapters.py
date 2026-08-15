"""Verify chapters in database."""
import psycopg2, psycopg2.extras, os, json
from urllib.parse import urlparse, quote, urlunparse
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")
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

conn = psycopg2.connect(DATABASE_URL, cursor_factory=psycopg2.extras.RealDictCursor)
cur = conn.cursor()

# Total count
cur.execute("SELECT COUNT(*) as count FROM chapters")
print(f"Total chapters: {cur.fetchone()['count']}")

# Sample chapters
cur.execute("""
    SELECT board_id, standard_id, chapter_name, description, topics 
    FROM chapters 
    ORDER BY board_id, standard_id, chapter_number 
    LIMIT 5
""")
for r in cur.fetchall():
    print(f"\n{r['board_id']}/{r['standard_id']}: {r['chapter_name']}")
    print(f"  Description: {r['description'][:100]}...")
    topics = json.loads(r['topics']) if r['topics'] else []
    print(f"  Topics ({len(topics)} total): {topics[:3]}...")

# Breakdown by class
cur.execute("""
    SELECT board_id, standard_id, COUNT(*) as count 
    FROM chapters 
    GROUP BY board_id, standard_id 
    ORDER BY board_id, standard_id
""")
print("\nChapter counts by class:")
for r in cur.fetchall():
    print(f"  {r['board_id']}/{r['standard_id']}: {r['count']} chapters")

conn.close()
