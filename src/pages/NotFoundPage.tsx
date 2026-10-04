import { Link } from 'react-router-dom'
import { Compass } from 'lucide-react'

import { EmptyState } from '@/components/ui/EmptyState'
import { useDocumentTitle } from '@/lib/useDocumentTitle'

export function NotFoundPage() {
  useDocumentTitle('Page not found')

  return (
    <div className="py-10">
      <EmptyState
        titleAs="h1"
        icon={<Compass className="size-7" />}
        title="Page not found"
        description="The page you were looking for does not exist or has been moved."
        action={
          <Link
            to="/"
            className="inline-flex h-9 items-center rounded-md border border-neutral-800 px-3.5 text-sm text-neutral-200 transition-colors hover:border-neutral-700 hover:bg-neutral-900"
          >
            Back to all tools
          </Link>
        }
      />
    </div>
  )
}

export default NotFoundPage