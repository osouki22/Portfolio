"use client";

/**
 * The one mesh-gradient implementation on the site. Pure CSS: layered
 * radial-gradient blobs on a dark base with slow ambient keyframe drift.
 * Deliberately not WebGL — the GPU budget is reserved for the glitch shaders.
 *
 * Reads only the CSS custom properties --mesh-base and --mesh-1..4;
 * palettes are transitioned by lib/paletteController.ts.
 */
export default function MeshGradient() {
  return (
    <div className="mesh" aria-hidden="true">
      <div className="mesh__blob mesh__blob--1" />
      <div className="mesh__blob mesh__blob--2" />
      <div className="mesh__blob mesh__blob--3" />
      <div className="mesh__blob mesh__blob--4" />
      <div className="mesh__vignette" />
    </div>
  );
}
