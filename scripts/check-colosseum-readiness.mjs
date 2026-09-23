import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const required = [
  'README.md',
  'LICENSE',
  'package.json',
  'package-lock.json',
  'program/Cargo.lock',
  '.github/workflows/ci.yml',
  '.github/workflows/security.yml',
  '.env.example',
  'scripts/colosseum-copilot.mjs',
  'COLOSSEUM_READINESS.md',
];

const failures = [];

for (const relative of required) {
  if (!fs.existsSync(path.join(root, relative))) {
    failures.push(`missing required repository artifact: ${relative}`);
  }
}

const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
for (const script of ['colosseum:setup', 'colosseum:verify', 'colosseum:update', 'colosseum:check']) {
  if (!pkg.scripts?.[script]) failures.push(`missing npm script: ${script}`);
}

const gitignore = fs.readFileSync(path.join(root, '.gitignore'), 'utf8');
if (!/^\.env$/m.test(gitignore)) failures.push('.gitignore must ignore .env');
if (!/^\.env\.\*$/m.test(gitignore)) failures.push('.gitignore must ignore .env.*');
if (!/^!\.env\.example$/m.test(gitignore)) failures.push('.gitignore must allow .env.example');

const ignoredDirs = new Set(['.git', 'node_modules', 'target', 'dist']);
const textExtensions = new Set(['', '.md', '.txt', '.json', '.yml', '.yaml', '.toml', '.js', '.mjs', '.cjs', '.ts', '.tsx', '.sh']);
const allowedPatValues = new Set(['your-token-here', 'YOUR_PAT', 'replace-me', '<token>', '<your-token>']);

function scan(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (ignoredDirs.has(entry.name)) continue;
    const full = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      scan(full);
      continue;
    }

    const ext = path.extname(entry.name).toLowerCase();
    if (!textExtensions.has(ext)) continue;

    let content;
    try {
      content = fs.readFileSync(full, 'utf8');
    } catch {
      continue;
    }

    for (const line of content.split(/\r?\n/)) {
      const match = line.match(/^\s*COLOSSEUM_COPILOT_PAT\s*=\s*["']?([^"'\s#]+)["']?/);
      if (!match) continue;
      const value = match[1];
      if (value && !allowedPatValues.has(value) && !value.startsWith('$')) {
        failures.push(`possible Colosseum PAT committed in ${path.relative(root, full)}`);
      }
    }
  }
}

scan(root);

if (failures.length) {
  console.error('Colosseum readiness checks failed:');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log('Automated Colosseum repository checks: PASS');
console.log('External/human submission steps remain intentionally outside CI (PAT, Arena registration, team/profile data, final videos, GTM/demand evidence, and portal submission).');
