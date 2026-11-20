import { render, screen } from '@testing-library/react';
import { Avatar } from './avatar';

describe('Avatar', () => {
  it('uses a palette token by default', () => {
    render(<Avatar displayName="Alex" color="vibrant-coral" />);
    expect(screen.getByText('A')).toHaveStyle({
      backgroundColor: 'var(--color-vibrant-coral)',
    });
  });

  it('lets an identity colour override the palette token', () => {
    render(
      <Avatar
        displayName="Riley"
        fill="var(--member-2)"
        ink="var(--member-2-ink)"
      />,
    );
    const avatar = screen.getByText('R');
    expect(avatar.style.backgroundColor).toBe('var(--member-2)');
    expect(avatar.style.color).toBe('var(--member-2-ink)');
  });
});
