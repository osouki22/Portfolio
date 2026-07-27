"use client";

import { useEffect, useRef, useState } from "react";
import { Renderer, Program, Mesh, Triangle, Texture, RenderTarget } from "ogl";
import { useGlitchUniforms } from "./useGlitchUniforms";
import { PARTICLE } from "@/lib/motion";
import vertex from "./shaders/glitch.vert";
import fragment from "./shaders/glitch.frag";
import simFragment from "./shaders/sim.frag";

interface GlitchCanvasProps {
  src: string;
  /** displacement ceiling (uv units) — hero > card */
  maxShift: number;
  /** resting envelope floor — grain persists at rest */
  restIntensity: number;
  /** cursor proximity falloff radius for the drag field */
  radius?: number;
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
 * Particle-drag renderer: a low-res half-float ping-pong displacement field
 * (velocity + spring + damping per texel, sim.frag) feeds the display pass
 * (glitch.frag) which drags the image's pixels with luminance weighting.
 * Owns its context; mount/unmount = create/destroy. The rAF loop pauses
 * when the element leaves the viewport or the tab hides.
 */
export default function GlitchCanvas({
  src,
  maxShift,
  restIntensity,
  radius = PARTICLE.radiusHero,
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
      // the sim needs renderable half-float targets
      if (!renderer.gl.getExtension("EXT_color_buffer_float") &&
          !renderer.gl.getExtension("EXT_color_buffer_half_float")) {
        throw new Error("no float render targets");
      }
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

    // ---- displacement-field sim (ping-pong) -------------------------------
    const gl2 = gl as unknown as WebGL2RenderingContext;
    const makeTarget = (w: number, h: number) =>
      new RenderTarget(gl, {
        width: w,
        height: h,
        type: gl2.HALF_FLOAT,
        format: gl2.RGBA,
        internalFormat: gl2.RGBA16F,
        minFilter: gl2.LINEAR,
        magFilter: gl2.LINEAR,
        depth: false,
      });

    let simRead = makeTarget(4, 4);
    let simWrite = makeTarget(4, 4);

    const simGeometry = new Triangle(gl);
    const simProgram = new Program(gl, {
      vertex,
      fragment: simFragment,
      uniforms: {
        tSim: { value: simRead.texture },
        uCursor: { value: [0.5, 0.5] },
        uCursorVel: { value: [0, 0] },
        uAspect: { value: 1 },
        uDrag: { value: PARTICLE.drag },
        uSpringK: { value: PARTICLE.springK },
        uDamping: { value: PARTICLE.damping },
        uDt: { value: PARTICLE.dt },
        uRadius: { value: radius },
      },
    });
    const simMesh = new Mesh(gl, { geometry: simGeometry, program: simProgram });

    // ---- display pass ------------------------------------------------------
    const texture = new Texture(gl, { generateMipmaps: false });
    const geometry = new Triangle(gl);
    const program = new Program(gl, {
      vertex,
      fragment,
      uniforms: {
        uTexture: { value: texture },
        tSim: { value: simRead.texture },
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
      const aspect = width / height;
      simProgram.uniforms.uAspect.value = aspect;
      // rebuild the field at the new aspect (state reset is imperceptible)
      const sw = aspect >= 1 ? PARTICLE.simSize : Math.round(PARTICLE.simSize * aspect);
      const sh = aspect >= 1 ? Math.round(PARTICLE.simSize / aspect) : PARTICLE.simSize;
      simRead = makeTarget(Math.max(sw, 8), Math.max(sh, 8));
      simWrite = makeTarget(Math.max(sw, 8), Math.max(sh, 8));
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
    const prevMouse = { x: 0.5, y: 0.5 };

    const frame = (now: number) => {
      if (!running) return;
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      elapsed += dt;

      dynamics.update(dt, elapsed);

      // cursor velocity in uv/frame (frame-normalized to 60 fps)
      const scale = dt > 0 ? (1 / 60) / dt : 1;
      const cvx = (dynamics.mouse.x - prevMouse.x) * scale;
      const cvy = (dynamics.mouse.y - prevMouse.y) * scale;
      prevMouse.x = dynamics.mouse.x;
      prevMouse.y = dynamics.mouse.y;

      // 1) advance the displacement field
      simProgram.uniforms.tSim.value = simRead.texture;
      simProgram.uniforms.uCursor.value = [dynamics.mouse.x, dynamics.mouse.y];
      simProgram.uniforms.uCursorVel.value = [cvx, cvy];
      renderer.render({ scene: simMesh, target: simWrite });
      const tmp = simRead;
      simRead = simWrite;
      simWrite = tmp;

      // 2) display pass
      program.uniforms.tSim.value = simRead.texture;
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
  }, [src, maxShift, restIntensity, radius, trackWindow, ambient, dprCap]);

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
