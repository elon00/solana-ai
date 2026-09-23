export interface PqcKeyPair {
  keyId: string;
  algorithm: 'ML-KEM-768' | 'ML-DSA-65' | 'Hybrid-Ed25519-Dilithium';
  publicKey: string;
  publicKeyFingerprint?: string;
  privateKeyPreview?: string;
  secretKey?: string;
  keySizeBits: number;
  nistSecurityLevel?: number;
  securityLevel?: number;
  createdAt?: string;
  generatedAt?: string;
  authorizedForAgent?: boolean;
}

export interface PqcProof {
  txId: string;
  payload: string;
  signature: string;
  algorithm: 'ML-DSA-65' | 'Hybrid-Ed25519-Dilithium';
  publicKey: string;
  timestamp: string;
  nistFipsStandard: string;
  verified: boolean;
}

export interface SolanaAiAgentTask {
  taskId: string;
  agentName: string;
  instruction: string;
  status: 'PENDING' | 'EXECUTING' | 'COMPLETED' | 'FAIL_CLOSED';
  pqcSignature?: string;
  executionTimestamp: string;
  output?: unknown;
  evidence?: Record<string, unknown>;
  error?: string;
}
