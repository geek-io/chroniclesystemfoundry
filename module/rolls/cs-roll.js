import SystemUtils from "../utils/systemUtils.js";

/**
 * A Chronicle System test: roll (test dice + bonus dice) d6, optionally re-roll ones, keep the best
 * (test dice - penalty dice) and add modifiers.
 */
export class CSRoll {
    constructor(title, formula) {
        this.formula = formula;
        this.title = title;
        this.results = [];
    }

    /**
     * Evaluate the test and optionally post it to chat.
     * @param {Actor} actor
     * @param {boolean} [toChat=true]   Post the result as a chat message.
     * @returns {Promise<Roll|null>}
     */
    async doRoll(actor, toChat = true) {
        if (this.formula.keptDice <= 0) {
            ui.notifications.info(SystemUtils.localize("CS.notifications.dicePoolInvalid"));
            return null;
        }
        const roll = new Roll(this.formula.toRollFormula());
        await roll.evaluate();
        this.results = roll.dice[0]?.results ?? [];

        if (toChat) {
            const messageId = this.formula.isUserChanged ? "CS.chatMessages.customRoll" : "CS.chatMessages.simpleRoll";
            const flavor = SystemUtils.format(messageId, {name: actor?.name ?? "", test: this.title});
            await roll.toMessage({
                speaker: ChatMessage.getSpeaker({actor}),
                flavor
            });
        }
        return roll;
    }
}
