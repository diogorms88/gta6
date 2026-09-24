/* =========================================================
   NEON TIDE — animações de rolagem
   ========================================================= */
(() => {
  const { gsap, ScrollTrigger } = window;
  gsap.registerPlugin(ScrollTrigger);

  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => Array.from(c.querySelectorAll(s));
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  // ---------------------------------------------------------- Rolagem suave
  let lenis = null;
  if (!reduceMotion && window.Lenis) {
    lenis = new window.Lenis({ lerp: 0.09, smoothWheel: true });
    lenis.on("scroll", ScrollTrigger.update);
    gsap.ticker.add((t) => lenis.raf(t * 1000));
    gsap.ticker.lagSmoothing(0);
    lenis.stop();
  }

  const scrollTo = (target) => {
    if (lenis) lenis.scrollTo(target, { offset: 0, duration: 1.6 });
    else document.querySelector(target)?.scrollIntoView({ behavior: "smooth" });
  };

  $$('a[href^="#"]').forEach((a) => {
    a.addEventListener("click", (e) => {
      const id = a.getAttribute("href");
      if (id.length < 2 || !document.querySelector(id)) return;
      e.preventDefault();
      closeMenu();
      scrollTo(id);
    });
  });

  // ---------------------------------------------------------- Utilidades de texto
  function splitWords(el) {
    const words = el.textContent.trim().split(/\s+/);
    el.innerHTML = words.map((w) => `<span class="word">${w}</span>`).join(" ");
    return $$(".word", el);
  }
  function splitChars(el) {
    const text = el.textContent.trim();
    el.setAttribute("aria-label", text);
    el.innerHTML = [...text]
      .map((c) => (c === " " ? " " : `<span class="char-split" aria-hidden="true">${c}</span>`))
      .join("");
    return $$(".char-split", el);
  }

  // ---------------------------------------------------------- Loader
  function runLoader() {
    const tl = gsap.timeline();
    tl.from(".loader__logo span", { yPercent: 110, opacity: 0, stagger: 0.12, duration: 0.9, ease: "expo.out" })
      .to(".loader__bar i", { width: "100%", duration: 1.1, ease: "power2.inOut" }, 0.1)
      .to(".loader", { yPercent: -100, duration: 1.1, ease: "expo.inOut" }, "+=0.15")
      .add(() => {
        document.body.classList.remove("is-loading");
        $(".loader").remove();
        lenis?.start();
        ScrollTrigger.refresh();
      })
      .from(".intro__media", { scale: 1.2, duration: 2, ease: "expo.out" }, "-=0.9")
      .from(".intro__maskText", { opacity: 0, scale: 0.85, svgOrigin: "960 610", duration: 1.6, ease: "expo.out" }, "<")
      .from(".nav", { yPercent: -100, opacity: 0, duration: 1, ease: "expo.out" }, "<0.3")
      .from(".scroll-hint", { opacity: 0, y: 20, duration: 1 }, "<0.2");
    return tl;
  }

  // ---------------------------------------------------------- Intro (máscara)
  function introScene() {
    const maskText = $(".intro__maskText");
    const texts = $$("text", maskText);
    // Ponto do zoom: haste vertical do "E" de NEON (garante que a tela vire "buraco").
    let origin = "960 560";
    try {
      const ext = texts[0].getExtentOfChar(1);
      origin = `${ext.x + ext.width * 0.16} ${ext.y + ext.height * 0.55}`;
    } catch (_) { /* fonte ainda não carregada: usa o centro */ }

    const tl = gsap.timeline({
      scrollTrigger: { trigger: ".intro", start: "top top", end: "bottom bottom", scrub: 1 },
    });
    tl.to(".scroll-hint", { opacity: 0, duration: 0.1 }, 0)
      .fromTo(maskText, { scale: 1, svgOrigin: origin }, { scale: 60, svgOrigin: origin, ease: "power3.in", duration: 1 }, 0)
      .to(".intro__mask", { opacity: 0, duration: 0.15, ease: "none" }, 0.85)
      .fromTo(".intro__media", { scale: 1.25 }, { scale: 1, ease: "power2.out", duration: 1.1 }, 0)
      .to(".intro__shade", { opacity: 1, duration: 0.4 }, 0.95)
      .to(".intro__copy > *", { opacity: 1, duration: 0.01 }, 1)
      .from(".intro__copy .eyebrow", { y: 30, opacity: 0, duration: 0.3 }, 1)
      .from(".intro__headline .line > span", { yPercent: 110, stagger: 0.08, duration: 0.4, ease: "power3.out" }, 1.02)
      .from(".intro__sub", { y: 30, opacity: 0, duration: 0.3 }, 1.2)
      .to({}, { duration: 0.3 });
  }

  // ---------------------------------------------------------- Revelações genéricas
  function reveals() {
    $$(".reveal-lines").forEach((el) => {
      gsap.from($$(".line > span", el), {
        yPercent: 115, rotate: 3, duration: 1.3, stagger: 0.1, ease: "expo.out",
        scrollTrigger: { trigger: el, start: "top 85%" },
      });
    });
    $$(".reveal-up").forEach((el) => {
      gsap.from(el, {
        y: 50, opacity: 0, duration: 1.2, ease: "expo.out",
        scrollTrigger: { trigger: el, start: "top 90%" },
      });
    });
    $$(".split-chars").forEach((el) => {
      const chars = splitChars(el);
      gsap.from(chars, {
        yPercent: 100, opacity: 0, rotateX: -80, transformOrigin: "50% 100%",
        stagger: 0.04, duration: 1.2, ease: "expo.out",
        scrollTrigger: { trigger: el, start: "top 80%" },
      });
    });
    $$(".section-head .eyebrow").forEach((el) => {
      gsap.from(el, { x: -30, opacity: 0, duration: 1, ease: "expo.out", scrollTrigger: { trigger: el, start: "top 90%" } });
    });
  }

  // ---------------------------------------------------------- Frase palavra a palavra
  function statement() {
    const words = splitWords($(".statement__text"));
    gsap.to(words, {
      opacity: 1, stagger: 0.1, ease: "none",
      scrollTrigger: { trigger: ".statement", start: "top 75%", end: "bottom 60%", scrub: true },
    });
  }

  // ---------------------------------------------------------- Personagens
  function characters() {
    $$(".char").forEach((char) => {
      const frame = $(".char__frame", char);
      const img = $("img", frame);
      gsap.to(frame, {
        clipPath: "inset(0% 0% 0% 0% round 6px)", ease: "power2.out",
        scrollTrigger: { trigger: char, start: "top 85%", end: "top 25%", scrub: 1 },
      });
      gsap.to(img, {
        yPercent: 8, scale: 1, ease: "none",
        scrollTrigger: { trigger: char, start: "top bottom", end: "bottom top", scrub: true },
      });
      gsap.from($(".char__index", char), {
        yPercent: 40, opacity: 0, ease: "power2.out",
        scrollTrigger: { trigger: char, start: "top 80%", end: "top 30%", scrub: 1 },
      });
      gsap.from($$(".char__name .line > span", char), {
        yPercent: 110, duration: 1.4, stagger: 0.12, ease: "expo.out",
        scrollTrigger: { trigger: $(".char__name", char), start: "top 85%" },
      });
      gsap.from([$(".char__lede", char), ...$$(".char__body > p:not(.char__lede)", char), $(".char__quote", char)], {
        y: 40, opacity: 0, duration: 1.2, stagger: 0.12, ease: "expo.out",
        scrollTrigger: { trigger: $(".char__lede", char), start: "top 88%" },
      });
      gsap.from($$(".thumb", char), {
        y: 60, opacity: 0, duration: 1.2, stagger: 0.1, ease: "expo.out",
        scrollTrigger: { trigger: $(".char__thumbs", char), start: "top 92%" },
      });
    });
  }

  // ---------------------------------------------------------- Imagem que expande
  function expand() {
    const mobile = window.matchMedia("(max-width: 960px)").matches;
    const tl = gsap.timeline({
      scrollTrigger: { trigger: ".expand", start: "top top", end: "bottom bottom", scrub: 1 },
    });
    tl.fromTo(".expand__frame",
      { clipPath: mobile ? "inset(24% 12% 24% 12% round 12px)" : "inset(22% 30% 22% 30% round 14px)" },
      { clipPath: "inset(0% 0% 0% 0% round 0px)", ease: "power2.inOut", duration: 1 }, 0)
      .fromTo(".expand__frame img", { scale: 1.35 }, { scale: 1, ease: "power2.inOut", duration: 1 }, 0)
      .to(".expand__frame", { "--shade": 1, duration: 0.4 }, 0.7)
      .fromTo(".expand__copy", { opacity: 0, y: 60 }, { opacity: 1, y: 0, duration: 0.4 }, 0.8)
      .to({}, { duration: 0.4 });
  }

  // ---------------------------------------------------------- Marquee
  function marquee() {
    const track = $(".marquee__track");
    const half = () => track.scrollWidth / 2;
    let x = 0;
    let speed = 1;
    gsap.ticker.add((_, dt) => {
      x -= (0.06 * dt) * speed;
      if (-x >= half()) x += half();
      if (x > 0) x -= half();
      gsap.set(track, { x });
    });
    ScrollTrigger.create({
      trigger: ".marquee", start: "top bottom", end: "bottom top",
      onUpdate: (self) => {
        speed = 1 + Math.min(Math.abs(self.getVelocity()) / 300, 8);
        gsap.to({}, { duration: 0.6, onComplete: () => (speed = 1) });
      },
    });
  }

  // ---------------------------------------------------------- Locais (horizontal)
  function places() {
    const mm = gsap.matchMedia();
    mm.add("(min-width: 961px)", () => {
      const track = $(".places__track");
      const distance = () => track.scrollWidth - window.innerWidth + $(".places__head").offsetWidth;
      const tween = gsap.to(track, {
        x: () => -distance(), ease: "none",
        scrollTrigger: {
          trigger: ".places", start: "top top", end: () => `+=${distance()}`,
          pin: ".places__pin", scrub: 1, invalidateOnRefresh: true, anticipatePin: 1,
        },
      });
      gsap.to(".places__progress i", {
        scaleX: 1, ease: "none",
        scrollTrigger: { trigger: ".places", start: "top top", end: () => `+=${distance()}`, scrub: true },
      });
      $$(".place").forEach((place) => {
        gsap.to($("img", place), {
          scale: 1, ease: "none",
          scrollTrigger: { trigger: place, containerAnimation: tween, start: "left right", end: "right left", scrub: true },
        });
        gsap.from($(".place__info", place), {
          y: 40, opacity: 0, ease: "power2.out",
          scrollTrigger: { trigger: place, containerAnimation: tween, start: "left 85%", end: "left 50%", scrub: true },
        });
      });
    });
    mm.add("(max-width: 960px)", () => {
      $$(".place").forEach((place) => {
        gsap.from(place, { y: 60, opacity: 0, duration: 1.2, ease: "expo.out", scrollTrigger: { trigger: place, start: "top 88%" } });
        gsap.to($("img", place), { scale: 1, ease: "none", scrollTrigger: { trigger: place, start: "top bottom", end: "bottom top", scrub: true } });
      });
    });
  }

  // ---------------------------------------------------------- Parallax
  function parallax() {
    gsap.fromTo(".parallax__bg", { yPercent: -12 }, {
      yPercent: 12, ease: "none",
      scrollTrigger: { trigger: ".parallax", start: "top bottom", end: "bottom top", scrub: true },
    });
    gsap.fromTo(".parallax__copy", { yPercent: 30 }, {
      yPercent: -30, ease: "none",
      scrollTrigger: { trigger: ".parallax", start: "top bottom", end: "bottom top", scrub: true },
    });
    gsap.fromTo(".launch__bg img", { scale: 1.25 }, {
      scale: 1, ease: "none",
      scrollTrigger: { trigger: ".launch", start: "top bottom", end: "bottom bottom", scrub: true },
    });
  }

  // ---------------------------------------------------------- Galeria e trailers
  function gallery() {
    ScrollTrigger.batch(".g-item", {
      start: "top 92%",
      onEnter: (items) =>
        gsap.fromTo(items, { y: 80, opacity: 0, scale: 0.94 }, { y: 0, opacity: 1, scale: 1, stagger: 0.1, duration: 1.3, ease: "expo.out", overwrite: true }),
    });
    gsap.set(".g-item", { opacity: 0 });
    $$(".trailer").forEach((t, i) => {
      gsap.from(t, {
        y: 80, opacity: 0, duration: 1.3, delay: i * 0.12, ease: "expo.out",
        scrollTrigger: { trigger: t, start: "top 90%" },
      });
    });
  }

  // ---------------------------------------------------------- Navegação
  const nav = $(".nav");
  const burger = $(".nav__burger");
  function closeMenu() {
    document.body.classList.remove("menu-open");
    burger.setAttribute("aria-expanded", "false");
    $(".menu").setAttribute("aria-hidden", "true");
  }
  burger.addEventListener("click", () => {
    const open = document.body.classList.toggle("menu-open");
    burger.setAttribute("aria-expanded", String(open));
    $(".menu").setAttribute("aria-hidden", String(!open));
    if (open) {
      gsap.fromTo(".menu a", { yPercent: 100, opacity: 0 }, { yPercent: 0, opacity: 1, stagger: 0.06, duration: 0.9, ease: "expo.out", delay: 0.15 });
    }
  });

  function navBehaviour() {
    ScrollTrigger.create({
      start: 0, end: "max",
      onUpdate: (self) => {
        const y = self.scroll();
        nav.classList.toggle("is-scrolled", y > 80);
        nav.classList.toggle("is-hidden", self.direction === 1 && y > window.innerHeight * 0.8 && !document.body.classList.contains("menu-open"));
      },
    });
    $$(".nav__links a").forEach((a) => {
      const sec = $(a.getAttribute("href"));
      if (!sec) return;
      ScrollTrigger.create({
        trigger: sec, start: "top 50%", end: "bottom 50%",
        onToggle: (self) => a.classList.toggle("is-active", self.isActive),
      });
    });
  }

  // ---------------------------------------------------------- Lightbox
  function lightbox() {
    const box = $(".lightbox");
    const img = $(".lightbox__img");
    const count = $(".lightbox__count");
    const items = $$("[data-full]");
    let index = 0;

    const show = (i) => {
      index = (i + items.length) % items.length;
      const item = items[index];
      gsap.fromTo(img, { opacity: 0, x: 30 }, { opacity: 1, x: 0, duration: 0.6, ease: "expo.out" });
      img.src = item.dataset.full;
      img.alt = $("img", item)?.alt || "";
      count.textContent = `${String(index + 1).padStart(2, "0")} / ${String(items.length).padStart(2, "0")}`;
    };
    const open = (i) => {
      show(i);
      box.classList.add("is-open");
      box.setAttribute("aria-hidden", "false");
      lenis?.stop();
    };
    const close = () => {
      box.classList.remove("is-open");
      box.setAttribute("aria-hidden", "true");
      lenis?.start();
    };
    items.forEach((it, i) => it.addEventListener("click", () => open(i)));
    $(".lightbox__close").addEventListener("click", close);
    $(".lightbox__prev").addEventListener("click", () => show(index - 1));
    $(".lightbox__next").addEventListener("click", () => show(index + 1));
    box.addEventListener("click", (e) => { if (e.target === box) close(); });
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") { close(); closeMenu(); }
      if (!box.classList.contains("is-open")) return;
      if (e.key === "ArrowLeft") show(index - 1);
      if (e.key === "ArrowRight") show(index + 1);
    });
  }

  // ---------------------------------------------------------- Contagem regressiva
  function countdown() {
    const el = $(".countdown");
    const target = new Date(el.dataset.target).getTime();
    const out = { d: $('[data-cd="d"]'), h: $('[data-cd="h"]'), m: $('[data-cd="m"]'), s: $('[data-cd="s"]') };
    const tick = () => {
      const diff = Math.max(0, target - Date.now());
      const s = Math.floor(diff / 1000);
      out.d.textContent = String(Math.floor(s / 86400)).padStart(3, "0");
      out.h.textContent = String(Math.floor((s % 86400) / 3600)).padStart(2, "0");
      out.m.textContent = String(Math.floor((s % 3600) / 60)).padStart(2, "0");
      out.s.textContent = String(s % 60).padStart(2, "0");
    };
    tick();
    setInterval(tick, 1000);
  }

  // ---------------------------------------------------------- Início
  function init() {
    introScene();
    statement();
    reveals();
    characters();
    expand();
    marquee();
    places();
    parallax();
    gallery();
    navBehaviour();
    lightbox();
    countdown();
    runLoader();
    window.addEventListener("load", () => ScrollTrigger.refresh());
  }

  // Espera a fonte do título para medir a máscara corretamente.
  const fontsReady = document.fonts ? Promise.race([document.fonts.ready, new Promise((r) => setTimeout(r, 2500))]) : Promise.resolve();
  fontsReady.then(init);
})();
