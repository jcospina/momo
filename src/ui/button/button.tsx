import { cn } from '@utils/cn';
import Link, { type LinkProps } from 'next/link';
import type { AnchorHTMLAttributes, ButtonHTMLAttributes } from 'react';
import styles from './button.module.css';

type ButtonBaseProps = {
  /**
   * Visual variant.
   * - `'primary'` — filled, high-emphasis action.
   * - `'secondary'` — outlined, lower-emphasis action.
   * - `'link'` — inline text-link styling.
   * - `'icon'` — minimal padding, icon-only button.
   */
  variant: 'primary' | 'secondary' | 'link' | 'icon';
  className?: string;
};

type ButtonAsButtonProps = ButtonBaseProps &
  ButtonHTMLAttributes<HTMLButtonElement> & {
    asLink?: false;
  };

type ButtonAsLinkProps = ButtonBaseProps &
  LinkProps &
  Omit<AnchorHTMLAttributes<HTMLAnchorElement>, 'href'> & {
    asLink: true;
  };

type ButtonProps = ButtonAsButtonProps | ButtonAsLinkProps;

/**
 * Polymorphic button that renders either a `<button>` or a Next.js `<Link>`.
 *
 * Set `asLink` to render as an anchor tag with client-side navigation, while
 * keeping the same visual styling. All extra props are forwarded to the
 * underlying element, so you can pass `disabled`, `onClick`, `href`, etc.
 *
 * @example Primary button
 * ```tsx
 * <Button variant="primary" onClick={handleSave}>
 *   Save
 * </Button>
 * ```
 *
 * @example Secondary link-button navigating to a route
 * ```tsx
 * <Button variant="secondary" asLink href="/settings">
 *   Settings
 * </Button>
 * ```
 *
 * @example Icon-only button
 * ```tsx
 * <Button variant="icon" onClick={toggleMenu} aria-label="Menu">
 *   <ThreeDotsIcon width={20} height={20} />
 * </Button>
 * ```
 *
 * @example Disabled state
 * ```tsx
 * <Button variant="primary" disabled>
 *   Processing…
 * </Button>
 * ```
 */
export function Button(props: ButtonProps) {
  const { variant, className, children, ...rest } = props;
  const variantClass = {
    primary: styles['momo-button--primary'],
    secondary: styles['momo-button--secondary'],
    link: styles['momo-button--link'],
    icon: styles['momo-button--icon'],
  }[variant];

  const baseClassName = cn(styles['momo-button'], variantClass, className);
  const { asLink, ...restProps } = rest as
    | ButtonAsButtonProps
    | ButtonAsLinkProps;

  if (asLink) {
    const linkProps = restProps as ButtonAsLinkProps;

    return (
      <Link {...linkProps} className={baseClassName}>
        {children}
      </Link>
    );
  }

  const { disabled, ...buttonProps } = restProps as ButtonAsButtonProps;

  return (
    <button
      className={cn(baseClassName, disabled && styles['momo-button--disabled'])}
      disabled={disabled}
      {...buttonProps}
    >
      {children}
    </button>
  );
}
