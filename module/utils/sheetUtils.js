import {CSConstants} from "../system/csConstants.js";
import SystemUtils from "./systemUtils.js";

/**
 * Read the client's preferred sheet theme ("foundry", "light" or "dark").
 * @returns {string}
 */
export function getSheetThemePreference() {
    try {
        return game.settings.get(CSConstants.Settings.SYSTEM_NAME, CSConstants.Settings.SHEET_THEME);
    } catch (err) {
        return CSConstants.SheetThemes.FOUNDRY;
    }
}

/**
 * The theme a sheet will actually be shown in.
 * @param {ApplicationV2} app
 * @returns {"light"|"dark"}
 */
export function getEffectiveTheme(app) {
    const pref = getSheetThemePreference();
    if (pref === CSConstants.SheetThemes.DARK || pref === CSConstants.SheetThemes.LIGHT) return pref;
    const classes = app?.options?.classes ?? [];
    if (classes.includes("theme-dark")) return "dark";
    if (classes.includes("theme-light")) return "light";
    return document.body.classList.contains("theme-dark") ? "dark" : "light";
}

/**
 * Apply the Chronicle sheet theme preference to a rendered application.
 * "foundry" leaves Foundry's own theme handling (UI settings + per-sheet "Configure Sheet" theme) untouched.
 * @param {ApplicationV2} app
 */
export function applySheetTheme(app) {
    const el = app?.element;
    if (!el) return;
    const pref = getSheetThemePreference();
    const original = app.options?.classes ?? [];
    el.classList.remove("cs-theme-forced");
    if (pref === CSConstants.SheetThemes.DARK || pref === CSConstants.SheetThemes.LIGHT) {
        el.classList.remove("theme-light", "theme-dark");
        el.classList.add("themed", `theme-${pref}`, "cs-theme-forced");
    } else {
        // Restore whatever Foundry configured for this sheet.
        for (const cls of ["themed", "theme-light", "theme-dark"]) el.classList.toggle(cls, original.includes(cls));
    }
}

/** Flip the client sheet theme between light and dark and re-render open Chronicle sheets. */
export async function toggleSheetTheme() {
    const current = getSheetThemePreference();
    let effective = current;
    if (current === CSConstants.SheetThemes.FOUNDRY) effective = document.body.classList.contains("theme-dark") ? "dark" : "light";
    const next = effective === "dark" ? CSConstants.SheetThemes.LIGHT : CSConstants.SheetThemes.DARK;
    await game.settings.set(CSConstants.Settings.SYSTEM_NAME, CSConstants.Settings.SHEET_THEME, next);
}

/**
 * Forms submit array entries as index-keyed objects ({0: {...}, 1: {...}}), which would replace the stored array
 * and drop any properties that had no input on the sheet. Merge them back into the source arrays instead.
 * @param {object} data        Expanded form data (mutated).
 * @param {object} source      The document's _source.
 * @param {string[]} fields    Paths inside `system` that hold arrays.
 */
export function mergeArrayFormData(data, source, fields) {
    if (!data?.system) return data;
    for (const field of fields) {
        const submitted = foundry.utils.getProperty(data.system, field);
        if (!submitted || Array.isArray(submitted) || typeof submitted !== "object") continue;
        const merged = SystemUtils.toArray(foundry.utils.getProperty(source.system ?? {}, field)).map((v) => foundry.utils.deepClone(v));
        for (const [key, value] of Object.entries(submitted)) {
            const index = Number(key);
            if (!Number.isInteger(index) || index < 0) continue;
            const prior = merged[index];
            if (prior && typeof prior === "object" && value && typeof value === "object") {
                merged[index] = foundry.utils.mergeObject(prior, value, {inplace: false});
            } else {
                merged[index] = value;
            }
        }
        foundry.utils.setProperty(data.system, field, merged);
    }
    return data;
}
