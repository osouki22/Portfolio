"use client";

import { useCallback, useState } from "react";
import { transitionPalette, resetPalette } from "@/lib/paletteController";
import { projects } from "@/lib/work";
import WorkGrid from "@/components/work/WorkGrid";

/**
 * Work — grid + expanded-view orchestration. Hovering a card shifts the
 * page palette toward that project; leaving the grid (with nothing open)
 * returns to the Klein-blue default.
 */
export default function Work() {
  const [openSlug, setOpenSlug] = useState<string | null>(null);

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
    setOpenSlug(slug);
  }, []);

  return (
    <section
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
    </section>
  );
}
