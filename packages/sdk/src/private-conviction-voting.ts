import type { Address, PublicClient, WalletClient } from "viem";
import { PRIVATE_CONVICTION_VOTING_ABI } from "./abis.js";
import type { IPrivateProposal } from "./types.js";

export class PrivateConvictionVotingClient {
  private publicClient: PublicClient;
  private contractAddress: Address;
  private walletClient?: WalletClient;

  constructor(publicClient: PublicClient, contractAddress: Address, walletClient?: WalletClient) {
    this.publicClient = publicClient;
    this.contractAddress = contractAddress;
    this.walletClient = walletClient;
  }

  async createProposal(publicProposalId: bigint, metadataURI: string): Promise<`0x${string}`> {
    if (!this.walletClient) throw new Error("WalletClient required for writes");
    const [account] = await this.walletClient.getAddresses();
    return this.walletClient.writeContract({
      address: this.contractAddress,
      abi: PRIVATE_CONVICTION_VOTING_ABI,
      functionName: "createProposal",
      args: [publicProposalId, metadataURI],
      account,
      chain: this.walletClient.chain,
    });
  }

  async castBallot(
    proposalId: bigint,
    encryptedWeight: `0x${string}`,
    encryptedSupport: `0x${string}`,
    inputProof: `0x${string}`,
  ): Promise<`0x${string}`> {
    if (!this.walletClient) throw new Error("WalletClient required for writes");
    const [account] = await this.walletClient.getAddresses();
    return this.walletClient.writeContract({
      address: this.contractAddress,
      abi: PRIVATE_CONVICTION_VOTING_ABI,
      functionName: "castBallot",
      args: [proposalId, encryptedWeight, encryptedSupport, inputProof],
      account,
      chain: this.walletClient.chain,
    });
  }

  async requestPublicTally(proposalId: bigint): Promise<`0x${string}`> {
    if (!this.walletClient) throw new Error("WalletClient required for writes");
    const [account] = await this.walletClient.getAddresses();
    return this.walletClient.writeContract({
      address: this.contractAddress,
      abi: PRIVATE_CONVICTION_VOTING_ABI,
      functionName: "requestPublicTally",
      args: [proposalId],
      account,
      chain: this.walletClient.chain,
    });
  }

  async publishPublicTally(
    proposalId: bigint,
    support: bigint,
    opposition: bigint,
    decryptionProof: `0x${string}`,
  ): Promise<`0x${string}`> {
    if (!this.walletClient) throw new Error("WalletClient required for writes");
    const [account] = await this.walletClient.getAddresses();
    return this.walletClient.writeContract({
      address: this.contractAddress,
      abi: PRIVATE_CONVICTION_VOTING_ABI,
      functionName: "publishPublicTally",
      args: [proposalId, support, opposition, decryptionProof],
      account,
      chain: this.walletClient.chain,
    });
  }

  async getProposal(proposalId: bigint): Promise<IPrivateProposal> {
    const result = await this.publicClient.readContract({
      address: this.contractAddress,
      abi: PRIVATE_CONVICTION_VOTING_ABI,
      functionName: "proposals",
      args: [proposalId],
    });

    return {
      id: result[0],
      publicProposalId: result[1],
      proposer: result[2],
      metadataURI: result[3],
      ballotCount: result[4],
      latestSupport: BigInt(result[5]),
      latestOpposition: BigInt(result[6]),
      latestTallyAt: result[7],
      createdAt: result[8],
    };
  }

  async getProposalCount(): Promise<bigint> {
    return this.publicClient.readContract({
      address: this.contractAddress,
      abi: PRIVATE_CONVICTION_VOTING_ABI,
      functionName: "proposalCount",
    });
  }

  async hasVoted(proposalId: bigint, account: Address): Promise<boolean> {
    return this.publicClient.readContract({
      address: this.contractAddress,
      abi: PRIVATE_CONVICTION_VOTING_ABI,
      functionName: "hasVoted",
      args: [proposalId, account],
    });
  }
}
