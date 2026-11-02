import {CSConstants} from "../system/csConstants.js";
import LOGGER from "../utils/logger.js";

/**
 * Run data migrations that are newer than the last version this world was opened with.
 */
export async function migrateData() {
    if (!game.user?.isGM) return;
    const latest = game.system.version;
    const recentVersion = game.settings.get(CSConstants.Settings.SYSTEM_NAME, CSConstants.Settings.CURRENT_VERSION) || "0.0.0";

    for (const [version, task] of Object.entries(migrationRoutines)) {
        if (!foundry.utils.isNewerVersion(version, recentVersion)) continue;
        ui.notifications.info(game.i18n.format("CS.notifications.migrationStart", {version}));
        try {
            await task();
            ui.notifications.info(game.i18n.format("CS.notifications.migrationDone", {version}));
        } catch (err) {
            LOGGER.error(`Migration ${version} failed`, err);
            ui.notifications.error(game.i18n.format("CS.notifications.migrationFailed", {version}), {permanent: true});
            return;
        }
    }
    await game.settings.set(CSConstants.Settings.SYSTEM_NAME, CSConstants.Settings.CURRENT_VERSION, latest);
}

const migrationRoutines = {};

export function registerTask(version, task) {
    migrationRoutines[version] = task;
}

/** Normalize index-keyed objects back into arrays. */
function asArray(value) {
    if (Array.isArray(value)) return value;
    if (value && typeof value === "object") return Object.keys(value).sort((a, b) => a - b).map((k) => value[k]);
    return [];
}

const ARRAY_FIELDS = {
    ability: ["specialties"],
    armor: ["qualities"],
    weapon: ["qualities"],
    holding: ["features"],
    technique: ["arts", "works"]
};

function itemUpdate(item) {
    const fields = ARRAY_FIELDS[item.type];
    if (!fields) return null;
    const update = {};
    for (const field of fields) {
        const value = item._source.system?.[field];
        if (value && !Array.isArray(value)) update[`system.${field}`] = asArray(value);
    }
    return foundry.utils.isEmpty(update) ? null : update;
}

/**
 * 14.0.0 — Foundry v14 port.
 *  Convert index-keyed objects (specialties, qualities, features, arts, works, wounds, injuries) back to arrays.
 *  (system.modifiers / system.penalties are no longer read — they are derived — so they are left untouched.)
 */
async function task1400() {
    const migrateItems = async (items, parent) => {
        const updates = [];
        for (const item of items) {
            const update = itemUpdate(item);
            if (update) updates.push({_id: item.id, ...update});
        }
        if (updates.length) await (parent ? parent.updateEmbeddedDocuments("Item", updates) : Item.implementation.updateDocuments(updates));
    };

    await migrateItems(game.items.contents, null);

    for (const actor of game.actors) {
        const update = {};
        if (actor.type !== "house") {
            for (const field of ["wounds", "injuries"]) {
                const value = actor._source.system?.[field];
                if (value && !Array.isArray(value)) update[`system.${field}`] = asArray(value);
            }
            if (!foundry.utils.isEmpty(update)) await actor.update(update);
        }
        await migrateItems(actor.items.contents, actor);
    }
}

registerTask("14.0.0", task1400);
