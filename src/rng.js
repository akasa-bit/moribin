// シード付き乱数 (mulberry32)。同じシードなら同じ銀河が生成される。
export function hashSeed(str) {
  let h = 2166136261;
  for (const c of String(str)) h = Math.imul(h ^ c.charCodeAt(0), 16777619);
  return h >>> 0;
}

export class Rng {
  constructor(seed) {
    this.state = seed >>> 0;
  }
  next() {
    this.state = (this.state + 0x6d2b79f5) >>> 0;
    let t = this.state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }
  range(a, b) { return a + (b - a) * this.next(); }
  int(a, b) { return Math.floor(this.range(a, b + 1)); }
  chance(p) { return this.next() < p; }
  pick(arr) { return arr[Math.floor(this.next() * arr.length)]; }
  logUniform(a, b) { return Math.exp(this.range(Math.log(a), Math.log(b))); }
  normal(mu = 0, sigma = 1) {
    const u = 1 - this.next();
    const v = this.next();
    return mu + sigma * Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
  }
  poisson(lambda) {
    const L = Math.exp(-lambda);
    let k = 0;
    let p = 1;
    do { k++; p *= this.next(); } while (p > L);
    return k - 1;
  }
  weighted(items, weightOf) {
    const total = items.reduce((s, it) => s + weightOf(it), 0);
    let r = this.next() * total;
    for (const it of items) {
      r -= weightOf(it);
      if (r <= 0) return it;
    }
    return items[items.length - 1];
  }
}

export const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
