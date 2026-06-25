/**
 * @module zip
 * @description Generates a distributable zip for the Chrome Web Store.
 * Checks out the specified git tag (or latest tag if none given), runs the
 * production build, zips dist/ into releases/pixelatoy-extension-vX.Y.Z.zip,
 * and returns to the develop branch.
 *
 * Usage: node zip.js [vX.Y.Z]
 */

import { execSync } from "child_process";
import { mkdirSync, existsSync } from "fs";
import { resolve } from "path";

/**
 * Runs a shell command synchronously and returns its stdout.
 * @param {string} cmd - Command to execute.
 * @returns {string} Trimmed stdout output.
 */
function run(cmd) {
  return execSync(cmd, { stdio: ["inherit", "pipe", "inherit"] }).toString().trim();
}

const requestedTag = process.argv[2];
const tag = requestedTag ?? run("git describe --tags --abbrev=0");

if (!tag) {
  console.error("No git tags found.");
  process.exit(1);
}

const version = tag.replace(/^v/, "");
const zipName = `pixelatoy-extension-${tag}.zip`;
const releasesDir = resolve("releases");
const zipPath = resolve(releasesDir, zipName);

if (existsSync(zipPath)) {
  console.log(`Package already exists: releases/${zipName}`);
  process.exit(0);
}

console.log(`Checking out ${tag}...`);
run(`git checkout ${tag}`);

try {
  console.log("Building...");
  run("node build.js");

  mkdirSync(releasesDir, { recursive: true });

  console.log(`Zipping dist/ → releases/${zipName}...`);
  run(`zip -r "${zipPath}" dist/`);

  console.log(`Package ready: releases/${zipName}`);
} finally {
  console.log("Returning to develop...");
  run("git checkout develop");
}
