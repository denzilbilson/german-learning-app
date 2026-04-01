import { Component } from 'react'

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }

  componentDidCatch(error, info) {
    console.error('[ErrorBoundary] Render error:', error, info)
  }

  render() {
    if (!this.state.hasError) return this.props.children

    const message = this.state.error?.message || 'An unexpected error occurred.'

    return (
      <div className="flex items-center justify-center min-h-[60vh] p-8">
        <div className="w-full max-w-md bg-secondary border border-warm-800 rounded-xl p-8 text-center shadow-2xl">
          <div className="w-12 h-12 rounded-full bg-accent-red/10 border border-accent-red/30 flex items-center justify-center mx-auto mb-5">
            <span className="text-accent-red text-xl">!</span>
          </div>
          <h2 className="font-display text-xl text-primary mb-2">Something went wrong</h2>
          <p className="text-secondary text-sm font-sans leading-relaxed mb-6">
            {message}
          </p>
          <button
            onClick={() => this.setState({ hasError: false, error: null })}
            className="px-6 py-2.5 bg-accent-gold text-primary font-semibold rounded-lg text-sm hover:brightness-110 transition-all"
          >
            Try Again
          </button>
        </div>
      </div>
    )
  }
}
