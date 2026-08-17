"use client";

import { useEffect, useRef, useState } from "react";
import { CARD_FLUID } from "@/lib/motion";
import {
  VERT,
  FRAG_ADVECT,
  FRAG_DIVERGENCE,
  FRAG_PRESSURE,
  FRAG_GRAD_SUB,
  FRAG_POINT,
  FRAG_OUTPUT,
} from "./shaders/fluidsim";

interface FluidDistortionProps {
  /** the project image — always a local path from lib/work.ts */
  src: string;
  /** WebGL or float framebuffers unavailable → parent keeps its static image */
  onContextFail?: () => void;
}

interface FBO {
  fbo: WebGLFramebuffer;
  texture: WebGLTexture;
  width: number;
  height: number;
  attach: (id: number) => number;
}

interface DoubleFBO {
  texelSizeX: number;
  texelSizeY: number;
  read: () => FBO;
  write: () => FBO;
  swap: () => void;
  dispose: () => void;
}

/**
 * Work-card fluid distortion: a Navier-Stokes style solver on float
 * framebuffers (splat → divergence → pressure → gradient subtract →
 * advection) that displaces the project image under the cursor and settles
 * back through dissipation. Shaders and solver behaviour are the reference
 * implementation's; the scaffolding around them is this codebase's.
 *
 * Lifecycle: this component is mounted only for the single card currently
 * under the cursor, so exactly one simulation is ever alive. Its rAF pauses
 * off-screen (IntersectionObserver) and on tab blur, and every GL resource
 * is released on unmount.
 */
export default function FluidDistortion({
  src,
  onContextFail,
}: FluidDistortionProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const container = containerRef.current;
    const canvas = canvasRef.current;
    if (!container || !canvas) return;

    const gl = canvas.getContext("webgl", {
      alpha: true,
      antialias: false,
      depth: false,
      powerPreference: "high-performance",
    }) as WebGLRenderingContext | null;

    if (!gl) {
      onContextFail?.();
      return;
    }
    // a context handed back in a lost state can still be revived; don't
    // disable the card permanently for it
    if (gl.isContextLost()) {
      gl.getExtension("WEBGL_lose_context")?.restoreContext();
      return;
    }
    // the solver needs float render targets
    if (!gl.getExtension("OES_texture_float")) {
      onContextFail?.();
      return;
    }
    gl.getExtension("OES_texture_float_linear");
    gl.clearColor(0, 0, 0, 0);

    const cp = CARD_FLUID.intensity / 100;
    const params = {
      cursorRadiusPx: CARD_FLUID.cursorSize,
      cursorPower: 5 + ((cp - 0.1) * (50 - 5)) / (1 - 0.1),
      distortionPower:
        (CARD_FLUID.intensity / 100) * CARD_FLUID.displacementBoost,
    };
    const overscanFactor = CARD_FLUID.overscan;
    const innerScale = CARD_FLUID.innerScale;

    const pointer = {
      x: 0.5 * container.clientWidth,
      y: 0.5 * container.clientHeight,
      dx: 0,
      dy: 0,
      moved: false,
      primed: false,
    };
    const res = { w: 0, h: 0 };

    let disposed = false;
    let imageTexture: WebGLTexture | null = null;
    let imgRatio = 1;
    let textureReady = false;

    // ---- program helpers ---------------------------------------------------
    const shaders: WebGLShader[] = [];
    const programs: WebGLProgram[] = [];

    const createShader = (source: string, type: number) => {
      const shader = gl.createShader(type)!;
      gl.shaderSource(shader, source);
      gl.compileShader(shader);
      if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        const info = gl.getShaderInfoLog(shader) || "shader compile error";
        gl.deleteShader(shader);
        throw new Error(info);
      }
      shaders.push(shader);
      return shader;
    };

    const createProgram = (vsSource: string, fsSource: string) => {
      const program = gl.createProgram()!;
      gl.attachShader(program, createShader(vsSource, gl.VERTEX_SHADER));
      gl.attachShader(program, createShader(fsSource, gl.FRAGMENT_SHADER));
      gl.bindAttribLocation(program, 0, "a_position");
      gl.linkProgram(program);
      if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
        throw new Error(gl.getProgramInfoLog(program) || "program link error");
      }
      programs.push(program);
      const uniforms: Record<string, WebGLUniformLocation | null> = {};
      const count = gl.getProgramParameter(program, gl.ACTIVE_UNIFORMS) as number;
      for (let i = 0; i < count; i++) {
        const active = gl.getActiveUniform(program, i);
        if (!active) continue;
        uniforms[active.name] = gl.getUniformLocation(program, active.name);
      }
      return { program, uniforms };
    };

    // ---- geometry: one quad, created once (the reference rebuilt these
    //      buffers on every blit, which leaked hundreds per second) --------
    const vbo = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, vbo);
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array([-1, -1, -1, 1, 1, 1, 1, -1]),
      gl.STATIC_DRAW
    );
    const ebo = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ebo);
    gl.bufferData(
      gl.ELEMENT_ARRAY_BUFFER,
      new Uint16Array([0, 1, 2, 0, 2, 3]),
      gl.STATIC_DRAW
    );
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(0);

    const blit = (target: FBO | null) => {
      if (target == null) {
        gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight);
        gl.bindFramebuffer(gl.FRAMEBUFFER, null);
      } else {
        gl.viewport(0, 0, target.width, target.height);
        gl.bindFramebuffer(gl.FRAMEBUFFER, target.fbo);
      }
      gl.drawElements(gl.TRIANGLES, 6, gl.UNSIGNED_SHORT, 0);
    };

    // ---- float framebuffers ------------------------------------------------
    const liveFbos: FBO[] = [];

    const createFBO = (w: number, h: number, format: number): FBO | null => {
      gl.activeTexture(gl.TEXTURE0);
      const texture = gl.createTexture()!;
      gl.bindTexture(gl.TEXTURE_2D, texture);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      gl.texImage2D(gl.TEXTURE_2D, 0, format, w, h, 0, format, gl.FLOAT, null);
      const fbo = gl.createFramebuffer()!;
      gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
      gl.framebufferTexture2D(
        gl.FRAMEBUFFER,
        gl.COLOR_ATTACHMENT0,
        gl.TEXTURE_2D,
        texture,
        0
      );
      if (gl.checkFramebufferStatus(gl.FRAMEBUFFER) !== gl.FRAMEBUFFER_COMPLETE) {
        gl.deleteTexture(texture);
        gl.deleteFramebuffer(fbo);
        return null;
      }
      gl.viewport(0, 0, w, h);
      gl.clear(gl.COLOR_BUFFER_BIT);
      const target: FBO = {
        fbo,
        texture,
        width: w,
        height: h,
        attach(id: number) {
          gl.activeTexture(gl.TEXTURE0 + id);
          gl.bindTexture(gl.TEXTURE_2D, texture);
          return id;
        },
      };
      liveFbos.push(target);
      return target;
    };

    /** RGB float first (as the reference), RGBA as the compatibility path */
    let fboFormat: number = gl.RGB;
    const probe = createFBO(4, 4, gl.RGB);
    if (!probe) {
      const probeRgba = createFBO(4, 4, gl.RGBA);
      if (!probeRgba) {
        onContextFail?.();
        return;
      }
      fboFormat = gl.RGBA;
    }

    const disposeFbo = (t: FBO) => {
      gl.deleteTexture(t.texture);
      gl.deleteFramebuffer(t.fbo);
      const i = liveFbos.indexOf(t);
      if (i >= 0) liveFbos.splice(i, 1);
    };

    const createDoubleFBO = (w: number, h: number): DoubleFBO | null => {
      const a = createFBO(w, h, fboFormat);
      const b = createFBO(w, h, fboFormat);
      if (!a || !b) return null;
      let fbo1 = a;
      let fbo2 = b;
      return {
        texelSizeX: 1 / w,
        texelSizeY: 1 / h,
        read: () => fbo1,
        write: () => fbo2,
        swap() {
          const tmp = fbo1;
          fbo1 = fbo2;
          fbo2 = tmp;
        },
        dispose() {
          disposeFbo(fbo1);
          disposeFbo(fbo2);
        },
      };
    };

    let outputColor: DoubleFBO | null = null;
    let velocity: DoubleFBO | null = null;
    let divergence: FBO | null = null;
    let pressure: DoubleFBO | null = null;

    const resizeCanvas = () => {
      const width = container.clientWidth;
      const height = container.clientHeight;
      if (width === 0 || height === 0) return;
      const dpr = Math.min(window.devicePixelRatio || 1, CARD_FLUID.dprCap);
      canvas.width = Math.max(2, Math.round(width * overscanFactor * dpr));
      canvas.height = Math.max(2, Math.round(height * overscanFactor * dpr));
      const cssW = width * overscanFactor;
      const cssH = height * overscanFactor;
      canvas.style.width = `${cssW}px`;
      canvas.style.height = `${cssH}px`;
      const ratio = cssW / cssH;
      const baseResolution =
        128 + ((CARD_FLUID.resolution - 1) * (512 - 128)) / 9;
      res.w = Math.round(baseResolution * ratio);
      res.h = Math.round(baseResolution);
    };

    const initFBOs = () => {
      outputColor?.dispose();
      velocity?.dispose();
      pressure?.dispose();
      if (divergence) disposeFbo(divergence);
      outputColor = createDoubleFBO(res.w, res.h);
      velocity = createDoubleFBO(res.w, res.h);
      divergence = createFBO(res.w, res.h, fboFormat);
      pressure = createDoubleFBO(res.w, res.h);
      return Boolean(outputColor && velocity && divergence && pressure);
    };

    let splatProgram: ReturnType<typeof createProgram>;
    let divergenceProgram: ReturnType<typeof createProgram>;
    let pressureProgram: ReturnType<typeof createProgram>;
    let gradientSubtractProgram: ReturnType<typeof createProgram>;
    let advectionProgram: ReturnType<typeof createProgram>;
    let displayProgram: ReturnType<typeof createProgram>;

    try {
      splatProgram = createProgram(VERT, FRAG_POINT);
      divergenceProgram = createProgram(VERT, FRAG_DIVERGENCE);
      pressureProgram = createProgram(VERT, FRAG_PRESSURE);
      gradientSubtractProgram = createProgram(VERT, FRAG_GRAD_SUB);
      advectionProgram = createProgram(VERT, FRAG_ADVECT);
      displayProgram = createProgram(VERT, FRAG_OUTPUT);
    } catch {
      onContextFail?.();
      return;
    }

    resizeCanvas();
    if (!initFBOs()) {
      onContextFail?.();
      return;
    }

    // ---- image texture -----------------------------------------------------
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      if (disposed) return;
      imgRatio = img.naturalWidth / Math.max(1, img.naturalHeight);
      imageTexture = gl.createTexture();
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, imageTexture);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img);
      textureReady = true;
      setReady(true);
    };
    img.src = src;

    // ---- pointer -----------------------------------------------------------
    const updatePointerPosition = (eX: number, eY: number) => {
      if (!pointer.primed) {
        // the card mounts this while the cursor is already inside — take the
        // first reading as position only, so there is no opening kick
        pointer.x = eX;
        pointer.y = eY;
        pointer.primed = true;
        return;
      }
      pointer.moved = true;
      pointer.dx = CARD_FLUID.pointerBoost * (eX - pointer.x);
      pointer.dy = CARD_FLUID.pointerBoost * (eY - pointer.y);
      pointer.x = eX;
      pointer.y = eY;
    };

    const onMove = (e: MouseEvent) => {
      const rect = container.getBoundingClientRect();
      updatePointerPosition(e.clientX - rect.left, e.clientY - rect.top);
    };
    const onLeave = () => {
      pointer.moved = false;
      pointer.primed = false;
    };
    const onTouchMove = (e: TouchEvent) => {
      const t = e.targetTouches[0];
      if (!t) return;
      const rect = container.getBoundingClientRect();
      updatePointerPosition(t.clientX - rect.left, t.clientY - rect.top);
    };
    const onTouchEnd = () => {
      pointer.moved = false;
      pointer.primed = false;
    };

    container.addEventListener("mousemove", onMove);
    container.addEventListener("mouseleave", onLeave);
    // passive: unlike the reference this never preventDefaults, so a touch
    // drag over a card still scrolls the page
    container.addEventListener("touchmove", onTouchMove, { passive: true });
    container.addEventListener("touchend", onTouchEnd, { passive: true });

    const getPointerUV = () => {
      const cssW = container.clientWidth * overscanFactor;
      const cssH = container.clientHeight * overscanFactor;
      const dx = 0.5 * (cssW - container.clientWidth);
      const dy = 0.5 * (cssH - container.clientHeight);
      return {
        u: (pointer.x + dx) / cssW,
        v: 1 - (pointer.y + dy) / cssH,
      };
    };

    // ---- solver ------------------------------------------------------------
    const dt = 1 / 60;

    const render = () => {
      if (!running || !velocity || !outputColor || !pressure || !divergence)
        return;

      if (pointer.moved) {
        pointer.moved = false;
        gl.useProgram(splatProgram.program);
        gl.uniform1i(
          splatProgram.uniforms.u_input_texture!,
          velocity.read().attach(1)
        );
        gl.uniform1f(
          splatProgram.uniforms.u_ratio!,
          container.clientWidth / Math.max(1, container.clientHeight)
        );
        const uv = getPointerUV();
        gl.uniform2f(splatProgram.uniforms.u_point!, uv.u, uv.v);
        gl.uniform3f(
          splatProgram.uniforms.u_point_value!,
          pointer.dx,
          -pointer.dy,
          0
        );
        const ch = Math.max(1, container.clientHeight);
        const rr = params.cursorRadiusPx / ch;
        gl.uniform1f(splatProgram.uniforms.u_point_size!, rr * rr);
        blit(velocity.write());
        velocity.swap();

        gl.uniform1i(
          splatProgram.uniforms.u_input_texture!,
          outputColor.read().attach(1)
        );
        gl.uniform3f(
          splatProgram.uniforms.u_point_value!,
          params.cursorPower * 0.001,
          0,
          0
        );
        blit(outputColor.write());
        outputColor.swap();
      }

      gl.useProgram(divergenceProgram.program);
      gl.uniform2f(
        divergenceProgram.uniforms.u_texel!,
        velocity.texelSizeX,
        velocity.texelSizeY
      );
      gl.uniform1i(
        divergenceProgram.uniforms.u_velocity_texture!,
        velocity.read().attach(1)
      );
      blit(divergence);

      gl.useProgram(pressureProgram.program);
      gl.uniform2f(
        pressureProgram.uniforms.u_texel!,
        velocity.texelSizeX,
        velocity.texelSizeY
      );
      gl.uniform1i(
        pressureProgram.uniforms.u_divergence_texture!,
        divergence.attach(1)
      );
      for (let i = 0; i < CARD_FLUID.pressureIterations; i++) {
        gl.uniform1i(
          pressureProgram.uniforms.u_pressure_texture!,
          pressure.read().attach(2)
        );
        blit(pressure.write());
        pressure.swap();
      }

      gl.useProgram(gradientSubtractProgram.program);
      gl.uniform2f(
        gradientSubtractProgram.uniforms.u_texel!,
        velocity.texelSizeX,
        velocity.texelSizeY
      );
      gl.uniform1i(
        gradientSubtractProgram.uniforms.u_pressure_texture!,
        pressure.read().attach(1)
      );
      gl.uniform1i(
        gradientSubtractProgram.uniforms.u_velocity_texture!,
        velocity.read().attach(2)
      );
      blit(velocity.write());
      velocity.swap();

      gl.useProgram(advectionProgram.program);
      gl.uniform2f(
        advectionProgram.uniforms.u_texel!,
        velocity.texelSizeX,
        velocity.texelSizeY
      );
      gl.uniform2f(
        advectionProgram.uniforms.u_output_textel!,
        velocity.texelSizeX,
        velocity.texelSizeY
      );
      gl.uniform1i(
        advectionProgram.uniforms.u_velocity_texture!,
        velocity.read().attach(1)
      );
      gl.uniform1i(
        advectionProgram.uniforms.u_input_texture!,
        velocity.read().attach(1)
      );
      gl.uniform1f(advectionProgram.uniforms.u_dt!, dt);
      gl.uniform1f(
        advectionProgram.uniforms.u_dissipation!,
        CARD_FLUID.velocityDissipation
      );
      blit(velocity.write());
      velocity.swap();

      gl.uniform2f(
        advectionProgram.uniforms.u_output_textel!,
        outputColor.texelSizeX,
        outputColor.texelSizeY
      );
      gl.uniform1i(
        advectionProgram.uniforms.u_input_texture!,
        outputColor.read().attach(2)
      );
      gl.uniform1f(
        advectionProgram.uniforms.u_dt!,
        CARD_FLUID.colorAdvectionBoost * dt
      );
      gl.uniform1f(
        advectionProgram.uniforms.u_dissipation!,
        CARD_FLUID.colorDissipation
      );
      blit(outputColor.write());
      outputColor.swap();

      gl.useProgram(displayProgram.program);
      const uv2 = getPointerUV();
      gl.uniform2f(displayProgram.uniforms.u_point!, uv2.u, uv2.v);
      gl.uniform1i(
        displayProgram.uniforms.u_velocity_texture!,
        velocity.read().attach(2)
      );
      gl.uniform1f(
        displayProgram.uniforms.u_ratio!,
        container.clientWidth / Math.max(1, container.clientHeight)
      );
      gl.uniform1f(displayProgram.uniforms.u_img_ratio!, imgRatio);
      gl.uniform1f(
        displayProgram.uniforms.u_disturb_power!,
        params.distortionPower
      );
      gl.uniform1i(
        displayProgram.uniforms.u_output_texture!,
        outputColor.read().attach(1)
      );
      gl.uniform1f(displayProgram.uniforms.u_canvas_scale!, 1);
      gl.uniform1f(displayProgram.uniforms.u_inner_scale!, innerScale);
      if (imageTexture) {
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, imageTexture);
        gl.uniform1i(displayProgram.uniforms.u_text_texture!, 0);
      }
      if (textureReady) blit(null);

      raf = requestAnimationFrame(render);
    };

    // ---- loop control ------------------------------------------------------
    let raf = 0;
    let running = false;
    let inView = true;

    const setRunning = (on: boolean) => {
      if (on === running) return;
      running = on;
      if (on) raf = requestAnimationFrame(render);
      else cancelAnimationFrame(raf);
    };

    const io = new IntersectionObserver(
      ([entry]) => {
        inView = entry.isIntersecting;
        setRunning(inView && !document.hidden);
      },
      { threshold: 0 }
    );
    io.observe(container);

    const onVisibility = () => setRunning(inView && !document.hidden);
    document.addEventListener("visibilitychange", onVisibility);

    const ro = new ResizeObserver(() => {
      resizeCanvas();
      initFBOs();
    });
    ro.observe(container);

    return () => {
      disposed = true;
      setRunning(false);
      io.disconnect();
      ro.disconnect();
      document.removeEventListener("visibilitychange", onVisibility);
      container.removeEventListener("mousemove", onMove);
      container.removeEventListener("mouseleave", onLeave);
      container.removeEventListener("touchmove", onTouchMove);
      container.removeEventListener("touchend", onTouchEnd);
      // release every GL resource — this unmounts on every hover-out
      [...liveFbos].forEach(disposeFbo);
      if (imageTexture) gl.deleteTexture(imageTexture);
      gl.deleteBuffer(vbo);
      gl.deleteBuffer(ebo);
      programs.forEach((p) => gl.deleteProgram(p));
      shaders.forEach((s) => gl.deleteShader(s));
      // NOTE: deliberately no loseContext() here. This canvas comes from JSX,
      // so React StrictMode's mount → cleanup → mount cycle in development
      // hands the *same* element to the second mount; a context lost during
      // the first cleanup comes back lost, getExtension() then returns null,
      // and the card would disable itself for good with no console error.
      // Dropping the resources is enough — the context dies with the element.
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [src]);

  return (
    <div
      ref={containerRef}
      data-fluid-card
      className={`absolute inset-0 transition-opacity duration-500 ${
        ready ? "opacity-100" : "opacity-0"
      }`}
    >
      <canvas
        ref={canvasRef}
        aria-hidden="true"
        className="pointer-events-none absolute"
        style={{ top: "-10%", left: "-10%", width: "120%", height: "120%" }}
      />
    </div>
  );
}
