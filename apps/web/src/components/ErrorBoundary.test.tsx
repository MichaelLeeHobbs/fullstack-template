// ===========================================
// Error Boundary Tests
// ===========================================

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ErrorBoundary } from './ErrorBoundary.js';

// Component that throws on render
function ThrowError({ message }: { message: string }) {
  throw new Error(message);
}

describe('ErrorBoundary', () => {
  beforeEach(() => {
    // Suppress React error boundary console.error noise
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  it('should render children when no error occurs', () => {
    render(
      <ErrorBoundary>
        <div>All good</div>
      </ErrorBoundary>
    );
    expect(screen.getByText('All good')).toBeInTheDocument();
  });

  it('should display fallback UI when a child throws', () => {
    render(
      <ErrorBoundary>
        <ThrowError message="Test error" />
      </ErrorBoundary>
    );
    expect(screen.getByText('Something went wrong')).toBeInTheDocument();
    expect(screen.getByText(/unexpected error/i)).toBeInTheDocument();
  });

  it('should render custom fallback when provided', () => {
    render(
      <ErrorBoundary fallback={<div>Custom fallback</div>}>
        <ThrowError message="Test error" />
      </ErrorBoundary>
    );
    expect(screen.getByText('Custom fallback')).toBeInTheDocument();
  });

  it('should reset error state when "Try Again" is clicked', async () => {
    const user = userEvent.setup();
    let shouldThrow = true;

    function MaybeThrow() {
      if (shouldThrow) throw new Error('boom');
      return <div>Recovered</div>;
    }

    render(
      <ErrorBoundary>
        <MaybeThrow />
      </ErrorBoundary>
    );

    expect(screen.getByText('Something went wrong')).toBeInTheDocument();

    shouldThrow = false;
    await user.click(screen.getByRole('button', { name: /try again/i }));
    expect(screen.getByText('Recovered')).toBeInTheDocument();
  });

  it('should navigate home when "Go Home" is clicked', async () => {
    const user = userEvent.setup();
    // Mock window.location
    const originalLocation = window.location;
    Object.defineProperty(window, 'location', {
      writable: true,
      value: { ...originalLocation, href: '' },
    });

    render(
      <ErrorBoundary>
        <ThrowError message="Test error" />
      </ErrorBoundary>
    );

    await user.click(screen.getByRole('button', { name: /go home/i }));
    expect(window.location.href).toBe('/');

    // Restore
    Object.defineProperty(window, 'location', {
      writable: true,
      value: originalLocation,
    });
  });
});
