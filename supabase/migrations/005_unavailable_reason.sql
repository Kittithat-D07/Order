-- เพิ่ม field บอกเหตุผลที่เมนูปิด (หมดชั่วคราว vs ปิดถาวร)
ALTER TABLE menu_items
  ADD COLUMN IF NOT EXISTS unavailable_reason TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS marked_unavailable_at TIMESTAMPTZ DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS marked_unavailable_by TEXT DEFAULT NULL;

-- index สำหรับ query เมนูที่หมด
CREATE INDEX IF NOT EXISTS idx_menu_items_unavailable
  ON menu_items(is_available, unavailable_reason)
  WHERE is_available = false;
