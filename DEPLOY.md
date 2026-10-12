# 🚀 Deployment Guide - Restaurant QR Order

## 📍 Production Stack

- **Supabase Project**: `tkmxgyvabxwofhkxzrxa`
- **Vercel App**: https://order-iyjx776h0-kittithat-kh-5987.vercel.app
- **Framework**: Next.js 14 (App Router)

## ⚙️ Environment Variables

ทั้ง `.env.local` (dev) และ `.env.vercel` (prod) ใช้ Supabase ตัวเดียวกัน:

```
NEXT_PUBLIC_SUPABASE_URL=https://tkmxgyvabxwofhkxzrxa.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
NEXT_PUBLIC_BASE_URL=https://order-iyjx776h0-kittithat-kh-5987.vercel.app
```

**Vercel Dashboard** → Settings → Environment Variables → ต้องมี 3 ตัวนี้ (Production)

## 🗄️ Database Setup (รันครั้งเดียว)

ไปที่ Supabase → SQL Editor → รันทีละไฟล์ตามลำดับ:

1. `supabase/all-in-one.sql` - สร้าง tables + RLS + Realtime + Seed
2. `supabase/migrations/002_add_server_name.sql`
3. `supabase/migrations/003_item_status.sql`
4. `supabase/migrations/004_staff_pins.sql`

## 🔑 Default PINs (เปลี่ยนได้ใน Table Editor → staff_pins)

| Role | PIN | หน้าที่ |
|------|-----|---------|
| kitchen | 1234 | ครัว |
| server | 5678 | เสริฟ์ |
| admin | 0000 | ผู้จัดการ |

## 🌐 Routes

| Path | ใช้ทำอะไร |
|------|----------|
| `/` | หน้าแรก (ลูกค้า) |
| `/order/[tableId]` | สั่งอาหาร |
| `/kitchen` | หน้าจอครัว (PIN) |
| `/server` | หน้าจอเสริฟ์ (PIN) |
| `/admin` | หน้าจอผู้จัดการ (PIN) |
| `/admin/tables` | สร้าง QR โต๊ะ |

## 🚀 Deploy

```bash
git add .
git commit -m "update env"
git push
```

Vercel จะ auto-deploy เมื่อ push ใหม่

## ⚠️ Tips

- Supabase Free จะ **pause** ถ้าไม่ใช้ 7 วัน → เข้า dashboard ทุก 6 วัน หรือ upgrade Pro
- เปลี่ยน PIN ก่อนใช้งานจริง
