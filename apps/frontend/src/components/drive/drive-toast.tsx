import { useEffect } from 'react';
import { useDriveStore } from '@/stores/drive';

const variantClasses: Record<string, string> = {
  success: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  error: 'border-rose-200 bg-rose-50 text-rose-700',
  info: 'border-sky-200 bg-sky-50 text-sky-700',
};

export function DriveToastStack() {
  const toasts = useDriveStore((state) => state.toasts);
  const dismissToast = useDriveStore((state) => state.dismissToast);

  useEffect(() => {
    if (toasts.length === 0) return;

    const timers = toasts.map((toast) =>
      setTimeout(() => {
        dismissToast(toast.id);
      }, 3500)
    );

    return () => {
      timers.forEach((timer) => clearTimeout(timer));
    };
  }, [toasts, dismissToast]);

  if (!toasts.length) return null;

  return (
    <div className="pointer-events-none fixed right-4 top-4 z-50 space-y-2">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`pointer-events-auto min-w-[240px] rounded-lg border px-3 py-2 text-sm shadow-sm ${variantClasses[toast.variant]}`}
        >
          {toast.text}
        </div>
      ))}
    </div>
  );
}
