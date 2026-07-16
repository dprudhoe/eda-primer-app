import { useCallback, useRef, useState } from "react";

export type Pt = { x: number; y: number };

export type Flyer = {
  id: number;
  from: Pt;
  to: Pt;
  tone: "green" | "amber" | "red" | "violet";
  label: string;
  duration?: number;
  dropAtEnd?: boolean;
  meta?: Record<string, unknown>;
};

/**
 * Manages a set of in-flight particles. `emit` adds one; the component
 * renders them (with AnimatePresence) and calls `remove` when each finishes.
 */
export function useFlow() {
  const [flyers, setFlyers] = useState<Flyer[]>([]);
  const idRef = useRef(1);

  const emit = useCallback((f: Omit<Flyer, "id">) => {
    const id = idRef.current++;
    setFlyers((cur) => [...cur, { ...f, id }]);
    return id;
  }, []);

  const remove = useCallback((id: number) => {
    setFlyers((cur) => cur.filter((f) => f.id !== id));
  }, []);

  const clear = useCallback(() => setFlyers([]), []);

  return { flyers, emit, remove, clear };
}
