from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session
from typing import List
import uuid
import socket
import ipaddress
from urllib.parse import urlparse, urljoin

from app.api.deps import get_db, get_current_user
from app.models.models import User, Job
from app.schemas.job import JobCreate, JobResponse, ExtractRequest, ExtractResponse
import httpx
from bs4 import BeautifulSoup
import json

router = APIRouter()

def is_safe_url(url: str) -> bool:
    try:
        parsed = urlparse(url)
        if parsed.scheme not in ("http", "https"):
            return False
        host = parsed.hostname
        if not host:
            return False
        if host.startswith("[") and host.endswith("]"):
            host = host[1:-1]
        
        # Resolve all IP addresses for the host
        addr_info = socket.getaddrinfo(host, None)
        for family, _, _, _, sockaddr in addr_info:
            ip_str = sockaddr[0]
            if "%" in ip_str:
                ip_str = ip_str.split("%")[0]
            ip = ipaddress.ip_address(ip_str)
            if (
                ip.is_private or 
                ip.is_loopback or 
                ip.is_link_local or 
                ip.is_reserved or 
                ip.is_multicast or 
                ip_str == "0.0.0.0" or 
                ip_str == "::"
            ):
                return False
        return True
    except Exception:
        return False

def resolve_and_verify_url(url: str) -> tuple[str, str, int, str]:
    """Resolve hostname of a URL, verify all IPs are public/safe, and return details.
    
    Returns:
        (resolved_ip, original_host, port, ip_url)
    """
    try:
        parsed = urlparse(url)
        if parsed.scheme not in ("http", "https"):
            raise HTTPException(
                status_code=400,
                detail="Invalid URL scheme. Only http and https are allowed."
            )
        host = parsed.hostname
        if not host:
            raise HTTPException(
                status_code=400,
                detail="Invalid hostname."
            )
        
        # Strip brackets if it is an IPv6 literal in the host
        clean_host = host
        if clean_host.startswith("[") and clean_host.endswith("]"):
            clean_host = clean_host[1:-1]
            
        port = parsed.port
        if not port:
            port = 443 if parsed.scheme == "https" else 80
            
        # Resolve all IP addresses for the host
        addr_info = socket.getaddrinfo(clean_host, port)
        resolved_ips = []
        for family, _, _, _, sockaddr in addr_info:
            ip_str = sockaddr[0]
            if "%" in ip_str:
                ip_str = ip_str.split("%")[0]
            ip = ipaddress.ip_address(ip_str)
            if (
                ip.is_private or 
                ip.is_loopback or 
                ip.is_link_local or 
                ip.is_reserved or 
                ip.is_multicast or 
                ip_str == "0.0.0.0" or 
                ip_str == "::"
            ):
                raise HTTPException(
                    status_code=400,
                    detail="Invalid host URL destination."
                )
            resolved_ips.append(ip_str)
            
        if not resolved_ips:
            raise HTTPException(
                status_code=400,
                detail="Could not resolve hostname."
            )
            
        # Pick the first safe IP
        selected_ip = resolved_ips[0]
        
        # Construct the IP URL to force connection to this IP
        ip_host = f"[{selected_ip}]" if ":" in selected_ip else selected_ip
        netloc = f"{ip_host}:{parsed.port}" if parsed.port else ip_host
        ip_url = parsed._replace(netloc=netloc).geturl()
        
        return selected_ip, host, port, ip_url
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=400,
            detail="Invalid host URL destination."
        )

@router.post("/extract", response_model=ExtractResponse)
async def extract_job(
    request: ExtractRequest,
    req: Request,
    current_user: User = Depends(get_current_user)
):
    """Extract job details from a URL.
    
    Company resolution priority:
    1. Company name found in the page <title> tag (most accurate for acquired companies)
    2. JSON-LD hiringOrganization.name (legal entity — may be the acquirer, not the brand)
    3. Subdomain of the URL (e.g. kaleris.wd501.myworkdayjobs.com → Kaleris)
    """
    try:
        headers = {
            "User-Agent": (
                "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
                "AppleWebKit/537.36 (KHTML, like Gecko) "
                "Chrome/124.0.0.0 Safari/537.36"
            )
        }
        
        # Get pooled HTTP client from app state or fallback
        client = getattr(req.app.state, "client", None)
        should_close_client = False
        if client is None:
            limits = httpx.Limits(max_keepalive_connections=5, max_connections=20)
            client = httpx.AsyncClient(limits=limits, timeout=10.0)
            should_close_client = True
        
        url = request.url
        max_redirects = 5
        redirect_count = 0
        resp_bytes = bytearray()
        
        try:
            while redirect_count <= max_redirects:
                # DNS & IP Subnet Guard: Resolve hostname, check against loopback/private,
                # and obtain direct connection IP URL.
                selected_ip, original_host, port, ip_url = resolve_and_verify_url(url)
                
                # Build request directed at IP address to prevent DNS rebinding
                req_obj = client.build_request("GET", ip_url, headers=headers)
                
                # Set Host header and SNI hostname extension to preserve TLS/routing
                req_obj.headers["Host"] = original_host
                req_obj.extensions["sni_hostname"] = original_host
                
                response = await client.send(req_obj, stream=True)
                
                if response.status_code in (301, 302, 303, 307, 308):
                    location = response.headers.get("Location")
                    await response.aclose()
                    if not location:
                        raise HTTPException(
                            status_code=400,
                            detail="Redirect response missing Location header."
                        )
                    # Resolve next redirect relative to current original unreplaced URL
                    url = urljoin(url, location)
                    redirect_count += 1
                else:
                    max_bytes = 5 * 1024 * 1024  # 5MB
                    try:
                        async for chunk in response.aiter_bytes(chunk_size=4096):
                            resp_bytes.extend(chunk)
                            if len(resp_bytes) > max_bytes:
                                raise HTTPException(
                                    status_code=400,
                                    detail="Response payload exceeds maximum allowed size (5MB)."
                                )
                    finally:
                        await response.aclose()
                    break
            else:
                raise HTTPException(
                    status_code=400,
                    detail="Too many redirects."
                )
        finally:
            if should_close_client:
                await client.aclose()
        
        html_content = resp_bytes.decode("utf-8", errors="replace")
        soup = BeautifulSoup(html_content, "html.parser")

        # ── Helper: extract company from page <title> ──────────────────────────
        # Workday titles look like: "AI Senior Solutions Architect - Kaleris"
        # LinkedIn titles look like: "Job Title at Company | LinkedIn"
        def _company_from_title(tag_text: str, job_title: str) -> str:
            if not tag_text:
                return ""
            t = tag_text.strip()
            # Strip trailing site names ("| LinkedIn", "| Workday", etc.)
            for suffix in [" | LinkedIn", " | Glassdoor", " | Indeed", " | Workday"]:
                if t.endswith(suffix):
                    t = t[: -len(suffix)].strip()
            # "Job Title - Company" or "Job Title at Company"
            for sep in [" - ", " at ", " @ "]:
                if sep in t:
                    parts = t.split(sep, 1)
                    candidate = parts[-1].strip()
                    # Sanity: if the candidate contains the job title it's likely wrong
                    if job_title and job_title.lower() in candidate.lower():
                        continue
                    if len(candidate) > 1:
                        return candidate
            return ""

        # ── Helper: derive company from URL subdomain ──────────────────────────
        def _company_from_url(url: str) -> str:
            from urllib.parse import urlparse
            host = urlparse(url).hostname or ""
            # kaleris.wd501.myworkdayjobs.com → "kaleris"
            sub = host.split(".")[0]
            if sub and sub not in ("www", "jobs", "careers", "apply", "boards"):
                return sub.capitalize()
            return ""

        # ── HTML Formatter Helper ──────────────────────────────────────────────
        def _clean_html_to_text(element) -> str:
            if not element:
                return ""
            import copy
            el = copy.copy(element)
            
            # Decompose scripts, styles, etc.
            for tag in el.find_all(["script", "style", "head", "nav", "footer", "iframe", "noscript"]):
                tag.decompose()
                
            # Replace br with newline
            for br in el.find_all("br"):
                br.replace_with("\n")
                
            # Format list items
            for li in el.find_all("li"):
                text = li.get_text().strip()
                if text:
                    # check if it already starts with bullet characters
                    if not any(text.startswith(char) for char in ["•", "-", "*"]):
                        li.insert_before("\n• ")
                    else:
                        li.insert_before("\n")
                        
            # Format headers
            for h in el.find_all(["h1", "h2", "h3", "h4", "h5", "h6"]):
                h.insert_before("\n\n")
                h.insert_after("\n")
                
            # Format paragraphs
            for p in el.find_all("p"):
                p.insert_before("\n\n")
                p.insert_after("\n\n")
                
            raw_text = el.get_text(separator=" ")
            
            # Reconstruct lines without extra blank space
            cleaned_lines = []
            for line in raw_text.splitlines():
                line_stripped = line.strip()
                if line_stripped:
                    cleaned_lines.append(line_stripped)
                else:
                    if cleaned_lines and cleaned_lines[-1] != "":
                        cleaned_lines.append("")
                        
            return "\n".join(cleaned_lines).strip()

        # ── Parse JSON-LD ──────────────────────────────────────────────────────
        ld_title = ""
        ld_company = ""
        ld_desc = ""

        ld_jsons = soup.find_all("script", type="application/ld+json")
        for tag in ld_jsons:
            try:
                data = json.loads(tag.string)
                if isinstance(data, list):
                    for item in data:
                        if isinstance(item, dict) and item.get("@type") == "JobPosting":
                            data = item
                            break
                if isinstance(data, dict) and data.get("@type") == "JobPosting":
                    ld_title = data.get("title", "")
                    if "hiringOrganization" in data:
                        ld_company = data["hiringOrganization"].get("name", "")
                    raw_desc = data.get("description", "")
                    if "<" in raw_desc and ">" in raw_desc:
                        desc_soup = BeautifulSoup(raw_desc, "html.parser")
                        ld_desc = _clean_html_to_text(desc_soup)
                    else:
                        ld_desc = raw_desc.strip()
                    break
            except Exception:
                continue

        # ── Resolve best description ───────────────────────────────────────────
        if ld_desc:
            description = ld_desc
        else:
            main_content = (
                soup.find("main")
                or soup.find(id=lambda x: x and "job" in x.lower() and "desc" in x.lower())
                or soup.body
            )
            description = _clean_html_to_text(main_content or soup)[:15000]

        # ── Resolve best title ─────────────────────────────────────────────────
        page_title_raw = soup.title.string.strip() if soup.title and soup.title.string else ""
        title = ld_title or page_title_raw or ""

        # ── Resolve best company (priority: page title > URL > JSON-LD) ───────
        company = (
            _company_from_title(page_title_raw, title)
            or _company_from_url(request.url)
            or ld_company
            or "Unknown"
        )

        # Fallback default values
        company_context = f"Applying to {company} as {title}."
        reference_urls = [request.url]

        # ── LLM Extraction Refinement ───────────────────────────────────────────
        model = None
        custom_key = None
        
        if request.api_provider and request.api_key:
            provider = request.api_provider.lower()
            key_stripped = request.api_key.strip()
            
            if provider == "openai":
                model = "openai/gpt-4o-mini"
                custom_key = key_stripped
            elif provider == "anthropic":
                model = "anthropic/claude-3-5-sonnet"
                custom_key = key_stripped
            elif provider == "google":
                model = "gemini/gemini-2.5-flash"
                custom_key = key_stripped
            elif provider == "grok":
                model = "xai/grok-beta"
                custom_key = key_stripped

        # Fallback to system default Gemini key if custom credentials are not provided
        if not model or not custom_key:
            from app.core.config import settings
            if settings.GEMINI_API_KEY:
                model = "gemini/gemini-2.5-flash"
                custom_key = settings.GEMINI_API_KEY

        if model and custom_key:
            try:
                from litellm import acompletion
                
                # Truncate raw description snippet to avoid token limits
                snippet = description[:4000]
                
                prompt = f"""
                You are a high-precision job parsing assistant.
                Based on the following URL and Web Page content snippet, extract:
                1. The clean brand/company name of the hiring organization ("company"). Ensure you resolve acquisitions if applicable (e.g. if the company name in the posting is 'Navis LP' or 'Navis' but they have been acquired by 'Kaleris' or the posting is on a Kaleris careers site, output the correct brand 'Kaleris'). Avoid AI-slop brand names.
                2. The precise job/role title ("title", e.g. 'AI Senior Solutions Architect').
                3. A brief, high-fidelity context string about the company ("company_context"), including any acquisition history or company description context if relevant to calm an anxious applicant (e.g., "Kaleris acquired Navis in 2021; Navis is a brand under Kaleris."). If there's no complex context, just a short 1-sentence summary of what the company does.
                4. A list of 1 to 3 relevant reference URLs ("reference_urls") related to this hiring organization or job portal (e.g., their main website domain, active career portals, or relevant press/reference pages parsed or derived).

                URL: {request.url}
                Page Title parsed: {title}
                JSON-LD parsed Company: {ld_company}

                CONTENT SNIPPET:
                {snippet}

                Return ONLY a JSON object with exactly these keys: "company", "title", "company_context", and "reference_urls". Do NOT output any markdown tags or thoughts, just the raw JSON.
                """
                
                response = await acompletion(
                    model=model,
                    messages=[{"role": "user", "content": prompt}],
                    api_key=custom_key,
                    response_format={"type": "json_object"}
                )
                
                llm_text = response.choices[0].message.content.strip()
                parsed_res = json.loads(llm_text)
                if isinstance(parsed_res, dict):
                    if "company" in parsed_res and parsed_res["company"]:
                        company = parsed_res["company"].strip()
                    if "title" in parsed_res and parsed_res["title"]:
                        title = parsed_res["title"].strip()
                    if "company_context" in parsed_res and parsed_res["company_context"]:
                        company_context = parsed_res["company_context"].strip()
                    if "reference_urls" in parsed_res and parsed_res["reference_urls"]:
                        raw_urls = parsed_res["reference_urls"]
                        if isinstance(raw_urls, list):
                            reference_urls = [str(u).strip() for u in raw_urls if u]
            except Exception as llm_err:
                # Fall back gracefully to parsing output
                pass

        return ExtractResponse(
            title=title,
            company=company,
            description=description,
            source_url=request.url,
            company_context=company_context,
            reference_urls=reference_urls,
        )

    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to extract job: {str(e)}")


@router.post("", response_model=JobResponse)
def create_job(
    *,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    job_in: JobCreate
):
    """Create a new Job Posting entry."""
    job = Job(
        user_id=current_user.id,
        raw_text=job_in.raw_text,
        company=job_in.company_name,
        title=job_in.role_title
    )
    db.add(job)
    db.commit()
    db.refresh(job)
    return job

@router.get("", response_model=List[JobResponse])
def get_jobs(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """List all tracked jobs."""
    return db.query(Job).filter(Job.user_id == current_user.id).all()
