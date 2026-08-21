-- Migration: 013_ai_provider_keys
-- Description: Create enhanced AI provider keys table with metadata and model cache
-- Created: 2026-08-21

-- Table for storing API keys with rich metadata
CREATE TABLE IF NOT EXISTS ai_provider_keys (
    id              SERIAL PRIMARY KEY,
    provider        TEXT NOT NULL,                    -- "gemini", "groq", "openai", "anthropic", "nvidia"
    slot            INT NOT NULL DEFAULT 1,           -- 1-5 for round-robin pool
    encrypted_key   TEXT NOT NULL,                    -- Fernet AES encrypted key
    
    -- Metadata (admin-entered)
    owner_email     TEXT DEFAULT '',                  -- Owner email for audit
    project_name    TEXT DEFAULT '',                  -- Project/account name
    description     TEXT DEFAULT '',                  -- Free-form notes
    
    -- Limits (admin-entered, provider doesn't expose via API)
    rpm_limit       INT,                              -- Requests per minute
    tpm_limit       INT,                              -- Tokens per minute
    daily_limit     INT,                              -- Tokens per day
    
    -- Status
    is_enabled      BOOLEAN DEFAULT TRUE,             -- Soft disable without deleting
    last_validated  TIMESTAMP,                        -- When key was last verified working
    validation_status TEXT DEFAULT 'pending',         -- "valid", "invalid", "expired", "pending"
    
    -- Audit
    created_by      TEXT,                             -- Admin user ID who added the key
    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE(provider, slot)
);

-- Table for caching discovered models per provider
CREATE TABLE IF NOT EXISTS ai_provider_models (
    provider        TEXT NOT NULL,
    model_id        TEXT NOT NULL,                    -- "gemini-3.5-flash", "gpt-4o-mini"
    display_name    TEXT DEFAULT '',                  -- Human-readable name
    context_window  INT DEFAULT 0,                    -- Input token limit
    max_output      INT DEFAULT 0,                    -- Output token limit
    capabilities    JSONB DEFAULT '{}',               -- {"vision": true, "code": true, "thinking": true}
    is_available    BOOLEAN DEFAULT TRUE,             -- Currently available
    last_fetched    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (provider, model_id)
);

-- Index for faster lookups
CREATE INDEX IF NOT EXISTS idx_ai_provider_keys_provider ON ai_provider_keys(provider);
CREATE INDEX IF NOT EXISTS idx_ai_provider_keys_enabled ON ai_provider_keys(is_enabled) WHERE is_enabled = TRUE;
CREATE INDEX IF NOT EXISTS idx_ai_provider_models_available ON ai_provider_models(provider, is_available) WHERE is_available = TRUE;

-- Migrate existing keys from app_settings to new table
-- This is a one-time migration that preserves existing keys
DO $$
DECLARE
    row RECORD;
    prov TEXT;
    slot_num INT;
    key_name TEXT;
BEGIN
    -- Iterate over existing api_key entries in app_settings
    FOR row IN 
        SELECT key, value FROM app_settings 
        WHERE key LIKE 'api_key_%' AND value != ''
    LOOP
        key_name := row.key;
        
        -- Parse provider and slot from key name
        -- Format: api_key_groq (slot 1) or api_key_groq_2 (slot 2)
        IF key_name ~ '^api_key_[a-z]+_[0-9]+$' THEN
            -- Has slot number suffix
            prov := substring(key_name FROM 'api_key_([a-z]+)_[0-9]+');
            slot_num := (substring(key_name FROM 'api_key_[a-z]+_([0-9]+)'))::INT;
        ELSE
            -- No slot suffix = slot 1
            prov := substring(key_name FROM 'api_key_([a-z]+)');
            slot_num := 1;
        END IF;
        
        -- Skip if provider not recognized
        IF prov IS NULL OR prov NOT IN ('gemini', 'groq', 'openai', 'anthropic', 'nvidia') THEN
            CONTINUE;
        END IF;
        
        -- Insert into new table (ignore conflicts)
        INSERT INTO ai_provider_keys (provider, slot, encrypted_key, validation_status, created_at)
        VALUES (prov, slot_num, row.value, 'pending', CURRENT_TIMESTAMP)
        ON CONFLICT (provider, slot) DO NOTHING;
    END LOOP;
END $$;

-- To rollback, run:
-- DROP TABLE IF EXISTS ai_provider_models;
-- DROP TABLE IF EXISTS ai_provider_keys;
