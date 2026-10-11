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

// Party size for loot splits (loot page and Session Kit); the Toolbox splitter defaults to 4 too.
const SPLIT_DEFAULT_WAYS = 4, SPLIT_MAX_WAYS = 20;
function partySize(value) {
  return Math.min(SPLIT_MAX_WAYS, Math.max(1, Math.floor(Number(value)) || SPLIT_DEFAULT_WAYS));
}

// A DM Toolbox link that opens the splitter prefilled (loot page and Session Kit).
function splitLink(coins, extraGp, ways) {
  const q = new URLSearchParams({ tab: 'split' });
  Object.keys(COIN_CP).forEach(k => { if (coins[k] > 0) q.set(k, Math.floor(coins[k])); });
  if (extraGp > 0) q.set('other', Math.round(extraGp * 100) / 100);
  if (ways && partySize(ways) !== SPLIT_DEFAULT_WAYS) q.set('n', partySize(ways));
  return 'toolbox.html?' + q.toString();
}

// "Split 4 ways: 52 gp 3 sp each, 2 cp left over" for copied loot text (F29); '' when there's nothing.
function splitLine(coins, extraGp, ways) {
  const { ways: n, each, left } = splitCoins(coinsToCp(coins, extraGp), partySize(ways));
  if (!each && !left) return '';
  const share = each ? formatCoins(each / 100, true) + ' each' : 'not a copper each';
  return `Split ${n} way${n === 1 ? '' : 's'}: ${share}${left ? `, ${left} cp left over` : ''}`;
}
