import { useEffect, useRef } from 'react'
import { X } from 'lucide-react'

import { Sidebar } from '@/components/layout/Sidebar'

interface MobileNavProps {
  open: boolean
  onClose: () => void
}

/**
 * Off-canvas navigation used below the `lg` breakpoint. The desktop sidebar is
 * always rendered separately, so the drawer is hidden from the a11y tree and
 * the layout when closed.
 */
export function MobileNav({ open, onClose }: MobileNavProps) {
  const panelRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    if (!open) return

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }

    document.addEventListener('keydown', onKeyDown)
    document.body.style.overflow = 'hidden'

    return () => {
      document.removeEventListener('keydown', onKeyDown)
      document.body.style.overflow = ''
    }
  }, [onClose, open])

  useEffect(() => {
    if (open) panelRef.current?.focus()
  }, [open])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 lg:hidden">
      <button
        type="button"
        aria-label="Close tools menu"
        onClick={onClose}
        className="absolute inset-0 h-full w-full bg-neutral-950/70 backdrop-blur-sm"
      />

      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label="Tools menu"
        tabIndex={-1}
        className="absolute inset-y-0 left-0 flex w-72 max-w-[85vw] flex-col border-r border-neutral-800 bg-neutral-950 px-3 py-4"
      >
        <div className="mb-4 flex items-center justify-between px-1">
          <span className="text-sm font-semibold text-neutral-200">Navigation</span>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close tools menu"
            className="inline-flex size-8 items-center justify-center rounded-md text-neutral-400 hover:bg-neutral-900 hover:text-neutral-100"
          >
            <X className="size-4" aria-hidden="true" />
          </button>
        </div>

        <Sidebar onNavigate={onClose} className="overflow-y-auto" />
      </div>
    </div>
  )
}
