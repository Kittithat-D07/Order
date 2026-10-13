"use client";

import { createBrowserClient } from "@supabase/ssr";

const ACTOR_KEY = "staff-session";

interface ActorInfo {
  role: string;
  name: string;
}

/**
 * ดึง actor จาก localStorage (ฝั่ง client เท่านั้น)
 * ใช้ส่งให้ trigger function ผ่าน RPC `set_actor_context`
 */
function getActor(): ActorInfo {
  if (typeof window === "undefined") return { role: "system", name: "system" };
  try {
    const raw = localStorage.getItem(ACTOR_KEY);
    if (raw) {
      const s = JSON.parse(raw);
      return { role: s.role || "system", name: s.displayName || "system" };
    }
  } catch {}
  return { role: "system", name: "system" };
}

export function createClient() {
  const client = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  // Proxy ที่เรียก set_actor_context ทุกครั้งก่อน query
  return new Proxy(client, {
    get(target, prop) {
      const value = target[prop as keyof typeof target];
      // สำหรับ from() / rpc() ให้ส่ง actor context ก่อน
      if (prop === "from" || prop === "rpc") {
        return (...args: any[]) => {
          // ตั้ง actor context แบบ fire-and-forget (ไม่ block)
          try {
            const a = getActor();
            const p = target.rpc("set_actor_context", {
              actor_role: a.role,
              actor_name: a.name,
            });
            if (p && typeof (p as any).catch === "function") {
              (p as any).catch(() => {});
            }
          } catch {}
          return (value as any).apply(target, args);
        };
      }
      return value;
    },
  });
}
