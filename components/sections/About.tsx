"use client";

import { useEffect, useRef } from "react";
import { about } from "@/lib/content";
import { gsap, ScrollTrigger, setupGsap } from "@/lib/gsapSetup";
import { DUR, EASE } from "@/lib/motion";

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
              data-float-word
              className="mr-[0.28em] inline-block opacity-0 last:mr-0"
            >
              {word}
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
