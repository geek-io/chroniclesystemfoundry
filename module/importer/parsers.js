/**
 * Chronicle System importer parsers.
 *
 * Every function here is pure (no Foundry globals) so it can run in the browser importer, in macros, and in the
 * Node build tools that produce the system compendiums. Each parser returns plain Foundry document data:
 *   {name, type, img?, system: {...}, items?: [...]}
 */

export const ABILITIES = [
    "Agility", "Animal Handling", "Athletics", "Awareness", "Cunning", "Deception", "Endurance",
    "Fighting", "Healing", "Knowledge", "Language", "Marksmanship", "Persuasion", "Status",
    "Stealth", "Survival", "Thievery", "Warfare", "Will"
];

export const ITEM_TYPES = ["ability", "armor", "benefit", "drawback", "equipment", "event", "holding", "poison", "technique", "weapon",
    "ancestry", "art", "work", "tradition"];
export const ACTOR_TYPES = ["character", "npc", "house"];

/* -------------------------------------------- */
/*  Small helpers                               */
/* -------------------------------------------- */

const int = (v, d = 0) => {
    const n = parseInt(String(v ?? "").replace(/[^\d+-]/g, ""), 10);
    return Number.isFinite(n) ? n : d;
};

export function normalizeWhitespace(text) {
    return String(text ?? "")
        .replace(/\r\n?/g, "\n")
        .replace(/[‒–—−]/g, "-")   // en/em dashes and minus signs
        .replace(/[‘’]/g, "'")
        .replace(/[“”]/g, "\"")
        .replace(/ /g, " ")
        .replace(/ﬁ/g, "fi").replace(/ﬂ/g, "fl")
        .replace(/[ \t]+/g, " ");
}

export function titleCase(text) {
    return String(text ?? "").toLowerCase().replace(/(^|[\s(\-/'])([a-z])/g, (m, p, c) => p + c.toUpperCase())
        .replace(/\b(Of|The|And|In|On|A|An|To|With|From)\b/g, (w, _m, offset) => offset === 0 ? w : w.toLowerCase());
}

const escapeHtml = (s) => String(s ?? "").replace(/[&<>"]/g, (c) => ({"&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;"}[c]));

/** Wrap plain text paragraphs in <p> tags (leaves existing HTML alone). */
export function toHtml(text) {
    const t = String(text ?? "").trim();
    if (!t) return "";
    if (/<\/?[a-z][\s\S]*>/i.test(t)) return t;
    return t.split(/\n{2,}/).map((p) => `<p>${escapeHtml(p.replace(/\n/g, " ").trim())}</p>`).join("");
}

/** Find the canonical ability name for a loose spelling ("animal handling", "Marksman"...). */
export function canonicalAbility(name) {
    const n = String(name ?? "").trim().toLowerCase().replace(/\s+/g, " ");
    if (!n) return null;
    const exact = ABILITIES.find((a) => a.toLowerCase() === n);
    if (exact) return exact;
    return ABILITIES.find((a) => a.toLowerCase().startsWith(n) || n.startsWith(a.toLowerCase())) ?? null;
}

/**
 * Parse a quality list such as "Adaptable, Bulk 1, Powerful, Piercing 2" into [{name, parameter}].
 * @param {string|string[]} text
 */
export function parseQualities(text) {
    if (Array.isArray(text)) return text.flatMap((q) => (typeof q === "string" ? parseQualities(q) : [{name: q.name ?? "", parameter: String(q.parameter ?? "")}]));
    return String(text ?? "")
        .split(/[,;]/)
        .map((q) => q.trim().replace(/\.$/, ""))
        .filter((q) => q && q !== "-" && q.toLowerCase() !== "none" && q !== "—")
        .map((q) => {
            const m = q.match(/^(.*?)\s*\(?([+-]?\d+[A-Za-z]*)\)?$/);
            if (m && m[1]) return {name: titleCase(m[1].trim()), parameter: m[2]};
            return {name: titleCase(q), parameter: ""};
        });
}

/* -------------------------------------------- */
/*  Abilities & specialties                     */
/* -------------------------------------------- */

/**
 * Parse "Fighting 4 (Long Blades 2B, Shields 1B)" style ability lists.
 * Accepts commas, semicolons or line breaks between abilities and "2B" / "+2B" / "2" for specialties.
 * @param {string} text
 * @returns {{name: string, rating: number, specialties: {name: string, rating: number}[]}[]}
 */
export function parseAbilityList(text) {
    const source = normalizeWhitespace(text).replace(/\n/g, " ");
    const names = ABILITIES.map((a) => a.replace(/ /g, "\\s+")).join("|");
    const rx = new RegExp(`\\b(${names})\\s*:?\\s*(\\d+)\\s*(?:\\(([^)]*)\\))?`, "gi");
    const result = [];
    let m;
    while ((m = rx.exec(source))) {
        const name = canonicalAbility(m[1].replace(/\s+/g, " "));
        const specialties = [];
        for (const raw of String(m[3] ?? "").split(/[,;]/)) {
            const s = raw.trim();
            if (!s) continue;
            const sm = s.match(/^(.*?)\s*\+?(\d+)\s*[Bb]?$/);
            if (sm) specialties.push({name: titleCase(sm[1].trim()), rating: int(sm[2])});
            else specialties.push({name: titleCase(s), rating: 1});
        }
        const existing = result.find((r) => r.name === name);
        if (existing) {
            existing.rating = Math.max(existing.rating, int(m[2]));
            existing.specialties.push(...specialties);
        } else {
            result.push({name, rating: int(m[2], 2), specialties});
        }
    }
    return result;
}

export function abilityItem({name, rating = 2, specialties = [], description = ""}) {
    return {
        name,
        type: "ability",
        system: {
            description: toHtml(description),
            rating: int(rating, 2),
            modifier: 0,
            specialties: specialties.map((s) => ({name: s.name, rating: int(s.rating), modifier: int(s.modifier)}))
        }
    };
}

/* -------------------------------------------- */
/*  Stat blocks (PCs, NPCs, creatures)          */
/* -------------------------------------------- */

const STAT_PATTERNS = {
    combatDefense: /combat\s+defen[cs]e\s*:?\s*(\d+)/i,
    intrigueDefense: /intrigue\s+defen[cs]e\s*:?\s*(\d+)/i,
    health: /\bhealth\s*:?\s*(\d+)/i,
    composure: /\bcomposure\s*:?\s*(\d+)/i,
    armorRating: /\b(?:armor\s+rating|AR)\s*:?\s*(\d+)/i,
    armorPenalty: /\b(?:armor\s+penalty|AP)\s*:?\s*(-?\d+)/i,
    bulk: /\bbulk\s*:?\s*(\d+)/i,
    movement: /\bmove(?:ment)?\s*:?\s*(\d+)/i,
    sprint: /\bsprint\s*:?\s*(\d+)/i,
    destiny: /\bdestiny\s+points?\s*:?\s*(\d+)/i,
    age: /\bage\s*:?\s*(\d+)/i
};

const SECTION_HEADERS = {
    benefits: /^(?:benefits?|qualities)\s*:\s*/i,
    drawbacks: /^drawbacks?\s*:\s*/i,
    equipment: /^(?:equipment|gear|possessions)\s*:\s*/i,
    weapons: /^(?:weapons?|attacks?)\s*:\s*/i,
    armor: /^armou?r\s*:\s*/i,
    abilities: /^abilities\s*:\s*/i,
    notes: /^(?:notes?|description|tactics)\s*:\s*/i,
    house: /^house\s*:\s*/i
};

/**
 * Parse a weapon/attack line taken from a stat block, e.g.
 *   "Longsword 5D+2B, 7 damage, Adaptable"
 *   "Bite: 4D (Fighting), 6 damage; Grab"
 *   "Longsword (Fighting 5D+2B): 7 damage, Adaptable"
 * @returns {object|null} weapon item data
 */
export function parseAttackLine(line) {
    const l = normalizeWhitespace(line).trim().replace(/^[•*\-–]\s*/, "");
    const test = l.match(/(\d+)\s*D(?:\s*\+\s*(\d+)\s*B)?/i);
    const dmg = l.match(/(\d+)\s*(?:damage|dmg)\b/i);
    if (!test && !dmg) return null;
    const cut = Math.min(...[test?.index, dmg?.index].filter((i) => i !== undefined));
    let name = l.slice(0, cut).replace(/[(:,\-\s]+$/, "").replace(/\((?:[^)]*)$/, "").trim();
    let ability = null;
    const abilityInText = l.match(new RegExp(`\\b(${ABILITIES.join("|")})\\b(?:\\s*:\\s*([A-Za-z \\-]+))?`, "i"));
    if (abilityInText) ability = canonicalAbility(abilityInText[1]);
    name = name.replace(new RegExp(`\\(?\\b(${ABILITIES.join("|")})\\b.*$`, "i"), "").trim() || name;
    const tail = l.slice(dmg ? dmg.index + dmg[0].length : (test.index + test[0].length)).replace(/^[\s,;:)]+/, "");
    const qualities = parseQualities(tail.replace(/^\)\s*/, ""));
    return {
        name: titleCase(name || "Attack"),
        type: "weapon",
        system: {
            description: "",
            specialty: `${ability ?? "Fighting"}:`,
            training: 0,
            damage: dmg ? dmg[1] : "",
            qualities,
            reach: "",
            range: "",
            equipped: 2,
            weight: 0,
            quantity: 1,
            cost: ""
        },
        flags: {chroniclesystem: {statBlock: {testDice: test ? int(test[1]) : null, bonusDice: test ? int(test[2]) : 0, damage: dmg ? int(dmg[1]) : null}}}
    };
}

function splitList(text) {
    return String(text ?? "")
        .split(/[,;]|\n/)
        .map((s) => s.trim().replace(/\.$/, ""))
        .filter(Boolean);
}

/**
 * Parse one Chronicle System stat block into Actor data.
 * Recognises the common SIFRP layout (name line, ability list with specialties in parentheses, derived statistics,
 * attack lines, Benefits/Drawbacks/Equipment sections). Unknown lines are kept in the notes so nothing is lost.
 * @param {string} text
 * @param {object} [options]
 * @param {"character"|"npc"} [options.type="npc"]
 * @param {string} [options.source]   A citation stored on the actor ("SIFRP p. 123").
 * @returns {{actor: object, warnings: string[]}}
 */
export function parseStatBlock(text, {type = "npc", source = ""} = {}) {
    const warnings = [];
    const clean = normalizeWhitespace(text).trim();
    const lines = clean.split("\n").map((l) => l.trim()).filter(Boolean);
    if (!lines.length) return {actor: null, warnings: ["Empty stat block."]};

    // Name: first line that is not an ability/stat/section line.
    let nameIndex = lines.findIndex((l) => !parseAbilityList(l).length && !Object.values(STAT_PATTERNS).some((r) => r.test(l))
        && !Object.values(SECTION_HEADERS).some((r) => r.test(l)));
    if (nameIndex < 0) nameIndex = 0;
    const rawName = lines[nameIndex].replace(/[:.]$/, "");
    const name = rawName === rawName.toUpperCase() ? titleCase(rawName) : rawName;
    const subtitle = lines[nameIndex + 1] && !parseAbilityList(lines[nameIndex + 1]).length
        && !Object.values(STAT_PATTERNS).some((r) => r.test(lines[nameIndex + 1])) && !parseAttackLine(lines[nameIndex + 1])
        && !Object.values(SECTION_HEADERS).some((r) => r.test(lines[nameIndex + 1])) ? lines[nameIndex + 1] : "";

    // Sections
    const sections = {benefits: [], drawbacks: [], equipment: [], weapons: [], armor: [], notes: [], house: []};
    let current = null;
    const body = [];
    for (const [i, line] of lines.entries()) {
        if (i === nameIndex || (subtitle && i === nameIndex + 1)) continue;
        const header = Object.entries(SECTION_HEADERS).find(([, r]) => r.test(line));
        if (header) {
            current = header[0] === "abilities" ? null : header[0];
            const rest = line.replace(header[1], "");
            if (header[0] === "abilities") body.push(rest);
            else if (rest) sections[current].push(rest);
            continue;
        }
        if (current && !parseAbilityList(line).length && !(current !== "weapons" && parseAttackLine(line) && /\d+\s*D/i.test(line))) {
            sections[current].push(line);
            continue;
        }
        current = null;
        body.push(line);
    }

    const bodyText = body.join("\n");
    const abilities = parseAbilityList(bodyText);
    if (!abilities.length) warnings.push(`${name}: no abilities recognised.`);

    const stats = {};
    for (const [key, rx] of Object.entries(STAT_PATTERNS)) {
        const m = bodyText.match(rx);
        if (m) stats[key] = int(m[1]);
    }

    // Attacks: explicit Weapons: section first, then any body line that looks like "xD+yB ... damage".
    const weapons = [];
    for (const line of [...sections.weapons, ...body]) {
        if (parseAbilityList(line).length > 1) continue;
        if (!/\d+\s*D\b|\bdamage\b/i.test(line)) continue;
        const w = parseAttackLine(line);
        if (w && !weapons.some((x) => x.name === w.name)) weapons.push(w);
    }

    const items = abilities.map(abilityItem);
    items.push(...weapons);
    for (const b of sections.benefits.flatMap(splitList)) items.push(simpleItem("benefit", b));
    for (const d of sections.drawbacks.flatMap(splitList)) items.push(simpleItem("drawback", d));
    for (const e of sections.equipment.flatMap(splitList)) items.push(simpleItem("equipment", e));
    for (const a of sections.armor.flatMap(splitList)) {
        const m = a.match(/^(.*?)\s*\(?\s*(?:AR\s*)?(\d+)?\s*(?:,?\s*AP\s*(-?\d+))?\s*(?:,?\s*Bulk\s*(\d+))?\)?$/i);
        items.push({
            name: titleCase((m?.[1] || a).trim()),
            type: "armor",
            system: {description: "", rating: int(m?.[2] ?? stats.armorRating), penalty: int(m?.[3] ?? stats.armorPenalty), bulk: int(m?.[4] ?? stats.bulk), qualities: [], equipped: 1, weight: 0, quantity: 1, cost: ""}
        });
    }
    if (!sections.armor.length && stats.armorRating) {
        items.push({
            name: "Armor", type: "armor",
            system: {description: "", rating: stats.armorRating, penalty: stats.armorPenalty ?? 0, bulk: stats.bulk ?? 0, qualities: [], equipped: 1, weight: 0, quantity: 1, cost: ""}
        });
    }

    // Lines we did not use go to the notes.
    const used = new Set();
    for (const line of body) {
        if (parseAbilityList(line).length || Object.values(STAT_PATTERNS).some((r) => r.test(line)) || parseAttackLine(line)) used.add(line);
    }
    const leftovers = body.filter((l) => !used.has(l));
    const notes = [subtitle, ...sections.notes, ...leftovers].filter(Boolean).join("\n");

    const actor = {
        name: name || "Unnamed",
        type,
        system: {
            age: stats.age ?? 0,
            destinyPoints: {current: stats.destiny ?? 0, max: stats.destiny ?? 0},
            npcKind: /\b(beast|animal|hound|horse|wolf|bear|lion|boar|direwolf)\b/i.test(clean) ? "animal" : "npc",
            npcNotes: toHtml(notes),
            source,
            house: sections.house.join(", ")
        },
        items,
        flags: {chroniclesystem: {statBlock: stats}}
    };
    if (type === "character") delete actor.system.npcKind;

    // Sanity checks against the printed derived statistics.
    const rating = (n) => abilities.find((a) => a.name === n)?.rating ?? 2;
    const expectedCD = rating("Agility") + rating("Athletics") + rating("Awareness");
    if (stats.combatDefense && stats.combatDefense !== expectedCD && !stats.armorPenalty) {
        warnings.push(`${actor.name}: printed Combat Defense ${stats.combatDefense} differs from the calculated ${expectedCD} (a benefit or shield may account for it).`);
    }
    if (stats.health && stats.health !== rating("Endurance") * 3) {
        warnings.push(`${actor.name}: printed Health ${stats.health} differs from Endurance × 3 (${rating("Endurance") * 3}).`);
    }
    return {actor, warnings};
}

/**
 * Split a page of text holding several stat blocks. Blocks are separated by blank lines followed by an ALL CAPS
 * or Title Case name line, or by "---".
 */
export function splitStatBlocks(text) {
    const t = normalizeWhitespace(text).trim();
    if (/^-{3,}$/m.test(t)) return t.split(/^-{3,}$/m).map((s) => s.trim()).filter(Boolean);
    const blocks = [];
    let current = [];
    const lines = t.split("\n");
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        const prevBlank = i === 0 || !lines[i - 1].trim();
        const nextHasAbilities = lines.slice(i + 1, i + 4).some((l) => parseAbilityList(l).length >= 2);
        const looksLikeName = line && line.length < 60 && !parseAbilityList(line).length && /^[A-Z][A-Za-z' ,\-()]+$/.test(line);
        if (looksLikeName && prevBlank && nextHasAbilities && current.some((l) => l.trim())) {
            blocks.push(current.join("\n").trim());
            current = [];
        }
        current.push(lines[i]);
    }
    if (current.some((l) => l.trim())) blocks.push(current.join("\n").trim());
    return blocks.filter((b) => parseAbilityList(b).length);
}

function simpleItem(type, text) {
    const m = String(text).match(/^(.*?)\s*\((.*)\)\s*$/);
    const name = (m ? m[1] : text).trim();
    const detail = m ? m[2] : "";
    const system = {description: detail ? toHtml(detail) : ""};
    if (type === "equipment") Object.assign(system, {quantity: 1, cost: ""});
    if (type === "benefit") Object.assign(system, {categories: "", requirements: ""});
    if (type === "drawback") Object.assign(system, {requirements: ""});
    return {name: titleCase(name), type, system};
}

/* -------------------------------------------- */
/*  Tables (CSV / TSV / pipe / aligned text)    */
/* -------------------------------------------- */

/** Column-name synonyms per document field. */
const COLUMN_ALIASES = {
    name: ["name", "item", "weapon", "armor", "armour", "benefit", "drawback", "holding", "event", "poison", "technique", "title",
        "ancestry", "work", "spell", "ritual", "tradition"],
    specialty: ["specialty", "speciality", "skill", "test"],
    ability: ["ability"],
    training: ["training", "train"],
    damage: ["damage", "dmg"],
    qualities: ["qualities", "quality", "special", "properties"],
    reach: ["reach"],
    range: ["range"],
    cost: ["cost", "price", "value"],
    weight: ["weight", "wt", "lbs", "lb"],
    rating: ["rating", "ar", "armor rating", "armour rating"],
    penalty: ["penalty", "ap", "armor penalty", "armour penalty"],
    bulk: ["bulk"],
    quantity: ["quantity", "qty", "number"],
    requirements: ["requirements", "requirement", "prerequisite", "prerequisites", "prereq"],
    categories: ["category", "categories", "type"],
    description: ["description", "effect", "effects", "notes", "text", "summary", "benefit text"],
    investment: ["investment", "invest", "power cost", "wealth cost", "defense cost", "influence cost", "land cost", "law cost", "population cost"],
    buildTime: ["build time", "time", "construction time"],
    resource: ["resource"],
    delivery: ["delivery"],
    virulence: ["virulence"],
    frequency: ["frequency"],
    toxicity: ["toxicity"],
    diagnosis: ["diagnosis"],
    source: ["source", "page", "reference", "ref"],
    art: ["art", "sorcerous art"],
    workType: ["work type", "kind"],
    price: ["price", "destiny", "cost in destiny"],
    learning: ["learning", "learning time"],
    learningDifficulty: ["learning difficulty", "difficulty"],
    resonances: ["resonances", "resonance", "components"],
    benefits: ["benefits", "ancestry benefits"]
};

function matchColumn(header) {
    const h = String(header ?? "").trim().toLowerCase().replace(/[^a-z ]/g, "").replace(/\s+/g, " ");
    for (const [field, aliases] of Object.entries(COLUMN_ALIASES)) if (aliases.includes(h)) return field;
    for (const [field, aliases] of Object.entries(COLUMN_ALIASES)) if (aliases.some((a) => h.startsWith(a))) return field;
    return null;
}

/** Parse CSV with quoted fields. */
export function parseCSV(text, delimiter = null) {
    const t = String(text ?? "").replace(/\r\n?/g, "\n");
    const first = t.split("\n").find((l) => l.trim()) ?? "";
    const delim = delimiter ?? (first.includes("\t") ? "\t" : first.includes("|") ? "|" : first.split(";").length > first.split(",").length ? ";" : ",");
    const rows = [];
    let row = [];
    let cell = "";
    let quoted = false;
    for (let i = 0; i < t.length; i++) {
        const c = t[i];
        if (quoted) {
            if (c === "\"" && t[i + 1] === "\"") { cell += "\""; i++; }
            else if (c === "\"") quoted = false;
            else cell += c;
        } else if (c === "\"" && !cell.trim()) quoted = true;
        else if (c === delim) { row.push(cell.trim()); cell = ""; }
        else if (c === "\n") { row.push(cell.trim()); rows.push(row); row = []; cell = ""; }
        else cell += c;
    }
    if (cell.trim() || row.length) { row.push(cell.trim()); rows.push(row); }
    return rows
        .map((r) => (delim === "|" ? r.filter((c, i) => !(c === "" && (i === 0 || i === r.length - 1))) : r))
        .filter((r) => r.some((c) => c !== "") && !r.every((c) => /^:?-{2,}:?$/.test(c)));
}

/**
 * Turn a table (first row = headers) into item data of the given type.
 * @param {string} text
 * @param {string} type   Item type.
 * @param {object} [options]
 * @param {string} [options.source]
 * @returns {{items: object[], warnings: string[], columns: Record<string,string|null>}}
 */
export function parseItemTable(text, type, {source = ""} = {}) {
    const rows = parseCSV(text);
    const warnings = [];
    if (rows.length < 2) return {items: [], warnings: ["The table needs a header row and at least one data row."], columns: {}};
    const headers = rows[0];
    const columns = Object.fromEntries(headers.map((h) => [h, matchColumn(h)]));
    const unknown = headers.filter((h) => !columns[h]);
    if (unknown.length) warnings.push(`Ignored column(s): ${unknown.join(", ")} (kept in the description).`);
    if (!Object.values(columns).includes("name")) columns[headers[0]] = "name";

    const items = [];
    for (const row of rows.slice(1)) {
        const record = {};
        const extra = [];
        headers.forEach((h, i) => {
            const field = columns[h];
            const value = row[i] ?? "";
            if (!field) { if (value) extra.push(`<b>${escapeHtml(h)}:</b> ${escapeHtml(value)}`); return; }
            record[field] = record[field] ? `${record[field]} ${value}` : value;
        });
        if (!record.name) continue;
        items.push(buildItem(type, record, extra, source));
    }
    return {items, warnings, columns};
}

/**
 * Build item data from a flat record ({name, damage, qualities, ...}).
 */
export function buildItem(type, record, extra = [], source = "") {
    const description = [toHtml(record.description ?? ""), ...extra.map((e) => `<p>${e}</p>`)].filter(Boolean).join("");
    const base = {description, source: record.source || source};
    let system;
    switch (type) {
        case "weapon": {
            let specialty = record.specialty ?? "";
            if (record.ability && !specialty.includes(":")) specialty = `${canonicalAbility(record.ability) ?? record.ability}:${specialty}`;
            if (specialty && !specialty.includes(":")) {
                const [a, ...rest] = specialty.split(/\s*[(/]\s*|\s+-\s+/);
                specialty = canonicalAbility(a) ? `${canonicalAbility(a)}:${rest.join(" ").replace(/\)$/, "")}` : `Fighting:${specialty}`;
            }
            system = {
                ...base,
                specialty: specialty.replace(/\s*:\s*/, ":"),
                training: int(record.training),
                damage: normalizeDamage(record.damage),
                qualities: parseQualities(record.qualities),
                reach: record.reach ?? "",
                range: record.range ?? "",
                equipped: 0,
                weight: parseFloat(String(record.weight ?? "0").replace(/[^\d.]/g, "")) || 0,
                quantity: int(record.quantity, 1),
                cost: record.cost ?? ""
            };
            break;
        }
        case "armor":
            system = {
                ...base,
                rating: int(record.rating),
                penalty: -Math.abs(int(record.penalty)),
                bulk: int(record.bulk),
                qualities: parseQualities(record.qualities),
                equipped: 0,
                weight: parseFloat(String(record.weight ?? "0").replace(/[^\d.]/g, "")) || 0,
                quantity: int(record.quantity, 1),
                cost: record.cost ?? ""
            };
            break;
        case "equipment":
            system = {...base, quantity: int(record.quantity, 1), cost: record.cost ?? "", weight: parseFloat(String(record.weight ?? "0").replace(/[^\d.]/g, "")) || 0};
            break;
        case "benefit":
            system = {...base, categories: record.categories ?? "", requirements: record.requirements ?? "", sorcerousArtAccess: /sorcer/i.test(record.categories ?? "")};
            break;
        case "drawback":
            system = {...base, requirements: record.requirements ?? "", requireSorcerousArt: false, isAStricture: false, isAFlaw: /flaw/i.test(record.name), flawAttribute: ""};
            break;
        case "holding":
            system = {...base, investment: int(record.investment), buildTime: record.buildTime ?? "", resource: String(record.resource ?? "").toLowerCase(), features: [], fortuneDice: "", fortuneModifier: 0};
            break;
        case "poison":
            system = {...base, delivery: record.delivery ?? "", virulence: record.virulence ?? "", frequency: record.frequency ?? "", toxicity: int(record.toxicity), diagnosis: int(record.diagnosis), effects: "", recovery: "", quantity: 1, cost: record.cost ?? "", weight: 0};
            break;
        case "work": {
            const kind = String(record.workType ?? record.categories ?? "").toUpperCase();
            const testAbility = canonicalAbility(String(record.specialty ?? "").split(/[ ,(]/)[0]) ?? "";
            system = {...base, art: record.art ?? "", workType: kind.includes("RITUAL") && kind.includes("SPELL") ? "BOTH" : kind.includes("RITUAL") ? "RITUAL" : "SPELL",
                testAbility, test: record.specialty ?? "", learningTime: record.learning ?? "", learningDifficulty: int(String(record.learningDifficulty ?? "").replace(/\D/g, ""), 9),
                price: record.price ?? record.cost ?? "", resonances: record.resonances ?? "", spell: {difficulty: "", notes: ""},
                ritual: {alignmentAbility: "Knowledge", alignment: "", invocation: "", unleashing: ""}};
            break;
        }
        case "ancestry":
            system = {...base, benefitList: splitList(record.benefits ?? "").map((n) => ({name: n})), rules: "",
                ages: {youth: "", adolescent: "", youngAdult: "", adult: "", middleAge: "", old: "", veryOld: "", venerable: ""}};
            break;
        case "art":
            system = {...base, tools: "", initiation: "", resonances: record.resonances ?? "", workList: []};
            break;
        case "tradition":
            system = {...base, resonances: record.resonances ?? "", arts: record.art ?? ""};
            break;
        case "ability":
            system = {...base, rating: 2, modifier: 0, specialties: splitList(record.specialty ?? record.qualities ?? "").map((s) => ({name: titleCase(s), rating: 0, modifier: 0}))};
            break;
        default:
            system = base;
    }
    return {name: titleCase(record.name).replace(/\s+/g, " ").trim(), type, system};
}

/** "Athletics+1" / "Ath+1" / "@Athletics + 1" → "@Athletics+1". */
export function normalizeDamage(value) {
    const v = String(value ?? "").trim();
    if (!v) return "";
    if (v.startsWith("@")) return v.replace(/\s+/g, "");
    const m = v.match(/^([A-Za-z ]+?)\s*([-+*/])?\s*(\d+)?$/);
    if (m) {
        const ability = canonicalAbility(m[1]);
        if (ability) return `@${ability}${m[2] && m[3] ? `${m[2]}${m[3]}` : ""}`;
    }
    return v;
}

/* -------------------------------------------- */
/*  JSON                                        */
/* -------------------------------------------- */

/**
 * Accepts:
 *  - a Foundry document export ({name, type, system, items})
 *  - an array of those
 *  - {actors: [...], items: [...]} bundles
 *  - the simplified Chronicle JSON ({name, kind: "npc", abilities: {Fighting: 4 | {rating, specialties}}, weapons, ...})
 * @param {string|object} input
 * @returns {{actors: object[], items: object[], warnings: string[]}}
 */
export function parseJSON(input) {
    const warnings = [];
    let data = input;
    if (typeof input === "string") {
        try {
            data = JSON.parse(input);
        } catch (err) {
            return {actors: [], items: [], warnings: [`Invalid JSON: ${err.message}`]};
        }
    }
    const list = Array.isArray(data) ? data : [data];
    const actors = [];
    const items = [];
    for (const entry of list) {
        if (!entry || typeof entry !== "object") continue;
        if (Array.isArray(entry.actors) || Array.isArray(entry.items)) {
            const nested = parseJSON([...(entry.actors ?? []), ...(entry.items ?? [])]);
            actors.push(...nested.actors);
            items.push(...nested.items);
            warnings.push(...nested.warnings);
            continue;
        }
        const type = entry.type ?? entry.kind;
        if (ACTOR_TYPES.includes(type) || entry.abilities) {
            actors.push(entry.system ? sanitizeDocument(entry) : simplifiedActor(entry));
        } else if (ITEM_TYPES.includes(type)) {
            items.push(entry.system ? sanitizeDocument(entry) : buildItem(type, entry));
        } else {
            warnings.push(`Skipped "${entry.name ?? "unnamed"}": unknown type "${type}".`);
        }
    }
    return {actors, items, warnings};
}

function sanitizeDocument(doc) {
    const clone = JSON.parse(JSON.stringify(doc));
    delete clone._id;
    delete clone._stats;
    delete clone.folder;
    delete clone.ownership;
    delete clone.sort;
    if (Array.isArray(clone.items)) clone.items = clone.items.map((i) => sanitizeDocument(i));
    if (Array.isArray(clone.effects)) clone.effects = clone.effects.map((e) => sanitizeDocument(e));
    return clone;
}

function simplifiedActor(entry) {
    const type = ACTOR_TYPES.includes(entry.type ?? entry.kind) ? (entry.type ?? entry.kind) : "npc";
    const items = [];
    const abilities = entry.abilities ?? {};
    for (const [name, value] of Object.entries(abilities)) {
        const rating = typeof value === "object" ? value.rating : value;
        const specs = typeof value === "object" ? value.specialties ?? {} : {};
        const specialties = Array.isArray(specs)
            ? specs.map((s) => (typeof s === "string" ? {name: s, rating: 1} : s))
            : Object.entries(specs).map(([n, r]) => ({name: n, rating: r}));
        items.push(abilityItem({name: canonicalAbility(name) ?? name, rating, specialties}));
    }
    for (const w of entry.weapons ?? []) items.push(typeof w === "string" ? parseAttackLine(w) ?? simpleItem("equipment", w) : buildItem("weapon", w));
    for (const a of entry.armor ? [].concat(entry.armor) : []) items.push(typeof a === "string" ? simpleItem("equipment", a) : buildItem("armor", a));
    for (const b of entry.benefits ?? []) items.push(typeof b === "string" ? simpleItem("benefit", b) : buildItem("benefit", b));
    for (const d of entry.drawbacks ?? []) items.push(typeof d === "string" ? simpleItem("drawback", d) : buildItem("drawback", d));
    for (const e of entry.equipment ?? []) items.push(typeof e === "string" ? simpleItem("equipment", e) : buildItem("equipment", e));
    for (const i of entry.items ?? []) items.push(i.system ? sanitizeDocument(i) : buildItem(i.type, i));
    return {
        name: entry.name ?? "Unnamed",
        type,
        img: entry.img,
        system: {
            age: int(entry.age),
            gender: entry.gender ?? "",
            house: entry.house ?? "",
            npcKind: entry.npcKind ?? "npc",
            npcNotes: toHtml(entry.notes ?? entry.description ?? ""),
            personalHistory: toHtml(entry.history ?? ""),
            source: entry.source ?? "",
            destinyPoints: {current: int(entry.destiny), max: int(entry.destiny)}
        },
        items: items.filter(Boolean)
    };
}

/* -------------------------------------------- */
/*  Auto-detection                              */
/* -------------------------------------------- */

/**
 * Guess what kind of text was pasted.
 * @returns {"json"|"table"|"statblock"|"unknown"}
 */
export function detectFormat(text) {
    const t = String(text ?? "").trim();
    if (!t) return "unknown";
    if (/^[[{]/.test(t)) return "json";
    const lines = t.split(/\r?\n/).filter((l) => l.trim());
    const delimited = lines.slice(0, 5).filter((l) => (l.match(/[\t,|;]/g) ?? []).length >= 2).length;
    if (lines.length >= 2 && delimited >= Math.min(lines.length, 3) && !parseAbilityList(lines.slice(0, 3).join(" ")).length) return "table";
    if (parseAbilityList(t).length >= 2) return "statblock";
    return "unknown";
}
