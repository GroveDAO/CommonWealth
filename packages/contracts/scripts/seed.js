const hre = require("hardhat");
const { ethers, network } = hre;
const { hexlify } = ethers;

const { readDeployment, stringifyBigInts, toDataUriJson, waitForReceipt, writeDeployment } = require("./utils");

async function createFhevmInstance() {
  const { SepoliaConfig, createInstance } = await import("@zama-fhe/relayer-sdk/node");
  return createInstance({
    ...SepoliaConfig,
    network: process.env.SEPOLIA_RPC_URL,
  });
}

async function createEncryptedBallot(instance, contractAddress, userAddress, weight, support) {
  const builder = instance.createEncryptedInput(contractAddress, userAddress);
  builder.add64(BigInt(weight));
  builder.addBool(support);

  const { handles, inputProof } = await instance.requestZKProofVerification(builder.generateZKProof());

  return {
    encryptedWeight: hexlify(handles[0]),
    encryptedSupport: hexlify(handles[1]),
    inputProof: hexlify(inputProof),
  };
}

async function ensureEth(deployer, targetAddress, minimumBalance, topUpAmount) {
  const balance = await ethers.provider.getBalance(targetAddress);
  if (balance >= minimumBalance) {
    return;
  }

  await waitForReceipt(
    deployer.sendTransaction({
      to: targetAddress,
      value: topUpAmount,
    }),
  );
}

async function ensureApproval(token, signer, spender, amount) {
  const allowance = await token.allowance(signer.address, spender);
  if (allowance >= amount) {
    return;
  }

  await waitForReceipt(token.connect(signer).approve(spender, amount));
}

async function createWallets(count) {
  const seed = process.env.PRIVATE_KEY || "commonwealth-sepolia-seed";

  return Array.from({ length: count }, (_, index) => {
    const derivedPrivateKey = ethers.keccak256(ethers.toUtf8Bytes(`${seed}:actor:${index + 1}`));
    return new ethers.Wallet(derivedPrivateKey, ethers.provider);
  });
}

async function main() {
  const deployment = readDeployment(network.name);
  if (deployment.seededAt && process.env.FORCE_SEED !== "true") {
    throw new Error(
      `Deployment ${network.name} already has seed data from ${deployment.seededAt}. Set FORCE_SEED=true to reseed.`,
    );
  }

  const [deployer] = await ethers.getSigners();
  const actors = await createWallets(3);
  const [ade, bira, chima] = actors;

  console.log("Actors");
  console.log(`- Ade:   ${ade.address}`);
  console.log(`- Bira:  ${bira.address}`);
  console.log(`- Chima: ${chima.address}`);

  const token = await ethers.getContractAt("CommonWealthToken", deployment.token.address);
  const convictionVoting = await ethers.getContractAt("ConvictionVoting", deployment.convictionVoting.address);
  const impactAttestation = await ethers.getContractAt("ImpactAttestation", deployment.impactAttestation.address);
  const savingsCircle = await ethers.getContractAt("SavingsCircle", deployment.savingsCircle.address);
  const depinRegistry = await ethers.getContractAt("DePINRegistry", deployment.depinRegistry.address);
  const privateVoting = await ethers.getContractAt("PrivateConvictionVoting", deployment.privateConvictionVoting.address);

  const actorFundAmount = ethers.parseEther("0.003");
  const actorMinBalance = ethers.parseEther("0.0015");
  for (const actor of actors) {
    await ensureEth(deployer, actor.address, actorMinBalance, actorFundAmount);
    await waitForReceipt(token.mint(actor.address, ethers.parseEther("50000")));
  }

  console.log("Funding and minting complete");
  await waitForReceipt(token.mint(depinRegistry.target, ethers.parseEther("1500000")));

  await waitForReceipt(impactAttestation.addAttester(ade.address));
  await waitForReceipt(impactAttestation.addAttester(bira.address));
  await waitForReceipt(impactAttestation.addAttester(chima.address));
  await waitForReceipt(depinRegistry.grantRole(await depinRegistry.ORACLE_ROLE(), chima.address));

  await waitForReceipt(
    convictionVoting.connect(deployer).deposit({
      value: ethers.parseEther("0.005"),
    }),
  );
  await waitForReceipt(
    impactAttestation.connect(deployer).fundTreasury({
      value: ethers.parseEther("0.0025"),
    }),
  );

  console.log("Treasury setup complete");

  const maxApproval = ethers.parseEther("1000000");
  for (const actor of actors) {
    await ensureApproval(token, actor, convictionVoting.target, maxApproval);
    await ensureApproval(token, actor, savingsCircle.target, maxApproval);
  }

  console.log("Approvals complete");

  const publicProposals = [
    {
      signer: ade,
      title: "Deploy confidential civic credit lines for cooperatives",
      summary:
        "Expand the treasury to underwrite three onchain community credit pools with private eligibility scoring and public milestone reporting.",
      requestedAmount: "0.0012",
      theme: "Confidential finance",
    },
    {
      signer: bira,
      title: "Fund private conviction tooling for neighborhood assemblies",
      summary:
        "Ship moderator tooling, observer dashboards, and audit rails for encrypted conviction ballots across ward-level budget committees.",
      requestedAmount: "0.0009",
      theme: "Private governance",
    },
    {
      signer: chima,
      title: "Scale DePIN data rewards for local infrastructure sensors",
      summary:
        "Onboard 60 community-owned sensor endpoints and publish reward-backed environmental datasets for the dashboard marketplace.",
      requestedAmount: "0.0015",
      theme: "DePIN rewards",
    },
  ];

  const publicProposalIds = [];
  for (const proposal of publicProposals) {
    const nextId = (await convictionVoting.proposalCount()) + 1n;
    const metadataUri = toDataUriJson({
      title: proposal.title,
      summary: proposal.summary,
      theme: proposal.theme,
      budgetEth: proposal.requestedAmount,
      createdAt: new Date().toISOString(),
    });

    await waitForReceipt(
      convictionVoting
        .connect(proposal.signer)
        .createProposal(metadataUri, ethers.parseEther(proposal.requestedAmount), proposal.signer.address),
    );

    publicProposalIds.push(nextId);
  }

  console.log(`Public proposals created: ${publicProposalIds.join(", ")}`);

  await waitForReceipt(convictionVoting.connect(ade).stakeOnProposal(publicProposalIds[0], ethers.parseEther("4200")));
  await waitForReceipt(convictionVoting.connect(bira).stakeOnProposal(publicProposalIds[0], ethers.parseEther("2600")));
  await waitForReceipt(convictionVoting.connect(chima).stakeOnProposal(publicProposalIds[1], ethers.parseEther("3900")));
  await waitForReceipt(convictionVoting.connect(ade).stakeOnProposal(publicProposalIds[2], ethers.parseEther("3100")));
  await waitForReceipt(convictionVoting.connect(bira).stakeOnProposal(publicProposalIds[2], ethers.parseEther("1800")));

  console.log("Public staking complete");

  const privateProposalIds = [];
  for (const [index, publicProposalId] of publicProposalIds.entries()) {
    const nextId = (await privateVoting.proposalCount()) + 1n;
    await waitForReceipt(
      privateVoting.connect(publicProposals[index].signer).createProposal(
        publicProposalId,
        toDataUriJson({
          headline: publicProposals[index].title,
          lane: "confidential-conviction",
          relatedProposalId: publicProposalId.toString(),
        }),
      ),
    );
    privateProposalIds.push(nextId);
  }

  console.log(`Private proposals created: ${privateProposalIds.join(", ")}`);

  console.log("Initializing FHE relayer client");
  const fhevm = await createFhevmInstance();
  const privateVotingAddress = await privateVoting.getAddress();
  const encryptedBallots = [
    { signer: ade, proposalId: privateProposalIds[0], weight: 91, support: true },
    { signer: bira, proposalId: privateProposalIds[0], weight: 76, support: true },
    { signer: chima, proposalId: privateProposalIds[0], weight: 48, support: false },
    { signer: ade, proposalId: privateProposalIds[1], weight: 62, support: true },
    { signer: bira, proposalId: privateProposalIds[1], weight: 57, support: false },
    { signer: chima, proposalId: privateProposalIds[2], weight: 88, support: true },
  ];

  for (const ballot of encryptedBallots) {
    const encryptedInput = await createEncryptedBallot(
      fhevm,
      privateVotingAddress,
      ballot.signer.address,
      ballot.weight,
      ballot.support,
    );

    await waitForReceipt(
      privateVoting
        .connect(ballot.signer)
        .castBallot(
          ballot.proposalId,
          encryptedInput.encryptedWeight,
          encryptedInput.encryptedSupport,
          encryptedInput.inputProof,
        ),
    );
  }

  console.log("Encrypted ballots submitted");

  for (const proposalId of privateProposalIds) {
    await waitForReceipt(privateVoting.requestPublicTally(proposalId));

    const encryptedTotals = await privateVoting.encryptedTotals(proposalId);
    const handles = [encryptedTotals[0], encryptedTotals[1]];
    const decrypted = await fhevm.publicDecrypt(handles);

    await waitForReceipt(
      privateVoting.publishPublicTally(
        proposalId,
        BigInt(decrypted.clearValues[handles[0]]),
        BigInt(decrypted.clearValues[handles[1]]),
        decrypted.decryptionProof,
      ),
    );
  }

  console.log("Public private-vote tallies published");

  const impactEntries = [
    {
      signer: ade,
      proofUri: toDataUriJson({
        title: "Encrypted community-lending rollout proof",
        evidence: "Treasury disbursement rules, lender onboarding logs, and settlement checkpoints.",
      }),
      descriptionUri: toDataUriJson({
        title: "Bootstrap credit pools",
        summary: "Operationalized three cooperative pools with private scoring and public defaults reporting.",
      }),
      reward: "0.0006",
    },
    {
      signer: bira,
      proofUri: toDataUriJson({
        title: "Assembly voting toolkit audit",
        evidence: "UI review notes, wallet flow checks, and moderation runbooks.",
      }),
      descriptionUri: toDataUriJson({
        title: "Ship governance ops tooling",
        summary: "Delivered moderator and observer workflows for encrypted conviction rounds.",
      }),
      reward: "0.00045",
    },
  ];

  const attestationIds = [];
  for (const entry of impactEntries) {
    const nextId = (await impactAttestation.count()) + 1n;
    await waitForReceipt(
      impactAttestation.connect(entry.signer).submit(entry.proofUri, entry.descriptionUri, ethers.parseEther(entry.reward)),
    );
    attestationIds.push(nextId);
  }

  console.log(`Attestations submitted: ${attestationIds.join(", ")}`);

  await waitForReceipt(impactAttestation.connect(bira).confirm(attestationIds[0]));
  await waitForReceipt(impactAttestation.connect(chima).confirm(attestationIds[0]));
  await waitForReceipt(impactAttestation.connect(ade).claim(attestationIds[0]));
  await waitForReceipt(impactAttestation.connect(ade).confirm(attestationIds[1]));

  console.log("Attestation review complete");

  const nextCircleOne = (await savingsCircle.count()) + 1n;
  await waitForReceipt(
    savingsCircle.connect(ade).create("Lagos Builders Circle", ethers.parseEther("250"), 7 * 24 * 60 * 60, 3, token.target),
  );
  await waitForReceipt(savingsCircle.connect(bira).join(nextCircleOne));
  await waitForReceipt(savingsCircle.connect(chima).join(nextCircleOne));
  await waitForReceipt(savingsCircle.connect(ade).start(nextCircleOne));
  await waitForReceipt(savingsCircle.connect(ade).contribute(nextCircleOne));
  await waitForReceipt(savingsCircle.connect(bira).contribute(nextCircleOne));
  await waitForReceipt(savingsCircle.connect(chima).contribute(nextCircleOne));

  const nextCircleTwo = (await savingsCircle.count()) + 1n;
  await waitForReceipt(
    savingsCircle.connect(bira).create("Abuja Ops Circle", ethers.parseEther("180"), 14 * 24 * 60 * 60, 4, token.target),
  );
  await waitForReceipt(savingsCircle.connect(ade).join(nextCircleTwo));

  console.log(`Savings circles created: ${nextCircleOne}, ${nextCircleTwo}`);

  const submissions = [
    {
      signer: ade,
      metadataUri: toDataUriJson({
        title: "Makoko flood sensor sweep",
        summary: "Hourly environmental readings with community-maintained sensor health checks.",
        region: "Lagos Lagoon",
      }),
      accessUri: "https://commonwealth.eco/datasets/makoko-flood-sweep",
      dataType: 0,
      quality: 94,
    },
    {
      signer: bira,
      metadataUri: toDataUriJson({
        title: "Mesh compute uptime ledger",
        summary: "Distributed GPU uptime and batch execution proofs for neighborhood AI co-ops.",
        region: "Abuja",
      }),
      accessUri: "https://commonwealth.eco/datasets/mesh-compute-uptime",
      dataType: 2,
      quality: 88,
    },
    {
      signer: chima,
      metadataUri: toDataUriJson({
        title: "Community backbone maintenance map",
        summary: "Verified maintenance windows, packet loss, and throughput histories for local nodes.",
        region: "Port Harcourt",
      }),
      accessUri: "https://commonwealth.eco/datasets/community-backbone-map",
      dataType: 1,
      quality: 81,
    },
  ];

  const submissionIds = [];
  for (const entry of submissions) {
    const nextId = (await depinRegistry.count()) + 1n;
    await waitForReceipt(depinRegistry.connect(entry.signer).submit(entry.metadataUri, entry.accessUri, entry.dataType));
    submissionIds.push(nextId);
  }

  console.log(`DePIN submissions created: ${submissionIds.join(", ")}`);

  await waitForReceipt(depinRegistry.connect(chima).verify(submissionIds[0], submissions[0].quality));
  await waitForReceipt(depinRegistry.connect(chima).verify(submissionIds[1], submissions[1].quality));
  await waitForReceipt(depinRegistry.connect(chima).verify(submissionIds[2], submissions[2].quality));
  await waitForReceipt(depinRegistry.connect(ade).claim(submissionIds[0]));

  const updatedDeployment = {
    ...deployment,
    seededAt: new Date().toISOString(),
    seed: stringifyBigInts({
      actors: {
        ade: ade.address,
        bira: bira.address,
        chima: chima.address,
      },
      publicProposalIds,
      privateProposalIds,
      attestationIds,
      circleIds: [nextCircleOne, nextCircleTwo],
      submissionIds,
    }),
  };

  writeDeployment(network.name, updatedDeployment);

  console.log("Seed complete");
  console.log(`- Actors: ${ade.address}, ${bira.address}, ${chima.address}`);
  console.log(`- Public proposals: ${publicProposalIds.join(", ")}`);
  console.log(`- Private proposals: ${privateProposalIds.join(", ")}`);
  console.log(`- Attestations: ${attestationIds.join(", ")}`);
  console.log(`- Circles: ${nextCircleOne}, ${nextCircleTwo}`);
  console.log(`- DePIN submissions: ${submissionIds.join(", ")}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
