# Security policy

## Reporting a vulnerability

**Do not open a public issue for a security problem.**

Report it privately through GitHub's
[private vulnerability reporting](https://github.com/cardano-mercury/mercury-tokenomics/security/advisories/new)
(the Security tab, "Report a vulnerability"). That opens a draft advisory only you and the
maintainers can see.

If you cannot use that, email **adam@crypto2099.io** with the details.

Please include what you need to make the problem reproducible: the affected version or commit, the
steps, and what an attacker gets out of it. A proof of concept helps, but a clear description is
worth more than a working exploit.

You will get an acknowledgement within a few days. We will tell you what we think the impact is and
when we expect a fix, and we will credit you in the advisory unless you would rather we did not.

Please give us a reasonable window to ship a fix before disclosing publicly.

## Scope

This project is a **proof of concept** for Catalyst Fund 13, and its own documentation says so: it
makes no assurance of the correctness of the statements it produces, and it is not an audit tool. Do
not treat it as one.

That said, the following are in scope and worth reporting:

- Authentication and session handling, including the single sign-on shared with the other Mercury
  apps (a session minted by one app is valid on the others, so a flaw here is not contained to this
  repo).
- Access control: anything that lets one account read or modify another account's projects, or that
  exposes a project the owner has not published.
- Injection of any kind, or anything that lets a request reach the database outside the query layer.
- Secrets or credentials leaking into logs, error responses, or a published container image.
- The on-chain anchoring and verification path, where a flaw would let a declaration be presented as
  verified when it does not match what was anchored.

Out of scope:

- The accuracy of a tokenomics statement itself, which depends on a project declaring its wallets
  honestly and completely. The tool reports what the chain shows for the wallets it was given; it
  cannot know about a wallet it was never told about. This is a stated limitation, not a bug.
- Vulnerabilities in Cardano, Koios, or other third-party infrastructure. Report those upstream.
- Anything requiring an attacker to already control the operator's account or their wallet keys.

## Supported versions

The project is pre-1.0 and under active development for the proof of concept. Only the latest release
is supported; fixes land on `main` and are published from a new version tag.
