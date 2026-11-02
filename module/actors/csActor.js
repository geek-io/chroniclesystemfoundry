/**
 * Base actor for the Chronicle System.
 * @extends {Actor}
 */
export class CSActor extends Actor {
    getCSData() {
        return this.system;
    }

    /** @override */
    static getDefaultArtwork(actorData) {
        if (actorData?.type === "house") return {img: "systems/chroniclesystem/assets/icons/holding.png", texture: {src: "systems/chroniclesystem/assets/icons/holding.png"}};
        return super.getDefaultArtwork(actorData);
    }
}
