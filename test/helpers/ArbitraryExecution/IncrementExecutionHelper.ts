import { BigNumber } from "ethers";
import { Increment } from "../../../typechain";
import { ExecutionFn } from "../types";

export class IncrementExecutionHelper {
  constructor(public contract: Increment) {}

  public increment: ExecutionFn = () => {
    return {
      address: this.contract.address,
      value: BigNumber.from(0),
      calldata: this.contract.interface.encodeFunctionData("increment"),
    };
  };

  public incrementBy: ExecutionFn = (by: number) => {
    return {
      address: this.contract.address,
      value: BigNumber.from(0),
      calldata: this.contract.interface.encodeFunctionData("incrementBy", [
        BigNumber.from(by),
      ]),
    };
  };

  public getNum = (params: { by: BigNumber }) => {
    return {
      address: this.contract.address,
      value: BigNumber.from(0),
      calldata: this.contract.interface.encodeFunctionData("incrementBy", [
        params.by,
      ]),
    };
  };
}
