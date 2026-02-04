'use client'

import { cn } from '@/lib/utils'

// ============================================================================
// MONET-INSPIRED COLORS FOR COVERAGE LAYERS
// Soft, painterly palette reflecting impressionist aesthetics
// ============================================================================

const monetLayerColors = {
  // Coral Rose - for MediShield Life (government foundation)
  coral: '#E8A898',
  coralLight: '#F5D4CC',

  // Lavender Blue - for ISP Coverage (private enhancement)
  lavender: '#9B8BB4',
  lavenderLight: '#C4B8D9',

  // Sage - for Rider (additional protection)
  sage: '#7FB285',
  sageLight: '#B5D4B8',

  // Sunlight Gold - for Out-of-pocket (your contribution)
  gold: '#D4C5A9',
  goldLight: '#EDE6D8',

  // Text
  textPrimary: '#3D3D3D',
  textSecondary: '#6B6B6B',
  textMuted: '#9B9B9B',

  // Card
  cardBorder: 'rgba(155, 139, 180, 0.15)',
}

interface CoverageLayerOption {
  id: 'mshl_only' | 'mshl_isp' | 'mshl_isp_rider'
  title: string
  description: string
  layers: {
    label: string
    sublabel?: string
    color: 'coral' | 'lavender' | 'sage' | 'gold'
    heightClass: string
  }[]
}

const coverageOptions: CoverageLayerOption[] = [
  {
    id: 'mshl_only',
    title: 'MediShield Life Only',
    description: 'Basic coverage for B2/C wards',
    layers: [
      {
        label: 'Out-of-pocket payment',
        color: 'gold',
        heightClass: 'h-32',
      },
      {
        label: 'Paid by MediShield Life (MSHL)',
        color: 'coral',
        heightClass: 'h-20',
      },
    ],
  },
  {
    id: 'mshl_isp',
    title: 'MediShield Life + ISP',
    description: 'Higher ward class coverage',
    layers: [
      {
        label: 'Out-of-pocket payment',
        sublabel: 'Deductible + Co-payment at 10%',
        color: 'gold',
        heightClass: 'h-20',
      },
      {
        label: 'Integrated Shield Plan (IP) pays',
        color: 'lavender',
        heightClass: 'h-16',
      },
      {
        label: 'Paid by MediShield Life (MSHL)',
        color: 'coral',
        heightClass: 'h-16',
      },
    ],
  },
  {
    id: 'mshl_isp_rider',
    title: 'MediShield Life + ISP + Rider',
    description: 'Maximum coverage',
    layers: [
      {
        label: 'Out-of-pocket payment',
        sublabel: 'Smaller deductible + Co-payment 5-10%',
        color: 'gold',
        heightClass: 'h-12',
      },
      {
        label: 'Integrated Shield Plan Rider pays',
        color: 'sage',
        heightClass: 'h-12',
      },
      {
        label: 'Integrated Shield Plan (IP) pays',
        color: 'lavender',
        heightClass: 'h-14',
      },
      {
        label: 'Paid by MediShield Life (MSHL)',
        color: 'coral',
        heightClass: 'h-14',
      },
    ],
  },
]

// Monet-inspired color styles for each layer type
const getLayerStyle = (color: string): React.CSSProperties => {
  switch (color) {
    case 'coral':
      return {
        background: `linear-gradient(135deg, ${monetLayerColors.coral}, ${monetLayerColors.coralLight})`,
        color: '#fff',
      }
    case 'lavender':
      return {
        background: `linear-gradient(135deg, ${monetLayerColors.lavender}, ${monetLayerColors.lavenderLight})`,
        color: '#fff',
      }
    case 'sage':
      return {
        background: `linear-gradient(135deg, ${monetLayerColors.sage}, ${monetLayerColors.sageLight})`,
        color: '#fff',
      }
    case 'gold':
      return {
        background: `linear-gradient(135deg, ${monetLayerColors.gold}, ${monetLayerColors.goldLight})`,
        color: monetLayerColors.textPrimary,
      }
    default:
      return {}
  }
}

interface CoverageLayersProps {
  selectedOption?: 'mshl_only' | 'mshl_isp' | 'mshl_isp_rider'
  onSelect?: (option: 'mshl_only' | 'mshl_isp' | 'mshl_isp_rider') => void
  compact?: boolean
}

export function CoverageLayers({ selectedOption, onSelect, compact = false }: CoverageLayersProps) {
  return (
    <div className={cn('w-full', compact ? 'space-y-4' : 'space-y-6')}>
      {/* Title - Impressionist style */}
      <div className="text-center">
        <h3
          className={cn('font-semibold', compact ? 'text-sm' : 'text-base')}
          style={{
            color: monetLayerColors.textPrimary,
            fontFamily: "'Cormorant Garamond', Georgia, serif",
          }}
        >
          Layers of Protection
        </h3>
        <p
          className="text-xs mt-1"
          style={{ color: monetLayerColors.textMuted }}
        >
          Source: Health Insured SG
        </p>
      </div>

      {/* Coverage options grid */}
      <div className={cn('grid gap-4', compact ? 'grid-cols-3' : 'grid-cols-1 sm:grid-cols-3')}>
        {coverageOptions.map((option) => {
          const isSelected = selectedOption === option.id

          return (
            <button
              key={option.id}
              type="button"
              onClick={() => onSelect?.(option.id)}
              className={cn(
                'rounded-2xl p-4 text-left transition-all duration-300',
                onSelect && 'cursor-pointer hover:scale-[1.02]',
                !onSelect && 'cursor-default'
              )}
              style={{
                background: isSelected
                  ? `linear-gradient(135deg, ${monetLayerColors.sageLight}40, rgba(255,255,255,0.8))`
                  : 'rgba(255, 255, 255, 0.6)',
                border: `1px solid ${isSelected ? monetLayerColors.sage : monetLayerColors.cardBorder}`,
                boxShadow: isSelected
                  ? `0 8px 24px rgba(127, 178, 133, 0.2)`
                  : `0 4px 12px rgba(155, 139, 180, 0.08)`,
              }}
            >
              {/* Option title */}
              <div className="mb-3">
                <p
                  className={cn('font-medium', compact ? 'text-xs' : 'text-sm')}
                  style={{
                    color: monetLayerColors.textPrimary,
                    fontFamily: "'DM Sans', system-ui, sans-serif",
                  }}
                >
                  {option.title}
                </p>
                {!compact && (
                  <p
                    className="text-xs mt-0.5"
                    style={{ color: monetLayerColors.textSecondary }}
                  >
                    {option.description}
                  </p>
                )}
              </div>

              {/* Stacked layers visualization - soft, organic */}
              <div className="flex flex-col-reverse rounded-xl overflow-hidden shadow-sm">
                {option.layers.map((layer, idx) => (
                  <div
                    key={idx}
                    className={cn(
                      'flex flex-col items-center justify-center text-center px-2',
                      compact ? 'py-2.5' : layer.heightClass
                    )}
                    style={getLayerStyle(layer.color)}
                  >
                    <span
                      className={cn('font-medium leading-tight', compact ? 'text-[9px]' : 'text-xs')}
                      style={{ textShadow: layer.color !== 'gold' ? '0 1px 2px rgba(0,0,0,0.1)' : 'none' }}
                    >
                      {layer.label}
                    </span>
                    {layer.sublabel && !compact && (
                      <span className="text-[10px] opacity-80 mt-0.5">
                        {layer.sublabel}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </button>
          )
        })}
      </div>

      {/* Legend - Impressionist style */}
      <div className={cn('flex flex-wrap justify-center', compact ? 'gap-3' : 'gap-5')}>
        <div className="flex items-center gap-2">
          <div
            className="h-3 w-3 rounded-full"
            style={{ background: `linear-gradient(135deg, ${monetLayerColors.coral}, ${monetLayerColors.coralLight})` }}
          />
          <span
            className={compact ? 'text-[10px]' : 'text-xs'}
            style={{ color: monetLayerColors.textSecondary }}
          >
            MediShield Life
          </span>
        </div>
        <div className="flex items-center gap-2">
          <div
            className="h-3 w-3 rounded-full"
            style={{ background: `linear-gradient(135deg, ${monetLayerColors.lavender}, ${monetLayerColors.lavenderLight})` }}
          />
          <span
            className={compact ? 'text-[10px]' : 'text-xs'}
            style={{ color: monetLayerColors.textSecondary }}
          >
            ISP Coverage
          </span>
        </div>
        <div className="flex items-center gap-2">
          <div
            className="h-3 w-3 rounded-full"
            style={{ background: `linear-gradient(135deg, ${monetLayerColors.sage}, ${monetLayerColors.sageLight})` }}
          />
          <span
            className={compact ? 'text-[10px]' : 'text-xs'}
            style={{ color: monetLayerColors.textSecondary }}
          >
            Rider Coverage
          </span>
        </div>
        <div className="flex items-center gap-2">
          <div
            className="h-3 w-3 rounded-full"
            style={{ background: `linear-gradient(135deg, ${monetLayerColors.gold}, ${monetLayerColors.goldLight})` }}
          />
          <span
            className={compact ? 'text-[10px]' : 'text-xs'}
            style={{ color: monetLayerColors.textSecondary }}
          >
            You Pay
          </span>
        </div>
      </div>
    </div>
  )
}

/**
 * Inline version for embedding in text/questionnaires
 * Styled to match the Monet impressionist theme
 */
export function CoverageLayersInline() {
  return (
    <div
      className="rounded-2xl p-5 backdrop-blur-sm"
      style={{
        background: 'rgba(255, 255, 255, 0.6)',
        border: `1px solid ${monetLayerColors.cardBorder}`,
        boxShadow: '0 4px 20px rgba(155, 139, 180, 0.1)',
      }}
    >
      <CoverageLayers compact />
    </div>
  )
}
