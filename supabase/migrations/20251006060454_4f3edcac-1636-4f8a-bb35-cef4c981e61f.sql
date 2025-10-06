-- Move pg_trgm extension to the extensions schema to resolve security warning
-- This prevents the extension's functions from being exposed through the public API

-- First ensure the extensions schema exists
CREATE SCHEMA IF NOT EXISTS extensions;

-- Move the extension to the extensions schema
ALTER EXTENSION pg_trgm SET SCHEMA extensions;