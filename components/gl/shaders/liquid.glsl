precision highp float;

/*
 * Shared liquid vocabulary — the one noise/flow foundation every liquid
 * surface on the site rides on: the scroll-driven background gradient
 * (fluid.frag), the hero reveal aperture and the work-card hover
 * (liquid.frag). Prepended to those shaders at build time so the wave
 * language is defined exactly once.
 */

float lqHash(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
}

float lqNoise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  float a = lqHash(i);
  float b = lqHash(i + vec2(1.0, 0.0));
  float c = lqHash(i + vec2(0.0, 1.0));
  float d = lqHash(i + vec2(1.0, 1.0));
  return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
}

float lqFbm(vec2 p) {
  float v = 0.0;
  float amp = 0.55;
  for (int i = 0; i < 3; i++) {
    v += amp * lqNoise(p);
    p = p * 2.03 + vec2(11.7, 5.3);
    amp *= 0.5;
  }
  return v;
}

/* Domain-warped flow offset — the shared "current". Returns roughly [-1,1]. */
vec2 lqFlow(vec2 p, float t, float scale) {
  float a = lqFbm(p * scale + vec2(t * 0.19, -t * 0.13));
  float b = lqFbm(p * scale + vec2(-t * 0.11, t * 0.17) + 4.7);
  return vec2(a - 0.5, b - 0.5) * 2.0;
}
