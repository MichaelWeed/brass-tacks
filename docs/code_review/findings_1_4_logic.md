# Phase 1.4 Findings: Application Logic, Output Correctness & UX (Threat Pass)

This document records the results of Phase 1.4 of the Brass Tacks Rigorous Code-Quality Review, evaluating application logic, output correctness, relevance filtering, and validating troubleshooting guides across frontend and backend services.

---

## Findings Table

| ID | Severity | Category | Location | Evidence | Impact | Suggested direction | Confidence | Cross-ref |
|---|---|---|---|---|---|---|---|---|
| F-1.4-01 | High | Security | [GenerationStatus.tsx:26](file:///Users/johndoe/Projects/tailorforge/frontend/src/components/GenerationStatus.tsx#L26)<br>[ResumeUpload.tsx:48](file:///Users/johndoe/Projects/tailorforge/frontend/src/components/ResumeUpload.tsx#L48)<br>[profile/page.tsx:28](file:///Users/johndoe/Projects/tailorforge/frontend/src/app/\(dashboard\)/profile/page.tsx#L28)<br>[profile/page.tsx:72](file:///Users/johndoe/Projects/tailorforge/frontend/src/app/\(dashboard\)/profile/page.tsx#L72)<br>[troubleshoot/page.tsx:98](file:///Users/johndoe/Projects/tailorforge/frontend/src/app/\(dashboard\)/troubleshoot/page.tsx#L98) | Fallback bearer JWT token hardcoded across multiple frontend components. | Authentication bypass; users missing active sessions are logged into a shared mock account, causing data leaks. | Eliminate mock token fallbacks; gracefully redirect unauthenticated users to `/login`. | High | F-1.2-01 |
| F-1.4-02 | High | Reliability | [math_validator.py:17](file:///Users/johndoe/Projects/tailorforge/backend/app/services/math_validator.py#L17) | Unchecked division by zero in team/metric percent growth pre-computation. | A starting value of 0 (e.g. "grew team from 0 to 5") crashes the background generation pipeline. | Insert a non-zero guard, returning either absolute change or fallback string metrics gracefully. | High | F-1.3-02 |
| F-1.4-03 | High | Performance | [utils.py:24](file:///Users/johndoe/Projects/tailorforge/backend/app/core/utils.py#L24) | Static start indexing in chunk boundary search range (`text[max_chars // 2:end]`). | Search range grows to O(N) as the chunking window advances, causing exponential latency and bad boundaries. | Adjust slice start relative to current window offset, e.g. `text[start + max_chars // 2:end]`. | High | F-1.3-04 |
| F-1.4-04 | Medium | Reliability | [generation.py:201-226](file:///Users/johndoe/Projects/tailorforge/backend/app/routers/generation.py#L201-L226) | Uncapped `while True` polling loop in FastAPI Server-Sent Events endpoint. | Silently hung or crashed generations exhaust database connection pools and starve server thread workers. | Set a maximum loop timeout (e.g., 300 seconds) and check if the background thread has crashed. | High | F-1.3-03 |
| F-1.4-05 | Medium | Correctness | [drafter.py:113](file:///Users/johndoe/Projects/tailorforge/backend/app/services/drafter.py#L113)<br>[drafter.py:122](file:///Users/johndoe/Projects/tailorforge/backend/app/services/drafter.py#L122)<br>[drafter.py:147](file:///Users/johndoe/Projects/tailorforge/backend/app/services/drafter.py#L147) | Deprecated `gemini/gemini-pro` default fallback and manual JSON mode bypass. | Brittle regex parsing, slow response latencies, and high JSON decoding failures under heavy loads. | Upgrade to `gemini-2.0-flash` or `gemini-1.5-pro` and leverage native JSON schema mode support. | High | F-1.3-05 |
| F-1.4-06 | High | Data-integrity | [profiles.py:78-83](file:///Users/johndoe/Projects/tailorforge/backend/app/routers/profiles.py#L78-L83)<br>[profiles.py:27-35](file:///Users/johndoe/Projects/tailorforge/backend/app/routers/profiles.py#L27-L35) | Multiple active profiles allowed without deactivation; oldest profile is fetched. | Uploading a new CV is ignored on subsequent edits as edits silently update the oldest active profile. | Automatically set `is_active = False` on previous profiles when a new master profile is created. | High | F-1.2-04 |

---

## Detailed Finding Analyses

### F-1.4-01: Hardcoded Test Token Authentication Bypass
*   **Severity:** High
*   **Category:** Security / Privacy
*   **Location:**
    *   `frontend/src/components/GenerationStatus.tsx:26`
    *   `frontend/src/components/ResumeUpload.tsx:48`
    *   `frontend/src/app/(dashboard)/profile/page.tsx:28`
    *   `frontend/src/app/(dashboard)/profile/page.tsx:72`
    *   `frontend/src/app/(dashboard)/troubleshoot/page.tsx:98`
*   **Evidence:**
    Multiple files use a fallback hardcoded token when `tf_token` is missing from the client storage:
    ```typescript
    const token = localStorage.getItem('tf_token') || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJleHAiOjE3Nzk0ODg0NjgsInN1YiI6IjQ1ZGZmOWNiLWZjM2ItNDQ5YS05NjI4LTYxZThiNTg0Zjk1NCJ9.A4-rbxBUfAKrxRdRdtAYdD9gnO00bEI1aG-NaMY4eRQ';
    ```
*   **Impact:** Any unauthenticated visitor accessing these routes in development, staging, or production environments is automatically logged in under the shared UUID `45dff9cb-fc3b-449a-9628-61e8b584f954`. This results in a massive cross-tenant data exfiltration risk where users inherit each other's custom master profiles, uploaded resumes, and job listings.
*   **Suggested direction:** Delete the hardcoded fallback token. Handle unauthenticated states gracefully: clear localStorage, display a standard "Session Expired" alert, and redirect the user back to the login page.

---

### F-1.4-02: Zero-Division Crash in Math Pre-Computation Engine
*   **Severity:** High
*   **Category:** Reliability / UX
*   **Location:** [math_validator.py:17](file:///Users/johndoe/Projects/tailorforge/backend/app/services/math_validator.py#L17)
*   **Evidence:**
    ```python
    growth_match = re.search(r"grew team from (\d+) to (\d+)", text, re.IGNORECASE)
    if growth_match:
        start, end = int(growth_match.group(1)), int(growth_match.group(2))
        percent_growth = ((end - start) / start) * 100
    ```
*   **Impact:** If a user submits a profile containing the phrase "grew team from 0 to 5", `start` evaluates to `0`, throwing a fatal `ZeroDivisionError: division by zero`. This terminates the background generation pipeline immediately, leaving the run item stuck in state indefinitely.
*   **Suggested direction:** Insert an explicit non-zero guard:
    ```python
    percent_growth = ((end - start) / start) * 100 if start > 0 else 100.0
    ```
    Alternatively, return absolute metrics or log a clean warnings check without crashing the parser thread.

---

### F-1.4-03: Performance-Degraded Chunker Slicing
*   **Severity:** High
*   **Category:** Performance / Correctness
*   **Location:** [utils.py:24](file:///Users/johndoe/Projects/tailorforge/backend/app/core/utils.py#L24)
*   **Evidence:**
    ```python
    end = start + max_chars
    if end < len(text):
        break_point = -1
        search_range = text[max_chars // 2:end]
    ```
*   **Impact:** The search range slice start index is static (`max_chars // 2`), meaning it fails to advance along with the window `start` pointer. As the chunking process advances through large profiles, the search range scales to O(N), leading to severe character copying bottlenecks, O(N^2) search times, and incorrect boundaries.
*   **Suggested direction:** Correct the starting index offset to be relative to the local sliding window position:
    ```python
    search_range = text[start + max_chars // 2 : end]
    ```

---

### F-1.4-04: Infinite SSE Event Polling Loop
*   **Severity:** Medium
*   **Category:** Reliability / Resource-leak
*   **Location:** [generation.py:201-226](file:///Users/johndoe/Projects/tailorforge/backend/app/routers/generation.py#L201-L226)
*   **Evidence:**
    ```python
    async def event_generator():
        last_status = None
        while True:
            if await request.is_disconnected():
                break
            with SessionLocal() as session:
                run = session.query(GenerationRun).filter(GenerationRun.id == run_id).first()
                # ...
                if run.status in ["complete", "failed"]:
                    break
            await asyncio.sleep(1)
    ```
*   **Impact:** If a background task encounters an unhandled crash or gets stuck, the generation status remains in a non-terminal state (e.g., `drafting`). The server-sent events connection will query the database every second indefinitely, starving database connection pools and freezing FastAPI workers under high concurrent usage.
*   **Suggested direction:** Introduce a loop counter or absolute timeout check (e.g. limit polling to 300 iterations/seconds). If reached, automatically yield a custom failure status, log a connection timeout, and close the stream safely.

---

### F-1.4-05: Legacy Fallback Model Dependency and JSON Mode Bypass
*   **Severity:** Medium
*   **Category:** Correctness / Reliability
*   **Location:**
    *   `backend/app/services/drafter.py:113`
    *   `backend/app/services/drafter.py:122`
    *   `backend/app/services/drafter.py:147`
*   **Evidence:**
    Critique model mappings and fallbacks target the deprecated, high-latency `gemini-pro` instead of modern production models:
    ```python
    model = f"gemini/{model_id}" if model_id else "gemini/gemini-pro"
    ```
    Furthermore, standard structured JSON format support is disabled for all Gemini endpoints:
    ```python
    if "gemini" not in model:
        kwargs["response_format"] = {"type": "json_object"}
    ```
*   **Impact:** Legacy `gemini-pro` does not support structured JSON mode, forcing reliance on fragile markdown regex heuristics. This increases latency, raises JSON parsing failure rates, and compromises resume output score validity.
*   **Suggested direction:** Upgrade defaults and fallbacks to modern, highly reliable production models (such as `gemini-2.0-flash` or `gemini-1.5-pro`) and activate native `json_object` structured output support for all modern Google endpoints.

---

### F-1.4-06: Active Profile Accumulation and In-Place Drift
*   **Severity:** High
*   **Category:** Data-integrity / UX
*   **Location:**
    *   `backend/app/routers/profiles.py:78-83` (Profile creation in `/upload`)
    *   `backend/app/routers/profiles.py:27-35` (Active profile selection in `/`)
*   **Evidence:**
    When uploading a document via `/upload`, a new `MasterProfile` is created with `is_active=True` without deactivating other profiles:
    ```python
    profile = MasterProfile(
        user_id=current_user.id,
        raw_text=markdown,
        parsed_markdown=markdown,
        is_active=True
    )
    ```
    Subsequently, the active profile search queries `is_active == True` ordered by `created_at.asc()`:
    ```python
    existing = (
        db.query(MasterProfile)
        .filter(MasterProfile.user_id == current_user.id, MasterProfile.is_active == True)
        .order_by(MasterProfile.created_at.asc())
        .first()
    )
    ```
*   **Impact:** A user uploading a fresh resume has a new active profile created, but subsequent profile saves via the UI edit screen silently mutate the *oldest* active profile (created_at.asc() priority). This leads to massive data drift, synchronization failures, and frustrating UX where edited changes never apply to the uploaded resume.
*   **Suggested direction:** Ensure single-active profile exclusivity in the database. Automatically set `is_active = False` on all pre-existing profiles for the user whenever a new active profile is saved or uploaded.
