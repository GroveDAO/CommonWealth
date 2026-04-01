import type { Address, PublicClient, WalletClient } from "viem";
import { CONVICTION_VOTING_ABI } from "./abis.js";
import type { IProposal } from "./types.js";

export class ConvictionVotingClient {
  private publicClient: PublicClient;
  private contractAddress: Address;
  private walletClient?: WalletClient;

  constructor(publicClient: PublicClient, contractAddress: Address, walletClient?: WalletClient) {
    this.publicClient = publicClient;
    this.contractAddress = contractAddress;
    this.walletClient = walletClient;
  }

  async createProposal(metadataURI: string, requestedAmount: bigint, beneficiary: Address): Promise<`0x${string}`> {
    if (!this.walletClient) throw new Error("WalletClient required for writes");
    const [account] = await this.walletClient.getAddresses();
    return this.walletClient.writeContract({
      address: this.contractAddress,
      abi: CONVICTION_VOTING_ABI,
      functionName: "createProposal",
      args: [metadataURI, requestedAmount, beneficiary],
      account,
      chain: this.walletClient.chain,
    });
  }

  async stakeOnProposal(proposalId: bigint, amount: bigint): Promise<`0x${string}`> {
    if (!this.walletClient) throw new Error("WalletClient required for writes");
    const [account] = await this.walletClient.getAddresses();
    return this.walletClient.writeContract({
      address: this.contractAddress,
      abi: CONVICTION_VOTING_ABI,
      functionName: "stakeOnProposal",
      args: [proposalId, amount],
      account,
      chain: this.walletClient.chain,
    });
  }

  async withdrawStake(proposalId: bigint, amount: bigint): Promise<`0x${string}`> {
    if (!this.walletClient) throw new Error("WalletClient required for writes");
    const [account] = await this.walletClient.getAddresses();
    return this.walletClient.writeContract({
      address: this.contractAddress,
      abi: CONVICTION_VOTING_ABI,
      functionName: "withdrawStake",
      args: [proposalId, amount],
      account,
      chain: this.walletClient.chain,
    });
  }

  async executeProposal(proposalId: bigint): Promise<`0x${string}`> {
    if (!this.walletClient) throw new Error("WalletClient required for writes");
    const [account] = await this.walletClient.getAddresses();
    return this.walletClient.writeContract({
      address: this.contractAddress,
      abi: CONVICTION_VOTING_ABI,
      functionName: "executeProposal",
      args: [proposalId],
      account,
      chain: this.walletClient.chain,
    });
  }

  async deposit(value: bigint): Promise<`0x${string}`> {
    if (!this.walletClient) throw new Error("WalletClient required for writes");
    const [account] = await this.walletClient.getAddresses();
    return this.walletClient.writeContract({
      address: this.contractAddress,
      abi: CONVICTION_VOTING_ABI,
      functionName: "deposit",
      args: [],
      value,
      account,
      chain: this.walletClient.chain,
    });
  }

  async getProposal(proposalId: bigint): Promise<IProposal> {
    const result = await this.publicClient.readContract({
      address: this.contractAddress,
      abi: CONVICTION_VOTING_ABI,
      functionName: "proposals",
      args: [proposalId],
    });

    return {
      id: result[0],
      proposer: result[1],
      metadataURI: result[2],
      requestedAmount: result[3],
      beneficiary: result[4],
      conviction: result[5],
      totalStaked: result[6],
      lastUpdatedBlock: result[7],
      executed: result[8],
      cancelled: result[9],
      createdAt: result[10],
    };
  }

  async getProposalCount(): Promise<bigint> {
    return this.publicClient.readContract({
      address: this.contractAddress,
      abi: CONVICTION_VOTING_ABI,
      functionName: "proposalCount",
    });
  }

  async getCurrentConviction(proposalId: bigint): Promise<bigint> {
    return this.publicClient.readContract({
      address: this.contractAddress,
      abi: CONVICTION_VOTING_ABI,
      functionName: "getCurrentConviction",
      args: [proposalId],
    });
  }

  async getConvictionThreshold(proposalId: bigint): Promise<bigint> {
    return this.publicClient.readContract({
      address: this.contractAddress,
      abi: CONVICTION_VOTING_ABI,
      functionName: "convictionThreshold",
      args: [proposalId],
    });
  }

  async getStake(proposalId: bigint, voter: Address): Promise<bigint> {
    return this.publicClient.readContract({
      address: this.contractAddress,
      abi: CONVICTION_VOTING_ABI,
      functionName: "stakes",
      args: [proposalId, voter],
    });
  }

  async getFundBalance(): Promise<bigint> {
    return this.publicClient.readContract({
      address: this.contractAddress,
      abi: CONVICTION_VOTING_ABI,
      functionName: "fundBalance",
    });
  }
}
