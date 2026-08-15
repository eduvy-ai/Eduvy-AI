"""Check what subjects exist in the database for each board."""
import os
import psycopg2
import psycopg2.extras
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

# Get all subjects grouped by board
cur.execute("""
    SELECT board_id, standard_id, stream_id, name, id
    FROM subjects
    ORDER BY board_id, standard_id, stream_id, name
""")
subjects = cur.fetchall()

print(f"Total subjects in database: {len(subjects)}\n")

# Group by board
boards = {}
for s in subjects:
    key = s['board_id']
    if key not in boards:
        boards[key] = []
    boards[key].append(s)

for board_id, subj_list in boards.items():
    print(f"\n{'='*60}")
    print(f"BOARD: {board_id.upper()} ({len(subj_list)} subjects)")
    print("="*60)
    
    # Group by standard
    by_standard = {}
    for s in subj_list:
        key = (s['standard_id'], s['stream_id'])
        if key not in by_standard:
            by_standard[key] = []
        by_standard[key].append(s['name'])
    
    for (std, stream), names in sorted(by_standard.items()):
        stream_label = f" ({stream})" if stream else ""
        print(f"\n  {std}{stream_label}:")
        for name in sorted(names):
            print(f"    - {name}")

conn.close()
