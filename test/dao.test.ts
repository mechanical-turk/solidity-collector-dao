import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { expect } from "chai";
import { DAO } from "../typechain";
import { BigNumber } from "ethers";
import { SECONDS_IN_DAY } from "./helpers/consts";
import { Helper } from "./helpers/Helper";
import { ProposalStatus, ExecutionOnChain, VoteCast } from "./helpers/types";
import { ExecutionBuilder } from "./helpers/ArbitraryExecution/ExecutionBuilder";
import { ethers } from "hardhat";

describe("DAO", () => {
  let helper: Helper;
  let executionBuilder: ExecutionBuilder;
  let alice: SignerWithAddress;
  let bob: SignerWithAddress;
  let charlie: SignerWithAddress;
  let dan: SignerWithAddress;
  let others: SignerWithAddress[];

  beforeEach(async () => {
    helper = await Helper.init();
    executionBuilder = new ExecutionBuilder(helper);
    alice = helper.signers.alice;
    bob = helper.signers.bob;
    charlie = helper.signers.charlie;
    dan = helper.signers.dan;
    others = helper.signers.others;
  });

  describe("Deploying", () => {
    let dao: DAO;

    beforeEach(async () => {
      dao = await helper.deploy();
    });

    it("should successfully deploy", async () => {
      expect(dao.address).to.be.a("string");
    });
  });

  // TODO: write a test suite just for proposalStatus

  describe("Proposing", () => {
    let dao: DAO;
    let members: SignerWithAddress[];
    let nonMembers: SignerWithAddress[];

    beforeEach(async () => {
      dao = await helper.deploy();
      members = [alice, bob, charlie];
      nonMembers = [dan, ...others];
      await helper.buyMemberships({
        dao,
        signers: members,
      });
    });

    describe("success cases", async () => {
      it("should let a member propose", async () => {
        const execution = executionBuilder.incrementTo7in3Steps();
        const proposalId = await dao.connect(alice).getProposalId(...execution);
        const beforePropose = await dao.getProposalStatus(proposalId);
        expect(beforePropose).to.equal(ProposalStatus.NON_EXISTENT);
        await dao.connect(alice).propose(...execution);

        const afterPropose = await dao.getProposalStatus(proposalId);
        expect(afterPropose).to.equal(ProposalStatus.ONGOING_VOTING);
      });
    });

    describe("failure cases", async () => {
      it("should fail if the proposed execution is not proper", async () => {
        const execution = helper.toExecutionOnChain([], BigNumber.from("0"));
        await expect(dao.connect(alice).propose(...execution)).to.be.reverted;
      });

      it("should fail if proposed by a non-member", async () => {
        const execution = executionBuilder.incrementTo7in3Steps();
        const proposalId = await dao.connect(alice).getProposalId(...execution);
        const beforePropose = await dao.getProposalStatus(proposalId);
        expect(beforePropose).to.equal(ProposalStatus.NON_EXISTENT);
        for (const signer of nonMembers.slice(0, 3)) {
          await expect(dao.connect(signer).propose(...execution)).to.be
            .reverted;
          const afterPropose = await dao.getProposalStatus(proposalId);
          expect(afterPropose).to.equal(ProposalStatus.NON_EXISTENT);
        }
      });

      it("should fail if already proposed", async () => {
        const execution = executionBuilder.incrementTo7in3Steps();
        const proposalId = await dao.connect(alice).getProposalId(...execution);
        const beforePropose = await dao.getProposalStatus(proposalId);
        expect(beforePropose).to.equal(ProposalStatus.NON_EXISTENT);
        await dao.connect(alice).propose(...execution);
        const afterPropose = await dao.getProposalStatus(proposalId);
        expect(afterPropose).to.equal(ProposalStatus.ONGOING_VOTING);
        await expect(dao.connect(bob).propose(...execution)).to.be.reverted;
      });
    });
  });

  describe("Revoking a proposal", () => {
    let dao: DAO;
    let members: SignerWithAddress[];
    let proposalId: BigNumber;
    let execution: ExecutionOnChain;

    beforeEach(async () => {
      dao = await helper.deploy();
      members = [alice, bob, charlie];
      await helper.buyMemberships({
        dao,
        signers: members,
      });
      execution = executionBuilder.incrementTo7in3Steps();
      await dao.connect(alice).propose(...execution);
      proposalId = await dao.getProposalId(...execution);
    });

    it("should let a member revoke their ongoing voting proposal", async () => {
      const statusBeforeRevoke = await dao.getProposalStatus(proposalId);
      expect(statusBeforeRevoke).to.equal(ProposalStatus.ONGOING_VOTING);
      await dao.connect(alice).revokeProposal(proposalId);
      const statusAfterRevoke = await dao.getProposalStatus(proposalId);
      expect(statusAfterRevoke).to.equal(ProposalStatus.REVOKED);
    });

    it("should not allow anyone other than the original proposal to revoke a proposal", async () => {
      const statusBeforeRevoke = await dao.getProposalStatus(proposalId);
      expect(statusBeforeRevoke).to.equal(ProposalStatus.ONGOING_VOTING);
      await expect(dao.connect(bob).revokeProposal(proposalId)).to.be.reverted;
      const statusAfterRevoke = await dao.getProposalStatus(proposalId);
      expect(statusAfterRevoke).to.equal(ProposalStatus.ONGOING_VOTING);
    });

    it("should not allow revoke unless ongoing", async () => {
      for (const member of members) {
        await dao.connect(member).castVote(proposalId, VoteCast.VOTED_FOR);
      }
      await helper.timeTravel(SECONDS_IN_DAY * 6);
      await expect(dao.connect(alice).revokeProposal(proposalId)).to.be
        .reverted;
    });
  });

  // TODO: test win conditions!

  // TODO: test things such as having multiple active proposals
  // TODO: test things such as having multiple executions!

  describe("Executing", () => {
    let dao: DAO;
    let members: SignerWithAddress[];
    let proposalId: BigNumber;
    let execution: ExecutionOnChain;

    beforeEach(async () => {
      dao = await helper.deploy();
      members = [alice, bob, charlie];
      await helper.buyMemberships({
        dao,
        signers: members,
      });
      execution = executionBuilder.incrementTo7in3Steps();
      await dao.connect(alice).propose(...execution);
      proposalId = await dao.getProposalId(...execution);
    });

    describe("success cases", () => {
      beforeEach(async () => {
        for (const member of members) {
          await dao.connect(member).castVote(proposalId, VoteCast.VOTED_FOR);
        }
        await helper.timeTravel(SECONDS_IN_DAY * 6);
      });

      // TODO: write a test to block running twice

      // TODO: write a test for re-running failed proposals

      // TODO: write a test for all-or-nothing calls

      // TODO: write a test for combining multiple contract addresses inside execution

      // TODO: write a test for executions that take too long

      it("should allow an eligible voter to run a successful proposal", async () => {
        const numBefore =
          await helper.arbitraryExecutionContracts.increment.num();
        expect(numBefore).to.equal(0);
        await dao.connect(alice).execute(...execution);
        const numAfter =
          await helper.arbitraryExecutionContracts.increment.num();
        expect(numAfter).to.equal(7);
      });

      it("should not allow a non eligible voter to run a successful proposal", async () => {
        const numBefore =
          await helper.arbitraryExecutionContracts.increment.num();
        expect(numBefore).to.equal(0);
        const newMember = others[5];
        await dao.connect(newMember).buyMembership({
          value: ethers.utils.parseEther("1"),
        });
        await expect(dao.connect(newMember).execute(...execution)).to.be
          .reverted;
        const numAfter =
          await helper.arbitraryExecutionContracts.increment.num();
        expect(numAfter).to.equal(0);
      });
    });

    describe("failure cases", () => {
      it("should not run a non-passed proposal", async () => {
        await expect(dao.connect(dan).execute(...execution)).to.be.reverted;
      });
    });
  });

  describe("Casting a vote", () => {
    let dao: DAO;
    let members: SignerWithAddress[];
    let proposalId: BigNumber;
    let execution: ExecutionOnChain;

    beforeEach(async () => {
      dao = await helper.deploy();
      members = [alice, bob, charlie];
      await helper.buyMemberships({
        dao,
        signers: members,
      });
      execution = executionBuilder.incrementTo7in3Steps();
      await dao.connect(alice).propose(...execution);
      proposalId = await dao.getProposalId(...execution);
    });

    it("should fail if you're not a member", async () => {
      await expect(dao.connect(dan).castVote(proposalId, VoteCast.VOTED_FOR)).to
        .be.reverted;
    });

    it("should fail if you became a member after proposal date", async () => {
      const newMember = others[4];
      await dao
        .connect(newMember)
        .buyMembership({ value: ethers.utils.parseEther("1") });
      await expect(
        dao.connect(newMember).castVote(proposalId, VoteCast.VOTED_FOR)
      ).to.be.reverted;
    });

    it("should succeed if you were a member at proposal date", async () => {
      const newMember = others[4];
      await dao
        .connect(newMember)
        .buyMembership({ value: ethers.utils.parseEther("1") });
      await expect(
        dao.connect(newMember).castVote(proposalId, VoteCast.VOTED_FOR)
      ).to.be.reverted;
    });
  });

  describe("Casting a vote by signature", () => {
    let dao: DAO;
    let members: SignerWithAddress[];
    let nonMembers: SignerWithAddress[];
    let proposalId: BigNumber;
    let execution: ExecutionOnChain;

    beforeEach(async () => {
      dao = await helper.deploy();
      members = [alice, bob, charlie];
      nonMembers = [dan, ...others];
      await helper.buyMemberships({
        dao,
        signers: members,
      });
      execution = executionBuilder.incrementTo7in3Steps();
      await dao.connect(alice).propose(...execution);
      proposalId = await dao.getProposalId(...execution);
    });

    describe("success cases", () => {
      it("should allow an independent trx signer to submit an independent voter's vote", async () => {
        for (let i = 0; i < members.length; i++) {
          const signer = members[i];
          const numForVotesBefore = await dao.tally(
            proposalId,
            VoteCast.VOTED_FOR
          );
          const { v, r, s } = await helper.signVote({
            dao,
            proposalId,
            signer,
            vote: VoteCast.VOTED_FOR,
          });
          await dao
            .connect(others[0])
            .castVoteFromSignature(proposalId, VoteCast.VOTED_FOR, v, r, s);
          const numForVotesAfter = await dao.tally(
            proposalId,
            VoteCast.VOTED_FOR
          );
          expect(numForVotesBefore.add(1)).to.equal(numForVotesAfter);
        }
      });
    });

    describe("failure cases", () => {
      it("should fail unless v r s actually come from a member", async () => {
        for (let i = 0; i < nonMembers.slice(0, 3).length; i++) {
          const signer = nonMembers[i];
          const { v, r, s } = await helper.signVote({
            dao,
            proposalId,
            signer,
            vote: VoteCast.VOTED_FOR,
          });
          await expect(
            dao
              .connect(others[4])
              .castVoteFromSignature(proposalId, VoteCast.VOTED_FOR, v, r, s)
          ).to.be.reverted;
        }
      });
    });
  });

  describe("Batch-casting votes by signatures", () => {
    let dao: DAO;
    let members: SignerWithAddress[];
    let proposalId: BigNumber;
    let execution: ExecutionOnChain;

    beforeEach(async () => {
      dao = await helper.deploy();
      members = [alice, bob, charlie];
      await helper.buyMemberships({
        dao,
        signers: members,
      });
      execution = executionBuilder.incrementTo7in3Steps();
      await dao.connect(alice).propose(...execution);
      proposalId = await dao.getProposalId(...execution);
    });

    describe("success cases", () => {
      it("should allow an independent trx signer to submit many independent voters's votes", async () => {
        const promises = members.map((signer) => {
          return helper.signVote({
            dao,
            proposalId,
            signer,
            vote: VoteCast.VOTED_FOR,
          });
        });
        const signatures = await Promise.all(promises);
        const proposalIds = signatures.map(({ proposalId }) => proposalId);
        const votes = signatures.map(({ vote }) => vote);
        const vs = signatures.map(({ v }) => v);
        const rs = signatures.map(({ r }) => r);
        const ss = signatures.map(({ s }) => s);

        const numForVotesBefore = await dao.tally(
          proposalId,
          VoteCast.VOTED_FOR
        );

        await dao
          .connect(others[0])
          .batchCastVotesFromSignatures(proposalIds, votes, vs, rs, ss);

        const numForVotesAfter = await dao.tally(
          proposalId,
          VoteCast.VOTED_FOR
        );

        expect(numForVotesBefore.add(members.length)).to.equal(
          numForVotesAfter
        );
      });
    });

    describe.skip("failure cases", () => {
      it("should fail", async () => {
        expect(true).to.be.false;
      });
    });
  });

  describe("Buying a membership", () => {
    let dao: DAO;

    beforeEach(async () => {
      dao = await helper.deploy();
    });

    it("should fail if already member", async () => {
      await dao.connect(alice).buyMembership({
        value: ethers.utils.parseEther("1"),
      });
      await expect(
        dao.connect(alice).buyMembership({
          value: ethers.utils.parseEther("1"),
        })
      ).to.be.reverted;
    });

    it("should fail if below 1 ether", async () => {
      await expect(
        dao.connect(alice).buyMembership({
          value: ethers.utils.parseEther("1").sub(1),
        })
      ).to.be.reverted;
    });

    it("should fail if above 1 ether", async () => {
      await expect(
        dao.connect(alice).buyMembership({
          value: ethers.utils.parseEther("1").add(1),
        })
      ).to.be.reverted;
    });
  });

  describe("Buying an nft", () => {
    let dao: DAO;
    let members: SignerWithAddress[];
    let proposalId: BigNumber;
    let execution: ExecutionOnChain;
    let tokenId: BigNumber;

    beforeEach(async () => {
      dao = await helper.deploy();
      members = [alice, bob, charlie];
      await helper.buyMemberships({
        dao,
        signers: members,
      });
      tokenId = await helper.mintAndListNFT(
        dan,
        helper.nftContracts.one,
        ethers.utils.parseEther("2")
      );
      execution = executionBuilder.buyNft({
        nftId: tokenId,
        dao,
        maxValue: ethers.utils.parseEther("2.5"),
      });
      await dao.connect(alice).propose(...execution);
      proposalId = await dao.getProposalId(...execution);
      for (const voter of members) {
        await dao.connect(voter).castVote(proposalId, VoteCast.VOTED_FOR);
      }
      await helper.timeTravel(SECONDS_IN_DAY * 6);
    });

    describe("Through a proposal", () => {
      it("should let the DAO become the owner of an NFT after a successful proposal", async () => {
        const status = await dao.connect(dan).getProposalStatus(proposalId);
        if (status !== ProposalStatus.PASSED) {
          throw new Error("Expected passed proposal");
        }
        const currentNFTOwner = await helper.nftContracts.one.ownerOf(tokenId);
        if (currentNFTOwner !== dan.address) {
          throw new Error("Expected EOA to own the nft");
        }
        await dao.connect(alice).execute(...execution);
        const newNFTOwner = await helper.nftContracts.one.ownerOf(tokenId);
        expect(newNFTOwner).to.equal(dao.address);
      });

      it("should block the purchase if the price of the nft increases", async () => {
        const status = await dao.connect(dan).getProposalStatus(proposalId);
        if (status !== ProposalStatus.PASSED) {
          throw new Error("Expected passed proposal");
        }
        const currentNFTOwner = await helper.nftContracts.one.ownerOf(tokenId);
        if (currentNFTOwner !== dan.address) {
          throw new Error("Expected EOA to own the nft");
        }
        await helper.marketplaceContract
          .connect(dan)
          .list(
            helper.nftContracts.one.address,
            tokenId,
            ethers.utils.parseEther("2.6")
          );
        await expect(dao.connect(alice).execute(...execution)).to.be.reverted;
      });
    });

    describe("Through a direct function call", () => {
      it("should fail", async () => {
        await expect(
          dao
            .connect(alice)
            .buyNft(
              helper.nftContracts.one.address,
              tokenId,
              ethers.utils.parseEther("2.5")
            )
        ).to.be.reverted;
      });
    });
  });
});
