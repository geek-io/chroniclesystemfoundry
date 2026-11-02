import {CSItemSheet} from "./csItemSheet.js";

export class CSHoldingItemSheet extends CSItemSheet {
    static DEFAULT_OPTIONS = {classes: ["holding"]};

    /** @inheritDoc */
    async _prepareContext(options) {
        const context = await super._prepareContext(options);
        context.resourceChoices = {
            defense: "CS.sheets.house.resources.defense",
            influence: "CS.sheets.house.resources.influence",
            lands: "CS.sheets.house.resources.lands",
            law: "CS.sheets.house.resources.law",
            population: "CS.sheets.house.resources.population",
            power: "CS.sheets.house.resources.power",
            wealth: "CS.sheets.house.resources.wealth"
        };
        return context;
    }
}
