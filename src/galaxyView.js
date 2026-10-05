// 星間マップ: パン(ドラッグ)・ズーム(ホイール)・星の選択/ダブルクリックで星系を開く。
import { clamp } from './rng.js';
import { distance } from './galaxy.js';

export class GalaxyView {
  constructor(canvas, app) {
    this.canvas = canvas;
    this.app = app;
    this.ctx = canvas.getContext('2d');
    this.cam = { x: 0, y: 0, zoom: 6 };
    this.hover = null;
    this.drag = null;
    this.bind();
  }

  fit() {
    const r = this.app.game.galaxy.radius + 6;
    this.cam.zoom = clamp(Math.min(this.w, this.h) / 2 / r, 1.5, 80);
    this.cam.x = 0;
    this.cam.y = 0;
  }

  toScreen(x, y) {
    return [(x - this.cam.x) * this.cam.zoom + this.w / 2, (y - this.cam.y) * this.cam.zoom + this.h / 2];
  }
  toWorld(sx, sy) {
    return [(sx - this.w / 2) / this.cam.zoom + this.cam.x, (sy - this.h / 2) / this.cam.zoom + this.cam.y];
  }

  pick(sx, sy) {
    let best = null;
    let bd = 12;
    for (const s of this.app.game.galaxy.systems) {
      const [px, py] = this.toScreen(s.x, s.y);
      const d = Math.hypot(px - sx, py - sy);
      if (d < bd) { bd = d; best = s; }
    }
    return best;
  }

  zoomAt(factor, sx, sy) {
    const [wx, wy] = this.toWorld(sx, sy);
    this.cam.zoom = clamp(this.cam.zoom * factor, 1.5, 80);
    this.cam.x = wx - (sx - this.w / 2) / this.cam.zoom;
    this.cam.y = wy - (sy - this.h / 2) / this.cam.zoom;
  }

  // マウス・タッチ共通 (Pointer Events)。1本指=ドラッグ/タップ、2本指=ピンチズーム。
  bind() {
    const c = this.canvas;
    const pos = (e) => { const r = c.getBoundingClientRect(); return [e.clientX - r.left, e.clientY - r.top]; };
    const pts = new Map();
    let pinch = null;
    c.addEventListener('pointerdown', (e) => {
      if (this.app.view !== 'galaxy') return;
      pts.set(e.pointerId, pos(e));
      c.setPointerCapture(e.pointerId);
      if (pts.size === 1) {
        const [x, y] = pos(e);
        this.drag = { x, y, cx: this.cam.x, cy: this.cam.y, moved: false };
      } else if (pts.size === 2) {
        const [a, b] = [...pts.values()];
        pinch = { d: Math.hypot(a[0] - b[0], a[1] - b[1]), zoom: this.cam.zoom };
        if (this.drag) this.drag.moved = true;
      }
    });
    c.addEventListener('pointermove', (e) => {
      if (this.app.view !== 'galaxy') return;
      const [x, y] = pos(e);
      if (pts.has(e.pointerId)) pts.set(e.pointerId, [x, y]);
      if (pinch && pts.size === 2) {
        const [a, b] = [...pts.values()];
        const d = Math.hypot(a[0] - b[0], a[1] - b[1]);
        this.zoomAt((pinch.zoom * d / pinch.d) / this.cam.zoom, (a[0] + b[0]) / 2, (a[1] + b[1]) / 2);
        return;
      }
      if (this.drag) {
        const dx = x - this.drag.x;
        const dy = y - this.drag.y;
        if (Math.hypot(dx, dy) > 6) this.drag.moved = true;
        if (this.drag.moved) {
          this.cam.x = this.drag.cx - dx / this.cam.zoom;
          this.cam.y = this.drag.cy - dy / this.cam.zoom;
        }
      }
      if (e.pointerType === 'mouse') {
        this.hover = this.pick(x, y);
        this.mouse = [x, y];
        c.style.cursor = this.hover ? 'pointer' : this.drag?.moved ? 'grabbing' : 'default';
      }
    });
    const end = (e) => {
      if (this.app.view !== 'galaxy') return;
      const [x, y] = pos(e);
      const wasPinch = pts.size > 1;
      pts.delete(e.pointerId);
      if (pts.size < 2) pinch = null;
      if (this.drag && !this.drag.moved && !wasPinch && e.type === 'pointerup') {
        const s = this.pick(x, y);
        if (s) this.app.selectSystem(s.id);
      }
      if (pts.size === 0) this.drag = null;
    };
    c.addEventListener('pointerup', end);
    c.addEventListener('pointercancel', end);
    c.addEventListener('dblclick', (e) => {
      if (this.app.view !== 'galaxy') return;
      const [x, y] = pos(e);
      const s = this.pick(x, y);
      if (s) this.app.openSystem(s.id);
    });
    c.addEventListener('pointerleave', (e) => { if (e.pointerType === 'mouse') this.hover = null; });
    c.addEventListener('wheel', (e) => {
      if (this.app.view !== 'galaxy') return;
      e.preventDefault();
      const [x, y] = pos(e);
      this.zoomAt(Math.exp(-e.deltaY * 0.0015), x, y);
    }, { passive: false });
  }

  centerOn(sys) { this.cam.x = sys.x; this.cam.y = sys.y; }

  draw(w, h) {
    this.w = w;
    this.h = h;
    const { ctx } = this;
    const game = this.app.game;
    const sel = game.system(this.app.sel.sys);
    const z = this.cam.zoom;

    // 選択中の星からの距離リング
    const [cx, cy] = this.toScreen(sel.x, sel.y);
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 6]);
    ctx.font = '11px sans-serif';
    ctx.fillStyle = 'rgba(120,160,230,0.55)';
    ctx.strokeStyle = 'rgba(90,130,210,0.25)';
    for (const d of [4, 8, 16, 32, 64]) {
      if (d * z < 20) continue;
      ctx.beginPath();
      ctx.arc(cx, cy, d * z, 0, Math.PI * 2);
      ctx.stroke();
      ctx.fillText(`${d} ly`, cx + 4, cy - d * z - 3);
    }
    ctx.setLineDash([]);

    // 入植船
    for (const s of game.ships) {
      const a = game.system(s.from);
      const b = game.system(s.to);
      const [ax, ay] = this.toScreen(a.x, a.y);
      const [bx, by] = this.toScreen(b.x, b.y);
      const p = game.shipPosition(s);
      const [px, py] = this.toScreen(p.x, p.y);
      ctx.strokeStyle = 'rgba(255,170,60,0.45)';
      ctx.setLineDash([3, 4]);
      ctx.beginPath(); ctx.moveTo(ax, ay); ctx.lineTo(bx, by); ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = '#ffb347';
      ctx.beginPath(); ctx.arc(px, py, 3.5, 0, Math.PI * 2); ctx.fill();
    }

    // 星
    const scale = clamp(z / 6, 0.8, 2.5);
    for (const s of game.galaxy.systems) {
      const [x, y] = this.toScreen(s.x, s.y);
      if (x < -20 || y < -20 || x > this.w + 20 || y > this.h + 20) continue;
      const star = s.stars[0];
      const r = (1.5 + 1.1 * Math.log10(1 + star.lum * 20)) * scale;
      const glow = ctx.createRadialGradient(x, y, 0, x, y, r * 3);
      glow.addColorStop(0, star.color);
      glow.addColorStop(0.35, star.color);
      glow.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.globalAlpha = 0.9;
      ctx.fillStyle = glow;
      ctx.beginPath(); ctx.arc(x, y, r * 3, 0, Math.PI * 2); ctx.fill();
      ctx.globalAlpha = 1;
      ctx.fillStyle = star.color;
      ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
      if (s.stars.length > 1) {
        ctx.fillStyle = s.stars[1].color;
        ctx.beginPath(); ctx.arc(x + r * 1.1, y - r * 0.9, r * 0.5, 0, Math.PI * 2); ctx.fill();
      }
      if (game.isColonized(s.id)) {
        ctx.strokeStyle = '#4de3d0';
        ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.arc(x, y, r + 5, 0, Math.PI * 2); ctx.stroke();
      }
      if (s.id === this.app.sel.sys) {
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 1;
        ctx.strokeRect(x - r - 8, y - r - 8, (r + 8) * 2, (r + 8) * 2);
      }
      const labeled = z >= 10 || game.isColonized(s.id) || s.id === this.app.sel.sys || s === this.hover;
      if (labeled) {
        ctx.fillStyle = s === this.hover ? '#fff' : 'rgba(200,215,240,0.8)';
        ctx.font = '11px sans-serif';
        ctx.fillText(s.name, x + r + 7, y + 4);
      }
    }

    // ホバー中の星: 選択星からの距離と光速での所要年数
    if (this.hover && this.hover.id !== sel.id) {
      const d = distance(sel, this.hover);
      const t = game.travelYears(sel.id, this.hover.id);
      const [hx, hy] = this.toScreen(this.hover.x, this.hover.y);
      ctx.strokeStyle = 'rgba(255,255,255,0.35)';
      ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(hx, hy); ctx.stroke();
      const st = this.hover.stars[0];
      const lines = [this.hover.name, `${st.label}${this.hover.stars.length > 1 ? ` 他${this.hover.stars.length - 1}星` : ''}`,
        `距離 ${d.toFixed(1)} ly (${t.toFixed(1)} 年)`];
      const [mx, my] = this.mouse || [hx, hy];
      ctx.font = '12px sans-serif';
      const bw = Math.max(...lines.map((l) => ctx.measureText(l).width)) + 14;
      const bx = Math.min(mx + 14, this.w - bw - 4);
      const by = Math.min(my + 14, this.h - 60);
      ctx.fillStyle = 'rgba(10,14,24,0.9)';
      ctx.fillRect(bx, by, bw, 52);
      ctx.strokeStyle = '#345';
      ctx.strokeRect(bx, by, bw, 52);
      ctx.fillStyle = '#dfe8f7';
      lines.forEach((l, i) => ctx.fillText(l, bx + 7, by + 16 + i * 15));
    }
  }
}
