import {
  SOLANA_DEVNET_CAIP2,
  X402_VERSION,
} from '../src/x402/protocol.js';
import { HTTPX402Facilitator } from '../src/x402/facilitator.js';

const url = process.env.X402_FACILITATOR_URL || 'https://x402.org/facilitator';
const facilitator = new HTTPX402Facilitator(url);
const supported = await facilitator.supported();

const exactDevnet = supported.kinds.some(
  (kind) =>
    kind.x402Version === X402_VERSION &&
    kind.scheme === 'exact' &&
    kind.network === SOLANA_DEVNET_CAIP2,
);

console.log(`x402 facilitator: ${url}`);
console.log(`Solana Devnet exact support: ${exactDevnet ? 'YES' : 'NO'}`);
console.log(`Advertised kinds: ${supported.kinds.length}`);

if (!exactDevnet) {
  throw new Error('Facilitator does not advertise x402 V2 exact support for Solana Devnet');
}
