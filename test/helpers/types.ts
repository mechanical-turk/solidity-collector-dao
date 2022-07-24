import { BigNumber } from "ethers";

export enum VoteCast {
  NOT_VOTED_YET,
  VOTED_FOR,
  VOTED_AGAINST,
  VOTED_ABSTAIN,
}

export enum ProposalStatus {
  NON_EXISTENT,
  ONGOING_VOTING,
  REVOKED,
  FAILED,
  PASSED,
  EXECUTED,
}

export type ExecutionCommand = {
  address: string;
  value: BigNumber;
  calldata: string;
};

export type ExecutionFn = (params?: any) => ExecutionCommand;

export type ExecutionOnChain = [string[], BigNumber[], string[], BigNumber];
