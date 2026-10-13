-- =====================================================
-- Migration 007: Cleanup unused views
-- View order_status_summary และ current_table_session
-- ไม่มี code เรียกใช้ (ตรวจสอบแล้ว) → ลบทิ้ง
-- =====================================================

DROP VIEW IF EXISTS public.order_status_summary;
DROP VIEW IF EXISTS public.current_table_session;
