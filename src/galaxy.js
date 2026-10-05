// 星間マップの自動生成。
// 星の配置: ディスク状の領域に最小間隔つきランダム配置 → 「最近接星までの平均距離」が
// ちょうど meanSpacing[ly] になるよう全体を一様スケーリングする。
import { Rng, hashSeed } from './rng.js';
import { makePrimary, makeCompanions } from './stars.js';
import { generatePlanets } from './planets.js';
import { makeSol } from './sol.js';

const SYL_A = ['ka', 've', 'lo', 'ri', 'sa', 'tu', 'ne', 'mi', 'zo', 'ar', 'el', 'or', 'da', 'phi', 'xe', 'yu', 'ha', 'bo', 'gi', 'ce'];
const SYL_B = ['ra', 'ta', 'nis', 'lon', 'dor', 'ria', 'sor', 'ven', 'mus', 'tan', 'lis', 'gar', 'pha', 'kon', 'dis', 'rix'];
const SYL_C = ['', '', '', 'a', 'is', 'on', 'ae', 'us'];

function makeNamer(rng) {
  const used = new Set(['Sol']);
  return () => {
    for (;;) {
      let n = rng.pick(SYL_A) + (rng.chance(0.5) ? rng.pick(SYL_A) : '') + rng.pick(SYL_B) + rng.pick(SYL_C);
      n = n[0].toUpperCase() + n.slice(1);
      if (!used.has(n)) { used.add(n); return n; }
    }
  };
}

function scatter(rng, count, meanSpacing) {
  const pts = [[0, 0]]; // 原点 = 太陽系
  const dmin = 0.45 * Math.sqrt(Math.PI / count); // 単位円での最小間隔
  for (let tries = 0; pts.length < count && tries < count * 500; tries++) {
    const r = Math.sqrt(rng.next());
    const th = rng.range(0, Math.PI * 2);
    const x = r * Math.cos(th);
    const y = r * Math.sin(th);
    if (pts.every((p) => (p[0] - x) ** 2 + (p[1] - y) ** 2 >= dmin * dmin)) pts.push([x, y]);
  }
  const k = meanSpacing / meanNearest(pts);
  return pts.map(([x, y]) => [x * k, y * k]);
}

export function nearestDistances(pts) {
  return pts.map((p, i) => {
    let best = Infinity;
    pts.forEach((q, j) => {
      if (i !== j) best = Math.min(best, Math.hypot(p[0] - q[0], p[1] - q[1]));
    });
    return best;
  });
}
const meanNearest = (pts) => {
  const d = nearestDistances(pts);
  return d.reduce((s, v) => s + v, 0) / d.length;
};

function makeSystem(rng, id, x, y, name) {
  const primary = makePrimary(rng);
  const companions = makeCompanions(rng, primary);
  // 伴星が近いと、その 1/3 より内側の軌道しか安定しない
  const maxA = companions.length ? companions[0].sep / 3 : 100;
  const bodies = generatePlanets(rng, primary, name, maxA);
  const stars = [
    { id: 's0', name: `${name} A`, ...primary, sep: 0, phase: 0 },
    ...companions.map((c, i) => ({
      id: `s${i + 1}`, name: `${name} ${'BC'[i]}`, ...c.star, sep: c.sep, phase: c.phase,
    })),
  ];
  if (stars.length === 1) stars[0].name = name;
  return { id, name, x, y, stars, bodies };
}

export function generateGalaxy({ seed = 1, starCount = 400, meanSpacing = 4 } = {}) {
  const rng = new Rng(typeof seed === 'number' ? seed : hashSeed(seed));
  const pts = scatter(rng, starCount, meanSpacing);
  const namer = makeNamer(rng);
  const systems = pts.map(([x, y], i) => {
    if (i > 0) return makeSystem(rng, i, x, y, namer());
    const sol = makeSol();
    return { id: 0, name: sol.name, x, y, stars: [{ id: 's0', name: '太陽', ...sol.star, sep: 0, phase: 0 }], bodies: sol.bodies };
  });
  const radius = Math.max(...systems.map((s) => Math.hypot(s.x, s.y)));
  return { seed, systems, radius, meanSpacing };
}

export const distance = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
