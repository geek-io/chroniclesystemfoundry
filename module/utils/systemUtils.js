/**
 * General helpers (originally adapted from the Cyberpunk RED Core system).
 */
export default class SystemUtils {
    static displayMessage(msgType, msg) {
        const localizedMessage = game.i18n.localize(msg);
        switch (msgType) {
            case "warn":
                ui.notifications.warn(localizedMessage);
                break;
            case "error":
                ui.notifications.error(localizedMessage);
                break;
            case "notify":
            case "info":
                ui.notifications.info(localizedMessage);
                break;
            default:
        }
    }

    static localize(string) {
        return game.i18n.localize(string);
    }

    static format(string, object) {
        return game.i18n.format(string, object);
    }

    static isEmpty(value) {
        return value === null || value === undefined || typeof value.toString !== "function";
    }

    static normalizeTextValue(value) {
        if (SystemUtils.isEmpty(value)) return "";
        return String(value);
    }

    /**
     * Foundry stores arrays edited through forms (name="system.list.0.name") as index-keyed objects.
     * Normalize either shape to a plain array.
     * @param {Array|object|undefined} value
     * @returns {Array}
     */
    static toArray(value) {
        if (Array.isArray(value)) return value.slice();
        if (value && typeof value === "object") {
            return Object.keys(value)
                .sort((a, b) => Number(a) - Number(b))
                .map((k) => value[k]);
        }
        return [];
    }

    /** Parse an integer, falling back to a default for blanks and garbage. */
    static int(value, fallback = 0) {
        const n = parseInt(value, 10);
        return Number.isFinite(n) ? n : fallback;
    }

    static renderTemplate(path, data) {
        return foundry.applications.handlebars.renderTemplate(path, data);
    }

    static enrich(content, options = {}) {
        return foundry.applications.ux.TextEditor.implementation.enrichHTML(content ?? "", options);
    }
}
