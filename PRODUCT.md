# Product

<!-- impeccable:product-schema 1 -->

## Platform

web (responsive, mobile-first)

## Stack

Next.js 14, TypeScript, Supabase, Tailwind CSS, Framer Motion, Vercel deployment

## Users

- **ลูกค้า**: สั่งอาหารผ่าน QR Code ที่โต๊ะ, ดูเมนู, เพิ่ม-ลดออเดอร์, ขอเช็คบิล
- **พนักงานครัว**: ดูออเดอร์ใหม่, กดเสิร์ฟเสร็จ
- **พนักงานเสิร์ฟ**: รับออเดอร์, พิมพ์บิล
- **แอดมิน**: จัดการโต๊ะ, เมนู, ดูประวัติ

## Product Purpose

ระบบสั่งอาหารผ่าน QR Code สำหรับร้านอาหารไทย ใช้ง่าย รวดเร็ว ลดความสับสนระหว่างลูกค้าและพนักงาน

## Positioning

QR-based ordering ที่ไม่ต้องติดตั้งแอป เปิดลิงก์ = สั่งได้เลย

## Operating Context

- ลูกค้าสแกน QR ที่โต๊ะ → เปิดเมนูบนมือถือ
- พนักงานใช้ tablet/laptop ดูออเดอร์ครัว
- ร้านอาหารไทย SME, 10-50 ที่นั่ง

## Capabilities and Constraints

- สั่งอาหารต่อจากออเดอร์เดิม (session ต่อเนื่อง)
- รองรับโต๊ะหลายโต๊ะพร้อมกัน
- ปิดเมนูเมื่อหมด
- พิมพ์บิล
- Real-time updates

## Brand Commitments

ชื่อ: Aura Bistro (บน QR landing page)

## Evidence on Hand

- โลโก้: ไม่มี (ใช้ text "Aura Bistro")
- ภาพอาหาร: จาก Unsplash (placeholder)
- ไม่มี design system ที่เป็นทางการ

## Product Principles

1. **ง่าย** - ลูกค้าสั่งได้ใน 3 คลิก
2. **เร็ว** - ไม่มี loading ที่ไม่จำเป็น
3. **ชัดเจน** - ราคา, จำนวน, สถานะ อ่านเข้าใจทันที
4. **เชื่อถือได้** - ออเดอร์ไม่หาย, sync ตลอดเวลา
