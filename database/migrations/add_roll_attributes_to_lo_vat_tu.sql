-- Migration: Bổ sung thuộc tính cây vải vào bảng lo_vat_tu (FR-03)
ALTER TABLE lo_vat_tu 
  ADD COLUMN IF NOT EXISTS mau_sac VARCHAR(50),
  ADD COLUMN IF NOT EXISTS kho_vai VARCHAR(50),
  ADD COLUMN IF NOT EXISTS chieu_dai NUMERIC(18,3) CHECK (chieu_dai IS NULL OR chieu_dai >= 0);
