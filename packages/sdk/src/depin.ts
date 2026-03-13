import type { PublicClient, WalletClient, Address } from "viem";
import { DEPIN_REGISTRY_ABI } from "./abis.js";
import type { IDataSubmission, DataType } from "./types.js";

export class DePINClient {
  private publicClient: PublicClient;
  private contractAddress: Address;
  private walletClient?: WalletClient;

  constructor(publicClient: PublicClient, contractAddress: Address, walletClient?: WalletClient) {
    this.publicClient = publicClient;
    this.contractAddress = contractAddress;
    this.walletClient = walletClient;
  }

  async submit(dataCID: string, litCID: string, type: DataType): Promise<`0x${string}`> {
    if (!this.walletClient) throw new Error("WalletClient required for writes");
    const [account] = await this.walletClient.getAddresses();
    return this.walletClient.writeContract({
      address: this.contractAddress,
      abi: DEPIN_REGISTRY_ABI,
      functionName: "submit",
      args: [dataCID, litCID, type],
      account,
      chain: this.walletClient.chain,
    });
  }

  async claim(id: bigint): Promise<`0x${string}`> {
    if (!this.walletClient) throw new Error("WalletClient required for writes");
    const [account] = await this.walletClient.getAddresses();
    return this.walletClient.writeContract({
      address: this.contractAddress,
      abi: DEPIN_REGISTRY_ABI,
      functionName: "claim",
      args: [id],
      account,
      chain: this.walletClient.chain,
    });
  }

  async getSubmission(id: bigint): Promise<IDataSubmission> {
    const result = await this.publicClient.readContract({
      address: this.contractAddress,
      abi: DEPIN_REGISTRY_ABI,
      functionName: "subs",
      args: [id],
    });
    return {
      id: result[0],
      contributor: result[1],
      dataCID: result[2],
      litCID: result[3],
      dtype: result[4] as DataType,
      reward: result[5],
      verified: result[6],
      claimed: result[7],
      submittedAt: result[8],
      quality: result[9],
    };
  }

  async getContributorTier(address: Address): Promise<string> {
    return this.publicClient.readContract({
      address: this.contractAddress,
      abi: DEPIN_REGISTRY_ABI,
      functionName: "tier",
      args: [address],
    });
  }

  async getScore(address: Address): Promise<bigint> {
    return this.publicClient.readContract({
      address: this.contractAddress,
      abi: DEPIN_REGISTRY_ABI,
      functionName: "score",
      args: [address],
    });
  }

  async getCount(): Promise<bigint> {
    return this.publicClient.readContract({
      address: this.contractAddress,
      abi: DEPIN_REGISTRY_ABI,
      functionName: "count",
    });
  }
}
