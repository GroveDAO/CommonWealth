import type { PublicClient, WalletClient, Address } from "viem";
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

  async submit(proofCID: string, descCID: string, reward: bigint): Promise<`0x${string}`> {
    if (!this.walletClient) throw new Error("WalletClient required for writes");
    const [account] = await this.walletClient.getAddresses();
    return this.walletClient.writeContract({
      address: this.contractAddress,
      abi: IMPACT_ATTESTATION_ABI,
      functionName: "submit",
      args: [proofCID, descCID, reward],
      account,
      chain: this.walletClient.chain,
    });
  }

  async confirm(id: bigint): Promise<`0x${string}`> {
    if (!this.walletClient) throw new Error("WalletClient required for writes");
    const [account] = await this.walletClient.getAddresses();
    return this.walletClient.writeContract({
      address: this.contractAddress,
      abi: IMPACT_ATTESTATION_ABI,
      functionName: "confirm",
      args: [id],
      account,
      chain: this.walletClient.chain,
    });
  }

  async reject(id: bigint): Promise<`0x${string}`> {
    if (!this.walletClient) throw new Error("WalletClient required for writes");
    const [account] = await this.walletClient.getAddresses();
    return this.walletClient.writeContract({
      address: this.contractAddress,
      abi: IMPACT_ATTESTATION_ABI,
      functionName: "reject",
      args: [id],
      account,
      chain: this.walletClient.chain,
    });
  }

  async claim(id: bigint): Promise<`0x${string}`> {
    if (!this.walletClient) throw new Error("WalletClient required for writes");
    const [account] = await this.walletClient.getAddresses();
    return this.walletClient.writeContract({
      address: this.contractAddress,
      abi: IMPACT_ATTESTATION_ABI,
      functionName: "claim",
      args: [id],
      account,
      chain: this.walletClient.chain,
    });
  }

  async getAttestation(id: bigint): Promise<IAttestation> {
    const result = await this.publicClient.readContract({
      address: this.contractAddress,
      abi: IMPACT_ATTESTATION_ABI,
      functionName: "attestations",
      args: [id],
    });
    return {
      id: result[0],
      contributor: result[1],
      proofCID: result[2],
      descriptionCID: result[3],
      requestedReward: result[4],
      confirmations: result[5],
      rejections: result[6],
      rewarded: result[7],
      rejected: result[8],
      submittedAt: result[9],
    };
  }

  async getReputation(address: Address): Promise<bigint> {
    return this.publicClient.readContract({
      address: this.contractAddress,
      abi: IMPACT_ATTESTATION_ABI,
      functionName: "reputation",
      args: [address],
    });
  }

  async getTreasury(): Promise<bigint> {
    return this.publicClient.readContract({
      address: this.contractAddress,
      abi: IMPACT_ATTESTATION_ABI,
      functionName: "treasury",
    });
  }
}
