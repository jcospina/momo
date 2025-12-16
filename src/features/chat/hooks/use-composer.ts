'use client';

import { useCallback, useState } from 'react';

type UseComposerArgs = {
  onSend: (content: string) => Promise<void> | void;
};

export function useComposer({ onSend }: UseComposerArgs) {
  const [draft, setDraft] = useState('');
  const [isPending, setIsPending] = useState(false);

  const handleSend = useCallback(async () => {
    const trimmed = draft.trim();
    if (!trimmed) return;
    setDraft('');
    setIsPending(true);
    try {
      await onSend(trimmed);
    } finally {
      setIsPending(false);
    }
  }, [draft, onSend]);

  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLTextAreaElement | HTMLInputElement>) => {
      if (event.key === 'Enter' && !event.shiftKey) {
        event.preventDefault();
        handleSend();
      }
    },
    [handleSend],
  );

  const handleSubmit = useCallback(
    (event: React.FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      handleSend();
    },
    [handleSend],
  );

  return {
    draft,
    setDraft,
    isPending,
    handleKeyDown,
    handleSubmit,
  };
}
