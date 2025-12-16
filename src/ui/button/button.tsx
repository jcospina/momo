import { cn } from '@utils/cn';
import Link, { type LinkProps } from 'next/link';
import type { AnchorHTMLAttributes, ButtonHTMLAttributes } from 'react';
import styles from './button.module.css';

type ButtonBaseProps = {
  variant: 'primary' | 'secondary' | 'link';
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

export function Button(props: ButtonProps) {
  const { variant, className, children, ...rest } = props;
  const variantClass = {
    primary: styles['momo-button--primary'],
    secondary: styles['momo-button--secondary'],
    link: styles['momo-button--link'],
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
