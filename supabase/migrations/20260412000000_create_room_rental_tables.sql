-- Room Rental Tables Migration
-- Creates settings, records, custom_fees, and record_custom_fees tables

-- 1. Settings Table
CREATE TABLE IF NOT EXISTS settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rent_price DECIMAL(10, 2) NOT NULL DEFAULT 0,
  electric_price DECIMAL(10, 2) NOT NULL DEFAULT 0,
  water_price DECIMAL(10, 2) NOT NULL DEFAULT 0,
  bank_id TEXT,
  bank_name TEXT,
  account_number TEXT,
  account_name TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Records Table
CREATE TABLE IF NOT EXISTS records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  month DATE NOT NULL UNIQUE,
  electric_old DECIMAL(10, 2) NOT NULL DEFAULT 0,
  electric_new DECIMAL(10, 2) NOT NULL DEFAULT 0,
  water_old DECIMAL(10, 2) NOT NULL DEFAULT 0,
  water_new DECIMAL(10, 2) NOT NULL DEFAULT 0,
  rent_amount DECIMAL(10, 2) NOT NULL DEFAULT 0,
  electric_amount DECIMAL(10, 2) NOT NULL DEFAULT 0,
  water_amount DECIMAL(10, 2) NOT NULL DEFAULT 0,
  total_amount DECIMAL(10, 2) NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_records_month ON records(month DESC);

-- 3. Custom Fees Table
CREATE TABLE IF NOT EXISTS custom_fees (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL,
  type VARCHAR(10) NOT NULL CHECK (type IN ('fixed', 'unit')),
  unit_price DECIMAL(10, 2),
  fixed_amount DECIMAL(10, 2),
  unit_name VARCHAR(50),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_custom_fees_active ON custom_fees(is_active);

-- 4. Record Custom Fees Table (Junction)
CREATE TABLE IF NOT EXISTS record_custom_fees (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  record_id UUID REFERENCES records(id) ON DELETE CASCADE,
  custom_fee_id UUID REFERENCES custom_fees(id),
  fee_name VARCHAR(100) NOT NULL,
  quantity DECIMAL(10, 2) DEFAULT 1,
  amount DECIMAL(10, 2) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_record_custom_fees_record ON record_custom_fees(record_id);

-- Enable Row Level Security
ALTER TABLE settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE records ENABLE ROW LEVEL SECURITY;
ALTER TABLE custom_fees ENABLE ROW LEVEL SECURITY;
ALTER TABLE record_custom_fees ENABLE ROW LEVEL SECURITY;

-- Create RLS Policies (Allow all operations for now)
CREATE POLICY "Allow all operations on settings" ON settings FOR ALL USING (true);
CREATE POLICY "Allow all operations on records" ON records FOR ALL USING (true);
CREATE POLICY "Allow all operations on custom_fees" ON custom_fees FOR ALL USING (true);
CREATE POLICY "Allow all operations on record_custom_fees" ON record_custom_fees FOR ALL USING (true);
