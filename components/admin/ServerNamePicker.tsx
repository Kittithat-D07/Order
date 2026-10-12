"use client";

import { useState } from "react";
import { useServerName } from "@/hooks/useServerName";
import { User, X, Check } from "lucide-react";

export function ServerNamePicker() {
  const { name, setServerName, clear, hydrated } = useServerName();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");

  if (!hydrated) return null;

  if (name && !editing) {
    return (
      <div className="flex items-center gap-1.5 bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-xl pl-2.5 pr-1 py-1">
        <div className="w-6 h-6 rounded-full bg-gradient-to-br from-green-500 to-emerald-500 flex items-center justify-center text-white text-[10px] font-bold">
          {name.charAt(0).toUpperCase()}
        </div>
        <span className="text-xs font-semibold text-green-700 hidden sm:inline">{name}</span>
        <span className="text-xs font-semibold text-green-700 sm:hidden">เสริฟ์</span>
        <button
          onClick={() => {
            setDraft(name);
            setEditing(true);
          }}
          className="w-5 h-5 rounded-md hover:bg-green-100 text-green-600 flex items-center justify-center text-[10px]"
          title="แก้ไขชื่อ"
        >
          ✎
        </button>
        <button
          onClick={clear}
          className="w-5 h-5 rounded-md hover:bg-red-100 text-red-500 flex items-center justify-center"
          title="ออกจากระบบ"
        >
          <X size={10} />
        </button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-1">
      <div className="flex items-center gap-1.5 bg-amber-50 border border-amber-200 rounded-xl px-2.5 py-1.5">
        <User size={14} className="text-amber-600" />
        <input
          autoFocus={editing}
          type="text"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && draft.trim()) {
              setServerName(draft);
              setEditing(false);
            }
            if (e.key === "Escape") {
              setDraft(name);
              setEditing(false);
            }
          }}
          placeholder="ชื่อเสริฟ์..."
          className="bg-transparent outline-none text-xs w-20 sm:w-28 text-stone-800 placeholder:text-amber-400"
          maxLength={20}
        />
        {draft.trim() && (
          <button
            onClick={() => {
              setServerName(draft);
              setEditing(false);
            }}
            className="w-5 h-5 rounded-md bg-green-500 hover:bg-green-600 text-white flex items-center justify-center"
            title="บันทึก"
          >
            <Check size={10} />
          </button>
        )}
      </div>
    </div>
  );
}
