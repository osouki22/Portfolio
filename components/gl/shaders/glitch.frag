precision highp float;

/*
 * The site's signature glitch. One shader, two instances (hero / work card)
 * differentiated only by uniforms. Composited in order:
 *   1. horizontal strip displacement — discrete re-randomization (~12 Hz),
 *      weighted by cursor-Y proximity and cursor velocity
 *   2. RGB channel separation along the cursor's travel direction
 *   3. scanlines — fixed count relative to uResolution.y (no moiré), slow drift
 *   4. film grain — per-pixel hash noise
 * uIntensity is CPU-driven (fast attack, two-stage release, non-zero floor).
 */

uniform sampler2D uTexture;
uniform float uTime;
uniform vec2 uMouse;          // 0-1, y up, element-local
uniform vec2 uMouseDir;       // smoothed travel direction
uniform float uVelocity;      // smoothed speed 0-1
uniform float uIntensity;     // master multiplier 0-1
uniform float uMaxShift;      // per-instance strip displacement ceiling
uniform vec2 uResolution;     // canvas px
uniform vec2 uImageResolution;

varying vec2 vUv;

float hash(float n) {
  return fract(sin(n) * 43758.5453123);
}

float hash2(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
}

/* object-fit: cover */
vec2 coverUv(vec2 uv) {
  float ca = uResolution.x / uResolution.y;
  float ia = uImageResolution.x / uImageResolution.y;
  vec2 scale = ca > ia ? vec2(1.0, ia / ca) : vec2(ca / ia, 1.0);
  return (uv - 0.5) * scale + 0.5;
}

void main() {
  vec2 uv = vUv;

  /* -- 1. horizontal strip displacement ---------------------------------- */
  /* discrete time step — corruption, not liquid */
  float t = floor(uTime * 12.0);

  /* irregular strip partition: two interleaved scales make uneven bands */
  float strip = floor(uv.y * 9.0) * 7.13 + floor(uv.y * 23.0);

  float seed = hash(strip * 91.7 + t * 13.7) - 0.5;
  float gate = step(0.52, hash(strip * 3.77 + t * 1.31)); /* ~half the strips move per step */

  /* strips near the cursor's vertical position tear harder */
  float prox = 1.0 - smoothstep(0.0, 0.5, abs(uv.y - uMouse.y));

  float shift = seed * 2.0 * gate
              * uMaxShift
              * uIntensity
              * (0.30 + 0.70 * prox)
              * (0.35 + 0.65 * uVelocity);

  uv.x += shift;

  vec2 cuv = coverUv(uv);

  /* -- 2. RGB channel separation ----------------------------------------- */
  float sep = uIntensity * (0.0035 + 0.012 * uVelocity);
  vec2 dir = uMouseDir;
  /* degenerate direction → default horizontal split */
  if (abs(dir.x) + abs(dir.y) < 0.001) dir = vec2(1.0, 0.0);
  vec2 off = normalize(dir) * sep;

  vec3 col;
  col.r = texture2D(uTexture, cuv + off).r;
  col.g = texture2D(uTexture, cuv).g;
  col.b = texture2D(uTexture, cuv - off).b;

  /* -- 3. scanlines -------------------------------------------------------- */
  /* fixed line count relative to canvas height, slow vertical drift */
  float lineCount = 220.0;
  float scan = sin((vUv.y + uTime * 0.015) * lineCount * 6.2831853);
  float scanAmp = 0.028 + 0.045 * uIntensity;
  col *= 1.0 - scanAmp * (0.5 + 0.5 * scan);

  /* -- 4. film grain ------------------------------------------------------- */
  float grain = hash2(gl_FragCoord.xy + vec2(fract(uTime) * 917.0, fract(uTime * 0.731) * 383.0));
  col += (grain - 0.5) * (0.05 + 0.06 * uIntensity);

  gl_FragColor = vec4(col, 1.0);
}
