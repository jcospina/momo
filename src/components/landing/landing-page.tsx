import { LandingNavbar } from '@components/navbar/landing-navbar';
import { CloserSection } from './closer-section';
import { Footer } from './footer';
import { LandingCurtainStage } from './landing-curtain-stage';
import styles from './landing-page.module.css';
import { LandingScrollProvider } from './landing-scroll-context';
import { LenisProvider } from './lenis-provider';
import { SceneParse } from './scenes/scene-parse';
import { SceneStats } from './scenes/scene-stats';
import { SceneTogether } from './scenes/scene-together';

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
