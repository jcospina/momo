import DotGrid from '@ui/dot-grid/dot-grid';
import { Flex } from '@ui/flex/flex';
import { Logo } from '@ui/logo/logo';
import { Typography } from '@ui/typography/typography';
import { headers } from 'next/headers';
import { getTranslations } from 'next-intl/server';
import styles from './not-found.module.css';

export default async function NotFound() {
  const ua = (await headers()).get('user-agent') || '';
  const isMobile = /Mobi|Android|iPhone|iPad|iPod/i.test(ua);
  const t = await getTranslations('common.notFound');
  return (
    <Flex
      direction="column"
      justifyContent="center"
      alignItems="center"
      className={styles['not-found']}
      paddingX={2}
    >
      <DotGrid blastStrength={4} blastRadius={100} disableHover={isMobile} />
      <Flex
        direction="column"
        paddingX={3}
        paddingY={4}
        gap={4}
        className={styles['not-found__panel']}
      >
        <Logo text="404" />
        <Flex direction="column" gap={2}>
          <Typography size="xl" as="h1">
            {t('message')}
          </Typography>
          <Typography size="xl" as="h2">
            {t('tagline')}
          </Typography>
        </Flex>
      </Flex>
    </Flex>
  );
}
