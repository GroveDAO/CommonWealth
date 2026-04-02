"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  COMMONWEALTH_TOKEN_ABI,
  CONVICTION_VOTING_ABI,
  DEPIN_REGISTRY_ABI,
  DataType,
  IMPACT_ATTESTATION_ABI,
  PRIVATE_CONVICTION_VOTING_ABI,
  SAVINGS_CIRCLE_ABI,
  type IAttestation,
  type ICircle,
  type IDataSubmission,
  type IPrivateProposal,
  type IProposal,
} from "@commonwealth/sdk";
import type { Address } from "viem";
import { useAccount, usePublicClient } from "wagmi";
import { CONFIG_ERRORS, CONFIG_WARNINGS, CONTRACTS, ZERO_ADDRESS, contractsAreConfigured } from "@/lib/contracts";
import { decodeMetadataUri } from "@/lib/metadata";

type ProposalTuple = readonly [bigint, Address, string, bigint, Address, bigint, bigint, bigint, boolean, boolean, bigint];
type AttestationTuple = readonly [bigint, Address, string, string, bigint, bigint, bigint, boolean, boolean, bigint];
type CircleTuple = readonly [bigint, Address, string, bigint, bigint, bigint, Address, number, bigint, bigint];
type SubmissionTuple = readonly [bigint, Address, string, string, DataType, bigint, boolean, boolean, bigint, bigint];
type PrivateProposalTuple = readonly [bigint, bigint, Address, string, bigint, bigint, bigint, bigint, bigint];

interface ProtocolSnapshot {
  proposals: Array<
    IProposal & {
      currentConviction: bigint;
      threshold: bigint;
      myStake: bigint;
      metadata: ReturnType<typeof decodeMetadataUri>;
    }
  >;
  attestations: Array<
    IAttestation & {
      status: string;
      description: ReturnType<typeof decodeMetadataUri>;
      proof: ReturnType<typeof decodeMetadataUri>;
      hasVoted: boolean;
    }
  >;
  circles: Array<
    ICircle & {
      memberCount: bigint;
      currentRecipient: Address;
    }
  >;
  submissions: Array<
    IDataSubmission & {
      metadata: ReturnType<typeof decodeMetadataUri>;
    }
  >;
  privateProposals: Array<
    IPrivateProposal & {
      metadata: ReturnType<typeof decodeMetadataUri>;
      hasVoted: boolean;
    }
  >;
  balances: {
    convictionTreasury: bigint;
    impactTreasury: bigint;
    depinRewardPool: bigint;
    savingsEscrow: bigint;
    distributedRewards: bigint;
  };
  wallet: {
    tokenBalance: bigint;
    convictionAllowance: bigint;
    savingsAllowance: bigint;
    lastClaimAt: bigint;
    faucetAmount: bigint;
    faucetCooldown: bigint;
  } | null;
  status: {
    configurationErrors: string[];
    warnings: string[];
    loadedAt: number;
    truncated: boolean;
  };
}

function buildEmptySnapshot(status?: Partial<ProtocolSnapshot["status"]>): ProtocolSnapshot {
  return {
    proposals: [],
    attestations: [],
    circles: [],
    submissions: [],
    privateProposals: [],
    balances: {
      convictionTreasury: 0n,
      impactTreasury: 0n,
      depinRewardPool: 0n,
      savingsEscrow: 0n,
      distributedRewards: 0n,
    },
    wallet: null,
    status: {
      configurationErrors: [...CONFIG_ERRORS],
      warnings: [...CONFIG_WARNINGS],
      loadedAt: 0,
      truncated: false,
      ...status,
    },
  };
}

function buildEntityIds(total: bigint, label: string, warnings: string[], limit = 25): bigint[] {
  const cappedTotal = total > BigInt(limit) ? BigInt(limit) : total;

  if (total > BigInt(limit)) {
    warnings.push(`${label} were truncated to the most recent ${limit} records.`);
  }

  if (cappedTotal === 0n) {
    return [];
  }

  const start = total - cappedTotal + 1n;

  return Array.from({ length: Number(cappedTotal) }, (_, index) => start + BigInt(index)).reverse();
}

async function safeReadContract<T>(
  publicClient: NonNullable<ReturnType<typeof usePublicClient>>,
  config: {
    address: Address;
    abi: readonly unknown[];
    functionName: string;
    args?: readonly unknown[];
  },
  fallback: T,
  warning: string,
  warnings: string[],
): Promise<T> {
  try {
    return await readContract<T>(publicClient, config);
  } catch {
    warnings.push(warning);
    return fallback;
  }
}

async function readContract<T>(
  publicClient: NonNullable<ReturnType<typeof usePublicClient>>,
  config: {
    address: Address;
    abi: readonly unknown[];
    functionName: string;
    args?: readonly unknown[];
  },
): Promise<T> {
  return publicClient.readContract({
    address: config.address,
    abi: config.abi,
    functionName: config.functionName,
    args: config.args,
  }) as Promise<T>;
}

export function useProtocolData() {
  const publicClient = usePublicClient();
  const { address } = useAccount();

  return useQuery({
    queryKey: ["protocolSnapshot", address],
    enabled: Boolean(publicClient),
    initialData: buildEmptySnapshot(),
    placeholderData: (previousData) => previousData,
    refetchInterval: 15_000,
    retry: 1,
    queryFn: async () => {
      if (!publicClient) {
        throw new Error("Public client unavailable");
      }

      if (!contractsAreConfigured()) {
        return buildEmptySnapshot({
          configurationErrors: [...CONFIG_ERRORS],
          warnings: [...CONFIG_WARNINGS],
          loadedAt: Date.now(),
        });
      }

      const warnings: string[] = [];

      const [
        proposalCount,
        attestationCount,
        circleCount,
        submissionCount,
        privateProposalCount,
        convictionTreasury,
        impactTreasury,
        depinRewardPool,
        savingsEscrow,
        faucetAmount,
        faucetCooldown,
      ] = await Promise.all([
        safeReadContract<bigint>(
          publicClient,
          {
          address: CONTRACTS.convictionVoting,
          abi: CONVICTION_VOTING_ABI,
          functionName: "proposalCount",
          },
          0n,
          "Unable to load treasury proposal count.",
          warnings,
        ),
        safeReadContract<bigint>(
          publicClient,
          {
          address: CONTRACTS.impactAttestation,
          abi: IMPACT_ATTESTATION_ABI,
          functionName: "count",
          },
          0n,
          "Unable to load attestation count.",
          warnings,
        ),
        safeReadContract<bigint>(
          publicClient,
          {
          address: CONTRACTS.savingsCircle,
          abi: SAVINGS_CIRCLE_ABI,
          functionName: "count",
          },
          0n,
          "Unable to load savings circle count.",
          warnings,
        ),
        safeReadContract<bigint>(
          publicClient,
          {
          address: CONTRACTS.depinRegistry,
          abi: DEPIN_REGISTRY_ABI,
          functionName: "count",
          },
          0n,
          "Unable to load DePIN submission count.",
          warnings,
        ),
        safeReadContract<bigint>(
          publicClient,
          {
          address: CONTRACTS.privateConvictionVoting,
          abi: PRIVATE_CONVICTION_VOTING_ABI,
          functionName: "proposalCount",
          },
          0n,
          "Unable to load encrypted proposal count.",
          warnings,
        ),
        safeReadContract<bigint>(
          publicClient,
          {
          address: CONTRACTS.convictionVoting,
          abi: CONVICTION_VOTING_ABI,
          functionName: "fundBalance",
          },
          0n,
          "Unable to load treasury balance.",
          warnings,
        ),
        safeReadContract<bigint>(
          publicClient,
          {
          address: CONTRACTS.impactAttestation,
          abi: IMPACT_ATTESTATION_ABI,
          functionName: "treasury",
          },
          0n,
          "Unable to load impact treasury balance.",
          warnings,
        ),
        safeReadContract<bigint>(
          publicClient,
          {
          address: CONTRACTS.token,
          abi: COMMONWEALTH_TOKEN_ABI,
          functionName: "balanceOf",
          args: [CONTRACTS.depinRegistry],
          },
          0n,
          "Unable to load DePIN reward pool balance.",
          warnings,
        ),
        safeReadContract<bigint>(
          publicClient,
          {
          address: CONTRACTS.token,
          abi: COMMONWEALTH_TOKEN_ABI,
          functionName: "balanceOf",
          args: [CONTRACTS.savingsCircle],
          },
          0n,
          "Unable to load savings escrow balance.",
          warnings,
        ),
        safeReadContract<bigint>(
          publicClient,
          {
          address: CONTRACTS.token,
          abi: COMMONWEALTH_TOKEN_ABI,
          functionName: "faucetAmount",
          },
          0n,
          "Unable to load faucet amount.",
          warnings,
        ),
        safeReadContract<bigint>(
          publicClient,
          {
          address: CONTRACTS.token,
          abi: COMMONWEALTH_TOKEN_ABI,
          functionName: "faucetCooldown",
          },
          0n,
          "Unable to load faucet cooldown.",
          warnings,
        ),
      ]);

      const [approvalThreshold, reviewWindow] = await Promise.all([
        safeReadContract<bigint>(
          publicClient,
          {
            address: CONTRACTS.impactAttestation,
            abi: IMPACT_ATTESTATION_ABI,
            functionName: "approvalThreshold",
          },
          0n,
          "Unable to load attestation approval threshold.",
          warnings,
        ),
        safeReadContract<bigint>(
          publicClient,
          {
            address: CONTRACTS.impactAttestation,
            abi: IMPACT_ATTESTATION_ABI,
            functionName: "reviewWindow",
          },
          0n,
          "Unable to load attestation review window.",
          warnings,
        ),
      ]);

      const proposalIds = buildEntityIds(proposalCount, "Treasury proposals", warnings);
      const attestationIds = buildEntityIds(attestationCount, "Impact attestations", warnings);
      const circleIds = buildEntityIds(circleCount, "Savings circles", warnings);
      const submissionIds = buildEntityIds(submissionCount, "DePIN submissions", warnings);
      const privateProposalIds = buildEntityIds(privateProposalCount, "Private voting proposals", warnings);

      const proposals = await Promise.all(
        proposalIds.map(async (proposalId) => {
          const proposal = await safeReadContract<ProposalTuple>(
            publicClient,
            {
              address: CONTRACTS.convictionVoting,
              abi: CONVICTION_VOTING_ABI,
              functionName: "proposals",
              args: [proposalId],
            },
            [proposalId, ZERO_ADDRESS, "", 0n, ZERO_ADDRESS, 0n, 0n, 0n, false, false, 0n],
            `Unable to load treasury proposal ${proposalId.toString()}.`,
            warnings,
          );
          const [currentConviction, threshold, myStake] = await Promise.all([
            safeReadContract<bigint>(
              publicClient,
              {
                address: CONTRACTS.convictionVoting,
                abi: CONVICTION_VOTING_ABI,
                functionName: "getCurrentConviction",
                args: [proposalId],
              },
              proposal[5],
              `Unable to calculate conviction for proposal ${proposalId.toString()}.`,
              warnings,
            ),
            safeReadContract<bigint>(
              publicClient,
              {
                address: CONTRACTS.convictionVoting,
                abi: CONVICTION_VOTING_ABI,
                functionName: "convictionThreshold",
                args: [proposalId],
              },
              0n,
              `Unable to calculate threshold for proposal ${proposalId.toString()}.`,
              warnings,
            ),
            address
              ? safeReadContract<bigint>(
                  publicClient,
                  {
                    address: CONTRACTS.convictionVoting,
                    abi: CONVICTION_VOTING_ABI,
                    functionName: "stakes",
                    args: [proposalId, address],
                  },
                  0n,
                  `Unable to load connected stake for proposal ${proposalId.toString()}.`,
                  warnings,
                )
              : Promise.resolve(0n),
          ]);

          const base: IProposal = {
            id: proposal[0],
            proposer: proposal[1],
            metadataURI: proposal[2],
            requestedAmount: proposal[3],
            beneficiary: proposal[4],
            conviction: proposal[5],
            totalStaked: proposal[6],
            lastUpdatedBlock: proposal[7],
            executed: proposal[8],
            cancelled: proposal[9],
            createdAt: proposal[10],
          };

          return {
            ...base,
            currentConviction,
            threshold,
            myStake,
            metadata: decodeMetadataUri(base.metadataURI),
          };
        }),
      );

      const attestations = await Promise.all(
        attestationIds.map(async (attestationId) => {
          const attestation = await safeReadContract<AttestationTuple>(
            publicClient,
            {
              address: CONTRACTS.impactAttestation,
              abi: IMPACT_ATTESTATION_ABI,
              functionName: "attestations",
              args: [attestationId],
            },
            [attestationId, ZERO_ADDRESS, "", "", 0n, 0n, 0n, false, false, 0n],
            `Unable to load attestation ${attestationId.toString()}.`,
            warnings,
          );

          const base: IAttestation = {
            id: attestation[0],
            contributor: attestation[1],
            proofURI: attestation[2],
            descriptionURI: attestation[3],
            requestedReward: attestation[4],
            confirmations: attestation[5],
            rejections: attestation[6],
            rewarded: attestation[7],
            rejected: attestation[8],
            submittedAt: attestation[9],
          };

          const isExpired = BigInt(Math.floor(Date.now() / 1000)) > base.submittedAt + reviewWindow;
          const status = base.rewarded
            ? "Rewarded"
            : base.rejected
              ? "Rejected"
              : base.confirmations >= approvalThreshold
                ? "Confirmed"
                : isExpired
                  ? "Expired"
                  : "Pending";

          return {
            ...base,
            status,
            description: decodeMetadataUri(base.descriptionURI),
            proof: decodeMetadataUri(base.proofURI),
            hasVoted: address
              ? await safeReadContract<boolean>(
                  publicClient,
                  {
                    address: CONTRACTS.impactAttestation,
                    abi: IMPACT_ATTESTATION_ABI,
                    functionName: "hasVoted",
                    args: [attestationId, address],
                  },
                  false,
                  `Unable to load connected review status for attestation ${attestationId.toString()}.`,
                  warnings,
                )
              : false,
          };
        }),
      );

      const circles = await Promise.all(
        circleIds.map(async (circleId) => {
          const circle = await safeReadContract<CircleTuple>(
            publicClient,
            {
              address: CONTRACTS.savingsCircle,
              abi: SAVINGS_CIRCLE_ABI,
              functionName: "circles",
              args: [circleId],
            },
            [circleId, ZERO_ADDRESS, "", 0n, 0n, 0n, ZERO_ADDRESS, 0, 0n, 0n],
            `Unable to load savings circle ${circleId.toString()}.`,
            warnings,
          );
          const [memberCount, recipient] = await Promise.all([
            safeReadContract<bigint>(
              publicClient,
              {
                address: CONTRACTS.savingsCircle,
                abi: SAVINGS_CIRCLE_ABI,
                functionName: "memberCount",
                args: [circleId],
              },
              0n,
              `Unable to load member count for circle ${circleId.toString()}.`,
              warnings,
            ),
            safeReadContract<Address>(
              publicClient,
              {
                address: CONTRACTS.savingsCircle,
                abi: SAVINGS_CIRCLE_ABI,
                functionName: "currentRecipient",
                args: [circleId],
              },
              ZERO_ADDRESS,
              `Unable to load current recipient for circle ${circleId.toString()}.`,
              warnings,
            ),
          ]);

          const base: ICircle = {
            id: circle[0],
            creator: circle[1],
            name: circle[2],
            contribution: circle[3],
            cycleDuration: circle[4],
            maxMembers: circle[5],
            token: circle[6],
            state: circle[7],
            cycle: circle[8],
            cycleStart: circle[9],
          };

          return {
            ...base,
            memberCount,
            currentRecipient: recipient,
          };
        }),
      );

      const submissions = await Promise.all(
        submissionIds.map(async (submissionId) => {
          const submission = await safeReadContract<SubmissionTuple>(
            publicClient,
            {
              address: CONTRACTS.depinRegistry,
              abi: DEPIN_REGISTRY_ABI,
              functionName: "submissions",
              args: [submissionId],
            },
            [submissionId, ZERO_ADDRESS, "", "", DataType.Environmental, 0n, false, false, 0n, 0n],
            `Unable to load DePIN submission ${submissionId.toString()}.`,
            warnings,
          );

          const base: IDataSubmission = {
            id: submission[0],
            contributor: submission[1],
            metadataURI: submission[2],
            accessURI: submission[3],
            dataType: submission[4],
            reward: submission[5],
            verified: submission[6],
            claimed: submission[7],
            submittedAt: submission[8],
            quality: submission[9],
          };

          return {
            ...base,
            metadata: decodeMetadataUri(base.metadataURI),
          };
        }),
      );

      const privateProposals = await Promise.all(
        privateProposalIds.map(async (proposalId) => {
          const proposal = await safeReadContract<PrivateProposalTuple>(
            publicClient,
            {
              address: CONTRACTS.privateConvictionVoting,
              abi: PRIVATE_CONVICTION_VOTING_ABI,
              functionName: "proposals",
              args: [proposalId],
            },
            [proposalId, 0n, ZERO_ADDRESS, "", 0n, 0n, 0n, 0n, 0n],
            `Unable to load private proposal ${proposalId.toString()}.`,
            warnings,
          );

          const base: IPrivateProposal = {
            id: proposal[0],
            publicProposalId: proposal[1],
            proposer: proposal[2],
            metadataURI: proposal[3],
            ballotCount: proposal[4],
            latestSupport: BigInt(proposal[5]),
            latestOpposition: BigInt(proposal[6]),
            latestTallyAt: proposal[7],
            createdAt: proposal[8],
          };

          return {
            ...base,
            metadata: decodeMetadataUri(base.metadataURI),
            hasVoted: address
              ? await safeReadContract<boolean>(
                  publicClient,
                  {
                    address: CONTRACTS.privateConvictionVoting,
                    abi: PRIVATE_CONVICTION_VOTING_ABI,
                    functionName: "hasVoted",
                    args: [proposalId, address],
                  },
                  false,
                  `Unable to load connected ballot status for private proposal ${proposalId.toString()}.`,
                  warnings,
                )
              : false,
          };
        }),
      );

      const connectedWallet = address
        ? await Promise.all([
            safeReadContract<bigint>(
              publicClient,
              {
                address: CONTRACTS.token,
                abi: COMMONWEALTH_TOKEN_ABI,
                functionName: "balanceOf",
                args: [address],
              },
              0n,
              "Unable to load connected wallet token balance.",
              warnings,
            ),
            safeReadContract<bigint>(
              publicClient,
              {
                address: CONTRACTS.token,
                abi: COMMONWEALTH_TOKEN_ABI,
                functionName: "allowance",
                args: [address, CONTRACTS.convictionVoting],
              },
              0n,
              "Unable to load governance allowance.",
              warnings,
            ),
            safeReadContract<bigint>(
              publicClient,
              {
                address: CONTRACTS.token,
                abi: COMMONWEALTH_TOKEN_ABI,
                functionName: "allowance",
                args: [address, CONTRACTS.savingsCircle],
              },
              0n,
              "Unable to load savings allowance.",
              warnings,
            ),
            safeReadContract<bigint>(
              publicClient,
              {
                address: CONTRACTS.token,
                abi: COMMONWEALTH_TOKEN_ABI,
                functionName: "lastClaimAt",
                args: [address],
              },
              0n,
              "Unable to load faucet claim history.",
              warnings,
            ),
          ])
        : null;

      const distributedRewards =
        submissions.filter((submission) => submission.claimed).reduce((total, submission) => total + submission.reward, 0n) +
        attestations.filter((attestation) => attestation.rewarded).reduce((total, attestation) => total + attestation.requestedReward, 0n);

      return {
        proposals,
        attestations,
        circles,
        submissions,
        privateProposals,
        balances: {
          convictionTreasury,
          impactTreasury,
          depinRewardPool,
          savingsEscrow,
          distributedRewards,
        },
        wallet: connectedWallet
          ? {
              tokenBalance: connectedWallet[0],
              convictionAllowance: connectedWallet[1],
              savingsAllowance: connectedWallet[2],
              lastClaimAt: connectedWallet[3],
              faucetAmount,
              faucetCooldown,
            }
          : null,
        status: {
          configurationErrors: [...CONFIG_ERRORS],
          warnings: Array.from(new Set([...CONFIG_WARNINGS, ...warnings])),
          loadedAt: Date.now(),
          truncated: warnings.some((warning) => warning.includes("truncated")),
        },
      };
    },
  });
}

export function useRefreshProtocolData() {
  const queryClient = useQueryClient();

  return async function refreshProtocolData() {
    await queryClient.invalidateQueries({ queryKey: ["protocolSnapshot"] });
  };
}
