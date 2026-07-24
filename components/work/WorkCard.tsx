"use client";

import Image from "next/image";
import { forwardRef, useState } from "react";
import GlitchCanvas from "@/components/gl/GlitchCanvas";
import type { WorkProject } from "@/lib/work";
import { GLITCH } from "@/lib/motion";
import { useIsTouch, useReducedMotion } from "@/lib/useMediaQuery";

interface WorkCardProps {
  project: WorkProject;
  index: number;
  priority?: boolean;
  /** this card is the single live glitch instance right now */
  glitchActive?: boolean;
  onOpen: (slug: string) => void;
  onHoverStart: (slug: string) => void;
  onHoverEnd: () => void;
}

/**
 * A single work card. The image wrapper carries data-flip-id so the
 * expanded view can pick it up as a shared element.
 *
 * Glitch lifecycle: the canvas exists ONLY while this card is the active
 * one (hover on desktop, viewport-center on touch) — mount/destroy per
 * hover keeps a single card WebGL context alive at any time. The static
 * image always renders beneath, so there is never a dead frame.
 */
const WorkCard = forwardRef<HTMLDivElement, WorkCardProps>(function WorkCard(
  {
    project,
    index,
    priority = false,
    glitchActive = false,
    onOpen,
    onHoverStart,
    onHoverEnd,
  },
  ref
) {
  const [webglOk, setWebglOk] = useState(true);
  const reduced = useReducedMotion();
  const isTouch = useIsTouch();

  const showGlitch = glitchActive && !reduced && webglOk;

  return (
    <div ref={ref} data-work-card={project.slug} className="group">
      <button
        type="button"
        onClick={() => onOpen(project.slug)}
        onPointerEnter={(e) => {
          if (e.pointerType === "mouse") onHoverStart(project.slug);
        }}
        onPointerLeave={(e) => {
          if (e.pointerType === "mouse") onHoverEnd();
        }}
        className="block w-full cursor-pointer text-left"
        aria-label={`Open project: ${project.title}`}
      >
        <div
          data-flip-id={`work-media-${project.slug}`}
          data-card-media={project.slug}
          className="relative aspect-[4/3] w-full overflow-hidden rounded-[2px] bg-black/30"
        >
          <Image
            src={project.mainImage}
            alt={project.title}
            fill
            priority={priority}
            sizes="(max-width: 768px) 92vw, 44vw"
            className="object-cover transition-transform duration-700 ease-out group-hover:scale-[1.025]"
          />
          {showGlitch && (
            <GlitchCanvas
              src={project.mainImage}
              maxShift={GLITCH.maxShiftCard}
              restIntensity={GLITCH.restCard}
              ambient={isTouch}
              dprCap={1.5}
              onContextFail={() => setWebglOk(false)}
            />
          )}
          {glitchActive && (reduced || !webglOk) && (
            <div className="grain-overlay" aria-hidden="true" />
          )}
        </div>
        <div className="mt-5 flex items-baseline gap-4">
          <span className="text-kicker tabular-nums">
            {String(index + 1).padStart(2, "0")}
          </span>
          <div>
            <h3 className="text-title">{project.title}</h3>
            <p className="text-kicker mt-2 normal-case tracking-[0.06em]">
              {project.kicker}
            </p>
          </div>
        </div>
      </button>
    </div>
  );
});

export default WorkCard;
