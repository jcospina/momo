import styles from './landing-scroll-indicator.module.css';

export function LandingScrollIndicator() {
  return (
    <div className={styles['momo-landing-scroll-indicator']} aria-hidden="true">
      <span className={styles['momo-landing-scroll-indicator__arrow']} />
      <span className={styles['momo-landing-scroll-indicator__arrow']} />
    </div>
  );
}
