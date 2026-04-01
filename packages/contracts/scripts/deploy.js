const hre = require("hardhat");
const { writeDeployment } = require("./utils");

const { ethers, network } = hre;

async function deployContract(name, args = []) {
  const factory = await ethers.getContractFactory(name);
  const contract = await factory.deploy(...args);
  await contract.waitForDeployment();
  return contract;
}

async function main() {
  const [deployer] = await ethers.getSigners();

  const tokenArgs = [
    deployer.address,
    ethers.parseEther("10000000"),
    ethers.parseEther("2500"),
    24 * 60 * 60,
  ];
  const impactArgs = [2, 2, 14 * 24 * 60 * 60];

  const token = await deployContract("CommonWealthToken", tokenArgs);
  const convictionVoting = await deployContract("ConvictionVoting", [await token.getAddress()]);
  const impactAttestation = await deployContract("ImpactAttestation", impactArgs);
  const savingsCircle = await deployContract("SavingsCircle");
  const depinRegistry = await deployContract("DePINRegistry", [await token.getAddress()]);
  const privateConvictionVoting = await deployContract("PrivateConvictionVoting", [deployer.address]);

  const deployment = {
    network: network.name,
    chainId: Number(network.config.chainId ?? 0),
    deployedAt: new Date().toISOString(),
    deployer: deployer.address,
    token: {
      address: await token.getAddress(),
      constructorArgs: tokenArgs.map((value) => value.toString()),
    },
    convictionVoting: {
      address: await convictionVoting.getAddress(),
      constructorArgs: [await token.getAddress()],
    },
    impactAttestation: {
      address: await impactAttestation.getAddress(),
      constructorArgs: impactArgs,
    },
    savingsCircle: {
      address: await savingsCircle.getAddress(),
      constructorArgs: [],
    },
    depinRegistry: {
      address: await depinRegistry.getAddress(),
      constructorArgs: [await token.getAddress()],
    },
    privateConvictionVoting: {
      address: await privateConvictionVoting.getAddress(),
      constructorArgs: [deployer.address],
    },
  };

  const filePath = writeDeployment(network.name, deployment);

  console.log("Deployment complete");
  console.log(`- CommonWealthToken:       ${deployment.token.address}`);
  console.log(`- ConvictionVoting:        ${deployment.convictionVoting.address}`);
  console.log(`- ImpactAttestation:       ${deployment.impactAttestation.address}`);
  console.log(`- SavingsCircle:           ${deployment.savingsCircle.address}`);
  console.log(`- DePINRegistry:           ${deployment.depinRegistry.address}`);
  console.log(`- PrivateConvictionVoting: ${deployment.privateConvictionVoting.address}`);
  console.log(`- Saved deployment:        ${filePath}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
