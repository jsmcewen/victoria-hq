#!/usr/bin/env node
import { existsSync, readFileSync } from "node:fs";

function shSingle(value) {
  return `'${String(value).replace(/'/g, `'\\''`)}'`;
}

function cleanUrl(value) {
  return String(value).trim().replace(/\/+$/, "");
}

const candidates = [
  "/data/options.json",
  "/config/options.json",
  "/addon_config/options.json",
];
const path = candidates.find((p) => existsSync(p));
if (!path) {
  console.error("[victoria] no Home Assistant options.json found");
  process.exit(0);
}

const options = JSON.parse(readFileSync(path, "utf8"));
console.error(`[victoria] loaded ${path}`);

const map = {
  public_url: "BETTER_AUTH_URL",
  better_auth_secret: "BETTER_AUTH_SECRET",
  xai_api_key: "XAI_API_KEY",
  database_url: "DATABASE_URL",
};

for (const [key, envName] of Object.entries(map)) {
  const value = options[key];
  if (value == null || value === "") continue;
  const exported = key === "public_url" ? cleanUrl(value) : String(value);
  if (key === "public_url") {
    console.error(`[victoria] public_url=${exported}`);
  }
  process.stdout.write(`export ${envName}=${shSingle(exported)}\n`);
}
