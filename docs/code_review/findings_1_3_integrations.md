# Phase 1.3 Findings: External Integrations, Costs & Reliability (Threat Pass)

This document records the results of Phase 1.3 of the Brass Tacks Rigorous Code-Quality Review, evaluating security vectors, exfiltration threats, and reliability concerns across external integrations, multi-provider interfaces, and token-cost controls.

---

## Findings Table

| ID | Severity | Category | Location | Evidence | Impact | Suggested direction | Confidence | Cross-ref |
|---|---|---|---|---|---|---|---|---|
| F-1.3-01 | High | Security | [jobs.py](file:///Users/johndoe/Projects/tailorforge/backend/app/routers/jobs.py#L35-L36) | Unpooled `httpx.get` queries on arbitrary URLs with high timeouts and zero rate-limiting. | Socket exhaustion, internal service probing (SSRF), external data exfiltration, and IP reputation blockages. | Implement a dedicated `httpx` client singleton, resolve and restrict DNS lookup to public IPs, and restrict request sizes/types. | High | F-1.2-01 |
| F-1.3-02 | High | Reliability | [drafter.py](file:///Users/johndoe/Projects/tailorforge/backend/app/services/drafter.py#L81-L87) | `acompletion` is called directly without try-except blocks, backoff retries, or fallback providers. | Transient network drops or provider rate limits (HTTP 429) instantly abort the generation run, causing poor UX. | Wrap LLM calls in retry decorators (e.g. `tenacity`) and implement secondary model fallback logic in case of primary outage. | High | None |
| F-1.3-03 | Medium | Reliability | [generation.py](file:///Users/johndoe/Projects/tailorforge/backend/app/routers/generation.py#L56-L62) | FastAPI `BackgroundTasks` executes jobs concurrently without concurrency limits or queued limits. | Spamming `/start` triggers downstream LLM rate limiting (HTTP 429) and backend CPU/RAM starvation. | Establish a global concurrency semaphore or process queue to limit active concurrent generations. | High | None |
| F-1.3-04 | Medium | Cost | [generation.py](file:///Users/johndoe/Projects/tailorforge/backend/app/routers/generation.py#L279-L287) | Full untruncated `job.raw_text` is embedded directly into LLM prompts without token counts or limit validation. | Users uploading huge jobs or raw HTML trigger immense input token consumption (runaway billing) or context window crashes. | Estimate input tokens using `tiktoken` or a simple length proxy, and truncate inputs exceeding safe operational sizes. | High | None |
| F-1.3-05 | Medium | Maintainability | [generation.py](file:///Users/johndoe/Projects/tailorforge/backend/app/routers/generation.py#L79-L163) | Manual `/models` fetching via hardcoded HTTP requests to 4 separate cloud provider endpoints. | Changes in upstream API specs, header requirements, or deprecations will instantly break model discovery. | Use provider SDKs or LiteLLM's internal model validation registers rather than custom raw endpoints. | High | None |

---

## Detailed Finding Analyses

### F-1.3-01: Resource & Socket Exhaustion via Unpooled Job Extractor
*   **Severity:** High
*   **Category:** Security / Reliability
*   **Location:** [jobs.py](file:///Users/johndoe/Projects/tailorforge/backend/app/routers/jobs.py#L35-L36)
*   **Evidence:**
    ```python
    async with httpx.AsyncClient(timeout=15.0, follow_redirects=True) as client:
        resp = await client.get(request.url, headers=headers)
    ```
    For every job extraction request, a completely fresh, unpooled `httpx.AsyncClient` instance is initialized. Furthermore, there is no rate limiting on the `/extract` endpoint.
*   **Impact:** 
    1. **Socket Leakage:** Heavy concurrent traffic will rapidly exhaust available OS file descriptors, leading to connection failures across the entire server stack.
    2. **Exfiltration Vector:** A user could pass URLs pointing to private internal services (e.g. `http://localhost:6333` for Qdrant) to scan and extract metadata in the response.
    3. **Hang Risks:** If a malicious page slowly feeds bytes over several minutes (Slowloris), the uncapped network thread will block, potentially freezing backend workers.
*   **Suggested direction:** Initialize a shared HTTP client singleton at app lifespan startup with sensible pool limits (`max_connections=20`), check resolved DNS IPs against private subnets BEFORE initiating requests, and limit acceptable response body reads to 5MB.

---

### F-1.3-02: Complete Lack of Transient Retry Handling & Failover in LLM Calls
*   **Severity:** High
*   **Category:** Reliability
*   **Location:** [drafter.py](file:///Users/johndoe/Projects/tailorforge/backend/app/services/drafter.py#L81-L87) and [drafter.py](file:///Users/johndoe/Projects/tailorforge/backend/app/services/drafter.py#L150-L155)
*   **Evidence:**
    The async LLM drafting and critiquing routines invoke `litellm.acompletion` without capturing potential exceptions or configuring resilient failover rules:
    ```python
    response = await acompletion(
        model=model,
        messages=[{"role": "user", "content": prompt}],
        api_key=custom_key,
        **kwargs
    )
    ```
*   **Impact:** Any transient network hiccup, momentary downstream API timeout, or standard rate-limit error (HTTP 429) triggers a fatal python exception. This immediately terminates the background generator task, updating the status to `"failed"` and delivering a highly fragile user experience.
*   **Suggested direction:** Wrap critical LLM completion calls in robust retry policies using libraries like `tenacity` (e.g., retry on rate-limit and connection failures with exponential backoff) and implement secondary model fallback logic (e.g., if custom Claude fails, fallback to Gemini 2.0 Flash as the resilient primary backup).

---

### F-1.3-03: Uncapped Generation Run Concurrency
*   **Severity:** Medium
*   **Category:** Reliability
*   **Location:** [generation.py](file:///Users/johndoe/Projects/tailorforge/backend/app/routers/generation.py#L56-L62)
*   **Evidence:**
    The pipeline processes generation tasks asynchronously using FastAPI's standard `BackgroundTasks`:
    ```python
    background_tasks.add_task(
        process_generation_pipeline, 
        run.id, 
        data.api_provider, 
        data.api_key, 
        data.model_id
    )
    ```
    No limits are placed on the number of concurrent tasks allowed to run simultaneously.
*   **Impact:** A single user spamming `/start` or a coordinated scripting attempt can easily spawn hundreds of parallel background tasks. This will quickly deplete available connection pools to the Postgres database, trigger aggressive rate-limiting blocks from downstream LLM providers, and starve the backend server's CPU and RAM.
*   **Suggested direction:** Implement a global concurrency limiter (e.g. an `asyncio.Semaphore(5)`) or configure a structured queue (such as Celery, Huey, or a simple custom task runner) to process runs sequentially or in a highly restricted parallel fashion.

---

### F-1.3-04: Lack of Token Limits and Input Truncation for Job Descriptions
*   **Severity:** Medium
*   **Category:** Cost / Reliability
*   **Location:** [generation.py](file:///Users/johndoe/Projects/tailorforge/backend/app/routers/generation.py#L279-L287) and [drafter.py](file:///Users/johndoe/Projects/tailorforge/backend/app/services/drafter.py#L68-L69)
*   **Evidence:**
    Unlike the job extraction router which truncates the snippet, the generation pipeline passes the raw, full job description text directly to the LLM model without any validation checks on length or token count:
    ```python
    JOB DESCRIPTION:
    {job_description}
    ```
*   **Impact:** If a user submits a massive job posting containing extensive documentation, redundant boilerplate, or raw HTML garbage, the prompt will grow uncontrollably. This can trigger instant context window overflows, high latency times, and exorbitant API token consumption charges on high-cost models (e.g., Claude 3.5 Sonnet).
*   **Suggested direction:** Introduce a token pre-validation block. Calculate estimated input tokens using `tiktoken` or a simple word-to-token estimator. If the token count exceeds a safe threshold (e.g., 6,000 tokens), reject the request or enforce elegant semantic truncation.

---

### F-1.3-05: Brittle Raw Endpoint Mapping in Model Discovery
*   **Severity:** Medium
*   **Category:** Maintainability
*   **Location:** [generation.py](file:///Users/johndoe/Projects/tailorforge/backend/app/routers/generation.py#L79-L163)
*   **Evidence:**
    The `/models` route manually maps 4 different HTTP client calls to fetch active model list endpoints:
    ```python
    response = await client.get(
        "https://api.openai.com/v1/models",
        headers={"Authorization": f"Bearer {api_key}"}
    )
    ```
*   **Impact:** This bypasses the benefit of using an abstraction library like LiteLLM. Any updates in API versions, headers, or query parameters by OpenAI, Anthropic, Google, or Grok will break this custom endpoint immediately, requiring manual code modifications.
*   **Suggested direction:** Refactor model discovery to leverage LiteLLM's standard model list functions or maintain a robust, dynamically loaded local model registry map instead of maintaining raw, custom HTTP integrations.
