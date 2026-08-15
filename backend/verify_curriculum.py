"""Verify the seeded curriculum data."""
from app.db.connection import get_db

conn = get_db()
cur = conn.cursor()

# Check boards
cur.execute("SELECT * FROM boards WHERE is_active=TRUE ORDER BY sort_order")
print("BOARDS:")
for r in cur.fetchall():
    print(f"  {r['id']}: {r['name']}")

# Check standards
cur.execute("SELECT * FROM standards WHERE is_active=TRUE ORDER BY sort_order")
print("\nSTANDARDS:")
for r in cur.fetchall():
    print(f"  {r['id']}: {r['name']}")

# Check streams
cur.execute("SELECT * FROM streams ORDER BY sort_order")
print("\nSTREAMS:")
for r in cur.fetchall():
    print(f"  {r['id']}: {r['name']}")

# Check subjects for Class 9 (no stream)
print("\nSUBJECTS (GSEB Class 9 - no stream):")
cur.execute("SELECT name FROM subjects WHERE board_id=%s AND standard_id=%s AND stream_id IS NULL ORDER BY sort_order", ("gseb", "class-9"))
for r in cur.fetchall():
    print(f"  - {r['name']}")

# Check subjects for Class 11 Science
print("\nSUBJECTS (GSEB Class 11 - Science):")
cur.execute("SELECT name FROM subjects WHERE board_id=%s AND standard_id=%s AND stream_id=%s ORDER BY sort_order", ("gseb", "class-11", "science"))
for r in cur.fetchall():
    print(f"  - {r['name']}")

# Check subjects for Class 11 Commerce
print("\nSUBJECTS (GSEB Class 11 - Commerce):")
cur.execute("SELECT name FROM subjects WHERE board_id=%s AND standard_id=%s AND stream_id=%s ORDER BY sort_order", ("gseb", "class-11", "commerce"))
for r in cur.fetchall():
    print(f"  - {r['name']}")

# Check subjects for Class 11 Arts
print("\nSUBJECTS (GSEB Class 11 - Arts):")
cur.execute("SELECT name FROM subjects WHERE board_id=%s AND standard_id=%s AND stream_id=%s ORDER BY sort_order", ("gseb", "class-11", "arts"))
for r in cur.fetchall():
    print(f"  - {r['name']}")

conn.close()
