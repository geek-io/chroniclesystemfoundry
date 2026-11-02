# -*- coding: utf-8 -*-
"""Sword Chronicle roll tables. Ranges follow the book's tables; text is condensed."""

FORTUNES = {
    "Boon": "Boon: a windfall, royal favour, alliance or profitable marriage. Raise one resource by 1–6, or two by 1–3.",
    "Blessing": "Blessing: a minor upturn such as a useful ally or a notable invitation. Raise one resource by 1–3, or two by 1.",
    "Growth": "Growth: a gift of land, more people or a better economy. Raise one resource by 1.",
    "Decline": "Decline: lost land, weaker defenses, sickness. Reduce one resource by 1.",
    "Curse": "Curse: brigands, bad weather, blight, desertion or lawlessness. Reduce one resource by 1–3, or two by 1.",
    "Disaster": "Disaster: plague, a lord's disfavour, a disgraced ally. Reduce one resource by 1–6, or two by 1–3.",
}
_F = [(0, 2, "Disaster"), (3, 3, "Curse"), (4, 4, "Decline"), (5, 5, "Disaster"), (6, 6, "Growth"), (7, 7, "Decline"), (8, 8, "Growth"),
      (9, 9, "Curse"), (10, 10, "Decline"), (11, 11, "Growth"), (12, 12, "Boon"), (13, 13, "Decline"), (14, 14, "Blessing"), (15, 15, "Growth"),
      (16, 16, "Curse"), (17, 17, "Decline"), (18, 18, "Blessing"), (19, 19, "Curse"), (20, 20, "Blessing"), (21, 22, "Growth"), (23, 23, "Curse"),
      (24, 25, "Growth"), (26, 27, "Blessing"), (28, 28, "Boon"), (29, 29, "Curse"), (30, 30, "Blessing"), (31, 34, "Growth"), (35, 35, "Blessing"),
      (36, 36, "Boon"), (37, 41, "Growth"), (42, 60, "Boon")]

def _ratings(desc):
    return [(0, 0, desc[0]), (1, 10, desc[1]), (11, 20, desc[2]), (21, 30, desc[3]), (31, 40, desc[4]), (41, 50, desc[5]), (51, 60, desc[6]), (61, 70, desc[7])]

# (name, formula, page, description, rows) — rows None means the historical events (linked to the event items)
TABLES = [
    ("Random Age", "3d6", 16, "Roll 3d6 for a random age category. Ages: human / dwarf / elf / ogre (kurgulan as ogre).", [
        (3, 3, "Youth (human 0–9, dwarf 0–15, elf 0–20, ogre 0–9)"),
        (4, 4, "Adolescent (human 10–13, dwarf 16–20, elf 21–30, ogre 10–13)"),
        (5, 6, "Young Adult (human 14–18, dwarf 21–25, elf 31–40, ogre 14–18)"),
        (7, 11, "Adult (human 19–30, dwarf 26–50, elf 41–200, ogre 19–25)"),
        (12, 15, "Middle Age (human 31–50, dwarf 51–100, elf 201–400, ogre 26–40)"),
        (16, 16, "Old (human 51–70, dwarf 101–150, elf 401–500, ogre 41–50)"),
        (17, 17, "Very Old (human 71–80, dwarf 151–200, elf 501–600, ogre 51–55)"),
        (18, 18, "Venerable (human 81+, dwarf 201+, elf 601+, ogre 56+)")]),
    ("Starting Status", "2d6", 17, "Roll 2d6 for a random starting Status and position. Values in brackets are for a default house; noble Status never drops below 3.", [
        (2, 2, "House maximum –4 (2): house retainer, hired sword, freeman. No limit on positions."),
        (3, 4, "House maximum –3 (3): oath-sworn sword, guardsman, squire. 32 positions."),
        (5, 9, "House maximum –2 (4): ranking household member, sage, junior priest, landed knight, noble bastard. 16 positions."),
        (10, 11, "House maximum –1 (5): herald, ward, courtier, advisor, lesser heirs and spouses. 8 positions."),
        (12, 12, "House maximum (6): lord of the house, respected heirs, spouses, offspring. 4 positions.")]),
    ("Number of Historical Events", "1d6", 69, "Roll 1d6 for the number of events in your house's history; on a 6, add 1d3–1. Many events usually mean an ancient house.", [
        (1, 1, "1 historical event"), (2, 2, "2 historical events"), (3, 3, "3 historical events"), (4, 4, "4 historical events"),
        (5, 5, "5 historical events"), (6, 6, "6 historical events, plus 1d3–1 more (6 to 8)")]),
    ("Historical Events", "3d6", 69, "Roll 3d6 once per historical event, in order; the first event tells how the house was founded. Drop the result onto the house sheet.", None),
    ("House Fortunes", "2d6+18", 83, "Find the steward's Status test result (Stewardship bonus dice and holding modifiers apply) on this table. The default roll is only a placeholder: draw the row that matches your actual result.",
        [(lo, hi, FORTUNES[f]) for lo, hi, f in _F]),
    ("Starting Resources: Defense", "8d6-2d6", 66, "Roll 8d6 − 2d6 (minimum 1) for the resource and read the description.", _ratings([
        "Desolate ruined land with no defensible structures or roads.",
        "Mostly wilderness with unprotected pockets of civilization, one or two roads or a minor stronghold.",
        "Some cultivation, a keep or small stronghold, a few roads, rivers or ports.",
        "Defensible, with at least one fortified town or castle; roads, likely rivers or ports.",
        "Good defenses: almost certainly a castle and other strong points, or naturally defensive terrain.",
        "Excellent defenses combining fortifications and defensible terrain.",
        "Extraordinary defenses that make attacking these lands very costly.",
        "Among the greatest defenses in the world."])),
    ("Starting Resources: Influence", "8d6-2d6", 67, "Roll 8d6 − 2d6 (minimum 1). Influence also sets the house's maximum Status (0–10: 2, 11–20: 3, 21–40: 4, 41–50: 5, 51–60: 6, 61–70: 7, 71+: 8).", _ratings([
        "Erased from all records; no one speaks the name.", "A minor landed knight or equivalent.", "A greater landed knight or equivalent.",
        "A small minor house.", "A minor house.", "A powerful minor house with a colourful history.", "A great house.",
        "Royal or imperial influence."])),
    ("Starting Resources: Lands", "8d6-2d6", 67, "Roll 8d6 − 2d6 (minimum 1).", _ratings([
        "Landless; stripped of all holdings.", "A speck of land no larger than a town.", "A small island or a large city and its surroundings.",
        "A modest stretch of land or a medium-sized island.", "Several terrain features or groups of islands.", "A large, varied area spread over a great distance.",
        "A huge area, perhaps a small continent.", "A large continent, overlapping other houses' holdings."])),
    ("Starting Resources: Law", "8d6-2d6", 67, "Roll 8d6 − 2d6 (minimum 1). House Fortunes modifier: 0 –20, 1–10 –10, 11–20 –5, 21–30 –2, 31–40 –1, 41–50 +0, 51–60 +1, 61–70 +2, 71+ +5.", _ratings([
        "Lawless land where you have no authority.", "Bandits and raiders cause trouble throughout your lands.", "Banditry troubles the fringes of your lands.",
        "Crime is common but not out of control.", "Strong control; crime is uncommon.", "Crime is rare.", "Almost no crime at all.", "No crime in your lands."])),
    ("Starting Resources: Population", "8d6-2d6", 67, "Roll 8d6 − 2d6 (minimum 1). House Fortunes modifier: 0 –10, 1–10 –5, 11–20 +0, 21–30 +1, 31–40 +3, 41–50 +1, 51–60 +0, 61–70 –5, 71+ –10.", _ratings([
        "Barren; no one lives under your rule.", "Thinly populated tiny settlements.", "A small population, nothing larger than a small town.",
        "Typical: farmsteads and hamlets, perhaps a couple of small towns.", "Modest: at least one town and several hamlets.", "Large: a large town or many smaller ones.",
        "Immense numbers live under your protection.", "Your whole culture, and more, are your subjects."])),
    ("Starting Resources: Power", "8d6-2d6", 68, "Roll 8d6 − 2d6 (minimum 1).", _ratings([
        "Powerless; no troops or warrior vassals.", "A personal guard, a few veterans and at most a small militia.", "A small force mostly of levied commoners.",
        "A modest force with some trained troops and at least one vassal house.", "A trained force with cavalry, possibly ships, and two vassal houses.",
        "A large, diverse, competent army with specialists and several vassals.", "A huge force drawn from your lands and many vassals.",
        "Everyone in your culture able to bear arms."])),
    ("Starting Resources: Wealth", "8d6-2d6", 68, "Roll 8d6 − 2d6 (minimum 1).", _ratings([
        "Destitute.", "Impoverished; struggling to make ends meet.", "Poor; able to sustain itself without luxury.", "Common; enough to get by.",
        "Prosperous; living according to its station.", "Affluent; more than it needs.", "Rich; wanting for nothing.", "Decadent; sixty-six-course feasts."])),
]
