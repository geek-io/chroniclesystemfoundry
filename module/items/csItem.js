import SystemUtils from "../utils/systemUtils.js";

const ICON_TYPES = ["ability", "armor", "benefit", "drawback", "equipment", "event", "holding", "poison", "technique", "weapon",
    "ancestry", "art", "work", "tradition"];

/**
 * Base item for the Chronicle System.
 */
export class CSItem extends Item {
    getCSData() {
        return this.system;
    }

    /** @override */
    static getDefaultArtwork(itemData) {
        if (ICON_TYPES.includes(itemData?.type)) return {img: `systems/chroniclesystem/assets/icons/${itemData.type}.png`};
        return super.getDefaultArtwork(itemData);
    }

    /** Qualities as a clean array (forms store them as index-keyed objects). */
    get qualities() {
        return SystemUtils.toArray(this.system.qualities);
    }

    hasQuality(name) {
        const wanted = String(name).toLowerCase();
        return this.qualities.some((q) => String(q?.name ?? "").toLowerCase() === wanted);
    }

    // Lifecycle callbacks kept for compatibility with world macros. Gear effects are now derived on the actor.
    onEquippedChanged(actor, isEquipped) {}

    onObtained(actor) {}

    onDiscardedFromActor(actor, oldId) {}
}
