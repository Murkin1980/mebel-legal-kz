-- Migration: 008_seed_data
-- Description: Seed data for demo/testing
-- Date: 2026-07-20

-- WARNING: This seed data uses SYNTHETIC data only
-- No real names, IIN, BIN, addresses or account numbers

-- Insert test organizations
INSERT INTO organizations (id, name, slug, country_code, default_currency, status) VALUES
  ('11111111-1111-1111-1111-111111111111', 'ООО "Мебель-Тест"', 'mebel-test', 'KZ', 'KZT', 'active'),
  ('22222222-2222-2222-2222-222222222222', 'ТОО "Стол и Стул"', 'stol-i-stul', 'KZ', 'KZT', 'active');

-- Note: User memberships and legal cases should be created through the application
-- after users sign up via Supabase Auth.
-- We cannot seed legal_cases here because created_by references auth.users(id)
-- and the auth users don't exist yet at seed time.
