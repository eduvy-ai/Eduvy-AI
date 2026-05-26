# Database Migrations

This project uses a simple SQL-based migration system for Supabase/PostgreSQL.

## Quick Start

```bash
cd backend

# Check migration status
python -m migrations.runner status

# Apply all pending migrations
python -m migrations.runner migrate

# Create a new migration
python -m migrations.runner create add_new_column

# Rollback last migration
python -m migrations.runner rollback
```

## How It Works

1. **Migration files** are stored in `backend/migrations/versions/`
2. Each file is named `NNN_description.sql` (e.g., `001_initial_schema.sql`)
3. Applied migrations are tracked in the `schema_migrations` table
4. Migrations are applied in order and only once

## Creating a New Migration

When you need to change the database schema:

```bash
# 1. Create a new migration file
python -m migrations.runner create add_user_avatar

# 2. Edit the generated file in migrations/versions/
# 3. Add your SQL in the UP section
# 4. Optionally add rollback SQL in the DOWN section
```

Example migration file:

```sql
-- Migration: add_user_avatar
-- Created: 2026-05-24

-- UP
ALTER TABLE users ADD COLUMN avatar_url TEXT DEFAULT '';

-- DOWN
ALTER TABLE users DROP COLUMN IF EXISTS avatar_url;
```

## GitHub Workflow

Migrations run automatically when:
- Changes are pushed to `main` branch in `backend/migrations/` or `backend/app/db/schema.py`
- Manually triggered via GitHub Actions

### Required Secrets

Add these secrets to your GitHub repository:
- `DATABASE_URL` - Full Supabase connection string, OR
- `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASS`, `DB_NAME` - Individual connection params

## Best Practices

1. **Always test locally first** before pushing migrations
2. **Never modify applied migrations** - create a new one instead
3. **Include DOWN migrations** for easy rollback
4. **Use IF EXISTS/IF NOT EXISTS** to make migrations idempotent
5. **Backup before major migrations** in production

## Local Testing

```bash
# Set up environment variables
export DB_HOST=localhost
export DB_PORT=5432
export DB_USER=postgres
export DB_PASS=yourpassword
export DB_NAME=eduvyai

# Run migrations
python -m migrations.runner migrate
```
