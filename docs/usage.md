# Using Mercury: Tokenomics Statements

This is the user guide for the tool. It explains what the system does and how to use it, for both the projects that publish tokenomics and the people who review them. It grows alongside the product, so sections marked "planned" describe flows that are designed but not yet built.

For the product rationale see `docs/prd.md`. For the technical design see `docs/design.md`.

## What the tool does

Mercury lets a project declare its intended tokenomics (how its tokens are split into buckets, and the cliffs and vesting schedules that govern each bucket) and anchor that declaration on the Cardano blockchain so it cannot be quietly changed later. The tool then reads the wallets the project controls and shows how the tokens have actually moved, side by side with what was promised. Anyone can review a participating project's statement.

## Who uses it

There are two audiences.

Project operators set up a project, describe its tokenomics, prove they control the relevant wallets, and anchor the declaration on-chain. This requires an account.

Reviewers (investors, community members, data providers) read a project's published statement to see how closely actual distribution tracks the promised schedule. This requires no account.

## Current status

The system is in active development for the Catalyst Fund 13 proof of concept. What exists today is the data model and the calculation engine that turns a schedule and on-chain movements into a Promised versus Delivered statement. The account, project editing, chain reading, visualization, and on-chain anchoring surfaces are being built in sequence. This guide will document each as it lands.

## Running the app locally

Until a hosted instance is available, the app runs locally. See `README.md` for full setup. In short:

```sh
npm install
cp .env.example .env
npm run db:migrate
npm run dev
```

Then open the address printed by the dev server. The app defaults to the Cardano Preprod test network.

The home page introduces the tool and links to Get started (account creation) and Browse projects (the public directory). A light and dark theme toggle sits in the top navigation.

## For project operators (planned)

The operator flow follows the requirements in the PRD.

Create an account using email with a password, or sign in with a magic link. In local development the magic link is printed to the server console rather than emailed. Once signed in, you can enable TOTP two-factor authentication from the dashboard security page; it then applies at every sign-in.

Create a project from the dashboard by providing its name, the token policy id, asset name, decimals, total supply, network, and the token generation date (T0) that anchors all schedules. You can edit these details at any time.

Define buckets on the project page. Each bucket has a name (for example Founders, Public, Investors), an allocation, an optional cliff in months, a vesting length in months, a vesting type (linear, cliff-based, accelerated, or custom), and an optional first-unlock lump sum released at T0. The page shows how much of the total supply has been allocated across buckets.

Declare the wallets the project controls and assign them to buckets where appropriate. Wallets are currently recorded as unverified; cryptographic ownership proof by signing a challenge with the wallet is a later milestone.

Anchor the declaration on-chain. The tool publishes a compact record to Cardano transaction metadata so the declaration is timestamped and tamper-evident. Re-anchoring after changes creates a new version.

Tag transactions to explain or reclassify specific movements (for example a CEX listing or a liquidity addition). Tags annotate the automatically computed numbers, they do not replace them.

## For reviewers (planned)

Browse the directory of participating projects and open a project to see its statement.

The statement presents Promised versus Delivered. Promised is what the schedule says should be unlocked or allocated; Delivered is what has actually been distributed out of the project's controlled wallets. You can move through time with the period control to see how adherence has evolved, and read both the per-bucket breakdown and the project total. A snapshot view shows the current position at a glance.

Verify the on-chain anchor to confirm that the declaration you are reading matches what the project committed to the blockchain.

Export the statement for your own records.

## Glossary

Bucket: a named pool of tokens allocated to a purpose. Buckets are defined per project and vary from project to project.

Cliff: a lock period, in months, before a bucket's tokens begin unlocking.

Vesting: how a bucket's tokens unlock after the cliff, over a number of months. The tool supports linear, cliff-based (monthly steps), accelerated (front-loaded), and custom curves.

First unlock: a lump sum released at the start (T0), before the cliff and vesting apply to the rest.

T0: the token generation or sale date that anchors a project's schedules.

Promised: the intended position from the declared schedule at a given time.

Delivered: the actual tokens distributed out of the controlled wallets at a given time.

Anchor: the on-chain record that fixes a declaration so it can be independently verified.
