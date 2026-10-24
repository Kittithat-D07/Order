"use client";

import { useState } from "react";
import { useServerName } from "@/hooks/useServerName";
import { User, X, Check, Pencil } from "lucide-react";

/**
 * The compact server identity chip.
 *
 * Uses the same terracotta family as everything else — the old version was
 * the last green-and-amber corner in the product.
 */
export function ServerNamePicker() {
  const { name, setServerName, clear, hydrated } = useServerName();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");

  if (!hydrated) return null;

  if (name && !editing) {
    return (
      <div className="flex items-center gap-1.5 bg-ok-light border border-ok/30 rounded-xl pl-2.5 pr-1 py-1">
        <div className="w-6 h-6 rounded-full bg-ok flex items-center justify-center text-white text-[10px] font-bold">
          {name.charAt(0).toUpperCase()}
        </div>
        <span className="text-xs font-semibold text-ok-text hidden sm:inline">{name}</span>
        <span className="text-xs font-semibold text-ok-text sm:hidden">เสริฟ์</span>
        <button
          onClick={() => {
            setDraft(name);
            setEditing(true);
          }}
          className="w-7 h-7 rounded-md hover:bg-ok/20 text-ok-text flex items-center justify-center"
          aria-label={`แก้ไขชื่อเสริฟ์ ${name}`}
        >
          <Pencil size={12} aria-hidden="true" />
        </button>
        <button
          onClick={clear}
          className="w-7 h-7 rounded-md hover:bg-bad-light text-bad-text flex items-center justify-center"
          aria-label="ล้างชื่อเสริฟ์"
        >
          <X size={12} aria-hidden="true" />
        </button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-1">
      <div className="flex items-center gap-1.5 bg-warn-light border border-warn/30 rounded-xl px-2.5 py-1.5">
        <User size={14} className="text-warn-text" aria-hidden="true" />
        <label htmlFor="server-name-picker" className="sr-only">
          ชื่อเสริฟ์
        </label>
        <input
          id="server-name-picker"
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
          className="bg-transparent outline-none text-xs w-20 sm:w-28 text-ink placeholder:text-warn-text"
          maxLength={20}
        />
        {draft.trim() && (
          <button
            onClick={() => {
              setServerName(draft);
              setEditing(false);
            }}
            className="w-7 h-7 rounded-md bg-brand hover:bg-brand-dark text-white flex items-center justify-center"
            aria-label="บันทึกชื่อเสริฟ์"
          >
            <Check size={12} aria-hidden="true" />
          </button>
        )}
      </div>
    </div>
  );
}
