"use client";

import { useCallback, useMemo, useSyncExternalStore } from "react";

/**
 * Chapter progress is stored per browser in `localStorage`, because the app has
 * no user accounts yet. `useSyncExternalStore` keeps the server render empty
 * (no hydration mismatch) and re-renders once the stored value is available.
 */
const listeners = new Set<() => void>();
const EMPTY = "[]";

function emitChange() {
  for (const listener of listeners) {
    listener();
  }
}

export type ChapterProgress = {
  /** Ids of the chapters marked as learned. */
  completed: string[];
  isComplete: (chapterId: string) => boolean;
  toggle: (chapterId: string) => void;
  reset: () => void;
};

export function useChapterProgress(storageKey: string): ChapterProgress {
  const subscribe = useCallback(
    (onStoreChange: () => void) => {
      const handleStorage = (event: StorageEvent) => {
        if (event.key === storageKey) {
          onStoreChange();
        }
      };

      listeners.add(onStoreChange);
      window.addEventListener("storage", handleStorage);

      return () => {
        listeners.delete(onStoreChange);
        window.removeEventListener("storage", handleStorage);
      };
    },
    [storageKey],
  );

  const getSnapshot = useCallback(() => {
    try {
      return window.localStorage.getItem(storageKey) ?? EMPTY;
    } catch {
      return EMPTY;
    }
  }, [storageKey]);

  const raw = useSyncExternalStore(subscribe, getSnapshot, () => EMPTY);

  const completed = useMemo(() => {
    try {
      const parsed: unknown = JSON.parse(raw);

      return Array.isArray(parsed)
        ? parsed.filter((item): item is string => typeof item === "string")
        : [];
    } catch {
      return [];
    }
  }, [raw]);

  const write = useCallback(
    (next: string[]) => {
      try {
        window.localStorage.setItem(storageKey, JSON.stringify(next));
      } catch {
        // Private mode / disabled storage: fall back to in-memory updates.
      }

      emitChange();
    },
    [storageKey],
  );

  const toggle = useCallback(
    (chapterId: string) => {
      write(
        completed.includes(chapterId)
          ? completed.filter((id) => id !== chapterId)
          : [...completed, chapterId],
      );
    },
    [completed, write],
  );

  const reset = useCallback(() => write([]), [write]);

  return {
    completed,
    isComplete: (chapterId) => completed.includes(chapterId),
    toggle,
    reset,
  };
}
