"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  COMMONWEALTH_TOKEN_ABI,
  CONVICTION_VOTING_ABI,
  DEPIN_REGISTRY_ABI,
  IMPACT_ATTESTATION_ABI,
  PRIVATE_CONVICTION_VOTING_ABI,
  SAVINGS_CIRCLE_ABI,
  type DataType,
  type IAttestation,
  type ICircle,
  type IDataSubmission,
  type IPrivateProposal,
  type IProposal,
} from "@commonwealth/sdk";
import type { Address } from "viem";
import { useAccount, usePublicClient } from "wagmi";
import { CONTRACTS, contractsAreConfigured } from "@/lib/contracts";
import { decodeMetadataUri } from "@/lib/metadata";

type ProposalTuple = readonly [bigint, Address, string, bigint, Address, bigint, bigint, bigint, boolean, boolean, bigint];
type AttestationTuple = readonly [bigint, Address, string, string, bigint, bigint, bigint, boolean, boolean, bigint];
type CircleTuple = readonly [bigint, Address, string, bigint, bigint, bigint, Address, number, bigint, bigint];
type SubmissionTuple = readonly [bigint, Address, string, string, DataType, bigint, boolean, boolean, bigint, bigint];
type PrivateProposalTuple = readonly [bigint, bigint, Address, string, bigint, bigint, bigint, bigint, bigint];

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
    enabled: Boolean(publicClient) && contractsAreConfigured(),
    refetchInterval: 15_000,
    queryFn: async () => {
      if (!publicClient) {
        throw new Error("Public client unavailable");
      }

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
        readContract<bigint>(publicClient, {
          address: CONTRACTS.convictionVoting,
          abi: CONVICTION_VOTING_ABI,
          functionName: "proposalCount",
        }),
        readContract<bigint>(publicClient, {
          address: CONTRACTS.impactAttestation,
          abi: IMPACT_ATTESTATION_ABI,
          functionName: "count",
        }),
        readContract<bigint>(publicClient, {
          address: CONTRACTS.savingsCircle,
          abi: SAVINGS_CIRCLE_ABI,
          functionName: "count",
        }),
        readContract<bigint>(publicClient, {
          address: CONTRACTS.depinRegistry,
          abi: DEPIN_REGISTRY_ABI,
          functionName: "count",
        }),
        readContract<bigint>(publicClient, {
          address: CONTRACTS.privateConvictionVoting,
          abi: PRIVATE_CONVICTION_VOTING_ABI,
          functionName: "proposalCount",
        }),
        readContract<bigint>(publicClient, {
          address: CONTRACTS.convictionVoting,
          abi: CONVICTION_VOTING_ABI,
          functionName: "fundBalance",
        }),
        readContract<bigint>(publicClient, {
          address: CONTRACTS.impactAttestation,
          abi: IMPACT_ATTESTATION_ABI,
          functionName: "treasury",
        }),
        readContract<bigint>(publicClient, {
          address: CONTRACTS.token,
          abi: COMMONWEALTH_TOKEN_ABI,
          functionName: "balanceOf",
          args: [CONTRACTS.depinRegistry],
        }),
        readContract<bigint>(publicClient, {
          address: CONTRACTS.token,
          abi: COMMONWEALTH_TOKEN_ABI,
          functionName: "balanceOf",
          args: [CONTRACTS.savingsCircle],
        }),
        readContract<bigint>(publicClient, {
          address: CONTRACTS.token,
          abi: COMMONWEALTH_TOKEN_ABI,
          functionName: "faucetAmount",
        }),
        readContract<bigint>(publicClient, {
          address: CONTRACTS.token,
          abi: COMMONWEALTH_TOKEN_ABI,
          functionName: "faucetCooldown",
        }),
      ]);

      const approvalThreshold = await readContract<bigint>(publicClient, {
        address: CONTRACTS.impactAttestation,
        abi: IMPACT_ATTESTATION_ABI,
        functionName: "approvalThreshold",
      });
      const reviewWindow = await readContract<bigint>(publicClient, {
        address: CONTRACTS.impactAttestation,
        abi: IMPACT_ATTESTATION_ABI,
        functionName: "reviewWindow",
      });

      const proposals = await Promise.all(
        Array.from({ length: Number(proposalCount) }, async (_, index) => {
          const proposalId = BigInt(index + 1);
          const proposal = await readContract<ProposalTuple>(publicClient, {
            address: CONTRACTS.convictionVoting,
            abi: CONVICTION_VOTING_ABI,
            functionName: "proposals",
            args: [proposalId],
          });
          const [currentConviction, threshold, myStake] = await Promise.all([
            readContract<bigint>(publicClient, {
              address: CONTRACTS.convictionVoting,
              abi: CONVICTION_VOTING_ABI,
              functionName: "getCurrentConviction",
              args: [proposalId],
            }),
            readContract<bigint>(publicClient, {
              address: CONTRACTS.convictionVoting,
              abi: CONVICTION_VOTING_ABI,
              functionName: "convictionThreshold",
              args: [proposalId],
            }),
            address
              ? readContract<bigint>(publicClient, {
                  address: CONTRACTS.convictionVoting,
                  abi: CONVICTION_VOTING_ABI,
                  functionName: "stakes",
                  args: [proposalId, address],
                })
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
        Array.from({ length: Number(attestationCount) }, async (_, index) => {
          const attestationId = BigInt(index + 1);
          const attestation = await readContract<AttestationTuple>(publicClient, {
            address: CONTRACTS.impactAttestation,
            abi: IMPACT_ATTESTATION_ABI,
            functionName: "attestations",
            args: [attestationId],
          });

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
              ? await readContract<boolean>(publicClient, {
                  address: CONTRACTS.impactAttestation,
                  abi: IMPACT_ATTESTATION_ABI,
                  functionName: "hasVoted",
                  args: [attestationId, address],
                })
              : false,
          };
        }),
      );

      const circles = await Promise.all(
        Array.from({ length: Number(circleCount) }, async (_, index) => {
          const circleId = BigInt(index + 1);
          const circle = await readContract<CircleTuple>(publicClient, {
            address: CONTRACTS.savingsCircle,
            abi: SAVINGS_CIRCLE_ABI,
            functionName: "circles",
            args: [circleId],
          });
          const [memberCount, recipient] = await Promise.all([
            readContract<bigint>(publicClient, {
              address: CONTRACTS.savingsCircle,
              abi: SAVINGS_CIRCLE_ABI,
              functionName: "memberCount",
              args: [circleId],
            }),
            readContract<Address>(publicClient, {
              address: CONTRACTS.savingsCircle,
              abi: SAVINGS_CIRCLE_ABI,
              functionName: "currentRecipient",
              args: [circleId],
            }),
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
        Array.from({ length: Number(submissionCount) }, async (_, index) => {
          const submissionId = BigInt(index + 1);
          const submission = await readContract<SubmissionTuple>(publicClient, {
            address: CONTRACTS.depinRegistry,
            abi: DEPIN_REGISTRY_ABI,
            functionName: "submissions",
            args: [submissionId],
          });

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
        Array.from({ length: Number(privateProposalCount) }, async (_, index) => {
          const proposalId = BigInt(index + 1);
          const proposal = await readContract<PrivateProposalTuple>(publicClient, {
            address: CONTRACTS.privateConvictionVoting,
            abi: PRIVATE_CONVICTION_VOTING_ABI,
            functionName: "proposals",
            args: [proposalId],
          });

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
              ? await readContract<boolean>(publicClient, {
                  address: CONTRACTS.privateConvictionVoting,
                  abi: PRIVATE_CONVICTION_VOTING_ABI,
                  functionName: "hasVoted",
                  args: [proposalId, address],
                })
              : false,
          };
        }),
      );

      const connectedWallet = address
        ? await Promise.all([
            readContract<bigint>(publicClient, {
              address: CONTRACTS.token,
              abi: COMMONWEALTH_TOKEN_ABI,
              functionName: "balanceOf",
              args: [address],
            }),
            readContract<bigint>(publicClient, {
              address: CONTRACTS.token,
              abi: COMMONWEALTH_TOKEN_ABI,
              functionName: "allowance",
              args: [address, CONTRACTS.convictionVoting],
            }),
            readContract<bigint>(publicClient, {
              address: CONTRACTS.token,
              abi: COMMONWEALTH_TOKEN_ABI,
              functionName: "allowance",
              args: [address, CONTRACTS.savingsCircle],
            }),
            readContract<bigint>(publicClient, {
              address: CONTRACTS.token,
              abi: COMMONWEALTH_TOKEN_ABI,
              functionName: "lastClaimAt",
              args: [address],
            }),
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
