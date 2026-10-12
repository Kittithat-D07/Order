"use client";

import { useEffect, useState } from "react";

const STORAGE_KEY = "server-name";

export function useServerName() {
  const [name, setName] = useState<string>("");
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setName(localStorage.getItem(STORAGE_KEY) ?? "");
    setHydrated(true);
  }, []);

  const setServerName = (newName: string) => {
    const trimmed = newName.trim();
    if (trimmed) {
      localStorage.setItem(STORAGE_KEY, trimmed);
      setName(trimmed);
    }
  };

  const clear = () => {
    localStorage.removeItem(STORAGE_KEY);
    setName("");
  };

  return { name, setServerName, clear, hydrated };
}
