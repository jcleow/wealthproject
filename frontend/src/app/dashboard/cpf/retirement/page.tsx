'use client'

import { useRouter } from 'next/navigation'
import { CPFSimulationView } from '@/components/cpf/CPFSimulationView'

export default function CPFRetirementPage() {
  const router = useRouter()

  const handleClose = () => {
    router.push('/dashboard')
  }

  return (
    <div className="relative h-screen w-full overflow-hidden bg-[#050505] font-sans text-slate-200">
      {/* Ambient background orbs */}
      <div className="fixed left-[-10%] top-[-20%] h-[800px] w-[800px] pointer-events-none rounded-full bg-zinc-800/20 opacity-40 blur-[120px]" />
      <div className="fixed bottom-[-20%] right-[-10%] h-[600px] w-[600px] pointer-events-none rounded-full bg-slate-800/10 opacity-30 blur-[100px]" />

      {/* Main content */}
      <div className="relative z-10 flex h-screen w-full overflow-hidden p-6">
        <div className="flex flex-1 flex-col overflow-hidden min-h-0 rounded-2xl border border-white/[0.06] bg-[#0a0a0a]/80">
          <CPFSimulationView onClose={handleClose} initialTab="retirement" />
        </div>
      </div>
    </div>
  )
}
