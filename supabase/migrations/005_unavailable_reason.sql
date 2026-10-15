-- =====================================================
-- Migration 005: เพิ่มเหตุผลเมนูปิด + ผู้ปิด + เวลา
-- สำหรับแยก "หมดชั่วคราว" vs "ปิดถาวร"
-- =====================================================

-- เพิ่ม field บอกเหตุผลที่เมนูปิด (หมดชั่วคราว vs ปิดถาวร)
ALTER TABLE public.menu_items
  ADD COLUMN IF NOT EXISTS unavailable_reason TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS marked_unavailable_at TIMESTAMPTZ DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS marked_unavailable_by TEXT DEFAULT NULL;

-- index สำหรับ query เมนูที่หมด
CREATE INDEX IF NOT EXISTS idx_menu_items_unavailable
  ON public.menu_items(is_available, unavailable_reason)
  WHERE is_available = false;

-- =====================================================
-- อัปเดต RLS policy ให้รองรับ field ใหม่
-- (public write policy ครอบคลุมอยู่แล้ว แต่ verify)
-- =====================================================

-- (ไม่ต้องแก้ RLS เพราะ policy "Allow public write menu_items" 
--  ครอบคลุมการ UPDATE/INSERT ทุก field อยู่แล้ว)
