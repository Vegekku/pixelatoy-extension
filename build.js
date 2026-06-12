import esbuild from "esbuild";
import { copyFileSync, mkdirSync } from "fs";

const watch = process.argv.includes("--watch");

mkdirSync("dist/icons", { recursive: true });

["icons/icon16.png", "icons/icon48.png", "icons/icon128.png", "src/popup.html", "src/privacy.html", "manifest.json"].forEach(f => {
  copyFileSync(f, `dist/${f.replace("src/", "")}`);
});

const ctx = await esbuild.context({
  entryPoints: {
    "content":    "src/content.js",
    "background": "src/background.js",
    "popup":      "src/popup.js",
  },
  bundle: true,
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
