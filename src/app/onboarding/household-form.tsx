'use client';

import { useActionState } from 'react';

import { createHousehold } from '@actions/households';

import { Button } from '@components/button/button';
import { Input } from '@components/input/input';
import type { CreateHouseholdState } from '@lib-types/households';

import styles from './household-form.module.css';

export function HouseholdForm() {
  const initialState: CreateHouseholdState = {};
  const [state, formAction, isPending] = useActionState(
    createHousehold,
    initialState,
  );

  return (
    <form action={formAction} className={styles['household-form']}>
      <div className={styles['household-form__input']}>
        <label htmlFor="householdName">Household name</label>
        <Input
          id="householdName"
          type="text"
          name="name"
          placeholder="e.g. Papa's little nest"
          required
          autoComplete="name"
          disabled={isPending}
        />
        {state.error ? (
          <p className="text-sm text-rufous">{state.error}</p>
        ) : null}
      </div>
      <Button
        type="submit"
        disabled={isPending}
        variant="primary"
        className={styles['household-form__submit']}
      >
        {isPending ? 'Creating household...' : 'Create household'}
      </Button>
    </form>
  );
}
