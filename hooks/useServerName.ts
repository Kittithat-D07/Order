"use client";

import { useEffect, useState } from "react";

const STORAGE_KEY = "server-name";

/**
 * The canonical name of the person on this device.
 *
 * It persists to localStorage so a server who types their name, reloads, or
 * walks to another screen keeps it — previously the server view held the name
 * in component state, so it vanished on every navigation and every order got
 * claimed by nobody.
 *
 * `fallbackName` lets the staff session (which carries the display name
 * chosen at login) seed the value the first time.
 */
export function useServerName(fallbackName?: string) {
  const [name, setNameState] = useState<string>("");
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    setNameState(stored ?? fallbackName ?? "");
    setHydrated(true);
    // Only re-seed when the fallback itself changes, and never overwrite a
    // name the user has already typed.
  }, [fallbackName]);

  const setServerName = (newName: string) => {
    const trimmed = newName.trim();
    if (trimmed) {
      localStorage.setItem(STORAGE_KEY, trimmed);
    }
    setNameState(trimmed);
  };

  const clear = () => {
    localStorage.removeItem(STORAGE_KEY);
    setNameState("");
  };

  return { name, setServerName, clear, hydrated };
}
