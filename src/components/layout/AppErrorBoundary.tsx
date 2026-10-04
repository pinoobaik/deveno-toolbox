import { TriangleAlert } from 'lucide-react'
import { Component, type ReactNode } from 'react'
import { Link } from 'react-router-dom'

import { Button } from '@/components/ui/Button'
import { EmptyState } from '@/components/ui/EmptyState'

interface AppErrorBoundaryProps {
  readonly children: ReactNode
}

interface AppErrorBoundaryState {
  readonly error: Error | null
}

/**
 * Catches render-time failures below the application shell, including a lazy
 * tool chunk that fails to load. The shell stays usable so the visitor can
 * navigate somewhere else, and retrying re-mounts the failed subtree.
 */
export class AppErrorBoundary extends Component<AppErrorBoundaryProps, AppErrorBoundaryState> {
  state: AppErrorBoundaryState = { error: null }

  static getDerivedStateFromError(error: Error): AppErrorBoundaryState {
    return { error }
  }

  render(): ReactNode {
    const { error } = this.state

    if (error === null) return this.props.children

    return (
      <EmptyState
        titleAs="h1"
        icon={<TriangleAlert className="size-7" />}
        title="This part of the toolbox failed to load"
        description="The rest of the app still works. Retry the tool, or go back to the tool list."
        action={
          <div className="flex flex-wrap items-center justify-center gap-2">
            <Button variant="primary" onClick={() => this.setState({ error: null })}>
              Try again
            </Button>
            <Link
              to="/"
              className="inline-flex h-9 items-center rounded-md border border-neutral-800 px-3.5 text-sm text-neutral-200 transition-colors hover:border-neutral-700 hover:bg-neutral-900"
            >
              Back to all tools
            </Link>
          </div>
        }
      />
    )
  }
}