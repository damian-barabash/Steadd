import { useEffect, useRef } from "react";

// 3D point-cloud BRAIN on canvas (cerebrum + cerebellum + gyri folds + central fissure)
// that slowly rotates, drifts across the viewport by scroll ("points of interest"), and
// reacts to the mouse — plus an ambient network field around it.
//
// Two modes:
//   • global (default): fixed full-viewport canvas, theme-colored (cobalt), drifts by page scroll.
//   • scoped: absolutely fills its parent element, custom color (e.g. white on the blue hero),
//     autonomous slow drift/rotation (no page-scroll dependency), mouse-reactive within the host.
//
// NOTE (HORIN lesson): prefers-reduced-motion is intentionally IGNORED for this
// decorative animation — on Windows with "animation effects off" Chrome reports reduce
// and the scene would freeze/jank. We always animate.
export default function NeuroBg({ scoped = false, color = null, alpha = null }) {
  const ref = useRef(null);
  useEffect(() => {
    const cv = ref.current, ctx = cv.getContext("2d");
    const host = scoped ? cv.parentElement : null;
    const coarse = matchMedia("(pointer: coarse)").matches;
    let raf, W, H, dpr = Math.min(devicePixelRatio || 1, 1.75);
    let col = color || "107,110,249", al = alpha != null ? alpha : 0.3, frame = 0;
    const mouse = { x: 0.5, y: 0.5 };
    let scrollY = 0;
    const cur = { rx: -0.05, ry: 0, cx: 0, cy: 0 };

    // ---- build brain (model space, y up) ----
    const BN = innerWidth < 700 ? 340 : 580;
    const FOCAL = 3.6, EDGE = 0.165, EDGE_CAP = 1800;
    const bp = [];
    const cer = Math.floor(BN * 0.12);
    for (let i = 0; i < BN - cer; i++) {
      const phi = 2 * Math.PI * Math.random(), th = Math.acos(2 * Math.random() - 1);
      const sx = Math.sin(th) * Math.cos(phi), sy = Math.cos(th), sz = Math.sin(th) * Math.sin(phi);
      const fold = 0.11 * Math.sin(10 * phi) * Math.sin(6 * th) + 0.06 * Math.sin(16 * th) + 0.05 * Math.sin(13 * phi + 3 * th);
      const r = 1 + fold;
      let x = 1.02 * r * sx, y = 0.84 * r * sy, z = 1.20 * r * sz;
      if (y < 0) y *= 0.62;
      x += (x >= 0 ? 1 : -1) * 0.11;
      bp.push({ x, y, z });
    }
    for (let i = 0; i < cer; i++) {
      const phi = 2 * Math.PI * Math.random(), th = Math.acos(2 * Math.random() - 1);
      const sx = Math.sin(th) * Math.cos(phi), sy = Math.cos(th), sz = Math.sin(th) * Math.sin(phi);
      const r = 0.34 * (1 + 0.10 * Math.sin(18 * phi) * Math.sin(10 * th));
      bp.push({ x: sx * r * 1.1, y: -0.55 + sy * r * 0.8, z: -0.78 + sz * r });
    }
    const edges = [];
    for (let i = 0; i < bp.length && edges.length < EDGE_CAP; i++)
      for (let j = i + 1; j < bp.length && edges.length < EDGE_CAP; j++) {
        const a = bp[i], b = bp[j];
        if (Math.abs(a.x - b.x) < 0.16 && Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z) < EDGE) edges.push([i, j]);
      }
    const proj = new Array(bp.length);

    // ---- ambient field ----
    const AN = scoped ? (innerWidth < 700 ? 26 : 44) : (innerWidth < 700 ? 38 : 70);
    let amb = [];
    function initAmb() {
      amb = Array.from({ length: AN }, () => ({ x: Math.random() * W, y: Math.random() * H, vx: (Math.random() - .5) * .22 * dpr, vy: (Math.random() - .5) * .22 * dpr, big: Math.random() < 0.3 }));
    }

    function readTheme() {
      if (color) { col = color; al = alpha != null ? alpha : 0.45; return; }
      const s = getComputedStyle(document.documentElement);
      col = (s.getPropertyValue("--neuro") || "107,110,249").trim();
      al = parseFloat(s.getPropertyValue("--neuro-alpha")) || 0.3;
    }
    function dims() {
      if (scoped) { const r = host.getBoundingClientRect(); return [r.width, r.height]; }
      return [innerWidth, innerHeight];
    }
    function resize() {
      const [w, h] = dims();
      W = cv.width = w * dpr; H = cv.height = h * dpr;
      cv.style.width = w + "px"; cv.style.height = h + "px";
      cur.cx = W * 0.5; cur.cy = H * 0.42;
    }

    function run() {
      raf = requestAnimationFrame(run);
      frame++;
      if (frame % 30 === 1) readTheme();
      ctx.clearRect(0, 0, W, H);
      const docH = Math.max(1, document.documentElement.scrollHeight - innerHeight);
      // scoped: autonomous slow drift; global: scroll-driven "points of interest"
      const prog = scoped ? (0.5 + 0.45 * Math.sin(frame * 0.0016)) : Math.min(1, Math.max(0, scrollY / docH));
      const R = Math.min(W, H) * (innerWidth < 700 ? 0.32 : 0.28);
      const line = (x1, y1, x2, y2, a) => { ctx.strokeStyle = `rgba(${col},${a})`; ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke(); };
      ctx.lineWidth = dpr;

      // ambient field (behind brain)
      const par = (scoped ? 0 : scrollY * 0.05) * dpr, mx = mouse.x * W, my = mouse.y * H;
      const D = 150 * dpr;
      for (const n of amb) {
        n.x += n.vx; n.y += n.vy;
        if (n.x < 0) n.x += W; if (n.x > W) n.x -= W; if (n.y < 0) n.y += H; if (n.y > H) n.y -= H;
        if (!coarse) { const dx = mx - n.x, dy = (my + par) - n.y, d = Math.hypot(dx, dy); if (d < 120 * dpr && d > 0) { n.x -= dx / d * 1.2; n.y -= dy / d * 1.2; } }
      }
      const ay = (n) => { let y = n.y - par % H; if (y < 0) y += H; return y; };
      for (let i = 0; i < amb.length; i++) for (let j = i + 1; j < amb.length; j++) {
        const a = amb[i], b = amb[j], d = Math.hypot(a.x - b.x, ay(a) - ay(b));
        if (d < D) line(a.x, ay(a), b.x, ay(b), (1 - d / D) * al * 0.7);
      }
      for (const n of amb) { ctx.fillStyle = `rgba(${col},${n.big ? Math.min(0.95, al + 0.45) : Math.min(0.7, al + 0.2)})`; ctx.beginPath(); ctx.arc(n.x, ay(n), (n.big ? 2.2 : 1.3) * dpr, 0, 7); ctx.fill(); }

      // brain — rotate, drift (points of interest), mouse react
      const tcx = W * (0.5 + 0.18 * Math.sin(prog * Math.PI * 2)) + (mouse.x - 0.5) * W * 0.05;
      const tcy = H * (0.42 + 0.12 * Math.sin(prog * Math.PI)) + (mouse.y - 0.5) * H * 0.04;
      const tRy = frame * 0.0017 + (mouse.x - 0.5) * 0.9 + prog * 2.2;
      const tRx = -0.05 + (mouse.y - 0.5) * 0.4 + prog * 0.25;
      cur.cx += (tcx - cur.cx) * 0.06; cur.cy += (tcy - cur.cy) * 0.06;
      cur.ry += (tRy - cur.ry) * 0.06; cur.rx += (tRx - cur.rx) * 0.06;
      const cyR = Math.cos(cur.ry), syR = Math.sin(cur.ry), cxR = Math.cos(cur.rx), sxR = Math.sin(cur.rx);
      for (let i = 0; i < bp.length; i++) {
        const p = bp[i];
        let X = p.x * cyR - p.z * syR, Z = p.x * syR + p.z * cyR;
        let Y = p.y * cxR - Z * sxR; Z = p.y * sxR + Z * cxR;
        const s = FOCAL / (FOCAL - Z);
        proj[i] = { x: cur.cx + X * s * R, y: cur.cy - Y * s * R, s, z: Z };
      }
      for (let e = 0; e < edges.length; e++) { const a = proj[edges[e][0]], b = proj[edges[e][1]]; line(a.x, a.y, b.x, b.y, Math.min(0.85, (a.s + b.s) * 0.3) * al); }
      // depth-sorted dots
      const order = proj.map((_, i) => i).sort((i, j) => proj[i].z - proj[j].z);
      for (const i of order) { const p = proj[i]; const b = (p.s - 0.7) * 1.4; ctx.fillStyle = `rgba(${col},${Math.max(0.18, Math.min(0.97, 0.3 + b))})`; ctx.beginPath(); ctx.arc(p.x, p.y, Math.max(0.7, p.s * 1.4 * dpr), 0, 7); ctx.fill(); }
    }

    readTheme(); resize(); initAmb(); run();
    const onMove = (e) => {
      if (scoped) { const r = host.getBoundingClientRect(); mouse.x = (e.clientX - r.left) / r.width; mouse.y = (e.clientY - r.top) / r.height; }
      else { mouse.x = e.clientX / innerWidth; mouse.y = e.clientY / innerHeight; }
    };
    const onScroll = () => { scrollY = window.scrollY || document.documentElement.scrollTop || 0; };
    const onResize = () => { dpr = Math.min(devicePixelRatio || 1, 1.75); resize(); initAmb(); };
    if (!coarse) addEventListener("mousemove", onMove, { passive: true });
    if (!scoped) addEventListener("scroll", onScroll, { passive: true });
    addEventListener("resize", onResize);
    return () => { cancelAnimationFrame(raf); removeEventListener("mousemove", onMove); removeEventListener("scroll", onScroll); removeEventListener("resize", onResize); };
  }, [scoped, color, alpha]);
  return <canvas ref={ref} className={scoped ? "neuro-scoped" : "neuro-bg"} aria-hidden="true" />;
}
