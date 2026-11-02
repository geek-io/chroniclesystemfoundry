# -*- coding: utf-8 -*-
"""Generate Foundry compendium sources (one JSON per document) for the Chronicle System."""
import hashlib, json, os, re, shutil, sys, time
sys.path.insert(0, os.path.dirname(__file__))
import data_items as D
import data_actors as DA
import data_tables as DT

OUT = sys.argv[1] if len(sys.argv) > 1 else "packs/_source"
SYS = "systems/chroniclesystem/assets/icons"
NOW = int(time.mktime((2026, 11, 2, 12, 0, 0, 0, 0, 0)) * 1000)
STATS = {"coreVersion": "14.368", "systemId": "chroniclesystem", "systemVersion": "14.0.0", "createdTime": NOW,
         "modifiedTime": NOW, "lastModifiedBy": None, "compendiumSource": None, "duplicateSource": None, "exportSource": None}
ALPH = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789"


def rid(*parts):
    h = hashlib.sha256("|".join(parts).encode()).digest()
    return "".join(ALPH[b % len(ALPH)] for b in h[:16])


def slug(s):
    return re.sub(r"[^a-z0-9]+", "-", s.lower()).strip("-")


def html(*paras):
    return "".join(f"<p>{p}</p>" for p in paras if p)


def src(page):
    return D.SRC.format(page)


def item(pack, name, type_, system, img=None, sort=0, flags=None):
    _id = rid(pack, type_, name)
    return {"_id": _id, "name": name, "type": type_, "img": img or f"{SYS}/{type_}.png", "system": system,
            "effects": [], "folder": None, "sort": sort, "ownership": {"default": 0}, "flags": flags or {},
            "_stats": dict(STATS)}


def base_item_system(type_):
    tpl = json.load(open(os.path.join(os.path.dirname(__file__), "..", "..", "template.json")))["Item"]
    data = {}
    for t in tpl[type_].get("templates", []):
        data.update(json.loads(json.dumps(tpl["templates"][t])))
    data.update({k: v for k, v in tpl[type_].items() if k != "templates"})
    return json.loads(json.dumps(data))


def num(v):
    m = re.search(r"[\d.]+", str(v).replace(",", "").replace("1-1/2", "1.5"))
    return float(m.group(0)) if m else 0


PACKS = {}


def add(pack, doc):
    PACKS.setdefault(pack, []).append(doc)
    return doc


# ------------------------------------------------------------------ Items
for i, (name, page, specs, desc) in enumerate(D.ABILITIES):
    s = base_item_system("ability")
    s.update(description=html(desc), rating=2, modifier=0, specialties=[{"name": x, "rating": 0, "modifier": 0} for x in specs], source=src(page))
    add("abilities", item("abilities", name, "ability", s, sort=i * 100))

WEAPONS = {}
for i, (name, group, training, dmg, quals, reach, weight, cost) in enumerate(D.W):
    s = base_item_system("weapon")
    ability = D.WEAPON_GROUP_ABILITY[group]
    q = [{"name": m.group(1).strip(), "parameter": (m.group(2) or "").strip()} for m in
         (re.match(r"^(.*?)(?:\s+([+-]?\d+|\([^)]*\)))?$", x.strip()) for x in quals.split(",") if x.strip())]
    s.update(description=html(D.WEAPON_NOTES[group]), specialty=f"{ability}:{group}", training=training,
             damage=("@" + dmg.replace(" ", "") if dmg else "").replace("@AnimalHandling", "@Animal Handling"),
             qualities=q, reach=reach, range="", weight=num(weight), quantity=1, cost=cost, equipped=0, source=src(310))
    doc = add("weapons", item("weapons", name, "weapon", s, sort=i * 100))
    WEAPONS[name.lower()] = doc

ARMORS = {}
for i, (name, ar, ap, bulk, weight, cost, desc) in enumerate(D.ARMOR):
    s = base_item_system("armor")
    s.update(description=html(desc), rating=ar, penalty=ap, bulk=bulk, qualities=[], weight=num(weight), quantity=1, cost=cost, equipped=0, source=src(312))
    doc = add("armor", item("armor", name, "armor", s, sort=i * 100))
    ARMORS[name.lower()] = doc

GOODS = {}
for i, (name, cost, cat, note) in enumerate(D.GOODS):
    s = base_item_system("equipment")
    s.update(description=html(note, f"<em>{cat}</em>"), quantity=1, cost=cost, source=src(135))
    doc = add("equipment", item("equipment", name, "equipment", s, sort=i * 100, flags={"chroniclesystem": {"category": cat}}))
    GOODS[name.lower()] = doc

for i, (name, delivery, vir, tox, freq, diag, cost, page, summary, recovery) in enumerate(D.POISONS):
    s = base_item_system("poison")
    s.update(description=html(summary), delivery=delivery, virulence=vir, frequency=freq,
             toxicity=int(num(tox)) if num(tox) else 0, diagnosis=diag, effects=html(f"Toxicity: {tox}. Diagnosis: {D.DIFF.get(diag, '—') or '—'}."),
             recovery=html(recovery), cost=cost, quantity=1, source=src(page))
    add("poisons", item("poisons", name, "poison", s, sort=i * 100))

PAGES = json.load(open(os.path.join(os.path.dirname(__file__), "toc_pages.json")))
BENEFITS = {}
for i, (name, cat, req, eff) in enumerate(D.BENEFITS):
    s = base_item_system("benefit")
    page = PAGES.get(name.lower(), 76)
    s.update(description=html(eff, f"<em>{cat} quality. Full rules: {src(page)}.</em>"), categories=cat, requirements=req or "—",
             sorcerousArtAccess=False, source=src(page))
    doc = add("benefits", item("benefits", name, "benefit", s, sort=i * 100))
    BENEFITS[name.lower()] = doc

DRAWBACKS = {}
for i, (name, req, eff) in enumerate(D.DRAWBACKS):
    s = base_item_system("drawback")
    page = PAGES.get(name.lower(), 92)
    s.update(description=html(eff, f"<em>Full rules: {src(page)}.</em>"), requirements=req or "—", isAFlaw=name == "Flaw", source=src(page))
    doc = add("drawbacks", item("drawbacks", name, "drawback", s, sort=i * 100))
    DRAWBACKS[name.lower()] = doc

for i, (name, res, inv, time_, fd, fm, page, desc) in enumerate(D.HOLDINGS):
    s = base_item_system("holding")
    extra = D.DOMAIN_FEATURES if name.startswith("Domain") else ""
    s.update(description=html(desc, extra, f"<em>{src(page)}</em>"), investment=inv, buildTime=time_, resource=res, features=[],
             fortuneDice=fd, fortuneModifier=fm, source=src(page))
    add("holdings", item("holdings", name, "holding", s, sort=i * 100))
for j, (name, cost, disc, keys, note) in enumerate(D.UNITS):
    s = base_item_system("holding")
    s.update(description=html(f"Unit type. Discipline modifier {disc}. Key abilities: {keys}.", note, D.TRAINING, f"<em>{src(111)}</em>"),
             investment=cost, buildTime="", resource="power", features=[{"name": "Training: Trained", "cost": 3}], fortuneDice="", fortuneModifier=0, source=src(111))
    add("holdings", item("holdings", f"Unit: {name}", "holding", s, sort=(len(D.HOLDINGS) + j) * 100))

for i, (name, roll, formulas, summary) in enumerate(D.EVENTS):
    s = base_item_system("event")
    s["description"] = html(summary, f"<em>Historical Events table roll {roll} ({src(102)}).</em>")
    if formulas is None:
        s.update(playerChoice=True, numberOfChoices=2, bonusToChoices="1d6")
    else:
        for k in s["formulas"]:
            s["formulas"][k] = formulas.get(k, "")
    s["source"] = src(102)
    add("events", item("events", name, "event", s, sort=i * 100))

# ------------------------------------------------------------------ Actors
TPL = json.load(open(os.path.join(os.path.dirname(__file__), "..", "..", "template.json")))["Actor"]


def actor_system(type_):
    data = {}
    for t in TPL[type_]["templates"]:
        data.update(json.loads(json.dumps(TPL["templates"][t])))
    data.update({k: v for k, v in TPL[type_].items() if k != "templates"})
    return data


ABILITY_NAMES = [a[0] for a in D.ABILITIES]


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
            if not part:
                continue
            mm = re.match(r"^(\d+)B\s+(.*)$", part) or None
            if mm:
                sp[mm.group(2).strip()] = int(mm.group(1))
                continue
            mm = re.match(r"^(.*?)\s*(\d+)\s*B?$", part)
            if mm:
                sp[mm.group(1).strip()] = int(mm.group(2))
            else:
                sp[part] = 0
        out[name] = (rating, sp)
    return out


def norm_abilities(ab):
    return {k: (v if isinstance(v, tuple) else (v, {})) for k, v in ab.items()}


def ability_items(pack, actor, ab, all_abilities):
    items = []
    names = ABILITY_NAMES if all_abilities else list(ab.keys())
    for name in names:
        rating, specs = ab.get(name, (2, {}))
        base = next(x for x in PACKS["abilities"] if x["name"] == name)
        s = json.loads(json.dumps(base["system"]))
        s["rating"] = rating
        known = {x["name"]: x for x in s["specialties"]}
        lst = []
        for x in s["specialties"]:
            lst.append({"name": x["name"], "rating": specs.get(x["name"], 0), "modifier": 0})
        for sp, r in specs.items():
            if sp not in known:
                lst.append({"name": sp, "rating": r, "modifier": 0})
        s["specialties"] = lst
        doc = item(pack, f"{actor}|{name}", "ability", s, img=base["img"])
        doc["name"] = name
        doc["_stats"]["compendiumSource"] = f"Compendium.chroniclesystem.abilities.Item.{base['_id']}"
        items.append(doc)
    return items


def lookup_copy(pack, actor, name, table, fallback_type):
    key = name.lower()
    base_name = re.sub(r"\s*\(.*\)$", "", name).strip().lower()
    base = table.get(key) or table.get(base_name)
    if base:
        s = json.loads(json.dumps(base["system"]))
        doc = item(pack, f"{actor}|{name}", base["type"], s, img=base["img"])
        doc["name"] = name if base_name != key else base["name"]
        doc["_stats"]["compendiumSource"] = f"Compendium.chroniclesystem.{pack_of(base)}.Item.{base['_id']}"
        return doc
    s = base_item_system(fallback_type)
    doc = item(pack, f"{actor}|{name}", fallback_type, s)
    doc["name"] = name
    return doc


def pack_of(doc):
    for p, docs in PACKS.items():
        if doc in docs:
            return p
    return ""


def attack_item(pack, actor, t, equipped):
    name, test, bonus, dmg, quals = t
    base = WEAPONS.get(name.lower())
    q = [{"name": m.group(1).strip(), "parameter": (m.group(2) or "").strip()} for m in
         (re.match(r"^(.*?)(?:\s+([+-]?\d+|\([^)]*\)))?$", x.strip()) for x in quals.split(",") if x.strip())]
    if base:
        doc = lookup_copy(pack, actor, name, WEAPONS, "weapon")
        have = {x["name"].lower() for x in doc["system"]["qualities"]}
        doc["system"]["qualities"] += [x for x in q if x["name"].lower() not in have]
    else:
        s = base_item_system("weapon")
        s.update(specialty="Fighting:", damage=dmg, qualities=q, training=0,
                 description=html(f"Natural or special attack: {test}D{'+%dB' % bonus if bonus else ''}, {dmg} damage."))
        doc = item(pack, f"{actor}|{name}", "weapon", s)
        doc["name"] = name
    doc["system"]["equipped"] = equipped
    doc["flags"] = {"chroniclesystem": {"printed": f"{test}D{'+%dB' % bonus if bonus else ''}, {dmg} damage"}}
    return doc


def apply_printed(system, ab, printed, armor_bulk=0):
    r = lambda n: ab.get(n, (2, {}))[0]
    calc = dict(combatDefense=r("Agility") + r("Athletics") + r("Awareness"),
                intrigueDefense=r("Awareness") + r("Cunning") + r("Status"),
                composure=r("Will") * 3, health=r("Endurance") * 3)
    for k, v in printed.items():
        if v is None:
            continue
        system["derivedStats"][k]["modifier"] = v - calc[k]


def finish_actor(pack, name, type_, system, items, img, notes_html=""):
    _id = rid(pack, "actor", name)
    for idx, it in enumerate(items):
        it["_id"] = rid(pack, _id, it["type"], it["name"], str(idx))
        it["sort"] = idx * 100
    return {"_id": _id, "name": name, "type": type_, "img": img, "system": system, "items": items, "effects": [],
            "folder": None, "sort": 0, "ownership": {"default": 0}, "flags": {},
            "prototypeToken": {"name": name, "displayName": 20, "actorLink": type_ == "character", "disposition": -1 if type_ == "npc" else 1,
                               "texture": {"src": img}, "width": 1, "height": 1},
            "_stats": dict(STATS)}


def build_character(pack, a, overrides=None, display=None):
    a = dict(a)
    a.update(overrides or {})
    name = display or a["name"]
    ab = norm_abilities(a["abilities"])
    system = actor_system("character")
    system["destinyPoints"] = {"current": a["destiny"], "max": a["destiny"]}
    system["coins"]["golds"] = a.get("coins", {}).get("golds", 0)
    if isinstance(a.get("age"), int):
        system["age"] = a["age"]
    items = ability_items(pack, name, ab, True)
    for b in a["benefits"]:
        items.append(lookup_copy(pack, name, b, BENEFITS, "benefit"))
    for d in a["drawbacks"]:
        items.append(lookup_copy(pack, name, d, DRAWBACKS, "drawback"))
    arm = lookup_copy(pack, name, a["armor"], ARMORS, "armor")
    arm["system"]["equipped"] = 1
    items.append(arm)
    main_done = off_done = False
    for w in a["weapons"]:
        doc = lookup_copy(pack, name, w, WEAPONS, "weapon")
        two = any(q["name"].lower() == "two-handed" for q in doc["system"]["qualities"])
        is_shield = "Shields" in doc["system"]["specialty"]
        if is_shield and not off_done:
            doc["system"]["equipped"] = 3; off_done = True
        elif not main_done and not is_shield and not two and "Mounted" not in str(doc["system"]["qualities"]) and "Marksmanship" not in doc["system"]["specialty"]:
            doc["system"]["equipped"] = 2; main_done = True
        items.append(doc)
    for g in a.get("gear", []):
        items.append(lookup_copy(pack, name, g, GOODS, "equipment"))
    apply_printed(system, ab, a["printed"])
    system["personalHistory"] = html(a.get("bio", ""), a["notes"], f"<em>{a.get('age', '')} {a.get('role', '')} archetype — {src(a['page'])}</em>")
    return finish_actor(pack, name, "character", system, items, "icons/svg/mystery-man.svg")


for a in DA.ARCHETYPES:
    add("archetypes", build_character("archetypes", a))

for name, base_name, page, ov, bio in DA.PREGENS:
    base = next(x for x in DA.ARCHETYPES if x["name"] == base_name)
    ov = dict(ov)
    ov["page"] = page
    ov["bio"] = bio
    add("pregenerated-characters", build_character("pregenerated-characters", base, ov, display=name))


def build_npc(pack, name, page, stats, printed, armor, attacks, notes, kind="npc", traits=(), ar=None, move=""):
    ab = parse_abilities(stats)
    system = actor_system("npc")
    system["npcKind"] = kind
    system["source"] = src(page)
    items = ability_items(pack, name, ab, False)
    if armor:
        if isinstance(armor, tuple):
            aname, rating, pen, bulk = armor
            base = ARMORS.get(aname.lower()) or ARMORS.get({"hide": "hide"}.get(aname.lower(), aname.lower()))
            doc = lookup_copy(pack, name, aname, ARMORS, "armor")
            doc["system"].update(rating=rating, penalty=pen, bulk=bulk, equipped=1)
            items.append(doc)
    elif ar:
        s = base_item_system("armor")
        s.update(rating=ar, penalty=0, bulk=0, equipped=1, description=html("Natural armor."))
        doc = item(pack, f"{name}|Natural Armor", "armor", s)
        doc["name"] = "Natural Armor"
        items.append(doc)
    for k, t in enumerate(attacks):
        items.append(attack_item(pack, name, t, 2 if k == 0 else 0))
    apply_printed(system, ab, printed)
    trait_html = "".join(f"<p><strong>{t}.</strong> {d}</p>" for t, d in traits)
    move_html = f"<p><strong>Movement:</strong> {move}</p>" if move else ""
    system["npcNotes"] = html(notes) + move_html + trait_html + f"<p><em>Statistics: {stats}. {src(page)}.</em></p>"
    img = "icons/svg/mystery-man.svg"
    return finish_actor(pack, name, "npc", system, items, img)


for (name, page, stats, printed, armor, attacks, notes) in DA.NARRATOR:
    add("narrator-characters", build_npc("narrator-characters", name, page, stats, printed, armor, attacks, notes))

for (name, page, kind, stats, printed, ar, move, attacks, traits) in DA.CREATURES:
    add("creatures", build_npc("creatures", name, page, stats, printed, None, attacks, "", kind=kind, traits=traits, ar=ar, move=move))

# ------------------------------------------------------------------ Roll tables
EVENT_DOCS = {d["name"]: d for d in PACKS["events"]}
for i, (name, formula, page, desc, rows) in enumerate(DT.TABLES):
    _id = rid("tables", name)
    results = []
    if rows is None:  # historical events -> link to compendium items
        for (ev, roll, *_rest) in D.EVENTS:
            d = EVENT_DOCS[ev]
            results.append(dict(type="document", name=ev, img=d["img"], documentUuid=f"Compendium.chroniclesystem.events.Item.{d['_id']}",
                                range=[roll, roll], description=""))
    else:
        for lo, hi, text in rows:
            results.append(dict(type="text", name=text, img="icons/svg/d20-black.svg", range=[lo, hi], description=""))
    res_docs = []
    for k, r in enumerate(results):
        rd = {"_id": rid(_id, str(k)), "type": r["type"], "name": r["name"], "img": r["img"], "description": r["description"],
              "weight": 1, "range": r["range"], "drawn": False, "flags": {}, "_stats": dict(STATS)}
        if r["type"] == "document":
            rd["documentUuid"] = r["documentUuid"]
        res_docs.append(rd)
    add("tables", {"_id": _id, "name": name, "img": "icons/svg/d20-grey.svg", "description": f"<p>{desc}</p><p><em>{src(page)}</em></p>",
                   "results": res_docs, "formula": formula, "replacement": True, "displayRoll": True, "folder": None, "sort": i * 100,
                   "ownership": {"default": 0}, "flags": {}, "_stats": dict(STATS)})

# ------------------------------------------------------------------ Write
COLLECTION = {"Item": "items", "Actor": "actors", "RollTable": "tables"}
DOC_TYPE = {"abilities": "Item", "weapons": "Item", "armor": "Item", "equipment": "Item", "poisons": "Item", "benefits": "Item",
            "drawbacks": "Item", "holdings": "Item", "events": "Item", "archetypes": "Actor", "pregenerated-characters": "Actor",
            "narrator-characters": "Actor", "creatures": "Actor", "tables": "RollTable"}
if os.path.isdir(OUT):
    shutil.rmtree(OUT)
counts = {}
for pack, docs in PACKS.items():
    os.makedirs(os.path.join(OUT, pack), exist_ok=True)
    coll = COLLECTION[DOC_TYPE[pack]]
    for doc in docs:
        doc["_key"] = f"!{coll}!{doc['_id']}"
        for emb_key, emb_coll in (("items", "items"), ("results", "results")):
            for e in doc.get(emb_key, []) if isinstance(doc.get(emb_key), list) else []:
                if isinstance(e, dict):
                    e["_key"] = f"!{coll}.{emb_coll}!{doc['_id']}.{e['_id']}"
        with open(os.path.join(OUT, pack, f"{slug(doc['name'])}_{doc['_id']}.json"), "w", encoding="utf-8") as f:
            json.dump(doc, f, ensure_ascii=False, indent=2)
    counts[pack] = len(docs)
print(json.dumps(counts, indent=1))
print("total", sum(counts.values()))
