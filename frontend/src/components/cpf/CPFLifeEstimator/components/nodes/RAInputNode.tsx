'use client'

import { useMemo } from 'react'
import { Handle, Position } from '@xyflow/react'
import { Loader2 } from 'lucide-react'

import { CurrencyInput } from '@/components/ui/CurrencyInput'
import { CPFDropdown } from '../CPFDropdown'
import type { RAInputNodeData, StartAge, Gender } from '../../types'

interface RAInputNodeProps {
  data: RAInputNodeData
}

export function RAInputNode({ data }: RAInputNodeProps) {
  const birthYearOptions = useMemo(() => {
    const years = []
    for (let y = 2010; y >= 1950; y--) {
      years.push({ value: y, label: y.toString() })
    }
    return years
  }, [])

  return (
    <div className={`min-w-[240px]
p-4
rounded-xl border border-white/[0.08]
bg-[#0f1728]/95
shadow-xl backdrop-blur`}>
      <div className={`mb-3
text-xs font-medium tracking-wide text-purple-400
uppercase`}>
        Your Details
      </div>

      <div className="space-y-3">
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="mb-1 block text-xs text-slate-400">Birth Year</label>
            <CPFDropdown
              value={data.birthYear}
              onChange={(val) => data.onChange('birthYear', val)}
              options={birthYearOptions}
            />
          </div>
          <div>
            <label className="mb-1 block text-xs text-slate-400">Gender</label>
            <CPFDropdown
              value={data.gender}
              onChange={(val) => data.onChange('gender', val)}
              options={[
                { value: 'male' as Gender, label: 'Male' },
                { value: 'female' as Gender, label: 'Female' },
              ]}
            />
          </div>
        </div>

        <div>
          <label className="mb-1 block text-xs text-slate-400">RA Balance at 65</label>
          <CurrencyInput
            value={data.raBalance}
            onChange={(val) => data.onChange('raBalance', val)}
            size="sm"
          />
        </div>

        <div>
          <label className="mb-1 block text-xs text-slate-400">Start Payout At</label>
          <CPFDropdown
            value={data.startAge}
            onChange={(val) => data.onChange('startAge', val)}
            options={[
              { value: 65 as StartAge, label: 'Age 65 (earliest)' },
              { value: 66 as StartAge, label: 'Age 66 (+7% bonus)' },
              { value: 67 as StartAge, label: 'Age 67 (+14% bonus)' },
              { value: 68 as StartAge, label: 'Age 68 (+21% bonus)' },
              { value: 69 as StartAge, label: 'Age 69 (+28% bonus)' },
              { value: 70 as StartAge, label: 'Age 70 (+35% bonus)' },
            ]}
          />
        </div>

        {data.startAge > 65 && (
          <div className="pt-2 border-t border-white/10 text-xs text-emerald-400">
            Deferring {data.startAge - 65} year{data.startAge > 66 ? 's' : ''} = +{(data.startAge - 65) * 7}% higher payouts
          </div>
        )}

        {data.isLoading && (
          <div className="pt-2 flex items-center gap-2 text-xs text-slate-400">
            <Loader2 className="h-3 w-3 animate-spin" />
            Calculating estimates...
          </div>
        )}
      </div>

      <Handle type="source" position={Position.Right} className="!bg-purple-500 !w-3 !h-3" />
    </div>
  )
}
