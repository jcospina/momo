import { ScopeToggle } from '@components/stats/scope-toggle';
import { Flex } from '@ui/flex/flex';
import { Panel } from '@ui/panel/panel';
import { Typography } from '@ui/typography/typography';
import { useTranslations } from 'next-intl';
import styles from '@/app/home/stats/stats.module.css';
import skeletonStyles from './stats-skeleton.module.css';

function PanelSkeleton() {
  return (
    <Panel shadowless className={styles['stats__panel']}>
      <Flex direction="column" gap={1} padding={3}>
        <Typography as="h2" size="lg" weight="bold">
          <span className={skeletonStyles.title}>{'\u00a0'}</span>
        </Typography>
        <Typography size="sm">
          <span className={skeletonStyles.subtitle}>{'\u00a0'}</span>
        </Typography>
      </Flex>
      <div className={styles['stats__chart']}>
        <div className={skeletonStyles.chart} />
      </div>
    </Panel>
  );
}

type StatsSkeletonProps = {
  /** Whether the loaded page will show the Personal / Household switch. */
  showScopeToggle: boolean;
};

/**
 * Chart panels drawn before the stats arrive, so the first paint already
 * has the page's shape. Laid out like <ExpenseScopePanels>, scope switch
 * included, so the real panels replace these in one reveal without moving.
 * No scope is selected yet: the chosen one springs into place on reveal.
 */
export function StatsSkeleton({ showScopeToggle }: StatsSkeletonProps) {
  const t = useTranslations('common');

  return (
    <Flex
      direction="column"
      gap={2}
      isFullWidth
      aria-busy="true"
      aria-label={t('loading')}
      inert
    >
      {showScopeToggle ? <ScopeToggle value={null} /> : null}
      <Flex direction="column" gap={5} isFullWidth>
        <PanelSkeleton />
        <PanelSkeleton />
      </Flex>
    </Flex>
  );
}
