// ===========================================
// Not Found Page Tests
// ===========================================

import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { NotFoundPage } from './NotFoundPage.js';

function renderPage() {
  return render(
    <MemoryRouter>
      <NotFoundPage />
    </MemoryRouter>
  );
}

describe('NotFoundPage', () => {
  it('should render 404 text', () => {
    renderPage();
    expect(screen.getByText('404')).toBeInTheDocument();
  });

  it('should render "Page Not Found" heading', () => {
    renderPage();
    expect(screen.getByText('Page Not Found')).toBeInTheDocument();
  });

  it('should render a "Go Home" link pointing to /', () => {
    renderPage();
    const link = screen.getByRole('link', { name: /go home/i });
    expect(link).toBeInTheDocument();
    expect(link).toHaveAttribute('href', '/');
  });
});
