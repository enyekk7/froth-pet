import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAccount, usePublicClient } from 'wagmi';
import { useStore } from '../state/useStore';
import { usePetNFTs } from '../hooks/usePetNFTs';
import { petNFTAddress, petNFTAbi } from '../lib/contracts';
import { spendPetEnergy } from '../lib/mongodb';
import FrothRun from '../components/FrothRun';
import { Loader2 } from 'lucide-react';

const GAMES = {
  'froth-run': {
    id: 'froth-run',
    name: 'FROTH RUN',
    description: 'Run and jump to avoid obstacles!',
    energyCost: 20,
  },
};

export default function PlayGame() {
  const { gameId } = useParams();
  const navigate = useNavigate();
  const { address, isConnected } = useAccount();
  const publicClient = usePublicClient();
  const { petTokenId } = useStore();
  const { nfts, refetch: refetchNFTs } = usePetNFTs();
  const [equippedPet, setEquippedPet] = useState(null);
  const [loading, setLoading] = useState(true);
  const [gameStarted, setGameStarted] = useState(false);

  const game = GAMES[gameId];

  // Fetch equipped pet data
  useEffect(() => {
    const fetchEquippedPet = async () => {
      if (petTokenId && nfts && nfts.length > 0) {
        const pet = nfts.find(nft => Number(nft.tokenId) === petTokenId);
        if (pet) {
          const cleanedPet = {
            ...pet,
            name: pet.name?.replace(/^FROTH\s+Pet\s+#?/i, 'Pet #') || pet.name || `Pet #${pet.tokenId}`,
            energy: Math.max(0, Number(pet.energy) || 0),
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
            energy: Math.max(0, Number(petData.energy) || 0),
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

  // Start game automatically when component mounts
  useEffect(() => {
    const startGame = async () => {
      if (!petTokenId || !equippedPet || gameStarted || loading) return;

      // Check energy
      if (equippedPet.energy < game.energyCost) {
        alert(`Not enough energy! Your pet has ${equippedPet.energy} energy, but needs ${game.energyCost}.`);
        navigate(`/game/${gameId}`);
        return;
      }

      // Spend energy from database
      try {
        const result = await spendPetEnergy(petTokenId, game.energyCost);
        if (result.success) {
          const newEnergy = result.data.newEnergy;
          setEquippedPet({
            ...equippedPet,
            energy: newEnergy,
          });
          setGameStarted(true);
          // Refresh NFTs in background
          setTimeout(() => {
            refetchNFTs();
          }, 300);
        } else {
          alert(result.error || 'Failed to spend energy. Please try again.');
          navigate(`/game/${gameId}`);
        }
      } catch (error) {
        console.error('Error spending energy:', error);
        alert('Failed to start game. Please check your pet\'s energy!');
        navigate(`/game/${gameId}`);
      }
    };

    if (equippedPet && !gameStarted && !loading) {
      startGame();
    }
  }, [equippedPet, petTokenId, game, gameStarted, loading, navigate, refetchNFTs]);

  const handleGameEnd = async (finalScore, shouldExit = false) => {
    if (shouldExit) {
      // Exit to game detail page
      navigate(`/game/${gameId}`);
    }
    // Refresh NFTs to update energy
    setTimeout(() => {
      refetchNFTs();
    }, 500);
  };

  const handleRestart = () => {
    // Restart game without spending energy again
    setGameStarted(false);
    // Force re-render to restart game
    setTimeout(() => {
      setGameStarted(true);
    }, 100);
  };

  if (!isConnected) {
    return (
      <div className="h-screen flex items-center justify-center">
        <div className="bg-white rounded-xl p-8 shadow-lg max-w-md w-full">
          <h2 className="text-2xl font-bold mb-4 text-center">Connect Wallet</h2>
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

  if (!game || loading || !equippedPet) {
    return (
      <div className="h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="text-4xl mb-4 animate-spin">⏳</div>
          <p className="text-gray-600">Loading game...</p>
        </div>
      </div>
    );
  }

  if (equippedPet.energy < game.energyCost) {
    return (
      <div className="h-screen flex items-center justify-center p-4">
        <div className="bg-white rounded-xl p-8 shadow-lg max-w-md w-full text-center">
          <Zap className="w-24 h-24 mx-auto mb-4 text-red-600" strokeWidth={1.5} />
          <h2 className="text-2xl font-bold text-red-800 mb-4">Not Enough Energy!</h2>
          <p className="text-gray-600 mb-6">
            Your pet has {equippedPet.energy} energy, but needs {game.energyCost}.
          </p>
          <button
            onClick={() => navigate(`/game/${gameId}`)}
            className="bg-green-500 text-white px-6 py-3 rounded-lg font-bold hover:bg-green-600"
          >
            Back to Game
          </button>
        </div>
      </div>
    );
  }

  if (!gameStarted) {
    return (
      <div className="h-screen flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-16 h-16 mx-auto mb-4 text-green-600 animate-spin" strokeWidth={1.5} />
          <p className="text-gray-600">Starting game...</p>
        </div>
      </div>
    );
  }

  // Fullscreen game mode
  return (
    <div className="h-screen w-screen overflow-hidden bg-black" style={{ paddingBottom: 0 }}>
      <FrothRun 
        petData={equippedPet}
        onGameEnd={handleGameEnd}
        onRestart={handleRestart}
        energyCost={game.energyCost}
        fullscreen={true}
      />
    </div>
  );
}

