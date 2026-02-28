// ===========================================
// Loading Spinner Tests
// ===========================================

import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { LoadingSpinner, PageLoader } from './LoadingSpinner.js';

describe('LoadingSpinner', () => {
  it('should render a circular progress indicator', () => {
    render(<LoadingSpinner />);
    expect(screen.getByRole('progressbar')).toBeInTheDocument();
  });

  it('should accept a custom size prop', () => {
    const { container } = render(<LoadingSpinner size={24} />);
    // MUI CircularProgress applies size as inline style on the root span
    const progressRoot = container.querySelector('.MuiCircularProgress-root') as HTMLElement;
    expect(progressRoot).toHaveStyle({ width: '24px', height: '24px' });
  });
});

describe('PageLoader', () => {
  it('should render with default "Loading..." message', () => {
    render(<PageLoader />);
    expect(screen.getByRole('progressbar')).toBeInTheDocument();
    expect(screen.getByText('Loading...')).toBeInTheDocument();
  });

  it('should render with a custom message', () => {
    render(<PageLoader message="Please wait..." />);
    expect(screen.getByText('Please wait...')).toBeInTheDocument();
  });
});
