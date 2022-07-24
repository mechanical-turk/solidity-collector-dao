import { BigNumber } from "ethers";
import { DAO } from "../../../typechain";
import { type Helper } from "../Helper";

export class ExecutionBuilder {
  constructor(public readonly helper: Helper) {}

  incrementTo7in3Steps(disambiguator: BigNumber = BigNumber.from(0)) {
    return this.helper.toExecutionOnChain(
      [
        this.helper.executionHelpers.increment.increment(),
        this.helper.executionHelpers.increment.increment(),
        this.helper.executionHelpers.increment.incrementBy(5),
      ],
      disambiguator
    );
  }

  buyNft(
    params: {
      nftId: BigNumber;
      maxValue: BigNumber;
      dao: DAO;
    },
    disambiguator: BigNumber = BigNumber.from(0)
  ) {
    return this.helper.toExecutionOnChain(
      [this.helper.executionHelpers.buyNFT.buy(params)],
      disambiguator
    );
  }
}
