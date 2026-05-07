import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { AppNavbar } from './app-navbar';

const navigateSpy = jest.fn();
const useMediaQueryMock = jest.fn();
const usePathnameMock = jest.fn();

jest.mock('@components/theme-selector/theme-selector', () => ({
  ThemeSelector: () => <div data-testid="theme-selector">Theme</div>,
}));

jest.mock('@providers/navigation-progress-provider', () => ({
  useNavigationProgress: () => ({
    navigate: navigateSpy,
  }),
}));

jest.mock('@hooks/use-media-query', () => ({
  useMediaQuery: (query: string) => useMediaQueryMock(query),
}));

jest.mock('@ui/logo/logo', () => ({
  Logo: () => <div>MoMo</div>,
}));

jest.mock('next/navigation', () => ({
  usePathname: () => usePathnameMock(),
}));

describe('AppNavbar desktop links', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    usePathnameMock.mockReturnValue('/home');
    useMediaQueryMock.mockImplementation((query: string) => {
      if (query === '(max-width: 720px)') return false;
      if (query === '(prefers-reduced-motion: reduce)') return false;
      return false;
    });
  });

  it('shows all links in chat, stats, profile order and highlights the current route', () => {
    render(<AppNavbar />);

    expect(screen.getByTestId('theme-selector')).toBeInTheDocument();

    const navLinks = screen.getAllByRole('link');
    expect(navLinks.map(link => link.textContent)).toEqual([
      'Chat',
      'Stats',
      'Profile',
    ]);
    expect(screen.getByRole('link', { name: 'Chat' })).toHaveAttribute(
      'aria-current',
      'page',
    );
  });

  it('navigates when selecting an inactive desktop route', () => {
    render(<AppNavbar />);

    fireEvent.click(screen.getByRole('link', { name: 'Stats' }));

    expect(navigateSpy).toHaveBeenCalledWith('/home/stats');
  });
});

describe('AppNavbar mobile drawer', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    usePathnameMock.mockReturnValue('/home');
    useMediaQueryMock.mockImplementation((query: string) => {
      if (query === '(max-width: 720px)') return true;
      if (query === '(prefers-reduced-motion: reduce)') return false;
      return false;
    });
  });

  it('shows the mobile rail with the theme selector and menu toggle', () => {
    render(<AppNavbar />);

    expect(screen.getByTestId('theme-selector')).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Open navigation menu' }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole('link', { name: 'Stats' }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole('link', { name: 'Profile' }),
    ).not.toBeInTheDocument();
  });

  it('renders the drawer list with icons and highlights the current route', async () => {
    render(<AppNavbar />);

    fireEvent.click(
      screen.getByRole('button', { name: 'Open navigation menu' }),
    );

    expect(
      await screen.findByRole('dialog', { name: 'Navigation' }),
    ).toBeInTheDocument();
    expect(screen.getByText('Chat')).toBeInTheDocument();
    expect(screen.getByText('Stats')).toBeInTheDocument();
    expect(screen.getByText('Profile')).toBeInTheDocument();
    expect(
      screen.getByText('Chat').closest('[aria-current="page"]'),
    ).toHaveAttribute('aria-current', 'page');
  });

  it('closes the drawer on backdrop click', async () => {
    render(<AppNavbar />);

    fireEvent.click(
      screen.getByRole('button', { name: 'Open navigation menu' }),
    );

    const backdrop = await screen.findByTestId('app-navbar-drawer-backdrop');
    fireEvent.click(backdrop);

    await waitFor(() =>
      expect(
        screen.queryByRole('dialog', { name: 'Navigation' }),
      ).not.toBeInTheDocument(),
    );
  });

  it('closes the drawer and navigates when selecting an inactive route', async () => {
    render(<AppNavbar />);

    fireEvent.click(
      screen.getByRole('button', { name: 'Open navigation menu' }),
    );

    fireEvent.click(await screen.findByRole('link', { name: 'Stats' }));

    expect(navigateSpy).toHaveBeenCalledWith('/home/stats');
    await waitFor(() =>
      expect(
        screen.queryByRole('dialog', { name: 'Navigation' }),
      ).not.toBeInTheDocument(),
    );
  });

  it('closes the drawer on Escape', async () => {
    render(<AppNavbar />);

    fireEvent.click(
      screen.getByRole('button', { name: 'Open navigation menu' }),
    );

    expect(
      await screen.findByRole('dialog', { name: 'Navigation' }),
    ).toBeInTheDocument();
    fireEvent.keyDown(document, { key: 'Escape' });

    await waitFor(() =>
      expect(
        screen.queryByRole('dialog', { name: 'Navigation' }),
      ).not.toBeInTheDocument(),
    );
  });

  it('still opens and closes correctly when reduced motion is preferred', async () => {
    useMediaQueryMock.mockImplementation((query: string) => {
      if (query === '(max-width: 720px)') return true;
      if (query === '(prefers-reduced-motion: reduce)') return true;
      return false;
    });

    render(<AppNavbar />);

    const toggle = screen.getByRole('button', {
      name: 'Open navigation menu',
    });

    fireEvent.click(toggle);
    expect(
      await screen.findByRole('dialog', { name: 'Navigation' }),
    ).toBeInTheDocument();

    fireEvent.click(
      screen.getByRole('button', { name: 'Close navigation menu' }),
    );

    await waitFor(() =>
      expect(
        screen.queryByRole('dialog', { name: 'Navigation' }),
      ).not.toBeInTheDocument(),
    );
  });
});
