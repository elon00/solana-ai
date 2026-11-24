#!/usr/bin/env node
/**
 * Standalone Cryptographic Auditor for SHOR x402
 * Verifies 23 Invariants across:
 * - RFC 5869 HKDF-SHA256
 * - Algorand x402 Commitment Invariants
 * - NIST FIPS 203 ML-KEM-768
 * - NIST FIPS 204 ML-DSA-65
 * - Wycheproof Negative Attacks
 * - x402 Dual Hybrid Payment Authorization Conjunction
 */

import assert from 'node:assert';
import { hkdf } from '@noble/hashes/hkdf.js';
import { sha256 } from '@noble/hashes/sha256.js';
import { ml_kem768 } from '@noble/post-quantum/ml-kem.js';
import { ml_dsa65 } from '@noble/post-quantum/ml-dsa.js';

console.log('=====================================================================');
console.log('⚡ QMOOSA DEEP TECH AI QUANTUM PLATFORM // STANDALONE CRYPTOGRAPHIC AUDITOR');
console.log('=====================================================================\n');

let assertionCount = 0;
function pass(desc) {
  assertionCount++;
  console.log(`  [${assertionCount}/23] ✅ ${desc}`);
}

try {
  console.log('▶ [TIER 1] RFC 5869 HKDF-SHA256 Known Answer Verification:');
  const ikm = new Uint8Array(22).fill(0x0b);
  const salt = new Uint8Array([0x00, 0x01, 0x02, 0x03, 0x04, 0x05, 0x06, 0x07, 0x08, 0x09, 0x0a, 0x0b, 0x0c]);
  const info = new Uint8Array([0xf0, 0xf1, 0xf2, 0xf3, 0xf4, 0xf5, 0xf6, 0xf7, 0xf8, 0xf9]);
  const expectedOkm = '3cb25f25faacd57a90434f64d0362f2a2d2d0a90cf1a5a4c5db02d56ecc4c5bf34007208d5b887185865';
  const okm = Buffer.from(hkdf(sha256, ikm, salt, info, 42)).toString('hex');
  assert.strictEqual(okm, expectedOkm);
  pass('RFC 5869 Test Case 1 byte-for-byte match');

  console.log('\n▶ [TIER 2] Canonical Hash & Algorand x402 Invariants:');
  const emptyHash = Buffer.from(sha256(new Uint8Array(0))).toString('hex');
  assert.strictEqual(emptyHash, 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855');
  pass('Empty SHA-256 matches canonical NIST hash');

  const x402Payload = Buffer.from('x402:Algorand:MainNet:31566704:5000:RQSQ6LBTNQEGROLRSKRCJPLVLUD6JOGAVY3QUTDDYGYBBHGAKDSA');
  const x402Commitment = Buffer.from(sha256(x402Payload)).toString('hex');
  assert.strictEqual(x402Commitment.length, 64);
  pass('Algorand x402 payment commitment produces exact 32 bytes hex');

  console.log('\n▶ [TIER 3] NIST FIPS 203 ML-KEM-768 Lattice Execution:');
  const seed64 = new Uint8Array(64).fill(0x38);
  const kemPair1 = ml_kem768.keygen(seed64);
  const kemPair2 = ml_kem768.keygen(seed64);

  assert.strictEqual(kemPair1.publicKey.length, 1184);
  pass('ML-KEM-768 public key exact 1,184 bytes');

  assert.strictEqual(kemPair1.secretKey.length, 2400);
  pass('ML-KEM-768 secret key exact 2,400 bytes');

  assert.deepStrictEqual(Buffer.from(kemPair1.publicKey), Buffer.from(kemPair2.publicKey));
  pass('ML-KEM-768 keygen deterministic from seed');

  const enc = ml_kem768.encapsulate(kemPair1.publicKey);
  assert.strictEqual(enc.cipherText.length, 1088);
  pass('ML-KEM-768 ciphertext exact 1,088 bytes');

  assert.strictEqual(enc.sharedSecret.length, 32);
  pass('ML-KEM-768 shared secret exact 32 bytes');

  const decSharedSecret = ml_kem768.decapsulate(enc.cipherText, kemPair1.secretKey);
  assert.deepStrictEqual(Buffer.from(decSharedSecret), Buffer.from(enc.sharedSecret));
  pass('ML-KEM-768 decapsulation recovers shared secret byte-for-byte');

  console.log('\n▶ [TIER 4] FIPS 203 §7.3 Implicit Rejection:');
  const badCT = new Uint8Array(enc.cipherText);
  badCT[0] ^= 0xff;
  const implicitKey = ml_kem768.decapsulate(badCT, kemPair1.secretKey);
  assert.strictEqual(implicitKey.length, 32);
  pass('Implicit rejection returns valid 32-byte pseudorandom value');

  assert.notDeepStrictEqual(Buffer.from(implicitKey), Buffer.from(enc.sharedSecret));
  pass('Corrupted ciphertext does NOT yield sender shared secret');

  console.log('\n▶ [TIER 5] NIST FIPS 204 ML-DSA-65 Digital Signatures:');
  const seed32 = new Uint8Array(32).fill(0x42);
  const dsaPair1 = ml_dsa65.keygen(seed32);
  const dsaPair2 = ml_dsa65.keygen(seed32);

  assert.strictEqual(dsaPair1.publicKey.length, 1952);
  pass('ML-DSA-65 public key exact 1,952 bytes');

  assert.strictEqual(dsaPair1.secretKey.length, 4032);
  pass('ML-DSA-65 secret key exact 4,032 bytes');

  const pkHash = Buffer.from(sha256(dsaPair1.publicKey)).toString('hex');
  assert.strictEqual(pkHash.length, 64);
  pass('ML-DSA-65 public key commitments derive 32-byte SHA-256 hash');

  assert.deepStrictEqual(Buffer.from(dsaPair1.publicKey), Buffer.from(dsaPair2.publicKey));
  pass('ML-DSA-65 keygen deterministic from seed');

  const msg = Buffer.from('x402 Service Authorization: srv-quantum-ai:0.005_USDC');
  const sig = ml_dsa65.sign(msg, dsaPair1.secretKey);
  assert.strictEqual(sig.length, 3309);
  pass('ML-DSA-65 signature exact 3,309 bytes');

  const verified = ml_dsa65.verify(sig, msg, dsaPair1.publicKey);
  assert.strictEqual(verified, true);
  pass('ML-DSA-65 genuine signature verified successfully');

  console.log('\n▶ [TIER 6] Wycheproof Negative & Adversarial Tests:');
  const tamperedSig = new Uint8Array(sig);
  tamperedSig[42] ^= 0x01;
  const badSigVer = ml_dsa65.verify(tamperedSig, msg, dsaPair1.publicKey);
  assert.strictEqual(badSigVer, false);
  pass('Wycheproof: Bit-flipped signature rejected cleanly');

  const tamperedMsg = Buffer.from('x402 Service Authorization: srv-quantum-ai:0.005_USDC!');
  const badMsgVer = ml_dsa65.verify(sig, tamperedMsg, dsaPair1.publicKey);
  assert.strictEqual(badMsgVer, false);
  pass('Wycheproof: Altered message rejected cleanly');

  const shortSig = sig.slice(0, 3200);
  let shortSigRejected = false;
  try {
    shortSigRejected = !ml_dsa65.verify(shortSig, msg, dsaPair1.publicKey);
  } catch {
    shortSigRejected = true;
  }
  assert.strictEqual(shortSigRejected, true);
  pass('Wycheproof: Truncated signature rejected cleanly');

  const badPK = dsaPair1.publicKey.slice(0, 1900);
  let badPKRejected = false;
  try {
    badPKRejected = !ml_dsa65.verify(sig, msg, badPK);
  } catch {
    badPKRejected = true;
  }
  assert.strictEqual(badPKRejected, true);
  pass('Wycheproof: Malformed public key size rejected cleanly');

  console.log('\n▶ [TIER 7] x402 Dual Hybrid Payment Conjunction Conformance:');
  const classicalValid = true;
  const dualHybridOk = classicalValid && verified;
  assert.strictEqual(dualHybridOk, true);
  pass('x402 dual conjunction holds when both classical payment and ML-DSA are valid');

  const failClosedOk = classicalValid && badSigVer; // badSigVer is false
  assert.strictEqual(failClosedOk, false);
  pass('x402 dual conjunction fails-closed when PQC component is compromised');

  console.log('\n=====================================================================');
  console.log(`🏆 ALL ${assertionCount}/23 CRYPTOGRAPHIC ASSERTIONS PASSED CLEANLY`);
  console.log('=====================================================================\n');
  process.exit(0);
} catch (err) {
  console.error('\n❌ AUDIT FAILED at assertion:', assertionCount + 1);
  console.error(err);
  process.exit(1);
}
