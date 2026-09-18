import { useEffect } from 'react';

type Axis = 'x' | 'y';
type Surface = { scroller: HTMLElement; content: HTMLElement; limit: number };
type Pull = Surface & { axis: Axis; distance: number; edge: number };

const SCROLL_AREAS =
  '.sidebar, .modal, .settings-body, .timetable-scroll, .preview-table, .upcoming-entries, .mascot-card';
const RETURN_MS = 240;

/** Touch-only boundary feedback, capped at 32px for the page and 24px locally. */
export function useElasticScroll() {
  useEffect(() => {
    const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
    const touchDevice = matchMedia('(hover: none) and (pointer: coarse)');
    let pull: Pull | null = null;
    let cleanupTimer = 0;
    let touch: {
      x: number;
      y: number;
      target: Element;
      axis?: Axis;
      resumedScroller?: HTMLElement;
    } | null = null;

    function reset() {
      window.clearTimeout(cleanupTimer);
      if (pull) {
        pull.content.removeAttribute('data-elastic-state');
        pull.content.style.removeProperty('--elastic-x');
        pull.content.style.removeProperty('--elastic-y');
        pull = null;
      }
    }

    function release() {
      if (!pull) return;
      window.clearTimeout(cleanupTimer);
      pull.content.dataset.elasticState = 'returning';
      pull.content.style.setProperty('--elastic-x', '0px');
      pull.content.style.setProperty('--elastic-y', '0px');
      cleanupTimer = window.setTimeout(reset, RETURN_MS);
    }

    function surface(target: Element, axis: Axis): Surface | null {
      for (
        let el: Element | null = target;
        el && el !== document.body;
        el = el.parentElement
      ) {
        if (!(el instanceof HTMLElement)) continue;
        const style = getComputedStyle(el);
        const overflow = axis === 'x' ? style.overflowX : style.overflowY;
        if (!/^(auto|scroll)$/.test(overflow)) continue;
        const size = axis === 'x' ? el.clientWidth : el.clientHeight;
        const extent = axis === 'x' ? el.scrollWidth : el.scrollHeight;
        if (el.matches(SCROLL_AREAS)) {
          // A contained, fitting dialog/sidebar must not hand its gesture to the page.
          if (extent <= size + 1) {
            const behavior =
              axis === 'x'
                ? style.overscrollBehaviorX
                : style.overscrollBehaviorY;
            if (behavior !== 'auto') return null;
            continue;
          }
          return {
            scroller: el,
            content: el,
            limit: Math.min(24, size * 0.06),
          };
        }
        // Textareas and other native controls keep their own scrolling behavior.
        if (extent > size + 1) return null;
      }
      if (
        axis !== 'y' ||
        getComputedStyle(document.body).overflowY === 'hidden' ||
        document.querySelector('.nav-scrim')
      )
        return null;
      const scroller = document.scrollingElement as HTMLElement | null;
      const content = document.querySelector<HTMLElement>('main');
      if (
        !scroller ||
        !content ||
        scroller.scrollHeight <= scroller.clientHeight + 1
      )
        return null;
      return { scroller, content, limit: Math.min(32, innerHeight * 0.06) };
    }

    function stretch(target: Element, axis: Axis, delta: number, event: Event) {
      if (!delta || !event.cancelable || reducedMotion.matches) return;
      if (pull?.content.dataset.elasticState === 'returning') reset();
      const next = surface(target, axis);
      if (!next) {
        reset();
        return;
      }
      if (pull && (pull.scroller !== next.scroller || pull.axis !== axis))
        reset();
      const position =
        axis === 'x' ? next.scroller.scrollLeft : next.scroller.scrollTop;
      const end =
        axis === 'x'
          ? next.scroller.scrollWidth - next.scroller.clientWidth
          : next.scroller.scrollHeight - next.scroller.clientHeight;
      const edge =
        pull?.edge ??
        (position <= 1 && delta < 0
          ? -1
          : position >= end - 1 && delta > 0
            ? 1
            : 0);
      if (!edge || (!pull && Math.sign(delta) !== edge)) {
        reset();
        return;
      }
      event.preventDefault();
      pull ??= { ...next, axis, edge, distance: 0 };
      window.clearTimeout(cleanupTimer);
      const distance = pull.distance + delta * edge;
      if (distance < 0 && touch) {
        // After preventDefault, the browser cannot resume this same gesture.
        // Apply only the inward remainder, then follow the finger until release.
        touch.resumedScroller = pull.scroller;
        pull.distance = 0;
        pull.content.style.setProperty('--elastic-x', '0px');
        pull.content.style.setProperty('--elastic-y', '0px');
        // Keep snapping paused until release so small inward moves can accumulate.
        pull.content.dataset.elasticState = 'scrolling';
        scrollInward(touch.resumedScroller, axis, distance * edge);
        return;
      }
      pull.distance = Math.min(Math.max(0, distance), pull.limit * 20);
      const offset =
        -edge *
        pull.limit *
        (1 - Math.exp((-pull.distance * 0.4) / pull.limit));
      pull.content.dataset.elasticState = 'pulling';
      pull.content.style.setProperty(`--elastic-${axis}`, `${offset}px`);
    }

    function scrollInward(scroller: HTMLElement, axis: Axis, delta: number) {
      scroller.scrollBy({
        [axis === 'x' ? 'left' : 'top']: delta,
        behavior: 'instant',
      });
    }

    function touchStart(event: TouchEvent) {
      reset();
      touch =
        touchDevice.matches &&
        !reducedMotion.matches &&
        event.touches.length === 1 &&
        event.target instanceof Element &&
        !event.target.closest(
          'input, textarea, select, [contenteditable="true"]',
        )
          ? {
              x: event.touches[0].clientX,
              y: event.touches[0].clientY,
              target: event.target,
            }
          : null;
    }

    function touchMove(event: TouchEvent) {
      if (!touch || event.touches.length !== 1) {
        touch = null;
        reset();
        return;
      }
      const point = event.touches[0];
      const dx = touch.x - point.clientX;
      const dy = touch.y - point.clientY;
      if (!touch.axis && Math.max(Math.abs(dx), Math.abs(dy)) < 6) return;
      touch.axis ??= Math.abs(dx) > Math.abs(dy) ? 'x' : 'y';
      const delta = touch.axis === 'x' ? dx : dy;
      if (touch.resumedScroller && event.cancelable) {
        event.preventDefault();
        scrollInward(touch.resumedScroller, touch.axis, delta);
      } else {
        stretch(touch.target, touch.axis, delta, event);
      }
      touch.x = point.clientX;
      touch.y = point.clientY;
    }

    function touchEnd() {
      touch = null;
      release();
    }

    function cancel() {
      touch = null;
      reset();
    }

    document.addEventListener('touchstart', touchStart, { passive: true });
    document.addEventListener('touchmove', touchMove, { passive: false });
    document.addEventListener('touchend', touchEnd, { passive: true });
    document.addEventListener('touchcancel', touchEnd, { passive: true });
    document.addEventListener('keydown', cancel);
    document.addEventListener('pointerdown', cancel);
    window.addEventListener('resize', cancel);
    window.addEventListener('blur', cancel);
    reducedMotion.addEventListener('change', cancel);
    touchDevice.addEventListener('change', cancel);
    return () => {
      reset();
      document.removeEventListener('touchstart', touchStart);
      document.removeEventListener('touchmove', touchMove);
      document.removeEventListener('touchend', touchEnd);
      document.removeEventListener('touchcancel', touchEnd);
      document.removeEventListener('keydown', cancel);
      document.removeEventListener('pointerdown', cancel);
      window.removeEventListener('resize', cancel);
      window.removeEventListener('blur', cancel);
      reducedMotion.removeEventListener('change', cancel);
      touchDevice.removeEventListener('change', cancel);
    };
  }, []);
}
