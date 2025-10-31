// MongoDB helper functions
// Note: Untuk production, buat API endpoint di backend untuk security
// File ini menggunakan fetch ke API endpoint yang perlu dibuat

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

// Debug: Log API URL (always, for debugging)
console.log('🔗 [mongodb.js] API_BASE_URL:', API_BASE_URL);
console.log('🔗 [mongodb.js] VITE_API_URL env:', import.meta.env.VITE_API_URL);
console.log('🔗 [mongodb.js] Using fallback:', !import.meta.env.VITE_API_URL);

// Simpan data NFT ke MongoDB via API
export async function saveNFTToMongoDB(data) {
  try {
    const response = await fetch(`${API_BASE_URL}/nft/save`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        tokenId: data.tokenId,
        owner: data.owner,
        tier: data.tier,
        imageURI: data.imageURI,
        metadataURI: data.metadataURI,
        level: data.level || 1,
        energy: data.energy || 100,
        name: data.name,
        createdAt: new Date().toISOString(),
      }),
    });

    if (!response.ok) {
      throw new Error(`Failed to save NFT: ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error('MongoDB save error:', error);
    // Untuk development, kita bisa skip error ini
    console.warn('Continuing without MongoDB save (dev mode)');
    return { success: false, error: error.message };
  }
}

// Get NFT data dari MongoDB via API
export async function getNFTFromMongoDB(tokenId) {
  try {
    const response = await fetch(`${API_BASE_URL}/nft/${tokenId}`);
    
    if (!response.ok) {
      throw new Error(`Failed to get NFT: ${response.statusText}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('MongoDB get error:', error);
    return null;
  }
}

// Get semua NFT milik user via API
export async function getUserNFTs(ownerAddress) {
  try {
    const url = `${API_BASE_URL}/nft/owner/${ownerAddress}`;
    console.log('📡 Fetching NFTs from:', url);
    
    const response = await fetch(url);
    
    if (!response.ok) {
      console.error('❌ API response not OK:', response.status, response.statusText);
      throw new Error(`Failed to get user NFTs: ${response.statusText}`);
    }
    
    const result = await response.json();
    console.log('✅ API response:', { success: result.success, count: result.data?.length || 0 });
    // Backend mengembalikan { success: true, data: [...] }
    return result;
  } catch (error) {
    console.error('❌ MongoDB get user NFTs error:', error);
    console.error('❌ Error details:', { message: error.message, stack: error.stack });
    // Return format yang konsisten dengan backend
    return { success: false, data: [] };
  }
}

// Update NFT data (level, energy, etc) via API
export async function updateNFTInMongoDB(tokenId, updateData) {
  try {
    const response = await fetch(`${API_BASE_URL}/nft/${tokenId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(updateData),
    });

    if (!response.ok) {
      throw new Error(`Failed to update NFT: ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error('MongoDB update error:', error);
    return { success: false, error: error.message };
  }
}

// Local storage fallback untuk development (jika API belum tersedia)
export function saveNFTToLocalStorage(data) {
  try {
    const key = `nft_${data.tokenId}`;
    localStorage.setItem(key, JSON.stringify(data));
    return { success: true };
  } catch (error) {
    console.error('LocalStorage save error:', error);
    return { success: false, error: error.message };
  }
}

export function getNFTFromLocalStorage(tokenId) {
  try {
    const key = `nft_${tokenId}`;
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : null;
  } catch (error) {
    console.error('LocalStorage get error:', error);
    return null;
  }
}

// Try MongoDB first, fallback to localStorage
export async function saveNFTData(data) {
  // Try MongoDB API first
  const result = await saveNFTToMongoDB(data);
  
  // Fallback to localStorage if MongoDB fails (for dev)
  if (!result.success) {
    return saveNFTToLocalStorage(data);
  }
  
  return result;
}

// Sync wallet ownership status
export async function syncWalletOwnership(walletAddress, hasNFT) {
  try {
    const response = await fetch(`${API_BASE_URL}/wallet/sync`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        walletAddress,
        hasNFT,
        lastChecked: new Date().toISOString(),
      }),
    });

    if (!response.ok) {
      throw new Error(`Failed to sync wallet: ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Wallet sync error:', error);
    // Fallback to localStorage
    try {
      const walletData = {
        walletAddress,
        hasNFT,
        lastChecked: new Date().toISOString(),
      };
      localStorage.setItem(`wallet_${walletAddress}`, JSON.stringify(walletData));
      return { success: true };
    } catch (err) {
      return { success: false, error: err.message };
    }
  }
}

// Get wallet ownership status
export async function getWalletOwnership(walletAddress) {
  try {
    const response = await fetch(`${API_BASE_URL}/wallet/${walletAddress}`);
    
    if (!response.ok) {
      throw new Error(`Failed to get wallet status: ${response.statusText}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('Get wallet ownership error:', error);
    // Fallback to localStorage
    const stored = localStorage.getItem(`wallet_${walletAddress}`);
    return stored ? JSON.parse(stored) : null;
  }
}

// Save game score to leaderboard
export async function saveGameScore(walletAddress, gameId, score, petName, petTokenId) {
  try {
    const response = await fetch(`${API_BASE_URL}/leaderboard/save`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        walletAddress,
        gameId,
        score,
        petName,
        petTokenId,
      }),
    });

    if (!response.ok) {
      throw new Error(`Failed to save score: ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Save score error:', error);
    return { success: false, error: error.message };
  }
}

// Get leaderboard for a game
export async function getLeaderboard(gameId, limit = 10) {
  try {
    const response = await fetch(`${API_BASE_URL}/leaderboard/${gameId}?limit=${limit}`);
    
    if (!response.ok) {
      throw new Error(`Failed to get leaderboard: ${response.statusText}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('Get leaderboard error:', error);
    return { success: false, data: [] };
  }
}

// Get user's best score
export async function getUserBestScore(gameId, walletAddress) {
  try {
    const response = await fetch(`${API_BASE_URL}/leaderboard/${gameId}/${walletAddress}`);
    
    if (!response.ok) {
      throw new Error(`Failed to get best score: ${response.statusText}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('Get best score error:', error);
    return { success: false, data: null };
  }
}

// Spend energy from database (off-chain, no wallet confirmation needed)
export async function spendPetEnergy(tokenId, energyCost) {
  try {
    const response = await fetch(`${API_BASE_URL}/nft/${tokenId}/spend-energy`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        energyCost,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || `Failed to spend energy: ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Spend energy error:', error);
    return { success: false, error: error.message };
  }
}

// Feed pet (off-chain, no wallet confirmation needed)
export async function feedPet(tokenId, foodType, walletAddress) {
  try {
    const response = await fetch(`${API_BASE_URL}/pet/${tokenId}/feed`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        foodType,
        walletAddress,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || `Failed to feed pet: ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Feed pet error:', error);
    return { success: false, error: error.message };
  }
}

// Buy food (off-chain, no wallet confirmation needed)
export async function buyFood(walletAddress, foodType, quantity) {
  try {
    const response = await fetch(`${API_BASE_URL}/shop/buy-food`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        walletAddress,
        foodType,
        quantity,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || `Failed to buy food: ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Buy food error:', error);
    return { success: false, error: error.message };
  }
}

// Get user's bag
export async function getBag(walletAddress) {
  try {
    const response = await fetch(`${API_BASE_URL}/bag/${walletAddress}`);
    
    if (!response.ok) {
      throw new Error(`Failed to get bag: ${response.statusText}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('Get bag error:', error);
    return { success: false, data: { burger: 0, ayam: 0 } };
  }
}

// Chat functions

// Get all chat messages
export async function getChatMessages(limit = 100) {
  try {
    const response = await fetch(`${API_BASE_URL}/chat/messages?limit=${limit}`);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch chat messages: ${response.statusText}`);
    }
    
    const result = await response.json();
    return result;
  } catch (error) {
    console.error('Error fetching chat messages:', error);
    return { success: false, error: error.message };
  }
}

// Send a chat message
export async function sendChatMessage(sender, message, walletAddress) {
  try {
    const response = await fetch(`${API_BASE_URL}/chat/message`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        sender,
        message,
        walletAddress,
      }),
    });
    
    if (!response.ok) {
      throw new Error(`Failed to send message: ${response.statusText}`);
    }
    
    const result = await response.json();
    return result;
  } catch (error) {
    console.error('Error sending chat message:', error);
    return { success: false, error: error.message };
  }
}

