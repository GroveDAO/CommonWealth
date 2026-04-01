export enum CircleState {
  Open = 0,
  Active = 1,
  Completed = 2,
}

export enum DataType {
  Environmental = 0,
  Infrastructure = 1,
  Compute = 2,
  Storage = 3,
  Bandwidth = 4,
}

export interface IProposal {
  id: bigint;
  proposer: `0x${string}`;
  metadataURI: string;
  requestedAmount: bigint;
  beneficiary: `0x${string}`;
  conviction: bigint;
  totalStaked: bigint;
  lastUpdatedBlock: bigint;
  executed: boolean;
  cancelled: boolean;
  createdAt: bigint;
}

export interface IAttestation {
  id: bigint;
  contributor: `0x${string}`;
  proofURI: string;
  descriptionURI: string;
  requestedReward: bigint;
  confirmations: bigint;
  rejections: bigint;
  rewarded: boolean;
  rejected: boolean;
  submittedAt: bigint;
}

export interface ICircle {
  id: bigint;
  creator: `0x${string}`;
  name: string;
  contribution: bigint;
  cycleDuration: bigint;
  maxMembers: bigint;
  token: `0x${string}`;
  state: CircleState;
  cycle: bigint;
  cycleStart: bigint;
}

export interface IDataSubmission {
  id: bigint;
  contributor: `0x${string}`;
  metadataURI: string;
  accessURI: string;
  dataType: DataType;
  reward: bigint;
  verified: boolean;
  claimed: boolean;
  submittedAt: bigint;
  quality: bigint;
}

export interface IPrivateProposal {
  id: bigint;
  publicProposalId: bigint;
  proposer: `0x${string}`;
  metadataURI: string;
  ballotCount: bigint;
  latestSupport: bigint;
  latestOpposition: bigint;
  latestTallyAt: bigint;
  createdAt: bigint;
}
