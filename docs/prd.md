# Mercury: Tokenomics Statements
 
## Objective
Design a tool that helps in processing and visualization of the Tokenomics intend & Vesting on day one against the on-chain Proof of actual Utilization and Vesting of the Tokens.

## Key Details
* Requested Funds: 74,545 ADA
* Project Duration: 4 months
* Solution Summary: Create a tool for on-chain presentation of the original Tokenomics and comparison with actual utilization.
* Solution Components: "Mercury: Tokenomics Statements"
 
## Context
The project won an opportunity to demonstrate the proof of concept in the Catalyst fund 13 with the help of voters collecting ₳236 Million Votes, In the POC Stage we will be providing a system for the user where Projects can Structure the information about their token and the Tokenomics in a way that can be Used to translate the data of the team controlled tokens in the form of statements and graphics to present a better understanding of their activities regarding the Tokenomics and token usage according to that.

Design a tool that helps collect and process data available on the blockchain ledger regarding the Tokenomics into an organised structure that is comparable with the Tokenomics presented by the team in their WP or other communications hence becoming an source of check whether the project is adhering to their prospectus based on which they received their fundings and support,

We lack solutions in the ecosystem that allow project stakeholders and token owners to access the prudency of tokens spent by the projects and how well they adhere to the Tokenomics presented by them at the start.
 
## Base and Background 

### What is Tokenomics?
Tokenomics refers to the study and application of economic principles to the creation, management, and distribution of digital tokens on blockchain networks. It involves understanding the various factors that influence the value and behaviour of tokens within a specific ecosystem, based on the contexts such as the business or the goal that the project is trying to achieve.
 
### Key Aspects of Tokenomics?
* Token supply and distribution: The total number of tokens created, as well as their distribution among stakeholders.
* Token utility and use cases: The specific functions and purposes that tokens serve within a network or ecosystem.
* Token economics: The economic principles that govern token creation, distribution, and value determination.
* Governance and decision-making: The mechanisms by which token holders participate in decision-making processes and shape the direction of a project.
 
### Tokenomics Terms: Cliff, Vesting, and Buckets
#### Cliff
A Cliff in Tokenomics refers to a specific period of time after which a token distribution or vesting schedule becomes active. It's a threshold or milestone that marks the start of a new phase in the token distribution plan. Generally the vesting in Tokenomics are stated in terms of Months.
        	Example: The investor bucket has a 6 month cliff, meaning that token holders must wait 6 months from the token sale date before they can unlock and transfer their tokens.
 
#### Vesting
Vesting is a mechanism that restricts the transfer or use of tokens until a certain period of time has passed or a specific condition is met. Generally the vesting in Tokenomics are stated in terms of Months.
        	Example: The investor bucket has a 6 month cliff & 12 month vesting, meaning that token investor must wait 6 months from the token sale date before they can unlock and transfer their tokens. And instead of all of their token allocation in lumpsumm they will get access to their tokens linearly for a period of 12 months.
##### Types of Vesting:
* Linear vesting: Tokens are unlocked and transferable at a steady rate over time.
* Cliff-based vesting: Tokens are locked until a cliff period has passed, after which they vest at a steady rate.
* Accelerated vesting: Tokens vest faster as the holder approaches the cliff period.
* Custom vesting: Tokens are Vested on various custom or complex formulas or systems
 
#### Buckets
In tokenomics, a bucket refers to a specific group or pool of tokens that are allocated to a particular entity, group or Purpose. Buckets can be used to manage token distribution, vesting schedules, and other token-related activities.
* Founders
* Public
* Investors
* Liquidity
* Incentive etc
these are not fixed and you will see varied split of the full pie based on case to case basis for every project

## Current State Processes and Technology
Though we exist on Blockchain and run on an ethos of "Don't trust. Verify." But, when it comes to projects building and developing atop blockchain technologies, we see the development of opaqueness, obfuscation, and confusion in relation to how project funds and tokens are managed, housed, and distributed.

When a project publish a Tokenomics, The Actual Tokenomics split and vesting schedules are only available on the site or white paper of the project or other non chain platforms, without any on-chain existence.

When someone want to collect the information it is difficult to access the current condition and actual utilization of token buckets,

Initially this tool will be used by projects to self report but with with sufficient pressure from their investors and stakeholders it can become compulsory requirements for projects.

This tool can lead to an existence of an the above information on blockchain, which can be fetched by the centralized information providers like CoinMarketCap and CoinGecko to publish an accurate data, as they currently rely on services like google form and these methods of information collection can be tempered with, or it can be used by on-chain platforms like Taptools.io or Xerberus.io
 
## Product Clarification and Obstacles
### What the Product Is
The project aims to develop a tool that helps projects to report
* The Initial Tokenomics (on chain)
* The Initial Vesting Schedule
* The Utilization of the Tokenomics buckets resulting in current state of the Tokenomics,
* Tool to visualize all the above and,
* An on-chain method to prove the correctness of the above data or to allocate responsibility.
 
### What the Product Is Not
The product is a proof of concept, demonstrating the capabilities of such a tool on the blockchain. It does not solve every accounting problem and primarily addresses on-chain data, & handling complex UTXO models, are not covered in this POC.
Establishing Clear Boundaries and Expectations
* Limitations: The tool can only convert the information available with the controled wallet into a limited form of Tokenomics Statement.
* Manual Adjustments: Users/project need to manually adjust and integrate non-blockchain data to create comprehensive Tokenomics Statement.
* No Integration with Oracles: and the automation through Oracles is not covered

## Dependencies
The project's success depends on the blockchain's functionality and proper record maintenance by the project. Tokenomics statements generated using this POC will be need to be reviewed and adjusted by the projects to provide the compariables in many case if the Projects have not followed the best practised in the start while bringing their Tokenomics on chain

As the project incubator Mercury Team will be helping us with the technical and Smart Contract Aspects of the Project

A project which do not maintain records for the transactions they have conducted will find it difficult to translate their wallets and provide the utilizations of their tokens.

At the current stage, only a small batch of transactions can be identified automatically on the blockchain, with a more robust triple entry system, it will become easier and the data will become automatically populated.
* Functionality of the blockchain
* Proper record maintenance by the project
* Technical and smart contract support from the Mercury team
 
## Implementation Timeline
* Milestone 1: PRD + UX/UI Design Draft (Feb 2025)
  * https://milestones.projectcatalyst.io/projects/1300133/milestones/1
* Milestone 2: Proof of Concept Development & Demonstration (April 2025)
  * https://milestones.projectcatalyst.io/projects/1300133/milestones/2
* Milestone 3: Project Closeout (May 2025)
  * https://milestones.projectcatalyst.io/projects/1300133/milestones/3

## Requirements from Projects
### First time
1. 	Name Of Project
2. 	Token Policy ID
3. 	Wallet Address/addresses or Handles containing all the tokens in control of the project
4. 	If the wallet addresses are divided based on the Buckets then identification of the buckets corresponding to the wallet address
5. 	Cliff, Vesting and Bucket allocation representing the token pie chart
6. 	if there is custom first unlock or an lumpsum. First unlock specify that for the bucket
 
### Continuous periodic updates
1. 	the Project will need to provide the parodic updated/check of the utilisation of the tokens
2. 	this will mainly be required if project has done some changes to the Tokenomics
3. 	or have change/disturbed the original addresses controlling the token buckets
4. 	or never maintained a proper separation of the buckets in separate wallets

## Requirements from Community
Anyone can review the Tokenomics statement and comparative just by selecting the projects that have followed the process mentioned in the “requirements from the Projects”

Creating a push to more and more projects so that they are utilizing the tooling to give a proper and full disclosure to the stake holders

## Output/Features
* On-chain availability of the initial Tokenomics
* A comparative statement / Visualisation tool as visible in the Figma

## Figma with Process/Flow
https://www.figma.com/proto/RHoHJQvco8OROjMiM54pGB/Mercury%3A-Tokenomics?page-id=0%3A1&node-id=2-2&p=f&viewport=-542%2C472%2C0.14&t=dwBNk3na8YqFDUCF-1&scaling=min-zoom&content-scaling=fixed&starting-point-node-id=2%3A2
the requirements mentioned in the previous para are the flow of the tool and you will be able to easily understand the flow from it

## Future Directions and Upgrades
We will continue our attempt to provide a tooling that can help a project publish Tokenomics on chain, provide the utilization statements, make financial statements the next phase, we will attempt to provide the project with cash flow statements, and more customization options.

## Target User
Projects and individual wallets that need to present Tokenomics on chain, provide the independent and verifiable utilization statement of the Tokenomics. And an interface for the general public to check the Tokenomics statement

## Legal Requirements
This POC in no way assures the correctness of the Tokenomics statements prepared using this POC and the final onerous will remain with the project as we are only attempting to provide a tooling that will make it easier to present financial information in a better manner, and it is responsibility of the project to ensure that they follow the best industrial practice for wallet management and financial bookkeeping, and employ an Auditor of good standing as then only an auditor can certify the correctness of the numbers presented by the projects

### Open-source license requirements: 
Apache 2.0 https://github.com/cardano-mercury/mercury-financials/blob/main/LICENSE

## GitHub
https://github.com/cardano-mercury/mercury-tokenomics (Starting from Milestone 2)
