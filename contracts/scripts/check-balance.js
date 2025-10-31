const hre = require("hardhat");

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  console.log("Account:", deployer.address);
  
  const balance = await deployer.provider.getBalance(deployer.address);
  console.log("FLOW Balance:", hre.ethers.formatEther(balance), "FLOW");

  const frothAddress = process.env.FROTH_ADDRESS || '0xb73bf8e6a4477a952e0338e6cc00cc0ce5ad04ba';
  const FrothToken = await hre.ethers.getContractAt("IFroth", frothAddress);
  
  try {
    const frothBalance = await FrothToken.balanceOf(deployer.address);
    console.log("FROTH Balance:", hre.ethers.formatEther(frothBalance), "FROTH");
  } catch (error) {
    console.log("Could not fetch FROTH balance:", error.message);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });



