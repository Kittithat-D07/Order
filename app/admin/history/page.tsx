"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { motion, AnimatePresence } from "framer-motion";
import { BlurFade, GradientBlob, FloatingElement, PulseDot } from "@/components/ui/magic-effects";
import { BottomTabBar } from "@/components/ui/bottom-tab-bar";
import { RoleGuard } from "@/components/auth/RoleGuard";
import {
  History, Plus, Edit3, Trash2, Power, User, Search,
  Filter, RefreshCw, ScrollText, ChevronRight, Clock, X
} from "lucide-react";
import { formatDateTime } from "@/lib/utils";

interface HistoryEntry {
  id: string;
  menu_item_id: string | null;
  menu_item_name: string;
  action: "created" | "updated" | "deleted" | "toggled_stock";
  changes: any;
  actor_role: string;
  actor_name: string;
  created_at: string;
}

function HistoryContent() {
  const supabase = createClient();
  const [entries, setEntries] = useState<HistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterAction, setFilterAction] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<HistoryEntry | null>(null);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("menu_item_history")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(200);
    setEntries((data ?? []) as HistoryEntry[]);
    setLoading(false);
  };

  useEffect(() => {
    load();
    const channel = supabase
      .channel("history-changes")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "menu_item_history" }, () => load())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  const filtered = entries.filter(e => {
    if (filterAction !== "all" && e.action !== filterAction) return false;
    if (search) {
      const q = search.toLowerCase();
      return e.menu_item_name?.toLowerCase().includes(q) ||
             e.actor_name?.toLowerCase().includes(q);
    }
    return true;
  });

  // สรุปสถิติ
  const stats = {
    created: entries.filter(e => e.action === "created").length,
    updated: entries.filter(e => e.action === "updated").length,
    deleted: entries.filter(e => e.action === "deleted").length,
    stock: entries.filter(e => e.action === "toggled_stock").length,
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-blue-50 to-purple-50 relative overflow-x-hidden">
      <GradientBlob className="top-[-150px] right-[-100px] w-72 h-72" color="bg-indigo-300/30" />
      <GradientBlob className="top-[40%] left-[-100px] w-72 h-72" color="bg-blue-300/30" delay={2} />
      <GradientBlob className="bottom-[-100px] right-[30%] w-72 h-72" color="bg-purple-300/30" delay={4} />

      <FloatingElement className="top-32 right-8" delay={0}>
        <History className="w-6 h-6 text-indigo-400/50" />
      </FloatingElement>

      <header className="sticky top-14 z-20 bg-gradient-to-r from-indigo-500/95 via-blue-500/95 to-purple-500/95 text-white shadow-lg shadow-indigo-500/30">
        <div className="max-w-3xl mx-auto px-3 sm:px-4 pb-2.5 pt-2 flex items-center justify-between gap-2">
          <BlurFade delay={0.1}>
            <div className="flex items-center gap-2.5 min-w-0">
              <motion.div
                animate={{ rotate: [0, 360] }}
                transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
                className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center shadow-lg shrink-0"
              >
                <ScrollText size={20} strokeWidth={2.2} />
              </motion.div>
              <div className="min-w-0 flex-1">
                <h1 className="text-base font-bold flex items-center gap-2">
                  <span className="truncate">ประวัติเมนู</span>
                  <PulseDot color="bg-white" />
                </h1>
                <p className="text-[10px] opacity-90 truncate">
                  Audit Log · {entries.length} รายการ
                </p>
              </div>
            </div>
          </BlurFade>
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={() => load()}
            className="p-2 rounded-lg bg-white/20 hover:bg-white/30 transition"
          >
            <RefreshCw size={16} />
          </motion.button>
        </div>

        {/* Stats bar */}
        <div className="max-w-3xl mx-auto px-3 sm:px-4 pb-2.5 flex items-center gap-1.5 text-[10px]">
          <div className="flex items-center gap-1 bg-white/20 backdrop-blur px-2 py-1 rounded-full">
            <Plus size={10} /> <span className="font-bold">{stats.created}</span> เพิ่ม
          </div>
          <div className="flex items-center gap-1 bg-white/20 backdrop-blur px-2 py-1 rounded-full">
            <Edit3 size={10} /> <span className="font-bold">{stats.updated}</span> แก้
          </div>
          <div className="flex items-center gap-1 bg-white/20 backdrop-blur px-2 py-1 rounded-full">
            <Power size={10} /> <span className="font-bold">{stats.stock}</span> เปิด-ปิด
          </div>
          <div className="flex items-center gap-1 bg-white/20 backdrop-blur px-2 py-1 rounded-full">
            <Trash2 size={10} /> <span className="font-bold">{stats.deleted}</span> ลบ
          </div>
        </div>
      </header>

      <main className="relative z-10 max-w-3xl mx-auto px-3 sm:px-4 py-4 pt-20 pb-32">
        {/* Search + Filter */}
        <div className="mb-3 space-y-2">
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="ค้นหาชื่อเมนู / ผู้แก้..."
              className="w-full pl-9 pr-3 py-2.5 bg-white border border-stone-200 rounded-2xl text-sm outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition shadow-sm"
            />
          </div>
          <div className="flex gap-1.5 overflow-x-auto pb-1">
            {[
              { id: "all", label: "ทั้งหมด", color: "bg-stone-100 text-stone-700" },
              { id: "created", label: `+ เพิ่ม`, color: "bg-green-100 text-green-700" },
              { id: "updated", label: `✏️ แก้ไข`, color: "bg-blue-100 text-blue-700" },
              { id: "toggled_stock", label: `⚡ เปิด-ปิด`, color: "bg-amber-100 text-amber-700" },
              { id: "deleted", label: `🗑️ ลบ`, color: "bg-red-100 text-red-700" },
            ].map(f => (
              <motion.button
                key={f.id}
                whileTap={{ scale: 0.95 }}
                onClick={() => setFilterAction(f.id)}
                className={`px-3 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-all ${
                  filterAction === f.id
                    ? "bg-gradient-to-r from-indigo-500 to-blue-500 text-white shadow-md"
                    : f.color
                }`}
              >
                {f.label}
              </motion.button>
            ))}
          </div>
        </div>

        {/* List */}
        {loading ? (
          <div className="text-center py-20 text-stone-400">
            <RefreshCw className="w-8 h-8 mx-auto mb-2 animate-spin opacity-50" />
            <p className="text-sm">กำลังโหลดประวัติ...</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20 text-stone-400">
            <History size={48} className="mx-auto mb-3 opacity-50" />
            <p className="text-sm">ไม่มีประวัติ</p>
          </div>
        ) : (
          <div className="space-y-2">
            <AnimatePresence>
              {filtered.map((entry, idx) => (
                <HistoryCard
                  key={entry.id}
                  entry={entry}
                  idx={idx}
                  onClick={() => setSelected(entry)}
                />
              ))}
            </AnimatePresence>
          </div>
        )}
      </main>

      <BottomTabBar />

      {/* Detail Modal */}
      <AnimatePresence>
        {selected && (
          <DetailModal entry={selected} onClose={() => setSelected(null)} />
        )}
      </AnimatePresence>
    </div>
  );
}

function HistoryCard({ entry, idx, onClick }: { entry: HistoryEntry; idx: number; onClick: () => void }) {
  const config: Record<string, { icon: any; bg: string; color: string; label: string }> = {
    created:   { icon: Plus,    bg: "bg-green-100",  color: "text-green-700",  label: "เพิ่มเมนู" },
    updated:   { icon: Edit3,   bg: "bg-blue-100",   color: "text-blue-700",   label: "แก้ไข" },
    deleted:   { icon: Trash2,  bg: "bg-red-100",    color: "text-red-700",    label: "ลบเมนู" },
    toggled_stock: { icon: Power, bg: "bg-amber-100", color: "text-amber-700",  label: "เปิด-ปิดสต็อก" },
  };
  const c = config[entry.action] || config.updated;
  const Icon = c.icon;
  const timeAgo = getTimeAgo(entry.created_at);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: idx * 0.02 }}
      whileTap={{ scale: 0.99 }}
      onClick={onClick}
      className="bg-white rounded-2xl border border-stone-200 p-3 flex items-center gap-3 hover:border-indigo-300 hover:shadow-md transition-all cursor-pointer"
    >
      <div className={`w-10 h-10 rounded-xl ${c.bg} flex items-center justify-center shrink-0`}>
        <Icon size={18} className={c.color} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <p className="font-bold text-sm text-stone-800 truncate">{entry.menu_item_name}</p>
          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${c.bg} ${c.color}`}>
            {c.label}
          </span>
        </div>
        <p className="text-[11px] text-stone-500 mt-0.5 flex items-center gap-1">
          <User size={10} />
          {entry.actor_name}
          <span className="text-stone-300">·</span>
          <Clock size={10} />
          {timeAgo}
        </p>
      </div>
      <ChevronRight size={16} className="text-stone-300 shrink-0" />
    </motion.div>
  );
}

function DetailModal({ entry, onClose }: { entry: HistoryEntry; onClose: () => void }) {
  const config: Record<string, { icon: any; bg: string; color: string; label: string }> = {
    created:   { icon: Plus,    bg: "bg-green-100",  color: "text-green-700",  label: "เพิ่มเมนู" },
    updated:   { icon: Edit3,   bg: "bg-blue-100",   color: "text-blue-700",   label: "แก้ไข" },
    deleted:   { icon: Trash2,  bg: "bg-red-100",    color: "text-red-700",    label: "ลบเมนู" },
    toggled_stock: { icon: Power, bg: "bg-amber-100", color: "text-amber-700",  label: "เปิด-ปิดสต็อก" },
  };
  const c = config[entry.action] || config.updated;
  const Icon = c.icon;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-stone-900/60 backdrop-blur-sm flex items-end md:items-center justify-center p-0 md:p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ y: 100, scale: 0.95 }}
        animate={{ y: 0, scale: 1 }}
        exit={{ y: 100, scale: 0.95 }}
        onClick={(e) => e.stopPropagation()}
        className="bg-white w-full md:max-w-lg md:rounded-2xl rounded-t-2xl max-h-[85vh] overflow-hidden flex flex-col"
      >
        <div className={`px-4 py-3 ${c.bg} flex items-center justify-between`}>
          <h3 className="font-bold text-stone-800 flex items-center gap-2">
            <div className={`w-9 h-9 rounded-xl bg-white flex items-center justify-center shadow-sm`}>
              <Icon size={18} className={c.color} />
            </div>
            {c.label}: {entry.menu_item_name}
          </h3>
          <button onClick={onClose} className="p-1 hover:bg-white/50 rounded-lg">
            <X size={18} />
          </button>
        </div>

        <div className="p-4 space-y-3 overflow-y-auto">
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div className="bg-stone-50 rounded-xl p-3">
              <p className="text-[10px] text-stone-500 mb-1">ผู้กระทำ</p>
              <p className="font-bold text-stone-800 flex items-center gap-1">
                <User size={12} />
                {entry.actor_name}
              </p>
            </div>
            <div className="bg-stone-50 rounded-xl p-3">
              <p className="text-[10px] text-stone-500 mb-1">บทบาท</p>
              <p className="font-bold text-stone-800 capitalize">{entry.actor_role}</p>
            </div>
            <div className="bg-stone-50 rounded-xl p-3 col-span-2">
              <p className="text-[10px] text-stone-500 mb-1">เวลา</p>
              <p className="font-bold text-stone-800 text-xs">{formatDateTime(entry.created_at)}</p>
            </div>
          </div>

          {/* Diff display */}
          {entry.changes && Object.keys(entry.changes).length > 0 && (
            <div>
              <p className="text-xs font-bold text-stone-700 mb-2 flex items-center gap-1">
                <Edit3 size={12} /> รายละเอียดการเปลี่ยนแปลง
              </p>
              <div className="bg-stone-50 rounded-xl p-3 space-y-1.5">
                {entry.action === "updated" && entry.changes.before && entry.changes.after ? (
                  <DiffView before={entry.changes.before} after={entry.changes.after} />
                ) : entry.action === "toggled_stock" && entry.changes.after ? (
                  <div className="text-sm">
                    <span className="text-stone-500">สถานะ: </span>
                    <span className={entry.changes.after.is_available ? "text-green-600 font-bold" : "text-rose-600 font-bold"}>
                      {entry.changes.after.is_available ? "เปิดขาย" : "ปิด (หมด)"}
                    </span>
                  </div>
                ) : (
                  <pre className="text-[11px] text-stone-700 overflow-x-auto whitespace-pre-wrap break-all">
                    {JSON.stringify(entry.changes, null, 2)}
                  </pre>
                )}
              </div>
            </div>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}

function DiffView({ before, after }: { before: any; after: any }) {
  const fields = Object.keys(after);
  return (
    <div className="space-y-1.5 text-xs">
      {fields.map(field => {
        const oldVal = JSON.stringify(before[field]);
        const newVal = JSON.stringify(after[field]);
        const changed = oldVal !== newVal;
        if (!changed) return null;
        return (
          <div key={field} className="border-l-2 border-amber-300 pl-2 py-0.5">
            <p className="font-bold text-stone-700 text-[11px]">{field}</p>
            <p className="text-red-500 line-through text-[11px]">{oldVal}</p>
            <p className="text-green-600 text-[11px]">→ {newVal}</p>
          </div>
        );
      })}
    </div>
  );
}

function getTimeAgo(iso: string) {
  const mins = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (mins < 1) return "เมื่อกี้";
  if (mins < 60) return `${mins} นาทีที่แล้ว`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs} ชม.ที่แล้ว`;
  const days = Math.floor(hrs / 24);
  return `${days} วันที่แล้ว`;
}

export default function HistoryPage() {
  return (
    <RoleGuard allowedRoles={["admin"]} pageName="ประวัติเมนู">
      <HistoryContent />
    </RoleGuard>
  );
}
