/* ============================================
   PLAYER SHEETS (F51): what a notebook entry can show the players
   A notebook entry keeps only the link that rolls it, so a sheet rolls it again from
   that link, the way its tab would, and lays the roll out as labelled lines in parts:
     { parts: [{ head, lines: [{ key, label, text, dm }] }] }
   dm: the line is for the DM only unless the DM switches it (secrets, hooks, how a
   site was lost, who really rules a town). An entry's `flip` holds the keys of the
   lines the DM switched either way, so a key must stay the same for the same link:
   it is "<part head>|<label>". Rooms, foes, traps, stat blocks, and treasure never
   make a sheet at all. The entry's own summary and notes lead every sheet; its DM-only
   notes never do. Sessions and quests have no roll: their own fields are the sheet.
   Rolled lines carry `edit: true` (the DM may reword them); a reworded one shows the entry's
   `edits` text and keeps the rolled wording in `was`. Pins and family lines have editors of their own.
   A family (F55) keeps its people in the entry: one line each (keyed by person id, so a
   rename keeps its switch), their notes and the family's secrets DM-only.
   Needs the Worldbuilder page: every engine, and each tab's _FIELDS and _KEYS maps.
   ============================================ */

const nbSheetCache = new Map();
// Kinds whose saved summary gives something away (a site's says who holds it), or means nothing to
// players (a map's is its size in pixels), so it starts DM-only.
const NB_SUB_DM = { sites: true, map: true };

// End a rolled phrase with a stop, unless it has one.
function nbStop(s) {
    return s && !/[.!?"”)]$/.test(s) ? s + '.' : s;
}

// A line of a sheet.
function nbLine(head, label, text, dm = false) {
    return { key: `${head}|${label}`, label, text: String(text || '').trim(), dm };
}

// [label, text] pairs → lines; labels in dmLabels start DM-only.
function nbLinesOf(head, pairs, dmLabels = []) {
    return pairs.filter(([, text]) => text).map(([label, text]) => nbLine(head, label, text, dmLabels.includes(label)));
}

// Split a line where a secret starts ("… The real power: …") into the public part and a DM-only line.
function nbSplitLine(lines, label, marker, dmLabel) {
    const i = lines.findIndex(l => l.label === label && l.text.includes(marker));
    if (i < 0) return lines;
    const l = lines[i], at = l.text.indexOf(marker);
    lines.splice(i, 1, nbLine(l.key.split('|')[0], label, l.text.slice(0, at)),
        nbLine(l.key.split('|')[0], dmLabel, facCap(l.text.slice(at + marker.length).trim()), true));
    return lines;
}

// A tab's options from a link: the link's value when the field can hold it, else the field's default.
function nbUrlOpts(p, fields) {
    return Object.fromEntries(Object.entries(fields).map(([key, id]) => {
        const el = document.getElementById(id), v = p.get(key);
        const ok = v !== null && (el.tagName !== 'SELECT' || [...el.options].some(o => o.value === v));
        return [key, ok ? v : defaultValue(el)];
    }));
}

// A linked roll a link names: { seed, ...options ('random' where unset) }, or null.
function nbUrlLink(p, seedKey, keys) {
    const seed = parseSeed(p.get(seedKey));
    if (!seed) return null;
    const o = { seed };
    Object.entries(keys).forEach(([key, opt]) => { o[opt] = p.get(key) || 'random'; });
    return o;
}

function nbUrlPantheon(p, keys) {
    const g = nbUrlLink(p, 'gods', keys);
    return g ? rollPantheon(g.seed, g) : null;
}

// ── One builder per kind: URL params → parts ──────────────
const NB_SHEETS = {
    calendar(p, seed) {
        const cal = rollCalendar(seed, nbUrlOpts(p, CAL_FIELDS));
        const top = nbLinesOf('', [
            ['Era', `${calCap(cal.era.name)} (${cal.era.abbr}). Year ${cal.year.toLocaleString('en-US')}, ${cal.yearName}. ${cal.era.note}`],
            ['Today', calTodayLines(cal).join(' ')],
            ['The year', `${calYearDays(cal)} days: ${cal.months.length} months, a ${cal.week.names.length}-day week, ${cal.moons.length} moon${cal.moons.length === 1 ? '' : 's'}. ${CAL_STARTS[cal.start].text}`],
            ['The week', `${cal.week.names.join(', ')}. ${cal.week.names[cal.week.rest]} is the day of rest; ${cal.week.names[cal.week.market]} is market day.`],
            ['Months', cal.months.map(m => `${calMonthLabel(m)} ("${m.nickname}", ${m.days} days)`).join(', ') + '.'],
            ...cal.moons.map((mo, i) => [cal.moons.length === 1 ? 'The moon' : `Moon ${i + 1}`, `${calMoonLine(cal, mo)} ${mo.lore}`])
        ]);
        const fests = cal.months.map((m, i) => {
            const f = calFestivalLines(cal, i);
            const head = `${f.icon} ${f.name}`;
            return { head, lines: nbLinesOf(head, f.lines, ['What could go wrong']) };
        });
        return [{ head: '', lines: top }, ...fests];
    },

    pantheon(p, seed) {
        const pan = rollPantheon(seed, nbUrlOpts(p, PAN_FIELDS));
        const top = nbLinesOf('', [
            ['The gods', `${panSummary(pan)} ${PAN_SHAPES[pan.shape].about}`],
            ['Home', panCap(pan.home) + '.'],
            ['In the beginning', pan.creation],
            ['After death', pan.afterlife],
            ['Do they walk the world?', pan.walks]
        ]);
        const gods = pan.gods.map((g, i) => {
            const head = `${PAN_DOMAINS[g.domain].icon} ${panCap(panTitleLine(g))}`;
            return { head, lines: nbLinesOf(head, panGodLines(pan, i, null), ['For the party']) };
        });
        return [{ head: '', lines: top }, ...gods];
    },

    factions(p, seed) {
        const w = rollFactions(seed, nbUrlOpts(p, FAC_FIELDS));
        const ctx = { pantheon: nbUrlPantheon(p, FAC_GOD_KEYS) };
        const parts = w.factions.map((f, i) => {
            const head = `${FAC_TYPES[f.type].icon} ${facCap(facName(w, i, ctx))}`;
            const lines = nbLinesOf(head, facLines(w, i, ctx), ['Secret', 'For the party']);
            f.lieutenants.forEach(l => {
                lines.push(nbLine(head, l.role, facPersonLine(l) + '.'));
                lines.push(nbLine(head, `${l.role}: what they want`, facCap(facFill(l.motive, w, i, ctx)), true));
            });
            return { head, lines };
        });
        const ties = [
            ...w.rivals.map(r => [`${facCap(facName(w, r.a, ctx))} and ${facName(w, r.b, ctx)}`, facTieText(w, r, ctx, 'rival')]),
            ...w.allies.map(r => [`${facCap(facName(w, r.a, ctx))} and ${facName(w, r.b, ctx)}`, facTieText(w, r, ctx, 'ally')])
        ];
        if (ties.length) parts.push({ head: 'Rivalries and alliances', lines: nbLinesOf('Rivalries and alliances', ties) });
        return [{ head: '', lines: [nbLine('', 'The powers', facSummary(w, ctx))] }, ...parts];
    },

    history(p, seed) {
        const h = rollHistory(seed, nbUrlOpts(p, HIS_FIELDS));
        const pantheon = nbUrlPantheon(p, HIS_GOD_KEYS);
        const f = nbUrlLink(p, 'facs', HIS_FAC_KEYS);
        const ctx = { pantheon, factions: f ? rollFactions(f.seed, f) : null, facCtx: { pantheon } };
        const ages = h.list.map((age, i) => {
            const head = `${HIS_KINDS[age.kind].icon} Age ${i + 1}: ${hisCap(age.name)}`;
            let lines = nbLinesOf(head, hisAgeLines(h, i, ctx));
            // What each legacy means today is a hook for the DM.
            lines.filter(l => / left behind$/.test(l.label)).forEach(l => { lines = nbSplitLine(lines, l.label, ' Today: ', `${l.label}: today`); });
            return { head, lines };
        });
        return [{ head: '', lines: [nbLine('', 'The ages', hisSummary(h))] }, ...ages];
    },

    town(p, seed) {
        const pantheon = nbUrlPantheon(p, TOWN_GOD_KEYS);
        const cs = nbUrlLink(p, 'cont', TOWN_CONT_KEYS);
        let realm = null;
        if (cs) {
            const c = contCached(cs.seed, cs), t = c.towns[(parseInt(p.get('ctown'), 10) || 0) - 1];
            realm = t ? { c, t, nat: c.nations[t.nation] } : null;
        }
        const t = rollTown(seed, { ...nbUrlOpts(p, TOWN_FIELDS), govs: realm ? realm.t.govs : null });
        const ctx = { factions: townFactions(t), pantheon, realm };
        const top = nbSplitLine(nbLinesOf('', [['What it is', townSummary(t)], ...townLines(t, ctx), ['Trouble', townTroubleText(t, ctx)],
            ['Behind it', townBehindText(t, ctx)]], ['Trouble', 'Behind it']),
            'Rule', ' The real power: ', 'The real power');
        let people = nbLinesOf('Notable people', townPeopleLines(t, ctx));
        people.filter(l => l.text.includes(' Secretly works for ')).forEach(l => { people = nbSplitLine(people, l.label, ' Secretly works for ', `${l.label}: secretly works for`); });
        const parts = [
            { head: '', lines: top },
            { head: 'Districts', lines: nbLinesOf('Districts', [...townDistrictLines(t), ['Buildings', townBuildingsText(t)]]) },
            { head: 'Notable people', lines: people },
            { head: 'Laws and customs', lines: nbLinesOf('Laws and customs', [...townLawLines(t).map((l, i) => [`Law ${i + 1}`, l]), ...t.customs.map((c, i) => [`Custom ${i + 1}`, c])]) },
            { head: 'Market, sights, and legend', lines: nbLinesOf('Market, sights, and legend', townMoreLines(t, ctx), ['The truth']) },
            { head: 'Taverns and shops', lines: nbLinesOf('Taverns and shops', [
                ...t.taverns.map((tv, i) => [`Tavern ${i + 1}`, townTavernLine(t, tv, townTavern(tv))]),
                ...t.shops.map((sh, i) => [`Shop ${i + 1}`, townShopLine(t, sh, townShop(sh))])
            ]) }
        ];
        if (ctx.factions) {
            parts.push({ head: 'Factions in town', lines: nbLinesOf('Factions in town', ctx.factions.factions.map((f, i) =>
                [`${FAC_TYPES[f.type].icon} ${facCap(facName(ctx.factions, i, ctx))}`, FAC_TYPES[f.type].label + '.'])) });
        }
        return parts;
    },

    sites(p, seed) {
        const s = rollSite(seed, nbUrlOpts(p, SITE_FIELDS));
        const h = nbUrlLink(p, 'his', SITE_HIS_KEYS);
        const history = h ? rollHistory(h.seed, h) : null;
        const hage = (parseInt(p.get('hage'), 10) || 0) - 1;
        const ctx = { history, hage: history && hage >= 0 && hage < history.list.length ? hage : -1 };
        // The summary names who holds it now, so the players get only what it is.
        return [{ head: '', lines: nbLinesOf('', [['What it is', siteSummary(s)], ['Kind', siteCap(SITE_KINDS[s.kind].label) + '.'], ...siteStoryLines(s, ctx)], ['What it is', 'Lost', 'Now']) }];
    },

    continent(p, seed) {
        const c = contCached(seed, nbUrlOpts(p, CONT_FIELDS));
        const nations = c.nations.map((nat, k) => {
            const head = facCap(nat.name);
            return { head, lines: nbLinesOf(head, contNationLines(c, k), ['The ruler\'s worry']) };
        });
        const places = [];
        c.pois.forEach(poi => {
            const name = `${facCap(poi.name)} (${CONT_POIS[poi.kind].label.toLowerCase()})`;
            places.push(nbLine('Places worth the trip', name, contPoiWhere(c, poi)));
            places.push(nbLine('Places worth the trip', `${name}: the tale`, contPoiHook(c, poi), true));
        });
        const top = [nbLine('', 'The land', contSummary(c))];
        if (c.seas.length) top.push(nbLine('', 'Seas', contSeaLines(c).join(' ')));
        return [{ head: '', lines: top }, ...nations, { head: 'Places worth the trip', lines: places },
            { head: 'Roads', lines: nbLinesOf('Roads', c.roads.map((r, i) => [`Road ${i + 1}`, contRoadLine(c, r)])) }];
    },

    npc(p, seed) {
        const pick = (v, list) => (list.includes(v) ? v : 'random');
        const fields = {
            race: pick(p.get('race'), NPC_RACES), profession: pick(p.get('profession'), Object.keys(npcData.professions)),
            age: pick(p.get('age'), NPC_AGE_BUCKETS), gender: pick(p.get('gender'), NPC_GENDERS),
            name: p.get('name'), role: p.get('role')
        };
        const pinned = Object.fromEntries(p.getAll('lock').map(t => parseNpcLock(t)).filter(Boolean));
        const n = rollNpcPinned(fields, seed, pinned);
        return [{ head: '', lines: nbLinesOf('', [
            ['Who', `${facCap(n.race)} ${n.profession.toLowerCase()}, aged ${parseInt(n.age, 10)}.`],
            ['Build', n.build + '.'],
            [n.hairLabel, facCap(n.hairLook) + '.'],
            ['Eyes', facCap(n.eyes) + '.'],
            ['Feature', nbStop(n.feature)],
            ['Wears', facCap(n.clothing) + '.'],
            ['Voice', nbStop(n.voice)],
            ['Manner', nbStop(n.trait)],
            ['When you meet them', nbStop(n.doing)],
            ['Says', `"${n.dialogue.replace(/^"|"$/g, '')}"`],
            ['Alignment', nbStop(n.alignment)],
            ['Ideal', nbStop(n.ideal)],
            ['Bond', nbStop(n.bond)],
            ['Flaw', nbStop(n.flaw)],
            ['Pockets', `${n.pockets.join('; ')}. Purse: ${n.purse}.`],
            ['Ties', nbStop(n.relationship)],
            ['Hook', nbStop(n.questHook)],
            ['Secret', nbStop(n.secret)]
        ], ['Alignment', 'Ideal', 'Bond', 'Flaw', 'Pockets', 'Ties', 'Hook', 'Secret']) }];
    }
};

// The roll's parts for an entry, or null when its link can't be rolled here. Cached by link.
function nbRolledParts(e) {
    if (!e.href || !NB_SHEETS[e.kind]) return [];
    if (nbSheetCache.has(e.href)) return nbSheetCache.get(e.href);
    let parts = null;
    try {
        const p = nbQuery(e.href), seed = parseSeed(p.get('seed'));
        if (seed) parts = NB_SHEETS[e.kind](p, seed).filter(part => part.lines.length);
    } catch (err) {
        parts = null;
    }
    nbSheetCache.set(e.href, parts);
    return parts;
}

// The roll's parts with the entry's reworded lines in place ([] without a roll, null when the link no longer rolls).
function nbRolledSheet(e) {
    const rolled = nbRolledParts(e);
    if (!rolled) return rolled;
    const edits = e.edits || {};
    return rolled.map(part => ({ ...part, lines: part.lines.map(l => (Object.hasOwn(edits, l.key)
        ? { ...l, text: edits[l.key], was: l.text, edit: true } : { ...l, edit: true })) }));
}

// The whole sheet for an entry: its own lines first (summary, hand-written fields, notes), then the roll.
// Returns { parts, broken } — broken: the link no longer rolls.
function nbSheet(e) {
    const own = [];
    if (e.kind === 'session') {
        own.push(...nbLinesOf('', [
            ['Played on', e.date ? nbDateText(e.date) : ''], ['What happened', e.recap], ['NPCs met', e.npcs],
            ['Loot handed out', e.loot], ['Open threads', nbLines(e.threads).join('; ')]
        ]));
    } else if (e.kind === 'quest') {
        own.push(...nbLinesOf('', [['The job', e.sub], ['Status', NB_QUEST_STATUS[e.status].label], ['Giver', e.giver], ['Reward', e.reward]]));
    } else if (e.sub) {
        own.push(nbLine('', 'In short', e.sub, !!NB_SUB_DM[e.kind]));
    }
    if (e.notes) own.push(nbLine('', 'Notes', e.notes));
    const rolled = nbRolledSheet(e);
    const parts = rolled || [];
    // The entry's own lines lead the sheet, ahead of the roll's untitled part.
    if (parts.length && parts[0].head === '') parts[0].lines = [...own, ...parts[0].lines.filter(l => !own.some(o => o.key === l.key) && (l.was || l.text) !== e.sub)];
    else if (own.length) parts.unshift({ head: '', lines: own });
    // Map pins (F53) start DM-only: a pin is as likely to mark a secret as a sight. Keyed by pin id, so a rename keeps its switch.
    if (e.pins && e.pins.length) {
        parts.push({ head: 'Pins on the map', lines: e.pins.map((p, n) =>
            ({ key: `Pins on the map|${p.id}`, label: `${n + 1}. ${pinLabel(p, n)}`, text: p.note || 'Marked on the map.', dm: true })) });
    }
    if (e.fam && typeof famPersonLine === 'function') {
        const fam = e.fam;
        parts.push({ head: 'The family', lines: fam.people.flatMap(p => [
            { key: `The family|${p.id}`, label: p.name, text: famPersonLine(fam, p), dm: false },
            ...(p.note ? [{ key: `The family|${p.id}|note`, label: `About ${p.name.split(' ')[0]}`, text: p.note, dm: true }] : [])
        ]) });
        if (fam.scandals.length) {
            parts.push({ head: 'Family secrets', lines: fam.scandals.map(s =>
                ({ key: `Family secrets|${hashString(s.text + '|' + s.who.join(','))}`, label: 'Secret', text: famScandalText(fam, s), dm: true })) });
        }
    }
    return { parts, broken: rolled === null };
}

// Does this line go to the players? Its default, unless the DM switched it.
function nbShown(e, line) {
    return line.dm === (e.flip || []).includes(line.key);
}
