import { Check, CircleAlert } from "lucide-react";
import { useEffect } from "react";
import type { ToastItem } from "../hooks/useToasts";

function Toast({
  toast,
  onDismiss,
}: {
  toast: ToastItem;
  onDismiss: (id: number) => void;
}) {
  useEffect(() => {
    const timer = window.setTimeout(() => onDismiss(toast.id), toast.duration);
    return () => window.clearTimeout(timer);
  }, [onDismiss, toast.duration, toast.id]);

  return (
    <div
      className={`toast${toast.type === "error" ? " toast-error" : ""}`}
      role={toast.type === "error" ? "alert" : "status"}
    >
      <span className="toast-icon" aria-hidden="true">
        {toast.type === "error" ? <CircleAlert /> : <Check />}
      </span>
      <span className="toast-message">{toast.message}</span>
      {toast.actionLabel && toast.onAction ? (
        <button
          className="toast-action"
          type="button"
          onClick={() => {
            onDismiss(toast.id);
            toast.onAction?.();
          }}
        >
          {toast.actionLabel}
        </button>
      ) : null}
    </div>
  );
}

export function Toasts({
  toasts,
  onDismiss,
}: {
  toasts: ToastItem[];
  onDismiss: (id: number) => void;
}) {
  return (
    <div className="toast-region" aria-live="polite" aria-atomic="false">
      {toasts.map((toast) => (
        <Toast key={toast.id} toast={toast} onDismiss={onDismiss} />
      ))}
    </div>
  );
}
