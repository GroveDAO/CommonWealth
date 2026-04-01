const hre = require("hardhat");
const { readDeployment } = require("./utils");

const { network } = hre;

async function verifyContract(label, address, constructorArguments) {
  try {
    await hre.run("verify:verify", {
      address,
      constructorArguments,
    });
    console.log(`Verified ${label}: ${address}`);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (message.toLowerCase().includes("already verified")) {
      console.log(`Already verified ${label}: ${address}`);
      return;
    }
    throw error;
  }
}

async function main() {
  const deployment = readDeployment(network.name);

  await verifyContract("CommonWealthToken", deployment.token.address, deployment.token.constructorArgs);
  await verifyContract("ConvictionVoting", deployment.convictionVoting.address, deployment.convictionVoting.constructorArgs);
  await verifyContract("ImpactAttestation", deployment.impactAttestation.address, deployment.impactAttestation.constructorArgs);
  await verifyContract("SavingsCircle", deployment.savingsCircle.address, deployment.savingsCircle.constructorArgs);
  await verifyContract("DePINRegistry", deployment.depinRegistry.address, deployment.depinRegistry.constructorArgs);
  await verifyContract(
    "PrivateConvictionVoting",
    deployment.privateConvictionVoting.address,
    deployment.privateConvictionVoting.constructorArgs,
  );
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
