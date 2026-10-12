-- Migration: เพิ่ม server_name สำหรับหลายเสริฟ์
-- รันใน Supabase SQL Editor

ALTER TABLE public.orders
ADD COLUMN IF NOT EXISTS server_name TEXT;

ALTER TABLE public.orders
ADD COLUMN IF NOT EXISTS claimed_at TIMESTAMPTZ;

-- Index
CREATE INDEX IF NOT EXISTS idx_orders_server ON public.orders(server_name);
