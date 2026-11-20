import { render, screen } from '@testing-library/react';
import { Sticker } from './sticker';

describe('Sticker', () => {
  it('renders a non-submitting button by default', () => {
    render(<Sticker>Stats</Sticker>);

    expect(screen.getByRole('button', { name: 'Stats' })).toHaveAttribute(
      'type',
      'button',
    );
  });

  it('renders as a link and passes link props through', () => {
    render(
      <Sticker as="a" href="/home/stats" aria-current="page">
        Stats
      </Sticker>,
    );

    const link = screen.getByRole('link', { name: 'Stats' });
    expect(link).toHaveAttribute('href', '/home/stats');
    expect(link).toHaveAttribute('aria-current', 'page');
    expect(link).not.toHaveAttribute('type');
  });

  it('marks the active sticker for styling', () => {
    render(
      <>
        <Sticker active>Chat</Sticker>
        <Sticker>Stats</Sticker>
      </>,
    );

    expect(screen.getByRole('button', { name: 'Chat' })).toHaveAttribute(
      'data-active',
    );
    expect(screen.getByRole('button', { name: 'Stats' })).not.toHaveAttribute(
      'data-active',
    );
  });
});
