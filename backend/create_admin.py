"""
create_admin.py — One-time script to create the first superadmin.
Run: python create_admin.py
"""
import os
import bcrypt
import psycopg2
import psycopg2.extras
from dotenv import load_dotenv

load_dotenv()

EMAIL    = "pradip.pawar@gmail.com"
PASSWORD = "Pradip@123"
NAME     = "Pradip Pawar"

conn = psycopg2.connect(os.getenv("DATABASE_URL"), cursor_factory=psycopg2.extras.RealDictCursor)
cur  = conn.cursor()

cur.execute("SELECT id, email, name FROM admin_users WHERE email = %s", (EMAIL,))
existing = cur.fetchone()

if existing:
    print(f"Admin already exists → id={existing['id']}  email={existing['email']}  name={existing['name']}")
else:
    pw_hash = bcrypt.hashpw(PASSWORD.encode(), bcrypt.gensalt()).decode()
    cur.execute(
        "INSERT INTO admin_users (email, password_hash, name, role) VALUES (%s, %s, %s, 'superadmin') RETURNING id, email, name",
        (EMAIL, pw_hash, NAME),
    )
    row = cur.fetchone()
    conn.commit()
    print(f"Superadmin created  → id={row['id']}  email={row['email']}  name={row['name']}")
    print(f"Login at            → http://localhost:5173/admin")

cur.close()
conn.close()
