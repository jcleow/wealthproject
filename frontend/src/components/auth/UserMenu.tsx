'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { LogOut, User, ChevronDown, Settings } from 'lucide-react'
import clsx from 'clsx'
import { useSession, signOut } from '@/lib/auth-client'
import { Button } from '@/components/ui/button'
import { SettingsModal } from '@/components/modals/SettingsModal/SettingsModal'
import { clearAllSensitiveStorage } from '@/hooks/useTaxReliefStorage'
import { useColorScheme } from '@/stores'

export function UserMenu() {
  const { data: session, isPending } = useSession()
  const colorScheme = useColorScheme()
  const isMonet = colorScheme === 'monet'
  const [isOpen, setIsOpen] = useState(false)
  const [isSigningOut, setIsSigningOut] = useState(false)
  const [mounted, setMounted] = useState(false)
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)
  const router = useRouter()
  const menuRef = useRef<HTMLDivElement>(null)

  // Prevent hydration mismatch by only rendering after mount
  useEffect(() => {
    setMounted(true)
  }, [])

  // Close dropdown when clicking outside
  useEffect(() => {
    if (!isOpen) return
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [isOpen])

  const handleSignOut = async () => {
    setIsSigningOut(true)
    try {
      // SECURITY: Clear all sensitive cached data from localStorage before signing out
      // This prevents data exposure if the device is shared or compromised
      clearAllSensitiveStorage()

      await signOut()
      router.push('/login')
      router.refresh()
    } catch (error) {
      console.error('Sign out failed:', error)
    } finally {
      setIsSigningOut(false)
      setIsOpen(false)
    }
  }

  // Show loading skeleton on server and until mounted on client
  if (!mounted || isPending) {
    return (
      <div className={clsx(
        'h-9 w-24 rounded-md animate-pulse',
        isMonet ? 'bg-[var(--monet-lavender)]/20' : 'bg-gray-800'
      )} />
    )
  }

  if (!session?.user) {
    return (
      <div className="flex items-center gap-2">
        <Link href="/login">
          <Button variant="ghost" size="sm" className={clsx(
            isMonet
              ? 'text-[var(--monet-text-secondary)] hover:text-[var(--monet-text-primary)]'
              : 'text-gray-300 hover:text-white'
          )}>
            Sign In
          </Button>
        </Link>
        <Link href="/signup">
          <Button size="sm">
            Sign Up
          </Button>
        </Link>
      </div>
    )
  }

  return (
    <div className="relative z-[100]" ref={menuRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={clsx(
          'flex items-center gap-2 px-3 py-2 rounded-md transition-colors',
          isMonet
            ? 'hover:bg-[var(--monet-lavender)]/10'
            : 'hover:bg-gray-800'
        )}
      >
        <div className="flex items-center justify-center w-8 h-8 rounded-full bg-blue-600">
          {session.user.image ? (
            <img
              src={session.user.image}
              alt={session.user.name || 'User'}
              className="w-8 h-8 rounded-full"
            />
          ) : (
            <User className="w-4 h-4 text-white" />
          )}
        </div>
        <span className={clsx(
          'text-sm hidden sm:block',
          isMonet ? 'text-[var(--monet-text-secondary)]' : 'text-gray-300'
        )}>
          {session.user.name || session.user.email}
        </span>
        <ChevronDown className={clsx(
          'w-4 h-4',
          isMonet ? 'text-[var(--monet-text-muted)]' : 'text-gray-400'
        )} />
      </button>

      {isOpen && (
          <div
            className={clsx(
              'absolute right-0 z-[100] overflow-hidden w-56 mt-2 rounded-xl border shadow-2xl',
              isMonet
                ? 'border-[var(--monet-lavender)]/20 bg-white'
                : 'border-white/[0.08] bg-[#0a0a0a]'
            )}
            style={{ isolation: 'isolate' }}
          >
            <div className={clsx(
              'px-4 py-3 border-b',
              isMonet ? 'border-[var(--monet-lavender)]/10' : 'border-white/[0.06]'
            )}>
              <p className={clsx(
                'text-sm font-medium truncate',
                isMonet ? 'text-[var(--monet-text-primary)]' : 'text-slate-200'
              )}>
                {session.user.name}
              </p>
              <p className={clsx(
                'text-xs truncate',
                isMonet ? 'text-[var(--monet-text-muted)]' : 'text-slate-400'
              )}>
                {session.user.email}
              </p>
            </div>

            <div className="py-1">
              <button
                onClick={() => {
                  setIsOpen(false)
                  setIsSettingsOpen(true)
                }}
                className={clsx(
                  'flex items-center w-full gap-2 px-4 py-2.5 text-sm transition-colors',
                  isMonet
                    ? 'text-[var(--monet-text-secondary)] hover:text-[var(--monet-text-primary)] hover:bg-[var(--monet-lavender)]/5'
                    : 'text-slate-300 hover:text-slate-100 hover:bg-white/5'
                )}
              >
                <Settings className="w-4 h-4" />
                Settings
              </button>
              <button
                onClick={handleSignOut}
                disabled={isSigningOut}
                className={clsx(
                  'flex items-center w-full gap-2 px-4 py-2.5 text-sm disabled:opacity-50 transition-colors',
                  isMonet
                    ? 'text-[var(--monet-text-secondary)] hover:text-[var(--monet-text-primary)] hover:bg-[var(--monet-lavender)]/5'
                    : 'text-slate-300 hover:text-slate-100 hover:bg-white/5'
                )}
              >
                <LogOut className="w-4 h-4" />
                {isSigningOut ? 'Signing out...' : 'Sign out'}
              </button>
            </div>
          </div>
      )}

      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
      />
    </div>
  )
}
