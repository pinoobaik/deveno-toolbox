import { LayoutGrid } from 'lucide-react'
import { NavLink } from 'react-router-dom'

import { cn } from '@/lib/cn'
import { categoriesWithTools, countToolsByCategory } from '@/tools/registry'

interface CategoryNavProps {
  /**
   * Render a leading "All tools" link. Use it on pages other than the home
   * page so there is always a way back to the full catalog.
   */
  showAll?: boolean
  className?: string
}

const LINK_CLASSES =
  'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs transition-colors'
const ACTIVE_CLASSES = 'border-sky-700 bg-sky-950/60 text-sky-300'
const IDLE_CLASSES = 'border-neutral-800 text-neutral-400 hover:border-neutral-700 hover:text-neutral-100'

/**
 * Links to every category that currently has tools.
 *
 * These are links rather than filter buttons: the category already lives in
 * the URL, so navigation, back/forward, and a shareable address all keep
 * working without a second copy of the same state in the page. `NavLink`
 * supplies `aria-current`, so the active category is exposed without extra
 * markup.
 */
export function CategoryNav({ showAll = false, className }: CategoryNavProps) {
  const counts = countToolsByCategory()
  const categories = categoriesWithTools()

  return (
    <nav aria-label="Categories" className={className}>
      <ul className="flex flex-wrap items-center gap-2">
        {showAll ? (
          <li>
            <NavLink to="/" end className={({ isActive }) => cn(LINK_CLASSES, isActive ? ACTIVE_CLASSES : IDLE_CLASSES)}>
              <LayoutGrid className="size-3.5" aria-hidden="true" />
              All tools
            </NavLink>
          </li>
        ) : null}

        {categories.map((category) => {
          const Icon = category.icon

          return (
            <li key={category.id}>
              <NavLink
                to={`/category/${category.id}`}
                end
                className={({ isActive }) => cn(LINK_CLASSES, isActive ? ACTIVE_CLASSES : IDLE_CLASSES)}
              >
                <Icon className="size-3.5" aria-hidden="true" />
                {category.label}
                <span className="text-neutral-600">{counts.get(category.id) ?? 0}</span>
              </NavLink>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
