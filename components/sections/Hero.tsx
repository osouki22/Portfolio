"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import GlitchCanvas from "@/components/gl/GlitchCanvas";
import { hero } from "@/lib/content";
import { gsap, setupGsap } from "@/lib/gsapSetup";
import { DUR, EASE, GLITCH } from "@/lib/motion";
import { useIsTouch, useReducedMotion } from "@/lib/useMediaQuery";

/**
 * Full-viewport hero. The portrait fills the frame; the name and role sit
 * in the portrait's negative space (side configured via hero.heroTextAlign
 * in lib/content.ts). Clean type over the (glitching) image is the point —
 * the text never distorts.
 */
export default function Hero() {
  const textRef = useRef<HTMLDivElement>(null);
  const [webglOk, setWebglOk] = useState(true);
  const reduced = useReducedMotion();
  const isTouch = useIsTouch();

  useEffect(() => {
    setupGsap();
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (!textRef.current) return;
    const targets = textRef.current.querySelectorAll("[data-hero-reveal]");
    if (reduced) {
      gsap.set(targets, { opacity: 1, y: 0 });
      return;
    }
    const tl = gsap.fromTo(
      targets,
      { opacity: 0, y: 36 },
      {
        opacity: 1,
        y: 0,
        duration: DUR.reveal,
        ease: EASE.out,
        stagger: 0.09,
        delay: 0.25,
      }
    );
    return () => {
      tl.kill();
    };
  }, []);

  const alignLeft = hero.heroTextAlign === "left";

  return (
    <section
      id="home"
      aria-label="Intro"
      className="relative h-svh min-h-[540px] overflow-hidden"
    >
      {/* Portrait layer — static image beneath, glitch canvas above when live */}
      <div className="absolute inset-0" data-hero-media>
        <Image
          src={hero.portrait.src}
          alt={hero.portrait.alt}
          width={hero.portrait.width}
          height={hero.portrait.height}
          priority
          sizes="100vw"
          className="h-full w-full object-cover"
        />
        {!reduced && webglOk && (
          <GlitchCanvas
            src={hero.portrait.src}
            maxShift={GLITCH.maxShiftHero}
            restIntensity={GLITCH.restHero}
            trackWindow
            ambient={isTouch}
            onContextFail={() => setWebglOk(false)}
          />
        )}
      </div>

      {/* Name + role — clean DOM type above the canvas, never glitched */}
      <div
        ref={textRef}
        className={`absolute inset-0 z-10 flex flex-col justify-end pb-[10vh] px-[6vw] pointer-events-none ${
          alignLeft ? "items-start text-left" : "items-end text-right"
        }`}
      >
        <p data-hero-reveal className="text-kicker mb-5 opacity-0">
          {hero.role}
        </p>
        <h1 className="text-display">
          {hero.name.split(" ").map((word) => (
            <span key={word} data-hero-reveal className="block opacity-0">
              {word}
            </span>
          ))}
        </h1>
      </div>

      {/* Scroll hint — opposite corner from the name */}
      <div
        data-hero-reveal
        className={`absolute bottom-[10vh] z-10 hidden md:flex items-center gap-3 opacity-0 ${
          alignLeft ? "right-[6vw]" : "left-[6vw]"
        }`}
      >
        <span className="text-kicker">Scroll</span>
        <span className="block h-px w-12 bg-white/30" aria-hidden="true" />
      </div>
    </section>
  );
}
