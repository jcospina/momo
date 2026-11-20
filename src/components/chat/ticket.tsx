'use client';

import { QUICK_PICK_CATEGORIES } from '@constants/expenses/categories';
import type { ExpenseLine } from '@features/chat/lib/expense-lines';
import { totalsByCurrency } from '@features/chat/lib/expense-lines';
import { useCategoryLabel } from '@hooks/use-category-label';
import { useMediaQuery } from '@hooks/use-media-query';
import type { ChatMessage } from '@lib-types/chat';
import type { ExpenseCategory } from '@lib-types/expenses';
import { Button } from '@ui/button/button';
import { Chip } from '@ui/chip/chip';
import { Flex } from '@ui/flex/flex';
import { Typography } from '@ui/typography/typography';
import { cn } from '@utils/cn';
import { formatCurrencyAmount } from '@utils/currency';
import { useLocale, useTranslations } from 'next-intl';
import {
  type CSSProperties,
  type MouseEvent,
  type ReactNode,
  type RefObject,
  useRef,
  useState,
} from 'react';
import { categoryColorVar } from '@/lib/theme/color-vars';
import { formatTime, formatTotals } from './chat-format';
import styles from './color-tickets.module.css';

/** `--tint` drives every dyed surface; no category means plain paper. */
export function tintStyle(
  category: string | null | undefined,
): CSSProperties | undefined {
  if (!category) return undefined;
  return { '--tint': categoryColorVar(category) } as CSSProperties;
}

function sentenceCase(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

/** The ticket's colour when every line shares one category. */
function sharedCategory(lines: ExpenseLine[]): ExpenseCategory | null {
  const first = lines[0]?.category ?? null;
  return lines.every(line => line.category === first) ? first : null;
}

function formatLineAmount(line: ExpenseLine): string {
  // Money coming in reads as a plus, not as spending.
  const sign = line.category === 'income' ? '+' : '';
  return `${sign}${formatCurrencyAmount(line.amountMinor, line.currency)}`;
}

type LabelTone = 'ask' | 'error' | 'pulse' | 'empty';

/** Small pill in a ticket's corner: a dot plus a word or two. */
function TicketLabel({
  tone,
  dots,
  children,
}: {
  tone?: LabelTone;
  /** Categories to show as dots; omitted = one plain dot. */
  dots?: Array<ExpenseCategory | null>;
  children: ReactNode;
}) {
  return (
    <span className={styles.label} data-tone={tone}>
      {dots && dots.length > 1 ? (
        <span className={styles['label__stack']} aria-hidden>
          {dots.map((category, index) => (
            <span
              key={`${category}-${index}`}
              className={styles['label__dot']}
              style={tintStyle(category)}
            />
          ))}
        </span>
      ) : (
        <span
          className={styles['label__dot']}
          style={tintStyle(dots?.[0])}
          aria-hidden
        />
      )}
      <Typography as="span" size="xs" weight="bold">
        {children}
      </Typography>
    </span>
  );
}

export function CategoryLabel({
  category,
}: {
  category: ExpenseCategory | null;
}) {
  const t = useTranslations('chat.tickets');
  const labelFor = useCategoryLabel();
  return (
    <TicketLabel tone={category ? undefined : 'empty'} dots={[category]}>
      {category ? labelFor(category) : t('noCategoryYet')}
    </TicketLabel>
  );
}

type TicketShellProps = {
  message: ChatMessage;
  tone?: 'adding' | 'ask' | 'oops' | 'unsent';
  category?: ExpenseCategory | null;
  label: ReactNode;
  menu?: ReactNode;
  paperRef?: RefObject<HTMLDivElement | null>;
  overlay?: ReactNode;
  children: ReactNode;
};

function TicketShell({
  message,
  tone,
  category = null,
  label,
  menu,
  paperRef,
  overlay,
  children,
}: TicketShellProps) {
  const locale = useLocale();
  return (
    <article className={styles.ticket} data-tone={tone}>
      <div
        ref={paperRef}
        className={styles['ticket__paper']}
        style={tintStyle(category)}
      >
        {overlay}
        <Flex
          as="header"
          alignItems="center"
          justifyContent="space-between"
          gap={1}
          className={styles['ticket__head']}
        >
          {label}
          <Flex as="span" alignItems="center" isInline>
            <Typography
              as="time"
              size="xs"
              dateTime={message.created_at}
              className={styles['ticket__time']}
            >
              {formatTime(message.created_at, locale)}
            </Typography>
            {menu}
          </Flex>
        </Flex>
        {children}
      </div>
    </article>
  );
}

/** One expense: big amount, friendly description. */
function SoloLine({ line }: { line: ExpenseLine }) {
  return (
    <div className={styles['ticket__solo']}>
      <Typography
        as="span"
        size="lg"
        weight="bold"
        className={styles['ticket__figure']}
      >
        {formatLineAmount(line)}
      </Typography>
      <Typography as="span" size="md" className={styles['ticket__desc']}>
        {sentenceCase(line.descriptor)}
      </Typography>
    </div>
  );
}

function TicketQuote({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <Typography
      as="p"
      size="md"
      className={cn(styles['ticket__quote'], className)}
    >
      {children}
    </Typography>
  );
}

/** Sent, waiting for the server to read it. */
export function AddingTicket({ message }: { message: ChatMessage }) {
  const t = useTranslations('chat.tickets');
  return (
    <TicketShell
      message={message}
      tone="adding"
      label={<TicketLabel tone="pulse">{t('adding')}</TicketLabel>}
    >
      <TicketQuote className={styles['ticket__ghost']}>
        <span aria-hidden>{message.content}</span>
        <span className={styles['visually-hidden']}>
          {t('addingAria', { content: message.content })}
        </span>
      </TicketQuote>
    </TicketShell>
  );
}

/** Never reached the server; the person can send it again. */
export function UnsentTicket({
  message,
  onRetry,
}: {
  message: ChatMessage;
  onRetry: () => void;
}) {
  const t = useTranslations('chat.tickets');
  return (
    <TicketShell
      message={message}
      tone="unsent"
      label={<TicketLabel tone="error">{t('unsent')}</TicketLabel>}
    >
      <TicketQuote className={styles['ticket__faded']}>
        {message.content}
      </TicketQuote>
      <Flex alignItems="center" gap={1} wrap="wrap">
        <Typography as="span" size="sm" className={styles.muted}>
          {t('unsentHint')}
        </Typography>
        <Button variant="link" type="button" onClick={onRetry}>
          {t('tryAgain')}
        </Button>
      </Flex>
    </TicketShell>
  );
}

/** Saved, but no amount could be read from it. */
export function OopsTicket({
  message,
  menu,
  onFix,
}: {
  message: ChatMessage;
  menu?: ReactNode;
  onFix: () => void;
}) {
  const t = useTranslations('chat.tickets');
  return (
    <TicketShell
      message={message}
      tone="oops"
      menu={menu}
      label={<TicketLabel tone="error">{t('oops')}</TicketLabel>}
    >
      <TicketQuote>“{message.content}”</TicketQuote>
      <Flex alignItems="center" gap={2} wrap="wrap">
        <Typography as="span" size="sm" className={styles.muted}>
          {t('oopsHint')}
        </Typography>
        <Button variant="primary" type="button" onClick={onFix}>
          {t('fixIt')}
        </Button>
      </Flex>
    </TicketShell>
  );
}

/**
 * Small caption under a colour band. Always shown, even when it matches the
 * descriptor, so every band in a ticket reads the same way.
 */
function BandCaption({
  line,
  isAsking,
}: {
  line: ExpenseLine;
  isAsking: boolean;
}) {
  const t = useTranslations('chat.tickets');
  const labelFor = useCategoryLabel();
  let caption: string;
  if (line.category) {
    caption = labelFor(line.category);
  } else {
    caption = isAsking ? t('whichCategory') : t('noCategoryYet');
  }
  return (
    <Typography
      as="span"
      size="xs"
      weight={line.category ? 'regular' : 'bold'}
      className={styles['ticket__row-cat']}
    >
      {caption}
    </Typography>
  );
}

type Flood = { x: number; y: number; category: ExpenseCategory; key: number };

type ColorTicketProps = {
  message: ChatMessage;
  lines: ExpenseLine[];
  /** Only the author can file categories; others see a read-only ticket. */
  isOwn: boolean;
  menu?: ReactNode;
  onPick?: (lineId: string, category: ExpenseCategory) => void;
  /** Opens the full editor (every category, amounts, dates). */
  onMore?: () => void;
  pickError?: boolean;
};

/** A logged expense ticket, dyed by category; asks when one is missing. */
export function ColorTicket({
  message,
  lines,
  isOwn,
  menu,
  onPick,
  onMore,
  pickError = false,
}: ColorTicketProps) {
  const t = useTranslations('chat.tickets');
  const labelFor = useCategoryLabel();
  const reducedMotion = useMediaQuery('(prefers-reduced-motion: reduce)');
  const paperRef = useRef<HTMLDivElement>(null);
  const [flood, setFlood] = useState<Flood | null>(null);

  const missing = lines.find(line => !line.category);
  const canPick = isOwn && Boolean(missing) && Boolean(onPick);
  const shared = sharedCategory(lines);
  const isMulti = lines.length > 1;
  const isBanded = isMulti && !shared;
  // While the flood plays the paper stays white so the colour can wash in.
  const paperCategory = flood ? null : shared;
  const totals = totalsByCurrency(lines);

  const pick = (
    category: ExpenseCategory,
    event: MouseEvent<HTMLButtonElement>,
  ) => {
    if (!missing || !onPick) return;
    const paper = paperRef.current;
    const isLastMissing = lines.filter(line => !line.category).length === 1;
    if (paper && !reducedMotion && !isMulti && isLastMissing) {
      const paperBox = paper.getBoundingClientRect();
      const chipBox = event.currentTarget.getBoundingClientRect();
      // The wash starts at the chip's dot: its leading padding plus half the dot.
      setFlood({
        x: chipBox.left + 15 - paperBox.left,
        y: chipBox.top + chipBox.height / 2 - paperBox.top,
        category,
        key: Date.now(),
      });
    }
    onPick(missing.id, category);
  };

  let label: ReactNode;
  if (canPick) {
    label = <TicketLabel tone="ask">{t('whichCategory')}</TicketLabel>;
  } else if (isBanded) {
    label = (
      <TicketLabel dots={lines.map(line => line.category)}>
        {t('things', { count: lines.length })}
      </TicketLabel>
    );
  } else {
    label = <CategoryLabel category={shared} />;
  }

  return (
    <TicketShell
      message={message}
      tone={canPick && !flood ? 'ask' : undefined}
      category={paperCategory}
      label={label}
      menu={menu}
      paperRef={paperRef}
      overlay={
        flood ? (
          <span
            key={flood.key}
            className={styles.flood}
            style={
              {
                ...tintStyle(flood.category),
                '--x': `${flood.x}px`,
                '--y': `${flood.y}px`,
              } as CSSProperties
            }
            onAnimationEnd={() => setFlood(null)}
            aria-hidden
          />
        ) : null
      }
    >
      {!isMulti && lines[0] ? (
        <SoloLine line={lines[0]} />
      ) : (
        <ul
          className={styles['ticket__list']}
          data-banded={isBanded || undefined}
        >
          {lines.map(line => (
            <li
              key={line.id}
              className={styles['ticket__row']}
              style={isBanded ? tintStyle(line.category) : undefined}
              data-empty={(isBanded && !line.category) || undefined}
            >
              <span className={styles['ticket__row-text']}>
                <Typography
                  as="span"
                  size="md"
                  className={styles['ticket__row-desc']}
                >
                  {sentenceCase(line.descriptor)}
                </Typography>
                {isBanded ? (
                  <BandCaption line={line} isAsking={canPick} />
                ) : null}
              </span>
              <Typography
                as="span"
                size="md"
                weight="bold"
                className={styles['ticket__amount']}
              >
                {formatLineAmount(line)}
              </Typography>
            </li>
          ))}
        </ul>
      )}
      {isMulti && totals.size > 0 ? (
        <div className={styles['ticket__total']}>
          <Typography as="span" size="sm" weight="bold">
            {t('together')}
          </Typography>
          <Typography
            as="span"
            size="lg"
            weight="bold"
            className={cn(styles['ticket__amount'], styles['ticket__figure'])}
          >
            {formatTotals(totals)}
          </Typography>
        </div>
      ) : null}
      {canPick && missing ? (
        <div className={styles.picker}>
          {isMulti ? (
            <Typography as="p" size="sm" className={styles.muted}>
              {t('whichCategoryFor', { descriptor: missing.descriptor })}
            </Typography>
          ) : null}
          <Flex alignItems="center" gap={0.75} wrap="wrap">
            {QUICK_PICK_CATEGORIES.map(category => (
              <Chip
                key={category}
                dot={categoryColorVar(category)}
                onClick={event => pick(category, event)}
              >
                {labelFor(category)}
              </Chip>
            ))}
            {onMore ? (
              <Button variant="link" type="button" onClick={onMore}>
                {t('more')}
              </Button>
            ) : null}
          </Flex>
          {pickError ? (
            <Typography
              as="p"
              size="sm"
              weight="bold"
              role="alert"
              className={styles.error}
            >
              {t('pickFailed')}
            </Typography>
          ) : null}
        </div>
      ) : null}
    </TicketShell>
  );
}
