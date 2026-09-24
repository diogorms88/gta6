// Porto Ferro ao entardecer: pilhas de contêineres, guindastes pórticos e água com reflexos.
const vec3 SUN = normalize(vec3(-.35, .05, 1.));

float sdBox(vec3 p, vec3 b) { vec3 q = abs(p) - b; return length(max(q, 0.)) + min(max(q.x, max(q.y, q.z)), 0.); }

// contêineres 12.2 x 2.6 x 2.44 em quadras
const vec3 CS = vec3(2.6, 2.6, 12.6);
vec2 containers(vec3 p) {
  if (p.z < 40. || p.z > 400. || abs(p.x) > 500.) {
    return vec2(max(max(40. - p.z, p.z - 400.), abs(p.x) - 500.) + 1., 0.);
  }
  vec2 id = floor(vec2(p.x / CS.x, p.z / CS.z));
  vec2 blk = floor(id / vec2(8., 4.));
  float stack = floor(hash12(floor(id / vec2(1., 1.)) * .37 + blk * 3.1) * 3. + 1.) * step(.12, hash12(blk + 1.)) * step(1., mod(id.x, 8.)) ;
  float hgt = stack * CS.y;
  vec3 lp = vec3(mod(p.x, CS.x) - CS.x * .5, p.y - hgt * .5, mod(p.z, CS.z) - CS.z * .5);
  float d = hgt > 0. ? sdBox(lp, vec3(CS.x * .47, hgt * .5, CS.z * .47)) : 1e9;
  vec2 toEdge = vec2(CS.x, CS.z) * .5 - abs(vec2(lp.x, lp.z));
  float cellStep = max(min(toEdge.x, toEdge.y) + .1, .1);
  if (p.y > hgt) cellStep = max(cellStep, p.y - hgt);
  return d < cellStep ? vec2(d, 1.) : vec2(cellStep, 0.);
}
// guindaste pórtico
float crane(vec3 p, vec3 o, float s) {
  p = (p - o) / s;
  vec3 q = p; q.x = abs(q.x);
  float legs = sdBox(vec3(q.x - 9., q.y - 22., abs(q.z) - 6.), vec3(.7, 22., .7));
  float beam = sdBox(p - vec3(0, 45., 0), vec3(11., 1.8, 7.));
  float boom = sdBox(p - vec3(0, 50., -40.), vec3(1.4, 1.2, 60.));
  float mast = sdBox(p - vec3(0, 58., 0), vec3(1.2, 12., 1.2));
  float cab = sdBox(p - vec3(0, 44., -18.), vec3(2.5, 2., 3.));
  float cable = sdBox(p - vec3(0, 36., -30.), vec3(.08, 14., .08));
  return min(min(min(legs, beam), min(boom, mast)), min(cab, cable)) * s;
}
float cranes(vec3 p) {
  float d = crane(p, vec3(-120., 0., 50.), 1.);
  d = min(d, crane(p, vec3(-40., 0., 60.), 1.));
  d = min(d, crane(p, vec3(60., 0., 55.), 1.1));
  d = min(d, crane(p, vec3(170., 0., 62.), .95));
  return d;
}
float quay(vec3 p) { return sdBox(p - vec3(0., -1., 220.), vec3(600., 2.4, 185.)); }
// navio atracado
float ship(vec3 p) {
  vec3 q = p - vec3(-10., 0., 22.);
  float hull = sdBox(q - vec3(0, 3., 0), vec3(150., 7., 13.));
  hull = max(hull, -(q.y - 10.5 + .002 * q.x * q.x * 0.));
  float bridge = sdBox(q - vec3(125., 16., 0), vec3(8., 8., 11.));
  return min(hull, bridge);
}
vec2 mapP(vec3 p) {
  vec2 r = containers(p);
  float c = cranes(p); if (c < r.x) r = vec2(c, 2.);
  float qd = quay(p); if (qd < r.x) r = vec2(qd, 3.);
  float s = ship(p); if (s < r.x) r = vec2(s, 4.);
  return r;
}

vec3 skyP(vec3 rd) {
  float y = max(rd.y, 0.);
  float mu = dot(rd, SUN);
  vec3 c = mix(vec3(2., .78, .35), vec3(.8, .38, .4), smoothstep(0., .12, y));
  c = mix(c, vec3(.16, .15, .32), smoothstep(.08, .55, y));
  c += vec3(2.6, 1.2, .45) * pow(SAT(mu), 10.) * 1.3;
  c += vec3(4., 2.6, 1.4) * pow(SAT(mu), 500.) * 6.;
  vec2 cp = rd.xz / (rd.y + .06) * 1.6;
  float cl = smoothstep(.5, .78, fbm2(cp * vec2(.5, 2.6) + 2., 6)) * smoothstep(0., .1, y);
  c = mix(c, mix(vec3(.8, .35, .35), vec3(2.6, 1.3, .6), pow(SAT(mu), 3.)), cl * .75);
  return c;
}

float marchP(vec3 ro, vec3 rd, float tmax, out float mat) {
  float t = .5; mat = -1.;
  for (int i = 0; i < 300; i++) {
    vec3 p = ro + rd * t;
    if (p.y > 110. && rd.y > 0.) break;
    vec2 d = mapP(p);
    if (d.y > 0. && d.x < .002 * t) { mat = d.y; return t; }
    t += d.x;
    if (t > tmax) break;
  }
  return -1.;
}

vec3 shadeP(vec3 p, vec3 rd, float mat) {
  vec2 e = vec2(.02, 0);
  vec3 n = normalize(vec3(mapP(p + e.xyy).x - mapP(p - e.xyy).x, mapP(p + e.yxy).x - mapP(p - e.yxy).x, mapP(p + e.yyx).x - mapP(p - e.yyx).x));
  vec3 alb;
  if (mat < 1.5) {
    vec2 id = floor(vec2(p.x / CS.x, p.z / CS.z)) + floor(p.y / CS.y) * 17.;
    float r = hash12(id);
    alb = r < .25 ? vec3(.32, .07, .05) : r < .45 ? vec3(.05, .11, .2) : r < .58 ? vec3(.38, .24, .06) : r < .7 ? vec3(.07, .18, .11) : r < .85 ? vec3(.35, .34, .32) : vec3(.18, .09, .08);
    // nervuras
    float rib = abs(n.x) > .5 ? p.z : p.x;
    alb *= .75 + .25 * step(.5, fract(rib * 3.));
    alb *= .7 + .3 * noise2(p.xz * 2.);
  } else if (mat < 2.5) alb = vec3(.55, .12, .06);
  else if (mat < 3.5) alb = vec3(.18, .17, .16);
  else alb = vec3(.07, .08, .1);
  float dif = SAT(dot(n, SUN));
  vec3 lin = vec3(3., 1.4, .6) * dif + vec3(.35, .25, .4) * (.5 + .5 * n.y) * .7 + vec3(.25, .15, .1) * SAT(-n.z) * .4;
  vec3 col = alb * lin;
  // luzes do pátio
  col += vec3(2.5, 1.6, .7) * exp(-max(p.y, 0.) * .5) * .05;
  if (mat > 1.5 && mat < 2.5) col += vec3(4., .3, .1) * step(.998, fract(p.y * .02)) ;
  return col;
}

void main() {
  vec2 uv = screenUV();
  vec3 ro = vec3(-150., 14., -40.);
  mat3 cam = lookAt(ro, vec3(40., 26., 160.));
  vec3 rd = normalize(cam * vec3(screenP(), 1.5));
  vec3 col;
  float mat;
  float t = marchP(ro, rd, 1500., mat);
  float tw = rd.y < 0. ? -ro.y / rd.y : 1e9;
  vec3 fogC = skyP(normalize(vec3(rd.x, .02, rd.z)));
  if (t > 0. && t < tw) {
    col = shadeP(ro + rd * t, rd, mat);
    col = mix(col, fogC * .7, 1. - exp(-t * .0016));
  } else if (rd.y < 0.) {
    vec3 p = ro + rd * tw;
    float h = fbm2(p.xz * vec2(.08, .4), 5);
    float e = .3;
    vec3 n = normalize(vec3((h - fbm2((p.xz + vec2(e, 0)) * vec2(.08, .4), 5)) * .5, e * 2., (h - fbm2((p.xz + vec2(0, e)) * vec2(.08, .4), 5)) * .5));
    vec3 rr = reflect(rd, n); rr.y = abs(rr.y) + .003;
    float mr;
    float tr = marchP(p + vec3(0, .1, 0), rr, 800., mr);
    vec3 refl = tr > 0. ? mix(shadeP(p + rr * tr, rr, mr), fogC * .7, 1. - exp(-(tr + tw) * .0025)) : skyP(rr);
    float fres = .03 + .97 * pow(1. - SAT(dot(-rd, n)), 5.);
    col = mix(vec3(.03, .025, .03), refl, SAT(fres * 1.4 + .2));
    col = mix(col, fogC * .7, 1. - exp(-tw * .0015));
  } else col = skyP(rd);
  col += vec3(1., .5, .2) * pow(SAT(dot(rd, SUN)), 16.) * .35;
  gSat = 1.1;
  outColor = vec4(finalize(col, uv, .5, .7), 1.);
}
