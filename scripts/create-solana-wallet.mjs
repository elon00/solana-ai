#!/usr/bin/env node
import { mkdirSync, existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';

const target = resolve(process.argv[2] || '.secrets/solana-testnet-deployer.json');

function run(args, stdio = 'inherit') {
  const result = spawnSync('solana-keygen', args, { stdio, encoding: 'utf8' });
  if (result.error) {
    console.error('solana-keygen is required. Install the current Agave/Solana CLI first.');
    process.exit(1);
  }
  if (result.status !== 0) process.exit(result.status ?? 1);
  return result.stdout?.trim() ?? '';
}

run(['--version'], 'pipe');

if (existsSync(target)) {
  console.error(`Refusing to overwrite existing wallet: ${target}`);
  process.exit(2);
}

mkdirSync(dirname(target), { recursive: true, mode: 0o700 });
run(['new', '--outfile', target, '--silent', '--no-bip39-passphrase']);

const address = run(['pubkey', target], 'pipe');
console.log(`Created local Solana keypair: ${target}`);
console.log(`Public address: ${address}`);
console.log('Private key material remains only in the ignored local file. Back it up securely.');
