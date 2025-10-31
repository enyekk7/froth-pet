const hre = require("hardhat");
const axios = require("axios");

// Configuration
const BACKEND_API_URL = process.env.BACKEND_API_URL || "http://localhost:3001/api";
const MINT_COUNT = parseInt(process.env.MINT_COUNT || "5"); // Jumlah NFT yang akan di-mint
const PRIVATE_KEY = process.env.PRIVATE_KEY;
const FROTH_ADDRESS = process.env.FROTH_ADDRESS || "0xb73bf8e6a4477a952e0338e6cc00cc0ce5ad04ba";
const TREASURY_ADDRESS = process.env.TREASURY_ADDRESS || "0x24b416d306c231341126c8db74a61221e7ca530b";

// Helper: Check if backend is accessible
async function checkBackendConnection() {
  try {
    const healthUrl = BACKEND_API_URL.replace('/api', '/api/health');
    const response = await axios.get(healthUrl, { timeout: 5000 });
    return { available: true, data: response.data };
  } catch (error) {
    if (error.code === 'ECONNREFUSED' || error.code === 'ETIMEDOUT') {
      return { 
        available: false, 
        error: 'Backend server tidak berjalan atau tidak dapat diakses. Pastikan backend running di http://localhost:3001' 
      };
    }
    return { 
      available: false, 
      error: `Connection failed: ${error.message}. Pastikan backend server berjalan dan koneksi internet/VPN stabil.` 
    };
  }
}

// Helper: Save NFT to backend MongoDB
async function saveNFTToBackend(nftData) {
  try {
    const response = await axios.post(`${BACKEND_API_URL}/nft/save`, nftData, {
      headers: { "Content-Type": "application/json" },
      timeout: 10000, // 10 second timeout
    });
    return response.data;
  } catch (error) {
    if (error.code === 'ECONNREFUSED') {
      console.error(`❌ Error: Backend server tidak berjalan di ${BACKEND_API_URL}`);
      console.error(`   Jalankan backend dengan: cd backend && npm run dev`);
    } else if (error.code === 'ETIMEDOUT' || error.message.includes('timeout')) {
      console.error(`❌ Error: Timeout connecting to backend. Cek koneksi internet/VPN.`);
    } else if (error.response) {
      console.error(`❌ Error saving NFT to backend:`, error.response.data);
    } else {
    console.error(`❌ Error saving NFT to backend:`, error.message);
      console.error(`   Pastikan backend server berjalan dan koneksi internet/VPN stabil`);
    }
    return { success: false, error: error.message };
  }
}

// Helper: Sync wallet to backend
async function syncWalletToBackend(walletAddress, hasNFT = true) {
  try {
    const response = await axios.post(
      `${BACKEND_API_URL}/wallet/sync`,
      {
        walletAddress,
        hasNFT,
        lastChecked: new Date().toISOString(),
      },
      {
        headers: { "Content-Type": "application/json" },
        timeout: 10000, // 10 second timeout
      }
    );
    return response.data;
  } catch (error) {
    if (error.code === 'ECONNREFUSED') {
      console.error(`❌ Error: Backend server tidak berjalan di ${BACKEND_API_URL}`);
    } else if (error.code === 'ETIMEDOUT' || error.message.includes('timeout')) {
      console.error(`❌ Error: Timeout connecting to backend. Cek koneksi internet/VPN.`);
    } else {
    console.error(`❌ Error syncing wallet to backend:`, error.message);
    }
    return { success: false, error: error.message };
  }
}

async function main() {
  console.log("=====================================");
  console.log("   NFT DEVLOAD SCRIPT");
  console.log("=====================================\n");

  // Check private key
  if (!PRIVATE_KEY) {
    console.error("❌ PRIVATE_KEY tidak ditemukan di .env!");
    console.log("Pastikan file contracts/.env memiliki:");
    console.log("PRIVATE_KEY=0x...");
    process.exit(1);
  }

  // Check backend connection early
  console.log("=== Checking Backend Connection ===");
  const backendCheck = await checkBackendConnection();
  if (!backendCheck.available) {
    console.log("⚠️  WARNING:", backendCheck.error);
    console.log("   NFT minting akan tetap berjalan, tapi tidak akan tersync ke backend.");
    console.log("   Untuk sync ke backend, jalankan: cd backend && npm run dev\n");
  } else {
    console.log("✅ Backend server terhubung:", BACKEND_API_URL);
    console.log("   MongoDB:", backendCheck.data?.mongodb || 'unknown');
    console.log();
  }

  // Check RPC connection
  console.log("=== Checking Flow EVM RPC Connection ===");
  try {
    const [deployer] = await hre.ethers.getSigners();
    console.log("👤 Dev Wallet:", deployer.address);
    const flowBalance = await deployer.provider.getBalance(deployer.address);
    console.log("💰 FLOW Balance:", hre.ethers.formatEther(flowBalance), "FLOW");
    console.log("✅ RPC connection OK\n");
  } catch (error) {
    console.error("❌ Error connecting to Flow EVM RPC:", error.message);
    console.error("   Pastikan:");
    console.error("   1. RPC_URL benar di .env: https://mainnet.evm.nodes.onflow.org");
    console.error("   2. Koneksi internet/VPN stabil");
    console.error("   3. VPN tidak memblokir akses ke Flow EVM");
    process.exit(1);
  }

  const [deployer] = await hre.ethers.getSigners();
  const flowBalance = await deployer.provider.getBalance(deployer.address);

  if (flowBalance === 0n) {
    console.error("❌ Insufficient FLOW balance! Need FLOW for gas fees.");
    process.exit(1);
  }

  // Get or deploy PetNFT contract
  let petNFTAddress = process.env.PET_NFT_ADDRESS;
  let petNFT;

  if (!petNFTAddress) {
    console.log("=== Step 1: Deploying PetNFT Contract ===");
    const mintPrice = hre.ethers.parseEther("10");
    
    const PetNFT = await hre.ethers.getContractFactory("PetNFT");
    petNFT = await PetNFT.deploy(FROTH_ADDRESS, TREASURY_ADDRESS, mintPrice, deployer.address);
    await petNFT.waitForDeployment();
    petNFTAddress = await petNFT.getAddress();
    console.log("✓ PetNFT deployed to:", petNFTAddress);
    console.log("\n⚠️  IMPORTANT: Add to contracts/.env:");
    console.log(`PET_NFT_ADDRESS=${petNFTAddress}\n`);
    
    // Wait for network confirmation
    await new Promise(resolve => setTimeout(resolve, 3000));

    // Set tier images (required before minting)
    // Gunakan path lokal yang sesuai dengan nomor pet
    console.log("\n=== Setting Tier Images (Required for Minting) ===");
    const tierImages = {
      Common: process.env.COMMON_IMAGES 
        ? process.env.COMMON_IMAGES.split(',')
        : ["/nft-images/common/pet-1.png", "/nft-images/common/pet-2.png", "/nft-images/common/pet-3.png", "/nft-images/common/pet-4.png"],
      Uncommon: process.env.UNCOMMON_IMAGES
        ? process.env.UNCOMMON_IMAGES.split(',')
        : ["/nft-images/uncommon/pet-5.png", "/nft-images/uncommon/pet-6.png", "/nft-images/uncommon/pet-7.png"],
      Epic: process.env.EPIC_IMAGES
        ? process.env.EPIC_IMAGES.split(',')
        : ["/nft-images/epic/pet-8.png", "/nft-images/epic/pet-9.png"],
      Legendary: process.env.LEGENDARY_IMAGES
        ? process.env.LEGENDARY_IMAGES.split(',')
        : ["/nft-images/legendary/pet-10.png"],
    };

    for (const [tier, images] of Object.entries(tierImages)) {
      try {
        const tx = await petNFT.setTierImages(tier, images);
        await tx.wait();
        console.log(`✓ ${tier} tier images set (${images.length} images)`);
      } catch (error) {
        console.error(`❌ Failed to set ${tier} tier images:`, error.message);
        console.log("⚠️  Minting will fail if tier images are not set!");
      }
    }
  } else {
    console.log("=== Step 1: Using Existing PetNFT ===");
    console.log("PetNFT Address:", petNFTAddress);
    petNFT = await hre.ethers.getContractAt("PetNFT", petNFTAddress);
  }

  // Check FROTH balance and allowance
  console.log("\n=== Step 2: Checking FROTH Balance ===");
  const IFroth = await hre.ethers.getContractAt("IFroth", FROTH_ADDRESS);
  const frothToken = IFroth;
  
  const mintPrice = await petNFT.mintPrice();
  const totalMintCost = mintPrice * BigInt(MINT_COUNT);
  console.log("Mint Price per NFT:", hre.ethers.formatEther(mintPrice), "FROTH");
  console.log(`Total needed for ${MINT_COUNT} NFTs:`, hre.ethers.formatEther(totalMintCost), "FROTH");

  const frothBalance = await frothToken.balanceOf(deployer.address);
  console.log("FROTH Balance:", hre.ethers.formatEther(frothBalance), "FROTH");

  const actualMintCount = Math.min(
    MINT_COUNT,
    Math.floor(Number(frothBalance) / Number(mintPrice))
  );

  if (frothBalance < totalMintCost) {
    console.log(`\n⚠️  Insufficient FROTH for ${MINT_COUNT} NFTs`);
    console.log("Need:", hre.ethers.formatEther(totalMintCost), "FROTH");
    console.log("Have:", hre.ethers.formatEther(frothBalance), "FROTH");
    if (actualMintCount === 0) {
      console.error("\n❌ Insufficient FROTH balance! Cannot mint any NFT.");
      process.exit(1);
    }
    console.log(`\n💡 Will mint ${actualMintCount} NFTs instead of ${MINT_COUNT}`);
  }

  // Approve FROTH if needed
  const actualMintCost = mintPrice * BigInt(actualMintCount);
  console.log("\n=== Step 3: Approving FROTH ===");
  const allowance = await frothToken.allowance(deployer.address, petNFTAddress);
  if (allowance < actualMintCost) {
    console.log("Approving FROTH...");
    const approveTx = await frothToken.approve(petNFTAddress, actualMintCost * 2n); // Approve extra for safety
    await approveTx.wait();
    console.log("✓ FROTH approved");
  } else {
    console.log("✓ FROTH already approved");
  }

  // Mint NFTs
  const mintedNFTs = [];

  for (let i = 0; i < actualMintCount; i++) {
    try {
      console.log(`\nMinting NFT ${i + 1}/${actualMintCount}...`);
      const mintTx = await petNFT.mintWithFroth(mintPrice);
      console.log("  Transaction:", mintTx.hash);
      const receipt = await mintTx.wait();
      console.log("  ✓ Confirmed in block:", receipt.blockNumber);

      // Get minted token info from PetMinted event
      const event = receipt.logs.find(
        log => {
          try {
            const parsed = petNFT.interface.parseLog(log);
            return parsed && parsed.name === 'PetMinted';
          } catch {
            return false;
          }
        }
      );

      if (!event) {
        throw new Error("PetMinted event not found in transaction receipt");
      }

      const parsed = petNFT.interface.parseLog(event);
      const tokenId = parsed.args.tokenId;
      const tier = parsed.args.tier;
      
      const petData = await petNFT.getPet(tokenId);
      const tokenURI = await petNFT.tokenURI(tokenId);

      console.log(`  ✓ Token ID: ${tokenId.toString()}`);
      console.log(`    Name: ${petData.name}`);
      console.log(`    Tier: ${petData.tier}`);
      console.log(`    Level: ${petData.level}`);
      console.log(`    Energy: ${petData.energy}`);

      mintedNFTs.push({
        tokenId: tokenId.toString(),
        name: petData.name,
        tier: petData.tier,
        level: Number(petData.level),
        energy: Number(petData.energy),
        imageURI: petData.imageURI,
        metadataURI: tokenURI,
        owner: deployer.address,
        txHash: mintTx.hash,
      });

      // Wait a bit between mints to avoid rate limiting
      if (i < actualMintCount - 1) {
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    } catch (error) {
      console.error(`  ❌ Failed to mint NFT ${i + 1}:`, error.message);
      if (error.data) {
        console.error("  Error data:", error.data);
      }
    }
  }

  // Sync to backend
  console.log(`\n=== Step 5: Syncing NFTs to Backend ===`);
  console.log(`Backend URL: ${BACKEND_API_URL}`);
  
  let successCount = 0;
  if (!backendCheck.available) {
    console.log("⚠️  Backend tidak tersedia - skip syncing NFTs");
    console.log("   NFT sudah berhasil di-mint di blockchain!");
    console.log("   Jalankan backend dan sync manual jika diperlukan.\n");
  } else {
  for (const nft of mintedNFTs) {
    try {
      console.log(`\nSyncing Token ID ${nft.tokenId}...`);
      const result = await saveNFTToBackend({
        tokenId: nft.tokenId,
        owner: nft.owner,
        tier: nft.tier.toLowerCase(),
        imageURI: nft.imageURI,
        metadataURI: nft.metadataURI,
        level: nft.level,
        energy: nft.energy,
        name: nft.name,
        createdAt: new Date().toISOString(),
      });

      if (result.success) {
        console.log(`  ✓ Synced to backend`);
        successCount++;
      } else {
        console.log(`  ⚠️  Backend sync failed: ${result.error}`);
      }
    } catch (error) {
      console.error(`  ❌ Error syncing NFT ${nft.tokenId}:`, error.message);
    }
  }

  // Sync wallet
  console.log(`\n=== Step 6: Syncing Wallet ===`);
  const walletResult = await syncWalletToBackend(deployer.address, true);
  if (walletResult.success) {
    console.log("✓ Wallet synced to backend");
  } else {
    console.log("⚠️  Wallet sync failed:", walletResult.error);
    }
  }

  // Summary
  console.log("\n=====================================");
  console.log("   DEVLOAD SUMMARY");
  console.log("=====================================");
  console.log(`Dev Wallet: ${deployer.address}`);
  console.log(`PetNFT Contract: ${petNFTAddress}`);
  console.log(`NFTs Minted: ${mintedNFTs.length}`);
  console.log(`Backend Synced: ${successCount}/${mintedNFTs.length}`);
  console.log("\nMinted NFTs:");
  mintedNFTs.forEach((nft, index) => {
    console.log(`  ${index + 1}. Token ID ${nft.tokenId} - ${nft.name} (${nft.tier})`);
    console.log(`     TX: https://flowscan.org/tx/${nft.txHash}`);
  });

  if (!backendCheck.available) {
    console.log("\n⚠️  Backend tidak tersedia saat devload.");
    console.log("   NFT sudah berhasil di-mint di blockchain.");
    console.log("   Untuk sync ke backend:");
    console.log("   1. Jalankan backend: cd backend && npm run dev");
    console.log("   2. Sync manual melalui API atau restart frontend");
  } else if (successCount < mintedNFTs.length) {
    console.log("\n⚠️  Beberapa NFT gagal sync ke backend.");
    console.log(`   Success: ${successCount}/${mintedNFTs.length}`);
    console.log("   Pastikan backend server running di:", BACKEND_API_URL);
    console.log("   Cek koneksi internet/VPN jika error terus terjadi");
  } else {
    console.log("\n✅ Semua NFT berhasil di-mint dan tersync ke backend!");
  }

  console.log("\n=====================================\n");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("Devload failed:", error);
    process.exit(1);
  });

