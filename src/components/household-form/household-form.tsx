'use client';

import type { PropsWithClassName } from '@lib-types/common';
import type { CreateHouseholdState } from '@lib-types/households';
import { useTranslations } from 'next-intl';
import { useActionState } from 'react';
import { create } from '@/lib/data/households/client';
import { Button } from '@/ui/button/button';
import { Flex } from '@/ui/flex/flex';
import { Input } from '@/ui/input/input';
import { Typography } from '@/ui/typography/typography';

import styles from './household-form.module.css';

type HouseholdFormProps = PropsWithClassName<{
  placeholder?: string;
  submitLabel?: string;
  action?: (
    _prevState: CreateHouseholdState,
    formData: FormData,
  ) => Promise<CreateHouseholdState>;
}>;

export function HouseholdForm({
  className,
  placeholder,
  submitLabel,
  action = create,
}: HouseholdFormProps) {
  const t = useTranslations('household.form');
  const [state, formAction, pending] = useActionState(
    action,
    {} as CreateHouseholdState,
  );

  const resolvedPlaceholder = placeholder ?? t('namePlaceholder');
  const resolvedSubmitLabel = submitLabel ?? t('submit');

  return (
    <Flex
      as="form"
      action={formAction}
      direction="column"
      gap={2}
      className={className}
      isFullWidth
    >
      <Typography as="label" htmlFor="householdName" size="lg" weight="bold">
        {t('nameLabel')}
      </Typography>
      <Flex direction="column" gap={1} isFullWidth>
        <Input
          className={styles['household-form__input']}
          id="householdName"
          name="name"
          type="text"
          placeholder={resolvedPlaceholder}
          required
          autoComplete="name"
          disabled={pending}
        />
        {state.error ? (
          <Typography as="p" size="sm">
            {state.error}
          </Typography>
        ) : null}
      </Flex>
      <Button
        className={styles['household-form__submit']}
        variant="primary"
        type="submit"
        disabled={pending}
      >
        {pending ? t('creating') : resolvedSubmitLabel}
      </Button>
    </Flex>
  );
}
