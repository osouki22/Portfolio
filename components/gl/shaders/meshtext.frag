precision highp float;

/*
 * Mesh-text display: samples the rendered-glyph texture on the deformed
 * grid. Where the mesh is displaced, the glyph alpha is re-sampled at
 * ±offset along X and the fringes are tinted with the cycling chroma
 * colors (magenta/green — deliberately NOT the site palette), composited
 * over the solid white glyph. Premultiplied alpha.
 */

uniform sampler2D uText;
uniform vec3 uColorA;
uniform vec3 uColorB;
uniform float uChroma;     // runtime multiplier
uniform float uChromaBase; // CHROMA constant (~0.005)

varying vec2 vUv;
varying float vMag;

void main() {
  float off = uChroma * uChromaBase * clamp(vMag * 8.0, 0.0, 1.0);

  float a  = texture2D(uText, vUv).a;
  float aA = texture2D(uText, vUv + vec2(off, 0.0)).a;
  float aB = texture2D(uText, vUv - vec2(off, 0.0)).a;

  vec3 col = vec3(1.0) * a;              // solid white glyph
  col += uColorA * max(aA - a, 0.0);     // +offset fringe
  col += uColorB * max(aB - a, 0.0);     // −offset fringe

  float alpha = max(a, 0.9 * max(aA, aB));
  gl_FragColor = vec4(col, alpha);       // texture is drawn white → premultiplied
}
