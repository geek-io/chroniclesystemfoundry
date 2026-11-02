# Change Log

## 14.0.2 — Sword Chronicle content

Adds the content of *Sword Chronicle: Feudal Fantasy Roleplaying* (Green Ronin, 2020), with new item types for ancestries and sorcery.

### Added
- **Four new item types:**
  - **Ancestry**: age categories, the ancestry's benefit options and any special rules.
  - **Sorcerous Art**: tools, initiation benefit, common resonances and its list of Works.
  - **Sorcerous Work**: Art, Spell/Ritual/both, test ability, learning time and difficulty, price, resonances, the spellcasting difficulty, and the Alignment, Invocation and Unleashing steps.
  - **Sorcerous Tradition**: resonances and favoured Arts.
- **Character sheet:**
  - The Qualities tab lists a character's ancestries above benefits and drawbacks. Dropping an ancestry also fills the header's Ancestry field.
  - The Sorcery tab shows Sorcery Defense, Sorcery Points, Traditions, Arts and Works. Each Work has roll buttons for its spell test or its Alignment, Invocation and Unleashing tests.
  - Older Technique items still appear under "Techniques (legacy)" when a character has any.
- **Sorcery Defense** is calculated for characters and NPCs: Cunning + Endurance + Will, plus a +1 Averting bonus for every two Sorcerous benefits, plus a modifier.
- **Sword Chronicle compendiums:** a new "Sword Chronicle" compendium folder with 14 packs and 475 entries:
  - **Ancestries:** dwarf, elf, human, ogre and kurgulan.
  - **Benefits:** 128, including the ancestry benefits and the kurgulan benefits.
  - **Drawbacks:** 45, including Strictures and Sorcerous drawbacks.
  - **Sorcery:** 6 Traditions, the 4 Arts and 17 Works.
  - **Weapons:** 58.
  - **Armor:** 15.
  - **Goods, clothing, trade goods, mounts and barding:** 77.
  - **Poisons:** 9.
  - **Holdings and unit types:** 37.
  - **Historical events:** 16.
  - **Houses:** 20 house actors, made up of House Margoth of Graylock and the 19 houses of the Breachlands.
  - **Narrator characters:** 7.
  - **Creatures:** 19, including the giant, gryphon and unfallen.
  - **Roll tables:** 12, covering age, starting status, historical events, House Fortunes and the seven starting resources.
  - Entries hold the book's statistics with short summaries and page references, not the book's text.
- **House resource setting:** a world setting chooses the dice for regenerating a house's starting resources: SIFRP's 7d6, or Sword Chronicle's 8d6 − 2d6 (minimum 1).
- **Importer:** it accepts the new item types, including table columns for a Work's Art, type, price, learning difficulty and resonances.
- **New icons** for the four new item types.

### Changed
- The SIFRP compendium generator now only replaces its own pack folders, so both generators can share `packs/_source`. `npm run build:sources` runs both.

## 14.0.1

Bug fixes from testing 14.0.0.

### Fixed
- Sheet tabs: long labels such as "Combat and Intrigue" wrapped onto two lines with oversized line spacing, making that tab taller than the rest. Tab labels now stay on one line, tabs size to their label and share the row evenly, and on very narrow sheets whole tabs move to a second row.
- The actor and item name in sheet headers (character, NPC, house and all item sheets) inherited Foundry's large heading size and spilled out of the header. It now uses a fixed size that fits the header, and long names are cut off with "…".
- The importer didn't open on Foundry v14 ("Cannot set property state of #<ApplicationV2> which has only a getter"). v14's ApplicationV2 has its own read-only `state` property, and the importer stored its form data under the same name; it now uses `importState`.

## 14.0.0 — Foundry VTT v14

Port of the system to Foundry VTT v14 (also runs on v13.346+), plus a content importer, full SIFRP compendiums and dark mode.

### Added
- **Compendiums** built from *A Song of Ice and Fire Roleplaying: Game of Thrones Edition*, grouped under a "Chronicle System (SIFRP)" folder in the Compendiums sidebar. They hold 455 entries in 14 packs:
  - Abilities (19, with all specialties), Benefits (118) and Drawbacks (35), each with requirements, category, a short summary and the book page.
  - Weapons (58, with specialty, training, damage formula, qualities, reach, weight and cost), Armor (15), Equipment & Mounts (60: goods, clothing, instruments, mounts, vehicles, barding, ammunition) and Poisons (21).
  - House Holdings & Units (38: defense holdings, heirs, domains, banner houses, all 17 unit types, wealth holdings) and Historical Events (16, with roll formulas the house sheet applies automatically).
  - Character Archetypes (9) and Pregenerated Characters (6), ready to play with abilities, qualities, equipped arms and armor, and gear.
  - Narrator Characters (15 sample NPCs and adventure NPCs), and Creatures & Steeds (23 animals, horses and supernatural creatures, including the Others and wights).
  - Roll Tables (22): character creation (age, status, background, goals, motivations, virtues, vices), house creation (realm, founding, historical events), House Fortunes, heraldry, and critical and fumble results.
  - Stats come from the book's tables. Descriptions are short summaries that point to the page, so the packs can ship with the system without reproducing the book's text.
- **Chronicle Importer** (button in the Actors, Items and Compendiums sidebars, or `game.chroniclesystem.openImporter()`):
  - Stat blocks: paste one or many SIFRP stat blocks to create NPCs or characters with abilities, specialties, attacks, armor, benefits, drawbacks and gear.
  - Tables: CSV, TSV or `|`-separated tables of weapons, armor, equipment, benefits, drawbacks, holdings or poisons. Column names are matched automatically.
  - JSON: Foundry document exports, bundles of actors and items, or a simple Chronicle JSON format (examples are built in).
  - PDF: reads a PDF's text layer for a page range and falls back to OCR for scanned pages.
  - OCR: reads text from images (PNG, JPG and so on) with Tesseract.js. PDF and OCR support loads from the jsDelivr CDN the first time it's used, and files never leave the user's computer.
  - Shows a preview with warnings before importing, imports into the world (optionally into a folder) or an unlocked compendium, and can swap in the matching system compendium entries by name.
- **Dark mode for every sheet** (character, NPC, house, items, dialogs, importer). Sheets follow Foundry's own theme by default, including the per-sheet *Configure Sheet → Theme* option. A new client setting, *Sheet Theme* (Follow Foundry / Light / Dark), and a half-moon button in each sheet's header switch it on one computer.
- **NPC / Creature** actor type, using the character sheet with a Kind field (NPC, creature, animal), Notes and Source.
- **Poison** item type with its own sheet (the data existed before but the type was never registered).
- New characters start with all 19 abilities at rank 2, taken from the Abilities compendium.
- A delete button for benefits, drawbacks and equipment rows on the character sheet. Items show their source and book page.
- `tools/sifrp-data/` (data and generator) and `tools/compile-packs.mjs` rebuild the compendiums: `npm install && npm run build`.

### Changed
- All actor and item sheets rebuilt on ApplicationV2 (`ActorSheetV2` / `ItemSheetV2` with `HandlebarsApplicationMixin`). Sheets keep their scroll position and active tab, and support drag-and-drop sorting.
- Rich text fields use Foundry's ProseMirror editor (TinyMCE is gone in v14).
- Dialogs (roll modifiers, initiative type, house resources, member roles, historical events, delete confirmation) now use DialogV2.
- Rolls use the v13/v14 dice API. A test is now one roll, `Xd6rN=1khY ± Z`, so Dice So Nice and manual dice entry work.
- Armor, weapon bulk, fatigue, injury, wound, frustration and stress modifiers and penalties are now calculated from the sheet every time it updates, instead of being saved into the actor. They can't drift out of sync, and other connected players no longer send duplicate updates.
- House resource totals (starting value plus event modifiers) are calculated the same way.
- "Re-roll starting resources" on the house sheet rolls 7d6 per resource, as the book specifies (p. 99). It used to roll `8d6-2d6`.
- Rewrote the stylesheet as a single `styles/chronicle.css` using CSS variables (replaces `actor-sheet.css`, `global.css` and the LESS files).
- `system.json` updated to v14: `compatibility` 13.346 to 14.368, `documentTypes`, `grid`, packs and pack folders, plus manifest and download URLs for the Geek IO repository.
- Foundry globals now use their v13/v14 namespaces (`foundry.applications.*`, `foundry.utils.*`, `DocumentSheetConfig`).

### Fixed
- The system's `formGroup` and `concat` Handlebars helpers replaced Foundry's core helpers with the same names, which broke several of Foundry's own configuration forms. They are now `csFormGroup` and `csConcat`.
- Updates written to the removed `data.*` paths (wounds, injuries, conditions, equipment, specialties, qualities, features, arts, works, house members, resources, events) now use `system.*`, so these edits save again.
- List edits (specialties, qualities, holding features, arts, works, wounds, injuries) no longer turn the stored arrays into objects or drop fields that had no input on the sheet.
- Removing a family member or servant from a house removed everyone listed after them too.
- The "Re-roll 1s" value in the roll dialog was never applied (a typo in the formula class).
- Historical event formulas rolled synchronously, which v12+ no longer allows.
- Sorcery works on the character sheet linked to the wrong item.
- Readonly derived values (defense totals, movement) were written back into the actor on every edit.
- The migration from 0.3.0 referenced an undefined variable. Migrations now stop and report if one fails.

### Migration
- Opening a world on 14.0.0 converts list fields that older versions saved as index-keyed objects back into arrays. Back up your world first: Foundry can't downgrade a world once v14 has opened it.

## 0.6.0

### Added
- Holding Fortune Modifier to House Sheet (Thanks Nicolò)
- It is now possible to add two weapons of the same type to the character
- Disposition DR to Intrigue Tab
- Weapon "Adaptable" quality support (The weapon can be equipped with one or two hands, the extra damage is already calculated.)

### Changed

- Item Description field resizes with the item sheet size.

### Fixed
- House Event "Player choice" field
- Armor quality field

## 0.5.0

### Added
- modifier window on rolls when holding SHIFT key (can be inverted in settings)
- automatic initiative rolls (when clicking on one of the combat tracker initiative rolls buttons, a window will appear asking the type of initiative)

## 0.4.2

### Fixed
- the combat and intrigue tab fields are not retaining the values.

## 0.4.1

### Fixed
- error removing the head of the house.

## 0.4.0

### Added
- glory field to character sheet
- a new function to dice rolls through macros, see the readme to more information.

### Changed
- update character sheet to Foundry V10
- dice roll that previously applied the dice penalty before the roll was made, instead of applying it when calculating how many dice are kept.
- shows a notification if the test resulting dice pool is less than 1.

### Fixed
- adding member to house sheet
- the system ignored all modifiers and penalties when the ability did not exist on the sheet.
- the system gave an error when rolls a specialty test that had no value on the sheet.

## 0.3.0

### Added

- Sorcery Techniques Sheet
- Character's Sorcery Tab
- Settings option to use ASoIaf Armor Penalty rules instead
- Ability's Specialties can be added to World's Abilities Item now 

### Changed
- little code refactoring to clarity

### Fixed
- Changes to Character's Height accept alphanumeric characters 

## 0.2.0

### Added

- House Sheet and your dependencies:
  - Holding Sheets
  - Event Sheets

### Changed

- Added an initially implemented localization to House Sheet and others sheets (not finished)
- Refactoring in the current code to make it more reusable.

### Fixes
 
- Fix a bug with the checkboxes of the settings screen 

## 0.1.5

### Fixes

- A small fix for a bug that occurred when adding a weapon without a correct damage formula for a character.

## 0.1.4

### Fixes

- Fixed a bug where the character sheet would not open.

## 0.1.3

### Changes

- Changes to Project Title, to adding the "Unofficial" text

## 0.1.2

### Fixes

- Fixes some bugs with character sheet fields: ancestries, age and gender

## 0.1.1

### Fixes

- Little fix to weapons, in which when adding a weapon with no specialty or damage (or with wrong formulas) the character sheet crashed.

## 0.1.0

### Added

- An initially functional character sheet.
- Functionals Item Sheets
  - Weapon Sheet
  - Armor Sheet
  - Basic Equipment Sheet
  - Ability Sheet
  - Benefit Sheet
  - Drawback Sheet