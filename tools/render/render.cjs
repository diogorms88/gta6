// Renderiza as cenas 3D (tools/render/scenes/*.glsl) para assets/img/*.webp
// Uso: node tools/render/render.cjs [cena ...] [--w=2560] [--h=1440] [--spp=4]
// Requer Playwright com Chromium (WebGL2 via SwiftShader funciona sem GPU).
const { chromium } = require(process.env.PWPATH || "playwright");
const http = require("http");
const fs = require("fs");
const path = require("path");

const ROOT = __dirname;
const OUT = path.join(ROOT, "..", "..", "assets", "img");
fs.mkdirSync(OUT, { recursive: true });
const args = process.argv.slice(2);
const opt = Object.fromEntries(args.filter((a) => a.startsWith("--")).map((a) => a.slice(2).split("=")));
let scenes = args.filter((a) => !a.startsWith("--"));
if (!scenes.length) scenes = fs.readdirSync(path.join(ROOT, "scenes")).filter((f) => !f.startsWith("_")).map((f) => f.replace(".glsl", ""));
const W = +(opt.w || 2560), H = +(opt.h || 1440), SPP = +(opt.spp || 4), TILE = +(opt.tile || 128);

const server = http.createServer((req, res) => {
  const file = path.join(ROOT, decodeURIComponent(req.url.split("?")[0]));
  if (!file.startsWith(ROOT) || !fs.existsSync(file)) { res.writeHead(404); return res.end(); }
  res.end(fs.readFileSync(file));
}).listen(0, async () => {
  const port = server.address().port;
  const browser = await chromium.launch({
    executablePath: process.env.CHROMIUM || "/opt/pw-browsers/chromium",
    args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"],
  });
  const page = await browser.newPage();
  page.on("console", (m) => console.log("[page]", m.text()));
  await page.goto(`http://localhost:${port}/render.html`);
  for (const scene of scenes) {
    const t0 = Date.now();
    const sz = opt[`size-${scene}`] ? opt[`size-${scene}`].split("x").map(Number) : null;
    const w = sz ? sz[0] : W, h = sz ? sz[1] : H;
    try {
      const url = await page.evaluate(([s, w, h, spp, t]) => window.renderScene(s, w, h, spp, t), [scene, w, h, SPP, TILE]);
      const file = path.join(opt.out || OUT, `${scene}.webp`);
      fs.writeFileSync(file, Buffer.from(url.split(",")[1], "base64"));
      console.log(`${scene}: ${w}x${h} ${SPP}spp em ${((Date.now() - t0) / 1000).toFixed(1)}s -> ${file}`);
    } catch (e) {
      console.error(`${scene}: ERRO`, e.message);
    }
  }
  await browser.close();
  server.close();
});
