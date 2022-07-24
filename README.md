# CollectorDAO

## Disclaimer

⚠️⚠️ This contract is not audited. Using it on production is strongly advised against. ⚠️⚠️

## Description

This is a DAO protocol built with the intention to buy and collect NFTs as a collective.

### Membership

1. Only non-members can become a member.
2. Membership price is exactly 1ETH.

### Proposals

1. Only members can send a proposal.
2. A proposal may not be executed unless it has passed.
3. A proposal may be revoked, but only by the original proposer.
4. Once a proposal is executed, failed or reverted, it's finalized.
5. An already finalized proposal may get re-proposed buy resubmitting it with a different value for the `disambiguator` field.

### Voting

1. Linear voting: 1 member gets 1 vote.
2. Changing votes: You may change your vote, but you can't change to "not_noted_yet".
3. Only those who were already members during proposal time are allowed to vote.
4. Only ongoing proposals may be voted on.
5. Quorum is based on the total number of voters at the time of proposal.
6. Quorum is set at 25%.
7. If the total number of "for", "against" and "abstain" voters is higher than the total number of voters present at the time of proposal, we say quorum is reached.
8. A proposal will fail if below quorum, or above quorum but against votes less than or equal to the for votes.
9. A proposal will pass if it meets quorum, and with more for votes than against votes.
10. Once a proposal passes, it may be executed.
11. Once a passed proposal is executed, it's no longer considered "passed". It's considered "executed". This is a final state and no further actions may be taken on the same proposal.
12. A proposal is considered "ongoing voting" during the entirety of a 5 days period.Even if the entirety of the DAO votes FOR before the end of the period, the proposal is still considered "ongoing voting".

I originally wanted only positive and abstain votes to count towards quorum. Because a proposal that would fail due to being under quorum, may actually pass just because a no-voter carries it over quorum. This would contradict the voter's intention. As such, no-voters would be disincentivized from voting. However, I later found that the spec would require us to include no-voters in the quorum. As a result, I reversed my original implementation and followed the spec.

Another issue in this system is that a voter can trick a sponsor by giving them a signed vote, only to change their vote later. Furthermore, a voter can give different signed votes to multiple sponsors. This can be easily mitigated by not letting voters change their votes. However, the price of that solution is too high in my opinion: No longer letting informed voters change their minds.

Another issue is that the votes cast so far can show a deceiving picture until the last second where everyone can change their votes. I've decided that this is okay since a healthy organization requires healthy voters, and healthy voters don't change their minds based on other people's votes. You vote for what you believe in, and move on. Since this is a fundamental human / behavioral problem, I've decided that I don't need to solve it. And that letting informed voters change their minds is more important.

Another issue I find with my system is that it's highly vulnerable against 51% attacks. And just like any other 51% attack, it's more vulnerable during the early phases where the DAO size is relatively small. The funds of a DAO of 4 members can be taken over by a group of 5 people. Said in other words, you can steal 4 ETH if you have 5 ETH (split into 5 accounts). If we extrapolate, we can see that you can steal 10_000 ETH if you have 10_001 ETH. Basically you can double your money if you find the right victim.

I can think of a few solutions for this, but I didn't implement any. Here are a few that I considered but ultimately chose against:

A) Separation of powers: Just like a real government, create independent arms for executive, legislative and judicial activities. The legislative branch may send proposals. The judicial branch can revoke memberships of bad actors. The executive branch can handle malicious legislation by chosing not to execute it. However, this is going to slow things down and increase expenses. Plus there's always a chance that they actually collude and take over the entire system. So I don't find this one particularly viable.

B) Quadratic voting + skewed voting rights: Give early-birds more voting power, but not so much to the point where newcomer votes are meaningless.

C) Whitelisting: Have the existing members vote on who can become a member.

D) Veto rights & Stricter Pass requirements: We could give a collective veto right. For example, if 25% of members say NO, we can scrap the proposal. That would make a 51% attack much harder. You'd need a 76% to successfully execute a guaranteed attack. Still not a perfect solution though, and it also produces a lot of false positives. In fact, it will open the surface for griefing attacks: Voters just voting no without any reason.

E) Council of Elders: A smaller group of members in the DAO with special powers. For example, the right to veto a proposal. Or the right to kick a member out. Or the reserved right to execute. The biggest downside of this solution is the increased centralization. But all things considered, it's my favorite. I still didn't implement it though.

### Execution

1. All or nothing: If a single element in the execution list fails, all will fail.
2. A reverted execution may be re-run.
3. Only those who were already a member back when the execution was proposed may run the execution.

At first, I considered allowing everyone to run a proposal once it got approved. They would be paying the gas fees to realise the DAO's will, which is not a bad thing. However, the NFT buying / price hiking example above made me think that there are so many things that can go wrong. The blockchain constantly changes state. We might collectively think that the steps within a proposal are safe right now. However, an attacker can wait for the perfect moment for an arbitrary state change that would benefit them, or hurt the DAO - or both - once the DAO executes the proposal.

For this reason, I wanted to do some threat mitigation by guarding who may run the execution. If we reduce it to the proposer only, I think it puts too much trust into a single point of failure. If we allow all members to do it, we're just 1 step ahead of the original problem: the attacker can buy a membership and we're back to square 1. So I decided to limit it to those who were already members back when the proposal was submitted. And the person who chooses to execute will be essentially staking their reputation. Because it's their duty now to protect the best interest of the DAO against an adversarial blockchain state change.

This is by no means a perfect solution. It doesn't protect the DAO against infiltrators / internal attacks / power struggles. We would need a far more complex solution for those, which woould also come with its own pros and cons.

### Buying an NFT

1. DAO Only: Runs only if msg.sender is the DAO itself.
2. Max value: The function needs to be given a maxValue parameter that denoted the maximum eth the DAO is willing to pay for the NFT.
3. External: It's an external function, but it requires the msg.sender to be the DAO. This means that we can't directly call this function. The only way for this function to execute is through a passed proposal.
4. Execute: Someone needs to call the `execute` function on a successfully passed proposal to buy the NFT (just like any other proposal)

I have an additional field called uint256 maxValue on the buyNFT function. My reasoning is that the seller of an NFT might realize that a proposal has passed to buy it. If they catch this before execution, they can hike up the sell price, execute, and basically drain the entirety of the DAO's funds. By having the function have a maxValue as a parameter, we can have the community be aware of the proposed max cost of the purchase. This value will be usually set to the current price of the nft. The downside is that the seller might change their minds and update the price during voting / pre execution. If they post a lower price, the DAO will pay the lower ask and save the remainder. If they post a higher price, the execution will revert. However, my system allows a proposal to be re-run in the event of a revert. So if the NFT owner changes their mind yet again and lowers the price, we can re-run the execution function and still purchase it.


## Technical Details

- This project uses the EIP-712 standard for struct hashing in signatures.
- The EIP-712 signed payloads may be used for voting.
- Same payloads may be used for batch casting.

## Instructions

- Run `npm install` to install all dependencies.
- Run `npx hardhat test` to run the test suite.

# Design Question

## Question 1

Per project specs there is no vote delegation; it's not possible for Alice to delegate her voting power to Bob, so that when Bob votes he does so with the voting power of both himself and Alice in a single transaction. This means for someone's vote to count, that person must sign and broadcast their own transaction every time. How would you design your contract to allow for non-transitive vote delegation?

## Answer

For this thought experiment, let's say that by default, every voter has 100 voting power. Let's create a `function getTotalVotingPower(address voter) returns (uint256)`. We can track how much voting power someone has delegated, and how much others have delegated to them, by using these 2 contract properties: `mapping(address => uint256) totalDelegatedTo` and `mapping(address => uint256) totalDelegatedFrom`. The total voting power of a voter is: `100` + `totalDelegatedTo[voter]` - `totalDelegatedFrom[voter]`. And when someone tries to give voting power to a delegate, we check if totalDelegatedFrom[voter] is less than or equal to `100`. This ensures that they are only delegating the "delegatable" - their own - votes, and nobody else's; which in turn ensures that delegation is not transitive. Finally, we'll want voters to be able to undo their delegation, or redistribute their delegation from one member to another. To do this, we can rely on a third variable `mapping(address => mapping(address => uint256)) fromVoterToDelegate`, which is a mapping of mappings and it's used to track how much voting power a given voter has given to a delegate. This can be used to readjust the original `totalDelegatedTo` and `totalDelegatedFrom` mappings when a voter wants to change their delegation.

## Question 2

What are some problems with implementing transitive vote delegation on-chain? (Transitive means: If A delegates to B, and B delegates to C, then C gains voting power from both A and B, while B has no voting power).

## Answer

The main challenge here is finding the total voting power of a given voter. Let's take a closer look into the sequence of operations. If B delegates to C first, and then A delegates to B later, we need to transfer A's voting power to C and not B. Let's take a look at the following:

- {a: 100, b: 100, c: 100} - // initial state
- {a: 100, b: 0, c: 200} - // after B->C delegation
- {a: 0, b: 100, c: 200} - // after non-transitivte A->B delegation
- {a: 0, b: 0, c: 300} - // after transitive A->B delegation

If we implement naively, we might unknowingly implement non-transitive delegation. In order to prevent this, we need to know where A->B delegation should have been placed in the first place (i.e C). In order to accomplish this, we can choose to maintain a mapping between addresses. So after the first delegation, this mapping would show: {B=>C}.

But what if the we had a much longer list of delegations? If we have 1000 members who each delegate their voting power to the next member in a linked-list fashion, the computation can take an arbitarily long time and put the system in a deadlock. Attackers can use this to block proposals they don't want to pass. With all these considered, I think the core problem in transitive delegation is how computationally intensive it is, and how it could require more computation than the block target gas amount allows.