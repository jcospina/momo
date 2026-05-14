// Mock for next-intl in Jest tests.
// Uses the actual en.json messages so tests can find translated text.

import messages from '@messages/en.json';

function getNestedRaw(obj: Record<string, unknown>, path: string): unknown {
  const parts = path.split('.');
  let current: unknown = obj;
  for (const part of parts) {
    if (current == null || typeof current !== 'object') return undefined;
    current = (current as Record<string, unknown>)[part];
  }
  return current;
}

function getNestedValue(obj: Record<string, unknown>, path: string): string {
  const value = getNestedRaw(obj, path);
  return typeof value === 'string' ? value : path;
}

type TranslationFn = ((
  key: string,
  values?: Record<string, unknown>,
) => string) & {
  rich: (key: string, values?: Record<string, unknown>) => string;
  raw: (key: string) => unknown;
};

export function useTranslations(namespace?: string): TranslationFn {
  const fn = (key: string): string => {
    const fullKey = namespace ? `${namespace}.${key}` : key;
    return getNestedValue(messages as Record<string, unknown>, fullKey);
  };
  fn.rich = (key: string): string => fn(key);
  fn.raw = (key: string): unknown => {
    const fullKey = namespace ? `${namespace}.${key}` : key;
    return getNestedRaw(messages as Record<string, unknown>, fullKey);
  };
  return fn as TranslationFn;
}

export function useLocale() {
  return 'en';
}

export function useMessages() {
  return messages;
}

export function NextIntlClientProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
