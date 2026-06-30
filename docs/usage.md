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

To explore with sample content, load the demo projects first with `npm run db:seed`. This adds two public statements (Helios Protocol and Acme DAO) you can browse without an account.

Then open the address printed by the dev server. The app defaults to the Cardano Preprod test network.

The home page introduces the tool and links to Get started (account creation) and Browse projects (the public directory). A light and dark theme toggle sits in the top navigation.

## For project operators (planned)

The operator flow follows the requirements in the PRD.

Create an account using email with a password, or sign in with a magic link. In local development the magic link is printed to the server console rather than emailed. Once signed in, you can enable TOTP two-factor authentication from the dashboard security page; it then applies at every sign-in. Accounts are shared across the Mercury apps, so the same login works on Mercury Financials as well.

Create a project from the dashboard by providing its name, the token policy id, asset name, decimals, total supply, network, and the token generation date (T0) that anchors all schedules. You can edit these details at any time.

New projects start as drafts, visible only to you. Use Preview statement on the project page to see exactly how the public report will look while you fill in the details, then Publish to make it public. You can unpublish at any time to take it private again. Drafts do not appear in the public directory and cannot be opened or exported by anyone else.

Define buckets on the project page. Each bucket has a name (for example Founders, Public, Investors), an allocation, an optional cliff in months, a vesting length in months, a vesting type (linear, cliff-based, accelerated, or custom), and an optional first-unlock lump sum released at T0. The page shows how much of the total supply has been allocated across buckets.

Declare the wallets the project controls and assign them to buckets where appropriate. Wallets are currently recorded as unverified; cryptographic ownership proof by signing a challenge with the wallet is a later milestone.

Bring in delivered amounts on the project page. Use Sync from chain to pull external outflows from Koios for the declared wallets, or record movements manually (date, bucket, direction, amount) when you want to enter known distributions. These feed the Delivered side of the statement.

Anchor the declaration from the project's Anchor page. The page shows the declaration hash and the exact metadata to publish under the Mercury metadata label. Submit that metadata in a transaction from a wallet you control, then paste the transaction hash to record the anchor. Each anchor increments the version. Wallet-based building and submission with MeshJS is a later enhancement.

Anchor the declaration on-chain. The tool publishes a compact record to Cardano transaction metadata so the declaration is timestamped and tamper-evident. Re-anchoring after changes creates a new version.

Tag transactions to explain or reclassify specific movements (for example a CEX listing or a liquidity addition). Tags annotate the automatically computed numbers, they do not replace them.

## For reviewers

Browse the directory of participating projects at Projects, and open one to see its statement. No account is needed. The directory supports searching by name or description, filtering by network, and pagination; the search, filter, and page are kept in the URL so a particular view can be shared.

The statement presents Promised versus Delivered. Promised is what the schedule says should be unlocked at a given time; Delivered is what has actually been distributed out of the project's controlled wallets. Move the date scrubber to see how adherence has evolved, read the per-bucket bars and the promised and delivered distribution donuts, and follow the adherence-over-time chart. Overall totals and the delivered share are shown at a glance.

If a project has anchored its declaration, the statement shows the anchor version and a verification badge: the page recomputes the declaration hash and confirms it matches what was anchored, or flags that the declaration has changed since. Use Export as xlsx to download the statement as a spreadsheet.

## Glossary

Bucket: a named pool of tokens allocated to a purpose. Buckets are defined per project and vary from project to project.

Cliff: a lock period, in months, before a bucket's tokens begin unlocking.

Vesting: how a bucket's tokens unlock after the cliff, over a number of months. The tool supports linear, cliff-based (monthly steps), accelerated (front-loaded), and custom curves.

First unlock: a lump sum released at the start (T0), before the cliff and vesting apply to the rest.

T0: the token generation or sale date that anchors a project's schedules.

Promised: the intended position from the declared schedule at a given time.

Delivered: the actual tokens distributed out of the controlled wallets at a given time.

Anchor: the on-chain record that fixes a declaration so it can be independently verified.
