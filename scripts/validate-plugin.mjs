// Validates the plugin manifest exists and has the required fields.
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const manifestPath = join(root, ".claude-plugin", "plugin.json");

let manifest;
try {
  manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
} catch (err) {
  console.error(`FAIL cannot read/parse .claude-plugin/plugin.json: ${err.message}`);
  process.exit(1);
}

const errors = [];
for (const field of ["name", "version", "description"]) {
  if (typeof manifest[field] !== "string" || manifest[field].trim() === "") {
    errors.push(`plugin.json missing required string field: ${field}`);
  }
}
if (manifest.name && !/^[a-z0-9-]+$/.test(manifest.name)) {
  errors.push(`plugin.json name must be kebab-case: got "${manifest.name}"`);
}
if ("author" in manifest && (typeof manifest.author !== "object" || manifest.author === null)) {
  errors.push(
    `plugin.json author must be an object ({ name, email }), not a ${typeof manifest.author}`,
  );
}

if (errors.length > 0) {
  for (const e of errors) console.error(`FAIL ${e}`);
  process.exit(1);
}
console.log("Plugin manifest OK.");
