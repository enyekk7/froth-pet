# FROTH PET Backend API

Backend server untuk handle MongoDB operations dan API endpoints.

## Setup

### 1. Install Dependencies

```bash
cd backend
npm install
```

### 2. Setup Environment

Buat file `.env`:

```env
PORT=3001
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/?appName=Cluster0
```

**⚠️ Important:** Replace `username` and `password` with your actual MongoDB credentials. Never commit `.env` files to version control.

### 3. Run Server

```bash
npm run dev
```

Server akan berjalan di `http://localhost:3001`

## API Endpoints

### NFT Endpoints

- `POST /api/nft/save` - Save NFT data
- `GET /api/nft/:tokenId` - Get NFT by tokenId
- `GET /api/nft/owner/:owner` - Get all NFTs by owner address
- `PATCH /api/nft/:tokenId` - Update NFT data
- `DELETE /api/nft/:tokenId` - Delete NFT

### Wallet Endpoints

- `POST /api/wallet/sync` - Sync wallet ownership status
- `GET /api/wallet/:walletAddress` - Get wallet ownership status

### Health Check

- `GET /api/health` - Server health check

## MongoDB Collections

### `nfts` Collection
```javascript
{
  tokenId: String (unique),
  owner: String (wallet address),
  tier: String,
  imageURI: String,
  metadataURI: String,
  level: Number,
  energy: Number,
  name: String,
  createdAt: Date,
  updatedAt: Date,
}
```

### `wallets` Collection
```javascript
{
  walletAddress: String (unique),
  hasNFT: Boolean,
  lastChecked: Date,
  updatedAt: Date,
}
```

## Update Frontend .env

Tambahkan ke `frontend/.env`:

```env
VITE_API_URL=http://localhost:3001/api
```


