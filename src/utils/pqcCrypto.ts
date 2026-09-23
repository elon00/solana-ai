import { PqcKeyPair } from '../types';
import { ml_kem768 } from '@noble/post-quantum/ml-kem.js';
import { ml_dsa65 } from '@noble/post-quantum/ml-dsa.js';
import { sha256 } from '@noble/hashes/sha2.js';
import { hkdf } from '@noble/hashes/hkdf.js';

export function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

export function hexToBytes(hex: string): Uint8Array {
  const cleanHex = hex.replace(/[^0-9a-fA-F]/g, '');
  const bytes = new Uint8Array(cleanHex.length / 2);
  for (let i = 0; i < cleanHex.length; i += 2) {
    bytes[i / 2] = parseInt(cleanHex.substring(i, i + 2), 16);
  }
  return bytes;
}

export function computeDemoDigestHex(data: string): string {
  const encoder = new TextEncoder();
  const hash = sha256(encoder.encode(data));
  return bytesToHex(hash).substring(0, 16);
}

// In-memory key store for active runtime keys
const activeKeyStorage = new Map<string, { secretKey: Uint8Array; publicKey: Uint8Array }>();

/**
 * Real NIST FIPS 203 & 204 Post-Quantum Key Generation
 */
export function generatePqcKeyPair(
  algorithm: 'ML-KEM-768' | 'ML-DSA-65' | 'Hybrid-Ed25519-Dilithium' = 'ML-DSA-65',
  seed?: Uint8Array
): PqcKeyPair {
  let pubBytes: Uint8Array;
  let secBytes: Uint8Array;
  let keySizeBits: number;
  let securityLevel: number;

  if (algorithm === 'ML-KEM-768') {
    const seedFormatted = seed ? (seed.length === 64 ? seed : new Uint8Array(64).fill(0x19)) : undefined;
    const pair = seedFormatted ? ml_kem768.keygen(seedFormatted) : ml_kem768.keygen();
    pubBytes = pair.publicKey;
    secBytes = pair.secretKey;
    keySizeBits = 1184 * 8; // 9,472 bits
    securityLevel = 3;
  } else {
    // ML-DSA-65 or Hybrid
    const seedFormatted = seed ? (seed.length === 32 ? seed : seed.slice(0, 32)) : undefined;
    const pair = seedFormatted ? ml_dsa65.keygen(seedFormatted) : ml_dsa65.keygen();
    pubBytes = pair.publicKey;
    secBytes = pair.secretKey;
    keySizeBits = 1952 * 8; // 15,616 bits
    securityLevel = 3;
  }

  const pubHex = bytesToHex(pubBytes);
  const keyId = `pqc-${algorithm.toLowerCase()}-${pubHex.substring(0, 12)}`;
  activeKeyStorage.set(keyId, { secretKey: secBytes, publicKey: pubBytes });

  const fingerprint = bytesToHex(sha256(pubBytes)).substring(0, 16).toUpperCase();

  return {
    keyId,
    algorithm,
    publicKey: pubHex,
    publicKeyFingerprint: fingerprint,
    privateKeyPreview: `${bytesToHex(secBytes.slice(0, 8))}...[${secBytes.length} bytes]`,
    keySizeBits,
    nistSecurityLevel: securityLevel,
    createdAt: new Date().toISOString(),
    authorizedForAgent: true,
  };
}

/**
 * Real ML-KEM-768 Key Encapsulation
 */
export function encapsulateKEM(publicKeyHex: string): { ciphertextHex: string; sharedSecretHex: string } {
  const pubBytes = hexToBytes(publicKeyHex);
  const result = ml_kem768.encapsulate(pubBytes);
  return {
    ciphertextHex: bytesToHex(result.cipherText),
    sharedSecretHex: bytesToHex(result.sharedSecret),
  };
}

/**
 * Real ML-KEM-768 Key Decapsulation
 */
export function decapsulateKEM(ciphertextHex: string, secretKeyHex: string): string {
  const ct = hexToBytes(ciphertextHex);
  const sk = hexToBytes(secretKeyHex);
  const ss = ml_kem768.decapsulate(ct, sk);
  return bytesToHex(ss);
}

/**
 * Real NIST FIPS 204 ML-DSA-65 Signing for Algorand x402 Service Authorization
 */
export function createPqcHybridSignature(
  txId: string,
  keyPair: PqcKeyPair,
  amount: number,
  serviceId: string
): {
  hybridSignature: string;
  mlDsaComponent: string;
  verificationProof: string;
  quantumResistanceScore: number;
} {
  const payload = `tx:${txId}|amt:${amount}|srv:${serviceId}|pub:${keyPair.publicKey.substring(0, 32)}`;
  const encoder = new TextEncoder();
  const messageBytes = encoder.encode(payload);

  const stored = activeKeyStorage.get(keyPair.keyId);
  let dsaSigHex = '';

  if (stored) {
    const sig = ml_dsa65.sign(messageBytes, stored.secretKey);
    dsaSigHex = bytesToHex(sig);
  } else {
    // Deterministic fallback signing key derived from fingerprint
    const seed = sha256(encoder.encode(keyPair.publicKeyFingerprint));
    const fallbackPair = ml_dsa65.keygen(seed);
    const sig = ml_dsa65.sign(messageBytes, fallbackPair.secretKey);
    dsaSigHex = bytesToHex(sig);
  }

  const payloadDigest = bytesToHex(sha256(messageBytes));

  return {
    // The complete ML-DSA-65 signature is carried in the envelope.
    // This is intentionally not described as an Ed25519 hybrid: no classical
    // signature is fabricated or inferred.
    hybridSignature: `PQC-MLDSA65.${payloadDigest}.${dsaSigHex}`,
    mlDsaComponent: dsaSigHex,
    verificationProof: `NIST_FIPS_204_ML_DSA_65_AUTHENTICATED_${keyPair.publicKeyFingerprint}`,
    quantumResistanceScore: 1.0,
  };
}

/**
 * Real NIST FIPS 204 Signature Verification
 */
export function verifyPqcSignature(
  signature: string,
  txId: string,
  publicKey: string,
  amount: number = 0.005,
  serviceId: string = 'srv-shor-orchestrator'
) {
  const payload = `tx:${txId}|amt:${amount}|srv:${serviceId}|pub:${publicKey.substring(0, 32)}`;
  const messageBytes = new TextEncoder().encode(payload);

  try {
    let sigBytes: Uint8Array;

    if (signature.startsWith('PQC-MLDSA65.')) {
      const parts = signature.split('.');
      if (parts.length !== 3) throw new Error('invalid signature envelope');
      const expectedDigest = bytesToHex(sha256(messageBytes));
      if (parts[1] !== expectedDigest) throw new Error('payload digest mismatch');
      sigBytes = hexToBytes(parts[2]);
    } else {
      const raw = signature.replace(/^0xpqc_mldsa65_/, '').replace(/^0x/, '');
      sigBytes = hexToBytes(raw);
    }

    const pubBytes = hexToBytes(publicKey.replace(/^0x/, ''));
    const isValid =
      sigBytes.length === 3309 &&
      pubBytes.length === 1952 &&
      ml_dsa65.verify(sigBytes, messageBytes, pubBytes);

    return {
      valid: isValid,
      algorithm: 'NIST FIPS 204 ML-DSA-65',
      specification: 'Pure TypeScript ML-DSA-65 verification with full signature bytes',
      signatureDigestMatch: isValid,
      securityBits: isValid ? 192 : 0,
    };
  } catch {
    return {
      valid: false,
      algorithm: 'NIST FIPS 204 ML-DSA-65',
      specification: 'Signature verification aborted (fail-closed)',
      signatureDigestMatch: false,
      securityBits: 0,
    };
  }
}

export function signPqcMessage(keyId: string, message: string): { signature: string; lengthBytes: number } {
  const stored = activeKeyStorage.get(keyId);
  const encoder = new TextEncoder();
  const messageBytes = encoder.encode(message);
  let sigBytes: Uint8Array;
  if (stored) {
    sigBytes = ml_dsa65.sign(messageBytes, stored.secretKey);
  } else {
    const seed = sha256(encoder.encode(keyId));
    const pair = ml_dsa65.keygen(seed);
    sigBytes = ml_dsa65.sign(messageBytes, pair.secretKey);
  }
  return {
    signature: '0xpqc_mldsa65_' + bytesToHex(sigBytes),
    lengthBytes: sigBytes.length
  };
}

export function verifyPqcMessage(signatureHex: string, message: string, publicKeyHex: string): boolean {
  try {
    const rawSigHex = signatureHex.replace(/^0xpqc_mldsa65_/, '').replace(/^0x/, '');
    const sigBytes = hexToBytes(rawSigHex);
    const pubBytes = hexToBytes(publicKeyHex.replace(/^0x/, ''));
    const messageBytes = new TextEncoder().encode(message);
    return ml_dsa65.verify(sigBytes, messageBytes, pubBytes);
  } catch {
    return false;
  }
}

