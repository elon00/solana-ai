import {
  X402_HEADERS,
  decodeX402Header,
  encodeX402Header,
  sameRequirement,
  validatePaymentPayload,
  validatePaymentRequired,
  type X402PaymentPayload,
  type X402PaymentRequired,
  type X402PaymentRequirements,
  type X402ResourceInfo,
  type X402SettlementResponse,
} from './protocol.js';
import type { X402Facilitator } from './facilitator.js';

export interface X402GateConfig {
  resource: X402ResourceInfo;
  accepts: X402PaymentRequirements[];
  facilitator: X402Facilitator;
}

export interface X402GateResponse<T = unknown> {
  status: number;
  headers: Record<string, string>;
  body: T;
}

export interface X402AuthorizedResult<T> {
  value: T;
  settlement: X402SettlementResponse;
  payer?: string;
}

export class X402ResourceGate {
  private readonly paymentRequired: X402PaymentRequired;

  constructor(private readonly config: X402GateConfig) {
    this.paymentRequired = {
      x402Version: 2,
      error: 'PAYMENT-SIGNATURE header is required',
      resource: config.resource,
      accepts: config.accepts,
      extensions: {},
    };
    validatePaymentRequired(this.paymentRequired);
  }

  challenge(error = 'PAYMENT-SIGNATURE header is required'): X402GateResponse<X402PaymentRequired> {
    const body = { ...this.paymentRequired, error };
    return {
      status: 402,
      headers: {
        [X402_HEADERS.paymentRequired]: encodeX402Header(body),
        'content-type': 'application/json',
      },
      body,
    };
  }

  async execute<T>(
    paymentSignatureHeader: string | null | undefined,
    handler: () => Promise<T> | T,
  ): Promise<X402GateResponse<X402AuthorizedResult<T> | X402PaymentRequired>> {
    if (!paymentSignatureHeader) return this.challenge();

    let paymentPayload: X402PaymentPayload;
    try {
      paymentPayload = decodeX402Header<X402PaymentPayload>(paymentSignatureHeader);
      validatePaymentPayload(paymentPayload);
    } catch (error) {
      return this.challenge(error instanceof Error ? error.message : 'Invalid PAYMENT-SIGNATURE');
    }

    const requirement = this.config.accepts.find((candidate) =>
      sameRequirement(candidate, paymentPayload.accepted),
    );
    if (!requirement) return this.challenge('Payment requirement is not accepted by this resource');

    const flow = requirement.extra?.paymentFlow;
    if (flow !== undefined && flow !== 'authorization') {
      return this.challenge(`Unsupported x402 payment flow: ${String(flow)}`);
    }

    const verification = await this.config.facilitator.verify(paymentPayload, requirement);
    if (!verification.isValid) {
      return this.challenge(verification.invalidReason ?? 'Payment verification failed');
    }

    const value = await handler();
    const settlement = await this.config.facilitator.settle(paymentPayload, requirement);
    if (!settlement.success) {
      throw new Error(`x402 settlement failed: ${settlement.errorReason ?? 'unknown error'}`);
    }

    return {
      status: 200,
      headers: {
        [X402_HEADERS.paymentResponse]: encodeX402Header(settlement),
        'content-type': 'application/json',
      },
      body: {
        value,
        settlement,
        payer: settlement.payer ?? verification.payer,
      },
    };
  }
}
