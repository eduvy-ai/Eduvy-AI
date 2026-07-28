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
from urllib.parse import urlparse, quote, urlunparse

import psycopg2
import psycopg2.extras
from dotenv import load_dotenv

load_dotenv()

# Add parent to path for imports
sys.path.insert(0, str(Path(__file__).parent.parent))


def _get_conn():
    """
    Create a direct psycopg2 connection for migrations.
    Uses a single connection (no pool) with generous timeouts
    appropriate for DDL operations.
    """
    host = os.getenv("DB_HOST", "") or ""
    if host:
        port_str = os.getenv("DB_PORT", "") or "5432"
        params = {
            "host":     host,
            "port":     int(port_str),
            "user":     os.getenv("DB_USER", ""),
            "password": os.getenv("DB_PASS", ""),
            "dbname":   os.getenv("DB_NAME", "") or "eduvyai",
        }
        params = {k: v for k, v in params.items() if v not in ("", None)}
    else:
        url = os.getenv("DATABASE_URL", "")
        if not url:
            raise RuntimeError(
                "Database not configured. Set DATABASE_URL or "
                "DB_HOST / DB_USER / DB_PASS / DB_NAME in .env"
            )
        if url.startswith("postgresql+"):
            url = "postgresql" + url[url.index("://"):]
        parsed = urlparse(url)
        if parsed.password:
            encoded_pw = quote(parsed.password, safe="")
            if encoded_pw != parsed.password:
                userinfo = f"{parsed.username}:{encoded_pw}"
                host_part = parsed.hostname or ""
                if parsed.port:
                    host_part += f":{parsed.port}"
                netloc = f"{userinfo}@{host_part}"
                url = urlunparse((
                    parsed.scheme, netloc, parsed.path,
                    parsed.params, parsed.query, parsed.fragment,
                ))
        params = {"dsn": url}

    params["connect_timeout"] = 30
    # No statement_timeout for migrations — DDL may need to wait for locks
    params["options"] = "-c statement_timeout=300000"  # 5 minutes

    return psycopg2.connect(
        cursor_factory=psycopg2.extras.RealDictCursor,
        **params,
    )


MIGRATIONS_DIR = Path(__file__).parent / "versions"


def ensure_migrations_table():
    """Create schema_migrations table if not exists."""
    conn = _get_conn()
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
    conn = _get_conn()
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
    
    # Extract version and name from filename: 001_create_users.sql, 003b_fix.sql
    match = re.match(r'(\d+[a-z]?)_(.+)\.sql', filepath.name)
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
    
    conn = _get_conn()
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
    
    conn = _get_conn()
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


def _check_duplicate_versions(files: list):
    """Abort if two migration files share the same version prefix."""
    seen: dict[str, str] = {}
    for f in files:
        version = f.name.split('_')[0]
        if version in seen:
            print(f"\n❌ Duplicate migration version '{version}':")
            print(f"   - {seen[version]}")
            print(f"   - {f.name}")
            print("Rename one file to use a unique version prefix.")
            sys.exit(1)
        seen[version] = f.name


def cmd_migrate():
    """Apply all pending migrations."""
    print("\n🔄 Running migrations...")
    
    try:
        ensure_migrations_table()
    except Exception as e:
        print(f"\n❌ Failed to connect to database: {e}")
        sys.exit(1)

    applied = get_applied_versions()
    files = get_migration_files()
    
    if applied:
        print(f"Already applied: {sorted(applied)}")

    _check_duplicate_versions(files)
    
    pending = [f for f in files if f.name.split('_')[0] not in applied]
    
    if not pending:
        print("✅ No pending migrations")
        return
    
    print(f"Found {len(pending)} pending migration(s):")
    for f in pending:
        print(f"  → {f.name}")
    print()
    
    for filepath in pending:
        try:
            apply_migration(filepath)
        except Exception as e:
            print(f"\n❌ Migration failed: {filepath.name}")
            print(f"   Error: {e}")
            sys.exit(1)
    
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
    
    conn = _get_conn()
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
