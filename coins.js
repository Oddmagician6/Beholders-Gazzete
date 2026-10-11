/* ============================================
   COIN FORMATTING: shared by the market, shop, loot, and Session Kit pages.
   Turns a gp amount into gold/silver/copper so players never have to convert.
   ============================================ */

// 52 gp 3 sp 7 cp, 1,250 gp, 4 sp 6 cp, 6 cp
function formatCoins(gp) {
  if (gp >= 1000) return Math.round(gp).toLocaleString('en-US') + ' gp';
  const total = Math.round(gp * 100);
  const g = Math.floor(total / 100), s = Math.floor(total / 10) % 10, c = total % 10;
  const parts = [g ? g.toLocaleString('en-US') + ' gp' : '', s ? s + ' sp' : '', c ? c + ' cp' : ''].filter(Boolean);
  return parts.length ? parts.join(' ') : '0 cp';
}
