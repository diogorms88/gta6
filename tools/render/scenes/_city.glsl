// Cidade costeira vista do outro lado da baía, com reflexos na água.
// Defina DUSK para a versão ao entardecer; sem DUSK = noite de néon.
#ifdef DUSK
const vec3 SUN = normalize(vec3(.25, .03, 1.));
#else
const vec3 SUN = normalize(vec3(.3, -.2, 1.));
#endif
const float CELL = 46.;
#ifdef DUSK
#define WINI .5
#define FOGK .00028
#else
#define WINI 1.
#define FOGK .0005
#endif

vec3 skyC(vec3 rd) {
  float y = max(rd.y, 0.);
  float mu = dot(rd, SUN);
#ifdef DUSK
  vec3 c = mix(vec3(2.1, .75, .32), vec3(.75, .3, .45), smoothstep(0., .1, y));
  c = mix(c, vec3(.1, .1, .3), smoothstep(.06, .5, y));
  c += vec3(2.5, 1.1, .4) * pow(SAT(mu), 14.) * 1.4;
  c += vec3(3., 2., 1.) * pow(SAT(mu), 300.) * 4.;
  // nuvens finas
  vec2 cp = rd.xz / (rd.y + .08) * 2.;
  float cl = smoothstep(.5, .8, fbm2(cp * vec2(.6, 3.) + 4., 6)) * smoothstep(0., .1, y);
  c = mix(c, mix(vec3(1.6, .6, .5), vec3(2.6, 1.3, .6), pow(SAT(mu), 3.)), cl * .8);
#else
  vec3 c = mix(vec3(.4, .08, .26), vec3(.07, .02, .12), smoothstep(0., .14, y));
  c = mix(c, vec3(.008, .006, .025), smoothstep(.1, .55, y));
  vec2 sp = rd.xz / (rd.y + .2) * 400.;
  c += vec3(step(.9985, hash12(floor(sp)))) * 1.2 * smoothstep(.15, .5, y);
  // nuvens iluminadas por baixo pela cidade
  vec2 cp = rd.xz / (rd.y + .08) * 2.;
  float cl = smoothstep(.45, .8, fbm2(cp + 4., 6)) * smoothstep(0., .12, y);
  c = mix(c, vec3(.35, .08, .25) * (1. - smoothstep(.0, .4, y)) + vec3(.03, .02, .05), cl * .8);
  // lua
  vec3 md = normalize(vec3(-.45, .32, 1.));
  c += vec3(1.8, 1.7, 1.9) * smoothstep(.99955, .9997, dot(rd, md)) * 3.;
  c += vec3(.3, .25, .4) * pow(SAT(dot(rd, md)), 200.) * 1.5;
#endif
  return c;
}

// altura do prédio da célula (mais altos no centro)
vec3 bInfo(vec2 id) {
  float r = hash12(id * 1.31 + 7.);
  float center = exp(-pow((id.x * CELL - 60.) / 520., 2.)) * exp(-pow((id.y * CELL - 900.) / 360., 2.));
  float h = 20. + pow(r, 2.2) * 170. + center * (60. + 180. * hash12(id + 3.));
  if (hash12(id + 11.) < .12) h *= .35;
  vec2 half_ = vec2(12. + 9. * hash12(id + 5.), 12. + 9. * hash12(id + 9.));
  return vec3(half_, h);
}
bool inCity(vec2 id) { return id.y * CELL > 520. && id.y * CELL < 1500. && abs(id.x * CELL) < 1500.; }

float sdBox(vec3 p, vec3 b) { vec3 q = abs(p) - b; return length(max(q, 0.)) + min(max(q.x, max(q.y, q.z)), 0.); }
float mapC(vec3 p) {
  vec2 id = floor(p.xz / CELL);
  vec2 lp = mod(p.xz, CELL) - CELL * .5;
  float d = 1e9;
  if (inCity(id)) {
    vec3 b = bInfo(id);
    d = sdBox(vec3(lp.x, p.y - b.z * .5, lp.y), vec3(b.x, b.z * .5, b.y));
    // coroa escalonada nos prédios altos
    if (b.z > 150.) d = min(d, sdBox(vec3(lp.x, p.y - b.z - 12., lp.y), vec3(b.x * .6, 12., b.y * .6)));
    if (b.z > 220.) d = min(d, sdBox(vec3(lp.x, p.y - b.z - 40., lp.y), vec3(1., 30., 1.)));
  }
  // limitar passo à célula para não pular prédios vizinhos
  vec2 toEdge = (CELL * .5 - abs(lp)) ;
  float cellStep = min(toEdge.x, toEdge.y) + 2.;
  return min(d, max(cellStep, 2.));
}
float marchC(vec3 ro, vec3 rd, float tmax) {
  float t = 1.;
  for (int i = 0; i < 260; i++) {
    vec3 p = ro + rd * t;
    if (p.y > 470. && rd.y > 0.) return -1.;
    float d = mapC(p);
    if (d < .02 * max(1., t * .01)) return t;
    t += d;
    if (t > tmax) break;
  }
  return -1.;
}
vec3 normalC(vec3 p) {
  vec2 e = vec2(.05, 0);
  return normalize(vec3(mapC(p + e.xyy) - mapC(p - e.xyy), mapC(p + e.yxy) - mapC(p - e.yxy), mapC(p + e.yyx) - mapC(p - e.yyx)));
}

vec3 shadeC(vec3 p, vec3 rd, float t) {
  vec3 n = normalC(p);
  vec2 id = floor(p.xz / CELL);
  vec3 b = bInfo(id);
  float bseed = hash12(id);
  // coordenadas da fachada
  vec2 fu = abs(n.x) > .5 ? vec2(p.z, p.y) : vec2(p.x, p.y);
  vec2 wcell = floor(fu / vec2(3.2, 3.6));
  vec2 wf = fract(fu / vec2(3.2, 3.6));
  float win = step(.18, wf.x) * step(wf.x, .82) * step(.2, wf.y) * step(wf.y, .8);
  // vidro: fachadas envidraçadas com faixas
  float glassy = step(.5, hash12(id + 21.));
  vec3 baseCol = mix(vec3(.05, .05, .07), vec3(.1, .09, .1), hash12(id + 2.));
  vec3 rr = reflect(rd, n);
  vec3 env = skyC(rr);
  float fres = .04 + .96 * pow(1. - SAT(dot(-rd, n)), 5.);
  vec3 col = baseCol * .15 + env * mix(.04, .25, glassy) * (.25 + .75 * fres);
  if (n.y > .5) col = baseCol * .4 + env * .05;
#ifdef DUSK
  float litP = .12;
  col += vec3(2.4, 1., .4) * SAT(dot(n, SUN)) * .35 * (1. - glassy * .5) * baseCol * 6.;
  col += env * glassy * pow(SAT(dot(rr, SUN)), 20.) * 2.;
#else
  float litP = .18 + .22 * bseed;
#endif
  float r = hash12(wcell + id * 17.);
  if (n.y < .5 && win > 0. && r < litP) {
    vec3 wc = mix(vec3(2.2, 1.5, .8), vec3(1.4, 1.6, 2.), step(.7, hash12(wcell * 3. + id)));
    col += wc * (.25 + .6 * hash12(wcell + 5.)) * (glassy > .5 ? .5 : 1.) * WINI;
  }
#ifndef DUSK
  // faixas de néon no topo
  float neonBand = smoothstep(1.5, .5, abs(p.y - b.z + 5.)) * step(.6, hash12(id + 31.));
  vec3 neonC = mix(vec3(3., .3, 1.6), vec3(.3, 2.2, 3.), step(.5, hash12(id + 41.)));
  col += neonC * neonBand * (n.y < .5 ? 1. : 0.) * 1.5;
  // luz de aviso vermelha
  col += vec3(4., .2, .1) * smoothstep(2., 0., length(vec2(length(p.xz - (id + .5) * CELL), p.y - b.z - 70.))) * step(220., b.z);
#endif
  // base iluminada pelas ruas
  col += vec3(1.5, .8, .4) * exp(-p.y * .08) * .4;
  return col;
}

float wavesC(vec2 p) { return (fbm2(p * vec2(.05, .4), 6) + .4 * noise2(p * vec2(.2, 1.6))) * .6; }

vec3 renderCity(vec3 ro, vec3 rd) {
  vec3 col;
  float t = marchC(ro, rd, 5000.);
  float tw = rd.y < 0. ? -ro.y / rd.y : 1e9;
  if (t > 0. && t < tw) {
    vec3 p = ro + rd * t;
    col = shadeC(p, rd, t);
    vec3 fogC = skyC(normalize(vec3(rd.x, .02, rd.z)));
    col = mix(col, fogC * .6, 1. - exp(-t * FOGK));
  } else if (rd.y < 0.) {
    vec3 p = ro + rd * tw;
    float e = .3;
    float h = wavesC(p.xz);
    vec3 n = normalize(vec3((h - wavesC(p.xz + vec2(e, 0))) * .9, e * 2.2, (h - wavesC(p.xz + vec2(0, e))) * .35));
    n = normalize(mix(n, vec3(0, 1, 0), SAT(tw / 3000.)));
    vec3 rr = reflect(rd, n);
    rr.y = abs(rr.y) + .002;
    float fres = .03 + .97 * pow(1. - SAT(dot(-rd, n)), 5.);
    vec3 refl;
    float tr = marchC(p + vec3(0, .1, 0), rr, 3000.);
    if (tr > 0.) {
      vec3 q = p + rr * tr;
      refl = shadeC(q, rr, tr);
      refl = mix(refl, skyC(normalize(vec3(rr.x, .02, rr.z))) * .6, 1. - exp(-(tr + tw) * FOGK));
    } else refl = skyC(rr);
#ifdef DUSK
    vec3 deep = vec3(.03, .02, .05);
#else
    vec3 deep = vec3(.005, .004, .012);
#endif
    col = mix(deep, refl, SAT(fres * 1.6 + .15));
    col = mix(col, skyC(normalize(vec3(rd.x, .01, rd.z))) * .8, 1. - exp(-tw * .0004));
  } else {
    col = skyC(rd);
  }
  return col;
}
