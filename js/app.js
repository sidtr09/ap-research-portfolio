/**
 * Sim → Real · AP Research Portfolio
 * Siddharth Tirumalareddi (2026–27)
 */
(function () {
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => Array.from(el.querySelectorAll(s));
  const SVGNS = 'http://www.w3.org/2000/svg';

  /* ---------- Nav: scrolled state, mobile menu, scroll spy ---------- */
  const nav = $('#nav');
  const hero = $('#home');
  const menuBtn = $('#menu-btn');
  const onScroll = () => {
    const past = window.scrollY > hero.offsetHeight - 80;
    nav.classList.toggle('scrolled', past);
  };
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  menuBtn.addEventListener('click', () => {
    const open = nav.classList.toggle('open');
    menuBtn.setAttribute('aria-expanded', open);
    menuBtn.textContent = open ? 'Close' : 'Menu';
  });
  $$('.nav-links a').forEach(a => a.addEventListener('click', () => {
    nav.classList.remove('open');
    menuBtn.setAttribute('aria-expanded', 'false');
    menuBtn.textContent = 'Menu';
  }));

  const links = $$('.nav-links a');
  const spy = new IntersectionObserver(entries => {
    entries.forEach(e => {
      if (!e.isIntersecting) return;
      links.forEach(l => l.classList.toggle('active', l.getAttribute('href') === '#' + e.target.id));
    });
  }, { rootMargin: '-45% 0px -50% 0px' });
  $$('section[id], footer[id]').forEach(s => spy.observe(s));

  /* ---------- Reveal on scroll ---------- */
  const rev = new IntersectionObserver(entries => {
    entries.forEach(e => {
      if (e.isIntersecting) { e.target.classList.add('in'); rev.unobserve(e.target); }
    });
  }, { rootMargin: '0px 0px -8% 0px' });
  $$('.reveal').forEach((el, i) => {
    el.style.transitionDelay = (i % 4) * 70 + 'ms';
    rev.observe(el);
  });

  /* ---------- Hero track: sim vs real cars ---------- */
  (function track() {
    const path = $('#track-path');
    if (!path) return;
    const L = path.getTotalLength();
    const TRACK_M = 156.4;               // real centerline length (m)
    const carSim = $('#car-sim'), carReal = $('#car-real');
    const trailSim = $('#trail-sim'), trailReal = $('#trail-real');
    const telSim = $('#tel-sim'), telReal = $('#tel-real'), telGap = $('#tel-gap');
    const LAP_S = 9;                     // seconds per animated sim lap
    const TRAIL = 0.08;                  // trail length (fraction of lap)

    const pointsAlong = (from, len) => {
      let d = '';
      for (let i = 0; i <= 24; i++) {
        const f = ((from - len + (len * i) / 24) % 1 + 1) % 1;
        const p = path.getPointAtLength(f * L);
        d += (i ? 'L' : 'M') + p.x.toFixed(1) + ',' + p.y.toFixed(1);
      }
      return d;
    };
    const place = (g, f) => {
      const p = path.getPointAtLength((((f % 1) + 1) % 1) * L);
      g.setAttribute('transform', `translate(${p.x},${p.y})`);
    };

    let start = null, visible = true;
    new IntersectionObserver(([e]) => { visible = e.isIntersecting; }).observe(path);

    function frame(t) {
      requestAnimationFrame(frame);
      if (!visible) return;
      if (start === null) start = t;
      const s = (t - start) / 1000;
      const fSim = s / LAP_S;
      // Real car: slower on average and loses time unevenly (corners, slip)
      const fReal = fSim * 0.9 - 0.012 * Math.sin(fSim * Math.PI * 4) - 0.006 * Math.sin(fSim * Math.PI * 10);
      place(carSim, fSim); place(carReal, fReal);
      trailSim.setAttribute('d', pointsAlong(fSim % 1, TRAIL));
      trailReal.setAttribute('d', pointsAlong(((fReal % 1) + 1) % 1, TRAIL));
      const mSim = (fSim % 1) * TRACK_M;
      const mReal = (((fReal % 1) + 1) % 1) * TRACK_M;
      const gap = Math.max(0, (fSim - fReal) * TRACK_M);
      telSim.textContent = mSim.toFixed(1) + ' m';
      telReal.textContent = mReal.toFixed(1) + ' m';
      telGap.textContent = gap.toFixed(1) + ' m';
    }
    if (reduceMotion) {
      place(carSim, 0.32); place(carReal, 0.27);
      trailSim.setAttribute('d', pointsAlong(0.32, TRAIL));
      trailReal.setAttribute('d', pointsAlong(0.27, TRAIL));
      telSim.textContent = (0.32 * TRACK_M).toFixed(1) + ' m';
      telReal.textContent = (0.27 * TRACK_M).toFixed(1) + ' m';
      telGap.textContent = (0.05 * TRACK_M).toFixed(1) + ' m';
    } else {
      requestAnimationFrame(frame);
    }
  })();

  /* ---------- Charts (real logs from checkpoints/ppo_baseline) ---------- */
  // train_monitor.csv: [cumulative steps at episode end, episode return]
  const TRAIN = [[123,-46.2],[490,-17.1],[614,-44.8],[997,-18.5],[1106,-44.0],[1250,-43.5],[1381,-44.7],[1467,-45.8],[1628,-40.8],[1765,-39.6],[2720,16.7],[3298,-8.7],[5419,120.2],[6044,-9.3],[6407,-15.8],[6766,-16.1],[9389,213.3],[10880,108.5],[11240,-21.7],[14307,294.1],[16879,310.8],[22879,961.6],[27562,735.9],[33234,1164.4],[38455,1179.5],[43506,1189.4],[48420,1194.6],[53180,1199.9],[57957,1201.7],[62587,1209.6],[67106,1232.1],[71549,1233.0],[75907,1231.8],[80143,1224.0],[84332,1227.0],[88563,1227.8],[92841,1229.0],[97078,1221.9]];
  // evaluations.npz: mean episode length (0.01 s/step) for checkpoints that completed the lap
  const EVAL = [[20000,50.03],[30000,45.13],[40000,42.56],[50000,43.14],[60000,41.70],[70000,40.94],[80000,40.27],[90000,40.42],[100000,39.61]];

  const el = (tag, attrs, parent) => {
    const n = document.createElementNS(SVGNS, tag);
    for (const k in attrs) n.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(n);
    return n;
  };
  const fmtK = v => (v >= 1000 ? Math.round(v / 1000) + 'k' : v);

  function lineChart(host, data, o) {
    const W = 560, H = 300, m = { t: 16, r: 16, b: 34, l: 48 };
    const iw = W - m.l - m.r, ih = H - m.t - m.b;
    const x = v => m.l + ((v - o.x0) / (o.x1 - o.x0)) * iw;
    const y = v => m.t + ih - ((v - o.y0) / (o.y1 - o.y0)) * ih;
    const svg = el('svg', { viewBox: `0 0 ${W} ${H}`, role: 'img', 'aria-label': o.label });
    const defs = el('defs', {}, svg);
    const g = el('linearGradient', { id: o.id + 'g', x1: 0, y1: 0, x2: 0, y2: 1 }, defs);
    el('stop', { offset: '0%', 'stop-color': '#4c6ef5', 'stop-opacity': 0.18 }, g);
    el('stop', { offset: '100%', 'stop-color': '#4c6ef5', 'stop-opacity': 0 }, g);

    if (o.budget) {
      el('rect', { class: 'budget', x: x(0), y: m.t, width: x(o.budget) - x(0), height: ih }, svg);
      el('line', { class: 'budget-line', x1: x(o.budget), x2: x(o.budget), y1: m.t, y2: m.t + ih }, svg);
      const t = el('text', { class: 'ann', x: x(o.budget) + 6, y: m.t + 12 }, svg);
      t.textContent = 'real-world budget';
    }
    const grid = el('g', { class: 'grid' }, svg);
    const axis = el('g', { class: 'axis' }, svg);
    o.yTicks.forEach(v => {
      el('line', { x1: m.l, x2: m.l + iw, y1: y(v), y2: y(v) }, grid);
      const t = el('text', { x: m.l - 8, y: y(v) + 4, 'text-anchor': 'end' }, axis);
      t.textContent = v;
    });
    o.xTicks.forEach(v => {
      const t = el('text', { x: x(v), y: H - 10, 'text-anchor': 'middle' }, axis);
      t.textContent = fmtK(v);
    });
    const d = data.map((p, i) => (i ? 'L' : 'M') + x(p[0]).toFixed(1) + ',' + y(p[1]).toFixed(1)).join('');
    el('path', { d: d + `L${x(data[data.length - 1][0])},${m.t + ih}L${x(data[0][0])},${m.t + ih}Z`, fill: `url(#${o.id}g)` }, svg);
    const line = el('path', { class: 'series sim', d }, svg);
    if (o.points) data.forEach(p => el('circle', { class: 'pt', cx: x(p[0]), cy: y(p[1]), r: 4.5 }, svg));
    if (o.annotate) o.annotate(svg, x, y, el);

    const xh = el('line', { class: 'xhair', y1: m.t, y2: m.t + ih }, svg);
    const hl = el('circle', { class: 'hl', r: 6 }, svg);
    const hit = el('rect', { x: m.l, y: m.t, width: iw, height: ih, fill: 'transparent' }, svg);
    host.appendChild(svg);

    const tip = document.createElement('div');
    tip.className = 'tip';
    host.appendChild(tip);

    const show = evt => {
      const r = svg.getBoundingClientRect();
      const px = ((evt.clientX - r.left) / r.width) * W;
      let best = data[0];
      data.forEach(p => { if (Math.abs(x(p[0]) - px) < Math.abs(x(best[0]) - px)) best = p; });
      const cx = x(best[0]), cy = y(best[1]);
      xh.setAttribute('x1', cx); xh.setAttribute('x2', cx); xh.style.opacity = 0.25;
      hl.setAttribute('cx', cx); hl.setAttribute('cy', cy); hl.style.opacity = 1;
      tip.innerHTML = `<span class="mono">${best[0].toLocaleString()} steps</span><b>${o.fmt(best[1])}</b>`;
      tip.style.left = (cx / W) * r.width + 'px';
      tip.style.top = (cy / H) * r.height + 'px';
      tip.style.opacity = 1;
    };
    const hide = () => { tip.style.opacity = 0; xh.style.opacity = 0; hl.style.opacity = 0; };
    hit.addEventListener('pointermove', show);
    hit.addEventListener('pointerdown', show);
    hit.addEventListener('pointerleave', hide);

    // draw-on animation
    if (!reduceMotion) {
      const len = line.getTotalLength();
      line.style.strokeDasharray = len;
      line.style.strokeDashoffset = len;
      new IntersectionObserver(([e], obs) => {
        if (!e.isIntersecting) return;
        line.style.transition = 'stroke-dashoffset 1.8s cubic-bezier(.3,.7,.2,1)';
        line.style.strokeDashoffset = 0;
        obs.disconnect();
      }, { threshold: 0.4 }).observe(svg);
    }
  }

  function table(host, head, rows) {
    host.innerHTML = '<table><thead><tr>' + head.map(h => `<th>${h}</th>`).join('') + '</tr></thead><tbody>' +
      rows.map(r => '<tr>' + r.map(c => `<td>${c}</td>`).join('') + '</tr>').join('') + '</tbody></table>';
  }

  const trainHost = $('#chart-train');
  if (trainHost) {
    lineChart(trainHost, TRAIN, {
      id: 'tr', label: 'Episode return rising from about -45 to about 1,230 over 100,000 training steps; the first completed lap happens after the 15,000-step mark.',
      x0: 0, x1: 100000, y0: -100, y1: 1300, yTicks: [0, 400, 800, 1200], xTicks: [0, 25000, 50000, 75000, 100000],
      budget: 15000, fmt: v => 'Score: ' + v.toFixed(1),
      annotate: (svg, x, y, el) => {
        const t = el('text', { class: 'ann ink', x: x(33234) + 8, y: y(1164.4) + 48 }, svg);
        t.textContent = '← first full lap';
      }
    });
    table($('#table-train'), ['Total steps so far', 'Score (return)'], TRAIN.map(r => [r[0].toLocaleString(), r[1].toFixed(1)]));
  }
  const evalHost = $('#chart-eval');
  if (evalHost) {
    lineChart(evalHost, EVAL, {
      id: 'ev', label: 'Evaluation lap time falling from 50.0 seconds at 20,000 steps to 39.6 seconds at 100,000 steps.',
      x0: 10000, x1: 100000, y0: 36, y1: 52, yTicks: [38, 42, 46, 50], xTicks: [20000, 40000, 60000, 80000, 100000],
      points: true, fmt: v => 'Lap time: ' + v.toFixed(1) + ' s'
    });
    table($('#table-eval'), ['Checkpoint (steps)', 'Average lap time (s)'], [['10,000', 'Did not finish']].concat(EVAL.map(r => [r[0].toLocaleString(), r[1].toFixed(2)])));
  }

  /* ---------- 3D CAD viewer ---------- */
  const cadEl = $('#cad-canvas');
  let viewer = null;
  const hasWebGL = (() => {
    try { const c = document.createElement('canvas'); return !!(window.WebGLRenderingContext && (c.getContext('webgl') || c.getContext('experimental-webgl'))); }
    catch (e) { return false; }
  })();

  if (cadEl && hasWebGL && window.THREE && window.F1TenthCADViewer) {
    // Lazy-init when the section approaches the viewport
    new IntersectionObserver(([e]) => {
      if (e.isIntersecting && !viewer) {
        viewer = new F1TenthCADViewer('cad-canvas');
        viewer.onSelect = part => showPart(part);
      }
      if (viewer) viewer.paused = !e.isIntersecting;
    }, { rootMargin: '200px' }).observe(cadEl);

    const nameEl = $('#cad-part-name'), descEl = $('#cad-part-desc');
    const defaultName = nameEl.textContent, defaultDesc = descEl.textContent;
    function showPart(part) {
      $$('.parts button').forEach(x => x.classList.toggle('active', !!part && x.dataset.part === part.id));
      nameEl.textContent = part ? part.name : defaultName;
      descEl.textContent = part ? part.description : defaultDesc;
    }

    const slider = $('#cad-explode-slider'), sv = $('#cad-slider-val');
    slider.addEventListener('input', () => {
      const v = slider.value / 100;
      slider.style.setProperty('--p', slider.value + '%');
      sv.textContent = slider.value + '%';
      if (viewer) viewer.setExplosion(v);
    });

    $$('.seg button').forEach(b => b.addEventListener('click', () => {
      $$('.seg button').forEach(x => x.classList.remove('active'));
      b.classList.add('active');
      if (viewer) viewer.setView(b.dataset.view);
    }));

    $$('.parts button').forEach(b => b.addEventListener('click', () => {
      if (!viewer) return;
      const same = viewer.selected === b.dataset.part;
      if (same) { viewer.select(null); showPart(null); }
      else showPart(viewer.highlightPart(b.dataset.part));
    }));
  } else if (cadEl) {
    $('#cad-fallback').style.display = 'grid';
  }
})();
