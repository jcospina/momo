'use client';

import type { MomoStreamState } from '@hooks/use-momo-stream';
import { Avatar } from '@ui/avatar/avatar';
import { Flex } from '@ui/flex/flex';
import { Logo } from '@ui/logo/logo';
import { Margin } from '@ui/margin/margin';
import { Typography } from '@ui/typography/typography';
import { useTranslations } from 'next-intl';
import styles from './momo-stream-item.module.css';
import { MomoStreamingBubble } from './momo-streaming-bubble';
import { MomoThinkingLoader } from './momo-thinking-loader';

type MomoStreamItemProps = {
  state: MomoStreamState;
};

/**
 * Renders the avatar + streaming bubble layout for an in-flight @momo reply.
 *
 * The avatar lives here rather than inside `MomoThinkingLoader` /
 * `MomoStreamingBubble` so those primitives remain reusable. This layout
 * mirrors the incoming-side bubble layout from `ChatMessage` (avatar
 * top-aligned next to the body) so the visual position matches what the
 * persisted MoMo row (rendered by `ChatMessage`) will occupy once it lands.
 */
export function MomoStreamItem({ state }: MomoStreamItemProps) {
  const tChat = useTranslations('chat');

  return (
    <Flex gap={1} alignItems="flex-start" isFullWidth>
      <Margin marginTop={0.5}>
        <Avatar
          size="extra-small"
          displayName={null}
          color="mauve-magic"
          slot={<Logo size="xs" text="M" />}
        />
      </Margin>
      <div className={styles['momo-stream-item__body']}>
        {state.status === 'sending' ? <MomoThinkingLoader /> : null}
        {state.status === 'streaming' || state.status === 'done' ? (
          <MomoStreamingBubble
            text={state.text}
            isComplete={state.status === 'done'}
          />
        ) : null}
        {state.status === 'error' ? (
          <Typography
            as="div"
            size="md"
            role="status"
            aria-live="polite"
            className={styles['momo-stream-item__error']}
          >
            {tChat('momo.streamError')}
          </Typography>
        ) : null}
      </div>
    </Flex>
  );
}
