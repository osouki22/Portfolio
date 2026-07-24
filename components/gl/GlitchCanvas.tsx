"use client";

import { useEffect, useRef, useState } from "react";
import { Renderer, Program, Mesh, Triangle, Texture } from "ogl";
import { useGlitchUniforms } from "./useGlitchUniforms";
import vertex from "./shaders/glitch.vert";
import fragment from "./shaders/glitch.frag";

interface GlitchCanvasProps {
  src: string;
  /** strip displacement ceiling (uv units) — hero > card */
  maxShift: number;
  /** resting intensity floor — scanlines/grain persist at rest */
  restIntensity: number;
  /** hero: track the cursor across the whole viewport */
  trackWindow?: boolean;
  /** autonomous drift when idle (touch devices) */
  ambient?: boolean;
  /** devicePixelRatio ceiling — GPU cost control */
  dprCap?: number;
  className?: string;
  /** WebGL unavailable → parent keeps its static fallback */
  onContextFail?: () => void;
}

/**
 * Reusable ogl-backed glitch renderer: one fragment shader on a fullscreen
 * triangle. Owns its context; mount/unmount = create/destroy. The rAF loop
 * pauses when the element leaves the viewport or the tab hides.
 * Fades in only once the texture is ready — no black flash.
 */
export default function GlitchCanvas({
  src,
  maxShift,
  restIntensity,
  trackWindow = false,
  ambient = false,
  dprCap = 1.75,
  className = "",
  onContextFail,
}: GlitchCanvasProps) {
  const holderRef = useRef<HTMLDivElement>(null);
  const [ready, setReady] = useState(false);
  const dynamics = useGlitchUniforms(restIntensity, ambient);

  useEffect(() => {
    const holder = holderRef.current;
    if (!holder) return;

    let renderer: Renderer;
    try {
      renderer = new Renderer({
        dpr: Math.min(window.devicePixelRatio || 1, dprCap),
        alpha: false,
        antialias: false,
        powerPreference: "high-performance",
      });
      if (!renderer.gl) throw new Error("no context");
    } catch {
      onContextFail?.();
      return;
    }

    const gl = renderer.gl;
    gl.canvas.style.position = "absolute";
    gl.canvas.style.inset = "0";
    gl.canvas.style.width = "100%";
    gl.canvas.style.height = "100%";
    holder.appendChild(gl.canvas);

    const texture = new Texture(gl, { generateMipmaps: false });
    const geometry = new Triangle(gl);
    const program = new Program(gl, {
      vertex,
      fragment,
      uniforms: {
        uTexture: { value: texture },
        uTime: { value: 0 },
        uMouse: { value: [0.5, 0.5] },
        uMouseDir: { value: [1, 0] },
        uVelocity: { value: 0 },
        uIntensity: { value: restIntensity },
        uMaxShift: { value: maxShift },
        uResolution: { value: [1, 1] },
        uImageResolution: { value: [1, 1] },
      },
    });
    const mesh = new Mesh(gl, { geometry, program });

    let disposed = false;
    let textureReady = false;

    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      if (disposed) return;
      texture.image = img;
      program.uniforms.uImageResolution.value = [
        img.naturalWidth,
        img.naturalHeight,
      ];
      textureReady = true;
      setReady(true);
    };
    img.src = src;

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

    // ---- input ------------------------------------------------------------
    const toLocal = (clientX: number, clientY: number) => {
      if (trackWindow) {
        return {
          x: clientX / window.innerWidth,
          y: 1 - clientY / window.innerHeight,
        };
      }
      const r = holder.getBoundingClientRect();
      return {
        x: (clientX - r.left) / r.width,
        y: 1 - (clientY - r.top) / r.height,
      };
    };

    const onPointerMove = (e: PointerEvent) => {
      const p = toLocal(e.clientX, e.clientY);
      dynamics.input(p.x, p.y);
    };
    const onPointerLeave = () => dynamics.release();
    const onTouchMove = (e: TouchEvent) => {
      const t = e.touches[0];
      if (!t) return;
      const p = toLocal(t.clientX, t.clientY);
      dynamics.input(p.x, p.y);
    };

    const inputTarget: HTMLElement | Window = trackWindow ? window : holder;
    inputTarget.addEventListener("pointermove", onPointerMove as EventListener, {
      passive: true,
    });
    inputTarget.addEventListener("pointerleave", onPointerLeave);
    inputTarget.addEventListener("touchmove", onTouchMove as EventListener, {
      passive: true,
    });

    // ---- render loop, paused off-screen / hidden tab ------------------------
    let raf = 0;
    let running = false;
    let inView = true;
    let last = performance.now();
    let elapsed = 0;

    const frame = (now: number) => {
      if (!running) return;
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      elapsed += dt;

      dynamics.update(dt, elapsed);
      program.uniforms.uTime.value = elapsed;
      program.uniforms.uMouse.value = [dynamics.mouse.x, dynamics.mouse.y];
      program.uniforms.uMouseDir.value = [dynamics.mouseDir.x, dynamics.mouseDir.y];
      program.uniforms.uVelocity.value = dynamics.velocity;
      program.uniforms.uIntensity.value = dynamics.intensity;

      if (textureReady) renderer.render({ scene: mesh });
      raf = requestAnimationFrame(frame);
    };

    const setRunning = (on: boolean) => {
      if (on === running) return;
      running = on;
      if (on) {
        last = performance.now();
        raf = requestAnimationFrame(frame);
      } else {
        cancelAnimationFrame(raf);
      }
    };

    const io = new IntersectionObserver(
      ([entry]) => {
        inView = entry.isIntersecting;
        setRunning(inView && !document.hidden);
      },
      { threshold: 0 }
    );
    io.observe(holder);

    const onVisibility = () => setRunning(inView && !document.hidden);
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      disposed = true;
      setRunning(false);
      ro.disconnect();
      io.disconnect();
      document.removeEventListener("visibilitychange", onVisibility);
      inputTarget.removeEventListener(
        "pointermove",
        onPointerMove as EventListener
      );
      inputTarget.removeEventListener("pointerleave", onPointerLeave);
      inputTarget.removeEventListener(
        "touchmove",
        onTouchMove as EventListener
      );
      holder.removeChild(gl.canvas);
      gl.getExtension("WEBGL_lose_context")?.loseContext();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [src, maxShift, restIntensity, trackWindow, ambient, dprCap]);

  return (
    <div
      ref={holderRef}
      aria-hidden="true"
      className={`pointer-events-none absolute inset-0 transition-opacity duration-700 ${
        ready ? "opacity-100" : "opacity-0"
      } ${className}`}
    />
  );
}
