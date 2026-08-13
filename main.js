/* ══════════════════════════════════════════════════════════════
   Paper 1 deck v2 — navigation + 2-D animations
   All motion is delta-time based (rAF timestamps, dt clamped to 50 ms).
   ══════════════════════════════════════════════════════════════ */
(function () {
  "use strict";

  // Test hook: ?ff=SECONDS fast-forwards each slide's animation clock on entry
  // (used by the headless-screenshot verification; harmless in live talks).
  const FF = (function () {
    const m = /[?&]ff=([\d.]+)/.exec(location.search);
    return m ? Math.min(parseFloat(m[1]), 60) : 0;
  })();
  if (FF > 0) document.documentElement.classList.add("ff");
  window.__FF = FF;

  // ─────────────────────────── data ───────────────────────────
  const YEARS = [];
  for (let y = 2002; y <= 2024; y++) YEARS.push(y);
  const GWSA = [0.2, -0.16, -1.98, -3.47, 1.19, 1.09, 2.04, 1.14, -0.91, 1.5, 1.48,
    -0.12, -2.65, -3.53, -4.77, -3.68, -2.56, -0.17, -3.24, -6.15, -8.69, -7.0, -6.88];

  // Per-method annual GWSa series, 2002–2024 (shared by the small-multiples and
  // overlay slides). GRACE-raw is the exact annual series; GRACE-Lf, GLDAS-2.2
  // and GWDM are traced (annual, approximate) from the paper's Figure 10;
  // GRACE-sw is the surface-water-adjusted series, i.e. GRACE-Lf ÷ Lf = 2 by definition.
  const LF = [-7.2, -3.8, -3.7, -0.8, 2.5, -1.2, 3.5, -1.0, -1.4, 3.1, -2.5,
    -4.2, -5.3, -5.5, -6.6, -6.7, -5.8, -0.6, -3.5, -13.0, -13.6, -8.5, -8.9];
  const GLDAS = [-3.6, -3.4, -1.0, 2.6, 2.3, -1.6, -0.1, -1.5, -1.1, 3.5, -1.5,
    -1.6, -1.6, -2.9, -1.5, 1.5, -1.7, 1.1, -2.4, -4.4, -4.8, -0.6, -0.2];
  const GWDM = [-0.5, -3.5, -1.5, 2.7, 2.4, -1.3, 0.0, -0.6, -1.8, 3.6, -1.2,
    -2.3, -5.0, -4.6, -4.3, -2.9, -6.3, -2.4, -5.4, -9.7, -10.0, -6.1, -2.6];
  const SERIES = [
    { name: "GRACE-raw", col: "#5aa9e6", v: GWSA.slice(0, 23) },
    { name: "GRACE-sw", col: "#7fd1c8", v: LF.map(function (x) { return x / 2; }) },
    { name: "GRACE-Lf", col: "#ffb454", v: LF },
    { name: "GLDAS-2.2", col: "#e6704b", v: GLDAS },
    { name: "GWDM", col: "#e8e3d6", v: GWDM }
  ];

  // GSLB boundary polygon in normalized figure01 coordinates (x right, y down),
  // traced from the beige basin fill of figure01.png (174 vertices).
  const BASIN = [
    [0.4183,0.9492], [0.4192,0.9243], [0.4142,0.9007], [0.405,0.8853], [0.3917,0.883],
    [0.3842,0.87], [0.3908,0.8582], [0.3858,0.8274], [0.3892,0.8038], [0.3825,0.7518],
    [0.3758,0.7376], [0.3825,0.7163], [0.3992,0.7021], [0.3875,0.6879], [0.3858,0.6619],
    [0.3975,0.6478], [0.3958,0.6407], [0.4025,0.6288], [0.3975,0.6147], [0.4058,0.6028],
    [0.4008,0.5745], [0.4042,0.5556], [0.3975,0.5437], [0.3992,0.5272], [0.3892,0.5035],
    [0.3942,0.487], [0.3892,0.4799], [0.3842,0.4515], [0.3875,0.4374], [0.3842,0.3641],
    [0.3725,0.3428], [0.3725,0.3262], [0.3683,0.3203], [0.36,0.3298], [0.3433,0.3345],
    [0.31,0.2896], [0.3,0.2943], [0.2925,0.2884], [0.3167,0.2754], [0.3283,0.2754],
    [0.3408,0.2411], [0.35,0.2352], [0.3617,0.2116], [0.385,0.24], [0.3933,0.2352],
    [0.4083,0.24], [0.42,0.2187], [0.4283,0.2187], [0.4383,0.2021], [0.4467,0.2045],
    [0.4617,0.2258], [0.475,0.2021], [0.4867,0.2045], [0.5067,0.195], [0.5217,0.195],
    [0.5442,0.1655], [0.5492,0.1513], [0.5458,0.1466], [0.555,0.1359], [0.5817,0.1288],
    [0.5892,0.1111], [0.595,0.1099], [0.6017,0.0981], [0.61,0.1076], [0.6217,0.1099],
    [0.635,0.0768], [0.6508,0.0922], [0.6458,0.1087], [0.6517,0.117], [0.6667,0.1123],
    [0.6817,0.1265], [0.69,0.1076], [0.7025,0.0993], [0.7083,0.0721], [0.7492,0.0426],
    [0.7392,0.0236], [0.7417,0.0201], [0.755,0.0272], [0.77,0.0532], [0.7917,0.0697],
    [0.7925,0.0757], [0.8,0.0863], [0.8333,0.0816], [0.8383,0.0745], [0.845,0.0839],
    [0.8517,0.0839], [0.8658,0.0686], [0.8758,0.0946], [0.86,0.1005], [0.8542,0.1111],
    [0.8542,0.1797], [0.8808,0.2033], [0.8717,0.2281], [0.8517,0.221], [0.8375,0.2388],
    [0.8442,0.2695], [0.8392,0.2979], [0.8433,0.3038], [0.85,0.3014], [0.8525,0.3262],
    [0.8617,0.3392], [0.8675,0.3381], [0.8625,0.3546], [0.8675,0.3617], [0.8642,0.3712],
    [0.8708,0.3783], [0.8675,0.3901], [0.8708,0.4066], [0.8583,0.4149], [0.8467,0.4125],
    [0.8308,0.4468], [0.8325,0.4539], [0.825,0.4622], [0.8133,0.4622], [0.8,0.4716],
    [0.7942,0.4799], [0.7942,0.4941], [0.79,0.4929], [0.7842,0.5035], [0.7958,0.5272],
    [0.7942,0.5532], [0.8108,0.5721], [0.8058,0.5887], [0.7867,0.5804], [0.765,0.6087],
    [0.74,0.6135], [0.73,0.6206], [0.725,0.6324], [0.7058,0.6241], [0.7058,0.5957],
    [0.7017,0.5898], [0.6917,0.5946], [0.6892,0.5863], [0.6925,0.5792], [0.6733,0.552],
    [0.6667,0.552], [0.6583,0.5638], [0.6483,0.5638], [0.6433,0.5757], [0.6383,0.5662],
    [0.62,0.5544], [0.61,0.5615], [0.5767,0.5662], [0.57,0.5946], [0.56,0.604], [0.5433,0.604],
    [0.5392,0.6099], [0.5408,0.6407], [0.5183,0.6537], [0.5075,0.6667], [0.5092,0.6832],
    [0.5008,0.6974], [0.5042,0.7069], [0.4958,0.7187], [0.5008,0.7329], [0.4992,0.74],
    [0.5075,0.7518], [0.5075,0.7801], [0.5033,0.7861], [0.4983,0.7837], [0.4958,0.7707],
    [0.4883,0.7648], [0.4758,0.7778], [0.4708,0.7943], [0.4708,0.8156], [0.4792,0.8369],
    [0.4775,0.8629], [0.4692,0.8865], [0.4758,0.9054], [0.4633,0.9137], [0.4433,0.9137],
    [0.4392,0.9196], [0.4408,0.9433], [0.4333,0.9515]
  ];
  function inBasin(x, y) {
    let inside = false;
    for (let i = 0, j = BASIN.length - 1; i < BASIN.length; j = i++) {
      const xi = BASIN[i][0], yi = BASIN[i][1], xj = BASIN[j][0], yj = BASIN[j][1];
      if ((yi > y) !== (yj > y) && x < (xj - xi) * (y - yi) / (yj - yi) + xi) inside = !inside;
    }
    return inside;
  }
  function basinPoint() {
    for (let k = 0; k < 80; k++) {
      const x = 0.27 + Math.random() * 0.71, y = Math.random();
      if (inBasin(x, y)) return [x, y];
    }
    return [0.55, 0.45];
  }

  // ───────────────────────── helpers ─────────────────────────
  function fitCanvas(cv) {                         // hi-dpi sizing, returns ctx or null
    const r = cv.getBoundingClientRect();
    if (!r.width || !r.height) return null;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = Math.round(r.width * dpr), h = Math.round(r.height * dpr);
    if (cv.width !== w || cv.height !== h) { cv.width = w; cv.height = h; }
    const ctx = cv.getContext("2d");
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    return { ctx: ctx, w: r.width, h: r.height };
  }
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const lerp = (a, b, t) => a + (b - a) * t;
  const easeOut = t => 1 - Math.pow(1 - t, 3);
  const easeInOut = t => t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  function smooth01(x) { x = clamp(x, 0, 1); return x * x * (3 - 2 * x); }

  // Catmull-Rom sampling of the annual series → smooth path
  function sampleSeries(vals, t) {                 // t in [0, n-1]
    const n = vals.length;
    const i = clamp(Math.floor(t), 0, n - 2), f = t - i;
    const p0 = vals[Math.max(0, i - 1)], p1 = vals[i], p2 = vals[i + 1], p3 = vals[Math.min(n - 1, i + 2)];
    return 0.5 * ((2 * p1) + (-p0 + p2) * f + (2 * p0 - 5 * p1 + 4 * p2 - p3) * f * f +
      (-p0 + 3 * p1 - 3 * p2 + p3) * f * f * f);
  }

  // ─────────────────────── navigation ────────────────────────
  const slides = Array.prototype.slice.call(document.querySelectorAll(".slide"));
  const progressFill = document.getElementById("progressFill");
  const pageNum = document.getElementById("pageNum");
  const notesPanel = document.getElementById("notesPanel");
  const notesText = document.getElementById("notesText");
  let cur = -1;

  const controllers = {};                           // slideId → controller
  function reg(id, ctrl) { controllers[id] = ctrl; }

  function goto(i) {
    i = clamp(i, 0, slides.length - 1);
    if (i === cur) return;
    if (cur >= 0) {
      const old = slides[cur];
      old.classList.remove("active");
      const oc = controllers[old.id];
      if (oc && oc.leave) { try { oc.leave(old); } catch (e) { console.error(e); } }
    }
    cur = i;
    const s = slides[cur];
    s.classList.add("active");
    const c = controllers[s.id];
    if (c && c.enter) { try { c.enter(s); } catch (e) { console.error(e); } }
    progressFill.style.width = ((cur + 1) / slides.length * 100) + "%";
    pageNum.textContent = (cur + 1) + " / " + slides.length;
    notesText.textContent = s.getAttribute("data-notes") || "";
    if (history.replaceState) history.replaceState(null, "", "#" + (cur + 1));
    startCountUps(s);
    if (FF > 0) {                                   // deterministic fast-forward for tests
      const steps = Math.round(FF / 0.05);
      for (let k = 0; k < steps; k++) {
        tickCountUps(0.05);
        if (c && c.tick) { try { c.tick(0.05, s); } catch (e) { console.error(e); } }
      }
    }
  }
  function next() { goto(cur + 1); }
  function prev() { goto(cur - 1); }

  document.addEventListener("keydown", function (e) {
    if (e.key === "ArrowRight" || e.key === " " || e.key === "PageDown") { e.preventDefault(); next(); }
    else if (e.key === "ArrowLeft" || e.key === "PageUp") { e.preventDefault(); prev(); }
    else if (e.key === "Home") goto(0);
    else if (e.key === "End") goto(slides.length - 1);
    else if (e.key.toLowerCase() === "n") notesPanel.classList.toggle("show");
    else if (e.key.toLowerCase() === "f") {
      if (!document.fullscreenElement) document.documentElement.requestFullscreen();
      else document.exitFullscreen();
    }
  });
  window.addEventListener("hashchange", function () {
    const n = parseInt(location.hash.slice(1), 10);
    if (!isNaN(n)) goto(n - 1);
  });

  // ─────────────────────── count-ups ─────────────────────────
  let countUps = [];
  function startCountUps(slide) {
    countUps = [];
    slide.querySelectorAll("[data-count]").forEach(function (el) {
      countUps.push({
        el: el,
        target: parseFloat(el.getAttribute("data-count")),
        dec: parseInt(el.getAttribute("data-decimals") || "0", 10),
        grp: el.hasAttribute("data-grp"),
        dur: parseFloat(el.getAttribute("data-dur") || "2"),
        delay: 0.55,                                // wait for the reveal to begin
        t: 0
      });
      el.textContent = (0).toFixed(parseInt(el.getAttribute("data-decimals") || "0", 10));
    });
  }
  function tickCountUps(dt) {
    countUps.forEach(function (c) {
      if (c.t >= c.delay + c.dur) return;
      c.t += dt;
      const p = easeOut(clamp((c.t - c.delay) / c.dur, 0, 1));
      let v = c.target * p;
      c.el.textContent = c.grp
        ? Math.round(v).toLocaleString("en-US")
        : v.toFixed(c.dec);
    });
  }

  // ══════════════════ slide controllers ══════════════════════

  // ---- 1 · hero (and 15 · end): waves + drifting motes ----
  function makeWaterScene(canvasId, opts) {
    const motes = [];
    let elapsed = 0;
    return {
      enter: function () {
        elapsed = 0;
        motes.length = 0;
        for (let i = 0; i < 70; i++) {
          motes.push({
            x: Math.random(), y: Math.random(),
            r: 0.6 + Math.random() * 1.8,
            vx: (Math.random() - 0.5) * 0.008,
            vy: -(0.004 + Math.random() * 0.012),
            ph: Math.random() * Math.PI * 2
          });
        }
      },
      tick: function (dt) {
        elapsed += dt;
        const f = fitCanvas(document.getElementById(canvasId));
        if (!f) return;
        const ctx = f.ctx, W = f.w, H = f.h;
        ctx.clearRect(0, 0, W, H);

        // faint star field (static hash-based)
        ctx.fillStyle = "rgba(233,238,246,.25)";
        for (let i = 0; i < 60; i++) {
          const sx = ((i * 127.3) % 1) * W, sy = ((i * 61.7) % 1) * H * 0.55;
          const tw = 0.4 + 0.6 * Math.abs(Math.sin(elapsed * 0.7 + i));
          ctx.globalAlpha = 0.18 * tw;
          ctx.fillRect(sx, sy, 1.4, 1.4);
        }
        ctx.globalAlpha = 1;

        // receding waterline: base level slowly sinks then resets (24 s loop)
        const cyc = (elapsed % 24) / 24;
        const drop = opts.rise ? (1 - smooth01(cyc)) * 0.10 : smooth01(cyc) * 0.10;
        const base = H * (0.62 + drop);

        // wave bands
        const bands = [
          { amp: 10, len: 0.9, sp: 0.35, off: 0, col: "rgba(90,169,230,.16)" },
          { amp: 14, len: 1.4, sp: -0.25, off: 30, col: "rgba(88,207,195,.13)" },
          { amp: 20, len: 2.2, sp: 0.18, off: 66, col: "rgba(46,110,143,.20)" }
        ];
        bands.forEach(function (b) {
          ctx.beginPath();
          ctx.moveTo(0, H);
          for (let x = 0; x <= W; x += 6) {
            const y = base + b.off +
              Math.sin(x / W * Math.PI * 2 * b.len + elapsed * b.sp * 2) * b.amp +
              Math.sin(x / W * Math.PI * 5.7 * b.len + elapsed * b.sp * 3.1) * b.amp * 0.35;
            ctx.lineTo(x, y);
          }
          ctx.lineTo(W, H);
          ctx.closePath();
          ctx.fillStyle = b.col;
          ctx.fill();
        });

        // "old shoreline" ghost line (title slide only)
        if (!opts.rise) {
          ctx.strokeStyle = "rgba(255,180,84,.28)";
          ctx.setLineDash([2, 7]);
          ctx.beginPath(); ctx.moveTo(0, H * 0.62); ctx.lineTo(W, H * 0.62); ctx.stroke();
          ctx.setLineDash([]);
        }

        // motes
        motes.forEach(function (m) {
          m.x += m.vx * dt; m.y += m.vy * dt;
          if (m.y < -0.02) { m.y = 1.02; m.x = Math.random(); }
          if (m.x < -0.02) m.x = 1.02; if (m.x > 1.02) m.x = -0.02;
          const a = 0.10 + 0.10 * Math.sin(elapsed * 1.3 + m.ph);
          ctx.beginPath();
          ctx.fillStyle = "rgba(147,196,230," + a.toFixed(3) + ")";
          ctx.arc(m.x * W, m.y * H, m.r, 0, Math.PI * 2);
          ctx.fill();
        });
      }
    };
  }
  reg("s-hero", makeWaterScene("heroCanvas", { rise: false }));
  reg("s-end", makeWaterScene("endCanvas", { rise: true }));

  // ---- 2 · basin map: rain inside the polygon + city pulses ----
  (function () {
    const CITIES = [[0.699, 0.325], [0.714, 0.410], [0.742, 0.512]];   // Ogden, SLC, Provo
    const GSL = [0.625, 0.333];
    let drops = [], elapsed = 0;
    reg("s-basin", {
      enter: function () { drops = []; elapsed = 0; },
      tick: function (dt) {
        elapsed += dt;
        const f = fitCanvas(document.getElementById("basinRainCanvas"));
        if (!f) return;
        const ctx = f.ctx, W = f.w, H = f.h;
        ctx.clearRect(0, 0, W, H);

        // spawn rain drops inside the basin
        if (drops.length < 90 && Math.random() < dt * 45) {
          const p = basinPoint();
          drops.push({ x: p[0], y: p[1], t: 0, dur: 1.2 + Math.random() * 0.8 });
        }
        drops = drops.filter(function (d) {
          d.t += dt;
          const p = d.t / d.dur;
          if (p >= 1) return false;
          const fall = easeOut(Math.min(p * 1.6, 1));
          const x = d.x * W, y = (d.y - 0.028 * (1 - fall)) * H;
          const a = p < 0.75 ? 0.55 : 0.55 * (1 - (p - 0.75) / 0.25);
          ctx.strokeStyle = "rgba(90,169,230," + a.toFixed(3) + ")";
          ctx.lineWidth = 1.4;
          ctx.beginPath(); ctx.moveTo(x, y - 7); ctx.lineTo(x, y); ctx.stroke();
          if (p > 0.7) {                            // splash ripple
            const rp = (p - 0.7) / 0.3;
            ctx.strokeStyle = "rgba(88,207,195," + (0.5 * (1 - rp)).toFixed(3) + ")";
            ctx.lineWidth = 1;
            ctx.beginPath(); ctx.ellipse(x, d.y * H + 2, 8 * rp, 3 * rp, 0, 0, Math.PI * 2); ctx.stroke();
          }
          return true;
        });

        // pulsing lake distress glow
        const lp = (elapsed % 3) / 3;
        ctx.beginPath();
        ctx.strokeStyle = "rgba(230,112,75," + (0.55 * (1 - lp)).toFixed(3) + ")";
        ctx.lineWidth = 2;
        ctx.arc(GSL[0] * W, GSL[1] * H, 12 + lp * 44, 0, Math.PI * 2);
        ctx.stroke();

        // Wasatch Front city pulses (pumping)
        CITIES.forEach(function (c, i) {
          const cp = ((elapsed * 0.8 + i * 0.33) % 1);
          ctx.beginPath();
          ctx.strokeStyle = "rgba(255,180,84," + (0.7 * (1 - cp)).toFixed(3) + ")";
          ctx.lineWidth = 1.6;
          ctx.arc(c[0] * W, c[1] * H, 3 + cp * 18, 0, Math.PI * 2);
          ctx.stroke();
          ctx.beginPath();
          ctx.fillStyle = "rgba(255,180,84,.9)";
          ctx.arc(c[0] * W, c[1] * H, 2.6, 0, Math.PI * 2);
          ctx.fill();
        });
      }
    });
  })();

  // ---- 4 · GRACE 3-D (lazy init; loop only while active) ----
  (function () {
    let scene = null, failed = false;
    reg("s-grace3d", {
      enter: function (s) {
        if (failed) return;
        if (!scene) {
          try {
            scene = window.Grace3D.create({
              canvas: document.getElementById("graceCanvas"),
              hud: {
                satA: document.getElementById("hudSatA"),
                satB: document.getElementById("hudSatB"),
                mass: document.getElementById("hudMass")
              },
              rangeEl: document.getElementById("rangeKm"),
              deltaEl: document.getElementById("rangeDelta")
            });
          } catch (e) {
            console.error("WebGL init failed:", e);
            scene = null; failed = true;
          }
          if (!scene) {
            failed = true;
            document.getElementById("graceFallback").hidden = false;
            document.getElementById("graceCanvas").style.display = "none";
            return;
          }
        }
        scene.start();
      },
      leave: function () { if (scene) scene.stop(); }
    });
  })();

  // ---- 5 · leakage: ~300 km measurement redistributed onto a ~100 km grid ----
  (function () {
    const NC = 15, BLK = 3;                          // 15×15 fine cells; 3×3 cells per coarse block
    let elapsed = 0, cellTrue = null, blockMean = null, trueBasinMean = 0, basinMask = null;
    // study-area map underlay: the BASIN polygon is traced in normalized figure01
    // coordinates, so drawing the image into the same square keeps them aligned
    const MAPIMG = new Image();
    MAPIMG.src = "assets/figure01.png";
    function buildField() {
      cellTrue = []; basinMask = []; blockMean = [];
      const cxn = 0.62, cyn = 0.40, sig = 0.22;
      for (let j = 0; j < NC; j++) for (let i = 0; i < NC; i++) {
        const u = (i + 0.5) / NC, v = (j + 0.5) / NC;
        const inside = inBasin(u, v);
        const d2 = (u - cxn) * (u - cxn) + (v - cyn) * (v - cyn);
        cellTrue.push(inside ? Math.exp(-d2 / (2 * sig * sig)) : 0);
        basinMask.push(inside);
      }
      const NB = NC / BLK;
      for (let bj = 0; bj < NB; bj++) for (let bi = 0; bi < NB; bi++) {
        let s = 0;
        for (let j = 0; j < BLK; j++) for (let i = 0; i < BLK; i++)
          s += cellTrue[(bj * BLK + j) * NC + bi * BLK + i];
        blockMean.push(s / (BLK * BLK));
      }
      let s = 0, n = 0;
      for (let k = 0; k < NC * NC; k++) if (basinMask[k]) { s += cellTrue[k]; n++; }
      trueBasinMean = s / Math.max(1, n);
    }
    reg("s-leakage", {
      enter: function () { elapsed = 0; if (!cellTrue) buildField(); },
      tick: function (dt) {
        elapsed += dt;
        const f = fitCanvas(document.getElementById("leakCanvas"));
        if (!f) return;
        const ctx = f.ctx, W = f.w, H = f.h;
        ctx.clearRect(0, 0, W, H);
        if (!cellTrue) buildField();

        // 13-s loop: 0-3 true field · 3-7.5 aggregate + redistribute · 7.5-11.5 corrected · 11.5-13 hold
        const T = elapsed % 13;
        let p1 = 0, p2 = 0, phase = 0;
        if (T < 3) { phase = 0; }
        else if (T < 7.5) { phase = 1; p1 = smooth01((T - 3) / 3.2); }
        else { phase = 2; p1 = 1; p2 = smooth01((T - 7.5) / 2.4); }

        const size = Math.min(W * 0.52, H * 0.94);
        const cx = W * 0.40, cy = H / 2;
        const bx = cx - size / 2, by = cy - size / 2;
        const cs = size / NC;

        // study-area map beneath the grid (dimmed so the cells read on top)
        if (MAPIMG.complete && MAPIMG.naturalWidth) {
          ctx.save();
          ctx.globalAlpha = 0.35;
          ctx.beginPath();
          ctx.roundRect(bx, by, size, size, 8);
          ctx.clip();
          ctx.drawImage(MAPIMG, bx, by, size, size);
          ctx.restore();
        }

        // fine-grid cells: true value → block mean (leakage) → corrected
        let dispBasinSum = 0, dispBasinN = 0;
        for (let j = 0; j < NC; j++) for (let i = 0; i < NC; i++) {
          const k = j * NC + i;
          const bm = blockMean[Math.floor(j / BLK) * (NC / BLK) + Math.floor(i / BLK)];
          let v = lerp(cellTrue[k], bm, p1);
          if (basinMask[k]) { dispBasinSum += v; dispBasinN++; }
          if (basinMask[k]) v = v * (1 + p2 * 1.08);          // Lf restores the basin mean
          if (v > 0.015) {
            ctx.fillStyle = "rgba(88,207,195," + (0.78 * Math.min(1, v)).toFixed(3) + ")";
            ctx.beginPath();
            ctx.roundRect(bx + i * cs + 1, by + j * cs + 1, cs - 2, cs - 2, 3);
            ctx.fill();
          }
        }

        // fine grid lines (~100 km cells)
        ctx.strokeStyle = "rgba(233,238,246,.10)";
        ctx.lineWidth = 1;
        for (let i = 0; i <= NC; i++) {
          ctx.beginPath(); ctx.moveTo(bx + i * cs, by); ctx.lineTo(bx + i * cs, by + size); ctx.stroke();
          ctx.beginPath(); ctx.moveTo(bx, by + i * cs); ctx.lineTo(bx + size, by + i * cs); ctx.stroke();
        }
        ctx.font = "500 17px 'Avenir Next', sans-serif";
        ctx.fillStyle = "rgba(233,238,246,.55)";
        ctx.fillText("~100 km grid cells", bx + 8, by + 18);

        // coarse measurement blocks (~300 km), emphasized while aggregating
        if (phase >= 1) {
          const a = phase === 1 ? 0.35 + 0.5 * p1 : 0.85;
          ctx.setLineDash([9, 7]);
          ctx.strokeStyle = "rgba(255,180,84," + a.toFixed(2) + ")";
          ctx.lineWidth = 2;
          const bs = cs * BLK;
          for (let i = 0; i <= NC / BLK; i++) {
            ctx.beginPath(); ctx.moveTo(bx + i * bs, by); ctx.lineTo(bx + i * bs, by + size); ctx.stroke();
            ctx.beginPath(); ctx.moveTo(bx, by + i * bs); ctx.lineTo(bx + size, by + i * bs); ctx.stroke();
          }
          ctx.setLineDash([]);
          ctx.fillStyle = "rgba(255,180,84," + a.toFixed(2) + ")";
          ctx.fillText("~300 km measurement blocks", bx + size - 200, by + size - 10);
        }

        // basin outline on top
        ctx.save();
        ctx.translate(bx, by);
        ctx.beginPath();
        BASIN.forEach(function (p, i) {
          const x = p[0] * size, y = p[1] * size;
          i ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
        });
        ctx.closePath();
        ctx.strokeStyle = "rgba(233,238,246,.75)";
        ctx.lineWidth = 1.6;
        ctx.stroke();
        ctx.restore();

        // Lf badge during correction — vertically centered right of the grid,
        // well below the amplitude meter that occupies the top-right corner
        if (phase === 2) {
          ctx.font = "600 30px 'Iowan Old Style', Georgia, serif";
          ctx.fillStyle = "rgba(255,180,84,.95)";
          ctx.textAlign = "left";
          ctx.fillText("× Lf = 2", bx + size + 26, cy + 10);
        }

        // captions + basin-mean amplitude meter (computed from the grid itself)
        for (let i = 0; i < 3; i++) {
          const el = document.getElementById("leakCap" + i);
          if (el) el.classList.toggle("on", phase === i);
        }
        const dispMean = dispBasinN ? dispBasinSum / dispBasinN : 0;
        let meterVal = trueBasinMean ? dispMean / trueBasinMean : 1;
        if (phase === 2) meterVal = Math.min(1, meterVal * (1 + p2 * 1.08));
        const mf = document.getElementById("leakMeter"), mp = document.getElementById("leakPct");
        if (mf) mf.style.width = (clamp(meterVal, 0, 1) * 100).toFixed(1) + "%";
        if (mp) mp.textContent = Math.round(meterVal * 100) + "%";
      }
    });
  })();

  // ---- 8a · per-method small multiples (each series on its own panel) ----
  (function () {
    const START = 0.5, STAG = 1.3, DRAW = 2.2;      // per-panel stagger and draw time
    const VMIN = -15, VMAX = 4.5, N = 22;
    let elapsed = 0;

    function drawPanel(ctx, S, x0, y0, pw, ph, ta) {
      const padL = 40, padR = 16, padT = 36, padB = 28;
      const X = function (t) { return x0 + padL + (pw - padL - padR) * t / (N - 1); };
      const Y = function (v) { return y0 + padT + (ph - padT - padB) * (VMAX - v) / (VMAX - VMIN); };
      const started = ta > 0;
      // panel frame
      ctx.strokeStyle = started ? "rgba(147,164,188,.30)" : "rgba(147,164,188,.14)";
      ctx.lineWidth = 1;
      ctx.beginPath(); ctx.roundRect(x0 + 0.5, y0 + 0.5, pw - 1, ph - 1, 10); ctx.stroke();
      // method name above the plot area
      ctx.font = "600 18px 'Avenir Next', sans-serif";
      ctx.textAlign = "left";
      ctx.fillStyle = started ? S.col : "rgba(147,164,188,.45)";
      ctx.fillText(S.name, x0 + padL, y0 + 22);
      // zero line + one reference gridline
      ctx.strokeStyle = "rgba(233,238,246,.30)";
      ctx.setLineDash([4, 5]);
      ctx.beginPath(); ctx.moveTo(X(0), Y(0)); ctx.lineTo(X(N - 1), Y(0)); ctx.stroke();
      ctx.setLineDash([]);
      ctx.strokeStyle = "rgba(147,164,188,.12)";
      ctx.beginPath(); ctx.moveTo(X(0), Y(-10)); ctx.lineTo(X(N - 1), Y(-10)); ctx.stroke();
      ctx.font = "16px 'Avenir Next', sans-serif";
      ctx.fillStyle = "rgba(147,164,188,.7)";
      ctx.textAlign = "right";
      ctx.fillText("0", x0 + padL - 6, Y(0) + 4);
      ctx.fillText("−10", x0 + padL - 6, Y(-10) + 4);
      // 2002 / 2023 ticks
      ctx.strokeStyle = "rgba(147,164,188,.45)";
      [0, N - 1].forEach(function (t) {
        ctx.beginPath(); ctx.moveTo(X(t), y0 + ph - padB); ctx.lineTo(X(t), y0 + ph - padB + 5); ctx.stroke();
      });
      ctx.textAlign = "center";
      ctx.fillText("2002", X(0), y0 + ph - 9);
      ctx.fillText("2023", X(N - 1), y0 + ph - 9);
      if (!started) return;
      // the series, drawn left to right
      const prog = smooth01(ta / DRAW);
      const tMax = prog * (N - 1);
      ctx.strokeStyle = S.col;
      ctx.lineWidth = 2.2;
      ctx.lineJoin = "round";
      ctx.beginPath();
      const steps = Math.max(2, Math.round(tMax * 10));
      for (let k = 0; k <= steps; k++) {
        const t = tMax * k / steps;
        const x = X(t), y = Y(sampleSeries(S.v, t));
        k ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
      }
      ctx.stroke();
      if (prog < 1) {                                // travelling head dot
        ctx.fillStyle = S.col;
        ctx.beginPath();
        ctx.arc(X(tMax), Y(sampleSeries(S.v, tMax)), 3.6, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    reg("s-multiples", {
      enter: function () { elapsed = 0; },
      tick: function (dt) {
        elapsed += dt;
        const f = fitCanvas(document.getElementById("multiCanvas"));
        if (!f) return;
        const ctx = f.ctx, W = f.w, H = f.h;
        ctx.clearRect(0, 0, W, H);
        const gx = 22, gy = 16, cols = 3;
        const pw = (W - gx * (cols + 1)) / cols;
        const ph = (H - gy * 3) / 2;
        for (let s = 0; s < SERIES.length; s++) {
          const row = Math.floor(s / cols), col = s % cols;
          const offX = row === 1 ? (pw + gx) / 2 : 0;  // center the two bottom panels
          const x0 = gx + col * (pw + gx) + offX;
          const y0 = gy + row * (ph + gy);
          drawPanel(ctx, SERIES[s], x0, y0, pw, ph, elapsed - (START + s * STAG));
        }
      }
    });
  })();

  // ---- 6c · GLDAS-2.2: modeled water-balance cells + GRACE assimilation ----
  (function () {
    const NGX = 7, NGY = 5;
    let elapsed = 0, img = null, cells = null;
    function buildCells() {
      cells = [];
      for (let j = 0; j < NGY; j++) for (let i = 0; i < NGX; i++) {
        const u = (i + 0.5) / NGX, v = (j + 0.5) / NGY;
        cells.push({ u: u, v: v, inside: inBasin(u, v), ph: (i * 3.7 + j * 2.3) % 6.28, bias: ((i * 7 + j * 13) % 10) / 10 - 0.5 });
      }
    }
    reg("s-gldas", {
      enter: function () {
        elapsed = 0;
        if (!cells) buildCells();
        if (!img) { img = new Image(); img.src = "assets/figure01.png"; }
      },
      tick: function (dt) {
        elapsed += dt;
        const f = fitCanvas(document.getElementById("gldasCanvas"));
        if (!f) return;
        const ctx = f.ctx, W = f.w, H = f.h;
        ctx.clearRect(0, 0, W, H);
        const size = Math.min(W * 0.9, H * 0.92);
        const bx = (W - size) / 2, by = (H - size) / 2 + 6;

        // dimmed basin map underlay
        if (img && img.complete) {
          ctx.save(); ctx.globalAlpha = 0.30;
          ctx.drawImage(img, bx, by, size, size);
          ctx.restore();
        }

        // 12-s loop: 0-5 free-running simulation · 5-8.5 assimilation pulse · 8.5-12 constrained
        const T = elapsed % 12;
        const assim = T >= 5 && T < 8.5 ? smooth01((T - 5) / 1.2) : (T >= 8.5 ? 1 : 0);
        const cw = size / NGX, chh = size / NGY;

        // satellite glyph, top centre
        const sx = bx + size / 2, sy = by + 16;
        ctx.fillStyle = "rgba(233,238,246,.9)";
        ctx.fillRect(sx - 7, sy - 5, 14, 10);
        ctx.fillStyle = "rgba(90,169,230,.9)";
        ctx.fillRect(sx - 21, sy - 4, 11, 8); ctx.fillRect(sx + 10, sy - 4, 11, 8);
        ctx.font = "500 17px 'Avenir Next', sans-serif";
        ctx.textAlign = "center";
        ctx.fillStyle = "rgba(233,238,246,.6)";
        ctx.fillText("GRACE TWS observations", sx, sy + 24);
        ctx.textAlign = "left";

        // assimilation pulse rings
        if (T >= 5 && T < 8.5) {
          const pr = ((T - 5) % 1.2) / 1.2;
          ctx.strokeStyle = "rgba(255,180,84," + (0.7 * (1 - pr)).toFixed(3) + ")";
          ctx.lineWidth = 2;
          ctx.beginPath(); ctx.arc(sx, sy, 10 + pr * size * 0.55, 0, Math.PI * 2); ctx.stroke();
        }

        // water-balance cells (basin cells only)
        cells.forEach(function (c) {
          if (!c.inside) return;
          const x = bx + (c.u - 0.5 / NGX) * size, y = by + (c.v - 0.5 / NGY) * size;
          // simulated storage level: seasonal + per-cell bias; assimilation pulls bias out
          const season = 0.5 + 0.32 * Math.sin(elapsed * 0.9 + c.ph);
          const level = clamp(season + c.bias * (1 - assim) * 0.8, 0.08, 0.98);
          ctx.strokeStyle = assim > 0.5 ? "rgba(255,180,84,.5)" : "rgba(233,238,246,.25)";
          ctx.lineWidth = 1;
          ctx.strokeRect(x + 2, y + 2, cw - 4, chh - 4);
          // storage bar inside the cell
          const bh = (chh - 10) * level;
          ctx.fillStyle = "rgba(88,207,195," + (0.35 + 0.4 * level).toFixed(3) + ")";
          ctx.fillRect(x + 5, y + chh - 5 - bh, cw - 10, bh);
        });

        // basin outline on top
        ctx.save();
        ctx.translate(bx, by);
        ctx.beginPath();
        BASIN.forEach(function (p, i) {
          const x = p[0] * size, y = p[1] * size;
          i ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
        });
        ctx.closePath();
        ctx.strokeStyle = "rgba(233,238,246,.7)";
        ctx.lineWidth = 1.5;
        ctx.stroke();
        ctx.restore();

        // phase caption on a dark backing pill for legibility over the map
        const capTxt = T < 5 ? "modeled storage, free-running simulation"
          : "assimilation: GRACE observations constrain the simulated storage";
        ctx.font = "500 17px 'Avenir Next', sans-serif";
        const tw = ctx.measureText(capTxt).width;
        const capX = bx + size / 2, capY = by + size - 14;
        ctx.fillStyle = "rgba(8,14,24,.82)";
        ctx.beginPath();
        ctx.roundRect(capX - tw / 2 - 12, capY - 13, tw + 24, 22, 11);
        ctx.fill();
        ctx.fillStyle = T < 5 ? "rgba(233,238,246,.8)" : "rgba(255,180,84,.95)";
        ctx.textAlign = "center";
        ctx.fillText(capTxt, capX, capY + 3);
        ctx.textAlign = "left";
      }
    });
  })();

  // ---- 8 · five estimates, drawn onto one common axis ----
  (function () {
    const DRAW = 2.7, STAGGER = 3.3, HOLD = 5.0;    // per-series draw, spacing, final hold
    const TOTAL = STAGGER * SERIES.length + HOLD;
    const VMIN = -15, VMAX = 4.5, N = 23;
    let elapsed = 0;

    reg("s-five", {
      enter: function () { elapsed = 0; },
      tick: function (dt) {
        elapsed += dt;
        const f = fitCanvas(document.getElementById("fiveCanvas"));
        if (!f) return;
        const ctx = f.ctx, W = f.w, H = f.h;
        ctx.clearRect(0, 0, W, H);
        const T = elapsed % TOTAL;
        const padL = 52, padR = 96, padT = 18, padB = 34;
        const X = function (t) { return padL + (W - padL - padR) * t / (N - 1); };
        const Y = function (v) { return padT + (H - padT - padB) * (VMAX - v) / (VMAX - VMIN); };

        // drawdown intervals, fading in once all series are drawn
        const holdP = smooth01((T - STAGGER * SERIES.length) / 1.2);
        if (holdP > 0) {
          ctx.fillStyle = "rgba(230,112,75," + (0.10 * holdP).toFixed(3) + ")";
          ctx.fillRect(X(10), padT, X(14) - X(10), H - padT - padB);
          ctx.fillRect(X(17), padT, X(20) - X(17), H - padT - padB);
          ctx.font = "500 17px 'Avenir Next', sans-serif";
          ctx.fillStyle = "rgba(230,112,75," + (0.85 * holdP).toFixed(3) + ")";
          ctx.textAlign = "center";
          ctx.fillText("drawdown 2012–2016", (X(10) + X(14)) / 2, padT + 16);
          ctx.fillText("drawdown 2019–2022", (X(17) + X(20)) / 2, padT + 16);
          ctx.textAlign = "left";
        }

        // axes
        ctx.strokeStyle = "rgba(233,238,246,.14)";
        ctx.fillStyle = "rgba(233,238,246,.5)";
        ctx.font = "500 17px 'Avenir Next', sans-serif";
        ctx.lineWidth = 1;
        [0, -5, -10, -15].forEach(function (v) {
          ctx.beginPath(); ctx.moveTo(padL, Y(v)); ctx.lineTo(W - padR, Y(v)); ctx.stroke();
          ctx.textAlign = "right"; ctx.fillText(v.toString(), padL - 8, Y(v) + 4);
        });
        ctx.textAlign = "center";
        for (let y = 2002; y <= 2020; y += 4) ctx.fillText(y.toString(), X(y - 2002), H - padB + 22);
        ctx.fillText("2024", X(22), H - padB + 22);
        ctx.textAlign = "left";
        ctx.save();
        ctx.translate(14, (padT + H - padB) / 2); ctx.rotate(-Math.PI / 2);
        ctx.textAlign = "center"; ctx.fillText("GWSa (cm)", 0, 0);
        ctx.restore();

        // series, each drawn in turn; earlier ones dim while a newer one draws
        let active = -1;
        for (let s = 0; s < SERIES.length; s++) {
          const ts = T - s * STAGGER;
          if (ts <= 0) continue;
          const prog = smooth01(ts / DRAW);
          if (prog < 1) active = s;
          const isCurrent = (T - (s + 1) * STAGGER < 0) || holdP > 0;
          const alpha = holdP > 0 ? 0.9 : (isCurrent ? 1 : 0.42);
          const tMax = prog * (SERIES[s].v.length - 1);
          ctx.strokeStyle = SERIES[s].col;
          ctx.globalAlpha = alpha;
          ctx.lineWidth = isCurrent && holdP === 0 ? 3 : 2.1;
          ctx.beginPath();
          const steps = Math.max(2, Math.round(tMax * 10));
          for (let k = 0; k <= steps; k++) {
            const t = tMax * k / steps;
            const x = X(t), y = Y(sampleSeries(SERIES[s].v, t));
            k ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
          }
          ctx.stroke();
          // travelling head dot + label while this series is drawing
          if (prog < 1) {
            const hx = X(tMax), hy = Y(sampleSeries(SERIES[s].v, tMax));
            ctx.fillStyle = SERIES[s].col;
            ctx.beginPath(); ctx.arc(hx, hy, 4.5, 0, Math.PI * 2); ctx.fill();
            ctx.font = "600 18px 'Avenir Next', sans-serif";
            ctx.fillText(SERIES[s].name, Math.min(hx + 12, W - padR + 4), hy - 10);
          } else if (holdP > 0 || T - s * STAGGER > DRAW) {
            // resting label at the right edge
            ctx.font = "600 17px 'Avenir Next', sans-serif";
            ctx.fillStyle = SERIES[s].col;
            ctx.fillText(SERIES[s].name, W - padR + 8, Y(sampleSeries(SERIES[s].v, N - 1)) + 4);
          }
          ctx.globalAlpha = 1;
        }

        // legend chips track the animation state
        const chips = document.querySelectorAll("#fiveLegend .fchip");
        chips.forEach(function (ch, i) {
          const started = T - i * STAGGER > 0;
          const drawing = started && T - i * STAGGER < DRAW && holdP === 0;
          ch.classList.toggle("on", drawing || (holdP > 0));
          ch.classList.toggle("done", started && !drawing);
        });
      }
    });
  })();

  // ---- 6 · peel the water column (loops: peel → hero → reassemble) ----
  (function () {
    const seq = [["pl-tws", 1.4], ["pl-snow", 2.5], ["pl-soil", 3.5], ["pl-canopy", 4.5], ["pl-sw", 5.7]];
    const CYCLE = 14;                               // 0-7 peel · 7-11.5 hero hold · reassemble
    let elapsed = 0;
    reg("s-peel", {
      enter: function (s) {
        elapsed = 0;
        s.querySelectorAll(".peel-layer").forEach(function (el) {
          el.classList.remove("gone", "hero-gw");
        });
      },
      tick: function (dt, s) {
        elapsed += dt;
        const t = elapsed % CYCLE;
        seq.forEach(function (it) {
          const el = s.querySelector("." + it[0]);
          if (el) el.classList.toggle("gone", t > it[1] && t < 11.5);
        });
        const gw = s.querySelector(".pl-gw");
        if (gw) gw.classList.toggle("hero-gw", t > 7 && t < 11.5);
      }
    });
  })();

  // ---- 7 · wells map + healing hydrograph ----
  (function () {
    let elapsed = 0, wellPts = [];
    // synthetic well hydrograph with a gap
    const HN = 46;
    const hydro = [];
    for (let i = 0; i < HN; i++) {
      const t = i / (HN - 1);
      hydro.push(0.5 - 0.22 * Math.sin(t * Math.PI * 2.2 + 0.4) - 0.10 * Math.sin(t * Math.PI * 6.1) + 0.06 * Math.sin(t * 21));
    }
    const GAP0 = 16, GAP1 = 31;                     // indices hidden in the raw record

    reg("s-wells", {
      enter: function () {
        elapsed = 0;
        wellPts = [];
        for (let i = 0; i < 230; i++) {
          const p = basinPoint();
          wellPts.push({ x: p[0], y: p[1], at: 0.3 + Math.random() * 3.4 });
        }
      },
      tick: function (dt) {
        elapsed += dt;

        // — map with wells popping in —
        const fm = fitCanvas(document.getElementById("wellsMapCanvas"));
        if (fm) {
          const ctx = fm.ctx, W = fm.w, H = fm.h;
          ctx.clearRect(0, 0, W, H);
          const size = Math.min(W, H) * 0.94, ox = (W - size) / 2, oy = (H - size) / 2;
          // basin outline
          ctx.beginPath();
          BASIN.forEach(function (p, i) {
            const x = ox + p[0] * size, y = oy + p[1] * size;
            i ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
          });
          ctx.closePath();
          ctx.fillStyle = "rgba(90,169,230,.06)";
          ctx.fill();
          ctx.strokeStyle = "rgba(147,164,188,.6)";
          ctx.lineWidth = 1.6;
          ctx.stroke();
          // wells
          let shown = 0;
          wellPts.forEach(function (w) {
            if (elapsed < w.at) return;
            shown++;
            const a = clamp((elapsed - w.at) / 0.4, 0, 1);
            const r = (1 + 1.6 * (1 - a)) * 2.1;
            ctx.beginPath();
            ctx.fillStyle = "rgba(88,207,195," + (0.35 + 0.55 * a).toFixed(3) + ")";
            ctx.arc(ox + w.x * size, oy + w.y * size, r, 0, Math.PI * 2);
            ctx.fill();
          });
          const cEl = document.getElementById("wellCount");
          if (cEl) cEl.textContent = "~" + Math.round(1200 * clamp(shown / wellPts.length, 0, 1)).toLocaleString("en-US");
        }

        // — hydrograph that heals —
        const fh = fitCanvas(document.getElementById("hydroCanvas"));
        if (fh) {
          const ctx = fh.ctx, W = fh.w, H = fh.h;
          ctx.clearRect(0, 0, W, H);
          const px = i => 14 + (W - 28) * i / (HN - 1);
          const py = v => 12 + (H - 24) * v;
          // gap shading
          ctx.fillStyle = "rgba(230,112,75,.08)";
          ctx.fillRect(px(GAP0), 8, px(GAP1) - px(GAP0), H - 16);
          // measured points
          ctx.fillStyle = "rgba(233,238,246,.9)";
          for (let i = 0; i < HN; i++) {
            if (i > GAP0 && i < GAP1) continue;
            ctx.beginPath();
            ctx.arc(px(i), py(hydro[i]), 2.2, 0, Math.PI * 2);
            ctx.fill();
          }
          // measured connecting lines
          ctx.strokeStyle = "rgba(233,238,246,.5)";
          ctx.lineWidth = 1.4;
          [[0, GAP0], [GAP1, HN - 1]].forEach(function (seg) {
            ctx.beginPath();
            for (let i = seg[0]; i <= seg[1]; i++) i === seg[0] ? ctx.moveTo(px(i), py(hydro[i])) : ctx.lineTo(px(i), py(hydro[i]));
            ctx.stroke();
          });
          // healing dashed curve draws across the gap after 3.8 s
          const hp = clamp((elapsed - 3.8) / 2.2, 0, 1);
          if (hp > 0) {
            const upto = GAP0 + (GAP1 - GAP0) * easeInOut(hp);
            ctx.strokeStyle = "rgba(88,207,195,.95)";
            ctx.lineWidth = 2.2;
            ctx.setLineDash([6, 5]);
            ctx.beginPath();
            for (let i = GAP0; i <= Math.floor(upto); i++)
              i === GAP0 ? ctx.moveTo(px(i), py(hydro[i])) : ctx.lineTo(px(i), py(hydro[i]));
            const fi = Math.floor(upto), fr = upto - fi;
            if (fi < GAP1) ctx.lineTo(lerp(px(fi), px(fi + 1), fr), lerp(py(hydro[fi]), py(hydro[Math.min(fi + 1, HN - 1)]), fr));
            ctx.stroke();
            ctx.setLineDash([]);
          }
          const tag = document.getElementById("hydroTag");
          if (tag) {
            const healed = hp >= 1;
            tag.textContent = healed ? "gap imputed · PCHIP + ELM" : "raw record with a data gap";
            tag.style.color = healed ? "var(--teal)" : "var(--amber)";
          }
        }
      }
    });
  })();

  // ---- 9 · time replay ----
  (function () {
    let elapsed = 0;
    const DUR = 20, HOLD = 4;
    reg("s-replay", {
      enter: function () { elapsed = 0; },
      tick: function (dt) {
        elapsed += dt;
        const f = fitCanvas(document.getElementById("replayCanvas"));
        if (!f) return;
        const ctx = f.ctx, W = f.w, H = f.h;
        ctx.clearRect(0, 0, W, H);

        const cyc = elapsed % (DUR + HOLD);
        const prog = clamp(cyc / DUR, 0, 1);        // 0..1 across 2002..2024
        const tMax = prog * (YEARS.length - 1);

        const padL = 64, padR = 26, padT = 26, padB = 44;
        const iw = W - padL - padR, ih = H - padT - padB;
        const X = t => padL + iw * t / (YEARS.length - 1);
        const yMin = -10, yMax = 3.2;
        const Y = v => padT + ih * (1 - (v - yMin) / (yMax - yMin));

        // drought bands (appear as the trace reaches them)
        [[2012, 2016], [2019, 2022]].forEach(function (b) {
          const t0 = b[0] - 2002, t1 = b[1] - 2002;
          if (tMax <= t0) return;
          const a = clamp((tMax - t0) / 1.2, 0, 1) * 0.14;
          ctx.fillStyle = "rgba(230,112,75," + a.toFixed(3) + ")";
          ctx.fillRect(X(t0), padT, X(Math.min(t1, tMax)) - X(t0), ih);
        });

        // grid + axes
        ctx.strokeStyle = "rgba(147,164,188,.14)";
        ctx.lineWidth = 1;
        ctx.font = "17px 'Avenir Next', sans-serif";
        for (let v = -10; v <= 2; v += 2) {
          ctx.beginPath(); ctx.moveTo(padL, Y(v)); ctx.lineTo(W - padR, Y(v)); ctx.stroke();
          ctx.fillStyle = "rgba(147,164,188,.75)";
          ctx.textAlign = "right";
          ctx.fillText(v.toString(), padL - 8, Y(v) + 4);
        }
        ctx.save();
        ctx.translate(18, padT + ih / 2); ctx.rotate(-Math.PI / 2);
        ctx.textAlign = "center";
        ctx.fillStyle = "rgba(147,164,188,.85)";
        ctx.fillText("GWSa (cm)", 0, 0);
        ctx.restore();
        // zero line
        ctx.strokeStyle = "rgba(233,238,246,.4)";
        ctx.setLineDash([4, 5]);
        ctx.beginPath(); ctx.moveTo(padL, Y(0)); ctx.lineTo(W - padR, Y(0)); ctx.stroke();
        ctx.setLineDash([]);
        // year ticks
        ctx.textAlign = "center";
        for (let y = 2002; y <= 2024; y += 2) {
          const t = y - 2002;
          ctx.fillStyle = t <= tMax ? "rgba(233,238,246,.8)" : "rgba(147,164,188,.35)";
          ctx.fillText(y.toString(), X(t), H - padB + 24);
        }

        // GWSa smooth trace with signed area fill
        const STEPS = 340;
        const upto = Math.max(2, Math.round(STEPS * prog));
        // area
        ctx.beginPath();
        ctx.moveTo(X(0), Y(0));
        for (let k = 0; k <= upto; k++) {
          const t = tMax * k / upto;
          ctx.lineTo(X(t), Y(sampleSeries(GWSA, t)));
        }
        ctx.lineTo(X(tMax), Y(0));
        ctx.closePath();
        ctx.save();
        ctx.clip();
        ctx.fillStyle = "rgba(88,207,195,.20)";
        ctx.fillRect(padL, padT, iw, Y(0) - padT);
        ctx.fillStyle = "rgba(230,112,75,.22)";
        ctx.fillRect(padL, Y(0), iw, padT + ih - Y(0));
        ctx.restore();
        // line
        ctx.beginPath();
        for (let k = 0; k <= upto; k++) {
          const t = tMax * k / upto;
          const x = X(t), y = Y(sampleSeries(GWSA, t));
          k ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
        }
        ctx.strokeStyle = "#5aa9e6";
        ctx.lineWidth = 2.6;
        ctx.lineJoin = "round";
        ctx.stroke();

        // head glow + value tag
        const hv = sampleSeries(GWSA, tMax);
        const hx = X(tMax), hy = Y(hv);
        const pulse = 3 + 1.6 * Math.sin(elapsed * 5);
        ctx.beginPath();
        ctx.fillStyle = "rgba(90,169,230,.25)";
        ctx.arc(hx, hy, 9 + pulse, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath();
        ctx.fillStyle = "#e9eef6";
        ctx.arc(hx, hy, 4, 0, Math.PI * 2); ctx.fill();
        ctx.font = "600 18px 'Avenir Next', sans-serif";
        ctx.fillStyle = hv < 0 ? "#e6704b" : "#58cfc3";
        ctx.textAlign = hx > W - 120 ? "right" : "left";
        ctx.fillText((hv > 0 ? "+" : "") + hv.toFixed(1) + " cm", hx + (hx > W - 120 ? -12 : 12), hy - 12);

        // drought band labels
        ctx.font = "600 17px 'Avenir Next', sans-serif";
        ctx.textAlign = "center";
        if (tMax > 11) { ctx.fillStyle = "rgba(230,112,75,.9)"; ctx.fillText("drawdown 2012–2016", X(12), padT + 16); }
        if (tMax > 18.2) { ctx.fillStyle = "rgba(230,112,75,.9)"; ctx.fillText("drawdown 2019–2022", X(19.5), padT + 16); }

        const yEl = document.getElementById("replayYear");
        if (yEl) yEl.textContent = Math.round(2002 + 22 * prog).toString();
      }
    });
  })();

  // ---- 10 · payoff gauge 0.17 → 0.77 ----
  (function () {
    let elapsed = 0;
    reg("s-payoff", {
      enter: function () { elapsed = 0; },
      tick: function (dt) {
        elapsed += dt;
        const f = fitCanvas(document.getElementById("gaugeCanvas"));
        if (!f) return;
        const ctx = f.ctx, W = f.w, H = f.h;
        ctx.clearRect(0, 0, W, H);
        // 0-2 s hold at 0.17 · 2-4.6 s sweep to 0.77 · hold
        let r;
        if (elapsed < 2) r = 0.17;
        else r = lerp(0.17, 0.77, easeInOut(clamp((elapsed - 2) / 2.6, 0, 1)));

        const cx = W / 2, cy = H * 0.92, R = Math.min(W / 2, H * 0.86) - 10;
        const a0 = Math.PI, a1 = 2 * Math.PI;
        // track
        ctx.lineCap = "round";
        ctx.beginPath();
        ctx.strokeStyle = "rgba(147,164,188,.18)";
        ctx.lineWidth = 13;
        ctx.arc(cx, cy, R, a0, a1);
        ctx.stroke();
        // fill
        const grad = ctx.createLinearGradient(cx - R, 0, cx + R, 0);
        grad.addColorStop(0, "#e6704b");
        grad.addColorStop(0.6, "#ffb454");
        grad.addColorStop(1, "#58cfc3");
        ctx.beginPath();
        ctx.strokeStyle = grad;
        ctx.lineWidth = 13;
        ctx.arc(cx, cy, R, a0, a0 + (a1 - a0) * r);
        ctx.stroke();
        // ticks at 0.17 and 0.77
        [0.17, 0.77].forEach(function (v) {
          const a = a0 + (a1 - a0) * v;
          ctx.beginPath();
          ctx.strokeStyle = "rgba(233,238,246,.7)";
          ctx.lineWidth = 2;
          ctx.moveTo(cx + Math.cos(a) * (R - 14), cy + Math.sin(a) * (R - 14));
          ctx.lineTo(cx + Math.cos(a) * (R + 14), cy + Math.sin(a) * (R + 14));
          ctx.stroke();
          ctx.font = "17px 'Avenir Next', sans-serif";
          ctx.fillStyle = "rgba(147,164,188,.9)";
          ctx.textAlign = "center";
          ctx.fillText(v.toFixed(2), cx + Math.cos(a) * (R + 30), cy + Math.sin(a) * (R + 30));
        });
        const vEl = document.getElementById("gaugeVal");
        if (vEl) vEl.textContent = r.toFixed(2);
        const cEl = document.getElementById("gaugeCap");
        if (cEl) cEl.textContent = elapsed < 2 ? "GRACE-raw ↔ in-situ" : "GRACE-Lf ↔ in-situ";
      }
    });
  })();

  // ---- 12 · drought loss tank + GPS whisker ----
  (function () {
    let elapsed = 0;
    reg("s-loss", {
      enter: function () { elapsed = 0; },
      tick: function (dt) {
        elapsed += dt;
        // tank drains 0.8 → 4 s while the number counts up
        const p = smooth01(clamp((elapsed - 0.8) / 3.2, 0, 1));
        const tw = document.getElementById("tankWater");
        if (tw) tw.style.height = (92 - 62 * p) + "%";
        const lv = document.getElementById("lossVal");
        if (lv) lv.textContent = (10.1 * p).toFixed(1);

        // GPS whisker draws in 3.5 → 5.5 s
        const f = fitCanvas(document.getElementById("whiskerCanvas"));
        if (!f) return;
        const ctx = f.ctx, W = f.w, H = f.h;
        ctx.clearRect(0, 0, W, H);
        const q = smooth01(clamp((elapsed - 3.2) / 1.8, 0, 1));
        const vMax = 15;                             // km³ scale
        const Yv = v => H * (1 - 0.06) - (H * 0.88) * v / vMax;
        const cx = W / 2;
        // faint scale
        ctx.strokeStyle = "rgba(147,164,188,.15)";
        ctx.font = "16px 'Avenir Next', sans-serif";
        ctx.textAlign = "left";
        for (let v = 0; v <= 15; v += 5) {
          ctx.beginPath(); ctx.moveTo(10, Yv(v)); ctx.lineTo(W - 10, Yv(v)); ctx.stroke();
          ctx.fillStyle = "rgba(147,164,188,.6)";
          ctx.fillText(v + " km³", 12, Yv(v) - 4);
        }
        if (q > 0) {
          // bar to 10.9
          const bh = (Yv(0) - Yv(10.9)) * q;
          const grad = ctx.createLinearGradient(0, Yv(0), 0, Yv(10.9));
          grad.addColorStop(0, "rgba(230,112,75,.25)");
          grad.addColorStop(1, "rgba(230,112,75,.75)");
          ctx.fillStyle = grad;
          ctx.fillRect(cx - 26, Yv(0) - bh, 52, bh);
          // whisker ±2.8 (after bar completes)
          if (q > 0.85) {
            const wq = clamp((q - 0.85) / 0.15, 0, 1);
            ctx.strokeStyle = "rgba(233,238,246,.85)";
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(cx, Yv(10.9 - 2.8 * wq)); ctx.lineTo(cx, Yv(10.9 + 2.8 * wq));
            ctx.stroke();
            ctx.beginPath();
            ctx.moveTo(cx - 14, Yv(10.9 + 2.8 * wq)); ctx.lineTo(cx + 14, Yv(10.9 + 2.8 * wq));
            ctx.moveTo(cx - 14, Yv(10.9 - 2.8 * wq)); ctx.lineTo(cx + 14, Yv(10.9 - 2.8 * wq));
            ctx.stroke();
          }
          // our 10.1 estimate as an amber dashed line crossing the bar
          ctx.strokeStyle = "rgba(255,180,84,.95)";
          ctx.setLineDash([6, 5]);
          ctx.lineWidth = 2;
          ctx.beginPath(); ctx.moveTo(14, Yv(10.1)); ctx.lineTo(W - 14, Yv(10.1)); ctx.stroke();
          ctx.setLineDash([]);
          ctx.fillStyle = "rgba(255,180,84,.95)";
          ctx.textAlign = "right";
          ctx.fillText("this study 10.1", W - 16, Yv(10.1) - 6);
        }
      }
    });
  })();

  // ---- 13 · precipitation lag: three datasets, wells peak at +2 yr ----
  (function () {
    let elapsed = 0;
    const LAGLABELS = ["same year", "+1 yr", "+2 yr", "+3 yr"];
    // series: [name, color, dim color, r-values at lag 0..3, start time]
    const SERIES = [
      ["GRACE-Lf", "rgba(90,169,230,.9)", "rgba(90,169,230,.45)", [0.19, 0.42, 0.17, 0.06], 0.7],
      ["GLDAS-2.2", "rgba(88,207,195,.9)", "rgba(88,207,195,.45)", [0.25, 0.72, 0.11, -0.40], 1.5],
      ["Wells · GWDM", "rgba(255,180,84,.95)", "rgba(255,180,84,.5)", [0.27, 0.59, 0.60, -0.12], 2.3],
    ];
    reg("s-lag", {
      enter: function () { elapsed = 0; },
      tick: function (dt) {
        elapsed += dt;
        const f = fitCanvas(document.getElementById("lagCanvas"));
        if (!f) return;
        const ctx = f.ctx, W = f.w, H = f.h;
        ctx.clearRect(0, 0, W, H);
        const padL = 14, padR = 10, padT = 92, padB = 30;
        const vMax = 0.8, vMin = -0.48;
        const Yv = v => padT + (vMax - v) / (vMax - vMin) * (H - padT - padB);
        const y0 = Yv(0);
        const group = (W - padL - padR) / LAGLABELS.length;
        const bw = group * 0.21;
        const axIn = easeOut(clamp((elapsed - 0.3) / 0.6, 0, 1));
        // zero baseline + faint gridlines
        ctx.globalAlpha = axIn;
        ctx.strokeStyle = "rgba(147,164,188,.12)";
        [0.6, 0.3, -0.3].forEach(function (g) {
          ctx.beginPath(); ctx.moveTo(padL, Yv(g)); ctx.lineTo(W - padR, Yv(g)); ctx.stroke();
        });
        ctx.strokeStyle = "rgba(147,164,188,.4)";
        ctx.beginPath(); ctx.moveTo(padL, y0); ctx.lineTo(W - padR, y0); ctx.stroke();
        // lag labels along the bottom edge
        ctx.font = "16px 'Avenir Next', sans-serif";
        ctx.textAlign = "center";
        ctx.fillStyle = "rgba(147,164,188,.85)";
        LAGLABELS.forEach(function (L, i) {
          ctx.fillText(L, padL + group * i + group / 2, H - 8);
        });
        // legend, top-left row
        ctx.font = "600 15px 'Avenir Next', sans-serif";
        ctx.textAlign = "left";
        let lx = padL + 2;
        SERIES.forEach(function (S) {
          ctx.fillStyle = S[1];
          ctx.fillRect(lx, 8, 14, 14);
          ctx.fillStyle = "rgba(233,238,246,.8)";
          ctx.fillText(S[0], lx + 20, 20);
          lx += 20 + ctx.measureText(S[0]).width + 26;
        });
        ctx.globalAlpha = 1;
        // grouped bars
        SERIES.forEach(function (S, s) {
          const vals = S[3];
          vals.forEach(function (v, i) {
            const p = easeOut(clamp((elapsed - (S[4] + i * 0.12)) / 0.7, 0, 1));
            if (p <= 0) return;
            const x = padL + group * i + group / 2 + (s - 1) * (bw + 4) - bw / 2;
            const h = (y0 - Yv(v)) * p;
            ctx.fillStyle = (v < 0) ? S[2] : S[1];
            ctx.fillRect(x, Math.min(y0, y0 - h), bw, Math.abs(h));
            // r-value labels: all four for the wells, peaks only for the others
            const showVal = (s === 2) || (s === 0 && i === 1) || (s === 1 && i === 1);
            if (showVal && p > 0.85) {
              ctx.font = "600 16px 'Avenir Next', sans-serif";
              ctx.textAlign = "center";
              ctx.fillStyle = (s === 2) ? "#ffb454" : "rgba(233,238,246,.85)";
              const ty = v >= 0 ? y0 - h - 8 : y0 + Math.abs(h) + 18;
              ctx.fillText(v.toFixed(2), x + bw / 2, ty);
            }
          });
        });
        // bracket over +1..+2: the aquifer's memory
        if (elapsed > 4.2) {
          const a = clamp((elapsed - 4.2) / 0.6, 0, 1);
          ctx.globalAlpha = a;
          const x1 = padL + group * 1 + group * 0.14;
          const x2 = padL + group * 2 + group * 0.86;
          const by = padT - 24;
          ctx.strokeStyle = "#58cfc3";
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.moveTo(x1, by + 8); ctx.lineTo(x1, by); ctx.lineTo(x2, by); ctx.lineTo(x2, by + 8);
          ctx.stroke();
          ctx.font = "italic 600 19px 'Iowan Old Style', Georgia, serif";
          ctx.fillStyle = "#58cfc3";
          ctx.textAlign = "center";
          ctx.fillText("a 1–2-year memory", (x1 + x2) / 2, by - 8);
          ctx.globalAlpha = 1;
          ctx.lineWidth = 1;
        }
      }
    });
  })();

  // ---- 14 · limits: imputation decay cone ----
  (function () {
    let elapsed = 0;
    reg("s-limits", {
      enter: function () { elapsed = 0; },
      tick: function (dt) {
        elapsed += dt;
        const f = fitCanvas(document.getElementById("decayCanvas"));
        if (!f) return;
        const ctx = f.ctx, W = f.w, H = f.h;
        ctx.clearRect(0, 0, W, H);
        const gapX = W * 0.38;
        const midY = H * 0.55;
        const wig = x => Math.sin(x * 0.09) * H * 0.13 + Math.sin(x * 0.023) * H * 0.1;
        // measured part
        ctx.strokeStyle = "rgba(233,238,246,.85)";
        ctx.lineWidth = 2;
        ctx.beginPath();
        for (let x = 0; x <= gapX; x += 4) {
          const y = midY + wig(x);
          x ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
        }
        ctx.stroke();
        // uncertainty cone grows on a 5-s loop
        const p = smooth01(((elapsed % 5) / 5) * 1.4);
        const y0 = midY + wig(gapX);
        const coneW = (W - gapX) * clamp(p, 0, 1);
        if (coneW > 2) {
          ctx.fillStyle = "rgba(230,112,75,.16)";
          ctx.beginPath();
          ctx.moveTo(gapX, y0);
          ctx.lineTo(gapX + coneW, y0 - coneW * 0.42);
          ctx.lineTo(gapX + coneW, y0 + coneW * 0.42);
          ctx.closePath();
          ctx.fill();
          // three diverging guesses
          [[-0.32, "rgba(230,112,75,.8)"], [0.02, "rgba(88,207,195,.8)"], [0.3, "rgba(255,180,84,.8)"]].forEach(function (g) {
            ctx.strokeStyle = g[1];
            ctx.lineWidth = 1.6;
            ctx.setLineDash([5, 4]);
            ctx.beginPath();
            ctx.moveTo(gapX, y0);
            for (let x = 0; x <= coneW; x += 5)
              ctx.lineTo(gapX + x, y0 + x * g[0] + Math.sin(x * 0.06) * 4);
            ctx.stroke();
            ctx.setLineDash([]);
          });
        }
        // "2-yr" marker
        ctx.strokeStyle = "rgba(147,164,188,.5)";
        ctx.setLineDash([3, 4]);
        const mx = gapX + (W - gapX) * 0.42;
        ctx.beginPath(); ctx.moveTo(mx, H * 0.08); ctx.lineTo(mx, H * 0.95); ctx.stroke();
        ctx.setLineDash([]);
        ctx.font = "16px 'Avenir Next', sans-serif";
        ctx.fillStyle = "rgba(147,164,188,.85)";
        ctx.textAlign = "center";
        ctx.fillText("~3-yr gap", mx, H * 0.08 - 1 + 10);
      }
    });
  })();

  // ---- 2b · hydrogeology: sequential annotation overlay on figure01 ----
  (function () {
    let elapsed = 0, dots = null;
    // Wasatch Front axis (extends slightly beyond Ogden→Provo), figure01 coords
    const A = [0.699, 0.300], B = [0.750, 0.548];
    const T0 = [0.9, 3.1, 5.3, 7.5, 9.7];           // stage fade-in times, matching list reveals
    const ARROWS = [                                 // mountain-front recharge, eastern margin
      [0.845, 0.165, -1, 0.30], [0.856, 0.225, -1, 0.25], [0.838, 0.330, -1, 0.20],
      [0.818, 0.430, -1, 0.12], [0.792, 0.525, -1, 0.02]
    ];
    const EXCH = [[0.705, 0.175], [0.735, 0.335], [0.705, 0.462]];  // Bear · Weber · Jordan
    function dSeg(x, y) {                            // distance to the Front axis
      const dx = B[0] - A[0], dy = B[1] - A[1];
      const t = clamp(((x - A[0]) * dx + (y - A[1]) * dy) / (dx * dx + dy * dy), 0, 1);
      return Math.hypot(x - (A[0] + dx * t), y - (A[1] + dy * t));
    }
    function nearLake(x, y) { return x > 0.52 && x < 0.71 && y > 0.20 && y < 0.445; }
    function buildDots() {
      dots = { valley: [], volcanic: [], desert: [] };
      for (let gy = 0.03; gy < 0.97; gy += 0.017) for (let gx = 0.28; gx < 0.90; gx += 0.017) {
        const x = gx + (Math.random() - 0.5) * 0.011, y = gy + (Math.random() - 0.5) * 0.011;
        if (!inBasin(x, y) || nearLake(x, y)) continue;
        if (dSeg(x, y) < 0.034) dots.valley.push([x, y]);
        else if (x < 0.56 && y > 0.54) dots.volcanic.push([x, y]);
        else if (x < 0.53 && y > 0.16 && y < 0.52) dots.desert.push([x, y]);
      }
    }
    reg("s-hydro", {
      enter: function () { elapsed = 0; if (!dots) buildDots(); },
      tick: function (dt) {
        elapsed += dt;
        const f = fitCanvas(document.getElementById("hydroGeoCanvas"));
        if (!f) return;
        const ctx = f.ctx, W = f.w, H = f.h;
        ctx.clearRect(0, 0, W, H);
        const sA = T0.map(function (t0) { return smooth01((elapsed - t0) / 1.1); });

        // stage 0 · valley-fill aquifers (amber stipple along the Wasatch Front)
        if (sA[0] > 0.01) {
          ctx.fillStyle = "rgba(255,180,84," + (0.55 * sA[0]).toFixed(3) + ")";
          dots.valley.forEach(function (p) {
            ctx.beginPath(); ctx.arc(p[0] * W, p[1] * H, 2.2, 0, Math.PI * 2); ctx.fill();
          });
        }
        // stage 1 · fractured volcanic-rock aquifers (coral triangles, SW arm)
        if (sA[1] > 0.01) {
          ctx.fillStyle = "rgba(230,112,75," + (0.5 * sA[1]).toFixed(3) + ")";
          dots.volcanic.forEach(function (p) {
            const x = p[0] * W, y = p[1] * H;
            ctx.beginPath(); ctx.moveTo(x, y - 2.7); ctx.lineTo(x + 2.5, y + 2.1); ctx.lineTo(x - 2.5, y + 2.1);
            ctx.closePath(); ctx.fill();
          });
        }
        // stage 3 · western desert, minimal development (faint gray stipple)
        if (sA[3] > 0.01) {
          ctx.fillStyle = "rgba(147,164,188," + (0.4 * sA[3]).toFixed(3) + ")";
          dots.desert.forEach(function (p) {
            ctx.beginPath(); ctx.arc(p[0] * W, p[1] * H, 1.6, 0, Math.PI * 2); ctx.fill();
          });
        }
        // stage 2 · mountain-front recharge arrows (teal, gently pulsing)
        if (sA[2] > 0.01) {
          ARROWS.forEach(function (ar, i) {
            const n = Math.hypot(ar[2], ar[3]), ux = ar[2] / n, uy = ar[3] / n;
            const a = sA[2] * (0.65 + 0.3 * Math.sin(elapsed * 2 + i * 1.1));
            const x0 = ar[0] * W, y0 = ar[1] * H, L = Math.min(W, H) * 0.045;
            const x1 = x0 + ux * L, y1 = y0 + uy * L;
            ctx.strokeStyle = "rgba(88,207,195," + a.toFixed(3) + ")";
            ctx.lineWidth = 2.4; ctx.lineCap = "round";
            ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); ctx.stroke();
            const ha = Math.atan2(uy, ux);
            ctx.beginPath();
            ctx.moveTo(x1, y1);
            ctx.lineTo(x1 - 7 * Math.cos(ha - 0.5), y1 - 7 * Math.sin(ha - 0.5));
            ctx.moveTo(x1, y1);
            ctx.lineTo(x1 - 7 * Math.cos(ha + 0.5), y1 - 7 * Math.sin(ha + 0.5));
            ctx.stroke();
          });
        }
        // stage 4 · river–aquifer exchange (blue two-headed arrows, pulsing)
        if (sA[4] > 0.01) {
          EXCH.forEach(function (p, i) {
            const s = 1 + 0.18 * Math.sin(elapsed * 2.6 + i * 2);
            const x = p[0] * W, y = p[1] * H, hl = 9 * s;
            ctx.strokeStyle = "rgba(120,185,235," + (0.9 * sA[4]).toFixed(3) + ")";
            ctx.lineWidth = 2.2; ctx.lineCap = "round";
            ctx.beginPath(); ctx.moveTo(x, y - hl); ctx.lineTo(x, y + hl); ctx.stroke();
            [[-1, y - hl, 1], [1, y + hl, -1]].forEach(function (h) {
              ctx.beginPath();
              ctx.moveTo(x - 4, h[1] + 4 * h[2]); ctx.lineTo(x, h[1]); ctx.lineTo(x + 4, h[1] + 4 * h[2]);
              ctx.stroke();
            });
          });
        }

        // labels (pills with leader lines), drawn last
        function pill(nx, ny, text, col, a, ax, ay, alignRight) {
          if (a <= 0.01) return;
          ctx.globalAlpha = a;
          ctx.font = "600 17px 'Avenir Next', sans-serif";
          ctx.textAlign = "left";
          const w = ctx.measureText(text).width;
          const lx = alignRight ? nx * W - w : nx * W;
          if (ax != null) {
            const ex = (ax * W < lx + w / 2) ? lx - 9 : lx + w + 9;
            ctx.strokeStyle = "rgba(233,238,246,.55)"; ctx.lineWidth = 1;
            ctx.beginPath(); ctx.moveTo(ax * W, ay * H); ctx.lineTo(ex, ny * H); ctx.stroke();
          }
          ctx.fillStyle = "rgba(6,13,23,.8)";
          ctx.beginPath(); ctx.roundRect(lx - 9, ny * H - 12, w + 18, 22, 11); ctx.fill();
          ctx.strokeStyle = "rgba(147,164,188,.4)"; ctx.lineWidth = 1; ctx.stroke();
          ctx.fillStyle = col;
          ctx.fillText(text, lx, ny * H + 4);
          ctx.globalAlpha = 1;
        }
        pill(0.985, 0.455, "valley-fill aquifers", "rgba(255,190,105,.95)", sA[0], 0.748, 0.505, true);
        pill(0.430, 0.710, "fractured volcanic-rock aquifers", "rgba(235,135,100,.95)", sA[1], 0.445, 0.760, false);
        pill(0.978, 0.585, "mountain-front recharge", "rgba(120,215,205,.95)", sA[2], 0.792, 0.528, true);
        pill(0.400, 0.400, "western desert · minimal development", "rgba(220,228,240,.9)", sA[3], 0.405, 0.365, true);
        pill(0.440, 0.475, "river–aquifer exchange", "rgba(150,200,240,.95)", sA[4], 0.694, 0.462, false);
      }
    });
  })();

  // ---- 7b · GWDM workflow: stepwise band highlight over figure02 ----
  (function () {
    const BANDS = [[0, 0.275], [0.275, 0.525], [0.525, 0.77], [0.77, 1.0]]; // panels a–d
    const INTRO = 0.6, STAGE = 3.8, HOLD = 3.4;
    const CYC = INTRO + STAGE * 4 + HOLD;
    let elapsed = 0, alphas = [0, 0, 0, 0];
    reg("s-gwdm", {
      enter: function () { elapsed = 0; alphas = [0, 0, 0, 0]; },
      tick: function (dt) {
        elapsed += dt;
        const t = elapsed % CYC;
        let k = -1;
        if (t >= INTRO && t < INTRO + STAGE * 4) k = Math.floor((t - INTRO) / STAGE);
        for (let j = 0; j < 4; j++) {
          const target = (k === -1) ? 0 : (j === k ? 0 : 0.55);
          alphas[j] += (target - alphas[j]) * Math.min(1, dt * 5);
        }
        const f = fitCanvas(document.getElementById("gwdmCanvas"));
        if (f) {
          const ctx = f.ctx, W = f.w, H = f.h;
          ctx.clearRect(0, 0, W, H);
          for (let j = 0; j < 4; j++) {
            if (alphas[j] > 0.012) {
              ctx.fillStyle = "rgba(6,13,23," + alphas[j].toFixed(3) + ")";
              ctx.fillRect(0, BANDS[j][0] * H, W, (BANDS[j][1] - BANDS[j][0]) * H + 1);
            }
          }
          if (k >= 0) {
            ctx.strokeStyle = "rgba(255,180,84,.9)";
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.roundRect(4, BANDS[k][0] * H + 3, W - 8, (BANDS[k][1] - BANDS[k][0]) * H - 6, 8);
            ctx.stroke();
          }
        }
        for (let j = 0; j < 4; j++) {
          const el = document.getElementById("gwdmStep" + j);
          if (el) el.classList.toggle("on", k === j || (k === -1 && t > INTRO));
        }
      }
    });
  })();

  // ---- 6d · the path to a well: snow, rain, losses, percolation, water table ----
  (function () {
    let elapsed = 0;
    const CYC = 18;
    function rnd(i) { const x = Math.sin(i * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); }
    reg("s-journey", {
      enter: function () { elapsed = 0; },
      tick: function (dt) {
        elapsed += dt;
        const f = fitCanvas(document.getElementById("journeyCanvas"));
        if (!f) return;
        const ctx = f.ctx, W = f.w, H = f.h;
        ctx.clearRect(0, 0, W, H);
        const T = elapsed % CYC;
        const fade = T > CYC - 0.8 ? smooth01((CYC - T) / 0.8) : 1;
        const SANS = "'Avenir Next', sans-serif";

        // ── terrain profile: mountain (left) sloping to valley floor ──
        const valleyY = H * 0.56, peakX = W * 0.16, peakY = H * 0.14, footX = W * 0.36;
        function surfY(x) {
          if (x <= peakX) return peakY + (valleyY - peakY) * Math.pow((peakX - x) / peakX, 1.6);
          if (x <= footX) return peakY + (valleyY - peakY) * Math.pow((x - peakX) / (footX - peakX), 1.25);
          return valleyY;
        }
        const wtBase = H * 0.80;

        // subsurface fill (unsaturated zone) + stipple
        ctx.beginPath();
        ctx.moveTo(0, H); ctx.lineTo(0, surfY(0));
        for (let x = 0; x <= W; x += 6) ctx.lineTo(x, surfY(x));
        ctx.lineTo(W, H); ctx.closePath();
        ctx.fillStyle = "rgba(170,150,120,.07)";
        ctx.fill();
        for (let k = 0; k < 220; k++) {
          const sx = W * rnd(k);
          const syr = rnd(k + 500);
          const sy = surfY(sx) + 10 + (H - 14 - surfY(sx)) * syr;
          if (sy < H - 6) {
            ctx.fillStyle = "rgba(190,175,150," + (0.06 + 0.08 * rnd(k + 900)).toFixed(3) + ")";
            ctx.beginPath(); ctx.arc(sx, sy, 1 + 1.3 * rnd(k + 1300), 0, Math.PI * 2); ctx.fill();
          }
        }
        // terrain line
        ctx.strokeStyle = "rgba(147,164,188,.55)";
        ctx.lineWidth = 1.8;
        ctx.beginPath();
        for (let x = 0; x <= W; x += 6) x ? ctx.lineTo(x, surfY(x)) : ctx.moveTo(0, surfY(0));
        ctx.stroke();

        // ── mound + water table (rises late in the cycle) ──
        const pWT = smooth01((T - 11.2) / 1.8) * fade;
        const mSig = W * 0.16;
        function wtSurf(x) {
          const d1 = x - W * 0.33, d2 = x - W * 0.52;
          return wtBase
            - H * 0.055 * pWT * Math.exp(-(d1 * d1) / (2 * mSig * mSig))
            - H * 0.030 * pWT * Math.exp(-(d2 * d2) / (2 * mSig * mSig));
        }
        ctx.beginPath();
        ctx.moveTo(0, H); ctx.lineTo(0, wtSurf(0));
        for (let x = 0; x <= W; x += 6) ctx.lineTo(x, wtSurf(x));
        ctx.lineTo(W, H); ctx.closePath();
        const bz = ctx.createLinearGradient(0, wtBase - H * 0.06, 0, H);
        bz.addColorStop(0, "rgba(90,169,230,.22)");
        bz.addColorStop(1, "rgba(90,169,230,.06)");
        ctx.fillStyle = bz;
        ctx.fill();
        ctx.strokeStyle = "rgba(90,169,230,.8)";
        ctx.lineWidth = 1.8;
        ctx.setLineDash([6, 5]);
        ctx.beginPath();
        for (let x = 0; x <= W; x += 6) x ? ctx.lineTo(x, wtSurf(x)) : ctx.moveTo(0, wtSurf(0));
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.font = "15px " + SANS;
        ctx.fillStyle = "rgba(147,164,188,.75)";
        ctx.textAlign = "left";
        ctx.fillText("water table", 14, wtBase + 22);
        ctx.fillText("unsaturated zone", 14, (valleyY + wtBase) / 2 + 30);

        // ── monitoring well at right ──
        const wx = W * 0.74, wTop = valleyY, wBot = H * 0.93, wW = 13;
        ctx.fillStyle = "rgba(20,30,44,.9)";
        ctx.fillRect(wx - wW / 2, wTop - 14, wW, wBot - wTop + 14);
        ctx.strokeStyle = "rgba(220,228,240,.75)";
        ctx.lineWidth = 1.6;
        ctx.strokeRect(wx - wW / 2, wTop - 14, wW, wBot - wTop + 14);
        // screen (dashes at depth)
        ctx.strokeStyle = "rgba(220,228,240,.5)";
        for (let y = wBot - 36; y < wBot - 4; y += 7) {
          ctx.beginPath(); ctx.moveTo(wx - wW / 2 - 3, y); ctx.lineTo(wx - wW / 2 + 2, y); ctx.stroke();
          ctx.beginPath(); ctx.moveTo(wx + wW / 2 - 2, y); ctx.lineTo(wx + wW / 2 + 3, y); ctx.stroke();
        }
        // water level inside the casing tracks the water table
        const wl = wtSurf(wx) + 3;
        ctx.fillStyle = "rgba(90,169,230,.7)";
        ctx.fillRect(wx - wW / 2 + 1.5, wl, wW - 3, wBot - wl - 2);
        // wellhead cap
        ctx.fillStyle = "rgba(220,228,240,.85)";
        ctx.fillRect(wx - wW / 2 - 4, wTop - 20, wW + 8, 7);
        ctx.font = "600 15px " + SANS;
        ctx.fillStyle = "rgba(220,228,240,.9)";
        ctx.textAlign = "center";
        ctx.fillText("monitoring well", wx, wTop - 30);

        // ── tree (canopy interception site) on the valley floor ──
        const tx = W * 0.52, tTop = valleyY - H * 0.14;
        ctx.strokeStyle = "rgba(160,130,95,.9)";
        ctx.lineWidth = 5;
        ctx.beginPath(); ctx.moveTo(tx, valleyY); ctx.lineTo(tx, tTop + 16); ctx.stroke();
        ctx.fillStyle = "rgba(110,180,120,.8)";
        [[0, 0, 26], [-20, 12, 19], [20, 12, 19]].forEach(function (c) {
          ctx.beginPath(); ctx.arc(tx + c[0], tTop + c[1], c[2], 0, Math.PI * 2); ctx.fill();
        });

        // ── snowpack on the peak (accumulates, then melts) ──
        const acc = smooth01((T - 0.6) / 2.6);
        const melt = smooth01((T - 5.4) / 2.6);
        const packA = Math.max(0, acc - melt) * fade;
        if (packA > 0.01) {
          ctx.globalAlpha = Math.min(1, packA * 1.5);
          const th = 10 + 12 * packA;
          ctx.strokeStyle = "rgba(235,242,250,.95)";
          ctx.lineWidth = th;
          ctx.lineCap = "round";
          ctx.beginPath();
          for (let x = peakX * 0.35; x <= peakX + (footX - peakX) * 0.42; x += 5) {
            const y = surfY(x) - th / 2 + 2;
            x === peakX * 0.35 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
          }
          ctx.stroke();
          ctx.lineCap = "butt";
          ctx.globalAlpha = 1;
        }

        // ── weather: snow over the mountain, rain over the valley ──
        const storm = smooth01((T - 0.4) / 0.6) * (1 - smooth01((T - 4.6) / 0.8)) * fade;
        if (storm > 0.01) {
          ctx.globalAlpha = storm;
          ctx.fillStyle = "rgba(200,215,235,.28)";
          [[W * 0.14, H * 0.06, 30], [W * 0.20, H * 0.05, 24], [W * 0.55, H * 0.07, 30], [W * 0.62, H * 0.06, 24], [W * 0.48, H * 0.08, 24]].forEach(function (c) {
            ctx.beginPath(); ctx.arc(c[0], c[1], c[2], 0, Math.PI * 2); ctx.fill();
          });
          // snowflakes (mountain)
          ctx.fillStyle = "rgba(235,242,250,.9)";
          for (let k = 0; k < 18; k++) {
            const sx = W * 0.04 + W * 0.24 * rnd(k + 30);
            const ph = (T * 0.35 + rnd(k + 80)) % 1;
            const sy = H * 0.10 + (surfY(sx) - H * 0.13) * ph;
            ctx.beginPath(); ctx.arc(sx + 4 * Math.sin(T * 2 + k), sy, 1.8, 0, Math.PI * 2); ctx.fill();
          }
          // rain streaks (valley)
          ctx.strokeStyle = "rgba(127,209,230,.6)";
          ctx.lineWidth = 1.3;
          for (let k = 0; k < 22; k++) {
            const sx = W * 0.42 + W * 0.26 * rnd(k + 130);
            const ph = (T * 1.7 + rnd(k + 180)) % 1;
            const sy = H * 0.10 + (valleyY - H * 0.13) * ph;
            ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(sx - 2, sy + 9); ctx.stroke();
          }
          ctx.font = "600 15px " + SANS;
          ctx.textAlign = "center";
          ctx.fillStyle = "rgba(235,242,250,.95)";
          ctx.fillText("snow", W * 0.17, H * 0.05 - 8);
          ctx.fillStyle = "rgba(127,209,230,.95)";
          ctx.fillText("rain", W * 0.55, H * 0.05 - 4);
          ctx.globalAlpha = 1;
        }

        // ── losses: interception at the canopy, then evapotranspiration ──
        const pInt = smooth01((T - 2.4) / 0.8) * (1 - smooth01((T - 7.6) / 0.8)) * fade;
        if (pInt > 0.01) {
          ctx.globalAlpha = pInt;
          ctx.fillStyle = "rgba(255,196,120,.9)";
          for (let k = 0; k < 5; k++) {
            const ph = (T * 0.5 + rnd(k + 240)) % 1;
            ctx.beginPath();
            ctx.arc(tx - 22 + 44 * rnd(k + 260), tTop + 6 - 26 * ph, 1.8, 0, Math.PI * 2);
            ctx.fill();
          }
          ctx.font = "600 15px " + SANS;
          ctx.textAlign = "left";
          ctx.fillStyle = "rgba(255,196,120,.95)";
          ctx.fillText("interception", tx + 34, tTop - 12);
          ctx.globalAlpha = 1;
        }
        const pET = smooth01((T - 3.6) / 0.9) * (1 - smooth01((T - 8.6) / 0.8)) * fade;
        if (pET > 0.01) {
          ctx.globalAlpha = pET;
          ctx.strokeStyle = "rgba(255,180,84,.8)";
          ctx.lineWidth = 1.6;
          [tx - 40, tx + 46, tx + 110].forEach(function (ax, i) {
            const yb = ax > tx + 80 ? valleyY : tTop + 4;
            const rise = 26 + 6 * i;
            ctx.beginPath();
            for (let u = 0; u <= 1; u += 0.08) {
              const y = yb - rise * u - 8 * smooth01((T * 0.6) % 1);
              const x = ax + 4 * Math.sin(u * 9 + T * 3);
              u ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
            }
            ctx.stroke();
          });
          ctx.font = "600 15px " + SANS;
          ctx.textAlign = "left";
          ctx.fillStyle = "rgba(255,180,84,.95)";
          ctx.fillText("evapotranspiration", tx + 96, tTop + 6);
          ctx.globalAlpha = 1;
        }

        // ── snowmelt runoff down the mountain front ──
        const pRun = smooth01((T - 5.6) / 1.0) * (1 - smooth01((T - 10.4) / 1.0)) * fade;
        if (pRun > 0.01) {
          ctx.globalAlpha = pRun;
          ctx.strokeStyle = "rgba(127,209,230,.85)";
          ctx.lineWidth = 2.2;
          ctx.beginPath();
          for (let x = peakX + 6; x <= footX - 4; x += 5) {
            const y = surfY(x) - 3 - 2 * Math.sin(x * 0.15 + T * 5);
            x <= peakX + 6 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
          }
          ctx.stroke();
          ctx.font = "600 15px " + SANS;
          ctx.textAlign = "left";
          ctx.fillStyle = "rgba(127,209,230,.95)";
          ctx.fillText("snowmelt · runoff", W * 0.205, surfY(W * 0.26) - 14);
          ctx.globalAlpha = 1;
        }

        // ── infiltration + percolation plumes ──
        function plume(cx, t0, dur, w0, w1, label) {
          const u = smooth01((T - t0) / dur);
          if (u <= 0 || fade <= 0) return 0;
          ctx.globalAlpha = fade;
          const y0 = surfY(cx), y1 = wtSurf(cx) - 2;
          const headY = y0 + (y1 - y0) * u;
          const wHead = w0 + (w1 - w0) * u;
          ctx.beginPath();
          ctx.moveTo(cx - w0 / 2, y0);
          ctx.lineTo(cx - wHead / 2, headY);
          ctx.quadraticCurveTo(cx, headY + 12, cx + wHead / 2, headY);
          ctx.lineTo(cx + w0 / 2, y0);
          ctx.closePath();
          const pg = ctx.createLinearGradient(0, y0, 0, headY + 12);
          pg.addColorStop(0, "rgba(88,207,195,.08)");
          pg.addColorStop(0.75, "rgba(88,207,195,.2)");
          pg.addColorStop(1, "rgba(88,207,195,.45)");
          ctx.fillStyle = pg;
          ctx.fill();
          const hg = ctx.createRadialGradient(cx, headY, 2, cx, headY, wHead);
          hg.addColorStop(0, "rgba(120,225,210,.5)");
          hg.addColorStop(1, "rgba(120,225,210,0)");
          ctx.fillStyle = hg;
          ctx.beginPath(); ctx.arc(cx, headY, wHead, 0, Math.PI * 2); ctx.fill();
          ctx.globalAlpha = 1;
          return u;
        }
        const u1 = plume(W * 0.33, 6.4, 5.2, 18, 40);
        const u2 = plume(W * 0.52, 7.0, 5.0, 14, 30);
        const pLab = smooth01((T - 7.2) / 0.8) * (1 - smooth01((T - 11.6) / 0.8)) * fade;
        if (pLab > 0.01) {
          ctx.globalAlpha = pLab;
          ctx.font = "600 15px " + SANS;
          ctx.textAlign = "left";
          ctx.fillStyle = "rgba(120,225,210,.95)";
          ctx.fillText("infiltration · percolation", W * 0.375, (valleyY + wtBase) / 2 + 6);
          ctx.globalAlpha = 1;
        }

        // ── the well records the rise ──
        const pRec = smooth01((T - 13.2) / 1.0) * fade;
        if (pRec > 0.01) {
          ctx.globalAlpha = pRec;
          const ringR = 26 + 10 * Math.sin(T * 2.4);
          ctx.strokeStyle = "rgba(255,180,84,.8)";
          ctx.lineWidth = 1.6;
          ctx.beginPath(); ctx.ellipse(wx, wl, Math.max(18, ringR), 8, 0, 0, Math.PI * 2); ctx.stroke();
          ctx.font = "italic 600 17px 'Iowan Old Style', Georgia, serif";
          ctx.textAlign = "left";
          ctx.fillStyle = "#ffb454";
          ctx.fillText("the water-table rise,", wx + 40, wl - 16);
          ctx.fillText("recorded at the well", wx + 40, wl + 6);
          ctx.globalAlpha = 1;
        }
      }
    });
  })();

  // ---- 13b · management implications: subsurface recharge cross-section ----
  (function () {
    let elapsed = 0;
    const CYC = 12;                                   // full loop: rain → percolation → mound → brace → fade
    function rnd(i) { const x = Math.sin(i * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); }
    reg("s-implic", {
      enter: function () { elapsed = 0; },
      tick: function (dt) {
        elapsed += dt;
        const f = fitCanvas(document.getElementById("implicCanvas"));
        if (!f) return;
        const ctx = f.ctx, W = f.w, H = f.h;
        ctx.clearRect(0, 0, W, H);
        const T = elapsed % CYC;
        const fade = T > CYC - 0.7 ? smooth01((CYC - T) / 0.7) : 1;   // dynamic layer fades for a clean loop
        const padL = 70, padR = 70;
        const X = function (i) { return padL + (W - padL - padR) * i / 3; };
        const groundY = H * 0.30, wtY = H * 0.72;
        const rainX = X(1);

        // ── static geology ──
        // unsaturated zone: faint sediment wash + deterministic stipple
        const gz = ctx.createLinearGradient(0, groundY, 0, wtY);
        gz.addColorStop(0, "rgba(170,150,120,.10)");
        gz.addColorStop(1, "rgba(170,150,120,.045)");
        ctx.fillStyle = gz;
        ctx.fillRect(padL - 26, groundY, W - padL - padR + 52, wtY - groundY);
        for (let k = 0; k < 160; k++) {
          const sx = padL - 20 + (W - padL - padR + 40) * rnd(k);
          const sy = groundY + 8 + (wtY - groundY - 16) * rnd(k + 500);
          ctx.fillStyle = "rgba(190,175,150," + (0.07 + 0.09 * rnd(k + 900)).toFixed(3) + ")";
          ctx.beginPath(); ctx.arc(sx, sy, 1 + 1.4 * rnd(k + 1300), 0, Math.PI * 2); ctx.fill();
        }
        // land surface with grass ticks
        ctx.strokeStyle = "rgba(147,164,188,.5)";
        ctx.lineWidth = 1.6;
        ctx.beginPath(); ctx.moveTo(padL - 26, groundY); ctx.lineTo(W - padR + 26, groundY); ctx.stroke();
        ctx.strokeStyle = "rgba(127,209,140,.4)";
        ctx.lineWidth = 1;
        for (let k = 0; k < 60; k++) {
          const gx = padL - 20 + (W - padL - padR + 40) * (k / 59);
          ctx.beginPath(); ctx.moveTo(gx, groundY); ctx.lineTo(gx + 2 * (rnd(k + 60) - 0.5), groundY - 4 - 3 * rnd(k)); ctx.stroke();
        }

        // ── water table with storage mound (rises when the front arrives) ──
        const p3 = smooth01((T - 7.6) / 1.4) * fade;
        const sig = (X(1) - X(0)) * 0.55;
        function wtSurf(x) {
          const d = x - rainX;
          return wtY - H * 0.10 * p3 * Math.exp(-(d * d) / (2 * sig * sig));
        }
        // saturated zone fill
        ctx.beginPath();
        ctx.moveTo(padL - 26, H - 8);
        for (let x = padL - 26; x <= W - padR + 26; x += 4) ctx.lineTo(x, wtSurf(x));
        ctx.lineTo(W - padR + 26, H - 8);
        ctx.closePath();
        const bz = ctx.createLinearGradient(0, wtY - H * 0.1, 0, H);
        bz.addColorStop(0, "rgba(90,169,230,.20)");
        bz.addColorStop(1, "rgba(90,169,230,.05)");
        ctx.fillStyle = bz;
        ctx.fill();
        // water-table line
        ctx.strokeStyle = "rgba(90,169,230,.75)";
        ctx.lineWidth = 1.8;
        ctx.setLineDash([6, 5]);
        ctx.beginPath();
        for (let x = padL - 26; x <= W - padR + 26; x += 4)
          x === padL - 26 ? ctx.moveTo(x, wtSurf(x)) : ctx.lineTo(x, wtSurf(x));
        ctx.stroke();
        ctx.setLineDash([]);

        // zone labels
        ctx.font = "16px 'Avenir Next', sans-serif";
        ctx.textAlign = "left";
        ctx.fillStyle = "rgba(147,164,188,.75)";
        ctx.fillText("land surface", padL - 22, groundY - 8);
        ctx.fillText("water table", padL - 22, wtY + 20);
        ctx.fillStyle = "rgba(170,155,130,.8)";
        ctx.fillText("unsaturated zone", padL - 22, (groundY + wtY) / 2 + 4);

        // ── timeline along the bottom with a sweeping time cursor ──
        ctx.textAlign = "center";
        ["year n − 1", "year n", "year n + 1", "year n + 2"].forEach(function (lab, i) {
          ctx.strokeStyle = "rgba(147,164,188,.5)";
          ctx.beginPath(); ctx.moveTo(X(i), H - 26); ctx.lineTo(X(i), H - 20); ctx.stroke();
          ctx.fillStyle = "rgba(147,164,188,.8)";
          ctx.font = "16px 'Avenir Next', sans-serif";
          ctx.fillText(lab, X(i), H - 6);
        });
        ctx.strokeStyle = "rgba(147,164,188,.35)";
        ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(X(0), H - 23); ctx.lineTo(X(3), H - 23); ctx.stroke();

        // ── 1 · rain event at year n ──
        const rainOn = smooth01((T - 0.3) / 0.5) * (1 - smooth01((T - 2.6) / 0.6));
        if (rainOn > 0.01) {
          ctx.globalAlpha = rainOn * fade;
          const cy = H * 0.10;
          ctx.fillStyle = "rgba(200,215,235,.30)";
          [[-26, 0, 20], [0, -8, 25], [26, 0, 19]].forEach(function (c) {
            ctx.beginPath(); ctx.arc(rainX + c[0], cy + c[1], c[2], 0, Math.PI * 2); ctx.fill();
          });
          ctx.strokeStyle = "rgba(127,209,230,.65)";
          ctx.lineWidth = 1.4;
          for (let k = 0; k < 16; k++) {
            const dx = (rnd(k + 40) - 0.5) * 110;
            const ph = (T * 1.6 + rnd(k)) % 1;
            const dy = cy + 26 + (groundY - cy - 30) * ph;
            ctx.beginPath(); ctx.moveTo(rainX + dx, dy); ctx.lineTo(rainX + dx - 2, dy + 9); ctx.stroke();
          }
          ctx.fillStyle = "rgba(127,209,140,.95)";
          ctx.font = "600 17px 'Avenir Next', sans-serif";
          ctx.textAlign = "right";
          ctx.fillText("annual precipitation", rainX - 78, cy + 12);
          ctx.textAlign = "center";
          ctx.globalAlpha = 1;
        }

        // ── 2 · wetting front percolating through the unsaturated zone ──
        const uF = smooth01((T - 1.2) / 6.8);          // 0→1 over ≈ two model years
        if (uF > 0 && fade > 0) {
          ctx.globalAlpha = fade;
          const headY = groundY + (wtY - groundY - 4) * uF;
          const wTop = 16, wHead = 16 + 26 * uF;       // plume widens with depth
          // moist trail column
          ctx.beginPath();
          ctx.moveTo(rainX - wTop / 2, groundY);
          ctx.lineTo(rainX - wHead / 2, headY);
          ctx.quadraticCurveTo(rainX, headY + 14, rainX + wHead / 2, headY);
          ctx.lineTo(rainX + wTop / 2, groundY);
          ctx.closePath();
          const pg = ctx.createLinearGradient(0, groundY, 0, headY + 14);
          pg.addColorStop(0, "rgba(88,207,195,.10)");
          pg.addColorStop(0.75, "rgba(88,207,195,.22)");
          pg.addColorStop(1, "rgba(88,207,195,.50)");
          ctx.fillStyle = pg;
          ctx.fill();
          // bright wetting front at the head
          const hg = ctx.createRadialGradient(rainX, headY, 2, rainX, headY, wHead * 0.9);
          hg.addColorStop(0, "rgba(120,225,210,.55)");
          hg.addColorStop(1, "rgba(120,225,210,0)");
          ctx.fillStyle = hg;
          ctx.beginPath(); ctx.arc(rainX, headY, wHead * 0.9, 0, Math.PI * 2); ctx.fill();
          // trickling parcels inside the plume
          ctx.fillStyle = "rgba(150,230,220,.8)";
          for (let k = 0; k < 6; k++) {
            const ph = ((T * 0.22 + rnd(k + 70)) % 1) * uF;
            const py = groundY + (headY - groundY) * ph;
            const px = rainX + (rnd(k + 200) - 0.5) * (wTop + (wHead - wTop) * ph) * 0.8;
            ctx.beginPath(); ctx.arc(px, py + 4, 1.8, 0, Math.PI * 2); ctx.fill();
          }
          // elapsed-time chip riding beside the front: depth ↦ years
          const yrs = 2 * uF;
          if (uF > 0.06 && uF < 0.995) {
            ctx.font = "600 16px 'Avenir Next', sans-serif";
            ctx.textAlign = "left";
            ctx.fillStyle = "rgba(255,180,84,.95)";
            ctx.fillText("+" + yrs.toFixed(1) + " yr", rainX + wHead / 2 + 12, headY + 5);
            ctx.textAlign = "center";
          }
          // percolation label
          const lp = smooth01((T - 2.6) / 0.8) * (1 - smooth01((T - 7.3) / 0.6)) * fade;
          if (lp > 0) {
            ctx.globalAlpha = lp;
            ctx.fillStyle = "rgba(147,164,188,.85)";
            ctx.font = "16px 'Avenir Next', sans-serif";
            ctx.textAlign = "left";
            ctx.fillText("percolation through", rainX + 66, (groundY + wtY) / 2 - 8);
            ctx.fillText("the unsaturated zone", rainX + 66, (groundY + wtY) / 2 + 12);
            ctx.textAlign = "center";
            ctx.globalAlpha = fade;
          }
          // arrival ripple at the water table
          const pr = smooth01((T - 7.7) / 0.9);
          if (pr > 0 && pr < 1) {
            ctx.strokeStyle = "rgba(120,225,210," + (0.7 * (1 - pr)).toFixed(3) + ")";
            ctx.lineWidth = 1.6;
            ctx.beginPath(); ctx.ellipse(rainX, wtY, 10 + 46 * pr, 4 + 12 * pr, 0, 0, Math.PI * 2); ctx.stroke();
          }
          ctx.globalAlpha = 1;
        }

        // time cursor sweeps year n → n+2 in step with the front
        if (uF > 0 && fade > 0) {
          const tcx = X(1) + (X(3) - X(1)) * uF;
          ctx.globalAlpha = fade;
          ctx.fillStyle = "rgba(255,180,84,.9)";
          ctx.beginPath();
          ctx.moveTo(tcx, H - 30); ctx.lineTo(tcx - 5, H - 38); ctx.lineTo(tcx + 5, H - 38);
          ctx.closePath(); ctx.fill();
          ctx.globalAlpha = 1;
        }

        // storage-response label on the mound
        if (p3 > 0) {
          ctx.globalAlpha = p3;
          ctx.fillStyle = "rgba(120,215,205,.95)";
          ctx.font = "600 17px 'Avenir Next', sans-serif";
          ctx.fillText("storage response · year n + 1 → n + 2", rainX, wtSurf(rainX) - 12);
          ctx.globalAlpha = 1;
        }

        // ── 3 · lead-time brace in the sky ──
        const p4 = smooth01((T - 9.2) / 0.8) * fade;
        if (p4 > 0) {
          ctx.globalAlpha = p4;
          const by = H * 0.14;
          ctx.strokeStyle = "rgba(255,180,84,.9)";
          ctx.lineWidth = 1.8;
          ctx.beginPath(); ctx.moveTo(X(1) + 60, by); ctx.lineTo(X(3), by); ctx.stroke();
          [[X(1) + 60, 1], [X(3), -1]].forEach(function (e) {
            ctx.beginPath();
            ctx.moveTo(e[0] + 6 * e[1], by - 4); ctx.lineTo(e[0], by); ctx.lineTo(e[0] + 6 * e[1], by + 4);
            ctx.stroke();
          });
          ctx.font = "italic 600 18px 'Iowan Old Style', Georgia, serif";
          ctx.fillStyle = "#ffb454";
          ctx.fillText("1–2-year lead time", (X(1) + 60 + X(3)) / 2, by - 10);
          ctx.globalAlpha = 1;
        }
      }
    });
  })();

  // ---- 13c · short vs long gaps: two-panel imputation demonstration ----
  (function () {
    let elapsed = 0;
    // synthetic truth shaped like the GWSa record (Catmull-Rom of the annual series)
    const TRUTH = GWSA;
    const MEAN = TRUTH.reduce(function (a, b) { return a + b; }, 0) / TRUTH.length; // ≈ −2.1
    const CYC = 21;                                  // act 1 → act 2 → hold, then loop
    function series(t) { return sampleSeries(TRUTH, t); }
    reg("s-gapdemo", {
      enter: function () { elapsed = 0; },
      tick: function (dt) {
        elapsed += dt;
        const T = elapsed % CYC;
        const f = fitCanvas(document.getElementById("gapDemoCanvas"));
        if (!f) return;
        const ctx = f.ctx, W = f.w, H = f.h;
        ctx.clearRect(0, 0, W, H);
        const mid = W / 2;
        // panel divider
        ctx.strokeStyle = "rgba(147,164,188,.18)";
        ctx.beginPath(); ctx.moveTo(mid, 12); ctx.lineTo(mid, H - 12); ctx.stroke();

        const VMIN = -10, VMAX = 3.5, N = TRUTH.length - 1;
        function panel(x0, x1, gap0, gap1, actStart, longGap) {
          const padL = 46, padR = 22, padT = 34, padB = 30;
          const PX = function (t) { return x0 + padL + (x1 - x0 - padL - padR) * t / N; };
          const PY = function (v) { return padT + (H - padT - padB) * (VMAX - v) / (VMAX - VMIN); };
          const ta = T - actStart;
          if (ta <= 0) return;
          // axes
          ctx.strokeStyle = "rgba(147,164,188,.14)";
          ctx.lineWidth = 1;
          ctx.font = "16px 'Avenir Next', sans-serif";
          ctx.textAlign = "right";
          [0, -5, -10].forEach(function (v) {
            ctx.beginPath(); ctx.moveTo(x0 + padL, PY(v)); ctx.lineTo(x1 - padR, PY(v)); ctx.stroke();
            ctx.fillStyle = "rgba(147,164,188,.6)";
            ctx.fillText(v.toString(), x0 + padL - 6, PY(v) + 4);
          });
          // gap band highlights once the observed record is drawn
          const gb = smooth01((ta - 1.4) / 0.6);
          if (gb > 0) {
            ctx.fillStyle = "rgba(230,112,75," + (0.10 * gb).toFixed(3) + ")";
            ctx.fillRect(PX(gap0), padT, PX(gap1) - PX(gap0), H - padT - padB);
          }
          // observed series (excluding the gap), drawn 0 → 1.5 s
          const dp = smooth01(ta / 1.5);
          const upto = dp * N;
          ctx.strokeStyle = "rgba(233,238,246,.85)";
          ctx.lineWidth = 2;
          [[0, gap0], [gap1, N]].forEach(function (seg) {
            const a = seg[0], b = Math.min(seg[1], upto);
            if (b <= a) return;
            ctx.beginPath();
            const steps = Math.max(2, Math.round((b - a) * 8));
            for (let k = 0; k <= steps; k++) {
              const t = a + (b - a) * k / steps;
              k ? ctx.lineTo(PX(t), PY(series(t))) : ctx.moveTo(PX(t), PY(series(t)));
            }
            ctx.stroke();
          });
          // withheld truth across the gap (dashed, faint), from 2.2 s
          const tp = smooth01((ta - 2.2) / 1.2);
          if (tp > 0) {
            ctx.strokeStyle = "rgba(233,238,246," + (0.4 * tp).toFixed(3) + ")";
            ctx.lineWidth = 1.6;
            ctx.setLineDash([4, 5]);
            ctx.beginPath();
            const b = gap0 + (gap1 - gap0) * tp;
            const steps = Math.max(2, Math.round((b - gap0) * 10));
            for (let k = 0; k <= steps; k++) {
              const t = gap0 + (b - gap0) * k / steps;
              k ? ctx.lineTo(PX(t), PY(series(t))) : ctx.moveTo(PX(t), PY(series(t)));
            }
            ctx.stroke();
            ctx.setLineDash([]);
            ctx.textAlign = "left";
            ctx.fillStyle = "rgba(233,238,246," + (0.55 * tp).toFixed(3) + ")";
            ctx.fillText("withheld truth", PX(gap0) + 4, padT + 14);
          }
          // reconstruction across the gap, from 3.6 s
          const rp = smooth01((ta - 3.6) / 1.6);
          if (rp > 0) {
            const v0 = series(gap0), v1 = series(gap1);
            function recon(t) {
              const u = (t - gap0) / (gap1 - gap0);
              if (!longGap) return series(t) + 0.18 * Math.sin(u * Math.PI); // PCHIP-like: tracks truth
              // ELM-like: relaxes from the last observation toward the climatological mean,
              // then blends back to the resuming observations near the gap's end
              const relax = v0 + (MEAN - v0) * (1 - Math.exp(-u * 3.2));
              const w = smooth01((u - 0.8) / 0.2);
              return relax * (1 - w) + v1 * w;
            }
            // divergence shading (long gap only), grows with the reconstruction
            if (longGap) {
              const b = gap0 + (gap1 - gap0) * rp;
              ctx.beginPath();
              const steps = 40;
              for (let k = 0; k <= steps; k++) {
                const t = gap0 + (b - gap0) * k / steps;
                k ? ctx.lineTo(PX(t), PY(recon(t))) : ctx.moveTo(PX(t), PY(recon(t)));
              }
              for (let k = steps; k >= 0; k--) {
                const t = gap0 + (b - gap0) * k / steps;
                ctx.lineTo(PX(t), PY(series(t)));
              }
              ctx.closePath();
              ctx.fillStyle = "rgba(230,112,75,.20)";
              ctx.fill();
            }
            ctx.strokeStyle = longGap ? "rgba(255,180,84,.95)" : "rgba(88,207,195,.95)";
            ctx.lineWidth = 2.2;
            ctx.setLineDash([7, 5]);
            ctx.beginPath();
            const b = gap0 + (gap1 - gap0) * rp;
            const steps = Math.max(2, Math.round((b - gap0) * 10));
            for (let k = 0; k <= steps; k++) {
              const t = gap0 + (b - gap0) * k / steps;
              k ? ctx.lineTo(PX(t), PY(recon(t))) : ctx.moveTo(PX(t), PY(recon(t)));
            }
            ctx.stroke();
            ctx.setLineDash([]);
            ctx.textAlign = "left";
            ctx.fillStyle = longGap ? "rgba(255,180,84,.95)" : "rgba(120,215,205,.95)";
            ctx.font = "600 17px 'Avenir Next', sans-serif";
            ctx.fillText(longGap ? "learned reconstruction" : "PCHIP reconstruction", PX(gap0) + 4, H - padB - 8);
            // climatological-mean reference (long gap only)
            if (longGap) {
              ctx.strokeStyle = "rgba(147,164,188,.5)";
              ctx.setLineDash([2, 6]);
              ctx.beginPath(); ctx.moveTo(x0 + padL, PY(MEAN)); ctx.lineTo(x1 - padR, PY(MEAN)); ctx.stroke();
              ctx.setLineDash([]);
              ctx.fillStyle = "rgba(147,164,188,.75)";
              ctx.font = "16px 'Avenir Next', sans-serif";
              ctx.textAlign = "right";
              ctx.fillText("climatological mean", x1 - padR - 4, PY(MEAN) - 6);
            }
          }
          // panel title
          ctx.textAlign = "left";
          ctx.font = "600 17px 'Avenir Next', sans-serif";
          ctx.fillStyle = longGap ? "rgba(230,112,75,.9)" : "rgba(88,207,195,.9)";
          ctx.fillText(longGap ? "act 2 · multi-year gap (≈3 yr)" : "act 1 · short gap (≈6 months)", x0 + padL, 20);
        }

        // act 1 (left): short gap mid-record · act 2 (right): 3-yr gap over the 2012–2016 drawdown
        panel(0, mid, 6.0, 6.55, 0.4, false);
        panel(mid, W, 10.6, 13.8, 7.4, true);

        // captions track the acts
        const capA = document.getElementById("gapCapA"), capB = document.getElementById("gapCapB");
        if (capA) capA.classList.toggle("on", T > 2.0);
        if (capB) capB.classList.toggle("on", T > 9.0);
      }
    });
  })();

  // ─────────────────────── main loop ─────────────────────────
  // Recording hook: ?rec=1 disables the internal clock; frames are advanced
  // externally via window.__step(dt) (used for GIF/video export; inert in talks).
  const REC = /[?&]rec=1/.test(location.search);
  if (REC) { document.documentElement.classList.add("ff"); window.__recNow = 0; }
  if (/[?&]clean=1/.test(location.search)) document.documentElement.classList.add("clean");
  window.__step = function (dt) {
    if (REC) window.__recNow += dt * 1000;          // drives the 3D scene's clock too
    tickCountUps(dt);
    if (cur >= 0) {
      const s = slides[cur];
      const c = controllers[s.id];
      if (c && c.tick) { try { c.tick(dt, s); } catch (e) { console.error(e); } }
    }
  };
  let lastTs = 0;
  function frame(ts) {
    let dt = (ts - lastTs) / 1000;
    lastTs = ts;
    if (dt > 0.05) dt = 0.05;                       // clamp: 120 Hz-safe, tab-switch-safe
    if (dt < 0) dt = 0;
    window.__step(dt);
    requestAnimationFrame(frame);
  }
  if (!REC) requestAnimationFrame(function (ts) { lastTs = ts; requestAnimationFrame(frame); });

  // ─────────────────────── boot ──────────────────────────────
  const initial = parseInt((location.hash || "").slice(1), 10);
  goto(!isNaN(initial) ? initial - 1 : 0);
})();
