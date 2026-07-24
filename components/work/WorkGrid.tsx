"use client";

import { useEffect, useRef } from "react";
import { projects } from "@/lib/work";
import { gsap, setupGsap } from "@/lib/gsapSetup";
import { DUR, EASE } from "@/lib/motion";
import WorkCard from "./WorkCard";

interface WorkGridProps {
  onOpen: (slug: string) => void;
  onHoverStart: (slug: string) => void;
  onHoverEnd: () => void;
}

/**
 * Asymmetric editorial grid — legible as a grid, but art-directed:
 * alternating column spans and vertical offsets on a 12-column layout.
 */
const SPANS = [
  "md:col-span-7",
  "md:col-span-5 md:mt-[14vh]",
  "md:col-span-5 md:-mt-[6vh]",
  "md:col-span-7 md:mt-[8vh]",
  "md:col-span-8 md:col-start-3 md:mt-[10vh]",
];

export default function WorkGrid({
  onOpen,
  onHoverStart,
  onHoverEnd,
}: WorkGridProps) {
  const gridRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setupGsap();
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const grid = gridRef.current;
    if (!grid) return;
    const cards = grid.querySelectorAll("[data-work-card]");
    if (reduced) {
      gsap.set(cards, { opacity: 1, y: 0 });
      return;
    }
    const tweens: gsap.core.Tween[] = [];
    cards.forEach((card) => {
      tweens.push(
        gsap.fromTo(
          card,
          { opacity: 0, y: 48 },
          {
            opacity: 1,
            y: 0,
            duration: DUR.reveal,
            ease: EASE.out,
            scrollTrigger: {
              trigger: card,
              start: "top 82%",
              once: true,
            },
          }
        )
      );
    });
    return () => {
      tweens.forEach((t) => {
        t.scrollTrigger?.kill();
        t.kill();
      });
    };
  }, []);

  return (
    <div
      ref={gridRef}
      className="grid grid-cols-1 gap-y-[14vh] md:grid-cols-12 md:gap-x-[4vw] md:gap-y-[4vh]"
    >
      {projects.map((project, i) => (
        <div key={project.slug} className={SPANS[i]}>
          <WorkCard
            project={project}
            index={i}
            priority={i < 2}
            onOpen={onOpen}
            onHoverStart={onHoverStart}
            onHoverEnd={onHoverEnd}
          />
        </div>
      ))}
    </div>
  );
}
