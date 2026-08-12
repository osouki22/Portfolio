/*
 * Liquid surface — one shader, two instances:
 *
 *   Hero (uMask = 1): two pixel-aligned image layers. The top layer is
 *   visible by default; a liquid aperture opens at the cursor and reveals
 *   the bottom layer through it. The aperture boundary wobbles on the
 *   shared flow field (never a clean circle) and its interior ripples.
 *   Its radius is uReveal, driven on the CPU by cursor speed with inertia.
 *
 *   Work card (uMask = 0): single layer, no aperture — the project image
 *   stays fully visible. The cursor pushes the surface like water, the
 *   displacement following the same flow vocabulary at a lower ceiling.
 *
 * Both share the scroll-driven warp (uScroll, from Lenis velocity).
 * Requires liquid.glsl prepended (lqFbm / lqFlow / precision).
 */

uniform sampler2D uTop;
uniform sampler2D uBottom;
uniform float uTime;
uniform vec2 uCursor;        // uv, y up
uniform float uReveal;       // 0-1 aperture openness (CPU inertia)
uniform float uMask;         // 1 = hero two-layer aperture, 0 = single layer
uniform float uPush;         // 0-1 cursor-driven push envelope
uniform float uScroll;       // 0-1 scroll-driven warp envelope
uniform vec2 uResolution;
uniform vec2 uImageResolution;
uniform float uMaxRadius;
uniform float uEdgeDistort;
uniform float uInteriorFlow;
uniform float uWarpAmp;
uniform float uPushAmp;
uniform float uPushRadius;

varying vec2 vUv;

/* object-fit: cover */
vec2 coverUv(vec2 uv) {
  float ca = uResolution.x / uResolution.y;
  float ia = uImageResolution.x / uImageResolution.y;
  vec2 scale = ca > ia ? vec2(1.0, ia / ca) : vec2(ca / ia, 1.0);
  return (uv - 0.5) * scale + 0.5;
}

void main() {
  float asp = uResolution.x / uResolution.y;
  vec2 uv = vUv;
  vec2 ap = vec2(uv.x * asp, uv.y); /* aspect-corrected sample space */

  /* --- scroll-driven liquid warp (shared by hero and cards) ------------- */
  vec2 warp = lqFlow(ap, uTime * 0.6, 2.2) * uWarpAmp * uScroll;

  /* --- cursor push: the surface pushed like water ----------------------- */
  vec2 d = ap - vec2(uCursor.x * asp, uCursor.y);
  float dist = length(d);
  /* cursor push — mouse-driven, skipped entirely when its amplitude is 0
     (the hero runs with it off; the noise is not even evaluated) */
  vec2 push = vec2(0.0);
  if (uPushAmp * uPush > 0.0) {
    float fall = exp(-(dist * dist) / max(uPushRadius * uPushRadius, 1e-5));
    vec2 dir = dist > 1e-4 ? d / dist : vec2(0.0);
    vec2 ripple = lqFlow(ap * 1.4, uTime, 3.0);
    push = (dir * 0.55 + ripple * 0.9) * fall * uPushAmp * uPush;
  }

  vec2 base = uv + warp + push;
  vec3 top = texture2D(uTop, coverUv(base)).rgb;

  if (uMask < 0.5) {
    gl_FragColor = vec4(top, 1.0);
    return;
  }

  /* --- hero liquid aperture ---------------------------------------------
     The aperture opens and closes with the cursor, but nothing here
     undulates *because of* the mouse: the boundary wobble and the ripple
     inside the revealed layer are both opt-in (uEdgeDistort / uInteriorFlow,
     0 by default). With them off the edge is a clean soft circle — it can
     no longer break into gaps — and the revealed layer stays pixel-crisp,
     sampled at exactly the same uv as the top layer.
     The scroll warp above still applies to both layers. */
  float radius = uMaxRadius * uReveal;
  float edge = dist;
  if (uEdgeDistort > 0.0) {
    float wob = (lqFbm(ap * 5.0 + vec2(uTime * 0.35, -uTime * 0.27)) - 0.5) * 2.0;
    edge += wob * uEdgeDistort * radius;
  }
  float mask = 1.0 - smoothstep(radius * 0.45, radius, edge);
  /* the window fades as it shrinks, so closing leaves no speck behind —
     at rest the aperture is gone entirely and only the top layer remains */
  mask *= smoothstep(0.0, 0.09, uReveal);

  vec2 inner = base;
  if (uInteriorFlow > 0.0) {
    inner += lqFlow(ap * 2.0, uTime * 1.1, 2.6) * uInteriorFlow * mask;
  }
  vec3 bottom = texture2D(uBottom, coverUv(inner)).rgb;

  gl_FragColor = vec4(mix(top, bottom, mask), 1.0);
}
