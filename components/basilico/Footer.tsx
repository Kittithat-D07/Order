"use client";

import { useState, type FormEvent } from "react";
import { Check, MapPin, Phone, Mail, Clock } from "lucide-react";

export function Footer() {
  const [email, setEmail] = useState("");
  const [subscribed, setSubscribed] = useState(false);

  const subscribe = (e: FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    setSubscribed(true);
  };

  return (
    <footer className="border-t border-white/10">
      <div className="mx-auto grid max-w-[1280px] gap-12 px-5 py-16 md:grid-cols-[1.2fr_1fr_1.2fr] md:px-8">
        {/* Brand */}
        <div>
          <p className="font-serif text-3xl tracking-[0.18em] text-white">
            BASI<span className="text-[#D9A35F]">LICO</span>
          </p>
          <p className="mt-4 max-w-xs text-sm font-light leading-relaxed text-[#BDBDBD]">
            Fire, patience, and quiet precision. Forty-two seats, seven
            courses, one unforgettable evening.
          </p>
        </div>

        {/* Contact */}
        <div className="space-y-3 text-sm font-light text-[#BDBDBD]">
          <p className="mb-4 text-xs uppercase tracking-[0.3em] text-[#D9A35F]">
            Visit Us
          </p>
          <p className="flex items-start gap-3">
            <MapPin size={16} className="mt-0.5 shrink-0 text-[#D9A35F]/70" />
            88 Charoen Krung Road, Bang Rak, Bangkok
          </p>
          <p className="flex items-center gap-3">
            <Phone size={16} className="shrink-0 text-[#D9A35F]/70" />
            +66 2 123 4567
          </p>
          <p className="flex items-center gap-3">
            <Mail size={16} className="shrink-0 text-[#D9A35F]/70" />
            reserve@basilico.example
          </p>
          <p className="flex items-center gap-3">
            <Clock size={16} className="shrink-0 text-[#D9A35F]/70" />
            Tue – Sun · 17:30 – 23:00
          </p>
        </div>

        {/* Newsletter */}
        <div>
          <p className="mb-4 text-xs uppercase tracking-[0.3em] text-[#D9A35F]">
            The Golden Hour Letter
          </p>
          <p className="mb-4 text-sm font-light text-[#BDBDBD]">
            Seasonal menus and chef&apos;s table invitations, once a month.
          </p>
          {subscribed ? (
            <p className="flex items-center gap-2 rounded-2xl border border-[#D9A35F]/30 bg-[#D9A35F]/10 px-5 py-3.5 text-sm font-light text-[#D9A35F]">
              <Check size={16} /> You&apos;re on the list. Welcome.
            </p>
          ) : (
            <form onSubmit={subscribe} className="flex gap-2">
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="your@email.com"
                aria-label="Email for newsletter"
                className="min-w-0 flex-1 rounded-2xl border border-white/10 bg-[#121212] px-5 py-3 text-sm font-light text-white placeholder:text-white/30 outline-none transition-colors focus:border-[#D9A35F]/60"
              />
              <button
                type="submit"
                className="shrink-0 rounded-2xl bg-[#D9A35F] px-6 py-3 text-sm font-normal text-[#070707] transition-shadow duration-500 hover:shadow-[0_0_30px_rgba(217,163,95,0.4)]"
              >
                Join
              </button>
            </form>
          )}
        </div>
      </div>

      <div className="border-t border-white/10">
        <div className="mx-auto flex max-w-[1280px] flex-col items-center justify-between gap-2 px-5 py-6 text-xs font-light text-white/40 sm:flex-row md:px-8">
          <p>© {new Date().getFullYear()} Basilico. All rights reserved.</p>
          <p className="tracking-[0.2em]">CRAFTED WITH FIRE IN BANGKOK</p>
        </div>
      </div>
    </footer>
  );
}
