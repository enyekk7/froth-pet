import { useState, useEffect } from 'react';
import { useAccount, usePublicClient } from 'wagmi';
import { useStore } from '../state/useStore';
import { usePetNFTs } from '../hooks/usePetNFTs';
import ConnectButton from '../components/ConnectButton';
import { useNavigate } from 'react-router-dom';
import { petNFTAddress, petNFTAbi } from '../lib/contracts';
import { convertImageURI } from '../lib/imageUtils';
import { Gamepad2, Zap, Heart, PawPrint, Rocket, PlayCircle } from 'lucide-react';

export default function GamePage() {
  const { address, isConnected } = useAccount();
  const publicClient = usePublicClient();
  const { petTokenId } = useStore();
  const { nfts } = usePetNFTs();
  const navigate = useNavigate();
  const [equippedPet, setEquippedPet] = useState(null);

  // Fetch equipped pet data
  useEffect(() => {
    const fetchEquippedPet = async () => {
      if (petTokenId && nfts && nfts.length > 0) {
        const pet = nfts.find(nft => Number(nft.tokenId) === petTokenId);
        if (pet) {
          // Clean pet name
          const cleanedPet = {
            ...pet,
            name: pet.name?.replace(/^FROTH\s+Pet\s+#?/i, 'Pet #') || pet.name || `Pet #${pet.tokenId}`,
          };
          setEquippedPet(cleanedPet);
          return;
        }
      }
      setEquippedPet(null);
    };

    fetchEquippedPet();
  }, [petTokenId, nfts]);

  const games = [
    { id: 'froth-run', name: 'FROTH RUN', description: 'Run and jump to avoid obstacles!', energyCost: 20 },
  ];

  const handlePlay = (game) => {
    if (!petTokenId) {
      alert('Please equip a pet first! Go to Pet page and select a pet to equip for games.');
      navigate('/pet');
      return;
    }

    // Navigate to game detail page
    navigate(`/game/${game.id}`);
  };

  if (!isConnected) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 pb-24">
        <div className="bg-white rounded-xl p-8 shadow-lg max-w-md w-full">
          <h2 className="text-2xl font-bold mb-4 text-center">Connect Wallet</h2>
          <ConnectButton />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-4 pb-24 bg-gradient-to-br from-emerald-50 via-green-50 to-white">
      {/* Header Section */}
      <div className="mb-6 text-center">
        <h1 className="text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-green-600 to-emerald-600 mb-2 flex items-center justify-center gap-3">
          <Gamepad2 className="text-green-600" size={36} strokeWidth={2.5} />
          Game Center
        </h1>
        <p className="text-gray-600">Choose a game and start playing with your pet!</p>
      </div>

      <div className="max-w-2xl mx-auto space-y-6">
        {games.map((game) => (
          <div 
            key={game.id} 
            className="group relative bg-white rounded-2xl shadow-xl border-2 border-green-100 overflow-hidden hover:border-green-300 transition-all duration-300 hover:shadow-2xl"
          >
            {/* Decorative gradient overlay */}
            <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-green-400 via-emerald-400 to-green-400"></div>
            
            <div className="p-6">
              {/* Game Icon and Title */}
              <div className="flex items-start gap-5 mb-5">
                <div className="flex-shrink-0 w-20 h-20 rounded-xl bg-gradient-to-br from-green-400 to-emerald-500 flex items-center justify-center shadow-lg transform group-hover:scale-110 transition-transform duration-300">
                  <PlayCircle className="text-white" size={40} strokeWidth={2.5} />
                </div>
                <div className="flex-1 pt-2">
                  <h3 className="text-2xl font-bold text-gray-800 mb-2">{game.name}</h3>
                  <p className="text-gray-600 leading-relaxed">{game.description}</p>
                </div>
              </div>
              
              {/* Energy Info Card */}
              <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl p-4 mb-5 border border-green-200">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Zap className="text-yellow-600" size={24} strokeWidth={2.5} />
                    <span className="text-sm font-semibold text-gray-700">Energy Cost</span>
                  </div>
                  <span className="text-xl font-bold text-red-600 bg-white px-3 py-1 rounded-lg shadow-sm flex items-center gap-1">
                    <Heart size={18} strokeWidth={2.5} fill="currentColor" />
                    {game.energyCost}
                  </span>
                </div>
                {equippedPet && (
                  <div className="flex items-center justify-between pt-3 border-t border-green-200">
                    <div className="flex items-center gap-2">
                      <PawPrint className="text-green-600" size={20} strokeWidth={2.5} />
                      <span className="text-sm font-semibold text-gray-700">Your Pet Energy</span>
                    </div>
                    <span className={`text-xl font-bold px-3 py-1 rounded-lg shadow-sm flex items-center gap-1 ${
                      equippedPet.energy >= game.energyCost 
                        ? 'text-green-600 bg-white' 
                        : 'text-red-600 bg-red-50'
                    }`}>
                      <Heart size={18} strokeWidth={2.5} fill="currentColor" />
                      {equippedPet.energy}
                    </span>
                  </div>
                )}
              </div>

              {/* Play Button */}
              <button
                onClick={() => handlePlay(game)}
                className="w-full bg-gradient-to-r from-green-500 via-green-600 to-emerald-600 text-white px-6 py-4 rounded-xl font-bold text-lg shadow-lg hover:shadow-xl transform hover:scale-[1.02] transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 disabled:hover:shadow-lg relative overflow-hidden group"
                disabled={!petTokenId || (equippedPet && equippedPet.energy < game.energyCost)}
              >
                <span className="relative z-10 flex items-center justify-center gap-2">
                  {equippedPet && equippedPet.energy < game.energyCost ? (
                    <>
                      <Zap size={20} strokeWidth={2.5} />
                      <span>Not Enough Energy</span>
                    </>
                  ) : (
                    <>
                      <Rocket size={20} strokeWidth={2.5} />
                      <span>Start Playing (-{game.energyCost} Energy)</span>
                    </>
                  )}
                </span>
                <div className="absolute inset-0 bg-gradient-to-r from-emerald-600 to-green-600 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
              </button>
            </div>
          </div>
        ))}

        {!petTokenId && (
          <div className="bg-gradient-to-r from-yellow-50 to-amber-50 border-2 border-yellow-300 rounded-2xl p-6 shadow-lg">
            <div className="flex items-start gap-4">
              <div className="text-3xl">⚠️</div>
              <div>
                <h3 className="font-bold text-yellow-900 mb-2">Pet Required</h3>
                <p className="text-yellow-800 leading-relaxed">
                  You need to equip a pet to play games! Go to <a href="/pet" className="underline font-semibold hover:text-yellow-900">Pet page</a> and equip a pet first.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

