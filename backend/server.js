import express from 'express';
import cors from 'cors';
import { MongoClient } from 'mongodb';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors({
  origin: '*', // Allow all origins (Vercel, localhost, etc)
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: false
}));
app.use(express.json());

// MongoDB connection
const MONGODB_URI = process.env.MONGODB_URI;
if (!MONGODB_URI) {
  console.error('❌ MONGODB_URI environment variable is required!');
  console.error('Please set MONGODB_URI in your .env file or environment variables.');
  process.exit(1);
}
const DB_NAME = 'kittycraft';
const COLLECTION_NFTS = 'nfts';
const COLLECTION_WALLETS = 'wallets';
const COLLECTION_LEADERBOARD = 'leaderboard';
const COLLECTION_BAGS = 'bags'; // User food inventory (off-chain)
const COLLECTION_CHAT = 'chat'; // Global chat messages

let db;
let client;

// Connect to MongoDB
async function connectToMongoDB() {
  try {
    client = new MongoClient(MONGODB_URI);
    await client.connect();
    db = client.db(DB_NAME);
    console.log('✅ Connected to MongoDB');

    // Create indexes
    await db.collection(COLLECTION_NFTS).createIndex({ tokenId: 1 }, { unique: true });
    await db.collection(COLLECTION_NFTS).createIndex({ owner: 1 });
    await db.collection(COLLECTION_WALLETS).createIndex({ walletAddress: 1 }, { unique: true });
    await db.collection(COLLECTION_BAGS).createIndex({ walletAddress: 1 }, { unique: true });
    await db.collection(COLLECTION_LEADERBOARD).createIndex({ gameId: 1, score: -1 });
    await db.collection(COLLECTION_CHAT).createIndex({ createdAt: -1 }); // For sorting by newest first
    // Create unique index for walletAddress + gameId (best score per wallet per game)
    // Drop existing index first if it exists with different options
    try {
      await db.collection(COLLECTION_LEADERBOARD).dropIndex('walletAddress_1_gameId_1');
    } catch (err) {
      // Index doesn't exist or already dropped, ignore
    }
    try {
      await db.collection(COLLECTION_LEADERBOARD).createIndex(
        { walletAddress: 1, gameId: 1 }, 
        { unique: true, background: true }
      );
    } catch (err) {
      console.warn('Could not create unique index (may have duplicates):', err.message);
      // If unique index fails due to duplicates, continue without it
      // We'll handle deduplication in the GET endpoint
    }

    console.log('✅ MongoDB indexes created');
  } catch (error) {
    console.error('❌ MongoDB connection error:', error);
    process.exit(1);
  }
}

// API Routes

// API root endpoint (must be before other /api/* routes)
app.get('/api', (req, res) => {
  res.json({ 
    message: 'FROTH PET Backend API',
    version: '1.0.0',
    endpoints: {
      health: '/api/health',
      nft: '/api/nft',
      wallet: '/api/wallet',
      leaderboard: '/api/leaderboard',
      bag: '/api/bag',
      chat: '/api/chat'
    }
  });
});

// Save NFT data
app.post('/api/nft/save', async (req, res) => {
  try {
    const { tokenId, owner, tier, imageURI, metadataURI, level, energy, name, createdAt } = req.body;

    if (!tokenId || !owner) {
      return res.status(400).json({ success: false, error: 'tokenId and owner are required' });
    }

    const nftData = {
      tokenId: tokenId.toString(),
      owner: owner.toLowerCase(),
      tier: tier || 'common',
      imageURI: imageURI || '',
      metadataURI: metadataURI || '',
      level: level || 1,
      energy: energy || 100,
      name: name || `Pet #${tokenId}`,
      createdAt: createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const result = await db.collection(COLLECTION_NFTS).updateOne(
      { tokenId: tokenId.toString() },
      { $set: nftData },
      { upsert: true }
    );

    // Update wallet ownership
    await db.collection(COLLECTION_WALLETS).updateOne(
      { walletAddress: owner.toLowerCase() },
      { 
        $set: { 
          walletAddress: owner.toLowerCase(),
          hasNFT: true,
          lastChecked: new Date().toISOString(),
        }
      },
      { upsert: true }
    );

    res.json({ success: true, result });
  } catch (error) {
    console.error('Error saving NFT:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get NFT by tokenId
app.get('/api/nft/:tokenId', async (req, res) => {
  try {
    const { tokenId } = req.params;
    const nft = await db.collection(COLLECTION_NFTS).findOne({ tokenId: tokenId.toString() });

    if (!nft) {
      return res.status(404).json({ success: false, error: 'NFT not found' });
    }

    res.json({ success: true, data: nft });
  } catch (error) {
    console.error('Error getting NFT:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get all NFTs by owner
app.get('/api/nft/owner/:owner', async (req, res) => {
  try {
    const { owner } = req.params;
    const nfts = await db.collection(COLLECTION_NFTS)
      .find({ owner: owner.toLowerCase() })
      .sort({ createdAt: -1 })
      .toArray();

    res.json({ success: true, data: nfts });
  } catch (error) {
    console.error('Error getting user NFTs:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Update NFT data
app.patch('/api/nft/:tokenId', async (req, res) => {
  try {
    const { tokenId } = req.params;
    const updateData = {
      ...req.body,
      updatedAt: new Date().toISOString(),
    };

    const result = await db.collection(COLLECTION_NFTS).updateOne(
      { tokenId: tokenId.toString() },
      { $set: updateData }
    );

    if (result.matchedCount === 0) {
      return res.status(404).json({ success: false, error: 'NFT not found' });
    }

    res.json({ success: true, result });
  } catch (error) {
    console.error('Error updating NFT:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Spend energy from database (off-chain, no wallet confirmation needed)
app.post('/api/nft/:tokenId/spend-energy', async (req, res) => {
  try {
    const { tokenId } = req.params;
    const { energyCost } = req.body;

    if (!energyCost || energyCost <= 0) {
      return res.status(400).json({ success: false, error: 'energyCost is required and must be positive' });
    }

    // Get current NFT data
    const nft = await db.collection(COLLECTION_NFTS).findOne({ tokenId: tokenId.toString() });

    if (!nft) {
      return res.status(404).json({ success: false, error: 'NFT not found' });
    }

    // Check if enough energy
    if (nft.energy < energyCost) {
      return res.status(400).json({ 
        success: false, 
        error: `Not enough energy. Current: ${nft.energy}, Required: ${energyCost}` 
      });
    }

    // Update energy
    const newEnergy = Math.max(0, nft.energy - energyCost);
    const result = await db.collection(COLLECTION_NFTS).updateOne(
      { tokenId: tokenId.toString() },
      { 
        $set: { 
          energy: newEnergy,
          updatedAt: new Date().toISOString(),
        } 
      }
    );

    res.json({ 
      success: true, 
      data: {
        tokenId: tokenId.toString(),
        previousEnergy: nft.energy,
        newEnergy: newEnergy,
        energyCost: energyCost,
      }
    });
  } catch (error) {
    console.error('Error spending energy:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Delete NFT (when transferred/sold)
app.delete('/api/nft/:tokenId', async (req, res) => {
  try {
    const { tokenId } = req.params;
    const result = await db.collection(COLLECTION_NFTS).deleteOne({ tokenId: tokenId.toString() });

    res.json({ success: true, result });
  } catch (error) {
    console.error('Error deleting NFT:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Sync wallet ownership
app.post('/api/wallet/sync', async (req, res) => {
  try {
    const { walletAddress, hasNFT, lastChecked } = req.body;

    if (!walletAddress) {
      return res.status(400).json({ success: false, error: 'walletAddress is required' });
    }

    const walletData = {
      walletAddress: walletAddress.toLowerCase(),
      hasNFT: hasNFT || false,
      lastChecked: lastChecked || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const result = await db.collection(COLLECTION_WALLETS).updateOne(
      { walletAddress: walletAddress.toLowerCase() },
      { $set: walletData },
      { upsert: true }
    );

    res.json({ success: true, result, data: walletData });
  } catch (error) {
    console.error('Error syncing wallet:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get wallet ownership status
app.get('/api/wallet/:walletAddress', async (req, res) => {
  try {
    const { walletAddress } = req.params;
    const wallet = await db.collection(COLLECTION_WALLETS).findOne({
      walletAddress: walletAddress.toLowerCase(),
    });

    if (!wallet) {
      return res.json({ success: true, data: null });
    }

    res.json({ success: true, data: wallet });
  } catch (error) {
    console.error('Error getting wallet:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Save game score to leaderboard (only save if it's the best score)
app.post('/api/leaderboard/save', async (req, res) => {
  try {
    const { walletAddress, gameId, score, petName, petTokenId } = req.body;

    if (!walletAddress || !gameId || score === undefined) {
      return res.status(400).json({ success: false, error: 'walletAddress, gameId, and score are required' });
    }

    const walletAddr = walletAddress.toLowerCase();
    const scoreNum = Number(score);

    // Get current best score for this wallet and game
    const existingEntry = await db.collection(COLLECTION_LEADERBOARD).findOne({
      walletAddress: walletAddr,
      gameId: gameId,
    });

    // Only update if new score is higher than existing, or if no entry exists
    if (!existingEntry || scoreNum > existingEntry.score) {
      const leaderboardEntry = {
        walletAddress: walletAddr,
        gameId,
        score: scoreNum,
        petName: petName || null,
        petTokenId: petTokenId || null,
        playedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      // Upsert (update if exists, insert if not) - keep best score
      await db.collection(COLLECTION_LEADERBOARD).updateOne(
        { walletAddress: walletAddr, gameId: gameId },
        { 
          $set: leaderboardEntry,
          $setOnInsert: { createdAt: new Date().toISOString() }
        },
        { upsert: true }
      );

      res.json({ 
        success: true, 
        data: leaderboardEntry,
        isNewBest: true,
        previousBest: existingEntry?.score || null
      });
    } else {
      // Score not higher, return existing entry
      res.json({ 
        success: true, 
        data: existingEntry,
        isNewBest: false,
        message: 'Score not higher than best score'
      });
    }
  } catch (error) {
    console.error('Error saving leaderboard:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get leaderboard for a game (only best scores per wallet)
app.get('/api/leaderboard/:gameId', async (req, res) => {
  try {
    const { gameId } = req.params;
    const limit = parseInt(req.query.limit) || 10;

    // Get best scores per wallet (each wallet appears only once with their highest score)
    const leaderboard = await db.collection(COLLECTION_LEADERBOARD)
      .find({ gameId })
      .sort({ score: -1 })
      .limit(limit * 2) // Get more to ensure we have enough after deduplication
      .toArray();

    // Deduplicate by wallet (keep only highest score per wallet)
    const walletMap = new Map();
    leaderboard.forEach(entry => {
      const addr = entry.walletAddress.toLowerCase();
      if (!walletMap.has(addr) || entry.score > walletMap.get(addr).score) {
        walletMap.set(addr, entry);
      }
    });

    // Convert map to array and sort by score
    const uniqueLeaderboard = Array.from(walletMap.values())
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);

    res.json({ success: true, data: uniqueLeaderboard });
  } catch (error) {
    console.error('Error getting leaderboard:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get user's best score for a game
app.get('/api/leaderboard/:gameId/:walletAddress', async (req, res) => {
  try {
    const { gameId, walletAddress } = req.params;

    const bestScore = await db.collection(COLLECTION_LEADERBOARD)
      .findOne(
        { gameId, walletAddress: walletAddress.toLowerCase() },
        { sort: { score: -1 } }
      );

    res.json({ success: true, data: bestScore || null });
  } catch (error) {
    console.error('Error getting user best score:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Feed pet (off-chain, no wallet confirmation)
app.post('/api/pet/:tokenId/feed', async (req, res) => {
  try {
    const { tokenId } = req.params;
    const { foodType, walletAddress } = req.body;

    if (!foodType || (foodType !== 1 && foodType !== 2)) {
      return res.status(400).json({ success: false, error: 'Invalid foodType. Must be 1 (Burger) or 2 (Grilled Chicken)' });
    }

    if (!walletAddress) {
      return res.status(400).json({ success: false, error: 'walletAddress is required' });
    }

    // Get user's bag
    const bag = await db.collection(COLLECTION_BAGS).findOne({ 
      walletAddress: walletAddress.toLowerCase() 
    });

    if (!bag || bag[foodType === 1 ? 'burger' : 'ayam'] <= 0) {
      return res.status(400).json({ 
        success: false, 
        error: `Insufficient food. Food type: ${foodType === 1 ? 'Burger' : 'Grilled Chicken'}` 
      });
    }

    // Get NFT data
    const nft = await db.collection(COLLECTION_NFTS).findOne({ tokenId: tokenId.toString() });
    if (!nft) {
      return res.status(404).json({ success: false, error: 'NFT not found' });
    }

    // Verify ownership
    if (nft.owner.toLowerCase() !== walletAddress.toLowerCase()) {
      return res.status(403).json({ success: false, error: 'Not the owner of this pet' });
    }

    // Check if pet already has 100% energy
    const currentEnergy = nft.energy || 0;
    if (currentEnergy >= 100) {
      return res.status(400).json({ 
        success: false, 
        error: 'Energy 100%',
        message: 'Pet already has full energy!'
      });
    }

    // Restore energy based on food type
    const restoreAmount = foodType === 1 ? 50 : 100;
    const newEnergy = Math.min(100, currentEnergy + restoreAmount);

    // Update pet energy
    await db.collection(COLLECTION_NFTS).updateOne(
      { tokenId: tokenId.toString() },
      { 
        $set: { 
          energy: newEnergy,
          updatedAt: new Date().toISOString(),
        } 
      }
    );

    // Decrease food from bag
    const foodKey = foodType === 1 ? 'burger' : 'ayam';
    const currentFoodQty = bag[foodKey] || 0;
    
    // Check if bag exists
    const existingBag = await db.collection(COLLECTION_BAGS).findOne({ 
      walletAddress: walletAddress.toLowerCase() 
    });

    if (existingBag) {
      // Calculate new quantity (ensure it doesn't go below 0)
      const newQty = Math.max(0, currentFoodQty - 1);
      
      // Update existing bag
      await db.collection(COLLECTION_BAGS).updateOne(
        { walletAddress: walletAddress.toLowerCase() },
        {
          $set: { 
            [foodKey]: newQty,
            updatedAt: new Date().toISOString() 
          }
        }
      );

      // Get updated bag to return remaining food info
      const updatedBag = await db.collection(COLLECTION_BAGS).findOne({ 
        walletAddress: walletAddress.toLowerCase() 
      });

      res.json({ 
        success: true, 
        data: {
          tokenId: tokenId.toString(),
          previousEnergy: currentEnergy,
          newEnergy: newEnergy,
          restoreAmount: restoreAmount,
          foodType: foodType === 1 ? 'Burger' : 'Grilled Chicken',
          remainingFood: {
            burger: updatedBag?.burger || 0,
            ayam: updatedBag?.ayam || 0,
          }
        }
      });
    } else {
      // This shouldn't happen if user has food, but handle it gracefully
      return res.status(400).json({ 
        success: false, 
        error: 'Bag not found. Please purchase food first.' 
      });
    }
  } catch (error) {
    console.error('Error feeding pet:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Sync bag from blockchain transaction (called after buyFood transaction succeeds)
app.post('/api/shop/sync-bag', async (req, res) => {
  try {
    const { walletAddress, foodType, quantity } = req.body;

    if (!walletAddress || !foodType || quantity === undefined) {
      return res.status(400).json({ success: false, error: 'walletAddress, foodType, and quantity are required' });
    }

    if (foodType !== 1 && foodType !== 2) {
      return res.status(400).json({ success: false, error: 'Invalid foodType. Must be 1 (Burger) or 2 (Grilled Chicken)' });
    }

    if (quantity <= 0) {
      return res.status(400).json({ success: false, error: 'Quantity must be positive' });
    }

    const foodKey = foodType === 1 ? 'burger' : 'ayam';
    const foodName = foodType === 1 ? 'Burger' : 'Grilled Chicken';

    // Update user's bag
    // Check if bag exists
    const existingBag = await db.collection(COLLECTION_BAGS).findOne({ 
      walletAddress: walletAddress.toLowerCase() 
    });

    if (existingBag) {
      // Update existing bag
      await db.collection(COLLECTION_BAGS).updateOne(
        { walletAddress: walletAddress.toLowerCase() },
        {
          $inc: { [foodKey]: quantity },
          $set: { updatedAt: new Date().toISOString() }
        }
      );
    } else {
      // Create new bag
      await db.collection(COLLECTION_BAGS).insertOne({
        walletAddress: walletAddress.toLowerCase(),
        burger: foodType === 1 ? quantity : 0,
        ayam: foodType === 2 ? quantity : 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
    }

    res.json({ 
      success: true, 
      data: {
        foodType: foodName,
        quantity: quantity,
        walletAddress: walletAddress.toLowerCase(),
      }
    });
  } catch (error) {
    console.error('Error syncing bag:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Buy food (off-chain, no wallet confirmation) - DEPRECATED, use blockchain transaction instead
app.post('/api/shop/buy-food', async (req, res) => {
  try {
    const { walletAddress, foodType, quantity } = req.body;

    if (!walletAddress || !foodType || !quantity) {
      return res.status(400).json({ success: false, error: 'walletAddress, foodType, and quantity are required' });
    }

    if (foodType !== 1 && foodType !== 2) {
      return res.status(400).json({ success: false, error: 'Invalid foodType. Must be 1 (Burger) or 2 (Grilled Chicken)' });
    }

    if (quantity <= 0) {
      return res.status(400).json({ success: false, error: 'Quantity must be positive' });
    }

    // Food prices (off-chain)
    const prices = {
      1: 2, // Burger: 2 FROTH (just for record, no actual transaction)
      2: 3, // Grilled Chicken: 3 FROTH
    };

    const totalPrice = prices[foodType] * quantity;
    const foodKey = foodType === 1 ? 'burger' : 'ayam';
    const foodName = foodType === 1 ? 'Burger' : 'Grilled Chicken';

    // Update user's bag
    // Check if bag exists
    const existingBag = await db.collection(COLLECTION_BAGS).findOne({ 
      walletAddress: walletAddress.toLowerCase() 
    });

    if (existingBag) {
      // Update existing bag
      await db.collection(COLLECTION_BAGS).updateOne(
        { walletAddress: walletAddress.toLowerCase() },
        {
          $inc: { [foodKey]: quantity },
          $set: { updatedAt: new Date().toISOString() }
        }
      );
    } else {
      // Create new bag
      await db.collection(COLLECTION_BAGS).insertOne({
        walletAddress: walletAddress.toLowerCase(),
        burger: foodType === 1 ? quantity : 0,
        ayam: foodType === 2 ? quantity : 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
    }

    res.json({ 
      success: true, 
      data: {
        foodType: foodName,
        quantity: quantity,
        totalPrice: totalPrice,
        walletAddress: walletAddress.toLowerCase(),
      }
    });
  } catch (error) {
    console.error('Error buying food:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get user's bag
app.get('/api/bag/:walletAddress', async (req, res) => {
  try {
    const { walletAddress } = req.params;
    const bag = await db.collection(COLLECTION_BAGS).findOne({ 
      walletAddress: walletAddress.toLowerCase() 
    });

    if (!bag) {
      return res.json({ 
        success: true, 
        data: { burger: 0, ayam: 0 } 
      });
    }

    res.json({ 
      success: true, 
      data: { 
        burger: bag.burger || 0, 
        ayam: bag.ayam || 0 
      } 
    });
  } catch (error) {
    console.error('Error getting bag:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Chat API endpoints

// Get all chat messages (sorted by newest first, limit 100)
app.get('/api/chat/messages', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 100;
    const messages = await db.collection(COLLECTION_CHAT)
      .find({})
      .sort({ createdAt: -1 })
      .limit(limit)
      .toArray();
    
    // Reverse to show oldest first in UI
    res.json({ success: true, data: messages.reverse() });
  } catch (error) {
    console.error('Error fetching chat messages:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Post a new chat message (Note: Frontend should verify FROTH balance, but we validate here too)
app.post('/api/chat/message', async (req, res) => {
  try {
    const { sender, message, walletAddress } = req.body;

    if (!sender || !message || !walletAddress) {
      return res.status(400).json({ 
        success: false, 
        error: 'sender, message, and walletAddress are required' 
      });
    }

    // Validate wallet address format
    if (!walletAddress.startsWith('0x') || walletAddress.length !== 42) {
      return res.status(400).json({ 
        success: false, 
        error: 'Invalid wallet address format' 
      });
    }

    // Note: In production, you might want to verify FROTH balance on-chain here
    // For now, we trust the frontend verification, but backend validation can be added

    const chatMessage = {
      sender: sender, // Shortened address like "0x1234...5678"
      walletAddress: walletAddress.toLowerCase(), // Full address for tracking
      message: message.trim(),
      createdAt: new Date().toISOString(),
    };

    const result = await db.collection(COLLECTION_CHAT).insertOne(chatMessage);

    res.json({ 
      success: true, 
      data: {
        ...chatMessage,
        _id: result.insertedId.toString()
      }
    });
  } catch (error) {
    console.error('Error saving chat message:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Root endpoint
app.get('/', (req, res) => {
  res.json({ 
    message: 'FROTH PET Backend API',
    version: '1.0.0',
    endpoints: {
      health: '/api/health',
      nft: '/api/nft',
      wallet: '/api/wallet',
      leaderboard: '/api/leaderboard',
      bag: '/api/bag',
      chat: '/api/chat'
    }
  });
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    mongodb: db ? 'connected' : 'disconnected',
  });
});

// Start server
async function startServer() {
  await connectToMongoDB();
  
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Backend server running on http://0.0.0.0:${PORT}`);
    console.log(`📊 MongoDB connected to ${DB_NAME}`);
  });
}

startServer().catch(console.error);

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('\n🛑 Shutting down server...');
  if (client) {
    await client.close();
    console.log('✅ MongoDB connection closed');
  }
  process.exit(0);
});


