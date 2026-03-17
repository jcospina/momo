'use client';

import { ERROR_MESSAGES } from '@constants/errors';
import { setLanguage } from '@/lib/data/prefs/client';
import { Flex } from '@/ui/flex/flex';
import { Select } from '@/ui/select/select';
import { Typography } from '@/ui/typography/typography';
import type { MomoError } from '@lib-types/errors';
import type { SupportedLanguage } from '@lib-types/user-preferences';
import { useCallback, useMemo, useState, useTransition } from 'react';

import styles from './profile.module.css';

type LanguageOption = {
  code: SupportedLanguage;
  label: string;
};

const options: LanguageOption[] = [
  { code: 'en', label: 'English' },
  { code: 'es', label: 'Spanish' },
];

type LanguageSelectProps = {
  value?: SupportedLanguage | null;
};

export function LanguageSelect({ value }: LanguageSelectProps) {
  const initial = useMemo(
    () => options.find(option => option.code === value) ?? null,
    [value],
  );
  const [selected, setSelected] = useState<LanguageOption | null>(initial);
  const [error, setError] = useState<MomoError | null>(null);
  const [, startTransition] = useTransition();

  const handleChange = useCallback((option: LanguageOption | null) => {
    if (!option) return;
    setSelected(option);
    startTransition(async () => {
      const result = await setLanguage(option.code);
      if (result && result.errorCode) {
        setError(result.errorCode);
      }
    });
  }, []);

  return (
    <div className={styles['profile__settings-row']}>
      <Typography as="label" size="md" weight="bold">
        Language
      </Typography>
      <Select
        className={styles['profile__currency-select']}
        name="language"
        aria-label="Preferred language"
        options={options}
        value={selected}
        placeholder="Select your language"
        getOptionLabel={option => option.label}
        getOptionValue={option => option.code}
        onChange={handleChange}
        renderOption={option => (
          <Flex alignItems="center" gap={1}>
            <Typography as="span" size="sm" weight="bold">
              {option.label}
            </Typography>
            <Typography as="span" size="sm">
              ({option.code})
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
