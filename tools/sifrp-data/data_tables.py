# -*- coding: utf-8 -*-
"""Roll tables. Each table: (name, formula, page, description, [(low, high, text), ...])"""

TABLES = [
    ("Random Age", "3d6", 44, "Character creation: roll to determine your character's age category.", [
        (3, 3, "Youth"), (4, 4, "Adolescent"), (5, 6, "Young Adult"), (7, 11, "Adult"), (12, 15, "Middle Age"),
        (16, 16, "Old"), (17, 17, "Very Old"), (18, 18, "Venerable")]),
    ("Starting Status", "2d6", 45, "Character creation: starting Status rank and typical role within the house.", [
        (2, 2, "Status 2 — house retainer, common hedge knight, freeman"),
        (3, 4, "Status 3 — sworn sword, guardsman, squire"),
        (5, 9, "Status 4 — ranking member of the household, maester, junior septon, landed knight, noble bastard"),
        (10, 11, "Status 5 — banner lord, ward, courtier, septon, advisor"),
        (12, 12, "Status 6 — lord of the house, heir, lady, offspring")]),
    ("Background Events", "2d6", 47, "Character creation: a formative event in your past.", [
        (2, 2, "You served another house (page, sworn sword)."),
        (3, 3, "You had a torrid love affair."),
        (4, 4, "You fought or were involved in a battle."),
        (5, 5, "You were kidnapped and escaped, were ransomed, or rescued."),
        (6, 6, "You traveled across the narrow sea for a time."),
        (7, 7, "You achieved a significant deed, such as saving your lord's life or killing a giant boar."),
        (8, 8, "You kept the company of a famous individual."),
        (9, 9, "You were present at a significant tournament, competing or watching."),
        (10, 10, "You were involved in a villainous scandal."),
        (11, 11, "You were falsely accused of wrongdoing."),
        (12, 12, "You were held hostage by another house as a ward or prisoner.")]),
    ("Goals", "2d6", 47, "Character creation: what your character wants most.", [
        (2, 2, "Enlightenment"), (3, 3, "Skill — mastery in a specific ability"), (4, 4, "Fame"), (5, 5, "Knowledge"),
        (6, 6, "Love"), (7, 7, "Power"), (8, 8, "Security"), (9, 9, "Revenge"), (10, 10, "Wealth"), (11, 11, "Justice"), (12, 12, "Good")]),
    ("Motivations", "2d6", 47, "Character creation: what drives your character toward their goal.", [
        (2, 2, "Charity"), (3, 3, "Duty"), (4, 4, "Fear"), (5, 5, "Greed"), (6, 6, "Love"), (7, 7, "Hatred"),
        (8, 8, "Lust"), (9, 9, "Peace"), (10, 10, "Stability"), (11, 11, "Excellence"), (12, 12, "Madness")]),
    ("Virtues", "2d6", 47, "Character creation: your character's best quality.", [
        (2, 2, "Charitable"), (3, 3, "Chaste"), (4, 4, "Courageous"), (5, 5, "Devoted"), (6, 6, "Honest"), (7, 7, "Humble"),
        (8, 8, "Just"), (9, 9, "Magnanimous"), (10, 10, "Merciful"), (11, 11, "Pious"), (12, 12, "Wise")]),
    ("Vices", "2d6", 47, "Character creation: your character's worst quality.", [
        (2, 2, "Ambitious/Grasping"), (3, 3, "Arrogant"), (4, 4, "Avaricious"), (5, 5, "Cowardly"), (6, 6, "Cruel"), (7, 7, "Foolish"),
        (8, 8, "Licentious"), (9, 9, "Miserly"), (10, 10, "Prejudiced"), (11, 11, "Scheming"), (12, 12, "Wrathful")]),
    ("Starting Realm", "3d6", 97, "House creation: the realm your house calls home. Each result lists the realm's modifiers to the 7d6 starting resources (minimum 1).", [
        (3, 3, "King's Landing (Defense +5, Influence –5, Lands –5, Law +20, Population +5, Power –5, Wealth –5)"),
        (4, 4, "Dragonstone (Defense +20, Influence –5, Lands –5, Law +5, Population +0, Power +0, Wealth –5)"),
        (5, 6, "The North (Defense +5, Influence +10, Lands +20, Law –10, Population –5, Power –5, Wealth –5)"),
        (7, 7, "The Iron Islands (Defense +10, Influence –5, Lands –5, Law +0, Population +0, Power +10, Wealth +0)"),
        (8, 9, "The Riverlands (Defense –5, Influence –5, Lands +5, Law +0, Population +10, Power +0, Wealth +5)"),
        (10, 11, "The Mountains of the Moon (Defense +20, Influence +10, Lands –5, Law –10, Population –5, Power +0, Wealth +0)"),
        (12, 13, "The Westerlands (Defense –5, Influence +10, Lands –5, Law –5, Population –5, Power +0, Wealth +20)"),
        (14, 15, "The Reach (Defense –5, Influence +10, Lands +0, Law –5, Population +5, Power +0, Wealth +5)"),
        (16, 17, "The Stormlands (Defense +5, Influence +0, Lands –5, Law +10, Population –5, Power +5, Wealth +0)"),
        (18, 18, "Dorne (Defense +0, Influence –5, Lands +10, Law –5, Population +0, Power +10, Wealth +0)")]),
    ("First Founding", "1d6", 103, "House creation: when the house was founded and how many historical events it has (minimum one).", [
        (1, 1, "Ancient (Age of Heroes) — 1d6+3 historical events"), (2, 2, "Very Old (Andal Invasion) — 1d6+2 historical events"),
        (3, 3, "Old (Rhoynar Invasion) — 1d6+1 historical events"), (4, 4, "Established (Aegon's Conquest) — 1d6 historical events"),
        (5, 5, "Recent (Blackfyre Rebellion) — 1d6–1 historical events"), (6, 6, "New (War of the Usurper) — 1d6–2 historical events")]),
    ("Historical Events", "3d6", 102, "House creation: roll once per historical event. Each result matches an item in the Historical Events compendium; drag it onto the house sheet to roll its resource changes.", None),
    ("House Fortunes", "6d6", 122, "Each month the steward rolls a Status test (Stewardship bonus dice and holding modifiers apply). Find that test result here rather than rolling the table's formula: right-click the table and choose the matching result, or roll with a custom formula.", [
        (0, 2, "Disaster"), (3, 3, "Curse"), (4, 4, "Decline"), (5, 5, "Disaster"), (6, 6, "Growth"), (7, 7, "Decline"), (8, 8, "Growth"),
        (9, 9, "Curse"), (10, 10, "Decline"), (11, 11, "Growth"), (12, 12, "Boon"), (13, 13, "Decline"), (14, 14, "Blessing"),
        (15, 15, "Growth"), (16, 16, "Curse"), (17, 17, "Decline"), (18, 18, "Blessing"), (19, 19, "Curse"), (20, 20, "Blessing"),
        (21, 22, "Growth"), (23, 23, "Curse"), (24, 25, "Growth"), (26, 27, "Blessing"), (28, 28, "Boon"), (29, 29, "Curse"),
        (30, 30, "Blessing"), (31, 34, "Growth"), (35, 35, "Blessing"), (36, 36, "Boon"), (37, 41, "Growth"), (42, 99, "Boon")]),
    ("Heraldry: Tinctures", "2d6", 116, "Coat of arms: a color for the field or charges.", [
        (2, 3, "Black (Sable) — constancy, grief"), (4, 5, "Blue (Azure) — loyalty, truth, service"), (6, 6, "Purple (Purpure) — justice, sovereignty"),
        (7, 8, "Red (Gules) — military strength, magnanimity, sacrifice"), (9, 10, "Green (Vert) — hope, joy, loyalty in love"),
        (11, 11, "Orange (Tawny) — worthy ambition"), (12, 12, "Maroon (Sanguine) — patience and victory in battle")]),
    ("Heraldry: Metals", "1d6", 116, "Coat of arms: a metal.", [
        (1, 3, "White or silver (Argent) — peace, sincerity"), (4, 6, "Yellow or gold (Or) — generosity")]),
    ("Heraldry: Furs", "3d6", 116, "Coat of arms: whether a fur pattern is used.", [
        (3, 14, "None"), (15, 15, "Ermine (white with black spots)"), (16, 16, "Counter-ermine (black with white spots)"),
        (17, 17, "Pean (black with gold spots)"), (18, 18, "Erminois (gold with black spots)")]),
    ("Heraldry: Partitions", "7d6", 116, "Coat of arms: how the field is divided.", [
        (7, 9, "Per bend (diagonal, dexter chief to sinister base)"), (10, 11, "Per bend sinister"), (12, 14, "Per fess (across the middle)"),
        (15, 15, "Chape"), (16, 16, "Chape-ploye"), (17, 17, "Chausse"), (18, 18, "Chausse-ploye"), (19, 21, "Per chevron"),
        (22, 28, "Solid (no partition)"), (29, 30, "Per chevron inverted"), (31, 33, "Per pale (down the center)"), (34, 35, "Per pall (a Y)"),
        (36, 36, "Per pall inverted"), (37, 37, "Per pile"), (38, 39, "Quartered"), (40, 40, "Quartery of six"), (41, 42, "Per saltire (an X)")]),
    ("Heraldry: Charge Types", "3d6", 116, "Coat of arms: what kind of charge to add, then roll on the matching table.", [
        (3, 4, "Heraldic line — roll on Heraldry: Heraldic Lines"), (5, 5, "Plant — roll on Heraldry: Plants"),
        (6, 7, "Animal — roll on Heraldry: Animals"), (8, 13, "Ordinary — roll on Heraldry: Ordinaries"),
        (14, 16, "Subordinary (see the book)"), (17, 18, "Object (see the book)")]),
    ("Heraldry: Heraldic Lines", "2d6", 116, "Coat of arms: the style of a partition or ordinary's edge.", [
        (2, 2, "Dancette (zigzag; water)"), (3, 4, "Embattled (crenellated; battlements or fire)"), (5, 5, "Engrailed (scalloped; land)"),
        (6, 6, "Invected (reverse engrailed; land)"), (7, 7, "Indented (small wedges; fire)"), (8, 8, "Nebuly (sharply curving; clouds, air, sea)"),
        (9, 9, "Raguly (ragged; difficulties overcome)"), (10, 10, "Rayonne (rays; the sun)"), (11, 12, "Wavy (water and waves)")]),
    ("Heraldry: Plants", "2d6", 116, "Coat of arms: a plant charge.", [
        (2, 3, "Berries"), (4, 4, "Blasted tree"), (5, 6, "Flower (carnation, lily, rose)"), (7, 8, "Fruit (apple, grapes, lemons, pears)"),
        (9, 9, "Nuts (acorns, almonds, walnuts)"), (10, 10, "Plant (cotton, shrubs, wheat)"), (11, 12, "Tree (maple, oak, sentinel, weirwood)")]),
    ("Heraldry: Ordinaries", "5d6", 117, "Coat of arms: a geometric charge.", [
        (5, 5, "Annulet"), (6, 7, "Bar"), (8, 9, "Bend"), (10, 10, "Bend sinister"), (11, 11, "Bendlet"), (12, 12, "Bordure"), (13, 13, "Canton"),
        (14, 14, "Checky"), (15, 15, "Chevron"), (16, 16, "Chevronel"), (17, 17, "Chief"), (18, 18, "Cross"), (19, 19, "Escutcheon"),
        (20, 20, "Fusil"), (21, 21, "Gyron"), (22, 22, "Lozenge"), (23, 23, "Mascle"), (24, 24, "Pale"), (25, 25, "Pall"), (26, 26, "Pallet"),
        (27, 27, "Pile"), (28, 28, "Pile inverted"), (29, 30, "Roundel")]),
    ("Heraldry: Animals", "13d6", 117, "Coat of arms: an animal or mythological creature.", [
        (13, 13, "Ant"), (14, 14, "Antlers"), (15, 15, "Ass"), (16, 16, "Aurochs"), (17, 17, "Bat"), (18, 18, "Beaver"), (19, 19, "Bear"),
        (20, 20, "Bee"), (21, 21, "Boar"), (22, 22, "Boar's Head"), (23, 23, "Buck"), (24, 24, "Bull"), (25, 25, "Bull's Head"),
        (26, 26, "Bull's Horns"), (27, 27, "Butterfly"), (28, 28, "Cat"), (29, 29, "Claw of a bird"), (30, 30, "Cock"), (31, 31, "Cockatrice"),
        (32, 32, "Crane"), (33, 33, "Crow/Raven"), (34, 34, "Deer"), (35, 35, "Dog"), (36, 36, "Dolphin"), (37, 37, "Dragon"), (38, 38, "Duck"),
        (39, 39, "Eagle"), (40, 40, "Eagle with Two Heads"), (41, 41, "Falcon"), (42, 42, "Feathers"), (43, 43, "Fish"), (44, 44, "Fox"),
        (45, 45, "Goat"), (46, 46, "Goose"), (47, 47, "Griffon"), (48, 48, "Harpy"), (49, 49, "Hart"), (50, 50, "Hawk"), (51, 51, "Horse"),
        (52, 52, "Leopard"), (53, 53, "Lion"), (54, 54, "Mammoth"), (55, 55, "Manticore"), (56, 56, "Mastiff"), (57, 57, "Mermaid"),
        (58, 58, "Otter"), (59, 59, "Owl"), (60, 60, "Ox"), (61, 61, "Pig"), (62, 62, "Ram"), (63, 63, "Salamander"), (64, 64, "Sea Horse"),
        (65, 65, "Scorpion"), (66, 66, "Serpent"), (67, 67, "Shadowcat"), (68, 68, "Spider"), (69, 69, "Squirrel"), (70, 70, "Stag"),
        (71, 71, "Swallow"), (72, 72, "Swan"), (73, 73, "Tiger"), (74, 74, "Tortoise"), (75, 75, "Unicorn"), (76, 76, "Vulture"),
        (77, 77, "Wolf"), (78, 78, "Wyvern")]),
    ("Combat: Criticals (by number of sixes)", "1d8", 171, "When an attack's dice show sixes, look up the result by the number of sixes (optional Advanced Combat rule). Choose the row rather than rolling.", [
        (1, 1, "Solid Hit: +2 base damage."), (2, 2, "Powerful Hit: +4 base damage."),
        (3, 3, "Bloody Wound: the target also gains an injury (a wound if it cannot, death if neither)."),
        (4, 4, "Crippling Wound: the target also gains a wound (death if it cannot)."), (5, 5, "Killing Blow: the target dies."),
        (6, 6, "Terrible Blow: the target dies and adjacent foes take your base damage."),
        (7, 7, "Impressive Death: the target dies; your allies gain +1B for the rest of the combat."),
        (8, 8, "Horrible Death: the target dies; witnesses must pass a Challenging (9) Will test or take –1D for a round; you gain +1B for the combat.")]),
    ("Combat: Fumbles (by number of ones)", "1d8", 171, "When an attack's dice show ones, look up the result by the number of ones (optional Advanced Combat rule). Choose the row rather than rolling.", [
        (1, 1, "Injure Self: you take your weapon's damage."), (2, 2, "Strike Ally: you may hit an ally instead."),
        (3, 3, "Drop: the weapon lands 1d6 yards away."), (4, 4, "Minor Break: weapon damage –1 (castle-forged or better: treat as Drop)."),
        (5, 5, "Major Break: the weapon is ruined (castle-forged: Minor Break; Valyrian steel: Drop)."),
        (6, 6, "Slippery Grip: –1D on attacks until the end of your next turn."), (7, 7, "Blood in the Eyes: –1D on all tests until the end of your next turn."),
        (8, 8, "Overbalanced: –5 Combat Defense until the start of your next turn.")]),
]
