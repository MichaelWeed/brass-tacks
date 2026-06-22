# Brass Tacks: Canonical Project Vision

> **Status:** Active — This document is the SINGLE SOURCE OF TRUTH for Brass Tacks's
> purpose, design, and constraints. Any agent session, pull request, or architectural
> decision must align with the vision outlined here.
>
> **Last updated:** 2026-06-19

---

## 1. Purpose

Brass Tacks is a **free, open-source, locally-run resume engineering engine**. It exists to
solve three problems simultaneously:

1. **User value:** Help job seekers create resumes that are laser-focused on specific job
   postings — not generic templates, but precision-engineered career documents built from
   real data the user provides.

2. **Portfolio showcase:** Demonstrate the builder's full-stack engineering depth to
   potential employers — specifically Google — by shipping a polished, production-grade
   product rather than toy demos or tutorial clones.

3. **Gemini promotion:** Position Google's Gemini model as the default AI engine, showing
   it in a real workload. The tool is explicitly configurable to use other providers
   (Claude, ChatGPT, xAI), subtly signaling that the builder's skills are
   provider-agnostic and transferable to any company.

---

## 2. Strategic Intent

Brass Tacks is a **portfolio piece with real utility**. The strategic calculus:

- The project demonstrates that the builder can ship a complete, multi-service application
   with a polished UX — the kind of work that motivates product managers and eng leads to
   recruit.
- The README and documentation make multi-provider AI support visible, so any company
   reviewing the repo sees their own model represented.
- The open-source, local-first identity signals engineering values: privacy, user autonomy,
   no vendor lock-in.

---

## 3. What Brass Tacks IS

| Property | Detail |
|---|---|
| **Deployment model** | A downloadable, self-hosted application that runs entirely on the user's local machine by default. |
| **License model** | Open-source — anyone can fork, modify, and use it for free |
| **AI default** | Gemini is the default model; the user can switch to Claude, ChatGPT, or xAI |
| **Data policy** | Generates resumes using ONLY user-provided data — zero hallucination by design |
| **Runtime** | The user's local machine IS the production environment |

---

## 4. What Brass Tacks Is NOT

These are **hard constraints** for the default runtime environment, not preferences.

- **NOT a SaaS product.** There is no subscription, no hosted tier, no "free vs. pro" split.
- **NOT a cloud-deployed service.** By default, it does not run on GCP, AWS, Azure, or any cloud
  platform. There is no production server — the user's laptop is the server.
- **NOT built for active cloud hosting.** While a documented, illustrative cloud-deployment story (`docs/DEPLOYMENT.md`) is provided to show architecture foresight, no production cloud build-out is maintained or supported in the core codebase.
- **NOT a multi-tenant system.** There is exactly one user per installation.
- **NOT a platform for third-party integrations.** No OAuth provider dashboards, no
  webhook receivers, no external API consumers.

---

## 5. User Experience Flow

### 5.1 First Launch

```
git clone → run launcher → services start silently → browser opens
```

1. User downloads the repo and runs the launcher script.
2. The application silently starts all backend services (Postgres, Qdrant, parser, API)
   via Podman compose and opens the browser UI. **No terminal interaction is required**
   for the end user after the initial command.
3. The onboarding wizard appears:
   - **Identity:** Name, email, phone, address.
   - **Resume upload:** Upload an existing resume for reference parsing.
   - **Brain dump:** A large freeform text field where the user pastes ALL career history,
     achievements, skills, certifications, project details, education, and anything else
     they want the engine to draw from.

### 5.2 Return Visits

The launcher detects existing data and skips onboarding, going directly to the
**dashboard**.

### 5.3 Core Workflow

1. User pastes a **job posting URL or raw job description** into the generation interface.
2. The engine analyzes the posting requirements.
3. The engine selects and emphasizes **only relevant details** from the user's profile and
   brain dump.
4. A tailored resume is generated — ready to download, review, and submit.

---

## 6. Core Principle: Zero Hallucination

This is the **defining technical constraint** of Brass Tacks.

The engine ONLY uses data the user explicitly provided. If a detail was not in the brain
dump, the uploaded resume, or the profile fields, it **CANNOT** appear in the generated
resume. The system selects and emphasizes relevant portions of real history — it never
fabricates skills, titles, dates, companies, or achievements.

### Concrete Example

A former restaurant manager with 8 years of experience applies to two different roles:

| Target Role | What the Engine Does |
|---|---|
| **Call center manager** | Extracts transferable skills only: team leadership, scheduling, conflict resolution, KPI tracking, training programs. Restaurant-specific details (food safety, inventory) are omitted. |
| **Restaurant district manager** | Includes full restaurant management detail: P&L ownership, food cost control, health inspections, multi-unit coordination, vendor negotiations. |

The same source data produces radically different resumes — but every single line traces
back to something the user actually provided.

---

## 7. Technical Architecture

### 7.1 Service Map

```
┌─────────────────────────────────────────────────────────┐
│                   User's Local Machine                  │
│                                                         │
│  ┌──────────────┐    ┌──────────────┐                   │
│  │  Next.js 15  │───▶│  FastAPI     │                   │
│  │  (App Router)│    │  (Python 3.13)│                  │
│  │  Forge Theme │    │  SQLAlchemy  │                   │
│  └──────────────┘    └──────┬───────┘                   │
│                             │                           │
│              ┌──────────────┼──────────────┐            │
│              ▼              ▼              ▼            │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐    │
│  │  PostgreSQL  │ │    Qdrant    │ │   Docling    │    │
│  │  (user data) │ │  (vectors)   │ │  (parsing)   │    │
│  └──────────────┘ └──────────────┘ └──────────────┘    │
│                             │                           │
│                    ┌────────▼────────┐                  │
│                    │    LiteLLM     │                   │
│                    │  Router Layer  │                   │
│                    │                │                   │
│                    │ Gemini (default)│                  │
│                    │ Claude         │                   │
│                    │ ChatGPT        │                   │
│                    │ xAI            │                   │
│                    └─────────────────┘                  │
│└─────────────────────────────────────────────────────────┘
```

### 7.2 Technology Choices

| Layer | Technology | Rationale |
|---|---|---|
| **Frontend** | Next.js 15 (App Router) | Server components, streaming, modern React patterns |
| **Frontend theme** | Bespoke "Forge" CSS token system | Anti-homogenization: no Tailwind defaults, no generic palettes |
| **Backend** | FastAPI (Python 3.13) | Async-native, type-safe, excellent for AI/ML integration |
| **ORM / DB** | SQLAlchemy + PostgreSQL | Battle-tested relational storage for structured user data |
| **Vector store** | Qdrant | Semantic indexing of user profile for intelligent retrieval |
| **Document parsing** | Docling (standalone service) | High-precision extraction from uploaded resumes (PDF, DOCX) |
| **AI routing** | LiteLLM | Single interface to Gemini, Claude, ChatGPT, xAI — provider-agnostic |
| **Containerization** | Podman compose | Rootless containers, no Docker daemon dependency |

### 7.3 Deployment Model

Everything runs locally via **Podman compose**. The `compose.yaml` defines:

- PostgreSQL database (persistent volume)
- Qdrant vector database (persistent volume)
- Docling parser service
- Backend API (FastAPI)
- Frontend (Next.js)

There is **no active cloud deployment target**. The compose file targets `localhost`. The user's
machine is the only default runtime environment, though an illustrative cloud deployment is detailed in `docs/DEPLOYMENT.md`.

---

## 8. Immutable Constraints

These constraints are **non-negotiable** for the default setup.

| # | Constraint | Violation Example |
|---|---|---|
| 1 | Maintained environment is local-first | Actively deploying core application services to cloud PaaS directly |
| 2 | No SaaS-oriented architecture | Adding multi-tenancy, usage metering, subscription tiers, or auth provider dashboards |
| 3 | No assumptions about default "production servers" | Referencing "staging vs. production environments," load balancers, or CDNs in local config |
| 4 | AI model choice must remain configurable | Hardcoding OpenAI API calls without the LiteLLM routing layer |
| 5 | Core code stays lean of cloud deployment sdk baggage | Keeping unused cloud client libraries (e.g. `google-cloud-secret-manager`) in dependencies |
| 6 | Zero hallucination in generated resumes | Allowing the AI prompt to generate content not traceable to user-provided data |
| 7 | No global dependency installs | Instructions that say `npm install -g` or `pip install` outside a virtualenv |
| 8 | Bespoke design tokens only | Importing Tailwind's default palette or using generic slate/indigo/violet schemes |

---

## 9. Known Violations to Remediate

The following items are tracked for remediation:

| Item | Status | Action Required |
|---|---|---|
| README references "production secrets" | **Misleading language** | Reword to "local configuration" or "API key management" |
| `docs/SECURITY.md` mentions "production" | **Misleading language** | Audit and reword to reflect local-only deployment |

---

## 10. Agent Session Directive

Any AI agent, code assistant, or automated tool operating on this repository **MUST**:

1. Read this document before making architectural decisions.
2. Refuse to add cloud infrastructure, SaaS patterns, or multi-tenant logic.
3. Refuse to generate resume content that is not traceable to user-provided data.
4. Treat the user's local machine as the sole default deployment target.
5. Use Podman (not Docker) as the default containerization tool in all instructions.
6. Maintain the LiteLLM routing layer — never bypass it for direct provider API calls.
7. Flag any existing code that contradicts this document as a violation requiring a
   `BUG-XXX` entry.

**If in doubt, ask the user. Do not assume.**

---

## Document Integrity

This file represents the canonical vision for the project. Updates should be done through normal version control and PR reviews.
