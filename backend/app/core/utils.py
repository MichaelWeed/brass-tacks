import re
from typing import List

def chunk_text(text: str, max_chars: int = 1500, overlap: int = 200) -> List[str]:
    """
    Splits text into chunks of roughly max_chars, trying to break at sentence or paragraph boundaries.
    """
    # Normalize whitespace
    text = re.sub(r'\s+', ' ', text).strip()
    
    if len(text) <= max_chars:
        return [text]
    
    chunks = []
    start = 0
    
    while start < len(text):
        end = start + max_chars
        
        if end < len(text):
            # Try to find a good breaking point (period or newline)
            break_point = -1
            search_range = text[start + max_chars // 2:end] # Look in the second half of the window
            
            # Find last period, exclamation, or question mark
            matches = list(re.finditer(r'[.!?]\s', search_range))
            if matches:
                last_match = matches[-1]
                # Index relative to the active start pointer
                break_point = (start + max_chars // 2) + last_match.end()
            
            if break_point != -1 and break_point > start:
                end = break_point
        
        chunks.append(text[start:end].strip())
        
        # Prevent infinite loop by ensuring we advance
        new_start = end - overlap
        if new_start <= start:
            start += max_chars  # Force advancement if overlap causes stall
        else:
            start = new_start
        
        # Safety break
        if start >= len(text) - overlap:
            break
            
    return chunks

def scrub_api_keys(text: str) -> str:
    """
    Scrubs API-key-like patterns (e.g. Gemini, OpenAI, Claude, Grok) from text to prevent leakage in logs.
    """
    if not text:
        return text
    # Gemini keys: AIzaSy...
    text = re.sub(r'AIzaSy[A-Za-z0-9_-]{35}', '[SCRUBBED_KEY]', text)
    # OpenAI/Anthropic keys: sk-...
    text = re.sub(r'sk-[A-Za-z0-9_-]{20,}', '[SCRUBBED_KEY]', text)
    # Grok keys: xai-...
    text = re.sub(r'xai-[A-Za-z0-9_-]{20,}', '[SCRUBBED_KEY]', text)
    return text

def verify_deterministic_fidelity(final_text: str, source_contexts: List[str]) -> None:
    """
    Asserts that every number and 4-digit year in final_text is present in source_contexts.
    Raises ValueError on mismatch.
    """
    if not final_text:
        return
    
    # 1. Extract 4-digit years, percentages, monetary amounts, and general numbers >= 2 digits
    raw_matches = re.finditer(r'\b(19\d{2}|20\d{2})\b|\b\d+(?:\.\d+)?%|\$\d+(?:\.\d+)?(?:[kKmMbB])?|\b\d{2,}\b', final_text)
    found_tokens = []
    for match in raw_matches:
        token = match.group(0)
        if token:
            found_tokens.append(token)
            
    source_flat = " ".join(source_contexts).lower()
    source_digits = re.sub(r'[^\d]', '', source_flat)
    
    for token in found_tokens:
        tok_lower = token.lower().strip()
        # Direct check
        if tok_lower in source_flat:
            continue
            
        # Cleaned numeric check
        digits_only = re.sub(r'[^\d]', '', tok_lower)
        if digits_only and digits_only in source_digits:
            continue
            
        # Year/metric mismatch
        raise ValueError(
            f"Fidelity gate failed: claims contain the metric/year '{token}' "
            "which is not traceable to your profile data."
        )
