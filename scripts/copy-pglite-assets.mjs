#!/usr/bin/env node
import { copyFileSync, existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const srcDir = join(root, "node_modules/@electric-sql/pglite/dist");
const destDirs = [
  join(root, ".output/server/_libs"),
  join(root, ".vercel/output/functions/__server.func/_libs"),
];
const files = ["pglite.data", "pglite.wasm", "initdb.wasm"];

for (const dest of destDirs) {
  if (!existsSync(dirname(dest))) continue;
  mkdirSync(dest, { recursive: true });
  for (const file of files) {
    const from = join(srcDir, file);
    if (!existsSync(from)) continue;
    copyFileSync(from, join(dest, file));
  }
}

// Vite emits different hashes for client vs SSR CSS. Nitro only serves the
// client file listed in .output/server/index.mjs, so rewrite SSR bundles to
// that href or the HTML 404s the stylesheet.
const serverDir = join(root, ".output/server");
const indexPath = join(serverDir, "index.mjs");
if (existsSync(indexPath)) {
  const indexSource = readFileSync(indexPath, "utf8");
  const served = indexSource.match(/"(\/assets\/styles-[^"]+\.css)"/);
  if (served) {
    const target = served[1];
    const pattern = /\/assets\/styles-[A-Za-z0-9_-]+\.css/g;
    const walk = (dir) => {
      for (const entry of readdirSync(dir, { withFileTypes: true })) {
        const path = join(dir, entry.name);
        if (entry.isDirectory()) {
          walk(path);
          continue;
        }
        if (!entry.name.endsWith(".mjs") && !entry.name.endsWith(".js")) continue;
        const text = readFileSync(path, "utf8");
        const next = text.replace(pattern, target);
        if (next !== text) writeFileSync(path, next);
      }
    };
    walk(serverDir);
  }
}
