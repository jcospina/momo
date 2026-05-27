'use client';

import type { PropsWithClassName } from '@lib-types/common';
import { useTranslations } from 'next-intl';
import { useActionState } from 'react';
import { signupWithPassword } from '@/lib/data/auth/client';
import type { SignupWithPasswordState } from '@/lib/data/auth/types';
import { Button } from '@/ui/button/button';
import { Flex } from '@/ui/flex/flex';
import { Input } from '@/ui/input/input';
import { Typography } from '@/ui/typography/typography';

import styles from './auth-signup-form.module.css';

export function AuthSignupForm({ className }: PropsWithClassName) {
  const t = useTranslations('auth.signup');
  const [state, formAction, pending] = useActionState(
    signupWithPassword,
    {} as SignupWithPasswordState,
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
      <Flex
        direction="column"
        isFullWidth
        className={styles['auth-signup-form__field']}
      >
        <Typography
          as="label"
          htmlFor="auth-signup-email"
          size="md"
          weight="bold"
        >
          {t('emailLabel')}
        </Typography>
        <Input
          id="auth-signup-email"
          name="email"
          type="email"
          placeholder={t('emailPlaceholder')}
          autoComplete="email"
          required
          disabled={pending}
          className={styles['auth-signup-form__input']}
        />
      </Flex>
      <Flex
        direction="column"
        isFullWidth
        className={styles['auth-signup-form__field']}
      >
        <Typography
          as="label"
          htmlFor="auth-signup-password"
          size="md"
          weight="bold"
        >
          {t('passwordLabel')}
        </Typography>
        <Input
          id="auth-signup-password"
          name="password"
          type="password"
          placeholder={t('passwordPlaceholder')}
          autoComplete="new-password"
          required
          minLength={8}
          disabled={pending}
          className={styles['auth-signup-form__input']}
        />
      </Flex>
      {state.error ? (
        <Typography
          as="p"
          size="sm"
          className={styles['auth-signup-form__error']}
        >
          {state.error}
        </Typography>
      ) : null}
      <Button
        variant="primary"
        type="submit"
        disabled={pending}
        className={styles['auth-signup-form__submit']}
      >
        {pending ? t('creatingAccount') : t('createAccount')}
      </Button>
    </Flex>
  );
}
