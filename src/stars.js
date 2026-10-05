// 恒星の生成。スペクトル型の存在比・質量・光度は現実の近傍星の統計に準拠。
import { clamp } from './rng.js';

// weight: 個数比(%)。O型は実際に 0.00003% 程度しかない。
// skew: 質量範囲内で軽い側に偏らせる指数 (初期質量関数の近似)
const CLASSES = [
  { cls: 'O', lo: 16, hi: 60, weight: 0.00003, skew: 1.5 },
  { cls: 'B', lo: 2.1, hi: 16, weight: 0.13, skew: 2 },
  { cls: 'A', lo: 1.4, hi: 2.1, weight: 0.6, skew: 1.3 },
  { cls: 'F', lo: 1.04, hi: 1.4, weight: 3, skew: 1.2 },
  { cls: 'G', lo: 0.8, hi: 1.04, weight: 7.6, skew: 1 },
  { cls: 'K', lo: 0.45, hi: 0.8, weight: 12.1, skew: 1 },
  { cls: 'M', lo: 0.08, hi: 0.45, weight: 73, skew: 1.8 },
  { cls: 'WD', weight: 3.5 }, // 白色矮星
];

// 近接連星・多重星になる確率 (Raghavan+2010 などの概数)
const MULTIPLICITY = { O: 0.9, B: 0.8, A: 0.7, F: 0.5, G: 0.44, K: 0.41, M: 0.27, WD: 0.3 };

const SOLAR_TEMP = 5772;

const lumFromMass = (m) =>
  m < 0.43 ? 0.23 * m ** 2.3 : m < 2 ? m ** 4 : m < 55 ? 1.4 * m ** 3.5 : 32000 * m;
const radiusFromMass = (m) => (m < 1 ? m ** 0.8 : m ** 0.57);

export function tempToColor(T) {
  const t = clamp(T, 1000, 40000) / 100;
  let r, g, b;
  if (t <= 66) {
    r = 255;
    g = 99.4708025861 * Math.log(t) - 161.1195681661;
    b = t <= 19 ? 0 : 138.5177312231 * Math.log(t - 10) - 305.0447927307;
  } else {
    r = 329.698727446 * (t - 60) ** -0.1332047592;
    g = 288.1221695283 * (t - 60) ** -0.0755148492;
    b = 255;
  }
  const c = (v) => Math.round(clamp(v, 0, 255));
  return `rgb(${c(r)},${c(g)},${c(b)})`;
}

function mainSequence(cls, mass) {
  const def = CLASSES.find((c) => c.cls === cls);
  const lum = lumFromMass(mass);
  const radius = radiusFromMass(mass);
  const temp = SOLAR_TEMP * (lum / radius ** 2) ** 0.25;
  const sub = clamp(Math.floor((10 * (def.hi - mass)) / (def.hi - def.lo)), 0, 9);
  return { cls, label: `${cls}${sub} V`, mass, radius, lum, temp, color: tempToColor(temp), wd: false };
}

function whiteDwarf(rng) {
  const mass = clamp(rng.normal(0.6, 0.12), 0.4, 1.1);
  const radius = 0.0115 * (0.6 / mass) ** (1 / 3);
  const temp = 4000 + 21000 * rng.next() ** 3; // 古いものほど数が多く冷たい
  const lum = radius ** 2 * (temp / SOLAR_TEMP) ** 4;
  return {
    cls: 'WD', label: `DA${(50400 / temp).toFixed(1)}`, mass, radius, lum, temp,
    color: tempToColor(temp), wd: true,
  };
}

export function classOfMass(m) {
  return CLASSES.find((c) => c.lo !== undefined && m >= c.lo && m < c.hi)?.cls ?? (m < 0.08 ? 'M' : 'O');
}

// 主星を生成する。
export function makePrimary(rng) {
  const def = rng.weighted(CLASSES, (c) => c.weight);
  if (def.cls === 'WD') return whiteDwarf(rng);
  const mass = def.lo + (def.hi - def.lo) * rng.next() ** def.skew;
  return mainSequence(def.cls, mass);
}

// 伴星(0〜2個)を生成する。sep は主星との距離[AU] (対数正規分布、中央値≈30AU)。
export function makeCompanions(rng, primary) {
  if (!rng.chance(MULTIPLICITY[primary.cls])) return [];
  const n = rng.chance(0.2) ? 2 : 1;
  const out = [];
  for (let i = 0; i < n; i++) {
    const mass = Math.max(0.08, primary.mass * rng.range(0.15, 1));
    const star = mainSequence(classOfMass(mass), mass);
    const sep = clamp(10 ** rng.normal(1.5, 1.3), 0.05, 20000) * (i + 1);
    out.push({ star, sep, phase: rng.range(0, Math.PI * 2) });
  }
  return out.sort((a, b) => a.sep - b.sep);
}
