/* Dr. Yethindra Vityala — interactions
   Lenis smooth scroll + GSAP ScrollTrigger. Every feature is guarded so a page
   only runs what it contains. Reduced-motion users get static, readable pages. */
(() => {
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const root = document.documentElement;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const hasGSAP = !!window.gsap && !!window.ScrollTrigger;
  root.classList.remove('no-js');
  if (reduced || !hasGSAP) root.classList.add('reduced');
  if (hasGSAP) gsap.registerPlugin(ScrollTrigger);

  /* ---------- smooth scroll ---------- */
  let lenis = null;
  if (!reduced && window.Lenis) {
    lenis = new Lenis({ lerp: 0.1, smoothWheel: true });
    if (hasGSAP) {
      lenis.on('scroll', ScrollTrigger.update);
      gsap.ticker.add((t) => lenis.raf(t * 1000));
      gsap.ticker.lagSmoothing(0);
    } else {
      const raf = (t) => { lenis.raf(t); requestAnimationFrame(raf); };
      requestAnimationFrame(raf);
    }
  }
  $$('a[href^="#"]').forEach((a) => a.addEventListener('click', (e) => {
    const t = $(a.getAttribute('href'));
    if (!t) return;
    e.preventDefault();
    lenis ? lenis.scrollTo(t, { offset: -70 }) : t.scrollIntoView({ behavior: 'smooth' });
  }));

  /* ---------- top bar ---------- */
  const bar = $('.topbar');
  if (bar) {
    let last = 0;
    const darkSecs = $$('[data-dark]');
    const onScroll = () => {
      const y = scrollY;
      bar.classList.toggle('is-scrolled', y > 40);
      bar.classList.toggle('is-hidden', y > 300 && y > last && !document.body.classList.contains('menu-open'));
      last = y;
      const probe = 30;
      bar.classList.toggle('on-dark', darkSecs.some((s) => { const r = s.getBoundingClientRect(); return r.top <= probe && r.bottom >= probe; }));
    };
    addEventListener('scroll', onScroll, { passive: true });
    onScroll();
  }

  /* ---------- drawer menu ---------- */
  const drawer = $('.drawer');
  const openMenu = (open) => {
    if (!drawer) return;
    drawer.classList.toggle('is-open', open);
    drawer.setAttribute('aria-hidden', String(!open));
    document.body.classList.toggle('menu-open', open);
    $('.menu-btn')?.setAttribute('aria-expanded', String(open));
    open ? lenis?.stop() : lenis?.start();
    if (open) $('.drawer nav a')?.focus();
  };
  $('.menu-btn')?.addEventListener('click', () => openMenu(true));
  $('.drawer-close')?.addEventListener('click', () => openMenu(false));
  $$('.drawer a').forEach((a) => a.addEventListener('click', () => openMenu(false)));

  /* ---------- toast ---------- */
  const toast = (msg) => {
    let t = $('.toast');
    if (!t) { t = document.createElement('div'); t.className = 'toast'; t.setAttribute('role', 'status'); document.body.appendChild(t); }
    t.textContent = msg; t.classList.add('on');
    clearTimeout(t._h); t._h = setTimeout(() => t.classList.remove('on'), 2200);
  };
  const copy = async (text) => {
    try { await navigator.clipboard.writeText(text); }
    catch { const ta = document.createElement('textarea'); ta.value = text; document.body.appendChild(ta); ta.select(); document.execCommand('copy'); ta.remove(); }
  };

  function heroIn() {
    if (!hasGSAP || reduced) return;
    const lines = $$('.hero-name .line > span, .phero h1 .split-line > span');
    if (lines.length) gsap.from(lines, { yPercent: 110, duration: 1.2, ease: 'expo.out', stagger: 0.08 });
    const photo = $('.hero-bg img');
    if (photo) gsap.from(photo, { scale: 1.08, duration: 2, ease: 'expo.out' });
    gsap.from('.hero-left, .hero-right, .phero-grid > *, .phero .crumb', { y: 24, opacity: 0, duration: 1, ease: 'power3.out', stagger: 0.06, delay: 0.25 });
  }
  heroIn();

  if (!hasGSAP || reduced) { initStatic(); return; }

  /* ---------- reveal on scroll ---------- */
  ScrollTrigger.batch('[data-reveal]', {
    start: 'top 88%', once: true,
    onEnter: (els) => gsap.to(els, { opacity: 1, y: 0, duration: 1, ease: 'power3.out', stagger: 0.08, overwrite: true }),
  });

  /* ---------- word-by-word reveal statement ---------- */
  $$('.reveal-text').forEach((el) => {
    const walk = (node) => {
      [...node.childNodes].forEach((n) => {
        if (n.nodeType === 3) {
          const frag = document.createDocumentFragment();
          n.textContent.split(/(\s+)/).forEach((part) => {
            if (!part) return;
            if (/^\s+$/.test(part)) frag.appendChild(document.createTextNode(part));
            else { const s = document.createElement('span'); s.className = 'w' + (node.tagName === 'EM' ? ' hl' : ''); s.textContent = part; frag.appendChild(s); }
          });
          n.replaceWith(frag);
        } else if (n.nodeType === 1) walk(n);
      });
    };
    walk(el);
    const words = $$('.w', el);
    ScrollTrigger.create({
      trigger: el, start: 'top 80%', end: 'bottom 45%', scrub: true,
      onUpdate: (st) => { const n = Math.round(st.progress * words.length); words.forEach((w, i) => w.classList.toggle('on', i < n)); },
    });
  });

  /* ---------- count-up numbers ---------- */
  $$('[data-count]').forEach((el) => {
    const end = parseFloat(el.dataset.count);
    const o = { v: 0 };
    ScrollTrigger.create({
      trigger: el, start: 'top 90%', once: true,
      onEnter: () => gsap.to(o, { v: end, duration: 2, ease: 'power3.out', onUpdate: () => { el.textContent = Math.round(o.v).toLocaleString('en-IN'); } }),
    });
  });

  /* ---------- big portrait: clip reveal from the bottom, image settles from a zoom ---------- */
  $$('[data-clip-reveal] .ip-frame').forEach((f) => {
    const img = $('img', f);
    gsap.fromTo(f, { clipPath: 'inset(100% 0 0 0)' }, { clipPath: 'inset(0% 0 0 0)', ease: 'none', scrollTrigger: { trigger: f, start: 'top 95%', end: 'top 55%', scrub: true } });
    gsap.fromTo(img, { scale: 1.1 }, { scale: 1.0, ease: 'none', scrollTrigger: { trigger: f, start: 'top bottom', end: 'bottom top', scrub: true } });
  });

  /* ---------- polaroid parallax ---------- */
  $$('[data-parallax]').forEach((el) => {
    gsap.fromTo(el, { y: 60 }, { y: -60, ease: 'none', scrollTrigger: { trigger: el, start: 'top bottom', end: 'bottom top', scrub: true } });
  });

  /* ---------- ECG heartbeat timeline ---------- */
  const ecg = $('.ecg-sec');
  if (ecg && matchMedia('(min-width: 861px)').matches) {
    const track = $('.ecg-track', ecg);
    const svg = $('.ecg-svg', ecg);
    const nodes = $$('.ecg-node', ecg);
    const H = track.clientHeight, mid = H * 0.5, gap = Math.max(300, Math.min(380, innerWidth * 0.24));
    const startX = innerWidth * 0.42;
    const lastX = startX + (nodes.length - 1) * gap;
    const PEN = 0.62; // the "pen" sits at 62% of the screen; everything left of it is drawn
    const W = lastX + innerWidth * (1 - PEN) + 120;
    track.style.width = W + 'px';
    svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
    svg.setAttribute('width', W);
    // build the ECG: flat baseline with a QRS complex at each milestone
    let d = `M0 ${mid}`;
    const xs = nodes.map((_, i) => startX + i * gap);
    let x = 0;
    xs.forEach((nx, i) => {
      // small p-waves between spikes for a real trace feel
      for (let px = x + 60; px < nx - 70; px += 110) d += ` L${px} ${mid} q 14 -14 28 0`;
      const amp = i % 2 ? 0.38 : 0.48;
      d += ` L${nx - 30} ${mid} L${nx - 18} ${mid + 14} L${nx - 6} ${mid - H * amp} L${nx + 8} ${mid + H * 0.3} L${nx + 20} ${mid} q 22 -22 44 0`;
      x = nx + 64;
      const n = nodes[i];
      // pin the dot to the exact tip: the peak (up) or the trough (down) of this spike
      n.style.left = (i % 2 ? nx + 8 : nx - 6) + 'px';
      n.style.top = (i % 2 ? mid + H * 0.3 : mid - H * amp) + 'px';
      n.classList.add(i % 2 ? 'down' : 'up');
    });
    d += ` L${W} ${mid}`;
    $$('path', svg).forEach((p) => p.setAttribute('d', d));
    // the drawn trace is revealed by a clip rect that ends exactly at the pen, so line, cards and year stay in sync
    const NS = 'http://www.w3.org/2000/svg';
    const clip = document.createElementNS(NS, 'clipPath'); clip.id = 'ecg-clip';
    const rect = document.createElementNS(NS, 'rect'); rect.setAttribute('x', 0); rect.setAttribute('y', -H); rect.setAttribute('height', H * 3); rect.setAttribute('width', 0);
    clip.appendChild(rect); svg.appendChild(clip);
    const live = $('.live', svg);
    live.setAttribute('clip-path', 'url(#ecg-clip)');
    const head = document.createElementNS(NS, 'circle'); head.setAttribute('r', 5); head.setAttribute('class', 'pen'); svg.appendChild(head);
    const yearEl = $('.ecg-bpm', ecg);
    const yearTxt = document.createTextNode(''); if (yearEl) { yearEl.lastChild.remove?.(); yearEl.appendChild(yearTxt); }
    const years = nodes.map((n) => $('.yr', n).textContent);
    const shift = W - innerWidth;
    const bar = $('.ecg-progress .bar i', ecg);
    // x -> y lookup along the trace so the pen dot rides the line through every spike
    const yAt = new Float32Array(Math.ceil(W) + 2).fill(mid);
    for (let l = 0, L = live.getTotalLength(); l <= L; l += 2) { const pt = live.getPointAtLength(l); yAt[Math.round(pt.x)] = pt.y; }
    let shown = -1;
    const render = (p) => {
      gsap.set(track, { x: -shift * p });
      const pen = shift * p + innerWidth * PEN;
      rect.setAttribute('width', pen);
      head.setAttribute('cx', pen);
      head.setAttribute('cy', yAt[Math.round(pen)] ?? mid);
      bar.style.transform = `scaleX(${p})`;
      let last = -1;
      nodes.forEach((n, i) => { const on = xs[i] <= pen; n.classList.toggle('on', on); if (on) last = i; });
      if (last !== shown) { shown = last; yearTxt.textContent = last >= 0 ? years[last] : years[0]; }
    };
    ScrollTrigger.create({
      trigger: ecg, pin: $('.ecg-pin', ecg), start: 'top top', end: () => '+=' + Math.round(shift * 1.1),
      invalidateOnRefresh: true, onUpdate: (st) => render(st.progress),
    });
    render(0);
  }

  /* ---------- diagonal cobalt wipe ---------- */
  $$('.wipe').forEach((w) => {
    const panel = $('.wipe-panel', w);
    const o = { p: 0 };
    gsap.to(o, {
      p: 1, ease: 'none',
      scrollTrigger: { trigger: w, start: 'top top', end: '+=100%', scrub: true, pin: true },
      onUpdate: () => {
        // a diagonal edge sweeping from bottom-right to top-left, fully covered at the end of the pin
        const p = o.p * 160;
        panel.style.clipPath = `polygon(${100 - p + 60}% 0, 100% 0, 100% 100%, ${100 - p}% 100%)`;
      },
    });
  });

  /* ---------- section headline line reveals ---------- */
  $$('[data-lines]').forEach((h) => {
    gsap.from($$('.split-line > span', h), { yPercent: 110, duration: 1.1, ease: 'expo.out', stagger: 0.08, scrollTrigger: { trigger: h, start: 'top 85%', once: true } });
  });

  /* ---------- periodic table entrance ---------- */
  $$('.ptable').forEach((t) => {
    const faces = $$('.el:not(.el--gap) .el-face', t);
    gsap.set(faces, { opacity: 0, rotateX: -70, y: 30, transformOrigin: '50% 0%' });
    ScrollTrigger.create({
      trigger: t, start: 'top 85%', once: true,
      onEnter: () => gsap.to(faces, { opacity: 1, rotateX: 0, y: 0, duration: 0.8, ease: 'power3.out', stagger: 0.018, clearProps: 'opacity,transform' }),
    });
  });

  initStatic();

  /* ======================================================================
     Features that work with or without GSAP
     ====================================================================== */
  function initStatic() {
    initHero();
    initRowsPreview();
    initPeriodicTable();
    initLibrary();
    initTheatre();
    initAccordion();
    initContactWords();
    initForm();
    $$('.marquee-track').forEach((t) => { if (!t.dataset.dup) { t.innerHTML += t.innerHTML; t.dataset.dup = 1; } });
    if (reduced || !hasGSAP) $$('[data-count]').forEach((el) => { el.textContent = Number(el.dataset.count).toLocaleString('en-IN'); });
  }

  /* hero: letters that thicken toward the cursor and a live ECG whose pulse rises with
     cursor speed. Idles into an automatic wave on touch. */
  function initHero() {
    const hero = $('.hero');
    if (!hero || reduced) return;
    const name = $('.hero-name', hero);
    const photo = $('.hero-bg img', hero);
    const canvas = $('.hero-ecg', hero);
    const bpmEl = $('.hero-bpm b', hero);
    const fine = matchMedia('(hover: hover) and (pointer: fine)').matches;

    // split the name into letters (leave the handwritten "Dr." alone)
    const chars = [];
    $$('.line > span', name).forEach((lineSpan, li) => {
      const walk = (node) => [...node.childNodes].forEach((n) => {
        if (n.nodeType === 3) {
          const frag = document.createDocumentFragment();
          [...n.textContent].forEach((c) => {
            const s = document.createElement('span'); s.className = 'ch'; s.textContent = c;
            s._line = li; s._w = li ? 800 : 250; s._d = li ? 112 : 100;
            frag.appendChild(s); chars.push(s);
          });
          n.replaceWith(frag);
        } else if (n.nodeType === 1 && !n.classList.contains('dr')) walk(n);
      });
      walk(lineSpan);
    });
    name.setAttribute('aria-label', name.textContent.replace(/\s+/g, ' ').trim());
    let centers = [];
    const measure = () => { centers = chars.map((c) => { const r = c.getBoundingClientRect(); return [r.left + r.width / 2, r.top + r.height / 2 + scrollY]; }); };
    measure();
    document.fonts?.ready.then(measure);
    addEventListener('resize', () => { name.style.fontSize = ''; measure(); });
    [1800, 5200].forEach((t) => setTimeout(measure, t)); // after the intro and entrance settle

    let px = -9999, py = -9999, lastMove = 0, speed = 0, lx = 0, ly = 0, lt = performance.now();
    hero.addEventListener('pointermove', (e) => {
      const now = performance.now(), dt = Math.max(8, now - lt);
      const v = Math.hypot(e.clientX - lx, e.clientY - ly) / dt * 1000;
      speed = speed * 0.8 + v * 0.2;
      lx = e.clientX; ly = e.clientY; lt = now;
      px = e.clientX; py = e.clientY + scrollY; lastMove = now;
      // portrait parallax
      const r = hero.getBoundingClientRect();
      if (photo && fine) photo.style.translate = `${((e.clientX - r.left) / r.width - 0.5) * -18}px ${((e.clientY - r.top) / r.height - 0.5) * -10}px`;
    });
    hero.addEventListener('pointerleave', () => { lastMove = 0; });

    // live ECG (sweep monitor)
    const ctx = canvas?.getContext('2d');
    let buf = null, head = 0, phase = 0, bpm = 68, W = 0, Hc = 0, dpr = 1;
    const sizeCanvas = () => {
      if (!canvas) return;
      dpr = Math.min(2, devicePixelRatio || 1);
      W = canvas.clientWidth; Hc = canvas.clientHeight;
      canvas.width = W * dpr; canvas.height = Hc * dpr;
      buf = new Float32Array(Math.ceil(W)).fill(NaN); head = 0;
    };
    sizeCanvas(); addEventListener('resize', sizeCanvas);
    const g = (t, c, w) => Math.exp(-(((t - c) / w) ** 2));
    const wave = (t) => 0.1 * g(t, 0.14, 0.025) - 0.16 * g(t, 0.225, 0.008) + g(t, 0.25, 0.011) - 0.32 * g(t, 0.276, 0.01) + 0.24 * g(t, 0.45, 0.04);

    let visible = true, raf = 0, prev = performance.now(), auto = 0;
    new IntersectionObserver(([en]) => { visible = en.isIntersecting; if (visible && !raf) { prev = performance.now(); raf = requestAnimationFrame(tick); } }).observe(hero);
    function tick(now) {
      raf = 0;
      if (!visible) return;
      const dt = Math.min(0.05, (now - prev) / 1000); prev = now;
      const idle = now - lastMove > 2200;

      // letters: a virtual cursor sweeps the name when the visitor is idle or on touch
      let cx = px, cy = py;
      if (idle) {
        auto += dt;
        const nr = name.getBoundingClientRect();
        cx = nr.left + nr.width * (0.5 + 0.48 * Math.sin(auto * 0.7));
        cy = nr.top + scrollY + nr.height * (0.5 + 0.35 * Math.sin(auto * 1.3));
      }
      const R = Math.max(140, innerWidth * 0.13);
      chars.forEach((c, i) => {
        const [x, y] = centers[i] || [0, 0];
        const f = Math.exp(-(((x - cx) ** 2 + (y - cy) ** 2) / (R * R)));
        const tw = c._line ? 800 - 600 * f : 250 + 620 * f;
        // only the weight swells; the light line never widens, so the name keeps its width
        const td = c._line ? 112 - 24 * f : 100;
        c._w += (tw - c._w) * 0.14; c._d += (td - c._d) * 0.14;
        c.style.setProperty('--w', c._w.toFixed(1));
        c.style.setProperty('--d', c._d.toFixed(1));
      });
      // safety: if the name would ever run past the screen edge, step the size down until it fits
      if (name.scrollWidth > name.clientWidth + 1) name.style.fontSize = parseFloat(getComputedStyle(name).fontSize) * 0.985 + 'px';

      // pulse: cursor speed raises the heart rate, it settles back when still
      speed *= 0.94;
      const target = 68 + Math.min(92, speed * 0.045);
      bpm += (target - bpm) * (target > bpm ? 0.08 : 0.012);
      if (bpmEl) { bpmEl.textContent = Math.round(bpm); bpmEl.parentElement.style.setProperty('--beat', (60 / bpm).toFixed(2) + 's'); }
      if (ctx && buf) {
        const sweep = Math.max(180, W * 0.16) * dt;
        const amp = Hc * 0.36 * (1 + (bpm - 68) / 160);
        for (let s = 0; s < sweep; s++) {
          phase = (phase + (bpm / 60) * (dt / sweep)) % 1;
          buf[head] = wave(phase) * amp;
          head = (head + 1) % buf.length;
          for (let k = 1; k < 26; k++) buf[(head + k) % buf.length] = NaN; // the gap ahead of the pen
        }
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        ctx.clearRect(0, 0, W, Hc);
        const mid = Hc * 0.62;
        ctx.lineWidth = 1.6; ctx.lineJoin = 'round'; ctx.strokeStyle = 'rgba(226, 65, 46, 0.55)';
        ctx.beginPath();
        let pen = false;
        for (let x = 0; x < buf.length; x++) {
          const v = buf[x];
          if (Number.isNaN(v)) { pen = false; continue; }
          pen ? ctx.lineTo(x, mid - v) : ctx.moveTo(x, mid - v); pen = true;
        }
        ctx.stroke();
        const hx = (head - 1 + buf.length) % buf.length, hy = mid - (buf[hx] || 0);
        ctx.fillStyle = '#e2412e'; ctx.shadowColor = 'rgba(226,65,46,0.9)'; ctx.shadowBlur = 12;
        ctx.beginPath(); ctx.arc(hx, hy, 3.2, 0, Math.PI * 2); ctx.fill(); ctx.shadowBlur = 0;
      }
      raf = requestAnimationFrame(tick);
    }
    raf = requestAnimationFrame(tick);
  }

  /* hover preview card that follows the cursor on list rows */
  function initRowsPreview() {
    const rows = $$('[data-preview]');
    if (!rows.length || matchMedia('(hover: none)').matches) return;
    const card = document.createElement('div');
    card.className = 'hover-preview';
    card.setAttribute('aria-hidden', 'true');
    document.body.appendChild(card);
    let x = 0, y = 0, cx = 0, cy = 0, raf;
    const loop = () => { cx += (x - cx) * 0.18; cy += (y - cy) * 0.18; card.style.left = cx + 'px'; card.style.top = cy + 'px'; raf = requestAnimationFrame(loop); };
    rows.forEach((r) => {
      r.addEventListener('mouseenter', (e) => {
        card.innerHTML = `<div class="k">${r.dataset.previewK || ''}</div><p>${r.dataset.preview}</p>`;
        cx = x = e.clientX + 170; cy = y = e.clientY;
        card.classList.add('on'); cancelAnimationFrame(raf); loop();
      });
      r.addEventListener('mousemove', (e) => { x = Math.min(e.clientX + 170, innerWidth - 150); y = e.clientY; });
      r.addEventListener('mouseleave', () => { card.classList.remove('on'); cancelAnimationFrame(raf); });
    });
  }

  /* periodic table: filter + flip-open detail */
  function initPeriodicTable() {
    const tables = $$('.ptable');
    if (!tables.length) return;
    const data = window.__HONOURS || [];
    const modal = $('.eld');
    $$('.pt-legend button').forEach((b) => b.addEventListener('click', () => {
      const group = b.closest('.pt-legend');
      const was = b.getAttribute('aria-pressed') === 'true';
      $$('button', group).forEach((x) => x.setAttribute('aria-pressed', 'false'));
      const f = was ? 'all' : b.dataset.filter;
      $$('[data-filter="' + f + '"]', group).forEach((x) => x.setAttribute('aria-pressed', 'true'));
      const table = $(group.dataset.for) || tables[0];
      $$('.el:not(.el--gap)', table).forEach((el) => el.classList.toggle('is-dim', f !== 'all' && el.dataset.cat !== f));
    }));
    // live inspector + cursor spotlight / tilt / glow
    const fine = matchMedia('(hover: hover) and (pointer: fine)').matches;
    tables.forEach((table) => {
      const insp = $('.pt-inspect', table);
      let cur = 0;
      const show = (i) => {
        const h = data[i]; if (!h || !insp || i === cur) return;
        cur = i;
        const tile = $('.pti-tile', insp);
        tile.className = 'pti-tile el--' + h.cat;
        tile.innerHTML = `<span class="n"><b>${h.no}</b><span>${h.year || '—'}</span></span><span class="sym">${h.sym}</span><span class="cat">${h.catLabel}</span>`;
        $('.pti-k', insp).textContent = h.catLabel + (h.year ? ' · ' + h.year : '');
        $('.pti-t', insp).textContent = h.title;
        $('.pti-s', insp).textContent = (h.tags || []).join(' · ');
        $('.pti-hint', insp).textContent = (h.desc ? h.desc.slice(0, 150) + (h.desc.length > 150 ? '…' : '') + ' ' : '') + 'Click to open.';
        tile.animate([{ transform: 'perspective(600px) rotateX(-70deg)', opacity: 0.3 }, { transform: 'perspective(600px) rotateX(0)', opacity: 1 }], { duration: 420, easing: 'cubic-bezier(.22,1,.36,1)' });
      };
      $$('.el:not(.el--gap)', table).forEach((el) => {
        const face = $('.el-face', el);
        el.addEventListener('pointerenter', () => { show(+el.dataset.i); $$('.el.is-active', table).forEach((x) => x.classList.remove('is-active')); });
        el.addEventListener('focus', () => show(+el.dataset.i));
        if (!fine) return;
        el.addEventListener('pointermove', (e) => {
          const r = el.getBoundingClientRect();
          const x = (e.clientX - r.left) / r.width, y = (e.clientY - r.top) / r.height;
          face.style.setProperty('--mx', x * 100 + '%');
          face.style.setProperty('--my', y * 100 + '%');
          face.style.setProperty('--rx', ((0.5 - y) * 16).toFixed(2) + 'deg');
          face.style.setProperty('--ry', ((x - 0.5) * 18).toFixed(2) + 'deg');
          face.style.setProperty('--sx', ((x - 0.5) * 6).toFixed(1) + 'px');
        });
        el.addEventListener('pointerleave', () => { face.style.setProperty('--rx', '0deg'); face.style.setProperty('--ry', '0deg'); });
      });
      if (fine) {
        table.addEventListener('pointermove', (e) => {
          const r = table.getBoundingClientRect();
          table.style.setProperty('--tx', e.clientX - r.left + 30 + 'px');
          table.style.setProperty('--ty', e.clientY - r.top + 30 + 'px');
          table.classList.add('is-live');
        });
        table.addEventListener('pointerleave', () => table.classList.remove('is-live'));
      }
      cur = -1; show(0);
    });

    if (!modal) return;
    let idx = 0, lastFocus = null;
    const visible = () => $$('.el:not(.el--gap):not(.is-dim)').map((e) => +e.dataset.i);
    const render = (i) => {
      const h = data[i]; if (!h) return;
      idx = i;
      const tile = $('.eld-tile', modal);
      tile.className = 'eld-tile el--' + h.cat;
      tile.style.background = getComputedStyle(document.querySelector('.el--' + h.cat) || document.body).getPropertyValue('--bg');
      tile.style.color = getComputedStyle(document.querySelector('.el--' + h.cat) || document.body).getPropertyValue('--fg');
      tile.innerHTML = `<div class="n"><span>${h.no}</span><span>${h.year || ''}</span></div><div class="sym">${h.sym}</div><div class="cat">${h.catLabel}</div>`;
      const body = $('.eld-body', modal);
      body.innerHTML = `
        <div class="kicker"><i></i>${h.catLabel}${h.year ? ' · ' + h.year : ''}</div>
        <h3 id="eld-title">${h.title}</h3>
        <div class="meta">${(h.tags || []).map((t) => `<span class="tag">${t}</span>`).join('')}</div>
        ${h.desc ? `<p>${h.desc}</p>` : ''}
        ${h.img ? `<figure><img src="${h.img}" alt="${h.title} — certificate or photo" loading="lazy"></figure>` : ''}
        <div class="eld-nav"><button class="pill pill--ghost" data-step="-1">← Previous</button><button class="pill pill--ghost" data-step="1">Next →</button></div>`;
      $$('[data-step]', body).forEach((b) => b.addEventListener('click', () => {
        const v = visible(); const p = v.indexOf(idx);
        const n = v[(p + +b.dataset.step + v.length) % v.length];
        const card = $('.eld-card', modal);
        card.animate([{ transform: 'perspective(1400px) rotateY(0)' }, { transform: `perspective(1400px) rotateY(${b.dataset.step > 0 ? -90 : 90}deg)` }], { duration: 220, easing: 'ease-in' })
          .onfinish = () => { render(n); card.animate([{ transform: `perspective(1400px) rotateY(${b.dataset.step > 0 ? 90 : -90}deg)` }, { transform: 'perspective(1400px) rotateY(0)' }], { duration: 320, easing: 'cubic-bezier(.22,1,.36,1)' }); };
      }));
    };
    const open = (i) => { lastFocus = document.activeElement; render(i); modal.classList.add('is-open'); modal.setAttribute('aria-hidden', 'false'); lenis?.stop(); $('.eld-close', modal).focus(); };
    const close = () => { modal.classList.remove('is-open'); modal.setAttribute('aria-hidden', 'true'); lenis?.start(); lastFocus?.focus(); };
    $$('.el:not(.el--gap)').forEach((el) => el.addEventListener('click', () => open(+el.dataset.i)));
    $('.eld-close', modal).addEventListener('click', close);
    $('.eld-bg', modal).addEventListener('click', close);
    addEventListener('keydown', (e) => {
      if (!modal.classList.contains('is-open')) return;
      if (e.key === 'Escape') close();
      if (e.key === 'ArrowRight') $('[data-step="1"]', modal)?.click();
      if (e.key === 'ArrowLeft') $('[data-step="-1"]', modal)?.click();
    });
  }

  /* research library: search, topic chips, cite */
  function initLibrary() {
    const lib = $('.library');
    if (!lib) return;
    const rows = $$('.paper-row', lib);
    const input = $('.search input');
    const count = $('.lib-count');
    const empty = $('.empty', lib);
    let topic = 'all', type = 'all';
    rows.forEach((r) => { const h = $('h3', r); r._title = h.textContent; r._hay = r.textContent.toLowerCase(); });
    const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const apply = () => {
      const q = (input?.value || '').trim().toLowerCase();
      let n = 0;
      rows.forEach((r) => {
        const ok = (topic === 'all' || (r.dataset.topics || '').split(',').includes(topic)) && (type === 'all' || r.dataset.type === type) && (!q || r._hay.includes(q));
        r.hidden = !ok;
        const h = $('h3', r);
        h.innerHTML = q && ok ? r._title.replace(new RegExp('(' + esc(q) + ')', 'ig'), '<mark>$1</mark>') : r._title;
        if (ok) n++;
      });
      if (count) count.textContent = `${n} of ${rows.length} shown`;
      if (empty) empty.hidden = n > 0;
      if (hasGSAP) ScrollTrigger.refresh();
    };
    input?.addEventListener('input', apply);
    $$('[data-topic]').forEach((c) => c.addEventListener('click', () => { topic = c.dataset.topic; $$('[data-topic]').forEach((x) => x.setAttribute('aria-pressed', String(x === c))); apply(); }));
    $$('[data-type]').forEach((c) => c.addEventListener('click', () => { type = c.dataset.type; $$('[data-type]').forEach((x) => x.setAttribute('aria-pressed', String(x === c))); apply(); }));
    const q0 = new URLSearchParams(location.search).get('q');
    if (q0 && input) input.value = q0;
    apply();

    // cite
    const cite = $('.cite');
    const pubs = window.__PUBS || [];
    let cur = null, fmt = 'apa';
    const authorsList = (p) => (p.authors || 'Vityala Y').split(/,\s*|\s+and\s+|;\s*/).filter(Boolean);
    const formats = {
      apa: (p) => `${authorsList(p).join(', ')}. (${p.year || 'n.d.'}). ${p.title}. ${p.journal ? p.journal + '.' : ''}${p.doi ? ' https://doi.org/' + p.doi : p.url ? ' ' + p.url : ''}`,
      mla: (p) => `${authorsList(p)[0]}${authorsList(p).length > 1 ? ', et al' : ''}. "${p.title}." ${p.journal ? p.journal + ', ' : ''}${p.year || ''}.${p.doi ? ' doi:' + p.doi + '.' : ''}`,
      bibtex: (p) => `@article{vityala${p.year || ''}_${p.no},\n  title   = {${p.title}},\n  author  = {${authorsList(p).join(' and ')}},\n  journal = {${p.journal || ''}},\n  year    = {${p.year || ''}}${p.doi ? `,\n  doi     = {${p.doi}}` : ''}${p.url ? `,\n  url     = {${p.url}}` : ''}\n}`,
    };
    const show = () => { $('.cite-out', cite).textContent = formats[fmt](cur); $$('[data-fmt]', cite).forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.fmt === fmt))); };
    $$('[data-cite]').forEach((b) => b.addEventListener('click', () => {
      cur = pubs.find((p) => String(p.no) === b.dataset.cite); if (!cur) return;
      $('h3', cite).textContent = cur.title; show();
      cite.classList.add('is-open'); cite.setAttribute('aria-hidden', 'false'); lenis?.stop();
    }));
    $$('[data-fmt]', cite).forEach((b) => b.addEventListener('click', () => { fmt = b.dataset.fmt; show(); }));
    $('[data-copy]', cite)?.addEventListener('click', async () => { await copy($('.cite-out', cite).textContent); toast('Citation copied'); });
    const close = () => { cite.classList.remove('is-open'); cite.setAttribute('aria-hidden', 'true'); lenis?.start(); };
    $('.eld-bg', cite)?.addEventListener('click', close);
    $('[data-close]', cite)?.addEventListener('click', close);
    addEventListener('keydown', (e) => { if (e.key === 'Escape' && cite.classList.contains('is-open')) close(); });
  }

  /* speaking theatre: folder tabs + patient-monitor player */
  function initTheatre() {
    const th = $('.theatre');
    if (!th) return;
    const screen = $('.monitor-screen', th);
    const info = $('.monitor-info', th);
    const osd = $('.osd .ttl', th);
    const talks = $$('.talk', th);
    let cur = 0;
    const ytId = (u) => (u || '').match(/(?:youtu\.be\/|v=|embed\/|shorts\/)([\w-]{11})/)?.[1];
    const select = (i, play = false) => {
      const t = talks[i]; if (!t) return;
      cur = i;
      talks.forEach((x) => x.setAttribute('aria-current', String(x === t)));
      const img = t.dataset.img, vid = t.dataset.video, id = ytId(vid);
      if (play && id) screen.innerHTML = `<iframe src="https://www.youtube-nocookie.com/embed/${id}?autoplay=1&rel=0" title="${t.dataset.title}" allow="autoplay; encrypted-media; picture-in-picture" allowfullscreen></iframe>`;
      else {
        screen.innerHTML = `${img ? `<img src="${img}" alt="">` : ''}<div class="scan"></div>${id || vid ? `<button class="play" aria-label="Play ${t.dataset.title}"><svg width="22" height="22" viewBox="0 0 24 24"><path d="M7 4v16l13-8z" fill="currentColor"/></svg></button>` : ''}<div class="osd"><span class="ttl">${t.dataset.where || ''}</span><span>${t.dataset.year || ''}</span></div>`;
        $('.play', screen)?.addEventListener('click', () => (id ? select(i, true) : window.open(vid, '_blank', 'noopener')));
      }
      if (info) {
        info.textContent = '';
        const b = document.createElement('b'); b.textContent = t.dataset.title; info.appendChild(b);
        if (t.dataset.desc) { const p = document.createElement('span'); p.className = 'd'; p.textContent = t.dataset.desc; info.appendChild(p); }
      }
    };
    // slide tray: keep the projected slide visible inside the tray (without moving the page)
    const body = $('.tray-body', th);
    const groups = $$('.tray-year', th);
    const yearBtns = $$('[data-jump]', th);
    const reveal = (el) => {
      if (!body || !el) return;
      const top = el.offsetTop - body.offsetTop, h = el.offsetHeight;
      if (top < body.scrollTop + 60 || top + h > body.scrollTop + body.clientHeight) body.scrollTo({ top: top - 70, behavior: 'smooth' });
    };
    const markYear = () => {
      if (!body) return;
      const y = body.scrollTop + 20;
      let on = groups.find((g) => !g.hidden) || null;
      groups.forEach((g) => { if (!g.hidden && g.offsetTop - body.offsetTop <= y) on = g; });
      yearBtns.forEach((b) => b.classList.toggle('on', on && b.dataset.jump === on.dataset.year));
    };
    body?.addEventListener('scroll', markYear, { passive: true });
    yearBtns.forEach((b) => b.addEventListener('click', () => {
      const g = groups.find((x) => x.dataset.year === b.dataset.jump);
      if (g) body.scrollTo({ top: g.offsetTop - body.offsetTop, behavior: 'smooth' });
    }));
    const step = (d) => { const v = talks.filter((t) => !t.hidden); const p = v.indexOf(talks[cur]); const n = talks.indexOf(v[(p + d + v.length) % v.length]); select(n); reveal(talks[n]); };
    talks.forEach((t, i) => t.addEventListener('click', () => select(i)));
    $('[data-prev]', th)?.addEventListener('click', () => step(-1));
    $('[data-next]', th)?.addEventListener('click', () => step(1));
    $$('.folder-tabs button').forEach((b) => b.addEventListener('click', () => {
      $$('.folder-tabs button').forEach((x) => x.setAttribute('aria-selected', String(x === b)));
      const k = b.dataset.kind;
      talks.forEach((t) => { t.hidden = k !== 'all' && t.dataset.kind !== k; });
      groups.forEach((g) => {
        const n = $$('.talk', g).filter((t) => !t.hidden).length;
        g.hidden = !n;
        const yc = $('.yc', g); if (yc) yc.textContent = n;
      });
      yearBtns.forEach((yb) => { yb.hidden = groups.find((g) => g.dataset.year === yb.dataset.jump)?.hidden; });
      const vis = talks.filter((t) => !t.hidden).length;
      const cnt = $('.tray-count', th); if (cnt) cnt.textContent = vis;
      const mc = $('.monitor-top > span:last-child', th); if (mc) mc.textContent = vis + ' entries';
      body?.scrollTo({ top: 0 });
      const first = talks.find((t) => !t.hidden); if (first) select(talks.indexOf(first));
      markYear();
    }));
    select(0);
    markYear();
  }

  /* dark accordion */
  function initAccordion() {
    $$('.acc-btn').forEach((b) => b.addEventListener('click', () => {
      const item = b.closest('.acc-item');
      const open = !item.classList.contains('open');
      item.classList.toggle('open', open);
      b.setAttribute('aria-expanded', String(open));
      if (hasGSAP) setTimeout(() => ScrollTrigger.refresh(), 520);
    }));
  }

  /* contact: "contact" in the languages of his journey, drifting with the cursor */
  function initContactWords() {
    const box = $('.contact-words');
    if (!box) return;
    const spans = $$('span', box);
    spans.forEach((s, i) => {
      s.style.left = (8 + ((i * 37) % 80)) + '%';
      s.style.top = (10 + ((i * 53) % 78)) + '%';
      s.dataset.depth = (0.3 + (i % 4) * 0.25).toFixed(2);
    });
    if (reduced) return;
    const sec = box.closest('section');
    sec.addEventListener('pointermove', (e) => {
      const r = sec.getBoundingClientRect();
      const dx = (e.clientX - r.left) / r.width - 0.5, dy = (e.clientY - r.top) / r.height - 0.5;
      spans.forEach((s) => { s.style.transform = `translate(${dx * -60 * s.dataset.depth}px, ${dy * -40 * s.dataset.depth}px)`; });
    });
  }

  /* contact form: composes an email (no server needed) */
  function initForm() {
    const f = $('form[data-mailto]');
    if (!f) return;
    const reason = new URLSearchParams(location.search).get('reason');
    if (reason && f.reason) f.reason.value = reason;
    f.addEventListener('submit', (e) => {
      e.preventDefault();
      const d = new FormData(f);
      const subject = `${d.get('reason') || 'Enquiry'} — ${d.get('name') || ''}`;
      const body = `Name: ${d.get('name')}\nEmail: ${d.get('email')}\nOrganisation: ${d.get('org') || '-'}\nReason: ${d.get('reason')}\n\n${d.get('message')}`;
      location.href = `mailto:${f.dataset.mailto}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
      toast('Opening your email app…');
    });
  }
})();
