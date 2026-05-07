-- Migration 013: Add Postgres storage for policy PDFs

ALTER TABLE training_modules
ADD COLUMN IF NOT EXISTS policy_document_blob BYTEA,
ADD COLUMN IF NOT EXISTS policy_document_filename TEXT,
ADD COLUMN IF NOT EXISTS policy_document_mime TEXT,
ADD COLUMN IF NOT EXISTS policy_document_size INTEGER;
