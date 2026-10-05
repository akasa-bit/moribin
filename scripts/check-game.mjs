// 入植ロジックのチェック: node scripts/check-game.mjs
import assert from 'node:assert/strict';
import { generateGalaxy, distance } from '../src/galaxy.js';
import { Game } from '../src/game.js';

const g = new Game(generateGalaxy({ seed: 1 }));
const sol = g.system(0);
const near = g.galaxy.systems.slice(1).sort((a, b) => distance(sol, a) - distance(sol, b))[0];
const d = distance(sol, near);

// ステーションは惑星入植不可の天体(恒星)にも建てられる
assert.equal(g.check(near.id, 's0', 'station').ok, true);
assert.equal(g.check(near.id, 's0', 'planet').ok, false);

const r = g.dispatch(0, near.id, 's0', 'station');
assert.ok(r.ok);
assert.equal(g.check(near.id, 's0', 'station').ok, false, '二重派遣は不可');
assert.ok(Math.abs(r.ship.arrive - r.ship.depart - d) < 1e-9, '光速: 所要年数 = 距離[ly]');
g.advance(d - 0.01);
assert.equal(g.isColonized(near.id), false);
g.advance(0.02);
assert.equal(g.isColonized(near.id), true);
assert.equal(g.ships.length, 0);

// 惑星入植: 火星(適性=困難)は可、木星は不可
assert.equal(g.check(0, 'mars', 'planet').ok, true);
assert.equal(g.check(0, 'jupiter', 'planet').ok, false);
console.log(`OK: 最寄り ${near.name} まで ${d.toFixed(2)} ly → ${d.toFixed(2)} 年で到着`);
