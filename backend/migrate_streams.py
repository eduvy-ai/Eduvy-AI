"""
migrate_streams.py — Add streams table and stream_id columns.
Run this before seed_curriculum.py if upgrading from an older schema.
"""
from app.db.connection import get_db

conn = get_db()
cur = conn.cursor()

print("Creating streams table...")
cur.execute("""
    CREATE TABLE IF NOT EXISTS streams (
        id          TEXT PRIMARY KEY,
        name        TEXT NOT NULL,
        sort_order  INTEGER DEFAULT 0,
        is_active   BOOLEAN DEFAULT TRUE
    )
""")

print("Adding stream_id to subjects table...")
cur.execute("""DO $$ BEGIN
    ALTER TABLE subjects ADD COLUMN stream_id TEXT DEFAULT NULL;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$""")

print("Adding stream_id to chapters table...")
cur.execute("""DO $$ BEGIN
    ALTER TABLE chapters ADD COLUMN stream_id TEXT DEFAULT NULL;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$""")

# Drop old unique constraint on subjects and create new one with stream_id
print("Updating subjects unique constraint...")
cur.execute("""
    DO $$ BEGIN
        ALTER TABLE subjects DROP CONSTRAINT IF EXISTS subjects_board_id_standard_id_name_key;
    EXCEPTION WHEN undefined_object THEN NULL;
    END $$
""")
cur.execute("""
    DO $$ BEGIN
        ALTER TABLE subjects DROP CONSTRAINT IF EXISTS subjects_board_id_standard_id_stream_id_name_key;
    EXCEPTION WHEN undefined_object THEN NULL;
    END $$
""")

# Create a unique index that handles NULLs properly using COALESCE
print("Creating unique index for subjects...")
cur.execute("DROP INDEX IF EXISTS idx_subjects_unique")
cur.execute("""
    CREATE UNIQUE INDEX idx_subjects_unique 
    ON subjects (board_id, standard_id, COALESCE(stream_id, ''), name)
""")

# Create indexes
print("Creating indexes...")
cur.execute("CREATE INDEX IF NOT EXISTS idx_subjects_stream ON subjects(stream_id)")
cur.execute("CREATE INDEX IF NOT EXISTS idx_chapters_stream ON chapters(stream_id)")

conn.commit()
print("Migration completed successfully!")
conn.close()
