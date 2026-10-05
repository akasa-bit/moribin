export const TYPE_LABEL = {
  rocky: '岩石惑星', 'mini-neptune': 'ミニ・ネプチューン', 'gas-giant': 'ガス巨星', 'ice-giant': '氷巨星',
  dwarf: '矮小天体', belt: '小惑星帯',
};
export const SURFACE_LABEL = {
  molten: '溶岩の海', scorched: '灼熱の乾燥地表', frozen: '氷に閉ざされた地表', temperate: '温暖(陸と海)',
  ocean: '海洋が広がる', desert: '乾燥した荒地', barren: '大気のない岩盤',
};
export const BODY_COLOR = {
  molten: '#ff5a1f', scorched: '#c27a3a', frozen: '#cfe8f3', temperate: '#4d9a5b', ocean: '#3b82c4',
  desert: '#c9a063', barren: '#9a9a9a',
};
export const TYPE_COLOR = {
  'mini-neptune': '#8fb0d9', 'gas-giant': '#d8b07a', 'ice-giant': '#6fb5d6', dwarf: '#8d8d96', belt: '#777',
};
export const bodyColor = (b) => (b.surface && BODY_COLOR[b.surface]) || TYPE_COLOR[b.type] || '#aaa';
export const GRADE_LABEL = ['不可', '困難', '可', '良好(地球型)'];
export const fmt = (v, d = 2) => (v >= 100 ? v.toFixed(0) : v >= 10 ? v.toFixed(1) : v.toFixed(d));
