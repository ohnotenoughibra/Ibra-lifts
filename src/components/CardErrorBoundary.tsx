'use client';

import { Component, ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallbackLabel?: string;
  onRetry?: () => void;
}

interface State {
  hasError: boolean;
}

export default class CardErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error) {
    console.error(`[CardErrorBoundary] ${this.props.fallbackLabel || 'Card'}:`, error.message);
  }

  handleRetry = () => {
    this.setState({ hasError: false });
    this.props.onRetry?.();
  };

  render() {
    if (this.state.hasError) {
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
