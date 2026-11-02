export class DiceRollFormula {
    #pool;
    #bonusDice;
    #reRoll;
    #modifier;
    #dicePenalty;
    #difficult;
    #isUserChanged;

    constructor() {
        this.pool = 2;
        this.bonusDice = 0;
        this.reRoll = 0;
        this.modifier = 0;
        this.dicePenalty = 0;
        this.difficult = 0;
        this.isUserChanged = false;
    }

    get isUserChanged() {
        return this.#isUserChanged;
    }

    set isUserChanged(value) {
        this.#isUserChanged = value;
    }

    get difficult() {
        return this.#difficult;
    }

    set difficult(value) {
        this.#difficult = value;
    }

    get pool() {
        return this.#pool;
    }

    set pool(value) {
        this.#pool = DiceRollFormula.#int(value);
    }

    get bonusDice() {
        return this.#bonusDice;
    }

    set bonusDice(value) {
        this.#bonusDice = DiceRollFormula.#int(value);
    }

    get reRoll() {
        return this.#reRoll;
    }

    set reRoll(value) {
        this.#reRoll = DiceRollFormula.#int(value);
    }

    get modifier() {
        return this.#modifier;
    }

    set modifier(value) {
        this.#modifier = DiceRollFormula.#int(value);
    }

    get dicePenalty() {
        return this.#dicePenalty;
    }

    set dicePenalty(value) {
        this.#dicePenalty = DiceRollFormula.#int(value);
    }

    static #int(value) {
        const n = parseInt(value, 10);
        return Number.isFinite(n) ? n : 0;
    }

    /** Number of dice actually kept once penalties are applied. */
    get keptDice() {
        return Math.max(this.pool - this.dicePenalty, 0);
    }

    /** Number of dice thrown (test dice plus bonus dice). */
    get totalDice() {
        return Math.max(this.pool, 1) + Math.max(this.bonusDice, 0);
    }

    /**
     * Foundry dice expression for this test: roll test + bonus dice, re-roll up to N ones, keep the highest
     * (test dice - penalty dice), add the flat modifier.
     * @returns {string}
     */
    toRollFormula() {
        let formula = `${this.totalDice}d6`;
        if (this.reRoll > 0) formula += `r${this.reRoll}=1`;
        formula += `kh${this.keptDice}`;
        if (this.modifier > 0) formula += ` + ${this.modifier}`;
        else if (this.modifier < 0) formula += ` - ${Math.abs(this.modifier)}`;
        return formula;
    }

    clone() {
        return DiceRollFormula.fromStr(this.toStr());
    }

    toStr() {
        return `${this.pool}|${this.bonusDice}|${this.modifier}|${this.dicePenalty}|${this.reRoll}`;
    }

    static fromStr(str) {
        let data = str.split('|');
        let formula = new DiceRollFormula();
        if (data.length === 5) {
            formula.pool = data[0];
            formula.bonusDice = data[1];
            formula.modifier = data[2];
            formula.dicePenalty = data[3];
            formula.reRoll = data[4];
        }
        return formula;
    }

    ToFormattedStr() {
        let pool = Math.max(this.pool - this.dicePenalty, 1);
        let result = `${pool}d6`;
        if (this.bonusDice > 0) {
            result += ` + ${this.bonusDice}B`;
        }
        if (this.modifier !== 0) {
            result +=
                this.modifier > 0
                    ? ` + ${this.modifier}`
                    : ` - ${-this.modifier}`;
        }
        return result;
    }
}
