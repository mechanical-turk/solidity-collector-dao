import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { BigNumber } from "ethers";
import { splitSignature } from "ethers/lib/utils";
import { network, ethers } from "hardhat";
import {
  PeoplesNFT,
  RandomNFTMarketplace,
  Increment,
  DAO,
} from "../../typechain";
import { IncrementExecutionHelper } from "./ArbitraryExecution/IncrementExecutionHelper";
import { DEFAULT_DAO_NAME, DEFAULT_DAO_VERSION } from "./consts";

import { VoteCast, ExecutionCommand, ExecutionOnChain } from "./types";
import { config } from "../../hardhat.config";
import { BuyNFTHelper } from "./ArbitraryExecution/BuyNFTHelper";

export class Helper {
  public executionHelpers: {
    increment: IncrementExecutionHelper;
    buyNFT: BuyNFTHelper;
  };

  private constructor(
    public readonly signers: {
      alice: SignerWithAddress;
      bob: SignerWithAddress;
      charlie: SignerWithAddress;
      dan: SignerWithAddress;
      others: SignerWithAddress[];
    },
    public readonly nftContracts: {
      one: PeoplesNFT;
      two: PeoplesNFT;
      three: PeoplesNFT;
    },
    public readonly marketplaceContract: RandomNFTMarketplace,
    public readonly arbitraryExecutionContracts: {
      increment: Increment;
    }
  ) {
    this.executionHelpers = {
      increment: new IncrementExecutionHelper(
        arbitraryExecutionContracts.increment
      ),
      buyNFT: new BuyNFTHelper(nftContracts.one),
    };
  }

  static async init(): Promise<Helper> {
    const [, alice, bob, charlie, dan, ...others] = await ethers.getSigners();
    const nftContracts = await Helper.deployNFTContracts();
    const marketplaceContract = await Helper.deployMarketplaceContract();
    const arbitraryExecutionContracts =
      await Helper.deployArbitraryExecutionContracts();
    return new Helper(
      {
        alice,
        bob,
        charlie,
        dan,
        others,
      },
      nftContracts,
      marketplaceContract,
      arbitraryExecutionContracts
    );
  }

  static async deployMarketplaceContract() {
    const randomNFTMarketplaceFactory = await ethers.getContractFactory(
      "RandomNFTMarketplace"
    );
    return randomNFTMarketplaceFactory.deploy();
  }

  static async deployNFTContracts() {
    const peoplesNFTFactory = await ethers.getContractFactory("PeoplesNFT");
    const [one, two, three] = await Promise.all([
      peoplesNFTFactory.deploy("Peoples NFT 1", "PT1"),
      peoplesNFTFactory.deploy("Peoples NFT 2", "PT2"),
      peoplesNFTFactory.deploy("Peoples NFT 3", "PT3"),
    ]);
    return { one, two, three };
  }

  static async deployArbitraryExecutionContracts() {
    const incrementFactory = await ethers.getContractFactory("Increment");
    const increment = await incrementFactory.deploy();
    return {
      increment,
    };
  }

  async deploy(
    name: string = DEFAULT_DAO_NAME,
    version: string = DEFAULT_DAO_VERSION,
    deployer: SignerWithAddress = this.signers.alice,
    nftMarketplace: RandomNFTMarketplace = this.marketplaceContract
  ) {
    const contractFactory = await ethers.getContractFactory("DAO");
    return contractFactory
      .connect(deployer)
      .deploy(name, version, nftMarketplace.address);
  }

  async buyMemberships(params: { dao: DAO; signers: SignerWithAddress[] }) {
    const promises = params.signers.map((signer) => {
      return params.dao.connect(signer).buyMembership({
        value: ethers.utils.parseEther("1"),
      });
    });
    await Promise.all(promises);
  }

  async signVote({
    dao,
    signer,
    proposalId,
    vote,
    daoName,
    daoVersion,
  }: {
    dao: DAO;
    signer: SignerWithAddress;
    proposalId: BigNumber;
    vote: VoteCast;
    daoName?: string;
    daoVersion?: string;
  }) {
    const signed = await signer._signTypedData(
      {
        name: daoName || DEFAULT_DAO_NAME,
        verifyingContract: dao.address,
        version: daoVersion || DEFAULT_DAO_VERSION,
        chainId: config.networks?.hardhat?.chainId,
      },
      {
        Ballot: [
          { name: "proposalId", type: "uint256" },
          { name: "vote", type: "uint8" },
        ],
      },
      {
        proposalId,
        vote,
      }
    );
    const vrs = splitSignature(signed);
    return {
      proposalId,
      vote,
      v: vrs.v,
      r: vrs.r,
      s: vrs.s,
    };
  }

  async mintAndListNFT(
    minter: SignerWithAddress,
    nftContract: PeoplesNFT,
    listingFor: BigNumber
  ) {
    await nftContract.connect(minter).mint(minter.address);
    const tokenId = await nftContract.connect(minter).lastTokenId();
    await nftContract
      .connect(minter)
      .approve(this.marketplaceContract.address, tokenId);
    await this.marketplaceContract
      .connect(minter)
      .list(nftContract.address, tokenId, listingFor);
    return tokenId;
  }

  // Bump the timestamp by a specific amount of seconds
  async timeTravel(seconds: number) {
    await network.provider.send("evm_increaseTime", [seconds]);
    await network.provider.send("evm_mine");
  }

  toExecutionOnChain = (
    input: ExecutionCommand[],
    disambiguator: BigNumber
  ): ExecutionOnChain => {
    return [
      input.map(({ address }) => address),
      input.map(({ value }) => value),
      input.map(({ calldata }) => calldata),
      disambiguator,
    ];
  };
}
