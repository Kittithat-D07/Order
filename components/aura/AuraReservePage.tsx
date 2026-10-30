"use client";

import { useState, type FormEvent } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { CheckCircle2, MapPin, Phone, Clock, Leaf } from "lucide-react";
import { Reveal } from "@/components/basilico/Reveal";
import { CustomCursor } from "@/components/basilico/CustomCursor";

const TIMES = [
  "11:00",
  "11:30",
  "12:00",
  "12:30",
  "13:00",
  "13:30",
  "17:00",
  "17:30",
  "18:00",
  "18:30",
  "19:00",
  "19:30",
  "20:00",
  "20:30",
];

const GUESTS = ["1", "2", "3", "4", "5", "6", "7", "8", "9+ (เหมาพื้นที่สวน)"];

const ZONES = [
  { value: "garden", label: "โซนสวน — นั่งชิลรับลมธรรมชาติ" },
  { value: "indoor", label: "โซนในร้านแอร์ — เย็นสบาย" },
  { value: "private", label: "มุมส่วนตัว — สำหรับครอบครัว" },
  { value: "any", label: "ที่ไหนก็ได้ — แล้วแต่ทางร้านจัดให้" },
];

const OCCASIONS = ["ไม่มี", "วันเกิด", "วันครบรอบ", "เลี้ยงครอบครัว", "เลี้ยงบริษัท", "เดทพิเศษ", "อื่นๆ"];

const inputCls =
  "w-full rounded-2xl border border-white/10 bg-[#121212] px-5 py-3.5 text-base font-light text-white placeholder:text-white/30 outline-none transition-all focus:border-[#D9A35F]/60 focus:shadow-[0_0_30px_rgba(217,163,95,0.12)]";
const labelCls =
  "mb-2 block text-sm font-light tracking-[0.08em] text-[#BDBDBD]";

export function AuraReservePage() {
  const [sent, setSent] = useState(false);
  const [name, setName] = useState("");

  const submit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    setName(String(data.get("name") ?? ""));
    setSent(true);
  };

  const today = new Date().toISOString().split("T")[0];

  return (
    <div className="basilico min-h-screen bg-[#070707] text-white antialiased">
      <style>{`
        .basilico .font-serif { font-family: var(--font-playfair), "Playfair Display", Georgia, serif; }
        @media (pointer: fine) {
          .basilico, .basilico a, .basilico button, .basilico input, .basilico select, .basilico textarea { cursor: none; }
        }
      `}</style>
      <CustomCursor />

      {/* แถบบน */}
      <header className="border-b border-white/10 bg-[#070707]/60 backdrop-blur-md">
        <div className="mx-auto flex h-[72px] max-w-[1280px] items-center justify-between px-5 md:px-8">
          <a href="/" className="font-serif text-2xl tracking-[0.14em] text-white">
            AURA <span className="text-[#D9A35F]">BISTRO</span>
          </a>
          <p className="hidden text-sm font-light tracking-[0.2em] text-[#BDBDBD] sm:block">
            ไทย การ์เด้น คิทเช่น
          </p>
        </div>
      </header>

      <main className="relative mx-auto max-w-[1280px] overflow-hidden px-5 pb-24 pt-14 md:px-8 md:pt-20">
        {/* แสงทองพื้นหลัง */}
        <div
          aria-hidden
          className="pointer-events-none absolute left-1/2 top-40 h-[600px] w-[900px] -translate-x-1/2"
          style={{
            background:
              "radial-gradient(ellipse at center, rgba(217,163,95,0.12) 0%, transparent 65%)",
          }}
        />

        <Reveal className="relative mb-10 text-center">
          <p className="mb-3 flex items-center justify-center gap-2 text-xs font-light uppercase tracking-[0.4em] text-[#D9A35F]">
            <Leaf size={14} /> จองโต๊ะล่วงหน้า
          </p>
          <h1 className="font-serif text-4xl text-white md:text-6xl">
            จองโต๊ะ <span className="bg-gradient-to-r from-[#D9A35F] via-[#F3D29A] to-[#C97A2B] bg-clip-text text-transparent">Aura Bistro</span>
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-base font-light leading-relaxed text-[#BDBDBD]">
            ร้านอาหารไทยในสวนตอนเย็น — กรอกฟอร์มด้านล่าง ทางร้านจะโทรยืนยัน
            ภายใน 2 ชั่วโมง ไม่ต้องมัดจำ
          </p>
        </Reveal>

        {/* การ์ดข้อมูลร้าน */}
        <Reveal className="relative mb-8">
          <div className="mx-auto grid max-w-3xl gap-3 sm:grid-cols-3">
            {[
              { icon: Clock, title: "เวลาเปิด", desc: "อ.–อา. 11:00–21:00" },
              { icon: Phone, title: "โทรจองด่วน", desc: "02-123-4567" },
              { icon: MapPin, title: "ที่ตั้ง", desc: "สวนไทยใจกลางเมือง" },
            ].map((c) => (
              <div
                key={c.title}
                className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-5 py-4 backdrop-blur-md"
              >
                <c.icon size={20} className="shrink-0 text-[#D9A35F]" />
                <div>
                  <p className="text-xs font-light tracking-[0.2em] text-[#BDBDBD]">{c.title}</p>
                  <p className="mt-0.5 text-sm font-normal text-white">{c.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </Reveal>

        <Reveal className="relative">
          <div className="mx-auto max-w-2xl rounded-3xl border border-white/10 bg-white/5 p-8 shadow-[0_0_30px_rgba(217,163,95,0.12)] backdrop-blur-md md:p-10">
            <AnimatePresence mode="wait">
              {sent ? (
                <motion.div
                  key="done"
                  initial={{ opacity: 0, scale: 0.94 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.8, ease: "easeOut" }}
                  className="py-10 text-center"
                >
                  <CheckCircle2 size={52} className="mx-auto text-[#D9A35F]" />
                  <h2 className="mt-5 font-serif text-3xl text-white">
                    รับคำขอจองแล้ว{name ? ` คุณ${name}` : ""}
                  </h2>
                  <p className="mx-auto mt-3 max-w-sm text-base font-light leading-relaxed text-[#BDBDBD]">
                    ขอบคุณที่เลือก Aura Bistro พนักงานจะโทรยืนยันโต๊ะ
                    ภายใน 2 ชั่วโมง แล้วเจอกันในสวนนะครับ
                  </p>
                  <button
                    onClick={() => setSent(false)}
                    className="mt-7 rounded-full border border-white/20 px-7 py-2.5 text-sm font-light tracking-[0.1em] text-[#BDBDBD] transition-colors hover:border-[#D9A35F]/60 hover:text-[#D9A35F]"
                  >
                    จองเพิ่มอีกโต๊ะ
                  </button>
                </motion.div>
              ) : (
                <motion.form
                  key="form"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.6 }}
                  onSubmit={submit}
                  className="grid gap-5 sm:grid-cols-2"
                >
                  <div>
                    <label htmlFor="aura-name" className={labelCls}>ชื่อผู้จอง *</label>
                    <input id="aura-name" name="name" required placeholder="เช่น คุณมินตรา" className={inputCls} autoComplete="name" />
                  </div>
                  <div>
                    <label htmlFor="aura-phone" className={labelCls}>เบอร์โทรศัพท์ *</label>
                    <input id="aura-phone" name="phone" required type="tel" placeholder="08x-xxx-xxxx" className={inputCls} autoComplete="tel" />
                  </div>
                  <div>
                    <label htmlFor="aura-date" className={labelCls}>วันที่ *</label>
                    <input id="aura-date" name="date" required type="date" min={today} className={`${inputCls} [color-scheme:dark]`} />
                  </div>
                  <div>
                    <label htmlFor="aura-time" className={labelCls}>เวลา *</label>
                    <select id="aura-time" name="time" required defaultValue="" className={inputCls}>
                      <option value="" disabled>เลือกเวลา</option>
                      {TIMES.map((t) => (
                        <option key={t} value={t}>{t} น.</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label htmlFor="aura-guests" className={labelCls}>จำนวนแขก *</label>
                    <select id="aura-guests" name="guests" required defaultValue="2" className={inputCls}>
                      {GUESTS.map((g) => (
                        <option key={g} value={g}>{g} ท่าน</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label htmlFor="aura-zone" className={labelCls}>โซนที่นั่ง</label>
                    <select id="aura-zone" name="zone" defaultValue="garden" className={inputCls}>
                      {ZONES.map((z) => (
                        <option key={z.value} value={z.value}>{z.label}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label htmlFor="aura-occasion" className={labelCls}>โอกาสพิเศษ</label>
                    <select id="aura-occasion" name="occasion" defaultValue="ไม่มี" className={inputCls}>
                      {OCCASIONS.map((o) => (
                        <option key={o} value={o}>{o}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label htmlFor="aura-dish" className={labelCls}>เมนูที่อยากทาน <span className="text-white/30">(ถ้ามี)</span></label>
                    <input id="aura-dish" name="dish" placeholder="เช่น แกงเขียวหวาน, ปลากะพงทอด" className={inputCls} />
                  </div>
                  <div className="sm:col-span-2">
                    <label htmlFor="aura-notes" className={labelCls}>คำขอพิเศษ / แพ้อาหาร</label>
                    <textarea
                      id="aura-notes"
                      name="notes"
                      rows={4}
                      placeholder="เช่น แพ้กุ้ง ขอโต๊ะริมสวน มีเด็กเล็กมาด้วย..."
                      className={`${inputCls} resize-none`}
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <button
                      type="submit"
                      className="w-full rounded-full bg-[#D9A35F] py-4 text-base font-normal tracking-[0.15em] text-[#070707] transition-all duration-500 hover:shadow-[0_0_30px_rgba(217,163,95,0.5)]"
                    >
                      ยืนยันการจองโต๊ะ
                    </button>
                    <p className="mt-4 text-center text-xs font-light text-white/40">
                      ไม่ต้องมัดจำ · ยกเลิกฟรีก่อน 3 ชั่วโมง · โทรด่วน 02-123-4567
                    </p>
                  </div>
                </motion.form>
              )}
            </AnimatePresence>
          </div>
        </Reveal>
      </main>
    </div>
  );
}
