"use client"

import { Component, type ReactNode } from "react"

interface Props {
  children: ReactNode
  /** Optional page title shown in the error fallback */
  title?: string
}

interface State {
  hasError: boolean
  error: Error | null
}

/**
 * Graceful error boundary for page-level crashes.
 * Shows a Persian-friendly retry card matching the app's glass-morphism design.
 */
export class PageErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null })
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-[60vh] flex items-center justify-center p-6">
          <div className="glass-card p-8 rounded-3xl max-w-sm w-full text-center space-y-5">
            {/* Error icon */}
            <div className="mx-auto w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center">
              <svg
                className="w-8 h-8 text-destructive"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={1.5}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z"
                />
              </svg>
            </div>

            {/* Title */}
            <h2 className="text-lg font-bold text-foreground">
              {this.props.title ?? "خطایی رخ داد"}
            </h2>

            {/* Description */}
            <p className="text-sm text-foreground/50 leading-relaxed">
              متأسفانه در بارگذاری این صفحه مشکلی پیش آمد. لطفاً دوباره تلاش کنید.
            </p>

            {/* Retry button */}
            <button
              onClick={this.handleRetry}
              className="
                w-full py-3 rounded-2xl font-semibold text-sm
                bg-primary text-foreground
                active:scale-95 transition-transform duration-150
                shadow-lg shadow-primary/20
              "
            >
              تلاش مجدد
            </button>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}
