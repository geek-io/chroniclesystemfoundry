/**
 * Chronicle System (Unofficial) — Foundry VTT entry point.
 */
import {preloadHandlebarsTemplates} from "./preloadTemplates.js";
import {registerCustomHelpers} from "./handlebarsHelpers.js";
import actorConstructor from "../actors/actorConstructor.js";
import itemConstructor from "../items/itemConstructor.js";
import registerSystemSettings from "./settings.js";
import {ChronicleSystem} from "./ChronicleSystem.js";
import {CSConstants} from "./csConstants.js";
import LOGGER from "../utils/logger.js";
import {CSCharacterActorSheet} from "../actors/sheets/csCharacterActorSheet.js";
import {CSHouseActorSheet} from "../actors/sheets/csHouseActorSheet.js";
import {CSItemSheet} from "../items/sheets/csItemSheet.js";
import {CSAbilityItemSheet} from "../items/sheets/csAbilityItemSheet.js";
import {CSEventItemSheet} from "../items/sheets/csEventItemSheet.js";
import {CSHoldingItemSheet} from "../items/sheets/csHoldingItemSheet.js";
import {CSTechniqueItemSheet} from "../items/sheets/cs-technique-item-sheet.js";
import {migrateData} from "../migrations/migration.js";
import {CsCombat} from "../combat/cs-combat.js";
import {CsCombatant} from "../combat/cs-combatant.js";
import {CSImporter} from "../importer/importer-app.js";
import * as Parsers from "../importer/parsers.js";

Hooks.once("init", async function () {
    LOGGER.log("Initializing Chronicle System");

    CONFIG.Combat.initiative = {formula: "1d20", decimals: 2};

    registerCustomHelpers();

    CONFIG.Actor.documentClass = actorConstructor;
    CONFIG.Item.documentClass = itemConstructor;
    CONFIG.Combat.documentClass = CsCombat;
    CONFIG.Combatant.documentClass = CsCombatant;

    // Labels for the "Create Actor/Item" dialogs.
    Object.assign(CONFIG.Actor.typeLabels ??= {}, {
        character: "TYPES.Actor.character",
        npc: "TYPES.Actor.npc",
        house: "TYPES.Actor.house"
    });

    // Sheets
    const {DocumentSheetConfig} = foundry.applications.apps;
    const sheetLabel = (key) => () => game.i18n.localize(key);

    DocumentSheetConfig.unregisterSheet(Actor, "core", foundry.appv1.sheets.ActorSheet);
    DocumentSheetConfig.registerSheet(Actor, CSConstants.SYSTEM_ID, CSCharacterActorSheet, {
        label: sheetLabel("CS.sheets.characterSheet"), types: ["character", "npc"], makeDefault: true
    });
    DocumentSheetConfig.registerSheet(Actor, CSConstants.SYSTEM_ID, CSHouseActorSheet, {
        label: sheetLabel("CS.sheets.houseSheet"), types: ["house"], makeDefault: true
    });

    DocumentSheetConfig.unregisterSheet(Item, "core", foundry.appv1.sheets.ItemSheet);
    DocumentSheetConfig.registerSheet(Item, CSConstants.SYSTEM_ID, CSItemSheet, {
        label: sheetLabel("CS.sheets.itemSheet"),
        types: ["armor", "weapon", "equipment", "benefit", "drawback", "poison"],
        makeDefault: true
    });
    DocumentSheetConfig.registerSheet(Item, CSConstants.SYSTEM_ID, CSAbilityItemSheet, {
        label: sheetLabel("CS.sheets.abilityItemSheet"), types: ["ability"], makeDefault: true
    });
    DocumentSheetConfig.registerSheet(Item, CSConstants.SYSTEM_ID, CSEventItemSheet, {
        label: sheetLabel("CS.sheets.eventItemSheet"), types: ["event"], makeDefault: true
    });
    DocumentSheetConfig.registerSheet(Item, CSConstants.SYSTEM_ID, CSHoldingItemSheet, {
        label: sheetLabel("CS.sheets.holdingItemSheet"), types: ["holding"], makeDefault: true
    });
    DocumentSheetConfig.registerSheet(Item, CSConstants.SYSTEM_ID, CSTechniqueItemSheet, {
        label: sheetLabel("CS.sheets.techniqueItemSheet"), types: ["technique"], makeDefault: true
    });

    registerSystemSettings();

    // Public API for macros and modules.
    game.chroniclesystem = {
        ChronicleSystem,
        importer: CSImporter,
        parsers: Parsers,
        openImporter: (options) => new CSImporter(options).render({force: true})
    };

    await preloadHandlebarsTemplates();
});

Hooks.once("ready", async () => {
    await migrateData();
});

// Importer button in the Actors and Items sidebar tabs.
Hooks.on("renderActorDirectory", (app, html) => addImporterButton(html));
Hooks.on("renderItemDirectory", (app, html) => addImporterButton(html));
Hooks.on("renderCompendiumDirectory", (app, html) => addImporterButton(html));

function addImporterButton(html) {
    if (!game.user.isGM && !game.user.can("ACTOR_CREATE")) return;
    const root = html instanceof HTMLElement ? html : html?.[0];
    const actions = root?.querySelector(".header-actions");
    if (!actions || actions.querySelector(".cs-open-importer")) return;
    const button = document.createElement("button");
    button.type = "button";
    button.classList.add("cs-open-importer");
    button.innerHTML = `<i class="fa-solid fa-file-import"></i> ${game.i18n.localize("CS.importer.open")}`;
    button.addEventListener("click", () => game.chroniclesystem.openImporter());
    actions.append(button);
}
