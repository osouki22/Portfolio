"use client";

import { useEffect, useRef, useState } from "react";
import { Renderer, Program, Mesh, Plane, Texture } from "ogl";
import { MESH_TEXT } from "@/lib/motion";
import { useReducedMotion } from "@/lib/useMediaQuery";
import vertex from "./shaders/meshtext.vert";
import fragment from "./shaders/meshtext.frag";

interface MeshTextProps {
  text: string;
  /** typography classes applied to the DOM text (layout + a11y source) */
  className?: string;
}

function parseColor(hex: string): [number, number, number] {
  const n = parseInt(hex.replace("#", ""), 16);
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
}

/**
 * Deformable mesh-text (ported reference physics — see MESH_TEXT in
 * lib/motion.ts). The headline is rendered to a canvas texture and drawn
 * on a 96×40 vertex grid; the cursor drags vertices with inertia
 * (velocity + spring + damping per vertex, over-damped) and a magenta/
 * green chromatic fringe scales with local displacement.
 *
 * The real DOM text stays in the tree for layout, semantics, and as the
 * reduced-motion / no-WebGL fallback; the canvas overlays it and the DOM
 * text turns invisible only while the canvas is live.
 */
export default function MeshText({ text, className = "" }: MeshTextProps) {
  const wrapRef = useRef<HTMLSpanElement>(null);
  const textRef = useRef<HTMLSpanElement>(null);
  const holderRef = useRef<HTMLDivElement>(null);
  const [live, setLive] = useState(false);
  const reduced = useReducedMotion();

  useEffect(() => {
    if (reduced) return;
    const wrap = wrapRef.current;
    const textEl = textRef.current;
    const holder = holderRef.current;
    if (!wrap || !textEl || !holder) return;

    let renderer: Renderer;
    try {
      renderer = new Renderer({
        dpr: Math.min(window.devicePixelRatio || 1, 2),
        alpha: true,
        premultipliedAlpha: true,
        antialias: false,
      });
      if (!renderer.gl) throw new Error("no context");
    } catch {
      return; // DOM text remains visible
    }

    const gl = renderer.gl;
    gl.canvas.style.position = "absolute";
    gl.canvas.style.inset = "0";
    gl.canvas.style.width = "100%";
    gl.canvas.style.height = "100%";
    holder.appendChild(gl.canvas);

    const { gridW, gridH, drag, springK, damping, dt, radius, chroma } =
      MESH_TEXT;
    const colors = [parseColor(MESH_TEXT.colorA), parseColor(MESH_TEXT.colorB)];

    // 96×40 vertex grid in clip space
    const geometry = new Plane(gl, {
      width: 2,
      height: 2,
      widthSegments: gridW - 1,
      heightSegments: gridH - 1,
    });
    const vertCount = gridW * gridH;
    const disp = new Float32Array(vertCount * 2);
    const vel = new Float32Array(vertCount * 2);
    geometry.addAttribute("aDisp", {
      size: 2,
      data: disp,
      usage: gl.DYNAMIC_DRAW,
    });
    const basePos = geometry.attributes.position.data as Float32Array; // xyz

    const texture = new Texture(gl, { generateMipmaps: false });
    const program = new Program(gl, {
      vertex,
      fragment,
      uniforms: {
        uText: { value: texture },
        uColorA: { value: colors[0] },
        uColorB: { value: colors[1] },
        uChroma: { value: 1.0 },
        uChromaBase: { value: chroma },
      },
      transparent: true,
    });
    program.setBlendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
    const mesh = new Mesh(gl, { geometry, program });

    // ---- text texture: draw the DOM text's exact typography ----------------
    const textCanvas = document.createElement("canvas");
    const ctx = textCanvas.getContext("2d")!;
    let disposed = false;

    const drawTexture = async () => {
      const holderRect = holder.getBoundingClientRect();
      const textRect = textEl.getBoundingClientRect();
      if (holderRect.width === 0 || holderRect.height === 0) return;

      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      textCanvas.width = Math.round(holderRect.width * dpr);
      textCanvas.height = Math.round(holderRect.height * dpr);

      const style = getComputedStyle(textEl);
      const font = `${style.fontWeight} ${style.fontSize} ${style.fontFamily}`;
      // without this await, canvas silently falls back to a system font
      try {
        await document.fonts.load(font, text);
        await document.fonts.ready;
      } catch {
        /* draw with whatever is available */
      }
      if (disposed) return;

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, holderRect.width, holderRect.height);
      ctx.font = font;
      if ("letterSpacing" in ctx) {
        (ctx as CanvasRenderingContext2D & { letterSpacing: string }).letterSpacing =
          style.letterSpacing === "normal" ? "0px" : style.letterSpacing;
      }
      ctx.fillStyle = "#ffffff";
      ctx.textBaseline = "alphabetic";

      // wrap to the DOM text's width, mirroring its line boxes
      const maxWidth = textRect.width + 2;
      const words = text.split(" ");
      const lines: string[] = [];
      let line = "";
      for (const word of words) {
        const probe = line ? `${line} ${word}` : word;
        if (line && ctx.measureText(probe).width > maxWidth) {
          lines.push(line);
          line = word;
        } else {
          line = probe;
        }
      }
      if (line) lines.push(line);

      const fontSize = parseFloat(style.fontSize);
      const lineHeight =
        style.lineHeight === "normal"
          ? fontSize * 1.1
          : parseFloat(style.lineHeight);
      const offX = textRect.left - holderRect.left;
      const offY = textRect.top - holderRect.top;
      const ascent = fontSize * 0.78; // Space Grotesk approximate ascent

      lines.forEach((l, i) => {
        ctx.fillText(l, offX, offY + i * lineHeight + (lineHeight - fontSize) / 2 + ascent);
      });

      texture.image = textCanvas;
      setLive(true);
    };

    const resize = () => {
      const { width, height } = holder.getBoundingClientRect();
      if (width === 0 || height === 0) return;
      renderer.setSize(width, height);
      void drawTexture();
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(holder);

    // ---- cursor in clip coords of the holder -------------------------------
    const cursor = { x: 10, y: 10, px: 10, py: 10, vx: 0, vy: 0 };
    let hasCursor = false;
    const toClip = (clientX: number, clientY: number) => {
      const r = holder.getBoundingClientRect();
      return {
        x: ((clientX - r.left) / r.width) * 2 - 1,
        y: -(((clientY - r.top) / r.height) * 2 - 1),
      };
    };
    const setCursor = (p: { x: number; y: number }) => {
      if (!hasCursor) {
        // no velocity spike on first entry
        cursor.px = p.x;
        cursor.py = p.y;
        hasCursor = true;
      }
      cursor.x = p.x;
      cursor.y = p.y;
    };
    const onPointerMove = (e: PointerEvent) =>
      setCursor(toClip(e.clientX, e.clientY));
    const onTouchMove = (e: TouchEvent) => {
      const t = e.touches[0];
      if (t) setCursor(toClip(t.clientX, t.clientY));
    };
    window.addEventListener("pointermove", onPointerMove, { passive: true });
    window.addEventListener("touchmove", onTouchMove, { passive: true });

    // ---- physics + render loop (reference model, preserved) ----------------
    let raf = 0;
    let running = false;
    let colorTimer = 0;
    let colorIdx = 0;
    let lastNow = performance.now();
    const aspect = () => {
      const r = holder.getBoundingClientRect();
      return r.height > 0 ? r.width / r.height : 1;
    };

    const frame = (now: number) => {
      if (!running) return;
      const elapsed = now - lastNow;
      lastNow = now;

      // cursor velocity per frame
      cursor.vx = cursor.x - cursor.px;
      cursor.vy = cursor.y - cursor.py;
      cursor.px = cursor.x;
      cursor.py = cursor.y;

      const asp = aspect();
      for (let i = 0; i < vertCount; i++) {
        const bx = basePos[i * 3];
        const by = basePos[i * 3 + 1];
        const dx = disp[i * 2];
        const dy = disp[i * 2 + 1];

        let cx = cursor.x - (bx + dx);
        let cy = cursor.y - (by + dy);
        cx *= asp; // circular falloff on a wide element
        const dist = Math.sqrt(cx * cx + cy * cy);
        const prox = Math.max(0, 1 / (1 + dist / radius) - 0.1);

        let vx = vel[i * 2] + cursor.vx * drag * prox;
        let vy = vel[i * 2 + 1] + cursor.vy * drag * prox;
        vx -= dx * springK;
        vy -= dy * springK;
        vx *= damping;
        vy *= damping;
        vel[i * 2] = vx;
        vel[i * 2 + 1] = vy;
        disp[i * 2] = Math.max(-1, Math.min(1, dx + vx * dt));
        disp[i * 2 + 1] = Math.max(-1, Math.min(1, dy + vy * dt));
      }
      geometry.attributes.aDisp.needsUpdate = true;

      // chroma colors cycle every ~400 ms
      colorTimer += elapsed;
      if (colorTimer >= MESH_TEXT.colorCycleMs) {
        colorTimer = 0;
        colorIdx = (colorIdx + 1) % colors.length;
        program.uniforms.uColorA.value = colors[colorIdx];
        program.uniforms.uColorB.value = colors[(colorIdx + 1) % colors.length];
      }

      renderer.render({ scene: mesh });
      raf = requestAnimationFrame(frame);
    };

    let inView = true;
    const setRunning = (on: boolean) => {
      if (on === running) return;
      running = on;
      if (on) {
        lastNow = performance.now();
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
      window.removeEventListener("touchmove", onTouchMove);
      holder.removeChild(gl.canvas);
      gl.getExtension("WEBGL_lose_context")?.loseContext();
      setLive(false);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [text, reduced]);

  return (
    <span ref={wrapRef} className="relative block">
      {/* layout + semantics + fallback; invisible only while the mesh is live */}
      <span
        ref={textRef}
        className={`block ${className} ${live ? "opacity-0" : ""}`}
      >
        {text}
      </span>
      {/* canvas extends past the text so deformation can overflow cleanly */}
      <div
        ref={holderRef}
        aria-hidden="true"
        className="pointer-events-none absolute -inset-x-[12%] -inset-y-[45%]"
      />
    </span>
  );
}
