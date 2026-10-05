// セーブ/ロード: ブラウザの localStorage に1スロット。銀河はシードから再生成するので、
// 保存するのは時刻・入植地・入植船・ログだけ(軽量)。
const KEY = 'moribin.save.v1';

export function writeSave(game, extra = {}) {
  try {
    const data = {
      v: 1, seed: game.galaxy.seed, year: game.year, colonies: game.colonies, ships: game.ships,
      log: game.log, nextShipId: game.nextShipId, ...extra,
    };
    localStorage.setItem(KEY, JSON.stringify(data));
    return true;
  } catch {
    return false; // 保存不可(プライベートモード等)
  }
}

export function readSave() {
  try {
    const d = JSON.parse(localStorage.getItem(KEY));
    return d && d.v === 1 ? d : null;
  } catch {
    return null;
  }
}

export function clearSave() {
  try { localStorage.removeItem(KEY); } catch { /* 無視 */ }
}
