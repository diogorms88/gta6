// Pôr do sol na praia (imagem da intro).
#include "beach"
void main() {
  vec2 uv = screenUV();
  vec3 ro = vec3(0, 3.6, 0);
  mat3 cam = lookAt(ro, vec3(0, 6.2, 60));
  vec3 rd = normalize(cam * vec3(screenP(), 2.1));
  vec3 col = renderBeach(ro, rd);
  col += vec3(1., .45, .2) * pow(SAT(dot(rd, SUN)), 25.) * .35;
  outColor = vec4(finalize(col, uv, .62, .7), 1.);
}
