'use client'

import { useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { useBodyScrollLock } from '@/hooks/useBodyScrollLock'

interface ModalProps {
  isOpen: boolean
  onClose?: () => void
  children: React.ReactNode
  className?: string
  overlayClassName?: string
}

export function Modal({ isOpen, onClose, children, className = '', overlayClassName = '' }: ModalProps) {
  const overlayRef = useRef<HTMLDivElement>(null)
  const previousActiveElement = useRef<HTMLElement | null>(null)

  // Use the reusable scroll lock hook
  useBodyScrollLock(isOpen)

  useEffect(() => {
    if (!isOpen) return

    // Store the currently focused element
    previousActiveElement.current = document.activeElement as HTMLElement

    // Focus trap
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && onClose) {
        onClose()
      }
    }

    document.addEventListener('keydown', handleKeyDown)

    return () => {
      // Restore focus to previous element
      if (previousActiveElement.current && previousActiveElement.current.focus) {
        previousActiveElement.current.focus()
      }

      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [isOpen, onClose])

  if (!isOpen) return null

  // Portal ensures modal is rendered at document root
  return createPortal(
    <div
      ref={overlayRef}
      className={`fixed inset-0 z-50 flex items-center justify-center ${overlayClassName}`}
      onClick={(e) => {
        if (e.target === overlayRef.current && onClose) {
          onClose()
        }
      }}
      aria-modal="true"
      role="dialog"
    >
      <div className={className} onClick={(e) => e.stopPropagation()}>
        {children}
      </div>
    </div>,
    document.body
  )
}