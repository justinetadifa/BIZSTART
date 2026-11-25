import React, { useEffect, useRef, useState } from 'react';
import { LazyMotion, domMax, LayoutGroup, m } from 'framer-motion';
import { MetricArt, type MetricKind } from './MetricArt';
import { civicCategories, civicMetrics, type FullMetric } from './metrics';

function updateInsight(metric: FullMetric, preview: boolean, announce: boolean) {
  const panel = document.getElementById('glanceInsight');
  if (!panel) return;
  const related = civicMetrics.find(other => other.categoryId === metric.categoryId && other.id !== metric.id)!;
  const values: Record<string, string> = {
    category: metric.category, label: metric.label, value: metric.value,
    unit: metric.unit || '', source: metric.source, state: preview ? 'Preview · select to keep' : 'Selected indicator',
    'related-category': related.category, 'related-label': related.label,
    'related-value': related.value, 'related-unit': related.unit || '', 'related-source': related.source,
  };
  panel.dataset.currentKey = metric.id;
  Object.entries(values).forEach(([key, value]) => {
    const field = panel.querySelector<HTMLElement>(`[data-insight-${key}]`);
    if (field) field.textContent = value;
  });
  if (announce) {
    const live = document.querySelector('[data-civic-announcement]');
    if (live) live.textContent = `${metric.label}: ${metric.value}${metric.unit ? ` ${metric.unit}` : ''}. ${metric.caption}${metric.growth ? `. ${metric.growth}` : ''}${metric.substat ? `. ${metric.substat}` : ''}. Also in ${metric.category}: ${related.label}, ${related.value}${related.unit ? ` ${related.unit}` : ''}.`;
  }
}

export function CivicMetrics({ assetBase = 'assets' }: { assetBase?: string }) {
  const root = useRef<HTMLElement>(null);
  const [ready, setReady] = useState(false);
  const [selectedId, setSelectedId] = useState<MetricKind>('residents');
  const [previewId, setPreviewId] = useState<MetricKind | null>(null);
  const [motionEnabled, setMotionEnabled] = useState(true);
  const [reducedMotion, setReducedMotion] = useState(true);
  const [inView, setInView] = useState(false);
  const [visible, setVisible] = useState(true);
  const [announcementId, setAnnouncementId] = useState<MetricKind | null>(null);
  const [crowdedBadgeId, setCrowdedBadgeId] = useState<MetricKind | null>(null);

  useEffect(() => {
    const preference = matchMedia('(prefers-reduced-motion: reduce)');
    const motionForced = document.documentElement.dataset.homeMotion === 'on';
    setReducedMotion(preference.matches && !motionForced);
    setMotionEnabled(motionForced || !preference.matches);
    const preferenceChange = (event: MediaQueryListEvent) => {
      setReducedMotion(event.matches && !motionForced);
      setMotionEnabled(motionForced || !event.matches);
    };
    preference.addEventListener('change', preferenceChange);
    const element = root.current;
    const observer = element && typeof IntersectionObserver === 'function'
      ? new IntersectionObserver(entries => setInView(entries[0].isIntersecting), { threshold: 0 }) : null;
    if (element) observer?.observe(element);
    if (!observer) setInView(true);
    const visibility = () => setVisible(!document.hidden);
    visibility();
    document.addEventListener('visibilitychange', visibility);
    setReady(true);
    document.getElementById('at-a-glance')?.setAttribute('data-glance-ready', 'true');
    return () => { observer?.disconnect(); preference.removeEventListener('change', preferenceChange); document.removeEventListener('visibilitychange', visibility); };
  }, []);

  useEffect(() => {
    if (!ready) return;
    // Run after the ready markup commits; the mount effect's first frame can
    // otherwise beat hydration and leave every civic column unregistered.
    const motionFrame = requestAnimationFrame(() => {
      if (root.current) document.dispatchEvent(new CustomEvent('locus:motion-refresh', { detail: root.current }));
    });
    return () => cancelAnimationFrame(motionFrame);
  }, [ready]);

  useEffect(() => {
    const metric = civicMetrics.find(item => item.id === (previewId || selectedId))!;
    updateInsight(metric, Boolean(previewId && previewId !== selectedId), false);
  }, [selectedId, previewId]);
  useEffect(() => {
    if (announcementId) updateInsight(civicMetrics.find(item => item.id === announcementId)!, false, true);
  }, [announcementId]);
  useEffect(() => {
    const card = root.current?.querySelector<HTMLButtonElement>(`[data-metric-id="${selectedId}"]`);
    const wrapper = card?.parentElement;
    const badge = wrapper?.querySelector<HTMLElement>('.civic-selected');
    const growth = card?.querySelector<HTMLElement>('.civic-growth');
    if (!wrapper || !badge || !growth) { setCrowdedBadgeId(null); return; }
    const measure = () => setCrowdedBadgeId(badge.offsetWidth + growth.offsetWidth + 48 > wrapper.clientWidth ? selectedId : null);
    measure();
    const observer = typeof ResizeObserver === 'function' ? new ResizeObserver(measure) : null;
    [wrapper, badge, growth].forEach(element => observer?.observe(element));
    window.addEventListener('resize', measure, { passive: true });
    return () => { observer?.disconnect(); window.removeEventListener('resize', measure); };
  }, [selectedId, ready]);

  const select = (id: MetricKind) => { setSelectedId(id); setPreviewId(null); setAnnouncementId(id); };
  const animate = ready && motionEnabled && !reducedMotion;

  return <LazyMotion features={domMax} strict>
    <section ref={root} className="civic-canvas" aria-labelledby="civicTitle" data-art-motion={animate ? 'on' : 'off'} data-art-running={animate && inView && visible ? 'true' : 'false'} data-civic-ready={ready ? 'true' : 'false'}>
      <header className="civic-header">
        <div className="civic-title-row">
          <h3 id="civicTitle">Get to know the city.</h3>
          <span className="civic-overview">Overview</span>
        </div>
        <div className="civic-settings">
          <button className="civic-switch" type="button" role="switch" aria-checked={animate} aria-label="Animate cards" title={reducedMotion ? 'Animation follows your reduced-motion preference' : 'Animate cards'} disabled={!ready || reducedMotion} onClick={() => setMotionEnabled(value => !value)}>
            <m.span className="civic-switch-thumb" initial={false} animate={{ x: animate ? 18 : 0 }} transition={animate ? { duration: .12, ease: [.22, 1, .36, 1] } : { duration: 0 }} />
          </button>
          <span className="civic-date">2023–2024 Figures</span>
        </div>
      </header>

      <LayoutGroup id="civic-metrics">
        <div className="civic-grid">
          {civicCategories.map(category => <section key={category.id} className="civic-column" aria-labelledby={`civic-category-${category.id}`}>
            <h4 id={`civic-category-${category.id}`} className="civic-category">{category.title}</h4>
            <div className="civic-stack">
              {category.metrics.map(metric => <m.div key={metric.id} className="civic-card-motion" data-crowded-badges={crowdedBadgeId === metric.id ? 'true' : 'false'} initial={false} animate={!animate ? { y: 0, scale: 1 } : undefined} whileHover={animate ? { y: -2, scale: 1.005 } : undefined} whileTap={animate ? { y: 0, scale: .985 } : undefined} transition={animate ? { duration: .16, ease: [.22, 1, .36, 1] } : { duration: 0 }}>
                <button type="button" className={`civic-card civic-card--${metric.theme}`}
                title={metric.landmark}
                data-metric-id={metric.id} data-selected={selectedId === metric.id ? 'true' : 'false'}
                aria-pressed={selectedId === metric.id} aria-controls="glanceInsight" aria-labelledby={`civic-label-${metric.id} civic-value-${metric.id}`} aria-describedby={`civic-source-${metric.id}${metric.substat ? ` civic-substat-${metric.id}` : ''}${metric.growth ? ` civic-growth-${metric.id}` : ''}`} disabled={!ready}
                onClick={() => select(metric.id)} onPointerEnter={event => { if (event.pointerType !== 'touch') setPreviewId(metric.id); }} onPointerLeave={() => setPreviewId(null)} onFocus={() => setPreviewId(metric.id)} onBlur={() => setPreviewId(null)} onKeyDown={event => { if (event.key === 'Escape') select('residents'); }}>
                <MetricArt kind={metric.id} assetBase={assetBase} />
                <span className="civic-card-body">
                  <span className="civic-card-top">
                    <span className="civic-value" id={`civic-value-${metric.id}`}>{metric.value}{metric.unit && <span className="civic-unit">{metric.unit}</span>}</span>
                    {metric.growth && <span className="civic-growth" id={`civic-growth-${metric.id}`}>{metric.growth}</span>}
                  </span>
                  <span className="civic-card-footer">
                    <span className="civic-label" id={`civic-label-${metric.id}`}>{metric.label}</span>
                    {metric.substat && <span className="civic-substat" id={`civic-substat-${metric.id}`}>{metric.substat}</span>}
                    <span className="civic-source" id={`civic-source-${metric.id}`}>{metric.caption}</span>
                  </span>
                </span>
                </button>
                {selectedId === metric.id && <m.span aria-hidden="true" className="civic-selected" layoutId="selectedBadge" transition={animate ? { type: 'spring', stiffness: 420, damping: 32 } : { duration: 0 }}>
                  Selected <svg width="11" height="11" viewBox="0 0 12 12" fill="none"><path d="m2.5 6 2.2 2.2L9.5 3.5" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" /></svg>
                </m.span>}
              </m.div>)}
            </div>
          </section>)}
        </div>
      </LayoutGroup>

      <p className="civic-credit">Source: City government and agency figures, 2023–2024.</p>
      <p className="civic-announcement" role="status" aria-live="polite" aria-atomic="true" data-civic-announcement />
    </section>
  </LazyMotion>;
}
