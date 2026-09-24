// Gera as ilustrações vetoriais (SVG) do site em assets/img.
// Uso: node tools/generate-art.mjs
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const OUT = join(dirname(fileURLToPath(import.meta.url)), "..", "assets", "img");
mkdirSync(OUT, { recursive: true });

const W = 1920;
const H = 1080;

function rng(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const f = (n) => Math.round(n * 10) / 10;

function svg(w, h, defs, body) {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}" preserveAspectRatio="xMidYMid slice">
<defs>
<filter id="grain" x="0" y="0" width="100%" height="100%"><feTurbulence type="fractalNoise" baseFrequency=".9" numOctaves="2" stitchTiles="stitch"/><feColorMatrix values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 .07 0"/></filter>
<filter id="blur8"><feGaussianBlur stdDeviation="8"/></filter>
<filter id="blur30"><feGaussianBlur stdDeviation="30"/></filter>
<filter id="blur80"><feGaussianBlur stdDeviation="80"/></filter>
${defs}
</defs>
${body}
<rect width="${w}" height="${h}" filter="url(#grain)"/>
</svg>`;
}

function linear(id, stops, x2 = 0, y2 = 1) {
  return `<linearGradient id="${id}" x1="0" y1="0" x2="${x2}" y2="${y2}">${stops
    .map(([o, c, a = 1]) => `<stop offset="${o}" stop-color="${c}" stop-opacity="${a}"/>`)
    .join("")}</linearGradient>`;
}

function radial(id, stops, cx = 0.5, cy = 0.5, r = 0.5) {
  return `<radialGradient id="${id}" cx="${cx}" cy="${cy}" r="${r}">${stops
    .map(([o, c, a = 1]) => `<stop offset="${o}" stop-color="${c}" stop-opacity="${a}"/>`)
    .join("")}</radialGradient>`;
}

// Linha de relevo suave entre y0 e y0+amp.
function ridge(r, y0, amp, steps, fill, w = W, h = H) {
  let d = `M0 ${h} L0 ${f(y0 + r() * amp)}`;
  const n = steps;
  let prev = y0 + r() * amp;
  for (let i = 1; i <= n; i++) {
    const x = (w / n) * i;
    const y = y0 + r() * amp;
    const cx = x - w / n / 2;
    d += ` Q${f(cx)} ${f(prev + (r() - 0.5) * amp * 0.6)} ${f(x)} ${f(y)}`;
    prev = y;
  }
  return `<path d="${d} L${w} ${h} Z" fill="${fill}"/>`;
}

function stars(r, count, maxY, w = W) {
  let s = "";
  for (let i = 0; i < count; i++) {
    const rad = r() < 0.92 ? r() * 1.2 + 0.4 : r() * 2 + 1.4;
    s += `<circle cx="${f(r() * w)}" cy="${f(r() * maxY)}" r="${f(rad)}" fill="#fff" opacity="${f(0.3 + r() * 0.7)}"/>`;
  }
  return s;
}

function palm(x, baseY, height, lean, color, r, scale = 1) {
  const topX = x + lean;
  const topY = baseY - height;
  const trunkW = 14 * scale;
  let s = `<path d="M${f(x - trunkW / 2)} ${baseY} Q${f(x + lean * 0.2)} ${f(baseY - height * 0.5)} ${f(topX - 3 * scale)} ${f(topY)} L${f(topX + 3 * scale)} ${f(topY)} Q${f(x + lean * 0.2 + trunkW)} ${f(baseY - height * 0.5)} ${f(x + trunkW / 2)} ${baseY} Z" fill="${color}"/>`;
  const fronds = 9;
  for (let i = 0; i < fronds; i++) {
    const a = (-Math.PI * 0.95) + (i / (fronds - 1)) * Math.PI * 0.95 * 2 * 0.52 + (r() - 0.5) * 0.3;
    const len = (110 + r() * 70) * scale;
    const ex = topX + Math.cos(a) * len;
    const ey = topY + Math.sin(a) * len * 0.55 + len * 0.35;
    const mx = topX + Math.cos(a) * len * 0.5;
    const my = topY + Math.sin(a) * len * 0.5 - 30 * scale;
    const t = 9 * scale;
    s += `<path d="M${f(topX)} ${f(topY)} Q${f(mx)} ${f(my - t)} ${f(ex)} ${f(ey)} Q${f(mx)} ${f(my + t)} ${f(topX)} ${f(topY)} Z" fill="${color}"/>`;
  }
  return s;
}

function skyline(r, baseY, count, minH, maxH, color, windows, w = W) {
  let s = "";
  let x = -20;
  const win = [];
  while (x < w + 20) {
    const bw = 40 + r() * 110;
    const bh = minH + Math.pow(r(), 1.6) * (maxH - minH);
    const top = baseY - bh;
    s += `<rect x="${f(x)}" y="${f(top)}" width="${f(bw)}" height="${f(bh + 2)}" fill="${color}"/>`;
    if (r() < 0.25) {
      s += `<rect x="${f(x + bw / 2 - 2)}" y="${f(top - 40 - r() * 60)}" width="4" height="100" fill="${color}"/>`;
    }
    if (r() < 0.2) {
      s += `<path d="M${f(x)} ${f(top)} L${f(x + bw / 2)} ${f(top - bw * 0.5)} L${f(x + bw)} ${f(top)} Z" fill="${color}"/>`;
    }
    if (windows) {
      for (let wy = top + 12; wy < baseY - 10; wy += 16) {
        for (let wx = x + 8; wx < x + bw - 10; wx += 14) {
          if (r() < windows.density) {
            win.push(
              `<rect x="${f(wx)}" y="${f(wy)}" width="6" height="8" fill="${windows.colors[Math.floor(r() * windows.colors.length)]}" opacity="${f(0.5 + r() * 0.5)}"/>`
            );
          }
        }
      }
    }
    x += bw + r() * 6;
  }
  return s + win.join("");
}

// ---------------------------------------------------------------- CENAS

function sunsetCoast(seed, p) {
  const r = rng(seed);
  const horizon = H * 0.62;
  const sunX = W * p.sunX;
  const sunY = horizon - p.sunLift;
  const defs =
    linear("sky", p.sky) +
    linear("sea", p.sea) +
    radial("sun", [[0, "#fff8e1"], [0.35, p.sunCore], [1, p.sunCore, 0]]) +
    radial("glow", [[0, p.glow, 0.85], [1, p.glow, 0]]) +
    linear("refl", [[0, p.sunCore, 0.9], [1, p.sunCore, 0]]);
  let b = `<rect width="${W}" height="${H}" fill="url(#sky)"/>`;
  b += `<ellipse cx="${sunX}" cy="${sunY}" rx="900" ry="520" fill="url(#glow)"/>`;
  b += stars(r, p.stars || 0, horizon * 0.5);
  b += `<circle cx="${sunX}" cy="${sunY}" r="${p.sunR}" fill="url(#sun)"/>`;
  // faixas no sol (estilo retrô)
  for (let i = 0; i < 6; i++) {
    const y = sunY + p.sunR * 0.1 + i * (p.sunR * 0.15);
    b += `<rect x="${sunX - p.sunR}" y="${f(y)}" width="${p.sunR * 2}" height="${f(3 + i * 2.5)}" fill="${p.sky[p.sky.length - 1][1]}" opacity=".85"/>`;
  }
  // nuvens
  for (let i = 0; i < 9; i++) {
    const cy = horizon * (0.15 + r() * 0.6);
    const cx = r() * W;
    b += `<ellipse cx="${f(cx)}" cy="${f(cy)}" rx="${f(180 + r() * 380)}" ry="${f(8 + r() * 16)}" fill="${p.cloud}" opacity="${f(0.35 + r() * 0.4)}" filter="url(#blur8)"/>`;
  }
  if (p.skyline) {
    b += `<g opacity=".95">${skyline(r, horizon + 2, 0, 60, 330, p.far, p.windows)}</g>`;
  } else {
    b += ridge(r, horizon - 70, 60, 6, p.far);
  }
  b += `<rect y="${horizon}" width="${W}" height="${H - horizon}" fill="url(#sea)"/>`;
  // reflexo do sol
  for (let i = 0; i < 38; i++) {
    const y = horizon + 6 + i * i * 0.36;
    const w = (p.sunR * 1.6) * (1 - i / 50) * (0.6 + r() * 0.6);
    b += `<rect x="${f(sunX - w / 2 + (r() - 0.5) * 40)}" y="${f(y)}" width="${f(w)}" height="${f(2 + i * 0.12)}" rx="2" fill="${p.sunCore}" opacity="${f(0.75 - i * 0.017)}"/>`;
  }
  // ondas
  for (let i = 0; i < 90; i++) {
    const y = horizon + 10 + Math.pow(r(), 1.5) * (H - horizon);
    b += `<rect x="${f(r() * W)}" y="${f(y)}" width="${f(20 + r() * 120)}" height="1.6" fill="#fff" opacity="${f(0.05 + r() * 0.15)}"/>`;
  }
  // praia
  b += `<path d="M0 ${H} L0 ${H * 0.86} Q${W * 0.25} ${H * 0.8} ${W * 0.5} ${H * 0.9} T${W} ${H * 0.84} L${W} ${H} Z" fill="${p.sand}"/>`;
  // palmeiras
  const palms = p.palms || [];
  for (const [px, ph, lean, sc] of palms) {
    b += palm(W * px, H + 10, ph, lean, p.silhouette, r, sc);
  }
  b += `<rect width="${W}" height="${H}" fill="url(#glow)" opacity=".12"/>`;
  return svg(W, H, defs, b);
}

function nightCity(seed, p) {
  const r = rng(seed);
  const baseY = H * 0.7;
  const defs =
    linear("sky", p.sky) +
    linear("water", [[0, p.water[0]], [1, p.water[1]]]) +
    radial("moon", [[0, "#fff"], [0.6, "#fde7ff"], [1, "#fde7ff", 0]]) +
    radial("haze", [[0, p.haze, 0.7], [1, p.haze, 0]]);
  let b = `<rect width="${W}" height="${H}" fill="url(#sky)"/>`;
  b += stars(r, 260, baseY * 0.55);
  b += `<circle cx="${W * 0.78}" cy="${H * 0.18}" r="46" fill="url(#moon)"/>`;
  b += `<ellipse cx="${W / 2}" cy="${baseY}" rx="${W * 0.7}" ry="260" fill="url(#haze)"/>`;
  b += skyline(r, baseY, 0, 80, 250, p.back, { density: 0.12, colors: p.lights });
  b += skyline(r, baseY, 0, 60, 520, p.front, { density: 0.28, colors: p.lights });
  // letreiros neon
  for (let i = 0; i < 7; i++) {
    const x = r() * W;
    const y = baseY - 80 - r() * 280;
    const c = p.neon[i % p.neon.length];
    const w = 60 + r() * 90;
    b += `<rect x="${f(x)}" y="${f(y)}" width="${f(w)}" height="14" rx="7" fill="${c}" filter="url(#blur8)"/>`;
    b += `<rect x="${f(x)}" y="${f(y)}" width="${f(w)}" height="14" rx="7" fill="${c}" opacity=".9"/>`;
  }
  b += `<rect y="${baseY}" width="${W}" height="${H - baseY}" fill="url(#water)"/>`;
  // reflexos
  for (let i = 0; i < 520; i++) {
    const x = r() * W;
    const y = baseY + 4 + Math.pow(r(), 1.3) * (H - baseY);
    b += `<rect x="${f(x)}" y="${f(y)}" width="${f(3 + r() * 30)}" height="2" fill="${p.lights[Math.floor(r() * p.lights.length)]}" opacity="${f(0.15 + r() * 0.5)}"/>`;
  }
  // píer em primeiro plano
  if (p.pier) {
    b += `<rect x="0" y="${H * 0.9}" width="${W}" height="${H * 0.1}" fill="#07030f"/>`;
    for (let x = 30; x < W; x += 180) {
      b += `<rect x="${x}" y="${H * 0.83}" width="6" height="${H * 0.08}" fill="#07030f"/>`;
      b += `<circle cx="${x + 3}" cy="${H * 0.83}" r="10" fill="${p.neon[0]}" filter="url(#blur8)"/>`;
      b += `<circle cx="${x + 3}" cy="${H * 0.83}" r="4" fill="#fff"/>`;
    }
  }
  return svg(W, H, defs, b);
}

function keysBridge(seed, p) {
  const r = rng(seed);
  const horizon = H * 0.5;
  const defs =
    linear("sky", p.sky) +
    linear("sea", p.sea) +
    radial("sunglow", [[0, "#fffbe6", 1], [0.2, "#ffe7a8", 0.8], [1, "#ffe7a8", 0]]);
  let b = `<rect width="${W}" height="${H}" fill="url(#sky)"/>`;
  b += `<circle cx="${W * 0.2}" cy="${H * 0.16}" r="320" fill="url(#sunglow)"/>`;
  for (let i = 0; i < 14; i++) {
    const cx = r() * W;
    const cy = horizon * (0.2 + r() * 0.7);
    const rx = 80 + r() * 200;
    b += `<g opacity="${f(0.7 + r() * 0.3)}"><ellipse cx="${f(cx)}" cy="${f(cy)}" rx="${f(rx)}" ry="${f(rx * 0.28)}" fill="#fff"/><ellipse cx="${f(cx + rx * 0.3)}" cy="${f(cy - rx * 0.15)}" rx="${f(rx * 0.55)}" ry="${f(rx * 0.3)}" fill="#fff"/><ellipse cx="${f(cx)}" cy="${f(cy + rx * 0.12)}" rx="${f(rx * 1.05)}" ry="${f(rx * 0.12)}" fill="${p.cloudShade}"/></g>`;
  }
  b += `<rect y="${horizon}" width="${W}" height="${H - horizon}" fill="url(#sea)"/>`;
  // bancos de areia e ilhas
  for (let i = 0; i < 6; i++) {
    const cx = r() * W;
    const cy = horizon + 30 + r() * (H - horizon) * 0.7;
    const rx = 90 + r() * 260;
    b += `<ellipse cx="${f(cx)}" cy="${f(cy)}" rx="${f(rx * 1.4)}" ry="${f(rx * 0.22)}" fill="${p.shallow}" opacity=".7" filter="url(#blur30)"/>`;
    b += `<ellipse cx="${f(cx)}" cy="${f(cy)}" rx="${f(rx * 0.7)}" ry="${f(rx * 0.1)}" fill="${p.sand}"/>`;
    b += `<ellipse cx="${f(cx)}" cy="${f(cy - rx * 0.03)}" rx="${f(rx * 0.55)}" ry="${f(rx * 0.08)}" fill="${p.green}"/>`;
  }
  // ponte em perspectiva
  const y0 = horizon + 8;
  b += `<path d="M${W * 0.62} ${y0} L${W * 0.66} ${y0} L${W * 1.1} ${H * 0.86} L${W * 0.55} ${H * 1.02} Z" fill="${p.bridgeTop}"/>`;
  b += `<path d="M${W * 0.55} ${H * 1.02} L${W * 1.1} ${H * 0.86} L${W * 1.1} ${H * 0.9} L${W * 0.55} ${H * 1.08} Z" fill="${p.bridgeSide}"/>`;
  for (let i = 0; i <= 18; i++) {
    const t = Math.pow(i / 18, 1.7);
    const x = W * 0.64 + t * (W * 0.2);
    const yt = y0 + t * (H * 0.9 - y0);
    const hgt = 4 + t * 110;
    b += `<rect x="${f(x - 1 - t * 8)}" y="${f(yt)}" width="${f(2 + t * 16)}" height="${f(hgt)}" fill="${p.bridgeSide}"/>`;
  }
  // barco
  b += `<path d="M${W * 0.3} ${H * 0.72} l120 0 l-20 18 l-90 0 Z" fill="#fff"/><path d="M${W * 0.3 + 30} ${H * 0.72} l40 -30 l20 30 Z" fill="#f4f4f4"/>`;
  b += `<path d="M${W * 0.3 - 200} ${H * 0.735} q100 -6 200 0" stroke="#fff" stroke-width="3" fill="none" opacity=".6"/>`;
  b += palm(W * 0.06, H + 20, 520, 90, "#0f2a2c", r, 1.1);
  b += palm(W * 0.14, H + 20, 380, 140, "#12302f", r, 0.8);
  return svg(W, H, defs, b);
}

function glades(seed, p) {
  const r = rng(seed);
  const waterY = H * 0.66;
  const defs =
    linear("sky", p.sky) +
    linear("water", [[0, p.water[0]], [1, p.water[1]]]) +
    radial("moon", [[0, "#ffffff"], [0.5, p.moon], [1, p.moon, 0]]) +
    linear("fog", [[0, p.fog, 0], [0.5, p.fog, 0.55], [1, p.fog, 0]]);
  let b = `<rect width="${W}" height="${H}" fill="url(#sky)"/>`;
  b += stars(r, 180, waterY * 0.6);
  b += `<circle cx="${W * 0.5}" cy="${H * 0.28}" r="260" fill="url(#moon)" opacity=".7"/>`;
  b += `<circle cx="${W * 0.5}" cy="${H * 0.28}" r="70" fill="#fffdf2"/>`;
  b += ridge(r, waterY - 120, 60, 18, p.tree3);
  b += `<rect y="${waterY - 120}" width="${W}" height="140" fill="url(#fog)"/>`;
  b += ridge(r, waterY - 60, 50, 26, p.tree2);
  b += `<rect y="${waterY}" width="${W}" height="${H - waterY}" fill="url(#water)"/>`;
  b += `<rect x="${W * 0.5 - 30}" y="${waterY}" width="60" height="${H - waterY}" fill="#fffdf2" opacity=".18" filter="url(#blur30)"/>`;
  for (let i = 0; i < 60; i++) {
    const y = waterY + 6 + i * 6;
    b += `<rect x="${f(W * 0.5 - 50 + (r() - 0.5) * 50)}" y="${y}" width="${f(40 + r() * 70)}" height="2" fill="#fffdf2" opacity="${f(0.5 - i * 0.008)}"/>`;
  }
  // árvores de mangue em primeiro plano
  const tree = (x, h, scale, color) => {
    let s = `<path d="M${x} ${waterY + 20} q${-20 * scale} ${-h * 0.4} ${4 * scale} ${-h}" stroke="${color}" stroke-width="${10 * scale}" fill="none"/>`;
    for (let i = 0; i < 6; i++) {
      s += `<path d="M${x} ${waterY + 10} q${(r() - 0.5) * 120 * scale} ${-30 * scale} ${(r() - 0.5) * 160 * scale} ${30 * scale}" stroke="${color}" stroke-width="${3 * scale}" fill="none"/>`;
    }
    for (let i = 0; i < 16; i++) {
      s += `<ellipse cx="${f(x + (r() - 0.5) * 220 * scale)}" cy="${f(waterY - h + (r() - 0.3) * 100 * scale)}" rx="${f((50 + r() * 60) * scale)}" ry="${f((20 + r() * 30) * scale)}" fill="${color}"/>`;
    }
    for (let i = 0; i < 8; i++) {
      const sx = x + (r() - 0.5) * 180 * scale;
      s += `<path d="M${f(sx)} ${f(waterY - h + 20)} l0 ${f(60 + r() * 140)}" stroke="${color}" stroke-width="2" opacity=".8"/>`;
    }
    return s;
  };
  b += tree(W * 0.08, 380, 1.2, p.tree1);
  b += tree(W * 0.92, 420, 1.3, p.tree1);
  b += tree(W * 0.26, 250, 0.7, p.tree2);
  // capim
  for (let i = 0; i < 260; i++) {
    const x = r() * W;
    const h2 = 20 + r() * 70;
    b += `<path d="M${f(x)} ${H} q${f((r() - 0.5) * 20)} ${f(-h2 / 2)} ${f((r() - 0.5) * 40)} ${f(-h2 - (H - waterY) * 0.3 * r())}" stroke="${p.tree1}" stroke-width="2.2" fill="none"/>`;
  }
  // olhos de jacaré
  b += `<ellipse cx="${W * 0.62}" cy="${waterY + 90}" rx="40" ry="6" fill="${p.tree1}"/><circle cx="${W * 0.62 - 14}" cy="${waterY + 86}" r="3" fill="#e9ff7a"/><circle cx="${W * 0.62 + 2}" cy="${waterY + 86}" r="3" fill="#e9ff7a"/>`;
  return svg(W, H, defs, b);
}

function port(seed, p) {
  const r = rng(seed);
  const baseY = H * 0.72;
  const defs =
    linear("sky", p.sky) +
    linear("water", [[0, p.water[0]], [1, p.water[1]]]) +
    radial("sun", [[0, "#fff4d6"], [0.3, p.sun], [1, p.sun, 0]]);
  let b = `<rect width="${W}" height="${H}" fill="url(#sky)"/>`;
  b += `<circle cx="${W * 0.35}" cy="${baseY - 60}" r="420" fill="url(#sun)" opacity=".8"/>`;
  b += `<circle cx="${W * 0.35}" cy="${baseY - 60}" r="80" fill="#fff4d6" opacity=".95"/>`;
  // fumaça
  for (let i = 0; i < 5; i++) {
    const x = W * (0.55 + i * 0.07);
    b += `<rect x="${x}" y="${baseY - 330 + i * 20}" width="24" height="${330 - i * 20}" fill="${p.mid}"/>`;
    for (let j = 0; j < 8; j++) {
      b += `<circle cx="${f(x + 12 + j * 30 + r() * 20)}" cy="${f(baseY - 350 + i * 20 - j * 34)}" r="${f(24 + j * 10)}" fill="${p.smoke}" opacity="${f(0.35 - j * 0.035)}" filter="url(#blur8)"/>`;
    }
  }
  // guindastes
  const crane = (x, s, c) =>
    `<g fill="${c}"><rect x="${x}" y="${baseY - 420 * s}" width="${22 * s}" height="${420 * s}"/><rect x="${x + 22 * s}" y="${baseY - 420 * s}" width="${22 * s}" height="${420 * s}" opacity=".0"/><rect x="${x - 60 * s}" y="${baseY - 440 * s}" width="${420 * s}" height="${26 * s}"/><path d="M${x} ${baseY - 440 * s} L${x + 11 * s} ${baseY - 520 * s} L${x + 22 * s} ${baseY - 440 * s} Z"/><path d="M${x + 11 * s} ${baseY - 520 * s} L${x + 360 * s} ${baseY - 440 * s}" stroke="${c}" stroke-width="${3 * s}"/><path d="M${x + 11 * s} ${baseY - 520 * s} L${x - 60 * s} ${baseY - 440 * s}" stroke="${c}" stroke-width="${3 * s}"/><rect x="${x + 250 * s}" y="${baseY - 414 * s}" width="${3 * s}" height="${160 * s}"/><rect x="${x + 236 * s}" y="${baseY - 254 * s}" width="${30 * s}" height="${16 * s}"/><path d="M${x - 40 * s} ${baseY} L${x} ${baseY - 200 * s} L${x + 22 * s} ${baseY - 200 * s} L${x + 62 * s} ${baseY} Z" opacity=".6"/></g>`;
  b += crane(W * 0.08, 1.1, p.front);
  b += crane(W * 0.7, 0.8, p.mid);
  b += crane(W * 0.84, 0.95, p.front);
  // containers
  let x = 0;
  while (x < W) {
    const stack = 1 + Math.floor(r() * 4);
    for (let s = 0; s < stack; s++) {
      const c = p.containers[Math.floor(r() * p.containers.length)];
      b += `<rect x="${f(x)}" y="${f(baseY - 34 * (s + 1))}" width="118" height="33" fill="${c}"/>`;
      for (let k = 6; k < 116; k += 8) b += `<rect x="${f(x + k)}" y="${f(baseY - 34 * (s + 1) + 3)}" width="2" height="27" fill="#000" opacity=".22"/>`;
    }
    x += 120;
  }
  b += `<rect y="${baseY}" width="${W}" height="${H - baseY}" fill="url(#water)"/>`;
  for (let i = 0; i < 200; i++) {
    b += `<rect x="${f(r() * W)}" y="${f(baseY + 4 + Math.pow(r(), 1.4) * (H - baseY))}" width="${f(8 + r() * 60)}" height="2" fill="${p.sun}" opacity="${f(0.1 + r() * 0.35)}"/>`;
  }
  // navio
  b += `<path d="M${W * 0.4} ${H * 0.86} L${W * 0.95} ${H * 0.86} L${W * 0.92} ${H * 0.93} L${W * 0.43} ${H * 0.93} Z" fill="${p.front}"/>`;
  for (let i = 0; i < 14; i++) {
    b += `<rect x="${W * 0.42 + i * 58}" y="${H * 0.86 - 34 * (1 + (i % 3))}" width="56" height="${34 * (1 + (i % 3))}" fill="${p.containers[i % p.containers.length]}" opacity=".85"/>`;
  }
  b += `<rect x="${W * 0.88}" y="${H * 0.72}" width="60" height="${H * 0.14}" fill="${p.front}"/>`;
  return svg(W, H, defs, b);
}

function mountain(seed, p) {
  const r = rng(seed);
  const defs =
    linear("sky", p.sky) +
    linear("m1", [[0, p.m1[0]], [1, p.m1[1]]]) +
    linear("m2", [[0, p.m2[0]], [1, p.m2[1]]]) +
    linear("mist", [[0, p.mist, 0], [1, p.mist, 0.8]]);
  let b = `<rect width="${W}" height="${H}" fill="url(#sky)"/>`;
  b += stars(r, 420, H * 0.55);
  // via láctea
  b += `<ellipse cx="${W * 0.55}" cy="${H * 0.25}" rx="${W * 0.6}" ry="70" fill="${p.milky}" opacity=".25" transform="rotate(-18 ${W * 0.55} ${H * 0.25})" filter="url(#blur30)"/>`;
  b += `<g transform="rotate(-18 ${W * 0.55} ${H * 0.25})">${stars(r, 300, 0, W)
    .replace(/cy="0"/g, "")
    .replace(/cx="([\d.]+)"/g, (m, v) => `cx="${v}" cy="${f(H * 0.25 + (r() - 0.5) * 130)}"`)}</g>`;
  // montanha principal
  const peakX = W * 0.58;
  b += `<path d="M0 ${H * 0.75} L${W * 0.2} ${H * 0.6} L${W * 0.35} ${H * 0.5} L${W * 0.46} ${H * 0.4} L${peakX} ${H * 0.24} L${W * 0.66} ${H * 0.34} L${W * 0.74} ${H * 0.38} L${W * 0.86} ${H * 0.52} L${W} ${H * 0.58} L${W} ${H} L0 ${H} Z" fill="url(#m1)"/>`;
  b += `<path d="M${W * 0.46} ${H * 0.4} L${peakX} ${H * 0.24} L${W * 0.66} ${H * 0.34} L${W * 0.61} ${H * 0.33} L${W * 0.585} ${H * 0.36} L${W * 0.55} ${H * 0.32} L${W * 0.5} ${H * 0.4} Z" fill="${p.snow}" opacity=".85"/>`;
  b += `<rect y="${H * 0.45}" width="${W}" height="${H * 0.25}" fill="url(#mist)"/>`;
  b += ridge(r, H * 0.62, 90, 10, "url(#m2)");
  // pinheiros
  const pine = (x, y, h, c) => {
    const w = h * 0.36;
    return `<path d="M${f(x)} ${f(y - h)} L${f(x + w * 0.5)} ${f(y - h * 0.55)} L${f(x + w * 0.28)} ${f(y - h * 0.55)} L${f(x + w * 0.6)} ${f(y - h * 0.2)} L${f(x + w * 0.3)} ${f(y - h * 0.2)} L${f(x + w * 0.66)} ${f(y)} L${f(x - w * 0.66)} ${f(y)} L${f(x - w * 0.3)} ${f(y - h * 0.2)} L${f(x - w * 0.6)} ${f(y - h * 0.2)} L${f(x - w * 0.28)} ${f(y - h * 0.55)} L${f(x - w * 0.5)} ${f(y - h * 0.55)} Z" fill="${c}"/>`;
  };
  for (let i = 0; i < 90; i++) {
    const x = r() * W;
    b += pine(x, H * 0.8 + r() * 40, 60 + r() * 60, p.trees2);
  }
  b += `<rect y="${H * 0.82}" width="${W}" height="${H * 0.18}" fill="${p.trees1}"/>`;
  for (let i = 0; i < 60; i++) {
    const x = r() * W;
    b += pine(x, H + 10, 140 + r() * 180, p.trees1);
  }
  // luzes da estrada
  let d = `M${W * 0.1} ${H * 0.93}`;
  for (let i = 1; i < 8; i++) d += ` Q${W * (0.1 + i * 0.12)} ${H * (0.9 - (i % 2) * 0.04)} ${W * (0.16 + i * 0.12)} ${H * 0.91}`;
  b += `<path d="${d}" stroke="${p.road}" stroke-width="6" fill="none" stroke-dasharray="2 18" stroke-linecap="round" filter="url(#blur8)"/>`;
  b += `<path d="${d}" stroke="${p.road}" stroke-width="3" fill="none" stroke-dasharray="2 18" stroke-linecap="round"/>`;
  return svg(W, H, defs, b);
}

// Retrato original: figura estilizada (silhueta) com luz de contorno.
function portrait(seed, p) {
  const PW = 1200;
  const PH = 1600;
  const r = rng(seed);
  const defs =
    linear("bg", p.bg, 0.3, 1) +
    radial("halo", [[0, p.halo, 0.95], [0.5, p.halo, 0.35], [1, p.halo, 0]]) +
    linear("rim", [[0, p.rim, 1], [1, p.rim, 0]], 1, 0) +
    linear("body", [[0, p.body[0]], [1, p.body[1]]]);
  let b = `<rect width="${PW}" height="${PH}" fill="url(#bg)"/>`;
  b += `<circle cx="${PW * 0.52}" cy="${PH * 0.4}" r="700" fill="url(#halo)"/>`;
  // faixas de luz
  for (let i = 0; i < 7; i++) {
    const x = r() * PW;
    b += `<rect x="${f(x)}" y="-100" width="${f(30 + r() * 120)}" height="${PH + 200}" fill="${p.beam}" opacity="${f(0.04 + r() * 0.08)}" transform="rotate(${f(-18 + r() * 8)} ${f(x)} ${PH / 2})"/>`;
  }
  // palmeiras ao fundo
  b += `<g opacity=".55">${palm(PW * 0.12, PH, 1200, 140, p.bgSil, r, 1.5)}${palm(PW * 0.9, PH, 1050, -160, p.bgSil, r, 1.3)}</g>`;
  const cx = PW * 0.5;
  const neckY = PH * 0.55;
  const headR = p.headR;
  const headCy = neckY - headR * 1.05;
  // cabelo (atrás)
  b += p.hairBack(cx, headCy, headR, "url(#body)");
  // ombros e torso
  b += `<path d="M${cx - 90} ${neckY - 30} L${cx - 88} ${neckY + 40} Q${cx - 420} ${neckY + 90} ${cx - 520} ${neckY + 360} L${cx - 560} ${PH} L${cx + 560} ${PH} L${cx + 520} ${neckY + 360} Q${cx + 420} ${neckY + 90} ${cx + 88} ${neckY + 40} L${cx + 90} ${neckY - 30} Z" fill="url(#body)"/>`;
  // cabeça
  b += `<ellipse cx="${cx}" cy="${headCy}" rx="${headR * 0.86}" ry="${headR * 1.08}" fill="url(#body)"/>`;
  b += p.hairFront(cx, headCy, headR, "url(#body)");
  // acessório
  b += p.extra(cx, headCy, headR, neckY);
  // luz de contorno
  b += `<path d="M${cx + headR * 0.8} ${headCy - headR * 0.6} Q${cx + headR * 1.02} ${headCy} ${cx + headR * 0.7} ${headCy + headR * 0.8}" stroke="${p.rim}" stroke-width="8" fill="none" opacity=".9" filter="url(#blur8)"/>`;
  b += `<path d="M${cx + 100} ${neckY + 45} Q${cx + 420} ${neckY + 95} ${cx + 515} ${neckY + 360}" stroke="${p.rim}" stroke-width="10" fill="none" opacity=".85" filter="url(#blur8)"/>`;
  b += `<path d="M${cx - headR * 0.8} ${headCy - headR * 0.4} Q${cx - headR * 1.0} ${headCy + headR * 0.2} ${cx - headR * 0.6} ${headCy + headR * 0.9}" stroke="${p.rim2}" stroke-width="6" fill="none" opacity=".7" filter="url(#blur8)"/>`;
  b += `<rect width="${PW}" height="${PH}" fill="url(#halo)" opacity=".08"/>`;
  return svg(PW, PH, defs, b);
}

// ---------------------------------------------------------------- PALETAS

const scenes = {
  "hero": () =>
    sunsetCoast(11, {
      sky: [[0, "#1b0b3a"], [0.35, "#5a1a6e"], [0.62, "#e8437a"], [0.8, "#ff8a5b"], [1, "#ffc27a"]],
      sea: [[0, "#6b2a7a"], [0.4, "#2c1650"], [1, "#0c0620"]],
      sunX: 0.5, sunLift: 140, sunR: 170, sunCore: "#ffd08a", glow: "#ff6d8a",
      cloud: "#ff9fb0", skyline: true, far: "#2a0f3f",
      windows: { density: 0.05, colors: ["#ffcf7a", "#ff7ab8"] },
      sand: "#12061f", silhouette: "#0b0416",
      palms: [[0.06, 820, 60, 1.3], [0.16, 620, 120, 1], [0.86, 760, -90, 1.2], [0.95, 560, -40, 0.9]],
      stars: 120,
    }),
  "beach-day": () =>
    sunsetCoast(27, {
      sky: [[0, "#1c7fd6"], [0.5, "#58c1f0"], [0.62, "#9ee6ff"], [1, "#fff1c9"]],
      sea: [[0, "#18b3c7"], [0.5, "#0f8aa8"], [1, "#0a4f78"]],
      sunX: 0.78, sunLift: 420, sunR: 90, sunCore: "#fffbe0", glow: "#fff4c2",
      cloud: "#ffffff", skyline: true, far: "#6aa6c6",
      windows: null,
      sand: "#f3d9a4", silhouette: "#12433a",
      palms: [[0.04, 900, 90, 1.3], [0.12, 700, 150, 1.05], [0.94, 780, -120, 1.15]],
    }),
  "coral-city": () =>
    nightCity(42, {
      sky: [[0, "#070318"], [0.55, "#2b0d4d"], [0.7, "#8a1d6b"], [1, "#ff4f8b"]],
      water: ["#2b0a3d", "#05020d"], haze: "#ff3c9c",
      back: "#2a0f47", front: "#0c0519",
      lights: ["#ffd37a", "#ff7ad9", "#6fe7ff", "#ffffff"],
      neon: ["#ff2fb3", "#28e0ff", "#ffe14d", "#8c5bff"],
      pier: true,
    }),
  "city-dusk": () =>
    nightCity(7, {
      sky: [[0, "#0d1640"], [0.5, "#4a2a86"], [0.72, "#f0689b"], [1, "#ffb57a"]],
      water: ["#3a2462", "#0a0a20"], haze: "#ff9a7a",
      back: "#3b2a6e", front: "#110b2a",
      lights: ["#ffe2a0", "#fff", "#ffb0d8"],
      neon: ["#ff5fa8", "#50f0ff", "#ffd24d"],
      pier: false,
    }),
  "keys": () =>
    keysBridge(5, {
      sky: [[0, "#2a8ee8"], [0.6, "#86d3ff"], [1, "#d8f4ff"]],
      sea: [[0, "#3ed2e0"], [0.4, "#1db0c9"], [1, "#07667f"]],
      cloudShade: "#b9dcf2", shallow: "#7af0e6", sand: "#fbeac2", green: "#2f7d57",
      bridgeTop: "#e9e3d6", bridgeSide: "#8f8778",
    }),
  "glades": () =>
    glades(19, {
      sky: [[0, "#050d18"], [0.6, "#16304a"], [1, "#3f6b72"]],
      water: ["#1a3640", "#03080c"], moon: "#e8f4d8", fog: "#9bc3bf",
      tree1: "#02070a", tree2: "#081a1e", tree3: "#12303a",
    }),
  "port": () =>
    port(33, {
      sky: [[0, "#2b1b3d"], [0.45, "#a4455b"], [0.75, "#f08b4b"], [1, "#ffd08a"]],
      water: ["#6d3a4a", "#150c16"], sun: "#ffb26b", smoke: "#f7c6a6",
      mid: "#4a2a3e", front: "#1a0f1c",
      containers: ["#b53a3a", "#2f5f8f", "#d98b2b", "#3f7d5a", "#7a3f8f", "#c9c2b0"],
    }),
  "mountain": () =>
    mountain(88, {
      sky: [[0, "#02030c"], [0.5, "#0e1638"], [1, "#3d3a6e"]],
      m1: ["#4e4a78", "#141430"], m2: ["#1e2346", "#070a1a"],
      mist: "#8c86c2", snow: "#dcdcff", milky: "#b8a8ff",
      trees1: "#02030a", trees2: "#0a0f24", road: "#ffcf6e",
    }),
};

const hairShort = (cx, cy, r, fill) =>
  `<path d="M${cx - r * 0.9} ${cy - r * 0.1} Q${cx - r * 1.0} ${cy - r * 1.25} ${cx} ${cy - r * 1.22} Q${cx + r * 1.05} ${cy - r * 1.2} ${cx + r * 0.9} ${cy - r * 0.15} Q${cx + r * 0.6} ${cy - r * 0.95} ${cx - r * 0.2} ${cy - r * 0.85} Q${cx - r * 0.7} ${cy - r * 0.8} ${cx - r * 0.9} ${cy - r * 0.1} Z" fill="${fill}"/>`;

const portraits = {
  "char-marisol": () =>
    portrait(101, {
      bg: [[0, "#ff5f8f"], [0.5, "#b8327a"], [1, "#3a0d3f"]],
      halo: "#ffd08a", beam: "#fff2c2", rim: "#ffe0a0", rim2: "#ff7ad9",
      body: ["#2a0b30", "#12040f"], bgSil: "#6b1650",
      headR: 150,
      hairBack: (cx, cy, r, fill) =>
        `<path d="M${cx - r * 1.05} ${cy - r * 0.4} Q${cx - r * 1.4} ${cy + r * 1.6} ${cx - r * 1.7} ${cy + r * 2.6} L${cx + r * 1.7} ${cy + r * 2.6} Q${cx + r * 1.4} ${cy + r * 1.6} ${cx + r * 1.05} ${cy - r * 0.4} Q${cx} ${cy - r * 1.7} ${cx - r * 1.05} ${cy - r * 0.4} Z" fill="${fill}"/>`,
      hairFront: (cx, cy, r, fill) =>
        `<path d="M${cx - r * 0.95} ${cy} Q${cx - r * 0.9} ${cy - r * 1.3} ${cx + r * 0.2} ${cy - r * 1.2} Q${cx + r * 1.1} ${cy - r * 1.0} ${cx + r * 0.95} ${cy + r * 0.2} Q${cx + r * 0.5} ${cy - r * 0.9} ${cx - r * 0.3} ${cy - r * 0.7} Q${cx - r * 0.8} ${cy - r * 0.5} ${cx - r * 0.95} ${cy} Z" fill="${fill}"/>`,
      extra: (cx, cy, r) =>
        `<circle cx="${cx + r * 0.88}" cy="${cy + r * 0.35}" r="16" fill="none" stroke="#ffd08a" stroke-width="5"/><path d="M${cx - r * 0.6} ${cy - r * 0.15} q${r * 0.3} -${r * 0.12} ${r * 0.55} 0 l${r * 0.1} 0 q${r * 0.25} -${r * 0.12} ${r * 0.55} 0 l0 ${r * 0.18} q-${r * 0.28} ${r * 0.12} -${r * 0.55} 0 l-${r * 0.1} 0 q-${r * 0.28} ${r * 0.12} -${r * 0.55} 0 Z" fill="#0a0208" stroke="#ff7ad9" stroke-width="3"/>`,
    }),
  "char-dex": () =>
    portrait(202, {
      bg: [[0, "#2fd4ff"], [0.45, "#2b5fb8"], [1, "#0b0f2e"]],
      halo: "#9ff3ff", beam: "#e8fbff", rim: "#b8f6ff", rim2: "#ff9a5b",
      body: ["#0b1330", "#05081a"], bgSil: "#16336e",
      headR: 160,
      hairBack: () => "",
      hairFront: hairShort,
      extra: (cx, cy, r, neckY) =>
        `<path d="M${cx - 88} ${neckY + 40} L${cx} ${neckY + 260} L${cx + 88} ${neckY + 40}" fill="none" stroke="#9ff3ff" stroke-width="4" opacity=".6"/><path d="M${cx - r * 0.8} ${cy + r * 0.4} Q${cx} ${cy + r * 1.35} ${cx + r * 0.8} ${cy + r * 0.4} Q${cx + r * 0.6} ${cy + r * 1.05} ${cx} ${cy + r * 1.1} Q${cx - r * 0.6} ${cy + r * 1.05} ${cx - r * 0.8} ${cy + r * 0.4} Z" fill="#05081a"/>`,
    }),
};

let count = 0;
for (const [name, fn] of Object.entries({ ...scenes, ...portraits })) {
  writeFileSync(join(OUT, `${name}.svg`), fn());
  count++;
}
console.log(`${count} ilustrações geradas em ${OUT}`);
