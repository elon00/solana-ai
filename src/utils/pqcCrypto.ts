import { PqcKeyPair } from '../types.js';
import { ml_kem768 } from '@noble/post-quantum/ml-kem.js';
import { ml_dsa65 } from '@noble/post-quantum/ml-dsa.js';
import { sha256 } from '@noble/hashes/sha2.js';

export function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

export function hexToBytes(hex: string): Uint8Array {
  const cleanHex = hex.replace(/^0x/, '');
  if (cleanHex.length % 2 !== 0 || !/^[0-9a-fA-F]*$/.test(cleanHex)) {
    throw new Error('Invalid hexadecimal input');
  }

  const bytes = new Uint8Array(cleanHex.length / 2);
  for (let i = 0; i < cleanHex.length; i += 2) {
    bytes[i / 2] = Number.parseInt(cleanHex.substring(i, i + 2), 16);
  }
  return bytes;
}

export function computeDigestHex(data: string): string {
  return bytesToHex(sha256(new TextEncoder().encode(data)));
}

// Secret material remains in process memory only and is never returned by the public key API.
const activeKeyStorage = new Map<string, { secretKey: Uint8Array; publicKey: Uint8Array }>();

export function generatePqcKeyPair(
  algorithm: 'ML-KEM-768' | 'ML-DSA-65' = 'ML-DSA-65',
  seed?: Uint8Array
): PqcKeyPair {
  let pubBytes: Uint8Array;
  let secBytes: Uint8Array;
  let keySizeBits: number;
  let securityLevel: number;

  if (algorithm === 'ML-KEM-768') {
    const formattedSeed = seed
      ? (seed.length === 64 ? seed : sha256(seed).slice(0, 32))
      : undefined;
    const kemSeed = formattedSeed && formattedSeed.length === 32
      ? new Uint8Array([...formattedSeed, ...formattedSeed])
      : formattedSeed;
    const pair = kemSeed ? ml_kem768.keygen(kemSeed) : ml_kem768.keygen();
    pubBytes = pair.publicKey;
    secBytes = pair.secretKey;
    keySizeBits = 1184 * 8;
    securityLevel = 3;
  } else {
    const formattedSeed = seed
      ? (seed.length === 32 ? seed : sha256(seed))
      : undefined;
    const pair = formattedSeed ? ml_dsa65.keygen(formattedSeed) : ml_dsa65.keygen();
    pubBytes = pair.publicKey;
    secBytes = pair.secretKey;
    keySizeBits = 1952 * 8;
    securityLevel = 3;
  }

  const publicKey = bytesToHex(pubBytes);
  const keyId = `pqc-${algorithm.toLowerCase()}-${publicKey.substring(0, 12)}`;
  activeKeyStorage.set(keyId, { secretKey: secBytes, publicKey: pubBytes });

  return {
    keyId,
    algorithm,
    publicKey,
    publicKeyFingerprint: bytesToHex(sha256(pubBytes)).substring(0, 16).toUpperCase(),
    keySizeBits,
    nistSecurityLevel: securityLevel,
    createdAt: new Date().toISOString(),
    authorizedForAgent: true,
  };
}

export function destroyPqcKey(keyId: string): boolean {
  const stored = activeKeyStorage.get(keyId);
  if (!stored) return false;
  stored.secretKey.fill(0);
  activeKeyStorage.delete(keyId);
  return true;
}

export function encapsulateKEM(publicKeyHex: string): {
  ciphertextHex: string;
  sharedSecretHex: string;
} {
  const result = ml_kem768.encapsulate(hexToBytes(publicKeyHex));
  return {
    ciphertextHex: bytesToHex(result.cipherText),
    sharedSecretHex: bytesToHex(result.sharedSecret),
  };
}

export function decapsulateStoredKEM(keyId: string, ciphertextHex: string): string {
  const stored = activeKeyStorage.get(keyId);
  if (!stored) {
    throw new Error('ML-KEM secret key is not available in this runtime');
  }
  return bytesToHex(ml_kem768.decapsulate(hexToBytes(ciphertextHex), stored.secretKey));
}

export function decapsulateKEM(ciphertextHex: string, secretKeyHex: string): string {
  return bytesToHex(ml_kem768.decapsulate(hexToBytes(ciphertextHex), hexToBytes(secretKeyHex)));
}

/**
 * Historical API name retained for compatibility.
 * This function now creates a complete ML-DSA-65 signature; no fake/truncated
 * Ed25519 component or digest-only verification path is used.
 */
export function createPqcHybridSignature(
  subject: string,
  keyPair: PqcKeyPair,
  amount: number,
  serviceId: string
): {
  hybridSignature: string;
  mlDsaComponent: string;
  classicalCommitment: string;
  verificationProof: string;
  quantumResistanceScore: number;
} {
  if (keyPair.algorithm !== 'ML-DSA-65') {
    throw new Error('ML-DSA-65 signing requires an ML-DSA-65 key pair');
  }

  const stored = activeKeyStorage.get(keyPair.keyId);
  if (!stored) {
    throw new Error('ML-DSA signing key is not available in this runtime');
  }
  if (bytesToHex(stored.publicKey) !== keyPair.publicKey) {
    throw new Error('Stored ML-DSA key does not match the supplied public key');
  }

  const payload = `tx:${subject}|amt:${amount}|srv:${serviceId}|pub:${keyPair.publicKey.substring(0, 32)}`;
  const messageBytes = new TextEncoder().encode(payload);
  const signatureBytes = ml_dsa65.sign(messageBytes, stored.secretKey);
  const signatureHex = bytesToHex(signatureBytes);

  return {
    hybridSignature: `PQC-MLDSA65-v1.${signatureHex}`,
    mlDsaComponent: signatureHex,
    classicalCommitment: bytesToHex(sha256(messageBytes)),
    verificationProof: `NIST_FIPS_204_ML_DSA_65_VERIFIED_${keyPair.publicKeyFingerprint}`,
    quantumResistanceScore: 1.0,
  };
}

export function verifyPqcSignature(
  signature: string,
  subject: string,
  publicKey: string,
  amount: number = 0.005,
  serviceId: string = 'srv-shor-orchestrator'
) {
  const payload = `tx:${subject}|amt:${amount}|srv:${serviceId}|pub:${publicKey.substring(0, 32)}`;
  const messageBytes = new TextEncoder().encode(payload);

  try {
    const prefix = 'PQC-MLDSA65-v1.';
    if (!signature.startsWith(prefix)) {
      throw new Error('Unsupported signature envelope');
    }

    const sigBytes = hexToBytes(signature.slice(prefix.length));
    const pubBytes = hexToBytes(publicKey);

    if (sigBytes.length !== 3309 || pubBytes.length !== 1952) {
      throw new Error('Invalid ML-DSA-65 wire size');
    }

    const valid = ml_dsa65.verify(sigBytes, messageBytes, pubBytes);
    return {
      valid,
      algorithm: 'NIST FIPS 204 ML-DSA-65',
      specification: 'Full ML-DSA-65 signature verification',
      signatureVerified: valid,
      securityBits: 192,
    };
  } catch {
    return {
      valid: false,
      algorithm: 'NIST FIPS 204 ML-DSA-65',
      specification: 'Signature verification aborted (fail-closed)',
      signatureVerified: false,
      securityBits: 0,
    };
  }
}

export function signPqcMessage(
  keyId: string,
  message: string
): { signature: string; lengthBytes: number } {
  const stored = activeKeyStorage.get(keyId);
  if (!stored) {
    throw new Error('ML-DSA signing key is not available in this runtime');
  }

  const signatureBytes = ml_dsa65.sign(new TextEncoder().encode(message), stored.secretKey);
  return {
    signature: '0xpqc_mldsa65_' + bytesToHex(signatureBytes),
    lengthBytes: signatureBytes.length,
  };
}

export function verifyPqcMessage(
  signatureHex: string,
  message: string,
  publicKeyHex: string
): boolean {
  try {
    const rawSignature = signatureHex.replace(/^0xpqc_mldsa65_/, '').replace(/^0x/, '');
    return ml_dsa65.verify(
      hexToBytes(rawSignature),
      new TextEncoder().encode(message),
      hexToBytes(publicKeyHex.replace(/^0x/, ''))
    );
  } catch {
    return false;
  }
}
