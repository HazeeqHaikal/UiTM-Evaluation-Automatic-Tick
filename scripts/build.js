#!/usr/bin/env node
/** Produce the zip that gets uploaded to the Chrome Web Store. */
const fs = require("node:fs");
const path = require("node:path");
const { execFileSync } = require("node:child_process");

const root = path.join(__dirname, "..");
const manifest = JSON.parse(fs.readFileSync(path.join(root, "manifest.json"), "utf8"));

const INCLUDE = [
  "manifest.json",
  "background.js",
  "content.js",
  "popup.html",
  "popup.js",
  "popup.css",
  "options.html",
  "options.js",
  "options.css",
  "icon128.png",
  "src",
  "PRIVACY_POLICY.md",
];

const outDir = path.join(root, "dist");
fs.rmSync(outDir, { recursive: true, force: true });
fs.mkdirSync(outDir, { recursive: true });

const zipName = `uitm-evaluation-auto-fill-${manifest.version}.zip`;
const zipPath = path.join(outDir, zipName);

for (const entry of INCLUDE) {
  if (!fs.existsSync(path.join(root, entry))) {
    console.error(`Missing required file: ${entry}`);
    process.exit(1);
  }
}

execFileSync("zip", ["-r", "-q", "-X", zipPath, ...INCLUDE], { cwd: root });

const size = fs.statSync(zipPath).size;
console.log(`Built dist/${zipName} (${(size / 1024).toFixed(1)} KB)`);
