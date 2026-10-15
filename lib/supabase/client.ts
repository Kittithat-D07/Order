"use client";

import { createBrowserClient } from "@supabase/ssr";

const ACTOR_KEY = "staff-session";

interface ActorInfo {
  role: string;
  name: string;
}

/**
 * ดึง actor (role, name) จาก localStorage
 * ใช้แนบไปกับ query เพื่อให้ audit log trigger ทำงานถูกต้อง
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

/**
 * Supabase client (browser)
 * - ตั้ง actor context ก่อนทุก query (สำหรับ audit log)
 * - ใช้ session token จาก Supabase (ถ้ามี)
 */
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          if (typeof document === "undefined") return [];
          return document.cookie
            .split("; ")
            .filter(Boolean)
            .map((c) => {
              const [name, ...rest] = c.split("=");
              return { name, value: rest.join("=") };
            });
        },
        setAll() {
          // ไม่ต้อง set cookies ฝั่ง client
        },
      },
    }
  );
}

/**
 * ตั้ง actor context ใน Supabase session
 * ใช้ก่อน insert/update ที่มี trigger เก็บ audit log
 */
export async function setActorContext(
  client: ReturnType<typeof createClient>
): Promise<void> {
  const actor = getActor();
  try {
    await client.rpc("set_actor_context", {
      actor_role: actor.role,
      actor_name: actor.name,
    });
  } catch {
    // ignore - trigger จะใช้ default 'system'
  }
}

/**
 * Helper: insert + ตั้ง actor ก่อน
 */
export async function insertWithActor<T extends Record<string, unknown>>(
  client: ReturnType<typeof createClient>,
  table: string,
  data: T
) {
  await setActorContext(client);
  return client.from(table).insert(data as any);
}

/**
 * Helper: update + ตั้ง actor ก่อน
 */
export async function updateWithActor(
  client: ReturnType<typeof createClient>,
  table: string,
  data: Record<string, unknown>,
  filter: { column: string; value: string | number }
) {
  await setActorContext(client);
  return client.from(table).update(data as any).eq(filter.column, filter.value as any);
}
