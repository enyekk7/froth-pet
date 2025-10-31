import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAccount, useReadContract, usePublicClient } from 'wagmi';
import { petNFTAddress, petNFTAbi, shopAddress, shopAbi } from '../lib/contracts';
import { useStore } from '../state/useStore';
import { useFrothBalance } from '../hooks/useFrothBalance';
import { useFeed } from '../hooks/useFeed';
import { usePetNFTs } from '../hooks/usePetNFTs';
// EmptyPetState sudah tidak digunakan - mint via tombol di header
import KittyCard from '../components/KittyCard';
import EnergyBar from '../components/EnergyBar';
import Inventory from '../components/Inventory';
import { formatEther } from 'viem';
import { convertImageURI } from '../lib/imageUtils';
import { Cookie, Beef, Loader2, Cat, Zap, PawPrint, Gamepad2 } from 'lucide-react';

export default function PetPage() {
  const navigate = useNavigate();
  const { address, isConnected } = useAccount();
  const publicClient = usePublicClient();
  const { balance } = useFrothBalance();
  const { feed, isLoading: isFeeding } = useFeed();
  const { nfts, loading: nftsLoading, refetch: refetchNFTs } = usePetNFTs();
  const { bag, setBag, uiLoading, petTokenId, setPetTokenId } = useStore();
  const [showFeedModal, setShowFeedModal] = useState(false);
  const [selectedNFT, setSelectedNFT] = useState(null);

  // Validate addresses
  const isValidPetNFT = petNFTAddress && petNFTAddress !== '0x0000000000000000000000000000000000000000' && petNFTAddress.startsWith('0x');

  // Set selected NFT dan restore equipped pet dari localStorage
  useEffect(() => {
    if (Array.isArray(nfts) && nfts.length > 0) {
      // Restore equipped pet dari localStorage jika ada
      if (petTokenId) {
        const equippedPet = nfts.find(nft => Number(nft.tokenId) === petTokenId);
        if (equippedPet) {
          // Set selected pet ke equipped pet
          setSelectedNFT(equippedPet);
          return;
        } else {
          // Jika equipped pet tidak ditemukan di list, clear equip
          console.warn('Equipped pet not found in list, clearing equip');
          setPetTokenId(null);
        }
      }
      
      // Jika belum ada pet yang di-equip atau selectedNFT tidak ada di list
      const currentSelected = selectedNFT && nfts.find(nft => nft.tokenId === selectedNFT.tokenId);
      if (!currentSelected) {
        // Pilih pet pertama sebagai selected (tapi tidak auto-equip)
        setSelectedNFT(nfts[0]);
      }
    } else if (Array.isArray(nfts) && nfts.length === 0) {
      setSelectedNFT(null);
      // Jangan clear petTokenId jika hanya belum load, biarkan dari localStorage
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nfts, petTokenId]);

  // Handle equip pet - save to localStorage
  const handleEquipPet = (nft) => {
    const tokenId = Number(nft.tokenId);
    setSelectedNFT(nft);
    setPetTokenId(tokenId);
    // Explicitly save to localStorage
    try {
      localStorage.setItem('equippedPetTokenId', tokenId.toString());
      console.log('Pet equipped and saved:', tokenId);
    } catch (err) {
      console.error('Failed to save equipped pet:', err);
    }
  };

  // Fetch bag from database (source of truth for off-chain feeding)
  useEffect(() => {
    const fetchBag = async () => {
      if (!address) return;

      try {
        // Use database as source of truth (feeding is off-chain)
        const { getBag: getBagFromDB } = await import('../lib/mongodb');
        const result = await getBagFromDB(address);
        if (result.success) {
          setBag({ 
            burger: BigInt(result.data.burger || 0), 
            ayam: BigInt(result.data.ayam || 0) 
          });
        }
      } catch (error) {
        console.error('Error fetching bag from database:', error);
        // Fallback to contract if database fails
        if (publicClient && shopAddress && shopAddress !== '0x0000000000000000000000000000000000000000') {
          try {
            const contractBag = await publicClient.readContract({
              address: shopAddress,
              abi: shopAbi,
              functionName: 'getBag',
              args: [address],
            });

            setBag({ 
              burger: contractBag[0] || 0n, 
              ayam: contractBag[1] || 0n 
            });
          } catch (contractError) {
            console.error('Could not fetch bag from contract or database:', contractError);
          }
        }
      }
    };

    if (isConnected && address) {
      fetchBag();
      const interval = setInterval(fetchBag, 5000);
      return () => clearInterval(interval);
    }
  }, [address, isConnected, publicClient, shopAddress, setBag]);

  const handleMintClick = () => {
    navigate('/pet/mint');
  };

  const handleFeed = async (foodType) => {
    if (!selectedNFT || !address) return;
    try {
      const result = await feed(Number(selectedNFT.tokenId), foodType);
      setShowFeedModal(false);
      
      // Immediately update bag state from response (database is source of truth for feeding)
      if (result.success && result.data?.remainingFood) {
        setBag({ 
          burger: BigInt(result.data.remainingFood.burger || 0), 
          ayam: BigInt(result.data.remainingFood.ayam || 0) 
        });
      }
      
      // Refetch NFTs after feeding to update energy display
      setTimeout(() => {
        refetchNFTs();
        
        // Also refetch bag from database to ensure sync
        import('../lib/mongodb').then(({ getBag }) => {
          getBag(address).then(result => {
            if (result.success) {
              setBag({ 
                burger: BigInt(result.data.burger || 0), 
                ayam: BigInt(result.data.ayam || 0) 
              });
            }
          });
        });
      }, 1000);
    } catch (error) {
      console.error('Feed error:', error);
      alert(error.message || 'Failed to feed pet');
    }
  };

  // Show connect wallet state
  if (!isConnected) {
    return (
      <div className="h-full overflow-hidden flex items-center justify-center p-4 bg-gradient-to-br from-white via-green-50 to-emerald-50">
        <div className="text-center">
          <Cat className="w-24 h-24 mx-auto mb-4 text-green-600" strokeWidth={1.5} />
          <p className="text-xl font-semibold text-green-800 mb-2">Connect Your Wallet</p>
          <p className="text-sm text-gray-600">Please connect your wallet to view and mint your pets!</p>
        </div>
      </div>
    );
  }

  // Show loading state - pastikan benar-benar loading
  if (nftsLoading || (nfts === undefined && isConnected && address)) {
    return (
      <div className="h-full overflow-hidden flex items-center justify-center bg-gradient-to-br from-green-50 to-emerald-100">
        <div className="text-center">
          <Loader2 className="w-32 h-32 mx-auto mb-4 text-green-600 animate-spin" strokeWidth={1.5} />
          <p className="text-2xl font-semibold text-green-800">Loading your pets...</p>
        </div>
      </div>
    );
  }

  // Pastikan nfts sudah ter-load dan benar-benar array sebelum cek empty
  // Hanya tampilkan "No Pet Yet" jika loading selesai DAN nfts adalah array kosong
  const hasNoNFTs = Array.isArray(nfts) && nfts.length === 0 && !nftsLoading && nfts !== undefined;
  if (hasNoNFTs) {
    return (
      <div className="h-full overflow-hidden flex flex-col bg-gradient-to-br from-white via-green-50 to-emerald-50">
        {/* Header dengan tombol mint */}
        <div className="flex-shrink-0 px-4 py-3 bg-white/90 backdrop-blur-sm border-b-2 border-green-100">
          <div className="flex items-center justify-between">
            <h1 className="text-xl font-bold text-green-800 flex items-center gap-2">
              <PawPrint size={24} strokeWidth={2.5} />
              My FROTH Pets
            </h1>
            <div className="flex items-center gap-4">
              {/* Mint Button - Top Right - Larger */}
              <button
                onClick={handleMintClick}
                className="bg-gradient-to-r from-green-500 to-emerald-600 text-white px-5 py-2.5 rounded-xl font-bold hover:from-green-600 hover:to-emerald-700 transition-all shadow-lg text-sm transform hover:scale-105"
              >
                Mint NFT
              </button>
            </div>
          </div>
          
          {/* Warning jika contract belum dikonfigurasi */}
          {!isValidPetNFT && (
            <div className="mt-2 bg-yellow-50 border-2 border-yellow-400 rounded-xl p-3">
              <p className="text-yellow-800 font-semibold text-sm mb-1">Kontrak Belum Dikonfigurasi</p>
              <p className="text-xs text-yellow-700">
                Update <code className="bg-yellow-100 px-1 py-0.5 rounded">VITE_PET_NFT_ADDRESS</code> di <code className="bg-yellow-100 px-1 py-0.5 rounded">frontend/.env</code>
              </p>
            </div>
          )}
        </div>

        {/* Empty content area - simple message */}
        <div className="flex-1 flex items-center justify-center p-4">
          <div className="text-center">
            <Cat className="w-24 h-24 mx-auto mb-4 text-green-600" strokeWidth={1.5} />
            <p className="text-xl font-semibold text-green-800 mb-2">No Pet Yet</p>
            <p className="text-sm text-gray-600">Click the Mint button above to get your first pet!</p>
          </div>
        </div>

      </div>
    );
  }

  // Show NFT if exists - STUDIO LAYOUT WITH WHITE-GREEN THEME
  // Pastikan nfts adalah array dan ada isinya
  // Jika nfts masih undefined atau bukan array, berarti masih loading
  if (!Array.isArray(nfts) || nfts.length === 0) {
    // Jika masih loading, tampilkan loading state
    if (nftsLoading || nfts === undefined) {
      return (
        <div className="h-full overflow-hidden flex items-center justify-center bg-gradient-to-br from-green-50 to-emerald-100">
          <div className="text-center">
            <Loader2 className="w-32 h-32 mx-auto mb-4 text-green-600 animate-spin" strokeWidth={1.5} />
            <p className="text-2xl font-semibold text-green-800">Loading your pets...</p>
          </div>
        </div>
      );
    }
    // Jika sudah selesai loading tapi benar-benar tidak ada NFT, 
    // seharusnya sudah ditangani di kondisi sebelumnya (hasNoNFTs)
    // Tapi sebagai fallback, return empty state
    return (
      <div className="h-full overflow-hidden flex flex-col bg-gradient-to-br from-white via-green-50 to-emerald-50">
        <div className="flex-shrink-0 px-4 py-3 bg-white/90 backdrop-blur-sm border-b-2 border-green-100">
          <div className="flex items-center justify-between">
            <h1 className="text-xl font-bold text-green-800 flex items-center gap-2">
              <PawPrint size={24} strokeWidth={2.5} />
              My FROTH Pets
            </h1>
            <div className="flex items-center gap-4">
              {/* Mint Button - Top Right - Larger */}
              <button
                onClick={handleMintClick}
                className="bg-gradient-to-r from-green-500 to-emerald-600 text-white px-5 py-2.5 rounded-xl font-bold hover:from-green-600 hover:to-emerald-700 transition-all shadow-lg text-sm transform hover:scale-105"
              >
                Mint NFT
              </button>
            </div>
          </div>
        </div>
        <div className="flex-1 flex items-center justify-center p-4">
          <div className="text-center">
            <Cat className="w-24 h-24 mx-auto mb-4 text-green-600" strokeWidth={1.5} />
            <p className="text-xl font-semibold text-green-800 mb-2">No Pet Yet</p>
            <p className="text-sm text-gray-600">Click the Mint button above to get your first pet!</p>
          </div>
        </div>
      </div>
    );
  }

  const currentPet = selectedNFT || nfts[0];

  return (
    <div className="h-full overflow-hidden flex flex-col bg-gradient-to-br from-white via-green-50 to-emerald-50">
      {/* Fixed Header - Ultra Compact */}
      <div className="flex-shrink-0 px-3 py-2 bg-white/90 backdrop-blur-sm border-b-2 border-green-100">
        <div className="flex items-center justify-between">
          <h1 className="text-base font-bold text-green-800 flex items-center gap-2">
            <PawPrint size={20} strokeWidth={2.5} />
            My FROTH Pets
          </h1>
          <div className="flex items-center gap-2">
            {/* Mint Button - Top Right - Larger */}
            <button
              onClick={handleMintClick}
              className="bg-gradient-to-r from-green-500 to-emerald-600 text-white px-5 py-2.5 rounded-xl font-bold hover:from-green-600 hover:to-emerald-700 transition-all shadow-lg text-sm transform hover:scale-105"
            >
              Mint NFT
            </button>
          </div>
        </div>
        
        {/* NFT Selection (if multiple) - Compact with horizontal scroll */}
        {nfts && nfts.length > 1 && (
          <div 
            className="mt-1.5 overflow-x-auto scrollbar-hide" 
            style={{ 
              scrollbarWidth: 'thin', 
              WebkitOverflowScrolling: 'touch',
              scrollBehavior: 'smooth',
              overflowX: 'scroll',
              overflowY: 'hidden'
            }}
          >
            <div 
              className="flex gap-1.5 pb-0.5" 
              style={{ 
                minWidth: 'max-content',
                width: 'max-content',
                display: 'flex',
                flexDirection: 'row'
              }}
            >
              {nfts.map((nft) => {
                const isEquipped = petTokenId === Number(nft.tokenId);
                const isSelected = selectedNFT?.tokenId === nft.tokenId;
                const energy = nft.energy || 0;
                const maxEnergy = 100;
                const energyPercent = Math.min((energy / maxEnergy) * 100, 100);
                const energyColor = energyPercent > 70 ? 'bg-green-500' : energyPercent > 40 ? 'bg-yellow-500' : 'bg-red-500';
                
                return (
                  <button
                    key={nft.tokenId}
                    onClick={() => setSelectedNFT(nft)}
                    className={`relative flex-shrink-0 p-1 rounded-md border-2 transition-all ${
                      isSelected
                        ? 'border-green-500 bg-green-50'
                        : 'border-gray-200 bg-white hover:border-green-300'
                    }`}
                    style={{ flexShrink: 0 }}
                    title={isEquipped ? 'Equipped for games' : 'Click to select'}
                  >
                    {isEquipped && (
                      <div className="absolute -top-1 -right-1 bg-green-500 text-white text-[9px] font-bold px-0.5 rounded-full border-2 border-white z-10">
                        ✓
                      </div>
                    )}
                    <div className="relative">
                      <img 
                        src={convertImageURI(nft.imageURI, nft.tier)} 
                        alt={nft.name}
                        className="w-8 h-8 object-cover rounded"
                        onError={(e) => {
                          // Fallback ke local image berdasarkan tier
                          const tier = nft.tier || 'common';
                          const fallbackImages = {
                            common: '/nft-images/common/pet-1.png',
                            uncommon: '/nft-images/uncommon/pet-5.png',
                            epic: '/nft-images/epic/pet-8.png',
                            legendary: '/nft-images/legendary/pet-10.png',
                          };
                          e.target.src = fallbackImages[tier.toLowerCase()] || fallbackImages.common;
                        }}
                      />
                    </div>
                    {/* Energy Bar for each pet - Smaller */}
                    <div className="mt-0.5 w-full">
                      <div className="w-full bg-green-100 rounded-full h-1 overflow-hidden border border-green-200">
                        <div
                          className={`h-full ${energyColor} transition-all duration-300 rounded-full`}
                          style={{ width: `${energyPercent}%` }}
                        />
                      </div>
                      <p className="text-[8px] text-gray-600 text-center mt-0.5 leading-tight">
                        {Math.min(energy, maxEnergy)}
                      </p>
                    </div>
                    <p className="text-[10px] font-semibold text-gray-700 truncate max-w-[32px] mt-0.5 leading-tight">
                      #{nft.name?.split('#')[1] || nft.tokenId}
                    </p>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Main Content Area - No Scroll, Fixed Height */}
      <div className="flex-1 overflow-hidden p-2 min-h-0">
        {currentPet && (
          <div className="h-full flex flex-col gap-2 max-w-4xl mx-auto relative">
            {/* Feed Button - Outside card, absolute positioned top right, sejajar dengan Equipped badge */}
            <button
              onClick={() => setShowFeedModal(true)}
              className="absolute -top-1 right-0 z-30 bg-gradient-to-r from-orange-500 to-orange-600 text-white text-base font-bold px-5 py-2.5 rounded-full border-2 border-white shadow-xl hover:from-orange-600 hover:to-orange-700 transition-all transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              disabled={isFeeding || uiLoading || (bag.burger === 0n && bag.ayam === 0n)}
              title="Feed your pet"
            >
              {isFeeding ? (
                <>
                  <Loader2 size={18} className="animate-spin" />
                  <span>Feeding...</span>
                </>
              ) : (
                <>
                  <Cookie size={18} />
                  <span>Feed</span>
                </>
              )}
            </button>
            
            {/* Pet Display - Compact */}
            <div className="flex-shrink-0 flex items-center justify-center bg-gradient-to-br from-white via-green-50 to-emerald-100 rounded-xl shadow-lg p-3 relative overflow-visible border-2 border-green-100">
              {/* Simplified Background Pattern */}
              <div className="absolute inset-0 opacity-15">
                <div className="absolute top-0 left-0 w-48 h-48 bg-green-200 rounded-full blur-2xl animate-pulse"></div>
                <div className="absolute bottom-0 right-0 w-48 h-48 bg-emerald-200 rounded-full blur-2xl animate-pulse"></div>
              </div>
              
              {/* Pet Display - Compact */}
              <div className="relative z-10 w-full max-w-xs">
                {/* Top Right Corner: Equipped Badge only */}
                {petTokenId === Number(currentPet.tokenId) && (
                  <div className="absolute -top-2 -right-2 bg-green-500 text-white text-xs font-bold px-2 py-1 rounded-full border-2 border-white shadow-lg z-20">
                    ✓ Equipped
                  </div>
                )}
                <KittyCard
                  imageUrl={currentPet.imageURI}
                  level={currentPet.level}
                  energy={currentPet.energy}
                  tier={currentPet.tier}
                  name={currentPet.name}
                />
              </div>
            </div>

            {/* Stats Section - Compact with Equip button */}
            <div className="flex-shrink-0 space-y-2">
              {/* Stats Cards and Equip Button - Grid layout with 4 columns */}
              <div className="grid grid-cols-4 gap-1.5">
                <div className="bg-gradient-to-br from-green-500 to-emerald-600 text-white p-1.5 rounded-lg shadow-md text-center overflow-hidden">
                  <div className="text-[10px] opacity-90 mb-0.5 leading-tight">Level</div>
                  <div className="text-lg font-bold leading-tight">{currentPet.level || 1}</div>
                </div>
                <div className="bg-gradient-to-br from-emerald-500 to-green-600 text-white p-1.5 rounded-lg shadow-md text-center overflow-hidden">
                  <div className="text-[10px] opacity-90 mb-0.5 leading-tight">Tier</div>
                  <div className="text-xs font-bold capitalize leading-tight truncate">{currentPet.tier || 'Common'}</div>
                </div>
                <div className="bg-gradient-to-br from-green-600 to-emerald-500 text-white p-1.5 rounded-lg shadow-md text-center overflow-hidden">
                  <div className="text-[10px] opacity-90 mb-0.5 leading-tight">Energy</div>
                  <div className="text-lg font-bold leading-tight">{currentPet.energy || 0}</div>
                </div>
                
                {/* Equip Button - Sejajar dengan Tier dan Energy */}
                {petTokenId === Number(currentPet.tokenId) ? (
                  <div className="bg-green-100 border-2 border-green-500 text-green-800 px-1.5 py-1.5 rounded-lg text-center flex items-center justify-center shadow-md gap-1">
                    <span className="text-[10px] font-bold">Equipped</span>
                  </div>
                ) : (
                  <button
                    onClick={() => handleEquipPet(currentPet)}
                    className="bg-gradient-to-r from-blue-500 to-blue-600 text-white px-1.5 py-1.5 rounded-lg font-bold text-[10px] hover:from-blue-600 hover:to-blue-700 transition-all shadow-md transform hover:scale-105 flex items-center justify-center gap-1"
                    title="Equip this pet for games"
                  >
                    <Zap size={12} strokeWidth={2.5} />
                    <span>Equip</span>
                  </button>
                )}
              </div>

              {/* Energy Bar - Compact */}
              <div className="bg-white rounded-lg p-2 shadow-sm border border-green-100">
                <div className="text-xs font-semibold text-green-800 mb-1">Energy Level</div>
                <EnergyBar energy={currentPet.energy || 0} />
              </div>

              {/* Bottom Section: Inventory & Actions - Compact */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {/* Inventory */}
                <div className="flex-shrink-0">
                  <Inventory burger={bag.burger} ayam={bag.ayam} />
                </div>

                {/* Actions - Compact */}
                <div className="space-y-2">
                  <a
                    href="/game"
                    className="block w-full bg-gradient-to-r from-emerald-600 to-green-600 text-white px-4 py-2.5 rounded-lg font-semibold text-sm hover:from-emerald-700 hover:to-green-700 transition-all shadow-md transform hover:scale-105 text-center flex items-center justify-center gap-2"
                  >
                    <Gamepad2 size={18} strokeWidth={2.5} />
                    <span>Play Games</span>
                  </a>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>


      {/* Feed Modal - Small Popup */}
      {showFeedModal && currentPet && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setShowFeedModal(false)}>
          <div className="bg-white rounded-xl p-4 max-w-xs w-full shadow-2xl border-2 border-green-200 relative" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={() => setShowFeedModal(false)}
              className="absolute top-2 right-2 text-gray-400 hover:text-gray-600 text-xl"
            >
              ×
            </button>
            <h3 className="text-lg font-bold mb-3 text-center text-green-800">Choose Food</h3>
            <div className="space-y-2">
              <button
                onClick={() => handleFeed(1)}
                className="w-full bg-orange-50 text-orange-800 border-2 border-orange-200 px-3 py-3 rounded-lg font-semibold hover:bg-orange-100 disabled:opacity-50 flex items-center justify-between transition-all text-sm"
                disabled={bag.burger === 0n || isFeeding}
              >
                <span className="flex items-center gap-2">
                  <Cookie size={18} />
                  Burger (+50)
                </span>
                <span className="bg-orange-200 px-2 py-1 rounded text-xs font-bold">
                  {Number(bag.burger || 0n)}x
                </span>
              </button>
              <button
                onClick={() => handleFeed(2)}
                className="w-full bg-yellow-50 text-yellow-800 border-2 border-yellow-200 px-3 py-3 rounded-lg font-semibold hover:bg-yellow-100 disabled:opacity-50 flex items-center justify-between transition-all text-sm"
                disabled={bag.ayam === 0n || isFeeding}
              >
                <span className="flex items-center gap-2">
                  <Beef size={18} />
                  Chicken (+100)
                </span>
                <span className="bg-yellow-200 px-2 py-1 rounded text-xs font-bold">
                  {Number(bag.ayam || 0n)}x
                </span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
