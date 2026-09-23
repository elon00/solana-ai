export type WalletName = 'Phantom' | 'Solflare' | 'Backpack';

export interface BrowserWalletProvider {
  isConnected?: boolean;
  publicKey?: { toString(): string } | null;
  connect(options?: { onlyIfTrusted?: boolean }): Promise<{ publicKey?: { toString(): string } } | void>;
  disconnect(): Promise<void>;
  signMessage?(message: Uint8Array, display?: string): Promise<{ signature: Uint8Array }>;
}

export interface ConnectedWallet {
  name: WalletName;
  address: string;
  provider: BrowserWalletProvider;
}

declare global {
  interface Window {
    solana?: BrowserWalletProvider & { isPhantom?: boolean };
    solflare?: BrowserWalletProvider;
    backpack?: BrowserWalletProvider;
  }
}

export function discoverWallets(win: Window = window): Map<WalletName, BrowserWalletProvider> {
  const wallets = new Map<WalletName, BrowserWalletProvider>();

  if (win.solana?.isPhantom) wallets.set('Phantom', win.solana);
  if (win.solflare) wallets.set('Solflare', win.solflare);
  if (win.backpack) wallets.set('Backpack', win.backpack);

  return wallets;
}

export class MultiWalletManager {
  private readonly providers: Map<WalletName, BrowserWalletProvider>;
  private readonly connected = new Map<WalletName, ConnectedWallet>();

  constructor(providers?: Map<WalletName, BrowserWalletProvider>) {
    this.providers = providers ?? discoverWallets();
  }

  listAvailable(): WalletName[] {
    return [...this.providers.keys()];
  }

  listConnected(): ConnectedWallet[] {
    return [...this.connected.values()];
  }

  async connect(name: WalletName): Promise<ConnectedWallet> {
    const provider = this.providers.get(name);
    if (!provider) throw new Error(`${name} wallet provider is not available`);

    const result = await provider.connect();
    const publicKey = result && 'publicKey' in result ? result.publicKey : provider.publicKey;
    const address = publicKey?.toString();
    if (!address) throw new Error(`${name} connected without a public key`);

    const wallet = { name, address, provider };
    this.connected.set(name, wallet);
    return wallet;
  }

  async disconnect(name: WalletName): Promise<void> {
    const wallet = this.connected.get(name);
    if (!wallet) return;
    await wallet.provider.disconnect();
    this.connected.delete(name);
  }

  async disconnectAll(): Promise<void> {
    for (const name of [...this.connected.keys()]) {
      await this.disconnect(name);
    }
  }
}
