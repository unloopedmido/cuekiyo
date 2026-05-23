import type { ReactNode } from "react"
import { Component } from "react"
import { HugeiconsIcon } from "@hugeicons/react"
import { Alert02Icon } from "@hugeicons/core-free-icons"
import { Button } from "@/components/ui/button"

interface Props {
  children: ReactNode
  fallback?: ReactNode
}

interface State {
  hasError: boolean
  error?: Error
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error("ErrorBoundary caught an error:", error, info.componentStack)
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback
      }
      return (
        <div className="flex flex-1 flex-col items-center justify-center gap-4 p-8 text-center">
          <HugeiconsIcon
            icon={Alert02Icon}
            strokeWidth={2}
            className="size-8 text-destructive"
          />
          <h2 className="font-heading text-lg font-semibold">
            Something went wrong
          </h2>
          <p className="max-w-sm text-sm text-muted-foreground">
            This view crashed. Try reloading the page or going back.
          </p>
          <Button onClick={() => window.location.reload()}>Reload page</Button>
        </div>
      )
    }
    return this.props.children
  }
}
