precision highp float;

/*
 * Scroll-driven fluid gradient background — the lowest-priority renderer
 * on the page. Domain-warped fbm blends the five palette colors (fed from
 * the same --mesh-* custom properties as everything else). uPhase is not
 * wall time: it is flow-accumulated on the CPU, so the liquid agitates
 * with scroll velocity, keeps a barely-there pulse at rest, and loses
 * momentum with inertia when scrolling stops.
 */

uniform float uPhase;    // flow-integrated time
uniform float uFlow;     // 0 = resting pulse → 1 = fully agitated
uniform vec2 uResolution;
uniform vec3 uBase;
uniform vec3 uC1;
uniform vec3 uC2;
uniform vec3 uC3;
uniform vec3 uC4;
uniform float uGrain;

varying vec2 vUv;

float hash(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
}

float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  float a = hash(i);
  float b = hash(i + vec2(1.0, 0.0));
  float c = hash(i + vec2(0.0, 1.0));
  float d = hash(i + vec2(1.0, 1.0));
  return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
}

float fbm(vec2 p) {
  float v = 0.0;
  float amp = 0.55;
  for (int i = 0; i < 3; i++) {
    v += amp * noise(p);
    p = p * 2.03 + vec2(11.7, 5.3);
    amp *= 0.5;
  }
  return v;
}

void main() {
  vec2 uv = vUv;
  vec2 p = uv;
  p.x *= uResolution.x / uResolution.y;

  float t = uPhase;
  float warp = 1.0 + uFlow * 1.5; /* turbulence grows with scroll speed */

  float f1 = fbm(p * 1.3 + vec2(t * 0.11, t * 0.07));
  float f2 = fbm(p * 1.8 - vec2(t * 0.05, t * 0.13) + f1 * warp * 1.5);
  float f3 = fbm(p * 0.9 + vec2(-t * 0.08, t * 0.06) + f2 * warp * 1.1);

  vec3 col = uBase;
  col = mix(col, uC4, smoothstep(0.12, 0.85, f1));
  col = mix(col, uC3, 0.8 * smoothstep(0.35, 0.92, f2));
  col = mix(col, uC1, 0.5 * smoothstep(0.52, 0.95, f3));
  col = mix(col, uC2, 0.28 * smoothstep(0.6, 0.96, f1 * f3 * 2.2));

  /* soft vignette keeps foreground type in charge */
  float vig = smoothstep(1.25, 0.35, distance(uv, vec2(0.5, 0.45)));
  col *= mix(0.6, 1.0, vig);

  /* subtle film grain */
  float g = hash(gl_FragCoord.xy + fract(t) * 337.0);
  col += (g - 0.5) * uGrain;

  gl_FragColor = vec4(col, 1.0);
}
