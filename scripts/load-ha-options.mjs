#!/usr/bin/env node
import { readFileSync } from "node:fs";

function shSingle(value) {
  return `'${String(value).replace(/'/g, `'\\''`)}'`;
}

const raw = readFileSync("/data/options.json", "utf8");
const options = JSON.parse(raw);
const map = {
  public_url: "BETTER_AUTH_URL",
  better_auth_secret: "BETTER_AUTH_SECRET",
  xai_api_key: "XAI_API_KEY",
  database_url: "DATABASE_URL",
};

for (const [key, envName] of Object.entries(map)) {
  const value = options[key];
  if (value == null || value === "") continue;
  process.stdout.write(`export ${envName}=${shSingle(value)}\n`);
}
