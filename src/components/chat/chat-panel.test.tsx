import type { MomoStreamState } from '@hooks/use-momo-stream';
import type { ChatMessage } from '@lib-types/chat';
import { render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';

// react-markdown is ESM-only; mock it. We also flatten the dialog/expense
// component because it's not relevant to the streaming flow under test.
jest.mock('react-markdown', () => ({
  __esModule: true,
  default: ({ children }: { children: string }) => <p>{children}</p>,
}));
jest.mock('remark-gfm', () => ({ __esModule: true, default: () => undefined }));

jest.mock('@components/expense-details/expense-details-dialog', () => ({
  ExpenseDetailsDialog: () => null,
}));

// Disable GSAP animations in the chat bubble for deterministic rendering.
jest.mock('@gsap/react', () => ({
  __esModule: true,
  useGSAP: () => undefined,
}));
jest.mock('gsap', () => ({
  __esModule: true,
  default: { from: () => undefined, fromTo: () => undefined },
}));

// The realtime client provider would otherwise be required for usePersonalRealtime.
// Since our panel-level test mocks useChatPanel entirely, we never hit it; but
// chat-list mounts so its dependencies still matter — none directly require realtime.

const useChatPanelMock = jest.fn();
jest.mock('@features/chat/hooks/use-chat-panel', () => ({
  useChatPanel: () => useChatPanelMock(),
}));

import { ChatPanel } from './chat-panel';

function buildMessage(overrides: Partial<ChatMessage> = {}): ChatMessage {
  return {
    id: 'msg-1',
    household_id: null,
    user_id: 'user-1',
    content: 'hello',
    status: 'processed',
    expense_count: 0,
    created_at: '2026-05-14T00:00:00.000Z',
    sender_name: 'User One',
    author_kind: 'user',
    momo_source: null,
    momo_invocation_tagged: false,
    idempotency_key: null,
    ...overrides,
  };
}

type PanelOverrides = {
  messages?: ChatMessage[];
  pendingStreams?: ReadonlyMap<string, MomoStreamState>;
};

function setPanelState({
  messages = [],
  pendingStreams = new Map(),
}: PanelOverrides) {
  useChatPanelMock.mockReturnValue({
    messages,
    isHousehold: false,
    hasMore: false,
    isLoadingMore: false,
    loadOlder: jest.fn(),
    onDelete: jest.fn(),
    onRetrySend: jest.fn(),
    onOpenExpenseDetails: jest.fn(),
    deleteErrors: {},
    draft: '',
    setDraft: jest.fn(),
    handleKeyDown: jest.fn(),
    handleSubmit: jest.fn(),
    expenseDetailsDialog: {
      isOpen: false,
      openDialog: jest.fn(),
      closeDialog: jest.fn(),
    },
    expenseDetailsMessageId: null,
    onExpenseDetailsSaved: jest.fn(),
    pendingStreams,
  });
}

function renderPanel(node: ReactNode = null) {
  return render(
    <>
      {node}
      <ChatPanel
        scope="personal"
        userId="user-1"
        isActive
        initialMessages={[]}
      />
    </>,
  );
}

describe('ChatPanel — @momo streaming UI', () => {
  beforeEach(() => {
    useChatPanelMock.mockReset();
  });

  it('renders the thinking loader while a stream is in the sending state', () => {
    const triggering = buildMessage({
      id: 'trigger-1',
      content: '@momo q?',
      momo_invocation_tagged: true,
    });
    setPanelState({
      messages: [triggering],
      pendingStreams: new Map([
        ['trigger-1', { status: 'sending', text: '', error: null }],
      ]),
    });

    renderPanel();

    // The MomoThinkingLoader renders with role=status and the localized
    // aria-label "MoMo is thinking" (from en.json).
    expect(screen.getByLabelText('MoMo is thinking')).toBeInTheDocument();
  });

  it('swaps the loader for the streaming bubble once chunks start arriving', () => {
    const triggering = buildMessage({
      id: 'trigger-2',
      content: '@momo q?',
      momo_invocation_tagged: true,
    });
    setPanelState({
      messages: [triggering],
      pendingStreams: new Map([
        [
          'trigger-2',
          { status: 'streaming', text: 'You spent **$204**', error: null },
        ],
      ]),
    });

    renderPanel();

    expect(screen.queryByLabelText('MoMo is thinking')).not.toBeInTheDocument();
    expect(screen.getByText(/You spent/)).toBeInTheDocument();
  });

  it('renders the final streamed text once the stream completes', () => {
    const triggering = buildMessage({
      id: 'trigger-3',
      momo_invocation_tagged: true,
    });
    setPanelState({
      messages: [triggering],
      pendingStreams: new Map([
        ['trigger-3', { status: 'done', text: 'All done.', error: null }],
      ]),
    });

    renderPanel();

    expect(screen.getByText('All done.')).toBeInTheDocument();
    expect(screen.queryByLabelText('MoMo is thinking')).not.toBeInTheDocument();
  });

  it('renders a friendly localized error bubble when the stream errors', () => {
    const triggering = buildMessage({
      id: 'trigger-4',
      momo_invocation_tagged: true,
    });
    setPanelState({
      messages: [triggering],
      pendingStreams: new Map([
        ['trigger-4', { status: 'error', text: '', error: new Error('boom') }],
      ]),
    });

    renderPanel();

    // No raw error text leaks.
    expect(screen.queryByText('boom')).not.toBeInTheDocument();
    // The localized brand-voice copy is shown.
    expect(
      screen.getByText('My brain hiccuped. Mind asking that again?'),
    ).toBeInTheDocument();
  });

  it('does not render any streaming UI when there are no pending streams', () => {
    const triggering = buildMessage({ id: 'msg-untagged' });
    setPanelState({ messages: [triggering], pendingStreams: new Map() });

    renderPanel();

    expect(screen.queryByLabelText('MoMo is thinking')).not.toBeInTheDocument();
  });
});
