import { useState } from 'react';
import { useAccount } from 'wagmi';
import { feedPet } from '../lib/mongodb';
import { useStore } from '../state/useStore';

export function useFeed() {
  const { address } = useAccount();
  const setUiLoading = useStore((state) => state.setUiLoading);
  const [isLoading, setIsLoading] = useState(false);

  const feed = async (tokenId, foodType) => {
    if (!address) {
      throw new Error('Wallet not connected');
    }

    setUiLoading(true);
    setIsLoading(true);
    try {
      const result = await feedPet(tokenId, foodType, address);
      if (!result.success) {
        throw new Error(result.error || 'Failed to feed pet');
      }
      // Return result with remaining food info
      return result;
    } catch (error) {
      console.error('Feed error:', error);
      throw error;
    } finally {
      setUiLoading(false);
      setIsLoading(false);
    }
  };

  return { feed, isLoading };
}
