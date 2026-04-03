# Agentic Workflows

Backlog of potential automations using Claude Code agents, subagents, skills, and GitHub Actions workflows.

For product features see [roadmap.md](roadmap.md). For code issues see [tech-debt.md](tech-debt.md).

## Active

| ID | Workflow | Description | Assigned | Status |
|----|----------|-------------|----------|--------|
| AW-001 | Auto-lint on edit | PostToolUse hook runs ESLint after .ts/.tsx edits | Vidhya | Active |
| AW-002 | Auto-test on edit | PostToolUse hook runs Vitest after search.ts/page.tsx edits | Vidhya | Active |
| AW-003 | Block data file edits | PreToolUse hook prevents direct edits to `src/data/*.json` | Vidhya | Active |
| AW-004 | Pre-push checks | Git hook runs lint + test + coverage + build before push | Vidhya | Active |
| AW-005 | CI pipeline | GitHub Actions: lint, build, test with coverage on push/PR | Vidhya | Active |
| AW-006 | Weekly docs audit | GitHub Actions runs Monday 9am UTC, checks for doc drift | Vidhya | Active |

## Planned

| ID | Workflow | Description | Assigned | Status |
|----|----------|-------------|----------|--------|
| AW-007 | Code reviewer in CI | Wire code-reviewer subagent into PR workflow via Claude Code headless mode in GitHub Actions | Unassigned | Planned |
| AW-008 | Automated coverage improvement | Scheduled workflow runs `/gen-test` on untested files, opens PRs to ratchet coverage thresholds | Unassigned | Planned |
| AW-009 | Data freshness automation | GitHub Actions workflow to automate Excel import + scrape pipeline on schedule or trigger | Unassigned | Planned |

## Ideas

| ID | Workflow | Description | Assigned | Status |
|----|----------|-------------|----------|--------|
| AW-010 | Accessibility auditor subagent | Subagent that scans components for a11y gaps: missing ARIA, keyboard nav, contrast, screen reader support | Unassigned | Idea |
| AW-011 | Component extractor subagent | Analyzes page.tsx and proposes component breakdown with props/state mapping before TD-001 refactor | Unassigned | Idea |
| AW-012 | PR changelog generator | Skill that reads PR commits and generates a user-facing changelog entry | Unassigned | Idea |
| AW-013 | Dependency update bot | Scheduled workflow checks for outdated packages, runs build+test, opens PRs for safe upgrades | Unassigned | Idea |
| AW-014 | Weekly backlog review + Slack digest | Scheduled workflow reviews all three backlog files (roadmap, tech-debt, agentic-workflows), summarises status changes, stale items, and progress, then posts a weekly digest to Slack | Unassigned | Idea |
