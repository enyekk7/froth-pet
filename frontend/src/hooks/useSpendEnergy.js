import { useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { petNFTAddress, petNFTAbi, isValidAddress } from '../lib/contracts';
import { useStore } from '../state/useStore';

export function useSpendEnergy() {
  const { writeContract, data: txHash } = useWriteContract();
  const { isLoading } = useWaitForTransactionReceipt({ hash: txHash });
  const setUiLoading = useStore((state) => state.setUiLoading);

  const spendEnergy = async (tokenId, cost) => {
    if (!isValidAddress(petNFTAddress)) {
      throw new Error('PetNFT contract address not configured');
    }

    setUiLoading(true);
    try {
      writeContract({
        address: petNFTAddress,
        abi: petNFTAbi,
        functionName: 'spendEnergy',
        args: [BigInt(tokenId), cost],
      });
    } catch (error) {
      console.error('Spend energy error:', error);
      setUiLoading(false);
      throw error;
    }
  };

  const { refetch } = useWaitForTransactionReceipt({
    hash: txHash,
    onSuccess: () => {
      setUiLoading(false);
    },
    onError: () => {
      setUiLoading(false);
    },
  });

  return { spendEnergy, isLoading, txHash };
}

