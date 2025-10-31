import { http, createConfig } from 'wagmi';
import { getDefaultConfig } from '@rainbow-me/rainbowkit';

// Flow EVM Mainnet
const chainId = parseInt(import.meta.env.VITE_EVM_CHAIN_ID || '747');
const rpcUrl = import.meta.env.VITE_EVM_RPC_URL || 'https://mainnet.evm.nodes.onflow.org';

// Define Flow EVM Mainnet chain
export const flowEVM = {
  id: chainId,
  name: 'Flow EVM Mainnet',
  nativeCurrency: {
    decimals: 18,
    name: 'Flow',
    symbol: 'FLOW',
  },
  rpcUrls: {
    default: {
      http: [rpcUrl],
    },
    public: {
      http: [rpcUrl],
    },
  },
  blockExplorers: {
    default: {
      name: 'Flowscan',
      url: import.meta.env.VITE_BLOCK_EXPLORER_URL || 'https://flowscan.org',
    },
  },
  testnet: false,
};

// Configure wagmi with error handling for WalletConnect
// Suppress WalletConnect errors if no valid project ID
const walletConnectProjectId = import.meta.env.VITE_WALLETCONNECT_PROJECT_ID;

// Clean project ID (remove whitespace and newlines)
const cleanProjectId = walletConnectProjectId 
  ? walletConnectProjectId.toString().trim().replace(/\r\n/g, '').replace(/\n/g, '').replace(/\r/g, '')
  : null;

// Use valid project ID or fallback to dummy one
// Note: WalletConnect will not work without valid project ID, but MetaMask will still work
const projectId = cleanProjectId && cleanProjectId.length === 32 && cleanProjectId !== '0000000000000000000000000000000000000000'
  ? cleanProjectId
  : '11111111111111111111111111111111'; // 32 char dummy ID to prevent 403 errors

console.log('🔗 [wagmi] WalletConnect Project ID:', cleanProjectId ? '✅ Configured' : '⚠️ Using fallback');

// Suppress WalletConnect console errors (403, WebSocket errors, etc)
if (typeof window !== 'undefined') {
  const originalError = console.error;
  const originalWarn = console.warn;
  
  console.error = (...args) => {
    const errorStr = args.map(a => String(a)).join(' ');
    // Filter out WalletConnect/Reown errors that don't affect functionality
    if (
      errorStr.includes('403') ||
      errorStr.includes('Forbidden') ||
      errorStr.includes('cloud.reown.com') ||
      errorStr.includes('api.web3modal.org') ||
      errorStr.includes('WalletConnect') ||
      errorStr.includes('Reown') ||
      errorStr.includes('Project not found') ||
      errorStr.includes('Connection interrupted') ||
      errorStr.includes('WebSocket connection closed') ||
      errorStr.includes('allocateSocket') ||
      errorStr.includes('Allowlist')
    ) {
      // Silently ignore WalletConnect errors (MetaMask still works)
      return;
    }
    originalError.apply(console, args);
  };
  
  console.warn = (...args) => {
    const warnStr = args.map(a => String(a)).join(' ');
    // Filter out WalletConnect warnings
    if (
      warnStr.includes('WalletConnect') ||
      warnStr.includes('Reown') ||
      warnStr.includes('Failed to fetch remote project configuration')
    ) {
      return;
    }
    originalWarn.apply(console, args);
  };
}

export const wagmiConfig = getDefaultConfig({
  appName: 'FROTH PET',
  projectId: projectId,
  chains: [flowEVM],
  ssr: false,
});
