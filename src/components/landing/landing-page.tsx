import { CloserSection } from './closer-section';
import { FeaturesSection } from './features-section';
import { Footer } from './footer';
import { HowItWorks } from './how-it-works';
import { LandingCurtainStage } from './landing-curtain-stage';
import { LandingNavbar } from './landing-navbar';
import styles from './landing-page.module.css';
import { LandingScrollProvider } from './landing-scroll-context';
import { LandingScrollIndicator } from './landing-scroll-indicator';
import { LenisProvider } from './lenis-provider';

export function LandingPage() {
  return (
    <LandingScrollProvider>
      <LenisProvider>
        <div className={styles['momo-landing']}>
          <LandingNavbar />
          <LandingCurtainStage>
            <main className={styles['momo-landing__container']}>
              <FeaturesSection />
              <HowItWorks />
              <CloserSection />
            </main>
            <Footer />
          </LandingCurtainStage>
        </div>
      </LenisProvider>
    </LandingScrollProvider>
  );
}
