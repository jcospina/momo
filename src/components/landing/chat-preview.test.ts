import { isExpenseCategory } from '@constants/expenses/categories';
import en from '@messages/en.json';
import es from '@messages/es.json';
import { isSupportedCurrency } from '@utils/currency';

jest.mock('react-markdown', () => ({ __esModule: true, default: () => null }));
jest.mock('remark-gfm', () => ({ __esModule: true, default: () => undefined }));

import { rowKind } from '@components/chat/chat-row';
import {
  type PreviewSample,
  previewLines,
  previewMessage,
} from './chat-preview';

function landingSamples(messages: typeof en): PreviewSample[] {
  const { hero, together, parse } = messages.landing;
  return [
    ...hero.chatPreview.desktop.messages,
    ...hero.chatPreview.mobile.samples,
    ...together.thread,
    parse.chat,
  ] as PreviewSample[];
}

describe.each([
  ['en', en],
  ['es', es],
])('landing chat samples (%s)', (_locale, messages) => {
  const samples = landingSamples(messages);

  it.each(
    samples.map(sample => [sample.text, sample]),
  )('"%s" renders like a real chat message', (_text, sample) => {
    const sent = previewMessage('sample', sample, false);
    const done = previewMessage('sample', sample, true);
    const lines = previewLines('sample', sample);

    expect(sample.time).toMatch(/^\d{2}:\d{2}$/);
    expect(rowKind(sent, true, false)).toBe('sending');
    if (sample.expense) {
      expect(isExpenseCategory(sample.expense.category)).toBe(true);
      expect(isSupportedCurrency(sample.expense.currency)).toBe(true);
      expect(rowKind(done, true, Boolean(lines?.length))).toBe('ticket');
    } else {
      expect(lines).toBeUndefined();
      expect(rowKind(done, true, false)).toBe('note');
    }
  });
});
