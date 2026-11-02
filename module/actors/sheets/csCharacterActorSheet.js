import {ChronicleSystem} from "../../system/ChronicleSystem.js";
import {Technique} from "../../technique.js";
import {CSActorSheet} from "./csActorSheet.js";
import LOGGER from "../../utils/logger.js";
import SystemUtils from "../../utils/systemUtils.js";
import {CSConstants} from "../../system/csConstants.js";

const TEMPLATE_PATH = "systems/chroniclesystem/templates/actors";

/**
 * Character and NPC sheet.
 */
export class CSCharacterActorSheet extends CSActorSheet {
    static ITEM_TYPES = CSConstants.ItemTypesForCharacters;

    static ARRAY_FIELDS = ["wounds", "injuries"];

    static DEFAULT_OPTIONS = {
        classes: ["character"],
        position: {width: 760, height: 900},
        actions: {
            setDisposition: CSCharacterActorSheet.#onSetDisposition,
            equip: CSCharacterActorSheet.#onEquip,
            setTrack: CSCharacterActorSheet.#onSetTrack,
            addInjury: CSCharacterActorSheet.#onAddInjury,
            deleteInjury: CSCharacterActorSheet.#onDeleteInjury,
            addWound: CSCharacterActorSheet.#onAddWound,
            deleteWound: CSCharacterActorSheet.#onDeleteWound
        }
    };

    static PARTS = {
        header: {template: `${TEMPLATE_PATH}/characters/character-header.hbs`},
        tabs: {template: `${TEMPLATE_PATH}/partials/sheet-tabs.hbs`},
        abilities: {template: `${TEMPLATE_PATH}/partials/tabs/abilities-tab.hbs`, scrollable: [""]},
        combat: {template: `${TEMPLATE_PATH}/partials/tabs/combat-and-intrigue-tab.hbs`, scrollable: [""]},
        qualities: {template: `${TEMPLATE_PATH}/partials/tabs/qualities-tab.hbs`, scrollable: [""]},
        sorcery: {template: `${TEMPLATE_PATH}/partials/tabs/sorcery-tab.hbs`, scrollable: [""]},
        equipments: {template: `${TEMPLATE_PATH}/partials/tabs/equipments-tab.hbs`, scrollable: [""]},
        description: {template: `${TEMPLATE_PATH}/partials/tabs/description-tab.hbs`, scrollable: [""]}
    };

    static TABS = {
        primary: {
            tabs: [
                {id: "abilities", label: "CS.sheets.character.tabs.abilities"},
                {id: "combat-and-intrigue", label: "CS.sheets.character.tabs.combat-intrigue"},
                {id: "qualities", label: "CS.sheets.character.tabs.qualities"},
                {id: "sorcery", label: "CS.sheets.character.tabs.sorcery"},
                {id: "equipments", label: "CS.sheets.character.tabs.equipments"},
                {id: "actor-description", label: "CS.sheets.character.tabs.description"}
            ],
            initial: "abilities"
        }
    };

    /** @inheritDoc */
    async _prepareContext(options) {
        const context = await super._prepareContext(options);
        const actor = this.actor;
        const byType = context.itemsByType;
        const byName = (a, b) => a.name.localeCompare(b.name);
        const views = async (type, extra = () => ({})) => Promise.all((byType[type] ?? []).map((i) => this._itemView(i, extra(i))));

        context.character = actor.system;
        context.isNPC = actor.type === "npc";
        context.npcKinds = CSConstants.NpcKinds;

        const owned = {
            abilities: (await views("ability")).sort(byName),
            benefits: await views("benefit"),
            drawbacks: await views("drawback"),
            equipments: await views("equipment"),
            armors: await views("armor"),
            poisons: await views("poison"),
            weapons: await views("weapon", (weapon) => {
                const [ability, specialty] = String(weapon.system.specialty ?? "").split(":");
                let formula = null;
                if (ability && specialty) {
                    formula = ChronicleSystem.getActorAbilityFormula(actor, ability, specialty);
                    formula = ChronicleSystem.adjustFormulaByWeapon(actor, formula, weapon);
                }
                return {formula, damageValue: weapon.calculateDamage(actor), qualityList: weapon.qualities};
            }),
            techniques: (await views("technique")).sort(byName)
        };
        for (const ability of owned.abilities) ability.specialtyList = SystemUtils.toArray(ability.system.specialties);
        for (const armor of owned.armors) armor.qualityList = SystemUtils.toArray(armor.system.qualities);

        // Sorcery works
        for (const technique of owned.techniques) {
            technique.works = await Promise.all(SystemUtils.toArray(technique.system.works).map(async (work) => {
                const view = foundry.utils.deepClone(work ?? {});
                view.test ??= {};
                if (view.type === "SPELL") {
                    view.test.spellcastingFormula = ChronicleSystem.getActorAbilityFormula(actor, view.test.spellcasting, null);
                } else {
                    view.test.alignmentFormula = ChronicleSystem.getActorAbilityFormula(actor, view.test.alignment, null);
                    view.test.invocationFormula = ChronicleSystem.getActorAbilityFormula(actor, view.test.invocation, null);
                    view.test.unleashingFormula = ChronicleSystem.getActorAbilityFormula(actor, view.test.unleashing, null);
                }
                view.enrichedDescription = await SystemUtils.enrich(view.description, {relativeTo: actor});
                return view;
            }));
        }
        context.owned = owned;

        context.dispositions = ChronicleSystem.dispositions;
        context.notEquipped = ChronicleSystem.equippedConstants.IS_NOT_EQUIPPED;
        context.techniquesTypes = CSConstants.TechniqueType;
        context.techniquesCosts = CSConstants.TechniqueCost;
        context.techniques = this._calculateIntrigueTechniques(actor);

        context.injuries = SystemUtils.toArray(actor.system.injuries);
        context.wounds = SystemUtils.toArray(actor.system.wounds);
        context.currentInjuries = context.injuries.length;
        context.currentWounds = context.wounds.length;
        context.maxInjuries = actor.getMaxInjuries();
        context.maxWounds = actor.getMaxWounds();

        const enrich = (field) => SystemUtils.enrich(actor.system[field], {relativeTo: actor, secrets: actor.isOwner});
        context.enriched = {
            personalHistory: await enrich("personalHistory"),
            allies: await enrich("allies"),
            enemies: await enrich("enemies"),
            oaths: await enrich("oaths"),
            motto: await enrich("motto"),
            npcNotes: await enrich("npcNotes")
        };
        return context;
    }

    _calculateIntrigueTechniques(actor) {
        const K = ChronicleSystem.keyConstants;
        const L = (key) => SystemUtils.localize(key);
        const value = (key) => actor.getAbilityValue(L(key));
        const formula = (ability, specialty) => ChronicleSystem.getActorAbilityFormula(actor, L(ability), L(specialty));

        const cunningValue = value(K.CUNNING);
        const willValue = value(K.WILL);
        const persuasionValue = value(K.PERSUASION);
        const awarenessValue = value(K.AWARENESS);

        const bluffFormula = formula(K.DECEPTION, K.BLUFF);
        const actFormula = formula(K.DECEPTION, K.ACT);
        const intimidateDeceptionFormula = actFormula.bonusDice + actFormula.modifier > bluffFormula.bonusDice + bluffFormula.modifier ? actFormula : bluffFormula;

        return {
            bargain: new Technique(L(K.BARGAIN), cunningValue, formula(K.PERSUASION, K.BARGAIN), bluffFormula),
            charm: new Technique(L(K.CHARM), persuasionValue, formula(K.PERSUASION, K.CHARM), actFormula),
            convince: new Technique(L(K.CONVINCE), willValue, formula(K.PERSUASION, K.CONVINCE), actFormula),
            incite: new Technique(L(K.INCITE), cunningValue, formula(K.PERSUASION, K.INCITE), bluffFormula),
            intimidate: new Technique(L(K.INTIMIDATE), willValue, formula(K.PERSUASION, K.INTIMIDATE), intimidateDeceptionFormula),
            seduce: new Technique(L(K.SEDUCE), persuasionValue, formula(K.PERSUASION, K.SEDUCE), bluffFormula),
            taunt: new Technique(L(K.TAUNT), awarenessValue, formula(K.PERSUASION, K.TAUNT), bluffFormula)
        };
    }

    /* -------------------------------------------- */
    /*  Actions                                     */
    /* -------------------------------------------- */

    static async #onSetDisposition(event, target) {
        event.preventDefault();
        const rating = parseInt(target.dataset.id, 10);
        if (!ChronicleSystem.dispositions.find((d) => d.rating === rating)) {
            LOGGER.warn("the informed disposition does not exist.");
            return;
        }
        await this.actor.update({"system.currentDisposition": rating});
    }

    static async #onEquip(event, target) {
        event.preventDefault();
        const item = this.actor.items.get(target.dataset.itemId);
        if (item) await this.actor.setEquipped(item, target.dataset.hand);
    }

    static async #onSetTrack(event, target) {
        event.preventDefault();
        const value = target.dataset.value;
        switch (target.dataset.type) {
            case "Frustration": return this.actor.setFrustration(value);
            case "Fatigue": return this.actor.setFatigue(value);
            case "Stress": return this.actor.setStress(value);
        }
    }

    static async #onAddInjury(event) {
        event.preventDefault();
        await this.actor.addInjury();
    }

    static async #onDeleteInjury(event, target) {
        event.preventDefault();
        await this.actor.removeInjury(parseInt(target.dataset.id, 10));
    }

    static async #onAddWound(event) {
        event.preventDefault();
        await this.actor.addWound();
    }

    static async #onDeleteWound(event, target) {
        event.preventDefault();
        await this.actor.removeWound(parseInt(target.dataset.id, 10));
    }
}
