'use client'

import { createContext, useContext, useState, useCallback, useRef } from 'react'

export type ToastVariant = 'success' | 'error' | 'info' | 'warning'

interface ToastItem {
  id: string
  message: string
  variant: ToastVariant
}

interface ToastContextValue {
  success: (msg: string) => void
  error: (msg: string) => void
  info: (msg: string) => void
  warning: (msg: string) => void
}

const Ctx = createContext<ToastContextValue | null>(null)

const ICONS: Record<ToastVariant, string> = {
  success: '✓',
  error: '✕',
  info: 'i',
  warning: '!',
}

const STYLES: Record<ToastVariant, { border: string; icon: string; bg: string }> = {
  success: { border: '#59f5a9', icon: '#59f5a9', bg: 'rgba(89,245,169,0.07)' },
  error:   { border: '#ff4d6d', icon: '#ff4d6d', bg: 'rgba(255,77,109,0.07)' },
  info:    { border: '#5ad8ff', icon: '#5ad8ff', bg: 'rgba(90,216,255,0.07)' },
  warning: { border: '#ffd700', icon: '#ffd700', bg: 'rgba(255,215,0,0.07)' },
}

function Toaster({ toasts, onDismiss }: { toasts: ToastItem[]; onDismiss: (id: string) => void }) {
  return (
    <div className="fixed bottom-5 right-5 z-[9999] flex flex-col gap-2 pointer-events-none" aria-live="polite">
      {toasts.map((t) => {
        const s = STYLES[t.variant]
        return (
          <div
            key={t.id}
            className="pointer-events-auto flex items-start gap-3 px-4 py-3 rounded-xl border font-mono text-xs max-w-xs shadow-2xl"
            style={{ borderColor: s.border, background: `${s.bg} backdrop-filter blur(12px)`, backgroundColor: '#0c111a' }}
          >
            <span className="font-black text-sm flex-shrink-0 mt-0.5" style={{ color: s.icon }}>
              {ICONS[t.variant]}
            </span>
            <span className="text-[#a8b8cc] leading-snug flex-1">{t.message}</span>
            <button
              onClick={() => onDismiss(t.id)}
              className="flex-shrink-0 text-[#3a4a5a] hover:text-[#6b7a8d] transition-colors mt-0.5"
            >
              ×
            </button>
          </div>
        )
      })}
    </div>
  )
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([])
  const timers = useRef<Record<string, ReturnType<typeof setTimeout>>>({})

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
    clearTimeout(timers.current[id])
    delete timers.current[id]
  }, [])

  const add = useCallback((message: string, variant: ToastVariant, duration = 4000) => {
    const id = crypto.randomUUID()
    setToasts((prev) => [...prev.slice(-3), { id, message, variant }])
    timers.current[id] = setTimeout(() => dismiss(id), duration)
  }, [dismiss])

  const ctx: ToastContextValue = {
    success: (msg) => add(msg, 'success'),
    error:   (msg) => add(msg, 'error'),
    info:    (msg) => add(msg, 'info'),
    warning: (msg) => add(msg, 'warning'),
  }

  return (
    <Ctx.Provider value={ctx}>
      {children}
      <Toaster toasts={toasts} onDismiss={dismiss} />
    </Ctx.Provider>
  )
}

export function useToast(): ToastContextValue {
  const ctx = useContext(Ctx)
  if (!ctx) throw new Error('useToast must be used within ToastProvider')
  return ctx
}
