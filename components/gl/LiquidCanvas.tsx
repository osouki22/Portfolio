"use client";

import { useEffect, useRef, useState } from "react";
import { Renderer, Program, Mesh, Triangle, Texture } from "ogl";
import { useLiquidDynamics } from "./useLiquidDynamics";
import { LIQUID } from "@/lib/motion";
import vertex from "./shaders/quad.vert";
import liquidChunk from "./shaders/liquid.glsl";
import liquidBody from "./shaders/liquid.frag";

/** shared liquid vocabulary + this surface's body */
const fragment = `${liquidChunk}\n${liquidBody}`;

interface LiquidCanvasProps {
  /** the layer visible by default */
  src: string;
  /** hero only: the layer revealed through the liquid aperture */
  revealSrc?: string;
  /** widest the aperture opens (uv units); 0 ⇒ no aperture (cards) */
  maxRadius?: number;
  /** ceiling of the cursor-driven push displacement */
  pushAmp?: number;
  /** falloff radius of the push around the cursor */
  pushRadius?: number;
  /** ceiling of the scroll-driven warp displacement */
  warpAmp?: number;
  /** hero: track the cursor across the whole viewport */
  trackWindow?: boolean;
  /** autonomous drift when idle (touch devices) */
  ambient?: boolean;
  /** devicePixelRatio ceiling */
  dprCap?: number;
  className?: string;
  /** WebGL unavailable → parent keeps its static image */
  onContextFail?: () => void;
}

/**
 * The site's liquid surface renderer. One fragment shader (liquid.frag on
 * top of the shared liquid.glsl chunk) instantiated twice:
 *
 *   hero  — two layers, cursor-speed-driven reveal aperture, full warp
 *   card  — one layer, no aperture, gentler cursor push
 *
 * Owns its context; mount/unmount = create/destroy, so only the hovered
 * card ever holds one. The rAF loop pauses off-screen (IntersectionObserver)
 * and on tab blur. Fades in once the textures are ready — no black flash.
 */
export default function LiquidCanvas({
  src,
  revealSrc,
  maxRadius = 0,
  pushAmp = LIQUID.cardPushAmp,
  pushRadius = LIQUID.cardPushRadius,
  warpAmp = LIQUID.cardWarpAmp,
  trackWindow = false,
  ambient = false,
  dprCap = LIQUID.cardDprCap,
  className = "",
  onContextFail,
}: LiquidCanvasProps) {
  const holderRef = useRef<HTMLDivElement>(null);
  const [ready, setReady] = useState(false);
  const dynamics = useLiquidDynamics(ambient);

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

    const hasAperture = Boolean(revealSrc) && maxRadius > 0;

    const topTexture = new Texture(gl, { generateMipmaps: false });
    const bottomTexture = hasAperture
      ? new Texture(gl, { generateMipmaps: false })
      : topTexture;

    const geometry = new Triangle(gl);
    const program = new Program(gl, {
      vertex,
      fragment,
      uniforms: {
        uTop: { value: topTexture },
        uBottom: { value: bottomTexture },
        uTime: { value: 0 },
        uCursor: { value: [0.5, 0.5] },
        uReveal: { value: 0 },
        uMask: { value: hasAperture ? 1 : 0 },
        uPush: { value: 0 },
        uScroll: { value: 0 },
        uResolution: { value: [1, 1] },
        uImageResolution: { value: [1, 1] },
        uMaxRadius: { value: maxRadius },
        uBlob0: { value: [0.5, 0.5, 0] },
        uBlob1: { value: [0.5, 0.5, 0] },
        uBlob2: { value: [0.5, 0.5, 0] },
        uBlob3: { value: [0.5, 0.5, 0] },
        uBlob4: { value: [0.5, 0.5, 0] },
        uGooThreshold: { value: LIQUID.gooThreshold },
        uGooSoftness: { value: LIQUID.gooSoftness },
        uEdgeDistort: { value: LIQUID.edgeDistort },
        uInteriorFlow: { value: LIQUID.interiorFlow },
        uWarpAmp: { value: warpAmp },
        uPushAmp: { value: pushAmp },
        uPushRadius: { value: pushRadius },
      },
    });
    const mesh = new Mesh(gl, { geometry, program });

    let disposed = false;
    let pending = hasAperture ? 2 : 1;

    const loadInto = (texture: Texture, url: string, primary: boolean) => {
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.onload = () => {
        if (disposed) return;
        texture.image = img;
        if (primary) {
          program.uniforms.uImageResolution.value = [
            img.naturalWidth,
            img.naturalHeight,
          ];
        }
        pending -= 1;
        if (pending <= 0) setReady(true);
      };
      img.src = url;
    };
    loadInto(topTexture, src, true);
    if (hasAperture && revealSrc) loadInto(bottomTexture, revealSrc, false);

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

    // ---- input -------------------------------------------------------------
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

    /**
     * Input is always taken from `window`: this canvas is pointer-events-none
     * (it must never intercept clicks on the card), so listening on the
     * element itself would never fire. For the card instance the position is
     * normalized to its own box, and a pointer outside that box releases the
     * surface so it settles back.
     */
    const feed = (clientX: number, clientY: number) => {
      if (!trackWindow) {
        const r = holder.getBoundingClientRect();
        const inside =
          clientX >= r.left &&
          clientX <= r.right &&
          clientY >= r.top &&
          clientY <= r.bottom;
        if (!inside) {
          dynamics.release();
          return;
        }
      }
      const p = toLocal(clientX, clientY);
      dynamics.input(p.x, p.y);
    };

    const onPointerMove = (e: PointerEvent) => feed(e.clientX, e.clientY);
    const onPointerLeave = () => dynamics.release();
    const onTouchMove = (e: TouchEvent) => {
      const t = e.touches[0];
      if (t) feed(t.clientX, t.clientY);
    };

    window.addEventListener("pointermove", onPointerMove, { passive: true });
    document.addEventListener("pointerleave", onPointerLeave);
    window.addEventListener("touchmove", onTouchMove, { passive: true });

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
      program.uniforms.uCursor.value = [dynamics.cursor.x, dynamics.cursor.y];
      program.uniforms.uReveal.value = dynamics.reveal;

      // aperture centres: head radius tapers to the tail, and every radius
      // carries uReveal so a shut window leaves an empty field
      if (hasAperture) {
        const blobs = dynamics.blobs;
        const n = blobs.length;
        for (let i = 0; i < 5; i++) {
          const slot = program.uniforms[`uBlob${i}`].value as number[];
          if (i < n) {
            const t = n > 1 ? i / (n - 1) : 0;
            const scale =
              LIQUID.blobHeadScale +
              (LIQUID.blobTailScale - LIQUID.blobHeadScale) * t;
            slot[0] = blobs[i].x;
            slot[1] = blobs[i].y;
            slot[2] = maxRadius * dynamics.reveal * scale;
          } else {
            slot[2] = 0; // unused centre
          }
        }
      }
      program.uniforms.uPush.value = dynamics.push;
      program.uniforms.uScroll.value = dynamics.scroll;

      if (pending <= 0) renderer.render({ scene: mesh });
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
      window.removeEventListener("pointermove", onPointerMove);
      document.removeEventListener("pointerleave", onPointerLeave);
      window.removeEventListener("touchmove", onTouchMove);
      holder.removeChild(gl.canvas);
      gl.getExtension("WEBGL_lose_context")?.loseContext();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    src,
    revealSrc,
    maxRadius,
    pushAmp,
    pushRadius,
    warpAmp,
    trackWindow,
    ambient,
    dprCap,
  ]);

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
