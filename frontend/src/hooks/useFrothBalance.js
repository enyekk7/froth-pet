import { useAccount, useReadContract } from 'wagmi';
import { frothAddress, frothAbi } from '../lib/contracts';
import { useStore } from '../state/useStore';
import { useEffect } from 'react';

export function useFrothBalance() {
  const { address } = useAccount();
  const setFrothBalance = useStore((state) => state.setFrothBalance);

  const { data, isLoading, refetch } = useReadContract({
    address: frothAddress,
    abi: frothAbi,
    functionName: 'balanceOf',
    args: [address || '0x0000000000000000000000000000000000000000'],
    query: { enabled: !!address && !!frothAddress },
  });

  useEffect(() => {
    if (data !== undefined) {
      setFrothBalance(data);
    }
  }, [data, setFrothBalance]);

  return { balance: data || 0n, isLoading, refetch };
}



