import { LandingNavbar } from '@components/navbar/landing-navbar';
import { CloserSection } from './footer/closer-section';
import { Footer } from './footer/footer';
import styles from './landing-page.module.css';
import { SceneParse } from './scenes/scene-parse';
import { SceneStats } from './scenes/scene-stats';
import { SceneTogether } from './scenes/scene-together';
import { LandingCurtainStage } from './scroll/landing-curtain-stage';
import { LandingScrollProvider } from './scroll/landing-scroll-context';
import { LenisProvider } from './scroll/lenis-provider';

export function LandingPage() {
  return (
    <LandingScrollProvider>
      <LenisProvider>
        <div className={styles['momo-landing']}>
          <LandingNavbar />
          <LandingCurtainStage>
            <main className={styles['momo-landing__container']}>
              <div className={styles['momo-landing__pinboard']}>
                <SceneParse />
                <SceneTogether />
                <SceneStats />
              </div>
              <CloserSection />
            </main>
            <Footer />
          </LandingCurtainStage>
        </div>
      </LenisProvider>
    </LandingScrollProvider>
  );
}
