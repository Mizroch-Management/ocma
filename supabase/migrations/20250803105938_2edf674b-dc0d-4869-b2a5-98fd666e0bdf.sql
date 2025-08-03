-- Add title column to workflows table for better workflow identification
ALTER TABLE workflows ADD COLUMN IF NOT EXISTS title TEXT;