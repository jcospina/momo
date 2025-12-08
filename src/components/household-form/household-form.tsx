'use client';

import { useActionState } from 'react';

import { createHousehold } from '@actions/households';
import { Button } from '@components/button/button';
import { Flex } from '@components/flex/flex';
import { Input } from '@components/input/input';
import { Typography } from '@components/typography/typography';
import type { PropsWithClassName } from '@lib-types/common';
import type { CreateHouseholdState } from '@lib-types/households';

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
  placeholder = "e.g. Papa's little nest",
  submitLabel = 'Create household',
  action = createHousehold,
}: HouseholdFormProps) {
  const [state, formAction, pending] = useActionState(
    action,
    {} as CreateHouseholdState,
  );

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
        Household name
      </Typography>
      <Flex direction="column" gap={1} isFullWidth>
        <Input
          className={styles['household-form__input']}
          id="householdName"
          name="name"
          type="text"
          placeholder={placeholder}
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
        {pending ? 'Creating...' : submitLabel}
      </Button>
    </Flex>
  );
}
