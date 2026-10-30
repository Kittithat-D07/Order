"use client";

import { useState, type FormEvent } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { CheckCircle2 } from "lucide-react";
import { Reveal } from "@/components/basilico/Reveal";

const TIMES = ["17:30", "18:00", "18:30", "19:00", "19:30", "20:00", "20:30", "21:00"];
const GUESTS = ["1", "2", "3", "4", "5", "6", "7+ (Private Salon)"];

const inputCls =
  "w-full rounded-2xl border border-white/10 bg-[#121212] px-5 py-3.5 text-base font-light text-white placeholder:text-white/30 outline-none transition-all duration-400 focus:border-[#D9A35F]/60 focus:shadow-[0_0_30px_rgba(217,163,95,0.12)]";
const labelCls =
  "mb-2 block text-xs font-light uppercase tracking-[0.28em] text-[#BDBDBD]";

export function Reservation() {
  const [sent, setSent] = useState(false);

  const submit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSent(true);
  };

  // min = today, for the native date picker
  const today = new Date().toISOString().split("T")[0];

  return (
    <section id="reserve" className="relative scroll-mt-20 overflow-hidden py-24 md:py-32">
      {/* gold glow */}
      <div
        aria-hidden
        className="absolute left-1/2 top-1/2 h-[600px] w-[900px] -translate-x-1/2 -translate-y-1/2"
        style={{
          background:
            "radial-gradient(ellipse at center, rgba(217,163,95,0.12) 0%, transparent 65%)",
        }}
      />

      <div className="relative mx-auto max-w-[1280px] px-5 md:px-8">
        <Reveal className="mb-12 text-center">
          <p className="mb-3 text-xs font-light uppercase tracking-[0.4em] text-[#D9A35F]">
            Join Us
          </p>
          <h2 className="font-serif text-4xl text-white md:text-5xl">
            Reserve Your Evening
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-base font-light text-[#BDBDBD]">
            Forty-two seats each night. We hold every table for the whole
            evening — yours, for as long as you wish to stay.
          </p>
        </Reveal>

        <Reveal>
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
                  <h3 className="mt-5 font-serif text-3xl text-white">
                    Request Received
                  </h3>
                  <p className="mx-auto mt-3 max-w-sm text-base font-light text-[#BDBDBD]">
                    Our maître d&apos; will confirm your table within two hours.
                    We look forward to the evening.
                  </p>
                  <button
                    onClick={() => setSent(false)}
                    className="mt-7 rounded-full border border-white/20 px-7 py-2.5 text-sm font-light tracking-[0.12em] text-[#BDBDBD] transition-colors hover:border-[#D9A35F]/60 hover:text-[#D9A35F]"
                  >
                    Make another request
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
                    <label htmlFor="basil-name" className={labelCls}>Name</label>
                    <input id="basil-name" required placeholder="Your full name" className={inputCls} autoComplete="name" />
                  </div>
                  <div>
                    <label htmlFor="basil-phone" className={labelCls}>Phone</label>
                    <input id="basil-phone" required type="tel" placeholder="+66 ..." className={inputCls} autoComplete="tel" />
                  </div>
                  <div>
                    <label htmlFor="basil-date" className={labelCls}>Date</label>
                    <input id="basil-date" required type="date" min={today} className={`${inputCls} [color-scheme:dark]`} />
                  </div>
                  <div>
                    <label htmlFor="basil-time" className={labelCls}>Time</label>
                    <select id="basil-time" required defaultValue="" className={inputCls}>
                      <option value="" disabled>Select time</option>
                      {TIMES.map((t) => (
                        <option key={t} value={t}>{t}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label htmlFor="basil-guests" className={labelCls}>Guests</label>
                    <select id="basil-guests" required defaultValue="2" className={inputCls}>
                      {GUESTS.map((g) => (
                        <option key={g} value={g}>{g} {g.length === 1 ? "guests" : ""}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label htmlFor="basil-occasion" className={labelCls}>Occasion <span className="text-white/30">(optional)</span></label>
                    <input id="basil-occasion" placeholder="Anniversary, birthday..." className={inputCls} />
                  </div>
                  <div className="sm:col-span-2">
                    <label htmlFor="basil-notes" className={labelCls}>Special Requests</label>
                    <textarea
                      id="basil-notes"
                      rows={4}
                      placeholder="Allergies, seating preferences, surprises we should keep secret..."
                      className={`${inputCls} resize-none`}
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <button
                      type="submit"
                      className="w-full rounded-full bg-[#D9A35F] py-4 text-sm font-normal tracking-[0.2em] text-[#070707] transition-all duration-500 hover:shadow-[0_0_30px_rgba(217,163,95,0.5)]"
                    >
                      REQUEST RESERVATION
                    </button>
                    <p className="mt-4 text-center text-xs font-light text-white/40">
                      No card required · Complimentary valet from 17:00
                    </p>
                  </div>
                </motion.form>
              )}
            </AnimatePresence>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
