// 右サイドパネル(星/天体の詳細と入植船の発進)のHTML生成。
import { distance } from './galaxy.js';
import { KIND_LABEL } from './game.js';
import { TYPE_LABEL, SURFACE_LABEL, GRADE_LABEL, bodyColor, fmt } from './labels.js';

const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

function starRow(s) {
  return `<tr><td><span class="dot" style="background:${s.color}"></span>${esc(s.name)}</td><td>${s.label}</td>
    <td>${fmt(s.mass)} M☉</td><td>${Math.round(s.temp)} K</td><td>${fmt(s.lum, 3)} L☉</td></tr>`;
}

export function systemPanel(app) {
  const g = app.game;
  const sys = g.system(app.sel.sys);
  const home = g.system(0);
  const cols = g.coloniesIn(sys.id);
  const planets = sys.bodies.filter((b) => b.type !== 'belt').length;
  return `
    <h2>${esc(sys.name)}</h2>
    <p class="sub">太陽系から ${distance(home, sys).toFixed(1)} ly ・ 惑星 ${planets} ・ ${sys.stars.length > 1 ? `${sys.stars.length}重星系` : '単独星'}</p>
    <table class="tbl"><tr><th>恒星</th><th>型</th><th>質量</th><th>表面温度</th><th>光度</th></tr>${sys.stars.map(starRow).join('')}</table>
    ${sys.stars.slice(1).map((s) => `<p class="note">${esc(s.name)} は主星から約 ${fmt(s.sep)} AU</p>`).join('')}
    <h3>入植地</h3>
    ${cols.length ? `<ul>${cols.map((c) => `<li>${esc(c.name)} — ${KIND_LABEL[c.kind]} (${c.founded.toFixed(1)}年)</li>`).join('')}</ul>` : '<p class="note">まだ入植していない</p>'}
    <button data-act="open">星系マップを開く</button>
    ${app.view === 'system' ? bodyList(app, sys) : ''}`;
}

function bodyList(app, sys) {
  return `<h3>天体</h3><ul class="bodies">${sys.bodies.map((b) => {
    const mark = ['planet', 'station'].filter((k) => app.game.colonyAt(sys.id, b.id, k)).map((k) => (k === 'planet' ? '▲' : '■')).join('');
    return `<li data-body="${b.id}" class="${b.id === app.sel.body ? 'sel' : ''}"><span class="dot" style="background:${bodyColor(b)}"></span>${esc(b.name)}
      <span class="muted">${TYPE_LABEL[b.type]} ${fmt(b.a)} AU</span> <span class="mk">${mark}</span></li>`;
  }).join('')}</ul>`;
}

function row(k, v) { return `<tr><th>${k}</th><td>${v}</td></tr>`; }

export function bodyPanel(app) {
  const g = app.game;
  const sys = g.system(app.sel.sys);
  const b = g.target(sys.id, app.sel.body);
  if (!b) return systemPanel(app);
  const isStar = !!b.label;
  let info;
  if (isStar) {
    info = `<table class="tbl kv">${row('スペクトル型', b.label)}${row('質量', `${fmt(b.mass)} M☉`)}${row('半径', `${fmt(b.radius, 3)} R☉`)}
      ${row('表面温度', `${Math.round(b.temp)} K`)}${row('光度', `${fmt(b.lum, 3)} L☉`)}${b.sep ? row('主星からの距離', `${fmt(b.sep)} AU`) : ''}</table>`;
  } else if (b.type === 'belt') {
    info = `<table class="tbl kv">${row('種類', TYPE_LABEL.belt)}${row('軌道半径', `${fmt(b.a)} AU`)}${row('公転周期', `${fmt(b.period)} 年`)}</table>`;
  } else {
    const solid = b.type === 'rocky' || b.type === 'dwarf';
    info = `<table class="tbl kv">${row('種類', TYPE_LABEL[b.type])}${row('軌道半径', `${fmt(b.a)} AU${b.inHZ ? ' <span class="hz">(HZ内)</span>' : ''}`)}
      ${row('公転周期', `${fmt(b.period)} 年${b.tidalLock ? ' (潮汐固定)' : ''}`)}${row('質量', `${fmt(b.mass)} M⊕`)}${row('半径', `${fmt(b.radius)} R⊕`)}
      ${row(solid ? '表面重力' : '重力(1気圧面)', `${fmt(b.gravity)} g`)}${row('平衡温度', `${Math.round(b.teq)} K`)}
      ${solid ? row('表面温度', `${Math.round(b.tSurf)} K (${Math.round(b.tSurf - 273)} ℃)`) : ''}
      ${solid ? row('大気圧', b.pressure < 0.001 ? 'ほぼ真空' : `${fmt(b.pressure)} atm`) : ''}
      ${solid ? row('地表', SURFACE_LABEL[b.surface] || '') : ''}
      ${solid ? row('入植適性', `<b class="grade g${b.settle.grade}">${GRADE_LABEL[b.settle.grade]}</b>${b.settle.notes.length ? ` — ${b.settle.notes.join('、')}` : ''}`) : ''}</table>`;
  }
  const cols = ['planet', 'station'].filter((k) => g.colonyAt(sys.id, b.id, k)).map((k) => `<li>${KIND_LABEL[k]} 設立済み</li>`);
  return `
    <h2><span class="dot big" style="background:${isStar ? b.color : bodyColor(b)}"></span>${esc(b.name)}</h2>
    <p class="sub">${esc(sys.name)}</p>
    ${info}
    ${cols.length ? `<ul>${cols.join('')}</ul>` : ''}
    ${dispatchBox(app, sys, b)}
    <button data-act="back" class="ghost">← 星系の一覧へ</button>`;
}

function dispatchBox(app, sys, b) {
  const g = app.game;
  const origins = g.colonizedSystems()
    .map((s) => ({ s, t: g.travelYears(s.id, sys.id) }))
    .sort((a, c) => a.t - c.t);
  const sel = app.originId !== undefined && origins.some((o) => o.s.id === app.originId) ? app.originId : origins[0].s.id;
  const t = g.travelYears(sel, sys.id);
  const btn = (kind) => {
    const c = g.check(sys.id, b.id, kind);
    return `<button data-act="send" data-kind="${kind}" ${c.ok ? '' : 'disabled'}>${KIND_LABEL[kind]}を建設${c.ok ? '' : `<small>${esc(c.reason)}</small>`}</button>`;
  };
  return `<h3>入植船を送る</h3>
    <label class="field">出発地
      <select data-act="origin">${origins.map((o) => `<option value="${o.s.id}" ${o.s.id === sel ? 'selected' : ''}>${esc(o.s.name)} (${o.t < 0.01 ? '星系内' : `${o.t.toFixed(1)} 年`})</option>`).join('')}</select></label>
    <p class="note">入植船は光速で航行。到着まで <b>${t < 0.01 ? 'ほぼ即時' : `${t.toFixed(2)} 年`}</b></p>
    <div class="btns">${btn('station')}${btn('planet')}</div>`;
}

export function shipsHtml(game) {
  if (!game.ships.length) return '<span class="muted">航行中の入植船なし</span>';
  return game.ships.map((s) => {
    const left = s.arrive - game.year;
    const f = (game.year - s.depart) / (s.arrive - s.depart);
    return `<div class="ship">${esc(game.system(s.from).name)} → ${esc(game.system(s.to).name)} <span class="muted">${KIND_LABEL[s.kind]}</span>
      <span class="bar"><i style="width:${(f * 100).toFixed(0)}%"></i></span> あと ${left.toFixed(1)} 年</div>`;
  }).join('');
}

export function logHtml(game) {
  return game.log.slice(0, 8).map((l) => `<div><span class="muted">${l.year.toFixed(1)}</span> ${esc(l.text)}</div>`).join('');
}
