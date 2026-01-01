'use client'

import { usePersonFilterOptional } from '@/contexts/PersonFilterContext'
import { PersonsModal } from './PersonsModal'

/**
 * Container component that renders the PersonsModal when needed.
 * Uses the PersonFilterContext to control modal visibility.
 * Should be placed at the app root level.
 */
export function PersonsModalContainer() {
  const personFilter = usePersonFilterOptional()

  if (!personFilter) return null

  return (
    <PersonsModal
      isOpen={personFilter.isPersonsModalOpen}
      onClose={personFilter.closePersonsModal}
    />
  )
}
