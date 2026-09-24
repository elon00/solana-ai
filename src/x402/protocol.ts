export const X402_VERSION = 2 as const;

export const X402_HEADERS = {
  paymentRequired: 'PAYMENT-REQUIRED',
  paymentSignature: 'PAYMENT-SIGNATURE',
  paymentResponse: 'PAYMENT-RESPONSE',
} as const;

export const SOLANA_DEVNET_CAIP2 = 'solana:EtWTRABZaYq6iMfeYKouRu166VU2xqa1';
export const SOLANA_MAINNET_CAIP2 = 'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp';
export const SOLANA_DEVNET_USDC_MINT = '4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU';
export const SOLANA_MAINNET_USDC_MINT = 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v';

export interface X402ResourceInfo {
  url: string;
  description?: string;
  mimeType?: string;
  serviceName?: string;
  tags?: string[];
  iconUrl?: string;
}

export interface X402PaymentRequirements {
  scheme: string;
  network: string;
  amount: string;
  asset: string;
  payTo: string;
  maxTimeoutSeconds: number;
  extra?: Record<string, unknown>;
}

export interface X402Extension {
  info: Record<string, unknown>;
  schema: Record<string, unknown>;
}

export type X402Extensions = Record<string, X402Extension>;

export interface X402PaymentRequired {
  x402Version: 2;
  error?: string;
  resource: X402ResourceInfo;
  accepts: X402PaymentRequirements[];
  extensions?: X402Extensions;
}

export interface X402PaymentPayload {
  x402Version: 2;
  resource?: X402ResourceInfo;
  accepted: X402PaymentRequirements;
  payload: Record<string, unknown>;
  extensions?: X402Extensions;
}

export interface X402VerifyResponse {
  isValid: boolean;
  invalidReason?: string;
  payer?: string;
  extensions?: Record<string, unknown>;
  extra?: Record<string, unknown>;
}

export interface X402SettlementResponse {
  success: boolean;
  payer?: string;
  transaction: string;
  network: string;
  errorReason?: string;
}

function bytesToBinary(bytes: Uint8Array): string {
  let output = '';
  for (const byte of bytes) output += String.fromCharCode(byte);
  return output;
}

function binaryToBytes(binary: string): Uint8Array {
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

export function encodeX402Header(value: unknown): string {
  const json = JSON.stringify(value);
  const buffer = (globalThis as unknown as { Buffer?: { from(input: string, encoding: string): { toString(encoding: string): string } } }).Buffer;
  if (buffer) return buffer.from(json, 'utf8').toString('base64');

  if (typeof btoa !== 'function') throw new Error('No base64 encoder is available');
  return btoa(bytesToBinary(new TextEncoder().encode(json)));
}

export function decodeX402Header<T>(encoded: string): T {
  if (!encoded || encoded.length > 256_000) throw new Error('Invalid x402 header length');

  const buffer = (globalThis as unknown as {
    Buffer?: { from(input: string, encoding: string): { toString(encoding: string): string } };
  }).Buffer;

  const json = buffer
    ? buffer.from(encoded, 'base64').toString('utf8')
    : new TextDecoder().decode(binaryToBytes(atob(encoded)));

  const parsed = JSON.parse(json) as T;
  return parsed;
}

export function normalizeAtomicAmount(value: string): bigint {
  if (!/^(0|[1-9][0-9]*)$/.test(value)) throw new Error('x402 amount must be a non-negative integer string');
  return BigInt(value);
}

export function sameRequirement(a: X402PaymentRequirements, b: X402PaymentRequirements): boolean {
  return (
    a.scheme === b.scheme &&
    a.network === b.network &&
    a.amount === b.amount &&
    a.asset === b.asset &&
    a.payTo === b.payTo &&
    a.maxTimeoutSeconds === b.maxTimeoutSeconds &&
    JSON.stringify(a.extra ?? {}) === JSON.stringify(b.extra ?? {})
  );
}

export function validatePaymentRequired(value: X402PaymentRequired): void {
  if (value.x402Version !== X402_VERSION) throw new Error('Unsupported x402 version');
  if (!value.resource?.url) throw new Error('x402 resource URL is required');
  if (!Array.isArray(value.accepts) || value.accepts.length === 0) throw new Error('x402 accepts[] is required');

  for (const requirement of value.accepts) {
    if (!requirement.scheme || !requirement.network || !requirement.asset || !requirement.payTo) {
      throw new Error('Incomplete x402 payment requirement');
    }
    normalizeAtomicAmount(requirement.amount);
    if (!Number.isInteger(requirement.maxTimeoutSeconds) || requirement.maxTimeoutSeconds <= 0) {
      throw new Error('Invalid x402 maxTimeoutSeconds');
    }
  }
}

export function validatePaymentPayload(value: X402PaymentPayload): void {
  if (value.x402Version !== X402_VERSION) throw new Error('Unsupported x402 version');
  if (!value.accepted || !value.payload || typeof value.payload !== 'object') {
    throw new Error('Malformed x402 payment payload');
  }
  normalizeAtomicAmount(value.accepted.amount);
}
