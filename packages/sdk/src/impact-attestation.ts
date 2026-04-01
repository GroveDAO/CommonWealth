import type { Address, PublicClient, WalletClient } from "viem";
import { IMPACT_ATTESTATION_ABI } from "./abis.js";
import type { IAttestation } from "./types.js";

export class ImpactAttestationClient {
  private publicClient: PublicClient;
  private contractAddress: Address;
  private walletClient?: WalletClient;

  constructor(publicClient: PublicClient, contractAddress: Address, walletClient?: WalletClient) {
    this.publicClient = publicClient;
    this.contractAddress = contractAddress;
    this.walletClient = walletClient;
  }

  async submit(proofURI: string, descriptionURI: string, reward: bigint): Promise<`0x${string}`> {
    if (!this.walletClient) throw new Error("WalletClient required for writes");
    const [account] = await this.walletClient.getAddresses();
    return this.walletClient.writeContract({
      address: this.contractAddress,
      abi: IMPACT_ATTESTATION_ABI,
      functionName: "submit",
      args: [proofURI, descriptionURI, reward],
      account,
      chain: this.walletClient.chain,
    });
  }

  async confirm(attestationId: bigint): Promise<`0x${string}`> {
    if (!this.walletClient) throw new Error("WalletClient required for writes");
    const [account] = await this.walletClient.getAddresses();
    return this.walletClient.writeContract({
      address: this.contractAddress,
      abi: IMPACT_ATTESTATION_ABI,
      functionName: "confirm",
      args: [attestationId],
      account,
      chain: this.walletClient.chain,
    });
  }

  async reject(attestationId: bigint): Promise<`0x${string}`> {
    if (!this.walletClient) throw new Error("WalletClient required for writes");
    const [account] = await this.walletClient.getAddresses();
    return this.walletClient.writeContract({
      address: this.contractAddress,
      abi: IMPACT_ATTESTATION_ABI,
      functionName: "reject",
      args: [attestationId],
      account,
      chain: this.walletClient.chain,
    });
  }

  async claim(attestationId: bigint): Promise<`0x${string}`> {
    if (!this.walletClient) throw new Error("WalletClient required for writes");
    const [account] = await this.walletClient.getAddresses();
    return this.walletClient.writeContract({
      address: this.contractAddress,
      abi: IMPACT_ATTESTATION_ABI,
      functionName: "claim",
      args: [attestationId],
      account,
      chain: this.walletClient.chain,
    });
  }

  async getAttestation(attestationId: bigint): Promise<IAttestation> {
    const result = await this.publicClient.readContract({
      address: this.contractAddress,
      abi: IMPACT_ATTESTATION_ABI,
      functionName: "attestations",
      args: [attestationId],
    });

    return {
      id: result[0],
      contributor: result[1],
      proofURI: result[2],
      descriptionURI: result[3],
      requestedReward: result[4],
      confirmations: result[5],
      rejections: result[6],
      rewarded: result[7],
      rejected: result[8],
      submittedAt: result[9],
    };
  }

  async getCount(): Promise<bigint> {
    return this.publicClient.readContract({
      address: this.contractAddress,
      abi: IMPACT_ATTESTATION_ABI,
      functionName: "count",
    });
  }

  async getApprovalThreshold(): Promise<bigint> {
    return this.publicClient.readContract({
      address: this.contractAddress,
      abi: IMPACT_ATTESTATION_ABI,
      functionName: "approvalThreshold",
    });
  }

  async getReviewWindow(): Promise<bigint> {
    return this.publicClient.readContract({
      address: this.contractAddress,
      abi: IMPACT_ATTESTATION_ABI,
      functionName: "reviewWindow",
    });
  }

  async getTreasury(): Promise<bigint> {
    return this.publicClient.readContract({
      address: this.contractAddress,
      abi: IMPACT_ATTESTATION_ABI,
      functionName: "treasury",
    });
  }

  async hasVoted(attestationId: bigint, account: Address): Promise<boolean> {
    return this.publicClient.readContract({
      address: this.contractAddress,
      abi: IMPACT_ATTESTATION_ABI,
      functionName: "hasVoted",
      args: [attestationId, account],
    });
  }

  async getReputation(account: Address): Promise<bigint> {
    return this.publicClient.readContract({
      address: this.contractAddress,
      abi: IMPACT_ATTESTATION_ABI,
      functionName: "reputation",
      args: [account],
    });
  }
}
