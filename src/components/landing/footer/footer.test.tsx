import { render, screen } from '@testing-library/react';
import { Footer } from './footer';

describe('Footer', () => {
  it('links the legal docs to the public routes', () => {
    render(<Footer />);

    expect(screen.getByRole('link', { name: 'Privacy' })).toHaveAttribute(
      'href',
      '/privacy',
    );
    expect(screen.getByRole('link', { name: 'Terms' })).toHaveAttribute(
      'href',
      '/terms',
    );
  });
});
