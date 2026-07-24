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

    Flip.from(state, {
      targets: expandedMedia,
      absolute: true,
      duration: DUR.expandOpen,
      ease: EASE.expansion,
    });

    if (bg) {
      gsap.fromTo(
        bg,
        { opacity: 0 },
        { opacity: 1, duration: DUR.expandOpen, ease: "power2.inOut" }
      );
    }

    gsap.fromTo(
      reveals,
      { opacity: 0, y: 28 },
      {
        opacity: 1,
        y: 0,
        duration: 0.7,
        ease: EASE.out,
        stagger: 0.06,
        delay: DUR.expandOpen * 0.45,
      }
    );

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

    const tl = gsap.timeline({
      onComplete: () => finishClose(slug),
    });
    tl.to(reveals, { opacity: 0, duration: 0.22, ease: "power1.in" }, 0);
    tl.to(
      bg,
      { opacity: 0, duration: DUR.expandClose, ease: "power2.inOut" },
      0.05
    );
    tl.add(
      Flip.fit(expandedMedia, card, {
        absolute: true,
        duration: DUR.expandClose,
        ease: EASE.expansion,
      }) as gsap.core.Tween,
      0
    );
    tl.to(
      otherCards(slug ?? ""),
      {
        opacity: 1,
        scale: 1,
        duration: DUR.gridRecede,
        ease: EASE.out,
        stagger: 0.04,
      },
      0.1
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
