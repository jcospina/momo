import { render, screen } from '@testing-library/react';
import type { ComponentType, ReactNode } from 'react';

// react-markdown is ESM-only; mock it so jest doesn't have to transpile it.
// The mock renders a small fixture that exercises every component we override
// in the real component's `components` map, so we still verify wiring.
type MockComponents = {
  h1: ComponentType<{ children?: ReactNode }>;
  h2: ComponentType<{ children?: ReactNode }>;
  h3: ComponentType<{ children?: ReactNode }>;
  a: ComponentType<{ children?: ReactNode; href?: string }>;
  table: ComponentType<{ children?: ReactNode }>;
};

jest.mock('react-markdown', () => ({
  __esModule: true,
  default: ({ components }: { components: MockComponents }) => {
    const { h1: H1, h2: H2, h3: H3, a: A, table: Table } = components;
    return (
      <div>
        <H1>alpha</H1>
        <H2>beta</H2>
        <H3>gamma</H3>
        <A href="https://example.com">click</A>
        <Table>
          <tbody>
            <tr />
          </tbody>
        </Table>
      </div>
    );
  },
}));

jest.mock('remark-gfm', () => ({
  __esModule: true,
  default: () => undefined,
}));

import { MomoStreamingBubble } from './momo-streaming-bubble';

describe('MomoStreamingBubble components map', () => {
  it('maps h1, h2, and h3 to <h3> tags so headings stay bubble-sized', () => {
    render(<MomoStreamingBubble text="ignored" isComplete />);

    for (const label of ['alpha', 'beta', 'gamma']) {
      expect(screen.getByText(label).tagName).toBe('H3');
    }
  });

  it('renders links with target="_blank" and rel="noopener noreferrer"', () => {
    render(<MomoStreamingBubble text="ignored" isComplete />);

    const link = screen.getByRole('link', { name: 'click' });
    expect(link).toHaveAttribute('href', 'https://example.com');
    expect(link).toHaveAttribute('target', '_blank');
    expect(link).toHaveAttribute('rel', 'noopener noreferrer');
  });

  it('wraps tables so they can scroll horizontally inside the bubble', () => {
    const { container } = render(
      <MomoStreamingBubble text="ignored" isComplete />,
    );

    const wrap = container.querySelector('[class*="table-wrap"]');
    expect(wrap).not.toBeNull();
    expect(wrap?.querySelector('table')).not.toBeNull();
  });
});
