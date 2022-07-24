- Answer the design question
- don't forget: Write a function that allows any address to tally a vote cast by a DAO member using offchain-generated signatures.
- Then, write a function to do this in bulk.

GENERAL CHECKS

- figure out all different kinds of events you can fire
- TODO: go over all todos
- go over all FIXMEs
- TODO: don't forget to submit on the LMS!

FINAL CHECKS

- check if the number of passing tests equals the number of it() statements [against race conditions]
- read the spec and see if everything is tested
- go over all your audits to get hints / ideas
- try different slither printers available via `slither --list-printers`.
- add fuzz tests
- go over all discussions on the discord
- Run `npx hardhat coverage` until 100% coverage.
- Go over every contract to see `constant`s vs `normal` vs `immutable` variables
- Go over every `pure`, `view` etc
- Go over every `virtual`
- Go over every `memory`
- Go over every `public` `private` `internal` `external`
- Run `mythril` to check for vulnerabilities
- TODO: Run `slither` to check for vulnerabilities
- Check if your solidity compiler version is the latest / has no known vulnerabilities.
- Set the optimizer to 200 runs
- TODO: document all functions and properties
