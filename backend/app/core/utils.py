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
