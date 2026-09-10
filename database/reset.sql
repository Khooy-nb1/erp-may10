-- =============================================================================
-- ERP MAY 10 — SCRIPT RESET DATABASE CHO MÔI TRƯỜNG DEVELOPMENT
-- CẢNH BÁO: CHỈ SỬ DỤNG TRONG MÔI TRƯỜNG PHÁT TRIỂN / TESTING!
-- =============================================================================

DROP SCHEMA IF EXISTS public CASCADE;
CREATE SCHEMA public;

GRANT ALL ON SCHEMA public TO postgres;
GRANT ALL ON SCHEMA public TO public;

COMMENT ON SCHEMA public IS 'ERP May 10 standard public schema';
