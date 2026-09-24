// Funções compartilhadas por todas as cenas.
precision highp float;
uniform vec2 uRes;      // resolução total da imagem
uniform vec2 uJitter;   // deslocamento subpixel (antialiasing)
out vec4 outColor;

#define PI 3.14159265
#define SAT(x) clamp(x, 0., 1.)

float hash11(float p) { p = fract(p * .1031); p *= p + 33.33; p *= p + p; return fract(p); }
float hash12(vec2 p) { vec3 p3 = fract(vec3(p.xyx) * .1031); p3 += dot(p3, p3.yzx + 33.33); return fract((p3.x + p3.y) * p3.z); }
vec2 hash22(vec2 p) { vec3 p3 = fract(vec3(p.xyx) * vec3(.1031, .1030, .0973)); p3 += dot(p3, p3.yzx + 33.33); return fract((p3.xx + p3.yz) * p3.zy); }
float hash13(vec3 p3) { p3 = fract(p3 * .1031); p3 += dot(p3, p3.zyx + 31.32); return fract((p3.x + p3.y) * p3.z); }

float noise2(vec2 p) {
  vec2 i = floor(p), f = fract(p);
  vec2 u = f * f * (3. - 2. * f);
  return mix(mix(hash12(i), hash12(i + vec2(1, 0)), u.x), mix(hash12(i + vec2(0, 1)), hash12(i + vec2(1, 1)), u.x), u.y);
}
// ruído com derivadas (para terreno)
vec3 noised(vec2 p) {
  vec2 i = floor(p), f = fract(p);
  vec2 u = f * f * (3. - 2. * f), du = 6. * f * (1. - f);
  float a = hash12(i), b = hash12(i + vec2(1, 0)), c = hash12(i + vec2(0, 1)), d = hash12(i + vec2(1, 1));
  return vec3(a + (b - a) * u.x + (c - a) * u.y + (a - b - c + d) * u.x * u.y,
              du * (vec2(b - a, c - a) + (a - b - c + d) * u.yx));
}
float noise3(vec3 x) {
  vec3 i = floor(x), f = fract(x);
  f = f * f * (3. - 2. * f);
  return mix(mix(mix(hash13(i), hash13(i + vec3(1, 0, 0)), f.x), mix(hash13(i + vec3(0, 1, 0)), hash13(i + vec3(1, 1, 0)), f.x), f.y),
             mix(mix(hash13(i + vec3(0, 0, 1)), hash13(i + vec3(1, 0, 1)), f.x), mix(hash13(i + vec3(0, 1, 1)), hash13(i + vec3(1, 1, 1)), f.x), f.y), f.z);
}
const mat2 ROT2 = mat2(.8, .6, -.6, .8);
float fbm2(vec2 p, int oct) { float s = 0., a = .5; for (int i = 0; i < 12; i++) { if (i >= oct) break; s += a * noise2(p); p = ROT2 * p * 2.02; a *= .5; } return s; }
float fbm3(vec3 p, int oct) { float s = 0., a = .5; for (int i = 0; i < 8; i++) { if (i >= oct) break; s += a * noise3(p); p = p * 2.03 + vec3(1.7, 9.2, 3.1); a *= .5; } return s; }

// ------------------------------------------------ Céu físico (Rayleigh + Mie, simplificado)
const vec3 BETA_R = vec3(5.8e-3, 13.5e-3, 33.1e-3);
const vec3 BETA_M = vec3(21e-3);
vec3 atmosphere(vec3 rd, vec3 sunDir, float sunI, float turb) {
  float mu = dot(rd, sunDir);
  float y = max(rd.y, 0.) + .012;
  float zenR = 8.4 / (y + .15 * pow(93.885 - acos(y) * 57.3 + 180., -1.253) * 0.);
  zenR = 1. / (y + .06);
  float zenM = 1.25 / (y + .06);
  float sy = max(sunDir.y, -.1) + .06;
  vec3 extSun = exp(-(BETA_R * (1. / sy) * 3.2 + BETA_M * turb * (1. / sy) * 1.4));
  vec3 ext = exp(-(BETA_R * zenR * 3.2 + BETA_M * turb * zenM * 1.4));
  float phR = .75 * (1. + mu * mu);
  float g = .76;
  float phM = (1. - g * g) / (4. * PI * pow(1. + g * g - 2. * g * mu, 1.5));
  vec3 scat = (BETA_R * phR + BETA_M * turb * phM * 2.2) / (BETA_R + BETA_M * turb);
  vec3 col = sunI * scat * (1. - ext) * mix(vec3(1), extSun, .85);
  // horizonte levemente mais claro
  col += sunI * .02 * extSun * exp(-y * 8.);
  return col;
}
vec3 sunDisk(vec3 rd, vec3 sunDir, vec3 sunCol, float size) {
  float mu = dot(rd, sunDir);
  float d = smoothstep(cos(size), cos(size * .7), mu);
  return sunCol * (d * 60. + pow(SAT(mu), 900.) * 6. + pow(SAT(mu), 60.) * .45);
}

// ------------------------------------------------ Pós-processamento
float gSat = 1.06; // a cena pode ajustar antes de chamar finalize()
vec3 aces(vec3 x) { const float a = 2.51, b = .03, c = 2.43, d = .59, e = .14; return SAT((x * (a * x + b)) / (x * (c * x + d) + e)); }
vec3 finalize(vec3 col, vec2 uv, float exposure, float vig) {
  col *= exposure;
  col = aces(col);
  col = pow(col, vec3(1. / 2.2));
  vec2 q = uv - .5;
  col *= 1. - vig * dot(q, q) * 1.6;
  col = mix(vec3(dot(col, vec3(.299, .587, .114))), col, gSat);
  col += (hash12(gl_FragCoord.xy + uJitter * 97.) - .5) / 255. * 2.;
  return SAT(col);
}

mat3 lookAt(vec3 ro, vec3 ta) {
  vec3 f = normalize(ta - ro);
  vec3 r = normalize(cross(f, vec3(0, 1, 0)));
  return mat3(r, cross(r, f), f);
}
vec2 screenUV() { return (gl_FragCoord.xy + uJitter) / uRes; }
vec2 screenP() { return ((gl_FragCoord.xy + uJitter) * 2. - uRes) / uRes.y; }
