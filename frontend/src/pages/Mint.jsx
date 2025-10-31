import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAccount, useReadContract, usePublicClient } from 'wagmi';
import { petNFTAddress, petNFTAbi } from '../lib/contracts';
import { useMintPet } from '../hooks/useMintPet';
import { formatEther, decodeEventLog } from 'viem';
import { convertImageURI } from '../lib/imageUtils';
import { Gift, Cat, PartyPopper, Loader2 } from 'lucide-react';

export default function MintPage() {
  const navigate = useNavigate();
  const { address, isConnected } = useAccount();
  const publicClient = usePublicClient();
  const { mint, txMint, isLoading: isMinting } = useMintPet();
  const [mintPrice, setMintPrice] = useState(null);
  const [mintStatus, setMintStatus] = useState('idle'); // idle, approving, minting, success, error
  const [mintedNFT, setMintedNFT] = useState(null);
  const [showSuccessModal, setShowSuccessModal] = useState(false);

  // Validate addresses
  const isValidPetNFT = petNFTAddress && petNFTAddress !== '0x0000000000000000000000000000000000000000' && petNFTAddress.startsWith('0x');

  // Fetch mint price
  const { data: mintPriceData } = useReadContract({
    address: petNFTAddress,
    abi: petNFTAbi,
    functionName: 'mintPrice',
    query: { enabled: isValidPetNFT },
  });

  useEffect(() => {
    if (mintPriceData) {
      setMintPrice(formatEther(mintPriceData));
    }
  }, [mintPriceData]);

  // Redirect jika tidak connected
  useEffect(() => {
    if (!isConnected) {
      navigate('/pet');
    }
  }, [isConnected, navigate]);

  // Monitor mint transaction
  useEffect(() => {
    const checkMintStatus = async () => {
      if (txMint && publicClient && address) {
        try {
          setMintStatus('minting');
          
          // Wait for transaction receipt
          const receipt = await publicClient.waitForTransactionReceipt({ hash: txMint });
          
          // Parse PetMinted event
          let tokenId = null;
          let tier = null;
          
          if (receipt.logs && receipt.logs.length > 0) {
            const petMintedEvent = {
              name: 'PetMinted',
              type: 'event',
              inputs: [
                { name: 'owner', type: 'address', indexed: true },
                { name: 'tokenId', type: 'uint256', indexed: true },
                { name: 'tier', type: 'string', indexed: false },
              ],
            };
            
            for (const log of receipt.logs) {
              try {
                if (log.topics && log.topics.length >= 3 && log.address.toLowerCase() === petNFTAddress.toLowerCase()) {
                  const decoded = decodeEventLog({
                    abi: [petMintedEvent],
                    data: log.data,
                    topics: log.topics,
                  });
                  
                  if (decoded && decoded.eventName === 'PetMinted') {
                    tokenId = decoded.args.tokenId.toString();
                    tier = decoded.args.tier || 'common';
                    break;
                  }
                }
              } catch (parseErr) {
                continue;
              }
            }
          }

          if (tokenId) {
            // Fetch NFT data dari contract
            try {
              const petData = await publicClient.readContract({
                address: petNFTAddress,
                abi: petNFTAbi,
                functionName: 'getPet',
                args: [BigInt(tokenId)],
              });
              
              const tokenURI = await publicClient.readContract({
                address: petNFTAddress,
                abi: petNFTAbi,
                functionName: 'tokenURI',
                args: [BigInt(tokenId)],
              });

              setMintedNFT({
                tokenId,
                tier: petData.tier.toLowerCase(),
                imageURI: petData.imageURI,
                name: petData.name,
                level: Number(petData.level),
                energy: Number(petData.energy),
                metadataURI: tokenURI,
              });
              
              setMintStatus('success');
              setShowSuccessModal(true);
            } catch (err) {
              console.error('Error fetching NFT data:', err);
              setMintStatus('error');
            }
          } else {
            setMintStatus('error');
          }
        } catch (error) {
          console.error('Error checking mint status:', error);
          setMintStatus('error');
        }
      }
    };

    if (txMint) {
      checkMintStatus();
    }
  }, [txMint, publicClient, address]);

  const handleMint = async () => {
    if (!isValidPetNFT) {
      alert('⚠️ PetNFT contract belum dikonfigurasi!\n\nUntuk menggunakan fitur mint:\n1. Deploy PetNFT contract ke Flow EVM\n2. Set VITE_PET_NFT_ADDRESS di Vercel\n3. Redeploy frontend\n\nSaat ini pet bisa dilihat dari database backend.');
      return;
    }
    
    try {
      setMintStatus('approving');
      const price = mintPrice ? Number(mintPrice) : 10;
      await mint(price);
    } catch (error) {
      console.error('Mint error:', error);
      setMintStatus('error');
      alert(`Error: ${error.message || 'Gagal mint NFT'}`);
    }
  };

  const handleCloseSuccess = () => {
    setShowSuccessModal(false);
    // Navigate back to pet page and trigger refresh
    setTimeout(() => {
      navigate('/pet', { replace: true });
      // Trigger window reload to ensure data is fresh
      setTimeout(() => {
        window.location.reload();
      }, 100);
    }, 500);
  };

  // Animation states
  const isProcessing = mintStatus === 'approving' || mintStatus === 'minting';
  const tierColors = {
    common: 'from-gray-400 to-gray-600',
    uncommon: 'from-green-400 to-green-600',
    epic: 'from-purple-400 to-purple-600',
    legendary: 'from-yellow-400 to-orange-600',
  };

  return (
    <div className="h-full overflow-auto bg-gradient-to-br from-white via-green-50 to-emerald-50 pb-20">
      <div className="max-w-2xl mx-auto p-4">
        {/* Header */}
        <div className="mb-6">
          <button
            onClick={() => navigate('/pet')}
            className="text-green-600 hover:text-green-700 mb-4 flex items-center gap-2"
          >
            <span>←</span> Back to Pet
          </button>
          <h1 className="text-3xl font-bold text-green-800">Mint Your Pet NFT</h1>
          <p className="text-gray-600 mt-2">Get a random tier pet for {mintPrice || '10'} FROTH</p>
        </div>

        {/* Warning jika contract belum dikonfigurasi */}
        {!isValidPetNFT && (
          <div className="bg-yellow-50 border-2 border-yellow-400 rounded-xl p-6 mb-6">
            <div className="flex items-start gap-3">
              <div className="text-yellow-600 text-2xl">⚠️</div>
              <div>
                <h3 className="font-bold text-yellow-800 mb-2">Contract Belum Dikonfigurasi</h3>
                <p className="text-yellow-700 text-sm mb-3">
                  Untuk menggunakan fitur mint NFT, Anda perlu:
                </p>
                <ol className="text-yellow-700 text-sm list-decimal list-inside space-y-1 mb-3">
                  <li>Deploy PetNFT contract ke Flow EVM Mainnet</li>
                  <li>Set <code className="bg-yellow-100 px-1 rounded">VITE_PET_NFT_ADDRESS</code> di Vercel</li>
                  <li>Redeploy frontend</li>
                </ol>
                <p className="text-yellow-700 text-sm">
                  <strong>Catatan:</strong> Pet bisa dilihat dari database backend tanpa contract.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Mint Card */}
        <div className="bg-white rounded-2xl shadow-xl p-8 border-4 border-green-100">
          {mintStatus === 'idle' && (
            <div className="text-center">
              <Gift className="w-32 h-32 mx-auto mb-6 text-green-600 animate-bounce" strokeWidth={1.5} />
              <h2 className="text-2xl font-bold text-green-800 mb-4">Ready to Mint?</h2>
              <p className="text-gray-600 mb-8">
                Click the button below to mint your new Pet NFT! You'll get a random tier pet.
              </p>
              <button
                onClick={handleMint}
                className="bg-gradient-to-r from-green-500 to-emerald-600 text-white px-8 py-4 rounded-xl font-bold text-lg hover:from-green-600 hover:to-emerald-700 transition-all shadow-lg transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={!isValidPetNFT || isMinting}
              >
                {!isValidPetNFT ? 'Contract Not Configured' : 'Mint NFT Now'}
              </button>
            </div>
          )}

          {isProcessing && (
            <div className="text-center">
              <div className="relative w-48 h-48 mx-auto mb-6">
                {/* Spinning Circle Animation */}
                <div className="absolute inset-0 border-8 border-green-200 rounded-full"></div>
                <div className="absolute inset-0 border-8 border-transparent border-t-green-500 rounded-full animate-spin"></div>
                
                {/* Rotating Pet Images */}
                <div className="absolute inset-0 flex items-center justify-center">
                  <Loader2 className="w-20 h-20 text-green-600 animate-spin" strokeWidth={2} />
                </div>
              </div>
              
              <h2 className="text-2xl font-bold text-green-800 mb-4">
                {mintStatus === 'approving' ? 'Approving FROTH...' : 'Minting Your Pet...'}
              </h2>
              <p className="text-gray-600 animate-pulse">
                {mintStatus === 'approving' 
                  ? 'Please approve the transaction in your wallet' 
                  : 'Creating your unique Pet NFT on the blockchain...'}
              </p>
              
              {/* Progress dots */}
              <div className="flex justify-center gap-2 mt-6">
                <div className="w-3 h-3 bg-green-500 rounded-full animate-bounce"></div>
                <div className="w-3 h-3 bg-green-500 rounded-full animate-bounce delay-100"></div>
                <div className="w-3 h-3 bg-green-500 rounded-full animate-bounce delay-200"></div>
              </div>
            </div>
          )}

          {mintStatus === 'error' && (
            <div className="text-center">
              <div className="text-6xl mb-4">❌</div>
              <h2 className="text-2xl font-bold text-red-600 mb-4">Minting Failed</h2>
              <p className="text-gray-600 mb-6">Something went wrong. Please try again.</p>
              <button
                onClick={() => {
                  setMintStatus('idle');
                  handleMint();
                }}
                className="bg-gradient-to-r from-green-500 to-emerald-600 text-white px-6 py-3 rounded-xl font-semibold hover:from-green-600 hover:to-emerald-700 transition-all"
              >
                Try Again
              </button>
            </div>
          )}
        </div>

        {/* Success Modal - Compact untuk tidak melebihi navbar */}
        {showSuccessModal && mintedNFT && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4" style={{ paddingTop: '80px', paddingBottom: '100px' }}>
            <div className="bg-white rounded-xl p-4 max-w-sm w-full shadow-2xl animate-scale-in border-2 border-green-500 max-h-[calc(100vh-200px)] overflow-y-auto">
              {/* Confetti Animation */}
              <div className="absolute inset-0 overflow-hidden pointer-events-none">
                {[...Array(15)].map((_, i) => (
                  <div
                    key={i}
                    className={`absolute w-2 h-2 bg-gradient-to-r ${
                      i % 4 === 0 ? tierColors[mintedNFT.tier] : 'from-green-400 to-emerald-600'
                    } rounded-full animate-confetti`}
                    style={{
                      left: `${Math.random() * 100}%`,
                      top: `${Math.random() * 100}%`,
                      animationDelay: `${Math.random() * 2}s`,
                      animationDuration: `${2 + Math.random() * 2}s`,
                    }}
                  ></div>
                ))}
              </div>

              <div className="relative z-10 text-center">
                <PartyPopper className="w-16 h-16 mx-auto mb-2 text-green-600 animate-bounce" strokeWidth={1.5} />
                <h2 className="text-xl font-bold text-green-800 mb-1">Congratulations!</h2>
                <p className="text-sm text-gray-700 mb-4">You got a new Pet NFT!</p>

                {/* NFT Display - Compact */}
                <div className="bg-gradient-to-br from-green-50 to-emerald-100 rounded-lg p-3 mb-4 border-2 border-green-200">
                  <div className="text-center mb-2">
                    <div className="inline-block px-3 py-1 rounded-full bg-white shadow-sm">
                      <span className="text-xs font-bold text-gray-700">
                        Tier: <span className="capitalize text-green-600">{mintedNFT.tier}</span>
                      </span>
                    </div>
                  </div>
                  
                  {/* Pet Image - Smaller */}
                  <div className="relative w-32 h-32 mx-auto mb-3">
                    <img
                      src={convertImageURI(mintedNFT.imageURI, mintedNFT.tier)}
                      alt={mintedNFT.name}
                      className="w-full h-full object-contain"
                      onError={(e) => {
                        const fallbackImages = {
                          common: '/nft-images/common/pet-1.png',
                          uncommon: '/nft-images/uncommon/pet-5.png',
                          epic: '/nft-images/epic/pet-8.png',
                          legendary: '/nft-images/legendary/pet-10.png',
                        };
                        e.target.src = fallbackImages[mintedNFT.tier] || fallbackImages.common;
                      }}
                    />
                  </div>

                  <h3 className="text-sm font-bold text-green-800 mb-2 truncate">{mintedNFT.name}</h3>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="bg-white/80 rounded-lg p-1.5">
                      <div className="text-gray-600 text-xs">Level</div>
                      <div className="font-bold text-green-700 text-sm">{mintedNFT.level}</div>
                    </div>
                    <div className="bg-white/80 rounded-lg p-1.5">
                      <div className="text-gray-600 text-xs">Energy</div>
                      <div className="font-bold text-green-700 text-sm">{mintedNFT.energy}</div>
                    </div>
                  </div>
                </div>

                <button
                  onClick={handleCloseSuccess}
                  className="w-full bg-gradient-to-r from-green-500 to-emerald-600 text-white px-4 py-2.5 rounded-lg font-semibold text-sm hover:from-green-600 hover:to-emerald-700 transition-all shadow-md transform hover:scale-105"
                >
                  🎊 Awesome! Let's Go
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Add custom animations */}
      <style>{`
        @keyframes confetti {
          0% {
            transform: translateY(0) rotate(0deg);
            opacity: 1;
          }
          100% {
            transform: translateY(-100vh) rotate(720deg);
            opacity: 0;
          }
        }
        .animate-confetti {
          animation: confetti linear infinite;
        }
        .delay-100 {
          animation-delay: 0.1s;
        }
        .delay-200 {
          animation-delay: 0.2s;
        }
        .delay-300 {
          animation-delay: 0.3s;
        }
        @keyframes scale-in {
          from {
            transform: scale(0.8);
            opacity: 0;
          }
          to {
            transform: scale(1);
            opacity: 1;
          }
        }
        .animate-scale-in {
          animation: scale-in 0.3s ease-out;
        }
      `}</style>
    </div>
  );
}

