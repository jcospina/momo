'use client';

import { MomoMarkdown } from '@components/chat/momo-markdown';
import { MomoThinkingLoader } from '@components/chat/momo-thinking-loader';
import type { ExpenseLine } from '@features/chat/lib/expense-lines';
import type { MomoStreamState } from '@hooks/use-momo-stream';
import type { ChatMessage } from '@lib-types/chat';
import type { ExpenseCategory } from '@lib-types/expenses';
import type { SupportedCurrency } from '@lib-types/user-preferences';
import { Avatar } from '@ui/avatar/avatar';
import { Button } from '@ui/button/button';
import { Divider } from '@ui/divider/divider';
import { ThreeDotsIcon } from '@ui/icons/three-dots';
import { Logo } from '@ui/logo/logo';
import { Menu } from '@ui/menu/menu';
import { Typography } from '@ui/typography/typography';
import { isMomoMessage } from '@utils/chat-message';
import { cn } from '@utils/cn';
import { parseMomoMention } from '@utils/momo-mention';
import { useLocale, useTranslations } from 'next-intl';
import type { ReactNode } from 'react';
import { memberColorVar, memberInkVar } from '@/lib/theme/color-vars';
import { formatDayLabel, formatTime, formatTotals } from './chat-format';
import styles from './color-tickets.module.css';
import { AddingTicket, ColorTicket, OopsTicket, UnsentTicket } from './ticket';

/** Which body a message renders as. Pure, so it can be tested on its own. */
export type RowKind =
  | 'momo'
  | 'sending'
  | 'unsent'
  | 'oops'
  | 'ticket'
  | 'loading-ticket'
  | 'note';

export function rowKind(
  message: ChatMessage,
  isOwn: boolean,
  hasLines: boolean,
): RowKind {
  if (isMomoMessage(message)) return 'momo';
  if (message.id.startsWith('tmp-')) {
    return message.status === 'failed' ? 'unsent' : 'sending';
  }
  if (message.status === 'pending') return 'sending';
  // Someone else's unreadable message is just their note to you.
  if (message.status === 'failed') return isOwn ? 'oops' : 'note';
  if (
    message.expense_count > 0 &&
    (message.status === 'processed' || message.status === 'needs_category')
  ) {
    return hasLines ? 'ticket' : 'loading-ticket';
  }
  return 'note';
}

/**
 * Before the server answers there is no parse; a message with a number in it
 * (and not a question for MoMo) is very likely an expense, so it shows as a
 * ticket being added rather than a note.
 */
function looksLikeExpense(content: string): boolean {
  return /\d/.test(content) && !parseMomoMention(content).tagged;
}

export type RowAuthor = {
  name: string | null;
  /** The member's fixed colour slot; null when unknown. */
  slot: number | null;
};

/** A member's face in their fixed colour. */
export function MemberAvatar({ author }: { author: RowAuthor }) {
  return (
    <Avatar
      size="extra-small"
      displayName={author.name}
      fill={memberColorVar(author.slot)}
      ink={memberInkVar(author.slot)}
    />
  );
}

function MomoAvatar() {
  return (
    <Avatar
      size="extra-small"
      displayName={null}
      color="mauve-magic"
      slot={<Logo size="xs" text="M" />}
    />
  );
}

function OwnMenu({
  onEdit,
  onDelete,
  className,
}: {
  onEdit: () => void;
  onDelete: () => void;
  className?: string;
}) {
  const t = useTranslations('chat.message');
  return (
    <Menu
      align="end"
      items={[
        { type: 'item', label: t('edit'), onSelect: onEdit },
        {
          type: 'item',
          label: t('delete'),
          tone: 'danger',
          onSelect: onDelete,
        },
      ]}
    >
      <Button
        type="button"
        variant="icon"
        className={className}
        aria-label={t('actionsAriaLabel')}
      >
        <ThreeDotsIcon width={16} height={16} />
      </Button>
    </Menu>
  );
}

function TextBubble({
  message,
  isOwn,
  isPending = false,
  isUnsent = false,
}: {
  message: ChatMessage;
  isOwn: boolean;
  isPending?: boolean;
  isUnsent?: boolean;
}) {
  const parts = message.content.split(/((?:^|\s)@momo\b)/i);
  return (
    <div
      className={styles.bubble}
      data-own={isOwn || undefined}
      data-pending={isPending || undefined}
      data-unsent={isUnsent || undefined}
      aria-busy={isPending || undefined}
    >
      <Typography as="p" size="md">
        {parts.map((part, index) =>
          /@momo/i.test(part) ? (
            <Typography
              as="span"
              weight="bold"
              key={`${index}-${part}`}
              className={styles.mention}
            >
              {part}
            </Typography>
          ) : (
            part
          ),
        )}
      </Typography>
    </div>
  );
}

function MomoBubble({
  children,
  isLive,
}: {
  children: ReactNode;
  isLive?: boolean;
}) {
  return (
    <div
      className={cn(styles.bubble, styles['bubble--momo'])}
      aria-live={isLive ? 'polite' : undefined}
    >
      {children}
    </div>
  );
}

function StreamBubble({ stream }: { stream: MomoStreamState }) {
  const t = useTranslations('chat.momo');
  if (stream.status === 'sending') {
    return (
      <MomoBubble isLive>
        <MomoThinkingLoader />
      </MomoBubble>
    );
  }
  if (stream.status === 'error') {
    return (
      <MomoBubble isLive>
        <Typography
          as="p"
          size="md"
          weight="bold"
          role="status"
          className={styles.error}
        >
          {t('streamError')}
        </Typography>
      </MomoBubble>
    );
  }
  return (
    <MomoBubble isLive>
      <MomoMarkdown text={stream.text} />
    </MomoBubble>
  );
}

function DayDivider({
  iso,
  totals,
}: {
  iso: string;
  totals: Map<SupportedCurrency, number>;
}) {
  const t = useTranslations('chat.days');
  const locale = useLocale();
  const total = formatTotals(totals);
  return (
    <div className={styles.day}>
      <span className={styles['day__rule']} aria-hidden>
        <Divider thickness="thin" />
      </span>
      <span className={styles['day__pill']}>
        <Typography as="span" size="sm" weight="bold">
          {formatDayLabel(iso, locale, {
            today: t('today'),
            yesterday: t('yesterday'),
          })}
        </Typography>
        {total ? (
          <Typography as="span" size="sm" className={styles.muted}>
            {' '}
            · {total}
          </Typography>
        ) : null}
      </span>
      <span className={styles['day__rule']} aria-hidden>
        <Divider thickness="thin" />
      </span>
    </div>
  );
}

export type ChatRowProps = {
  message: ChatMessage;
  /** Parsed lines; undefined until loaded. */
  lines: ExpenseLine[] | undefined;
  isOwn: boolean;
  /** Who wrote it, for other people's rows. */
  author: RowAuthor | null;
  isGroupStart: boolean;
  isGroupEnd: boolean;
  dayDivider: {
    iso: string;
    totals: Map<SupportedCurrency, number>;
  } | null;
  /** First row only: older history status. */
  top: 'loading' | 'start' | null;
  stream: MomoStreamState | undefined;
  hasDeleteError: boolean;
  pickError: boolean;
  /** Arrived after the chat opened: animate it in. */
  isFresh: boolean;
  onEdit: (message: ChatMessage) => void;
  onDelete: (message: ChatMessage) => void;
  onRetry: (message: ChatMessage) => void;
  onPick: (
    message: ChatMessage,
    lineId: string,
    category: ExpenseCategory,
  ) => void;
};

export function ChatRow({
  message,
  lines,
  isOwn,
  author,
  isGroupStart,
  isGroupEnd,
  dayDivider,
  top,
  stream,
  hasDeleteError,
  pickError,
  isFresh,
  onEdit,
  onDelete,
  onRetry,
  onPick,
}: ChatRowProps) {
  const t = useTranslations('chat');
  const locale = useLocale();
  const kind = rowKind(message, isOwn, Boolean(lines?.length));
  const side = kind === 'momo' ? 'momo' : isOwn ? 'own' : 'other';
  const isLocal = message.id.startsWith('tmp-');
  const canAct = isOwn && !isLocal;
  const retry = () => onRetry(message);
  const edit = () => onEdit(message);

  const ticketMenu = canAct ? (
    <OwnMenu onEdit={edit} onDelete={() => onDelete(message)} />
  ) : null;

  let body: ReactNode;
  let isPlain = false;
  let isUnsentBubble = false;
  switch (kind) {
    case 'momo':
      isPlain = true;
      body = (
        <MomoBubble>
          <MomoMarkdown text={message.content} />
        </MomoBubble>
      );
      break;
    case 'sending':
    case 'loading-ticket':
      if (kind === 'loading-ticket' || looksLikeExpense(message.content)) {
        body = <AddingTicket message={message} />;
      } else {
        isPlain = true;
        body = <TextBubble message={message} isOwn={isOwn} isPending />;
      }
      break;
    case 'unsent':
      if (looksLikeExpense(message.content)) {
        body = <UnsentTicket message={message} onRetry={retry} />;
      } else {
        isPlain = true;
        isUnsentBubble = true;
        body = <TextBubble message={message} isOwn={isOwn} isUnsent />;
      }
      break;
    case 'oops':
      body = <OopsTicket message={message} menu={ticketMenu} onFix={edit} />;
      break;
    case 'ticket':
      body = (
        <ColorTicket
          message={message}
          lines={lines ?? []}
          isOwn={isOwn}
          menu={ticketMenu}
          onPick={(lineId, category) => onPick(message, lineId, category)}
          onMore={edit}
          pickError={pickError}
        />
      );
      break;
    default:
      isPlain = true;
      body = <TextBubble message={message} isOwn={isOwn} />;
  }

  const showOuterMenu = canAct && isPlain && kind !== 'sending';
  const name =
    side === 'momo' ? 'MoMo' : side === 'other' ? author?.name : null;

  let face: ReactNode = null;
  if (side === 'momo') face = <MomoAvatar />;
  else if (side === 'other' && author) face = <MemberAvatar author={author} />;

  return (
    <div
      className={styles.row}
      data-side={side}
      data-group-start={isGroupStart || undefined}
      data-fresh={isFresh || undefined}
    >
      {top === 'loading' ? (
        <Typography as="p" size="sm" role="status" className={styles.earlier}>
          <span className={styles.dots} aria-hidden>
            <span />
            <span />
            <span />
          </span>
          {t('tickets.loadingEarlier')}
        </Typography>
      ) : null}
      {top === 'start' ? (
        <Typography as="p" size="sm" className={styles.earlier}>
          {t('tickets.beginning')}
        </Typography>
      ) : null}
      {dayDivider ? <DayDivider {...dayDivider} /> : null}

      <div className={styles.line}>
        {side !== 'own' ? (
          <span className={styles['line__face']}>
            {isGroupStart ? face : null}
          </span>
        ) : null}
        <div className={styles['line__stack']}>
          {isGroupStart && name ? (
            <Typography
              as="span"
              size="xs"
              weight="bold"
              className={styles['line__name']}
            >
              {name}
            </Typography>
          ) : null}
          <div className={styles['line__body']}>
            {showOuterMenu ? (
              <OwnMenu
                onEdit={edit}
                onDelete={() => onDelete(message)}
                className={styles['menu--outer']}
              />
            ) : null}
            {body}
          </div>
          {isUnsentBubble ? (
            <Typography as="p" size="sm" className={styles['line__unsent']}>
              {t('tickets.unsent')}.{' '}
              <Button variant="link" type="button" onClick={retry}>
                {t('tickets.tryAgain')}
              </Button>
            </Typography>
          ) : null}
          {isPlain && isGroupEnd && !stream && !isUnsentBubble ? (
            <Typography as="span" size="xs" className={styles['line__time']}>
              {message.momo_invocation_tagged
                ? `${t('tickets.askedMomo')} · `
                : ''}
              {formatTime(message.created_at, locale)}
            </Typography>
          ) : null}
          {hasDeleteError ? (
            <Typography
              as="p"
              size="sm"
              weight="bold"
              role="alert"
              className={styles.error}
            >
              {t('message.deleteError')}
            </Typography>
          ) : null}
        </div>
      </div>

      {stream ? (
        <div className={styles.line} data-stream>
          <span className={styles['line__face']}>
            <MomoAvatar />
          </span>
          <div className={styles['line__stack']}>
            <Typography
              as="span"
              size="xs"
              weight="bold"
              className={styles['line__name']}
            >
              MoMo
            </Typography>
            <StreamBubble stream={stream} />
          </div>
        </div>
      ) : null}
    </div>
  );
}
