-- UP
-- Migration 006: Consolidate studio_outputs → notebook_studio
-- The initial migration (001) created "studio_outputs" but runtime schema
-- and all service queries use "notebook_studio". This migration copies any
-- orphaned data and drops the old table.

-- Ensure notebook_studio exists (schema.py usually creates it, but be safe)
CREATE TABLE IF NOT EXISTS notebook_studio (
    id          SERIAL PRIMARY KEY,
    user_id     TEXT NOT NULL,
    type        TEXT NOT NULL,
    output_json TEXT NOT NULL DEFAULT '{}',
    created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Copy data from old table if it exists and has rows
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'studio_outputs') THEN
        -- Migrate rows that aren't already in notebook_studio
        INSERT INTO notebook_studio (user_id, type, output_json, created_at)
        SELECT user_id, type,
               COALESCE(output_json, '{}'),
               created_at::timestamp
        FROM studio_outputs
        WHERE NOT EXISTS (
            SELECT 1 FROM notebook_studio ns
            WHERE ns.user_id = studio_outputs.user_id
              AND ns.type = studio_outputs.type
              AND ns.created_at = studio_outputs.created_at::timestamp
        );

        DROP TABLE studio_outputs;
    END IF;
END $$;

-- DOWN
CREATE TABLE IF NOT EXISTS studio_outputs (
    id          TEXT PRIMARY KEY,
    user_id     TEXT NOT NULL,
    type        TEXT NOT NULL,
    content     TEXT DEFAULT '',
    created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
