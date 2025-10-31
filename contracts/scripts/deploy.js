const hre = require("hardhat");

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  console.log("Deploying contracts with account:", deployer.address);
  console.log("Account balance:", hre.ethers.formatEther(await deployer.provider.getBalance(deployer.address)), "FLOW");

  // FROTH token address (production)
  const frothAddress = process.env.FROTH_ADDRESS || '0xb73bf8e6a4477a952e0338e6cc00cc0ce5ad04ba';
  console.log("Using FROTH token at:", frothAddress);

  // Treasury address (dev wallet untuk menerima pembayaran)
  const treasury = process.env.TREASURY_ADDRESS || '0x24b416d306c231341126c8db74a61221e7ca530b';
  console.log("Treasury address:", treasury);

  // Mint price: 10 FROTH
  const mintPrice = hre.ethers.parseEther("10");
  console.log("Mint price:", hre.ethers.formatEther(mintPrice), "FROTH");

  // Deploy PetNFT
  console.log("\n=== Deploying PetNFT ===");
  const PetNFT = await hre.ethers.getContractFactory("PetNFT");
  const petNFT = await PetNFT.deploy(
    frothAddress,
    treasury,
    mintPrice,
    deployer.address // Owner
  );
  await petNFT.waitForDeployment();
  const petNFTAddress = await petNFT.getAddress();
  console.log("✓ PetNFT deployed to:", petNFTAddress);

  // Deploy Shop
  console.log("\n=== Deploying Shop ===");
  const Shop = await hre.ethers.getContractFactory("Shop");
  const shop = await Shop.deploy(
    frothAddress,
    petNFTAddress,
    treasury,
    deployer.address // Owner
  );
  await shop.waitForDeployment();
  const shopAddress = await shop.getAddress();
  console.log("✓ Shop deployed to:", shopAddress);

  // Wait a bit for network to confirm
  console.log("\nWaiting for network confirmation...");
  await new Promise(resolve => setTimeout(resolve, 5000));

  // Set tier images (placeholder - update dengan IPFS CIDs setelah upload)
  console.log("\n=== Setting Tier Images ===");
  const commonImages = process.env.COMMON_IMAGES 
    ? process.env.COMMON_IMAGES.split(',')
    : [
        "ipfs://QmXXX1", // pet-1.png
        "ipfs://QmXXX2", // pet-2.png
        "ipfs://QmXXX3", // pet-3.png
        "ipfs://QmXXX4", // pet-4.png
      ];
  
  const uncommonImages = process.env.UNCOMMON_IMAGES
    ? process.env.UNCOMMON_IMAGES.split(',')
    : [
        "ipfs://QmYYY1", // pet-5.png
        "ipfs://QmYYY2", // pet-6.png
        "ipfs://QmYYY3", // pet-7.png
      ];

  const epicImages = process.env.EPIC_IMAGES
    ? process.env.EPIC_IMAGES.split(',')
    : [
        "ipfs://QmZZZ1", // pet-8.png
        "ipfs://QmZZZ2", // pet-9.png
      ];

  const legendaryImages = process.env.LEGENDARY_IMAGES
    ? process.env.LEGENDARY_IMAGES.split(',')
    : [
        "ipfs://QmAAA1", // pet-10.png
      ];

  try {
    console.log("Setting Common tier images...");
    let tx = await petNFT.setTierImages("Common", commonImages);
    await tx.wait();
    console.log("✓ Common tier images set");

    console.log("Setting Uncommon tier images...");
    tx = await petNFT.setTierImages("Uncommon", uncommonImages);
    await tx.wait();
    console.log("✓ Uncommon tier images set");

    console.log("Setting Epic tier images...");
    tx = await petNFT.setTierImages("Epic", epicImages);
    await tx.wait();
    console.log("✓ Epic tier images set");

    console.log("Setting Legendary tier images...");
    tx = await petNFT.setTierImages("Legendary", legendaryImages);
    await tx.wait();
    console.log("✓ Legendary tier images set");
  } catch (error) {
    console.error("Error setting tier images:", error.message);
    console.log("⚠ You can set tier images later using set-tier-images.js script");
  }

  console.log("\n=== Deployment Summary ===");
  console.log("Network: Flow EVM Mainnet");
  console.log("Deployer:", deployer.address);
  console.log("FROTH Token:", frothAddress);
  console.log("Treasury (Dev Wallet):", treasury);
  console.log("PetNFT:", petNFTAddress);
  console.log("Shop:", shopAddress);
  console.log("Mint Price:", hre.ethers.formatEther(mintPrice), "FROTH");
  
  console.log("\n=== Next Steps ===");
  console.log("1. Update frontend/.env with:");
  console.log(`   VITE_PET_NFT_ADDRESS=${petNFTAddress}`);
  console.log(`   VITE_SHOP_ADDRESS=${shopAddress}`);
  console.log("2. Upload NFT images to Pinata/IPFS");
  console.log("3. Update tier images using set-tier-images.js script");
  console.log("4. Test minting NFT from frontend");
  console.log("\n✅ Deployment complete!");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("Deployment failed:", error);
    process.exit(1);
  });
