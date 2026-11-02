import {CSConstants} from "../system/csConstants.js";

/**
 * Small logging helper. Debug/trace output is gated behind client settings; reading a setting before it is
 * registered throws in Foundry, so those reads are guarded.
 */
export default class LOGGER {
    static #enabled(key) {
        try {
            return game.settings.get(CSConstants.Settings.SYSTEM_NAME, key);
        } catch (err) {
            return false;
        }
    }

    static log(msg) {
        console.log(`CS LOG | ${msg}`);
    }

    static debug(msg) {
        if (!LOGGER.#enabled(CSConstants.Settings.DEBUG_LOGS)) return;
        if (typeof msg === "object" && msg !== null) console.debug("CS dbg |", msg);
        else console.debug(`CS dbg | ${msg}`);
    }

    static debugObject(obj) {
        if (LOGGER.#enabled(CSConstants.Settings.DEBUG_LOGS)) console.debug(obj);
    }

    static warn(msg) {
        console.warn(`CS WRN | ${msg}`);
    }

    static trace(msg) {
        if (LOGGER.#enabled(CSConstants.Settings.TRACE_LOGS)) console.log(`CS TRC | ${msg}`);
    }

    static error(msg, err) {
        console.error(`CS ERR | ${msg}`, err ?? "");
    }
}
