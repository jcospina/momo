'use client';

import { useMediaQuery } from '@/hooks/use-media-query';
import { Flex } from '@/ui/flex/flex';
import { Highlight } from '@/ui/highlight/highlight';
import { Logo } from '@/ui/logo/logo';
import { Typography } from '@/ui/typography/typography';

import styles from './auth-shell.module.css';

type AuthShellHeaderProps = {
  welcome: string;
  tagline: string;
};

export function AuthShellHeader({ welcome, tagline }: AuthShellHeaderProps) {
  const isDesktop = useMediaQuery('(min-width: 768px)');
  const headingSize = isDesktop ? 'xxl' : 'display';

  const [taglineLead, ...taglineRest] = tagline
    .split(',')
    .map(part => part.trim())
    .filter(Boolean);

  return (
    <Flex
      direction="column"
      alignItems="center"
      wrap="wrap"
      gap={2}
      className={styles['auth-shell__header']}
      isFullWidth
    >
      <Typography
        as="h1"
        size={headingSize}
        weight="bold"
        className={styles['auth-shell__welcome']}
      >
        {welcome}
      </Typography>
      <Logo className={styles['auth-shell__logo']} />
      <Typography
        as="p"
        size={headingSize}
        weight="bold"
        className={styles['auth-shell__tagline']}
      >
        {taglineLead ? (
          <>
            <Highlight variant="primary">{taglineLead}</Highlight>
            {taglineRest.map((part, index) => (
              <Highlight
                key={`${part}-${index}`}
                variant={index % 2 === 0 ? 'feature' : 'warm'}
                rotation={index % 2 === 0 ? 'right' : 'left'}
              >
                {part}
              </Highlight>
            ))}
          </>
        ) : (
          <Highlight variant="primary" rotation="right">
            {tagline}
          </Highlight>
        )}
      </Typography>
    </Flex>
  );
}
