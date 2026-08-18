"use client";

import { useCallback, useLayoutEffect, useRef, useState } from "react";
import { transitionPalette, resetPalette } from "@/lib/paletteController";
import { lockScroll, unlockScroll } from "@/lib/scroll";
import { projects, getProjectIndex } from "@/lib/work";
import { gsap, Flip, setupGsap } from "@/lib/gsapSetup";
import { DUR, EASE } from "@/lib/motion";
import WorkGrid from "@/components/work/WorkGrid";
import WorkExpanded from "@/components/work/WorkExpanded";

/**
 * Work — grid + expanded-view orchestration.
 *
 * Opening a card is a GSAP-Flip shared-element expansion: the card's media
 * block morphs into the expanded view's hero media with genuine continuity
 * (one visible element, no crossfade). Remaining cards recede staggered
 * outward from the clicked card; the side nav dims (html[data-work-open]);
 * the palette completes its shift. Close reverses the Flip back to the
 * exact grid position of whichever project is currently displayed.
 * Under prefers-reduced-motion the Flip is replaced by a simple fade.
 */
export default function Work() {
  const [openSlug, setOpenSlug] = useState<string | null>(null);
  const sectionRef = useRef<HTMLElement>(null);
  const prevOpenRef = useRef<string | null>(null);
  const closingRef = useRef(false);

  const openProject = openSlug
    ? projects.find((p) => p.slug === openSlug) ?? null
    : null;

  const cardMediaEl = (slug: string) =>
    sectionRef.current?.querySelector<HTMLElement>(
      `[data-card-media="${slug}"]`
    ) ?? null;

  const otherCards = (slug: string) => {
    const grid = sectionRef.current;
    if (!grid) return [];
    return Array.from(
      grid.querySelectorAll<HTMLElement>("[data-work-card]")
    ).filter((el) => el.dataset.workCard !== slug);
  };

  // ---- open / swap orchestration (runs after the overlay mounts) ----------
  useLayoutEffect(() => {
    const prev = prevOpenRef.current;
    prevOpenRef.current = openSlug;
    if (!openSlug) return;
    setupGsap();

    const expandedMedia = document.querySelector<HTMLElement>(
      "[data-expanded-media]"
    );
    const bg = document.querySelector<HTMLElement>("[data-expanded-bg]");
    const reveals = document.querySelectorAll<HTMLElement>(
      "[data-expanded-reveal]"
    );
    const card = cardMediaEl(openSlug);

    // prev/next swap while already open: just re-point the hidden card
    if (prev && prev !== openSlug) {
      const prevCard = cardMediaEl(prev);
      if (prevCard) gsap.set(prevCard, { visibility: "visible" });
      if (card) gsap.set(card, { visibility: "hidden" });
      return;
    }
    if (prev === openSlug) return;

    // first open
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    if (reduced || !card || !expandedMedia) {
      if (card) gsap.set(card, { visibility: "hidden" });
      if (bg) gsap.set(bg, { opacity: 1 });
      gsap.set(reveals, { opacity: 1 });
      if (expandedMedia)
        gsap.fromTo(
          expandedMedia,
          { opacity: 0 },
          { opacity: 1, duration: 0.4, ease: "power1.out" }
        );
      return;
    }

    const state = Flip.getState(card);
    gsap.set(card, { visibility: "hidden" });

    // content stays hidden until the image expansion has fully completed —
    // the Flip owns the screen, then the content enters softly
    gsap.set(reveals, { opacity: 0, y: 28 });

    Flip.from(state, {
      targets: expandedMedia,
      absolute: true,
      duration: DUR.expandOpen,
      ease: EASE.expansion,
      onComplete: () => {
        gsap.to(reveals, {
          opacity: 1,
          y: 0,
          duration: DUR.expandContentIn,
          ease: EASE.out,
          stagger: 0.06,
        });
      },
    });

    if (bg) {
      gsap.fromTo(
        bg,
        { opacity: 0 },
        { opacity: 1, duration: DUR.expandOpen, ease: "power2.inOut" }
      );
    }

    // remaining cards recede, staggered outward from the clicked card
    const cardRect = card.getBoundingClientRect();
    const cx = cardRect.left + cardRect.width / 2;
    const cy = cardRect.top + cardRect.height / 2;
    const others = otherCards(openSlug).sort((a, b) => {
      const ra = a.getBoundingClientRect();
      const rb = b.getBoundingClientRect();
      const da = Math.hypot(ra.left + ra.width / 2 - cx, ra.top + ra.height / 2 - cy);
      const db = Math.hypot(rb.left + rb.width / 2 - cx, rb.top + rb.height / 2 - cy);
      return da - db;
    });
    gsap.to(others, {
      opacity: 0.2,
      scale: 0.965,
      duration: DUR.gridRecede,
      ease: EASE.out,
      stagger: 0.05,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [openSlug]);

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
    if (closingRef.current) return;
    const project = projects.find((p) => p.slug === slug);
    if (!project) return;
    setOpenSlug(slug);
    lockScroll();
    transitionPalette(project.palette);
    document.documentElement.setAttribute("data-work-open", "true");
  }, []);

  const finishClose = useCallback((slug: string | null) => {
    if (slug) {
      const card = cardMediaEl(slug);
      if (card) gsap.set(card, { visibility: "visible" });
    }
    setOpenSlug(null);
    closingRef.current = false;
    unlockScroll();
    resetPalette();
    document.documentElement.removeAttribute("data-work-open");
  }, []);

  const handleClose = useCallback(() => {
    if (closingRef.current) return;
    const slug = prevOpenRef.current;
    const expandedMedia = document.querySelector<HTMLElement>(
      "[data-expanded-media]"
    );
    const bg = document.querySelector<HTMLElement>("[data-expanded-bg]");
    const reveals = document.querySelectorAll<HTMLElement>(
      "[data-expanded-reveal]"
    );
    const card = slug ? cardMediaEl(slug) : null;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    if (reduced || !card || !expandedMedia) {
      finishClose(slug);
      return;
    }

    closingRef.current = true;

    const root = document.querySelector<HTMLElement>("[data-work-expanded]");
    const slot = document.querySelector<HTMLElement>(
      "[data-expanded-media-slot]"
    );

    /**
     * Rewind the detail's own scroll before the Flip, so the media is back
     * on screen and the close mirrors the opening. Proportional to the
     * distance and capped, so a shallow scroll barely delays anything.
     */
    const scrolled = root ? root.scrollTop : 0;
    const rewind =
      scrolled > 1
        ? Math.min(DUR.expandRewindMax, Math.max(0.2, scrolled / 4000))
        : 0;

    // reverse of the open sequencing: content leaves first, then the Flip
    const flipStart = rewind + DUR.expandContentOut * 0.85;
    const tl = gsap.timeline();
    tl.to(
      reveals,
      { opacity: 0, duration: DUR.expandContentOut, ease: "power1.in" },
      0
    );
    if (root && rewind > 0) {
      tl.to(root, { scrollTop: 0, duration: rewind, ease: EASE.inOut }, 0);
    }
    /**
     * Everything below is created *inside* a call, i.e. after the rewind has
     * finished. Flip.fit measures the element the moment it is built, so
     * building it up front would have captured the pre-rewind geometry and
     * flown from the wrong place.
     */
    tl.call(
      () => {
        /**
         * Freeze the wrapper's height *before* Flip pulls the media out of
         * the flow. Otherwise the scroller's height drops by the media's
         * height and the browser clamps scrollTop instantly — the jump this
         * whole sequence exists to avoid.
         */
        if (slot) slot.style.height = `${slot.offsetHeight}px`;

        Flip.fit(expandedMedia, card, {
          absolute: true,
          duration: DUR.expandClose,
          ease: EASE.expansion,
        });

        if (bg) {
          gsap.to(bg, {
            opacity: 0,
            duration: DUR.expandClose,
            ease: "power2.inOut",
          });
        }
        gsap.to(otherCards(slug ?? ""), {
          opacity: 1,
          scale: 1,
          duration: DUR.gridRecede,
          ease: EASE.out,
          stagger: 0.04,
          delay: 0.05,
        });

        // Flip.fit can return null (nothing to animate); the teardown must
        // still run, so completion is timed rather than tween-driven.
        gsap.delayedCall(DUR.expandClose, () => finishClose(slug));
      },
      undefined,
      flipStart
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [finishClose]);

  const handleNavigate = useCallback(
    (dir: 1 | -1) => {
      if (closingRef.current) return;
      const current = prevOpenRef.current;
      if (!current) return;
      const index = getProjectIndex(current);
      const nextProject =
        projects[(index + dir + projects.length) % projects.length];
      setOpenSlug(nextProject.slug);
      transitionPalette(nextProject.palette);
    },
    []
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
