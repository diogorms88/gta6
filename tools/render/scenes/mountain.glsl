// Serra Alta: cordilheira ao anoitecer com neve, neblina nos vales, estrelas e estrada iluminada.
const vec3 SUN = normalize(vec3(-.8, .06, .6));

float terrainH(vec2 p, int oct) {
  p *= .0009;
  float a = 0., b = 1.;
  vec2 d = vec2(0);
  for (int i = 0; i < 14; i++) {
    if (i >= oct) break;
    vec3 n = noised(p);
    d += n.yz;
    a += b * n.x / (1. + dot(d, d));
    b *= .5;
    p = ROT2 * p * 2.;
  }
  return a * 520. - 160.;
}
float mainPeak(vec2 p) { return 1100. * exp(-pow(length((p - vec2(300., 5200.)) / vec2(2600., 1800.)), 1.4)); }
float H(vec2 p, int o) { return terrainH(p, o) + mainPeak(p); }

vec3 normalT(vec2 p, float t) {
  float e = .5 + t * .0015;
  return normalize(vec3(H(p - vec2(e, 0), 12) - H(p + vec2(e, 0), 12), 2. * e, H(p - vec2(0, e), 12) - H(p + vec2(0, e), 12)));
}
float march(vec3 ro, vec3 rd) {
  float t = 10.;
  for (int i = 0; i < 700; i++) {
    vec3 p = ro + rd * t;
    float h = p.y - H(p.xz, 8);
    if (abs(h) < .001 * t || t > 16000.) break;
    t += .35 * h;
  }
  return t;
}
float softShadow(vec3 ro, vec3 rd) {
  float res = 1., t = 5.;
  for (int i = 0; i < 80; i++) {
    vec3 p = ro + rd * t;
    float h = p.y - H(p.xz, 6);
    res = min(res, 16. * h / t);
    t += clamp(h, 5., 120.);
    if (res < .001 || t > 6000.) break;
  }
  return SAT(res);
}
vec3 sky(vec3 rd) {
  float y = max(rd.y, 0.);
  float mu = dot(rd, SUN);
  vec3 c = mix(vec3(.9, .42, .3), vec3(.16, .18, .42), smoothstep(0., .18, y));
  c = mix(c, vec3(.01, .015, .06), smoothstep(.12, .6, y));
  c += vec3(1.4, .5, .2) * pow(SAT(mu), 6.) * .9 * exp(-y * 6.);
  // estrelas
  vec2 sp = rd.xz / (rd.y + .2) * 420.;
  float st = pow(hash12(floor(sp)), 60.) * smoothstep(.08, .4, y);
  c += vec3(st) * 3.;
  // via láctea
  float band = exp(-pow(dot(rd, normalize(vec3(.6, .5, -.2))) * 4., 2.));
  c += vec3(.25, .22, .35) * band * fbm2(rd.xz * 9., 6) * smoothstep(.1, .5, y) * .7;
  return c;
}

void main() {
  vec2 uv = screenUV();
  vec3 ro = vec3(-900., 0., -3000.);
  ro.y = max(H(ro.xz, 8), 0.) + 420.;
  mat3 cam = lookAt(ro, vec3(300., 620., 5200.));
  vec3 rd = normalize(cam * vec3(screenP(), 1.7));
  vec3 col = sky(rd);
  float t = march(ro, rd);
  if (t < 16000.) {
    vec3 p = ro + rd * t;
    vec3 n = normalT(p.xz, t);
    float slope = n.y;
    // neve acima de ~500m nas faces planas
    float snow = smoothstep(420., 620., p.y + 120. * fbm2(p.xz * .01, 4)) * smoothstep(.55, .8, slope);
    vec3 rock = mix(vec3(.08, .07, .07), vec3(.18, .16, .15), fbm2(p.xz * .02, 4));
    vec3 forest = vec3(.03, .05, .035) * (.6 + .6 * noise2(p.xz * .3));
    vec3 alb = mix(rock, forest, smoothstep(.75, .88, slope) * smoothstep(420., 250., p.y));
    alb = mix(alb, vec3(.75, .78, .88), snow);
    float sh = softShadow(p + n * 2., SUN);
    float dif = SAT(dot(n, SUN)) * sh;
    vec3 lin = vec3(3.2, 1.3, .6) * dif + vec3(.12, .14, .3) * (.5 + .5 * n.y) + vec3(.2, .08, .06) * SAT(-dot(n, SUN)) * .3;
    col = alb * lin;
    // luzes de estrada na base do vale
    float road = smoothstep(2.5, 0., abs(p.x - 600. * sin(p.z * .0012) - 100.)) * smoothstep(300., 120., p.y);
    col += vec3(3., 1.8, .8) * road * step(.5, fract(p.z * .05)) * 1.5;
    // neblina de vale (altura) + distância
    float fogH = exp(-max(p.y - 80., 0.) * .006);
    float fog = 1. - exp(-t * .00011);
    col = mix(col, vec3(.35, .3, .5) * .6, SAT(fog));
    col = mix(col, vec3(.55, .42, .6) * .6, fogH * .5 * SAT(t / 3000.));
  }
  gSat = 1.1;
  outColor = vec4(finalize(col, uv, .9, .7), 1.);
}
