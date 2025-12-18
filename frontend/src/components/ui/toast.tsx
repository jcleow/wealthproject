'use client'

import { useEffect } from 'react'
import { X, CheckCircle2, AlertTriangle, Info } from 'lucide-react'
import { ChatNotification } from '@/types/chat'
import { cn } from '@/lib/utils'

interface ToastViewportProps {
  toasts: ChatNotification[]
  onDismiss: (id: string) => void
}

const toneMap: Record<ChatNotification['type'], { icon: React.ReactNode; classes: string }> = {
  success: {
    icon: <CheckCircle2 className="h-4 w-4 text-emerald-300" />,
    classes: 'border-emerald-500/30 bg-emerald-500/10',
  },
  error: {
    icon: <AlertTriangle className="h-4 w-4 text-rose-300" />,
    classes: 'border-rose-500/30 bg-rose-500/10',
  },
  info: {
    icon: <Info className="h-4 w-4 text-blue-200" />,
    classes: 'border-blue-500/30 bg-blue-500/10',
  },
}

export function ToastViewport({ toasts, onDismiss }: ToastViewportProps) {
  useEffect(() => {
    const timers = toasts.map((toast) =>
      window.setTimeout(() => onDismiss(toast.id), 4200)
    )
    return () => timers.forEach(clearTimeout)
  }, [toasts, onDismiss])

  if (toasts.length === 0) return null

  return (
    <div className={`fixed bottom-6 right-6 z-50
flex flex-col
w-full max-w-sm
pointer-events-none gap-3`}>
      {toasts.map((toast) => {
        const tone = toneMap[toast.type]

        return (
          <div
            key={toast.id}
            className={cn(
              `pointer-events-auto px-4 py-3
rounded-2xl border
shadow-xl shadow-black/40 backdrop-blur`,
              tone.classes
            )}
          >
            <div className="flex items-start gap-3">
              <div className="mt-0.5">{tone.icon}</div>
              <div className="flex-1">
                <p className="text-sm font-semibold text-white">{toast.title}</p>
                {toast.description && (
                  <p className="mt-1 text-xs text-gray-200">{toast.description}</p>
                )}
              </div>
              <button
                className="text-gray-300 transition hover:text-white"
                onClick={() => onDismiss(toast.id)}
                type="button"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>
        )
      })}
    </div>
  )
}
