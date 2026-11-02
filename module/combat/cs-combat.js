import {CSConstants} from "../system/csConstants.js";
import SystemUtils from "../utils/systemUtils.js";

/**
 * Combat with Chronicle System initiative: the GM/player picks the conflict type (combat, intrigue, warfare) and each
 * combatant rolls the matching test.
 */
export class CsCombat extends Combat {
    /** @override */
    async rollInitiative(ids, {formula = null, updateTurn = true, messageOptions = {}} = {}) {
        ids = typeof ids === "string" ? [ids] : ids;
        const currentId = this.combatant?.id;

        const choice = await this._showInitiativeSelector();
        if (!choice || choice.cancelled) return this;
        formula = CSConstants.InitiativeTypeRolls[choice.type];
        const type = SystemUtils.localize(CSConstants.InitiativeTypes[choice.type]);

        const updates = [];
        const messages = [];
        for (const [i, id] of ids.entries()) {
            const combatant = this.combatants.get(id);
            if (!combatant?.isOwner) continue;

            const roll = await combatant.getInitiativeRoll(formula);
            if (!roll) continue;
            updates.push({_id: id, initiative: roll.total});

            const messageData = foundry.utils.mergeObject({
                speaker: ChatMessage.getSpeaker({actor: combatant.actor, token: combatant.token, alias: combatant.name}),
                flavor: game.i18n.format("CS.chatMessages.initiativeRolls", {name: combatant.name, type}),
                flags: {"core.initiativeRoll": true}
            }, messageOptions);
            const rollMode = messageOptions.rollMode ?? (combatant.hidden ? CONST.DICE_ROLL_MODES.PRIVATE : undefined);
            const chatData = await roll.toMessage(messageData, {create: false, rollMode});
            if (i > 0) chatData.sound = null;
            messages.push(chatData);
        }
        if (!updates.length) return this;

        await this.updateEmbeddedDocuments("Combatant", updates);
        if (updateTurn && currentId) await this.update({turn: this.turns.findIndex((t) => t.id === currentId)});
        await ChatMessage.implementation.create(messages);
        return this;
    }

    async _showInitiativeSelector() {
        const content = await SystemUtils.renderTemplate(CSConstants.Templates.Dialogs.INITIATIVE_SELECTOR, {
            choices: CSConstants.InitiativeTypes,
            value: "COMBAT"
        });
        const result = await foundry.applications.api.DialogV2.wait({
            window: {title: "CS.dialogs.initiativeSelector.title"},
            classes: ["chroniclesystem", "cs-dialog"],
            content,
            buttons: [
                {
                    action: "normal",
                    label: "CS.dialogs.actions.confirm",
                    default: true,
                    callback: (event, button) => ({type: button.form.elements.initiativeType.value})
                },
                {action: "cancel", label: "CS.dialogs.actions.cancel", callback: () => ({cancelled: true})}
            ]
        });
        return result ?? {cancelled: true};
    }
}
