import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react';
import { AppNavbar } from './app-navbar';

const navigateSpy = jest.fn();
const useMediaQueryMock = jest.fn();
const usePathnameMock = jest.fn();

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

  it('shows the mobile rail with the stats shortcut and menu toggle', () => {
    render(<AppNavbar />);

    expect(screen.getByRole('link', { name: 'Stats' })).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Open navigation menu' }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole('link', { name: 'Profile' }),
    ).not.toBeInTheDocument();
  });

  it('navigates to stats from the mobile shortcut without opening the drawer', () => {
    render(<AppNavbar />);

    fireEvent.click(screen.getByRole('link', { name: 'Stats' }));

    expect(navigateSpy).toHaveBeenCalledWith('/home/stats');
    expect(
      screen.queryByRole('dialog', { name: 'Navigation' }),
    ).not.toBeInTheDocument();
  });

  it('swaps the shortcut to chat when on the stats page', () => {
    usePathnameMock.mockReturnValue('/home/stats');

    render(<AppNavbar />);

    expect(
      screen.queryByRole('link', { name: 'Stats' }),
    ).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('link', { name: 'Chat' }));

    expect(navigateSpy).toHaveBeenCalledWith('/home');
  });

  it('renders the drawer list with icons and highlights the current route', async () => {
    render(<AppNavbar />);

    fireEvent.click(
      screen.getByRole('button', { name: 'Open navigation menu' }),
    );

    const drawer = await screen.findByRole('dialog', { name: 'Navigation' });
    expect(within(drawer).getByText('Chat')).toBeInTheDocument();
    expect(within(drawer).getByText('Stats')).toBeInTheDocument();
    expect(within(drawer).getByText('Profile')).toBeInTheDocument();
    expect(
      within(drawer).getByText('Chat').closest('[aria-current="page"]'),
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

    const drawer = await screen.findByRole('dialog', { name: 'Navigation' });
    fireEvent.click(within(drawer).getByRole('link', { name: 'Stats' }));

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
