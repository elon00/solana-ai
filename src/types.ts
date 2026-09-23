export interface PqcKeyPair {
  keyId: string;
  algorithm: 'ML-KEM-768' | 'ML-DSA-65';
  publicKey: string;
  publicKeyFingerprint?: string;
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
  algorithm: 'ML-DSA-65';
  publicKey: string;
  timestamp: string;
  nistFipsStandard: string;
  verified: boolean;
}

export interface SolanaAiAgentTask {
  taskId: string;
  agentName: string;
  action: string;
  input?: unknown;
  result?: unknown;
  error?: string;
  proofSubject?: string;
  status: 'PENDING' | 'EXECUTING' | 'COMPLETED' | 'FAIL_CLOSED';
  pqcSignature?: string;
  executionTimestamp: string;
}
