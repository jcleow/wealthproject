'use client'

import { useState } from 'react'
import { Plus, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Input } from '@/components/ui/input'
import { numericStyles } from '@/lib/utils'
import type { GrantItem } from '../types'

interface GrantsEditorProps {
  grants: GrantItem[]
  onGrantsChange: (grants: GrantItem[]) => void
  title?: string
}

/**
 * GrantsEditor - A component for managing a list of grants (e.g., EHG, Family Grant).
 * Simpler than FeeEditor - just name and amount.
 */
export function GrantsEditor({
  grants,
  onGrantsChange,
  title = "Government Grants",
}: GrantsEditorProps) {
  const [newGrantName, setNewGrantName] = useState('')

  const handleUpdateGrant = (index: number, updates: Partial<GrantItem>) => {
    onGrantsChange(grants.map((grant, i) =>
      i === index ? { ...grant, ...updates } : grant
    ))
  }

  const handleDeleteGrant = (index: number) => {
    onGrantsChange(grants.filter((_, i) => i !== index))
  }

  const handleAddGrant = () => {
    if (!newGrantName.trim()) return

    const newGrant: GrantItem = {
      name: newGrantName.trim(),
      amount: 0,
    }
    onGrantsChange([...grants, newGrant])
    setNewGrantName('')
  }

  const totalGrants = grants.reduce((sum, grant) => sum + grant.amount, 0)

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-medium text-white/80">{title}</h4>
        <span className={cn(numericStyles.muted, 'text-xs')}>
          Total: ${totalGrants.toLocaleString()}
        </span>
      </div>

      {/* Existing grants */}
      <div className="space-y-2">
        {grants.map((grant, index) => (
          <div
            key={grant.id || `grant-${index}`}
            className="flex items-center gap-2 p-2.5 rounded-lg border bg-white/5 border-white/10"
          >
            {/* Grant name */}
            <Input
              type="text"
              value={grant.name}
              onChange={(e) => handleUpdateGrant(index, { name: e.target.value })}
              placeholder="Grant name"
              className="flex-1 min-w-0 bg-transparent border-0 text-sm text-white/90 focus:ring-0 h-auto py-0 placeholder:text-white/30"
            />

            {/* Amount input */}
            <div className="flex items-center gap-1 shrink-0">
              <span className="text-white/50 text-xs">$</span>
              <Input
                type="number"
                value={grant.amount || ''}
                onChange={(e) => handleUpdateGrant(index, { amount: parseFloat(e.target.value) || 0 })}
                placeholder="0"
                className={cn(
                  "w-24 bg-white/10 text-sm text-right rounded px-2 py-1 border-white/10 h-auto",
                  numericStyles.base
                )}
              />
            </div>

            {/* Delete button */}
            <button
              type="button"
              onClick={() => handleDeleteGrant(index)}
              className="p-1 hover:bg-white/10 rounded transition-colors shrink-0"
            >
              <X className="w-4 h-4 text-white/40 hover:text-red-400" />
            </button>
          </div>
        ))}
      </div>

      {/* Add new grant */}
      <div className="pt-2 border-t border-white/10">
        <div className="flex items-center gap-2">
          {/* Grant name input */}
          <Input
            type="text"
            value={newGrantName}
            onChange={(e) => setNewGrantName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleAddGrant()}
            placeholder="Add grant (e.g., EHG, Family Grant)..."
            className="flex-1 bg-white/5 text-sm text-white placeholder:text-white/30 rounded-lg px-3 py-2 border-white/10"
          />

          {/* Add button */}
          <button
            type="button"
            onClick={handleAddGrant}
            disabled={!newGrantName.trim()}
            className={cn(
              "p-2 rounded-lg transition-colors shrink-0",
              newGrantName.trim()
                ? "bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400"
                : "bg-white/5 text-white/30 cursor-not-allowed"
            )}
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  )
}
