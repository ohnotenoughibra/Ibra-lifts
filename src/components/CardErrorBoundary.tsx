'use client';

import { Component, ReactNode } from 'react';
import { AlertTriangle } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallbackLabel?: string;
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

  render() {
    if (this.state.hasError) {
      return (
        <div className="card p-4 flex items-center gap-3 opacity-60">
          <AlertTriangle className="w-4 h-4 text-yellow-500 shrink-0" />
          <p className="text-xs text-grappler-500">
            {this.props.fallbackLabel || 'This section'} couldn&apos;t load.
          </p>
        </div>
      );
    }
    return this.props.children;
  }
}
