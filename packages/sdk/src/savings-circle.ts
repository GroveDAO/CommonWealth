import type { Address, PublicClient, WalletClient } from "viem";
import { SAVINGS_CIRCLE_ABI } from "./abis.js";
import type { CircleState, ICircle } from "./types.js";

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
    contribution: bigint,
    duration: bigint,
    maxMembers: bigint,
    token: Address,
  ): Promise<`0x${string}`> {
    if (!this.walletClient) throw new Error("WalletClient required for writes");
    const [account] = await this.walletClient.getAddresses();
    return this.walletClient.writeContract({
      address: this.contractAddress,
      abi: SAVINGS_CIRCLE_ABI,
      functionName: "create",
      args: [name, contribution, duration, maxMembers, token],
      account,
      chain: this.walletClient.chain,
    });
  }

  async join(circleId: bigint): Promise<`0x${string}`> {
    if (!this.walletClient) throw new Error("WalletClient required for writes");
    const [account] = await this.walletClient.getAddresses();
    return this.walletClient.writeContract({
      address: this.contractAddress,
      abi: SAVINGS_CIRCLE_ABI,
      functionName: "join",
      args: [circleId],
      account,
      chain: this.walletClient.chain,
    });
  }

  async start(circleId: bigint): Promise<`0x${string}`> {
    if (!this.walletClient) throw new Error("WalletClient required for writes");
    const [account] = await this.walletClient.getAddresses();
    return this.walletClient.writeContract({
      address: this.contractAddress,
      abi: SAVINGS_CIRCLE_ABI,
      functionName: "start",
      args: [circleId],
      account,
      chain: this.walletClient.chain,
    });
  }

  async contribute(circleId: bigint): Promise<`0x${string}`> {
    if (!this.walletClient) throw new Error("WalletClient required for writes");
    const [account] = await this.walletClient.getAddresses();
    return this.walletClient.writeContract({
      address: this.contractAddress,
      abi: SAVINGS_CIRCLE_ABI,
      functionName: "contribute",
      args: [circleId],
      account,
      chain: this.walletClient.chain,
    });
  }

  async getCircle(circleId: bigint): Promise<ICircle> {
    const result = await this.publicClient.readContract({
      address: this.contractAddress,
      abi: SAVINGS_CIRCLE_ABI,
      functionName: "circles",
      args: [circleId],
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

  async getCount(): Promise<bigint> {
    return this.publicClient.readContract({
      address: this.contractAddress,
      abi: SAVINGS_CIRCLE_ABI,
      functionName: "count",
    });
  }

  async getMemberCount(circleId: bigint): Promise<bigint> {
    return this.publicClient.readContract({
      address: this.contractAddress,
      abi: SAVINGS_CIRCLE_ABI,
      functionName: "memberCount",
      args: [circleId],
    });
  }

  async getMembers(circleId: bigint): Promise<readonly Address[]> {
    return this.publicClient.readContract({
      address: this.contractAddress,
      abi: SAVINGS_CIRCLE_ABI,
      functionName: "members",
      args: [circleId],
    });
  }

  async getOrder(circleId: bigint): Promise<readonly Address[]> {
    return this.publicClient.readContract({
      address: this.contractAddress,
      abi: SAVINGS_CIRCLE_ABI,
      functionName: "order",
      args: [circleId],
    });
  }

  async getCurrentRecipient(circleId: bigint): Promise<Address> {
    return this.publicClient.readContract({
      address: this.contractAddress,
      abi: SAVINGS_CIRCLE_ABI,
      functionName: "currentRecipient",
      args: [circleId],
    });
  }

  async hasPaid(circleId: bigint, cycle: bigint, account: Address): Promise<boolean> {
    return this.publicClient.readContract({
      address: this.contractAddress,
      abi: SAVINGS_CIRCLE_ABI,
      functionName: "hasPaid",
      args: [circleId, cycle, account],
    });
  }
}
