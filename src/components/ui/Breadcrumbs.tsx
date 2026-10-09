import { ChevronRight } from 'lucide-react'
import { Link } from 'react-router-dom'

import { cn } from '@/lib/cn'
import type { BreadcrumbItem } from '@/tools/breadcrumbs'

interface BreadcrumbsProps {
  /** The trail to render, outermost step first. An empty trail renders nothing. */
  items: readonly BreadcrumbItem[]
  className?: string
}

const LINK_CLASSES = 'text-neutral-500 transition-colors hover:text-neutral-200'
const CURRENT_CLASSES = 'font-medium text-neutral-200'

/**
 * Home → Category → Tool style trail as an ordered list inside a labelled
 * `nav`, so screen reader users can jump between landmarks and read the list
 * positionally.
 *
 * The step without a destination is the page you are on: it renders as plain
 * text carrying `aria-current="page"` rather than a link back to itself. Focus
 * styling comes from the shared `:focus-visible` rule, so nothing here has to
 * restate it.
 */
export function Breadcrumbs({ items, className }: BreadcrumbsProps) {
  if (items.length === 0) return null

  return (
    <nav aria-label="Breadcrumb" className={cn('min-w-0', className)}>
      <ol className="flex flex-wrap items-center gap-x-1.5 gap-y-1 text-xs">
        {items.map((item, index) => (
          <li key={`${index}:${item.label}`} className="flex items-center gap-1.5">
            {index > 0 ? (
              <ChevronRight aria-hidden="true" className="size-3 text-neutral-700" />
            ) : null}

            {item.to === undefined ? (
              <span aria-current="page" className={CURRENT_CLASSES}>
                {item.label}
              </span>
            ) : (
              <Link to={item.to} className={LINK_CLASSES}>
                {item.label}
              </Link>
            )}
          </li>
        ))}
      </ol>
    </nav>
  )
}
