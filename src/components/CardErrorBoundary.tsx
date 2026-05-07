'use client';

import { Component, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, X } from 'lucide-react';

interface SecondaryAction {
  label: string;
  onClick: () => void;
}

interface Props {
  children: ReactNode;
  fallbackLabel?: string;
  onRetry?: () => void;
  /**
   * If provided, the error fallback fills the screen instead of rendering as
   * an inline card. Use for full-screen views where an inline card would
   * stay covered by whatever is underneath (e.g. ActiveWorkout, ReadyForThis).
   */
  fullScreen?: boolean;
  /**
   * Optional escape hatch shown next to Retry. Use for cases where a retry
   * loop would just re-throw and the user needs a way out (e.g. clear a
   * stuck activeWorkout from store).
   */
  secondaryAction?: SecondaryAction;
}

interface State {
  hasError: boolean;
  errorMessage: string;
}

export default class CardErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, errorMessage: '' };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, errorMessage: error.message };
  }

  componentDidCatch(error: Error, info: { componentStack: string }) {
    console.error(
      `[CardErrorBoundary] ${this.props.fallbackLabel || 'Card'}:`,
      error.message,
      '\nStack:', error.stack,
      '\nComponent stack:', info.componentStack,
    );
  }

  handleRetry = () => {
    this.setState({ hasError: false, errorMessage: '' });
    this.props.onRetry?.();
  };

  handleSecondary = () => {
    this.setState({ hasError: false, errorMessage: '' });
    this.props.secondaryAction?.onClick();
  };

  render() {
    if (this.state.hasError) {
      const { fullScreen, secondaryAction } = this.props;

      if (fullScreen) {
        return (
          <div className="fixed inset-0 z-50 bg-grappler-950 flex items-center justify-center px-6 safe-area-top safe-area-bottom">
            <div className="max-w-sm w-full bg-grappler-900 border border-grappler-700 rounded-xl p-5 space-y-4">
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-grappler-100">
                    {this.props.fallbackLabel || 'Screen'} couldn&apos;t load.
                  </p>
                  {this.state.errorMessage && (
                    <p className="mt-1 text-xs text-grappler-500 break-words">
                      {this.state.errorMessage}
                    </p>
                  )}
                </div>
              </div>
              <div className="flex flex-col gap-2">
                <button
                  onClick={this.handleRetry}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg bg-primary-500 text-white text-sm font-bold transition-colors hover:bg-primary-400 active:scale-[0.98]"
                >
                  <RefreshCw className="w-4 h-4" />
                  Try again
                </button>
                {secondaryAction && (
                  <button
                    onClick={this.handleSecondary}
                    className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg bg-grappler-800 text-grappler-200 text-sm font-medium hover:bg-grappler-700 transition-colors"
                  >
                    <X className="w-4 h-4" />
                    {secondaryAction.label}
                  </button>
                )}
              </div>
            </div>
          </div>
        );
      }

      return (
        <div className="card p-4 flex items-center gap-3 opacity-60">
          <AlertTriangle className="w-4 h-4 text-yellow-500 shrink-0" />
          <p className="text-xs text-grappler-400 flex-1">
            {this.props.fallbackLabel || 'This section'} couldn&apos;t load.
          </p>
          <button
            onClick={this.handleRetry}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-grappler-700 text-grappler-200 text-xs font-medium hover:bg-grappler-600 transition-colors"
          >
            <RefreshCw className="w-3 h-3" />
            Retry
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
