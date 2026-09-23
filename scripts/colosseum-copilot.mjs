import { spawnSync } from 'node:child_process';

const DEFAULT_API_BASE = 'https://copilot.colosseum.com/api/v1';
const command = process.argv[2] ?? 'verify';
const apiBase = (process.env.COLOSSEUM_COPILOT_API_BASE || DEFAULT_API_BASE).replace(/\/$/, '');
const pat = process.env.COLOSSEUM_COPILOT_PAT;
const agents = (process.env.COLOSSEUM_COPILOT_AGENTS || 'codex,claude-code,openclaw')
  .split(',')
  .map((value) => value.trim())
  .filter(Boolean);

function requirePat() {
  if (!pat || pat === 'your-token-here' || pat === 'YOUR_PAT') {
    console.error('COLOSSEUM_COPILOT_PAT is not set.');
    console.error('Generate/copy your Colosseum Copilot PAT, then export it before running this command.');
    process.exit(2);
  }
}

function runSkills(args) {
  const executable = process.platform === 'win32' ? 'npx.cmd' : 'npx';
  const result = spawnSync(executable, ['--yes', 'skills', ...args], {
    stdio: 'inherit',
    env: process.env,
  });

  if (result.error) {
    throw result.error;
  }
  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

async function verify() {
  requirePat();

  const response = await fetch(`${apiBase}/status`, {
    headers: {
      Authorization: `Bearer ${pat}`,
      Accept: 'application/json',
    },
    signal: AbortSignal.timeout(10_000),
  });

  let body;
  try {
    body = await response.json();
  } catch {
    body = null;
  }

  if (!response.ok || body?.authenticated !== true) {
    console.error(`Colosseum Copilot authentication failed (HTTP ${response.status}).`);
    if (response.status === 401) {
      console.error('The PAT is missing, malformed, or expired. Generate a new token in Colosseum Arena.');
    }
    process.exit(1);
  }

  console.log('Colosseum Copilot: authenticated');
  if (body.expiresAt) console.log(`Token expires: ${body.expiresAt}`);
  if (body.scope) console.log(`Scope: ${body.scope}`);
}

async function setup() {
  requirePat();

  if (agents.length === 0) {
    console.error('No target agents configured. Set COLOSSEUM_COPILOT_AGENTS.');
    process.exit(2);
  }

  const args = ['add', 'ColosseumOrg/colosseum-copilot'];
  for (const agent of agents) {
    args.push('-a', agent);
  }
  args.push('-y');

  console.log(`Installing Colosseum Copilot for: ${agents.join(', ')}`);
  runSkills(args);
  await verify();
  console.log('Colosseum Copilot setup complete.');
}

async function update() {
  requirePat();
  runSkills(['update', '-y']);
  await verify();
  console.log('Colosseum Copilot update complete.');
}

try {
  if (command === 'setup') {
    await setup();
  } else if (command === 'verify') {
    await verify();
  } else if (command === 'update') {
    await update();
  } else {
    console.error('Usage: node scripts/colosseum-copilot.mjs <setup|verify|update>');
    process.exit(2);
  }
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
}
