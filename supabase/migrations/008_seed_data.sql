-- Migration: 008_seed_data
-- Description: Seed data for demo/testing
-- Date: 2026-07-20

-- WARNING: This seed data uses SYNTHETIC data only
-- No real names, IIN, BIN, addresses or account numbers

-- Insert test organizations
INSERT INTO organizations (id, name, slug, country_code, default_currency, status) VALUES
  ('11111111-1111-1111-1111-111111111111', 'ООО "Мебель-Тест"', 'mebel-test', 'KZ', 'KZT', 'active'),
  ('22222222-2222-2222-2222-222222222222', 'ТОО "Стол и Стул"', 'stol-i-stul', 'KZ', 'KZT', 'active');

-- Note: User memberships should be created through the application
-- after users sign up via Supabase Auth
-- This seed only creates organizations

-- Insert test legal cases (using synthetic data)
INSERT INTO legal_cases (
  id,
  organization_id,
  case_number,
  title,
  customer_type,
  customer_display_name,
  project_type,
  status,
  currency,
  total_amount_tiyin,
  source_type,
  created_by
) VALUES
  (
    '33333333-3333-3333-3333-333333333333',
    '11111111-1111-1111-1111-111111111111',
    'LC-000001',
    'Производство кухонного гарнитура',
    'legal_entity',
    'ТОО "Кухни Плюс"',
    'manufacture_delivery_installation',
    'draft',
    'KZT',
    '39000000', -- 390 000 KZT in tyins
    'manual',
    '00000000-0000-0000-0000-000000000001'
  ),
  (
    '44444444-4444-4444-4444-444444444444',
    '11111111-1111-1111-1111-111111111111',
    'LC-000002',
    'Изготовление офисной мебели',
    'individual_entrepreneur',
    'ИП "Офис Мебель"',
    'manufacture_only',
    'data_collection',
    'KZT',
    '15000000', -- 150 000 KZT in tyins
    'manual',
    '00000000-0000-0000-0000-000000000001'
  ),
  (
    '55555555-5555-5555-5555-555555555555',
    '22222222-2222-2222-2222-222222222222',
    'LC-000001',
    'Производство шкафов-купе',
    'individual',
    'Сидоров Иван Петрович',
    'manufacture_delivery',
    'ready_for_review',
    'KZT',
    '27300000', -- 273 000 KZT in tyins
    'manual',
    '00000000-0000-0000-0000-000000000002'
  );
