'use client'

import { useState, useRef, useEffect } from 'react'
import { ClipboardList, ChevronUp } from 'lucide-react'
import { FINANCIAL_PROFILES } from '../../ProfileSelectionModal/profileConfigs'

// Profile display metadata (emoji icons for the popover list)
const PROFILE_EMOJIS: Record<string, string> = {
  'single-early-career': '🎓',
  'dink': '💑',
  'dink-kids-planned': '👶',
  'single-income-family': '🏠',
  'fire-focused': '🔥',
}

interface LoadSampleDataButtonProps {
  onLoadProfile: (profileId: string) => void
  isMonet: boolean
}

export function LoadSampleDataButton({ onLoadProfile, isMonet }: LoadSampleDataButtonProps) {
  const [isOpen, setIsOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  // Close popover on outside click
  useEffect(() => {
    if (!isOpen) return
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [isOpen])

  // Close on escape
  useEffect(() => {
    if (!isOpen) return
    function handleEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') setIsOpen(false)
    }
    document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }, [isOpen])

  const selectableProfiles = FINANCIAL_PROFILES.filter((p) => p.id !== 'blank-slate')

  return (
    <div ref={containerRef} className="relative">
      {/* Trigger button */}
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className={`flex items-center gap-1.5 text-xs font-medium transition-colors ${
          isMonet
            ? 'text-[var(--monet-text-muted)] hover:text-[var(--monet-text-secondary)]'
            : 'text-slate-600 hover:text-slate-400'
        }`}
      >
        <ClipboardList className="h-3.5 w-3.5" />
        Load Sample
        <ChevronUp
          className={`h-3 w-3 transition-transform duration-150 ${isOpen ? '' : 'rotate-180'}`}
        />
      </button>

      {/* Popover — opens upward */}
      {isOpen && (
        <div
          className={`absolute bottom-full left-0 mb-2 w-56 max-h-80 overflow-y-auto rounded-xl border p-1.5 z-50 ${
            isMonet
              ? 'bg-white border-[var(--monet-lavender)]/20 shadow-lg shadow-black/10'
              : 'bg-[rgba(10,10,10,0.95)] border-white/[0.08] shadow-xl backdrop-blur-xl'
          }`}
        >
          {selectableProfiles.map((profile) => (
            <button
              key={profile.id}
              type="button"
              onClick={() => {
                onLoadProfile(profile.id)
                setIsOpen(false)
              }}
              className={`w-full flex items-start gap-2.5 px-2.5 py-2 rounded-lg text-left transition-all duration-150 ${
                isMonet
                  ? 'hover:bg-[var(--monet-lavender)]/10'
                  : 'hover:bg-white/[0.06]'
              }`}
            >
              <span className="text-base leading-none mt-0.5">
                {PROFILE_EMOJIS[profile.id] ?? '📋'}
              </span>
              <div className="min-w-0 flex-1">
                <div className={`text-xs font-medium ${
                  isMonet ? 'text-[var(--monet-text-primary)]' : 'text-slate-200'
                }`}>
                  {profile.name}
                </div>
                <div className={`text-[11px] leading-tight mt-0.5 ${
                  isMonet ? 'text-[var(--monet-text-muted)]' : 'text-slate-500'
                }`}>
                  {profile.tagline}
                </div>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
