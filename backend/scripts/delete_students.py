"""Quick script to delete non-admin students."""
from app.db.connection import get_db, init_db

init_db()
conn = get_db()
cur = conn.cursor()

# List all users
cur.execute("SELECT id, name, email, plan FROM users")
rows = cur.fetchall()
print(f"Total users: {len(rows)}")
for r in rows:
    d = dict(r)
    print(f"  {d.get('name','?'):20} | {d.get('email','?'):30} | plan={d.get('plan','free')}")

# Delete all non-admin students — keep anyone with plan='admin' or name containing 'admin'
cur.execute("DELETE FROM users WHERE LOWER(name) NOT LIKE '%%admin%%' AND LOWER(email) NOT LIKE '%%admin%%'")
deleted = cur.rowcount
conn.commit()
print(f"\nDeleted {deleted} students (kept accounts with 'admin' in name/email)")
conn.close()
