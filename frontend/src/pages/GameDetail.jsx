import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAccount, usePublicClient } from 'wagmi';
import { useStore } from '../state/useStore';
import { usePetNFTs } from '../hooks/usePetNFTs';
import { petNFTAddress, petNFTAbi } from '../lib/contracts';
import { convertImageURI } from '../lib/imageUtils';
import { spendPetEnergy } from '../lib/mongodb';
import FrothRun from '../components/FrothRun';
import Leaderboard from '../components/Leaderboard';
import { Gamepad2, Zap, Heart, PawPrint, Rocket, PlayCircle } from 'lucide-react';

// Game Container Component
function GameContainer({ game, equippedPet, petTokenId, onStartGame, onGameEnd }) {
  const navigate = useNavigate();
  const [currentEnergy, setCurrentEnergy] = useState(equippedPet?.energy || 0);

  // Update currentEnergy when equippedPet changes
  useEffect(() => {
    if (equippedPet) {
      setCurrentEnergy(equippedPet.energy);
    }
  }, [equippedPet]);

  const handleStart = () => {
    // Navigate to play page
    navigate(`/game/${game.id}/play`);
  };

  if (!equippedPet || !petTokenId) {
    return (
      <div className="h-full bg-white rounded-xl p-6 shadow-lg border-2 border-green-200 text-center flex items-center justify-center">
        <div>
          <Gamepad2 className="w-20 h-20 mx-auto mb-3 text-green-600 animate-bounce" strokeWidth={1.5} />
          <h2 className="text-xl font-bold text-gray-800 mb-2">Equip a Pet First!</h2>
          <p className="text-gray-600 text-xs">Go to Pet page and equip a pet to start playing.</p>
        </div>
      </div>
    );
  }

  // Use currentEnergy which tracks the actual energy state
  const displayEnergy = currentEnergy;
  
  if (displayEnergy < game.energyCost) {
    return (
      <div className="h-full bg-white rounded-xl p-6 shadow-lg border-2 border-red-200 text-center flex items-center justify-center">
        <div>
          <Zap className="w-20 h-20 mx-auto mb-3 text-red-600" strokeWidth={1.5} />
          <h2 className="text-xl font-bold text-red-800 mb-2">Not Enough Energy!</h2>
          <p className="text-gray-600 text-xs">
            Your pet has <span className="font-bold text-red-600">{displayEnergy}</span> energy, but needs <span className="font-bold text-red-600">{game.energyCost}</span>.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full bg-gradient-to-br from-white to-green-50 rounded-xl p-4 shadow-lg border-2 border-green-200 text-center relative overflow-hidden flex items-start justify-center pt-4">
      {/* Decorative elements */}
      <div className="absolute top-0 right-0 w-16 h-16 bg-green-200 rounded-full -mr-8 -mt-8 opacity-20"></div>
      <div className="absolute bottom-0 left-0 w-12 h-12 bg-emerald-200 rounded-full -ml-6 -mb-6 opacity-20"></div>
      
      <div className="relative z-10 w-full">
        <Gamepad2 className="w-16 h-16 mx-auto mb-2 text-green-600 animate-pulse" strokeWidth={1.5} />
        <h2 className="text-lg font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-green-600 to-emerald-600 mb-1.5">
          Ready to Play?
        </h2>
        <p className="text-gray-600 mb-3 text-[10px]">Click the button below to start the game!</p>
        <button
          onClick={handleStart}
          className="bg-gradient-to-r from-green-500 via-green-600 to-emerald-600 text-white px-5 py-2.5 rounded-xl font-bold text-sm shadow-xl hover:shadow-green-300/50 transform hover:scale-105 transition-all duration-300 relative overflow-hidden group"
        >
          <span className="relative z-10 flex items-center gap-2 justify-center">
            <Rocket size={18} strokeWidth={2.5} />
            <span>Start Game (-{game.energyCost} Energy)</span>
          </span>
          <div className="absolute inset-0 bg-gradient-to-r from-emerald-600 to-green-600 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
        </button>
      </div>
    </div>
  );
}

const GAMES = {
  'froth-run': {
    id: 'froth-run',
    name: 'FROTH RUN',
    description: 'Run and jump to avoid obstacles!',
    energyCost: 20,
  },
};

export default function GameDetail() {
  const { gameId } = useParams();
  const navigate = useNavigate();
  const { address, isConnected } = useAccount();
  const publicClient = usePublicClient();
  const { petTokenId } = useStore();
  const { nfts, refetch: refetchNFTs } = usePetNFTs();
  const [equippedPet, setEquippedPet] = useState(null);
  const [loading, setLoading] = useState(true);

  const game = GAMES[gameId];

  // Fetch equipped pet data - ALWAYS use database energy (even if 0)
  useEffect(() => {
    const fetchEquippedPet = async () => {
      if (petTokenId && nfts && nfts.length > 0) {
        const pet = nfts.find(nft => Number(nft.tokenId) === petTokenId);
        if (pet) {
          // Clean pet name - remove "FROTH Pet #" prefix
          // ALWAYS use energy from database (nfts comes from database via usePetNFTs)
          const cleanedPet = {
            ...pet,
            name: pet.name?.replace(/^FROTH\s+Pet\s+#?/i, 'Pet #') || pet.name || `Pet #${pet.tokenId}`,
            energy: Math.max(0, Number(pet.energy) || 0), // Ensure energy is never negative
          };
          setEquippedPet(cleanedPet);
          setLoading(false);
          return;
        }
      }
      // Only fetch from contract if not in database
      if (petTokenId && (!nfts || nfts.length === 0) && publicClient && petNFTAddress) {
        try {
          const petData = await publicClient.readContract({
            address: petNFTAddress,
            abi: petNFTAbi,
            functionName: 'getPet',
            args: [BigInt(petTokenId)],
          });
          const name = petData.name?.replace(/^FROTH\s+Pet\s+#?/i, 'Pet #') || `Pet #${petTokenId}`;
          setEquippedPet({
            tokenId: petTokenId.toString(),
            tier: petData.tier.toLowerCase(),
            imageURI: petData.imageURI,
            name: name,
            level: Number(petData.level),
            energy: Math.max(0, Number(petData.energy) || 0), // Ensure energy is never negative
          });
        } catch (err) {
          console.error('Error fetching pet from contract:', err);
        }
      }
      setLoading(false);
    };

    fetchEquippedPet();
  }, [petTokenId, nfts, publicClient]);

  // Redirect if game not found
  useEffect(() => {
    if (!game) {
      navigate('/game');
    }
  }, [game, navigate]);

  const handleStartGame = async () => {
    if (!petTokenId) {
      alert('Please equip a pet first! Go to Pet page and select a pet to equip for games.');
      navigate('/pet');
      return;
    }

    if (!equippedPet) {
      alert('Loading pet data... Please wait.');
      return;
    }

    // Check energy
    if (equippedPet.energy < game.energyCost) {
      alert(`Not enough energy! Your pet has ${equippedPet.energy} energy, but needs ${game.energyCost}. Feed your pet to restore energy!`);
      return;
    }

    // Spend energy from database (no wallet confirmation needed)
    try {
      const result = await spendPetEnergy(petTokenId, game.energyCost);
      if (result.success) {
        // Update local pet energy immediately - don't refetch from contract
        const newEnergy = result.data.newEnergy;
        setEquippedPet({
          ...equippedPet,
          energy: newEnergy,
        });
        // Only refresh NFTs from backend (database), not from contract
        setTimeout(() => {
          refetchNFTs();
        }, 300);
      } else {
        alert(result.error || 'Failed to spend energy. Please try again.');
        return;
      }
    } catch (error) {
      console.error('Error spending energy:', error);
      alert('Failed to start game. Please check your pet\'s energy!');
      return;
    }
  };

  const handleGameEnd = async (finalScore) => {
    // Refresh NFTs from database only (not from contract)
    // This ensures energy stays reduced and doesn't reset to 100
    // Wait a bit to ensure backend has updated the energy
    setTimeout(() => {
      refetchNFTs();
    }, 500);
    // equippedPet will be updated automatically via useEffect when nfts changes
  };

  if (!isConnected) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 pb-24">
        <div className="bg-white rounded-xl p-8 shadow-lg max-w-md w-full">
          <h2 className="text-2xl font-bold mb-4 text-center">Connect Wallet</h2>
          <p className="text-center text-gray-600 mb-4">Please connect your wallet to play games.</p>
          <button
            onClick={() => navigate('/game')}
            className="w-full bg-gray-500 text-white px-4 py-2 rounded-lg font-semibold hover:bg-gray-600"
          >
            Back to Games
          </button>
        </div>
      </div>
    );
  }

  if (!game) {
    return null;
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 pb-24">
        <div className="text-center">
          <div className="text-4xl mb-4">⏳</div>
          <p className="text-gray-600">Loading game...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full overflow-hidden flex flex-col bg-gradient-to-br from-emerald-50 via-green-50 to-white">
      {/* Top Section - Back Button */}
      <div className="flex-shrink-0 p-3 pb-2">
        <button
          onClick={() => navigate('/game')}
          className="flex items-center gap-2 text-green-700 hover:text-green-800 font-semibold hover:gap-3 transition-all duration-200 group"
        >
          <span className="text-lg group-hover:-translate-x-1 transition-transform">←</span>
          <span className="text-sm">Back to Games</span>
        </button>
      </div>

      {/* Main Content - 2 Column Layout */}
      <div className="flex-1 min-h-0 flex gap-3 px-3 pb-3">
        {/* Left Column - Game Info & Play Button */}
        <div className="flex-1 min-w-0 flex flex-col">
          {/* Game Header Card - Compact */}
          <div className="bg-white rounded-xl shadow-lg border-2 border-green-100 overflow-hidden mb-2 flex-shrink-0">
            {/* Top gradient bar */}
            <div className="h-1.5 bg-gradient-to-r from-green-400 via-emerald-400 to-green-400"></div>
            
            <div className="p-3">
              <div className="flex items-center gap-2.5 mb-2">
                <div className="w-14 h-14 rounded-lg bg-gradient-to-br from-green-400 to-emerald-500 flex items-center justify-center shadow-md flex-shrink-0">
                  <span className="text-2xl">{game.name.split(' ')[0]}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <h1 className="text-lg font-extrabold text-gray-800 mb-0.5 truncate">{game.name}</h1>
                  <p className="text-gray-600 text-xs truncate">{game.description}</p>
                </div>
              </div>

              {!petTokenId ? (
                <div className="bg-gradient-to-r from-yellow-50 to-amber-50 border border-yellow-300 rounded-lg p-2">
                  <div className="flex items-center gap-1.5">
                    <span className="text-base">⚠️</span>
                    <p className="text-yellow-800 font-semibold text-[10px]">
                      Equip a pet at <a href="/pet" className="underline hover:text-yellow-900">Pet page</a> first.
                    </p>
                  </div>
                </div>
              ) : equippedPet && equippedPet.energy < game.energyCost ? (
                <div className="bg-gradient-to-r from-red-50 to-pink-50 border border-red-300 rounded-lg p-2">
                  <div className="flex items-center gap-1.5">
                    <Zap className="text-red-600" size={16} strokeWidth={2.5} />
                    <div className="flex-1 min-w-0">
                      <p className="text-red-800 font-bold text-[10px] mb-0.5">Not Enough Energy!</p>
                      <p className="text-red-700 text-[9px] truncate">
                        Need {game.energyCost}, have {equippedPet.energy}
                      </p>
                    </div>
                  </div>
                </div>
              ) : equippedPet ? (
                <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg p-2 border border-green-200">
                  <div className="grid grid-cols-2 gap-2">
                    <div className="bg-white rounded-lg p-1.5 shadow-sm border border-green-100">
                      <div className="flex items-center gap-1 mb-0.5">
                        <Zap className="text-yellow-600" size={12} strokeWidth={2.5} />
                        <span className="text-[9px] font-semibold text-gray-700">Cost</span>
                      </div>
                      <p className="text-base font-bold text-red-600 flex items-center gap-1">
                        <Heart size={14} strokeWidth={2.5} fill="currentColor" />
                        {game.energyCost}
                      </p>
                    </div>
                    <div className="bg-white rounded-lg p-1.5 shadow-sm border border-green-100">
                      <div className="flex items-center gap-1 mb-0.5">
                        <PawPrint className="text-green-600" size={12} strokeWidth={2.5} />
                        <span className="text-[9px] font-semibold text-gray-700">Energy</span>
                      </div>
                      <p className="text-base font-bold text-green-600 flex items-center gap-1">
                        <Heart size={14} strokeWidth={2.5} fill="currentColor" />
                        {equippedPet.energy}
                      </p>
                    </div>
                  </div>
                </div>
              ) : null}
            </div>
          </div>

          {/* Game Container - Play Button - Closer to top */}
          <div className="flex-1 min-h-0 pt-0">
            <GameContainer 
              game={game}
              equippedPet={equippedPet}
              petTokenId={petTokenId}
              onStartGame={handleStartGame}
              onGameEnd={handleGameEnd}
            />
          </div>
        </div>

        {/* Right Column - Leaderboard */}
        <div className="w-80 flex-shrink-0">
          <Leaderboard gameId={gameId} />
        </div>
      </div>
    </div>
  );
}

