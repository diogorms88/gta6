// Praia com oceano, nuvens, palmeiras e cidade distante.
// Defina DAY antes do #include para a versão diurna; sem DAY = pôr do sol.
#ifdef DAY
const vec3 SUN = normalize(vec3(-.55, .62, 1.));
#else
const vec3 SUN = normalize(vec3(0.04, 0.045, 1.));
#endif

float waves(vec2 p, int oct) {
  float h = 0., a = .5, f = .35;
  vec2 d = vec2(1, .3);
  for (int i = 0; i < 9; i++) {
    if (i >= oct) break;
    float n = noise2(p * f + d * 1.3);
    h += a * (1. - abs(n * 2. - 1.));
    p = ROT2 * p; f *= 1.95; a *= .48; d = ROT2 * d;
  }
  return h * .35;
}
vec3 seaNormal(vec2 p, float dist) {
  int oct = dist < 30. ? 9 : dist < 150. ? 7 : 5;
  float e = .02 + dist * .0015;
  float h = waves(p, oct);
  return normalize(vec3(h - waves(p + vec2(e, 0), oct), e, h - waves(p + vec2(0, e), oct)));
}

#ifdef DAY
#define FOGAMT .45
#else
#define FOGAMT .75
#endif
vec3 skyCol(vec3 rd) {
  float y = max(rd.y, 0.);
  float mu = dot(rd, SUN);
#ifdef DAY
  vec3 zen = vec3(.03, .17, .75);
  vec3 hor = vec3(.55, .78, 1.05);
  vec3 c = mix(hor, zen, pow(smoothstep(0., .6, y), .55));
  c += vec3(1.2, 1.1, .9) * pow(SAT(mu), 8.) * .5;
  c += vec3(2., 1.9, 1.6) * pow(SAT(mu), 200.) * 2.;
  return c * 1.1;
#else
  vec3 zen = vec3(.03, .035, .16);
  vec3 mid = vec3(.45, .12, .32);
  vec3 hor = vec3(1.7, .45, .18);
  vec3 c = mix(hor, mid, smoothstep(0., .12, y));
  c = mix(c, zen, smoothstep(.08, .55, y));
  c += vec3(.5, .12, .25) * exp(-y * 14.) * (1. - SAT(mu));
  c += vec3(2.4, .9, .3) * pow(SAT(mu), 12.) * 1.1;
  c += vec3(3., 1.8, .8) * pow(SAT(mu), 120.) * 2.;
  return c;
#endif
}

// nuvens em camada (plano a 1800m)
vec4 clouds(vec3 ro, vec3 rd) {
  if (rd.y <= 0.) return vec4(0);
  float t = (1800. - ro.y) / rd.y;
  vec2 p = (ro + rd * t).xz * .00035;
  float mu = dot(rd, SUN);
#ifdef DAY
  // cúmulos: forma + auto-sombreamento aproximado na direção do sol
  float d = fbm2(p * 1.6 + vec2(3.1, 1.7), 8);
  float cov = smoothstep(.45, .6, d);
  float dl = fbm2(p * 1.6 + vec2(3.1, 1.7) + SUN.xz * .04, 8);
  float shade = SAT((dl - d) * 6. + .55);
  vec3 col = mix(vec3(.55, .62, .78), vec3(1.25, 1.22, 1.15), shade);
  col += vec3(.6) * pow(SAT(mu), 12.) * (1. - cov);
  float dens = cov * smoothstep(0., .1, rd.y);
  return vec4(col, dens);
#else
  float d = fbm2(p + vec2(3.1, 1.7), 7);
  float cov = smoothstep(.48, .78, d + .08 * noise2(p * 8.));
  float streak = fbm2(p * vec2(.25, 2.4) + 7., 6);
  cov = max(cov, smoothstep(.55, .8, streak) * .7);
  float dens = cov * smoothstep(0., .08, rd.y);
  float thick = fbm2(p * 2. + 11., 5);
  vec3 lit = mix(vec3(.9, .3, .32), vec3(1.6, .75, .35), pow(SAT(mu), 4.));
  vec3 shade = vec3(.16, .07, .2);
  vec3 col = mix(lit, shade, smoothstep(.3, .75, thick) * .8) * 1.1;
  col += vec3(2.2, 1.2, .6) * pow(SAT(mu), 40.) * (1. - thick) * 1.5;
  return vec4(col * 1.3, dens * .95);
#endif
}

// silhueta do horizonte: promontório + prédios distantes
float skylineH(float x) {
  float h = .018 * smoothstep(-.9, -.35, x) * smoothstep(.05, -.3, x) * (0.8 + .4 * noise2(vec2(x * 40., 0.)));
  float id = floor(x * 260.);
  float bh = hash11(id) * hash11(id * 1.7 + 3.);
  float city = smoothstep(-.42, -.2, x) * smoothstep(.02, -.1, x);
  return max(h, city * (.006 + bh * .028));
}

float sdCapsule(vec3 p, vec3 a, vec3 b, float r) { vec3 pa = p - a, ba = b - a; float h = SAT(dot(pa, ba) / dot(ba, ba)); return length(pa - ba * h) - r; }
float sandH(vec2 p) { return -.6 + max(0., 34. - p.y) * .07 + .15 * noise2(p * .3) + .04 * noise2(p * 3.); }

// palmeira: tronco curvo + folhas em fita recortadas em folíolos. mat: 0 tronco, 1 folha
vec2 palm(vec3 p, vec3 base, float H, float lean, float seed) {
  base.y = sandH(base.xz) - .3;
  p -= base;
  float dt = 1e9, dl = 1e9;
  vec3 prev = vec3(0);
  for (int i = 1; i <= 6; i++) {
    float t = float(i) / 6.;
    vec3 cur = vec3(lean * t * t, H * t, lean * .3 * t * t);
    float ring = .015 * sin(atan(p.x - cur.x, p.z - cur.z) * 0. + p.y * 9.);
    dt = min(dt, sdCapsule(p, prev, cur, mix(.35, .18, t)) + ring);
    prev = cur;
  }
  vec3 top = prev;
  for (int k = 0; k < 13; k++) {
    float a = float(k) / 13. * 2. * PI + seed + hash11(float(k) * 3.1 + seed) * .4;
    float len = 4.4 + hash11(float(k) + seed) * 2.;
    float up = .35 + hash11(float(k) * 7. + seed) * .5;
    vec3 dir = normalize(vec3(cos(a), up, sin(a)));
    vec3 q = top;
    for (int s = 1; s <= 5; s++) {
      float t0 = float(s - 1) / 5., t = float(s) / 5.;
      vec3 nq = top + dir * len * t + vec3(0, -2.6 * t * t * (1.2 - up), 0);
      vec3 ba = nq - q, pa = p - q;
      float h = SAT(dot(pa, ba) / dot(ba, ba));
      vec3 v = pa - ba * h;
      vec3 bn = normalize(ba);
      vec3 side = normalize(cross(bn, vec3(0, 1, 0)));
      vec3 nrm = cross(side, bn);
      float x = dot(v, side), y = dot(v, nrm), z = dot(v, bn);
      float gt = mix(t0, t, h);
      float w = (.95 * sin(gt * PI * .92 + .15)) * mix(.25, 1., smoothstep(-.3, .7, sin(gt * (80. + 25. * hash11(float(k) + seed)) + float(k) + 2. * noise2(vec2(gt * 30., float(k))))));
      y += abs(x) * .45;
      dl = min(dl, length(vec3(max(abs(x) - w, 0.), y, z)) - .015);
      q = nq;
    }
  }
  return dt < dl ? vec2(dt, 0) : vec2(dl, 1);
}
vec2 opU(vec2 a, vec2 b) { return a.x < b.x ? a : b; }
vec2 palms(vec3 p) {
#ifdef DAY
  vec2 d = palm(p, vec3(-8.5, 0, 16.), 12., 4.2, .4);
  d = opU(d, palm(p, vec3(-14., 0, 24.), 15., 5.5, 1.9));
  d = opU(d, palm(p, vec3(12., 0, 20.), 13., -4.6, 3.3));
  d = opU(d, palm(p, vec3(22., 0, 34.), 14., -3., 5.1));
#else
  vec2 d = palm(p, vec3(-9.5, 0, 22.), 13., 3.2, .4);
  d = opU(d, palm(p, vec3(-15., 0, 30.), 16., 4.5, 1.9));
  d = opU(d, palm(p, vec3(11., 0, 26.), 12., -3.8, 3.3));
#endif
  return d;
}
vec2 mapB(vec3 p) { return opU(palms(p), vec2(p.y - sandH(p.xz), 2.)); }

float shadowB(vec3 ro, vec3 rd) {
  float res = 1., t = .05;
  for (int i = 0; i < 70; i++) {
    float h = palms(ro + rd * t).x;
    res = min(res, 10. * h / t);
    t += clamp(h, .05, 1.2);
    if (res < .01 || t > 40.) break;
  }
  return SAT(res);
}

vec3 background(vec3 ro, vec3 rd) {
  vec3 col;
  float horizonTop = skylineH(rd.x / rd.z);
  if (rd.y > -.0008) {
    col = skyCol(rd);
#ifdef DAY
    col += sunDisk(rd, SUN, vec3(1.6, 1.5, 1.3), .01);
#else
    col += sunDisk(rd, SUN, vec3(1.6, .9, .45), .012);
#endif
    vec4 cl = clouds(ro, rd);
    col = mix(col, cl.rgb, cl.a);
    float haze = exp(-max(rd.y, 0.) * 60.);
    col = mix(col, skyCol(normalize(vec3(rd.x, .002, rd.z))) * 1.05, haze * .4);
    if (rd.y < horizonTop - .0008) {
      float cityMask = smoothstep(-.42, -.2, rd.x / rd.z) * smoothstep(.02, -.1, rd.x / rd.z);
#ifdef DAY
      vec3 land = mix(vec3(.35, .45, .5), vec3(.8, .85, .9), cityMask * step(.5, hash12(floor(vec2(rd.x / rd.z * 520., rd.y * 300.)))));
      col = mix(land, col, .45);
#else
      vec3 land = vec3(.05, .018, .05);
      float lights = step(.93, hash12(floor(vec2(rd.x / rd.z * 1400., rd.y * 1400.)))) * cityMask;
      land += vec3(1.8, 1.1, .6) * lights * .35;
      col = mix(land, col, .35);
#endif
    }
  } else {
    float t = -ro.y / rd.y;
    vec3 pos = ro + rd * t;
    vec3 n = seaNormal(pos.xz, t);
    n = normalize(mix(n, vec3(0, 1, 0), SAT(t / 2500.)));
    vec3 rr = reflect(rd, n);
    rr.y = abs(rr.y);
    float fres = .02 + .98 * pow(1. - SAT(dot(-rd, n)), 5.);
    vec3 refl = skyCol(rr);
    vec4 cl = clouds(pos, rr);
    refl = mix(refl, cl.rgb, cl.a * .8);
#ifdef DAY
    // água turquesa rasa perto da praia, azul profundo ao longe
    float shallow = exp(-max(t - 30., 0.) * .006);
    vec3 deep = mix(vec3(.0, .05, .14), vec3(.02, .6, .62), shallow);
    deep += vec3(.1, .5, .45) * SAT(waves(pos.xz, 4) - .2) * shallow;
    col = mix(deep * (.8 + .6 * SUN.y), refl, fres * .85);
    // espuma na arrebentação
    float foam = smoothstep(.62, .8, waves(pos.xz * vec2(.4, 1.5), 5)) * exp(-max(t - 22., 0.) * .15);
    col = mix(col, vec3(1.1), foam * .8);
    vec3 hv = normalize(SUN - rd);
    col += vec3(1.8, 1.7, 1.5) * pow(SAT(dot(n, hv)), 700.) * 25.;
#else
    refl += sunDisk(rr, SUN, vec3(1.6, .9, .45), .012) * .5;
    vec3 deep = vec3(.02, .012, .04);
    vec3 sss = vec3(.25, .08, .1) * pow(SAT(.5 + .5 * dot(rd, SUN)), 3.) * SAT(waves(pos.xz, 4) - .15);
    col = mix(deep + sss, refl, fres);
    vec3 hv = normalize(SUN - rd);
    col += vec3(1.6, .95, .5) * (pow(SAT(dot(n, hv)), 900.) * 90. + pow(SAT(dot(n, hv)), 120.) * 3.);
#endif
    float fog = 1. - exp(-t * .0009);
    col = mix(col, skyCol(normalize(vec3(rd.x, .01, rd.z))), fog * FOGAMT);
  }
  return col;
}

vec3 renderBeach(vec3 ro, vec3 rd) {
  vec3 col = background(ro, rd);
  float tp = 1.;
  vec2 hit = vec2(-1);
  for (int i = 0; i < 240; i++) {
    vec3 p = ro + rd * tp;
    vec2 d = mapB(p);
    if (d.x < .002 * tp) { hit = vec2(tp, d.y); break; }
    tp += d.x * .5;
    if (tp > 70.) break;
  }
  if (hit.x < 0.) return col;
  vec3 p = ro + rd * tp;
  vec2 e = vec2(.004 * tp, 0);
  vec3 n = normalize(vec3(mapB(p + e.xyy).x - mapB(p - e.xyy).x, mapB(p + e.yxy).x - mapB(p - e.yxy).x, mapB(p + e.yyx).x - mapB(p - e.yyx).x));
  float mat = hit.y;
#ifdef DAY
  float sh = shadowB(p + n * .05, SUN);
  float dif = SAT(dot(n, SUN)) * sh;
  float amb = .5 + .5 * n.y;
  vec3 alb;
  if (mat > 1.5) {
    float grain = noise2(p.xz * 40.) * .5 + noise2(p.xz * 3.) * .5;
    alb = vec3(.8, .6, .38) * (.85 + .25 * grain);
    float wet = smoothstep(.45, 0., p.y);
    alb *= 1. - wet * .45;
  } else if (mat > .5) {
    alb = vec3(.12, .3, .08) * (.8 + .4 * noise2(p.xz * 6.));
    // translucidez das folhas
    dif += SAT(dot(rd, SUN)) * .4 * sh;
  } else {
    alb = vec3(.32, .25, .18) * (.8 + .3 * noise2(vec2(p.y * 12., p.x)));
  }
  vec3 lin = vec3(2.6, 2.4, 2.1) * dif + vec3(.35, .5, .8) * amb * .8;
  col = alb * lin;
  if (mat > 1.5) {
    float wet = smoothstep(.45, 0., p.y);
    col = mix(col, skyCol(reflect(rd, vec3(0, 1, 0))) * .35, wet * .5);
  }
  col = mix(col, skyCol(normalize(vec3(rd.x, .01, rd.z))), 1. - exp(-tp * .003));
#else
  if (mat > 1.5) {
    float wet = smoothstep(.5, 0., p.y);
    vec3 rr = reflect(rd, vec3(0, 1, 0));
    float grain = noise2(p.xz * 40.) * .5 + noise2(p.xz * 3.) * .5;
    vec3 sand = vec3(.07, .035, .04) * (.7 + .6 * grain);
    sand += vec3(.5, .2, .1) * pow(SAT(dot(rd, SUN) * .5 + .5), 8.) * .08;
    col = mix(sand, skyCol(rr) * .45 + sand * .3, wet * .85);
  } else {
    float rim = pow(1. - SAT(dot(-rd, n)), 3.) * SAT(dot(n, SUN) + .3);
    col = vec3(.008, .004, .01) + vec3(1.6, .6, .3) * rim * .35;
  }
#endif
  return col;
}
