// Retrato vertical de Marisol: píer molhado diante de Coral City à noite.
#include "city"

float sdBoxF(vec3 p, vec3 b) { vec3 q = abs(p) - b; return length(max(q, 0.)) + min(max(q.x, max(q.y, q.z)), 0.); }
vec2 mapM(vec3 p) {
  vec2 r = vec2(1e9, 0);
  float deck = sdBoxF(p - vec3(0, .9, 6.), vec3(2.2, .1, 12.));
  vec3 pp = p; pp.x = abs(pp.x) - 2.1; pp.z = mod(pp.z, 3.) - 1.5;
  float posts = sdBoxF(pp - vec3(0, .9, 0), vec3(.09, .9, .09));
  float rail = sdBoxF(vec3(abs(p.x) - 2.1, p.y - 1.9, p.z - 6.), vec3(.04, .03, 12.));
  return vec2(min(min(deck, posts), rail), 5.);
}

void main() {
  vec2 uv = screenUV();
  vec3 ro = vec3(.55, 1.55, -.6);
  mat3 cam = lookAt(ro, vec3(-.05, 1.62, 6.));
  vec3 rd = normalize(cam * vec3(screenP(), 2.3));
  vec3 col = renderCity(ro, rd);
  float t = .2; vec2 hit = vec2(-1);
  for (int i = 0; i < 260; i++) {
    vec3 p = ro + rd * t;
    vec2 d = mapM(p);
    if (d.x < .0006 * t) { hit = vec2(t, d.y); break; }
    t += d.x * .8;
    if (t > 25.) break;
  }
  if (hit.x > 0.) {
    vec3 p = ro + rd * hit.x;
    vec2 e = vec2(.002, 0);
    vec3 n = normalize(vec3(mapM(p + e.xyy).x - mapM(p - e.xyy).x, mapM(p + e.yxy).x - mapM(p - e.yxy).x, mapM(p + e.yyx).x - mapM(p - e.yyx).x));
    float m = hit.y;
    vec3 alb = m < 1.5 ? vec3(.35, .2, .15) : m < 2.5 ? vec3(.12, .03, .06) : m < 3.5 ? vec3(.04, .025, .02) : m < 4.5 ? vec3(.03, .03, .04) : vec3(.09, .06, .045);
    if (m > 4.5) alb *= .7 + .3 * step(.08, fract(p.x * 5.));
    // luz de contorno: cidade rosa à frente, néon ciano à direita, lampião quente atrás à esquerda
    float rimF = pow(1. - SAT(dot(-rd, n)), 2.5);
    vec3 L1 = normalize(vec3(.1, .15, 1.)), L2 = normalize(vec3(1., .3, .2)), L3 = normalize(vec3(-.8, .8, -.6));
    vec3 lin = vec3(1.6, .35, .9) * SAT(dot(n, L1)) * (.3 + 2. * rimF)
             + vec3(.3, 1.4, 2.) * SAT(dot(n, L2)) * .6 * (.2 + rimF)
             + vec3(2.4, 1.5, .8) * SAT(dot(n, L3)) * .9
             + vec3(.08, .05, .12);
    col = alb * lin;
    if (m < 3.5 && m > 2.5) col += vec3(1.6, .4, .9) * rimF * .08; // brilho no cabelo
    if (m > 4.5) {
      // tábuas molhadas refletindo o céu
      vec3 rr = reflect(rd, n);
      col += skyC(rr) * .25 * pow(1. - SAT(dot(-rd, n)), 3.);
    }
  }
  // lampião
  col += vec3(2.4, 1.4, .6) * pow(SAT(dot(rd, normalize(vec3(-2.3, 3.2, -1.5) - ro))), 3000.) * 4.;
  gSat = 1.15;
  outColor = vec4(finalize(col, uv, .95, .9), 1.);
}
