/* =========================================================
   Revelação com o cursor (WebGL)
   Um rastro de máscara é "pintado" pelo mouse, arrastado pela própria velocidade
   e dissipado com o tempo. Onde há máscara, aparece uma segunda camada da imagem
   (versão néon), borrada na direção do movimento — formando fitas esticadas.
   Uso: <div data-reveal><img src="..."></div>
   ========================================================= */
(() => {
  const VERT = `
attribute vec2 p;
varying vec2 vUv;
void main() { vUv = p * .5 + .5; gl_Position = vec4(p, 0., 1.); }`;

  // Rastro: R = máscara, GB = velocidade (0.5 = parado)
  const TRAIL = `
precision highp float;
varying vec2 vUv;
uniform sampler2D tPrev;
uniform vec2 uA, uB;        // segmento do pincel (uv)
uniform vec2 uVel;          // velocidade do mouse (uv por quadro)
uniform float uAspect, uRadius, uStrength, uDecay;
float segDist(vec2 p, vec2 a, vec2 b) {
  vec2 pa = p - a, ba = b - a;
  float h = clamp(dot(pa, ba) / max(dot(ba, ba), 1e-6), 0., 1.);
  return length(pa - ba * h);
}
void main() {
  vec4 prev = texture2D(tPrev, vUv);
  vec2 vel = prev.gb * 2. - 1.;
  // advecção: o rastro é arrastado pela velocidade armazenada
  vec4 adv = texture2D(tPrev, vUv - vel * .02);
  float m = max(0., adv.r * uDecay - .006);
  vec2 v = (adv.gb * 2. - 1.) * .97;
  vec2 asp = vec2(uAspect, 1.);
  float d = segDist(vUv * asp, uA * asp, uB * asp);
  float s = smoothstep(uRadius, uRadius * .15, d) * uStrength;
  m = max(m, s);
  v = mix(v, clamp(uVel * 18., -1., 1.), s);
  gl_FragColor = vec4(clamp(m, 0., 1.), v * .5 + .5, 1.);
}`;

  // Composição final
  const COMP = `
precision highp float;
varying vec2 vUv;
uniform sampler2D tImage, tTrail;
uniform vec2 uScale, uOffset;   // emula object-fit: cover + object-position
uniform float uTime;
vec3 neon(vec3 c, vec2 uv) {
  float l = dot(c, vec3(.299, .587, .114));
  l = smoothstep(.12, .8, l);
  vec3 ink = vec3(.05, .055, .04), pink = vec3(1., .31, .6), lime = vec3(.83, 1., .23);
  // mapa de três tons, posterizado
  float q = floor(l * 4.) / 3.;
  vec3 g = q < .34 ? ink : q < .67 ? pink : lime;
  g = mix(g, q < .5 ? mix(ink, pink, l * 2.) : mix(pink, lime, l * 2. - 1.), .35);
  g *= .8 + .2 * step(.5, fract(uv.y * 220.));        // linhas de varredura
  return g;
}
void main() {
  vec2 uv = vUv * uScale + uOffset;
  vec4 tr = texture2D(tTrail, vUv);
  vec2 vel = tr.gb * 2. - 1.;
  float m = tr.r;
  vec3 base = texture2D(tImage, uv).rgb;
  // camada revelada, esticada na direção do movimento
  vec2 ruv = uv - vel * .16 * uScale;
  vec3 rev = neon(texture2D(tImage, ruv).rgb, vUv);
  // bordas nítidas em fita + fio cromado na borda
  float k = smoothstep(.22, .3, m);
  float edge = smoothstep(.18, .23, m) - smoothstep(.28, .36, m);
  vec3 col = mix(base, rev, k);
  col += vec3(1.) * edge * .55 * (.6 + .4 * sin(vUv.x * 40. + uTime * 3.));
  gl_FragColor = vec4(col, 1.);
}`;

  function compile(gl, type, src) {
    const s = gl.createShader(type);
    gl.shaderSource(s, src);
    gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s));
    return s;
  }
  function program(gl, fs) {
    const p = gl.createProgram();
    gl.attachShader(p, compile(gl, gl.VERTEX_SHADER, VERT));
    gl.attachShader(p, compile(gl, gl.FRAGMENT_SHADER, fs));
    gl.bindAttribLocation(p, 0, "p");
    gl.linkProgram(p);
    if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(p));
    const u = {};
    const n = gl.getProgramParameter(p, gl.ACTIVE_UNIFORMS);
    for (let i = 0; i < n; i++) { const name = gl.getActiveUniform(p, i).name; u[name] = gl.getUniformLocation(p, name); }
    return { p, u };
  }
  function target(gl, w, h) {
    const tex = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    const init = new Uint8Array(w * h * 4);
    for (let i = 0; i < init.length; i += 4) { init[i + 1] = 128; init[i + 2] = 128; init[i + 3] = 255; }
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, w, h, 0, gl.RGBA, gl.UNSIGNED_BYTE, init);
    const fb = gl.createFramebuffer();
    gl.bindFramebuffer(gl.FRAMEBUFFER, fb);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tex, 0);
    return { tex, fb, w, h };
  }

  function setup(host) {
    const img = host.querySelector("img");
    const canvas = document.createElement("canvas");
    canvas.className = "reveal-canvas";
    canvas.setAttribute("aria-hidden", "true");
    const gl = canvas.getContext("webgl", { premultipliedAlpha: false, antialias: false });
    if (!gl) return;
    let trailP, compP;
    try { trailP = program(gl, TRAIL); compP = program(gl, COMP); } catch (e) { console.warn("reveal:", e); return; }
    host.appendChild(canvas);

    const quad = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, quad);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);

    const imgTex = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, imgTex);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

    let W = 0, H = 0, A, B, cover = [1, 1, 0, 0];
    function resize() {
      const r = host.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      W = Math.max(2, Math.round(r.width * dpr)); H = Math.max(2, Math.round(r.height * dpr));
      canvas.width = W; canvas.height = H;
      const tw = Math.max(64, Math.round(W * .4)), th = Math.max(64, Math.round(H * .4));
      A = target(gl, tw, th); B = target(gl, tw, th);
      // object-fit: cover com object-position lido do CSS
      const ia = img.naturalWidth / img.naturalHeight, ca = r.width / r.height;
      const pos = getComputedStyle(img).objectPosition.split(" ").map((v) => parseFloat(v) / 100);
      const px = isNaN(pos[0]) ? .5 : pos[0], py = isNaN(pos[1]) ? .5 : pos[1];
      if (ia > ca) { const s = ca / ia; cover = [s, 1, (1 - s) * px, 0]; }
      else { const s = ia / ca; cover = [1, s, 0, (1 - s) * (1 - py)]; }
    }
    resize();
    new ResizeObserver(resize).observe(host);

    // entrada do mouse / toque em coordenadas uv do elemento
    let mouse = [.5, .5], last = [.5, .5], strength = 0, active = false;
    function toUv(e) {
      const r = host.getBoundingClientRect();
      return [(e.clientX - r.left) / r.width, 1 - (e.clientY - r.top) / r.height];
    }
    host.addEventListener("pointermove", (e) => { mouse = toUv(e); if (!active) { last = mouse.slice(); active = true; } strength = 1; });
    host.addEventListener("pointerleave", () => { active = false; });

    // traço automático de demonstração (também mostra o efeito em telas de toque)
    let demo = null;
    host.revealDemo = () => { demo = { t: 0 }; };

    let visible = true;
    new IntersectionObserver(([en]) => { visible = en.isIntersecting; }).observe(host);
    const t0 = performance.now();

    function frame() {
      requestAnimationFrame(frame);
      if (!visible || !A) return;
      if (demo) {
        demo.t += 1 / 90;
        const t = demo.t;
        const p = [.15 + .7 * t, .62 - .18 * Math.sin(t * Math.PI * 1.6)];
        if (t === 1 / 90) last = p.slice();
        mouse = p; strength = 1;
        if (t >= 1) { demo = null; strength = 0; }
      }
      const vel = [mouse[0] - last[0], mouse[1] - last[1]];

      // passo do rastro
      gl.useProgram(trailP.p);
      gl.bindFramebuffer(gl.FRAMEBUFFER, B.fb);
      gl.viewport(0, 0, B.w, B.h);
      gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, A.tex);
      gl.uniform1i(trailP.u.tPrev, 0);
      gl.uniform2f(trailP.u.uA, last[0], last[1]);
      gl.uniform2f(trailP.u.uB, mouse[0], mouse[1]);
      gl.uniform2f(trailP.u.uVel, vel[0], vel[1]);
      gl.uniform1f(trailP.u.uAspect, W / H);
      gl.uniform1f(trailP.u.uRadius, .12);
      gl.uniform1f(trailP.u.uStrength, strength);
      gl.uniform1f(trailP.u.uDecay, .987);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
      [A, B] = [B, A];
      last = mouse.slice();
      if (!active && !demo) strength = 0;

      // composição
      gl.useProgram(compP.p);
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
      gl.viewport(0, 0, W, H);
      gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, imgTex);
      gl.uniform1i(compP.u.tImage, 0);
      gl.activeTexture(gl.TEXTURE1); gl.bindTexture(gl.TEXTURE_2D, A.tex);
      gl.uniform1i(compP.u.tTrail, 1);
      gl.uniform2f(compP.u.uScale, cover[0], cover[1]);
      gl.uniform2f(compP.u.uOffset, cover[2], cover[3]);
      gl.uniform1f(compP.u.uTime, (performance.now() - t0) / 1000);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    }
    frame();
    host.classList.add("has-reveal");
  }

  function start() {
    document.querySelectorAll("[data-reveal]").forEach((host) => {
      const img = host.querySelector("img");
      if (!img) return;
      if (img.complete && img.naturalWidth) setup(host);
      else img.addEventListener("load", () => setup(host), { once: true });
    });
  }
  window.NeonReveal = { start };
})();
