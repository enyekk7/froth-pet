import { useState, useEffect } from 'react';
import { useAccount, useReadContract, usePublicClient } from 'wagmi';
import { shopAddress, shopAbi, isValidAddress } from '../lib/contracts';
import { useBuyFood } from '../hooks/useBuyFood';
import { useStore } from '../state/useStore';
import { getBag } from '../lib/mongodb';
import ConnectButton from '../components/ConnectButton';
import { formatEther } from 'viem';
import { ShoppingBag, Cookie, Beef } from 'lucide-react';

export default function ShopPage() {
  const { address, isConnected } = useAccount();
  const publicClient = usePublicClient();
  const { buyFood, isLoading, lastPurchase, clearLastPurchase } = useBuyFood();
  const { setBag } = useStore();
  const [quantities, setQuantities] = useState({ burger: 1, ayam: 1 });
  const [showSuccessModal, setShowSuccessModal] = useState(false);

  // Food prices from contract (on-chain)
  const { data: burgerPriceData } = useReadContract({
    address: shopAddress,
    abi: shopAbi,
    functionName: 'foods',
    args: [1],
    query: { enabled: isValidAddress(shopAddress) },
  });

  const { data: ayamPriceData } = useReadContract({
    address: shopAddress,
    abi: shopAbi,
    functionName: 'foods',
    args: [2],
    query: { enabled: isValidAddress(shopAddress) },
  });

  // Parse food prices from contract
  const getFoodPrice = (foodData) => {
    if (!foodData) return null;
    // Handle both array [name, price, foodType, restoreAmount] and object {name, price, ...}
    const price = Array.isArray(foodData) ? foodData[1] : foodData.price;
    return price ? Number(formatEther(price)) : null;
  };

  // Food prices
  const foodPrices = {
    1: getFoodPrice(burgerPriceData) ?? 2, // Burger: 2 FROTH (fallback)
    2: getFoodPrice(ayamPriceData) ?? 3, // Grilled Chicken: 3 FROTH (fallback)
  };

  // Fetch bag on mount and after purchase - read from contract (on-chain source of truth)
  useEffect(() => {
    const fetchBag = async () => {
      if (!address || !publicClient || !shopAddress || !isValidAddress(shopAddress)) return;
      
      try {
        // Read from contract first (source of truth)
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
        try {
          const result = await getBag(address);
          // Database is just for reference, contract is source of truth
        } catch (dbError) {
          // Backend may be down - that's okay, data is on-chain
          console.warn('Could not sync to database, but bag data is on-chain');
        }
      } catch (error) {
        console.error('Error fetching bag from contract:', error);
        // Fallback to database if contract read fails
        try {
          const result = await getBag(address);
          if (result.success) {
            setBag({ 
              burger: BigInt(result.data.burger || 0), 
              ayam: BigInt(result.data.ayam || 0) 
            });
          }
        } catch (dbError) {
          console.error('Could not fetch bag from contract or database:', dbError);
        }
      }
    };

    if (isConnected && address) {
      fetchBag();
      const interval = setInterval(fetchBag, 5000); // Refresh every 5 seconds
      return () => clearInterval(interval);
    }
  }, [address, isConnected, publicClient, shopAddress, setBag]);

  // Show success modal when purchase completes
  useEffect(() => {
    if (lastPurchase) {
      setShowSuccessModal(true);
      // Refetch bag from contract after purchase
      const fetchBag = async () => {
        if (!address || !publicClient || !shopAddress || !isValidAddress(shopAddress)) return;
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
        } catch (error) {
          console.error('Error fetching bag from contract:', error);
        }
      };
      fetchBag();
    }
  }, [lastPurchase, address, publicClient, shopAddress, setBag]);

  const handleBuy = async (foodType) => {
    if (!address) return;
    
    const type = foodType === 1 ? 'burger' : 'ayam';
    const qty = quantities[type];

    try {
      await buyFood(foodType, qty, foodPrices[foodType]);
    } catch (error) {
      console.error('Buy error:', error);
      alert(error.message || 'Failed to buy food');
    }
  };

  const isValidShop = isValidAddress(shopAddress);

  if (!isConnected) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 pb-24">
        <div className="bg-white rounded-xl p-8 shadow-lg max-w-md w-full">
          <h2 className="text-2xl font-bold mb-4 text-center">Connect Wallet</h2>
          <ConnectButton />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-4 pb-24">
      <div className="mb-4">
        <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
          <ShoppingBag className="text-green-600" size={28} strokeWidth={2.5} />
          Shop
        </h1>
      </div>

      {/* Warning jika contract belum dikonfigurasi */}
      {!isValidShop && (
        <div className="bg-yellow-50 border-2 border-yellow-400 rounded-xl p-6 mb-6">
          <div className="flex items-start gap-3">
            <div className="text-yellow-600 text-2xl">⚠️</div>
            <div>
              <h3 className="font-bold text-yellow-800 mb-2">Shop Contract Belum Dikonfigurasi</h3>
              <p className="text-yellow-700 text-sm mb-3">
                Untuk menggunakan fitur beli makanan, Anda perlu:
              </p>
              <ol className="text-yellow-700 text-sm list-decimal list-inside space-y-1 mb-3">
                <li>Deploy Shop contract ke Flow EVM Mainnet</li>
                <li>Set <code className="bg-yellow-100 px-1 rounded">VITE_SHOP_ADDRESS</code> di Vercel</li>
                <li>Redeploy frontend</li>
              </ol>
            </div>
          </div>
        </div>
      )}

      <div className="space-y-4">
        {/* Burger Card */}
        <div className="bg-white rounded-xl p-6 shadow-lg">
          <div className="flex items-center gap-4 mb-4">
            <div className="bg-orange-100 p-3 rounded-full">
              <Cookie className="text-orange-600" size={36} strokeWidth={2} />
            </div>
            <div className="flex-1">
              <h3 className="text-xl font-bold">Burger</h3>
              <p className="text-gray-600">Restore +50 Energy</p>
              <p className="text-lg font-semibold text-orange-600 mt-1">
                {foodPrices[1]} FROTH
              </p>
            </div>
          </div>
          <div className="flex gap-2 items-center">
            <input
              type="number"
              min="1"
              value={quantities.burger}
              onChange={(e) => setQuantities(prev => ({ ...prev, burger: parseInt(e.target.value) || 1 }))}
              className="w-20 px-3 py-2 border border-gray-300 rounded-lg"
            />
            <button
              onClick={() => handleBuy(1)}
              className="flex-1 bg-orange-600 text-white px-4 py-2 rounded-lg font-semibold hover:bg-orange-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={isLoading || !isValidShop}
            >
              {!isValidShop ? 'Contract Not Configured' : isLoading ? 'Buying...' : 'Buy'}
            </button>
          </div>
        </div>

        {/* Grilled Chicken Card */}
        <div className="bg-white rounded-xl p-6 shadow-lg">
          <div className="flex items-center gap-4 mb-4">
            <div className="bg-yellow-100 p-3 rounded-full">
              <Beef className="text-yellow-600" size={36} strokeWidth={2} />
            </div>
            <div className="flex-1">
              <h3 className="text-xl font-bold">Grilled Chicken</h3>
              <p className="text-gray-600">Restore +100 (Full Energy)</p>
              <p className="text-lg font-semibold text-yellow-600 mt-1">
                {foodPrices[2]} FROTH
              </p>
            </div>
          </div>
          <div className="flex gap-2 items-center">
            <input
              type="number"
              min="1"
              value={quantities.ayam}
              onChange={(e) => setQuantities(prev => ({ ...prev, ayam: parseInt(e.target.value) || 1 }))}
              className="w-20 px-3 py-2 border border-gray-300 rounded-lg"
            />
            <button
              onClick={() => handleBuy(2)}
              className="flex-1 bg-yellow-600 text-white px-4 py-2 rounded-lg font-semibold hover:bg-yellow-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={isLoading || !isValidShop}
            >
              {!isValidShop ? 'Contract Not Configured' : isLoading ? 'Buying...' : 'Buy'}
            </button>
          </div>
        </div>
      </div>

      {/* Success Modal */}
      {showSuccessModal && lastPurchase && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => { setShowSuccessModal(false); clearLastPurchase(); }}>
          <div className="bg-white rounded-xl p-6 max-w-sm w-full shadow-2xl border-2 border-green-200 relative" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={() => { setShowSuccessModal(false); clearLastPurchase(); }}
              className="absolute top-2 right-2 text-gray-400 hover:text-gray-600 text-xl"
            >
              ×
            </button>
            <div className="text-center">
              <div className="text-5xl mb-4">✅</div>
              <h3 className="text-2xl font-bold mb-2 text-green-600">Purchase Successful!</h3>
              <div className="space-y-2 mb-4">
                <p className="text-gray-700">
                  <span className="font-semibold">{lastPurchase.quantity}x</span> {lastPurchase.foodType}
                </p>
                <p className="text-lg font-semibold text-green-600">
                  Total: {lastPurchase.totalPrice} FROTH
                </p>
              </div>
              <button
                onClick={() => { setShowSuccessModal(false); clearLastPurchase(); }}
                className="bg-gradient-to-r from-green-500 to-emerald-600 text-white px-6 py-3 rounded-lg font-semibold hover:from-green-600 hover:to-emerald-700 transition-all shadow-lg transform hover:scale-105"
              >
                OK
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

