import { useState, useEffect } from 'react';
import { useAccount, useWriteContract, useWaitForTransactionReceipt, usePublicClient } from 'wagmi';
import { frothAddress, frothAbi, shopAddress, shopAbi, isValidAddress } from '../lib/contracts';
import { useStore } from '../state/useStore';
import { parseEther } from 'viem';
import { getBag } from '../lib/mongodb';

export function useBuyFood() {
  const { address } = useAccount();
  const publicClient = usePublicClient();
  const { writeContract: writeApprove, data: txApprove } = useWriteContract();
  const { isLoading: isLoadingApprove } = useWaitForTransactionReceipt({
    hash: txApprove,
  });
  
  const { writeContract: writeBuy, data: txBuy } = useWriteContract();
  const { isLoading: isLoadingBuy } = useWaitForTransactionReceipt({
    hash: txBuy,
  });
  
  const setUiLoading = useStore((state) => state.setUiLoading);
  const { setBag } = useStore();
  const [pendingBuy, setPendingBuy] = useState(null);
  const [lastPurchase, setLastPurchase] = useState(null);

  const buyFood = async (foodType, quantity, pricePerUnit) => {
    if (!address) {
      throw new Error('Wallet not connected');
    }

    if (!isValidAddress(shopAddress)) {
      throw new Error('Shop contract address not configured. Please set VITE_SHOP_ADDRESS in Vercel environment variables after deploying the Shop contract.');
    }

    setUiLoading(true);
    setPendingBuy({ foodType, quantity, pricePerUnit });
    try {
      const totalPrice = parseEther((pricePerUnit * quantity).toString());
      
      // Step 1: Approve FROTH tokens
      writeApprove({
        address: frothAddress,
        abi: frothAbi,
        functionName: 'approve',
        args: [shopAddress, totalPrice],
      });
    } catch (error) {
      console.error('Approve error:', error);
      setUiLoading(false);
      setPendingBuy(null);
      throw error;
    }
  };

  // Auto proceed to buy after approve succeeds
  useEffect(() => {
    if (txApprove && pendingBuy && !isLoadingApprove) {
      const totalPrice = parseEther((pendingBuy.pricePerUnit * pendingBuy.quantity).toString());
      writeBuy({
        address: shopAddress,
        abi: shopAbi,
        functionName: 'buyFood',
        args: [pendingBuy.foodType, BigInt(pendingBuy.quantity)],
      });
    }
  }, [txApprove, pendingBuy, isLoadingApprove, writeBuy]);

  // After buy transaction succeeds, read bag from contract (on-chain source of truth)
  useEffect(() => {
    if (txBuy && !isLoadingBuy && pendingBuy && address && publicClient && shopAddress) {
      // Transaction successful - FROTH already sent to dev wallet via contract
      const handlePurchaseSuccess = async () => {
        try {
          // Read bag directly from contract (source of truth, no backend needed)
          const contractBag = await publicClient.readContract({
            address: shopAddress,
            abi: shopAbi,
            functionName: 'getBag',
            args: [address],
          });

          // Update local state with contract data
          setBag({ 
            burger: contractBag[0] || 0n, 
            ayam: contractBag[1] || 0n 
          });

          // Try to sync to database (optional, for off-chain tracking)
          // If backend is down, it's okay - data is on-chain
          try {
            const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3001/api'}/shop/sync-bag`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                walletAddress: address,
                foodType: pendingBuy.foodType,
                quantity: pendingBuy.quantity,
              }),
            });

            if (response.ok) {
              const result = await response.json();
              if (!result.success) {
                console.warn('Failed to sync bag to database:', result.error);
              }
            }
          } catch (dbError) {
            // Backend may be down - that's okay, data is on-chain
            console.warn('Database sync optional - bag data is on-chain:', dbError.message);
          }

          // Store purchase info for success popup
          setLastPurchase({
            foodType: pendingBuy.foodType === 1 ? 'Burger' : 'Grilled Chicken',
            quantity: pendingBuy.quantity,
            totalPrice: pendingBuy.pricePerUnit * pendingBuy.quantity,
          });

          setUiLoading(false);
          setPendingBuy(null);
        } catch (error) {
          console.error('Error handling purchase success:', error);
          // Even if read fails, purchase succeeded on-chain
          setLastPurchase({
            foodType: pendingBuy.foodType === 1 ? 'Burger' : 'Grilled Chicken',
            quantity: pendingBuy.quantity,
            totalPrice: pendingBuy.pricePerUnit * pendingBuy.quantity,
          });
          setUiLoading(false);
          setPendingBuy(null);
        }
      };

      handlePurchaseSuccess();
    }
  }, [txBuy, isLoadingBuy, pendingBuy, address, publicClient, shopAddress, setBag, setUiLoading]);

  // Reset on error
  useEffect(() => {
    if (txApprove && isLoadingApprove === false && !txBuy) {
      // Approve succeeded but buy not triggered yet, wait
      return;
    }
  }, [txApprove, isLoadingApprove, txBuy]);

  return {
    buyFood,
    txApprove,
    txBuy,
    isLoading: isLoadingApprove || isLoadingBuy,
    lastPurchase,
    clearLastPurchase: () => setLastPurchase(null),
  };
}
