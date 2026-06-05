# Phase 1.1 Findings: Reconnaissance, Baseline Health & OSS Readiness

This document records the baseline results, static analysis diagnostics, architectural vulnerabilities, and open-source release readiness gaps identified during Phase 1.1 of the Brass Tacks Rigorous Code-Quality Review. 

---

## Findings Table

| ID | Severity | Category | Location | Evidence | Impact | Suggested direction | Confidence | Cross-ref |
|---|---|---|---|---|---|---|---|---|
| F-1.1-01 | Critical | Security | `/` (Project Root) | Root directory lacks a `.gitignore` file, exposing `.env` files. | Production secrets (such as API keys, Postgres DB URLs) are unprotected from Git staging. | Create a comprehensive root `.gitignore` file. | High | None |
| F-1.1-02 | High | Reliability | `backend/app/routers/generation.py:189` | Synchronous `get_current_user` dependency is incorrectly called with `await` and missing the `request` argument. | Severe TypeErrors are raised silently, bypassing security parameters and causing SSE auth updates to fail. | Correct the sync call signature by passing the request parameter and removing `await`. | High | BUG-001 |
| F-1.1-03 | High | Correctness | `frontend/src/components/Sidebar.tsx:147-204` | React Hooks (`useState`, `useEffect`) are illegally declared inside an inline JSX IIFE. | Severe violation of the Rules of Hooks causes unstable rendering and blocks production builds (`npm run build`). | Extract the hooks to the top-level of the functional component. | High | None |
| F-1.1-04 | High | Performance | `terraform/main.tf:60-61` | Cloud Run parser container allocation limited to `512Mi` memory. | Executing Docling's deep-learning PDF parsing models will trigger instant container Out-Of-Memory (OOM) crashes. | Increase the memory limit to at least `2Gi` (preferably `4Gi`). | High | None |
| F-1.1-05 | Medium | Maintainability | `backend/app/core/config.py:5`, `backend/app/main.py:7`, `parser_service/app/main.py:6` | Residual legacy `"TailorForge"` name references present in configuration and API headers. | Inconsistent naming and branding, violating direct user instructions to restore `"TailorForge"`. | Refactor configurations and app headers to use `"TailorForge"`. | High | None |
| F-1.1-06 | Medium | Test-gap | `/` (Entire Workspace) | `backend/tests/` is completely empty; frontend lacks any test suites or configuration. | Absolute absence of regression safety or test suites, violating production standards. | Set up Pytest for the backend and Jest/Vitest for the frontend. | High | None |
| F-1.1-07 | Medium | Maintainability | `backend/pyproject.toml:38`, `backend/app/*` | MyPy strict checking (`strict = true`) reports 83 type check errors in 14 files. | Static analysis checks block CI integrations, concealing actual backend type bugs. | Resolve SQLAlchemy 2.0 column typings and add explicit variable annotations. | High | None |
| F-1.1-08 | Medium | Maintainability | `frontend/*` | Frontend `npm run lint` yields 42 problems (30 errors, 12 warnings). | Cascading hook dependencies errors and styling warnings cause build failures. | Systematically resolve lint findings and align hook dependency arrays. | High | F-1.1-03 |
| F-1.1-09 | Low | Compliance | `/` (Project Root) | Standard open-source `LICENSE` and `CONTRIBUTING.md` metadata files are missing. | Licensing uncertainty and poor open-source developer onboarding experience. | Add a standard MIT/Apache license file and write a comprehensive contributor guide. | High | None |
| F-1.1-10 | Low | Observability | `backend/app/main.py:28-29` | Backend app uses deprecated `@app.on_event("startup")` FastAPI decorator. | Deprecation warning will block future minor/major FastAPI version upgrades. | Migrate startup procedures to a modern FastAPI lifespan context manager. | High | None |

---

## Detailed Finding Analyses

### F-1.1-01: Secrets Exposure via Missing Root `.gitignore`
*   **Severity:** Critical
*   **Category:** Security
*   **Location:** `/` (Project Root)
*   **Evidence:** The project lacks a `.gitignore` in the root folder, while local subfolders like `frontend/` have their own nested configurations. As a result, the unignored `backend/.env` file containing live secrets is completely untracked and visible to Git staging.
*   **Impact:** A standard `git add .` command will automatically stage the `backend/.env` file, potentially exposing API keys (`GEMINI_API_KEY`, `QDRANT_API_KEY`) and production database urls (`DATABASE_URL`) to a public repository.
*   **Suggested direction:** Add a unified `.gitignore` file to the root of the project to safeguard `.env`, node_modules, environments, temporary logs, and build directories.

---

### F-1.1-02: Async/Await and Missing Parameter Type Mismatch in SSE Auth Path
*   **Severity:** High
*   **Category:** Reliability
*   **Location:** `backend/app/routers/generation.py:189`
*   **Evidence:**
    ```python
    from app.api.deps import get_current_user
    user = await get_current_user(token=token, db=db)
    ```
    `get_current_user` in `backend/app/api/deps.py` is defined as a synchronous function (`def get_current_user(...)`) but is invoked with `await`. In addition, `get_current_user` requires a positional `request: Request` argument, which is completely omitted in this invocation. 
*   **Impact:** Any connection to the SSE generation update channel raises a silent `TypeError` behind the scenes. This is caught in the `except Exception:` block, setting `user = None` and logging a warning. The application silently continues under a bypassed/unauthenticated condition (allowing unauthenticated access) or failing stream delivery.
*   **Suggested direction:** Remove the `await` keyword and supply the `request` argument to the synchronous dependency, matching its signature: `get_current_user(request=request, token=token, db=db)`.

---

### F-1.1-03: Catastrophic React Hook Violation in Sidebar Component
*   **Severity:** High
*   **Category:** Correctness
*   **Location:** `frontend/src/components/Sidebar.tsx:147-204`
*   **Evidence:** The Sidebar component renders the engine health status by executing an inline Immediately Invoked Function Expression (IIFE) within its JSX return block:
    ```tsx
    {(() => {
      const [engineStatus, setEngineStatus] = React.useState<'checking' | 'online' | 'offline'>('checking');
      React.useEffect(() => { ... }, []);
      return ( ... );
    })()}
    ```
    This directly violates React's **Rules of Hooks** which state that hooks must only be called at the top-level of a React functional component and never inside nested loops, conditions, or callbacks.
*   **Impact:** This violation triggers unstable UI rendering, potential component state reconciliation errors, memory leaks, and completely blocks Next.js compilation (`npm run build` fails).
*   **Suggested direction:** Refactor `Sidebar.tsx` by moving the `engineStatus` state and its polling `useEffect` hook to the top level of the `Sidebar` functional component.

---

### F-1.1-04: Inadequate CPU and Memory Resource Limits for Parser Cloud Run Service
*   **Severity:** High
*   **Category:** Performance
*   **Location:** `terraform/main.tf:60-61`
*   **Evidence:** The `parser` service running Docling is configured with restrictive resources:
    ```hcl
    memory_limit = "512Mi"
    cpu_limit    = "1000m"
    ```
*   **Impact:** Docling loads substantial deep-learning language models for table layout detection and document partitioning. A 512Mi allocation is insufficient to process standard or multi-page documents, leading to instant out-of-memory (OOM) container crashes.
*   **Suggested direction:** Modify the Terraform file to bump `memory_limit` to at least `2Gi` (preferably `4Gi`) and increase the `cpu_limit` to `2000m` to guarantee document parsing stability.

---

### F-1.1-05: Legacy "TailorForge" Naming Gaps in API & Config
*   **Severity:** Medium
*   **Category:** Maintainability
*   **Location:** 
    - `backend/app/core/config.py:5` (`PROJECT_NAME = "TailorForge"`)
    - `backend/app/main.py:7` (`title="TailorForge API"`)
    - `parser_service/app/main.py:6` (`title="TailorForge Parser Service"`)
*   **Evidence:** Multiple core config fields, app titles, and API headers still contain `"TailorForge"` instead of the active project brand `"TailorForge"`.
*   **Impact:** This violates direct developer instructions, leads to confusing configuration namespaces, and causes branding drift.
*   **Suggested direction:** Rename all instances of `"TailorForge"` in application titles, configurations, and document headers to `"TailorForge"`.

---

### F-1.1-06: 100% Test-gap
*   **Severity:** Medium
*   **Category:** Test-gap
*   **Location:** `/` (Entire Workspace)
*   **Evidence:** The backend's `tests/` directory is completely empty. The frontend has no testing environment configured (missing Jest, Vitest, etc.).
*   **Impact:** 100% test-gap makes automated regression verification impossible. Upgrades to core modules or database models must be validated entirely through manual clicking, representing a high launch risk.
*   **Suggested direction:** Configure standard test environments (Pytest for backend, Vitest/Jest for Next.js) and establish initial integration test coverage.

---

### F-1.1-07: Type-checking Failures under Strict MyPy Configuration
*   **Severity:** Medium
*   **Category:** Maintainability
*   **Location:** `backend/pyproject.toml:38`, `backend/app/*` (14 files)
*   **Evidence:** Running MyPy with strict typechecking enabled returns 83 type errors across 14 backend files. Most errors stem from SQLAlchemy 2.0 column declarations, untyped function definitions, and third-party library imports lacking type stubs.
*   **Impact:** Hides real code bugs behind a wall of static analysis noise, blocking robust compilation pipelines.
*   **Suggested direction:** Refactor untyped parameters and utilize SQLAlchemy 2.0's type mapping (`Mapped[...]` and `mapped_column`) to align types with Python annotations.

---

### F-1.1-08: Frontend ESLint Errors and Warnings
*   **Severity:** Medium
*   **Category:** Maintainability
*   **Location:** `frontend/*`
*   **Evidence:** Running `npm run lint` yields 42 problems (30 errors, 12 warnings), including hook dependency mismatches and styling issues.
*   **Impact:** Lint errors block standard production builds and prevent automated CI checks from completing.
*   **Suggested direction:** Fix the hook dependencies array and resolve all trailing style issues systematically.

---

### F-1.1-09: Missing Standard OSS Release Metadata Files
*   **Severity:** Low
*   **Category:** Compliance
*   **Location:** `/` (Project Root)
*   **Evidence:** The project lacks standard open-source files like a `LICENSE` or `COPYING` file, and has no `CONTRIBUTING.md` developer guide.
*   **Impact:** External contributors lack standard guidelines to get started, and licensing restrictions are legally undefined.
*   **Suggested direction:** Add an MIT/Apache 2.0 `LICENSE` file and construct a thorough `CONTRIBUTING.md` guide.

---

### F-1.1-10: Deprecated FastAPI startup Decorators
*   **Severity:** Low
*   **Category:** Observability
*   **Location:** `backend/app/main.py:28-29`
*   **Evidence:** The application uses `@app.on_event("startup")` to initialize Qdrant database collections.
*   **Impact:** Starlette has deprecated `on_event` handlers. Future FastAPI version upgrades will break the service initialization layer.
*   **Suggested direction:** Replace the `@app.on_event` decorator with a unified FastAPI `lifespan` context manager.
