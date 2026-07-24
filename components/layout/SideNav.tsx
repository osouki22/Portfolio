"use client";

import { useEffect, useState } from "react";
import { sections, type SectionId } from "@/lib/content";
import { ScrollTrigger, setupGsap } from "@/lib/gsapSetup";
import { scrollToSection } from "@/lib/scroll";

/**
 * Fixed vertical section navigation, placed on the RIGHT — opposite the
 * portrait's left-side negative space, so it never competes with the name.
 * Scroll spy via ScrollTrigger; labels reveal on hover/active; dims while
 * the expanded work view is open (html[data-work-open]).
 * On mobile it reduces to a minimal dot column.
 */
export default function SideNav() {
  const [active, setActive] = useState<SectionId>("home");

  useEffect(() => {
    setupGsap();
    const triggers = sections.map(({ id }) =>
      ScrollTrigger.create({
        trigger: `#${id}`,
        start: "top 50%",
        end: "bottom 50%",
        onToggle: (self) => {
          if (self.isActive) setActive(id);
        },
      })
    );
    return () => triggers.forEach((t) => t.kill());
  }, []);

  return (
    <nav
      aria-label="Sections"
      className="side-nav fixed right-3 top-1/2 z-40 -translate-y-1/2 md:right-8"
    >
      <ul className="flex flex-col items-end gap-5 md:gap-6">
        {sections.map(({ id, label }, i) => {
          const isActive = active === id;
          return (
            <li key={id}>
              <button
                type="button"
                onClick={() => scrollToSection(`#${id}`)}
                aria-label={label}
                aria-current={isActive ? "true" : undefined}
                className="side-nav__item group flex min-h-6 min-w-6 cursor-pointer items-center justify-end gap-3"
              >
                <span
                  className={`side-nav__label hidden text-[0.6875rem] font-medium uppercase tracking-[0.18em] transition-all duration-300 md:block ${
                    isActive
                      ? "translate-x-0 text-white opacity-100"
                      : "translate-x-2 text-white/50 opacity-0 group-hover:translate-x-0 group-hover:opacity-100"
                  }`}
                >
                  {label}
                </span>
                <span
                  className={`side-nav__num hidden text-[0.625rem] tabular-nums transition-colors duration-300 md:block ${
                    isActive ? "text-white" : "text-white/35"
                  }`}
                >
                  {String(i + 1).padStart(2, "0")}
                </span>
                <span
                  className={`side-nav__dot block rounded-full transition-all duration-300 ${
                    isActive
                      ? "h-2 w-2 bg-white"
                      : "h-1.5 w-1.5 bg-white/35 group-hover:bg-white/70"
                  }`}
                  aria-hidden="true"
                />
              </button>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
