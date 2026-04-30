import { CloserSection } from './closer-section';
import { FeaturesSection } from './features-section';
import { Footer } from './footer';
import { Hero } from './hero';
import { HowItWorks } from './how-it-works';
import styles from './landing.module.css';
import { LandingNavbar } from './landing-navbar';

export function LandingPage() {
  return (
    <div className={styles['momo-landing']}>
      <LandingNavbar />
      <main className={styles['momo-landing__container']}>
        <Hero />
        <FeaturesSection />
        <HowItWorks />
        <CloserSection />
      </main>
      <Footer />
    </div>
  );
}
