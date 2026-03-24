import React from 'react';
import { ErrorPage } from '../routes/error';

/**
 * ErrorBoundary
 *
 * Catches render-time errors and shows a friendly error page.
 */
export class ErrorBoundary extends React.Component<React.PropsWithChildren, { hasError: boolean }> {
  state = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  render() {
    if (this.state.hasError) {
      return <ErrorPage />;
    }

    return this.props.children;
  }
}
