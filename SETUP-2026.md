# 🚀 อัปเกรดระบบ QR Ordering สู่มาตรฐานปี 2026

เอกสารนี้อธิบายว่า **อะไรเปลี่ยนไป**, **ทำไมต้องเปลี่ยน**, และ **ต้องรันอะไรบ้าง**
เพื่อให้ระบบพร้อมใช้งานจริงในร้าน

---

## 🎯 สรุปสั้น ๆ

ก่อนอัปเกรด ระบบนี้มีช่องโหว่ระดับ **ร้านอาหารทั้งร้านอยู่ในความเสี่ยง**:

| ปัญหา | ผลกระทบ |
|---|---|
| `anon key` เขียนทุกตารางได้ (`FOR ALL USING (true)`) | ลูกค้าแก้ราคาเมนูเป็น 0 บาท, ลบเมนูทั้งร้าน, ลบตาราง+ออร์เดอร์ |
| `anon key` อ่าน `orders` / `bills` ได้ | ใครก็ตามเปิด URL เห็นยอดขายทั้งร้าน ข้อมูลลูกค้าทุกโต๊ะ |
| `anon key` อ่าน `staff_pins` ได้ | ได้ bcrypt hash ของ PIN ผู้จัดการ → brute-force 4 หลักได้ในพริบตา |
| ลูกค้าคำนวณราคาและยอดรวมเอง | ส่ง `unit_price: 1` มาก็ได้ เปลี่ยนเมนู 490 บาท เป็น 1 บาท |
| ไม่มีการตัดสต็อกตอนสั่ง | ครัวขายของหมดทั้งที่ระบบยังบอก "มีของ" |
| `role` เก็บใน `localStorage` | พิมพ์ 1 บรรทัดใน console = เป็นผู้จัดการทันที ครัว/เสิร์ฟไม่ต้องใส่ PIN |
| `/api/reports/export` ไม่มี auth | ดาวน์โหลดรายงานยอดขายได้โดยไม่ต้องล็อกอิน |
| `GET /api/orders` ไม่มี auth | อ่านออร์เดอร์ทุกโต๊ะได้จาก URL เดียว |

หลังอัปเกรด ทุกช่องโหว่ข้างบนถูกปิดและมี **ชั้นป้องกันสองชั้น**:
โค้ดฝั่ง server + นโยบาย RLS ของฐานข้อมูล

---

## 🔐 สถาปัตยกรรมใหม่

```
ลูกค้า (มือถือ)
   │  อ่านเมนูได้อย่างเดียว (anon key + RLS public SELECT)
   │  สั่งอาหาร → POST /api/orders
   │  ดูออร์เดอร์ของตัวเอง → /api/customer/order/[id]?table=<qr_token>
   ▼
┌──────────────────────────────────────────┐
│  Next.js Server (Route Handlers)          │
│  ├─ ตรวจ session cookie (HttpOnly + HMAC) │
│  ├─ อ่านราคาจาก DB เท่านั้น ไม่เชื่อ client│
│  ├─ จองสต็อกแบบ atomic (ไม่ติดลบ)      │
│  └─ คำนวณยอดรวมจากราคาที่ DB อ่านมา      │
└──────────────────────────────────────────┘
   │  service role key (bypass RLS)
   ▼
Supabase (RLS เป็นชั้นป้องกันชั้นที่สอง)
```

**หลักการ:** เบราว์เซอร์เป็นแค่ "ตัวแสดงผล" ไม่ใช่ "ผู้ตัดสินใจ"
เงิน สต็อก และสิทธิ์การเขียน ทั้งหมดตัดสินใจที่ server

---

## 🗄️ ไฟล์ที่เพิ่ม/แก้

### Migration (ต้องรันเรียงลำดับ)

| ไฟล์ | ทำอะไร |
|---|---|
| `supabase/migrations/2026-10-24-production-hardening.sql` | เพิ่มคอลัมน์เงิน, `is_active`, trigger คำนวณยอด, RPC ตัด/คืนสต็อก, index |
| `supabase/migrations/2026-10-24-access-control.sql` | ตาราง `staff_sessions`, helper ตรวจ role, นโยบาย RLS |
| `supabase/migrations/2026-10-24-lockdown.sql` | ปิด policy ที่เปิดกว้างเกินไป (ขั้นสุดท้าย) |

### โค้ด

| ไฟล์ | หน้าที่ |
|---|---|
| `lib/auth/session-token.ts` | สร้าง/ตรวจ session token ที่เซ็นด้วย HMAC |
| `lib/supabase/server-auth.ts` | ออก/อ่าน/ยกเลิก session (HttpOnly cookie) |
| `lib/api/staff-guard.ts` | ด่านตรวจสิทธิ์ที่ทุก staff route ใช้ |
| `lib/supabase/schema.ts` | **ตรวจ schema จริงตอนรัน** — ทำให้แอปไม่พังถ้ายังไม่ได้รัน migration |
| `lib/supabase/stock.ts` | จอง/คืนสต็อก — ใช้ RPC ถ้ามี, ถ้าไม่มีใช้วิธีเทียบเท่าที่ปลอดภัย |
| `app/api/staff/*` | API สำหรับพนักงานทั้งหมด (ต้องมี session) |
| `app/api/customer/*` | API ฝั่งลูกค้า (ตรวจ `qr_token` ทุกครั้ง) |

> **`lib/supabase/schema.ts` คือจุดสำคัญสำหรับการ deploy**
> แอปตรวจว่าคอลัมน์/RPC/ตารางไหนมีอยู่จริง แล้วเลือก path ที่ใช้ได้
> ดังนั้น deploy ก่อนรัน migration ก็ **ไม่ทำให้ร้านพัง** — พอรัน migration
> เสร็จ ระบบจะอัปเกรดตัวเองเป็นเวอร์ชันเต็มอัตโนมัติ

---

## ✅ ขั้นตอนการนำขึ้นใช้งาน

### ขั้นที่ 1 — เพิ่ม Environment Variables

แก้ไฟล์ `.env.local`:

```env
# หาได้จาก Supabase → Project Settings → API
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# สร้างด้วย:  openssl rand -hex 32
SESSION_SECRET=<ค่าสุ่มยาว ๆ>
```

> ⚠️ **อย่าใส่ `NEXT_PUBLIC_` นำหน้า service role key**
> เพราะจะถูก bundle เข้า JavaScript ที่มือถือลูกค้าดาวน์โหลด

### ขั้นที่ 2 — รัน Migration (3 ไฟล์)

**ทางเลือก A — ผ่าน Supabase Dashboard (แนะนำ)**

1. เปิด https://supabase.com/dashboard → เลือกโปรเจกต์ → **SQL Editor**
2. เปิดไฟล์ `supabase/migrations/2026-10-24-production-hardening.sql` → คัดลอกทั้งไฟล์ → วาง → **Run**
3. ทำซ้ำกับ `2026-10-24-access-control.sql`
4. ทำซ้ำกับ `2026-10-24-lockdown.sql`

> ทั้ง 3 ไฟล์เป็น **idempotent** — รันซ้ำได้ไม่พัง

> ⚠️ **ลำดับสำคัญมาก** — ถ้ารันผิดลำดับจะได้ error
> `42883: function public.current_staff_role() does not exist`
>
> เหตุผล: Postgres ตรวจสอบ expression ของ policy ตอนสร้าง
> (`CREATE POLICY`) ดังนั้นฟังก์ชัน `current_staff_role()` ต้อง
> **มีอยู่ก่อน** ที่จะสร้าง policy ที่เรียกใช้มัน
>
> ไฟล์ `access-control.sql` แก้ให้สร้างฟังก์ชันไว้ที่หัวข้อ 1b
> (ก่อน policy ทุกตัว) แล้ว ดังนั้นแค่รันตามลำดับ 1 → 2 → 3 ก็พอ
>
> ถ้าเคยรันผิดลำดับแล้ว รันซ้ำตามลำดับถูกต้องได้เลย
> เพราะทุกไฟล์ idempotent

**ทางเลือก B — ผ่าน CLI**

```bash
npx supabase link --project-ref tkmxgyvabxwofhkxzrxa
npx supabase db push
```

### ขั้นที่ 3 — ตรวจสอบว่าล็อกสำเร็จ

รันใน SQL Editor:

```sql
SELECT * FROM public.public_access_report();
```

ควรเห็นเฉพาะ policy ที่อ้าง `current_staff_role()` เท่านั้น
(ไม่มี policy ที่เป็น `USING (true)` บน `orders`, `order_items`, `bills`, `tables`)

ตรวจว่า anon key อ่านข้อมูลลูกค้าไม่ได้แล้ว:

```bash
# ควรได้ 401/403 หรือ 0 rows
curl "<SUPABASE_URL>/rest/v1/orders?select=*" -H "apikey: <ANON_KEY>"
```

### ขั้นที่ 4 — รีสตาร์ท dev server

```bash
npm run dev
```

---

## 🔑 PIN พนักงาน

ค่าเริ่มต้นในฐานข้อมูล demo:

| Role | PIN | ชื่อที่แสดง |
|---|---|---|
| ครัว | `123456` | 👨‍🍳 ครัว |
| เสิร์ฟ | *(ตั้งใหม่)* | 🍽️ เสิร์ฟ์ |
| ผู้จัดการ | `000000` | ⚙️ ผู้จัดการ |

**เปลี่ยน PIN ก่อนใช้งานจริง** — ทั้งในร้านและบน GitHub/Vercel

### วิธีเปลี่ยน PIN (ต้องมี Node.js)

```bash
node -e "const b=require('bcryptjs');console.log(b.hashSync('YOUR_NEW_PIN',10))"
```

แล้วอัปเดตใน Supabase → Table Editor → `staff_pins` → คอลัมน์ `pin_hash`
(หรือรัน SQL: `UPDATE staff_pins SET pin_hash='<hash>' WHERE role='admin';`)

> PIN ควรยาวอย่างน้อย 6 หลัก — 4 หลัก brute-force ได้ง่ายมาก

---

## 🧪 ทดสอบว่าระบบปลอดภัย

```bash
# 1. staff API ต้องปฏิเสธ (คาดว่า 401)
curl -i http://localhost:3000/api/staff/orders

# 2. CSV export ต้องปฏิเสธ (คาดว่า 401)
curl -i http://localhost:3000/api/reports/export

# 3. สั่งอาหารต้องใช้ table token (qr_token ของโต๊ะ) ไม่ใช่ table id
curl -X POST http://localhost:3000/api/orders \
  -H "Content-Type: application/json" \
  -d '{"table":"<QR_TOKEN>","items":[{"menu_item_id":"<ITEM_UUID>","quantity":1}]}'

# 4. แก้ราคาเองต้องไม่มีผล — ยอดต้องเป็นราคาจริงจาก DB
curl -X POST http://localhost:3000/api/orders \
  -H "Content-Type: application/json" \
  -d '{"table":"<QR_TOKEN>","items":[{"menu_item_id":"<ITEM_UUID>","quantity":1,"unit_price":1,"subtotal":1}]}'

# 5. ขอบิล/ยกเลิกข้ามโต๊ะต้องถูกปฏิเสธ (คาดว่า 403)
curl -X POST http://localhost:3000/api/bills \
  -H "Content-Type: application/json" \
  -d '{"orderId":"<ORDER_UUID>","table":"<QR_TOKEN_ของโต๊ะอื่น>"}'
```

> หมายเหตุ: ทุก request ของลูกค้าใช้ `qr_token` เป็นหลักฐานว่า "อยู่ที่โต๊ะนี้"
> ไม่ใช่ `table_id` — เพราะ `table_id` เดาได้ แต่ `qr_token` มีอยู่ใน QR Code เท่านั้น

---

## 📋 สิ่งที่ยังต้องทำก่อนใช้งานจริงในร้าน

- [ ] รัน migration ทั้ง 3 ไฟล์
- [ ] เพิ่ม `SUPABASE_SERVICE_ROLE_KEY` + `SESSION_SECRET` ใน `.env.local` **และ** ใน Vercel
- [ ] เปลี่ยน PIN ทั้ง 3 role เป็นค่าที่เดายาก
- [ ] ทดสอบ `public_access_report()` ว่าปิดสำเร็จ
- [ ] ตั้งราคาจริงในเมนู (ของเดิมเป็นราคาตัวอย่าง)
- [ ] กำหนด `is_active` ของโต๊ะให้ถูก (ปิดโต๊ะที่ไม่ได้ใช้)
- [ ] ตั้ง `low_stock_threshold` สำหรับเมนูที่ต้องนับสต็อก
- [ ] ทดสอบสั่งอาหารจริง 1 รอบ: ลูกค้า → ครัว → เสิร์ฟ → จ่ายเงิน
- [ ] ทดสอบปิดโต๊ะ (soft close) — ต้องหยุดรับออร์เดอร์ใหม่ แต่ประวัติยอดขายยังอยู่
- [ ] ทดสอบยกเลิกออร์เดอร์ — สต็อกต้องกลับเข้าเท่าเดิม

---

## 🧹 การสำรองข้อมูล

ก่อน deploy ครั้งแรก:

```bash
npx supabase db dump --file backup.sql
```

และตั้ง scheduled job เรียก `public.cleanup_expired_sessions()` ทุกวัน
เพื่อลบ session ที่หมดอายุเกิน 7 วัน

---

## 📖 เอกสารอ้างอิง

- `DESIGN.md` — ระบบดีไซน์ (Bold Terracotta)
- `PRODUCT.md` — ขอบเขตและกลไกของผลิตภัณฑ์
- `SETUP.md` — การติดตั้งจากศูนย์
- `supabase/migrations/` — ประวัติการเปลี่ยนแปลงฐานข้อมูล
