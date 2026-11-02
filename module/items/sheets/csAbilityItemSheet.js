import {CSItemSheet} from "./csItemSheet.js";

/** Ability sheet; specialties are handled by the generic list actions of CSItemSheet. */
export class CSAbilityItemSheet extends CSItemSheet {
    static DEFAULT_OPTIONS = {classes: ["ability"]};
}
