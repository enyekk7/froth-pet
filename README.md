# FROTH PET - Flow EVM Pet NFT dApp

**FROTH PET** is a decentralized application (dApp) built on Flow EVM for managing Pet NFTs using the $FROTH (ERC-20) token. The platform combines blockchain technology, smart contracts, and game mechanics to create an interactive experience in managing virtual pets.

## 🎯 Overview

FROTH PET enables users to:
- **Mint Pet NFTs** by paying FROTH tokens and receiving random tiers
- **Play Games** by consuming pet energy to earn scores and rewards
- **Buy Food** from the Shop to restore pet energy
- **Feed Pets** to increase energy and level
- **Global Chat** to communicate with fellow FROTH holders

## 🏗️ System Architecture

### Technology Stack

**Frontend:**
- React 18 with Vite
- Tailwind CSS for styling
- wagmi v2 + viem for blockchain interactions
- RainbowKit for wallet connection
- Zustand for state management
- React Router for routing

**Backend:**
- Node.js + Express.js
- MongoDB for database (off-chain data)
- RESTful API endpoints

**Smart Contracts:**
- Solidity 0.8.20
- OpenZeppelin Contracts (ERC-721, Ownable)
- Hardhat for development and deployment
- Flow EVM Mainnet (Chain ID: 747)

### Application Structure

```
froth-pet/
├── contracts/          # Smart contracts (Solidity)
│   ├── contracts/
│   │   ├── PetNFT.sol      # ERC-721 NFT contract
│   │   ├── Shop.sol        # Food shop contract
│   │   ├── IFroth.sol      # FROTH token interface
│   │   └── libs/
│   │       └── WeightedRand.sol  # Weighted random tier selection
│   └── scripts/
│       ├── deploy.js           # Deploy contracts
│       └── full-deploy-and-test.js
│
├── frontend/          # React frontend application
│   ├── src/
│   │   ├── components/     # UI components
│   │   │   ├── Header.jsx
│   │   │   ├── NavBar.jsx
│   │   │   ├── KittyCard.jsx
│   │   │   ├── EnergyBar.jsx
│   │   │   ├── Inventory.jsx
│   │   │   ├── Leaderboard.jsx
│   │   │   └── FrothRun.jsx    # Game component
│   │   ├── pages/          # Page components
│   │   │   ├── Pet.jsx         # Pet management page
│   │   │   ├── Mint.jsx        # Mint NFT page
│   │   │   ├── Shop.jsx        # Shop page
│   │   │   ├── Game.jsx        # Game list page
│   │   │   ├── GameDetail.jsx  # Game detail page
│   │   │   ├── PlayGame.jsx    # Game play page
│   │   │   └── Obrolan.jsx     # Chat page
│   │   ├── hooks/          # Custom React hooks
│   │   │   ├── useMintPet.js   # Mint NFT logic
│   │   │   ├── useBuyFood.js   # Buy food logic
│   │   │   ├── useFeed.js      # Feed pet logic
│   │   │   ├── usePetNFTs.js   # Fetch user NFTs
│   │   │   └── useFrothBalance.js
│   │   ├── lib/            # Utility libraries
│   │   │   ├── contracts.js    # Contract ABIs & addresses
│   │   │   ├── mongodb.js      # Backend API calls
│   │   │   └── wagmi.js        # Wagmi configuration
│   │   └── state/
│   │       └── useStore.js     # Zustand store
│   └── public/
│       └── nft-images/     # NFT image assets
│
└── backend/           # Node.js API server
    ├── server.js          # Express server & API routes
    └── package.json
```

## 📋 Smart Contracts

### Contract Addresses (Flow EVM Mainnet)

| Contract | Address | Purpose |
|----------|---------|---------|
| **FROTH Token** | `0xb73bf8e6a4477a952e0338e6cc00cc0ce5ad04ba` | ERC-20 token for payments |
| **PetNFT** | `0xF005c5E8c7a802cf3F6CBcd3445d4F926A01b742` | ERC-721 NFT contract for Pet |
| **Shop** | `0x2799E0687EDB8261C19c35f0A3c66De1b1acAb5C` | Contract for buying food |

### Treasury/Dev Wallet

**Treasury Address:** `0x24b416d306c231341126c8db74a61221e7ca530b`

The treasury wallet is the address that receives all FROTH payments from:
- Mint Pet NFT (10 FROTH per mint)
- Food purchases in the Shop

### PetNFT.sol - Main NFT Contract

**Contract Name:** FROTH PET  
**Symbol:** FPET  
**Standard:** ERC-721

**Main Features:**
- `mintWithFroth(uint256 price)`: Mint a new pet with FROTH payment
- `feed(uint256 tokenId, uint8 foodType)`: Restore pet energy
- `spendEnergy(uint256 tokenId, uint8 cost)`: Reduce energy for playing games
- `rename(uint256 tokenId, string newName)`: Change pet name
- `getPet(uint256 tokenId)`: Get pet data (level, energy, tier, name)

**Tier Distribution (Weighted Random):**
- **Common:** 70% (4 different images)
- **Uncommon:** 20% (3 different images)
- **Epic:** 7% (2 different images)
- **Legendary:** 3% (1 image)

**Mint Price:** 10 FROTH

**Pet Attributes:**
- `level`: Pet level (starts from 1)
- `energy`: Pet energy (0-100)
- `tier`: Pet tier (Common, Uncommon, Epic, Legendary)
- `imageURI`: Pet image URI (IPFS or HTTP)
- `name`: Pet name (default: "FROTH Pet #<tokenId>")

### Shop.sol - Food Shop Contract

**Main Features:**
- `buyFood(uint8 foodType, uint256 quantity)`: Buy food with FROTH
- `useFood(uint256 tokenId, uint8 foodType)`: Use food to feed pet
- `getBag(address user)`: Check user's food inventory

**Food Types:**

| Type | Name | Price | Energy Restore | Cap |
|------|------|-------|----------------|-----|
| 1 | Burger | 2 FROTH | +50 energy | Max 100 |
| 2 | Grilled Chicken | 3 FROTH | +100 energy | Full (always 100) |

**Bag Storage:**
Food items are stored in the `bag[user][foodType]` mapping in the smart contract (on-chain).

## 🔄 How the System Works

### 1. Mint Pet NFT Flow

```
User → Frontend (React)
  ↓
1. User clicks "Mint Pet" on Pet page
  ↓
2. Frontend calls useMintPet() hook
  ↓
3. Approve FROTH token to PetNFT contract
  ↓ (Transaction 1: Approve)
4. Call mintWithFroth(10 FROTH) on PetNFT contract
  ↓ (Transaction 2: Mint)
5. Smart contract:
   - Transfer 10 FROTH from user to treasury
   - Generate random tier (weighted random)
   - Select random image from tier
   - Mint ERC-721 token with new tokenId
   - Initialize pet with level=1, energy=100
   - Emit PetMinted event
  ↓
6. Frontend:
   - Listen for transaction receipt
   - Parse PetMinted event to get tokenId
   - Fetch pet data from contract (getPet)
   - Save NFT data to MongoDB via backend API
  ↓
7. Backend:
   - Receive POST /api/nft/save
   - Save to MongoDB collection 'nfts'
   - Data: tokenId, owner, tier, imageURI, level, energy, name
  ↓
8. Frontend refreshes NFT list from backend
  ↓
9. Pet appears in UI
```

**On-Chain Data:**
- Token ownership (ERC-721)
- Pet attributes (level, energy, tier, name)
- Image URI

**Off-Chain Data (MongoDB):**
- Complete metadata for fast queries
- Historical data
- Additional attributes for UI

### 2. Buy Food Flow

```
User → Frontend (Shop Page)
  ↓
1. User selects food (Burger/Chicken) and quantity
  ↓
2. Frontend calls useBuyFood() hook
  ↓
3. Calculate total price = pricePerUnit × quantity
  ↓
4. Approve FROTH token to Shop contract
  ↓ (Transaction 1: Approve)
5. Call buyFood(foodType, quantity) on Shop contract
  ↓ (Transaction 2: Buy)
6. Smart contract:
   - Transfer FROTH from user to treasury
   - Increment bag[user][foodType] += quantity
   - Emit FoodPurchased event
  ↓
7. Frontend:
   - Listen for transaction receipt
   - Read bag from contract (getBag)
   - Update local state with on-chain data
   - Optional: Sync to MongoDB via backend (optional, for tracking)
  ↓
8. UI update: Food inventory increases
```

**Storage:**
- **On-Chain:** `bag[user][foodType]` in Shop contract (source of truth)
- **Off-Chain (Optional):** MongoDB for tracking and analytics

### 3. Feed Pet Flow

```
User → Frontend (Pet Page)
  ↓
1. User clicks "Feed" and selects food
  ↓
2. Frontend calls useFeed() hook
  ↓
3. Frontend calls backend API: POST /api/nft/feed
  ↓
4. Backend:
   - Validate: Check food exists in bag (via Shop contract or MongoDB)
   - Call Shop.useFood(tokenId, foodType) → Transfer on-chain
   - Call PetNFT.feed(tokenId, foodType) → Update energy on-chain
   - Update MongoDB: Decrease bag[user][foodType], update pet energy
  ↓
5. Frontend refresh:
   - Fetch updated pet data from contract
   - Fetch updated bag from contract
   - Update UI
```

**Dual Update:**
- **On-Chain:** Shop contract decreases bag, PetNFT contract increases energy
- **Off-Chain:** MongoDB sync for data consistency

### 4. Play Game Flow

```
User → Frontend (Game Page)
  ↓
1. User selects game (FROTH RUN)
  ↓
2. Frontend checks: Pet energy >= cost (20-30 energy)
  ↓
3. User clicks "Play Game"
  ↓
4. Frontend calls backend: POST /api/nft/spend-energy
  ↓
5. Backend:
   - Call PetNFT.spendEnergy(tokenId, cost) → Decrease energy on-chain
   - Update MongoDB: Update pet energy
  ↓
6. Frontend:
   - Launch game (FrothRun.jsx canvas game)
   - User plays and earns score
  ↓
7. After game ends:
   - Submit score to backend: POST /api/leaderboard/submit
   - Backend saves to MongoDB collection 'leaderboard'
   - Frontend refreshes leaderboard
```

**Game Features:**
- **FROTH RUN:** Endless runner game with obstacles
- Dynamic difficulty: Speed and obstacle spawn rate increase with score
- Obstacle types: Ground obstacles, spikes, flying fireballs
- Score tracking: Leaderboard per game

### 5. Data Flow Architecture

```
┌─────────────┐
│   User      │
│  (Browser)  │
└──────┬──────┘
       │
       │ Web3 Connection (wagmi)
       │
┌──────▼──────────────────────────┐
│        Frontend (React)         │
│  ┌──────────────────────────┐  │
│  │  Hooks (useMintPet, etc) │  │
│  └───────────┬──────────────┘  │
│              │                  │
│  ┌───────────▼──────────────┐  │
│  │  wagmi + viem            │  │
│  │  (Blockchain Interface)  │  │
│  └───────────┬──────────────┘  │
└──────────────┼──────────────────┘
               │
               │ RPC Calls
               │
┌──────────────▼──────────────────┐
│    Flow EVM Blockchain          │
│  ┌──────────────────────────┐   │
│  │  PetNFT Contract         │   │
│  │  Shop Contract           │   │
│  │  FROTH Token Contract    │   │
│  └──────────────────────────┘   │
└──────────────────────────────────┘
               │
               │ Events & State
               │
┌──────────────▼──────────────────┐
│     Backend API (Express)       │
│  ┌──────────────────────────┐   │
│  │  REST API Endpoints      │   │
│  │  - /api/nft/*            │   │
│  │  - /api/shop/*           │   │
│  │  - /api/leaderboard/*    │   │
│  │  - /api/chat/*           │   │
│  └───────────┬──────────────┘   │
└──────────────┼──────────────────┘
               │
               │ MongoDB Queries
               │
┌──────────────▼──────────────────┐
│      MongoDB Database           │
│  ┌──────────────────────────┐   │
│  │  Collections:            │   │
│  │  - nfts                  │   │
│  │  - bags                  │   │
│  │  - leaderboard           │   │
│  │  - chat                  │   │
│  └──────────────────────────┘   │
└──────────────────────────────────┘
```

## 🔌 Backend API Endpoints

### Base URL
- **Production:** Set via `VITE_API_URL` environment variable
- **Local:** `http://localhost:3001/api`

### NFT Endpoints

**POST /api/nft/save**
- Save NFT data to MongoDB
- Body: `{ tokenId, owner, tier, imageURI, metadataURI, level, energy, name }`

**GET /api/nft/:tokenId**
- Get NFT data by tokenId

**GET /api/nft/owner/:owner**
- Get all NFTs owned by wallet address

**PATCH /api/nft/:tokenId**
- Update NFT data (level, energy, name)

**DELETE /api/nft/:tokenId**
- Delete NFT from database

### Shop Endpoints

**GET /api/bag/:walletAddress**
- Get user's food inventory

**POST /api/shop/sync-bag**
- Sync bag data from contract to MongoDB

### Leaderboard Endpoints

**GET /api/leaderboard/:gameId**
- Get leaderboard for specific game

**POST /api/leaderboard/submit**
- Submit new score
- Body: `{ walletAddress, gameId, score, petTokenId }`

### Chat Endpoints

**GET /api/chat/messages?limit=100**
- Get chat messages (sorted by newest first)

**POST /api/chat/message**
- Send chat message
- Body: `{ sender, message, walletAddress }`
- **Note:** Frontend must verify FROTH balance before sending

### Health Check

**GET /api/health**
- Server health check

**GET /api**
- API information and list of endpoints

## 🚀 Setup & Installation

### Prerequisites

- Node.js 18+
- npm or yarn
- MetaMask wallet extension
- MongoDB Atlas account (for production) or local MongoDB

### 1. Install Dependencies

```bash
# Contracts
cd contracts
npm install

# Frontend
cd ../frontend
npm install

# Backend
cd ../backend
npm install
```

### 2. Configure Environment Variables

#### Frontend `.env`

Create `frontend/.env` file:

```env
# Flow EVM Network
VITE_EVM_CHAIN_ID=747
VITE_EVM_RPC_URL=https://mainnet.evm.nodes.onflow.org
VITE_BLOCK_EXPLORER_URL=https://flowscan.org

# Contract Addresses
VITE_FROTH_ADDRESS=0xb73bf8e6a4477a952e0338e6cc00cc0ce5ad04ba
VITE_PET_NFT_ADDRESS=0xF005c5E8c7a802cf3F6CBcd3445d4F926A01b742
VITE_SHOP_ADDRESS=0x2799E0687EDB8261C19c35f0A3c66De1b1acAb5C

# Backend API URL
VITE_API_URL=http://localhost:3001/api

# WalletConnect
VITE_WALLETCONNECT_PROJECT_ID=your_walletconnect_project_id_here
```

#### Backend `.env`

Create `backend/.env` file:

```env
PORT=3001
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/?appName=Cluster0
```

#### Contracts `.env`

Create `contracts/.env` file:

```env
RPC_URL=https://mainnet.evm.nodes.onflow.org
CHAIN_ID=747
PRIVATE_KEY=0x...                    # Deployer private key
FROTH_ADDRESS=0xb73bf8e6a4477a952e0338e6cc00cc0ce5ad04ba
TREASURY_ADDRESS=0x24b416d306c231341126c8db74a61221e7ca530b
```

### 3. Deploy Smart Contracts

```bash
cd contracts

# Compile contracts
npm run compile

# Deploy to Flow EVM Mainnet
npx hardhat run scripts/full-deploy-and-test.js --network flowEVM
```

After successful deployment, copy contract addresses to `frontend/.env`.

### 4. Setup Flow EVM Network in MetaMask

1. Open MetaMask → Settings → Networks → Add Network
2. Fill in:
   - **Network Name:** Flow EVM Mainnet
   - **RPC URL:** `https://mainnet.evm.nodes.onflow.org`
   - **Chain ID:** `747`
   - **Currency Symbol:** FLOW
   - **Block Explorer:** `https://flowscan.org`

### 5. Running the Application

#### Option A: Using Script (Easiest)

Double-click `START_ALL.bat` file in root folder.

#### Option B: Manual

**Terminal 1 - Backend:**
```bash
cd backend
npm run dev
```
Backend runs on `http://localhost:3001`

**Terminal 2 - Frontend:**
```bash
cd frontend
npm run dev
```
Frontend runs on `http://localhost:3000`

## 📊 Database Schema (MongoDB)

### Collection: `nfts`

```javascript
{
  tokenId: String,           // Unique token ID
  owner: String,             // Wallet address
  tier: String,              // "common", "uncommon", "epic", "legendary"
  imageURI: String,          // IPFS or HTTP URL
  metadataURI: String,       // Token URI
  level: Number,             // Pet level (default: 1)
  energy: Number,            // Pet energy (0-100)
  name: String,              // Pet name
  createdAt: Date,
  updatedAt: Date
}
```

### Collection: `bags`

```javascript
{
  walletAddress: String,     // Unique wallet address
  burger: Number,            // Quantity of burgers
  ayam: Number,              // Quantity of grilled chicken
  updatedAt: Date
}
```

### Collection: `leaderboard`

```javascript
{
  walletAddress: String,
  gameId: String,           // Game identifier (e.g., "froth-run")
  score: Number,             // High score
  petTokenId: String,        // Pet used for this score
  createdAt: Date
}
```

### Collection: `chat`

```javascript
{
  sender: String,           // Shortened address (e.g., "0x1234...5678")
  walletAddress: String,    // Full wallet address (lowercase)
  message: String,          // Chat message
  createdAt: Date           // ISO timestamp
}
```

## 🎮 How to Use the dApp

### 1. Connect Wallet

1. Open dApp in browser
2. Click "Connect Wallet" (RainbowKit button)
3. Select MetaMask and approve connection
4. Ensure the selected network is Flow EVM Mainnet

### 2. Mint Pet NFT

1. Navigate to **Pet** page
2. If you don't have a pet, click **"Mint Pet"** button
3. Approve FROTH transaction (10 FROTH)
4. Wait for transaction to succeed
5. Pet will appear with random tier (Common, Uncommon, Epic, or Legendary)

### 3. Buy Food

1. Navigate to **Shop** page
2. Select food:
   - **Burger** (2 FROTH, +50 energy)
   - **Grilled Chicken** (3 FROTH, +100 energy)
3. Enter quantity
4. Click **"Buy"** and approve FROTH transaction
5. Food will be added to inventory (Bag)

### 4. Feed Pet

1. Navigate to **Pet** page
2. Click **"Feed"** button
3. Select food from inventory
4. Approve transaction (if required)
5. Pet energy will increase according to selected food

### 5. Play Game

1. Navigate to **Game** page
2. Select **"FROTH RUN"** game
3. Click **"Play"** (will consume pet energy)
4. Play the game and avoid obstacles
5. Score will be saved to leaderboard

### 6. Chat (FROTH Holders Only)

1. Navigate to **Chat** page
2. If FROTH balance > 0, chat will be accessible
3. If not, "Chat Locked" popup will appear
4. Send messages to global chat room

## 🔒 Security & Best Practices

1. **On-Chain Source of Truth:**
   - NFT ownership and pet attributes are stored on-chain
   - Bag (food inventory) is stored on-chain in Shop contract
   - MongoDB is only for caching and fast queries

2. **Validation:**
   - Backend validates wallet address format
   - Frontend verifies FROTH balance before accessing chat
   - Smart contracts validate all inputs and permissions

3. **CORS:**
   - Backend configured to allow all origins (production)
   - For production, consider whitelisting specific domains

4. **Environment Variables:**
   - Do not commit `.env` files to repository
   - Use environment variables in Vercel/Railway for production

## 📝 Important Notes

1. **Mint Price:** 10 FROTH per pet NFT
2. **Food Prices:** Burger 2 FROTH, Grilled Chicken 3 FROTH
3. **Energy Cap:** Maximum 100 energy
4. **Tier Distribution:** Common (70%), Uncommon (20%), Epic (7%), Legendary (3%)
5. **Game Energy Cost:** 20-30 energy per game session

## 🚀 Deployment

### Frontend (Vercel)

```bash
cd frontend
vercel login
vercel --prod
```

Set environment variables in Vercel dashboard:
- `VITE_API_URL`
- `VITE_PET_NFT_ADDRESS`
- `VITE_SHOP_ADDRESS`
- `VITE_FROTH_ADDRESS`
- `VITE_WALLETCONNECT_PROJECT_ID` (obtain from https://cloud.walletconnect.com)

### Backend (Railway)

```bash
cd backend
railway login
railway init
railway up
```

Set environment variables in Railway dashboard:
- `MONGODB_URI`
- `PORT`

## 📄 License

MIT

## 🔗 Links

- **Flow EVM Docs:** https://developers.flow.com/
- **wagmi Docs:** https://wagmi.sh/
- **RainbowKit Docs:** https://www.rainbowkit.com/
- **Flowscan Explorer:** https://flowscan.org

---

**Built for the $FROTH community**
