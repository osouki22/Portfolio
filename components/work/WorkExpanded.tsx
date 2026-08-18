"use client";

import Image from "next/image";
import { useEffect, useRef } from "react";
import type { WorkProject } from "@/lib/work";
import { projects, getProjectIndex } from "@/lib/work";
import { gsap } from "@/lib/gsapSetup";
import { DUR, EASE } from "@/lib/motion";

interface WorkExpandedProps {
  project: WorkProject;
  onClose: () => void;
  onNavigate: (dir: 1 | -1) => void;
}

/**
 * Full-screen project detail view. Scrolls internally (page behind is
 * locked); Escape closes, arrow keys navigate. The main media block
 * carries the shared data-flip-id so open/close can morph it from/to the
 * grid card. Prev/next is a faster content swap, not an element morph.
 */
export default function WorkExpanded({
  project,
  onClose,
  onNavigate,
}: WorkExpandedProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const lastSlug = useRef(project.slug);

  const index = getProjectIndex(project.slug);
  const prev = projects[(index - 1 + projects.length) % projects.length];
  const next = projects[(index + 1) % projects.length];

  // Keyboard: Escape closes, arrows navigate.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      else if (e.key === "ArrowRight") onNavigate(1);
      else if (e.key === "ArrowLeft") onNavigate(-1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose, onNavigate]);

  useEffect(() => {
    rootRef.current?.focus({ preventScroll: true });
  }, []);

  // Prev/next content swap — quicker and more decisive than the open Flip.
  useEffect(() => {
    if (lastSlug.current === project.slug) return;
    lastSlug.current = project.slug;
    const root = rootRef.current;
    const content = contentRef.current;
    if (!root || !content) return;
    root.scrollTo({ top: 0, behavior: "instant" as ScrollBehavior });
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced) return;
    gsap.fromTo(
      content,
      { opacity: 0, y: 18 },
      { opacity: 1, y: 0, duration: DUR.projectSwap, ease: EASE.swap }
    );
  }, [project.slug]);

  return (
    <div
      ref={rootRef}
      data-work-expanded
      data-lenis-prevent
      tabIndex={-1}
      role="dialog"
      aria-modal="true"
      aria-label={project.title}
      className="fixed inset-0 z-50 overflow-y-auto overscroll-contain outline-none"
    >
      {/* Opaque backdrop — fades in behind the Flip, reads the mesh vars so
          it follows the palette transition */}
      <div
        data-expanded-bg
        className="fixed inset-0 -z-10"
        style={{
          background:
            "radial-gradient(120vmax 120vmax at 80% -20%, color-mix(in srgb, var(--mesh-3) 55%, transparent), transparent 60%), radial-gradient(100vmax 100vmax at 10% 110%, color-mix(in srgb, var(--mesh-4) 70%, transparent), transparent 65%), var(--mesh-base)",
        }}
      />

      {/* Close */}
      <button
        data-expanded-reveal
        type="button"
        onClick={onClose}
        aria-label="Close project"
        className="fixed right-5 top-5 z-20 flex h-12 w-12 cursor-pointer items-center justify-center rounded-full border border-white/15 bg-black/25 backdrop-blur-sm transition-colors duration-300 hover:border-white/40 md:right-8 md:top-8"
      >
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
          <path d="M2 2l12 12M14 2L2 14" stroke="white" strokeWidth="1.5" />
        </svg>
      </button>

      {/* Shared-element media — flip target. The wrapper is tagged so the
          close sequence can freeze its height before the media leaves the
          flow; without that the scroller shrinks and the browser clamps
          scrollTop, which reads as an instant jump. */}
      <div
        data-expanded-media-slot
        className="px-0 md:px-[4vw] md:pt-[4vh]"
      >
        <div
          data-expanded-media
          data-flip-id={`work-media-${project.slug}`}
          className="relative h-[52svh] w-full overflow-hidden bg-black/30 md:h-[70svh] md:rounded-[2px]"
        >
          <Image
            src={project.mainImage}
            alt={project.title}
            fill
            priority
            sizes="100vw"
            className="object-cover"
          />
        </div>
      </div>

      <div ref={contentRef} className="px-[6vw] pb-[16vh]">
        {/* Title block */}
        <header data-expanded-reveal className="pt-[8vh]">
          <div className="flex items-baseline gap-5">
            <span className="text-kicker tabular-nums">
              {String(index + 1).padStart(2, "0")} / {String(projects.length).padStart(2, "0")}
            </span>
          </div>
          <h2 className="text-display-sm mt-4">{project.title}</h2>
          <p className="text-kicker mt-5 normal-case tracking-[0.06em]">
            {project.kicker}
          </p>
          <p className="text-lead mt-8 max-w-[42rem] text-white/70">
            {project.intro}
          </p>
        </header>

        {/* Copy blocks */}
        <div className="mt-[14vh] space-y-[9vh]">
          {(
            [
              ["The problem", project.problem],
              ["My approach", project.approach],
              ["Shipped", project.shipped],
            ] as const
          ).map(([label, text]) => (
            <div
              key={label}
              data-expanded-reveal
              className="grid gap-5 md:grid-cols-12 md:gap-x-[4vw]"
            >
              <h3 className="text-kicker md:col-span-3">{label}</h3>
              <p className="text-body max-w-[46rem] text-white/75 md:col-span-8">
                {text}
              </p>
            </div>
          ))}
        </div>

        {/* Detail images — art-directed, not a uniform 2×2 dump */}
        <div
          data-expanded-reveal
          className="mt-[16vh] grid grid-cols-1 gap-y-[8vh] md:grid-cols-12 md:gap-x-[4vw]"
        >
          <div className="relative aspect-[16/9] overflow-hidden md:col-span-10">
            <Image
              src={project.detailImages[0]}
              alt={`${project.title} — detail 1`}
              fill
              sizes="(max-width: 768px) 92vw, 78vw"
              className="object-cover"
            />
          </div>
          <div className="relative aspect-[4/5] overflow-hidden md:col-span-5 md:col-start-8 md:mt-[6vh]">
            <Image
              src={project.detailImages[1]}
              alt={`${project.title} — detail 2`}
              fill
              sizes="(max-width: 768px) 92vw, 36vw"
              className="object-cover"
            />
          </div>
          <div className="relative aspect-[4/3] overflow-hidden md:col-span-6 md:col-start-1 md:-mt-[24vh]">
            <Image
              src={project.detailImages[2]}
              alt={`${project.title} — detail 3`}
              fill
              sizes="(max-width: 768px) 92vw, 44vw"
              className="object-cover"
            />
          </div>
          <div className="relative aspect-[3/2] overflow-hidden md:col-span-8 md:col-start-4 md:mt-[10vh]">
            <Image
              src={project.detailImages[3]}
              alt={`${project.title} — detail 4`}
              fill
              sizes="(max-width: 768px) 92vw, 60vw"
              className="object-cover"
            />
          </div>
        </div>

        {/* Prev / next */}
        <nav
          data-expanded-reveal
          aria-label="Project navigation"
          className="mt-[14vh] flex items-center justify-between border-t border-white/10 pt-10"
        >
          <button
            type="button"
            onClick={() => onNavigate(-1)}
            className="group cursor-pointer text-left"
          >
            <span className="text-kicker">Previous</span>
            <span className="text-title mt-2 block transition-colors duration-300 group-hover:text-white/60">
              {prev.title}
            </span>
          </button>
          <button
            type="button"
            onClick={() => onNavigate(1)}
            className="group cursor-pointer text-right"
          >
            <span className="text-kicker">Next</span>
            <span className="text-title mt-2 block transition-colors duration-300 group-hover:text-white/60">
              {next.title}
            </span>
          </button>
        </nav>
      </div>
    </div>
  );
}
