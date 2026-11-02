#!/usr/bin/env node
/**
 * Compile packs/_source/<pack>/*.json into Foundry LevelDB compendiums at packs/<pack>.
 * Mirrors what `fvtt package pack` (@foundryvtt/foundryvtt-cli) does: embedded documents (actor items, table results)
 * are written under their own keys and the parent keeps an array of their ids.
 *
 *   npm install            # installs classic-level
 *   node tools/compile-packs.mjs [packName ...]
 */
import fs from "node:fs";
import path from "node:path";
import {fileURLToPath} from "node:url";
import {createRequire} from "node:module";

const require = createRequire(import.meta.url);
const {ClassicLevel} = require(process.env.CLASSIC_LEVEL_PATH ?? "classic-level");

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const SRC = path.join(ROOT, "packs", "_source");
const EMBEDDED = {actors: ["items", "effects"], items: ["effects"], tables: ["results"], journal: ["pages"]};

async function compile(pack) {
    const dir = path.join(SRC, pack);
    const dest = path.join(ROOT, "packs", pack);
    fs.rmSync(dest, {recursive: true, force: true});
    const db = new ClassicLevel(dest, {keyEncoding: "utf8", valueEncoding: "json"});
    await db.open();
    const batch = db.batch();
    let count = 0;
    for (const file of fs.readdirSync(dir).filter((f) => f.endsWith(".json")).sort()) {
        const doc = JSON.parse(fs.readFileSync(path.join(dir, file), "utf8"));
        const key = doc._key;
        if (!key) throw new Error(`${file} has no _key`);
        const collection = key.split("!")[1];
        for (const field of EMBEDDED[collection] ?? []) {
            if (!Array.isArray(doc[field])) continue;
            doc[field] = doc[field].map((child) => {
                const childKey = child._key ?? `!${collection}.${field}!${doc._id}.${child._id}`;
                const {_key, ...value} = child;
                batch.put(childKey, value);
                return child._id;
            });
        }
        delete doc._key;
        batch.put(key, doc);
        count++;
    }
    await batch.write();
    await db.compactRange("\x00", "\xff");
    await db.close();
    console.log(`${pack}: ${count} documents`);
}

const requested = process.argv.slice(2);
const packs = requested.length ? requested : fs.readdirSync(SRC).filter((d) => fs.statSync(path.join(SRC, d)).isDirectory());
for (const pack of packs) await compile(pack);
