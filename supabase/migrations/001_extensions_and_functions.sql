-- Migration: 001_extensions_and_functions
-- Description: Extensions and helper functions
-- Date: 2026-07-20

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to generate case numbers
CREATE OR REPLACE FUNCTION generate_case_number()
RETURNS TEXT AS $$
DECLARE
  next_num INTEGER;
BEGIN
  SELECT COALESCE(MAX(CAST(SUBSTRING(case_number FROM 4) AS INTEGER)), 0) + 1
  INTO next_num
  FROM legal_cases;
  
  RETURN 'LC-' || LPAD(next_num::TEXT, 6, '0');
END;
$$ LANGUAGE plpgsql;
