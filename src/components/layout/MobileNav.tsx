import { X } from 'lucide-react'
import { useEffect, useRef, type KeyboardEvent } from 'react'

import { Sidebar } from '@/components/layout/Sidebar'

interface MobileNavProps {
  open: boolean
  onClose: () => void
}

/** Elements that can hold focus inside the drawer, in tab order. */
const FOCUSABLE_SELECTOR = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(', ')

const DESKTOP_QUERY = '(min-width: 1024px)'

/**
 * Off-canvas navigation used below the `lg` breakpoint. The desktop sidebar is
 * always rendered separately, so the drawer is hidden from the a11y tree and
 * the layout when closed. While open it behaves as a modal dialog: focus is
 * moved in, kept inside, and returned to the trigger on close.
 */
export function MobileNav({ open, onClose }: MobileNavProps) {
  const panelRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    if (!open) return

    const onKeyDown = (event: globalThis.KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }

    const previousOverflow = document.body.style.overflow

    document.addEventListener('keydown', onKeyDown)
    document.body.style.overflow = 'hidden'

    return () => {
      document.removeEventListener('keydown', onKeyDown)
      document.body.style.overflow = previousOverflow
    }
  }, [onClose, open])

  useEffect(() => {
    if (!open) return

    const desktop = window.matchMedia(DESKTOP_QUERY)
    const closeOnDesktop = () => {
      if (desktop.matches) onClose()
    }

    closeOnDesktop()
    desktop.addEventListener('change', closeOnDesktop)

    return () => desktop.removeEventListener('change', closeOnDesktop)
  }, [onClose, open])

  useEffect(() => {
    if (!open) return

    const active = document.activeElement
    panelRef.current?.focus()

    return () => {
      if (active instanceof HTMLElement) active.focus()
    }
  }, [open])

  if (!open) return null

  const trapFocus = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key !== 'Tab') return

    const panel = panelRef.current
    if (panel === null) return

    const focusable = [...panel.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)].filter(
      (element) => element.getClientRects().length > 0,
    )

    const first = focusable[0]
    const last = focusable[focusable.length - 1]
    if (first === undefined || last === undefined) return

    const active = document.activeElement
    const isInsidePanel = active instanceof Node && panel.contains(active)

    if (!isInsidePanel) {
      event.preventDefault()
      first.focus()
      return
    }

    if (event.shiftKey && active === first) {
      event.preventDefault()
      last.focus()
      return
    }

    if (!event.shiftKey && active === last) {
      event.preventDefault()
      first.focus()
    }
  }

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
        onKeyDown={trapFocus}
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