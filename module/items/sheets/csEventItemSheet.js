import {CSItemSheet} from "./csItemSheet.js";

export class CSEventItemSheet extends CSItemSheet {
    static DEFAULT_OPTIONS = {
        classes: ["event"],
        actions: {togglePlayerChoice: CSEventItemSheet.#onTogglePlayerChoice}
    };

    static async #onTogglePlayerChoice(event) {
        event.preventDefault();
        await this.item.update({"system.playerChoice": !this.item.system.playerChoice});
    }
}
