import {CSActor} from "./csActor.js";
import LOGGER from "../utils/logger.js";
import SystemUtils from "../utils/systemUtils.js";
import {ChronicleSystem} from "../system/ChronicleSystem.js";
import {CSConstants} from "../system/csConstants.js";

/**
 * House actor. Resource totals (starting value + historical event modifiers) are derived during data preparation.
 */
export class CSHouseActor extends CSActor {
    roleMap = {
        HEAD: "head",
        STEWARD: "steward",
        HEIR: "heirs",
        FAMILY: "family",
        RETAINER: "retainers",
        SERVANT: "servants"
    };

    static SINGLE_ROLES = ["HEAD", "STEWARD"];

    /** Starting resources are rolled on 7d6 each (SIFRP p. 99); realm modifiers are applied by hand. */
    static RESOURCE_FORMULA = "7d6";

    /** @override */
    prepareDerivedData() {
        super.prepareDerivedData();
        for (const resource of CSConstants.HouseResourceKeys) {
            const data = this.system[resource];
            if (!data) continue;
            data.startingValue = SystemUtils.int(data.startingValue);
            data.total = data.startingValue + this._getAllEventModifiers(resource);
        }
    }

    /* -------------------------------------------- */
    /*  Members                                     */
    /* -------------------------------------------- */

    _getRoleValue(role) {
        const key = this.roleMap[role];
        const value = this._source.system?.members?.[key];
        if (CSHouseActor.SINGLE_ROLES.includes(role)) return value && typeof value === "object" ? value : {};
        return SystemUtils.toArray(value);
    }

    characterHasRole(actorId, role) {
        const result = {hasRole: false, index: -1};
        if (CSHouseActor.SINGLE_ROLES.includes(role)) {
            result.hasRole = this._getRoleValue(role).id === actorId;
        } else if (this.roleMap[role]) {
            result.index = this._getRoleValue(role).findIndex((m) => m?.id === actorId);
            result.hasRole = result.index >= 0;
        }
        if (result.hasRole) LOGGER.debug(`actor ${actorId} is founded as ${role}`);
        return result;
    }

    /**
     * Build the update that removes a character from a role (no database call).
     * @returns {object|null}
     */
    _removalUpdate(role, actorId) {
        const key = `system.members.${this.roleMap[role]}`;
        if (CSHouseActor.SINGLE_ROLES.includes(role)) {
            return this._getRoleValue(role).id === actorId ? {[key]: ""} : null;
        }
        const list = this._getRoleValue(role);
        const index = list.findIndex((m) => m?.id === actorId);
        if (index < 0) return null;
        list.splice(index, 1);
        return {[key]: list};
    }

    async removeCharacterFromHouse(actorId, role = undefined, ignoreRoles = ["STEWARD"]) {
        const update = {};
        const roles = role ? [role] : Object.keys(this.roleMap).filter((r) => !ignoreRoles.includes(r));
        for (const r of roles) Object.assign(update, this._removalUpdate(r, actorId) ?? {});
        if (!foundry.utils.isEmpty(update)) await this.update(update);
    }

    async addCharacterToHouse(actorId, role, description) {
        if (!this.roleMap[role]) return;
        if (this.characterHasRole(actorId, role).hasRole) return;

        const update = {};
        // A character holds a single family/servant role at a time; stewardship can be combined with any role.
        if (role !== "STEWARD") {
            for (const r of Object.keys(this.roleMap)) {
                if (r === "STEWARD") continue;
                Object.assign(update, this._removalUpdate(r, actorId) ?? {});
            }
        }

        const key = `system.members.${this.roleMap[role]}`;
        if (CSHouseActor.SINGLE_ROLES.includes(role)) {
            if (role === "HEAD" && !description) description = SystemUtils.localize("CS.sheets.house.labels.head");
            update[key] = {id: actorId, description: description ?? ""};
        } else {
            const list = update[key] ?? this._getRoleValue(role);
            list.push({id: actorId, description: description ?? ""});
            update[key] = list;
        }
        await this.update(update);
    }

    getCharactersFromRole(role) {
        const membersData = this.system.members?.[role];
        if (Array.isArray(membersData) || (membersData && typeof membersData === "object" && !("id" in membersData))) {
            return SystemUtils.toArray(membersData).map((member) => {
                const actor = this._getCharacterDataById(member?.id);
                return {name: actor.name, age: actor.age, id: member?.id, description: member?.description};
            });
        }
        const actor = this._getCharacterDataById(membersData?.id);
        return {name: actor.name, age: actor.age, id: membersData?.id, description: membersData?.description};
    }

    _getCharacterDataById(id) {
        if (!id) return {name: SystemUtils.localize("CS.messages.nobodyHasBeenChosen"), age: ""};
        const actor = game.actors.get(id);
        if (!actor) return {name: SystemUtils.localize("CS.messages.actorDoesntExists"), age: ""};
        return {name: actor.name, age: actor.system.age};
    }

    /* -------------------------------------------- */
    /*  Resources                                   */
    /* -------------------------------------------- */

    /** Re-roll the starting value of every resource. */
    async regenerateAllStartingResources() {
        const update = {};
        for (const resource of CSConstants.HouseResourceKeys) {
            const roll = new Roll(CSHouseActor.RESOURCE_FORMULA);
            await roll.evaluate();
            update[`system.${resource}.startingValue`] = roll.total;
        }
        return this.update(update);
    }

    async changeResource(resourceId, startingValue, description) {
        if (!CSConstants.HouseResourceKeys.includes(resourceId)) return;
        return this.update({
            [`system.${resourceId}.startingValue`]: SystemUtils.int(startingValue),
            [`system.${resourceId}.description`]: description ?? ""
        });
    }

    _getAllEventModifiers(resource) {
        let modifier = 0;
        for (const item of this.items) {
            if (item.type !== "event") continue;
            modifier += SystemUtils.int(item.system.modifiers?.[resource]);
        }
        return modifier;
    }

    _lookupModifier(table, value) {
        let lastMod = 0;
        for (const mod of table) {
            if (value >= mod.min) lastMod = mod.mod;
        }
        return lastMod;
    }

    getPopulationModifier() {
        return this._lookupModifier(ChronicleSystem.populationModifiers, this.system.population.total);
    }

    getLawModifier() {
        return this._lookupModifier(ChronicleSystem.lawModifiers, this.system.law.total);
    }

    getHoldingsDice() {
        let dice = 0;
        for (const holding of this.items) {
            if (holding.type !== "holding") continue;
            const count = parseInt(String(holding.system.fortuneDice ?? "").split(/[dD]/)[0], 10);
            if (Number.isFinite(count)) dice += count;
        }
        return dice;
    }

    getHoldingsModifier() {
        let modifier = 0;
        for (const holding of this.items) {
            if (holding.type !== "holding") continue;
            modifier += SystemUtils.int(holding.system.fortuneModifier);
        }
        return modifier;
    }
}
