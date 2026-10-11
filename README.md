# ร้านอาหาร QR Order (MVP)

ระบบสั่งอาหารผ่าน QR Code ที่โต๊ะ — ลูกค้าสแกน QR เพื่อดูเมนูและสั่งอาหาร ร้านรับออร์เดอร์แบบเรียลไทม์

## เทคโนโลยี

- **Next.js 14** (App Router) + **TypeScript**
- **Supabase** (PostgreSQL + Realtime)
- **Tailwind CSS**
- **Zustand** (state สำหรับตะกร้า)
- **qrcode** (สร้าง QR Code)

## โครงสร้าง

```
app/
  page.tsx                 # Landing
  menu/page.tsx            # หน้าเมนูลูกค้า
  order/[orderId]/page.tsx # ติดตามสถานะออร์เดอร์ (realtime)
  admin/
    page.tsx               # Kanban board
    menu/page.tsx          # CRUD เมนู
    tables/page.tsx        # จัดการโต๊ะ + QR
    orders/page.tsx        # ประวัติออร์เดอร์
  api/orders/route.ts      # API
components/
  customer/                # UI ฝั่งลูกค้า
  admin/                   # UI ฝั่งแอดมิน
lib/
  supabase/                # Supabase clients
  store/cart.ts            # Zustand store
  types.ts                 # TypeScript types
  utils.ts                 # Helper functions
supabase/
  migrations/001_init.sql  # Database schema
  seed.sql                 # ข้อมูลตัวอย่าง
```

## วิธีติดตั้ง

### 1. สร้างโปรเจกต์ Supabase

1. ไปที่ https://supabase.com สร้างโปรเจกต์ใหม่ (free tier)
2. ไปที่ **SQL Editor** → วางเนื้อหาใน `supabase/migrations/001_init.sql` → กด Run
3. วางเนื้อหาใน `supabase/seed.sql` → กด Run (เพิ่มเมนูตัวอย่าง + โต๊ะทดสอบ)
4. ไปที่ **Settings → API** → คัดลอก:
   - `Project URL` ใส่ใน `NEXT_PUBLIC_SUPABASE_URL`
   - `anon public` key ใส่ใน `NEXT_PUBLIC_SUPABASE_ANON_KEY`

### 2. ตั้งค่า environment

คัดลอก `.env.local.example` เป็น `.env.local` แล้วใส่ค่าจริง:

```bash
cp .env.local.example .env.local
```

```env
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
NEXT_PUBLIC_BASE_URL=http://localhost:3000
```

### 3. ติดตั้ง dependencies และรัน

```bash
npm install
npm run dev
```

เปิด http://localhost:3000

## การใช้งาน

### ฝั่งลูกค้า
- ลูกค้าเปิดลิงก์จาก QR: `http://localhost:3000/menu?table=t01-demo-aaaa`
- เลือกเมนู → ใส่ตะกร้า → กดสั่ง
- ระบบจะพาไปหน้าติดตามสถานะออร์เดอร์แบบ realtime

### ฝั่งร้าน
1. ไปที่ `/admin` ดู Kanban board (pending / preparing / served)
2. `/admin/menu` — เพิ่ม/แก้/ลบ เมนู หรือเปิด-ปิดเมนูชั่วคราว
3. `/admin/tables` — เพิ่มโต๊ะ → ดาวน์โหลด QR Code ไปพิมพ์ติดที่โต๊ะ
4. `/admin/orders` — ดูประวัติออร์เดอร์ทั้งหมด

## โทเคน QR ตัวอย่าง (จาก seed)

| โต๊ะ | URL |
|------|-----|
| T01 | `/menu?table=t01-demo-aaaa` |
| T02 | `/menu?table=t02-demo-bbbb` |
| T03 | `/menu?table=t03-demo-cccc` |
| T04 | `/menu?table=t04-demo-dddd` |

## Roadmap (ต่อยอดในอนาคต)

- ระบบล็อกอินแอดมิน (ปัจจุบันเข้า `/admin` ได้ทุกคน — แนะนำเปลี่ยน path เป็น secret)
- ระบบชำระเงิน (PromptPay / Stripe)
- พิมพ์ใบเสร็จ
- จัดการสต็อก
- รายงานยอดขาย
- รองรับหลายสาขา
