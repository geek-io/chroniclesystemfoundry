import {CSActorSheet} from "./csActorSheet.js";
import {CSConstants} from "../../system/csConstants.js";
import SystemUtils from "../../utils/systemUtils.js";
import LOGGER from "../../utils/logger.js";
import {ChronicleSystem} from "../../system/ChronicleSystem.js";

const TEMPLATE_PATH = "systems/chroniclesystem/templates/actors";
const {DialogV2} = foundry.applications.api;
const FormDataExtended = () => foundry.applications.ux.FormDataExtended;

/**
 * House sheet.
 */
export class CSHouseActorSheet extends CSActorSheet {
    static ITEM_TYPES = CSConstants.ItemTypesForHouses;

    static DEFAULT_OPTIONS = {
        classes: ["house"],
        position: {width: 860, height: 680},
        actions: {
            removeMember: CSHouseActorSheet.#onRemoveMember,
            editResource: CSHouseActorSheet.#onEditResource,
            regenerateResources: CSHouseActorSheet.#onRegenerateResources
        }
    };

    static PARTS = {
        header: {template: `${TEMPLATE_PATH}/houses/house-header.hbs`},
        tabs: {template: `${TEMPLATE_PATH}/partials/sheet-tabs.hbs`},
        resources: {template: `${TEMPLATE_PATH}/partials/tabs/resources-tab.hbs`, scrollable: [""]},
        events: {template: `${TEMPLATE_PATH}/partials/tabs/events-tab.hbs`, scrollable: [""]},
        members: {template: `${TEMPLATE_PATH}/partials/tabs/members-tab.hbs`, scrollable: [""]},
        holdings: {template: `${TEMPLATE_PATH}/partials/tabs/holdings-tab.hbs`, scrollable: [""]}
    };

    static TABS = {
        primary: {
            tabs: [
                {id: "resources", label: "CS.sheets.house.resources.title"},
                {id: "events", label: "CS.sheets.house.events.title"},
                {id: "members", label: "CS.sheets.house.labels.members"},
                {id: "holdings", label: "CS.sheets.house.holdings.title"}
            ],
            initial: "resources"
        }
    };

    /** @inheritDoc */
    async _prepareContext(options) {
        const context = await super._prepareContext(options);
        const actor = this.actor;
        const house = foundry.utils.deepClone(actor.system);

        house.historicalEvents = await Promise.all((context.itemsByType.event ?? []).map((i) => this._itemView(i)));
        await this._prepareHoldingData(house, context);
        this._prepareRolesData(house);
        this._prepareFortuneData(house);

        context.house = house;
        return context;
    }

    _prepareRolesData(house) {
        const actor = this.actor;
        const map = actor.roleMap;
        house.head = actor.getCharactersFromRole(map.HEAD);
        house.steward = actor.getCharactersFromRole(map.STEWARD);
        house.heirs = actor.getCharactersFromRole(map.HEIR);
        house.family = actor.getCharactersFromRole(map.FAMILY);
        house.retainers = actor.getCharactersFromRole(map.RETAINER);
        house.servants = actor.getCharactersFromRole(map.SERVANT);
    }

    _prepareFortuneData(house) {
        if (!house.steward?.id) return;
        const actor = this.actor;
        const fortune = {
            lawMod: actor.getLawModifier(),
            populationMod: actor.getPopulationModifier(),
            holdingsDice: actor.getHoldingsDice(),
            holdingsFlat: actor.getHoldingsModifier()
        };
        const parts = [];
        if (fortune.holdingsDice) parts.push(`${fortune.holdingsDice}d6`);
        if (fortune.holdingsFlat) {
            if (parts.length) parts.push(fortune.holdingsFlat > 0 ? `+ ${fortune.holdingsFlat}` : `- ${-fortune.holdingsFlat}`);
            else parts.push(String(fortune.holdingsFlat));
        }
        fortune.holdingsMod = parts.join(" ");

        const steward = game.actors.get(house.steward.id);
        const formula = ChronicleSystem.getActorAbilityFormula(
            steward,
            SystemUtils.localize(ChronicleSystem.keyConstants.STATUS),
            SystemUtils.localize(ChronicleSystem.keyConstants.STEWARDSHIP)
        );
        formula.pool += fortune.holdingsDice;
        formula.modifier = formula.modifier + fortune.lawMod + fortune.populationMod + fortune.holdingsFlat;
        fortune.formula = formula;
        house.fortune = fortune;
    }

    async _prepareHoldingData(house, context) {
        house.holdings = Object.fromEntries(CSConstants.HouseResourceKeys.map((k) => [k, []]));
        for (const key of CSConstants.HouseResourceKeys) {
            house[key].invested = 0;
            house[key].hasHoldings = false;
        }
        for (const holding of context.itemsByType.holding ?? []) {
            const resource = holding.system.resource;
            if (!house.holdings[resource]) continue;
            const view = await this._itemView(holding, {featureList: SystemUtils.toArray(holding.system.features)});
            house.holdings[resource].push(view);
            house[resource].invested += holding.getTotalInvested();
            house[resource].hasHoldings = true;
        }
    }

    /* -------------------------------------------- */
    /*  Actions                                     */
    /* -------------------------------------------- */

    static async #onRemoveMember(event, target) {
        event.preventDefault();
        await this.actor.removeCharacterFromHouse(target.dataset.id, target.dataset.role);
    }

    static async #onRegenerateResources(event) {
        event.preventDefault();
        await this.actor.regenerateAllStartingResources();
    }

    static async #onEditResource(event, target) {
        event.preventDefault();
        const resourceId = target.dataset.id;
        const resourceName = target.dataset.name;
        if (!resourceId || !resourceName) return;
        const data = this.actor.system[resourceId];
        const content = await SystemUtils.renderTemplate(CSConstants.Templates.Dialogs.HOUSE_RESOURCE_EDITOR, {
            startingValue: data.startingValue,
            description: data.description,
            resourceId
        });
        const result = await DialogV2.wait({
            window: {title: SystemUtils.format("CS.dialogs.houseResourceEditor.title", {resourceName})},
            classes: ["chroniclesystem", "cs-dialog"],
            content,
            buttons: [
                {
                    action: "save",
                    label: "CS.dialogs.actions.save",
                    default: true,
                    callback: (ev, button) => new (FormDataExtended())(button.form).object
                },
                {action: "cancel", label: "CS.dialogs.actions.cancel"}
            ]
        });
        if (result && typeof result === "object") {
            await this.actor.changeResource(resourceId, result.startingValue, result.description);
        }
    }

    /* -------------------------------------------- */
    /*  Drag & drop                                 */
    /* -------------------------------------------- */

    /** @inheritDoc */
    async _onDropActor(event, actor) {
        LOGGER.trace("On Drop Actor | CSHouseActorSheet");
        if (!this.actor.isOwner || !actor || !["character", "npc"].includes(actor.type)) return null;
        const content = await SystemUtils.renderTemplate(CSConstants.Templates.Dialogs.CHARACTER_ROLE_IN_HOUSE, {
            choices: CSConstants.HouseRoles,
            value: "HEAD",
            id: actor.id,
            description: ""
        });
        const result = await DialogV2.wait({
            window: {title: SystemUtils.format("CS.dialogs.characterRole.title", {actorName: actor.name})},
            classes: ["chroniclesystem", "cs-dialog"],
            content,
            buttons: [
                {
                    action: "save",
                    label: "CS.dialogs.actions.save",
                    default: true,
                    callback: (ev, button) => new (FormDataExtended())(button.form).object
                },
                {action: "cancel", label: "CS.dialogs.actions.cancel"}
            ]
        });
        if (result && typeof result === "object") {
            await this.actor.addCharacterToHouse(actor.id, result.characterRole, result.description);
            return actor;
        }
        return null;
    }

    /** @inheritDoc */
    async _createDroppedItem(event, item) {
        if (item.type !== "event") return super._createDroppedItem(event, item);

        const content = await SystemUtils.renderTemplate(CSConstants.Templates.Dialogs.ADDING_HOUSE_EVENT, {
            event: item,
            choices: CSConstants.HouseResources,
            id: item.id
        });
        const result = await DialogV2.wait({
            window: {title: "CS.dialogs.addingHouseEvent.title"},
            classes: ["chroniclesystem", "cs-dialog"],
            content,
            buttons: [
                {
                    action: "save",
                    label: "CS.dialogs.actions.save",
                    default: true,
                    callback: (ev, button) => new (FormDataExtended())(button.form).object
                },
                {action: "cancel", label: "CS.dialogs.actions.cancel"}
            ]
        });
        if (!result || typeof result !== "object") return null;

        const created = await super._createDroppedItem(event, item);
        if (created && result.generateModifiers) {
            const choices = [];
            for (let i = 1; i <= SystemUtils.int(item.system.numberOfChoices); i++) {
                const choice = result[`resource_${i}`];
                if (choice) choices.push(choice);
            }
            // Choices come back as the CSConstants.HouseResources keys ("DEFENSE"...).
            await created.generateModifiers(choices.map((c) => String(c).toLowerCase()));
        }
        return created;
    }
}
