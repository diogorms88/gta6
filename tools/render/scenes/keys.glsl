// Ilhas Salinas: vista aérea de ilhotas, água turquesa rasa, ponte longa e cúmulos.
const vec3 SUN = normalize(vec3(-.5, .75, .45));

float islandH(vec2 p) {
  // ilhotas: ruído limiarizado + banco de areia submerso
  float n = fbm2(p * .0022 + vec2(4.2, 1.3), 7);
  float mask = n - .6;
  float h = mask * 60.;
  h += fbm2(p * .03, 5) * 1.6 * smoothstep(-.02, .06, mask);
  // copas de árvores
  h += pow(noise2(p * .12), 2.) * 4. * smoothstep(.01, .05, mask);
  return h;
}
float seabed(vec2 p) { return min(islandH(p), -.6 - 7. * smoothstep(.4, .62, 1. - fbm2(p * .0022 + vec2(4.2, 1.3), 7) - .05) - 1.5 * fbm2(p * .01, 4)); }

// ponte: tabuleiro reto no eixo z com pilares
float sdBox(vec3 p, vec3 b) { vec3 q = abs(p) - b; return length(max(q, 0.)) + min(max(q.x, max(q.y, q.z)), 0.); }
float bridge(vec3 p) {
  vec3 q = p - vec3(40., 0., 0.);
  q.xz = mat2(.94, .34, -.34, .94) * q.xz;
  float deck = sdBox(q - vec3(0, 7., 0), vec3(7., .8, 6000.));
  float rail = sdBox(vec3(abs(q.x) - 6.8, q.y - 8.4, q.z), vec3(.25, .6, 6000.));
  vec3 r = q; r.z = mod(r.z, 36.) - 18.;
  float pil = sdBox(r - vec3(0, 2.5, 0), vec3(4., 4.5, 1.1));
  return min(min(deck, rail), pil);
}

vec3 skyK(vec3 rd) {
  float y = max(rd.y, 0.);
  vec3 c = mix(vec3(.62, .82, 1.05), vec3(.08, .3, .85), pow(smoothstep(0., .7, y), .6));
  c += vec3(1., .95, .8) * pow(SAT(dot(rd, SUN)), 10.) * .4;
  return c * 1.2;
}

// nuvens volumétricas simples (camada 700-1300m) com luz na direção do sol
float cloudD(vec3 p) {
  float base = fbm3(p * .0011, 5);
  float hgt = SAT((p.y - 320.) / 300.);
  float shape = base - .6 - hgt * .25 + (1. - smoothstep(0., .2, hgt)) * .05;
  return SAT(shape * 3.);
}
vec4 cloudsK(vec3 ro, vec3 rd, float tmax) {
  // intervalo com as camadas
  float t0 = (320. - ro.y) / rd.y, t1 = (620. - ro.y) / rd.y;
  if (t0 > t1) { float tt = t0; t0 = t1; t1 = tt; }
  t0 = max(t0, 0.); t1 = min(t1, tmax);
  if (t1 <= t0) return vec4(0, 0, 0, 1);
  vec3 acc = vec3(0); float T = 1.;
  float dt = (t1 - t0) / 48.;
  float t = t0 + dt * hash12(gl_FragCoord.xy);
  for (int i = 0; i < 48; i++) {
    vec3 p = ro + rd * t;
    float d = cloudD(p);
    if (d > .01) {
      float dl = cloudD(p + SUN * 40.);
      float light = exp(-dl * 2.4) * .9 + .1;
      vec3 c = vec3(1.25, 1.2, 1.1) * light * 1.6 + vec3(.3, .42, .65) * .4;
      float a = 1. - exp(-d * dt * .05);
      acc += T * a * c;
      T *= 1. - a;
      if (T < .02) break;
    }
    t += dt;
  }
  return vec4(acc, T);
}

void main() {
  vec2 uv = screenUV();
  vec3 ro = vec3(-420., 700., -1100.);
  mat3 cam = lookAt(ro, vec3(60., 0., 500.));
  vec3 rd = normalize(cam * vec3(screenP(), 1.7));
  vec3 col;
  float tmax = 20000.;

  // interseção com a superfície (ilhas acima da água) e a ponte
  float t = 1.;
  float hitT = -1.; int mat = 0;
  for (int i = 0; i < 320; i++) {
    vec3 p = ro + rd * t;
    float hI = p.y - max(islandH(p.xz), 0.);
    float hB = bridge(p);
    float h = min(hI * .5, hB);
    if (h < .01 * t * .02 + .02) { hitT = t; mat = hB < hI * .5 ? 2 : (islandH(p.xz) > 0. ? 1 : 0); break; }
    t += h;
    if (t > tmax || p.y < -1.) { if (p.y < -1.) { hitT = -ro.y / rd.y; mat = 0; } break; }
  }
  if (hitT > 0.) {
    vec3 p = ro + rd * hitT;
    if (mat == 0) {
      // água rasa: cor depende da profundidade do fundo
      float depth = -seabed(p.xz);
      vec3 shallowC = vec3(.18, .95, .85);
      vec3 midC = vec3(.02, .55, .68);
      vec3 deepC = vec3(.0, .12, .3);
      vec3 w = mix(shallowC, midC, smoothstep(.5, 3., depth));
      w = mix(w, deepC, smoothstep(3., 9., depth));
      // areia visível sob água muito rasa
      w = mix(vec3(.95, .9, .75), w, smoothstep(.2, 1.2, depth));
      // cáusticas
      float ca = pow(noise2(p.xz * .9) * noise2(p.xz * 1.3 + 3.), 2.) * 2.5;
      w += vec3(.3, .4, .35) * ca * exp(-depth * .4) * exp(-hitT * .002);
      float e = .2;
      float wh = fbm2(p.xz * .25, 4);
      vec3 n = normalize(vec3(wh - fbm2(p.xz * .25 + vec2(e, 0), 4), e * 5., wh - fbm2(p.xz * .25 + vec2(0, e), 4)));
      vec3 rr = reflect(rd, n);
      float fres = .02 + .98 * pow(1. - SAT(dot(-rd, n)), 5.);
      col = w * vec3(1.1, 1.05, 1.) * (.55 + .5 * SUN.y);
      col = mix(col, skyK(rr), fres);
      col += vec3(1.5) * pow(SAT(dot(rr, SUN)), 60.) * .3;
      // sombra da ponte na água
      vec3 sp = p + SUN * (8. / SUN.y);
      col *= mix(.6, 1., smoothstep(0., 2., bridge(sp)));
    } else {
      vec2 e = vec2(.3, 0);
      vec3 n;
      if (mat == 1) n = normalize(vec3(islandH(p.xz - e.xy) - islandH(p.xz + e.xy), 2. * e.x, islandH(p.xz - e.yx) - islandH(p.xz + e.yx)));
      else n = normalize(vec3(bridge(p + e.xyy) - bridge(p - e.xyy), bridge(p + e.yxy) - bridge(p - e.yxy), bridge(p + e.yyx) - bridge(p - e.yyx)));
      vec3 alb;
      if (mat == 1) {
        float hgt = islandH(p.xz);
        float veg = smoothstep(.4, 1.2, hgt + .8 * fbm2(p.xz * .08, 4));
        alb = mix(vec3(.9, .82, .62), mix(vec3(.03, .12, .04), vec3(.12, .24, .06), fbm2(p.xz * .4, 5)), veg);
      } else {
        alb = vec3(.62, .6, .56);
      }
      // sombra simples da ponte sobre as ilhas
      float sh = mat == 1 ? smoothstep(0., 2., bridge(p + SUN * 10.)) : 1.;
      float dif = SAT(dot(n, SUN)) * sh;
      col = alb * (vec3(2.3, 2.15, 1.9) * dif + vec3(.35, .5, .75) * (.4 + .6 * n.y));
    }
    // sombra das nuvens
    vec3 cp = p + SUN * ((470. - p.y) / SUN.y);
    col *= mix(1., .45, smoothstep(.0, .25, cloudD(cp)));
    col = mix(col, skyK(normalize(vec3(rd.x, .05, rd.z))), 1. - exp(-hitT * .00018));
  } else {
    col = skyK(rd);
  }
  vec4 cl = cloudsK(ro, rd, hitT > 0. ? hitT : tmax);
  col = col * cl.a + cl.rgb;
  // sombra das nuvens no chão (aprox.)
  gSat = 1.12;
  outColor = vec4(finalize(col, uv, .62, .35), 1.);
}
