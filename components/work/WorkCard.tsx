"use client";

import Image from "next/image";
import { forwardRef } from "react";
import type { WorkProject } from "@/lib/work";

interface WorkCardProps {
  project: WorkProject;
  index: number;
  priority?: boolean;
  onOpen: (slug: string) => void;
  onHoverStart: (slug: string) => void;
  onHoverEnd: () => void;
}

/**
 * A single work card. The image wrapper carries data-flip-id so the
 * expanded view can pick it up as a shared element. The glitch canvas
 * mounts inside the media box only while this card is the hovered one.
 */
const WorkCard = forwardRef<HTMLDivElement, WorkCardProps>(function WorkCard(
  { project, index, priority = false, onOpen, onHoverStart, onHoverEnd },
  ref
) {
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
