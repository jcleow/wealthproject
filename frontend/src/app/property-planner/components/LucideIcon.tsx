'use client'

import * as LucideIcons from 'lucide-react'
import type { ComponentType } from 'react'
import type { LucideIcon as LucideIconType } from 'lucide-react'

interface LucideIconProps {
  name: string
  className?: string
}

/**
 * LucideIcon - Dynamically renders a Lucide icon by its kebab-case name.
 * Converts kebab-case to PascalCase and looks up the icon component.
 * Falls back to Home icon if the specified icon is not found.
 */
export function LucideIcon({ name, className }: LucideIconProps) {
  // Convert kebab-case to PascalCase
  const pascalName = name
    .split('-')
    .map(part => part.charAt(0).toUpperCase() + part.slice(1))
    .join('')

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const IconComponent = (LucideIcons as unknown as Record<string, LucideIconType>)[pascalName] as ComponentType<{ className?: string }> | undefined

  if (!IconComponent) {
    // Fallback to Home icon
    return <LucideIcons.Home className={className} />
  }

  return <IconComponent className={className} />
}
