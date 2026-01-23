import { create } from 'zustand'
import { useShallow } from 'zustand/react/shallow'
import { devtools } from 'zustand/middleware'

// ============================================
// TYPES
// ============================================

export interface PersonFilterState {
  // Modal visibility
  isPersonsModalOpen: boolean

  // Actions
  openPersonsModal: () => void
  closePersonsModal: () => void
}

// ============================================
// STORE
// ============================================

export const usePersonFilterStore = create<PersonFilterState>()(
  devtools(
    (set) => ({
      isPersonsModalOpen: false,

      openPersonsModal: () => set({ isPersonsModalOpen: true }),
      closePersonsModal: () => set({ isPersonsModalOpen: false }),
    }),
    { name: 'person-filter-store' }
  )
)

// ============================================
// SELECTORS
// ============================================

export const usePersonsModalOpen = () => usePersonFilterStore((s) => s.isPersonsModalOpen)
export const usePersonsModalActions = () =>
  usePersonFilterStore(
    useShallow((s) => ({
      openPersonsModal: s.openPersonsModal,
      closePersonsModal: s.closePersonsModal,
    }))
  )
