// ゲーム状態: 時間、入植地、入植船。
import { distance } from './galaxy.js';

export const SHIP_SPEED = 1.0; // 入植船の速度 [ly/年] = 光速 (1c)。後で調整可能にする
export const START_YEAR = 2300;

export const KIND_LABEL = { station: '宇宙ステーション', planet: '惑星入植地' };

export class Game {
  constructor(galaxy) {
    this.galaxy = galaxy;
    this.year = START_YEAR;
    this.colonies = [];
    this.ships = [];
    this.log = [];
    this.nextShipId = 1;
    this.addColony(0, 'earth', 'planet', '地球');
    this.message('ゲーム開始。地球から恒星間入植を進めよう。');
  }

  system(id) { return this.galaxy.systems[id]; }

  // 星系内の入植対象: 惑星・小惑星帯・恒星
  targetsOf(sys) { return [...sys.bodies, ...sys.stars]; }
  target(sysId, bodyId) { return this.targetsOf(this.system(sysId)).find((b) => b.id === bodyId); }

  coloniesIn(sysId) { return this.colonies.filter((c) => c.sys === sysId); }
  colonyAt(sysId, bodyId, kind) {
    return this.colonies.find((c) => c.sys === sysId && c.body === bodyId && c.kind === kind);
  }
  isColonized(sysId) { return this.colonies.some((c) => c.sys === sysId); }
  colonizedSystems() { return [...new Set(this.colonies.map((c) => c.sys))].map((i) => this.system(i)); }
  shipTo(sysId, bodyId, kind) {
    return this.ships.find((s) => s.to === sysId && s.body === bodyId && s.kind === kind);
  }

  // 入植可否と理由。惑星入植は適性≥1の固体天体のみ、ステーションは任意の天体の周回軌道に建設できる。
  check(sysId, bodyId, kind) {
    const t = this.target(sysId, bodyId);
    if (!t) return { ok: false, reason: '対象が存在しない' };
    if (this.colonyAt(sysId, bodyId, kind)) return { ok: false, reason: '建設済み' };
    if (this.shipTo(sysId, bodyId, kind)) return { ok: false, reason: '入植船が向かっている' };
    if (kind === 'planet' && !(t.settle && t.settle.grade >= 1)) {
      return { ok: false, reason: t.settle ? t.settle.notes.join('、') || '入植に適さない' : '惑星ではない' };
    }
    return { ok: true, reason: '' };
  }

  travelYears(fromId, toId) {
    return Math.max(distance(this.system(fromId), this.system(toId)), 0.001) / SHIP_SPEED;
  }

  dispatch(fromId, toId, bodyId, kind) {
    const c = this.check(toId, bodyId, kind);
    if (!c.ok) return c;
    if (!this.isColonized(fromId)) return { ok: false, reason: '出発地に入植地がない' };
    const years = this.travelYears(fromId, toId);
    const ship = {
      id: this.nextShipId++, from: fromId, to: toId, body: bodyId, kind,
      depart: this.year, arrive: this.year + years,
    };
    this.ships.push(ship);
    this.message(`${this.system(fromId).name} → ${this.system(toId).name} へ入植船が出発 (${KIND_LABEL[kind]}、到着まで ${years.toFixed(2)} 年)`);
    return { ok: true, ship };
  }

  addColony(sysId, bodyId, kind, name) {
    this.colonies.push({ sys: sysId, body: bodyId, kind, founded: this.year, name });
  }

  advance(dt) {
    this.year += dt;
    const arrived = this.ships.filter((s) => s.arrive <= this.year);
    if (!arrived.length) return false;
    this.ships = this.ships.filter((s) => s.arrive > this.year);
    for (const s of arrived) {
      const t = this.target(s.to, s.body);
      if (this.colonyAt(s.to, s.body, s.kind)) continue;
      this.addColony(s.to, s.body, s.kind, t.name);
      this.message(`${t.name} に${KIND_LABEL[s.kind]}を設立した (${this.system(s.to).name})`);
    }
    return true;
  }

  message(text) {
    this.log.unshift({ year: this.year, text });
    this.log.length = Math.min(this.log.length, 30);
  }

  shipPosition(s) {
    const a = this.system(s.from);
    const b = this.system(s.to);
    const f = Math.min(1, (this.year - s.depart) / (s.arrive - s.depart));
    return { x: a.x + (b.x - a.x) * f, y: a.y + (b.y - a.y) * f, f };
  }
}
