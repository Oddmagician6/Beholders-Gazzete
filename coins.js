/* ============================================
   COIN FORMATTING: shared by the market, shop, loot, Session Kit, and Toolbox pages.
   Turns a gp amount into gold/silver/copper so players never have to convert.
   Party splits (F24): coin counts → copper, then equal shares plus leftover copper.
   ============================================ */

// 52 gp 3 sp 7 cp, 1,250 gp, 4 sp 6 cp, 6 cp. exact keeps sp/cp past 1,000 gp (a party share).
function formatCoins(gp, exact = false) {
  if (gp >= 1000 && !exact) return Math.round(gp).toLocaleString('en-US') + ' gp';
  const total = Math.round(gp * 100);
  const g = Math.floor(total / 100), s = Math.floor(total / 10) % 10, c = total % 10;
  const parts = [g ? g.toLocaleString('en-US') + ' gp' : '', s ? s + ' sp' : '', c ? c + ' cp' : ''].filter(Boolean);
  return parts.length ? parts.join(' ') : '0 cp';
}

// Copper per coin (SRD 5.1: 1 pp = 10 gp = 20 ep = 100 sp = 1,000 cp).
const COIN_CP = { cp: 1, sp: 10, ep: 50, gp: 100, pp: 1000 };

// { cp, sp, ep, gp, pp } (any missing) plus extra treasure in gp → total copper.
function coinsToCp(coins, extraGp = 0) {
  const fromCoins = Object.entries(COIN_CP).reduce((t, [k, v]) => t + (Math.max(0, Math.floor(coins[k] || 0)) * v), 0);
  return fromCoins + Math.max(0, Math.round((extraGp || 0) * 100));
}

// Equal shares in copper; the leftover is always fewer coppers than the party size.
function splitCoins(totalCp, ways) {
  const n = Math.max(1, Math.floor(ways) || 1);
  const each = Math.floor(totalCp / n);
  return { ways: n, each, left: totalCp - each * n };
}

// A DM Toolbox link that opens the splitter prefilled (loot page and Session Kit).
function splitLink(coins, extraGp) {
  const q = new URLSearchParams({ tab: 'split' });
  Object.keys(COIN_CP).forEach(k => { if (coins[k] > 0) q.set(k, Math.floor(coins[k])); });
  if (extraGp > 0) q.set('other', Math.round(extraGp * 100) / 100);
  return 'toolbox.html?' + q.toString();
}
