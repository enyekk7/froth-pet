# KittyCraft Pet NFT Contracts

Smart contracts untuk KittyCraft Pet NFT di Flow EVM.

## Collection Information

**Collection Name**: KittyCraft Pet  
**Symbol**: KCPET  
**Standard**: ERC-721  
**Network**: Flow EVM Mainnet (Chain ID: 747)

Semua NFT yang di-mint akan berada dalam **1 collection** dengan nama "KittyCraft Pet", tetapi setiap NFT memiliki:
- Nama berbeda ("Kitty #1", "Kitty #2", dll)
- Tier berbeda (Common, Uncommon, Epic, Legendary)
- Level & Energy yang dapat berubah
- Image berbeda per tier

## Contracts

### PetNFT.sol
- ERC-721 contract untuk Pet NFT
- Mint dengan pembayaran FROTH
- Weighted random tier selection
- Dynamic metadata (level, energy, tier)
- Compatible dengan OpenSea/Rarible

### Shop.sol
- Contract untuk membeli makanan
- Integrasi dengan PetNFT untuk feed

## Deployment

### Quick Deploy

Windows:
```bash
DEPLOY_NOW.bat
```

Manual:
```bash
cd contracts
npm install
npx hardhat run scripts/full-deploy-and-test.js --network flowEVM
```

### Configuration

File `contracts/.env`:
```env
RPC_URL=https://mainnet.evm.nodes.onflow.org
CHAIN_ID=747
PRIVATE_KEY=0x...
FROTH_ADDRESS=0xb73bf8e6a4477a952e0338e6cc00cc0ce5ad04ba
TREASURY_ADDRESS=0x24b416d306c231341126c8db74a61221e7ca530b
```

## Scripts

- `deploy.js` - Deploy kontrak
- `full-deploy-and-test.js` - Deploy + test mint
- `test-mint.js` - Test mint NFT
- `set-tier-images.js` - Set IPFS image URIs
- `check-balance.js` - Check wallet balance

## Marketplace Compatibility

✅ OpenSea - Compatible  
✅ Rarible - Compatible  
✅ Flowscan - Compatible  
✅ Semua marketplace ERC-721 - Compatible

Semua NFT akan muncul di collection "KittyCraft Pet" di marketplace.



