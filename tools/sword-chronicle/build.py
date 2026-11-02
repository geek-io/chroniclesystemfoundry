# -*- coding: utf-8 -*-
"""Generate the Sword Chronicle compendium sources (one JSON per document) into packs/_source/sc-*.

    python3 tools/sword-chronicle/build.py packs/_source

Abilities are shared with the SIFRP "abilities" pack (the 19 abilities are identical), so run
tools/sifrp-data/build.py first. Only the sc-* pack folders are replaced.
"""
import glob, hashlib, json, os, re, shutil, sys, time
sys.path.insert(0, os.path.dirname(__file__))
import data_items as D
import data_qualities as Q
import data_sorcery as S
import data_actors as DA
import data_tables as DT

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
OUT = sys.argv[1] if len(sys.argv) > 1 else os.path.join(ROOT, "packs", "_source")
SYS = "systems/chroniclesystem/assets/icons"
NOW = int(time.mktime((2026, 11, 2, 12, 0, 0, 0, 0, 0)) * 1000)
STATS = {"coreVersion": "14.368", "systemId": "chroniclesystem", "systemVersion": "14.0.2", "createdTime": NOW,
         "modifiedTime": NOW, "lastModifiedBy": None, "compendiumSource": None, "duplicateSource": None, "exportSource": None}
ALPH = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789"
TPL = json.load(open(os.path.join(ROOT, "template.json")))


def rid(*parts):
    h = hashlib.sha256("|".join(("sword-chronicle",) + parts).encode()).digest()
    return "".join(ALPH[b % len(ALPH)] for b in h[:16])


def slug(s):
    return re.sub(r"[^a-z0-9]+", "-", s.lower()).strip("-")


def html(*paras):
    return "".join(f"<p>{p}</p>" for p in paras if p)


def src(page):
    return D.SRC.format(page)


def item(pack, name, type_, system, img=None, sort=0, flags=None):
    return {"_id": rid(pack, type_, name), "name": name, "type": type_, "img": img or f"{SYS}/{type_}.png", "system": system,
            "effects": [], "folder": None, "sort": sort, "ownership": {"default": 0}, "flags": flags or {}, "_stats": dict(STATS)}


def base_item_system(type_):
    tpl = TPL["Item"]
    data = {}
    for t in tpl[type_].get("templates", []):
        data.update(json.loads(json.dumps(tpl["templates"][t])))
    data.update({k: v for k, v in tpl[type_].items() if k != "templates"})
    return json.loads(json.dumps(data))


def actor_system(type_):
    tpl = TPL["Actor"]
    data = {}
    for t in tpl[type_].get("templates", []):
        data.update(json.loads(json.dumps(tpl["templates"][t])))
    data.update({k: v for k, v in tpl[type_].items() if k != "templates"})
    return json.loads(json.dumps(data))


def num(v):
    m = re.search(r"[\d.]+", str(v).replace(",", "").replace("1-1/2", "1.5"))
    return float(m.group(0)) if m else 0


def qualities(text):
    out = []
    for x in [p.strip() for p in str(text).split(",") if p.strip()]:
        m = re.match(r"^(.*?)(?:\s+([+-]?\d+|\([^)]*\)))?$", x)
        out.append({"name": m.group(1).strip(), "parameter": (m.group(2) or "").strip()})
    return out


PACKS = {}
FOLDER_SORT = {}


def add(pack, doc):
    PACKS.setdefault(pack, []).append(doc)
    return doc


# ------------------------------------------------------------------ Shared abilities (from the SIFRP pack)
ABILITY_DOCS = {}
for f in glob.glob(os.path.join(OUT, "abilities", "*.json")):
    d = json.load(open(f, encoding="utf-8"))
    ABILITY_DOCS[d["name"]] = d
if len(ABILITY_DOCS) != 19:
    sys.exit("packs/_source/abilities is missing; run tools/sifrp-data/build.py first")
ABILITY_NAMES = list(ABILITY_DOCS)

# ------------------------------------------------------------------ Ancestries
for i, a in enumerate(D.ANCESTRIES):
    s = base_item_system("ancestry")
    s["ages"] = dict(zip(D.AGE_KEYS, a["ages"]))
    s["benefitList"] = [{"name": b} for b in a["benefits"]]
    s["description"] = html(a["summary"], f"<em>{src(a['page'])}. Choose two ancestry benefits at character creation (from one ancestry or two); more can be bought with Destiny Points.</em>")
    s["rules"] = html(a["rules"])
    s["source"] = src(a["page"])
    add("sc-ancestries", item("sc-ancestries", a["name"], "ancestry", s, sort=i * 100))

# ------------------------------------------------------------------ Benefits & drawbacks
SORCERY_ACCESS = {"Blood of the Far Isles", "Blood of the Sorcerers", "Sorcerous Initiation", "Natural Sorcerer"}
BENEFITS = {}
for i, (name, cats, req, page, eff) in enumerate(Q.BENEFITS + Q.KURGULAN_BENEFITS):
    s = base_item_system("benefit")
    s.update(description=html(eff, f"<em>{cats}. Full rules: {src(page)}.</em>"), categories=cats, requirements=req or "—",
             sorcerousArtAccess=name in SORCERY_ACCESS, source=src(page))
    doc = add("sc-benefits", item("sc-benefits", name, "benefit", s, sort=i * 100))
    BENEFITS[name.lower()] = doc

DRAWBACKS = {}
for i, (name, tags, req, page, eff) in enumerate(Q.DRAWBACKS + Q.KURGULAN_DRAWBACKS):
    s = base_item_system("drawback")
    s.update(description=html(eff, f"<em>{(tags + ' drawback. ') if tags else ''}Full rules: {src(page)}.</em>"), requirements=req or "—",
             isAFlaw=name == "Flaw", isAStricture="Stricture" in tags, requireSorcerousArt="Sorcerous" in tags or "Stricture" in tags and name != "Taboo",
             source=src(page))
    doc = add("sc-drawbacks", item("sc-drawbacks", name, "drawback", s, sort=i * 100))
    DRAWBACKS[name.lower()] = doc

# ------------------------------------------------------------------ Sorcery
sort = 0
for name, page, summary, res in S.TRADITIONS:
    s = base_item_system("tradition")
    s.update(description=html(summary, f"<em>Sorcerous Tradition — {src(page)}. Narrators may define their own Traditions.</em>"),
             resonances=res, arts="Any", source=src(page))
    add("sc-sorcery", item("sc-sorcery", name, "tradition", s, sort=sort)); sort += 100
for name, page, summary, tools, initiation, res, works in S.ARTS:
    s = base_item_system("art")
    extra = S.WARD_TABLE if name == "Art of Warding" else ""
    s.update(description=html(summary, extra, f"<em>{src(page)}. A Sorcerous Benefit (Blood of the Sorcerers, Blood of the Far Isles, Natural Sorcerer or Sorcerous Initiation) grants access.</em>"),
             tools=tools, initiation=initiation, resonances=res, workList=[{"name": w} for w in works], source=src(page))
    add("sc-sorcery", item("sc-sorcery", name, "art", s, sort=sort)); sort += 100
for w in S.WORKS:
    s = base_item_system("work")
    s.update(art=w["art"], workType=w["type"], testAbility=w["ability"], test=w["test"], learningTime=w["time"],
             learningDifficulty=w["diff"], price=w["price"], resonances=w["resonances"], source=src(w["page"]))
    paras = [w["summary"]]
    if w["spell"]:
        s["spell"] = {"difficulty": w["spell"][0], "notes": w["spell"][1]}
        paras.append(f"<strong>Spell.</strong> {w['spell'][0]} {w['spell'][1]}")
    if w["ritual"]:
        ab, al, inv, unl = w["ritual"]
        s["ritual"] = {"alignmentAbility": ab, "alignment": al, "invocation": inv, "unleashing": unl}
        paras.append(f"<strong>Ritual.</strong> Alignment: {al} Invocation: {inv} Unleashing: {unl}")
    paras.append(f"<em>{w['art']} — full rules: {src(w['page'])}.</em>")
    s["description"] = html(*paras)
    add("sc-sorcery", item("sc-sorcery", w["name"], "work", s, sort=sort)); sort += 100

# ------------------------------------------------------------------ Equipment
WEAPONS = {}
for i, (name, group, training, dmg, quals, weight, cost) in enumerate(D.W):
    s = base_item_system("weapon")
    ability = D.WEAPON_GROUP_ABILITY[group]
    damage = "" if dmg == "None" else "@" + dmg
    s.update(description=html(D.WEAPON_NOTES[group], f"<em>{src(136)}; cost {src(113)}.</em>"), specialty=f"{ability}:{group}",
             training=training, damage=damage, qualities=qualities(quals), reach="", range="",
             weight=num(weight), quantity=1, cost=cost, equipped=0, source=src(136))
    doc = add("sc-weapons", item("sc-weapons", name, "weapon", s, sort=i * 100))
    WEAPONS[name.lower()] = doc

ARMORS = {}
for i, (name, ar, ap, bulk, weight, cost, desc) in enumerate(D.ARMOR):
    s = base_item_system("armor")
    s.update(description=html(desc, f"<em>{src(133)}; cost {src(115)}.</em>"), rating=ar, penalty=ap, bulk=bulk, qualities=[],
             weight=num(weight), quantity=1, cost=cost, equipped=0, source=src(133))
    doc = add("sc-armor", item("sc-armor", name, "armor", s, sort=i * 100))
    ARMORS[name.lower()] = doc

for i, (name, cost, cat, note, page) in enumerate(D.GOODS):
    s = base_item_system("equipment")
    s.update(description=html(note, f"<em>{cat} — {src(page)}. {D.COINAGE}</em>"), quantity=1, cost=cost, source=src(page))
    add("sc-equipment", item("sc-equipment", name, "equipment", s, sort=i * 100, flags={"chroniclesystem": {"category": cat}}))

for i, (name, delivery, vir, tox, freq, diag, cost, page, summary, recovery) in enumerate(D.POISONS):
    s = base_item_system("poison")
    s.update(description=html(summary), delivery=delivery, virulence=vir, frequency=freq, toxicity=int(num(tox)), diagnosis=diag,
             effects=html(f"Virulence {vir}; Toxicity {tox}; Frequency {freq}; Diagnosis {D.DIFF.get(diag) or '—'}.", summary),
             recovery=html(recovery), cost=cost, quantity=1, source=src(page))
    add("sc-poisons", item("sc-poisons", name, "poison", s, sort=i * 100))

# ------------------------------------------------------------------ Houses: holdings, units, events
HOLDING_DOCS = {}
for i, (name, res, inv, time_, fm, page, desc) in enumerate(D.HOLDINGS):
    s = base_item_system("holding")
    extra = D.DOMAIN_FEATURES if name.startswith("Domain") else ""
    s.update(description=html(desc, extra, f"<em>{src(page)}</em>"), investment=inv, buildTime=time_, resource=res, features=[],
             fortuneDice="", fortuneModifier=fm, source=src(page))
    HOLDING_DOCS[name] = add("sc-holdings", item("sc-holdings", name, "holding", s, sort=i * 100))
for j, (name, cost, disc, keys, note) in enumerate(D.UNITS):
    s = base_item_system("holding")
    s.update(description=html(f"Unit type. Discipline modifier {disc}. Key abilities: {keys}.", note, D.TRAINING, f"<em>{src(76)}</em>"),
             investment=cost, buildTime="", resource="power", features=[{"name": "Training: Trained", "cost": 3}],
             fortuneDice="", fortuneModifier=0, source=src(76))
    add("sc-holdings", item("sc-holdings", f"Unit: {name}", "holding", s, sort=(len(D.HOLDINGS) + j) * 100))

EVENT_DOCS = {}
for i, (name, roll, formulas, summary) in enumerate(D.EVENTS):
    s = base_item_system("event")
    s["description"] = html(summary, f"<em>Historical Events table roll {roll} ({src(69)}).</em>")
    if formulas is None:
        s.update(playerChoice=True, numberOfChoices=2, bonusToChoices="1d6")
    else:
        for k in s["formulas"]:
            s["formulas"][k] = formulas.get(k, "")
    s["source"] = src(69)
    EVENT_DOCS[name] = add("sc-events", item("sc-events", name, "event", s, sort=i * 100))


# ------------------------------------------------------------------ Actors
def parse_abilities(text):
    out = {}
    rx = re.compile(r"(Animal Handling|[A-Z][a-z]+)\s+(\d+)\s*(?:\(([^)]*)\))?")
    for m in rx.finditer(text):
        name, rating, specs = m.group(1), int(m.group(2)), m.group(3) or ""
        if name not in ABILITY_NAMES:
            continue
        sp = {}
        for part in specs.split(","):
            part = part.strip()
            mm = re.match(r"^(.*?)\s*(\d+)\s*B$", part)
            if mm:
                sp[mm.group(1).strip()] = int(mm.group(2))
        out[name] = (rating, sp)
    return out


def ability_items(pack, actor, ab):
    items = []
    for name, (rating, specs) in ab.items():
        base = ABILITY_DOCS[name]
        s = json.loads(json.dumps(base["system"]))
        s["rating"] = rating
        known = [x["name"] for x in s["specialties"]]
        s["specialties"] = [{"name": x, "rating": specs.get(x, 0), "modifier": 0} for x in known] + \
                           [{"name": x, "rating": r, "modifier": 0} for x, r in specs.items() if x not in known]
        doc = item(pack, f"{actor}|{name}", "ability", s, img=base["img"])
        doc["name"] = name
        doc["_stats"]["compendiumSource"] = f"Compendium.chroniclesystem.abilities.Item.{base['_id']}"
        items.append(doc)
    return items


def copy_item(pack, actor, base, name=None, src_pack=None):
    s = json.loads(json.dumps(base["system"]))
    doc = item(pack, f"{actor}|{name or base['name']}", base["type"], s, img=base["img"])
    doc["name"] = name or base["name"]
    if src_pack:
        doc["_stats"]["compendiumSource"] = f"Compendium.chroniclesystem.{src_pack}.Item.{base['_id']}"
    return doc


def attack_item(pack, actor, weapon, display, printed_test, dmg, quals, equipped):
    base = WEAPONS.get(weapon.lower())
    if base:
        doc = copy_item(pack, actor, base, display, "sc-weapons")
        have = {q["name"].lower() for q in doc["system"]["qualities"]}
        doc["system"]["qualities"] += [q for q in qualities(quals) if q["name"].lower() not in have]
    else:
        s = base_item_system("weapon")
        s.update(specialty="Fighting:", damage=dmg, qualities=qualities(quals), training=0,
                 description=html(f"Natural attack: {printed_test}, {dmg} damage."))
        doc = item(pack, f"{actor}|{display}", "weapon", s)
        doc["name"] = display
    doc["system"]["equipped"] = equipped
    doc["flags"] = {"chroniclesystem": {"printed": f"{printed_test}, {dmg} damage"}}
    return doc


def apply_printed(system, ab, printed):
    r = lambda n: ab.get(n, (2, {}))[0]
    calc = dict(combatDefense=r("Agility") + r("Athletics") + r("Awareness"), intrigueDefense=r("Awareness") + r("Cunning") + r("Status"),
                composure=r("Will") * 3, health=r("Endurance") * 3)
    for k, v in printed.items():
        if v is not None:
            system["derivedStats"][k]["modifier"] = v - calc[k]


def finish_actor(pack, name, type_, system, items, img, disposition=-1):
    _id = rid(pack, "actor", name)
    for idx, it in enumerate(items):
        it["_id"] = rid(pack, _id, it["type"], it["name"], str(idx))
        it["sort"] = idx * 100
    return {"_id": _id, "name": name, "type": type_, "img": img, "system": system, "items": items, "effects": [], "folder": None,
            "sort": 0, "ownership": {"default": 0}, "flags": {},
            "prototypeToken": {"name": name, "displayName": 20, "actorLink": type_ == "house", "disposition": disposition,
                               "texture": {"src": img}, "width": 1, "height": 1},
            "_stats": dict(STATS)}


for k, (name, page, stats, printed, armor, attacks, notes) in enumerate(DA.NARRATOR):
    ab = parse_abilities(stats)
    system = actor_system("npc")
    system.update(npcKind="npc", source=src(page))
    items = ability_items("sc-narrator-characters", name, ab)
    if armor:
        aname, ar, ap, bulk = armor
        doc = copy_item("sc-narrator-characters", name, ARMORS[aname.lower()], src_pack="sc-armor")
        doc["system"].update(rating=ar, penalty=ap, bulk=bulk, equipped=1)
        items.append(doc)
    shield_done = main_done = False
    for (weapon, display, test, dmg, quals) in attacks:
        is_shield = weapon.startswith("Shield")
        equipped = 0
        if is_shield and not shield_done:
            equipped, shield_done = 3, True
        elif not main_done and "Mounted" not in quals and "Two-handed" not in quals:
            equipped, main_done = 2, True
        items.append(attack_item("sc-narrator-characters", name, weapon, display, test, dmg, quals, equipped))
    apply_printed(system, ab, printed)
    system["npcNotes"] = html(notes, f"<em>Statistics: {stats}. {src(page)}.</em>")
    doc = finish_actor("sc-narrator-characters", name, "npc", system, items, "icons/svg/mystery-man.svg")
    doc["sort"] = k * 100
    add("sc-narrator-characters", doc)

for k, (name, page, kind, stats, printed, ar, move, attacks, traits) in enumerate(DA.CREATURES):
    ab = parse_abilities(stats)
    system = actor_system("npc")
    system.update(npcKind=kind, source=src(page))
    items = ability_items("sc-creatures", name, ab)
    if ar:
        s = base_item_system("armor")
        s.update(rating=ar, penalty=0, bulk=0, equipped=1, description=html("Natural armor."))
        doc = item("sc-creatures", f"{name}|Natural Armor", "armor", s)
        doc["name"] = "Natural Armor"
        items.append(doc)
    for j, (aname, test, dmg, quals) in enumerate(attacks):
        items.append(attack_item("sc-creatures", name, aname, aname, test, dmg, quals, 2 if j == 0 else 0))
    apply_printed(system, ab, printed)
    trait_html = "".join(f"<p><strong>{t}.</strong> {d}</p>" for t, d in traits)
    system["npcNotes"] = f"<p><strong>Movement:</strong> {move}</p>" + trait_html + \
        html("Creatures have rank 0 in Animal Handling, Deception, Healing, Language, Knowledge, Marksmanship, Persuasion, Status, Thievery and Warfare unless listed, and usually take no injuries or wounds." if kind == "animal" else "",
             f"<em>Statistics: {stats}. {src(page)}.</em>")
    doc = finish_actor("sc-creatures", name, "npc", system, items, "icons/svg/mystery-man.svg")
    doc["sort"] = k * 100
    add("sc-creatures", doc)


def house_actor(name, realm, liege, values, items, notes, page):
    system = actor_system("house")
    system.update(realm=realm, liege=liege)
    for key, v in values.items():
        system[key]["startingValue"] = v
    system["defense"]["description"] = notes
    return finish_actor("sc-houses", name, "house", system, items, "icons/svg/castle.svg", disposition=0)


margoth = DA.MARGOTH
m_items = []
for (ename, mods, note) in margoth["events"]:
    doc = copy_item("sc-houses", margoth["name"], EVENT_DOCS[ename], src_pack="sc-events")
    doc["system"]["modifiers"].update(mods)
    doc["system"]["description"] += html(note)
    m_items.append(doc)
for (hname, res, inv, feats, fm, note) in margoth["holdings"]:
    s = base_item_system("holding")
    s.update(description=html(note), investment=inv, resource=res, features=[{"name": f, "cost": c} for f, c in feats], fortuneModifier=fm,
             source=src(margoth["page"]))
    doc = item("sc-houses", f"{margoth['name']}|{hname}", "holding", s)
    doc["name"] = hname
    m_items.append(doc)
add("sc-houses", house_actor(margoth["name"], margoth["realm"], margoth["liege"], margoth["starting"], m_items,
                             html(margoth["notes"], f"<em>The worked example house of Chapter 5 ({src(margoth['page'])}).</em>"), margoth["page"]))
for (name, culture, de, inf, la, law, pop, pw, we, note) in DA.HOUSES:
    vals = dict(defense=de, influence=inf, lands=la, law=law, population=pop, power=pw, wealth=we)
    add("sc-houses", house_actor(f"House {name}" if not name.startswith(("10th", "Company", "Order")) else name, culture, "",
                                 vals, [], html(f"A {culture} house of the Breachlands (The Shattered Era).", note,
                                                f"<em>{src(206)}. Resources are set just below the next category so the Narrator can raise them as the chronicle unfolds.</em>"), 206))

# ------------------------------------------------------------------ Roll tables
for i, (name, formula, page, desc, rows) in enumerate(DT.TABLES):
    _id = rid("sc-tables", name)
    results = []
    if rows is None:
        for (ev, roll, *_r) in D.EVENTS:
            d = EVENT_DOCS[ev]
            results.append(dict(type="document", name=ev, img=d["img"], documentUuid=f"Compendium.chroniclesystem.sc-events.Item.{d['_id']}",
                                range=[roll, roll]))
    else:
        results = [dict(type="text", name=text, img="icons/svg/d20-black.svg", range=[lo, hi]) for lo, hi, text in rows]
    res_docs = []
    for k, r in enumerate(results):
        rd = {"_id": rid(_id, str(k)), "type": r["type"], "name": r["name"], "img": r["img"], "description": "", "weight": 1,
              "range": r["range"], "drawn": False, "flags": {}, "_stats": dict(STATS)}
        if r["type"] == "document":
            rd["documentUuid"] = r["documentUuid"]
        res_docs.append(rd)
    add("sc-tables", {"_id": _id, "name": name, "img": "icons/svg/d20-grey.svg", "description": f"<p>{desc}</p><p><em>{src(page)}</em></p>",
                      "results": res_docs, "formula": formula, "replacement": True, "displayRoll": True, "folder": None, "sort": i * 100,
                      "ownership": {"default": 0}, "flags": {}, "_stats": dict(STATS)})

# ------------------------------------------------------------------ Write
COLLECTION = {"Item": "items", "Actor": "actors", "RollTable": "tables"}
DOC_TYPE = {"sc-houses": "Actor", "sc-narrator-characters": "Actor", "sc-creatures": "Actor", "sc-tables": "RollTable"}
counts = {}
for pack, docs in PACKS.items():
    shutil.rmtree(os.path.join(OUT, pack), ignore_errors=True)
    os.makedirs(os.path.join(OUT, pack), exist_ok=True)
    coll = COLLECTION[DOC_TYPE.get(pack, "Item")]
    ids = set()
    for doc in docs:
        assert doc["_id"] not in ids, (pack, doc["name"])
        ids.add(doc["_id"])
        doc["_key"] = f"!{coll}!{doc['_id']}"
        for emb_key in ("items", "results"):
            for e in doc.get(emb_key, []) if isinstance(doc.get(emb_key), list) else []:
                e["_key"] = f"!{coll}.{emb_key}!{doc['_id']}.{e['_id']}"
        with open(os.path.join(OUT, pack, f"{slug(doc['name'])}_{doc['_id']}.json"), "w", encoding="utf-8") as f:
            json.dump(doc, f, ensure_ascii=False, indent=2)
    counts[pack] = len(docs)
print(json.dumps(counts, indent=1))
print("total", sum(counts.values()))
