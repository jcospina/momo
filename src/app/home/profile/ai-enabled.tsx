'use client';
import type { MomoError } from '@lib-types/errors';
import { Checkbox } from '@ui/checkbox/checkbox';
import { Flex } from '@ui/flex/flex';
import { useTranslations } from 'next-intl';
import { useCallback, useId, useState, useTransition } from 'react';
import { setAiEnabled } from '@/lib/data/prefs/client';
import { Typography } from '@/ui/typography/typography';

type CurrencySelectProps = {
  value?: boolean;
};

export function AIEnabled({ value = true }: CurrencySelectProps) {
  const t = useTranslations('profile');
  const tErrors = useTranslations('errors');
  const [error, setError] = useState<MomoError | null>(null);
  const [checked, setChecked] = useState<boolean>(value);
  const [, startTransition] = useTransition();
  const checkboxId = useId();

  const handleChange = useCallback(
    (next: boolean | 'indeterminate') => {
      const nextValue = next === 'indeterminate' ? false : next;
      const prev = checked;
      setChecked(nextValue);
      setError(null);

      startTransition(async () => {
        const result = await setAiEnabled(nextValue);

        if (result && result.errorCode) {
          setError(result.errorCode as MomoError);
          setChecked(prev);
        }
      });
    },
    [checked],
  );

  const errorId = error ? `${checkboxId}-error` : undefined;

  return (
    <Flex paddingLeft={1} isFullWidth justifyContent="space-between">
      <Typography as="label" size="md" weight="bold" htmlFor={checkboxId}>
        {t('aiEnabled')}
      </Typography>
      <Checkbox
        id={checkboxId}
        checked={checked}
        onCheckedChange={handleChange}
        aria-describedby={errorId}
        error={Boolean(error)}
      />
      {error && (
        <Typography id={errorId} size="sm" className="momo-error">
          {tErrors(error)}
        </Typography>
      )}
    </Flex>
  );
}
