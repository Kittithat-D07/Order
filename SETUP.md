# 🚀 คู่มือติดตั้ง Supabase

คู่มือนี้จะพาคุณติดตั้ง Supabase ทีละขั้นตอน ใช้เวลาประมาณ 5-10 นาที

---

## 📋 สิ่งที่ต้องเตรียม

- ✅ บัญชี Supabase (สมัครฟรีที่ https://supabase.com)
- ✅ Project URL: `https://tkmxgyvabxwofhkxzrxa.supabase.co`
- ✅ Anon Key (อยู่ใน `.env.local` แล้ว)

---

## 🎯 ขั้นตอนการติดตั้ง

### Step 1: เปิด Supabase SQL Editor

1. ไปที่ https://supabase.com/dashboard
2. เลือก Project: `tkmxgyvabxwofhkxzrxa`
3. คลิกเมนู **SQL Editor** ทางซ้าย
4. คลิก **New query**

### Step 2: รัน SQL Setup

1. เปิดไฟล์ `supabase/setup-complete.sql`
2. **Copy ทั้งหมด** (Ctrl+A → Ctrl+C)
3. **Paste** ในช่อง SQL Editor
4. คลิก **Run** (หรือกด Ctrl+Enter)
5. รอประมาณ 5-10 วินาที

> ✅ ถ้าสำเร็จจะเห็น "Success. No rows returned" หรือ "Success"

### Step 3: ตรวจสอบ Tables

1. คลิกเมนู **Table Editor** ทางซ้าย
2. ควรเห็นตารางเหล่านี้:
   - ✅ `tables` (4-6 แถว)
   - ✅ `menu_categories` (4 แถว)
   - ✅ `menu_items` (12 แถว)
   - ✅ `orders` (ว่าง)
   - ✅ `order_items` (ว่าง)
   - ✅ `bills` (ว่าง)
   - ✅ `staff_pins` (3 แถว)
   - ✅ `menu_item_history` (ว่าง)

### Step 4: เปิด Realtime

1. คลิกเมนู **Database** → **Replication**
2. ตรวจสอบว่าเปิด Realtime สำหรับ:
   - ✅ `orders`
   - ✅ `order_items`
   - ✅ `menu_items`
   - ✅ `bills`
   - ✅ `menu_item_history`

> 💡 SQL setup จะเปิดให้อัตโนมัติ แต่ตรวจสอบอีกครั้งเพื่อความแน่ใจ

### Step 5: ตั้งค่า Environment Variables

ตรวจสอบไฟล์ `.env.local` ว่ามีค่าถูกต้อง:

```env
NEXT_PUBLIC_SUPABASE_URL=https://tkmxgyvabxwofhkxzrxa.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
NEXT_PUBLIC_BASE_URL=http://localhost:3000
```

> ✅ ค่าเหล่านี้ตั้งไว้แล้วในโปรเจค

### Step 6: รัน Dev Server

```bash
cd restaurant-qr-order
pnpm dev
```

เปิด http://localhost:3000

---

## 🧪 ทดสอบว่าทุกอย่างทำงาน

### ✅ Test 1: หน้าหลัก
- เปิด http://localhost:3000
- ควรเห็น 3 ปุ่ม: ครัว / เสิร์ฟ / ผู้จัดการ
- คลิก "ดู UI Demo" → เห็นหน้า Demo

### ✅ Test 2: ผู้จัดการ
- คลิก "ผู้จัดการ" → ใส่ PIN: `0000`
- เข้าหน้า `/admin`
- ควรเห็น Dashboard พร้อมกราฟ
- คลิก "จัดการเมนู" → เห็นเมนู 12 รายการ
- คลิก "จัดการโต๊ะ" → เห็น 6 โต๊ะ (T01-T06)

### ✅ Test 3: ลูกค้าสั่งอาหาร
- ไปที่ http://localhost:3000/menu?table=t01-demo-aaaa
- ควรเห็นเมนู 12 รายการ แยก 4 หมวด
- เพิ่มเมนูลงตะกร้า → กด "สั่งอาหาร"
- เข้าหน้า Order → เห็นสถานะ Real-time

### ✅ Test 4: ครัว
- คลิก "ครัว" → เข้า /kitchen
- ควรเห็นออร์เดอร์ที่สั่ง (จาก Test 3)
- กด "กำลังทำ" → เปลี่ยนสถานะ
- ไปที่หน้า /order → เห็นอัปเดตทันที

### ✅ Test 5: เสิร์ฟ
- คลิก "เสิร์ฟ" → เข้า /server
- ควรเห็นออร์เดอร์ที่ "พร้อมเสิร์ฟ"
- กด "นำไปเสิร์ฟ" → เปลี่ยนเป็น "เสร็จแล้ว"

---

## 🔧 เปลี่ยน PIN Staff

### วิธีที่ 1: ผ่าน Supabase Dashboard
1. ไปที่ **Table Editor** → `staff_pins`
2. คลิกแถวที่ต้องการแก้
3. แก้ค่า `pin` (เช่น `9999`)
4. Save

### วิธีที่ 2: ผ่าน SQL
```sql
UPDATE staff_pins
SET pin = '9999', updated_at = NOW()
WHERE role = 'admin';
```

---

## 🆘 แก้ปัญหา

### ❌ "Failed to fetch" หรือ CORS Error
**สาเหตุ**: `.env.local` ไม่ถูกต้อง
**แก้**:
1. ตรวจสอบว่า URL ขึ้นต้นด้วย `https://`
2. ตรวจสอบว่า Anon Key ครบถ้วน
3. **Restart dev server** (Ctrl+C → `pnpm dev`)

### ❌ "permission denied for table xxx"
**สาเหตุ**: RLS policies ไม่ถูกต้อง
**แก้**: รัน `setup-complete.sql` อีกครั้ง (ส่วน PART 13)

### ❌ Realtime ไม่อัปเดต
**สาเหตุ**: ไม่ได้เปิด Realtime
**แก้**:
1. Supabase → Database → Replication
2. เปิด Realtime สำหรับ tables ที่ต้องการ

### ❌ "relation does not exist"
**สาเหตุ**: ยังไม่ได้รัน SQL
**แก้**: รัน `setup-complete.sql`

---

## ✅ เสร็จแล้ว!

ตอนนี้ระบบพร้อมใช้งานแล้ว 🎉

ถ้าเจอปัญหา:
1. ดู Console (F12) → Tab Console
2. ดู Network → หา request ที่ fail
3. ดู Supabase Logs

---
