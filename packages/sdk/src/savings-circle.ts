import type { PublicClient, WalletClient, Address } from "viem";
import { SAVINGS_CIRCLE_ABI } from "./abis.js";
import type { ICircle, CircleState } from "./types.js";

export class SavingsCircleClient {
  private publicClient: PublicClient;
  private contractAddress: Address;
  private walletClient?: WalletClient;

  constructor(publicClient: PublicClient, contractAddress: Address, walletClient?: WalletClient) {
    this.publicClient = publicClient;
    this.contractAddress = contractAddress;
    this.walletClient = walletClient;
  }

  async create(
    name: string,
    contrib: bigint,
    duration: bigint,
    max: bigint,
    token: Address,
  ): Promise<`0x${string}`> {
    if (!this.walletClient) throw new Error("WalletClient required for writes");
    const [account] = await this.walletClient.getAddresses();
    return this.walletClient.writeContract({
      address: this.contractAddress,
      abi: SAVINGS_CIRCLE_ABI,
      functionName: "create",
      args: [name, contrib, duration, max, token],
      account,
      chain: this.walletClient.chain,
    });
  }

  async join(id: bigint): Promise<`0x${string}`> {
    if (!this.walletClient) throw new Error("WalletClient required for writes");
    const [account] = await this.walletClient.getAddresses();
    return this.walletClient.writeContract({
      address: this.contractAddress,
      abi: SAVINGS_CIRCLE_ABI,
      functionName: "join",
      args: [id],
      account,
      chain: this.walletClient.chain,
    });
  }

  async start(id: bigint): Promise<`0x${string}`> {
    if (!this.walletClient) throw new Error("WalletClient required for writes");
    const [account] = await this.walletClient.getAddresses();
    return this.walletClient.writeContract({
      address: this.contractAddress,
      abi: SAVINGS_CIRCLE_ABI,
      functionName: "start",
      args: [id],
      account,
      chain: this.walletClient.chain,
    });
  }

  async contribute(id: bigint): Promise<`0x${string}`> {
    if (!this.walletClient) throw new Error("WalletClient required for writes");
    const [account] = await this.walletClient.getAddresses();
    return this.walletClient.writeContract({
      address: this.contractAddress,
      abi: SAVINGS_CIRCLE_ABI,
      functionName: "contribute",
      args: [id],
      account,
      chain: this.walletClient.chain,
    });
  }

  async getCircle(id: bigint): Promise<ICircle> {
    const result = await this.publicClient.readContract({
      address: this.contractAddress,
      abi: SAVINGS_CIRCLE_ABI,
      functionName: "circles",
      args: [id],
    });
    return {
      id: result[0],
      creator: result[1],
      name: result[2],
      contribution: result[3],
      cycleDuration: result[4],
      maxMembers: result[5],
      token: result[6],
      state: result[7] as CircleState,
      cycle: result[8],
      cycleStart: result[9],
    };
  }

  async getMembers(id: bigint): Promise<readonly Address[]> {
    return this.publicClient.readContract({
      address: this.contractAddress,
      abi: SAVINGS_CIRCLE_ABI,
      functionName: "members",
      args: [id],
    });
  }

  async getOrder(id: bigint): Promise<readonly Address[]> {
    return this.publicClient.readContract({
      address: this.contractAddress,
      abi: SAVINGS_CIRCLE_ABI,
      functionName: "order",
      args: [id],
    });
  }

  async getCount(): Promise<bigint> {
    return this.publicClient.readContract({
      address: this.contractAddress,
      abi: SAVINGS_CIRCLE_ABI,
      functionName: "count",
    });
  }
}
