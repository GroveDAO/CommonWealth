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
  metadataCID: string;
  requestedAmount: bigint;
  beneficiary: `0x${string}`;
  convictionLast: bigint;
  blockLast: bigint;
  executed: boolean;
  cancelled: boolean;
  createdAt: bigint;
}

export interface IVoterState {
  amount: bigint;
  convictionLast: bigint;
  blockLast: bigint;
}

export interface IAttestation {
  id: bigint;
  contributor: `0x${string}`;
  proofCID: string;
  descriptionCID: string;
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
  dataCID: string;
  litCID: string;
  dtype: DataType;
  reward: bigint;
  verified: boolean;
  claimed: boolean;
  submittedAt: bigint;
  quality: bigint;
}
