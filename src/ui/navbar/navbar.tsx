import { cn } from '@utils/cn';
import type { ReactNode, Ref } from 'react';
import styles from './navbar.module.css';

type NavbarProps = {
  logo: ReactNode;
  themeSelector: ReactNode;
  links?: ReactNode;
  navRef?: Ref<HTMLElement>;
  className?: string;
};

export function Navbar({
  logo,
  themeSelector,
  links,
  navRef,
  className,
}: NavbarProps) {
  return (
    <nav ref={navRef} className={cn(styles['momo-navbar'], className)}>
      <div className={styles['momo-navbar__inner']}>
        <div className={styles['momo-navbar__logo']}>{logo}</div>
        <div className={styles['momo-navbar__links']}>
          {themeSelector}
          {links}
        </div>
      </div>
    </nav>
  );
}
