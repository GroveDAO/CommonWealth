import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import Fastify from "fastify";
import cors from "@fastify/cors";
import {
  COMMONWEALTH_TOKEN_ABI,
  CONVICTION_VOTING_ABI,
  DEPIN_REGISTRY_ABI,
  IMPACT_ATTESTATION_ABI,
  SAVINGS_CIRCLE_ABI,
  CircleState,
  DataType,
} from "@commonwealth/sdk";
import { createPublicClient, http } from "viem";
import { sepolia } from "viem/chains";

const FALLBACK_RPC_URL = "https://ethereum-sepolia-rpc.publicnode.com";
const MAX_RECORDS = 25;
const MODULE_DIR = path.dirname(fileURLToPath(import.meta.url));

type Address = `0x${string}`;

type DeploymentConfig = {
  network: string;
  chainId: number;
  token: { address: Address };
  convictionVoting: { address: Address };
  impactAttestation: { address: Address };
  savingsCircle: { address: Address };
  depinRegistry: { address: Address };
  privateConvictionVoting: { address: Address };
};

type MetadataRecord = {
  title?: string;
  summary?: string;
  region?: string;
  evidence?: string;
  evidenceUrl?: string;
  storageProvider?: string;
  storachaCid?: string;
  accessModel?: string;
  encryptedAccess?: boolean;
  impactArea?: string;
  createdAt?: string;
};

type ApiProposal = {
  id: string;
  proposer: Address;
  metadataURI: string;
  metadata: MetadataRecord | null;
  requestedAmount: string;
  beneficiary: Address;
  conviction: string;
  totalStaked: string;
  threshold: string;
  executed: boolean;
  cancelled: boolean;
  createdAt: string;
  lastUpdatedBlock: string;
};

type ApiAttestation = {
  id: string;
  contributor: Address;
  proofURI: string;
  proof: MetadataRecord | null;
  descriptionURI: string;
  description: MetadataRecord | null;
  requestedReward: string;
  confirmations: string;
  rejections: string;
  rewarded: boolean;
  rejected: boolean;
  submittedAt: string;
};

type ApiCircle = {
  id: string;
  creator: Address;
  name: string;
  contribution: string;
  cycleDuration: string;
  maxMembers: string;
  memberCount: string;
  currentRecipient: Address;
  token: Address;
  state: "Open" | "Active" | "Completed";
  cycle: string;
  cycleStart: string;
  members: Address[];
};

type ApiSubmission = {
  id: string;
  contributor: Address;
  metadataURI: string;
  metadata: MetadataRecord | null;
  accessURI: string;
  dataType: string;
  reward: string;
  verified: boolean;
  claimed: boolean;
  submittedAt: string;
  quality: string;
};

type Snapshot = {
  generatedAt: string;
  network: string;
  chainId: number;
  rpcUrl: string;
  warnings: string[];
  addresses: {
    token: Address;
    convictionVoting: Address;
    impactAttestation: Address;
    savingsCircle: Address;
    depinRegistry: Address;
    privateConvictionVoting: Address;
  };
  metrics: {
    tokenSymbol: string;
    faucetAmount: string;
    publicTreasuryBalance: string;
    impactTreasuryBalance: string;
    proposalCount: string;
    attestationCount: string;
    circleCount: string;
    submissionCount: string;
  };
  proposals: ApiProposal[];
  attestations: ApiAttestation[];
  circles: ApiCircle[];
  submissions: ApiSubmission[];
};

function loadDeploymentConfig(): DeploymentConfig {
  const candidates = [
    process.env.COMMONWEALTH_DEPLOYMENT_CONFIG,
    path.resolve(process.cwd(), "packages/contracts/deployments/sepolia.json"),
    path.resolve(process.cwd(), "../contracts/deployments/sepolia.json"),
    path.resolve(MODULE_DIR, "../../contracts/deployments/sepolia.json"),
  ].filter((candidate): candidate is string => Boolean(candidate));

  const deploymentPath = candidates.find((candidate) => existsSync(candidate));

  if (!deploymentPath) {
    throw new Error(`Deployment config not found. Checked: ${candidates.join(", ")}`);
  }

  return JSON.parse(readFileSync(deploymentPath, "utf8")) as DeploymentConfig;
}

function decodeMetadataUri(uri: string): MetadataRecord | null {
  const prefix = "data:application/json;base64,";
  if (!uri.startsWith(prefix)) {
    return null;
  }

  try {
    return JSON.parse(Buffer.from(uri.slice(prefix.length), "base64").toString("utf8")) as MetadataRecord;
  } catch {
    return null;
  }
}

function getErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message) {
    return error.message;
  }

  return "Unknown RPC error";
}

function getCircleStateLabel(state: CircleState): "Open" | "Active" | "Completed" {
  if (state === CircleState.Active) return "Active";
  if (state === CircleState.Completed) return "Completed";
  return "Open";
}

function getDataTypeLabel(dataType: DataType): string {
  if (dataType === DataType.Infrastructure) return "Infrastructure";
  if (dataType === DataType.Compute) return "Compute";
  if (dataType === DataType.Storage) return "Storage";
  if (dataType === DataType.Bandwidth) return "Bandwidth";
  return "Environmental";
}

function toDescendingIds(count: bigint, limit: number): bigint[] {
  const bounded = count > BigInt(limit) ? limit : Number(count);
  const ids: bigint[] = [];

  for (let index = 0; index < bounded; index += 1) {
    ids.push(count - BigInt(index));
  }

  return ids.filter((value) => value > 0n);
}

function toStringValue(value: bigint): string {
  return value.toString();
}

const deployment = loadDeploymentConfig();
const rpcUrl = process.env.COMMONWEALTH_SEPOLIA_RPC_URL || process.env.NEXT_PUBLIC_SEPOLIA_RPC_URL || FALLBACK_RPC_URL;

const addresses = {
  token: deployment.token.address,
  convictionVoting: deployment.convictionVoting.address,
  impactAttestation: deployment.impactAttestation.address,
  savingsCircle: deployment.savingsCircle.address,
  depinRegistry: deployment.depinRegistry.address,
  privateConvictionVoting: deployment.privateConvictionVoting.address,
};

const client = createPublicClient({
  chain: sepolia,
  transport: http(rpcUrl, { timeout: 15_000 }),
});

async function safeRead<T>(warnings: string[], label: string, loader: () => Promise<T>, fallback: T): Promise<T> {
  try {
    return await loader();
  } catch (error) {
    warnings.push(`${label}: ${getErrorMessage(error)}`);
    return fallback;
  }
}

async function fetchProposal(id: bigint, warnings: string[]): Promise<ApiProposal | null> {
  return safeRead<ApiProposal | null>(warnings, `proposal ${id.toString()}`, async () => {
    const proposal = await client.readContract({
      address: addresses.convictionVoting,
      abi: CONVICTION_VOTING_ABI,
      functionName: "proposals",
      args: [id],
    });
    const threshold = await client.readContract({
      address: addresses.convictionVoting,
      abi: CONVICTION_VOTING_ABI,
      functionName: "convictionThreshold",
      args: [id],
    });
    const [proposalId, proposer, metadataURI, requestedAmount, beneficiary, conviction, totalStaked, lastUpdatedBlock, executed, cancelled, createdAt] = proposal;

    return {
      id: proposalId.toString(),
      proposer,
      metadataURI,
      metadata: decodeMetadataUri(metadataURI),
      requestedAmount: toStringValue(requestedAmount),
      beneficiary,
      conviction: toStringValue(conviction),
      totalStaked: toStringValue(totalStaked),
      threshold: toStringValue(threshold),
      executed,
      cancelled,
      createdAt: toStringValue(createdAt),
      lastUpdatedBlock: toStringValue(lastUpdatedBlock),
    };
  }, null);
}

async function fetchAttestation(id: bigint, warnings: string[]): Promise<ApiAttestation | null> {
  return safeRead<ApiAttestation | null>(warnings, `attestation ${id.toString()}`, async () => {
    const attestation = await client.readContract({
      address: addresses.impactAttestation,
      abi: IMPACT_ATTESTATION_ABI,
      functionName: "attestations",
      args: [id],
    });
    const [attestationId, contributor, proofURI, descriptionURI, requestedReward, confirmations, rejections, rewarded, rejected, submittedAt] = attestation;

    return {
      id: attestationId.toString(),
      contributor,
      proofURI,
      proof: decodeMetadataUri(proofURI),
      descriptionURI,
      description: decodeMetadataUri(descriptionURI),
      requestedReward: toStringValue(requestedReward),
      confirmations: toStringValue(confirmations),
      rejections: toStringValue(rejections),
      rewarded,
      rejected,
      submittedAt: toStringValue(submittedAt),
    };
  }, null);
}

async function fetchCircle(id: bigint, warnings: string[]): Promise<ApiCircle | null> {
  return safeRead<ApiCircle | null>(warnings, `circle ${id.toString()}`, async () => {
    const [circle, memberCount, members, currentRecipient] = await Promise.all([
      client.readContract({
        address: addresses.savingsCircle,
        abi: SAVINGS_CIRCLE_ABI,
        functionName: "circles",
        args: [id],
      }),
      client.readContract({
        address: addresses.savingsCircle,
        abi: SAVINGS_CIRCLE_ABI,
        functionName: "memberCount",
        args: [id],
      }),
      client.readContract({
        address: addresses.savingsCircle,
        abi: SAVINGS_CIRCLE_ABI,
        functionName: "members",
        args: [id],
      }),
      client.readContract({
        address: addresses.savingsCircle,
        abi: SAVINGS_CIRCLE_ABI,
        functionName: "currentRecipient",
        args: [id],
      }),
    ]);
    const [circleId, creator, name, contribution, cycleDuration, maxMembers, token, state, cycle, cycleStart] = circle;

    return {
      id: circleId.toString(),
      creator,
      name,
      contribution: toStringValue(contribution),
      cycleDuration: toStringValue(cycleDuration),
      maxMembers: toStringValue(maxMembers),
      memberCount: toStringValue(memberCount),
      currentRecipient,
      token,
      state: getCircleStateLabel(state as CircleState),
      cycle: toStringValue(cycle),
      cycleStart: toStringValue(cycleStart),
      members: [...members],
    };
  }, null);
}

async function fetchSubmission(id: bigint, warnings: string[]): Promise<ApiSubmission | null> {
  return safeRead<ApiSubmission | null>(warnings, `submission ${id.toString()}`, async () => {
    const submission = await client.readContract({
      address: addresses.depinRegistry,
      abi: DEPIN_REGISTRY_ABI,
      functionName: "submissions",
      args: [id],
    });
    const [submissionId, contributor, metadataURI, accessURI, dataType, reward, verified, claimed, submittedAt, quality] = submission;

    return {
      id: submissionId.toString(),
      contributor,
      metadataURI,
      metadata: decodeMetadataUri(metadataURI),
      accessURI,
      dataType: getDataTypeLabel(dataType as DataType),
      reward: toStringValue(reward),
      verified,
      claimed,
      submittedAt: toStringValue(submittedAt),
      quality: toStringValue(quality),
    };
  }, null);
}

async function loadSnapshot(limit: number): Promise<Snapshot> {
  const warnings: string[] = [];
  const [tokenSymbol, faucetAmount, publicTreasuryBalance, impactTreasuryBalance, proposalCount, attestationCount, circleCount, submissionCount] = await Promise.all([
    safeRead(warnings, "token symbol", () => client.readContract({
      address: addresses.token,
      abi: COMMONWEALTH_TOKEN_ABI,
      functionName: "symbol",
    }), "CWT"),
    safeRead(warnings, "faucet amount", () => client.readContract({
      address: addresses.token,
      abi: COMMONWEALTH_TOKEN_ABI,
      functionName: "faucetAmount",
    }), 0n),
    safeRead(warnings, "public treasury balance", () => client.readContract({
      address: addresses.convictionVoting,
      abi: CONVICTION_VOTING_ABI,
      functionName: "fundBalance",
    }), 0n),
    safeRead(warnings, "impact treasury balance", () => client.readContract({
      address: addresses.impactAttestation,
      abi: IMPACT_ATTESTATION_ABI,
      functionName: "treasury",
    }), 0n),
    safeRead(warnings, "proposal count", () => client.readContract({
      address: addresses.convictionVoting,
      abi: CONVICTION_VOTING_ABI,
      functionName: "proposalCount",
    }), 0n),
    safeRead(warnings, "attestation count", () => client.readContract({
      address: addresses.impactAttestation,
      abi: IMPACT_ATTESTATION_ABI,
      functionName: "count",
    }), 0n),
    safeRead(warnings, "circle count", () => client.readContract({
      address: addresses.savingsCircle,
      abi: SAVINGS_CIRCLE_ABI,
      functionName: "count",
    }), 0n),
    safeRead(warnings, "submission count", () => client.readContract({
      address: addresses.depinRegistry,
      abi: DEPIN_REGISTRY_ABI,
      functionName: "count",
    }), 0n),
  ]);

  const [proposals, attestations, circles, submissions] = await Promise.all([
    Promise.all(toDescendingIds(proposalCount, limit).map((id) => fetchProposal(id, warnings))),
    Promise.all(toDescendingIds(attestationCount, limit).map((id) => fetchAttestation(id, warnings))),
    Promise.all(toDescendingIds(circleCount, limit).map((id) => fetchCircle(id, warnings))),
    Promise.all(toDescendingIds(submissionCount, limit).map((id) => fetchSubmission(id, warnings))),
  ]);

  return {
    generatedAt: new Date().toISOString(),
    network: deployment.network,
    chainId: deployment.chainId,
    rpcUrl,
    warnings,
    addresses,
    metrics: {
      tokenSymbol,
      faucetAmount: toStringValue(faucetAmount),
      publicTreasuryBalance: toStringValue(publicTreasuryBalance),
      impactTreasuryBalance: toStringValue(impactTreasuryBalance),
      proposalCount: toStringValue(proposalCount),
      attestationCount: toStringValue(attestationCount),
      circleCount: toStringValue(circleCount),
      submissionCount: toStringValue(submissionCount),
    },
    proposals: proposals.filter((proposal): proposal is ApiProposal => proposal !== null),
    attestations: attestations.filter((attestation): attestation is ApiAttestation => attestation !== null),
    circles: circles.filter((circle): circle is ApiCircle => circle !== null),
    submissions: submissions.filter((submission): submission is ApiSubmission => submission !== null),
  };
}

function getLimit(rawLimit: string | undefined): number {
  const parsed = Number(rawLimit ?? "10");
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return 10;
  }
  return Math.min(parsed, MAX_RECORDS);
}

const app = Fastify({ logger: true });

app.get("/health", async () => ({
  status: "ok",
  service: "commonwealth-api",
  network: deployment.network,
  chainId: deployment.chainId,
  rpcUrl,
}));

app.get("/v1/config", async () => ({
  network: deployment.network,
  chainId: deployment.chainId,
  addresses,
  integrations: {
    zama: true,
    storacha: true,
    lit: true,
  },
}));

app.get("/v1/tracks", async () => ({
  crypto: {
    summary: "Live Sepolia treasury governance, retroactive funding, savings circles, and DePIN rewards.",
    surfaces: ["public governance", "impact funding", "savings circles", "depin registry"],
  },
  zama: {
    summary: "Private conviction voting is deployed on Sepolia and available in the frontend.",
    surfaces: ["confidential proposal ballots", "encrypted tally workflow"],
  },
  storacha: {
    summary: "Impact evidence and DePIN datasets can be uploaded to Storacha before their links are committed onchain.",
    surfaces: ["impact evidence archive", "depin dataset hosting"],
  },
  lit: {
    summary: "DePIN dataset links can be encrypted behind a token-gated Lit access condition keyed to CWT balances.",
    surfaces: ["token-gated dataset access", "wallet-authorized decrypt flow"],
  },
}));

app.get("/v1/protocol/metrics", async () => {
  const snapshot = await loadSnapshot(1);
  return {
    generatedAt: snapshot.generatedAt,
    warnings: snapshot.warnings,
    metrics: snapshot.metrics,
    addresses: snapshot.addresses,
  };
});

app.get("/v1/protocol/snapshot", async (request) => {
  const query = request.query as { limit?: string };
  return loadSnapshot(getLimit(query.limit));
});

const port = Number(process.env.PORT ?? "10000");

async function start(): Promise<void> {
  await app.register(cors, {
    origin: process.env.CORS_ORIGIN ? process.env.CORS_ORIGIN.split(",").map((value) => value.trim()) : true,
  });

  await app.listen({ host: "0.0.0.0", port });
}

void start().catch((error) => {
  app.log.error(error);
  process.exit(1);
});