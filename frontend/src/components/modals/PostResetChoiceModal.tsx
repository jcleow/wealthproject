import { useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { LayoutDashboard, Sparkles } from 'lucide-react'
import { cn } from '@/lib/utils'

interface PostResetChoiceModalProps {
  isOpen: boolean
  onDashboard: () => void
  onWizard: () => void
}

export function PostResetChoiceModal({ isOpen, onDashboard, onWizard }: PostResetChoiceModalProps) {
  const overlayRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!isOpen) return
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onDashboard()
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onDashboard])

  if (typeof window === 'undefined') return null

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <motion.div
          ref={overlayRef}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
          onClick={(e) => { if (e.target === overlayRef.current) onDashboard() }}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className="w-full max-w-md mx-4"
          >
            <div className="rounded-2xl border border-white/[0.08] bg-[#0a0f1a] p-6 shadow-2xl">
              <h2 className="text-lg font-semibold text-white text-center mb-1">
                Fresh start — what's next?
              </h2>
              <p className="text-sm text-slate-400 text-center mb-6">
                Your data has been cleared. How would you like to proceed?
              </p>

              <div className="grid grid-cols-2 gap-3">
                {/* Dashboard option */}
                <button
                  type="button"
                  onClick={onDashboard}
                  className={cn(
                    'group flex flex-col items-center gap-3 rounded-xl border p-5 transition-all',
                    'border-white/[0.06] bg-white/[0.02] hover:border-white/[0.12] hover:bg-white/[0.04]'
                  )}
                >
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-500/15">
                    <LayoutDashboard className="h-5 w-5 text-slate-400 group-hover:text-slate-300 transition-colors" />
                  </div>
                  <div className="text-center">
                    <p className="text-sm font-medium text-white">Dashboard</p>
                    <p className="text-xs text-slate-500 mt-0.5">Jump right in and add data manually</p>
                  </div>
                </button>

                {/* Wizard option */}
                <button
                  type="button"
                  onClick={onWizard}
                  className={cn(
                    'group flex flex-col items-center gap-3 rounded-xl border p-5 transition-all',
                    'border-emerald-500/20 bg-emerald-500/5 hover:border-emerald-500/30 hover:bg-emerald-500/10'
                  )}
                >
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-500/15">
                    <Sparkles className="h-5 w-5 text-emerald-400 group-hover:text-emerald-300 transition-colors" />
                  </div>
                  <div className="text-center">
                    <p className="text-sm font-medium text-white">Quick Setup</p>
                    <p className="text-xs text-slate-500 mt-0.5">Guided wizard to get started fast</p>
                  </div>
                </button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  )
}
