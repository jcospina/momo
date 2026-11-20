import { AppNavbarPlaceholder } from '@components/navbar/app-navbar';
import { StatsSkeleton } from '@components/stats/stats-skeleton';
import { Flex } from '@ui/flex/flex';
import { Suspense } from 'react';
import { requireUserId } from '@/app/home/session';
import { getMembership } from '@/lib/data/households/server';
import { loadStats, StatsContent } from './stats-content';

function ignoreRejection() {
  // Deliberately empty; see the note where it is attached.
}

// The first response chunk carries the navbar and skeleton panels; the
// charts stream into them in a single reveal once every query is back.
// Unlike the other /home pages, this one reads one row before that chunk:
// the household membership, so the skeleton draws the Personal / Household
// switch exactly when the loaded page will, and the panels don't jump.
export default async function StatsPage() {
  const userId = await requireUserId();

  // The stats queries start before the membership check, so waiting on it
  // never holds them up.
  const stats = loadStats(userId);
  // A failure (such as the redirect for a missing profile) surfaces where
  // <StatsContent> awaits the load. This only stops it counting as
  // unhandled while the membership check is still running.
  stats.catch(ignoreRejection);

  const membership = await getMembership(userId);

  return (
    <Flex direction="column" padding={3} gap={5}>
      <Suspense
        fallback={
          <>
            <AppNavbarPlaceholder />
            <StatsSkeleton showScopeToggle={membership !== null} />
          </>
        }
      >
        <StatsContent stats={stats} />
      </Suspense>
    </Flex>
  );
}
