"use client";

import { useEffect, useRef } from "react";
import { CURSOR } from "@/lib/motion";

/**
 * Anything that should grow the ring. Kept as one selector rather than a
 * hand-maintained list: real interactive elements plus the two site-specific
 * cases (work cards, side-nav items) and an opt-in `data-cursor-hover` hook.
 * The GL canvases are pointer-events-none, so the event target is always the
 * DOM element underneath and `closest()` resolves correctly through them.
 */
const INTERACTIVE = [
  "a",
  "button",
  '[role="button"]',
  "input",
  "textarea",
  "select",
  "summary",
  "[data-work-card]",
  "[data-cursor-hover]",
].join(", ");

/**
 * A hollow ring that replaces the native pointer on fine-pointer devices.
 * One fixed element, one rAF, a lerp toward the pointer — nothing else.
 * Purely visual and pointer-events-none, so it cannot interfere with the
 * hero mask, the card fluid, or any click.
 *
 * Touch devices keep their normal behaviour (no ring, native cursor never
 * hidden); prefers-reduced-motion drops the follow lag but keeps the ring.
 */
export default function CustomCursor() {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!CURSOR.enabled) return;
    const el = ref.current;
    if (!el) return;

    // desktop / fine pointers only — never on touch
    const fine = window.matchMedia("(pointer: fine)");
    if (!fine.matches) return;

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    // hides the native pointer document-wide (see globals.css)
    document.documentElement.setAttribute("data-custom-cursor", "true");

    const applyState = (hovering: boolean) => {
      const size = hovering ? CURSOR.hoverSize : CURSOR.size;
      const thickness = hovering ? CURSOR.hoverThickness : CURSOR.thickness;
      el.style.width = `${size}px`;
      el.style.height = `${size}px`;
      el.style.borderWidth = `${thickness}px`;
    };

    el.style.borderStyle = "solid";
    el.style.borderColor = CURSOR.color;
    el.style.mixBlendMode = CURSOR.blendMode;
    el.style.zIndex = String(CURSOR.zIndex);
    el.style.transition =
      `width ${CURSOR.transitionMs}ms ease, ` +
      `height ${CURSOR.transitionMs}ms ease, ` +
      `border-width ${CURSOR.transitionMs}ms ease, ` +
      `opacity 180ms ease`;
    applyState(false);

    const target = { x: window.innerWidth / 2, y: window.innerHeight / 2 };
    const pos = { x: target.x, y: target.y };
    let seeded = false;
    let hovering = false;

    const onMove = (e: PointerEvent) => {
      target.x = e.clientX;
      target.y = e.clientY;
      if (!seeded) {
        // first sighting: jump into place instead of flying in from the centre
        seeded = true;
        pos.x = target.x;
        pos.y = target.y;
        el.style.opacity = "1";
      }
      const node = e.target as Element | null;
      const next = Boolean(node?.closest?.(INTERACTIVE));
      if (next !== hovering) {
        hovering = next;
        applyState(hovering);
      }
    };

    const onLeave = () => {
      el.style.opacity = "0";
      seeded = false;
    };
    const onEnter = () => {
      if (seeded) el.style.opacity = "1";
    };

    window.addEventListener("pointermove", onMove, { passive: true });
    document.documentElement.addEventListener("pointerleave", onLeave);
    document.documentElement.addEventListener("pointerenter", onEnter);

    // ---- follow loop -------------------------------------------------------
    let raf = 0;
    let running = false;
    let last = performance.now();

    const frame = (now: number) => {
      if (!running) return;
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;

      if (reduced || CURSOR.followLerp >= 1) {
        pos.x = target.x;
        pos.y = target.y;
      } else {
        // frame-rate independent version of the per-frame lerp
        const k = 1 - Math.pow(1 - CURSOR.followLerp, dt * 60);
        pos.x += (target.x - pos.x) * k;
        pos.y += (target.y - pos.y) * k;
      }

      el.style.transform = `translate3d(${pos.x.toFixed(2)}px, ${pos.y.toFixed(
        2
      )}px, 0) translate(-50%, -50%)`;
      raf = requestAnimationFrame(frame);
    };

    const setRunning = (on: boolean) => {
      if (on === running) return;
      running = on;
      if (on) {
        last = performance.now();
        raf = requestAnimationFrame(frame);
      } else {
        cancelAnimationFrame(raf);
      }
    };
    setRunning(true);

    const onVisibility = () => setRunning(!document.hidden);
    document.addEventListener("visibilitychange", onVisibility);

    // a device switching to coarse pointer (tablet mode) gives the arrow back
    const onPointerKind = () => {
      if (!fine.matches) {
        document.documentElement.removeAttribute("data-custom-cursor");
        setRunning(false);
        el.style.opacity = "0";
      } else {
        document.documentElement.setAttribute("data-custom-cursor", "true");
        setRunning(true);
      }
    };
    fine.addEventListener("change", onPointerKind);

    return () => {
      setRunning(false);
      document.documentElement.removeAttribute("data-custom-cursor");
      window.removeEventListener("pointermove", onMove);
      document.documentElement.removeEventListener("pointerleave", onLeave);
      document.documentElement.removeEventListener("pointerenter", onEnter);
      document.removeEventListener("visibilitychange", onVisibility);
      fine.removeEventListener("change", onPointerKind);
    };
  }, []);

  return <div ref={ref} className="custom-cursor" aria-hidden="true" />;
}
