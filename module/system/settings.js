import LOGGER from "../utils/logger.js";
import {CSConstants} from "./csConstants.js";

/**
 * Register the system settings.
 */
const registerSystemSettings = () => {
    const S = CSConstants.Settings;

    game.settings.register(S.SYSTEM_NAME, S.DEBUG_LOGS, {
        name: "CS.settings.debugLogs.name",
        hint: "CS.settings.debugLogs.hint",
        scope: "client",
        config: true,
        type: Boolean,
        default: false,
        onChange: (value) => LOGGER.log(`Changed ${S.DEBUG_LOGS} to ${value}`)
    });

    game.settings.register(S.SYSTEM_NAME, S.TRACE_LOGS, {
        name: "CS.settings.traceLogs.name",
        hint: "CS.settings.traceLogs.hint",
        scope: "client",
        config: true,
        type: Boolean,
        default: false,
        onChange: (value) => LOGGER.log(`Changed ${S.TRACE_LOGS} to ${value}`)
    });

    game.settings.register(S.SYSTEM_NAME, S.ASOIAF_DEFENSE_STYLE, {
        name: "CS.settings.asoiafDefenseStyle.name",
        hint: "CS.settings.asoiafDefenseStyle.hint",
        scope: "world",
        config: true,
        type: Boolean,
        default: false,
        requiresReload: true
    });

    game.settings.register(S.SYSTEM_NAME, S.CURRENT_VERSION, {
        name: "Current Version",
        scope: "world",
        config: false,
        type: String,
        default: "0.0.0"
    });

    game.settings.register(S.SYSTEM_NAME, S.MODIFIER_DIALOG_AS_DEFAULT, {
        name: "CS.settings.isModifierDialogDefault.name",
        hint: "CS.settings.isModifierDialogDefault.hint",
        scope: "client",
        config: true,
        type: Boolean,
        default: false
    });

    game.settings.register(S.SYSTEM_NAME, S.SHEET_THEME, {
        name: "CS.settings.sheetTheme.name",
        hint: "CS.settings.sheetTheme.hint",
        scope: "client",
        config: true,
        type: String,
        choices: {
            [CSConstants.SheetThemes.FOUNDRY]: "CS.settings.sheetTheme.choices.foundry",
            [CSConstants.SheetThemes.LIGHT]: "CS.settings.sheetTheme.choices.light",
            [CSConstants.SheetThemes.DARK]: "CS.settings.sheetTheme.choices.dark"
        },
        default: CSConstants.SheetThemes.FOUNDRY,
        onChange: () => {
            for (const app of foundry.applications.instances.values()) {
                if (app.options?.classes?.includes("chroniclesystem")) app.render();
            }
        }
    });

    game.settings.register(S.SYSTEM_NAME, S.OCR_LANGUAGE, {
        name: "CS.settings.ocrLanguage.name",
        hint: "CS.settings.ocrLanguage.hint",
        scope: "client",
        config: true,
        type: String,
        default: "eng"
    });
};

export default registerSystemSettings;
