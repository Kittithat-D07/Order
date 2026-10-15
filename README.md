# 🍜 Restaurant QR Order - ระบบสั่งอาหารผ่าน QR Code

ระบบสั่งอาหารผ่าน QR Code สำหรับร้านอาหาร รองรับ 3 บทบาท (ครัว / เสิร์ฟ / ผู้จัดการ) พร้อม Realtime

---

## ✨ ฟีเจอร์หลัก

### 👨‍🍳 พนักงานครัว (Kitchen)
- ดูออร์เดอร์แบบ Real-time (อัปเดตทันทีที่ลูกค้าสั่ง)
- เปลี่ยนสถานะอาหาร: รอครัว → กำลังทำ → พร้อมเสิร์ฟ
- จัดการสต็อก (เปิด-ปิด เมนูที่หมด)
- แยกหน้า "กำลังทำ" / "เสร็จแล้ว"

### 🍽️ พนักงานเสิร์ฟ (Server)
- รับออร์เดอร์ (claim order)
- เห็นเมนูที่ "พร้อมเสิร์ฟ" แล้วนำไปเสิร์ฟ
- เพิ่มเมนูให้โต๊ะ
- จัดการบิล / รับเงิน
- เปิด-ปิด สต็อก

### 👔 ผู้จัดการ (Admin)
- Dashboard สรุปยอดขาย (รายวัน/สัปดาห์/เดือน)
- จัดการเมนู (เพิ่ม/ลบ/แก้ไข/เปิด-ปิด)
- จัดการโต๊ะ (สร้าง QR Code, ดาวน์โหลด, พิมพ์)
- ดูประวัติออร์เดอร์
- ดู Audit Log (ประวัติการแก้ไขเมนู)
- กราฟวิเคราะห์ยอดขาย

### 📱 ลูกค้า (Customer)
- สแกน QR Code ที่โต๊ะ → เข้าหน้าเมนูทันที
- ดูเมนูแยกตามหมวด
- เพิ่มลงตะกร้า พร้อมหมายเหตุ
- สั่งอาหาร → ติดตามสถานะแบบ Real-time
- ขอบิล / ดูบิล

---

## 🏗️ เทคโนโลยี

| ส่วน | เทคโนโลยี |
|------|-----------|
| Frontend | Next.js 14 (App Router) + React 18 + TypeScript |
| Styling | Tailwind CSS 3 + Framer Motion |
| State | Zustand (cart), React Hooks |
| Backend | Supabase (PostgreSQL + Realtime) |
| QR Code | qrcode (generate), qrcode.js (scan) |
| Charts | Recharts |
| Icons | Lucide React |
| Deploy | Vercel |

---

## 🚀 เริ่มใช้งาน

### 1. ติดตั้ง Dependencies

```bash
cd restaurant-qr-order
pnpm install
# หรือ npm install
```

### 2. ตั้งค่า Supabase

ดูคู่มือใน [`SETUP.md`](./SETUP.md) - มีคำอธิบายทีละขั้นตอน

สรุปสั้นๆ:
1. ไปที่ https://supabase.com/dashboard
2. SQL Editor → New query
3. Copy ทั้งหมดจาก `supabase/setup-complete.sql` → Run
4. ตั้งค่า `.env.local` (ดูตัวอย่างใน `.env.local.example`)

### 3. รัน Dev Server

```bash
pnpm dev
```

เปิด http://localhost:3000

---

## 🔐 PIN Staff (ค่าเริ่มต้น)

| Role | PIN | ชื่อ |
|------|-----|------|
| 👨‍🍳 ครัว | `1234` | แม่ครัว |
| 🍽️ เสิร์ฟ | `5678` | พนักงานเสิร์ฟ |
| 👔 ผู้จัดการ | `0000` | ผู้จัดการ |

> ⚠️ เปลี่ยน PIN ได้ที่ Supabase → Table Editor → `staff_pins`

---

## 📁 โครงสร้างโปรเจค

```
restaurant-qr-order/
├── app/                          # Next.js App Router
│   ├── page.tsx                  # หน้าหลัก (Staff Login)
│   ├── layout.tsx                # Root layout
│   ├── globals.css               # Global styles
│   ├── menu/                     # หน้าเมนูลูกค้า (QR scan → /menu?table=xxx)
│   ├── order/[orderId]/          # ติดตามสถานะออร์เดอร์
│   ├── bill/[orderId]/           # หน้าบิล/ใบเสร็จ
│   ├── kitchen/                  # หน้าจอครัว
│   │   ├── page.tsx              # ออร์เดอร์ที่กำลังทำ
│   │   ├── done/                 # เสร็จแล้ว
│   │   └── stock/                # จัดการสต็อก
│   ├── server/                   # หน้าจอเสิร์ฟ
│   └── admin/                    # หน้าจอผู้จัดการ
│       ├── page.tsx              # Dashboard
│       ├── menu/                 # จัดการเมนู
│       ├── tables/               # จัดการโต๊ะ + QR
│       ├── orders/               # ประวัติออร์เดอร์
│       └── history/              # Audit log
├── components/
│   ├── ui/                       # UI components (button, card, etc.)
│   ├── staff/                    # Kitchen/Server views
│   ├── admin/                    # Admin dashboard
│   ├── customer/                 # Customer menu, cart
│   └── auth/                     # RoleGuard, StaffNameModal
├── hooks/
│   ├── useStaffSession.ts        # Staff session (localStorage)
│   └── useServerName.ts          # Server name
├── lib/
│   ├── supabase/                 # Supabase client (browser/server)
│   ├── types.ts                  # TypeScript types
│   ├── utils.ts                  # Helper functions
│   └── store/                    # Zustand stores (cart)
├── supabase/
│   ├── setup-complete.sql        # 🎯 รันอันนี้ครั้งเดียวจบ!
│   ├── migrations/               # ไฟล์ migration แต่ละอัน
│   ├── all-in-one.sql            # (เก่า) รวม migration 1-4
│   └── seed.sql                  # ข้อมูลตัวอย่าง
└── .env.local                    # Environment variables
```

---

## 🔄 Flow การใช้งาน

### 🟢 Flow 1: ลูกค้าสั่งอาหาร
```
1. ลูกค้าสแกน QR Code ที่โต๊ะ
   → URL: http://localhost:3000/menu?table=t01-demo-aaaa

2. เลือกเมนู → เพิ่มลงตะกร้า → กด "สั่งอาหาร"

3. ไปหน้า /order/{orderId}
   → เห็นสถานะ Real-time
   → pending → preparing → served

4. กด "ขอบิล" เมื่อทุกอย่างเสร็จ
   → ไปหน้า /bill/{orderId}
```

### 🟢 Flow 2: พนักงานทำงาน
```
1. เปิด http://localhost:3000

2. เลือก Role:
   - ครัว → เข้า /kitchen
   - เสิร์ฟ → เข้า /server
   - ผู้จัดการ → ใส่ PIN "0000" → เข้า /admin

3. ทำงานตามหน้าที่
```

---

## 🛠️ คำสั่งที่ใช้บ่อย

```bash
# รัน dev server
pnpm dev

# Build production
pnpm build

# Start production
pnpm start

# Lint
pnpm lint
```

---

## 📊 Database Schema

ตารางหลัก:
- `tables` - โต๊ะ + QR token
- `menu_categories` - หมวดเมนู
- `menu_items` - เมนู
- `orders` - ออร์เดอร์
- `order_items` - รายการย่อยในออร์เดอร์
- `bills` - บิล
- `staff_pins` - PIN staff
- `menu_item_history` - Audit log

ดู Schema เต็มใน `supabase/setup-complete.sql`

---

## 🐛 Troubleshooting

### ❌ ลูกค้าสแกน QR แล้ว "ไม่พบเมนู"
**สาเหตุ**: ยังไม่ได้รัน SQL
**แก้**: ไปที่ Supabase SQL Editor → รัน `supabase/setup-complete.sql`

### ❌ Admin ใส่ PIN ไม่ได้
**สาเหตุ**: ตาราง `staff_pins` ยังไม่มีข้อมูล
**แก้**: รัน SQL ใน `supabase/setup-complete.sql` (จะ INSERT PIN อัตโนมัติ)

### ❌ ครัวไม่เห็นออร์เดอร์
**สาเหตุ**: Realtime ไม่ทำงาน
**แก้**: ตรวจสอบว่า Supabase project เปิด Realtime (Database → Replication)

### ❌ QR Code ดาวน์โหลดไม่ได้
**สาเหตุ**: Browser block popup
**แก้**: อนุญาต popup สำหรับ localhost

---

## 📚 เอกสารเพิ่มเติม

- [SETUP.md](./SETUP.md) - คู่มือติดตั้ง Supabase ทีละขั้นตอน
- [DEPLOY.md](./DEPLOY.md) - คู่มือ Deploy ขึ้น Vercel

---

## 📝 License

MIT - ใช้ได้ฟรี แก้ไขได้ แจกจ่ายได้
