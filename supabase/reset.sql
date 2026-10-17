-- =====================================================
-- ⚠️ RESET DATABASE (ลบทุกอย่าง + สร้างใหม่)
-- =====================================================
-- ใช้กรณีที่ migration ซับซ้อน → เริ่มใหม่สะอาดกว่า
-- ⚠️ ข้อมูลทั้งหมดจะหาย!
-- =====================================================

-- ลบ trigger ก่อน
DROP TRIGGER IF EXISTS trg_generate_order_number ON public.orders;
DROP TRIGGER IF EXISTS trg_generate_bill_number ON public.bills;

-- ลบ functions
DROP FUNCTION IF EXISTS generate_order_number() CASCADE;
DROP FUNCTION IF EXISTS generate_bill_number() CASCADE;
DROP FUNCTION IF EXISTS update_updated_at() CASCADE;
DROP FUNCTION IF EXISTS check_stock_available(UUID, INT) CASCADE;

-- ลบ views
DROP VIEW IF EXISTS public.active_orders CASCADE;
DROP VIEW IF EXISTS public.kitchen_queue CASCADE;
DROP VIEW IF EXISTS public.order_details CASCADE;
DROP VIEW IF EXISTS public.daily_sales CASCADE;

-- ลบตาราง (CASCADE จะลบ FK ที่เกี่ยวข้องด้วย)
DROP TABLE IF EXISTS public.order_items CASCADE;
DROP TABLE IF EXISTS public.orders CASCADE;
DROP TABLE IF EXISTS public.bills CASCADE;
DROP TABLE IF EXISTS public.staff_login_attempts CASCADE;
DROP TABLE IF EXISTS public.staff_pins CASCADE;
DROP TABLE IF EXISTS public.menu_items CASCADE;
DROP TABLE IF EXISTS public.menu_categories CASCADE;
DROP TABLE IF EXISTS public.tables CASCADE;

-- ลบ types
DROP TYPE IF EXISTS order_status CASCADE;
DROP TYPE IF EXISTS bill_status CASCADE;
DROP TYPE IF EXISTS bill_payment_method CASCADE;

-- ลบ extensions (จะ recreate)
-- DROP EXTENSION IF EXISTS "uuid-ossp";  -- ไม่ลบ เพราะอาจมีตารางอื่นใช้

SELECT '✅ Database reset complete! ตอนนี้รัน setup-complete.sql ได้เลย' AS status;
