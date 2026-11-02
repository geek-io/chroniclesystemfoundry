import {CSItem} from "./csItem.js";
import {ChronicleSystem} from "../system/ChronicleSystem.js";

export class CSWeaponItem extends CSItem {
    /**
     * Resolve the damage expression ("@Athletics+1", "@Fighting-2", "@Agility") against an actor.
     * @param {Actor} actor
     * @returns {number|string}
     */
    calculateDamage(actor) {
        const expression = String(this.system.damage ?? "").trim();
        const match = expression.match(/^@([a-zA-Z\s]+?)\s*([-+*/])?\s*(\d+)?$/);
        if (!match) return expression;
        const ability = actor?.getAbilityValue?.(match[1].trim()) ?? 2;
        const operand = parseInt(match[3] ?? "0", 10);
        let value;
        switch (match[2]) {
            case "+": value = ability + operand; break;
            case "-": value = ability - operand; break;
            case "*": value = ability * (operand || 1); break;
            case "/": value = Math.floor(ability / (operand || 1)); break;
            default: value = ability;
        }
        if (this.hasQuality("adaptable") && Number(this.system.equipped) === ChronicleSystem.equippedConstants.BOTH_HANDS) value += 1;
        return value;
    }

    /** @deprecated use calculateDamage */
    updateDamageValue(actor) {
        this.damageValue = this.calculateDamage(actor);
    }
}
