import {applySheetTheme, toggleSheetTheme, mergeArrayFormData} from "../../utils/sheetUtils.js";
import SystemUtils from "../../utils/systemUtils.js";
import {CSConstants} from "../../system/csConstants.js";

const {HandlebarsApplicationMixin} = foundry.applications.api;
const {ItemSheetV2} = foundry.applications.sheets;

/**
 * Base Chronicle System item sheet (ApplicationV2). The template is picked from the item type.
 */
export class CSItemSheet extends HandlebarsApplicationMixin(ItemSheetV2) {
    static ARRAY_FIELDS = ["qualities", "specialties", "features", "arts", "works", "benefitList", "workList"];

    static DEFAULT_OPTIONS = {
        classes: ["chroniclesystem", "sheet", "item"],
        position: {width: 680, height: 580},
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
            deleteItem: CSItemSheet.#onDeleteItem,
            addListEntry: CSItemSheet.#onAddListEntry,
            deleteListEntry: CSItemSheet.#onDeleteListEntry,
            toggleTheme: CSItemSheet.#onToggleTheme
        }
    };

    static PARTS = {
        body: {template: "systems/chroniclesystem/templates/items/equipment.hbs", scrollable: [".sheet-body"]}
    };

    /** Blank entries created by the "+" buttons of each list. */
    static LIST_TEMPLATES = {
        qualities: () => ({name: "", parameter: ""}),
        specialties: () => ({name: "", rating: 0, modifier: 0}),
        features: () => ({name: "", cost: 0}),
        arts: () => ({name: ""}),
        benefitList: () => ({name: ""}),
        workList: () => ({name: ""}),
        works: () => ({
            name: "",
            type: "SPELL",
            description: "",
            test: {alignment: "", invocation: "", unleashing: "", spellcasting: ""},
            cost: "NONE",
            resonance: ""
        })
    };

    /** @inheritDoc */
    _configureRenderParts(options) {
        const parts = super._configureRenderParts(options);
        parts.body.template = `systems/chroniclesystem/templates/items/${this.item.type}.hbs`;
        return parts;
    }

    /** @inheritDoc */
    async _prepareContext(options) {
        const context = await super._prepareContext(options);
        const item = this.item;
        context.item = item;
        context.system = item.system;
        context.owner = item.isOwner;
        context.cssClass = this.isEditable ? "editable" : "locked";
        context.qualities = SystemUtils.toArray(item.system.qualities);
        context.specialties = SystemUtils.toArray(item.system.specialties);
        context.features = SystemUtils.toArray(item.system.features);
        context.arts = SystemUtils.toArray(item.system.arts);
        context.benefitList = SystemUtils.toArray(item.system.benefitList);
        context.workList = SystemUtils.toArray(item.system.workList);
        context.workTypes = CSConstants.WorkTypes;
        context.abilityNames = CSItemSheet.abilityChoices(item.system.testAbility, item.system.ritual?.alignmentAbility);
        const enrich = (value) => SystemUtils.enrich(value, {relativeTo: item, secrets: item.isOwner});
        context.enriched = {
            description: await enrich(item.system.description),
            effects: await enrich(item.system.effects),
            recovery: await enrich(item.system.recovery),
            rules: await enrich(item.system.rules)
        };
        return context;
    }

    /** Ability names for the Sorcerous Work selects (the standard 19 plus any custom value already stored). */
    static abilityChoices(...current) {
        const names = ["Agility", "Animal Handling", "Athletics", "Awareness", "Cunning", "Deception", "Endurance", "Fighting",
            "Healing", "Knowledge", "Language", "Marksmanship", "Persuasion", "Status", "Stealth", "Survival", "Thievery",
            "Warfare", "Will"];
        for (const c of current) if (c && !names.includes(c)) names.push(c);
        return Object.fromEntries([["", "—"], ...names.map((n) => [n, n])]);
    }

    /** @inheritDoc */
    async _onRender(context, options) {
        await super._onRender(context, options);
        applySheetTheme(this);
    }

    /** @inheritDoc */
    _processFormData(event, form, formData) {
        const data = super._processFormData(event, form, formData);
        mergeArrayFormData(data, this.item._source, this.constructor.ARRAY_FIELDS);
        return data;
    }

    static async #onDeleteItem(event) {
        event.preventDefault();
        if (!this.item.actor) return;
        await this.close();
        await this.item.delete();
    }

    static async #onAddListEntry(event, target) {
        event.preventDefault();
        const list = target.dataset.list;
        const factory = this.constructor.LIST_TEMPLATES[list];
        if (!factory) return;
        const entries = SystemUtils.toArray(this.item._source.system?.[list]);
        entries.push(factory());
        await this.item.update({[`system.${list}`]: entries});
    }

    static async #onDeleteListEntry(event, target) {
        event.preventDefault();
        const list = target.dataset.list;
        const index = parseInt(target.dataset.id, 10);
        const entries = SystemUtils.toArray(this.item._source.system?.[list]);
        if (!Number.isInteger(index) || index < 0 || index >= entries.length) return;
        entries.splice(index, 1);
        await this.item.update({[`system.${list}`]: entries});
    }

    static async #onToggleTheme() {
        await toggleSheetTheme();
    }
}
