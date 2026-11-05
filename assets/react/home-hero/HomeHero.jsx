import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { LazyMotion, domAnimation, m, useAnimationControls, useSpring } from 'framer-motion';

const wordVariants = {
  hidden: { y: 20, opacity: 0, filter: 'blur(8px)' },
  visible: index => ({
    y: 0, opacity: 1, filter: 'blur(0px)',
    transition: {
      y: { type: 'spring', stiffness: 170, damping: 24, delay: index * .065 },
      opacity: { duration: .4, delay: index * .065 },
      filter: { duration: .5, delay: index * .065 },
    },
  }),
};

function Words({ text, offset = 0, controls }) {
  return text.split(' ').map((word, index) => (
    <React.Fragment key={word + index}>
      {index > 0 ? ' ' : null}
      <m.span className="ios-hero-word hr-inline-block" initial={false} animate={controls} variants={wordVariants} custom={offset + index}>{word}</m.span>
    </React.Fragment>
  ));
}

function useHeroMotion() {
  const scene = useRef(null);
  const [ready, setReady] = useState(false);
  const [inView, setInView] = useState(false);
  const [visible, setVisible] = useState(true);
  const [menuOpen, setMenuOpen] = useState(false);
  const x = useSpring(0, { stiffness: 65, damping: 24, mass: .8 });
  const y = useSpring(0, { stiffness: 65, damping: 24, mass: .8 });
  const enabled = ready;
  const running = enabled && inView && visible && !menuOpen;

  useEffect(() => {
    const element = scene.current;
    if (!element) return;
    setReady(true);
    const measure = () => { const bounds = element.getBoundingClientRect(); setInView(bounds.bottom > 0 && bounds.top < innerHeight); };
    measure();
    const observer = typeof IntersectionObserver === 'function' ? new IntersectionObserver(entries => setInView(entries[0].isIntersecting), { threshold: 0 }) : null;
    observer?.observe(element);
    const visibility = () => setVisible(!document.hidden);
    const navigation = event => setMenuOpen(Boolean(event.detail?.open));
    const pagehide = () => setVisible(false);
    visibility();
    document.addEventListener('visibilitychange', visibility);
    window.addEventListener('pagehide', pagehide);
    window.addEventListener('pageshow', visibility);
    window.addEventListener('sfc:navigation-change', navigation);
    if (!observer) window.addEventListener('scroll', measure, { passive: true });
    return () => {
      observer?.disconnect();
      document.removeEventListener('visibilitychange', visibility);
      window.removeEventListener('pagehide', pagehide);
      window.removeEventListener('pageshow', visibility);
      window.removeEventListener('sfc:navigation-change', navigation);
      window.removeEventListener('scroll', measure);
    };
  }, []);
  useEffect(() => {
    if (!running) { x.stop(); y.stop(); }
  }, [running, x, y]);

  const pointer = event => {
    if (!running || event.pointerType !== 'mouse' || !matchMedia('(hover: hover) and (pointer: fine)').matches) return;
    const bounds = event.currentTarget.getBoundingClientRect();
    const horizontal = Math.max(-1, Math.min(1, (event.clientX - bounds.left) / bounds.width * 2 - 1));
    const vertical = Math.max(-1, Math.min(1, (event.clientY - bounds.top) / bounds.height * 2 - 1));
    x.set(horizontal * 10);
    y.set(vertical * 7);
  };
  const reset = () => { if (running) { x.set(0); y.set(0); } };
  return { scene, enabled, activated: enabled, running, x, y, pointer, reset };
}

/** A native page-position readout, rather than a carousel with invented slides. */
function PageProgress() {
  const [stage, setStage] = useState(1);
  useEffect(() => {
    const sections = ['locus-react-hero', 'at-a-glance', 'why-invest', 'properties', 'about'].map(id => document.getElementById(id));
    let frame = 0;
    const update = () => {
      frame = 0;
      let next = 1;
      const threshold = Math.min(innerHeight * .4, 260);
      sections.forEach((section, index) => { if (section && section.getBoundingClientRect().top <= threshold) next = index + 1; });
      if (innerHeight + scrollY >= document.documentElement.scrollHeight - 4) next = sections.length;
      setStage(previous => previous === next ? previous : next);
    };
    const schedule = () => { if (!frame) frame = requestAnimationFrame(update); };
    window.addEventListener('scroll', schedule, { passive: true });
    window.addEventListener('resize', schedule, { passive: true });
    window.addEventListener('pageshow', schedule);
    update();
    return () => {
      window.removeEventListener('scroll', schedule);
      window.removeEventListener('resize', schedule);
      window.removeEventListener('pageshow', schedule);
      cancelAnimationFrame(frame);
    };
  }, []);
  return <div className="ios-hero-progress hr-flex hr-items-center hr-justify-center hr-gap-2" role="img" aria-label={`Page section ${stage} of 5`}>
    <span>{String(stage).padStart(2, '0')}</span>
    <span className="ios-hero-progress-track hr-flex hr-gap-1" aria-hidden="true">{[1, 2, 3, 4, 5].map(number => <span key={number} className={number <= stage ? 'is-current' : ''} />)}</span>
    <span className="ios-hero-progress-total">05</span>
  </div>;
}

export function HomeHero({ assetBase, availability }) {
  const motion = useHeroMotion();
  const words = useAnimationControls();
  const underline = useAnimationControls();
  const entered = useRef(false);
  useLayoutEffect(() => {
    const finish = () => { words.stop(); words.set('visible'); underline.stop(); underline.set({ pathLength: 1, opacity: 1 }); };
    // Keep the server headline visible; reveal once when motion is first enabled.
    // Focus and history restoration settle every word immediately.
    const shouldReveal = motion.enabled && !entered.current && scrollY < 64 && !document.hidden;
    if (shouldReveal) {
      entered.current = true;
      words.set('hidden');
      underline.set({ pathLength: 0, opacity: 0 });
      void words.start('visible');
      void underline.start({ pathLength: 1, opacity: 1, transition: { duration: .9, ease: 'easeOut', delay: .35 } });
    } else finish();
    const visibility = () => { if (document.hidden) finish(); };
    window.addEventListener('pagehide', finish);
    document.addEventListener('visibilitychange', visibility);
    document.getElementById('locus-react-hero')?.addEventListener('focusin', finish);
    return () => {
      window.removeEventListener('pagehide', finish);
      document.removeEventListener('visibilitychange', visibility);
      document.getElementById('locus-react-hero')?.removeEventListener('focusin', finish);
      finish();
    };
  }, [motion.enabled, words, underline]);

  return <LazyMotion features={domAnimation} strict>
    <section ref={motion.scene} className="city-hero ios-hero hr-relative hr-isolate hr-overflow-hidden hr-rounded-[28px]" aria-labelledby="heroTitle" data-motion={motion.enabled ? (motion.running ? 'running' : 'paused') : 'off'} data-motion-choice={motion.enabled ? 'on' : 'off'} data-motion-activated={motion.activated ? 'true' : 'false'} onPointerMove={motion.pointer} onPointerLeave={motion.reset} onPointerCancel={motion.reset}>
      <m.div className="ios-hero-scene" style={{ x: motion.x, y: motion.y }}>
        <img className="ios-hero-photo hr-absolute hr-inset-0 hr-h-full hr-w-full hr-object-cover" src={`${assetBase}/images/landing-city.jpg`} width="1920" height="1080" alt="Aerial view of San Fernando City's streets, buildings and green spaces." fetchPriority="high" />
      </m.div>
      <div className="ios-hero-light hr-pointer-events-none hr-absolute hr-inset-0" aria-hidden="true" />
      <div className="ios-hero-aurora hr-pointer-events-none" aria-hidden="true" />
      <div className="ios-hero-vignette hr-pointer-events-none hr-absolute hr-inset-0" aria-hidden="true" />

      <div className="ios-hero-layout hr-relative hr-z-10 hr-grid hr-min-w-0">
        <div className="ios-hero-heading hr-text-center">
          <h1 id="heroTitle" className="ios-hero-title" aria-label="Find the place for what comes next.">
            <span className="ios-hero-title-top hr-block"><Words text="Find the place for" controls={words} /></span>
            <span className="ios-hero-title-next hr-relative hr-block">
              <Words text="WHAT COMES NEXT." offset={4} controls={words} />
              <svg className="ios-hero-underline hr-pointer-events-none hr-absolute" viewBox="0 0 900 44" fill="none" aria-hidden="true" preserveAspectRatio="none">
                <defs><linearGradient id="heroUnderlineGlow" x1="0" y1="0" x2="900" y2="0" gradientUnits="userSpaceOnUse"><stop stopColor="#fff" stopOpacity="0" /><stop offset=".22" stopColor="#fff4d6" /><stop offset="1" stopColor="#f2c477" /></linearGradient></defs>
                <m.path initial={false} animate={underline} d="M12 32C205 4 552 4 886 32" stroke="url(#heroUnderlineGlow)" strokeWidth="2.5" strokeLinecap="round" />
                <path className="ios-hero-underline-runner" d="M12 32C205 4 552 4 886 32" pathLength="100" stroke="#fff3d1" strokeWidth="3.5" strokeLinecap="round" strokeDasharray="12 88" />
              </svg>
            </span>
          </h1>
          <p className="ios-hero-tagline">Start with an idea. Find a place for it in San Fernando.</p>
        </div>

        <div className="ios-hero-bottom hr-grid hr-items-end">
          <div className="ios-hero-explore hr-flex hr-items-center hr-gap-4 hr-rounded-full hr-border hr-border-white/30 hr-bg-white/20 hr-backdrop-blur-lg">
            <m.a className="ios-hero-cta hr-inline-flex hr-items-center hr-justify-center hr-gap-3 hr-rounded-full hr-bg-[#8B1E24] hr-text-white" href="#properties" initial={false} animate="rest" whileHover={motion.enabled ? 'hover' : undefined} whileFocus={motion.enabled ? 'hover' : undefined} whileTap={motion.enabled ? 'tap' : undefined} variants={{ rest: { scale: 1 }, hover: { scale: 1.04 }, tap: { scale: .96 } }} transition={{ type: 'spring', stiffness: 400, damping: 28 }}>
              <span>Explore properties</span><m.span aria-hidden="true" variants={{ rest: { x: 0, y: 0 }, hover: { x: 3, y: -3 }, tap: { x: 0, y: 0 } }}>↗</m.span>
            </m.a>
            <span className="ios-hero-availability">{availability}</span>
          </div>

          <div className="ios-hero-scroll-group hr-grid hr-justify-items-center hr-gap-3">
            <m.a className="ios-hero-scroll hr-inline-flex hr-items-center hr-justify-center hr-gap-2 hr-rounded-full hr-border hr-border-white/30 hr-bg-white/20 hr-backdrop-blur-lg" href="#at-a-glance" whileHover={motion.enabled ? { y: -3, scale: 1.04 } : undefined} whileTap={motion.enabled ? { scale: .96 } : undefined}>
              <svg className="ios-hero-scroll-arrow" width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M12 4v16m-6-6 6 6 6-6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" /></svg>
              <span>Scroll</span>
            </m.a>
            <PageProgress />
          </div>

          <aside className="ios-hero-note hr-rounded-2xl hr-border hr-border-white/40 hr-bg-white/65 hr-backdrop-blur-xl" aria-label="Explore San Fernando">
            <img src={`${assetBase}/images/logoLocusRedBlue.png`} width="30" height="30" alt="" className="ios-hero-note-mark" />
            <p>Explore verified properties and investment opportunities across San Fernando City.</p>
          </aside>
        </div>
      </div>
    </section>
  </LazyMotion>;
}
