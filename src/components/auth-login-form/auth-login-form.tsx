'use client';

import type { PropsWithClassName } from '@lib-types/common';
import { useTranslations } from 'next-intl';
import { useActionState } from 'react';
import { loginWithPassword } from '@/lib/data/auth/client';
import type { LoginWithPasswordState } from '@/lib/data/auth/types';
import { Button } from '@/ui/button/button';
import { Flex } from '@/ui/flex/flex';
import { Input } from '@/ui/input/input';
import { Typography } from '@/ui/typography/typography';

import styles from './auth-login-form.module.css';

export function AuthLoginForm({ className }: PropsWithClassName) {
  const t = useTranslations('auth.login');
  const [state, formAction, pending] = useActionState(
    loginWithPassword,
    {} as LoginWithPasswordState,
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
        className={styles['auth-login-form__field']}
      >
        <Typography
          as="label"
          htmlFor="auth-login-email"
          size="md"
          weight="bold"
        >
          {t('emailLabel')}
        </Typography>
        <Input
          id="auth-login-email"
          name="email"
          type="email"
          placeholder={t('emailPlaceholder')}
          autoComplete="email"
          required
          disabled={pending}
          className={styles['auth-login-form__input']}
        />
      </Flex>
      <Flex
        direction="column"
        isFullWidth
        className={styles['auth-login-form__field']}
      >
        <Typography
          as="label"
          htmlFor="auth-login-password"
          size="md"
          weight="bold"
        >
          {t('passwordLabel')}
        </Typography>
        <Input
          id="auth-login-password"
          name="password"
          type="password"
          placeholder={t('passwordPlaceholder')}
          autoComplete="current-password"
          required
          disabled={pending}
          className={styles['auth-login-form__input']}
        />
      </Flex>
      {state.error ? (
        <Typography
          as="p"
          size="sm"
          className={styles['auth-login-form__error']}
        >
          {state.error}
        </Typography>
      ) : null}
      <Button
        variant="primary"
        type="submit"
        disabled={pending}
        className={styles['auth-login-form__submit']}
      >
        {pending ? t('signingIn') : t('signInPassword')}
      </Button>
    </Flex>
  );
}
