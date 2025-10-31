import ConnectButton from './ConnectButton';
import { Rocket, Loader2 } from 'lucide-react';

export default function EmptyPetState({ onMintClick, isConnected, mintPrice, isLoading }) {
  if (!isConnected) {
    return (
      <div className="w-full max-w-lg mx-auto">
        <div className="bg-white/95 backdrop-blur-lg rounded-3xl p-8 md:p-12 shadow-xl border-2 border-green-100">
          <div className="text-center">
            {/* Simple Pet Icon */}
            <div className="mb-6">
              <div className="text-7xl mb-4">🐱</div>
            </div>
            
            <h2 className="text-3xl md:text-4xl font-bold text-green-800 mb-3">
              Welcome to FROTH PET!
            </h2>
            <p className="text-gray-600 text-lg mb-8">
              Connect your wallet to start
            </p>
            
            <div className="mt-8">
              <ConnectButton />
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-md mx-auto">
      <div className="relative">
        {/* Simple White Background with Green Accent */}
        <div className="bg-white rounded-3xl p-8 md:p-10 shadow-xl border-4 border-green-200 text-center">
          {/* Simple Pet Icon */}
          <div className="mb-6">
            <div className="text-8xl mb-4">🐱</div>
          </div>

          <h2 className="text-3xl md:text-4xl font-bold text-green-800 mb-4">
            No Pet Yet
          </h2>
          
          {/* Simple Price Display */}
          <div className="bg-green-50 border-2 border-green-200 rounded-xl p-4 mb-6 inline-block">
            <p className="text-sm text-green-700 mb-1 font-medium">Mint Price</p>
            <p className="text-3xl font-black text-green-600">
              {mintPrice ? Number(mintPrice).toFixed(2) : '10'} <span className="text-xl">FROTH</span>
            </p>
          </div>

          {/* Simple Mint Button */}
          <button
            onClick={onMintClick}
            disabled={isLoading}
            className="w-full bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white font-bold text-xl px-8 py-4 rounded-xl shadow-lg transform transition-all duration-200 hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
          >
            {isLoading ? (
              <span className="flex items-center justify-center gap-2">
                <Loader2 className="animate-spin" size={20} strokeWidth={2.5} />
                <span>Minting...</span>
              </span>
            ) : (
              <span className="flex items-center justify-center gap-2">
                <Rocket size={20} strokeWidth={2.5} />
                <span>Mint Pet Now</span>
              </span>
            )}
          </button>

          {/* Simple Info */}
          <p className="text-xs text-gray-500 mt-6">
            Get a random tier pet NFT
          </p>
        </div>
      </div>
    </div>
  );
}
