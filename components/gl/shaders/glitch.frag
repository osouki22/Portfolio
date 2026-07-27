precision highp float;

/*
 * The site's signature effect: a magnetic particle/pixel drag field.
 * One shader, two instances (hero / work card) differentiated by uniforms.
 *
 * A low-res displacement field (tSim, ping-pong simulated in sim.frag with
 * per-particle velocity + spring + damping) drags pixels along the cursor's
 * movement vector. This pass keeps it dirty — corruption, not fluid:
 *   - luminance-weighted response: bright pixels streak, shadow resists
 *   - posterized luminance bands → torn edges between light and dark
 *   - quantized, stepped displacement — never perfectly continuous
 *   - RGB channel separation along the local drag direction
 *   - film grain, always alive at rest via the uIntensity floor
 */

uniform sampler2D uTexture;
uniform sampler2D tSim;       // RG = displacement, BA = velocity
uniform float uTime;
uniform vec2 uMouse;          // 0-1, y up (kept for contract/ambient uses)
uniform vec2 uMouseDir;       // smoothed travel direction
uniform float uVelocity;      // smoothed cursor speed 0-1
uniform float uIntensity;     // CPU envelope 0-1 (rest floor > 0)
uniform float uMaxShift;      // per-instance displacement ceiling (uv units)
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
  /* luminance at the particle's home position drives its responsiveness */
  vec3 home = texture2D(uTexture, coverUv(vUv)).rgb;
  float lum = dot(home, vec3(0.299, 0.587, 0.114));

  /* posterize into bands: neighbouring bands move differently → torn edges */
  float band = floor(lum * 5.0) / 5.0;
  float weight = 0.18 + 0.82 * band; /* light catches, shadow holds */

  vec2 disp = texture2D(tSim, vUv).xy;

  /* stepped quantization — discrete increments, a hint of digital grid */
  float q = 40.0;
  disp = floor(disp * q + 0.5) / q;

  /* per-band time-stepped jitter: corruption, not polish */
  float t12 = floor(uTime * 12.0);
  float mag0 = length(disp);
  disp += (vec2(hash(band * 91.7 + t12 * 13.7), hash(band * 37.3 + t12 * 7.1)) - 0.5)
        * 0.012 * clamp(mag0 * 6.0, 0.0, 1.0);

  vec2 offset = disp * uMaxShift * weight;
  vec2 cuv = coverUv(vUv - offset);

  /* RGB split along the local drag direction, scaling with distortion */
  float mag = length(disp);
  vec2 nd = mag > 0.0005 ? disp / mag : normalize(uMouseDir + vec2(0.0001, 0.0));
  float sep = (0.0022 + 0.016 * clamp(mag * 2.2, 0.0, 1.0))
            * (0.30 + 0.70 * uVelocity)
            * (0.25 + 0.75 * uIntensity);

  vec3 col;
  col.r = texture2D(uTexture, cuv + nd * sep).r;
  col.g = texture2D(uTexture, cuv).g;
  col.b = texture2D(uTexture, cuv - nd * sep).b;

  /* film grain — grows with distortion, never fully gone (residual settle) */
  float grain = hash2(gl_FragCoord.xy + vec2(fract(uTime) * 917.0, fract(uTime * 0.731) * 383.0));
  col += (grain - 0.5) * (0.045 + 0.075 * clamp(uIntensity + mag * 1.6, 0.0, 1.0));

  gl_FragColor = vec4(col, 1.0);
}
