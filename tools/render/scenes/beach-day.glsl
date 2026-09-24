// Praia Dourada ao meio-dia.
#define DAY
#include "beach"
void main() {
  vec2 uv = screenUV();
  vec3 ro = vec3(2, 4.2, 0);
  mat3 cam = lookAt(ro, vec3(-4, 5.8, 60));
  vec3 rd = normalize(cam * vec3(screenP(), 1.9));
  vec3 col = renderBeach(ro, rd);
  gSat = 1.25;
  outColor = vec4(finalize(col, uv, .58, .45), 1.);
}
