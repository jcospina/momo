'use client';

import { Button } from '@ui/button/button';
import { SendIcon } from '@ui/icons/send';
import { Input } from '@ui/input/input';
import { Typography } from '@ui/typography/typography';
import { parseMomoMention } from '@utils/momo-mention';
import { useTranslations } from 'next-intl';
import type { ChangeEvent, FormEvent, KeyboardEvent } from 'react';
import styles from './color-tickets.module.css';

type ChatComposerProps = {
  draft: string;
  onDraftChange: (value: string) => void;
  onKeyDown: (
    event: KeyboardEvent<HTMLTextAreaElement | HTMLInputElement>,
  ) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  /** Whether @momo questions reach the assistant for this person. */
  aiEnabled: boolean;
};

export function ChatComposer({
  draft,
  onDraftChange,
  onKeyDown,
  onSubmit,
  aiEnabled,
}: ChatComposerProps) {
  const t = useTranslations('chat.composer');
  const canSend = draft.trim().length > 0;
  const asksMomo = aiEnabled && parseMomoMention(draft).tagged;

  let hint = aiEnabled ? t('hint') : t('hintNoAi');
  if (asksMomo) hint = t('hintMomo');
  else if (canSend) hint = '';

  return (
    <form className={styles.composer} onSubmit={onSubmit}>
      <div className={styles['composer__row']}>
        <Input
          multiline
          autoResize
          minRows={1}
          maxRows={4}
          value={draft}
          onChange={(
            event: ChangeEvent<HTMLTextAreaElement | HTMLInputElement>,
          ) => onDraftChange(event.target.value)}
          onKeyDown={onKeyDown}
          placeholder={t('placeholder')}
          aria-label={t('ariaLabel')}
          autoComplete="off"
          suffix={
            <Button
              variant="icon"
              type="submit"
              disabled={!canSend}
              aria-label={t('send')}
              className={styles.send}
            >
              <SendIcon width={18} height={18} />
            </Button>
          }
        />
      </div>
      <Typography
        as="p"
        size="sm"
        weight={asksMomo ? 'bold' : 'regular'}
        className={styles.hint}
        data-tone={asksMomo ? 'momo' : undefined}
        aria-live="polite"
      >
        {hint}
      </Typography>
    </form>
  );
}
