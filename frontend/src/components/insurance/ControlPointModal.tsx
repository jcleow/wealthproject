'use client'

import { useState, useEffect, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { X, Shield, Heart, Zap } from 'lucide-react'
import { formatCoverageAmount } from '@/lib/coverage-journey-utils'
import type { CoverageControlPoint } from '@/types/insurance'

// =============================================================================
// Types
// =============================================================================

interface ControlPointModalProps {
  isOpen: boolean
  onClose: () => void
  onSave: (data: {
    age: number
    lifeTpd: number | null
    criticalIllness: number | null
    personalAccident: number | null
    reason?: string
  }) => void
  editingPoint?: CoverageControlPoint | null
  recommendedValues?: {
    lifeTpd: number
    criticalIllness: number
    personalAccident: number
  }
  minAge?: number
  maxAge?: number
  existingAges?: number[]
}

// Monet colors
const monetColors = {
  lavender: '#9B8BB4',
  lavenderLight: '#C4B8D9',
  lavenderDark: '#7A6B94',
  coralRose: '#E8A898',
  sage: '#7FB285',
  sunlightGold: '#D4C5A9',
  textPrimary: '#3D3D3D',
  textSecondary: '#6B6B6B',
  textMuted: '#9B9B9B',
  bgCream: '#FAF8F5',
  shadowSoft: 'rgba(155, 139, 180, 0.12)',
  shadowMedium: 'rgba(155, 139, 180, 0.18)',
}

// =============================================================================
// Component
// =============================================================================

export function ControlPointModal({
  isOpen,
  onClose,
  onSave,
  editingPoint,
  recommendedValues = { lifeTpd: 600000, criticalIllness: 200000, personalAccident: 150000 },
  minAge = 25,
  maxAge = 75,
  existingAges = [],
}: ControlPointModalProps) {
  // Form state
  const [age, setAge] = useState(35)
  const [lifeTpdEnabled, setLifeTpdEnabled] = useState(false)
  const [lifeTpdValue, setLifeTpdValue] = useState('')
  const [criticalIllnessEnabled, setCriticalIllnessEnabled] = useState(false)
  const [criticalIllnessValue, setCriticalIllnessValue] = useState('')
  const [personalAccidentEnabled, setPersonalAccidentEnabled] = useState(false)
  const [personalAccidentValue, setPersonalAccidentValue] = useState('')
  const [reason, setReason] = useState('')

  // Age validation
  const isEditMode = !!editingPoint
  const ageAlreadyExists =
    !isEditMode && existingAges.includes(age)

  // Initialize form when editing
  useEffect(() => {
    if (editingPoint) {
      setAge(editingPoint.age)
      setLifeTpdEnabled(editingPoint.lifeTpd !== null)
      setLifeTpdValue(editingPoint.lifeTpd?.toString() ?? '')
      setCriticalIllnessEnabled(editingPoint.criticalIllness !== null)
      setCriticalIllnessValue(editingPoint.criticalIllness?.toString() ?? '')
      setPersonalAccidentEnabled(editingPoint.personalAccident !== null)
      setPersonalAccidentValue(editingPoint.personalAccident?.toString() ?? '')
      setReason(editingPoint.reason ?? '')
    } else {
      // Reset form for new point
      setAge(35)
      setLifeTpdEnabled(false)
      setLifeTpdValue('')
      setCriticalIllnessEnabled(false)
      setCriticalIllnessValue('')
      setPersonalAccidentEnabled(false)
      setPersonalAccidentValue('')
      setReason('')
    }
  }, [editingPoint, isOpen])

  // Handle save
  const handleSave = useCallback(() => {
    if (ageAlreadyExists) return

    onSave({
      age,
      lifeTpd: lifeTpdEnabled ? parseInt(lifeTpdValue, 10) || null : null,
      criticalIllness: criticalIllnessEnabled
        ? parseInt(criticalIllnessValue, 10) || null
        : null,
      personalAccident: personalAccidentEnabled
        ? parseInt(personalAccidentValue, 10) || null
        : null,
      reason: reason.trim() || undefined,
    })
    onClose()
  }, [
    age,
    ageAlreadyExists,
    lifeTpdEnabled,
    lifeTpdValue,
    criticalIllnessEnabled,
    criticalIllnessValue,
    personalAccidentEnabled,
    personalAccidentValue,
    reason,
    onSave,
    onClose,
  ])

  // Handle escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    if (isOpen) {
      document.addEventListener('keydown', handleEscape)
      document.body.style.overflow = 'hidden'
    }
    return () => {
      document.removeEventListener('keydown', handleEscape)
      document.body.style.overflow = ''
    }
  }, [isOpen, onClose])

  if (!isOpen) return null

  const modalContent = (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" />

      {/* Modal */}
      <div
        className="relative w-full max-w-md rounded-2xl shadow-2xl overflow-hidden"
        style={{
          background: monetColors.bgCream,
          boxShadow: `0 25px 50px -12px ${monetColors.shadowMedium}`,
        }}
      >
        {/* Header */}
        <div
          className="px-5 py-4 flex items-center justify-between"
          style={{
            background: `linear-gradient(to bottom, rgba(255,255,255,0.9), rgba(255,255,255,0.6))`,
            borderBottom: `1px solid rgba(155, 139, 180, 0.12)`,
          }}
        >
          <h2
            className="text-lg font-semibold"
            style={{
              color: monetColors.textPrimary,
              fontFamily: "'Cormorant Garamond', Georgia, serif",
            }}
          >
            {isEditMode ? 'Edit Control Point' : 'Add Control Point'}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg transition-colors duration-200 hover:bg-white/60"
            style={{ color: monetColors.textMuted }}
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Body */}
        <div className="px-5 py-4 space-y-5">
          {/* Age Input */}
          <div>
            <label
              className="block text-sm font-medium mb-2"
              style={{ color: monetColors.textPrimary }}
            >
              Age
            </label>
            <div className="flex items-center gap-3">
              <input
                type="range"
                min={minAge}
                max={maxAge}
                value={age}
                onChange={(e) => setAge(parseInt(e.target.value, 10))}
                disabled={isEditMode}
                className="flex-1 h-2 rounded-full appearance-none cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                style={{
                  background: `linear-gradient(to right, ${monetColors.lavender} 0%, ${monetColors.lavender} ${((age - minAge) / (maxAge - minAge)) * 100}%, rgba(155, 139, 180, 0.2) ${((age - minAge) / (maxAge - minAge)) * 100}%, rgba(155, 139, 180, 0.2) 100%)`,
                }}
              />
              <span
                className="w-14 text-center px-2 py-1 rounded-lg text-sm font-medium"
                style={{
                  background: `${monetColors.lavender}15`,
                  color: monetColors.lavenderDark,
                }}
              >
                {age}
              </span>
            </div>
            {ageAlreadyExists && (
              <p className="text-xs mt-1.5" style={{ color: monetColors.coralRose }}>
                A control point already exists at this age
              </p>
            )}
          </div>

          {/* Coverage Targets */}
          <div>
            <label
              className="block text-sm font-medium mb-3"
              style={{ color: monetColors.textPrimary }}
            >
              Coverage Targets
            </label>
            <div className="space-y-3">
              {/* Life/TPD */}
              <CoverageInput
                icon={<Shield className="h-4 w-4" />}
                iconColor={monetColors.sage}
                label="Life / TPD"
                enabled={lifeTpdEnabled}
                onEnabledChange={setLifeTpdEnabled}
                value={lifeTpdValue}
                onValueChange={setLifeTpdValue}
                recommendedValue={recommendedValues.lifeTpd}
              />

              {/* Critical Illness */}
              <CoverageInput
                icon={<Heart className="h-4 w-4" />}
                iconColor="#3B82F6"
                label="Critical Illness"
                enabled={criticalIllnessEnabled}
                onEnabledChange={setCriticalIllnessEnabled}
                value={criticalIllnessValue}
                onValueChange={setCriticalIllnessValue}
                recommendedValue={recommendedValues.criticalIllness}
              />

              {/* Personal Accident */}
              <CoverageInput
                icon={<Zap className="h-4 w-4" />}
                iconColor="#A855F7"
                label="Personal Accident"
                enabled={personalAccidentEnabled}
                onEnabledChange={setPersonalAccidentEnabled}
                value={personalAccidentValue}
                onValueChange={setPersonalAccidentValue}
                recommendedValue={recommendedValues.personalAccident}
              />
            </div>
          </div>

          {/* Reason */}
          <div>
            <label
              className="block text-sm font-medium mb-2"
              style={{ color: monetColors.textPrimary }}
            >
              Reason <span style={{ color: monetColors.textMuted }}>(optional)</span>
            </label>
            <input
              type="text"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g., Kids become independent"
              className="w-full px-3 py-2 rounded-xl text-sm transition-all duration-200 outline-none"
              style={{
                background: 'rgba(255, 255, 255, 0.8)',
                border: '1px solid rgba(155, 139, 180, 0.2)',
                color: monetColors.textPrimary,
              }}
            />
          </div>
        </div>

        {/* Footer */}
        <div
          className="px-5 py-4 flex items-center justify-end gap-3"
          style={{
            background: 'rgba(155, 139, 180, 0.05)',
            borderTop: '1px solid rgba(155, 139, 180, 0.12)',
          }}
        >
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200 hover:bg-white/80"
            style={{ color: monetColors.textSecondary }}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={ageAlreadyExists}
            className="px-4 py-2 rounded-xl text-sm font-medium text-white transition-all duration-200 hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
            style={{
              background: `linear-gradient(135deg, ${monetColors.lavender}, ${monetColors.lavenderDark})`,
              boxShadow: `0 2px 8px ${monetColors.shadowSoft}`,
            }}
          >
            {isEditMode ? 'Save Changes' : 'Add Control Point'}
          </button>
        </div>
      </div>
    </div>
  )

  // Use portal to render at document root
  if (typeof document === 'undefined') return null
  return createPortal(modalContent, document.body)
}

// =============================================================================
// Sub-component
// =============================================================================

function CoverageInput({
  icon,
  iconColor,
  label,
  enabled,
  onEnabledChange,
  value,
  onValueChange,
  recommendedValue,
}: {
  icon: React.ReactNode
  iconColor: string
  label: string
  enabled: boolean
  onEnabledChange: (enabled: boolean) => void
  value: string
  onValueChange: (value: string) => void
  recommendedValue: number
}) {
  return (
    <div
      className="px-3 py-2.5 rounded-xl transition-all duration-200"
      style={{
        background: enabled ? 'rgba(255, 255, 255, 0.9)' : 'rgba(255, 255, 255, 0.5)',
        border: `1px solid ${enabled ? 'rgba(155, 139, 180, 0.2)' : 'rgba(155, 139, 180, 0.1)'}`,
      }}
    >
      <div className="flex items-center gap-3">
        {/* Toggle */}
        <button
          type="button"
          onClick={() => onEnabledChange(!enabled)}
          className="relative w-9 h-5 rounded-full transition-colors duration-200 shrink-0"
          style={{
            background: enabled ? monetColors.lavender : 'rgba(155, 139, 180, 0.2)',
          }}
        >
          <div
            className="absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform duration-200"
            style={{
              transform: enabled ? 'translateX(18px)' : 'translateX(2px)',
            }}
          />
        </button>

        {/* Icon & Label */}
        <div className="flex items-center gap-2 min-w-0">
          <span style={{ color: iconColor }}>{icon}</span>
          <span
            className="text-sm font-medium"
            style={{ color: enabled ? monetColors.textPrimary : monetColors.textMuted }}
          >
            {label}
          </span>
        </div>

        {/* Value Input or Recommended Badge */}
        <div className="ml-auto">
          {enabled ? (
            <div className="flex items-center gap-2">
              <span className="text-xs" style={{ color: monetColors.textMuted }}>
                $
              </span>
              <input
                type="number"
                value={value}
                onChange={(e) => onValueChange(e.target.value)}
                placeholder={Math.round(recommendedValue / 1000).toString() + 'K'}
                className="w-24 px-2 py-1 rounded-lg text-sm text-right outline-none"
                style={{
                  background: 'rgba(155, 139, 180, 0.08)',
                  color: monetColors.textPrimary,
                }}
              />
            </div>
          ) : (
            <span className="text-xs px-2 py-0.5 rounded" style={{ color: monetColors.textMuted }}>
              {formatCoverageAmount(recommendedValue)} (auto)
            </span>
          )}
        </div>
      </div>
    </div>
  )
}
