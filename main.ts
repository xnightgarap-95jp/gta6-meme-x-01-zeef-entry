// gta6-meme-x-01 entry program (Node 22, standard library only).
//
// The entry itself is the X post: the meme (meme.png) is posted on X from a
// public account, and POST.json at the repository root names the post's
// address. All this program has to do is copy POST.json, byte for byte, from
// the repository into the output directory, where the house's gate reads it
// and then reads the post from X itself. Nothing this program writes about
// the post is judged.
//
// Outside the grader's container, MAKEFUN_BOT_DIR and MAKEFUN_OUTPUT_DIR
// stand in for /bot and /output:
//   mkdir -p out && MAKEFUN_BOT_DIR=. MAKEFUN_OUTPUT_DIR=out node main.ts
//
// Validation before the copy: POST.json must be a JSON object (at most
// 16384 bytes, the gate's cap) whose "url" is an X post address of the form
// https://x.com/<handle>/status/<digits> (or twitter.com, with optional
// www./mobile. prefix and an optional query or fragment after it). A bad
// file fails loudly instead of being copied, so a broken entry is caught
// here and not at the gate.

import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const BOT_DIR = process.env.MAKEFUN_BOT_DIR ?? "/bot";
const OUTPUT_DIR = process.env.MAKEFUN_OUTPUT_DIR ?? "/output";
const POST_FILE = "POST.json";
const MAX_POST_BYTES = 16384;

// https://x.com/<handle>/status/<digits> or the same on twitter.com.
// Handles are 1-15 word characters; the id is digits only. A query string
// or fragment after the id is tolerated (the house reads past it).
const POST_URL_RE =
  /^https:\/\/(?:www\.|mobile\.)?(?:x\.com|twitter\.com)\/[A-Za-z0-9_]{1,15}\/status\/\d+(?:[?#].*)?$/;

function fail(message: string): never {
  console.error(`[gta6-meme-x-01] ERROR: ${message}`);
  process.exit(1);
}

const sourcePath = join(BOT_DIR, POST_FILE);
const targetPath = join(OUTPUT_DIR, POST_FILE);

let raw: Buffer;
try {
  raw = readFileSync(sourcePath);
} catch (err) {
  fail(`could not read ${sourcePath}: ${(err as Error).message}`);
}

if (raw.length === 0 || raw.length > MAX_POST_BYTES) {
  fail(`${POST_FILE} is ${raw.length} bytes (allowed: 1-${MAX_POST_BYTES})`);
}

let parsed: unknown;
try {
  parsed = JSON.parse(raw.toString("utf8"));
} catch (err) {
  fail(`${POST_FILE} is not valid JSON: ${(err as Error).message}`);
}

if (parsed === null || typeof parsed !== "object" || Array.isArray(parsed)) {
  fail(`${POST_FILE} must be a JSON object, got ${Array.isArray(parsed) ? "array" : typeof parsed}`);
}

const url = (parsed as Record<string, unknown>).url;
if (typeof url !== "string") {
  fail(`"url" in ${POST_FILE} must be a string, got ${typeof url}`);
}
if (url !== url.trim() || url.includes(" ")) {
  fail(`"url" in ${POST_FILE} must not contain whitespace: ${JSON.stringify(url)}`);
}
if (!POST_URL_RE.test(url)) {
  fail(`"url" in ${POST_FILE} is not an X post address (expected https://x.com/<handle>/status/<digits>): ${JSON.stringify(url)}`);
}

const handle = url.split("/")[3];

mkdirSync(OUTPUT_DIR, { recursive: true });
writeFileSync(targetPath, raw);
console.log(`[gta6-meme-x-01] validated ${POST_FILE} (${raw.length} bytes) for @${handle}: ${url}`);
console.log(`[gta6-meme-x-01] copied ${sourcePath} -> ${targetPath} (byte-identical)`);
