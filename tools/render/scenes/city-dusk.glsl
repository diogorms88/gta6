// Coral City ao entardecer.
#define DUSK
#include "city"
void main() {
  vec2 uv = screenUV();
  vec3 ro = vec3(-260., 30., 80.);
  mat3 cam = lookAt(ro, vec3(120., 110., 900.));
  vec3 rd = normalize(cam * vec3(screenP(), 1.6));
  vec3 col = renderCity(ro, rd);
  col += vec3(1., .5, .2) * pow(SAT(dot(rd, SUN)), 20.) * .4;
  gSat = 1.1;
  outColor = vec4(finalize(col, uv, .45, .6), 1.);
}
