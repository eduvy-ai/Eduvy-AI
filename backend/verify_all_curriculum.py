"""Verify ALL seeded curriculum data."""
from app.db.connection import get_db

conn = get_db()
cur = conn.cursor()

# Check boards
cur.execute("SELECT * FROM boards WHERE is_active=TRUE ORDER BY sort_order")
print("BOARDS:")
for r in cur.fetchall():
    print(f"  {r['id']}: {r['name']}")

# Check standards
cur.execute("SELECT * FROM standards WHERE is_active=TRUE ORDER BY grade_num")
print("\nSTANDARDS:")
for r in cur.fetchall():
    print(f"  {r['id']}: {r['name']}")

# Check mediums
cur.execute("SELECT * FROM mediums WHERE is_active=TRUE ORDER BY sort_order")
print("\nMEDIUMS:")
for r in cur.fetchall():
    print(f"  {r['id']}: {r['name']}")

# Check streams
cur.execute("SELECT * FROM streams ORDER BY sort_order")
print("\nSTREAMS:")
for r in cur.fetchall():
    print(f"  {r['id']}: {r['name']}")

# Check subjects for each board - Class 10 (no stream)
print("\n" + "="*60)
print("CLASS 10 SUBJECTS (No Stream)")
print("="*60)
for board in ["cbse", "icse", "gseb", "ap-ts", "tn-board"]:
    cur.execute("SELECT name FROM subjects WHERE board_id=%s AND standard_id=%s AND stream_id IS NULL ORDER BY sort_order", (board, "class-10"))
    subjects = [r['name'] for r in cur.fetchall()]
    print(f"\n{board.upper()}: {', '.join(subjects)}")

# Check subjects for Telugu board - Class 11 streams
print("\n" + "="*60)
print("AP/TS BOARD CLASS 11 SUBJECTS (By Stream)")
print("="*60)
for stream in ["science", "commerce", "arts"]:
    cur.execute("SELECT name FROM subjects WHERE board_id=%s AND standard_id=%s AND stream_id=%s ORDER BY sort_order", ("ap-ts", "class-11", stream))
    subjects = [r['name'] for r in cur.fetchall()]
    print(f"\n{stream.upper()}: {', '.join(subjects)}")

# Check subjects for Tamil board - Class 11 streams
print("\n" + "="*60)
print("TN BOARD CLASS 11 SUBJECTS (By Stream)")
print("="*60)
for stream in ["science", "commerce", "arts"]:
    cur.execute("SELECT name FROM subjects WHERE board_id=%s AND standard_id=%s AND stream_id=%s ORDER BY sort_order", ("tn-board", "class-11", stream))
    subjects = [r['name'] for r in cur.fetchall()]
    print(f"\n{stream.upper()}: {', '.join(subjects)}")

conn.close()
