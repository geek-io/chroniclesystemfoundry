/**
 * Text extraction for the importer: PDF text layers (pdf.js) and OCR (Tesseract.js).
 * Both libraries are large, so they are loaded from a CDN the first time they are needed and only on the
 * computer of the user running the import. Nothing is uploaded anywhere: parsing happens in the browser.
 */

export const PDFJS_VERSION = "4.10.38";
export const TESSERACT_VERSION = "5.1.1";
const PDFJS_URL = `https://cdn.jsdelivr.net/npm/pdfjs-dist@${PDFJS_VERSION}/build/pdf.min.mjs`;
const PDFJS_WORKER_URL = `https://cdn.jsdelivr.net/npm/pdfjs-dist@${PDFJS_VERSION}/build/pdf.worker.min.mjs`;
const TESSERACT_URL = `https://cdn.jsdelivr.net/npm/tesseract.js@${TESSERACT_VERSION}/dist/tesseract.min.js`;

let pdfjsPromise;
let tesseractPromise;

export async function loadPdfJs() {
    if (globalThis.pdfjsLib?.getDocument) return globalThis.pdfjsLib;
    pdfjsPromise ??= import(PDFJS_URL).then((lib) => {
        lib.GlobalWorkerOptions.workerSrc = PDFJS_WORKER_URL;
        return lib;
    });
    return pdfjsPromise;
}

export async function loadTesseract() {
    if (globalThis.Tesseract?.createWorker) return globalThis.Tesseract;
    tesseractPromise ??= new Promise((resolve, reject) => {
        const script = document.createElement("script");
        script.src = TESSERACT_URL;
        script.async = true;
        script.onload = () => (globalThis.Tesseract ? resolve(globalThis.Tesseract) : reject(new Error("Tesseract failed to load")));
        script.onerror = () => reject(new Error(`Could not load OCR engine from ${TESSERACT_URL}`));
        document.head.append(script);
    });
    return tesseractPromise;
}

/**
 * Parse "1-5, 9, 12-14" into a sorted list of page numbers (1-based) within [1, max].
 */
export function parsePageRange(range, max) {
    const pages = new Set();
    const text = String(range ?? "").trim();
    if (!text) {
        for (let i = 1; i <= max; i++) pages.add(i);
        return [...pages];
    }
    for (const part of text.split(/[,;\s]+/)) {
        const m = part.match(/^(\d+)(?:-(\d+))?$/);
        if (!m) continue;
        const a = Math.max(1, parseInt(m[1], 10));
        const b = Math.min(max, parseInt(m[2] ?? m[1], 10));
        for (let i = a; i <= b; i++) pages.add(i);
    }
    return [...pages].sort((x, y) => x - y);
}

/**
 * Rebuild reading-order lines from pdf.js text items.
 * Two-column layouts are handled by splitting at the page's horizontal middle when both halves have text.
 */
export function textItemsToLines(items, pageWidth) {
    const rows = [];
    for (const item of items) {
        if (!item.str?.trim()) continue;
        const [, , , , x, y] = item.transform;
        rows.push({x, y: Math.round(y), str: item.str, w: item.width ?? 0, h: item.height ?? 10});
    }
    if (!rows.length) return "";

    const mid = pageWidth / 2;
    const left = rows.filter((r) => r.x < mid - 10);
    const right = rows.filter((r) => r.x >= mid - 10);
    const twoColumns = left.length > 10 && right.length > 10 && !rows.some((r) => r.x < mid - 10 && r.x + r.w > mid + 10 && r.w > pageWidth * 0.6);
    const columns = twoColumns ? [left, right] : [rows];

    const out = [];
    for (const column of columns) {
        column.sort((a, b) => (b.y - a.y) || (a.x - b.x));
        let lastY = null;
        let line = [];
        const flush = () => {
            if (line.length) out.push(line.sort((a, b) => a.x - b.x).map((r) => r.str).join(" ").replace(/\s+/g, " ").trim());
            line = [];
        };
        for (const r of column) {
            if (lastY !== null && Math.abs(r.y - lastY) > Math.max(2, r.h * 0.4)) {
                flush();
                if (lastY - r.y > r.h * 1.8) out.push("");
            }
            line.push(r);
            lastY = r.y;
        }
        flush();
        out.push("");
    }
    return out.join("\n").replace(/\n{3,}/g, "\n\n");
}

/**
 * Extract text from a PDF.
 * @param {ArrayBuffer} buffer
 * @param {object} [options]
 * @param {string} [options.pages]     Page range, e.g. "120-135".
 * @param {boolean} [options.ocr]      Run OCR on pages with no text layer.
 * @param {string} [options.language]  Tesseract language.
 * @param {Function} [options.onProgress]
 * @returns {Promise<string>}
 */
export async function extractPdfText(buffer, {pages = "", ocr = true, language = "eng", onProgress = () => {}} = {}) {
    const pdfjs = await loadPdfJs();
    const pdf = await pdfjs.getDocument({data: new Uint8Array(buffer)}).promise;
    const pageNumbers = parsePageRange(pages, pdf.numPages);
    const chunks = [];
    let worker = null;
    try {
        for (const [i, n] of pageNumbers.entries()) {
            onProgress(`PDF page ${n} (${i + 1}/${pageNumbers.length})`);
            const page = await pdf.getPage(n);
            const viewport = page.getViewport({scale: 1});
            const content = await page.getTextContent();
            let text = textItemsToLines(content.items, viewport.width);
            if (text.replace(/\s/g, "").length < 40 && ocr) {
                const Tesseract = await loadTesseract();
                worker ??= await Tesseract.createWorker(language);
                const scaled = page.getViewport({scale: 2});
                const canvas = document.createElement("canvas");
                canvas.width = scaled.width;
                canvas.height = scaled.height;
                await page.render({canvasContext: canvas.getContext("2d"), viewport: scaled}).promise;
                onProgress(`OCR page ${n} (${i + 1}/${pageNumbers.length})`);
                const {data} = await worker.recognize(canvas);
                text = data.text;
            }
            chunks.push(`\n--- page ${n} ---\n${text}`);
        }
    } finally {
        await worker?.terminate();
        await pdf.destroy?.();
    }
    return chunks.join("\n").replace(/^\n--- page \d+ ---\n/, "");
}

/**
 * OCR an image file or canvas.
 * @param {Blob|HTMLCanvasElement|string} image
 * @returns {Promise<string>}
 */
export async function ocrImage(image, {language = "eng", onProgress = () => {}} = {}) {
    const Tesseract = await loadTesseract();
    const worker = await Tesseract.createWorker(language, 1, {
        logger: (m) => {
            if (m.status && typeof m.progress === "number") onProgress(`${m.status} ${Math.round(m.progress * 100)}%`);
        }
    });
    try {
        const {data} = await worker.recognize(image);
        return data.text;
    } finally {
        await worker.terminate();
    }
}
