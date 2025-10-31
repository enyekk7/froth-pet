import { useState, useEffect } from 'react';
import { useWriteContract, useWaitForTransactionReceipt, usePublicClient } from 'wagmi';
import { useAccount } from 'wagmi';
import { frothAddress, frothAbi, petNFTAddress, petNFTAbi, isValidAddress } from '../lib/contracts';
import { useStore } from '../state/useStore';
import { parseEther, decodeEventLog } from 'viem';
import { saveNFTData } from '../lib/mongodb';

export function useMintPet() {
  const { writeContract: writeApprove, data: txApprove } = useWriteContract();
  const { isLoading: isLoadingApprove } = useWaitForTransactionReceipt({
    hash: txApprove,
  });
  
  const { writeContract: writeMint, data: txMint } = useWriteContract();
  const { isLoading: isLoadingMint } = useWaitForTransactionReceipt({
    hash: txMint,
  });
  
  const { address } = useAccount();
  const publicClient = usePublicClient();
  const setUiLoading = useStore((state) => state.setUiLoading);
  const [pendingPrice, setPendingPrice] = useState(null);

  const mint = async (priceInEther) => {
    if (!isValidAddress(petNFTAddress)) {
      throw new Error('PetNFT contract address not configured');
    }

    setUiLoading(true);
    setPendingPrice(priceInEther);
    try {
      const priceWei = parseEther(priceInEther.toString());
      
      // Step 1: Approve
      writeApprove({
        address: frothAddress,
        abi: frothAbi,
        functionName: 'approve',
        args: [petNFTAddress, priceWei],
      });
    } catch (error) {
      console.error('Approve error:', error);
      setUiLoading(false);
      setPendingPrice(null);
      throw error;
    }
  };

  // Auto proceed to mint after approve succeeds
  useEffect(() => {
    if (txApprove && pendingPrice && isLoadingApprove === false) {
      const priceWei = parseEther(pendingPrice.toString());
      writeMint({
        address: petNFTAddress,
        abi: petNFTAbi,
        functionName: 'mintWithFroth',
        args: [priceWei],
      });
    }
  }, [txApprove, pendingPrice, isLoadingApprove, writeMint]);

  // After mint succeeds, get tokenId and save to MongoDB/Pinata
  useEffect(() => {
    const handleMintSuccess = async () => {
      if (txMint && isLoadingMint === false && address && publicClient) {
        try {
          // Wait a bit for transaction to be processed
          await new Promise(resolve => setTimeout(resolve, 2000));
          
          // Get tokenId from transaction receipt (PetMinted event)
          let tokenId = null;
          
          try {
            const receipt = await publicClient.getTransactionReceipt({ hash: txMint });
            
            // Parse PetMinted event dari logs
            if (receipt.logs && receipt.logs.length > 0) {
              // Cari event PetMinted
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
                  // Try to decode as PetMinted event
                  if (log.topics && log.topics.length >= 3 && log.address.toLowerCase() === petNFTAddress.toLowerCase()) {
                    const decoded = decodeEventLog({
                      abi: [petMintedEvent],
                      data: log.data,
                      topics: log.topics,
                    });
                    
                    if (decoded && decoded.eventName === 'PetMinted') {
                      tokenId = decoded.args.tokenId.toString();
                      break;
                    }
                  }
                } catch (parseErr) {
                  // Continue to next log
                  continue;
                }
              }
            }
            
            if (!tokenId) {
              console.warn('Could not get tokenId from PetMinted event, will sync from backend later');
            }
          } catch (err) {
            console.warn('Could not get receipt:', err);
          }

          // Jika tokenId berhasil didapat, fetch data dari contract
          if (tokenId) {
          try {
              // Get pet data dari contract
              const petData = await publicClient.readContract({
              address: petNFTAddress,
              abi: petNFTAbi,
                functionName: 'getPet',
                args: [BigInt(tokenId)],
              });
              
              // Get tokenURI
              const tokenURI = await publicClient.readContract({
                address: petNFTAddress,
                abi: petNFTAbi,
                functionName: 'tokenURI',
                args: [BigInt(tokenId)],
              });

              // Save ke MongoDB dengan data dari contract
          const nftData = {
                tokenId: tokenId,
            owner: address,
                tier: petData.tier.toLowerCase(),
                imageURI: petData.imageURI,
                metadataURI: tokenURI,
                level: Number(petData.level),
                energy: Number(petData.energy),
                name: petData.name,
          };
          
          await saveNFTData(nftData);
          console.log('NFT data saved:', nftData);
            } catch (contractErr) {
              console.error('Error fetching pet data from contract:', contractErr);
              // Fallback: save dengan data minimal
              const nftData = {
                tokenId: tokenId,
                owner: address,
                tier: tier,
                imageURI: '',
                metadataURI: '',
                level: 1,
                energy: 100,
                name: `FROTH Pet #${tokenId}`,
              };
              await saveNFTData(nftData);
            }
          } else {
            console.warn('Could not determine tokenId from transaction, NFT will be synced on next refresh');
          }
          
          setUiLoading(false);
          setPendingPrice(null);
        } catch (error) {
          console.error('Error saving NFT data:', error);
          setUiLoading(false);
          setPendingPrice(null);
        }
      }
    };
    
    if (txMint && !isLoadingMint) {
      handleMintSuccess();
    }
  }, [txMint, isLoadingMint, address, publicClient]);

  return {
    mint,
    txApprove,
    txMint,
    isLoading: isLoadingApprove || isLoadingMint,
  };
}
