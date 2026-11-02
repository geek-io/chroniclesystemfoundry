import {CSItem} from "./csItem.js";
import LOGGER from "../utils/logger.js";
import {CSConstants} from "../system/csConstants.js";

export class CSEventItem extends CSItem {
    /**
     * Roll the modifier formulas of a historical event and store the results.
     * @param {string[]} choices   Resources chosen by the player (for "player choice" events).
     */
    async generateModifiers(choices = []) {
        LOGGER.trace("generate historical event modifiers | CSEventItem.js");
        const data = this.system;
        const modifiers = foundry.utils.deepClone(data.modifiers ?? {});
        const resources = data.playerChoice ? choices.map((c) => String(c).toLowerCase()) : CSConstants.HouseResourceKeys;

        for (const resource of resources) {
            const formula = data.playerChoice ? data.bonusToChoices : data.formulas?.[resource];
            if (!formula) continue;
            try {
                const roll = new Roll(String(formula));
                await roll.evaluate();
                // Player choices may pick the same resource twice; those stack.
                modifiers[resource] = (data.playerChoice ? (modifiers[resource] ?? 0) : 0) + roll.total;
            } catch (err) {
                LOGGER.warn(`Invalid formula "${formula}" on event ${this.name}`);
            }
        }
        return this.update({"system.modifiers": modifiers});
    }
}
