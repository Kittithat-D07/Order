-- =========================================
-- Audit log: ประวัติการแก้ไขเมนู (ทั้งเพิ่ม/ลบ/แก้/เปิด-ปิด)
-- =========================================

-- 1. ตารางเก็บประวัติ
CREATE TABLE IF NOT EXISTS menu_item_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  menu_item_id UUID REFERENCES menu_items(id) ON DELETE SET NULL,
  menu_item_name TEXT NOT NULL, -- snapshot ชื่อ (กรณีลบเมนู)
  action TEXT NOT NULL CHECK (action IN ('created', 'updated', 'deleted', 'toggled_stock')),
  -- เก็บ field ที่เปลี่ยน (jsonb) เช่น {"name": "กะเพรา", "price": 60}
  changes JSONB DEFAULT '{}'::jsonb,
  -- ผู้กระทำ
  actor_role TEXT NOT NULL,        -- kitchen | server | admin
  actor_name TEXT NOT NULL,        -- "สมชาย" (กรอกเอง)
  -- timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_menu_history_created
  ON menu_item_history(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_menu_history_item
  ON menu_item_history(menu_item_id);

-- 2. Trigger function
CREATE OR REPLACE FUNCTION log_menu_item_change()
RETURNS TRIGGER AS $$
DECLARE
  v_actor_role TEXT;
  v_actor_name TEXT;
  v_changes JSONB;
BEGIN
  -- ดึง actor จาก session settings (ตั้งจากฝั่ง client ก่อน query)
  v_actor_role := COALESCE(current_setting('app.actor_role', true), 'system');
  v_actor_name := COALESCE(current_setting('app.actor_name', true), 'system');
  IF TG_OP = 'INSERT' THEN
    INSERT INTO menu_item_history
      (menu_item_id, menu_item_name, action, changes, actor_role, actor_name)
    VALUES
      (NEW.id, NEW.name, 'created',
       jsonb_build_object('name', NEW.name, 'price', NEW.price, 'category_id', NEW.category_id, 'is_available', NEW.is_available),
       v_actor_role, v_actor_name);
    RETURN NEW;

  ELSIF TG_OP = 'UPDATE' THEN
    -- เปรียบเทียบ field เก่า/ใหม่
    v_changes := jsonb_build_object(
      'before', jsonb_build_object(
        'name', OLD.name, 'price', OLD.price, 'is_available', OLD.is_available,
        'description', OLD.description, 'image_url', OLD.image_url, 'category_id', OLD.category_id
      ),
      'after', jsonb_build_object(
        'name', NEW.name, 'price', NEW.price, 'is_available', NEW.is_available,
        'description', NEW.description, 'image_url', NEW.image_url, 'category_id', NEW.category_id
      )
    );

    -- ถ้าเปลี่ยนแค่ is_available (ไม่มี field อื่นเปลี่ยน) = toggle stock
    IF OLD.name = NEW.name
       AND OLD.price = NEW.price
       AND COALESCE(OLD.description,'') = COALESCE(NEW.description,'')
       AND COALESCE(OLD.image_url,'') = COALESCE(NEW.image_url,'')
       AND OLD.category_id = NEW.category_id
       AND OLD.is_available IS DISTINCT FROM NEW.is_available
    THEN
      INSERT INTO menu_item_history
        (menu_item_id, menu_item_name, action, changes, actor_role, actor_name)
      VALUES
        (NEW.id, NEW.name, 'toggled_stock', v_changes, v_actor_role, v_actor_name);
    ELSE
      INSERT INTO menu_item_history
        (menu_item_id, menu_item_name, action, changes, actor_role, actor_name)
      VALUES
        (NEW.id, NEW.name, 'updated', v_changes, v_actor_role, v_actor_name);
    END IF;
    RETURN NEW;

  ELSIF TG_OP = 'DELETE' THEN
    INSERT INTO menu_item_history
      (menu_item_id, menu_item_name, action, changes, actor_role, actor_name)
    VALUES
      (OLD.id, OLD.name, 'deleted',
       jsonb_build_object('name', OLD.name, 'price', OLD.price),
       v_actor_role, v_actor_name);
    RETURN OLD;
  END IF;

  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- 3. สร้าง trigger
DROP TRIGGER IF EXISTS trg_menu_item_history ON menu_items;
CREATE TRIGGER trg_menu_item_history
AFTER INSERT OR UPDATE OR DELETE ON menu_items
FOR EACH ROW EXECUTE FUNCTION log_menu_item_change();

-- 4. RLS - เปิดให้อ่านได้ทั้งหมด (เป็น audit log)
ALTER TABLE menu_item_history ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow read menu_item_history" ON menu_item_history;
CREATE POLICY "Allow read menu_item_history" ON menu_item_history
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow insert menu_item_history" ON menu_item_history;
CREATE POLICY "Allow insert menu_item_history" ON menu_item_history
  FOR INSERT WITH CHECK (true);

-- 5. RPC สำหรับ client ตั้ง actor context
-- (ใช้ set_config เพื่อเก็บไว้ใน session ของ transaction)
CREATE OR REPLACE FUNCTION set_actor_context(actor_role TEXT, actor_name TEXT)
RETURNS VOID AS $$
BEGIN
  PERFORM set_config('app.actor_role', actor_role, true);
  PERFORM set_config('app.actor_name', actor_name, true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
