import type { ToastItem } from "../../hooks/useToasts";
import styles from "./Toast.module.css";

interface ToastProps {
  toast: ToastItem;
}

export function Toast({ toast }: ToastProps) {
  return (
    <div className={styles.toast} data-variant={toast.variant} role="status">
      {toast.message}
    </div>
  );
}
