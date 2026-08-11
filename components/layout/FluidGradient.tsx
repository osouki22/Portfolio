"use client";

import { useEffect, useRef } from "react";
import { Renderer, Program, Mesh, Triangle } from "ogl";
import { getLenis } from "@/lib/scroll";
import { FLUID } from "@/lib/motion";
import vertex from "./../gl/shaders/quad.vert";
import fragment from "./../gl/shaders/fluid.frag";

interface FluidGradientProps {
  /** reports whether the WebGL fluid is live (false → CSS fallback stays) */
  onLive: (live: boolean) => void;
}

function parseCssColor(raw: string): [number, number, number] | null {
  const s = raw.trim();
  if (s.startsWith("#")) {
    const hex = s.slice(1);
    const full =
      hex.length === 3 ? hex.split("").map((c) => c + c).join("") : hex;
    const n = parseInt(full, 16);
    if (Number.isNaN(n)) return null;
    return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
  }
  const m = s.match(/rgba?\(([^)]+)\)/);
  if (m) {
    const parts = m[1].split(",").map((v) => parseFloat(v));
    if (parts.length >= 3) return [parts[0] / 255, parts[1] / 255, parts[2] / 255];
  }
  return null;
}

/**
 * Scroll-driven fluid gradient. Reads the --mesh-* custom properties every
 * frame (so GSAP palette transitions flow straight through), integrates a
 * flow phase from Lenis scroll velocity with inertia, and renders a
 * domain-warped gradient at capped density. Pauses while the opaque
 * expanded Work view covers it, off-tab, and renders motionless (palette
 * still live) under prefers-reduced-motion.
 */
export default function FluidGradient({ onLive }: FluidGradientProps) {
  const holderRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const holder = holderRef.current;
    if (!holder) return;

    let renderer: Renderer;
    try {
      renderer = new Renderer({
        dpr: Math.min(window.devicePixelRatio || 1, FLUID.dprCap) * 0.75,
        alpha: false,
        antialias: false,
        powerPreference: "low-power",
      });
      if (!renderer.gl) throw new Error("no context");
    } catch {
      onLive(false);
      return;
    }

    const gl = renderer.gl;
    gl.canvas.style.position = "absolute";
    gl.canvas.style.inset = "0";
    gl.canvas.style.width = "100%";
    gl.canvas.style.height = "100%";
    holder.appendChild(gl.canvas);

    const geometry = new Triangle(gl);
    const program = new Program(gl, {
      vertex,
      fragment,
      uniforms: {
        uPhase: { value: 0 },
        uFlow: { value: 0 },
        uResolution: { value: [1, 1] },
        uBase: { value: [0, 0, 0] },
        uC1: { value: [0, 0, 0] },
        uC2: { value: [0, 0, 0] },
        uC3: { value: [0, 0, 0] },
        uC4: { value: [0, 0, 0] },
        uGrain: { value: FLUID.grain },
      },
    });
    const mesh = new Mesh(gl, { geometry, program });

    const resize = () => {
      const { width, height } = holder.getBoundingClientRect();
      if (width === 0 || height === 0) return;
      renderer.setSize(width, height);
      program.uniforms.uResolution.value = [
        gl.drawingBufferWidth,
        gl.drawingBufferHeight,
      ];
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(holder);

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    // palette: read the custom properties each frame, cache parses
    const colorCache = new Map<string, [number, number, number]>();
    const readColor = (styles: CSSStyleDeclaration, name: string) => {
      const raw = styles.getPropertyValue(name);
      let c = colorCache.get(raw);
      if (!c) {
        c = parseCssColor(raw) ?? [0, 0, 0];
        colorCache.set(raw, c);
      }
      return c;
    };

    // flow state — agitates fast, loses momentum like a liquid
    let phase = Math.random() * 100;
    let flow = FLUID.restFlow;
    let lastScrollY = window.scrollY;

    let raf = 0;
    let running = false;
    let covered = document.documentElement.hasAttribute("data-work-open");
    let last = performance.now();

    const frame = (now: number) => {
      if (!running) return;
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;

      // scroll velocity: Lenis when active, raw scroll delta otherwise
      const lenis = getLenis();
      let v: number;
      if (lenis) {
        v = Math.abs(lenis.velocity);
      } else {
        v = Math.abs(window.scrollY - lastScrollY) / Math.max(dt, 1e-3) / 60;
        lastScrollY = window.scrollY;
      }

      if (!reduced) {
        const target = Math.min(
          FLUID.maxFlow,
          FLUID.restFlow + v * FLUID.agitation
        );
        if (target > flow) {
          // agitate quickly with the push
          const k = 1 - Math.pow(1 - 0.22, dt * 60);
          flow += (target - flow) * k;
        } else {
          // decelerate with inertia — water losing momentum
          flow += (target - flow) * (1 - Math.exp(-FLUID.decay * dt));
        }
        phase += flow * dt;
      }

      const styles = getComputedStyle(document.documentElement);
      program.uniforms.uBase.value = readColor(styles, "--mesh-base");
      program.uniforms.uC1.value = readColor(styles, "--mesh-1");
      program.uniforms.uC2.value = readColor(styles, "--mesh-2");
      program.uniforms.uC3.value = readColor(styles, "--mesh-3");
      program.uniforms.uC4.value = readColor(styles, "--mesh-4");
      program.uniforms.uPhase.value = phase;
      program.uniforms.uFlow.value = Math.min(
        1,
        (flow - FLUID.restFlow) / (FLUID.maxFlow - FLUID.restFlow)
      );

      renderer.render({ scene: mesh });
      raf = requestAnimationFrame(frame);
    };

    const update = () => {
      const on = !document.hidden && !covered;
      if (on === running) return;
      running = on;
      if (on) {
        last = performance.now();
        raf = requestAnimationFrame(frame);
      } else {
        cancelAnimationFrame(raf);
      }
    };

    // yield entirely while the opaque expanded Work view covers the page
    const mo = new MutationObserver(() => {
      covered = document.documentElement.hasAttribute("data-work-open");
      update();
    });
    mo.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["data-work-open"],
    });
    const onVisibility = () => update();
    document.addEventListener("visibilitychange", onVisibility);

    onLive(true);
    update();

    return () => {
      running = false;
      cancelAnimationFrame(raf);
      ro.disconnect();
      mo.disconnect();
      document.removeEventListener("visibilitychange", onVisibility);
      holder.removeChild(gl.canvas);
      gl.getExtension("WEBGL_lose_context")?.loseContext();
      onLive(false);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return <div ref={holderRef} className="absolute inset-0" aria-hidden="true" />;
}
