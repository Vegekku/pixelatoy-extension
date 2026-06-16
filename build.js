import esbuild from "esbuild";
import { copyFileSync, mkdirSync, readFileSync, writeFileSync } from "fs";

const watch = process.argv.includes("--watch") || process.argv.includes("--test");
const test = process.argv.includes("--test");

mkdirSync("dist/icons", { recursive: true });

["icons/icon16.png", "icons/icon48.png", "icons/icon128.png", "src/popup.html", "src/privacy.html", "manifest.json"].forEach(f => {
  copyFileSync(f, `dist/${f.replace("src/", "")}`);
});

if (test) {
  const manifest = JSON.parse(readFileSync("dist/manifest.json", "utf8"));
  manifest.content_scripts[0].js.push("test-helpers.js");
  writeFileSync("dist/manifest.json", JSON.stringify(manifest, null, 2));
}

const entryPoints = {
  "content":    "src/content.js",
  "background": "src/background.js",
  "popup":      "src/popup.js",
};

if (test) {
  entryPoints["test-helpers"] = "test-helpers.js";
}

const ctx = await esbuild.context({
  entryPoints,
  bundle: true,
  minify: !watch,
  outdir: "dist",
  format: "esm",
  platform: "browser",
  target: "chrome110",
});

if (watch) {
  await ctx.watch();
  console.log("esbuild watching...");
} else {
  await ctx.rebuild();
  await ctx.dispose();
  console.log("Build done.");
}
