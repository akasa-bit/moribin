// 太陽系(実データ)。ゲームの開始地点。
import { tempToColor } from './stars.js';
import { finalizeBody } from './planets.js';

const sun = {
  cls: 'G', label: 'G2 V', mass: 1, radius: 1, lum: 1, temp: 5772,
  color: tempToColor(5772), wd: false,
};

const P = (id, name, type, a, mass, radius, extra = {}) => ({
  id, name, type, a, mass, radius, albedo: 0.3, water: 0, pressure: 0, phase: 0, ...extra,
});

export function makeSol() {
  const bodies = [
    P('mercury', '水星', 'rocky', 0.387, 0.055, 0.383, { albedo: 0.09, tSurf: 440, surface: 'barren' }),
    P('venus', '金星', 'rocky', 0.723, 0.815, 0.949, { albedo: 0.77, pressure: 92, tSurf: 737, surface: 'scorched' }),
    P('earth', '地球', 'rocky', 1, 1, 1, { albedo: 0.3, pressure: 1, water: 0.71, tSurf: 288, surface: 'temperate' }),
    P('mars', '火星', 'rocky', 1.524, 0.107, 0.532, { albedo: 0.25, pressure: 0.006, tSurf: 210, surface: 'desert' }),
    P('belt', '小惑星帯', 'belt', 2.77, 0, 0),
    P('jupiter', '木星', 'gas-giant', 5.2, 318, 11.2, { albedo: 0.5 }),
    P('saturn', '土星', 'gas-giant', 9.58, 95, 9.45, { albedo: 0.34 }),
    P('uranus', '天王星', 'ice-giant', 19.2, 14.5, 4, { albedo: 0.3 }),
    P('neptune', '海王星', 'ice-giant', 30.07, 17.1, 3.88, { albedo: 0.29 }),
    P('pluto', '冥王星', 'dwarf', 39.5, 0.0022, 0.186, { albedo: 0.5, tSurf: 44, surface: 'frozen' }),
  ];
  bodies.forEach((b, i) => {
    b.phase = i * 2.1; // 見た目用の初期位相
    const keep = { surface: b.surface, tSurf: b.tSurf };
    finalizeBody(b, sun);
    Object.assign(b, Object.fromEntries(Object.entries(keep).filter(([, v]) => v !== undefined)));
  });
  return { name: '太陽系 (Sol)', star: sun, bodies };
}
