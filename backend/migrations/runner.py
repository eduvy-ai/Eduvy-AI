"""
Migration Runner
================
Applies SQL migrations to Supabase/PostgreSQL database.

Features:
- Version tracking in `schema_migrations` table
- Idempotent (safe to run multiple times)
- Supports up/down migrations
- Auto-generates migration files

Usage:
  python -m migrations.runner migrate          # Apply all pending
  python -m migrations.runner status           # Show status
  python -m migrations.runner create add_users # Create new migration
  python -m migrations.runner rollback         # Rollback last migration
"""
import os
import sys
import glob
import re
from datetime import datetime
from pathlib import Path

# Add parent to path for imports
sys.path.insert(0, str(Path(__file__).parent.parent))

from app.db.connection import get_db


MIGRATIONS_DIR = Path(__file__).parent / "versions"


def ensure_migrations_table():
    """Create schema_migrations table if not exists."""
    conn = get_db()
    try:
        cur = conn.cursor()
        cur.execute("""
            CREATE TABLE IF NOT EXISTS schema_migrations (
                version     TEXT PRIMARY KEY,
                name        TEXT NOT NULL,
                applied_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)
        conn.commit()
    finally:
        conn.close()


def get_applied_versions() -> set:
    """Get set of already-applied migration versions."""
    conn = get_db()
    try:
        cur = conn.cursor()
        cur.execute("SELECT version FROM schema_migrations ORDER BY version")
        return {row['version'] for row in cur.fetchall()}
    finally:
        conn.close()


def get_migration_files() -> list:
    """Get sorted list of migration files."""
    if not MIGRATIONS_DIR.exists():
        MIGRATIONS_DIR.mkdir(parents=True, exist_ok=True)
        return []
    
    files = sorted(MIGRATIONS_DIR.glob("*.sql"))
    return files


def parse_migration_file(filepath: Path) -> tuple:
    """Parse migration file into (version, name, up_sql, down_sql)."""
    content = filepath.read_text(encoding='utf-8')
    
    # Extract version and name from filename: 001_create_users.sql
    match = re.match(r'(\d+)_(.+)\.sql', filepath.name)
    if not match:
        raise ValueError(f"Invalid migration filename: {filepath.name}")
    
    version = match.group(1)
    name = match.group(2)
    
    # Split into up/down sections
    up_sql = ""
    down_sql = ""
    
    if "-- DOWN" in content:
        parts = content.split("-- DOWN")
        up_sql = parts[0].replace("-- UP", "").strip()
        down_sql = parts[1].strip() if len(parts) > 1 else ""
    else:
        up_sql = content.replace("-- UP", "").strip()
    
    return version, name, up_sql, down_sql


def apply_migration(filepath: Path):
    """Apply a single migration."""
    version, name, up_sql, _ = parse_migration_file(filepath)
    
    print(f"  Applying {version}_{name}...")
    
    conn = get_db()
    try:
        cur = conn.cursor()
        
        # Execute migration SQL
        cur.execute(up_sql)
        
        # Record in schema_migrations
        cur.execute(
            "INSERT INTO schema_migrations (version, name) VALUES (%s, %s)",
            (version, name)
        )
        
        conn.commit()
        print(f"  ✓ Applied {version}_{name}")
    except Exception as e:
        conn.rollback()
        print(f"  ✗ Failed {version}_{name}: {e}")
        raise
    finally:
        conn.close()


def rollback_migration(version: str):
    """Rollback a specific migration."""
    # Find the migration file
    files = get_migration_files()
    target = None
    for f in files:
        if f.name.startswith(version):
            target = f
            break
    
    if not target:
        print(f"Migration {version} not found")
        return False
    
    version, name, _, down_sql = parse_migration_file(target)
    
    if not down_sql:
        print(f"No DOWN migration for {version}_{name}")
        return False
    
    print(f"  Rolling back {version}_{name}...")
    
    conn = get_db()
    try:
        cur = conn.cursor()
        cur.execute(down_sql)
        cur.execute("DELETE FROM schema_migrations WHERE version = %s", (version,))
        conn.commit()
        print(f"  ✓ Rolled back {version}_{name}")
        return True
    except Exception as e:
        conn.rollback()
        print(f"  ✗ Rollback failed: {e}")
        return False
    finally:
        conn.close()


def cmd_migrate():
    """Apply all pending migrations."""
    print("\n🔄 Running migrations...")
    
    ensure_migrations_table()
    applied = get_applied_versions()
    files = get_migration_files()
    
    pending = [f for f in files if f.name.split('_')[0] not in applied]
    
    if not pending:
        print("✅ No pending migrations")
        return
    
    print(f"Found {len(pending)} pending migration(s)\n")
    
    for filepath in pending:
        apply_migration(filepath)
    
    print(f"\n✅ Applied {len(pending)} migration(s)")


def cmd_status():
    """Show migration status."""
    print("\n📊 Migration Status\n")
    
    ensure_migrations_table()
    applied = get_applied_versions()
    files = get_migration_files()
    
    if not files:
        print("No migrations found")
        return
    
    for f in files:
        version = f.name.split('_')[0]
        status = "✓ Applied" if version in applied else "○ Pending"
        print(f"  {status}  {f.name}")
    
    print(f"\n  {len(applied)} applied, {len(files) - len(applied)} pending")


def cmd_create(name: str):
    """Create a new migration file."""
    MIGRATIONS_DIR.mkdir(parents=True, exist_ok=True)
    
    # Get next version number
    files = get_migration_files()
    if files:
        last_version = int(files[-1].name.split('_')[0])
        next_version = last_version + 1
    else:
        next_version = 1
    
    version = str(next_version).zfill(3)
    filename = f"{version}_{name}.sql"
    filepath = MIGRATIONS_DIR / filename
    
    template = f"""-- Migration: {name}
-- Created: {datetime.now().isoformat()}

-- UP
-- Add your migration SQL here


-- DOWN
-- Add rollback SQL here (optional)

"""
    
    filepath.write_text(template, encoding='utf-8')
    print(f"✅ Created: migrations/versions/{filename}")


def cmd_rollback():
    """Rollback the last applied migration."""
    print("\n⏪ Rolling back last migration...")
    
    ensure_migrations_table()
    
    conn = get_db()
    try:
        cur = conn.cursor()
        cur.execute("SELECT version FROM schema_migrations ORDER BY version DESC LIMIT 1")
        row = cur.fetchone()
        if not row:
            print("No migrations to rollback")
            return
        version = row['version']
    finally:
        conn.close()
    
    rollback_migration(version)


def main():
    if len(sys.argv) < 2:
        print(__doc__)
        return
    
    cmd = sys.argv[1]
    
    if cmd == "migrate":
        cmd_migrate()
    elif cmd == "status":
        cmd_status()
    elif cmd == "create":
        if len(sys.argv) < 3:
            print("Usage: python -m migrations.runner create NAME")
            return
        cmd_create(sys.argv[2])
    elif cmd == "rollback":
        cmd_rollback()
    else:
        print(f"Unknown command: {cmd}")
        print(__doc__)


if __name__ == "__main__":
    main()
