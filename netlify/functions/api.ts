import type { Handler, HandlerEvent, HandlerContext } from "@netlify/functions";

const OFFICIAL_WALLET = "BPshPrMazV7qunhcq18AvCHjSceHbKytiRDNrtCv68g3";
const TESTNET_PROGRAM_ID = "Bnpd9YGaVxMAwdxFoVA3SQP1Vhfwv7jnJ67QNcyAVKq3";
const TOKEN_MINT = "4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, PAYMENT-SIGNATURE, X-Payment-Signature, x402-version",
  "Access-Control-Expose-Headers": "PAYMENT-REQUIRED, PAYMENT-RESPONSE, X-Payment-Required, X-Payment-Response",
};

export const handler: Handler = async (event: HandlerEvent, context: HandlerContext) => {
  if (event.httpMethod === "OPTIONS") {
    return {
      statusCode: 204,
      headers: CORS_HEADERS,
      body: "",
    };
  }

  const path = event.path || "";

  // 1. Status / Health endpoint
  if (path.endsWith("/status") || path.endsWith("/health")) {
    return {
      statusCode: 200,
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      body: JSON.stringify({
        status: "active",
        service: "Solana AI Platform",
        network: "solana-testnet",
        officialWallet: OFFICIAL_WALLET,
        solanaProgramId: TESTNET_PROGRAM_ID,
        supplyPolicy: "UNCAPPED_ELASTIC",
        postQuantum: {
          kem: "ML-KEM-768 research integration",
          dsa: "ML-DSA-65 research integration",
          localTests: "repository tests only",
          certification: "none; not independently FIPS-validated"
        },
        x402: {
          version: 2,
          bazaarEnabled: true,
          catalog: "/.well-known/x402-bazaar.json"
        }
      }),
    };
  }

  // 2. x402 Agent Action Endpoint
  if (path.includes("/x402/agent/action") || path.includes("/api/v1/x402")) {
    const paymentSig =
      event.headers["payment-signature"] ||
      event.headers["PAYMENT-SIGNATURE"] ||
      event.headers["x-payment-signature"];

    const paymentRequirement = {
      x402Version: 2,
      error: "PAYMENT-SIGNATURE header is required",
      resource: {
        url: path,
        description: "Solana AI Conway Orchestration and Post-Quantum Attestation Gate",
        mimeType: "application/json",
      },
      accepts: [
        {
          scheme: "exact",
          network: "solana:4uhcVJyU9pJkvQyS88uRDiswHXSCkY3z",
          amount: "1000",
          asset: TOKEN_MINT,
          payTo: OFFICIAL_WALLET,
          maxTimeoutSeconds: 60,
          extra: {
            name: "USDC",
            version: "2",
          },
        },
      ],
      extensions: {
        bazaar: {
          info: {
            input: {
              type: "http",
              method: "POST",
              bodyType: "json",
              body: { action: "CONWAY_ORCHESTRATE", payload: { steps: 1 } },
            },
            output: {
              type: "json",
              example: {
                success: true,
                protocol: "x402-v2",
                service: "solana-ai-agent-action",
              },
            },
          },
        },
      },
    };

    if (!paymentSig) {
      const encodedHeader = Buffer.from(JSON.stringify(paymentRequirement)).toString("base64");
      return {
        statusCode: 402,
        headers: {
          ...CORS_HEADERS,
          "Content-Type": "application/json",
          "PAYMENT-REQUIRED": encodedHeader,
          "X-Payment-Required": encodedHeader,
        },
        body: JSON.stringify(paymentRequirement),
      };
    }

    // Payment was supplied, but this Netlify adapter must not fabricate settlement.
    // Live x402 settlement is only successful after an external facilitator verifies
    // and settles the payment on-chain. Until that integration is configured here,
    // fail closed and return an explicit non-settlement response.
    return {
      statusCode: 503,
      headers: {
        ...CORS_HEADERS,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        success: false,
        verified: false,
        status: "SETTLEMENT_NOT_VERIFIED",
        protocol: "x402-v2",
        message: "A payment payload was supplied, but this endpoint has not independently verified and settled it. No transaction is fabricated.",
        nextStep: "Configure a compatible x402 facilitator and record the real Solana settlement transaction before returning paid content."
      }),
    };
  }

  // Fallback response for unmapped API routes
  return {
    statusCode: 200,
    headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    body: JSON.stringify({
      message: "Solana AI API Gateway is operational.",
      endpoints: [
        "/api/v1/status",
        "/api/v1/x402/agent/action",
        "/.well-known/x402-bazaar.json"
      ]
    }),
  };
};
