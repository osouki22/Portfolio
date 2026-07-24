"use client";

import { useEffect, useRef } from "react";
import { about } from "@/lib/content";
import { gsap, setupGsap } from "@/lib/gsapSetup";
import { DUR, EASE, FLOAT } from "@/lib/motion";

/**
 * About — the opposite register from the hero's glitch: organic, soft, slow.
 * The headline is split into word elements (the float effect animates each
 * independently). One restrained scroll reveal, executed precisely.
 */
export default function About() {
  const sectionRef = useRef<HTMLElement>(null);
  const headlineRef = useRef<HTMLHeadingElement>(null);

  const words = about.title.split(" ");

  useEffect(() => {
    setupGsap();
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const section = sectionRef.current;
    if (!section) return;
    const targets = section.querySelectorAll("[data-about-reveal]");
    if (reduced) {
      gsap.set(targets, { opacity: 1, y: 0 });
      return;
    }
    const tween = gsap.fromTo(
      targets,
      { opacity: 0, y: 30 },
      {
        opacity: 1,
        y: 0,
        duration: DUR.reveal,
        ease: EASE.out,
        stagger: 0.06,
        scrollTrigger: {
          trigger: section,
          start: "top 68%",
          once: true,
        },
      }
    );
    return () => {
      tween.scrollTrigger?.kill();
      tween.kill();
    };
  }, []);

  // Organic float: each word drifts on its own long-period phase and is
  // gently repelled by the cursor (over-damped — no bounce, no snap).
  // Pure transforms driven by one ticker; no WebGL in this section.
  useEffect(() => {
    setupGsap();
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced) return;
    const headline = headlineRef.current;
    const section = sectionRef.current;
    if (!headline || !section) return;

    const words = Array.from(
      headline.querySelectorAll<HTMLElement>("[data-float-word]")
    );
    const state = words.map((el, i) => ({
      el,
      // desynchronized phases + slightly different periods per word
      phase: i * 1.37,
      speed: (Math.PI * 2) / (FLOAT.period + (i % 5) * 0.9),
      x: 0,
      y: 0,
    }));

    const mouse = { x: -1e5, y: -1e5 };
    const onPointerMove = (e: PointerEvent) => {
      mouse.x = e.clientX;
      mouse.y = e.clientY;
    };
    const onPointerLeave = () => {
      mouse.x = -1e5;
      mouse.y = -1e5;
    };
    window.addEventListener("pointermove", onPointerMove, { passive: true });
    window.addEventListener("pointerleave", onPointerLeave);

    let running = false;
    let raf = 0;
    let t0 = performance.now();

    const frame = (now: number) => {
      if (!running) return;
      const t = (now - t0) / 1000;
      for (const w of state) {
        const r = w.el.getBoundingClientRect();
        const cx = r.left + r.width / 2;
        const cy = r.top + r.height / 2;
        const dx = cx - mouse.x;
        const dy = cy - mouse.y;
        const dist = Math.hypot(dx, dy);

        // target displacement: away from cursor with smooth falloff
        let tx = 0;
        let ty = 0;
        if (dist < FLOAT.radius && dist > 0.001) {
          const force = (1 - dist / FLOAT.radius) ** 2 * FLOAT.push;
          tx = (dx / dist) * force;
          ty = (dy / dist) * force;
        }

        // over-damped spring toward target
        w.x += (tx - w.x) * FLOAT.damping;
        w.y += (ty - w.y) * FLOAT.damping;

        // ambient drift on top — a few px, long period, breathing
        const driftY = Math.sin(t * w.speed + w.phase) * FLOAT.amp;
        const rot = Math.sin(t * w.speed * 0.8 + w.phase * 1.9) * FLOAT.rot;

        w.el.style.transform = `translate3d(${w.x.toFixed(2)}px, ${(w.y + driftY).toFixed(2)}px, 0) rotate(${rot.toFixed(3)}deg)`;
      }
      raf = requestAnimationFrame(frame);
    };

    const setRunning = (on: boolean) => {
      if (on === running) return;
      running = on;
      if (on) {
        t0 = performance.now() - (performance.now() - t0);
        raf = requestAnimationFrame(frame);
      } else {
        cancelAnimationFrame(raf);
      }
    };

    const io = new IntersectionObserver(
      ([entry]) => setRunning(entry.isIntersecting),
      { threshold: 0 }
    );
    io.observe(section);

    return () => {
      setRunning(false);
      io.disconnect();
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerleave", onPointerLeave);
      words.forEach((el) => (el.style.transform = ""));
    };
  }, []);

  return (
    <section
      ref={sectionRef}
      id="about"
      aria-label="About"
      className="relative flex min-h-svh items-center px-[6vw] py-[22vh]"
    >
      <div className="max-w-[62rem]">
        <h2 ref={headlineRef} className="text-display-sm" data-about-float>
          {words.map((word, i) => (
            <span
              key={`${word}-${i}`}
              data-about-reveal
              className="mr-[0.28em] inline-block opacity-0 last:mr-0"
            >
              {/* nested so the float transform never fights the reveal tween */}
              <span data-float-word className="inline-block will-change-transform">
                {word}
              </span>
            </span>
          ))}
        </h2>
        <p
          data-about-reveal
          className="text-lead mt-12 max-w-[38rem] opacity-0 text-white/70"
        >
          {about.description}
        </p>
      </div>
    </section>
  );
}
