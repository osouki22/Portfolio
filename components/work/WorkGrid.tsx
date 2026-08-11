"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { projects } from "@/lib/work";
import { gsap, setupGsap } from "@/lib/gsapSetup";
import { DUR, EASE } from "@/lib/motion";
import { useIsTouch } from "@/lib/useMediaQuery";
import WorkCard from "./WorkCard";

interface WorkGridProps {
  onOpen: (slug: string) => void;
  onHoverStart: (slug: string) => void;
  onHoverEnd: () => void;
}

/**
 * Asymmetric editorial grid — legible as a grid, but art-directed:
 * alternating column spans and vertical offsets on a 12-column layout.
 *
 * Exactly one card holds the live liquid canvas at a time:
 * desktop → the hovered card; touch → the card nearest viewport center.
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
  const [liquidSlug, setLiquidSlug] = useState<string | null>(null);
  const isTouch = useIsTouch();

  const handleHoverStart = useCallback(
    (slug: string) => {
      setLiquidSlug(slug);
      onHoverStart(slug);
    },
    [onHoverStart]
  );

  const handleHoverEnd = useCallback(() => {
    setLiquidSlug(null);
    onHoverEnd();
  }, [onHoverEnd]);

  // Touch devices: the card nearest viewport center is the live one.
  useEffect(() => {
    if (!isTouch) return;
    const grid = gridRef.current;
    if (!grid) return;
    const medias = Array.from(
      grid.querySelectorAll<HTMLElement>("[data-card-media]")
    );

    let ticking = false;
    const pick = () => {
      ticking = false;
      const mid = window.innerHeight / 2;
      let best: { slug: string; dist: number } | null = null;
      for (const el of medias) {
        const r = el.getBoundingClientRect();
        if (r.bottom < 0 || r.top > window.innerHeight) continue;
        const dist = Math.abs((r.top + r.bottom) / 2 - mid);
        if (!best || dist < best.dist) {
          best = { slug: el.dataset.cardMedia as string, dist };
        }
      }
      setLiquidSlug(best ? best.slug : null);
    };
    const onScroll = () => {
      if (!ticking) {
        ticking = true;
        requestAnimationFrame(pick);
      }
    };
    pick();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [isTouch]);

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
            liquidActive={liquidSlug === project.slug}
            onOpen={onOpen}
            onHoverStart={handleHoverStart}
            onHoverEnd={handleHoverEnd}
          />
        </div>
      ))}
    </div>
  );
}
