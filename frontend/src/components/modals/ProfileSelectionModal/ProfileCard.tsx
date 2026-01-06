'use client'

import { Loader2 } from 'lucide-react'
import clsx from 'clsx'
import type { ProfileCardProps } from './types'

/**
 * Individual profile card with artistic gradient blob background
 * Uses CSS radial-gradients to create organic, fluid shapes
 */
export function ProfileCard({
  profile,
  onSelect,
  isLoading = false,
  isSelected = false,
  disabled = false,
}: ProfileCardProps) {
  const Icon = profile.icon
  const isThisCardLoading = isLoading && isSelected

  return (
    <button
      type="button"
      onClick={() => onSelect(profile.id)}
      disabled={disabled || isLoading}
      className={clsx(
        // Base card styling
        'relative overflow-hidden',
        'w-full aspect-[4/3]',
        'rounded-2xl',
        'border border-white/[0.08]',
        'bg-black/40',
        'text-left',
        'transition-all duration-300 ease-out',
        // Hover state
        !disabled && !isLoading && [
          'hover:border-white/[0.15]',
          'hover:scale-[1.02]',
          'hover:shadow-xl hover:shadow-black/20',
        ],
        // Selected/loading state
        isSelected && 'ring-2 ring-white/30',
        // Disabled state
        (disabled || isLoading) && 'cursor-not-allowed opacity-60'
      )}
    >
      {/* Gradient blob backgrounds - creates organic artistic shapes */}
      <div
        className="absolute inset-0 opacity-50"
        style={{
          background: `
            radial-gradient(ellipse 90% 70% at 25% 35%, ${profile.gradient.from}40 0%, transparent 55%),
            radial-gradient(ellipse 70% 90% at 75% 65%, ${profile.gradient.to}40 0%, transparent 50%)
          `,
        }}
      />

      {/* Secondary organic blob for depth */}
      <div
        className="absolute inset-0 opacity-30"
        style={{
          background: `
            radial-gradient(ellipse 50% 60% at 60% 30%, ${profile.gradient.via || profile.gradient.from}30 0%, transparent 60%),
            radial-gradient(ellipse 60% 50% at 35% 70%, ${profile.gradient.to}25 0%, transparent 55%)
          `,
        }}
      />

      {/* Floating blob accent */}
      <div
        className="absolute -top-8 -right-8 w-32 h-32 opacity-40 blur-sm"
        style={{
          background: `linear-gradient(135deg, ${profile.gradient.from}, ${profile.gradient.to})`,
          borderRadius: '30% 70% 70% 30% / 30% 30% 70% 70%',
        }}
      />

      {/* Content */}
      <div className="relative z-10 flex flex-col h-full p-5">
        {/* Top section with icon */}
        <div className="flex-1">
          <div
            className="inline-flex items-center justify-center w-10 h-10 rounded-xl mb-3"
            style={{
              background: `linear-gradient(135deg, ${profile.gradient.from}40, ${profile.gradient.to}40)`,
            }}
          >
            {isThisCardLoading ? (
              <Loader2 className="h-5 w-5 text-white animate-spin" />
            ) : (
              <Icon className="h-5 w-5 text-white" />
            )}
          </div>

          <h3 className="text-lg font-semibold text-white mb-1">
            {profile.name}
          </h3>
          <p className="text-sm text-slate-400 leading-relaxed">
            {profile.tagline}
          </p>
        </div>

        {/* Bottom section with person count */}
        <div className="flex items-center justify-between">
          <span className="text-xs text-slate-500">
            {profile.persons.length === 0
              ? 'Empty profile'
              : profile.persons.length === 1
                ? '1 person'
                : `${profile.persons.length} people`}
          </span>

          {/* Visual indicator dots for people */}
          {profile.persons.length > 0 && (
            <div className="flex items-center gap-1">
              {profile.persons.map((person, index) => (
                <div
                  key={index}
                  className="w-2 h-2 rounded-full"
                  style={{ backgroundColor: person.displayColor }}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Selection highlight overlay */}
      {isSelected && (
        <div className="absolute inset-0 bg-white/5 pointer-events-none" />
      )}
    </button>
  )
}
