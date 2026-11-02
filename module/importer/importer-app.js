import * as Parsers from "./parsers.js";
import {extractPdfText, ocrImage} from "./extractors.js";
import {CSConstants} from "../system/csConstants.js";
import {applySheetTheme} from "../utils/sheetUtils.js";
import LOGGER from "../utils/logger.js";

const {HandlebarsApplicationMixin, ApplicationV2} = foundry.applications.api;

const MODES = {
    auto: "CS.importer.modes.auto",
    statblock: "CS.importer.modes.statblock",
    table: "CS.importer.modes.table",
    json: "CS.importer.modes.json"
};

/**
 * Chronicle System importer.
 *
 * Paste or load text, JSON, CSV/TSV tables, PDFs (text layer, with OCR fallback for scanned pages) or images (OCR),
 * preview what will be created, then import into the world or into an unlocked compendium.
 */
export class CSImporter extends HandlebarsApplicationMixin(ApplicationV2) {
    constructor(options = {}) {
        super(options);
        this.state = {
            mode: options.mode ?? "auto",
            text: options.text ?? "",
            actorType: "npc",
            itemType: "weapon",
            multiple: true,
            destination: "world",
            folder: "",
            source: "",
            pages: "",
            ocr: true,
            linkCompendium: true,
            parsed: null,
            progress: ""
        };
    }

    static DEFAULT_OPTIONS = {
        id: "chronicle-importer",
        classes: ["chroniclesystem", "cs-importer"],
        tag: "form",
        window: {title: "CS.importer.title", icon: "fa-solid fa-file-import", resizable: true},
        position: {width: 760, height: 760},
        form: {handler: CSImporter.#onSubmit, submitOnChange: true, closeOnSubmit: false},
        actions: {
            setMode: CSImporter.#onSetMode,
            preview: CSImporter.#onPreview,
            import: CSImporter.#onImport,
            loadFile: CSImporter.#onLoadFile,
            clear: CSImporter.#onClear,
            example: CSImporter.#onExample
        }
    };

    static PARTS = {
        main: {template: CSConstants.Templates.Apps.IMPORTER, scrollable: [".importer-body"]}
    };

    /** @inheritDoc */
    async _prepareContext(options) {
        const context = await super._prepareContext(options);
        const s = this.state;
        const itemTypes = Object.fromEntries(Parsers.ITEM_TYPES.map((t) => [t, `TYPES.Item.${t}`]));
        const packs = game.packs.filter((p) => !p.locked && ["Actor", "Item"].includes(p.documentName));
        const destinations = {world: "CS.importer.destinationWorld"};
        for (const p of packs) destinations[p.collection] = `${p.title} (${p.documentName})`;

        const parsed = s.parsed;
        return Object.assign(context, {
            state: s,
            modes: Object.entries(MODES).map(([id, label]) => ({id, label, active: id === s.mode})),
            actorTypes: {npc: "TYPES.Actor.npc", character: "TYPES.Actor.character"},
            itemTypes,
            destinations,
            showActorOptions: ["auto", "statblock"].includes(s.mode),
            showItemOptions: ["auto", "table"].includes(s.mode),
            preview: parsed ? {
                actors: parsed.actors.map((a) => ({
                    name: a.name,
                    type: game.i18n.localize(`TYPES.Actor.${a.type}`),
                    summary: this.#summarize(a)
                })),
                items: parsed.items.map((i) => ({name: i.name, type: game.i18n.localize(`TYPES.Item.${i.type}`), summary: this.#summarizeItem(i)})),
                warnings: parsed.warnings,
                count: parsed.actors.length + parsed.items.length
            } : null
        });
    }

    #summarize(actor) {
        const abilities = (actor.items ?? []).filter((i) => i.type === "ability")
            .map((a) => `${a.name} ${a.system.rating}`).join(", ");
        const other = (actor.items ?? []).filter((i) => i.type !== "ability").map((i) => i.name).join(", ");
        return [abilities, other].filter(Boolean).join(" · ");
    }

    #summarizeItem(item) {
        const s = item.system ?? {};
        switch (item.type) {
            case "weapon": return [s.specialty, s.damage, (s.qualities ?? []).map((q) => `${q.name} ${q.parameter}`.trim()).join(", ")].filter(Boolean).join(" · ");
            case "armor": return `AR ${s.rating} · AP ${s.penalty} · Bulk ${s.bulk}`;
            default: return String(s.description ?? "").replace(/<[^>]+>/g, " ").slice(0, 90);
        }
    }

    /** @inheritDoc */
    async _onRender(context, options) {
        await super._onRender(context, options);
        applySheetTheme(this);
        const file = this.element.querySelector("input[type=file]");
        file?.addEventListener("change", (event) => this.#readFile(event.currentTarget.files?.[0]));
    }

    /* -------------------------------------------- */
    /*  Form state                                  */
    /* -------------------------------------------- */

    static async #onSubmit(event, form, formData) {
        const data = formData.object;
        const s = this.state;
        for (const key of ["text", "actorType", "itemType", "destination", "folder", "source", "pages"]) {
            if (key in data) s[key] = data[key];
        }
        for (const key of ["multiple", "ocr", "linkCompendium"]) if (key in data) s[key] = !!data[key];
        // Re-render only when an option that changes the layout changed.
        if (event?.target?.name && ["destination"].includes(event.target.name)) this.render();
    }

    _setProgress(message) {
        this.state.progress = message;
        const el = this.element?.querySelector(".progress");
        if (el) el.textContent = message;
    }

    /* -------------------------------------------- */
    /*  Actions                                     */
    /* -------------------------------------------- */

    static #onSetMode(event, target) {
        this.state.mode = target.dataset.mode;
        this.state.parsed = null;
        this.render();
    }

    static #onClear() {
        Object.assign(this.state, {text: "", parsed: null, progress: ""});
        this.render();
    }

    static #onExample(event, target) {
        this.state.text = EXAMPLES[target.dataset.example] ?? "";
        this.state.mode = target.dataset.mode ?? this.state.mode;
        this.state.parsed = null;
        this.render();
    }

    static #onLoadFile() {
        this.element.querySelector("input[type=file]")?.click();
    }

    static async #onPreview() {
        this.#syncFormState();
        try {
            this.state.parsed = this.parse(this.state.text);
        } catch (err) {
            LOGGER.error("Importer parse failed", err);
            this.state.parsed = {actors: [], items: [], warnings: [err.message]};
        }
        this.render();
    }

    static async #onImport() {
        this.#syncFormState();
        if (!this.state.parsed) this.state.parsed = this.parse(this.state.text);
        const {actors, items} = this.state.parsed;
        if (!actors.length && !items.length) {
            ui.notifications.warn("CS.importer.nothingToImport", {localize: true});
            return;
        }
        try {
            const created = await CSImporter.createDocuments({actors, items}, {
                pack: this.state.destination === "world" ? null : this.state.destination,
                folder: this.state.folder,
                linkCompendium: this.state.linkCompendium,
                onProgress: (msg) => this._setProgress(msg)
            });
            ui.notifications.info(game.i18n.format("CS.importer.done", {count: created.length}));
            this._setProgress(game.i18n.format("CS.importer.done", {count: created.length}));
        } catch (err) {
            LOGGER.error("Import failed", err);
            ui.notifications.error(game.i18n.format("CS.importer.failed", {error: err.message}));
        }
    }

    #syncFormState() {
        const form = this.form ?? this.element;
        if (!form) return;
        const data = new foundry.applications.ux.FormDataExtended(form).object;
        CSImporter.#onSubmit.call(this, null, form, {object: data});
    }

    /* -------------------------------------------- */
    /*  Parsing                                     */
    /* -------------------------------------------- */

    /**
     * Parse text according to the current mode.
     * @param {string} text
     * @returns {{actors: object[], items: object[], warnings: string[]}}
     */
    parse(text) {
        const s = this.state;
        let mode = s.mode;
        if (mode === "auto") mode = Parsers.detectFormat(text);
        const source = s.source;
        switch (mode) {
            case "json":
                return Parsers.parseJSON(text);
            case "table": {
                const {items, warnings} = Parsers.parseItemTable(text, s.itemType, {source});
                return {actors: [], items, warnings};
            }
            case "statblock": {
                const blocks = s.multiple ? Parsers.splitStatBlocks(text) : [text];
                const actors = [];
                const warnings = [];
                for (const block of blocks) {
                    const result = Parsers.parseStatBlock(block, {type: s.actorType, source});
                    if (result.actor) actors.push(result.actor);
                    warnings.push(...result.warnings);
                }
                return {actors, items: [], warnings};
            }
            default:
                return {actors: [], items: [], warnings: [game.i18n.localize("CS.importer.unknownFormat")]};
        }
    }

    async #readFile(file) {
        if (!file) return;
        const name = file.name.toLowerCase();
        try {
            if (name.endsWith(".pdf")) {
                this._setProgress(game.i18n.localize("CS.importer.readingPdf"));
                const text = await extractPdfText(await file.arrayBuffer(), {
                    pages: this.state.pages,
                    ocr: this.state.ocr,
                    language: game.settings.get(CSConstants.Settings.SYSTEM_NAME, CSConstants.Settings.OCR_LANGUAGE),
                    onProgress: (msg) => this._setProgress(msg)
                });
                this.state.text = text;
            } else if (/\.(png|jpe?g|webp|gif|bmp|tiff?)$/.test(name)) {
                this._setProgress(game.i18n.localize("CS.importer.runningOcr"));
                this.state.text = await ocrImage(file, {
                    language: game.settings.get(CSConstants.Settings.SYSTEM_NAME, CSConstants.Settings.OCR_LANGUAGE),
                    onProgress: (msg) => this._setProgress(msg)
                });
            } else {
                this.state.text = await file.text();
                if (name.endsWith(".json")) this.state.mode = "json";
                else if (/\.(csv|tsv)$/.test(name)) this.state.mode = "table";
            }
            this.state.parsed = null;
            this.state.progress = game.i18n.format("CS.importer.loaded", {name: file.name});
        } catch (err) {
            LOGGER.error("Could not read file", err);
            this.state.progress = game.i18n.format("CS.importer.failed", {error: err.message});
        }
        this.render();
    }

    /* -------------------------------------------- */
    /*  Document creation (also usable from macros) */
    /* -------------------------------------------- */

    /**
     * Create parsed documents.
     * @param {{actors?: object[], items?: object[]}} data
     * @param {object} [options]
     * @param {string|null} [options.pack]          Compendium collection id, or null for the world.
     * @param {string} [options.folder]             Folder name to create/put world documents in.
     * @param {boolean} [options.linkCompendium]    Replace embedded items with matching system compendium entries.
     * @param {Function} [options.onProgress]
     * @returns {Promise<Document[]>}
     */
    static async createDocuments({actors = [], items = []} = {}, {pack = null, folder = "", linkCompendium = true, onProgress = () => {}} = {}) {
        const created = [];
        const validItemTypes = new Set(game.documentTypes?.Item ?? Parsers.ITEM_TYPES);
        const clean = (list) => list.filter((d) => d && validItemTypes.has(d.type));
        const lookup = linkCompendium ? await CSImporter.#compendiumLookup() : null;

        const folderFor = async (type) => {
            if (!folder || pack) return null;
            const existing = game.folders.find((f) => f.type === type && f.name === folder);
            return (existing ?? await Folder.implementation.create({name: folder, type})).id;
        };

        if (items.length) {
            onProgress(game.i18n.format("CS.importer.creating", {count: items.length, type: game.i18n.localize("DOCUMENT.Items")}));
            const folderId = await folderFor("Item");
            const data = clean(items).map((i) => ({...i, folder: folderId}));
            created.push(...await Item.implementation.createDocuments(data, {pack}));
        }

        if (actors.length) {
            onProgress(game.i18n.format("CS.importer.creating", {count: actors.length, type: game.i18n.localize("DOCUMENT.Actors")}));
            const folderId = await folderFor("Actor");
            const data = [];
            for (const actor of actors) {
                const embedded = [];
                for (const item of clean(actor.items ?? [])) embedded.push(lookup ? await lookup(item) : item);
                data.push({...actor, items: embedded, folder: folderId});
            }
            created.push(...await Actor.implementation.createDocuments(data, {pack}));
        }
        return created;
    }

    /**
     * Build a function that swaps parsed items for the system compendium version (keeping parsed ratings).
     */
    static async #compendiumLookup() {
        const index = new Map();
        for (const pack of game.packs.filter((p) => p.metadata.packageName === CSConstants.SYSTEM_ID && p.documentName === "Item")) {
            for (const entry of await pack.getIndex({fields: ["type"]})) {
                index.set(`${entry.type}|${entry.name.toLowerCase()}`, {pack, id: entry._id});
            }
        }
        return async (item) => {
            const hit = index.get(`${item.type}|${String(item.name).toLowerCase()}`);
            if (!hit) return item;
            const doc = await hit.pack.getDocument(hit.id);
            if (!doc) return item;
            const data = doc.toObject();
            delete data._id;
            data._stats = {compendiumSource: doc.uuid};
            if (item.type === "ability") {
                data.system.rating = item.system.rating;
                const specialties = Array.isArray(data.system.specialties) ? data.system.specialties : Object.values(data.system.specialties ?? {});
                for (const spec of item.system.specialties ?? []) {
                    const match = specialties.find((s) => s.name.toLowerCase() === spec.name.toLowerCase());
                    if (match) match.rating = spec.rating;
                    else specialties.push(spec);
                }
                data.system.specialties = specialties;
            } else if (["weapon", "armor"].includes(item.type)) {
                data.system.equipped = item.system.equipped ?? data.system.equipped;
            }
            return data;
        };
    }
}

/* -------------------------------------------- */

const EXAMPLES = {
    statblock: `SER EXAMPLE OF HOUSE PLACEHOLDER
Knight of a minor house
Agility 3, Animal Handling 3 (Ride 1B), Athletics 4 (Strength 1B), Awareness 3, Endurance 4, Fighting 5 (Long Blades 2B, Shields 1B), Status 4 (Tournaments 1B), Warfare 3, Will 3
Combat Defense 8 Health 12 Armor Rating 9 Armor Penalty -5 Movement 3
Intrigue Defense 10 Composure 9
Longsword 5D+2B, 6 damage, Adaptable
Lance (Fighting 5D): 9 damage, Bulk 1, Impale, Mounted, Powerful, Reach, Slow
Benefits: Armor Mastery, Shield Mastery
Equipment: Plate armor, shield, longsword, lance, warhorse`,
    table: `Name,Specialty,Training,Damage,Qualities,Cost,Weight
Example Blade,Fighting:Long Blades,,Athletics+2,Adaptable,100,4
Example Bow,Marksmanship:Bows,1,Agility+2,"Long Range, Two-Handed",50,2`,
    json: JSON.stringify({
        name: "Example Sellsword",
        kind: "npc",
        abilities: {Agility: 3, Athletics: 3, Endurance: 3, Fighting: {rating: 4, specialties: {Axes: 1}}},
        weapons: [{name: "Example Axe", specialty: "Fighting:Axes", damage: "Athletics+1", qualities: "Adaptable"}],
        benefits: ["Fearsome"],
        notes: "Paid in advance, loyal until the coin runs out."
    }, null, 2)
};
