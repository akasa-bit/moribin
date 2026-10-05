// 星系マップ: 恒星・伴星・惑星・小惑星帯を軌道上に表示。軌道半径は対数スケール。
import { clamp } from './rng.js';
import { bodyColor } from './labels.js';
import { frostLine, habitableZone } from './planets.js';

const A0 = 0.05; // 対数スケールの基準[AU]

export class SystemView {
  constructor(canvas, app) {
    this.canvas = canvas;
    this.app = app;
    this.ctx = canvas.getContext('2d');
    this.hit = [];
    this.hover = null;
    canvas.addEventListener('pointermove', (e) => {
      if (app.view !== 'system') return;
      const r = canvas.getBoundingClientRect();
      this.hover = this.pick(e.clientX - r.left, e.clientY - r.top);
      canvas.style.cursor = this.hover ? 'pointer' : 'default';
    });
    canvas.addEventListener('click', (e) => {
      if (app.view !== 'system') return;
      const r = canvas.getBoundingClientRect();
      const b = this.pick(e.clientX - r.left, e.clientY - r.top);
      app.selectBody(b ? b.id : null);
    });
  }

  pick(x, y) {
    let best = null;
    let bd = Infinity;
    for (const h of this.hit) {
      const d = Math.hypot(h.x - x, h.y - y);
      if (d < Math.max(h.r + 5, 10) && d < bd) { bd = d; best = h.body; }
    }
    return best;
  }

  draw(w, h) {
    const { ctx } = this;
    const game = this.app.game;
    const sys = game.system(this.app.sel.sys);
    const cx = w / 2;
    const cy = h / 2;
    const outer = Math.max(...sys.bodies.map((b) => b.a), ...sys.stars.map((s) => s.sep), 1);
    const aMax = outer * 1.15;
    const rMax = Math.min(w, h) * 0.46;
    const R = (a) => (a <= 0 ? 0 : 22 + ((rMax - 22) * Math.log(1 + a / A0)) / Math.log(1 + aMax / A0));
    const primary = sys.stars[0];
    this.hit = [];

    // ハビタブルゾーンと雪線
    const hz = habitableZone(primary);
    if (!primary.wd && R(hz.inner) < rMax) {
      ctx.fillStyle = 'rgba(70,200,110,0.10)';
      ctx.beginPath();
      ctx.arc(cx, cy, R(hz.outer), 0, Math.PI * 2);
      ctx.arc(cx, cy, R(hz.inner), 0, Math.PI * 2, true);
      ctx.fill();
      ctx.fillStyle = 'rgba(110,220,150,0.7)';
      ctx.font = '10px sans-serif';
      ctx.fillText('ハビタブルゾーン', cx + R(hz.outer) * 0.7 + 4, cy - R(hz.outer) * 0.7);
    }
    const fl = frostLine(primary);
    if (R(fl) < rMax) {
      ctx.strokeStyle = 'rgba(140,200,255,0.35)';
      ctx.setLineDash([2, 5]);
      ctx.beginPath(); ctx.arc(cx, cy, R(fl), 0, Math.PI * 2); ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = 'rgba(140,200,255,0.55)';
      ctx.font = '10px sans-serif';
      ctx.fillText('雪線', cx - R(fl) * 0.7 - 24, cy - R(fl) * 0.7);
    }

    // 軌道リング
    ctx.lineWidth = 1;
    ctx.strokeStyle = 'rgba(150,170,210,0.2)';
    for (const b of [...sys.bodies, ...sys.stars.slice(1).map((s) => ({ a: s.sep }))]) {
      ctx.beginPath(); ctx.arc(cx, cy, R(b.a), 0, Math.PI * 2); ctx.stroke();
    }

    // 恒星
    const drawStar = (star, x, y, big) => {
      const r = big ? clamp(7 + 5 * Math.log10(1 + star.radius * 3), 6, 22) : clamp(4 + 4 * Math.log10(1 + star.radius * 3), 4, 14);
      const g = ctx.createRadialGradient(x, y, 0, x, y, r * 3.2);
      g.addColorStop(0, star.color);
      g.addColorStop(0.3, star.color);
      g.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.arc(x, y, r * 3.2, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = star.color;
      ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
      this.hit.push({ x, y, r, body: star });
      ctx.fillStyle = 'rgba(210,225,250,0.85)';
      ctx.font = '11px sans-serif';
      ctx.fillText(`${star.name} (${star.label})`, x + r + 6, y - r - 2);
      this.mark(star, x, y, r);
    };
    drawStar(primary, cx, cy, true);
    for (const s of sys.stars.slice(1)) {
      const ang = s.phase + (2 * Math.PI * game.year) / (Math.sqrt(s.sep ** 3 / (primary.mass + s.mass)) || 1);
      drawStar(s, cx + R(s.sep) * Math.cos(ang), cy + R(s.sep) * Math.sin(ang), false);
    }

    // 惑星・小惑星帯
    for (const b of sys.bodies) {
      const ang = b.phase + (2 * Math.PI * game.year) / b.period;
      const rr = R(b.a);
      const x = cx + rr * Math.cos(ang);
      const y = cy + rr * Math.sin(ang);
      let r;
      if (b.type === 'belt') {
        r = 7;
        ctx.strokeStyle = 'rgba(160,150,140,0.55)';
        ctx.lineWidth = 4;
        ctx.setLineDash([1, 5]);
        ctx.beginPath(); ctx.arc(cx, cy, rr, 0, Math.PI * 2); ctx.stroke();
        ctx.setLineDash([]);
        ctx.lineWidth = 1;
        const bx = cx + rr * Math.cos(b.phase);
        const by = cy + rr * Math.sin(b.phase);
        this.hit.push({ x: bx, y: by, r, body: b });
        this.label(b, bx, by, 4);
        this.mark(b, bx, by, 5);
        continue;
      }
      r = 3 + 5 * Math.log10(1 + b.radius);
      ctx.fillStyle = bodyColor(b);
      ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
      if (b.type === 'gas-giant' || b.type === 'ice-giant') {
        ctx.strokeStyle = 'rgba(0,0,0,0.25)';
        ctx.beginPath(); ctx.moveTo(x - r, y - r * 0.3); ctx.lineTo(x + r, y - r * 0.3); ctx.moveTo(x - r, y + r * 0.35); ctx.lineTo(x + r, y + r * 0.35); ctx.stroke();
      }
      this.hit.push({ x, y, r, body: b });
      this.label(b, x, y, r);
      this.mark(b, x, y, r);
    }
  }

  label(b, x, y, r) {
    const { ctx } = this;
    ctx.fillStyle = b === this.hover || b.id === this.app.sel.body ? '#fff' : 'rgba(190,205,230,0.7)';
    ctx.font = '11px sans-serif';
    ctx.fillText(b.name.replace(/^.* (?=[a-z]$)/, ''), x + r + 4, y + 4);
  }

  // 入植地・選択状態の表示
  mark(b, x, y, r) {
    const { ctx } = this;
    const game = this.app.game;
    const sys = this.app.sel.sys;
    if (b.id === this.app.sel.body) {
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.arc(x, y, r + 5, 0, Math.PI * 2); ctx.stroke();
    }
    if (game.colonyAt(sys, b.id, 'planet')) {
      ctx.fillStyle = '#4de3d0';
      ctx.beginPath(); ctx.moveTo(x, y - r - 9); ctx.lineTo(x + 4, y - r - 3); ctx.lineTo(x - 4, y - r - 3); ctx.fill();
    }
    if (game.colonyAt(sys, b.id, 'station')) {
      ctx.fillStyle = '#ffd24d';
      ctx.fillRect(x + r + 2, y - r - 6, 5, 5);
    }
    if (game.shipTo(sys, b.id, 'planet') || game.shipTo(sys, b.id, 'station')) {
      ctx.strokeStyle = '#ffb347';
      ctx.setLineDash([2, 3]);
      ctx.beginPath(); ctx.arc(x, y, r + 8, 0, Math.PI * 2); ctx.stroke();
      ctx.setLineDash([]);
    }
  }
}
