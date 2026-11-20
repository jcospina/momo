import { render, screen } from '@testing-library/react';
import { use } from 'react';
import StatsPage from './page';

const statsSkeletonSpy = jest.fn();
const statsContentSpy = jest.fn();

jest.mock('@components/navbar/app-navbar', () => ({
  AppNavbarPlaceholder: () => <div data-testid="navbar-placeholder" />,
}));

jest.mock('@components/stats/stats-skeleton', () => ({
  StatsSkeleton: (props: { showScopeToggle: boolean }) => {
    statsSkeletonSpy(props);
    return <div data-testid="stats-skeleton" />;
  },
}));

// Never resolves, so the page stays on its skeleton.
const pendingForever = new Promise<never>(() => undefined);

jest.mock('./stats-content', () => ({
  loadStats: jest.fn(),
  StatsContent: (props: unknown) => {
    statsContentSpy(props);
    use(pendingForever);
    return null;
  },
}));

jest.mock('@/app/home/session', () => ({
  requireUserId: jest.fn(),
}));

jest.mock('@/lib/data/households/server', () => ({
  getMembership: jest.fn(),
}));

import { requireUserId } from '@/app/home/session';
import { getMembership } from '@/lib/data/households/server';
import { loadStats } from './stats-content';

describe('/home/stats page', () => {
  const requireUserIdMock = jest.mocked(requireUserId);
  const getMembershipMock = jest.mocked(getMembership);
  const loadStatsMock = jest.mocked(loadStats);

  beforeEach(() => {
    jest.resetAllMocks();
    requireUserIdMock.mockResolvedValue('user-1');
    loadStatsMock.mockReturnValue(pendingForever);
  });

  it('draws the scope switch in the skeleton for household members', async () => {
    getMembershipMock.mockResolvedValue({
      household_id: 'house-1',
    } as Awaited<ReturnType<typeof getMembership>>);

    render(await StatsPage());

    expect(screen.getByTestId('navbar-placeholder')).toBeInTheDocument();
    expect(screen.getByTestId('stats-skeleton')).toBeInTheDocument();
    expect(statsSkeletonSpy).toHaveBeenCalledWith({ showScopeToggle: true });
    expect(statsContentSpy).toHaveBeenCalledWith({ stats: pendingForever });
  });

  it('leaves the scope switch out of the skeleton without a household', async () => {
    getMembershipMock.mockResolvedValue(null);

    render(await StatsPage());

    expect(statsSkeletonSpy).toHaveBeenCalledWith({ showScopeToggle: false });
  });

  it('starts the stats load before the membership check comes back', async () => {
    let resolveMembership: (value: null) => void = () => undefined;
    getMembershipMock.mockReturnValue(
      new Promise(resolve => {
        resolveMembership = resolve;
      }),
    );

    const page = StatsPage();
    await Promise.resolve();

    expect(getMembershipMock).toHaveBeenCalledWith('user-1');
    expect(loadStatsMock).toHaveBeenCalledWith('user-1');

    resolveMembership(null);
    await page;
  });

  it('reads nothing when there is no signed-in user', async () => {
    // requireUserId redirects to /login by throwing (see session.test.ts).
    requireUserIdMock.mockRejectedValue(new Error('NEXT_REDIRECT'));

    await expect(StatsPage()).rejects.toThrow('NEXT_REDIRECT');

    expect(loadStatsMock).not.toHaveBeenCalled();
    expect(getMembershipMock).not.toHaveBeenCalled();
  });
});
