import type { PublicClient, WalletClient, Address } from "viem";
import { CONVICTION_VOTING_ABI } from "./abis.js";
import type { IProposal, IVoterState } from "./types.js";

export class ConvictionVotingClient {
  private publicClient: PublicClient;
  private contractAddress: Address;
  private walletClient?: WalletClient;

  constructor(publicClient: PublicClient, contractAddress: Address, walletClient?: WalletClient) {
    this.publicClient = publicClient;
    this.contractAddress = contractAddress;
    this.walletClient = walletClient;
  }

  async createProposal(cid: string, amount: bigint, beneficiary: Address): Promise<`0x${string}`> {
    if (!this.walletClient) throw new Error("WalletClient required for writes");
    const [account] = await this.walletClient.getAddresses();
    return this.walletClient.writeContract({
      address: this.contractAddress,
      abi: CONVICTION_VOTING_ABI,
      functionName: "createProposal",
      args: [cid, amount, beneficiary],
      account,
      chain: this.walletClient.chain,
    });
  }

  async stakeOnProposal(id: bigint, amount: bigint): Promise<`0x${string}`> {
    if (!this.walletClient) throw new Error("WalletClient required for writes");
    const [account] = await this.walletClient.getAddresses();
    return this.walletClient.writeContract({
      address: this.contractAddress,
      abi: CONVICTION_VOTING_ABI,
      functionName: "stakeOnProposal",
      args: [id, amount],
      account,
      chain: this.walletClient.chain,
    });
  }

  async withdrawStake(id: bigint, amount: bigint): Promise<`0x${string}`> {
    if (!this.walletClient) throw new Error("WalletClient required for writes");
    const [account] = await this.walletClient.getAddresses();
    return this.walletClient.writeContract({
      address: this.contractAddress,
      abi: CONVICTION_VOTING_ABI,
      functionName: "withdrawStake",
      args: [id, amount],
      account,
      chain: this.walletClient.chain,
    });
  }

  async executeProposal(id: bigint): Promise<`0x${string}`> {
    if (!this.walletClient) throw new Error("WalletClient required for writes");
    const [account] = await this.walletClient.getAddresses();
    return this.walletClient.writeContract({
      address: this.contractAddress,
      abi: CONVICTION_VOTING_ABI,
      functionName: "executeProposal",
      args: [id],
      account,
      chain: this.walletClient.chain,
    });
  }

  async cancelProposal(id: bigint): Promise<`0x${string}`> {
    if (!this.walletClient) throw new Error("WalletClient required for writes");
    const [account] = await this.walletClient.getAddresses();
    return this.walletClient.writeContract({
      address: this.contractAddress,
      abi: CONVICTION_VOTING_ABI,
      functionName: "cancelProposal",
      args: [id],
      account,
      chain: this.walletClient.chain,
    });
  }

  async getCurrentConviction(id: bigint, voter: Address): Promise<bigint> {
    return this.publicClient.readContract({
      address: this.contractAddress,
      abi: CONVICTION_VOTING_ABI,
      functionName: "getCurrentConviction",
      args: [id, voter],
    });
  }

  async getProposal(id: bigint): Promise<IProposal> {
    const result = await this.publicClient.readContract({
      address: this.contractAddress,
      abi: CONVICTION_VOTING_ABI,
      functionName: "proposals",
      args: [id],
    });
    return {
      id: result[0],
      proposer: result[1],
      metadataCID: result[2],
      requestedAmount: result[3],
      beneficiary: result[4],
      convictionLast: result[5],
      blockLast: result[6],
      executed: result[7],
      cancelled: result[8],
      createdAt: result[9],
    };
  }

  async getTotalConviction(id: bigint): Promise<bigint> {
    return this.publicClient.readContract({
      address: this.contractAddress,
      abi: CONVICTION_VOTING_ABI,
      functionName: "totalConviction",
      args: [id],
    });
  }

  async getVoterState(id: bigint, voter: Address): Promise<IVoterState> {
    const result = await this.publicClient.readContract({
      address: this.contractAddress,
      abi: CONVICTION_VOTING_ABI,
      functionName: "voterStates",
      args: [id, voter],
    });
    return {
      amount: result[0],
      convictionLast: result[1],
      blockLast: result[2],
    };
  }

  async getFundBalance(): Promise<bigint> {
    return this.publicClient.readContract({
      address: this.contractAddress,
      abi: CONVICTION_VOTING_ABI,
      functionName: "fundBalance",
    });
  }

  async getProposalCount(): Promise<bigint> {
    return this.publicClient.readContract({
      address: this.contractAddress,
      abi: CONVICTION_VOTING_ABI,
      functionName: "proposalCount",
    });
  }
}
