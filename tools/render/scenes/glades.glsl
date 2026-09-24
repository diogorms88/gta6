// Pântano Verde ao amanhecer: água parada, capim, ciprestes com barba-de-velho e neblina baixa.
const vec3 SUN = normalize(vec3(.15, .07, 1.));
const float TC = 26.;

float sdCone(vec3 p, float h, float r0, float r1) {
  float t = SAT(p.y / h);
  float r = mix(r0, r1, t);
  return max(length(p.xz) - r, max(-p.y, p.y - h)) * .8;
}
vec3 treeInfo(vec2 id) {
  float present = step(.38, hash12(id * 1.7));
  float h = 10. + 16. * hash12(id + 4.);
  vec2 off = (hash22(id + 9.) - .5) * TC * .6;
  return vec3(off, h * present);
}
// retorna distância e material (1 tronco, 2 copa)
vec2 tree(vec3 p) {
  vec2 id = floor(p.xz / TC);
  vec2 lp = mod(p.xz, TC) - TC * .5;
  vec3 ti = treeInfo(id);
  vec2 res = vec2(1e9, 0);
  if ((id.y > 1. || (id.y > 0. && abs(id.x + .5) > 1.)) && ti.z > 0.) {
    vec3 q = vec3(lp.x - ti.x, p.y, lp.y - ti.y);
    // tronco com base alargada
    float flare = .9 * exp(-max(q.y, 0.) * .9);
    float dt = sdCone(q, ti.z, .45 + flare, .15);
    res = vec2(dt, 1.);
    // copa: camadas achatadas com ruído
    float dc = 1e9;
    for (int k = 0; k < 6; k++) {
      float fk = float(k);
      float hy = ti.z * (.5 + .1 * fk + .05 * hash12(id + fk * 3.));
      vec3 c = vec3((hash12(id + fk) - .5) * 5., hy, (hash12(id + fk + 7.) - .5) * 5.);
      vec3 r = (q - c) / vec3(2.6 - fk * .25, .9, 2.6 - fk * .25);
      dc = min(dc, (length(r) - 1.) * .9);
    }
    dc += (fbm3(q * 1.3, 4) - .5) * 1.6;
    // barba-de-velho pendurada
    float moss = max(dc - .2, -(q.y - ti.z * .55)) ;
    if (dc < res.x) res = vec2(dc * .6, 2.);
  }
  vec2 toEdge = TC * .5 - abs(lp);
  float cellStep = max(min(toEdge.x, toEdge.y) + 1., 1.);
  if (cellStep < res.x) res = vec2(cellStep, 0.);
  return res;
}
float grassH(vec2 p) {
  float patches = smoothstep(.42, .55, fbm2(p * .06, 5));
  return patches * (.15 + .6 * noise2(p * 2.5) * noise2(p * 7.)) - .05;
}

vec3 skyG(vec3 rd) {
  float y = max(rd.y, 0.);
  float mu = dot(rd, SUN);
  vec3 c = mix(vec3(1.5, .95, .55), vec3(.5, .62, .78), smoothstep(0., .25, y));
  c = mix(c, vec3(.2, .32, .55), smoothstep(.2, .7, y));
  c += vec3(2.6, 1.6, .7) * pow(SAT(mu), 10.) * 1.2;
  c += vec3(4., 3., 1.8) * pow(SAT(mu), 400.) * 5.;
  return c;
}

void main() {
  vec2 uv = screenUV();
  vec3 ro = vec3(3., 1.6, 0.);
  mat3 cam = lookAt(ro, vec3(0., 3.2, 40.));
  vec3 rd = normalize(cam * vec3(screenP(), 1.6));

  // árvores
  float t = .5; vec2 hit = vec2(-1);
  for (int i = 0; i < 300; i++) {
    vec3 p = ro + rd * t;
    vec2 d = tree(p);
    if (d.y > 0. && d.x < .004 * t) { hit = vec2(t, d.y); break; }
    t += max(d.x, .02);
    if (t > 900. || p.y < -.1 || p.y > 60.) break;
  }
  float tw = rd.y < 0. ? -ro.y / rd.y : 1e9;
  vec3 col;
  vec3 fogC = skyG(normalize(vec3(rd.x, .03, rd.z)));
  if (hit.x > 0. && hit.x < tw) {
    vec3 p = ro + rd * hit.x;
    vec2 e = vec2(.03, 0);
    vec3 n = normalize(vec3(tree(p + e.xyy).x - tree(p - e.xyy).x, tree(p + e.yxy).x - tree(p - e.yxy).x, tree(p + e.yyx).x - tree(p - e.yyx).x));
    vec3 alb = hit.y < 1.5 ? vec3(.12, .09, .07) : vec3(.07, .1, .04);
    float back = pow(SAT(dot(rd, SUN)), 3.);
    vec3 lin = vec3(.5, .55, .6) * (.5 + .5 * n.y) + vec3(2.2, 1.4, .7) * SAT(dot(n, SUN)) * .6 + vec3(1.8, 1.1, .5) * back * (hit.y > 1.5 ? .8 : .2);
    col = alb * lin;
    col = mix(col, fogC * .8, 1. - exp(-hit.x * .006));
  } else if (rd.y < 0.) {
    vec3 p = ro + rd * tw;
    float g = grassH(p.xz);
    // água espelhada com leves ondulações
    float e = .05;
    float wh = noise2(p.xz * vec2(1.5, 6.)) * .08;
    vec3 n = normalize(vec3((wh - noise2((p.xz + vec2(e, 0)) * vec2(1.5, 6.)) * .08) * .15, e, (wh - noise2((p.xz + vec2(0, e)) * vec2(1.5, 6.)) * .08) * .15));
    vec3 rr = reflect(rd, n);
    // reflexo das árvores
    float tr = .5; bool rh = false;
    vec3 rp = p + vec3(0, .02, 0);
    for (int i = 0; i < 120; i++) {
      vec3 q = rp + rr * tr;
      vec2 d = tree(q);
      if (d.y > 0. && d.x < .01 * tr) { rh = true; break; }
      tr += max(d.x, .05);
      if (tr > 500. || q.y > 60.) break;
    }
    vec3 refl = rh ? mix(vec3(.02, .025, .015), fogC * .8, 1. - exp(-(tr + tw) * .006)) : skyG(rr);
    float fres = .04 + .96 * pow(1. - SAT(dot(-rd, n)), 5.);
    col = mix(vec3(.02, .03, .02), refl, SAT(fres * 1.3 + .1));
    // capim acima da água
    if (g > .02) {
      vec3 gc = mix(vec3(.2, .22, .08), vec3(.45, .38, .15), noise2(p.xz * 3.));
      gc *= .6 + 1.4 * pow(SAT(dot(rd, SUN)), 4.);
      col = mix(col, gc * .9, smoothstep(.02, .15, g));
    }
    col = mix(col, fogC * .8, 1. - exp(-tw * .006));
  } else {
    col = skyG(rd);
  }
  // neblina baixa iluminada (espalhamento para frente)
  float fogAmt = 1. - exp(-min(hit.x > 0. ? hit.x : 300., 300.) * .006 * exp(-max(ro.y + rd.y * 20., 0.) * .1));
  col = mix(col, vec3(1.1, .8, .5) * (.4 + 1.5 * pow(SAT(dot(rd, SUN)), 6.)), fogAmt * .3 * smoothstep(.12, -.02, rd.y));
  gSat = 1.05;
  outColor = vec4(finalize(col, uv, .45, .8), 1.);
}
