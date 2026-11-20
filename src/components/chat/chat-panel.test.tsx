import type { ExpenseLine } from '@features/chat/lib/expense-lines';
import type { MomoStreamState } from '@hooks/use-momo-stream';
import type { ChatMessage } from '@lib-types/chat';
import { fireEvent, render, screen, within } from '@testing-library/react';

// react-markdown is ESM-only; mock it. The expense dialog is not under test.
jest.mock('react-markdown', () => ({
  __esModule: true,
  default: ({ children }: { children: string }) => <p>{children}</p>,
}));
jest.mock('remark-gfm', () => ({ __esModule: true, default: () => undefined }));

jest.mock('@components/expense-details/expense-details-dialog', () => ({
  ExpenseDetailsDialog: () => null,
}));

const useChatPanelMock = jest.fn();
jest.mock('@features/chat/hooks/use-chat-panel', () => ({
  useChatPanel: () => useChatPanelMock(),
}));

import { ChatPanel } from './chat-panel';
import type { RowAuthor } from './chat-row';

const ME = 'user-1';
const PARTNER = 'user-2';

function buildMessage(overrides: Partial<ChatMessage> = {}): ChatMessage {
  return {
    id: 'msg-1',
    household_id: null,
    user_id: ME,
    content: 'hello',
    status: 'processed',
    expense_count: 0,
    created_at: '2026-05-14T12:00:00.000Z',
    sender_name: 'Alex Doe',
    author_kind: 'user',
    momo_source: null,
    momo_invocation_tagged: false,
    idempotency_key: null,
    ...overrides,
  };
}

function line(overrides: Partial<ExpenseLine> = {}): ExpenseLine {
  return {
    id: 'line-1',
    descriptor: 'Thai orchid',
    amountMinor: 5570,
    currency: 'USD',
    category: 'dining',
    merchant: null,
    expenseDate: '2026-05-14',
    ...overrides,
  };
}

type PanelState = {
  messages?: ChatMessage[];
  lines?: Record<string, ExpenseLine[]>;
  pendingStreams?: ReadonlyMap<string, MomoStreamState>;
};

const handlers = {
  onDelete: jest.fn(),
  onRetrySend: jest.fn(),
  onOpenExpenseDetails: jest.fn(),
  onPickCategory: jest.fn(),
};

function setPanelState({
  messages = [],
  lines = {},
  pendingStreams = new Map(),
}: PanelState) {
  useChatPanelMock.mockReturnValue({
    messages,
    isHousehold: false,
    hasMore: true,
    isLoadingMore: false,
    loadOlder: jest.fn(),
    ...handlers,
    deleteErrors: {},
    pickErrors: {},
    linesByMessageId: new Map(Object.entries(lines)),
    draft: '',
    setDraft: jest.fn(),
    handleKeyDown: jest.fn(),
    handleSubmit: jest.fn(),
    expenseDetailsDialog: {
      open: false,
      onOpenChange: jest.fn(),
      openDialog: jest.fn(),
      closeDialog: jest.fn(),
    },
    expenseDetailsMessageId: null,
    onExpenseDetailsSaved: jest.fn(),
    pendingStreams,
  });
}

const riley: RowAuthor = { name: 'Riley', slot: 2 };

function renderPanel() {
  return render(
    <ChatPanel
      scope="household"
      userId={ME}
      isActive
      initialMessages={[]}
      title="Maple St."
      people={[{ name: 'Alex', slot: 1 }, riley]}
      membersById={new Map([[PARTNER, riley]])}
      aiEnabled
    />,
  );
}

beforeEach(() => {
  for (const handler of Object.values(handlers)) handler.mockReset();
});

describe('ChatPanel — tickets', () => {
  it('prints a logged expense as a ticket dyed in its category colour', () => {
    const message = buildMessage({
      content: 'thai orchid 55.70',
      expense_count: 1,
    });
    setPanelState({ messages: [message], lines: { [message.id]: [line()] } });
    const { container } = renderPanel();

    const ticket = screen.getByRole('article');
    expect(within(ticket).getByText('$55.70')).toBeInTheDocument();
    expect(within(ticket).getByText('Thai orchid')).toBeInTheDocument();
    expect(within(ticket).getByText('Dining')).toBeInTheDocument();
    const paper = container.querySelector('article > div') as HTMLElement;
    expect(paper.style.getPropertyValue('--tint')).toBe(
      'var(--category-dining)',
    );
  });

  it('labels every band of a mixed ticket, even when the name matches', () => {
    const message = buildMessage({
      content: 'groceries 82.40, charrusca 18',
      expense_count: 2,
    });
    setPanelState({
      messages: [message],
      lines: {
        [message.id]: [
          line({
            id: 'line-1',
            descriptor: 'groceries',
            amountMinor: 8240,
            category: 'groceries',
          }),
          line({
            id: 'line-2',
            descriptor: 'charrusca',
            amountMinor: 1800,
            category: 'shopping',
          }),
        ],
      },
    });
    renderPanel();

    const [groceriesBand, charruscaBand] = within(
      screen.getByRole('article'),
    ).getAllByRole('listitem');
    expect(within(groceriesBand).getAllByText('Groceries')).toHaveLength(2);
    expect(within(charruscaBand).getByText('Shopping')).toBeInTheDocument();
  });

  it('asks for a category on your own ticket and files the one you pick', () => {
    const message = buildMessage({
      content: 'thing for mom 45',
      status: 'needs_category',
      expense_count: 1,
    });
    setPanelState({
      messages: [message],
      lines: {
        [message.id]: [line({ descriptor: 'Thing for mom', category: null })],
      },
    });
    renderPanel();

    expect(screen.getAllByText('Which category?').length).toBeGreaterThan(0);
    fireEvent.click(screen.getByRole('button', { name: 'Gifts' }));
    expect(handlers.onPickCategory).toHaveBeenCalledWith(
      message,
      'line-1',
      'gifts',
    );

    fireEvent.click(screen.getByRole('button', { name: 'More…' }));
    expect(handlers.onOpenExpenseDetails).toHaveBeenCalledWith(message);
  });

  it("shows someone else's uncategorised ticket read-only", () => {
    const message = buildMessage({
      user_id: PARTNER,
      sender_name: 'Riley Roe',
      content: 'thing 45',
      status: 'needs_category',
      expense_count: 1,
    });
    setPanelState({
      messages: [message],
      lines: { [message.id]: [line({ category: null })] },
    });
    renderPanel();

    expect(screen.getByText('No category yet')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Gifts' })).toBeNull();
    expect(
      screen.queryByRole('button', { name: 'Message actions' }),
    ).toBeNull();
    expect(screen.getByText('Riley')).toBeInTheDocument();
  });

  it('offers a retry for a message that never reached the server', () => {
    const message = buildMessage({
      id: 'tmp-1',
      content: 'coffee 4',
      status: 'failed',
    });
    setPanelState({ messages: [message] });
    renderPanel();

    expect(screen.getByText('Didn’t send')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
    expect(handlers.onRetrySend).toHaveBeenCalledWith(message);
  });

  it('lets you fix a message whose amount could not be read', () => {
    const message = buildMessage({ content: 'costco run', status: 'failed' });
    setPanelState({ messages: [message] });
    renderPanel();

    expect(screen.getByText('Couldn’t read that one')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Fix it' }));
    expect(handlers.onOpenExpenseDetails).toHaveBeenCalledWith(message);
  });

  it('shows notes without expenses as plain bubbles', () => {
    setPanelState({
      messages: [
        buildMessage({ content: 'remember the gym', status: 'no_expense' }),
      ],
    });
    renderPanel();

    expect(screen.getByText('remember the gym')).toBeInTheDocument();
    expect(screen.queryByRole('article')).toBeNull();
  });

  it('greets an empty chat without sample expenses to click', () => {
    setPanelState({ messages: [] });
    renderPanel();

    expect(screen.getByText('Nothing here yet')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Lunch 12.50' })).toBeNull();
  });
});

describe('ChatPanel — MoMo streaming', () => {
  const question = buildMessage({
    id: 'trigger-1',
    content: '@momo how much?',
    momo_invocation_tagged: true,
  });

  function withStream(stream: MomoStreamState) {
    setPanelState({
      messages: [question],
      pendingStreams: new Map([[question.id, stream]]),
    });
    renderPanel();
  }

  it('shows the thinking loader while the question is sent', () => {
    withStream({ status: 'sending', text: '', error: null });
    expect(screen.getByLabelText('MoMo is thinking')).toBeInTheDocument();
  });

  it('shows the answer as it streams in', () => {
    withStream({ status: 'streaming', text: 'You spent $12', error: null });
    expect(screen.queryByLabelText('MoMo is thinking')).toBeNull();
    expect(screen.getByText(/You spent/)).toBeInTheDocument();
  });

  it('shows a friendly error when the stream fails', () => {
    withStream({ status: 'error', text: '', error: new Error('boom') });
    expect(screen.queryByText('boom')).toBeNull();
    expect(
      screen.getByText('My brain hiccuped. Mind asking that again?'),
    ).toBeInTheDocument();
  });
});
