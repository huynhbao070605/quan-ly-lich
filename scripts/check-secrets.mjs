import { readdir, readFile } from "node:fs/promises";
import path from "node:path";

const root = process.cwd();
const scanRoots = ["src", "public", "tests", "scripts"];
const serviceRoleIdentifier = "SUPABASE_SERVICE_ROLE_KEY";
const allowedIdentifierFiles = new Set([
  path.normalize("src/lib/supabase/admin.ts"),
  path.normalize("src/lib/supabase/env.test.ts"),
  path.normalize("scripts/check-secrets.mjs"),
]);
const secretValues = [process.env.SUPABASE_SERVICE_ROLE_KEY]
  .filter(Boolean)
  .filter((value) => value.length >= 12);

async function listFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const fullPath = path.join(directory, entry.name);

    if (entry.isDirectory()) {
      if ([".next", "node_modules", "test-results", "playwright-report"].includes(entry.name)) {
        continue;
      }
      files.push(...await listFiles(fullPath));
      continue;
    }

    files.push(fullPath);
  }

  return files;
}

function isTextFile(filePath) {
  return /\.(?:cjs|css|html|js|json|jsx|mjs|md|ts|tsx|txt|yaml|yml)$/i.test(filePath);
}

const violations = [];

for (const scanRoot of scanRoots) {
  const absoluteRoot = path.join(root, scanRoot);
  const files = await listFiles(absoluteRoot).catch(() => []);

  for (const file of files.filter(isTextFile)) {
    const relative = path.normalize(path.relative(root, file));
    const text = await readFile(file, "utf8");

    if (text.includes(serviceRoleIdentifier) && !allowedIdentifierFiles.has(relative)) {
      violations.push(`${relative}: references ${serviceRoleIdentifier}`);
    }

    for (const secret of secretValues) {
      if (text.includes(secret)) {
        violations.push(`${relative}: contains the configured Supabase service-role secret value`);
      }
    }
  }
}

if (violations.length > 0) {
  console.error("Secret scan failed:");
  for (const violation of violations) {
    console.error(`- ${violation}`);
  }
  process.exit(1);
}

console.log("Secret scan passed.");
