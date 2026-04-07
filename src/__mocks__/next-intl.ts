// Mock for next-intl in Jest tests.
// Uses the actual en.json messages so tests can find translated text.

import messages from '@messages/en.json';

function getNestedValue(obj: Record<string, unknown>, path: string): string {
  const parts = path.split('.');
  let current: unknown = obj;
  for (const part of parts) {
    if (current == null || typeof current !== 'object') return path;
    current = (current as Record<string, unknown>)[part];
  }
  return typeof current === 'string' ? current : path;
}

type TranslationFn = ((
  key: string,
  values?: Record<string, unknown>,
) => string) & {
  rich: (key: string, values?: Record<string, unknown>) => string;
};

export function useTranslations(namespace?: string): TranslationFn {
  const fn = (key: string): string => {
    const fullKey = namespace ? `${namespace}.${key}` : key;
    return getNestedValue(messages as Record<string, unknown>, fullKey);
  };
  fn.rich = (key: string): string => fn(key);
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
