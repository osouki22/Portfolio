"use client";

import { useEffect, useRef } from "react";
import { about } from "@/lib/content";
import { gsap, setupGsap } from "@/lib/gsapSetup";
import { DUR, EASE } from "@/lib/motion";
import MeshText from "@/components/gl/MeshText";

/**
 * About. The headline is a deformable WebGL mesh-text: the cursor drags
 * its vertex grid with inertia and it springs back elastically, with a
 * magenta/green chromatic fringe (shared <MeshText> component — same
 * instrument as the Contact headline). One restrained scroll reveal.
 */
export default function About() {
  const sectionRef = useRef<HTMLElement>(null);

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
        stagger: 0.12,
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
      <div className="w-full max-w-[62rem]">
        <h2 data-about-reveal className="opacity-0">
          <MeshText text={about.title} className="text-display-sm" />
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
