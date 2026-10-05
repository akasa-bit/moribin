// 惑星(天体)の生成と物理量の計算。単位: 距離=AU, 質量/半径=地球比, 時間=年。
import { clamp } from './rng.js';

const PLANETS_MEAN = { M: 3.2, K: 3.5, G: 3.5, F: 3, A: 2, B: 0.8, O: 0, WD: 1.2 };

// 平衡温度[K] (アルベド込み)
export const eqTemp = (lum, a, albedo) => (278.6 * ((1 - albedo) * lum) ** 0.25) / Math.sqrt(a);

export const frostLine = (star) => (star.wd ? 3 : 2.7 * Math.sqrt(star.lum));
export const habitableZone = (star) => ({ inner: 0.95 * Math.sqrt(star.lum), outer: 1.37 * Math.sqrt(star.lum) });

function pickType(rng, x) {
  const table =
    x < 0.5 ? [['rocky', 0.68], ['mini-neptune', 0.27], ['gas-giant', 0.05]]
    : x < 1.2 ? [['rocky', 0.55], ['mini-neptune', 0.3], ['gas-giant', 0.15]]
    : x < 8 ? [['gas-giant', 0.35], ['ice-giant', 0.22], ['rocky', 0.18], ['dwarf', 0.15], ['mini-neptune', 0.1]]
    : [['dwarf', 0.4], ['ice-giant', 0.25], ['rocky', 0.15], ['gas-giant', 0.1], ['mini-neptune', 0.1]];
  return rng.weighted(table, (e) => e[1])[0];
}

function physical(rng, type) {
  switch (type) {
    case 'dwarf': {
      const mass = rng.logUniform(0.0005, 0.05);
      return { mass, radius: mass ** 0.3, albedo: rng.range(0.1, 0.6) };
    }
    case 'rocky': {
      const mass = rng.logUniform(0.05, 8);
      return { mass, radius: mass < 1 ? mass ** 0.3 : mass ** 0.27, albedo: rng.range(0.1, 0.45) };
    }
    case 'mini-neptune': {
      const mass = rng.logUniform(2, 10);
      return { mass, radius: 1.6 + (2 * Math.log10(mass / 2)) / Math.log10(5), albedo: rng.range(0.2, 0.5) };
    }
    case 'ice-giant': {
      const mass = rng.logUniform(8, 40);
      return { mass, radius: 3.9 * (mass / 16) ** 0.3, albedo: rng.range(0.25, 0.5) };
    }
    default: {
      const mass = rng.logUniform(30, 1500);
      return { mass, radius: clamp(7 + 1.7 * Math.log10(mass), 8, 12.5), albedo: rng.range(0.3, 0.55) };
    }
  }
}

// 大気圧[atm]。脱出速度が大きく温度が低いほど大気を保持しやすい。
function atmosphere(rng, mass, radius, teq) {
  const index = (mass / radius / (teq / 255)) * rng.logUniform(0.1, 10);
  return index < 0.05 ? 0 : 0.6 * index ** 1.6 * rng.logUniform(0.3, 3);
}

const greenhouse = (p) => 1 + 0.1 * Math.log10(1 + 10 * p) + (p > 10 ? 0.5 * Math.log10(p / 10) : 0);

function classifySurface(t, p, water) {
  if (t > 1000) return 'molten';
  if (t > 450) return 'scorched';
  if (t < 200) return 'frozen';
  if (t >= 253 && t <= 373 && p >= 0.3 && p <= 5 && water > 0.2) return water > 0.7 ? 'ocean' : 'temperate';
  return p < 0.01 ? 'barren' : 'desert';
}

// 惑星入植の適性。ドーム/地下都市前提の「住みやすさ」で、テラフォーミング前の状態を評価する。
export function settleability(b) {
  if (b.type !== 'rocky' && b.type !== 'dwarf') {
    return { grade: 0, score: 0, notes: ['固体の地表がない'] };
  }
  const g = b.gravity;
  const t = b.tSurf;
  const p = b.pressure;
  const gs = g < 0.7 ? clamp((g - 0.1) / 0.6, 0, 1) : g > 1.3 ? clamp((2.5 - g) / 1.2, 0, 1) : 1;
  const ts = t < 273 ? clamp((t - 150) / 123, 0, 1) : t > 303 ? clamp((400 - t) / 97, 0, 1) : 1;
  const ps = p < 0.01 ? 0.15 : p < 0.5 ? 0.15 + (0.85 * (p - 0.01)) / 0.49 : p <= 3 ? 1 : clamp(1 - (p - 3) / 17, 0, 1);
  const ws = clamp(b.water, 0, 1);
  const score = 0.35 * gs + 0.35 * ts + 0.2 * ps + 0.1 * ws;
  const notes = [];
  if (g > 2.5) notes.push('重力が強すぎる');
  if (t > 600) notes.push('高温すぎる');
  if (t < 40) notes.push('極低温');
  const hardNo = g > 2.5 || t > 600 || t < 40;
  const earthlike = score >= 0.9 && p >= 0.5 && p <= 3 && b.water > 0.4 && g >= 0.7 && g <= 1.5;
  const grade = hardNo ? 0 : earthlike ? 3 : score >= 0.65 ? 2 : score >= 0.3 ? 1 : 0;
  if (!hardNo && grade === 0) notes.push('環境が過酷すぎる');
  return { grade, score, notes };
}

// 共通の派生量を計算して天体を完成させる。
export function finalizeBody(body, star) {
  body.period = Math.sqrt(body.a ** 3 / star.mass);
  body.tidalLock = body.a < 0.25 * Math.cbrt(star.mass) && body.type !== 'belt';
  const hz = habitableZone(star);
  body.inHZ = body.a >= hz.inner && body.a <= hz.outer;
  if (body.type === 'belt') {
    body.tSurf = eqTemp(star.lum, body.a, 0.1);
    body.settle = { grade: 0, score: 0, notes: ['小天体の集まりで入植に適した地表がない'] };
    return body;
  }
  body.gravity = body.mass / body.radius ** 2;
  body.teq = eqTemp(star.lum, body.a, body.albedo);
  if (body.pressure === undefined) body.pressure = 0;
  if (body.tSurf === undefined) body.tSurf = body.teq * greenhouse(body.pressure);
  if (body.type === 'rocky' || body.type === 'dwarf') {
    body.surface = classifySurface(body.tSurf, body.pressure, body.water);
  }
  body.settle = settleability(body);
  return body;
}

// 主星まわりの惑星系を生成する。maxA: 軌道が安定に保てる最大半径[AU] (伴星が近いと小さい)。
export function generatePlanets(rng, star, sysName, maxA) {
  if (maxA < 0.1) return [];
  const count = Math.min(9, rng.poisson(PLANETS_MEAN[star.cls]));
  const frost = frostLine(star);
  let a = star.wd ? rng.logUniform(1, 10) : rng.logUniform(0.05, 0.5) * star.lum ** 0.25;
  const bodies = [];
  for (let i = 0; i < count && a <= maxA; i++, a *= rng.range(1.4, 2.2)) {
    const type = pickType(rng, a / frost);
    const b = { type, a, phase: rng.range(0, Math.PI * 2), ...physical(rng, type), water: 0 };
    if (type === 'rocky' || type === 'dwarf') {
      const teq = eqTemp(star.lum, a, b.albedo);
      b.pressure = type === 'dwarf' && teq > 120 ? 0 : atmosphere(rng, b.mass, b.radius, teq);
      b.water = rng.next() ** 1.5;
    }
    bodies.push(b);
  }
  // 小惑星帯: 雪線付近に確率的に置く(近すぎる惑星があれば作らない)
  const beltA = frost * rng.range(0.9, 1.3);
  if (!star.wd && beltA < maxA && rng.chance(0.45) && bodies.every((b) => Math.abs(Math.log(b.a / beltA)) > 0.25)) {
    bodies.push({ type: 'belt', a: beltA, phase: rng.range(0, Math.PI * 2) });
  }
  bodies.sort((x, y) => x.a - y.a);
  let letter = 'b'.charCodeAt(0);
  bodies.forEach((b) => {
    if (b.type === 'belt') {
      b.id = `belt${b.a.toFixed(2)}`;
      b.name = `${sysName} 小惑星帯`;
    } else {
      const l = String.fromCharCode(letter++);
      b.id = l;
      b.name = `${sysName} ${l}`;
    }
    finalizeBody(b, star);
  });
  return bodies;
}
