// Retrato vertical de Dex: praia ao pôr do sol, entre palmeiras.
#include "beach"
void main() {
  vec2 uv = screenUV();
  vec3 ro = vec3(-2., 2.6, 6.);
  mat3 cam = lookAt(ro, vec3(-4.5, 5.2, 30.));
  vec3 rd = normalize(cam * vec3(screenP(), 1.9));
  vec3 col = renderBeach(ro, rd);
  col += vec3(1., .45, .2) * pow(SAT(dot(rd, SUN)), 25.) * .35;
  outColor = vec4(finalize(col, uv, .62, .8), 1.);
}
