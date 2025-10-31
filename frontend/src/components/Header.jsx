import { useAccount } from 'wagmi';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { useStore } from '../state/useStore';
import { useFrothBalance } from '../hooks/useFrothBalance';
import { formatEther } from 'viem';
import { Gamepad2, Coins } from 'lucide-react';

export default function Header() {
  const { address, isConnected } = useAccount();
  const { balance } = useFrothBalance();

  return (
    <header className="bg-white border-b-2 border-green-200 shadow-sm sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 py-3 flex justify-between items-center">
        {/* Logo / Title */}
        <div className="flex items-center gap-2">
          <Gamepad2 className="text-green-600" size={32} strokeWidth={2.5} />
        </div>

        {/* Right side - Balance & Connect Button */}
        <div className="flex items-center gap-4">
          {isConnected && address && (
            <>
              {/* FROTH Balance */}
              <div className="hidden sm:flex items-center gap-2 bg-green-50 px-3 py-2 rounded-lg border border-green-200">
                <Coins className="text-green-600" size={18} strokeWidth={2.5} />
                <span className="text-sm font-semibold text-green-700">
                  {formatEther(balance || 0n)} FROTH
                </span>
              </div>

              {/* Address (shortened) */}
              <div className="hidden md:flex items-center gap-2 bg-gray-100 px-3 py-2 rounded-lg">
                <span className="text-xs text-gray-600 font-mono">
                  {address.slice(0, 6)}...{address.slice(-4)}
                </span>
              </div>
            </>
          )}

          {/* Connect/Disconnect Button */}
          <ConnectButton.Custom>
            {({
              account,
              chain,
              openAccountModal,
              openChainModal,
              openConnectModal,
              authenticationStatus,
              mounted,
            }) => {
              const ready = mounted && authenticationStatus !== 'loading';
              const connected =
                ready &&
                account &&
                chain &&
                (!authenticationStatus ||
                  authenticationStatus === 'authenticated');

              return (
                <div
                  {...(!ready && {
                    'aria-hidden': true,
                    style: {
                      opacity: 0,
                      pointerEvents: 'none',
                      userSelect: 'none',
                    },
                  })}
                >
                  {(() => {
                    if (!connected) {
                      return (
                        <button
                          onClick={openConnectModal}
                          type="button"
                          className="bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white font-semibold px-4 py-2 rounded-lg transition-colors"
                        >
                          Connect Wallet
                        </button>
                      );
                    }

                    if (chain.unsupported) {
                      return (
                        <button
                          onClick={openChainModal}
                          type="button"
                          className="bg-red-600 hover:bg-red-700 text-white font-semibold px-4 py-2 rounded-lg transition-colors"
                        >
                          Wrong Network
                        </button>
                      );
                    }

                    return (
                      <div className="flex items-center gap-2">
                        <button
                          onClick={openChainModal}
                          type="button"
                          className="flex items-center gap-2 bg-gray-100 hover:bg-gray-200 px-3 py-2 rounded-lg transition-colors"
                        >
                          {chain.hasIcon && (
                            <div
                              style={{
                                background: chain.iconBackground,
                                width: 16,
                                height: 16,
                                borderRadius: 999,
                                overflow: 'hidden',
                                marginRight: 4,
                              }}
                            >
                              {chain.iconUrl && (
                                <img
                                  alt={chain.name ?? 'Chain icon'}
                                  src={chain.iconUrl}
                                  style={{ width: 16, height: 16 }}
                                />
                              )}
                            </div>
                          )}
                          <span className="text-sm font-semibold text-gray-700">
                            {chain.name}
                          </span>
                        </button>

                        <button
                          onClick={openAccountModal}
                          type="button"
                          className="flex items-center gap-2 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white font-semibold px-4 py-2 rounded-lg transition-colors"
                        >
                          <span className="text-sm">
                            {account.displayName}
                            {account.displayBalance
                              ? ` (${account.displayBalance})`
                              : ''}
                          </span>
                        </button>
                      </div>
                    );
                  })()}
                </div>
              );
            }}
          </ConnectButton.Custom>
        </div>
      </div>
    </header>
  );
}

