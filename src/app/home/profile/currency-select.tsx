'use client';
import { CURRENCIES } from '@constants/currency';
import { ERROR_MESSAGES } from '@constants/errors';
import { Flex } from '@/ui/flex/flex';
import { Select } from '@/ui/select/select';
import { Typography } from '@/ui/typography/typography';
import { setCurrency } from '@actions/user-prefs';
import { MomoError } from '@lib-types/errors';
import type { SupportedCurrency } from '@lib-types/user-preferences';
import { useCallback, useMemo, useState, useTransition } from 'react';

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
        Currency
      </Typography>
      <Select
        className={styles['profile__currency-select']}
        name="currency"
        aria-label="Preferred currency"
        options={options}
        value={selected}
        placeholder="Select your currency"
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
          {ERROR_MESSAGES[error]}
        </Typography>
      )}
    </div>
  );
}
