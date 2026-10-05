import { generateGalaxy } from './galaxy.js';
import { Game } from './game.js';
import { GalaxyView } from './galaxyView.js';
import { SystemView } from './systemView.js';
import { systemPanel, bodyPanel, shipsHtml, logHtml } from './panel.js';

const params = new URLSearchParams(location.search);
const $ = (id) => document.getElementById(id);
const canvas = $('map');
const SPEEDS = [0, 1, 4, 16, 64]; // 年/秒

const app = {
  game: null,
  view: 'galaxy',
  sel: { sys: 0, body: null },
  speed: 1,
  originId: undefined,
  dirty: true,
  selectSystem(id) { this.sel = { sys: id, body: null }; this.originId = undefined; this.dirty = true; },
  openSystem(id) { this.selectSystem(id); this.setView('system'); },
  selectBody(id) { this.sel.body = id; this.dirty = true; },
  setView(v) {
    this.view = v;
    $('tab-galaxy').classList.toggle('on', v === 'galaxy');
    $('tab-system').classList.toggle('on', v === 'system');
    canvas.style.cursor = 'default';
    this.dirty = true;
  },
};

function newGame(seed) {
  const galaxy = generateGalaxy({ seed, starCount: 400, meanSpacing: 4 });
  app.game = new Game(galaxy);
  app.sel = { sys: 0, body: null };
  history.replaceState(null, '', `?seed=${encodeURIComponent(seed)}`);
  galaxyView.fit();
  app.dirty = true;
}

const galaxyView = new GalaxyView(canvas, app);
const systemView = new SystemView(canvas, app);

let w = 0, h = 0;
function resize() {
  const dpr = window.devicePixelRatio || 1;
  const r = canvas.getBoundingClientRect();
  w = r.width; h = r.height;
  canvas.width = Math.round(w * dpr);
  canvas.height = Math.round(h * dpr);
  galaxyView.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  galaxyView.w = w;
  galaxyView.h = h;
}
window.addEventListener('resize', () => { resize(); galaxyView.fit(); });

// --- UI イベント ---
$('tab-galaxy').onclick = () => app.setView('galaxy');
$('tab-system').onclick = () => app.setView('system');
$('newgame').onclick = () => newGame(String(Math.floor(Math.random() * 1e6)));
document.querySelectorAll('[data-speed]').forEach((b) => {
  b.onclick = () => { app.speed = Number(b.dataset.speed); updateSpeedButtons(); };
});
function updateSpeedButtons() {
  document.querySelectorAll('[data-speed]').forEach((b) => b.classList.toggle('on', Number(b.dataset.speed) === app.speed));
}
window.addEventListener('keydown', (e) => {
  if (e.target.tagName === 'SELECT') return;
  if (e.key === ' ') { app.speed = app.speed ? 0 : 1; updateSpeedButtons(); e.preventDefault(); }
  else if (e.key >= '1' && e.key <= '5') { app.speed = SPEEDS[Number(e.key) - 1]; updateSpeedButtons(); }
  else if (e.key === 'g') app.setView('galaxy');
  else if (e.key === 's') app.setView('system');
  else if (e.key === 'Escape') app.setView('galaxy');
});

const panel = $('panel');
panel.addEventListener('click', (e) => {
  const li = e.target.closest('[data-body]');
  if (li) return app.selectBody(li.dataset.body);
  const btn = e.target.closest('button[data-act]');
  if (!btn) return;
  const { act, kind } = btn.dataset;
  if (act === 'open') app.setView('system');
  else if (act === 'back') app.selectBody(null);
  else if (act === 'send') {
    const from = app.originId ?? nearestOrigin();
    const r = app.game.dispatch(from, app.sel.sys, app.sel.body, kind);
    if (!r.ok) app.game.message(`派遣できない: ${r.reason}`);
    app.dirty = true;
  }
});
panel.addEventListener('change', (e) => {
  if (e.target.dataset.act === 'origin') { app.originId = Number(e.target.value); app.dirty = true; }
});
function nearestOrigin() {
  const g = app.game;
  return g.colonizedSystems().sort((a, b) => g.travelYears(a.id, app.sel.sys) - g.travelYears(b.id, app.sel.sys))[0].id;
}

// --- メインループ ---
let last = performance.now();
let acc = 0;
function frame(now) {
  const dt = Math.min(0.1, (now - last) / 1000);
  last = now;
  const game = app.game;
  if (app.speed && game.advance(dt * app.speed)) app.dirty = true;
  const ctx = galaxyView.ctx;
  ctx.fillStyle = '#05070d';
  ctx.fillRect(0, 0, w, h);
  if (app.view === 'galaxy') galaxyView.draw(w, h);
  else systemView.draw(w, h);

  $('date').textContent = `西暦 ${game.year.toFixed(1)} 年`;
  acc += dt;
  if (acc > 0.25) {
    acc = 0;
    $('ships').innerHTML = shipsHtml(game);
    $('log').innerHTML = logHtml(game);
  }
  if (app.dirty) {
    app.dirty = false;
    panel.innerHTML = app.view === 'system' && app.sel.body ? bodyPanel(app) : systemPanel(app);
  }
  requestAnimationFrame(frame);
}

resize();
newGame(params.get('seed') || '1');
updateSpeedButtons();
requestAnimationFrame(frame);
window.__app = app; // デバッグ用
