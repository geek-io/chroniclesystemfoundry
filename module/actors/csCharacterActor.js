import {ChronicleSystem} from "../system/ChronicleSystem.js";
import {CSActor} from "./csActor.js";
import SystemUtils from "../utils/systemUtils.js";
import LOGGER from "../utils/logger.js";
import {CSConstants} from "../system/csConstants.js";

/**
 * Character (and NPC) actor.
 *
 * Modifiers (flat bonuses/penalties to the test result) and penalties (dice removed from the test) are derived every
 * time the actor is prepared, from equipped gear and the current fatigue / injuries / wounds / frustration / stress.
 * Nothing about them is written back to the database, so there is no risk of every connected client issuing the same
 * update, and they can never drift out of sync with the items on the sheet.
 * @extends {CSActor}
 */
export class CSCharacterActor extends CSActor {
    /** @type {Record<string, {_id: string, source: string, mod: number}[]>} */
    modifiers = {};

    /** @type {Record<string, {_id: string, source: string, mod: number}[]>} */
    penalties = {};

    /**
     * A brand-new, empty character starts with every standard ability at rank 2 (from the Abilities compendium).
     * @override
     */
    async _preCreate(data, options, user) {
        const allowed = await super._preCreate(data, options, user);
        if (allowed === false) return false;
        if (this.type !== "character" || data.items?.length || this._source.items?.length || options.fromCompendium) return allowed;
        const pack = game.packs.get(`${CSConstants.SYSTEM_ID}.abilities`);
        if (!pack) return allowed;
        try {
            const abilities = (await pack.getDocuments()).map((doc) => {
                const item = doc.toObject();
                item._stats = {compendiumSource: doc.uuid};
                return item;
            });
            this.updateSource({items: abilities});
        } catch (err) {
            LOGGER.warn(`Could not add starting abilities: ${err.message}`);
        }
        return allowed;
    }

    /** @override */
    prepareDerivedData() {
        super.prepareDerivedData();
        this._prepareModifiersAndPenalties();
        this.calculateDerivedValues();
        this.calculateMovementData();
    }

    /* -------------------------------------------- */
    /*  Modifiers & penalties                       */
    /* -------------------------------------------- */

    _prepareModifiersAndPenalties() {
        const M = ChronicleSystem.modifiersConstants;
        const K = ChronicleSystem.keyConstants;
        const data = this.system;
        this.modifiers = {};
        this.penalties = {};

        // Gear
        for (const item of this.items) {
            const sys = item.system ?? {};
            if (item.type === "armor") {
                const bulk = SystemUtils.int(sys.bulk);
                if (bulk > 0) this._push(this.modifiers, M.BULK, item.id, item.name, bulk);
                if (SystemUtils.int(sys.equipped) > 0) {
                    const penalty = SystemUtils.int(sys.penalty);
                    this._push(this.modifiers, M.AGILITY, item.id, item.name, penalty);
                    this._push(this.modifiers, M.COMBAT_DEFENSE, item.id, item.name, penalty);
                    this._push(this.modifiers, M.DAMAGE_TAKEN, item.id, item.name, SystemUtils.int(sys.rating));
                }
            } else if (item.type === "weapon") {
                for (const quality of SystemUtils.toArray(sys.qualities)) {
                    if (String(quality?.name ?? "").toLowerCase() === M.BULK) {
                        this._push(this.modifiers, M.BULK, item.id, item.name, SystemUtils.int(quality.parameter));
                    }
                }
            }
        }

        // Conditions
        const fatigue = SystemUtils.int(data.derivedStats?.fatigue?.current);
        if (fatigue > 0) this._push(this.modifiers, M.ALL, K.FATIGUE, SystemUtils.localize(K.FATIGUE), -fatigue);

        const injuries = SystemUtils.toArray(data.injuries).length;
        if (injuries > 0) this._push(this.modifiers, M.ALL, K.INJURY, SystemUtils.localize(K.INJURY), -injuries);

        const wounds = SystemUtils.toArray(data.wounds).length;
        if (wounds > 0) this._push(this.penalties, M.ALL, K.WOUNDS, SystemUtils.localize(K.WOUNDS), wounds);

        const frustration = SystemUtils.int(data.derivedStats?.frustration?.current);
        if (frustration > 0) {
            this._push(this.penalties, M.DECEPTION, K.FRUSTRATION, SystemUtils.localize(K.FRUSTRATION), frustration);
            this._push(this.penalties, M.PERSUASION, K.FRUSTRATION, SystemUtils.localize(K.FRUSTRATION), frustration);
        }

        const stress = SystemUtils.int(data.currentStress);
        if (stress > 0) {
            for (const type of [M.AWARENESS, M.CUNNING, M.STATUS]) {
                this._push(this.penalties, type, K.STRESS, SystemUtils.localize(K.STRESS), stress);
            }
        }
    }

    _push(target, type, id, source, mod) {
        if (!mod) return;
        (target[type] ??= []).push({_id: id, source, mod});
    }

    _sum(collection, type, includeDetail, includeGlobal) {
        let total = 0;
        const detail = [];
        const lists = [collection[type] ?? []];
        if (includeGlobal && type !== ChronicleSystem.modifiersConstants.ALL) {
            lists.push(collection[ChronicleSystem.modifiersConstants.ALL] ?? []);
        }
        for (const list of lists) {
            for (const entry of list) {
                total += entry.mod;
                if (includeDetail) detail.push({docName: entry.source, mod: entry.mod});
            }
        }
        return {total, detail};
    }

    getModifier(type, includeDetail = false, includeModifierGlobal = false) {
        return this._sum(this.modifiers, String(type).toLowerCase(), includeDetail, includeModifierGlobal);
    }

    getPenalty(type, includeDetail = false, includeModifierGlobal = false) {
        return this._sum(this.penalties, String(type).toLowerCase(), includeDetail, includeModifierGlobal);
    }

    /** @deprecated Modifiers are derived automatically; kept so old macros do not throw. */
    updateTempModifiers() {}

    /** @deprecated Penalties are derived automatically; kept so old macros do not throw. */
    updateTempPenalties() {}

    /** @deprecated */
    saveModifiers() {}

    /** @deprecated */
    savePenalties() {}

    /* -------------------------------------------- */
    /*  Derived statistics                          */
    /* -------------------------------------------- */

    calculateDerivedValues() {
        const ds = this.system.derivedStats;
        const K = ChronicleSystem.keyConstants;
        const mod = (stat) => SystemUtils.int(stat.modifier);

        ds.intrigueDefense.value = this.calcIntrigueDefense();
        ds.intrigueDefense.total = ds.intrigueDefense.value + mod(ds.intrigueDefense);

        ds.composure.value = this.getAbilityValue(SystemUtils.localize(K.WILL)) * 3;
        ds.composure.total = ds.composure.value + mod(ds.composure);

        ds.combatDefense.value = this.calcCombatDefense();
        ds.combatDefense.total = ds.combatDefense.value + mod(ds.combatDefense);

        ds.health.value = this.getAbilityValue(SystemUtils.localize(K.ENDURANCE)) * 3;
        ds.health.total = ds.health.value + mod(ds.health);

        ds.frustration.value = this.getAbilityValue(SystemUtils.localize(K.WILL));
        ds.frustration.total = ds.frustration.value + mod(ds.frustration);

        ds.fatigue.value = this.getAbilityValue(SystemUtils.localize(K.ENDURANCE));
        ds.fatigue.total = ds.fatigue.value + mod(ds.fatigue);

        // Armor rating of the equipped armor, for convenience on the sheet and in macros.
        ds.armorRating.value = this.getModifier(ChronicleSystem.modifiersConstants.DAMAGE_TAKEN).total;
        ds.armorRating.total = ds.armorRating.value + mod(ds.armorRating);
    }

    calculateMovementData() {
        const movement = this.system.movement;
        const K = ChronicleSystem.keyConstants;
        movement.base = ChronicleSystem.defaultMovement;
        const runFormula = ChronicleSystem.getActorAbilityFormula(this, SystemUtils.localize(K.ATHLETICS), SystemUtils.localize(K.RUN));
        movement.runBonus = Math.floor(runFormula.bonusDice / 2);
        const bulkMod = this.getModifier(ChronicleSystem.modifiersConstants.BULK);
        movement.bulk = Math.floor(bulkMod.total / 2);
        movement.total = Math.max(movement.base + movement.runBonus - movement.bulk + SystemUtils.int(movement.modifier), 1);
        movement.sprintTotal = movement.total * SystemUtils.int(movement.sprintMultiplier, 4) - movement.bulk;
    }

    calcIntrigueDefense() {
        const K = ChronicleSystem.keyConstants;
        return this.getAbilityValue(SystemUtils.localize(K.AWARENESS)) +
            this.getAbilityValue(SystemUtils.localize(K.CUNNING)) +
            this.getAbilityValue(SystemUtils.localize(K.STATUS));
    }

    calcCombatDefense() {
        const K = ChronicleSystem.keyConstants;
        let value = this.getAbilityValue(SystemUtils.localize(K.AWARENESS)) +
            this.getAbilityValue(SystemUtils.localize(K.AGILITY)) +
            this.getAbilityValue(SystemUtils.localize(K.ATHLETICS));

        let asoiafStyle = false;
        try {
            asoiafStyle = game.settings.get(CSConstants.Settings.SYSTEM_NAME, CSConstants.Settings.ASOIAF_DEFENSE_STYLE);
        } catch (err) {
            asoiafStyle = false;
        }
        if (asoiafStyle) value += this.getModifier(ChronicleSystem.modifiersConstants.COMBAT_DEFENSE).total;
        return value;
    }

    /* -------------------------------------------- */
    /*  Abilities                                   */
    /* -------------------------------------------- */

    getAbilities() {
        return this.items.filter((item) => item.type === "ability");
    }

    getAbility(abilityName) {
        const name = String(abilityName ?? "").toLowerCase();
        const ability = this.items.find((item) => item.type === "ability" && item.name.toLowerCase() === name);
        return [ability, undefined];
    }

    getAbilityBySpecialty(abilityName, specialtyName) {
        const name = String(abilityName ?? "").toLowerCase();
        const spec = String(specialtyName ?? "").toLowerCase();
        let specialty;
        const ability = this.items.find((item) => {
            if (item.type !== "ability" || item.name.toLowerCase() !== name) return false;
            specialty = SystemUtils.toArray(item.system.specialties)
                .find((s) => String(s?.name ?? "").toLowerCase() === spec);
            return !!specialty;
        });
        return [ability, specialty];
    }

    getAbilityValue(abilityName) {
        const [ability] = this.getAbility(abilityName);
        return ability !== undefined ? SystemUtils.int(ability.system.rating, 2) : 2;
    }

    getMaxInjuries() {
        return this.getAbilityValue(SystemUtils.localize(ChronicleSystem.keyConstants.ENDURANCE));
    }

    getMaxWounds() {
        return this.getAbilityValue(SystemUtils.localize(ChronicleSystem.keyConstants.ENDURANCE));
    }

    /* -------------------------------------------- */
    /*  Condition tracks (used by the sheet)        */
    /* -------------------------------------------- */

    async setFrustration(value) {
        const v = Math.clamp(SystemUtils.int(value), 0, this.system.derivedStats.frustration.total);
        return this.update({"system.derivedStats.frustration.current": v});
    }

    async setFatigue(value) {
        const v = Math.clamp(SystemUtils.int(value), 0, this.system.derivedStats.fatigue.total);
        return this.update({"system.derivedStats.fatigue.current": v});
    }

    async setStress(value) {
        const v = Math.clamp(SystemUtils.int(value), 0, this.system.derivedStats.frustration.total);
        return this.update({"system.currentStress": v});
    }

    async addInjury(text = "") {
        const injuries = SystemUtils.toArray(this.system.injuries);
        if (injuries.length >= this.getMaxInjuries()) return null;
        injuries.push(text);
        return this.update({"system.injuries": injuries});
    }

    async removeInjury(index) {
        const injuries = SystemUtils.toArray(this.system.injuries);
        injuries.splice(index, 1);
        return this.update({"system.injuries": injuries});
    }

    async addWound(text = "") {
        const wounds = SystemUtils.toArray(this.system.wounds);
        if (wounds.length >= this.getMaxWounds()) return null;
        wounds.push(text);
        return this.update({"system.wounds": wounds});
    }

    async removeWound(index) {
        const wounds = SystemUtils.toArray(this.system.wounds);
        wounds.splice(index, 1);
        return this.update({"system.wounds": wounds});
    }

    /* -------------------------------------------- */
    /*  Equipment                                   */
    /* -------------------------------------------- */

    /**
     * Change what an item is equipped in, unequipping whatever else occupies the slot(s).
     * @param {Item} item
     * @param {number} hand   One of ChronicleSystem.equippedConstants (0 to unequip).
     */
    async setEquipped(item, hand) {
        const E = ChronicleSystem.equippedConstants;
        hand = SystemUtils.int(hand);
        const qualities = SystemUtils.toArray(item.system.qualities).map((q) => String(q?.name ?? "").toLowerCase());
        const isAdaptable = qualities.includes("adaptable");
        const isTwoHanded = qualities.includes("two-handed");
        const current = SystemUtils.int(item.system.equipped);
        const updates = [];
        const unequipSlots = (slots) => {
            for (const other of this.items) {
                if (other.id === item.id) continue;
                if (slots.includes(SystemUtils.int(other.system.equipped))) {
                    updates.push({_id: other.id, "system.equipped": E.IS_NOT_EQUIPPED});
                }
            }
        };

        let target = hand;
        if (hand === E.IS_NOT_EQUIPPED) {
            // Clicking the off hand of an adaptable weapon held in one hand switches it to both hands.
            if (isAdaptable && current !== E.BOTH_HANDS && current !== E.IS_NOT_EQUIPPED && item.type === "weapon") {
                unequipSlots([E.MAIN_HAND, E.OFFHAND, E.BOTH_HANDS]);
                target = E.BOTH_HANDS;
            }
        } else if (hand === E.WEARING) {
            unequipSlots([E.WEARING]);
        } else if (isTwoHanded) {
            unequipSlots([E.MAIN_HAND, E.OFFHAND, E.BOTH_HANDS]);
            target = E.BOTH_HANDS;
        } else {
            unequipSlots([hand, E.BOTH_HANDS]);
        }
        updates.push({_id: item.id, "system.equipped": target});
        LOGGER.trace(`setEquipped ${item.name} -> ${target} | csCharacterActor.js`);
        return this.updateEmbeddedDocuments("Item", updates);
    }
}
