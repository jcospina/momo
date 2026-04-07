'use client';

import type { MomoError } from '@lib-types/errors';
import type { SupportedLanguage } from '@lib-types/user-preferences';
import { useTranslations } from 'next-intl';
import { useCallback, useMemo, useState, useTransition } from 'react';
import { setLanguage } from '@/lib/data/prefs/client';
import { Flex } from '@/ui/flex/flex';
import { Select } from '@/ui/select/select';
import { Typography } from '@/ui/typography/typography';

import styles from './profile.module.css';

type LanguageOption = {
  code: SupportedLanguage;
  label: string;
};

type LanguageSelectProps = {
  value?: SupportedLanguage | null;
};

export function LanguageSelect({ value }: LanguageSelectProps) {
  const t = useTranslations('profile.language');
  const tErrors = useTranslations('errors');

  const options: LanguageOption[] = useMemo(
    () => [
      { code: 'en', label: t('en') },
      { code: 'es', label: t('es') },
    ],
    [t],
  );

  const initial = useMemo(
    () => options.find(option => option.code === value) ?? null,
    [options, value],
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
        {t('label')}
      </Typography>
      <Select
        className={styles['profile__currency-select']}
        name="language"
        aria-label={t('ariaLabel')}
        options={options}
        value={selected}
        placeholder={t('placeholder')}
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
          {tErrors(error)}
        </Typography>
      )}
    </div>
  );
}
