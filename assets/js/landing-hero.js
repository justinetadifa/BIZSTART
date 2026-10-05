(() => {
    'use strict';

    const hero = document.querySelector('[data-locus-hero]');
    if (!hero) return;

    const orbit = hero.querySelector('[data-criterion-orbit]');
    const icons = orbit ? Array.from(orbit.querySelectorAll('[data-orbit-icon]')) : [];
    const iaiStage = hero.querySelector('[data-iai-stage]');
    const iaiGraphic = hero.querySelector('[data-iai-graphic]');
    const iaiProgress = hero.querySelector('[data-iai-progress]');
    const motionPreference = window.matchMedia('(prefers-reduced-motion: reduce)');
    const fullCircle = Math.PI * 2;
    const states = icons.map((element, index) => {
        const duration = 19000 + ((index * 7) % 6) * 1000;
        element.dataset.orbitDuration = String(duration);
        return {
            element,
            index,
            angle: (-Math.PI / 2 + ((Number(element.dataset.orbitIndex) || index) / Math.max(icons.length, 1)) * fullCircle + fullCircle) % fullCircle,
            angularSpeed: fullCircle / duration,
            organicPhase: index * 0.73,
            radiusX: 0,
            radiusY: 0,
            hovered: false,
            focused: false
        };
    });

    let reducedMotion = motionPreference.matches;
    let heroVisible = isVisible(hero);
    let orbitVisible = isVisible(orbit);
    let iaiVisible = isVisible(iaiStage);
    let frameId = 0;
    let lastFrame = 0;
    let pageActive = true;
    let iaiReady = !iaiGraphic || (iaiGraphic.complete && iaiGraphic.naturalWidth > 0);
    let iaiStarted = false;
    let iaiCompleted = false;
    let orbitEntranceDone = false;
    let iaiEntranceDone = false;
    let entranceRun = 0;
    let activeEntrance = null;
    let motionTime = 0;
    let lastProcessing = -Infinity;
    let processingTimer = 0;
    const iaiAnimations = new Set();

    function isVisible(element) {
        if (!element) return false;
        const rectangle = element.getBoundingClientRect();
        return rectangle.bottom > 0 && rectangle.right > 0 && rectangle.top < window.innerHeight && rectangle.left < window.innerWidth;
    }

    function renderIcon(state) {
        // Small, deterministic inward variations retain the container's safe edge.
        const radiusX = Math.max(0, state.radiusX - 2.5 + Math.sin(state.angle * 3 + state.organicPhase) * 2.5);
        const radiusY = Math.max(0, state.radiusY - 2.5 + Math.cos(state.angle * 2 + state.organicPhase) * 2.5);
        state.element.style.setProperty('--orbit-x', `${(Math.cos(state.angle) * radiusX).toFixed(2)}px`);
        state.element.style.setProperty('--orbit-y', `${(Math.sin(state.angle) * radiusY).toFixed(2)}px`);
    }

    function positionTooltip(state) {
        state.element.style.setProperty('--tip-shift', '0px');
        if (!state.hovered && !state.focused) return;
        const tooltip = state.element.querySelector('[role="tooltip"]');
        if (!tooltip) return;
        // Measure the centered label without an in-flight transform transition.
        const previousTransition = tooltip.style.transitionProperty;
        tooltip.style.transitionProperty = 'opacity, visibility';
        const rectangle = tooltip.getBoundingClientRect();
        const shift = Math.max(12 - rectangle.left, 0) - Math.max(rectangle.right - window.innerWidth + 12, 0);
        state.element.style.setProperty('--tip-shift', `${shift.toFixed(2)}px`);
        tooltip.getBoundingClientRect();
        tooltip.style.transitionProperty = previousTransition;
    }

    function measureOrbit() {
        if (!orbit) return;
        const width = orbit.clientWidth;
        const height = orbit.clientHeight;
        states.forEach((state) => {
            state.radiusX = Math.max(0, width / 2 - state.element.offsetWidth / 2 - 8);
            state.radiusY = Math.max(0, height / 2 - state.element.offsetHeight / 2 - 8);
            renderIcon(state);
            if (state.hovered || state.focused) positionTooltip(state);
        });
    }

    function canOrbit() {
        return states.length > 0 && orbitEntranceDone && !reducedMotion && orbitVisible && pageActive && !document.hidden;
    }

    function stopOrbit() {
        if (frameId) window.cancelAnimationFrame(frameId);
        frameId = 0;
        lastFrame = 0;
    }

    function animateOrbit(time) {
        frameId = 0;
        if (!canOrbit()) {
            lastFrame = 0;
            return;
        }
        const elapsed = lastFrame ? Math.min(time - lastFrame, 100) : 0;
        lastFrame = time;
        motionTime += elapsed;
        states.forEach((state) => {
            if (state.hovered || state.focused) return;
            const previousAngle = state.angle;
            state.angle = (state.angle + elapsed * state.angularSpeed) % fullCircle;
            renderIcon(state);
            if (previousAngle < Math.PI && state.angle >= Math.PI) signalProcessing(state);
        });
        frameId = window.requestAnimationFrame(animateOrbit);
    }

    function clearProcessing() {
        window.clearTimeout(processingTimer);
        processingTimer = 0;
        hero.classList.remove('is-mce-processing');
    }

    function signalProcessing(state) {
        if (motionTime - lastProcessing < 2400) return;
        lastProcessing = motionTime;
        clearProcessing();
        hero.classList.add('is-mce-processing');
        hero.dispatchEvent(new CustomEvent('locus:mce-process', {
            bubbles: true,
            detail: { index: state.index, criterion: state.element.getAttribute('aria-label') }
        }));
        processingTimer = window.setTimeout(clearProcessing, 1100);
    }

    function revealElement(run, element, options) {
        if (!element || typeof element.animate !== 'function') return Promise.resolve();
        const { delay = 0, duration = 520, x = 0, y = 0, scale = 1 } = options;
        const computed = getComputedStyle(element);
        const finalTransform = computed.transform;
        const baseTransform = finalTransform === 'none' ? '' : ` ${finalTransform}`;
        const animation = element.animate([
            { opacity: 0, transform: `translate3d(${x}px, ${y}px, 0) scale(${scale})${baseTransform}` },
            { opacity: computed.opacity, transform: finalTransform }
        ], {
            delay,
            duration,
            easing: 'cubic-bezier(0.22, 1, 0.36, 1)',
            fill: 'both'
        });
        animation.pause();
        animation.currentTime = 0;
        run.animations.add(animation);
        const finished = animation.finished.catch(() => {}).then(() => {
            run.animations.delete(animation);
            animation.cancel();
        });
        run.jobs.push(finished);
        return finished;
    }

    function finishEntrance(run) {
        if (!run || run.done) return;
        run.done = true;
        run.animations.forEach((animation) => animation.cancel());
        run.animations.clear();
        if (activeEntrance === run) {
            activeEntrance = null;
            orbitEntranceDone = true;
            iaiEntranceDone = true;
            hero.classList.remove('is-hero-entering');
            hero.classList.add('is-hero-entered');
            hero.dataset.heroEntrance = 'complete';
            syncMotion();
            hero.dispatchEvent(new CustomEvent('locus:hero-entered', { bubbles: true, detail: { run: run.id } }));
        }
        run.resolve();
    }

    function playEntrance() {
        if (activeEntrance) finishEntrance(activeEntrance);
        stopOrbit();
        clearProcessing();
        orbitEntranceDone = false;
        iaiEntranceDone = false;
        // Cover the image's baked-in bar before the IAI figure becomes visible.
        // Replays keep the already completed score intact.
        if (iaiProgress && !iaiStarted && !iaiCompleted && !reducedMotion) {
            iaiProgress.hidden = false;
        }

        const run = { id: ++entranceRun, animations: new Set(), jobs: [], assetsReady: false, done: false, resolve: null };
        const completion = new Promise((resolve) => { run.resolve = resolve; });
        activeEntrance = run;
        hero.dataset.heroEntranceRun = String(run.id);
        hero.dataset.heroEntrance = 'playing';
        hero.classList.remove('is-hero-entered');
        hero.classList.add('is-hero-entering');

        if (reducedMotion || typeof hero.animate !== 'function') {
            finishEntrance(run);
            return completion;
        }

        revealElement(run, hero.querySelector('.poster-title-lead'), { y: 22, duration: 520 });
        revealElement(run, hero.querySelector('.poster-title-gold'), { delay: 100, y: 14, duration: 560 });
        revealElement(run, hero.querySelector('.poster-supporting'), { delay: 200, y: 12 });
        hero.querySelectorAll('.poster-criteria .poster-icon-art > img').forEach((image, index) => {
            const offset = 10 + (index % 3) * 4;
            revealElement(run, image, {
                delay: 300 + index * 85,
                duration: 480,
                x: index % 2 ? offset : -offset,
                y: index % 3 === 0 ? 8 : -4
            });
        });
        revealElement(run, hero.querySelector('.poster-mce-crop'), { delay: 360, duration: 620, y: 12, scale: 0.985 });

        const orbitJobs = icons.map((icon, index) => {
            const phase = index * fullCircle / Math.max(icons.length, 1);
            return revealElement(run, icon.querySelector('.poster-icon-art > img'), {
                delay: 450 + index * 90,
                duration: 540,
                x: Math.cos(phase) * (12 + index % 3 * 3),
                y: Math.sin(phase) * (12 + index % 3 * 3)
            });
        });
        Promise.all(orbitJobs).then(() => {
            if (activeEntrance !== run || run.done) return;
            orbitEntranceDone = true;
            syncMotion();
        });
        revealElement(run, iaiStage, { delay: 1500, duration: 620, y: 8, scale: 0.96 }).then(() => {
            if (activeEntrance !== run || run.done) return;
            iaiEntranceDone = true;
            syncMotion();
        });
        Promise.all(run.jobs).then(() => finishEntrance(run));

        const assetJobs = Array.from(hero.querySelectorAll('img'), (image) => {
            if (typeof image.decode !== 'function') return Promise.resolve();
            return image.decode().catch(() => {});
        });
        Promise.all(assetJobs).then(() => {
            if (activeEntrance !== run || run.done) return;
            run.assetsReady = true;
            syncMotion();
        });
        syncMotion();
        return completion;
    }

    function finishIai() {
        iaiCompleted = true;
        if (iaiProgress) iaiProgress.hidden = true;
        hero.classList.remove('is-iai-animating');
        hero.classList.add('is-iai-complete');
        iaiAnimations.forEach((animation) => animation.cancel());
        iaiAnimations.clear();
    }

    function startIai() {
        if (iaiStarted || iaiCompleted || !iaiEntranceDone || !iaiReady || !iaiVisible || document.hidden || !pageActive) return;
        iaiStarted = true;
        if (reducedMotion || !iaiGraphic || typeof iaiGraphic.animate !== 'function') {
            finishIai();
            return;
        }

        hero.classList.add('is-iai-animating');
        if (iaiProgress && typeof iaiProgress.animate === 'function') {
            // The white curtain reveals the supplied image's existing progress bar.
            iaiProgress.hidden = false;
            const progress = iaiProgress.animate([
                { transform: 'scaleX(1)' },
                { transform: 'scaleX(0)' }
            ], {
                duration: 1500,
                delay: 120,
                easing: 'cubic-bezier(0.22, 1, 0.36, 1)',
                fill: 'both'
            });
            iaiAnimations.add(progress);
        }

        Promise.all(Array.from(iaiAnimations, (animation) => animation.finished))
            .then(finishIai)
            .catch(() => {
                if (!iaiCompleted) finishIai();
            });
    }

    function syncMotion() {
        const pagePaused = !pageActive || document.hidden;
        hero.classList.toggle('is-hero-motion-paused', reducedMotion || pagePaused || !heroVisible);
        if (activeEntrance) {
            if (reducedMotion || !heroVisible) {
                finishEntrance(activeEntrance);
            } else {
                const pauseEntrance = pagePaused || !activeEntrance.assetsReady;
                activeEntrance.animations.forEach((animation) => {
                    if (pauseEntrance) animation.pause();
                    else if (animation.playState === 'paused') animation.play();
                });
            }
        }
        if (orbit) orbit.classList.toggle('is-orbit-paused', !canOrbit());
        if (canOrbit()) {
            if (!frameId) frameId = window.requestAnimationFrame(animateOrbit);
        } else {
            stopOrbit();
            clearProcessing();
        }

        if (reducedMotion && !iaiCompleted) finishIai();
        if (!iaiCompleted) {
            const pauseIai = pagePaused || !iaiVisible || !iaiEntranceDone;
            iaiAnimations.forEach((animation) => {
                if (pauseIai) animation.pause();
                else if (animation.playState === 'paused') animation.play();
            });
            startIai();
        }
    }

    states.forEach((state) => {
        const updatePausedState = () => {
            state.element.toggleAttribute('data-orbit-paused', state.hovered || state.focused);
            positionTooltip(state);
        };
        state.element.addEventListener('pointerenter', () => {
            state.hovered = true;
            updatePausedState();
        });
        state.element.addEventListener('pointerleave', () => {
            state.hovered = false;
            updatePausedState();
        });
        state.element.addEventListener('focusin', () => {
            state.focused = true;
            updatePausedState();
        });
        state.element.addEventListener('focusout', (event) => {
            state.focused = state.element.contains(event.relatedTarget);
            updatePausedState();
        });
    });

    if ('ResizeObserver' in window && orbit) {
        const resizeObserver = new ResizeObserver(measureOrbit);
        resizeObserver.observe(orbit);
        icons.forEach((icon) => resizeObserver.observe(icon));
    }
    window.addEventListener('resize', measureOrbit, { passive: true });

    if ('IntersectionObserver' in window) {
        const visibilityObserver = new IntersectionObserver((entries) => {
            entries.forEach((entry) => {
                if (entry.target === hero) heroVisible = entry.isIntersecting;
                if (entry.target === orbit) orbitVisible = entry.isIntersecting;
                if (entry.target === iaiStage) iaiVisible = entry.isIntersecting;
            });
            syncMotion();
        }, { threshold: 0 });
        visibilityObserver.observe(hero);
        if (orbit) visibilityObserver.observe(orbit);
        if (iaiStage) visibilityObserver.observe(iaiStage);
    }

    const updatePreference = (event) => {
        reducedMotion = event.matches;
        syncMotion();
    };
    if (typeof motionPreference.addEventListener === 'function') {
        motionPreference.addEventListener('change', updatePreference);
    } else {
        motionPreference.addListener(updatePreference);
    }

    document.addEventListener('visibilitychange', syncMotion);
    window.addEventListener('pagehide', () => {
        pageActive = false;
        syncMotion();
    });
    window.addEventListener('pageshow', () => {
        pageActive = true;
        heroVisible = isVisible(hero);
        orbitVisible = isVisible(orbit);
        iaiVisible = isVisible(iaiStage);
        measureOrbit();
        syncMotion();
    });

    if (iaiGraphic && !iaiReady) {
        iaiGraphic.addEventListener('load', () => {
            iaiReady = true;
            syncMotion();
        }, { once: true });
        iaiGraphic.addEventListener('error', () => {
            if (iaiProgress) iaiProgress.hidden = true;
        }, { once: true });
    }

    if (iaiProgress) iaiProgress.hidden = true;
    measureOrbit();
    hero.classList.add('has-hero-motion');
    window.LOCUS_HERO = Object.assign(window.LOCUS_HERO || {}, { playEntrance });
    window.addEventListener('locus:hero-enter', (event) => {
        const completion = playEntrance();
        if (typeof event.detail?.complete === 'function') completion.then(() => event.detail.complete());
    }, { capture: true });
    playEntrance();
})();
