// Coral City à noite, vista da baía.
#include "city"
void main() {
  vec2 uv = screenUV();
  vec3 ro = vec3(-40., 9., 0.);
  mat3 cam = lookAt(ro, vec3(60., 95., 900.));
  vec3 rd = normalize(cam * vec3(screenP(), 1.8));
  vec3 col = renderCity(ro, rd);
  gSat = 1.15;
  outColor = vec4(finalize(col, uv, .85, .7), 1.);
}
