// Validates that every JSON Schema compiles and that each example fixture
// validates against its schema. Keeps the data contract honest.
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import Ajv from "ajv";
import addFormats from "ajv-formats";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const read = (p) => JSON.parse(readFileSync(join(root, p), "utf8"));

const pairs = [
  { schema: "schemas/config.schema.json", example: "schemas/examples/config.example.json" },
  { schema: "schemas/profile.schema.json", example: "schemas/examples/profile.example.json" },
  {
    schema: "schemas/resume-prefs.schema.json",
    example: "schemas/examples/resume-prefs.example.json",
  },
  { schema: "schemas/jobs.schema.json", example: "schemas/examples/jobs.example.json" },
];

const ajv = new Ajv({ allErrors: true, strict: true });
addFormats(ajv);

let failures = 0;
for (const { schema, example } of pairs) {
  let validate;
  try {
    validate = ajv.compile(read(schema));
  } catch (err) {
    console.error(`SCHEMA FAILED to compile: ${schema}\n  ${err.message}`);
    failures += 1;
    continue;
  }
  const data = read(example);
  if (validate(data)) {
    console.log(`ok  ${example} matches ${schema}`);
  } else {
    console.error(`FAIL ${example} does not match ${schema}`);
    for (const e of validate.errors) {
      console.error(`  ${e.instancePath || "/"} ${e.message}`);
    }
    failures += 1;
  }
}

if (failures > 0) {
  console.error(`\n${failures} schema check(s) failed.`);
  process.exit(1);
}
console.log("All schema checks passed.");
