import { ref, computed } from "vue";
import { nanoid } from "nanoid";

export interface ToastOptions {
  type?: "success" | "error" | "info" | "warning";
  title?: string;
  message: string;
  duration?: number;
  closable?: boolean;
}

export interface Toast extends Required<ToastOptions> {
  id: string;
}

// Create a reactive state that persists outside the component
const toasts = ref<Toast[]>([]);

export default function useToast() {
  // Add a new toast
  const addToast = (options: ToastOptions): string => {
    const id = nanoid();
    const toast: Toast = {
      id,
      type: options.type || "info",
      title: options.title || "",
      message: options.message,
      duration: options.duration !== undefined ? options.duration : 5000,
      closable: options.closable !== undefined ? options.closable : true,
    };

    toasts.value.push(toast);
    return id;
  };

  // Convenience methods for different toast types
  const success = (
    message: string,
    options?: Omit<ToastOptions, "type" | "message">
  ): string => {
    return addToast({ type: "success", message, ...options });
  };

  const error = (
    message: string,
    options?: Omit<ToastOptions, "type" | "message">
  ): string => {
    return addToast({ type: "error", message, ...options });
  };

  const info = (
    message: string,
    options?: Omit<ToastOptions, "type" | "message">
  ): string => {
    return addToast({ type: "info", message, ...options });
  };

  const warning = (
    message: string,
    options?: Omit<ToastOptions, "type" | "message">
  ): string => {
    return addToast({ type: "warning", message, ...options });
  };

  // Remove a toast by id
  const removeToast = (id: string): void => {
    const index = toasts.value.findIndex((toast) => toast.id === id);
    if (index !== -1) {
      toasts.value.splice(index, 1);
    }
  };

  // Clear all toasts
  const clearToasts = (): void => {
    toasts.value = [];
  };

  return {
    // State
    toasts: computed(() => toasts.value),

    // Methods
    addToast,
    success,
    error,
    info,
    warning,
    removeToast,
    clearToasts,
  };
}
