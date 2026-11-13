import { useCallback, useRef, useState } from "react";

export type ToastType = "success" | "error";

export interface ToastOptions {
  type?: ToastType;
  actionLabel?: string;
  onAction?: () => void;
  duration?: number;
}

export interface ToastItem {
  id: number;
  message: string;
  type: ToastType;
  actionLabel?: string;
  onAction?: () => void;
  duration: number;
}

export function useToasts() {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const nextId = useRef(1);

  const dismissToast = useCallback((id: number) => {
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }, []);

  const pushToast = useCallback((message: string, options: ToastOptions = {}) => {
    const toast: ToastItem = {
      id: nextId.current,
      message,
      type: options.type ?? "success",
      actionLabel: options.actionLabel,
      onAction: options.onAction,
      duration: options.duration ?? 4000,
    };
    nextId.current += 1;

    setToasts((current) => [...current.slice(-2), toast]);
    return toast.id;
  }, []);

  return { toasts, pushToast, dismissToast };
}
