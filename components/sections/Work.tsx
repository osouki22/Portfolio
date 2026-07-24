"use client";

import { useCallback, useRef, useState } from "react";
import { transitionPalette, resetPalette } from "@/lib/paletteController";
import { lockScroll, unlockScroll } from "@/lib/scroll";
import { projects, getProjectIndex } from "@/lib/work";
import WorkGrid from "@/components/work/WorkGrid";
import WorkExpanded from "@/components/work/WorkExpanded";

/**
 * Work — grid + expanded-view orchestration.
 * Hover shifts the page palette toward the project; opening a card locks
 * page scroll, dims the side nav (html[data-work-open]) and completes the
 * palette transition. Closing restores everything.
 */
export default function Work() {
  const [openSlug, setOpenSlug] = useState<string | null>(null);
  const sectionRef = useRef<HTMLElement>(null);

  const openProject = openSlug
    ? projects.find((p) => p.slug === openSlug) ?? null
    : null;

  const handleHoverStart = useCallback(
    (slug: string) => {
      if (openSlug) return;
      const project = projects.find((p) => p.slug === slug);
      if (project) transitionPalette(project.palette);
    },
    [openSlug]
  );

  const handleHoverEnd = useCallback(() => {
    if (!openSlug) resetPalette();
  }, [openSlug]);

  const handleOpen = useCallback((slug: string) => {
    const project = projects.find((p) => p.slug === slug);
    if (!project) return;
    setOpenSlug(slug);
    lockScroll();
    transitionPalette(project.palette);
    document.documentElement.setAttribute("data-work-open", "true");
  }, []);

  const handleClose = useCallback(() => {
    setOpenSlug(null);
    unlockScroll();
    resetPalette();
    document.documentElement.removeAttribute("data-work-open");
  }, []);

  const handleNavigate = useCallback(
    (dir: 1 | -1) => {
      if (!openSlug) return;
      const index = getProjectIndex(openSlug);
      const nextProject =
        projects[(index + dir + projects.length) % projects.length];
      setOpenSlug(nextProject.slug);
      transitionPalette(nextProject.palette);
    },
    [openSlug]
  );

  return (
    <section
      ref={sectionRef}
      id="work"
      aria-label="Work"
      className="relative px-[6vw] py-[18vh]"
    >
      <div className="mb-[10vh] flex items-baseline gap-4">
        <h2 className="text-headline">Work</h2>
        <span className="text-kicker tabular-nums">
          {String(projects.length).padStart(2, "0")}
        </span>
      </div>
      <WorkGrid
        onOpen={handleOpen}
        onHoverStart={handleHoverStart}
        onHoverEnd={handleHoverEnd}
      />
      {openProject && (
        <WorkExpanded
          project={openProject}
          onClose={handleClose}
          onNavigate={handleNavigate}
        />
      )}
    </section>
  );
}
