#!/usr/bin/env node
/**
 * Guards the release: the manifest version, package.json and (in CI) the git
 * tag must agree, and every file the manifest points at must exist.
 */
const fs = require("node:fs");
const path = require("node:path");

const root = path.join(__dirname, "..");
const manifest = JSON.parse(fs.readFileSync(path.join(root, "manifest.json"), "utf8"));
const pkg = JSON.parse(fs.readFileSync(path.join(root, "package.json"), "utf8"));
const errors = [];

if (manifest.version !== pkg.version) {
  errors.push(`manifest.json is ${manifest.version} but package.json is ${pkg.version}`);
}

const tag = (process.env.GITHUB_REF_NAME || "").replace(/^v/, "");
if (tag && tag !== manifest.version) {
  errors.push(`git tag is v${tag} but manifest.json is ${manifest.version}`);
}

if (!/^\d+\.\d+(\.\d+)?(\.\d+)?$/.test(manifest.version)) {
  errors.push(`"${manifest.version}" is not a valid Chrome extension version`);
}

const referenced = [
  manifest.background && manifest.background.service_worker,
  manifest.action && manifest.action.default_popup,
  manifest.options_ui && manifest.options_ui.page,
  ...Object.values(manifest.icons || {}),
  ...(manifest.content_scripts || []).flatMap((cs) => [...(cs.js || []), ...(cs.css || [])]),
].filter(Boolean);

for (const file of referenced) {
  if (!fs.existsSync(path.join(root, file))) errors.push(`manifest references missing file: ${file}`);
}

// Anything the popup or options page loads must ship too.
for (const page of ["popup.html", "options.html"]) {
  const html = fs.readFileSync(path.join(root, page), "utf8");
  for (const m of html.matchAll(/(?:src|href)="([^"]+)"/g)) {
    const ref = m[1];
    if (/^(https?:)?\/\//.test(ref) || ref.startsWith("#")) continue;
    if (!fs.existsSync(path.join(root, ref))) errors.push(`${page} references missing file: ${ref}`);
  }
}

if (errors.length) {
  console.error("Manifest check failed:");
  for (const e of errors) console.error("  - " + e);
  process.exit(1);
}
console.log(`Manifest check passed (v${manifest.version}, ${referenced.length} files verified).`);
