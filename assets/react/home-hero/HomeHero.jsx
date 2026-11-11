import React, { useCallback, useEffect, useRef, useState } from 'react';
import { LazyMotion, domAnimation, m, useSpring } from 'framer-motion';

function Words({ text }) {
  return text.split(' ').map((word, index) => (
    <React.Fragment key={word + index}>
      {index > 0 ? ' ' : null}
      <span className="ios-hero-word hr-inline-block"><span className="ios-hero-word-ink">{word}</span></span>
    </React.Fragment>
  ));
}

function useHeroMotion() {
  const scene = useRef(null);
  const [ready, setReady] = useState(false);
  const [inView, setInView] = useState(false);
  const [visible, setVisible] = useState(true);
  const [menuOpen, setMenuOpen] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [arrivalReset, setArrivalReset] = useState(false);
  const arrivalFrame = useRef(0);
  const x = useSpring(0, { stiffness: 55, damping: 26, mass: 1.1 });
  const y = useSpring(0, { stiffness: 55, damping: 26, mass: 1.1 });
  const enabled = ready;
  const running = enabled && inView && visible && !menuOpen && !dialogOpen;
  const replay = useCallback(() => {
    if (document.documentElement.dataset.homeMotion !== 'on' && matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    setArrivalReset(true);
    cancelAnimationFrame(arrivalFrame.current);
    arrivalFrame.current = requestAnimationFrame(() => {
      arrivalFrame.current = requestAnimationFrame(() => setArrivalReset(false));
    });
  }, []);

  useEffect(() => {
    const element = scene.current;
    if (!element) return;
    const preference = matchMedia('(prefers-reduced-motion: reduce)');
    const preferenceChange = () => setReady(document.documentElement.dataset.homeMotion === 'on' || !preference.matches);
    preferenceChange();
    preference.addEventListener('change', preferenceChange);
    const measure = () => { const bounds = element.getBoundingClientRect(); setInView(bounds.bottom > 0 && bounds.top < innerHeight); };
    measure();
    const observer = typeof IntersectionObserver === 'function' ? new IntersectionObserver(entries => setInView(entries[0].isIntersecting), { threshold: 0 }) : null;
    observer?.observe(element);
    const visibility = () => setVisible(!document.hidden);
    const navigation = event => setMenuOpen(Boolean(event.detail?.open));
    let wasDialogOpen = false;
    const modalChange = () => {
      const open = Boolean(document.querySelector('dialog[open]'));
      setDialogOpen(open);
      // A first-time visitor reads privacy consent over the hero. Replay the
      // visual arrival when it closes so it is seen, even on a fast connection.
      if (wasDialogOpen && !open) replay();
      wasDialogOpen = open;
    };
    const modalObserver = new MutationObserver(modalChange);
    modalObserver.observe(document.body, { subtree: true, attributes: true, attributeFilter: ['open'] });
    modalChange();
    const pagehide = () => setVisible(false);
    visibility();
    document.addEventListener('visibilitychange', visibility);
    window.addEventListener('pagehide', pagehide);
    window.addEventListener('pageshow', visibility);
    window.addEventListener('sfc:navigation-change', navigation);
    if (!observer) window.addEventListener('scroll', measure, { passive: true });
    return () => {
      observer?.disconnect();
      modalObserver.disconnect();
      cancelAnimationFrame(arrivalFrame.current);
      document.removeEventListener('visibilitychange', visibility);
      window.removeEventListener('pagehide', pagehide);
      window.removeEventListener('pageshow', visibility);
      window.removeEventListener('sfc:navigation-change', navigation);
      window.removeEventListener('scroll', measure);
      preference.removeEventListener('change', preferenceChange);
    };
  }, [replay]);
  useEffect(() => {
    if (!running) { x.stop(); y.stop(); }
    if (!enabled) { x.jump(0); y.jump(0); }
  }, [enabled, running, x, y]);

  const pointer = event => {
    if (!running || event.pointerType !== 'mouse' || !matchMedia('(hover: hover) and (pointer: fine)').matches) return;
    const bounds = event.currentTarget.getBoundingClientRect();
    const horizontal = Math.max(-1, Math.min(1, (event.clientX - bounds.left) / bounds.width * 2 - 1));
    const vertical = Math.max(-1, Math.min(1, (event.clientY - bounds.top) / bounds.height * 2 - 1));
    x.set(horizontal * 8);
    y.set(vertical * 5);
  };
  const reset = () => { if (running) { x.set(0); y.set(0); } };
  return { scene, enabled, activated: enabled, running, x, y, pointer, reset, arrivalReset, obscured: dialogOpen || menuOpen };
}

/** A native page-position readout, rather than a carousel with invented slides. */
function PageProgress() {
  const [stage, setStage] = useState(1);
  useEffect(() => {
    const sections = ['locus-react-hero', 'at-a-glance', 'incentive-recipients', 'why-invest', 'properties', 'investment-concierge', 'about'].map(id => document.getElementById(id));
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
  return <div className="ios-hero-progress hr-flex hr-items-center hr-justify-center hr-gap-2" role="img" aria-label={`Page section ${stage} of 7`}>
    <span>{String(stage).padStart(2, '0')}</span>
    <span className="ios-hero-progress-track hr-flex hr-gap-1" aria-hidden="true">{[1, 2, 3, 4, 5, 6, 7].map(number => <span key={number} className={number <= stage ? 'is-current' : ''} />)}</span>
    <span className="ios-hero-progress-total">07</span>
  </div>;
}

export function HomeHero({ assetBase, availability }) {
  const motion = useHeroMotion();

  return <LazyMotion features={domAnimation} strict>
    <section ref={motion.scene} className="city-hero ios-hero hr-relative hr-isolate hr-overflow-hidden hr-rounded-[28px]" aria-labelledby="heroTitle" data-motion={motion.enabled ? (motion.running ? 'running' : 'paused') : 'off'} data-motion-choice={motion.enabled ? 'on' : 'off'} data-motion-activated={motion.activated ? 'true' : 'false'} data-arrival-reset={motion.arrivalReset ? 'true' : 'false'} data-hero-obscured={motion.obscured ? 'true' : 'false'} onPointerMove={motion.pointer} onPointerLeave={motion.reset} onPointerCancel={motion.reset}>
      <m.div className="ios-hero-scene" style={{ x: motion.x, y: motion.y }}>
        <div className="ios-hero-photo-reveal">
        <img className="ios-hero-photo hr-absolute hr-inset-0 hr-h-full hr-w-full hr-object-cover" src={`${assetBase}/images/landing-city.jpg`} width="1920" height="1080" alt="Aerial view of San Fernando City's streets, buildings and green spaces." fetchPriority="high" />
        </div>
      </m.div>
      <div className="ios-hero-light hr-pointer-events-none hr-absolute hr-inset-0" aria-hidden="true" />
      <div className="ios-hero-aurora hr-pointer-events-none" aria-hidden="true" />
      <div className="ios-hero-vignette hr-pointer-events-none hr-absolute hr-inset-0" aria-hidden="true" />
      <div className="ios-hero-arrival-light" aria-hidden="true" />
      <svg className="ios-hero-arrival-frame" viewBox="0 0 1000 600" preserveAspectRatio="none" fill="none" aria-hidden="true">
        <defs><linearGradient id="heroArrivalStroke" x1="0" y1="0" x2="1000" y2="600" gradientUnits="userSpaceOnUse"><stop stopColor="#fff4e2" /><stop offset=".52" stopColor="#fff" /><stop offset="1" stopColor="#de6671" /></linearGradient></defs>
        <rect x="2" y="2" width="996" height="596" rx="25" pathLength="100" stroke="url(#heroArrivalStroke)" strokeWidth="1.6" vectorEffect="non-scaling-stroke" />
      </svg>
      <div className="ios-hero-layout hr-relative hr-z-10 hr-grid hr-min-w-0">
        <div className="ios-hero-heading hr-text-center">
          <h1 id="heroTitle" className="ios-hero-title" aria-label="Find the place for what comes next.">
            <span className="ios-hero-title-top hr-block"><Words text="Find the place for" /></span>
            <span className="ios-hero-title-next hr-relative hr-block">
              <Words text="WHAT COMES NEXT." />
              <svg className="ios-hero-underline hr-pointer-events-none hr-absolute" viewBox="0 0 900 44" fill="none" aria-hidden="true" preserveAspectRatio="none">
                <defs><linearGradient id="heroUnderlineGlow" x1="0" y1="0" x2="900" y2="0" gradientUnits="userSpaceOnUse"><stop stopColor="#fff" stopOpacity="0" /><stop offset=".22" stopColor="#fff4d6" /><stop offset="1" stopColor="#f2c477" /></linearGradient></defs>
                <path className="ios-hero-underline-draw" d="M12 32C205 4 552 4 886 32" pathLength="100" stroke="url(#heroUnderlineGlow)" strokeWidth="2.5" strokeLinecap="round" />
                <path className="ios-hero-underline-runner ios-hero-underline-halo" d="M12 32C205 4 552 4 886 32" pathLength="100" stroke="#f9ce84" strokeWidth="9" strokeLinecap="round" strokeDasharray="4 96" />
                <path className="ios-hero-underline-runner" d="M12 32C205 4 552 4 886 32" pathLength="100" stroke="#fff8e8" strokeWidth="2.8" strokeLinecap="round" strokeDasharray="4 96" />
              </svg>
            </span>
          </h1>
          <p className="ios-hero-tagline">Start with an idea. Find a place for it in San Fernando.</p>
        </div>

        <div className="ios-hero-bottom hr-grid hr-items-end">
          <div className="ios-hero-explore hr-flex hr-items-center hr-gap-4 hr-rounded-full hr-border hr-border-white/30 hr-bg-white/20 hr-backdrop-blur-lg">
            <a className="ios-hero-cta hr-inline-flex hr-items-center hr-justify-center hr-gap-3 hr-rounded-full hr-bg-[#8B1E24] hr-text-white" href="#properties" data-locus-press="lift">
              <span>Explore properties</span><span aria-hidden="true">↗</span>
            </a>
            <span className="ios-hero-availability">{availability}</span>
          </div>

          <div className="ios-hero-scroll-group hr-grid hr-justify-items-center hr-gap-3">
            <a className="ios-hero-scroll hr-inline-flex hr-items-center hr-justify-center hr-gap-2 hr-rounded-full hr-border hr-border-white/30 hr-bg-white/20 hr-backdrop-blur-lg" href="#at-a-glance" data-locus-press="press">
              <svg className="ios-hero-scroll-arrow" width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M12 4v16m-6-6 6 6 6-6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" /></svg>
              <span>Scroll</span>
            </a>
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
