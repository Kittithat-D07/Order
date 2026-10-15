# 🚀 คู่มือ Deploy ขึ้น Vercel

คู่มือนี้จะพาคุณ Deploy ระบบขึ้น Vercel (ฟรี) ใช้เวลาประมาณ 5 นาที

---

## 📋 วิธีที่ 1: Deploy ผ่าน Vercel Dashboard (แนะนำ)

### Step 1: Push โปรเจคขึ้น GitHub

```bash
cd restaurant-qr-order
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/restaurant-qr-order.git
git push -u origin main
```

### Step 2: Import ใน Vercel

1. ไปที่ https://vercel.com
2. Login (ใช้ GitHub)
3. คลิก **Add New** → **Project**
4. เลือก Repository: `restaurant-qr-order`
5. คลิก **Import**

### Step 3: ตั้งค่า Environment Variables

ในหน้า Configure Project:

| Name | Value |
|------|-------|
| `NEXT_PUBLIC_SUPABASE_URL` | `https://tkmxgyvabxwofhkxzrxa.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `eyJhbGci...` (จาก .env.local) |
| `NEXT_PUBLIC_BASE_URL` | `https://your-app.vercel.app` (ใส่หลัง deploy) |

### Step 4: Deploy

1. คลิก **Deploy**
2. รอ 1-2 นาที
3. ✅ เสร็จ! จะได้ URL เช่น `https://restaurant-qr-order.vercel.app`

### Step 5: อัปเดต NEXT_PUBLIC_BASE_URL

1. ไปที่ Project Settings → **Environment Variables**
2. แก้ `NEXT_PUBLIC_BASE_URL` เป็น URL จริง
3. Redeploy (Deployments → ⋯ → Redeploy)

---

## 📋 วิธีที่ 2: Deploy ผ่าน Vercel CLI

```bash
# ติดตั้ง Vercel CLI
npm i -g vercel

# Login
vercel login

# Deploy
cd restaurant-qr-order
vercel

# Deploy production
vercel --prod
```

---

## ⚙️ ตั้งค่า Supabase สำหรับ Production

### 1. เพิ่ม Site URL

1. ไปที่ Supabase → **Authentication** → **URL Configuration**
2. **Site URL**: `https://your-app.vercel.app`
3. **Redirect URLs** (เพิ่ม):
   - `https://your-app.vercel.app/**`
   - `https://your-app.vercel.app/menu`
   - `https://your-app.vercel.app/order/*`

### 2. ตั้งค่า CORS (ถ้าจำเป็น)

Supabase → **Settings** → **API** → **CORS** → เพิ่ม domain

---

## 🔐 เปลี่ยน PIN Staff สำหรับ Production

⚠️ **สำคัญ**: เปลี่ยน PIN ทั้งหมดก่อนใช้งานจริง!

```sql
-- เปลี่ยน PIN Admin
UPDATE staff_pins SET pin = 'YOUR_SECRET_PIN' WHERE role = 'admin';

-- เปลี่ยน PIN Kitchen
UPDATE staff_pins SET pin = 'YOUR_SECRET_PIN' WHERE role = 'kitchen';

-- เปลี่Change PIN Server
UPDATE staff_pins SET pin = 'YOUR_SECRET_PIN' WHERE role = 'server';
```

---

## 📱 ทดสอบบนมือถือจริง

1. เปิด URL: `https://your-app.vercel.app`
2. คลิก "ผู้จัดการ" → สร้างโต๊ะ → ดาวน์โหลด QR
3. สแกน QR ด้วยมือถือ (เปิดกล้อง)
4. ทดสอบสั่งอาหาร

---

## 🔄 Custom Domain (Optional)

ถ้ามี domain เป็นของตัวเอง (เช่น `order.myshop.com`):

1. Vercel → Project → **Settings** → **Domains**
2. เพิ่ม domain → ทำตามขั้นตอน verify
3. แก้ DNS ตามที่ Vercel บอก
4. อัปเดต `NEXT_PUBLIC_BASE_URL` เป็น domain ใหม่

---

## ✅ เสร็จแล้ว!

ระบบของคุณออนไลน์แล้ว 🎉

- 🌐 URL: `https://your-app.vercel.app`
- 📊 Dashboard: ดูยอดขายแบบ Real-time
- 📱 ลูกค้าสแกน QR ได้ทันที

---
