import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react';
import { AppNavbar } from './app-navbar';

const navigateSpy = jest.fn();
const usePathnameMock = jest.fn();

jest.mock('@providers/navigation-progress-provider', () => ({
  useNavigationProgress: () => ({
    navigate: navigateSpy,
  }),
}));

jest.mock('@providers/profile-provider', () => ({
  useProfile: () => ({
    user_id: 'user-1',
    display_name: 'Momo Demo',
    email: 'demo@momo.local',
    invite_token: 'token',
  }),
}));

jest.mock('@ui/logo/logo', () => ({
  Logo: () => <div>MoMo</div>,
}));

jest.mock('next/navigation', () => ({
  usePathname: () => usePathnameMock(),
}));

async function openMenu() {
  fireEvent.click(
    screen.getByRole('button', { name: /open navigation menu/i }),
  );
  return screen.findByRole('dialog', { name: 'Navigation' });
}

describe('AppNavbar stickers', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    usePathnameMock.mockReturnValue('/home');
  });

  it('shows chat, stats and your profile chip, marking the current route', () => {
    render(<AppNavbar />);

    const links = screen.getAllByRole('link');
    expect(links.map(link => link.textContent)).toEqual([
      'Chat',
      'Stats',
      'MProfile: Momo',
    ]);
    expect(screen.getByRole('link', { name: 'Chat' })).toHaveAttribute(
      'aria-current',
      'page',
    );
    expect(screen.getByRole('link', { name: 'Stats' })).not.toHaveAttribute(
      'aria-current',
    );
  });

  it('navigates when selecting an inactive route', () => {
    render(<AppNavbar />);

    fireEvent.click(screen.getByRole('link', { name: 'Stats' }));

    expect(navigateSpy).toHaveBeenCalledWith('/home/stats');
  });

  it('does not navigate when selecting the current route', () => {
    render(<AppNavbar />);

    fireEvent.click(screen.getByRole('link', { name: 'Chat' }));

    expect(navigateSpy).not.toHaveBeenCalled();
  });

  it('links the logo home everywhere except home', () => {
    usePathnameMock.mockReturnValue('/home/profile');

    render(<AppNavbar />);

    expect(
      screen.getByRole('link', { name: /profile: momo/i }),
    ).toHaveAttribute('aria-current', 'page');
    fireEvent.click(screen.getByRole('link', { name: 'MoMo' }));

    expect(navigateSpy).toHaveBeenCalledWith('/home');
  });
});

describe('AppNavbar phone menu', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    usePathnameMock.mockReturnValue('/home/stats');
  });

  it('names the current page on the menu trigger', () => {
    render(<AppNavbar />);

    expect(
      screen.getByRole('button', { name: /open navigation menu/i }),
    ).toHaveTextContent(/^Stats/);
  });

  it('lists every destination with its purpose and marks the current one', async () => {
    render(<AppNavbar />);

    const menu = await openMenu();

    expect(within(menu).getByText('Where the money went')).toBeInTheDocument();
    expect(within(menu).getByRole('link', { name: /^Stats/ })).toHaveAttribute(
      'aria-current',
      'page',
    );
    expect(
      within(menu).getByRole('link', { name: /^Chat/ }),
    ).not.toHaveAttribute('aria-current');
    expect(within(menu).getByText('Hello,')).toBeInTheDocument();
  });

  it('closes and navigates when selecting an inactive route', async () => {
    render(<AppNavbar />);

    const menu = await openMenu();
    fireEvent.click(within(menu).getByRole('link', { name: /^Chat/ }));

    expect(navigateSpy).toHaveBeenCalledWith('/home');
    await waitFor(() =>
      expect(
        screen.queryByRole('dialog', { name: 'Navigation' }),
      ).not.toBeInTheDocument(),
    );
  });

  it('closes from the close button', async () => {
    render(<AppNavbar />);

    await openMenu();
    fireEvent.click(
      screen.getByRole('button', { name: 'Close navigation menu' }),
    );

    await waitFor(() =>
      expect(
        screen.queryByRole('dialog', { name: 'Navigation' }),
      ).not.toBeInTheDocument(),
    );
  });

  it('closes on Escape', async () => {
    render(<AppNavbar />);

    await openMenu();
    fireEvent.keyDown(document, { key: 'Escape' });

    await waitFor(() =>
      expect(
        screen.queryByRole('dialog', { name: 'Navigation' }),
      ).not.toBeInTheDocument(),
    );
  });
});
