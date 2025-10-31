const hre = require("hardhat");

async function main() {
  const petNFTAddress = process.env.PET_NFT_ADDRESS;
  if (!petNFTAddress) {
    console.error("PET_NFT_ADDRESS environment variable required");
    process.exit(1);
  }

  const PetNFT = await hre.ethers.getContractAt("PetNFT", petNFTAddress);
  const [deployer] = await hre.ethers.getSigners();
  console.log("Setting tier images with account:", deployer.address);

  // Common tier images (pet-1 to pet-4) - Gunakan path lokal
  const commonImages = [
    process.env.COMMON_1 || "/nft-images/common/pet-1.png",
    process.env.COMMON_2 || "/nft-images/common/pet-2.png",
    process.env.COMMON_3 || "/nft-images/common/pet-3.png",
    process.env.COMMON_4 || "/nft-images/common/pet-4.png",
  ];

  // Uncommon tier images (pet-5 to pet-7) - Gunakan path lokal
  const uncommonImages = [
    process.env.UNCOMMON_1 || "/nft-images/uncommon/pet-5.png",
    process.env.UNCOMMON_2 || "/nft-images/uncommon/pet-6.png",
    process.env.UNCOMMON_3 || "/nft-images/uncommon/pet-7.png",
  ];

  // Epic tier images (pet-8, pet-9) - Gunakan path lokal
  const epicImages = [
    process.env.EPIC_1 || "/nft-images/epic/pet-8.png",
    process.env.EPIC_2 || "/nft-images/epic/pet-9.png",
  ];

  // Legendary tier images (pet-10) - Gunakan path lokal
  const legendaryImages = [
    process.env.LEGENDARY_1 || "/nft-images/legendary/pet-10.png",
  ];

  console.log("Setting Common tier images...");
  let tx = await PetNFT.setTierImages("Common", commonImages);
  await tx.wait();
  console.log("✓ Common tier images set");

  console.log("Setting Uncommon tier images...");
  tx = await PetNFT.setTierImages("Uncommon", uncommonImages);
  await tx.wait();
  console.log("✓ Uncommon tier images set");

  console.log("Setting Epic tier images...");
  tx = await PetNFT.setTierImages("Epic", epicImages);
  await tx.wait();
  console.log("✓ Epic tier images set");

  console.log("Setting Legendary tier images...");
  tx = await PetNFT.setTierImages("Legendary", legendaryImages);
  await tx.wait();
  console.log("✓ Legendary tier images set");

  console.log("\n✅ All tier images set successfully!");
  console.log("\nTo verify, call:");
  console.log(`npx hardhat run scripts/verify-tier-images.js --network flowEVM`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });


