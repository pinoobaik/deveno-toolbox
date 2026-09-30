import { Menu, SquareArrowOutUpRight, Wrench } from 'lucide-react'
import { Link } from 'react-router-dom'

import { APP_NAME, GITHUB_URL } from '@/lib/constants'

interface HeaderProps {
  onMenuClick: (() => void) | undefined
}

export function Header({ onMenuClick }: HeaderProps) {
  return (
    <header className="sticky top-0 z-30 border-b border-neutral-800 bg-neutral-950/90 backdrop-blur">
      <div className="mx-auto flex h-14 w-full max-w-7xl items-center justify-between gap-3 px-4 sm:px-6">
        <div className="flex min-w-0 items-center gap-2">
          {onMenuClick ? (
            <button
              type="button"
              onClick={onMenuClick}
              aria-haspopup="dialog"
              className="-ml-1 inline-flex size-9 items-center justify-center rounded-md text-neutral-400 hover:bg-neutral-900 hover:text-neutral-100 lg:hidden"
            >
              <Menu className="size-5" aria-hidden="true" />
              <span className="sr-only">Open tools menu</span>
            </button>
          ) : null}

          <Link
            to="/"
            className="flex min-w-0 items-center gap-2 text-sm font-semibold text-neutral-100"
          >
            <Wrench className="size-4 shrink-0 text-sky-400" aria-hidden="true" />
            <span className="truncate">{APP_NAME}</span>
          </Link>
        </div>

        <nav aria-label="External links">
          <a
            href={GITHUB_URL}
            target="_blank"
            rel="noreferrer noopener"
            className="inline-flex h-9 items-center gap-2 rounded-md border border-neutral-800 px-3 text-sm text-neutral-300 transition-colors hover:border-neutral-700 hover:bg-neutral-900 hover:text-neutral-100"
          >
            <SquareArrowOutUpRight className="size-4" aria-hidden="true" />
            <span className="hidden sm:inline">GitHub</span>
            <span className="sr-only sm:hidden">GitHub</span>
          </a>
        </nav>
      </div>
    </header>
  )
}
