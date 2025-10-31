import { useState, useEffect } from 'react';
import { useAccount, useReadContract, usePublicClient } from 'wagmi';
import { petNFTAddress, petNFTAbi, isValidAddress } from '../lib/contracts';
import { saveNFTData, getUserNFTs as fetchNFTsFromBackend } from '../lib/mongodb';

// Hook untuk fetch semua NFT milik user dan sync dengan contract
export function usePetNFTs() {
  const { address, isConnected } = useAccount();
  const publicClient = usePublicClient();
  const [nfts, setNfts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [lastSync, setLastSync] = useState(null);

  // Validate petNFT address
  const isValidPetNFT = isValidAddress(petNFTAddress);
  
  console.log('🔍 [usePetNFTs] Initialization:', {
    address,
    isConnected,
    petNFTAddress,
    isValidPetNFT,
    hasPublicClient: !!publicClient
  });

  // Get balance dari contract - tanpa auto refresh
  const { data: balance, refetch: refetchBalance } = useReadContract({
    address: petNFTAddress,
    abi: petNFTAbi,
    functionName: 'balanceOf',
    args: [address || '0x0000000000000000000000000000000000000000'],
    query: { 
      enabled: !!address && isConnected && isValidPetNFT,
      // Removed refetchInterval - no auto refresh
    },
  });
  
  console.log('💰 [usePetNFTs] Balance query result:', {
    balance: balance?.toString(),
    enabled: !!address && isConnected && isValidPetNFT
  });

  // Fetch semua NFT dari backend API dan verify ownership di blockchain
  const fetchUserNFTs = async () => {
    console.log('🔄 [usePetNFTs] fetchUserNFTs called', {
      address,
      hasPublicClient: !!publicClient,
      isValidPetNFT,
      isConnected,
      balance: balance?.toString(),
      willUseBackendOnly: !isValidPetNFT
    });

    // Jika petNFTAddress tidak valid, langsung fetch dari backend tanpa balance check
    const useBackendOnly = !isValidPetNFT;
    
    if (!address || !isConnected) {
      console.log('⏸️ [usePetNFTs] Skipping fetch - missing address or not connected', {
        address: !!address,
        isConnected
      });
      setNfts([]);
      return;
    }

    // Jika contract tidak valid tapi kita punya publicClient, tetap coba fetch dari backend
    if (!useBackendOnly && (!publicClient || !isValidPetNFT)) {
      console.log('⏸️ [usePetNFTs] Skipping fetch - missing requirements (using contract mode)', {
        address: !!address,
        publicClient: !!publicClient,
        isValidPetNFT,
        isConnected
      });
      setNfts([]);
      return;
    }

    setLoading(true);
    try {
      // Jika menggunakan backend only, skip balance check
      const balanceCount = useBackendOnly ? 999 : Number(balance || 0);
      console.log('📊 [usePetNFTs] Balance count:', balanceCount, 'useBackendOnly:', useBackendOnly);
      
      if (!useBackendOnly && balanceCount === 0) {
        console.log('⏸️ [usePetNFTs] Balance is 0, skipping fetch');
        setNfts([]);
        setLoading(false);
        return;
      }

      // 1. Fetch NFT list dari backend API (sumber utama)
      let backendResponse;
      let backendNFTs = [];
      
      try {
        console.log('📡 [usePetNFTs] Calling fetchNFTsFromBackend for:', address);
        backendResponse = await fetchNFTsFromBackend(address);
        backendNFTs = backendResponse?.data || [];
        
        console.log('✅ [usePetNFTs] Backend response:', {
          success: backendResponse?.success,
          count: backendNFTs.length,
          nfts: backendNFTs.map(n => n.tokenId),
          fullResponse: backendResponse
        });
        
        if (!backendResponse?.success) {
          console.warn('⚠️ [usePetNFTs] Backend response not successful:', backendResponse);
        }
        
        if (backendNFTs.length === 0 && balanceCount > 0) {
          console.warn(`⚠️ [usePetNFTs] Balance shows ${balanceCount} NFTs but backend returned none.`);
          console.warn('Possible causes:');
          console.warn('  1. Backend server not running - check backend health endpoint');
          console.warn('  2. NFTs not synced to backend - run devload script');
          console.warn('  3. Backend database issue - check MongoDB connection');
        }
      } catch (backendError) {
        console.error('❌ [usePetNFTs] Backend fetch failed:', backendError);
        console.error('❌ [usePetNFTs] Error details:', {
          message: backendError.message,
          stack: backendError.stack,
          name: backendError.name
        });
        console.warn('⚠️ [usePetNFTs] Trying to continue with empty backend list...');
        // Continue dengan empty array, akan coba fallback ke localStorage nanti
      }
      
      // 2. Filter dan verify ownership - skip invalid tokenId (timestamp dll)
      // Jika contract tidak valid, langsung gunakan data dari backend tanpa verification
      const verifiedNFTs = useBackendOnly
        ? backendNFTs.map((nftData) => {
            const tokenIdNum = Number(nftData.tokenId);
            
            // Filter tokenId yang sangat besar atau invalid
            if (isNaN(tokenIdNum) || tokenIdNum < 0 || tokenIdNum > 1000000) {
              console.warn(`Skipping invalid tokenId: ${nftData.tokenId}`);
              return null;
            }
            
            // Clean name jika ada
            const petName = nftData.name?.replace(/^FROTH\s+Pet\s+#?/i, 'Pet #') || `Pet #${nftData.tokenId}`;
            
            // Langsung return data dari backend tanpa verification
            console.log(`✅ [usePetNFTs] Using backend data for tokenId ${nftData.tokenId} (no contract verification)`);
            return {
              tokenId: nftData.tokenId,
              owner: address,
              tier: nftData.tier?.toLowerCase() || 'common',
              imageURI: nftData.imageURI || '',
              level: Number(nftData.level) || 1,
              energy: Math.max(0, Number(nftData.energy) || 100),
              name: petName,
              metadataURI: nftData.metadataURI || '',
              createdAt: nftData.createdAt || new Date().toISOString(),
            };
          })
        : await Promise.all(
        backendNFTs.map(async (nftData) => {
          try {
            const tokenIdNum = Number(nftData.tokenId);
            
            // Filter tokenId yang sangat besar atau invalid (tapi lebih fleksibel)
            // TokenId valid biasanya reasonable (0-100000 untuk production)
            // Hanya filter yang jelas invalid (NaN, negative, atau sangat besar yang tidak masuk akal)
            if (isNaN(tokenIdNum) || tokenIdNum < 0 || tokenIdNum > 1000000) {
              console.warn(`Skipping invalid tokenId: ${nftData.tokenId}`);
              return null;
            }
            
            const tokenId = BigInt(tokenIdNum);
            
            // Verify ownership dari blockchain (dengan error handling)
            let owner;
            try {
              owner = await publicClient.readContract({
                address: petNFTAddress,
                abi: petNFTAbi,
                functionName: 'ownerOf',
                args: [tokenId],
              });
            } catch (ownerError) {
              // Jika tokenId tidak ada di contract (error 0x7e273289 = ERC721: owner query for nonexistent token)
              console.warn(`TokenId ${tokenIdNum} tidak ada di contract, mungkin belum di-mint atau sudah dihapus`);
              // Untuk development, kita bisa tetap return data dari backend jika contract verify gagal
              // Tapi lebih baik skip untuk menghindari data yang tidak valid
              return null;
            }

            // Hanya return NFT jika masih dimiliki oleh user
            if (owner.toLowerCase() !== address.toLowerCase()) {
              console.warn(`TokenId ${tokenIdNum} owned by ${owner}, not ${address}, skipping`);
              return null;
            }

            // Update data dari contract (tier, imageURI, level, name) tapi KEEP energy dari database
            // Energy di-manage di database (off-chain), bukan di contract
            try {
              const petData = await publicClient.readContract({
                address: petNFTAddress,
                abi: petNFTAbi,
                functionName: 'getPet',
                args: [tokenId],
              });

              // Clean pet name - remove "FROTH Pet #" prefix
              const petName = petData.name?.replace(/^FROTH\s+Pet\s+#?/i, 'Pet #') || `Pet #${nftData.tokenId}`;

              // Update dengan data terbaru dari blockchain, TAPI gunakan energy dari database
              // ALWAYS use database energy if it exists (even if 0), only fallback to contract if database doesn't have energy field
              const dbEnergy = nftData.energy !== undefined && nftData.energy !== null ? Number(nftData.energy) : null;
              const finalEnergy = dbEnergy !== null ? dbEnergy : Number(petData.energy);
              
              return {
                tokenId: nftData.tokenId,
                owner: address,
                tier: petData.tier.toLowerCase(),
                imageURI: petData.imageURI,
                level: Number(petData.level),
                energy: Math.max(0, finalEnergy), // Ensure energy never goes below 0
                name: petName,
                metadataURI: nftData.metadataURI || '',
                createdAt: nftData.createdAt || new Date().toISOString(),
              };
            } catch (error) {
              console.error(`Error updating NFT ${nftData.tokenId} from contract:`, error);
              // Return data dari backend jika contract read gagal
              // Clean name jika ada
              const petName = nftData.name?.replace(/^FROTH\s+Pet\s+#?/i, 'Pet #') || `Pet #${nftData.tokenId}`;
              return {
                ...nftData,
                name: petName,
                owner: address,
              };
            }
          } catch (error) {
            console.error(`Error verifying NFT ${nftData.tokenId}:`, error);
            return null;
          }
        })
      );

      const validNFTs = verifiedNFTs.filter(nft => nft !== null);
      
      // Sort by tokenId (number)
      validNFTs.sort((a, b) => Number(a.tokenId) - Number(b.tokenId));
      
      setNfts(validNFTs);
      setLastSync(new Date());

    } catch (error) {
      console.error('Error fetching user NFTs:', error);
      console.error('Error details:', {
        message: error.message,
        stack: error.stack,
        address,
        balance,
        isValidPetNFT,
      });
      
      // Jika backend gagal, coba fallback ke localStorage
      try {
        const localStorageNFTs = [];
        const keys = Object.keys(localStorage);
        keys.forEach(key => {
          if (key.startsWith('nft_')) {
            try {
              const nft = JSON.parse(localStorage.getItem(key));
              if (nft && nft.owner?.toLowerCase() === address.toLowerCase()) {
                localStorageNFTs.push(nft);
              }
            } catch (parseError) {
              console.warn('Failed to parse localStorage NFT:', key, parseError);
            }
          }
        });
        if (localStorageNFTs.length > 0) {
          console.log('Using localStorage fallback, found', localStorageNFTs.length, 'NFTs');
          setNfts(localStorageNFTs);
        } else {
          console.warn('No NFTs found in backend or localStorage');
          setNfts([]);
        }
      } catch (fallbackError) {
        console.error('Fallback to localStorage also failed:', fallbackError);
        setNfts([]);
      }
    } finally {
      setLoading(false);
    }
  };

  // Fetch saat address atau balance berubah - hanya sekali saat mount/address change, dan saat balance berubah
  useEffect(() => {
    console.log('🔄 [usePetNFTs] useEffect triggered', {
      address,
      isConnected,
      balance: balance?.toString(),
      balanceDefined: balance !== undefined,
      hasPublicClient: !!publicClient,
      isValidPetNFT
    });
    
    if (!isConnected || !address) {
      console.log('⏸️ [usePetNFTs] useEffect: Not connected or no address, clearing NFTs');
      setNfts([]);
      setLoading(false);
      return;
    }
    
    // Jika petNFTAddress tidak valid, langsung fetch dari backend tanpa tunggu balance
    const useBackendOnly = !isValidPetNFT;
    
    if (useBackendOnly) {
      console.log('✅ [usePetNFTs] useEffect: Contract not configured, fetching from backend only');
      fetchUserNFTs();
    } else if (balance !== undefined) {
      console.log('✅ [usePetNFTs] useEffect: Calling fetchUserNFTs');
      fetchUserNFTs();
    } else {
      console.log('⏳ [usePetNFTs] useEffect: Waiting for balance...');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [address, isConnected, balance]);

  return {
    nfts,
    loading,
    refetch: fetchUserNFTs,
    lastSync,
  };
}

