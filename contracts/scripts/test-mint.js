const hre = require("hardhat");

async function main() {
  const petNFTAddress = process.env.PET_NFT_ADDRESS;
  const frothAddress = process.env.FROTH_ADDRESS || '0xb73bf8e6a4477a952e0338e6cc00cc0ce5ad04ba';
  
  if (!petNFTAddress) {
    console.error("PET_NFT_ADDRESS environment variable required");
    console.log("Set it in .env file or run: export PET_NFT_ADDRESS=0x...");
    process.exit(1);
  }

  const [deployer] = await hre.ethers.getSigners();
  console.log("Testing mint with account:", deployer.address);
  console.log("PetNFT address:", petNFTAddress);

  // Get contracts
  const PetNFT = await hre.ethers.getContractAt("PetNFT", petNFTAddress);
  const FrothToken = await hre.ethers.getContractAt("IFroth", frothAddress);

  // Check mint price
  const mintPrice = await PetNFT.mintPrice();
  console.log("Mint price:", hre.ethers.formatEther(mintPrice), "FROTH");

  // Check FROTH balance
  const balance = await FrothToken.balanceOf(deployer.address);
  console.log("FROTH balance:", hre.ethers.formatEther(balance), "FROTH");

  if (balance < mintPrice) {
    console.error("❌ Insufficient FROTH balance!");
    console.log("Need:", hre.ethers.formatEther(mintPrice), "FROTH");
    console.log("Have:", hre.ethers.formatEther(balance), "FROTH");
    process.exit(1);
  }

  // Check allowance
  const allowance = await FrothToken.allowance(deployer.address, petNFTAddress);
  console.log("Current allowance:", hre.ethers.formatEther(allowance), "FROTH");

  // Step 1: Approve FROTH
  if (allowance < mintPrice) {
    console.log("\n=== Step 1: Approving FROTH ===");
    const approveTx = await FrothToken.approve(petNFTAddress, mintPrice);
    console.log("Approve transaction:", approveTx.hash);
    await approveTx.wait();
    console.log("✓ FROTH approved");
  } else {
    console.log("✓ FROTH already approved");
  }

  // Step 2: Mint NFT
  console.log("\n=== Step 2: Minting NFT ===");
  try {
    const mintTx = await PetNFT.mintWithFroth(mintPrice);
    console.log("Mint transaction:", mintTx.hash);
    const receipt = await mintTx.wait();
    console.log("✓ Transaction confirmed in block:", receipt.blockNumber);

    // Find PetMinted event
    const event = receipt.logs.find(
      log => {
        try {
          const parsed = PetNFT.interface.parseLog(log);
          return parsed && parsed.name === 'PetMinted';
        } catch {
          return false;
        }
      }
    );

    if (event) {
      const parsed = PetNFT.interface.parseLog(event);
      const tokenId = parsed.args.tokenId;
      const tier = parsed.args.tier;
      console.log("\n=== Mint Success ===");
      console.log("Token ID:", tokenId.toString());
      console.log("Tier:", tier);
      
      // Get pet data
      const petData = await PetNFT.getPet(tokenId);
      console.log("Pet Name:", petData.name);
      console.log("Level:", petData.level);
      console.log("Energy:", petData.energy);
      console.log("Image URI:", petData.imageURI);

      // Get token URI
      const tokenURI = await PetNFT.tokenURI(tokenId);
      console.log("Token URI:", tokenURI);

      console.log("\n✅ NFT minted successfully!");
      console.log("View on Flowscan:");
      console.log(`https://flowscan.org/address/${petNFTAddress}`);
    }
  } catch (error) {
    console.error("❌ Mint failed:", error.message);
    if (error.data) {
      console.error("Error data:", error.data);
    }
    process.exit(1);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("Test failed:", error);
    process.exit(1);
  });



