const hre = require("hardhat");

async function main() {
  console.log("Compiling contracts...\n");
  
  await hre.run("compile");
  
  console.log("\n✅ Compilation complete!");
  console.log("Ready to deploy!");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("Compilation failed:", error);
    process.exit(1);
  });



