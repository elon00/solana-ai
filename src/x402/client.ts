import {
  X402_HEADERS,
  decodeX402Header,
  encodeX402Header,
  normalizeAtomicAmount,
  sameRequirement,
  validatePaymentPayload,
  validatePaymentRequired,
  type X402PaymentPayload,
  type X402PaymentRequired,
  type X402PaymentRequirements,
  type X402SettlementResponse,
} from './protocol.js';

export interface X402PaymentPolicy {
  allowedNetworks?: string[];
  allowedSchemes?: string[];
  allowedAssets?: string[];
  allowedPayTo?: string[];
  maxAtomicAmount?: bigint;
  allowedHosts?: string[];
}

export interface X402PaymentSignerContext {
  resource: X402PaymentRequired['resource'];
  requirements: X402PaymentRequirements;
  extensions?: X402PaymentRequired['extensions'];
}

export type X402PaymentSigner = (
  context: X402PaymentSignerContext,
) => Promise<Record<string, unknown>>;

export interface X402RequestResult {
  response: Response;
  paymentRequired?: X402PaymentRequired;
  paymentPayload?: X402PaymentPayload;
  settlement?: X402SettlementResponse;
}

function normalized(value: string): string {
  return value.trim().toLowerCase();
}

function validateUrl(url: URL, policy: X402PaymentPolicy): void {
  if (!['http:', 'https:'].includes(url.protocol)) throw new Error('x402 only supports HTTP(S) resources');
  if (policy.allowedHosts && !policy.allowedHosts.includes(url.hostname)) {
    throw new Error(`x402 host is not allowed: ${url.hostname}`);
  }
}

function chooseRequirement(
  required: X402PaymentRequired,
  policy: X402PaymentPolicy,
): X402PaymentRequirements {
  const matches = required.accepts.filter((item) => {
    if (policy.allowedNetworks && !policy.allowedNetworks.includes(item.network)) return false;
    if (policy.allowedSchemes && !policy.allowedSchemes.includes(item.scheme)) return false;
    if (policy.allowedAssets && !policy.allowedAssets.includes(item.asset)) return false;
    if (
      policy.allowedPayTo &&
      !policy.allowedPayTo.map(normalized).includes(normalized(item.payTo))
    ) {
      return false;
    }
    if (
      policy.maxAtomicAmount !== undefined &&
      normalizeAtomicAmount(item.amount) > policy.maxAtomicAmount
    ) {
      return false;
    }
    return true;
  });

  if (matches.length === 0) throw new Error('No x402 payment requirement passed the configured payment policy');
  return matches[0];
}

export class X402HttpClient {
  constructor(
    private readonly signer: X402PaymentSigner,
    private readonly policy: X402PaymentPolicy = {},
    private readonly fetchImpl: typeof fetch = fetch,
  ) {}

  async request(input: string | URL | Request, init?: RequestInit): Promise<X402RequestResult> {
    const original = new Request(input, init);
    validateUrl(new URL(original.url), this.policy);

    const initialResponse = await this.fetchImpl(original.clone());
    if (initialResponse.status !== 402) return { response: initialResponse };

    const requiredHeader = initialResponse.headers.get(X402_HEADERS.paymentRequired);
    if (!requiredHeader) throw new Error('HTTP 402 response is missing PAYMENT-REQUIRED');

    const paymentRequired = decodeX402Header<X402PaymentRequired>(requiredHeader);
    validatePaymentRequired(paymentRequired);

    if (new URL(paymentRequired.resource.url).origin !== new URL(original.url).origin) {
      throw new Error('x402 resource origin does not match the requested origin');
    }

    const selected = chooseRequirement(paymentRequired, this.policy);
    const payload = await this.signer({
      resource: paymentRequired.resource,
      requirements: selected,
      extensions: paymentRequired.extensions,
    });

    const paymentPayload: X402PaymentPayload = {
      x402Version: 2,
      resource: paymentRequired.resource,
      accepted: selected,
      payload,
      extensions: paymentRequired.extensions,
    };
    validatePaymentPayload(paymentPayload);

    if (!sameRequirement(paymentPayload.accepted, selected)) {
      throw new Error('x402 signer changed the selected payment requirements');
    }

    const headers = new Headers(original.headers);
    headers.set(X402_HEADERS.paymentSignature, encodeX402Header(paymentPayload));

    const paidRequest = new Request(original, { headers });
    const paidResponse = await this.fetchImpl(paidRequest);

    const settlementHeader = paidResponse.headers.get(X402_HEADERS.paymentResponse);
    const settlement = settlementHeader
      ? decodeX402Header<X402SettlementResponse>(settlementHeader)
      : undefined;

    if (paidResponse.ok && settlement && !settlement.success) {
      throw new Error(`x402 settlement failed: ${settlement.errorReason ?? 'unknown error'}`);
    }

    return {
      response: paidResponse,
      paymentRequired,
      paymentPayload,
      settlement,
    };
  }
}
