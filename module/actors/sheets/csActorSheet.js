import {ChronicleSystem} from "../../system/ChronicleSystem.js";
import {applySheetTheme, toggleSheetTheme, mergeArrayFormData} from "../../utils/sheetUtils.js";
import SystemUtils from "../../utils/systemUtils.js";

const {HandlebarsApplicationMixin} = foundry.applications.api;
const {ActorSheetV2} = foundry.applications.sheets;

/**
 * Shared behaviour for Chronicle System actor sheets (ApplicationV2).
 */
export class CSActorSheet extends HandlebarsApplicationMixin(ActorSheetV2) {
    /** Item types this sheet accepts by drag & drop. Overridden by subclasses. */
    static ITEM_TYPES = null;

    /** Array-valued system fields edited through indexed inputs (system.wounds.0, ...). */
    static ARRAY_FIELDS = [];

    static DEFAULT_OPTIONS = {
        classes: ["chroniclesystem", "sheet", "actor"],
        form: {submitOnChange: true},
        window: {
            resizable: true,
            controls: [{
                action: "toggleTheme",
                icon: "fa-solid fa-circle-half-stroke",
                label: "CS.sheets.toggleTheme"
            }]
        },
        actions: {
            roll: CSActorSheet.#onRoll,
            editItem: CSActorSheet.#onEditItem,
            deleteItem: CSActorSheet.#onDeleteItem,
            toggleDescription: CSActorSheet.#onToggleDescription,
            openActor: CSActorSheet.#onOpenActor,
            toggleTheme: CSActorSheet.#onToggleTheme
        }
    };

    /* -------------------------------------------- */
    /*  Rendering                                   */
    /* -------------------------------------------- */

    /** @inheritDoc */
    async _prepareContext(options) {
        const context = await super._prepareContext(options);
        const actor = this.actor;
        context.actor = actor;
        context.system = actor.system;
        context.owner = actor.isOwner;
        context.cssClass = this.isEditable ? "editable" : "locked";
        context.itemsByType = {};
        for (const item of actor.items) (context.itemsByType[item.type] ??= []).push(item);
        for (const list of Object.values(context.itemsByType)) list.sort((a, b) => (a.sort - b.sort) || a.name.localeCompare(b.name));
        return context;
    }

    /**
     * Build a plain view-model of an embedded item with its description enriched.
     * @param {Item} item
     * @param {object} [extra]
     */
    async _itemView(item, extra = {}) {
        return {
            _id: item.id,
            id: item.id,
            uuid: item.uuid,
            name: item.name,
            img: item.img,
            type: item.type,
            system: item.system,
            enrichedDescription: await SystemUtils.enrich(item.system.description, {relativeTo: item, secrets: this.actor.isOwner}),
            ...extra
        };
    }

    /** @inheritDoc */
    async _onRender(context, options) {
        await super._onRender(context, options);
        applySheetTheme(this);
    }

    /* -------------------------------------------- */
    /*  Form handling                               */
    /* -------------------------------------------- */

    /** @inheritDoc */
    _processFormData(event, form, formData) {
        const data = super._processFormData(event, form, formData);
        mergeArrayFormData(data, this.actor._source, this.constructor.ARRAY_FIELDS);
        return data;
    }

    /* -------------------------------------------- */
    /*  Drag & drop                                 */
    /* -------------------------------------------- */

    isItemPermitted(type) {
        const allowed = this.constructor.ITEM_TYPES;
        return !allowed || allowed.includes(type);
    }

    /** @inheritDoc */
    async _onDropItem(event, item) {
        if (!this.actor.isOwner) return null;
        if (this.actor.uuid === item.parent?.uuid) return super._onDropItem(event, item);
        if (!this.isItemPermitted(item.type)) {
            ui.notifications.warn(game.i18n.format("CS.notifications.itemTypeNotAllowed", {
                type: game.i18n.localize(CONFIG.Item.typeLabels?.[item.type] ?? item.type)
            }));
            return null;
        }
        // Abilities, qualities etc. are unique by name; weapons and gear may be carried more than once.
        const stackable = ["weapon", "armor", "equipment", "poison"];
        if (!stackable.includes(item.type)) {
            const existing = this.actor.items.find((i) => i.type === item.type && i.name === item.name);
            if (existing) return existing;
        }
        return this._createDroppedItem(event, item);
    }

    async _createDroppedItem(event, item) {
        const data = item.toObject();
        delete data._id;
        const [created] = await this.actor.createEmbeddedDocuments("Item", [data]);
        return created ?? null;
    }

    /* -------------------------------------------- */
    /*  Actions                                     */
    /* -------------------------------------------- */

    _getItemFromTarget(target) {
        const id = target.closest("[data-item-id]")?.dataset.itemId;
        return id ? this.actor.items.get(id) : null;
    }

    static async #onRoll(event, target) {
        return ChronicleSystem.eventHandleRoll(event, this.actor, target);
    }

    static #onEditItem(event, target) {
        event.preventDefault();
        this._getItemFromTarget(target)?.sheet.render({force: true});
    }

    static async #onDeleteItem(event, target) {
        event.preventDefault();
        const item = this._getItemFromTarget(target);
        if (!item) return;
        const confirmed = await foundry.applications.api.DialogV2.confirm({
            window: {title: game.i18n.format("CS.dialogs.deleteItem.title", {name: item.name})},
            content: `<p>${game.i18n.format("CS.dialogs.deleteItem.content", {name: item.name})}</p>`
        });
        if (confirmed) await item.delete();
    }

    static #onToggleDescription(event, target) {
        event.preventDefault();
        const container = target.closest(".item");
        container?.querySelector(".description")?.classList.toggle("hidden");
    }

    static #onOpenActor(event, target) {
        event.preventDefault();
        const actor = game.actors.get(target.dataset.id);
        actor?.sheet.render({force: true});
    }

    static async #onToggleTheme() {
        await toggleSheetTheme();
    }
}
