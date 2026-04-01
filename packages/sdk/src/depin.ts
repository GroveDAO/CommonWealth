import type { Address, PublicClient, WalletClient } from "viem";
import { DEPIN_REGISTRY_ABI } from "./abis.js";
import type { DataType, IDataSubmission } from "./types.js";

export class DePINClient {
  private publicClient: PublicClient;
  private contractAddress: Address;
  private walletClient?: WalletClient;

  constructor(publicClient: PublicClient, contractAddress: Address, walletClient?: WalletClient) {
    this.publicClient = publicClient;
    this.contractAddress = contractAddress;
    this.walletClient = walletClient;
  }

  async submit(metadataURI: string, accessURI: string, dataType: DataType): Promise<`0x${string}`> {
    if (!this.walletClient) throw new Error("WalletClient required for writes");
    const [account] = await this.walletClient.getAddresses();
    return this.walletClient.writeContract({
      address: this.contractAddress,
      abi: DEPIN_REGISTRY_ABI,
      functionName: "submit",
      args: [metadataURI, accessURI, dataType],
      account,
      chain: this.walletClient.chain,
    });
  }

  async claim(submissionId: bigint): Promise<`0x${string}`> {
    if (!this.walletClient) throw new Error("WalletClient required for writes");
    const [account] = await this.walletClient.getAddresses();
    return this.walletClient.writeContract({
      address: this.contractAddress,
      abi: DEPIN_REGISTRY_ABI,
      functionName: "claim",
      args: [submissionId],
      account,
      chain: this.walletClient.chain,
    });
  }

  async verify(submissionId: bigint, quality: bigint): Promise<`0x${string}`> {
    if (!this.walletClient) throw new Error("WalletClient required for writes");
    const [account] = await this.walletClient.getAddresses();
    return this.walletClient.writeContract({
      address: this.contractAddress,
      abi: DEPIN_REGISTRY_ABI,
      functionName: "verify",
      args: [submissionId, quality],
      account,
      chain: this.walletClient.chain,
    });
  }

  async getSubmission(submissionId: bigint): Promise<IDataSubmission> {
    const result = await this.publicClient.readContract({
      address: this.contractAddress,
      abi: DEPIN_REGISTRY_ABI,
      functionName: "submissions",
      args: [submissionId],
    });

    return {
      id: result[0],
      contributor: result[1],
      metadataURI: result[2],
      accessURI: result[3],
      dataType: result[4] as DataType,
      reward: result[5],
      verified: result[6],
      claimed: result[7],
      submittedAt: result[8],
      quality: result[9],
    };
  }

  async getCount(): Promise<bigint> {
    return this.publicClient.readContract({
      address: this.contractAddress,
      abi: DEPIN_REGISTRY_ABI,
      functionName: "count",
    });
  }

  async getScore(account: Address): Promise<bigint> {
    return this.publicClient.readContract({
      address: this.contractAddress,
      abi: DEPIN_REGISTRY_ABI,
      functionName: "score",
      args: [account],
    });
  }

  async getTier(account: Address): Promise<string> {
    return this.publicClient.readContract({
      address: this.contractAddress,
      abi: DEPIN_REGISTRY_ABI,
      functionName: "tier",
      args: [account],
    });
  }
}
