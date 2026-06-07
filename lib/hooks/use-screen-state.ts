"use client";

import { Dispatch, SetStateAction, useEffect, useState } from "react";

function readStoredState<T>(key: string, initialValue: T): T {
  if (typeof window === "undefined") return initialValue;

  try {
    const stored = window.sessionStorage.getItem(key);
    return stored ? (JSON.parse(stored) as T) : initialValue;
  } catch {
    return initialValue;
  }
}

export function useScreenState<T>(
  key: string,
  initialValue: T,
): [T, Dispatch<SetStateAction<T>>] {
  const storageKey = `screen-state:${key}`;
  const [value, setValue] = useState<T>(() =>
    readStoredState(storageKey, initialValue),
  );

  useEffect(() => {
    try {
      window.sessionStorage.setItem(storageKey, JSON.stringify(value));
    } catch {
      // Session storage is best-effort only.
    }
  }, [storageKey, value]);

  return [value, setValue];
}
