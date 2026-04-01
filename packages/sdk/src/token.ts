import type { Address, PublicClient, WalletClient } from "viem";
import { COMMONWEALTH_TOKEN_ABI } from "./abis.js";

export class CommonWealthTokenClient {
  private publicClient: PublicClient;
  private contractAddress: Address;
  private walletClient?: WalletClient;

  constructor(publicClient: PublicClient, contractAddress: Address, walletClient?: WalletClient) {
    this.publicClient = publicClient;
    this.contractAddress = contractAddress;
    this.walletClient = walletClient;
  }

  async approve(spender: Address, value: bigint): Promise<`0x${string}`> {
    if (!this.walletClient) throw new Error("WalletClient required for writes");
    const [account] = await this.walletClient.getAddresses();
    return this.walletClient.writeContract({
      address: this.contractAddress,
      abi: COMMONWEALTH_TOKEN_ABI,
      functionName: "approve",
      args: [spender, value],
      account,
      chain: this.walletClient.chain,
    });
  }

  async claimFaucet(): Promise<`0x${string}`> {
    if (!this.walletClient) throw new Error("WalletClient required for writes");
    const [account] = await this.walletClient.getAddresses();
    return this.walletClient.writeContract({
      address: this.contractAddress,
      abi: COMMONWEALTH_TOKEN_ABI,
      functionName: "claimFaucet",
      args: [],
      account,
      chain: this.walletClient.chain,
    });
  }

  async balanceOf(account: Address): Promise<bigint> {
    return this.publicClient.readContract({
      address: this.contractAddress,
      abi: COMMONWEALTH_TOKEN_ABI,
      functionName: "balanceOf",
      args: [account],
    });
  }

  async allowance(owner: Address, spender: Address): Promise<bigint> {
    return this.publicClient.readContract({
      address: this.contractAddress,
      abi: COMMONWEALTH_TOKEN_ABI,
      functionName: "allowance",
      args: [owner, spender],
    });
  }

  async faucetAmount(): Promise<bigint> {
    return this.publicClient.readContract({
      address: this.contractAddress,
      abi: COMMONWEALTH_TOKEN_ABI,
      functionName: "faucetAmount",
    });
  }

  async faucetCooldown(): Promise<bigint> {
    return this.publicClient.readContract({
      address: this.contractAddress,
      abi: COMMONWEALTH_TOKEN_ABI,
      functionName: "faucetCooldown",
    });
  }

  async lastClaimAt(account: Address): Promise<bigint> {
    return this.publicClient.readContract({
      address: this.contractAddress,
      abi: COMMONWEALTH_TOKEN_ABI,
      functionName: "lastClaimAt",
      args: [account],
    });
  }
}
