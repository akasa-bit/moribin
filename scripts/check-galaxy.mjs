// 生成ロジックの統計チェック: node scripts/check-galaxy.mjs [seed]
import { generateGalaxy, nearestDistances } from '../src/galaxy.js';

const seeds = process.argv[2] ? [process.argv[2]] : [1, 2, 3, 4, 5];
const total = {};
let totalStars = 0;
let planets = 0, hz = 0, good = 0, systemsWithGood = 0, multi = 0, systems = 0;
for (const seed of seeds) {
  const g = generateGalaxy({ seed, starCount: 400 });
  const nn = nearestDistances(g.systems.map((s) => [s.x, s.y]));
  const mean = nn.reduce((a, b) => a + b, 0) / nn.length;
  console.log(`seed=${seed} 星系=${g.systems.length} 半径=${g.radius.toFixed(1)}ly 最近接平均=${mean.toFixed(3)}ly 最小=${Math.min(...nn).toFixed(2)} 最大=${Math.max(...nn).toFixed(2)}`);
  if (Math.abs(mean - 4) > 1e-6) { console.error('平均距離が 4ly ではない'); process.exit(1); }
  for (const s of g.systems) {
    systems++;
    if (s.stars.length > 1) multi++;
    for (const st of s.stars) { total[st.cls] = (total[st.cls] || 0) + 1; totalStars++; }
    planets += s.bodies.length;
    hz += s.bodies.filter((b) => b.inHZ && b.type !== 'belt').length;
    const gd = s.bodies.filter((b) => b.settle.grade >= 2).length;
    good += gd;
    if (gd) systemsWithGood++;
  }
}
console.log('スペクトル型の割合(全恒星):');
for (const [c, n] of Object.entries(total).sort((a, b) => b[1] - a[1])) console.log(`  ${c.padEnd(2)} ${((100 * n) / totalStars).toFixed(2)}%  (${n})`);
console.log(`多重星系 ${((100 * multi) / systems).toFixed(1)}% / 1星系あたり惑星 ${(planets / systems).toFixed(2)} / HZ内の惑星 ${hz} / 入植適性≥2の惑星 ${good} (${systemsWithGood}星系)`);
