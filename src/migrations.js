/**
 * @module migrations
 * @description Runs one-time storage migrations between extension versions.
 * Each migration is identified by a target version and runs only once,
 * when the stored schema version is older than the migration's version.
 * The applied schema version is persisted in `pixelatoyConfig.schemaVersion`.
 */

import { CONFIG_KEY, DEFAULT_CONFIG } from "./helpers.js";

/**
 * Compares two semver strings.
 * @param {string} a
 * @param {string} b
 * @returns {number} Negative if a < b, 0 if equal, positive if a > b.
 */
function semverCompare(a, b) {
  const pa = a.split(".").map(Number);
  const pb = b.split(".").map(Number);
  for (let i = 0; i < 3; i++) {
    if ((pa[i] ?? 0) !== (pb[i] ?? 0)) return (pa[i] ?? 0) - (pb[i] ?? 0);
  }
  return 0;
}

/**
 * List of migrations ordered by version.
 * Each entry: { version: string, run: (config: object) => Promise<void> }
 */
const MIGRATIONS = [
  {
    version: "1.6.0",
    /**
     * Moves `pixelatoyLang` into `pixelatoyConfig.lang` and removes the old key.
     * @param {object} config - Current merged config.
     */
    run: (config) => new Promise(resolve => {
      chrome.storage.local.get("pixelatoyLang", res => {
        const oldLang = res["pixelatoyLang"];
        if (!oldLang) { resolve(); return; }
        chrome.storage.local.set({ [CONFIG_KEY]: { ...config, lang: oldLang } }, () => {
          chrome.storage.local.remove("pixelatoyLang", resolve);
        });
      });
    }),
  },
];

/**
 * Runs all pending migrations in order and updates schemaVersion in pixelatoyConfig.
 * Safe to call on every startup — already-applied migrations are skipped.
 * @returns {Promise<void>}
 */
export async function runMigrations() {
  const stored = await new Promise(resolve =>
    chrome.storage.local.get(CONFIG_KEY, res => resolve(res[CONFIG_KEY] || {}))
  );
  const config = { ...DEFAULT_CONFIG, ...stored };
  const schemaVersion = config.schemaVersion ?? "0.0.0";

  const pending = MIGRATIONS.filter(m => semverCompare(schemaVersion, m.version) < 0);
  if (pending.length === 0) return;

  for (const migration of pending) {
    await migration.run(config);
  }

  const latest = pending[pending.length - 1].version;
  chrome.storage.local.set({ [CONFIG_KEY]: { ...config, schemaVersion: latest } });
}
