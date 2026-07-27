precision highp float;

/*
 * Displacement-field simulation pass (ping-pong, low-res half-float RT).
 * Each texel is a "particle": RG = displacement, BA = velocity.
 * Cursor motion drags particles along its movement vector with proximity
 * falloff; a spring pulls them home; damping settles them with no bounce.
 */

uniform sampler2D tSim;
uniform vec2 uCursor;      // uv, y up
uniform vec2 uCursorVel;   // uv / frame
uniform float uAspect;     // canvas w / h
uniform float uDrag;
uniform float uSpringK;
uniform float uDamping;
uniform float uDt;
uniform float uRadius;

varying vec2 vUv;

void main() {
  vec4 s = texture2D(tSim, vUv);
  vec2 disp = s.xy;
  vec2 vel = s.zw;

  vec2 c = uCursor - vUv;
  c.x *= uAspect;
  float dist = length(c);
  float prox = max(0.0, 1.0 / (1.0 + dist / uRadius) - 0.1);

  vel += uCursorVel * uDrag * prox; // drag along the cursor's motion vector
  vel -= disp * uSpringK;           // spring back toward home
  vel *= uDamping;                  // over-damped — no bounce
  disp += vel * uDt;
  disp = clamp(disp, -1.0, 1.0);

  gl_FragColor = vec4(disp, vel);
}
