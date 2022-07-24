import { BigNumber } from "ethers";
import { DAO, PeoplesNFT, RandomNFTMarketplace } from "../../../typechain";
import { ExecutionFn } from "../types";

export class BuyNFTHelper {
  constructor(public readonly nftContractAddress: PeoplesNFT) {}

  public buy: ExecutionFn = ({
    nftId,
    maxValue,
    dao,
  }: {
    nftId: BigNumber;
    maxValue: BigNumber;
    dao: DAO;
  }) => {
    return {
      address: dao.address,
      value: BigNumber.from(0),
      calldata: dao.interface.encodeFunctionData("buyNft", [
        this.nftContractAddress.address,
        nftId,
        maxValue,
      ]),
    };
  };
}
