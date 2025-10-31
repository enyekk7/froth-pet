const hre = require("hardhat");

async function main() {
  console.log("=== FULL DEPLOYMENT AND TEST ===\n");
  
  const [deployer] = await hre.ethers.getSigners();
  console.log("Deployer:", deployer.address);
  const balance = await deployer.provider.getBalance(deployer.address);
  console.log("Balance:", hre.ethers.formatEther(balance), "FLOW\n");

  if (balance === 0n) {
    console.error("❌ Insufficient FLOW balance! Need FLOW for gas fees.");
    process.exit(1);
  }

  // Configuration
  const frothAddress = '0xb73bf8e6a4477a952e0338e6cc00cc0ce5ad04ba';
  const treasury = '0x24b416d306c231341126c8db74a61221e7ca530b';
  const mintPrice = hre.ethers.parseEther("10");

  // Step 1: Deploy PetNFT
  console.log("=== STEP 1: Deploy PetNFT ===");
  const PetNFT = await hre.ethers.getContractFactory("PetNFT");
  const petNFT = await PetNFT.deploy(frothAddress, treasury, mintPrice, deployer.address);
  await petNFT.waitForDeployment();
  const petNFTAddress = await petNFT.getAddress();
  console.log("✓ PetNFT deployed:", petNFTAddress);

  // Step 2: Deploy Shop
  console.log("\n=== STEP 2: Deploy Shop ===");
  const Shop = await hre.ethers.getContractFactory("Shop");
  const shop = await Shop.deploy(frothAddress, petNFTAddress, treasury, deployer.address);
  await shop.waitForDeployment();
  const shopAddress = await shop.getAddress();
  console.log("✓ Shop deployed:", shopAddress);

  // Wait for network confirmation
  await new Promise(resolve => setTimeout(resolve, 3000));

  // Step 3: Set tier images (placeholder)
  console.log("\n=== STEP 3: Set Tier Images ===");
  const images = {
    Common: ["ipfs://QmXXX1", "ipfs://QmXXX2", "ipfs://QmXXX3", "ipfs://QmXXX4"],
    Uncommon: ["ipfs://QmYYY1", "ipfs://QmYYY2", "ipfs://QmYYY3"],
    Epic: ["ipfs://QmZZZ1", "ipfs://QmZZZ2"],
    Legendary: ["ipfs://QmAAA1"],
  };

  for (const [tier, uris] of Object.entries(images)) {
    try {
      const tx = await petNFT.setTierImages(tier, uris);
      await tx.wait();
      console.log(`✓ ${tier} tier images set`);
    } catch (error) {
      console.log(`⚠ ${tier} tier images failed (can set later):`, error.message);
    }
  }

  // Step 4: Test Mint (if FROTH available)
  console.log("\n=== STEP 4: Test Mint ===");
  const IFroth = await hre.ethers.getContractFactory("IFroth");
  const frothToken = IFroth.attach(frothAddress);
  
  try {
    const frothBalance = await frothToken.balanceOf(deployer.address);
    console.log("FROTH balance:", hre.ethers.formatEther(frothBalance), "FROTH");

    if (frothBalance >= mintPrice) {
      // Approve
      const allowance = await frothToken.allowance(deployer.address, petNFTAddress);
      if (allowance < mintPrice) {
        console.log("Approving FROTH...");
        const approveTx = await frothToken.approve(petNFTAddress, mintPrice);
        await approveTx.wait();
        console.log("✓ FROTH approved");
      }

      // Mint
      console.log("Minting NFT...");
      try {
        const mintTx = await petNFT.mintWithFroth(mintPrice);
        const receipt = await mintTx.wait();
        console.log("✓ Mint transaction:", receipt.hash);

        // Get minted token
        const balanceAfter = await petNFT.balanceOf(deployer.address);
        if (Number(balanceAfter) > 0) {
          const tokenId = await petNFT.tokenOfOwnerByIndex(deployer.address, 0);
          const petData = await petNFT.getPet(tokenId);
          console.log("\n=== MINTED NFT ===");
          console.log("Token ID:", tokenId.toString());
          console.log("Name:", petData.name);
          console.log("Tier:", petData.tier);
          console.log("Level:", petData.level);
          console.log("Energy:", petData.energy);
          console.log("Image URI:", petData.imageURI);
        }
      } catch (error) {
        console.log("⚠ Mint test failed:", error.message);
      }
    } else {
      console.log("⚠ Insufficient FROTH for test mint");
      console.log("Need:", hre.ethers.formatEther(mintPrice), "FROTH");
    }
  } catch (error) {
    console.log("⚠ Could not test mint (FROTH contract might not be accessible):", error.message);
  }

  // Final summary
  console.log("\n=== DEPLOYMENT COMPLETE ===");
  console.log("Network: Flow EVM Mainnet");
  console.log("PetNFT:", petNFTAddress);
  console.log("Shop:", shopAddress);
  console.log("Treasury:", treasury);
  console.log("Collection Name: FROTH PET");
  console.log("Symbol: FPET");
  console.log("\n✅ All NFTs will be in the same collection!");
  console.log("\nUpdate frontend/.env:");
  console.log(`VITE_PET_NFT_ADDRESS=${petNFTAddress}`);
  console.log(`VITE_SHOP_ADDRESS=${shopAddress}`);
  console.log("\nView contracts on Flowscan:");
  console.log(`PetNFT: https://flowscan.org/address/${petNFTAddress}`);
  console.log(`Shop: https://flowscan.org/address/${shopAddress}`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("Deployment failed:", error);
    process.exit(1);
  });
