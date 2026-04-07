'use client';
import { CURRENCIES } from '@constants/currency';
import type { MomoError } from '@lib-types/errors';
import type { SupportedCurrency } from '@lib-types/user-preferences';
import { useTranslations } from 'next-intl';
import { useCallback, useMemo, useState, useTransition } from 'react';
import { setCurrency } from '@/lib/data/prefs/client';
import { Flex } from '@/ui/flex/flex';
import { Select } from '@/ui/select/select';
import { Typography } from '@/ui/typography/typography';

import styles from './profile.module.css';
export type CurrencyOption = {
  code: SupportedCurrency;
  name: string;
  symbol: string;
};

const options: CurrencyOption[] = Object.entries(CURRENCIES).map(
  ([code, meta]) => ({
    code: code as SupportedCurrency,
    name: meta.name,
    symbol: meta.symbol,
  }),
);

type CurrencySelectProps = {
  value?: SupportedCurrency | null;
};

export function CurrencySelect({ value }: CurrencySelectProps) {
  const t = useTranslations('profile.currency');
  const tErrors = useTranslations('errors');

  const initial = useMemo(
    () => options.find(option => option.code === value) ?? null,
    [value],
  );
  const [selected, setSelected] = useState<CurrencyOption | null>(initial);
  const [error, setError] = useState<MomoError | null>(null);
  const [, startTransition] = useTransition();

  const handleChange = useCallback((option: CurrencyOption | null) => {
    if (!option) return;
    setSelected(option);
    startTransition(async () => {
      const result = await setCurrency(option.code);
      if (result && result.errorCode) {
        setError(result.errorCode);
      }
    });
  }, []);

  return (
    <div className={styles['profile__settings-row']}>
      <Typography as="label" size="md" weight="bold">
        {t('label')}
      </Typography>
      <Select
        className={styles['profile__currency-select']}
        name="currency"
        aria-label={t('ariaLabel')}
        options={options}
        value={selected}
        placeholder={t('placeholder')}
        getOptionLabel={option => `${option.symbol} ${option.name}`}
        getOptionValue={option => option.code}
        onChange={handleChange}
        renderOption={option => (
          <Flex alignItems="center" gap={1}>
            <Typography as="span" size="sm" weight="bold">
              {option.symbol}
            </Typography>
            <Typography as="span" size="sm">
              {option.name}
            </Typography>
          </Flex>
        )}
      />
      {error && (
        <Typography size="sm" className="momo-error">
          {tErrors(error)}
        </Typography>
      )}
    </div>
  );
}
