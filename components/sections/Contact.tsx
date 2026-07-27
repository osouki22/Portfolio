"use client";

import { useEffect, useRef } from "react";
import { contact } from "@/lib/content";
import { gsap, setupGsap } from "@/lib/gsapSetup";
import { DUR, EASE } from "@/lib/motion";
import MeshText from "@/components/gl/MeshText";

/**
 * Contact — display-scale headline, direct links only, no form.
 * Madrid coordinates rendered as a typographic detail, no map.
 */
export default function Contact() {
  const sectionRef = useRef<HTMLElement>(null);

  useEffect(() => {
    setupGsap();
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const section = sectionRef.current;
    if (!section) return;
    const targets = section.querySelectorAll("[data-contact-reveal]");
    if (reduced) {
      gsap.set(targets, { opacity: 1, y: 0 });
      return;
    }
    const tween = gsap.fromTo(
      targets,
      { opacity: 0, y: 34 },
      {
        opacity: 1,
        y: 0,
        duration: DUR.reveal,
        ease: EASE.out,
        stagger: 0.08,
        scrollTrigger: {
          trigger: section,
          start: "top 62%",
          once: true,
        },
      }
    );
    return () => {
      tween.scrollTrigger?.kill();
      tween.kill();
    };
  }, []);

  return (
    <section
      ref={sectionRef}
      id="contact"
      aria-label="Contact"
      className="relative flex min-h-svh flex-col justify-between px-[6vw] pb-[7vh] pt-[24vh]"
    >
      <div>
        <h2 data-contact-reveal className="opacity-0">
          {/* same shared mesh-text instrument as the About headline */}
          <MeshText text={contact.title} className="text-display" />
        </h2>
        <p
          data-contact-reveal
          className="text-lead mt-8 max-w-[30rem] text-white/70 opacity-0"
        >
          {contact.subtitle}
        </p>

        <ul className="mt-[10vh] space-y-2">
          <li data-contact-reveal className="opacity-0">
            <a
              href={contact.emailHref}
              className="contact-link text-headline"
            >
              {contact.email}
            </a>
          </li>
          <li data-contact-reveal className="opacity-0">
            <a href={contact.phoneHref} className="contact-link text-headline">
              {contact.phone}
            </a>
          </li>
          <li data-contact-reveal className="opacity-0">
            <a
              href={contact.linkedin}
              target="_blank"
              rel="noopener noreferrer"
              className="contact-link text-headline"
            >
              {contact.linkedinLabel}
            </a>
          </li>
        </ul>
      </div>

      {/* Location — typographic/decorative detail only */}
      <div
        data-contact-reveal
        className="mt-[14vh] flex items-end justify-between opacity-0"
      >
        <div>
          <p className="text-kicker">{contact.location}</p>
          <p className="mt-2 text-sm tabular-nums tracking-[0.22em] text-white/35">
            {contact.coordinates}
          </p>
        </div>
        <p className="text-sm text-white/25">© {new Date().getFullYear()}</p>
      </div>
    </section>
  );
}
