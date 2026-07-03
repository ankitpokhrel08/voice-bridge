import { useToastContext } from "../../context/ToastProvider";
import { Toast } from "./Toast";
import styles from "./ToastStack.module.css";

export function ToastStack() {
  const { toasts } = useToastContext();
  if (toasts.length === 0) return null;

  return (
    <div className={styles.stack} aria-live="polite">
      {toasts.map((toast) => (
        <Toast key={toast.id} toast={toast} />
      ))}
    </div>
  );
}
