import {ChronicleSystem} from "../system/ChronicleSystem.js";

export class CsCombatant extends Combatant {
    /**
     * @param {string} [formula]  A Chronicle roll definition such as "specialty:quickness:agility".
     * @returns {Promise<Roll|null>}  An already evaluated roll.
     */
    getInitiativeRoll(formula) {
        formula = formula || "specialty:quickness:agility";
        return ChronicleSystem.handleRoll(formula, this.actor);
    }

    /**
     * Route single-combatant initiative through the combat's conflict-type dialog.
     * @override
     */
    async rollInitiative(formula) {
        return this.combat?.rollInitiative([this.id], {formula});
    }
}
