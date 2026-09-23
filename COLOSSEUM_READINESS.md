# Colosseum / Crypto World's Fair Readiness

This file separates **repository-automatable checks** from **human/external submission requirements**. A green CI run does not mean the Colosseum submission portal is complete.

## Current competition

Crypto World's Fair runs from September 14 through October 12, 2026, with submissions due October 12, 2026. The Solana ecosystem is an official track.

Official sources:

- https://colosseum.com/worldsfair
- https://colosseum.com/hackathon
- https://docs.colosseum.com/copilot/getting-started

## Repository-side readiness

The repository now has:

- a public GitHub repository and Apache-2.0 license;
- reproducible npm and Rust lockfiles;
- CI covering JavaScript/PQC tests, Rust format/tests/clippy, and high-severity production dependency audit;
- scheduled RustSec and CodeQL security gates;
- a documented research/prototype claim boundary;
- a cross-platform Colosseum Copilot setup/verification helper;
- environment-file protections so the Copilot PAT is not expected to be committed;
- an automated readiness check runnable with `npm run colosseum:check`.

Run the complete maintained repository verification with:

```bash
npm ci --ignore-scripts
npm test
npm audit --omit=dev --audit-level=high
cargo fmt --manifest-path program/Cargo.toml -- --check
cargo test --manifest-path program/Cargo.toml --locked
cargo clippy --manifest-path program/Cargo.toml --all-targets --locked -- -D warnings
npm run colosseum:check
```

## One-click Copilot setup

Colosseum requires a personal access token. Never commit it.

Set the environment variables in your terminal or shell profile:

```bash
export COLOSSEUM_COPILOT_API_BASE="https://copilot.colosseum.com/api/v1"
export COLOSSEUM_COPILOT_PAT="YOUR_PAT"
```

Then run:

```bash
npm run colosseum:setup
```

By default the helper installs the skill for Codex, Claude Code, and OpenClaw, then calls the official `/status` endpoint and requires `authenticated: true`.

To target a different set of agents:

```bash
export COLOSSEUM_COPILOT_AGENTS="codex,claude-code"
npm run colosseum:setup
```

Other commands:

```bash
npm run colosseum:verify
npm run colosseum:update
npm run colosseum:check
```

## Human/external requirements that cannot be completed by repository automation

Before submission, the team leader must verify these directly in Colosseum:

- every participant has registered and the team/profile information is complete;
- only one team/project submission is being made by each entrant;
- all relevant pre-existing development work is disclosed accurately;
- the final product name and concise description are entered;
- integrated blockchains/tools are listed;
- team backgrounds and locations are entered in the portal;
- a final product logo/graphic is selected;
- the 2–3 minute presentation video is final and high quality;
- the product-demo video is no longer than 3 minutes and demonstrates the working product;
- GTM strategy, demand validation, and distribution plan are current and evidence-backed;
- IP/third-party code disclosures and permissions are accurate;
- all submitted content is in English and complies with the official rules;
- the submission is completed before the live deadline.

The repository contains candidate media and planning material, but their final compliance, duration, accuracy, and suitability must be checked by the entrant before submission.

## Judging alignment

The current official rules identify functionality/code quality, potential impact, novelty, UX, open-source composition, and business plan as judging criteria. Use Colosseum Copilot to pressure-test the competitive landscape and strengthen the novelty/market/business sections, but treat Copilot research as decision support rather than as proof of traction or independent validation.
