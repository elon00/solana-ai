export type SupportedWalletName = 'Phantom' | 'Solflare' | 'Backpack' | 'Brave' | 'Coinbase';

export interface PublicKeyLike {
  toString(): string;
}

export interface InjectedSolanaProvider {
  publicKey?: PublicKeyLike | string | null;
  connect(options?: { onlyIfTrusted?: boolean }): Promise<{ publicKey?: PublicKeyLike | string } | void>;
  disconnect(): Promise<void>;
  signTransaction?<T>(transaction: T): Promise<T>;
  signAllTransactions?<T>(transactions: T[]): Promise<T[]>;
  signMessage?(message: Uint8Array, display?: string): Promise<unknown>;
}

export interface SolanaWalletWindow {
  phantom?: { solana?: InjectedSolanaProvider };
  solflare?: InjectedSolanaProvider;
  backpack?: { solana?: InjectedSolanaProvider };
  braveSolana?: InjectedSolanaProvider;
  coinbaseSolana?: InjectedSolanaProvider;
}

export interface ConnectedWallet {
  name: string;
  address: string;
  provider: InjectedSolanaProvider;
}

function toAddress(value: PublicKeyLike | string | null | undefined): string | null {
  if (!value) return null;
  const address = typeof value === 'string' ? value : value.toString();
  return address.trim() || null;
}

export function discoverInjectedWallets(windowLike?: SolanaWalletWindow): Map<string, InjectedSolanaProvider> {
  const source = windowLike ?? (
    typeof window !== 'undefined' ? (window as unknown as SolanaWalletWindow) : undefined
  );
  const wallets = new Map<string, InjectedSolanaProvider>();
  if (!source) return wallets;

  if (source.phantom?.solana) wallets.set('Phantom', source.phantom.solana);
  if (source.solflare) wallets.set('Solflare', source.solflare);
  if (source.backpack?.solana) wallets.set('Backpack', source.backpack.solana);
  if (source.braveSolana) wallets.set('Brave', source.braveSolana);
  if (source.coinbaseSolana) wallets.set('Coinbase', source.coinbaseSolana);
  return wallets;
}

export class MultiWalletManager {
  private readonly providers = new Map<string, InjectedSolanaProvider>();
  private readonly connected = new Map<string, ConnectedWallet>();
  private activeWallet: string | null = null;

  constructor(initialProviders?: Map<string, InjectedSolanaProvider>) {
    for (const [name, provider] of initialProviders ?? discoverInjectedWallets()) {
      this.providers.set(name, provider);
    }
  }

  public register(name: string, provider: InjectedSolanaProvider): void {
    if (!name.trim()) throw new Error('Wallet name is required');
    this.providers.set(name, provider);
  }

  public availableWallets(): string[] {
    return [...this.providers.keys()].sort();
  }

  public connectedWallets(): ConnectedWallet[] {
    return [...this.connected.values()];
  }

  public getActiveWallet(): ConnectedWallet | null {
    return this.activeWallet ? this.connected.get(this.activeWallet) ?? null : null;
  }

  public async connect(name: string): Promise<ConnectedWallet> {
    const provider = this.providers.get(name);
    if (!provider) throw new Error(`Wallet provider not found: ${name}`);

    const response = await provider.connect();
    const address = toAddress(response && 'publicKey' in response ? response.publicKey : provider.publicKey);
    if (!address) throw new Error(`Wallet ${name} connected without exposing a public address`);

    const wallet = { name, address, provider };
    this.connected.set(name, wallet);
    this.activeWallet = name;
    return wallet;
  }

  public async disconnect(name: string): Promise<void> {
    const provider = this.providers.get(name);
    if (!provider) return;
    await provider.disconnect();
    this.connected.delete(name);
    if (this.activeWallet === name) {
      this.activeWallet = this.connected.keys().next().value ?? null;
    }
  }

  public selectActive(name: string): ConnectedWallet {
    const wallet = this.connected.get(name);
    if (!wallet) throw new Error(`Wallet is not connected: ${name}`);
    this.activeWallet = name;
    return wallet;
  }

  public async signTransaction<T>(transaction: T): Promise<T> {
    const wallet = this.getActiveWallet();
    if (!wallet) throw new Error('No active wallet');
    if (!wallet.provider.signTransaction) throw new Error(`${wallet.name} does not expose signTransaction`);
    return wallet.provider.signTransaction(transaction);
  }
}
