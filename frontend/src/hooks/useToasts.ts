import { useCallback, useRef, useState } from "react";

export type ToastVariant = "info" | "success" | "error";

export interface ToastItem {
  id: number;
  message: string;
  variant: ToastVariant;
}

export function useToasts() {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const nextId = useRef(0);

  const removeToast = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  /** durationMs = null means persistent -- caller must removeToast() explicitly
   * (used for "Calling..." which lasts until the call resolves, not a fixed time). */
  const addToast = useCallback(
    (message: string, variant: ToastVariant = "info", durationMs: number | null = 3000) => {
      const id = nextId.current++;
      setToasts((prev) => [...prev, { id, message, variant }]);
      if (durationMs !== null) {
        window.setTimeout(() => removeToast(id), durationMs);
      }
      return id;
    },
    [removeToast]
  );

  return { toasts, addToast, removeToast };
}
