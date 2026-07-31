// Validates every skill under skills/ has a well-formed SKILL.md:
//   - YAML frontmatter delimited by --- with `name` and `description`
//   - name is kebab-case and matches the directory name
//   - description is present and within a sensible length
//   - a non-empty body follows the frontmatter
import { readFileSync, readdirSync, existsSync, statSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const skillsDir = join(root, "skills");

if (!existsSync(skillsDir)) {
  console.log("No skills/ directory yet — nothing to validate.");
  process.exit(0);
}

const dirs = readdirSync(skillsDir).filter((n) => statSync(join(skillsDir, n)).isDirectory());

if (dirs.length === 0) {
  console.log("skills/ is empty — nothing to validate yet.");
  process.exit(0);
}

// Minimal frontmatter parser for simple `key: value` blocks.
function parseFrontmatter(text, errors, label) {
  if (!text.startsWith("---")) {
    errors.push(`${label}: missing opening --- frontmatter delimiter`);
    return { meta: {}, body: text };
  }
  const end = text.indexOf("\n---", 3);
  if (end === -1) {
    errors.push(`${label}: missing closing --- frontmatter delimiter`);
    return { meta: {}, body: "" };
  }
  const block = text.slice(3, end).trim();
  const body = text.slice(end + 4).trim();
  const meta = {};
  for (const line of block.split("\n")) {
    const m = line.match(/^([A-Za-z0-9_-]+):\s*(.*)$/);
    if (m) meta[m[1]] = m[2].replace(/^["']|["']$/g, "").trim();
  }
  return { meta, body };
}

let failures = 0;
for (const dir of dirs) {
  const label = `skills/${dir}`;
  const skillPath = join(skillsDir, dir, "SKILL.md");
  const errors = [];

  if (!existsSync(skillPath)) {
    console.error(`FAIL ${label}: no SKILL.md`);
    failures += 1;
    continue;
  }

  const text = readFileSync(skillPath, "utf8");
  const { meta, body } = parseFrontmatter(text, errors, label);

  if (!meta.name) errors.push(`${label}: frontmatter missing 'name'`);
  if (meta.name && !/^[a-z0-9-]+$/.test(meta.name))
    errors.push(`${label}: name must be kebab-case, got "${meta.name}"`);
  if (meta.name && meta.name !== dir)
    errors.push(`${label}: name "${meta.name}" must match directory "${dir}"`);
  if (!meta.description) errors.push(`${label}: frontmatter missing 'description'`);
  if (meta.description && meta.description.length < 20)
    errors.push(`${label}: description too short (min 20 chars)`);
  if (meta.description && meta.description.length > 1024)
    errors.push(`${label}: description too long (max 1024 chars)`);
  if (body.length < 40) errors.push(`${label}: SKILL.md body is empty or too short`);

  if (errors.length > 0) {
    for (const e of errors) console.error(`FAIL ${e}`);
    failures += 1;
  } else {
    console.log(`ok  ${label} (${meta.name})`);
  }
}

if (failures > 0) {
  console.error(`\n${failures} skill(s) failed validation.`);
  process.exit(1);
}
console.log(`All ${dirs.length} skill(s) valid.`);
