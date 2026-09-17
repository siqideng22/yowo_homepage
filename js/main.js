/* YOWO — interactions
   1. flora cursor: a small scattered flower that slowly morphs and shifts
      colour, leaves faint petal traces, and sheds a petal on every click.
      A quiet metaphor for the ecosystem: attention pollinates, ideas fall
      and settle.
   2. reveal-on-scroll
   3. lab machines: staggered workflow steps
*/

(function floraCursor() {
  const fine =
    matchMedia("(pointer: fine)").matches &&
    !matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (!fine) return;

  document.body.classList.add("flora");

  const canvas = document.createElement("canvas");
  canvas.id = "flora";
  document.body.appendChild(canvas);
  const ctx = canvas.getContext("2d");

  let dpr = 1;
  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = innerWidth * dpr;
    canvas.height = innerHeight * dpr;
    canvas.style.width = innerWidth + "px";
    canvas.style.height = innerHeight + "px";
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  resize();
  addEventListener("resize", resize);

  // rAF with a timer fallback — some embedded webviews never fire rAF
  const nextFrame = (cb) => {
    let done = false;
    requestAnimationFrame(() => {
      if (!done) { done = true; cb(); }
    });
    setTimeout(() => {
      if (!done) { done = true; cb(); }
    }, 40);
  };

  const mouse = { x: -100, y: -100, inside: false };
  let bloom = 0; // 0..1, grows over links
  let bloomTarget = 0;

  const traces = []; // faint petal marks left along the path
  const falling = []; // petals shed on click
  const TRACE_LIFE = 2800;

  let lastTrace = null;

  addEventListener("pointermove", (e) => {
    mouse.x = e.clientX;
    mouse.y = e.clientY;
    mouse.inside = true;
    if (
      !lastTrace ||
      Math.hypot(mouse.x - lastTrace.x, mouse.y - lastTrace.y) > 14
    ) {
      traces.push({
        x: mouse.x + (Math.random() - 0.5) * 5,
        y: mouse.y + (Math.random() - 0.5) * 5,
        rot: Math.random() * Math.PI * 2,
        size: 2 + Math.random() * 2,
        hue: currentHue(),
        born: performance.now(),
      });
      lastTrace = { x: mouse.x, y: mouse.y };
      if (traces.length > 260) traces.shift();
    }
  });

  addEventListener("pointerleave", () => (mouse.inside = false));
  document.addEventListener("mouseleave", () => (mouse.inside = false));

  // bloom over interactive things
  document.addEventListener("mouseover", (e) => {
    bloomTarget = e.target.closest("a, summary, button") ? 1 : 0;
  });

  // a petal falls on every click
  addEventListener("pointerdown", (e) => {
    falling.push({
      x: e.clientX,
      y: e.clientY,
      hue: currentHue(),
      born: performance.now(),
      vy: 26 + Math.random() * 22, // px / s — slow
      swayAmp: 14 + Math.random() * 22,
      swayFreq: 0.6 + Math.random() * 0.7,
      swayPhase: Math.random() * Math.PI * 2,
      rot: Math.random() * Math.PI * 2,
      rotV: (Math.random() - 0.5) * 1.2,
      len: 8 + Math.random() * 5,
      wid: 4 + Math.random() * 2.5,
      life: 9000 + Math.random() * 3000,
    });
  });

  function currentHue() {
    // slow drift through soft, garden-ish hues
    return (performance.now() * 0.008) % 360;
  }

  function drawPetal(x, y, rot, len, wid, fill) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(rot);
    ctx.fillStyle = fill;
    ctx.beginPath();
    ctx.ellipse(len * 0.5, 0, len * 0.5, wid * 0.5, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  function drawFlower(t) {
    if (!mouse.inside) return;
    const scale = 1 + bloom * 0.45;
    // petal count breathes between sparse and full — the "scattered" look
    const petals = 6;
    const baseRot = t * 0.00035;
    for (let i = 0; i < petals; i++) {
      const a = baseRot + (i * Math.PI * 2) / petals;
      // each petal has its own slow pulse => the whole shape keeps morphing
      const len = (10 + 4 * Math.sin(t * 0.0011 + i * 1.9)) * scale;
      const wid = (4.2 + 1.8 * Math.sin(t * 0.0008 + i * 2.6)) * scale;
      const gap = (4 + 2 * Math.sin(t * 0.0006 + i)) * scale; // scatter
      const px = mouse.x + Math.cos(a) * gap;
      const py = mouse.y + Math.sin(a) * gap;
      const hue = (currentHue() + i * 16) % 360;
      drawPetal(px, py, a, len, wid, `hsla(${hue}, 42%, 58%, 0.5)`);
    }
    // a few tiny stamens
    for (let i = 0; i < 3; i++) {
      const a = -baseRot * 1.6 + (i * Math.PI * 2) / 3;
      const r = (3.5 + Math.sin(t * 0.0013 + i) * 1.2) * scale;
      ctx.fillStyle = "rgba(17,17,17,0.55)";
      ctx.beginPath();
      ctx.arc(mouse.x + Math.cos(a) * r, mouse.y + Math.sin(a) * r, 0.9, 0, 7);
      ctx.fill();
    }
    // centre
    ctx.fillStyle = "rgba(17,17,17,0.9)";
    ctx.beginPath();
    ctx.arc(mouse.x, mouse.y, 1.7 * scale, 0, Math.PI * 2);
    ctx.fill();
  }

  function draw() {
    const t = performance.now();
    ctx.clearRect(0, 0, innerWidth, innerHeight);

    bloom += (bloomTarget - bloom) * 0.12;

    // faint traces — like pollen left along the path
    for (let i = traces.length - 1; i >= 0; i--) {
      const tr = traces[i];
      const age = t - tr.born;
      if (age > TRACE_LIFE) {
        traces.splice(i, 1);
        continue;
      }
      const alpha = 0.17 * (1 - age / TRACE_LIFE);
      drawPetal(
        tr.x,
        tr.y,
        tr.rot,
        tr.size * 2.4,
        tr.size,
        `hsla(${tr.hue}, 38%, 55%, ${alpha})`
      );
    }

    // falling petals
    for (let i = falling.length - 1; i >= 0; i--) {
      const p = falling[i];
      const age = t - p.born;
      const s = age / 1000;
      const y = p.y + p.vy * s;
      if (age > p.life || y > innerHeight + 30) {
        falling.splice(i, 1);
        continue;
      }
      const x = p.x + Math.sin(s * p.swayFreq * Math.PI + p.swayPhase) * p.swayAmp;
      const rot = p.rot + p.rotV * s + Math.sin(s * 1.3 + p.swayPhase) * 0.5;
      const fadeIn = Math.min(age / 250, 1);
      const fadeOut = Math.max(0, 1 - age / p.life);
      const alpha = 0.6 * fadeIn * fadeOut;
      drawPetal(x, y, rot, p.len, p.wid, `hsla(${p.hue}, 44%, 56%, ${alpha})`);
    }

    drawFlower(t);
    nextFrame(draw);
  }
  draw();
})();

(function revealOnScroll() {
  const els = document.querySelectorAll(".reveal");
  const io = new IntersectionObserver(
    (entries) => {
      for (const en of entries) {
        if (en.isIntersecting) {
          en.target.classList.add("in");
          io.unobserve(en.target);
        }
      }
    },
    { threshold: 0.15 }
  );
  els.forEach((el) => io.observe(el));
})();

/* stagger workflow steps when a machine opens */
(function machines() {
  document.querySelectorAll("details.machine").forEach((d) => {
    d.addEventListener("toggle", () => {
      if (!d.open) return;
      d.querySelectorAll(".workflow .step").forEach((s, i) => {
        s.style.transitionDelay = i * 70 + "ms";
      });
    });
  });
})();
