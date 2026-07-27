"use client";

import { useState } from "react";
import FluidGradient from "./FluidGradient";

/**
 * The one background implementation on the site. Primary: the WebGL
 * scroll-driven fluid gradient (FluidGradient). Fallback when WebGL is
 * unavailable: the original CSS radial-blob mesh with slow keyframe drift.
 * Both read only the CSS custom properties --mesh-base and --mesh-1..4;
 * palettes are transitioned by lib/paletteController.ts.
 */
export default function MeshGradient() {
  const [fluidLive, setFluidLive] = useState(false);

  return (
    <div className="mesh" aria-hidden="true">
      {!fluidLive && (
        <>
          <div className="mesh__blob mesh__blob--1" />
          <div className="mesh__blob mesh__blob--2" />
          <div className="mesh__blob mesh__blob--3" />
          <div className="mesh__blob mesh__blob--4" />
        </>
      )}
      <FluidGradient onLive={setFluidLive} />
      <div className="mesh__vignette" />
    </div>
  );
}
