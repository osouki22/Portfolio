attribute vec3 position;
attribute vec2 uv;
attribute vec2 aDisp;

varying vec2 vUv;
varying float vMag;

void main() {
  vUv = uv;
  vMag = length(aDisp);
  vec3 p = position;
  p.xy += aDisp;
  gl_Position = vec4(p, 1.0);
}
