# Brass Tacks Rigorous Code-Quality Review: Master Plan

## Context
This repository is undergoing a rigorous, systematic code-quality review prior to open-source release. The review is conducted with an adversarial, skeptical mindset to identify vulnerabilities, reliability gaps, and privacy risks. The system is a local, self-hosted open-source application (user-managed secrets via `.env`, local databases).

## Prioritization & Severity Weighting
1. **Ownership & Data Integrity** (Partial writes, corruption, data isolation)
2. **Privacy & Security** (Protecting keys, encryption, unauthorized access)
3. **Cost** (Runaway loops, unexpected token consumption)
4. **Reliability & Correctness** (Retries, gracefully handling malformed output)

## Progress Tracker

### Stage 1: INSPECTION
- [x] **Phase 1.1: Reconnaissance, Baseline Health & OSS Readiness**
  - [x] Build & Test Baseline
  - [x] System Map
  - [x] OSS Release Readiness (LICENSE, README, .gitignore, dependencies)
- [x] **Phase 1.2: Adversarial Security, Privacy, & Data Integrity (Threat Pass)**
  - [x] API-key & Secret handling (BYOK paths, leaks in logs/git)
  - [x] Personal data (Profile/brain-dump protection)
  - [x] Untrusted input & Prompt injection (Job descriptions, Web search)
  - [x] Data integrity (Schema migration, corruption recovery)
- [x] **Phase 1.3: External Integrations, Costs & Reliability**
  - [x] Web search path (SSRF, exfiltration, rate limits)
  - [x] Multi-provider abstraction (Degradation, fallbacks)
  - [x] Cost-runaway & tokens (Loops, massive inputs)
- [x] **Phase 1.4: Application Logic, Output Correctness & UX**
  - [x] Output correctness (Filtering relevance, malformed LLM outputs)
  - [x] Troubleshooting guides validation

### Stage 2: SYNTHESIS
- [x] Consolidate findings
- [x] Re-rank overlapping risks

### Stage 3: FOLLOW-UP PLAN
- [x] Remediation Plan (Release-blockers)
- [x] Backlog
- [x] Roadmap
- [x] Unknowns Register

### Stage 4: OWNER REVIEW GATE
- [x] Owner approval prior to code changes

---

> **Audit Complete** — All stages have been executed and all remediations verified. See the [Integration Testing Report](../integration_testing_report.md) for full verification results.
