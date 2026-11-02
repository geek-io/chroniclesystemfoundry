import {CSItemSheet} from "./csItemSheet.js";
import {CSConstants} from "../../system/csConstants.js";
import SystemUtils from "../../utils/systemUtils.js";

export class CSTechniqueItemSheet extends CSItemSheet {
    static DEFAULT_OPTIONS = {classes: ["technique"]};

    static TABS = {
        primary: {
            tabs: [
                {id: "details", label: "CS.sheets.techniqueItem.tabs.details"},
                {id: "works", label: "CS.sheets.techniqueItem.tabs.works"}
            ],
            initial: "details"
        }
    };

    /** @inheritDoc */
    async _prepareContext(options) {
        const context = await super._prepareContext(options);
        context.types = CSConstants.TechniqueType;
        context.costs = CSConstants.TechniqueCost;
        context.works = await Promise.all(SystemUtils.toArray(this.item.system.works).map(async (work) => ({
            ...work,
            test: work?.test ?? {},
            enrichedDescription: await SystemUtils.enrich(work?.description, {relativeTo: this.item})
        })));
        return context;
    }
}
