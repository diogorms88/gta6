/* =========================================================
   NEON TIDE — interações e animações de rolagem
   ========================================================= */
(() => {
  const { gsap, ScrollTrigger } = window;
  gsap.registerPlugin(ScrollTrigger);
  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => Array.from(c.querySelectorAll(s));
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const desktop = window.matchMedia("(min-width: 901px)").matches;

  // ---------------------------------------------------------- Rolagem suave
  let lenis = null;
  if (!reduce && window.Lenis) {
    lenis = new window.Lenis({ lerp: 0.085 });
    lenis.on("scroll", ScrollTrigger.update);
    gsap.ticker.add((t) => lenis.raf(t * 1000));
    gsap.ticker.lagSmoothing(0);
    lenis.stop();
  }
  const scrollTo = (id) => (lenis ? lenis.scrollTo(id, { duration: 1.6 }) : $(id)?.scrollIntoView({ behavior: "smooth" }));
  $$('a[href^="#"]').forEach((a) =>
    a.addEventListener("click", (e) => {
      const id = a.getAttribute("href");
      if (id.length < 2 || !$(id)) return;
      e.preventDefault();
      toggleMenu(false);
      scrollTo(id);
    })
  );

  // ---------------------------------------------------------- Menu
  const menuBtn = $(".nav__menu");
  function toggleMenu(force) {
    const open = typeof force === "boolean" ? force : !document.body.classList.contains("menu-open");
    document.body.classList.toggle("menu-open", open);
    menuBtn.setAttribute("aria-expanded", String(open));
    $(".menu").setAttribute("aria-hidden", String(!open));
    if (open) gsap.fromTo(".menu a", { yPercent: 110, opacity: 0 }, { yPercent: 0, opacity: 1, stagger: 0.06, duration: 1, ease: "expo.out", delay: 0.2 });
    open ? lenis?.stop() : lenis?.start();
  }
  menuBtn.addEventListener("click", () => toggleMenu());

  // ---------------------------------------------------------- Cursor
  const cursor = $(".cursor");
  if (cursor && window.matchMedia("(hover: hover)").matches) {
    const label = $(".cursor__label", cursor);
    const xTo = gsap.quickTo(cursor, "x", { duration: 0.35, ease: "power3" });
    const yTo = gsap.quickTo(cursor, "y", { duration: 0.35, ease: "power3" });
    window.addEventListener("pointermove", (e) => { xTo(e.clientX); yTo(e.clientY); });
    $$("[data-cursor]").forEach((el) => {
      el.addEventListener("pointerenter", () => { label.textContent = el.dataset.cursor; cursor.classList.add("is-big"); });
      el.addEventListener("pointerleave", () => cursor.classList.remove("is-big"));
    });
  }

  // ---------------------------------------------------------- Loader
  function loader() {
    const paths = $$(".loader__mark path");
    paths.forEach((p) => { const l = p.getTotalLength(); p.style.strokeDasharray = l; p.style.strokeDashoffset = l; });
    const counter = { v: 0 };
    const out = $(".loader__count span");
    return gsap.timeline()
      .to(paths, { strokeDashoffset: 0, duration: 1.4, stagger: 0.25, ease: "power2.inOut" }, 0)
      .to(counter, { v: 100, duration: 1.8, ease: "power2.inOut", onUpdate: () => (out.textContent = Math.round(counter.v)) }, 0)
      .to(".loader", { clipPath: "inset(0 0 100% 0)", duration: 1.1, ease: "expo.inOut" }, "+=0.2")
      .add(() => { document.body.classList.remove("is-loading"); $(".loader").remove(); lenis?.start(); ScrollTrigger.refresh(); })
      .from(".hero__row > span", { yPercent: 105, duration: 1.4, stagger: 0.12, ease: "expo.out" }, "-=0.5")
      .from(".hero__card", { clipPath: "inset(50% 50% 50% 50% round 28px)", duration: 1.6, ease: "expo.out" }, "<0.1")
      .from(".hero__card img", { scale: 1.4, duration: 1.8, ease: "expo.out" }, "<")
      .from(".hero__meta p, .nav, .hero__scroll", { opacity: 0, y: 20, duration: 1, stagger: 0.08, ease: "expo.out" }, "<0.4")
      .add(() => $(".hero__card").revealDemo?.(), "-=0.6");
  }

  // ---------------------------------------------------------- Hero no scroll
  function hero() {
    const tl = gsap.timeline({ scrollTrigger: { trigger: ".hero", start: "top top", end: "bottom top", scrub: true } });
    tl.to(".hero__row:first-child > span", { xPercent: -18, ease: "none" }, 0)
      .to(".hero__row--right > span", { xPercent: 18, ease: "none" }, 0)
      .to(".hero__card", { yPercent: 18, scale: 1.18, ease: "none" }, 0)
      .to(".hero__meta, .hero__scroll", { opacity: 0, ease: "none", duration: 0.3 }, 0);
  }

  // ---------------------------------------------------------- Ticker
  function ticker() {
    const track = $(".ticker__track");
    let x = 0, dir = -1, boost = 0;
    gsap.ticker.add((_, dt) => {
      const half = track.scrollWidth / 2;
      x += dir * (0.05 + boost) * dt;
      if (x <= -half) x += half;
      if (x > 0) x -= half;
      boost *= 0.92;
      gsap.set(track, { x });
    });
    ScrollTrigger.create({ start: 0, end: "max", onUpdate: (s) => { dir = s.direction === 1 ? -1 : 1; boost = Math.min(Math.abs(s.getVelocity()) / 4000, 1.2); } });
  }

  // ---------------------------------------------------------- Manifesto palavra a palavra
  function manifesto() {
    const el = $(".reveal-words");
    el.innerHTML = el.textContent.trim().split(/\s+/).map((w) => `<span class="w">${w}</span>`).join(" ");
    gsap.to($$(".w", el), { opacity: 1, stagger: 0.1, ease: "none", scrollTrigger: { trigger: el, start: "top 80%", end: "bottom 45%", scrub: true } });
  }

  // ---------------------------------------------------------- Dentro / fora da lei
  function sides() {
    $$(".side").forEach((side) => {
      gsap.from($$(".side__title span", side), { yPercent: 100, opacity: 0, duration: 1.3, stagger: 0.1, ease: "expo.out", scrollTrigger: { trigger: side, start: "top 70%" } });
      gsap.from($(".side__lede", side), { y: 30, opacity: 0, duration: 1.2, ease: "expo.out", scrollTrigger: { trigger: side, start: "top 60%" } });
      $$(".side__img", side).forEach((fig) => {
        gsap.from(fig, { clipPath: "inset(30% 10% 30% 10% round 28px)", ease: "power2.out", scrollTrigger: { trigger: fig, start: "top 95%", end: "top 45%", scrub: 1 } });
        gsap.to($("img", fig), { scale: 1, yPercent: 6, ease: "none", scrollTrigger: { trigger: fig, start: "top bottom", end: "bottom top", scrub: true } });
      });
    });
  }

  // ---------------------------------------------------------- Coleção horizontal
  function collection() {
    if (!desktop) return;
    const track = $(".collection__track");
    const cards = $$(".card", track);
    const current = $(".collection__current");
    const distance = () => track.scrollWidth - window.innerWidth;
    const tween = gsap.to(track, {
      x: () => -distance(), ease: "none",
      scrollTrigger: {
        trigger: ".collection", start: "top top", end: () => `+=${distance()}`, pin: ".collection__pin", scrub: 1, invalidateOnRefresh: true,
        onUpdate: (s) => { current.textContent = String(Math.min(cards.length, 1 + Math.floor(s.progress * cards.length))).padStart(2, "0"); },
      },
    });
    cards.forEach((card, i) => {
      gsap.from(card, { yPercent: 12 + (i % 2) * 10, rotate: i % 2 ? 3 : -3, ease: "none", scrollTrigger: { trigger: card, containerAnimation: tween, start: "left right", end: "center center", scrub: true } });
    });
  }

  // ---------------------------------------------------------- Números
  function stats() {
    $$(".stat b").forEach((b) => {
      const end = +b.dataset.count, suffix = b.dataset.suffix || "";
      const o = { v: 0 };
      gsap.to(o, { v: end, duration: 1.8, ease: "power3.out", scrollTrigger: { trigger: b, start: "top 85%" }, onUpdate: () => (b.textContent = Math.round(o.v) + suffix) });
    });
  }

  // ---------------------------------------------------------- Elenco com prévia que segue o cursor
  function roster() {
    const preview = $(".roster__preview");
    const img = $("img", preview);
    gsap.from(".roster__list li", { y: 60, opacity: 0, stagger: 0.08, duration: 1.2, ease: "expo.out", scrollTrigger: { trigger: ".roster__list", start: "top 80%" } });
    if (!desktop) return;
    const xTo = gsap.quickTo(preview, "x", { duration: 0.6, ease: "power3" });
    const yTo = gsap.quickTo(preview, "y", { duration: 0.6, ease: "power3" });
    const rTo = gsap.quickTo(preview, "rotation", { duration: 0.8, ease: "power3" });
    let lastX = 0;
    $(".roster__list").addEventListener("pointermove", (e) => { xTo(e.clientX); yTo(e.clientY); rTo(gsap.utils.clamp(-12, 12, (e.clientX - lastX) * 0.6)); lastX = e.clientX; });
    $$(".roster__list li").forEach((li) => {
      li.addEventListener("pointerenter", () => { img.src = li.dataset.img; gsap.to(preview, { opacity: 1, scale: 1, duration: 0.5, ease: "expo.out" }); });
      li.addEventListener("pointerleave", () => gsap.to(preview, { opacity: 0, scale: 0.6, duration: 0.4, ease: "power2.out" }));
    });
  }

  // ---------------------------------------------------------- Lançamento e rodapé
  function launch() {
    gsap.from(".launch", { clipPath: "inset(20% 8% 20% 8% round 28px)", ease: "power2.out", scrollTrigger: { trigger: ".launch", start: "top 95%", end: "top 40%", scrub: 1 } });
    gsap.from(".footer__tag span", { yPercent: 60, opacity: 0, stagger: 0.12, duration: 1.4, ease: "expo.out", scrollTrigger: { trigger: ".footer__tag", start: "top 85%" } });
    const el = $(".countdown");
    const target = new Date(el.dataset.target).getTime();
    const o = { d: $('[data-cd="d"]'), h: $('[data-cd="h"]'), m: $('[data-cd="m"]'), s: $('[data-cd="s"]') };
    const tick = () => {
      const s = Math.floor(Math.max(0, target - Date.now()) / 1000);
      o.d.textContent = String(Math.floor(s / 86400)).padStart(3, "0");
      o.h.textContent = String(Math.floor((s % 86400) / 3600)).padStart(2, "0");
      o.m.textContent = String(Math.floor((s % 3600) / 60)).padStart(2, "0");
      o.s.textContent = String(s % 60).padStart(2, "0");
    };
    tick(); setInterval(tick, 1000);
  }

  // ---------------------------------------------------------- Navegação ativa
  function navActive() {
    $$(".nav__links a").forEach((a) => {
      const sec = $(a.getAttribute("href"));
      if (sec) ScrollTrigger.create({ trigger: sec, start: "top 50%", end: "bottom 50%", onToggle: (s) => a.classList.toggle("is-active", s.isActive) });
    });
  }

  // ---------------------------------------------------------- Lightbox
  function lightbox() {
    const box = $(".lightbox"), big = $(".lightbox__img");
    const open = (src, alt) => { big.src = src; big.alt = alt || ""; box.classList.add("is-open"); box.setAttribute("aria-hidden", "false"); lenis?.stop(); };
    const close = () => { box.classList.remove("is-open"); box.setAttribute("aria-hidden", "true"); lenis?.start(); };
    $$(".side__img, .card").forEach((el) => el.addEventListener("click", () => { const i = $("img", el); open(i.currentSrc || i.src, i.alt); }));
    $(".lightbox__close").addEventListener("click", close);
    box.addEventListener("click", (e) => { if (e.target === box) close(); });
    document.addEventListener("keydown", (e) => { if (e.key === "Escape") { close(); toggleMenu(false); } });
  }

  function init() {
    window.NeonReveal?.start();
    hero(); ticker(); manifesto(); sides(); collection(); stats(); roster(); launch(); navActive(); lightbox();
    loader();
    window.addEventListener("load", () => ScrollTrigger.refresh());
  }
  const fonts = document.fonts ? Promise.race([document.fonts.ready, new Promise((r) => setTimeout(r, 2500))]) : Promise.resolve();
  fonts.then(init);
})();
